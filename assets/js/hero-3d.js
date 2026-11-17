/* ---------- hero: three 3D models that build themselves, stage by stage ---------- */
(function(){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const cv=$('#h3d'), portalEl=$('#portal'), stageEl=$('#stage'), stageT=$('#stage-t'), tabs=$('#models');
  const imgWrap=$('#hero-3d-img-wrap'), imgEl=$('#hero-3d-img');
  const off=()=>{tabs.hidden=true};
  if(!cv||typeof THREE==='undefined') return off();
  let gl;
  try{ gl=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}); }catch(e){ return off(); }
  portalEl.classList.add('is3d');
  const SMALL=innerWidth<700;
  gl.setPixelRatio(Math.min(window.devicePixelRatio||1,SMALL?1.75:2));
  gl.shadowMap.enabled=true; gl.shadowMap.type=THREE.PCFSoftShadowMap;

  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(30,5/6.2,.1,120);
  const hemi=new THREE.HemisphereLight(0xe8eef0,0x4a3a2a,.85);
  const sun=new THREE.DirectionalLight(0xffe3b8,1.05);
  sun.position.set(7,12,6); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});
  sun.shadow.bias=-.0006; sun.shadow.normalBias=.02;
  const rim=new THREE.DirectionalLight(0x9fb7c0,.35); rim.position.set(-8,5,-7);
  const lamp=new THREE.PointLight(0xffc77a,0,7,2);
  scene.add(hemi,sun,rim);
  const catcher=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.35}));
  catcher.rotation.x=-Math.PI/2; catcher.position.y=-.31; catcher.receiveShadow=true; scene.add(catcher);
  const rig=new THREE.Group(); scene.add(rig);

  /* materials and canvas textures */
  const MAT={};
  const M=(c,o={})=>{const k=c+JSON.stringify(o);return MAT[k]||(MAT[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o)))};
  function tex(draw,rx,ry){const c=document.createElement('canvas');c.width=c.height=256;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t}
  const tileT=tex(x=>{x.fillStyle='#a8512f';x.fillRect(0,0,256,256);
    for(let r=0;r<8;r++){const y=r*32;x.fillStyle='rgba(255,205,165,.14)';x.fillRect(0,y,256,6);x.fillStyle='rgba(55,18,8,.5)';x.fillRect(0,y+25,256,7);
      for(let i=0;i<9;i++){x.fillStyle='rgba(55,18,8,.32)';x.fillRect((i*32+(r%2)*16)%256,y,2,32)}}},14,3);
  const woodT=tex(x=>{x.fillStyle='#a87a4f';x.fillRect(0,0,256,256);
    for(let i=0;i<8;i++){x.fillStyle=`rgba(${70+i%3*10},${42+i%2*8},20,${.12+(i%4)*.05})`;x.fillRect(0,i*32,256,32);x.fillStyle='rgba(40,22,10,.45)';x.fillRect(0,i*32,256,2);x.fillRect((i*67)%256,i*32,2,32)}},2,2);
  const rugT=tex(x=>{x.fillStyle='#c9b48f';x.fillRect(0,0,256,256);x.strokeStyle='#8a5a3a';x.lineWidth=10;x.strokeRect(14,14,228,228);x.lineWidth=3;x.strokeRect(34,34,188,188);
    x.strokeStyle='rgba(138,90,58,.6)';for(let i=0;i<6;i++){x.beginPath();x.moveTo(60+i*28,60);x.lineTo(60+i*28,196);x.stroke()}},1,1);
  const C={plaster:'#efe8dc',laterite:'#9c5b3e',oxide:'#8e2f22',wood:'#6e4528',woodDk:'#4a2d18',lawn:'#45563f',leaf:'#5e8a48',leafDk:'#4b7240',
    brass:'#c99a3e',slab:'#2c3438',stone:'#d9d6cf',glass:'#7f99a1',dark:'#15191b',fabric:'#8b9a86',pool:'#4fa7bd'};
  const glassM=new THREE.MeshStandardMaterial({color:C.glass,roughness:.15,metalness:.1,emissive:0xe4b866,emissiveIntensity:0});
  const shadeM=new THREE.MeshStandardMaterial({color:'#e9d3a8',roughness:.6,emissive:0xffc77a,emissiveIntensity:0,side:THREE.DoubleSide});

  /* every part remembers where it belongs and which build stage it is */
  function model(cfg){const g=new THREE.Group();g.visible=false;g.userData=Object.assign({parts:[]},cfg);rig.add(g);return g}
  function put(m,stage,obj){obj.userData.home=obj.position.clone();obj.userData.hs=obj.scale.clone();obj.userData.stage=stage;
    obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});m.add(obj);m.userData.parts.push(obj);return obj}
  const mesh=(geo,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);return o};
  const box=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const cyl=(rt,rb,h,mat,x,y,z,seg=14)=>mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z);
  function palm(x,z,h,lean){
    const g=new THREE.Group();g.position.set(x,0,z);
    const pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push(new THREE.Vector3(Math.sin(t*1.3)*lean,t*h,Math.sin(t)*lean*.3))}
    const curve=new THREE.CatmullRomCurve3(pts);g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.11,8,false),M('#7a5f45')));
    const top=curve.getPoint(1);
    for(let i=0;i<9;i++){const f=new THREE.Group();f.position.copy(top);f.rotation.order='YZX';f.rotation.set(0,i/9*Math.PI*2+i*.3,-.35-(i%3)*.18);
      const a=new THREE.Mesh(new THREE.BoxGeometry(1,.03,.34),M(i%2?C.leaf:C.leafDk));a.position.x=.5;f.add(a);
      const b=new THREE.Mesh(new THREE.BoxGeometry(.9,.03,.26),M(i%2?C.leaf:C.leafDk));b.position.set(1.38,-.14,0);b.rotation.z=-.35;f.add(b);g.add(f)}
    for(let i=0;i<3;i++){const n=mesh(new THREE.SphereGeometry(.13,10,8),M('#6d4f2a'),top.x+Math.cos(i*2.1)*.17,top.y-.2,top.z+Math.sin(i*2.1)*.17);g.add(n)}
    return g;
  }
  const bush=(x,z,s=1)=>mesh(new THREE.IcosahedronGeometry(.42*s,1),M(C.leafDk),x,.3+.3*s,z);

  /* 1. Kerala home: laterite plinth, red-oxide verandah, wooden pillars, two-tier tiled roof */
  const K=model({name:'Kerala home',done:'Drag to turn the house',base:-.6,cam:[13.6,10.2,20.5],look:[0,2.1,0],spin:true,
    labels:['Laying the foundation','Raising the pillars','Building the walls','Fixing the tiled roof','Adding the finishes']});
  put(K,0,box(11,.3,9,M(C.lawn),0,-.15,0));
  put(K,0,box(7.6,.5,6,M(C.laterite),0,.25,.1));
  put(K,0,box(2.2,.17,.5,M(C.laterite),0,.085,3.35));
  put(K,0,box(2.2,.34,.3,M(C.laterite),0,.17,3.15));
  [-3.3,-1.1,1.1,3.3].forEach(x=>put(K,1,cyl(.13,.15,2.5,M(C.wood),x,1.75,2.75)));
  put(K,1,box(7.3,.22,.3,M(C.wood),0,3.06,2.75));
  put(K,2,box(6.8,2.5,4,M(C.plaster),0,1.75,-.7));
  put(K,2,box(6.86,.45,4.06,M('#b0694a'),0,.72,-.7));
  put(K,2,box(7.4,.04,1.42,M(C.oxide,{roughness:.35}),0,.52,2.4));
  const lowRoof=new THREE.CylinderGeometry(.66,1,1,4,1,true);lowRoof.rotateY(Math.PI/4);
  const lr=mesh(lowRoof,M('#fff',{map:tileT,side:THREE.DoubleSide}),0,3.15+.48,.1);lr.scale.set(8.7/Math.SQRT2,.96,7.3/Math.SQRT2);put(K,3,lr);
  const upRoof=new THREE.ConeGeometry(1,1,4,1,true);upRoof.rotateY(Math.PI/4);
  const ur=mesh(upRoof,M('#fff',{map:tileT,side:THREE.DoubleSide}),0,4.02+.85,.1);ur.scale.set(6/Math.SQRT2,1.7,5/Math.SQRT2);put(K,3,ur);
  put(K,3,box(8.5,.12,.12,M(C.woodDk),0,3.12,3.75));
  put(K,3,cyl(.02,.09,.55,M(C.brass,{metalness:.4,roughness:.4}),0,5.95,.1,8));
  put(K,4,box(1.1,2,.1,M(C.woodDk),0,1.5,1.32));
  [-2.15,2.15].forEach(x=>{const w=new THREE.Group();w.position.set(x,1.9,1.33);
    w.add(box(1.15,1.25,.08,M(C.woodDk),0,0,0));w.add(box(.95,1.05,.04,M('#2b2420'),0,0,.04));
    for(let i=0;i<4;i++)w.add(box(.05,1.05,.06,M(C.wood),-.33+i*.22,0,.06));put(K,4,w)});
  [-1.6,.2].forEach(z=>put(K,4,box(.08,1.1,.9,M(C.woodDk),3.42,1.9,z)));
  put(K,4,palm(-4.3,2.9,4.4,.7));
  put(K,4,palm(4.4,-3,5,-.6));
  put(K,4,palm(4.7,3.1,3.6,.45));
  put(K,4,box(.6,.6,.6,M(C.laterite),2.3,.3,3.85));
  put(K,4,mesh(new THREE.IcosahedronGeometry(.3,1),M(C.leaf),2.3,.85,3.85));
  [3.75,4.15].forEach(z=>put(K,4,box(1,.05,.32,M(C.stone),0,.03,z)));
  [-1,1].forEach(s=>put(K,4,box(3.6,.5,.2,M(C.laterite),s*3.7,.25,4.4)));
  [[-3.6,-2.6],[-2.4,-2.95],[3.7,1.6],[-3.9,.4]].forEach(p=>put(K,4,bush(p[0],p[1],.9)));

  /* 2. Modern villa: cantilevered floor, glazing with fins, pool */
  const V=model({name:'Modern villa',done:'Drag to turn the villa',base:-.55,cam:[14,10.6,22],look:[0,2.2,0],spin:true,
    labels:['Laying the foundation','Raising the structure','Building the walls','Casting the roof slabs','Adding glass and finishes']});
  put(V,0,box(10.4,.4,8.2,M(C.lawn),0,-.2,0));
  put(V,0,box(8.4,.3,6.2,M(C.stone),0,.15,0));
  const Y=.3;
  put(V,1,box(.16,2.2,.16,M(C.dark),2.7,Y+1.1,1.6));
  put(V,1,box(4,.2,3.8,M(C.slab),1,Y+2.2,0));
  put(V,2,box(5.6,2.2,3.4,M(C.plaster),-.6,Y+1.1,-.3));
  put(V,2,box(3.8,2,3.6,M(C.plaster),1,Y+3.3,0));
  put(V,2,box(1.3,4.7,1.6,M('#d8d2c6'),-3.2,Y+2.35,-.5));
  put(V,3,box(4.3,.24,4.1,M(C.slab),1,Y+4.42,0));
  put(V,3,box(1.6,.16,1.9,M(C.slab),-3.2,Y+4.78,-.5));
  put(V,3,box(1.5,.1,1,M(C.brass,{metalness:.3,roughness:.45}),-1.9,Y+1.75,1.9));
  put(V,4,box(3.4,1.15,.06,glassM,1,Y+3.3,1.83));
  for(let i=0;i<5;i++) put(V,4,box(.05,1.3,.12,M(C.dark),-.4+i*.7,Y+3.3,1.87));
  put(V,4,box(2,1.25,.06,glassM,1,Y+1.25,1.43));
  put(V,4,box(.5,3.6,.06,M(C.brass,{metalness:.3,roughness:.45}),-3.2,Y+2.6,.34));
  const ds=new THREE.Shape();ds.moveTo(-.46,0);ds.lineTo(-.46,.95);ds.absarc(0,.95,.46,Math.PI,0,true);ds.lineTo(.46,0);ds.lineTo(-.46,0);
  put(V,4,mesh(new THREE.ExtrudeGeometry(ds,{depth:.08,bevelEnabled:false}),M(C.woodDk),-1.9,Y,1.36));
  put(V,4,box(2.2,.28,.4,M(C.leaf),-2.15,Y+2.34,.9));
  put(V,4,box(1.2,.06,2.6,M(C.stone),-1.9,Y+.03,3.1));
  put(V,4,box(3,.1,1.6,M(C.pool,{roughness:.1,emissive:0x1b6f86,emissiveIntensity:.25}),2.6,.33,3.2));
  put(V,4,box(3.3,.14,.15,M(C.stone),2.6,.3,4.05));
  [[-4.2,2.8,1],[4.4,-2.6,1.2],[-4.3,-2.9,.9]].forEach(t=>{const g=new THREE.Group();g.position.set(t[0],0,t[1]);
    g.add(cyl(.08*t[2],.11*t[2],.9*t[2],M('#6b5a45'),0,.45*t[2],0,8));g.add(mesh(new THREE.IcosahedronGeometry(.75*t[2],1),M(C.leafDk),0,1.4*t[2],0));put(V,4,g)});

  /* 3. Interior: a cut-away living room */
  const I=model({name:'Interior',done:'Drag to look around',base:0,cam:[9.4,7.2,10.4],look:[-.6,1.1,-.7],spin:false,
    labels:['Laying the floor','Putting up the walls','Fitting the joinery','Placing the furniture','Lighting and styling']});
  put(I,0,box(7.2,.25,6.2,M('#fff',{map:woodT}),0,-.125,0));
  put(I,1,box(7.2,3.2,.2,M(C.plaster),0,1.6,-3.2));
  put(I,1,box(.2,3.2,6.2,M(C.plaster),-3.7,1.6,0));
  const win=new THREE.Group();win.position.set(1.9,1.8,-3.08);
  win.add(box(2.4,1.8,.05,glassM,0,0,0));win.add(box(2.5,.08,.12,M(C.dark),0,.92,0));win.add(box(2.5,.08,.12,M(C.dark),0,-.92,0));
  win.add(box(.06,1.8,.1,M(C.dark),0,0,0));put(I,2,win);
  for(let i=0;i<10;i++) put(I,2,box(.08,2.8,.1,M(C.wood),-3.3+i*.32,1.4,-3.05));
  put(I,2,box(.5,.45,2.6,M(C.woodDk),-3.35,.225,.9));
  put(I,2,box(.06,.95,1.7,M(C.dark,{roughness:.3}),-3.57,1.45,.9));
  put(I,3,box(3.8,.02,2.6,M('#fff',{map:rugT}),-1,.01,-.6));
  const sofa=new THREE.Group();sofa.position.set(-1.3,0,-2.45);
  sofa.add(box(3.2,.38,1.05,M(C.fabric),0,.3,0));for(let i=0;i<3;i++)sofa.add(box(1,.18,.9,M('#9aa995'),-1.05+i*1.05,.58,.05));
  sofa.add(box(3.2,.65,.25,M(C.fabric),0,.75,-.42));sofa.add(box(.22,.6,1.05,M(C.fabric),-1.7,.42,0));sofa.add(box(.22,.6,1.05,M(C.fabric),1.7,.42,0));
  sofa.add(box(.55,.4,.14,M(C.brass),-.6,.85,-.22));put(I,3,sofa);
  const tbl=new THREE.Group();tbl.position.set(-1,0,-.6);tbl.add(cyl(.6,.6,.07,M(C.woodDk),0,.42,0,28));tbl.add(cyl(.09,.14,.4,M(C.dark),0,.2,0,12));
  tbl.add(cyl(.12,.1,.14,M(C.stone),.2,.52,.1,12));put(I,3,tbl);
  const ch=new THREE.Group();ch.position.set(1.5,0,-.8);ch.rotation.y=-.7;
  ch.add(box(1,.36,.95,M('#b98f5f'),0,.3,0));ch.add(box(1,.62,.2,M('#b98f5f'),0,.72,-.38));ch.add(box(.85,.14,.75,M('#c9a274'),0,.55,.04));put(I,3,ch);
  const pend=new THREE.Group();pend.position.set(-1,0,-.6);pend.add(cyl(.012,.012,1.1,M(C.dark),0,2.75,0,6));
  pend.add(mesh(new THREE.ConeGeometry(.38,.4,24,1,true),shadeM,0,2.08,0));pend.add(mesh(new THREE.SphereGeometry(.09,10,8),shadeM,0,1.98,0));put(I,4,pend);
  put(I,4,box(.32,.05,1.8,M(C.wood),-3.45,2.35,.9));
  ['#8a2f22','#c99a3e','#2c3438','#7f99a1','#efe8dc'].forEach((c,i)=>put(I,4,box(.22,.3+i%2*.08,.12,M(c),-3.45,2.53+i%2*.04,.3+i*.16)));
  const pl=new THREE.Group();pl.position.set(2.7,0,-2.6);pl.add(cyl(.28,.22,.55,M(C.stone),0,.28,0));
  pl.add(mesh(new THREE.IcosahedronGeometry(.5,1),M(C.leaf),0,1.05,0));pl.add(mesh(new THREE.IcosahedronGeometry(.36,1),M(C.leafDk),.2,1.45,.1));put(I,4,pl);
  const fl=new THREE.Group();fl.position.set(.6,0,-2.7);fl.add(cyl(.02,.02,1.7,M(C.dark),0,.85,0,6));fl.add(cyl(.18,.24,.3,shadeM,0,1.75,0,18));fl.add(cyl(.2,.2,.03,M(C.dark),0,.015,0,18));put(I,4,fl);
  lamp.position.set(-1,1.85,-.6); I.add(lamp);

  const MODELS=[K,V,I];
  MODELS.forEach(m=>{const s=m.userData.parts.slice().sort((a,b)=>a.userData.stage-b.userData.stage);m.userData.parts=s});

  /* tabs & multi-image architectural showcase */
  const btns=$$('button',tabs), pill=document.createElement('span');pill.className='pill';tabs.prepend(pill);
  let activeMode = 'elevation';

  const HERO_MODES = {
    elevation: {
      id: 'hero-img-elevation',
      badge: '3D Elevation • N Arch Wayanad',
      stage: 'Signature 3D Villa Elevation'
    },
    kerala: {
      id: 'hero-img-kerala',
      badge: 'Kerala Home • Traditional Architecture',
      stage: 'Traditional Kerala Residence'
    },
    modern: {
      id: 'hero-img-modern',
      badge: 'Modern Villa • Luxury Architecture',
      stage: 'Contemporary Luxury Villa'
    },
    interior: {
      id: 'hero-img-interior',
      badge: 'Interior Design • Architectural Fitout',
      stage: 'Living Room & Interior Fitout'
    }
  };
  HERO_MODES['0'] = HERO_MODES.kerala;
  HERO_MODES['1'] = HERO_MODES.modern;
  HERO_MODES['2'] = HERO_MODES.interior;

  const movePill=()=>{
    const activeBtn = btns.find(b=>b.getAttribute('aria-pressed')==='true') || btns[0];
    if(activeBtn){
      pill.style.width=activeBtn.offsetWidth+'px';
      pill.style.transform=`translateX(${activeBtn.offsetLeft}px)`;
    }
  };

  function showHeroImage(modeKey){
    const config = HERO_MODES[modeKey] || HERO_MODES.elevation;
    activeMode = modeKey;

    if(imgWrap) imgWrap.classList.remove('hidden');
    MODELS.forEach(m=>m.visible=false);

    // Switch active image with smooth crossfade
    const imgs = $$('.hero-3d-img', imgWrap);
    imgs.forEach(img => {
      const isTarget = img.id === config.id || img.dataset.mode === modeKey;
      img.classList.toggle('active', isTarget);
      if(!isTarget) img.style.transform = 'scale(1.04)';
    });

    // Update active tab button
    btns.forEach(b => {
      const match = b.dataset.m === modeKey || 
                    (modeKey === 'kerala' && b.dataset.m === '0') ||
                    (modeKey === 'modern' && b.dataset.m === '1') ||
                    (modeKey === 'interior' && b.dataset.m === '2');
      b.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
    movePill();

    // Update badge text and stage tag
    const badgeText = $('#hero-badge-text');
    if(badgeText) badgeText.textContent = config.badge;
    if(stageT) stageT.textContent = config.stage;
    if(stageEl) stageEl.classList.add('done');
  }

  function showElevationImage(){
    showHeroImage('elevation');
  }

  function hideElevationImage(){
    if(imgWrap) imgWrap.classList.add('hidden');
  }

  let cur=0,start=0,built=false,doneAt=0,touched=false;
  const camTo=new THREE.Vector3(),lookTo=new THREE.Vector3(),look=new THREE.Vector3();
  const easeOut=t=>1-Math.pow(1-t,3), easeBack=t=>{const c=1.5;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
  function select(i,instant){
    const modeMap = ['kerala', 'modern', 'interior'];
    if(HERO_MODES[modeMap[i]]){
      showHeroImage(modeMap[i]);
      return;
    }
    hideElevationImage();
    activeMode='3d';
    cur=i; MODELS.forEach((m,j)=>m.visible=j===i);
    const u=MODELS[i].userData;
    rig.rotation.y=u.base; vel=0;
    camTo.fromArray(u.cam); lookTo.fromArray(u.look);
    camTo.sub(lookTo).multiplyScalar(cam.aspect<.9?1.22:1.14).add(lookTo);
    if(instant){cam.position.copy(camTo);look.copy(lookTo)}
    btns.forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===String(i)?'true':'false'));
    movePill();
    start=performance.now(); built=false; stageEl.classList.remove('done');
    if(REDUCE){finish();}
    else u.parts.forEach(p=>{p.scale.setScalar(.0001)});
  }
  function finish(){
    if(activeMode!=='3d') return;
    const u=MODELS[cur].userData;
    u.parts.forEach(p=>{p.position.copy(p.userData.home);p.scale.copy(p.userData.hs)});
    built=true; doneAt=performance.now(); stageT.textContent=u.done; stageEl.classList.add('done');
  }
  tabs.addEventListener('click',e=>{
    const b=e.target.closest('button[data-m]');
    if(!b) return;
    touched=true;
    showHeroImage(b.dataset.m);
  });
  addEventListener('resize',movePill);

  /* 3D perspective mouse tilt on the active image */
  if (imgWrap) {
    let ticking = false;
    imgWrap.addEventListener('pointermove', e => {
      const rect = imgWrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const glare = $('#hero-3d-glare');
      if (glare) {
        glare.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        glare.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
      }

      const activeImg = $('.hero-3d-img.active', imgWrap) || $('.hero-3d-img', imgWrap);
      if (activeImg && !ticking) {
        requestAnimationFrame(() => {
          activeImg.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg) scale(1.06)`;
          ticking = false;
        });
        ticking = true;
      }
    });

    imgWrap.addEventListener('pointerleave', () => {
      const activeImg = $('.hero-3d-img.active', imgWrap) || $('.hero-3d-img', imgWrap);
      if (activeImg) activeImg.style.transform = 'scale(1.04)';
    });
  }

  function size(){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;gl.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();movePill()}
  let drag=false,lx=0,vel=0,visible=true;
  cv.addEventListener('pointerdown',e=>{drag=true;touched=true;lx=e.clientX;vel=0;cv.setPointerCapture(e.pointerId)});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lx;lx=e.clientX;rig.rotation.y+=dx*.011;vel=dx*.011});
  const end=()=>{drag=false};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(cv);

  const isHome=()=>(typeof current!=='undefined'?current==='home':(document.body.dataset.page==='home'||document.body.classList.contains('home')||!document.body.dataset.page));

  function tick(now){
    if(visible&&isHome()&&!document.hidden){
      if(activeMode==='3d'){
        const u=MODELS[cur].userData, parts=u.parts, n=parts.length;
        if(!built){
          const step=Math.min(.12,3.6/n), dur=.7, t=(now-start)/1000;
          for(let i=0;i<n;i++){
            const p=parts[i], lt=clamp((t-i*step)/dur,0,1), d=p.userData;
            p.position.y=d.home.y+(1-easeOut(lt))*2.6;
            const s=lt<=0?.0001:Math.max(.0001,easeBack(lt));
            p.scale.set(d.hs.x*s,d.hs.y*s,d.hs.z*s);
          }
          const idx=clamp(Math.floor(t/step),0,n-1);
          const txt=u.labels[parts[idx].userData.stage]; if(stageT.textContent!==txt) stageT.textContent=txt;
          if(t>(n-1)*step+dur) finish();
        }
        /* evening glow once the house is finished */
        const glow=built?clamp((now-doneAt)/1500,0,1):0;
        glassM.emissiveIntensity=cur===2?.15+glow*.25:glow*(.3+Math.sin(now/1400)*.05);
        shadeM.emissiveIntensity=glow*.9; lamp.intensity=cur===2?glow*1.4:0;
        cam.position.lerp(camTo,.06); look.lerp(lookTo,.06); cam.lookAt(look);
        if(!drag){
          if(Math.abs(vel)>.0004){rig.rotation.y+=vel;vel*=.94}
          else if(!REDUCE){ if(u.spin) rig.rotation.y+=.0026; else rig.rotation.y+=(u.base+Math.sin(now/2600)*.45-rig.rotation.y)*.02 }
        }
        if(!u.spin) rig.rotation.y=clamp(rig.rotation.y,-1.1,1.1);
        /* show each model in turn until the visitor takes over */
        if(built&&!touched&&!REDUCE&&now-doneAt>7000) select((cur+1)%MODELS.length);
        gl.render(scene,cam);
      }
    }
    requestAnimationFrame(tick);
  }
  new ResizeObserver(size).observe(cv); size();
  if (imgWrap) {
    showElevationImage();
  } else {
    select(0,true);
  }
  requestAnimationFrame(tick);
})();