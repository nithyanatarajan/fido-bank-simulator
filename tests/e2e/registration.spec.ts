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
    // Click Add Passkey
    await page.getByTestId("add-passkey-btn").click();

    // Wait for success message
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Passkey should appear in the list
    const items = page.getByTestId("passkey-item");
    await expect(items).toHaveCount(1);
  });

  test("register multiple passkeys from different authenticators", async ({
    page,
  }) => {
    // Register first passkey (using the authenticator from the fixture)
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Add a second virtual authenticator to simulate a different device
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "usb",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    // Register second passkey from the new authenticator
    await page.getByTestId("add-passkey-btn").click();
    await expect(page.getByTestId("passkey-message")).toHaveText(
      "Passkey registered successfully!",
    );

    // Both passkeys should appear in the list
    const items = page.getByTestId("passkey-item");
    await expect(items).toHaveCount(2);
  });
});
