export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const defaults=()=>({"open":320,"out":610,"back":450,"close":180,"handmade":true,"curves":{"open":[{"x":0,"y":0,"hx":0.4870254379130234,"hy":0.49},{"x":1,"y":1,"hx":0.49,"hy":0.002034802181629175}],"out":[{"x":0,"y":0,"hx":0.2890961821487318,"hy":0.0037375119037315017},{"x":1,"y":1,"hx":0.49,"hy":0}],"back":[{"x":0,"y":0,"hx":0.3259989755576717,"hy":0.3737070960667186},{"x":1,"y":1,"hx":0.49,"hy":0.008673650189016826}],"close":[{"x":0,"y":0,"hx":0.3083591608230168,"hy":0.1653573427986033},{"x":1,"y":1,"hx":0.22,"hy":0}]}});
const bez=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
export function segments(points){return points.slice(0,-1).map((a,i)=>{const b=points[i+1],dx=b.x-a.x,dy=b.y-a.y;return {from:[a.x,a.y],to:[b.x,b.y],bezier:[a.hx/dx,a.hy/dy,1-b.hx/dx,1-b.hy/dy]};});}
export function ease(points,x){const s=segments(points).find(s=>x<=s.to[0])||segments(points).at(-1); const t=clamp((x-s.from[0])/(s.to[0]-s.from[0]));let lo=0,hi=1;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(bez(0,s.bezier[0],s.bezier[2],1,m)<t)lo=m;else hi=m;}return s.from[1]+(s.to[1]-s.from[1])*bez(0,s.bezier[1],s.bezier[3],1,(lo+hi)/2);}
export function pose(flap,photo,wiggle=0){return {flap,photo,wiggle};}
export function scene(p,base='./assets/'){
 const sy=Math.cos(Math.PI*p.flap),hinge=96;
 // Resolve the small source-art mismatch continuously near the closed pose.
 // Using pose rather than playback direction also keeps interruptions continuous.
 const blend=clamp(p.flap/.18);
 const closedOpacity=p.photo===0?1-blend*blend*(3-2*blend):0;
 const img=(name,extra='')=>`<image href="${base}${name}.svg" width="260" height="219" ${extra}/>`;
 // Keep only the original top-edge strip stationary; all other layers retain
 // the original transforms, assets and ordering.
 return `<svg viewBox="0 0 260 219" width="100%" aria-label="猫咪来信" role="img"><defs><clipPath id="pocket"><path d="M0 -100H260V171L69 188L60 97H0Z"/></clipPath><clipPath id="upper"><path d="M0 0H260V91L0 100Z"/></clipPath><clipPath id="lid"><path d="M62 102L192 95L198 102L137 151L121 152L61 103Z"/></clipPath><clipPath id="top-edge"><path d="M60 93L193 87L193 95L62 102Z"/></clipPath><clipPath id="body"><path d="M0 100L260 89V219H0Z"/></clipPath></defs><g transform="rotate(${p.wiggle} 130 175)" style="isolation:isolate"><g opacity="${1-closedOpacity}" style="mix-blend-mode:plus-lighter">${img('back','clip-path="url(#body)"')}${sy<0?`<g transform="translate(0 ${hinge*(1+sy)}) scale(1 ${-sy})">${img('back','clip-path="url(#upper)"')}</g>`:''}${sy>=0?img('closed','clip-path="url(#top-edge)"'):''}<g clip-path="url(#pocket)"><g transform="translate(${(1-p.photo)*7} ${(1-p.photo)*111})">${img('photo')}</g></g>${img('front')}${sy>=0?`<g transform="translate(0 ${hinge*(1-sy)}) scale(1 ${sy})">${img('closed','clip-path="url(#lid)"')}</g>`:''}</g>${img('closed',`opacity="${closedOpacity}" style="mix-blend-mode:plus-lighter"`)}</g></svg>`;
}
export class Motion {
 constructor(config){this.config=config;this.flap=0;this.photo=0;this.wiggle=0;this.target=false;this.phase=null;}
 setTarget(open){if(open===this.target)return;this.target=open;this.phase=null;this.wiggle=0;if(open&&this.flap===0&&this.photo===0)this.phase={key:'wiggle',start:0,end:1,time:0,duration:180};}
 step(dt,reduced=false){if(reduced){this.flap=this.photo=+this.target;this.wiggle=0;this.phase=null;return this;}
 if(!this.phase){const key=this.target?(this.flap<1?'open':this.photo<1?'out':null):(this.photo>0?'back':this.flap>0?'close':null);if(!key)return this;const prop=['open','close'].includes(key)?'flap':'photo',end=+this.target;this.phase={key,prop,start:this[prop],end,time:0,duration:this.config[key]*Math.abs(end-this[prop])};}
 const q=this.phase;q.time+=dt;const t=clamp(q.time/Math.max(1,q.duration));if(q.key==='wiggle')this.wiggle=Math.sin(t*Math.PI*4)*(1-t)*1.8;else {const sampled=this.config.handmade&&t<1?Math.floor(t*30)/30:t;this[q.prop]=q.start+(q.end-q.start)*ease(this.config.curves[q.key],sampled);}// Once the photo is fully behind the front, skip its invisible easing tail.
 if(q.key==='back'&&this.photo<=.03){this.photo=0;this.phase=null;return this.step(0,reduced);}
 if(t===1){this.wiggle=0;this.phase=null;const remaining=Math.max(0,q.time-q.duration);if(remaining>0)return this.step(remaining,reduced);}return this;}
 get active(){return !!this.phase || (this.target?(this.flap<1||this.photo<1):(this.flap>0||this.photo>0));}
}
