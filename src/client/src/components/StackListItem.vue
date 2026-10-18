<template>
    <router-link
        :to="url"
        class="flex min-h-13 w-full items-center gap-2 no-underline transition-colors hover:bg-subtle aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
        :class="{ 'opacity-50': !stack?.isManagedBySilo }"
    >
        <Uptime :stack="stack" :fixed-width="true" />
        <span class="min-w-0 truncate">{{ stackName }}</span>
    </router-link>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Uptime from "./Uptime.vue";
import type { StackMeta } from "../composables/types";

const props = withDefaults(defineProps<{
    /** Stack this represents */
    stack?: StackMeta | null;
}>(), {
    stack: null,
});

const url = computed(() => `/compose/${props.stack?.name}`);
const stackName = computed(() => props.stack?.name);
</script>
