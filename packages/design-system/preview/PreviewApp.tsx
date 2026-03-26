import { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  BulkActionBar,
  Button,
  Checkbox,
  Combobox,
  ComponentErrorBoundary,
  ConfirmDialog,
  DataTable,
  DataTableToolbar,
  DatePicker,
  DateRangePicker,
  DescriptionList,
  Dialog,
  DialogFooter,
  Divider,
  Drawer,
  EmptyState,
  ErrorState,
  FileUpload,
  FormSection,
  Input,
  KanbanBoard,
  LiveQueue,
  PageErrorBoundary,
  PageHeader,
  Popover,
  PopoverSection,
  RadioGroup,
  SectionCard,
  Select,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  StatCard,
  Switch,
  Tabs,
  Textarea,
  TimePicker,
  Timeline,
  Tooltip,
  VitalsChart,
} from "../src";
import type {
  ColumnDef,
  DescriptionItem,
  KanbanColumn,
  KanbanItem,
  LiveQueueItem,
  TimelineEvent,
  VitalPoint,
} from "../src";

type PatientRow = {
  id: string;
  name: string;
  doctor: string;
  status: string;
  due: string;
};

type BoardCard = KanbanItem & {
  title: string;
  owner: string;
  priority: string;
};

const tableRows: PatientRow[] = [
  { id: "P-1042", name: "Anita Rao", doctor: "Dr. Menon", status: "Active", due: "Today" },
  { id: "P-1047", name: "Ravi Das", doctor: "Dr. Joseph", status: "Queued", due: "11:30 AM" },
  { id: "P-1053", name: "Mina Paul", doctor: "Dr. Suma", status: "Review", due: "Tomorrow" },
  { id: "P-1061", name: "Niya Thomas", doctor: "Dr. Menon", status: "Active", due: "2:15 PM" },
  { id: "P-1068", name: "Akhil Nair", doctor: "Dr. Suma", status: "Queued", due: "4:00 PM" },
];

const timelineEvents: TimelineEvent[] = [
  { date: "09:15", title: "Patient registered", description: "Front desk completed intake.", variant: "info" },
  { date: "09:40", title: "Vitals captured", description: "BP and pulse logged into chart.", variant: "success" },
  { date: "10:05", title: "Lab pending", description: "CBC sample sent to lab queue.", variant: "warning" },
];

const detailItems: DescriptionItem[] = [
  { label: "Branch", value: "Thrissur" },
  { label: "Product Scope", value: "Health" },
  { label: "Owner", value: "Frontend Architecture Team" },
  { label: "Release Channel", value: "Preview" },
];

const kanbanColumns: KanbanColumn[] = [
  { id: "todo", label: "To do" },
  { id: "progress", label: "In progress" },
  { id: "done", label: "Done" },
];

const initialBoardItems: BoardCard[] = [
  { id: "task-1", columnId: "todo", title: "Patient list filters", owner: "Asha", priority: "High" },
  { id: "task-2", columnId: "progress", title: "Queue states", owner: "Nikhil", priority: "Medium" },
  { id: "task-3", columnId: "done", title: "Error boundaries", owner: "Niya", priority: "Done" },
];

const liveQueueItems: LiveQueueItem[] = [
  { id: "q-1", token: "A012", name: "Anita Rao", status: "in-progress", subtitle: "Dr. Menon", eta: "Now" },
  { id: "q-2", token: "A013", name: "Ravi Das", status: "critical", subtitle: "Triage override", eta: "2 min" },
  { id: "q-3", token: "A014", name: "Mina Paul", status: "waiting", subtitle: "General consult", eta: "9 min" },
];

const vitalsSeries: VitalPoint[] = [
  { label: "09:00", value: 96, timestamp: "09:00" },
  { label: "10:00", value: 98, timestamp: "10:00" },
  { label: "11:00", value: 101, timestamp: "11:00" },
  { label: "12:00", value: 99, timestamp: "12:00" },
  { label: "13:00", value: 103, timestamp: "13:00" },
];

function PreviewGalleryCrash({ enabled }: { enabled: boolean }) {
  if (enabled) {
    throw new Error("Preview page crash test");
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Page content is healthy.
    </div>
  );
}

