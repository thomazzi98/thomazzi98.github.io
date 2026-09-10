import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { createGzip } from 'node:zlib';

const root = resolve('dist');
const port = Number(process.argv[2] ?? '4173');

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

// Pages compresses text on the wire; serving it the same way keeps every local measurement honest.
const compressible = new Set(['.html', '.css', '.txt', '.js', '.json', '.xml', '.svg']);

const notFound = { path: join(root, '404.html'), status: 404 };

type Resolution = { path: string; status: number } | { redirect: string };

const decodePath = (rawUrl: string): string | undefined => {
  try {
    return decodeURIComponent(rawUrl.split('?')[0] ?? '/');
  } catch {
    return undefined;
  }
};

const isInsideRoot = (candidate: string): boolean => {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};

const resolveRequest = (rawUrl: string): Resolution => {
  const pathname = decodePath(rawUrl);
  if (pathname === undefined) {
    return notFound;
  }
  const candidate = join(root, normalize(pathname));
  if (!isInsideRoot(candidate) || !existsSync(candidate)) {
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
  const extension = extname(resolution.path);
  const headers: Record<string, string> = {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    Vary: 'Accept-Encoding',
  };
  const acceptsGzip = (request.headers['accept-encoding'] ?? '').includes('gzip');
  if (acceptsGzip && compressible.has(extension)) {
    headers['Content-Encoding'] = 'gzip';
    response.writeHead(resolution.status, headers);
    createReadStream(resolution.path).pipe(createGzip()).pipe(response);
    return;
  }
  response.writeHead(resolution.status, headers);
  createReadStream(resolution.path).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${String(port)}/`);
});
