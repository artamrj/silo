<template>
    <div class="flex min-h-[calc(100vh-72px)] items-center py-10">
        <div class="m-auto w-full max-w-[420px] rounded-2xl border border-line bg-surface p-8 shadow-lg">
            <form @submit.prevent="submit">
                <div class="mb-7 flex items-center gap-3.5">
                    <object width="52" height="52" data="/icon.svg" />
                    <div>
                        <h1 class="mb-0">Silo</h1>
                        <p class="mt-0.5 mb-0 text-ink-muted">{{ $t("Login") }}</p>
                    </div>
                </div>

                <div v-if="!tokenRequired" class="mb-3">
                    <label class="field-label" for="floatingInput">{{ $t("Username") }}</label>
                    <input id="floatingInput" v-model="username" type="text" class="field" placeholder="Username" autocomplete="username" required>
                </div>

                <div v-if="!tokenRequired" class="mb-3">
                    <label class="field-label" for="floatingPassword">{{ $t("Password") }}</label>
                    <input id="floatingPassword" v-model="password" type="password" class="field" placeholder="Password" autocomplete="current-password" required>
                </div>

                <div v-if="tokenRequired" class="mb-3">
                    <label class="field-label" for="otp">{{ $t("Token") }}</label>
                    <input id="otp" v-model="token" type="text" maxlength="6" class="field" placeholder="123456" autocomplete="one-time-code" required>
                </div>

                <div class="mt-3 mb-3 flex items-center justify-center gap-2">
                    <input id="remember" v-model="$root.remember" type="checkbox" class="size-4 accent-primary">
                    <label class="text-sm text-ink" for="remember">
                        {{ $t("Remember me") }}
                    </label>
                </div>

                <button class="button button-primary w-full" type="submit" :disabled="processing">
                    {{ $t("Login") }}
                </button>

                <div v-if="res && !res.ok" class="mt-3 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                    {{ $t(res.msg) }}
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
        };
    },

    mounted() {
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        submit() {
            this.processing = true;

            this.$root.login(this.username, this.password, this.token, (res) => {
                this.processing = false;

                if (res.tokenRequired) {
                    this.tokenRequired = true;
                } else {
                    this.res = res;
                }
            });
        },

    },
};
</script>
