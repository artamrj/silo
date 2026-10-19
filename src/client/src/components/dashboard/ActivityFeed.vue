<template>
    <div class="flex h-full min-h-0 flex-col">
        <ul v-if="events.length" class="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
            <li
                v-for="(event, index) in events"
                :key="`${event.at}-${index}`"
                class="flex min-w-0 items-start gap-2 rounded-lg px-1.5 py-1"
            >
                <span class="mt-1.5 size-1.5 shrink-0 rounded-full" :class="statusDot(event.status)" />
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm text-ink">
                        <span class="font-medium">{{ event.stackName }}</span>
                        <span class="text-ink-muted"> · {{ $t(`op_${event.operation}`) }}</span>
                    </p>
                    <p class="truncate text-xs text-ink-muted">{{ event.message }}</p>
                </div>
                <span class="shrink-0 pt-0.5 text-xs whitespace-nowrap text-ink-muted">{{ relative(event.at) }}</span>
            </li>
        </ul>

        <p v-else class="m-auto text-sm text-ink-muted">{{ $t("activityEmpty") }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useSocket } from "../../composables/useSocket";

const { deploymentEvents } = useSocket();
const { t } = useI18n();

const events = computed(() => deploymentEvents.value.slice(0, 20));

// Static map so Tailwind emits each class.
const DOT : Record<string, string> = {
    completed: "bg-success",
    failed: "bg-danger",
    started: "bg-warning",
};

function statusDot(status : string) : string {
    return DOT[status] ?? "bg-ink-muted";
}

/**
 * Compact relative time for an ISO timestamp.
 * @param iso Timestamp from the server
 * @returns Localized "5m ago"-style label
 */
function relative(iso : string) : string {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) {
        return "";
    }
    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (seconds < 45) {
        return t("activityNow");
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return t("activityMinutesAgo", { count: minutes });
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return t("activityHoursAgo", { count: hours });
    }
    return t("activityDaysAgo", { count: Math.round(hours / 24) });
}
</script>
