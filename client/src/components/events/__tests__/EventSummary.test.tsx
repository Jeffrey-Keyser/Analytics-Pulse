import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventSummary } from '../EventSummary';
import { EventCount } from '../../../models/events';

describe('EventSummary', () => {
  const mockEventCounts: EventCount[] = [
    { event_name: 'button_click', count: 150 },
    { event_name: 'form_submit', count: 75 },
    { event_name: 'page_scroll', count: 300 },
  ];

  it('renders event summary title', () => {
    render(<EventSummary eventCounts={mockEventCounts} />);

    expect(screen.getByText('Event Summary')).toBeInTheDocument();
  });

  it('displays total events count', () => {
    render(<EventSummary eventCounts={mockEventCounts} />);

    // Total should be 150 + 75 + 300 = 525
    expect(screen.getByText('525')).toBeInTheDocument();
  });

  it('displays all event counts', () => {
    render(<EventSummary eventCounts={mockEventCounts} />);

    expect(screen.getByText('button_click')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    expect(screen.getByText('form_submit')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();

    expect(screen.getByText('page_scroll')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('displays percentages for each event', () => {
    render(<EventSummary eventCounts={mockEventCounts} />);

    // button_click: 150/525 = 28.6%
    expect(screen.getByText('28.6%')).toBeInTheDocument();

    // form_submit: 75/525 = 14.3%
    expect(screen.getByText('14.3%')).toBeInTheDocument();

    // page_scroll: 300/525 = 57.1%
    expect(screen.getByText('57.1%')).toBeInTheDocument();
  });

  it('shows loading state when loading', () => {
    render(<EventSummary eventCounts={[]} loading={true} />);

    expect(screen.getByText('Loading event counts...')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<EventSummary eventCounts={[]} loading={false} />);

    expect(screen.getByText('No events found')).toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    const largeEventCounts: EventCount[] = [
      { event_name: 'popular_event', count: 12345 },
    ];

    render(<EventSummary eventCounts={largeEventCounts} />);

    // There will be multiple instances of 12,345 (total and in the card)
    // Just verify that at least one exists
    const elements = screen.getAllByText('12,345');
    expect(elements.length).toBeGreaterThan(0);
  });
});
