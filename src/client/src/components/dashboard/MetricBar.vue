<template>
    <div class="flex min-w-0 flex-col gap-1">
        <div class="flex items-baseline justify-between gap-2">
            <span class="truncate text-xs font-bold tracking-wider text-ink-muted uppercase">{{ label }}</span>
            <span v-if="value" class="shrink-0 font-mono text-sm font-semibold text-ink">{{ value }}</span>
        </div>

        <div
            class="h-1.5 w-full overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            :aria-label="label"
            :aria-valuenow="Math.round(clamped)"
            aria-valuemin="0"
            aria-valuemax="100"
        >
            <div class="h-full rounded-full transition-[width] duration-500 ease-out" :class="toneClass" :style="{ width: `${clamped}%` }" />
        </div>

        <p v-if="hint" class="truncate text-xs text-ink-muted">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
    /** Uppercase metric label. */
    label : string;
    /** Formatted value shown on the right. */
    value? : string;
    /** Fill percentage, clamped to 0..100 for display. */
    percent? : number;
    /** Accent color for the fill. */
    tone? : "primary" | "success" | "warning" | "danger" | "chart-1" | "chart-2" | "chart-3";
    /** Optional muted line under the bar. */
    hint? : string;
}>(), {
    value: "",
    percent: 0,
    tone: "primary",
    hint: "",
});

// Static class strings: Tailwind must see the full literal to generate them.
const TONES : Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    "chart-1": "bg-chart-1",
    "chart-2": "bg-chart-2",
    "chart-3": "bg-chart-3",
};

const clamped = computed(() => Math.max(0, Math.min(100, props.percent ?? 0)));
const toneClass = computed(() => TONES[props.tone] ?? TONES.primary);
</script>
