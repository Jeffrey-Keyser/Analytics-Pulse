import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectList } from '../ProjectList';
import { renderWithRedux } from '../../../test/redux-test-utils';
import { Project } from '../../../models';

// Mock the UI kit components
vi.mock('@jeffrey-keyser/personal-ui-kit', () => ({
  Button: ({ children, onClick, disabled, variant, size, style, 'data-testid': testId }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} style={style} data-testid={testId}>
      {children}
    </button>
  ),
  Text: ({ children, variant, color, weight, style, as }: any) => {
    const Component = as || 'div';
    return (
      <Component data-variant={variant} data-color={color} data-weight={weight} style={style}>
        {children}
      </Component>
    );
  },
  LoadingSpinner: ({ size }: any) => <div data-testid="loading-spinner" data-size={size}>Loading...</div>,
}));

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project 1',
    domain: 'example1.com',
    description: 'Description 1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Project 2',
    domain: 'example2.com',
    description: 'Description 2',
    is_active: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockListProjectsResponse = {
  success: true,
  data: mockProjects,
  pagination: {
    total: 2,
    limit: 10,
    offset: 0,
    page: 1,
    pages: 1,
  },
};

// Mock the projects API
vi.mock('../../../reducers', async () => {
  const actual = await vi.importActual('../../../reducers');
  return {
    ...actual,
    useListProjectsQuery: vi.fn(() => ({
      data: mockListProjectsResponse,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })),
    useDeleteProjectMutation: vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { success: true } }),
      { isLoading: false },
    ]),
    useCreateProjectMutation: vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { success: true } }),
      { isLoading: false, error: null },
    ]),
  };
});

// Mock the child components
vi.mock('../ProjectCard', () => ({
  ProjectCard: ({ project }: { project: Project }) => (
    <div data-testid="project-card">{project.name}</div>
  ),
}));

vi.mock('../CreateProjectModal', () => ({
  CreateProjectModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="create-project-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
}));

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderWithRedux(<ProjectList />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Manage your analytics projects')).toBeInTheDocument();
  });

  it('renders Create New Project button', () => {
    renderWithRedux(<ProjectList />);

    const createButton = screen.getByTestId('create-project-button');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveTextContent('Create New Project');
  });

  it('opens modal when Create New Project is clicked', () => {
    renderWithRedux(<ProjectList />);

    const createButton = screen.getByTestId('create-project-button');
    fireEvent.click(createButton);

    expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
  });

  it('renders search inputs', () => {
    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('search-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-domain-input')).toBeInTheDocument();
  });

  it('renders filter buttons', () => {
    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-active')).toBeInTheDocument();
    expect(screen.getByTestId('filter-inactive')).toBeInTheDocument();
  });

  it('renders project cards when data is available', () => {
    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('projects-grid')).toBeInTheDocument();
    const cards = screen.getAllByTestId('project-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('updates search input value when typing', () => {
    renderWithRedux(<ProjectList />);

    const searchInput = screen.getByTestId('search-name-input') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(searchInput.value).toBe('test search');
  });

  it('highlights active filter button', () => {
    renderWithRedux(<ProjectList />);

    const allButton = screen.getByTestId('filter-all');
    const activeButton = screen.getByTestId('filter-active');

    // Initially "All" should be active
    expect(allButton).toHaveClass(expect.stringContaining('filterButtonActive'));

    // Click "Active" button
    fireEvent.click(activeButton);

    // "Active" button should be highlighted
    expect(activeButton).toHaveClass(expect.stringContaining('filterButtonActive'));
  });

  it('shows Clear Filters button when filters are applied', async () => {
    renderWithRedux(<ProjectList />);

    // Initially no Clear Filters button
    expect(screen.queryByTestId('clear-filters')).not.toBeInTheDocument();

    // Apply a filter
    const searchInput = screen.getByTestId('search-name-input');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
    }, { timeout: 500 });
  });
});

describe('ProjectList - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when loading', () => {
    const { useListProjectsQuery } = require('../../../reducers');
    useListProjectsQuery.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithRedux(<ProjectList />);

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });
});

describe('ProjectList - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error message when API call fails', () => {
    const { useListProjectsQuery } = require('../../../reducers');
    useListProjectsQuery.mockReturnValue({
      data: null,
      error: { data: { message: 'Failed to load projects' } },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Error Loading Projects')).toBeInTheDocument();
  });
});

describe('ProjectList - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no projects exist', () => {
    const { useListProjectsQuery } = require('../../../reducers');
    useListProjectsQuery.mockReturnValue({
      data: {
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 0,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first analytics project')).toBeInTheDocument();
  });
});

describe('ProjectList - Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows pagination controls when there are multiple pages', () => {
    const { useListProjectsQuery } = require('../../../reducers');
    useListProjectsQuery.mockReturnValue({
      data: {
        success: true,
        data: mockProjects,
        pagination: {
          total: 25,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 3,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithRedux(<ProjectList />);

    expect(screen.getByTestId('prev-page-button')).toBeInTheDocument();
    expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('(25 total projects)')).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    const { useListProjectsQuery } = require('../../../reducers');
    useListProjectsQuery.mockReturnValue({
      data: {
        success: true,
        data: mockProjects,
        pagination: {
          total: 25,
          limit: 10,
          offset: 0,
          page: 1,
          pages: 3,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderWithRedux(<ProjectList />);

    const prevButton = screen.getByTestId('prev-page-button');
    expect(prevButton).toBeDisabled();
  });
});
