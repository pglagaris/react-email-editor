import { Router } from 'express';
import db from '../db';

const router = Router();

// Search designs by name and/or tags, across all folders
router.get('/', (req, res) => {
  try {
    const { q, tags: tagFilter } = req.query;

    let query = `
      SELECT d.*, 
        GROUP_CONCAT(DISTINCT t.name) as tag_names,
        GROUP_CONCAT(DISTINCT t.id) as tag_ids,
        GROUP_CONCAT(DISTINCT t.color) as tag_colors,
        f.name as folder_name
      FROM designs d
      LEFT JOIN design_tags dt ON d.id = dt.design_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      LEFT JOIN folders f ON d.folder_id = f.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push('d.name LIKE ?');
      params.push(`%${q}%`);
    }

    if (tagFilter) {
      const tagNames = (tagFilter as string).split(',').map(t => t.trim());
      conditions.push(`d.id IN (
        SELECT dt2.design_id FROM design_tags dt2
        JOIN tags t2 ON dt2.tag_id = t2.id
        WHERE t2.name IN (${tagNames.map(() => '?').join(',')})
        GROUP BY dt2.design_id
        HAVING COUNT(DISTINCT t2.name) = ?
      )`);
      params.push(...tagNames, tagNames.length);
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

export default router;
