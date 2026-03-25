import { Routes, Route, Navigate } from "react-router-dom";
import { PageErrorBoundary } from "@jaldee/design-system";
import PatientList from "./pages/patients/PatientList";

export default function App() {
  return (
    <Routes>
      <Route
        path="patients"
        element={
          <PageErrorBoundary>
            <PatientList />
          </PageErrorBoundary>
        }
      />
      <Route path="*" element={<Navigate to="patients" replace />} />
    </Routes>
  );
}
