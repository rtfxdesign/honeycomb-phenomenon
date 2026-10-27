// honeycomb-hover.js — the comb-assembly hover effect from the Claude Design
// exploration "Honeycomb Comb Hover Effect (standalone)", used as the ground
// of every password gate (/, /rice, /john-mack). Taken as designed; the only
// changes are the module wrapper (an ES export instead of window.HoneyHover)
// and the cursor glow taking its colour from `glow` so a partner gate can tint it.
//
// attach(element, options) -> { update(opts), destroy() }
/* HoneyHover.attach(element, options) -> {update(opts), destroy()}
   Edges snap in from depth around the pointer: one line, then two on its ends,
   then two more, then the closer. Each finished cell sprouts 1–maxSpawn neighbours
   inside the radius. Cells the pointer leaves detach back into depth after `linger`.
   The canvas sits at z-index 0 inside the element — give your content
   position:relative; z-index:1 so it paints above. */
const SQ=Math.sqrt(3),DIRS=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const hexA=(hex,a)=>{const n=parseInt(String(hex).slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
const C=x=>x<0?0:x>1?1:x,snap=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)},fly=x=>x*x*x,fade=x=>1-(1-x)*(1-x);
function rot(P,O,A,th){const x=P[0]-O[0],y=P[1]-O[1],z=P[2]-O[2],c=Math.cos(th),s=Math.sin(th),d=A[0]*x+A[1]*y+A[2]*z;return[O[0]+x*c+(A[1]*z-A[2]*y)*s+A[0]*d*(1-c),O[1]+y*c+(A[2]*x-A[0]*z)*s+A[1]*d*(1-c),O[2]+z*c+(A[0]*y-A[1]*x)*s+A[2]*d*(1-c)]}
const DEF={cell:116,radius:260,depth:500,maxSpawn:4,linger:.9,lineWidth:2,flash:true,cursorGlow:true,color:'#f2bf49',glow:'#fc9226',honey:'#f7d27a',stage:.2,arrive:.36,depart:.6,cam:1700,reducedMotion:'auto'};
function attach(el,opts){
 let o=Object.assign({},DEF,opts);
 if(getComputedStyle(el).position==='static')el.style.position='relative';
 const cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';el.insertBefore(cv,el.firstChild);
 const ctx=cv.getContext('2d');let w=0,h=0,dpr=1;
 const fit=()=>{const r=el.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);w=r.width;h=r.height;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);kick()};
 const ro=new ResizeObserver(fit);ro.observe(el);
 const reduce=()=>o.reducedMotion===true||(o.reducedMotion==='auto'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 let cells=new Map,edges=new Map;const m={x:0,y:0,in:false,last:null};
 const pos=(q,r)=>[o.cell*1.5*q,o.cell*SQ*(r+q/2)];
 const vert=(q,r,k)=>{const[x,y]=pos(q,r),a=Math.PI/3*(k%6);return[x+o.cell*Math.cos(a),y+o.cell*Math.sin(a)]};
 const hexAt=(x,y)=>{const s=o.cell,qf=(2/3*x)/s,rf=(-1/3*x+SQ/3*y)/s,sf=-qf-rf;let q=Math.round(qf),r=Math.round(rf),z=Math.round(sf);const dq=Math.abs(q-qf),dr=Math.abs(r-rf),dz=Math.abs(z-sf);if(dq>dr&&dq>dz)q=-r-z;else if(dr>dz)r=-q-z;return[q,r]};
 const cellOf=(q,r)=>{const k=q+','+r;let c=cells.get(k);if(!c){const[x,y]=pos(q,r);c={k,q,r,x,y,state:'idle',g:0,e0:0,st:-1,keys:[],near:0,done:-9};cells.set(k,c)}return c};
 const edgeOf=(q,r,i)=>{const A=vert(q,r,i),B=vert(q,r,i+1),k=[A,B].map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).sort().join('|');let e=edges.get(k);if(!e){e={k,A,B,tIn:null,tOut:null,users:new Set,rr:[Math.random(),Math.random(),Math.random(),Math.random()]};edges.set(k,e)}return e};
 const STAGES=[[0],[1,-1],[2,-2],[3]];
 const start=(c,g,e0,now)=>{c.state='build';c.g=g;c.e0=e0;c.st=-1;c.keys=[];c.near=now};
 const want=(e,c,now)=>{e.users.add(c.k);if(e.tIn===null){e.tIn=now;e.tOut=null;e.rr=e.rr.map(()=>Math.random())}else if(e.tOut!==null){if(now<e.tOut)e.tOut=null;else{e.tIn=now;e.tOut=null}}};
 const release=(c,now)=>{c.state='idle';for(const k of c.keys){const e=edges.get(k);if(!e)continue;e.users.delete(c.k);if(!e.users.size&&e.tOut===null)e.tOut=now+Math.random()*.25}c.keys=[]};
 const spawn=(c,now)=>{if(!m.in)return;const nb=DIRS.map((d,i)=>({c:cellOf(c.q+d[0],c.r+d[1]),i})).filter(n=>n.c.state==='idle'&&Math.hypot(n.c.x-m.x,n.c.y-m.y)<o.radius);for(let i=nb.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nb[i],nb[j]]=[nb[j],nb[i]]}nb.slice(0,1+Math.floor(Math.random()*o.maxSpawn)).forEach(n=>start(n.c,now+.04+Math.random()*.22,(n.i+3)%6,now))};
 let raf=0,t0=performance.now();const now=()=>(performance.now()-t0)/1000;
 function step(){const t=now();
  if(m.in){const[q,r]=hexAt(m.x,m.y),c=cellOf(q,r);if(c.state==='idle'){let e0=Math.floor(Math.random()*6);if(m.last){const dx=m.last[0]-c.x,dy=m.last[1]-c.y;if(dx||dy){const a=(Math.atan2(dy,dx)*180/Math.PI+360)%360;e0=Math.floor(a/60)%6}}start(c,t,e0,t)}
   for(const c of cells.values())if(c.state!=='idle'&&Math.hypot(c.x-m.x,c.y-m.y)<o.radius)c.near=t}
  for(const c of cells.values()){if(c.state==='idle')continue;
   if(t-c.near>o.linger){release(c,t);continue}
   if(c.state==='build'){const si=Math.min(3,Math.floor((t-c.g)/o.stage));while(c.st<si){c.st++;for(const off of STAGES[c.st]){const e=edgeOf(c.q,c.r,(c.e0+off+6)%6);want(e,c,t);if(!c.keys.includes(e.k))c.keys.push(e.k)}}
    if(t>=c.g+3*o.stage+o.arrive){c.state='built';c.done=t;spawn(c,t)}}}
  draw(t);
  let busy=m.in;for(const e of edges.values())if(e.tIn!==null){busy=true;break}
  raf=busy?requestAnimationFrame(step):0}
 function kick(){if(!raf)raf=requestAnimationFrame(step)}
 function pose(e,t){if(e.tIn===null)return null;let u,a=1;
  if(t<e.tIn+o.arrive){const x=(t-e.tIn)/o.arrive;u=1-snap(C(x));a=fade(C(x*2.5));e.out=false}
  else if(e.tOut===null||t<e.tOut)return 'still';
  else{const x=(t-e.tOut)/o.depart;if(x>=1){if(!e.users.size){e.tIn=null;e.tOut=null}return null}u=fly(x);a=1-fade(C((x-.45)/.55));e.out=true}
  const[r0,r1,r2,r3]=e.rr,out=e.out,sg=(out?r3:r0)<.5?-1:1,z=sg*o.depth*(.55+.8*(out?r0:r1)),M=[(e.A[0]+e.B[0])/2,(e.A[1]+e.B[1])/2,0];
  let ax=[r1-.5,r2-.5,r3-.5];const l=Math.hypot(...ax)||1;ax=ax.map(v=>v/l);
  const ang=u*(out?1.9:1.2)*sg,ox=(r2-.5)*o.cell*1.4*u,oy=(r3-.5)*o.cell*1.4*u,cx=w/2,cy=h/2;
  const pr=p=>{const q=rot([p[0],p[1],0],M,ax,ang),zz=q[2]+z*u;if(o.cam+zz<200)return null;const k=o.cam/(o.cam+zz);return[cx+(q[0]+ox-cx)*k,cy+(q[1]+oy-cy)*k,k]};
  const p1=pr(e.A),p2=pr(e.B);return p1&&p2?{p1,p2,a}:null}
 function draw(t){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const lw=o.lineWidth;ctx.lineCap='round';ctx.lineJoin='round';
  if(o.cursorGlow&&m.in){const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,o.radius*1.2);g.addColorStop(0,hexA(o.glow,.10));g.addColorStop(1,hexA(o.glow,0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
  if(o.flash)for(const c of cells.values()){const x=(t-c.done)/.7;if(x<0||x>=1)continue;ctx.globalAlpha=.18*(1-fade(x));ctx.fillStyle=o.honey;ctx.beginPath();for(let k=0;k<6;k++){const p=vert(c.q,c.r,k);k?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.closePath();ctx.fill()}
  const still=new Path2D(),moving=[],dots=[];
  for(const e of edges.values()){const p=pose(e,t);if(!p)continue;if(p==='still'){still.moveTo(e.A[0],e.A[1]);still.lineTo(e.B[0],e.B[1]);const x=(t-e.tIn-o.arrive*.85)/.4;if(x>=0&&x<1)dots.push([e.A,e.B,1-x]);continue}moving.push(p)}
  ctx.globalAlpha=.22;ctx.strokeStyle=o.glow;ctx.lineWidth=lw*4.5;ctx.stroke(still);ctx.globalAlpha=1;ctx.strokeStyle=o.color;ctx.lineWidth=lw;ctx.stroke(still);
  for(const{p1,p2,a}of moving){const k=Math.min(3,(p1[2]+p2[2])/2);for(const pass of[0,1]){ctx.globalAlpha=pass?a:a*.22;ctx.strokeStyle=pass?o.color:o.glow;ctx.lineWidth=(pass?lw:lw*4.5)*k;ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.stroke()}}
  ctx.fillStyle=o.honey;for(const[A,B,a]of dots)for(const P of[A,B]){ctx.globalAlpha=a*.3;ctx.beginPath();ctx.arc(P[0],P[1],lw*5,0,7);ctx.fill();ctx.globalAlpha=a;ctx.beginPath();ctx.arc(P[0],P[1],lw*1.8,0,7);ctx.fill()}
  ctx.globalAlpha=1}
 const rel=e=>{const r=el.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 const onMove=e=>{if(reduce())return;const[x,y]=rel(e);if(m.in){const[q,r]=hexAt(m.x,m.y);m.last=pos(q,r)}m.x=x;m.y=y;m.in=true;kick()};
 const onLeave=()=>{m.in=false;m.last=null;kick()};
 el.addEventListener('pointermove',onMove);el.addEventListener('pointerenter',onMove);el.addEventListener('pointerleave',onLeave);
 fit();
 return{update(n){const reset=n.cell!==undefined&&n.cell!==o.cell;o=Object.assign(o,n);if(reset){cells=new Map;edges=new Map}kick()},
  destroy(){cancelAnimationFrame(raf);ro.disconnect();el.removeEventListener('pointermove',onMove);el.removeEventListener('pointerenter',onMove);el.removeEventListener('pointerleave',onLeave);cv.remove()}};
}
export const defaults = DEF;
export { attach };
