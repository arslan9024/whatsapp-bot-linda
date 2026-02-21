# 🚀 PHASE 2: Polls & Media Expansion - KICKOFF

**Status**: READY TO START  
**Estimated Duration**: 11 hours (2 developers, 1 week)  
**Dependencies**: ✅ Phase 1 COMPLETE  

---

## 📊 Phase 2 Overview

Phase 2 focuses on **expanding feature support** by adding:
1. **Poll Support** - Create, vote, track poll responses
2. **Media Handling** - Download, cache, process images/videos/documents
3. **E2E Testing** - Validate all features work in production

### Strategic Importance
- Polls extend engagement (conversational marketing)
- Media handling enables document sharing (real estate documents, floor plans)
- Combined features capture 95% of WhatsApp use cases

---

## 📅 Phase 2 Timeline

### Week 1: Feature Implementation (11 hours)

| Task | Duration | Owner | Dependencies |
|------|----------|-------|--------------|
| Poll Handler Architecture | 1 hour | Dev A | Phase 1 ✅ |
| Poll Handler Implementation | 2 hours | Dev A | Architecture |
| Media Handler Architecture | 1 hour | Dev B | Phase 1 ✅ |
| Media Handler Implementation | 3 hours | Dev B | Architecture |
| Integration & Binding | 2 hours | Team | Both handlers |
| E2E Testing & Validation | 2 hours | Team | Integration |

**Target Completion**: End of Week 2 (Day 5)

---

## 🎯 Feature 1: Poll Support

### Why Polls Matter
- **Use Case**: Real estate agents asking buyers preferences (property type, price range, location)
- **ROI**: 40% higher engagement vs simple questions
- **Data**: Structured responses enable AI analysis
- **Linda Integration**: Auto-analyze poll results and suggest follow-up actions

### Implementation Plan

#### 1.1 Poll Handler Architecture

**File**: `PollHandler.js` (NEW)

**API Contract**:
```javascript
class PollHandler {
  // Initialize with client
  static initialize(client) { }
  
  // Parse incoming poll vote
  static async onPollVote(message) {
    // Returns: { pollId, pollQuestion, selectedOption, voter, timestamp }
  }
  
  // Helper: Extract poll metadata
  static extractPollMetadata(message) {
    // Returns: { pollId, question, options, multiSelect }
  }
  
  // Helper: Track poll statistics
  static updatePollStats(pollId, selectedOption) { }
}
```

**Responsibilities**:
- Listen for WhatsApp poll vote events
- Extract poll metadata and vote data
- Track aggregated statistics
- Calculate sentiment/preference trends

**Error Handling**:
- Invalid poll format → log, skip
- Missing metadata → retry with backup extraction
- Database down → use PollMemoryStore

#### 1.2 Poll Memory Store

**File**: `PollMemoryStore.js` (NEW)

**API**:
```javascript
// Store poll
PollMemoryStore.addPoll({
  pollId: 'unique-id',
  question: 'What property type?',
  options: ['Apartment', 'Villa', 'Townhouse'],
  creator: '+971505760056',
  timestamp: Date
});

// Record vote
PollMemoryStore.recordVote({
  pollId: 'unique-id',
  voter: '+971505760055',
  selectedOption: 'Villa'
});

// Get poll statistics
const stats = PollMemoryStore.getPollStats(pollId);
// Returns: { question, options, votePercentages, totalVotes, trends }

// List all active polls
const polls = PollMemoryStore.getAllPolls();
```

**Storage Schema**:
```
Polls in Memory:
{
  pollId: string,
  question: string,
  options: string[],
  creator: string,
  timestamp: Date,
  votes: [
    { voter: string, option: string, timestamp: Date },
    ...
  ]
}
```

**Performance**:
- O(1) poll creation
- O(1) vote recording
- O(n) statistics calculation (n = number of options, typically 2-4)
- Memory: ~2 KB per poll, ~100 bytes per vote

#### 1.3 Poll Integration Steps

1. **Step 1**: Create `PollHandler.js`
   - Copy structure from `ReactionHandler.js`
   - Implement poll-specific logic
   - Add error handling

2. **Step 2**: Create `PollMemoryStore.js`
   - Copy structure from `ReactionMemoryStore.js`
   - Add poll statistics calculations
   - Add vote aggregation

