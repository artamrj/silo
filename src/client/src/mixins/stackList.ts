import { defineComponent } from "vue";
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, UNKNOWN } from "../../../shared/utils";

/**
 * Shared stack-list behaviour: free-text search state plus the filtered and
 * status-sorted view of `$root.completeStackList`. Used by both the compact
 * aside list and the full Stacks page so their ordering never diverges.
 */
export default defineComponent({
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

        /** The fully filtered and sorted list of stacks. */
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
});
