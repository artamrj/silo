import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import express, { type Express } from "express";

/**
 * Compression encodings we are able to serve, in the order they are preferred.
 * The client build emits `.br` and `.gz` siblings next to each asset.
 */
const COMPRESSIONS = [
    { encodingName: "br",
        fileExtension: ".br" },
    { encodingName: "gzip",
        fileExtension: ".gz" },
] as const;

/**
 * Scan the static directory once at startup and record every file that has at
 * least one pre-compressed sibling, keyed by its URL path.
 * @param root Static assets directory
 * @returns Map of URL path to the compressions available for it
 */
function collectCompressedFiles(root : string) : Map<string, string[]> {
    const files = new Map<string, string[]>();

    function walk(directory : string) {
        if (!existsSync(directory)) {
            return;
        }
        for (const entry of readdirSync(directory)) {
            const fullPath = join(directory, entry);
            if (statSync(fullPath).isDirectory()) {
                walk(fullPath);
                continue;
            }
            for (const compression of COMPRESSIONS) {
                if (entry.endsWith(compression.fileExtension)) {
                    // "/assets/index-abc.js.br" -> "/assets/index-abc.js"
                    const urlPath = fullPath.slice(root.length).split("\\").join("/")
                        .slice(0, -compression.fileExtension.length);
                    const existing = files.get(urlPath);
                    if (existing) {
                        existing.push(compression.encodingName);
                    } else {
                        files.set(urlPath, [ compression.encodingName ]);
                    }
                    break;
                }
            }
        }
    }

    walk(root);
    return files;
}

/**
 * Pick the best encoding the client accepts from the ones available for a file.
 * @param acceptEncoding Value of the request's Accept-Encoding header
 * @param available Encodings available for the requested file
 * @returns The chosen encoding name, or null for identity
 */
function pickEncoding(acceptEncoding : string | undefined, available : string[]) : string | null {
    if (!acceptEncoding) {
        return null;
    }

    const accepted = acceptEncoding
        .split(",")
        .map((part) => {
            const [ name, ...params ] = part.trim().split(";");
            const qParam = params.find((p) => p.trim().startsWith("q="));
            const q = qParam ? parseFloat(qParam.trim().slice(2)) : 1;
            return { name: name.trim(),
                q: Number.isNaN(q) ? 1 : q };
        })
        .filter((entry) => entry.q > 0);

    // Never compress when the client explicitly rejects it.
    if (accepted.some((entry) => entry.name === "identity" && entry.q >= 1)) {
        return null;
    }

    for (const compression of COMPRESSIONS) {
        if (!available.includes(compression.encodingName)) {
            continue;
        }
        const match = accepted.find((entry) => entry.name === compression.encodingName || entry.name === "*");
        if (match) {
            return compression.encodingName;
        }
    }
    return null;
}

/**
 * Serve the built client bundle. Pre-compressed `.br`/`.gz` siblings produced
 * by the client build are used when the browser supports them. Replaces the
 * `express-static-gzip` dependency.
 * @param app Express application
 * @param root Directory containing the built client assets
 */
export function serveClientAssets(app : Express, root : string) {
    const compressedFiles = collectCompressedFiles(root);

    app.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            next();
            return;
        }

        let path = req.path;
        if (path.endsWith("/")) {
            path += "index.html";
        }

        const available = compressedFiles.get(path);
        if (!available) {
            next();
            return;
        }

        // Required so caches and proxies keep separate copies per encoding.
        res.setHeader("Vary", "Accept-Encoding");

        const encoding = pickEncoding(req.headers["accept-encoding"], available);
        if (!encoding) {
            next();
            return;
        }

        const extension = COMPRESSIONS.find((c) => c.encodingName === encoding)?.fileExtension ?? "";
        const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

        req.url = path + extension + search;
        res.setHeader("Content-Encoding", encoding);
        // Use the original (uncompressed) extension so the MIME type is correct.
        res.type(extname(path));

        next();
    });

    app.use("/", express.static(root));
}
