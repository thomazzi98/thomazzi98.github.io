import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

rmSync('node_modules', { recursive: true, force: true });
rmSync('package-lock.json', { force: true });
execSync('npm install', { stdio: 'inherit' });
