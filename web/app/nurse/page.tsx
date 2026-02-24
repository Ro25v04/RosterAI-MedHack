"use client";

import { useMemo, useState } from "react";

type ShiftPref = "AM" | "PM" | "NIGHT";
type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export default function NursePage() {
  const [name, setName] = useState("Nurse N001");
  const [unit, setUnit] = useState("General Ward");
  const [contract, setContract] = useState("Full-time");
  const [skill, setSkill] = useState("General");

  const [preferredShifts, setPreferredShifts] = useState<ShiftPref[]>(["AM", "PM"]);
  const [preferredDaysOff, setPreferredDaysOff] = useState<Day[]>(["Sat", "Sun"]);

  const [maxConsecutive, setMaxConsecutive] = useState(4);
  const [minRestHours, setMinRestHours] = useState(10);
  const [overtimeTolerance, setOvertimeTolerance] = useState<"Low" | "Medium" | "High">("Low");

  const [unavailableDates, setUnavailableDates] = useState<string[]>([
    "2026-03-12",
    "2026-03-18",
    "2026-03-22",
  ]);

  const [newDate, setNewDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fatigueRisk = useMemo(() => {
    // Simple “looks smart” heuristic (UI-only)
    let score = 0;
    score += Math.max(0, (maxConsecutive - 3) * 12);
    score += minRestHours <= 8 ? 20 : minRestHours <= 10 ? 10 : 0;
    score += overtimeTolerance === "High" ? 18 : overtimeTolerance === "Medium" ? 10 : 0;
    score += unavailableDates.length >= 5 ? 6 : 0;
    score = Math.min(95, Math.max(8, score));
    return score;
  }, [maxConsecutive, minRestHours, overtimeTolerance, unavailableDates.length]);

  const fairnessBoost = useMemo(() => {
    let score = 0;
    score += preferredDaysOff.length >= 2 ? 18 : 10;
    score += preferredShifts.length >= 2 ? 14 : 8;
    score += minRestHours >= 10 ? 12 : 6;
    score = Math.min(92, Math.max(10, score));
    return score;
  }, [preferredDaysOff.length, preferredShifts.length, minRestHours]);

  const overtimeProb = useMemo(() => {
    let score = 55;
    score += overtimeTolerance === "High" ? 15 : overtimeTolerance === "Medium" ? 8 : -2;
    score += maxConsecutive >= 6 ? 10 : maxConsecutive >= 5 ? 6 : 0;
    score += minRestHours >= 12 ? -10 : minRestHours >= 10 ? -6 : 0;
    score = Math.min(85, Math.max(18, score));
    return score;
  }, [overtimeTolerance, maxConsecutive, minRestHours]);

  function toggleShift(s: ShiftPref) {
    setPreferredShifts((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  function toggleDay(d: Day) {
    setPreferredDaysOff((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  }

  function addDate() {
    const v = newDate.trim();
    if (!v) return;
    if (unavailableDates.includes(v)) return;
    setUnavailableDates((p) => [...p, v].sort());
    setNewDate("");
  }

  function removeDate(v: string) {
    setUnavailableDates((p) => p.filter((x) => x !== v));
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  function savePrefs() {
    // UI-only (hackathon). No backend.
    showToast("Preferences saved (demo)");
  }

  const card: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "rgba(16,27,45,0.55)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
    backdropFilter: "blur(10px)",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 950,
    letterSpacing: 0.2,
  };

  const sub: React.CSSProperties = {
    marginTop: 6,
    color: "var(--muted)",
    fontSize: 13,
    lineHeight: 1.55,
  };

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    color: "var(--text)",
    fontWeight: 850,
  };

  const btnPrimary: React.CSSProperties = {
    border: "1px solid rgba(156,203,255,0.35)",
    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
    color: "#071427",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const btnSecondary: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text)",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
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

  const select: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text)",
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    width: "100%",
  };

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    border: active ? "1px solid rgba(156,203,255,0.35)" : "1px solid var(--border)",
    background: active ? "rgba(156,203,255,0.12)" : "rgba(255,255,255,0.03)",
    color: "var(--text)",
    padding: "10px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
  });

  const metricBox: React.CSSProperties = {
    border: "1px solid var(--border)",
    background: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    padding: 14,
  };

  const barWrap: React.CSSProperties = {
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    marginTop: 8,
  };

  const bar = (pct: number): React.CSSProperties => ({
    width: `${pct}%`,
    height: "100%",
    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 22, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 22,
            bottom: 22,
            zIndex: 50,
            border: "1px solid rgba(74,222,128,0.35)",
            background: "rgba(74,222,128,0.12)",
            color: "var(--text)",
            padding: "10px 12px",
            borderRadius: 14,
            fontWeight: 900,
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, letterSpacing: 0.2 }}>Nurse Preferences</h1>
            <span style={chip}>Prototype (UI only)</span>
            <span style={{ ...chip, borderColor: "rgba(156,203,255,0.25)" }}>
              Feeds constraints → optimisation
            </span>
          </div>
          <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6 }}>
            In production, nurse constraints would be saved and used by the optimiser. For the hackathon demo, this page
            showcases the inputs OptiNUM is designed to support.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={btnSecondary} onClick={() => showToast("Loaded sample preferences")}>
            Load sample
          </button>
          <button style={btnPrimary} onClick={savePrefs}>
            Save preferences
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        {/* LEFT: Forms */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Profile */}
          <div style={card}>
            <div style={sectionTitle}>Profile</div>
            <div style={sub}>Basic info + role context (used for skill-based matching).</div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Name</div>
                <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Unit</div>
                <select style={select} value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option>General Ward</option>
                  <option>Emergency</option>
                  <option>ICU</option>
                  <option>Surgery</option>
                  <option>Paediatrics</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Contract</div>
                <select style={select} value={contract} onChange={(e) => setContract(e.target.value)}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Casual</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Primary skill</div>
                <select style={select} value={skill} onChange={(e) => setSkill(e.target.value)}>
                  <option>General</option>
                  <option>ICU trained</option>
                  <option>Paeds trained</option>
                  <option>Medication certified</option>
                  <option>Charge nurse</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div style={card}>
            <div style={sectionTitle}>Shift preferences</div>
            <div style={sub}>Used to increase satisfaction while keeping safe staffing coverage.</div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["AM", "PM", "NIGHT"] as ShiftPref[]).map((s) => (
                <button key={s} style={toggleBtn(preferredShifts.includes(s))} onClick={() => toggleShift(s)}>
                  {preferredShifts.includes(s) ? "✓ " : ""}
                  {s}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Preferred days off</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as Day[]).map((d) => (
                    <button key={d} style={toggleBtn(preferredDaysOff.includes(d))} onClick={() => toggleDay(d)}>
                      {preferredDaysOff.includes(d) ? "✓ " : ""}
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Unavailable dates</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={input}
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                  <button style={btnSecondary} onClick={addDate}>
                    Add
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {unavailableDates.length === 0 ? (
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>No dates added.</span>
                  ) : (
                    unavailableDates.map((d) => (
                      <span
                        key={d}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 999,
                          padding: "7px 10px",
                          fontSize: 12,
                          fontWeight: 850,
                          color: "var(--text)",
                        }}
                      >
                        {d}
                        <button
                          onClick={() => removeDate(d)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fatigue constraints */}
          <div style={card}>
            <div style={sectionTitle}>Fatigue & safety constraints</div>
            <div style={sub}>These constraints are key inputs to overtime-aware optimisation.</div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div style={metricBox}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Max consecutive shifts</div>
                <div style={{ marginTop: 6, fontWeight: 950, fontSize: 18 }}>{maxConsecutive}</div>
                <input
                  type="range"
                  min={2}
                  max={7}
                  value={maxConsecutive}
                  onChange={(e) => setMaxConsecutive(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 8 }}
                />
              </div>

              <div style={metricBox}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Minimum rest hours</div>
                <div style={{ marginTop: 6, fontWeight: 950, fontSize: 18 }}>{minRestHours}h</div>
                <select style={{ ...select, marginTop: 8 }} value={minRestHours} onChange={(e) => setMinRestHours(Number(e.target.value))}>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={12}>12</option>
                </select>
              </div>

              <div style={metricBox}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Overtime tolerance</div>
                <div style={{ marginTop: 6, fontWeight: 950, fontSize: 18 }}>{overtimeTolerance}</div>
                <select
                  style={{ ...select, marginTop: 8 }}
                  value={overtimeTolerance}
                  onChange={(e) => setOvertimeTolerance(e.target.value as any)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>
          </div>

          {/* How it feeds optimisation */}
          <div style={card}>
            <div style={sectionTitle}>How this feeds optimisation</div>
            <div style={sub}>
              In the full product, these preferences become constraints for the optimiser — and the AI assistant can explain trade-offs.
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={metricBox}>
                <div style={{ fontWeight: 950 }}>Constraint builder</div>
                <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6 }}>
                  Preferences are converted into machine-readable constraints (availability, rest rules, skills).
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <span style={chip}>Availability constraints</span>
                  <span style={chip}>Skill coverage constraints</span>
                  <span style={chip}>Fatigue constraints</span>
                </div>
              </div>

              <div style={metricBox}>
                <div style={{ fontWeight: 950 }}>Optimisation engine</div>
                <div style={{ marginTop: 8, color: "var(--muted)", lineHeight: 1.6 }}>
                  The optimiser balances fairness, coverage, and overtime — then exports back to Excel.
                </div>

                <div style={{ marginTop: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, opacity: 0.9 }}>
                  Nurse Preferences → Constraints → Optimisation → Balanced Roster
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Impact preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={card}>
            <div style={sectionTitle}>Impact preview</div>
            <div style={sub}>A quick “what would change” snapshot (demo heuristic).</div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <Metric label="Fatigue risk" value={`${fatigueRisk}/100`} pct={fatigueRisk} />
              <Metric label="Fairness boost" value={`${fairnessBoost}/100`} pct={fairnessBoost} />
              <Metric label="Overtime probability" value={`${overtimeProb}%`} pct={overtimeProb} />
            </div>

            <div style={{ marginTop: 12, ...metricBox }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>What judges should notice</div>
              <div style={{ marginTop: 8, lineHeight: 1.6, color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                OptiNUM treats nurse wellbeing as a first-class constraint — not an afterthought — and the admin can still
                override via AI edits when reality changes.
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btnSecondary} onClick={() => showToast("Explained trade-offs (demo)")}>
                Explain trade-offs
              </button>
              <button style={btnPrimary} onClick={() => showToast("Sent constraints to optimiser (demo)")}>
                Send to optimiser
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(156,203,255,0.25)",
              background: "rgba(156,203,255,0.08)",
              borderRadius: 18,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 950 }}>Hackathon note</div>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
              For the live demo, optimisation + AI edits happen in <b>Admin Console</b>. This page demonstrates the
              human inputs OptiNUM is designed to support in production.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function Metric(props: { label: string; value: string; pct: number }) {
    return (
      <div style={metricBox}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 950 }}>{props.label}</div>
          <div style={{ fontWeight: 950, color: "var(--text)" }}>{props.value}</div>
        </div>
        <div style={barWrap}>
          <div style={bar(props.pct)} />
        </div>
      </div>
    );
  }
}