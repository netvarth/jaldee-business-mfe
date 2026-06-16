import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { Calendar, User, Service } from './mockCalendarData';
import { useNavigate } from 'react-router-dom';

interface CalendarSidebarProps {
  calendars: Calendar[];
  users: User[];
  services: Service[];
  activeCalendars: string[];
  setActiveCalendars: (ids: string[]) => void;
  activeUsers: string[];
  setActiveUsers: (ids: string[]) => void;
}

export default function CalendarSidebar({
  calendars, users, services,
  activeCalendars, setActiveCalendars,
  activeUsers, setActiveUsers
}: CalendarSidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleCalendarToggle = (id: string) => {
    if (activeCalendars.includes(id)) {
      setActiveCalendars(activeCalendars.filter(cId => cId !== id));
    } else {
      setActiveCalendars([...activeCalendars, id]);
    }
  };

  const handleUserToggle = (id: string) => {
    if (activeUsers.includes(id)) {
      setActiveUsers(activeUsers.filter(uId => uId !== id));
    } else {
      setActiveUsers([...activeUsers, id]);
    }
  };

  return (
    <aside className="dashboard-sidebar w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative transition-all duration-300">
      <div className="sidebar-scrollable-content p-5 overflow-y-auto h-full flex flex-col gap-6">
        
        {/* Calendars Section */}
        <div className={`sidebar-group ${collapsedGroups['calendars'] ? 'collapsed' : ''}`}>
          <div className="sidebar-group-header flex items-center justify-between mb-3">
            <span className="group-title text-[13px] font-bold text-gray-800 uppercase tracking-wide">
              Calendars ({activeCalendars.length}/{calendars.length})
            </span>
            <div className="group-actions flex items-center gap-1">
              <button 
                className="sidebar-action-btn w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors" 
                title="Create Calendar"
                onClick={() => navigate('/calendars/create')}
              >
                <Plus size={14} />
              </button>
              <button 
                className="sidebar-action-btn toggle-group-collapse w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => toggleGroup('calendars')}
              >
                {collapsedGroups['calendars'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          
          {!collapsedGroups['calendars'] && (
            <div className="sidebar-group-body flex flex-col gap-2.5">
              {calendars.map(cal => (
                <label key={cal.id} className="custom-checkbox-container flex items-start relative cursor-pointer select-none text-[13px] font-medium text-gray-800 hover:bg-gray-50 p-1 -mx-1 rounded">
                  <input 
                    type="checkbox" 
                    className="absolute opacity-0 cursor-pointer h-0 w-0 peer"
                    checked={activeCalendars.includes(cal.id)}
                    onChange={() => handleCalendarToggle(cal.id)}
                  />
                  <div className="checkmark relative h-[18px] w-[18px] bg-gray-200 rounded shrink-0 mr-2.5 border border-gray-300 transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600 after:content-[''] after:absolute after:hidden peer-checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"></div>
                  <span className="mt-0.5">{cal.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Users Section */}
        <div className={`sidebar-group ${collapsedGroups['users'] ? 'collapsed' : ''}`}>
          <div className="sidebar-group-header flex items-center justify-between mb-3">
            <span className="group-title text-[13px] font-bold text-gray-800 uppercase tracking-wide">
              Users ({activeUsers.length}/{users.length})
            </span>
            <div className="group-actions flex items-center gap-1">
              <button className="sidebar-action-btn w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="Add User">
                <Plus size={14} />
              </button>
              <button 
                className="sidebar-action-btn toggle-group-collapse w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => toggleGroup('users')}
              >
                {collapsedGroups['users'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          
          {!collapsedGroups['users'] && (
            <div className="sidebar-group-body flex flex-col gap-2.5">
              <div className="sidebar-search-box relative mb-1.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search User" 
                  className="w-full py-1.5 pr-2 pl-7 text-xs border border-gray-200 rounded-lg outline-none bg-gray-50 focus:border-blue-300 focus:bg-white transition-all"
                />
              </div>
              
              <div className="user-checkbox-list flex flex-col gap-2.5">
                {users.map(user => (
                  <div key={user.id} className="checkbox-item-row flex items-center justify-between w-full">
                    <label className="custom-checkbox-container flex items-center relative cursor-pointer select-none text-[13px] font-medium text-gray-800 hover:bg-gray-50 p-1 -mx-1 rounded w-full">
                      <input 
                        type="checkbox" 
                        className="absolute opacity-0 cursor-pointer h-0 w-0 peer"
                        checked={activeUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                      />
                      <div className="checkmark relative h-[18px] w-[18px] bg-gray-200 rounded shrink-0 mr-2.5 border border-gray-300 transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600 after:content-[''] after:absolute after:hidden peer-checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"></div>
                      
                      <div className="user-sidebar-row flex items-center gap-2">
                        <div className={`status-dot w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <div className="avatar-mini w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-purple-600">
                          {user.code}
                        </div>
                        <span className="truncate max-w-[100px]">{user.name}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <button className="see-all-link text-xs text-blue-600 font-semibold text-left pt-1 hover:underline">See All</button>
            </div>
          )}
        </div>

        {/* Services Section */}
        <div className={`sidebar-group ${collapsedGroups['services'] ? 'collapsed' : ''}`}>
          <div className="sidebar-group-header flex items-center justify-between mb-3">
            <span className="group-title text-[13px] font-bold text-gray-800 uppercase tracking-wide">
              Services ({services.length})
            </span>
            <div className="group-actions flex items-center gap-1">
              <button 
                className="sidebar-action-btn toggle-group-collapse w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 transition-colors"
                onClick={() => toggleGroup('services')}
              >
                {collapsedGroups['services'] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          
          {!collapsedGroups['services'] && (
            <div className="sidebar-group-body flex flex-col gap-2.5">
              {services.map(svc => (
                <label key={svc.id} className="custom-checkbox-container flex items-start relative cursor-pointer select-none text-[13px] font-medium text-gray-800 hover:bg-gray-50 p-1 -mx-1 rounded">
                  <input type="checkbox" className="absolute opacity-0 cursor-pointer h-0 w-0 peer" defaultChecked />
                  <div className="checkmark relative h-[18px] w-[18px] bg-gray-200 rounded shrink-0 mr-2.5 border border-gray-300 transition-colors peer-checked:bg-blue-600 peer-checked:border-blue-600 after:content-[''] after:absolute after:hidden peer-checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"></div>
                  <span className="mt-0.5 truncate">{svc.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}
