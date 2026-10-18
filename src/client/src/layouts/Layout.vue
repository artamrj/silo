<template>
    <div :class="classes">
        <a v-if="$root.loggedIn" href="#main-content" class="skip-link">{{ $t("skipToContent") }}</a>

        <div v-if="! $root.socketIO.connected && ! $root.socketIO.firstConnect" class="fixed inset-x-0 top-0 z-[99999] bg-danger-fill px-4 py-1 text-center text-sm text-white">
            {{ $root.socketIO.connectionErrorMsg }}
            <span v-if="$root.socketIO.showReverseProxyGuide">
                {{ $t("reverseProxyMsg1") }}
                <a class="text-white underline" href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">{{ $t("reverseProxyMsg2") }}</a>
            </span>
        </div>

        <!-- Desktop sidebar (replaces the old top header entirely) -->
        <AppSidebar v-if="! $root.isMobile && $root.loggedIn" />

        <main id="main-content" tabindex="-1" class="w-full pb-20 md:pb-0 md:pl-24">
            <div v-if="$root.socketIO.connecting" class="px-6 py-12 text-center">
                <h4>{{ $t("connecting...") }}</h4>
            </div>

            <router-view v-if="$root.loggedIn" />
            <Login v-if="! $root.loggedIn && $root.allowLoginDialog" />
        </main>

        <!-- Mobile bottom nav -->
        <nav
            v-if="$root.isMobile && $root.loggedIn"
            class="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
            :aria-label="$t('Main navigation')"
        >
            <router-link to="/" class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-ink-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                <app-icon icon="home" size="lg" />
                {{ $t("home") }}
            </router-link>

            <router-link to="/console" class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-ink-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                <app-icon icon="terminal" size="lg" />
                {{ $t("console") }}
            </router-link>

            <router-link to="/stacks" class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-ink-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                <app-icon icon="warehouse" size="lg" />
                {{ $t("Stacks") }}
            </router-link>

            <router-link to="/settings/general" class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-ink-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                <app-icon icon="cog" size="lg" />
                {{ $t("Settings") }}
            </router-link>
        </nav>
    </div>
</template>

<script>
import AppSidebar from "../components/AppSidebar.vue";
import Login from "../components/Login.vue";

export default {

    components: {
        AppSidebar,
        Login,
    },

    computed: {

        // Theme or Mobile
        classes() {
            const classes = {};
            classes[this.$root.theme] = true;
            classes["mobile"] = this.$root.isMobile;
            return classes;
        },

    },

};
</script>
