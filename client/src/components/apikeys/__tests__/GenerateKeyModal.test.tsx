import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateKeyModal } from '../GenerateKeyModal';
import { NewApiKey } from '../../../models/apiKeys';

describe('GenerateKeyModal', () => {
  const mockOnClose = vi.fn();
  const mockOnGenerate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <GenerateKeyModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={false}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <GenerateKeyModal
        isOpen={false}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={false}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(
      <GenerateKeyModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={false}
      />
    );

    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByText('Generate API Key')).toBeInTheDocument();
  });

  it('calls onGenerate with form data when submitted', () => {
    render(
      <GenerateKeyModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={false}
      />
    );

    const nameInput = screen.getByLabelText(/Name/);
    const descInput = screen.getByLabelText(/Description/);
    const submitButton = screen.getByText('Generate API Key');

    fireEvent.change(nameInput, { target: { value: 'Test Key' } });
    fireEvent.change(descInput, { target: { value: 'Test Description' } });
    fireEvent.click(submitButton);

    expect(mockOnGenerate).toHaveBeenCalledWith('Test Key', 'Test Description');
  });

  it('shows generated key when provided', () => {
    const generatedKey: NewApiKey = {
      id: '123',
      key: 'ap_abc123def456',
      prefix: 'ap_abc12',
      name: 'Test Key',
      description: 'Test Description',
      is_active: true,
      last_used_at: null,
      created_at: '2025-11-20T10:00:00Z',
      message: 'Key created',
    };

    render(
      <GenerateKeyModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={false}
        generatedKey={generatedKey}
      />
    );

    expect(screen.getByText('API Key Generated')).toBeInTheDocument();
    expect(screen.getByText('ap_abc123def456')).toBeInTheDocument();
    expect(screen.getByText(/Save this key now!/)).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    render(
      <GenerateKeyModal
        isOpen={true}
        onClose={mockOnClose}
        onGenerate={mockOnGenerate}
        isGenerating={true}
      />
    );

    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });
});
