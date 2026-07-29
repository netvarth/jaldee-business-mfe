import { lazy, Suspense } from "react";

const FinanceModule = lazy(() => import("./FinanceModule"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading Finance...</div>}>
      <FinanceModule />
    </Suspense>
  );
}
