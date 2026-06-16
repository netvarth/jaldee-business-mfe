import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useCreateService, type ServiceFormInput } from "../../services/useCreateService";

const card: CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 24 };
const h2: CSSProperties = { fontSize: 14, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0 };
const label: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 8 };
const input: CSSProperties = { width: "100%", fontSize: 14, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "white", boxSizing: "border-box" };
const req: CSSProperties = { color: "#ef4444" };

function segBtn(active: boolean): CSSProperties {
  return {
    flex: 1, padding: "10px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    border: active ? "1px solid #55349A" : "1px solid transparent",
    background: active ? "#f1eefc" : "transparent",
    color: active ? "#55349A" : "#64748b",
  };
}
function pillBtn(active: boolean): CSSProperties {
  return {
    padding: "8px 16px", borderRadius: 20, fontWeight: 600, fontSize: 12, cursor: "pointer",
    border: active ? "none" : "1px solid #e2e8f0",
    background: active ? "#55349A" : "#f8fafc",
    color: active ? "white" : "#64748b",
  };
}
const statRow: CSSProperties = { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" };

export default function CreateServicePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { createService, submitting } = useCreateService();

  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [department, setDepartment] = useState("General Medicine");
  const [description, setDescription] = useState("");
  const [serviceContext, setServiceContext] = useState<ServiceFormInput["serviceContext"]>("General Service");
  const [serviceType, setServiceType] = useState<ServiceFormInput["serviceType"]>("Onsite Service");
  const [apptType, setApptType] = useState<ServiceFormInput["apptType"]>("Booking");
  const [serviceCategory, setServiceCategory] = useState<ServiceFormInput["serviceCategory"]>("Main Service");
  const [durHrs, setDurHrs] = useState(0);
  const [durMins, setDurMins] = useState(30);
  const [numResources, setNumResources] = useState(1);
  const [maxBookings, setMaxBookings] = useState(1);
  const [showDuration, setShowDuration] = useState(true);
  const [leadDays, setLeadDays] = useState(0);
  const [leadHrs, setLeadHrs] = useState(0);
  const [leadMins, setLeadMins] = useState(0);
  const [safeSlots, setSafeSlots] = useState(true);
  const [hasPricing, setHasPricing] = useState(false);
  const [price, setPrice] = useState(500);
  const [taxApplicable, setTaxApplicable] = useState(false);
  const [hsnCode, setHsnCode] = useState("None");
  const [customIntake, setCustomIntake] = useState(false);

  const goBack = () => navigate("/services");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast("Service name is required", "error"); return; }
    await createService({
      name, displayOrder, department, description, serviceContext, serviceType, apptType, serviceCategory,
      durHrs, durMins, numResources, maxBookings, showDuration, leadDays, leadHrs, leadMins,
      safeSlots, hasPricing, price, taxApplicable, hsnCode, customIntake,
    });
    showToast("Service created", "success");
    goBack();
  };

  return (
    <section id="page-create-service" className="page-section active" style={{ background: "#f8fafc", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30 }}>
        <button type="button" onClick={goBack} style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer", color: "#64748b", borderRadius: 8 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Create Service</h1>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <form onSubmit={handleSubmit}>
          {/* SECTION 1 */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#55349A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <h2 style={h2}>1. Service Details</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Service Context</span>
                <button type="button" style={pillBtn(serviceContext === "General Service")} onClick={() => setServiceContext("General Service")}>General Service</button>
                <button type="button" style={pillBtn(serviceContext === "Inpatient Service")} onClick={() => setServiceContext("Inpatient Service")}>Inpatient Service</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 2 }}>
                <label style={label}>Service Name <span style={req}>*</span></label>
                <input type="text" required placeholder="e.g. Executive Cardiac Health Checkup" style={input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Display Order</label>
                <input type="number" style={input} value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={label}>Department <span style={req}>*</span></label>
                <select style={input} value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={label}>Service Description</label>
              <textarea rows={3} placeholder="Describe medical consultation summary, suitability and patient instructions..." style={{ ...input, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Service Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={segBtn(serviceType === "Onsite Service")} onClick={() => setServiceType("Onsite Service")}>Onsite Service</button>
                  <button type="button" style={segBtn(serviceType === "Teleservice")} onClick={() => setServiceType("Teleservice")}>Teleservice</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Appointment Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={segBtn(apptType === "Booking")} onClick={() => setApptType("Booking")}>Booking</button>
                  <button type="button" style={segBtn(apptType === "Request")} onClick={() => setApptType("Request")}>Request</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Service Category</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={segBtn(serviceCategory === "Main Service")} onClick={() => setServiceCategory("Main Service")}>Main Service</button>
                  <button type="button" style={segBtn(serviceCategory === "Sub Service")} onClick={() => setServiceCategory("Sub Service")}>Sub Service</button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div style={card}>
            <h2 style={{ ...h2, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>2. Duration &amp; Booking Rules</h2>
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>Estimated Duration <span style={req}>*</span></label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" min={0} style={input} value={durHrs} onChange={(e) => setDurHrs(Number(e.target.value))} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>hr(s)</span>
                  <input type="number" min={0} style={input} value={durMins} onChange={(e) => setDurMins(Number(e.target.value))} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>mins</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Number of Resources</label>
                <input type="number" min={1} style={input} value={numResources} onChange={(e) => setNumResources(Number(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Max Aligned Daily Bookings</label>
                <input type="number" min={1} style={input} value={maxBookings} onChange={(e) => setMaxBookings(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div style={statRow}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Show Service Duration to Patients</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Display duration estimates in clinic scheduling</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={showDuration} onChange={(e) => setShowDuration(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Minimum Booking Lead Notice</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={0} placeholder="DAYS" style={input} value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} />
                  <input type="number" min={0} placeholder="HOURS" style={input} value={leadHrs} onChange={(e) => setLeadHrs(Number(e.target.value))} />
                  <input type="number" min={0} placeholder="MINS" style={input} value={leadMins} onChange={(e) => setLeadMins(Number(e.target.value))} />
                </div>
              </div>
              <div style={statRow}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Show Only Safe Available Slots</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Filter fully occupied slots immediately</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={safeSlots} onChange={(e) => setSafeSlots(e.target.checked)} />
                  <span className="slider" />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#ecfdf5", borderRadius: 12, border: "1px solid #a7f3d0" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>Global Service Status</div>
                <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>No practitioners limited. This is configured as a Global Service.</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>

          {/* SECTION 3 */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
              <h2 style={h2}>3. Pricing &amp; Payment</h2>
              <label className="toggle-switch">
                <input type="checkbox" checked={hasPricing} onChange={(e) => setHasPricing(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
            {hasPricing && (
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Service Price (₹) <span style={req}>*</span></label>
                  <input type="number" min={0} style={input} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Tax Applicable</label>
                  <select style={input} value={String(taxApplicable)} onChange={(e) => setTaxApplicable(e.target.value === "true")}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>HSN Code</label>
                  <select style={input} value={hsnCode} onChange={(e) => setHsnCode(e.target.value)}>
                    <option value="None">None</option>
                    <option value="998511">998511 (Clinical Services)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5 */}
          <div style={card}>
            <h2 style={{ ...h2, marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>5. Customization</h2>
            <div style={{ ...statRow, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>Enable Patient Custom Intake Fields</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Gather allergies, medical files and previous prescriptions</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={customIntake} onChange={(e) => setCustomIntake(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
            <div style={{ padding: 16, background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a", display: "flex", gap: 12, alignItems: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#b45309" }}>Need Specialty Patient Questionnaires?</div>
                <div style={{ fontSize: 12, color: "#d97706", marginTop: 2 }}>Jaldee can customize rich clinical intake templates. Contact medical setup support at (+91 8714766671).</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, paddingTop: 16 }}>
            <button type="button" className="btn btn-secondary" style={{ padding: "12px 24px", borderRadius: 8 }} onClick={goBack}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: "12px 24px", borderRadius: 8, backgroundColor: "#55349A" }} disabled={submitting}>
              {submitting ? "Saving…" : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