function PreviewWidgetCrash({ enabled }: { enabled: boolean }) {
  if (enabled) {
    throw new Error("Preview component crash test");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      Widget content is healthy.
    </div>
  );
}

export default function PreviewApp() {
  const [tab, setTab] = useState("overview");
  const [notify, setNotify] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageCrash, setPageCrash] = useState(false);
  const [componentCrash, setComponentCrash] = useState(false);
  const [boardItems, setBoardItems] = useState(initialBoardItems);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [tableQuery, setTableQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const columns = useMemo<ColumnDef<PatientRow>[]>(
    () => [
      { key: "id", header: "ID", sticky: "left", width: 120, sortable: true },
      { key: "name", header: "Patient", sortable: true },
      { key: "doctor", header: "Doctor", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (row) => (
          <Badge
            variant={
              row.status === "Active"
                ? "success"
                : row.status === "Queued"
                  ? "warning"
                  : "info"
            }
          >
            {row.status}
          </Badge>
        ),
      },
      { key: "due", header: "Next step", sortable: true, sticky: "right" },
    ],
    []
  );

  const filteredRows = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    if (!query) return tableRows;

    return tableRows.filter((row) =>
      [row.id, row.name, row.doctor, row.status, row.due].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [tableQuery]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;

    const next = [...filteredRows].sort((a, b) => {
      const aValue = a[sortKey as keyof PatientRow];
      const bValue = b[sortKey as keyof PatientRow];

      return String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });

    return sortDir === "asc" ? next : next.reverse();
  }, [filteredRows, sortKey, sortDir]);
  const bulkCount = selectedRowKeys.length;

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Design System Preview"
          breadcrumbs={[
            { label: "Packages", href: "#" },
            { label: "Design System" },
          ]}
          stepper={[
            { label: "Audit", description: "Compare doc and code", state: "complete" },
            { label: "Implement", description: "Fill component gaps", state: "current" },
            { label: "Document", description: "Update architecture doc", state: "upcoming" },
          ]}
          onNavigate={() => undefined}
          actions={
            <>
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                Open Drawer
              </Button>
              <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1.6fr,0.9fr]">
          <SectionCard
            title="Preview workspace"
            actions={<Badge variant="info">Live gallery</Badge>}
          >
            <div className="space-y-4">
              <p className="m-0 max-w-3xl text-sm leading-6 text-slate-600">
                This standalone page exercises the public components exported by
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  @jaldee/design-system
                </code>
                so product teams can inspect layout, states, and interactions in one place.
              </p>
              <DescriptionList items={detailItems} columns={3} />
            </div>
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Components"
              value="30"
              trend={{ value: 12, direction: "up", label: "this sprint" }}
              icon="DS"
              accent="indigo"
            />
            <StatCard label="Status" value="Stable" icon="OK" accent="emerald" />
          </div>
        </div>

        <SectionCard title="Primitives">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button loading>Loading</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success" dot>
                  Ready
                </Badge>
                <Badge variant="warning" dot>
                  Queued
                </Badge>
                <Badge variant="danger" dot>
                  Blocked
                </Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="info" count={12}>
                  Unread
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <Avatar name="Asha Menon" size="sm" />
                <Avatar name="Ravi Das" size="md" />
                <Avatar name="Mina Joseph" size="lg" />
                <AvatarGroup
                  users={[
                    { name: "Asha Menon" },
                    { name: "Ravi Das" },
                    { name: "Mina Joseph" },
                    { name: "Nikhil Varma" },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-4">
              <Alert variant="success" title="Release healthy">
                Preview build is rendering with Tailwind and design tokens.
              </Alert>
              <Alert variant="warning" title="Check contrast">
                Review neutral text and disabled states before promoting new tokens.
              </Alert>
              <Divider />
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip content="Tooltip preview">
                  <Button variant="secondary">Hover for tooltip</Button>
                </Tooltip>
                <Popover trigger={<Button variant="outline">Open Popover</Button>}>
                  <PopoverSection>
                    <p className="m-0 text-sm font-semibold text-gray-900">Queue context</p>
                    <p className="m-0 text-sm text-gray-500">
                      Use popovers for compact contextual actions and metadata.
                    </p>
                  </PopoverSection>
                </Popover>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Form Controls">
          <div className="grid gap-6 xl:grid-cols-2">
            <FormSection
              title="Patient intake"
              description="Representative validation and helper states."
            >
              <Input label="Patient name" placeholder="Enter full name" hint="Shown on the patient chart" />
              <Input label="Fee" prefix="Rs." placeholder="750" />

              <Select
                label="Department"
                placeholder="Select department"
                hint="Used for routing and queue grouping"
                defaultValue=""
                options={[
                  { value: "op", label: "Outpatient" },
                  { value: "ip", label: "Inpatient" },
                  { value: "lab", label: "Laboratory" },
                ]}
                data-testid="preview-department-select"
              />

              <Select
                label="Assigned services"
                hint="Native multi-select preview"
                multiple
                defaultValue={["consult", "lab"]}
                options={[
                  { value: "consult", label: "Consultation" },
                  { value: "lab", label: "Lab work" },
                  { value: "pharmacy", label: "Pharmacy" },
                  { value: "billing", label: "Billing" },
                ]}
                data-testid="preview-services-select"
              />

              <Select
                label="Escalation path"
                error="Please choose an escalation path"
                defaultValue=""
                options={[
                  { value: "doctor", label: "Doctor" },
                  { value: "nurse", label: "Nursing desk" },
                  { value: "billing", label: "Billing" },
                ]}
                data-testid="preview-escalation-select"
              />

              <Combobox
                label="Consulting doctor"
                placeholder="Choose doctor"
                options={[
                  { value: "menon", label: "Dr. Menon", description: "General medicine" },
                  { value: "joseph", label: "Dr. Joseph", description: "Cardiology" },
                  { value: "suma", label: "Dr. Suma", description: "Paediatrics" },
                ]}
              />
              <DatePicker label="Visit date" defaultValue="2026-03-26" />
              <DateRangePicker
                label="Admission window"
                defaultValue={{ start: "2026-03-26", end: "2026-03-29" }}
              />
              <TimePicker label="Consultation slot" defaultValue="10:30" />
              <Input label="Doctor" value="Dr. Menon" readOnly />
              <Textarea
                label="Clinical note"
                hint="Use this to preview multi-line input styling."
                defaultValue="Follow-up visit scheduled for review after lab results."
              />
              <FileUpload
                label="Attachments"
                accept=".pdf,.png"
                maxSize={2 * 1024 * 1024}
                onUpload={() => undefined}
              />
            </FormSection>

            <div className="space-y-5">
              <Checkbox label="Send discharge summary by email" defaultChecked />
              <RadioGroup
                label="Priority"
                name="priority"
                value="urgent"
                onChange={() => undefined}
                options={[
                  { value: "routine", label: "Routine" },
                  { value: "urgent", label: "Urgent" },
                  { value: "critical", label: "Critical" },
                ]}
              />
              <Switch label="Enable reminders" checked={notify} onChange={setNotify} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Feedback and Overlay">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <EmptyState
                title="No appointments scheduled"
                description="Create a booking to populate this state."
                action={<Button size="sm">New appointment</Button>}
              />
              <ErrorState
                title="Queue service unavailable"
                description="Realtime updates could not be loaded."
                action={
                  <Button variant="outline" size="sm">
                    Retry
                  </Button>
                }
              />
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setDialogOpen(true)}>Dialog</Button>
                <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
                  Confirm dialog
                </Button>
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                  Drawer
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SkeletonCard />
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <Skeleton height={16} width="45%" />
                  <div className="mt-3">
                    <SkeletonTable rows={3} columns={3} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Navigation and Layout">
          <div className="space-y-5">
            <Tabs
              value={tab}
              onValueChange={setTab}
              items={[
                { value: "overview", label: "Overview", count: 12 },
                { value: "activity", label: "Activity", count: 4 },
                { value: "settings", label: "Settings" },
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Patients today"
                value="128"
                trend={{ value: 8, direction: "up", label: "vs yesterday" }}
                icon="PT"
                accent="indigo"
              />
              <StatCard
                label="Avg wait"
                value="14 min"
                trend={{ value: 6, direction: "down", label: "queue improved" }}
                icon="WT"
                accent="amber"
              />
              <StatCard label="Alerts" value="3" icon="AL" accent="rose" />
              <StatCard label="Rooms free" value="11" icon="RM" accent="emerald" />
            </div>
            <SectionCard
              title="Contained card"
              actions={
                <Button size="sm" variant="ghost">
                  Action
                </Button>
              }
            >
              <p className="m-0 text-sm leading-6 text-slate-600">
                Section cards are useful for dense enterprise screens with multiple independently
                refreshable blocks.
              </p>
            </SectionCard>
          </div>
        </SectionCard>

        <SectionCard title="Data Display">
          <div className="space-y-6">
            {bulkCount > 0 && (
              <BulkActionBar
                count={bulkCount}
                onClear={() => setSelectedRowKeys([])}
                actions={[
                  { label: "Assign", onClick: () => undefined, variant: "secondary" },
                  { label: "Archive", onClick: () => undefined, variant: "outline" },
                  { label: "Delete", onClick: () => undefined, variant: "danger" },
                ]}
              />
            )}

            <DataTableToolbar
              query={tableQuery}
              onQueryChange={(value) => {
                setTableQuery(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search patients, doctor, status..."
              recordCount={filteredRows.length}
            />

            <DataTable
              data={sortedRows}
              columns={columns}
              getRowId={(row) => row.id}
              sorting={{
                sortKey,
                sortDir,
                onChange: (key, dir) => {
                  setSortKey(key);
                  setSortDir(dir);
                  setCurrentPage(1);
                },
              }}
              selection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              pagination={{
                pageSize,
                total: filteredRows.length,
                page: currentPage,
                onChange: setCurrentPage,
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                },
              }}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Description list">
                <DescriptionList items={detailItems} columns={2} />
              </SectionCard>
              <SectionCard title="Timeline">
                <Timeline events={timelineEvents} />
              </SectionCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <LiveQueue
                currentToken="A012"
                currentLabel="Anita Rao"
                items={liveQueueItems}
                onCallNext={() => undefined}
                onRecall={() => undefined}
                onHold={() => undefined}
              />
              <VitalsChart
                title="Temperature"
                unit="F"
                series={vitalsSeries}
                minThreshold={97}
                maxThreshold={102}
              />
            </div>

            <SectionCard title="Kanban Board">
              <KanbanBoard<BoardCard>
                columns={kanbanColumns}
                items={boardItems}
                onDragEnd={(itemId, newColumnId) => {
                  setBoardItems((current) =>
                    current.map((item) =>
                      item.id === itemId ? { ...item, columnId: newColumnId } : item
                    )
                  );
                }}
                renderCard={(item) => (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="m-0 text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.owner}</p>
                    <div className="mt-3">
                      <Badge
                        variant={
                          item.priority === "High"
                            ? "danger"
                            : item.priority === "Done"
                              ? "success"
                              : "warning"
                        }
                      >
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                )}
              />
            </SectionCard>
          </div>
        </SectionCard>

        <SectionCard title="Error Boundaries">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageCrash((value) => !value)}
                >
                  {pageCrash ? "Reset page demo" : "Trigger page error"}
                </Button>
              </div>
              <PageErrorBoundary>
                <PreviewGalleryCrash enabled={pageCrash} />
              </PageErrorBoundary>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComponentCrash((value) => !value)}
                >
                  {componentCrash ? "Reset widget demo" : "Trigger component error"}
                </Button>
              </div>
              <ComponentErrorBoundary label="Preview widget">
                <PreviewWidgetCrash enabled={componentCrash} />
              </ComponentErrorBoundary>
            </div>
          </div>
        </SectionCard>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Dialog Preview"
        description="Use this to validate modal layout and footer actions."
      >
        <p className="m-0 text-sm leading-6 text-slate-600">
          This sample modal uses the public dialog primitives exported by the design system package.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>
            Close
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>Continue</Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Confirm preview action"
        description="This is a representative destructive confirmation flow."
        confirmVariant="danger"
        confirmLabel="Delete record"
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Preview Drawer">
        <div className="space-y-4">
          <Alert variant="info" title="Drawer content">
            Use this panel to inspect overlay, spacing, and stacked actions.
          </Alert>
          <Input label="Assignee" defaultValue="Asha Menon" />
          <Textarea
            label="Notes"
            defaultValue="Prepare a tighter empty-state variant for mobile layouts."
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>Save</Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}