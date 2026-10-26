import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import * as XLSX from '@e965/xlsx';
import { describeWorkingHours, msUntilWorkingHours } from './WorkingHours.js';

const MAX_CONTACTS = 5000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const RESERVED_COLUMNS = new Set(['__proto__', 'prototype', 'constructor']);
const PHONE_COLUMNS = ['phone', 'phone_number', 'number', 'mobile', 'whatsapp'];

export function sendingDelay(campaign) {
  const maximum = campaign.intervalMaxMs ?? campaign.intervalMs;
  return (
    campaign.intervalMs +
    Math.floor(Math.random() * (maximum - campaign.intervalMs + 1))
  );
}

export function normalizeRecipients(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_CONTACTS) {
    throw new Error(`Import must contain at most ${MAX_CONTACTS} contacts.`);
  }
  const seen = new Set();
  const contacts = [];
  const rejected = [];
  let duplicates = 0;
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      rejected.push({
        row: index + 2,
        reason: 'Expected a contact with column names.',
      });
      return;
    }
    const values = Object.fromEntries(
      Object.entries(row)
        .map(([key, value]) => [
          key.trim().toLowerCase().replace(/\s+/g, '_'),
          String(value ?? '').trim(),
        ])
        .filter(([key]) => key && !RESERVED_COLUMNS.has(key)),
    );
    const rawPhone = PHONE_COLUMNS.map(key => values[key]).find(Boolean) || '';
    const phone = rawPhone.replace(/[\s()+.-]/g, '').replace(/^00/, '');
    if (!/^[1-9]\d{6,14}$/.test(phone)) {
      rejected.push({
        row: index + 2,
        reason: 'Invalid phone. Include country code; use text cells in Excel.',
      });
      return;
    }
    if (seen.has(phone)) {
      duplicates++;
      return;
    }
    seen.add(phone);
    const optedOut = /^(true|yes|1|revoked|opted_out)$/i.test(
      values.opted_out || values.opt_out || '',
    );
    contacts.push({
      id: randomUUID(),
      phone,
      name: values.name || values.full_name || '',
      group: values.group || values.tag || '',
      values: { ...values, phone, name: values.name || values.full_name || '' },
      selected: !optedOut && row.selected !== false,
      optedOut,
      status: 'pending',
      reason: '',
      sentAt: null,
    });
  });
  return { contacts, rejected, duplicates };
}

export function parseContactFile(name, data) {
  if (typeof name !== 'string' || !/\.(csv|xlsx)$/i.test(name)) {
    throw new Error('Choose a CSV or .xlsx file.');
  }
  const bytes = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data || '', 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
    throw new Error('Contact files must be between 1 byte and 5 MB.');
  }
  const workbook = XLSX.read(bytes, {
    type: 'buffer',
    cellDates: false,
    sheetRows: MAX_CONTACTS + 2,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error('The file does not contain a worksheet.');
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) {
    throw new Error(
      'No contacts found. The first row must contain headers including phone.',
    );
  }
  return normalizeRecipients(rows);
}

export function personalize(template, contact) {
  const values = {
    ...contact.values,
    name: contact.name,
    phone: contact.phone,
    date: new Date().toISOString().slice(0, 10),
  };
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, key) => {
    const value = values[key.toLowerCase()];
    if (value === undefined || value === '') {
      throw new Error(
        `Missing variable {${key}} for ${contact.name || contact.phone}.`,
      );
    }
    return value;
  });
}

