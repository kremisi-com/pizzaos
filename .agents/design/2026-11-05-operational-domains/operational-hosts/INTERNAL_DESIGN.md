# Disegno interno

Un resolver puro legge le origini server ad ogni chiamata e confronta l'authority Host normalizzata mediante URL, senza leggere forwarded header. Middleware gestisce solo pagine note e non riscrive API né asset. La home rider rende direttamente la route protetta rider; il login sceglie callback e copy sul server. Le route protette verificano nuovamente host e sessione con un componente server condiviso anche quando il middleware non viene eseguito. Il proxy verifica sempre origine esatta e restrizione endpoint rider prima del fetch.

Le sessioni del servizio esistente distinguono operatore/superadmin da appartenenza rider. Non si modificano ACL o DTO. La modalità demo viene verificata soltanto per l'host admin e rimane separata dal runtime reale. Il componente rider rimuove il link alla gestione.

Checklist: host esatto; configurazione validata; no header forwarded fidati; callback locale; no accesso admin da rider host; ruoli service autorevoli; errori chiusi; sessioni senza cache; cookie host-only; regressione demo e singolo host locale; zero coupling tra app; database invariati.
