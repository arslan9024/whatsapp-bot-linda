import { PropertyBrochureDispatcher, COMMUNITY_DOCS } from '../../src/intelligence/PropertyBrochureDispatcher.js';

describe('PropertyBrochureDispatcher (Pillar 1 - Floorplan & Spec Dispatcher)', () => {
  it('correctly detects brochure and layout inquiry keywords in English and Arabic', () => {
    const dispatcher = new PropertyBrochureDispatcher();

    expect(dispatcher.isBrochureRequest('Can you send me the floorplan for the 3-bed townhouse?')).toBe(true);
    expect(dispatcher.isBrochureRequest('Please send the official brochure PDF')).toBe(true);
    expect(dispatcher.isBrochureRequest('ممكن تبعت المخطط والبروشور')).toBe(true);
    expect(dispatcher.isBrochureRequest('What is the weather today?')).toBe(false);
  });

  it('resolves correct community brochure metadata', () => {
    const dispatcher = new PropertyBrochureDispatcher();

    const dhe = dispatcher.resolveBrochure('Maple villas in Dubai Hills');
    expect(dhe.community).toBe('Dubai Hills Estate');
    expect(dhe.fileName).toBe('Dubai_Hills_Estate_Masterplan.pdf');

    const palm = dispatcher.resolveBrochure('Palm Jumeirah luxury waterfront');
    expect(palm.community).toBe('Palm Jumeirah');

    const dh2 = dispatcher.resolveBrochure('Amazon cluster in Damac 2');
    expect(dh2.community).toBe('Damac Hills 2');
  });

  it('dispatches brochure message cleanly via WhatsApp client', async () => {
    const mockClient = {
      sendMessage: jest.fn().mockResolvedValue({ id: 'doc_msg_999' }),
    };

    const dispatcher = new PropertyBrochureDispatcher();
    const res = await dispatcher.dispatchBrochure(mockClient, '971501234567@c.us', 'damac_hills_2', { dryRun: true });

    expect(res.sent).toBe(true);
    expect(res.brochure.community).toBe('Damac Hills 2');
    expect(mockClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      '971501234567@c.us',
      expect.stringContaining('Damac Hills 2'),
      expect.any(Object)
    );
  });
});

