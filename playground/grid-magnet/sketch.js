/* p5.js 1.11.11. Movement-driven polyhedral poses + damped springs; no ambient motion. */
const definitions = [
  ['density','网格密度',10,48,1,23,'列','默认跟随首页；取消勾选后可手动调整'],
  ['radius','吸附半径',80,360,5,135,'px','磁力向边缘平滑衰减'],
  ['cursor','光标半径',4,60,1,30,'px','立体核心尺寸，越大曲面越饱满'],
  ['depth','立体深度',0,120,2,28,'px','控制凸起在平面上的投影偏移'],
  ['angle','形态角度',0,360,5,85,'°','基础朝向；动态姿态在此基础上旋转'],
  ['motion','动态变化',0,2,0.1,1,'','随移动路径旋转与倾斜；0 为固定形态'],
  ['strength','吸附强度',0,0.65,0.01,0.23,'','控制向中心聚拢的幅度'],
  ['elasticity','弹性',20,180,5,70,'','越高，靠近目标越快'],
  ['damping','阻尼',0.35,1.5,0.05,0.7,'','越高，震荡越少']
];
const settings = Object.fromEntries(definitions.map(d => [d[0],d[5]]));
settings.shape = 'diamond';
settings.homepageDensity = true;
const shapeControl = document.createElement('label');
shapeControl.className = 'shape-control';
shapeControl.innerHTML = '<span>吸附形态</span><select id="shape"><option value="disc">圆盘 · 原版对照</option><option value="sphere">球体 · 柔和曲面</option><option value="pyramid">三棱锥 · 三向棱面</option><option value="diamond" selected>钻石 · 菱形多面体</option></select><small>隐形立体表面：网格向表面聚拢，随移动旋转与倾斜，停止后稳定；每次进入换一个姿态。</small>';
document.querySelector('#controls').before(shapeControl);
const stage = document.querySelector('#stage');
const status = document.querySelector('#state');
let wake = () => {};
for (const [key,label,min,max,step,value,unit,hint] of definitions) {
  const field = document.createElement('label'); field.className = 'control';
  field.innerHTML = `<span class="label-row">${label}<output for="${key}">${value}${unit}</output></span><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><small>${hint}</small>`;
  field.querySelector('input').addEventListener('input', e => {
    settings[key] = Number(e.target.value);
    field.querySelector('output').value = `${settings[key]}${unit}`;
    wake(key === 'density');
  });
  document.querySelector('#controls').append(field);
}
const densitySync=document.createElement('label');
densitySync.className='toggle';
densitySync.innerHTML='<input id="homepage-density" type="checkbox" checked>网格间距跟随首页';
document.querySelector('#density').closest('label').before(densitySync);
const densityInput=document.querySelector('#density');
densityInput.disabled=true;
document.querySelector('#homepage-density').addEventListener('change',e=>{
  settings.homepageDensity=e.target.checked;densityInput.disabled=e.target.checked;wake(true);
});
document.querySelector('#shape').addEventListener('change',e=>{settings.shape=e.target.value;wake();});
new p5(p => {
  let points=[], cols=0, rows=0, pointer={x:0,y:0,active:false}, accumulator=0;
  let phase=0, pose=0;
  const polyhedral=()=>settings.shape==='pyramid'||settings.shape==='diamond';
  const orientation=()=>settings.angle*Math.PI/180+(polyhedral()?pose*settings.motion:0);
  const tilt=()=>polyhedral()?1+0.24*Math.sin(pose*1.37)*settings.motion:1;
  const guides=document.querySelector('#guides');
  function rebuild(){
    // Mirrors css/site-layout.css .intro-grid, including rail, canvas cap and mobile rule.
    const viewport=document.documentElement.clientWidth;
    const homepageSpacing=viewport<=600?40:Math.min(viewport-(viewport<=962?0:140),1200/.9298)*.04386;
    const spacing=settings.homepageDensity?homepageSpacing:p.width/settings.density;
    document.querySelector('output[for="density"]').value=settings.homepageDensity?`${spacing.toFixed(1)}px · 首页`:`${settings.density}列`;
    cols=Math.ceil(p.width/spacing)+3; rows=Math.ceil(p.height/spacing)+3;
    points=Array.from({length:rows*cols},(_,i)=>{
      const x=(i%cols-1)*spacing, y=(Math.floor(i/cols)-1)*spacing;
      return {ox:x,oy:y,x,y,vx:0,vy:0};
    });
  }
  function target(n){
    if(!pointer.active)return [n.ox,n.oy];
    const dx=pointer.x-n.ox,dy=pointer.y-n.oy,d=Math.hypot(dx,dy);
    if(d>=settings.radius)return [n.ox,n.oy];
    const t=Math.max(0,(d-settings.cursor)/Math.max(1,settings.radius-settings.cursor));
    const weight=1-t*t*(3-2*t);
    if(settings.shape==='disc')return [n.ox+dx*settings.strength*weight,n.oy+dy*settings.strength*weight];
    const angle=orientation(),cos=Math.cos(angle),sin=Math.sin(angle);
    const u=(-dx*cos-dy*sin)/settings.radius;
    const v=(dx*sin-dy*cos)/settings.radius/tilt();
    let height;
    if(settings.shape==='sphere'){
      // A tilted dome: height projects diagonally, breaking radial symmetry.
      const q=Math.hypot(u,v/0.82);
      height=Math.sqrt(Math.max(0,1-q*q));
    }else if(settings.shape==='pyramid'){
      // Three planar faces meeting at the apex; triangular footprint.
      height=Math.max(0,Math.min(1+2*v,1-v-Math.sqrt(3)*u,1-v+Math.sqrt(3)*u));
    }else{
      // Four upper facets of an elongated octahedron.
      height=Math.max(0,1-Math.abs(u)/0.78-Math.abs(v));
    }
    // Smooth only the footprint rim; retain the polyhedral ridges inside.
    const rim=Math.min(1,height*6);height*=rim*rim*(3-2*rim);
    const core=0.65+settings.cursor/60;
    const pull=settings.strength*weight*height*core;
    const lift=settings.depth*settings.strength*height*core*(polyhedral()?1+0.25*Math.cos(pose*0.83)*settings.motion:1);
    return [n.ox+dx*pull+sin*lift*0.65,n.oy+dy*pull-cos*lift];
  }

  function activate(){accumulator=0;p.loop();}
  wake=reset=>{if(reset)rebuild();activate();};
  p.setup=()=>{
    const canvas=p.createCanvas(stage.clientWidth,stage.clientHeight);canvas.parent(stage);
    canvas.elt.setAttribute('aria-hidden','true');p.pixelDensity(Math.min(devicePixelRatio,2));
    rebuild();
    canvas.elt.addEventListener('pointermove',e=>{
      const box=canvas.elt.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
      if(!pointer.active){
        phase=Math.random()*Math.PI*2;pose=phase;
      }else{
        // Arc length drives a continuous pose, independent of event frequency.
        phase+=Math.hypot(x-pointer.x,y-pointer.y)*0.008;
      }
      pointer={x,y,active:true};activate();
    });
    const leave=()=>{pointer.active=false;activate();};
    canvas.elt.addEventListener('pointerleave',leave);canvas.elt.addEventListener('pointercancel',leave);window.addEventListener('blur',leave);
    guides.addEventListener('change',activate);
    new ResizeObserver(()=>{p.resizeCanvas(stage.clientWidth,stage.clientHeight);rebuild();activate();}).observe(stage);
  };
  p.draw=()=>{
    // Fixed 120 Hz integration makes the controls consistent across frame rates.
    accumulator+=Math.min(p.deltaTime/1000,0.05);
    const h=1/120,k=settings.elasticity,c=2*Math.sqrt(k)*settings.damping;
    while(accumulator>=h){
      pose+=(phase-pose)*(1-Math.exp(-10*h));
      for(const n of points){const [tx,ty]=target(n);
        n.vx+=(k*(tx-n.x)-c*n.vx)*h;n.vy+=(k*(ty-n.y)-c*n.vy)*h;
        n.x+=n.vx*h;n.y+=n.vy*h;
      }accumulator-=h;
    }
    let settled=!polyhedral()||settings.motion===0||Math.abs(phase-pose)<0.0001;
    if(settled)pose=phase;
    for(const n of points){const [tx,ty]=target(n);
      if(Math.hypot(tx-n.x,ty-n.y)>.015||Math.hypot(n.vx,n.vy)>.025){settled=false;break;}
    }
    if(settled)for(const n of points){[n.x,n.y]=target(n);n.vx=n.vy=0;}
    p.background('#f6f6f6');p.noFill();p.stroke(0,20);p.strokeWeight(1);
    const line=nodes=>{p.beginShape();const first=nodes[0],last=nodes[nodes.length-1];p.curveVertex(first.x,first.y);for(const n of nodes)p.curveVertex(n.x,n.y);p.curveVertex(last.x,last.y);p.endShape();};
    for(let y=0;y<rows;y++)line(points.slice(y*cols,(y+1)*cols));
    for(let x=0;x<cols;x++)line(Array.from({length:rows},(_,y)=>points[y*cols+x]));
    if(guides.checked&&pointer.active){
      p.stroke(113,131,92,100);p.drawingContext.setLineDash([4,5]);p.circle(pointer.x,pointer.y,settings.radius*2);p.drawingContext.setLineDash([]);
      p.push();p.translate(pointer.x,pointer.y);p.rotate(orientation());p.scale(1,tilt());
      const r=settings.radius;
      if(settings.shape==='pyramid'||settings.shape==='diamond'){
        const vertices=settings.shape==='pyramid'?[[0,r],[-r*Math.sqrt(3)/2,-r/2],[r*Math.sqrt(3)/2,-r/2]]:[[0,-r],[r*.78,0],[0,r],[-r*.78,0]];
        p.beginShape();for(const [x,y] of vertices)p.vertex(x,y);p.endShape(p.CLOSE);
        for(const [x,y] of vertices)p.line(0,-settings.depth*settings.strength,x,y);
      }else{p.ellipse(0,0,settings.cursor*2,settings.cursor*(settings.shape==='sphere'?1.64:2));}
      p.pop();
    }
    status.textContent=pointer.active?(settled?'Hold · 稳定吸附':'Move · 柔和聚拢'):(settled?'Idle · 规则排列':'Return · 自然复位');
    if(settled)p.noLoop();
  };
});
document.querySelector('#reset').addEventListener('click',()=>{
  settings.shape='diamond';document.querySelector('#shape').value='diamond';
  settings.homepageDensity=true;document.querySelector('#homepage-density').checked=true;densityInput.disabled=true;
  for(const [key,,,,,value] of definitions){const input=document.getElementById(key);input.value=value;input.dispatchEvent(new Event('input'));}
});
document.querySelector('#copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(JSON.stringify(settings,null,2));document.querySelector('#note').textContent='参数已复制，可以保存这组手感。';}
  catch{document.querySelector('#note').textContent=JSON.stringify(settings);}
});
