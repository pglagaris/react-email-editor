import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

// Get all folders as a flat list (client builds tree)
router.get('/', (_req, res) => {
  try {
    const folders = db.prepare(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM designs d WHERE d.folder_id = f.id) as design_count,
        (SELECT COUNT(*) FROM folders f2 WHERE f2.parent_id = f.id) as subfolder_count
      FROM folders f
      ORDER BY f.name ASC
    `).all();

    res.json(folders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a folder
router.post('/', (req, res) => {
  try {
    const { name, parent_id } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    if (parent_id) {
      const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(parent_id);
      if (!parent) {
        return res.status(400).json({ error: 'Parent folder not found' });
      }
    }

    db.prepare(`
      INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name || 'New Folder', parent_id || null, now, now);

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.status(201).json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rename / move a folder
router.put('/:id', (req, res) => {
  try {
    const { name, parent_id } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (parent_id !== undefined) {
      if (parent_id === req.params.id) {
        return res.status(400).json({ error: 'Cannot move folder into itself' });
      }
      updates.push('parent_id = ?');
      params.push(parent_id || null);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    res.json(folder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a folder (designs get unfiled, subfolders cascade-deleted)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE designs SET folder_id = NULL WHERE folder_id = ?').run(req.params.id);

    const unfileRecursive = (folderId: string) => {
      const subfolders = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(folderId) as any[];
      for (const sub of subfolders) {
        db.prepare('UPDATE designs SET folder_id = NULL WHERE folder_id = ?').run(sub.id);
        unfileRecursive(sub.id);
      }
    };
    unfileRecursive(req.params.id);

    const result = db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