3. **Step 3**: Bind in `index.js`
   ```javascript
   // In setupMessageListeners()
   client.on('message', async (msg) => {
     if (msg.hasMedia && msg.type === 'poll_response') {
       await PollHandler.onPollVote(msg);
     }
   });
   ```

4. **Step 4**: Test
   - Create test poll in WhatsApp
   - Vote from multiple accounts
   - Verify statistics display

**Estimated Time**: 3 hours

---

## 🎯 Feature 2: Media Handling

### Why Media Matters
- **Use Case**: Agents sharing property photos, floor plans, legal documents
- **ROI**: Visual content increases conversion 2x
- **DataFlow**: Media → Download → Cache → AI Analysis
- **Linda Integration**: Auto-analyze floor plans, extract property details

### Implementation Plan

#### 2.1 Media Handler Architecture

**File**: `MediaHandler.js` (NEW)

**API Contract**:
```javascript
class MediaHandler {
  // Initialize with client
  static initialize(client) { }
  
  // Process incoming media message
  static async onMediaMessage(message) {
    // Returns: { mediaId, type, size, fileName, cached: true/false }
  }
  
  // Download media to cache
  static async downloadMedia(message) {
    // Returns: { path, size, type, cacheHit }
  }
  
  // Helper: Check cache
  static checkMediaCache(mediaId) { }
  
  // Helper: Clear old cache
  static pruneCache(maxAge = 7200000) { } // 2 hours default
}
```

**Responsibilities**:
- Listen for WhatsApp media messages (image, video, document)
- Download media to disk cache
- Return cache path for processing
- Track media statistics
- Auto-cleanup old cache files

**Media Types Supported**:
- 📷 Images (JPG, PNG, WebP)
- 🎬 Videos (MP4, WebM)
- 📄 Documents (PDF, DOCX, XLSX)
- 🔊 Audio (MP3, OGA)

**Error Handling**:
- Download failure → retry 2x, then skip
- Corrupted file → remove from cache, log
- Disk space low → aggressive cleanup
- Timeout (>30s) → cancel, skip

#### 2.2 Media Cache Management

**File**: `MediaCacheManager.js` (NEW)

**API**:
```javascript
// Cache configuration
MediaCacheManager.configure({
  cachePath: './media_cache',
  maxSize: 500 * 1024 * 1024, // 500 MB
  maxAge: 7200000, // 2 hours
  cleanupInterval: 300000 // 5 minutes
});

// Download and cache
const cached = await MediaCacheManager.cacheMedia({
  mediaId: 'msg_id',
  downloadUrl: 'whatsapp-media-url',
  fileName: 'floor-plan.pdf',
  type: 'document'
});
// Returns: { path, size, type, created }

// Get cached file
const file = MediaCacheManager.getFile(mediaId);

// Manual cleanup
MediaCacheManager.cleanup();
```

**Storage Schema**:
```
Cache Directory Structure:
media_cache/
├── images/
│   └── 2025-01-26/
│       ├── media_123_abc.jpg
│       └── media_124_def.png
├── videos/
│   └── 2025-01-26/
│       └── media_125_ghi.mp4
└── documents/
    └── 2025-01-26/
        └── media_126_jkl.pdf

Metadata (in-memory):
{
  mediaId: string,
  fileName: string,
  type: 'image' | 'video' | 'document' | 'audio',
  path: string,
  size: number,
  created: timestamp,
  accessed: timestamp
}
```

**Performance**:
- Download: 1-30s depending on file size
- Cache hit: <100ms
- Cleanup: Async, non-blocking
- Disk space: Configurable, auto-cleanup

#### 2.3 Media Integration Steps

1. **Step 1**: Create `MediaHandler.js`
   - Copy structure from `ReactionHandler.js`
   - Implement media-specific logic
   - Add progress tracking

2. **Step 2**: Create `MediaCacheManager.js`
   - Implement caching layer
   - Add disk space management
   - Add cleanup scheduler

3. **Step 3**: Bind in `index.js`
   ```javascript
   // In setupMessageListeners()
   client.on('message_media', async (msg) => {
     await MediaHandler.onMediaMessage(msg);
   });
   
   // Or via message type check
   client.on('message', async (msg) => {
     if (msg.hasMedia) {
       await MediaHandler.onMediaMessage(msg);
     }
   });
   ```

4. **Step 4**: Test
   - Send image, video, document via WhatsApp
   - Verify cache directory creation
   - Verify files downloaded and cached
   - Test cache cleanup after 2 hours

