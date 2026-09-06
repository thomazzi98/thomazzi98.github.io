import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.argv[2] ?? '4173');

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const notFound = { path: join(root, '404.html'), status: 404 };

type Resolution = { path: string; status: number } | { redirect: string };

const resolveRequest = (rawUrl: string): Resolution => {
  const pathname = decodeURIComponent(rawUrl.split('?')[0] ?? '/');
  const candidate = join(root, normalize(pathname));
  if (!candidate.startsWith(root) || !existsSync(candidate)) {
    return notFound;
  }
  if (!statSync(candidate).isDirectory()) {
    return { path: candidate, status: 200 };
  }
  if (!pathname.endsWith('/')) {
    return { redirect: `${pathname}/` };
  }
  const index = join(candidate, 'index.html');
  return existsSync(index) ? { path: index, status: 200 } : notFound;
};

createServer((request, response) => {
  const resolution = resolveRequest(request.url ?? '/');
  if ('redirect' in resolution) {
    response.writeHead(301, { Location: resolution.redirect });
    response.end();
    return;
  }
  response.writeHead(resolution.status, {
    'Content-Type': contentTypes[extname(resolution.path)] ?? 'application/octet-stream',
  });
  createReadStream(resolution.path).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${String(port)}/`);
});
