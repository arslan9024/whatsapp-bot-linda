import { EventEmitter } from 'events';
import { TerminalLayout, PANEL_COLORS } from '../../src/terminal/TerminalLayout.js';

function fakeTty({ rows = 40, columns = 100, isTTY = true } = {}) {
  const stream = new EventEmitter();
  Object.assign(stream, { rows, columns, isTTY, output: '' });
  stream.write = chunk => { stream.output += chunk; return true; };
  return stream;
}

const output = { title: 'OUTPUT', lines: ['Devices: 1', '1. Master | +971 | Link: LINKED'] };
const input = { title: 'INPUT', lines: ['Type a command'] };

describe('TerminalLayout', () => {
  const originalClear = console.clear;
  const originalNoColor = process.env.NO_COLOR;
  beforeEach(() => { delete process.env.NO_COLOR; });
  afterEach(() => {
    console.clear = originalClear;
    if (originalNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = originalNoColor;
  });

  test('pins both panels above a scrolling log region with distinct colors', () => {
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    expect(layout.render(output, input)).toBe('repinned');
    expect(layout.pinned).toBe(true);
    expect(stream.output).toContain(`\x1b[${layout.height + 1};40r`);
    expect(stream.output).toContain(`\x1b[${PANEL_COLORS.output}m`);
    expect(stream.output).toContain(`\x1b[${PANEL_COLORS.input}m`);
    expect(PANEL_COLORS.output).not.toBe(PANEL_COLORS.input);
    layout.close();
  });

  test('updates in place without clearing logs when the header still fits', () => {
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    layout.render(output, input);
    const height = layout.height;
    stream.output = '';
    expect(layout.updateInput({ title: 'INPUT', lines: ['Choose 1 or 2'] })).toBe(true);
    expect(stream.output.startsWith('\x1b7')).toBe(true);
    expect(stream.output.endsWith('\x1b8')).toBe(true);
    expect(stream.output).not.toContain('\x1b[2J');
    expect(stream.output).toContain('Choose 1 or 2');
    expect(layout.height).toBe(height);
    layout.close();
  });

  test('console.clear only clears the log area while pinned and is restored on close', () => {
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    layout.render(output, input);
    stream.output = '';
    console.clear();
    expect(stream.output).toBe(`\x1b[${layout.height + 1};1H\x1b[0J`);
    layout.close();
    expect(console.clear).toBe(originalClear);
    expect(stream.output).toContain('\x1b[r');
  });

  test('falls back to an unpinned redraw when the panels do not fit', () => {
    const stream = fakeTty({ rows: 10 });
    const layout = new TerminalLayout(stream);
    expect(layout.render(output, input)).toBe(true);
    expect(layout.state).toBe('unpinnable');
    expect(stream.output).not.toMatch(/\x1b\[\d+;\d+r/);
  });

  test('release gives the screen back and the next render pins again', () => {
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    layout.render(output, input);
    layout.release();
    expect(layout.state).toBe('released');
    expect(layout.updateInput(input)).toBe(false);
    expect(layout.render(output, input)).toBe('repinned');
    layout.close();
  });

  test('does nothing for non-TTY streams and honors NO_COLOR', () => {
    const pipe = fakeTty({ isTTY: false });
    expect(new TerminalLayout(pipe).render(output, input)).toBe(false);
    expect(pipe.output).toBe('');

    process.env.NO_COLOR = '1';
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    layout.render(output, input);
    expect(stream.output).not.toContain(`\x1b[${PANEL_COLORS.output}m`);
    layout.close();
  });

  test('pins a green FEATURES panel between OUTPUT and INPUT, compacting when short', () => {
    const features = { title: 'FEATURES', lines: width => [`grid ${width}`, 'row 2', 'row 3'], compactLines: ['compact'] };
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    expect(layout.render(output, input, features)).toBe('repinned');
    const text = stream.output;
    expect(text).toContain(`\x1b[${PANEL_COLORS.features}m`);
    expect(new Set([PANEL_COLORS.output, PANEL_COLORS.features, PANEL_COLORS.input]).size).toBe(3);
    expect(text.indexOf('OUTPUT')).toBeLessThan(text.indexOf('FEATURES'));
    expect(text.indexOf('FEATURES')).toBeLessThan(text.indexOf('INPUT'));
    expect(text).toMatch(/grid \d+/);
    layout.close();

    const short = fakeTty({ rows: 19 });
    const compact = new TerminalLayout(short);
    compact.render(output, input, features);
    expect(compact.pinned).toBe(true);
    expect(short.output).toContain('compact');
    expect(short.output).not.toContain('row 3');
    compact.close();
  });

  test('re-pins after a terminal resize', () => {
    const stream = fakeTty();
    const layout = new TerminalLayout(stream);
    layout.onResize = jest.fn();
    layout.render(output, input);
    stream.emit('resize');
    expect(layout.onResize).toHaveBeenCalled();
    expect(layout.state).toBe('idle');
    layout.close();
  });
});