**Estimated Time**: 4 hours

---

## 🧪 Phase 2: E2E Testing

### Test Scenario 1: Reactions (Phase 1 Validation)
```javascript
// Setup
const chat = await client.getChatById('id@g.us');

// Action: Send message
const msg = await chat.sendMessage('How do you like this property?');

// Trigger: React with emoji
await msg.react('👍');
await msg.react('❤️');
await msg.react('🤔');

// Validate: ReactionMemoryStore captures reactions
const reactions = ReactionMemoryStore.getReactionsForMessage(msg.id.id);
assert(reactions.length === 3);
assert(reactions[0].emoji === '👍');
```

### Test Scenario 2: Group Events (Phase 1 Validation)
```javascript
// Setup
const group = await client.getChatById('id@g.us');

// Action: Add member
await group.addParticipants(['+971505760055']);

// Validate: GroupEventHandler logs join event
// (Check console for "[ReactionHandler] ✅ User joined group")

// Action: Remove member
await group.removeParticipants(['+971505760055']);

// Validate: GroupEventHandler logs leave event
```

### Test Scenario 3: Polls (Phase 2 New)
```javascript
// Setup
const contact = await client.getContactById('+971505760055');
const chat = contact.getChat();

// Action: Create poll
const poll = {
  question: 'What property type?',
  options: ['Apartment', 'Villa', 'Townhouse']
};
await chat.sendMessage(poll);

// Wait for votes
await new Promise(resolve => setTimeout(resolve, 5000));

// Validate: PollMemoryStore captured votes
const stats = PollMemoryStore.getPollStats(pollId);
assert(stats.totalVotes > 0);
```

### Test Scenario 4: Media (Phase 2 New)
```javascript
// Setup
const chat = await client.getChatById('id@g.us');

// Action: Send image
const media = await MessageMedia.fromUrl(
  'https://example.com/floor-plan.jpg',
  { mimetype: 'image/jpeg' }
);
await chat.sendMessage(media, {
  caption: 'Floor plan for Villa #123'
});

// Validate: MediaCacheManager cached file
const cached = MediaCacheManager.getFile(mediaId);
assert(cached.path.includes('media_cache'));
assert(fs.existsSync(cached.path));
```

### Test Scenario 5: Integration
```javascript
// Full flow: Property inquiry with media + reactions + poll

// 1. Buyer asks about property
await buyer.sendMessage('Interested in villa');

// 2. Agent sends photos + floor plan
await agent.sendMedia(propertyPhotos);

// 3. Buyer reacts (👍👍❤️) and votes on preferences
await buyer.react('👍');
await buyer.react('❤️');
await buyer.sendPollVote(preferencePoll, 'Villa');

// 4. Linda analyzes engagement
// - Reactions sentiment: Positive (2x👍 + 1x❤️)
// - Poll preference: Villa
// - Media received: 5 images, 1 floor plan
// - Action: "Buyer very interested in villa units, follow up with price quotes"

// 5. Verify all tracked
assert(ReactionMemoryStore.getReactionsForMessage(...).length === 3);
assert(PollMemoryStore.getPollStats(...).votePercentages['Villa'] > 0);
assert(MediaCacheManager.getFile(...).path);
```

**Estimated Time**: 2 hours

---

## 🛠️ Implementation Checklist

### Feature 1: Polls (3 hours)
- [ ] Create PollHandler.js
  - [ ] `initialize(client)` method
  - [ ] `onPollVote(message)` method
  - [ ] `extractPollMetadata(message)` helper
  - [ ] Error handling with try-catch
  - [ ] Test with static sample data

- [ ] Create PollMemoryStore.js
  - [ ] `addPoll` method
  - [ ] `recordVote` method
  - [ ] `getPollStats` method
  - [ ] `getAllPolls` method
  - [ ] Statistics calculation algorithm
  - [ ] Unit tests

- [ ] Integrate in index.js
  - [ ] Replace/update `setupMessageListeners()`
  - [ ] Bind poll event listeners
  - [ ] Add logging statements
  - [ ] Test bot startup

- [ ] Validation
  - [ ] Create test poll in WhatsApp
  - [ ] Send votes from multiple accounts
  - [ ] Verify in-memory storage
  - [ ] Check console logs
  - [ ] Document issues

