import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { deleteImage, uploadImage } from "../utils/cloudinary";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError,
} from "../utils/errors";
import { parsePagination } from "../utils/helpers";
import Logger from "../utils/logger";

/**
 * @route   POST /api/jots
 * @desc    Create a new jot (social post)
 * @access  Private
 */
export const createJot = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { content } = req.body;
        const media = req.file;

        if (!content || content.trim().length === 0) {
            throw new ValidationError("Content is required");
        }

        if (content.length > 1000) {
            throw new ValidationError(
                "Content must be less than 1000 characters"
            );
        }

        const jotData: any = {
            userId: req.user!.id,
            content: content.trim(),
        };

        // Upload media if provided
        if (media) {
            const uploadResult = await uploadImage(
                {
                    buffer: media.buffer,
                    mimetype: media.mimetype,
                    originalname: media.originalname,
                    size: media.size,
                    fieldname: media.fieldname,
                    encoding: media.encoding,
                },
                "jots",
                {
                    width: 1200,
                    height: 1200,
                    crop: "limit",
                    quality: "auto:good",
                    fetch_format: "auto",
                }
            );

            if (!uploadResult.success) {
                throw new ValidationError(
                    uploadResult.error || "Failed to upload media"
                );
            }

            jotData.mediaUrl = uploadResult.url;
            jotData.mediaPublicId = uploadResult.publicId;
            jotData.mediaType = media.mimetype.startsWith("video/")
                ? "video"
                : "image";
        }

        const jot = await prisma.jot.create({
            data: jotData,
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

        res.status(201).json({
            success: true,
            data: jot,
        });
    } catch (error) {
        Logger.error("Error creating jot:", error);
        throw error;
    }
};

/**
 * @route   GET /api/jots/feed?page=1&limit=20
 * @desc    Get global jots feed with pagination
 * @access  Private
 */
export const getJotsFeed = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { limit, offset } = parsePagination(
            req.query.page as string,
            req.query.limit as string
        );

        const jots = await prisma.jot.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                        bio: true,
                    },
                },
                reactions: {
                    where: {
                        userId: req.user!.id,
                    },
                    select: {
                        id: true,
                        reactionType: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Format response
        const jotsWithUserReaction = jots.map((jot) => {
            const { reactions, ...jotData } = jot;
            return {
                ...jotData,
                userReaction: reactions.length > 0 ? reactions[0] : null,
            };
        });

        res.json({
            success: true,
            data: {
                jots: jotsWithUserReaction,
                hasMore: jots.length === limit,
            },
        });
    } catch (error) {
        Logger.error("Error fetching jots feed:", error);
        throw error;
    }
};

/**
 * @route   GET /api/jots/user/:userId?page=1&limit=20
 * @desc    Get jots by specific user
 * @access  Private
 */
export const getUserJots = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = parseInt(req.params.userId);
        const { limit, offset } = parsePagination(
            req.query.page as string,
            req.query.limit as string
        );

        const jots = await prisma.jot.findMany({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                        bio: true,
                    },
                },
                reactions: {
                    where: {
                        userId: req.user!.id,
                    },
                    select: {
                        id: true,
                        reactionType: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        const jotsWithUserReaction = jots.map((jot) => {
            const { reactions, ...jotData } = jot;
            return {
                ...jotData,
                userReaction: reactions.length > 0 ? reactions[0] : null,
            };
        });

        res.json({
            success: true,
            data: {
                jots: jotsWithUserReaction,
                hasMore: jots.length === limit,
            },
        });
    } catch (error) {
        Logger.error("Error fetching user jots:", error);
        throw error;
    }
};

/**
 * @route   GET /api/jots/:id
 * @desc    Get single jot by ID
 * @access  Private
 */
export const getJotById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const jotId = parseInt(req.params.id);

        const jot = await prisma.jot.findUnique({
            where: {
                id: jotId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                        bio: true,
                    },
                },
                reactions: {
                    where: {
                        userId: req.user!.id,
                    },
                    select: {
                        id: true,
                        reactionType: true,
                    },
                },
            },
        });

        if (!jot) {
            throw new NotFoundError("Jot not found");
        }

        const { reactions, ...jotData } = jot;
        const response = {
            ...jotData,
            userReaction: reactions.length > 0 ? reactions[0] : null,
        };

        res.json({
            success: true,
            data: response,
        });
    } catch (error) {
        Logger.error("Error fetching jot:", error);
        throw error;
    }
};

/**
 * @route   DELETE /api/jots/:id
 * @desc    Delete a jot
 * @access  Private
 */
export const deleteJot = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const jotId = parseInt(req.params.id);

        const jot = await prisma.jot.findUnique({
            where: { id: jotId },
        });

        if (!jot) {
            throw new NotFoundError("Jot not found");
        }

        if (jot.userId !== req.user!.id) {
            throw new AuthorizationError("You can only delete your own jots");
        }

        // Delete media if exists
        if (jot.mediaPublicId) {
            await deleteImage(jot.mediaPublicId);
        }

        await prisma.jot.delete({
            where: { id: jotId },
        });

        res.json({
            success: true,
            message: "Jot deleted successfully",
        });
    } catch (error) {
        Logger.error("Error deleting jot:", error);
        throw error;
    }
};

/**
 * @route   POST /api/jots/:jotId/reactions
 * @desc    Toggle reaction on a jot (add or remove)
 * @access  Private
 */
