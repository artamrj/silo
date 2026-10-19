import { computed, ref } from "vue";
import { useSocket } from "./useSocket";
import { useToast } from "./useToast";
import { addItem, removeItem } from "../../../shared/bento";
import {
    DEFAULT_DASHBOARD,
    GRID_COLUMNS,
    cloneDashboard,
    createWidget,
    mergeDashboard,
    deriveLayout,
    SAFE_SHORTCUT_URL,
    type Breakpoint,
    type DashboardConfig,
    type Shortcut,
    type WidgetInstance,
    type WidgetType,
} from "../../../shared/dashboard";
import type { SocketResult } from "../../../shared/socket-events";

// Module-level state: every caller of `useDashboard()` shares one board.
const dashboard = ref<DashboardConfig>(cloneDashboard(DEFAULT_DASHBOARD));
const loaded = ref(false);
const loading = ref(false);
const saving = ref(false);
const dirty = ref(false);
const editing = ref(false);

/**
 * The grid is edited at one breakpoint at a time. `lg` is the source of truth;
 * the narrower layouts are derived from it when saving so a phone user is never
 * served a desktop layout squeezed into one column.
 */
const activeBreakpoint = ref<Breakpoint>("lg");

/** Build a settings-shaped payload from the reactive config. */
function snapshot(config : DashboardConfig) : DashboardConfig {
    const lg = config.layout.lg.map((item) => ({ ...item }));
    return {
        layout: {
            lg,
            md: deriveLayout(lg, GRID_COLUMNS.md),
            sm: deriveLayout(lg, GRID_COLUMNS.sm),
        },
        shortcuts: config.shortcuts.map((shortcut) => ({ ...shortcut })),
    };
}

/**
 * Dashboard layout + shortcuts state, persisted through the `dashboard`
 * setting. Grid math itself lives in `src/shared/bento.ts`; this composable
 * only owns the reactive board and the socket round-trip.
 */
export function useDashboard() {
    const { emitServer } = useSocket();
    const { toastSuccess, toastError } = useToast();

    /** Items at the breakpoint currently being edited/rendered. */
    const items = computed(() => dashboard.value.layout[activeBreakpoint.value]);

    const columns = computed(() => GRID_COLUMNS[activeBreakpoint.value]);

    /** Replace the active layout (called by the grid after drag/resize). */
    function updateLayout(next : WidgetInstance[]) : void {
        dashboard.value.layout[activeBreakpoint.value] = next;
        dirty.value = true;
    }

    /** Add a widget of `type` in the first free slot. */
    function addWidget(type : WidgetType) : void {
        const breakpoint = activeBreakpoint.value;
        dashboard.value.layout[breakpoint] = addItem(
            dashboard.value.layout[breakpoint], createWidget(type), GRID_COLUMNS[breakpoint]
        );
        dirty.value = true;
    }

    /** Remove a widget. */
    function removeWidget(id : string) : void {
        const breakpoint = activeBreakpoint.value;
        dashboard.value.layout[breakpoint] = removeItem(
            dashboard.value.layout[breakpoint], id, GRID_COLUMNS[breakpoint]
        );
        dirty.value = true;
    }

    /** Restore the default layout, keeping the user's shortcuts. */
    function resetLayout() : void {
        const shortcuts = dashboard.value.shortcuts;
        dashboard.value = cloneDashboard({ layout: DEFAULT_DASHBOARD.layout,
            shortcuts });
        dirty.value = true;
    }

    /** Add a shortcut card. */
    function addShortcut(shortcut : Shortcut) : void {
        if (!SAFE_SHORTCUT_URL.test(shortcut.url)) {
            return;
        }
        dashboard.value.shortcuts.push({ ...shortcut });
        dirty.value = true;
    }

    /** Replace a shortcut card in place, or append it when unknown. */
    function updateShortcut(shortcut : Shortcut) : void {
        const index = dashboard.value.shortcuts.findIndex((entry) => entry.id === shortcut.id);
        if (index === -1) {
            dashboard.value.shortcuts.push({ ...shortcut });
        } else {
            dashboard.value.shortcuts[index] = { ...shortcut };
        }
        dirty.value = true;
    }

    /** Remove a shortcut card. */
    function removeShortcut(id : string) : void {
        dashboard.value.shortcuts = dashboard.value.shortcuts.filter((entry) => entry.id !== id);
        dirty.value = true;
    }

    /** Load the stored board; falls back to defaults on failure. */
    function loadDashboard() : void {
        if (loading.value) {
            return;
        }
        loading.value = true;
        emitServer("getDashboard", (res : SocketResult & { dashboard?: DashboardConfig }) => {
            loading.value = false;
            if (res.ok && res.dashboard) {
                dashboard.value = mergeDashboard(res.dashboard);
                dirty.value = false;
            } else if (!res.ok) {
                toastError("loadError");
            }
            loaded.value = true;
        });
    }

    /** Persist the board and leave edit mode. */
    function saveDashboard() : void {
        if (saving.value) {
            return;
        }
        saving.value = true;
        emitServer("setDashboard", snapshot(dashboard.value), (res : SocketResult & { dashboard?: DashboardConfig }) => {
            saving.value = false;
            if (res.ok) {
                if (res.dashboard) {
                    dashboard.value = mergeDashboard(res.dashboard);
                }
                dirty.value = false;
                editing.value = false;
                toastSuccess("layoutSaved");
            } else {
                toastError("saveError");
            }
        });
    }

    /** Leave edit mode, discarding unsaved changes by reloading from the server. */
    function cancelEditing() : void {
        editing.value = false;
        if (dirty.value) {
            loadDashboard();
        }
    }

    return {
        // state
        dashboard,
        loaded,
        loading,
        saving,
        dirty,
        editing,
        activeBreakpoint,
        // derived
        items,
        columns,
        shortcuts: computed(() => dashboard.value.shortcuts),
        hasShortcuts: computed(() => dashboard.value.shortcuts.length > 0),
        // methods
        updateLayout,
        addWidget,
        removeWidget,
        resetLayout,
        addShortcut,
        updateShortcut,
        removeShortcut,
        loadDashboard,
        saveDashboard,
        cancelEditing,
    };
}
