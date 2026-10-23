/* Automatic forest companions and Bilbo’s ten buried balls. No input buttons, timers or extra lights. */
'use strict';
const FOREST_PARTY = (() => {
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
      const pos=[],colors=[],idx=[],segments=32,radii=[0,.42,.78,1],dark=new THREE.Color(0x73543c),light=new THREE.Color(0xb18d61);
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
    function update(dt){if(disposed)return null;dt=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));const h=hero();if(!h)return null;if(h.dead){cancelDig();target=null;dadAttack=birdAttack=null;father.update(dt,{});eagle.update(dt,{});return null;}
      if(dt===0){place();return active?directive:null;}time+=dt;if(time>=nextPick){nextPick=time+.24;target=pickTarget();}if(target&&!visibleEnemy(target))target=null;updateDad(dt);updateBird(dt);const result=updateBalls(dt);place();return result;
    }
    function snapshot(){return {v:1,balls:balls.map(b=>({id:b.id,state:b.state,dig:b.dig})),collected:count()};}
    function restore(data){cancelDig();if(!data||data.v!==1||!Array.isArray(data.balls))return;const byId=new Map(data.balls.filter(b=>b&&typeof b.id==='string').map(b=>[b.id,b]));for(const b of balls){const saved=byId.get(b.id);const state=saved&&saved.state;if(state==='collected'||state==='exposed'){b.state=state;b.dig=0;b.exposeAt=time-1.3;b.obj.visible=state==='exposed';b.obj.scale.setScalar(1);b.obj.position.y=.35;digVisual(b,1);}else{b.state='hidden';b.dig=0;b.obj.visible=false;digVisual(b,0);}}emit('forestBall',{have:count(),need:10,restored:true});}
    function dispose(){if(disposed)return;disposed=true;cancelDig();father.dispose();eagle.dispose();if(group.parent)group.parent.remove(group);ballGeo.dispose();soilGeo.dispose();stripeGeo.dispose();soilMat.dispose();stripeMat.dispose();ballMaterials.forEach(m=>m.dispose());}
    reset();return {group,father,eagle,balls,update,reset,cancelDig,snapshot,restore,dispose,collected:count,activeBall:()=>active&&active.id,debug:()=>({time,dad:{...dad},bird:{...bird},dadAttack:!!dadAttack,birdAttack:!!birdAttack,draws:father.meshes.length+eagle.meshes.length})};
  }
  function applyBilbo(model,dt,d){if(!model||!d)return;model.root.position.set(d.x,0,d.z);model.root.rotation.y=d.face;model.update(dt,{speed:d.speed,bark:d.bark,sit:false,dig:d.dig,digTime:d.time});}
  return {create,applyBilbo};
})();
