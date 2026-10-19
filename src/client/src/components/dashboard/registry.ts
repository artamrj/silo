import type { Component } from "vue";
import VitalsStrip from "./VitalsStrip.vue";
import FleetPanel from "./FleetPanel.vue";
import DiskUsageWidget from "./DiskUsageWidget.vue";
import ActivityFeed from "./ActivityFeed.vue";
import ToolsWidget from "./ToolsWidget.vue";
import ShortcutGrid from "./ShortcutGrid.vue";
import type { WidgetType } from "../../../../shared/dashboard";

/**
 * Widget type to renderer. Statically imported so the whole board lands in the
 * lazy `DashboardHome` chunk (which is unbudgeted) instead of the entry chunk.
 * Keep in sync with `WIDGET_TYPES` in `src/shared/dashboard.ts`.
 */
export const WIDGET_REGISTRY : Record<WidgetType, Component> = {
    vitals: VitalsStrip,
    fleet: FleetPanel,
    shortcuts: ShortcutGrid,
    disk: DiskUsageWidget,
    activity: ActivityFeed,
    tools: ToolsWidget,
};

/**
 * Resolve the component for a widget type.
 * @param type Widget kind
 * @returns The renderer, or undefined for an unknown type
 */
export function widgetComponent(type : WidgetType) : Component | undefined {
    return WIDGET_REGISTRY[type];
}
