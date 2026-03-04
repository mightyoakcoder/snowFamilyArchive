import { createRoot } from "react-dom/client"
import { lazy, Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import 'bootstrap-icons/font/bootstrap-icons.css'
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"
import Navbar from "./components/Navbar.jsx"
import Footer from "./components/Footer.jsx"
import LoginPage from "./components/LoginPage.jsx"
import './index.css'

const SingleFileUploader = lazy(() => import("./components/SingleFileUploader.jsx"))
const MultiFileUploader  = lazy(() => import("./components/MultiFileUploader.jsx"))
const ImageGallery       = lazy(() => import("./components/ImageGallery.jsx"))

// Wraps any route that requires login.
// - Still loading Firebase state → show nothing (avoids flash of login page)
// - Not logged in → redirect to /login
// - Logged in → render the page
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function App() {
  const { user, loading } = useAuth()
  if (loading) return null

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/" element={
            <ProtectedRoute><SingleFileUploader /></ProtectedRoute>
          } />
          <Route path="/upload-multi" element={
            <ProtectedRoute><MultiFileUploader /></ProtectedRoute>
          } />
          <Route path="/gallery" element={
            <ProtectedRoute><ImageGallery /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {user && <Footer />}
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
