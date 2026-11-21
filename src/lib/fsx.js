import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function exists(target) {
  return fs.existsSync(target);
}

export function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

export function readJson(target) {
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

export function writeJson(target, value) {
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function writeFile(target, content) {
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, 'utf8');
}

export function isEmptyDir(target) {
  if (!exists(target)) return true;
  if (!fs.statSync(target).isDirectory()) return false;
  return fs.readdirSync(target).length === 0;
}

/**
 * Copy a directory tree. `exclude` matches entry names at any depth.
 */
export function copyDir(source, destination, { exclude = [] } = {}) {
  ensureDir(destination);
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;

    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(from, to, { exclude });
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(from), to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

export function hashDir(target) {
  const hash = crypto.createHash('sha1');

  const walk = (dir) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(target, full);
      if (entry.isDirectory()) {
        hash.update(`d:${relative}\n`);
        walk(full);
      } else {
        hash.update(`f:${relative}\n`);
        hash.update(fs.readFileSync(full));
      }
    }
  };

  walk(target);
  return hash.digest('hex');
}

export function moveDir(source, destination) {
  try {
    fs.renameSync(source, destination);
  } catch {
    fs.cpSync(source, destination, { recursive: true });
    fs.rmSync(source, { recursive: true, force: true });
  }
}
