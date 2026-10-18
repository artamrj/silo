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

        <!-- Desktop header -->
        <header v-if="! $root.isMobile" class="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur">
            <div class="flex min-h-16 items-center justify-between gap-6 px-6">
                <router-link to="/" class="flex items-center gap-2.5 font-bold text-ink no-underline">
                    <object width="32" height="32" data="/icon.svg" />
                    <span class="text-xl">Silo</span>
                </router-link>

                <nav v-if="$root.loggedIn" class="flex items-center gap-1" :aria-label="$t('Main navigation')">
                    <router-link to="/" class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-muted no-underline hover:bg-subtle hover:text-ink aria-[current=page]:bg-subtle aria-[current=page]:text-ink">
                        <app-icon icon="home" /> {{ $t("home") }}
                    </router-link>

                    <router-link to="/console" class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-muted no-underline hover:bg-subtle hover:text-ink aria-[current=page]:bg-subtle aria-[current=page]:text-ink">
                        <app-icon icon="terminal" /> {{ $t("console") }}
                    </router-link>

                    <details class="relative">
                        <summary class="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm text-ink hover:bg-subtle [&::-webkit-details-marker]:hidden">
                            <span class="flex size-7 items-center justify-center rounded-full bg-primary-fill text-xs font-bold text-white" aria-hidden="true">{{ $root.usernameFirstChar }}</span>
                            <span class="sr-only">{{ $t("Open user menu") }}</span>
                            <app-icon icon="angle-down" aria-hidden="true" />
                        </summary>

                        <ul class="menu absolute right-0 top-[calc(100%+8px)] z-50">
                            <li class="px-3 py-2 text-sm">
                                <i18n-t v-if="$root.username != null" tag="span" keypath="signedInDisp">
                                    <strong>{{ $root.username }}</strong>
                                </i18n-t>
                                <span v-if="$root.username == null">{{ $t("signedInDispDisabled") }}</span>
                            </li>

                            <li><hr class="my-1 border-t border-line"></li>

                            <li>
                                <button class="menu-item" @click="scanFolder">
                                    <app-icon icon="arrows-rotate" /> {{ $t("scanFolder") }}
                                </button>
                            </li>

                            <li>
                                <router-link to="/settings/general" class="menu-item no-underline">
                                    <app-icon icon="cog" /> {{ $t("Settings") }}
                                </router-link>
                            </li>

                            <li>
                                <button class="menu-item" @click="$root.logout">
                                    <app-icon icon="sign-out-alt" />
                                    {{ $t("Logout") }}
                                </button>
                            </li>
                        </ul>
                    </details>
                </nav>
            </div>
        </header>

        <main id="main-content" tabindex="-1" class="w-full pb-20 md:pb-0">
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

            <router-link to="/settings/general" class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-ink-muted no-underline aria-[current=page]:font-semibold aria-[current=page]:text-primary">
                <app-icon icon="cog" size="lg" />
                {{ $t("Settings") }}
            </router-link>
        </nav>
    </div>
</template>

<script>
import Login from "../components/Login.vue";

export default {

    components: {
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

    methods: {
        scanFolder() {
            this.$root.emitServer("requestStackList", (res) => {
                this.$root.toastRes(res);
            });
        },
    },

};
</script>
