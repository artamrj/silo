/*
 * Shared request validators, built on zod. Every socket payload, the database
 * config and the startup configuration are described here so the server has a
 * single, typed source of truth for what it accepts. Schemas expose zod's
 * `parse()`/`safeParse()`; the server wraps them through `validate()` in
 * `src/server/utils/socket.ts` which turns failures into `ValidationError`.
 */

import { z } from "zod";

/**
 * Minimal schema contract used by the server's `validate()` helper. Keeps the
 * call sites decoupled from zod's full type surface.
 */
export type Schema<T> = z.ZodType<T>;

/** @deprecated prefer `Schema`, kept for backwards compatibility. */
export type Field<T> = Schema<T>;

/**
 * Compact, single-line description of a failed parse. zod's own `message` is a
 * multi-line JSON blob; clients render this directly so keep it short.
 * @param error Error produced by a failed parse
 * @returns Human readable message
 */
export function formatSchemaError(error : z.ZodError) : string {
    return error.issues
        .map((issue) => {
            const path = issue.path.join(".");
            return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ");
}

/** A trimmed, non-empty string capped at 255 characters. */
export const nonEmptyString = z.string().trim().min(1).max(255);

/**
 * Stack names are used as directory names, so they must not contain path
 * separators, spaces or traversal sequences.
 */
export const stackNameSchema = z.string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Invalid stack name");

/** Docker Compose service names follow the same character set as stack names. */
export const serviceNameSchema = z.string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Invalid service name");

/** Absolute or relative path to a shell binary, passed to `docker exec`. */
export const shellSchema = z.string().trim().min(1).max(255);

/** A JWT, base64url encoded, comfortably bounded by the header size limits. */
export const tokenSchema = z.string().min(1).max(4096);

/** Passwords are never trimmed: leading/trailing spaces are significant. */
export const passwordSchema = z.string().min(1).max(1024);

export const loginSchema = z.strictObject({
    username: nonEmptyString,
    password: passwordSchema,
    token: z.string().max(4096).optional(),
});

export const setupSchema = z.strictObject({
    username: nonEmptyString,
    password: passwordSchema,
});

export const changePasswordSchema = z.strictObject({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    repeatNewPassword: passwordSchema.optional(),
});

export const stackSaveSchema = z.strictObject({
    name: stackNameSchema,
    composeYAML: z.string().min(1).max(2_000_000),
    composeENV: z.string().max(1_000_000),
    isAdd: z.boolean(),
});

export const stackDeleteSchema = z.strictObject({
    name: stackNameSchema,
    deleteData: z.boolean().default(false),
    confirmation: z.string().max(255).optional(),
});

export const terminalInputSchema = z.strictObject({
    terminalName: nonEmptyString,
    command: z.string().max(64_000),
});

export const terminalResizeSchema = z.strictObject({
    terminalName: nonEmptyString,
    rows: z.number().int().min(1).max(500),
    columns: z.number().int().min(1).max(500),
});

export const interactiveTerminalSchema = z.strictObject({
    stackName: stackNameSchema,
    serviceName: serviceNameSchema,
    shell: shellSchema,
});

export const serviceActionSchema = z.strictObject({
    stackName: stackNameSchema,
    serviceName: serviceNameSchema,
});

/** Bounds the docker run command fed to `composerize` to avoid unbounded work. */
export const composerizeSchema = z.string().min(1).max(100_000);

/**
 * General settings written to the database. Known keys are typed; unknown keys
 * are stripped before persisting so the client cannot inject arbitrary rows.
 * Stripping (rather than rejecting) keeps saves working on installs that still
 * carry legacy keys.
 */
export const settingsSchema = z.object({
    disableAuth: z.boolean().optional(),
    primaryHostname: z.string().max(255).optional(),
    keepDataPeriodDays: z.number().int().min(0).optional(),
    trustProxy: z.boolean().optional(),
    globalENV: z.string().max(1_000_000).optional(),
});

export const dbConfigSchema = z.strictObject({
    type: z.literal("sqlite"),
});

/**
 * Startup configuration resolved from CLI arguments and environment variables.
 * Only the values that are actually supplied are validated; defaults are
 * applied before parsing.
 */
export const startupConfigSchema = z.object({
    sslKey: z.string().min(1).optional(),
    sslCert: z.string().min(1).optional(),
    sslKeyPassphrase: z.string().optional(),
    port: z.number().int().min(1).max(65_535),
    hostname: z.string().min(1).optional(),
    dataDir: z.string().min(1),
    stacksDir: z.string().min(1),
    enableConsole: z.boolean(),
});

export type StartupConfig = z.infer<typeof startupConfigSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type DbConfig = z.infer<typeof dbConfigSchema>;
