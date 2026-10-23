/* Forest companions: sculpted, articulated friendly models, batched into rigid skinned surfaces. */
'use strict';
const FOREST_PARTY_MODELS = (() => {
  const TAU2 = Math.PI * 2, sat = x => Math.max(0, Math.min(1, x));
  function builder(name) {
    const root = new THREE.Group(); root.name = name;
    const bones = [], parts = [], owned = [], materials = [];
    const sphere = new THREE.SphereGeometry(1, 28, 20), detail = new THREE.SphereGeometry(1, 16, 12);
    owned.push(sphere, detail);
    function material(roughness, metalness = 0) {
      const m = new THREE.MeshStandardMaterial({vertexColors:true, roughness, metalness}); materials.push(m); return m;
    }
    const soft = material(.79), cloth = material(.91), gloss = material(.23), trim = material(.42,.25);
    // Reuse the game's woven fabric detail; its shared texture stays owned by TEX.
    if(typeof TEX!=='undefined'&&TEX.fabric&&TEX.fabric.normalMap){cloth.normalMap=TEX.fabric.normalMap;cloth.normalScale=new THREE.Vector2(.16,.16);}
    function joint(parent,name,x=0,y=0,z=0) { const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);parent.add(b);bones.push(b);return b; }
    function part(b,g,c,p=[0,0,0],s=[1,1,1],m=soft,r=[0,0,0]) {
      const item={b,g,c:new THREE.Color(c),m,transform:new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s))};parts.push(item);return item;
    }
    const ell=(b,c,p,s,m=soft,r)=>part(b,sphere,c,p,s,m,r);
    const dot=(b,c,p,s,m=gloss,r)=>part(b,detail,c,p,s,m,r);
    function tube(b,pts,r,c,m=soft) { const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),16,r,8,false);owned.push(g);part(b,g,c,undefined,undefined,m); }
    function capsule(b,c,p,rad,length,m=soft,r) { const g=new THREE.CapsuleGeometry(rad,length,8,20);owned.push(g);part(b,g,c,p,undefined,m,r); }
    function limb(b,c,sections,child,m=soft){
      const pos=[],uv=[],idx=[],rows=32,sides=24;
      for(let i=0;i<=rows;i++){const u=i/rows*(sections.length-1),n=Math.min(sections.length-2,Math.floor(u)),f=u-n,a=sections[n],d=sections[n+1],y=a[0]+(d[0]-a[0])*f,rx=a[1]+(d[1]-a[1])*f,rz=a[2]+(d[2]-a[2])*f;
        for(let j=0;j<=sides;j++){const v=j/sides*TAU2;pos.push(Math.cos(v)*rx,y,Math.sin(v)*rz);uv.push(j/sides,i/rows);if(i<rows&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();owned.push(g);const item=part(b,g,c,undefined,undefined,m);item.skin=y=>{let w=sat((-y+child.position.y+.11)/.22);w=w*w*(3-2*w);return {b:child,w};};
    }
    function custom(b,g,c,p,m){owned.push(g);part(b,g,c,p,undefined,m);}
    function feather(b,c,p,width,length,angle) {
      const pos=[],uv=[],idx=[],rows=16,sides=8;
      for(let i=0;i<=rows;i++){const u=i/rows,w=width*Math.pow(Math.max(0,Math.sin(Math.PI*(.08+.92*u))),.65);for(let j=0;j<=sides;j++){const a=j/sides*TAU2;pos.push(Math.cos(a)*w,Math.sin(a)*.015*Math.sin(Math.PI*u)+.040*u*u,-length*u);uv.push(j/sides,u);if(i<rows&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();owned.push(g);part(b,g,c,p,undefined,cloth,[0,angle,0]);
    }
    function finish() {
      root.updateMatrixWorld(true); const skeleton=new THREE.Skeleton(bones), meshes=[];
      const v=new THREE.Vector3(),n=new THREE.Vector3(),mat=new THREE.Matrix4(),nm=new THREE.Matrix3();
      for(const material of materials) {
        const list=parts.filter(p=>p.m===material);if(!list.length)continue;
        const positions=[],normals=[],colors=[],uvs=[],indices=[],skinI=[],skinW=[];let base=0;
        for(const p of list) {
          mat.multiplyMatrices(p.b.matrixWorld,p.transform);nm.getNormalMatrix(mat);const a=p.g.attributes, bi=bones.indexOf(p.b);
          for(let i=0;i<a.position.count;i++) {
            v.fromBufferAttribute(a.position,i).applyMatrix4(mat);n.fromBufferAttribute(a.normal,i).applyMatrix3(nm).normalize();
            positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);const shade=.93+.07*(n.y*.5+.5);
            colors.push(p.c.r*shade,p.c.g*shade,p.c.b*shade);uvs.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);const sw=p.skin?p.skin(a.position.getY(i)):null,w=sw?sat(sw.w):0;skinI.push(bi,sw?bones.indexOf(sw.b):0,0,0);skinW.push(1-w,w,0,0);
          }
          const index=p.g.index;for(let i=0;i<(index?index.count:a.position.count);i++)indices.push(base+(index?index.getX(i):i));base+=a.position.count;
        }
        const g=new THREE.BufferGeometry();for(const [key,data,size]of[['position',positions,3],['normal',normals,3],['color',colors,3],['uv',uvs,2],['skinWeight',skinW,4]])g.setAttribute(key,new THREE.Float32BufferAttribute(data,size));
        g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinI,4));g.setIndex(indices);g.computeBoundingSphere();
        const mesh=new THREE.SkinnedMesh(g,material);mesh.name=name+' surface';mesh.castShadow=material!==gloss;mesh.receiveShadow=false;mesh.frustumCulled=false;root.add(mesh);mesh.bind(skeleton);meshes.push(mesh);
      }
      owned.forEach(g=>g.dispose());
      return {root,bones,meshes,dispose(){if(root.parent)root.parent.remove(root);meshes.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());skeleton.dispose();}};
    }
    return {root,joint,ell,dot,tube,capsule,limb,custom,feather,soft,cloth,gloss,trim,finish};
  }
  function father() {
    const b=builder('Feza’s father'),{root,joint,ell,dot,tube,capsule,limb,cloth,soft,trim}=b;
    const SKIN=0xdec0a1,JACKET=0x644735,DARK=0x3e332b,PANTS=0x514637,HAIR=0x393b39,BEARD=0x393b39;
    const hips=joint(root,'father hips',0,.98,0),waist=joint(hips,'father waist',0,.15,0),chest=joint(waist,'father chest',0,.25,0),head=joint(chest,'father head',0,.74,0);
    // A tapered torso gives him a broad chest and shoulders without a rounded belly.
    const torsoSections=[[-.36,.265,.175],[-.24,.29,.18],[-.10,.34,.20],[.06,.43,.245],[.23,.48,.255],[.36,.45,.225],[.47,.32,.18],[.56,.135,.13]];
    const torsoPos=[],torsoIdx=[],torsoUV=[],torsoSides=32,torsoRows=32;
    for(let row=0;row<=torsoRows;row++){
      const u=row/torsoRows*(torsoSections.length-1),k=Math.min(torsoSections.length-2,Math.floor(u)),f=u-k,A=torsoSections[k],B=torsoSections[k+1];
      const y=A[0]+(B[0]-A[0])*f,rx=A[1]+(B[1]-A[1])*f,rz=A[2]+(B[2]-A[2])*f;
      for(let j=0;j<=torsoSides;j++){const a=j/torsoSides*TAU2,x=Math.cos(a)*rx,front=Math.max(0,Math.sin(a));
        const pec=.055*Math.exp(-Math.pow((Math.abs(x)-.20)/.14,2)-Math.pow((y-.19)/.12,2));
        const abdomen=.018*Math.exp(-Math.pow(x/.17,2)-Math.pow((y+.10)/.17,2));
        torsoPos.push(x,y,Math.sin(a)*rz+(pec+abdomen)*front*front);torsoUV.push(j/torsoSides,row/torsoRows);
        if(row&&j<torsoSides){const n=row*(torsoSides+1)+j,q=n-torsoSides-1;torsoIdx.push(q,n,q+1,q+1,n,n+1);}}
    }
    const torso=new THREE.BufferGeometry();torso.setAttribute('position',new THREE.Float32BufferAttribute(torsoPos,3));torso.setAttribute('uv',new THREE.Float32BufferAttribute(torsoUV,2));torso.setIndex(torsoIdx);torso.computeVertexNormals();b.custom(chest,torso,SKIN);
    // Bare chest and fitted hide armour: an adult guardian silhouette, still soft and friendly.
    ell(hips,PANTS,[0,.03,0],[.285,.17,.20],cloth);
    // The baldric follows the sculpted chest surface, including the narrower waist.
    // A flat ribbon would float away from the shoulder and expose a triangular gap in motion.
    function chestSurface(x,y,front=true){let i=0;while(i<torsoSections.length-2&&y>torsoSections[i+1][0])i++;
      const A=torsoSections[i],B=torsoSections[i+1],f=sat((y-A[0])/(B[0]-A[0])),rx=A[1]+(B[1]-A[1])*f,rz=A[2]+(B[2]-A[2])*f,k=Math.sqrt(Math.max(0,1-x*x/(rx*rx)));
      const pec=.055*Math.exp(-Math.pow((Math.abs(x)-.20)/.14,2)-Math.pow((y-.19)/.12,2)),abdomen=.018*Math.exp(-Math.pow(x/.17,2)-Math.pow((y+.10)/.17,2));
      return front?rz*k+(pec+abdomen)*k*k+.016:-rz*k-.014;
    }
    const sashPos=[],sashUV=[],sashIdx=[];
    for(let i=0;i<=12;i++){const t=i/12,x=-.29+.495*t,y=.395-.675*t;for(const side of[-1,1]){const px=x+side*.050,py=y+side*.036;sashPos.push(px,py,chestSurface(px,py));sashUV.push(side<0?0:1,t);}if(i<12){const k=i*2;sashIdx.push(k,k+2,k+1,k+1,k+2,k+3);}}
    const sash=new THREE.BufferGeometry();sash.setAttribute('position',new THREE.Float32BufferAttribute(sashPos,3));sash.setAttribute('uv',new THREE.Float32BufferAttribute(sashUV,2));sash.setIndex(sashIdx);sash.computeVertexNormals();b.custom(chest,sash,JACKET);
    for(const side of[-1,1]){const edge=[];for(let i=0;i<7;i++){const t=i/6,x=-.29+.495*t+side*.050,y=.395-.675*t+side*.036;edge.push([x,y,chestSurface(x,y)+.003]);}tube(chest,edge,.007,0xb29977,cloth);}
    ell(chest,0x9eaa9e,[-.10,.13,.316],[.070,.065,.012],trim,[0,0,-.65]);ell(chest,JACKET,[-.10,.13,.331],[.044,.039,.009],cloth,[0,0,-.65]);
    // A broad leather belt and overlapping skirt panels replace the rounded trouser waistband.
    ell(hips,JACKET,[0,.03,0],[.305,.095,.215],cloth);ell(hips,0xafb3a1,[0,.03,.222],[.073,.057,.018],trim);ell(hips,0x5a4834,[0,.03,.243],[.044,.031,.012],cloth);
    for(let i=0;i<7;i++){
      const a=(i-3)*.40,x=Math.sin(a)*.245,z=Math.cos(a)*.20;
      const panel=new THREE.Shape();panel.moveTo(-.071,.05);panel.lineTo(.071,.05);panel.lineTo(.082,-.24);panel.lineTo(.025,-.32-(i%2)*.025);panel.lineTo(-.080,-.26);panel.closePath();
      const g=new THREE.ExtrudeGeometry(panel,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.005,bevelThickness:.004});g.rotateY(a);b.custom(hips,g,i%2?0x71513a:0x574333,[x,-.035,z],cloth);
      dot(hips,0xb8ad8d,[x,-.037,z+.025],[.014,.014,.009],trim);
    }
    // Narrow back harness carries the axe without an inflated backpack.
    for(const side of[-1,1]){const edge=[[side*.31,.43],[side*.12,.09],[side*.20,-.28]].map(p=>[p[0],p[1],chestSurface(p[0],p[1],false)]);tube(chest,edge,.028,JACKET,cloth);}
    ell(hips,0x6b4c36,[-.29,-.04,.03],[.070,.095,.075],cloth);
    // Head: a clean bald scalp, warm eyes and a mixed salt-and-pepper beard.
    ell(head,SKIN,[0,.02,0],[.259,.327,.241]);ell(head,SKIN,[0,-.18,.038],[.252,.165,.222]);
    for(const side of[-1,1]) {
      ell(head,SKIN,[side*.252,.00,.012],[.067,.115,.048]);ell(head,0xca8c75,[side*.283,.006,.04],[.018,.065,.013]);
      ell(head,0xf9e9d0,[side*.11,.079,.236],[.061,.043,.024]);dot(head,0x76663a,[side*.107,.074,.261],[.027,.031,.011]);dot(head,0x272d25,[side*.106,.074,.271],[.017,.025,.008]);dot(head,0xffffff,[side*.114,.086,.280],[.008,.010,.004]);
      tube(head,[[side*.044,.147,.23],[side*.106,.163,.237],[side*.173,.146,.208]],.015,HAIR);
    }
    ell(head,SKIN,[0,-.004,.249],[.072,.094,.089]);ell(head,0xeec3a0,[0,-.035,.308],[.07,.042,.053]);
    // Beard contour follows the cheeks and jaw instead of a large sphere on the back.
    ell(head,BEARD,[0,-.245,.119],[.229,.193,.164]);
    // Fine overlapping locks mix dark and silver across one continuous beard volume.
    const beardShades=[0x414541,0x8c968c,0xc0c6bc,0x596159,0xa8b1a7,0x3c423d,0xd1d5cc];
    for(let row=0;row<3;row++)for(let i=0;i<13-row;i++){
      const u=(i/(12-row)-.5)*2.05,x=Math.sin(u)*(.213-row*.019),z=Math.cos(u)*(.184-row*.010)+.126,y=-.15-row*.065;
      const color=beardShades[(i*5+row*3)%beardShades.length];
      dot(head,color,[x,y,z],[.020,.059,.012],soft,[.13,0,u*.24]);
      tube(head,[[x-.006,y+.025,z+.014],[x,y-.007,z+.019],[x*.96+.006,y-.043,z+.013]],.0028,beardShades[(i*3+row*2+1)%beardShades.length]);
    }
    ell(head,HAIR,[-.063,-.122,.268],[.074,.034,.024],soft,[0,0,-.12]);ell(head,HAIR,[.063,-.122,.268],[.074,.034,.024],soft,[0,0,.12]);
    tube(head,[[-.080,-.15,.270],[0,-.167,.290],[.080,-.15,.270]],.009,0xa97658);
    const legs=[],arms=[];
    for(const side of[-1,1]) {
      const thigh=joint(hips,'father thigh '+side,side*.19,-.14,0),shin=joint(thigh,'father shin '+side,0,-.40,0),foot=joint(shin,'father boot '+side,0,-.34,.01);
      limb(thigh,PANTS,[[.09,.09,.10],[-.06,.16,.155],[-.27,.14,.14],[-.40,.115,.115],[-.53,.105,.105],[-.72,.086,.086]],shin,cloth);ell(foot,0x4c3d2e,[0,-.027,.087],[.135,.095,.223],cloth);ell(foot,0x2f322b,[0,-.079,.087],[.14,.030,.23],cloth);
      for(let i=0;i<3;i++)tube(foot,[[-.075,.025,.065+i*.04],[0,.032,.082+i*.04],[.075,.025,.065+i*.04]],.009,0xb5a385,cloth);
      legs.push({side,thigh,shin,foot});
      const clavicle=joint(chest,'father clavicle '+side,side*.28,.29,0),upper=joint(clavicle,'father upper arm '+side,side*.21,.01,0),fore=joint(upper,'father forearm '+side,side*.028,-.33,0),hand=joint(fore,'father hand '+side,0,-.28,0);
      dot(upper,SKIN,[0,-.025,0],[.202,.168,.174],soft);
      limb(upper,SKIN,[[.10,.070,.075],[-.045,.205,.18],[-.20,.183,.156],[-.33,.13,.12],[-.45,.123,.11],[-.61,.089,.085]],fore);capsule(fore,JACKET,[0,-.145,0],.107,.085,cloth);
      for(let i=0;i<3;i++)ell(fore,i===1?0xa4a592:0x987958,[0,-.07-i*.064,.002],[.112,.011,.107],i===1?trim:cloth);
      // One fur-lined shoulder mantle creates a distinctive asymmetrical silhouette.
      if(side<0){ell(clavicle,0x68523c,[-.185,.005,-.015],[.228,.123,.22],cloth);
        for(let i=0;i<13;i++){const a=i/12*Math.PI,x=-.185+Math.cos(a)*.195,z=Math.sin(a)*.208;
          dot(clavicle,i%3?0xb5a68b:0xddd0b3,[x,-.025-(i%2)*.008,z],[.026,.053+(i%3)*.006,.022],cloth,[0,0,Math.cos(a)*.22]);}
        tube(clavicle,[[-.36,.027,.09],[-.185,.061,.195],[-.01,.027,.09]],.013,0xc8b99c,cloth);
      }
      ell(hand,SKIN,[0,-.07,.022],[.098,.109,.054]);ell(hand,SKIN,[side*-.073,-.056,.049],[.037,.060,.036],soft,[.14,0,side*.35]);
      for(let i=0;i<4;i++){capsule(hand,SKIN,[(i-1.5)*.033,-.128,.028],.020,.065,soft,[side===1?-.70:.18,0,0]);ell(hand,0xe8c6a7,[(i-1.5)*.033,-.16,side===1?.064:.046],[.011,.018,.004],soft,[side===1?-.70:.18,0,0]);}
      arms.push({side,clavicle,upper,fore,hand});
      if(side===1) {
        tube(hand,[[0,-.40,.061],[0,-.11,.06],[.035,.20,.052],[.075,.56,.045],[.091,.83,.041]],.035,0xa77543,cloth);
        for(let i=0;i<6;i++)ell(hand,0x624b34,[.008,-.19+i*.034,.060],[.040,.009,.040],cloth);
        ell(hand,0xc6ac70,[.088,.66,.041],[.052,.061,.050],trim);
        const sh=new THREE.Shape(),points=[[-.045,.67],[-.16,.81],[-.36,.91],[-.47,.87],[-.51,.68],[-.46,.55],[-.29,.53],[-.14,.61],[.035,.60],[.055,.77]];
        sh.moveTo(-points[0][0],points[0][1]);points.slice(1).forEach(v=>sh.lineTo(-v[0],v[1]));sh.closePath();const blade=new THREE.ExtrudeGeometry(sh,{depth:.070,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.016});
        b.custom(hand,blade,0xa6c1bc,[.09,0,.086],trim);
        tube(hand,[[.48,.86,.179],[.54,.75,.179],[.52,.60,.179]],.009,0xe1e7d8,trim);
        tube(hand,[[.35,.74,.179],[.42,.69,.181],[.36,.64,.179]],.012,0x5b998f,trim);
        ell(hand,0xb9d2c7,[.08,.84,.048],[.043,.046,.045],trim);
      }
    }
    const out=b.finish();let time=0,stride=0,walkBlend=0;
    // Continuous Hermite curves carry momentum through the contact pose: no held keyframes.
    // Impact is at .20/.56 seconds; the blade reaches its forward/downward sweep there.
    const keys=[0,.18,.20/.56,.67,1],motion=[[0,-1.00,-.56,-.16,0],[0,-.10,-.30,-.12,0],[0,-.10,.16,.04,0],[0,.03,-.12,-.05,0],[0,.23,-.22,-.07,0],[0,-.08,-.32,-.10,0],[-.18,-1.22,-.22,-.12,-.18],[-.18,-.32,-.64,-.34,-.18],[0,.06,-.08,-.025,0],[0,-.025,.045,.015,0],[0,-.16,-.34,-.15,0],[0,.07,-.12,-.035,0],[0,1,0,.10,0],[0,.12,1,.42,0],[0,.42,-.58,-.23,0],[0,-.055,.105,.045,0],[0,-.018,.036,.016,0],[0,-.012,-.030,-.014,0],[0,-.032,.078,.035,0],[0,.09,-.13,-.06,0],[0,.015,-.025,-.01,0],[0,-.025,.03,.012,0],[0,-.025,.04,.014,0],[0,.015,-.035,-.014,0],[0,-.065,.045,.022,0],[0,.018,-.035,-.016,0],[0,-.10,.14,.05,0],[0,.025,-.07,-.025,0],[0,.045,-.025,-.010,0],[0,-.28,1.25,.65,0],[0,.10,-.16,-.07,0],[0,-.08,.10,.04,0]];
    function pose(a,values){let i=0;while(i<keys.length-2&&a>keys[i+1])i++;const span=keys[i+1]-keys[i],u=sat((a-keys[i])/span),u2=u*u,u3=u2*u;
      const m0=i===0?0:(values[i+1]-values[i-1])/(keys[i+1]-keys[i-1]),m1=i+1===keys.length-1?0:(values[i+2]-values[i])/(keys[i+2]-keys[i]);
      return (2*u3-3*u2+1)*values[i]+(u3-2*u2+u)*m0*span+(-2*u3+3*u2)*values[i+1]+(u3-u2)*m1*span;
    }
    const easy=x=>{x=sat(x);return x*x*(3-2*x);};
    out.update=(dt,state={})=>{
      dt=Math.max(0,Math.min(.1,dt));time+=dt;const speed=Math.max(0,state.speed||0);walkBlend+=(sat(speed/4.4)-walkBlend)*(1-Math.exp(-10*dt));const a=sat(state.attack||0),weight=easy(a/.09)*easy((1-a)/.16),run=walkBlend*(1-weight);stride+=speed*dt*3.1;
      const coil=pose(a,motion[12]),contact=pose(a,motion[13]),yaw=pose(a,motion[14]),lean=pose(a,motion[15]);
      hips.position.set(pose(a,motion[16]),.98+.023*run*Math.cos(stride*2)+pose(a,motion[17]),pose(a,motion[18]));
      hips.rotation.set(0,-.04*run*Math.sin(stride)+pose(a,motion[19]),pose(a,motion[20]));
      waist.rotation.set(lean*.48,yaw*.26,pose(a,motion[21]));
      chest.rotation.set(.013*Math.sin(time*1.7)*(1-weight)+lean*.52,yaw*.74,.023*run*Math.sin(stride)+pose(a,motion[22]));
      head.rotation.set(.018*Math.sin(time*1.1)*(1-weight)-lean*.35,-yaw*.55,pose(a,motion[23]));
      // Weight transfers between planted feet; two-link knee bending keeps boots on the ground.
      const targetY=-.74-(hips.position.y-.98),targetZ=-hips.position.z,reach=Math.min(.7398,Math.hypot(targetY,targetZ)),knee=Math.acos(Math.max(-1,Math.min(1,(reach*reach-.40*.40-.34*.34)/(2*.40*.34))));
      const stance=Math.atan2(-targetZ,-targetY)-Math.atan2(.34*Math.sin(knee),.40+.34*Math.cos(knee));
      for(const leg of legs){const q=stride+(leg.side>0?Math.PI:0);leg.thigh.rotation.set(.46*run*Math.sin(q)+stance*weight,0,leg.side*.018*contact);leg.shin.rotation.x=.56*run*Math.max(0,-Math.cos(q))+knee*weight;leg.foot.rotation.x=-(leg.thigh.rotation.x+leg.shin.rotation.x)*weight+(-.22*leg.thigh.rotation.x-.42*leg.shin.rotation.x)*(1-weight);}
      for(const arm of arms){const right=arm.side>0,gait=-.36*run*Math.sin(stride+(right?0:Math.PI));
        arm.clavicle.rotation.set(right?pose(a,motion[24]):pose(a,motion[25]),right?pose(a,motion[26]):pose(a,motion[27]),arm.side*pose(a,motion[28]));
        arm.upper.rotation.set(gait+pose(a,right?motion[0]:motion[1]),pose(a,right?motion[2]:motion[3]),arm.side*.12+pose(a,right?motion[4]:motion[5]));
        arm.fore.rotation.set(pose(a,right?motion[6]:motion[7]),0,pose(a,right?motion[8]:motion[9]));
        // The wrist keeps the axe upright while lifting, then guides its head through the target.
        arm.hand.rotation.set(right?-(arm.upper.rotation.x+arm.fore.rotation.x+arm.clavicle.rotation.x+lean)+pose(a,motion[29]):pose(a,motion[30]),pose(a,right?motion[10]:motion[11]),right?pose(a,motion[31]):0);
      }
      root.updateMatrixWorld(true);
    };out.update(0);return out;
  }
  function eagle() {
    const b=builder('Friendly forest eagle'),{root,joint,ell,dot,tube,cloth,soft,gloss,feather}=b;
    const body=joint(root,'eagle body'),neck=joint(body,'eagle neck',0,.18,.24),head=joint(neck,'eagle head',0,.12,.13),tail=joint(body,'eagle tail',0,-.025,-.33);
    ell(body,0x79523c,[0,0,0],[.23,.27,.43]);ell(body,0xceac73,[0,-.09,.155],[.186,.17,.257]);
    for(let row=0;row<3;row++)for(let i=0;i<5;i++)ell(body,row%2?0xb59162:0xe0bf84,[(i-2)*.058,-.16+row*.069,.34-row*.046],[.053,.066,.027],cloth,[0,0,(i-2)*-.10]);
    ell(neck,0xf4e9d0,[0,.01,.055],[.195,.205,.185]);ell(head,0xfff5da,[0,0,.035],[.187,.176,.178]);
    for(const side of[-1,1]) {
      ell(head,0xe8d9b9,[side*.15,.02,.092],[.053,.077,.034]);dot(head,0x4b3823,[side*.151,.029,.123],[.032,.040,.019]);dot(head,0x191e1c,[side*.154,.030,.139],[.020,.026,.009]);dot(head,0xffffff,[side*.163,.043,.148],[.008,.010,.004]);
      tube(head,[[side*.10,.083,.124],[side*.15,.104,.105],[side*.19,.085,.066]],.011,0x836448);
    }
    ell(head,0xe9ac46,[0,-.047,.205],[.089,.072,.14]);ell(head,0xf1bf58,[0,-.099,.285],[.058,.077,.059],soft,[.42,0,0]);
    tube(head,[[-.046,-.071,.260],[0,-.074,.31],[.046,-.071,.260]],.005,0x885b2e);
    const wings=[],tailFeathers=[],talons=[];
    for(const side of[-1,1]) {
      const shoulder=joint(body,'eagle shoulder '+side,side*.16,.055,-.018),wrist=joint(shoulder,'eagle wrist '+side,side*.40,0,-.07);
      ell(shoulder,0x81573e,[side*.21,0,-.035],[.29,.052,.18],cloth,[0,side*.15,0]);ell(wrist,0x644433,[side*.20,0,-.063],[.29,.046,.165],cloth);
      for(let i=0;i<9;i++) {
        const u=i/8;feather(wrist,i%2?0x7f573e:0x5a4132,[side*(.10+.38*u),-.012,-.105],.052,.55-.15*u,side*(.12+.65*u));
        feather(shoulder,i%2?0xa47a50:0x976e49,[side*(.04+.39*u),.036,.025],.049,.24,side*.13);
      }
      for(let i=0;i<5;i++)feather(shoulder,0xb28a61,[side*(.03+i*.079),.061,.09],.047,.17,side*.12);

      wings.push({side,shoulder,wrist});
      const leg=joint(body,'eagle leg '+side,side*.12,-.21,-.035);talons.push(leg);ell(leg,0xbc995f,[0,-.055,.025],[.048,.10,.05]);
      for(let i=0;i<3;i++)tube(leg,[[0,-.12,.02],[(i-1)*.043,-.15,.06],[(i-1)*.05,-.145,.13],[(i-1)*.04,-.115,.15]],.012,0xd6a64b);
    }
    for(let i=0;i<7;i++){const f=joint(tail,'eagle tail feather '+i,(i-3)*.043,-.014,-.04);feather(f,i%2?0xd6c8a8:0x4f3b2e,[0,0,0],.048,.42,(i-3)*-.08);tailFeathers.push(f);}
    const out=b.finish();let time=0,wingPhase=0,diveBlend=0,flapSpeed=4.6,bankBlend=0,neckFollow=0;
    out.update=(dt,state={})=>{dt=Math.max(0,Math.min(.1,dt));time+=dt;const blend=1-Math.exp(-12*dt),previousDive=diveBlend;diveBlend+=(sat(state.dive||0)-diveBlend)*blend;flapSpeed+=((state.fast?8.6:4.6)-flapSpeed)*blend;wingPhase+=dt*flapSpeed;
      const dive=diveBlend,beat=Math.sin(wingPhase),flap=(beat*.28+.12)*(1-dive*.72),recovery=sat((previousDive-dive)*18),bankTarget=Math.max(-.16,Math.min(.16,state.bank||0));bankBlend+=(bankTarget-bankBlend)*(1-Math.exp(-7*dt));neckFollow+=(dive-neckFollow)*(1-Math.exp(-8*dt));
      body.rotation.set(-.17*dive+.024*Math.sin(time*2.1)+.028*beat*(1-dive),bankBlend*.20,bankBlend+.012*Math.sin(wingPhase-.35)*(1-dive));
      neck.rotation.set(-.13*neckFollow,.022*Math.sin(time*.9)*(1-dive),-bankBlend*.18);
      head.rotation.set(.51*dive-.075*recovery,.045*Math.sin(time*.8)*(1-dive)-bankBlend*.32,-bankBlend*.38);
      tail.rotation.set(.16*dive+.045*Math.sin(wingPhase-.85)*(1-dive)+.06*recovery,-bankBlend*.32,-bankBlend*.28);
      for(const wing of wings){const downstroke=Math.max(0,-Math.cos(wingPhase));wing.shoulder.rotation.set(.024*beat*(1-dive),wing.side*(.055*dive+.015*recovery),wing.side*(-flap+.38*dive)-bankBlend*.18);
        // Wrists lag the shoulder through the upstroke; primaries flex rather than flap as a plank.
        wing.wrist.rotation.set(.045*Math.sin(wingPhase-.55)*(1-dive),wing.side*(-.13*dive+.045*downstroke*(1-dive)),wing.side*((Math.sin(wingPhase-.38)*.28+.12)*.48*(1-dive*.72)+.19*dive));}
      for(let i=0;i<tailFeathers.length;i++){const f=tailFeathers[i],spread=.028+.075*(1-dive)+.028*recovery;f.rotation.set(.012*Math.sin(wingPhase-.5+i*.11)*(1-dive),(i-3)*spread,-bankBlend*.08);}
      for(let i=0;i<talons.length;i++){const t=talons[i];t.rotation.set(-.24+.76*dive-.06*recovery+.014*Math.sin(wingPhase+i*Math.PI)*(1-dive),0,(i===0?-1:1)*.020*(1-dive));}
      root.updateMatrixWorld(true);
    };out.update(0);return out;
  }
  return {father,eagle};
})();
