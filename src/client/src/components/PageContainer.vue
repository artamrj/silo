<template>
    <div :class="containerClass">
        <slot />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
    /** Let the page use the full content width (dashboards/forms stay centered). */
    wide?: boolean;
    /** Stretch to fill the remaining shell height (terminals, editors, settings). */
    fill?: boolean;
}>(), {
    wide: false,
    fill: false,
});

const containerClass = computed(() => [
    props.wide ? "w-full" : "mx-auto w-full max-w-6xl",
    props.fill ? "flex min-h-0 flex-1 flex-col" : "",
]);
</script>
