import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendars } from '../../services/useCalendars';
import { X } from 'lucide-react';
import {
    Button,
    Checkbox,
    DataTable,
    EmptyState,
    Input,
    PageHeader,
    Select,
    Textarea,
    TimePicker,
    type ColumnDef,
} from '@jaldee/design-system';
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

    const serviceColumns = useMemo<ColumnDef<Service>[]>(() => [
        {
            key: 'name',
            header: 'Services',
            render: (service) => <div className="font-semibold text-slate-900">{service.name}</div>,
        },
        {
            key: 'users',
            header: 'Users',
            render: (service) => serviceUsers[service.id]?.length ? (
                <div className="flex gap-1">
                    {serviceUsers[service.id].map((user) => (
                        <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="user-avatar h-7 w-7" />
                    ))}
                </div>
            ) : <span className="text-sm italic text-slate-400">No users assigned</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (service) => (
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={(event) => {
                        event.stopPropagation();
                        setUsersModalServiceId(service.id);
                    }}>
                        Assign Users
                    </Button>
                    <Button variant="danger" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>} aria-label={`Remove ${service.name}`} onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteService(service.id);
                    }} />
                </div>
            ),
        },
    ], [serviceUsers]);

    return (
        <>
            <section id="page-create-calendar" className="page-section active h-full flex flex-col relative overflow-hidden bg-white" style={{ display: 'flex' }}>
                {/* Header Back Button Overlay */}
                <Button variant="ghost" size="sm" iconOnly icon={<X size={20} />} onClick={() => navigate('/calendars')} className="absolute right-4 top-4 z-50 text-slate-400" title="Close Wizard" aria-label="Close calendar wizard" />
                <div className="shrink-0 border-b border-slate-200 bg-white px-6 pt-5">
                    <PageHeader
                        title="Create Calendar"
                        subtitle="Configure calendar details, services, users, and availability."
                        className="mb-5"
                        stepper={[
                            { label: "Basic information", description: "Calendar details", state: step > 1 ? "complete" : "current" },
                            { label: "Services and users", description: "Assignments", state: step > 2 ? "complete" : step === 2 ? "current" : "upcoming" },
                            { label: "Schedules", description: "Availability", state: step === 3 ? "current" : "upcoming" },
                        ]}
                    />
                </div>

                <div className="wizard-content-container flex-1 overflow-y-auto">
                    {/* STEP 1 VIEW */}
                    <div className={`wizard-step-panel ${step === 1 ? 'active' : ''}`} style={{ display: step === 1 ? 'block' : 'none' }}>
                        <h2 className="section-title">Basic Details</h2>
                        <form className="wizard-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                            <div className="form-group">
                                <Input
                                    type="text" 
                                    id="wizard-calendar-name" 
                                    label="Calendar Name"
                                    required 
                                    placeholder="Morning Shiftment - Morning Shift"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <Textarea
                                    id="wizard-calendar-desc" 
                                    label="Calendar Description"
                                    rows={4} 
                                    placeholder="Brief description of this calendar"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <Select
                                    id="wizard-calendar-location" 
                                    label="Location"
                                    required 
                                    className="custom-select"
                                    value={location}
                                    placeholder="Select Location"
                                    options={[
                                        { value: 'Thrissur', label: 'Thrissur' },
                                        { value: 'Kochi', label: 'Kochi' },
                                        { value: 'Bangalore', label: 'Bangalore' },
                                    ]}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>

                            <div className="wizard-channels-section">
                                <h3 className="subsection-title">Booking Channel Setup</h3>
                                <p className="subsection-help">Configure which channels customers can use to book appointments for this time window</p>
                                
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.online}
                                        onChange={(e) => setChannels({...channels, online: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">🖥️ Online</span>
                                            <span className="chk-subtext">Allow customers to book appointments online</span>
                                        </div>}
                                    />
                                </div>
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.walkin}
                                        onChange={(e) => setChannels({...channels, walkin: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">📍 Walk-in</span>
                                            <span className="chk-subtext">Accept walk-in appointments without prior booking</span>
                                        </div>}
                                    />
                                </div>
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.phonein}
                                        onChange={(e) => setChannels({...channels, phonein: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">📞 Phone-in</span>
                                            <span className="chk-subtext">Accept booked over the phone</span>
                                        </div>}
                                    />
                                </div>
                            </div>

                            <div className="wizard-labels-section">
                                <h3 className="subsection-title label-title-color">Label</h3>
                                <p className="subsection-help">Label helps you tag a booking to a specified group. Examples: VIP, Family, etc.</p>
                                <div className="labels-container">
                                    <div className="label-chips">
                                        {/* Chips rendered dynamically */}
                                    </div>
                                    <Button variant="link" size="inline" className="btn-add-label">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                                        Add Label
                                    </Button>
                                </div>
                            </div>

                            <div className="wizard-footer-actions">
                                <Button variant="secondary" className="btn-wizard-discard" onClick={() => navigate('/calendars')}>Discard</Button>
                                <Button type="submit">Continue</Button>
                            </div>
                        </form>
                    </div>

                    {/* STEP 2 VIEW */}
                    <div className={`wizard-step-panel ${step === 2 ? 'active' : ''}`} style={{ display: step === 2 ? 'block' : 'none' }}>
                        <div className="section-header-row">
                            <h2 className="section-title">Set Services & Users</h2>
                            <Button variant="secondary" className="btn-icon-plus" onClick={() => setIsServicesModalOpen(true)}>
                                <span>⊕ Add Services</span>
                            </Button>
                        </div>

                        <div className="mt-4">
                            <DataTable
                                data={selectedServices}
                                columns={serviceColumns}
                                getRowId={(service) => service.id}
                                emptyState={<EmptyState title="No services added" description='Click "Add Services" to configure this calendar.' />}
                                data-testid="bookings-calendar-wizard-services"
                            />
                        </div>

                        <div className="wizard-footer-actions mt-8">
                            <Button variant="secondary" className="btn-wizard-back" onClick={handlePrev}>Back</Button>
                            <Button onClick={handleNext}>Continue</Button>
                        </div>
                    </div>

                    {/* STEP 3 VIEW */}
                    <div className={`wizard-step-panel ${step === 3 ? 'active' : ''}`} style={{ display: step === 3 ? 'block' : 'none' }}>
                        <div className="section-header-row">
                            <h2 className="section-title">Create Schedules</h2>
                            <Button
                                variant="primary"
                                className="btn-dark"
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
                            </Button>
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                iconOnly
                                                icon={<span aria-hidden="true">&times;</span>}
                                                className="btn-remove-schedule-card" 
                                                aria-label={`Remove ${sch.name}`}
                                                onClick={() => setSchedules(schedules.filter((_, i) => i !== sIdx))}
                                            />
                                        )}
                                        <div className="schedule-card-hdr">
                                            <span className="schedule-card-title">{sch.name}</span>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <Input
                                                    type="text" 
                                                    label="Schedule Name"
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
                                                <Input
                                                    type="date" 
                                                    label="Start Date"
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
                                                <Input
                                                    type="date" 
                                                    label="End Date (Optional)"
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
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            iconOnly
                                                            icon={<span aria-hidden="true">&times;</span>}
                                                            className="btn-remove-timewindow-row"
                                                            aria-label="Remove time window"
                                                            onClick={() => {
                                                                const newSch = [...schedules];
                                                                newSch[sIdx].timeWindows = newSch[sIdx].timeWindows.filter((_: any, i: number) => i !== twIdx);
                                                                setSchedules(newSch);
                                                            }}
                                                        />
                                                    )}
                                                    <div className="form-group mb-2">
                                                        <label>Select Weekdays</label>
                                                        <div className="weekdays-pill-selector">
                                                            {[1, 2, 3, 4, 5, 6, 7].map(d => {
                                                                const checked = tw.weekDays.includes(d);
                                                                const name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d-1];
                                                                return (
                                                                    <Checkbox
                                                                        key={d}
                                                                        className="weekday-pill-input wiz-day-pill-input"
                                                                        containerClassName="mr-1"
                                                                        labelClassName="weekday-pill-label"
                                                                        label={name}
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
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="form-row mt-3">
                                                        <div className="form-group">
                                                            <TimePicker
                                                                label="Start Time"
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
                                                            <TimePicker
                                                                label="End Time"
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
                                                            <Input
                                                                type="number" 
                                                                label="Slot Duration (m)"
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
                                                            <Input
                                                                type="number" 
                                                                label="Slot Capacity"
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
                                            
                                            <Button
                                                variant="link"
                                                size="inline"
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
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="wizard-footer-actions mt-8">
                            <Button variant="secondary" className="btn-wizard-back" onClick={handlePrev}>Back</Button>
                            <Button onClick={handleCreate} loading={submitting}>
                                {submitting ? 'Creating...' : 'Create Calendar'}
                            </Button>
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
