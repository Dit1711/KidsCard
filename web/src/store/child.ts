import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChildState {
  childId: string | null;
  familyId: string | null;
  displayName: string | null;
  isChildAuthed: boolean;
  hasHydrated: boolean;
  setSession: (token: string, childId: string, familyId: string, displayName: string | null) => void;
  setHasHydrated: (v: boolean) => void;
  logout: () => void;
}

export const useChildStore = create<ChildState>()(
  persist(
    (set) => ({
      childId: null,
      familyId: null,
      displayName: null,
      isChildAuthed: false,
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setSession: (token, childId, familyId, displayName) => {
        localStorage.setItem("childToken", token);
        set({ childId, familyId, displayName, isChildAuthed: true });
      },

      logout: () => {
        localStorage.removeItem("childToken");
        set({ childId: null, familyId: null, displayName: null, isChildAuthed: false });
      },
    }),
    {
      name: "kidscard-child",
      partialize: (s) => ({
        childId: s.childId,
        familyId: s.familyId,
        displayName: s.displayName,
        isChildAuthed: s.isChildAuthed,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
