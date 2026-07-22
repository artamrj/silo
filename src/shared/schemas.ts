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

export const stackMetadataSchema = z.object({
    name: stackNameSchema,
    tags: z.array(z.object({
        name: nonEmptyString,
        value: z.string().max(255).optional(),
    }).strict()).max(20),
    template: z.string().max(255).optional(),
});

export const selectedServiceUpdateSchema = z.object({
    name: stackNameSchema,
    services: z.array(nonEmptyString.regex(/^[a-zA-Z0-9_.-]+$/)).min(1).max(100),
});

export const maintenanceSettingsSchema = z.object({
    updateSchedule: z.string().max(255).optional(),
    maintenanceWindow: z.object({
        enabled: z.boolean(),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
    }).optional(),
    notifications: z.array(z.object({
        provider: z.enum([ "ntfy", "gotify", "telegram", "discord", "webhook" ]),
        url: z.string().max(2048).optional(),
        token: z.string().max(2048).optional(),
        chatId: z.string().max(255).optional(),
        enabled: z.boolean().optional(),
    }).strict()).max(10).optional(),
    backup: z.object({
        beforeUpdate: z.string().max(2048).optional(),
        afterUpdate: z.string().max(2048).optional(),
        beforeRestore: z.string().max(2048).optional(),
        afterRestore: z.string().max(2048).optional(),
    }).optional(),
}).strict();
