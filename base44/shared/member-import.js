const STATUSES=new Set(['pending','active','suspended','resigned','expired']);
const clean=v=>String(v??'').trim();
const email=v=>clean(v).toLowerCase();
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const ageOn=(birth,now=new Date())=>{const[y,m,d]=birth.split('-').map(Number);let age=now.getUTCFullYear()-y;if(now.getUTCMonth()+1<m||(now.getUTCMonth()+1===m&&now.getUTCDate()<d))age--;return age};
export const MEMBER_IMPORT_HEADERS=['member_number','first_name','last_name','email','phone','birth_date','status','monthly_limit_grams','plan_code','start_date','end_date'];

export function prepareMemberImport(rows,existing=[],plans=[],options={}){
 if(!Array.isArray(rows)||!rows.length)throw new Error('El archivo no contiene socios');if(rows.length>1000)throw new Error('Máximo 1000 filas por importación');
 const mode=options.mode==='update_existing'?'update_existing':'create_only',minimumAge=Math.max(0,Number(options.minimum_age)||0),byNumber=new Map(existing.map(x=>[clean(x.member_number),x])),byEmail=new Map(existing.filter(x=>x.email).map(x=>[email(x.email),x])),planByCode=new Map(plans.map(x=>[clean(x.code).toLowerCase(),x]));
 const seenNumber=new Set(),seenEmail=new Set(),result=[],maxNumber=existing.reduce((m,x)=>Math.max(m,parseInt(x.member_number,10)||0),0);let next=maxNumber+1;
 for(let i=0;i<rows.length;i++){
  const raw=rows[i]||{},errors=[],number=clean(raw.member_number)||String(next++),mail=email(raw.email),first=clean(raw.first_name),last=clean(raw.last_name),birth=clean(raw.birth_date),status=clean(raw.status)||'active',limit=raw.monthly_limit_grams===''||raw.monthly_limit_grams==null?null:Number(raw.monthly_limit_grams),planCode=clean(raw.plan_code).toLowerCase(),start=clean(raw.start_date),end=clean(raw.end_date);
  if(!first)errors.push('Nombre obligatorio');if(!last)errors.push('Apellidos obligatorios');if(mail&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail))errors.push('Email no válido');if(birth&&(!validDate(birth)||(minimumAge&&ageOn(birth)<minimumAge)))errors.push(minimumAge?`Debe cumplir ${minimumAge} años`:'Fecha de nacimiento no válida');if(!STATUSES.has(status))errors.push('Estado no válido');if(limit!==null&&(!Number.isFinite(limit)||limit<=0||limit>500))errors.push('Límite mensual no válido');if(start&&!validDate(start))errors.push('Fecha de inicio no válida');if(end&&!validDate(end))errors.push('Fecha de fin no válida');if(start&&end&&end<start)errors.push('La fecha de fin es anterior al inicio');
  if(seenNumber.has(number))errors.push('Número repetido en el archivo');seenNumber.add(number);if(mail){if(seenEmail.has(mail))errors.push('Email repetido en el archivo');seenEmail.add(mail)}
  const numberMatch=byNumber.get(number),emailMatch=mail?byEmail.get(mail):null;if(numberMatch&&emailMatch&&numberMatch.id!==emailMatch.id)errors.push('Número y email pertenecen a socios distintos');const current=numberMatch||emailMatch||null;if(current&&mode==='create_only')errors.push('El socio ya existe');if(planCode&&!planByCode.has(planCode))errors.push('Plan no encontrado');
  const plan=planCode?planByCode.get(planCode):null;result.push({row:i+2,action:current?'update':'create',existing_id:current?.id||null,data:{member_number:number,first_name:first,last_name:last,email:mail||null,phone:clean(raw.phone)||null,birth_date:birth||null,status,monthly_limit_grams:limit},membership:plan?{plan_id:plan.id,plan_code:plan.code,start_date:start||new Date().toISOString().slice(0,10),end_date:end||null}:null,errors});
 }
 return {mode,rows:result,valid:result.filter(x=>!x.errors.length),invalid:result.filter(x=>x.errors.length),summary:{total:result.length,create:result.filter(x=>!x.errors.length&&x.action==='create').length,update:result.filter(x=>!x.errors.length&&x.action==='update').length,invalid:result.filter(x=>x.errors.length).length}};
}
