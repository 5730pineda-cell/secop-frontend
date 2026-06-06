import { api } from "@/lib/api"
import { formatDateTime, formatDuration } from "@/lib/utils"
import { CheckCircle2, AlertTriangle, Clock, Download, Database } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LogsPage() {
  let logs = []
  try {
    logs = await api.logs(30)
  } catch {
    // offline
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          Logs de ejecución
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          Historial de {logs.length} ejecuciones
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logs.map((log) => (
          <div
            key={log.id}
            className="surface"
            style={{ padding: "16px 20px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {log.errores.length > 0 ? (
                  <AlertTriangle size={14} color="var(--amber)" />
                ) : (
                  <CheckCircle2 size={14} color="var(--green)" />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                >
                  {formatDateTime(log.fecha)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={11} color="var(--text-muted)" />
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {formatDuration(log.duracion_segundos)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <Metric icon={Download} label="Descargados" value={log.procesos_descargados} color="var(--accent)" />
              <Metric icon={CheckCircle2} label="Filtrados" value={log.procesos_filtrados} color="var(--accent-bright)" />
              <Metric icon={CheckCircle2} label="Aprobados IA" value={log.procesos_aprobados_ia} color="var(--amber)" />
              <Metric icon={Database} label="Guardados" value={log.procesos_guardados} color="var(--green)" />
              {log.errores.length > 0 && (
                <Metric icon={AlertTriangle} label="Errores" value={log.errores.length} color="var(--red)" />
              )}
            </div>

            {log.errores.length > 0 && (
              <div style={{ marginTop: 12, padding: "8px 10px", background: "var(--red-dim)22", borderRadius: 5, borderLeft: "2px solid var(--red)" }}>
                {log.errores.map((e, i) => (
                  <p key={i} style={{ fontSize: 11, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <div
            className="surface"
            style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}
          >
            No hay ejecuciones registradas aún
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Download
  label: string
  value: number
  color: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={12} color={color} />
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}:</span>
      <span style={{ fontSize: 12, color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
        {value.toLocaleString("es-CO")}
      </span>
    </div>
  )
}
