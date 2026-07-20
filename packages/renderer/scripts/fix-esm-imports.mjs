#!/usr/bin/env node
/**
 * Post-build patch: rewrite extensionless relative imports in a dist tree
 * to include an explicit `.js` suffix so plain Node.js ESM can resolve them.
 *
 * Scope: only `import ... from '<relative>'` and `export ... from '<relative>'`
 * statements. Skips:
 *  - imports that already have an extension
 *  - bare specifiers (no leading `./` / `../`)
 *  - directory imports that resolve to a folder (e.g. `./assets` → `./assets/index.js`)
 *
 * Usage: node scripts/fix-esm-imports.mjs [distDir]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const distDir = process.argv[2] ?? path.resolve(process.cwd(), 'dist');

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(js|jsx|mjs|cjs)$/u.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const importRe =
  /(\b(?:import|export)\b[^'";]*?\bfrom\s*['"])(\.\.?\/[^'"]+?)(['"])/gu;

let totalFiles = 0;
let totalFixes = 0;
let totalSkippedDirs = 0;

for (const file of walk(distDir)) {
  const original = readFileSync(file, 'utf8');
  const baseDir = path.dirname(file);
  let changed = false;
  const updated = original.replace(importRe, (match, prefix, specifier, suffix) => {
    if (/\.[a-z]+$/iu.test(specifier)) return match;
    const asFile = path.resolve(baseDir, `${specifier}.js`);
    const asDir = path.resolve(baseDir, specifier);
    if (existsSync(asDir) && !existsSync(asFile)) {
      // Directory import: rewrite to `<specifier>/index.js` if it exists,
      // otherwise leave the specifier alone for Node.js's resolution to handle.
      const indexFile = path.join(asDir, 'index.js');
      if (existsSync(indexFile)) {
        totalFixes += 1;
        changed = true;
        return `${prefix}${specifier}/index.js${suffix}`;
      }
      totalSkippedDirs += 1;
      return match;
    }
    totalFixes += 1;
    changed = true;
    return `${prefix}${specifier}.js${suffix}`;
  });
  if (changed) {
    writeFileSync(file, updated, 'utf8');
    totalFiles += 1;
  }
}

console.log(
  `[fix-esm-imports] Patched ${totalFixes} import(s) across ${totalFiles} file(s) ` +
    `under ${distDir} (${totalSkippedDirs} directory import(s) left unchanged)`,
);

