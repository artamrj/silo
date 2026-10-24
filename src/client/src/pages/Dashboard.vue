<template>
    <div class="flex min-h-0 flex-1 flex-col" :class="contentClass">
        <!-- :key forces remounts so route-scoped state (e.g. Compose) resets. -->
        <router-view :key="$route.fullPath" />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const contentClass = computed(() => route.path === "/console" ? "min-h-0" : "px-4 py-6 md:px-8");
</script>
