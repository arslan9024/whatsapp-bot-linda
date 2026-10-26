/**
 * TerminalPlaybooks.js
 *
 * Numbered problem → step algorithms for the terminal. Every step points at a fixed menu
 * code; `p<n>` shows a playbook and `p<n>.<step>` runs one step. `{master}` in a step
 * command is replaced with the master phone; steps without a ready command run their
 * menu code, which asks for the missing values.
 */

export const PLAYBOOKS = Object.freeze([
  { id: 1, problem: 'Restore master (offline but still linked)', steps: [
    { code: '1.16', command: 'recover {master}', note: 'Reactivate the saved session; no new code needed.' },
    { code: '1.9', command: 'relink master {master}', note: 'Only if step 1 fails: new QR or pairing code.' },
    { code: '2.1', note: 'Last resort: link the master with a pairing code.' },
  ] },
  { id: 2, problem: 'Link a new master', steps: [
    { code: '2.1', note: 'Link with a pairing code (enter it on the phone).' },
    { code: '2.2', note: 'Or link with a QR code.' },
    { code: '1.3', note: 'Check the master is listed and linked.' },
  ] },
  { id: 3, problem: 'Pairing code delayed or failed', steps: [
    { code: '1.12', command: 'code {master}', note: 'Request a fresh pairing code (or type r while linking).' },
    { code: '2.2', note: 'Still failing: switch to QR code linking.' },
    { code: '1.9', command: 'relink master {master}', note: 'Restart linking from scratch.' },
  ] },
  { id: 4, problem: 'Sessions missing after restart', steps: [
    { code: '1.7', note: 'Restore all saved sessions.' },
    { code: '1.18', note: 'See which accounts are still offline.' },
    { code: '1.16', command: 'recover {master}', note: 'Reactivate the master if it is still offline.' },
  ] },
  { id: 5, problem: 'Device removed / logged out', steps: [
    { code: '1.13', command: 'device {master}', note: 'Confirm the link state of the master device.' },
    { code: '1.9', command: 'relink master {master}', note: 'Relink; a removed device needs a new code/QR.' },
    { code: '1.7', note: 'Restore the other saved sessions.' },
  ] },
  { id: 6, problem: 'Add a servant account', steps: [
    { code: '1.10', note: 'Link the servant by phone (QR or code).' },
    { code: '1.4', note: 'Check the servant is listed.' },
    { code: '1.14', note: 'Check the servant health.' },
  ] },
  { id: 7, problem: 'Analyze conversations', steps: [
    { code: '8.11', command: 'convos {master}', note: 'Report: total chats, last chat, messages per chat.' },
    { code: '8.9', command: 'chats {master}', note: 'Numbered chat list.' },
    { code: '8.10', note: 'Analyze one chat by its number.' },
  ] },
  { id: 8, problem: 'Send a message safely', steps: [
    { code: '8.2', note: 'Validate the number first.' },
    { code: '8.1', note: 'Send one message (asks to confirm).' },
  ] },
  { id: 9, problem: 'Clean contacts', steps: [
    { code: '3.2', note: 'Verify and recount contacts.' },
    { code: '3.4', note: 'Search contacts.' },
    { code: '8.7', note: 'Find duplicates in a CSV/XLSX/JSON file.' },
  ] },
  { id: 10, problem: 'Daily health check', steps: [
    { code: '6.1', note: 'Health dashboard.' },
    { code: '1.18', note: 'Health of all accounts.' },
    { code: '8.3', note: 'Health scores.' },
    { code: '4.3', note: 'Uptime report.' },
  ] },
]);

const PATTERN = /^p(\d{1,2})(?:\.(\d{1,2}))?$/i;

export class TerminalPlaybooks {
  /**
   * @param {{nodeAt: (path:number[]) => any}} menu - TerminalNumberMenu (resolves step codes).
   * @param {() => string|null} masterPhone
   * @param {(key:string) => number} count - usage counter for `p<n>`.
   */
  constructor(menu, masterPhone = () => null, count = () => 0) {
    this.menu = menu;
    this.masterPhone = masterPhone;
    this.count = count;
  }

  get(id) {
    return PLAYBOOKS.find(playbook => playbook.id === id) || null;
  }

  /** The menu command behind a step code, e.g. `1.16` → `recover`. */
  menuCommand(code) {
    if (!this.menu.root) this.menu.refresh(false);
    return this.menu.nodeAt(code.split('.').map(Number))?.command || '?';
  }

  /** Ready-to-run command for a step, or null when the menu code must ask for values. */
  stepCommand(step) {
    if (!step.command) return null;
    const master = this.masterPhone();
    if (step.command.includes('{master}') && !master) return null;
    return step.command.replaceAll('{master}', master || '');
  }

  /** One line per playbook: `P1 Restore master ×2: 1.16 recover → 1.9 relink master → 2.1 link-code`. */
  summaryLines() {
    return PLAYBOOKS.map(playbook => `P${playbook.id} ${playbook.problem} ×${this.count(`p${playbook.id}`)}: ${
      playbook.steps.map(step => `${step.code} ${this.menuCommand(step.code)}`).join(' → ')}`);
  }

  detailLines(playbook) {
    return [
      `P${playbook.id} · ${playbook.problem} · runs ×${this.count(`p${playbook.id}`)}`,
      ...playbook.steps.map((step, index) => {
        const ready = this.stepCommand(step);
        return `  p${playbook.id}.${index + 1}  [${step.code}] ${ready || `${this.menuCommand(step.code)} (asks for values)`} - ${step.note}`;
      }),
      `Run a step: type p${playbook.id}.1 … p${playbook.id}.${playbook.steps.length}. Run the next step only if the previous one did not fix it.`,
    ];
  }

  /**
   * Resolve `p`, `playbooks`, `p<n>` or `p<n>.<step>`.
   * Returns null (not a playbook input), `{ lines }` to print, or `{ input, id }` to execute.
   */
  resolve(text) {
    const value = String(text).trim();
    if (/^(?:p|playbooks?)$/i.test(value)) {
      return { lines: ['LINDA PLAYBOOKS · problem → numbered steps · p<n> = details · p<n>.<step> = run', ...PLAYBOOKS.flatMap(p => this.detailLines(p))] };
    }
    const match = PATTERN.exec(value);
    if (!match) return null;
    const playbook = this.get(Number(match[1]));
    if (!playbook) return { lines: [`No playbook P${match[1]}. Playbooks: P1-P${PLAYBOOKS.length} (type p).`] };
    if (!match[2]) return { lines: this.detailLines(playbook) };
    const step = playbook.steps[Number(match[2]) - 1];
    if (!step) return { lines: [`P${playbook.id} has steps 1-${playbook.steps.length}.`, ...this.detailLines(playbook)] };
    return { id: playbook.id, input: this.stepCommand(step) || step.code };
  }
}

export default TerminalPlaybooks;
