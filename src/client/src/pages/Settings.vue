<template>
    <PageContainer wide fill>
        <h1 v-show="show" class="mb-5 tracking-tight">
            {{ $t("Settings") }}
        </h1>

        <div class="card flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-1.5 lg:flex-row">
            <nav class="shrink-0 space-y-1 p-2 lg:w-64" :aria-label="$t('Settings')">
                <Button
                    v-for="(item, key) in subMenus"
                    :key="key"
                    as-child
                    variant="ghost"
                    class="w-full justify-start text-muted-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                    <router-link :to="`/settings/${key}`" :aria-current="currentPage === key ? 'page' : undefined">
                        <app-icon :icon="item.icon" />
                        {{ $t(item.title) }}
                    </router-link>
                </Button>
            </nav>

            <section class="min-w-0 flex-1 overflow-hidden rounded-xl bg-background">
                <div v-if="currentPage" class="px-5 pt-4 text-xl font-bold tracking-tight">
                    {{ $t(subMenus[currentPage].title) }}
                </div>
                <div class="p-4">
                    <router-view v-slot="{ Component }">
                        <component :is="Component" />
                    </router-view>
                </div>
            </section>
        </div>
    </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import PageContainer from "../components/PageContainer.vue";
import { settingsContextKey, type SettingsContext } from "../context";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

const { getSocket } = useSocket();
const { toastRes, toastError } = useToast();
const route = useRoute();
const router = useRouter();

const show = ref(true);
const settings = ref<Record<string, unknown>>({});
const settingsLoaded = ref(false);

const currentPage = computed<string | null>(() => {
    const pathSplit = route.path.split("/");
    const pathEnd = pathSplit[pathSplit.length - 1];
    if (!pathEnd || pathEnd === "settings") {
        return null;
    }
    return pathEnd;
});

const subMenus = computed<Record<string, { title : string; icon : string }>>(() => ({
    general: {
        title: "general",
        icon: "cog",
    },
    security: {
        title: "Security",
        icon: "security",
    },
    globalEnv: {
        title: "GlobalEnv",
        icon: "file-code",
    },
    about: {
        title: "About",
        icon: "home",
    },
}));

onMounted(() => {
    loadSettings();
    loadGeneralPage();
});

/** Send bare /settings visitors to the general page. */
function loadGeneralPage() : void {
    if (!currentPage.value) {
        router.push("/settings/general");
    }
}

/** Load settings from server */
function loadSettings() : void {
    (getSocket().emit as (event : string, cb : (res : SocketResult & { data?: Record<string, unknown> }) => void) => void)("getSettings", (res) => {
        settings.value = res.data ?? {};
        settingsLoaded.value = true;
    });
}

/**
 * Ensure settings are valid
 * @returns Object containing success state and error msg
 */
function validateSettings() : { success : boolean; msg : string } {
    const keepDays = Number(settings.value.keepDataPeriodDays);
    if (!Number.isNaN(keepDays) && keepDays < 0) {
        return {
            success: false,
            msg: "dataRetentionTimeError",
        };
    }
    return {
        success: true,
        msg: "",
    };
}

/**
 * Save Settings
 * @param callback Optional callback run after a successful save
 * @param currentPassword Only needed for disableAuth to true
 */
function saveSettings(callback? : () => void, currentPassword? : string) : void {
    const valid = validateSettings();
    if (valid.success) {
        (getSocket().emit as (event : string, data : unknown, pass : string | undefined, cb : (res : SocketResult) => void) => void)("setSettings", settings.value, currentPassword, (res) => {
            toastRes(res);
            loadSettings();

            if (callback) {
                callback();
            }
        });
    } else {
        toastError(valid.msg);
    }
}

provide<SettingsContext>(settingsContextKey, {
    getSettings: () => settings.value,
    saveSettings: (callback? : () => void, currentPassword? : string) => saveSettings(callback, currentPassword),
    isSettingsLoaded: () => settingsLoaded.value,
});
</script>
