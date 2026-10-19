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
                        :class="iconButtonClass"
                        :aria-label="$t('Silo Dashboard')"
                    >
                        <img
                            src="/icon.svg"
                            alt=""
                            width="40"
                            height="40"
                            draggable="false"
                            class="pointer-events-none size-10 rounded-xl select-none"
                        />
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
                        <ThemeToggle />
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("Theme") }}: {{ $t(themeLabel) }}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <router-link to="/control-panel/account" :class="iconButtonClass" :aria-label="$t('controlPanel')">
                            <app-icon icon="sliders" size="lg" />
                        </router-link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("controlPanel") }}</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger as-child>
                        <router-link to="/console" :class="iconButtonClass" :aria-label="$t('console')">
                            <app-icon icon="terminal" size="lg" />
                        </router-link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{{ $t("console") }}</TooltipContent>
                </Tooltip>
            </div>
        </nav>
    </TooltipProvider>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ThemeToggle from "./ThemeToggle.vue";
import { useSocket } from "../composables/useSocket";
import { useTheme } from "../composables/useTheme";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

const { emitServer } = useSocket();
const { userTheme } = useTheme();
const { toastRes } = useToast();

// Shared styling for every icon-only navigation control.
const iconButtonClass = "group flex size-11 items-center justify-center rounded-xl text-ink-muted no-underline transition-all duration-200 hover:scale-105 hover:bg-accent hover:text-ink hover:no-underline active:scale-95 aria-[current=page]:bg-accent aria-[current=page]:text-ink aria-[current=page]:shadow-sm aria-[current=page]:hover:bg-accent";

const navItems = [
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

/** Theme value -> i18n key for the tooltip. */
const themeLabels : Record<string, string> = {
    light: "Light",
    dark: "Dark",
    auto: "Auto",
};

/** i18n key for the current theme, shown in the tooltip. */
const themeLabel = computed(() => themeLabels[userTheme.value ?? ""] ?? "Dark");

/** Ask the server to rescan the stacks folder, then toast the result. */
function scanFolder() : void {
    emitServer("requestStackList", (res : SocketResult) => {
        toastRes(res);
    });
}
</script>
