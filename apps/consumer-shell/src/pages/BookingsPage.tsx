export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-[24px] border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-semibold">Bookings</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This route is intentionally separate from the business shell. Wire consumer booking APIs here through the consumer service.
        </p>
      </div>
    </div>
  );
}
