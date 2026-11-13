import { useVisibleDatabase, useAccount } from "../app/store";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowUpRight,
  Users,
  Contact,
  Wallet,
  TrendingUp,
  Target,
  ChevronRight,
  CalendarDays,
  Download,
} from "lucide-react";
import { analytics, useAppSelector } from "../app/store";
import { stages, today } from "../data/model";
import { Badge, date, money } from "./Records";
export function Dashboard() {
  const db = useVisibleDatabase();
  const account = useAccount()!;
  const [days, setDays] = useState(90);
  const metrics = analytics(db, days);
  const colors = [
    "var(--series-1)",
    "var(--series-2)",
    "var(--series-3)",
    "var(--series-4)",
  ];
  const pipeline = stages.map((name) => ({
    name,
    value: metrics.deals
      .filter((d) => d.status === name)
      .reduce((s, d) => s + d.value, 0),
    count: metrics.deals.filter((d) => d.status === name).length,
  }));
  const sources = [...new Set(metrics.leadRecords.map((r) => r.source))].map(
    (name) => ({
      name,
      value: metrics.leadRecords.filter((r) => r.source === name).length,
    }),
  );
  const trend = Array.from({ length: 6 }, (_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - ((5 - i) * days) / 6);
    const start = new Date(end);
    start.setDate(start.getDate() - days / 6);
    const records = metrics.deals.filter(
      (d) =>
        Date.parse(d.createdAt) > start.getTime() &&
        Date.parse(d.createdAt) <= end.getTime(),
    );
    return {
      name: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Revenue: records
        .filter((d) => d.status === "Closed Won")
        .reduce((s, d) => s + d.value, 0),
      Pipeline: records
        .filter((d) => !d.status.startsWith("Closed"))
        .reduce((s, d) => s + d.value, 0),
    };
  });
  const sales = [...new Set(metrics.deals.map((r) => r.owner))].map((name) => ({
    name: name.split(" ")[0],
    value: metrics.deals
      .filter((d) => d.owner === name && d.status === "Closed Won")
      .reduce((s, d) => s + d.value, 0),
  }));
  const tasks = db.tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  function exportReport() {
    const blob = new Blob(
      [
        [
          "Metric,Value",
          `Total leads,${metrics.leads}`,
          `Active customers,${metrics.customers}`,
          `Open pipeline,${metrics.pipeline}`,
          `Won revenue,${metrics.won}`,
          `Conversion rate,${metrics.conversion.toFixed(1)}%`,
        ].join("\n"),
      ],
      { type: "text/csv" },
    );
    const url = URL.createObjectURL(blob);
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
          <div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div>
          <h1>
            Overview{" "}
            <span className="greeting-dot" aria-hidden="true">
              &#10022;
            </span>
          </h1>
          <p>
            Welcome back, {account.name.split(" ")[0]}. Let's make meaningful
            connections.
          </p>
        </div>
        <div className="heading-actions">
          <label className="date-select">
            <CalendarDays size={16} />
            <select
              aria-label="Dashboard date range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 12 months</option>
            </select>
          </label>
          <button className="secondary" onClick={exportReport}>
            <Download size={16} /> Export report
          </button>
        </div>
      </div>
      <section className="card settings-card" aria-label="Personal performance">
        <h2>{account.role === "Manager" ? "Team" : "Personal"} performance</h2>
        <p>
          Open deals:{" "}
          {db.deals.filter((d) => !d.status.startsWith("Closed")).length} �
          Pending tasks:{" "}
          {db.tasks.filter((t) => t.status !== "Completed").length} � Overdue
          tasks:{" "}
          {
            db.tasks.filter((t) => t.status !== "Completed" && t.date < today())
              .length
          }
        </p>
        <p>
          Won revenue: {money(metrics.won)} / {money(account.target)} target
        </p>
        <progress
          value={metrics.won}
          max={account.target}
          aria-label="Sales target progress"
        />
        <h3>Upcoming meetings & follow-ups</h3>
        {db.activities
          .filter(
            (a) =>
              ["Meeting", "Follow-up"].includes(a.status) &&
              Date.parse(a.date) >= Date.now(),
          )
          .slice(0, 5)
          .map((a) => (
            <p key={a.id}>
              <Link to={"/activities/" + a.id}>
                {a.name} � {date(a.date)}
              </Link>
            </p>
          ))}
        {!db.activities.some(
          (a) =>
            ["Meeting", "Follow-up"].includes(a.status) &&
            Date.parse(a.date) >= Date.now(),
        ) && <p>No upcoming meetings or follow-ups.</p>}
      </section>
      <div className="welcome-strip">
        <div>
          <span className="live-dot" /> A little clarity. A lot of possibility.
          <p>
            Your relationships are your greatest asset. Here's how they're
            growing.
          </p>
        </div>
        <Link to="/deals">
          Explore your pipeline <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="metrics">
        {[
          {
            label: "Total leads",
            value: metrics.leads,
            icon: Users,
            note: "Connections in your workspace",
            to: "/leads",
          },
          {
            label: "Active customers",
            value: metrics.customers,
            icon: Contact,
            note: "Relationships that matter",
            to: "/customers",
          },
          {
            label: "Pipeline value",
            value: money(metrics.pipeline),
            icon: Wallet,
            note: "Across open opportunities",
            to: "/deals",
          },
          {
            label: "Won revenue",
            value: money(metrics.won),
            icon: TrendingUp,
            note: "From closed won deals",
            to: "/deals",
          },
          {
            label: "Lead conversion",
            value: `${metrics.conversion.toFixed(1)}%`,
            icon: Target,
            note: "Converted / total leads",
            to: "/leads",
          },
        ].map(({ label, value, icon: Icon, note, to }) => (
          <Link to={to} className="metric card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </Link>
        ))}
      </div>
      <div className="chart-grid">
        <section className="card revenue-card">
          <div className="card-heading">
            <div>
              <h3>Revenue overview</h3>
              <p>A closer look at your sales momentum</p>
            </div>
            <span className="legend">
              <i /> Revenue <i className="pale" /> Pipeline
            </span>
          </div>
          {metrics.deals.length ? (
            <div className="chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
                initialDimension={{ width: 300, height: 220 }}
              >
                <AreaChart
                  data={trend}
                  margin={{ left: 0, right: 10, top: 15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="fillRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--series-1)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--series-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                    tickFormatter={(n) => `$${n / 1000}k`}
                    width={52}
                  />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="Pipeline"
                    stroke="var(--series-2)"
                    strokeWidth={2}
                    fill="transparent"
                    strokeDasharray="5 5"
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="Revenue"
                    stroke="var(--series-1)"
                    strokeWidth={3}
                    fill="url(#fillRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No deals in this date range.</div>
          )}
          <div className="chart-foot">
            <span>Calculated from records created in the selected period</span>
            <Link to="/deals">
              View deals <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>Lead sources</h3>
              <p>Where your next connection begins</p>
            </div>
            <Link to="/leads" aria-label="View leads">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {sources.length ? (
            <>
              <div className="donut">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={1}
                  initialDimension={{ width: 300, height: 220 }}
                >
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
                      data={sources}
                      dataKey="value"
                      innerRadius={65}
                      outerRadius={86}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {sources.map((s, i) => (
                        <Cell key={s.name} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  <strong>{metrics.leads}</strong>
                  <small>Total leads</small>
                </div>
              </div>
              <div className="source-legend">
                {sources.map((s, i) => (
                  <div key={s.name}>
                    <i style={{ background: colors[i % colors.length] }} />
                    <span>{s.name}</span>
                    <b>{s.value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">No leads in this period.</div>
          )}
        </section>
      </div>
      <div className="middle-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>Pipeline by stage</h3>
              <p>From first hello to a closed deal</p>
            </div>
            <Link to="/deals">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="pipeline-bars">
            {pipeline.map((s, i) => (
              <div key={s.name}>
                <span>
                  {s.name}
                  <small>{s.count} deals</small>
                </span>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${metrics.deals.length ? (s.count / metrics.deals.length) * 100 : 0}%`,
                      background: i > 3 ? "var(--series-3)" : "var(--series-1)",
                    }}
                  />
                </div>
                <b>{money(s.value)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-heading">
            <div>
              <h3>Sales performance</h3>
              <p>Won revenue by relationship owner</p>
            </div>
          </div>
          {sales.length ? (
            <div className="small-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
                initialDimension={{ width: 300, height: 220 }}
              >
                <BarChart data={sales}>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--chart-grid)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--chart-text)" }}
                  />
                  <YAxis
                    tickFormatter={(n) => `${n / 1000}k`}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                  />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="value"
                    name="Won revenue"
                    fill="var(--series-1)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No sales in this period.</div>
          )}
        </section>
      </div>
      <div className="bottom-grid">
        <section className="card">
          <div className="card-heading">
            <h3>Recent activity</h3>
            <Link to="/activities">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {db.activities.length ? (
            db.activities
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 4)
              .map((r, i) => (
                <Link
                  className="activity-line"
                  key={r.id}
                  to={`/activities/${r.id}`}
                >
                  <span className={`activity-icon tone-${i}`}>
                    <Contact size={17} />
                  </span>
                  <div>
                    <b>{r.name}</b>
                    <p>
                      {r.company} <span>- {r.owner}</span>
                    </p>
                  </div>
                  <small>{date(r.date)}</small>
                </Link>
              ))
          ) : (
            <div className="empty compact">No activity yet.</div>
          )}
        </section>
        <section className="card">
          <div className="card-heading">
            <h3>Upcoming tasks</h3>
            <Link to="/tasks">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {tasks.length ? (
            tasks.map((r) => (
              <Link to={`/tasks/${r.id}`} className="task-line" key={r.id}>
                <span className="task-checkbox" />
                <div>
                  <b>{r.name}</b>
                  <p className={r.date < today() ? "overdue" : ""}>
                    {date(r.date)} - {r.owner}
                  </p>
                </div>
                <Badge text={r.priority} />
              </Link>
            ))
          ) : (
            <div className="empty compact">All caught up.</div>
          )}
        </section>
      </div>
      <section className="card attention">
        <div className="card-heading">
          <div>
            <h3>Deals requiring attention</h3>
            <p>Open opportunities with an overdue expected close date</p>
          </div>
          <Link to="/deals">
            View pipeline <ArrowUpRight size={15} />
          </Link>
        </div>
        {db.deals
          .filter((r) => !r.status.startsWith("Closed") && r.date < today())
          .map((r) => (
            <Link key={r.id} className="attention-row" to={`/deals/${r.id}`}>
              <b>{r.name}</b>
              <span>{r.company}</span>
              <Badge text={r.status} />
              <strong>{money(r.value)}</strong>
              <span className="overdue">{date(r.date)}</span>
            </Link>
          ))}
        {!db.deals.some(
          (r) => !r.status.startsWith("Closed") && r.date < today(),
        ) && <p className="muted">All open deals are on schedule.</p>}
      </section>
    </>
  );
}
