import { describe, expect, it } from "vitest";
import {
    DEFAULT_DASHBOARD,
    GRID_COLUMNS,
    SAFE_SHORTCUT_URL,
    WIDGET_TYPES,
    cloneDashboard,
    createWidget,
    deriveLayout,
    mergeDashboard,
    sanitizeLayout,
    widgetMeta,
    type WidgetInstance,
} from "../../src/shared/dashboard";
import { overlaps } from "../../src/shared/bento";

/** Any overlap anywhere in a layout is a bug. */
function hasOverlap(items : WidgetInstance[]) : boolean {
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (overlaps(items[i], items[j])) {
                return true;
            }
        }
    }
    return false;
}

describe("widget catalog", () => {
    it("covers every widget type exactly once", () => {
        for (const type of WIDGET_TYPES) {
            expect(widgetMeta(type)?.type).toBe(type);
        }
    });

    it("has a title/description key and an icon for every entry", () => {
        for (const type of WIDGET_TYPES) {
            const meta = widgetMeta(type)!;
            expect(meta.titleKey).toBeTruthy();
            expect(meta.descriptionKey).toBeTruthy();
            expect(meta.icon).toBeTruthy();
            expect(meta.minW).toBeGreaterThan(0);
            expect(meta.minH).toBeGreaterThan(0);
            expect(meta.defaultW).toBeGreaterThanOrEqual(meta.minW);
            expect(meta.defaultH).toBeGreaterThanOrEqual(meta.minH);
        }
    });

    it("returns undefined for an unknown type", () => {
        expect(widgetMeta("nope" as never)).toBeUndefined();
    });
});

describe("default dashboard", () => {
    it("is overlap-free at every breakpoint", () => {
        for (const breakpoint of [ "lg", "md", "sm" ] as const) {
            expect(hasOverlap(DEFAULT_DASHBOARD.layout[breakpoint])).toBe(false);
        }
    });

    it("fits its breakpoint column count", () => {
        for (const breakpoint of [ "lg", "md", "sm" ] as const) {
            const columns = GRID_COLUMNS[breakpoint];
            for (const item of DEFAULT_DASHBOARD.layout[breakpoint]) {
                expect(item.x).toBeGreaterThanOrEqual(0);
                expect(item.x + item.w).toBeLessThanOrEqual(columns);
            }
        }
    });

    it("clones deeply enough that edits do not leak into the default", () => {
        const copy = cloneDashboard(DEFAULT_DASHBOARD);
        copy.layout.lg[0].x = 99;
        copy.layout.lg.push(createWidget("tools"));
        copy.shortcuts.push({ id: "x",
            name: "x",
            url: "https://x" });

        expect(DEFAULT_DASHBOARD.layout.lg[0].x).not.toBe(99);
        expect(DEFAULT_DASHBOARD.layout.lg).toHaveLength(6);
        expect(DEFAULT_DASHBOARD.shortcuts).toHaveLength(0);
    });
});

describe("deriveLayout", () => {
    it("stacks a wide layout into a single column without overlap", () => {
        const stacked = deriveLayout(DEFAULT_DASHBOARD.layout.lg, GRID_COLUMNS.sm);

        expect(hasOverlap(stacked)).toBe(false);
        expect(stacked.every((item) => item.x === 0)).toBe(true);
        expect(stacked.every((item) => item.w === 1)).toBe(true);

        // Rows are packed sequentially from the top.
        let expected = 0;
        for (const item of stacked) {
            expect(item.y).toBe(expected);
            expected += item.h;
        }
    });

    it("only clamps width when the target is at least lg", () => {
        const same = deriveLayout(DEFAULT_DASHBOARD.layout.lg, GRID_COLUMNS.lg);
        expect(same).toEqual(DEFAULT_DASHBOARD.layout.lg);
        expect(same[0]).not.toBe(DEFAULT_DASHBOARD.layout.lg[0]);
    });

    it("grows widgets that reflow taller when squeezed into one column", () => {
        const stacked = deriveLayout(DEFAULT_DASHBOARD.layout.lg, GRID_COLUMNS.sm);
        const vitals = stacked.find((item) => item.type === "vitals");
        const meta = widgetMeta("vitals");

        // The vitals strip drops from one row of four cards to two rows of two.
        expect(meta?.narrowH).toBeGreaterThan(meta?.defaultH ?? 0);
        expect(vitals?.h).toBe(meta?.narrowH);
        expect(hasOverlap(stacked)).toBe(false);
    });
});

