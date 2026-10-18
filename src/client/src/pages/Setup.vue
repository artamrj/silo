<template>
    <div class="flex min-h-screen items-center py-10" data-cy="setup-form">
        <div class="m-auto w-full max-w-[440px] rounded-3xl bg-surface p-9 text-center shadow-lg">
            <form @submit.prevent="submit">
                <div>
                    <object width="64" height="64" data="/icon.svg" />
                    <div class="mt-1.5 text-2xl font-bold">
                        Silo
                    </div>
                </div>

                <p class="mt-3">
                    {{ $t("Create your admin account") }}
                </p>

                <div class="mt-3 text-left">
                    <label class="field-label" for="floatingInput">{{ $t("Username") }}</label>
                    <input id="floatingInput" v-model="username" type="text" class="field" :placeholder="$t('Username')" required data-cy="username-input">
                </div>

                <div class="mt-3 text-left">
                    <label class="field-label" for="floatingPassword">{{ $t("Password") }}</label>
                    <input id="floatingPassword" v-model="password" type="password" class="field" :placeholder="$t('Password')" required data-cy="password-input">
                </div>

                <div class="mt-3 text-left">
                    <label class="field-label" for="repeat">{{ $t("Repeat Password") }}</label>
                    <input id="repeat" v-model="repeatPassword" type="password" class="field" :placeholder="$t('Repeat Password')" required data-cy="password-repeat-input">
                </div>

                <button class="button button-primary mt-3 w-full" type="submit" :disabled="processing" data-cy="submit-setup-form">
                    {{ $t("Create") }}
                </button>
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
            repeatPassword: "",
        };
    },
    mounted() {
        // TODO: Check if it is a database setup

        this.$root.getSocket().emit("needSetup", (needSetup) => {
            if (! needSetup) {
                this.$router.push("/");
            }
        });
    },
    methods: {
        /**
         * Submit form data for processing
         * @returns {void}
         */
        submit() {
            this.processing = true;

            if (this.password !== this.repeatPassword) {
                this.$root.toastError("PasswordsDoNotMatch");
                this.processing = false;
                return;
            }

            this.$root.getSocket().emit("setup", this.username, this.password, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.processing = true;

                    this.$root.login(this.username, this.password, "", () => {
                        this.processing = false;
                        this.$router.push("/");
                    });
                }
            });
        },
    },
};
</script>
