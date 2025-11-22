import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DangerZone } from '../DangerZone';

describe('DangerZone', () => {
  it('renders danger zone section', () => {
    const onDelete = vi.fn();

    render(<DangerZone onDelete={onDelete} />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText(/Irreversible and destructive actions/i)).toBeInTheDocument();
  });

  it('displays delete project section', () => {
    const onDelete = vi.fn();

    render(<DangerZone onDelete={onDelete} />);

    expect(screen.getByText('Delete this project')).toBeInTheDocument();
    expect(
      screen.getByText(/Once you delete a project, there is no going back/i)
    ).toBeInTheDocument();
  });

  it('renders delete button', () => {
    const onDelete = vi.fn();

    render(<DangerZone onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DangerZone onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete project/i });
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalled();
  });
});