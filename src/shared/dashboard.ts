/*
 * Dashboard model shared by the client and the server: widget instance shape,
 * the three responsive layouts, the shortcut list and the defaults. Kept free
 * of Vue so it can be validated/tested on either side. Grid geometry lives in
 * `src/shared/bento.ts`; this module only describes *what* is on the board.
 */

import { type GridItem, clampItem, compactVertical } from "./bento";

/** Every widget the dashboard can render. Keep in sync with the client registry. */
export const WIDGET_TYPES = [
    "vitals",
    "fleet",
    "shortcuts",
    "disk",
    "activity",
    "tools",
] as const;

export type WidgetType = typeof WIDGET_TYPES[number];

/** A placed widget: grid rectangle plus its renderer kind and optional config. */
export interface WidgetInstance extends GridItem {
    type : WidgetType;
    /** Per-widget options (reserved; e.g. a stack filter). */
    config? : Record<string, unknown>;
}

/** A user-defined app/service shortcut shown on the board. */
export interface Shortcut {
    id : string;
    name : string;
    url : string;
    /** Optional icon key understood by the client (`src/client/src/icon.ts`). */
    icon? : string;
    /** Optional group/heading this shortcut belongs to. */
    group? : string;
}

/** Layout for each breakpoint. `lg` is the source of truth; `md`/`sm` derived. */
export interface BreakpointLayout {
    lg : WidgetInstance[];
    md : WidgetInstance[];
    sm : WidgetInstance[];
}

/** The whole dashboard payload persisted under the `"dashboard"` setting. */
export interface DashboardConfig {
    layout : BreakpointLayout;
    shortcuts : Shortcut[];
}

/** Columns rendered at each breakpoint. */
export const GRID_COLUMNS = { lg: 12,
    md: 8,
    sm: 1 } as const;

export type Breakpoint = keyof typeof GRID_COLUMNS;

/** Breakpoints in descending size order. */
export const BREAKPOINTS : Breakpoint[] = [ "lg", "md", "sm" ];

/** Per-widget size constraints and default size, in grid units. */
export interface WidgetMeta {
    type : WidgetType;
    /** i18n key for the widget title. */
    titleKey : string;
    /** i18n key for the palette/description line. */
    descriptionKey : string;
    /** Icon key understood by the client. */
    icon : string;
    minW : number;
    minH : number;
    /** Extra height needed once the tile is squeezed into a single column. */
    narrowH? : number;
    defaultW : number;
    defaultH : number;
}

/** Catalog of available widgets. Order drives the default layout and palette. */
export const WIDGET_CATALOG : WidgetMeta[] = [
    {
        type: "vitals",
        titleKey: "widgetVitals",
        descriptionKey: "widgetVitalsDescription",
        icon: "gauge",
        minW: 4,
        minH: 2,
        narrowH: 3,
        defaultW: 12,
        defaultH: 2,
    },
    {
        type: "fleet",
        titleKey: "widgetFleet",
        descriptionKey: "widgetFleetDescription",
        icon: "container",
        minW: 3,
        minH: 4,
        defaultW: 7,
        defaultH: 5,
    },
    {
        type: "shortcuts",
        titleKey: "widgetShortcuts",
        descriptionKey: "widgetShortcutsDescription",
        icon: "layout-dashboard",
        minW: 3,
        minH: 4,
        defaultW: 5,
        defaultH: 5,
    },
    {
        type: "activity",
        titleKey: "widgetActivity",
        descriptionKey: "widgetActivityDescription",
        icon: "activity",
        minW: 4,
        minH: 3,
        defaultW: 8,
        defaultH: 4,
    },
    {
        type: "disk",
        titleKey: "widgetDisk",
        descriptionKey: "widgetDiskDescription",
        icon: "hard-drive",
        minW: 3,
        minH: 3,
        defaultW: 4,
        defaultH: 4,
    },
    {
        type: "tools",
        titleKey: "widgetTools",
        descriptionKey: "widgetToolsDescription",
        icon: "wrench",
        minW: 4,
        minH: 3,
        defaultW: 12,
        defaultH: 4,
    },
];

const CATALOG_BY_TYPE = new Map(WIDGET_CATALOG.map((meta) => [ meta.type, meta ]));

/** Widget metadata by type, or undefined for an unknown type. */
export function widgetMeta(type : WidgetType) : WidgetMeta | undefined {
    return CATALOG_BY_TYPE.get(type);
}

/** The source-of-truth large layout. `md`/`sm` are derived from this. */
const DEFAULT_LG : WidgetInstance[] = [
    { id: "vitals",
        type: "vitals",
        x: 0,
        y: 0,
        w: 12,
        h: 2 },
    { id: "fleet",
        type: "fleet",
        x: 0,
        y: 2,
        w: 7,
        h: 5 },
    { id: "shortcuts",
        type: "shortcuts",
        x: 7,
        y: 2,
        w: 5,
        h: 5 },
    { id: "activity",
        type: "activity",
        x: 0,
        y: 7,
        w: 8,
        h: 4 },
    { id: "disk",
        type: "disk",
        x: 8,
        y: 7,
        w: 4,
        h: 4 },
    { id: "tools",
        type: "tools",
        x: 0,
        y: 11,
        w: 12,
        h: 4 },
];

/**
 * Stack items into a single column for a narrower breakpoint, clamping width
 * and preserving reading order. Guarantees no overlap by construction.
 * @param items Items to stack
 * @param columns Target column count
 * @returns New stacked list
 */
