import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiKeyItem } from '../ApiKeyItem';
import { ApiKey } from '../../../models/apiKeys';

describe('ApiKeyItem', () => {
  const mockApiKey: ApiKey = {
    id: '123',
    prefix: 'ap_abc12',
    name: 'Test Key',
    description: 'Test description',
    is_active: true,
    last_used_at: '2025-11-20T10:00:00Z',
    created_at: '2025-11-01T10:00:00Z',
  };

  const mockOnRevoke = vi.fn();

  it('renders API key information correctly', () => {
    render(<ApiKeyItem apiKey={mockApiKey} onRevoke={mockOnRevoke} />);

    expect(screen.getByText(/ap_abc12.../)).toBeInTheDocument();
    expect(screen.getByText('Test Key')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays revoke button', () => {
    render(<ApiKeyItem apiKey={mockApiKey} onRevoke={mockOnRevoke} />);

    const revokeButton = screen.getByText('Revoke');
    expect(revokeButton).toBeInTheDocument();
  });

  it('shows confirm dialog when revoke button is clicked', () => {
    render(<ApiKeyItem apiKey={mockApiKey} onRevoke={mockOnRevoke} />);

    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Revoke API Key')).toBeInTheDocument();
  });

  it('calls onRevoke when confirm is clicked', () => {
    render(<ApiKeyItem apiKey={mockApiKey} onRevoke={mockOnRevoke} />);

    // Click revoke button
    const revokeButton = screen.getByText('Revoke');
    fireEvent.click(revokeButton);

    // Click confirm button in dialog
    const confirmButton = screen.getByText('Revoke Key');
    fireEvent.click(confirmButton);

    expect(mockOnRevoke).toHaveBeenCalledWith('123');
  });

  it('disables revoke button when isRevoking is true', () => {
    render(<ApiKeyItem apiKey={mockApiKey} onRevoke={mockOnRevoke} isRevoking={true} />);

    const revokeButton = screen.getByText('Revoking...');
    expect(revokeButton).toBeDisabled();
  });

  it('disables revoke button for inactive keys', () => {
    const inactiveKey = { ...mockApiKey, is_active: false };
    render(<ApiKeyItem apiKey={inactiveKey} onRevoke={mockOnRevoke} />);

    const revokeButton = screen.getByText('Revoke');
    expect(revokeButton).toBeDisabled();
  });

  it('renders without name and description', () => {
    const minimalKey: ApiKey = {
      ...mockApiKey,
      name: null,
      description: null,
    };
    render(<ApiKeyItem apiKey={minimalKey} onRevoke={mockOnRevoke} />);

    expect(screen.getByText(/ap_abc12.../)).toBeInTheDocument();
    expect(screen.queryByText('Test Key')).not.toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });
});
