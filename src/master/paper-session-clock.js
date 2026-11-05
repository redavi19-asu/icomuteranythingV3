/** NYSE regular-session timing for the private PAPER scanner (America/New_York). */
export const PAPER_SCAN_OPEN_MINUTE = 9*60+30;
export const PAPER_EXPIRY_EXIT_MINUTE = 15*60+55;
export const PAPER_MARKET_CLOSE_MINUTE = 16*60;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function expiryStatus(expiration,day){
 if(typeof expiration !== 'string'||!datePattern.test(expiration))return 'UNKNOWN';
 if(expiration < day)return 'EXPIRED';
 if(expiration === day)return 'EXPIRING_TODAY';
 return 'FUTURE';
}
export function paperSessionOpen(session){
 return !!session&&!['Sat','Sun'].includes(session.weekday)&&
  session.minute>=PAPER_SCAN_OPEN_MINUTE&&session.minute<PAPER_MARKET_CLOSE_MINUTE;
}
export function paperExpirationCloseDue(expiration,session){
 const expiry=expiryStatus(expiration,session.day);
 // Legacy paper positions with missing/invalid expiry must NOT be mistaken
 // for safe overnight options; conservatively close those at 3:55 too.
 return expiry==='EXPIRED'||((expiry==='UNKNOWN'||expiry==='EXPIRING_TODAY')&&session.minute>=PAPER_EXPIRY_EXIT_MINUTE);
}
export function paperEntryEligible(expiration,session){
 if(!paperSessionOpen(session))return false;
 const expiry=expiryStatus(expiration,session.day);
 // Do not open a 0DTE (or expired) option after the protective 3:55 cutoff.
 // Missing expiration is invalid for new late-day positions.
 return expiry==='FUTURE'||(expiry==='EXPIRING_TODAY'&&session.minute<PAPER_EXPIRY_EXIT_MINUTE);
}

/** Do not let the per-minute rotation throttle suppress the exact 9:30
 * transition if the most recent scheduled tick ran just before market open.
 * Subsequent 9:30 ticks still honor the 55-second rate limit. */
export function scheduledRotationDue(now,lastRotationAt,currentSession,previousSession){
 if(!Number.isFinite(lastRotationAt)||lastRotationAt<=0)return true;
 if(now<=lastRotationAt)return false;
 if(now-lastRotationAt>=55000)return true;
 return currentSession?.minute===PAPER_SCAN_OPEN_MINUTE&&
  previousSession?.day===currentSession.day&&
  previousSession.minute<PAPER_SCAN_OPEN_MINUTE&&
  !['Sat','Sun'].includes(currentSession.weekday);
}
