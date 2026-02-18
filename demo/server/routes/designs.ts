import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

// List all designs, with optional folder + tag filtering
router.get('/', (req, res) => {
  try {
    const { folder_id, tag, unfiled } = req.query;

    let query = `
      SELECT d.*, 
        GROUP_CONCAT(DISTINCT t.name) as tag_names,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids,
        GROUP_CONCAT(DISTINCT t.color) as tag_colors
      FROM designs d
      LEFT JOIN design_tags dt ON d.id = dt.design_id
      LEFT JOIN tags t ON dt.tag_id = t.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (folder_id) {
      conditions.push('d.folder_id = ?');
      params.push(folder_id);
    }

    if (unfiled === 'true') {
      conditions.push('d.folder_id IS NULL');
    }

    if (tag) {
      const tagNames = (tag as string).split(',').map(t => t.trim());
      conditions.push(`d.id IN (
        SELECT dt2.design_id FROM design_tags dt2
        JOIN tags t2 ON dt2.tag_id = t2.id
        WHERE t2.name IN (${tagNames.map(() => '?').join(',')})
      )`);
      params.push(...tagNames);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY d.id ORDER BY d.updated_at DESC';

    const designs = db.prepare(query).all(...params);

    const results = (designs as any[]).map((d: any) => ({
      ...d,
      tags: d.tag_names
        ? d.tag_names.split(',').map((name: string, i: number) => ({
            id: d.tag_ids.split(',')[i],
            name,
            color: d.tag_colors.split(',')[i],
          }))
        : [],
      tag_names: undefined,
      tag_ids: undefined,
      tag_colors: undefined,
    }));

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single design
router.get('/:id', (req, res) => {
  try {
    const design = db.prepare(`
      SELECT d.*, 
        GROUP_CONCAT(DISTINCT t.name) as tag_names,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids,
        GROUP_CONCAT(DISTINCT t.color) as tag_colors
      FROM designs d
      LEFT JOIN design_tags dt ON d.id = dt.design_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.id = ?
      GROUP BY d.id
    `).get(req.params.id) as any;

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const result = {
      ...design,
      tags: design.tag_names
        ? design.tag_names.split(',').map((name: string, i: number) => ({
            id: design.tag_ids.split(',')[i],
            name,
            color: design.tag_colors.split(',')[i],
          }))
        : [],
      tag_names: undefined,
      tag_ids: undefined,
      tag_colors: undefined,
    };

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new design
router.post('/', (req, res) => {
  try {
    const { name, folder_id, design_json } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO designs (id, name, folder_id, design_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name || 'Untitled Design', folder_id || null, JSON.stringify(design_json || {}), now, now);

    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(id);
    res.status(201).json(design);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a design (used by both manual save and autosave)
router.put('/:id', (req, res) => {
  try {
    const { name, design_json, html_cache } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (design_json !== undefined) {
      updates.push('design_json = ?');
      params.push(JSON.stringify(design_json));
    }
    if (html_cache !== undefined) {
      updates.push('html_cache = ?');
      params.push(html_cache);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE designs SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id);
    res.json(design);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a design
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM designs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Move a design to a different folder
router.put('/:id/move', (req, res) => {
  try {
    const { folder_id } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE designs SET folder_id = ?, updated_at = ? WHERE id = ?
    `).run(folder_id || null, now, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id);
    res.json(design);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add tags to a design
router.post('/:id/tags', (req, res) => {
  try {
    const { tag_id } = req.body;

    db.prepare(`
      INSERT OR IGNORE INTO design_tags (design_id, tag_id) VALUES (?, ?)
    `).run(req.params.id, tag_id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a tag from a design
router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    db.prepare(`
      DELETE FROM design_tags WHERE design_id = ? AND tag_id = ?
    `).run(req.params.id, req.params.tagId);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
