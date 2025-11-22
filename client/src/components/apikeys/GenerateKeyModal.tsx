import React, { useState, useEffect } from 'react';
import { Modal, Input, TextArea, Button, Alert, Text } from '@jeffrey-keyser/personal-ui-kit';
import { NewApiKey } from '../../models/apiKeys';

interface GenerateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (name: string, description: string) => void;
  isGenerating: boolean;
  generatedKey?: NewApiKey | null;
}

export function GenerateKeyModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  generatedKey,
}: GenerateKeyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(name, description);
  };

  const handleCopyKey = async () => {
    if (generatedKey?.key) {
      try {
        await navigator.clipboard.writeText(generatedKey.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleClose = () => {
    if (generatedKey) {
      // Confirm before closing if key hasn't been copied
      if (!copied) {
        const confirmed = window.confirm(
          'Have you saved your API key? It will not be shown again after closing this dialog.'
        );
        if (!confirmed) return;
      }
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={generatedKey ? 'API Key Generated' : 'Generate New API Key'}
      size="md"
    >
      {!generatedKey ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Input
              label="Name (optional)"
              placeholder="e.g., Production Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              helperText="A descriptive name for this API key"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <TextArea
              label="Description (optional)"
              placeholder="e.g., API key for tracking analytics on the main production website"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              helperText="Optional details about where and how this key will be used"
            />
          </div>

          <Alert variant="info" style={{ marginBottom: '1.5rem' }}>
            The full API key will be shown only once after generation. Make sure to save it securely.
          </Alert>

          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
          }}>
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate API Key'}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
            <strong>Save this key now!</strong> For security reasons, it will never be shown again.
            If you lose this key, you'll need to generate a new one.
          </Alert>

          <div style={{ marginBottom: '1.5rem' }}>
            <Text
              variant="label"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
              }}
            >
              Your API Key
            </Text>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}>
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all',
                }}
              >
                {generatedKey.key}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyKey}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {generatedKey.name && (
            <div style={{ marginBottom: '1rem' }}>
              <Text variant="body">
                <strong>Name:</strong> {generatedKey.name}
              </Text>
            </div>
          )}

          {generatedKey.description && (
            <div style={{ marginBottom: '1rem' }}>
              <Text variant="body">
                <strong>Description:</strong> {generatedKey.description}
              </Text>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1.5rem',
          }}>
            <Button
              variant="primary"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
