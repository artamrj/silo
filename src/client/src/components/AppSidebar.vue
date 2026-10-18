<template>
    <TooltipProvider>
        <nav
            class="fixed top-4 bottom-4 left-4 z-50 flex w-16 flex-col items-center rounded-3xl border border-line bg-surface/80 p-2.5 shadow-lg backdrop-blur"
            :aria-label="$t('Main navigation')"
        >
            <!-- Logo -->
            <router-link
                to="/"
                class="flex size-11 shrink-0 items-center justify-center rounded-xl no-underline transition-transform duration-200 hover:scale-105 active:scale-95"
                :aria-label="$t('home')"
            >
                <object width="40" height="40" data="/icon.svg" class="rounded-xl" />
            </router-link>

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

                <Tooltip>
                    <TooltipTrigger as-child>
                        <button type="button" :class="iconButtonClass" :aria-label="$t('scanFolder')" @click="scanFolder">
                            <app-icon icon="arrows-rotate" size="lg" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("scanFolder") }}</TooltipContent>
                </Tooltip>
            </div>

            <!-- Pinned to the bottom -->
            <div class="mt-auto flex flex-col items-center gap-2 pb-1">
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

export default {
    components: {
        Separator,
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
                    to: "/",
                    icon: "home",
                    label: "home",
                },
                {
                    to: "/console",
                    icon: "terminal",
                    label: "console",
                },
                {
                    to: "/stacks",
                    icon: "warehouse",
                    label: "Stacks",
                },
            ];
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
