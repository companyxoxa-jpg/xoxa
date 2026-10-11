export function findLinkableMember(members,user){
  if(user?.is_verified!==true)return null;
  const email=String(user?.email||'').trim().toLowerCase();
  if(!email)return null;
  const matches=(members||[]).filter(m=>String(m.email||'').trim().toLowerCase()===email);
  if(matches.length!==1)return null;
  return !matches[0].user_id||matches[0].user_id===user.id?matches[0]:null;
}
