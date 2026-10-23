/* Automatic forest companions and Bilbo’s ten buried balls. No input buttons, timers or extra lights. */
'use strict';
const FOREST_PARTY = (() => {
  let current=null,KS=null;   // KS: the running camp scene (kampAni)
  const ZONE_GEAR={kamp:{packRod:true},gece:{light:true}};
  const gameRef=()=>{try{return typeof GAME!=='undefined'?GAME:null;}catch(e){return null;}};   // (typeof throws while GAME is still in its TDZ)
  function currentZoneId(){try{const G=gameRef();if(G&&G.P&&typeof ZONES!=='undefined'){const z=ZONES[G.P.zone|0];return z&&z.id||null;}}catch(e){}return null;}
  const sat=x=>Math.max(0,Math.min(1,x)), distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const smooth=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
  function create(env) {
    if(!env||!env.level||typeof FOREST_PARTY_MODELS==='undefined')return null;
    const level=env.level,group=new THREE.Group();group.name='Forest adventure companions';
    (env.parent||level.group||scene).add(group);
    const father=FOREST_PARTY_MODELS.father(),eagle=FOREST_PARTY_MODELS.eagle();group.add(father.root,eagle.root);
    const dad={x:0,z:0,face:0,speed:0},bird={x:0,z:0,y:2.7,face:0},dog={x:0,z:0,face:0};
    let time=0,disposed=false,nextPick=0,target=null,dadAttack=null,birdAttack=null,dadAt=1.5,birdAt=2.4,active=null,dogBark=0,nextPuff=0,noticeAt=-99,scanAt=0,escapeAt=0,stuckAge=0;
    const directive={x:0,z:0,face:0,speed:0,dig:0,bark:0,time:0};
    const hero=()=>env.hero(),heroPos=()=>{const h=hero();return h.pos||h;};
    const free=(x,z,r)=>env.free?env.free(x,z,r):typeof LEVEL!=='undefined'&&LEVEL.circleFree?LEVEL.circleFree(level,x,z,r):true;
    const los=(a,b)=>env.los?env.los(a.x,a.z,b.x,b.z):typeof LEVEL!=='undefined'&&LEVEL.los?LEVEL.los(level,a.x,a.z,b.x,b.z):true;
    function move(p,dx,dz,r){if(env.move)env.move(p,dx,dz,r);else if(typeof LEVEL!=='undefined'&&LEVEL.move)LEVEL.move(level,p,dx,dz,r);else {p.x+=dx;p.z+=dz;}}
    function route(a,b){return env.route?env.route(a.x,a.z,b.x,b.z)||[]:[];}
    let dadPath=[],dadPlanAt=0,dogPath=[],dogPlanAt=0;
    const emit=(name,data)=>{if(env.event)env.event(name,data);};
    function puff(x,z){if(typeof env.fx==='function')env.fx('smoke',x,.10,z,{count:5,color:'#aa8059',size:.08,speed:.45,life:.42});else if(env.fx&&env.fx.burst)env.fx.burst('smoke',x,.10,z,{count:5,color:'#aa8059',size:.08,speed:.45,life:.42});else if(typeof FX!=='undefined'&&FX.burst)FX.burst('smoke',x,.10,z,{count:5,color:'#aa8059',size:.08,speed:.45,life:.42});}
    function bark(){if(time-noticeAt<8)return;noticeAt=time;dogBark=1.3;if(env.audio)env.audio('bilboBark',{x:dog.x,z:dog.z,vol:.8});}
    // One shared excavation mesh: dark exposed soil, irregular raised rim and displaced earth.
    function excavationGeo(){
      const pos=[],colors=[],idx=[],segments=32,radii=[0,.42,.78,1],dark=new THREE.Color(0x4f3624),light=new THREE.Color(0x86643f);
      for(let row=0;row<radii.length;row++)for(let j=0;j<=segments;j++){
        const a=j/segments*Math.PI*2,r=radii[row],edge=1+.075*Math.sin(a*3+.4)+.045*Math.sin(a*7);
        pos.push(Math.sin(a)*r*edge,.014+.082*Math.pow(r,4)*(1+.2*Math.sin(a*5)),Math.cos(a)*r*edge);
        const c=dark.clone().lerp(light,r*.80);colors.push(c.r,c.g,c.b);
        if(row&&j<segments){const n=row*(segments+1)+j,k=n-segments-1;idx.push(k,n,k+1,k+1,n,n+1);}
      }
      const clump=new THREE.SphereGeometry(1,8,5),v=new THREE.Vector3();
      for(let j=0;j<9;j++){
        const a=j*2.4,r=1.02+(j%3)*.045,base=pos.length/3;
        for(let k=0;k<clump.attributes.position.count;k++){
          v.fromBufferAttribute(clump.attributes.position,k);pos.push(Math.sin(a)*r+v.x*(.11+(j%3)*.022),.060+v.y*.052,Math.cos(a)*r+v.z*.095);
          const c=light.clone().multiplyScalar(.88+(j%3)*.06);colors.push(c.r,c.g,c.b);
        }
        for(let k=0;k<clump.index.count;k++)idx.push(base+clump.index.getX(k));
      }
      clump.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;
    }
    const ballGeo=new THREE.SphereGeometry(.32,24,18),soilGeo=excavationGeo(),stripeGeo=new THREE.TorusGeometry(.323,.018,6,36);
    const soilMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),stripeMat=new THREE.MeshStandardMaterial({color:0xfff4d8,roughness:.60});
    function digVisual(b,progress){const p=sat(progress);b.mark.scale.set(.38+.92*p,.25+.75*p,.32+.84*p);b.mark.visible=true;}

    const palette=[0xf28725,0xee7820,0xf6952c,0xe97922,0xf58b25,0xec8124,0xf29432,0xf08320,0xe97c25,0xf58d29];
    const ballMaterials=palette.map(color=>new THREE.MeshStandardMaterial({color,roughness:.58}));
    const raw=Array.isArray(level.buriedBalls)?level.buriedBalls:[];
    const balls=raw.slice(0,10).map((p,i)=>{
      const obj=new THREE.Group();obj.name='Bilbo buried ball '+(i+1);const ball=new THREE.Mesh(ballGeo,ballMaterials[i]);ball.castShadow=true;obj.add(ball);
      for(let s=0;s<2;s++){const stripe=new THREE.Mesh(stripeGeo,stripeMat);stripe.rotation.set(s?Math.PI/2:0,s?.52:0,Math.PI/2);obj.add(stripe);}
      const mark=new THREE.Mesh(soilGeo,soilMat);mark.scale.set(.38,.25,.32);mark.position.set(p.x,.014,p.z);mark.receiveShadow=true;group.add(mark,obj);obj.position.set(p.x,.35,p.z);obj.visible=false;
      return {id:String(p.id||'forest-ball-'+(i+1)),x:p.x,z:p.z,state:'hidden',dig:0,exposeAt:-99,obj,mark};
    });
    function count(){let n=0;for(const b of balls)if(b.state==='collected')n++;return n;}
    function reset(){const h=heroPos();dad.x=h.x-1.9;dad.z=h.z-.55;if(!free(dad.x,dad.z,.39)){const open=[[-1.8,1],[1.8,1],[0,1.8],[-1.8,-1],[1.8,-1],[0,-1.8]].find(o=>free(h.x+o[0],h.z+o[1],.39));dad.x=h.x+(open?open[0]:0);dad.z=h.z+(open?open[1]:0);}dad.face=hero().face||0;dad.speed=0;bird.x=h.x+1.3;bird.z=h.z-.8;bird.y=2.7;target=null;dadAttack=birdAttack=null;dadPath=[];dadPlanAt=0;dadAt=time+.35;birdAt=time+2.6;cancelDig();place();}
    function cancelDig(){if(active&&active.state!=='exposed'&&active.state!=='collected'){active.state='hidden';active.dig=0;digVisual(active,0);}active=null;dogPath=[];dogBark=0;stuckAge=0;scanAt=time+1;}
    function place(){father.root.position.set(dad.x,0,dad.z);father.root.rotation.y=dad.face;eagle.root.position.set(bird.x,bird.y,bird.z);eagle.root.rotation.y=bird.face;}
    function visibleEnemy(e){const h=heroPos();return e&&!e.dead&&!e.hidden&&!e.under&&e.aggro&&(!e.st||!['under','buried','sleep','nap'].includes(e.st.phase))&&distance(e,h)<8+(e.r||.5)&&los(h,e);}
    function pickTarget(){const list=env.enemies?env.enemies():[];let best=null,d=Infinity;for(const e of list){if(!visibleEnemy(e))continue;const dd=distance(e,dad);if(dd<d){d=dd;best=e;}}return best;}
    function valid(e,who){return visibleEnemy(e)&&(!env.enemies||env.enemies().includes(e))&&los(who,e);}
    function helperHit(e,who,weight){if(!valid(e,who)||!env.damage)return;const h=hero(),base=Math.max(1,h.meleeDmg||h.dmg||h.damage||20);env.damage(e,Math.max(1,Math.round(base*weight*(e.boss?.62:1))));if(typeof env.fx==='function')env.fx('hearts',e.x,(e.y||0)+.6,e.z,{count:3,size:.10});else if(env.fx&&env.fx.burst)env.fx.burst('hearts',e.x,(e.y||0)+.6,e.z,{count:3,size:.10});}
    function advance(p,goal,speed,r,dt,pathKey){let aim=goal,path=pathKey==='dad'?dadPath:dogPath;
      if(!los(p,goal)){
        const at=pathKey==='dad'?dadPlanAt:dogPlanAt;if(time>=at){path=route(p,goal);if(pathKey==='dad'){dadPath=path;dadPlanAt=time+.8;}else{dogPath=path;dogPlanAt=time+.7;}}
        while(path.length&&distance(p,path[0])<.27)path.shift();if(path.length)aim=path[0];
      } else {if(pathKey==='dad')dadPath=[];else dogPath=[];}
      const dx=aim.x-p.x,dz=aim.z-p.z,d=Math.hypot(dx,dz);if(d<.10)return 0;const step=Math.min(speed*dt,d),ox=p.x,oz=p.z;move(p,dx/d*step,dz/d*step,r);
      const moved=Math.hypot(p.x-ox,p.z-oz);if(moved>.002)p.face=smoothAngle(p.face,Math.atan2(p.x-ox,p.z-oz),10,dt);return dt?moved/dt:0;
    }
    function smoothAngle(a,b,k,dt){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*(1-Math.exp(-k*dt));}
    function updateDad(dt){const h=heroPos();dad.speed=0;let attackPose=0;
      if(dadAttack){const a=dadAttack;a.age+=dt;attackPose=sat(a.age/.56);dad.face=smoothAngle(dad.face,Math.atan2(a.target.x-dad.x,a.target.z-dad.z),16,dt);
        if(a.age>=.20&&!a.hit){a.hit=true;if(distance(dad,a.target)<(a.target.r||.5)+1.4)helperHit(a.target,dad,.60);}if(a.age>=.56){dadAttack=null;dadAt=time+.80;}
      }else if(target&&valid(target,dad)&&distance(dad,h)<10){const d=distance(dad,target),reach=(target.r||.5)+1.15;if(d>reach)dad.speed=advance(dad,target,4.3,.39,dt,'dad');else{dad.face=smoothAngle(dad.face,Math.atan2(target.x-dad.x,target.z-dad.z),9,dt);if(time>=dadAt)dadAttack={target,age:0,hit:false};}}
      else {const f=hero().face||0,goal={x:h.x-Math.sin(f)*2.05-Math.cos(f)*1.05,z:h.z-Math.cos(f)*2.05+Math.sin(f)*1.05};if(!free(goal.x,goal.z,.4)){goal.x=h.x;goal.z=h.z;}if(distance(dad,goal)>1.2)dad.speed=advance(dad,goal,Math.min(6,2.2+distance(dad,goal)*.65),.39,dt,'dad');}
      // Only the helper moves out of Feza; the child never gets pushed or slowed by a companion.
      const d=distance(dad,h);if(d<.88&&d>.001){const dx=(dad.x-h.x)/d,dz=(dad.z-h.z)/d;move(dad,dx*(.88-d),dz*(.88-d),.39);}
      if(d>23&&time>escapeAt){escapeAt=time+3;for(const off of[[1.8,0],[-1.8,0],[0,-1.8]])if(free(h.x+off[0],h.z+off[1],.39)){dad.x=h.x+off[0];dad.z=h.z+off[1];dadPath=[];break;}}
      father.update(dt,{speed:dad.speed,attack:attackPose});
    }
    function updateBird(dt){const h=heroPos();let dive=0,fast=false;
      if(birdAttack){const a=birdAttack;a.age+=dt;const u=sat(a.age/.88);dive=Math.sin(Math.PI*u);fast=true;
        if(!valid(a.target,h)){birdAttack=null;birdAt=time+1;}
        else{const lift=1-Math.sin(Math.PI*u),k=1-Math.exp(-11*dt);bird.x+=(a.target.x-bird.x)*k;bird.z+=(a.target.z-bird.z)*k;bird.y=smooth(bird.y,(a.target.y||0)+Math.min(1.2,(a.target.height||1)*.65)+lift*1.9,12,dt);
          bird.face=smoothAngle(bird.face,Math.atan2(a.target.x-bird.x,a.target.z-bird.z),10,dt);if(u>=.46&&!a.hit){a.hit=true;if(distance(bird,a.target)<1.5+(a.target.r||.5))helperHit(a.target,bird,.16);}if(u>=1){birdAttack=null;birdAt=time+4.0;}}
      }
      if(!birdAttack){const f=hero().face||0,x=h.x+Math.cos(f)*2+Math.sin(time*.71)*.40,z=h.z-Math.sin(f)*2-.6+Math.cos(time*.71)*.35;const dx=x-bird.x,dz=z-bird.z;bird.x=smooth(bird.x,x,3.8,dt);bird.z=smooth(bird.z,z,3.8,dt);bird.y=smooth(bird.y,2.75+.13*Math.sin(time*2.2),3.5,dt);if(Math.hypot(dx,dz)>.12)bird.face=smoothAngle(bird.face,Math.atan2(dx,dz),5,dt);if(target&&time>=birdAt&&valid(target,bird)&&distance(target,h)<7.5)birdAttack={target,age:0,hit:false};}
      eagle.update(dt,{dive,fast});
    }
    function syncDog(){const b=env.bilbo&&env.bilbo();if(!b)return null;const p=b.pos||(b.model&&b.model.root.position);if(!p)return null;dog.x=p.x;dog.z=p.z;dog.face=Number.isFinite(b.face)?b.face:b.model?b.model.root.rotation.y:0;return b;}
    function updateBalls(dt){const h=heroPos();
      for(const b of balls){if(b.state==='exposed'){const age=Math.max(0,time-b.exposeAt),pop=sat(age/.52);b.obj.position.y=.35+Math.sin(pop*Math.PI)*.36;b.obj.rotation.y=Math.sin(age*1.6)*.14;const s=.65+.35*sat(age/.25);b.obj.scale.setScalar(s);if(age>=1.3&&distance(h,b)<.62){b.state='collected';b.obj.visible=false;digVisual(b,1);const have=count();emit('forestBall',{have,need:10,id:b.id});if(env.onBall)env.onBall({have,need:10,id:b.id,x:b.x,z:b.z});}}
      }
      if(!active&&time>=scanAt){scanAt=time+.25;const bilbo=syncDog();if(!bilbo||bilbo.model&&bilbo.model.isFetching&&bilbo.model.isFetching())return null;
        let nearest=null,best=7;for(const b of balls)if(b.state==='hidden'&&distance(h,b)<9&&los(h,b)){const d=distance(dog,b);if(d<best){nearest=b;best=d;}}
        if(nearest){active=nearest;active.state='sniff';active.dig=0;dogPath=[];dogPlanAt=0;stuckAge=0;bark();emit('forestSniff',{id:nearest.id,x:nearest.x,z:nearest.z});}
      }
      if(!active)return null;if(distance(h,active)>13){cancelDig();return null;}dogBark=Math.max(0,dogBark-dt);let speed=0,dig=0;
      if(active.state==='sniff'){active.dig+=dt;if(active.dig>=.62){active.state='approach';active.dig=0;}}
      if(active.state==='approach'){
        const dx=active.x-dog.x,dz=active.z-dog.z,d=Math.hypot(dx,dz),stop=.57;
        if(d>stop+.10){const goal={x:active.x-dx/Math.max(.001,d)*stop,z:active.z-dz/Math.max(.001,d)*stop};speed=advance(dog,goal,4.2,.34,dt,'dog');if(speed<.05)stuckAge+=dt;else stuckAge=0;if(stuckAge>4){cancelDig();scanAt=time+8;return null;}}
        else{active.state='dig';active.dig=0;dog.face=Math.atan2(dx,dz);nextPuff=time;}
      }
      if(active.state==='dig') {active.dig+=dt;dig=1;digVisual(active,active.dig/2.1);dog.face=smoothAngle(dog.face,Math.atan2(active.x-dog.x,active.z-dog.z),10,dt);if(time>=nextPuff){nextPuff=time+.32;puff(active.x,active.z);}if(active.dig>=2.1){active.state='exposed';active.exposeAt=time;active.obj.visible=true;active.obj.scale.setScalar(.65);active.obj.position.y=.35;digVisual(active,1);emit('forestFound',{id:active.id,x:active.x,z:active.z});active=null;scanAt=time+1;dig=0;}}
      directive.x=dog.x;directive.z=dog.z;directive.face=dog.face;directive.speed=speed;directive.dig=dig;directive.bark=dogBark;directive.time=time;return directive;
    }
    function update(dt){if(disposed)return null;if(KS)return null;zoneGear();dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));const h=hero();if(!h)return null;if(h.dead){cancelDig();target=null;dadAttack=birdAttack=null;father.update(dt,{});eagle.update(dt,{});return null;}
      if(dt===0){place();return active?directive:null;}time+=dt;if(time>=nextPick){nextPick=time+.24;target=pickTarget();}if(target&&!visibleEnemy(target))target=null;updateDad(dt);updateBird(dt);const result=updateBalls(dt);place();return result;
    }
    function snapshot(){return {v:1,balls:balls.map(b=>({id:b.id,state:b.state,dig:b.dig})),collected:count()};}
    function restore(data){cancelDig();if(!data||data.v!==1||!Array.isArray(data.balls))return;const byId=new Map(data.balls.filter(b=>b&&typeof b.id==='string').map(b=>[b.id,b]));for(const b of balls){const saved=byId.get(b.id);const state=saved&&saved.state;if(state==='collected'||state==='exposed'){b.state=state;b.dig=0;b.exposeAt=time-1.3;b.obj.visible=state==='exposed';b.obj.scale.setScalar(1);b.obj.position.y=.35;digVisual(b,1);}else{b.state='hidden';b.dig=0;b.obj.visible=false;digVisual(b,0);}}emit('forestBall',{have:count(),need:10,restored:true});}
    function dispose(){if(disposed)return;disposed=true;if(current===inst)current=null;cancelDig();father.dispose();eagle.dispose();if(group.parent)group.parent.remove(group);ballGeo.dispose();soilGeo.dispose();stripeGeo.dispose();soilMat.dispose();stripeMat.dispose();ballMaterials.forEach(m=>m.dispose());}
    // Father's trail gear follows the zone (gameplay keeps his axe; camp scenes swap it for the right tool).
    let gearZone=null;
    function zoneGear(){const id=env.zoneId||level.zoneId||currentZoneId();if(id===gearZone||!father.setGear)return;gearZone=id;
      if(gameRef()&&gameRef().state==='title'){father.setGear({tool:'axe',backpack:false,light:false,lantern:false,packRod:false});return;}
      father.setGear(Object.assign({tool:'axe',backpack:true,light:false,lantern:false,packRod:false},ZONE_GEAR[id]||{}));}
    function setZone(id){env.zoneId=id;gearZone=null;zoneGear();}
    reset();const inst={group,father,eagle,balls,update,reset,cancelDig,snapshot,restore,dispose,setZone,collected:count,activeBall:()=>active&&active.id,debug:()=>({time,dad:{...dad},bird:{...bird},dadAttack:!!dadAttack,birdAttack:!!birdAttack,draws:father.meshes.length+eagle.meshes.length})};current=inst;return inst;
  }
  function applyBilbo(model,dt,d){if(!model||!d)return;model.root.position.set(d.x,0,d.z);model.root.rotation.y=d.face;model.update(dt,{speed:d.speed,bark:d.bark,sit:false,dig:d.dig,digTime:d.time});}
  // ───────────────────────── Kamp anları (bölüm sonu sahneleri) ─────────────────────────
  // FOREST_PARTY.kampAni(zoneId, bitince): a warm 11-15 s scene with Feza, Bilbo, Baba and Kartal right where Feza stands.
  // Close camera, letterbox, no text. A tap speeds it up (×3), a second tap skips it. bitince() runs exactly once.
  // The scene drives the four models itself at render time (H.kamp, Bilbo.update wrapper, party frozen), so it works in any
  // GAME.state. Everything it builds is disposed at the end; the camera/fov and the models go back to the game.
  const ease=x=>{x=sat(x);return x*x*(3-2*x);},lerp=(a,b,k)=>a+(b-a)*k,TAU=Math.PI*2;
  const pulse=(t,a,b)=>t>=a&&t<b;
  const shotsOf=keys=>t=>{let i=0;while(i<keys.length-1&&t>=keys[i+1].t)i++;return keys[i];};   // auto-framed shot list
  function shot(t,keys){
    if(t<=keys[0][0])return keys[0];
    for(let i=0;i<keys.length-1;i++){const A=keys[i],B=keys[i+1];if(t<=B[0]){const k=ease((t-A[0])/Math.max(1e-4,B[0]-A[0]));
      return [t,A[1].map((v,j)=>lerp(v,B[1][j],k)),A[2].map((v,j)=>lerp(v,B[2][j],k)),lerp(A[3]||40,B[3]||40,k)];}}
    return keys[keys.length-1];
  }
  function kit(group){
    const geos=[],mats=[],texs=[];
    const mat=(color,o)=>{const m=new THREE.MeshStandardMaterial(Object.assign({color,roughness:.8},o||{}));mats.push(m);return m;};
    const basic=o=>{const m=new THREE.MeshBasicMaterial(o);mats.push(m);return m;};
    const mesh=(geo,m,p,s,r,parent)=>{geos.push(geo);const o=new THREE.Mesh(geo,m);if(p)o.position.set(p[0],p[1],p[2]);if(s)typeof s==='number'?o.scale.setScalar(s):o.scale.set(s[0],s[1],s[2]);if(r)o.rotation.set(r[0],r[1],r[2]);o.castShadow=!m.transparent;o.receiveShadow=true;(parent||group).add(o);return o;};
    const grp=(p,parent)=>{const g=new THREE.Group();if(p)g.position.set(p[0],p[1],p[2]);(parent||group).add(g);return g;};
    const canvasTex=(w,h,draw)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;texs.push(t);return t;};
    const glowTex=()=>canvasTex(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
    return {mat,basic,mesh,grp,canvasTex,glowTex,geo:g=>{geos.push(g);return g;},material:m=>{mats.push(m);return m;},
      dispose(){geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());texs.forEach(t=>t.dispose());}};
  }
  // ── small cute props ──
  function makeFish(k,parent,col=0xf39a3d,belly=0xffe2a8){
    const g=k.grp(null,parent),m=k.mat(col,{roughness:.35,metalness:.15}),mb=k.mat(belly,{roughness:.4}),fin=k.mat(0xe86e3a,{roughness:.5,side:THREE.DoubleSide});
    k.mesh(new THREE.SphereGeometry(1,18,12),m,[0,0,0],[.075,.095,.21],null,g);k.mesh(new THREE.SphereGeometry(1,14,10),mb,[0,-.03,.02],[.06,.06,.17],null,g);
    const tail=k.grp([0,0,-.19],g);k.mesh(new THREE.ConeGeometry(.085,.14,4),fin,[0,0,-.06],[.25,1,1],[Math.PI/2,0,0],tail);
    k.mesh(new THREE.ConeGeometry(.05,.1,4),fin,[0,.1,-.02],[.25,1,1],[-.5,0,0],g);
    for(const s of[-1,1]){k.mesh(new THREE.SphereGeometry(.022,10,8),k.mat(0xffffff,{roughness:.2}),[s*.055,.03,.13],null,null,g);k.mesh(new THREE.SphereGeometry(.013,8,6),k.mat(0x1d1d22,{roughness:.2}),[s*.068,.033,.142],null,null,g);
      k.mesh(new THREE.SphereGeometry(1,8,6),fin,[s*.07,-.035,.04],[.012,.03,.05],[0,s*.5,0],g);}
    g.userData.tail=tail;return g;
  }
  function makeRod(k,parent,len=1.05){
    const g=k.grp(null,parent),tip=new THREE.Object3D();
    k.mesh(new THREE.CylinderGeometry(.016,.018,.2,10),k.mat(0xd8b37a,{roughness:.9}),[0,.05,0],null,null,g);
    k.mesh(new THREE.CylinderGeometry(.005,.011,len,8),k.mat(0x3f86c9,{roughness:.4}),[0,.15+len/2,0],null,null,g);
    k.mesh(new THREE.CylinderGeometry(.028,.028,.02,12),k.mat(0xffcf4a,{roughness:.4}),[0,.12,.035],null,[0,0,Math.PI/2],g);
    tip.position.set(0,.15+len,0);g.add(tip);g.userData.tip=tip;return g;
  }
  function makeStick(k,parent){const g=k.grp(null,parent),m=k.mat(0xfff8ef,{roughness:.9});
    k.mesh(new THREE.CylinderGeometry(.006,.009,.8,6),k.mat(0x8a5a33,{roughness:.85}),[0,.33,0],null,null,g);
    k.mesh(new THREE.CylinderGeometry(.038,.038,.06,14),m,[0,.72,0],null,null,g);g.userData.marsh=m;return g;}
  function makeLine(k,parent,n=12){const pos=new Float32Array(n*3),geo=k.geo(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const line=new THREE.Line(geo,k.material(new THREE.LineBasicMaterial({color:0xf4f1e6,transparent:true,opacity:.85})));line.frustumCulled=false;(parent).add(line);
    line.userData.set=(a,b,sag=.12)=>{for(let i=0;i<n;i++){const u=i/(n-1);pos[i*3]=lerp(a.x,b.x,u);pos[i*3+1]=lerp(a.y,b.y,u)-sag*4*u*(1-u);pos[i*3+2]=lerp(a.z,b.z,u);}geo.attributes.position.needsUpdate=true;};return line;}
  function makeFrog(k,parent,col){
    const g=k.grp(null,parent),m=k.mat(col,{roughness:.45}),pale=k.mat(0xeaf3b0,{roughness:.5}),white=k.mat(0xffffff,{roughness:.25}),black=k.mat(0x15181a,{roughness:.2}),pink=k.mat(0xf08a8a,{roughness:.5});
    const body=k.grp(null,g);
    k.mesh(new THREE.SphereGeometry(1,20,14),m,[0,.13,0],[.2,.14,.2],null,body);k.mesh(new THREE.SphereGeometry(1,16,12),pale,[0,.1,.07],[.15,.1,.14],null,body);
    k.mesh(new THREE.SphereGeometry(1,18,12),m,[0,.22,.07],[.17,.11,.15],null,body);
    for(const s of[-1,1]){k.mesh(new THREE.SphereGeometry(.065,14,10),m,[s*.09,.31,.09],null,null,body);k.mesh(new THREE.SphereGeometry(.05,14,10),white,[s*.095,.325,.125],null,null,body);
      k.mesh(new THREE.SphereGeometry(.027,10,8),black,[s*.1,.33,.165],null,null,body);k.mesh(new THREE.SphereGeometry(.009,6,6),white,[s*.108,.343,.183],null,null,body);
      k.mesh(new THREE.SphereGeometry(1,12,8),m,[s*.16,.05,-.06],[.07,.06,.13],null,body);k.mesh(new THREE.SphereGeometry(1,10,8),m,[s*.2,.02,.05],[.06,.025,.07],null,body);
      k.mesh(new THREE.SphereGeometry(1,10,8),m,[s*.1,.05,.15],[.03,.06,.03],null,body);k.mesh(new THREE.SphereGeometry(.018,8,6),pink,[s*.12,.24,.205],[1,.6,.4],null,body);}
    k.mesh(new THREE.TorusGeometry(.08,.008,6,16,Math.PI*.8),black,[0,.235,.205],null,[0,0,Math.PI*1.1],body);
    const sac=k.mesh(new THREE.SphereGeometry(1,16,12),k.mat(0xf6f0b8,{roughness:.3,transparent:true,opacity:.92}),[0,.15,.17],[.07,.06,.06],null,body);
    g.userData.body=body;g.userData.sac=sac;return g;
  }
  function makeLily(k,parent,flower){const g=k.grp(null,parent);const geo=new THREE.CircleGeometry(.36,24,.3,TAU-.6);geo.rotateX(-Math.PI/2);
    k.mesh(geo,k.mat(0x4f9a46,{roughness:.6,side:THREE.DoubleSide}),[0,.035,0],null,null,g);
    if(flower){const pm=k.mat(0xffb3cf,{roughness:.5});for(let i=0;i<7;i++){const a=i/7*TAU;k.mesh(new THREE.SphereGeometry(1,8,6),pm,[.18+Math.sin(a)*.05,.08,.12+Math.cos(a)*.05],[.03,.02,.06],[0,a,0],g);}k.mesh(new THREE.SphereGeometry(.025,8,6),k.mat(0xffe066),[.18,.1,.12],null,null,g);}
    return g;}
  function makeSquirrel(k,parent){
    const g=k.grp(null,parent),fur=k.mat(0xc8763a,{roughness:.85}),cream=k.mat(0xf6dcb0,{roughness:.9}),dark=k.mat(0x2a1a12,{roughness:.3}),white=k.mat(0xffffff,{roughness:.3});
    const body=k.grp(null,g);
    k.mesh(new THREE.SphereGeometry(1,16,12),fur,[0,.12,0],[.085,.11,.09],null,body);k.mesh(new THREE.SphereGeometry(1,12,10),cream,[0,.11,.05],[.06,.08,.05],null,body);
    const head=k.grp([0,.25,.03],body);k.mesh(new THREE.SphereGeometry(.075,16,12),fur,[0,0,0],null,null,head);k.mesh(new THREE.SphereGeometry(1,12,8),cream,[0,-.02,.05],[.045,.035,.035],null,head);
    k.mesh(new THREE.SphereGeometry(.012,8,6),dark,[0,-.005,.085],null,null,head);
    for(const s of[-1,1]){k.mesh(new THREE.ConeGeometry(.025,.06,8),fur,[s*.045,.07,-.01],null,[0,0,-s*.25],head);k.mesh(new THREE.SphereGeometry(.016,8,6),dark,[s*.035,.015,.06],null,null,head);k.mesh(new THREE.SphereGeometry(.005,6,4),white,[s*.038,.022,.074],null,null,head);
      k.mesh(new THREE.SphereGeometry(1,8,6),fur,[s*.04,.17,.07],[.02,.04,.02],null,body);k.mesh(new THREE.SphereGeometry(1,8,6),fur,[s*.055,.03,.03],[.03,.03,.05],null,body);}
    const tail=k.grp([0,.08,-.08],body);const pts=[];for(let i=0;i<7;i++){const u=i/6;pts.push([0,.04+u*.26+Math.sin(u*3)*.02,-.02-Math.sin(u*2.6)*.1+u*u*.12]);}
    pts.forEach((p,i)=>k.mesh(new THREE.SphereGeometry(1,10,8),i%2?fur:k.mat(0xd8894a,{roughness:.9}),p,[.05+.025*Math.sin(i/6*Math.PI),.06,.05+.02*Math.sin(i/6*Math.PI)],null,tail));
    const acorn=k.grp([0,.17,.1],body);k.mesh(new THREE.SphereGeometry(1,10,8),k.mat(0xb07a3e,{roughness:.6}),[0,0,0],[.022,.028,.022],null,acorn);k.mesh(new THREE.SphereGeometry(1,10,6),k.mat(0x6b4a2a,{roughness:.9}),[0,.016,0],[.025,.012,.025],null,acorn);
    acorn.visible=false;g.userData={body,head,tail,acorn};return g;
  }
  function makeBall(k,parent,i){const g=k.grp(null,parent);const m=k.mat([0xf28725,0xee7820,0xf6952c,0xe97922,0xf58b25][i%5],{roughness:.5,emissive:0xff8a2a,emissiveIntensity:.35});
    k.mesh(new THREE.SphereGeometry(.24,22,16),m,[0,0,0],null,null,g);const st=k.mat(0xfff4d8,{roughness:.6,emissive:0xfff0c0,emissiveIntensity:.25});
    k.mesh(new THREE.TorusGeometry(.243,.014,6,32),st,[0,0,0],null,[0,0,Math.PI/2],g);k.mesh(new THREE.TorusGeometry(.243,.014,6,32),st,[0,0,0],null,[Math.PI/2,.52,Math.PI/2],g);g.userData.mat=m;return g;}
  function makeLog(k,parent,len,r,p,ry){const m=k.mat(0x7a5233,{roughness:.95}),end=k.mat(0xd6b07a,{roughness:.9});const g=k.grp(p,parent);g.rotation.y=ry||0;
    k.mesh(new THREE.CylinderGeometry(r,r*1.05,len,14),m,[0,r,0],null,[0,0,Math.PI/2],g);for(const s of[-1,1])k.mesh(new THREE.CircleGeometry(r*.97,14),end,[s*(len/2+.002),r,0],null,[0,s*Math.PI/2,0],g);return g;}
  function makeStump(k,parent,p,h=.45,r=.3){const g=k.grp(p,parent);k.mesh(new THREE.CylinderGeometry(r,r*1.25,h,14),k.mat(0x6e4a2e,{roughness:.95}),[0,h/2,0],null,null,g);k.mesh(new THREE.CircleGeometry(r*.98,14),k.mat(0xd9b37c,{roughness:.9}),[0,h+.002,0],null,[-Math.PI/2,0,0],g);return g;}
  function reeds(k,parent,n,cx,cz,rad,seed=1){const m=k.mat(0x6f9a45,{roughness:.8}),c=k.mat(0x7a4b2a,{roughness:.8});let q=seed;const rnd=()=>{q=(q*16807)%2147483647;return q/2147483647;};
    for(let i=0;i<n;i++){const a=rnd()*TAU,r=rad*(.6+.4*rnd()),h=.55+.5*rnd(),x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;k.mesh(new THREE.CylinderGeometry(.008,.014,h,5),m,[x,h/2,z],null,[(rnd()-.5)*.2,0,(rnd()-.5)*.2],parent);
      if(rnd()<.45)k.mesh(new THREE.CapsuleGeometry(.025,.1,4,8),c,[x,h*.92,z],null,null,parent);}}

  // ── the six scenes ──
  const SCENES={};
  // 1 · kamp: fishing with Dad in the creek (the fish jumps, Bilbo barks), Feza catches a little fish for the bucket.
  SCENES.kamp=K=>{const k=K.kit,S=K.stage,A=K.A,bs=K.bs;
    const wtex=k.canvasTex(256,256,(c,w,h)=>{c.fillStyle='#4aa5c8';c.fillRect(0,0,w,h);c.globalAlpha=.35;c.strokeStyle='#d9f4ff';c.lineWidth=2;for(let i=0;i<46;i++){const x=(i*73)%w,y=(i*41)%h,l=14+(i%5)*6;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+l/2,y-3,x+l,y);c.stroke();}});
    wtex.wrapS=wtex.wrapT=THREE.RepeatWrapping;wtex.repeat.set(3,1.2);
    const water=k.mesh(new THREE.PlaneGeometry(9,2.3),k.mat(0xffffff,{map:wtex,roughness:.12,metalness:.1,transparent:true,opacity:.9}),[0,.035,1.55],null,[-Math.PI/2,0,0],S);water.receiveShadow=true;water.castShadow=false;
    const pm=[k.mat(0x9a9488,{roughness:.9}),k.mat(0xb8b0a0,{roughness:.9}),k.mat(0x7d7a70,{roughness:.9})];
    for(let i=0;i<34;i++){const side=i%2?1:-1,x=-4.3+((i*.53)%8.6),z=1.55+side*(1.12+((i*7)%5)*.05);k.mesh(new THREE.SphereGeometry(1,10,7),pm[i%3],[x,.04,z],[.12+(i%4)*.04,.06+(i%3)*.02,.1+(i%5)*.03],[0,i,0],S);}
    reeds(k,S,16,-3.2,.35,.6,3);reeds(k,S,12,3.3,.3,.5,7);
    const bucket=k.grp([-.95,0,.5],S);k.mesh(new THREE.CylinderGeometry(.17,.14,.26,18,1,true),k.mat(0x8fb7c9,{roughness:.35,metalness:.5,side:THREE.DoubleSide}),[0,.13,0],null,null,bucket);
    k.mesh(new THREE.CircleGeometry(.15,18),k.mat(0x5fb3d6,{roughness:.1}),[0,.2,0],null,[-Math.PI/2,0,0],bucket);k.mesh(new THREE.TorusGeometry(.17,.008,6,24,Math.PI),k.mat(0x6c7377,{metalness:.6,roughness:.4}),[0,.26,0],null,[0,0,0],bucket);
    makeStump(k,S,[1.55,0,-.85],.5,.28);
    const rodF=makeRod(k,S),lineF=makeLine(k,S),lineD=makeLine(k,S);
    const bobber=(c)=>{const g=k.grp(null,S);k.mesh(new THREE.SphereGeometry(.045,12,8),k.mat(0xffffff,{roughness:.3}),[0,0,0],null,null,g);k.mesh(new THREE.SphereGeometry(.046,12,8,0,TAU,0,Math.PI/2),k.mat(c,{roughness:.3}),[0,0,0],null,null,g);return g;};
    const bobF=bobber(0xe8413a),bobD=bobber(0xf2b33a);
    const ringM=k.basic({color:0xffffff,transparent:true,opacity:0,depthWrite:false});const rings=[0,1,2].map(()=>k.mesh(new THREE.RingGeometry(.9,1,32),ringM.clone(),[0,.045,0],.1,[-Math.PI/2,0,0],S));rings.forEach(r=>k.material(r.material));let ringI=0;
    const ripple=(x,z)=>{const r=rings[ringI++%3];r.position.set(x,.045,z);r.userData.t=0;};
    const fishJ=makeFish(k,S),fishC=makeFish(k,S,0x8fc0d8,0xf2f6f0);fishJ.visible=fishC.visible=false;
    A.feza.set(-.3,0,-.05,.05);A.dad.set(.5,0,-.3,-.18);A.dog.set(-1.25,0,-.25,.55);A.bird.set(1.55,.5+.32,-.85,-.5);
    A.feza.st.kp='fish';A.dad.st.pose='kneelFish';A.bird.st.perch=1;K.dad.setGear({tool:'olta',backpack:true,light:false,lantern:false,packRod:false});
    const bobFp=new THREE.Vector3(-.3,.05,1.35),bobDp=new THREE.Vector3(.75,.05,1.65),tmp=new THREE.Vector3(),tip=new THREE.Vector3();
    let jumpT=-1,catchT=-1;
    K.events=[[.6,()=>K.say()],[1.0,()=>ripple(bobFp.x,bobFp.z)],[2.6,()=>{ripple(bobFp.x,bobFp.z);A.dog.face=.2;}],
      [3.6,()=>{A.feza.st.kp='fishPull';ripple(bobFp.x,bobFp.z);}],[3.9,()=>{jumpT=0;fishJ.visible=true;K.sfx('splash');K.fx('bubbles',1.5,.1,1.4,{count:6});}],
      [4.3,()=>K.bark()],[4.9,()=>{A.feza.st.kp='fish';A.dog.st.pounce=1;}],[5.2,()=>{K.bark();K.sfx('splash');K.fx('bubbles',2.3,.1,1.6,{count:6});ripple(2.3,1.6);}],
      [6.6,()=>{A.feza.st.kp='fishPull';ripple(bobFp.x,bobFp.z);K.sfx('splash');catchT=0;fishC.visible=true;}],
      [8.2,()=>{K.sfx('pop');K.fx('sparkle',-.95,.45,.5,{count:10,color:'#ffe58a'});A.feza.st.kp='hop';A.dad.st.pose='kneelClap';}],
      [8.5,()=>K.bark()],[9.6,()=>{A.feza.st.kp='wave';A.dad.st.pose='kneelWave';K.fx('hearts',-.3,1.5,-.05,{count:2,size:.07});}],[11.2,()=>{A.feza.st.kp='hop';A.dad.st.pose='kneelClap';}]];
    return {dur:12.8,
      tick(t,dt){wtex.offset.x=-t*.05;wtex.offset.y=Math.sin(t*.7)*.01;
        for(const r of rings){r.userData.t=(r.userData.t??9)+dt;const u=r.userData.t/1.3;r.scale.setScalar(.06+.32*u);r.material.opacity=u<1?.5*(1-u):0;}
        // Feza's little rod in her hands, pointing over the water; the line sags to the bobber or the caught fish.
        if(K.H){const pull=A.feza.st.kp==='fishPull'?1:A.feza.st.kp==='fish'?0:2;const f=A.feza.face,a=pull===1?1.1:.55;
          rodF.visible=pull<2&&catchT<1.75;tmp.set(Math.sin(f)*Math.cos(a),Math.sin(a),Math.cos(f)*Math.cos(a)).normalize();
          S.worldToLocal(rodF.position.copy(K.H.hand));rodF.quaternion.setFromUnitVectors(K.UP,tmp);rodF.updateMatrixWorld(true);rodF.userData.tip.getWorldPosition(tip);S.worldToLocal(tip);}
        bobFp.y=.05+.012*Math.sin(t*3.1)-(pulse(t,2.5,2.8)||pulse(t,3.4,3.7)?.04:0);bobF.position.copy(bobFp);bobD.position.set(bobDp.x,.05+.012*Math.sin(t*2.7+1),bobDp.z);
        // the jumping fish: a big happy arc out of the creek and back in
        if(jumpT>=0){jumpT+=dt;const u=jumpT/1.25;if(u>1){fishJ.visible=false;jumpT=-1;}else{const x=lerp(1.5,2.3,u),z=lerp(1.4,1.6,u),y=.05+1.2*Math.sin(Math.PI*u);fishJ.position.set(x,y,z);fishJ.rotation.set(-Math.cos(Math.PI*u)*1.1,1.4,0);fishJ.rotation.z=Math.sin(jumpT*20)*.25;fishJ.userData.tail.rotation.y=Math.sin(jumpT*30)*.6;}}
        // the caught fish: rises on the line, swings over and drops into the bucket
        let end=bobFp;
        if(catchT>=0){catchT+=dt;const u=catchT;let x,y,z;
          if(u<.9){const k2=ease(u/.9);x=lerp(bobFp.x,-.8,k2);y=lerp(.05,.62,k2)+Math.sin(k2*Math.PI)*.18;z=lerp(bobFp.z,.95,k2);}
          else if(u<1.6){const k2=ease((u-.9)/.7);x=lerp(-.8,-.95,k2);y=lerp(.62,.6,k2)+Math.sin(u*6)*.03;z=lerp(.95,.5,k2);}
          else{const k2=sat((u-1.6)/.35);x=-.95;y=lerp(.6,.22,k2*k2);z=.5;if(u>2.05)fishC.visible=false;}
          fishC.position.set(x,y,z);fishC.rotation.set(1.35,0,Math.sin(u*14)*.45);fishC.userData.tail.rotation.y=Math.sin(u*28)*.7;end=tmp.set(x,y+.2,z);}
        lineF.visible=rodF.visible;if(rodF.visible)lineF.userData.set(tip,end,catchT>=0?.02:.14);
        if(K.dad.gear){K.dad.gear.rodTip.getWorldPosition(tmp);S.worldToLocal(tmp);lineD.userData.set(tmp,bobD.position,.18);}
        A.dog.face=lerp(A.dog.face,jumpT>=0?1.2:catchT>=0&&catchT<2.2?.9:.45,1-Math.exp(-4*dt));
        A.bird.st.perch=1;},
      cam:shotsOf([{t:0,yaw:.1,pitch:.28,fov:40,who:['feza','dad','dog','bird'],far:1.12,pts:[[0,0,1.4]]},{t:2.4,yaw:-.04,pitch:.17,fov:38,who:['feza','dad','dog']},
        {t:3.7,yaw:.3,pitch:.2,fov:40,who:['feza','dad','bird'],pts:[[1.9,1.25,1.5],[1.5,.1,1.4]]},{t:6.4,yaw:-.28,pitch:.2,fov:38,who:['feza','dad','dog'],pts:[[-.95,.3,.5]]},
        {t:9.4,yaw:.02,pitch:.15,fov:36,who:['feza','dad','dog']},{t:11.6,yaw:.12,pitch:.3,fov:40,who:['feza','dad','dog','bird'],far:1.2,k:1.6}])};
  };
  // 2 · gol: the frog choir; Dad whistles along, Feza dances, Bilbo sings too.
  SCENES.gol=K=>{const k=K.k||K.kit,S=K.stage,A=K.A;
    const pond=k.mesh(new THREE.CircleGeometry(2.9,48),k.mat(0x3f8fa8,{roughness:.1,metalness:.15,transparent:true,opacity:.92}),[0,.03,-2.4],null,[-Math.PI/2,0,0],S);pond.castShadow=false;
    reeds(k,S,26,0,-2.4,3.1,11);
    const pier=k.grp([-2.3,0,-1.7],S);pier.rotation.y=.5;const pl=k.mat(0x9c7048,{roughness:.9}),pl2=k.mat(0x7f5a38,{roughness:.9});
    for(let i=0;i<9;i++)k.mesh(new THREE.BoxGeometry(1.0,.05,.2),i%2?pl:pl2,[0,.16,-i*.22],null,[0,0,(i%3-1)*.02],pier);
    for(const sx of[-.45,.45])for(let i=0;i<3;i++)k.mesh(new THREE.CylinderGeometry(.06,.07,.5,8),pl2,[sx,.0,-i*.8],null,null,pier);
    const ducks=[0,1,2].map(i=>{const g=k.grp(null,S),wm=k.mat(i?0xffffff:0xffe27a,{roughness:.6}),bm=k.mat(0xff9a2e,{roughness:.5});
      k.mesh(new THREE.SphereGeometry(1,14,10),wm,[0,.1,0],[.15,.1,.21],null,g);k.mesh(new THREE.SphereGeometry(.085,12,10),wm,[0,.25,.13],null,null,g);
      k.mesh(new THREE.ConeGeometry(.035,.09,8),bm,[0,.24,.23],null,[Math.PI/2,0,0],g);k.mesh(new THREE.ConeGeometry(.05,.1,6),wm,[0,.15,-.22],null,[-1.1,0,0],g);
      for(const s2 of[-1,1])k.mesh(new THREE.SphereGeometry(.016,8,6),k.mat(0x111111),[s2*.04,.27,.2],null,null,g);g.userData.ph=i*2.1;return g;});
    const frogs=[],cols=[0x6dbb4a,0x5aa83f,0x84c856,0x4f9d4a,0x77c04f];
    for(let i=0;i<5;i++){const a=(i-2)*.42,x=Math.sin(a)*2.0,z=-2.4+Math.cos(a)*1.25;const pad=makeLily(k,S,i%2===0);pad.position.set(x,0,z);pad.rotation.y=i;
      const f=makeFrog(k,S,cols[i]);f.position.set(x,.05,z);f.rotation.y=-a*.6;f.scale.setScalar(i===2?1.25:1);frogs.push({f,ph:i*.37,x,z,big:i===2});}
    A.feza.set(0,0,.35,0);A.dad.set(1.2,0,.05,-.25);A.dog.set(-1.1,0,.0,.35);A.bird.set(0,3.2,-1.2,0);
    A.feza.st.kp='sing';A.dad.st.pose='whistle';A.dog.st.sit=true;
    let chorus=0;
    K.events=[[.5,()=>K.say()],[1.2,()=>{K.sfx('chirp',{pitch:.6});}],[2.4,()=>{A.feza.st.kp='dance';}],[3.4,()=>K.bark(.9)],[5.5,()=>{A.dad.st.pose='dance';}],
      [6.6,()=>K.bark(.9)],[7.6,()=>{chorus=1;A.feza.st.kp='hop';K.fx('notes',0,1.0,-1.6,{count:10});K.sfx('cheer');}],[8.6,()=>{A.feza.st.kp='dance';chorus=0;}],[10.2,()=>{A.feza.st.kp='wave';A.dad.st.pose='wave';}]];
    let beatAt=0;
    return {dur:12,
      tick(t,dt){
        // a croak every half beat, frogs take turns (all together for the chorus)
        if(t>=beatAt){beatAt=t+.42;const i=Math.floor(t/.42)%5;const list=chorus?frogs:[frogs[[2,0,4,1,3][i]]];
          for(const F of list){F.croak=0;K.fx('notes',F.x,.7,F.z,{count:2});}if(t>1)K.sfx('chirp',{pitch:.45+.1*(i%3),vol:.35});}
        for(const F of frogs){F.croak=(F.croak??9)+dt;const c=Math.max(0,Math.sin(Math.min(1,F.croak/.35)*Math.PI));F.f.userData.sac.scale.set(.07+.08*c,.06+.07*c,.06+.07*c);
          const hop=chorus?Math.abs(Math.sin(t*7+F.ph)):0;F.f.userData.body.position.y=.12*hop+.01*c;F.f.userData.body.rotation.x=-.08*c;F.f.userData.body.rotation.z=.05*Math.sin(t*2+F.ph);}
        ducks.forEach((d,i)=>{const a=d.userData.ph+t*.22;d.position.set(Math.sin(a)*1.7,.0+.015*Math.sin(t*3+i),-2.6+Math.cos(a)*.9);d.rotation.y=a+Math.PI/2;});
        if(A.dad.st.pose==='whistle'&&Math.floor(t*2.4)!==Math.floor((t-dt)*2.4))K.fx('notes',A.dad.x-.2,1.95,A.dad.z+.2,{count:1});
        const a=t*.7;A.bird.x=Math.sin(a)*1.9;A.bird.z=-1.9+Math.cos(a)*1.1;A.bird.y=3.0+.2*Math.sin(t*1.3);A.bird.face=a+Math.PI/2;A.bird.st.bank=-.14;
        A.dog.st.sit=!pulse(t,7.6,8.6);if(pulse(t,7.6,8.4))A.dog.st.pounce=Math.abs(Math.sin((t-7.6)*4));},
      light:{sun:0xffb072,sunI:2.1,hemiSky:0xffcfa0,hemiGround:0x6d5a3e,hemiI:.85,bg:0xf3b07c},
      cam:shotsOf([{t:0,yaw:0,pitch:.3,fov:40,who:['feza','dad','dog','bird'],pts:[[-1.6,.3,-2.5],[1.6,.3,-2.5]],far:1.05},{t:2.4,yaw:.05,pitch:.14,fov:38,who:['feza','dad','dog']},
        {t:5.0,yaw:-.45,pitch:.22,fov:40,who:['feza','dad','dog'],pts:[[-.8,.4,-1.6],[.8,.4,-1.6]]},{t:7.4,yaw:.0,pitch:.26,fov:40,who:['feza','dad','dog'],pts:[[-1.9,.3,-2.3],[1.9,.3,-2.3]]},
        {t:9.3,yaw:.2,pitch:.15,fov:36,who:['feza','dad','dog']},{t:10.8,yaw:0,pitch:.3,fov:40,who:['feza','dad','dog','bird'],pts:[[0,.2,-2.6]],far:1.1,k:1.6}])};
  };
  // 3 · mese: honey and acorn feast in the tree house; squirrels come to share.
  SCENES.mese=K=>{const k=K.kit,S=K.stage,A=K.A,bs=K.bs,HP=2.3;
    const bark=k.mat(0x6b4a33,{roughness:.95}),plank=k.mat(0xb07d4e,{roughness:.85}),plank2=k.mat(0x9a6a40,{roughness:.85}),leafC=[k.mat(0xe0892f,{roughness:.9}),k.mat(0xf0b43c,{roughness:.9}),k.mat(0xc9572b,{roughness:.9}),k.mat(0x8aa63b,{roughness:.9})];
    k.mesh(new THREE.CylinderGeometry(.55,.85,7.5,16),bark,[0,3.75,-1.55],null,null,S);
    for(let i=0;i<5;i++){const a=i*1.3;k.mesh(new THREE.CylinderGeometry(.08,.16,2.2,8),bark,[Math.sin(a)*.9,5.6+i*.25,-1.55+Math.cos(a)*.6],null,[Math.cos(a)*.8,0,-Math.sin(a)*.8],S);}
    for(let i=0;i<26;i++){const a=i*2.4,r=1.2+(i%4)*.55;k.mesh(new THREE.SphereGeometry(1,12,9),leafC[i%4],[Math.sin(a)*r,5.6+(i%5)*.35,-1.8+Math.cos(a)*r*.7],[.75+(i%3)*.2,.55,.7],null,S);}
    const deck=k.grp([0,HP,0],S);
    k.mesh(new THREE.CylinderGeometry(2.5,2.5,.12,24),plank,[0,-.06,-.5],null,null,deck);
    for(let i=0;i<9;i++)k.mesh(new THREE.BoxGeometry(4.9,.012,.08),plank2,[0,.002,-2.6+i*.5],null,null,deck);
    for(let i=0;i<14;i++){const a=-1.2+i*(2.4/13),x=Math.sin(a)*2.4,z=-.5+Math.cos(a)*2.4;if(Math.abs(a)<.25)continue;k.mesh(new THREE.CylinderGeometry(.035,.04,.62,8),plank2,[x,.31,z],null,null,deck);}
    const railPts=[];for(let i=0;i<=24;i++){const a=-1.2+i*.1;railPts.push(new THREE.Vector3(Math.sin(a)*2.4,.62,-.5+Math.cos(a)*2.4));}
    k.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts),40,.035,6),plank,null,null,null,deck);
    for(const s of[-1,1])k.mesh(new THREE.CylinderGeometry(.12,.14,HP+.1,10),bark,[s*1.6,-HP/2-.05,.4],null,null,deck);
    // little hut behind: walls, round window, roof
    const hut=k.grp([.2,0,-2.1],deck);k.mesh(new THREE.BoxGeometry(2.0,1.4,.9),k.mat(0xc79058,{roughness:.9}),[0,.7,0],null,null,hut);
    k.mesh(new THREE.CircleGeometry(.24,20),k.mat(0xffe4a0,{emissive:0xffb85a,emissiveIntensity:.6}),[-.45,.85,.455],null,null,hut);k.mesh(new THREE.TorusGeometry(.25,.035,6,20),plank2,[-.45,.85,.46],null,null,hut);
    k.mesh(new THREE.BoxGeometry(.5,.85,.05),plank2,[.45,.43,.46],null,null,hut);
    k.mesh(new THREE.ConeGeometry(1.55,.9,4),k.mat(0xb24a32,{roughness:.8}),[0,1.85,0],[1,1,.62],[0,Math.PI/4,0],hut);
    // the feast on a checked cloth: honey pot, acorn heap, honey cakes, apples
    const cloth=k.canvasTex(128,128,(c)=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++){c.fillStyle=(x+y)%2?'#f6efe0':'#d9473c';c.fillRect(x*16,y*16,16,16);}});
    k.mesh(new THREE.PlaneGeometry(1.5,1.1),k.mat(0xffffff,{map:cloth,roughness:.95}),[.05,.013,.45],null,[-Math.PI/2,0,0],deck);
    const pot=k.grp([.1,0,.25],deck);k.mesh(new THREE.SphereGeometry(1,20,14),k.mat(0xe0a24a,{roughness:.35}),[0,.14,0],[.15,.15,.15],null,pot);k.mesh(new THREE.CylinderGeometry(.09,.11,.06,16),k.mat(0xe0a24a,{roughness:.35}),[0,.29,0],null,null,pot);
    k.mesh(new THREE.CylinderGeometry(.1,.1,.03,16),k.mat(0xffc533,{roughness:.15,emissive:0xb06a00,emissiveIntensity:.25}),[0,.31,0],null,null,pot);
    k.mesh(new THREE.TorusGeometry(.15,.02,8,24),k.mat(0x8a5a33),[0,.2,0],null,[Math.PI/2,0,0],pot);
    const drip=k.mesh(new THREE.SphereGeometry(1,10,8),k.mat(0xffbf2a,{roughness:.1,emissive:0x9a5a00,emissiveIntensity:.3}),[.09,.25,.06],[.025,.06,.025],null,pot);
    const dipper=k.grp([.04,.33,.0],pot);k.mesh(new THREE.CylinderGeometry(.012,.012,.32,6),k.mat(0x9a6a40),[0,.12,0],null,null,dipper);dipper.rotation.z=-.4;
    const acorns=k.grp([.55,0,.55],deck);const am=k.mat(0xb07a3e,{roughness:.6}),ac=k.mat(0x6b4a2a,{roughness:.95});
    for(let i=0;i<14;i++){const a=i*2.4,r=(i%4)*.04,y=.03+Math.floor(i/6)*.04;k.mesh(new THREE.SphereGeometry(1,10,8),am,[Math.sin(a)*r,y,Math.cos(a)*r],[.028,.034,.028],null,acorns);k.mesh(new THREE.SphereGeometry(1,10,6),ac,[Math.sin(a)*r,y+.022,Math.cos(a)*r],[.031,.014,.031],null,acorns);}
    for(let i=0;i<3;i++){const p=k.grp([-.35+i*.13,0,.7-i*.05],deck);k.mesh(new THREE.CylinderGeometry(.08,.08,.012,16),k.mat(0xf1e4c8),[0,.01,0],null,null,p);k.mesh(new THREE.CylinderGeometry(.05,.055,.035,14),k.mat(0xd99a4a,{roughness:.6}),[0,.035,0],null,null,p);k.mesh(new THREE.CylinderGeometry(.05,.05,.01,14),k.mat(0xffc533,{roughness:.15}),[0,.056,0],null,null,p);}
    const stoolF=k.grp([-.62,0,.1],deck),stoolD=k.grp([.95,0,-.05],deck);
    k.mesh(new THREE.CylinderGeometry(.2,.22,.38-.0,14),plank2,[0,.19,0],null,null,stoolF);k.mesh(new THREE.CylinderGeometry(.24,.26,.5,14),plank2,[0,.25,0],null,null,stoolD);
    // squirrels hop in along the rail and nibble acorns
    const sq=[0,1,2].map(i=>{const g=makeSquirrel(k,deck);g.scale.setScalar(i===1?1.15:1);return {g,i};});
    const sqPath=[[[-1.7,.62,.9],[-1.0,0,.95],[.45,0,.85]],[[1.9,.62,.6],[1.3,0,.75],[.7,0,.62]],[[-.6,.62,2.0],[-.1,0,1.4],[.32,0,.82]]];
    A.feza.set(-.62,HP+.38-.40*bs,.1,.5);A.dad.set(.95,HP+.5-.56,-.05,-.5);A.dog.set(-1.3,HP,.2,.6);A.bird.set(1.85,HP+.62+.3,-.6,-.8);
    A.feza.st.kp='sit';A.dad.st.pose='sit';A.dog.st.sit=true;A.bird.st.perch=1;K.dad.setGear({tool:'none',backpack:false,light:false,lantern:false,packRod:false});
    const SHOTS=shotsOf([{t:2.6,yaw:0,pitch:.22,fov:40,who:['feza','dad','dog','bird'],k:2},{t:4.6,yaw:-.25,pitch:.2,fov:38,who:['feza','dad','dog'],pts:[[.1,HP+.3,.25]]},
      {t:6.6,yaw:.3,pitch:.24,fov:38,who:['feza','dad'],pts:[[.45,HP,.85],[.7,HP,.62],[.32,HP,.82]]},{t:8.6,yaw:-.1,pitch:.18,fov:36,who:['feza','dad','dog']},{t:10.4,yaw:.1,pitch:.28,fov:40,who:['feza','dad','dog','bird'],far:1.15,k:1.6}]);
    K.events=[[.6,()=>K.say()],[3.0,()=>{A.feza.st.kp='sitEat';A.dad.st.pose='sitEat';}],[4.2,()=>K.fx('sparkle',-.4,HP+.95,.3,{count:6,color:'#ffd35a'})],
      [5.0,()=>K.bark(.8)],[8.4,()=>{A.feza.st.kp='sit';K.fx('hearts',-.3,HP+1.2,.6,{count:2,size:.07});}],[10.0,()=>{A.feza.st.kp='sitEat';A.dad.st.pose='sitWave';}],[11.5,()=>{A.dad.st.pose='sitEat';}]];
    return {dur:13,
      tick(t,dt){drip.scale.y=.06+.02*Math.sin(t*2);drip.position.y=.25-.02*((t*.6)%1);
        for(const s of sq){const u=(t-3.2-s.i*.8)/2.3,P=sqPath[s.i],g=s.g,d=g.userData;if(u<0){g.visible=false;continue;}g.visible=true;
          if(u<1){const seg=u<.4?0:1,v=seg?((u-.4)/.6):u/.4,A2=P[seg],B2=P[seg+1];const h=Math.abs(Math.sin(v*Math.PI*(seg?3:2)))*.14;
            g.position.set(lerp(A2[0],B2[0],v),lerp(A2[1],B2[1],seg?v:v*v)+h,lerp(A2[2],B2[2],v));g.rotation.y=Math.atan2(B2[0]-A2[0],B2[2]-A2[2]);d.acorn.visible=false;d.body.rotation.x=.25;}
          else{const end=P[2];g.position.set(end[0],0,end[2]);g.rotation.y=Math.atan2(-end[0]*.3,1.5-end[2]);d.acorn.visible=true;d.body.rotation.x=-.18;d.head.rotation.x=.12*Math.sin(t*14+s.i);}
          d.tail.rotation.x=.18*Math.sin(t*3+s.i);}
        if(pulse(t,4.8,6))A.dog.st.sit=false;else A.dog.st.sit=true;},
      cam:t=>t<2.6?shot(t,[[0,[.6,.9,6.2],[0,3.2,-.6],44],[2.6,[.4,HP+1.25,4.6],[0,HP+.7,-.2],42]]):SHOTS(t)};
  };
  // 4 · selale: Kartal lifts Feza for a short flight up to the hill top; a rainbow over the forest.
  SCENES.selale=K=>{const k=K.kit,S=K.stage,A=K.A,bs=K.bs;
    const TOP=[3.4,4.6,-5.6];
    const rock=k.mat(0x8c8478,{roughness:.95}),rock2=k.mat(0x9c958a,{roughness:.95}),grass=k.mat(0x6aa84a,{roughness:.9});
    const rg=new THREE.CylinderGeometry(1.15,1.7,TOP[1],14,6);{const p=rg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i),a=Math.atan2(x,z),n=1+.08*Math.sin(a*5+y*2)+.05*Math.sin(a*11-y*3);p.setXYZ(i,x*n,y,z*n);}rg.computeVertexNormals();}
    k.mesh(rg,rock,[TOP[0],TOP[1]/2,TOP[2]],null,null,S);
    k.mesh(new THREE.CylinderGeometry(1.22,1.2,.14,16),grass,[TOP[0],TOP[1]+.0,TOP[2]],null,null,S);
    for(let i=0;i<6;i++){const a=i*1.1;k.mesh(new THREE.DodecahedronGeometry(.45+(i%3)*.15,0),i%2?rock:rock2,[TOP[0]+Math.sin(a)*1.6,.25,TOP[2]+Math.cos(a)*1.4],null,[i,i*2,0],S);}
    const fl=[0xffe066,0xff8fb3,0xffffff];for(let i=0;i<9;i++){const a=i*.7;k.mesh(new THREE.SphereGeometry(.05,8,6),k.mat(fl[i%3]),[TOP[0]+Math.sin(a)*.9,TOP[1]+.1,TOP[2]+Math.cos(a)*.85],null,null,S);}
    const nest=k.grp([TOP[0]+.7,TOP[1]+.07,TOP[2]-.4],S);k.mesh(new THREE.TorusGeometry(.22,.09,8,20),k.mat(0x8a6a44,{roughness:1}),[0,.05,0],null,[Math.PI/2,0,0],nest);
    for(let i=0;i<2;i++)k.mesh(new THREE.SphereGeometry(1,10,8),k.mat(0xf3eedf),[(i-.5)*.1,.07,0],[.05,.065,.05],null,nest);
    // rainbow: colour bands across the tube
    const rbG=new THREE.TorusGeometry(7.5,.55,12,80,Math.PI);{const p=rbG.attributes.position,col=[],bands=[[1,.25,.25],[1,.6,.2],[1,.92,.3],[.4,.85,.35],[.35,.6,1],[.6,.4,.95]];for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i)),u=sat((7.5+.55-r)/1.1)*5.0,j=Math.min(4,Math.floor(u)),f=u-j,a=bands[j],b=bands[j+1];col.push(lerp(a[0],b[0],f),lerp(a[1],b[1],f),lerp(a[2],b[2],f));}rbG.setAttribute('color',new THREE.Float32BufferAttribute(col,3));}
    const rainbow=k.mesh(rbG,k.basic({vertexColors:true,transparent:true,opacity:0,depthWrite:false,fog:false,side:THREE.DoubleSide}),[TOP[0]-1.0,-.6,TOP[2]-9],null,[0,.25,0],S);rainbow.castShadow=false;rainbow.renderOrder=3;
    const cloudM=k.mat(0xffffff,{roughness:1,emissive:0xffffff,emissiveIntensity:.25});
    const ftex=k.canvasTex(64,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#9fd8ef');g.addColorStop(.5,'#e9f8ff');g.addColorStop(1,'#9fd8ef');c.fillStyle=g;c.fillRect(0,0,w,h);c.globalAlpha=.5;c.strokeStyle='#ffffff';for(let i=0;i<22;i++){const x=(i*29)%w;c.beginPath();c.moveTo(x,0);c.lineTo(x+(i%3)-1,h);c.lineWidth=1+(i%3);c.stroke();}});
    ftex.wrapS=ftex.wrapT=THREE.RepeatWrapping;ftex.repeat.set(2,2);
    const fall=k.mesh(new THREE.PlaneGeometry(1.5,TOP[1]+1.2,1,8),k.mat(0xffffff,{map:ftex,roughness:.2,transparent:true,opacity:.88,emissive:0x8fc8e0,emissiveIntensity:.25,side:THREE.DoubleSide}),[TOP[0]-1.75,(TOP[1]+1.2)/2,TOP[2]+.15],null,[0,.55,0],S);fall.castShadow=false;
    const fpool=k.mesh(new THREE.CircleGeometry(1.6,32),k.mat(0x5fb3d0,{roughness:.1,metalness:.1,transparent:true,opacity:.9}),[TOP[0]-2.2,.04,TOP[2]+1.0],null,[-Math.PI/2,0,0],S);fpool.castShadow=false;
    for(const c of[[-3,6.2,-10],[6.5,5.4,-12],[1.5,7.4,-14]]){const g=k.grp(c,S);for(let i=0;i<5;i++)k.mesh(new THREE.SphereGeometry(.6+(i%2)*.3,14,10),cloudM,[(i-2)*.55,Math.abs(i-2)*-.15,(i%2)*.2],null,null,g);}
    A.feza.set(0,0,0,0);A.dad.set(1.15,0,-.25,-.25);A.dog.set(-1.0,0,.3,.3);A.bird.set(0,3.6,-1.5,0);
    A.feza.st.kp='wave';A.dad.st.pose='point';
    const path=new THREE.CatmullRomCurve3([V3(0,1.25*bs+.55,0),V3(-.6,3.0,-1.0),V3(.6,5.6,-3.2),V3(2.6,6.4,-5.0),V3(TOP[0],TOP[1]+1.25*bs+.55,TOP[2])]);
    const hang=1.25*bs+.55,tmp=new THREE.Vector3(),tan=new THREE.Vector3();
    let phase=0;
    const SH0=shotsOf([{t:0,yaw:0,pitch:.12,fov:42,who:['feza','dad','dog','bird']},{t:2.2,yaw:.1,pitch:.05,fov:42,who:['feza','dad','dog','bird']}]);
    const SH1=shotsOf([{t:8.6,yaw:.5,pitch:.18,fov:42,who:['feza','bird'],min:3,k:2},{t:10.2,yaw:.25,pitch:.12,fov:40,who:['feza','bird'],min:2.6},
      {t:11.6,yaw:.35,pitch:-.02,fov:48,who:['feza'],pts:[[TOP[0]-4.5,6.5,TOP[2]-9],[TOP[0]+4.5,6.5,TOP[2]-9]],k:1.4}]);
    K.events=[[.6,()=>K.say()],[1.0,()=>K.sfx('chirp',{pitch:1.1})],[2.0,()=>{phase=1;K.sfx('whoosh');}],[3.4,()=>{phase=2;A.feza.st.kp='ride';K.sfx('cheer');K.fx('sparkle',0,1.4,0,{count:8,color:'#fff2a8'});K.bark();}],
      [4.0,()=>{A.dad.st.pose='wave';A.dog.st.pounce=1;}],[5.0,()=>K.bark()],[8.6,()=>{phase=3;K.fx('sparkle',TOP[0],TOP[1]+.6,TOP[2],{count:12,color:'#fff6c0'});K.sfx('pop');A.feza.st.kp='hop';}],
      [9.6,()=>{A.feza.st.kp='wave';}],[11.2,()=>{A.feza.st.kp='lookUp';}]];
    return {dur:14,
      tick(t,dt){const b=A.bird,f=A.feza;
        if(phase===0){const a=t*1.1;b.x=Math.sin(a)*1.4;b.z=-1.2+Math.cos(a)*.9;b.y=3.4+.2*Math.sin(t*2);b.face=a+Math.PI/2;b.st.bank=-.15;b.st.carry=0;}
        else if(phase===1){const u=ease(sat((t-2)/1.4));b.x=lerp(b.x,0,u);b.z=lerp(b.z,0,u);b.y=lerp(b.y,hang,u);b.face=lerp(b.face,0,u*.2);b.st.bank=0;b.st.carry=u;b.st.flap=9;}
        else if(phase===2){const u=ease(sat((t-3.4)/5.2));path.getPointAt(u,tmp);path.getTangentAt(Math.min(.999,u),tan);b.x=tmp.x;b.y=tmp.y+.06*Math.sin(t*9);b.z=tmp.z;b.face=Math.atan2(tan.x,tan.z);b.st.bank=Math.max(-.16,Math.min(.16,-tan.x*.3));b.st.flap=9.5;b.st.carry=1;
          f.x=b.x;f.y=b.y-hang;f.z=b.z;f.face=b.face;}
        else{const u=ease(sat((t-8.6)/1.4));f.x=TOP[0];f.y=TOP[1]+.07;f.z=TOP[2];f.face=lerp(f.face,0,1-Math.exp(-3*dt));
          b.x=lerp(TOP[0],TOP[0]+.75,u);b.y=lerp(TOP[1]+hang,TOP[1]+.42,u);b.z=lerp(TOP[2],TOP[2]-.35,u);b.face=lerp(b.face,-.6,u);b.st.carry=1-u;b.st.perch=u;b.st.flap=lerp(9,4.6,u);}
        rainbow.material.opacity=.62*ease(sat((t-6.5)/2.5));ftex.offset.y=t*1.4;if(Math.floor(t*2)!==Math.floor((t-dt)*2))K.fx('bubbles',TOP[0]-2.2,.2,TOP[2]+1.0,{count:3});
        if(phase>=2&&Math.floor(t*3)!==Math.floor((t-dt)*3))K.fx('sparkle',f.x,f.y+.6,f.z,{count:2,color:'#ffffff'});},
      cam:t=>{const f=A.feza;
        if(t<3.4)return SH0(t);
        if(t<8.6)return {yaw:.55,pitch:.12,fov:44,who:['feza','bird'],min:3.2,k:3.2};
        return SH1(t);}};
  };
  // 5 · gece: marshmallows at the camp fire, the stars and the fireflies.
  SCENES.gece=K=>{const k=K.kit,S=K.stage,A=K.A,bs=K.bs;
    const F=[0,0,.75];
    const stone=k.mat(0x8d8a84,{roughness:.95});for(let i=0;i<11;i++){const a=i/11*TAU;k.mesh(new THREE.SphereGeometry(1,10,7),stone,[F[0]+Math.sin(a)*.42,.06,F[2]+Math.cos(a)*.42],[.1,.08,.09],[0,a,0],S);}
    for(let i=0;i<4;i++){const a=i/4*TAU+.4;k.mesh(new THREE.CylinderGeometry(.05,.06,.6,8),k.mat(0x5b3a24,{roughness:.95}),[F[0]+Math.sin(a)*.12,.12,F[2]+Math.cos(a)*.12],null,[Math.cos(a)*1.2,0,-Math.sin(a)*1.2],S);}
    const flames=[[0xff7a22,.22,.62],[0xffb63a,.16,.48],[0xfff0a0,.09,.3]].map((c,i)=>{const m=k.basic({color:c[0],transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false});const f=k.mesh(new THREE.ConeGeometry(c[1],c[2],10,1,true),m,[F[0],.14+c[2]/2,F[2]],null,null,S);f.castShadow=false;f.userData.h=c[2];return f;});
    const glow=k.mesh(new THREE.PlaneGeometry(2.6,2.6),k.basic({map:k.glowTex(),color:0xff9a40,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),[F[0],.03,F[2]],null,[-Math.PI/2,0,0],S);glow.castShadow=false;
    makeLog(k,S,1.2,.17,[-.6,0,-.2],-.12);makeLog(k,S,1.25,.19,[.72,0,-.3],.12);
    // stars: a dome of twinkling points; a shooting star later
    const N=420,sp=new Float32Array(N*3);for(let i=0;i<N;i++){const a=Math.random()*TAU,e=.18+Math.random()*1.25,r=38;sp[i*3]=Math.cos(e)*Math.sin(a)*r;sp[i*3+1]=Math.sin(e)*r;sp[i*3+2]=Math.cos(e)*Math.cos(a)*r-6;}
    const sg=k.geo(new THREE.BufferGeometry());sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
    const starM=k.material(new THREE.PointsMaterial({size:4.2,sizeAttenuation:false,map:k.glowTex(),color:0xfff6dc,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
    const stars=new THREE.Points(sg,starM);stars.frustumCulled=false;stars.renderOrder=-1;S.add(stars);
    const moon=k.mesh(new THREE.SphereGeometry(1.4,24,16),k.basic({color:0xfff3c8,fog:false}),[-16,26,-44],null,null,S);moon.castShadow=false;
    const M=26,fp=new Float32Array(M*3),fseed=[];for(let i=0;i<M;i++)fseed.push([Math.random()*TAU,1.2+Math.random()*2.4,.4+Math.random()*1.6,.4+Math.random()*.8]);
    const fg=k.geo(new THREE.BufferGeometry());fg.setAttribute('position',new THREE.BufferAttribute(fp,3));
    const flyM=k.material(new THREE.PointsMaterial({size:13,sizeAttenuation:false,map:k.glowTex(),color:0xd8ff7a,transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
    const flies=new THREE.Points(fg,flyM);flies.frustumCulled=false;S.add(flies);
    const shoot=k.mesh(new THREE.PlaneGeometry(3.2,.06),k.basic({map:k.glowTex(),color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),[0,14,-22],null,[0,0,-.35],S);shoot.castShadow=false;
    const stickF=makeStick(k,S);
    A.feza.set(-.6,.34-.40*bs+.02,-.2,.32);A.dad.set(.72,.38-.56+.5-.02,-.3,-.38);A.dog.set(-1.6,0,.3,1.0);A.bird.set(.05,.55+.3,-1.45,0);
    A.feza.st.kp='sitStick';A.dad.st.pose='sitStick';A.dog.st.sit=true;A.bird.st.perch=1;K.dad.setGear({tool:'cubuk',backpack:false,light:false,lantern:true,packRod:false});
    makeStump(k,S,[.05,0,-1.45],.55,.26);
    let toastK=0;const tmp=new THREE.Vector3();
    const SHOTS=shotsOf([{t:0,yaw:0,pitch:.26,fov:42,who:['feza','dad','dog','bird'],pts:[[0,.3,.75]]},{t:2.6,yaw:-.3,pitch:.2,fov:38,who:['feza','dad'],pts:[[0,.5,.75]]},
      {t:5.4,yaw:-.3,pitch:.12,fov:36,who:['feza','dad','dog']},{t:7.2,yaw:0,pitch:.1,fov:40,who:['feza','dad','dog']},{t:11.4,yaw:0,pitch:.24,fov:42,who:['feza','dad','dog','bird'],pts:[[0,.3,.75]],k:1.6}]);
    K.events=[[.6,()=>K.say()],[1.5,()=>K.fx('sparkle',F[0],.6,F[2],{count:6,color:'#ffb347'})],[4.0,()=>K.fx('sparkle',F[0],.7,F[2],{count:6,color:'#ffcf6a'})],[5.6,()=>{A.feza.st.kp='sitEat';A.dad.st.pose='sitEat';K.sfx('munch');}],
      [6.4,()=>K.fx('hearts',-.6,1.25,-.1,{count:2,size:.07})],[7.6,()=>{A.feza.st.kp='lookUp';A.dad.st.pose='lookUp';}],[9.3,()=>K.sfx('star',{vol:.4})],[11.6,()=>{A.feza.st.kp='sitStick';A.dad.st.pose='sitWave';}]];
    return {dur:13.2,borrowLight:{x:F[0],y:.7,z:F[2],color:0xff9a48,intensity:3.2,distance:7,decay:1.6},
      tick(t,dt){
        flames.forEach((f,i)=>{const s=1+.12*Math.sin(t*(11+i*3))+.07*Math.sin(t*(17+i*5));f.scale.set(1+.06*Math.sin(t*9+i),s,1+.06*Math.cos(t*8+i));f.position.y=.14+f.userData.h*s/2;f.rotation.y=t*(1+i);});
        glow.material.opacity=.4+.06*Math.sin(t*10);if(K.light)K.light.intensity=3.0+.35*Math.sin(t*12)+.2*Math.sin(t*7.3);
        starM.size=4.0+.4*Math.sin(t*3.1);
        for(let i=0;i<M;i++){const s=fseed[i],a=s[0]+t*.35*s[3];fp[i*3]=Math.sin(a)*s[1]+Math.sin(t*1.3+i)*.25;fp[i*3+1]=s[2]+.3*Math.sin(t*1.7+i*2);fp[i*3+2]=-.5+Math.cos(a)*s[1]*.8;}
        fg.attributes.position.needsUpdate=true;flyM.opacity=.75+.25*Math.sin(t*4);
        if(t>9.2&&t<10.6){const u=(t-9.2)/1.4;shoot.position.set(lerp(-6,8,u),lerp(16,12.5,u),-22);shoot.material.opacity=Math.sin(u*Math.PI)*.95;}else shoot.material.opacity=0;
        toastK=sat((t-1.0)/4.2);if(K.dad.gear)K.dad.gear.toast(toastK);stickF.userData.marsh.color.setRGB(1-.18*toastK,.97-.40*toastK,.93-.62*toastK);
        // Feza's marshmallow stick: from her hand toward the fire; after eating it rests on the log
        const eating=A.feza.st.kp==='sitEat'||A.feza.st.kp==='lookUp';stickF.visible=!eating||t>11.6;
        if(K.H&&stickF.visible){S.worldToLocal(stickF.position.copy(K.H.hand));tmp.set(F[0]-stickF.position.x,.75-stickF.position.y,F[2]-stickF.position.z).normalize();tmp.y=Math.max(tmp.y,.25);tmp.normalize();stickF.quaternion.setFromUnitVectors(K.UP,tmp);}
        if(Math.floor(t*1.6)!==Math.floor((t-dt)*1.6))K.fx('sparkle',F[0],.6,F[2],{count:2,color:'#ffb347'});},
      light:{sun:0x8fa6ff,sunI:.35,hemiSky:0x4a5c9a,hemiGround:0x1e1a2a,hemiI:.42,bg:0x0e1430},
      cam:t=>(t>=8.6&&t<11.4)?shot(t,[[8.6,[.2,.9,2.6],[-1.2,5.5,-14],50],[11.4,[.2,.9,2.6],[-1.0,5,-14],52]]):SHOTS(t)};
  };
  // 6 · bataklik (final): every ball comes back, they glow and float around the friends; a happy camp party.
  SCENES.bataklik=K=>{const k=K.kit,S=K.stage,A=K.A;
    const balls=[];for(let i=0;i<10;i++){const b=makeBall(k,S,i);b.visible=false;balls.push(b);}
    const garland=[];const gm=[0xff7a7a,0xffd25a,0x7ad0ff,0x9be07a,0xd59bff].map(c=>k.mat(c,{roughness:.5,emissive:c,emissiveIntensity:.35}));
    for(let i=0;i<22;i++){const a=i/22*TAU;garland.push(k.mesh(new THREE.SphereGeometry(.07,10,8),gm[i%5],[Math.sin(a)*2.6,2.9+.18*Math.sin(a*3),-.3+Math.cos(a)*2.6],null,null,S));}
    makeStump(k,S,[-2.1,0,-1.0],.5,.28);
    // misty swamp shore: dark water pools, soft mist, lantern posts with a string of warm lights
    for(const w of[[-2.6,-2.2,2.0],[2.4,-2.6,1.8],[0,-3.4,2.4]]){const m=k.mesh(new THREE.CircleGeometry(w[2],32),k.mat(0x3f6a5a,{roughness:.08,metalness:.15,transparent:true,opacity:.92}),[w[0],.035,w[1]],null,[-Math.PI/2,0,0],S);m.castShadow=false;}
    const posts=[[-2.6,-.9],[-1.3,-2.3],[1.3,-2.3],[2.6,-.9]],lampM=k.mat(0xffe2a0,{emissive:0xffb24a,emissiveIntensity:1.6,roughness:.3}),postM=k.mat(0x5e4630,{roughness:.9});
    for(const q of posts){k.mesh(new THREE.CylinderGeometry(.05,.06,2.4,8),postM,[q[0],1.2,q[1]],null,null,S);k.mesh(new THREE.SphereGeometry(.11,12,10),lampM,[q[0],2.35,q[1]],null,null,S);}
    const bulbs=[0xffd36a,0xff8f7a,0x9ff0a0,0x8fd8ff].map(c=>k.mat(c,{emissive:c,emissiveIntensity:1.4,roughness:.4}));
    for(let i=0;i<posts.length-1;i++){const A2=posts[i],B2=posts[i+1];for(let j=1;j<9;j++){const u=j/9;k.mesh(new THREE.SphereGeometry(.045,8,6),bulbs[(i*9+j)%4],[lerp(A2[0],B2[0],u),2.3-.35*Math.sin(u*Math.PI),lerp(A2[1],B2[1],u)],null,null,S);}}
    const mist=[];for(let i=0;i<7;i++){const m=k.mesh(new THREE.PlaneGeometry(3.2,1.1),k.basic({map:k.glowTex(),color:0xe6f0ff,transparent:true,opacity:.28,depthWrite:false,fog:false}),[-3+i,.45,-3.2+(i%3)*.5],null,null,S);m.castShadow=false;m.userData.ph=i;mist.push(m);}
    A.feza.set(0,0,.2,0);A.dad.set(1.15,0,-.25,-.3);A.dog.set(-1.1,0,-.05,.4);A.bird.set(0,3.2,-.6,0);
    A.feza.st.kp='hop';A.dad.st.pose='cheer';
    const SHOTS=shotsOf([{t:0,yaw:0,pitch:.26,fov:42,who:['feza','dad','dog'],pts:[[-2.2,1.8,-.3],[2.2,1.8,-.3]]},{t:3.0,yaw:-.2,pitch:.16,fov:38,who:['feza','dad','dog']},
      {t:6.2,yaw:.25,pitch:.18,fov:38,who:['feza','dad','dog','bird']},{t:9.2,yaw:0,pitch:.2,fov:40,who:['feza','dad','dog'],pts:[[0,2.6,-.3]]},{t:11.2,yaw:0,pitch:.1,fov:44,who:['feza','dad','dog'],pts:[[0,4.4,-.3],[-2,2,-.3],[2,2,-.3]],k:1.5}]);
    K.events=[[.5,()=>K.say()],[2.6,()=>{A.feza.st.kp='dance';A.dad.st.pose='dance';}],[4.0,()=>K.bark()],[5.6,()=>K.fx('confetti',0,2.6,0,{count:24})],[7.2,()=>K.bark()],
      [8.6,()=>K.fx('confetti',-1,2.8,-.5,{count:20})],[10.2,()=>{A.feza.st.kp='hop';A.dad.st.pose='cheer';K.sfx('cheer');}],[11.0,()=>K.fx('confetti',1,3,-.3,{count:24})],[12.2,()=>{A.feza.st.kp='wave';A.dad.st.pose='wave';}]];
    return {dur:14,
      tick(t,dt){
        for(let i=0;i<10;i++){const b=balls[i],rise=t-.4-i*.18;if(rise<0){b.visible=false;continue;}if(!b.visible){b.visible=true;K.sfx('pop',{vol:.35,pitch:.9+i*.03});}
          const a=i/10*TAU+t*.55,r=2.7+.15*Math.sin(t*1.3+i),u=ease(sat(rise/1.2));let y=lerp(.2,2.55+.3*Math.sin(t*2.1+i*.9),u);
          if(t>11.4){const v=ease(sat((t-11.4)/1.6));y+=v*2.4;}
          b.position.set(Math.sin(a)*r*u,y,-.6+Math.cos(a)*r*u*.8);b.scale.setScalar(.8);b.rotation.set(t*1.3+i,t*.9,0);b.userData.mat.emissiveIntensity=.35+.25*Math.sin(t*4+i);}
        if(t>12.8&&t-dt<=12.8)for(let i=0;i<10;i+=2){const b=balls[i];K.fx('sparkle',b.position.x,b.position.y,b.position.z,{count:6,color:'#ffd27a'});}
        mist.forEach(m=>{m.position.x+=Math.sin(t*.3+m.userData.ph)*.003;m.material.opacity=.22+.08*Math.sin(t*.7+m.userData.ph);m.lookAt(camera.position.x-K.stage.position.x,m.position.y,camera.position.z-K.stage.position.z);});
        garland.forEach((g,i)=>{g.position.y=2.9+.18*Math.sin(i/22*TAU*3)+.05*Math.sin(t*3+i);});
        const a=t*.9;A.bird.x=Math.sin(a)*2.6;A.bird.z=-.3+Math.cos(a)*2.6;A.bird.y=3.3+.3*Math.sin(t*1.7);A.bird.face=a+Math.PI/2;A.bird.st.bank=-.16;
        A.dog.st.pounce=pulse(t,2.5,10)?Math.abs(Math.sin(t*3.2)):0;A.dog.face=.4+.5*Math.sin(t*1.6);},
      light:{sun:0xffc69a,sunI:1.6,hemiSky:0xc7b6ff,hemiGround:0x4a4a3a,hemiI:.8,bg:0x9a8ccc},
      cam:t=>{const c=SHOTS(t);return Object.assign({},c,{yaw:(c.yaw||0)+.25*Math.sin(t*.35)});}};
  };
  const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
  // Kartal's lift (gameplay, e.g. up a cliff in the waterfall chapter): FOREST_PARTY.kartalUcus({x,z,y?}, bitince)
  SCENES.ucus=K=>{const A=K.A,bs=K.bs,to=K.ctx.to||{x:K.O.x,z:K.O.z-6},T=[to.x-K.O.x,(to.y||0)-K.O.y,to.z-K.O.z],hang=1.25*bs+.55,d=Math.hypot(T[0],T[2]);
    const dur=Math.max(3.6,Math.min(7,2.4+d*.35)),fly=dur-1.9,tmp=new THREE.Vector3(),tan=new THREE.Vector3();
    const path=new THREE.CatmullRomCurve3([V3(0,hang,0),V3(T[0]*.25,hang+1.6+Math.max(0,T[1])*.5,T[2]*.25),V3(T[0]*.7,hang+2.2+T[1],T[2]*.7),V3(T[0],hang+T[1],T[2])]);
    A.feza.set(0,0,0,Math.atan2(T[0],T[2]));A.bird.set(0,3.2,-.8,0);A.feza.st.kp='wave';A.dad.hide=true;A.dog.hide=true;
    K.events=[[.8,()=>{A.feza.st.kp='ride';K.sfx('whoosh');}],[dur-1.0,()=>{A.feza.st.kp='hop';K.fx('sparkle',T[0],T[1]+.6,T[2],{count:10,color:'#fff6c0'});}]];
    return {dur,noVoice:true,tick(t,dt){const b=A.bird,f=A.feza;
      if(t<.8){const u=ease(t/.8);b.x=lerp(0,0,u);b.y=lerp(3.2,hang,u);b.z=lerp(-.8,0,u);b.st.carry=u;b.st.flap=9;}
      else if(t<.8+fly){const u=ease(sat((t-.8)/fly));path.getPointAt(u,tmp);path.getTangentAt(Math.min(.999,u),tan);b.x=tmp.x;b.y=tmp.y+.05*Math.sin(t*9);b.z=tmp.z;b.face=Math.atan2(tan.x,tan.z);b.st.flap=9.5;b.st.carry=1;f.x=b.x;f.y=b.y-hang;f.z=b.z;f.face=b.face;}
      else{const u=ease(sat((t-.8-fly)/1.0));f.x=T[0];f.y=T[1];f.z=T[2];b.x=T[0];b.y=lerp(hang+T[1],T[1]+3.2,u);b.z=lerp(T[2],T[2]-1,u);b.st.carry=1-u;}},
      cam:()=>({yaw:.5,pitch:.2,fov:44,who:['feza','bird'],min:3.4,k:3}),
      done(){try{const P=K.P;if(P&&P.pos)P.pos.set(to.x,to.y!==undefined?to.y:P.pos.y,to.z);}catch(e){}}};
  };

  // ── the director ──
  const OV_CSS=`#kampAni{position:fixed;inset:0;z-index:80;touch-action:none;-webkit-user-select:none;user-select:none;cursor:pointer}
#kampAni .kb{position:absolute;left:0;right:0;height:0;background:#0b0a08;transition:height .55s ease}
#kampAni .kb.t{top:0}#kampAni .kb.b{bottom:0}#kampAni.on .kb{height:8.5vh}
#kampAni .ks{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:calc(8.5vh + 14px);width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);
box-shadow:0 0 0 3px rgba(255,255,255,.35) inset;opacity:0;transition:opacity .6s ease .8s,transform .2s,background .2s;display:flex;align-items:center;justify-content:center}
#kampAni.on .ks{opacity:.85}#kampAni.fast .ks{background:rgba(255,214,107,.55);transform:scale(1.12)}
#kampAni .ks i{display:block;width:0;height:0;border-top:13px solid transparent;border-bottom:13px solid transparent;border-left:17px solid #fff;margin:0 -1px}
#kampAni .kf{position:absolute;inset:0;background:#fffaf0;opacity:0;transition:opacity .35s ease;pointer-events:none}#kampAni.out .kf{opacity:1}
body.kamp-ani-on #ui{opacity:0!important;transition:opacity .4s;pointer-events:none!important}`;
  function overlay(onTap){
    if(!document.getElementById('kampAniCss')){const st=document.createElement('style');st.id='kampAniCss';st.textContent=OV_CSS;document.head.appendChild(st);}
    const ov=document.createElement('div');ov.id='kampAni';ov.innerHTML='<div class="kb t"></div><div class="kb b"></div><div class="ks"><i></i><i></i></div><div class="kf"></div>';
    document.body.appendChild(ov);document.body.classList.add('kamp-ani-on');requestAnimationFrame(()=>ov.classList.add('on'));
    const stop=e=>{e.preventDefault();e.stopPropagation();};
    ov.addEventListener('pointerdown',e=>{stop(e);onTap();});['pointerup','pointermove','touchstart','touchmove','touchend','mousedown','mouseup','click','contextmenu'].forEach(n=>ov.addEventListener(n,stop,{passive:false}));
    return ov;
  }
  function actor(){const a={x:0,y:0,z:0,face:0,st:{}};a.set=(x,y,z,f)=>{a.x=x;a.y=y;a.z=z;a.face=f||0;};return a;}
  function kampAktif(){return !!KS;}
  function kampAni(zoneId,bitince,ctx){ctx=ctx||{};
    let called=false;const done=()=>{if(called)return;called=true;try{if(typeof bitince==='function')bitince();}catch(e){console.error('[KAMP] bitince',e);}};
    if(KS){try{KS.finish(true);}catch(e){}}
    const make=SCENES[zoneId];
    const G=gameRef(),H=ctx.hero||G&&G.H,B=ctx.bilbo||G&&G.Bilbo,P=ctx.P||G&&G.P;
    if(!make||!G||!P||typeof scene==='undefined'){console.warn('[KAMP] kampAni: sahne yok',zoneId);setTimeout(done,0);return false;}
    const K={ctx,zone:zoneId,t:0,speed:1,H,B,bs:H&&H.root?H.root.scale.x||1:1,UP:new THREE.Vector3(0,1,0),events:[],ev:0,ended:false};
    try{
      const O=P.pos?{x:P.pos.x,y:P.pos.y||0,z:P.pos.z}:{x:0,y:0,z:0};K.O=O;K.P=P;
      const stage=new THREE.Group();stage.name='Kamp anı '+zoneId;stage.position.set(O.x,O.y,O.z);scene.add(stage);stage.updateMatrixWorld(true);
      K.stage=stage;K.kit=kit(stage);K.A={feza:actor(),dad:actor(),dog:actor(),bird:actor()};
      // companions: the live party (frozen while the scene runs) or a temporary pair
      let temp=null;const party=ctx.party||current||null;
      if(!party&&typeof FOREST_PARTY_MODELS!=='undefined'){temp={father:FOREST_PARTY_MODELS.father(),eagle:FOREST_PARTY_MODELS.eagle()};stage.add(temp.father.root,temp.eagle.root);}
      const dad=party?party.father:temp&&temp.father,bird=party?party.eagle:temp&&temp.eagle;K.dad=dad||{setGear(){},update(){},root:new THREE.Group()};K.bird=bird||{update(){},root:new THREE.Group()};
      const gear0=dad&&dad.gear?dad.gear.state:null;
      K.sfx=(n,o)=>{try{if(typeof AUD!=='undefined'&&AUD.sfx)AUD.sfx(n,Object.assign({x:O.x,z:O.z},o||{}));}catch(e){}};
      K.fx=(kind,x,y,z,o)=>{try{if(typeof FX!=='undefined'&&FX.burst)FX.burst(kind,O.x+x,O.y+y,O.z+z,o||{});}catch(e){}};
      K.say=()=>{try{if(typeof AUD!=='undefined'&&AUD.say)AUD.say('orman_kamp_'+zoneId,{prio:3,interrupt:true});}catch(e){}};
      K.bark=(v=.9)=>{K.A.dog.st.bark=1.3;K.sfx('bilboBark',{vol:v});};
      if(dad&&dad.setGear)dad.setGear({tool:'none',backpack:false,light:false,lantern:false,packRod:false});   // no axe in camp scenes
      const sc=make(K);K.sc=sc;
      // the chapter's magic gate sleeps during the scene (its glow and sparkles would sit in the middle of the picnic)
      const po=ctx.portal||null,poWas=po?{vis:po.obj?po.obj.visible:true,act:po.active!==false}:null;
      if(po){try{if(po.obj)po.obj.visible=false;if(po.setActive&&poWas.act)po.setActive(false);}catch(e){}}
      // models: Feza through H.kamp, Bilbo through a temporary update wrapper
      // a clean stage: Feza's see-through outline off, nearby creatures (a cheering boss, critters) step out of the picture
      const xray0=!!(H&&H.setXray);if(xray0)try{H.setXray(false);}catch(e){}
      const hidden=[];try{const list=G.enemies||[];for(const e of list){const r=e&&e.m&&e.m.root;if(r&&Math.hypot(e.x-O.x,e.z-O.z)<10){hidden.push(r);if(e.aura)hidden.push(e.aura);if(e.tag)hidden.push(e.tag);}}}catch(e){}
      const hideAll=()=>{for(const r of hidden)r.visible=false;};hideAll();
      const fst=K.A.feza.st;Object.assign(fst,{kpHide:true,move:0,idleT:0,attack:-1,cast:-1});
      if(H)H.kamp=fst;
      let bUpd=null;if(B&&typeof B.update==='function'){bUpd=B.update;B.update=function(){};}
      const fov0=camera.fov,cam=new THREE.Vector3(),look=new THREE.Vector3();
      let last=performance.now(),lightSave=null;
      const L=sc.borrowLight&&typeof LIGHTS!=='undefined'&&LIGHTS.torches&&LIGHTS.torches.length?LIGHTS.torches[LIGHTS.torches.length-1]:null;
      // Auto framing: the shot gives a direction (yaw, pitch), fov and who must be seen; the camera backs off until every
      // face (head top to chest) fits inside the letterboxed picture, then glides there. Nobody's face is ever cut off.
      const dadHead=dad&&dad.bones?dad.bones.find(b=>b.name==='father head'):null,fhead=H&&H.bones?H.bones.head:null;
      const _p=new THREE.Vector3(),_f=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3(),_c=new THREE.Vector3(),UPV=new THREE.Vector3(0,1,0),pts=[];
      K.cp=new THREE.Vector3();K.cl=new THREE.Vector3();K.camSnap=true;
      function addPt(x,y,z){const v=pts[pts.n]||(pts[pts.n]=new THREE.Vector3());v.set(x,y,z);pts.n++;}
      function frame(c,fov,dt){
        pts.n=0;const who=c.who||['feza','dad','dog'],A=K.A,bs=K.bs;
        for(const w of who){
          if(w==='feza'&&H){if(fhead){fhead.getWorldPosition(_p);addPt(_p.x,_p.y+.30*bs,_p.z);addPt(_p.x,_p.y-.42*bs,_p.z);}else{addPt(O.x+A.feza.x,O.y+A.feza.y+1.15*bs,O.z+A.feza.z);addPt(O.x+A.feza.x,O.y+A.feza.y+.4*bs,O.z+A.feza.z);}}
          else if(w==='dad'&&dad){if(dadHead){dadHead.getWorldPosition(_p);addPt(_p.x,_p.y+.36,_p.z);addPt(_p.x,_p.y-.62,_p.z);}}
          else if(w==='dog'&&B){B.root.getWorldPosition(_p);const f=B.root.rotation.y;addPt(_p.x+Math.sin(f)*.35,_p.y+.9,_p.z+Math.cos(f)*.35);addPt(_p.x,_p.y+.25,_p.z);}
          else if(w==='bird'&&bird){bird.root.getWorldPosition(_p);addPt(_p.x,_p.y+.35,_p.z);addPt(_p.x,_p.y-.3,_p.z);}
        }
        if(c.pts)for(const q of c.pts)addPt(O.x+q[0],O.y+q[1],O.z+q[2]);
        if(!pts.n)addPt(O.x,O.y+1,O.z);
        const yaw=c.yaw||0,pitch=c.pitch===undefined?.2:c.pitch;
        _f.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();_r.crossVectors(_f,UPV).normalize();_u.crossVectors(_r,_f);
        let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
        for(let i=0;i<pts.n;i++){const v=pts[i],x=v.dot(_r),y=v.dot(_u),z=v.dot(_f);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);z0=Math.min(z0,z);z1=Math.max(z1,z);}
        const cx=(x0+x1)/2,cy=(y0+y1)/2+(c.lift||0),cz=(z0+z1)/2;_c.set(0,0,0).addScaledVector(_r,cx).addScaledVector(_u,cy).addScaledVector(_f,cz);
        const tv=Math.tan(fov*Math.PI/360)*.74*(c.pad||1),th=Math.tan(fov*Math.PI/360)*camera.aspect*.84*(c.pad||1);let dist=c.min||2.4;
        for(let i=0;i<pts.n;i++){const v=pts[i],x=v.dot(_r)-cx,y=v.dot(_u)-cy,z=v.dot(_f)-cz;dist=Math.max(dist,Math.abs(x)/th-z,Math.abs(y)/tv-z);}
        dist*=c.far||1;
        const tx=_c.x-_f.x*dist,ty=_c.y-_f.y*dist,tz=_c.z-_f.z*dist;
        if(K.camSnap){K.cp.set(tx,ty,tz);K.cl.copy(_c);K.camSnap=false;}
        else{const k=1-Math.exp(-(c.k||2.6)*dt);K.cp.x+=(tx-K.cp.x)*k;K.cp.y+=(ty-K.cp.y)*k;K.cp.z+=(tz-K.cp.z)*k;K.cl.x+=(_c.x-K.cl.x)*k;K.cl.y+=(_c.y-K.cl.y)*k;K.cl.z+=(_c.z-K.cl.z)*k;}
      }
      // shot list → current shot (yaw/pitch/fov ease between keys; who/pts come from the active key)
      function drive(){
        const now=performance.now();let dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;dt*=K.speed;K.t+=dt;const t=K.t,A=K.A;
        while(K.ev<K.events.length&&K.events[K.ev][0]<=t){try{K.events[K.ev][1]();}catch(e){console.warn('[KAMP] olay',e);}K.ev++;}
        try{sc.tick(t,dt);}catch(e){console.warn('[KAMP] tick',e);}
        if(H){H.root.position.set(O.x+A.feza.x,O.y+A.feza.y,O.z+A.feza.z);H.root.rotation.y=A.feza.face;fst.kpT=t;H.update(dt,fst);}
        if(B)B.root.visible=!A.dog.hide;if(dad)dad.root.visible=!A.dad.hide;
        if(B&&bUpd){const d=A.dog.st;B.root.position.set(O.x+A.dog.x,O.y+A.dog.y,O.z+A.dog.z);B.root.rotation.y=A.dog.face;
          bUpd.call(B,dt,{speed:d.speed||0,bark:Math.max(0,d.bark||0),sit:!!d.sit,pounce:d.pounce||0});d.bark=Math.max(0,(d.bark||0)-dt);if(d.pounce&&d.pounce>0&&d.pounce<=1&&!d.keepPounce)d.pounce=Math.max(0,d.pounce-dt*1.5);}
        if(dad){const r=dad.root;if(r.parent===stage)r.position.set(A.dad.x,A.dad.y,A.dad.z);else r.position.set(O.x+A.dad.x,O.y+A.dad.y,O.z+A.dad.z);r.rotation.y=A.dad.face;dad.update(dt,Object.assign({speed:0,attack:0,poseT:t},A.dad.st));}
        if(bird){const r=bird.root;if(r.parent===stage)r.position.set(A.bird.x,A.bird.y,A.bird.z);else r.position.set(O.x+A.bird.x,O.y+A.bird.y,O.z+A.bird.z);r.rotation.y=A.bird.face;bird.update(dt,A.bird.st);}
        const c=sc.cam(t);let fov=40;
        if(Array.isArray(c)){cam.set(O.x+c[1][0],O.y+c[1][1],O.z+c[1][2]);look.set(O.x+c[2][0],O.y+c[2][1],O.z+c[2][2]);fov=c[3]||40;K.camSnap=true;}
        else{fov=c.fov||40;frame(c,fov,dt);cam.copy(K.cp);look.copy(K.cl);}
        camera.position.copy(cam);camera.lookAt(look);if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}camera.updateMatrixWorld();
        if(t>=sc.dur&&!K.ended)finish(false);
      }
      const rf0=window.renderFrame;
      const rf=function(){if(KS===K){try{drive();}catch(e){console.warn('[KAMP] drive',e);}
          mood(true);hideAll();
          if(L){lightSave={p:L.position.clone(),c:L.color.clone(),i:L.intensity,d:L.distance,k:L.decay};const b=sc.borrowLight;L.position.set(O.x+b.x,O.y+b.y,O.z+b.z);L.color.set(b.color);L.intensity=K.light?K.light.intensity:b.intensity;L.distance=b.distance;L.decay=b.decay;}}
        try{return rf0.apply(this,arguments);}finally{if(lightSave){L.position.copy(lightSave.p);L.color.copy(lightSave.c);L.intensity=lightSave.i;L.distance=lightSave.d;L.decay=lightSave.k;lightSave=null;}}};
      if(L)K.light={intensity:sc.borrowLight.intensity};
      // mood lighting (sunset by the pond, night by the fire, dusk on the swamp): set while drawing, restored afterwards
      const LT=sc.light&&typeof LIGHTS!=='undefined'?sc.light:null,lt0=LT?{sc:LIGHTS.sun.color.clone(),si:LIGHTS.sun.intensity,hs:LIGHTS.hemi.color.clone(),hg:LIGHTS.hemi.groundColor.clone(),hi:LIGHTS.hemi.intensity,
        bg:scene.background&&scene.background.isColor?scene.background.clone():null,fog:scene.fog?scene.fog.color.clone():null}:null;
      const ltc={sun:new THREE.Color(),hs:new THREE.Color(),hg:new THREE.Color(),bg:new THREE.Color()};
      if(LT){ltc.sun.set(LT.sun);ltc.hs.set(LT.hemiSky);ltc.hg.set(LT.hemiGround);ltc.bg.set(LT.bg);}
      function mood(on){if(!LT)return;const w=on?ease(sat(K.t/.8))*(K.ended?0:1):0;
        LIGHTS.sun.color.copy(lt0.sc).lerp(ltc.sun,w);LIGHTS.sun.intensity=lerp(lt0.si,LT.sunI,w);LIGHTS.hemi.color.copy(lt0.hs).lerp(ltc.hs,w);LIGHTS.hemi.groundColor.copy(lt0.hg).lerp(ltc.hg,w);LIGHTS.hemi.intensity=lerp(lt0.hi,LT.hemiI,w);
        if(lt0.bg&&scene.background&&scene.background.isColor)scene.background.copy(lt0.bg).lerp(ltc.bg,w);if(lt0.fog&&scene.fog)scene.fog.color.copy(lt0.fog).lerp(ltc.bg,w*.7);}
      if(typeof rf0==='function')window.renderFrame=rf;
      const key=e=>{if(KS!==K)return;if(e.key===' '||e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();tap();}};
      window.addEventListener('keydown',key,true);
      function tap(){if(K.ended)return;if(K.speed===1){K.speed=3;ov.classList.add('fast');}else finish(false);}
      const ov=overlay(tap);
      function cleanup(){
        if(window.renderFrame===rf)window.renderFrame=rf0;window.removeEventListener('keydown',key,true);
        if(H&&H.kamp===fst)H.kamp=null;if(B&&bUpd)B.update=bUpd;
        if(B)B.root.visible=true;if(dad)dad.root.visible=true;try{if(sc.done)sc.done();}catch(e){}
        if(Math.abs(camera.fov-fov0)>.001){camera.fov=fov0;camera.updateProjectionMatrix();}
        if(LT)mood(false);
        if(xray0)try{H.setXray(true);}catch(e){}
        for(const r of hidden)r.visible=true;   // (the game re-hides far ones next frame)
        if(dad&&dad.setGear&&gear0)dad.setGear(gear0);
        if(temp){temp.father.dispose();temp.eagle.dispose();}
        if(stage.parent)stage.parent.remove(stage);K.kit.dispose();
        if(party){try{party.reset();}catch(e){}}
        if(po){try{if(po.obj)po.obj.visible=poWas.vis;if(po.setActive&&poWas.act)po.setActive(true);}catch(e){}}
        document.body.classList.remove('kamp-ani-on');
        if(KS===K)KS=null;
        try{if(G.emit)G.emit('kampAni',{zone:zoneId,phase:'end'});}catch(e){}
      }
      function finish(now){if(K.ended)return;K.ended=true;
        if(now){cleanup();ov.remove();done();return;}
        ov.classList.add('out');ov.classList.remove('on');
        setTimeout(()=>{cleanup();done();ov.classList.remove('out');setTimeout(()=>ov.remove(),450);},380);}
      K.finish=finish;KS=K;
      try{if(G.emit)G.emit('kampAni',{zone:zoneId,phase:'start'});}catch(e){}
      drive();   // first pose right away (no frame of the old view)
      return {skip:()=>finish(false),fast:()=>tap(),get t(){return K.t;},get dur(){return sc.dur;},get zone(){return zoneId;}};
    }catch(e){console.error('[KAMP] kampAni',e);try{if(K.finish)K.finish(true);}catch(e2){}KS=null;setTimeout(done,0);return false;}
  }
  function kartalUcus(to,bitince){return kampAni('ucus',bitince,{to});}
  return {create,applyBilbo,kampAni,kampAktif,kartalUcus,SAHNELER:Object.keys(SCENES)};
})();
