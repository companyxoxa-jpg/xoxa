const QA_APP_ID='6aca8950491b4b2d74f6f62d';
const QA_ORIGIN=`https://preview-sandbox--${QA_APP_ID}.base44.app`;

export function billingReturnOrigin(appId, configuredOrigin) {
  if(appId===QA_APP_ID) return QA_ORIGIN;
  const value=configuredOrigin||'https://rinno.es';
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.origin!==value) throw new Error('Origen de facturación no válido');
  return url.origin;
}
