import fs from 'node:fs';
import path from 'node:path';
import {
  exportCampaignResults,
  normalizeRecipients,
  parseContactFile,
  personalize,
} from '../campaigns/CampaignWorkspace.js';

const attachmentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const filePath = value => path.resolve(value.replace(/^"(.*)"$/, '$1'));
const field = (label, defaultValue) => ({ label, defaultValue });
const maskPhone = phone =>
  phone.length > 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '****';
const intervalLabel = campaign =>
  campaign.intervalMaxMs && campaign.intervalMaxMs !== campaign.intervalMs
    ? `${campaign.intervalMs / 1000}-${campaign.intervalMaxMs / 1000}s`
    : `${campaign.intervalMs / 1000}s`;

export default class TerminalCampaignMenu {
  constructor({
    workspace,
    readSheet,
    output = console.log,
    onChange = () => {},
  }) {
    this.workspace = workspace;
    this.readSheet = readSheet;
    this.output = output;
    this.onChange = onChange;
    this.active = false;
    this.pending = null;
    this.view = 'home';
    this.campaignId = null;
    this.page = 0;
    this.filter = '';
    this.lastProgress = '';
    this.taskFilter = 'all';
    this.resultFilter = 'all';
  }

  open() {
    this.active = true;
    this.pending = null;
    this.view = 'home';
    clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => this.progress(), 2000);
    this.progressTimer.unref?.();
    this.render();
  }

  async close() {
    clearInterval(this.progressTimer);
    this.active = false;
    await this.workspace.close();
  }

  campaign() {
    return this.workspace.get(this.campaignId);
  }

  counts(campaign) {
    const { counts, status, processed, incomplete } =
      this.workspace.summary(campaign);
    return `${campaign.name} | ${status} | ${processed} / ${counts.selected} processed | ${incomplete ? 'Incomplete results' : 'Results complete'} | total ${counts.total} | selected ${counts.selected} | sent ${counts.sent} | failed ${counts.failed} | pending ${counts.pending} | sending ${counts.sending} | not sent ${counts.notSent} | delivery unknown ${counts.unknown}`;
  }

  progress() {
    if (!this.active || this.pending || this.view !== 'campaign') {
      return;
    }
    const text = `${this.counts(this.campaign())}${this.campaign().error ? ` | ${this.campaign().error}` : ''}`;
    if (text === this.lastProgress) {
      return;
    }
    this.lastProgress = text;
    this.output(text);
  }

  render() {
    if (this.view === 'home') {
      this.output(
        `\nCAMPAIGNS | ${this.workspace.campaigns.length} saved | headless WhatsApp`,
      );
      this.output('MESSAGE SENDER | 1. New task / campaign');
      this.output(
        `WhatsApp accounts: ${this.workspace.accounts().filter(account => account.active).length} connected | type help for workspace help`,
      );
      this.output('Views: all | drafts | sending | history (type a view name)');
      this.output(
        'Tasks and attachment copies stay on this computer in data/campaign-workspace. No browser extension or device sync.',
      );
      this.list = this.workspace.campaigns.filter(
        campaign =>
          this.taskFilter === 'all' ||
          (this.taskFilter === 'drafts' && campaign.status === 'draft') ||
          (this.taskFilter === 'sending' &&
            ['running', 'paused'].includes(campaign.status)) ||
          (this.taskFilter === 'history' &&
            ['completed', 'stopped'].includes(campaign.status)),
      );
      this.output(`View: ${this.taskFilter} | ${this.list.length} tasks`);
      this.list.forEach((campaign, index) =>
        this.output(`${index + 2}. ${this.counts(campaign)}`),
      );
      this.output('0 = terminal dashboard | menu = refresh');
      return;
    }
    const campaign = this.campaign();
    this.output(`\n${this.counts(campaign)}`);
    if (campaign.error) {
      this.output(`Notice: ${campaign.error}`);
    }
    if (this.view === 'recipients') {
      const matches = this.matchingContacts();
      this.page = Math.min(
        this.page,
        Math.max(0, Math.ceil(matches.length / 10) - 1),
      );
      this.contacts = matches.slice(this.page * 10, this.page * 10 + 10);
      this.output(
        `Contacts: ${matches.length} matching | page ${this.page + 1} | filter: ${this.filter || 'all'}`,
      );
      this.contacts.forEach((contact, index) =>
        this.output(
          `${index + 1}. [${contact.selected ? 'x' : ' '}] ${contact.name} ${maskPhone(contact.phone)} | ${contact.group} | ${contact.status}${contact.optedOut ? ' | opted out' : ''}`,
        ),
      );
      this.output(
        '1-10 toggle contact | 11 previous | 12 next | 13 search/group filter | 14 select matching | 15 exclude matching | 0 back',
      );
      return;
    }
    this.lastProgress = '';
    this.output(
      `Account: ${campaign.accountPhone} | ${this.workspace.accounts().find(account => account.phone === campaign.accountPhone)?.active ? 'CONNECTED' : 'OFFLINE'} | interval ${intervalLabel(campaign)} | attachments ${campaign.attachments.length} files`,
    );
    this.output(`Message: ${campaign.template || 'None'}`);
    this.output(
      'Sending uses Linda headless WhatsApp. Keep Linda running and the account connected. Pause/stop finishes any in-flight recipient; unknown delivery must be reviewed before a follow-up.',
    );
    this.output(
      'Offline? Return to the dashboard with 00 then 0; use link-code <phone> or link-qr <phone>. Type help for workspace help.',
    );
    this.output(
      '1. Refresh progress\n2. Edit draft/account/interval\n3. Append contacts (file, paste, Sheets)\n4. Select/filter contacts\n5. Preview personalized message\n6. Add attachment\n7. Remove attachment\n8. Start / Resume (confirmation required)\n9. Pause\n10. Review results\n11. Export results CSV\n12. Stop task (cannot resume)\n13. Delete task and attachment copies\n14. Results filter: All / Failed\n0 = campaigns | 00 = campaigns home',
    );
  }

  matchingContacts() {
    const query = this.filter.toLowerCase();
    return this.campaign().contacts.filter(contact =>
      [contact.name, contact.phone, contact.group].some(value =>
        value.toLowerCase().includes(query),
      ),
    );
  }

  editable() {
    if (this.campaign().startedAt) {
      throw new Error(
        'Started campaigns are read-only. Create a new draft for follow-ups.',
      );
    }
  }

  ask(fields, submit) {
    this.pending = { fields, values: [], submit };
    this.prompt();
  }

  prompt() {
    const next = this.pending.fields[this.pending.values.length];
    this.output(
      `${next.label}${next.defaultValue !== undefined ? ` [${next.defaultValue || 'optional'}]` : ''} (0 cancels):`,
    );
  }

  showAccounts() {
    this.accounts = this.workspace.accounts();
    if (!this.accounts.length) {
      throw new Error(
        'No linked accounts. Exit with 0, then link-code or link-qr first.',
      );
    }
    this.output(`Sending accounts (${this.accounts.length}):`);
    this.accounts.forEach((account, index) =>
      this.output(
        `${index + 1}. ${account.name || account.phone} | ${account.phone} | ${account.active ? 'ACTIVE' : 'OFFLINE'}`,
      ),
    );
  }

  account(number) {
    if (!/^[1-9]\d*$/.test(number) || !this.accounts[Number(number) - 1]) {
      throw new Error('Choose a listed account number.');
    }
    return this.accounts[Number(number) - 1].phone;
  }

  edit(isNew = false) {
    if (!isNew) {
      this.editable();
    }
    this.showAccounts();
    const current = isNew ? null : this.campaign();
    this.ask(
      [
        field('Campaign name', current?.name),
        field(
          'Message (use {name}, {phone}, {date}, custom columns; \\n for newline)',
          current?.template.replace(/\n/g, '\\n') || '',
        ),
        field(
          'Interval in seconds, 3-3600; fixed (10) or range (6-10)',
          current ? intervalLabel(current).replace(/s$/, '') : '6-10',
        ),
        field(
          'Sending account number',
          String(
            Math.max(
              1,
              this.accounts.findIndex(
                account => account.phone === current?.accountPhone,
              ) + 1,
            ),
          ),
        ),
      ],
      async ([name, template, seconds, account]) => {
        const interval = /^(\d+)(?:-(\d+))?$/.exec(seconds);
        if (!interval) {
          throw new Error('Enter a whole-second interval such as 10 or 6-10.');
        }
        const draft = {
          ...current,
          name,
          template: template.replace(/\\n/g, '\n'),
          intervalMs: Number(interval[1]) * 1000,
          intervalMaxMs: Number(interval[2] || interval[1]) * 1000,
          accountPhone: this.account(account),
        };
        if (isNew) {
          this.importContacts(contacts => {
            const campaign = this.workspace.saveDraft({ ...draft, contacts });
            this.campaignId = campaign.id;
            this.view = 'campaign';
          });
        } else {
          this.workspace.saveDraft(draft, current.id);
        }
      },
    );
  }

  importContacts(save) {
    this.ask(
      [
        field(
          'Import source: 1 = CSV/XLSX file, 2 = pasted CSV, 3 = Google Sheets',
        ),
      ],
      async ([source]) => {
        const finish = imported => {
          this.output(
            `Imported ${imported.contacts.length} | duplicates ${imported.duplicates} | rejected ${imported.rejected.length}`,
          );
          imported.rejected
            .slice(0, 5)
            .forEach(row => this.output(`Row ${row.row}: ${row.reason}`));
          if (!imported.contacts.length) {
            throw new Error('No valid contacts were imported.');
          }
          save(imported.contacts);
        };
        if (source === '1') {
          this.ask(
            [field('Contact file path (.csv or .xlsx)')],
            async ([filename]) => {
              const resolved = filePath(filename);
              if (fs.statSync(resolved).size > 5 * 1024 * 1024) {
                throw new Error('Contact import exceeds 5 MB.');
              }
              finish(parseContactFile(resolved, fs.readFileSync(resolved)));
            },
          );
        } else if (source === '2') {
          this.ask(
            [
              field(
                'Paste CSV including headers; use \\n between rows (phone,name\\n15550000002,Alex)',
              ),
            ],
            async ([text]) => {
              finish(
                parseContactFile(
                  'contacts.csv',
                  Buffer.from(text.replace(/\\n/g, '\n')),
                ),
              );
            },
          );
        } else if (source === '3') {
          this.ask(
            [field('Spreadsheet ID'), field('Range', 'Sheet1!A1:Z5001')],
            async ([id, range]) => {
              const result = await this.readSheet(id, range);
              if (!result?.success) {
                throw new Error(
                  result?.error || 'Google Sheets import failed.',
                );
              }
              const [headers, ...rows] = result.data || [];
              if (!headers?.length) {
                throw new Error('Google Sheet has no header row.');
              }
              finish(
                normalizeRecipients(
                  rows.map(row =>
                    Object.fromEntries(
                      headers.map((header, index) => [
                        String(header),
                        row[index] ?? '',
                      ]),
                    ),
                  ),
                ),
              );
            },
          );
        } else {
          throw new Error('Choose import source 1, 2 or 3.');
        }
      },
    );
  }

  saveContacts(contacts) {
    const campaign = this.campaign();
    this.workspace.saveDraft({ ...campaign, contacts }, campaign.id);
  }

  async handleInput(input) {
    if (!this.active) {
      return false;
    }
    const text = input.trim();
    try {
      if (text === '0' || text === '00') {
        if (this.pending) {
          this.pending = null;
        } else if (this.view === 'recipients' && text === '0') {
          this.view = 'campaign';
        } else if (this.view !== 'home') {
          this.view = 'home';
        } else {
          this.active = false;
          clearInterval(this.progressTimer);
          this.onChange();
          return true;
        }
        this.render();
        return true;
      }
      if (this.pending) {
        const pending = this.pending;
        const next = pending.fields[pending.values.length];
        const value = text || next.defaultValue;
        if (value === undefined) {
          throw new Error('A value is required.');
        }
        pending.values.push(value);
        if (pending.values.length < pending.fields.length) {
          this.prompt();
        } else {
          this.pending = null;
          await pending.submit(pending.values);
          if (!this.pending) {
            this.render();
          }
        }
        return true;
      }
      if (['menu', 'campaigns'].includes(text.toLowerCase())) {
        this.render();
        return true;
      }
      if (text.toLowerCase() === 'help') {
        this.output(
          `Message Sender workspace: tasks and attachment copies are saved locally in ${this.workspace.directory}. They survive restarts, do not sync, and remain until you delete the task or its local data.`,
        );
        this.output(
          'New task: 1 at home. Views: all, drafts, sending, history. Inside a task: 8 Start/Resume, 9 Pause, 10 Results, 11 CSV export, 12 Stop, 13 Delete, 14 All/Failed filter.',
        );
        this.output(
          'Pause/stop/delete let the current recipient finish. Stopped tasks cannot resume. Unknown delivery is never retried automatically: check WhatsApp before a follow-up. CSV exports contain full phone numbers.',
        );
        return true;
      }
      if (this.view === 'home') {
        if (
          ['all', 'drafts', 'sending', 'history'].includes(text.toLowerCase())
        ) {
          this.taskFilter = text.toLowerCase();
          this.render();
        } else if (text === '1') {
          this.edit(true);
        } else {
          const campaign = /^[1-9]\d*$/.test(text)
            ? this.list[Number(text) - 2]
            : null;
          if (!campaign) {
            throw new Error('Choose a listed campaign number.');
          }
          this.campaignId = campaign.id;
          this.view = 'campaign';
          this.render();
        }
      } else if (this.view === 'recipients') {
        this.editable();
        const campaign = this.campaign();
        const contact =
          /^[1-9]\d*$/.test(text) && Number(text) <= 10
            ? this.contacts[Number(text) - 1]
            : null;
        if (contact) {
          if (contact.optedOut) {
            throw new Error('Opted-out contacts cannot be selected.');
          }
          this.saveContacts(
            campaign.contacts.map(item =>
              item.id === contact.id
                ? { ...item, selected: !item.selected }
                : item,
            ),
          );
        } else if (text === '11') {
          this.page = Math.max(0, this.page - 1);
        } else if (text === '12') {
          this.page++;
        } else if (text === '13') {
          this.ask(
            [field('Search name, phone or group; blank = all', '')],
            async ([query]) => {
              this.filter = query;
              this.page = 0;
            },
          );
        } else if (text === '14' || text === '15') {
          const selected = new Set(
            this.matchingContacts().map(item => item.id),
          );
          this.saveContacts(
            campaign.contacts.map(item =>
              selected.has(item.id)
                ? { ...item, selected: text === '14' && !item.optedOut }
                : item,
            ),
          );
        } else {
          throw new Error('Choose a contact or action number.');
        }
        if (!this.pending) {
          this.render();
        }
      } else {
        await this.handleCampaignAction(text);
      }
    } catch (error) {
      this.output(`Campaign error: ${error.message}`);
      if (this.pending) {
        this.prompt();
      } else {
        this.render();
      }
    }
    this.onChange();
    return true;
  }

  async handleCampaignAction(text) {
    const campaign = this.campaign();
    switch (text) {
      case '1':
        break;
      case '2':
        this.edit();
        break;
      case '3':
        this.editable();
        this.importContacts(contacts =>
          this.saveContacts([...campaign.contacts, ...contacts]),
        );
        break;
      case '4':
        this.editable();
        this.view = 'recipients';
        this.page = 0;
        this.filter = '';
        break;
      case '5':
        this.output(`Message: ${campaign.template}`);
        this.output(
          `Attachments (${campaign.attachments.length}): ${campaign.attachments.map(item => item.name).join(', ') || 'none'}`,
        );
        this.ask(
          [
            field(
              `Preview contact number (1-${campaign.contacts.length})`,
              '1',
            ),
          ],
          async ([number]) => {
            const contact = /^[1-9]\d*$/.test(number)
              ? campaign.contacts[Number(number) - 1]
              : null;
            if (!contact) {
              throw new Error('Choose a valid contact number.');
            }
            this.output(
              `Preview for ${contact.name || maskPhone(contact.phone)}:\n${personalize(campaign.template, contact)}`,
            );
          },
        );
        break;
      case '6':
        this.editable();
        this.ask([field('Attachment file path')], async ([filename]) => {
          const resolved = filePath(filename);
          const mime = attachmentTypes[path.extname(resolved).toLowerCase()];
          if (!mime) {
            throw new Error('Unsupported attachment type.');
          }
          if (fs.statSync(resolved).size > 12 * 1024 * 1024) {
            throw new Error('Attachment exceeds 12 MB.');
          }
          this.workspace.addAttachment(campaign.id, {
            name: path.basename(resolved),
            mime,
            data: fs.readFileSync(resolved).toString('base64'),
          });
        });
        break;
      case '7':
        this.editable();
        campaign.attachments.forEach((item, index) =>
          this.output(`${index + 1}. ${item.name}`),
        );
        this.ask([field('Attachment number to remove')], async ([number]) => {
          const attachment = /^[1-9]\d*$/.test(number)
            ? campaign.attachments[Number(number) - 1]
            : null;
          if (!attachment) {
            throw new Error('Choose a listed attachment number.');
          }
          this.workspace.removeAttachment(campaign.id, attachment.id);
        });
        break;
      case '8':
        this.output(
          `${this.counts(campaign)}\nAccount: ${campaign.accountPhone} | interval: ${intervalLabel(campaign)}\nMessage: ${campaign.template || 'None'}\nAttachments: ${campaign.attachments.map(item => item.name).join(', ') || 'none'}`,
        );
        this.ask(
          [field('Confirm sending: 1 = Start / Resume; 0 = cancel')],
          async ([confirmation]) => {
            if (confirmation !== '1') {
              throw new Error('Sending was not confirmed.');
            }
            this.workspace.start(campaign.id);
          },
        );
        break;
      case '9':
        this.workspace.pause(campaign.id);
        break;
      case '10':
        {
          const results = campaign.contacts.filter(
            contact =>
              this.resultFilter === 'all' ||
              contact.status === 'failed' ||
              contact.deliveryUnknown,
          );
          this.output(
            `Results: ${this.resultFilter} | ${results.length} recipients`,
          );
          if (!results.length) {
            break;
          }
          this.ask(
            [field('Results page (20 per page)', '1')],
            async ([number]) => {
              if (
                !/^[1-9]\d*$/.test(number) ||
                (Number(number) - 1) * 20 >= results.length
              ) {
                throw new Error('Choose an existing results page.');
              }
              results
                .slice((Number(number) - 1) * 20, Number(number) * 20)
                .forEach((contact, index) => {
                  this.output(
                    `${(Number(number) - 1) * 20 + index + 1}. ${contact.name} ${maskPhone(contact.phone)} | ${!contact.selected ? 'not_sent' : contact.status} | ${contact.reason}${contact.deliveryUnknown ? ' | Delivery status unknown. Review WhatsApp before retrying.' : ''}`,
                  );
                });
            },
          );
        }
        break;
      case '11':
        this.ask(
          [field('Output CSV path (existing files will NOT be overwritten)')],
          async ([filename]) => {
            const resolved = filePath(filename);
            fs.writeFileSync(resolved, exportCampaignResults(campaign), {
              flag: 'wx',
              encoding: 'utf8',
            });
            this.output(`Results saved: ${resolved}`);
          },
        );
        break;
      case '12':
      case '13':
        this.ask(
          [
            field(
              `Confirm ${text === '12' ? 'stop' : 'delete'}: 1 = confirm; 0 = cancel`,
            ),
          ],
          async ([confirmation]) => {
            if (confirmation !== '1') {
              throw new Error('Action was not confirmed.');
            }
            if (text === '12') {
              this.workspace.stop(campaign.id);
              this.output(
                'Task stopped. Pending recipients will not be sent; an in-flight recipient may finish.',
              );
            } else {
              await this.workspace.delete(campaign.id);
              this.campaignId = null;
              this.view = 'home';
              this.output(
                'Task and local attachment copies deleted. WhatsApp messages are not deleted.',
              );
            }
          },
        );
        break;
      case '14':
        this.ask(
          [field('Results filter: all or failed', this.resultFilter)],
          async ([filter]) => {
            if (!['all', 'failed'].includes(filter.toLowerCase())) {
              throw new Error('Choose all or failed.');
            }
            this.resultFilter = filter.toLowerCase();
            this.output(`Results filter: ${this.resultFilter}`);
          },
        );
        break;
      default:
        throw new Error('Choose a listed campaign action number.');
    }
    if (!this.pending) {
      this.render();
    }
  }
}
