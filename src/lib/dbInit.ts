import { preprocessItem, type RawMediaItem } from "./api/preprocessor";
import { db, type Result } from "./db";
import { fetchSampleData } from "./utils";

export async function ensureDbOpen() {
  try {
    // Dexie instance has isOpen()
    if (
      !db.isOpen ||
      (typeof db.isOpen === "function" &&
        !(db as unknown as { isOpen: () => boolean }).isOpen())
    ) {
      await db.open();
    }
  } catch (err) {
    console.warn("ensureDbOpen failed", err);
    throw err;
  }
}

export async function ensureSampleData(expectedCount = 105) {
  try {
    await ensureDbOpen();
    const count = await db.photoMetadata.count();
    console.log("Photo metadata count:", count);

    // If we already have enough records, don't modify the DB.
    // Only import sample data when there are fewer items than expected.
    if (count >= expectedCount) {
      console.log("IndexedDB has sufficient records; skipping sample import");
      return;
    }

    const data: Result[] = await fetchSampleData();
    if (!data || data.length === 0) {
      console.warn("No sample data available to import");
      return;
    }
    const transformed = data.map((item: Result) => {
      // Use the preprocessor to normalise datum, extract restrictions, etc.
      const processed = preprocessItem(item as RawMediaItem);
      return {
        ...item,
        datum: processed.datumISO || item.datum,
        datumISO: processed.datumISO,
        restrictions: processed.restrictions,
        creditNormalized: processed.creditNormalized,
        createdAt: new Date(),
      } as Result;
    });

    // Use bulkPut to upsert; this will add missing records without
    // clearing existing data. Import only when there are fewer than
    // `expectedCount` items so navigation/rehydration won't wipe the DB.
    await db.photoMetadata.bulkPut(transformed);
    const newCount = await db.photoMetadata.count();
    console.log("Sample data added to IndexedDB, count:", newCount);
  } catch (err) {
    console.warn("ensureSampleData failed", err);
  }
}

const dbInit = {
  ensureDbOpen,
  ensureSampleData,
};

export default dbInit;
