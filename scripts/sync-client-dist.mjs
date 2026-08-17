import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const clientDistDir = join(rootDir, '..', 'client', 'dist');
const serverPublicDir = join(rootDir, '..', 'server', 'public');

const main = async () => {
  await rm(serverPublicDir, { recursive: true, force: true });
  await mkdir(serverPublicDir, { recursive: true });
  await cp(clientDistDir, serverPublicDir, { recursive: true });
  console.log(`Synced ${clientDistDir} -> ${serverPublicDir}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});