import type { Middleware } from "@reduxjs/toolkit";
import { authSlice, canAccess, canDelete, scopeDatabase } from "./auth";
import { useMemo } from "react";
import {
  configureStore,
  createSlice,
  type PayloadAction,
  createSelector,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import {
  type Database,
  type Domain,
  type RecordItem,
  seed,
  emptyRecord,
} from "../data/model";
import { readData, persist } from "../services/persistence";
export const crmSlice = createSlice({
  name: "crm",
  initialState: readData(),
  reducers: {
    save(state, action: PayloadAction<{ domain: Domain; record: RecordItem }>) {
      const { domain, record } = action.payload;
      const index = state[domain].findIndex((r) => r.id === record.id);
      if (index < 0) state[domain].push(record);
      else state[domain][index] = record;
      if (domain === "customers") {
        for (const records of [state.deals, state.tasks, state.activities]) {
          for (const linked of records) {
            if (
              linked.customerId === record.id ||
              linked.linkedId === record.id
            )
              linked.company = record.company;
          }
        }
      }
    },
    remove(state, action: PayloadAction<{ domain: Domain; id: string }>) {
      const { domain, id } = action.payload;
      state[domain] = state[domain].filter((r) => r.id !== id);
      for (const d of [
        "leads",
        "customers",
        "deals",
        "tasks",
        "activities",
      ] as Domain[])
        state[d].forEach((r) => {
          if (r.customerId === id) r.customerId = undefined;
          if (r.linkedId === id) r.linkedId = "";
          if (r.leadId === id) r.leadId = undefined;
        });
    },
    convert(state, action: PayloadAction<{ id: string; withDeal: boolean }>) {
      const lead = state.leads.find((r) => r.id === action.payload.id);
      if (!lead || lead.status !== "Qualified" || lead.customerId) return;
      const existing = state.customers.find(
        (c) =>
          c.leadId === lead.id ||
          (lead.email.trim() !== "" &&
            c.email.toLowerCase() === lead.email.toLowerCase() &&
            c.company.toLowerCase() === lead.company.toLowerCase()),
      );
      const customer = existing ?? {
        ...lead,
        id: `customer-${lead.id}`,
        status: "Active",
        leadId: lead.id,
        createdAt: new Date().toISOString(),
      };
      if (!existing) state.customers.push(customer);
      lead.customerId = customer.id;
      lead.status = "Converted";
      if (action.payload.withDeal)
        state.deals.push({
          ...emptyRecord("deals"),
          id: `deal-${lead.id}`,
          name: `${lead.company} opportunity`,
          company: lead.company,
          owner: lead.owner,
          value: lead.value,
          customerId: customer.id,
        });
    },
    reset: () => seed(),
  },
});
export const { save, remove, convert, reset } = crmSlice.actions;
const permissionMiddleware: Middleware = (api) => (next) => (action) => {
  const a = action as { type: string };
  if (a.type.startsWith("crm/")) {
    const state = api.getState() as {
      crm: Database;
      auth: ReturnType<typeof authSlice.reducer>;
    };
    const user = state.auth.accounts.find((u) => u.id === state.auth.session);
    if (!user) return;
    if (a.type === "crm/reset" && user.role !== "Admin") return;
    if (save.match(action)) {
      const { domain, record } = action.payload;
      const existing = state.crm[domain].find((r) => r.id === record.id);
      if ((existing && !canAccess(user, existing)) || !canAccess(user, record))
        return;
      const links = [record.customerId, record.leadId, record.linkedId].filter(
        Boolean,
      );
      if (
        links.some(
          (id) =>
            !Object.values(state.crm)
              .flat()
              .some((r) => r.id === id && canAccess(user, r)),
        )
      )
        return;
    }
    if (remove.match(action)) {
      const r = state.crm[action.payload.domain].find(
        (r) => r.id === action.payload.id,
      );
      if (!r || !canAccess(user, r) || !canDelete(user)) return;
    }
    if (convert.match(action)) {
      const r = state.crm.leads.find((r) => r.id === action.payload.id);
      if (!r || !canAccess(user, r)) return;
    }
  }
  return next(action);
};
export const store = configureStore({
  reducer: { crm: crmSlice.reducer, auth: authSlice.reducer },
  middleware: (getDefault) => getDefault().concat(permissionMiddleware),
});
let persistenceFailed = false;
store.subscribe(() => {
  persistenceFailed = !persist(store.getState().crm);
  try {
    localStorage.setItem(
      "meridian-accounts-v1",
      JSON.stringify(store.getState().auth),
    );
  } catch {
    persistenceFailed = true;
  }
});
export const hasPersistenceError = () => persistenceFailed;
export type RootState = ReturnType<typeof store.getState>;
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const analytics = createSelector(
  [(db: Database) => db, (_db: Database, days: number) => days],
  (db, days) => {
    const cutoff = Date.now() - days * 86400000;
    const leads = db.leads.filter((r) => Date.parse(r.createdAt) >= cutoff);
    const deals = db.deals.filter((r) => Date.parse(r.createdAt) >= cutoff);
    return {
      leads: leads.length,
      customers: db.customers.filter(
        (r) => r.status === "Active" && Date.parse(r.createdAt) >= cutoff,
      ).length,
      pipeline: deals
        .filter((r) => !r.status.startsWith("Closed"))
        .reduce((s, r) => s + r.value, 0),
      won: deals
        .filter((r) => r.status === "Closed Won")
        .reduce((s, r) => s + r.value, 0),
      conversion: leads.length
        ? (leads.filter((r) => r.status === "Converted").length /
            leads.length) *
          100
        : 0,
      deals,
      leadRecords: leads,
    };
  },
);

export const useAccount = () =>
  useAppSelector((s) => s.auth.accounts.find((a) => a.id === s.auth.session));
export function useVisibleDatabase() {
  const db = useAppSelector((s) => s.crm);
  const u = useAccount();
  return useMemo(() => scopeDatabase(db, u), [db, u]);
}
