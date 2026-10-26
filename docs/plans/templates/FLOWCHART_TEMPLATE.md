# FC-nnn — <Title>

Flowchart of [ALG-nnn](../03-algorithms/ALG-nnn-slug.md). The step numbers
in the boxes match the algorithm.

```mermaid
flowchart TD
    S([Start]) --> A[1. First step]
    A --> D{2. Decision?}
    D -- yes --> B[3. Action]
    D -- no --> E([End])
    B --> E
```

Shapes: `([ ])` start or end · `[ ]` step · `{ }` decision · `[/ /]` input
or output · `[( )]` storage.
