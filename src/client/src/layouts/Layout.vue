<template>
    <div class="flex min-h-dvh flex-col">
        <a v-if="$root.loggedIn" href="#main-content" class="skip-link">{{ $t("skipToContent") }}</a>

        <div v-if="! $root.socketIO.connected && ! $root.socketIO.firstConnect" class="fixed inset-x-0 top-0 z-[99999] bg-danger-fill px-4 py-1 text-center text-sm text-white">
            {{ $root.socketIO.connectionErrorMsg }}
            <span v-if="$root.socketIO.showReverseProxyGuide">
                {{ $t("reverseProxyMsg1") }}
                <a class="text-white underline" href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy" target="_blank">{{ $t("reverseProxyMsg2") }}</a>
            </span>
        </div>

        <!-- Desktop sidebar: the only permanent navigation surface. -->
        <AppSidebar v-if="$root.loggedIn" />

        <main
            id="main-content"
            tabindex="-1"
            class="flex w-full flex-1 flex-col pb-6"
            :class="{ 'pl-[calc(var(--sidebar-gap)*2+var(--sidebar-w))]': $root.loggedIn }"
        >
            <div v-if="$root.socketIO.connecting" class="px-6 py-12 text-center">
                <h4>{{ $t("connecting...") }}</h4>
            </div>

            <router-view v-if="$root.loggedIn" v-slot="{ Component }">
                <transition name="slide-fade" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>

            <Login v-if="! $root.loggedIn && $root.allowLoginDialog" />
        </main>
    </div>
</template>

<script>
import AppSidebar from "../components/AppSidebar.vue";
import Login from "../components/Login.vue";

export default {

    components: {
        AppSidebar,
        Login,
    },

};
</script>
