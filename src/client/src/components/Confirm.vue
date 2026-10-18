<template>
    <div
        v-if="visible"
        class="modal"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="no"
        @keydown.esc="no"
        @keydown.tab="onDialogKeydown"
    >
        <div class="modal-dialog">
            <div ref="dialog" class="modal-content" role="document">
                <div class="modal-header">
                    <h5 :id="titleId" class="modal-title">
                        {{ title || $t("Confirm") }}
                    </h5>
                    <button ref="closeButton" type="button" class="btn-close" :aria-label="$t('Close')" @click="no" />
                </div>
                <div class="modal-body">
                    <slot />
                </div>
                <div class="modal-footer">
                    <button type="button" class="button" :class="btnStyle" @click="yes">
                        {{ yesText }}
                    </button>
                    <button type="button" class="button button-normal" @click="no">
                        {{ noText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { trapFocus } from "../focusTrap";

export default {
    props: {
        /** Style of button */
        btnStyle: {
            type: String,
            default: "button-primary",
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
        titleId: `confirm-title-${Math.random().toString(36).slice(2, 9)}`,
        previouslyFocused: null,
    }),
    watch: {
        visible(isVisible) {
            if (isVisible) {
                this.previouslyFocused = document.activeElement;
                this.$nextTick(() => this.$refs.closeButton?.focus());
            } else {
                this.previouslyFocused?.focus?.();
                this.previouslyFocused = null;
            }
        },
    },
    methods: {
        /**
         * Keep Tab navigation inside the open dialog.
         * @param {KeyboardEvent} event Tab keydown event
         * @returns {void}
         */
        onDialogKeydown(event) {
            trapFocus(this.$refs.dialog, event);
        },
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
