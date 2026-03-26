import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  TableHTMLAttributes
} from "react";

const CARD_STYLE = {
  border: "1px solid var(--pizzaos-color-border)",
  borderRadius: "var(--pizzaos-radius-card)",
  padding: "16px",
  backgroundColor: "var(--pizzaos-color-background-accent)",
  boxShadow: "var(--pizzaos-elevation-card)"
} as const;

const SECTION_TITLE_STYLE = {
  margin: "0 0 10px",
  fontSize: "1.125rem"
} as const;

const BUTTON_VARIANT_STYLE: Record<ButtonVariant, Readonly<Record<string, string>>> = {
  primary: {
    backgroundColor: "var(--pizzaos-color-primary)",
    color: "var(--pizzaos-color-primary-foreground)",
    border: "1px solid var(--pizzaos-color-primary)"
  },
  secondary: {
    backgroundColor: "transparent",
    color: "var(--pizzaos-color-foreground)",
    border: "1px solid var(--pizzaos-color-border)"
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--pizzaos-color-foreground-muted)",
    border: "1px solid transparent"
  }
};

const BADGE_TONE_STYLE: Record<BadgeTone, Readonly<Record<string, string>>> = {
  neutral: {
    backgroundColor: "rgba(79, 90, 106, 0.14)",
    color: "var(--pizzaos-color-foreground)"
  },
  success: {
    backgroundColor: "rgba(22, 163, 74, 0.14)",
    color: "#166534"
  },
  warning: {
    backgroundColor: "rgba(202, 138, 4, 0.2)",
    color: "#854d0e"
  },
  critical: {
    backgroundColor: "rgba(220, 38, 38, 0.16)",
    color: "#991b1b"
  }
};

const STATUS_INDICATOR_COLOR: Record<StatusTone, string> = {
  idle: "#64748b",
  active: "#16a34a",
  warning: "#ca8a04",
  error: "#dc2626"
};

export interface ShellCardProps extends PropsWithChildren
{
  readonly title: string;
}

