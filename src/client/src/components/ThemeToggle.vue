<template>
    <button
        type="button"
        class="relative flex size-11 items-center justify-center rounded-xl text-ink-muted transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-ink active:scale-95"
        :aria-label="$t('Theme')"
        @click="cycleTheme"
    >
        <span class="relative size-[22px]">
            <app-icon
                v-for="option in options"
                :key="option.theme"
                :icon="option.icon"
                size="lg"
                class="absolute inset-0 m-auto transition-all duration-300 ease-out"
                :class="option.theme === userTheme
                    ? 'scale-100 rotate-0 opacity-100'
                    : 'scale-0 rotate-90 opacity-0'"
            />
        </span>
    </button>
</template>

<script setup lang="ts">
import { useTheme } from "../composables/useTheme";

const { userTheme, cycleTheme } = useTheme();

/** Theme value -> lucide icon, cross-faded on change. */
const options = [
    {
        theme: "light",
        icon: "sun" },
    {
        theme: "dark",
        icon: "moon" },
    {
        theme: "auto",
        icon: "monitor" },
];
</script>
