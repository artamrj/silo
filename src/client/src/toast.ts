type ToastKind = "success" | "error";

const DISPLAY_TIME = 4500;
const MAX_TOASTS = 4;

function show(message: unknown, kind: ToastKind) {
    const container = getContainer();
    const item = document.createElement("div");
    item.className = `silo-toast silo-toast-${kind}`;
    item.setAttribute("role", kind === "error" ? "alert" : "status");
    // Toasts can be dismissed early, so they are reachable and operable by keyboard.
    item.tabIndex = 0;
    item.textContent = String(message ?? "");
    container.append(item);

    // Drop the oldest toasts so a burst of responses cannot cover the UI.
    while (container.childElementCount > MAX_TOASTS) {
        container.firstElementChild?.remove();
    }

    window.setTimeout(() => item.classList.add("silo-toast-visible"), 10);

    let dismissTimeout = window.setTimeout(dismiss, DISPLAY_TIME);

    item.addEventListener("click", onDismiss);
    item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onDismiss();
        }
    });

    function onDismiss() {
        window.clearTimeout(dismissTimeout);
        dismiss();
    }

    function dismiss() {
        item.classList.remove("silo-toast-visible");
        window.setTimeout(() => item.remove(), 200);
    }
}

function getContainer() {
    let container = document.querySelector<HTMLElement>(".silo-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "silo-toast-container";
        container.setAttribute("aria-live", "polite");
        document.body.append(container);
    }
    return container;
}

export const toast = {
    success: (message: unknown) => show(message, "success"),
    error: (message: unknown) => show(message, "error"),
};
