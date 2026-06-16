interface PlaceholderPageProps {
  title: string;
  note?: string;
}

/**
 * Stub for booking-domain screens not yet ported from the vanilla app
 * (customers, services, staff, settings, dashboard analytics). Keeps routing +
 * navigation complete so the structure is reviewable; fill these in subsequent
 * porting passes.
 */
export default function PlaceholderPage({ title, note }: PlaceholderPageProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-2xl font-black">
          {title.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {note ?? "This screen is scaffolded and pending port from the legacy booking UI."}
        </p>
      </div>
    </div>
  );
}
