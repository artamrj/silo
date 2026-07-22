import { defineComponent, h } from "vue";

const glyphs: Record<string, string> = {
    "angle-down": "⌄",
    "arrows-rotate": "↻",
    "chevron-circle-down": "▾",
    "chevron-circle-right": "▸",
    "chevron-down": "⌄",
    "chevron-up": "⌃",
    "cloud-arrow-down": "⇩",
    cog: "⚙",
    edit: "✎",
    eye: "◉",
    "eye-slash": "⊘",
    home: "⌂",
    pause: "Ⅱ",
    pen: "✎",
    "pen-to-square": "✎",
    play: "▶",
    plus: "+",
    rocket: "▲",
    rotate: "↻",
    save: "▣",
    search: "⌕",
    "sign-out-alt": "⇥",
    stop: "■",
    terminal: ">_",
    times: "×",
    trash: "⌫",
    warehouse: "▦",
};

export const AppIcon = defineComponent({
    name: "AppIcon",
    props: {
        icon: {
            type: String,
            required: true,
        },
        size: {
            type: String,
            default: "md",
        },
    },
    setup(props, { attrs }) {
        return () => h("span", {
            ...attrs,
            class: [ "app-icon", attrs.class ],
            "aria-hidden": "true",
        }, glyphs[props.icon] ?? "•");
    },
});