### Feature 2: Media (4 hours)
- [ ] Create MediaHandler.js
  - [ ] `initialize(client)` method
  - [ ] `onMediaMessage(message)` method
  - [ ] `downloadMedia(message)` method
  - [ ] Media type detection
  - [ ] Error handling with retry logic
  - [ ] Test with static sample data

- [ ] Create MediaCacheManager.js
  - [ ] `configure(options)` method
  - [ ] `cacheMedia(options)` method
  - [ ] `getFile(mediaId)` method
  - [ ] Disk space management
  - [ ] Auto-cleanup scheduler
  - [ ] Unit tests

- [ ] Integrate in index.js
  - [ ] Update `setupMessageListeners()`
  - [ ] Bind media event listeners
  - [ ] Add progress logging
  - [ ] Test bot startup

- [ ] Validation
  - [ ] Send image via WhatsApp
  - [ ] Verify cache directory created
  - [ ] Check file downloaded correctly
  - [ ] Test with video and document
  - [ ] Verify cleanup works
  - [ ] Document storage usage

### E2E Testing (2 hours)
- [ ] Test Reactions from Phase 1
  - [ ] Send message in group
  - [ ] Add multiple reactions
  - [ ] Verify ReactionMemoryStore
  - [ ] Check console logging

- [ ] Test Polls from Phase 2
  - [ ] Create poll manually
  - [ ] Cast votes from multiple accounts
  - [ ] Verify PollMemoryStore
  - [ ] Check statistics display

- [ ] Test Media from Phase 2
  - [ ] Send image, video, document
  - [ ] Verify cache directory
  - [ ] Check file persistence
  - [ ] Test cache cleanup

- [ ] Integration Test
  - [ ] Full user flow (property inquiry → media → reactions → poll)
  - [ ] All features working together
  - [ ] No conflicts or data loss
  - [ ] Performance acceptable

- [ ] Documentation
  - [ ] Document all findings
  - [ ] Create PHASE_2_COMPLETION_DASHBOARD.md
  - [ ] Prepare Phase 3 kickoff

---

## 📊 Phase 2 Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| M1: Poll Handler Complete | Jan 27 | ⏳ Pending |
| M2: Media Handler Complete | Jan 28 | ⏳ Pending |
| M3: E2E Testing Complete | Jan 29 | ⏳ Pending |
| M4: Documentation Complete | Jan 29 | ⏳ Pending |
| M5: Production Deployment | Jan 30 | ⏳ Pending |

---

## 🚨 Known Issues & Mitigations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Poll API not in whatsapp-web.js | HIGH | Use message type detection + custom polling |
| Large media files (>100 MB) | MEDIUM | Implement chunked download + streaming |
| Cache disk space limited | LOW | Auto-cleanup old files, monitor disk |
| Concurrent media downloads | LOW | Implement queue + throttling |

---

## 💡 Phase 2 Success Criteria

✅ **All Features Implemented**:
- Polls: Creating, voting, statistics tracking
- Media: Downloads, caching, cleanup
- Integration: All features work together

✅ **All Tests Passing**:
- Unit tests: 100% on new code paths
- E2E tests: All scenarios verified
- Performance tests: <2s for typical operations

✅ **Zero Breaking Changes**:
- All Phase 1 features still working
- Backward compatible with existing commands
- No database migrations needed

✅ **Ready for Production**:
- Code reviewed and approved
- Documentation complete
- Team trained and confident

---

## 📞 Phase 2 Team

| Role | Owner | Responsibilities |
|------|-------|------------------|
| Poll Implementation | Developer A | PollHandler + PollMemoryStore + Testing |
| Media Implementation | Developer B | MediaHandler + MediaCacheManager + Testing |
| Integration Lead | Tech Lead | Coordinate, review, escalate issues |
| QA | Team | E2E testing, documentation, sign-off |

---

## 🎓 Resources for Team

1. **Phase 1 Reference**: PHASE_1_EVENT_HANDLERS_COMPLETE.md
2. **Architecture Master Plan**: ENTERPRISE_ARCHITECTURE_MASTER_PLAN.md
3. **Quick Start**: QUICK_START_ACTION_DASHBOARD.md
4. **Code Examples**: 
   - ReactionHandler.js (event processing pattern)
   - ReactionMemoryStore.js (in-memory storage pattern)
   - ReactionTracker.js (database fallback pattern)

---

**Prepared by**: AI Assistant  
**Date**: January 26, 2025  
**Status**: ✅ READY TO START PHASE 2

Next: Execute tasks, track progress, update daily with dashboard.
