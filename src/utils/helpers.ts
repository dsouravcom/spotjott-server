import { Response } from "express";

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
    return password.length >= 6;
}

/**
 * Sanitize user object by removing sensitive fields
 */
export function sanitizeUser(user: any): any {
    const { password, ...sanitized } = user;
    return sanitized;
}

/**
 * Parse pagination parameters
 */
export function parsePagination(
    page?: string | number,
    limit?: string | number
) {
    const parsedPage = parseInt(String(page || 1));
    const parsedLimit = parseInt(String(limit || 20));

    return {
        page: Math.max(1, parsedPage),
        limit: Math.min(100, Math.max(1, parsedLimit)), // Max 100 items per page
        offset:
            (Math.max(1, parsedPage) - 1) *
            Math.min(100, Math.max(1, parsedLimit)),
    };
}

/**
 * Send success response
 */
export function sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): void {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

/**
 * Send error response
 */
export function sendError(
    res: Response,
    error: string,
    statusCode: number = 500,
    details?: any
): void {
    res.status(statusCode).json({
        success: false,
        error,
        details,
    });
}

/**
 * Calculate story expiration time (24 hours from now)
 */
export function calculateStoryExpiration(): Date {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    return now;
}

/**
 * Check if story has expired
 */
export function isStoryExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
}
