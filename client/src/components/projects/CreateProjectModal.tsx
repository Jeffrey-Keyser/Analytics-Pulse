import React, { useState } from 'react';
import { Button, Text } from '@jeffrey-keyser/personal-ui-kit';
import { useCreateProjectMutation } from '../../reducers';
import { CreateProjectRequest } from '../../models';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [createProject, { isLoading, error }] = useCreateProjectMutation();
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    domain: '',
    description: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.length > 255) {
      errors.name = 'Project name must be less than 255 characters';
    }

    if (!formData.domain.trim()) {
      errors.domain = 'Domain is required';
    } else if (formData.domain.length > 255) {
      errors.domain = 'Domain must be less than 255 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await createProject(formData).unwrap();
      // Reset form
      setFormData({
        name: '',
        domain: '',
        description: '',
      });
      setValidationErrors({});
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      domain: '',
      description: '',
    });
    setValidationErrors({});
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <Text variant="h2" weight="semibold" style={{ margin: 0 }}>
            Create New Project
          </Text>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              <Text variant="body2" weight="medium">
                Project Name *
              </Text>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`${styles.input} ${validationErrors.name ? styles.inputError : ''}`}
              placeholder="My Analytics Project"
              disabled={isLoading}
            />
            {validationErrors.name && (
              <Text variant="caption" style={{ color: 'var(--color-danger, #dc2626)', marginTop: '0.25rem' }}>
                {validationErrors.name}
              </Text>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="domain" className={styles.label}>
              <Text variant="body2" weight="medium">
                Domain *
              </Text>
            </label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              className={`${styles.input} ${validationErrors.domain ? styles.inputError : ''}`}
              placeholder="example.com"
              disabled={isLoading}
            />
            {validationErrors.domain && (
              <Text variant="caption" style={{ color: 'var(--color-danger, #dc2626)', marginTop: '0.25rem' }}>
                {validationErrors.domain}
              </Text>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              <Text variant="body2" weight="medium">
                Description (Optional)
              </Text>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="Describe your project..."
              rows={4}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <Text variant="body2" style={{ color: 'var(--color-danger, #dc2626)' }}>
                {('data' in error && typeof error.data === 'object' && error.data !== null && 'message' in error.data)
                  ? String(error.data.message)
                  : 'Failed to create project. Please try again.'}
              </Text>
            </div>
          )}

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
