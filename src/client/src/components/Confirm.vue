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

<script>
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

// Legacy callers pass the old `.button-*` class names; map them onto shadcn variants.
const ACTION_VARIANTS = {
    "button-primary": "bg-primary text-primary-foreground hover:bg-primary/90",
    "button-danger": "bg-destructive text-white hover:bg-destructive/90",
    "button-normal": "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
    "button-secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
};

export default {
    components: {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    },
    props: {
        /** Style of the confirm button, using the legacy `.button-*` names */
        btnStyle: {
            type: String,
            default: "button-primary",
        },
        /** Text to use as yes */
        yesText: {
            type: String,
            default: "Yes",     // TODO: No idea what to translate this
        },
        /** Text to use as no */
        noText: {
            type: String,
            default: "No",
        },
        /** Title to show on modal. Defaults to translated version of "Config" */
        title: {
            type: String,
            default: null,
        }
    },
    emits: [ "yes", "no" ],
    data: () => ({
        visible: false,
    }),
    computed: {
        actionClass() {
            return ACTION_VARIANTS[this.btnStyle] ?? ACTION_VARIANTS["button-primary"];
        },
    },
    methods: {
        /**
         * Show the confirm dialog
         * @returns {void}
         */
        show() {
            this.visible = true;
        },
    },
};
</script>
