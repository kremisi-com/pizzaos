import type { Menu, MenuStatus } from "@pizzaos/domain";
import { MENU_STATUS } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import type { ReactElement } from "react";
import styles from "./catalog-manager.module.css";

interface MenuSettingsModalProps {
  readonly menu: Menu;
  readonly onClose: () => void;
  readonly onSave: (menu: Menu) => void;
}

export function MenuSettingsModal({ menu, onClose, onSave }: MenuSettingsModalProps): ReactElement
{
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h3>Impostazioni Menu</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </header>
        <form className={styles.form} onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave({
            ...menu,
            name: String(formData.get("name") ?? menu.name),
            status: formData.get("status") as MenuStatus
          });
          onClose();
        }}>
          <div className={styles.formGroup}>
            <label htmlFor="menu-name">Nome Menu</label>
            <input id="menu-name" name="name" defaultValue={menu.name} className={styles.input} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="menu-status">Stato</label>
            <select id="menu-status" name="status" defaultValue={menu.status} className={styles.input}>
              {MENU_STATUS.map((status) => (
                <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" type="button" onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit">Salva Impostazioni</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
