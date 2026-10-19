<template>
    <div
        ref="container"
        class="relative w-full"
        :style="{ height: `${containerHeight}px` }"
    >
        <BentoItem
            v-for="item in displayItems"
            :key="item.id"
            :item="item"
            :rect="rectFor(item)"
            :editable="editable"
            :dragging="item.id === activeId"
            :transitioning="item.id !== activeId"
            @drag-start="onDragStart(item, $event)"
            @resize-start="onResizeStart(item, $event)"
            @nudge="(dx, dy) => onNudge(item, dx, dy)"
            @resize="(dw, dh) => onResizeDelta(item, dw, dh)"
            @remove="emit('remove', item.id)"
        >
            <template #actions>
                <slot name="item-actions" :item="item" />
            </template>
            <slot name="item" :item="item" />
        </BentoItem>

        <slot v-if="displayItems.length === 0" name="empty" />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import BentoItem from "./BentoItem.vue";
import { moveItem, resizeItem } from "../../../../shared/bento";
import { widgetMeta, type WidgetInstance } from "../../../../shared/dashboard";
import type { BentoRect } from "../../composables/types";

const props = withDefaults(defineProps<{
    items : WidgetInstance[];
    /** Columns at the current breakpoint. */
    columns : number;
    /** Enables drag, resize, keyboard moves and the remove button. */
    editable? : boolean;
    /** Row height in px. */
    rowHeight? : number;
    /** Gutter between cells in px. */
    gap? : number;
}>(), {
    editable: false,
    rowHeight: 56,
    gap: 12,
});

const emit = defineEmits<{
    (e : "update:items", items : WidgetInstance[]) : void;
    (e : "remove", id : string) : void;
}>();

const container = useTemplateRef<HTMLDivElement>("container");
const containerWidth = ref(0);

/** Pointer-driven state. `working` is a preview layout that is only committed on release. */
const activeId = ref<string | null>(null);
const mode = ref<"move" | "resize" | null>(null);
const working = ref<WidgetInstance[] | null>(null);
const liveRect = ref<BentoRect | null>(null);

let startItems : WidgetInstance[] = [];
let startRect : BentoRect = { left: 0,
    top: 0,
    width: 0,
    height: 0 };
let pointerOrigin = { x: 0,
    y: 0 };
let observer : ResizeObserver | undefined;

/** Column width derived from the measured container width. */
const cellWidth = computed(() => {
    const { columns, gap } = props;
    if (containerWidth.value <= 0 || columns <= 0) {
        return 0;
    }
    return Math.max(0, (containerWidth.value - gap * (columns - 1)) / columns);
});

const displayItems = computed(() => working.value ?? props.items);

/** Rows needed by the current layout (plus one spare row while dragging). */
const rowCount = computed(
    () => displayItems.value.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    + (activeId.value ? 1 : 0)
);

/** Container height, kept tall enough for the current layout. */
const containerHeight = computed(() => {
    const rows = rowCount.value;
    return rows > 0 ? rows * props.rowHeight + (rows - 1) * props.gap : 0;
});

/**
 * Grid units to a pixel rectangle.
 * @param item Placed widget
 * @returns Absolute rectangle inside the container
 */
function gridRect(item : WidgetInstance) : BentoRect {
    const { rowHeight, gap } = props;
    const col = cellWidth.value + gap;
    const row = rowHeight + gap;
    return {
        left: item.x * col,
        top: item.y * row,
        width: Math.max(0, item.w * cellWidth.value + (item.w - 1) * gap),
        height: Math.max(0, item.h * rowHeight + (item.h - 1) * gap),
    };
}

/** Rect for the template: the live (pointer-following) rect wins for the active item. */
function rectFor(item : WidgetInstance) : BentoRect {
    if (item.id === activeId.value && liveRect.value) {
        return liveRect.value;
    }
    return gridRect(item);
}

function clamp(value : number, min : number, max : number) : number {
    return Math.max(min, Math.min(max, value));
}

