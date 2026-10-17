/* Approved Playground diamond preset. The CSS grid remains the fallback. */
(() => {
  const grid=document.querySelector('.intro-grid');
  if(!grid)return;
  const enabled=matchMedia('(min-width: 963px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let instance=null, loading=false;
  const settings={radius:135,cursor:30,depth:28,angle:85,motion:1,strength:0.23,elasticity:70,damping:0.7};
  function sync(){
    if(!enabled.matches){
      if(instance){instance.remove();instance=null;}
      grid.classList.remove('is-magnetic');return;
    }
    if(instance||loading)return;
    if(!window.p5){
      loading=true;
      const script=document.createElement('script');script.src='/js/vendor/p5.min.js';
      script.onload=()=>{loading=false;sync();};script.onerror=()=>{loading=false;};
      document.head.append(script);return;
    }
    instance=new p5(p=>{
      let points=[],cols=0,rows=0,phase=0,pose=0,accumulator=0;
      let pointer={x:0,y:0,active:false};
      const orientation=()=>settings.angle*Math.PI/180+pose;
      const tilt=()=>1+0.24*Math.sin(pose*1.37);
      const listeners=new AbortController();
      let observer;
      function rebuild(){
        const spacing=parseFloat(getComputedStyle(grid).backgroundSize);
        cols=Math.ceil(p.width/spacing)+3;rows=Math.ceil(p.height/spacing)+3;
        points=Array.from({length:rows*cols},(_,i)=>{
          // Match the CSS vertical grid's -1px horizontal offset.
          const density=p.pixelDensity();
          // Align the edges of each 1 CSS-pixel stroke to physical pixels.
          const align=value=>Math.round(value*density)/density+0.5;
          const x=align((i%cols-1)*spacing-1),y=align((Math.floor(i/cols)-1)*spacing);
          return {ox:x,oy:y,x,y,vx:0,vy:0};
        });
      }
      function target(n){
        if(!pointer.active)return [n.ox,n.oy];
        const dx=pointer.x-n.ox,dy=pointer.y-n.oy,d=Math.hypot(dx,dy);
        if(d>=settings.radius)return [n.ox,n.oy];
        const t=Math.max(0,(d-settings.cursor)/Math.max(1,settings.radius-settings.cursor));
        const weight=1-t*t*(3-2*t);
        const angle=orientation(),cos=Math.cos(angle),sin=Math.sin(angle);
        const u=(-dx*cos-dy*sin)/settings.radius;
        const v=(dx*sin-dy*cos)/settings.radius/tilt();
        let height=Math.max(0,1-Math.abs(u)/0.78-Math.abs(v));
        // Smooth only the footprint rim; retain the polyhedral ridges inside.
        const rim=Math.min(1,height*6);height*=rim*rim*(3-2*rim);
        const core=0.65+settings.cursor/60;
        const pull=settings.strength*weight*height*core;
        const lift=settings.depth*settings.strength*height*core*(1+0.25*Math.cos(pose*0.83));
        return [n.ox+dx*pull+sin*lift*0.65,n.oy+dy*pull-cos*lift];
      }

      function activate(){accumulator=0;p.loop();}
      const leave=()=>{if(pointer.active){pointer.active=false;activate();}};
      p.setup=()=>{
        const canvas=p.createCanvas(grid.clientWidth,grid.clientHeight);canvas.parent(grid);
        canvas.elt.setAttribute('aria-hidden','true');
        p.pixelDensity(devicePixelRatio);rebuild();
        const options={signal:listeners.signal,passive:true};
        document.addEventListener('pointermove',e=>{
          const rect=grid.getBoundingClientRect();
          const bottom=parseFloat(grid.style.getPropertyValue('--grid-bottom'))||0;
          const cover=document.querySelector('.content-layer')?.getBoundingClientRect().top??Infinity;
          if(e.pointerType!=='mouse'||document.querySelector('#opening-loader')||e.clientX<rect.left||e.clientX>=rect.right||e.clientY<rect.top||e.clientY>=Math.min(rect.bottom-bottom,cover)){
            leave();return;
          }
          const x=e.clientX-rect.left,y=e.clientY-rect.top;
          if(!pointer.active){phase=Math.random()*Math.PI*2;pose=phase;}
          else phase+=Math.hypot(x-pointer.x,y-pointer.y)*0.008;
          pointer={x,y,active:true};activate();
        },options);
        document.documentElement.addEventListener('pointerleave',leave,options);
        window.addEventListener('blur',leave,options);
        window.addEventListener('scroll',leave,options);
        document.addEventListener('visibilitychange',()=>{
          if(document.hidden){pointer.active=false;rebuild();p.noLoop();p.redraw();}
          else activate();
        },options);
        observer=new ResizeObserver(()=>{p.resizeCanvas(grid.clientWidth,grid.clientHeight);pointer.active=false;rebuild();activate();});
        observer.observe(grid);
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
        let settled=Math.abs(phase-pose)<0.0001;
        if(settled)pose=phase;
        for(const n of points){const [tx,ty]=target(n);
          if(Math.hypot(tx-n.x,ty-n.y)>.015||Math.hypot(n.vx,n.vy)>.025){settled=false;break;}
        }
        if(settled)for(const n of points){[n.x,n.y]=target(n);n.vx=n.vy=0;}
        p.clear();
        // At rest, restore the exact original CSS grid instead of rasterizing it.
        grid.classList.toggle('is-magnetic',pointer.active||!settled);
        if(settled&&!pointer.active){grid.dataset.magnetState='idle';p.noLoop();return;}
        p.noFill();p.stroke(0,20);p.strokeWeight(1);
        const line=nodes=>{p.beginShape();const first=nodes[0],last=nodes[nodes.length-1];p.curveVertex(first.x,first.y);for(const n of nodes)p.curveVertex(n.x,n.y);p.curveVertex(last.x,last.y);p.endShape();};
        for(let y=0;y<rows;y++)line(points.slice(y*cols,(y+1)*cols));
        for(let x=0;x<cols;x++)line(Array.from({length:rows},(_,y)=>points[y*cols+x]));
        grid.dataset.magnetState=pointer.active?(settled?'hold':'move'):(settled?'idle':'return');
        if(settled)p.noLoop();
      };
      const remove=p.remove.bind(p);
      p.remove=()=>{listeners.abort();observer?.disconnect();delete grid.dataset.magnetState;remove();};
    });
  }
  enabled.addEventListener('change',sync);sync();
})();
