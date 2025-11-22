import React from 'react';
import { Card, Button, Spacer } from '@jeffrey-keyser/personal-ui-kit';
import styled from 'styled-components';

const DangerCard = styled(Card)`
  border: 2px solid #dc3545;
  background-color: #fff5f5;
`;

const DangerHeader = styled.div`
  h3 {
    color: #dc3545;
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
    color: #666;
  }
`;

const DangerContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const DangerDescription = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 0.25rem 0;
    color: #333;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }
`;

interface DangerZoneProps {
  onDelete: () => void;
}

/**
 * Danger Zone Component
 * Displays dangerous actions like deleting the project
 */
export function DangerZone({ onDelete }: DangerZoneProps) {
  return (
    <DangerCard>
      <DangerHeader>
        <h3>Danger Zone</h3>
        <p>Irreversible and destructive actions</p>
      </DangerHeader>

      <Spacer size="md" />

      <DangerContent>
        <DangerDescription>
          <h4>Delete this project</h4>
          <p>
            Once you delete a project, there is no going back. All data,
            analytics events, and configurations will be permanently removed.
          </p>
        </DangerDescription>
        <Button variant="danger" onClick={onDelete}>
          Delete Project
        </Button>
      </DangerContent>
    </DangerCard>
  );
}

export default DangerZone;