import { canDelete } from "../app/auth";
import { useVisibleDatabase, useAccount } from "../app/store";
import { queryRecords } from "../utils/records";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Building2,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import {
  domains,
  stages,
  today,
  type Domain,
  type RecordItem,
} from "../data/model";
import {
  convert,
  remove,
  save,
  useAppDispatch,
  useAppSelector,
} from "../app/store";
import { Dialog, RecordForm } from "../components/Forms";
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const date = (s: string) =>
  new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function Badge({ text }: { text: string }) {
  return (
    <span className={`badge ${text.toLowerCase().replaceAll(" ", "-")}`}>
      {text}
    </span>
  );
}
export function Records({
  domain,
  notify,
}: {
  domain: Domain;
  notify: (s: string) => void;
}) {
  const db = useVisibleDatabase();
  const account = useAccount();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [extra, setExtra] = useState("");
  const [priority, setPriority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(
    domain === "activities" ? "date" : "createdAt",
  );
  const [ascending, setAscending] = useState(false);
  const [editing, setEditing] = useState<RecordItem | null | undefined>();
  const [deleting, setDeleting] = useState<RecordItem>();
  const [board, setBoard] = useState(true);
  const [conversion, setConversion] = useState<RecordItem>();
  const [withDeal, setWithDeal] = useState(true);
  const filtered = useMemo(
    () =>
      queryRecords(
        db[domain].filter((r) => !priority || r.priority === priority),
        domain,
        {
          search,
          status,
          owner,
          extra,
          deadline,
          sort,
          ascending,
        },
      ),
    [
      db,
      domain,
      search,
      status,
      owner,
      extra,
      priority,
      deadline,
      sort,
      ascending,
    ],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7));
  const current = Math.min(page, pages);
  const filter = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const linked = (r: RecordItem) =>
    db.customers.find((c) => c.id === r.customerId)?.company || r.company;
  const actions = (r: RecordItem) => (
    <div className="row-actions">
      <button onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
        Edit
      </button>
      {domain === "leads" && r.status === "Qualified" && (
        <button onClick={() => setConversion(r)}>Convert</button>
      )}
      {domain === "tasks" && (
        <button
          onClick={() => {
            dispatch(
              save({
                domain,
                record: {
                  ...r,
                  status: r.status === "Completed" ? "To Do" : "Completed",
                },
              }),
            );
            notify("Task updated");
          }}
        >
          {r.status === "Completed" ? "Reopen" : "Complete"}
        </button>
      )}
      <button
        className="danger-text"
        onClick={() => setDeleting(r)}
        hidden={!canDelete(account)}
        aria-label={`Delete ${r.name}`}
      >
        Delete
      </button>
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            WORKSPACE /{" "}
            {domain === "deals" ? "SALES PIPELINE" : domain.toUpperCase()}
          </div>
          <h1>
            {domain === "deals"
              ? "Sales pipeline"
              : domain === "activities"
                ? "Activity timeline"
                : domain[0].toUpperCase() + domain.slice(1)}
          </h1>
          <p>
            {
              {
                leads: "Turn new connections into lasting relationships.",
                customers: "A complete view of the people behind your growth.",
                deals: "Keep every opportunity moving forward.",
                tasks: "Focus on what moves your business forward.",
                activities: "Every conversation, connected.",
              }[domain]
            }
          </p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={17} />{" "}
          {domain === "activities"
            ? "Log activity"
            : `Add ${domain.slice(0, -1)}`}
        </button>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label={`Search ${domain}`}
            placeholder={`Search ${domain}...`}
            value={search}
            onChange={(e) => filter(() => setSearch(e.target.value))}
          />
        </div>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => filter(() => setStatus(e.target.value))}
        >
          <option value="">
            All {domain === "activities" ? "types" : "statuses"}
          </option>
          {[...new Set(db[domain].map((r) => r.status))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter owner"
          value={owner}
          onChange={(e) => filter(() => setOwner(e.target.value))}
        >
          <option value="">All owners</option>
          {[...new Set(db[domain].map((r) => r.owner))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {["tasks", "leads"].includes(domain) && (
          <select
            aria-label="Additional filter"
            value={extra}
            onChange={(e) => filter(() => setExtra(e.target.value))}
          >
            <option value="">
              All {domain === "leads" ? "sources" : "priorities"}
            </option>
            {[
              ...new Set(
                db[domain].map((r) =>
                  domain === "leads" ? r.source : r.priority,
                ),
              ),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        {["tasks", "deals"].includes(domain) && (
          <select
            aria-label="Deadline"
            value={deadline}
            onChange={(e) => filter(() => setDeadline(e.target.value))}
          >
            <option value="">All dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            {domain === "tasks" && <option value="completed">Completed</option>}
          </select>
        )}
        {domain === "leads" && (
          <select
            aria-label="Filter priority"
            value={priority}
            onChange={(e) => filter(() => setPriority(e.target.value))}
          >
            <option value="">All priorities</option>
            {["Low", "Medium", "High", "Urgent"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        )}
        <button
          className="secondary"
          onClick={() => {
            setSearch("");
            setStatus("");
            setOwner("");
            setExtra("");
            setPriority("");
            setDeadline("");
            setPage(1);
          }}
        >
          Reset filters
        </button>
        <select
          aria-label="Sort records"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="createdAt">Created date</option>
          <option value="name">Name</option>
          <option value="value">Value</option>
          <option value="date">Due date</option>
        </select>
        <button
          className="icon-button"
          aria-label="Reverse sort order"
          onClick={() => setAscending(!ascending)}
        >
          <ArrowUpDown size={16} />
        </button>
        {domain === "deals" && (
          <button className="secondary" onClick={() => setBoard(!board)}>
            {board ? <List size={16} /> : <LayoutGrid size={16} />}{" "}
            {board ? "List" : "Board"}
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="empty">
          <Search size={30} />
          <h3>No {domain} found</h3>
          <p>Try adjusting your filters or create your first record.</p>
        </div>
      ) : domain === "deals" && board ? (
        <div
          className="kanban"
          role="region"
          aria-label="Sales pipeline by stage"
          tabIndex={0}
        >
          {stages.map((stage) => {
            const records = filtered.filter((r) => r.status === stage);
            return (
              <section
                className="stage"
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  const r = db.deals.find((d) => d.id === id);
                  if (r) {
                    dispatch(
                      save({
                        domain: "deals",
                        record: { ...r, status: stage },
                      }),
                    );
                    notify("Deal stage updated");
                  }
                }}
              >
                <div className="stage-head">
                  <b>{stage}</b>
                  <span>{records.length}</span>
                </div>
                <p>{money(records.reduce((s, r) => s + r.value, 0))}</p>
                {records.map((r) => (
                  <article
                    className="deal-card"
                    key={r.id}
                    draggable={window.matchMedia("(pointer: fine)").matches}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <Badge text={r.priority} />
                    <Link to={`/deals/${r.id}`}>
                      <h3>{r.name}</h3>
                    </Link>
                    <p>{linked(r)}</p>
                    <strong>{money(r.value)}</strong>
                    <div className="deal-meta">
                      <span className="avatar small">
                        {r.owner
                          .split(" ")
                          .map((s) => s[0])
                          .join("")}
                      </span>
                      <span>
                        {r.owner}
                        <br />
                        {date(r.date)}
                      </span>
                    </div>
                    <select
                      aria-label={`Stage for ${r.name}`}
                      value={r.status}
                      onChange={(e) => {
                        dispatch(
                          save({
                            domain,
                            record: { ...r, status: e.target.value },
                          }),
                        );
                        notify("Deal stage updated");
                      }}
                    >
                      {stages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    {actions(r)}
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-card">
          <div className="table-title">
            <h3>
              All {domain} <span className="count">{filtered.length}</span>
            </h3>
            <span className="muted">Your relationships, in one place</span>
          </div>
          <div
            className="table-scroll"
            role="region"
            aria-label={`${domain} records, scroll horizontally for more columns`}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Name / title</th>
                  <th>{domain === "activities" ? "Type" : "Status"}</th>
                  <th>Owner</th>
                  <th>
                    {["leads", "deals"].includes(domain)
                      ? "Value"
                      : domain === "customers"
                        ? "Contact"
                        : domain === "tasks"
                          ? "Priority"
                          : "Outcome"}
                  </th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((current - 1) * 7, current * 7).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className="person" to={`/${domain}/${r.id}`}>
                        <span className="avatar">
                          {r.name.slice(0, 1)}
                          {r.name.split(" ")[1]?.[0]}
                        </span>
                        <span>
                          <b>{r.name}</b>
                          <small>
                            {domain === "customers" ? r.company : linked(r)}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Badge text={r.status} />
                    </td>
                    <td>{r.owner}</td>
                    <td>
                      {["leads", "deals"].includes(domain) ? (
                        money(r.value)
                      ) : domain === "customers" ? (
                        r.email
                      ) : domain === "tasks" ? (
                        <Badge text={r.priority} />
                      ) : (
                        r.outcome
                      )}
                    </td>
                    <td
                      className={
                        domain === "tasks" &&
                        r.date < today() &&
                        r.status !== "Completed"
                          ? "overdue"
                          : ""
                      }
                    >
                      {date(r.date)}
                      {domain === "tasks" &&
                        r.date < today() &&
                        r.status !== "Completed" && <small>Overdue</small>}
                    </td>
                    <td>{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Showing {(current - 1) * 7 + 1}-
              {Math.min(current * 7, filtered.length)} of {filtered.length}
            </span>
            <div>
              <button
                className="icon-button"
                disabled={current === 1}
                aria-label="Previous page"
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                {current} / {pages}
              </span>
              <button
                className="icon-button"
                disabled={current === pages}
                aria-label="Next page"
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
      {editing !== undefined && (
        <RecordForm
          domain={domain}
          record={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSave={(record) => {
            dispatch(save({ domain, record }));
            setEditing(undefined);
            notify("Record saved");
          }}
        />
      )}
      {deleting && (
        <Dialog
          title="Delete this record?"
          onClose={() => setDeleting(undefined)}
        >
          <p>
            This permanently removes {deleting.name}.{" "}
            {domain === "customers"
              ? "Linked deals, tasks, and activities will be retained with their customer link removed."
              : ""}
          </p>
          <footer>
            <button
              className="secondary"
              onClick={() => setDeleting(undefined)}
            >
              Cancel
            </button>
            <button
              className="danger"
              onClick={() => {
                dispatch(remove({ domain, id: deleting.id }));
                setDeleting(undefined);
                notify("Record deleted");
              }}
            >
              Delete record
            </button>
          </footer>
        </Dialog>
      )}
      {conversion && (
        <Dialog
          title="Convert qualified lead"
          onClose={() => setConversion(undefined)}
        >
          <p>
            Create a linked customer for {conversion.name}. This lead can only
            be converted once.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={withDeal}
              onChange={(e) => setWithDeal(e.target.checked)}
            />{" "}
            Also create a sales opportunity
          </label>
          <footer>
            <button
              className="secondary"
              onClick={() => setConversion(undefined)}
            >
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => {
                dispatch(convert({ id: conversion.id, withDeal }));
                setConversion(undefined);
                notify("Lead converted to customer");
              }}
            >
              Convert lead
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
