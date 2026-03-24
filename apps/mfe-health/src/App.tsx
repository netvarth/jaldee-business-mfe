import { Routes, Route, Navigate } from "react-router-dom";
import PatientList from "./pages/patients/PatientList";

export default function App() {
  return (
    <Routes>
      <Route path="patients" element={<PatientList />} />
      <Route path="*" element={<Navigate to="patients" replace />} />
    </Routes>
  );
}
