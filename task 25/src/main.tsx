import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Handshake,
  Contact,
  CheckSquare,
  Activity,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Command,
  ArrowUpRight,
  Menu,
  X,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  store,
  useAppSelector,
  useAppDispatch,
  reset,
  hasPersistenceError,
} from "./app/store";
import { domains, type Domain } from "./data/model";
import { Records } from "./features/Records";
import { Profile } from "./features/Profile";
const Dashboard = lazy(() =>
  import("./features/Dashboard").then((module) => ({
    default: module.Dashboard,
  })),
);
import { Dialog } from "./components/Forms";
import "./styles.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty">
        <h1>Something went wrong</h1>
        <p>Your saved data is still in this browser.</p>
        <button className="primary" onClick={() => location.reload()}>
          Reload application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const nav = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/deals", label: "Sales pipeline", icon: Handshake },
  { path: "/customers", label: "Customers", icon: Contact },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/activities", label: "Activities", icon: Activity },
];
function App() {
  const db = useAppSelector((s) => s.crm);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [about, setAbout] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const notify = (s: string) => {
    setToast(
      hasPersistenceError()
        ? "Saved for this session. Browser storage is unavailable."
        : s,
    );
    window.setTimeout(() => setToast(""), 4500);
  };
  const results = query.trim()
    ? domains
        .flatMap((domain) =>
          db[domain]
            .filter((r) =>
              `${r.name} ${r.company}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((record) => ({ domain, record })),
        )
        .filter((r) => r.domain !== "activities")
        .slice(0, 12)
    : [];
  const title =
    nav.find((n) => n.path === `/${location.pathname.split("/")[1]}`)?.label ??
    "Overview";
  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <button
        className={`sidebar-overlay ${mobile ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            m<span>&#183;</span>
          </span>
          <span>
            meridian<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="workspace-switch">
          <button onClick={() => setWorkspace(!workspace)}>
            <span className="workspace-icon">M</span>
            <span>
              Meridian workspace<small>Enterprise plan</small>
            </span>
            <ChevronDown size={14} />
          </button>
          {workspace && (
            <div className="workspace-info">
              Demo workspace - 4 owners
              <br />
              All data stays in this browser.
            </div>
          )}
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {nav.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setMobile(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Leads" && <small>{db.leads.length}</small>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>Built for better relationships.</span>
            <p>Every conversation is an opportunity to grow.</p>
            <button onClick={() => setAbout(true)}>
              About this workspace <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="sidebar-action" onClick={() => setConfirm(true)}>
            <RotateCcw size={17} />
            <span>Reset demo data</span>
          </button>
          <button className="user-profile" onClick={() => setAbout(true)}>
            <span className="avatar user">AM</span>
            <span>
              Alex Morgan<small>Workspace admin</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button desktop-toggle"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <b>{title}</b>
            </span>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="Global search"
                placeholder="Search anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                }}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
              {query && (
                <div className="search-results">
                  {results.length ? (
                    results.map(({ domain, record }) => (
                      <Link
                        key={record.id}
                        to={`/${domain}/${record.id}`}
                        onClick={() => setQuery("")}
                      >
                        <span>
                          <b>{record.name}</b>
                          <small>{record.company}</small>
                        </span>
                        <BadgeLabel domain={domain} />
                      </Link>
                    ))
                  ) : (
                    <p>No matching records</p>
                  )}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <button
              className="avatar user"
              aria-label="Workspace information"
              onClick={() => setAbout(true)}
            >
              AM
            </button>
          </div>
        </header>
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense
                  fallback={
                    <div
                      role="status"
                      aria-label="Loading dashboard"
                      className="dashboard-skeleton"
                    >
                      <div />
                      <div />
                      <div />
                    </div>
                  }
                >
                  <Dashboard />
                </Suspense>
              }
            />
            {domains.map((domain) => (
              <Route
                key={domain}
                path={`/${domain}`}
                element={
                  <Records key={domain} domain={domain} notify={notify} />
                }
              />
            ))}
            {domains.map((domain) => (
              <Route
                key={domain}
                path={`/${domain}/:id`}
                element={
                  <Profile key={domain} domain={domain} notify={notify} />
                }
              />
            ))}
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <p>This page may have moved or no longer exists.</p>
                  <Link className="primary" to="/">
                    Return to overview
                  </Link>
                </div>
              }
            />
          </Routes>
          <div className="app-footer">
            <span>&copy; {new Date().getFullYear()} Meridian CRM</span>
            <span>
              <span className="live-dot" /> Browser-local demo - No server
              connection
            </span>
          </div>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <ShieldCheck size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {confirm && (
        <Dialog title="Reset demo workspace?" onClose={() => setConfirm(false)}>
          <p>
            This replaces all your edits and records with the original demo
            dataset. This action cannot be undone.
          </p>
          <footer>
            <button className="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button
              className="danger"
              onClick={() => {
                dispatch(reset());
                setConfirm(false);
                notify("Demo data reset");
              }}
            >
              Reset all data
            </button>
          </footer>
        </Dialog>
      )}
      {about && (
        <Dialog title="Your Meridian workspace" onClose={() => setAbout(false)}>
          <p>
            A connected frontend demo for managing relationships, opportunities,
            and the work that brings them together.
          </p>
          <p>
            Records are stored locally in this browser. There is no
            authentication, server synchronization, or outbound email. Email
            activities are manually logged records.
          </p>
          <p>Workspace owner: Alex Morgan - Four demo relationship owners.</p>
          <footer>
            <button className="primary" onClick={() => setAbout(false)}>
              Got it
            </button>
          </footer>
        </Dialog>
      )}
    </div>
  );
}
function BadgeLabel({ domain }: { domain: Domain }) {
  return <span className="badge">{domain}</span>;
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>,
);
