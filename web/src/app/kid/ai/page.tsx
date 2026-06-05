"use client";

import { useEffect, useRef, useState } from "react";
import { childAuthService, type ThreadResponse } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { Sparkles, Send, Plus, ChevronLeft, BookOpen, Wallet, MessageCircle, MessagesSquare } from "lucide-react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { useT } from "@/i18n/locale";

type Msg = { role: string; content: string };

export default function KidAiPage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();

  const [view, setView] = useState<"list" | "chat">("list");
  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limited, setLimited] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = () => {
    childAuthService.aiThreads().then((r) => setThreads(r.data.data)).catch(() => {});
  };
  useEffect(() => { if (isChildAuthed) loadThreads(); }, [isChildAuthed]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const openThread = async (th: ThreadResponse) => {
    setActiveThreadId(th.id);
    setActiveTitle(th.title);
    setMessages([]);
    setLimited(false);
    setView("chat");
    try {
      const r = await childAuthService.aiThreadMessages(th.id);
      setMessages(r.data.data.map((m) => ({ role: m.role, content: m.content })));
    } catch { /* ignore */ }
  };

  const startNew = () => {
    setActiveThreadId(null);
    setActiveTitle(null);
    setMessages([]);
    setLimited(false);
    setView("chat");
  };

  const backToList = () => {
    setView("list");
    loadThreads();
  };

  const send = async (text: string, threadOverride?: string | null) => {
    const msg = text.trim();
    if (!msg || sending || limited) return;
    const tid = threadOverride !== undefined ? threadOverride : activeThreadId;
    setInput("");
    setMessages((m) => [...m, { role: "USER", content: msg }]);
    setSending(true);
    try {
      const r = (await childAuthService.aiChat(msg, tid ?? undefined)).data.data;
      if (r.threadId) setActiveThreadId(r.threadId);
      if (r.threadTitle) setActiveTitle(r.threadTitle);
      if (r.limited) setLimited(true);
      else setMessages((m) => [...m, { role: "ASSISTANT", content: r.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "ASSISTANT", content: t("ai.error") }]);
    } finally {
      setSending(false);
    }
  };

  const startTopic = (starterKey: string) => {
    setActiveThreadId(null);
    setActiveTitle(null);
    setMessages([]);
    setLimited(false);
    setView("chat");
    send(t(starterKey), null);
  };

  const topics = [
    { key: "ai.starterLessons", label: "ai.topicLessons", Icon: BookOpen },
    { key: "ai.starterMoney", label: "ai.topicMoney", Icon: Wallet },
    { key: "ai.starterChat", label: "ai.topicChat", Icon: MessageCircle },
  ];

  // ── Conversation list ──
  if (view === "list") {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-bold leading-none">{t("ai.title")}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">{t("ai.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={startNew}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus className="h-5 w-5" /> {t("ai.newChat")}
        </button>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {topics.map((tp) => (
            <button
              key={tp.label}
              onClick={() => startTopic(tp.key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-2 py-3 text-center hover:bg-white/[0.06]"
            >
              <tp.Icon className="h-5 w-5 text-fuchsia-300" />
              <span className="text-[11px] font-medium leading-tight text-white/70">{t(tp.label)}</span>
            </button>
          ))}
        </div>

        {threads.length === 0 ? (
          <p className="px-1 text-sm text-white/40">{t("ai.noThreads")}</p>
        ) : (
          <div className="space-y-2">
            {threads.map((th) => (
              <button
                key={th.id}
                onClick={() => openThread(th)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-left hover:bg-white/[0.06]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                  <MessagesSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{th.title ?? t("ai.untitled")}</p>
                  <p className="text-[11px] text-white/35">{new Date(th.updatedAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Chat view ──
  return (
    <div className="flex min-h-[76vh] flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <button onClick={backToList} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/60 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        <h2 className="truncate text-sm font-bold">{activeTitle ?? t("ai.newChat")}</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && !sending && (
          <>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-sm text-white/70">
              {t("ai.welcome")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {topics.map((tp) => (
                <button
                  key={tp.label}
                  onClick={() => send(t(tp.key), null)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-2 py-3 text-center hover:bg-white/[0.06]"
                >
                  <tp.Icon className="h-5 w-5 text-fuchsia-300" />
                  <span className="text-[11px] font-medium leading-tight text-white/70">{t(tp.label)}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "USER"
                  ? "whitespace-pre-wrap bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                  : "bg-white/[0.06] border border-white/[0.07] text-white/90"
              }`}
            >
              {m.role === "USER" ? m.content : <ChatMarkdown text={m.content} />}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.06] px-3.5 py-2.5 text-sm text-white/40">
              {t("ai.thinking")}
            </div>
          </div>
        )}
        {limited && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            {t("ai.limited")}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 pt-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={1}
            placeholder={t("ai.placeholder")}
            disabled={limited}
            className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending || limited}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-white/30">{t("ai.disclaimer")}</p>
      </div>
    </div>
  );
}
