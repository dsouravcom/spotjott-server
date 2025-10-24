import { NextFunction, Response } from "express";
import { jwtDecode } from "jwt-decode";
import { AuthenticatedRequest } from "../types";
import { AuthenticationError } from "../utils/errors";

interface DecodedToken {
    id: number;
    email: string;
    iat?: number;
    exp?: number;
}

/**
 * Authentication middleware to verify JWT tokens
 * Expects Authorization header in format: "Bearer <token>"
 */
export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader) {
            throw new AuthenticationError("Access denied. No token provided.");
        }

        // Extract token from "Bearer <token>" format
        const tokenParts = authHeader.split(" ");

        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            throw new AuthenticationError(
                "Invalid token format. Expected: Bearer <token>"
            );
        }

        const token = tokenParts[1];

        // Decode and verify token
        const decoded = jwtDecode<DecodedToken>(token);

        // Check if token has expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            throw new AuthenticationError("Token has expired");
        }

        // Attach user info to request
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };

        next();
    } catch (error) {
        if (error instanceof AuthenticationError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        } else {
            res.status(401).json({
                success: false,
                error: "Invalid token",
            });
        }
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't throw error if missing
 */
export const optionalAuthenticate = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.header("Authorization");

        if (authHeader) {
            const tokenParts = authHeader.split(" ");

            if (tokenParts.length === 2 && tokenParts[0] === "Bearer") {
                const token = tokenParts[1];
                const decoded = jwtDecode<DecodedToken>(token);

                // Only attach if not expired
                if (!decoded.exp || decoded.exp * 1000 >= Date.now()) {
                    req.user = {
                        id: decoded.id,
                        email: decoded.email,
                    };
                }
            }
        }

        next();
    } catch (error) {
        // Silently fail and continue without authentication
        next();
    }
};
