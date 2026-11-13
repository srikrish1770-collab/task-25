import { useVisibleDatabase, useAccount } from "../app/store";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import {
  domains,
  emptyRecord,
  owners,
  statuses,
  type Domain,
  type RecordItem,
} from "../data/model";
import { useAppSelector } from "../app/store";
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
const schema = z.object({
  name: z.string().trim().min(1, "A name or title is required"),
  email: z
    .string()
    .trim()
    .refine((s) => !s || z.email().safeParse(s).success, "Enter a valid email"),
  phone: z
    .string()
    .trim()
    .refine(
      (s) =>
        !s ||
        (/^[+\d\s().-]{7,25}$/.test(s) && s.replace(/\D/g, "").length >= 7),
      "Enter a valid phone number",
    ),
  value: z.number().min(0, "Value cannot be negative"),
  date: z
    .string()
    .refine(
      (s) => s !== "" && !Number.isNaN(Date.parse(s)),
      "Enter a valid date",
    ),
});
export function RecordForm({
  domain,
  record,
  onClose,
  onSave,
}: {
  domain: Domain;
  record?: RecordItem;
  onClose: () => void;
  onSave: (r: RecordItem) => void;
}) {
  const account = useAccount();
  const permittedOwners =
    account?.role === "Admin"
      ? owners
      : account?.role === "Manager"
        ? [account.owner, ...account.team]
        : [account?.owner || owners[0]];
  const [draft, setDraft] = useState(() => {
    const initial = record ? { ...record } : emptyRecord(domain);
    if (!record) initial.owner = account?.owner || owners[0];
    if (domain === "activities") {
      const time = new Date(record?.date ?? Date.now());
      initial.date = new Date(time.getTime() - time.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false);
  const db = useVisibleDatabase();
  const set = (key: keyof RecordItem, value: string | number) =>
    setDraft((s) => ({ ...s, [key]: value }));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    const result = schema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    busy.current = true;
    onSave({
      ...draft,
      ...result.data,
      date:
        domain === "activities"
          ? new Date(result.data.date).toISOString()
          : result.data.date,
      company: draft.company.trim(),
      notes: draft.notes.trim(),
    });
  }
  const field = (label: string, key: keyof RecordItem, type = "text") => (
    <label>
      {label}
      <input
        aria-label={label}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
        type={type}
        value={String(draft[key] ?? "")}
        onChange={(e) =>
          set(key, type === "number" ? Number(e.target.value) : e.target.value)
        }
        aria-invalid={!!errors[key]}
        step={type === "number" ? "0.01" : undefined}
      />
      {errors[key] && (
        <small id={`error-${key}`} className="error">
          {errors[key]}
        </small>
      )}
    </label>
  );
  return (
    <Dialog
      title={`${record ? "Edit" : "Create"} ${domain === "activities" ? "activity" : domain.slice(0, -1)}`}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          {field(
            domain === "tasks" || domain === "activities"
              ? "Title *"
              : "Name *",
            "name",
          )}
          {!["tasks", "activities"].includes(domain) &&
            field("Company", "company")}
          {["leads", "customers"].includes(domain) && (
            <>
              {field("Email", "email", "email")}
              {field("Phone", "phone", "tel")}
            </>
          )}
          <label>
            {domain === "activities" ? "Activity type" : "Status"}
            <select
              value={draft.status}
              disabled={domain === "leads" && record?.status === "Converted"}
              onChange={(e) => set("status", e.target.value)}
            >
              {statuses[domain].map((s) => (
                <option
                  key={s}
                  disabled={
                    domain === "leads" &&
                    s === "Converted" &&
                    record?.status !== "Converted"
                  }
                >
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner / assignee
            <select
              value={draft.owner}
              onChange={(e) => set("owner", e.target.value)}
            >
              {permittedOwners.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          {["leads", "deals"].includes(domain) &&
            field("Estimated value ($)", "value", "number")}
          {domain === "leads" && (
            <label>
              Source
              <select
                value={draft.source}
                onChange={(e) => set("source", e.target.value)}
              >
                {["Website", "Referral", "LinkedIn", "Event", "Other"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
          )}
          {["tasks", "deals", "leads"].includes(domain) && (
            <label>
              Priority
              <select
                value={draft.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {["Low", "Medium", "High", "Urgent"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          {field(
            domain === "activities"
              ? "Date and time"
              : domain === "leads" || domain === "customers"
                ? "Record date"
                : "Due / close date",
            "date",
            domain === "activities" ? "datetime-local" : "date",
          )}
          {["tasks", "activities", "deals"].includes(domain) && (
            <label>
              Linked {domain === "deals" ? "customer" : "record"}
              <select
                value={
                  domain === "deals"
                    ? draft.customerId || draft.leadId || ""
                    : draft.linkedId
                }
                onChange={(e) => {
                  const id = e.target.value;
                  if (domain === "deals")
                    setDraft((d) => ({
                      ...d,
                      customerId: db.customers.some((c) => c.id === id)
                        ? id
                        : undefined,
                      leadId: db.leads.some((l) => l.id === id)
                        ? id
                        : undefined,
                    }));
                  else set("linkedId", id);
                }}
              >
                <option value="">No linked record</option>
                {(domain === "deals"
                  ? (["customers", "leads"] as Domain[])
                  : domains.filter((d) =>
                      ["leads", "customers", "deals"].includes(d),
                    )
                ).map((d) => (
                  <optgroup key={d} label={d}>
                    {db[d].map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name} - {r.company}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          {domain === "customers" && field("Address", "address")}
          {domain === "activities" && field("Outcome", "outcome")}
          <label className="full">
            {domain === "tasks" || domain === "activities"
              ? "Description"
              : "Notes"}
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            {record ? "Save changes" : "Create record"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