describe("sanitizeLayout", () => {
    it("drops unknown types and non-objects", () => {
        const result = sanitizeLayout([
            { id: "ok",
                type: "disk",
                x: 0,
                y: 0,
                w: 4,
                h: 4 },
            { id: "bad",
                type: "monitor",
                x: 0,
                y: 0,
                w: 4,
                h: 4 },
            "nonsense",
            null,
        ], 12);

        expect(result.map((item) => item.type)).toEqual([ "disk" ]);
    });

    it("dedupes duplicate ids", () => {
        const result = sanitizeLayout([
            { id: "dup",
                type: "disk",
                x: 0,
                y: 0,
                w: 4,
                h: 4 },
            { id: "dup",
                type: "vitals",
                x: 0,
                y: 4,
                w: 12,
                h: 2 },
        ], 12);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("disk");
    });

    it("fills missing geometry from the catalog default", () => {
        const result = sanitizeLayout([{ id: "t",
            type: "tools" }], 12);
        const meta = widgetMeta("tools")!;

        expect(result[0]).toMatchObject({ w: meta.defaultW,
            h: meta.defaultH });
    });

    it("returns an empty array for non-array input", () => {
        expect(sanitizeLayout(undefined, 12)).toEqual([]);
        expect(sanitizeLayout({}, 12)).toEqual([]);
    });
});

describe("mergeDashboard", () => {
    it("falls back to the defaults for missing or empty breakpoints", () => {
        expect(mergeDashboard(undefined).layout.lg).toEqual(DEFAULT_DASHBOARD.layout.lg);
        expect(mergeDashboard({}).layout.lg).toEqual(DEFAULT_DASHBOARD.layout.lg);
        expect(mergeDashboard({ layout: { lg: [] } }).layout.lg).toEqual(DEFAULT_DASHBOARD.layout.lg);
    });

    it("does not re-add widgets the user removed", () => {
        // A board with only two widgets must stay at two widgets.
        const merged = mergeDashboard({
            layout: {
                lg: [
                    { id: "vitals",
                        type: "vitals",
                        x: 0,
                        y: 0,
                        w: 12,
                        h: 2 },
                    { id: "disk",
                        type: "disk",
                        x: 0,
                        y: 2,
                        w: 4,
                        h: 4 },
                ],
            },
        });

        expect(merged.layout.lg.map((item) => item.type)).toEqual([ "vitals", "disk" ]);
    });

    it("keeps stored shortcuts and drops unsafe ones", () => {
        const merged = mergeDashboard({
            shortcuts: [
                { id: "a",
                    name: "Portainer",
                    url: "https://portainer.lan",
                    icon: "container" },
                { id: "b",
                    name: "Evil",
                    url: "javascript:alert(1)" },
                { id: "c",
                    name: "",
                    url: "https://nope" },
                { id: "d",
                    name: "Relative",
                    url: "/stacks" },
            ],
        });

        expect(merged.shortcuts.map((shortcut) => shortcut.name)).toEqual([ "Portainer", "Relative" ]);
    });

    it("always returns every breakpoint", () => {
        const merged = mergeDashboard({ layout: { lg: [] } });
        expect(Object.keys(merged.layout).sort()).toEqual([ "lg", "md", "sm" ]);
    });

    it("never produces an overlapping layout from junk input", () => {
        const merged = mergeDashboard({
            layout: {
                lg: [
                    { id: "a",
                        type: "fleet",
                        x: 0,
                        y: 0,
                        w: 12,
                        h: 99 },
                    { id: "a",
                        type: "disk",
                        x: 0,
                        y: 0,
                        w: 12,
                        h: 99 },
                    { id: "b",
                        type: "fleet",
                        x: -5,
                        y: -5,
                        w: 500,
                        h: 500 },
                ],
            },
        });

        expect(hasOverlap(merged.layout.lg)).toBe(false);
    });
});

describe("createWidget", () => {
    it("uses the catalog default size and a unique id", () => {
        const first = createWidget("shortcuts");
        const second = createWidget("shortcuts");
        const meta = widgetMeta("shortcuts")!;

        expect(first).toMatchObject({ type: "shortcuts",
            w: meta.defaultW,
            h: meta.defaultH });
        expect(first.id).not.toBe(second.id);
    });
});

describe("SAFE_SHORTCUT_URL", () => {
    it("accepts http(s) and relative targets only", () => {
        expect(SAFE_SHORTCUT_URL.test("https://a.lan")).toBe(true);
        expect(SAFE_SHORTCUT_URL.test("http://a.lan")).toBe(true);
        expect(SAFE_SHORTCUT_URL.test("/stacks")).toBe(true);

        expect(SAFE_SHORTCUT_URL.test("javascript:alert(1)")).toBe(false);
        expect(SAFE_SHORTCUT_URL.test("data:text/html,x")).toBe(false);
        expect(SAFE_SHORTCUT_URL.test("ftp://a.lan")).toBe(false);
        expect(SAFE_SHORTCUT_URL.test("a.lan")).toBe(false);
    });
});
