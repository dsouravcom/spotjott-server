/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = "Authentication failed") {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(
        message: string = "You do not have permission to perform this action"
    ) {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = "Resource already exists") {
        super(message, 409);
    }
}

export class MaxTagsError extends AppError {
    constructor(
        message: string = "A diary entry can have a maximum of 5 tags"
    ) {
        super(message, 400);
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = "Too many requests, please try again later") {
        super(message, 429);
    }
}
