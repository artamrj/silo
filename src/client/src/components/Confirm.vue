<template>
    <AlertDialog v-model:open="visible">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ title || $t("Confirm") }}</AlertDialogTitle>
            </AlertDialogHeader>

            <AlertDialogDescription as="div" class="space-y-4 text-sm leading-relaxed text-foreground">
                <slot />
            </AlertDialogDescription>

            <AlertDialogFooter>
                <AlertDialogCancel @click="$emit('no')">
                    {{ noText }}
                </AlertDialogCancel>
                <AlertDialogAction :class="actionClass" @click="$emit('yes')">
                    {{ yesText }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<script setup lang="ts">
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { computed, ref } from "vue";

// Legacy callers pass the old `.button-*` class names; map them onto shadcn variants.
const ACTION_VARIANTS : Record<string, string> = {
    "button-primary": "bg-primary text-primary-foreground hover:bg-primary/90",
    "button-danger": "bg-destructive text-white hover:bg-destructive/90",
    "button-normal": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    "button-secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
};

const props = withDefaults(defineProps<{
    /** Style of the confirm button, using the legacy `.button-*` names */
    btnStyle?: string;
    /** Text to use as yes */
    yesText?: string;
    /** Text to use as no */
    noText?: string;
    /** Title to show on modal. Defaults to translated version of "Config" */
    title?: string | null;
}>(), {
    btnStyle: "button-primary",
    yesText: "Yes",     // TODO: No idea what to translate this
    noText: "No",
    title: null,
});

defineEmits<{ yes: []; no: [] }>();

const visible = ref(false);

const actionClass = computed(() => ACTION_VARIANTS[props.btnStyle] ?? ACTION_VARIANTS["button-primary"]);

/**
 * Show the confirm dialog
 * @returns {void}
 */
function show() : void {
    visible.value = true;
}

defineExpose({ show });
</script>
