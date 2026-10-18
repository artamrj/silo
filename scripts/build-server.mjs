/*
 * Compile the TypeScript server (and the reset-password tool) into plain ESM
 * JavaScript under `dist/`.
 *
 * The source uses extensionless relative imports, which Node's native ESM
 * loader rejects. Bundling each entry point resolves those imports at build
 * time, so production runs `node dist/server/index.js` without `tsx`.
 *
 * `packages: external` keeps every dependency (and `node:` builtin) as a
 * runtime import, so the output runs against a pruned production
 * `node_modules` with no devDependencies.
 */
import { build } from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Entry point -> output file, both relative to the project root. */
const entries = {
    "src/server/index.ts": "dist/server/index.js",
    "scripts/reset-password.ts": "dist/scripts/reset-password.js",
};

const shared = {
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    packages: "external",
    sourcemap: true,
    logLevel: "warning",
};

await Promise.all(Object.entries(entries).map(([ entry, outfile ]) => build({
    ...shared,
    entryPoints: [ resolve(projectRoot, entry) ],
    outfile: resolve(projectRoot, outfile),
})));

console.log("Built server bundle to dist/server/index.js and dist/scripts/reset-password.js");
