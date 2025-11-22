import React, { useState } from 'react';
import { ApiKey } from '../../models/apiKeys';
import { Button, Badge, Card, Text, ConfirmDialog } from '@jeffrey-keyser/personal-ui-kit';
import { formatDistanceToNow } from 'date-fns';

interface ApiKeyItemProps {
  apiKey: ApiKey;
  onRevoke: (keyId: string) => void;
  isRevoking?: boolean;
}

export function ApiKeyItem({ apiKey, onRevoke, isRevoking = false }: ApiKeyItemProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const handleRevokeClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRevoke = () => {
    onRevoke(apiKey.id);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <Card
        variant="outlined"
        style={{
          marginBottom: '1rem',
          padding: '1.5rem',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}>
              <Text
                variant="code"
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {apiKey.prefix}...
              </Text>
              <Badge
                variant={apiKey.is_active ? 'success' : 'error'}
                size="sm"
              >
                {apiKey.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {apiKey.name && (
              <Text
                variant="body"
                style={{
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                }}
              >
                {apiKey.name}
              </Text>
            )}

            {apiKey.description && (
              <Text
                variant="body"
                style={{
                  color: 'var(--color-text-secondary, #666)',
                  marginBottom: '0.5rem',
                }}
              >
                {apiKey.description}
              </Text>
            )}

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '0.75rem',
            }}>
              <Text
                variant="caption"
                style={{ color: 'var(--color-text-secondary, #666)' }}
              >
                Created: {formatDate(apiKey.created_at)}
              </Text>
              <Text
                variant="caption"
                style={{ color: 'var(--color-text-secondary, #666)' }}
              >
                Last used: {formatDate(apiKey.last_used_at)}
              </Text>
            </div>
          </div>

          <div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRevokeClick}
              disabled={isRevoking || !apiKey.is_active}
            >
              {isRevoking ? 'Revoking...' : 'Revoke'}
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmRevoke}
        title="Revoke API Key"
        message={`Are you sure you want to revoke this API key (${apiKey.prefix}...)? This action cannot be undone and any applications using this key will lose access immediately.`}
        confirmText="Revoke Key"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
