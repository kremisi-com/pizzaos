export interface LandingSearchParams {
  readonly c?: string | readonly string[];
}

export function shouldShowChainManagementSection(
  searchParams: LandingSearchParams | undefined,
): boolean {
  const chainParam = searchParams?.c;

  if (Array.isArray(chainParam)) {
    return chainParam.includes("t");
  }

  return chainParam === "t";
}
