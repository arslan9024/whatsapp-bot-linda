#!/usr/bin/env node
/**
 * Plans integrity checker for docs/plans (the RUP program).
 *
 * Every problem PS-nnn in the register must have ALG-nnn, FC-nnn (same slug),
 * at least one FR row in the SRS citing it, and a TRACEABILITY row whose status
 * matches the register. ALG files need the required sections, FC files need a
 * mermaid block, IDs are defined once, and relative links must resolve.
 *
 *   npm run plans:check
 */

import fs from 'fs';
import path from 'path';

export const REQUIRED_ALG_SECTIONS = [
  'Problem', 'Input', 'Output', 'Invariants', 'Algorithm',
  'Complexity', 'Edge cases', 'Current implementation', 'Verification',
];
export const STATUSES = ['Planned', 'Partial', 'Implemented', 'Live-verified'];
const LINK_SKIP_DIRS = new Set(['ARCHIVE', 'templates']);

const read = file => fs.readFileSync(file, 'utf8');
const stripCode = text => text.replace(/```[\s\S]*?```/g, '');
const cells = line => line.split('|').slice(1, -1).map(cell => cell.trim());

function listMarkdown(dir, skipDirs = new Set()) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) files.push(...listMarkdown(full, skipDirs));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

/** Rows of the register summary table: { id, status, iteration }. */
export function parseRegister(text) {
  return text.split(/\r?\n/)
    .filter(line => /^\|\s*PS-\d{3}\s*\|/.test(line))
    .map(line => {
      const row = cells(line);
      return { id: row[0], status: row[row.length - 2], iteration: row[row.length - 1] };
    });
}

/** Leading-ID table rows such as `| FR-001 | ... |` → [{ id, row }]. */
export function parseIdRows(text, prefix) {
  const pattern = new RegExp(`^\\|\\s*${prefix}-\\d{3}\\s*\\|`);
  return text.split(/\r?\n/).filter(line => pattern.test(line)).map(line => ({ id: cells(line)[0], row: line }));
}

export function findDuplicates(ids) {
  const seen = new Set();
  const dupes = new Set();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes];
}

