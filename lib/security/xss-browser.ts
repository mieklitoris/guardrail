import { xssCases, xssDocument, type XssObservation } from "./vulnerability-labs";
import type { Profile } from "./engine";

/** Execute only the fixed probes in unique opaque origins, without parent DOM/cookie access. */
export function runXssBrowser(profile:Profile):Promise<XssObservation[]> {
 return Promise.all(xssCases.map(probe=>new Promise<XssObservation>(resolve=>{
  const frame=document.createElement("iframe");
  frame.setAttribute("sandbox","allow-scripts");
  frame.setAttribute("referrerpolicy","no-referrer");
  frame.setAttribute("aria-hidden","true");frame.tabIndex=-1;frame.hidden=true;
  const channel=crypto.randomUUID();
  const observation:XssObservation={id:probe.id,ready:false,completed:false,executed:false};
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;clearTimeout(timeout);window.removeEventListener("message",receive);frame.remove();resolve(observation);};
  const receive=(message:MessageEvent)=>{
   if(message.source!==frame.contentWindow||message.origin!=="null"||message.data?.channel!==channel)return;
   if(message.data.kind==="ready")observation.ready=true;
   if(message.data.kind==="executed")observation.executed=true;
   if(message.data.kind==="complete"){observation.completed=true;finish();}
  };
  const timeout=setTimeout(finish,4000);
  window.addEventListener("message",receive);
  frame.srcdoc=xssDocument(probe.id,profile,channel);
  document.body.appendChild(frame);
 })));
}
