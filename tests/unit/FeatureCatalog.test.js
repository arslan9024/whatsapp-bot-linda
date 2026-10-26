import fs from 'fs';
import os from 'os';
import path from 'path';
import FeatureCatalog, { FEATURES } from '../../src/terminal/FeatureCatalog.js';

describe('FeatureCatalog', () => {
  test('feature ids are sequential, unique and commands are unique', () => {
    expect(FEATURES.map(feature => feature.id)).toEqual(FEATURES.map((_, index) => index + 1));
    const keys = FEATURES.flatMap(feature => [feature.command, ...(feature.aliases || [])]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('resolves f<id> and #<id> shortcuts with arguments', () => {
    const catalog = new FeatureCatalog({ file: null });
    expect(catalog.resolve('f7 +971501234567')).toEqual(expect.objectContaining({ command: 'recover +971501234567' }));
    expect(catalog.resolve('#11').command).toBe('list');
    expect(catalog.resolve('F31').command).toBe('features');
    expect(catalog.resolve('status')).toBeNull();
    expect(catalog.resolve('f999').error).toMatch(/No feature F999/);
    expect(catalog.resolve('f24').error).toMatch(/needs input/);
  });

  test('records usage per feature, including aliases, and ignores unknown commands', () => {
    const catalog = new FeatureCatalog({ file: null });
    expect(catalog.record('list').id).toBe(11);
    catalog.record('list');
    catalog.record('exit');
    expect(catalog.record('nope')).toBeNull();
    expect(catalog.counts.get(11)).toBe(2);
    expect(catalog.counts.get(33)).toBe(1);
    expect(catalog.totals()).toEqual(expect.objectContaining({ used: 2, total: 3, session: 3, features: FEATURES.length }));
    expect(catalog.summaryLine()).toContain('Last: F33 quit');
  });

  test('grid fits the width and lists every feature with its counter', () => {
    const catalog = new FeatureCatalog({ file: null });
    catalog.record('score');
    const lines = catalog.gridLines(80);
    expect(lines.every(line => line.length <= 80)).toBe(true);
    const text = lines.join(' ');
    for (const feature of FEATURES) expect(text).toContain(`F${feature.id} ${feature.command}`);
    expect(text).toContain('F17 score* ×1');
    expect(catalog.listLines().join('\n')).toContain('[restored]');
  });

  test('persists counters to disk and loads them back', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'features-'));
    const file = path.join(dir, 'feature-usage.json');
    try {
      const first = new FeatureCatalog({ file });
      first.record('validate');
      first.recordInput('relink master +971501234567');
      first.flush();
      const second = new FeatureCatalog({ file });
      expect(second.counts.get(21)).toBe(1);
      expect(second.actionCount('relink master')).toBe(1);
      expect(second.totals().session).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('per-action counters drop phone numbers and map aliases', () => {
    const catalog = new FeatureCatalog({ file: null });
    expect(catalog.actionKey('relink master +971501234567')).toBe('relink master');
    expect(catalog.actionKey('metrics report')).toBe('analytics report');
    expect(catalog.actionKey('google read abc Sheet1')).toBe('sheets read');
    expect(catalog.actionKey('chats +971501234567 2')).toBe('chats');
    expect(catalog.actionKey('restore-sessions')).toBe('restore');
    expect(catalog.actionKey('')).toBe('');
    catalog.recordInput('device +971501234567');
    catalog.recordInput('device 0501234567');
    catalog.recordInput('');
    expect(catalog.actionCount('device')).toBe(2);
    expect(catalog.actionCount('device +15550001111')).toBe(2);
    expect(catalog.actionCount('stats')).toBe(0);
  });
});
