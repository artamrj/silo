import { createI18n } from "vue-i18n";
import en from "./lang/en.json";

export const i18n = createI18n({
    legacy: true,
    locale: "en",
    fallbackLocale: "en",
    missingWarn: false,
    fallbackWarn: false,
    messages: {
        en,
    },
});
