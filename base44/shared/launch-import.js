const clean=(v,n=240)=>String(v??'').trim().slice(0,n);
const money=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.round(n*100):NaN};
const email=v=>clean(v,160).toLowerCase();
const image=v=>{const x=clean(v,2048);return !x||/^https:\/\/[^\s]+$/i.test(x)};
export const IMPORT_HEADERS={products:['name','category','price','unit_type','sku','image','stock_quantity'],services:['name','description','price','duration_minutes','image'],professionals:['name','specialty','service_names'],customers:['first_name','last_name','email','phone','marketing_consent']};

export function prepareLaunchImport(kind,rows,existing=[]){
 if(!IMPORT_HEADERS[kind])throw new Error('Tipo de importación no válido');if(!Array.isArray(rows)||!rows.length)throw new Error('El archivo no contiene filas');if(rows.length>1000)throw new Error('Máximo 1000 filas por importación');
 const existingKeys=new Set(existing.map(x=>keyFor(kind,x)).filter(Boolean)),seen=new Set();
 const result=rows.map((raw,i)=>{const errors=[],data=normalize(kind,raw),key=keyFor(kind,data);if(!key)errors.push('Falta el identificador principal');if(key&&existingKeys.has(key))errors.push('Ya existe en el negocio');if(key&&seen.has(key))errors.push('Duplicado en el archivo');if(key)seen.add(key);
  if(kind==='products'){if(!data.name)errors.push('Nombre obligatorio');if(!Number.isInteger(data.price)||data.price<0)errors.push('Precio no válido');if(!['kg','gram','unit','tray','bunch','bag','box'].includes(data.unit_type))errors.push('Unidad no válida');if(!image(data.image))errors.push('Imagen no válida');if(!Number.isFinite(data.stock_quantity)||data.stock_quantity<0)errors.push('Stock no válido')}
  if(kind==='services'){if(!data.name)errors.push('Nombre obligatorio');if(!Number.isInteger(data.price)||data.price<0)errors.push('Precio no válido');if(!Number.isInteger(data.duration_minutes)||data.duration_minutes<5||data.duration_minutes>480)errors.push('Duración entre 5 y 480 minutos');if(!image(data.image))errors.push('Imagen no válida')}
  if(kind==='professionals'&&!data.name)errors.push('Nombre obligatorio');
  if(kind==='customers'){if(!data.first_name)errors.push('Nombre obligatorio');if(data.phone.replace(/\D/g,'').length<8)errors.push('Teléfono no válido');if(data.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email))errors.push('Email no válido')}
  return{row:i+2,key,data,errors};});
 return{rows:result,valid:result.filter(x=>!x.errors.length),summary:{total:result.length,create:result.filter(x=>!x.errors.length).length,invalid:result.filter(x=>x.errors.length).length}};
}
function keyFor(kind,x){if(kind==='products')return clean(x.sku||x.name).toLowerCase();if(kind==='customers')return email(x.email)||clean(x.phone).replace(/\D/g,'');return clean(x.name).toLowerCase()}
function normalize(kind,r){
 if(kind==='products')return{name:clean(r.name),category:clean(r.category)||'General',price:money(r.price),unit_type:clean(r.unit_type)||'unit',sku:clean(r.sku)||null,image:clean(r.image)||null,stock_quantity:Number(r.stock_quantity||0)};
 if(kind==='services')return{name:clean(r.name),description:clean(r.description,1000),price:money(r.price),duration_minutes:Number(r.duration_minutes),image:clean(r.image)||null};
 if(kind==='professionals')return{name:clean(r.name),specialty:clean(r.specialty),service_names:clean(r.service_names,1000).split('|').map(x=>x.trim()).filter(Boolean)};
 return{first_name:clean(r.first_name),last_name:clean(r.last_name),email:email(r.email)||null,phone:clean(r.phone,40),marketing_consent:['true','sí','si','1','yes'].includes(clean(r.marketing_consent).toLowerCase())};
}
