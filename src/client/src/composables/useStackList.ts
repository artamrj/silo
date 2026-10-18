import { computed, ref } from "vue";
import { useSocket } from "./useSocket";
import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, UNKNOWN } from "../../../shared/utils";
import type { StackMeta } from "./types";

/**
 * Shared stack-list behaviour: free-text search state plus the filtered and
 * status-sorted view of the socket stack list. Used by both the compact aside
 * list and the full Stacks page so their ordering never diverges.
 */
export function useStackList() {
    const { completeStackList, stackListLoaded } = useSocket();
    const searchText = ref("");

    /** Has the first stack list payload arrived from the server? */
    const loaded = computed(() => stackListLoaded.value);

    /** The fully filtered and sorted list of stacks. */
    const filteredStackList = computed<StackMeta[]>(() => {
        let result = Object.values(completeStackList.value);

        result = result.filter(stack => {
            // filter by search text
            if (searchText.value !== "") {
                const loweredSearchText = searchText.value.toLowerCase();
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
    });

    /**
     * Clear the search bar.
     * @returns {void}
     */
    function clearSearchText() : void {
        searchText.value = "";
    }

    return { searchText,
        loaded,
        filteredStackList,
        clearSearchText };
}
