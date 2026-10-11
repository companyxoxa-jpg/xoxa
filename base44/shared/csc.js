export function calculateDispensation({ quantity, limit, previousTotal = 0, stock = null, availability = 'available' }) {
  const grams=Number(quantity), monthlyLimit=Number(limit), used=Number(previousTotal)||0;
  if(!Number.isFinite(grams)||grams<=0)throw Object.assign(new Error('Cantidad no válida'),{status:400});
  if(!Number.isFinite(monthlyLimit)||monthlyLimit<=0)throw Object.assign(new Error('Configura primero el límite mensual del socio'),{status:409});
  const periodTotal=used+grams;
  if(periodTotal>monthlyLimit)throw Object.assign(new Error(`La operación supera el límite mensual configurado (${monthlyLimit} g)`),{status:409});
  if(availability==='unavailable')throw Object.assign(new Error('El artículo no está disponible'),{status:409});
  if(stock!==null&&stock!==undefined&&Number.isFinite(Number(stock))&&Number(stock)<grams)throw Object.assign(new Error(`Stock insuficiente (${Number(stock)} g disponibles)`),{status:409});
  const remaining=stock===null||stock===undefined||!Number.isFinite(Number(stock))?null:Math.max(0,Number(stock)-grams);
  return {grams,periodTotal,remaining,nextAvailability:remaining===null?availability:remaining===0?'unavailable':remaining<=10?'limited':availability};
}
