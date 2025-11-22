import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProjectModal } from '../CreateProjectModal';
import { renderWithRedux } from '../../../test/redux-test-utils';

// Mock the UI kit components
vi.mock('@jeffrey-keyser/personal-ui-kit', () => ({
  Button: ({ children, onClick, disabled, variant, size, type }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} type={type}>
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
    useCreateProjectMutation: vi.fn(() => [
      vi.fn().mockResolvedValue({ data: { success: true } }),
      { isLoading: false, error: null },
    ]),
  };
});

describe('CreateProjectModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('has Create Project and Cancel buttons', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button (×) is clicked', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside modal', () => {
    const { container } = renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const overlay = container.querySelector('[class*="modalOverlay"]');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('updates form fields when typing', () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
    const domainInput = screen.getByLabelText(/Domain/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: 'My Project' } });
    fireEvent.change(domainInput, { target: { value: 'example.com' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

    expect(nameInput.value).toBe('My Project');
    expect(domainInput.value).toBe('example.com');
    expect(descriptionInput.value).toBe('Test description');
  });

  it('shows validation error when submitting empty name', async () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const domainInput = screen.getByLabelText(/Domain/i);
    fireEvent.change(domainInput, { target: { value: 'example.com' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });
  });

  it('shows validation error when submitting empty domain', async () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const nameInput = screen.getByLabelText(/Project Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Project' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Domain is required')).toBeInTheDocument();
    });
  });

  it('clears validation errors when typing in field', async () => {
    renderWithRedux(
      <CreateProjectModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Project Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Project' } });

    await waitFor(() => {
      expect(screen.queryByText('Project name is required')).not.toBeInTheDocument();
    });
  });
});
