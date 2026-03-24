import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import PatientList from "./pages/patients/PatientList";

export default function App() {
  const { basePath } = useMFEProps();

  return (
    <BrowserRouter>
      <Routes>
        <Route path={`${basePath}/patients`} element={<PatientList />} />
        <Route path={`${basePath}/*`} element={<Navigate to={`${basePath}/patients`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}