export default function Home() {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        paddingTop: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>MedHack Rostering</h1>
        <p style={{ opacity: 0.8, marginTop: 8 }}>
          A hackathon demo for optimizing nurse rosters + AI-assisted edits +
          export.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {[
          { title: "Upload", desc: "Drop an Excel roster and preview it." },
          { title: "Optimize", desc: "Run optimization + compare metrics." },
          { title: "AI Edit", desc: "Ask the assistant to swap/replace staff." },
        ].map((c) => (
          <div
            key={c.title}
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{c.title}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ fontWeight: 800 }}>Next</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Go to <b>Admin Console</b> in the sidebar to run the demo end-to-end.
        </div>
      </div>
    </div>
  );
}