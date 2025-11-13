import AdminHeader from './components/AdminHeader'
import AdminFooter from './components/AdminFooter'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AdminHeader />
      <main className="container mx-auto p-6 flex-grow">
        {children}
      </main>
      <AdminFooter />
    </div>
  )
}
