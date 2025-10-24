import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 *
 * Request Body:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john.doe@example.com",
 *   "password": "securePassword123",
 *   "bio": "Hello, I'm John!", // optional
 *   "tags": "travel,photography,food" // optional, comma-separated
 * }
 *
 * Form Data:
 * - profilePicture: File (optional, max 10MB, image only)
 *
 * Success Response (201):
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "user": {
 *     "id": 1,
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john.doe@example.com",
 *     "profilePicture": "https://cloudinary.com/...",
 *     "bio": "Hello, I'm John!",
 *     "userTags": ["travel", "photography", "food"],
 *     "followersCount": 0,
 *     "followingCount": 0,
 *     "createdAt": "2025-10-21T10:00:00.000Z",
 *     "updatedAt": "2025-10-21T10:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "User with this email already exists"
 * }
 */
router.post("/register", uploadSingle("profilePicture"), register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and receive JWT token
 * @access  Public
 *
 * Request Body:
 * {
 *   "email": "john.doe@example.com",
 *   "password": "securePassword123"
 * }
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "user": {
 *     "id": 1,
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john.doe@example.com",
 *     "profilePicture": "https://cloudinary.com/...",
 *     "bio": "Hello, I'm John!",
 *     "userTags": ["travel", "photography", "food"],
 *     "followersCount": 5,
 *     "followingCount": 10,
 *     "createdAt": "2025-10-21T10:00:00.000Z",
 *     "updatedAt": "2025-10-21T10:00:00.000Z"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * Error Response (400):
 * {
 *   "success": false,
 *   "error": "Invalid credentials"
 * }
 */
router.post("/login", login);

export default router;
