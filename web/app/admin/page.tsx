"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { apiUploadRoster, apiOptimize, apiPreview, apiChat, downloadUrl } from "../../lib/api";

type Assignment = {
  date: string;
  shift: string;
  slot: number;
  staff_id: string;
};

export default function AdminPage() {
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatMsg, setChatMsg] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "user" | "bot"; text: string }[]>([]);

  const onDrop = async (accepted: File[]) => {
    setError(null);
    const file = accepted?.[0];
    if (!file) return;

    setBusy(true);
    try {
      const data = await apiUploadRoster(file);
      setRosterId(data.roster_id);
      setPreview(data.preview);
      setMetrics(data.metrics);
      setChatLog([]);
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
    const data = await apiPreview(rosterId, 200);
    setPreview(data.preview);
    setMetrics(data.metrics);
  }

  async function runOptimize() {
    if (!rosterId) return;
    setBusy(true);
    setError(null);
    try {
      await apiOptimize(rosterId);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Optimize failed");
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
        setPreview(res.preview);
        setMetrics(res.metrics);
      }
    } catch (e: any) {
      setError(e?.message || "Chat failed");
    }
  }

  const rows: Assignment[] = useMemo(() => preview?.assignments || [], [preview]);

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
              <a style={btnGhost} href={downloadUrl(rosterId, "xlsx")}>XLSX</a>
              <a style={btnGhost} href={downloadUrl(rosterId, "csv")}>CSV</a>
              <a style={btnGhost} href={downloadUrl(rosterId, "json")}>JSON</a>
              <a style={btnGhost} href={downloadUrl(rosterId, "pdf")}>PDF</a>
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
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  <button style={btnPrimary} disabled={busy} onClick={runOptimize}>
                    Optimize roster
                  </button>
                  <button style={btnSecondary} disabled={busy} onClick={refresh}>
                    Refresh preview
                  </button>
                </div>
              )}
            </div>

            <div style={card}>
              <h2 style={h2}>Preview</h2>

              {!preview ? (
                <p style={{ color: "#a3a3a3" }}>Upload a roster to see preview.</p>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <span style={pill}>Assignments: {preview.assignment_count}</span>
                    <span style={pill}>Staff: {preview.staff_count}</span>
                    {metrics && (
                      <>
                        {"total_overtime_hours" in metrics && <span style={pill}>Overtime: {Number(metrics.total_overtime_hours).toFixed(2)}</span>}
                        {"burnout_risk_score" in metrics && <span style={pill}>Burnout: {metrics.burnout_risk_score}</span>}
                        {"skill_match_rate" in metrics && <span style={pill}>Skill match: {Number(metrics.skill_match_rate).toFixed(3)}</span>}
                      </>
                    )}
                  </div>

                  <div style={{ marginTop: 12, border: "1px solid #262626", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ maxHeight: 420, overflow: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ position: "sticky", top: 0, background: "#0f0f0f" }}>
                          <tr style={{ color: "#a3a3a3" }}>
                            <th style={th}>Date</th>
                            <th style={th}>Shift</th>
                            <th style={th}>Slot</th>
                            <th style={th}>Staff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, idx) => (
                            <tr key={idx} style={{ borderTop: "1px solid #262626" }}>
                              <td style={td}>{r.date}</td>
                              <td style={td}>{r.shift}</td>
                              <td style={td}>{r.slot}</td>
                              <td style={td}>{r.staff_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: "#737373" }}>
                    Preview shows first {preview.preview_limit} rows.
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
              <div style={{ marginTop: 6, color: "#d4d4d4" }}>
                “Swap N001 and N002 on 2025-03-05 NIGHT”
              </div>
            </div>

            <div style={{ marginTop: 12, flex: 1, border: "1px solid #262626", borderRadius: 12, background: "#0f0f0f", padding: 12, overflow: "auto" }}>
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
                disabled={!rosterId}
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
              <button style={btnPrimary} disabled={!rosterId} onClick={sendChat}>
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

const th: React.CSSProperties = { padding: "10px 10px", textAlign: "left" };
const td: React.CSSProperties = { padding: "10px 10px" };