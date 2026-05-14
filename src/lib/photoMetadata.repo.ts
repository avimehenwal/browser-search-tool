import { db, type Result } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */

function inputDateToDayStart(input?: string | null) {
  if (!input) return null;
  const [y, m, d] = input.split("-").map((s) => Number(s));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function inputDateToDayEnd(input?: string | null) {
  if (!input) return null;
  const [y, m, d] = input.split("-").map((s) => Number(s));
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export async function countByDateRange(
  dateFrom?: string | null,
  dateTo?: string | null,
): Promise<number> {
  if (dateFrom || dateTo) {
    let start: Date;
    let end: Date;
    if (dateFrom && dateTo) {
      start = inputDateToDayStart(dateFrom)!;
      end = inputDateToDayEnd(dateTo)!;
      if (start > end) {
        const t = start;
        start = end;
        end = t;
      }
    } else if (dateFrom) {
      start = inputDateToDayStart(dateFrom)!;
      end = inputDateToDayEnd(dateFrom)!;
    } else {
      start = inputDateToDayStart(dateTo)!;
      end = inputDateToDayEnd(dateTo)!;
    }

    return await db.photoMetadata
      .where("createdAt")
      .between(start, end, true, true)
      .count();
  }

  return await db.photoMetadata.count();
}

type GetPaginatedOpts = {
  page?: number;
  pageSize?: number;
  sort?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export async function getPaginated(
  opts: GetPaginatedOpts = {},
): Promise<Result[]> {
  const { page = 1, pageSize = 10, sort, dateFrom, dateTo } = opts;
  const offset = Math.max(0, (page - 1) * pageSize);

  let coll: any;
  if (dateFrom || dateTo) {
    let start: Date;
    let end: Date;
    if (dateFrom && dateTo) {
      start = inputDateToDayStart(dateFrom)!;
      end = inputDateToDayEnd(dateTo)!;
      if (start > end) {
        const t = start;
        start = end;
        end = t;
      }
    } else if (dateFrom) {
      start = inputDateToDayStart(dateFrom)!;
      end = inputDateToDayEnd(dateFrom)!;
    } else {
      start = inputDateToDayStart(dateTo)!;
      end = inputDateToDayEnd(dateTo)!;
    }

    coll = db.photoMetadata.where("createdAt").between(start, end, true, true);
  } else {
    coll = db.photoMetadata.orderBy("createdAt");
  }

  const needsReverse = sort === "added_desc" || sort === "datum_desc";
  if (needsReverse && typeof coll.reverse === "function") {
    coll = coll.reverse();
  }

  if (typeof coll.offset === "function") {
    return await coll.offset(offset).limit(pageSize).toArray();
  }

  const arr = await coll.toArray();
  return arr.slice(offset, offset + pageSize);
}

export async function getByIds(ids: number[]) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return await db.photoMetadata.bulkGet(ids);
}

const photoMetadataRepo = { countByDateRange, getPaginated, getByIds };
export default photoMetadataRepo;
