# Console Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/console` as focused, macOS-inspired terminal window without changing terminal behavior, sidebar, or adding dependencies.

**Architecture:** Keep availability and socket state in route-level `Console.vue`. Extract terminal window chrome/fullscreen ownership into one focused Vue component, and add a pure xterm appearance utility so terminal palette choices have lightweight tests. Preserve current `Terminal.vue` default rendering for all non-Console callers.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS v4, xterm.js 6, Lucide Vue, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-console-terminal-design.md`

## Global Constraints

- Do not change sidebar, server terminal events, authorization, routes, generated UI primitives, dependencies, lockfile, or `dist/`.
- Use Vue `<script setup lang="ts">`, typed props/emits, direct app alias imports, and existing Tailwind/theme conventions.
- All new user-facing text is translated through `src/client/src/lang/en.json`.
- Terminal output remains untrusted and confined to xterm; no output enters DOM state, telemetry, storage, or page chrome.
- Add no new external asset, network request, or dependency.
- Do not commit or push without explicit user authorization.

## Review Focus

- Fullscreen state must reflect browser-initiated exits, not only button clicks; cover `fullscreenchange` and terminal resize behavior manually.
- Console must preserve usable viewport height at 320px, 768px, and desktop widths; inspect no horizontal overflow and terminal remains focusable.
- Reduced motion must remove opening animation while retaining terminal function.
- Connection state must be understandable to assistive technology without putting socket error or terminal data in the title bar.
- Existing `ContainerTerminal.vue` must retain default framed terminal appearance and input behavior.

---

### Task 1: Testable xterm appearance contract

**Files:**
- Create: `src/client/src/lib/terminal-appearance.ts`
- Create: `tests/client/terminal-appearance.test.ts`

**Interfaces:**
- Produces: `TerminalAppearance`, `getTerminalAppearance(appearance)` with an xterm-compatible theme, cursor style, and cursor width.
- Consumes: no runtime state or external dependency.

- [ ] **Step 1: Write failing appearance tests**



- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/terminal-appearance.test.ts`

Expected: FAIL because `terminal-appearance` does not exist.

- [ ] **Step 3: Implement appearance utility**

Implement `getTerminalAppearance(appearance : TerminalAppearance)` in
`src/client/src/lib/terminal-appearance.ts`. Return immutable default and mac
appearance records. Mac record uses spec color values, bar cursor, and a
2px cursor width. Default record preserves existing xterm visual behavior.

- [ ] **Step 4: Run focused test to verify it passes**

Run: `npm test -- tests/client/terminal-appearance.test.ts`

Expected: PASS.

### Task 2: Add Console-specific xterm surface

**Files:**
- Modify: `src/client/src/components/Terminal.vue:1-122`
- Modify: `src/client/src/components/Terminal.vue:254-271`
- Test: `tests/client/terminal-appearance.test.ts`

**Interfaces:**
- Consumes: `TerminalAppearance`, `getTerminalAppearance` from Task 1.
- Produces: optional `appearance?: "default" | "mac"` and `surface?: "card" | "bare"` props, both defaulting to existing behavior.

- [ ] **Step 1: Extend failing test for default compatibility**



- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/client/terminal-appearance.test.ts`

Expected: FAIL because default appearance behavior is not implemented.

- [ ] **Step 3: Implement Terminal appearance and resize changes**

Pass selected appearance into `new Terminal(...)`. Keep current card wrapper
for default consumers; bare surface has no card background, border radius, or
padding. Use a `ResizeObserver` on terminal host to call existing fit/resize
path, disconnect it during unmount, and keep window resize fallback only if
needed for current behavior.

- [ ] **Step 4: Run focused test to verify it passes**

Run: `npm test -- tests/client/terminal-appearance.test.ts`

Expected: PASS.

### Task 3: Build focused Console terminal window

**Files:**
- Create: `src/client/src/components/ConsoleTerminalWindow.vue`
- Modify: `src/client/src/pages/Console.vue:1-48`
- Modify: `src/client/src/lang/en.json`

**Interfaces:**
- Consumes: `connected : boolean` prop, `Terminal` from Task 2, and fullscreen browser API.
- Produces: `ConsoleTerminalWindow` that renders terminal name `console` in
  `mainTerminal` mode with `appearance="mac"` and `surface="bare"`.

- [ ] **Step 1: Add translated visible/control copy**

Add English keys for window title, connection state, reconnecting state, and
enter/exit fullscreen labels. Keep `console` and existing disabled-console
messages unchanged.

- [ ] **Step 2: Implement ConsoleTerminalWindow**

Create macOS-inspired title bar with assistive-tech-hidden traffic lights,
compact connection status, and one icon-only fullscreen button with translated
`aria-label`/`title`. Synchronize local fullscreen state from
`fullscreenchange`; request/exit fullscreen through standard APIs. Render
`Terminal` as bare mac appearance. Add scoped 180ms opacity/transform opening
animation plus `prefers-reduced-motion` override.

- [ ] **Step 3: Replace Console route chrome**

Remove `PageContainer` and `PageHeader` use. Preserve availability request and
existing translated disabled guidance, but place all states in the route's
full-height minimal Console surface. Pass shared socket connection status to
`ConsoleTerminalWindow`.

- [ ] **Step 4: Run static checks**

Run: `npm run check-ts && npm run lint`

Expected: PASS.

### Task 4: Verify terminal UX and regression boundaries

**Files:**
- Test: `tests/client/terminal-appearance.test.ts`
- Verify: `src/client/src/pages/Console.vue`
- Verify: `src/client/src/components/ConsoleTerminalWindow.vue`
- Verify: `src/client/src/components/Terminal.vue`

**Interfaces:**
- Consumes: all completed Console changes.
- Produces: verification evidence only; no new product behavior.

- [ ] **Step 1: Run focused and full test suites**

Run: `npm test -- tests/client/terminal-appearance.test.ts && npm test`

Expected: PASS, including current 114-test baseline plus new focused tests.

- [ ] **Step 2: Build client production bundle**

Run: `npm run build`

Expected: successful client and server builds; no dependency additions.

- [ ] **Step 3: Perform browser checks**

Run local app through available browser automation. Inspect `/console` at 320px,
768px, and desktop widths; test keyboard focus, fullscreen enter/exit, terminal
resize after fullscreen, reduced motion, disconnected status, and unchanged
container-terminal presentation.

- [ ] **Step 4: Review against Web Interface Guidelines**

Check icon button labels, focus replacement, semantic buttons, motion behavior,
overflow, status text, and terminal privacy boundaries in changed Vue files.

## Self-review

- Spec coverage: Tasks 1-3 cover single window UI, mac palette/cursor,
  connection status, fullscreen, reduced motion, retained unavailable state,
  and no-extra-dependency constraint. Task 4 covers browser and regression
  verification.
- Step scan: every implementation task names exact files, interfaces, and
  observable output; tests target palette/cursor configuration rather than source
  text.
- Type consistency: route passes `connected : boolean`; window passes fixed
  `appearance="mac"` and `surface="bare"`; shared utility exposes those exact
  string variants.
- Review focus: each risk is covered by a focused test or Task 4 browser check.
- Proportion: plan specifies contracts and acceptance checks without prescribing
  component internals or duplicating implementation code.
