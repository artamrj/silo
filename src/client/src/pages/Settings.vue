<template>
    <div>
        <h1 v-show="show" class="mb-3">
            {{ $t("Settings") }}
        </h1>

        <div class="shadow-box shadow-box-settings">
            <div class="row">
                <div v-if="showSubMenu" class="settings-menu col-lg-3 col-md-5">
                    <router-link
                        v-for="(item, key) in subMenus"
                        :key="key"
                        :to="`/settings/${key}`"
                    >
                        <div class="menu-item">
                            <app-icon :icon="item.icon" />
                            {{ item.title }}
                        </div>
                    </router-link>

                    <!-- Logout Button -->
                    <a v-if="$root.isMobile && $root.loggedIn && $root.socket.token !== 'autoLogin'" class="logout" @click.prevent="$root.logout">
                        <div class="menu-item">
                            <app-icon icon="sign-out-alt" />
                            {{ $t("Logout") }}
                        </div>
                    </a>
                </div>
                <div class="settings-content col-lg-9 col-md-7">
                    <div v-if="currentPage" class="settings-content-header">
                        {{ subMenus[currentPage].title }}
                    </div>
                    <div class="mx-3">
                        <router-view v-slot="{ Component }">
                            <transition name="slide-fade" appear>
                                <component :is="Component" />
                            </transition>
                        </router-view>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { useRoute } from "vue-router";

export default {
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
                maintenance: {
                    title: "Maintenance",
                    icon: "wrench",
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

<style scoped>

.shadow-box-settings {
    padding: 0;
    overflow: hidden;
    min-height: calc(100vh - 155px);
}

.shadow-box-settings > .row {
    min-height: inherit;
    margin: 0;
}

footer {
    color: #aaa;
    font-size: 13px;
    margin-top: 20px;
    padding-bottom: 30px;
    text-align: center;
}

.settings-menu {
    a {
        text-decoration: none !important;
    }

    .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 10px;
        margin: 4px;
        padding: 10px 12px;
        cursor: pointer;
        border-left-width: 0;
        transition: all ease-in-out 0.1s;
    }

    .menu-item:hover {
        background: #e7faec;

        .dark & {
            background: #161b22;
        }
    }

    .active .menu-item {
        background: var(--primary-soft);
        color: var(--primary);

        .dark & {
            background: #161b22;
        }
    }
}

.settings-content {
    border-left: 1px solid var(--border);

    .settings-content-header {
        border-bottom: 1px solid var(--border);
        padding: 18px 24px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.02em;

        .dark & {
            background: #161b22;
            border-bottom: 0;
        }

        .mobile & {
            padding: 15px 0 0 0;

            .dark & {
                background-color: transparent;
            }
        }
    }
}

.settings-menu {
    padding: 14px;
}

.logout {
    color: #dc3545 !important;
}
</style>
