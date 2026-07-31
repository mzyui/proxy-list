'use strict';

const path = require('path');
const fs = require('fs');
const { REPO_ROOT, ENGINE_ROOT, fromRepoRoot, fromEngineRoot } = require('../src/utils/paths');

describe('paths', () => {
  test('ENGINE_ROOT is the directory holding package.json', () => {
    expect(fs.existsSync(path.join(ENGINE_ROOT, 'package.json'))).toBe(true);
    expect(path.basename(ENGINE_ROOT)).toBe('engine');
  });

  test('REPO_ROOT is the parent of engine/', () => {
    expect(REPO_ROOT).toBe(path.dirname(ENGINE_ROOT));
    expect(path.join(REPO_ROOT, 'engine')).toBe(ENGINE_ROOT);
  });

  test('fromRepoRoot resolves compatibility files at the repo root', () => {
    expect(fromRepoRoot('all.txt')).toBe(path.join(REPO_ROOT, 'all.txt'));
    expect(fromRepoRoot('output', 'stats.json')).toBe(
      path.join(REPO_ROOT, 'output', 'stats.json')
    );
  });

  test('fromRepoRoot passes absolute paths through untouched', () => {
    expect(fromRepoRoot('/tmp/custom-out')).toBe('/tmp/custom-out');
  });

  test('fromEngineRoot resolves inside engine/', () => {
    expect(fromEngineRoot('src', 'index.js')).toBe(path.join(ENGINE_ROOT, 'src', 'index.js'));
  });

  test('resolution does not depend on process.cwd()', () => {
    const before = fromRepoRoot('all.txt');
    const previous = process.cwd();
    try {
      process.chdir('/tmp');
      expect(fromRepoRoot('all.txt')).toBe(before);
    } finally {
      process.chdir(previous);
    }
  });
});
