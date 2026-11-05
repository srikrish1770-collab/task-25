import { today, type Domain, type RecordItem } from "../data/model";
export interface RecordQuery {
  search: string;
  status: string;
  owner: string;
  extra: string;
  deadline: string;
  sort: string;
  ascending: boolean;
}
export function queryRecords(
  records: RecordItem[],
  domain: Domain,
  query: RecordQuery,
): RecordItem[] {
  const { search, status, owner, extra, deadline, sort, ascending } = query;
  const key =
    sort === "name"
      ? "name"
      : sort === "value"
        ? "value"
        : sort === "date"
          ? "date"
          : "createdAt";
  const current = today();
  return records
    .filter((record) => {
      const matchesSearch =
        `${record.name} ${record.company} ${record.email} ${record.notes}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      const matchesExtra =
        !extra ||
        (domain === "leads"
          ? record.source === extra
          : domain === "tasks"
            ? record.priority === extra
            : true);
      const matchesDeadline =
        !deadline ||
        (deadline === "overdue"
          ? record.date < current && record.status !== "Completed"
          : deadline === "today"
            ? record.date === current
            : deadline === "completed"
              ? record.status === "Completed"
              : record.date > current && record.status !== "Completed");
      return (
        matchesSearch &&
        (!status || record.status === status) &&
        (!owner || record.owner === owner) &&
        matchesExtra &&
        matchesDeadline
      );
    })
    .sort((a, b) => {
      const av = a[key],
        bv = b[key];
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))) * (ascending ? 1 : -1)
      );
    });
}
