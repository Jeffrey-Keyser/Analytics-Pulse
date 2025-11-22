import React from 'react';
import { DeviceBreakdown as DeviceBreakdownType } from '../../models/analytics';
import { useThemeColors } from '../../contexts/ThemeContext';

// NOTE: This component requires recharts to be installed
// Run: npm install recharts
// Uncomment the imports below after installing recharts:
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export interface DeviceBreakdownProps {
  data: DeviceBreakdownType[];
  loading?: boolean;
}

export function DeviceBreakdown({ data, loading = false }: DeviceBreakdownProps) {
  const colors = useThemeColors();

  // Chart colors that work well in both themes
  const chartColors = [
    colors.charts.bar1,
    colors.charts.bar2,
    colors.charts.bar3,
    colors.charts.bar4,
    colors.charts.bar5,
    colors.charts.line1,
  ];

  const styles = {
    container: {
      backgroundColor: colors.background.secondary,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '8px',
      padding: '1.5rem',
      marginBottom: '2rem',
    },
    title: {
      margin: 0,
      marginBottom: '1rem',
      fontSize: '1.25rem',
      fontWeight: 600,
      color: colors.text.primary,
    },
    loadingContainer: {
      height: '300px',
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
    emptyState: {
      height: '300px',
      display: 'flex',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      color: colors.text.secondary,
    },
    listContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
    },
    listItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.5rem',
    },
    deviceInfo: {
      display: 'flex',
      alignItems: 'center' as const,
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
      color: colors.text.primary,
    },
    deviceStats: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center' as const,
      fontSize: '0.875rem',
    },
    count: {
      fontWeight: 600,
      color: colors.text.primary,
    },
    percentage: {
      color: colors.text.secondary,
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: colors.border.primary,
      borderRadius: '4px',
      overflow: 'hidden' as const,
    },
    progressFill: {
      height: '100%',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    note: {
      marginTop: '0.5rem',
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
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip
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
              <span style={{ ...styles.colorDot, backgroundColor: chartColors[index % chartColors.length] }}></span>
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
                  backgroundColor: chartColors[index % chartColors.length],
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

export default DeviceBreakdown;
