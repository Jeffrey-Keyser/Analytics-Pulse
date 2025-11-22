import React, { useState } from 'react';
import { Button, Text } from '@jeffrey-keyser/personal-ui-kit';
import { Project } from '../../models';
import { useDeleteProjectMutation } from '../../reducers';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await deleteProject(project.id).unwrap();
      onDelete?.(project.id);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.card} data-testid="project-card">
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Text variant="h3" weight="semibold" style={{ margin: 0 }}>
            {project.name}
          </Text>
          <Text variant="body2" color="secondary" style={{ margin: '0.25rem 0 0 0' }}>
            {project.domain}
          </Text>
        </div>
        <div className={styles.statusBadge}>
          <span className={project.is_active ? styles.activeStatus : styles.inactiveStatus}>
            {project.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {project.description && (
        <div className={styles.description}>
          <Text variant="body2" color="secondary">
            {project.description}
          </Text>
        </div>
      )}

      <div className={styles.metadata}>
        <div className={styles.metadataItem}>
          <Text variant="caption" color="secondary">
            Created:
          </Text>
          <Text variant="caption" weight="medium">
            {formatDate(project.created_at)}
          </Text>
        </div>
        <div className={styles.metadataItem}>
          <Text variant="caption" color="secondary">
            Updated:
          </Text>
          <Text variant="caption" weight="medium">
            {formatDate(project.updated_at)}
          </Text>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          variant="outline"
          size="small"
          onClick={() => {
            /* TODO: Navigate to project details */
          }}
        >
          View Details
        </Button>
        {showDeleteConfirm ? (
          <div className={styles.deleteConfirm}>
            <Text variant="caption" color="secondary" style={{ marginRight: '0.5rem' }}>
              Confirm deletion?
            </Text>
            <Button
              variant="primary"
              size="small"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ marginRight: '0.5rem' }}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="small"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{ color: 'var(--color-danger, #dc2626)' }}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProjectCard;
