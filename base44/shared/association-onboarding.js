export function normalizeAssociationSetup(input={}){
 const minimum_age=Math.trunc(Number(input.minimum_age)||18);
 const default_monthly_limit_grams=Number(input.default_monthly_limit_grams)||60;
 const membership_fee_cents=Math.round((Number(input.membership_fee)||0)*100);
 if(minimum_age<18||minimum_age>99)throw new Error('La edad mínima debe estar entre 18 y 99 años');
 if(default_monthly_limit_grams<=0||default_monthly_limit_grams>500)throw new Error('El límite mensual debe estar entre 0 y 500 g');
 if(membership_fee_cents<0||membership_fee_cents>10_000_000)throw new Error('La cuota no es válida');
 return {minimum_age,default_monthly_limit_grams,membership_fee_cents,membership_plan_name:String(input.membership_plan_name||'Membresía anual').trim().slice(0,120)||'Membresía anual'};
}

export function initialAssociationChecklist(){return[
 {key:'identity',label:'Revisar identidad, logo y datos de contacto',status:'pending'},
 {key:'owner',label:'Activar el acceso del propietario',status:'pending'},
 {key:'legal',label:'Revisión jurídica de estatutos, privacidad y normas',status:'external_review'},
 {key:'policies',label:'Publicar versiones legales aprobadas',status:'pending'},
 {key:'staff',label:'Crear y comprobar los accesos del personal',status:'pending'},
 {key:'members',label:'Importar o crear los primeros socios',status:'pending'},
 {key:'mobile_pilot',label:'Completar la prueba móvil de dueño, empleado y socio',status:'pending'},
 {key:'backup',label:'Descargar y custodiar la primera copia JSON',status:'pending'},
];}
