import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError,
} from "../utils/errors";
import Logger from "../utils/logger";

/**
 * POST /api/diaries - Create a new diary
 */
export const createDiary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { name, description, isPublic } = req.body;

        // Validate required fields
        if (!name || name.trim() === "") {
            throw new ValidationError("Diary name is required");
        }

        const diary = await prisma.diary.create({
            data: {
                userId,
                name: name.trim(),
                description: description?.trim() || null,
                isPublic: isPublic === true,
            },
        });

        Logger.info(`Diary created: ${diary.id} by user: ${userId}`);

        res.status(201).json({
            success: true,
            message: "Diary created successfully",
            data: diary,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/diaries - Get all diaries for current user
 */
export const getUserDiaries = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;

        const diaries = await prisma.diary.findMany({
            where: {
                userId,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        res.status(200).json({
            success: true,
            data: {
                diaries,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/diaries/public - Get all public diaries
 */
export const getPublicDiaries = async (
    _req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const diaries = await prisma.diary.findMany({
            where: {
                isPublic: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        res.status(200).json({
            success: true,
            data: {
                diaries,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/diaries/:id - Get a specific diary
 */
export const getDiaryById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const diaryId = parseInt(req.params.id);
        const userId = req.user!.id;

        if (isNaN(diaryId)) {
            throw new ValidationError("Invalid diary ID");
        }

        const diary = await prisma.diary.findUnique({
            where: {
                id: diaryId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                    },
                },
            },
        });

        if (!diary) {
            throw new NotFoundError("Diary not found");
        }

        // Check authorization - only owner can view private diaries
        if (!diary.isPublic && diary.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to view this diary"
            );
        }

        res.status(200).json({
            success: true,
            data: diary,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * PUT /api/diaries/:id - Update a diary
 */
export const updateDiary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const diaryId = parseInt(req.params.id);
        const userId = req.user!.id;
        const { name, description, isPublic } = req.body;

        if (isNaN(diaryId)) {
            throw new ValidationError("Invalid diary ID");
        }

        // Check if diary exists and belongs to user
        const existingDiary = await prisma.diary.findUnique({
            where: { id: diaryId },
        });

        if (!existingDiary) {
            throw new NotFoundError("Diary not found");
        }

        if (existingDiary.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to update this diary"
            );
        }

        // Validate name if provided
        if (name !== undefined && name.trim() === "") {
            throw new ValidationError("Diary name cannot be empty");
        }

        // Update diary
        const updatedDiary = await prisma.diary.update({
            where: {
                id: diaryId,
            },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && {
                    description: description?.trim() || null,
                }),
                ...(isPublic !== undefined && { isPublic }),
            },
        });

        Logger.info(`Diary updated: ${diaryId} by user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Diary updated successfully",
            data: updatedDiary,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * DELETE /api/diaries/:id - Delete a diary and all its entries
 */
export const deleteDiary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const diaryId = parseInt(req.params.id);
        const userId = req.user!.id;

        if (isNaN(diaryId)) {
            throw new ValidationError("Invalid diary ID");
        }

        // Check if diary exists and belongs to user
        const diary = await prisma.diary.findUnique({
            where: { id: diaryId },
        });

        if (!diary) {
            throw new NotFoundError("Diary not found");
        }

        if (diary.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to delete this diary"
            );
        }

        // Delete diary (cascade will delete entries and their tags)
        await prisma.diary.delete({
            where: {
                id: diaryId,
            },
        });

        Logger.info(`Diary deleted: ${diaryId} by user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Diary deleted successfully",
        });
    } catch (error) {
        throw error;
    }
};
