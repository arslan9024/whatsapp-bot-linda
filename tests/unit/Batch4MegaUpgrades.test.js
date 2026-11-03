import { MultiModelLLMGateway } from '../../src/intelligence/MultiModelLLMGateway.js';
import { WhisperVoicePreProcessor } from '../../src/intelligence/WhisperVoicePreProcessor.js';
import { ArabicKhaleejiDialectClassifier } from '../../src/intelligence/ArabicKhaleejiDialectClassifier.js';
import { RealEstateObjectionMatrix } from '../../src/intelligence/RealEstateObjectionMatrix.js';
import { SentimentProgressionTracker } from '../../src/intelligence/SentimentProgressionTracker.js';
import { FloorPlanPDFLayoutExtractor } from '../../src/intelligence/FloorPlanPDFLayoutExtractor.js';
import { ChatIntentClassifier } from '../../src/intelligence/ChatIntentClassifier.js';
import { LongTermRecallMemory } from '../../src/intelligence/LongTermRecallMemory.js';
import { PromptSafetyGuardrail } from '../../src/intelligence/PromptSafetyGuardrail.js';
import { AudioVoiceSynthesizerFormatter } from '../../src/intelligence/AudioVoiceSynthesizerFormatter.js';
import { PropertyImageQualityScorer } from '../../src/intelligence/PropertyImageQualityScorer.js';
import { DialogueTreeBranchTracker } from '../../src/intelligence/DialogueTreeBranchTracker.js';
import { EmergencyDistressToneEscalator } from '../../src/intelligence/EmergencyDistressToneEscalator.js';
import { RealEstateNERExtractor } from '../../src/intelligence/RealEstateNERExtractor.js';
import { ExecutiveConversationCondenser } from '../../src/intelligence/ExecutiveConversationCondenser.js';

