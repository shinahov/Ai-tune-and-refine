import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter
} from "@assistant-ui/react";

const WORKER_URL = "https://ai-chat.ibshi100.workers.dev";
const MODEL = "gemma-3-27b-it";

export type LengthLevel = 1 | 2 | 3 | 4 | 5;

const LENGTH_CONFIG: Record<
  LengthLevel,
  { maxOutputTokens: number; instruction: string }
> = {
  1: {
    maxOutputTokens: 48,
    instruction: "Answer in one short sentence.",
  },
  2: {
    maxOutputTokens: 128,
    instruction: "Answer briefly in two to three sentences.",
  },
  3: {
    maxOutputTokens: 256,
    instruction: "Answer in one concise paragraph.",
  },
  4: {
    maxOutputTokens: 512,
    instruction: "Answer with detail using multiple short paragraphs.",
  },
  5: {
    maxOutputTokens: 1024,
    instruction: "Answer comprehensively with clear structure and examples when useful.",
  },
};

type GenerationSettingsValue = {
  outputLengthLevel: LengthLevel;
  setOutputLengthLevel: (value: LengthLevel) => void;
};

const GenerationSettingsContext = createContext<GenerationSettingsValue | null>(null);

export function useGenerationSettings() {
  const value = useContext(GenerationSettingsContext);
  if (!value) {
    throw new Error("useGenerationSettings must be used inside MyRuntimeProvider");
  }
  return value;
}

function toPrompt(text: string, instruction: string) {
  return `${instruction}\n\nUser message:\n${text}`;
}

export function MyRuntimeProvider({ children }:
  { children: ReactNode }) {
  const [outputLengthLevel, setOutputLengthLevel] = useState<LengthLevel>(3);

  const adapter = useMemo<ChatModelAdapter>(() => ({
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

      const levelConfig = LENGTH_CONFIG[outputLengthLevel];

      const body: any = {
        message: toPrompt(text, levelConfig.instruction),
        model: MODEL,
        generationConfig: {
          maxOutputTokens: levelConfig.maxOutputTokens,
          temperature: 0.2,
          topP: 0.95,
          topK: 64,
        },
      };

      const res = await fetch(`${WORKER_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }), [outputLengthLevel]);

  const runtime = useLocalRuntime(adapter);

  return (
    <GenerationSettingsContext.Provider value={{ outputLengthLevel, setOutputLengthLevel }}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </GenerationSettingsContext.Provider>
  );
}
