import React, { useState, useEffect } from 'react';
import { DateRangePicker } from '../analytics/DateRangePicker';
import { EventCount } from '../../models/events';

export interface EventFiltersProps {
  eventCounts: EventCount[];
  onFilterChange: (filters: {
    eventName: string;
    startDate: string;
    endDate: string;
    searchTerm: string;
  }) => void;
  loading?: boolean;
}

export function EventFilters({ eventCounts, onFilterChange, loading }: EventFiltersProps) {
  const [selectedEventName, setSelectedEventName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Trigger filter change whenever any filter changes
  useEffect(() => {
    onFilterChange({
      eventName: selectedEventName,
      startDate,
      endDate,
      searchTerm,
    });
  }, [selectedEventName, startDate, endDate, searchTerm, onFilterChange]);

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleEventNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEventName(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedEventName('');
    setSearchTerm('');
    // Don't clear date range as it's typically kept
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={styles.filterGroup}>
          <label htmlFor="event-name-filter" style={styles.label}>
            Event Name:
          </label>
          <select
            id="event-name-filter"
            value={selectedEventName}
            onChange={handleEventNameChange}
            disabled={loading}
            style={styles.select}
          >
            <option value="">All Events</option>
            {eventCounts.map((eventCount) => (
              <option key={eventCount.event_name} value={eventCount.event_name}>
                {eventCount.event_name} ({eventCount.count})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label htmlFor="search-input" style={styles.label}>
            Search:
          </label>
          <input
            type="text"
            id="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by URL or custom data..."
            disabled={loading}
            style={styles.searchInput}
          />
        </div>

        <button onClick={handleClearFilters} style={styles.clearButton} disabled={loading}>
          Clear Filters
        </button>
      </div>

      <DateRangePicker
        onDateRangeChange={handleDateRangeChange}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '2rem',
  },
  row: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: '1rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: '200px',
    flex: 1,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
  },
  searchInput: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
  clearButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #6c757d',
    backgroundColor: 'white',
    color: '#6c757d',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    height: 'fit-content',
  },
};

export default EventFilters;
