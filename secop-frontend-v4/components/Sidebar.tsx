"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileSearch,
  ScrollText,
  Activity,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/processes", label: "Procesos", icon: FileSearch },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 20px 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "var(--accent)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={16} color="white" />
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 15,
              color: "var(--text-primary)",
              letterSpacing: "-0.3px",
            }}
          >
            SECOP II
          </span>
        </div>
        <p
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}
        >
          OC Consultores v3.0
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 6,
                marginBottom: 2,
                background: active ? "var(--bg-elevated)" : "transparent",
                color: active ? "var(--accent-bright)" : "var(--text-secondary)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Status indicator */}
      <div
        style={{
          margin: "0 12px",
          padding: "12px",
          background: "var(--bg-elevated)",
          borderRadius: 6,
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <Zap size={11} color="var(--green)" />
          <span
            style={{
              fontSize: 10,
              color: "var(--green)",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
            }}
          >
            SISTEMA ACTIVO
          </span>
        </div>
        <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
          Monitoreo diario 8:00 AM
        </p>
      </div>
    </aside>
  )
}
