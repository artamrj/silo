import { createApp, defineComponent, h } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { AppIcon } from "./icon.js";
import { i18n } from "./i18n";

// CSS
import "vue-sonner/style.css";
import "./styles/main.css";

// Shared app-level state
import { useSocket } from "./composables/useSocket";

// Set Title
document.title = document.title + " - " + location.host;

const app = createApp(rootApp());

app.use(router);
app.use(i18n);
app.component("AppIcon", AppIcon);
app.mount("#app");

/**
 * Root Vue component. Its only job is to open the socket connection once the app
 * is created; all shared state now lives in composables.
 */
function rootApp() {
    return defineComponent({
        setup() {
            useSocket().initSocketIO();
        },
        render: () => h(App),
    });
}
