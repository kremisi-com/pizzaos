import type { DemoStorage } from "@pizzaos/mock-data";

export const CLIENT_FEEDBACK_STORAGE_KEY = "pizzaos:client:feedback:v1";

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface OrderFeedbackEntry
{
  readonly orderId: string;
  readonly rating: FeedbackRating;
  readonly comment: string;
  readonly submittedAtIso: string;
  readonly googleReviewRedirectedAtIso: string | null;
}

export interface ClientFeedbackState
{
  readonly entries: readonly OrderFeedbackEntry[];
}

export interface SubmitOrderFeedbackInput
{
  readonly state: ClientFeedbackState;
  readonly orderId: string;
  readonly rating: FeedbackRating;
  readonly comment?: string;
  readonly submittedAtIso?: string;
}

const EMPTY_FEEDBACK_STATE: ClientFeedbackState = {
  entries: []
};

export function loadClientFeedbackState(storage?: DemoStorage): ClientFeedbackState
{
  if (!storage)
  {
    return EMPTY_FEEDBACK_STATE;
  }

  const payload = storage.getItem(CLIENT_FEEDBACK_STORAGE_KEY);

  if (!payload)
  {
    return EMPTY_FEEDBACK_STATE;
  }

  try
  {
    const parsed = JSON.parse(payload) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.entries))
    {
      return EMPTY_FEEDBACK_STATE;
    }

    const entries = parsed.entries.filter((entry): entry is OrderFeedbackEntry => isOrderFeedbackEntry(entry));

    return {
      entries
    };
  }
  catch
  {
    return EMPTY_FEEDBACK_STATE;
  }
}

export function saveClientFeedbackState(state: ClientFeedbackState, storage?: DemoStorage): ClientFeedbackState
{
  if (storage)
  {
    storage.setItem(CLIENT_FEEDBACK_STORAGE_KEY, JSON.stringify(state));
  }

  return state;
}

export function clearClientFeedbackState(storage?: DemoStorage): ClientFeedbackState
{
  if (storage)
  {
    storage.removeItem(CLIENT_FEEDBACK_STORAGE_KEY);
  }

  return EMPTY_FEEDBACK_STATE;
}

export function getOrderFeedbackEntry(
  state: ClientFeedbackState,
  orderId: string
): OrderFeedbackEntry | null
{
  return state.entries.find((entry) => entry.orderId === orderId) ?? null;
}

export function hasOrderFeedback(
  state: ClientFeedbackState,
  orderId: string
): boolean
{
  return getOrderFeedbackEntry(state, orderId) !== null;
}

export function submitOrderFeedback(input: SubmitOrderFeedbackInput): ClientFeedbackState
{
  const submittedAtIso = input.submittedAtIso ?? new Date(Date.now()).toISOString();
  const nextEntry: OrderFeedbackEntry = {
    orderId: input.orderId,
    rating: input.rating,
    comment: input.comment?.trim() ?? "",
    submittedAtIso,
    googleReviewRedirectedAtIso: null
  };
  const existingEntryIndex = input.state.entries.findIndex((entry) => entry.orderId === input.orderId);

  if (existingEntryIndex === -1)
  {
    return {
      entries: [
        nextEntry,
        ...input.state.entries
      ]
    };
  }

  return {
    entries: input.state.entries.map((entry, entryIndex) => (entryIndex === existingEntryIndex ? nextEntry : entry))
  };
}

export function markGoogleReviewRedirected(
  state: ClientFeedbackState,
  orderId: string,
  redirectedAtIso?: string
): ClientFeedbackState
{
  const targetEntry = getOrderFeedbackEntry(state, orderId);

  if (!targetEntry)
  {
    return state;
  }

  if (targetEntry.googleReviewRedirectedAtIso)
  {
    return state;
  }

  const nextRedirectedAtIso = redirectedAtIso ?? new Date(Date.now()).toISOString();

  return {
    entries: state.entries.map((entry) =>
    {
      if (entry.orderId !== orderId)
      {
        return entry;
      }

      return {
        ...entry,
        googleReviewRedirectedAtIso: nextRedirectedAtIso
      };
    })
  };
}

export function shouldSuggestGoogleReviewRedirect(rating: FeedbackRating): boolean
{
  return rating >= 4;
}

function isOrderFeedbackEntry(value: unknown): value is OrderFeedbackEntry
{
  if (!isRecord(value))
  {
    return false;
  }

  return (
    typeof value.orderId === "string" &&
    typeof value.rating === "number" &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    typeof value.comment === "string" &&
    typeof value.submittedAtIso === "string" &&
    (typeof value.googleReviewRedirectedAtIso === "string" || value.googleReviewRedirectedAtIso === null)
  );
}

function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null;
}
