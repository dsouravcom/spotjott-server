import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import Logger from "../utils/logger";

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Log error
    Logger.error("Error occurred:", {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    // Handle operational errors
    if (err instanceof AppError && err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Handle Prisma errors
    if (err.name === "PrismaClientKnownRequestError") {
        res.status(400).json({
            success: false,
            error: "Database operation failed",
            details:
                process.env.NODE_ENV === "development"
                    ? err.message
                    : undefined,
        });
        return;
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
        res.status(400).json({
            success: false,
            error: err.message,
        });
        return;
    }

    // Default to 500 server error
    res.status(500).json({
        success: false,
        error: "Internal server error",
        details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
    });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Cannot ${req.method} ${req.path}`,
    });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
