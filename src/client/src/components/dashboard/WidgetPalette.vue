<template>
    <Dialog v-model:open="open">
        <DialogContent class="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{{ $t("addWidget") }}</DialogTitle>
                <DialogDescription>{{ $t("addWidgetHint") }}</DialogDescription>
            </DialogHeader>

            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                    v-for="meta in catalog"
                    :key="meta.type"
                    type="button"
                    class="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    @click="pick(meta.type)"
                >
                    <app-icon :icon="meta.icon" size="lg" class="mt-0.5 shrink-0 text-ink-muted" />
                    <span class="min-w-0">
                        <span class="block text-sm font-medium text-ink">{{ $t(meta.titleKey) }}</span>
                        <span class="block text-xs text-ink-muted">{{ $t(meta.descriptionKey) }}</span>
                    </span>
                </button>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WIDGET_CATALOG, type WidgetType } from "../../../../shared/dashboard";

const emit = defineEmits<{
    (e : "add", type : WidgetType) : void;
}>();

const open = defineModel<boolean>("open", { required: true });

const catalog = WIDGET_CATALOG;

/**
 * Add the chosen widget and close the picker. Duplicates are allowed, so a user
 * can show two fleet panels (e.g. after filtering elsewhere).
 * @param type Widget kind to add
 */
function pick(type : WidgetType) : void {
    emit("add", type);
    open.value = false;
}
</script>
