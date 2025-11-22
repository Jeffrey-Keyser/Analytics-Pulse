import React, { useState } from 'react';
import { Container, Button, Text, Alert, Toast } from '@jeffrey-keyser/personal-ui-kit';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useListApiKeysQuery,
  useGenerateApiKeyMutation,
  useRevokeApiKeyMutation,
} from '../reducers/apiKeys.api';
import {
  ApiKeyList,
  GenerateKeyModal,
  TrackingSnippet,
} from '../components/apikeys';
import { NewApiKey } from '../models/apiKeys';

/**
 * API Keys Management Page
 * Route: /projects/:id/api-keys
 * Create, view, and revoke project API keys
 */
export function ApiKeys() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<NewApiKey | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  // RTK Query hooks
  const {
    data: apiKeysResponse,
    isLoading,
    error,
    refetch,
  } = useListApiKeysQuery(id!, { skip: !id });

  const [generateApiKey, { isLoading: isGenerating }] = useGenerateApiKeyMutation();
  const [revokeApiKey] = useRevokeApiKeyMutation();

  // Extract data from response
  const apiKeys = apiKeysResponse?.data || [];

  // Find the first active API key for the tracking snippet
  const activeApiKey = apiKeys.find((key) => key.is_active);

  const handleGenerateKey = async (name: string, description: string) => {
    try {
      const result = await generateApiKey({
        projectId: id!,
        data: { name: name || undefined, description: description || undefined },
      }).unwrap();

      if (result.data) {
        setGeneratedKey(result.data);
        setToast({
          message: 'API key generated successfully!',
          variant: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed to generate API key:', err);
      setToast({
        message: err?.data?.error || 'Failed to generate API key',
        variant: 'error',
      });
      setShowGenerateModal(false);
      setGeneratedKey(null);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      await revokeApiKey({
        projectId: id!,
        keyId,
      }).unwrap();

      setToast({
        message: 'API key revoked successfully',
        variant: 'success',
      });
      refetch();
    } catch (err: any) {
      console.error('Failed to revoke API key:', err);
      setToast({
        message: err?.data?.error || 'Failed to revoke API key',
        variant: 'error',
      });
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleCloseModal = () => {
    setShowGenerateModal(false);
    setGeneratedKey(null);
  };

  return (
    <Container size="xl">
      <div style={{ padding: '2rem 0' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <div>
            <Text variant="h1" style={{ marginBottom: '0.5rem' }}>
              API Keys
            </Text>
            <Text
              variant="body"
              style={{ color: 'var(--color-text-secondary, #666)' }}
            >
              Manage API keys for your project
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${id}`)}
            >
              Back to Project
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowGenerateModal(true)}
            >
              Generate New Key
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert variant="info" style={{ marginBottom: '2rem' }}>
          API keys are used to authenticate requests to the Analytics Pulse API. Keep your keys secure
          and never share them publicly. You can revoke a key at any time if it's compromised.
        </Alert>

        {/* Tracking Snippet - only show if there's an active key */}
        {activeApiKey && id && (
          <TrackingSnippet apiKey={activeApiKey.prefix + '...'} projectId={id} />
        )}

        {/* API Keys List */}
        <div style={{ marginTop: '2rem' }}>
          <Text variant="h2" style={{ marginBottom: '1rem' }}>
            Active Keys
          </Text>
          <ApiKeyList
            apiKeys={apiKeys}
            onRevoke={handleRevokeKey}
            isLoading={isLoading}
            error={error}
            revokingKeyId={revokingKeyId}
          />
        </div>

        {/* Generate Key Modal */}
        <GenerateKeyModal
          isOpen={showGenerateModal}
          onClose={handleCloseModal}
          onGenerate={handleGenerateKey}
          isGenerating={isGenerating}
          generatedKey={generatedKey}
        />

        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
            duration={5000}
          />
        )}
      </div>
    </Container>
  );
}

export default ApiKeys;
