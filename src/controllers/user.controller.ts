import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthenticatedRequest } from "../types";
import { deleteImage, uploadImage } from "../utils/cloudinary";
import { NotFoundError, ValidationError } from "../utils/errors";
import { isValidEmail, sanitizeUser } from "../utils/helpers";
import Logger from "../utils/logger";

/**
 * @route   GET /api/users/me
 * @desc    Get current logged-in user profile
 * @access  Private
 */
export const getCurrentUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const userResponse = sanitizeUser(user);
        res.json({
            success: true,
            data: userResponse,
        });
    } catch (error) {
        Logger.error("Error fetching current user:", error);
        throw error;
    }
};

/**
 * @route   GET /api/users/all
 * @desc    Get all users (admin function)
 * @access  Private
 */
export const getAllUsers = async (
    _req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
                bio: true,
                followersCount: true,
                followingCount: true,
                createdAt: true,
            },
        });

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        Logger.error("Error fetching all users:", error);
        throw error;
    }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get public user profile by ID
 * @access  Private (optional authentication for isFollowing status)
 */
export const getPublicUserProfile = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
                bio: true,
                followersCount: true,
                followingCount: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Check if current user is following this user
        let isFollowing = false;
        if (req.user) {
            const followRecord = await prisma.follow.findFirst({
                where: {
                    followerId: req.user.id,
                    followingId: userId,
                },
            });
            isFollowing = !!followRecord;
        }

        // Get jots count
        const jotsCount = await prisma.jot.count({
            where: { userId },
        });

        // Get public diaries count
        const openDiariesCount = await prisma.diary.count({
            where: { userId, isPublic: true },
        });

        const userResponse: any = user;
        userResponse.isFollowing = isFollowing;
        userResponse.jotsCount = jotsCount;
        userResponse.openDiariesCount = openDiariesCount;

        res.json({
            success: true,
            data: userResponse,
        });
    } catch (error) {
        Logger.error("Error fetching public user profile:", error);
        throw error;
    }
};

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
export const updateUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { firstName, lastName, email, bio, userTags } = req.body;

        // Validate email if provided
        if (email) {
            if (!isValidEmail(email)) {
                throw new ValidationError("Invalid email format");
            }

            // Check if email is already taken by another user
            const emailExists = await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    NOT: { id: req.user!.id },
                },
            });

            if (emailExists) {
                throw new ValidationError(
                    "Email already exists, use a different email address"
                );
            }
        }

        // Build update data
        const updateData: any = {};
        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (email) updateData.email = email.toLowerCase();
        if (bio !== undefined) updateData.bio = bio?.trim() || null;
        if (userTags)
            updateData.userTags = Array.isArray(userTags)
                ? userTags
                : userTags.split(",");

        const updatedUser = await prisma.user.update({
            where: { id: req.user!.id },
            data: updateData,
        });

        const userResponse = sanitizeUser(updatedUser);
        res.json({
            success: true,
            message: "User updated successfully",
            data: userResponse,
        });
    } catch (error) {
        Logger.error("Error updating user:", error);
        throw error;
    }
};

/**
 * @route   PUT /api/users/me/profile-picture
 * @desc    Update user profile picture
 * @access  Private
 */
export const updateProfilePicture = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const newProfilePicture = req.file;

        if (!newProfilePicture) {
            throw new ValidationError("No profile picture provided");
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Upload new profile picture
        const uploadResult = await uploadImage(
            {
                buffer: newProfilePicture.buffer,
                mimetype: newProfilePicture.mimetype,
                originalname: newProfilePicture.originalname,
                size: newProfilePicture.size,
                fieldname: newProfilePicture.fieldname,
                encoding: newProfilePicture.encoding,
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

        // Delete old profile picture if exists
        if (user.profilePicturePublicId) {
            await deleteImage(user.profilePicturePublicId);
        }

        // Update user with new profile picture
        const updatedUser = await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                profilePicture: uploadResult.url,
                profilePicturePublicId: uploadResult.publicId,
            },
        });

        const userResponse = sanitizeUser(updatedUser);
        res.json({
            success: true,
            message: "Profile picture updated successfully",
            data: userResponse,
        });
    } catch (error) {
        Logger.error("Error updating profile picture:", error);
        throw error;
    }
};

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account
 * @access  Private
 */
export const deleteUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Delete profile picture if exists
        if (user.profilePicturePublicId) {
            await deleteImage(user.profilePicturePublicId);
        }

        // Delete user (Prisma will cascade delete related records)
        await prisma.user.delete({
            where: { id: req.user!.id },
        });

        res.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        Logger.error("Error deleting user:", error);
        throw error;
    }
};

