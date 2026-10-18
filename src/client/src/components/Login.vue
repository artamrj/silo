<template>
    <div class="flex min-h-[calc(100vh-72px)] items-center py-10">
        <Card class="m-auto w-full max-w-[420px] gap-0 py-8 shadow-lg">
            <CardContent class="px-8">
                <form @submit.prevent="submit">
                    <CardHeader class="mb-7 flex flex-row items-center gap-3.5 p-0">
                        <object width="52" height="52" data="/icon.svg" />
                        <div>
                            <CardTitle class="text-2xl">Silo</CardTitle>
                            <CardDescription class="mt-0.5">{{ $t("Login") }}</CardDescription>
                        </div>
                    </CardHeader>

                    <div v-if="!tokenRequired" class="mb-3 space-y-1.5">
                        <Label for="floatingInput">{{ $t("Username") }}</Label>
                        <Input id="floatingInput" v-model="username" type="text" placeholder="Username" autocomplete="username" required />
                    </div>

                    <div v-if="!tokenRequired" class="mb-3 space-y-1.5">
                        <Label for="floatingPassword">{{ $t("Password") }}</Label>
                        <Input id="floatingPassword" v-model="password" type="password" placeholder="Password" autocomplete="current-password" required />
                    </div>

                    <div v-if="tokenRequired" class="mb-3 space-y-1.5">
                        <Label for="otp">{{ $t("Token") }}</Label>
                        <Input id="otp" v-model="token" type="text" maxlength="6" placeholder="123456" autocomplete="one-time-code" required />
                    </div>

                    <div class="mt-3 mb-3 flex items-center justify-center gap-2">
                        <Checkbox id="remember" v-model="$root.remember" />
                        <Label for="remember" class="text-foreground">{{ $t("Remember me") }}</Label>
                    </div>

                    <Button type="submit" class="h-10 w-full" :disabled="processing">
                        {{ $t("Login") }}
                    </Button>

                    <div v-if="res && !res.ok" class="mt-3 rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                        {{ $t(res.msg) }}
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
</template>

<script>
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default {
    components: {
        Button,
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
        Checkbox,
        Input,
        Label,
    },
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
