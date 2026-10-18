<template>
    <div class="grid w-full grid-cols-1 items-start gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <aside v-if="!$root.isMobile" class="min-w-0">
            <router-link to="/compose" class="button button-primary mb-3 w-full">
                <app-icon icon="plus" /> {{ $t("compose") }}
            </router-link>
            <StackList :scrollbar="true" />
        </aside>

        <section ref="container" class="min-w-0">
            <!-- Add :key to disable vue router re-use the same component -->
            <router-view :key="$route.fullPath" />
        </section>
    </div>
</template>

<script>

import StackList from "../components/StackList.vue";

export default {
    components: {
        StackList,
    },
};
</script>
