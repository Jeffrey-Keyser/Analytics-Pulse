import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSettingsForm } from '../ProjectSettingsForm';
import { Project } from '../../../models/projects';

const mockProject: Project = {
  id: '123',
  name: 'Test Project',
  domain: 'test.com',
  description: 'Test description',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProjectSettingsForm', () => {
  it('renders form with project data', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const nameInput = screen.getByLabelText(/project name/i);
    await user.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated data when form is submitted', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const nameInput = screen.getByLabelText(/project name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Project');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Updated Project',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables save button when no changes are made', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('displays error message when provided', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
        error="Something went wrong"
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays success message when provided', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();

    render(
      <ProjectSettingsForm
        project={mockProject}
        onSave={onSave}
        onCancel={onCancel}
        successMessage="Project updated successfully"
      />
    );

    expect(screen.getByText('Project updated successfully')).toBeInTheDocument();
  });
});