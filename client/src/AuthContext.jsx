import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "docflow_token";

async function fetchCurrentUser(token) {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Unable to fetch current user");
  }

  return response.json();
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchCurrentUser(token)
      .then((data) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      async login(email, password) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Login failed");
        }

        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
