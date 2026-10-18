import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const ignored = new Set(['node_modules', '.venv', '.git', 'dist', '__pycache__', '.pytest_cache']);
function authoredFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? authoredFiles(path) : [path];
  });
}

describe('plain JavaScript project boundary', () => {
  it('has no authored TypeScript source or configuration anywhere in the project', () => {
    const leftovers = authoredFiles(root).filter(path => /\.(?:tsx?|mts|cts|tsbuildinfo)$/.test(path) || /tsconfig[^/\\]*\.json$/.test(path));
    expect(leftovers.map(path => relative(root, path))).toEqual([]);
  });
  it('does not depend on the TypeScript compiler or direct React type packages', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'frontend/package.json'), 'utf8'));
    const direct = { ...manifest.dependencies, ...manifest.devDependencies };
    expect(direct.typescript).toBeUndefined();
    expect(direct['@types/react']).toBeUndefined();
    expect(direct['@types/react-dom']).toBeUndefined();
    expect(manifest.scripts.build).toBe('vite build');
  });
});
