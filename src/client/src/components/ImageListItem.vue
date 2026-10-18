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

<script>
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default {
    components: {
        Badge,
        Checkbox,
        Tooltip,
        TooltipContent,
        TooltipTrigger,
    },
    props: {
        /** Image entry, already grouped by id by the server. */
        image: {
            type: Object,
            required: true,
        },
        /** Show the bulk-selection checkbox. */
        selectable: {
            type: Boolean,
            default: true,
        },
        /** Whether the checkbox is currently ticked. */
        selected: {
            type: Boolean,
            default: false,
        },
    },
    emits: [ "remove", "toggle-select" ],
    computed: {
        /** The repository of the first tag, without tag or registry port. */
        primaryName() {
            if (this.image.dangling || this.image.tags.length === 0) {
                return "<none>";
            }
            const ref = this.image.tags[0];
            const lastColon = ref.lastIndexOf(":");
            // Only treat the colon as a tag separator when it follows the last slash.
            if (lastColon > ref.lastIndexOf("/")) {
                return ref.slice(0, lastColon);
            }
            return ref;
        },

        /** Tag portion of every reference. */
        tagChips() {
            return this.image.tags.map((ref) => {
                const lastColon = ref.lastIndexOf(":");
                return lastColon > ref.lastIndexOf("/") ? ref.slice(lastColon + 1) : "latest";
            });
        },

        statusLabel() {
            if (this.image.dangling) {
                return this.$t("Dangling");
            }
            if (this.image.inUseByStack) {
                return this.$t("In use (stack)");
            }
            if (this.image.containers > 0) {
                return this.$t("In use");
            }
            return this.$t("Unused");
        },

        statusVariant() {
            if (this.image.dangling) {
                return "destructive";
            }
            if (this.image.inUse) {
                return "secondary";
            }
            return "outline";
        },

        statusTitle() {
            if (this.image.inUseByStack) {
                return this.$t("imageUsedByStacks", { stacks: this.image.usedByStacks.join(", ") });
            }
            if (this.image.containers > 0) {
                return this.$t("imageUsedByContainers", { count: this.image.containers });
            }
            return this.$t("imageUnused");
        },
    },
};
</script>
