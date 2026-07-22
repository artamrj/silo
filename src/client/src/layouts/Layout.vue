<template>
    <div :class="classes">
        <div v-if="! $root.socketIO.connected && ! $root.socketIO.firstConnect" class="lost-connection">
            <div class="container-fluid">
                {{ $root.socketIO.connectionErrorMsg }}
                <div v-if="$root.socketIO.showReverseProxyGuide">
                    {{ $t("reverseProxyMsg1") }} <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">{{ $t("reverseProxyMsg2") }}</a>
                </div>
            </div>
        </div>

        <!-- Desktop header -->
        <header v-if="! $root.isMobile" class="app-header">
            <div class="app-header-inner">
                <router-link to="/" class="brand-link">
                    <object class="brand-icon" width="40" height="40" data="/icon.svg" />
                    <span class="fs-4 title">Silo</span>
                </router-link>

                <ul class="nav app-nav">
                    <li v-if="$root.loggedIn" class="nav-item">
                        <router-link to="/" class="nav-link">
                            <app-icon icon="home" /> {{ $t("home") }}
                        </router-link>
                    </li>

                    <li v-if="$root.loggedIn" class="nav-item">
                        <router-link to="/console" class="nav-link">
                            <app-icon icon="terminal" /> {{ $t("console") }}
                        </router-link>
                    </li>

                    <li v-if="$root.loggedIn" class="nav-item">
                        <details class="dropdown-profile-pic">
                            <summary class="nav-link profile-trigger">
                                <div class="profile-pic">{{ $root.usernameFirstChar }}</div>
                                <app-icon icon="angle-down" />
                            </summary>

                            <!-- Header's Dropdown Menu -->
                            <ul class="dropdown-menu">
                                <!-- Username -->
                                <li>
                                    <i18n-t v-if="$root.username != null" tag="span" keypath="signedInDisp" class="dropdown-item-text">
                                        <strong>{{ $root.username }}</strong>
                                    </i18n-t>
                                    <span v-if="$root.username == null" class="dropdown-item-text">{{ $t("signedInDispDisabled") }}</span>
                                </li>

                                <li><hr class="dropdown-divider"></li>

                                <!-- Functions -->

                                <!--<li>
                                <router-link to="/registry" class="dropdown-item" :class="{ active: $route.path.includes('settings') }">
                                    <app-icon icon="warehouse" /> {{ $t("registry") }}
                                </router-link>
                            </li>-->

                                <li>
                                    <button class="dropdown-item" @click="scanFolder">
                                        <app-icon icon="arrows-rotate" /> {{ $t("scanFolder") }}
                                    </button>
                                </li>

                                <li>
                                    <router-link to="/settings/general" class="dropdown-item" :class="{ active: $route.path.includes('settings') }">
                                        <app-icon icon="cog" /> {{ $t("Settings") }}
                                    </router-link>
                                </li>

                                <li>
                                    <button class="dropdown-item" @click="$root.logout">
                                        <app-icon icon="sign-out-alt" />
                                        {{ $t("Logout") }}
                                    </button>
                                </li>
                            </ul>
                        </details>
                    </li>
                </ul>
            </div>
        </header>

        <main>
            <div v-if="$root.socketIO.connecting" class="container mt-5">
                <h4>{{ $t("connecting...") }}</h4>
            </div>

            <router-view v-if="$root.loggedIn" />
            <Login v-if="! $root.loggedIn && $root.allowLoginDialog" />
        </main>
    </div>
</template>

<script>
import Login from "../components/Login.vue";

export default {

    components: {
        Login,
    },

    data() {
        return {

        };
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

    watch: {

    },

    mounted() {

    },

    beforeUnmount() {

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

<style scoped>

.app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(16px);
}

.app-header-inner {
    width: 100%;
    min-height: 72px;
    padding: 0 clamp(16px, 2vw, 32px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
}

.brand-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;
}

.brand-icon {
    display: block;
}

.app-nav {
    align-items: center;
    flex-wrap: nowrap;
    margin: 0;
}

.app-nav .nav-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
}

.nav-link {
    &.status-page {
        background-color: rgba(255, 255, 255, 0.1);
    }
}

.bottom-nav {
    z-index: 1000;
    position: fixed;
    bottom: 0;
    height: calc(60px + env(safe-area-inset-bottom));
    width: 100%;
    left: 0;
    background-color: #fff;
    box-shadow: 0 15px 47px 0 rgba(0, 0, 0, 0.05), 0 5px 14px 0 rgba(0, 0, 0, 0.05);
    text-align: center;
    white-space: nowrap;
    padding: 0 10px env(safe-area-inset-bottom);

    a {
        text-align: center;
        width: 25%;
        display: inline-block;
        height: 100%;
        padding: 8px 10px 0;
        font-size: 13px;
        color: #c1c1c1;
        overflow: hidden;
        text-decoration: none;

        &.router-link-exact-active, &.active {
            color: #74c2ff;
            font-weight: bold;
        }

        div {
            font-size: 20px;
        }
    }
}

main {
    width: 100%;
    min-height: calc(100vh - 160px);
}

.title {
    color: var(--text);
    font-weight: 750;
    letter-spacing: -0.03em;
}

.lost-connection {
    padding: 5px;
    background-color: crimson;
    color: white;
    position: fixed;
    width: 100%;
    z-index: 99999;
}

/* Profile button with dropdown */
.dropdown-profile-pic {
    position: relative;
    user-select: none;

    summary {
        list-style: none;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    .nav-link {
        cursor: pointer;
        display: flex;
        gap: 6px;
        align-items: center;
        min-width: 64px;
        background-color: var(--surface-muted);
        padding: 0.4rem 0.55rem;

        &:hover {
            background-color: var(--primary-soft);
        }
    }

    .dropdown-menu {
        display: block;
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 110;
        width: 220px;
        transition: all 0.2s;
        padding-left: 0;
        padding-bottom: 0;
        margin-top: 0;
        border-radius: 16px;
        overflow: hidden;

        .dropdown-divider {
            margin: 0;
            border-top: 1px solid rgba(0, 0, 0, 0.4);
            background-color: transparent;
        }

        .dropdown-item-text {
            font-size: 14px;
            padding-bottom: 0.7rem;
        }

        .dropdown-item {
            padding: 0.7rem 1rem;
        }

        .dark & {
            background-color: #0d1117;
            color: #b1b8c0;
            border-color: #1d2634;

            .dropdown-item {
                color: #b1b8c0;

                &.active {
                    color: #020b05;
                    background-color: #9dd1ff !important;
                }

                &:hover {
                    background-color: #070a10;
                }
            }
        }
    }

    .profile-pic {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        background: linear-gradient(135deg, #6366f1, #22d3ee);
        width: 30px;
        height: 30px;
        margin-right: 5px;
        border-radius: 50rem;
        font-weight: bold;
        font-size: 12px;
    }
}

.dark {
    header {
        background: color-mix(in srgb, var(--surface) 90%, transparent);
        border-bottom-color: var(--border);

        span {
            color: #f0f6fc;
        }
    }

    .bottom-nav {
        background-color: #0d1117;
    }
}
</style>
