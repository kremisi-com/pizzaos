"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import styles from "./demo-request-modal.module.css";

interface DemoRequestModalProps
{
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface FormData
{
  readonly name: string;
  readonly email: string;
  readonly pizzeriaName: string;
  readonly city: string;
}

interface FormErrors
{
  readonly name?: string;
  readonly email?: string;
  readonly pizzeriaName?: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  pizzeriaName: "",
  city: ""
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data: FormData): FormErrors
{
  const errors: Record<string, string> = {};

  if (!data.name.trim())
  {
    errors["name"] = "Nome richiesto";
  }

  if (!data.email.trim() || !EMAIL_PATTERN.test(data.email))
  {
    errors["email"] = "Email valida richiesta";
  }

  if (!data.pizzeriaName.trim())
  {
    errors["pizzeriaName"] = "Nome pizzeria richiesto";
  }

  return errors;
}

export function DemoRequestModal({ isOpen, onClose }: DemoRequestModalProps): ReactElement | null
{
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  /* Close on Escape */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>): void =>
  {
    if (e.key === "Escape")
    {
      onClose();
    }
  }, [onClose]);

  /* Focus trap: focus first input when modal opens */
  useEffect(() =>
  {
    if (isOpen)
    {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  /* Reset on close */
  useEffect(() =>
  {
    if (!isOpen)
    {
      setTimeout(() =>
      {
        setFormData(EMPTY_FORM);
        setErrors({});
        setSubmitted(false);
        setSubmitting(false);
      }, 400);
    }
  }, [isOpen]);

  if (!isOpen)
  {
    return null;
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>): void
  {
    if (e.target === backdropRef.current)
    {
      onClose();
    }
  }

  function handleFieldChange(field: keyof FormData): (e: ChangeEvent<HTMLInputElement>) => void
  {
    return (e) =>
    {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field as keyof FormErrors])
      {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void
  {
    e.preventDefault();
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0)
    {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    /* Simulate async submission */
    setTimeout(() =>
    {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  }

  return (
    <div
      ref={backdropRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.modal}>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Chiudi"
          id="demo-modal-close"
        >
          ×
        </button>

        {submitted
          ? (
            /* Success state */
            <div className={styles.success} role="status" aria-live="polite">
              <div className={styles.successIcon} aria-hidden="true">🎉</div>
              <h2 className={styles.successTitle}>Richiesta inviata!</h2>
              <p className={styles.successDescription}>
                Grazie {formData.name}! Il nostro team ti contatterà entro 24 ore
                per organizzare la tua demo personalizzata di PizzaOS.
              </p>
              <button
                type="button"
                onClick={onClose}
                className={styles.successClose}
                id="demo-modal-success-close"
              >
                Chiudi
              </button>
            </div>
          )
          : (
            /* Form */
            <>
              <div className={styles.eyebrow}>Demo gratuita</div>
              <h2 className={styles.title} id="demo-modal-title">
                Scopri PizzaOS per la tua pizzeria
              </h2>
              <p className={styles.description}>
                Lasciaci i tuoi dati e ti mostreremo tutto in una call di 20 minuti.
              </p>

              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="demo-name">Nome e cognome</label>
                  <input
                    ref={firstInputRef}
                    id="demo-name"
                    type="text"
                    className={styles.input}
                    placeholder="Mario Rossi"
                    value={formData.name}
                    onChange={handleFieldChange("name")}
                    autoComplete="name"
                    aria-required="true"
                    aria-describedby={errors.name ? "demo-name-error" : undefined}
                  />
                  {errors.name && (
                    <span id="demo-name-error" className={styles.error} role="alert">
                      {errors.name}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="demo-email">Email</label>
                  <input
                    id="demo-email"
                    type="email"
                    className={styles.input}
                    placeholder="mario@pizzeria.it"
                    value={formData.email}
                    onChange={handleFieldChange("email")}
                    autoComplete="email"
                    aria-required="true"
                    aria-describedby={errors.email ? "demo-email-error" : undefined}
                  />
                  {errors.email && (
                    <span id="demo-email-error" className={styles.error} role="alert">
                      {errors.email}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="demo-pizzeria">Nome pizzeria</label>
                  <input
                    id="demo-pizzeria"
                    type="text"
                    className={styles.input}
                    placeholder="Pizzeria da Mario"
                    value={formData.pizzeriaName}
                    onChange={handleFieldChange("pizzeriaName")}
                    aria-required="true"
                    aria-describedby={errors.pizzeriaName ? "demo-pizzeria-error" : undefined}
                  />
                  {errors.pizzeriaName && (
                    <span id="demo-pizzeria-error" className={styles.error} role="alert">
                      {errors.pizzeriaName}
                    </span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="demo-city">Città</label>
                  <input
                    id="demo-city"
                    type="text"
                    className={styles.input}
                    placeholder="Roma"
                    value={formData.city}
                    onChange={handleFieldChange("city")}
                    autoComplete="address-level2"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                  id="demo-modal-submit"
                >
                  {submitting ? "Invio in corso…" : "Prenota la tua demo →"}
                </button>
              </form>
            </>
          )}

      </div>
    </div>
  );
}
