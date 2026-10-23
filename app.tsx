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
`;

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
      const dispose = () => {
        style.remove();
        setRowStatus = null;
      };
      signal.addEventListener("abort", dispose, { once: true });
      return dispose;
    },
  });
});