export function exportCampaignResults(campaign) {
  const cell = value => {
    const text = String(value ?? '');
    return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
  };
  const rows = [
    [
      'name',
      'phone',
      'group',
      'result',
      'reason',
      'sent_at',
      'delivery_unknown',
    ],
    ...campaign.contacts.map(contact => [
      contact.name,
      contact.phone,
      contact.group,
      !contact.selected ? 'not_sent' : contact.status,
      contact.reason,
      contact.sentAt,
      contact.deliveryUnknown ? 'yes' : 'no',
    ]),
  ];
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export default class CampaignWorkspace {
  constructor({
    directory,
    accounts,
    sendRecipient,
    checkRecipient,
    log = console.error,
    workingHours = null,
  }) {
    this.directory = directory;
    this.accounts = accounts;
    this.sendRecipient = sendRecipient;
    this.checkRecipient = checkRecipient;
    this.log = log;
    this.workingHours = workingHours;
    this.campaigns = [];
    this.jobs = new Map();
    this.waiters = new Map();
    this.file = path.join(directory, 'campaigns.json');
  }

  initialize() {
    fs.mkdirSync(path.join(this.directory, 'attachments'), { recursive: true });
    if (fs.existsSync(this.file)) {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (saved.version !== 1 || !Array.isArray(saved.campaigns)) {
        throw new Error('Unsupported campaign workspace data.');
      }
      this.campaigns = saved.campaigns;
      for (const campaign of this.campaigns) {
        if (['running', 'paused'].includes(campaign.status)) {
          campaign.status = 'paused';
          campaign.error =
            'Bot restarted. Review results and explicitly resume pending recipients.';
        }
        for (const contact of campaign.contacts) {
          if (contact.status === 'sending') {
            contact.status = 'not_sent';
            contact.deliveryUnknown = true;
            contact.reason =
              'Interrupted: delivery unknown. Check WhatsApp before creating a follow-up campaign.';
          }
        }
      }
      this.persist();
    }
  }

  persist() {
    fs.writeFileSync(
      this.file,
      JSON.stringify({ version: 1, campaigns: this.campaigns }),
      { encoding: 'utf8', flush: true },
    );
  }

  get(id) {
    const campaign = this.campaigns.find(item => item.id === id);
    if (!campaign) {
      throw new Error('Campaign not found.');
    }
    return campaign;
  }

  summary(campaign) {
    const counts = {
      total: campaign.contacts.length,
      selected: 0,
      sent: 0,
      failed: 0,
      notSent: 0,
      pending: 0,
      sending: 0,
      unknown: 0,
    };
    for (const contact of campaign.contacts) {
      if (contact.deliveryUnknown) {
        counts.unknown++;
      }
      if (contact.selected) {
        counts.selected++;
      }
      if (contact.status === 'sent') {
        counts.sent++;
      } else if (contact.status === 'failed') {
        counts.failed++;
      } else if (!contact.selected || contact.status === 'not_sent') {
        counts.notSent++;
      } else if (contact.status === 'sending') {
        counts.sending++;
      } else {
        counts.pending++;
      }
    }
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      accountPhone: campaign.accountPhone,
      counts,
      processed:
        counts.sent +
        counts.failed +
        campaign.contacts.filter(
          contact => contact.selected && contact.status === 'not_sent',
        ).length,
      incomplete:
        counts.pending > 0 || counts.sending > 0 || counts.unknown > 0,
      error: campaign.error,
      updatedAt: campaign.updatedAt,
    };
  }

  saveDraft(input, id) {
    const existing = id ? this.get(id) : null;
    if (existing && (existing.startedAt || this.jobs.has(id))) {
      throw new Error(
        'Started campaigns are read-only. Create a new draft instead.',
      );
    }
    const name = String(input.name || '').trim();
    const template = String(input.template || '');
    const intervalMs = Number(input.intervalMs);
    const intervalMaxMs = Number(input.intervalMaxMs ?? input.intervalMs);
    if (!name || name.length > 100) {
      throw new Error('Campaign name must be 1-100 characters.');
    }
    if (template.length > 4096) {
      throw new Error('Message text must be at most 4096 characters.');
    }
    if (
      !Number.isInteger(intervalMs) ||
      intervalMs < 3000 ||
      intervalMs > 3600000
    ) {
      throw new Error('Sending interval must be 3-3600 seconds.');
    }
    if (
      !Number.isInteger(intervalMaxMs) ||
      intervalMaxMs < intervalMs ||
      intervalMaxMs > 3600000
    ) {
      throw new Error(
        'Sending interval maximum must be between the minimum and 3600 seconds.',
      );
    }
    const rows = input.contacts?.map(contact => ({
      ...contact.values,
      phone: contact.phone,
      name: contact.name,
      group: contact.group,
      selected: contact.selected,
      opted_out: contact.optedOut,
    }));
    const imported = normalizeRecipients(rows);
    if (imported.rejected.length) {
      throw new Error('Fix invalid recipient phone numbers before saving.');
    }
    if (!imported.contacts.length) {
      throw new Error('Import at least one contact.');
    }
    const campaign = {
      id: existing?.id || randomUUID(),
      name,
      template,
      intervalMs,
      intervalMaxMs,
      accountPhone: String(input.accountPhone || ''),
      contacts: imported.contacts,
      attachments: existing?.attachments || [],
      status: 'draft',
      error: '',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      this.campaigns[this.campaigns.indexOf(existing)] = campaign;
    } else {
      this.campaigns.push(campaign);
    }
    this.persist();
    return campaign;
  }

  addAttachment(id, { name, mime, data }) {
    const campaign = this.get(id);
    if (campaign.startedAt) {
      throw new Error('Attachments cannot change after sending starts.');
    }
    if (campaign.attachments.length >= 5) {
      throw new Error('A campaign can contain at most 5 attachments.');
    }
    const bytes = Buffer.from(data || '', 'base64');
    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      pdf: 'application/pdf',
      txt: 'text/plain',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const filename = path
      .basename(String(name || ''))
      .replace(/[^\w. -]/g, '_')
      .slice(0, 120);
    const extension = filename.split('.').pop().toLowerCase();
    if (!types[extension] || mime !== types[extension]) {
      throw new Error(
        'Unsupported attachment type. Use JPG, PNG, WebP, MP4, PDF, TXT, DOCX or XLSX.',
      );
    }
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
      throw new Error('Each attachment must be between 1 byte and 12 MB.');
    }
    const attachment = {
      id: randomUUID(),
      name: filename,
      mime,
      bytes: bytes.length,
    };
    fs.writeFileSync(
      path.join(this.directory, 'attachments', attachment.id),
      bytes,
    );
    campaign.attachments.push(attachment);
    this.persist();
    return attachment;
  }

  removeAttachment(id, attachmentId) {
    const campaign = this.get(id);
    if (campaign.startedAt) {
      throw new Error('Attachments cannot change after sending starts.');
    }
    const attachment = campaign.attachments.find(
      item => item.id === attachmentId,
    );
    if (!attachment) {
      throw new Error('Attachment not found.');
    }
    fs.unlinkSync(path.join(this.directory, 'attachments', attachment.id));
    campaign.attachments = campaign.attachments.filter(
      item => item !== attachment,
    );
    this.persist();
  }

  start(id) {
    const campaign = this.get(id);
    if (campaign.status === 'running') {
      throw new Error('Campaign is already running.');
    }
    if (!['draft', 'paused'].includes(campaign.status)) {
      throw new Error('Only draft or paused campaigns can start.');
    }
    if (!campaign.template.trim() && !campaign.attachments.length) {
      throw new Error(
        'Add message text or at least one attachment before sending.',
      );
    }
    if ([...this.jobs.keys()].some(key => key !== id)) {
      throw new Error('Pause the currently running campaign first.');
    }
    if (
      !this.accounts().some(
        account => account.phone === campaign.accountPhone && account.active,
      )
    ) {
      throw new Error('Select an active linked WhatsApp account.');
    }
    const pending = campaign.contacts.filter(
      contact => contact.selected && contact.status === 'pending',
    );
    if (!pending.length) {
      throw new Error('No pending selected recipients remain.');
    }
    for (const contact of pending) {
      personalize(campaign.template, contact);
    }
    campaign.status = 'running';
    campaign.error = '';
    campaign.startedAt ||= new Date().toISOString();
    this.persist();
    this.waiters.get(id)?.();
    if (!this.jobs.has(id)) {
      const job = this.run(campaign)
        .catch(error => {
          if (campaign.status !== 'stopped') {
            campaign.status = 'paused';
          }
          campaign.error = error.message;
          this.log(`Campaign ${campaign.name} paused: ${error.message}`);
          try {
            this.persist();
          } catch (saveError) {
            campaign.error += `; state could not be saved: ${saveError.message}`;
            this.log(campaign.error);
          }
        })
        .finally(() => this.jobs.delete(id));
      this.jobs.set(id, job);
    }
    return this.summary(campaign);
  }

  pause(id) {
    const campaign = this.get(id);
    if (campaign.status !== 'running') {
      throw new Error('Campaign is not running.');
    }
    campaign.status = 'paused';
    campaign.updatedAt = new Date().toISOString();
    this.persist();
    this.waiters.get(id)?.();
    return this.summary(campaign);
  }

  stop(id) {
    const campaign = this.get(id);
    if (!['running', 'paused'].includes(campaign.status)) {
      throw new Error('Only running or paused campaigns can stop.');
    }
    campaign.status = 'stopped';
    campaign.updatedAt = new Date().toISOString();
    this.persist();
    this.waiters.get(id)?.();
    return this.summary(campaign);
  }

  async delete(id) {
    const campaign = this.get(id);
    if (['running', 'paused'].includes(campaign.status)) {
      this.stop(id);
    }
    await this.jobs.get(id);
    // Persist removal before deleting files so a failed save retains a usable task.
    const previous = this.campaigns;
    this.campaigns = this.campaigns.filter(item => item.id !== id);
    try {
      this.persist();
    } catch (error) {
      this.campaigns = previous;
      throw error;
    }
    for (const attachment of campaign.attachments) {
      fs.rmSync(path.join(this.directory, 'attachments', attachment.id), {
        force: true,
      });
    }
  }

  async wait(campaign) {
    const delay = Math.max(0, (campaign.nextSendAt || 0) - Date.now());
    if (!delay) {
      return;
    }
    await new Promise(resolve => {
      const timer = setTimeout(done, delay);
      const waiters = this.waiters;
      function done() {
        clearTimeout(timer);
        waiters.delete(campaign.id);
        resolve();
      }
      waiters.set(campaign.id, done);
    });
  }

  async run(campaign) {
    while (campaign.status === 'running') {
      const contact = campaign.contacts.find(
        item => item.selected && item.status === 'pending',
      );
      if (!contact) {
        campaign.status = 'completed';
        campaign.updatedAt = new Date().toISOString();
        this.persist();
        return;
      }
      await this.wait(campaign);
      if (campaign.status !== 'running') {
        return;
      }
      const closedForMs = this.workingHours
        ? msUntilWorkingHours(this.workingHours)
        : 0;
      if (closedForMs) {
        campaign.nextSendAt = Date.now() + closedForMs;
        this.persist();
        this.log(
          `Campaign "${campaign.name}" waiting: outside working hours (${describeWorkingHours(this.workingHours)}); resumes in ${Math.ceil(closedForMs / 60000)} min.`,
          'info',
        );
        continue;
      }
      const permission = await this.checkRecipient(campaign, contact);
      if (campaign.status !== 'running') {
        return;
      }
      if (!permission.allowed) {
        if (permission.pause) {
          throw new Error(permission.reason);
        }
        contact.status = 'not_sent';
        contact.reason = permission.reason;
        this.persist();
        continue;
      }
      const text = personalize(campaign.template, contact);
      const attachments = campaign.attachments.map(attachment => ({
        ...attachment,
        data: fs
          .readFileSync(path.join(this.directory, 'attachments', attachment.id))
          .toString('base64'),
      }));
      contact.status = 'sending';
      this.persist();
      try {
        const result = await this.sendRecipient(
          campaign,
          contact,
          text,
          attachments,
        );
        contact.status = result?.skipped ? 'not_sent' : 'sent';
        contact.reason = result?.reason || '';
        contact.deliveryUnknown = Boolean(result?.deliveryUnknown);
        if (contact.status === 'sent') {
          contact.sentAt = new Date().toISOString();
        }
      } catch (error) {
        contact.status = 'failed';
        contact.reason = error.message;
        contact.deliveryUnknown = Boolean(error.deliveryUnknown);
        this.log(`Campaign recipient failed: ${error.message}`);
      }
      campaign.updatedAt = new Date().toISOString();
      campaign.nextSendAt = Date.now() + sendingDelay(campaign);
      this.persist();
    }
  }

  async close() {
    for (const campaign of this.campaigns) {
      if (campaign.status === 'running') {
        this.pause(campaign.id);
      }
    }
    await Promise.all(this.jobs.values());
  }
}
