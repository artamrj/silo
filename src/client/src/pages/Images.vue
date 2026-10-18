<template>
    <PageContainer>
        <PageHeader :title="$t('Images')" :description="$t('imagesDescription')">
            <template #actions>
                <Button variant="outline" size="sm" :disabled="loading" @click="loadImages">
                    <app-icon icon="arrows-rotate" size="sm" />
                    {{ $t("Refresh") }}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button variant="destructive" size="sm" :disabled="loading || images.length === 0">
                            <app-icon icon="trash" size="sm" />
                            {{ $t("Prune") }}
                            <app-icon icon="angle-down" size="sm" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-64">
                        <DropdownMenuLabel>{{ $t("Prune images") }}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem :disabled="danglingCount === 0" @select="askPrune(false)">
                            <div class="flex flex-col items-start">
                                <span>{{ $t("Dangling images") }}</span>
                                <span class="text-xs text-muted-foreground">{{ $t("danglingImagesHint") }}</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            :disabled="prunableCount === 0"
                            @select="askPrune(true)"
                        >
                            <div class="flex flex-col items-start">
                                <span>{{ $t("All unused images") }}</span>
                                <span class="text-xs text-muted-foreground">{{ $t("unusedImagesHint") }}</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </template>
        </PageHeader>

        <!-- Disk usage summary, straight from `docker system df`. -->
        <div v-if="disk" class="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-3 text-sm">
            <div class="flex items-center gap-2">
                <app-icon icon="box" size="sm" class="text-ink-muted" />
                <span class="font-semibold">{{ disk.totalCount }}</span>
                <span class="text-ink-muted">{{ $t("images") }}</span>
            </div>
            <div>
                <span class="text-ink-muted">{{ $t("Total size") }}:</span>
                <span class="font-semibold">{{ disk.size }}</span>
            </div>
            <div>
                <span class="text-ink-muted">{{ $t("In use") }}:</span>
                <span class="font-semibold">{{ disk.active }}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-ink-muted">{{ $t("Reclaimable") }}:</span>
                <span class="font-semibold text-destructive">{{ reclaimableText }}</span>
                <div class="h-1.5 w-24 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                    <div class="h-full bg-destructive" :style="{ width: disk.reclaimablePercent + '%' }" />
                </div>
            </div>
        </div>

        <!-- Search + status filter -->
        <div class="card mb-4 flex flex-col gap-2.5 p-2.5 sm:flex-row sm:items-center">
            <div class="flex min-w-0 flex-1 items-center gap-1">
                <button
                    v-if="searchText === ''"
                    class="grid size-10 shrink-0 place-items-center text-ink-muted"
                    :aria-label="$t('Search')"
                    type="button"
                >
                    <app-icon icon="search" />
                </button>
                <button
                    v-else
                    class="grid size-10 shrink-0 place-items-center text-ink-muted hover:opacity-60"
                    :aria-label="$t('Clear')"
                    type="button"
                    @click="searchText = ''"
                >
                    <app-icon icon="times" />
                </button>

                <input
                    v-model="searchText"
                    class="field min-w-0 flex-1"
                    autocomplete="off"
                    :placeholder="$t('Search')"
                    :aria-label="$t('Search')"
                    type="search"
                />
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-1" role="group" :aria-label="$t('Filter')">
                <button
                    v-for="filter in filters"
                    :key="filter.value"
                    type="button"
                    class="button button-sm"
                    :class="activeFilter === filter.value ? 'button-primary' : 'button-normal'"
                    :aria-pressed="activeFilter === filter.value"
                    @click="activeFilter = filter.value"
                >
                    {{ $t(filter.label) }}
                    <span class="opacity-70">{{ filter.count }}</span>
                </button>
            </div>
        </div>

        <div :aria-busy="loading">
            <!-- Skeleton while the first inventory arrives -->
            <div v-if="loading && !loaded" class="flex flex-col gap-2.5" aria-hidden="true">
                <div v-for="n in 6" :key="n" class="skeleton h-14 w-full" />
            </div>

            <div v-else-if="filteredImages.length === 0" class="card flex min-h-[260px] flex-col items-center justify-center gap-2.5 p-6 text-center text-ink-muted">
                <div class="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <app-icon icon="box" size="lg" />
                </div>
                <strong>{{ loaded ? $t("No Images") : $t("Cannot load images") }}</strong>
                <span v-if="loadError">{{ loadError }}</span>
            </div>

            <div v-else class="card flex flex-col overflow-hidden p-0">
                <TooltipProvider>
                    <ImageListItem
                        v-for="image in filteredImages"
                        :key="image.id"
                        :image="image"
                        :selected="selectedIds.includes(image.id)"
                        @remove="askRemove"
                        @toggle-select="toggleSelect"
                    />
                </TooltipProvider>
            </div>
        </div>

        <!-- Bulk action bar, appears once anything selectable is ticked. -->
        <div
            v-if="selectedIds.length > 0"
            class="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-raised px-4 py-2 shadow-lg"
        >
            <span class="text-sm">{{ $t("selectedCount", { count: selectedIds.length }) }}</span>
            <span class="text-sm text-ink-muted">{{ $t("reclaimableSize", { size: selectedSize }) }}</span>
            <button type="button" class="button button-sm button-normal" @click="clearSelection">
                {{ $t("Clear") }}
            </button>
            <button type="button" class="button button-sm button-danger" @click="askRemoveSelected">
                {{ $t("Remove selected") }}
            </button>
        </div>

        <!-- Remove one / remove selected -->
        <Confirm :ref="(el) => (removeConfirm = el)" :title="$t('removeImage')" btn-style="button-danger" :yes-text="$t('removeImage')" @yes="confirmRemove">
            <p>{{ $t("removeImageMsg") }}</p>
            <ul class="list-inside list-disc font-mono text-xs">
                <li v-for="image in pendingRemoval" :key="image.id">{{ imageName(image) }}</li>
            </ul>
        </Confirm>

        <!-- Prune confirmation -->
        <Confirm :ref="(el) => (pruneConfirm = el)" :title="pruneAll ? $t('All unused images') : $t('Dangling images')" btn-style="button-danger" :yes-text="$t('Prune')" @yes="confirmPrune">
            <p>{{ pruneAll ? $t("pruneAllMsg") : $t("pruneDanglingMsg") }}</p>
            <div v-if="pruneAll && protectedImages.length > 0" class="rounded-xl bg-muted p-2">
                <p class="font-semibold">{{ $t("pruneProtectedMsg") }}</p>
                <ul class="mt-1 list-inside list-disc font-mono text-xs">
                    <li v-for="image in protectedImages" :key="image.id">{{ imageName(image) }}</li>
                </ul>
            </div>
        </Confirm>
    </PageContainer>
