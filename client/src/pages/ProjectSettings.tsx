import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Spacer,
  LoadingSpinner,
  Alert,
} from '@jeffrey-keyser/personal-ui-kit';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '../reducers/projects.api';
import {
  ProjectSettingsForm,
  DeleteConfirmationModal,
  DangerZone,
} from '../components/settings';
import { UpdateProjectRequest } from '../models/projects';
import styled from 'styled-components';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const PageTitle = styled.h1`
  margin: 0;
`;

/**
 * Project Settings Page
 * Route: /projects/:id/settings
 * Edit project details and danger zone (delete)
 */
export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // API hooks
  const {
    data: projectResponse,
    isLoading,
    error: fetchError,
  } = useGetProjectQuery(id || '', {
    skip: !id,
  });

  const [
    updateProject,
    {
      isLoading: isUpdating,
      error: updateError,
      isSuccess: updateSuccess,
    },
  ] = useUpdateProjectMutation();

  const [
    deleteProject,
    {
      isLoading: isDeleting,
      isSuccess: deleteSuccess,
    },
  ] = useDeleteProjectMutation();

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Show success message after update
  useEffect(() => {
    if (updateSuccess) {
      setSuccessMessage('Project settings updated successfully!');
    }
  }, [updateSuccess]);

  // Navigate back after successful deletion
  useEffect(() => {
    if (deleteSuccess) {
      navigate('/projects', {
        state: { message: 'Project deleted successfully' },
      });
    }
  }, [deleteSuccess, navigate]);

  if (!id) {
    return (
      <Container size="md">
        <Alert variant="error">Invalid project ID</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container size="md">
        <LoadingSpinner />
      </Container>
    );
  }

  if (fetchError || !projectResponse?.data) {
    return (
      <Container size="md">
        <Alert variant="error">
          Failed to load project settings. Please try again.
        </Alert>
        <Spacer size="md" />
        <Button onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Container>
    );
  }

  const project = projectResponse.data;

  const handleSave = async (updates: UpdateProjectRequest) => {
    try {
      await updateProject({ id, body: updates }).unwrap();
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${id}`);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProject(id).unwrap();
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if ('data' in error && error.data?.message) return error.data.message;
    if ('error' in error) return error.error;
    return 'An unexpected error occurred';
  };

  return (
    <Container size="md">
      <div style={{ padding: '2rem 0' }}>
        <PageHeader>
          <PageTitle>Project Settings</PageTitle>
          <Button variant="secondary" onClick={() => navigate(`/projects/${id}`)}>
            Back to Project
          </Button>
        </PageHeader>

        <ProjectSettingsForm
          project={project}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isUpdating}
          error={updateError ? getErrorMessage(updateError) : null}
          successMessage={successMessage}
        />

        <Spacer size="xl" />

        <DangerZone onDelete={handleDeleteClick} />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          projectName={project.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      </div>
    </Container>
  );
}

export default ProjectSettings;
