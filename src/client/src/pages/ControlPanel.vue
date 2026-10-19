<template>
    <PageContainer>
        <PageHeader :title="$t('controlPanel')" :description="$t('controlPanelDescription')" />

        <Tabs v-model="tab" class="gap-6">
            <TabsList class="max-w-full justify-start overflow-x-auto">
                <TabsTrigger v-for="item in tabs" :key="item.key" :value="item.key" as-child>
                    <router-link :to="`/control-panel/${item.key}`" class="no-underline">
                        <app-icon :icon="item.icon" />
                        {{ $t(item.label) }}
                    </router-link>
                </TabsTrigger>
            </TabsList>

            <router-view v-slot="{ Component }">
                <component :is="Component" />
            </router-view>
        </Tabs>
    </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { settingsContextKey, type SettingsContext } from "../context";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

const { getSocket } = useSocket();
const { toastRes } = useToast();
const route = useRoute();
const router = useRouter();

const settings = ref<Record<string, unknown>>({});
const settingsLoaded = ref(false);

/** Tabs shown across the Control Panel; each is its own lazy-loaded route. */
const tabs = [
    {
        key: "account",
        label: "Account",
        icon: "user",
    },
    {
        key: "general",
        label: "General",
        icon: "cog",
    },
    {
        key: "security",
        label: "Security",
        icon: "security",
    },
    {
        key: "environment",
        label: "Environment",
        icon: "file-code",
    },
];

/** The active tab, derived from the last URL segment (defaults to `account`). */
const currentTab = computed<string>(() => {
    const segment = route.path.split("/").pop();
    return segment && segment !== "control-panel" ? segment : "account";
});

// Two-way binding so clicking a tab navigates and a URL change selects the tab.
const tab = computed<string>({
    get: () => currentTab.value,
    set: (value) => {
        void router.push(`/control-panel/${value}`);
    },
});

onMounted(() => {
    loadSettings();
});

/** Load settings from the server. */
function loadSettings() : void {
    (getSocket().emit as (event : string, cb : (res : SocketResult & { data?: Record<string, unknown> }) => void) => void)("getSettings", (res) => {
        settings.value = res.data ?? {};
        settingsLoaded.value = true;
    });
}

/**
 * Save the current settings.
 * @param callback Optional callback run after a successful save
 * @param currentPassword Only needed when disabling auth
 * @returns {void}
 */
function saveSettings(callback? : () => void, currentPassword? : string) : void {
    (getSocket().emit as (event : string, data : unknown, pass : string | undefined, cb : (res : SocketResult) => void) => void)("setSettings", settings.value, currentPassword, (res) => {
        toastRes(res);
        loadSettings();

        if (callback) {
            callback();
        }
    });
}

provide<SettingsContext>(settingsContextKey, {
    getSettings: () => settings.value,
    saveSettings: (callback? : () => void, currentPassword? : string) => saveSettings(callback, currentPassword),
    isSettingsLoaded: () => settingsLoaded.value,
});
</script>
