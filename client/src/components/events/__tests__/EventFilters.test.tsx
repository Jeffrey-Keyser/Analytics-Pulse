import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventFilters } from '../EventFilters';
import { EventCount } from '../../../models/events';

describe('EventFilters', () => {
  const mockEventCounts: EventCount[] = [
    { event_name: 'button_click', count: 150 },
    { event_name: 'form_submit', count: 75 },
    { event_name: 'page_scroll', count: 300 },
  ];

  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event name dropdown with all events', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    const select = screen.getByLabelText(/Event Name:/i);
    expect(select).toBeInTheDocument();

    // Check that all events are in the dropdown
    expect(screen.getByText('button_click (150)')).toBeInTheDocument();
    expect(screen.getByText('form_submit (75)')).toBeInTheDocument();
    expect(screen.getByText('page_scroll (300)')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    const searchInput = screen.getByLabelText(/Search:/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search by URL or custom data...');
  });

  it('renders clear filters button', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('calls onFilterChange when event name is selected', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    const select = screen.getByLabelText(/Event Name:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'button_click' } });

    expect(mockOnFilterChange).toHaveBeenCalled();
    const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
    expect(lastCall.eventName).toBe('button_click');
  });

  it('calls onFilterChange when search term changes', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    const searchInput = screen.getByLabelText(/Search:/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(mockOnFilterChange).toHaveBeenCalled();
    const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
    expect(lastCall.searchTerm).toBe('test search');
  });

  it('clears event name and search when clear filters is clicked', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    // Set some filters
    const select = screen.getByLabelText(/Event Name:/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'button_click' } });

    const searchInput = screen.getByLabelText(/Search:/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    // Check that filters are cleared
    expect(select.value).toBe('');
    expect(searchInput.value).toBe('');
  });

  it('disables inputs when loading', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} loading={true} />);

    const select = screen.getByLabelText(/Event Name:/i) as HTMLSelectElement;
    const searchInput = screen.getByLabelText(/Search:/i) as HTMLInputElement;
    const clearButton = screen.getByText('Clear Filters') as HTMLButtonElement;

    expect(select.disabled).toBe(true);
    expect(searchInput.disabled).toBe(true);
    expect(clearButton.disabled).toBe(true);
  });

  it('includes DateRangePicker component', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    // DateRangePicker should render preset buttons
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('shows "All Events" option in dropdown', () => {
    render(<EventFilters eventCounts={mockEventCounts} onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('All Events')).toBeInTheDocument();
  });
});
