import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

// Get all tags
router.get('/', (_req, res) => {
  try {
    const tags = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM design_tags dt WHERE dt.tag_id = t.id) as usage_count
      FROM tags t
      ORDER BY t.name ASC
    `).all();

    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a tag
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const existing = db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name.trim());
    if (existing) {
      return res.json(existing);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tags (id, name, color, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), color || '#6B7280', now);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.status(201).json(tag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a tag
router.put('/:id', (req, res) => {
  try {
    const { name, color } = req.body;

    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.json(existing);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    res.json(tag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a tag
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
