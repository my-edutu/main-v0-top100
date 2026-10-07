/** Convert a team-local datetime input into one unambiguous ISO timestamp. */
export function localDateTimeToIso(value:string,timeZone:string):string {
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
 if(!match)throw new Error('Choose a valid date and time.')
 const desired=match.slice(1).map(Number);const target=Date.UTC(desired[0],desired[1]-1,desired[2],desired[3],desired[4]);let candidate=target
 const format=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
 const parts=(stamp:number)=>{const p=format.formatToParts(new Date(stamp));return ['year','month','day','hour','minute'].map(key=>Number(p.find(x=>x.type===key)?.value))}
 const equal=(a:number[],b:number[])=>a.every((x,i)=>x===b[i])
 for(let i=0;i<4;i++){const seen=parts(candidate);if(equal(seen,desired))break;candidate+=target-Date.UTC(seen[0],seen[1]-1,seen[2],seen[3],seen[4])}
 if(!equal(parts(candidate),desired))throw new Error('That local time does not exist because of a clock change. Choose another time.')
 if(equal(parts(candidate-60*60_000),desired)||equal(parts(candidate+60*60_000),desired))throw new Error('That local time occurs twice. Choose a different time to avoid a scheduling conflict.')
 return new Date(candidate).toISOString()
}
