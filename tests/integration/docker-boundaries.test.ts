import { describe, expect, it } from "vitest";
import { stackNameSchema, stackSaveSchema, terminalInputSchema, terminalResizeSchema } from "../../src/shared/schemas";

describe("Docker operation boundaries", () => {
    it("accepts a bounded stack save request", () => {
        expect(stackSaveSchema.parse({
            name: "web-stack",
            composeYAML: "services:\n  web:\n    image: nginx",
            composeENV: "PORT=8080",
            isAdd: true,
        }).name).toBe("web-stack");
    });

    it.each([ "../escape", "/absolute", "bad name", "" ])("rejects unsafe stack name \"%s\"", (name) => {
        expect(() => stackNameSchema.parse(name)).toThrow();
    });

    it("bounds terminal input and dimensions", () => {
        expect(() => terminalInputSchema.parse({ terminalName: "console",
            command: "x".repeat(64_001) })).toThrow();
        expect(() => terminalResizeSchema.parse({ terminalName: "console",
            rows: 0,
            columns: 80 })).toThrow();
        expect(terminalResizeSchema.parse({ terminalName: "console",
            rows: 24,
            columns: 80 })).toMatchObject({ rows: 24,
            columns: 80 });
    });
});
