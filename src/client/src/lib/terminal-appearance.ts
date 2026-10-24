import type { ITheme } from "@xterm/xterm";

export type TerminalAppearance = "default" | "mac";

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

/**
 * Return visual settings for an xterm surface without coupling appearance to
 * terminal transport or output handling.
 */
export function getTerminalAppearance(appearance : TerminalAppearance) : TerminalAppearanceOptions {
    return appearance === "mac" ? MAC_APPEARANCE : DEFAULT_APPEARANCE;
}
