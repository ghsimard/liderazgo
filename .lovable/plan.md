

## Objectif

Remplacer les images statiques du hub **Mi Panel (Evaluador)** par un **carrousel interactif** (image par image) montrant tous les écrans possibles pour l'évaluateur, avec navigation (flèches + indicateurs).

## Écrans à inclure dans le carrousel

Les images existantes dans `/public/images/` pour l'évaluateur :
1. `mi-panel-evaluador-preview.png` — Mi Panel — Vista general
2. `evaluador-rubrica-preview.png` — Mi Rúbrica de Evaluación
3. `evaluador-encuestas360-preview.png` — Encuestas 360° — Entrada

Il faudra potentiellement ajouter d'autres captures d'écran pour couvrir tous les écrans de l'évaluateur (ex: détail d'une rúbrica, formulaire de seguimiento, informe de módulo). Mais dans un premier temps, on utilise les 3 images existantes + la vidéo reste en dessous.

## Changements techniques

### `src/pages/specs/SpecsHubs.tsx`

Dans le bloc `hub.id === "mi-panel-evaluador"` (lignes 673-693) :

1. Remplacer les 3 blocs `<img>` empilés par un **carrousel** utilisant le composant `Carousel` existant (`@/components/ui/carousel`)
2. Chaque slide contient une image avec son label
3. Flèches précédent/suivant + indicateurs de position (dots)
4. La vidéo reste en dessous du carrousel, inchangée

Structure :
```tsx
<Carousel className="w-full">
  <CarouselContent>
    {evaluadorScreens.map((screen, i) => (
      <CarouselItem key={i}>
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground px-3 py-2 bg-muted/50">{screen.label}</p>
          <img src={screen.src} alt={screen.label} className="w-full" loading="lazy" />
        </div>
      </CarouselItem>
    ))}
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>
```

Données du carrousel :
```ts
const evaluadorScreens = [
  { label: "Mi Panel — Vista general", src: "/images/mi-panel-evaluador-preview.png" },
  { label: "Mi Rúbrica de Evaluación", src: "/images/evaluador-rubrica-preview.png" },
  { label: "Encuestas 360° — Entrada", src: "/images/evaluador-encuestas360-preview.png" },
];
```

### Imports à ajouter
```ts
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
```

