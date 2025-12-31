import React from "react";
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./hooks/useAuth";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import WaveformPage from "./pages/WaveformPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import "./App.css";

function App() {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login route - redirect to /projects if already authenticated */}
      <Route
        path="/login"
        element={user ? <Navigate to="/projects" replace /> : <LoginPage />}
      />

      {/* Home route - redirect based on auth status */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/projects" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* Projects page - main landing page for authenticated users */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />

      {/* Upload route - for creating new projects */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        }
      />

      {/* Protected waveform route */}
      <Route
        path="/waveform"
        element={
          <ProtectedRoute>
            <WaveformPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
