import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', heading: 'Schematron in pure Rust.' },
  { path: '/why/', heading: 'Why this crate' },
  { path: '/tutorial/', heading: 'Tutorial' },
  { path: '/library/', heading: 'Library' },
  { path: '/cli/', heading: 'Command line' },
  { path: '/conformance/', heading: 'Conformance' },
  { path: '/spec/', heading: 'Specification' },
  { path: '/help/', heading: 'Help' },
  { path: '/about/', heading: 'About' }
];

for (const { path, heading } of PAGES) {
  test.describe('page: ' + path, () => {
    test('responds with a non-error status', async ({ page }) => {
      const res = await page.goto(path);
      expect(res, 'navigation response').not.toBeNull();
      expect(res!.status(), 'http status').toBeLessThan(400);
    });

    test('renders exactly one H1, with the expected text', async ({ page }) => {
      await page.goto(path);
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(heading);
    });

    test('marks its own nav link as the current page', async ({ page }) => {
      await page.goto(path);
      const current = page.locator('.site-nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', path);
    });

    test('offers a skip link to the main landmark', async ({ page }) => {
      await page.goto(path);
      const skip = page.locator('a.skip-link');
      await expect(skip).toHaveAttribute('href', '#main');
      await expect(page.locator('main#main')).toHaveCount(1);
    });

    test('has a document title and a meta description', async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/schematron/);
      const description = page.locator('head meta[name="description"]');
      await expect(description).toHaveCount(1);
    });
  });
}

test('every internal link resolves to a real page', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const { path } of PAGES) {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') ?? '')
    );
    for (const href of hrefs) {
      const target = href.split('#')[0];
      if (!target || seen.has(target)) continue;
      seen.add(target);
      const res = await request.get(target);
      expect(res.status(), 'status for ' + target).toBeLessThan(400);
    }
  }
});
