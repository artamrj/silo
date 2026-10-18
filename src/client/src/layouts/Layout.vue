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
                    <Button as-child variant="ghost" class="text-ink-muted hover:text-ink aria-[current=page]:bg-subtle aria-[current=page]:text-ink">
                        <router-link to="/">
                            <app-icon icon="home" /> {{ $t("home") }}
                        </router-link>
                    </Button>

                    <Button as-child variant="ghost" class="text-ink-muted hover:text-ink aria-[current=page]:bg-subtle aria-[current=page]:text-ink">
                        <router-link to="/console">
                            <app-icon icon="terminal" /> {{ $t("console") }}
                        </router-link>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button variant="ghost" class="px-2 text-ink hover:bg-subtle">
                                <span class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">{{ $root.usernameFirstChar }}</span>
                                <span class="sr-only">{{ $t("Open user menu") }}</span>
                                <app-icon icon="angle-down" aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" class="w-56">
                            <DropdownMenuLabel>
                                <i18n-t v-if="$root.username != null" tag="span" keypath="signedInDisp">
                                    <strong>{{ $root.username }}</strong>
                                </i18n-t>
                                <span v-if="$root.username == null">{{ $t("signedInDispDisabled") }}</span>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem @select="scanFolder">
                                <app-icon icon="arrows-rotate" /> {{ $t("scanFolder") }}
                            </DropdownMenuItem>

                            <DropdownMenuItem as-child>
                                <router-link to="/settings/general" class="no-underline">
                                    <app-icon icon="cog" /> {{ $t("Settings") }}
                                </router-link>
                            </DropdownMenuItem>

                            <DropdownMenuItem variant="destructive" @select="$root.logout">
                                <app-icon icon="sign-out-alt" />
                                {{ $t("Logout") }}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default {

    components: {
        Login,
        Button,
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuLabel,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
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
