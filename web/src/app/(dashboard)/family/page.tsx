"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
import { useAuthStore } from "@/store/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChildAccessPanel } from "@/components/ChildAccessPanel";

function calcAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  return now.getFullYear() - birth.getFullYear();
}

const AGE_GROUP_LABELS: Record<string, string> = {
  CHILD_6_10: "6–10 лет",
  CHILD_11_14: "11–14 лет",
  TEEN_15_17: "15–17 лет",
};

function ageGroupLabel(group: string) {
  return AGE_GROUP_LABELS[group] ?? group.replace(/_/g, " ");
}

export default function FamilyPage() {
  const qc = useQueryClient();
  const { family, setFamily } = useFamilyStore();
  const { user } = useAuthStore();

  // Invite co-parent form
  const [showInvite, setShowInvite] = useState(false);
  const [coPhone, setCoPhone] = useState("");
  const [coName, setCoName] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Create family form
  const [familyName, setFamilyName] = useState("");
  const [fullName, setFullName] = useState("");

  // Add child form
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [showAddChild, setShowAddChild] = useState(false);

  // Load family
  const { isLoading, error } = useQuery({
    queryKey: ["my-family"],
    queryFn: async () => {
      const { data } = await familyService.getMyFamily();
      setFamily(data.data);
      return data.data;
    },
    retry: false,
  });

  // Load children
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ["family-children", family?.id],
    queryFn: async () => {
      const { data } = await familyService.getChildren(family!.id);
      return data.data;
    },
    enabled: !!family?.id,
  });

  // Create family mutation
  const createFamily = useMutation({
    mutationFn: () => familyService.create(familyName, fullName),
    onSuccess: ({ data }) => {
      setFamily(data.data);
      qc.invalidateQueries({ queryKey: ["my-family"] });
    },
  });

  // Add child mutation
  const addChild = useMutation({
    mutationFn: () =>
      familyService.addChild(family!.id, {
        fullName: childName,
        dateOfBirth: childDob,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-children", family!.id] });
      setChildName("");
      setChildDob("");
      setShowAddChild(false);
    },
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Семья</h1>

      {isLoading && <p className="text-gray-400">Загрузка...</p>}

      {/* No family yet */}
      {noFamily && (
        <Card>
          <CardHeader>
            <CardTitle>Создайте семью</CardTitle>
            <CardDescription>
              Семья — это центр управления картами и детьми
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Название семьи</Label>
              <Input
                id="familyName"
                placeholder="Семья Ивановых"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Ваше имя</Label>
              <Input
                id="fullName"
                placeholder="Иван Иванов"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            {createFamily.isError && (
              <p className="text-sm text-red-500">
                Ошибка при создании семьи
              </p>
            )}
            <Button
              onClick={() => createFamily.mutate()}
              disabled={!familyName || !fullName || createFamily.isPending}
              className="w-full"
            >
              {createFamily.isPending ? "Создание..." : "Создать семью"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Family exists */}
      {family && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{family.name}</CardTitle>
                <Badge>{family.status}</Badge>
              </div>
              <CardDescription>
                Создана {new Date(family.createdAt).toLocaleDateString("ru-RU")}
              </CardDescription>
            </CardHeader>
          </Card>

          <Separator />

          {/* Parents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Родители</h2>
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowInvite(!showInvite); setInviteError(""); }}
                >
                  {showInvite ? "Отмена" : "+ Пригласить со-родителя"}
                </Button>
              )}
            </div>

            {showInvite && isOwner && (
              <Card className="mb-4">
                <CardContent className="pt-4 space-y-3">
                  <CardDescription>
                    Со-родитель должен быть уже зарегистрирован в KidsCard по своему номеру телефона.
                  </CardDescription>
                  <div className="space-y-2">
                    <Label>Телефон</Label>
                    <Input
                      placeholder="+998901112233"
                      value={coPhone}
                      onChange={(e) => setCoPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Имя</Label>
                    <Input
                      placeholder="Мама / Папа / Имя"
                      value={coName}
                      onChange={(e) => setCoName(e.target.value)}
                    />
                  </div>
                  {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                  <Button
                    onClick={() => inviteCoParent.mutate()}
                    disabled={!coPhone || !coName || inviteCoParent.isPending}
                    className="w-full"
                  >
                    {inviteCoParent.isPending ? "Приглашаем…" : "Пригласить"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {family.parents.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-4 pb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {p.fullName}
                        {p.userId === user?.id && (
                          <span className="ml-2 text-xs text-gray-400">(вы)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">{p.phone}</p>
                    </div>
                    <Badge variant={p.role === "OWNER" ? "default" : "secondary"}>
                      {p.role === "OWNER" ? "👑 Владелец" : "Со-родитель"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Children */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Дети</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddChild(!showAddChild)}
              >
                {showAddChild ? "Отмена" : "+ Добавить ребёнка"}
              </Button>
            </div>

            {showAddChild && (
              <Card className="mb-4">
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Имя ребёнка</Label>
                    <Input
                      placeholder="Анна Иванова"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Дата рождения</Label>
                    <Input
                      type="date"
                      value={childDob}
                      onChange={(e) => setChildDob(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  {addChild.isError && (
                    <p className="text-sm text-red-500">Ошибка добавления</p>
                  )}
                  <Button
                    onClick={() => addChild.mutate()}
                    disabled={!childName || !childDob || addChild.isPending}
                    className="w-full"
                  >
                    {addChild.isPending ? "Добавление..." : "Добавить"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {childrenLoading && <p className="text-gray-400">Загрузка детей...</p>}

            {children?.length === 0 && (
              <p className="text-gray-400 text-sm">
                Детей ещё нет. Добавьте первого ребёнка.
              </p>
            )}

            <div className="space-y-3">
              {children?.map((child) => (
                <Card key={child.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{child.fullName}</p>
                        <p className="text-sm text-gray-400">
                          {calcAge(child.dateOfBirth)} лет · {ageGroupLabel(child.ageGroup)}
                        </p>
                      </div>
                      <Badge
                        variant={child.status === "ACTIVE" ? "default" : "secondary"}
                      >
                        {child.status}
                      </Badge>
                    </div>
                    {family && (
                      <ChildAccessPanel
                        childId={child.id}
                        familyId={family.id}
                        childName={child.fullName}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
