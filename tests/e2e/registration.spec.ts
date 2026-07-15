import { test, expect } from "./fixtures/authenticator";

const PASSWORD = "testpass123";

test.describe("Passkey Registration", () => {
  let username: string;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Register and login a fresh user for each test
    username = `passkeyuser_${Date.now()}`;
    await page.getByRole("button", { name: "New Account" }).click();
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill(PASSWORD);
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toBeVisible();
  });

  test("register a passkey and see it in the list", async ({ page }) => {
    await page.getByTestId("add-passkey-btn").click();

    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    const items = page.getByTestId("passkey-item");
    await expect(items).toHaveCount(1);
  });

  test("register multiple passkeys from same device", async ({ page }) => {
    // Register first passkey
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Register second passkey from the same authenticator
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Both passkeys should appear in the list
    await expect(page.getByTestId("passkey-item")).toHaveCount(2);
  });

  test("delete a passkey and verify it is removed", async ({ page }) => {
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );
    await expect(page.getByTestId("passkey-item")).toHaveCount(1);

    // Delete it and confirm the list is empty
    await page.getByTestId("delete-passkey-btn").first().click();
    await expect(page.getByTestId("passkey-item")).toHaveCount(0);
  });

  test("delete passkey and re-register", async ({ page }) => {
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Remove the passkey...
    await page.getByTestId("delete-passkey-btn").first().click();
    await expect(page.getByTestId("passkey-item")).toHaveCount(0);

    // ...then register a new one to confirm re-registration works
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );
    await expect(page.getByTestId("passkey-item")).toHaveCount(1);
  });
});
