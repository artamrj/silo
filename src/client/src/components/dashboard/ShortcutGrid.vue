<template>
    <div class="flex h-full min-h-0 flex-col">
        <div v-if="groups.length" class="min-h-0 flex-1 overflow-y-auto">
            <section v-for="group in groups" :key="group.name" class="mb-2 last:mb-0">
                <h3 class="mb-1 text-xs font-bold tracking-wider text-ink-muted uppercase">
                    {{ group.name }}
                </h3>
                <div class="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                    <div v-for="shortcut in group.items" :key="shortcut.id" class="group/tile relative">
                        <a
                            :href="shortcut.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex flex-col items-center gap-1 rounded-xl bg-subtle px-2 py-2.5 text-center transition-colors hover:bg-accent"
                            :title="shortcut.url"
                        >
                            <app-icon :icon="shortcut.icon || 'globe'" size="lg" class="text-ink-muted" />
                            <span class="line-clamp-2 text-xs leading-tight text-ink">{{ shortcut.name }}</span>
                        </a>

                        <button
                            v-if="editable"
                            type="button"
                            class="absolute -top-1 -right-1 hidden size-5 items-center justify-center rounded-full bg-danger text-white group-hover/tile:flex"
                            :title="$t('removeShortcut')"
                            :aria-label="$t('removeShortcut')"
                            @click.stop.prevent="emit('remove', shortcut.id)"
                        >
                            <app-icon icon="times" size="sm" />
                        </button>

                        <button
                            v-if="editable"
                            type="button"
                            class="absolute -top-1 -left-1 hidden size-5 items-center justify-center rounded-full bg-primary-fill text-white group-hover/tile:flex"
                            :title="$t('editShortcut')"
                            :aria-label="$t('editShortcut')"
                            @click.stop.prevent="emit('edit', shortcut)"
                        >
                            <app-icon icon="pencil" size="sm" />
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <p v-else class="m-auto px-4 text-center text-sm text-ink-muted">{{ $t("noShortcuts") }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Shortcut } from "../../../../shared/dashboard";

const props = withDefaults(defineProps<{
    shortcuts : Shortcut[];
    editable? : boolean;
}>(), {
    editable: false,
});

const emit = defineEmits<{
    (e : "remove", id : string) : void;
    (e : "edit", shortcut : Shortcut) : void;
}>();

const { t } = useI18n();

/** Shortcuts bucketed by their optional group, in insertion order. */
const groups = computed(() => {
    const buckets = new Map<string, Shortcut[]>();
    for (const shortcut of props.shortcuts) {
        const name = shortcut.group?.trim() || t("ungrouped");
        const list = buckets.get(name);
        if (list) {
            list.push(shortcut);
        } else {
            buckets.set(name, [ shortcut ]);
        }
    }
    return [ ...buckets.entries() ].map(([ name, items ]) => ({ name,
        items }));
});
</script>
