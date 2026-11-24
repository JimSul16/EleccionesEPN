import { expect, test } from '@playwright/test';

/**
 * Pruebas de humo de la app en un navegador móvil (Pixel 7).
 * No necesitan backend: cubren la navegación sin sesión y la validación de la
 * cédula en el cliente. El flujo con datos se prueba con los emuladores
 * (tests/integracion) y en el teléfono (docs/setup/PRUEBA-TELEFONO.md).
 */

const campoCedula = 'ion-input[formcontrolname="cedula"] input';

test('la raíz redirige al login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(campoCedula)).toBeVisible();
});

test('una ruta protegida sin sesión vuelve al login', async ({ page }) => {
  await page.goto('/veedor');
  await expect(page).toHaveURL(/\/login$/);
});

test('una cédula con dígito verificador incorrecto muestra su error', async ({ page }) => {
  await page.goto('/login');
  const cedula = page.locator(campoCedula);
  await cedula.fill('1712345670');
  await cedula.blur();
  await expect(page.getByText('El dígito verificador no es válido.')).toBeVisible();
});

test('una cédula válida no muestra error', async ({ page }) => {
  await page.goto('/login');
  const cedula = page.locator(campoCedula);
  await cedula.fill('1712345675');
  await cedula.blur();
  await expect(page.getByText('El dígito verificador no es válido.')).toHaveCount(0);
});
