import React from 'react';
import { CustomEvent } from '../../models/events';
import { JsonViewer } from './JsonViewer';

export interface EventRowProps {
  event: CustomEvent;
}

export function EventRow({ event }: EventRowProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <tr style={styles.row}>
      <td style={styles.cell}>{event.event_name}</td>
      <td style={styles.cell}>
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          title={event.url}
        >
          {event.url.length > 50 ? `${event.url.substring(0, 50)}...` : event.url}
        </a>
      </td>
      <td style={styles.cell}>{formatTimestamp(event.timestamp)}</td>
      <td style={styles.cell}>
        <JsonViewer data={event.custom_data} />
      </td>
      <td style={styles.cellMeta}>
        {event.country && (
          <div style={styles.metaItem}>
            <strong>Location:</strong> {event.city ? `${event.city}, ` : ''}{event.country}
          </div>
        )}
        {event.browser && (
          <div style={styles.metaItem}>
            <strong>Browser:</strong> {event.browser}
          </div>
        )}
        {event.os && (
          <div style={styles.metaItem}>
            <strong>OS:</strong> {event.os}
          </div>
        )}
        {event.device_type && (
          <div style={styles.metaItem}>
            <strong>Device:</strong> {event.device_type}
          </div>
        )}
      </td>
    </tr>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    borderBottom: '1px solid #e0e0e0',
  },
  cell: {
    padding: '1rem',
    verticalAlign: 'top',
  },
  cellMeta: {
    padding: '1rem',
    verticalAlign: 'top',
    fontSize: '0.75rem',
    color: '#6c757d',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
  metaItem: {
    marginBottom: '0.25rem',
  },
};

export default EventRow;
