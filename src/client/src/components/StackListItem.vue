<template>
    <router-link :to="url" :class="{ 'dim' : !stack.isManagedBySilo }" class="item">
        <Uptime :stack="stack" :fixed-width="true" class="me-2" />
        <div class="title">
            <span>{{ stackName }}</span>
        </div>
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
    methods: {
    },
};
</script>

<style scoped>

.small-padding {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.collapse-padding {
    padding-left: 8px !important;
    padding-right: 2px !important;
}

.item {
    text-decoration: none;
    display: flex;
    align-items: center;
    min-height: 52px;
    border-radius: 10px;
    transition: all ease-in-out 0.15s;
    width: 100%;
    padding: 5px 8px;
    &.disabled {
        opacity: 0.3;
    }
    &:hover {
        background-color: var(--surface-muted);
    }
    &.active {
        background-color: var(--primary-soft);
        color: var(--primary);
    }
    .title {
        margin-top: -4px;
    }
}

.dim {
    opacity: 0.5;
}

</style>
