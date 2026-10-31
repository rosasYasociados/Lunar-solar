const cv=document.getElementById('c'),ctx=cv.getContext('2d'),info=document.getElementById('info');
let W,H,R,cx,cy,mode='solar',pos={x:0,y:0},drag=false,off={x:0,y:0};
const stars=Array.from({length:140},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3}));
const craters=[[-.3,-.25,.18],[.25,-.1,.22],[-.1,.3,.15],[.35,.35,.1],[-.4,.1,.09],[.05,-.45,.08]];
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')+')';

function resize(){
  const d=devicePixelRatio||1;W=innerWidth;H=innerHeight;
  cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
  R=Math.min(W,H)*.2;cx=W/2;cy=H/2+20;reset();
}
function reset(){
  if(mode==='solar'||mode==='lunar')pos={x:cx+R*2.6,y:cy-R*.5};
  else pos={x:cx,y:cy};
}
function setMode(m){
  mode=m;reset();
  document.querySelectorAll('#menu button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
}
document.querySelectorAll('#menu button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

function sky(top,bot,starAlpha){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bot);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(starAlpha>0.02){ctx.fillStyle='rgba(255,255,255,'+starAlpha+')';
    stars.forEach(s=>{ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,7);ctx.fill()});}
}
function glow(x,y,r0,r1,rgba0,rgba1){
  const g=ctx.createRadialGradient(x,y,r0,x,y,r1);g.addColorStop(0,rgba0);g.addColorStop(1,rgba1);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r1,0,7);ctx.fill();
}
function disc(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
function sun(x,y,r,k=1){
  glow(x,y,r*.9,r*2.6,'rgba(255,220,60,'+.5*k+')','rgba(255,200,40,0)');
  disc(x,y,r,'#ffe14a');
}
function moonLit(x,y,r){
  glow(x,y,r*.9,r*2.2,'rgba(200,210,255,.35)','rgba(200,210,255,0)');
  const g=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,'#f4f1e6');g.addColorStop(1,'#bdb9aa');
  disc(x,y,r,g);
  craters.forEach(c=>disc(x+c[0]*r,y+c[1]*r,c[2]*r,'rgba(120,115,100,.35)'));
}
function lens(d,r1,r2){
  if(d>=r1+r2)return 0;
  if(d<=Math.abs(r1-r2))return Math.PI*Math.min(r1,r2)**2;
  const a=r1*r1*Math.acos((d*d+r1*r1-r2*r2)/(2*d*r1)),b=r2*r2*Math.acos((d*d+r2*r2-r1*r1)/(2*d*r2));
  return a+b-.5*Math.sqrt((-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2));
}

function draw(){
  ctx.clearRect(0,0,W,H);
  if(mode==='solar'){
    const rm=R*.98,d=Math.hypot(pos.x-cx,pos.y-cy);
    const cov=Math.min(1,lens(d,R,rm)/(Math.PI*R*R));
    sky(mix([75,26,122],[8,4,18],cov),mix([40,14,70],[4,2,10],cov),cov*cov);
    sun(cx,cy,R,1-cov*.6);
    const c6=cov**6;
    if(c6>.01)glow(cx,cy,R*.9,R*2.4,'rgba(255,255,255,'+.85*c6+')','rgba(255,220,120,0)');
    disc(pos.x,pos.y,rm,mix([31,74,82],[6,12,16],cov));
    info.textContent='Cobertura del Sol: '+Math.round(cov*100)+'%'+(cov>.985?' · ¡Eclipse total!':'');
  }else if(mode==='lunar'){
    sky('#0b0620','#04020c',1);
    const rm=R*.9,um=rm*1.6,pen=rm*2.6;
    glow(cx,cy,um,pen,'rgba(0,0,0,.45)','rgba(0,0,0,0)');
    ctx.strokeStyle='rgba(255,255,255,.18)';ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(cx,cy,um,0,7);ctx.stroke();ctx.setLineDash([]);
    moonLit(pos.x,pos.y,rm);
    ctx.save();ctx.beginPath();ctx.arc(pos.x,pos.y,rm,0,7);ctx.clip();
    const g=ctx.createRadialGradient(cx,cy,um*.55,cx,cy,pen);
    g.addColorStop(0,'rgba(120,25,8,.93)');g.addColorStop(um/pen*.95,'rgba(150,40,15,.85)');g.addColorStop(um/pen*1.05,'rgba(40,20,30,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
    const d=Math.hypot(pos.x-cx,pos.y-cy);
    info.textContent=d+rm<=um?'Eclipse lunar total · Luna roja':d-rm<um?'Eclipse lunar parcial':d-rm<pen?'Penumbra':'Arrastra la Luna hacia la sombra';
  }else if(mode==='luna'){
    sky('#0b0620','#04020c',1);
    moonLit(pos.x,pos.y,R*1.2);
    info.textContent='Arrastra la Luna';
  }else{
    sky('#6a2aa8','#2a0e4d',.1);
    sun(pos.x,pos.y,R*1.2);
    info.textContent='Arrastra el Sol';
  }
  requestAnimationFrame(draw);
}
cv.addEventListener('pointerdown',e=>{drag=true;off={x:pos.x-e.clientX,y:pos.y-e.clientY};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(drag){pos.x=e.clientX+off.x;pos.y=e.clientY+off.y}});
cv.addEventListener('pointerup',()=>drag=false);
cv.addEventListener('pointercancel',()=>drag=false);
addEventListener('resize',resize);
resize();draw();
