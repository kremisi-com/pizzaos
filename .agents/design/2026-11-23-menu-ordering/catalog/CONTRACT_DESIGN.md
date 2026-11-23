# Contratto pubblico

- Estensioni opzionali di IndividualStore.menu, IndividualIngredient.food, IndividualProduct (gruppi, foto, abbinamenti, informazioni alimentari, formula) e IndividualLine.selections. I prodotti precedenti usano optionIds come oggi, i configurabili inviano selezioni con identificativo e quantità. Un preventivo configurato include composition con scelte, alimenti, sconto e ingredienti.
- GET /v1/pilot/stores/:id/menu-admin legge il workspace, con revision, published e drafts. PUT /v1/pilot/stores/:id/menu-admin/drafts salva { revision, draft }. POST /v1/pilot/stores/:id/menu-admin/publish pubblica { revision, draftId }. DELETE /v1/pilot/stores/:id/menu-admin/drafts/:draftId elimina la bozza con { revision }. Le scritture restituiscono il workspace aggiornato. Una bozza include id, name, sections (id, name, description opzionale, productIds ordinati), kitchenNotice opzionale e products.
- POST /v1/pilot/stores/:id/menu-images accetta foto come body JPEG, PNG o WebP, restituisce { id }. GET sullo stesso percorso seguito dall'identificativo restituisce il contenuto.
- GET e PUT /v1/pilot/food-preferences leggono e salvano { avoid: string[] } per il cliente autenticato.
- I tipi e le firme sono esportati da @pizzaos/domain. IndividualApi continua a fornire catalogo, preventivo e checkout.
