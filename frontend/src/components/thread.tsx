import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/attachment";
import { MarkdownText } from "@/components/markdown-text";
import { ToolFallback } from "@/components/tool-fallback";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useGenerationSettings,
  type LengthLevel,
  type TemperatureLevel,
} from "@/MyRuntimeProvider";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
  Settings2,
  Thermometer,
  ThermometerSnowflake,
  ThermometerSun,
  AlignLeft,
  Minus,
  Menu,
  FileText,
  BookText,
  Snowflake,
  CircleSlash2,
  Flame,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Slider from "@radix-ui/react-slider";
import { useEffect, useRef, useState, type FC } from "react";
const WORKER_URL = "https://ai-chat.ibshi100.workers.dev";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-dvh flex-col overflow-hidden bg-background"
      style={{
        ["--thread-max-width" as string]: "44rem",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth px-4 pt-4"
      >
        <AuiIf condition={({ thread }) => thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer mx-auto mt-4 flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-3xl pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <SelectionExplainBubble />
    </ThreadPrimitive.Root>
  );
};

const SelectionExplainBubble: FC = () => {
  const selectedRangeRef = useRef<Range | null>(null);
  const insertTargetRef = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{
    visible: boolean;
    left: number;
    top: number;
    text: string;
    action: "explain" | "insert";
  }>({
    visible: false,
    left: 0,
    top: 0,
    text: "",
    action: "explain",
  });

  useEffect(() => {
    const hide = () => {
      setSelection((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    const updateFromSelection = () => {
      const selected = window.getSelection();
      if (!selected || selected.rangeCount === 0 || selected.isCollapsed) {
        hide();
        return;
      }

      const text = selected.toString().trim();
      if (!text) {
        hide();
        return;
      }

      const range = selected.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hide();
        return;
      }

      selectedRangeRef.current = range.cloneRange();

      setSelection({
        visible: true,
        left: rect.left + rect.width / 2,
        top: Math.max(8, rect.top - 38),
        text,
        action: "explain",
      });
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".aui-explain-selection-bubble")) return;
      hide();
    };

    const onExplainTargetClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const highlight = target?.closest('[data-explain-highlight="true"]') as HTMLElement | null;
      if (!highlight) return;

      const explanation = highlight.nextElementSibling as HTMLElement | null;
      if (!explanation || explanation.dataset.explainText !== "true") return;
      explanation.style.display = "inline";
    };

    const onExplanationClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const explanation = target?.closest('[data-explain-text="true"]') as HTMLElement | null;
      if (!explanation) return;

      const rect = explanation.getBoundingClientRect();
      insertTargetRef.current = explanation;
      setSelection({
        visible: true,
        left: rect.left + rect.width / 2,
        top: Math.max(8, rect.top - 38),
        text: explanation.textContent ?? "",
        action: "insert",
      });
    };

    document.addEventListener("mouseup", updateFromSelection);
    document.addEventListener("touchend", updateFromSelection);
    document.addEventListener("keyup", updateFromSelection);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onMouseDown as EventListener);
    document.addEventListener("click", onExplainTargetClick);
    document.addEventListener("click", onExplanationClick);
    window.addEventListener("scroll", updateFromSelection, true);
    window.addEventListener("resize", updateFromSelection);

    return () => {
      document.removeEventListener("mouseup", updateFromSelection);
      document.removeEventListener("touchend", updateFromSelection);
      document.removeEventListener("keyup", updateFromSelection);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onMouseDown as EventListener);
      document.removeEventListener("click", onExplainTargetClick);
      document.removeEventListener("click", onExplanationClick);
      window.removeEventListener("scroll", updateFromSelection, true);
      window.removeEventListener("resize", updateFromSelection);
    };
  }, []);

  const onExplain = () => {
    if (selection.action === "insert") {
      const target = insertTargetRef.current;
      if (!target) return;

      const inserted = document.createElement("span");
      inserted.textContent = " inserted explanation";
      inserted.style.color = "#4b5563";
      inserted.style.marginLeft = "0.35rem";
      target.insertAdjacentElement("afterend", inserted);
      insertTargetRef.current = null;
      setSelection((prev) => ({ ...prev, visible: false }));
      return;
    }

    const range = selectedRangeRef.current;
    if (!range || range.collapsed) return;

    const highlight = document.createElement("span");
    highlight.dataset.explainHighlight = "true";
    highlight.className = "aui-explain-highlight aui-explain-highlight-loading";

    const explanation = document.createElement("span");
    explanation.dataset.explainText = "true";
    explanation.textContent = "";
    explanation.style.display = "none";
    explanation.className = "aui-explain-text aui-explain-loading";

    try {
      const extracted = range.extractContents();
      highlight.appendChild(extracted);
      range.insertNode(highlight);
      highlight.insertAdjacentElement("afterend", explanation);
    } catch {
      return;
    }

    const selectedText = highlight.textContent?.trim() ?? "";
    void fetch(`${WORKER_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: selectedText }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Explain failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const text = String(data?.text ?? "").trim();
        explanation.textContent = text ? ` ${text}` : " text explanation";
        explanation.style.display = "inline";
        explanation.classList.remove("aui-explain-loading");
        highlight.classList.remove("aui-explain-highlight-loading");
      })
      .catch(() => {
        explanation.textContent = " explanation unavailable";
        explanation.style.display = "inline";
        explanation.classList.remove("aui-explain-loading");
        highlight.classList.remove("aui-explain-highlight-loading");
      });

    window.getSelection()?.removeAllRanges();
    selectedRangeRef.current = null;
    setSelection((prev) => ({ ...prev, visible: false }));
  };

  if (!selection.visible) return null;

  return (
    <div
      className="aui-explain-selection-bubble fixed z-50 -translate-x-1/2"
      style={{ left: selection.left, top: selection.top }}
    >
      <button
        type="button"
        onClick={onExplain}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-100 shadow-sm hover:bg-zinc-800"
        aria-label="Explain selected word"
      >
        {selection.action === "insert" ? "Insert explanation" : "Explain"}
      </button>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in font-semibold text-2xl duration-200">
            Hello there!
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in text-muted-foreground text-xl delay-75 duration-200">
            How can I help you today?
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
      <ThreadPrimitive.Suggestions
        components={{
          Suggestion: ThreadSuggestionItem,
        }}
      />
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 @md:nth-[n+3]:block nth-[n+3]:hidden animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion h-auto w-full @md:flex-col flex-wrap items-start justify-start gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
        >
          <span className="aui-thread-welcome-suggestion-text-1 font-medium">
            <SuggestionPrimitive.Title />
          </span>
          <span className="aui-thread-welcome-suggestion-text-2 text-muted-foreground">
            <SuggestionPrimitive.Description />
          </span>
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

export const SettingsMenu = () => {
  const { outputLengthLevel, setOutputLengthLevel } = useGenerationSettings();
  const icons = [Minus, AlignLeft, Menu, FileText, BookText];

  const setLevel = (value: number) => {
    const clamped = Math.max(1, Math.min(5, Math.round(value))) as LengthLevel;
    setOutputLengthLevel(clamped);
  };

  return (<DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
        aria-label="Open settings"
      >
        <Settings2 size={16} strokeWidth={1.25} />
      </button>
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content
        side="top"
        align="start"
        className="rounded-md border-0 bg-white p-2 shadow-none"
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-muted-foreground">
            {icons.map((Icon, i) => {
              const v = i + 1;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLevel(v)}
                  className="p-1"
                  aria-label={`Set value ${v}`}
                >
                  <Icon className={cn("size-4", outputLengthLevel === v && "text-blue-600")} />
                </button>
              );
            })}
          </div>
          <Slider.Root
            value={[outputLengthLevel]}
            onValueChange={([v]: number[]) => setLevel(v)}
            min={1}
            max={5}
            step={1}
            className="relative flex w-40 items-center"
          >
            <Slider.Track className="relative h-1 w-full rounded-full bg-muted">
              <Slider.Range className="absolute h-full rounded-full bg-blue-600" />
            </Slider.Track>
            <Slider.Thumb className="block size-4 rounded-full bg-blue-600 ring-2 ring-background" />
          </Slider.Root>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>);
};

export const TemperatureMenu = () => {
  const { temperatureLevel, setTemperatureLevel } = useGenerationSettings();
  const icons = [Snowflake, CircleSlash2, Flame];

  const setLevel = (value: number) => {
    const clamped = Math.max(1, Math.min(3, Math.round(value))) as TemperatureLevel;
    setTemperatureLevel(clamped);
  };

  const TriggerIcon =
    temperatureLevel === 1
      ? ThermometerSnowflake
      : temperatureLevel === 3
        ? ThermometerSun
        : Thermometer;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent"
          aria-label="Open temperature settings"
        >
          <TriggerIcon size={16} strokeWidth={1.25} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          className="rounded-md border-0 bg-white p-2 shadow-none"
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-muted-foreground">
              {icons.map((Icon, i) => {
                const v = i + 1;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLevel(v)}
                    className="p-1"
                    aria-label={`Set temperature ${v}`}
                  >
                    <Icon className={cn("size-4", temperatureLevel === v && "text-blue-600")} />
                  </button>
                );
              })}
            </div>
            <Slider.Root
              value={[temperatureLevel]}
              onValueChange={([v]: number[]) => setLevel(v)}
              min={1}
              max={3}
              step={1}
              className="relative flex w-32 items-center"
            >
              <Slider.Track className="relative h-1 w-full rounded-full bg-muted">
                <Slider.Range className="absolute h-full rounded-full bg-blue-600" />
              </Slider.Track>
              <Slider.Thumb className="block size-4 rounded-full bg-blue-600 ring-2 ring-background" />
            </Slider.Root>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone className="aui-composer-attachment-dropzone flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="aui-composer-input mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative mx-2 mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ComposerAddAttachment />
        <SettingsMenu />
        <TemperatureMenu />
      </div>
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-8 rounded-full"
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label="Stop generating"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
      data-role="assistant"
    >
      <div className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: { Fallback: ToolFallback },
          }}
        />
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={({ message }) => message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

