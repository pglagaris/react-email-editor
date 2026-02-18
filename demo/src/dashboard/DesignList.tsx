import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Design, Folder, Tag, designsApi, foldersApi, tagsApi } from './hooks/useApi';
import FolderTree from './components/FolderTree';
import DesignCard from './components/DesignCard';
import SearchBar from './components/SearchBar';

const Container = styled.div`
  display: flex;
  height: 100%;
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  overflow: hidden;
`;

const TopBar = styled.div`
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  color: #1a1a2e;
`;

const NewBtn = styled.button`
  background: #61dafb;
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #4fc3f7; }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const Empty = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;

  h2 {
    color: #666;
    margin-bottom: 8px;
  }
`;

const DesignList = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Design[] | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      const data = await foldersApi.list();
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const data = await tagsApi.list();
      setAllTags(data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  const loadDesigns = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedFolderId === '__unfiled') {
        params.unfiled = true;
      } else if (selectedFolderId) {
        params.folder_id = selectedFolderId;
      }
      const data = await designsApi.list(params);
      setDesigns(data);
    } catch (err) {
      console.error('Failed to load designs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    loadFolders();
    loadTags();
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [selectedFolderId]);

  const handleNewDesign = async () => {
    try {
      const design = await designsApi.create({
        name: 'Untitled Design',
        folder_id: selectedFolderId && selectedFolderId !== '__unfiled' ? selectedFolderId : null,
      });
      navigate(`/dashboard/design/edit/${design.id}`);
    } catch (err) {
      console.error('Failed to create design:', err);
    }
  };

  const handleDeleteDesign = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await designsApi.delete(id);
      loadDesigns();
      loadFolders();
    } catch (err) {
      console.error('Failed to delete design:', err);
    }
  };

  const currentFolderName = selectedFolderId === null
    ? 'All Designs'
    : selectedFolderId === '__unfiled'
      ? 'Unfiled'
      : folders.find(f => f.id === selectedFolderId)?.name || 'Folder';

  const displayDesigns = isSearchActive ? (searchResults || []) : designs;

  return (
    <Container>
      <FolderTree
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onFoldersChanged={() => { loadFolders(); loadDesigns(); }}
      />

      <Main>
        <TopBar>
          <TopRow>
            <Title>{isSearchActive ? 'Search Results' : currentFolderName}</Title>
            <NewBtn onClick={handleNewDesign}>+ New Design</NewBtn>
          </TopRow>
          <SearchBar
            allTags={allTags}
            onResults={setSearchResults}
            onActiveChange={setIsSearchActive}
          />
        </TopBar>

        <Content>
          {displayDesigns.length === 0 ? (
            <Empty>
              <h2>{isSearchActive ? 'No matching designs' : 'No designs yet'}</h2>
              <p>{isSearchActive ? 'Try a different search or tag filter.' : 'Click "+ New Design" to get started.'}</p>
            </Empty>
          ) : (
            <Grid>
              {displayDesigns.map(design => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onOpen={(id) => navigate(`/dashboard/design/edit/${id}`)}
                  onDelete={handleDeleteDesign}
                />
              ))}
            </Grid>
          )}
        </Content>
      </Main>
    </Container>
  );
};

export default DesignList;
