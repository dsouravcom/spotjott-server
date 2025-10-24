import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import Logger from "../utils/logger";

/**
 * GET /api/emotions - Get all available emotions
 */
export const getAllEmotions = async (
    _req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const emotions = await prisma.emotion.findMany({
            select: {
                id: true,
                emotionSlug: true,
                emotionName: true,
            },
            orderBy: {
                emotionName: "asc",
            },
        });

        res.status(200).json({
            success: true,
            data: {
                emotions,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * POST /api/emotions/track - Track an emotion for a specific date
 */
export const trackEmotion = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { emotionId, date } = req.body;

        // Validate required fields
        if (!emotionId) {
            throw new ValidationError("Emotion ID is required");
        }

        // Parse emotion ID
        const parsedEmotionId = parseInt(emotionId);
        if (isNaN(parsedEmotionId)) {
            throw new ValidationError("Invalid emotion ID");
        }

        // Verify emotion exists
        const emotion = await prisma.emotion.findUnique({
            where: { id: parsedEmotionId },
        });

        if (!emotion) {
            throw new NotFoundError("Emotion not found");
        }

        // Parse date or use current date
        let trackingDate: Date;
        if (date) {
            trackingDate = new Date(date);
            if (isNaN(trackingDate.getTime())) {
                throw new ValidationError("Invalid date format");
            }
        } else {
            trackingDate = new Date();
        }

        // Check if emotion already tracked for this date
        const startOfDay = new Date(trackingDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(trackingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingTracker = await prisma.emotionTracker.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        let tracker;
        if (existingTracker) {
            // Update existing tracker
            tracker = await prisma.emotionTracker.update({
                where: { id: existingTracker.id },
                data: {
                    emotionId: parsedEmotionId,
                },
            });

            Logger.info(`Emotion updated: ${tracker.id} for user: ${userId}`);
        } else {
            // Create new tracker
            tracker = await prisma.emotionTracker.create({
                data: {
                    userId,
                    emotionId: parsedEmotionId,
                    date: trackingDate,
                },
            });

            Logger.info(`Emotion tracked: ${tracker.id} for user: ${userId}`);
        }

        res.status(201).json({
            success: true,
            message: "Emotion tracked successfully",
            data: tracker,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/emotions/history - Get emotion tracking history
 */
export const getEmotionHistory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { startDate, endDate } = req.query;

        // Build query filters
        const filters: any = {
            userId,
        };

        // Add date filters if provided
        if (startDate || endDate) {
            filters.date = {};

            if (startDate) {
                const start = new Date(startDate as string);
                if (!isNaN(start.getTime())) {
                    filters.date.gte = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate as string);
                if (!isNaN(end.getTime())) {
                    // Set to end of day
                    end.setHours(23, 59, 59, 999);
                    filters.date.lte = end;
                }
            }
        }

        // Get emotion history
        const history = await prisma.emotionTracker.findMany({
            where: filters,
            include: {
                emotion: {
                    select: {
                        id: true,
                        emotionSlug: true,
                        emotionName: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
        });

        res.status(200).json({
            success: true,
            data: {
                history,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * POST /api/emotions - Create a new emotion (Admin)
 */
export const createEmotion = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { emotionSlug, emotionName } = req.body;

        // Validate required fields
        if (!emotionSlug || emotionSlug.trim() === "") {
            throw new ValidationError("Emotion slug is required");
        }

        if (!emotionName || emotionName.trim() === "") {
            throw new ValidationError("Emotion name is required");
        }

        // Check if emotion slug already exists
        const existingEmotion = await prisma.emotion.findUnique({
            where: { emotionSlug: emotionSlug.trim().toLowerCase() },
        });

        if (existingEmotion) {
            throw new ConflictError("Emotion with this slug already exists");
        }

        // Create emotion
        const emotion = await prisma.emotion.create({
            data: {
                emotionSlug: emotionSlug.trim().toLowerCase(),
                emotionName: emotionName.trim(),
            },
        });

        Logger.info(`Emotion created: ${emotion.id} - ${emotion.emotionSlug}`);

        res.status(201).json({
            success: true,
            message: "Emotion created successfully",
            data: emotion,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * PUT /api/emotions/:id - Update an emotion (Admin)
 */
export const updateEmotion = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const emotionId = parseInt(req.params.id);
        const { emotionSlug, emotionName } = req.body;

        if (isNaN(emotionId)) {
            throw new ValidationError("Invalid emotion ID");
        }

        // Check if emotion exists
        const existingEmotion = await prisma.emotion.findUnique({
            where: { id: emotionId },
        });

        if (!existingEmotion) {
            throw new NotFoundError("Emotion not found");
        }

        // If updating slug, check for conflicts
        if (emotionSlug && emotionSlug.trim() !== existingEmotion.emotionSlug) {
            const slugConflict = await prisma.emotion.findUnique({
                where: { emotionSlug: emotionSlug.trim().toLowerCase() },
            });

            if (slugConflict) {
                throw new ConflictError(
                    "Emotion with this slug already exists"
                );
            }
        }

        // Update emotion
        const updatedEmotion = await prisma.emotion.update({
            where: { id: emotionId },
            data: {
                ...(emotionSlug && {
                    emotionSlug: emotionSlug.trim().toLowerCase(),
                }),
                ...(emotionName && { emotionName: emotionName.trim() }),
            },
        });

        Logger.info(
            `Emotion updated: ${emotionId} - ${updatedEmotion.emotionSlug}`
        );

        res.status(200).json({
            success: true,
            message: "Emotion updated successfully",
            data: updatedEmotion,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * DELETE /api/emotions/:id - Delete an emotion (Admin)
 */
export const deleteEmotion = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const emotionId = parseInt(req.params.id);

        if (isNaN(emotionId)) {
            throw new ValidationError("Invalid emotion ID");
        }

        // Check if emotion exists
        const emotion = await prisma.emotion.findUnique({
            where: { id: emotionId },
        });

        if (!emotion) {
            throw new NotFoundError("Emotion not found");
        }

        // Check if emotion is being used
        const usageCount = await prisma.emotionTracker.count({
            where: { emotionId },
        });

        if (usageCount > 0) {
            throw new ConflictError(
                `Cannot delete emotion. It is being used in ${usageCount} tracking record(s)`
            );
        }

        // Delete emotion
        await prisma.emotion.delete({
            where: { id: emotionId },
        });

        Logger.info(`Emotion deleted: ${emotionId} - ${emotion.emotionSlug}`);

        res.status(200).json({
            success: true,
            message: "Emotion deleted successfully",
        });
    } catch (error) {
        throw error;
    }
};
