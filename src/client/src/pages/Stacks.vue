<template>
    <div>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 class="mb-0">{{ $t("Stacks") }}</h1>

            <router-link to="/compose" class="button button-primary no-underline">
                <app-icon icon="plus" /> {{ $t("compose") }}
            </router-link>
        </div>

        <div class="card mb-4 p-2.5">
            <div class="flex items-center gap-1">
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
                    @click="clearSearchText"
                >
                    <app-icon icon="times" />
                </button>

                <input v-model="searchText" class="field min-w-0 flex-1" autocomplete="off" :placeholder="$t('Search')" :aria-label="$t('Search')" />
            </div>
        </div>

        <div :aria-busy="!loaded">
            <!-- Skeleton while the first stack list arrives -->
            <div v-if="!loaded" class="flex flex-col gap-2.5" aria-hidden="true">
                <div v-for="n in 6" :key="n" class="skeleton h-13 w-full" />
            </div>

            <div v-else-if="filteredStackList.length === 0" class="card flex min-h-[260px] flex-col items-center justify-center gap-2.5 p-6 text-center text-ink-muted">
                <div class="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <app-icon icon="warehouse" size="lg" />
                </div>
                <strong>{{ $t("No Stacks") }}</strong>
                <router-link to="/compose">{{ $t("addFirstStackMsg") }}</router-link>
            </div>

            <div v-else class="card flex flex-col overflow-hidden p-0">
                <StackListItem
                    v-for="(item, index) in filteredStackList"
                    :key="index" :stack="item"
                />
            </div>
        </div>
    </div>
</template>

<script>
import StackListItem from "../components/StackListItem.vue";
import stackListMixin from "../mixins/stackList";

export default {
    components: {
        StackListItem,
    },
    mixins: [ stackListMixin ],
};
</script>
