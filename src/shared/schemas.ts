import { z } from "zod";

export const nonEmptyString = z.string().trim().min(1).max(255);
export const stackNameSchema = nonEmptyString.regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, "Invalid stack name");

export const loginSchema = z.object({
    username: nonEmptyString,
    password: z.string().min(1).max(1024),
    token: z.string().max(128).optional(),
}).strict();

export const stackSaveSchema = z.object({
    name: stackNameSchema,
    composeYAML: z.string().min(1).max(2_000_000),
    composeENV: z.string().max(1_000_000),
    isAdd: z.boolean(),
});

export const stackDeleteSchema = z.object({
    name: stackNameSchema,
    deleteData: z.boolean().default(false),
    confirmation: z.string().optional(),
});

export const terminalInputSchema = z.object({
    terminalName: nonEmptyString,
    command: z.string().max(64_000),
});

export const terminalResizeSchema = z.object({
    terminalName: nonEmptyString,
    rows: z.number().int().min(1).max(500),
    columns: z.number().int().min(1).max(500),
});
