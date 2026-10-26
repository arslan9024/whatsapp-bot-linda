import { createGracefulShutdown } from '../../src/core/GracefulShutdown.js';
import services from '../../src/core/ServiceRegistry.js';

test('shutdown resolves late-initialized session manager and preserves profile metadata using real persistence API', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(process, 'exit').mockImplementation(() => {});
  const phone = '+15550000001';
  const metadata = { clientId: 'original-master', status: 'linked', deviceLinked: true };
  let currentManager = null;
  const saveDeviceMetadata = jest.fn().mockResolvedValue(true);
  const destroy = jest.fn();
  const managedClient = { removeAllListeners: jest.fn(), destroy: jest.fn() };
  const managedDestroy = jest.fn(async () => { await managedClient.destroy(); });
  const closeDb = jest.fn();
  services.register('databaseContext', { close: closeDb });
  const shutdown = createGracefulShutdown({
    logBot: jest.fn(),
    getSessionStateManager: () => currentManager,
    accountHealthMonitor: null,
    connectionManagers: new Map([['+15550000002', { client: managedClient, destroy: managedDestroy }]]),
    accountClients: new Map([[phone, { removeAllListeners: jest.fn(), destroy }], ['+15550000002', managedClient]]),
    allInitializedAccounts: [],
    clearAccounts: jest.fn(),
  });
  currentManager = { state: { accounts: { [phone]: metadata } }, saveDeviceMetadata };
  try {
    await shutdown('TEST');
    expect(saveDeviceMetadata).toHaveBeenCalledWith(phone, {
      clientId: 'original-master', status: 'offline', deviceLinked: true, isActive: false,
    });
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(managedDestroy).toHaveBeenCalledTimes(1);
    expect(managedClient.destroy).toHaveBeenCalledTimes(1);
    expect(closeDb).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  } finally {
    services.clear();
  }
});
