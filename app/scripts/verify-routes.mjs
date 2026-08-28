import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routesRoot = path.join(root, 'app');
const sourceRoots = [routesRoot, path.join(root, 'src')];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.expo') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

function routeFromFile(file) {
  let rel = path.relative(routesRoot, file).replaceAll('\\', '/');
  if (!/\.(tsx?|jsx?)$/.test(rel)) return null;
  rel = rel.replace(/\.(tsx?|jsx?)$/, '');
  const parts = rel.split('/').filter(Boolean);
  const routeParts = [];
  for (const part of parts) {
    if (part === '_layout' || part.startsWith('+')) return null;
    if (/^\(.+\)$/.test(part)) continue;
    if (part === 'index') continue;
    if (/^\[\.\.\..+\]$/.test(part)) routeParts.push(':*');
    else if (/^\[.+\]$/.test(part)) routeParts.push(':param');
    else routeParts.push(part);
  }
  return '/' + routeParts.join('/');
}

function normalizeNavigation(value) {
  let route = value.trim();
  if (!route.startsWith('/')) return null;
  route = route.split('#', 1)[0].split('?', 1)[0];
  route = route.replace(/\$\{[^}]+\}/g, ':param');
  route = route.replace(/\/+/g, '/');
  return route || '/';
}

function segments(value) {
  return value === '/' ? [] : value.slice(1).split('/');
}

function matchesRoute(reference, route) {
  const a = segments(reference);
  const b = segments(route);
  if (b.includes(':*')) {
    const star = b.indexOf(':*');
    if (a.length < star) return false;
    for (let i = 0; i < star; i++) {
      if (!a[i].startsWith(':') && !b[i].startsWith(':') && a[i] !== b[i]) return false;
    }
    return true;
  }
  if (a.length !== b.length) return false;
  return a.every((segment, index) =>
    segment.startsWith(':') || b[index].startsWith(':') || segment === b[index]
  );
}

const routeFiles = walk(routesRoot);
const routes = [...new Set(routeFiles.map(routeFromFile).filter(Boolean))].sort();

const sourceFiles = sourceRoots
  .flatMap(walk)
  .filter(file => /\.(tsx?|jsx?)$/.test(file));

const findings = [];
const patterns = [
  { kind: 'router', regex: /router\.(?:push|replace|navigate)\(\s*(['"])(\/[^'"]*)\1/g },
  { kind: 'router', regex: /router\.(?:push|replace|navigate)\(\s*`(\/[^`]*)`/g, valueGroup: 1 },
  { kind: 'href', regex: /\bhref\s*=\s*(['"])(\/[^'"]*)\1/g },
  { kind: 'href', regex: /\bhref\s*=\s*\{\s*(['"])(\/[^'"]*)\1\s*\}/g },
  { kind: 'href', regex: /\bhref\s*:\s*(['"])(\/[^'"]*)\1/g },
];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { kind, regex, valueGroup } of patterns) {
    regex.lastIndex = 0;
    for (let match; (match = regex.exec(content)); ) {
      const raw = match[valueGroup ?? 2] ?? match[1];
      const normalized = normalizeNavigation(raw);
      if (!normalized) continue;
      const line = content.slice(0, match.index).split('\n').length;
      findings.push({
        kind,
        raw,
        normalized,
        file: path.relative(root, file).replaceAll('\\', '/'),
        line,
      });
    }
  }
}

const unique = new Map();
for (const finding of findings) {
  unique.set(`${finding.file}:${finding.line}:${finding.normalized}`, finding);
}

const invalid = [...unique.values()].filter(
  finding => !routes.some(route => matchesRoute(finding.normalized, route))
);

console.log(`Rotas físicas: ${routes.length}`);
console.log(`Referências de navegação verificadas: ${unique.size}`);

if (invalid.length) {
  console.error('\nReferências para rotas inexistentes:');
  for (const item of invalid) {
    console.error(`- ${item.file}:${item.line}  ${item.raw} -> ${item.normalized}`);
  }
  console.error('\nRotas conhecidas:');
  for (const route of routes) console.error(`  ${route}`);
  process.exit(1);
}

console.log('Integridade das rotas: OK');
