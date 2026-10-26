# FC-019 — Full-text search

| | |
|---|---|
| Algorithm | [ALG-019](../03-algorithms/ALG-019-full-text-search.md) |
| Problem | [PS-019](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-019. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  subgraph INDEX
    I0([message]) --> I1["1 · tokenize + Arabic normalize + stop-words"]
    I1 --> I2["2 · append postings, tf"]
    I2 --> I3["3 · flush segment every 1000"]
  end
  subgraph QUERY
    Q0([8.13 search]) --> Q1{"1 · terms left after stop-words?"}
    Q1 -- no --> QG([query too general])
    Q1 -- yes --> Q1b["1 · sort terms rarest first"]
    Q1b --> Q2["2 · galloping intersection"]
    Q2 --> Q3["3 · BM25 × recency"]
    Q3 --> Q4(["4 · top-20 + snippets"])
  end
```
