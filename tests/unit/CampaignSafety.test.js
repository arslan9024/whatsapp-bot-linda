import CommunicationService from '../../src/database/services/CommunicationService.js';
import CampaignRateLimiter from '../../src/campaigns/CampaignRateLimiter.js';

describe('campaign send safety', () => {
  it('opens the account circuit breaker after repeated failures', async () => {
    const rateLimiter = new CampaignRateLimiter();
    for (let attempt = 0; attempt < rateLimiter.failureThreshold; attempt += 1) {
      rateLimiter.recordOutcome('971500000000', false);
    }

    const result = await rateLimiter.canSendMessage('campaign-1', '971500000000');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/circuit breaker is open/);
  });

  it('does not claim queued messages without a sender', async () => {
    const result = await CommunicationService.processQueue(null);

    expect(result).toEqual({
      success: false,
      error: 'A send function is required to process queued messages.',
    });
  });
});
