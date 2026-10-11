import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
  await request.post('/__test_api', { data: { kind: 'reset' } });
  await page.addInitScript(() => localStorage.setItem('base44_access_token', 'test-only'));
});

test('rinno.es opens with the commercial landing, pricing and every template', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Deja de perseguir tu negocio/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toHaveAttribute('href', '/login?returnTo=%2Fpanel');
  await expect(page.getByText('24,95 €', { exact: true })).toBeVisible();
  await expect(page.getByText('39,99')).toBeVisible();
  await expect(page.getByText(/cuota única de alta de 399 €/i)).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Social Club' })).toBeVisible();
  await expect(page.locator('#demos a[href^="/store/rinno-demo-"]')).toHaveCount(6);
  await page.getByRole('button', { name: /Social Club/ }).click();
  await expect(page.getByRole('heading', { name: /app preparada para tu social club/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Probar esta demo' })).toHaveAttribute('href','/store/rinno-demo-13');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('rinno registration stays invitation-only while each store keeps its own customer signup', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Acceso solo por invitación' })).toBeVisible();
  await expect(page.getByText(/No existe registro público/)).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await page.goto('/store/rinno-demo-08/login');
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/store/rinno-demo-08/register');
});

test('a visitor requests a demo from mobile and the lead reaches the admin pipeline', async ({ browser }) => {
  const guest=await browser.newContext({viewport:{width:390,height:844}}); const page=await guest.newPage();
  await page.goto('/');
  await page.getByRole('link',{name:'Quiero descubrir mi RINNO'}).click();
  await page.getByLabel('Tu nombre').fill('Lucía Ramos');
  await page.getByLabel('Nombre del negocio').fill('Estudio Lucía');
  await page.getByLabel('Correo').fill('lucia@example.test');
  await page.getByLabel('Teléfono').fill('600123123');
  await page.getByLabel('Tipo de negocio').selectOption('Centro de belleza');
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Quiero mi demo'}).click();
  await expect(page.getByRole('heading',{name:'Solicitud recibida'})).toBeVisible();
  await guest.close();
  const admin=await browser.newContext(); await admin.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')}); const adminPage=await admin.newPage();
  await adminPage.goto('/command-center');
  await adminPage.getByRole('button',{name:'Solicitudes'}).first().click();
  await expect(adminPage.getByText('Estudio Lucía')).toBeVisible();
  await expect(adminPage.getByText('lucia@example.test')).toBeVisible();
  await adminPage.getByRole('button',{name:'Completar alta'}).click();
  await expect(adminPage.getByRole('heading',{name:'Nuevo negocio'})).toBeVisible();
  await expect(adminPage.getByPlaceholder('Frutas Paco')).toHaveValue('Estudio Lucía');
  await expect(adminPage.getByPlaceholder('hola@frutaspaco.es')).toHaveValue('lucia@example.test');
  await admin.close();
});

test('the six current demos expose the correct customer experience', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  for (const demo of ['08', '09', '12']) {
    await page.goto(`/store/rinno-demo-${demo}`);
    await expect(page.getByRole('button', { name: /^Añadir / }).first()).toBeVisible();
  }
  for (const demo of ['10', '11']) {
    await page.goto(`/store/rinno-demo-${demo}`);
    await expect(page.getByRole('heading', { name: /Encuentra tu momento|Tu momento de calma/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reservar/ }).first()).toBeVisible();
  }
  await page.goto('/store/rinno-demo-13');
  await expect(page.getByRole('heading', { name: 'Próximas actividades' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Acceso privado' })).toHaveAttribute('href', '/store/rinno-demo-13/login');
});

test('all public demos fit narrow and standard mobile screens without horizontal overflow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const demo of ['08','09','10','11','12','13']) {
      await page.goto(`/store/rinno-demo-${demo}`);
      await expect(page.locator('body')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `demo ${demo} has horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
  await page.goto('/store/rinno-demo-13');
  await expect(page.getByRole('link',{name:'Socios'})).toHaveAttribute('href','/store/rinno-demo-13/login');
});

test('admin and establishment workspaces remain usable on narrow mobile screens', async ({ browser }) => {
  async function mobile(role, width) {
    const context=await browser.newContext({viewport:{width,height:844}});
    await context.addInitScript(value=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role',value)},role);
    return {context,page:await context.newPage()};
  }
  for (const width of [320,390]) {
    for (const [role,routes] of [['admin',['/command-center']],['commercial',['/command-center']],['owner',['/panel','/orders','/catalog','/agenda','/customers','/settings','/member-import','/initial-import']]]) {
      const session=await mobile(role,width);
      for (const route of routes) {
        await session.page.goto(route);
        await expect(session.page.locator('body')).toBeVisible();
        const overflow=await session.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
        expect(overflow,`${role} ${route} has horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      }
      await session.context.close();
    }
  }
});

