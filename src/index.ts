import cors from "cors";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

// Import routes
import authRoutes from "./routes/auth.routes";
import diaryRoutes from "./routes/diary.routes";
import diaryEntryRoutes from "./routes/diaryEntry.routes";
import emotionRoutes from "./routes/emotion.routes";
import jotRoutes from "./routes/jot.routes";
import storyRoutes from "./routes/story.routes";
import userRoutes from "./routes/user.routes";
// import notificationRoutes from "./routes/notification.routes";

// Import middlewares
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import Logger from "./utils/logger";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security: Helmet helps secure Express apps by setting HTTP headers
app.use(helmet());

// Security: Trust proxy (needed when behind reverse proxy like nginx)
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Security: Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/", (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: "SpotJott API Server",
        version: "2.0.0",
        status: "Running",
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jots", jotRoutes);
app.use("/api/diaries", diaryRoutes);
app.use("/api/diary-entries", diaryEntryRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/emotions", emotionRoutes);
// app.use("/api/notifications", notificationRoutes);

// 404 Handler - must be after all routes
app.use(notFoundHandler);

// Error Handler - must be last
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    Logger.log(`🚀 Server is running on http://localhost:${PORT}`);
    Logger.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    Logger.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
    Logger.error("Unhandled Promise Rejection:", err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
    Logger.error("Uncaught Exception:", err);
    process.exit(1);
});

export default app;
