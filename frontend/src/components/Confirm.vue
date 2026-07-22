<template>
    <div v-if="visible" class="modal" tabindex="-1" role="dialog" aria-modal="true" @click.self="no">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 id="exampleModalLabel" class="modal-title">
                        {{ title || $t("Confirm") }}
                    </h5>
                    <button type="button" class="btn-close" aria-label="Close" @click="no" />
                </div>
                <div class="modal-body">
                    <slot />
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" :class="btnStyle" @click="yes">
                        {{ yesText }}
                    </button>
                    <button type="button" class="btn btn-secondary" @click="no">
                        {{ noText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        /** Style of button */
        btnStyle: {
            type: String,
            default: "btn-primary",
        },
        /** Text to use as yes */
        yesText: {
            type: String,
            default: "Yes",     // TODO: No idea what to translate this
        },
        /** Text to use as no */
        noText: {
            type: String,
            default: "No",
        },
        /** Title to show on modal. Defaults to translated version of "Config" */
        title: {
            type: String,
            default: null,
        }
    },
    emits: [ "yes", "no" ],
    data: () => ({
        visible: false,
    }),
    methods: {
        /**
         * Show the confirm dialog
         * @returns {void}
         */
        show() {
            this.visible = true;
        },
        /**
         * @fires string "yes" Notify the parent when Yes is pressed
         * @returns {void}
         */
        yes() {
            this.visible = false;
            this.$emit("yes");
        },
        /**
         * @fires string "no" Notify the parent when No is pressed
         * @returns {void}
         */
        no() {
            this.visible = false;
            this.$emit("no");
        }
    },
};
</script>
