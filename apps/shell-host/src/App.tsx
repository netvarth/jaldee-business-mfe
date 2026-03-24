import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense }                from "react";
import LoginPage                   from "./pages/LoginPage";
import ProtectedRoute              from "./auth/ProtectedRoute";
import ShellLayout                 from "./layout/ShellLayout";
import { HealthMFE }               from "./mfes/HealthMFE";

function HomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h2 style={{ margin: 0, color: "#1E1B4B" }}>Home</h2>
      <p style={{ color: "#6B7280" }}>Welcome to Jaldee Business</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Routes>
                <Route path="/home"     element={<HomePage />} />
                <Route path="/health/*" element={
                  <Suspense fallback={
                    <div style={{ padding: "32px", color: "#6B7280" }}>
                      Loading Health...
                    </div>
                  }>
                    <HealthMFE />
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </ShellLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}