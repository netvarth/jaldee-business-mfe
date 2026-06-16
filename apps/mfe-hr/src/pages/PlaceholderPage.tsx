export default function PlaceholderPage({
  title,
  note,
}: {
  title: string;
  note?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          {note ?? "This HR screen is being ported from the standalone suite."}
        </p>
      </div>
    </div>
  );
}
