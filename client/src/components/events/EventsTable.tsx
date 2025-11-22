import React from 'react';
import { CustomEvent, EventsPagination } from '../../models/events';
import { EventRow } from './EventRow';

export interface EventsTableProps {
  events: CustomEvent[];
  pagination: EventsPagination;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function EventsTable({ events, pagination, onPageChange, loading }: EventsTableProps) {
  if (loading) {
    return (
      <div style={styles.loadingState}>
        <div>Loading events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div>No events found matching your filters.</div>
      </div>
    );
  }

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      onPageChange(pagination.page + 1);
    }
  };

  const handlePageClick = (page: number) => {
    onPageChange(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 7;

    if (pagination.pages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= pagination.pages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      const currentPage = pagination.page;
      const leftBound = Math.max(2, currentPage - 1);
      const rightBound = Math.min(pagination.pages - 1, currentPage + 1);

      pages.push(1);

      if (leftBound > 2) {
        pages.push(-1); // Ellipsis
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < pagination.pages - 1) {
        pages.push(-1); // Ellipsis
      }

      pages.push(pagination.pages);
    }

    return pages;
  };

  const exportToCSV = () => {
    // CSV header
    const headers = ['Event Name', 'URL', 'Timestamp', 'Custom Data', 'Country', 'City', 'Browser', 'OS', 'Device'];

    // CSV rows
    const rows = events.map(event => [
      event.event_name,
      event.url,
      event.timestamp,
      event.custom_data ? JSON.stringify(event.custom_data) : '',
      event.country || '',
      event.city || '',
      event.browser || '',
      event.os || '',
      event.device_type || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `events_export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.paginationInfo}>
          Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} events
        </div>
        <button onClick={exportToCSV} style={styles.exportButton}>
          Export to CSV
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.headerCell}>Event Name</th>
              <th style={styles.headerCell}>URL</th>
              <th style={styles.headerCell}>Timestamp</th>
              <th style={styles.headerCell}>Custom Data</th>
              <th style={styles.headerCell}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={styles.paginationContainer}>
          <button
            onClick={handlePreviousPage}
            disabled={pagination.page === 1}
            style={{
              ...styles.paginationButton,
              ...(pagination.page === 1 ? styles.paginationButtonDisabled : {}),
            }}
          >
            Previous
          </button>

          <div style={styles.pageNumbers}>
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === -1) {
                return (
                  <span key={`ellipsis-${index}`} style={styles.ellipsis}>
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageClick(pageNum)}
                  style={{
                    ...styles.pageButton,
                    ...(pageNum === pagination.page ? styles.pageButtonActive : {}),
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextPage}
            disabled={pagination.page === pagination.pages}
            style={{
              ...styles.paginationButton,
              ...(pagination.page === pagination.pages ? styles.paginationButtonDisabled : {}),
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  paginationInfo: {
    fontSize: '0.875rem',
    color: '#6c757d',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #28a745',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: 'white',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0',
  },
  headerCell: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#333',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #007bff',
    backgroundColor: 'white',
    color: '#007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageNumbers: {
    display: 'flex',
    gap: '0.25rem',
  },
  pageButton: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #e0e0e0',
    backgroundColor: 'white',
    color: '#333',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    minWidth: '40px',
    transition: 'all 0.2s',
  },
  pageButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  ellipsis: {
    padding: '0.5rem 0.25rem',
    fontSize: '0.875rem',
    color: '#6c757d',
  },
  loadingState: {
    padding: '4rem 2rem',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    color: '#6c757d',
  },
  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    color: '#999',
    fontStyle: 'italic',
  },
};

export default EventsTable;
