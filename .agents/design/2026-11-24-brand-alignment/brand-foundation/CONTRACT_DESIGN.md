# Contratto pubblico
```ts
export const BRAND_PALETTE: Readonly<{sand: string; orange: string; navy: string; action: string}>;
// Ogni campo è una data URL SVG originale: nessuna richiesta a filesystem o servizi esterni.
export const BRAND_ASSETS: Readonly<{logo: string; logoWhite: string; logoBlack: string; vertical: string; verticalWhite: string; verticalBlack: string; wordmark: string; wordmarkWhite: string; wordmarkBlack: string; mark: string; markWhite: string; markBlack: string; icon: string; pattern: string}>;
// API già esistenti restano pubbliche e compatibili.
export function getThemeStyleVariables(surface: AppSurface): Record<`--pizzaos-${string}`, string>;
export function getSurfaceThemeTokens(surface: AppSurface): SurfaceThemeTokens;
// Nuovo componente pubblico @pizzaos/ui; src è un asset fornito dal chiamante.
export interface BrandLogoProps { readonly src: string; readonly decorative?: boolean; readonly className?: string; readonly width?: number; readonly height?: number; }
export function BrandLogo(props: BrandLogoProps): ReactElement;
```
Variabili disponibili per tutti i temi: --pizzaos-brand-sand/orange/navy; --pizzaos-color-primary-hover, -primary-soft, -surface-muted, -success, -success-soft, -success-foreground, -warning, -warning-soft, -warning-foreground, -critical, -critical-soft, -critical-foreground, -info, -info-soft, -info-foreground, -focus; --pizzaos-brand-pattern (valore CSS url). I token originari restano disponibili. Errori dei flussi applicativi invariati.
