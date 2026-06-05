"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService, parentAiService, type ThreadResponse } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { Panel, DButton, Pill } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { Sparkles, MessagesSquare, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/locale";

export default function AiTutorPage() {
  const qc = useQueryClient();
  const { family } = useFamilyStore();
  const t = useT();

  const [selectedChild, setSelectedChild] = useState<string>("");
  const [limitInput, setLimitInput] = useState<string>("");
  const [openThread, setOpenThread] = useState<ThreadResponse | null>(null);

  const { data: children } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => (await familyService.getChildren(family!.id)).data.data,
    enabled: !!family?.id,
  });

  useEffect(() => {
    if (children && children.length > 0 && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  // Reset the open conversation when switching child.
  useEffect(() => { setOpenThread(null); }, [selectedChild]);

  const { data: settings } = useQuery({
    queryKey: ["ai-settings", family?.id, selectedChild],
    queryFn: async () => (await parentAiService.getSettings(family!.id, selectedChild)).data.data,
    enabled: !!family?.id && !!selectedChild,
  });

  useEffect(() => {
    setLimitInput(settings?.dailyLimitCustom ? String(settings.dailyLimit) : "");
  }, [settings]);

  const { data: threads } = useQuery({
    queryKey: ["ai-threads", family?.id, selectedChild],
    queryFn: async () => (await parentAiService.threads(family!.id, selectedChild)).data.data,
    enabled: !!family?.id && !!selectedChild,
  });

  const { data: messages } = useQuery({
    queryKey: ["ai-thread-messages", family?.id, selectedChild, openThread?.id],
    queryFn: async () =>
      (await parentAiService.threadMessages(family!.id, selectedChild, openThread!.id)).data.data,
    enabled: !!family?.id && !!selectedChild && !!openThread?.id,
  });

  const save = useMutation({
    mutationFn: (p: { enabled: boolean; dailyLimit: number | null }) =>
      parentAiService.updateSettings(family!.id, selectedChild, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-settings", family!.id, selectedChild] });
      toast.success(t("aiTutor.saved"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const toggleEnabled = () =>
    settings && save.mutate({
      enabled: !settings.enabled,
      dailyLimit: settings.dailyLimitCustom ? settings.dailyLimit : null,
    });

  const saveLimit = () => {
    if (!settings) return;
    const parsed = limitInput.trim() === "" ? null : Math.round(parseFloat(limitInput));
    save.mutate({ enabled: settings.enabled, dailyLimit: parsed && parsed > 0 ? parsed : null });
  };

  if (!family) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{t("nav.aiTutor")}</h1>
        <p className="text-white/50">{t("cards.needFamily")}</p>
      </div>
    );
  }

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-fuchsia-300" /> {t("aiTutor.title")}
        </h1>
        <p className="text-white/50 mt-1 text-sm">{t("aiTutor.subtitle")}</p>
      </MotionItem>

      {children && children.length > 0 ? (
        <MotionItem>
          <div className="flex gap-2 flex-wrap">
            {children.map((c) => (
              <Pill key={c.id} active={selectedChild === c.id} onClick={() => setSelectedChild(c.id)}>{c.fullName}</Pill>
            ))}
          </div>
        </MotionItem>
      ) : (
        <p className="text-white/50 text-sm">{t("limits.needChildren")}</p>
      )}

      {selectedChild && (
        <MotionItem>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Controls */}
            <Panel className="p-6 space-y-5">
              <div>
                <p className="font-medium tracking-tight">{t("aiTutor.controlsTitle")}</p>
                <p className="text-xs text-white/40">{t("aiTutor.controlsHint")}</p>
              </div>

              {/* On/off (parental consent) */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.05] p-3.5">
                <div>
                  <p className="text-sm font-medium">{t("aiTutor.enableLabel")}</p>
                  <p className="text-xs text-white/40">{t("aiTutor.enableHint")}</p>
                </div>
                <button
                  onClick={toggleEnabled}
                  disabled={!settings || save.isPending}
                  aria-pressed={settings?.enabled ?? false}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    settings?.enabled ? "bg-fuchsia-500" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      settings?.enabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Daily limit */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("aiTutor.limitLabel")}</p>
                <p className="text-xs text-white/40">{t("aiTutor.limitHint")}</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder={t("aiTutor.limitDefault")}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-fuchsia-400/50 focus:outline-none"
                  />
                  <DButton onClick={saveLimit} disabled={!settings || save.isPending}>
                    {save.isPending ? t("common.saving") : t("common.save")}
                  </DButton>
                </div>
                {settings && (
                  <p className="text-xs text-white/35">
                    {t("aiTutor.currentLimit")}: <span className="text-white/60">{settings.dailyLimit}</span>
                    {!settings.dailyLimitCustom && ` (${t("aiTutor.defaultTag")})`}
                  </p>
                )}
              </div>
            </Panel>

            {/* Conversations */}
            <Panel className="p-6 space-y-4">
              {!openThread ? (
                <>
                  <div>
                    <p className="font-medium tracking-tight">{t("aiTutor.historyTitle")}</p>
                    <p className="text-xs text-white/40">{t("aiTutor.historyHint")}</p>
                  </div>
                  {!threads || threads.length === 0 ? (
                    <p className="text-sm text-white/40">{t("aiTutor.noHistory")}</p>
                  ) : (
                    <div className="space-y-2">
                      {threads.map((th) => (
                        <button
                          key={th.id}
                          onClick={() => setOpenThread(th)}
                          className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 text-left hover:bg-white/[0.07]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
                            <MessagesSquare className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{th.title ?? t("aiTutor.untitled")}</p>
                            <p className="text-[11px] text-white/35">{new Date(th.updatedAt).toLocaleDateString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOpenThread(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.06] text-white/60 hover:text-white">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <p className="truncate text-sm font-semibold">{openThread.title ?? t("aiTutor.untitled")}</p>
                  </div>
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto">
                    {(messages ?? []).map((m, i) => (
                      <div key={i} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            m.role === "USER"
                              ? "whitespace-pre-wrap bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                              : "border border-white/[0.07] bg-white/[0.06] text-white/90"
                          }`}
                        >
                          {m.role === "USER" ? m.content : <ChatMarkdown text={m.content} />}
                        </div>
                      </div>
                    ))}
                    {messages && messages.length === 0 && (
                      <p className="text-sm text-white/40">{t("aiTutor.emptyThread")}</p>
                    )}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </MotionItem>
      )}
    </MotionStagger>
  );
}
