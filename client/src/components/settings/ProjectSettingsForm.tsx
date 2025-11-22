import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  TextArea,
  Button,
  Label,
  Spacer,
  Alert,
} from '@jeffrey-keyser/personal-ui-kit';
import { Project, UpdateProjectRequest } from '../../models/projects';
import styled from 'styled-components';

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

interface ProjectSettingsFormProps {
  project: Project;
  onSave: (data: UpdateProjectRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string | null;
}

/**
 * Project Settings Form Component
 * Allows editing of project name, domain, and description
 */
export function ProjectSettingsForm({
  project,
  onSave,
  onCancel,
  isLoading = false,
  error = null,
  successMessage = null,
}: ProjectSettingsFormProps) {
  const [formData, setFormData] = useState<UpdateProjectRequest>({
    name: project.name,
    domain: project.domain,
    description: project.description || '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    domain?: string;
  }>({});

  const [hasChanges, setHasChanges] = useState(false);

  // Check if form has changes
  useEffect(() => {
    const changed =
      formData.name !== project.name ||
      formData.domain !== project.domain ||
      (formData.description || '') !== (project.description || '');
    setHasChanges(changed);
  }, [formData, project]);

  const validateForm = (): boolean => {
    const errors: { name?: string; domain?: string } = {};

    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = 'Project name is required';
    } else if (formData.name.length > 255) {
      errors.name = 'Project name must be 255 characters or less';
    }

    if (!formData.domain || formData.domain.trim().length === 0) {
      errors.domain = 'Domain is required';
    } else if (formData.domain.length > 255) {
      errors.domain = 'Domain must be 255 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Only send changed fields
    const updates: UpdateProjectRequest = {};
    if (formData.name !== project.name) updates.name = formData.name;
    if (formData.domain !== project.domain) updates.domain = formData.domain;
    if ((formData.description || '') !== (project.description || '')) {
      updates.description = formData.description;
    }

    onSave(updates);
  };

  const handleCancel = () => {
    setFormData({
      name: project.name,
      domain: project.domain,
      description: project.description || '',
    });
    setValidationErrors({});
    onCancel();
  };

  return (
    <Card>
      <h2>Project Settings</h2>
      <Spacer size="md" />

      {error && (
        <>
          <Alert variant="error">{error}</Alert>
          <Spacer size="md" />
        </>
      )}

      {successMessage && (
        <>
          <Alert variant="success">{successMessage}</Alert>
          <Spacer size="md" />
        </>
      )}

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name" required>
            Project Name
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Enter project name"
            disabled={isLoading}
            error={!!validationErrors.name}
            helperText={validationErrors.name}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="domain" required>
            Domain
          </Label>
          <Input
            id="domain"
            name="domain"
            value={formData.domain || ''}
            onChange={(e) =>
              setFormData({ ...formData, domain: e.target.value })
            }
            placeholder="example.com"
            disabled={isLoading}
            error={!!validationErrors.domain}
            helperText={validationErrors.domain}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Description</Label>
          <TextArea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter project description (optional)"
            rows={4}
            disabled={isLoading}
          />
        </FormGroup>

        <ButtonGroup>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!hasChanges || isLoading}
            loading={isLoading}
          >
            Save Changes
          </Button>
        </ButtonGroup>
      </form>
    </Card>
  );
}

export default ProjectSettingsForm;