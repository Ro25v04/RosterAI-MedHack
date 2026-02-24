"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon?: string };

const nav: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/admin", label: "Admin Console", icon: "🛠️" },
  { href: "/nurse", label: "Nurse Preferences", icon: "🩺" },
];

export default function SidebarShell({
  children,
  brand = "MedHack Rostering",
}: {
  children: React.ReactNode;
  brand?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: collapsed ? 72 : 260,
            transition: "width 180ms ease",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            padding: 16,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Replace with your logo later */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              M
            </div>

            {!collapsed && (
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontWeight: 800 }}>{brand}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Hackathon Demo</div>
              </div>
            )}

            <button
              onClick={() => setCollapsed((v) => !v)}
              style={{
                marginLeft: "auto",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
              }}
              title="Toggle sidebar"
            >
              {collapsed ? "➡️" : "⬅️"}
            </button>
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
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "white",
                    background: active
                      ? "rgba(255,255,255,0.10)"
                      : "transparent",
                    border: active
                      ? "1px solid rgba(255,255,255,0.14)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span style={{ width: 22, textAlign: "center" }}>
                    {item.icon ?? "•"}
                  </span>
                  {!collapsed && (
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
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
              opacity: 0.7,
              fontSize: 12,
            }}
          >
            {!collapsed ? "Upload → Optimize → Edit via AI → Export" : "⏱️"}
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1 }}>
          {/* Top bar */}
          <div
            style={{
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 18px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {pathname === "/"
                ? "Home"
                : pathname === "/admin"
                ? "Admin Console"
                : pathname === "/nurse"
                ? "Nurse Preferences"
                : "MedHack"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  opacity: 0.9,
                }}
              >
                Local Demo
              </span>
            </div>
          </div>

          <div style={{ padding: 18 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}