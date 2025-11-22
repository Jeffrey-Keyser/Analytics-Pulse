import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentPageviewsCard } from '../RecentPageviewsCard';
import { RecentPageviews } from '../../../models/analytics';

describe('RecentPageviewsCard', () => {
  const mockData: RecentPageviews = {
    count: 156,
    time_window: 'last 30 minutes',
  };

  it('renders the card title', () => {
    render(<RecentPageviewsCard data={mockData} />);
    expect(screen.getByText('Recent Pageviews')).toBeInTheDocument();
  });

  it('displays the time window', () => {
    render(<RecentPageviewsCard data={mockData} />);
    expect(screen.getByText('last 30 minutes')).toBeInTheDocument();
  });

  it('formats pageview count with commas', () => {
    const largeCount: RecentPageviews = {
      ...mockData,
      count: 5678,
    };
    render(<RecentPageviewsCard data={largeCount} />);
    expect(screen.getByText('5,678')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<RecentPageviewsCard data={mockData} loading={true} />);
    // When loading, the count should not be visible
    expect(screen.queryByText('156')).not.toBeInTheDocument();
  });

  it('displays count when not loading', () => {
    render(<RecentPageviewsCard data={mockData} loading={false} />);
    expect(screen.getByText('156')).toBeInTheDocument();
  });
});
