export const DEMO_SERVICES = {
  'wellness-hybrid': [['Ritual facial', 5500, 60], ['Masaje relajante', 4800, 60]],
  'salon-studio': [['Corte y acabado', 2800, 45], ['Color personalizado', 6500, 90], ['Tratamiento hidratante', 3500, 30]],
  'barber-club': [['Corte clásico', 1800, 30], ['Corte y barba', 2600, 45], ['Arreglo de barba', 1200, 20]],
  'barber-studio': [['Corte clásico', 1800, 30], ['Corte y barba', 2600, 45], ['Afeitado de navaja', 2200, 30], ['Ritual de barba', 1600, 25]],
  'beauty-calm': [['Ritual facial', 5500, 60], ['Manicura esencial', 2400, 45], ['Masaje relajante', 4800, 60]],
  'beauty-spa': [['Ritual facial luminoso', 6500, 60], ['Masaje relajante', 5500, 60], ['Manicura esencial', 2800, 45], ['Ritual cuerpo completo', 8900, 90]],
};
export const DEMO_PRODUCTS = {
  'fresh-market': [
    ['Tomate rosa de temporada', 495, 'kg', 'photo-1592924357228-91a4daadcfea', 'temporada'],
    ['Cesta de fruta semanal', 1890, 'unit', 'photo-1619566636858-adf3ef46400b', 'cestas'],
    ['Aguacate premium', 725, 'kg', 'photo-1523049673857-eb18f1d7b578', 'fruta'],
    ['Naranja de mesa', 295, 'kg', 'photo-1547514701-42782101795e', 'fruta'],
    ['Calabacín local', 320, 'kg', 'photo-1563252722-6434563a985d', 'verdura'],
    ['Ramo de aromáticas', 290, 'unit', 'photo-1585325701165-351af916e581', 'temporada'],
  ],
  'butcher-craft': [
    ['Entrecot madurado', 2690, 'kg', 'photo-1588168333986-5078d3ae3976', 'vacuno'],
    ['Pollo de corral', 995, 'kg', 'photo-1587593810167-a84920ea0781', 'aves'],
    ['Hamburguesa de la casa', 390, 'unit', 'photo-1568901346375-23c9450c58cd', 'elaborados'],
    ['Costilla para horno', 1290, 'kg', 'photo-1544025162-d76694265947', 'cerdo'],
    ['Brochetas artesanas', 475, 'unit', 'photo-1529193591184-b1d58069ecdd', 'elaborados'],
    ['Solomillo selección', 3290, 'kg', 'photo-1551028150-64b9f398f678', 'vacuno'],
  ],
  'wellness-hybrid': [['Aceite de cuidado corporal', 2200, 'unit', 'photo-1608571423902-eed4a5ad8108'], ['Kit de bienestar', 3500, 'unit', 'photo-1556229010-6c3f2c9ca5f8']],
  'butcher-premium': [['Entrecot de selección', 2490, 'kg', 'photo-1546964124-0cce460f38ef'], ['Pollo de corral', 890, 'kg', 'photo-1532550907401-a500c9a57435'], ['Hamburguesas artesanas', 350, 'unit', 'photo-1550547660-d9450f859349']],
  'bakery-warm': [['Hogaza de masa madre', 450, 'unit', 'photo-1509440159596-0249088772ff'], ['Croissant de mantequilla', 180, 'unit', 'photo-1555507036-ab1f4038808a'], ['Pan de semillas', 390, 'unit', 'photo-1549931319-a545dcf3bc73']],
  'retail-store': [
    ['Camiseta de algodón', 2490, 'unit', 'photo-1523275335684-37898b6baf30', 'novedades'],
    ['Sudadera premium', 5990, 'unit', 'photo-1556228720-195a672e8a03', 'novedades'],
    ['Bote térmico', 2990, 'unit', 'photo-1526170375885-4d8ecf77b99f', 'mas-vendido'],
    ['Gafas de sol', 3490, 'unit', 'photo-1572635196237-14b3f281503f', 'mas-vendido'],
    ['Cuaderno linen', 1590, 'unit', 'photo-1544816155-12df9643f363', 'especial'],
    ['Bolsa tote', 1990, 'unit', 'photo-1553062407-98eeb64c6a62', 'especial'],
    ['Taza de cerámica', 1290, 'unit', 'photo-1505740420928-5e560c06d30e', 'especial'],
    ['Vela aromática', 1890, 'unit', 'photo-1603006905003-be475563bc59', 'especial'],
  ],
};
// Optional per-template extra categories. When present, demo-api creates them
// and assigns products to the category slug in product[4]; otherwise all
// products land in the default 'seleccion' category (existing behavior).
export const DEMO_CATEGORIES = {
  'fresh-market': [
    { name: 'De temporada', slug: 'temporada', image: 'photo-1518843875459-f738682238a6' },
    { name: 'Fruta', slug: 'fruta', image: 'photo-1610832958506-aa56368176cf' },
    { name: 'Verdura', slug: 'verdura', image: 'photo-1597362925123-77861d3fbac7' },
    { name: 'Cestas', slug: 'cestas', image: 'photo-1488459716781-31db52582fe9' },
  ],
  'butcher-craft': [
    { name: 'Vacuno', slug: 'vacuno', image: 'photo-1603048297172-c92544798d5a' },
    { name: 'Aves', slug: 'aves', image: 'photo-1604503468506-a8da13d82791' },
    { name: 'Cerdo', slug: 'cerdo', image: 'photo-1432139509613-5c4255815697' },
    { name: 'Elaborados', slug: 'elaborados', image: 'photo-1529692236671-f1f6cf9683ba' },
  ],
  'retail-store': [
    { name: 'Novedades', slug: 'novedades', image: 'photo-1483985988355-763728e1935b' },
    { name: 'Más vendido', slug: 'mas-vendido', image: 'photo-1472851294608-062f824d29cc' },
    { name: 'Especial', slug: 'especial', image: 'photo-1556742502-ec7c0e9f34b1' },
  ],
};
export const DEMO_PEOPLE = [
  { name: 'Laura', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' },
  { name: 'Álex', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
];

// Demonstration copy only. Every installed pilot marks these records as
// provisional so a qualified lawyer can replace them before a real club
// publishes them to members.
export const CSC_PILOT_POLICIES = [
  { kind:'privacy', title:'Privacidad y tratamiento de datos · BORRADOR', version:'demo-2026.1', minimum_age:null, content:'DOCUMENTO DEMOSTRATIVO PENDIENTE DE REVISIÓN JURÍDICA. La asociación tratará los datos identificativos y de contacto necesarios para gestionar la condición de socio, las cuotas, el acceso, las actividades y las obligaciones internas. El socio puede solicitar acceso, rectificación y supresión mediante los canales oficiales de la entidad. No publiques este texto para una asociación real sin adaptarlo a su responsable, base jurídica, plazos de conservación y ejercicio de derechos.' },
  { kind:'statutes', title:'Estatutos sociales · BORRADOR', version:'demo-2026.1', minimum_age:null, content:'DOCUMENTO DEMOSTRATIVO PENDIENTE DE REVISIÓN JURÍDICA. La participación está limitada a personas admitidas por la asociación conforme a sus estatutos. La condición de socio exige respetar los acuerdos de la asamblea, las normas de convivencia, la privacidad de las demás personas y los procedimientos internos. Este resumen no sustituye los estatutos inscritos de la entidad.' },
  { kind:'rules', title:'Normas internas y uso responsable · BORRADOR', version:'demo-2026.1', minimum_age:null, content:'DOCUMENTO DEMOSTRATIVO PENDIENTE DE REVISIÓN JURÍDICA. El acceso es personal e intransferible. La credencial no puede compartirse. La información del catálogo es privada para socios y no constituye publicidad ni oferta pública. Deben respetarse los límites personales, las indicaciones del equipo y las normas de convivencia de la sede.' },
  { kind:'age_declaration', title:'Declaración de mayoría de edad · BORRADOR', version:'demo-2026.1', minimum_age:18, content:'DOCUMENTO DEMOSTRATIVO PENDIENTE DE REVISIÓN JURÍDICA. Declaro que los datos de nacimiento facilitados son veraces y que cumplo la edad mínima configurada por la asociación. Comprendo que la entidad puede solicitar documentación para verificar mi identidad y edad antes de activar el acceso.' },
];
