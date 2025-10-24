import { Router } from "express";
import {
    createStory,
    deleteStory,
    getActiveStories,
    getStoryViews,
    viewStory,
} from "../controllers/story.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

/**
 * @route   POST /api/stories
 * @desc    Create a new 24-hour story
 * @access  Private
 */
router.post(
    "/",
    authenticate,
    upload.single("media"),
    asyncHandler(createStory)
);

/**
 * @route   GET /api/stories
 * @desc    Get all active stories from users you follow
 * @access  Private
 */
router.get("/", authenticate, asyncHandler(getActiveStories));

/**
 * @route   POST /api/stories/:id/view
 * @desc    Mark a story as viewed
 * @access  Private
 */
router.post("/:id/view", authenticate, asyncHandler(viewStory));

/**
 * @route   GET /api/stories/:id/views
 * @desc    Get list of users who viewed the story
 * @access  Private
 */
router.get("/:id/views", authenticate, asyncHandler(getStoryViews));

/**
 * @route   DELETE /api/stories/:id
 * @desc    Delete a story
 * @access  Private
 */
router.delete("/:id", authenticate, asyncHandler(deleteStory));

export default router;
