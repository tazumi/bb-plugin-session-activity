// bb-plugin-session-activity - sidebar session status indicators.
//
// Read idle sessions get a green check through bb's row-status setter.
// Pure presentation. Running sessions keep bb's own spinner glyph but spin
// even when the OS asks for reduced motion (bb switches the spin off then,
// which makes the loader look frozen). Finished unread sessions get a green
// dot of the same 5px size as bb's grey one.
import { useEffect } from "react";
import {
  definePluginApp,
  experimental_useSidebarThreads,
  useSidebarThreadDraftIds,
} from "@get-bb/plugin-sdk/app";

const STYLE_ID = "bb-session-activity-style";

// bb labels the glyphs; the labels are the only stable hook, the class names
// are tailwind utilities.
type RowStatusSetter = (
  threadId: string,
  status: { icon: string; label: string; tone: "success" } | null,
) => void;

let setRowStatus: RowStatusSetter | null = null;
let onSetterReady: (() => void) | null = null;

const DONE = { icon: "Check", label: "Thread finished", tone: "success" } as const;

// Marks every idle thread bb would draw nothing for (no unread dot, error,
// question, queue or draft) with a green check.
function DoneChecks() {
  const { threads } = experimental_useSidebarThreads();
  const draftIds = useSidebarThreadDraftIds();
  useEffect(() => {
    const apply = () => {
      if (!setRowStatus) return;
      for (const t of threads) {
        const done = t.indicator === "none" && t.status === "idle" && !draftIds.has(t.id);
        setRowStatus(t.id, done ? DONE : null);
      }
    };
    onSetterReady = apply;
    apply();
    return () => {
      onSetterReady = null;
    };
  }, [threads, draftIds]);
  return null;
}

const CSS = `
@keyframes bb-session-activity-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes bb-session-activity-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
[aria-label="Thread working"] {
  animation:
    bb-session-activity-spin 1.1s linear infinite,
    bb-session-activity-breathe 2.2s ease-in-out infinite !important;
}
span[aria-label="Unread thread succeeded"] {
  background-color: var(--success, #22c55e) !important;
}
[aria-label="Thread finished"] {
  color: var(--success, #22c55e) !important;
}

@keyframes bb-session-activity-dot-1 {
  0%, 8% { opacity: 0.15; } 22%, 78% { opacity: 1; } 92%, 100% { opacity: 0.15; }
}
@keyframes bb-session-activity-dot-2 {
  0%, 26% { opacity: 0.15; } 40%, 78% { opacity: 1; } 92%, 100% { opacity: 0.15; }
}
@keyframes bb-session-activity-dot-3 {
  0%, 44% { opacity: 0.15; } 58%, 78% { opacity: 1; } 92%, 100% { opacity: 0.15; }
}
[data-bb-sa-hidden] { display: none !important; }
[data-bb-sa-term] .d { opacity: 0.15; }
[data-bb-sa-term] .d1 { animation: bb-session-activity-dot-1 1.8s ease-in-out infinite; }
[data-bb-sa-term] .d2 { animation: bb-session-activity-dot-2 1.8s ease-in-out infinite; }
[data-bb-sa-term] .d3 { animation: bb-session-activity-dot-3 1.8s ease-in-out infinite; }
`;

const TERMINAL_LABEL = "Background command running";
const SVG_NS = "http://www.w3.org/2000/svg";

// bb draws a running background command as a static Terminal glyph. Swap it
// for a copy whose underline is three dots that "type" one after another.
function buildTerminal(original: Element): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", TERMINAL_LABEL);
  svg.setAttribute("data-bb-sa-term", "");
  const cls = (original.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter((c) => c && !c.startsWith("animate-"))
    .join(" ");
  svg.setAttribute("class", cls);
  svg.innerHTML =
    '<polyline points="4 17 10 11 4 5"/>' +
    [13, 17, 21]
      .map(
        (cx, i) =>
          `<circle class="d d${i + 1}" cx="${cx}" cy="18" r="1.3" fill="currentColor" stroke="none"/>`,
      )
      .join("");
  return svg;
}

function enhance(root: ParentNode, added: SVGSVGElement[]) {
  const found = root.querySelectorAll(
    `svg[aria-label="${TERMINAL_LABEL}"]:not([data-bb-sa-term]):not([data-bb-sa-hidden])`,
  );
  for (const original of Array.from(found)) {
    const copy = buildTerminal(original);
    original.setAttribute("data-bb-sa-hidden", "");
    original.after(copy);
    added.push(copy);
  }
}

export default definePluginApp((app) => {
  app.slots.experimental_appOverlay({ id: "done-checks", component: DoneChecks });
  app.contentScripts.register({
    id: "session-activity-style",
    mount({ signal, experimental_setThreadRowStatus }) {
      setRowStatus = experimental_setThreadRowStatus ?? null;
      onSetterReady?.();
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);

      const added: SVGSVGElement[] = [];
      let frame = 0;
      const scan = () => {
        frame = 0;
        enhance(document, added);
      };
      const observer = new MutationObserver(() => {
        if (!frame) frame = requestAnimationFrame(scan);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      scan();
      const dispose = () => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
        for (const copy of added) copy.remove();
        for (const el of Array.from(document.querySelectorAll("[data-bb-sa-hidden]"))) {
          el.removeAttribute("data-bb-sa-hidden");
        }
        style.remove();
        setRowStatus = null;
      };
      signal.addEventListener("abort", dispose, { once: true });
      return dispose;
    },
  });
});
