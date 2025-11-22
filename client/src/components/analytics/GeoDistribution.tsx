import React, { useState } from 'react';
import { CountryDistribution } from '../../models/analytics';

export interface GeoDistributionProps {
  data: CountryDistribution[];
  loading?: boolean;
}

type SortField = 'country' | 'visitors' | 'sessions' | 'percentage';
type SortDirection = 'asc' | 'desc';

export function GeoDistribution({ data, loading = false }: GeoDistributionProps) {
  const [sortField, setSortField] = useState<SortField>('visitors');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'country') {
      return multiplier * a.country.localeCompare(b.country);
    }

    return multiplier * (a[sortField] - b[sortField]);
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Geographic Distribution</h3>
        <div style={styles.loadingContainer}>
          <div style={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Geographic Distribution</h3>
        <div style={styles.emptyState}>
          <p>No geographic data available</p>
        </div>
      </div>
    );
  }

  const getSortIcon = (field: SortField): string => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Geographic Distribution</h3>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th
                style={styles.sortableHeader}
                onClick={() => handleSort('country')}
              >
                Country {getSortIcon('country')}
              </th>
              <th
                style={styles.sortableHeader}
                onClick={() => handleSort('visitors')}
              >
                Visitors {getSortIcon('visitors')}
              </th>
              <th
                style={styles.sortableHeader}
                onClick={() => handleSort('sessions')}
              >
                Sessions {getSortIcon('sessions')}
              </th>
              <th
                style={styles.sortableHeader}
                onClick={() => handleSort('percentage')}
              >
                Percentage {getSortIcon('percentage')}
              </th>
              <th style={styles.tableHeader}>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((country, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <div style={styles.countryCell}>
                    <span style={styles.countryName}>{country.country}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>{country.visitors.toLocaleString()}</td>
                <td style={styles.tableCell}>{country.sessions.toLocaleString()}</td>
                <td style={styles.tableCell}>{country.percentage.toFixed(1)}%</td>
                <td style={styles.tableCell}>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${country.percentage}%`,
                      }}
                    ></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 10 && (
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Showing {data.length} {data.length === 1 ? 'country' : 'countries'}
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  title: {
    margin: 0,
    marginBottom: '1rem',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  loadingContainer: {
    height: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
  },
  emptyState: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    borderBottom: '2px solid #e0e0e0',
  },
  tableHeader: {
    textAlign: 'left',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
  },
  sortableHeader: {
    textAlign: 'left',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.2s',
  },
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '0.75rem',
    fontSize: '0.875rem',
  },
  countryCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  countryName: {
    fontWeight: 500,
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    minWidth: '100px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0088FE',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  footer: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#666',
  },
};

export default GeoDistribution;
