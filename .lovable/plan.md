

## Plan: Add Rúbricas Flow Diagram to Specs

Add a new Mermaid sequence diagram to `SpecsDiagramas.tsx` showing the complete 4-module evaluation cycle between Directivo and Evaluador.

### What will be added

A new diagram entry in the `diagrams` array titled **"Flujo Rúbricas — Directivo ↔ Evaluador"** using a Mermaid `sequenceDiagram` with two participants (Directivo, Evaluador) and 4 repeating cycles:

```text
For each Module N (1→4):
  Directivo  → Autoevaluación Módulo N
  Evaluador  → Evaluación Módulo N
  (If N>1: Evaluador can re-evaluate modules 1..N-1)
  Evaluador + Directivo → Nivel Acordado Módulo N
  → Module N+1 unlocked (or read-only lock if N=4)
```

The diagram will use Mermaid `sequenceDiagram` syntax with `participant`, `Note`, `rect` blocks for each module cycle, and `alt` blocks for the re-evaluation possibility.

### Technical details

**File**: `src/pages/specs/SpecsDiagramas.tsx`

- Insert a new object into the `diagrams` array (after the existing "Flujo del Evaluador" entry, position index 2)
- Uses `sequenceDiagram` type (already supported by MermaidDiagram component)
- The 19 steps map naturally to sequence messages between Directivo and Evaluador participants
- Colored `rect` backgrounds will visually group each module cycle

