import React from 'react';
import { 
  Grid, List, ChevronLeft, ChevronRight, Calendar, 
  Filter, Plus, ChevronDown 
} from 'lucide-react';

interface CalendarToolbarProps {
  viewMode: 'day' | 'week' | 'month';
  setViewMode: (mode: 'day' | 'week' | 'month') => void;
  viewBy: 'doctors' | 'calendars' | 'departments';
  setViewBy: (view: 'doctors' | 'calendars' | 'departments') => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  currentDateDisplay: string;
  isFilterActive: boolean;
  onToggleFilter: () => void;
}

export default function CalendarToolbar({
  viewMode, setViewMode, viewBy, setViewBy,
  onPrevDate, onNextDate, currentDateDisplay,
  isFilterActive, onToggleFilter
}: CalendarToolbarProps) {
  return (
    <div className="toolbar border-b border-gray-200 bg-white px-4 py-2 flex items-center justify-between" style={{ height: '60px' }}>
      <div className="toolbar-left flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-blue-600 bg-blue-50 rounded">
            <Grid size={18} />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded hidden">
            <List size={18} />
          </button>
        </div>
        
        <div className="view-pill-group flex items-center bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map(mode => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors ${
                viewMode === mode 
                  ? 'bg-white shadow-sm text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="date-navigator flex items-center gap-2">
          <button onClick={onPrevDate} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
            <ChevronLeft size={18} />
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
            <Calendar size={16} className="text-gray-400" />
            <span>{currentDateDisplay}</span>
          </button>
          <button onClick={onNextDate} className="p-1.5 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="toolbar-right flex items-center gap-3">
        <div className="group-select-wrapper">
          <select 
            value={viewBy} 
            onChange={e => setViewBy(e.target.value as any)}
            className="custom-select bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
          >
            <option value="doctors">View by doctors</option>
            <option value="calendars">View by calendars</option>
            <option value="departments">View by departments</option>
          </select>
        </div>

        <button 
          onClick={onToggleFilter}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            isFilterActive 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter size={16} />
          <span>Filter</span>
          {isFilterActive && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              Applied
            </span>
          )}
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={16} />
          <span>Appointment</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors">
          <span>Create</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
