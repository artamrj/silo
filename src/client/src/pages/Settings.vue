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
                        {{ item.title }}
                    </router-link>
                </Button>
            </nav>

            <section class="min-w-0 flex-1 overflow-hidden rounded-xl bg-background">
                <div v-if="currentPage" class="px-5 pt-4 text-xl font-bold tracking-tight">
                    {{ subMenus[currentPage].title }}
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

<script>
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import PageContainer from "../components/PageContainer.vue";
import { settingsContextKey } from "../context";

export default {
    components: {
        Button,
        PageContainer,
    },
    provide() {
        return {
            [settingsContextKey]: {
                getSettings: () => this.settings,
                saveSettings: (callback, currentPassword) => this.saveSettings(callback, currentPassword),
                isSettingsLoaded: () => this.settingsLoaded,
            },
        };
    },

    data() {
        return {
            show: true,
            settings: {},
            settingsLoaded: false,
        };
    },

    computed: {
        currentPage() {
            let pathSplit = useRoute().path.split("/");
            let pathEnd = pathSplit[pathSplit.length - 1];
            if (!pathEnd || pathEnd === "settings") {
                return null;
            }
            return pathEnd;
        },

        subMenus() {
            return {
                general: {
                    title: this.$t("general"),
                    icon: "cog",
                },
                security: {
                    title: this.$t("Security"),
                    icon: "security",
                },
                globalEnv: {
                    title: this.$t("GlobalEnv"),
                    icon: "file-code",
                },
                about: {
                    title: this.$t("About"),
                    icon: "home",
                },
            };
        },
    },

    mounted() {
        this.loadSettings();
        this.loadGeneralPage();
    },

    methods: {

        /** Send bare /settings visitors to the general page. */
        loadGeneralPage() {
            if (!this.currentPage) {
                this.$router.push("/settings/general");
            }
        },

        /** Load settings from server */
        loadSettings() {
            this.$root.getSocket().emit("getSettings", (res) => {
                this.settings = res.data;
                this.settingsLoaded = true;
            });
        },

        /**
         * Callback for saving settings
         * @callback saveSettingsCB
         * @param {Object} res Result of operation
         */

        /**
         * Save Settings
         * @param {saveSettingsCB} [callback]
         * @param {string} [currentPassword] Only need for disableAuth to true
         */
        saveSettings(callback, currentPassword) {
            let valid = this.validateSettings();
            if (valid.success) {
                this.$root.getSocket().emit("setSettings", this.settings, currentPassword, (res) => {
                    this.$root.toastRes(res);
                    this.loadSettings();

                    if (callback) {
                        callback();
                    }
                });
            } else {
                this.$root.toastError(valid.msg);
            }
        },

        /**
         * Ensure settings are valid
         * @returns {Object} Contains success state and error msg
         */
        validateSettings() {
            if (this.settings.keepDataPeriodDays < 0) {
                return {
                    success: false,
                    msg: this.$t("dataRetentionTimeError"),
                };
            }
            return {
                success: true,
                msg: "",
            };
        },
    }
};
</script>
