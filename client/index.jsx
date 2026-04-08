import { createRoot } from "react-dom/client"
import { lazy, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom"
import 'bootstrap-icons/font/bootstrap-icons.css'
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"
import Navbar from "./components/Navbar.jsx"
import Footer from "./components/Footer.jsx"
import LoginPage from "./components/LoginPage.jsx"
import { DesktopSidebar, MobilePillBar } from "./components/Sidebar.jsx"
import './index.css'

const SingleFileUploader = lazy(() => import("./components/SingleFileUploader.jsx"))
const MultiFileUploader  = lazy(() => import("./components/MultiFileUploader.jsx"))
const ImageGallery       = lazy(() => import("./components/ImageGallery.jsx"))
const AuditLog           = lazy(() => import("./components/AuditLog.jsx"))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  if (user.email !== "mightyoakcoder@gmail.com") return <Navigate to="/" replace />
  return children
}

// Gallery reads family/album from URL params
function GalleryPage() {
  const [searchParams] = useSearchParams()
  const family  = searchParams.get("family")  || null
  const albumId = searchParams.get("album_id") || null
  return <ImageGallery familyFilter={family} albumId={albumId} embedded />
}

const SHELL_STYLES = `
  .app-shell {
    display: flex;
    height: calc(100vh - 56px);
    overflow: hidden;
  }
  .app-main {
    flex: 1;
    overflow-y: auto;
    min-width: 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2d38 transparent;
  }
`

function App() {
  const { user, loading } = useAuth()
  if (loading) return null

  return (
    <BrowserRouter>
      <style>{SHELL_STYLES}</style>
      <Navbar />
      <div className="app-shell">
        <DesktopSidebar />
        <main className="app-main">
          <MobilePillBar />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/login" element={
                user ? <Navigate to="/" replace /> : <LoginPage />
              } />
              <Route path="/"       element={<GalleryPage />} />
              <Route path="/gallery" element={<Navigate to="/" replace />} />
              <Route path="/upload" element={
                <ProtectedRoute><SingleFileUploader /></ProtectedRoute>
              } />
              <Route path="/upload-multi" element={
                <ProtectedRoute><MultiFileUploader /></ProtectedRoute>
              } />
              <Route path="/admin/audit" element={
                <AdminRoute><AuditLog /></AdminRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          {user && <Footer />}
        </main>
      </div>
    </BrowserRouter>
  )
}

const queryClient = new QueryClient()

const root = createRoot(document.getElementById("root"))
root.render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
)
