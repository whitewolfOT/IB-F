import { createApp } from './api/app';
import { IcosDb } from './db';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DB_PATH = process.env.DB_PATH ?? './icos.db';

const db = new IcosDb(DB_PATH);
const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(`ICOS server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
