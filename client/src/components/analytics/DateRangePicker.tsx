import React, { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

const presetRanges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export function DateRangePicker({ onDateRangeChange, initialStartDate, initialEndDate }: DateRangePickerProps) {
  const today = endOfDay(new Date());
  const defaultStart = initialStartDate || format(subDays(today, 30), 'yyyy-MM-dd');
  const defaultEnd = initialEndDate || format(today, 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const handlePresetClick = (days: number) => {
    const end = format(today, 'yyyy-MM-dd');
    const start = format(subDays(today, days), 'yyyy-MM-dd');
    setStartDate(start);
    setEndDate(end);
    onDateRangeChange(start, end);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
      onDateRangeChange(value, endDate);
    } else {
      setEndDate(value);
      onDateRangeChange(startDate, value);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.presets}>
        {presetRanges.map((preset) => (
          <button
            key={preset.days}
            onClick={() => handlePresetClick(preset.days)}
            style={styles.presetButton}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div style={styles.customInputs}>
        <div style={styles.inputGroup}>
          <label htmlFor="start-date" style={styles.label}>
            From:
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => handleCustomDateChange('start', e.target.value)}
            max={endDate}
            style={styles.dateInput}
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="end-date" style={styles.label}>
            To:
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => handleCustomDateChange('end', e.target.value)}
            min={startDate}
            max={format(today, 'yyyy-MM-dd')}
            style={styles.dateInput}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  presets: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  presetButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #007bff',
    backgroundColor: 'white',
    color: '#007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  },
  customInputs: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  dateInput: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.875rem',
  },
};

export default DateRangePicker;
