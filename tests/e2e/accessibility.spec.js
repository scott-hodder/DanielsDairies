import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const publicPages = [
  ['/index.html', 'landing'],
  ['/login.html', 'login'],
  ['/signup.html', 'signup'],
  ['/privacy-policy.html', 'privacy policy'],
  ['/terms-of-service.html', 'terms of service']
]

for (const [path, name] of publicPages) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const blocking = results.violations.filter(v => ['serious', 'critical'].includes(v.impact))
    expect(blocking, blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length})`).join('\n')).toEqual([])
  })
}