/**
 * @route   GET /api/users/search
 * @desc    Search users by name
 * @access  Private
 */
export const searchUsers = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== "string" || query.trim().length < 2) {
            throw new ValidationError(
                "Search query must be at least 2 characters"
            );
        }

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { firstName: { contains: query, mode: "insensitive" } },
                    { lastName: { contains: query, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
                bio: true,
                createdAt: true,
            },
            take: 20,
        });

        res.json({
            success: true,
            data: { users },
        });
    } catch (error) {
        Logger.error("Error searching users:", error);
        throw error;
    }
};

/**
 * @route   POST /api/users/:id/follow
 * @desc    Follow a user
 * @access  Private
 */
export const followUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userIdToFollow = parseInt(req.params.id);
        const currentUserId = req.user!.id;

        if (currentUserId === userIdToFollow) {
            throw new ValidationError("You cannot follow yourself");
        }

        const userToFollow = await prisma.user.findUnique({
            where: { id: userIdToFollow },
        });

        if (!userToFollow) {
            throw new NotFoundError("User not found");
        }

        // Check if already following
        const existingFollow = await prisma.follow.findFirst({
            where: {
                followerId: currentUserId,
                followingId: userIdToFollow,
            },
        });

        if (existingFollow) {
            throw new ValidationError("Already following this user");
        }

        // Create follow record and update counts in a transaction
        await prisma.$transaction([
            prisma.follow.create({
                data: {
                    followerId: currentUserId,
                    followingId: userIdToFollow,
                },
            }),
            prisma.user.update({
                where: { id: currentUserId },
                data: { followingCount: { increment: 1 } },
            }),
            prisma.user.update({
                where: { id: userIdToFollow },
                data: { followersCount: { increment: 1 } },
            }),
        ]);

        // Get current user info for notification
        const currentUser = await prisma.user.findUnique({
            where: { id: currentUserId },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                userId: userIdToFollow,
                senderId: currentUserId,
                type: "follow",
                title: "New Follower",
                body: `${currentUser!.firstName} ${
                    currentUser!.lastName
                } started following you`,
                data: { followerId: currentUserId },
                imageUrl: currentUser!.profilePicture,
                link: `/profile/${currentUserId}`,
            },
        });

        res.json({
            success: true,
            message: "User followed successfully",
            data: { isFollowing: true },
        });
    } catch (error) {
        Logger.error("Error following user:", error);
        throw error;
    }
};

/**
 * @route   DELETE /api/users/:id/follow
 * @desc    Unfollow a user
 * @access  Private
 */
export const unfollowUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userIdToUnfollow = parseInt(req.params.id);
        const currentUserId = req.user!.id;

        const followRecord = await prisma.follow.findFirst({
            where: {
                followerId: currentUserId,
                followingId: userIdToUnfollow,
            },
        });

        if (!followRecord) {
            throw new ValidationError("You are not following this user");
        }

        // Delete follow record and update counts in a transaction
        await prisma.$transaction([
            prisma.follow.delete({
                where: { id: followRecord.id },
            }),
            prisma.user.update({
                where: { id: currentUserId },
                data: { followingCount: { decrement: 1 } },
            }),
            prisma.user.update({
                where: { id: userIdToUnfollow },
                data: { followersCount: { decrement: 1 } },
            }),
        ]);

        res.json({
            success: true,
            message: "User unfollowed successfully",
            data: { isFollowing: false },
        });
    } catch (error) {
        Logger.error("Error unfollowing user:", error);
        throw error;
    }
};

/**
 * @route   GET /api/users/:id/followers
 * @desc    Get user's followers list
 * @access  Private
 */
export const getFollowers = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = parseInt(req.params.id);

        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const followersList = followers.map((f) => f.follower);

        res.json({
            success: true,
            data: { followers: followersList },
        });
    } catch (error) {
        Logger.error("Error fetching followers:", error);
        throw error;
    }
};

/**
 * @route   GET /api/users/:id/following
 * @desc    Get user's following list
 * @access  Private
 */
export const getFollowing = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = parseInt(req.params.id);

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePicture: true,
                        bio: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const followingList = following.map((f) => f.following);

        res.json({
            success: true,
            data: { following: followingList },
        });
    } catch (error) {
        Logger.error("Error fetching following:", error);
        throw error;
    }
};
