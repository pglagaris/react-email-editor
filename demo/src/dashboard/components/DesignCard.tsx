import React from 'react';
import styled from 'styled-components';
import { Design, Tag } from '../hooks/useApi';

interface DesignCardProps {
  design: Design;
  onOpen: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

const Card = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    border-color: #61dafb;
    box-shadow: 0 2px 8px rgba(97, 218, 251, 0.15);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0 2px;
  font-size: 16px;
  line-height: 1;
  &:hover { color: #ef4444; }
`;

const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const TagBadge = styled.span<{ color: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: ${({ color }) => color}22;
  color: ${({ color }) => color};
  border: 1px solid ${({ color }) => color}44;
`;

const CardMeta = styled.div`
  font-size: 11px;
  color: #999;
  margin-top: auto;
`;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const DesignCard: React.FC<DesignCardProps> = ({ design, onOpen, onDelete }) => {
  return (
    <Card onClick={() => onOpen(design.id)}>
      <CardHeader>
        <CardTitle title={design.name}>{design.name}</CardTitle>
        <DeleteBtn
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(design.id, design.name); }}
        >
          ×
        </DeleteBtn>
      </CardHeader>

      {design.tags && design.tags.length > 0 && (
        <TagsRow>
          {design.tags.map(tag => (
            <TagBadge key={tag.id} color={tag.color}>{tag.name}</TagBadge>
          ))}
        </TagsRow>
      )}

      <CardMeta>
        Updated {formatDate(design.updated_at)}
        {design.folder_name ? ` · ${design.folder_name}` : ''}
      </CardMeta>
    </Card>
  );
};

export default DesignCard;
