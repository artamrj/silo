<template>
    <div class="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-8">
        <!-- :key forces remounts so route-scoped state (e.g. Compose) resets. -->
        <router-view :key="$route.fullPath" />
    </div>
</template>
