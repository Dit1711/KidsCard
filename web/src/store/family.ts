import { create } from "zustand";
import type { FamilyResponse } from "@/lib/api";

interface FamilyState {
  family: FamilyResponse | null;
  setFamily: (family: FamilyResponse) => void;
  clearFamily: () => void;
}

// NOT persisted on purpose: the dashboard layout loads the current user's
// family on every mount. Persisting it would leak a previous account's family
// into a freshly logged-in user before the fetch resolves.
export const useFamilyStore = create<FamilyState>()((set) => ({
  family: null,
  setFamily: (family) => set({ family }),
  clearFamily: () => set({ family: null }),
}));
