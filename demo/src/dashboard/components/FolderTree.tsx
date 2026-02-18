import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Folder, foldersApi } from '../hooks/useApi';

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChanged: () => void;
  showAll?: boolean;
}

const Sidebar = styled.div`
  width: 240px;
  min-width: 240px;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a2a4a;
  overflow-y: auto;
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #2a2a4a;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
  }
`;

const AddBtn = styled.button`
  background: none;
  border: 1px solid #444;
  color: #ccc;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 14px;
  &:hover { background: #333; color: #fff; }
`;

const FolderItem = styled.div<{ active: boolean; depth: number }>`
  display: flex;
  align-items: center;
  padding: 8px 12px 8px ${({ depth }) => 12 + depth * 18}px;
  cursor: pointer;
  font-size: 13px;
  background: ${({ active }) => (active ? '#2a2a4a' : 'transparent')};
  border-left: 3px solid ${({ active }) => (active ? '#61dafb' : 'transparent')};
  transition: background 0.15s;

  &:hover {
    background: #2a2a4a;
  }
`;

const FolderIcon = styled.span`
  margin-right: 8px;
  font-size: 14px;
`;

const FolderName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.span`
  font-size: 11px;
  color: #666;
  margin-left: 4px;
`;

const FolderActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;

  ${FolderItem}:hover & {
    opacity: 1;
  }
`;

const SmallBtn = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0 3px;
  font-size: 12px;
  &:hover { color: #fff; }
`;

const SpecialItem = styled(FolderItem)`
  font-weight: ${({ active }) => (active ? '600' : '400')};
`;

const EditInput = styled.input`
  background: #2a2a4a;
  border: 1px solid #61dafb;
  color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  width: 100%;
  outline: none;
`;

interface FolderNode extends Folder {
  children: FolderNode[];
}

function buildTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  folders.forEach(f => map.set(f.id, { ...f, children: [] }));

  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onFoldersChanged,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = buildTree(folders);

  const totalDesigns = folders.reduce((sum, f) => sum + (f.design_count || 0), 0);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = async (parentId: string | null = null) => {
    try {
      const folder = await foldersApi.create({ name: 'New Folder', parent_id: parentId });
      onFoldersChanged();
      if (parentId) {
        setExpanded(prev => new Set(prev).add(parentId));
      }
      setEditingId(folder.id);
      setEditName(folder.name);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await foldersApi.update(id, { name: editName.trim() });
      onFoldersChanged();
    } catch (err) {
      console.error('Failed to rename folder:', err);
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete folder "${name}"? Designs inside will be moved to Unfiled.`)) return;
    try {
      await foldersApi.delete(id);
      if (selectedFolderId === id) onSelectFolder(null);
      onFoldersChanged();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const renderFolder = (node: FolderNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isEditing = editingId === node.id;

    return (
      <React.Fragment key={node.id}>
        <FolderItem
          active={selectedFolderId === node.id}
          depth={depth}
          onClick={() => {
            onSelectFolder(node.id);
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          <FolderIcon onClick={(e) => { e.stopPropagation(); if (hasChildren) toggleExpand(node.id); }}>
            {hasChildren ? (isExpanded ? '📂' : '📁') : '📁'}
          </FolderIcon>
          {isEditing ? (
            <EditInput
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => handleRename(node.id)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(node.id); if (e.key === 'Escape') setEditingId(null); }}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <>
              <FolderName>{node.name}</FolderName>
              <Count>{node.design_count || ''}</Count>
              <FolderActions>
                <SmallBtn title="Add subfolder" onClick={e => { e.stopPropagation(); handleCreateFolder(node.id); }}>+</SmallBtn>
                <SmallBtn title="Rename" onClick={e => { e.stopPropagation(); setEditingId(node.id); setEditName(node.name); }}>✎</SmallBtn>
                <SmallBtn title="Delete" onClick={e => { e.stopPropagation(); handleDelete(node.id, node.name); }}>×</SmallBtn>
              </FolderActions>
            </>
          )}
        </FolderItem>
        {hasChildren && isExpanded && node.children.map(child => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <h3>Folders</h3>
        <AddBtn onClick={() => handleCreateFolder(null)} title="New folder">+ New</AddBtn>
      </SidebarHeader>

      <SpecialItem
        active={selectedFolderId === null}
        depth={0}
        onClick={() => onSelectFolder(null)}
      >
        <FolderIcon>📋</FolderIcon>
        <FolderName>All Designs</FolderName>
        <Count>{totalDesigns}</Count>
      </SpecialItem>

      <SpecialItem
        active={selectedFolderId === '__unfiled'}
        depth={0}
        onClick={() => onSelectFolder('__unfiled')}
      >
        <FolderIcon>📄</FolderIcon>
        <FolderName>Unfiled</FolderName>
      </SpecialItem>

      {tree.map(node => renderFolder(node, 0))}
    </Sidebar>
  );
};

export default FolderTree;
