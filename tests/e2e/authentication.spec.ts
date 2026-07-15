import { test, expect } from "./fixtures/authenticator";

const PASSWORD = "testpass123";

test.describe("Step-Up Authentication", () => {
  let username: string;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Register and login a fresh user for each test
    username = `authuser_${Date.now()}`;
    await page.getByRole("button", { name: "New Account" }).click();
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill(PASSWORD);
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();
  });

  test("transfer triggers step-up and completes after passkey auth", async ({
    page,
  }) => {
    // Register a passkey so step-up can succeed
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Transfer triggers step-up, which the virtual authenticator satisfies
    await page.getByTestId("transfer-btn").click();

    await expect(page.getByTestId("transfer-message")).toHaveText(
      "Transfer completed successfully!",
    );
  });

  test("transfer without passkey shows error", async ({ page }) => {
    // No passkey registered — step-up cannot complete
    await page.getByTestId("transfer-btn").click();

    await expect(page.getByTestId("transfer-message")).toContainText(
      "Step-up failed",
    );
  });

  test("register, logout, login, then step-up transfer succeeds", async ({
    page,
  }) => {
    // Register a passkey, then start a fresh session
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Log out and log back in with the same credentials
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("username")).toBeVisible();

    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill(PASSWORD);
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();

    // The passkey persists across sessions, so step-up still succeeds
    await page.getByTestId("transfer-btn").click();

    await expect(page.getByTestId("transfer-message")).toHaveText(
      "Transfer completed successfully!",
    );
  });

  test("multiple step-up transfers in sequence", async ({ page }) => {
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Each transfer requires its own step-up ceremony
    await page.getByTestId("transfer-btn").click();
    await expect(page.getByTestId("transfer-message")).toHaveText(
      "Transfer completed successfully!",
    );

    await page.getByTestId("transfer-btn").click();
    await expect(page.getByTestId("transfer-message")).toHaveText(
      "Transfer completed successfully!",
    );
  });
});
