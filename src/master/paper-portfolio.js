import {stepPaper} from './paper-session.js';

// The legacy single position is migrated in place; cash and closed history are retained.
export function normalizePaperPortfolio(runner){
 const paper=runner.paper;
 if(!Array.isArray(paper.positions))paper.positions=paper.position?[{...paper.position,closeRequested:!!runner.closeRequested,mark:runner.mark||null}]:[];
 for(const p of paper.positions)if(!p.id)p.id=p.symbol+'|'+p.time;
 paper.position=paper.positions[0]||null;
 runner.mark=paper.position?.mark||null;
 runner.closeRequested=paper.positions.some(p=>p.closeRequested);
 runner.entryEpoch=Number.isInteger(runner.entryEpoch)?runner.entryEpoch:0;
 return runner;
}
export function enterPaperPosition(runner,alert,quote,options={}){
 normalizePaperPortfolio(runner);
 const previous=runner.paper.positions;
 if(previous.some(p=>p.id===alert.id))throw Error('This opportunity is already accepted. Select Open Trades to manage it.');
 const next=stepPaper({...runner.paper,position:null},{...options,quote,enter:true});
 const position={...next.position,id:alert.id,alertId:alert.id,style:alert.style||null,maxHoldMinutes:alert.style?.type==='INTRADAY_HOLD'?390:30,closeRequested:false,mark:{bid:quote.bid,ask:quote.ask,quoteTime:quote.quoteTime,pnl:Math.round(((quote.bid-0.01)*100-0.65-next.position.cost)*100)/100}};
 next.positions=[...previous,position];runner.paper=next;normalizePaperPortfolio(runner);
 return position;
}
export function managePaperPosition(runner,id,quote,options={}){
 normalizePaperPortfolio(runner);
 const previous=runner.paper.positions,position=previous.find(p=>p.id===id);
 if(!position)return null;
 const next=stepPaper({...runner.paper,position},{...options,quote,close:!!position.closeRequested});
 const mark={bid:quote.bid,ask:quote.ask,quoteTime:quote.quoteTime,pnl:Math.round(((quote.bid-0.01)*100-0.65-position.cost)*100)/100};
 next.positions=next.position?previous.map(p=>p.id===id?{...next.position,mark,lastError:null}:p):previous.filter(p=>p.id!==id);
 runner.paper=next;normalizePaperPortfolio(runner);
 return next.positions.find(p=>p.id===id)||null;
}
