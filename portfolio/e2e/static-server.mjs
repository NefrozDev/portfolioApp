// Serves the production build like Vercel does: the prerendered page of a path when there is
// one (/en/projects -> en/projects/index.html), otherwise the client-side app (index.csr.html).
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(
  new URL('../dist/portfolio/browser/', import.meta.url)
);
const port = Number(process.argv[2] ?? 4340);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2'
};

const fallback = join(root, 'index.csr.html');
if (!existsSync(fallback)) {
  console.error(`No build at ${root}. Run: npm run build`);
  process.exit(1);
}

// Every file of the build by URL path, listed once at startup: a URL can only name a file of
// the build, never one outside it.
const files = new Map(
  readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .map((file) => [`/${relative(root, file).replaceAll(sep, '/')}`, file])
);

createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(
    /\/$/,
    ''
  );
  const file =
    files.get(urlPath) ?? files.get(`${urlPath}/index.html`) ?? fallback;
  res.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream'
  });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () =>
  console.log(`Portfolio build on http://127.0.0.1:${port}`)
);
