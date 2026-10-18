import { toast as sonner } from "vue-sonner";

// Kept in sync with the <Toaster /> options mounted in App.vue.
export const TOAST_DURATION = 4500;
export const TOAST_MAX_VISIBLE = 4;

/**
 * Show a toast. Wraps vue-sonner so callers keep a small, stable API.
 * @param message Message to show, coerced to a string
 * @param kind Toast kind
 * @returns {void}
 */
function show(message : unknown, kind : "success" | "error") {
    sonner[kind](String(message ?? ""), { duration: TOAST_DURATION });
}

export const toast = {
    success: (message : unknown) => show(message, "success"),
    error: (message : unknown) => show(message, "error"),
};
