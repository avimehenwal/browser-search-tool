import { Dexie, type EntityTable } from "dexie";

export type Result = {
  id?: number;
  suchtext: string;
  bildnummer: string;
  fotografen: string;
  datum: string; // stored as ISO yyyy-MM-dd after preprocessing
  datumISO?: string; // normalised ISO date (same as datum after v3 migration)
  restrictions?: string[]; // extracted restriction codes e.g. ["GER","SUI"]
  creditNormalized?: string; // lowercase fotografen for filtering
  createdAt?: Date;
  hoehe?: string;
  breite?: string;
};

export type AnalyticsRecord = {
  id?: number;
  query: string;
  timestamp: number;
  durationMs: number;
  resultsCount: number;
};

export interface PhotoRecord {
  id?: number;
  bildnummer: string;
  data: Result;
  addedAt: number;
}

const DB_NAME = "SearchToolDatabase";
const db = new Dexie(DB_NAME) as Dexie & {
  photoMetadata: EntityTable<Result, "id">;
  analytics: EntityTable<AnalyticsRecord, "id">;
};

// Schema
db.version(1).stores({
  photoMetadata: "++id, createdAt, datum, bildnummer, fotografen",
});

// new analytics table in version 2
db.version(2).stores({
  photoMetadata: "++id, createdAt, datum, bildnummer, fotografen",
  analytics: "++id, timestamp, query",
});

// version 3: add datumISO index for chronological sorting
db.version(3).stores({
  photoMetadata: "++id, createdAt, datum, datumISO, bildnummer, fotografen",
  analytics: "++id, timestamp, query",
});

export async function clearPhotoMetadata() {
  try {
    return await db.photoMetadata.clear();
  } catch (e) {
    console.warn("clearPhotoMetadata failed", e);
    throw e;
  }
}

export async function deleteDatabase() {
  try {
    await db.close();
    await Dexie.delete(DB_NAME);
  } catch (e) {
    console.warn("deleteDatabase failed", e);
    throw e;
  }
}

export { db };
