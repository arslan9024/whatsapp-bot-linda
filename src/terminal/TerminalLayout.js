/**
 * TerminalLayout.js
 *
 * Pins a full terminal UI to the top of an interactive terminal using a VT scroll region:
 * HEADER (Linda details), FEATURES sub-header (numbered feature counters), INPUT
 * (command / question), OUTPUT (devices & conversation report) and a PROCESS VIEWBOARD
 * bar. Logs and other processing output scroll only in the area below, so the panels
 * always stay above them. Non-TTY output (pipes, files, tests) is never touched.
 */

import { stripVTControlCharacters } from 'node:util';

const CSI = '\x1b[';
const MIN_LOG_ROWS = 8;
const MIN_OUTPUT_ROWS = 8;
// magenta / green / yellow / cyan / blue
export const PANEL_COLORS = { header: '35', features: '32', input: '33', output: '36', process: '34' };

export function layoutSupported(stream = process.stdout) {
  return Boolean(stream?.isTTY) && process.env.LINDA_PLAIN_TERMINAL !== '1';
}

export function colorize(text, color, { bold = false, stream = process.stdout } = {}) {
  if (!stream?.isTTY || process.env.NO_COLOR) return text;
  return `${CSI}${bold ? '1;' : ''}${color}m${text}${CSI}0m`;
}

function wrap(text, width) {
  const plain = stripVTControlCharacters(String(text));
  if (plain.length <= width) return [plain];
  const out = [];
  let rest = plain;
  while (rest.length > width) {
    let cut = rest.lastIndexOf(' ', width);
    if (cut < width / 2) cut = width;
    out.push(rest.slice(0, cut));
    rest = `   ${rest.slice(cut).trimStart()}`;
  }
  out.push(rest);
  return out;
}

export class TerminalLayout {
  constructor(stream = process.stdout) {
    this.stream = stream;
    this.state = 'idle'; // idle | pinned | unpinnable | released
    this.height = 0;
    this.outputBody = 0;
    this.panels = null;
    this.originalClear = null;
    this.exitHookInstalled = false;
    this.onResize = null;
  }

  get enabled() {
    return layoutSupported(this.stream);
  }

  get pinned() {
    return this.state === 'pinned';
  }

  /** True when the last render left the panels on screen and up to date. */
  get current() {
    return this.state === 'pinned' || this.state === 'unpinnable';
  }

  buildPanel({ title, lines }, color, width, minBody = 0, maxBody = Infinity) {
    const inner = width - 4;
    const source = typeof lines === 'function' ? lines(inner) : lines;
    let body = source.flatMap(line => wrap(line, inner));
    if (body.length > maxBody) {
      const hidden = body.length - maxBody + 1;
      body = [...body.slice(0, maxBody - 1), `… +${hidden} more line${hidden === 1 ? '' : 's'} (enlarge the window to see all)`];
    }
    while (body.length < minBody) body.push('');
    const head = `╭─ ${title} `;
    return [
      colorize(head + '─'.repeat(Math.max(0, width - 2 - head.length)), color, { bold: true, stream: this.stream }),
      ...body.map(line => `${colorize('│', color, { bold: true, stream: this.stream })} ${colorize(line, color, { stream: this.stream })}`),
      colorize(`╰${'─'.repeat(width - 3)}`, color, { bold: true, stream: this.stream }),
    ];
  }

  processBar(width) {
    const label = '── PROCESS VIEWBOARD · live logs & processing below ';
    return colorize(label + '─'.repeat(Math.max(0, width - 1 - label.length)), PANEL_COLORS.process, { bold: true, stream: this.stream });
  }

