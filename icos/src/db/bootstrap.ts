import { v4 as uuidv4 } from 'uuid';
import { IcosDb } from './index';
import { hashPassword } from '../auth';

export async function bootstrapMasterAccount(db: IcosDb): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const targetEmail    = process.env.MASTER_EMAIL    ?? 'icos@icos.com';
  const targetPassword = process.env.MASTER_PASSWORD ?? 'icos';

  if (!process.env.MASTER_EMAIL || !process.env.MASTER_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MASTER_EMAIL and MASTER_PASSWORD must be set in production');
    }
    console.warn('⚠️  MASTER_EMAIL/MASTER_PASSWORD not set — using dev defaults (icos@icos.com / icos)');
  }

  const existing = db.listUsers().find(u => u.is_master);

  if (existing) {
    // Upsert: sync credentials if they differ from the configured target
    if (existing.email !== targetEmail) {
      db.updateUser(existing.user_id, {
        email: targetEmail,
        password_hash: await hashPassword(targetPassword),
        updated_at: new Date().toISOString(),
      });
      console.log(`✅ Master account credentials updated: ${targetEmail}`);
    }
    return;
  }

  const now = new Date().toISOString();
  db.insertUser({
    user_id: uuidv4(),
    email: targetEmail,
    password_hash: await hashPassword(targetPassword),
    role: 'system',
    party_id: null,
    is_master: true,
    active: true,
    created_at: now,
    updated_at: now,
  });

  console.log(`✅ Master account created: ${targetEmail}`);
}
