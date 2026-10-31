import {
  MENUS,
  formatMenuScreen,
  getMenu,
  findOptionByCode,
} from '../../src/whatsapp/keypad/KeypadMenuRegistry.js';
import { KeypadSessionTracker } from '../../src/whatsapp/keypad/KeypadSessionTracker.js';
import { KeypadDashboardService } from '../../src/whatsapp/keypad/KeypadDashboardService.js';

describe('KeypadDashboardService (Interactive Hierarchical Keypad Modal)', () => {
  let tracker;
  let mockExecutor;
  let service;

  beforeEach(() => {
    tracker = new KeypadSessionTracker(60000);
    mockExecutor = {
      execute: jest.fn().mockImplementation(async (action) => {
        if (action === 'campaign_damac_status') {
          return '📢 DAMAC HILLS 2 CAMPAIGN STATUS\nQuota: 1/day';
        }
        if (action === 'health_doctor') {
          return '🩺 System Health: 12/12 Passed';
        }
        return `Action: ${action}`;
      }),
    };

    service = new KeypadDashboardService({
      sessionTracker: tracker,
      executor: mockExecutor,
    });
  });

  describe('KeypadMenuRegistry', () => {
    it('defines root menu with all major categories', () => {
      const root = getMenu('root');
      expect(root).toBeDefined();
      expect(root.options.length).toBeGreaterThanOrEqual(6);
      expect(root.options.some((o) => o.subMenuId === 'campaigns')).toBe(true);
      expect(root.options.some((o) => o.subMenuId === 'health')).toBe(true);
    });

    it('finds options by direct dot code (e.g. 3.1, 1.1)', () => {
      const match1 = findOptionByCode('3.1');
      expect(match1).not.toBeNull();
      expect(match1.option.action).toBe('campaign_damac_status');

      const match2 = findOptionByCode('1.1');
      expect(match2).not.toBeNull();
      expect(match2.option.action).toBe('health_doctor');
    });

    it('formats clean WhatsApp keypad screen with navigation shortcuts', () => {
      const text = formatMenuScreen(getMenu('root'));
      expect(text).toContain('KEYPAD DASHBOARD');
      expect(text).toContain('[1]');
      expect(text).toContain('[3]');
      expect(text).toContain('[00] 🏠 Home Menu');
    });
  });

  describe('shouldHandle', () => {
    it('handles direct triggers from authorized masters', () => {
      expect(service.shouldHandle({ body: 'menu' }, true)).toBe(true);
      expect(service.shouldHandle({ body: 'dashboard' }, true)).toBe(true);
      expect(service.shouldHandle({ body: '00' }, true)).toBe(true);
      expect(service.shouldHandle({ body: '3.1' }, true)).toBe(true);
      expect(service.shouldHandle({ body: '0' }, true)).toBe(true);
      expect(service.shouldHandle({ body: 'next' }, true)).toBe(true);
    });

    it('rejects messages from non-masters or groups', () => {
      expect(service.shouldHandle({ body: 'menu' }, false)).toBe(false);
      expect(service.shouldHandle({ body: 'menu', fromMe: true }, true)).toBe(false);
      expect(service.shouldHandle({ body: 'menu', isGroupMsg: true }, true)).toBe(false);
    });
  });

  describe('handleMessage navigation flow', () => {
    it('renders root menu on "00" or "menu"', async () => {
      const msg = {
        from: '971559156636@c.us',
        body: '00',
        reply: jest.fn().mockResolvedValue(true),
      };

      const handled = await service.handleMessage(msg);
      expect(handled).toBe(true);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('KEYPAD DASHBOARD'),
        undefined,
        { allowClosedCirclePrompt: true }
      );
      expect(tracker.getSession('971559156636').menuId).toBe('root');
    });

    it('transitions to sub-menu when option number is selected', async () => {
      const sender = '971559156636@c.us';
      tracker.setMenu(sender, 'root');

      const msg = {
        from: sender,
        body: '3', // Select Campaigns
        reply: jest.fn().mockResolvedValue(true),
      };

      const handled = await service.handleMessage(msg);
      expect(handled).toBe(true);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('CAMPAIGNS & DAMAC HILLS 2'),
        undefined,
        { allowClosedCirclePrompt: true }
      );
      expect(tracker.getSession(sender).menuId).toBe('campaigns');
    });

    it('navigates back to parent on "0"', async () => {
      const sender = '971559156636@c.us';
      tracker.setMenu(sender, 'campaigns');

      const msg = {
        from: sender,
        body: '0', // Back to root
        reply: jest.fn().mockResolvedValue(true),
      };

      const handled = await service.handleMessage(msg);
      expect(handled).toBe(true);
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('KEYPAD DASHBOARD'),
        undefined,
        { allowClosedCirclePrompt: true }
      );
      expect(tracker.getSession(sender).menuId).toBe('root');
    });

    it('executes direct path (e.g. 3.1) and returns result with navigation footer', async () => {
      const msg = {
        from: '971559156636@c.us',
        body: '3.1',
        reply: jest.fn().mockResolvedValue(true),
      };

      const handled = await service.handleMessage(msg);
      expect(handled).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalledWith('campaign_damac_status', expect.anything());
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('DAMAC HILLS 2 CAMPAIGN STATUS'),
        undefined,
        { allowClosedCirclePrompt: true }
      );
      expect(msg.reply).toHaveBeenCalledWith(
        expect.stringContaining('[0] ⬅️ Back | [00] 🏠 Home Menu'),
        undefined,
        { allowClosedCirclePrompt: true }
      );
    });
  });
});

