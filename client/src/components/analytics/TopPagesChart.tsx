import React from 'react';
import { TopPage } from '../../models/analytics';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export interface TopPagesChartProps {
  data: TopPage[];
  loading?: boolean;
}

export function TopPagesChart({ data, loading = false }: TopPagesChartProps) {
  // Shorten URLs for better display
  const formatUrl = (url: string): string => {
    if (url.length > 40) {
      return '...' + url.slice(-37);
    }
    return url;
  };

  // Format data for chart
  const formattedData = data.map((page) => ({
    ...page,
    shortUrl: formatUrl(page.url),
  }));

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#d084d8', '#ffb347', '#a8e6cf'];

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Top Pages</h3>
        <div style={styles.loadingContainer}>
          <div style={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  // PLACEHOLDER: Replace this with actual recharts component after installing the library
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Top Pages</h3>
        <div style={styles.subtitle}>By pageviews</div>
      </div>

      {/* UNCOMMENT AFTER INSTALLING RECHARTS:
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={formattedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="shortUrl" width={150} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', wordBreak: 'break-all' }}>
                      <strong>{data.url}</strong>
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.875rem' }}>
                      Pageviews: {data.pageviews.toLocaleString()}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.875rem' }}>
                      Unique Visitors: {data.unique_visitors.toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="pageviews" fill="#8884d8">
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      */}

      {/* Temporary table view - remove after uncommenting recharts code above */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeader}>Page</th>
              <th style={styles.tableHeader}>Pageviews</th>
              <th style={styles.tableHeader}>Unique Visitors</th>
            </tr>
          </thead>
          <tbody>
            {formattedData.map((page, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <div style={styles.urlCell}>
                    <span style={{ ...styles.colorIndicator, backgroundColor: colors[index % colors.length] }}></span>
                    <span title={page.url}>{page.url}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>{page.pageviews.toLocaleString()}</td>
                <td style={styles.tableCell}>{page.unique_visitors.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={styles.note}>
          Note: Install recharts (<code style={styles.code}>npm install recharts</code>) to see this as a bar chart
        </p>
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
    marginBottom: '2rem',
  },
  header: {
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#666',
    marginTop: '0.25rem',
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
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
  },
  tableCell: {
    padding: '0.75rem',
    fontSize: '0.875rem',
  },
  urlCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  colorIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  note: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#666',
    fontStyle: 'italic',
  },
  code: {
    backgroundColor: '#e0e0e0',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
};

export default TopPagesChart;
