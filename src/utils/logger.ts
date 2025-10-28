import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import winston from "winston";

/**
 * Logger utility for consistent logging across the application
 * Sends logs to console and BetterStack
 */

// Console format
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta, null, 2)}`
            : "";
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// Setup transports
const transports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat }),
];

// Add BetterStack only in production
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && process.env.LOGTAIL_SOURCE_TOKEN) {
    const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN, {
        endpoint: "https://s1567170.eu-nbg-2.betterstackdata.com",
    });
    transports.push(new LogtailTransport(logtail));
    console.log("[Logger] BetterStack logging enabled (production mode)");
} else if (!isProduction) {
    console.log(
        "[Logger] BetterStack disabled (development mode - logs only to console)"
    );
}

// Create winston logger
const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports,
    exitOnError: false,
});

export class Logger {
    static log(message: string, data?: any): void {
        winstonLogger.info(message, data);
    }

    static info(message: string, data?: any): void {
        winstonLogger.info(message, data);
    }

    static warn(message: string, data?: any): void {
        winstonLogger.warn(message, data);
    }

    static error(message: string, error?: any): void {
        if (error instanceof Error) {
            winstonLogger.error(message, {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            });
        } else {
            winstonLogger.error(message, error);
        }
    }

    static debug(message: string, data?: any): void {
        winstonLogger.debug(message, data);
    }
}

export default Logger;
