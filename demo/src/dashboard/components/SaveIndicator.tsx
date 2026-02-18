import React from 'react';
import styled from 'styled-components';
import { SaveStatus } from '../hooks/useAutosave';

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
}

const Wrapper = styled.div<{ status: SaveStatus }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  color: ${({ status }) =>
    status === 'saving' ? '#f59e0b' :
    status === 'saved' ? '#10b981' :
    status === 'error' ? '#ef4444' :
    '#9ca3af'};
  background: ${({ status }) =>
    status === 'saving' ? 'rgba(245, 158, 11, 0.1)' :
    status === 'saved' ? 'rgba(16, 185, 129, 0.1)' :
    status === 'error' ? 'rgba(239, 68, 68, 0.1)' :
    'transparent'};
  transition: all 0.2s ease;
  white-space: nowrap;
`;

const Dot = styled.span<{ status: SaveStatus }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  ${({ status }) => status === 'saving' ? `
    animation: pulse 1s infinite;
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  ` : ''}
`;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SaveIndicator: React.FC<SaveIndicatorProps> = ({ status, lastSaved }) => {
  const labels: Record<SaveStatus, string> = {
    idle: 'Not saved yet',
    saving: 'Saving...',
    saved: `Saved at ${lastSaved ? formatTime(lastSaved) : ''}`,
    error: 'Save failed',
  };

  return (
    <Wrapper status={status}>
      <Dot status={status} />
      {labels[status]}
    </Wrapper>
  );
};

export default SaveIndicator;
