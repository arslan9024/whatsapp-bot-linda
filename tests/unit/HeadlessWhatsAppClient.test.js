import whatsapp from 'whatsapp-web.js';
import { CreatingNewWhatsAppClient } from '../../src/whatsapp/CreatingNewWhatsAppClient.js';
import { SESSIONS_DIR, WEB_CACHE_DIR } from '../../src/sessions/SessionManager.js';

jest.mock('../../src/sessions/SessionManager.js', () => ({
  SESSIONS_DIR: 'C:\\project\\sessions',
  WEB_CACHE_DIR: 'C:\\project\\.wwebjs_cache',
}));

jest.mock('whatsapp-web.js', () => ({
  __esModule: true,
  default: {
    Client: jest.fn().mockImplementation(options =>
      Object.assign(new (jest.requireActual('node:events').EventEmitter)(), {
        options,
        initialize: jest.fn(),
      }),
    ),
    LocalAuth: jest.fn().mockImplementation(options => options),
  },
}));

describe('Existing local headless Chromium configuration', () => {
  let executable;

  beforeEach(() => {
    executable = process.env.PUPPETEER_EXECUTABLE_PATH;
    process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\Chromium\\chrome.exe';
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (executable === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
    else process.env.PUPPETEER_EXECUTABLE_PATH = executable;
  });

  test('keeps Chromium headless and reuses LocalAuth without a visible page or remote browser service', async () => {
    const client = await CreatingNewWhatsAppClient('+15550000001');
    expect(whatsapp.LocalAuth).toHaveBeenCalledWith({
      clientId: '15550000001',
      dataPath: SESSIONS_DIR,
    });
    expect(client.options.puppeteer).toMatchObject({
      headless: 'new',
      executablePath: 'C:\\Chromium\\chrome.exe',
    });
    expect(client.options.puppeteer.browserWSEndpoint).toBeUndefined();
    expect(client.options.webVersionCache.path).toBe(WEB_CACHE_DIR);
    expect(client.initialize).not.toHaveBeenCalled();
    expect(whatsapp.Client).toHaveBeenCalledTimes(1);
  });
});