export function missingSections(text, required = REQUIRED_ALG_SECTIONS) {
  const headings = new Set(
    [...stripCode(text).matchAll(/^##\s+(.+?)\s*(?:\(.*\))?\s*$/gm)].map(match => match[1].trim()),
  );
  return required.filter(section => !headings.has(section));
}

export function brokenLinks(file) {
  const broken = [];
  for (const match of stripCode(read(file)).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    let target = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z]+:|#)/i.test(target)) continue;
    target = decodeURIComponent(target.split('#')[0]);
    if (target && !fs.existsSync(path.resolve(path.dirname(file), target))) broken.push(match[1]);
  }
  return broken;
}

export function checkPlans(root = process.cwd()) {
  const plans = path.join(root, 'docs', 'plans');
  const errors = [];
  const fail = message => errors.push(message);
  const rel = file => path.relative(root, file).replace(/\\/g, '/');
  const need = file => (fs.existsSync(file) ? read(file) : (fail(`missing file ${rel(file)}`), ''));

  const register = need(path.join(plans, '02-problems', 'PROBLEM_REGISTER.md'));
  const srs = need(path.join(plans, '05-srs', 'SRS.md'));
  const trace = need(path.join(plans, 'TRACEABILITY.md'));

  const problems = parseRegister(register);
  if (!problems.length) fail('problem register has no PS rows');
  for (const dupe of findDuplicates(problems.map(problem => problem.id))) fail(`${dupe} defined twice in the register`);

  const frRows = parseIdRows(srs, 'FR');
  const frIds = new Set(frRows.map(fr => fr.id));
  for (const dupe of findDuplicates(frRows.map(fr => fr.id))) fail(`${dupe} defined twice in SRS`);
  for (const dupe of findDuplicates(parseIdRows(srs, 'NFR').map(nfr => nfr.id))) fail(`${dupe} defined twice in SRS`);

  const traceRows = new Map(parseIdRows(trace, 'PS').map(({ id, row }) => [id, cells(row)]));
  for (const dupe of findDuplicates(parseIdRows(trace, 'PS').map(row => row.id))) fail(`${dupe} has two TRACEABILITY rows`);

  const algDir = path.join(plans, '03-algorithms');
  const fcDir = path.join(plans, '04-flowcharts');
  const algFiles = fs.existsSync(algDir) ? fs.readdirSync(algDir).filter(name => /^ALG-\d{3}-.+\.md$/.test(name)) : [];
  const fcFiles = fs.existsSync(fcDir) ? fs.readdirSync(fcDir).filter(name => /^FC-\d{3}-.+\.md$/.test(name)) : [];
  const problemNumbers = new Set(problems.map(problem => problem.id.slice(3)));

  for (const problem of problems) {
    const number = problem.id.slice(3);
    if (!STATUSES.includes(problem.status)) fail(`${problem.id} has unknown status "${problem.status}"`);

    const algs = algFiles.filter(name => name.startsWith(`ALG-${number}-`));
    if (algs.length !== 1) {
      fail(`${problem.id} needs exactly one ALG-${number}-*.md (found ${algs.length})`);
    } else {
      const slug = algs[0].slice(`ALG-${number}-`.length);
      const algText = read(path.join(algDir, algs[0]));
      const missing = missingSections(algText);
      if (missing.length) fail(`${algs[0]} is missing sections: ${missing.join(', ')}`);
      const algStatus = algText.match(/^\|\s*Status\s*\|\s*([A-Za-z-]+)/m)?.[1];
      if (algStatus && algStatus !== problem.status) fail(`${algs[0]} status "${algStatus}" ≠ register "${problem.status}"`);
      for (const fr of algText.match(/\bFR-\d{3}\b/g) || []) {
        if (!frIds.has(fr)) fail(`${algs[0]} cites ${fr}, which the SRS does not define`);
      }

      const fcName = `FC-${number}-${slug}`;
      const fcPath = path.join(fcDir, fcName);
      if (!fs.existsSync(fcPath)) fail(`${problem.id} needs flowchart ${rel(fcPath)}`);
      else if (!/```mermaid\s/.test(read(fcPath))) fail(`${fcName} has no mermaid block`);
    }

    if (!frRows.some(fr => fr.row.includes(problem.id))) fail(`${problem.id} has no FR row in the SRS`);

    const traceRow = traceRows.get(problem.id);
    if (!traceRow) fail(`${problem.id} has no TRACEABILITY row`);
    else if (traceRow[traceRow.length - 1] !== problem.status) {
      fail(`TRACEABILITY ${problem.id} status "${traceRow[traceRow.length - 1]}" ≠ register "${problem.status}"`);
    }
  }

  for (const name of [...algFiles, ...fcFiles]) {
    const number = name.match(/-(\d{3})-/)[1];
    if (!problemNumbers.has(number)) fail(`${name} has no PS-${number} in the register`);
  }

  for (const file of listMarkdown(plans, LINK_SKIP_DIRS)) {
    for (const link of brokenLinks(file)) fail(`${rel(file)} → broken link ${link}`);
  }

  return {
    errors,
    counts: { problems: problems.length, algorithms: algFiles.length, flowcharts: fcFiles.length, requirements: frIds.size },
  };
}

const isMain = process.argv[1] && /plans-check\.js$/.test(process.argv[1]);
if (isMain) {
  const { errors, counts } = checkPlans(process.cwd());
  console.log(`Plans check: ${counts.problems} problems · ${counts.algorithms} algorithms · ${counts.flowcharts} flowcharts · ${counts.requirements} requirements`);
  errors.forEach((error, index) => console.log(`  ${index + 1}. ${error}`));
  if (errors.length) {
    console.log(`\n${errors.length} problem(s). Fix the plans so every PS has ALG, FC, FR and TRACEABILITY.`);
    process.exitCode = 1;
  } else {
    console.log('Plans are consistent.');
  }
}
