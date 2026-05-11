/**
 * Core HTTP client for Trinity Profiles SDK
 */

import { NetworkError, TimeoutError, TrinitySDKError, createErrorFromResponse } from './errors';
import { Environment, EnvironmentBaseUrl, SdkConfig } from './types';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * Request options
 */
export interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

/**
 * HTTP response interface
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Core HTTP client class
 */
export class HttpClient {
  private readonly baseUrl: string;
  private accessToken: string;
  private readonly timeout: number;
  private readonly config: SdkConfig;
  private readonly onUnauthorized?: () => Promise<string | null>;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: SdkConfig) {
    this.baseUrl = (config.baseUrl || EnvironmentBaseUrl[config.env || Environment.PROD]).replace(
      /\/$/,
      ''
    ); // Remove trailing slash
    this.accessToken = config.accessToken || '';
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.config = config;
    this.onUnauthorized = config.onUnauthorized;
  }

  /**
   * Get current configuration (for token updates)
   */
  getConfig(): SdkConfig {
    return {
      ...this.config,
      baseUrl: this.baseUrl,
      accessToken: this.accessToken,
      timeout: this.timeout,
    };
  }

  /**
   * Update the in-memory access token. Used by the 401 retry path and by
   * external callers that want to swap the token without rebuilding the client.
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Deduped token refresh. Concurrent 401s await the same in-flight promise
   * so the onUnauthorized callback fires at most once per refresh cycle.
   * The callback is bounded to 10s; on timeout we resolve to null (the 401
   * surfaces as AuthenticationError) and let the next 401 trigger a fresh
   * attempt.
   */
  private getRefreshedToken(): Promise<string | null> {
    if (!this.onUnauthorized) {
      return Promise.resolve(null);
    }
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const REFRESH_TIMEOUT_MS = 10000;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => resolve(null), REFRESH_TIMEOUT_MS);
        });
        try {
          return await Promise.race([this.onUnauthorized!(), timeoutPromise]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
          this.refreshPromise = null;
        }
      })();
    }
    return this.refreshPromise;
  }

  /**
   * Make HTTP request.
   *
   * On HTTP 401, if an `onUnauthorized` callback was configured, the SDK
   * invokes it once to obtain a fresh token and retries the request a single
   * time. HTTP 403 is treated as a hard authorization failure and is NOT
   * retried — `AuthorizationError` propagates directly to the caller.
   */
  async request<T = any>(options: RequestOptions, isRetry: boolean = false): Promise<HttpResponse<T>> {
    const url = this.buildUrl(options.path, options.params);
    const headers = this.buildHeaders(options.headers);
    headers['client-id'] = 'pt-directory-sdk';

    const requestInit: RequestInit = {
      method: options.method,
      headers,
      signal: this.createAbortSignal(),
      credentials: 'include',
    };

    // Add body for POST/PATCH requests
    if (options.body && (options.method === 'POST' || options.method === 'PATCH')) {
      requestInit.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, requestInit);

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as unknown as T;
      }

      // Handle error responses
      if (!response.ok) {
        // 401 → attempt one token refresh + retry. 403 is intentionally
        // excluded: an authorization failure is not fixable by a new token.
        if (response.status === 401 && !isRetry && this.onUnauthorized) {
          const newToken = await this.getRefreshedToken();
          if (newToken) {
            this.setAccessToken(newToken);
            return this.request<T>(options, true);
          }
        }

        const errorMessage = this.extractErrorMessage(data);
        throw createErrorFromResponse(response.status, errorMessage, data);
      }

      // Convert headers to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };
    } catch (error) {
      if (error instanceof TrinitySDKError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed');
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('Request timeout');
      }

      throw new TrinitySDKError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', path, params });
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', path, body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'DELETE', path });
  }

  /**
   * Build complete URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.baseUrl}${cleanPath}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Create abort signal for timeout
   */
  private createAbortSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout);
    return controller.signal;
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      return data.error || data.message || data.detail || 'API request failed';
    }

    return 'API request failed';
  }
}
