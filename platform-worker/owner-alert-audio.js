// ICA PRIME owner-only personal alert clip. The original user audio is NOT
// committed into GitHub Pages or served as a public static file.
const headers={
 'Cache-Control':'private, no-store, max-age=0',
 'Content-Security-Policy':"default-src 'none'",
 'X-Content-Type-Options':'nosniff'
};
export const OWNER_MONEY_ALERT_TABLE=`CREATE TABLE IF NOT EXISTS owner_money_alert_audio (
 owner_id TEXT PRIMARY KEY,
 audio_base64 TEXT NOT NULL,
 mime_type TEXT NOT NULL DEFAULT 'audio/mp4',
 updated_at INTEGER NOT NULL
)`;
export async function ownerMoneyAlertApi(request,env,owner){
 if(!owner||owner.role!=='owner')return Response.json({error:'Owner login required.'},{status:403,headers});
 if(!['GET','DELETE'].includes(request.method))return Response.json({error:'Method not allowed.'},{status:405,headers});
 // Only an authenticated owner may retrieve or remove their own recording.
 // Avoid sending a copyrighted song excerpt to every public visitor.
 try{
  await env.DB.prepare(OWNER_MONEY_ALERT_TABLE).run();
  if(request.method==='DELETE'){
   const origin=request.headers.get('Origin');
   const approved=['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'];
   if(!approved.includes(origin))return Response.json({error:'Origin not allowed.'},{status:403,headers});
   await env.DB.prepare('DELETE FROM owner_money_alert_audio WHERE owner_id=?').bind(owner.id).run();
   return Response.json({ok:true},{headers});
  }
  const row=await env.DB.prepare('SELECT audio_base64,mime_type FROM owner_money_alert_audio WHERE owner_id=? LIMIT 1').bind(owner.id).first();
  if(!row)return Response.json({error:'No personal alert installed.'},{status:404,headers});
  const encoded=String(row.audio_base64||'');
  if(!encoded||encoded.length>650000||!/^[A-Za-z0-9+/=]+$/.test(encoded))
   return Response.json({error:'Personal alert is invalid.'},{status:503,headers});
  const binary=atob(encoded),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Response(bytes,{status:200,headers:{...headers,'Content-Type':'audio/mp4','Content-Length':String(bytes.byteLength)}});
 }catch(error){
  return Response.json({error:'Private audio unavailable.'},{status:503,headers});
 }
}
