import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  await request.post('/__test_api', { data: { kind: 'reset' } });
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'guest');
  });
});

test('public pages keep semantic images, named actions and visible keyboard focus', async ({ page }) => {
  const consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  await page.addInitScript(()=>localStorage.removeItem('base44_access_token'));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/demos', ...['08','09','10','11','12','13'].map(id => `/store/rinno-demo-${id}`)]) {
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    const issues = await page.evaluate(() => {
      const visible = el => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };
      const unnamed = [...document.querySelectorAll('button,a[href]')].filter(visible).filter(el =>
        !(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim() || el.querySelector('img[alt]:not([alt=""])'))
      ).length;
      const missingAlt = [...document.images].filter(visible).filter(img => img.getAttribute('alt') === null).length;
      return { unnamed, missingAlt, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(issues, route).toEqual({ unnamed: 0, missingAlt: 0, overflow: 0 });
  }
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'RINNO inicio' })).toBeVisible();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement, s = getComputedStyle(el);
    return { tag: el?.tagName, outline: parseFloat(s.outlineWidth) || 0 };
  });
  expect(['A','BUTTON']).toContain(focus.tag);
  expect(focus.outline).toBeGreaterThanOrEqual(2);
  expect(consoleErrors).toEqual([]);
});

test('owner branding editor previews mobile and desktop without publishing drafts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'owner'));
  await page.goto('/settings');
  await expect(page.getByText('Vista previa en directo')).toBeVisible();
  await page.getByLabel('Eslogan principal').fill('Una marca en movimiento');
  await page.getByLabel('Vista escritorio').click();
  await expect(page.getByText('Una marca en movimiento')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar diseño original' }).click();
  await expect(page.getByText('Los cambios todavía no están publicados.')).toBeVisible();
});

test('interactive product story translates business goals into concrete benefits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#producto');
  const control = page.getByRole('tab', { name: 'Quiero tener control' });
  await control.click();
  await expect(control).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Deja de reconstruir el negocio cada mañana.' })).toBeVisible();
  await expect(page.getByText('Accesos según función y responsabilidad')).toBeVisible();
  const loyalty = page.getByRole('tab', { name: 'Quiero que vuelvan' });
  await loyalty.click();
  await expect(page.getByRole('heading', { name: 'Haz que tu negocio se sienta tan cuidado como tu producto.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quiero verlo en mi negocio' })).toHaveAttribute('href', '#solicitar-demo');
  const reservations = page.getByRole('tab', { name: 'Reservas' });
  await reservations.click();
  await expect(reservations).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: /El cliente consulta disponibilidad/ })).toBeVisible();
  await expect(page.getByText('Aplicación para tus clientes')).toBeVisible();
  await expect(page.getByText('Todos los precios incluyen IVA.')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
