import type { ReactNode } from "react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";

const WORKER_URL = "https://ai-chat.ibshi100.workers.dev";
const MODEL = "gemma-3-1b-it";

const adapter: ChatModelAdapter = {
  async run({ messages, abortSignal }) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    const text =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : Array.isArray(lastUser?.content)
          ? lastUser.content
              .filter((p: any) => p?.type === "text")
              .map((p: any) => p.text)
              .join("")
          : "";

    const res = await fetch(`${WORKER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, model: MODEL }),
      signal: abortSignal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Worker ${res.status}: ${err}`);
    }

    const data = await res.json();

    return {
      content: [{ type: "text", text: String(data.text ?? "") }],
    };
  },
};

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useLocalRuntime(adapter);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
