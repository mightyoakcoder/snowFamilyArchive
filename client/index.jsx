import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import 'bootstrap-icons/font/bootstrap-icons.css'
import { AuthProvider, useAuth } from "./context/AuthContext.jsx"
import Navbar from "./components/Navbar.jsx"
import Footer from "./components/Footer.jsx"
import LoginPage from "./components/LoginPage.jsx"
import SingleFileUploader from "./components/SingleFileUploader.jsx"
import ImageGallery from "./components/ImageGallery.jsx"
import './index.css'

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
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/" element={
          <ProtectedRoute><SingleFileUploader /></ProtectedRoute>
        } />
        <Route path="/gallery" element={
          <ProtectedRoute><ImageGallery /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <Footer />}
    </BrowserRouter>
  )
}

const root = createRoot(document.getElementById("root"))
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
