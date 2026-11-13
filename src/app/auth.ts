import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Database, RecordItem } from "../data/model";
export type Role = "Admin" | "Manager" | "Employee" | "Sales Representative";
export interface Account {
  id: string;
  name: string;
  owner: string;
  email: string;
  role: Role;
  team: string[];
  digest: string;
  reminders: boolean;
  target: number;
}
export const demoPassword = "Meridian2026!";
export const accountSeeds = [
  {
    id: "admin",
    name: "Alex Morgan",
    owner: "Alex Morgan",
    email: "admin@meridian.demo",
    role: "Admin",
    team: [],
  },
  {
    id: "manager",
    name: "Olivia Brooks",
    owner: "Olivia Brooks",
    email: "manager@meridian.demo",
    role: "Manager",
    team: ["Sarah Chen", "James Wilson"],
  },
  {
    id: "employee",
    name: "James Wilson",
    owner: "James Wilson",
    email: "employee@meridian.demo",
    role: "Employee",
    team: [],
  },
  {
    id: "sales",
    name: "Sarah Chen",
    owner: "Sarah Chen",
    email: "sales@meridian.demo",
    role: "Sales Representative",
    team: [],
  },
] as const;
export async function digestPassword(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const validPassword = (s: string) =>
  s.length >= 12 &&
  /[A-Z]/.test(s) &&
  /[a-z]/.test(s) &&
  /[0-9]/.test(s) &&
  /[^A-Za-z0-9]/.test(s);
function restore(): {
  accounts: Account[];
  session: string | null;
  read: Record<string, string[]>;
} {
  try {
    const x = JSON.parse(
      localStorage.getItem("meridian-accounts-v1") || "null",
    );
    if (
      x &&
      Array.isArray(x.accounts) &&
      x.accounts.length === 4 &&
      x.accounts.every(
        (a: Account) =>
          accountSeeds.some(
            (s) => s.id === a.id && s.role === a.role && s.owner === a.owner,
          ) &&
          typeof a.name === "string" &&
          typeof a.email === "string" &&
          typeof a.digest === "string" &&
          Array.isArray(a.team) &&
          a.team.every((t) => typeof t === "string") &&
          typeof a.reminders === "boolean" &&
          Number.isFinite(a.target) && a.target > 0,
      ) &&
      (x.session === null ||
        x.accounts.some((a: Account) => a.id === x.session)) &&
      x.read &&
      Object.values(x.read).every(
        (v) => Array.isArray(v) && v.every((i) => typeof i === "string"),
      )
    )
      return x;
  } catch {
    /* recover invalid browser data */
  }
  return {
    accounts: accountSeeds.map((a) => ({
      ...a,
      team: [...a.team],
      digest: "",
      reminders: true,
      target: 100000,
    })),
    session: null,
    read: {},
  };
}
export const authSlice = createSlice({
  name: "auth",
  initialState: restore(),
  reducers: {
    login(s, a: PayloadAction<string>) {
      if (s.accounts.some((u) => u.id === a.payload)) s.session = a.payload;
    },
    logout(s) {
      s.session = null;
    },
    update(
      s,
      a: PayloadAction<{
        id: string;
        name?: string;
        email?: string;
        digest?: string;
        reminders?: boolean;
        target?: number;
      }>,
    ) {
      const u = s.accounts.find((u) => u.id === a.payload.id);
      if (u) Object.assign(u, a.payload);
    },
    read(s, a: PayloadAction<string[]>) {
      if (s.session)
        s.read[s.session] = [
          ...new Set([...(s.read[s.session] || []), ...a.payload]),
        ];
    },
  },
});
export const canAccess = (u: Account | undefined, r: RecordItem) =>
  !!u &&
  (u.role === "Admin" ||
    r.owner === u.owner ||
    (u.role === "Manager" && u.team.includes(r.owner)));
export function scopeDatabase(db: Database, u: Account | undefined): Database {
  return Object.fromEntries(
    Object.entries(db).map(([d, rs]) => [d, rs.filter((r) => canAccess(u, r))]),
  ) as Database;
}
export const canDelete = (u: Account | undefined) =>
  u?.role === "Admin" || u?.role === "Manager";
