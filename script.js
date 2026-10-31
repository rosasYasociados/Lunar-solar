const cv=document.getElementById('c'),ctx=cv.getContext('2d'),info=document.getElementById('info');
let W,H,R,cx,cy,mode='solar',pos={x:0,y:0},drag=false,off={x:0,y:0};
let playing=false,speed=1,phase=.5,t=0,last=0,th=2.4,tilt=.55,live='';
let dtg=.016,meteorMode=false,annular=false,shake=0,flash=null,msg='',msgT=0,geo3d=null;
const meteors=[],parts=[],fxs=[],dm={};
const playBtn=document.getElementById('play'),speedIn=document.getElementById('speed'),phaseIn=document.getElementById('phase'),phaseBox=document.getElementById('phaseBox'),tiltIn=document.getElementById('tilt'),tiltBox=document.getElementById('tiltBox'),dataBtn=document.getElementById('dataBtn'),panel=document.getElementById('panel'),pTitle=document.getElementById('pTitle'),pBody=document.getElementById('pBody'),pLive=document.getElementById('pLive'),meteorBtn=document.getElementById('meteorBtn'),repairBtn=document.getElementById('repairBtn'),annBtn=document.getElementById('annBtn');
const stars=Array.from({length:140},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3}));
const craters=[[-.3,-.25,.18],[.25,-.1,.22],[-.1,.3,.15],[.35,.35,.1],[-.4,.1,.09],[.05,-.45,.08]];
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')+')';

