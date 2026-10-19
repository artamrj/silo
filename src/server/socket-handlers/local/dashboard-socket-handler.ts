import { SocketHandler } from "../../socket-handler";
import { SiloServer } from "../../silo-server";
import { callbackError, callbackResult, checkLogin, SiloSocket, validate } from "../../utils/socket";
import { dashboardConfigSchema } from "../../../shared/schemas";
import { mergeDashboard } from "../../../shared/dashboard";
import { Settings } from "../../settings";
import { log } from "../../log";

/** Setting key the dashboard config is stored under. */
const DASHBOARD_SETTING_KEY = "dashboard";

/**
 * Persists the dashboard layout and shortcuts. The board lives in a single
 * `setting` row so it needs no schema migration; the payload is validated here
 * and normalized with `mergeDashboard` so a stale/partial stored value still
 * renders.
 */
export class DashboardSocketHandler extends SocketHandler {
    create(socket : SiloSocket, server : SiloServer) {
        socket.on("getDashboard", async (callback) => {
            try {
                checkLogin(socket);

                let stored : unknown;
                try {
                    stored = await Settings.get(DASHBOARD_SETTING_KEY);
                } catch (e) {
                    // A corrupt row must not break the dashboard: fall back to defaults.
                    log.warn("dashboard", `Failed to read dashboard setting: ${String(e)}`);
                    stored = undefined;
                }

                callbackResult({
                    ok: true,
                    dashboard: mergeDashboard(stored),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("setDashboard", async (rawConfig : unknown, callback) => {
            try {
                checkLogin(socket);

                const config = validate(dashboardConfigSchema, rawConfig);
                await Settings.set(DASHBOARD_SETTING_KEY, config, DASHBOARD_SETTING_KEY);

                callbackResult({
                    ok: true,
                    msg: "Saved",
                    msgi18n: true,
                    dashboard: mergeDashboard(config),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
