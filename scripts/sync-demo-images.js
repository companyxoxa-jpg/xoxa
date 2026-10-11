const imageUrl = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
const changes = [
  ['rinno-demo-08', 'Category', 'slug', 'temporada', 'photo-1518843875459-f738682238a6'],
  ['rinno-demo-09', 'Product', 'slug', 'demo-0', 'photo-1588168333986-5078d3ae3976'],
  ['rinno-demo-09', 'Category', 'slug', 'aves', 'photo-1604503468506-a8da13d82791'],
  ['rinno-demo-09', 'Category', 'slug', 'cerdo', 'photo-1432139509613-5c4255815697'],
  ['rinno-demo-12', 'Product', 'slug', 'demo-4', 'photo-1544816155-12df9643f363'],
  ['rinno-demo-12', 'Product', 'slug', 'demo-5', 'photo-1553062407-98eeb64c6a62'],
  ['rinno-demo-12', 'Product', 'slug', 'demo-7', 'photo-1603006905003-be475563bc59'],
  ['rinno-demo-12', 'Category', 'slug', 'mas-vendido', 'photo-1472851294608-062f824d29cc'],
];

let updated = 0;
for (const [businessSlug, entityName, field, value, imageId] of changes) {
  const [business] = await base44.entities.Business.filter({ slug: businessSlug });
  if (!business) throw new Error(`Missing demo business: ${businessSlug}`);
  const entity = base44.entities[entityName];
  const [record] = await entity.filter({ business_id: business.id, [field]: value });
  if (!record) throw new Error(`Missing ${entityName} ${businessSlug}/${value}`);
  await entity.update(record.id, { image: imageUrl(imageId) });
  updated += 1;
}
console.log(JSON.stringify({ ok: true, updated }));
