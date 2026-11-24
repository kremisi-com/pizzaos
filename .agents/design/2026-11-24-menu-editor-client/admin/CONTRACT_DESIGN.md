# Contratti

Mantenere le props pubbliche di OperationalCatalog e MenuDraftEditor, estendibili con callback onSave e apertura Magazzino. MenuDraftEditor modifica soltanto la bozza fornita. I pulsanti Salva invocano MenuAdminApi.saveDraft nella composizione esistente. Le nuove proprietà dominio sono descritte nel contratto contracts. Nessuna importazione da app Client o implementazione servizio. UI italiana; nessun nuovo valore commerciale hardcoded. Ricerca ingredienti da IndividualIngredient e associazioni esplicite.
