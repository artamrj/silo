import type { ITheme } from "@xterm/xterm";

export type TerminalAppearance = "default" | "mac";
export type TerminalColorScheme = "light" | "dark";

export interface TerminalAppearanceOptions {
    theme : Readonly<ITheme>;
    cursorStyle : "block" | "bar" | "underline";
    cursorWidth : number;
}

const DEFAULT_APPEARANCE : TerminalAppearanceOptions = Object.freeze({
    theme: Object.freeze({}),
    cursorStyle: "block",
    cursorWidth: 1,
});

const MAC_APPEARANCE : TerminalAppearanceOptions = Object.freeze({
    theme: Object.freeze({
        background: "#171819",
        foreground: "#E7E8EA",
        cursor: "#E7E8EA",
        cursorAccent: "#171819",
        selectionBackground: "#5B5E637A",
        black: "#171819",
        red: "#FF7B72",
        green: "#5DD879",
        yellow: "#E3B341",
        blue: "#79C0FF",
        magenta: "#D2A8FF",
        cyan: "#76E3EA",
        white: "#E7E8EA",
        brightBlack: "#A5A7AB",
        brightRed: "#FF9B93",
        brightGreen: "#5DD879",
        brightYellow: "#F3CC72",
        brightBlue: "#A5D6FF",
        brightMagenta: "#E2C5FF",
        brightCyan: "#B2F0F3",
        brightWhite: "#FFFFFF",
    }),
    cursorStyle: "bar",
    cursorWidth: 2,
});

const MAC_LIGHT_APPEARANCE : TerminalAppearanceOptions = Object.freeze({
    theme: Object.freeze({
        background: "#FFFFFF",
        foreground: "#242526",
        cursor: "#242526",
        cursorAccent: "#FFFFFF",
        selectionBackground: "#B7C8E899",
        black: "#242526",
        red: "#B42318",
        green: "#16803C",
        yellow: "#9A6700",
        blue: "#175CD3",
        magenta: "#7A3E9D",
        cyan: "#087E8B",
        white: "#FFFFFF",
        brightBlack: "#667085",
        brightRed: "#D92D20",
        brightGreen: "#16803C",
        brightYellow: "#B54708",
        brightBlue: "#2E90FA",
        brightMagenta: "#9E77ED",
        brightCyan: "#06AED5",
        brightWhite: "#FFFFFF",
    }),
    cursorStyle: "bar",
    cursorWidth: 2,
});

/**
 * Return visual settings for an xterm surface without coupling appearance to
 * terminal transport or output handling.
 */
export function getTerminalAppearance(
    appearance : TerminalAppearance,
    colorScheme : TerminalColorScheme = "dark",
) : TerminalAppearanceOptions {
    if (appearance !== "mac") {
        return DEFAULT_APPEARANCE;
    }

    return colorScheme === "light" ? MAC_LIGHT_APPEARANCE : MAC_APPEARANCE;
}
