<template>
    <PageContainer wide>
        <PageHeader :title="$t('Dashboard')" :description="$t('dashboardDescription')">
            <template #actions>
                <template v-if="editing">
                    <Button variant="outline" :disabled="saving" @click="openPalette = true">
                        <app-icon icon="plus" size="sm" />
                        {{ $t("addWidget") }}
                    </Button>

                    <Button variant="outline" :disabled="saving" @click="confirmReset = true">
                        <app-icon icon="rotate" size="sm" />
                        {{ $t("resetLayout") }}
                    </Button>

                    <Button variant="outline" :disabled="saving" @click="cancelEditing">
                        {{ $t("cancel") }}
                    </Button>

                    <Button :disabled="saving || !dirty" @click="saveDashboard">
                        <app-icon icon="save" size="sm" />
                        {{ saving ? $t("Saving") : $t("Save") }}
                    </Button>
                </template>

                <Button v-else variant="outline" :disabled="!canEdit" :title="canEdit ? '' : $t('editingLayoutHint')" @click="startEditing">
                    <app-icon icon="sliders" size="sm" />
                    {{ $t("customizeLayout") }}
                </Button>
            </template>
        </PageHeader>

        <p v-if="editing" class="mb-3 rounded-xl bg-primary-soft px-3 py-2 text-sm text-ink-muted">
            {{ $t("editingLayoutHint") }}
        </p>

        <Skeleton v-if="loading && !loaded" class="h-64 w-full rounded-2xl" />

        <BentoGrid
            v-else
            :items="items"
            :columns="columns"
            :editable="editable"
            @update:items="updateLayout"
            @remove="removeWidget"
        >
            <template #item="{ item }">
                <ShortcutGrid
                    v-if="item.type === 'shortcuts'"
                    :shortcuts="shortcuts"
                    :editable="editable"
                    @remove="removeShortcut"
                    @edit="openShortcutDialog"
                />

                <component :is="widgetComponent(item.type)" v-else />
            </template>

            <template #item-actions="{ item }">
                <Button
                    v-if="editable && item.type === 'shortcuts'"
                    variant="ghost"
                    size="icon-xs"
                    class="text-ink-muted"
                    :title="$t('addShortcut')"
                    :aria-label="$t('addShortcut')"
                    @click="openShortcutDialog(null)"
                >
                    <app-icon icon="plus" size="sm" />
                </Button>
            </template>

            <template #empty>
                <div class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
                    <p class="text-sm text-ink-muted">{{ $t("noWidgets") }}</p>
                    <Button v-if="editable" variant="outline" @click="openPalette = true">
                        <app-icon icon="plus" size="sm" />
                        {{ $t("addWidget") }}
                    </Button>
                </div>
            </template>
        </BentoGrid>

        <WidgetPalette v-model:open="openPalette" @add="addWidget" />

        <ShortcutEditDialog
            v-model:open="openShortcut"
            :shortcut="editingShortcut"
            @save="onShortcutSaved"
        />

        <AlertDialog v-model:open="confirmReset">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ $t("resetLayout") }}</AlertDialogTitle>
                    <AlertDialogDescription>{{ $t("resetLayoutMsg") }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ $t("cancel") }}</AlertDialogCancel>
                    <AlertDialogAction @click="resetLayout">{{ $t("resetLayout") }}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </PageContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BentoGrid from "../components/dashboard/BentoGrid.vue";
import ShortcutEditDialog from "../components/dashboard/ShortcutEditDialog.vue";
import ShortcutGrid from "../components/dashboard/ShortcutGrid.vue";
import WidgetPalette from "../components/dashboard/WidgetPalette.vue";
import { widgetComponent } from "../components/dashboard/registry";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { useDashboard } from "../composables/useDashboard";
import { type Breakpoint, type Shortcut } from "../../../shared/dashboard";

const {
    loaded,
    loading,
    saving,
    dirty,
    editing,
    activeBreakpoint,
    items,
    columns,
    shortcuts,
    updateLayout,
    addWidget,
    removeWidget,
    resetLayout,
    addShortcut,
    updateShortcut,
    removeShortcut,
    loadDashboard,
    saveDashboard,
    cancelEditing,
} = useDashboard();

const openPalette = ref(false);
const openShortcut = ref(false);
const editingShortcut = ref<Shortcut | null>(null);
const confirmReset = ref(false);

// Editing the board rewrites grid coordinates, which only makes sense on the
// wide layout. Narrower screens show the derived, read-only stack.
const canEdit = computed(() => activeBreakpoint.value === "lg");
const editable = computed(() => editing.value && canEdit.value);

function startEditing() : void {
    editing.value = true;
}

function openShortcutDialog(shortcut : Shortcut | null) : void {
    editingShortcut.value = shortcut;
    openShortcut.value = true;
}

function onShortcutSaved(shortcut : Shortcut) : void {
    if (editingShortcut.value) {
        updateShortcut(shortcut);
    } else {
        addShortcut(shortcut);
    }
}

// Breakpoint from the viewport. Kept in the page rather than a composable
// because only the dashboard needs it.
const BREAKPOINT_QUERIES : { query : string; breakpoint : Breakpoint }[] = [
    { query: "(min-width: 1024px)",
        breakpoint: "lg" },
    { query: "(min-width: 640px)",
        breakpoint: "md" },
];

const mediaQueries : MediaQueryList[] = [];

function syncBreakpoint() : void {
    const match = BREAKPOINT_QUERIES.find((entry) => window.matchMedia(entry.query).matches);
    activeBreakpoint.value = match?.breakpoint ?? "sm";
}

onMounted(() => {
    if (!loaded.value) {
        loadDashboard();
    }

    if (typeof window.matchMedia !== "function") {
        return;
    }
    for (const entry of BREAKPOINT_QUERIES) {
        const query = window.matchMedia(entry.query);
        query.addEventListener("change", syncBreakpoint);
        mediaQueries.push(query);
    }
    syncBreakpoint();
});

onBeforeUnmount(() => {
    for (const query of mediaQueries) {
        query.removeEventListener("change", syncBreakpoint);
    }
});
</script>
