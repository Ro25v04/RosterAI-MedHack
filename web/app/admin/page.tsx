"use client";

import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { apiUploadRoster, apiOptimize, apiChat, downloadUrl } from "../../lib/api";
import { apiUploadCompliance, apiGetCompliance, apiValidateCompliance } from "../../lib/api";

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
  const [complianceFileName, setComplianceFileName] = useState<string | null>(null);
  const [rules, setRules] = useState<string[]>([]);
  const [violations, setViolations] = useState<any[] | null>(null);

  // Upload UI
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Chat
  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);


  async function fetchSheet(roster_id: string, sheet: string) {
    const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL not set");

    // ✅ use /preview (not /sheet_preview)
    const url = `${BASE}/roster/${roster_id}/preview?sheet=${encodeURIComponent(sheet)}&limit=${LIMIT}`;

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

    setUploadedFileName(file.name);
    setBusy(true);
    try {
      const data = await apiUploadRoster(file);
      const rid = data.roster_id as string;
      setRosterId(rid);

      // Reset chat
      setChatLog([]);
      setChatMsg("");

      const initialSheet = (data.active_sheet as string) || "Assignments";
      setActiveSheet(initialSheet);

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

  const complianceDz = useDropzone({
    onDrop: async (accepted: File[]) => {
      const file = accepted?.[0];
      if (!file) return;
      await uploadCompliance(file);
    },
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    multiple: false,
    disabled: !rosterId || busy,
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

      if (res.type === "edit_applied") {
        await fetchSheet(rosterId, activeSheet);
      }
    } catch (e: any) {
      setError(e?.message || "Chat failed");
    }
  }

  // -----------------------------
  // Compliance
  // -----------------------------
  async function uploadCompliance(file: File) {
    if (!rosterId) return;
    setBusy(true);
    setError(null);
    setComplianceFileName(file.name);

    try {
      const data = await apiUploadCompliance(rosterId, file);
      setRules(data.rules || []);
      setViolations(null);
    } catch (e: any) {
      setError(e?.message || "Compliance upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function validateCompliance() {
    if (!rosterId) return;
    setBusy(true);
    setError(null);

    try {
      const data = await apiValidateCompliance(rosterId);
      setViolations(data.violations || []);
    } catch (e: any) {
      setError(e?.message || "Compliance validation failed");
    } finally {
      setBusy(false);
    }
  }


  // Stepper state
  const step = useMemo(() => {
    if (!rosterId) return 1; // Upload
    if (rosterId && !metrics) return 2; // Optimise (pre-metrics)
    // once metrics exist, we consider optimize done and chat/edit possible
    return 3; // AI Edit + Export available
  }, [rosterId, metrics]);

  // Metric pills
  const metricPills = useMemo(() => {
    if (!preview && !metrics) return null;

    const pills: React.ReactNode[] = [];
    if (preview && "assignment_count" in preview)
      pills.push(<span key="a" style={pill}>Assignments: {preview.assignment_count}</span>);
    if (preview && "staff_count" in preview)
      pills.push(<span key="s" style={pill}>Staff: {preview.staff_count}</span>);

    if (metrics) {
      if ("total_overtime_hours" in metrics)
        pills.push(
          <span key="ot" style={pill}>
            Overtime: {Number(metrics.total_overtime_hours).toFixed(2)}h
          </span>
        );
      if ("burnout_risk_score" in metrics)
        pills.push(<span key="bo" style={pill}>Burnout: {metrics.burnout_risk_score}</span>);
      if ("skill_match_rate" in metrics)
        pills.push(
          <span key="sm" style={pill}>
            Skill match: {Number(metrics.skill_match_rate).toFixed(3)}
          </span>
        );
    }

    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {pills}
      </div>
    );
  }, [preview, metrics]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: 0.2 }}>
              Admin Console
            </h1>
            <span style={tag}>Workflow</span>
            <span style={{ ...tag, borderColor: "rgba(156,203,255,0.25)" }}>
              Upload → Optimise → AI Edit → Export
            </span>
          </div>
          <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6 }}>
            Run the end-to-end demo here: upload a roster, optimise, make AI edits, then export back to Excel.
          </div>

          {/* Stepper */}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StepChip active={step === 1} done={step > 1} label="1. Upload" />
            <StepChip active={step === 2} done={step > 2} label="2. Optimise" />
            <StepChip active={step === 3} done={false} label="3. AI Edit" />
            <StepChip active={rosterId != null} done={false} label="4. Export" />
          </div>
        </div>

        {/* Export buttons */}
        {rosterId && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Export</div>
              <a style={btnGhost} href={downloadUrl(rosterId, "xlsx")}>XLSX</a>
              <a style={btnGhost} href={downloadUrl(rosterId, "json")}>JSON</a>
              <a style={btnGhost} href={downloadUrl(rosterId, "pdf")}>PDF</a>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={alert}>
          <div style={{ fontWeight: 900 }}>Something went wrong</div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.85)" }}>{error}</div>
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Upload card */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={sectionTitle}>Roster Upload</div>
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  Drag & drop your Excel roster. We’ll generate previews + metrics.
                </div>
              </div>

              {uploadedFileName && (
                <span style={fileChip} title={uploadedFileName}>
                  {uploadedFileName}
                </span>
              )}
            </div>

            <div
              {...dz.getRootProps()}
              style={{
                ...dropzone,
                marginTop: 14,
                outline: dz.isDragActive ? "2px solid rgba(156,203,255,0.35)" : "none",
              }}
            >
              <input {...dz.getInputProps()} />
              <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                  {dz.isDragActive ? "Drop to upload" : "Drag & drop Excel roster here"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>.xlsx / .xls</div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <span style={tinyPill}>Fast preview</span>
                  <span style={tinyPill}>Metrics</span>
                  <span style={tinyPill}>AI edits</span>
                  <span style={tinyPill}>Export ready</span>
                </div>
                {busy && <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>Working…</div>}
              </div>
            </div>

            {rosterId && (
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button style={btnPrimary} disabled={busy} onClick={runOptimize}>
                  Optimise roster
                </button>
                <button style={btnSecondary} disabled={busy} onClick={refresh}>
                  Refresh
                </button>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>Sheet</span>
                  <select
                    value={activeSheet}
                    onChange={(e) => handleSwitchSheet(e.target.value)}
                    style={select}
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

          {/* Compliance card (pitch demo) */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={sectionTitle}>Compliance (Pitch Demo)</div>
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  Upload an EBA/policy doc. We (mock) extract rules and validate the roster against them.
                </div>
              </div>

              {complianceFileName && (
                <span style={fileChip} title={complianceFileName}>
                  {complianceFileName}
                </span>
              )}
            </div>

            <div
              {...complianceDz.getRootProps()}
              style={{
                ...dropzone,
                marginTop: 14,
                opacity: !rosterId ? 0.6 : 1,
                cursor: !rosterId ? "not-allowed" : "pointer",
                outline: complianceDz.isDragActive ? "2px solid rgba(156,203,255,0.35)" : "none",
              }}
            >
              <input {...complianceDz.getInputProps()} />
              <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                  {!rosterId ? "Upload a roster first" : complianceDz.isDragActive ? "Drop to upload" : "Drag & drop compliance doc here"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>.pdf / .txt</div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <span style={tinyPill}>Rule extraction</span>
                  <span style={tinyPill}>Audit trail</span>
                  <span style={tinyPill}>Roster validation</span>
                </div>
              </div>
            </div>

            {/* Extracted rules */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Extracted rules</div>

                <button style={btnSecondary} disabled={!rosterId || busy || rules.length === 0} onClick={validateCompliance}>
                  Validate roster
                </button>
              </div>

              {rules.length === 0 ? (
                <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                  Upload a compliance doc to see extracted rules (mock).
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {rules.map((r, idx) => (
                    <span key={idx} style={pill}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Violations */}
            {violations && (
              <div style={{ marginTop: 14, ...softPanel }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 950 }}>Compliance check</div>
                  <span style={tinyPill}>{violations.length === 0 ? "No issues" : `${violations.length} issue(s)`}</span>
                </div>

                {violations.length === 0 ? (
                  <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                    ✅ Roster passes the current compliance rules.
                  </div>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {violations.slice(0, 6).map((v: any, i: number) => (
                      <div key={i} style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                        <div style={{ fontWeight: 900, fontSize: 13 }}>{v.type}</div>
                        <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                          Staff <b style={{ color: "var(--text)" }}>{v.staff_id}</b> • {v.date} — {v.message}
                        </div>
                      </div>
                    ))}
                    {violations.length > 6 && (
                      <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 12 }}>
                        Showing 6 of {violations.length}. (Pitch demo)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pitch-only CTA */}
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={btnPrimary}
                disabled={!rosterId || busy || rules.length === 0}
                onClick={runOptimize}
                title="Pitch demo: re-run optimize after rules are extracted"
              >
                Re-optimise with compliance rules
              </button>

              <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5, alignSelf: "center" }}>
                For hackathon: we mock extraction + validation, but the flow mirrors a real compliance engine.
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={sectionTitle}>Preview</div>
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  Review sheets + metrics. Tabs are quick navigation.
                </div>
              </div>

              {rosterId && sheetNames.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {sheetNames.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSwitchSheet(s)}
                      disabled={busy}
                      style={{
                        ...tabBtn,
                        background: s === activeSheet ? "rgba(156,203,255,0.18)" : "rgba(255,255,255,0.03)",
                        borderColor: s === activeSheet ? "rgba(156,203,255,0.35)" : "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  {sheetNames.length > 5 && (
                    <span style={{ ...tag, opacity: 0.9 }}>+{sheetNames.length - 5} more</span>
                  )}
                </div>
              )}
            </div>

            {!preview || !table ? (
              <div style={{ marginTop: 14, color: "var(--muted)" }}>
                Upload a roster to see preview.
              </div>
            ) : (
              <>
                {metricPills}

                <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,0.18)" }}>
                  <div style={{ maxHeight: 460, overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead style={{ position: "sticky", top: 0, background: "rgba(16,27,45,0.95)", backdropFilter: "blur(8px)" }}>
                        <tr style={{ color: "var(--muted)" }}>
                          {table.columns.map((c) => (
                            <th key={c} style={th}>
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.length === 0 ? (
                          <tr style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={td} colSpan={Math.max(1, table.columns.length)}>
                              <span style={{ color: "var(--muted)" }}>No rows in this sheet.</span>
                            </td>
                          </tr>
                        ) : (
                          table.rows.map((r, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderTop: "1px solid var(--border)",
                                background: idx % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                              }}
                            >
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

                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                  Showing first {LIMIT} rows ({activeSheet}). Total rows: {table.total_rows ?? table.rows.length}.
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: AI Assistant */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={sectionTitle}>AI Assistant</div>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                Ask questions or request edits in plain English.
              </div>
            </div>
            <span style={{ ...tag, borderColor: "rgba(74,222,128,0.25)" }}>Edit-aware</span>
          </div>

          <div style={{ marginTop: 12, ...softPanel }}>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Example</div>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.88)", fontSize: 13 }}>
              “Swap N001 and N002 on 2025-03-05 NIGHT”
            </div>
          </div>

          <div style={{ marginTop: 12, flex: 1, ...chatBox }}>
            {chatLog.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                No messages yet. Upload a roster, then try an edit.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chatLog.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "92%",
                          padding: "10px 12px",
                          borderRadius: 16,
                          fontSize: 13,
                          lineHeight: 1.55,
                          background: isUser
                            ? "linear-gradient(135deg, rgba(156,203,255,0.95), rgba(127,184,255,0.95))"
                            : "rgba(255,255,255,0.05)",
                          color: isUser ? "#071427" : "var(--text)",
                          border: isUser ? "1px solid rgba(156,203,255,0.35)" : "1px solid var(--border)",
                          boxShadow: isUser ? "0 12px 28px rgba(0,0,0,0.25)" : "none",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder={rosterId ? "Type a question or edit…" : "Upload roster first…"}
              disabled={!rosterId || busy}
              style={input}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button style={btnPrimary} disabled={!rosterId || busy} onClick={sendChat}>
              Send
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
            Tip: After an edit is applied, the current sheet refreshes automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChip(props: { label: string; active?: boolean; done?: boolean }) {
  const { label, active, done } = props;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 850,
        border: done
          ? "1px solid rgba(74,222,128,0.35)"
          : active
            ? "1px solid rgba(156,203,255,0.35)"
            : "1px solid var(--border)",
        background: done
          ? "rgba(74,222,128,0.10)"
          : active
            ? "rgba(156,203,255,0.12)"
            : "rgba(255,255,255,0.03)",
        color: "var(--text)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: done ? "var(--success)" : active ? "var(--accent)" : "rgba(255,255,255,0.35)",
          boxShadow: active ? "0 0 0 4px rgba(156,203,255,0.10)" : "none",
        }}
      />
      {label}
    </span>
  );
}



function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "rgba(16,27,45,0.55)",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
  backdropFilter: "blur(10px)",
};

const softPanel: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  borderRadius: 16,
  padding: 12,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 950,
  letterSpacing: 0.2,
};

const tag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  color: "var(--text)",
  opacity: 0.95,
};

const pill: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  opacity: 0.95,
};

const tinyPill: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
};

const fileChip: React.CSSProperties = {
  maxWidth: 320,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  border: "1px solid rgba(156,203,255,0.25)",
  background: "rgba(156,203,255,0.08)",
  color: "var(--text)",
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 800,
};

const dropzone: React.CSSProperties = {
  border: "1px dashed rgba(156,203,255,0.25)",
  background: "rgba(0,0,0,0.18)",
  borderRadius: 18,
  padding: 20,
  textAlign: "center",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  border: "1px solid rgba(156,203,255,0.35)",
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  color: "#071427",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--text)",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 850,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--text)",
  padding: "8px 10px",
  borderRadius: 12,
  fontSize: 13,
  textDecoration: "none",
  fontWeight: 850,
};

const tabBtn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  border: "1px solid var(--border)",
};

const select: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 13,
  outline: "none",
};

const chatBox: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  background: "rgba(0,0,0,0.18)",
  padding: 12,
  overflow: "auto",
};

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "rgba(0,0,0,0.18)",
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 13,
  outline: "none",
};

const alert: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid rgba(255,107,107,0.35)",
  background: "rgba(255,107,107,0.10)",
  padding: 12,
  borderRadius: 16,
};


const th: React.CSSProperties = {
  padding: "10px 10px",
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
  fontWeight: 900,
  fontSize: 12,
};

const td: React.CSSProperties = {
  padding: "10px 10px",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
  color: "var(--text)",
  fontSize: 13,
};

