import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Link, useParams, useNavigate } from 'react-router-dom';

import EmailEditor, { EditorRef, EmailEditorProps } from '../../../src';
import { designsApi, tagsApi, Design, Tag } from './hooks/useApi';
import { useAutosave } from './hooks/useAutosave';
import SaveIndicator from './components/SaveIndicator';
import TagManager from './components/TagManager';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
`;

const Bar = styled.div`
  background-color: #1a1a2e;
  color: #fff;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 52px;
  gap: 12px;
`;

const BackLink = styled(Link)`
  color: #61dafb;
  text-decoration: none;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 4px;
  &:hover { background: rgba(255,255,255,0.1); }
`;

const NameInput = styled.input`
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  min-width: 200px;
  max-width: 350px;
  transition: border-color 0.15s;

  &:hover, &:focus {
    border-color: #444;
    outline: none;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Btn = styled.button<{ variant?: 'primary' | 'default' }>`
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;

  background: ${({ variant }) => variant === 'primary' ? '#61dafb' : '#333'};
  color: ${({ variant }) => variant === 'primary' ? '#000' : '#fff'};

  &:hover {
    background: ${({ variant }) => variant === 'primary' ? '#4fc3f7' : '#444'};
  }
`;

const TagBar = styled.div`
  background: #f3f4f6;
  padding: 8px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
`;

const DesignEdit = () => {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();
  const emailEditorRef = useRef<EditorRef | null>(null);

  const [design, setDesign] = useState<Design | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [name, setName] = useState('Untitled Design');
  const [editorReady, setEditorReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const isNewDesign = !designId;

  // Load design from API
  useEffect(() => {
    if (designId) {
      designsApi.get(designId).then(d => {
        setDesign(d);
        setName(d.name);
      }).catch(err => {
        console.error('Failed to load design:', err);
        navigate('/dashboard');
      });
    }
    tagsApi.list().then(setAllTags).catch(console.error);
  }, [designId]);

  // Load design JSON into editor when ready
  useEffect(() => {
    if (!editorReady || !design) return;
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;

    try {
      const json = typeof design.design_json === 'string'
        ? JSON.parse(design.design_json)
        : design.design_json;

      if (json && Object.keys(json).length > 0) {
        editor.loadDesign(json);
      }
    } catch (err) {
      console.error('Failed to parse design JSON:', err);
    }
  }, [editorReady, design?.id]);

  // Autosave handler
  const handleAutosave = useCallback(async (designJson: any) => {
    if (!designId) return;
    await designsApi.update(designId, { design_json: designJson });
  }, [designId]);

  const { status: saveStatus, lastSaved, saveNow } = useAutosave({
    editor: emailEditorRef.current?.editor,
    onSave: handleAutosave,
    delay: 3000,
    enabled: editorReady && !!designId,
  });

  // Save name on blur
  const handleNameBlur = async () => {
    if (!designId || name === design?.name) return;
    try {
      await designsApi.update(designId, { name });
      setDesign(prev => prev ? { ...prev, name } : prev);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  // Manual save
  const handleSave = () => {
    saveNow();
    handleNameBlur();
  };

  // Export HTML
  const exportHtml = () => {
    const editor = emailEditorRef.current?.editor;
    editor?.exportHtml(async (data: any) => {
      const { html } = data;
      // Also save to DB
      if (designId) {
        try {
          await designsApi.update(designId, { html_cache: html });
        } catch (err) {
          console.error('Failed to cache HTML:', err);
        }
      }
      // Copy to clipboard
      await navigator.clipboard.writeText(html);
      alert('HTML copied to clipboard! Also logged in developer console.');
      console.log('exportHtml', html);
    });
  };

  const togglePreview = () => {
    const editor = emailEditorRef.current?.editor;
    if (preview) {
      editor?.hidePreview();
      setPreview(false);
    } else {
      editor?.showPreview('desktop');
      setPreview(true);
    }
  };

  const onReady: EmailEditorProps['onReady'] = () => {
    setEditorReady(true);
  };

  // Refresh tags+design after tag changes
  const handleTagsChanged = async () => {
    const [tags, d] = await Promise.all([
      tagsApi.list(),
      designId ? designsApi.get(designId) : Promise.resolve(null),
    ]);
    setAllTags(tags);
    if (d) setDesign(d);
  };

  return (
    <Container>
      <Bar>
        <BackLink to="/dashboard">← Back</BackLink>

        <NameInput
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          placeholder="Design name..."
        />

        <SaveIndicator status={saveStatus} lastSaved={lastSaved} />

        <Spacer />

        <BtnGroup>
          <Btn onClick={togglePreview}>
            {preview ? 'Hide' : 'Show'} Preview
          </Btn>
          <Btn onClick={handleSave}>Save Now</Btn>
          <Btn variant="primary" onClick={exportHtml}>Export HTML</Btn>
        </BtnGroup>
      </Bar>

      {designId && design && (
        <TagBar>
          <span>Tags:</span>
          <TagManager
            designId={designId}
            designTags={design.tags || []}
            allTags={allTags}
            onTagsChanged={handleTagsChanged}
          />
        </TagBar>
      )}

      <EmailEditor
        ref={emailEditorRef}
        onReady={onReady}
        options={{
          version: "latest",
          appearance: {
            theme: "modern_light"
          }
        }}
      />
    </Container>
  );
};

export default DesignEdit;
