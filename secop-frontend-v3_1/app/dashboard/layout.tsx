import Sidebar from "@/components/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: 220,
          flex: 1,
          minHeight: "100vh",
          padding: "32px 36px",
          maxWidth: "calc(100vw - 220px)",
        }}
      >
        {children}
      </main>
    </div>
  )
}
