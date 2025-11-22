import React, { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useThemeColors } from '../../contexts/ThemeContext';

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
  const colors = useThemeColors();
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

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
      marginBottom: '2rem',
      padding: '1rem',
      backgroundColor: colors.background.secondary,
      borderRadius: '8px',
      border: `1px solid ${colors.border.primary}`,
    },
    presets: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap' as const,
    },
    presetButton: {
      padding: '0.5rem 1rem',
      border: `1px solid ${colors.primary.main}`,
      backgroundColor: colors.background.primary,
      color: colors.primary.main,
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.875rem',
      transition: 'all 0.2s',
    },
    customInputs: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap' as const,
    },
    inputGroup: {
      display: 'flex',
      alignItems: 'center' as const,
      gap: '0.5rem',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: colors.text.primary,
    },
    dateInput: {
      padding: '0.5rem',
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '4px',
      fontSize: '0.875rem',
      backgroundColor: colors.background.primary,
      color: colors.text.primary,
    },
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

export default DateRangePicker;
