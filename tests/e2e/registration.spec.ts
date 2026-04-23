import { test, expect } from "./fixtures/authenticator";

test.describe("Passkey Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Register and login a user
    await page.getByRole("button", { name: "Register" }).click();
    const username = `passkeyuser_${Date.now()}`;
    await page.getByTestId("username").fill(username);
    await page.getByTestId("password").fill("testpass123");
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
    const items = page.getByTestId("passkey-item");
    await expect(items).toHaveCount(2);
  });
});
