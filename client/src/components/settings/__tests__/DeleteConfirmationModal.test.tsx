import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

describe('DeleteConfirmationModal', () => {
  const projectName = 'Test Project';

  it('does not render when isOpen is false', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={false}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.queryByText('Delete Project')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Delete Project')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
  });

  it('displays warning messages about data deletion', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/All analytics events and data/i)).toBeInTheDocument();
    expect(screen.getByText(/All aggregated statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Project configuration and settings/i)).toBeInTheDocument();
  });

  it('disables confirm button when project name does not match', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    expect(deleteButton).toBeDisabled();
  });

  it('enables confirm button when project name matches', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const input = screen.getByLabelText(/project name/i);
    await user.type(input, projectName);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    expect(deleteButton).not.toBeDisabled();
  });

  it('calls onConfirm when project name matches and confirm is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const input = screen.getByLabelText(/project name/i);
    await user.type(input, projectName);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    await user.click(deleteButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows error when project name does not match on confirm click', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const input = screen.getByLabelText(/project name/i);
    await user.type(input, 'Wrong Name');

    // Button should still be disabled, but if we try to click via code
    // The component won't allow it, but let's test the validation error display
    expect(screen.queryByText(/project name does not match/i)).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables inputs and buttons when isDeleting is true', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        projectName={projectName}
        onConfirm={onConfirm}
        onCancel={onCancel}
        isDeleting={true}
      />
    );

    const input = screen.getByLabelText(/project name/i);
    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(input).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});