import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.env.OUT_DIR ?? 'dist');
const base = process.env.E2E_BASE_PATH ?? '/';
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
]);
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://localhost').pathname,
    );
    if (!pathname.startsWith(base)) throw new Error('outside configured base');
    const relative = pathname.slice(base.length).replace(/^\/+/, '');
    let file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(`${root}${path.sep}`))
      throw new Error('path escape');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type':
        types.get(path.extname(file)) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    try {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(await readFile(path.join(root, '404.html')));
    } catch {
      response.end('Not found');
    }
  }
}).listen(4201, '127.0.0.1', () =>
  process.stdout.write(`preview: http://127.0.0.1:4201${base}\n`),
);
