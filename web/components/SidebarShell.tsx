"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

// --- Simple inline icons (no deps) ---
function IconHome(props: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={props.active ? 1 : 0.9}
      />
    </svg>
  );
}
function IconAdmin(props: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={props.active ? 1 : 0.9}
      />
      <path
        d="M9.5 12.2l1.7 1.7 3.3-3.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={props.active ? 1 : 0.9}
      />
    </svg>
  );
}
function IconNurse(props: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={props.active ? 1 : 0.9}
      />
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity={props.active ? 1 : 0.9}
      />
      <path
        d="M12 3v4M10 5h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={props.active ? 1 : 0.9}
      />
    </svg>
  );
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Theme (match your logo: soft blue accent, clean dark background)
  const theme = useMemo(
    () => ({
      bg: "#0B0F14",
      panel: "rgba(255,255,255,0.04)",
      panel2: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.08)",
      borderStrong: "rgba(255,255,255,0.12)",
      text: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.68)",
      accent: "#8CC9FF",
      accent2: "#5FB4FF",
      shadow: "0 12px 35px rgba(0,0,0,0.35)",
    }),
    []
  );

  const nav: NavItem[] = useMemo(() => {
    const isHome = pathname === "/";
    const isAdmin = pathname === "/admin";
    const isNurse = pathname === "/nurse";
    return [
      { href: "/", label: "Home", icon: <IconHome active={isHome} /> },
      { href: "/admin", label: "Admin Console", icon: <IconAdmin active={isAdmin} /> },
      { href: "/nurse", label: "Nurse Preferences", icon: <IconNurse active={isNurse} /> },
    ];
  }, [pathname]);

  const title =
    pathname === "/"
      ? "Home"
      : pathname === "/admin"
        ? "Admin Console"
        : pathname === "/nurse"
          ? "Nurse Preferences"
          : "OptiNUM";

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: collapsed ? 92 : 360,
            transition: "width 180ms ease",
            borderRight: `1px solid ${theme.border}`,
            background: theme.panel,
            padding: 16,
            position: "relative",
          }}
        >
          {/* Floating toggle (always reachable) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{
              position: "absolute",
              top: 24,
              right: -14,
              width: 28,
              height: 28,
              borderRadius: 999,
              border: `1px solid ${theme.borderStrong}`,
              background: theme.panel2,
              color: theme.text,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: theme.shadow,
              zIndex: 20,
              userSelect: "none",
            }}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            {collapsed ? "→" : "←"}
          </button>

          {/* Brand (full logo expanded, mascot collapsed) */}
          <div style={{ display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
            <div
              style={{
                width: collapsed ? 56 : 200,
                height: collapsed ? 56 : 70,
                position: "relative",
                flex: "0 0 auto",
                transition: "all 180ms ease",
                filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.25))",
                marginTop: 6,
              }}
              title="OptiNUM"
            >
              <Image
                src={collapsed ? "/logo-mascot.png" : "/logo-new.png"}
                alt="OptiNUM"
                fill
                priority
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>

          {/* Nav */}
          <nav style={{ marginTop: 18, display: "grid", gap: 8 }}>
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 10,
                    padding: collapsed ? "14px 0" : "10px 12px",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: theme.text,
                    background: active ? theme.panel2 : "transparent",
                    border: `1px solid ${active ? theme.borderStrong : theme.border}`,
                    boxShadow: active ? "0 8px 22px rgba(0,0,0,0.25)" : "none",
                  }}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      display: "grid",
                      placeItems: "center",
                      color: active ? theme.accent : theme.text,
                    }}
                  >
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <span style={{ fontWeight: 650, letterSpacing: 0.1 }}>{item.label}</span>
                  )}

                  {!collapsed && active && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: theme.accent,
                        boxShadow: `0 0 0 4px rgba(140,201,255,0.12)`,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
              color: theme.muted,
              fontSize: 12,
              display: "flex",
              justifyContent: collapsed ? "center" : "stretch",
            }}
          >
            {!collapsed ? (
              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 14,
                  padding: 12,
                  width: "100%",
                }}
              >
                <div style={{ fontWeight: 700, color: theme.text, marginBottom: 6 }}>
                  Quick flow
                </div>
                Upload → Optimise → AI Edit → Export
              </div>
            ) : (
              "⏱"
            )}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1 }}>
          {/* Top bar */}
          <div
            style={{
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 18px",
              borderBottom: `1px solid ${theme.border}`,
              background: theme.panel,
              position: "sticky",
              top: 0,
              zIndex: 10,
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>{title}</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 12,
                  padding: "7px 12px",
                  border: `1px solid ${theme.borderStrong}`,
                  borderRadius: 999,
                  color: theme.text,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                Local Demo
              </span>
              <span
                style={{
                  fontSize: 12,
                  padding: "7px 12px",
                  borderRadius: 999,
                  color: "#06111F",
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})`,
                  fontWeight: 800,
                }}
              >
                Ready
              </span>
            </div>
          </div>

          <div style={{ padding: 22 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}