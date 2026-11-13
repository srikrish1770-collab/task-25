const emptyRead: string[] = [];
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useAccount,
  useVisibleDatabase,
  useAppDispatch,
  useAppSelector,
  analytics,
} from "../app/store";
import { authSlice } from "../app/auth";
import { today } from "../data/model";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
export function Reports() {
  const db = useVisibleDatabase();
  const user = useAccount()!;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const filtered = Object.fromEntries(
    Object.entries(db).map(([k, rs]) => [
      k,
      rs.filter(
        (r) =>
          (!from || r.createdAt.slice(0, 10) >= from) &&
          (!to || r.createdAt.slice(0, 10) <= to),
      ),
    ]),
  ) as typeof db;
  const metrics = analytics(filtered, 36500);
  const completed = filtered.tasks.filter(
    (t) => t.status === "Completed",
  ).length;
  const rows = [
    { metric: "Leads", value: metrics.leads },
    { metric: "Conversion %", value: metrics.conversion },
    {
      metric: "Won deals",
      value: filtered.deals.filter((d) => d.status === "Closed Won").length,
    },
    {
      metric: "Lost deals",
      value: filtered.deals.filter((d) => d.status === "Closed Lost").length,
    },
    { metric: "Won revenue", value: metrics.won },
    { metric: "Completed tasks", value: completed },
    {
      metric: "Task completion %",
      value: filtered.tasks.length
        ? (completed / filtered.tasks.length) * 100
        : 0,
    },
  ];
  const breakdown = [...new Set(filtered.activities.map((a) => a.status))].map(
    (name) => ({
      name,
      count: filtered.activities.filter((a) => a.status === name).length,
    }),
  );
  const team = [...new Set(filtered.deals.map((d) => d.owner))].map((name) => ({
    name,
    revenue: filtered.deals
      .filter((d) => d.owner === name && d.status === "Closed Won")
      .reduce((a, d) => a + d.value, 0),
  }));
  function download() {
    const escape = (v: string | number) =>
      '"' + String(v).replaceAll('"', '""') + '"';
    const lines = [
      ["Metric", "Value"],
      ...rows.map((r) => [r.metric, r.value]),
      ...breakdown.map((r) => [r.name, r.count]),
      ...team.map((r) => [r.name, r.revenue]),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.map((r) => r.map(escape).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "meridian-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Reports & analytics</h1>
          <p>
            {user.role === "Manager" ? "Team" : "Personal"} performance ·
            creation-date cohort
          </p>
        </div>
        <button className="primary" onClick={download}>
          Export CSV
        </button>
      </div>
      <section className="card settings-card">
        <div className="account-form">
          <label>
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <p>
          Conversion = converted leads / all leads. Completion = completed tasks
          / all tasks. Revenue uses currently won deals.
        </p>
        <div className="report-metrics">
          {rows.map((r) => (
            <article className="card" key={r.metric}>
              <small>{r.metric}</small>
              <h2>
                {r.value.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </h2>
            </article>
          ))}
        </div>
        <h2>Sales target</h2>
        <p>
          ${metrics.won.toLocaleString()} / ${user.target.toLocaleString()} ·{" "}
          {Math.round((metrics.won / user.target) * 100)}%
        </p>
        <progress
          max={user.target}
          value={metrics.won}
          aria-label="Sales target progress"
        />
        <h2>Activity breakdown</h2>
        {breakdown.length ? (
          <div style={{ height: 280, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#6859dc" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No activities in this range.</p>
        )}
        {(user.role === "Manager" || user.role === "Admin") && (
          <>
            <h2>Team won revenue</h2>
            {team.length ? (
              team.map((t) => (
                <p key={t.name}>
                  {t.name}: ${t.revenue.toLocaleString()}
                </p>
              ))
            ) : (
              <p>No deals in this range.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}
export function useNotifications() {
  const db = useVisibleDatabase();
  const u = useAccount()!;
  const read = useAppSelector((s) => s.auth.read[u.id]) || emptyRead;
  const now = today();
  const items = [
    ...db.leads.map((r) => ({
      id: `assignment-${r.id}-${r.owner}`,
      title: `Lead assigned: ${r.name}`,
      path: `/leads/${r.id}`,
      type: "Assignment",
    })),
    ...(u.reminders
      ? db.tasks
          .filter((r) => r.status !== "Completed" && r.date <= now)
          .map((r) => ({
            id: `task-${r.id}-${r.date}`,
            title: `${r.date < now ? "Overdue" : "Due today"}: ${r.name}`,
            path: `/tasks/${r.id}`,
            type: "Reminder",
          }))
      : []),
    ...(u.reminders
      ? db.activities
          .filter(
            (r) =>
              (r.status === "Meeting" || r.status === "Follow-up") &&
              r.date.slice(0, 10) >= now &&
              Date.parse(r.date) <= Date.now() + 7 * 86400000,
          )
          .map((r) => ({
            id: `activity-${r.id}-${r.date}`,
            title: `Upcoming ${r.status}: ${r.name}`,
            path: `/activities/${r.id}`,
            type: "Meeting",
          }))
      : []),
    ...db.deals
      .filter((r) => r.status.startsWith("Closed"))
      .map((r) => ({
        id: `deal-${r.id}-${r.status}`,
        title: `${r.status}: ${r.name}`,
        path: `/deals/${r.id}`,
        type: "Update",
      })),
  ];
  return items.map((n) => ({ ...n, read: read.includes(n.id) }));
}
export function NotificationLink() {
  const items = useNotifications();
  return (
    <Link
      className="secondary"
      to="/notifications"
      aria-label={`Notifications, ${items.filter((n) => !n.read).length} unread`}
    >
      Alerts ({items.filter((n) => !n.read).length})
    </Link>
  );
}
export function Notifications() {
  const items = useNotifications();
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState("All");
  const shown = items.filter(
    (n) =>
      filter === "All" || (filter === "Unread" && !n.read) || n.type === filter,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Notifications</h1>
          <p>
            {items.filter((n) => !n.read).length} unread · Browser-local
            reminders, refreshed while the app is open.
          </p>
        </div>
        <button
          className="primary"
          onClick={() =>
            dispatch(authSlice.actions.read(items.map((n) => n.id)))
          }
        >
          Mark all as read
        </button>
      </div>
      <label>
        Filter notifications{" "}
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["All", "Unread", "Assignment", "Reminder", "Meeting", "Update"].map(
            (f) => (
              <option key={f}>{f}</option>
            ),
          )}
        </select>
      </label>
      <section className="card settings-card">
        {shown.length ? (
          shown.map((n) => (
            <article className="notification-row" key={n.id}>
              <Link
                to={n.path}
                onClick={() => dispatch(authSlice.actions.read([n.id]))}
              >
                {!n.read && "● "}
                {n.title}
              </Link>
              {!n.read && (
                <button
                  className="secondary"
                  onClick={() => dispatch(authSlice.actions.read([n.id]))}
                >
                  Mark as read
                </button>
              )}
            </article>
          ))
        ) : (
          <p>No notifications match this filter.</p>
        )}
      </section>
    </>
  );
}
