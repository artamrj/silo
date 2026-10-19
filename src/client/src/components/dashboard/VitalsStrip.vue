<template>
    <div class="flex h-full min-h-0 flex-col gap-1.5">
        <div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5 @md:grid-cols-4">
            <div class="flex min-w-0 flex-col justify-between rounded-xl bg-subtle px-3 py-1.5">
                <span class="truncate text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("containersRunning") }}</span>
                <span class="font-mono text-2xl leading-none font-bold text-ink">{{ containerCount }}</span>
            </div>

            <div class="flex min-w-0 flex-col justify-between rounded-xl bg-subtle px-3 py-1.5">
                <span class="truncate text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("dockerCpu") }}</span>
                <span class="font-mono text-2xl leading-none font-bold text-ink">{{ cpuLabel }}<span class="text-base">%</span></span>
            </div>

            <div class="flex min-w-0 flex-col justify-between rounded-xl bg-subtle px-3 py-1.5">
                <span class="truncate text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("dockerMemory") }}</span>
                <span class="font-mono text-2xl leading-none font-bold text-ink">{{ memoryLabel }}</span>
            </div>

            <button
                type="button"
                class="flex min-w-0 flex-col justify-between rounded-xl bg-subtle px-3 py-1.5 text-left transition-colors hover:bg-accent"
                @click="router.push('/images')"
            >
                <span class="truncate text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("imageStorage") }}</span>
                <span class="font-mono text-2xl leading-none font-bold text-ink">{{ diskLabel }}</span>
            </button>
        </div>

        <p v-if="error" class="truncate text-xs text-danger">{{ $t("dockerUnavailable") }}</p>
        <p v-else class="truncate text-xs text-ink-muted">{{ $t("hostVitalsHint") }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import { formatBytes } from "../../../../shared/docker";
import { useDockerStats } from "../../composables/useDockerStats";

const { startPolling, containerCount, cpuPercent, memoryLabel, disk, error } = useDockerStats();
const router = useRouter();

let stopPolling : (() => void) | undefined;

const cpuLabel = computed(() => cpuPercent.value.toFixed(1));

/** Total image size, or a dash while the inventory is still loading. */
const diskLabel = computed(() => {
    const usage = disk.value;
    return usage ? formatBytes(usage.sizeBytes) : "—";
});

onMounted(() => {
    stopPolling = startPolling();
});

onBeforeUnmount(() => {
    stopPolling?.();
});
</script>
