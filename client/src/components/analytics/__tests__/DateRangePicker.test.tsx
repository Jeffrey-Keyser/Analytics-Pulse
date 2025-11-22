import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '../DateRangePicker';
import { format, subDays } from 'date-fns';

describe('DateRangePicker', () => {
  const mockOnDateRangeChange = vi.fn();

  beforeEach(() => {
    mockOnDateRangeChange.mockClear();
  });

  it('renders preset buttons', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 14 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
  });

  it('renders date inputs with labels', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    expect(screen.getByLabelText('From:')).toBeInTheDocument();
    expect(screen.getByLabelText('To:')).toBeInTheDocument();
  });

  it('uses default date range (last 30 days) when no initial dates provided', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const today = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const startInput = screen.getByLabelText('From:') as HTMLInputElement;
    const endInput = screen.getByLabelText('To:') as HTMLInputElement;

    expect(startInput.value).toBe(thirtyDaysAgo);
    expect(endInput.value).toBe(today);
  });

  it('uses provided initial dates', () => {
    const initialStart = '2024-01-01';
    const initialEnd = '2024-01-31';

    render(
      <DateRangePicker
        onDateRangeChange={mockOnDateRangeChange}
        initialStartDate={initialStart}
        initialEndDate={initialEnd}
      />
    );

    const startInput = screen.getByLabelText('From:') as HTMLInputElement;
    const endInput = screen.getByLabelText('To:') as HTMLInputElement;

    expect(startInput.value).toBe(initialStart);
    expect(endInput.value).toBe(initialEnd);
  });

  it('calls onDateRangeChange when preset button is clicked', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const last7DaysButton = screen.getByText('Last 7 days');
    fireEvent.click(last7DaysButton);

    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(1);
    const [startDate, endDate] = mockOnDateRangeChange.mock.calls[0];
    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();
  });

  it('calls onDateRangeChange when start date is changed', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const startInput = screen.getByLabelText('From:') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2024-01-15' } });

    expect(mockOnDateRangeChange).toHaveBeenCalledWith(
      '2024-01-15',
      expect.any(String)
    );
  });

  it('calls onDateRangeChange when end date is changed', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const endInput = screen.getByLabelText('To:') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '2024-01-31' } });

    expect(mockOnDateRangeChange).toHaveBeenCalledWith(
      expect.any(String),
      '2024-01-31'
    );
  });

  it('updates date range for Last 14 days preset', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const last14DaysButton = screen.getByText('Last 14 days');
    fireEvent.click(last14DaysButton);

    const today = format(new Date(), 'yyyy-MM-dd');
    const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    expect(mockOnDateRangeChange).toHaveBeenCalledWith(fourteenDaysAgo, today);
  });

  it('updates date range for Last 90 days preset', () => {
    render(<DateRangePicker onDateRangeChange={mockOnDateRangeChange} />);

    const last90DaysButton = screen.getByText('Last 90 days');
    fireEvent.click(last90DaysButton);

    const today = format(new Date(), 'yyyy-MM-dd');
    const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

    expect(mockOnDateRangeChange).toHaveBeenCalledWith(ninetyDaysAgo, today);
  });
});
