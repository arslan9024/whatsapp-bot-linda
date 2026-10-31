import { GoogleSheetsSyncManager } from '../../src/integrations/GoogleSheetsSyncManager.js';

describe('GoogleSheetsSyncManager (Pillar 3 - Bi-Directional CRM Sync)', () => {
  it('queues updates and writes batch to sheetSource', async () => {
    const mockSheetSource = {
      writeStatusBatch: jest.fn().mockResolvedValue({ updatedRows: 2 }),
    };

    const manager = new GoogleSheetsSyncManager({
      sheetSource: mockSheetSource,
      debounceMs: 50,
    });

    await manager.queueLeadUpdate({
      phone: '+971501234567',
      status: 'HOT',
      tier: 'HOT',
      notes: 'Wants cash offer for Victoria villa',
      community: 'Damac Hills 2',
    });

    await manager.queueLeadUpdate({
      phone: '+971509998888',
      status: 'INVESTOR',
      tier: 'INVESTOR',
      notes: 'ROI inquiry for Maple townhouse',
      community: 'Dubai Hills Estate',
    });

    const res = await manager.flushQueue();

    expect(res.success).toBe(true);
    expect(res.syncedCount).toBe(2);
    expect(mockSheetSource.writeStatusBatch).toHaveBeenCalledTimes(1);

    const batchArg = mockSheetSource.writeStatusBatch.mock.calls[0][0];
    expect(batchArg.length).toBe(2);
    expect(batchArg[0].phone).toBe('+971501234567');
    expect(batchArg[0].status).toBe('HOT');
    expect(batchArg[1].community).toBe('Dubai Hills Estate');
  });

  it('handles empty queue and missing phone safely', async () => {
    const manager = new GoogleSheetsSyncManager({ debounceMs: 10 });

    const invalid = await manager.queueLeadUpdate({ status: 'CONTACTED' });
    expect(invalid.queued).toBe(false);

    const emptyFlush = await manager.flushQueue();
    expect(emptyFlush.syncedCount).toBe(0);
  });

  it('re-queues failed batches to prevent data loss on API errors', async () => {
    const mockSheetSource = {
      writeStatusBatch: jest.fn().mockRejectedValue(new Error('Quota exceeded')),
    };

    const manager = new GoogleSheetsSyncManager({
      sheetSource: mockSheetSource,
      debounceMs: 50,
    });

    await manager.queueLeadUpdate({
      phone: '+971501112222',
      status: 'CONTACTED',
    });

    const res = await manager.flushQueue();
    expect(res.success).toBe(false);
    expect(manager.syncQueue.length).toBe(1); // Safely retained
  });
});

