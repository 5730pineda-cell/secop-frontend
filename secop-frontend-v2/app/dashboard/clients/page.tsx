import { api } from "@/lib/api"
import { Users, CheckCircle2, XCircle, BrainCircuit, MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  let clients: import("@/types").Cliente[] = []
  try {
    clients = await api.clients()
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
          Clientes
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {clients.length} cliente{clients.length !== 1 ? "s" : ""} configurado{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {clients.map((c) => (
          <div
            key={c.id}
            className="surface"
            style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--accent)",
                    letterSpacing: "1px",
                    marginBottom: 4,
                  }}
                >
                  {c.id}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--text-primary)",
                  }}
                >
                  {c.nombre}
                </h3>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {c.activo ? (
                  <CheckCircle2 size={15} color="var(--green)" />
                ) : (
                  <XCircle size={15} color="var(--red)" />
                )}
                {c.usar_ia && <BrainCircuit size={14} color="var(--amber)" />}
              </div>
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {c.descripcion_negocio}
            </p>

            {/* Departments */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 6,
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <MapPin size={10} />
                Departamentos ({c.departamentos.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {c.departamentos.slice(0, 6).map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      background: "var(--bg-elevated)",
                      borderRadius: 3,
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {d}
                  </span>
                ))}
                {c.departamentos.length > 6 && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      background: "var(--border)",
                      borderRadius: 3,
                      color: "var(--text-muted)",
                    }}
                  >
                    +{c.departamentos.length - 6}
                  </span>
                )}
              </div>
            </div>

            {/* Budget */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Presupuesto mínimo
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--green)",
                }}
              >
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                }).format(c.presupuesto_minimo)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
