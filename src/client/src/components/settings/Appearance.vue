<template>
    <div>
        <div class="mb-4">
            <span class="field-label">{{ $t("Theme") }}</span>
            <div class="inline-flex overflow-hidden rounded-lg border border-line" role="radiogroup" :aria-label="$t('Theme')">
                <label
                    v-for="option in themeOptions"
                    :key="option.value"
                    class="cursor-pointer border-l border-line px-4 py-2 text-sm first:border-l-0"
                    :class="$root.userTheme === option.value ? 'bg-primary-fill text-white' : 'bg-surface text-ink hover:bg-subtle'"
                >
                    <input
                        v-model="$root.userTheme"
                        type="radio"
                        class="sr-only"
                        name="theme"
                        :value="option.value"
                    />
                    {{ $t(option.label) }}
                </label>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    computed: {
        themeOptions() {
            return [
                {
                    value: "light",
                    label: "Light" },
                {
                    value: "dark",
                    label: "Dark" },
                {
                    value: "auto",
                    label: "Auto" },
            ];
        },
    },
};
</script>
