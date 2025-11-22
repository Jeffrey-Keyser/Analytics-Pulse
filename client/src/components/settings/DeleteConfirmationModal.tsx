import React, { useState } from 'react';
import {
  Modal,
  Input,
  Button,
  Label,
  Spacer,
  Alert,
} from '@jeffrey-keyser/personal-ui-kit';
import styled from 'styled-components';

const ModalContent = styled.div`
  padding: 1.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const WarningBox = styled.div`
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 0.5rem 0;
    color: #856404;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #856404;
  }
`;

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * Delete Confirmation Modal Component
 * Requires typing project name to confirm deletion
 */
export function DeleteConfirmationModal({
  isOpen,
  projectName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (confirmText !== projectName) {
      setError('Project name does not match. Please type the exact project name to confirm.');
      return;
    }

    setError(null);
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmText('');
    setError(null);
    onCancel();
  };

  const isConfirmDisabled = confirmText !== projectName || isDeleting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Delete Project"
      size="md"
    >
      <ModalContent>
        <Alert variant="error">
          <strong>Warning:</strong> This action cannot be undone.
        </Alert>
        <Spacer size="md" />

        <WarningBox>
          <h4>This will permanently delete:</h4>
          <ul>
            <li>All analytics events and data</li>
            <li>All aggregated statistics</li>
            <li>Project configuration and settings</li>
            <li>All associated API keys</li>
          </ul>
        </WarningBox>

        <p>
          To confirm deletion, please type the project name{' '}
          <strong>{projectName}</strong> below:
        </p>

        <Label htmlFor="confirm-name">Project Name</Label>
        <Input
          id="confirm-name"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          placeholder={projectName}
          disabled={isDeleting}
          error={!!error}
          helperText={error || undefined}
          autoFocus
        />

        <Spacer size="lg" />

        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            loading={isDeleting}
          >
            Delete Project
          </Button>
        </ButtonGroup>
      </ModalContent>
    </Modal>
  );
}

export default DeleteConfirmationModal;