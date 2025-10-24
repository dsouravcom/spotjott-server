import { Router } from "express";
import {
    createEmotion,
    deleteEmotion,
    getAllEmotions,
    getEmotionHistory,
    trackEmotion,
    updateEmotion,
} from "../controllers/emotion.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";

const router = Router();

/**
 * @route   GET /api/emotions
 * @desc    Get all available emotions
 * @access  Private
 */
router.get("/", authenticate, asyncHandler(getAllEmotions));

/**
 * @route   POST /api/emotions
 * @desc    Create a new emotion (Admin)
 * @access  Private
 */
router.post("/", authenticate, asyncHandler(createEmotion));

/**
 * @route   PUT /api/emotions/:id
 * @desc    Update an emotion (Admin)
 * @access  Private
 */
router.put("/:id", authenticate, asyncHandler(updateEmotion));

/**
 * @route   DELETE /api/emotions/:id
 * @desc    Delete an emotion (Admin)
 * @access  Private
 */
router.delete("/:id", authenticate, asyncHandler(deleteEmotion));

/**
 * @route   POST /api/emotions/track
 * @desc    Track an emotion for a specific date
 * @access  Private
 */
router.post("/track", authenticate, asyncHandler(trackEmotion));

/**
 * @route   GET /api/emotions/history
 * @desc    Get emotion tracking history
 * @access  Private
 */
router.get("/history", authenticate, asyncHandler(getEmotionHistory));

export default router;