  /**
   * Draw the full terminal UI from top to bottom: HEADER, FEATURES (sub-header), INPUT,
   * OUTPUT and a PROCESS VIEWBOARD bar; logs scroll below it. When the window is short,
   * features and header switch to their `compactLines`, then the OUTPUT body is truncated.
   */
  render(output, input, features = null, header = null) {
    if (!this.enabled) return false;
    this.panels = { output, input, features, header };
    this.installHooks();
    const width = Math.max(40, Math.min(this.stream.columns || 100, 140) - 1);
    const rows = this.stream.rows || 24;
    const available = rows - MIN_LOG_ROWS;
    let inputLines = this.buildPanel(input, PANEL_COLORS.input, width);
    const processLines = [this.processBar(width)];
    let headerLines = header ? this.buildPanel(header, PANEL_COLORS.header, width) : [];
    let outputLines = this.buildPanel(output, PANEL_COLORS.output, width);
    let featureLines = features ? this.buildPanel(features, PANEL_COLORS.features, width) : [];
    const fixed = () => headerLines.length + featureLines.length + inputLines.length + processLines.length;
    const fits = () => fixed() + outputLines.length <= available;
    if (features?.compactLines && !fits()) {
      featureLines = this.buildPanel({ title: features.title, lines: features.compactLines }, PANEL_COLORS.features, width);
    }
    if (header?.compactLines && !fits()) {
      headerLines = this.buildPanel({ title: header.title, lines: header.compactLines }, PANEL_COLORS.header, width);
    }
    // Keep at least MIN_OUTPUT_ROWS of OUTPUT visible: shrink the INPUT board to its compact form first.
    if (input?.compactLines && !fits() && available - fixed() - 2 < MIN_OUTPUT_ROWS) {
      inputLines = this.buildPanel({ title: input.title, lines: input.compactLines }, PANEL_COLORS.input, width);
    }
    const outputBudget = available - fixed() - 2;
    if (!fits() && outputBudget >= 3) {
      outputLines = this.buildPanel(output, PANEL_COLORS.output, width, 0, outputBudget);
    }

    if (!fits()) {
      // Window too small for the panels: fall back to a normal top-of-viewport redraw.
      this.unpin();
      this.stream.write(`${CSI}H${CSI}2J${[...headerLines, ...featureLines, ...inputLines, ...outputLines].join('\n')}\n`);
      this.state = 'unpinnable';
      return true;
    }

    const compose = () => [...headerLines, ...featureLines, ...inputLines, ...outputLines, ...processLines];
    if (this.state === 'pinned' && fixed() + outputLines.length <= this.height) {
      // Keep the panel height stable so the log area never jumps.
      const bodyRows = this.height - fixed() - 2;
      outputLines = this.buildPanel(output, PANEL_COLORS.output, width, bodyRows, bodyRows);
      this.stream.write(`\x1b7${this.drawRows(compose())}\x1b8`);
      return true;
    }

    const panels = compose();
    this.height = panels.length;
    this.stream.write(
      `${CSI}r${CSI}H${CSI}2J${this.drawRows(panels)}${CSI}${this.height + 1};${rows}r${CSI}${this.height + 1};1H`,
    );
    this.state = 'pinned';
    this.patchConsoleClear();
    return 'repinned';
  }

  /** Redraw with new INPUT content, keeping the last HEADER, FEATURES and OUTPUT content. */
  updateInput(input) {
    if (!this.panels || !this.current) return false;
    return this.render(this.panels.output, input, this.panels.features, this.panels.header);
  }

  drawRows(lines) {
    return lines.map((line, index) => `${CSI}${index + 1};1H${CSI}2K${line}`).join('');
  }

  clearLogArea() {
    if (this.pinned) this.stream.write(`${CSI}${this.height + 1};1H${CSI}0J`);
  }

  patchConsoleClear() {
    if (this.originalClear) return;
    this.originalClear = console.clear;
    // Screens that "clear" must only clear the log area, never the pinned panels.
    console.clear = () => (this.pinned ? this.clearLogArea() : this.originalClear.call(console));
  }

  unpin() {
    if (this.state === 'pinned') {
      this.stream.write(`${CSI}r${CSI}${this.stream.rows || 24};1H\n`);
    }
    if (this.originalClear) {
      console.clear = this.originalClear;
      this.originalClear = null;
    }
    this.height = 0;
  }

  /** Give the full screen back (e.g. for QR codes); the next render pins again. */
  release() {
    if (this.state === 'idle' || this.state === 'released') return;
    this.unpin();
    this.state = 'released';
  }

  close() {
    this.unpin();
    this.state = 'idle';
    this.panels = null;
  }

  installHooks() {
    if (this.exitHookInstalled) return;
    this.exitHookInstalled = true;
    process.once('exit', () => {
      if (this.state === 'pinned') this.stream.write(`${CSI}r${CSI}${this.stream.rows || 24};1H\n`);
    });
    this.stream.on?.('resize', () => {
      if (this.state === 'pinned' || this.state === 'unpinnable') {
        this.unpin();
        this.state = 'idle';
        this.onResize?.();
      }
    });
  }
}

export default TerminalLayout;
