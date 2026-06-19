import { useLocation, useNavigate } from "react-router-dom";
import { Button, FormSection, Input, PageHeader, Textarea } from "@jaldee/design-system";
import type { Calendar } from "../../types";

export default function EditCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const calendar = (location.state as { calendar?: Calendar } | null)?.calendar;

  return (
    <main data-testid="bookings-edit-calendar-page" className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Edit Calendar" subtitle="Update the calendar name and description." />
        <form
          data-testid="bookings-edit-calendar-form"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(-1);
          }}
        >
          <FormSection title="Calendar details">
            <Input id="edit-calendar-name" data-testid="bookings-edit-calendar-name" label="Calendar name" required defaultValue={calendar?.name ?? ""} />
            <Textarea id="edit-calendar-desc" data-testid="bookings-edit-calendar-description" label="Calendar description" defaultValue={calendar?.description ?? ""} className="md:col-span-2" />
          </FormSection>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>Discard</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