describe('Mega Batch 4 Upgrades 36–50 (AI NLP, Vision & Real Estate Intelligence)', () => {
  it('Upgrade 36: MultiModelLLMGateway manages model failover', () => {
    const gateway = new MultiModelLLMGateway({ defaultProvider: 'GEMINI', maxRetries: 2 });
    expect(gateway.selectProvider()).toBe('GEMINI');
    gateway.recordFailure('GEMINI');
    gateway.recordFailure('GEMINI');
    expect(gateway.selectProvider()).toBe('CLAUDE');
  });

  it('Upgrade 37: WhisperVoicePreProcessor validates and prepares audio payload', () => {
    const pre = new WhisperVoicePreProcessor();
    const buf = Buffer.from('simulated opus audio stream');
    const payload = pre.formatTranscriptionPayload(buf, 'ar');
    expect(payload.model).toBe('whisper-1');
    expect(payload.language).toBe('ar');
  });

  it('Upgrade 38: ArabicKhaleejiDialectClassifier recognizes regional markers', () => {
    const classifier = new ArabicKhaleejiDialectClassifier();
    expect(classifier.detectDialect('هلا والله يا خوي كم سيم').dialect).toBe('KHALEEJI');
    expect(classifier.detectDialect('شو في حبيب بدي اسأل').dialect).toBe('LEVANTINE');
  });

  it('Upgrade 39: RealEstateObjectionMatrix provides tactical counter-strategies', () => {
    const matrix = new RealEstateObjectionMatrix();
    const result = matrix.classifyObjection('This villa is too expensive for our budget');
    expect(result.objectionType).toBe('PRICE_TOO_HIGH');
    expect(result.strategy).toBe('HIGHLIGHT_ROI_AND_PAYMENT_PLAN');
  });

  it('Upgrade 40: SentimentProgressionTracker evaluates sentiment drift', () => {
    const tracker = new SentimentProgressionTracker();
    tracker.recordScore('chat_1', -0.5);
    tracker.recordScore('chat_1', 0.1);
    const traj = tracker.recordScore('chat_1', 0.8);
    expect(traj.trajectory).toBe('IMPROVING');
    expect(traj.count).toBe(3);
  });

  it('Upgrade 41: FloorPlanPDFLayoutExtractor parses bedrooms and BUA', () => {
    const extractor = new FloorPlanPDFLayoutExtractor();
    const facts = extractor.extractLayoutFacts('Luxury 4 Bedroom Villa with 3,450 sq.ft and maid room');
    expect(facts.bedrooms).toBe(4);
    expect(facts.buaSqft).toBe(3450);
    expect(facts.unitType).toBe('VILLA');
    expect(facts.hasMaidRoom).toBe(true);
  });

  it('Upgrade 42: ChatIntentClassifier categorizes into 8 core real estate intents', () => {
    const classifier = new ChatIntentClassifier();
    expect(classifier.classify('Can I book a viewing tomorrow at 4pm?').intent).toBe('VIEWING_REQUEST');
    expect(classifier.classify('Please send the brochure and floor plan').intent).toBe('BROCHURE_REQUEST');
    expect(classifier.classify('I want to sell my apartment in Marina').intent).toBe('SELL_INQUIRY');
  });

  it('Upgrade 43: LongTermRecallMemory recalls multi-week client context', () => {
    const memory = new LongTermRecallMemory();
    memory.updateLeadProfile('lead_10', { preferredAreas: ['JVC', 'Dubai Hills'], budgetMaxAed: 2500000 });
    const snippet = memory.generateContextPromptSnippet('lead_10');
    expect(snippet).toContain('JVC, Dubai Hills');
    expect(snippet).toContain('2,500,000 AED');
  });

  it('Upgrade 44: PromptSafetyGuardrail blocks hallucinated financial guarantees', () => {
    const guard = new PromptSafetyGuardrail();
    const bad = guard.validateOutgoingResponse('We offer guaranteed 100% capital return every year!');
    expect(bad.safe).toBe(false);
    expect(bad.reason).toBe('PROHIBITED_FINANCIAL_PROMISE');

    const good = guard.validateOutgoingResponse('Historical rental yields in JVC are approximately 8% net.');
    expect(good.safe).toBe(true);
  });

  it('Upgrade 45: AudioVoiceSynthesizerFormatter structures natural TTS payload', () => {
    const tts = new AudioVoiceSynthesizerFormatter();
    const payload = tts.formatTtsPayload('Good morning! The new off-plan launch is ready.');
    expect(payload.model).toBe('tts-1-hd');
    expect(payload.input).toContain('...');
  });

  it('Upgrade 46: PropertyImageQualityScorer ranks high-resolution landscape images', () => {
    const scorer = new PropertyImageQualityScorer();
    const res = scorer.scoreImageMeta({ width: 1920, height: 1080, sizeBytes: 850000 });
    expect(res.score).toBeGreaterThan(70);
    expect(res.isHighRes).toBe(true);
  });

  it('Upgrade 47: DialogueTreeBranchTracker maintains qualification funnel progress', () => {
    const tree = new DialogueTreeBranchTracker();
    tree.advanceStep('lead_tree', 'INTENT_CONFIRMED', { intent: 'BUY' });
    const status = tree.advanceStep('lead_tree', 'COMMUNITY_SELECTED', { community: 'Damac Hills 2' });
    expect(status.currentStepIndex).toBe(2);
    expect(status.collectedFacts.community).toBe('Damac Hills 2');
  });

  it('Upgrade 48: EmergencyDistressToneEscalator detects legal escalation risks', () => {
    const escalator = new EmergencyDistressToneEscalator();
    const alert = escalator.evaluateTone('I will file a police complaint and contact my lawyer regarding this harassment');
    expect(alert.shouldSilenceBot).toBe(true);
    expect(alert.urgency).toBe('CRITICAL');
    expect(alert.actionRequired).toBe('HUMAN_BROKER_TAKEOVER_IMMEDIATELY');
  });

  it('Upgrade 49: RealEstateNERExtractor extracts budgets, currencies, and ROI', () => {
    const ner = new RealEstateNERExtractor();
    const parsed = ner.extractEntities('Looking for 2.5M AED villa ready by 2026 targeting 9% ROI');
    expect(parsed.budgetAed).toBe(2500000);
    expect(parsed.handoverYear).toBe(2026);
    expect(parsed.expectedRoiPercent).toBe(9);
    expect(parsed.currency).toBe('AED');
  });

  it('Upgrade 50: ExecutiveConversationCondenser produces 3-bullet CRM summary', () => {
    const condenser = new ExecutiveConversationCondenser();
    const res = condenser.condenseChat([
      { fromMe: false, body: 'Hi I want to buy a 3 bed townhouse in Palm Jumeirah' },
      { fromMe: true, body: 'Hello! Certainly, here are the latest villas available.' },
    ]);
    expect(res.bullets.length).toBe(3);
    expect(res.summary).toContain('Engagement: 2 total messages');
  });
});

