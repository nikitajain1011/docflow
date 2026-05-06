import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <p className="text-sm font-medium text-slate-600">Loading DocFlow...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
