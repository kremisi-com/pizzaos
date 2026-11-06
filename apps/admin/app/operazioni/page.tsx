import { IndividualOperationsShell } from "@/composition/individual-operations-shell";
import { OperationalPage } from "@/composition/operational-page";

export default function IndividualOperationsPage() { return <OperationalPage surface="admin"><IndividualOperationsShell riderHref={process.env.PIZZAOS_RIDER_ORIGIN?.trim() || "/rider"} /></OperationalPage>; }
