import { create } from "zustand";

type FormState = {
  bildnummer: string;
  fotografen: string;
  datum: string;
  suchtext: string;
  hoehe?: string;
  breite?: string;
};

type BulkState = {
  isRunning: boolean;
  total: number;
  processed: number;
  errors: string[];
};

type AddItemsState = {
  form: FormState;
  setFormField: (k: keyof FormState, v: string) => void;
  resetForm: () => void;
  status: string | null;
  setStatus: (s: string | null) => void;
  logs: string[];
  appendLog: (s: string) => void;
  clearLogs: () => void;
  bulk: BulkState;
  setBulkProgress: (processed: number, total?: number) => void;
  setBulkRunning: (running: boolean) => void;
  addBulkError: (e: string) => void;
};

export const useAddItemsStore = create<AddItemsState>((set) => ({
  form: {
    bildnummer: "",
    fotografen: "",
    datum: "",
    suchtext: "",
    hoehe: "",
    breite: "",
  },
  setFormField: (k, v) => set((state) => ({ form: { ...state.form, [k]: v } })),
  resetForm: () =>
    set(() => ({
      form: { bildnummer: "", fotografen: "", datum: "", suchtext: "" },
    })),
  status: null,
  setStatus: (s) => set(() => ({ status: s })),
  logs: [],
  appendLog: (s) => set((state) => ({ logs: [...state.logs, s] })),
  clearLogs: () => set(() => ({ logs: [] })),
  bulk: { isRunning: false, total: 0, processed: 0, errors: [] },
  setBulkProgress: (processed, total = 0) =>
    set((state) => ({ bulk: { ...state.bulk, processed, total } })),
  setBulkRunning: (running) =>
    set((state) => ({ bulk: { ...state.bulk, isRunning: running } })),
  addBulkError: (e) =>
    set((state) => ({
      bulk: { ...state.bulk, errors: [...state.bulk.errors, e] },
    })),
}));

export default useAddItemsStore;
