import { test, expect } from "./fixtures/authenticator";

const PASSWORD = "testpass123";

test.describe("Passwordless Passkey Login", () => {
  test("register a passkey, log out, then log back in with the passkey", async ({
    page,
  }) => {
    await page.goto("/");

    // Register a fresh user and add a passkey
    const username = `pwless_${Date.now()}`;
    await page.getByRole("button", { name: "New Account" }).click();
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill(PASSWORD);
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();

    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Log out, then log back in using only the username + passkey (no password)
    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("username")).toBeVisible();

    await page.getByTestId("username").fill(username);
    await page.getByTestId("passkey-login-btn").click();

    // A session is established purely via the passkey
    await expect(page.getByTestId("welcome-user")).toHaveText(username);
  });

  test("passkey login for a user with no passkey shows an error", async ({
    page,
  }) => {
    await page.goto("/");

    // Register a user but never add a passkey
    const username = `nopk_${Date.now()}`;
    await page.getByRole("button", { name: "New Account" }).click();
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill(PASSWORD);
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();

    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("username")).toBeVisible();

    // Attempting passkey login fails with the "no passkeys" message
    await page.getByTestId("username").fill(username);
    await page.getByTestId("passkey-login-btn").click();

    await expect(page.getByTestId("auth-error")).toContainText(
      "No passkeys registered",
    );
  });

  test("passkey login without a username prompts for one", async ({ page }) => {
    await page.goto("/");

    // Click the passkey button with an empty username field
    await page.getByTestId("passkey-login-btn").click();

    await expect(page.getByTestId("auth-error")).toContainText(
      "Enter your username",
    );
  });
});
