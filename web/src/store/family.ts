import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FamilyResponse } from "@/lib/api";

interface FamilyState {
  family: FamilyResponse | null;
  setFamily: (family: FamilyResponse) => void;
  clearFamily: () => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      family: null,
      setFamily: (family) => set({ family }),
      clearFamily: () => set({ family: null }),
    }),
    {
      name: "kidscard-family",
    }
  )
);
