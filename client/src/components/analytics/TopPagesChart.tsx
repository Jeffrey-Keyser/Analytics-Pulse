import React from 'react';
import { TopPage } from '../../models/analytics';
import { useThemeColors } from '../../contexts/ThemeContext';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export interface TopPagesChartProps {
  data: TopPage[];
  loading?: boolean;
}

export function TopPagesChart({ data, loading = false }: TopPagesChartProps) {
  const colors = useThemeColors();

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

  const chartColors = [
    colors.charts.bar1,
    colors.charts.bar2,
    colors.charts.bar3,
    colors.charts.bar4,
    colors.charts.bar5,
    colors.charts.line1,
    colors.charts.line2,
    colors.charts.line3,
  ];

  const styles = {
    container: {
      backgroundColor: colors.background.secondary,
      border: `1px solid ${colors.border.primary}`,
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
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: '0.875rem',
      color: colors.text.secondary,
      marginTop: '0.25rem',
    },
    loadingContainer: {
      height: '400px',
      display: 'flex',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    skeleton: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.border.primary,
      borderRadius: '4px',
    },
    tableContainer: {
      overflowX: 'auto' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    tableHeaderRow: {
      borderBottom: `2px solid ${colors.border.primary}`,
    },
    tableHeader: {
      textAlign: 'left' as const,
      padding: '0.75rem',
      fontSize: '0.875rem',
      fontWeight: 600,
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
    },
    tableRow: {
      borderBottom: `1px solid ${colors.border.primary}`,
    },
    tableCell: {
      padding: '0.75rem',
      fontSize: '0.875rem',
      color: colors.text.primary,
    },
    urlCell: {
      display: 'flex',
      alignItems: 'center' as const,
      gap: '0.5rem',
      maxWidth: '400px',
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      whiteSpace: 'nowrap' as const,
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
      color: colors.text.secondary,
      fontStyle: 'italic' as const,
    },
    code: {
      backgroundColor: colors.border.primary,
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontFamily: 'monospace',
    },
  };

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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.charts.grid} />
          <XAxis type="number" stroke={colors.charts.axis} />
          <YAxis type="category" dataKey="shortUrl" width={150} stroke={colors.charts.axis} />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.charts.tooltip.background,
              border: `1px solid ${colors.charts.tooltip.border}`,
              borderRadius: '4px',
              color: colors.charts.tooltip.text,
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{
                    backgroundColor: colors.charts.tooltip.background,
                    padding: '10px',
                    border: `1px solid ${colors.charts.tooltip.border}`,
                    borderRadius: '4px',
                    color: colors.charts.tooltip.text,
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
          <Bar dataKey="pageviews" fill={colors.charts.bar1}>
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
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
                    <span style={{ ...styles.colorIndicator, backgroundColor: chartColors[index % chartColors.length] }}></span>
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

export default TopPagesChart;
