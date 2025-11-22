import React, { useState, useMemo } from 'react';
import { Button, Text, LoadingSpinner } from '@jeffrey-keyser/personal-ui-kit';
import { useListProjectsQuery } from '../../reducers';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import styles from './ProjectList.module.css';

const ITEMS_PER_PAGE = 10;

export function ProjectList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchName, setSearchName] = useState('');
  const [searchDomain, setSearchDomain] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounced search values
  const [debouncedName, setDebouncedName] = useState('');
  const [debouncedDomain, setDebouncedDomain] = useState('');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(searchName);
      setDebouncedDomain(searchDomain);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchName, searchDomain]);

  const queryParams = useMemo(() => ({
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
    ...(debouncedName && { name: debouncedName }),
    ...(debouncedDomain && { domain: debouncedDomain }),
    ...(filterActive !== undefined && { is_active: filterActive }),
  }), [currentPage, debouncedName, debouncedDomain, filterActive]);

  const { data, error, isLoading, isFetching, refetch } = useListProjectsQuery(queryParams);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (active: boolean | undefined) => {
    setFilterActive(active);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchDomain('');
    setFilterActive(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchName || searchDomain || filterActive !== undefined;

  const totalPages = data?.pagination ? Math.ceil(data.pagination.total / ITEMS_PER_PAGE) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text variant="h1" weight="bold" style={{ margin: 0 }}>
            Projects
          </Text>
          <Text variant="body2" color="secondary" style={{ marginTop: '0.5rem' }}>
            Manage your analytics projects
          </Text>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          data-testid="create-project-button"
        >
          Create New Project
        </Button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchInputs}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={styles.searchInput}
            data-testid="search-name-input"
          />
          <input
            type="text"
            placeholder="Search by domain..."
            value={searchDomain}
            onChange={(e) => setSearchDomain(e.target.value)}
            className={styles.searchInput}
            data-testid="search-domain-input"
          />
        </div>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${filterActive === undefined ? styles.filterButtonActive : ''}`}
            onClick={() => handleFilterChange(undefined)}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={`${styles.filterButton} ${filterActive === true ? styles.filterButtonActive : ''}`}
            onClick={() => handleFilterChange(true)}
            data-testid="filter-active"
          >
            Active
          </button>
          <button
            className={`${styles.filterButton} ${filterActive === false ? styles.filterButtonActive : ''}`}
            onClick={() => handleFilterChange(false)}
            data-testid="filter-inactive"
          >
            Inactive
          </button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="small"
              onClick={clearFilters}
              data-testid="clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Text variant="body1" color="secondary" style={{ marginTop: '1rem' }}>
            Loading projects...
          </Text>
        </div>
      ) : error ? (
        <div className={styles.errorContainer} data-testid="error-message">
          <Text variant="h3" weight="semibold" style={{ color: 'var(--color-danger, #dc2626)' }}>
            Error Loading Projects
          </Text>
          <Text variant="body2" color="secondary" style={{ marginTop: '0.5rem' }}>
            {('data' in error && typeof error.data === 'object' && error.data !== null && 'message' in error.data)
              ? String(error.data.message)
              : 'Failed to load projects. Please try again.'}
          </Text>
          <Button
            variant="outline"
            onClick={() => refetch()}
            style={{ marginTop: '1rem' }}
          >
            Retry
          </Button>
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className={styles.projectsGrid} data-testid="projects-grid">
            {isFetching && (
              <div className={styles.fetchingOverlay}>
                <LoadingSpinner size="small" />
              </div>
            )}
            {data.data.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => refetch()}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isFetching}
                data-testid="prev-page-button"
              >
                Previous
              </Button>
              <div className={styles.pageInfo}>
                <Text variant="body2">
                  Page {currentPage} of {totalPages}
                </Text>
                <Text variant="caption" color="secondary">
                  ({data.pagination.total} total projects)
                </Text>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isFetching}
                data-testid="next-page-button"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState} data-testid="empty-state">
          <svg
            className={styles.emptyIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <Text variant="h3" weight="semibold">
            {hasActiveFilters ? 'No projects found' : 'No projects yet'}
          </Text>
          <Text variant="body2" color="secondary" style={{ marginTop: '0.5rem' }}>
            {hasActiveFilters
              ? 'Try adjusting your search filters'
              : 'Get started by creating your first analytics project'}
          </Text>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              onClick={clearFilters}
              style={{ marginTop: '1.5rem' }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              style={{ marginTop: '1.5rem' }}
            >
              Create Your First Project
            </Button>
          )}
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refetch();
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

export default ProjectList;
