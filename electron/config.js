const { app } = require("electron");
const fs = require("fs");
const path = require("path");

// Config lives in the OS-standard userData folder (e.g. %APPDATA%/FactoryBook
// on Windows, ~/Library/Application Support/FactoryBook on macOS) — separate
// from the app's own installed files, and separate from any factory database.
const configPath = () => path.join(app.getPath("userData"), "app-config.json");

const defaultDbDir = () => path.join(app.getPath("userData"), "databases");
const defaultDbPath = () => path.join(defaultDbDir(), "factory_stock.db");

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    return JSON.parse(raw);
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
  const cfg = readConfig();
  return cfg.dbPath || null;
}

function setDbPath(dbPath) {
  writeConfig({ dbPath });
}

function getBackupDir() {
  const cfg = readConfig();
  return cfg.backupDir || app.getPath("documents");
}

function setBackupDir(dir) {
  writeConfig({ backupDir: dir });
}

function getRestoreDir() {
  const cfg = readConfig();
  return cfg.restoreDir || app.getPath("documents");
}

function setRestoreDir(dir) {
  writeConfig({ restoreDir: dir });
}

module.exports = {
  defaultDbDir,
  defaultDbPath,
  getDbPath,
  setDbPath,
  getBackupDir,
  setBackupDir,
  getRestoreDir,
  setRestoreDir,
};