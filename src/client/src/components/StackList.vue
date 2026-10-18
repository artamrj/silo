<template>
    <div class="card flex max-h-[900px] min-h-[420px] flex-col overflow-hidden p-0 lg:sticky lg:top-24 lg:h-[calc(100vh-155px)]">
        <div class="border-b border-line p-2.5">
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

                <input v-model="searchText" class="field min-w-0 flex-1" autocomplete="off" :aria-label="$t('Search')" />
            </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto" :aria-busy="!loaded">
            <!-- Skeleton while the first stack list arrives -->
            <div v-if="!loaded" class="flex flex-col gap-2.5 p-3" aria-hidden="true">
                <div v-for="n in 6" :key="n" class="skeleton h-9 w-full" />
            </div>

            <div v-else-if="filteredStackList.length === 0" class="flex min-h-[220px] flex-col items-center justify-center gap-2.5 p-6 text-center text-ink-muted">
                <div class="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <app-icon icon="warehouse" size="lg" />
                </div>
                <strong>{{ $t("No Stacks") }}</strong>
                <router-link to="/compose">{{ $t("addFirstStackMsg") }}</router-link>
            </div>

            <div class="flex flex-col">
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
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, UNKNOWN } from "../../../shared/utils";

export default {
    components: {
        StackListItem,
    },
    props: {
        /** Should the scrollbar be shown */
        scrollbar: {
            type: Boolean,
        },
    },
    data() {
        return {
            searchText: "",
        };
    },
    computed: {
        /** Has the first stack list payload arrived from the server? */
        loaded() {
            return this.$root.stackListLoaded;
        },

        /**
         * Returns a sorted list of stacks based on the applied filters and search text.
         * @returns {Array} The sorted list of stacks.
         */
        filteredStackList() {
            let result = Object.values(this.$root.completeStackList);

            result = result.filter(stack => {
                // filter by search text
                if (this.searchText !== "") {
                    const loweredSearchText = this.searchText.toLowerCase();
                    return stack.name.toLowerCase().includes(loweredSearchText);
                }
                return true;
            });

            result.sort((m1, m2) => {

                // sort by managed by silo
                if (m1.isManagedBySilo && !m2.isManagedBySilo) {
                    return -1;
                } else if (!m1.isManagedBySilo && m2.isManagedBySilo) {
                    return 1;
                }

                // sort by status
                if (m1.status !== m2.status) {
                    if (m2.status === RUNNING) {
                        return 1;
                    } else if (m1.status === RUNNING) {
                        return -1;
                    } else if (m2.status === EXITED) {
                        return 1;
                    } else if (m1.status === EXITED) {
                        return -1;
                    } else if (m2.status === CREATED_STACK) {
                        return 1;
                    } else if (m1.status === CREATED_STACK) {
                        return -1;
                    } else if (m2.status === CREATED_FILE) {
                        return 1;
                    } else if (m1.status === CREATED_FILE) {
                        return -1;
                    } else if (m2.status === UNKNOWN) {
                        return 1;
                    } else if (m1.status === UNKNOWN) {
                        return -1;
                    }
                }
                return m1.name.localeCompare(m2.name);
            });

            return result;
        },
    },
    methods: {
        /**
         * Clear the search bar
         * @returns {void}
         */
        clearSearchText() {
            this.searchText = "";
        },
    },
};
</script>
