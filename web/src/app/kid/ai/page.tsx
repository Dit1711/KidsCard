"use client";

import { useEffect, useRef, useState } from "react";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { Sparkles, Send } from "lucide-react";
import { useT } from "@/i18n/locale";

type Msg = { role: string; content: string };

export default function KidAiPage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limited, setLimited] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChildAuthed) return;
    childAuthService
      .aiHistory()
      .then((r) => setMessages(r.data.data.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => {});
  }, [isChildAuthed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || limited) return;
    setInput("");
    setMessages((m) => [...m, { role: "USER", content: text }]);
    setSending(true);
    try {
      const r = (await childAuthService.aiChat(text)).data.data;
      if (r.limited) setLimited(true);
      else setMessages((m) => [...m, { role: "ASSISTANT", content: r.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "ASSISTANT", content: t("ai.error") }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[76vh] flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles className="h-5 w-5 text-white" />
        </span>
        <div>
          <h2 className="text-base font-bold leading-none">{t("ai.title")}</h2>
          <p className="text-[11px] text-white/40 mt-0.5">{t("ai.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-4 text-sm text-white/70">
            {t("ai.welcome")}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "USER"
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                  : "bg-white/[0.06] border border-white/[0.07] text-white/90"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.07] px-3.5 py-2.5 text-sm text-white/40">
              {t("ai.thinking")}
            </div>
          </div>
        )}
        {limited && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200">
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
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder={t("ai.placeholder")}
            disabled={limited}
            className="flex-1 resize-none rounded-2xl bg-white/[0.05] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-fuchsia-400/50 disabled:opacity-50"
          />
          <button
            onClick={send}
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