const DATA={
  solar:['Eclipse solar','Ocurre cuando la Luna se pone justo entre el Sol y la Tierra, en luna nueva. Si la tapa por completo hay eclipse total y se ve la corona (hasta 7 min 32 s). Si la Luna está más lejos se ve más chica y deja un aro brillante: eclipse anular, o anillo de fuego. Usa el botón Tipo para cambiar.'],
  lunar:['Eclipse lunar','Ocurre cuando la Tierra queda entre el Sol y la Luna, en luna llena. La Luna entra en la sombra de la Tierra y se ve roja porque la luz que se dobla en la atmósfera terrestre solo deja pasar los tonos rojos. La totalidad puede durar hasta 1 h 47 min.'],
  luna:['La Luna','Da una vuelta a la Tierra cada 27.3 días, pero sus fases se repiten cada 29.5 días. Siempre está iluminada la mitad que mira al Sol; desde la Tierra vemos más o menos de esa mitad. Está a unos 384,400 km.'],
  sol:['El Sol','Es una estrella a unos 149.6 millones de km. Es 109 veces más ancho que la Tierra y su luz tarda unos 8 min 20 s en llegar. Es 400 veces más grande que la Luna, pero también 400 veces más lejos, por eso se ven del mismo tamaño.'],
  '3d':['Vista 3D (a escala de dibujo)','Aquí ves Sol, Tierra y Luna desde arriba. La Luna en el lado del Sol es luna nueva (eclipse solar posible) y en el lado opuesto es luna llena (eclipse lunar posible). La órbita de la Luna está inclinada unos 5°, por eso no hay eclipse todos los meses.']
};
function showData(){pTitle.textContent=DATA[mode][0];pBody.textContent=DATA[mode][1];}
function resize(){
  const d=devicePixelRatio||1;W=innerWidth;H=innerHeight;
  cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
  R=Math.min(W,H)*.2;cx=W/2;cy=H/2+20;reset();
}
function reset(){
  if(mode==='solar'||mode==='lunar')pos={x:Math.min(cx+R*2.6,W-R*1.1),y:cy-R*.5};
  else pos={x:cx,y:cy};
}
function setMode(m){
  mode=m;reset();t=0;
  phaseBox.style.display=m==='luna'?'flex':'none';
  tiltBox.style.display=m==='3d'?'flex':'none';
  if(m==='3d')th=2.4;
  annBtn.style.display=m==='solar'?'':'none';
  showData();
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
function moonPhase(x,y,r,p){
  const wax=p<.5,q=wax?p:1-p,k=Math.cos(2*Math.PI*q),dir=wax?1:-1,ill=(1-Math.cos(2*Math.PI*p))/2;
  glow(x,y,r*.9,r*2.2,'rgba(200,210,255,'+.35*ill+')','rgba(200,210,255,0)');
  disc(x,y,r,'#1b1a2e');
  ctx.save();ctx.beginPath();
  for(let i=0;i<=40;i++){const a=Math.PI*i/40;ctx.lineTo(x+dir*r*Math.sin(a),y-r*Math.cos(a));}
  for(let i=40;i>=0;i--){const a=Math.PI*i/40;ctx.lineTo(x+dir*k*r*Math.sin(a),y-r*Math.cos(a));}
  ctx.closePath();ctx.clip();
  const g=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,'#f4f1e6');g.addColorStop(1,'#bdb9aa');
  disc(x,y,r,g);
  craters.forEach(c=>disc(x+c[0]*r,y+c[1]*r,c[2]*r,'rgba(120,115,100,.35)'));
  ctx.restore();
}
function phaseName(p){
  const n=['Luna nueva','Luna creciente','Cuarto creciente','Gibosa creciente','Luna llena','Gibosa menguante','Cuarto menguante','Luna menguante'];
  return n[Math.round(p*8)%8];
}
let level=0,wasTotal=false,au=null;
const soundBtn=document.getElementById('sound');
function initAudio(){
  const A=new (window.AudioContext||window.webkitAudioContext)();
  const master=A.createGain();master.gain.value=0;
  const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1200;
  const o1=A.createOscillator(),o2=A.createOscillator();o1.type='sine';o2.type='triangle';
  o1.frequency.value=196;o2.frequency.value=294;
  o1.connect(lp);o2.connect(lp);lp.connect(master);master.connect(A.destination);
  o1.start();o2.start();
  au={A,master,lp,o1,o2,on:false};
}
function chime(){
  if(!au||!au.on)return;
  const A=au.A;[523.25,659.25,783.99,1046.5].forEach((f,i)=>{
    const o=A.createOscillator(),g=A.createGain();o.type='sine';o.frequency.value=f;
    const t0=A.currentTime+i*.12;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.25,t0+.03);g.gain.exponentialRampToValueAtTime(.001,t0+2.2);
    o.connect(g);g.connect(A.destination);o.start(t0);o.stop(t0+2.3);});
}
function updateSound(){
  if(!au)return;
  const A=au.A,now=A.currentTime;
  au.master.gain.setTargetAtTime(au.on?.07+level*.22:0,now,.15);
  au.o1.frequency.setTargetAtTime(196+level*100,now,.2);
  au.o2.frequency.setTargetAtTime(294+level*150,now,.2);
  au.lp.frequency.setTargetAtTime(900+level*1500,now,.2);
}
function checkTotal(isTotal){if(isTotal&&!wasTotal)chime();wasTotal=isTotal;}
function star(x,y,len,a){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(255,255,255,'+a+')';ctx.lineWidth=2;
  [0,Math.PI/2,Math.PI/4,-Math.PI/4].forEach((r,i)=>{const l=i<2?len:len*.5;ctx.save();ctx.rotate(r);
    const g=ctx.createLinearGradient(-l,0,l,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,'+a+')');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(-l,0);ctx.lineTo(l,0);ctx.stroke();ctx.restore();});
  ctx.restore();
}
function solarEffects(cov,d,rm){
  if(cov<.9||cov>=.998||d<1)return;
  const k=Math.max(0,Math.min(1,(cov-.9)/.07))*Math.max(0,Math.min(1,(.998-cov)/.02));
  const ux=(cx-pos.x)/d,uy=(cy-pos.y)/d,a0=Math.atan2(uy,ux);
  // perlas de Baily
  for(let i=-5;i<=5;i++){
    const a=a0+i*.09+Math.sin(i*12.9)*.03,bx=cx+R*Math.cos(a),by=cy+R*Math.sin(a);
    if(Math.hypot(bx-pos.x,by-pos.y)<rm)continue;
    const rr=R*(.025+.03*Math.abs(Math.sin(i*7.3)));
    glow(bx,by,0,rr*3,'rgba(255,250,220,'+k+')','rgba(255,220,120,0)');
    disc(bx,by,rr*.5,'rgba(255,255,255,'+k+')');
  }
  // anillo de diamante
  const dk=Math.max(0,(cov-.965)/.033);
  if(dk>0){const px=cx+R*ux,py=cy+R*uy;
    glow(px,py,0,R*.9,'rgba(255,255,255,'+.9*dk+')','rgba(255,240,180,0)');
    star(px,py,R*1.2*dk,dk);disc(px,py,R*.05,'#fff');}
}
function scene3d(){
  sky('#0b0620','#04020c',1);
  const ex=W*.58,ey=cy,Ro=Math.min(W*.28,H*.3),ry=Ro*(1-.8*tilt),er=Ro*.25,mr=Ro*.1;
  const sx=W*.07,sr=Math.min(W*.07,R*.5);
  const mx=ex+Ro*Math.cos(th),my=ey+ry*Math.sin(th),front=Math.sin(th)>=0;
  geo3d={sun:{x:sx,y:ey,r:sr},earth:{x:ex,y:ey,r:er},moon:{x:mx,y:my,r:mr}};
  // sol y rayos
  if(alive('sun')){glow(sx,ey,sr*.8,sr*3.2,'rgba(255,220,60,.5)','rgba(255,200,40,0)');disc(sx,ey,sr,'#ffe14a');dmgFX('sun',sx,ey,sr);}
  ctx.strokeStyle='rgba(255,225,120,.12)';ctx.lineWidth=1;
  if(alive('sun'))[-1,0,1].forEach(k=>{ctx.beginPath();ctx.moveTo(sx+sr,ey+k*sr*.6);ctx.lineTo(ex-er,ey+k*er*.8);ctx.stroke();});
  // órbita
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.setLineDash([5,7]);ctx.beginPath();ctx.ellipse(ex,ey,Ro,ry,0,0,7);ctx.stroke();ctx.setLineDash([]);
  // sombra de la Tierra
  let g=ctx.createLinearGradient(ex,0,ex+Ro*1.5,0);g.addColorStop(0,'rgba(0,0,0,'+(alive('earth')&&alive('sun')?.55:0)+')');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(ex,ey-er);ctx.lineTo(ex+Ro*1.5,ey-er*.1);ctx.lineTo(ex+Ro*1.5,ey+er*.1);ctx.lineTo(ex,ey+er);ctx.closePath();ctx.fill();
  const drawMoon=()=>{
    // sombra de la Luna (hacia el lado opuesto al Sol)
    const a=Math.atan2(my-ey,mx-sx);
    ctx.save();ctx.translate(mx,my);ctx.rotate(a);
    const g2=ctx.createLinearGradient(0,0,Ro*.9,0);g2.addColorStop(0,'rgba(0,0,0,.5)');g2.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g2;ctx.beginPath();ctx.moveTo(0,-mr);ctx.lineTo(Ro*.9,-mr*.1);ctx.lineTo(Ro*.9,mr*.1);ctx.lineTo(0,mr);ctx.closePath();ctx.fill();
    // mitad iluminada mira al Sol
    ctx.beginPath();ctx.arc(0,0,mr,0,7);ctx.clip();
    ctx.fillStyle='#cfcab8';ctx.fillRect(-mr,-mr,mr*2,mr*2);
    ctx.fillStyle='#1b1a2e';ctx.fillRect(0,-mr,mr,mr*2);
    ctx.restore();dmgFX('moon',mx,my,mr);
  };
  if(!front&&alive('moon'))drawMoon();
  // Tierra
  const eg=ctx.createRadialGradient(ex-er*.4,ey-er*.4,er*.1,ex,ey,er);eg.addColorStop(0,'#5fb0ff');eg.addColorStop(1,'#1d4f9c');
  if(alive('earth'))disc(ex,ey,er,eg);
  ctx.save();ctx.beginPath();ctx.arc(ex,ey,alive('earth')?er:0,0,7);ctx.clip();
  const ng=ctx.createLinearGradient(ex-er,0,ex+er,0);ng.addColorStop(.35,'rgba(0,0,10,0)');ng.addColorStop(1,'rgba(0,0,10,.75)');
  ctx.fillStyle=ng;ctx.fillRect(ex-er,ey-er,er*2,er*2);ctx.restore();dmgFX('earth',ex,ey,er);
  if(front&&alive('moon'))drawMoon();
  // etiquetas
  ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='14px -apple-system,system-ui,sans-serif';ctx.textAlign='center';
  ctx.fillText('Sol',sx,ey+sr+22);ctx.fillText('Tierra',ex,ey+er+20);ctx.fillText('Luna',mx,my+mr+18);
  // estado
  const deg=((th*180/Math.PI)%360+360)%360;
  const dn=Math.abs(Math.atan2(Math.sin(th-Math.PI),Math.cos(th-Math.PI))),df=Math.abs(Math.atan2(Math.sin(th),Math.cos(th)));
  const near=Math.min(dn,df);
  level=Math.max(0,1-near/.5);checkTotal(near<.08);
  const pp=((th+Math.PI)/(2*Math.PI))%1;
  const st=dn<.12?'Luna nueva · eclipse solar posible':df<.12?'Luna llena · eclipse lunar posible':phaseName(pp);
  info.textContent=st;
  live='Ángulo de la Luna: '+Math.round(deg)+'° · '+st;
}
const NAMES={sun:'el Sol',moon:'la Luna',earth:'la Tierra'};
const alive=id=>!(dm[id]&&dm[id].dead);
const getD=id=>dm[id]||(dm[id]={hp:0,dead:false,scars:[]});
const sizeName=v=>v<.3?'pequeño':v<.6?'mediano':v<.85?'grande':'colosal';
const solarRm=()=>R*(annular?.86:.98);
function bodies(){
  if(mode==='solar'){const a=[];if(alive('moon'))a.push({id:'moon',x:pos.x,y:pos.y,r:solarRm()});if(alive('sun'))a.push({id:'sun',x:cx,y:cy,r:R});return a;}
  if(mode==='lunar')return alive('moon')?[{id:'moon',x:pos.x,y:pos.y,r:R*.9}]:[];
  if(mode==='luna')return alive('moon')?[{id:'moon',x:pos.x,y:pos.y,r:R*1.2}]:[];
  if(mode==='sol')return alive('sun')?[{id:'sun',x:pos.x,y:pos.y,r:R*1.2}]:[];
  return geo3d?['moon','earth','sun'].filter(i=>alive(i)).map(i=>({id:i,x:geo3d[i].x,y:geo3d[i].y,r:geo3d[i].r})):[];
}
function dmgFX(id,x,y,r){
  const d=dm[id];if(!d||d.dead||!d.scars.length)return;
  const sn=id==='sun',hp=Math.min(1,d.hp),tm=performance.now()/1000;
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.clip();
  ctx.fillStyle=sn?'rgba(255,60,0,'+(.3*hp+.08*hp*Math.sin(tm*8))+')':'rgba(255,90,20,'+.2*hp+')';
  ctx.fillRect(x-r,y-r,r*2,r*2);
  d.scars.forEach(sc=>{
    const sx=x+sc.dx*r,sy=y+sc.dy*r,sz=Math.max(2,sc.sz*r);
    glow(sx,sy,sz*.5,sz*2.2,'rgba(255,120,30,.55)','rgba(255,80,0,0)');
    ctx.beginPath();ctx.arc(sx,sy,sz,0,7);ctx.fillStyle=sn?'rgba(110,25,0,.8)':'rgba(20,12,12,.75)';ctx.fill();
    ctx.strokeStyle='rgba(255,170,70,.85)';ctx.lineWidth=Math.max(1,sz*.18);ctx.stroke();
    if(hp>.3)sc.cr.forEach(c=>{ctx.beginPath();ctx.moveTo(sx,sy);
      ctx.lineTo(sx+Math.cos(c.a+c.j)*c.l*r*.5,sy+Math.sin(c.a+c.j)*c.l*r*.5);
      ctx.lineTo(sx+Math.cos(c.a)*c.l*r,sy+Math.sin(c.a)*c.l*r);
      ctx.strokeStyle='rgba(255,150,50,'+hp+')';ctx.lineWidth=1.5;ctx.stroke();});
  });
  ctx.restore();
}
function boom(v){
  if(!au||!au.on)return;
  const A=au.A,n=Math.floor(A.sampleRate*1.6),buf=A.createBuffer(1,n,A.sampleRate),dd=buf.getChannelData(0);
  for(let i=0;i<n;i++)dd[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
  const src=A.createBufferSource(),lp=A.createBiquadFilter(),g=A.createGain();
  lp.type='lowpass';lp.frequency.value=400+v*500;src.buffer=buf;g.gain.value=Math.min(.9,.15+v*.5);
  src.connect(lp);lp.connect(g);g.connect(A.destination);src.start();
  const o=A.createOscillator(),og=A.createGain(),n0=A.currentTime;
  o.frequency.setValueAtTime(140,n0);o.frequency.exponentialRampToValueAtTime(35,n0+.6);
  og.gain.setValueAtTime(Math.min(.8,.1+v*.4),n0);og.gain.exponentialRampToValueAtTime(.001,n0+.8);
  o.connect(og);og.connect(A.destination);o.start();o.stop(n0+.9);
}
function launch(x,y){
  const sz=.1+Math.random()*.9,a=Math.random()*Math.PI*2,L=Math.hypot(W,H)*1.1;
  meteors.push({tx:x,ty:y,sx:x+Math.cos(a)*L,sy:y+Math.sin(a)*L,u:0,dur:.6+.5*sz,s:sz,rad:4+sz*Math.min(W,H)*.1,tr:[]});
  msg='☄ Meteorito '+sizeName(sz)+' en camino...';msgT=1.5;
}
function sparks(x,y,n,c,vmax,rmax){
  for(let i=0;i<n;i++){const a=Math.random()*7,sp=40+Math.random()*vmax;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.5+Math.random()*.9,max:1.4,r:1+Math.random()*rmax,c:Math.random()<.5?c:'255,'+(120+Math.random()*100|0)+',40'});}
}
function impact(m){
  const sz=m.s,x=m.tx,y=m.ty,hit=bodies().find(b=>Math.hypot(x-b.x,y-b.y)<=b.r);
  const base=!hit?'255,200,140':hit.id==='sun'?'255,200,60':hit.id==='earth'?'120,190,255':'215,215,205';
  shake=Math.max(shake,sz*(hit?26:10));boom(sz*(hit?1:.4));
  fxs.push({t:'ring',x,y,r0:4,r1:m.rad*(2+sz*4),life:.6,max:.6,c:base,w:4+sz*8});
  fxs.push({t:'ball',x,y,r0:m.rad*.4,r1:m.rad*(1.5+sz*3),life:.45,max:.45,c:'255,230,170'});
  sparks(x,y,Math.round(10+sz*90),base,160+sz*340,2+sz*3);
  flash={c:'255,240,210',a:hit?.12+sz*.45:.04+.1*sz};
  if(!hit){msg='Meteorito '+sizeName(sz)+': se perdió en el espacio';msgT=2.2;return;}
  const d=getD(hit.id);
  d.scars.push({dx:(x-hit.x)/hit.r,dy:(y-hit.y)/hit.r,sz:.05+sz*.3,cr:[0,1,2].map(()=>({a:Math.random()*7,l:.2+Math.random()*.4,j:(Math.random()-.5)*1.2}))});
  if(d.scars.length>40)d.scars.shift();
  d.hp+=sz*sz*1.15;
  repairBtn.style.display='';
  if(d.hp>=1||sz>=.85)explode(hit);
  else{msg='💥 Meteorito '+sizeName(sz)+' impactó '+NAMES[hit.id]+' · daño '+Math.round(d.hp*100)+'%';msgT=2.5;}
}
function explode(b){
  const d=getD(b.id);d.dead=true;d.hp=1;
  const sn=b.id==='sun',col=sn?'255,190,60':b.id==='earth'?'110,180,255':'220,215,200',sc=b.r/100+.5;
  for(let i=0;i<(sn?260:160);i++){const a=Math.random()*7,sp=(80+Math.random()*500)*sc,q=Math.random();
    parts.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.8+Math.random()*1.6,max:2.4,r:2+Math.random()*b.r*.12,c:q<.45?col:q<.8?'255,120,30':'255,255,255'});}
  fxs.push({t:'ball',x:b.x,y:b.y,r0:b.r*.5,r1:b.r*(sn?6:3.2),life:1.1,max:1.1,c:'255,170,50'});
  fxs.push({t:'ball',x:b.x,y:b.y,r0:b.r*.3,r1:b.r*2,life:.5,max:.5,c:'255,255,240'});
  fxs.push({t:'ring',x:b.x,y:b.y,r0:b.r,r1:b.r*5,life:1.2,max:1.2,c:col,w:14});
  if(sn)fxs.push({t:'ring',x:b.x,y:b.y,r0:b.r,r1:b.r*9,life:1.9,max:1.9,c:'255,220,150',w:6});
  flash={c:'255,245,220',a:sn?1:.7};shake=sn?60:40;boom(1.5);
  msg='💥 ¡'+NAMES[b.id]+' explotó!';msgT=4;
}
function repairAll(){
  Object.keys(dm).forEach(k=>delete dm[k]);parts.length=0;fxs.length=0;meteors.length=0;flash=null;shake=0;
  repairBtn.style.display='none';msg='Todo reparado ✔';msgT=2;
}
function drawFX(){
  const dt=dtg;
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i];m.u+=dt/m.dur;const e=Math.min(1,m.u*m.u);
    m.x=lerp(m.sx,m.tx,e);m.y=lerp(m.sy,m.ty,e);
    m.tr.push({x:m.x,y:m.y});if(m.tr.length>16)m.tr.shift();
    if(Math.random()<.9)parts.push({x:m.x,y:m.y,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*60,life:.5,max:.5,r:1+Math.random()*m.rad*.25,c:'255,'+(120+Math.random()*100|0)+',40'});
    if(m.u>=1){meteors.splice(i,1);impact(m);}
  }
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=fxs.length-1;i>=0;i--){
    const f=fxs[i];f.life-=dt;if(f.life<=0){fxs.splice(i,1);continue;}
    const p=1-f.life/f.max,rr=f.r0+(f.r1-f.r0)*(1-(1-p)*(1-p));
    if(f.t==='ring'){ctx.strokeStyle='rgba('+f.c+','+(1-p)+')';ctx.lineWidth=f.w*(1-p)+1;ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.stroke();}
    else{const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,rr);g.addColorStop(0,'rgba('+f.c+','+.9*(1-p)+')');g.addColorStop(1,'rgba('+f.c+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,rr,0,7);ctx.fill();}
  }
  for(let i=parts.length-1;i>=0;i--){
    const q=parts[i];q.life-=dt;if(q.life<=0){parts.splice(i,1);continue;}
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.985;q.vy*=.985;
    ctx.fillStyle='rgba('+q.c+','+Math.min(1,q.life/q.max*1.5)+')';ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();
  }
  ctx.restore();
  meteors.forEach(m=>{
    const pl=.5+.5*Math.sin(performance.now()/60);
    ctx.strokeStyle='rgba(255,90,60,'+(.35+.4*pl)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(m.tx,m.ty,m.rad*(2-m.u)+4,0,7);ctx.stroke();
    ctx.beginPath();ctx.moveTo(m.tx-m.rad*.6,m.ty);ctx.lineTo(m.tx+m.rad*.6,m.ty);ctx.moveTo(m.tx,m.ty-m.rad*.6);ctx.lineTo(m.tx,m.ty+m.rad*.6);ctx.stroke();
    m.tr.forEach((q,i)=>{const k=i/m.tr.length;disc(q.x,q.y,m.rad*k*.85,'rgba(255,'+(100+k*100|0)+',30,'+k*.45+')');});
    glow(m.x,m.y,m.rad*.3,m.rad*2.6,'rgba(255,160,60,.85)','rgba(255,80,0,0)');
    disc(m.x,m.y,m.rad,'#3a2a22');
    ctx.strokeStyle='rgba(255,150,50,.9)';ctx.lineWidth=Math.max(2,m.rad*.15);ctx.beginPath();ctx.arc(m.x,m.y,m.rad,0,7);ctx.stroke();
  });
  if(flash){ctx.fillStyle='rgba('+flash.c+','+Math.min(1,flash.a)+')';ctx.fillRect(-60,-60,W+120,H+120);flash.a-=dt*1.8;if(flash.a<=0)flash=null;}
  shake=Math.max(0,shake-dt*50);
  if(msgT>0){info.textContent=msg;msgT-=dt;}
}
function lens(d,r1,r2){
  if(d>=r1+r2)return 0;
  if(d<=Math.abs(r1-r2))return Math.PI*Math.min(r1,r2)**2;
  const a=r1*r1*Math.acos((d*d+r1*r1-r2*r2)/(2*d*r1)),b=r2*r2*Math.acos((d*d+r2*r2-r1*r1)/(2*d*r2));
  return a+b-.5*Math.sqrt((-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2));
}

