import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  checkPlans, parseRegister, parseIdRows, findDuplicates, missingSections, REQUIRED_ALG_SECTIONS,
} from '../../tools/plans-check.js';

const ALG_BODY = REQUIRED_ALG_SECTIONS.map(section => `## ${section}\ntext\n`).join('\n');

function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

function minimalPlans(overrides = {}) {
  return {
    'docs/plans/02-problems/PROBLEM_REGISTER.md': '| ID | Problem | Status | Iteration |\n|---|---|---|---|\n| PS-001 | Lease | Implemented | E2 |\n',
    'docs/plans/03-algorithms/ALG-001-lease.md': `# ALG-001\n| | |\n|---|---|\n| Requirements | FR-001 |\n| Status | Implemented (note) |\n\n${ALG_BODY}`,
    'docs/plans/04-flowcharts/FC-001-lease.md': '# FC-001\n```mermaid\nflowchart TD\n  A --> B\n```\n',
    'docs/plans/05-srs/SRS.md': '| ID | Requirement | Source |\n|---|---|---|\n| FR-001 | One instance | PS-001 |\n',
    'docs/plans/TRACEABILITY.md': '| PS | ALG | Status |\n|---|---|---|\n| PS-001 | [ALG-001](03-algorithms/ALG-001-lease.md) | Implemented |\n',
    ...overrides,
  };
}

describe('plans check', () => {
  let root;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'plans-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test('the real docs/plans program is consistent', () => {
    const { errors, counts } = checkPlans(process.cwd());
    expect(errors).toEqual([]);
    expect(counts.problems).toBeGreaterThanOrEqual(20);
    expect(counts.algorithms).toBe(counts.problems);
    expect(counts.flowcharts).toBe(counts.problems);
  });

  test('a complete minimal program passes', () => {
    writeTree(root, minimalPlans());
    expect(checkPlans(root).errors).toEqual([]);
  });

  test('reports missing flowchart, FR row, traceability row and sections', () => {
    writeTree(root, minimalPlans({
      'docs/plans/03-algorithms/ALG-001-lease.md': '# ALG-001\n| Status | Implemented |\n## Problem\nx\n',
      'docs/plans/04-flowcharts/FC-001-lease.md': '# no diagram\n',
      'docs/plans/05-srs/SRS.md': '| FR-002 | Other | PS-009 |\n',
      'docs/plans/TRACEABILITY.md': '| PS | Status |\n',
    }));
    const text = checkPlans(root).errors.join('\n');
    expect(text).toMatch(/missing sections: Input/);
    expect(text).toMatch(/FC-001-lease\.md has no mermaid block/);
    expect(text).toMatch(/PS-001 has no FR row/);
    expect(text).toMatch(/PS-001 has no TRACEABILITY row/);
  });

  test('reports status drift, undefined FR, orphan ALG and broken links', () => {
    writeTree(root, minimalPlans({
      'docs/plans/TRACEABILITY.md': '| PS-001 | x | Planned |\n',
      'docs/plans/03-algorithms/ALG-001-lease.md': `| Requirements | FR-099 |\n| Status | Implemented |\n${ALG_BODY}[gone](./missing.md)`,
      'docs/plans/03-algorithms/ALG-007-orphan.md': ALG_BODY,
    }));
    const text = checkPlans(root).errors.join('\n');
    expect(text).toMatch(/TRACEABILITY PS-001 status "Planned"/);
    expect(text).toMatch(/cites FR-099/);
    expect(text).toMatch(/ALG-007-orphan\.md has no PS-007/);
    expect(text).toMatch(/broken link \.\/missing\.md/);
  });

  test('parsers and helpers', () => {
    expect(parseRegister('| PS-003 | Restore | `1.19` | G-2 | Partial | E1 |')).toEqual([{ id: 'PS-003', status: 'Partial', iteration: 'E1' }]);
    expect(parseIdRows('| FR-001 | a |\n| NFR-001 | b |', 'FR').map(row => row.id)).toEqual(['FR-001']);
    expect(findDuplicates(['FR-001', 'FR-002', 'FR-001'])).toEqual(['FR-001']);
    expect(missingSections('## Algorithm (greedy)\n```text\n## Input\n```\n', ['Algorithm', 'Input'])).toEqual(['Input']);
  });
});
