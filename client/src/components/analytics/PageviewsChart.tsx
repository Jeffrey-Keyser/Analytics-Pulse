import React from 'react';
import { TimeSeriesDataPoint } from '../../models/analytics';
import { format, parseISO } from 'date-fns';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface PageviewsChartProps {
  data: TimeSeriesDataPoint[];
  loading?: boolean;
}

export function PageviewsChart({ data, loading = false }: PageviewsChartProps) {
  // Format the data for the chart
  const formattedData = data.map((point) => ({
    ...point,
    date: format(parseISO(point.date), 'MMM dd'),
  }));

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
            <span style={{ ...styles.legendDot, backgroundColor: '#8884d8' }}></span>
            <span>Pageviews</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#82ca9d' }}></span>
            <span>Unique Visitors</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#ffc658' }}></span>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  legend: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
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
  placeholder: {
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '2px dashed #ccc',
  },
  placeholderText: {
    margin: '0.5rem 0',
    fontSize: '1rem',
    color: '#666',
  },
  code: {
    backgroundColor: '#e0e0e0',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  dataPreview: {
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '4px',
    maxWidth: '600px',
    textAlign: 'left',
  },
  pre: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.875rem',
  },
};

export default PageviewsChart;
