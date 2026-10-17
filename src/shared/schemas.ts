/*
 * Lightweight request validators shared by the server. Replaces zod with a
 * minimal, dependency-free schema builder that covers the shapes used by the
 * socket API. Each schema exposes `parse(value)` which returns the validated
 * value or throws an `Error` with a human readable message.
 */

export interface Schema<T> {
    parse(value : unknown) : T;
}

type Field<T> = Schema<T>;

function fail(message : string) : never {
    throw new Error(message);
}

interface StringOptions {
    min? : number;
    max? : number;
    trim? : boolean;
    pattern? : RegExp;
    patternMessage? : string;
}

function stringSchema(options : StringOptions = {}) : Schema<string> {
    return {
        parse(value : unknown) : string {
            if (typeof value !== "string") {
                fail("Expected a string");
            }
            let result = options.trim ? value.trim() : value;
            if (options.min !== undefined && result.length < options.min) {
                fail(`String must contain at least ${options.min} character(s)`);
            }
            if (options.max !== undefined && result.length > options.max) {
                fail(`String must contain at most ${options.max} character(s)`);
            }
            if (options.pattern && !options.pattern.test(result)) {
                fail(options.patternMessage ?? "Invalid string");
            }
            return result;
        },
    };
}

function booleanSchema() : Schema<boolean> {
    return {
        parse(value : unknown) : boolean {
            if (typeof value !== "boolean") {
                fail("Expected a boolean");
            }
            return value;
        },
    };
}

function numberSchema(options : { int? : boolean; min? : number; max? : number } = {}) : Schema<number> {
    return {
        parse(value : unknown) : number {
            if (typeof value !== "number" || Number.isNaN(value)) {
                fail("Expected a number");
            }
            if (options.int && !Number.isInteger(value)) {
                fail("Expected an integer");
            }
            if (options.min !== undefined && value < options.min) {
                fail(`Number must be greater than or equal to ${options.min}`);
            }
            if (options.max !== undefined && value > options.max) {
                fail(`Number must be less than or equal to ${options.max}`);
            }
            return value;
        },
    };
}

function optionalSchema<T>(inner : Schema<T>) : Schema<T | undefined> {
    return {
        parse(value : unknown) : T | undefined {
            return value === undefined ? undefined : inner.parse(value);
        },
    };
}

function defaultSchema<T>(inner : Schema<T>, fallback : T) : Schema<T> {
    return {
        parse(value : unknown) : T {
            return value === undefined ? fallback : inner.parse(value);
        },
    };
}

type Shape = Record<string, Schema<unknown>>;

function objectSchema<S extends Shape>(shape : S, options : { strict? : boolean } = {}) : Schema<{ [K in keyof S] : ReturnType<S[K]["parse"]> }> {
    type Output = { [K in keyof S] : ReturnType<S[K]["parse"]> };
    return {
        parse(value : unknown) : Output {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
                fail("Expected an object");
            }
            const input = value as Record<string, unknown>;
            const output : Record<string, unknown> = {};

            if (options.strict) {
                for (const key of Object.keys(input)) {
                    if (!(key in shape)) {
                        fail(`Unrecognized key: "${key}"`);
                    }
                }
            }

            for (const key of Object.keys(shape)) {
                output[key] = shape[key].parse(input[key]);
            }
            return output as Output;
        },
    };
}

export const nonEmptyString = stringSchema({ trim: true,
    min: 1,
    max: 255 });
export const stackNameSchema = stringSchema({
    trim: true,
    min: 1,
    max: 255,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    patternMessage: "Invalid stack name",
});

export const loginSchema = objectSchema({
    username: nonEmptyString,
    password: stringSchema({ min: 1,
        max: 1024 }),
    token: optionalSchema(stringSchema({ max: 128 })),
}, { strict: true });

export const stackSaveSchema = objectSchema({
    name: stackNameSchema,
    composeYAML: stringSchema({ min: 1,
        max: 2_000_000 }),
    composeENV: stringSchema({ max: 1_000_000 }),
    isAdd: booleanSchema(),
});

export const stackDeleteSchema = objectSchema({
    name: stackNameSchema,
    deleteData: defaultSchema(booleanSchema(), false),
    confirmation: optionalSchema(stringSchema()),
});

export const terminalInputSchema = objectSchema({
    terminalName: nonEmptyString,
    command: stringSchema({ max: 64_000 }),
});

export const terminalResizeSchema = objectSchema({
    terminalName: nonEmptyString,
    rows: numberSchema({ int: true,
        min: 1,
        max: 500 }),
    columns: numberSchema({ int: true,
        min: 1,
        max: 500 }),
});

export type { Field };
