export default function NursePreferencesPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Nurse Preferences (Placeholder)</h1>
      <p style={{ opacity: 0.8 }}>
        This section is a hackathon placeholder. In a full product, nurses would
        set:
      </p>
      <ul style={{ opacity: 0.85, lineHeight: 1.7 }}>
        <li>Preferred shifts (AM/PM/NIGHT)</li>
        <li>Unavailable dates</li>
        <li>Max consecutive shifts / fatigue limits</li>
        <li>Skill/specialization preferences</li>
      </ul>

      <div
        style={{
          marginTop: 14,
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ fontWeight: 800 }}>Hackathon note</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          For the demo, optimization + AI edits happen in <b>Admin Console</b>.
        </div>
      </div>
    </div>
  );
}