import { Router } from "express";
import {
    deleteUser,
    followUser,
    getAllUsers,
    getCurrentUser,
    getFollowers,
    getFollowing,
    getPublicUserProfile,
    searchUsers,
    unfollowUser,
    updateProfilePicture,
    updateUser,
} from "../controllers/user.controller";
import {
    authenticate,
    optionalAuthenticate,
} from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

// Get current user
router.get("/me", authenticate, asyncHandler(getCurrentUser));

// Get all users (admin)
router.get("/all", authenticate, asyncHandler(getAllUsers));

// Search users
router.get("/search", authenticate, asyncHandler(searchUsers));

// Get public user profile (optional auth for isFollowing status)
router.get("/:id", optionalAuthenticate, asyncHandler(getPublicUserProfile));

// Update current user
router.put("/me", authenticate, asyncHandler(updateUser));

// Update profile picture
router.put(
    "/me/profile-picture",
    authenticate,
    uploadSingle("profilePicture"),
    asyncHandler(updateProfilePicture)
);

// Delete user
router.delete("/me", authenticate, asyncHandler(deleteUser));

// Follow/Unfollow
router.post("/:id/follow", authenticate, asyncHandler(followUser));
router.delete("/:id/follow", authenticate, asyncHandler(unfollowUser));

// Get followers/following
router.get("/:id/followers", authenticate, asyncHandler(getFollowers));
router.get("/:id/following", authenticate, asyncHandler(getFollowing));

export default router;
