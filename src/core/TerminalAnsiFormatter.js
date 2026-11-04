/**
 * @file TerminalAnsiFormatter.js
 * @description Parses and converts ANSI terminal escape sequences into sanitized HTML
 * markup for display inside the Web UI operations terminal component.
 * Category: Core
 */

export class TerminalAnsiFormatter {
  constructor() {
    this.colorMap = {
      '30': 'color: #4b5563;', // black/gray
      '31': 'color: #ef4444;', // red
      '32': 'color: #22c55e;', // green
      '33': 'color: #eab308;', // yellow
      '34': 'color: #3b82f6;', // blue
      '35': 'color: #a855f7;', // magenta
      '36': 'color: #06b6d4;', // cyan
      '37': 'color: #f3f4f6;'  // white
    };
  }

  /**
   * Converts ANSI colored line to sanitized HTML with inline color styles
   * @param {string} ansiString
   * @returns {string} HTML string
   */
  ansiToHtml(ansiString = '') {
    if (!ansiString || typeof ansiString !== 'string') return '';

    // Strip carriage returns
    let text = ansiString.replace(/\r/g, '');

    // Replace color escapes \u001b[32m or \x1b[32m
    text = text.replace(/\x1b\[(\d+)m/g, (match, code) => {
      if (code === '0') {
        return '</span>';
      }
      const style = this.colorMap[code];
      if (style) {
        return `<span style="${style}">`;
      }
      return '';
    });

    return text;
  }

  /**
   * Strips all ANSI codes completely for plain text logs
   * @param {string} text
   * @returns {string}
   */
  stripAnsi(text = '') {
    return text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '');
  }
}

export default new TerminalAnsiFormatter();

