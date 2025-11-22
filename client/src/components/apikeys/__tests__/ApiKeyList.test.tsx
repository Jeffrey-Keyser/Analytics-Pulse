import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApiKeyList } from '../ApiKeyList';
import { ApiKey } from '../../../models/apiKeys';

// Mock ApiKeyItem component
vi.mock('../ApiKeyItem', () => ({
  ApiKeyItem: ({ apiKey }: any) => (
    <div data-testid="api-key-item">{apiKey.prefix}</div>
  ),
}));

describe('ApiKeyList', () => {
  const mockApiKeys: ApiKey[] = [
    {
      id: '1',
      prefix: 'ap_abc12',
      name: 'Key 1',
      description: 'Description 1',
      is_active: true,
      last_used_at: '2025-11-20T10:00:00Z',
      created_at: '2025-11-01T10:00:00Z',
    },
    {
      id: '2',
      prefix: 'ap_def34',
      name: 'Key 2',
      description: null,
      is_active: true,
      last_used_at: null,
      created_at: '2025-11-02T10:00:00Z',
    },
  ];

  const mockOnRevoke = vi.fn();

  it('renders loading state', () => {
    render(
      <ApiKeyList
        apiKeys={[]}
        onRevoke={mockOnRevoke}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const error = { message: 'Failed to fetch' };
    render(
      <ApiKeyList
        apiKeys={[]}
        onRevoke={mockOnRevoke}
        error={error}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load API keys/)).toBeInTheDocument();
    expect(screen.getByText(/Error: Failed to fetch/)).toBeInTheDocument();
  });

  it('renders empty state when no API keys', () => {
    render(
      <ApiKeyList
        apiKeys={[]}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText('No API Keys')).toBeInTheDocument();
    expect(screen.getByText(/haven't generated any API keys yet/)).toBeInTheDocument();
  });

  it('renders list of API keys', () => {
    render(
      <ApiKeyList
        apiKeys={mockApiKeys}
        onRevoke={mockOnRevoke}
      />
    );

    const items = screen.getAllByTestId('api-key-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText(/2 keys total/)).toBeInTheDocument();
  });

  it('shows singular key count for single key', () => {
    render(
      <ApiKeyList
        apiKeys={[mockApiKeys[0]]}
        onRevoke={mockOnRevoke}
      />
    );

    expect(screen.getByText(/1 key total/)).toBeInTheDocument();
  });
});
