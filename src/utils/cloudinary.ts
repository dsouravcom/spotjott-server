import { v2 as cloudinary } from "cloudinary";
import { MulterFile, UploadResult } from "../types";
import Logger from "./logger";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadOptions {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    fetch_format?: string;
}

/**
 * Upload an image to Cloudinary
 * @param file - Multer file object
 * @param folder - Folder name in Cloudinary
 * @param options - Transformation options
 * @returns Upload result with URL and public ID
 */
export async function uploadImage(
    file: MulterFile,
    folder: string,
    options: UploadOptions = {}
): Promise<UploadResult> {
    try {
        if (!file || !file.buffer) {
            return {
                success: false,
                error: "No file provided",
            };
        }

        // Convert buffer to base64
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;

        // Build transformation array
        const transformation: any = {
            folder,
            resource_type: "auto",
        };

        if (options.width) transformation.width = options.width;
        if (options.height) transformation.height = options.height;
        if (options.crop) transformation.crop = options.crop;
        if (options.quality) transformation.quality = options.quality;
        if (options.fetch_format)
            transformation.fetch_format = options.fetch_format;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(
            dataURI,
            transformation
        );

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        Logger.error("Cloudinary upload error:", error);
        return {
            success: false,
            error: "Failed to upload image",
        };
    }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Success status
 */
export async function deleteImage(publicId: string): Promise<boolean> {
    try {
        if (!publicId) {
            return false;
        }

        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        Logger.error("Cloudinary delete error:", error);
        return false;
    }
}

export default { uploadImage, deleteImage };
