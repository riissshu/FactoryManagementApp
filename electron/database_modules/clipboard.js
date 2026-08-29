// Clipboard: pinned/copied items users can paste back elsewhere in the app.
function createClipboardModule(db) {
  // =======================
  // Clipboard
  // =======================

  db.exec(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_type TEXT NOT NULL,
        title TEXT NOT NULL,
        source_id INTEGER,
        data TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // =======================
  // Clipboard
  // =======================

  function getPinnedClipboard() {
    return db
      .prepare(
        `
        SELECT
          id,
          entry_type,
          title,
          source_id,
          data,
          pinned,
          created_at
        FROM clipboard_items
        WHERE pinned = 1
        ORDER BY id DESC
      `,
      )
      .all()
      .map((item) => ({
        ...item,
        data: JSON.parse(item.data),
        pinned: true,
      }));
  }

  function savePinnedClipboard(item) {
    const result = db
      .prepare(
        `
        INSERT INTO clipboard_items
          (entry_type, title, source_id, data, pinned)
        VALUES (?, ?, ?, ?, 1)
      `,
      )
      .run(
        item.entry_type,
        item.title,
        item.source_id || null,
        JSON.stringify(item.data),
      );

    return {
      id: result.lastInsertRowid,
      entry_type: item.entry_type,
      title: item.title,
      source_id: item.source_id || null,
      data: item.data,
      pinned: true,
    };
  }

  function deleteClipboardItem(id) {
    db.prepare("DELETE FROM clipboard_items WHERE id = ?").run(id);

    return true;
  }

  return {
    getPinnedClipboard,
    savePinnedClipboard,
    deleteClipboardItem,
  };
}

module.exports = { createClipboardModule };
