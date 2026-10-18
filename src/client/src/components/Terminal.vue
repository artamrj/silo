<template>
    <div class="card overflow-hidden bg-slate-950 p-0">
        <div v-pre ref="terminal" class="h-full w-full"></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TERMINAL_COLS, TERMINAL_ROWS } from "../../../shared/utils";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";
import "@xterm/xterm/lib/xterm.js";
import "@xterm/xterm/css/xterm.css";

type TerminalMode = "displayOnly" | "mainTerminal" | "interactive";

const props = withDefaults(defineProps<{
    name : string;
    // Require if mode is interactive
    stackName?: string;
    // Require if mode is interactive
    serviceName?: string;
    // Require if mode is interactive
    shell?: string;
    rows?: number;
    cols?: number;
    // Mode
    // displayOnly: Only display terminal output
    // mainTerminal: Allow input limited commands and output
    // interactive: Free input and output
    mode?: TerminalMode;
}>(), {
    stackName: "",
    serviceName: "",
    shell: "bash",
    rows: TERMINAL_ROWS,
    cols: TERMINAL_COLS,
    mode: "displayOnly",
});

const emit = defineEmits<{ "has-data": [] }>();

const { emitServer, bindTerminal, unbindTerminal } = useSocket();
const { toastRes, toastError } = useToast();

/** Host element xterm renders into. */
const terminal = ref<HTMLElement | null>(null);

let xterm : Terminal | null = null;
let terminalFitAddOn : FitAddon | null = null;
const first = ref(true);
let terminalInputBuffer = "";
let cursorPosition = 0;

onMounted(() => {
    let cursorBlink = true;

    if (props.mode === "displayOnly") {
        cursorBlink = false;
    }

    xterm = new Terminal({
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        cursorBlink,
        cols: props.cols,
        rows: props.rows,
    });

    if (props.mode === "mainTerminal") {
        mainTerminalConfig();
    } else if (props.mode === "interactive") {
        interactiveTerminalConfig();
    }

    // Bind to a div
    xterm.open(terminal.value as HTMLElement);
    xterm.focus();

    // Add right-click context menu handler for paste
    terminal.value?.addEventListener("contextmenu", handleContextMenu);
    // Capture native paste events from xterm's hidden textarea. This supports
    // Cmd+V, Ctrl+V, and the browser's Paste command without Clipboard API permission.
    terminal.value?.addEventListener("paste", handlePasteEvent, true);

    // Add selection handler for copy to clipboard
    xterm.onSelectionChange(() => {
        handleSelection();
    });

    // Notify parent component when data is received
    xterm.onCursorMove(() => {
        console.debug("onData triggered");
        if (first.value) {
            emit("has-data");
            first.value = false;
        }
    });

    bind();

    // Create a new Terminal
    if (props.mode === "mainTerminal") {
        emitServer("mainTerminal", props.name, (res : SocketResult) => {
            if (!res.ok) {
                toastRes(res);
            }
        });
    } else if (props.mode === "interactive") {
        console.debug("Create Interactive terminal:", props.name);
        emitServer("interactiveTerminal", props.stackName, props.serviceName, props.shell, (res : SocketResult) => {
            if (!res.ok) {
                toastRes(res);
            }
        });
    }
    // Fit the terminal width to the div container size after terminal is created.
    updateTerminalSize();
});

onUnmounted(() => {
    window.removeEventListener("resize", onResizeEvent); // Remove the resize event listener from the window object.
    unbindTerminal(props.name);
    xterm?.dispose();
    terminal.value?.removeEventListener("contextmenu", handleContextMenu);
    terminal.value?.removeEventListener("paste", handlePasteEvent, true);
});

/** Bind this terminal so `terminalWrite` events can find it. */
function bind(name? : string) : void {
    // Workaround: normally this.name should be set, but it is not sometimes, so we use the parameter, but eventually this.name and name must be the same name
    if (name) {
        unbindTerminal(name);
        bindTerminal(name, xterm as Terminal);
        console.debug("Terminal bound via parameter: " + name);
    } else if (props.name) {
        unbindTerminal(props.name);
        bindTerminal(props.name, xterm as Terminal);
        console.debug("Terminal bound: " + props.name);
    } else {
        console.debug("Terminal name not set");
    }
}

defineExpose({ bind });

function removeInput() : void {
    const textAfterCursorLength = terminalInputBuffer.length - cursorPosition;
    const spaces = " ".repeat(textAfterCursorLength);
    const backspaceCount = terminalInputBuffer.length;
    const backspaces = "\b \b".repeat(backspaceCount);
    cursorPosition = 0;
    xterm?.write(spaces + backspaces);
    terminalInputBuffer = "";
}

function clearCurrentLine() : void {
    // Move cursor to the beginning of the input and clear it
    const backspaces = "\b".repeat(cursorPosition);
    const spaces = " ".repeat(terminalInputBuffer.length);
    const moreBackspaces = "\b".repeat(terminalInputBuffer.length);
    xterm?.write(backspaces + spaces + moreBackspaces);
}

