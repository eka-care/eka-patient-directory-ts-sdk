/**
 * Core HTTP client for Trinity Profiles SDK
 */

import {
    NetworkError,
    TimeoutError,
    TrinitySDKError,
    createErrorFromResponse
} from './errors';
import { EnvironmentBaseUrl, SdkConfig } from './types';

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
    private readonly accessToken: string;
    private readonly timeout: number;
    private readonly config: SdkConfig;

    constructor(config: SdkConfig) {
        this.baseUrl = (config.baseUrl || EnvironmentBaseUrl[config.env]).replace(/\/$/, ''); // Remove trailing slash
        this.accessToken = config.accessToken || '';
        this.timeout = config.timeout || 30000; // 30 seconds default
        this.config = config;
    }

    /**
     * Get current configuration (for token updates)
     */
    getConfig(): SdkConfig {
        return {
            ...this.config,
            baseUrl: this.baseUrl,
            accessToken: this.accessToken,
            timeout: this.timeout
        };
    }

    /**
     * Make HTTP request
     */
    async request<T = any>(options: RequestOptions): Promise<HttpResponse<T>> {
        const url = this.buildUrl(options.path, options.params);
        const headers = this.buildHeaders(options.headers);
        headers["client-id"] = "pt-directory-sdk"

        const requestInit: RequestInit = {
            method: options.method,
            headers,
            signal: this.createAbortSignal(),
            credentials: 'include'
        };

        // Add body for POST/PATCH requests
        if (options.body && (options.method === 'POST' || options.method === 'PATCH')) {
            requestInit.body = JSON.stringify(options.body);
        }

        try {
            console.log("requestInit -> ", requestInit)
            const response = await fetch(url, requestInit);


            // Parse response
            let data: T;
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                data = await response.json() as T;
            } else {
                data = await response.text() as unknown as T;
            }

            // Handle error responses
            if (!response.ok) {
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

            throw new TrinitySDKError(
                error instanceof Error ? error.message : 'Unknown error occurred'
            );
        }
    }

    /**
     * GET request
     */
    async get<T = any>(path: string, params?: Record<string, string | number | boolean>): Promise<HttpResponse<T>> {
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
            'Accept': 'application/json',
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