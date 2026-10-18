const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Keep Tab navigation inside an open modal dialog.
 * @param container Modal content element that owns the focusable controls
 * @param event Tab keydown event
 * @returns {void}
 */
export function trapFocus(container: HTMLElement | null | undefined, event: KeyboardEvent) {
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable || focusable.length === 0) {
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
