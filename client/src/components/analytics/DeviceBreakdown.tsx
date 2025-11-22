import React from 'react';
import { DeviceBreakdown as DeviceBreakdownType } from '../../models/analytics';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface DeviceBreakdownProps {
  data: DeviceBreakdownType[];
  loading?: boolean;
}

export function DeviceBreakdown({ data, loading = false }: DeviceBreakdownProps) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Device Breakdown</h3>
        <div style={styles.loadingContainer}>
          <div style={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Device Breakdown</h3>
        <div style={styles.emptyState}>
          <p>No device data available</p>
        </div>
      </div>
    );
  }

  // PLACEHOLDER: Replace this with actual recharts component after installing the library
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Device Breakdown</h3>

      {/* UNCOMMENT AFTER INSTALLING RECHARTS:
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ device_type, percentage }) => `${device_type}: ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
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
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      <strong>{data.device_type}</strong>
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.875rem' }}>
                      Count: {data.count.toLocaleString()}
                    </p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.875rem' }}>
                      Percentage: {data.percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      */}

      {/* Temporary list view - remove after uncommenting recharts code above */}
      <div style={styles.listContainer}>
        {data.map((device, index) => (
          <div key={index} style={styles.listItem}>
            <div style={styles.deviceInfo}>
              <span style={{ ...styles.colorDot, backgroundColor: COLORS[index % COLORS.length] }}></span>
              <span style={styles.deviceName}>{device.device_type}</span>
            </div>
            <div style={styles.deviceStats}>
              <span style={styles.count}>{device.count.toLocaleString()}</span>
              <span style={styles.percentage}>({device.percentage.toFixed(1)}%)</span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${device.percentage}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              ></div>
            </div>
          </div>
        ))}
        <p style={styles.note}>
          Note: Install recharts (<code style={styles.code}>npm install recharts</code>) to see this as a pie chart
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
  title: {
    margin: 0,
    marginBottom: '1rem',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  loadingContainer: {
    height: '300px',
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
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  listItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  deviceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  deviceName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    flex: 1,
  },
  deviceStats: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    fontSize: '0.875rem',
  },
  count: {
    fontWeight: 600,
  },
  percentage: {
    color: '#666',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  note: {
    marginTop: '0.5rem',
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

export default DeviceBreakdown;
