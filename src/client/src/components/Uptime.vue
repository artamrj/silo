<template>
    <span class="pill" :class="[ colorClass, fixedWidth ? 'w-16 truncate' : 'min-w-16' ]">{{ statusName }}</span>
</template>

<script>
import { statusColor, statusNameShort } from "../../../shared/utils";

export default {
    props: {
        stack: {
            type: Object,
            default: null,
        },
        fixedWidth: {
            type: Boolean,
            default: false,
        },
    },

    computed: {
        uptime() {
            return this.$t("notAvailableShort");
        },

        /**
         * Map the shared status colour name onto a utility class.
         * @returns {string} Tailwind background/text classes
         */
        colorClass() {
            switch (statusColor(this.stack?.status)) {
                case "primary":
                    return "bg-primary-fill text-primary-foreground";
                case "danger":
                    return "bg-danger-fill text-white";
                case "dark":
                    return "bg-slate-700 text-white";
                default:
                    return "bg-slate-500 text-white";
            }
        },

        statusName() {
            return this.$t(statusNameShort(this.stack?.status));
        },
    },
};
</script>
