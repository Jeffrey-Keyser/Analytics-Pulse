import React from 'react';
import { CurrentPage } from '../../models/analytics';

export interface CurrentPagesTableProps {
  pages: CurrentPage[];
  loading?: boolean;
}

export function CurrentPagesTable({ pages, loading = false }: CurrentPagesTableProps) {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const truncateUrl = (url: string, maxLength: number = 60): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Current Pages</h3>
        <div style={styles.skeleton}></div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Current Pages</h3>
        <div style={styles.emptyState}>
          <p>No active pages at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Current Pages</h3>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Page URL</th>
              <th style={{ ...styles.th, ...styles.numericColumn }}>Active Visitors</th>
              <th style={{ ...styles.th, ...styles.numericColumn }}>Pageviews</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td} title={page.url}>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {truncateUrl(page.url)}
                  </a>
                </td>
                <td style={{ ...styles.td, ...styles.numericColumn }}>
                  <span style={styles.badge}>
                    {formatNumber(page.active_visitors)}
                  </span>
                </td>
                <td style={{ ...styles.td, ...styles.numericColumn }}>
                  {formatNumber(page.pageviews)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#333',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e0e0e0',
  },
  tr: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '1rem 0.75rem',
    fontSize: '0.9375rem',
    color: '#333',
  },
  numericColumn: {
    textAlign: 'right',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  skeleton: {
    height: '12rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite',
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#888',
  },
};

export default CurrentPagesTable;
