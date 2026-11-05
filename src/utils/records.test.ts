import { describe, it, expect } from "vitest";
import { queryRecords, type RecordQuery } from "./records";
import { seed, today } from "../data/model";
const query: RecordQuery = {
  search: "",
  status: "",
  owner: "",
  extra: "",
  deadline: "",
  sort: "value",
  ascending: true,
};
describe("Record search and ordering", () => {
  it("combines search, status, source and owner without mutating stored order", () => {
    const db = seed();
    const original = db.leads.map((r) => r.id);
    const lead = db.leads[2];
    const rows = queryRecords(db.leads, "leads", {
      ...query,
      search: "  NORTHSTAR  ",
      status: lead.status,
      owner: lead.owner,
      extra: lead.source,
    });
    expect(rows.map((r) => r.id)).toEqual([lead.id]);
    expect(db.leads.map((r) => r.id)).toEqual(original);
    expect(queryRecords(db.leads, "leads", query)[0].value).toBe(9000);
    expect(
      queryRecords(db.leads, "leads", { ...query, ascending: false })[0].value,
    ).toBe(58500);
  });
  it("excludes completed tasks from overdue and upcoming views", () => {
    const tasks = seed().tasks;
    const overdue = queryRecords(tasks, "tasks", {
      ...query,
      deadline: "overdue",
    });
    expect(overdue.length).toBeGreaterThan(0);
    expect(
      overdue.every((r) => r.date < today() && r.status !== "Completed"),
    ).toBe(true);
    expect(
      queryRecords(tasks, "tasks", { ...query, deadline: "completed" }).every(
        (r) => r.status === "Completed",
      ),
    ).toBe(true);
    expect(
      queryRecords(tasks, "tasks", { ...query, deadline: "upcoming" }).every(
        (r) => r.date > today() && r.status !== "Completed",
      ),
    ).toBe(true);
  });
});
