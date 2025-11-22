import React from 'react';
import { Container } from '@jeffrey-keyser/personal-ui-kit';
import { useNavigate } from 'react-router-dom';

/**
 * Create Project Page
 * Route: /projects/new
 * Form to create a new analytics project
 */
export function CreateProject() {
  const navigate = useNavigate();

  return (
    <Container size="md">
      <div style={{ padding: '2rem 0' }}>
        <h1>Create New Project</h1>
        <p>Project creation form coming soon...</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    </Container>
  );
}

export default CreateProject;
