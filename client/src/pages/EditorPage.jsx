import Strike from "@tiptap/extension-strike";
import Underline from "@tiptap/extension-underline";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

const blankContent = {
  type: "doc",
  content: [
    {
      type: "paragraph"
    }
  ]
};

const editorExtensions = [
  StarterKit.configure({ strike: false }),
  Underline,
  Strike,
  Markdown
];

function parseContent(content) {
  if (!content) {
    return blankContent;
  }

  try {
    const parsedContent = JSON.parse(content);

    if (parsedContent?.type === "text") {
      const paragraphs = String(parsedContent.content || "").split(/\r?\n/);

      return {
        type: "doc",
        content: paragraphs.map((paragraph) => ({
          type: "paragraph",
          content: paragraph
            ? [
                {
                  type: "text",
                  text: paragraph
                }
              ]
            : undefined
        }))
      };
    }

    return parsedContent;
  } catch (_error) {
    return blankContent;
  }
}

function countWords(editor) {
  const text = editor?.getText().trim() || "";
  return text ? text.split(/\s+/).length : 0;
}

function formatVersionDate(dateStr) {
  const date = new Date(dateStr);

  return (
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  );
}

function sanitizeFilename(value) {
  return (value || "Untitled Document")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ToolbarButton({ active, children, disabled, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition duration-150 ${
        active
          ? "translate-y-px border-indigo-600 bg-indigo-600 text-white shadow-inner"
          : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function EditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuth();
  const saveTimerRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedVersionLoading, setSelectedVersionLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sharingUserId, setSharingUserId] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const sharedUserIds = useMemo(
    () => new Set(document?.sharedUsers?.map((user) => user.id) || []),
    [document]
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: blankContent,
    editorProps: {
      attributes: {
        class:
          "min-h-[calc(100vh-300px)] rounded-lg border border-slate-200 bg-white px-8 py-8 text-ink outline-none"
      }
    },
    onUpdate({ editor: currentEditor }) {
      setWordCount(countWords(currentEditor));
      window.clearTimeout(saveTimerRef.current);
      setStatus("Saving...");
      saveTimerRef.current = window.setTimeout(() => {
        saveContent(currentEditor.getJSON());
      }, 1000);
    }
  });

  const previewEditor = useEditor({
    extensions: editorExtensions,
    content: blankContent,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 outline-none"
      }
    }
  });

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setLoadError(false);

    apiRequest(token, `/api/documents/${id}`)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const parsedContent = parseContent(data.document.content);
        setDocument(data.document);
        setTitle(data.document.title);
        editor?.commands.setContent(parsedContent, { emitUpdate: false });
        setWordCount(countWords(editor));
        setStatus("Saved");
      })
      .catch((requestError) => {
        if (!cancelled) {
          setLoadError(true);
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
      window.clearTimeout(saveTimerRef.current);
    };
  }, [editor, id, token]);

  async function createVersionSnapshot() {
    await apiRequest(token, `/api/documents/${id}/versions`, {
      method: "POST"
    });

    if (historyOpen) {
      await loadVersions();
    }
  }

  async function saveContent(content = editor?.getJSON()) {
    if (!content) {
      return;
    }

    try {
      await apiRequest(token, `/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content })
      });
      await createVersionSnapshot();
      setStatus("Saved ✓");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("Save failed");
    }
  }

  async function saveTitle() {
    if (!document || title.trim() === document.title) {
      setTitle((currentTitle) => currentTitle.trim() || "Untitled Document");
      return;
    }

    setStatus("Saving...");

    try {
      const data = await apiRequest(token, `/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title })
      });
      setDocument((currentDocument) => ({
        ...currentDocument,
        title: data.document.title
      }));
      setTitle(data.document.title);
      await createVersionSnapshot();
      setStatus("Saved ✓");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("Save failed");
    }
  }

  function downloadMarkdown() {
    const filename = `${sanitizeFilename(title)}.md`;
    const markdown = editor?.getMarkdown?.() || editor?.markdown?.serialize(editor.getJSON()) || "";
    downloadText(filename, markdown, "text/markdown;charset=utf-8");
    setExportOpen(false);
  }

  function downloadPlainText() {
    const filename = `${sanitizeFilename(title)}.txt`;
    downloadText(filename, editor?.getText() || "", "text/plain;charset=utf-8");
    setExportOpen(false);
  }

  async function downloadPdf() {
    if (!editor) {
      return;
    }

    const filename = `${sanitizeFilename(title)}.pdf`;
    const exportNode = document.createElement("div");

    Object.assign(exportNode.style, {
      position: "absolute",
      left: "-9999px",
      width: "794px",
      padding: "60px",
      background: "white",
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      lineHeight: "1.8",
      color: "#1a1a1a"
    });

    exportNode.innerHTML = editor.getHTML();
    document.body.appendChild(exportNode);

    try {
      const canvas = await html2canvas(exportNode, {
        backgroundColor: "#ffffff",
        scale: 2
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let y = 0;

      pdf.addImage(imageData, "PNG", 0, y, pageWidth, imageHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        y -= pageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, y, pageWidth, imageHeight);
        remainingHeight -= pageHeight;
      }

      pdf.save(filename);
    } finally {
      exportNode.remove();
      setExportOpen(false);
    }
  }

  async function loadVersions() {
    setVersionsLoading(true);
    setError("");

    try {
      const data = await apiRequest(token, `/api/documents/${id}/versions`);
      setVersions(data.versions);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function openHistoryPanel() {
    setHistoryOpen(true);
    await loadVersions();
  }

  async function selectVersion(versionId) {
    setSelectedVersionLoading(true);
    setError("");

    try {
      const data = await apiRequest(token, `/api/documents/${id}/versions/${versionId}`);
      const version = data.version;
      setSelectedVersion(version);
      previewEditor?.commands.setContent(parseContent(version.content), { emitUpdate: false });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSelectedVersionLoading(false);
    }
  }

  function restoreSelectedVersion() {
    if (!selectedVersion || !editor) {
      return;
    }

    editor.commands.setContent(parseContent(selectedVersion.content), { emitUpdate: false });
    setWordCount(countWords(editor));
    setStatus("Restored - click Save");
    setHistoryOpen(false);
  }

  async function openShareModal() {
    setShareModalOpen(true);
    setShareMessage("");

    if (users.length) {
      return;
    }

    setUsersLoading(true);
    setError("");

    try {
      const data = await apiRequest(token, "/api/users");
      setUsers(data.users);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUsersLoading(false);
    }
  }

  async function shareWithUser(user) {
    setSharingUserId(user.id);
    setShareMessage("");
    setError("");

    try {
      const data = await apiRequest(token, `/api/documents/${id}/share`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id })
      });

      setDocument((currentDocument) => ({
        ...currentDocument,
        sharedUsers: [
          ...(currentDocument.sharedUsers || []).filter(
            (sharedUser) => sharedUser.id !== data.user.id
          ),
          data.user
        ]
      }));
      setShareMessage(`Shared with ${data.user.name}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSharingUserId("");
    }
  }

  if (!loading && loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-ink">
            Document not found or you don't have access.
          </h1>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-[#1d5953]"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="fixed left-0 right-0 top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
            >
              Back
            </button>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveTitle}
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-2 text-xl font-semibold text-ink outline-none transition duration-150 hover:border-slate-200 focus:border-indigo-400 focus:bg-white"
              aria-label="Document title"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => saveContent()}
              disabled={!editor}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((current) => !current)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
              >
                Export
              </button>
              {exportOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={downloadMarkdown}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    Download as Markdown
                  </button>
                  <button
                    type="button"
                    onClick={downloadPlainText}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    Download as Plain Text
                  </button>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    Download as PDF
                  </button>
                </div>
              ) : null}
            </div>
            {document?.isOwner ? (
              <button
                type="button"
                onClick={openHistoryPanel}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
              >
                History
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 text-sm font-bold text-slate-700 transition duration-150 hover:bg-slate-50"
              aria-label="Show keyboard shortcuts"
            >
              ?
            </button>
            {document?.isOwner ? (
              <button
                type="button"
                onClick={openShareModal}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
              >
                Share
              </button>
            ) : null}
            <p className="w-24 text-right text-sm font-medium text-slate-500">{status}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-20">
        {error ? (
          <p className="mx-auto mb-4 max-w-[720px] rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mx-auto mb-6 flex max-w-[720px] flex-wrap gap-2 border-b border-slate-200 pb-4">
          <ToolbarButton
            active={editor?.isActive("bold")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Bold
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("italic")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Italic
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("underline")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            Underline
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("strike")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            Strikethrough
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("code")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            Code
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("heading", { level: 1 })}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("heading", { level: 2 })}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("bulletList")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullet list
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive("orderedList")}
            disabled={!editor}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Ordered list
          </ToolbarButton>
          <ToolbarButton
            disabled={!editor}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            Horizontal rule
          </ToolbarButton>
        </div>

        {loading ? (
          <p className="mx-auto max-w-[720px] text-sm font-medium text-slate-600">
            Loading document...
          </p>
        ) : (
          <div className="docflow-editor mx-auto max-w-[720px]">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </div>

      {historyOpen ? (
        <aside className="fixed bottom-0 right-0 top-0 z-30 w-full max-w-md border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Version history</h2>
              <p className="text-sm text-slate-500">Last 10 saved versions</p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="grid h-[calc(100%-73px)] grid-rows-[220px_1fr]">
            <div className="overflow-y-auto border-b border-slate-200 p-4">
              {versionsLoading ? (
                <p className="text-sm text-slate-500">Loading versions...</p>
              ) : versions.length ? (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => selectVersion(version.id)}
                      className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition duration-150 ${
                        selectedVersion?.id === version.id
                          ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {formatVersionDate(version.savedAt)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No versions saved yet.</p>
              )}
            </div>

            <div className="overflow-y-auto p-4">
              {selectedVersionLoading ? (
                <p className="text-sm text-slate-500">Loading preview...</p>
              ) : selectedVersion ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Preview
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatVersionDate(selectedVersion.savedAt)}
                    </p>
                  </div>
                  <div className="docflow-editor">
                    <EditorContent editor={previewEditor} />
                  </div>
                  <button
                    type="button"
                    onClick={restoreSelectedVersion}
                    className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-indigo-700"
                  >
                    Restore this version
                  </button>
                  <p className="text-xs text-slate-500">
                    Restoring replaces the editor content only. Click Save to persist it.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a version to preview it.</p>
              )}
            </div>
          </div>
        </aside>
      ) : null}

      {shortcutsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-ink">Cmd+B</span> bold
              </p>
              <p>
                <span className="font-semibold text-ink">Cmd+I</span> italic
              </p>
              <p>
                <span className="font-semibold text-ink">Cmd+U</span> underline
              </p>
              <p>
                <span className="font-semibold text-ink">Cmd+Z</span> undo
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {shareModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Share document</h2>
                <p className="mt-1 text-sm text-slate-500">Give another user edit access.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition duration-150 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-6 py-4">
              {shareMessage ? (
                <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {shareMessage}
                </p>
              ) : null}

              {usersLoading ? (
                <p className="text-sm text-slate-500">Loading users...</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => {
                    const alreadyShared = sharedUserIds.has(user.id);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{user.name}</p>
                          <p className="truncate text-sm text-slate-500">{user.email}</p>
                        </div>
                        {alreadyShared ? (
                          <span className="shrink-0 text-sm font-semibold text-accent">
                            Shared ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => shareWithUser(user)}
                            disabled={sharingUserId === user.id}
                            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition duration-150 hover:bg-[#1d5953] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {sharingUserId === user.id ? "Sharing..." : "Share"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
