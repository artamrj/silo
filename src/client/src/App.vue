<template>
    <router-view />

    <Toaster
        position="bottom-right"
        rich-colors
        close-button
        :duration="TOAST_DURATION"
        :visible-toasts="TOAST_MAX_VISIBLE"
        :theme="$root.theme"
    />
</template>

<script>
import { Toaster } from "@/components/ui/sonner";
import { TOAST_DURATION, TOAST_MAX_VISIBLE } from "./toast";

export default {
    components: {
        Toaster,
    },
    data() {
        return {
            TOAST_DURATION,
            TOAST_MAX_VISIBLE,
        };
    },
};
</script>
