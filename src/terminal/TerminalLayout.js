/**
 * TerminalLayout.js
 *
 * Pins the OUTPUT (device dashboard), optional FEATURES (numbered feature counters)
 * and INPUT (command / question) panels to the
 * top of an interactive terminal using a VT scroll region. Logs and other
 * processing output scroll only in the area below the panels, so the panels
 * always stay above them. Non-TTY output (pipes, files, tests) is never touched.
 */

import { stripVTControlCharacters } from 'node:util';

const CSI = '\x1b[';
const MIN_LOG_ROWS = 8;
export const PANEL_COLORS = { output: '36', features: '32', input: '33' }; // cyan / green / yellow

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

  buildPanel({ title, lines }, color, width, minBody = 0) {
    const inner = width - 4;
    const source = typeof lines === 'function' ? lines(inner) : lines;
    const body = source.flatMap(line => wrap(line, inner));
    while (body.length < minBody) body.push('');
    const head = `╭─ ${title} `;
    return [
      colorize(head + '─'.repeat(Math.max(0, width - 2 - head.length)), color, { bold: true, stream: this.stream }),
      ...body.map(line => `${colorize('│', color, { bold: true, stream: this.stream })} ${colorize(line, color, { stream: this.stream })}`),
      colorize(`╰${'─'.repeat(width - 3)}`, color, { bold: true, stream: this.stream }),
    ];
  }

  /**
   * Draw OUTPUT, optional FEATURES and INPUT panels. `features.compactLines` replaces
   * the full feature grid when the window is too short for everything.
   */
  render(output, input, features = null) {
    if (!this.enabled) return false;
    this.panels = { output, input, features };
    this.installHooks();
    const width = Math.max(40, Math.min(this.stream.columns || 100, 140) - 1);
    const rows = this.stream.rows || 24;
    const inputLines = this.buildPanel(input, PANEL_COLORS.input, width);
    let outputLines = this.buildPanel(output, PANEL_COLORS.output, width);
    let featureLines = features ? this.buildPanel(features, PANEL_COLORS.features, width) : [];
    const fits = () => outputLines.length + featureLines.length + inputLines.length <= rows - MIN_LOG_ROWS;
    if (features?.compactLines && !fits()) {
      featureLines = this.buildPanel({ title: features.title, lines: features.compactLines }, PANEL_COLORS.features, width);
    }

    if (!fits()) {
      // Too many devices for this window: fall back to a normal top-of-viewport redraw.
      this.unpin();
      this.stream.write(`${CSI}H${CSI}2J${[...outputLines, ...featureLines, ...inputLines].join('\n')}\n`);
      this.state = 'unpinnable';
      return true;
    }

    const fixedRows = featureLines.length + inputLines.length;
    if (this.state === 'pinned' && outputLines.length + fixedRows <= this.height) {
      // Keep the header height stable so the log area never jumps.
      const bodyRows = this.height - fixedRows - 2;
      outputLines = this.buildPanel(output, PANEL_COLORS.output, width, bodyRows);
      this.stream.write(`\x1b7${this.drawRows([...outputLines, ...featureLines, ...inputLines])}\x1b8`);
      return true;
    }

    const header = [...outputLines, ...featureLines, ...inputLines];
    this.height = header.length;
    this.stream.write(
      `${CSI}r${CSI}H${CSI}2J${this.drawRows(header)}${CSI}${this.height + 1};${rows}r${CSI}${this.height + 1};1H`,
    );
    this.state = 'pinned';
    this.patchConsoleClear();
    return 'repinned';
  }

  /** Redraw with new INPUT content, keeping the last OUTPUT content. */
  updateInput(input) {
    if (!this.panels || !this.current) return false;
    return this.render(this.panels.output, input, this.panels.features);
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
