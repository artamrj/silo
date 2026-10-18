/*
 * Docker image inventory: shared types plus the pure parsing/grouping helpers
 * used by the server when it shells out to the docker CLI. Keeping the shape
 * here (rather than on the server) lets the client stay typed and lets the
 * logic be unit tested without a docker daemon.
 */

/** Raised tag/repository placeholder for an untagged image. */
export const DOCKER_NONE = "<none>";

/** One raw line from `docker image ls --format json --no-trunc`. */
export interface DockerImageRow {
    Containers: string;
    CreatedAt: string;
    CreatedSince: string;
    Digest?: string;
    ID: string;
    Repository: string;
    SharedSize?: string;
    Size: string;
    Tag: string;
    UniqueSize?: string;
    VirtualSize?: string;
}

/** A disk-usage row from `docker system df --format json`. */
export interface DockerSystemDfRow {
    Type: string;
    TotalCount: string;
    Active: string;
    Size: string;
    Reclaimable: string;
}

/**
 * A single image, grouped by image ID so every tag shares one entry. This is
 * what the Images page renders — one row per image, not one per tag.
 */
export interface DockerImage {
    /** Full content-addressable id, e.g. `sha256:abc…`. */
    id: string;
    /** First 12 hex characters, shown in the UI. */
    shortId: string;
    /** Every `repository:tag` pointing at this image, sorted. */
    tags: string[];
    createdAt: string;
    createdSince: string;
    /** Human readable size, e.g. `356MB`. */
    size: string;
    /** `size` parsed to bytes, for summing (approximate: shared layers repeat). */
    sizeBytes: number;
    /** Number of containers (running or stopped) using this image. */
    containers: number;
    /** Untagged image (no repository and no tag) — safe for the dangling prune. */
    dangling: boolean;
    /** Referenced by a Compose stack, running or stopped. */
    inUseByStack: boolean;
    /** Names of the stacks referencing this image. */
    usedByStacks: string[];
    /** Cannot be removed: used by a container or by a stack. */
    inUse: boolean;
}

/** Aggregated `docker system df` figures for the Images type. */
export interface DockerDiskUsage {
    totalCount: number;
    active: number;
    /** Human readable total size of all images. */
    size: string;
    sizeBytes: number;
    /** Human readable reclaimable size, e.g. `23.63GB (91%)`. */
    reclaimable: string;
    reclaimableBytes: number;
    /** Reclaimable percentage, 0 when unknown. */
    reclaimablePercent: number;
}

/** Full payload for the Images page. */
export interface DockerImageInventory {
    images: DockerImage[];
    disk: DockerDiskUsage | null;
}

const SIZE_UNITS : Record<string, number> = {
    B: 1,
    kB: 1000,
    MB: 1000 ** 2,
    GB: 1000 ** 3,
    TB: 1000 ** 4,
    PB: 1000 ** 5,
};

/**
 * Parse a docker human readable size (`518B`, `679MB`, `25.69GB`) into bytes.
 * Docker formats sizes with decimal units, so `MB` is 1000². Returns 0 for
 * anything unrecognised (`N/A`, empty).
 * @param size Size string emitted by the docker CLI
 * @returns Approximate size in bytes
 */
export function parseSizeToBytes(size : string | undefined) : number {
    if (!size) {
        return 0;
    }
    const match = size.trim().match(/^([\d.]+)\s*([kKMGT]?B)$/);
    if (!match) {
        return 0;
    }
    const value = Number.parseFloat(match[1]);
    const unit = match[2] === "B" ? "B" : match[2];
    const multiplier = SIZE_UNITS[unit] ?? 1;
    return Number.isFinite(value) ? Math.round(value * multiplier) : 0;
}

/**
 * Turn `680MB (91%)` (the `Reclaimable` column) into a percentage.
 * @param reclaimable Raw reclaimable string
 * @returns Percentage between 0 and 100, or 0 when absent
 */
export function parseReclaimablePercent(reclaimable : string | undefined) : number {
    if (!reclaimable) {
        return 0;
    }
    const match = reclaimable.match(/\((\d+(?:\.\d+)?)%\)/);
    return match ? Number.parseFloat(match[1]) : 0;
}

/**
 * Strip the size suffix from `680MB (91%)`, leaving the human size.
 * @param reclaimable Raw reclaimable string
 * @returns The size portion, e.g. `680MB`
 */
export function parseReclaimableSize(reclaimable : string | undefined) : string {
    if (!reclaimable) {
        return "";
    }
    return reclaimable.replace(/\s*\(.*\)\s*$/, "").trim();
}

/**
 * Normalise a Compose `image:` reference so it can be compared against the
 * `repository:tag` strings docker reports. A bare repository (`nginx`) implies
 * `:latest`; a digest pin (`nginx@sha256:…`) is reduced to its tagged part.
 * @param ref Image reference written in a compose file
 * @returns Comparable `repository[:tag]` reference
 */
export function normalizeImageRef(ref : string) : string {
    let value = (ref ?? "").trim();
    if (!value) {
        return "";
    }
    // Drop a digest pin, docker image ls reports the tag separately.
    const at = value.indexOf("@");
    if (at !== -1) {
        value = value.slice(0, at);
    }
    const lastSegment = value.slice(value.lastIndexOf("/") + 1);
    // Add the implicit `:latest` when no tag is present.
    if (!lastSegment.includes(":")) {
        value = `${value}:latest`;
    }
    return value;
}

