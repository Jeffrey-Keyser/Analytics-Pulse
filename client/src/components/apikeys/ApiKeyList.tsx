import React from 'react';
import { ApiKey } from '../../models/apiKeys';
import { ApiKeyItem } from './ApiKeyItem';
import { EmptyState, LoadingSpinner, Alert, Text } from '@jeffrey-keyser/personal-ui-kit';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onRevoke: (keyId: string) => void;
  isLoading?: boolean;
  error?: any;
  revokingKeyId?: string | null;
}

export function ApiKeyList({
  apiKeys,
  onRevoke,
  isLoading = false,
  error,
  revokingKeyId = null,
}: ApiKeyListProps) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <Text variant="body">
          Failed to load API keys. Please try again later.
        </Text>
        {error.message && (
          <Text variant="caption" style={{ marginTop: '0.5rem' }}>
            Error: {error.message}
          </Text>
        )}
      </Alert>
    );
  }

  if (!apiKeys || apiKeys.length === 0) {
    return (
      <EmptyState
        title="No API Keys"
        message="You haven't generated any API keys yet. Click the 'Generate New Key' button above to create your first API key."
      />
    );
  }

  return (
    <div>
      <Text
        variant="body"
        style={{
          marginBottom: '1rem',
          color: 'var(--color-text-secondary, #666)',
        }}
      >
        {apiKeys.length} {apiKeys.length === 1 ? 'key' : 'keys'} total
      </Text>
      {apiKeys.map((apiKey) => (
        <ApiKeyItem
          key={apiKey.id}
          apiKey={apiKey}
          onRevoke={onRevoke}
          isRevoking={revokingKeyId === apiKey.id}
        />
      ))}
    </div>
  );
}
