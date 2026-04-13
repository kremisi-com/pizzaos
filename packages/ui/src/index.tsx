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
      style={{
        inset: 0,
        position: "fixed",
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "28px",
          backgroundColor: "#ffffff",
          boxShadow: "0 24px 48px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.04)",
          padding: "32px 28px 28px",
          position: "relative",
          animation: "pizzaos-fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "24px" }}>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              color: "var(--pizzaos-color-foreground)"
            }}
          >
            {props.title}
          </h2>
          <button
            onClick={props.onClose}
            className="pizzaos-dialog-close"
            aria-label="Chiudi"
          >
            &times;
          </button>
        </div>
        {props.description ? <p id={descriptionId} style={{ color: "var(--pizzaos-color-foreground-muted)", marginTop: "-12px", marginBottom: "20px", fontSize: "0.875rem" }}>{props.description}</p> : null}
        <div>{props.children}</div>
        {props.footer ? <footer style={{ marginTop: "28px" }}>{props.footer}</footer> : null}
      </div>

      <style>{`
        @keyframes pizzaos-fade-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pizzaos-dialog-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 50%;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--pizzaos-color-foreground);
          opacity: 0.55;
          transition: opacity 0.15s ease, background 0.15s ease, transform 0.15s ease;
          padding: 0;
          line-height: 1;
          margin-top: -2px;
        }
        .pizzaos-dialog-close:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.09);
          transform: scale(1.05);
        }
        .pizzaos-dialog-close:active {
          transform: scale(0.94);
        }
      `}</style>
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

export interface BottomNavigationItem
{
  readonly id: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly href: string;
  readonly isProminent?: boolean;
}

export interface BottomNavigationProps
{
  readonly items: readonly BottomNavigationItem[];
  readonly activeItemId: string;
  readonly onNavigate?: (href: string) => void;
}

export function BottomNavigation(props: BottomNavigationProps): ReactElement
{
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "var(--pizzaos-color-background)",
        borderTop: "1px solid var(--pizzaos-color-border)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
        zIndex: 50,
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)"
      }}
    >
      {props.items.map((item) => {
        const isActive = item.id === props.activeItemId;

        const baseStyle: React.CSSProperties = {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "none",
          cursor: "pointer",
          transition: "all 0.2s ease"
        };

        if (item.isProminent) {
          return (
            <button
              key={item.id}
              onClick={() => props.onNavigate?.(item.href)}
              style={{
                ...baseStyle,
                gap: "4px",
                background: "var(--pizzaos-color-primary)",
                color: "var(--pizzaos-color-primary-foreground)",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                marginTop: "-32px",
                boxShadow: "0 4px 12px rgba(209, 73, 46, 0.4)",
                transform: isActive ? "scale(1.1)" : "scale(1)"
              }}
            >
              <span style={{ fontSize: "24px", display: "flex" }}>{item.icon}</span>
              <span style={{ fontSize: "10px", fontWeight: 700 }}>{item.label}</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => props.onNavigate?.(item.href)}
            style={{
              ...baseStyle,
              gap: "4px",
              color: isActive ? "var(--pizzaos-color-primary)" : "var(--pizzaos-color-foreground-muted)",
              flex: 1,
              padding: "8px 0"
            }}
          >
            <span style={{ fontSize: "20px", display: "flex" }}>{item.icon}</span>
            <span style={{ fontSize: "12px", fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