test('a guest order is completed from narrow mobile; staff updates the customer exactly once', async ({ browser }) => {
  const guest = await browser.newContext({viewport:{width:320,height:700}});
  await guest.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  const page = await guest.newPage();
  await page.goto('/store/rinno-demo-12');
  await page.getByRole('button', { name: /^Añadir / }).first().click();
  await page.getByRole('button', { name: /Ver carrito ·/ }).click();
  await page.getByRole('button', { name: /tramitar|continuar|realizar/i }).click();
  const firstName=page.getByPlaceholder('Nombre *');
  const lastName=page.getByPlaceholder('Apellidos');
  const firstNameBox=await firstName.boundingBox();
  const lastNameBox=await lastName.boundingBox();
  expect(lastNameBox.y).toBeGreaterThan(firstNameBox.y+firstNameBox.height-1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /^\d{2}:\d{2} – \d{2}:\d{2}$/ }).first().click();
  await firstName.fill('Cliente Prueba');
  await page.getByPlaceholder('Teléfono *').fill('600000000');
  await page.getByRole('button', { name: /CONFIRMAR PEDIDO/ }).click();
  await expect(page).toHaveURL(/\/track\//);
  await expect(page.getByRole('heading', { name: '¡Pedido recibido!' })).toBeVisible();
  await guest.close();
  const staff = await browser.newContext();
  await staff.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'commerce_staff');
  });
  const staffPage = await staff.newPage();
  await staffPage.goto('/orders');
  await expect(staffPage.getByText('Cliente Prueba', { exact: true })).toBeVisible();
  await staffPage.getByText('Cliente Prueba', { exact: true }).click();
  for (const action of ['Aceptar pedido', 'Empezar a preparar', 'Marcar como listo', 'Entregado']) {
    await staffPage.getByRole('button', { name: action, exact: true }).click();
  }
  await expect(staffPage.getByText('ENTREGADO', { exact: true })).toBeVisible();
  await staffPage.goto('/customers');
  await expect(staffPage.getByText('1 pedido(s)', { exact: true })).toBeVisible();
  await staffPage.getByText('Cliente Prueba', { exact: true }).click();
  await expect(staffPage.getByText('Pedidos', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
  await staffPage.reload();
  await expect(staffPage.getByText('Pedidos', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
  await staff.close();
});

test('commerce staff can edit its catalog from mobile without crossing tenant data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'commerce_staff');
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/catalog');
  const product = page.locator('a[href^="/catalog/"]:not([href="/catalog/new"]):not([href="/catalog/prices"])').first();
  await product.click();
  await expect(page.getByRole('heading', { name: 'Editar producto', exact: true })).toBeVisible();
  const name = page.locator('main input').first();
  const original = await name.inputValue();
  await name.fill(`${original} QA`);
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText(`${original} QA`, { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('long establishment editors remain usable on a narrow mobile screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'owner');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Servicios', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir servicio', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
  await expect(dialog.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('association owner can reach every mobile tool and use long editors', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'association_owner');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/panel');
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await expect(page.getByRole('link', { name: /Facturación/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
  await page.goto('/activities');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nueva actividad', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('association staff mobile menu exposes operations but no owner data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'association_staff');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/panel');
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  for (const allowed of ['Socios', 'Actividades', 'Escáner QR', 'Club CSC', 'Documentos']) {
    await expect(page.getByRole('link', { name: new RegExp(allowed) }).first()).toBeVisible();
  }
  for (const privateItem of ['Cuotas', 'Credenciales', 'Privacidad', 'Exportar', 'Configuración', 'Facturación']) {
    await expect(page.getByRole('link', { name: new RegExp(privateItem) })).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('association member portal stays usable and tenant branded on narrow mobile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'customer');
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/store/rinno-demo-13/account/association');
  await expect(page.getByText('María de la Comunidad con Nombre Largo García', { exact: true })).toBeVisible();
  for (const tab of ['Carné', 'Catálogo', 'Actividades', 'Perfil', 'Inicio']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await expect(page.getByText('Socio activo anual', { exact: true })).toBeVisible();
  await expect(page.getByText('RINNO', { exact: true })).toHaveCount(0);
});

test('customer registration and address forms stack cleanly on narrow mobile', async ({ browser }) => {
  let context = await browser.newContext({ viewport: { width: 320, height: 568 } });
  await context.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  let page = await context.newPage();
  await page.goto('/store/rinno-demo-12/register');
  const firstName = await page.getByLabel('Nombre *').boundingBox();
  const lastName = await page.getByLabel('Apellidos').boundingBox();
  expect(lastName.y).toBeGreaterThan(firstName.y + firstName.height - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await context.close();

  context = await browser.newContext({ viewport: { width: 320, height: 568 } });
  await context.addInitScript(() => {
    localStorage.setItem('base44_access_token', 'test-only');
    localStorage.setItem('test_role', 'customer');
  });
  page = await context.newPage();
  await page.goto('/store/rinno-demo-12/account/addresses');
  await page.getByRole('button', { name: /Añadir dirección/ }).click();
  const city = page.locator('input').nth(2);
  const postcode = page.locator('input').nth(3);
  const cityBox = await city.boundingBox();
  const postcodeBox = await postcode.boundingBox();
  expect(postcodeBox.y).toBeGreaterThan(cityBox.y + cityBox.height - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await context.close();
});

test('every customer account screen remains usable on narrow mobile',async({browser})=>{
  const context=await browser.newContext({viewport:{width:320,height:700}});
  await context.addInitScript(()=>{
    localStorage.setItem('base44_access_token','test-only');
    localStorage.setItem('test_role','customer');
    localStorage.setItem('rinno_last_store','rinno-demo-12');
  });
  const page=await context.newPage();
  const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  for(const route of [
    '/store/rinno-demo-12/account',
    '/store/rinno-demo-12/account/orders',
    '/store/rinno-demo-12/account/addresses',
    '/store/rinno-demo-12/account/profile',
    '/store/rinno-demo-12/account/appointments',
  ]){
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),`${route} has horizontal overflow`).toBeLessThanOrEqual(1);
  }
  expect(errors,`customer account console errors: ${errors.join(' | ')}`).toEqual([]);
  await context.close();
});

test('cart never mixes products from two businesses', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'guest'));
  await page.goto('/store/rinno-demo-08');
  await page.getByRole('button', { name: /^Añadir / }).first().click();
  await page.goto('/store/rinno-demo-09');
  await page.getByRole('button', { name: /^Añadir / }).first().click();
  await expect(page.getByText('Tu carrito tiene productos de otro comercio.')).toBeVisible();
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('rinno_cart')));
  expect(cart.businessSlug).toBe('rinno-demo-08');
  expect(cart.items).toHaveLength(1);
});

test('customer reserves; an employee sees and confirms the appointment', async ({ page }) => {
  const day = new Date(); day.setDate(day.getDate() + 2); const date = day.toISOString().slice(0, 10);
  await page.goto('/store/rinno-demo-10');
  await page.getByRole('button', { name: /Corte clásico 30 min/ }).last().click();
  await page.getByRole('button', { name: /Laura Especialista/ }).last().click();
  await page.getByLabel('Fecha de la cita').fill(date);
  await page.getByRole('button', { name: '09:00', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).last().fill('Cliente Prueba');
  await page.getByLabel('Teléfono', { exact: true }).last().fill('600000000');
  await page.getByRole('checkbox').last().check();
  await page.getByRole('button', { name: 'Solicitar reserva' }).last().click();
  await expect(page.getByText('Solicitud recibida', { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('test_role', 'staff'));
  await page.goto('/agenda');
  await page.getByLabel('Fecha', { exact: true }).fill(date);
  await expect(page.getByRole('heading', { name: /Cliente Prueba/ })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await page.getByRole('button',{name:'Servicios',exact:true}).click();
  await expect(page.getByRole('button',{name:'Añadir servicio',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Editar',exact:true})).toHaveCount(0);
});

test('admin, commercial, establishment and customer areas stay separated', async ({ browser }) => {
  async function rolePage(role) {
    const context = await browser.newContext();
    await context.addInitScript(value => { localStorage.setItem('base44_access_token', 'test-only'); localStorage.setItem('test_role', value); }, role);
    return { context, page: await context.newPage() };
  }
  let session = await rolePage('admin');
  await session.page.goto('/orders');
  await expect(session.page).toHaveURL(/\/command-center$/);
  await session.page.getByRole('button', { name: 'Negocios', exact: true }).click();
  await expect(session.page.getByRole('heading', { name: 'Gestión de negocios', exact: true })).toBeVisible();
  await expect(session.page.getByRole('button', { name: /Por revisar/ })).toBeVisible();
  await expect(session.page.getByText('Demos publicadas (6)')).toBeVisible();
  await session.page.getByRole('button', { name: 'Nuevo negocio' }).click();
  await expect(session.page.getByRole('heading', { name: 'Nuevo negocio' })).toBeVisible();
  await session.page.getByRole('button', { name: '✕' }).click();
  await session.page.getByRole('button', { name: 'Cobro de alta nueva', exact: true }).click();
  await expect(session.page.getByRole('heading', { name: 'Cobro de alta nueva' })).toBeVisible();
  await expect(session.page.getByText(/Solo visibles para Super Admin/)).toBeVisible();
  await session.context.close();

  session = await rolePage('commercial');
  await session.page.goto('/command-center');
  await expect(session.page.getByRole('heading', { name: 'Venta y demostración' })).toBeVisible();
  await expect(session.page.getByRole('button', { name: 'Cobros', exact: true })).toHaveCount(0);
  await session.page.goto('/command-center/showcase/association');
  await expect(session.page.getByRole('heading', { name: 'Tres experiencias, un solo club.' })).toBeVisible();
  await session.page.getByRole('button', { name: /Empleado/ }).click();
  await expect(session.page.getByRole('heading', { name: 'Vista de empleado' })).toBeVisible();
  await session.page.goto('/orders');
  await expect(session.page).toHaveURL(/\/command-center$/);
  await session.context.close();

  session = await rolePage('customer');
  await session.page.goto('/orders');
  await expect(session.page).toHaveURL(/\/demos$/);
  await session.context.close();

  session = await rolePage('owner');
  await session.page.goto('/account/appointments');
  await expect(session.page).toHaveURL(/\/panel$/);
  await session.context.close();
});

test('staff keeps operational access while owner-only tools reject direct URLs',async({browser})=>{
  async function open(role){const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(value=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role',value)},role);return {context,page:await context.newPage()}}
  let session=await open('staff');
  for(const route of ['/orders','/catalog','/agenda','/customers']){
    await session.page.goto(route);
    await expect(session.page).toHaveURL(new RegExp(`${route}$`));
  }
  for(const route of ['/settings','/billing','/initial-import','/member-import','/association-finances','/credentials','/association-export','/association-compliance','/association-setup']){
    await session.page.goto(route);
    await expect(session.page).toHaveURL(/\/panel$/);
    await session.page.waitForLoadState('networkidle');
  }
  await expect(session.page.getByText('Facturación',{exact:true})).toHaveCount(0);
  expect(await session.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await session.context.close();

  session=await open('owner');
  await session.page.goto('/settings');
  await expect(session.page.getByRole('heading',{name:'Configuración',exact:true})).toBeVisible();
  await session.page.goto('/billing');
  await expect(session.page.getByRole('heading',{name:'Suscripción y cobros',exact:true})).toBeVisible();
  await session.context.close();
});

test('every Super Admin navigation button opens the intended tool and safe actions respond', async ({ page }) => {
  await page.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')});
  await page.goto('/command-center');
  const sections=[
    ['Información detallada','Información detallada'],
    ['Negocios','Gestión de negocios'],
    ['Clientes','Expedientes de clientes'],
    ['Cobro de alta nueva','Cobro de alta nueva'],
    ['Formulario de alta','Nueva contratación'],
    ['Contratos','Contratos'],
    ['Documentación','Documentación'],
    ['Comerciales','Equipo comercial'],
    ['Solicitudes','Altas comerciales'],
  ];
  for(const [button,heading] of sections){
    await page.getByRole('button',{name:button,exact:true}).first().click();
    await expect(page.getByRole('heading',{name:heading,exact:true}).first()).toBeVisible();
  }
  await page.getByRole('button',{name:'Negocios',exact:true}).first().click();
  await page.getByRole('button',{name:'Nuevo negocio',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nuevo negocio',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'✕'}).click();
  await page.getByRole('button',{name:'Cobro de alta nueva',exact:true}).first().click();
  await page.getByRole('button',{name:'Alta rápida y cobro',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nuevo negocio',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'✕'}).click();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('Super Admin completes a temporary onboarding, receives checkout and can archive and restore it', async ({ page }) => {
  await page.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')});
  await page.goto('/command-center');
  await page.getByRole('button',{name:'Cobro de alta nueva',exact:true}).first().click();
  await page.getByRole('button',{name:'Alta rápida y cobro',exact:true}).click();
  await page.getByPlaceholder('Frutas Paco').fill('Comercio Temporal QA');
  await page.getByPlaceholder('hola@frutaspaco.es').fill('qa-temporal@rinno.test');
  await page.getByPlaceholder('600 123 456').first().fill('600000001');
  await page.getByPlaceholder('Calle Mayor 10').fill('Calle Pruebas 1');
  await page.getByPlaceholder('Madrid').first().fill('Madrid');
  await page.getByPlaceholder('28001').fill('28001');
  await page.getByRole('button',{name:/Siguiente/}).click();
  await expect(page.getByText('/store/comercio-temporal-qa')).toBeVisible();
  await page.getByRole('button',{name:/Siguiente/}).click();
  await page.getByRole('button',{name:/Siguiente/}).click();
  await page.getByRole('button',{name:/Siguiente/}).click();
  await page.getByPlaceholder('Paco',{exact:true}).fill('Responsable QA');
  await page.getByPlaceholder('paco@frutaspaco.es').fill('responsable-qa@rinno.test');
  await page.getByRole('button',{name:/Siguiente/}).click();
  await expect(page.getByText('Comercio Temporal QA',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Crear alta y enlace de pago',exact:true}).click();
  await expect(page.getByText('Alta preparada y enlace listo')).toBeVisible();
  await expect(page.locator('input[readonly]')).toHaveValue(/checkout\.stripe\.test/);

  await page.getByRole('button',{name:'Negocios',exact:true}).first().click();
  await expect(page.getByText('Comercio Temporal QA',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Clientes',exact:true}).first().click();
  await expect(page.getByText('Comercio Temporal QA',{exact:true})).toBeVisible();

  await page.getByRole('button',{name:'Negocios',exact:true}).first().click();
  await page.getByRole('button',{name:'Eliminar Comercio Temporal QA'}).click();
  await expect(page.getByRole('heading',{name:'Retirar negocio'})).toBeVisible();
  await page.getByLabel('Nombre exacto').fill('Comercio Temporal QA');
  await page.getByRole('button',{name:'Retirar del panel'}).click();
  await expect(page.getByText('Retirados (1)')).toBeVisible();
  await page.getByRole('button',{name:'Restaurar Comercio Temporal QA'}).click();
  await expect(page.getByRole('heading',{name:'Restaurar negocio'})).toBeVisible();
  await page.getByLabel('Nombre exacto').fill('Comercio Temporal QA');
  await page.getByRole('button',{name:'Restaurar',exact:true}).click();
  await expect(page.getByText('Retirados (1)')).toHaveCount(0);
});

test('document annulment uses an audited in-app confirmation with a sufficient reason',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')});
  await page.goto('/command-center');
  await page.getByRole('button',{name:'Documentación',exact:true}).first().click();
  await expect(page.getByText('RGPD-2026-000001')).toBeVisible();
  await page.getByRole('button',{name:'Anular documento'}).click();
  await expect(page.getByRole('heading',{name:'Anular documento'})).toBeVisible();
  const confirm=page.getByRole('button',{name:'Anular documento',exact:true});
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Motivo de anulación').fill('Documento sustituido por una versión corregida.');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole('article').getByText('Anulado',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Anular documento'})).toHaveCount(0);
});

test('commercial access removal uses an explicit in-app confirmation and keeps financial areas private',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/command-center');
  await page.getByRole('button',{name:'Comerciales',exact:true}).first().click();
  await expect(page.getByText('seller@rinno.test',{exact:true})).toBeVisible();
  await expect(page.getByText('commercial2@rinno.test',{exact:true})).toBeVisible();
  await expect(page.getByText('Sin acceso a dinero, facturación, métricas privadas ni expedientes.').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:'Eliminar seller@rinno.test',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Eliminar acceso comercial',exact:true})).toBeVisible();
  await expect(page.getByText(/registros históricos de sus gestiones permanecerán/)).toBeVisible();
  await page.getByRole('button',{name:'Eliminar acceso',exact:true}).click();
  await expect(page.getByText('seller@rinno.test',{exact:true})).toHaveCount(0);
});

test('landing and protected routes send every authenticated role to its own area', async ({ browser }) => {
  async function openAs(role, setup) {
    const context=await browser.newContext();
    await context.addInitScript(({role,setup})=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role',role);if(setup?.slug)localStorage.setItem('rinno_last_store',setup.slug)},{role,setup});
    return {context,page:await context.newPage()};
  }
  for (const [role,href] of [['admin','/command-center'],['owner','/panel'],['staff','/panel'],['commercial','/command-center']]) {
    const session=await openAs(role);
    await session.page.goto('/');
    await expect(session.page.getByRole('link',{name:'Ir a mi panel'})).toHaveAttribute('href',href);
    await session.context.close();
  }
  let session=await openAs('customer',{slug:'rinno-demo-12'});
  await session.page.goto('/');
  await expect(session.page.getByRole('link',{name:'Ir a mi panel'})).toHaveAttribute('href','/store/rinno-demo-12/account');
  await session.page.goto('/panel');
  await expect(session.page).toHaveURL(/\/store\/rinno-demo-12\/account$/);
  await session.context.close();

  session=await openAs('admin');
  await session.page.goto('/account/appointments');
  await expect(session.page).toHaveURL(/\/command-center$/);
  await session.context.close();
});

test('business owner sees exact billing terms and no public signup is introduced', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('test_role', 'owner'));
  await page.goto('/billing');
  await expect(page.getByRole('heading', { name: 'Suscripción y cobros' })).toBeVisible();
  await expect(page.getByText('399 €', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('24,95 €/mes', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Mes completo incluido · después prorrateo', { exact: true })).toBeVisible();
  await expect(page.getByText(/La contratación y el enlace de pago los prepara exclusivamente el equipo autorizado de RINNO/)).toBeVisible();
  await expect(page.getByText('Sin permanencia', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar al pago seguro' })).toHaveCount(0);
  await expect(page.getByText('Aquí no se puede contratar ni activar ningún cobro.')).toBeVisible();
});

test('Super Admin business detail uses the public domain and exposes safe lock diagnostics',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('base44_access_token','test-only');localStorage.setItem('test_role','admin')});
  await page.goto('/command-center/businesses/retail-store');
  await expect(page.getByRole('heading',{name:'Retail',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Abrir tienda',exact:true})).toHaveAttribute('href','https://rinno.es/store/rinno-demo-12');
  await expect(page.getByText('Límites aplicados automáticamente por el servidor según el plan contratado.')).toBeVisible();
  await expect(page.getByText(/no enforced server-side/i)).toHaveCount(0);
  await page.getByRole('button',{name:'Inspeccionar',exact:true}).click();
  await expect(page.getByText('Sin bloqueo',{exact:true})).toBeVisible();
});
