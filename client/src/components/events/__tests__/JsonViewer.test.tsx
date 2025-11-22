import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JsonViewer } from '../JsonViewer';

describe('JsonViewer', () => {
  const mockData = {
    buttonId: 'submit-btn',
    action: 'click',
    timestamp: 1234567890,
  };

  it('renders "Show JSON" button when collapsed', () => {
    render(<JsonViewer data={mockData} />);

    expect(screen.getByText(/Show JSON/i)).toBeInTheDocument();
  });

  it('renders "Hide JSON" button when expanded', () => {
    render(<JsonViewer data={mockData} />);

    const button = screen.getByText(/Show JSON/i);
    fireEvent.click(button);

    expect(screen.getByText(/Hide JSON/i)).toBeInTheDocument();
  });

  it('displays JSON content when expanded', () => {
    render(<JsonViewer data={mockData} />);

    const button = screen.getByText(/Show JSON/i);
    fireEvent.click(button);

    // Check for individual JSON properties instead of the full formatted string
    expect(screen.getByText(/buttonId/)).toBeInTheDocument();
    expect(screen.getByText(/submit-btn/)).toBeInTheDocument();
  });

  it('hides JSON content when collapsed', () => {
    render(<JsonViewer data={mockData} />);

    const button = screen.getByText(/Show JSON/i);
    fireEvent.click(button);

    // Verify content is visible
    expect(screen.getByText(/buttonId/)).toBeInTheDocument();

    // Collapse and verify content is hidden
    fireEvent.click(screen.getByText(/Hide JSON/i));
    expect(screen.queryByText(/buttonId/)).not.toBeInTheDocument();
  });

  it('renders "No custom data" when data is null', () => {
    render(<JsonViewer data={null} />);

    expect(screen.getByText('No custom data')).toBeInTheDocument();
  });

  it('renders "No custom data" when data is empty object', () => {
    render(<JsonViewer data={{}} />);

    expect(screen.getByText('No custom data')).toBeInTheDocument();
  });

  it('toggles between expanded and collapsed states', () => {
    render(<JsonViewer data={mockData} />);

    const button = screen.getByRole('button');

    // Initially collapsed
    expect(screen.getByText(/Show JSON/i)).toBeInTheDocument();

    // Click to expand
    fireEvent.click(button);
    expect(screen.getByText(/Hide JSON/i)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(button);
    expect(screen.getByText(/Show JSON/i)).toBeInTheDocument();
  });
});
