import type { BbPluginApi } from "@get-bb/plugin-sdk";

// Presentation-only plugin: all behaviour lives in app.tsx.
export default async function plugin(bb: BbPluginApi): Promise<void> {
  bb.log.info("session-activity ready");
}
