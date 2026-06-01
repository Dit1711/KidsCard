"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { useAuthStore } from "@/store/auth";
import { ChildAccessPanel } from "@/components/ChildAccessPanel";
import { Panel, DInput, DLabel, DButton, DBadge } from "@/components/dark";
import { MotionStagger, MotionItem } from "@/components/motion";
import { toast } from "sonner";
import { UserPlus, Plus } from "lucide-react";

function calcAge(dob: string) {
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

const AGE_GROUP_LABELS: Record<string, string> = {
  CHILD_6_10: "6–10 лет",
  CHILD_11_14: "11–14 лет",
  TEEN_15_17: "15–17 лет",
};
const ageGroupLabel = (g: string) => AGE_GROUP_LABELS[g] ?? g.replace(/_/g, " ");

export default function FamilyPage() {
  const qc = useQueryClient();
  const { family, setFamily } = useFamilyStore();
  const { user } = useAuthStore();

  const [showInvite, setShowInvite] = useState(false);
  const [coPhone, setCoPhone] = useState("");
  const [coName, setCoName] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [familyName, setFamilyName] = useState("");
  const [fullName, setFullName] = useState("");

  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [showAddChild, setShowAddChild] = useState(false);

  const { isLoading, error } = useQuery({
    queryKey: ["my-family"],
    queryFn: async () => {
      const { data } = await familyService.getMyFamily();
      setFamily(data.data);
      return data.data;
    },
    retry: false,
  });

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  const createFamily = useMutation({
    mutationFn: () => familyService.create(familyName, fullName),
    onSuccess: ({ data }) => {
      setFamily(data.data);
      qc.invalidateQueries({ queryKey: ["my-family"] });
      toast.success("Семья создана");
    },
    onError: () => toast.error("Не удалось создать семью"),
  });

  const addChild = useMutation({
    mutationFn: () => familyService.addChild(family!.id, { fullName: childName, dateOfBirth: childDob }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-children", family!.id] });
      setChildName("");
      setChildDob("");
      setShowAddChild(false);
      toast.success("Ребёнок добавлен");
    },
    onError: () => toast.error("Ошибка добавления"),
  });

  const inviteCoParent = useMutation({
    mutationFn: () => familyService.inviteCoParent(family!.id, coPhone.trim(), coName.trim()),
    onSuccess: async () => {
      const { data } = await familyService.getMyFamily();
      setFamily(data.data);
      qc.invalidateQueries({ queryKey: ["my-family"] });
      setCoPhone("");
      setCoName("");
      setInviteError("");
      setShowInvite(false);
      toast.success("Со-родитель добавлен");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setInviteError(e.response?.data?.error?.message ?? "Не удалось пригласить со-родителя");
    },
  });

  const myRole = family?.parents.find((p) => p.userId === user?.id)?.role;
  const isOwner = myRole === "OWNER";
  const noFamily = !isLoading && !family && error;

  return (
    <MotionStagger className="space-y-6">
      <MotionItem>
        <h1 className="text-2xl font-bold tracking-tight">Семья</h1>
      </MotionItem>

      {isLoading && <p className="text-white/50">Загрузка…</p>}

      {noFamily && (
        <MotionItem>
          <Panel>
            <p className="font-semibold text-lg">Создайте семью</p>
            <p className="text-white/50 text-sm mt-1 mb-4">Семья — это центр управления картами и детьми</p>
            <div className="space-y-3">
              <div>
                <DLabel>Название семьи</DLabel>
                <DInput placeholder="Семья Ивановых" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
              </div>
              <div>
                <DLabel>Ваше имя</DLabel>
                <DInput placeholder="Иван Иванов" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <DButton onClick={() => createFamily.mutate()} disabled={!familyName || !fullName || createFamily.isPending} className="w-full">
                {createFamily.isPending ? "Создание…" : "Создать семью"}
              </DButton>
            </div>
          </Panel>
        </MotionItem>
      )}

      {family && (
        <>
          <MotionItem>
            <Panel className="p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{family.name}</p>
                <p className="text-xs text-white/40 mt-0.5">Создана {new Date(family.createdAt).toLocaleDateString("ru-RU")}</p>
              </div>
              <DBadge tone={family.status === "ACTIVE" ? "success" : "muted"}>{family.status}</DBadge>
            </Panel>
          </MotionItem>

          {/* Parents */}
          <MotionItem>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Родители</h2>
              {isOwner && (
                <DButton variant="outline" onClick={() => { setShowInvite(!showInvite); setInviteError(""); }} className="py-2">
                  {showInvite ? "Отмена" : <><UserPlus className="h-4 w-4" /> Пригласить</>}
                </DButton>
              )}
            </div>

            {showInvite && isOwner && (
              <Panel className="p-5 mb-3 space-y-3">
                <p className="text-sm text-white/50">Со-родитель должен быть уже зарегистрирован в KidsCard по своему номеру.</p>
                <div>
                  <DLabel>Телефон</DLabel>
                  <DInput placeholder="+998901112233" value={coPhone} onChange={(e) => setCoPhone(e.target.value)} />
                </div>
                <div>
                  <DLabel>Имя</DLabel>
                  <DInput placeholder="Мама / Папа / Имя" value={coName} onChange={(e) => setCoName(e.target.value)} />
                </div>
                {inviteError && <p className="text-sm text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{inviteError}</p>}
                <DButton onClick={() => inviteCoParent.mutate()} disabled={!coPhone || !coName || inviteCoParent.isPending} className="w-full">
                  {inviteCoParent.isPending ? "Приглашаем…" : "Пригласить"}
                </DButton>
              </Panel>
            )}

            <div className="space-y-2.5">
              {family.parents.map((p) => (
                <Panel key={p.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium">
                        {p.fullName}
                        {p.userId === user?.id && <span className="ml-2 text-xs text-white/40">(вы)</span>}
                      </p>
                      <p className="text-sm text-white/40 tabular-nums">{p.phone}</p>
                    </div>
                  </div>
                  <DBadge tone={p.role === "OWNER" ? "default" : "muted"}>
                    {p.role === "OWNER" ? "Владелец" : "Со-родитель"}
                  </DBadge>
                </Panel>
              ))}
            </div>
          </MotionItem>

          {/* Children */}
          <MotionItem>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Дети</h2>
              <DButton variant="outline" onClick={() => setShowAddChild(!showAddChild)} className="py-2">
                {showAddChild ? "Отмена" : <><Plus className="h-4 w-4" /> Добавить</>}
              </DButton>
            </div>

            {showAddChild && (
              <Panel className="p-5 mb-3 space-y-3">
                <div>
                  <DLabel>Имя ребёнка</DLabel>
                  <DInput placeholder="Анна Иванова" value={childName} onChange={(e) => setChildName(e.target.value)} />
                </div>
                <div>
                  <DLabel>Дата рождения</DLabel>
                  <DInput type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} max={new Date().toISOString().split("T")[0]} className="[color-scheme:dark]" />
                </div>
                <DButton onClick={() => addChild.mutate()} disabled={!childName || !childDob || addChild.isPending} className="w-full">
                  {addChild.isPending ? "Добавление…" : "Добавить"}
                </DButton>
              </Panel>
            )}

            {childrenLoading && <p className="text-white/50">Загрузка детей…</p>}
            {children?.length === 0 && <p className="text-white/50 text-sm">Детей ещё нет. Добавьте первого ребёнка.</p>}

            <div className="space-y-2.5">
              {children?.map((child) => (
                <Panel key={child.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                        {child.fullName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium">{child.fullName}</p>
                        <p className="text-sm text-white/40">{calcAge(child.dateOfBirth)} лет · {ageGroupLabel(child.ageGroup)}</p>
                      </div>
                    </div>
                    <DBadge tone={child.status === "ACTIVE" ? "success" : "muted"}>{child.status}</DBadge>
                  </div>
                  {family && (
                    <ChildAccessPanel childId={child.id} familyId={family.id} childName={child.fullName} />
                  )}
                </Panel>
              ))}
            </div>
          </MotionItem>
        </>
      )}
    </MotionStagger>
  );
}
