import { User } from "@prisma/client";
import { Request } from "express";

// Multer file type
export interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

// ==================== Auth Types ====================

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
    };
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    bio?: string;
    tags?: string;
    profilePicture?: MulterFile;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    user: Omit<User, "password">;
    token: string;
}

// ==================== User Types ====================

export interface PublicUserProfile {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profilePicture: string | null;
    bio: string | null;
    followersCount: number;
    followingCount: number;
    createdAt: Date;
    isFollowing?: boolean;
    jotsCount?: number;
    openDiariesCount?: number;
}

export interface UpdateUserRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    bio?: string;
    userTags?: string[];
}

// ==================== Jot Types ====================

export interface CreateJotRequest {
    content: string;
    media?: MulterFile;
}

export interface JotWithUser {
    id: number;
    userId: number;
    content: string;
    mediaUrl: string | null;
    mediaPublicId: string | null;
    mediaType: "image" | "video" | null;
    reactionsCount: number;
    commentsCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        firstName: string;
        lastName: string;
        profilePicture: string | null;
    };
    userReaction?: {
        id: number;
        userId: number;
        reactionType: string;
    };
}

export interface ReactionRequest {
    reactionType?: "like" | "love" | "insightful" | "celebrate";
}

export interface CommentRequest {
    content: string;
}

// ==================== Diary Types ====================

export interface CreateDiaryRequest {
    name: string;
    description?: string;
    isPublic?: boolean;
}

export interface UpdateDiaryRequest {
    name?: string;
    description?: string;
    isPublic?: boolean;
}

export interface CreateDiaryEntryRequest {
    title: string;
    content: string;
    diaryId: number;
    tags?: string[];
    coverImage?: MulterFile;
}

export interface UpdateDiaryEntryRequest {
    title?: string;
    content?: string;
    tags?: string[];
    favorite?: boolean;
}

// ==================== Story Types ====================

export interface CreateStoryRequest {
    caption?: string;
    media: MulterFile;
}

// ==================== Emotion Types ====================

export interface TrackEmotionRequest {
    emotionId: number;
    date?: Date;
}

// ==================== Notification Types ====================

export interface CreateNotificationData {
    userId: number;
    senderId?: number;
    type:
        | "jot_reaction"
        | "jot_comment"
        | "entry_reaction"
        | "entry_comment"
        | "follow"
        | "mention"
        | "system";
    title: string;
    body: string;
    data?: any;
    imageUrl?: string;
    link?: string;
}

export interface RegisterFCMTokenRequest {
    token: string;
    deviceType?: "web" | "android" | "ios";
    deviceId?: string;
}

// ==================== Pagination Types ====================

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    hasMore: boolean;
    page: number;
    limit: number;
}

// ==================== Upload Result Types ====================

export interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface ErrorResponse {
    error: string;
    message?: string;
    details?: any;
}
