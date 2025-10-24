import multer from "multer";

/**
 * Configure Multer for file uploads
 * Using memory storage to store files in buffer
 */
const storage = multer.memoryStorage();

/**
 * File filter to validate file types
 */
const fileFilter = (
    _req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Accept images and videos only
    if (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/")
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed"));
    }
};

/**
 * Multer upload configuration
 */
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: fileFilter,
});

/**
 * Upload single file middleware
 */
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

/**
 * Upload multiple files middleware
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 5) =>
    upload.array(fieldName, maxCount);