function mainTerminalConfig() : void {
    xterm?.onKey(e => {
        // Optional: keep for debugging
        // console.debug("Encode: " + JSON.stringify(e.key));

        if (e.key === "\r") {
            // Return if no input
            if (terminalInputBuffer.length === 0) {
                return;
            }

            const buffer = terminalInputBuffer;

            // Remove the input from the terminal
            removeInput();

            emitServer("terminalInput", props.name, buffer + e.key, (err : SocketResult) => {
                if (!err.ok) {
                    toastError(err.msg ?? "");
                }
            });
        } else if (e.key === "\u007F") {      // Backspace
            if (cursorPosition > 0) {
                // Remove character to the left of cursor
                const beforeCursor = terminalInputBuffer.slice(0, cursorPosition - 1);
                const afterCursor = terminalInputBuffer.slice(cursorPosition);
                terminalInputBuffer = beforeCursor + afterCursor;
                cursorPosition--;

                // Redraw the line
                xterm?.write("\b" + afterCursor + " \b".repeat(afterCursor.length + 1));
            }
        } else if (e.key === "\u001B\u005B\u0033\u007E") { // Delete key
            if (cursorPosition < terminalInputBuffer.length) {
                // Remove character to the right of cursor
                const beforeCursor = terminalInputBuffer.slice(0, cursorPosition);
                const afterCursor = terminalInputBuffer.slice(cursorPosition + 1);
                terminalInputBuffer = beforeCursor + afterCursor;

                // Redraw the line from cursor position
                xterm?.write(afterCursor + " \b".repeat(afterCursor.length + 1));
            }
        } else if (e.key === "\u001B\u005B\u0041" || e.key === "\u001B\u005B\u0042") {      // UP OR DOWN
            // Do nothing
        } else if (e.key === "\u001B\u005B\u0043") {      // RIGHT
            if (cursorPosition < terminalInputBuffer.length) {
                xterm?.write(terminalInputBuffer[cursorPosition]);
                cursorPosition++;
            }
        } else if (e.key === "\u001B\u005B\u0044") {      // LEFT
            if (cursorPosition > 0) {
                xterm?.write("\b");
                cursorPosition--;
            }
        } else if (e.key === "\u0003") {      // Ctrl + C
            console.debug("Ctrl + C");
            emitServer("terminalInput", props.name, e.key);
            removeInput();
        } else if (e.key === "\u0009" || e.key.startsWith("\u001B")) {      // TAB or other special keys
            // Do nothing
        } else {
            const textBeforeCursor = terminalInputBuffer.slice(0, cursorPosition);
            const textAfterCursor = terminalInputBuffer.slice(cursorPosition);
            terminalInputBuffer = textBeforeCursor + e.key + textAfterCursor;
            xterm?.write(e.key + textAfterCursor + "\b".repeat(textAfterCursor.length));
            cursorPosition++;
        }
    });
}

function interactiveTerminalConfig() : void {
    xterm?.onKey(e => {
        emitServer("terminalInput", props.name, e.key, (res : SocketResult) => {
            if (!res.ok) {
                toastRes(res);
            }
        });
    });
}

/**
 * Update the terminal size to fit the container size.
 *
 * If the terminalFitAddOn is not created, creates it, loads it and then fits the terminal to the appropriate size.
 * It then adds an event listener to the window object to listen for resize events and calls the fit method of the terminalFitAddOn.
 */
function updateTerminalSize() : void {
    if (!terminalFitAddOn) {
        terminalFitAddOn = new FitAddon();
        xterm?.loadAddon(terminalFitAddOn);
        window.addEventListener("resize", onResizeEvent);
    }
    terminalFitAddOn.fit();
}

/**
 * Handles the resize event of the terminal component.
 */
function onResizeEvent() : void {
    terminalFitAddOn?.fit();
    const rows = xterm?.rows ?? 0;
    const cols = xterm?.cols ?? 0;
    emitServer("terminalResize", props.name, rows, cols);
}

/**
 * Handle clipboard paste operation
 */
async function handlePaste() : Promise<void> {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            pasteText(text);
        }
    } catch (error) {
        console.error("Failed to read from clipboard:", error);
    }
}

function handlePasteEvent(event : ClipboardEvent) : void {
    if (props.mode !== "mainTerminal" && props.mode !== "interactive") {
        return;
    }

    const text = event.clipboardData?.getData("text/plain");
    if (!text) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    pasteText(text);
}

/**
 * Paste text into the terminal based on current mode
 */
function pasteText(text : string) : void {
    if (props.mode === "mainTerminal") {
        // For main terminal, insert text at current cursor position
        const beforeCursor = terminalInputBuffer.slice(0, cursorPosition);
        const afterCursor = terminalInputBuffer.slice(cursorPosition);

        // Update the buffer with inserted text
        terminalInputBuffer = beforeCursor + text + afterCursor;

        // Clear the current line and rewrite it
        clearCurrentLine();
        xterm?.write(terminalInputBuffer);

        // Move cursor to the correct position (after the pasted text)
        cursorPosition += text.length;
        const backspaces = "\b".repeat(afterCursor.length);
        xterm?.write(backspaces);

    } else if (props.mode === "interactive") {
        // For interactive terminal, send directly to server
        emitServer("terminalInput", props.name, text, (res : SocketResult) => {
            if (!res.ok) {
                toastRes(res);
            }
        });
    }
}

/**
 * Handle right-click context menu for paste operation
 */
function handleContextMenu(event : MouseEvent) : void {
    // Prevent default context menu
    event.preventDefault();

    // Only handle paste for modes that support input
    if (props.mode === "mainTerminal" || props.mode === "interactive") {
        handlePaste();
    }
}

/**
 * Handle text selection in terminal - copy to clipboard
 */
function handleSelection() : void {
    const selectedText = xterm?.getSelection();
    if (selectedText && selectedText.length > 0) {
        copyToClipboard(selectedText);
    }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text : string) : Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        console.debug("Text copied to clipboard:", text);
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
    }
}
</script>
