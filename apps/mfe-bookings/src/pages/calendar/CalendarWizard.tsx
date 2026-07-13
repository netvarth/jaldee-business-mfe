import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    useCalendars,
    type AccountLocation,
    type CreateCalendarPayload,
    type CreateSchedulePayload,
} from '../../services/useCalendars';
import { useServices } from '../../services/useServices';
import { useUsers } from '../../services/useUsers';
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

function toBookingChannels(channels: { online: boolean; walkin: boolean; phonein: boolean; ivr: boolean }) {
    const values: string[] = [];
    if (channels.online) values.push('ONLINE');
    if (channels.walkin) values.push('WALK_IN');
    if (channels.phonein) values.push('PHONE_IN');
    if (channels.ivr) values.push('IVR');
    return values;
}

function withSeconds(value: string) {
    return value.split(':').length === 2 ? `${value}:00` : value;
}

export default function CalendarWizard() {
    const navigate = useNavigate();
    const locationState = useLocation().state as { calendar?: any } | null;
    const initialCalendar = locationState?.calendar;

    const { createCalendar, updateCalendar, createSchedule, getLocations } = useCalendars();
    const { services } = useServices();
    const { users, loading: usersLoading, error: usersError } = useUsers();
    
    const [step, setStep] = useState(1);
    const [draftUid, setDraftUid] = useState<string | null>(initialCalendar?.uid || null);
    
    // Step 1 State
    const [name, setName] = useState(initialCalendar?.name || '');
    const [description, setDescription] = useState(initialCalendar?.description || '');
    const [location, setLocation] = useState(initialCalendar?.locationName || '');
    const [locations, setLocations] = useState<AccountLocation[]>([]);
    const [channels, setChannels] = useState({
        online: initialCalendar?.bookingChannels?.includes('ONLINE') ?? true,
        walkin: initialCalendar?.bookingChannels?.includes('WALK_IN') ?? false,
        phonein: initialCalendar?.bookingChannels?.includes('PHONE_IN') ?? false,
        ivr: initialCalendar?.bookingChannels?.includes('IVR') ?? false,
    });
    
    // Step 2 State
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [defaultServiceId, setDefaultServiceId] = useState<string>('');
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

    React.useEffect(() => {
        let cancelled = false;
        async function loadLocations() {
            try {
                const data = await getLocations();
                if (!cancelled) setLocations(data);
            } catch {
                if (!cancelled) setLocations([]);
            }
        }
        void loadLocations();
        return () => {
            cancelled = true;
        };
    }, [getLocations]);

    const locationOptions = useMemo(
        () => locations.map((entry) => ({ value: entry.name, label: entry.name, id: entry.id })),
        [locations],
    );

    const availableServices = useMemo<Service[]>(
        () => services.map((service) => ({
            id: service.uid ?? service.id,
            uid: service.uid ?? service.id,
            name: service.name,
            code: service.serviceType,
        })),
        [services],
    );

    const availableUsers = useMemo<User[]>(
        () =>
            users.map((user) => ({
                id: user.userUid,
                name: user.displayName,
                role: user.title || user.status,
            })),
        [users],
    );

    const handleNext = () => setStep(s => Math.min(3, s + 1));
    const handlePrev = () => setStep(s => Math.max(1, s - 1));

    const handleNextStep1 = async () => {
        setSubmitting(true);
        const locationOption = locationOptions.find((option) => option.value === location);
        const bookingChannels = toBookingChannels(channels);
        const payload: CreateCalendarPayload = {
            name: name || "Draft Calendar",
            description,
            locationId: locationOption?.id ?? 0,
            locationName: locationOption?.label ?? location,
            services: [],
            users: [],
            channel: bookingChannels[0] ?? 'ONLINE',
            label: [],
            qrLinkRequired: true,
            feature: 'BASE_CRM',
            status: 'DRAFT',
            color: '#0f172a',
            bookingChannels,
            capacityOverride: 0,
            tags: [],
        };
        try {
            if (!draftUid) {
                const created = await createCalendar(payload);
                if (created.uid) setDraftUid(created.uid);
            } else {
                await updateCalendar(draftUid, { ...payload, uid: draftUid });
            }
            handleNext();
        } catch (e) {
            console.error("Failed to save draft", e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNextStep2 = async () => {
        if (!draftUid) return handleNext();
        setSubmitting(true);
        const assignedUsers = Array.from(
            new Set(
                Object.values(serviceUsers)
                    .flat()
                    .map((user) => user.id),
            ),
        );
        const locationOption = locationOptions.find((option) => option.value === location);
        const bookingChannels = toBookingChannels(channels);
        
        const payload: CreateCalendarPayload = {
            uid: draftUid,
            name: name || "Draft Calendar",
            description,
            locationId: locationOption?.id ?? 0,
            locationName: locationOption?.label ?? location,
            services: selectedServices.map((service) => service.uid ?? service.id),
            users: assignedUsers,
            channel: bookingChannels[0] ?? 'ONLINE',
            defaultServiceId: defaultServiceId || undefined,
            label: [],
            qrLinkRequired: true,
            feature: 'BASE_CRM',
            status: 'DRAFT',
            color: '#0f172a',
            bookingChannels,
            capacityOverride: 0,
            tags: [],
        };
        try {
            await updateCalendar(draftUid, payload);
            handleNext();
        } catch (e) {
            console.error("Failed to save services", e);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublish = async () => {
        if (!draftUid) return;
        const hasServices = selectedServices.length > 0;
        const hasSchedule = schedules.length > 0;
        const hasTimeWindows = schedules.some((schedule) => Array.isArray(schedule.timeWindows) && schedule.timeWindows.length > 0);
        if (!hasServices || !hasSchedule || !hasTimeWindows) {
            console.error("Calendar is incomplete for publishing");
            return;
        }
        setSubmitting(true);
        try {
            const locationOption = locationOptions.find((option) => option.value === location);
            const bookingChannels = toBookingChannels(channels);
            const assignedUsers = Array.from(
                new Set(
                    Object.values(serviceUsers)
                        .flat()
                        .map((user) => user.id),
                ),
            );
            
            await updateCalendar(draftUid, {
                uid: draftUid,
                name,
                description,
                locationId: locationOption?.id ?? 0,
                locationName: locationOption?.label ?? location,
                services: selectedServices.map((service) => service.uid ?? service.id),
                users: assignedUsers,
                channel: bookingChannels[0] ?? 'ONLINE',
                defaultServiceId: defaultServiceId || undefined,
                label: [],
                qrLinkRequired: true,
                feature: 'BASE_CRM',
                status: 'ACTIVE',
                color: '#0f172a',
                bookingChannels,
                capacityOverride: 0,
                tags: [],
            });

            for (const schedule of schedules) {
                const schedulePayload: CreateSchedulePayload = {
                    name: schedule.name,
                    description: description || schedule.name,
                    calendarUid: draftUid,
                    calendarName: name,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate || schedule.startDate,
                    slotCapacity: Math.max(
                        ...schedule.timeWindows.map((timeWindow: any) => Number(timeWindow.capacity) || 0),
                        0,
                    ),
                    qrLinkRequired: true,
                    timeWindows: schedule.timeWindows.map((timeWindow: any) => ({
                        calendarUid: draftUid,
                        calendarName: name,
                        scheduleName: schedule.name,
                        weekDays: timeWindow.weekDays,
                        startTime: withSeconds(timeWindow.startTime),
                        endTime: withSeconds(timeWindow.endTime),
                        slotDuration: Number(timeWindow.duration) || 0,
                        slotCapacity: Number(timeWindow.capacity) || 0,
                        channel: bookingChannels[0] ?? 'ONLINE',
                        label: [],
                        qrLinkRequired: true,
                    })),
                };
                await createSchedule(draftUid, schedulePayload);
            }
            navigate('/calendars');
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const publishBlockedReason = useMemo(() => {
        if (selectedServices.length === 0) return "Add at least one service before publishing.";
        if (schedules.length === 0) return "Add a schedule before publishing.";
        if (!schedules.some((schedule) => Array.isArray(schedule.timeWindows) && schedule.timeWindows.length > 0)) {
            return "Add at least one time window before publishing.";
        }
        return "";
    }, [schedules, selectedServices.length]);

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
                        <form className="wizard-form" onSubmit={(e) => { e.preventDefault(); handleNextStep1(); }}>
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
                                    options={locationOptions}
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
                                <div className="checkbox-channel-card">
                                    <Checkbox
                                        checked={channels.ivr}
                                        onChange={(e) => setChannels({...channels, ivr: e.target.checked})}
                                        controlClassName="items-start"
                                        label={<div className="checkbox-desc">
                                            <span className="chk-label">IVR</span>
                                            <span className="chk-subtext">Allow bookings initiated through interactive voice response</span>
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
                                <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
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
                            
                            {selectedServices.length > 0 && (
                                <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-slate-800 mb-2">Default Service (Optional)</h3>
                                    <p className="text-xs text-slate-500 mb-4">Select the primary service for this calendar. This service will be pre-selected when booking appointments.</p>
                                    <Select
                                        value={defaultServiceId}
                                        onChange={(e) => setDefaultServiceId(e.target.value)}
                                        options={[
                                            { value: '', label: 'No Default Service' },
                                            ...selectedServices.map(s => ({ value: s.uid ?? s.id, label: s.name }))
                                        ]}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="wizard-footer-actions mt-8">
                            <Button variant="secondary" className="btn-wizard-back" onClick={handlePrev}>Back</Button>
                            <Button onClick={handleNextStep2} loading={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
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
                                                                        id={`calendar-wizard-weekday-${sIdx}-${twIdx}-${d}`}
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
                            <Button onClick={handlePublish} loading={submitting} disabled={Boolean(publishBlockedReason)}>
                                {submitting ? 'Publishing...' : 'Activate / Publish'}
                            </Button>
                        </div>
                        {publishBlockedReason ? (
                            <p className="mt-3 text-sm text-amber-700">{publishBlockedReason}</p>
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Modals rendered via Portal or conditionally here */}
            <DualListServicesModal 
                isOpen={isServicesModalOpen}
                onClose={() => setIsServicesModalOpen(false)}
                allServices={availableServices}
                initialSelectedServices={selectedServices}
                onSave={setSelectedServices}
            />

            {usersModalServiceId && (
                <DualListUsersModal 
                    isOpen={true}
                    onClose={() => setUsersModalServiceId(null)}
                    serviceName={selectedServices.find(s => s.id === usersModalServiceId)?.name || ''}
                    allUsers={availableUsers}
                    initialSelectedUsers={serviceUsers[usersModalServiceId] || []}
                    loading={usersLoading}
                    error={usersError}
                    onSave={(users) => setServiceUsers(prev => ({ ...prev, [usersModalServiceId]: users }))}
                />
            )}
        </>
    );
}
