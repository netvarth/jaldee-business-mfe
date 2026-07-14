import { useState } from "react";
import { 
  Button, 
  Combobox,
  Dialog,
  DialogFooter,
  Input,
  Textarea,
  SectionCard
} from "@jaldee/design-system";
import { useEmployees } from "../../services/useEmployees";
import { usePosh } from "../../services/usePoshApi";
export function PoshGrievance() {
  const { data: myData, loading, reload, error, raise } = usePosh();
  const { data: employees, loading: employeesLoading } = useEmployees();
  const [open, setOpen] = useState(false);
  const [employeeUid, setEmployeeUid] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("POSH");
  const [accusedUid, setAccusedUid] = useState("");
  
  const handleRaise = async () => {
    if (!employeeUid || !title || !description) return;
    await raise({ employeeUid, title, description, category, accusedEmployeeUid: accusedUid });
    setOpen(false);
    setEmployeeUid("");
    setTitle("");
    setDescription("");
    setCategory("POSH");
    setAccusedUid("");
    reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">POSH Committee (Confidential)</h1>
        <Button onClick={() => setOpen(true)} className="bg-red-600 hover:bg-red-700">Raise Grievance</Button>
      </div>
      
      <p className="text-sm text-gray-500">
        All submissions here are strictly confidential and only visible to the designated POSH committee.
      </p>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-md"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {myData.map(g => (
            <SectionCard 
              key={g.id}
              title={<span className="text-lg">{g.title}</span>}
              actions={
                <span className={`px-2 py-1 text-xs rounded-full ${
                  g.status === "Open" ? "bg-red-100 text-red-800" :
                  g.status === "Resolved" ? "bg-green-100 text-green-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {g.status}
                </span>
              }
            >
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{g.description}</p>
              {g.createdAtTs && (
                <p className="text-xs text-gray-400 mt-4">Submitted: {new Date(g.createdAtTs).toLocaleDateString()}</p>
              )}
            </SectionCard>
          ))}
          {myData.length === 0 && (
            <div className="text-center py-12 text-gray-500 border rounded-lg border-dashed">
              No confidential grievances submitted.
            </div>
          )}
        </div>
      )}

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        title="Raise POSH Grievance"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Combobox
              id="employeeUid"
              label="Employee"
              value={employeeUid}
              onValueChange={setEmployeeUid}
              disabled={employeesLoading}
              placeholder="Select employee"
              searchPlaceholder="Search employee..."
              options={[
                { value: "", label: employeesLoading ? "Loading employees..." : "Select employee" },
                ...employees.map((employee) => ({
                  value: employee.id,
                  label: employee.employeeId ? `${employee.name} (${employee.employeeId})` : employee.name,
                  description: employee.department || employee.designation || undefined,
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Subject</label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title..." />
          </div>
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} disabled />
          </div>
          <div className="space-y-2">
            <Combobox
              id="accusedUid"
              label="Accused Employee (Optional)"
              value={accusedUid}
              onValueChange={setAccusedUid}
              disabled={employeesLoading}
              placeholder="Select employee"
              searchPlaceholder="Search employee..."
              options={[
                { value: "", label: employeesLoading ? "Loading employees..." : "Select employee" },
                ...employees.map((employee) => ({
                  value: employee.id,
                  label: employee.employeeId ? `${employee.name} (${employee.employeeId})` : employee.name,
                  description: employee.department || employee.designation || undefined,
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Details</label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Please describe the incident in detail..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleRaise} className="bg-red-600 hover:bg-red-700" disabled={!employeeUid || !title || !description}>Submit Confidentially</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
