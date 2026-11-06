/** Public signatures only. */
export interface DemoAuthOptions { demoPassword?: string; }
export interface ModeResponse { mode: "live" | "demo"; }
export interface DemoAccessResponse { enabled: boolean; active: boolean; csrfToken: string; }
export declare function getExperienceMode(cookieHeader: string): Promise<ModeResponse["mode"]>;
