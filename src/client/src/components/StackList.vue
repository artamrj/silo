<template>
    <div class="shadow-box stack-panel mb-3">
        <div class="list-header">
            <div class="header-top">
                <div class="placeholder"></div>
                <div class="search-wrapper">
                    <a v-if="searchText == ''" class="search-icon">
                        <app-icon icon="search" />
                    </a>
                    <a v-if="searchText != ''" class="search-icon" style="cursor: pointer" @click="clearSearchText">
                        <app-icon icon="times" />
                    </a>
                    <form>
                        <input v-model="searchText" class="form-control search-input" autocomplete="off" />
                    </form>
                </div>
            </div>
        </div>
        <div ref="stackList" class="stack-list" :class="{ scrollbar: scrollbar }" :style="stackListStyle">
            <div v-if="filteredStackList.length === 0" class="empty-stacks">
                <div class="empty-stacks-icon"><app-icon icon="warehouse" /></div>
                <strong>{{ $t("No Stacks") }}</strong>
                <router-link to="/compose">{{ $t("addFirstStackMsg") }}</router-link>
            </div>
            <div class="stack-list-inner">
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

        stackListStyle() {
            let listHeaderHeight = 60;

            return {
                "height": `calc(100% - ${listHeaderHeight}px)`
            };
        },
    },
    mounted() {
    },
    beforeUnmount() {
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

<style scoped>

.stack-panel {
    height: calc(100vh - 155px);
    min-height: 420px;
    max-height: 900px;
    position: sticky;
    top: 96px;
    overflow: hidden;
}

.small-padding {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.list-header {
    border-bottom: 1px solid var(--border);
    border-radius: 10px 10px 0 0;
    margin: -10px;
    margin-bottom: 10px;
    padding: 10px;

    .dark & {
        background-color: #161b22;
        border-bottom: 0;
    }
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-filter {
    display: flex;
    align-items: center;
}

@media (max-width: 770px) {
    .list-header {
        margin: -20px;
        margin-bottom: 10px;
        padding: 5px;
    }
}

.search-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
}

.search-icon {
    padding: 10px;
    color: var(--text-muted);

    /* Clear filter button */
    svg[data-icon="times"] {
        cursor: pointer;
        transition: all ease-in-out 0.1s;

        &:hover {
            opacity: 0.5;
        }
    }
}

.search-input {
    width: 100%;
    min-width: 0;
}

.search-wrapper form {
    flex: 1;
}

.stack-item {
    width: 100%;
}

.empty-stacks {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    color: var(--text-muted);
    text-align: center;
}

.empty-stacks-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: var(--primary-soft);
    color: var(--primary);
    font-size: 22px;
}

.tags {
    margin-top: 4px;
    padding-left: 67px;
    display: flex;
    flex-wrap: wrap;
    gap: 0;
}

.bottom-style {
    padding-left: 67px;
    margin-top: 5px;
}

.selection-controls {
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 10px;
}

</style>
