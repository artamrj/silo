import { defineComponent } from "vue";

export default defineComponent({
    data() {
        return {
            system: (window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light",
            userTheme: localStorage.theme,
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

        this.systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.systemQuery.addEventListener("change", this.onSystemChange);
    },

    beforeUnmount() {
        this.systemQuery?.removeEventListener("change", this.onSystemChange);
    },

    methods: {
        /**
         * Advance the theme in the order light -> dark -> auto -> light.
         * @returns {void}
         */
        cycleTheme() {
            const order = [ "light", "dark", "auto" ];
            const current = order.indexOf(this.userTheme);
            this.userTheme = order[(current + 1) % order.length];
        },

        /**
         * Track OS theme so `auto` follows it live.
         * @param {MediaQueryListEvent} event Media query change event
         * @returns {void}
         */
        onSystemChange(event) {
            this.system = event.matches ? "dark" : "light";
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

