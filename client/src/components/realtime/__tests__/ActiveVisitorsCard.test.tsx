import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveVisitorsCard } from '../ActiveVisitorsCard';
import { ActiveVisitors } from '../../../models/analytics';

describe('ActiveVisitorsCard', () => {
  const mockData: ActiveVisitors = {
    count: 42,
    time_window: 'last 5 minutes',
    timestamp: '2024-01-15T12:30:00Z',
  };

  it('renders the card title', () => {
    render(<ActiveVisitorsCard data={mockData} />);
    expect(screen.getByText('Active Visitors')).toBeInTheDocument();
  });

  it('displays the time window', () => {
    render(<ActiveVisitorsCard data={mockData} />);
    expect(screen.getByText('last 5 minutes')).toBeInTheDocument();
  });

  it('formats visitor count with commas', () => {
    const largeCount: ActiveVisitors = {
      ...mockData,
      count: 1234,
    };
    render(<ActiveVisitorsCard data={largeCount} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('displays "Live" indicator', () => {
    render(<ActiveVisitorsCard data={mockData} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<ActiveVisitorsCard data={mockData} loading={true} />);
    // When loading, the count should not be visible
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('displays count when not loading', () => {
    render(<ActiveVisitorsCard data={mockData} loading={false} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
