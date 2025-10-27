import bcrypt from "bcrypt";
import { Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { uploadImage } from "../utils/cloudinary";
import { ConflictError, ValidationError } from "../utils/errors";
import { isValidEmail, isValidPassword, sanitizeUser } from "../utils/helpers";
import Logger from "../utils/logger";

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 *
 * @body {
 *   firstName: string (required),
 *   lastName: string (required),
 *   email: string (required),
 *   password: string (required, min 6 chars),
 *   bio?: string (optional),
 *   tags?: string (optional, comma-separated)
 * }
 * @file profilePicture - Optional profile picture file
 *
 * @returns {
 *   message: string,
 *   user: User (without password),
 *   token: string (JWT, expires in 7 days)
 * }
 */
export const register = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { firstName, lastName, email, password, bio } = req.body;
        let { tags } = req.body;
        const profilePicture = req.file;

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            throw new ValidationError(
                "Please provide all required fields: firstName, lastName, email, password"
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            throw new ValidationError("Invalid email format");
        }

        // Validate password strength
        if (!isValidPassword(password)) {
            throw new ValidationError(
                "Password must be at least 6 characters long"
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true }
        });

        if (existingUser) {
            throw new ConflictError("User with this email already exists");
        }

        // Parse tags
        let userTags = null;
        if (tags) {
            userTags =
                typeof tags === "string"
                    ? tags.split(",").map((t) => t.trim())
                    : tags;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare user data
        const userData: any = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            bio: bio?.trim() || null,
            userTags: userTags,
        };

        // Handle profile picture upload if provided
        if (profilePicture) {
            const uploadResult = await uploadImage(
                {
                    buffer: profilePicture.buffer,
                    mimetype: profilePicture.mimetype,
                    originalname: profilePicture.originalname,
                    size: profilePicture.size,
                    fieldname: profilePicture.fieldname,
                    encoding: profilePicture.encoding,
                },
                "user_profiles",
                {
                    width: 300,
                    height: 300,
                    crop: "fill",
                }
            );

            if (!uploadResult.success) {
                throw new ValidationError(
                    uploadResult.error || "Failed to upload profile picture"
                );
            }

            userData.profilePicture = uploadResult.url;
            userData.profilePicturePublicId = uploadResult.publicId;
        }

        // Create user
        const newUser = await prisma.user.create({
            data: userData,
        });

        // Remove password from response
        const userResponse = sanitizeUser(newUser);

        // Create JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET!,
            { expiresIn: "30d" }
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: userResponse,
            token,
        });
    } catch (error) {
        Logger.error("Registration error:", error);

        if (
            error instanceof ValidationError ||
            error instanceof ConflictError
        ) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Registration failed. Please try again.",
            });
        }
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 *
 * @body {
 *   email: string (required),
 *   password: string (required)
 * }
 *
 * @returns {
 *   message: string,
 *   user: User (without password),
 *   token: string (JWT, expires in 7 days)
 * }
 */
export const login = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    Logger.info("login request origin:", {
        ip: req.ip,
        headers: {
            "x-forwarded-for": req.get("X-Forwarded-For"),
            "x-real-ip": req.get("X-Real-IP"),
        },
        userAgent: req.get("User-Agent"),
    });
    Logger.info("login request:", req);
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            throw new ValidationError("Please provide email and password");
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new ValidationError("Invalid credentials");
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new ValidationError("Invalid credentials");
        }

        // Remove password from response
        const userResponse = sanitizeUser(user);

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: "30d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: userResponse,
            token,
        });
    } catch (error) {
        Logger.error("Login error:", error);

        if (error instanceof ValidationError) {
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        } else {
            res.status(500).json({
                success: false,
                error: "Login failed. Please try again.",
            });
        }
    }
};
