import { Routes, Route, Navigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import PatientList from "./pages/patients/PatientList";

export default function App() {
  const { basePath } = useMFEProps();

  return (
    <Routes>
      <Route path="patients" element={<PatientList />} />
      <Route path="*" element={<Navigate to="patients" replace />} />
    </Routes>
  );
}