/** Start a pointer gesture, snapshotting the layout so previews are relative. */
function begin(item : WidgetInstance, kind : "move" | "resize", event : PointerEvent) : void {
    if (!props.editable) {
        return;
    }
    startItems = props.items.map((entry) => ({ ...entry }));
    startRect = gridRect(item);
    pointerOrigin = { x: event.clientX,
        y: event.clientY };
    activeId.value = item.id;
    mode.value = kind;
    working.value = startItems;
    liveRect.value = { ...startRect };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeydown);
}

function onDragStart(item : WidgetInstance, event : PointerEvent) : void {
    begin(item, "move", event);
}

function onResizeStart(item : WidgetInstance, event : PointerEvent) : void {
    begin(item, "resize", event);
}

function onPointerMove(event : PointerEvent) : void {
    if (!activeId.value || !mode.value) {
        return;
    }
    const unitX = cellWidth.value + props.gap;
    const unitY = props.rowHeight + props.gap;
    if (unitX <= 0 || unitY <= 0) {
        return;
    }

    const pxDx = event.clientX - pointerOrigin.x;
    const pxDy = event.clientY - pointerOrigin.y;
    const dx = Math.round(pxDx / unitX);
    const dy = Math.round(pxDy / unitY);

    if (mode.value === "move") {
        liveRect.value = {
            left: clamp(startRect.left + pxDx, 0, Math.max(0, containerWidth.value - startRect.width)),
            top: Math.max(0, startRect.top + pxDy),
            width: startRect.width,
            height: startRect.height,
        };
        working.value = moveItem(startItems, activeId.value, dx, dy, props.columns);
    } else {
        const type = currentType();
        const meta = type ? widgetMeta(type) : undefined;
        const minW = meta?.minW ?? 1;
        const minH = meta?.minH ?? 1;
        liveRect.value = {
            left: startRect.left,
            top: startRect.top,
            width: Math.max(minW * (cellWidth.value + props.gap) - props.gap, startRect.width + pxDx),
            height: Math.max(minH * (props.rowHeight + props.gap) - props.gap, startRect.height + pxDy),
        };
        working.value = resizeItem(
            startItems, activeId.value, dx, dy, props.columns, minW, minH
        );
    }
}

function currentType() : WidgetInstance["type"] | undefined {
    const item = startItems.find((entry) => entry.id === activeId.value);
    return item?.type;
}

/** Commit the previewed layout. */
function onPointerUp() : void {
    if (activeId.value && working.value) {
        emit("update:items", working.value);
    }
    end();
}

/** Abort the gesture without touching the layout. */
function onPointerCancel() : void {
    end();
}

function onKeydown(event : KeyboardEvent) : void {
    if (event.key === "Escape" && activeId.value) {
        event.preventDefault();
        end();
    }
}

function end() : void {
    activeId.value = null;
    mode.value = null;
    working.value = null;
    liveRect.value = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onKeydown);
}

/** Apply a committed move/resize from the keyboard. */
function commit(id : string, transform : (items : WidgetInstance[]) => WidgetInstance[]) : void {
    emit("update:items", transform(props.items));
}

function onNudge(item : WidgetInstance, dx : number, dy : number) : void {
    commit(item.id, (items) => moveItem(items, item.id, dx, dy, props.columns));
}

function onResizeDelta(item : WidgetInstance, dw : number, dh : number) : void {
    const meta = widgetMeta(item.type);
    commit(item.id, (items) =>
        resizeItem(items, item.id, dw, dh, props.columns, meta?.minW ?? 1, meta?.minH ?? 1)
    );
}

onMounted(() => {
    if (!container.value) {
        return;
    }
    observer = new ResizeObserver((entries) => {
        containerWidth.value = entries[0]?.contentRect.width ?? 0;
    });
    observer.observe(container.value);
    containerWidth.value = container.value.clientWidth;
});

onBeforeUnmount(() => {
    observer?.disconnect();
    end();
});
</script>
