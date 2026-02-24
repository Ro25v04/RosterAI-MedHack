import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const accent = "#8CC9FF";
  const accent2 = "#5FB4FF";

  const card = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
  } as const;

  const soft = {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
  } as const;

  const pill = {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    opacity: 0.95,
  } as const;

  const primaryBtn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 800,
    textDecoration: "none",
    color: "#06111F",
    background: `linear-gradient(135deg, ${accent}, ${accent2})`,
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  } as const;

  const secondaryBtn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 750,
    textDecoration: "none",
    color: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.03)",
  } as const;

  const stat = (label: string, value: string) => (
    <div style={{ ...soft, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingTop: 8, paddingBottom: 28 }}>
      {/* HERO */}
      <section style={{ ...card, padding: 22, position: "relative", overflow: "hidden" }}>
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            inset: -200,
            background:
              "radial-gradient(circle at 25% 20%, rgba(140,201,255,0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(95,180,255,0.12), transparent 45%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={pill}>Healthcare rostering • Hackathon demo</span>
              <span style={{ ...pill, borderColor: "rgba(140,201,255,0.18)", opacity: 0.9 }}>
                OptiNUM
              </span>
            </div>

            <span style={{ ...pill, borderColor: "rgba(140,201,255,0.25)" }}>
              Live: Optimise + AI edits + export
            </span>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 18, gridTemplateColumns: "1.2fr 0.8fr" }}>
            {/* Left: headline */}
            <div>
              <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.05, letterSpacing: -0.6 }}>
                Smarter nurse rostering.
                <span style={{ color: accent }}> Less overtime.</span>
                <span style={{ color: accent }}> Less burnout.</span>
              </h1>

              <p style={{ marginTop: 12, marginBottom: 0, fontSize: 16, lineHeight: 1.7, opacity: 0.82 }}>
                OptiNUM helps hospitals build fair rosters with optimisation + skill-based matching, then lets managers
                refine schedules with AI-assisted edits — and export straight back to Excel.
              </p>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/admin" style={primaryBtn}>
                  Run demo in Admin Console →
                </Link>
                <Link href="/nurse" style={secondaryBtn}>
                  Open Nurse Preferences
                </Link>
                <a href="#how" style={secondaryBtn}>
                  See how it works ↓
                </a>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", opacity: 0.9 }}>
                <span style={pill}>✓ Overtime-aware optimisation</span>
                <span style={pill}>✓ Skill/coverage matching</span>
                <span style={pill}>✓ AI swap & re-balance</span>
                <span style={pill}>✓ Export-ready Excel</span>
              </div>
            </div>

            {/* Right: value props */}
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ ...soft, padding: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>Why hospitals care</div>
                <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>
                  Manual rostering is slow, inconsistent, and leads to overtime spikes and fatigue risk. OptiNUM makes it
                  faster to create balanced rosters with clear trade-offs.
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                {stat("Focus", "Fair + safe staffing")}
                {stat("Output", "Excel-ready roster")}
                {stat("Edits", "AI-assisted changes")}
                {stat("Goal", "Reduce burnout risk")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {[
          {
            title: "Optimise rosters",
            desc: "Generate fair schedules while reducing overtime hotspots and improving workload balance.",
          },
          {
            title: "Skill-based matching",
            desc: "Align nurses to shifts based on skill requirements to improve coverage and patient safety.",
          },
          {
            title: "AI-assisted edits",
            desc: "Ask for swaps, replacements, or quick re-balancing in plain English — then export.",
          },
        ].map((f) => (
          <div key={f.title} style={{ ...card, padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{f.title}</div>
            <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ marginTop: 14, ...card, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>How it works</div>
            <div style={{ marginTop: 6, opacity: 0.78 }}>
              A simple workflow designed for nurse unit managers.
            </div>
          </div>
          <Link href="/admin" style={secondaryBtn}>
            Start the workflow in Admin →
          </Link>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {[
            { step: "1", title: "Upload", desc: "Drop an Excel roster and preview." },
            { step: "2", title: "Optimise", desc: "Run optimisation + compare metrics." },
            { step: "3", title: "AI Edit", desc: "Swap/replace staff, handle changes." },
            { step: "4", title: "Export", desc: "Download an updated roster." },
          ].map((s) => (
            <div key={s.step} style={{ ...soft, padding: 14 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  color: "#06111F",
                  background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                  fontWeight: 950,
                }}
              >
                {s.step}
              </div>
              <div style={{ marginTop: 10, fontWeight: 900 }}>{s.title}</div>
              <div style={{ marginTop: 6, opacity: 0.8, lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ marginTop: 14, ...card, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Ready to see the demo?</div>
            <div style={{ marginTop: 6, opacity: 0.78 }}>
              Run an end-to-end example in the Admin Console, then export the roster.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin" style={primaryBtn}>
              Open Admin Console →
            </Link>
            <Link href="/nurse" style={secondaryBtn}>
              Nurse Preferences
            </Link>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12, textAlign: "center" }}>
        OptiNUM • Built for healthcare rostering • Hackathon prototype
      </div>
    </div>
  );
}