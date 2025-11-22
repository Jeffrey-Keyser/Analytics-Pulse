import React, { useState, useCallback, useMemo } from 'react';
import { Container, Toast } from '@jeffrey-keyser/personal-ui-kit';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProjectEventsQuery, useGetProjectEventsAggregateQuery, useExportEventsMutation } from '../reducers/events.api';
import { EventsTable } from '../components/events/EventsTable';
import { EventFilters } from '../components/events/EventFilters';
import { EventSummary } from '../components/events/EventSummary';
import { ExportButton } from '../components/analytics/ExportButton';
import { format, subDays } from 'date-fns';
import { ExportFormat } from '../models/export';
import { handleExportDownload } from '../utils/download';

/**
 * Custom Events Page
 * Route: /projects/:id/events
 * Shows and filters custom tracked events
 */
export function CustomEvents() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState({
    eventName: '',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    searchTerm: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 50;

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Export mutation
  const [exportEvents, { isLoading: isExporting }] = useExportEventsMutation();

  // Calculate offset
  const offset = (currentPage - 1) * eventsPerPage;

  // Fetch events with filters
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useGetProjectEventsQuery(
    {
      projectId: id!,
      event_name: filters.eventName || undefined,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
      limit: eventsPerPage,
      offset,
    },
    { skip: !id }
  );

  // Fetch aggregate data for summary
  const {
    data: aggregateData,
    isLoading: aggregateLoading,
  } = useGetProjectEventsAggregateQuery(
    {
      projectId: id!,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined,
    },
    { skip: !id }
  );

  // Filter events locally by search term (URL and custom data)
  const filteredEvents = useMemo(() => {
    if (!eventsData?.data) return [];

    if (!filters.searchTerm) {
      return eventsData.data;
    }

    const searchLower = filters.searchTerm.toLowerCase();
    return eventsData.data.filter((event) => {
      const urlMatch = event.url.toLowerCase().includes(searchLower);
      const customDataMatch = event.custom_data
        ? JSON.stringify(event.custom_data).toLowerCase().includes(searchLower)
        : false;

      return urlMatch || customDataMatch;
    });
  }, [eventsData?.data, filters.searchTerm]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    try {
      const blob = await exportEvents({
        projectId: id!,
        format,
        event_name: filters.eventName || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        limit: eventsPerPage,
        offset,
      }).unwrap();

      handleExportDownload(blob, 'events', format, filters.startDate, filters.endDate);

      setToastMessage(`Events data exported successfully as ${format.toUpperCase()}`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Export failed:', error);
      setToastMessage('Failed to export events data. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Error state
  if (eventsError) {
    return (
      <Container size="xl">
        <div style={styles.errorContainer}>
          <h1>Custom Events</h1>
          <div style={styles.error}>
            Failed to load events. Please try again later.
          </div>
          <button onClick={() => navigate(`/projects/${id}`)} style={styles.backButton}>
            Back to Project
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <h1 style={styles.title}>Custom Events</h1>
          <div style={styles.headerActions}>
            <ExportButton
              projectId={id!}
              startDate={filters.startDate}
              endDate={filters.endDate}
              dataType="events"
              onExport={handleExport}
              disabled={eventsLoading || !!eventsError}
              loading={isExporting}
            />
            <button onClick={() => navigate(`/projects/${id}`)} style={styles.backButton}>
              Back to Project
            </button>
          </div>
        </div>

        <EventSummary
          eventCounts={aggregateData?.data?.event_counts || []}
          loading={aggregateLoading}
        />

        <EventFilters
          eventCounts={aggregateData?.data?.event_counts || []}
          onFilterChange={handleFilterChange}
          loading={eventsLoading}
        />

        <EventsTable
          events={filteredEvents}
          pagination={eventsData?.pagination || {
            total: 0,
            limit: eventsPerPage,
            offset: 0,
            page: 1,
            pages: 1,
          }}
          onPageChange={handlePageChange}
          loading={eventsLoading}
        />

        {/* Toast Notification */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setShowToast(false)}
            duration={4000}
          />
        )}
      </div>
    </Container>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: '2rem 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 600,
    color: '#333',
  },
  backButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #6c757d',
    backgroundColor: 'white',
    color: '#6c757d',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  },
  errorContainer: {
    padding: '2rem 0',
  },
  error: {
    padding: '2rem',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c2c7',
    borderRadius: '8px',
    color: '#842029',
    marginBottom: '1rem',
  },
};

export default CustomEvents;
