import { IcosDb } from '../index';
import { encrypt, isEncrypted } from '../../crypto';
import { v4 as uuidv4 } from 'uuid';

const MIGRATION_NAME = 'encrypt_legal_reasoning_v1';

export function runEncryptLegalReasoningMigration(db: IcosDb): void {
  // Check if already ran
  const ran = (db as any).db.prepare('SELECT migration_id FROM migrations WHERE name = ?').get(MIGRATION_NAME);
  if (ran) return;

  const rows = (db as any).db.prepare(
    "SELECT review_id, legal_reasoning FROM shariah_review_records WHERE legal_reasoning != ''"
  ).all() as { review_id: string; legal_reasoning: string }[];

  for (const row of rows) {
    if (row.legal_reasoning && !isEncrypted(row.legal_reasoning)) {
      const encrypted = encrypt(row.legal_reasoning);
      (db as any).db.prepare('UPDATE shariah_review_records SET legal_reasoning = ? WHERE review_id = ?')
        .run(encrypted, row.review_id);
    }
  }

  (db as any).db.prepare('INSERT INTO migrations (migration_id, name, ran_at) VALUES (?, ?, ?)')
    .run(uuidv4(), MIGRATION_NAME, new Date().toISOString());
}
