import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LastUpdatedIndicator } from '../LastUpdatedIndicator';

describe('LastUpdatedIndicator', () => {
  const mockTimestamp = '2024-01-15T12:30:00Z';

  beforeEach(() => {
    // Mock the current time to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:30:30Z')); // 30 seconds after mockTimestamp
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays "Last updated:" label', () => {
    render(<LastUpdatedIndicator timestamp={mockTimestamp} />);
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
  });

  it('shows formatted time', () => {
    render(<LastUpdatedIndicator timestamp={mockTimestamp} />);
    // Time format depends on locale, so just check that some time is displayed
    const timeElements = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeElements).toBeInTheDocument();
  });

  it('shows relative time', () => {
    render(<LastUpdatedIndicator timestamp={mockTimestamp} />);
    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('shows "Paused" indicator when isPaused is true', () => {
    render(<LastUpdatedIndicator timestamp={mockTimestamp} isPaused={true} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('does not show "Paused" indicator when isPaused is false', () => {
    render(<LastUpdatedIndicator timestamp={mockTimestamp} isPaused={false} />);
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });

  it('displays "just now" for very recent timestamps', () => {
    const recentTimestamp = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
    vi.setSystemTime(Date.now());
    render(<LastUpdatedIndicator timestamp={recentTimestamp} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });
});
