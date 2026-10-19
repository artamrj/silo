import { computed, ref, watch } from "vue";

type ThemeName = "light" | "dark";

const userTheme = ref<ThemeName | null>(localStorage.getItem("theme") as ThemeName | null);

const theme = computed<"light" | "dark">(() => (userTheme.value === "dark" ? "dark" : "light"));

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

/**
 * Shared theme state (light / dark). State lives at module scope so the theme is
 * global, mirroring the previous root mixin.
 */
export function useTheme() {
    /**
     * Toggle the theme between light and dark.
     * @returns {void}
     */
    function toggleTheme() : void {
        userTheme.value = theme.value === "dark" ? "light" : "dark";
    }

    return { userTheme,
        theme,
        isDark,
        toggleTheme };
}
