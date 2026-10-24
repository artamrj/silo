# Console Terminal Design

## Intent

Make `/console` feel like opening a real macOS terminal window: focused,
calm, responsive, and trustworthy. The terminal is the page, not content
inside a dashboard. This serves the administrator who needs direct host
access without visual noise competing with commands or output.

## Goals

- Remove Console page heading, description, card framing, and spare controls.
- Present one full-height, macOS-inspired terminal window inside existing app
  shell; sidebar remains completely unchanged.
- Keep terminal output and input behavior unchanged while improving xterm
  color, cursor, sizing, and focus treatment.
- Give connection state a quiet, accessible status indicator.
- Provide a single visible fullscreen action with complete keyboard support.
- Use one short opening animation and disable it when reduced motion is set.
- Keep client payload small: reuse xterm, Vue, Tailwind, and existing icons;
  add no dependency or external asset.

## Non-goals

- No changes to sidebar, routes, server socket events, terminal authorization,
  command handling, or container-terminal page.
- No command-history UI, analytics, remote resource, browser clipboard prompt,
  or persisted UI state.
- No imitation of proprietary Apple assets or exact product UI.

## Visual Direction

### Token system

| Token | Value | Use |
| --- | --- | --- |
| Window graphite | `#171819` | Terminal body and xterm background |
| Chrome graphite | `#252627` | Title bar |
| Chrome highlight | `#343536` | Divider and inset edge |
| Terminal ink | `#E7E8EA` | Primary output |
| Terminal muted ink | `#A5A7AB` | Dim ANSI output |
| Connection green | `#5DD879` | Connected indicator |

System sans stays in window chrome. Existing monospace stack remains xterm's
only typeface. Current theme tokens remain untouched; terminal palette is
local and stays dark in both global app themes.

### Layout



The terminal window occupies available route height, with page padding
collapsed around it. Small screens retain a thin safe inset and lower corner
radius; they never get ornamental secondary panels.

### Principles

1. Terminal output is sensitive. Do not mirror it into page chrome, logs,
   titles, tooltips, or history UI.
2. Chrome earns its place: decorative traffic lights establish familiar window
   context, connection state is shown as a dot with screen-reader status, and
   fullscreen is the only exposed action.
3. App chrome stays restrained. The title bar says `Silo Console`; it is not a
   route heading or marketing description.
4. Opening motion only settles window opacity and transform over 180ms;
   `prefers-reduced-motion` removes it.

## Architecture

- `Console.vue` remains route-level owner of console availability and socket
  state. It renders loading, unavailable, or available terminal surface.
- New `ConsoleTerminalWindow.vue` owns macOS-like window chrome,
  fullscreen lifecycle, title-bar status, and its contained main terminal.
- `Terminal.vue` gains a typed visual appearance input. Existing consumers
  retain their card surface and default palette. Console uses an unframed
  macOS palette with a bar cursor.
- A tiny pure terminal-appearance utility holds xterm palette and cursor
  choices. Vitest covers its public behavior without adding a browser DOM
  test framework.

## Privacy and Security Constraints

- Keep all terminal output inside xterm. Never use `innerHTML`, inspect xterm
  buffer, parse output, or promote terminal data into Vue state.
- Keep current server-side authentication and socket validation unchanged.
- Add no third-party scripts, font fetches, iframe, telemetry, or runtime-loaded
  JavaScript to this route.
- Preserve clipboard behavior scoped to user terminal interactions; no clipboard
  contents enter visible page state.

## Accessibility and Interaction

- Fullscreen control is a semantic button with translated `aria-label` and
  visible `:focus-visible` state.
- Connection indicator provides an accessible status phrase without exposing
  terminal data.
- Terminal opens with current focus behavior so keyboard input begins where the
  user expects.
- Title-bar decoration is hidden from assistive technology.
- Fullscreen uses standard browser API and remains reversible with browser
  Escape behavior plus control toggle.

## Acceptance Criteria

- `/console` contains no `PageHeader`, route title, or route description.
- Enabled Console presents one responsive terminal window with compact macOS-like
  chrome, dark xterm theme, readable ANSI contrast, and bar cursor.
- Terminal connects, receives output, accepts input, copies selection, pastes,
  and resizes as before.
- Socket disconnection changes only compact status; no terminal output appears
  outside xterm.
- Fullscreen works without breaking terminal sizing; animation honors reduced
  motion.
- Disabled console remains actionable through existing translated setup content.
- No sidebar, server, dependency, or generated UI primitive change occurs.
