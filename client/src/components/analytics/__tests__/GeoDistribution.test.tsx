import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeoDistribution } from '../GeoDistribution';
import { CountryDistribution } from '../../../models/analytics';

describe('GeoDistribution', () => {
  const mockData: CountryDistribution[] = [
    { country: 'United States', visitors: 1500, sessions: 2000, percentage: 45.5 },
    { country: 'United Kingdom', visitors: 800, sessions: 1100, percentage: 24.2 },
    { country: 'Canada', visitors: 500, sessions: 650, percentage: 15.1 },
    { country: 'Australia', visitors: 300, sessions: 400, percentage: 9.1 },
    { country: 'Germany', visitors: 200, sessions: 250, percentage: 6.1 },
  ];

  it('renders component title', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.getByText('Geographic Distribution')).toBeInTheDocument();
  });

  it('renders all table headers', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.getByText(/Country/)).toBeInTheDocument();
    expect(screen.getByText(/Visitors/)).toBeInTheDocument();
    expect(screen.getByText(/Sessions/)).toBeInTheDocument();
    expect(screen.getByText(/Percentage/)).toBeInTheDocument();
    expect(screen.getByText(/Distribution/)).toBeInTheDocument();
  });

  it('renders all country data', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('Australia')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('formats numbers with commas', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
  });

  it('displays percentages with one decimal place', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.getByText('45.5%')).toBeInTheDocument();
    expect(screen.getByText('24.2%')).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    const { container } = render(<GeoDistribution data={mockData} loading={true} />);

    // Check for skeleton loader
    const skeleton = container.querySelector('[style*="skeleton"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows empty state when no data provided', () => {
    render(<GeoDistribution data={[]} />);

    expect(screen.getByText('No geographic data available')).toBeInTheDocument();
  });

  it('sorts by visitors descending by default', () => {
    render(<GeoDistribution data={mockData} />);

    const rows = screen.getAllByRole('row');
    // First row is header, second row should be United States (highest visitors)
    expect(rows[1]).toHaveTextContent('United States');
  });

  it('sorts by country name when country header is clicked', () => {
    render(<GeoDistribution data={mockData} />);

    const countryHeader = screen.getByText(/Country/);
    fireEvent.click(countryHeader);

    const rows = screen.getAllByRole('row');
    // After sorting alphabetically, Australia should be first
    expect(rows[1]).toHaveTextContent('Australia');
  });

  it('toggles sort direction when clicking same header twice', () => {
    render(<GeoDistribution data={mockData} />);

    const visitorsHeader = screen.getByText(/Visitors/);

    // First click - should sort descending (default direction)
    fireEvent.click(visitorsHeader);
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('United States');

    // Second click - should sort ascending
    fireEvent.click(visitorsHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Germany');
  });

  it('shows footer with count when more than 10 countries', () => {
    const manyCountries = [...mockData, ...mockData].slice(0, 12);
    render(<GeoDistribution data={manyCountries} />);

    expect(screen.getByText(/Showing 12 countries/)).toBeInTheDocument();
  });

  it('does not show footer when 10 or fewer countries', () => {
    render(<GeoDistribution data={mockData} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('displays sort icons in headers', () => {
    render(<GeoDistribution data={mockData} />);

    const countryHeader = screen.getByText(/Country/);
    expect(countryHeader.textContent).toMatch(/⇅|↑|↓/);
  });
});
