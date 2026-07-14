import { AppError, ErrorCode, Messages } from "@/lib/errors";
import { parsePageRequest } from "@/lib/pagination";

export const SEARCH_CONDITIONS = [
  "CONTAINS",
  "STARTWITH",
  "EQUAL",
  "NOTEQUAL",
  "GREATEROREQUAL",
  "LESSEROREQUAL",
] as const;

export type SearchCondition = (typeof SEARCH_CONDITIONS)[number];

type SearchConfig = {
  fields: Record<string, readonly SearchCondition[]>;
  searchTermFields: readonly string[];
};

export type ParsedCollectionSearch = {
  pageNumber: number;
  pageSize: number;
  search: Array<{ name: string; condition: SearchCondition; value: string | boolean }>;
  searchTerm: { names: string[]; value: string } | null;
  filters: string;
};

const MAX_SEARCH_FILTERS = 16;
const MAX_SEARCH_VALUE_LENGTH = 200;
const MAX_SEARCH_TERM_LENGTH = 100;

function invalidSearch(): never {
  throw new AppError(Messages.invalidRequest, 400, ErrorCode.VALIDATION);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function parseCollectionSearch(body: unknown, config: SearchConfig): ParsedCollectionSearch {
  if (!isRecord(body)) invalidSearch();
  if (!hasOnlyKeys(body, ["pageNumber", "pageSize", "search", "searchTerm"])) invalidSearch();

  let pageNumber: number;
  let pageSize: number;
  try {
    ({ pageNumber, pageSize } = parsePageRequest(body));
  } catch {
    invalidSearch();
  }

  if (body.search !== undefined && !Array.isArray(body.search)) invalidSearch();
  if (Array.isArray(body.search) && body.search.length > MAX_SEARCH_FILTERS) invalidSearch();
  const search = (body.search ?? []).map((raw): ParsedCollectionSearch["search"][number] => {
    if (!isRecord(raw) || typeof raw.name !== "string" || typeof raw.condition !== "string") invalidSearch();
    if (!hasOnlyKeys(raw, ["name", "condition", "value"])) invalidSearch();
    if (typeof raw.value !== "string" && typeof raw.value !== "boolean") invalidSearch();
    if (typeof raw.value === "string" && raw.value.length > MAX_SEARCH_VALUE_LENGTH) invalidSearch();
    const conditions = config.fields[raw.name];
    if (!conditions?.includes(raw.condition as SearchCondition)) invalidSearch();
    const value = typeof raw.value === "string" ? raw.value.trim() : raw.value;
    return { name: raw.name, condition: raw.condition as SearchCondition, value };
  });

  let searchTerm: ParsedCollectionSearch["searchTerm"] = null;
  if (body.searchTerm !== undefined && body.searchTerm !== null) {
    if (!isRecord(body.searchTerm) || typeof body.searchTerm.name !== "string" || typeof body.searchTerm.value !== "string") {
      invalidSearch();
    }
    if (!hasOnlyKeys(body.searchTerm, ["name", "value"])) invalidSearch();
    if (body.searchTerm.name.length > MAX_SEARCH_VALUE_LENGTH || body.searchTerm.value.length > MAX_SEARCH_TERM_LENGTH) {
      invalidSearch();
    }
    const names = [...new Set(body.searchTerm.name.split(",").map((name) => name.trim()).filter(Boolean))].sort();
    if (names.length === 0 || names.some((name) => !config.searchTermFields.includes(name))) invalidSearch();
    const value = body.searchTerm.value.trim();
    searchTerm = value ? { names, value } : null;
  }

  const canonicalSearch = [...search].sort((left, right) => (
    left.name.localeCompare(right.name)
    || left.condition.localeCompare(right.condition)
    || String(left.value).localeCompare(String(right.value))
  ));
  const filters = JSON.stringify({ search: canonicalSearch, searchTerm });

  return { pageNumber, pageSize, search, searchTerm, filters };
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
