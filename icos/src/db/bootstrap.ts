import { v4 as uuidv4 } from 'uuid';
import { IcosDb } from './index';
import { hashPassword } from '../auth';

export async function bootstrapMasterAccount(db: IcosDb): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const existing = db.listUsers().find(u => u.is_master);
  if (existing) return;

  const email = process.env.MASTER_EMAIL;
  const password = process.env.MASTER_PASSWORD;

  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MASTER_EMAIL and MASTER_PASSWORD must be set in production');
    }
    console.warn('⚠️  MASTER_EMAIL/MASTER_PASSWORD not set — using insecure dev defaults');
  }

  const now = new Date().toISOString();
  await db.insertUser({
    user_id: uuidv4(),
    email: email ?? 'master@icos.local',
    password_hash: await hashPassword(password ?? 'ChangeMe123!'),
    role: 'system',
    party_id: null,
    is_master: true,
    active: true,
    created_at: now,
    updated_at: now,
  });

  console.log(`✅ Master account created: ${email ?? 'master@icos.local'}`);
}
