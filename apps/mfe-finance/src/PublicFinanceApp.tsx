import { Navigate, Route, Routes } from "react-router-dom";
import PublicPayPage from "./pages/PublicPayPage";

export default function PublicFinanceApp() {
  return (
    <Routes>
      <Route path=":paymentLink" element={<PublicPayPage />} />
      <Route path="" element={<Navigate to="invalid-link" replace />} />
      <Route path="invalid-link" element={<PublicPayPage />} />
      <Route path="*" element={<Navigate to="invalid-link" replace />} />
    </Routes>
  );
}
