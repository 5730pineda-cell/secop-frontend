import { api } from "@/lib/api"
import { formatDate, formatDateTime, formatDuration } from "@/lib/utils"
import StatCard from "@/components/StatCard"
import {
  Download,
  Filter,
  BrainCircuit,
  Database,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react"
import RunButton from "./RunButton"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  let metrics: import("@/types").Metrics | null = null
  let logs: import("@/types").Ejecucion[] | null = null

  try {
    ;[metrics, logs] = await Promise.all([api.metrics(), api.logs(5)])
  } catch {
    // Backend might be offline
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
              marginBottom: 4,
            }}
          >
            Resumen del sistema
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Monitoreo automático de procesos SECOP II con evaluación IA
          </p>
        </div>
        <RunButton />
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Procesos hoy"
          value={metrics?.procesos_hoy ?? "—"}
          icon={Download}
          color="var(--accent)"
          sub="Descargados y filtrados"
        />
        <StatCard
          label="Total en BD"
          value={metrics?.total_procesos ?? "—"}
          icon={Database}
          color="var(--green)"
          sub="Todos los procesos guardados"
        />
        <StatCard
          label="Aprobados IA"
          value={metrics?.procesos_aprobados_ia ?? "—"}
          icon={BrainCircuit}
          color="var(--amber)"
          sub="Evaluados como relevantes"
        />
        <StatCard
          label="Clientes activos"
          value={metrics?.total_clientes_activos ?? "—"}
          icon={Users}
          color="var(--accent-bright)"
          sub="Con monitoreo activo"
        />
      </div>

      {/* Last execution info + logs table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Última ejecución */}
        <div className="surface" style={{ padding: 20 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-primary)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={14} color="var(--accent)" />
            Última ejecución
          </h2>
          {metrics?.ultima_ejecucion ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Fecha" value={formatDateTime(metrics.ultima_ejecucion)} />
              <Row
                label="Duración"
                value={formatDuration(metrics.duracion_ultima_ejecucion)}
              />
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Sin ejecuciones registradas
            </p>
          )}
        </div>

        {/* Recent logs */}
        <div className="surface" style={{ padding: 20 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-primary)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} color="var(--amber)" />
            Ejecuciones recientes
          </h2>
          {logs && logs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: "var(--bg-elevated)",
                    borderRadius: 5,
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {formatDate(log.fecha)}
                  </span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "var(--green)" }}>
                      ↓ {log.procesos_descargados.toLocaleString("es-CO")}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>
                      ✓ {log.procesos_guardados}
                    </span>
                    {log.errores.length > 0 && (
                      <span style={{ fontSize: 11, color: "var(--red)" }}>
                        ✕ {log.errores.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Sin ejecuciones registradas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
        {value}
      </span>
    </div>
  )
}
