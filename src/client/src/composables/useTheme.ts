import { computed, ref, watch } from "vue";

type ThemeName = "light" | "dark" | "auto";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

const system = ref<"light" | "dark">(prefersDark.matches ? "dark" : "light");
const userTheme = ref<ThemeName | null>(localStorage.getItem("theme") as ThemeName | null);

const theme = computed<"light" | "dark">(() => (userTheme.value === "auto" ? system.value : (userTheme.value === "dark" ? "dark" : "light")));

const isDark = computed(() => theme.value === "dark");

/** Update the theme color meta tag to match the active theme. */
function updateThemeColorMeta() : void {
    const meta = document.querySelector("#theme-color");
    if (!meta) {
        return;
    }
    meta.setAttribute("content", theme.value === "dark" ? "#0a0a0a" : "#ffffff");
}

/** Reflect the active theme onto `<body>` and the meta tag. */
function applyTheme(previous : string | null | undefined) : void {
    if (previous) {
        document.body.classList.remove(previous);
    }
    if (theme.value) {
        document.body.classList.add(theme.value);
    }
    updateThemeColorMeta();
}

// React to theme changes regardless of which caller changed the value.
watch(userTheme, (to) => {
    if (to) {
        localStorage.setItem("theme", to);
    }
});

watch(theme, (_to, from) => {
    applyTheme(from);
});

// Default to dark when nothing has been chosen yet, then apply immediately.
if (!userTheme.value) {
    userTheme.value = "dark";
}
applyTheme(null);

prefersDark.addEventListener("change", (event) => {
    system.value = event.matches ? "dark" : "light";
});

/**
 * Shared theme state (light / dark / auto). State lives at module scope so the
 * theme is global, mirroring the previous root mixin.
 */
export function useTheme() {
    /**
     * Advance the theme in the order light -> dark -> auto -> light.
     * @returns {void}
     */
    function cycleTheme() : void {
        const order : ThemeName[] = [ "light", "dark", "auto" ];
        const current = order.indexOf(userTheme.value as ThemeName);
        userTheme.value = order[(current + 1) % order.length];
    }

    return { system,
        userTheme,
        theme,
        isDark,
        cycleTheme };
}
