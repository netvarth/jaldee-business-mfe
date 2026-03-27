import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import ShellLayout from "./layout/ShellLayout";
import { HealthMFE } from "./mfes/HealthMFE";
import { BookingsMFE } from "./mfes/BookingsMFE";
import "./App.css";

function HomePage() {
  return (
    <div className="shell-home">
      <h2 className="shell-home-title">Home</h2>
      <p className="shell-home-copy">Welcome to Jaldee Business</p>
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
                <Route path="/home" element={<HomePage />} />
                <Route path="/health/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Health...</div>
                  }>
                    <div className="health-wrapper">
                      <HealthMFE />
                    </div>
                  </Suspense>
                } />
                <Route path="/bookings/*" element={
                  <Suspense fallback={
                    <div className="shell-loading">Loading Bookings...</div>
                  }>
                    <BookingsMFE />
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
