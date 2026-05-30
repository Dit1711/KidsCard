"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familyService } from "@/lib/api";
import { useFamilyStore } from "@/store/family";
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

function calcAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  return now.getFullYear() - birth.getFullYear();
}

export default function FamilyPage() {
  const qc = useQueryClient();
  const { family, setFamily } = useFamilyStore();

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
                  <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                      <p className="font-medium">{child.fullName}</p>
                      <p className="text-sm text-gray-400">
                        {calcAge(child.dateOfBirth)} лет · {child.ageGroup.replace(/_/g, " ")}
                      </p>
                    </div>
                    <Badge
                      variant={child.status === "ACTIVE" ? "default" : "secondary"}
                    >
                      {child.status}
                    </Badge>
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
