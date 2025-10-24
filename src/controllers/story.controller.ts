import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { deleteImage, uploadImage } from "../utils/cloudinary";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError,
} from "../utils/errors";
import { calculateStoryExpiration } from "../utils/helpers";
import Logger from "../utils/logger";

/**
 * POST /api/stories - Create a new 24-hour story
 */
export const createStory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { caption } = req.body;
        const file = req.file;

        // Validate required fields
        if (!file) {
            throw new ValidationError("Media file is required for story");
        }

        // Determine media type
        const mediaType = file.mimetype.startsWith("video/")
            ? "video"
            : "image";

        // Upload media to Cloudinary
        const uploadResult = await uploadImage(file, "stories");

        if (!uploadResult.success || !uploadResult.url) {
            throw new Error("Failed to upload media to Cloudinary");
        }

        // Calculate expiration (24 hours from now)
        const expiresAt = calculateStoryExpiration();

        // Create story
        const story = await prisma.story.create({
            data: {
                userId,
                mediaUrl: uploadResult.url,
                mediaPublicId: uploadResult.publicId || null,
                mediaType,
                caption: caption?.trim() || null,
                expiresAt,
                viewsCount: 0,
            },
        });

        Logger.info(`Story created: ${story.id} by user: ${userId}`);

        res.status(201).json({
            success: true,
            data: story,
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/stories - Get all active stories from users you follow
 */
export const getActiveStories = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const now = new Date();

        // Get users that the current user follows
        const following = await prisma.follow.findMany({
            where: {
                followerId: userId,
            },
            select: {
                followingId: true,
            },
        });

        const followingIds = following.map((f) => f.followingId);

        // Get active (non-expired) stories from followed users
        const stories = await prisma.story.findMany({
            where: {
                userId: {
                    in: followingIds,
                },
                expiresAt: {
                    gt: now,
                },
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
                views: {
                    where: {
                        viewerId: userId,
                    },
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Format stories with hasViewed flag
        const formattedStories = stories.map((story) => ({
            id: story.id,
            userId: story.userId,
            mediaUrl: story.mediaUrl,
            mediaType: story.mediaType,
            caption: story.caption,
            viewsCount: story.viewsCount,
            expiresAt: story.expiresAt,
            createdAt: story.createdAt,
            user: story.user,
            hasViewed: story.views.length > 0,
        }));

        res.status(200).json({
            success: true,
            data: {
                stories: formattedStories,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * POST /api/stories/:id/view - Mark a story as viewed
 */
export const viewStory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const storyId = parseInt(req.params.id);

        if (isNaN(storyId)) {
            throw new ValidationError("Invalid story ID");
        }

        // Check if story exists and is not expired
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            throw new NotFoundError("Story not found");
        }

        if (new Date() > story.expiresAt) {
            throw new ValidationError("This story has expired");
        }

        // Check if already viewed
        const existingView = await prisma.storyView.findUnique({
            where: {
                storyId_viewerId: {
                    storyId,
                    viewerId: userId,
                },
            },
        });

        if (!existingView) {
            // Create view record
            await prisma.storyView.create({
                data: {
                    storyId,
                    viewerId: userId,
                },
            });

            // Increment views count
            await prisma.story.update({
                where: { id: storyId },
                data: {
                    viewsCount: {
                        increment: 1,
                    },
                },
            });

            Logger.info(`Story viewed: ${storyId} by user: ${userId}`);
        }

        res.status(200).json({
            success: true,
            message: "Story viewed",
        });
    } catch (error) {
        throw error;
    }
};

/**
 * GET /api/stories/:id/views - Get list of users who viewed the story
 */
export const getStoryViews = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const storyId = parseInt(req.params.id);

        if (isNaN(storyId)) {
            throw new ValidationError("Invalid story ID");
        }

        // Check if story exists and belongs to user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            throw new NotFoundError("Story not found");
        }

        if (story.userId !== userId) {
            throw new AuthorizationError(
                "You can only view your own story's viewers"
            );
        }

        // Get all views with viewer details
        const views = await prisma.storyView.findMany({
            where: {
                storyId,
            },
            include: {
                viewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.status(200).json({
            success: true,
            data: {
                views,
            },
        });
    } catch (error) {
        throw error;
    }
};

/**
 * DELETE /api/stories/:id - Delete a story
 */
export const deleteStory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user!.id;
        const storyId = parseInt(req.params.id);

        if (isNaN(storyId)) {
            throw new ValidationError("Invalid story ID");
        }

        // Check if story exists and belongs to user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
        });

        if (!story) {
            throw new NotFoundError("Story not found");
        }

        if (story.userId !== userId) {
            throw new AuthorizationError(
                "You can only delete your own stories"
            );
        }

        // Delete media from Cloudinary
        if (story.mediaUrl) {
            await deleteImage(story.mediaUrl);
        }

        // Delete story (cascade will delete views)
        await prisma.story.delete({
            where: { id: storyId },
        });

        Logger.info(`Story deleted: ${storyId} by user: ${userId}`);

        res.status(200).json({
            success: true,
            message: "Story deleted successfully",
        });
    } catch (error) {
        throw error;
    }
};
