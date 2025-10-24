import { Router } from "express";
import {
    createDiary,
    deleteDiary,
    getDiaryById,
    getPublicDiaries,
    getUserDiaries,
    updateDiary,
} from "../controllers/diary.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";

const router = Router();

/**
 * @route   POST /api/diaries
 * @desc    Create a new diary
 * @access  Private
 */
router.post("/", authenticate, asyncHandler(createDiary));

/**
 * @route   GET /api/diaries
 * @desc    Get all diaries for current user
 * @access  Private
 */
router.get("/", authenticate, asyncHandler(getUserDiaries));

/**
 * @route   GET /api/diaries/public
 * @desc    Get all public diaries
 * @access  Private
 */
router.get("/public", authenticate, asyncHandler(getPublicDiaries));

/**
 * @route   GET /api/diaries/:id
 * @desc    Get a specific diary
 * @access  Private
 */
router.get("/:id", authenticate, asyncHandler(getDiaryById));

/**
 * @route   PUT /api/diaries/:id
 * @desc    Update a diary
 * @access  Private
 */
router.put("/:id", authenticate, asyncHandler(updateDiary));

/**
 * @route   DELETE /api/diaries/:id
 * @desc    Delete a diary
 * @access  Private
 */
router.delete("/:id", authenticate, asyncHandler(deleteDiary));

export default router;
