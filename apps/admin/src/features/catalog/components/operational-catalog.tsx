"use client";

import type { IndividualIngredient, MenuAdminApi, MenuDraft, MenuWorkspace } from "@pizzaos/domain";
import { materializePizzaMenu } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useAdminToast } from "../../notifications";
import { MenuDraftEditor } from "./menu-draft-editor";
import { MenuPreview } from "./menu-preview";
import styles from "./operational-catalog.module.css";

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "Operazione non riuscita. Riprova.";
}

function isTextEdit(event: SyntheticEvent) {
  const target = event.target;
  return target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
    && !["checkbox", "radio", "file", "button", "submit"].includes(target.type);
}

export function OperationalCatalog({ api, storeId, ingredients, onPublished, onInventory }: {
  api: MenuAdminApi;
  storeId: string;
  ingredients: readonly IndividualIngredient[];
  onPublished: () => void;
  onInventory?: () => void;
}) {
  const showToast = useAdminToast();
  const [workspace, setWorkspace] = useState<MenuWorkspace | null>(null);
  const [edits, setEdits] = useState<Record<string, MenuDraft>>({});
  const [queued, setQueued] = useState<Record<string, MenuDraft>>({});
  const editingText = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewPreview, setViewPreview] = useState(false);
  const [confirmation, setConfirmation] = useState<"publish" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [failedDraft, setFailedDraft] = useState<MenuDraft | null>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    const draft = Object.values(queued)[0];
    if (!workspace || !draft || busy || saveInFlight.current || draft === failedDraft) return;
    saveInFlight.current = true;
    setSaving(true);
    setError("");
    void api.saveDraft(storeId, workspace.revision, draft).then(updated => {
      setWorkspace(updated);
      setFailedDraft(null);
      setQueued(current => {
        if (current[draft.id] !== draft) return current;
        const next = { ...current };
        delete next[draft.id];
        return next;
      });
      setEdits(current => {
        if (current[draft.id] !== draft) return current;
        const next = { ...current };
        delete next[draft.id];
        return next;
      });
      showToast("Bozza salvata.", "success");
    }).catch((failure: unknown) => {
      const text = message(failure);
      setFailedDraft(draft);
      setError(text);
      showToast(text, "error");
    }).finally(() => {
      saveInFlight.current = false;
      setSaving(false);
    });
  }, [api, busy, queued, failedDraft, saving, showToast, storeId, workspace]);

  useEffect(() => {
    let active = true;
    void api.workspace(storeId).then(result => {
      if (active) setWorkspace(result);
    }).catch((failure: unknown) => {
      if (active) { setError(message(failure)); showToast(message(failure), "error"); }
    });
    return () => { active = false; };
  }, [api, showToast, storeId, reload]);

  function select(id: string | null) {
    setSelectedId(id);
    setViewPreview(false);
    setConfirmation(null);
  }

  function change(draft: MenuDraft) {
    setEdits(current => ({ ...current, [draft.id]: draft }));
    if (!editingText.current) setQueued(current => ({ ...current, [draft.id]: draft }));
  }

  function reloadWorkspace() {
    select(null);
    setWorkspace(null);
    setError("");
    setEdits({});
    setQueued({});
    editingText.current = false;
    setFailedDraft(null);
    setReload(version => version + 1);
  }

  function newDraft(source?: MenuDraft) {
    const draft: MenuDraft = source
      ? { ...structuredClone(source), id: crypto.randomUUID(), name: `Copia di ${source.name}` }
      : { id: crypto.randomUUID(), name: "Nuovo menu", sections: [], products: [] };
    change(draft);
    select(draft.id);
  }

  async function perform(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (failure) {
      const text = message(failure);
      setError(text);
      showToast(text, "error");
    } finally {
      setBusy(false);
    }
  }

  const selectedDraft = selectedId && (edits[selectedId] ?? workspace?.drafts.find(draft => draft.id === selectedId));
  const menu = selectedDraft || workspace?.published;
  const dirty = Object.keys(edits).length > 0;
  const pending = busy || saving || dirty;

  async function publish() {
    if (!workspace || !selectedDraft || pending) return;
    await perform(async () => {
      const updated = await api.publish(storeId, workspace.revision, selectedDraft.id);
      setWorkspace(updated);
      select(null);
      showToast("Menu pubblicato.", "success");
      onPublished();
    });
  }

  async function deleteDraft() {
    if (!workspace || !selectedDraft || pending) return;
    await perform(async () => {
      const updated = await api.removeDraft(storeId, workspace.revision, selectedDraft.id);
      setWorkspace(updated);
      select(null);
      showToast("Bozza eliminata.", "success");
    });
  }

  async function uploadPhoto(productId: string, file: File) {
    if (!selectedDraft || busy) return;
    await perform(async () => {
      if (file.size > 2 * 1024 * 1024) throw new Error("Scegli una foto da 2 MB o meno.");
      const image = await api.uploadImage(storeId, file);
      change(materializePizzaMenu({
        ...selectedDraft,
        ...(selectedDraft.pizzaCatalog ? { pizzaCatalog: { ...selectedDraft.pizzaCatalog,
          tastes: selectedDraft.pizzaCatalog.tastes.map(entry => entry.id === productId ? { ...entry, imageId: image.id } : entry),
          formulas: selectedDraft.pizzaCatalog.formulas.map(entry => entry.id === productId ? { ...entry, imageId: image.id } : entry)
        } } : {}),
        products: selectedDraft.products.map(product => product.id === productId ? { ...product, imageId: image.id } : product)
      }));
      showToast("Foto caricata. Salvataggio automatico in corso.", "info");
    });
  }

  const availableDrafts = new Map((workspace?.drafts ?? []).map(draft => [draft.id, draft]));
  for (const draft of Object.values(edits)) availableDrafts.set(draft.id, draft);

  return <div className={styles.catalog} aria-busy={busy || saving}>
    {error && <div className={styles.actions}>
      <p role="alert">{error}</p>
      {failedDraft && <Button type="button" variant="secondary" disabled={busy || saving} onClick={() => setFailedDraft(null)}>Riprova salvataggio</Button>}
      <Button type="button" variant="secondary" disabled={busy || saving} onClick={reloadWorkspace}>
        {Object.keys(edits).length > 0 ? "Ricarica e scarta le modifiche locali" : "Ricarica menu"}
      </Button>
    </div>}
    {!workspace && !error && <p role="status">Caricamento del menu…</p>}
    {workspace && menu && <div className={styles.catalogPage}>
      <header className={styles.catalogHeader}>
        <div className={styles.catalogTitle}><h1>Il tuo menu</h1><p>Aggiungi le pizze, scegli il prezzo. Il resto solo se ti serve.</p></div>
        <div className={styles.headerActions}>
          <span role="status" className={styles.small}>{selectedDraft ? failedDraft ? "Salvataggio non riuscito" : saving ? "Salvataggio automatico…" : dirty ? "Modifiche da salvare" : "Bozza salvata" : "Menu pubblicato"}</span>
          <Button type="button" variant="secondary" disabled={busy} aria-pressed={viewPreview} onClick={() => setViewPreview(value => !value)}>{viewPreview ? "Torna alla modifica" : "Anteprima"}</Button>
          <label className={styles.menuSelect}>Menu da modificare<select value={selectedId ?? ""} disabled={busy} onChange={event => select(event.target.value || null)}>
            <option value="">{workspace.published.name} (pubblicato)</option>
            {Array.from(availableDrafts.values()).map(draft => <option key={draft.id} value={draft.id}>{draft.name || "Bozza senza nome"}</option>)}
          </select></label>
          <Button type="button" disabled={!selectedDraft || pending} aria-expanded={confirmation === "publish"} onClick={() => setConfirmation(value => value === "publish" ? null : "publish")}>Pubblica menu</Button>
        </div>
      </header>
      <div className={styles.menuTools}>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => newDraft()}>Nuovo menu</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => newDraft(menu)}>Duplica menu</Button>
        {selectedDraft && <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmation(value => value === "delete" ? null : "delete")}>Elimina bozza</Button>}
        {!selectedDraft && <p className={styles.small}>Duplica il menu pubblicato per modificarlo.</p>}
      </div>
      <section>
        {selectedDraft ? <form className={styles.form} onSubmit={event => event.preventDefault()}
          onChangeCapture={event => { editingText.current = isTextEdit(event); }}
          onBlur={event => {
            if (!isTextEdit(event)) return;
            editingText.current = false;
            setQueued(current => ({ ...current, ...edits }));
          }}>
          {viewPreview ? <MenuPreview menu={menu} storeId={storeId} ingredients={ingredients} /> : <fieldset className={styles.editor} disabled={busy}>
            <legend className={styles.screenReaderOnly}>Impostazioni della bozza</legend>
            <MenuDraftEditor key={selectedDraft.id} draft={selectedDraft} storeId={storeId} ingredients={ingredients}
              onChange={change} onUpload={(id, file) => void uploadPhoto(id, file)} onInventory={onInventory ? () => {
                if (Object.keys(edits).length) { showToast("Attendi il salvataggio automatico delle bozze prima di aprire il Magazzino.", "info"); return; }
                onInventory();
              } : undefined} />
          </fieldset>}
          {confirmation && <fieldset className={styles.confirm} disabled={pending}>
            <legend>{confirmation === "publish" ? "Pubblicare" : "Eliminare"} {selectedDraft.name}?</legend>
            <p>{confirmation === "publish" ? "Questo menu diventerà visibile ai clienti della sede." : "La bozza sarà rimossa dal pannello."}</p>
            <div className={styles.actions}>
              {confirmation === "publish"
                ? <Button type="button" onClick={() => void publish()}>Conferma pubblicazione</Button>
                : <Button type="button" variant="secondary" onClick={() => void deleteDraft()}>Conferma eliminazione</Button>}
              <Button type="button" variant="ghost" onClick={() => setConfirmation(null)}>Annulla</Button>
            </div>
          </fieldset>}
        </form> : <MenuPreview menu={menu} storeId={storeId} ingredients={ingredients} />}
      </section>
    </div>}
  </div>;
}
