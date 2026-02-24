"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { apiUploadRoster, apiOptimize, apiChat, downloadUrl } from "../../lib/api";

type ChatItem = { role: "user" | "bot"; text: string };

type SheetTable = {
  sheet: string;
  columns: string[];
  rows: any[];
  total_rows: number;
};

type SheetPreviewResponse = {
  roster_id: string;
  sheet_names: string[];
  active_sheet: string;
  preview: any;
  metrics: any;
  table: SheetTable;
};

const LIMIT = 200;

export default function AdminPage() {
  const [rosterId, setRosterId] = useState<string | null>(null);

  // Data from backend
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("Assignments");
  const [preview, setPreview] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [table, setTable] = useState<SheetTable | null>(null);

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);

  async function fetchSheet(roster_id: string, sheet: string) {
    // Calls the new endpoint directly
    const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL not set");

    const url = `${BASE}/roster/${roster_id}/sheet_preview?sheet=${encodeURIComponent(sheet)}&limit=${LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as SheetPreviewResponse;

    setSheetNames(data.sheet_names || []);
    setActiveSheet(data.active_sheet || sheet);
    setPreview(data.preview);
    setMetrics(data.metrics);
    setTable(data.table);

    return data;
  }

  const onDrop = async (accepted: File[]) => {
    setError(null);
    const file = accepted?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const data = await apiUploadRoster(file);

      // Expecting backend to return at least roster_id
      const rid = data.roster_id as string;
      setRosterId(rid);

      // Reset chat
      setChatLog([]);
      setChatMsg("");

      // If backend returns these (nice), use them; otherwise fetch
      const initialSheet = (data.active_sheet as string) || "Assignments";
      setActiveSheet(initialSheet);

      // If upload already returns preview/metrics/table, you can set them here;
      // but safest is to load from sheet_preview so tabs always work.
      await fetchSheet(rid, initialSheet);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const dz = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  async function refresh() {
    if (!rosterId) return;
    setBusy(true);
    setError(null);
    try {
      await fetchSheet(rosterId, activeSheet);
    } catch (e: any) {
      setError(e?.message || "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function runOptimize() {
    if (!rosterId) return;
    setBusy(true);
    setError(null);
    try {
      await apiOptimize(rosterId);
      // After optimize, backend should expose extra sheets
      await fetchSheet(rosterId, activeSheet);
    } catch (e: any) {
      setError(e?.message || "Optimize failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchSheet(sheet: string) {
    if (!rosterId) return;
    setBusy(true);
    setError(null);
    try {
      await fetchSheet(rosterId, sheet);
    } catch (e: any) {
      setError(e?.message || "Failed to switch sheet");
    } finally {
      setBusy(false);
    }
  }

  async function sendChat() {
    if (!rosterId) return;
    const msg = chatMsg.trim();
    if (!msg) return;

    setChatLog((p) => [...p, { role: "user", text: msg }]);
    setChatMsg("");
    setError(null);

    try {
      const res = await apiChat(rosterId, msg);
      setChatLog((p) => [...p, { role: "bot", text: res.reply }]);

      // If an edit was applied, always re-fetch current sheet so preview is truly updated
      if (res.type === "edit_applied") {
        await fetchSheet(rosterId, activeSheet);
      }
    } catch (e: any) {
      setError(e?.message || "Chat failed");
    }
  }

  // Pretty metrics pills
  const metricPills = useMemo(() => {
    if (!preview) return null;
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {"assignment_count" in preview && <span style={pill}>Assignments: {preview.assignment_count}</span>}
        {"staff_count" in preview && <span style={pill}>Staff: {preview.staff_count}</span>}
        {metrics && (
          <>
            {"total_overtime_hours" in metrics && (
              <span style={pill}>Overtime: {Number(metrics.total_overtime_hours).toFixed(2)}</span>
            )}
            {"burnout_risk_score" in metrics && <span style={pill}>Burnout: {metrics.burnout_risk_score}</span>}
            {"skill_match_rate" in metrics && (
              <span style={pill}>Skill match: {Number(metrics.skill_match_rate).toFixed(3)}</span>
            )}
          </>
        )}
      </div>
    );
  }, [preview, metrics]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Console</h1>
            <p style={{ marginTop: 6, color: "#a3a3a3" }}>Upload → Optimize → Edit via AI → Export</p>
          </div>

          {rosterId && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a style={btnGhost} href={downloadUrl(rosterId, "xlsx")}>
                XLSX
              </a>
              <a style={btnGhost} href={downloadUrl(rosterId, "csv")}>
                CSV
              </a>
              <a style={btnGhost} href={downloadUrl(rosterId, "json")}>
                JSON
              </a>
              <a style={btnGhost} href={downloadUrl(rosterId, "pdf")}>
                PDF
              </a>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, border: "1px solid #7f1d1d", background: "#450a0a", padding: 12, borderRadius: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <h2 style={h2}>Roster Upload</h2>

              <div
                {...dz.getRootProps()}
                style={{
                  border: "1px dashed #404040",
                  background: "#0f0f0f",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <input {...dz.getInputProps()} />
                <div style={{ fontWeight: 600 }}>Drag & drop Excel roster here</div>
                <div style={{ fontSize: 12, color: "#a3a3a3", marginTop: 4 }}>.xlsx / .xls</div>
                {busy && <div style={{ fontSize: 12, color: "#a3a3a3", marginTop: 10 }}>Working…</div>}
              </div>

              {rosterId && (
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={btnPrimary} disabled={busy} onClick={runOptimize}>
                    Optimize roster
                  </button>
                  <button style={btnSecondary} disabled={busy} onClick={refresh}>
                    Refresh preview
                  </button>

                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#a3a3a3", fontSize: 12 }}>Sheet</span>
                    <select
                      value={activeSheet}
                      onChange={(e) => handleSwitchSheet(e.target.value)}
                      style={{
                        borderRadius: 12,
                        border: "1px solid #2a2a2a",
                        background: "#171717",
                        color: "#fff",
                        padding: "10px 12px",
                        fontSize: 13,
                        outline: "none",
                      }}
                      disabled={busy || sheetNames.length === 0}
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <h2 style={h2}>Preview</h2>

                {/* Tabs (optional visual, still uses the same switch function) */}
                {rosterId && sheetNames.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {sheetNames.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSwitchSheet(s)}
                        disabled={busy}
                        style={{
                          ...tabBtn,
                          background: s === activeSheet ? "#ffffff" : "#171717",
                          color: s === activeSheet ? "#000" : "#fff",
                          border: s === activeSheet ? "1px solid #fff" : "1px solid #2a2a2a",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!preview || !table ? (
                <p style={{ color: "#a3a3a3" }}>Upload a roster to see preview.</p>
              ) : (
                <>
                  {metricPills}

                  <div style={{ marginTop: 12, border: "1px solid #262626", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ maxHeight: 420, overflow: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ position: "sticky", top: 0, background: "#0f0f0f" }}>
                          <tr style={{ color: "#a3a3a3" }}>
                            {table.columns.map((c) => (
                              <th key={c} style={th}>
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.length === 0 ? (
                            <tr style={{ borderTop: "1px solid #262626" }}>
                              <td style={td} colSpan={Math.max(1, table.columns.length)}>
                                <span style={{ color: "#a3a3a3" }}>No rows in this sheet.</span>
                              </td>
                            </tr>
                          ) : (
                            table.rows.map((r, idx) => (
                              <tr key={idx} style={{ borderTop: "1px solid #262626" }}>
                                {table.columns.map((c) => (
                                  <td key={c} style={td}>
                                    {formatCell(r?.[c])}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: "#737373" }}>
                    Showing first {LIMIT} rows ({activeSheet}). Total rows: {table.total_rows ?? table.rows.length}.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ ...card, display: "flex", flexDirection: "column" }}>
            <h2 style={h2}>AI Assistant</h2>
            <div style={{ color: "#a3a3a3", fontSize: 13 }}>
              Ask questions or request edits like:
              <div style={{ marginTop: 6, color: "#d4d4d4" }}>“Swap N001 and N002 on 2025-03-05 NIGHT”</div>
            </div>

            <div
              style={{
                marginTop: 12,
                flex: 1,
                border: "1px solid #262626",
                borderRadius: 12,
                background: "#0f0f0f",
                padding: 12,
                overflow: "auto",
              }}
            >
              {chatLog.length === 0 ? (
                <div style={{ color: "#737373", fontSize: 13 }}>No messages yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {chatLog.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "90%",
                          padding: "10px 12px",
                          borderRadius: 16,
                          fontSize: 13,
                          background: m.role === "user" ? "#fff" : "#262626",
                          color: m.role === "user" ? "#000" : "#fff",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                placeholder={rosterId ? "Type a question or edit…" : "Upload roster first…"}
                disabled={!rosterId || busy}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid #262626",
                  background: "#0f0f0f",
                  color: "#fff",
                  padding: "10px 12px",
                  fontSize: 13,
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
              />
              <button style={btnPrimary} disabled={!rosterId || busy} onClick={sendChat}>
                Send
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#737373" }}>
              Nurse preferences page can be a placeholder — admin flow is the demo.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const card: React.CSSProperties = {
  border: "1px solid #262626",
  background: "#111111",
  borderRadius: 16,
  padding: 16,
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: 0,
};

const pill: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#1f1f1f",
  border: "1px solid #2a2a2a",
  color: "#e5e5e5",
};

const btnPrimary: React.CSSProperties = {
  border: "none",
  background: "#ffffff",
  color: "#000",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  border: "1px solid #2a2a2a",
  background: "#171717",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #2a2a2a",
  background: "#171717",
  color: "#fff",
  padding: "8px 10px",
  borderRadius: 12,
  fontSize: 13,
  textDecoration: "none",
};

const tabBtn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const th: React.CSSProperties = {
  padding: "10px 10px",
  textAlign: "left",
  borderBottom: "1px solid #262626",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px 10px",
  whiteSpace: "nowrap",
};