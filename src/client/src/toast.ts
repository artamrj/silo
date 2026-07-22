type ToastKind = "success" | "error";

function show(message: unknown, kind: ToastKind) {
    const container = getContainer();
    const item = document.createElement("div");
    item.className = `silo-toast silo-toast-${kind}`;
    item.setAttribute("role", kind === "error" ? "alert" : "status");
    item.textContent = String(message ?? "");
    container.append(item);
    window.setTimeout(() => item.classList.add("silo-toast-visible"), 10);
    window.setTimeout(() => {
        item.classList.remove("silo-toast-visible");
        window.setTimeout(() => item.remove(), 200);
    }, 4500);
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
