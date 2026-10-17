/*
 * Minimal, dependency-free port of @inventage/envsubst's variable replacement.
 *
 * Only the logic needed by the client and server is kept here. The upstream
 * package also ships a CLI (which pulls in globby/fast-glob/braces), but this
 * project never invokes it, so vendoring removes those transitive
 * dependencies and their advisories.
 *
 * Original: https://github.com/inventage/envsubst (MIT)
 */

export interface ReplaceVariablesResult {
    string: string;
    replacements: Array<{ from: string; to: string; count: number }>;
}

/**
 * Escape a string so it can be embedded literally in a RegExp.
 * @param string Raw string
 * @returns Escaped string
 */
function escapeStringRegexp(string : string) : string {
    return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

const toLowerKeys = (object : Record<string, unknown>) => {
    return Object.keys(object).reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key.toLowerCase()] = object[key];
        return accumulator;
    }, {});
};

/**
 * Regex pattern with an optional prefix.
 * @param prefix Optional variable prefix
 * @returns Regex source string
 */
const variableRegexPattern = (prefix = "") => {
    return `\\\${(${prefix ? escapeStringRegexp(prefix) : ""}\\w+)(:-([^}]*))?}`;
};

/**
 * Regex pattern that wraps the variable regex pattern with a window variable statement.
 * @param prefix Optional variable prefix
 * @returns Regex source string
 */
const windowVariableRegexPattern = (prefix = "") => {
    return `(window\\[['"]{1})?${variableRegexPattern(prefix)}(['"]{1}\\])?`;
};

/**
 * Replaces all variable placeholders in the given string with either variable
 * values found in the variables parameter OR with the given default in the
 * variable string.
 * @param string Input string
 * @param variables Replacement values
 * @param prefix Optional variable prefix
 * @param trimWindow Strip surrounding `window['...']` wrappers
 * @param ignoreCase Match variable names case-insensitively
 * @returns The replaced string and the list of applied replacements
 */
export function replaceVariablesSync(
    string : string,
    variables : Record<string, unknown> = {},
    prefix = "",
    trimWindow = false,
    ignoreCase = false,
) : ReplaceVariablesResult {
    const regex = new RegExp(trimWindow ? windowVariableRegexPattern(prefix) : variableRegexPattern(prefix), ignoreCase ? "gmi" : "gm");
    const matches = [ ...string.matchAll(regex) ];
    const lowercaseVariables = toLowerKeys(variables);

    let replaced = string;
    const replacements : Array<{ from: string; to: string; count: number }> = [];
    for (const match of matches) {
        if (trimWindow) {
            const [ original, windowStart, name, , fallback, windowEnd ] = match;

            // Bail if the match does not contain `^window[`
            if (!windowStart) {
                continue;
            }

            const valueStartQuote = windowStart.replace("window[", "");
            const valueEndQuote = windowEnd.replace("]", "");
            const withoutWindow = original.replace(windowStart, "").replace(windowEnd, "");

            let value : string | undefined;
            if (ignoreCase) {
                value = Object.hasOwnProperty.call(lowercaseVariables || {}, name.toLowerCase()) ? (lowercaseVariables[name.toLowerCase()] as string | undefined) : fallback;
            } else {
                value = Object.hasOwnProperty.call(variables || {}, name) ? (variables[name] as string | undefined) : fallback;
            }

            if (value !== undefined) {
                const quotedValue = `${valueStartQuote}${value}${valueEndQuote}`;
                const replacement = replacements.find(r => r.from === original && r.to === quotedValue);
                if (replacement) {
                    replacement.count = replacement.count + 1;
                } else {
                    replacements.push({ from: original,
                        to: quotedValue,
                        count: 1 });
                }

                replaced = replaced.split(original).join(withoutWindow.split(withoutWindow).join(quotedValue));
            }
        } else {
            const [ original, name, , fallback ] = match;

            let value : string | undefined;
            if (ignoreCase) {
                value = Object.hasOwnProperty.call(lowercaseVariables || {}, name.toLowerCase()) ? (lowercaseVariables[name.toLowerCase()] as string | undefined) : fallback;
            } else {
                value = Object.hasOwnProperty.call(variables || {}, name) ? (variables[name] as string | undefined) : fallback;
            }

            if (value !== undefined) {
                const replacement = replacements.find(r => r.from === original && r.to === value);
                if (replacement) {
                    replacement.count = replacement.count + 1;
                } else {
                    replacements.push({ from: original,
                        to: value,
                        count: 1 });
                }

                replaced = replaced.split(original).join(value);
            }
        }
    }

    return {
        string: replaced,
        replacements,
    };
}
