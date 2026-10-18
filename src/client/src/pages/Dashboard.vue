<template>
    <div class="px-4 py-6 md:px-6">
        <!-- Add :key to disable vue router re-use the same component -->
        <router-view :key="$route.fullPath" />
    </div>
</template>

<script>
export default {
};
</script>
