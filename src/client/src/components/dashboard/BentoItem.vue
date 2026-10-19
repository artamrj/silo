<template>
    <article
        :class="[
            'group absolute flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm',
            editable ? 'ring-1 ring-line/60 ring-inset' : '',
            dragging ? 'z-30 shadow-lg ring-2 ring-primary/40' : '',
            transitioning ? 'transition-[left,top,width,height] duration-200 ease-out' : '',
        ]"
        :style="rectStyle"
        :tabindex="editable ? 0 : undefined"
        :aria-label="title"
        @keydown="onKeydown"
    >
        <header class="flex h-9 shrink-0 items-center gap-1.5 px-3">
            <app-icon :icon="meta?.icon ?? 'box'" size="sm" class="shrink-0 text-ink-muted" />
            <h2 class="min-w-0 flex-1 truncate text-xs font-bold tracking-wider text-ink-muted uppercase">
                {{ title }}
            </h2>

            <slot name="actions" />

            <button
                v-if="editable"
                type="button"
                class="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-ink-muted hover:bg-accent hover:text-ink active:cursor-grabbing"
                :title="$t('dragToMove')"
                :aria-label="$t('dragToMove')"
                @pointerdown.stop.prevent="emit('dragStart', $event)"
            >
                <app-icon icon="grip-vertical" size="sm" />
            </button>

            <button
                v-if="editable"
                type="button"
                class="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger/10 hover:text-danger"
                :title="$t('removeWidget')"
                :aria-label="$t('removeWidget')"
                @click.stop="emit('remove')"
            >
                <app-icon icon="times" size="sm" />
            </button>
        </header>

        <!-- `@container`: widget internals react to the tile width, not the viewport. -->
        <div class="@container min-h-0 flex-1 overflow-hidden px-3 pb-3">
            <slot />
        </div>

        <button
            v-if="editable"
            type="button"
            class="absolute right-0 bottom-0 flex size-6 cursor-nwse-resize items-center justify-center rounded-tl-md text-ink-muted opacity-0 hover:bg-accent hover:text-ink group-hover:opacity-100"
            :title="$t('resizeWidget')"
            :aria-label="$t('resizeWidget')"
            @pointerdown.stop.prevent="emit('resizeStart', $event)"
        >
            <app-icon icon="maximize-2" size="sm" />
        </button>
    </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { widgetMeta } from "../../../../shared/dashboard";
import type { WidgetInstance } from "../../../../shared/dashboard";
import type { BentoRect } from "../../composables/types";

const props = withDefaults(defineProps<{
    item : WidgetInstance;
    rect : BentoRect;
    editable? : boolean;
    /** This item is the one being dragged or resized. */
    dragging? : boolean;
    /** Animate position/size changes (off for the pointer-driven item). */
    transitioning? : boolean;
}>(), {
    editable: false,
    dragging: false,
    transitioning: true,
});

const emit = defineEmits<{
    (e : "dragStart", event : PointerEvent) : void;
    (e : "resizeStart", event : PointerEvent) : void;
    (e : "remove") : void;
    (e : "nudge", dx : number, dy : number) : void;
    (e : "resize", dw : number, dh : number) : void;
}>();

const { t } = useI18n();

const meta = computed(() => widgetMeta(props.item.type));
const title = computed(() => t(meta.value?.titleKey ?? props.item.type));

const rectStyle = computed(() => ({
    left: `${props.rect.left}px`,
    top: `${props.rect.top}px`,
    width: `${props.rect.width}px`,
    height: `${props.rect.height}px`,
}));

/**
 * Arrow keys move the tile one cell, shift+arrows resize it. Keeps the board
 * usable without a pointer.
 */
function onKeydown(event : KeyboardEvent) : void {
    if (!props.editable) {
        return;
    }
    const step : Record<string, [ number, number ]> = {
        ArrowLeft: [ -1, 0 ],
        ArrowRight: [ 1, 0 ],
        ArrowUp: [ 0, -1 ],
        ArrowDown: [ 0, 1 ],
    };
    const delta = step[event.key];
    if (!delta) {
        return;
    }
    event.preventDefault();
    if (event.shiftKey) {
        emit("resize", delta[0], delta[1]);
    } else {
        emit("nudge", delta[0], delta[1]);
    }
}
</script>
