import { handleMasterAddDeviceRequest } from '../../src/linking/MasterDeviceAdder.js';

describe('MasterDeviceAdder (Closed Circle Expansion by Message)', () => {
  let mockAcm;
  let mockPrimaryClient;
  let sendWhatsAppMessage;
  let logBot;

  beforeEach(() => {
    const accounts = new Map([
      ['+971505760056', { phoneNumber: '+971505760056', role: 'primary', displayName: 'Primary Master' }],
      ['+971559156636', { phoneNumber: '+971559156636', role: 'master', displayName: 'Secondary Master' }],
    ]);

    mockAcm = {
      getMasterPhoneNumber: jest.fn().mockReturnValue('+971505760056'),
      getAccountByPhone: jest.fn((phone) => accounts.get(phone) || null),
      getAllAccounts: jest.fn(() => Array.from(accounts.values())),
      addMasterAccount: jest.fn().mockImplementation(async (phone, displayName) => {
        const acc = { phoneNumber: phone, displayName, role: 'master' };
        accounts.set(phone, acc);
        return { success: true, account: acc };
      }),
    };

    mockPrimaryClient = {
      sendMessage: jest.fn().mockResolvedValue({ id: 'sent-msg' }),
    };

    sendWhatsAppMessage = jest.fn().mockResolvedValue(true);
    logBot = jest.fn();
  });

  it('allows an authorized master to add a new device by message', async () => {
    const msg = {
      body: 'add device +971505110636 Linda Work',
      from: '971505760056@c.us',
    };

    const handled = await handleMasterAddDeviceRequest({
      msg,
      senderPhone: '+971505760056',
      accountConfig: { phoneNumber: '+971505760056', role: 'primary' },
      acm: mockAcm,
      primaryClient: mockPrimaryClient,
      sendWhatsAppMessage,
      logBot,
    });

    expect(handled).toBe(true);
    expect(mockAcm.addMasterAccount).toHaveBeenCalledWith('+971505110636', 'Linda Work');
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      '+971505760056',
      expect.stringContaining('Device Added to Closed Circle Master List!'),
      mockPrimaryClient,
      msg
    );
  });

  it('allows adding with "add master <phone>" format', async () => {
    const msg = {
      body: 'add master +971553633595 BigBroker',
      from: '971559156636@c.us',
    };

    const handled = await handleMasterAddDeviceRequest({
      msg,
      senderPhone: '+971559156636',
      accountConfig: { phoneNumber: '+971559156636', role: 'master' },
      acm: mockAcm,
      primaryClient: mockPrimaryClient,
      sendWhatsAppMessage,
      logBot,
    });

    expect(handled).toBe(true);
    expect(mockAcm.addMasterAccount).toHaveBeenCalledWith('+971553633595', 'BigBroker');
  });

  it('returns false if sender is not an authorized master', async () => {
    const msg = {
      body: 'add device +971505110636',
      from: '971509999999@c.us',
    };

    const handled = await handleMasterAddDeviceRequest({
      msg,
      senderPhone: '+971509999999',
      accountConfig: null,
      acm: mockAcm,
      primaryClient: mockPrimaryClient,
      sendWhatsAppMessage,
      logBot,
    });

    expect(handled).toBe(false);
    expect(mockAcm.addMasterAccount).not.toHaveBeenCalled();
  });

  it('returns false if no other phone number is mentioned in the message', async () => {
    const msg = {
      body: 'add my device',
      from: '971505760056@c.us',
    };

    const handled = await handleMasterAddDeviceRequest({
      msg,
      senderPhone: '+971505760056',
      accountConfig: { phoneNumber: '+971505760056', role: 'primary' },
      acm: mockAcm,
      primaryClient: mockPrimaryClient,
      sendWhatsAppMessage,
      logBot,
    });

    expect(handled).toBe(false);
    expect(mockAcm.addMasterAccount).not.toHaveBeenCalled();
  });
});
