import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { renderWithRedux } from '../../../test/redux-test-utils';
import { Project } from '../../../models';

// Mock the UI kit components
vi.mock('@jeffrey-keyser/personal-ui-kit', () => ({
  Button: ({ children, onClick, disabled, variant, size, style }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} style={style}>
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
}));

// Mock the projects API
vi.mock('../../../reducers', async () => {
  const actual = await vi.importActual('../../../reducers');
  return {
    ...actual,
    useDeleteProjectMutation: vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { success: true } }),
      { isLoading: false },
    ]),
  };
});

const mockProject: Project = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Project',
  domain: 'example.com',
  description: 'A test project description',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project information correctly', () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders inactive status for inactive projects', () => {
    const inactiveProject = { ...mockProject, is_active: false };
    renderWithRedux(<ProjectCard project={inactiveProject} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const projectWithoutDescription = { ...mockProject, description: null };
    renderWithRedux(<ProjectCard project={projectWithoutDescription} />);

    expect(screen.queryByText('A test project description')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('shows delete confirmation on first delete click', async () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm deletion?')).toBeInTheDocument();
      expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('cancels delete confirmation when cancel is clicked', async () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm deletion?')).not.toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('has View Details button', () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    const viewDetailsButton = screen.getByText('View Details');
    expect(viewDetailsButton).toBeInTheDocument();
  });

  it('has proper test id', () => {
    renderWithRedux(<ProjectCard project={mockProject} />);

    const card = screen.getByTestId('project-card');
    expect(card).toBeInTheDocument();
  });
});
