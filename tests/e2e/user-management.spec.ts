import { test, expect } from "@playwright/test";

test.describe("User Management", () => {
  test("register new user and login shows dashboard", async ({ page }) => {
    await page.goto("/");

    // Switch to register tab
    await page.getByRole("button", { name: "Register" }).click();

    // Fill in form
    await page.getByTestId("username").fill("testuser");
    await page.getByTestId("password").fill("testpass123");
    await page.getByTestId("submit-btn").click();

    // Should see dashboard with welcome message
    await expect(page.getByTestId("welcome-user")).toHaveText("testuser");
  });

  test("login with wrong password shows error", async ({ page }) => {
    // First register a user via API
    await page.goto("/");
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByTestId("username").fill("wrongpassuser");
    await page.getByTestId("password").fill("correctpass");
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toHaveText("wrongpassuser");

    // Logout
    await page.getByTestId("logout-btn").click();

    // Try login with wrong password
    await page.getByTestId("username").fill("wrongpassuser");
    await page.getByTestId("password").fill("badpassword");
    await page.getByTestId("submit-btn").click();

    // Should see error
    await expect(page.getByTestId("auth-error")).toHaveText(
      "Invalid credentials",
    );
  });

  test("logout returns to login page", async ({ page }) => {
    await page.goto("/");

    // Register and login
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByTestId("username").fill("logoutuser");
    await page.getByTestId("password").fill("testpass123");
    await page.getByTestId("submit-btn").click();
    await expect(page.getByTestId("welcome-user")).toHaveText("logoutuser");

    // Logout
    await page.getByTestId("logout-btn").click();

    // Should see login form
    await expect(page.getByTestId("username")).toBeVisible();
    await expect(page.getByTestId("submit-btn")).toBeVisible();
  });
});