export function deriveLayout(items : WidgetInstance[], columns : number) : WidgetInstance[] {
    if (columns >= GRID_COLUMNS.lg) {
        return items.map((item) => ({ ...item }));
    }
    let y = 0;
    return items.map((item) => {
        const w = Math.min(item.w, columns);
        const meta = widgetMeta(item.type);
        // Squeezed into a narrow stack, some widgets reflow taller (e.g. the
        // vitals strip drops from four cards in a row to two rows of two).
        const h = meta?.narrowH && columns < GRID_COLUMNS.md ? Math.max(item.h, meta.narrowH) : item.h;
        const placed = { ...item,
            x: 0,
            y,
            w,
            h };
        y += h;
        return placed;
    });
}

/** Frozen default dashboard, also used as the fallback when nothing is stored. */
export const DEFAULT_DASHBOARD : DashboardConfig = {
    layout: {
        lg: DEFAULT_LG.map((item) => ({ ...item })),
        md: deriveLayout(DEFAULT_LG, GRID_COLUMNS.md),
        sm: deriveLayout(DEFAULT_LG, GRID_COLUMNS.sm),
    },
    shortcuts: [],
};

/** Deep-ish copy of a dashboard config so callers never share the default refs. */
export function cloneDashboard(config : DashboardConfig) : DashboardConfig {
    return {
        layout: {
            lg: config.layout.lg.map((item) => ({ ...item })),
            md: config.layout.md.map((item) => ({ ...item })),
            sm: config.layout.sm.map((item) => ({ ...item })),
        },
        shortcuts: config.shortcuts.map((shortcut) => ({ ...shortcut })),
    };
}

function isWidgetType(value : unknown) : value is WidgetType {
    return typeof value === "string" && (WIDGET_TYPES as readonly string[]).includes(value);
}

/**
 * Coerce a stored/partial layout array into a valid, non-overlapping layout:
 * drop unknown widget types, dedupe ids, clamp to the column count and compact
 * gaps. Missing fields fall back to the widget default size.
 * @param input Untrusted items
 * @param columns Column count for this breakpoint
 * @returns Sanitized items, in reading order
 */
export function sanitizeLayout(input : unknown, columns : number) : WidgetInstance[] {
    if (!Array.isArray(input)) {
        return [];
    }

    const seen = new Set<string>();
    const items : WidgetInstance[] = [];
    for (const raw of input) {
        if (!raw || typeof raw !== "object") {
            continue;
        }
        const candidate = raw as Partial<WidgetInstance>;
        if (!isWidgetType(candidate.type)) {
            continue;
        }
        const id = typeof candidate.id === "string" && candidate.id ? candidate.id : candidate.type;
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);

        const meta = widgetMeta(candidate.type);
        const item : WidgetInstance = {
            id,
            type: candidate.type,
            x: Number.isFinite(candidate.x) ? Number(candidate.x) : 0,
            y: Number.isFinite(candidate.y) ? Number(candidate.y) : 0,
            w: Number.isFinite(candidate.w) ? Number(candidate.w) : (meta?.defaultW ?? 4),
            h: Number.isFinite(candidate.h) ? Number(candidate.h) : (meta?.defaultH ?? 4),
        };
        if (candidate.config && typeof candidate.config === "object") {
            item.config = candidate.config;
        }
        items.push(clampItem(item, columns, meta?.minW ?? 1, meta?.minH ?? 1));
    }

    return compactVertical(items, columns);
}

/** Shortcut URL schemes the client is allowed to link to. */
export const SAFE_SHORTCUT_URL = /^(https?:\/\/|\/)/i;

function sanitizeShortcut(raw : unknown) : Shortcut | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }
    const candidate = raw as Partial<Shortcut>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const url = typeof candidate.url === "string" ? candidate.url.trim() : "";
    // Only http(s)/relative targets: an href of `javascript:` would be an XSS
    // sink once the card is rendered as a link.
    if (!name || !SAFE_SHORTCUT_URL.test(url)) {
        return undefined;
    }
    return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `${name}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        url,
        ...(candidate.icon ? { icon: String(candidate.icon) } : {}),
        ...(candidate.group ? { group: String(candidate.group) } : {}),
    };
}

/**
 * Merge an untrusted stored config with the defaults. A missing/empty
 * breakpoint falls back to the default; an existing (possibly edited) one is
 * sanitized rather than replaced, so removed widgets stay removed.
 * @param input Value read from the settings store
 * @returns A complete, valid dashboard config
 */
export function mergeDashboard(input : unknown) : DashboardConfig {
    const source = (input && typeof input === "object" ? input : {}) as Partial<DashboardConfig>;

    const layout = {} as BreakpointLayout;
    for (const breakpoint of BREAKPOINTS) {
        const columns = GRID_COLUMNS[breakpoint];
        const stored = Array.isArray(source.layout?.[breakpoint]) ? source.layout[breakpoint] : [];
        const sanitized = sanitizeLayout(stored, columns);
        layout[breakpoint] = sanitized.length
            ? sanitized
            : DEFAULT_DASHBOARD.layout[breakpoint].map((item) => ({ ...item }));
    }

    const shortcuts : Shortcut[] = [];
    if (Array.isArray(source.shortcuts)) {
        for (const raw of source.shortcuts) {
            const shortcut = sanitizeShortcut(raw);
            if (shortcut) {
                shortcuts.push(shortcut);
            }
        }
    }

    return { layout,
        shortcuts };
}

/**
 * Build a new widget instance of `type` sized to its catalog default.
 * @param type Widget kind
 * @returns A widget instance without a final position
 */
export function createWidget(type : WidgetType) : WidgetInstance {
    const meta = widgetMeta(type);
    return {
        id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        x: 0,
        y: 0,
        w: meta?.defaultW ?? 4,
        h: meta?.defaultH ?? 4,
    };
}
