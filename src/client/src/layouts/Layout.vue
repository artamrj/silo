<template>
    <div class="flex min-h-dvh flex-col" :class="{ 'h-dvh overflow-hidden': isConsoleRoute }">
        <a v-if="loggedIn" href="#main-content" class="skip-link">{{ $t("skipToContent") }}</a>

        <div v-if="!socketIO.connected && !socketIO.firstConnect" class="fixed inset-x-0 top-0 z-[99999] bg-danger-fill px-4 py-1 text-center text-sm text-white">
            {{ socketIO.connectionErrorMsg }}
            <span v-if="socketIO.showReverseProxyGuide">
                {{ $t("reverseProxyMsg1") }}
                <a class="text-white underline" href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">{{ $t("reverseProxyMsg2") }}</a>
            </span>
        </div>

        <!-- Desktop sidebar: the only permanent navigation surface. -->
        <AppSidebar v-if="loggedIn" />

        <main
            id="main-content"
            tabindex="-1"
            class="flex min-h-0 w-full flex-1 flex-col pb-6"
            :class="{
                'pl-[calc(var(--sidebar-gap)*2+var(--sidebar-w))]': loggedIn,
                'overflow-hidden pb-0': isConsoleRoute,
            }"
        >
            <div v-if="socketIO.connecting" class="px-6 py-12 text-center">
                <h4>{{ $t("connecting...") }}</h4>
            </div>

            <router-view v-if="loggedIn" v-slot="{ Component }">
                <transition name="slide-fade" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>

            <Login v-if="!loggedIn && allowLoginDialog" />
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "../components/AppSidebar.vue";
import Login from "../components/Login.vue";
import { useSocket } from "../composables/useSocket";

const { loggedIn, socketIO, allowLoginDialog } = useSocket();
const route = useRoute();
const isConsoleRoute = computed(() => route.path === "/console");
</script>