export function ShellCard(props: ShellCardProps): ReactElement
{
  return (
    <Card title={props.title}>
      {props.children}
    </Card>
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>
{
  readonly variant?: ButtonVariant;
}

export function Button(props: ButtonProps): ReactElement
{
  const {
    children,
    variant = "primary",
    style,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button
      type={type}
      style={{
        padding: "10px 14px",
        borderRadius: "var(--pizzaos-radius-control)",
        cursor: "pointer",
        fontWeight: 600,
        ...BUTTON_VARIANT_STYLE[variant],
        ...style
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>
{
  readonly inputId: string;
  readonly label: string;
  readonly helperText?: string;
}

export function Input(props: InputProps): ReactElement
{
  const {
    helperText,
    inputId,
    label,
    style,
    ...inputProps
  } = props;

  const helperTextId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <label htmlFor={inputId} style={{ fontWeight: 600 }}>{label}</label>
      <input
        id={inputId}
        aria-describedby={helperTextId}
        style={{
          borderRadius: "var(--pizzaos-radius-control)",
          border: "1px solid var(--pizzaos-color-border)",
          padding: "10px 12px",
          color: "var(--pizzaos-color-foreground)",
          ...style
        }}
        {...inputProps}
      />
      {helperText ? <small id={helperTextId}>{helperText}</small> : null}
    </div>
  );
}

export interface CardProps extends PropsWithChildren
{
  readonly title?: string;
  readonly subtitle?: string;
}

export function Card(props: CardProps): ReactElement
{
  return (
    <article style={CARD_STYLE}>
      {props.title ? <h2 style={SECTION_TITLE_STYLE}>{props.title}</h2> : null}
      {props.subtitle ? <p style={{ marginTop: 0 }}>{props.subtitle}</p> : null}
      <div>{props.children}</div>
    </article>
  );
}

export interface DialogProps
{
  readonly open: boolean;
  readonly dialogId: string;
  readonly title: string;
  readonly description?: string;
  readonly footer?: ReactNode;
  readonly children?: ReactNode;
  readonly onClose?: () => void;
}

export function Dialog(props: DialogProps): ReactElement | null
{
  if (!props.open)
    return null;

  const titleId = `${props.dialogId}-title`;
  const descriptionId = props.description ? `${props.dialogId}-description` : undefined;

  return (
    <div
      role="presentation"
      onClick={props.onClose}
      style={{ inset: 0, position: "fixed", backgroundColor: "rgba(15, 23, 36, 0.45)", zIndex: 100 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, calc(100vw - 32px))",
          margin: "10vh auto",
          borderRadius: "var(--pizzaos-radius-card)",
          backgroundColor: "var(--pizzaos-color-background)",
          border: "1px solid var(--pizzaos-color-border)",
          boxShadow: "var(--pizzaos-elevation-overlay)",
          padding: "20px",
          position: "relative"
        }}
      >
        <button
          onClick={props.onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "var(--pizzaos-color-foreground-muted)"
          }}
          aria-label="Chiudi"
        >
          &times;
        </button>
        <h2 id={titleId} style={{ marginTop: 0 }}>{props.title}</h2>
        {props.description ? <p id={descriptionId}>{props.description}</p> : null}
        <div>{props.children}</div>
        {props.footer ? <footer style={{ marginTop: "20px" }}>{props.footer}</footer> : null}
      </div>
    </div>
  );
}

export interface TabOption
{
  readonly id: string;
  readonly label: string;
  readonly panel: ReactNode;
}

export interface TabsProps
{
  readonly tabs: readonly TabOption[];
  readonly activeTabId: string;
}

export function Tabs(props: TabsProps): ReactElement
{
  const activeTab = props.tabs.find((tab) => tab.id === props.activeTabId) ?? props.tabs[0];

  return (
    <section>
      <div role="tablist" aria-label="Sezioni" style={{ display: "flex", gap: "8px" }}>
        {props.tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={tab.id === activeTab.id}
            aria-controls={`panel-${tab.id}`}
            style={{
              borderRadius: "var(--pizzaos-radius-control)",
              border: "1px solid var(--pizzaos-color-border)",
              padding: "8px 12px",
              backgroundColor: tab.id === activeTab.id ? "var(--pizzaos-color-background-accent)" : "transparent",
              fontWeight: tab.id === activeTab.id ? 700 : 500
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${activeTab.id}`} aria-labelledby={`tab-${activeTab.id}`} style={{ marginTop: 12 }}>
        {activeTab.panel}
      </div>
    </section>
  );
}

export interface ToastProps
{
  readonly title: string;
  readonly message: string;
}

export function Toast(props: ToastProps): ReactElement
{
  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        borderRadius: "var(--pizzaos-radius-control)",
        border: "1px solid var(--pizzaos-color-border)",
        backgroundColor: "var(--pizzaos-color-background-accent)",
        padding: "10px 12px"
      }}
    >
      <strong>{props.title}</strong>
      <p style={{ marginBottom: 0 }}>{props.message}</p>
    </aside>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "critical";

export interface BadgeProps extends PropsWithChildren
{
  readonly tone?: BadgeTone;
}

export function Badge(props: BadgeProps): ReactElement
{
  const tone = props.tone ?? "neutral";

  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: "999px",
        padding: "4px 10px",
        fontSize: "0.85rem",
        fontWeight: 700,
        ...BADGE_TONE_STYLE[tone]
      }}
    >
      {props.children}
    </span>
  );
}

export interface DataListItem
{
  readonly label: string;
  readonly value: ReactNode;
}

export interface DataListProps
{
  readonly items: readonly DataListItem[];
}

export function DataList(props: DataListProps): ReactElement
{
  return (
    <dl style={{ margin: 0 }}>
      {props.items.map((item) => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
          <dt>{item.label}</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TableColumn<Row>
{
  readonly id: string;
  readonly header: string;
  readonly renderCell: (row: Row) => ReactNode;
}

export interface TableProps<Row> extends TableHTMLAttributes<HTMLTableElement>
{
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowId: (row: Row) => string;
}

export function Table<Row>(props: TableProps<Row>): ReactElement
{
  const {
    columns,
    getRowId,
    rows,
    ...tableProps
  } = props;

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid var(--pizzaos-color-border)",
        borderRadius: "var(--pizzaos-radius-control)",
        overflow: "hidden"
      }}
      {...tableProps}
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.id}
              style={{
                textAlign: "left",
                fontWeight: 700,
                padding: "10px",
                borderBottom: "1px solid var(--pizzaos-color-border)"
              }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowId(row)}>
            {columns.map((column) => (
              <td key={column.id} style={{ padding: "10px", borderBottom: "1px solid var(--pizzaos-color-border)" }}>
                {column.renderCell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type StatusTone = "idle" | "active" | "warning" | "error";

export interface StatusIndicatorProps
{
  readonly tone: StatusTone;
  readonly label: string;
}

export function StatusIndicator(props: StatusIndicatorProps): ReactElement
{
  return (
    <span role="status" aria-label={props.label} data-tone={props.tone} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
      <span
        aria-hidden="true"
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "999px",
          backgroundColor: STATUS_INDICATOR_COLOR[props.tone]
        }}
      />
      <span>{props.label}</span>
    </span>
  );
}
