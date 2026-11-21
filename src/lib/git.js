import { execFileSync } from 'node:child_process';

export function hasGit() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

export function initRepo(dir, { remote } = {}) {
  git(['init', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-m', 'chore: initialize project'], dir);
  if (remote) {
    git(['remote', 'add', 'origin', remote], dir);
  }
}

export function push(dir) {
  git(['push', '-u', 'origin', 'HEAD'], dir);
}
