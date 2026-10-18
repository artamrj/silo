<template>
    <div
        class="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 transition-colors"
        :class="{ 'hover:bg-subtle': !image.inUse, 'opacity-70': image.inUse }"
    >
        <Checkbox
            v-if="selectable"
            class="shrink-0"
            :model-value="selected"
            :disabled="image.inUse"
            :aria-label="$t('selectImage', { name: primaryName })"
            @update:model-value="$emit('toggle-select', image)"
        />

        <div class="min-w-0 flex-1">
            <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span class="min-w-0 truncate font-medium" :title="primaryName">
                    {{ primaryName }}
                </span>

                <!-- Every tag pointing at this image, one chip each. -->
                <Badge
                    v-for="tag in tagChips"
                    :key="tag"
                    variant="secondary"
                    class="max-w-48 font-mono text-[11px]"
                    :title="tag"
                >
                    {{ tag }}
                </Badge>
            </div>

            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                <span class="font-mono">{{ image.shortId }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ image.size }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ image.createdSince }}</span>
            </div>
        </div>

        <!-- Usage status is the headline signal of the page. -->
        <Badge :variant="statusVariant" class="shrink-0" :title="statusTitle">
            {{ statusLabel }}
        </Badge>

        <Tooltip v-if="image.inUse">
            <TooltipTrigger as-child>
                <span class="shrink-0">
                    <button
                        type="button"
                        class="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted/50"
                        :aria-label="$t('imageInUse')"
                        disabled
                    >
                        <app-icon icon="trash" size="sm" />
                    </button>
                </span>
            </TooltipTrigger>
            <TooltipContent side="left">{{ statusTitle }}</TooltipContent>
        </Tooltip>

        <button
            v-else
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
            :aria-label="$t('removeImage')"
            @click="$emit('remove', image)"
        >
            <app-icon icon="trash" size="sm" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DockerImage } from "../../../shared/docker";

const props = withDefaults(defineProps<{
    /** Image entry, already grouped by id by the server. */
    image : DockerImage;
    /** Show the bulk-selection checkbox. */
    selectable?: boolean;
    /** Whether the checkbox is currently ticked. */
    selected?: boolean;
}>(), {
    selectable: true,
    selected: false,
});

defineEmits<{
    remove: [ image : DockerImage ];
    "toggle-select": [ image : DockerImage ];
}>();

const { t } = useI18n();

/** The repository of the first tag, without tag or registry port. */
const primaryName = computed(() => {
    if (props.image.dangling || props.image.tags.length === 0) {
        return "<none>";
    }
    const ref = props.image.tags[0];
    const lastColon = ref.lastIndexOf(":");
    // Only treat the colon as a tag separator when it follows the last slash.
    if (lastColon > ref.lastIndexOf("/")) {
        return ref.slice(0, lastColon);
    }
    return ref;
});

/** Tag portion of every reference. */
const tagChips = computed(() => props.image.tags.map((ref) => {
    const lastColon = ref.lastIndexOf(":");
    return lastColon > ref.lastIndexOf("/") ? ref.slice(lastColon + 1) : "latest";
}));

const statusLabel = computed(() => {
    if (props.image.dangling) {
        return t("Dangling");
    }
    if (props.image.inUseByStack) {
        return t("In use (stack)");
    }
    if (props.image.containers > 0) {
        return t("In use");
    }
    return t("Unused");
});

const statusVariant = computed<"destructive" | "secondary" | "outline">(() => {
    if (props.image.dangling) {
        return "destructive";
    }
    if (props.image.inUse) {
        return "secondary";
    }
    return "outline";
});

const statusTitle = computed(() => {
    if (props.image.inUseByStack) {
        return t("imageUsedByStacks", { stacks: props.image.usedByStacks.join(", ") });
    }
    if (props.image.containers > 0) {
        return t("imageUsedByContainers", { count: props.image.containers });
    }
    return t("imageUnused");
});
</script>
