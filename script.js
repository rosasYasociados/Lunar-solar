const cv=document.getElementById('c'),ctx=cv.getContext('2d'),info=document.getElementById('info');
let W,H,R,cx,cy,mode='solar',pos={x:0,y:0},drag=false,off={x:0,y:0};
let playing=false,speed=1,phase=.5,t=0,last=0,th=2.4,tilt=.55,live='';
let dtg=.016,meteorMode=false,annular=false,shake=0,flash=null,msg='',msgT=0,geo3d=null,nova=null,skyDark=1,isTot=false,land=0,game=null,best=0,city=[],rockHits=0;
const blasts=[],kick={x:0,y:0};
try{best=+localStorage.getItem('eclipse_best')||0}catch(e){}
const meteors=[],parts=[],fxs=[],dm={};
const playBtn=document.getElementById('play'),speedIn=document.getElementById('speed'),phaseIn=document.getElementById('phase'),phaseBox=document.getElementById('phaseBox'),tiltIn=document.getElementById('tilt'),tiltBox=document.getElementById('tiltBox'),dataBtn=document.getElementById('dataBtn'),panel=document.getElementById('panel'),pTitle=document.getElementById('pTitle'),pBody=document.getElementById('pBody'),pLive=document.getElementById('pLive'),meteorBtn=document.getElementById('meteorBtn'),repairBtn=document.getElementById('repairBtn'),annBtn=document.getElementById('annBtn'),landBtn=document.getElementById('landBtn'),gameBtn=document.getElementById('gameBtn'),hud=document.getElementById('hud');
const stars=Array.from({length:140},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.4+.3}));
const craters=[[-.3,-.25,.18],[.25,-.1,.22],[-.1,.3,.15],[.35,.35,.1],[-.4,.1,.09],[.05,-.45,.08]];
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')+')';

