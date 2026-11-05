import { describe, it, expect } from "vitest";
import { crmSlice, convert, save, remove, analytics } from "./store";
import { seed } from "../data/model";
import { persist, readData } from "../services/persistence";
describe("Connected CRM business rules", () => {
  it("converts qualified leads once, preserving a customer and optional opportunity", () => {
    const initial = seed();
    const lead = initial.leads[10];
    const next = crmSlice.reducer(
      initial,
      convert({ id: lead.id, withDeal: true }),
    );
    expect(next.customers).toHaveLength(initial.customers.length + 1);
    expect(next.deals).toHaveLength(initial.deals.length + 1);
    const converted = next.leads.find((r) => r.id === lead.id)!;
    expect(converted.status).toBe("Converted");
    expect(
      next.customers.find((r) => r.id === converted.customerId)?.leadId,
    ).toBe(lead.id);
    expect(next.deals.at(-1)?.customerId).toBe(converted.customerId);
    expect(
      crmSlice.reducer(next, convert({ id: lead.id, withDeal: true })),
    ).toEqual(next);
  });
  it("rejects conversion of unqualified leads", () => {
    const initial = seed();
    expect(
      crmSlice.reducer(
        initial,
        convert({ id: initial.leads[0].id, withDeal: true }),
      ),
    ).toEqual(initial);
  });
  it("recalculates won and pipeline value when a stage changes", () => {
    const initial = seed();
    const before = analytics(initial, 365);
    const deal = initial.deals[0];
    const next = crmSlice.reducer(
      initial,
      save({ domain: "deals", record: { ...deal, status: "Closed Won" } }),
    );
    expect(analytics(next, 365).won).toBe(before.won + deal.value);
    expect(analytics(next, 365).pipeline).toBe(before.pipeline - deal.value);
  });
  it("filters date-cohort metrics and handles no records without NaN", () => {
    const db = seed();
    db.leads.forEach((r) => (r.createdAt = "2000-01-01"));
    db.deals.forEach((r) => (r.createdAt = "2000-01-01"));
    const result = analytics(db, 7);
    expect(result.leads).toBe(0);
    expect(result.won).toBe(0);
    expect(result.pipeline).toBe(0);
    expect(result.conversion).toBe(0);
  });
  it("retains linked records while removing a deleted customer reference", () => {
    const db = seed();
    const id = db.customers[0].id;
    const next = crmSlice.reducer(db, remove({ domain: "customers", id }));
    expect(next.deals).toHaveLength(db.deals.length);
    expect(next.deals[0].customerId).toBeUndefined();
    expect(next.tasks[0].linkedId).toBe("");
    expect(next.activities[0].linkedId).toBe("");
  });
  it("completes and reopens tasks without losing their linked record", () => {
    const db = seed();
    const task = db.tasks[1];
    const done = crmSlice.reducer(
      db,
      save({ domain: "tasks", record: { ...task, status: "Completed" } }),
    );
    expect(done.tasks[1].status).toBe("Completed");
    const reopened = crmSlice.reducer(
      done,
      save({ domain: "tasks", record: { ...done.tasks[1], status: "To Do" } }),
    );
    expect(reopened.tasks[1].linkedId).toBe(task.linkedId);
    expect(reopened.tasks[1].status).toBe("To Do");
  });
  it("persists deletions and edits, and recovers malformed data", () => {
    const db = seed();
    db.leads = [];
    db.customers[0].name = "Updated contact";
    expect(persist(db)).toBe(true);
    expect(readData().leads).toEqual([]);
    expect(readData().customers[0].name).toBe("Updated contact");
    localStorage.setItem("meridian-crm-v1", '{"leads":null}');
    expect(readData().leads.length).toBeGreaterThan(0);
    localStorage.setItem("meridian-crm-v1", "invalid JSON");
    expect(readData().deals.length).toBeGreaterThan(0);
  });
  it("preserves empty databases without reseeding", () => {
    persist({ leads: [], customers: [], deals: [], tasks: [], activities: [] });
    expect(readData()).toEqual({
      leads: [],
      customers: [],
      deals: [],
      tasks: [],
      activities: [],
    });
  });
});

describe("Customer relationship consistency", () => {
  it("reuses an existing customer with the same contact and company", () => {
    const db = seed();
    const lead = db.leads[2];
    const next = crmSlice.reducer(
      db,
      convert({ id: lead.id, withDeal: false }),
    );
    expect(next.customers).toHaveLength(db.customers.length);
    expect(next.leads[2].customerId).toBe(db.customers[2].id);
    expect(next.deals).toHaveLength(db.deals.length);
  });
  it("propagates edited company names and clears converted lead references on customer deletion", () => {
    const db = seed();
    const customer = db.customers[2];
    const converted = crmSlice.reducer(
      db,
      convert({ id: db.leads[2].id, withDeal: false }),
    );
    const edited = crmSlice.reducer(
      converted,
      save({
        domain: "customers",
        record: { ...customer, company: "Updated Company" },
      }),
    );
    expect(edited.deals[2].company).toBe("Updated Company");
    expect(edited.activities[2].company).toBe("Updated Company");
    const deleted = crmSlice.reducer(
      edited,
      remove({ domain: "customers", id: customer.id }),
    );
    expect(deleted.leads[2].customerId).toBeUndefined();
    expect(deleted.leads[2].status).toBe("Converted");
  });
});
