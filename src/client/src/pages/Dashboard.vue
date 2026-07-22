<template>
    <div class="dashboard-shell">
        <aside v-if="!$root.isMobile" class="dashboard-sidebar">
            <div>
                <router-link to="/compose" class="btn btn-primary mb-3"><app-icon icon="plus" /> {{ $t("compose") }}</router-link>
            </div>
            <StackList :scrollbar="true" />
        </aside>

        <section ref="container" class="dashboard-content">
            <!-- Add :key to disable vue router re-use the same component -->
            <router-view :key="$route.fullPath" :calculatedHeight="height" />
        </section>
    </div>
</template>

<script>

import StackList from "../components/StackList.vue";

export default {
    components: {
        StackList,
    },
    data() {
        return {
            height: 0
        };
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
};
</script>

<style scoped>
.dashboard-shell {
    width: 100%;
    padding: 24px clamp(16px, 2vw, 32px) 40px;
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    align-items: start;
    gap: 28px;
}

.dashboard-sidebar {
    min-width: 0;
}

.dashboard-content {
    min-width: 0;
}

@media (max-width: 900px) {
    .dashboard-shell {
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
        gap: 18px;
    }
}

:global(.mobile) .dashboard-shell {
    display: block;
    width: 100%;
    padding: 16px 12px 80px;
}
</style>
