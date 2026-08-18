const { app } = require("electron");
const fs = require("fs");
const path = require("path");

// Application-level configuration only. Company data lives in separate SQLite files.
const configPath = () => path.join(app.getPath("userData"), "app-config.json");

const defaultCompanyDir = () =>
  path.join(app.getPath("documents"), "FactoryBook", "Companies");

const defaultBackupDir = () =>
  path.join(app.getPath("documents"), "FactoryBook", "Backups");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf-8"));
  } catch (_) {
    return {};
  }
}

function writeConfig(partial) {
  const current = readConfig();
  const next = { ...current, ...partial };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
  return next;
}

function getDbPath() {
  return readConfig().dbPath || null;
}

function setDbPath(dbPath) {
  writeConfig({ dbPath: dbPath || null });
}

function getCompanyDir() {
  const cfg = readConfig();
  if (cfg.companyDir) return cfg.companyDir;
  if (cfg.dbPath) return path.dirname(cfg.dbPath);
  return defaultCompanyDir();
}

function setCompanyDir(dir) {
  writeConfig({ companyDir: dir });
}

function getDefaultCompany() {
  return readConfig().defaultCompanyPath || null;
}

function setDefaultCompany(dbPath) {
  writeConfig({ defaultCompanyPath: dbPath || null });
}

function getAutoOpenDefaultCompany() {
  const cfg = readConfig();
  return cfg.autoOpenDefaultCompany === true;
}

function setAutoOpenDefaultCompany(value) {
  writeConfig({ autoOpenDefaultCompany: Boolean(value) });
}

function getBackupDir() {
  return readConfig().backupDir || defaultBackupDir();
}

function setBackupDir(dir) {
  writeConfig({ backupDir: dir });
}

// Restore uses the backup directory by default. A separate restore directory is
// intentionally no longer part of the application settings.
function getRestoreDir() {
  return getBackupDir();
}

module.exports = {
  defaultCompanyDir,
  defaultBackupDir,
  getDbPath,
  setDbPath,
  getCompanyDir,
  setCompanyDir,
  getDefaultCompany,
  setDefaultCompany,
  getAutoOpenDefaultCompany,
  setAutoOpenDefaultCompany,
  getBackupDir,
  setBackupDir,
  getRestoreDir,
};
