import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventRow } from '../EventRow';
import { CustomEvent } from '../../../models/events';

describe('EventRow', () => {
  const mockEvent: CustomEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    event_name: 'button_click',
    url: 'https://example.com/page',
    custom_data: {
      buttonId: 'submit-btn',
      action: 'click',
    },
    timestamp: '2024-01-15T10:30:00.000Z',
    session_id: 'session123',
    ip_hash: 'hash123',
    country: 'United States',
    city: 'New York',
    browser: 'Chrome',
    os: 'Windows',
    device_type: 'Desktop',
  };

  it('renders event name', () => {
    render(
      <table>
        <tbody>
          <EventRow event={mockEvent} />
        </tbody>
      </table>
    );

    expect(screen.getByText('button_click')).toBeInTheDocument();
  });

  it('renders URL as a link', () => {
    render(
      <table>
        <tbody>
          <EventRow event={mockEvent} />
        </tbody>
      </table>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/page');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('truncates long URLs', () => {
    const eventWithLongUrl: CustomEvent = {
      ...mockEvent,
      url: 'https://example.com/very/long/path/that/should/be/truncated/because/it/exceeds/fifty/characters',
    };

    render(
      <table>
        <tbody>
          <EventRow event={eventWithLongUrl} />
        </tbody>
      </table>
    );

    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(
      <table>
        <tbody>
          <EventRow event={mockEvent} />
        </tbody>
      </table>
    );

    // The exact format depends on locale, but should contain date elements
    expect(screen.getByText(/Jan/i)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('renders metadata when available', () => {
    render(
      <table>
        <tbody>
          <EventRow event={mockEvent} />
        </tbody>
      </table>
    );

    expect(screen.getByText(/Location:/)).toBeInTheDocument();
    expect(screen.getByText(/New York, United States/)).toBeInTheDocument();
    expect(screen.getByText(/Browser:/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/OS:/)).toBeInTheDocument();
    expect(screen.getByText(/Windows/)).toBeInTheDocument();
    expect(screen.getByText(/Device:/)).toBeInTheDocument();
    expect(screen.getByText(/Desktop/)).toBeInTheDocument();
  });

  it('handles missing optional metadata fields', () => {
    const eventWithoutMetadata: CustomEvent = {
      ...mockEvent,
      country: null,
      city: null,
      browser: null,
      os: null,
      device_type: null,
    };

    render(
      <table>
        <tbody>
          <EventRow event={eventWithoutMetadata} />
        </tbody>
      </table>
    );

    // Should not render metadata sections
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Browser:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OS:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Device:/)).not.toBeInTheDocument();
  });

  it('renders JsonViewer for custom data', () => {
    render(
      <table>
        <tbody>
          <EventRow event={mockEvent} />
        </tbody>
      </table>
    );

    // JsonViewer should render "Show JSON" button
    expect(screen.getByText(/Show JSON/i)).toBeInTheDocument();
  });

  it('displays location without city if city is null', () => {
    const eventWithoutCity: CustomEvent = {
      ...mockEvent,
      city: null,
    };

    render(
      <table>
        <tbody>
          <EventRow event={eventWithoutCity} />
        </tbody>
      </table>
    );

    // Should show country only
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    expect(screen.queryByText(/New York,/)).not.toBeInTheDocument();
  });
});
