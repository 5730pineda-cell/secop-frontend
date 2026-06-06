import { api } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExternalLink, CheckCircle2, XCircle, HelpCircle } from "lucide-react"
import ProcessesFilters from "./ProcessesFilters"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    cliente_id?: string
    departamento?: string
  }>
}

export default async function ProcessesPage({ searchParams }: Props) {
  const params = await searchParams
  let processes: import("@/types").Proceso[] = []
  let clients = []

  try {
    ;[processes, clients] = await Promise.all([
      api.processes({
        cliente_id: params.cliente_id,
        departamento: params.departamento,
        limit: 200,
      }),
      api.clients(),
    ])
  } catch {
    // offline
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          Procesos SECOP II
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {processes.length} proceso{processes.length !== 1 ? "s" : ""} encontrado{processes.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ProcessesFilters clients={clients} />

      <div className="surface" style={{ overflow: "auto", marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-bright)",
                background: "var(--bg-elevated)",
              }}
            >
              {["Entidad", "Referencia", "Depto.", "Modalidad", "Objeto", "Presupuesto", "IA", "Fecha oferta", ""].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {processes.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: i % 2 === 0 ? "transparent" : "var(--bg-elevated)18",
                }}
              >
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    maxWidth: 160,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.entidad ?? "—"}
                  </div>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-bright)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.referencia}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.departamento ?? "—"}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    maxWidth: 120,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.modalidad ?? "—"}
                  </div>
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    maxWidth: 260,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.objeto ?? ""}
                  >
                    {p.objeto ?? "—"}
                  </div>
                  {p.razon_ia && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}
                    >
                      IA: {p.razon_ia}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--green)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {p.presupuesto ? formatCurrency(p.presupuesto) : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {p.resultado_ia === true ? (
                    <CheckCircle2 size={14} color="var(--green)" />
                  ) : p.resultado_ia === false ? (
                    <XCircle size={14} color="var(--red)" />
                  ) : (
                    <HelpCircle size={14} color="var(--text-muted)" />
                  )}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 11,
                    color: "var(--amber)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(p.fecha_oferta)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)", display: "inline-flex" }}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {processes.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  No hay procesos registrados aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