/**
 * Group raw `docker image ls` output by image ID, folding every tag into a
 * single entry and tagging the ones referenced by a Compose stack.
 * @param rows Parsed output lines
 * @param stackImageRefs Set of normalised image references used by any stack
 * @param stackNamesByRef Map from normalised reference to the stacks using it
 * @returns One entry per image, dangling first then alphabetical by repository
 */
export function groupImages(
    rows : DockerImageRow[],
    stackImageRefs : Set<string> = new Set(),
    stackNamesByRef : Map<string, string[]> = new Map()
) : DockerImage[] {
    const byId = new Map<string, DockerImage>();

    for (const row of rows) {
        const id = row.ID?.trim();
        if (!id) {
            continue;
        }

        const repository = row.Repository?.trim() ?? "";
        const tag = row.Tag?.trim() ?? "";
        const dangling = (repository === "" || repository === DOCKER_NONE)
            && (tag === "" || tag === DOCKER_NONE);
        const ref = dangling ? "" : `${repository}:${tag}`;

        let image = byId.get(id);
        if (!image) {
            image = {
                id,
                shortId: id.replace(/^sha256:/, "").slice(0, 12),
                tags: [],
                createdAt: row.CreatedAt ?? "",
                createdSince: row.CreatedSince ?? "",
                size: row.Size ?? "",
                sizeBytes: parseSizeToBytes(row.Size),
                containers: Number.parseInt(row.Containers ?? "0", 10) || 0,
                dangling,
                inUseByStack: false,
                usedByStacks: [],
                inUse: false,
            };
            byId.set(id, image);
        }

        // An image is only dangling when *none* of its tags are real.
        if (!dangling) {
            image.dangling = false;
            if (ref && !image.tags.includes(ref)) {
                image.tags.push(ref);
            }
        }
    }

    for (const image of byId.values()) {
        const stacks = new Set<string>();
        for (const ref of image.tags) {
            if (stackImageRefs.has(ref)) {
                for (const name of stackNamesByRef.get(ref) ?? []) {
                    stacks.add(name);
                }
            }
        }
        // Also allow matching a stack that pinned the image by ID.
        if (stackImageRefs.has(image.id) && stackNamesByRef.has(image.id)) {
            for (const name of stackNamesByRef.get(image.id) ?? []) {
                stacks.add(name);
            }
        }
        image.usedByStacks = [ ...stacks ].sort();
        image.inUseByStack = image.usedByStacks.length > 0;
        image.inUse = image.containers > 0 || image.inUseByStack;
        image.tags.sort();
    }

    return [ ...byId.values() ].sort((a, b) => {
        if (a.dangling !== b.dangling) {
            return a.dangling ? -1 : 1;
        }
        const nameA = a.tags[0] ?? a.shortId;
        const nameB = b.tags[0] ?? b.shortId;
        return nameA.localeCompare(nameB);
    });
}

/**
 * Parse the newline-delimited `--format json` output of the docker CLI.
 * Malformed lines are skipped rather than failing the whole request.
 * @param stdout Raw command output
 * @returns Parsed rows
 */
export function parseJsonLines<T>(stdout : string | undefined) : T[] {
    if (!stdout) {
        return [];
    }
    const rows : T[] = [];
    for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }
        try {
            rows.push(JSON.parse(trimmed) as T);
        } catch {
            // Ignore lines the CLI emitted that are not JSON (e.g. warnings).
        }
    }
    return rows;
}

/**
 * Extract the Images row of `docker system df` for the page header.
 * @param rows Parsed `docker system df --format json` rows
 * @returns Disk usage, or null when the Images row is missing
 */
export function toDiskUsage(rows : DockerSystemDfRow[]) : DockerDiskUsage | null {
    const row = rows.find(item => item.Type === "Images");
    if (!row) {
        return null;
    }
    const reclaimableSize = parseReclaimableSize(row.Reclaimable);
    return {
        totalCount: Number.parseInt(row.TotalCount ?? "0", 10) || 0,
        active: Number.parseInt(row.Active ?? "0", 10) || 0,
        size: row.Size ?? "",
        sizeBytes: parseSizeToBytes(row.Size),
        reclaimable: row.Reclaimable ?? "",
        reclaimableBytes: parseSizeToBytes(reclaimableSize),
        reclaimablePercent: parseReclaimablePercent(row.Reclaimable),
    };
}

/**
 * Pull the reclaimed-space figure out of `docker image prune` output.
 * @param stdout Command output, e.g. `Total reclaimed space: 23.63GB`
 * @returns Reclaimed size string, empty when nothing was reclaimed
 */
export function parsePruneReclaimed(stdout : string | undefined) : string {
    if (!stdout) {
        return "";
    }
    const match = stdout.match(/Total reclaimed space:\s*(.+)/i);
    if (!match) {
        return "";
    }
    const value = match[1].trim();
    return /^0\s*B$/i.test(value) ? "" : value;
}

/**
 * Human readable byte size, mirroring docker's decimal formatting.
 * @param bytes Size in bytes
 * @returns Display string such as `23.63GB`
 */
export function formatBytes(bytes : number) : string {
    if (!bytes || bytes <= 0) {
        return "0B";
    }
    let value = bytes;
    let unit = "B";
    for (const candidate of [ "TB", "GB", "MB", "kB" ]) {
        if (bytes >= SIZE_UNITS[candidate]) {
            value = bytes / SIZE_UNITS[candidate];
            unit = candidate;
            break;
        }
    }
    if (unit === "B") {
        return `${Math.round(value)}B`;
    }
    const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
    return `${rounded}${unit}`;
}
