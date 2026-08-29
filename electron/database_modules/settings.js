const crypto = require("crypto");

// Factory settings: profile info, master password, export preferences.
function createSettingsModule(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factory_name TEXT NOT NULL,
        factory_logo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);
  try {
    db.exec("ALTER TABLE settings ADD COLUMN master_password_hash TEXT");
  } catch (_) {}

  try {
    db.exec(
      "ALTER TABLE settings ADD COLUMN open_pdf_after_export INTEGER NOT NULL DEFAULT 1",
    );
  } catch (_) {}
  // =======================
  // Settings Functions
  // =======================

  function getSettings() {
    return db.prepare("SELECT * FROM settings LIMIT 1").get();
  }

  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
  }

  function verifyMasterPassword(password) {
    const settings = getSettings();
    if (!settings?.master_password_hash) return false;
    const [salt, key] = settings.master_password_hash.split(":");
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(key, "hex"),
      Buffer.from(candidate, "hex"),
    );
  }

  function saveSettings(
    factoryName,
    factoryLogo,
    masterPassword,
    openPdfAfterExport = true,
  ) {
    const existing = getSettings();

    if (existing) {
      db.prepare(
        `
                UPDATE settings
                SET factory_name = ?, factory_logo = ?,  open_pdf_after_export = ?, master_password_hash = COALESCE(?, master_password_hash)
                WHERE id = ?
            `,
      ).run(
        factoryName,
        factoryLogo,
        openPdfAfterExport ? 1 : 0,
        masterPassword ? hashPassword(masterPassword) : null,
        existing.id,
      );
    } else {
      db.prepare(
        `
                INSERT INTO settings
                (factory_name, factory_logo, master_password_hash,  open_pdf_after_export)
                VALUES (?, ?, ?, ?)
            `,
      ).run(
        factoryName,
        factoryLogo,
        hashPassword(masterPassword),
        openPdfAfterExport ? 1 : 0,
      );
    }

    return true;
  }

  function updateFactoryProfile(
    factoryName,
    factoryLogo,
    password,
    openPdfAfterExport,
  ) {
    const existing = getSettings();

    if (!existing) {
      throw new Error("Factory settings not found.");
    }

    db.prepare(
      `
            UPDATE settings
            SET
                factory_name = ?,
                factory_logo = ?,
                   open_pdf_after_export = ?,
                master_password_hash =
                    CASE
                        WHEN ? IS NOT NULL
                        THEN ?
                        ELSE master_password_hash
                    END
            WHERE id = ?
        `,
    ).run(
      factoryName,
      factoryLogo,
      openPdfAfterExport ? 1 : 0,
      password,
      password ? hashPassword(password) : null,
      existing.id,
    );

    return true;
  }

  return {
    getSettings,
    saveSettings,
    verifyMasterPassword,
    updateFactoryProfile,
  };
}

module.exports = { createSettingsModule };
