<template>
    <div class="flex h-full min-h-0 flex-col gap-2">
        <template v-if="disk">
            <MetricBar
                :label="$t('Reclaimable')"
                :value="reclaimableValue"
                :percent="disk.reclaimablePercent"
                tone="warning"
                :hint="$t('reclaimableHint', { size: disk.reclaimable })"
            />

            <div class="mt-auto grid grid-cols-3 gap-2">
                <div class="flex min-w-0 flex-col rounded-xl bg-subtle px-2.5 py-1.5">
                    <span class="truncate text-xs text-ink-muted">{{ $t("images") }}</span>
                    <span class="font-mono text-sm font-semibold text-ink">{{ disk.totalCount }}</span>
                </div>
                <div class="flex min-w-0 flex-col rounded-xl bg-subtle px-2.5 py-1.5">
                    <span class="truncate text-xs text-ink-muted">{{ $t("active") }}</span>
                    <span class="font-mono text-sm font-semibold text-ink">{{ disk.active }}</span>
                </div>
                <div class="flex min-w-0 flex-col rounded-xl bg-subtle px-2.5 py-1.5">
                    <span class="truncate text-xs text-ink-muted">{{ $t("Total size") }}</span>
                    <span class="font-mono text-sm font-semibold text-ink">{{ disk.size }}</span>
                </div>
            </div>

            <button type="button" class="button button-outline button-sm w-full" @click="router.push('/images')">
                <app-icon icon="external-link" size="sm" />
                {{ $t("Images") }}
            </button>
        </template>

        <p v-else class="m-auto text-sm text-ink-muted">{{ $t("dockerUnavailable") }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import MetricBar from "./MetricBar.vue";
import { useDockerStats } from "../../composables/useDockerStats";

const { startPolling, disk } = useDockerStats();
const router = useRouter();

let stopPolling : (() => void) | undefined;

const reclaimableValue = computed(() => {
    const usage = disk.value;
    return usage && usage.reclaimablePercent > 0 ? `${usage.reclaimablePercent}%` : "";
});

onMounted(() => {
    stopPolling = startPolling(30_000);
});

onBeforeUnmount(() => {
    stopPolling?.();
});
</script>
