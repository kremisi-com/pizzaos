import { Card } from "@pizzaos/ui";
import type { ReactElement } from "react";

export default function ProfilePage(): ReactElement
{
  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px", color: "var(--pizzaos-color-primary)" }}>Profilo</h1>
      <Card title="Il mio profilo">
        <p>Benvenuto nel tuo profilo PizzaOS.</p>
        <p style={{ color: "var(--pizzaos-color-foreground-muted)" }}>Questa area è in fase di sviluppo.</p>
      </Card>
    </div>
  );
}
