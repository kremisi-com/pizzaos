# Interni

Estrarre controlli dalla proiezione pubblica pizza. Stato scelte menu limitato alla vista, inizializzato da defaultSelections. Mappe ID esplicite; anteprime da previewImages. Card prezzo tramite resolveMenuComposition con scelte iniziali valide. Passare initialSelections tramite ConfigurationDialog. Riutilizzare classi e composizione PoC quando appropriato, senza importarne stato demo.

Checklist: menu; scelte; immagini; prezzi; dettaglio; righe; gruppo; accessibilità.

Le dosi normali del gusto e le dosi extra hanno sorgenti distinte. La UI associa rimozione ed extra attraverso riferimenti espliciti a un solo ingrediente quando gli ID sorgente differiscono; due topping distinti non vengono unificati. Le regole legacy composte conservano la corrispondenza esatta. Gli stili dei controlli sono circoscritti contro gli stili del form ospitante; il frame anteprima usa overflow:clip per impedire che la trasformazione decorativa allarghi il contenuto scorrevole.
