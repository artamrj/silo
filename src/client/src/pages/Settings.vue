<template>
    <PageContainer wide fill>
        <h1 v-show="show" class="mb-5 tracking-tight">
            {{ $t("Settings") }}
        </h1>

        <div class="card flex min-h-0 flex-1 flex-col overflow-hidden p-0 lg:flex-row">
            <nav v-if="showSubMenu" class="shrink-0 space-y-1 p-3.5 lg:w-64 lg:border-r lg:border-line" :aria-label="$t('Settings')">
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

                <!-- Logout Button -->
                <Button
                    v-if="$root.isMobile && $root.loggedIn && $root.socketIO.token !== 'autoLogin'"
                    type="button"
                    variant="ghost"
                    class="w-full justify-start text-destructive hover:text-destructive"
                    @click="$root.logout"
                >
                    <app-icon icon="sign-out-alt" />
                    {{ $t("Logout") }}
                </Button>
            </nav>

            <section class="min-w-0 flex-1 lg:border-l lg:border-line" :class="{ 'lg:border-l-0': !showSubMenu }">
                <div v-if="currentPage" class="border-b border-line px-5 py-4 text-xl font-bold tracking-tight">
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

        showSubMenu() {
            if (this.$root.isMobile) {
                return !this.currentPage;
            } else {
                return true;
            }
        },

        subMenus() {
            return {
                general: {
                    title: this.$t("general"),
                    icon: "cog",
                },
                appearance: {
                    title: this.$t("Appearance"),
                    icon: "palette",
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

    watch: {
        "$root.isMobile"() {
            this.loadGeneralPage();
        }
    },

    mounted() {
        this.loadSettings();
        this.loadGeneralPage();
    },

    methods: {

        /**
         * Load the general settings page
         * For desktop only, on mobile do nothing
         */
        loadGeneralPage() {
            if (!this.currentPage && !this.$root.isMobile) {
                this.$router.push("/settings/appearance");
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
