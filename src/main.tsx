import { SessionGate, Settings } from "./features/Account";
import { Reports, Notifications, NotificationLink } from "./features/Insights";
import { canDelete, authSlice } from "./app/auth";
import { Navigate } from "react-router-dom";
import { useVisibleDatabase, useAccount } from "./app/store";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { useTheme, type ThemePreference } from "./app/theme";
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
  { path: "/reports", label: "Reports", icon: LayoutDashboard },
  { path: "/notifications", label: "Notifications", icon: Activity },
  { path: "/settings", label: "Profile & settings", icon: Users },
];
function App() {
  const account = useAccount()!;
  const { preference, setPreference } = useTheme();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [drawerLayout, setDrawerLayout] = useState(
    () => window.innerWidth < 1024,
  );
  const db = useVisibleDatabase();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const resize = () => {
      setDrawerLayout(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shellRef.current?.setAttribute("inert", "");
    const controls = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled)",
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      shellRef.current?.removeAttribute("inert");
      document.removeEventListener("keydown", keydown);
      menuRef.current?.focus();
    };
  }, [mobile]);
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
    <div className={`app ${collapsed && !drawerLayout ? "collapsed" : ""}`}>
      <button
        className={`sidebar-overlay ${mobile ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobile(false)}
      />
      <aside
        ref={sidebarRef}
        id="primary-navigation"
        aria-label="Workspace navigation"
        role={drawerLayout && mobile ? "dialog" : undefined}
        aria-modal={drawerLayout && mobile ? true : undefined}
        inert={drawerLayout && !mobile}
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        <button
          className="icon-button drawer-close"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
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
        <nav aria-label="Main navigation">
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
          <button
            hidden={account.role !== "Admin"}
            className="sidebar-action"
            onClick={() => setConfirm(true)}
          >
            <RotateCcw size={17} />
            <span>Reset demo data</span>
          </button>
          <Link className="user-profile" to="/settings">
            <span className="avatar user">
              {account.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span>
              {account.name}
              <small>{account.role}</small>
            </span>
            <ChevronDown size={15} />
          </Link>
        </div>
      </aside>
      <div className="main-shell" ref={shellRef}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button desktop-toggle"
              aria-label="Toggle sidebar"
              aria-expanded={!collapsed}
              aria-controls="primary-navigation"
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
              ref={menuRef}
              aria-expanded={mobile}
              aria-controls="primary-navigation"
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
            <select
              className="theme-select"
              aria-label="Color theme"
              value={preference}
              onChange={(e) => setPreference(e.target.value as ThemePreference)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <NotificationLink />
            <button
              className="secondary"
              onClick={() => dispatch(authSlice.actions.logout())}
            >
              Logout
            </button>
            <span className="topbar-divider" />
            <button
              className="avatar user"
              aria-label="Workspace information"
              onClick={() => setAbout(true)}
            >
              {account.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </button>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/access-denied"
              element={
                <div className="empty">
                  <h1>Access denied</h1>
                  <p>You do not have permission to view this page or record.</p>
                  <Link to="/">Return to overview</Link>
                </div>
              }
            />
            <Route
              path="/admin/*"
              element={
                account.role === "Admin" ? (
                  <Navigate to="/" replace />
                ) : (
                  <Navigate to="/access-denied" replace />
                )
              }
            />
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
            Records are stored locally in this browser. Authentication is
            simulated locally. There is no server synchronization or outbound
            email. Email activities are manually logged records.
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
        <SessionGate>
          <App />
        </SessionGate>
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>,
);
