import { test, expect } from "./fixtures/authenticator";

test.describe("Step-Up Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Register and login a user
    const username = `authuser_${Date.now()}`;
    await page.getByRole("button", { name: "New Account" }).click();
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill("testpass123");
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();
  });

  test("transfer triggers step-up and completes after passkey auth", async ({
    page,
  }) => {
    // First register a passkey
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Click Transfer Money — should trigger step-up
    await page.getByTestId("transfer-btn").click();

    // Should eventually show success after passkey auth completes
    await expect(page.getByTestId("transfer-message")).toHaveText(
      "Transfer completed successfully!",
    );
  });

  test("transfer without passkey shows error", async ({ page }) => {
    // Click Transfer Money without having a passkey
    await page.getByTestId("transfer-btn").click();

    // Should show step-up failure
    await expect(page.getByTestId("transfer-message")).toContainText(
      "Step-up failed",
    );
  });
});
