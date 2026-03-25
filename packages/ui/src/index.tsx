import type { PropsWithChildren, ReactElement } from "react";

interface ShellCardProps extends PropsWithChildren
{
  readonly title: string;
}

export function ShellCard(props: ShellCardProps): ReactElement
{
  return (
    <section
      style={{
        border: "1px solid rgba(17, 24, 39, 0.18)",
        borderRadius: "12px",
        padding: "16px",
        backgroundColor: "#ffffff"
      }}
    >
      <h2 style={{ margin: "0 0 10px", fontSize: "1.125rem" }}>{props.title}</h2>
      <div>{props.children}</div>
    </section>
  );
}
