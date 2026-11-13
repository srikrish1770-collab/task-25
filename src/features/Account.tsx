import { useTheme } from "../app/theme";
import { useState, type ReactNode, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  authSlice,
  demoPassword,
  digestPassword,
  validPassword,
} from "../app/auth";
import { useAccount, useAppDispatch, useAppSelector } from "../app/store";
export function SessionGate({ children }: { children: ReactNode }) {
  const user = useAccount();
  const path = useLocation().pathname;
  if (
    ["/login", "/forgot-password", "/verify-otp", "/reset-password"].includes(
      path,
    )
  )
    return <Authentication />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
let recovery: {
  id: string;
  code: string;
  expires: number;
  verified: boolean;
} | null = null;
export function Authentication() {
  useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const accounts = useAppSelector((s) => s.auth.accounts);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const mode = location.pathname;
  const title =
    mode === "/login"
      ? "Welcome back"
      : mode === "/forgot-password"
        ? "Recover your account"
        : mode === "/verify-otp"
          ? "Verify demo code"
          : "Reset password";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      if (mode === "/login") {
        const u = accounts.find(
          (a) =>
            a.email.toLowerCase() ===
            String(data.get("email")).trim().toLowerCase(),
        );
        const digest = await digestPassword(String(data.get("password")));
        if (!u || digest !== (u.digest || (await digestPassword(demoPassword))))
          throw Error("Email or password is incorrect.");
        dispatch(authSlice.actions.login(u.id));
        navigate(u.role === "Admin" ? "/admin" : "/");
      } else if (mode === "/forgot-password") {
        const u = accounts.find(
          (a) =>
            a.email.toLowerCase() ===
            String(data.get("email")).trim().toLowerCase(),
        );
        if (!u) throw Error("Use a documented demo account.");
        recovery = {
          id: u.id,
          code: String(
            (crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000,
          ),
          expires: Date.now() + 300000,
          verified: false,
        };
        setMessage("");
        navigate("/verify-otp");
      } else if (mode === "/verify-otp") {
        if (!recovery || Date.now() > recovery.expires || attempts >= 5)
          throw Error("Recovery expired. Start again.");
        if (String(data.get("code")) !== recovery.code) {
          setAttempts((a) => a + 1);
          throw Error("Code does not match.");
        }
        recovery.verified = true;
        navigate("/reset-password");
      } else {
        if (!recovery?.verified || Date.now() > recovery.expires)
          throw Error("Verify your demo code first.");
        const password = String(data.get("password"));
        if (!validPassword(password))
          throw Error(
            "Use at least 12 characters with uppercase, lowercase, number and symbol.",
          );
        if (password !== data.get("confirm"))
          throw Error("Passwords do not match.");
        dispatch(
          authSlice.actions.update({
            id: recovery.id,
            digest: await digestPassword(password),
          }),
        );
        dispatch(authSlice.actions.logout());
        recovery = null;
        setMessage("Password updated. You can sign in.");
        navigate("/login");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <section className="card auth-card">
        <Link to="/login" className="back-link">
          meridian.
        </Link>
        <h1>{title}</h1>
        <p>Enterprise CRM · Browser-local demo</p>
        <p className="demo-notice">
          Simulated authentication and recovery. No email or SMS is sent.
          Browser permissions do not provide server security.
        </p>
        <form key={mode} onSubmit={submit} className="account-form">
          {(mode === "/login" || mode === "/forgot-password") && (
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
          )}
          {mode === "/verify-otp" && (
            <>
              <p>
                Demo code:{" "}
                <strong>{recovery?.code || "Start recovery first"}</strong> ·
                expires after five minutes.
              </p>
              <label>
                Verification code
                <input
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                />
              </label>
            </>
          )}
          {(mode === "/login" || mode === "/reset-password") && (
            <>
              <label>
                Password
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete={
                    mode === "/login" ? "current-password" : "new-password"
                  }
                />
              </label>
              {mode === "/reset-password" && (
                <label>
                  Confirm password
                  <input
                    name="confirm"
                    type={show ? "text" : "password"}
                    required
                  />
                </label>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                />
                Show password
              </label>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Please wait…" : mode === "/login" ? "Sign in" : "Continue"}
          </button>
        </form>
        <p>
          <Link to="/forgot-password">Forgot password?</Link> ·{" "}
          <Link to="/login">Sign in</Link>
        </p>
        <details>
          <summary>Demo accounts</summary>
          <p>
            admin@meridian.demo
            <br />
            manager@meridian.demo
            <br />
            employee@meridian.demo
            <br />
            sales@meridian.demo
          </p>
          <p>Initial password: {demoPassword}</p>
        </details>
      </section>
    </main>
  );
}
export function Settings() {
  const user = useAccount()!;
  const accounts = useAppSelector((s) => s.auth.accounts);
  const dispatch = useAppDispatch();
  const [feedback, setFeedback] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    const f = new FormData(e.currentTarget);
    try {
      const name = String(f.get("name")).trim();
      if (!name) throw Error("Name is required.");
      const target = Number(f.get("target"));
      if (!Number.isFinite(target) || target <= 0)
        throw Error("Target must be positive.");
      const email = String(f.get("email")).trim();
      if (
        accounts.some(
          (a) =>
            a.id !== user.id && a.email.toLowerCase() === email.toLowerCase(),
        )
      )
        throw Error("This email is already used by another demo account.");
      let digest = user.digest;
      const password = String(f.get("password"));
      if (password) {
        if (
          (await digestPassword(String(f.get("current")))) !==
          (user.digest || (await digestPassword(demoPassword)))
        )
          throw Error("Current password is incorrect.");
        if (!validPassword(password))
          throw Error(
            "Use 12+ characters with uppercase, lowercase, number and symbol.",
          );
        if (password !== f.get("confirm"))
          throw Error("Passwords do not match.");
        digest = await digestPassword(password);
      }
      dispatch(
        authSlice.actions.update({
          id: user.id,
          name,
          email: String(f.get("email")).trim(),
          target,
          reminders: f.get("reminders") === "on",
          digest,
        }),
      );
      setFeedback("Settings saved.");
    } catch (e) {
      setFeedback((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card settings-card">
      <h1>Profile & settings</h1>
      <p>
        {user.role} · Record owner: {user.owner}
      </p>
      <form onSubmit={save} className="account-form">
        <label>
          Full name
          <input name="name" defaultValue={user.name} required />
        </label>
        <label>
          Email
          <input name="email" type="email" defaultValue={user.email} required />
        </label>
        <label>
          Sales target (USD)
          <input
            name="target"
            type="number"
            min="1"
            defaultValue={user.target}
            required
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="reminders"
            defaultChecked={user.reminders}
          />
          Enable task and meeting reminders
        </label>
        <h2>Change password</h2>
        <p>Leave blank to keep your password.</p>
        {["current", "password", "confirm"].map((n, i) => (
          <label key={n}>
            {["Current password", "New password", "Confirm new password"][i]}
            <input
              name={n}
              type={show ? "text" : "password"}
              autoComplete={i === 0 ? "current-password" : "new-password"}
            />
          </label>
        ))}
        <label className="check-label">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show passwords
        </label>
        <p role="status">{feedback}</p>
        <button disabled={busy} className="primary">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </section>
  );
}
