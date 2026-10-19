import { describe, expect, it } from "vitest";
import {
    addItem,
    clampItem,
    compactVertical,
    findFreeSlot,
    gridBounds,
    moveItem,
    overlaps,
    removeItem,
    resizeItem,
    resolveCollisions,
    type GridItem,
} from "../../src/shared/bento";

/** Item factory so tests stay readable. */
function item(id : string, x : number, y : number, w = 1, h = 1) : GridItem {
    return { id,
        x,
        y,
        w,
        h };
}

/** No two items may share a cell — the invariant every operation must keep. */
function hasOverlap(items : GridItem[]) : boolean {
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (overlaps(items[i], items[j])) {
                return true;
            }
        }
    }
    return false;
}

describe("bento geometry", () => {
    it("detects overlapping and adjacent rectangles", () => {
        expect(overlaps(item("a", 0, 0, 2, 2), item("b", 1, 1, 2, 2))).toBe(true);
        // Touching edges do not overlap.
        expect(overlaps(item("a", 0, 0, 2, 2), item("b", 2, 0, 2, 2))).toBe(false);
        expect(overlaps(item("a", 0, 0, 2, 2), item("b", 0, 2, 2, 2))).toBe(false);
    });

    it("clamps width, position and minimums", () => {
        expect(clampItem(item("a", -3, -5, 99, 0), 12, 2, 2)).toMatchObject({ x: 0,
            y: 0,
            w: 12,
            h: 2 });

        // Pushed in from the right edge rather than clipped.
        expect(clampItem(item("a", 11, 0, 4, 3), 12).x).toBe(8);

        // Minimums win over a too-small item.
        expect(clampItem(item("a", 0, 0, 1, 1), 12, 3, 4)).toMatchObject({ w: 3,
            h: 4 });
    });

    it("does not mutate its input", () => {
        const source = item("a", -1, -1, 50, 1);
        const before = { ...source };

        clampItem(source, 12);
        expect(source).toEqual(before);
    });

    it("reports the bounding box", () => {
        const bounds = gridBounds([ item("a", 0, 0, 2, 3), item("b", 5, 4, 1, 2) ], 12);
        expect(bounds).toEqual({ columns: 12,
            rows: 6 });
    });
});

describe("bento compaction", () => {
    it("closes gaps without moving x", () => {
        const items = [ item("a", 0, 0, 4, 2), item("b", 0, 5, 4, 2) ];
        const compacted = compactVertical(items, 12);

        expect(compacted.find((entry) => entry.id === "b")).toMatchObject({ x: 0,
            y: 2 });
        expect(hasOverlap(compacted)).toBe(false);
    });

    it("keeps x stable so columns do not reshuffle", () => {
        const items = [ item("a", 6, 0, 6, 2), item("b", 0, 4, 3, 2) ];
        const compacted = compactVertical(items, 12);

        expect(compacted.every((entry) => entry.x === items.find((src) => src.id === entry.id)?.x)).toBe(true);
    });
});

describe("bento move and resize", () => {
    it("pins the moved item and pushes colliders down", () => {
        const items = [ item("a", 0, 0, 6, 2), item("b", 0, 2, 6, 2) ];
        const moved = moveItem(items, "a", 0, 2, 12);

        expect(moved.find((entry) => entry.id === "a")).toMatchObject({ x: 0,
            y: 2 });
        // The displaced item lands below the moved one, never on top of it.
        expect(moved.find((entry) => entry.id === "b")!.y).toBeGreaterThanOrEqual(4);
        expect(hasOverlap(moved)).toBe(false);
    });

    it("clamps a move past the right edge", () => {
        const moved = moveItem([ item("a", 10, 0, 2, 2) ], "a", 5, 0, 12);
        expect(moved[0]).toMatchObject({ x: 10,
            w: 2 });
    });

    it("honours resize minimums and the grid width", () => {
        const grown = resizeItem([ item("a", 8, 0, 4, 2) ], "a", 5, 5, 12, 2, 2);
        expect(grown[0].w).toBe(4); // cannot exceed columns - x
        expect(grown[0].h).toBe(7);

        const shrunk = resizeItem([ item("a", 0, 0, 4, 4) ], "a", -99, -99, 12, 3, 2);
        expect(shrunk[0]).toMatchObject({ w: 3,
            h: 2 });
    });

    it("never leaves overlaps after a resize", () => {
        const items = [ item("a", 0, 0, 4, 2), item("b", 4, 0, 4, 2) ];
        const resized = resizeItem(items, "a", 4, 0, 12);

        expect(hasOverlap(resized)).toBe(false);
    });

    it("is a no-op for an unknown id", () => {
        const items = [ item("a", 0, 0, 2, 2) ];
        expect(moveItem(items, "zzz", 1, 1, 12)).toBe(items);
        expect(resizeItem(items, "zzz", 1, 1, 12)).toBe(items);
        expect(removeItem(items, "zzz", 12)).toBe(items);
    });
});

describe("bento placement", () => {
    it("finds the first free slot in reading order", () => {
        const items = [ item("a", 0, 0, 6, 2) ];
        expect(findFreeSlot(items, 6, 2, 12)).toEqual({ x: 6,
            y: 0 });
    });

    it("falls back below the tallest item when the grid is full", () => {
        const items = [ item("a", 0, 0, 12, 3) ];
        expect(findFreeSlot(items, 12, 2, 12)).toEqual({ x: 0,
            y: 3 });
    });

    it("adds an item without overlapping", () => {
        const items = [ item("a", 0, 0, 6, 4) ];
        const added = addItem(items, item("b", 0, 0, 6, 4), 12);

        expect(added).toHaveLength(2);
        expect(hasOverlap(added)).toBe(false);
    });

    it("removes an item and closes the gap", () => {
        const items = [ item("a", 0, 0, 12, 2), item("b", 0, 2, 12, 2), item("c", 0, 4, 12, 2) ];
        const removed = removeItem(items, "b", 12);

        expect(removed.map((entry) => entry.id)).toEqual([ "a", "c" ]);
        expect(removed.find((entry) => entry.id === "c")!.y).toBe(2);
        expect(hasOverlap(removed)).toBe(false);
    });
});

describe("bento collision resolution", () => {
    it("settles a scrambled layout with no overlaps and no lost items", () => {
        const chaos = [
            item("a", 0, 0, 6, 4),
            item("b", 3, 1, 6, 4),
            item("c", 0, 2, 12, 3),
            item("d", 10, 0, 4, 2),
        ];
        const settled = resolveCollisions(chaos, "a", 12);

        expect(settled).toHaveLength(chaos.length);
        expect(hasOverlap(settled)).toBe(false);
        // The pinned item keeps its exact slot.
        expect(settled.find((entry) => entry.id === "a")).toMatchObject({ x: 0,
            y: 0,
            w: 6,
            h: 4 });
    });

    it("is deterministic for repeatedly shuffled input", () => {
        const chaos = [ item("a", 0, 0, 4, 2), item("b", 2, 1, 4, 2) ];
        const first = resolveCollisions(chaos, null, 12);

        for (let i = 0; i < 5; i++) {
            expect(resolveCollisions(chaos, null, 12)).toEqual(first);
        }
    });
});
