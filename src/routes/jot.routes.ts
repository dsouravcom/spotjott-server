import { Router } from "express";
import {
    addComment,
    createJot,
    deleteComment,
    deleteJot,
    getJotById,
    getJotComments,
    getJotsFeed,
    getUserJots,
    toggleReaction,
} from "../controllers/jot.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

/**
 * @route   POST /api/jots
 * @desc    Create a new jot
 * @access  Private
 */
router.post("/", authenticate, uploadSingle("media"), asyncHandler(createJot));

/**
 * @route   GET /api/jots/feed
 * @desc    Get global jots feed with pagination
 * @access  Private
 */
router.get("/feed", authenticate, asyncHandler(getJotsFeed));

/**
 * @route   GET /api/jots/user/:userId
 * @desc    Get jots by specific user
 * @access  Private
 */
router.get("/user/:userId", authenticate, asyncHandler(getUserJots));

/**
 * @route   GET /api/jots/:id
 * @desc    Get single jot by ID
 * @access  Private
 */
router.get("/:id", authenticate, asyncHandler(getJotById));

/**
 * @route   DELETE /api/jots/:id
 * @desc    Delete a jot
 * @access  Private
 */
router.delete("/:id", authenticate, asyncHandler(deleteJot));

/**
 * @route   POST /api/jots/:jotId/reactions
 * @desc    Toggle reaction on a jot
 * @access  Private
 */
router.post("/:jotId/reactions", authenticate, asyncHandler(toggleReaction));

/**
 * @route   GET /api/jots/:jotId/comments
 * @desc    Get comments for a jot
 * @access  Private
 */
router.get("/:jotId/comments", authenticate, asyncHandler(getJotComments));

/**
 * @route   POST /api/jots/:jotId/comments
 * @desc    Add a comment to a jot
 * @access  Private
 */
router.post("/:jotId/comments", authenticate, asyncHandler(addComment));

/**
 * @route   DELETE /api/jots/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
router.delete(
    "/comments/:commentId",
    authenticate,
    asyncHandler(deleteComment)
);

export default router;
