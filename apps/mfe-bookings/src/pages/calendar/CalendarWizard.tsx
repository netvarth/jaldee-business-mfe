import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendars } from '../../services/useCalendars';
import { X } from 'lucide-react';
import DualListServicesModal, { Service } from './components/DualListServicesModal';
import DualListUsersModal, { User } from './components/DualListUsersModal';

// Mock Data
const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'General Consultation', code: 'GEN-01' },
  { id: 's2', name: 'Dental Cleaning', code: 'DEN-02' },
  { id: 's3', name: 'Eye Checkup', code: 'EYE-01' },
  { id: 's4', name: 'Physical Therapy', code: 'PHY-04' },
  { id: 's5', name: 'Vaccination', code: 'VAC-01' }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Dr. John Doe', role: 'Chief Medical Officer', avatarUrl: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Dr. Jane Smith', role: 'Senior Dentist', avatarUrl: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: 'Alice Johnson', role: 'Physiotherapist', avatarUrl: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: 'Bob Williams', role: 'Optometrist', avatarUrl: 'https://i.pravatar.cc/150?u=u4' }
];

export default function CalendarWizard() {
    const navigate = useNavigate();
    const { createCalendar } = useCalendars();
    
    const [step, setStep] = useState(1);
    
    // Step 1 State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [channels, setChannels] = useState({
        online: true,
        walkin: false,
        phonein: false
    });
    
    // Step 2 State
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [serviceUsers, setServiceUsers] = useState<Record<string, User[]>>({});
    
    // Modals State
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [usersModalServiceId, setUsersModalServiceId] = useState<string | null>(null);

    // Step 3 State
    const [schedules, setSchedules] = useState<any[]>([
        {
            id: 'sch-1',
            name: 'Default Schedule',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            timeWindows: [
                {
                    id: 'tw-1',
                    weekDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
                    startTime: '09:00',
                    endTime: '17:00',
                    duration: 30,
                    capacity: 1
                }
            ]
        }
    ]);

    const [submitting, setSubmitting] = useState(false);

    const handleNext = () => setStep(s => Math.min(3, s + 1));
    const handlePrev = () => setStep(s => Math.max(1, s - 1));

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await createCalendar(name, description);
            // In a real flow, we would also save the mapped services and schedules here.
            navigate('/calendars');
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteService = (serviceId: string) => {
        setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
        const newUsers = { ...serviceUsers };
        delete newUsers[serviceId];
        setServiceUsers(newUsers);
    };

    return (
        <>
            <section id="page-create-calendar" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
                {/* Header Back Button Overlay */}
                <button onClick={() => navigate('/calendars')} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-lg z-50" title="Close Wizard">
                    <X size={20} />
                </button>
                <div className="wizard-header">
                    {/* Stepper */}
                    <div className="stepper">
                        <div className={`step ${step >= 1 ? 'active' : ''}`} data-step="1">
                            <div className="step-icon">{step > 1 ? '✓' : '1'}</div>
                            <div className="step-label">
                                <span className="step-title">Create Calendar</span>
                                <span className="step-subtitle">Basic information</span>
                            </div>
                        </div>
                        <div className="step-connector"></div>
                        <div className={`step ${step >= 2 ? 'active' : ''}`} data-step="2">
                            <div className="step-icon">{step > 2 ? '✓' : '2'}</div>
                            <div className="step-label">
                                <span className="step-title">Set Services</span>
                                <span className="step-subtitle">Assign Services & Users</span>
                            </div>
                        </div>
                        <div className="step-connector"></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`} data-step="3">
                            <div className="step-icon">3</div>
                            <div className="step-label">
                                <span className="step-title">Create Schedules</span>
                                <span className="step-subtitle">Set availability</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="wizard-content-container flex-1 overflow-y-auto">
                    {/* STEP 1 VIEW */}
                    <div className={`wizard-step-panel ${step === 1 ? 'active' : ''}`} style={{ display: step === 1 ? 'block' : 'none' }}>
                        <h2 className="section-title">Basic Details</h2>
                        <form className="wizard-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                            <div className="form-group">
                                <label htmlFor="wizard-calendar-name">Calendar Name <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    id="wizard-calendar-name" 
                                    required 
                                    placeholder="Morning Shiftment - Morning Shift"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="wizard-calendar-desc">Calendar Description</label>
                                <textarea 
                                    id="wizard-calendar-desc" 
                                    rows={4} 
                                    placeholder="Brief description of this calendar"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="wizard-calendar-location">Location <span className="required">*</span></label>
                                <select 
                                    id="wizard-calendar-location" 
                                    required 
                                    className="custom-select"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                >
                                    <option value="" disabled>Select Location</option>
                                    <option value="Thrissur">Thrissur</option>
                                    <option value="Kochi">Kochi</option>
                                    <option value="Bangalore">Bangalore</option>
                                </select>
                            </div>

                            <div className="wizard-channels-section">
                                <h3 className="subsection-title">Booking Channel Setup</h3>
                                <p className="subsection-help">Configure which channels customers can use to book appointments for this time window</p>
                                
                                <div className="checkbox-channel-card">
                                    <label className="custom-checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={channels.online}
                                            onChange={(e) => setChannels({...channels, online: e.target.checked})}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="checkbox-desc">
                                            <span className="chk-label">🖥️ Online</span>
                                            <span className="chk-subtext">Allow customers to book appointments online</span>
                                        </div>
                                    </label>
                                </div>
                                <div className="checkbox-channel-card">
                                    <label className="custom-checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={channels.walkin}
                                            onChange={(e) => setChannels({...channels, walkin: e.target.checked})}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="checkbox-desc">
                                            <span className="chk-label">📍 Walk-in</span>
                                            <span className="chk-subtext">Accept walk-in appointments without prior booking</span>
                                        </div>
                                    </label>
                                </div>
                                <div className="checkbox-channel-card">
                                    <label className="custom-checkbox-container">
                                        <input 
                                            type="checkbox" 
                                            checked={channels.phonein}
                                            onChange={(e) => setChannels({...channels, phonein: e.target.checked})}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="checkbox-desc">
                                            <span className="chk-label">📞 Phone-in</span>
                                            <span className="chk-subtext">Accept booked over the phone</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="wizard-labels-section">
                                <h3 className="subsection-title label-title-color">Label</h3>
                                <p className="subsection-help">Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.</p>
                                <div className="labels-container">
                                    <div className="label-chips">
                                        {/* Chips rendered dynamically */}
                                    </div>
                                    <button type="button" className="btn-add-label">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                                        Add Label
                                    </button>
                                </div>
                            </div>

                            <div className="wizard-footer-actions">
                                <button type="button" className="btn btn-secondary btn-wizard-discard" onClick={() => navigate('/calendars')}>Discard</button>
                                <button type="submit" className="btn btn-primary">Continue</button>
                            </div>
                        </form>
                    </div>

                    {/* STEP 2 VIEW */}
                    <div className={`wizard-step-panel ${step === 2 ? 'active' : ''}`} style={{ display: step === 2 ? 'block' : 'none' }}>
                        <div className="section-header-row">
                            <h2 className="section-title">Set Services & Users</h2>
                            <button type="button" className="btn btn-secondary btn-icon-plus" onClick={() => setIsServicesModalOpen(true)}>
                                <span>⊕ Add Services</span>
                            </button>
                        </div>

                        <div className="table-container shadow-none mt-4">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Services</th>
                                        <th>Users</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedServices.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="text-center py-6 text-gray-500">
                                                No services added yet. Click "+ Add Services" above to configure.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedServices.map(service => (
                                            <tr key={service.id}>
                                                <td>
                                                    <div className="font-semibold text-slate-900">{service.name}</div>
                                                </td>
                                                <td>
                                                    {serviceUsers[service.id] && serviceUsers[service.id].length > 0 ? (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {serviceUsers[service.id].map(user => (
                                                                <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="user-avatar" style={{ width: '28px', height: '28px' }} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">No users assigned</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-secondary btn-sm" 
                                                            onClick={() => setUsersModalServiceId(service.id)}
                                                        >
                                                            Assign Users
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="action-icon-btn delete-btn" 
                                                            onClick={() => handleDeleteService(service.id)}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="wizard-footer-actions mt-8">
                            <button type="button" className="btn btn-secondary btn-wizard-back" onClick={handlePrev}>Back</button>
                            <button type="button" className="btn btn-primary" onClick={handleNext}>Continue</button>
                        </div>
                    </div>

                    {/* STEP 3 VIEW */}
                    <div className={`wizard-step-panel ${step === 3 ? 'active' : ''}`} style={{ display: step === 3 ? 'block' : 'none' }}>
                        <div className="section-header-row">
                            <h2 className="section-title">Create Schedules</h2>
                            <button 
                                type="button" 
                                className="btn btn-dark"
                                onClick={() => {
                                    setSchedules([...schedules, {
                                        id: `sch-${Date.now()}`,
                                        name: `Schedule ${schedules.length + 1}`,
                                        startDate: new Date().toISOString().split('T')[0],
                                        endDate: '',
                                        timeWindows: [{
                                            id: `tw-${Date.now()}`,
                                            weekDays: [1, 2, 3, 4, 5],
                                            startTime: '09:00',
                                            endTime: '17:00',
                                            duration: 30,
                                            capacity: 1
                                        }]
                                    }]);
                                }}
                            >
                                <span>⊕ Add Schedule</span>
                            </button>
                        </div>

                        <div className="schedules-cards-list mt-6" id="wizard-schedules-container">
                            {schedules.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50">
                                    <p className="text-slate-500 text-sm font-medium">No schedules defined yet. Add a schedule to set practitioner availability.</p>
                                </div>
                            ) : (
                                schedules.map((sch, sIdx) => (
                                    <div key={sch.id} className="schedule-setup-card">
                                        {sIdx > 0 && (
                                            <button 
                                                type="button" 
                                                className="btn-remove-schedule-card" 
                                                onClick={() => setSchedules(schedules.filter((_, i) => i !== sIdx))}
                                            >&times;</button>
                                        )}
                                        <div className="schedule-card-hdr">
                                            <span className="schedule-card-title">{sch.name}</span>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Schedule Name</label>
                                                <input 
                                                    type="text" 
                                                    className="wiz-sch-input" 
                                                    value={sch.name}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].name = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Start Date</label>
                                                <input 
                                                    type="date" 
                                                    className="wiz-sch-input" 
                                                    value={sch.startDate}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].startDate = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>End Date (Optional)</label>
                                                <input 
                                                    type="date" 
                                                    className="wiz-sch-input" 
                                                    value={sch.endDate}
                                                    onChange={(e) => {
                                                        const newSch = [...schedules];
                                                        newSch[sIdx].endDate = e.target.value;
                                                        setSchedules(newSch);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="time-windows-wrapper mt-4">
                                            <h4 className="bold text-sm">Working Hours / Slots</h4>
                                            
                                            {sch.timeWindows.map((tw: any, twIdx: number) => (
                                                <div key={tw.id} className="time-window-setup-row">
                                                    {twIdx > 0 && (
                                                        <button 
                                                            type="button" 
                                                            className="btn-remove-timewindow-row"
                                                            onClick={() => {
                                                                const newSch = [...schedules];
                                                                newSch[sIdx].timeWindows = newSch[sIdx].timeWindows.filter((_: any, i: number) => i !== twIdx);
                                                                setSchedules(newSch);
                                                            }}
                                                        >&times;</button>
                                                    )}
                                                    <div className="form-group mb-2">
                                                        <label>Select Weekdays</label>
                                                        <div className="weekdays-pill-selector">
                                                            {[1, 2, 3, 4, 5, 6, 7].map(d => {
                                                                const checked = tw.weekDays.includes(d);
                                                                const name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d-1];
                                                                return (
                                                                    <label key={d} className="custom-checkbox-container mr-1">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="weekday-pill-input wiz-day-pill-input" 
                                                                            checked={checked}
                                                                            onChange={(e) => {
                                                                                const newSch = [...schedules];
                                                                                let days = [...newSch[sIdx].timeWindows[twIdx].weekDays];
                                                                                if (e.target.checked) {
                                                                                    if (!days.includes(d)) days.push(d);
                                                                                } else {
                                                                                    days = days.filter(day => day !== d);
                                                                                }
                                                                                newSch[sIdx].timeWindows[twIdx].weekDays = days;
                                                                                setSchedules(newSch);
                                                                            }}
                                                                        />
                                                                        <span className="weekday-pill-label">{name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-3">
                                                        <div className="form-group">
                                                            <label>Start Time</label>
                                                            <input 
                                                                type="time" 
                                                                className="wiz-tw-input" 
                                                                value={tw.startTime}
                                                                onChange={(e) => {
                                                                    const newSch = [...schedules];
                                                                    newSch[sIdx].timeWindows[twIdx].startTime = e.target.value;
                                                                    setSchedules(newSch);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>End Time</label>
                                                            <input 
                                                                type="time" 
                                                                className="wiz-tw-input" 
                                                                value={tw.endTime}
                                                                onChange={(e) => {
                                                                    const newSch = [...schedules];
                                                                    newSch[sIdx].timeWindows[twIdx].endTime = e.target.value;
                                                                    setSchedules(newSch);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Slot Duration (m)</label>
                                                            <input 
                                                                type="number" 
                                                                className="wiz-tw-input" 
                                                                value={tw.duration} 
                                                                min="5"
                                                                onChange={(e) => {
                                                                    const newSch = [...schedules];
                                                                    newSch[sIdx].timeWindows[twIdx].duration = parseInt(e.target.value);
                                                                    setSchedules(newSch);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Slot Capacity</label>
                                                            <input 
                                                                type="number" 
                                                                className="wiz-tw-input" 
                                                                value={tw.capacity} 
                                                                min="1"
                                                                onChange={(e) => {
                                                                    const newSch = [...schedules];
                                                                    newSch[sIdx].timeWindows[twIdx].capacity = parseInt(e.target.value);
                                                                    setSchedules(newSch);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <button 
                                                type="button" 
                                                className="btn-add-timewindow-link btn-wiz-add-tw-row"
                                                onClick={() => {
                                                    const newSch = [...schedules];
                                                    newSch[sIdx].timeWindows.push({
                                                        id: `temp-tw-${Date.now()}`,
                                                        weekDays: [1, 2, 3, 4, 5],
                                                        startTime: "09:00",
                                                        endTime: "17:00",
                                                        duration: 30,
                                                        capacity: 1
                                                    });
                                                    setSchedules(newSch);
                                                }}
                                            >
                                                + Add New Time Window
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="wizard-footer-actions mt-8">
                            <button type="button" className="btn btn-secondary btn-wizard-back" onClick={handlePrev}>Back</button>
                            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Calendar'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Modals rendered via Portal or conditionally here */}
            <DualListServicesModal 
                isOpen={isServicesModalOpen}
                onClose={() => setIsServicesModalOpen(false)}
                allServices={MOCK_SERVICES}
                initialSelectedServices={selectedServices}
                onSave={setSelectedServices}
            />

            {usersModalServiceId && (
                <DualListUsersModal 
                    isOpen={true}
                    onClose={() => setUsersModalServiceId(null)}
                    serviceName={selectedServices.find(s => s.id === usersModalServiceId)?.name || ''}
                    allUsers={MOCK_USERS}
                    initialSelectedUsers={serviceUsers[usersModalServiceId] || []}
                    onSave={(users) => setServiceUsers(prev => ({ ...prev, [usersModalServiceId]: users }))}
                />
            )}
        </>
    );
}
