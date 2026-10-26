# ALG-011 — Contact deduplication

| | |
|---|---|
| Solves | [PS-011](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-011](../04-flowcharts/FC-011-contact-dedup.md) |
| Requirements | FR-019, FR-020 |
| Module | M-11 `src/services/DeduplicationService.js` |
| User trigger | `3.2 goraha verify`, `3.4 goraha filter`, `8.7 dedupe`, `8.6 similar`, playbook `P9` |
| Status | Partial (exact plus fuzzy matching exist; all-pairs comparison is O(n²)) |

## Problem
Group contact records that refer to the same person, and give an
explainable reason for each merge. The work must stay near-linear for tens of
thousands of rows. Two different people must never be merged on a name
similarity alone.

## Input
- Records `r₁…r_n` with `phone`, `name`, `email`, `source`.
- Thresholds: `θ_merge` = 0.85, `θ_review` = 0.60.

## Output
- Clusters with a reason per edge. Each cluster is merged into one record by
  field precedence (newest non-empty value, phone from the most trusted
  source). Pairs in the review band go to a review list.

## Invariants
- I1. **Hard key.** The same normalized E.164 phone means the same cluster.
- I2. **Name similarity alone never merges.** A fuzzy edge needs name
  similarity ≥ θ_merge **and** one corroborating field (same email, or same
  last 7 phone digits).
- I3. Merging is transitive and order-independent (union–find).

## Algorithm
```text
1. normalize: phone → E.164, name → lowercase, strip diacritics/titles, email → lowercase
2. UF ← union-find(n)
3. exact pass: hash map phone → first index; union duplicates      # O(n)
4. same for email
5. blocking: key = (first 3 letters of normalized surname, last 4 phone digits)
6. for each block (size b): compare pairs inside the block only    # Σ b²
7.   s ← Jaro-Winkler(name) ; corroborate ← email = or last7 =
8.   if s ≥ θ_merge and corroborate → union, reason "fuzzy+field"
9.   else if s ≥ θ_review → add to review list
10. clusters ← group by find(i); merge fields; output report
```

## Complexity
- Time: O(n·α(n)) for the exact passes plus O(Σ b²) for the blocks. With a
  sensible blocking key, b stays below about 20, so this is close to linear,
  compared with n² = 10⁸ for 10 000 contacts.
- Memory: O(n).

## Edge cases
1. Shared office numbers (many people on one phone): flag blocks larger than
   10 for review instead of merging them automatically.
2. Arabic and English spellings of the same name: transliteration
   normalization is planned for L3, and until then such pairs go to the review
   list.

## Current implementation
`DeduplicationService` has `exactDeduplication`, `fuzzyMatching` (Levenshtein
over all pairs) and `levenshteinDistance`. Gaps: blocking, union–find, the
corroboration rule I2 and merge reasons.

## Verification
- Unit: a transitive chain A~B~C gives one cluster. Same name with different
  phones and no corroboration is not merged. A 10 000-row synthetic set
  finishes in under 2 s.
