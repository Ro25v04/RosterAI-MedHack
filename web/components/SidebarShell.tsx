"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Theme
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

  const SIDEBAR_W_EXPANDED = 300;
  const SIDEBAR_W_COLLAPSED = 96;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED,
            transition: "width 180ms ease",
            borderRight: `1px solid ${theme.border}`,
            background: theme.panel,
            padding: 14,
            position: "relative",
          }}
        >
          {/* Edge toggle (centered vertically like a drawer handle) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              position: "absolute",
              top: "50%",
              right: -18,
              transform: "translateY(-50%)",
              width: 36,
              height: 56,
              borderRadius: 14,
              border: `1px solid ${theme.borderStrong}`,
              background: theme.panel2,
              color: theme.text,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: theme.shadow,
              zIndex: 50,
              userSelect: "none",
              backdropFilter: "blur(10px)",
            }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>

          {/* Brand block (taller + bigger logo) */}
          <div
            style={{
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              paddingLeft: collapsed ? 0 : 8,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                position: "relative",
                width: collapsed ? 64 : 240,
                height: collapsed ? 64 : 72,
                transform: collapsed ? "scale(1.15)" : "scale(1.25)",
                transformOrigin: collapsed ? "center" : "left center",
              }}
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
          <nav style={{ display: "grid", gap: 10 }}>
            {nav.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    height: 54,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 12,
                    padding: collapsed ? "0" : "0 12px",
                    borderRadius: 16,
                    textDecoration: "none",
                    color: theme.text,
                    background: active ? "rgba(140,201,255,0.10)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? "rgba(140,201,255,0.22)" : theme.border}`,
                    boxShadow: active ? "0 10px 26px rgba(0,0,0,0.26)" : "none",
                  }}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(140,201,255,0.25)" : theme.border}`,
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
              bottom: 14,
              left: 14,
              right: 14,
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
                  borderRadius: 16,
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
              justifyContent: "flex-start",
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
          </div>

          <div style={{ padding: 22 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}