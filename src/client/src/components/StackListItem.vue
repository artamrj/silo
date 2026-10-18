<template>
    <router-link
        :to="url"
        class="flex min-h-13 w-full items-center gap-2 no-underline transition-colors hover:bg-subtle aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
        :class="{ 'opacity-50': !stack.isManagedBySilo }"
    >
        <Uptime :stack="stack" :fixed-width="true" />
        <span class="min-w-0 truncate">{{ stackName }}</span>
    </router-link>
</template>

<script>
import Uptime from "./Uptime.vue";

export default {
    components: {
        Uptime
    },
    props: {
        /** Stack this represents */
        stack: {
            type: Object,
            default: null,
        },
    },
    computed: {
        url() {
            return `/compose/${this.stack.name}`;
        },
        stackName() {
            return this.stack.name;
        }
    },
};
</script>
