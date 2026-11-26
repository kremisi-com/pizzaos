# Contratti pubblici

Export da @pizzaos/domain; denaro in centesimi interi. Oggetti puri senza mutazione degli input.

```ts
type ProductType = "pizza" | "sandwich" | "product" | "box" | "meal";
interface MealStep { id: string; name: string; alternatives: { productId: string; priceCents: number }[] }
interface MealSelection { stepId: string; productId: string; removedIngredientIds: string[]; notes: string }
// IndividualProduct aggiunge productType?: ProductType e meal?: { steps: MealStep[] }.
// IndividualLine aggiunge mealSelections?: MealSelection[]. I kind esistenti restano; sandwich/meal/box usano product.
// MenuComposition aggiunge mealSteps?: { stepId: string; name: string; productId: string; productName: string; priceCents: number; removedIngredientIds: string[]; removedIngredientNames?: string[]; notes: string; composition: MenuComposition }[].
declare function productType(product: IndividualProduct): ProductType;
// Esplicito se presente, altrimenti identità pizza, altrimenti gruppi selection -> box, altrimenti product.
declare function materializeSandwich(product: IndividualProduct, ingredients: readonly IndividualIngredient[]): IndividualProduct;
// Genera rimozioni incluse e comuni extra abilitati, senza impasti/formati e senza identità pizza. Idempotente.
declare function mealDefaultSelections(product: IndividualProduct): MenuSelection[];
// Standard pizza, con impasto consigliato se definito. Altri tipi -> []. Nessun fallback per indisponibilità.
declare function mealRemovableIngredientIds(product: IndividualProduct): string[];
// Ingredienti inclusi rimovibili; esclude impasto e altre dimensioni automatiche.
declare function resolveMealComposition(product: IndividualProduct, selections: readonly MealSelection[], products: readonly IndividualProduct[]): ResolvedMenuComposition;
// Esattamente una selezione per fase. Prezzo base + variazioni, ricette standard meno rimozioni.
// valid=false per input incompleto/duplicato, opzioni vietate, prodotti assenti/esclusi/indisponibili,
// rimozioni non incluse, note >1000 caratteri o prezzo negativo. Nessuna eccezione per input tipizzato non valido.
```

Le rimozioni del Menu fanno riferimento agli ID ingrediente; rimuovono il contributo incluso corrispondente e non l'impasto automatico. Le ricette ingredienti comuni vengono aggregate preservando null (consumo non tracciato). I risultati includono nomi e informazioni alimentari della composizione effettiva e snapshot delle fasi. Il prezzo di ogni prodotto figlio non contribuisce.

Fuori dal Menu, togliere un ingrediente incluso da un Panino e aggiungere lo stesso ingrediente come extra conserva soltanto il contributo della dose extra e il relativo prezzo. Le bozze ammettono nomi prodotto/gruppo/opzione ancora vuoti; pubblicazione e configurazione diretta della sede li rifiutano. Prezzi e riferimenti invalidi sono rifiutati anche in bozza.

API esistenti MenuAdminApi.saveDraft/publish e IndividualApi.quote/checkout/additions: stesse firme esterne, nuove proprietà nei payload condivisi. Il servizio valida immutabilità per ID già presente (invalid_input), pubblicazione delle fasi e consumi canonici. Richieste Menu con optionIds/selections non vuoti devono essere rifiutate; accetta solo mealSelections con rimozioni e note. Il browser non invia prezzi, dosi o selettori interni dei figli.

UI admin: MenuDraftEditor mantiene props attuali draft/storeId/ingredients/onChange/onUpload. Aggiungi prodotto apre scelta con nomi italiani; nessun checkbox Pizza. Tipo non modificabile dopo creazione. Box espone Aggiungi gruppo di scelte, Menu Aggiungi fase, Panino ricetta senza Impasti/formati.

UI client: MenuLineEditor mantiene l'ingresso pubblico store/product/line?/quantity?/onSave/disabled?/avoid. I configuratori sono condivisi da aggiunta, gruppo e modifica della riga; i dialog ricevono onClose dalla superficie proprietaria. Menu permette avanti/indietro e Personalizza con sole rimozioni/note. IndividualLine.notes resta la nota generale della riga.

Esempio: Menu 1200 con fasi portata (panino 0) e bibita (acqua -50/birra +50) produce 1150/1250 indipendentemente dai listini singoli. Due fasi con lo stesso panino aggregano due volte la ricetta. Rimozione ingrediente assente -> valid=false. Formula pizza -> valid=false. Scelta extra iniettata nella riga Menu -> invalid_input/customization_changed dal servizio.
