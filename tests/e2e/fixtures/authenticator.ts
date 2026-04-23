/**
 * Extended Playwright test fixture with a CDP virtual authenticator.
 * Sets up a CTAP2 internal authenticator with resident key and user verification
 * on the actual test page (not a throwaway page).
 */
import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    const cdpSession = await page.context().newCDPSession(page);

    await cdpSession.send("WebAuthn.enable");
    await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
