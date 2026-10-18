import { describe, expect, it } from "vitest";
import {
    DockerImageRow,
    DockerSystemDfRow,
    formatBytes,
    groupImages,
    normalizeImageRef,
    parseJsonLines,
    parsePruneReclaimed,
    parseReclaimablePercent,
    parseReclaimableSize,
    parseSizeToBytes,
    toDiskUsage,
} from "../../src/shared/docker";

/** Minimal `docker image ls --format json` row. */
function row(overrides : Partial<DockerImageRow>) : DockerImageRow {
    return {
        Containers: "0",
        CreatedAt: "2026-01-01 00:00:00 +0000 UTC",
        CreatedSince: "7 months ago",
        ID: "sha256:000000000000",
        Repository: "nginx",
        Size: "100MB",
        Tag: "latest",
        ...overrides,
    };
}

describe("docker image parsing", () => {
    it("parses decimal docker sizes", () => {
        expect(parseSizeToBytes("518B")).toBe(518);
        expect(parseSizeToBytes("679MB")).toBe(679 * 1000 ** 2);
        expect(parseSizeToBytes("25.69GB")).toBe(Math.round(25.69 * 1000 ** 3));
        expect(parseSizeToBytes("1kB")).toBe(1000);
    });

    it("returns 0 for sizes docker cannot format", () => {
        expect(parseSizeToBytes(undefined)).toBe(0);
        expect(parseSizeToBytes("")).toBe(0);
        expect(parseSizeToBytes("N/A")).toBe(0);
    });

    it("splits the reclaimable column into size and percent", () => {
        expect(parseReclaimableSize("23.63GB (91%)")).toBe("23.63GB");
        expect(parseReclaimablePercent("23.63GB (91%)")).toBe(91);
        expect(parseReclaimablePercent("680MB")).toBe(0);
    });

    it("parses newline-delimited json and skips noise", () => {
        const stdout = `${JSON.stringify({ ID: "a" })}\nWARNING: nonsense\n\n${JSON.stringify({ ID: "b" })}`;
        expect(parseJsonLines<{ ID: string }>(stdout).map(item => item.ID)).toEqual([ "a", "b" ]);
        expect(parseJsonLines(undefined)).toEqual([]);
    });

    it("reads the Images row of docker system df", () => {
        const rows : DockerSystemDfRow[] = [
            {
                Type: "Containers",
                TotalCount: "2",
                Active: "1",
                Size: "10MB",
                Reclaimable: "5MB (50%)",
            },
            {
                Type: "Images",
                TotalCount: "34",
                Active: "11",
                Size: "25.69GB",
                Reclaimable: "23.63GB (91%)",
            },
        ];
        const disk = toDiskUsage(rows);
        expect(disk?.totalCount).toBe(34);
        expect(disk?.active).toBe(11);
        expect(disk?.reclaimablePercent).toBe(91);
        expect(disk?.reclaimableBytes).toBe(parseSizeToBytes("23.63GB"));
        expect(toDiskUsage([])).toBeNull();
    });

    it("extracts the reclaimed space figure", () => {
        expect(parsePruneReclaimed("Deleted Images:\nTotal reclaimed space: 23.63GB")).toBe("23.63GB");
        expect(parsePruneReclaimed("Total reclaimed space: 0B")).toBe("");
        expect(parsePruneReclaimed("")).toBe("");
    });

    it("formats bytes like docker does", () => {
        expect(formatBytes(0)).toBe("0B");
        expect(formatBytes(518)).toBe("518B");
        expect(formatBytes(23.63 * 1000 ** 3)).toBe("23.63GB");
    });
});

describe("normalizeImageRef", () => {
    it("adds the implicit latest tag", () => {
        expect(normalizeImageRef("nginx")).toBe("nginx:latest");
        expect(normalizeImageRef("nginx:alpine")).toBe("nginx:alpine");
    });

    it("keeps a registry port and drops the digest", () => {
        expect(normalizeImageRef("localhost:5000/app")).toBe("localhost:5000/app:latest");
        expect(normalizeImageRef("nginx@sha256:abc")).toBe("nginx:latest");
        expect(normalizeImageRef("")).toBe("");
    });
});

describe("groupImages", () => {
    it("folds every tag of one image id into a single entry", () => {
        const images = groupImages([
            row({ ID: "sha256:aaa",
                Repository: "nginx",
                Tag: "latest" }),
            row({ ID: "sha256:aaa",
                Repository: "nginx",
                Tag: "alpine" }),
        ]);
        expect(images).toHaveLength(1);
        expect(images[0].tags).toEqual([ "nginx:alpine", "nginx:latest" ]);
        expect(images[0].shortId).toBe("aaa");
        expect(images[0].dangling).toBe(false);
    });

    it("marks an image dangling only when no tag is real", () => {
        const images = groupImages([
            row({ ID: "sha256:bbb",
                Repository: "<none>",
                Tag: "<none>" }),
            row({ ID: "sha256:ccc",
                Repository: "<none>",
                Tag: "<none>" }),
            row({ ID: "sha256:ccc",
                Repository: "redis",
                Tag: "7" }),
        ]);
        expect(images.find(image => image.shortId === "bbb")?.dangling).toBe(true);
        expect(images.find(image => image.shortId === "ccc")?.dangling).toBe(false);
        // Dangling images sort first.
        expect(images[0].shortId).toBe("bbb");
    });

    it("protects images a stopped stack still references", () => {
        const refs = new Set([ "nginx:latest" ]);
        const names = new Map([[ "nginx:latest", [ "web" ]]]);
        const images = groupImages([ row({ ID: "sha256:aaa" }) ], refs, names);
        expect(images[0].inUseByStack).toBe(true);
        expect(images[0].usedByStacks).toEqual([ "web" ]);
        expect(images[0].inUse).toBe(true);
    });

    it("treats an image used by a stopped container as in use", () => {
        const images = groupImages([ row({ Containers: "2" }) ]);
        expect(images[0].containers).toBe(2);
        expect(images[0].inUse).toBe(true);
        expect(images[0].inUseByStack).toBe(false);
    });

    it("leaves a plain unused image removable", () => {
        const images = groupImages([ row({ ID: "sha256:ddd",
            Repository: "alpine",
            Tag: "3.20" }) ]);
        expect(images[0].inUse).toBe(false);
        expect(images[0].dangling).toBe(false);
    });

    it("ignores rows without an id", () => {
        expect(groupImages([ row({ ID: "" }) ])).toEqual([]);
    });
});
