<template>
    <TooltipProvider>
        <nav
            class="silo-sidebar fixed top-[var(--sidebar-gap)] bottom-[var(--sidebar-gap)] left-[var(--sidebar-gap)] z-50 flex w-[var(--sidebar-w)] flex-col items-center rounded-3xl bg-surface/80 px-2.5 py-4 shadow-lg backdrop-blur"
            :aria-label="$t('Main navigation')"
        >
            <!-- Logo doubles as the dashboard entry point. -->
            <Tooltip>
                <TooltipTrigger as-child>
                    <router-link
                        to="/"
                        class="group flex size-11 shrink-0 items-center justify-center rounded-xl no-underline transition-all duration-200 hover:scale-105 active:scale-95 aria-[current=page]:bg-accent aria-[current=page]:shadow-sm"
                        :aria-label="$t('Silo Dashboard')"
                    >
                        <object width="40" height="40" data="/icon.svg" class="pointer-events-none rounded-xl" />
                    </router-link>
                </TooltipTrigger>
                <TooltipContent side="right">{{ $t("Silo Dashboard") }}</TooltipContent>
            </Tooltip>

            <!-- Primary navigation -->
            <div class="mt-6 flex flex-col items-center gap-2">
                <Tooltip v-for="item in navItems" :key="item.to">
                    <TooltipTrigger as-child>
                        <router-link :to="item.to" :class="iconButtonClass" :aria-label="$t(item.label)">
                            <app-icon :icon="item.icon" size="lg" />
                        </router-link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t(item.label) }}</TooltipContent>
                </Tooltip>
            </div>

            <!-- Pinned to the bottom -->
            <div class="mt-auto flex flex-col items-center gap-2 pb-1">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <button type="button" :class="iconButtonClass" :aria-label="$t('scanFolder')" @click="scanFolder">
                            <app-icon icon="arrows-rotate" size="lg" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("scanFolder") }}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <router-link to="/console" :class="iconButtonClass" :aria-label="$t('console')">
                            <app-icon icon="terminal" size="lg" />
                        </router-link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("console") }}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <ThemeToggle />
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("Theme") }}: {{ $t(themeLabel) }}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <router-link to="/settings/general" :class="iconButtonClass" :aria-label="$t('Settings')">
                            <app-icon icon="cog" size="lg" />
                        </router-link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("Settings") }}</TooltipContent>
                </Tooltip>

                <Separator class="my-1 w-8 bg-line" />

                <Tooltip>
                    <TooltipTrigger as-child>
                        <button
                            type="button"
                            class="flex size-11 items-center justify-center rounded-xl text-ink-muted transition-all duration-200 hover:scale-105 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                            :aria-label="$t('Logout')"
                            @click="$root.logout"
                        >
                            <app-icon icon="sign-out-alt" size="lg" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("Logout") }}</TooltipContent>
                </Tooltip>
            </div>
        </nav>
    </TooltipProvider>
</template>

<script>
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from "./ThemeToggle.vue";

export default {
    components: {
        Separator,
        ThemeToggle,
        Tooltip,
        TooltipContent,
        TooltipProvider,
        TooltipTrigger,
    },

    data() {
        return {
            // Shared styling for every icon-only navigation control.
            iconButtonClass: "group flex size-11 items-center justify-center rounded-xl text-ink-muted no-underline transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-ink hover:no-underline active:scale-95 aria-[current=page]:bg-accent aria-[current=page]:text-ink aria-[current=page]:shadow-sm aria-[current=page]:hover:bg-accent",
        };
    },

    computed: {
        navItems() {
            return [
                {
                    to: "/stacks",
                    icon: "warehouse",
                    label: "Stacks",
                },
                {
                    to: "/images",
                    icon: "box",
                    label: "Images",
                },
            ];
        },

        /** i18n key for the current theme, shown in the tooltip. */
        themeLabel() {
            return {
                light: "Light",
                dark: "Dark",
                auto: "Auto",
            }[this.$root.userTheme] ?? "Dark";
        },
    },

    methods: {
        /** Ask the server to rescan the stacks folder, then toast the result. */
        scanFolder() {
            this.$root.emitServer("requestStackList", (res) => {
                this.$root.toastRes(res);
            });
        },
    },
};
</script>
