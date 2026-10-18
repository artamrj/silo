<template>
    <div>
        <div class="mb-4 space-y-1.5">
            <Label>{{ $t("Theme") }}</Label>
            <ToggleGroup
                :model-value="$root.userTheme"
                type="single"
                variant="outline"
                class="w-fit"
                :aria-label="$t('Theme')"
                @update:model-value="onThemeChange"
            >
                <ToggleGroupItem v-for="option in themeOptions" :key="option.value" :value="option.value">
                    {{ $t(option.label) }}
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    </div>
</template>

<script>
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default {
    components: {
        Label,
        ToggleGroup,
        ToggleGroupItem,
    },
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
    methods: {
        /**
         * Apply the chosen theme to the root theme state
         * @param value Selected theme value
         * @returns {void}
         */
        onThemeChange(value) {
            if (value) {
                this.$root.userTheme = value;
            }
        },
    },
};
</script>
