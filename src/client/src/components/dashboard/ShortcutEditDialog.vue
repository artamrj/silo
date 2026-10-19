<template>
    <Dialog v-model:open="open">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ editing ? $t("editShortcut") : $t("addShortcut") }}</DialogTitle>
                <DialogDescription>{{ $t("shortcutHint") }}</DialogDescription>
            </DialogHeader>

            <form class="space-y-4 text-sm" @submit.prevent="submit">
                <div class="space-y-2">
                    <Label for="shortcut-name" class="text-sm font-medium">{{ $t("shortcutName") }}</Label>
                    <Input
                        id="shortcut-name"
                        v-model="form.name"
                        :placeholder="$t('shortcutNamePlaceholder')"
                        autocomplete="off"
                        required
                    />
                </div>

                <div class="space-y-2">
                    <Label for="shortcut-url" class="text-sm font-medium">{{ $t("shortcutUrl") }}</Label>
                    <Input
                        id="shortcut-url"
                        v-model="form.url"
                        :placeholder="$t('shortcutUrlPlaceholder')"
                        autocomplete="off"
                        required
                    />
                    <p v-if="!urlValid" class="text-xs text-danger">{{ $t("shortcutUrlInvalid") }}</p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-2">
                        <Label for="shortcut-group" class="text-sm font-medium">{{ $t("shortcutGroup") }}</Label>
                        <Input
                            id="shortcut-group"
                            v-model="form.group"
                            :placeholder="$t('shortcutGroupPlaceholder')"
                            autocomplete="off"
                        />
                    </div>
                    <div class="space-y-2">
                        <Label for="shortcut-icon" class="text-sm font-medium">{{ $t("shortcutIcon") }}</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <Button id="shortcut-icon" type="button" variant="outline" class="w-full justify-start gap-2">
                                    <app-icon :icon="form.icon || 'globe'" size="sm" />
                                    <span class="truncate">{{ iconLabel(form.icon || "globe") }}</span>
                                    <app-icon icon="angle-down" size="sm" class="ml-auto" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" class="max-h-72 w-52 overflow-y-auto">
                                <DropdownMenuItem v-for="option in ICON_OPTIONS" :key="option" @select="form.icon = option">
                                    <app-icon :icon="option" size="sm" class="mr-2" />
                                    {{ iconLabel(option) }}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="open = false">{{ $t("cancel") }}</Button>
                    <Button type="submit" :disabled="!canSubmit">{{ $t("Save") }}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SAFE_SHORTCUT_URL, type Shortcut } from "../../../../shared/dashboard";

const props = defineProps<{
    /** Existing shortcut to edit, or null when adding. */
    shortcut : Shortcut | null;
}>();

const emit = defineEmits<{
    (e : "save", shortcut : Shortcut) : void;
}>();

// Two-way bound by the parent (`v-model:open`).
const open = defineModel<boolean>("open", { required: true });

/** Icon keys offered by the picker; every key exists in `icon.ts`. */
const ICON_OPTIONS = [
    "globe", "server", "hard-drive", "database", "network", "cloud", "box", "boxes",
    "monitor", "tv", "gamepad", "camera", "image", "mail", "book-open", "scroll-text",
    "git-branch", "folder", "terminal", "activity", "cpu", "memory", "shield", "wrench",
    "brain", "clapperboard", "zap", "cable", "rocket", "file-code",
] as const;

const form = reactive({ name: "",
    url: "",
    icon: "globe",
    group: "" });

/**
 * Human-readable label for an icon key. Icon keys are technical identifiers
 * (not translatable copy), so they are title-cased rather than run through i18n.
 * @param key Icon registry key, e.g. `hard-drive`
 * @returns Display label, e.g. `Hard drive`
 */
function iconLabel(key : string) : string {
    const words = key.replace(/[-_]/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}

const editing = computed(() => props.shortcut !== null);
const urlValid = computed(() => form.url === "" || SAFE_SHORTCUT_URL.test(form.url.trim()));
const canSubmit = computed(() => form.name.trim() !== "" && SAFE_SHORTCUT_URL.test(form.url.trim()));

// Reset the form each time the dialog opens, so a cancelled edit is not kept.
watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }
    form.name = props.shortcut?.name ?? "";
    form.url = props.shortcut?.url ?? "";
    form.icon = props.shortcut?.icon ?? "globe";
    form.group = props.shortcut?.group ?? "";
});

function submit() : void {
    if (!canSubmit.value) {
        return;
    }
    emit("save", {
        id: props.shortcut?.id ?? `shortcut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: form.name.trim(),
        url: form.url.trim(),
        icon: form.icon,
        ...(form.group.trim() ? { group: form.group.trim() } : {}),
    });
    open.value = false;
}
</script>