const DATA={
  solar:['Eclipse solar','Ocurre cuando la Luna se pone justo entre el Sol y la Tierra, en luna nueva. Si la tapa por completo hay eclipse total y se ve la corona (hasta 7 min 32 s). Si la Luna está más lejos se ve más chica y deja un aro brillante: eclipse anular, o anillo de fuego. Usa el botón Tipo para cambiar.'],
  lunar:['Eclipse lunar','Ocurre cuando la Tierra queda entre el Sol y la Luna, en luna llena. La Luna entra en la sombra de la Tierra y se ve roja porque la luz que se dobla en la atmósfera terrestre solo deja pasar los tonos rojos. La totalidad puede durar hasta 1 h 47 min.'],
  luna:['La Luna','Da una vuelta a la Tierra cada 27.3 días, pero sus fases se repiten cada 29.5 días. Siempre está iluminada la mitad que mira al Sol; desde la Tierra vemos más o menos de esa mitad. Está a unos 384,400 km.'],
  sol:['El Sol','Es una estrella a unos 149.6 millones de km. Es 109 veces más ancho que la Tierra y su luz tarda unos 8 min 20 s en llegar. Es 400 veces más grande que la Luna, pero también 400 veces más lejos, por eso se ven del mismo tamaño.'],
  sistema:['Sistema Solar (a escala de dibujo)','El Sol, los 8 planetas, la Luna y el cinturón de asteroides vistos desde arriba. Las distancias y tamaños no están a escala real porque no cabrían en pantalla. Toca un planeta para ver sus datos: los más cercanos al Sol se mueven más rápido. Prueba lanzar meteoritos o hacer explotar el Sol.'],
  '3d':['Vista 3D (a escala de dibujo)','Aquí ves Sol, Tierra y Luna desde arriba. La Luna en el lado del Sol es luna nueva (eclipse solar posible) y en el lado opuesto es luna llena (eclipse lunar posible). La órbita de la Luna está inclinada unos 5°, por eso no hay eclipse todos los meses.']
};
function showData(){pTitle.textContent=DATA[mode][0];pBody.textContent=DATA[mode][1];}
function resize(){
  const d=devicePixelRatio||1;W=innerWidth;H=innerHeight;
  cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
  R=Math.min(W,H)*.2;cx=W/2;cy=H/2+20;reset();buildCity();
}
function reset(){
  if(mode==='solar'||mode==='lunar')pos={x:Math.min(cx+R*2.6,W-R*1.1),y:cy-R*.5};
  else pos={x:cx,y:cy};
}
function setMode(m){
  if(game&&m!=='solar'&&m!=='lunar')endGame(true);
  const prevMode=mode;
  mode=m;reset();t=0;
  if(m==='sistema'){playing=true;playBtn.classList.add('on');playBtn.textContent='⏸ Pausar';}else if(prevMode==='sistema')stopPlay();
  phaseBox.style.display=m==='luna'?'flex':'none';
  tiltBox.style.display=(m==='3d'||m==='sistema')?'flex':'none';
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
function checkTotal(isTotal){isTot=isTotal;if(isTotal&&!wasTotal)chime();wasTotal=isTotal;}
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
  if(alive('earth'))drawSphere('earth',ex,ey,er,null,null);
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
const NAMES={sun:'el Sol',moon:'la Luna',earth:'la Tierra',mercurio:'Mercurio',venus:'Venus',marte:'Marte',jupiter:'Júpiter',saturno:'Saturno',urano:'Urano',neptuno:'Neptuno'};
const PCOL={mercurio:'181,176,168',venus:'232,201,135',marte:'208,88,58',jupiter:'217,180,138',saturno:'230,211,161',urano:'143,216,224',neptuno:'75,111,224'};
const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
const alive=id=>!(dm[id]&&dm[id].dead);
const getD=id=>dm[id]||(dm[id]={hp:0,dead:false,scars:[]});
const sizeName=v=>Math.round(Math.pow(10,(v-.1)/.9*3))+' KM';
const solarRm=()=>R*(annular?.86:.98);
function allBodies(){
  if(mode==='solar')return[{id:'moon',x:pos.x,y:pos.y,r:solarRm()},{id:'sun',x:cx,y:cy,r:R}];
  if(mode==='lunar')return[{id:'moon',x:pos.x,y:pos.y,r:R*.9}];
  if(mode==='luna')return[{id:'moon',x:pos.x,y:pos.y,r:R*1.2}];
  if(mode==='sol')return[{id:'sun',x:pos.x,y:pos.y,r:R*1.2}];
  if(mode==='sistema')return Object.keys(geoSys).map(i=>({id:i,x:geoSys[i].x,y:geoSys[i].y,r:geoSys[i].r,pad:geoSys[i].pad}));
  return geo3d?['moon','earth','sun'].map(i=>({id:i,x:geo3d[i].x,y:geo3d[i].y,r:geo3d[i].r})):[];
}
function bodies(){return allBodies().filter(b=>alive(b.id));}
function dmgFX(id,x,y,r){
  const d=dm[id];if(!d||d.dead)return;
  if(d.burn>0)burnFX(id,x,y,r,d.burn);
  if(!d.scars.length)return;
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
  const sz=pickSize(),a=Math.random()*Math.PI*2,L=Math.hypot(W,H)*1.1;
  const du=.6+.5*sz;
  meteors.push({tx:x,ty:y,sx:x+Math.cos(a)*L,sy:y+Math.sin(a)*L,u:0,dur:du,s:sz,rad:4+sz*Math.min(W,H)*.1,tr:[],phase:0,esc:0,k:1,dx:-Math.cos(a),dy:-Math.sin(a),v0:Math.min(1200,2*L/du*.4),grazed:[]});
  msg='☄ Meteorito de '+sizeName(sz)+' en camino...';msgT=1.5;
}
function sparks(x,y,n,c,vmax,rmax){
  for(let i=0;i<n;i++){const a=Math.random()*7,sp=40+Math.random()*vmax;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.5+Math.random()*.9,max:1.4,r:1+Math.random()*rmax,c:Math.random()<.5?c:'255,'+(120+Math.random()*100|0)+',40'});}
}
function impact(m,hit){
  const sz=m.s,x=m.tx,y=m.ty,Rs=m.rad*(1.3+sz*1.5);
  const base=hit.id==='sun'?'255,200,60':hit.id==='earth'?'120,190,255':(PCOL[hit.id]||'215,215,205');
  shake=Math.max(shake,sz*26);boom(sz);
  fxs.push({t:'ring',x,y,r0:4,r1:Rs,life:.6,max:.6,c:base,w:4+sz*8});
  fxs.push({t:'ball',x,y,r0:m.rad*.4,r1:m.rad*(1.5+sz*3),life:.45,max:.45,c:'255,230,170'});
  sparks(x,y,Math.round(10+sz*90),base,160+sz*340,2+sz*3);
  flash={c:'255,240,210',a:.12+sz*.45};
  blasts.push({x,y,Rs,t:0,max:.6,sz,skip:hit.id,done:[]});
  const d=getD(hit.id);
  d.scars.push({dx:(x-hit.x)/hit.r,dy:(y-hit.y)/hit.r,sz:.05+sz*.3,cr:[0,1,2].map(()=>({a:Math.random()*7,l:.2+Math.random()*.4,j:(Math.random()-.5)*1.2}))});
  if(d.scars.length>40)d.scars.shift();
  d.hp+=sz*sz*1.15*(hit.id==='sun'?.3:1);
  repairBtn.style.display='';
  if(d.hp>=1||sz>=(hit.id==='sun'?.95:.85))explode(hit);
  else{msg='💥 Meteorito de '+sizeName(sz)+' impactó '+NAMES[hit.id]+' · daño '+Math.round(d.hp*100)+'%';msgT=2.5;}
}
function graze(m,b){
  const a=Math.atan2(m.y-b.y,m.x-b.x),sx=b.x+Math.cos(a)*b.r,sy=b.y+Math.sin(a)*b.r;
  sparks(sx,sy,Math.round(8+m.s*30),'255,200,120',60+m.s*180,2+m.s*2);
  fxs.push({t:'ball',x:sx,y:sy,r0:3,r1:m.rad*(1+m.s*1.5),life:.35,max:.35,c:'255,210,150'});
  shake=Math.max(shake,m.s*8);
  const d=getD(b.id);
  d.scars.push({dx:Math.cos(a)*.92,dy:Math.sin(a)*.92,sz:.03+m.s*.12,cr:[0,1].map(()=>({a:Math.random()*7,l:.15+Math.random()*.25,j:(Math.random()-.5)}))});
  d.hp+=m.s*m.s*.35*(b.id==='sun'?.3:1);repairBtn.style.display='';
  if(d.hp>=1)explode(b);else{msg='☄ El meteorito rozó '+NAMES[b.id]+' · daño '+Math.round(d.hp*100)+'%';msgT=2.2;}
}
function posBody(id){return(id==='moon'&&(mode==='solar'||mode==='lunar'||mode==='luna'))||(id==='sun'&&mode==='sol');}
function applyKick(dt){
  if(Math.abs(kick.x)+Math.abs(kick.y)<1){kick.x=kick.y=0;return;}
  pos.x+=kick.x*dt;pos.y+=kick.y*dt;const f=Math.pow(.04,dt);kick.x*=f;kick.y*=f;
}
function blastHit(w,b,dd,gap){
  const f=Math.pow(Math.max(0,1-gap/w.Rs),2),d=getD(b.id),a=Math.atan2(w.y-b.y,w.x-b.x);
  d.hp+=w.sz*w.sz*1.15*.45*f*(b.id==='sun'?.3:1);
  d.scars.push({dx:Math.cos(a)*.9,dy:Math.sin(a)*.9,sz:.04+.12*w.sz*f,cr:[0,1].map(()=>({a:Math.random()*7,l:.15+Math.random()*.3,j:(Math.random()-.5)}))});
  if(d.scars.length>40)d.scars.shift();
  sparks(b.x+Math.cos(a)*b.r,b.y+Math.sin(a)*b.r,Math.round(6+20*w.sz*f),'255,190,110',80+200*w.sz,2);
  if(posBody(b.id)){kick.x-=Math.cos(a)*300*w.sz*f;kick.y-=Math.sin(a)*300*w.sz*f;}
  repairBtn.style.display='';
  if(d.hp>=1)explode(b);else{msg='💥 La onda expansiva golpeó a '+NAMES[b.id]+' · daño '+Math.round(d.hp*100)+'%';msgT=2.5;}
}
function updateBlasts(dt){
  for(let i=blasts.length-1;i>=0;i--){
    const w=blasts[i];w.t+=dt;const p=Math.min(1,w.t/w.max),rr=w.Rs*(1-(1-p)*(1-p)),all=allBodies();
    all.forEach(b=>{
      if(!alive(b.id)||b.id===w.skip||w.done.indexOf(b.id)>=0)return;
      const dd=Math.hypot(b.x-w.x,b.y-w.y),gap=dd-b.r;
      if(gap<=rr&&gap<=w.Rs){w.done.push(b.id);blastHit(w,b,dd,gap);}
    });
    all.forEach(b=>{
      const d=dm[b.id];if(!d||!d.dead||!d.rocks)return;
      d.rocks.forEach((k,j)=>{
        const key=b.id+'#'+j;if(w.done.indexOf(key)>=0)return;
        const rx=b.x+k.ox*b.r,ry=b.y+k.oy*b.r,dd=Math.max(1,Math.hypot(rx-w.x,ry-w.y));
        if(dd<=rr&&dd<=w.Rs){w.done.push(key);const f=45*w.sz*(1-dd/w.Rs)/b.r;k.vx+=(rx-w.x)/dd*f;k.vy+=(ry-w.y)/dd*f;}
      });
    });
    if(p>=1)blasts.splice(i,1);
  }
}
function explode(b){
  b={id:b.id,x:b.x,y:b.y,r:Math.max(b.r,26)};
  const d=getD(b.id);d.dead=true;d.hp=1;makeRocks(d);if(b.id==='sun')startNova();else blasts.push({x:b.x,y:b.y,Rs:b.r*3,t:0,max:.7,sz:.5,skip:b.id,done:[]});
  const sn=b.id==='sun',col=sn?'255,190,60':b.id==='earth'?'110,180,255':(PCOL[b.id]||'220,215,200'),sc=b.r/100+.5;
  for(let i=0;i<(sn?260:160);i++){const a=Math.random()*7,sp=(80+Math.random()*500)*sc,q=Math.random();
    parts.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.8+Math.random()*1.6,max:2.4,r:2+Math.random()*b.r*.12,c:q<.45?col:q<.8?'255,120,30':'255,255,255'});}
  fxs.push({t:'ball',x:b.x,y:b.y,r0:b.r*.5,r1:b.r*(sn?6:3.2),life:1.1,max:1.1,c:'255,170,50'});
  fxs.push({t:'ball',x:b.x,y:b.y,r0:b.r*.3,r1:b.r*2,life:.5,max:.5,c:'255,255,240'});
  fxs.push({t:'ring',x:b.x,y:b.y,r0:b.r,r1:b.r*5,life:1.2,max:1.2,c:col,w:14});
  if(sn)fxs.push({t:'ring',x:b.x,y:b.y,r0:b.r,r1:b.r*9,life:1.9,max:1.9,c:'255,220,150',w:6});
  flash={c:'255,245,220',a:sn?1:.7};shake=sn?60:40;boom(1.5);
  msg='💥 ¡'+NAMES[b.id]+' explotó!'+(b.id==='sun'?' Supernova en camino...':'');msgT=4;
}
function repairAll(){
  Object.keys(dm).forEach(k=>delete dm[k]);nova=null;blasts.length=0;kick.x=kick.y=0;parts.length=0;fxs.length=0;meteors.length=0;flash=null;shake=0;
  repairBtn.style.display='none';msg='Todo reparado ✔';msgT=2;
}
function drawFX(){
  const dt=dtg;
  updateNova(dt);
  updateBlasts(dt);
  for(let i=meteors.length-1;i>=0;i--){
    const m=meteors[i];
    if(m.phase===0){
      m.u+=dt/m.dur;const e=Math.min(1,m.u*m.u);
      m.x=lerp(m.sx,m.tx,e);m.y=lerp(m.sy,m.ty,e);
      if(m.u>=1){
        const hit=bodies().find(q=>Math.hypot(m.tx-q.x,m.ty-q.y)<=q.r+(q.pad||0));
        if(hit){meteors.splice(i,1);impact(m,hit);continue;}
        m.phase=1;m.x=m.tx;m.y=m.ty;m.vv=m.v0;
        msg='☄ Meteorito de '+sizeName(m.s)+': se perdió en el espacio';msgT=2.5;
      }
    }else{
      m.esc+=dt;const f=Math.min(1,m.esc/1.8);
      m.x+=m.dx*m.vv*dt;m.y+=m.dy*m.vv*dt;m.vv*=Math.pow(.25,dt);m.k=1-f*.9;
      if(f>=1){meteors.splice(i,1);continue;}
    }
    const tb=m.phase===0?bodies().find(q=>Math.hypot(m.tx-q.x,m.ty-q.y)<=q.r+(q.pad||0)):null;
    bodies().forEach(q=>{
      if(m.grazed.indexOf(q.id)>=0||(tb&&tb.id===q.id))return;
      if(Math.hypot(m.x-q.x,m.y-q.y)-q.r<=m.rad*m.k*.8){m.grazed.push(q.id);graze(m,q);}
    });
    m.tr.push({x:m.x,y:m.y});if(m.tr.length>16)m.tr.shift();
    if(Math.random()<.9)parts.push({x:m.x,y:m.y,vx:(Math.random()-.5)*60,vy:(Math.random()-.5)*60,life:.5,max:.5,r:(1+Math.random()*m.rad*.25)*m.k,c:'255,'+(120+Math.random()*100|0)+',40'});
  }
  ctx.save();ctx.globalCompositeOperation='lighter';
  drawNova();
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
    const f=m.phase?Math.min(1,m.esc/1.8):0,rd=m.rad*m.k;
    ctx.save();ctx.globalAlpha=1-f*f;
    if(m.phase===0){
      const pl=.5+.5*Math.sin(performance.now()/60);
      ctx.strokeStyle='rgba(255,90,60,'+(.35+.4*pl)+')';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(m.tx,m.ty,m.rad*(2-m.u)+4,0,7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(m.tx-m.rad*.6,m.ty);ctx.lineTo(m.tx+m.rad*.6,m.ty);ctx.moveTo(m.tx,m.ty-m.rad*.6);ctx.lineTo(m.tx,m.ty+m.rad*.6);ctx.stroke();
    }
    m.tr.forEach((q,i)=>{const kk=i/m.tr.length;disc(q.x,q.y,rd*kk*.85,'rgba(255,'+(100+kk*100|0)+',30,'+kk*.45+')');});
    glow(m.x,m.y,rd*.3,rd*2.6,'rgba(255,160,60,.85)','rgba(255,80,0,0)');
    disc(m.x,m.y,rd,'#3a2a22');
    ctx.strokeStyle='rgba(255,150,50,.9)';ctx.lineWidth=Math.max(1.5,rd*.15);ctx.beginPath();ctx.arc(m.x,m.y,rd,0,7);ctx.stroke();
    ctx.restore();
  });
  if(flash){ctx.fillStyle='rgba('+flash.c+','+Math.min(1,flash.a)+')';ctx.fillRect(-60,-60,W+120,H+120);flash.a-=dt*1.8;if(flash.a<=0)flash=null;}
  shake=Math.max(0,shake-dt*50);
  if(msgT>0){info.textContent=msg;msgT-=dt;}
}
// ======== Supernova, restos, escombros ========
const LETH=()=>Math.hypot(W,H)*.8;
function startNova(){nova={t:0,dur:7};}
function novaCenter(){
  if(mode==='solar'||mode==='sistema')return{x:cx,y:cy};
  if(mode==='sol')return{x:pos.x,y:pos.y};
  if(mode==='3d'&&geo3d)return{x:geo3d.sun.x,y:geo3d.sun.y};
  return{x:-W*.3,y:cy};
}
function novaR(){return LETH()*Math.pow(Math.min(1,nova.t/nova.dur),.75);}
function updateNova(dt){
  let Rn=-1,c=null;
  if(nova){nova.t+=dt;Rn=novaR();c=novaCenter();shake=Math.max(shake,14*(1-nova.t/nova.dur));}
  allBodies().forEach(b=>{
    if(b.id==='sun')return;const d=getD(b.id);if(d.dead)return;
    if(d.burn>0||(nova&&Math.hypot(b.x-c.x,b.y-c.y)<=Rn+b.r*.3)){d.burn=(d.burn||0)+dt/2.6;if(d.burn>=1)incinerate(b);}
  });
  if(nova&&nova.t>=nova.dur)nova=null;
}
function drawNova(){
  if(!nova)return;
  const c=novaCenter(),p=Math.min(1,nova.t/nova.dur),Rn=novaR(),bw=Rn*.12+30,fade=1-p*.7,r0=Rn*.5,r1=Rn+bw;
  const g=ctx.createRadialGradient(c.x,c.y,r0,c.x,c.y,r1);
  g.addColorStop(0,'rgba(255,90,20,0)');
  g.addColorStop((Rn*.9-r0)/(r1-r0),'rgba(255,120,40,'+.35*fade+')');
  g.addColorStop((Rn-r0)/(r1-r0),'rgba(255,245,210,'+.9*fade+')');
  g.addColorStop(1,'rgba(255,200,100,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r1,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,100,30,'+.16*(1-p)+')';ctx.fillRect(-60,-60,W+120,H+120);
}
function burnFX(id,x,y,r,b){
  const k=Math.min(1,b*2),ch=Math.max(0,(b-.5)*2);
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.clip();
  ctx.fillStyle='rgba(255,'+Math.round(150-90*k)+',30,'+.55*k+')';ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.fillStyle='rgba(15,8,5,'+.78*ch+')';ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.strokeStyle='rgba(255,170,60,'+.9*k+')';ctx.lineWidth=1.5+ch*2;
  for(let i=0;i<9;i++){const a=i*.7+id.length,l=r*(.5+.5*((i*37)%10)/10);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a+.3)*l*.5,y+Math.sin(a+.3)*l*.5);ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke();}
  ctx.restore();
  glow(x,y,r,r*(1.4+b*.8),'rgba(255,120,30,'+.45*Math.min(1,b*1.5)+')','rgba(255,60,0,0)');
  if(Math.random()<.6)parts.push({x:x+(Math.random()-.5)*r*2,y:y+(Math.random()-.5)*r*2,vx:(Math.random()-.5)*50,vy:-30-Math.random()*60,life:.8,max:.8,r:1+Math.random()*3,c:'255,'+(100+Math.random()*100|0)+',30'});
}
function incinerate(b){
  b={id:b.id,x:b.x,y:b.y,r:Math.max(b.r,26)};
  const d=getD(b.id);d.dead=true;d.burned=true;d.hp=1;makeRocks(d);
  for(let i=0;i<90;i++){const a=Math.random()*7,sp=(40+Math.random()*260)*(b.r/100+.5);
    parts.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.8+Math.random()*1.4,max:2.2,r:2+Math.random()*b.r*.08,c:Math.random()<.6?'255,140,40':'90,70,60'});}
  fxs.push({t:'ball',x:b.x,y:b.y,r0:b.r*.4,r1:b.r*2.4,life:.8,max:.8,c:'255,150,50'});
  fxs.push({t:'ring',x:b.x,y:b.y,r0:b.r,r1:b.r*3,life:.9,max:.9,c:'255,140,60',w:8});
  flash={c:'255,200,140',a:.25};shake=Math.max(shake,25);boom(1);
  msg='🔥 '+cap(NAMES[b.id])+' fue incinerad'+(b.id==='moon'||b.id==='earth'?'a':'o')+' por la supernova';msgT=4;
}
function makeRocks(d){
  d.rocks=Array.from({length:14},()=>{
    const a=Math.random()*7,dist=1.15+Math.random()*1.2,vc=Math.sqrt(.35*dist*dist/Math.pow(dist*dist+.16,1.5))*(Math.random()<.5?-1:1);
    return{ox:Math.cos(a)*dist,oy:Math.sin(a)*dist,vx:-Math.sin(a)*vc+(Math.random()-.5)*.03,vy:Math.cos(a)*vc+(Math.random()-.5)*.03,sz:.04+Math.random()*.08,cd:0};
  });
}
function rockScar(c,nx,ny){
  const d=getD(c.id);if(d.dead)return;
  d.scars.push({dx:nx*.95,dy:ny*.95,sz:.03+Math.random()*.03,cr:[0,1].map(()=>({a:Math.random()*7,l:.1+Math.random()*.2,j:(Math.random()-.5)}))});
  if(d.scars.length>40)d.scars.shift();
  d.hp+=.012*(c.id==='sun'?.3:1);repairBtn.style.display='';
  if(d.hp>=1)explode(c);
}
function stepRocks(dt){
  const list=[];
  allBodies().forEach(b=>{const d=dm[b.id];if(!d||!d.dead||!d.rocks)return;d.rocks.forEach(k=>list.push({k,b}));});
  if(!list.length)return;
  const live=bodies(),n=3,h=dt/n;
  const P=it=>({x:it.b.x+it.k.ox*it.b.r,y:it.b.y+it.k.oy*it.b.r,r:Math.max(2,it.k.sz*it.b.r)});
  for(let s=0;s<n;s++){
    list.forEach(it=>{
      const k=it.k,dd=k.ox*k.ox+k.oy*k.oy,gg=.35/Math.pow(dd+.16,1.5),dist=Math.sqrt(dd)||.01;
      k.vx-=k.ox*gg*h;k.vy-=k.oy*gg*h;
      if(dist<.9){const f=(.9-dist)*1.5;k.vx+=k.ox/dist*f*h;k.vy+=k.oy/dist*f*h;}
      if(dist>3.2){k.vx-=k.ox/dist*.5*h;k.vy-=k.oy/dist*.5*h;}
      const sp=Math.hypot(k.vx,k.vy);if(sp>1.2){k.vx*=1.2/sp;k.vy*=1.2/sp;}
      k.ox+=k.vx*h;k.oy+=k.vy*h;if(k.cd>0)k.cd-=h;
      const dn=Math.hypot(k.ox,k.oy)||.01,nx=k.ox/dn,ny=k.oy/dn,vn=k.vx*nx+k.vy*ny;
      if(dn<.85){if(vn<0){k.vx-=1.5*vn*nx;k.vy-=1.5*vn*ny;}k.ox=nx*.85;k.oy=ny*.85;}
      else if(dn>3.6){if(vn>0){k.vx-=1.6*vn*nx;k.vy-=1.6*vn*ny;}k.ox=nx*3.6;k.oy=ny*3.6;}
    });
    for(let i=0;i<list.length;i++){
      const A=list[i];
      for(let j=i+1;j<list.length;j++){
        const B=list[j],pa=P(A),pb=P(B),dx=pb.x-pa.x,dy=pb.y-pa.y,dd=Math.hypot(dx,dy),md=pa.r+pb.r;
        if(dd>=md||dd<.001)continue;
        const nx=dx/dd,ny=dy/dd,ma=pa.r*pa.r,mb=pb.r*pb.r;
        const vax=A.k.vx*A.b.r,vay=A.k.vy*A.b.r,vbx=B.k.vx*B.b.r,vby=B.k.vy*B.b.r,rel=(vbx-vax)*nx+(vby-vay)*ny;
        if(rel<0){
          const imp=-1.85*rel/(1/ma+1/mb);
          A.k.vx=(vax-imp*nx/ma)/A.b.r;A.k.vy=(vay-imp*ny/ma)/A.b.r;B.k.vx=(vbx+imp*nx/mb)/B.b.r;B.k.vy=(vby+imp*ny/mb)/B.b.r;
          rockHits++;
          if(-rel>20&&parts.length<500)sparks((pa.x+pb.x)/2,(pa.y+pb.y)/2,3,'255,200,120',50,1.5);
        }
        const ov=md-dd;
        A.k.ox-=nx*ov*mb/(ma+mb)/A.b.r;A.k.oy-=ny*ov*mb/(ma+mb)/A.b.r;B.k.ox+=nx*ov*ma/(ma+mb)/B.b.r;B.k.oy+=ny*ov*ma/(ma+mb)/B.b.r;
      }
    }
    list.forEach(it=>{
      const p=P(it);
      live.forEach(c=>{
        const dx=p.x-c.x,dy=p.y-c.y,dd=Math.hypot(dx,dy),md=p.r+c.r;
        if(dd>=md||dd<.001)return;
        const nx=dx/dd,ny=dy/dd,vx=it.k.vx*it.b.r,vy=it.k.vy*it.b.r,vn=vx*nx+vy*ny;
        if(vn<0){
          it.k.vx=(vx-1.6*vn*nx)/it.b.r;it.k.vy=(vy-1.6*vn*ny)/it.b.r;
          if(it.k.cd<=0&&-vn>25){it.k.cd=1.5;rockHits++;sparks(p.x,p.y,5,'255,190,110',70,1.5);rockScar(c,nx,ny);}
        }
        it.k.ox+=nx*(md-dd)/it.b.r;it.k.oy+=ny*(md-dd)/it.b.r;
      });
    });
  }
}
function drawDebris(id,x,y,r,d){
  if(!d.rocks)return;
  d.rocks.forEach((k,i)=>{
    const px=x+k.ox*r,py=y+k.oy*r,sz=Math.max(2,r*k.sz);
    disc(px,py,sz,d.burned?'#2b2322':id==='sun'?'#3c3430':id==='earth'?(i%2?'#4b78b5':'#6b5646'):PCOL[id]?'rgb('+PCOL[id]+')':'#8d897f');
    if(d.burned){ctx.strokeStyle='rgba(255,110,40,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,sz,0,7);ctx.stroke();}
  });
}
function drawRemnant(x,y,r){
  const tm=performance.now()/1000,cols=['255,70,140','80,170,255','255,150,40','170,90,255'];
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<9;i++){
    const a=i*.9+tm*.06*(i%2?1:-1),dd=r*(.35+.18*(i%4)),br=r*(.8+.35*Math.sin(tm*.4+i)),px=x+Math.cos(a)*dd,py=y+Math.sin(a)*dd*.85,c=cols[i%4];
    glow(px,py,0,br,'rgba('+c+',.2)','rgba('+c+',0)');
  }
  const pl=.6+.4*Math.sin(tm*5);
  glow(x,y,0,r*.35,'rgba(200,230,255,'+.9*pl+')','rgba(120,180,255,0)');
  disc(x,y,r*.05,'rgba(255,255,255,'+pl+')');
  ctx.restore();
}
function drawExtras(){
  allBodies().forEach(b=>{
    const d=dm[b.id];if(!d||!d.dead)return;
    if(b.id==='sun')drawRemnant(b.x,b.y,b.r);
    drawDebris(b.id,b.x,b.y,b.r,d);
  });
  stepRocks(dtg);
  drawLand();
  if(game)hud.textContent='⏱ '+Math.max(0,Math.ceil(game.t))+' s · ⭐ '+Math.round(game.score)+' · 🏆 '+best;
}
// ======== Paisaje ========
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function buildCity(){
  const rnd=rng(7);city=[];let x=-10;
  while(x<W){const w=28+rnd()*50;city.push({x,w,h:H*(.04+rnd()*.12),win:Array.from({length:80},()=>rnd())});x+=w+rnd()*6;}
}
function drawLand(){
  if(!land||mode==='3d'||mode==='sistema')return;
  const dk=skyDark,tm=performance.now()/1000;
  const far=mix([48,24,84],[30,18,52],dk),near=mix([20,10,36],[14,8,26],dk);
  if(land===1){
    [[.05,.0023,far,0],[.07,.0035,near,2]].forEach(([amp,fr,col,ph])=>{
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);
      for(let x=0;x<=W;x+=8)ctx.lineTo(x,H-H*(amp+.05*Math.sin(x*fr*3+ph)+.04*Math.sin(x*fr*7+ph*2)+.02*Math.sin(x*fr*17)));
      ctx.lineTo(W,H);ctx.fill();});
  }else{
    ctx.fillStyle=near;
    city.forEach(b=>ctx.fillRect(b.x,H-b.h,b.w,b.h));
    if(dk>.5){
      const al=Math.min(1,(dk-.5)*2)*.85;ctx.fillStyle='rgba(255,220,120,'+al+')';
      city.forEach(b=>{const cols=Math.floor(b.w/10),rows=Math.floor(b.h/14);
        for(let q=0;q<rows;q++)for(let c=0;c<cols;c++)if(b.win[(q*cols+c)%80]<.45)ctx.fillRect(b.x+4+c*10,H-b.h+6+q*14,4,6);});
    }
  }
  const al=mode==='solar'?Math.max(0,1-dk*2.2):mode==='sol'&&alive('sun')?.7:0;
  if(al>.03){
    ctx.strokeStyle='rgba(20,10,30,'+al+')';ctx.lineWidth=2;
    for(let i=0;i<7;i++){
      const x=((tm*(30+i*7)+i*150)%(W+120))-60,y=H*(.25+.04*i)+Math.sin(tm*.7+i)*18,f=Math.sin(tm*9+i*2)*6;
      ctx.beginPath();ctx.moveTo(x-9,y-f);ctx.quadraticCurveTo(x-4,y-f-4,x,y);ctx.quadraticCurveTo(x+4,y-f-4,x+9,y-f);ctx.stroke();
    }
    if(au&&au.on&&al>.3&&Math.random()<.01){
      const A=au.A,o=A.createOscillator(),g=A.createGain(),t0=A.currentTime;
      o.frequency.setValueAtTime(2600,t0);o.frequency.linearRampToValueAtTime(3400,t0+.08);
      g.gain.setValueAtTime(.03*al,t0);g.gain.exponentialRampToValueAtTime(.0005,t0+.1);
      o.connect(g);g.connect(A.destination);o.start(t0);o.stop(t0+.12);
    }
  }
}
// ======== Minijuego ========
function stopPlay(){playing=false;playBtn.classList.remove('on');playBtn.textContent='▶ Reproducir';}
function startGame(){
  if(mode!=='solar'&&mode!=='lunar')setMode('solar');
  stopPlay();
  game={t:30,score:0,vx:0,vy:0,el:0};
  pos={x:Math.min(cx+R*(1.5+Math.random()),W-R*.6),y:cy+(Math.random()-.5)*R*2};
  hud.hidden=false;gameBtn.classList.add('on');gameBtn.textContent='⏹ Parar juego';
  msg='🎯 Mantén el eclipse total: arrastra la Luna, se escapa sola';msgT=3;
}
function gameStep(dt){
  game.el+=dt;game.t-=dt;
  const diff=1+game.el/12;
  game.vx+=(Math.random()-.5)*600*dt*diff;game.vy+=(Math.random()-.5)*600*dt*diff;
  const m=Math.hypot(game.vx,game.vy),mx=90*diff;if(m>mx){game.vx*=mx/m;game.vy*=mx/m;}
  pos.x+=game.vx*dt;pos.y+=game.vy*dt;
  if(pos.x<40||pos.x>W-40){game.vx*=-1;pos.x=Math.max(40,Math.min(W-40,pos.x));}
  if(pos.y<90||pos.y>H-150){game.vy*=-1;pos.y=Math.max(90,Math.min(H-150,pos.y));}
  game.score+=dt*(isTot?100:level*20);
  if(game.t<=0||!alive('moon')||!alive('sun'))endGame();
}
function endGame(silent){
  if(!game)return;
  const sc=Math.round(game.score),rec=sc>best;
  if(rec){best=sc;try{localStorage.setItem('eclipse_best',best)}catch(e){}}
  if(!silent){msg='🎯 ¡Fin! Puntaje: '+sc+(rec?' 🏆 ¡Nuevo récord!':' · Récord: '+best);msgT=6;}
  game=null;hud.hidden=true;gameBtn.classList.remove('on');gameBtn.textContent='🎯 Juego';
}
// ======== Sistema Solar ========
const PL=[
 {id:'mercurio',n:'Mercurio',f:.17,r:5,col:[181,176,168],P:.24,dist:'57.9 millones de km',per:'88 días'},
 {id:'venus',n:'Venus',f:.26,r:7,col:[232,201,135],P:.62,dist:'108.2 millones de km',per:'225 días'},
 {id:'earth',n:'Tierra',f:.35,r:7.5,col:[70,130,220],P:1,dist:'149.6 millones de km',per:'365 días'},
 {id:'marte',n:'Marte',f:.45,r:6,col:[208,88,58],P:1.88,dist:'227.9 millones de km',per:'687 días'},
 {id:'jupiter',n:'Júpiter',f:.66,r:15,col:[217,180,138],P:11.86,dist:'778.5 millones de km',per:'11.9 años'},
 {id:'saturno',n:'Saturno',f:.79,r:13,col:[230,211,161],P:29.5,dist:'1,434 millones de km',per:'29.5 años',ring:1},
 {id:'urano',n:'Urano',f:.9,r:9.5,col:[143,216,224],P:84,dist:'2,871 millones de km',per:'84 años'},
 {id:'neptuno',n:'Neptuno',f:1,r:9,col:[75,111,224],P:165,dist:'4,495 millones de km',per:'165 años'}
];
const OM=PL.map(p=>.25/Math.pow(p.P,.75));
let ang=PL.map((p,i)=>i*1.3+.5),angM=0,geoSys={},sel=null;
const belt=Array.from({length:170},(_,i)=>{const q=rng(i*13+5);return{a:q()*7,f:.53+q()*.07,s:.6+q()*1.1,v:.015+q()*.02};});
function stepSist(dt){PL.forEach((p,i)=>{ang[i]+=dt*speed*OM[i];});angM+=dt*speed*2.2;}
function selectPlanet(px,py){
  let bestId=null,bd=1e9;
  Object.keys(geoSys).forEach(id=>{const g=geoSys[id],d=Math.hypot(px-g.x,py-g.y);if(d<=g.r+12&&d<bd){bd=d;bestId=id;}});
  sel=bestId;
}
// ======== Planetas con textura que giran sobre su eje ========
let spinT=0;
const SIZES=[0,1,5,10,30,100,500,1000];let sizeI=0;
const sizeBtn=document.getElementById('sizeBtn');
const pickSize=()=>SIZES[sizeI]?.1+.9*Math.log10(SIZES[sizeI])/3:.1+Math.random()*.9;
sizeBtn.onclick=()=>{sizeI=(sizeI+1)%SIZES.length;sizeBtn.textContent='Tamaño: '+(SIZES[sizeI]?SIZES[sizeI]+' KM':'Aleatorio');};
const SPIN={earth:.55,marte:.52,jupiter:1.1,saturno:1,venus:-.07,mercurio:.05,urano:-.6,neptuno:.7};
const AXT={earth:.41,marte:.44,jupiter:.05,saturno:.47,venus:3.1,mercurio:0,urano:1.4,neptuno:.5};
const CONT=[
 [[-168,66],[-140,70],[-110,73],[-85,70],[-65,62],[-55,52],[-55,47],[-67,44],[-75,38],[-80,32],[-81,25],[-90,29],[-97,26],[-97,20],[-90,18],[-87,21],[-83,10],[-78,8],[-85,10],[-92,15],[-105,20],[-110,24],[-117,32],[-124,40],[-124,48],[-135,58],[-150,60],[-165,56]],
 [[-78,8],[-72,12],[-62,10],[-50,0],[-35,-6],[-39,-15],[-48,-26],[-58,-38],[-65,-45],[-68,-55],[-74,-50],[-73,-38],[-71,-20],[-76,-14],[-81,-5],[-80,0],[-77,4]],
 [[-17,21],[-10,30],[-5,36],[10,37],[20,32],[32,31],[35,22],[43,12],[51,12],[40,-4],[40,-15],[35,-25],[27,-34],[18,-34],[12,-17],[9,-1],[8,4],[-8,4],[-17,14]],
 [[-10,36],[-9,43],[-2,48],[5,53],[10,57],[20,60],[30,70],[60,68],[100,77],[140,72],[180,68],[170,60],[160,52],[142,48],[130,42],[122,40],[122,30],[110,20],[105,10],[100,2],[98,10],[92,22],[80,15],[72,20],[65,25],[58,25],[56,28],[48,30],[35,36],[28,36],[20,40],[14,45],[8,44],[-5,36]],
 [[114,-22],[122,-18],[131,-12],[137,-12],[142,-11],[146,-19],[153,-27],[150,-37],[141,-38],[135,-34],[129,-32],[115,-34]],
 [[-52,60],[-44,60],[-20,70],[-20,80],[-40,83],[-60,80],[-72,76],[-58,66]],
 [[-180,-72],[-120,-74],[-60,-70],[0,-70],[60,-68],[120,-66],[180,-72],[180,-90],[-180,-90]]
];
const TEX={},SPH={};
function texFor(id){
  if(TEX[id])return TEX[id];
  const c=document.createElement('canvas');c.width=360;c.height=180;
  const g=c.getContext('2d'),rn=rng(id.length*131+id.charCodeAt(0)*7);
  const fill=col=>{g.fillStyle=col;g.fillRect(0,0,360,180);};
  const blob=(x,y,rx,ry,col)=>{g.fillStyle=col;[-360,0,360].forEach(o=>{g.beginPath();g.ellipse(x+o,y,rx,ry,0,0,7);g.fill();});};
  if(id==='earth'){
    const og=g.createLinearGradient(0,0,0,180);og.addColorStop(0,'#1a5a9e');og.addColorStop(.5,'#1f6fb8');og.addColorStop(1,'#1a5a9e');g.fillStyle=og;g.fillRect(0,0,360,180);
    CONT.forEach((poly,pi)=>{g.fillStyle=pi===6?'#eef4fa':pi===5?'#e4eee8':'#3f8c48';g.beginPath();
      poly.forEach((q,i)=>{const x=q[0]+180,y=90-q[1];i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.fill();});
    blob(195,70,22,9,'rgba(205,170,100,.75)');blob(228,80,10,7,'rgba(205,170,100,.7)');blob(310,128,16,9,'rgba(200,150,90,.7)');blob(280,52,18,6,'rgba(190,165,110,.55)');
    blob(110,140,6,14,'rgba(30,110,50,.6)');blob(150,100,10,10,'rgba(25,100,45,.55)');blob(180,160,0.1,0.1,'rgba(0,0,0,0)');
    g.fillStyle='#eef4fa';g.fillRect(0,0,360,8);
    for(let i=0;i<45;i++)blob(rn()*360,15+rn()*150,8+rn()*22,2+rn()*5,'rgba(255,255,255,.33)');
  }else if(id==='marte'){
    fill('#c25e3c');for(let i=0;i<16;i++)blob(rn()*360,25+rn()*130,8+rn()*26,5+rn()*12,'rgba(105,55,40,.55)');
    for(let i=0;i<8;i++)blob(rn()*360,25+rn()*130,6+rn()*14,3+rn()*6,'rgba(230,150,100,.35)');
    g.fillStyle='#f1ece6';g.fillRect(0,0,360,9);g.fillRect(0,172,360,8);
  }else if(id==='jupiter'||id==='saturno'){
    const jup=id==='jupiter',A=jup?[217,180,138]:[232,214,165],B=jup?[160,112,80]:[196,170,120];
    for(let y=0;y<180;y++){const t=.5+.5*Math.sin(y*.34)*Math.sin(y*.11+1);g.fillStyle='rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t*(jup?1:.55))).join(',')+')';g.fillRect(0,y,360,1);}
    if(jup){blob(200,118,26,13,'rgba(190,80,50,.9)');blob(200,118,17,8,'rgba(215,120,80,.8)');for(let i=0;i<10;i++)blob(rn()*360,30+rn()*120,5+rn()*9,2+rn()*3,'rgba(245,235,215,.6)');}
  }else if(id==='venus'){
    fill('#e5c887');for(let i=0;i<40;i++)blob(rn()*360,10+rn()*160,16+rn()*40,3+rn()*7,i%2?'rgba(255,240,200,.35)':'rgba(190,140,70,.3)');
  }else if(id==='mercurio'){
    fill('#a8a49a');for(let i=0;i<70;i++){const x=rn()*360,y=10+rn()*160,q=2+rn()*7;blob(x,y,q,q*.8,'rgba(90,88,84,.45)');blob(x-q*.25,y-q*.25,q*.7,q*.55,'rgba(210,206,196,.35)');}
  }else if(id==='urano'){
    fill('#8fd8e0');for(let y=0;y<180;y+=1){g.fillStyle='rgba(255,255,255,'+(.07*Math.sin(y*.2)+.06)+')';g.fillRect(0,y,360,1);}
  }else{
    fill('#4b6fe0');for(let y=0;y<180;y+=1){g.fillStyle='rgba(255,255,255,'+(.05*Math.sin(y*.25)+.04)+')';g.fillRect(0,y,360,1);}
    blob(120,100,22,11,'rgba(25,40,130,.8)');for(let i=0;i<10;i++)blob(rn()*360,30+rn()*120,12+rn()*18,1.5+rn()*2,'rgba(240,248,255,.5)');
  }
  return TEX[id]=g.getImageData(0,0,360,180);
}
function drawSphere(id,x,y,r,lx,ly){
  if(r<1.5)return;
  const dpr=devicePixelRatio||1,d=Math.max(10,Math.round(2*r*dpr)),key=id+d;
  let S=SPH[key];
  if(!S){const c=document.createElement('canvas');c.width=c.height=d;const g=c.getContext('2d');S=SPH[key]={c,g,img:g.createImageData(d,d)};}
  const T=texFor(id).data,D=S.img.data,rot=spinT*(SPIN[id]||0),ta=AXT[id]||0,ct=Math.cos(ta),st=Math.sin(ta);
  let Lx=0,Ly=0,Lz=1,lit=false;
  if(lx!=null){const dx=lx-x,dy=ly-y,dd=Math.hypot(dx,dy)||1;Lx=dx/dd*.8;Ly=dy/dd*.8;Lz=.6;const q=Math.hypot(Lx,Ly,Lz);Lx/=q;Ly/=q;Lz/=q;lit=true;}
  for(let j=0;j<d;j++)for(let i=0;i<d;i++){
    const nx=(i+.5)/d*2-1,ny=(j+.5)/d*2-1,rr=nx*nx+ny*ny,o=(j*d+i)*4;
    if(rr>1){D[o+3]=0;continue;}
    const nz=Math.sqrt(1-rr),ux=nx*ct+ny*st,uy=-nx*st+ny*ct;
    const lat=Math.asin(Math.max(-1,Math.min(1,-uy))),lon=Math.atan2(ux,nz)-rot;
    const tx=Math.floor((((lon/(2*Math.PI)+.5)%1)+1)%1*360)%360,ty=Math.max(0,Math.min(179,Math.floor((.5-lat/Math.PI)*180)));
    const ti=(ty*360+tx)*4,it=lit?.16+.84*Math.max(0,nx*Lx+ny*Ly+nz*Lz):.5+.5*nz;
    D[o]=T[ti]*it;D[o+1]=T[ti+1]*it;D[o+2]=T[ti+2]*it;D[o+3]=255;
  }
  S.g.putImageData(S.img,0,0);
  ctx.drawImage(S.c,x-r,y-r,2*r,2*r);
  if(id==='earth'){ctx.strokeStyle='rgba(130,190,255,.45)';ctx.lineWidth=Math.max(1,r*.07);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.stroke();}
}
function planetDisc(x,y,r,col){
  const dd=Math.hypot(cx-x,cy-y)||1,lx=x+(cx-x)/dd*r*.45,ly=y+(cy-y)/dd*r*.45;
  const g=ctx.createRadialGradient(lx,ly,r*.1,x,y,r*1.05);
  g.addColorStop(0,mix(col,[255,255,255],.35));g.addColorStop(1,mix(col,[0,0,0],.6));
  disc(x,y,r,g);
}
function sceneSist(){
  sky('#0b0620','#04020c',1);
  const Rm=Math.min(W,H)*.46,k=1-.8*tilt,us=Rm/380,tm=performance.now()/1000,sr=Rm*.065;
  const pp=PL.map((p,i)=>({p,x:cx+Rm*p.f*Math.cos(ang[i]),y:cy+Rm*p.f*k*Math.sin(ang[i]),r:Math.max(4.5,p.r*us),s:Math.sin(ang[i])}));
  ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1;
  PL.forEach(p=>{ctx.beginPath();ctx.ellipse(cx,cy,Rm*p.f,Rm*p.f*k,0,0,7);ctx.stroke();});
  ctx.fillStyle='rgba(190,180,170,.75)';
  belt.forEach(b=>{const a=b.a+tm*b.v,rx=Rm*b.f;ctx.fillRect(cx+rx*Math.cos(a),cy+rx*k*Math.sin(a),b.s,b.s);});
  const E=pp[2],mr=Math.max(E.r*2.4,12*us),mo={x:E.x+Math.cos(angM)*mr,y:E.y+Math.sin(angM)*mr*k,r:Math.max(3,2.6*us)};
  ctx.strokeStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.ellipse(E.x,E.y,mr,mr*k,0,0,7);ctx.stroke();
  const drawP=q=>{
    const id=q.p.id;if(!alive(id))return;
    if(id==='earth')glow(q.x,q.y,q.r*.9,q.r*1.7,'rgba(90,160,255,.35)','rgba(90,160,255,0)');
    const rk=q.r*1.9,ry=rk*(.18+.5*k);
    if(q.p.ring){ctx.strokeStyle='rgba(225,205,150,.75)';ctx.lineWidth=q.r*.4;ctx.beginPath();ctx.ellipse(q.x,q.y,rk,ry,0,Math.PI,2*Math.PI);ctx.stroke();}
    drawSphere(id,q.x,q.y,q.r,cx,cy);
    if(q.p.ring){ctx.strokeStyle='rgba(225,205,150,.8)';ctx.lineWidth=q.r*.4;ctx.beginPath();ctx.ellipse(q.x,q.y,rk,ry,0,0,Math.PI);ctx.stroke();}
    dmgFX(id,q.x,q.y,q.r);
    ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='12px -apple-system,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(q.p.n,q.x,q.y+q.r+14);
    if(sel===id){ctx.strokeStyle='rgba(255,233,138,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,q.r+6,0,7);ctx.stroke();}
  };
  const drawSun=()=>{
    if(!alive('sun'))return;
    glow(cx,cy,sr*.8,sr*3.4,'rgba(255,220,60,.5)','rgba(255,200,40,0)');disc(cx,cy,sr,'#ffe14a');dmgFX('sun',cx,cy,sr);
    if(sel==='sun'){ctx.strokeStyle='rgba(255,233,138,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,sr+6,0,7);ctx.stroke();}
  };
  pp.filter(q=>q.s<0).forEach(drawP);drawSun();pp.filter(q=>q.s>=0).forEach(drawP);
  if(alive('moon')){planetDisc(mo.x,mo.y,mo.r,[205,203,195]);dmgFX('moon',mo.x,mo.y,mo.r);
    if(sel==='moon'){ctx.strokeStyle='rgba(255,233,138,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mo.x,mo.y,mo.r+5,0,7);ctx.stroke();}}
  geoSys={};
  geoSys.moon={x:mo.x,y:mo.y,r:mo.r,pad:6};
  pp.forEach(q=>{geoSys[q.p.id]={x:q.x,y:q.y,r:q.r,pad:8};});
  geoSys.sun={x:cx,y:cy,r:sr,pad:4};
  let txt='Sistema Solar · toca un planeta para ver sus datos';
  if(sel){const P=PL.find(p=>p.id===sel);
    txt=!alive(sel)?cap(NAMES[sel])+' ya no existe':sel==='moon'?'Luna · 384,400 km de la Tierra · órbita: 27.3 días':sel==='sun'?'Sol · estrella · 4,600 millones de años':P.n+' · '+P.dist+' del Sol · órbita: '+P.per;}
  info.textContent=txt;live=txt;level=.15;wasTotal=false;
}
function lens(d,r1,r2){
  if(d>=r1+r2)return 0;
  if(d<=Math.abs(r1-r2))return Math.PI*Math.min(r1,r2)**2;
  const a=r1*r1*Math.acos((d*d+r1*r1-r2*r2)/(2*d*r1)),b=r2*r2*Math.acos((d*d+r2*r2-r1*r1)/(2*d*r2));
  return a+b-.5*Math.sqrt((-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2));
}

function step(ts){
  const dt=Math.min(.05,(ts-last)/1000||0);last=ts;dtg=dt;applyKick(dt);spinT+=dt*Math.max(.3,speed);if(game)gameStep(dt);
  if(!playing||drag)return;
  t+=dt*speed*.6;
  if(mode==='solar'){pos.x=cx+R*3.4*Math.sin(t);pos.y=cy+R*.35*Math.sin(t);}
  else if(mode==='lunar'){pos.x=cx+R*3.8*Math.sin(t);pos.y=cy+R*.4*Math.sin(t);}
  else if(mode==='luna'){phase=(phase+dt*speed*.08)%1;phaseIn.value=phase;}
  else if(mode==='3d'){th=(th+dt*speed*.5)%(2*Math.PI);}
  else if(mode==='sistema'){stepSist(dt);}
  else{pos.x=cx+R*2.5*Math.sin(t);pos.y=cy-R*.6*Math.abs(Math.cos(t));}
}
function draw(ts){
  step(ts||0);skyDark=1;
  ctx.clearRect(0,0,W,H);
  ctx.save();if(shake>.5)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  if(mode==='solar'){
    const rm=solarRm(),sA=alive('sun'),mA=alive('moon'),d=Math.hypot(pos.x-cx,pos.y-cy);
    const maxCov=(rm/R)**2;
    const cov=(sA&&mA)?Math.min(1,lens(d,R,rm)/(Math.PI*R*R)):0;
    const k=annular?cov/maxCov:cov,cd=annular?cov*.8:cov;skyDark=cd;
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
  }else if(mode==='sistema'){
    sceneSist();
  }else{
    skyDark=alive('sun')?.1:1;
    if(alive('sun'))sky('#6a2aa8','#2a0e4d',.1);else sky('#0b0620','#04020c',1);
    level=.2;wasTotal=false;
    if(alive('sun')){sun(pos.x,pos.y,R*1.2);dmgFX('sun',pos.x,pos.y,R*1.2);}
    info.textContent=alive('sun')?'Arrastra el Sol':'El Sol explotó 💥';
    live='Distancia: ~149.6 millones de km · Luz: 8 min 20 s';
  }
  drawExtras();
  drawFX();
  ctx.restore();
  if(!panel.hidden)pLive.textContent=live;
  updateSound();
  requestAnimationFrame(draw);
}
cv.addEventListener('pointerdown',e=>{if(meteorMode){launch(e.clientX,e.clientY);return;}if(mode==='sistema'){selectPlanet(e.clientX,e.clientY);return;}drag=true;off={x:pos.x-e.clientX,y:pos.y-e.clientY};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag)return;
  if(mode==='3d'){const sq=Math.max(.15,1-.8*tilt);th=Math.atan2((e.clientY-cy)/sq,e.clientX-W*.58);}
  else{pos.x=e.clientX+off.x;pos.y=e.clientY+off.y}});
cv.addEventListener('pointerup',()=>drag=false);
cv.addEventListener('pointercancel',()=>drag=false);
playBtn.onclick=()=>{if(game)endGame(true);playing=!playing;playBtn.classList.toggle('on',playing);playBtn.textContent=playing?'⏸ Pausar':'▶ Reproducir';
  if(playing&&mode!=='luna'&&mode!=='3d'&&mode!=='sistema'){t=Math.asin(Math.max(-1,Math.min(1,(pos.x-cx)/(R*(mode==='solar'?3.4:mode==='lunar'?3.8:2.5)))));}};
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
meteorBtn.onclick=()=>{meteorMode=!meteorMode;meteorBtn.classList.toggle('on',meteorMode);cv.classList.toggle('aim',meteorMode);sizeBtn.style.display=meteorMode?'':'none';
  msg=meteorMode?'☄ Toca la pantalla para lanzar un meteorito':'Modo meteorito apagado';msgT=2.5;};
repairBtn.onclick=repairAll;
landBtn.onclick=()=>{land=(land+1)%3;landBtn.textContent='Paisaje: '+['Apagado','Montañas','Ciudad'][land];landBtn.classList.toggle('on',land>0);};
gameBtn.onclick=()=>{game?endGame():startGame();};
annBtn.onclick=()=>{annular=!annular;annBtn.textContent=annular?'Tipo: Anular':'Tipo: Total';annBtn.classList.toggle('on',annular);};
tiltIn.oninput=()=>tilt=+tiltIn.value;
dataBtn.onclick=()=>{panel.hidden=!panel.hidden;dataBtn.classList.toggle('on',!panel.hidden);showData();};
addEventListener('resize',resize);
resize();showData();draw();

if('serviceWorker' in navigator)addEventListener('load',()=>{try{navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}});
