<template>
    <router-view />

    <Toaster
        position="bottom-right"
        rich-colors
        close-button
        :duration="TOAST_DURATION"
        :visible-toasts="TOAST_MAX_VISIBLE"
        :theme="theme"
    />
</template>

<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
import { TOAST_DURATION, TOAST_MAX_VISIBLE } from "./toast";
import { useTheme } from "./composables/useTheme";

const { theme } = useTheme();
</script>
