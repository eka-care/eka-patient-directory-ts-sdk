/**
 * Custom error classes for the Trinity Profiles SDK
 */

/**
 * Base class for all SDK errors
 */
export class TrinitySDKError extends Error {
  public readonly statusCode?: number;
  public readonly response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.response = response;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends TrinitySDKError {
  constructor(message: string = "Authentication failed", response?: any) {
    super(message, 401, response);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends TrinitySDKError {
  constructor(message: string = "Access denied", response?: any) {
    super(message, 403, response);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends TrinitySDKError {
  public readonly validationErrors?: Record<string, string[]>;

  constructor(message: string, response?: any, validationErrors?: Record<string, string[]>) {
    super(message, 400, response);
    this.validationErrors = validationErrors;
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends TrinitySDKError {
  constructor(message: string = "Resource not found", response?: any) {
    super(message, 404, response);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends TrinitySDKError {
  constructor(message: string = "Resource conflict", response?: any) {
    super(message, 409, response);
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends TrinitySDKError {
  constructor(message: string = "Internal server error", statusCode: number = 500, response?: any) {
    super(message, statusCode, response);
  }
}

/**
 * Network error (connection issues)
 */
export class NetworkError extends TrinitySDKError {
  constructor(message: string = "Network error", response?: any) {
    super(message, 0, response);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends TrinitySDKError {
  constructor(message: string = "Request timeout", response?: any) {
    super(message, 408, response);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends TrinitySDKError {
  constructor(message: string = "Rate limit exceeded", response?: any) {
    super(message, 429, response);
  }
}

/**
 * Create appropriate error based on HTTP status code
 */
export function createErrorFromResponse(statusCode: number, message: string, response?: any): TrinitySDKError {
  switch (statusCode) {
    case 400:
      return new ValidationError(message, response);
    case 401:
      return new AuthenticationError(message, response);
    case 403:
      return new AuthorizationError(message, response);
    case 404:
      return new NotFoundError(message, response);
    case 408:
      return new TimeoutError(message, response);
    case 409:
      return new ConflictError(message, response);
    case 429:
      return new RateLimitError(message, response);
    default:
      if (statusCode >= 500) {
        return new ServerError(message, statusCode, response);
      }
      return new TrinitySDKError(message, statusCode, response);
  }
}