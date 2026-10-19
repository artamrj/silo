<template>
    <div class="flex h-full min-h-0 flex-col">
        <ul v-if="stacks.length" class="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-0">
            <li v-for="stack in stacks" :key="stack.name" class="min-w-0">
                <button
                    type="button"
                    class="flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-subtle"
                    @click="router.push(`/compose/${stack.name}`)"
                >
                    <span class="size-2 shrink-0 rounded-full" :class="dotClass(stack.status)" :title="statusLabel(stack.status)" />
                    <span class="min-w-0 flex-1 truncate text-sm text-ink">{{ stack.name }}</span>
                    <span class="shrink-0 text-xs text-ink-muted">{{ statusLabel(stack.status) }}</span>
                </button>
            </li>
        </ul>

        <p v-else class="m-auto text-sm text-ink-muted">{{ $t("No Stacks") }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { statusColor, statusNameShort } from "../../../../shared/utils";
import { useStackList } from "../../composables/useStackList";

const router = useRouter();
const { t } = useI18n();
const { filteredStackList } = useStackList();

const stacks = computed(() => filteredStackList.value);

// Static class map so Tailwind emits every variant.
const DOT : Record<string, string> = {
    primary: "bg-success",
    danger: "bg-danger",
    dark: "bg-ink-muted",
    secondary: "bg-ink-muted/50",
};

function dotClass(status : number) : string {
    return DOT[statusColor(status)] ?? DOT.secondary;
}

/** Localized short status. `statusNameShort` doubles as an i18n key. */
function statusLabel(status : number) : string {
    return t(statusNameShort(status));
}
</script>