function step(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;dtg=dt;
  if(!playing||drag)return;
  t+=dt*speed*.6;
  if(mode==='solar'){pos.x=cx+R*3.4*Math.sin(t);pos.y=cy+R*.35*Math.sin(t);}
  else if(mode==='lunar'){pos.x=cx+R*3.8*Math.sin(t);pos.y=cy+R*.4*Math.sin(t);}
  else if(mode==='luna'){phase=(phase+dt*speed*.08)%1;phaseIn.value=phase;}
  else if(mode==='3d'){th=(th+dt*speed*.5)%(2*Math.PI);}
  else{pos.x=cx+R*2.5*Math.sin(t);pos.y=cy-R*.6*Math.abs(Math.cos(t));}
}
function draw(ts){
  step(ts||0);
  ctx.clearRect(0,0,W,H);
  ctx.save();if(shake>.5)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  if(mode==='solar'){
    const rm=solarRm(),sA=alive('sun'),mA=alive('moon'),d=Math.hypot(pos.x-cx,pos.y-cy);
    const maxCov=(rm/R)**2;
    const cov=(sA&&mA)?Math.min(1,lens(d,R,rm)/(Math.PI*R*R)):0;
    const k=annular?cov/maxCov:cov,cd=annular?cov*.8:cov;
    if(sA)sky(mix([75,26,122],[8,4,18],cd),mix([40,14,70],[4,2,10],cd),cd*cd);else sky('#0b0620','#04020c',1);
    if(sA){sun(cx,cy,R,1-cd*.6);dmgFX('sun',cx,cy,R);}
    const c6=annular?0:cov**6;
    if(c6>.01)glow(cx,cy,R*.9,R*2.4,'rgba(255,255,255,'+.85*c6+')','rgba(255,220,120,0)');
    if(annular&&sA&&mA&&k>.6){const k6=Math.pow((k-.6)/.4,3);
      glow(cx,cy,R*.95,R*1.6,'rgba(255,170,40,'+.8*k6+')','rgba(255,120,0,0)');
      ctx.strokeStyle='rgba(255,245,190,'+k6+')';ctx.lineWidth=R-rm+2;ctx.beginPath();ctx.arc(cx,cy,(R+rm)/2,0,7);ctx.stroke();}
    if(mA){disc(pos.x,pos.y,rm,mix([31,74,82],[6,12,16],cd));dmgFX('moon',pos.x,pos.y,rm);}
    if(!annular)solarEffects(cov,d,rm);
    level=Math.pow(k,3)*(annular?.7:1);checkTotal(k>.985&&sA&&mA);
    info.textContent=!sA?'El Sol explotó 💥':!mA?'La Luna explotó 💥':annular?(k>.97?'Eclipse anular · anillo de fuego 🔥':'Cobertura del Sol: '+Math.round(cov*100)+'%'):'Cobertura del Sol: '+Math.round(cov*100)+'%'+(cov>.985?' · ¡Eclipse total!':'');
    live='Cobertura: '+Math.round(cov*100)+'% · '+(annular?(k>.97?'Anular':cov>.01?'Parcial':'Sin eclipse'):(cov>.985?'Total':cov>.01?'Parcial':'Sin eclipse'));
  }else if(mode==='lunar'){
    sky('#0b0620','#04020c',1);
    const rm=R*.9,um=rm*1.6,pen=rm*2.6;
    glow(cx,cy,um,pen,'rgba(0,0,0,.45)','rgba(0,0,0,0)');
    ctx.strokeStyle='rgba(255,255,255,.18)';ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(cx,cy,um,0,7);ctx.stroke();ctx.setLineDash([]);
    const mA=alive('moon');
    if(mA){moonLit(pos.x,pos.y,rm);dmgFX('moon',pos.x,pos.y,rm);}
    ctx.save();ctx.beginPath();ctx.arc(pos.x,pos.y,mA?rm:0,0,7);ctx.clip();
    const g=ctx.createRadialGradient(cx,cy,um*.55,cx,cy,pen);
    g.addColorStop(0,'rgba(120,25,8,.93)');g.addColorStop(um/pen*.95,'rgba(150,40,15,.85)');g.addColorStop(um/pen*1.05,'rgba(40,20,30,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
    const d=Math.hypot(pos.x-cx,pos.y-cy);
    level=Math.max(0,Math.min(1,(um+rm-d)/(2*rm)));checkTotal(mA&&d+rm<=um);
    live='Dentro de la umbra: '+Math.round(level*100)+'%';
    info.textContent=!mA?'La Luna explotó 💥':d+rm<=um?'Eclipse lunar total · Luna roja':d-rm<um?'Eclipse lunar parcial':d-rm<pen?'Penumbra':'Arrastra la Luna hacia la sombra';
  }else if(mode==='luna'){
    sky('#0b0620','#04020c',1);
    level=(1-Math.cos(2*Math.PI*phase))/2*.3;wasTotal=false;
    if(alive('moon')){moonPhase(pos.x,pos.y,R*1.2,phase);dmgFX('moon',pos.x,pos.y,R*1.2);}
    info.textContent=!alive('moon')?'La Luna explotó 💥':phaseName(phase)+' · '+Math.round((1-Math.cos(2*Math.PI*phase))/2*100)+'% iluminada';
    live='Día del ciclo: '+(phase*29.53).toFixed(1)+' de 29.5 · '+phaseName(phase);
  }else if(mode==='3d'){
    scene3d();
  }else{
    if(alive('sun'))sky('#6a2aa8','#2a0e4d',.1);else sky('#0b0620','#04020c',1);
    level=.2;wasTotal=false;
    if(alive('sun')){sun(pos.x,pos.y,R*1.2);dmgFX('sun',pos.x,pos.y,R*1.2);}
    info.textContent=alive('sun')?'Arrastra el Sol':'El Sol explotó 💥';
    live='Distancia: ~149.6 millones de km · Luz: 8 min 20 s';
  }
  drawFX();
  ctx.restore();
  if(!panel.hidden)pLive.textContent=live;
  updateSound();
  requestAnimationFrame(draw);
}
cv.addEventListener('pointerdown',e=>{if(meteorMode){launch(e.clientX,e.clientY);return;}drag=true;off={x:pos.x-e.clientX,y:pos.y-e.clientY};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag)return;
  if(mode==='3d'){const sq=Math.max(.15,1-.8*tilt);th=Math.atan2((e.clientY-cy)/sq,e.clientX-W*.58);}
  else{pos.x=e.clientX+off.x;pos.y=e.clientY+off.y}});
