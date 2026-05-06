import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("alice@demo.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1fr_460px]">
      <section className="flex items-center px-8 py-12 sm:px-12 lg:px-20">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            DocFlow
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            Collaborative documents with a calm, shared workspace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Your documents, beautifully organized. Start writing in seconds.
          </p>
        </div>
      </section>

      <section className="flex items-center border-t border-slate-200 bg-white px-6 py-10 sm:px-10 lg:border-l lg:border-t-0">
        <form className="w-full" onSubmit={handleSubmit}>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-ink">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Demo users share the password <span className="font-medium">demo123</span>.
            </p>
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-5 w-full rounded-md border border-slate-300 px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            required
          />

          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.3A9.7 9.7 0 0 1 12 5c5 0 8.5 4.4 9.5 6.5a12.4 12.4 0 0 1-2.3 3.1M6.2 6.7a13.3 13.3 0 0 0-3.7 4.8C3.5 13.6 7 18 12 18c1.2 0 2.3-.2 3.3-.7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              )}
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-accent px-4 py-3 font-semibold text-white transition hover:bg-[#1d5953] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
