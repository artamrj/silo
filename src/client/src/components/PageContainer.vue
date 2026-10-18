<template>
    <div :class="containerClass">
        <slot />
    </div>
</template>

<script>
export default {
    props: {
        /** Let the page use the full content width (dashboards/forms stay centered). */
        wide: {
            type: Boolean,
            default: false,
        },
        /** Stretch to fill the remaining shell height (terminals, editors, settings). */
        fill: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        containerClass() {
            return [
                this.wide ? "w-full" : "mx-auto w-full max-w-6xl",
                this.fill ? "flex min-h-0 flex-1 flex-col" : "",
            ];
        },
    },
};
</script>
