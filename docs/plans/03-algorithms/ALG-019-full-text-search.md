# ALG-019 — Full-text search

| | |
|---|---|
| Solves | [PS-019](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-019](../04-flowcharts/FC-019-full-text-search.md) |
| Requirements | FR-031, NFR-001 |
| Module | M-09 new `src/intelligence/SearchIndex.js`, local storage in `data/` |
| User trigger | Planned menu code `8.13 search <words>` |
| Status | Planned |

## Problem
Find the messages that contain all of the query words, across every chat, in
under 1 s for 1 M messages. Rank them by relevance and recency. The index
stays local and is updated as messages arrive.

## Input
- A query `q` (words, an optional `chat:` filter, an optional `from:` filter),
  and an index `I`: term → sorted posting list of message ids.

## Output
- The top 20 hits `(chat, time, snippet)`, ranked.

## Invariants
- I1. Every indexed message is findable by each of its normalized terms.
- I2. Posting lists stay sorted by id, so an intersection is a linear merge.
- I3. The index never stores more than the local message store holds, and
  deleting a chat removes its postings.

## Algorithm
```text
INDEX(message m):
1. terms ← tokenize(m.body): lowercase, strip diacritics, split on non-letters,
   Arabic normalization (alef/ya/ta-marbuta unified), drop stop-words
2. for each distinct term t: append m.id to postings[t]; tf[t,m] ← count
3. flush segments to disk every 1 000 messages (append-only, merged in background)

QUERY(q):
1. T ← terms(q) sorted by posting length ascending          # rarest first
2. R ← postings[T₁]; for t in T₂…: R ← intersect(R, postings[t])   # galloping merge
3. score(m) = Σ BM25(t, m) × recencyBoost(m)                # k1 = 1.2, b = 0.75
4. top-20 by min-heap; build snippets around the first match
```

## Complexity
- Index: O(|m|) per message.
- Query: O(Σ |postings|) in the worst case. With rarest-first galloping it is
  O(|P₁| · log(|Pᵢ|/|P₁|)).
- Space: O(total terms).

## Edge cases
1. A query with only stop-words: return "query too general".
2. Mixed Arabic and English text: each word goes through its own script's
   normalizer.
3. A message is edited or deleted: tombstone the id and drop it at the next
   segment merge.

## Current implementation
None yet. The messages come from `fetchMessages` (ALG-009) and live
`message` events.

## Verification
- Unit: AND semantics, Arabic normalization, BM25 ordering on a tiny corpus.
- Bench: 1 M synthetic messages, p95 query time < 1 s.
