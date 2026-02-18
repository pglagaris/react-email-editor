import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Tag, tagsApi, searchApi, Design } from '../hooks/useApi';

interface SearchBarProps {
  allTags: Tag[];
  onResults: (results: Design[] | null) => void;
  onActiveChange: (active: boolean) => void;
}

const Wrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 500px;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0 10px;
  transition: border-color 0.15s;

  &:focus-within {
    border-color: #61dafb;
  }
`;

const Icon = styled.span`
  font-size: 14px;
  color: #999;
  margin-right: 6px;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  padding: 8px 0;
  font-size: 13px;
  outline: none;
  background: transparent;
`;

const ClearBtn = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  &:hover { color: #333; }
`;

const TagFilters = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const TagChip = styled.button<{ color: string; active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid ${({ color, active }) => active ? color : '#e5e7eb'};
  background: ${({ color, active }) => active ? `${color}22` : '#fff'};
  color: ${({ color, active }) => active ? color : '#666'};

  &:hover {
    border-color: ${({ color }) => color};
  }
`;

const SearchBar: React.FC<SearchBarProps> = ({ allTags, onResults, onActiveChange }) => {
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isActive = query.length > 0 || activeTags.length > 0;

  useEffect(() => {
    onActiveChange(isActive);

    if (!isActive) {
      onResults(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchApi.search({
          q: query || undefined,
          tags: activeTags.length > 0 ? activeTags.join(',') : undefined,
        });
        onResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeTags.join(',')]);

  const toggleTag = (tagName: string) => {
    setActiveTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const clear = () => {
    setQuery('');
    setActiveTags([]);
  };

  return (
    <div>
      <Wrapper>
        <InputWrapper>
          <Icon>🔍</Icon>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search designs across all folders..."
          />
          {isActive && <ClearBtn onClick={clear}>×</ClearBtn>}
        </InputWrapper>
      </Wrapper>

      {allTags.length > 0 && (
        <TagFilters style={{ marginTop: 8 }}>
          {allTags.map(tag => (
            <TagChip
              key={tag.id}
              color={tag.color}
              active={activeTags.includes(tag.name)}
              onClick={() => toggleTag(tag.name)}
            >
              {tag.name}
              {(tag as any).usage_count > 0 && ` (${(tag as any).usage_count})`}
            </TagChip>
          ))}
        </TagFilters>
      )}
    </div>
  );
};

export default SearchBar;
