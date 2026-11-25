# Contratti pubblici

API menu e ordering invariate. saveDraft/publish accettano ricette nullable valide; catalog restituisce disponibilità secondo policy; quote e checkout accettano composizioni con dose ignota e riservano solo consumi conosciuti.

```ts
interface ResolvedMenuComposition {
  valid: boolean;
  unitCents: number;
  recipe: Record<string, number | null>;
  composition: MenuComposition;
}
// null = consumo non tracciato; validità dipende dalle scelte, non dalla presenza della dose.
function resolveMenuComposition(product: IndividualProduct, selections: readonly MenuSelection[]): ResolvedMenuComposition;
```

Esempio: ricetta {pomodoro:null, mozzarella:2} rimane valida, prezzo invariato, consumo noto solo mozzarella. Se pomodoro ha zero la policy della sede decide disponibilità e accettazione; scorta positiva/null lo ammette. Ingredienti e allergeni mantengono la presenza di pomodoro.
