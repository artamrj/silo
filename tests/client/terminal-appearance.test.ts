import { describe, expect, it } from "vitest";
import { getTerminalAppearance } from "../../src/client/src/lib/terminal-appearance";

describe("terminal appearance", () => {
    it("uses mac terminal colors and a bar cursor for console", () => {
        const appearance = getTerminalAppearance("mac");

        expect(appearance.cursorStyle).toBe("bar");
        expect(appearance.cursorWidth).toBe(2);
        expect(appearance.theme.background).toBe("#171819");
        expect(appearance.theme.foreground).toBe("#E7E8EA");
        expect(appearance.theme.brightGreen).toBe("#5DD879");
    });

    it("keeps default terminals visually unconfigured", () => {
        const appearance = getTerminalAppearance("default");

        expect(appearance.cursorStyle).toBe("block");
        expect(appearance.cursorWidth).toBe(1);
        expect(appearance.theme).toEqual({});
    });
});
