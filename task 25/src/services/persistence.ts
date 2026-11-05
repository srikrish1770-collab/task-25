import { z } from "zod";
import { domains, seed, type Database } from "../data/model";
const KEY = "meridian-crm-v1";
const record = z.object({
  id: z.string().min(1),
  name: z.string(),
  company: z.string(),
  email: z.string(),
  phone: z.string(),
  source: z.string(),
  owner: z.string(),
  status: z.string(),
  value: z.number().finite().nonnegative(),
  notes: z.string(),
  createdAt: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
  priority: z.string(),
  linkedId: z.string(),
  address: z.string(),
  outcome: z.string(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
});
const schema = z
  .object({
    leads: z.array(record),
    customers: z.array(record),
    deals: z.array(record),
    tasks: z.array(record),
    activities: z.array(record),
  })
  .refine((db) => {
    const ids = domains.flatMap((d) => db[d].map((r) => r.id));
    return new Set(ids).size === ids.length;
  });
export function readData(): Database {
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const result = schema.safeParse(JSON.parse(text));
      if (result.success) return result.data;
    }
  } catch {
    /* Invalid or unavailable storage falls back to a usable demo. */
  }
  const fresh = seed();
  persist(fresh);
  return fresh;
}
export function persist(data: Database) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
