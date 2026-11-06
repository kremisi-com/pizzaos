# Contratto vista

```ts
interface RiderDeliveriesScreenProps {
  api: RiderDeliveryApi;
  loginUrl: string;
  refreshMs?: number; // default 5000, positive integer
}
declare function RiderDeliveriesScreen(props: RiderDeliveriesScreenProps): React.JSX.Element;
```

La feature esporta il componente dal proprio index.ts. Non importa composizione admin, altre app o implementazioni service. La route `/rider` e il client HTTP vengono integrati dal coordinatore una volta stabile il backend. Nessun hostname è incorporato nel componente.
