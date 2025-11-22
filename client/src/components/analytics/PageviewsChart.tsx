import React from 'react';
import { TimeSeriesDataPoint } from '../../models/analytics';
import { format, parseISO } from 'date-fns';
import { useThemeColors } from '../../contexts/ThemeContext';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface PageviewsChartProps {
  data: TimeSeriesDataPoint[];
  loading?: boolean;
}

export function PageviewsChart({ data, loading = false }: PageviewsChartProps) {
  const colors = useThemeColors();
  // Format the data for the chart
  const formattedData = data.map((point) => ({
    ...point,
    date: format(parseISO(point.date), 'MMM dd'),
  }));

  const styles = {
    container: {
      backgroundColor: colors.background.secondary,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '2rem',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: '1rem',
      flexWrap: 'wrap' as const,
      gap: '1rem',
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: 600,
      color: colors.text.primary,
    },
    legend: {
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap' as const,
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center' as const,
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: colors.text.primary,
    },
    legendDot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
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
    placeholder: {
      height: '400px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.background.tertiary,
      borderRadius: '4px',
      border: `2px dashed ${colors.border.primary}`,
    },
    placeholderText: {
      margin: '0.5rem 0',
      fontSize: '1rem',
      color: colors.text.secondary,
    },
    code: {
      backgroundColor: colors.border.primary,
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      fontFamily: 'monospace',
    },
    dataPreview: {
      marginTop: '2rem',
      padding: '1rem',
      backgroundColor: colors.background.secondary,
      borderRadius: '4px',
      maxWidth: '600px',
      textAlign: 'left' as const,
    },
    pre: {
      backgroundColor: colors.background.tertiary,
      padding: '1rem',
      borderRadius: '4px',
      overflow: 'auto' as const,
      fontSize: '0.875rem',
      color: colors.text.primary,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Pageviews Over Time</h3>
        <div style={styles.loadingContainer}>
          <div style={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  // PLACEHOLDER: Replace this with actual recharts component after installing the library
  // This is a temporary placeholder to show the structure
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Pageviews Over Time</h3>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: colors.charts.line1 }}></span>
            <span>Pageviews</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: colors.charts.line2 }}></span>
            <span>Unique Visitors</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: colors.charts.line3 }}></span>
            <span>Sessions</span>
          </div>
        </div>
      </div>

      {/* UNCOMMENT AFTER INSTALLING RECHARTS:
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pageviews" stroke="#8884d8" strokeWidth={2} />
          <Line type="monotone" dataKey="unique_visitors" stroke="#82ca9d" strokeWidth={2} />
          <Line type="monotone" dataKey="sessions" stroke="#ffc658" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      */}

      {/* Temporary placeholder - remove after uncommenting recharts code above */}
      <div style={styles.placeholder}>
        <p style={styles.placeholderText}>
          Line chart will be displayed here after installing recharts.
        </p>
        <p style={styles.placeholderText}>
          Run: <code style={styles.code}>npm install recharts</code>
        </p>
        <div style={styles.dataPreview}>
          <strong>Data Preview:</strong>
          <pre style={styles.pre}>{JSON.stringify(formattedData.slice(0, 3), null, 2)}</pre>
          {formattedData.length > 3 && <p>... and {formattedData.length - 3} more data points</p>}
        </div>
      </div>
    </div>
  );
}

export default PageviewsChart;
