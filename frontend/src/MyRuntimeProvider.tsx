import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter
} from "@assistant-ui/react";

const WORKER_URL = "https://ai-chat.ibshi100.workers.dev";
const GEMMA_3_27B = "gemma-3-27b-it";
const GEMINI_2_5_PRO = "gemini-2.5-pro"
const GEMINI_2_FLASH = "gemini-2.0-flash"
const GEMINI_2_5_FLASH = "gemini-2.5-flash"
const GEMINI_2_5_FLASH_LIGHT = "gemini-2.5-flash-lite" // all higher models have a limit, cant use right now
const MODEL = GEMMA_3_27B;



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
      body: JSON.stringify({
        message: text,
        model: MODEL,
        generationConfig: { maxOutputTokens: 1, temperature: 0.2 },
        systemInstruction: "Give short anwsers."
      }),

      signal: abortSignal,
    });

    if (!res.ok) {
      const status = res.status;
      const statusText = res.statusText;

      const bodyText = await res.text().catch(() => "");
      console.error("Worker error", { status, statusText, bodyText });

      throw new Error(
        `Worker ${status} ${statusText}: ${bodyText || "(empty body)"}`
      );
    }


    const data = await res.json();
    console.log("worker response", data);



    return {
      content: [{ type: "text", text: String(data.text ?? "") }],
    };
  },
};

export function MyRuntimeProvider({ children }:
  { children: ReactNode }) {
  const runtime = useLocalRuntime(adapter);
  return <AssistantRuntimeProvider
    runtime={runtime}>{children}
  </AssistantRuntimeProvider>;
}
