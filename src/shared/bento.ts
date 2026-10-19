/*
 * Pure geometry for the dashboard bento grid. Everything here is plain math on
 * integer grid units so it can be unit tested without Vue, a DOM or a browser:
 * the client's `useBentoGrid`/`BentoGrid.vue` translate pointer pixels into
 * `dx`/`dy` deltas and let these helpers decide the resulting placement.
 *
 * A grid item is a rectangle in grid units:
 *   x, y  top-left cell (0-based, y grows downward)
 *   w, h  size in columns/rows
 */

/** A rectangle placed on the grid. Consumers extend this with payload fields. */
export interface GridItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Columns/rows available to `compactVertical`/`findFreeSlot`. */
export interface GridBounds {
    columns: number;
    rows: number;
}

/** True when the two rectangles share at least one cell. */
export function overlaps(a : GridItem, b : GridItem) : boolean {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Keep an item inside the grid: width/height at least `minW`/`minH` and never
 * wider than the grid, position non-negative and pushed in from the right edge.
 * @param item Item to constrain
 * @param columns Number of columns available
 * @param minW Minimum width in columns
 * @param minH Minimum height in rows
 * @returns A new, constrained item (input is not mutated)
 */
export function clampItem<T extends GridItem>(item : T, columns : number, minW = 1, minH = 1) : T {
    const w = Math.max(minW, Math.min(item.w, columns));
    const h = Math.max(minH, item.h);
    const x = Math.max(0, Math.min(item.x, columns - w));
    const y = Math.max(0, item.y);
    return { ...item,
        x,
        y,
        w,
        h };
}

/** Bounding box of every item, in grid units. */
export function gridBounds(items : GridItem[], columns : number) : GridBounds {
    const rows = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    return { columns,
        rows };
}

/** First id in `items` that overlaps `item`, or undefined. */
function firstCollision(item : GridItem, items : GridItem[]) : GridItem | undefined {
    return items.find((other) => overlaps(item, other));
}

/**
 * Re-pack items upward: sort by reading order, then let each item rise as far
 * as it can without overlapping an already placed item. X is never changed, so
 * columns stay stable and only gaps close.
 * @param items Items to compact
 * @param columns Number of columns available
 * @returns New array in reading order
 */
export function compactVertical<T extends GridItem>(items : T[], columns : number) : T[] {
    const ordered = items
        .map((item) => clampItem(item, columns))
        .sort((a, b) => a.y - b.y || a.x - b.x);

    const placed : GridItem[] = [];
    for (const item of ordered) {
        // Start at the top and let gravity pull the item down onto the first
        // free row, so gaps left by removals actually close.
        const candidate : GridItem = { ...item,
            y: 0 };
        let guard = 0;
        while (guard++ < 512) {
            const hit = firstCollision(candidate, placed);
            if (!hit) {
                break;
            }
            candidate.y = hit.y + hit.h;
        }
        placed.push(candidate);
    }

    const byId = new Map(placed.map((item) => [ item.id, item ]));
    return items.map((item) => {
        const next = byId.get(item.id);
        return next ? { ...item,
            ...next } : item;
    });
}

/**
 * Settle a layout after a move/resize. The active item keeps its exact
 * placement; every other item is clamped and pushed down until it no longer
 * collides. Deterministic (top-down, left-right) so drags do not reorder the
 * rest of the grid on every pointer move.
 * @param items Full item list
 * @param activeId Item to pin in place, or null to only compact
 * @param columns Number of columns available
 * @returns New array, original order preserved
 */
export function resolveCollisions<T extends GridItem>(items : T[], activeId : string | null, columns : number) : T[] {
    const active = activeId ? items.find((item) => item.id === activeId) : undefined;
    const others = items
        .filter((item) => item.id !== activeId)
        .map((item) => clampItem(item, columns))
        .sort((a, b) => a.y - b.y || a.x - b.x);

    const settled : GridItem[] = active ? [ clampItem(active, columns) ] : [];
    for (const item of others) {
        const candidate : GridItem = { ...item };
        let guard = 0;
        while (guard++ < 512) {
            const hit = firstCollision(candidate, settled);
            if (!hit) {
                break;
            }
            candidate.y = hit.y + hit.h;
        }
        settled.push(candidate);
    }

    const byId = new Map(settled.map((item) => [ item.id, item ]));
    return items.map((item) => {
        const next = byId.get(item.id);
        return next ? { ...item,
            ...next } : item;
    });
}

/**
 * Move an item by a grid delta and settle the grid.
 * @param items Full item list
 * @param id Item to move
 * @param dx Column delta
 * @param dy Row delta
 * @param columns Number of columns available
 * @returns New item list
 */
export function moveItem<T extends GridItem>(items : T[], id : string, dx : number, dy : number, columns : number) : T[] {
    const target = items.find((item) => item.id === id);
    if (!target) {
        return items;
    }
    const moved = clampItem({ ...target,
        x: target.x + dx,
        y: target.y + dy }, columns);
    return resolveCollisions(items.map((item) => item.id === id ? moved : item), id, columns);
}

/**
 * Resize an item by a grid delta and settle the grid. Growth is limited to the
 * right/bottom edge so the tile's anchor does not jump under the cursor.
 * @param items Full item list
 * @param id Item to resize
 * @param dw Column delta
 * @param dh Row delta
 * @param columns Number of columns available
 * @param minW Minimum width in columns
 * @param minH Minimum height in rows
 * @returns New item list
 */
export function resizeItem<T extends GridItem>(
    items : T[], id : string, dw : number, dh : number, columns : number, minW = 1, minH = 1
) : T[] {
    const target = items.find((item) => item.id === id);
    if (!target) {
        return items;
    }
    const maxW = Math.max(minW, columns - target.x);
    const resized = {
        ...target,
        w: Math.max(minW, Math.min(target.w + dw, maxW)),
        h: Math.max(minH, target.h + dh),
    };
    return resolveCollisions(items.map((item) => item.id === id ? resized : item), id, columns);
}

/**
 * First free slot for a `w`x`h` tile: scan rows top-down, columns left-right,
 * and return the first position with no overlap. Falls back to below the
 * tallest item.
 * @param items Existing items
 * @param w Width to place
 * @param h Height to place
 * @param columns Number of columns available
 * @returns Free `{ x, y }` position
 */
export function findFreeSlot(items : GridItem[], w : number, h : number, columns : number) : { x : number; y : number } {
    const width = Math.min(w, columns);
    for (let y = 0; y < 1024; y++) {
        for (let x = 0; x + width <= columns; x++) {
            if (!firstCollision({ id: "",
                x,
                y,
                w: width,
                h }, items)) {
                return { x,
                    y };
            }
        }
    }
    return { x: 0,
        y: items.reduce((max, item) => Math.max(max, item.y + item.h), 0) };
}

/**
 * Append an item below the grid, clamped to `columns`.
 * @param items Existing items
 * @param item Item to add
 * @param columns Number of columns available
 * @returns New item list with `item` appended
 */
export function addItem<T extends GridItem>(items : T[], item : T, columns : number) : T[] {
    const clamped = clampItem(item, columns);
    const placed = { ...clamped,
        ...findFreeSlot(items, clamped.w, clamped.h, columns) };
    return resolveCollisions([ ...items, placed ], placed.id, columns);
}

/**
 * Drop an item and close the gap it leaves behind.
 * @param items Existing items
 * @param id Item to remove
 * @param columns Number of columns available
 * @returns New item list without `id`, compacted
 */
export function removeItem<T extends GridItem>(items : T[], id : string, columns = 12) : T[] {
    const remaining = items.filter((item) => item.id !== id);
    if (remaining.length === items.length) {
        return items;
    }
    return compactVertical(remaining, columns);
}
