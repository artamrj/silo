import { i18n } from "../i18n";
import { toast } from "../toast";
import type { SocketResult } from "../../../shared/socket-events";

/**
 * Translate an i18n-aware message payload. Some server responses send either a
 * plain key or a `{ key, values }` object; both are resolved here.
 * @param msg Message from a socket response
 * @returns The translated string
 */
function translate(msg : unknown) : string {
    if (msg != null && typeof msg === "object") {
        const { key, values } = msg as { key : string; values? : Record<string, unknown> };
        return i18n.global.t(key, values ?? {});
    }
    return i18n.global.t(String(msg ?? ""));
}

/**
 * Shared toast helpers, backed by vue-sonner. Replaces the old `$root.toast*`
 * methods now that the app root is no longer an options-API store.
 */
export function useToast() {
    /**
     * Show a success or error toast dependant on the response status.
     * @param res Response object carrying `ok` and an optional message
     * @returns {void}
     */
    function toastRes(res : SocketResult) : void {
        const msg = res.msgi18n ? translate(res.msg) : String(res.msg ?? "");
        if (res.ok) {
            toast.success(msg);
        } else {
            toast.error(msg);
        }
    }

    /**
     * Show a translated success toast.
     * @param msg i18n key or literal message
     * @returns {void}
     */
    function toastSuccess(msg : string) : void {
        toast.success(i18n.global.t(msg));
    }

    /**
     * Show a translated error toast.
     * @param msg i18n key or literal message
     * @returns {void}
     */
    function toastError(msg : string) : void {
        toast.error(i18n.global.t(msg));
    }

    return { toastRes,
        toastSuccess,
        toastError };
}
