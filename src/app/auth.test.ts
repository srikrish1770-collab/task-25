import { describe, it, expect } from "vitest";
import {
  authSlice,
  canAccess,
  canDelete,
  scopeDatabase,
  validPassword,
  type Account,
} from "./auth";
import { seed, emptyRecord } from "../data/model";
import { store, save, remove } from "./store";
const accounts = authSlice.getInitialState().accounts;
describe("User permissions and authentication", () => {
  it("defaults to signed out and restores reducer sessions only for known accounts", () => {
    let s = authSlice.reducer(undefined, { type: "test" });
    expect(s.session).toBeNull();
    s = authSlice.reducer(s, authSlice.actions.login("unknown"));
    expect(s.session).toBeNull();
    s = authSlice.reducer(s, authSlice.actions.login("sales"));
    expect(s.session).toBe("sales");
    expect(authSlice.reducer(s, authSlice.actions.logout()).session).toBeNull();
  });
  it("scopes owned records and manager teams consistently", () => {
    const db = seed();
    for (const a of accounts) {
      const scoped = scopeDatabase(db, a);
      for (const records of Object.values(scoped))
        for (const r of records) expect(canAccess(a, r)).toBe(true);
      if (a.role === "Employee" || a.role === "Sales Representative")
        expect(scoped.leads.every((r) => r.owner === a.owner)).toBe(true);
    }
    const manager = accounts.find((a) => a.role === "Manager")!;
    expect(canAccess(manager, { ...db.leads[0], owner: "Sarah Chen" })).toBe(
      true,
    );
    expect(canAccess(manager, db.leads[0])).toBe(false);
    expect(canDelete(manager)).toBe(true);
    expect(canDelete(accounts.find((a) => a.role === "Employee"))).toBe(false);
  });
  it("blocks mutations outside ownership and deletion without permission", () => {
    store.dispatch(authSlice.actions.login("sales"));
    const other = store
      .getState()
      .crm.leads.find((r) => r.owner === "Alex Morgan")!;
    store.dispatch(
      save({ domain: "leads", record: { ...other, name: "Forbidden" } }),
    );
    expect(
      store.getState().crm.leads.find((r) => r.id === other.id)?.name,
    ).toBe(other.name);
    const r = {
      ...emptyRecord("tasks"),
      owner: "Sarah Chen",
      name: "Own task",
    };
    store.dispatch(save({ domain: "tasks", record: r }));
    expect(store.getState().crm.tasks.some((t) => t.id === r.id)).toBe(true);
    store.dispatch(remove({ domain: "tasks", id: r.id }));
    expect(store.getState().crm.tasks.some((t) => t.id === r.id)).toBe(true);
    store.dispatch(authSlice.actions.logout());
  });
  it("deduplicates read states and isolates accounts", () => {
    let s = authSlice.reducer(undefined, authSlice.actions.login("sales"));
    s = authSlice.reducer(s, authSlice.actions.read(["a", "a"]));
    expect(s.read.sales).toEqual(["a"]);
    s = authSlice.reducer(s, authSlice.actions.login("employee"));
    expect(s.read.employee).toBeUndefined();
  });
  it("enforces password complexity", () => {
    expect(validPassword("short")).toBe(false);
    expect(validPassword("Meridian2026!")).toBe(true);
    expect(validPassword("onlylowercasewords")).toBe(false);
  });
});
