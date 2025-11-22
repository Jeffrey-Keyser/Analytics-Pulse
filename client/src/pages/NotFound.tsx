import React from 'react';
import { Container, Button } from '@jeffrey-keyser/personal-ui-kit';
import { useNavigate } from 'react-router-dom';

/**
 * 404 Not Found Page
 * Shown when no route matches
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <Container size="md">
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', margin: 0, color: '#999' }}>404</h1>
        <h2>Page Not Found</h2>
        <p style={{ marginBottom: '2rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')} variant="primary">
          Go to Dashboard
        </Button>
      </div>
    </Container>
  );
}

export default NotFound;
