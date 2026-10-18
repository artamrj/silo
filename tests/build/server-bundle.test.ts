import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

let outDir : string;

/**
 * Run the same strategy `scripts/build-server.mjs` uses, but into a throwaway
 * directory so the test never depends on (or clobbers) `dist/`.
 */
async function bundle(entry : string, outfile : string) {
    const { build } = await import("esbuild");
    await build({
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node24",
        packages: "external",
        logLevel: "silent",
        entryPoints: [ resolve(projectRoot, entry) ],
        outfile: resolve(outDir, outfile),
    });
}

beforeAll(() => {
    outDir = mkdtempSync(join(tmpdir(), "silo-bundle-"));
});

afterAll(() => {
    rmSync(outDir, { recursive: true,
        force: true });
});

describe("production server bundle", () => {
    it("compiles the server and reset-password tool into standalone ESM", async () => {
        await bundle("src/server/index.ts", "server/index.js");
        await bundle("scripts/reset-password.ts", "scripts/reset-password.js");

        expect(existsSync(join(outDir, "server/index.js"))).toBe(true);
        expect(existsSync(join(outDir, "scripts/reset-password.js"))).toBe(true);
    });

    it("resolves every relative import so Node's ESM loader can run it", async () => {
        const output = readFileSync(join(outDir, "server/index.js"), "utf-8");

        // An extensionless relative specifier would fail at runtime with
        // ERR_MODULE_NOT_FOUND. Bundling must have inlined them all.
        const extensionless = [ ...output.matchAll(/from\s+"(\.[^"]*)"/g) ]
            .map((match) => match[1])
            .filter((specifier) => !specifier.endsWith(".js"));
        expect(extensionless).toEqual([]);
    });

    it("keeps dependencies external and preserves resolution-sensitive syntax", async () => {
        const output = readFileSync(join(outDir, "server/index.js"), "utf-8");

        // `packages: external` keeps the pruned production node_modules usable.
        expect(output).toContain("from \"express\"");
        expect(output).toContain("from \"node:sqlite\"");
        // `paths.ts` locates the project root from this, so it must survive.
        expect(output).toContain("import.meta.url");
        // `index.ts` relies on top-level await to start the server.
        expect(output).toContain("await server.serve()");
    });
});
