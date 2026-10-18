import { createI18n } from "vue-i18n";
import en from "./lang/en.json";

export const i18n = createI18n({
    // Composition mode: enables `useI18n()` in `<script setup>`. Templates keep
    // working through `globalInjection` (`$t`).
    legacy: false,
    globalInjection: true,
    locale: "en",
    fallbackLocale: "en",
    missingWarn: false,
    fallbackWarn: false,
    messages: {
        en,
    },
});
