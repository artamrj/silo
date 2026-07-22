import pino, { type Logger as PinoLogger } from "pino";
import { isDev } from "../shared/utils";

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
    private readonly logger: PinoLogger;
    private readonly hidden = new Set<string>();

    constructor() {
        for (const pair of (process.env.SILO_HIDE_LOG ?? "").split(",")) {
            if (pair) {
                this.hidden.add(pair.toLowerCase());
            }
        }

        this.logger = pino({
            level: process.env.SILO_LOG_LEVEL ?? (isDev ? "debug" : "info"),
            base: { service: "silo" },
            timestamp: pino.stdTimeFunctions.isoTime,
            redact: {
                paths: [ "password", "token", "authorization", "req.headers.authorization" ],
                censor: "[REDACTED]",
            },
        });
    }

    log(module: string, message: unknown, level: LogLevel) {
        if (this.hidden.has(`${level}_${module}`.toLowerCase())) {
            return;
        }
        const fields = { module: module.toLowerCase() };
        if (message instanceof Error) {
            this.logger[level]({ ...fields,
                err: message }, message.message);
        } else if (typeof message === "object" && message !== null) {
            this.logger[level]({ ...fields,
                data: message }, "structured event");
        } else {
            this.logger[level](fields, String(message));
        }
    }

    info(module: string, message: unknown) {
        this.log(module, message, "info");
    }

    warn(module: string, message: unknown) {
        this.log(module, message, "warn");
    }

    error(module: string, message: unknown) {
        this.log(module, message, "error");
    }

    debug(module: string, message: unknown) {
        this.log(module, message, "debug");
    }

    exception(module: string, exception: unknown, message?: unknown) {
        const error = exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error({ module: module.toLowerCase(),
            err: error }, message ? String(message) : error.message);
    }
}

export const log = new Logger();
