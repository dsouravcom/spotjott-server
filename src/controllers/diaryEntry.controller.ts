import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { deleteImage, uploadImage } from "../utils/cloudinary";
import {
    AuthorizationError,
    MaxTagsError,
    NotFoundError,
    ValidationError,
} from "../utils/errors";
import { parsePagination } from "../utils/helpers";
import Logger from "../utils/logger";

const MAX_TAGS = 5;

/**
 * POST /api/diary-entries - Create a new diary entry
 */
export const createDiaryEntry = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { title, content, diaryId, tags } = req.body;
        const file = req.file;

        // Validate required fields
        if (!title || title.trim() === "") {
            throw new ValidationError("Entry title is required");
        }

        if (!content || content.trim() === "") {
            throw new ValidationError("Entry content is required");
        }

        if (!diaryId) {
            throw new ValidationError("Diary ID is required");
        }

        const parsedDiaryId = parseInt(diaryId);
        if (isNaN(parsedDiaryId)) {
            throw new ValidationError("Invalid diary ID");
        }

        // Check if diary exists and belongs to user
        const diary = await prisma.diary.findUnique({
            where: { id: parsedDiaryId },
        });

        if (!diary) {
            throw new NotFoundError("Diary not found");
        }

        if (diary.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to add entries to this diary"
            );
        }

        // Parse and validate tags
        let tagNames: string[] = [];
        if (tags) {
            if (typeof tags === "string") {
                tagNames = tags
                    .split(",")
                    .map((tag: string) => tag.trim().toLowerCase())
                    .filter((tag: string) => tag);
            } else if (Array.isArray(tags)) {
                tagNames = tags
                    .map((tag: string) => tag.trim().toLowerCase())
                    .filter((tag: string) => tag);
            }

            if (tagNames.length > MAX_TAGS) {
                throw new MaxTagsError(
                    `Maximum ${MAX_TAGS} tags allowed per entry`
                );
            }
        }

        // Upload cover image if provided
        let coverImageUrl: string | null = null;
        if (file) {
            const uploadResult = await uploadImage(file, "diary-entries");
            if (uploadResult.success && uploadResult.url) {
                coverImageUrl = uploadResult.url;
            }
        }

        // Create diary entry
        const entry = await prisma.diaryEntry.create({
            data: {
                userId,
                diaryId: parsedDiaryId,
                title: title.trim(),
                content: content.trim(),
                coverImage: coverImageUrl,
                favorite: false,
            },
        });

        // Create or find tags and link them to the entry
        if (tagNames.length > 0) {
            for (const tagName of tagNames) {
                // Find or create tag
                let tag = await prisma.tag.findFirst({
                    where: { name: tagName, userId },
                });

                if (!tag) {
                    tag = await prisma.tag.create({
                        data: {
                            name: tagName,
                            userId,
                        },
                    });
                }

                // Link tag to entry
                await prisma.diaryEntryTag.create({
                    data: {
                        diaryEntryId: entry.id,
                        tagId: tag.id,
                    },
                });
            }
        }

        // Fetch complete entry with tags
        const completeEntry = await prisma.diaryEntry.findUnique({
            where: { id: entry.id },
            include: {
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });

        // Format response
        const formattedEntry = {
            ...completeEntry,
            tags: completeEntry?.tags.map((dt) => ({
                id: dt.tag.id,
                name: dt.tag.name,
            })),
        };

        Logger.info(
            `Diary entry created: ${entry.id} in diary: ${parsedDiaryId}`
        );

        res.status(201).json({
            success: true,
            data: formattedEntry,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/diary-entries/diary/:diaryId - Get all entries from a diary
 */
export const getDiaryEntries = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const diaryId = parseInt(req.params.diaryId);
        const { limit, offset } = parsePagination(
            req.query.page as string,
            req.query.limit as string
        );

        if (isNaN(diaryId)) {
            throw new ValidationError("Invalid diary ID");
        }

        // Check if diary exists
        const diary = await prisma.diary.findUnique({
            where: { id: diaryId },
        });

        if (!diary) {
            throw new NotFoundError("Diary not found");
        }

        // Check authorization - only owner can view private diary entries
        if (!diary.isPublic && diary.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to view these entries"
            );
        }

        // Get entries with pagination
        const entries = await prisma.diaryEntry.findMany({
            where: {
                diaryId,
            },
            include: {
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Check if there are more entries
        const totalCount = await prisma.diaryEntry.count({
            where: { diaryId },
        });

        const hasMore = offset + entries.length < totalCount;

        // Format entries
        const formattedEntries = entries.map((entry) => ({
            ...entry,
            tags: entry.tags.map((dt) => ({
                id: dt.tag.id,
                name: dt.tag.name,
            })),
        }));

        res.status(200).json({
            success: true,
            data: {
                entries: formattedEntries,
                hasMore,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * PUT /api/diary-entries/:id - Update a diary entry
 */
export const updateDiaryEntry = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const entryId = parseInt(req.params.id);
        const { title, content, favorite, tags } = req.body;

        if (isNaN(entryId)) {
            throw new ValidationError("Invalid entry ID");
        }

        // Check if entry exists and belongs to user
        const existingEntry = await prisma.diaryEntry.findUnique({
            where: { id: entryId },
            include: {
                tags: true,
            },
        });

        if (!existingEntry) {
            throw new NotFoundError("Diary entry not found");
        }

        if (existingEntry.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to update this entry"
            );
        }

        // Validate fields if provided
        if (title !== undefined && title.trim() === "") {
            throw new ValidationError("Entry title cannot be empty");
        }

        if (content !== undefined && content.trim() === "") {
            throw new ValidationError("Entry content cannot be empty");
        }

        // Parse tags if provided
        let tagNames: string[] = [];
        if (tags !== undefined) {
            if (typeof tags === "string") {
                tagNames = tags
                    .split(",")
                    .map((tag: string) => tag.trim().toLowerCase())
                    .filter((tag: string) => tag);
            } else if (Array.isArray(tags)) {
                tagNames = tags
                    .map((tag: string) => tag.trim().toLowerCase())
                    .filter((tag: string) => tag);
            }

            if (tagNames.length > MAX_TAGS) {
                throw new MaxTagsError(
                    `Maximum ${MAX_TAGS} tags allowed per entry`
                );
            }
        }

        // Update entry
        await prisma.diaryEntry.update({
            where: { id: entryId },
            data: {
                ...(title !== undefined && { title: title.trim() }),
                ...(content !== undefined && { content: content.trim() }),
                ...(favorite !== undefined && { favorite }),
            },
        });

        // Update tags if provided
        if (tags !== undefined) {
            // Delete existing tag associations
            await prisma.diaryEntryTag.deleteMany({
                where: { diaryEntryId: entryId },
            });

            // Create new tag associations
            if (tagNames.length > 0) {
                for (const tagName of tagNames) {
                    // Find or create tag
                    let tag = await prisma.tag.findFirst({
                        where: { name: tagName, userId },
                    });

                    if (!tag) {
                        tag = await prisma.tag.create({
                            data: {
                                name: tagName,
                                userId,
                            },
                        });
                    }

                    // Link tag to entry
                    await prisma.diaryEntryTag.create({
                        data: {
                            diaryEntryId: entryId,
                            tagId: tag.id,
                        },
                    });
                }
            }
        }

        // Fetch complete entry with tags
        const completeEntry = await prisma.diaryEntry.findUnique({
            where: { id: entryId },
            include: {
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });

        // Format response
        const formattedEntry = {
            ...completeEntry,
            tags: completeEntry?.tags.map((dt) => ({
                id: dt.tag.id,
                name: dt.tag.name,
            })),
        };

        Logger.info(`Diary entry updated: ${entryId} by user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Diary entry updated successfully",
            data: formattedEntry,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * DELETE /api/diary-entries/:id - Delete a diary entry
 */
export const deleteDiaryEntry = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const entryId = parseInt(req.params.id);

        if (isNaN(entryId)) {
            throw new ValidationError("Invalid entry ID");
        }

        // Check if entry exists and belongs to user
        const entry = await prisma.diaryEntry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            throw new NotFoundError("Diary entry not found");
        }

        if (entry.userId !== userId) {
            throw new AuthorizationError(
                "You don't have permission to delete this entry"
            );
        }

        // Delete cover image from Cloudinary if exists
        if (entry.coverImage) {
            await deleteImage(entry.coverImage);
        }

        // Delete entry (cascade will delete tag associations)
        await prisma.diaryEntry.delete({
            where: { id: entryId },
        });

        Logger.info(`Diary entry deleted: ${entryId} by user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Diary entry deleted successfully",
        });
    } catch (error) {
        throw error;
    }
};
