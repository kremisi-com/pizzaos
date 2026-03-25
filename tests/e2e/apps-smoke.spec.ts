import { test } from "@playwright/test";

test.describe("apps smoke", () =>
{
  test("placeholder", async () =>
  {
    test.skip(true, "E2E wiring starts in shared plan step 6.");
  });
});