export const toggleReaction = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const jotId = parseInt(req.params.jotId);
        const { reactionType = "like" } = req.body;

        // Validate reaction type
        const validReactions = ["like", "love", "insightful", "celebrate"];
        if (!validReactions.includes(reactionType)) {
            throw new ValidationError("Invalid reaction type");
        }

        const jot = await prisma.jot.findUnique({
            where: { id: jotId },
        });

        if (!jot) {
            throw new NotFoundError("Jot not found");
        }

        const existingReaction = await prisma.jotReaction.findFirst({
            where: {
                jotId,
                userId: req.user!.id,
            },
        });

        if (existingReaction) {
            // Remove reaction
            await prisma.$transaction([
                prisma.jotReaction.delete({
                    where: { id: existingReaction.id },
                }),
                prisma.jot.update({
                    where: { id: jotId },
                    data: { reactionsCount: { decrement: 1 } },
                }),
            ]);

            res.json({
                success: true,
                message: "Reaction removed",
                data: { reacted: false },
            });
        } else {
            // Add reaction
            await prisma.$transaction([
                prisma.jotReaction.create({
                    data: {
                        jotId,
                        userId: req.user!.id,
                        reactionType: reactionType as any,
                    },
                }),
                prisma.jot.update({
                    where: { id: jotId },
                    data: { reactionsCount: { increment: 1 } },
                }),
            ]);

            // Send notification to jot owner (if not reacting to own jot)
            if (jot.userId !== req.user!.id) {
                const reactor = await prisma.user.findUnique({
                    where: { id: req.user!.id },
                });

                await prisma.notification.create({
                    data: {
                        userId: jot.userId,
                        senderId: req.user!.id,
                        type: "jot_reaction",
                        title: "New reaction on your jot",
                        body: `${reactor!.firstName} ${
                            reactor!.lastName
                        } reacted to your jot`,
                        data: { jotId: jot.id },
                        imageUrl: reactor!.profilePicture,
                        link: `/jot/${jot.id}`,
                    },
                });
            }

            res.json({
                success: true,
                message: "Reaction added",
                data: { reacted: true, reactionType },
            });
        }
    } catch (error) {
        Logger.error("Error toggling reaction:", error);
        throw error;
    }
};

/**
 * @route   GET /api/jots/:jotId/comments?page=1&limit=20
 * @desc    Get comments for a jot
 * @access  Private
 */
export const getJotComments = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const jotId = parseInt(req.params.jotId);
        const { limit, offset } = parsePagination(
            req.query.page as string,
            req.query.limit as string
        );

        const comments = await prisma.jotComment.findMany({
            where: {
                jotId,
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
                createdAt: "asc",
            },
            take: limit,
            skip: offset,
        });

        res.json({
            success: true,
            data: {
                comments,
                hasMore: comments.length === limit,
            },
        });
    } catch (error) {
        Logger.error("Error fetching comments:", error);
        throw error;
    }
};

/**
 * @route   POST /api/jots/:jotId/comments
 * @desc    Add a comment to a jot
 * @access  Private
 */
export const addComment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const jotId = parseInt(req.params.jotId);
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            throw new ValidationError("Comment content is required");
        }

        if (content.length > 500) {
            throw new ValidationError(
                "Comment must be less than 500 characters"
            );
        }

        const jot = await prisma.jot.findUnique({
            where: { id: jotId },
        });

        if (!jot) {
            throw new NotFoundError("Jot not found");
        }

        const [comment] = await prisma.$transaction([
            prisma.jotComment.create({
                data: {
                    jotId,
                    userId: req.user!.id,
                    content: content.trim(),
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
            }),
            prisma.jot.update({
                where: { id: jotId },
                data: { commentsCount: { increment: 1 } },
            }),
        ]);

        // Send notification to jot owner (if not commenting on own jot)
        if (jot.userId !== req.user!.id) {
            const commenter = await prisma.user.findUnique({
                where: { id: req.user!.id },
            });

            await prisma.notification.create({
                data: {
                    userId: jot.userId,
                    senderId: req.user!.id,
                    type: "jot_comment",
                    title: "New comment on your jot",
                    body: `${commenter!.firstName} ${
                        commenter!.lastName
                    } commented: ${content.substring(0, 50)}${
                        content.length > 50 ? "..." : ""
                    }`,
                    data: { jotId: jot.id, commentId: comment.id },
                    imageUrl: commenter!.profilePicture,
                    link: `/jot/${jot.id}`,
                },
            });
        }

        res.status(201).json({
            success: true,
            data: comment,
        });
    } catch (error) {
        Logger.error("Error adding comment:", error);
        throw error;
    }
};

/**
 * @route   DELETE /api/jots/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
export const deleteComment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const commentId = parseInt(req.params.commentId);

        const comment = await prisma.jotComment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new NotFoundError("Comment not found");
        }

        if (comment.userId !== req.user!.id) {
            throw new AuthorizationError(
                "You can only delete your own comments"
            );
        }

        await prisma.$transaction([
            prisma.jotComment.delete({
                where: { id: commentId },
            }),
            prisma.jot.update({
                where: { id: comment.jotId },
                data: { commentsCount: { decrement: 1 } },
            }),
        ]);

        res.json({
            success: true,
            message: "Comment deleted successfully",
        });
    } catch (error) {
        Logger.error("Error deleting comment:", error);
        throw error;
    }
};
