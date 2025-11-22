import React from 'react';
import { Container } from '@jeffrey-keyser/personal-ui-kit';
import { ProjectList } from '../components/projects';

/**
 * Dashboard (Project List) Page
 * Route: /
 * Shows list of all analytics projects with search, filter, and pagination
 */
export function Dashboard() {
  return (
    <Container size="xl">
      <ProjectList />
    </Container>
  );
}

export default Dashboard;
