import { computed, ref } from "vue";
import { useSocket } from "./useSocket";
import { formatBytes, type DockerImageInventory } from "../../../shared/docker";
import type { DockerStatEntry } from "./types";
import type { SocketResult } from "../../../shared/socket-events";

/**
 * Parse the binary size docker reports in `MemUsage` (e.g. `25.5MiB`). Docker
 * uses IEC units here, unlike the decimal units of `docker system df`.
 * @param value A single side of a `x / y` docker size field
 * @returns Bytes, or 0 when unparseable
 */
export function parseDockerBytes(value : string) : number {
    const match = /([\d.]+)\s*([kmgt]?i?b)/i.exec(value.trim());
    if (!match) {
        return 0;
    }
    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) {
        return 0;
    }
    const unit = match[2].toLowerCase();
    const factor : Record<string, number> = {
        b: 1,
        kb: 1000,
        kib: 1024,
        mb: 1000 ** 2,
        mib: 1024 ** 2,
        gb: 1000 ** 3,
        gib: 1024 ** 3,
        tb: 1000 ** 4,
        tib: 1024 ** 4,
    };
    return amount * (factor[unit] ?? 0);
}

/** Parse a docker percentage field (`1.23%`) into a number. */
export function parseDockerPercent(value : string) : number {
    const amount = Number.parseFloat(value);
    return Number.isFinite(amount) ? amount : 0;
}

// Module-level shared state so every widget on the board reads one poller.
const stats = ref<Record<string, DockerStatEntry>>({});
const inventory = ref<DockerImageInventory | null>(null);
const lastUpdated = ref(0);
const loaded = ref(false);
const error = ref("");

let timer : ReturnType<typeof setInterval> | undefined;
let subscribers = 0;

/**
 * Live docker figures for the dashboard. `dockerStats` gives per-container CPU
 * and memory; the image inventory carries `docker system df` disk figures. One
 * shared poller serves every widget, so the board costs one round-trip per tick
 * regardless of how many panels read it.
 */
export function useDockerStats() {
    const { emitServer } = useSocket();

    /** Fetch stats and inventory once. */
    function refresh() : void {
        emitServer("dockerStats", (res : SocketResult & { dockerStats?: Record<string, DockerStatEntry> }) => {
            if (res.ok) {
                stats.value = res.dockerStats ?? {};
                error.value = "";
            } else {
                error.value = String(res.msg ?? "statsError");
            }
            loaded.value = true;
            lastUpdated.value = Date.now();
        });

        emitServer("getDockerImageList", (res : SocketResult & { imageInventory?: DockerImageInventory }) => {
            if (res.ok && res.imageInventory) {
                inventory.value = res.imageInventory;
            }
        });
    }

    /**
     * Start polling. Reference counted, so the first widget to mount starts the
     * timer and the last to unmount stops it.
     * @param intervalMs Poll interval
     * @returns Stop function for this subscriber
     */
    function startPolling(intervalMs = 10_000) : () => void {
        subscribers += 1;
        if (subscribers === 1) {
            refresh();
            timer = setInterval(refresh, intervalMs);
        }
        let stopped = false;
        return () => {
            if (stopped) {
                return;
            }
            stopped = true;
            subscribers -= 1;
            if (subscribers <= 0 && timer) {
                clearInterval(timer);
                timer = undefined;
            }
        };
    }

    /** Running containers, as reported by `docker stats`. */
    const containers = computed(() => Object.values(stats.value));

    const containerCount = computed(() => containers.value.length);

    /** Total CPU across running containers, in percent (may exceed 100 on multi-core). */
    const cpuPercent = computed(() =>
        containers.value.reduce((sum, entry) => sum + parseDockerPercent(entry.CPUPerc), 0)
    );

    /** Total memory used by running containers, in bytes. */
    const memoryBytes = computed(() =>
        containers.value.reduce((sum, entry) => sum + parseDockerBytes(entry.MemUsage.split("/")[0] ?? ""), 0)
    );

    const memoryLabel = computed(() => formatBytes(memoryBytes.value));

    /** Image disk usage from `docker system df`, when available. */
    const disk = computed(() => inventory.value?.disk ?? null);

    const imageCount = computed(() => inventory.value?.images.length ?? 0);

    return {
        // state
        stats,
        inventory,
        loaded,
        error,
        lastUpdated,
        // derived
        containers,
        containerCount,
        cpuPercent,
        memoryBytes,
        memoryLabel,
        disk,
        imageCount,
        // methods
        refresh,
        startPolling,
    };
}
