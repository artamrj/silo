import { defineComponent } from "vue";

export default defineComponent({
    data() {
        return {
            system: (window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light",
            userTheme: localStorage.theme,
            isMobile: window.matchMedia("(max-width: 768px)").matches,
            path: "",
        };
    },

    computed: {
        theme() {
            if (this.userTheme === "auto") {
                return this.system;
            }
            return this.userTheme;
        },

        isDark() {
            return this.theme === "dark";
        }
    },

    watch: {
        "$route.fullPath"(path) {
            this.path = path;
        },

        userTheme(to, from) {
            localStorage.theme = to;
        },

        theme(to, from) {
            document.body.classList.remove(from);
            document.body.classList.add(this.theme);
            this.updateThemeColorMeta();
        },
    },

    mounted() {
        // Default Dark
        if (! this.userTheme) {
            this.userTheme = "dark";
        }

        document.body.classList.add(this.theme);
        this.updateThemeColorMeta();

        this.mobileQuery = window.matchMedia("(max-width: 768px)");
        this.mobileQuery.addEventListener("change", this.onMobileChange);
    },

    beforeUnmount() {
        this.mobileQuery?.removeEventListener("change", this.onMobileChange);
    },

    methods: {
        /**
         * Track viewport width to switch between mobile and desktop layouts.
         * @param {MediaQueryListEvent} event Media query change event
         * @returns {void}
         */
        onMobileChange(event) {
            this.isMobile = event.matches;
        },

        /**
         * Update the theme color meta tag
         * @returns {void}
         */
        updateThemeColorMeta() {
            if (this.theme === "dark") {
                document.querySelector("#theme-color").setAttribute("content", "#0a0a0a");
            } else {
                document.querySelector("#theme-color").setAttribute("content", "#ffffff");
            }
        }
    }
});