cv.addEventListener('pointerup',()=>drag=false);
cv.addEventListener('pointercancel',()=>drag=false);
playBtn.onclick=()=>{playing=!playing;playBtn.classList.toggle('on',playing);playBtn.textContent=playing?'⏸ Pausar':'▶ Reproducir';
  if(playing&&mode!=='luna'&&mode!=='3d'){t=Math.asin(Math.max(-1,Math.min(1,(pos.x-cx)/(R*(mode==='solar'?3.4:mode==='lunar'?3.8:2.5)))));}};
function unlockIOS(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
  try{
    const sr=8000,n=sr,b=new ArrayBuffer(44+n*2),v=new DataView(b);
    const w=(o,t)=>[...t].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
    w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
    const el=new Audio(URL.createObjectURL(new Blob([b],{type:'audio/wav'})));el.loop=true;el.play().catch(()=>{});window._keep=el;
  }catch(e){}
}
if(soundBtn)soundBtn.onclick=async()=>{
  try{
    if(!au){unlockIOS();initAudio();}
    au.on=!au.on;
    if(au.A.state!=='running')await au.A.resume();
    soundBtn.classList.toggle('on',au.on);soundBtn.textContent=au.on?'🔊 Sonido':'🔇 Sonido';
    if(au.on)chime();
  }catch(e){soundBtn.textContent='⚠ Sin audio';}
};
speedIn.oninput=()=>speed=+speedIn.value;
phaseIn.oninput=()=>phase=+phaseIn.value;
meteorBtn.onclick=()=>{meteorMode=!meteorMode;meteorBtn.classList.toggle('on',meteorMode);cv.classList.toggle('aim',meteorMode);
  msg=meteorMode?'☄ Toca la pantalla para lanzar un meteorito':'Modo meteorito apagado';msgT=2.5;};
repairBtn.onclick=repairAll;
annBtn.onclick=()=>{annular=!annular;annBtn.textContent=annular?'Tipo: Anular':'Tipo: Total';annBtn.classList.toggle('on',annular);};
tiltIn.oninput=()=>tilt=+tiltIn.value;
dataBtn.onclick=()=>{panel.hidden=!panel.hidden;dataBtn.classList.toggle('on',!panel.hidden);showData();};
addEventListener('resize',resize);
resize();showData();draw();
