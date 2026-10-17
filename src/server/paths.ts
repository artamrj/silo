import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Locate the project root by walking up from this module until a
 * `package.json` is found. This keeps asset, migration and model paths
 * independent of the process working directory.
 */
function findProjectRoot() : string {
    let dir = moduleDir;
    for (let i = 0; i < 6; i++) {
        if (existsSync(resolve(dir, "package.json"))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return process.cwd();
}

export const projectRoot = findProjectRoot();

/** Directory that holds the compiled/transpiled server sources. */
const serverDir = resolve(projectRoot, "src/server");

export const paths = {
    projectRoot,
    clientDist: resolve(projectRoot, "dist/client"),
    clientIndexHTML: resolve(projectRoot, "dist/client/index.html"),
    migrationsDir: resolve(serverDir, "migrations"),
    modelsDir: resolve(serverDir, "models"),
};
