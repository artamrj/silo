<template>
    <span class="pill" :class="[ colorClass, fixedWidth ? 'w-16 truncate' : 'min-w-16' ]">{{ statusName }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { statusColor, statusNameShort, UNKNOWN } from "../../../shared/utils";
import type { StackMeta } from "../composables/types";

const props = withDefaults(defineProps<{
    stack?: StackMeta | null;
    fixedWidth?: boolean;
}>(), {
    stack: null,
    fixedWidth: false,
});

const { t } = useI18n();

/**
 * Map the shared status colour name onto a utility class.
 * @returns Tailwind background/text classes
 */
const colorClass = computed(() => {
    switch (statusColor(props.stack?.status ?? UNKNOWN)) {
        case "primary":
            return "bg-primary-fill text-primary-foreground";
        case "danger":
            return "bg-danger-fill text-white";
        case "dark":
            return "bg-slate-700 text-white";
        default:
            return "bg-slate-500 text-white";
    }
});

const statusName = computed(() => t(statusNameShort(props.stack?.status ?? UNKNOWN)));
</script>
