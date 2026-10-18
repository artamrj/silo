<template>
    <div>
        <h1 v-show="show" class="mb-3">
            {{ $t("Settings") }}
        </h1>

        <div class="card flex min-h-[calc(100vh-155px)] flex-col overflow-hidden p-0 lg:flex-row">
            <nav v-if="showSubMenu" class="shrink-0 p-3.5 lg:w-64 lg:border-r lg:border-line" :aria-label="$t('Settings')">
                <router-link
                    v-for="(item, key) in subMenus"
                    :key="key"
                    :to="`/settings/${key}`"
                    class="group no-underline"
                    :aria-current="currentPage === key ? 'page' : undefined"
                >
                    <div class="menu-item group-aria-[current=page]:bg-primary-soft group-aria-[current=page]:text-primary">
                        <app-icon :icon="item.icon" />
                        {{ item.title }}
                    </div>
                </router-link>

                <!-- Logout Button -->
                <button v-if="$root.isMobile && $root.loggedIn && $root.socketIO.token !== 'autoLogin'" type="button" class="menu-item text-danger" @click="$root.logout">
                    <app-icon icon="sign-out-alt" />
                    {{ $t("Logout") }}
                </button>
            </nav>

            <section class="min-w-0 flex-1 lg:border-l lg:border-line" :class="{ 'lg:border-l-0': !showSubMenu }">
                <div v-if="currentPage" class="border-b border-line px-5 py-4 text-xl font-bold tracking-tight">
                    {{ subMenus[currentPage].title }}
                </div>
                <div class="p-4">
                    <router-view v-slot="{ Component }">
                        <transition name="slide-fade" appear>
                            <component :is="Component" />
                        </transition>
                    </router-view>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
import { useRoute } from "vue-router";
import { settingsContextKey } from "../context";

export default {
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
