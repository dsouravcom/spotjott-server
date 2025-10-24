/**
 * Logger utility for consistent logging across the application
 */

export class Logger {
    private static formatMessage(
        level: string,
        message: string,
        data?: any
    ): string {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (data) {
            logMessage += ` ${JSON.stringify(data, null, 2)}`;
        }

        return logMessage;
    }

    static log(message: string, data?: any): void {
        console.log(this.formatMessage("INFO", message, data));
    }

    static info(message: string, data?: any): void {
        console.info(this.formatMessage("INFO", message, data));
    }

    static warn(message: string, data?: any): void {
        console.warn(this.formatMessage("WARN", message, data));
    }

    static error(message: string, error?: any): void {
        console.error(this.formatMessage("ERROR", message, error));

        if (error instanceof Error) {
            console.error("Stack trace:", error.stack);
        }
    }

    static debug(message: string, data?: any): void {
        if (process.env.NODE_ENV === "development") {
            console.debug(this.formatMessage("DEBUG", message, data));
        }
    }
}

export default Logger;
