import { Outlet, ScrollRestoration } from 'react-router'
import { Toaster } from 'sonner'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import AuthProvider from '../context/AuthProvider'

export default function MainLayout() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-cream text-ink">
        <Navbar />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toaster position="top-center" richColors closeButton />
        <ScrollRestoration />
      </div>
    </AuthProvider>
  )
}
