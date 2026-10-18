<template>
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-2">
                <slot name="before-title" />
                <h1 class="mb-0 truncate tracking-tight">{{ title }}</h1>
                <slot name="after-title" />
            </div>
            <p v-if="description" class="mt-1 text-sm text-ink-muted">{{ description }}</p>
        </div>

        <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
            <slot name="actions" />
        </div>
    </header>
</template>

<script>
export default {
    props: {
        /** Page title, rendered as the single <h1>. */
        title: {
            type: String,
            required: true,
        },
        /** Optional supporting line under the title. */
        description: {
            type: String,
            default: "",
        },
    },
};
</script>
