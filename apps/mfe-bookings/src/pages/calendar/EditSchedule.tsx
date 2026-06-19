import { useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  FormSection,
  Input,
  PageHeader,
  Textarea,
} from "@jaldee/design-system";

export default function EditSchedule() {
  const navigate = useNavigate();

  return (
    <main data-testid="bookings-edit-schedule-page" className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Edit Schedule" subtitle="Update schedule dates, capacity, and booking channels." />
        <form
          data-testid="bookings-edit-schedule-form"
          className="mt-6 space-y-6 rounded-xl border border-slate-200 bg-white p-5 md:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(-1);
          }}
        >
          <FormSection title="Schedule details">
            <Input id="edit-schedule-name" data-testid="bookings-edit-schedule-name" label="Schedule name" required />
            <Input id="edit-schedule-start" data-testid="bookings-edit-schedule-start" type="date" label="Start date" required />
            <Input id="edit-schedule-end" data-testid="bookings-edit-schedule-end" type="date" label="End date" />
            <Textarea id="edit-schedule-desc" data-testid="bookings-edit-schedule-description" label="Description" className="md:col-span-2" />
            <Checkbox id="edit-schedule-qr" data-testid="bookings-edit-schedule-qr" label="Require QR code check-in" />
          </FormSection>
          <FormSection title="Slot configuration">
            <Input id="edit-schedule-duration" data-testid="bookings-edit-schedule-duration" type="number" min={5} defaultValue={30} label="Slot duration (minutes)" required />
            <Input id="edit-schedule-capacity" data-testid="bookings-edit-schedule-capacity" type="number" min={1} defaultValue={5} label="Default capacity" required />
          </FormSection>
          <FormSection title="Booking channels">
            <Checkbox id="edit-schedule-channel-online" data-testid="bookings-edit-schedule-channel-online" label="Online" defaultChecked />
            <Checkbox id="edit-schedule-channel-walkin" data-testid="bookings-edit-schedule-channel-walkin" label="Walk-in" />
            <Checkbox id="edit-schedule-channel-phonein" data-testid="bookings-edit-schedule-channel-phonein" label="Phone-in" />
          </FormSection>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>Discard Changes</Button>
            <Button type="submit">Save Schedule</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
