import { Router } from "express";
import {
    createDiaryEntry,
    deleteDiaryEntry,
    getDiaryEntries,
    updateDiaryEntry,
} from "../controllers/diaryEntry.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../middlewares/error.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

/**
 * @route   POST /api/diary-entries
 * @desc    Create a new diary entry
 * @access  Private
 */
router.post(
    "/",
    authenticate,
    upload.single("coverImage"),
    asyncHandler(createDiaryEntry)
);

/**
 * @route   GET /api/diary-entries/diary/:diaryId
 * @desc    Get all entries from a specific diary
 * @access  Private
 */
router.get("/diary/:diaryId", authenticate, asyncHandler(getDiaryEntries));

/**
 * @route   PUT /api/diary-entries/:id
 * @desc    Update a diary entry
 * @access  Private
 */
router.put("/:id", authenticate, asyncHandler(updateDiaryEntry));

/**
 * @route   DELETE /api/diary-entries/:id
 * @desc    Delete a diary entry
 * @access  Private
 */
router.delete("/:id", authenticate, asyncHandler(deleteDiaryEntry));

export default router;
