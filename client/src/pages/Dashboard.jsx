import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

function formatRelativeTime(value) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function DocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6 text-indigo-600"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 3.75h6.5L18 8.25v12H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M13.25 4v4.5H18M9 12h6M9 15h6M9 18h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DocumentCard({ document, showOwner }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/doc/${document.id}`)}
      className={`block w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md ${
        showOwner ? "border-l-4 border-l-[#0891B2]" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="rounded-md bg-indigo-50 p-2">
          <DocumentIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-ink">{document.title}</h3>
          {showOwner ? (
            <p className="mt-1 truncate text-sm text-slate-500">Owner: {document.ownerName}</p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-slate-500">
            {formatRelativeTime(document.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

function DocumentSection({ documents, emptyText, showOwner, title }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4 border-l-4 border-[#4F46E5] pl-4">
        <h2 className="text-3xl font-bold text-ink">{title}</h2>
        <span className="text-sm font-medium text-slate-500">{documents.length} total</span>
      </div>

      {documents.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} showOwner={showOwner} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </section>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { logout, token, user } = useAuth();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    apiRequest(token, "/api/documents")
      .then((data) => {
        if (!cancelled) {
          setDocuments(data.documents);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
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

  const myDocuments = useMemo(
    () => documents.filter((document) => document.isOwner),
    [documents]
  );
  const sharedDocuments = useMemo(
    () => documents.filter((document) => !document.isOwner),
    [documents]
  );

  async function handleCreateDocument() {
    setCreating(true);
    setError("");

    try {
      const data = await apiRequest(token, "/api/documents", {
        method: "POST"
      });
      navigate(`/doc/${data.document.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setCreating(false);
    }
  }

  async function handleUploadFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiRequest(token, "/api/upload", {
        method: "POST",
        body: formData
      });

      navigate(`/doc/${data.documentId}`);
    } catch (requestError) {
      setError(
        requestError.message === "Only .txt and .md files are supported"
          ? "Only .txt and .md files are supported"
          : requestError.message
      );
      setUploading(false);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="docflow-logo text-3xl font-bold text-ink">DocFlow</p>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreateDocument}
              disabled={creating}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-[#1d5953] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? "Creating..." : "New Document"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleUploadFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm font-medium text-slate-600">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="flex min-h-[45vh] items-center justify-center text-center">
            <p className="text-lg font-semibold text-slate-600">
              No documents yet. Create your first one!
            </p>
          </div>
        ) : (
          <>
            <DocumentSection
              title="My Documents"
              documents={myDocuments}
              emptyText="Create your first document to start writing."
            />
            <DocumentSection
              title="Shared with Me"
              documents={sharedDocuments}
              emptyText="Documents shared with you will appear here."
              showOwner
            />
          </>
        )}
      </div>
    </main>
  );
}
