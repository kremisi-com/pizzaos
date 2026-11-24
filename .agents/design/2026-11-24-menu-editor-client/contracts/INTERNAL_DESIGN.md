# Interni

Normalizzare gli standard nella proiezione e nella preparazione server. Sincronizzare topping inventory con ID stabile inventory:<id>, conservando topping legacy come ricette incluse; le formule inventory usano solo i topping abilitati. Firma JSON deterministica include configurazione extra e informazioni alimentari, non scorte. Al publish comparare firma salvata con firma corrente prima di ricompilare. Snapshot JSON PostgreSQL, nessun DDL. Validare tutte le nuove proprietà prima dell'uso.

Checklist: standard globali; compatibilità; regole sconto; dose; snapshot; conflitto; ricette; pubblicazione.
