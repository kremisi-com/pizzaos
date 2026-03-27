import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearClientFeedbackState,
  loadClientFeedbackState,
  markGoogleReviewRedirected,
  saveClientFeedbackState,
  shouldSuggestGoogleReviewRedirect,
  submitOrderFeedback
} from "../features/feedback/feedback-model";

describe("feedback model", () =>
{
  beforeEach(() =>
  {
    window.localStorage.clear();
  });

  afterEach(() =>
  {
    window.localStorage.clear();
  });

  it("loads empty feedback state when storage is missing or invalid", () =>
  {
    expect(loadClientFeedbackState(window.localStorage).entries).toEqual([]);

    window.localStorage.setItem("pizzaos:client:feedback:v1", "{invalid");

    expect(loadClientFeedbackState(window.localStorage).entries).toEqual([]);
  });

  it("submits feedback and persists it for later hydration", () =>
  {
    const submittedState = submitOrderFeedback({
      state: loadClientFeedbackState(window.localStorage),
      orderId: "order-client-mock-001",
      rating: 5,
      comment: "Consegna super veloce.",
      submittedAtIso: "2026-03-25T19:45:00.000Z"
    });
    saveClientFeedbackState(submittedState, window.localStorage);

    const hydratedState = loadClientFeedbackState(window.localStorage);

    expect(hydratedState.entries).toHaveLength(1);
    expect(hydratedState.entries[0]?.orderId).toBe("order-client-mock-001");
    expect(hydratedState.entries[0]?.rating).toBe(5);
    expect(hydratedState.entries[0]?.comment).toBe("Consegna super veloce.");
  });

  it("marks Google review redirect only for existing feedback entries", () =>
  {
    const baseState = submitOrderFeedback({
      state: loadClientFeedbackState(window.localStorage),
      orderId: "order-client-mock-002",
      rating: 4
    });

    const updatedState = markGoogleReviewRedirected(baseState, "order-client-mock-002", "2026-03-25T20:01:00.000Z");
    const untouchedState = markGoogleReviewRedirected(baseState, "order-client-mock-missing", "2026-03-25T20:02:00.000Z");

    expect(updatedState.entries[0]?.googleReviewRedirectedAtIso).toBe("2026-03-25T20:01:00.000Z");
    expect(untouchedState.entries[0]?.googleReviewRedirectedAtIso).toBeNull();
  });

  it("derives when Google review redirect should be suggested", () =>
  {
    expect(shouldSuggestGoogleReviewRedirect(5)).toBe(true);
    expect(shouldSuggestGoogleReviewRedirect(4)).toBe(true);
    expect(shouldSuggestGoogleReviewRedirect(3)).toBe(false);
  });

  it("clears feedback persisted state", () =>
  {
    const submittedState = submitOrderFeedback({
      state: loadClientFeedbackState(window.localStorage),
      orderId: "order-client-mock-003",
      rating: 2
    });
    saveClientFeedbackState(submittedState, window.localStorage);

    const resetState = clearClientFeedbackState(window.localStorage);

    expect(resetState.entries).toEqual([]);
    expect(loadClientFeedbackState(window.localStorage).entries).toEqual([]);
  });
});
