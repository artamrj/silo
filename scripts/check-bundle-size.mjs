/*
 * Fails the build when a compressed asset exceeds its budget.
 * Budgets are gzip sizes in kilobytes, checked per logical group.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = new URL("../dist/client/assets/", import.meta.url).pathname;

// Budgets: gzip KB. Groups map to a chunk-name prefix.
const budgets = {
    entry: 25,
    "vendor-vue": 80,
    "vendor-socket": 20,
};

const gzipSizeKB = (file) => statSync(file).size / 1024;

const files = readdirSync(assetsDir).filter((file) => file.endsWith(".gz"));

let failed = false;

for (const [ group, limitKB ] of Object.entries(budgets)) {
    const match = files.filter((file) => group === "entry"
        ? /^index-.*\.js\.gz$/.test(file)
        : file.startsWith(`${group}-`));
    const total = match.reduce((sum, file) => sum + gzipSizeKB(join(assetsDir, file)), 0);

    if (match.length === 0) {
        console.error(`[size-budget] ${group.padEnd(16)} no matching assets (did you run build:client?)`);
        failed = true;
        continue;
    }

    const status = total > limitKB ? "FAIL" : "ok";
    if (total > limitKB) {
        failed = true;
    }

    console.log(`[size-budget] ${group.padEnd(16)} ${total.toFixed(2)} KB gzip / ${limitKB} KB  ${status}`);
}

if (failed) {
    console.error("[size-budget] one or more budgets exceeded");
    process.exit(1);
}

console.log("[size-budget] all budgets ok");
