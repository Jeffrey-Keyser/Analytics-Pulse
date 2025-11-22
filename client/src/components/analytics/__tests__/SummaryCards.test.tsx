import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from '../SummaryCards';
import { OverviewStats } from '../../../models/analytics';

describe('SummaryCards', () => {
  const mockStats: OverviewStats = {
    pageviews: 12345,
    unique_visitors: 5678,
    sessions: 3456,
    bounce_rate: 45.5,
    avg_session_duration_seconds: 125,
  };

  it('renders all metric cards', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
    expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('Bounce Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg. Session Duration')).toBeInTheDocument();
  });

  it('formats pageviews with commas', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('formats unique visitors with commas', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('5,678')).toBeInTheDocument();
  });

  it('formats sessions with commas', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('3,456')).toBeInTheDocument();
  });

  it('formats bounce rate as percentage', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('45.5%')).toBeInTheDocument();
  });

  it('formats session duration correctly (minutes and seconds)', () => {
    render(<SummaryCards stats={mockStats} />);

    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('formats short session duration correctly (seconds only)', () => {
    const shortStats: OverviewStats = {
      ...mockStats,
      avg_session_duration_seconds: 45,
    };

    render(<SummaryCards stats={shortStats} />);

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    const { container } = render(<SummaryCards stats={mockStats} loading={true} />);

    // Check for skeleton loaders
    const skeletons = container.querySelectorAll('[style*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays metric values when not loading', () => {
    render(<SummaryCards stats={mockStats} loading={false} />);

    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText('5,678')).toBeInTheDocument();
    expect(screen.getByText('3,456')).toBeInTheDocument();
  });
});
