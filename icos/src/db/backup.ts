import path from 'path';
import fs from 'fs';
import { IcosDb } from './index';

export function backupDatabase(db: IcosDb, backupDir: string): void {
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupDir, `icos-backup-${timestamp}.db`);
  (db as any).db.backup(dest);
  // Keep only last 7 backups
  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('icos-backup-') && f.endsWith('.db'))
    .sort();
  if (files.length > 7) {
    for (const old of files.slice(0, files.length - 7)) {
      fs.unlinkSync(path.join(backupDir, old));
    }
  }
}

export function scheduleBackups(db: IcosDb, backupDir: string): void {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  backupDatabase(db, backupDir);
  setInterval(() => {
    try { backupDatabase(db, backupDir); }
    catch (err) { console.error('Backup failed:', err); }
  }, SIX_HOURS);
}
