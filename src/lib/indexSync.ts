/* eslint-disable @typescript-eslint/no-explicit-any */
import useMetricsStore from "@/store/metricsStore";
import Dexie, { EntityTable } from "dexie";
import { db, Result } from "./db";
import flexIndex, { addDocumentToIndex } from "./flexIndex";

function extractPublicationRestrictions(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bPUBLICATIONx((?:[A-Z]{2,3}x)+)ONLY\b/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const joined = m[1];
    const items = joined.split("x").filter(Boolean);
    res.push(...items);
  }
  return Array.from(new Set(res));
}

function extractUnitedArchives(text?: string) {
  const res: string[] = [];
  if (!text) return res;
  const regex = /\bUnitedArchives(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    res.push(m[1]);
  }
  return Array.from(new Set(res));
}

function extractPhotographers(data: any) {
  const res: string[] = [];
  if (!data) return res;
  const p = data.fotografen || data.photographer || data.photographers;
  if (!p) return res;
  return String(p)
    .split(/[,;|\/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toIndexDoc(id: number | string, record: any) {
  const data = record.data || record;
  const suchtext = `${data.suchtext ?? ""} ${record.bildnummer ?? ""} ${
    data.fotografen ?? ""
  }`.trim();
  const publicationRestrictions = extractPublicationRestrictions(suchtext);
  const unitedArchives = extractUnitedArchives(suchtext);
  const photographers = extractPhotographers(data);
  const tags = [
    ...publicationRestrictions.map((r) => `pub:${r}`),
    ...unitedArchives.map((n) => `ua:${n}`),
    ...photographers.map((p) => `photographer:${p}`),
  ];
  return {
    id: Number(id),
    suchtext,
    bildnummer: record.bildnummer,
    fotografen: data.fotografen || "",
    datum: data.datum || record.datum || "",
    publicationRestrictions,
    unitedArchives,
    tags,
  };
}

let registered = false;

export function registerDexieIndexSync() {
  if (registered) return;
  registered = true;

  try {
    // When a new record is created in IndexedDB, add it to the flex index.
    // Use a synchronous hook handler and trigger async work without awaiting
    // to avoid returning a Promise that Dexie would try to clone into the
    // stored object (causing DataCloneError).

    if (typeof window !== "undefined") {
      const dbInternal = db as unknown as Dexie & {
        photoMetadata: EntityTable<Result, "id">;
        _searchHooksInstalled?: boolean;
      };

      if (!dbInternal._searchHooksInstalled) {
        dbInternal._searchHooksInstalled = true;

        dbInternal.photoMetadata.hook(
          "creating",
          (primKey: number | undefined, obj: Result) => {
            try {
              const id = Number(primKey);
              const doc = toIndexDoc(id, obj);
              void addDocumentToIndex(doc);
              // Refresh metrics store counts asynchronously
              try {
                const s = useMetricsStore.getState();
                void s.refreshPhotoCount?.();
                void s.refreshFlexCount?.();
              } catch {}
            } catch (e) {
              console.warn("indexSync.created hook failed", e);
            }
          },
        );

        // On update, remove old index entry and add updated one.
        dbInternal.photoMetadata.hook(
          "updating",
          (modifications: any, primKey: number | undefined, obj: Result) => {
            try {
              const id = Number(primKey);
              const newObj = { ...(obj || {}), ...(modifications || {}) };
              // Attempt to remove previous entry if index supports it.
              try {
                const idx = (flexIndex as any).getIndex?.();
                if (idx && typeof idx.remove === "function") {
                  void idx.remove(id);
                }
              } catch {}
              const doc = toIndexDoc(id, newObj);
              void addDocumentToIndex(doc);
              // Refresh metrics after update
              try {
                const s = useMetricsStore.getState();
                void s.refreshPhotoCount?.();
                void s.refreshFlexCount?.();
              } catch {}
            } catch (e) {
              console.warn("indexSync.updating hook failed", e);
            }
          },
        );

        // On delete, ensure index entry is removed.
        dbInternal.photoMetadata.hook(
          "deleting",
          (primKey: number | undefined) => {
            try {
              const idx = (flexIndex as any).getIndex?.();
              const id = Number(primKey);
              if (idx && typeof idx.remove === "function") void idx.remove(id);
              // Refresh metrics after delete
              try {
                const s = useMetricsStore.getState();
                void s.refreshPhotoCount?.();
                void s.refreshFlexCount?.();
              } catch {}
            } catch (e) {
              console.warn("indexSync.deleting hook failed", e);
            }
          },
        );
      }
    }
  } catch (e) {
    console.warn("registerDexieIndexSync failed", e);
  }
}

const indexSync = { registerDexieIndexSync };
export default indexSync;