</template>

<script>
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Confirm from "../components/Confirm.vue";
import ImageListItem from "../components/ImageListItem.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatBytes } from "../../../shared/docker";

export default {
    components: {
        Button,
        Confirm,
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuLabel,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
        ImageListItem,
        PageContainer,
        PageHeader,
        TooltipProvider,
    },
    data() {
        return {
            images: [],
            disk: null,
            searchText: "",
            activeFilter: "all",
            loading: false,
            loaded: false,
            loadError: "",
            selectedIds: [],
            pendingRemoval: [],
            pruneAll: false,
            removeConfirm: null,
            pruneConfirm: null,
        };
    },
    computed: {
        danglingCount() {
            return this.images.filter(image => image.dangling).length;
        },

        /** Unused images that docker may still keep because a stack pins them. */
        prunableCount() {
            return this.images.filter(image => !image.inUse).length;
        },

        /** Images that `prune -a` would remove but a stack still needs. */
        protectedImages() {
            return this.images.filter(image => !image.containers && image.inUseByStack);
        },

        filters() {
            return [
                {
                    value: "all",
                    label: "All",
                    count: this.images.length,
                },
                {
                    value: "used",
                    label: "In use",
                    count: this.images.filter(i => i.inUse).length,
                },
                {
                    value: "unused",
                    label: "Unused",
                    count: this.images.filter(i => !i.inUse && !i.dangling).length,
                },
                {
                    value: "dangling",
                    label: "Dangling",
                    count: this.danglingCount,
                },
            ];
        },

        filteredImages() {
            let result = this.images;

            if (this.activeFilter === "used") {
                result = result.filter(image => image.inUse);
            } else if (this.activeFilter === "unused") {
                result = result.filter(image => !image.inUse && !image.dangling);
            } else if (this.activeFilter === "dangling") {
                result = result.filter(image => image.dangling);
            }

            if (this.searchText !== "") {
                const needle = this.searchText.toLowerCase();
                result = result.filter(image => image.tags.some(tag => tag.toLowerCase().includes(needle))
                    || image.shortId.toLowerCase().includes(needle));
            }

            return result;
        },

        selectedSize() {
            const bytes = this.images
                .filter(image => this.selectedIds.includes(image.id))
                .reduce((sum, image) => sum + (image.sizeBytes || 0), 0);
            return formatBytes(bytes);
        },

        reclaimableText() {
            if (!this.disk) {
                return "";
            }
            return this.disk.reclaimable || this.disk.size;
        },
    },
    mounted() {
        this.loadImages();
    },
    methods: {
        /** Fetch the image inventory and disk usage from the server. */
        loadImages() {
            this.loading = true;
            this.loadError = "";
            this.$root.emitServer("getDockerImageList", (res) => {
                this.loading = false;
                this.loaded = true;

                if (res.ok && res.imageInventory) {
                    this.images = res.imageInventory.images;
                    this.disk = res.imageInventory.disk;
                    // Drop selections for images that no longer exist.
                    const ids = new Set(this.images.map(image => image.id));
                    this.selectedIds = this.selectedIds.filter(id => ids.has(id));
                } else {
                    this.loadError = res.msg ?? "";
                    this.$root.toastRes(res);
                }
            });
        },

        imageName(image) {
            return image.tags.length > 0 ? image.tags.join(", ") : image.shortId;
        },

        toggleSelect(image) {
            if (this.selectedIds.includes(image.id)) {
                this.selectedIds = this.selectedIds.filter(id => id !== image.id);
            } else {
                this.selectedIds.push(image.id);
            }
        },

        clearSelection() {
            this.selectedIds = [];
        },

        askRemove(image) {
            this.pendingRemoval = [ image ];
            this.removeConfirm.show();
        },

        askRemoveSelected() {
            this.pendingRemoval = this.images.filter(image => this.selectedIds.includes(image.id));
            this.removeConfirm.show();
        },

        confirmRemove() {
            const ids = this.pendingRemoval.map(image => image.id);
            if (ids.length === 0) {
                return;
            }

            this.$root.emitServer("removeDockerImages", ids, (res) => {
                this.$root.toastRes(res);
                this.pendingRemoval = [];
                this.clearSelection();
                this.loadImages();
            });
        },

        askPrune(all) {
            this.pruneAll = all;
            this.pruneConfirm.show();
        },

        confirmPrune() {
            this.$root.emitServer("pruneDockerImages", { all: this.pruneAll }, (res) => {
                this.$root.toastRes(res);
                this.clearSelection();
                this.loadImages();
            });
        },
    },
};
</script>
