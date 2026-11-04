// Market-data connection bootstrap. No account or order API routes.
export const SCHWAB_CALLBACK_URL='https://ica-master-platform.ryanedavis.workers.dev/platform/schwab/callback';
const headers={
 'Cache-Control':'no-store',
 'Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
};
export function schwabConnectionStatus(env){
 return new Response(JSON.stringify({
  service:'schwab-market-data',
  appCredentialsConfigured:Boolean(env.SCHWAB_APP_KEY?.trim()&&env.SCHWAB_APP_SECRET?.trim()),
  callbackUrl:SCHWAB_CALLBACK_URL,
  authorizationReady:false,
  connected:false,
  marketDataConnected:false,
  realOrdersEnabled:false,
  stage:'APP_REGISTRATION',
  note:'App registration and provider activation must finish before the protected OAuth flow is enabled.'
 }),{headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
}
export function schwabCallback(){
 // Reject unsolicited callbacks. Never display, persist or log an authorization
 // code. Successful exchange will require one-time owner/session-bound state.
 return new Response('Schwab connection is not active yet. Return to ICA Master and start the connection there after app activation.',{
  status:400,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}
 });
}
