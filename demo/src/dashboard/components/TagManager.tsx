import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Tag, tagsApi, designsApi } from '../hooks/useApi';

interface TagManagerProps {
  designId: string;
  designTags: Tag[];
  allTags: Tag[];
  onTagsChanged: () => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280',
];

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
`;

const TagBadge = styled.span<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: ${({ color }) => color}22;
  color: ${({ color }) => color};
  border: 1px solid ${({ color }) => color}44;

  button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 13px;
    line-height: 1;
    opacity: 0.6;
    &:hover { opacity: 1; }
  }
`;

const AddTagBtn = styled.button`
  background: none;
  border: 1px dashed #ccc;
  color: #999;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  &:hover { border-color: #61dafb; color: #61dafb; }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 4px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
`;

const TagOption = styled.div<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  background: ${({ selected }) => (selected ? '#f0f9ff' : 'transparent')};

  &:hover {
    background: #f3f4f6;
  }
`;

const ColorDot = styled.span<{ color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ color }) => color};
  flex-shrink: 0;
`;

const CreateOption = styled(TagOption)`
  border-top: 1px solid #e5e7eb;
  color: #3b82f6;
  font-weight: 500;
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
`;

const ColorSwatch = styled.button<{ color: string; active: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ color }) => color};
  border: 2px solid ${({ active, color }) => (active ? color : 'transparent')};
  cursor: pointer;
  outline: ${({ active }) => (active ? '2px solid #61dafb' : 'none')};
  outline-offset: 1px;
`;

const TagManager: React.FC<TagManagerProps> = ({ designId, designTags, allTags, onTagsChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const designTagIds = new Set(designTags.map(t => t.id));

  const filtered = allTags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCreate = search.trim() && !allTags.some(t => t.name.toLowerCase() === search.trim().toLowerCase());

  // Close on outside click  
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleToggleTag = async (tagId: string) => {
    try {
      if (designTagIds.has(tagId)) {
        await designsApi.removeTag(designId, tagId);
      } else {
        await designsApi.addTag(designId, tagId);
      }
      onTagsChanged();
    } catch (err) {
      console.error('Failed to toggle tag:', err);
    }
  };

  const handleCreateTag = async () => {
    try {
      const tag = await tagsApi.create({ name: search.trim(), color: newTagColor });
      await designsApi.addTag(designId, tag.id);
      setSearch('');
      onTagsChanged();
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await designsApi.removeTag(designId, tagId);
      onTagsChanged();
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  return (
    <Wrapper ref={dropdownRef}>
      {designTags.map(tag => (
        <TagBadge key={tag.id} color={tag.color}>
          {tag.name}
          <button onClick={() => handleRemoveTag(tag.id)} title="Remove tag">×</button>
        </TagBadge>
      ))}

      <AddTagBtn onClick={() => setIsOpen(!isOpen)}>+ Tag</AddTagBtn>

      {isOpen && (
        <Dropdown>
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or create tag..."
            autoFocus
          />

          {filtered.map(tag => (
            <TagOption
              key={tag.id}
              selected={designTagIds.has(tag.id)}
              onClick={() => handleToggleTag(tag.id)}
            >
              <ColorDot color={tag.color} />
              {tag.name}
              {designTagIds.has(tag.id) && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </TagOption>
          ))}

          {showCreate && (
            <>
              <ColorPicker>
                {TAG_COLORS.map(c => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    active={newTagColor === c}
                    onClick={() => setNewTagColor(c)}
                  />
                ))}
              </ColorPicker>
              <CreateOption selected={false} onClick={handleCreateTag}>
                + Create "{search.trim()}"
              </CreateOption>
            </>
          )}
        </Dropdown>
      )}
    </Wrapper>
  );
};

export default TagManager;
