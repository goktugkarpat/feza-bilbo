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
    function limb(b,c,sections,child,m=soft,uvs){const su=uvs?uvs[0]:1,sv=uvs?uvs[1]:1;
      const pos=[],uv=[],idx=[],rows=32,sides=24;
      for(let i=0;i<=rows;i++){const u=i/rows*(sections.length-1),n=Math.min(sections.length-2,Math.floor(u)),f=u-n,a=sections[n],d=sections[n+1],y=a[0]+(d[0]-a[0])*f,rx=a[1]+(d[1]-a[1])*f,rz=a[2]+(d[2]-a[2])*f;
        for(let j=0;j<=sides;j++){const v=j/sides*TAU2;pos.push(Math.cos(v)*rx,y,Math.sin(v)*rz);uv.push(j/sides*su,i/rows*sv);if(i<rows&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}}
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
            const vc=a.color;colors.push((vc?vc.getX(i):1)*p.c.r*shade,(vc?vc.getY(i):1)*p.c.g*shade,(vc?vc.getZ(i):1)*p.c.b*shade);uvs.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);const sw=p.skin?p.skin(a.position.getY(i)):null,w=sw?sat(sw.w):0;skinI.push(bi,sw?bones.indexOf(sw.b):0,0,0);skinW.push(1-w,w,0,0);
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
    return {root,joint,ell,dot,tube,capsule,limb,custom,feather,part,material,sphere,soft,cloth,gloss,trim,finish};
  }
  // Red-green flannel check (one tile ≈ 13 cm) with a soft brushed twill grain; shared by every father instance.
  let PLAID=null;
  function plaidTexture(){
    if(PLAID)return PLAID;
    const N=256,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d');
    c.fillStyle='#b8362c';c.fillRect(0,0,N,N);
    const band=(x,w,col,a)=>{c.globalAlpha=a;c.fillStyle=col;c.fillRect(x,0,w,N);c.fillRect(0,x,N,w);};
    band(20,68,'#2c4a3a',.6);band(156,36,'#2c4a3a',.6);band(128,10,'#1d1c1b',.55);band(208,7,'#f0c860',.5);band(104,5,'#f3e2c4',.32);
    c.globalAlpha=1;const img=c.getImageData(0,0,N,N),D=img.data;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const o=(y*N+x)*4,tw=((x+y)&3)<2?1:0,k=.92+.05*tw+.035*Math.sin(x*.9+y*.3)*Math.sin(y*1.1)+.02*(Math.random()-.5);D[o]*=k;D[o+1]*=k;D[o+2]*=k;}
    c.putImageData(img,0,0);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return (PLAID=t);
  }
  // Father's skin shader: the face (eyes, brows, smile), the very short salt-and-pepper buzz cut and the beard strands are painted
  // per pixel from the head's (azimuth, elevation) carried in uv, so skin, face, ears, hands and beard stay ONE draw call.
  //   uv.x in [6.8, 13.2] = head skin (azimuth + 10) · uv.x in [16.8, 23.2] = beard shell (azimuth + 20, vColor.r = edge mask) · else plain skin
  const FZ_GLSL=`
    uniform float fzBlink; varying vec2 vFz;
    #define FZRGB(r,g,b) pow(vec3(r,g,b),vec3(2.2))
    float fzSq(float x){return x*x;}
    float fzH(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    float fzVN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(fzH(i),fzH(i+vec2(1.0,0.0)),f.x),mix(fzH(i+vec2(0.0,1.0)),fzH(i+vec2(1.0,1.0)),f.x),f.y);}
    float fzLine(float d,float w,float aa){return 1.0-smoothstep(w-aa,w+aa,d);}
    // short hair strands: cells stretched along dir; x = coverage, y = random per strand (fades to its mean when sub-pixel)
    vec2 fzStrand(vec2 q,vec2 dir,float nA,float nL,float px){
      vec2 p=vec2(dot(q,vec2(-dir.y,dir.x))*nA,dot(q,dir)*nL);float row=floor(p.y);p.x+=fzH(vec2(row,3.7))*7.0;
      vec2 c=vec2(floor(p.x),row),f=fract(p);float r=fzH(c),cx=.5+(fzH(c+11.3)-.5)*.5,hw=.2+.2*fzH(c+5.1);
      float tp=smoothstep(0.0,.3,f.y)*smoothstep(1.0,.55,f.y),w=px*nA;
      float cov=(1.0-smoothstep(hw-w,hw+w,abs(f.x-cx)))*tp;return vec2(mix(cov,.4,smoothstep(.3,.9,w)),r);
    }
    // Face layout (q = (azimuth·cos(elev)·0.78, elev) ≈ (x, y) / head radius; head height H = 2R): eyes on the middle line (y 0),
    // brows .17, nose bottom −.37, mouth −.6, beard tip −1. Hairline of the 1-3 mm buzz cut: forehead, temples, sideburn, ear, nape.
    float fzHL(float at){float hl=.62+.1*exp(-fzSq((at-.55)/.2));hl=mix(hl,.06,smoothstep(.8,1.35,at));hl=mix(hl,-.3,smoothstep(1.36,1.48,at));hl=mix(hl,.22,smoothstep(1.58,1.68,at));
      hl=mix(hl,-.62,smoothstep(1.72,1.98,at));return mix(hl,-1.3,smoothstep(2.1,2.6,at));}
    float fzHair(float th,float ph){float at=abs(th),hl=fzHL(at);
      float bk=smoothstep(1.8,2.6,at);return min(1.0,smoothstep(hl-.03-.06*bk,hl+.09+.12*bk,ph)*(.62+.36*smoothstep(.85,1.3,at)*(1.0-smoothstep(.9,1.3,ph))+.3*smoothstep(1.9,2.6,at)));}
    float fzGrey(vec2 q){float ax=abs(q.x);
      float g=.24+.1*smoothstep(-.3,-.6,q.y)*(1.0-smoothstep(.45,.7,ax))+.55*smoothstep(-.68,-.9,q.y)*(1.0-.9*smoothstep(.35,.62,ax))+.35*exp(-fzSq(q.x/.22)-fzSq((q.y+.88)/.16));
      g+=.12*smoothstep(.75,.95,ax)*smoothstep(.0,-.2,q.y);
      return clamp(g*(1.0-.75*exp(-fzSq(q.x/.24)-fzSq((q.y+.55)/.09))),0.0,.95);}
    void fzFace(inout vec3 col,inout float rough,inout float gloss,inout float hairK,inout vec3 emis,float th,float ph,float px){
      vec2 q=vec2(th*cos(ph)*.78,ph);float ax=abs(q.x),sx=q.x<0.0?-1.0:1.0,aa=px*.8;
      // buzz cut over the whole head: denser on the sides/back, a sparse dark shadow on the top; matte
      float hd=fzHair(th,ph);
      if(hd>.002){vec2 s=fzStrand(q,vec2(0.0,-1.0),250.0,64.0,px),s2=fzStrand(q+vec2(.021,.013),normalize(vec2(.35,-1.0)),205.0,52.0,px);
        float gH=.22+.18*smoothstep(.7,.95,ax)*smoothstep(.55,.1,ph);
        vec3 c1=s.y<gH?FZRGB(.46,.45,.43):FZRGB(.045,.04,.037),c2=s2.y<gH?FZRGB(.4,.39,.37):FZRGB(.06,.05,.045);
        col=mix(col,FZRGB(.1,.083,.072),hd*(.72+.2*smoothstep(1.1,1.5,abs(th))));col=mix(col,c1,s.x*hd*.9);col=mix(col,c2,s2.x*hd*.75);hairK=max(hairK,hd*.8);}
      rough=mix(rough,.8,smoothstep(.3,.7,ph));
      col=mix(col,FZRGB(.9,.56,.5),.16*exp(-fzSq((ax-.45)/.13)-fzSq((q.y+.25)/.11)));   // warm cheeks
      // eyebrows: dark, thick, straight, inner ends a touch lower
      float by=.17+.02*smoothstep(.08,.3,ax)-.012*smoothstep(.4,.52,ax),bw=mix(.036,.024,smoothstep(.1,.5,ax));
      float bIn=smoothstep(.07,.1,ax)*(1.0-smoothstep(.48,.53,ax)),dB=abs(q.y-by);
      vec2 sb=fzStrand(vec2(ax,q.y),normalize(vec2(1.0,.45-.6*smoothstep(.06,.25,ax))),270.0,26.0,px);
      float brow=max((1.0-smoothstep(bw-aa,bw+aa*1.5,dB))*(.9+.1*sb.x),(1.0-smoothstep(bw*.8,bw*1.5,dB))*sb.x)*bIn;
      col=mix(col,FZRGB(.06,.045,.036),brow);hairK=max(hairK,brow*.6);
      // eyes: big, dark brown, warm and calm (upper lid slightly heavy, lower lid lifted by the smile)
      vec2 ec=vec2(.28*sx,0.0),er=vec2(.14,.092);vec2 e=vec2((q.x-ec.x)*sx,q.y-ec.y)/er;float aE=aa/er.y;
      float xx=clamp(e.x,-1.0,1.0),cx=sqrt(max(0.0,1.0-xx*xx));
      float top=pow(cx,.58)*.86+.06*xx,bot=-pow(cx,.85)*.62+.12*xx+.12,lid=mix(top,bot+.03,fzBlink);
      float inX=1.0-smoothstep(1.0-aE*1.5,1.0+aE*1.5,abs(e.x)),vis=smoothstep(-aE,aE,lid-e.y)*smoothstep(-aE,aE,e.y-bot)*inX;
      col=mix(col,col*FZRGB(.84,.7,.66),.5*exp(-fzSq((e.y-top-.3)/.32))*exp(-fzSq(e.x/1.25)));
      col=mix(col,col*FZRGB(.72,.54,.5),.5*fzLine(abs(e.y-(top+.6+.04*xx)),.07,aE)*(1.0-smoothstep(.55,1.05,abs(e.x+.05))));
      col=mix(col,col*FZRGB(.84,.68,.64),.4*fzLine(abs(e.y-bot+.08),.07,aE)*smoothstep(1.05,.3,abs(e.x-.1)));
      vec2 ic=ec+vec2(-.004*sx,-.004),di=q-ic;float ir=.07,dr=length(di)/ir,aI=aa/ir;
      vec3 iris=mix(FZRGB(.13,.07,.035),FZRGB(.36,.21,.1),smoothstep(.3,-.95,di.y/ir));
      iris*=.86+.14*sin(atan(di.y,di.x)*15.0+dr*5.0);iris=mix(iris,FZRGB(.05,.03,.02),smoothstep(.72,.98,dr));
      iris=mix(iris,FZRGB(.02,.012,.01),1.0-smoothstep(.42-aI,.42+aI,dr));
      vec3 eye=mix(FZRGB(.94,.92,.89)*(1.0-.16*smoothstep(.45,1.0,length(e))),iris,1.0-smoothstep(1.0-aI,1.0+aI,dr));
      eye*=1.0-.45*smoothstep(lid-.55,lid,e.y);
      float cl=max(1.0-smoothstep(.22-aI,.22+aI,length(di/ir-vec2(-.3*sx,.3))),.7*(1.0-smoothstep(.1-aI,.1+aI,length(di/ir-vec2(.34*sx,-.32)))));
      eye=mix(eye,vec3(1.0),cl);
      float ly=e.y-lid,lw=mix(.12,.2,smoothstep(-.5,1.0,e.x));
      float lash=smoothstep(-.07-aE,-.07+aE,ly)*(1.0-smoothstep(lw-aE,lw+aE,ly))*(1.0-smoothstep(.96,1.1,abs(e.x)));
      col=mix(col,eye,vis);col=mix(col,FZRGB(.08,.05,.04),lash);
      gloss=max(gloss,vis);emis+=vec3(.4)*cl*vis;
      // nose: nostrils under the broad round tip
      col*=1.0-.42*exp(-fzSq((ax-.068)/.024)-fzSq((q.y+.355)/.013));
      // mouth: a wide warm smile with a hint of teeth under the moustache, full lower lip
      vec2 m=q-vec2(0.0,-.6);float W=.17,gx=m.x/W,gt=.003+.9*m.x*m.x+2.5*fzSq(max(0.0,abs(m.x)-.1)),gb=gt-.034*pow(max(0.0,1.0-gx*gx),.7)-.002;
      float gin=min(min(gt-m.y,m.y-gb),(1.0-abs(gx))*.04),gI=smoothstep(-aa,aa,gin),gL=smoothstep(-aa,aa,gin+.006)-gI;
      vec3 gc=mix(FZRGB(.28,.07,.07),FZRGB(.62,.28,.28),1.0-smoothstep(.016,.032,length((m-vec2(0.0,gb+.008))/vec2(2.0,1.0))));
      gc=mix(gc,FZRGB(.95,.93,.88),smoothstep(gt-.016-aa,gt-.016+aa,m.y)*(1.0-smoothstep(.75,.97,abs(gx))));
      float lipLo=exp(-fzSq(m.x/.11)-fzSq((m.y-gb+.026)/.02)),lipUp=exp(-fzSq(m.x/.12)-fzSq((m.y-gt-.01)/.008));
      col=mix(col,FZRGB(.68,.4,.36),clamp(.9*lipLo+.5*lipUp,0.0,1.0));
      col=mix(col,col*FZRGB(.82,.6,.56),.5*exp(-fzSq((m.y-gb+.055)/.012))*exp(-fzSq(m.x/.09)));
      float corner=fzLine(length(vec2(ax-W-.006,m.y-gt-.005)),.009,aa);
      col=mix(col,FZRGB(.36,.16,.14),max(gL*.9,corner*.75));col=mix(col,gc,gI);
      gloss=max(gloss,max(gI*.5,lipLo*.35));
    }`;
  function fatherSkinShader(m){
    const U={fzBlink:{value:0}};m.userData.fz=U;
    const WRAP=`vec3 fzWrap=vec3(0.0);float fzNL;
      #if NUM_POINT_LIGHTS > 0
      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) { getPointLightInfo( pointLights[ i ], geometryPosition, directLight ); fzNL = dot( geometryNormal, directLight.direction ); fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) ); }
      #pragma unroll_loop_end
      #endif
      #if NUM_DIR_LIGHTS > 0
      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) { getDirectionalLightInfo( directionalLights[ i ], directLight ); fzNL = dot( geometryNormal, directLight.direction ); fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) ); }
      #pragma unroll_loop_end
      #endif`;
    m.onBeforeCompile=sh=>{
      Object.assign(sh.uniforms,U);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vFz;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFz=uv;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+FZ_GLSL)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float fzRough=-1.0,fzGloss=0.0,fzHairK=0.0;vec3 fzEmis=vec3(0.0);
          if(vFz.x>15.0){   // beard / moustache strands, salt-and-pepper, ragged trimmed edge
            float th=vFz.x-20.0,ph=vFz.y;vec2 q=vec2(th*cos(ph)*.78,ph);float px=max(length(fwidth(q)),1e-5),ax=abs(q.x),sx=q.x<0.0?-1.0:1.0;
            float mw=smoothstep(-.62,-.54,q.y)*smoothstep(-.37,-.42,q.y)*(1.0-smoothstep(.22,.32,ax));
            vec2 dir=normalize(mix(vec2(-sx*.3*smoothstep(.1,.7,ax),-1.0),vec2(sx,-.5),mw));
            vec2 pr=vec2(dot(q,vec2(-dir.y,dir.x)),dot(q,dir)),s1=fzStrand(q,dir,160.0,34.0,px);
            float tfF=1.0-smoothstep(.004,.012,px),tf=mix(.5,fzVN(pr*vec2(44.0,13.0))*.62+fzVN(pr*vec2(98.0,27.0)+3.1)*.38,(1.0-smoothstep(.01,.03,px))*.7);
            float g=fzGrey(q)*(1.0-.7*mw),gl=smoothstep(0.0,1.0,g+(tf-.5)*.4+(s1.y-.5)*.35*s1.x*tfF);
            vec3 bc=mix(mix(FZRGB(.11,.085,.07),FZRGB(.22,.17,.13),.55*smoothstep(-.3,-.12,q.y)*(1.0-.5*mw)+.25*tf),FZRGB(.8,.78,.75),gl);
            bc*=(.82+.3*tf)*(.92+.18*s1.x*(s1.y>.5?1.0:.55));
            float edge=mix(.12+.62*s1.y*(1.0-.4*s1.x),.32,smoothstep(.3,.9,px*165.0));
            if(vColor.r<edge)discard;
            diffuseColor.rgb=bc;fzRough=.8;fzHairK=1.0;
          }else if(vFz.x>5.0){float r0=.6;fzFace(diffuseColor.rgb,r0,fzGloss,fzHairK,fzEmis,vFz.x-10.0,vFz.y,max(length(fwidth(vec2((vFz.x-10.0)*cos(vFz.y)*.78,vFz.y))),1e-5));fzRough=r0;}`)
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(fzRough>=0.0)roughnessFactor=fzRough;roughnessFactor=mix(roughnessFactor,.22,fzGloss);')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=fzEmis;')
        .replace('#include <opaque_fragment>',`{float fzF=1.0-saturate(dot(normal,normalize(vViewPosition)));float fzS=(1.0-fzHairK)*(1.0-fzGloss);
          outgoingLight+=(diffuseColor.rgb*vec3(.6,.2,.12)*fzF*fzF*.35+vec3(1.0,.74,.56)*pow(fzF,3.0)*.08)*fzS;
          ${WRAP}
          outgoingLight+=BRDF_Lambert(diffuseColor.rgb)*fzWrap*vec3(.55,.3,.22)*fzS;}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey=()=>'fezaDadSkin1';
    return U;
  }
  function father() {
    const b=builder('Feza’s father'),{root,joint,ell,tube,capsule,limb,cloth,trim}=b;
    // A warm, friendly camp dad drawn from Feza's real father: very short salt-and-pepper buzz cut (bald-ish top), thick straight
    // dark brows, warm brown eyes, a full broad face, a neat full beard that greys at the chin, a dark moustache joined to it and a
    // warm smile. Red-green flannel shirt (sleeves rolled to the elbows) over a black tee, an olive camp vest with pockets, khaki
    // hiking trousers and brown boots. Same 19-bone rig, same grip points; skin+face+beard, cloth, flannel and trim = 4 draw calls.
    const plaid=b.material(.93);plaid.map=plaidTexture();if(cloth.normalMap){plaid.normalMap=cloth.normalMap;plaid.normalScale=new THREE.Vector2(.2,.2);}
    const skinM=b.material(.6),FZ=fatherSkinShader(skinM);
    const SKIN=0xe4b898,SKIN_D=0xd4927a,TEE=0x1d1d20,VEST=0x6c6e3d,VEST_D=0x56582f,PANTS=0xa69872,PANTS_D=0x8b7e5a,BOOT=0x6e4a2f,SOLE=0x3b2d22,LEATHER=0x5c3d29,W=0xffffff;
    const sq=x=>x*x,sst=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
    const S=(bn,c,p,s,r)=>ell(bn,c,p,s,skinM,r),C=(bn,c,p,s,r)=>ell(bn,c,p,s,cloth,r),T=(bn,c,p,s,r)=>ell(bn,c,p,s,trim,r);
    // flip a grid's winding if its normals point inwards (checked on one vertex against a known outward direction)
    function orient(g,k,out){g.computeVertexNormals();const n=g.attributes.normal;if(n.getX(k)*out[0]+n.getY(k)*out[1]+n.getZ(k)*out[2]<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}g.computeVertexNormals();}}
    const eul=(q)=>{const e=new THREE.Euler().setFromQuaternion(q,'XYZ');return [e.x,e.y,e.z];};
    const hips=joint(root,'father hips',0,.98,0),waist=joint(hips,'father waist',0,.15,0),chest=joint(waist,'father chest',0,.25,0),head=joint(chest,'father head',0,.74,0);
    // ── Torso: smooth Catmull-Rom profile, squarer at the shoulders, a soft dad belly; shirt + open vest are shells of it ──
    const TS=[[-.40,.262,.205],[-.28,.278,.222],[-.14,.29,.232],[0,.295,.228],[.14,.30,.215],[.24,.305,.205],[.31,.305,.193],[.37,.29,.182],[.42,.25,.168],[.47,.21,.162],[.51,.178,.156],[.535,.16,.152]];
    function sec(y){let i=0;while(i<TS.length-2&&y>TS[i+1][0])i++;const p0=TS[Math.max(0,i-1)],p1=TS[i],p2=TS[i+1],p3=TS[Math.min(TS.length-1,i+2)],t=sat((y-p1[0])/(p2[0]-p1[0])),t2=t*t,t3=t2*t;
      const cr=k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);return [cr(1),cr(2)];}
    const sqN=y=>2+.55*Math.exp(-sq((y-.27)/.09)),shoulder=y=>.085*Math.exp(-sq((y-.285)/.085));
    const belly=(x,y)=>.034*Math.exp(-sq(x/.21)-sq((y+.13)/.15))+.009*Math.exp(-sq((Math.abs(x)-.13)/.10)-sq((y-.17)/.08));
    function tpt(a,y,sc,off){const [rx,rz]=sec(y),ex=2/sqN(y),c=Math.cos(a),s=Math.sin(a),cx=Math.pow(Math.abs(c),ex);let x=Math.sign(c)*cx*(rx+shoulder(y)*Math.pow(cx,6)),z=Math.sign(s)*Math.pow(Math.abs(s),ex)*rz*(s<0?.93:1);
      const fr=Math.max(0,s);z+=belly(x,y)*fr*fr;return [x*sc+c*off,y,z*sc+s*off];}
    const frontZ=(x,y,sc=1,off=0)=>{const [rx,rz]=sec(y),n=sqN(y),u=Math.min(.999,Math.abs(x)/(rx*sc));return rz*sc*Math.pow(1-Math.pow(u,n),1/n)+belly(x,y)+off;};
    function torsoShell(y0,y1,a0,a1,rows,sides,scFn,c,m,uvK){const pos=[],uv=[],idx=[];
      for(let r=0;r<=rows;r++){const y=y0+(y1-y0)*r/rows;for(let j=0;j<=sides;j++){const a=a0+(a1-a0)*j/sides,[sc,off]=scFn(a,y),p=tpt(a,y,sc,off);pos.push(...p);uv.push(j/sides*(a1-a0)*.30/uvK,y/uvK);
        if(r&&j<sides){const n=r*(sides+1)+j,q=n-sides-1;idx.push(q,n,q+1,q+1,n,n+1);}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();b.custom(chest,g,c,undefined,m);}
    // black tee (as in the photo) under an open red-green flannel shirt with rolled sleeves; the shirt hangs open down the front
    torsoShell(-.40,.535,0,TAU2,46,56,()=>[1,0],TEE,cloth,.2);
    {const pts=[];for(let i=0;i<=24;i++){const a=i/24*TAU2;pts.push([Math.cos(a)*.162,.532,Math.sin(a)*.154]);}tube(chest,pts,.012,0x2a2a2e,cloth);}
    const sa=.38,SS=(a,y)=>[1.035+.015*sst(-.1,-.38,y),.004];torsoShell(-.39,.51,Math.PI/2+sa,Math.PI/2+TAU2-sa,40,64,SS,W,plaid,.2);
    for(const s of[-1,1]){const pts=[];for(let i=0;i<=12;i++){const y=.46-i*.0705,p=tpt(Math.PI/2+s*sa,y,1.035+.015*sst(-.1,-.38,y),.008);pts.push(p);}tube(chest,pts,.012,0xd8cfc6,plaid);
      if(s<0)for(let i=0;i<5;i++){const p=pts[2+i*2];T(chest,0xe9e0cc,[p[0]-.012,p[1],p[2]+.012],[.011,.011,.005]);}
      const p=tpt(Math.PI/2+s*(sa+.12),.41,1.05,.01);ell(chest,W,[p[0],p[1],p[2]+.002],[.07,.03,.008],plaid,[.15,s*.45,s*-.95]);}
    {const pts=[];for(let i=0;i<=16;i++){const a=Math.PI/2+sa+.15+(TAU2-2*sa-.3)*i/16;pts.push([Math.cos(a)*.188,.512,Math.sin(a)*.17]);}tube(chest,pts,.015,W,plaid);}
    // neck (rides the chest, its top follows the head)
    // neck: thick, wide at the trapezius, leaning ~15° forward; its top flares into the nape and hides under the beard
    {const NA=32,NVn=12,pos=[],uv=[],idx=[];for(let r=0;r<=NVn;r++){const v=r/NVn,y=.44+.36*v,zc=.075*v-.01,rx=.15-.03*v;
        for(let i=0;i<=NA;i++){const a=i/NA*TAU2,ca=Math.cos(a),sa=Math.sin(a),rz=(.125-.012*v)+(sa<0?.03*sst(.5,.95,v):0);pos.push(ca*rx,y,zc+sa*rz);uv.push(0,0);
          if(r<NVn&&i<NA){const k=r*(NA+1)+i;idx.push(k,k+NA+1,k+1,k+1,k+NA+1,k+NA+2);}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);orient(g,6*(NA+1)+8,[0,0,1]);
      const it=b.part(chest,g,SKIN,[0,0,0],[1,1,1],skinM);it.skin=y=>({b:head,w:sst(.58,.72,y)});}
    // trousers, belt, small canteen pouch on the hip
    C(hips,0x9a8d68,[0,.01,0],[.272,.16,.212]);tube(hips,[[0,.06,.205],[0,-.03,.2],[.012,-.1,.17]],.007,PANTS_D,cloth);
    C(hips,LEATHER,[0,.082,0],[.29,.036,.226]);T(hips,0xc9b98e,[0,.082,.226],[.042,.032,.012]);C(hips,LEATHER,[0,.082,.236],[.026,.018,.006]);
    for(const s of[-1,1])C(hips,LEATHER,[s*.12,.082,.207],[.012,.04,.012]);
    C(hips,0x7d6a44,[-.285,-.02,.05],[.06,.075,.065]);C(hips,0x6b5838,[-.285,.035,.054],[.064,.026,.07]);
    // ── Head: ONE smooth sculpted surface (brow ridge, sockets, full cheeks, a round nose grown out of the face, lips, chin) on a
    // face-dense (azimuth, elevation) grid; the eyes, brows, smile and buzz cut are painted on it by the skin shader. The beard +
    // moustache is a shell lifted off the same surface whose edge sinks into the skin, so it melts in without a seam. ──
    // Proportions (head height H = 2R, top → beard tip): eyes at 50 %, brows 42 %, nose bottom 68 %, mouth 78 %, beard tip 100 %;
    // width ≈ 0.78 H, widest at the cheekbones, an oval egg-round skull. The head centre sits above the head bone so a short,
    // thick neck shows between the beard and the collar.
    const R=.25,KX=.78,HY=.012,HS=1;
    const browY=ax=>.17+.02*sst(.08,.3,ax)-.012*sst(.4,.52,ax);
    function hairJS(th,ph){const at=Math.abs(th);let hl=.62+.1*Math.exp(-sq((at-.55)/.2));hl+=(.06-hl)*sst(.8,1.35,at);hl+=(-.3-hl)*sst(1.36,1.48,at);hl+=(.22-hl)*sst(1.58,1.68,at);hl+=(-.62-hl)*sst(1.72,1.98,at);hl+=(-1.3-hl)*sst(2.1,2.6,at);const bk=sst(1.8,2.6,at);
      return Math.min(1,sst(hl-.03-.06*bk,hl+.09+.12*bk,ph)*(.62+.36*sst(.85,1.3,at)*(1-sst(.9,1.3,ph))+.3*sst(1.9,2.6,at)));}
    const G1=(a,b,sa,sb)=>Math.exp(-sq(a/sa)-sq(b/sb));
    function headPt(th,ph,o){
      // broad dome above the eyes (superellipse), oval below; deep skull (front→back ≈ 0.95 H)
      const cp=Math.cos(ph),sp=Math.sin(ph),w=ph>0?Math.pow(Math.max(0,1-Math.pow(sp,2.8)),1/2.8):Math.pow(cp,.6),ct=Math.cos(th);   // broad, blunt U jaw
      const dx=Math.sin(th)*w,dy=sp,dz=ct*w,at=Math.abs(th),qx=th*cp*KX,ax=Math.abs(qx);
      let x=dx*R*KX*(1+.035*Math.exp(-sq((ph+.1)/.3))),y=dy*R,z=dz*R*(ct>0?.94:.96);
      if(ph<0){y*=1-(.5*sst(.2,1.4,at)-.3*sst(1.9,2.8,at))*sst(-.25,-1.1,ph);   // jaw line rises from the chin to the angle under the ear
        if(ct<0)z*=1-.25*sst(-.1,-1.0,ph)*sst(0,-.6,ct);}                         // the skull curves down and in to the nape
      else z*=1-.07*sst(.3,1.0,ph)*Math.max(0,ct);                     // forehead leans back a little
      const fr=sst(-.1,.5,dz);
      let h=.03*G1(at-.32,ph-.2,.28,.07)*fr;                                         // brow ridge
      h-=.024*G1(at-.36,ph,.17,.1)*fr;                                              // soft eye sockets
      h+=.045*G1(at-.62,ph+.15,.26,.15)*fr+.03*G1(at-.5,ph+.36,.26,.18)*fr;         // cheekbones, full cheeks
      h+=.05*G1(th,ph+.08,.08,.2)+.13*G1(th,ph+.285,.135,.09);                      // straight bridge, big round tip
      h+=.045*G1(at-.17,ph+.33,.06,.05)-.02*G1(th,ph+.375,.07,.025);                // wings, under the nose
      h+=.03*G1(th,ph+.48,.22,.07)+.035*G1(th,ph+.67,.17,.045)-.015*G1(th,ph+.61,.15,.02);   // upper lip, full lower lip, mouth
      h+=.11*G1(th,ph+.9,.36,.22);                                                   // chin
      h+=.012*Math.exp(-sq((ph-browY(ax))/.04))*sst(.07,.1,ax)*sst(.53,.48,ax)*fr+.012*hairJS(th,ph);   // brows, buzz cut
      h*=R;let px=x+dx*h,py=y+dy*h,pz=z+dz*h;
      // below the jaw the head surface itself flows into a thick neck (wide at the base, leaning forward) — no ledge at the nape
      if(ph<-.5){const s=sat((-ph-1.0)/(Math.PI/2-1.0)),k=sst(-.55-.62*sst(-.4,.6,ct),-1.42,ph),nx=Math.sin(th)*(.13+.075*Math.pow(s,1.3)),nz=ct*(ct>0?.118:.122)*(1+.22*Math.pow(s,1.3))+.012,ny=-R*(.95+.3*s);
        px+=(nx-px)*k;py+=(ny-py)*k;pz+=(nz-pz)*k;}
      o[0]=px;o[1]=py+HY;o[2]=pz;return o;
    }
    const NU=128,NV=100,NU1=NU+1,NN=NU1*(NV+1);
    const hTh=u=>{const s=2*u-1;return Math.PI*s*(.38+.62*s*s);};
    const PHC=(()=>{const N=256,d=ph=>1+1.5*Math.exp(-sq((ph+.3)/.65)),c=[0];for(let i=1;i<=N;i++)c.push(c[i-1]+d(-Math.PI/2+(i-.5)/N*Math.PI));return c.map(x=>x/c[N]);})();
    const hPh=v=>{let lo=0,hi=PHC.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(PHC[m]<=v)lo=m;else hi=m;}return -Math.PI/2+(lo+(v-PHC[lo])/Math.max(1e-9,PHC[hi]-PHC[lo]))/(PHC.length-1)*Math.PI;};
    // beard: from the nose bottom on the cheeks up to the sideburns, along the jaw, under the chin to the neck
    const BT=[[0,-.39],[.2,-.4],[.35,-.41],[.55,-.37],[.8,-.27],[1.05,-.15],[1.3,-.02],[1.45,.08],[1.7,.12]];
    const beardTop=at=>{let i=0;while(i<BT.length-2&&at>BT[i+1][0])i++;const f=sst(BT[i][0],BT[i+1][0],at);return BT[i][1]+(BT[i+1][1]-BT[i][1])*(.5*f+.5*sat((at-BT[i][0])/(BT[i+1][0]-BT[i][0])));};
    function beardMask(th,ph,grow=0){const at=Math.abs(th),qx=th*Math.cos(ph)*KX,top=beardTop(at)+grow;
      let m=sst(top+.03,top-.1,ph)*Math.max(sst(1.78+grow,1.3+grow*.5,at),sst(-.45,-.8,ph)*sst(1.95,1.55,at))*(1-sst(-1.38,-1.52,ph)*sst(.4,1.3,at));
      const mb=-.545-.8*qx*qx+grow,lb=-.72+2.0*qx*qx-grow;m*=1-sst(mb+.012,mb-.01,ph)*sst(lb-.01,lb+.012,ph)*sst(.25+grow,.22+grow,Math.abs(qx));   // the lips stay free
      return m;}
    const mwJS=(qx,ph)=>sst(-.37,-.41,ph)*sst(-.57-.8*qx*qx,-.53-.8*qx*qx,ph)*(1-sst(.22,.32,Math.abs(qx)));
    const TH=new Float32Array(NN),PH=new Float32Array(NN),HP=[],HUV=[],HC=[],tp=[0,0,0];
    const skinC=new THREE.Color(SKIN),shadeC=new THREE.Color(0xc58c70),pinkC=new THREE.Color(0xf09c86),stubC=new THREE.Color(0x5a4a40),haloC=new THREE.Color(0x8a7468),tc=new THREE.Color();
    for(let j=0;j<=NV;j++){const ph=hPh(j/NV);for(let i=0;i<=NU;i++){const k=j*NU1+i,th=hTh(i/NU),at=Math.abs(th);TH[k]=th;PH[k]=ph;headPt(th,ph,tp);HP.push(tp[0],tp[1],tp[2]);HUV.push(th+10,ph);
      tc.copy(skinC).lerp(shadeC,.45*sst(-.45,-1.0,ph)*(.5+.5*sst(.3,1.2,at)));
      tc.lerp(pinkC,.24*Math.exp(-sq(th/.12)-sq((ph+.28)/.08))+.08*Math.exp(-sq((at-1.6)/.15)-sq((ph+.05)/.15)));
      const bm=beardMask(th,ph),halo=beardMask(th,ph,.035);tc.lerp(haloC,.45*Math.max(0,halo-bm)).lerp(stubC,Math.min(1,bm*1.5)*.92);HC.push(tc.r,tc.g,tc.b);}}
    const HI=[];for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const k=j*NU1+i;HI.push(k,k+1,k+NU1,k+1,k+NU1+1,k+NU1);}
    const headGeo=new THREE.BufferGeometry();headGeo.setAttribute('position',new THREE.Float32BufferAttribute(HP,3));headGeo.setAttribute('color',new THREE.Float32BufferAttribute(HC,3));
    headGeo.setAttribute('uv',new THREE.Float32BufferAttribute(HUV,2));headGeo.setIndex(HI);orient(headGeo,Math.round(NV*.55)*NU1+NU/2,[0,0,1]);
    {const n=headGeo.attributes.normal;   // seam at the back + the two poles: no creases, no pinches
      for(let j=0;j<=NV;j++){const a=j*NU1,c=a+NU;const x=n.getX(a)+n.getX(c),y=n.getY(a)+n.getY(c),z=n.getZ(a)+n.getZ(c),l=Math.hypot(x,y,z)||1;n.setXYZ(a,x/l,y/l,z/l);n.setXYZ(c,x/l,y/l,z/l);}
      for(let i=0;i<=NU;i++){n.setXYZ(i,0,-1,0);n.setXYZ(NV*NU1+i,0,1,0);}}
    b.part(head,headGeo,W,[0,0,0],[HS,HS,HS],skinM);
    const HN=headGeo.attributes.normal;
    // beard + moustache shell: full, neatly trimmed, a little longer at the chin; strands/greying/edge are drawn by the shader
    {const MK=new Float32Array(NN),map=new Int32Array(NN).fill(-1),pos=[],col=[],uv=[],idx=[];for(let k=0;k<NN;k++)MK[k]=beardMask(TH[k],PH[k]);
      for(let k=0;k<NN;k++){const j0=Math.floor(k/NU1),i0=k%NU1;let near=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const jj=j0+dj,ii=i0+di;if(jj>=0&&jj<=NV&&ii>=0&&ii<=NU)near=Math.max(near,MK[jj*NU1+ii]);}if(near<=.01)continue;
        const th=TH[k],ph=PH[k],mk=MK[k],qx=th*Math.cos(ph)*KX;
        let t=(.0032+.0018*sst(-.6,-.9,ph)+.003*Math.exp(-sq(qx/.3)-sq((ph+1.0)/.25)))*(1-.55*sst(.7,1.35,Math.abs(th)));
        t+=.004*mwJS(qx,ph)*(1-.4*Math.exp(-sq(qx/.022)));t=mk>.001?t*Math.sqrt(mk):-.003;
        const drop=0*Math.exp(-sq(qx/.2)-sq((ph+.62)/.2))*mk;
        map[k]=pos.length/3;pos.push(HP[k*3]+HN.getX(k)*t,HP[k*3+1]+HN.getY(k)*t-drop,HP[k*3+2]+HN.getZ(k)*t+drop*.25);col.push(mk,mk,mk);uv.push(th+20,ph);}
      for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const k=j*NU1+i,q=[k,k+1,k+NU1,k+NU1+1].map(v=>map[v]);if(q.some(v=>v<0))continue;idx.push(q[0],q[1],q[2],q[1],q[3],q[2]);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
      let kf=0,best=-1;for(let k=0;k<NN;k++)if(map[k]>=0&&Math.abs(TH[k])<.06&&Math.abs(PH[k]+.85)<.08&&MK[k]>best){best=MK[k];kf=map[k];}orient(g,kf,[0,-.3,1]);b.part(head,g,W,[0,0,0],[HS,HS,HS],skinM);}
    // ears: a real ear shape (helix rim rolling back, antihelix ridge, deep concha, soft lobe), turned a little forward
    for(const s of[-1,1]){const al=.42,X=new THREE.Vector3(s*Math.cos(al),0,Math.sin(al)),Y=new THREE.Vector3(0,Math.cos(.16),-Math.sin(.16)),Z=new THREE.Vector3().crossVectors(X,Y);if(Z.z<0)Z.negate();Y.crossVectors(Z,X).normalize();
      const c=new THREE.Vector3(s*.19,HY-.032,-.032),NA=44,NR=26,pos=[],col=[],idx=[],cc=new THREE.Color(),inC=new THREE.Color(SKIN_D),p=new THREE.Vector3();
      for(let r=0;r<=NR;r++){const v=r/NR*1.85;for(let i=0;i<=NA;i++){const a=i/NA*TAU2,ca=Math.cos(a),sa=Math.sin(a);
        const R=1.25/Math.hypot(ca/.047,sa/((ca>0?.031:.024)-.004*sa))*(1-.12*sst(-.2,-.9,ca)*sst(-.2,.5,sa));
        let rr,h;if(v<=1){rr=v*R;h=.013-.012*Math.exp(-sq(v/.5))+.0045*Math.exp(-sq((v-.66)/.1))*(ca>-.4?1:.35)+.003*Math.exp(-sq((v-.93)/.06));}
        else{const w=(v-1)/.85,f=w*Math.PI;rr=R*(1+.06*Math.sin(f)-.3*w*w);h=.016+.004*Math.sin(f)-.03*w;}
        h*=1-.55*Math.max(0,sa)*sst(.3,1,v);h+=.012*Math.max(0,-sa)*sst(.2,1,Math.min(v,1));p.copy(c).addScaledVector(X,h).addScaledVector(Y,rr*ca).addScaledVector(Z,rr*sa);pos.push(p.x,p.y,p.z);
        cc.copy(skinC).lerp(inC,.55*sst(.85,.35,v));col.push(cc.r,cc.g,cc.b);
        if(r<NR&&i<NA){const k=r*(NA+1)+i;idx.push(k,k+1,k+NA+1,k+1,k+NA+2,k+NA+1);}}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(pos.length/3*2).fill(0),2));g.setIndex(idx);
      orient(g,Math.round(NR*.25)*(NA+1)+5,[X.x,X.y,X.z]);b.part(head,g,W,[0,0,0],[HS,HS,HS],skinM);}
    // ── Limbs ──
    const legs=[],arms=[];
    for(const side of[-1,1]) {
      const thigh=joint(hips,'father thigh '+side,side*.17,-.14,0),shin=joint(thigh,'father shin '+side,0,-.40,0),foot=joint(shin,'father boot '+side,0,-.34,.01);
      limb(thigh,PANTS,[[.15,.12,.13],[.10,.15,.155],[0,.148,.153],[-.14,.143,.146],[-.30,.126,.128],[-.40,.116,.118],[-.52,.108,.11],[-.62,.106,.108],[-.70,.114,.116]],shin,cloth);
      C(thigh,PANTS_D,[side*.128,-.22,.012],[.032,.078,.072]);C(thigh,PANTS,[side*.136,-.16,.012],[.034,.02,.075]);T(thigh,0xc9b98e,[side*.162,-.165,.012],[.006,.008,.008]);
      C(shin,PANTS_D,[0,-.305,0],[.118,.026,.12]);
      // hiking boots: padded collar, rounded toe cap, lugged sole and cream laces
      C(foot,BOOT,[0,.03,0],[.098,.08,.10]);C(foot,BOOT,[0,-.028,.075],[.106,.078,.18]);C(foot,0x5c3c25,[0,-.036,.2],[.096,.058,.075]);
      C(foot,SOLE,[0,-.083,.08],[.116,.025,.212]);C(foot,0x8a6a48,[0,.09,-.005],[.104,.028,.108]);C(foot,0x4e3220,[0,-.05,-.075],[.1,.05,.06]);
      for(let i=0;i<3;i++)tube(foot,[[-.055,.04-i*.022,.07+i*.038],[0,.05-i*.02,.088+i*.038],[.055,.04-i*.022,.07+i*.038]],.0075,0xe8dcc0,cloth);
      legs.push({side,thigh,shin,foot});
      const clavicle=joint(chest,'father clavicle '+side,side*.21,.29,0),upper=joint(clavicle,'father upper arm '+side,side*.15,.01,0),fore=joint(upper,'father forearm '+side,side*.012,-.33,0),hand=joint(fore,'father hand '+side,0,-.28,0);
      // sleeve: a domed shoulder cap that grows out of the torso, down to the rolled cuff just above the elbow
      limb(upper,W,[[.03,.03,.03],[.015,.068,.068],[-.02,.088,.086],[-.08,.091,.088],[-.16,.089,.087],[-.25,.088,.086]],fore,plaid,[3,2.6]);
      {const g=new THREE.TorusGeometry(.088,.022,10,30);g.rotateX(Math.PI/2);b.custom(upper,g,0xd8c8c0,[0,-.258,0],plaid);}
      limb(upper,SKIN,[[-.24,.088,.086],[-.33,.083,.08],[-.43,.078,.075],[-.52,.072,.068]],fore,skinM);
      limb(fore,SKIN,[[-.10,.078,.073],[-.19,.068,.063],[-.26,.057,.052],[-.31,.053,.048]],hand,skinM);
      // hands: right one a fist around the tool grip (≈ hand-local [0,-.10,.05]); left one open and relaxed (waves, holds the lantern)
      const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),e3=new THREE.Euler();
      if(side>0){S(hand,SKIN,[0,-.065,.0],[.046,.072,.05]);S(hand,SKIN,[0,-.11,.012],[.044,.05,.05]);
        for(let i=0;i<4;i++){const y=-.072-i*.026,r=.036-.002*i,pts=[];for(let k=0;k<=6;k++){const a=-2.3+k/6*3.0;pts.push([Math.sin(a)*r*side,y-.004*k*(i===3?1:0),.048-Math.cos(a)*r]);}
          tube(hand,pts,.0165-.001*i,SKIN,skinM);S(hand,SKIN,pts[6],[.0165,.0165,.0165]);S(hand,0xf2cdb0,[pts[6][0]*1.05,pts[6][1],pts[6][2]+.006],[.008,.011,.004]);}
        tube(hand,[[-side*.03,-.045,.012],[-side*.04,-.062,.05],[-side*.02,-.07,.085],[side*.012,-.072,.094]],.0175,SKIN,skinM);S(hand,SKIN,[side*.012,-.072,.094],[.0175,.0175,.0175]);}
      else{const ry=-side*.55;qb.setFromAxisAngle(new THREE.Vector3(0,1,0),ry);const P=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).applyQuaternion(qb);return [v.x,v.y,v.z];};
        S(hand,SKIN,P(0,-.068,.004),[.066,.078,.03],eul(qb));S(hand,SKIN,P(-side*.03,-.04,-.002),[.035,.04,.026],eul(qb));
        const FL=[.05,.058,.055,.045];for(let i=0;i<4;i++){const x=(i-1.5)*.03*side*-1,L=FL[i],r=.0165-.0012*Math.abs(i-1.2);
          const a1=.18+.06*i,a2=.55+.08*i;qa.setFromEuler(e3.set(a1,0,(i-1.5)*.06));const q1=qb.clone().multiply(qa);
          const base=new THREE.Vector3(x,-.132,.004),mid=new THREE.Vector3(0,-L*.55,0).applyQuaternion(qa).add(base);
          capsule(hand,SKIN,P(...new THREE.Vector3(0,-L*.27,0).applyQuaternion(qa).add(base).toArray()),r,L*.45,skinM,eul(q1));
          qa.setFromEuler(e3.set(a2,0,(i-1.5)*.06));const q2=qb.clone().multiply(qa);capsule(hand,SKIN,P(...new THREE.Vector3(0,-L*.22,0).applyQuaternion(qa).add(mid).toArray()),r*.95,L*.38,skinM,eul(q2));}
        qa.setFromEuler(e3.set(.35,0,side*.75));capsule(hand,SKIN,P(-side*.058,-.075,.022),.019,.04,skinM,eul(qb.clone().multiply(qa)));
        qa.setFromEuler(e3.set(.6,0,side*.35));capsule(hand,SKIN,P(-side*.074,-.112,.034),.017,.03,skinM,eul(qb.clone().multiply(qa)));}
      arms.push({side,clavicle,upper,fore,hand});
      if(side===1) {
        // The axe lives on its own bone so camp scenes can put it away (scale ~0) without another draw call.
        const axe=joint(hand,'father axe');axe.scale.setScalar(AXE_S);arms.axe=axe;const hand0=hand;{const hand=axe;
        tube(hand,[[0,-.40,.061],[0,-.11,.06],[.035,.20,.052],[.075,.56,.045],[.091,.83,.041]],.035,0xa77543,cloth);
        for(let i=0;i<6;i++)ell(hand,0x624b34,[.008,-.19+i*.034,.060],[.040,.009,.040],cloth);
        ell(hand,0xc6ac70,[.088,.66,.041],[.052,.061,.050],trim);
        const sh=new THREE.Shape(),points=[[-0.027,0.69],[-0.096,0.774],[-0.216,0.834],[-0.282,0.81],[-0.306,0.696],[-0.276,0.618],[-0.174,0.606],[-0.084,0.654],[0.021,0.648],[0.033,0.75]];
        sh.moveTo(-points[0][0],points[0][1]);points.slice(1).forEach(v=>sh.lineTo(-v[0],v[1]));sh.closePath();const blade=new THREE.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.018,bevelThickness:.012});
        b.custom(hand,blade,0xcfd5d6,[.09,0,.086],trim);
        tube(hand,[[.32,.804,.15],[.356,.738,.15],[.344,.648,.15]],.007,0xe1e7d8,trim);
        for(let i=0;i<2;i++)ell(hand,0xc8423a,[.02+i*.012,.30+i*.07,.056],[.04,.016,.04],cloth);
        ell(hand,0xb9d2c7,[.08,.84,.048],[.043,.046,.045],trim);
        }void hand0;
      }
    }
    const out=b.finish();let time=0,stride=0,walkBlend=0,blinkT=1.5+Math.random()*2;
    const gear=fatherGear(out,{root,chest,hips,head,handR:arms.find(a=>a.side>0).hand,handL:arms.find(a=>a.side<0).hand,axe:arms.axe});
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
      blinkT-=dt;const bk=blinkT<0?sat(1-Math.abs(blinkT+.07)/.07):0;if(blinkT<-.14)blinkT=2.4+Math.random()*3.2;FZ.fzBlink.value=bk;
      scenePose(dt,state);
      root.updateMatrixWorld(true);
      gear.update(dt);
    };
    // Camp-scene poses (state.pose): blended over the walk/idle pose; the gameplay attack rig is untouched.
    let poseW=0,poseName=null,poseT=0,prevName=null,prevW=0;const armR=arms.find(a=>a.side>0),armL=arms.find(a=>a.side<0);
    const mix=(o,k,v,w)=>{o[k]+=(v-o[k])*w;};
    function scenePose(dt,state){
      const want=state.pose||null,k=dt>0?1-Math.exp(-6.5*dt):1;
      if(want!==poseName){if(poseName&&poseW>.05){prevName=poseName;prevW=poseW;}poseName=want;poseW=0;}
      poseW+=((poseName?1:0)-poseW)*k;prevW-=prevW*k;
      poseT=state.poseT!==undefined?state.poseT:time;
      if(prevName&&prevW>.002)applyPose(prevName,easy(prevW));else prevName=null;
      if(poseName&&poseW>.002)applyPose(poseName,easy(poseW));
    }
    function applyPose(n,w){const t=poseT,R=armR,L=armL;
      const sitting=n==='sit'||n==='sitStick'||n==='sitEat'||n==='sitWave';
      if(sitting){
        mix(hips.position,'y',.56,w);mix(hips.rotation,'x',-.06,w);mix(chest.rotation,'x',.10,w);
        for(const leg of legs){mix(leg.thigh.rotation,'x',-1.50,w);mix(leg.thigh.rotation,'z',leg.side*.10,w);mix(leg.shin.rotation,'x',1.42,w);mix(leg.foot.rotation,'x',.05,w);}
        if(n==='sit'){for(const A of[R,L]){mix(A.upper.rotation,'x',-.45,w);mix(A.upper.rotation,'z',A.side*.10,w);mix(A.fore.rotation,'x',-.55,w);}}
      }
      if(n.startsWith('kneel')){   // one knee on the ground: Dad at Feza's eye level
        mix(hips.position,'y',.60,w);mix(hips.position,'z',-.05,w);mix(hips.rotation,'x',.04,w);mix(waist.rotation,'x',.10,w);
        for(const leg of legs){if(leg.side<0){mix(leg.thigh.rotation,'x',-1.30,w);mix(leg.thigh.rotation,'z',-.10,w);mix(leg.shin.rotation,'x',1.25,w);mix(leg.foot.rotation,'x',.05,w);}
          else{mix(leg.thigh.rotation,'x',.12,w);mix(leg.thigh.rotation,'z',.06,w);mix(leg.shin.rotation,'x',1.62,w);mix(leg.foot.rotation,'x',.25,w);}}
        if(n==='kneel'){for(const A of[R,L]){mix(A.upper.rotation,'x',-.35,w);mix(A.fore.rotation,'x',-.75,w);}}
      }
      if(n==='fish'||n==='fishPull'||n==='kneelFish'||n==='kneelPull'){
        const pull=n==='fishPull'||n==='kneelPull'?1:0,bob=.03*Math.sin(t*1.3);
        mix(R.upper.rotation,'x',-.55-.55*pull+bob,w);mix(R.upper.rotation,'y',0,w);mix(R.upper.rotation,'z',.18,w);mix(R.fore.rotation,'x',-.75-.3*pull,w);mix(R.fore.rotation,'z',0,w);
        mix(L.upper.rotation,'x',-.45-.5*pull,w);mix(L.upper.rotation,'z',.05,w);mix(L.upper.rotation,'y',.2,w);mix(L.fore.rotation,'x',-1.05,w);
        const tilt=-(R.upper.rotation.x+R.fore.rotation.x+R.clavicle.rotation.x)+.95-.55*pull;mix(R.hand.rotation,'x',tilt,w);mix(R.hand.rotation,'y',0,w);mix(R.hand.rotation,'z',0,w);
        mix(chest.rotation,'x',-.10*pull,w);mix(waist.rotation,'x',-.06*pull,w);
      }
      if(n==='sitStick'||n==='stick'){
        mix(R.upper.rotation,'x',-.95,w);mix(R.upper.rotation,'z',.12,w);mix(R.fore.rotation,'x',-.25,w);
        const tilt=-(R.upper.rotation.x+R.fore.rotation.x+R.clavicle.rotation.x)+1.25+.05*Math.sin(t*.9);mix(R.hand.rotation,'x',tilt,w);mix(R.hand.rotation,'z',0,w);
        mix(L.upper.rotation,'x',-.35,w);mix(L.fore.rotation,'x',-.6,w);
      }
      if(n==='sitEat'){const bite=Math.max(0,Math.sin(t*2.2));mix(R.upper.rotation,'x',-.9-.35*bite,w);mix(R.upper.rotation,'z',.25,w);mix(R.fore.rotation,'x',-1.4-.6*bite,w);mix(L.upper.rotation,'x',-.5,w);mix(L.fore.rotation,'x',-.7,w);mix(head.rotation,'x',.05*bite,w);}
      if(n==='whistle'){mix(L.upper.rotation,'x',-1.05,w);mix(L.upper.rotation,'z',-.25,w);mix(L.upper.rotation,'y',-.4,w);mix(L.fore.rotation,'x',-2.0,w);mix(L.fore.rotation,'z',.2,w);
        mix(head.rotation,'x',-.12+.04*Math.sin(t*4),w);mix(head.rotation,'z',.06*Math.sin(t*2),w);mix(hips.rotation,'z',.04*Math.sin(t*3.4),w);
        mix(R.upper.rotation,'x',-.2,w);mix(R.upper.rotation,'z',.35+.08*Math.sin(t*3.4),w);mix(R.fore.rotation,'x',-.3,w);}
      if(n==='dance'||n==='cheer'){const b=Math.sin(t*6.4),c=Math.sin(t*3.2),up=n==='cheer'?1:.5+.5*c;
        mix(hips.position,'y',.95-.05*Math.abs(b),w);mix(hips.rotation,'z',.10*c,w);mix(hips.rotation,'y',.25*Math.sin(t*1.6),w);mix(chest.rotation,'z',-.12*c,w);mix(head.rotation,'z',.14*c,w);
        for(const A of[R,L]){const k=A.side>0?up:(n==='cheer'?1:1-up*.6);mix(A.upper.rotation,'z',A.side*(.5+1.9*k),w);mix(A.upper.rotation,'x',-.2,w);mix(A.fore.rotation,'x',-.25-.5*(1-k),w);mix(A.fore.rotation,'z',A.side*.4*Math.sin(t*6.4+A.side),w);}
        for(const leg of legs){mix(leg.thigh.rotation,'x',-.18*Math.max(0,leg.side*b),w);mix(leg.shin.rotation,'x',.35*Math.max(0,leg.side*b),w);}}
      if(n==='wave'||n==='sitWave'||n==='kneelWave'){mix(L.upper.rotation,'z',-2.15,w);mix(L.upper.rotation,'x',.05,w);mix(L.upper.rotation,'y',0,w);mix(L.fore.rotation,'z',-.75+.38*Math.sin(t*8),w);mix(L.fore.rotation,'x',0,w);mix(L.hand.rotation,'z',.2*Math.sin(t*8-.6),w);}
      if(n==='clap'||n==='kneelClap'){const c=Math.abs(Math.sin(t*5.5));for(const A of[R,L]){mix(A.upper.rotation,'x',-1.15,w);mix(A.upper.rotation,'y',-A.side*.15,w);mix(A.upper.rotation,'z',A.side*(.05+.32*c),w);mix(A.fore.rotation,'x',-.75,w);mix(A.fore.rotation,'z',-A.side*.35,w);}}
      if(n==='point'){mix(L.upper.rotation,'x',-1.9,w);mix(L.upper.rotation,'z',-.45,w);mix(L.fore.rotation,'x',-.12,w);mix(head.rotation,'x',-.2,w);}
      if(n==='lookUp'){mix(head.rotation,'x',-.45,w);mix(chest.rotation,'x',-.1,w);}
    }
    out.gear=gear;out.setGear=gear.set;
    const dispose0=out.dispose;out.dispose=()=>{gear.dispose();dispose0();};
    out.update(0);return out;
  }
  // ── Father's trail gear: fishing rod, lantern (with a soft path-light cone), backpack, marshmallow stick ──
  // Plain meshes on his bones, hidden until a zone/scene asks for them (no draw calls while hidden, no extra lights).
  // The axe has its own bone and is folded away (scale ~0) whenever another tool is in his right hand.
  const GEAR_MAT={},AXE_S=.66;   // a small, friendly camp axe (bound at this scale)
  function gearMat(key,make){return GEAR_MAT[key]&&!GEAR_MAT[key].disposed?GEAR_MAT[key]:(GEAR_MAT[key]=make());}
  function radialTexture(){
    if(GEAR_MAT.radial)return GEAR_MAT.radial;
    const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.62)');g.addColorStop(.7,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(cv);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;return (GEAR_MAT.radial=t);
  }
  function fatherGear(out,R){
    const std=(color,o)=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:.75},o||{}));
    const mats=[],geos=[],keep=(m)=>{mats.push(m);return m;},g=x=>{geos.push(x);return x;};
    const mesh=(geo,mat,p,s,r,parent)=>{const m=new THREE.Mesh(g(geo),mat);if(p)m.position.set(...p);if(s)m.scale.set(...s);if(r)m.rotation.set(...r);m.castShadow=true;(parent||R.root).add(m);return m;};
    const wood=keep(std(0x8a5a33,{roughness:.8})),cork=keep(std(0xc9a26d,{roughness:.95})),dark=keep(std(0x3b3f36,{roughness:.5,metalness:.3})),metal=keep(std(0x9aa29a,{roughness:.35,metalness:.6}));
    // Rod: cork grip in the right hand, a tapering blank, reel and a red tip; rodTip marks the line's start.
    const rod=new THREE.Group();rod.name='father fishing rod';rod.position.set(0,-.10,.062);R.handR.add(rod);
    mesh(new THREE.CylinderGeometry(.024,.026,.34,12),cork,[0,.02,0],null,null,rod);
    mesh(new THREE.CylinderGeometry(.007,.017,1.95,10),keep(std(0x4d5f3a,{roughness:.45})),[0,1.16,0],null,null,rod);
    mesh(new THREE.CylinderGeometry(.006,.007,.08,8),keep(std(0xd8473a,{roughness:.4})),[0,2.16,0],null,null,rod);
    mesh(new THREE.CylinderGeometry(.045,.045,.03,16),metal,[0,.11,.06],null,[0,0,Math.PI/2],rod);
    mesh(new THREE.CylinderGeometry(.008,.008,.06,6),dark,[0,.11,.03],null,[Math.PI/2,0,0],rod);
    for(let i=0;i<4;i++)mesh(new THREE.TorusGeometry(.014-i*.002,.003,5,10),metal,[0,.45+i*.42,.016],null,null,rod);
    const rodTip=new THREE.Object3D();rodTip.position.set(0,2.2,0);rod.add(rodTip);
    // Marshmallow stick (gece): a peeled branch with a fluffy marshmallow that toasts.
    const stick=new THREE.Group();stick.name='father marshmallow stick';stick.position.set(0,-.10,.062);R.handR.add(stick);
    mesh(new THREE.CylinderGeometry(.009,.014,1.05,8),wood,[0,.42,0],null,null,stick);
    const marshMat=keep(std(0xfff7ec,{roughness:.9,emissive:0x000000}));
    mesh(new THREE.CylinderGeometry(.045,.045,.07,14),marshMat,[0,.96,0],null,null,stick);
    // Lantern: hangs from his left hand and always stays upright (pivot counter-rotated after posing).
    const lantern=new THREE.Group();lantern.name='father lantern';lantern.position.set(0,-.15,.04);R.handL.add(lantern);
    const glassMat=keep(new THREE.MeshStandardMaterial({color:0xffe2a0,emissive:0xffb347,emissiveIntensity:1.6,roughness:.2,transparent:true,opacity:.92}));
    mesh(new THREE.TorusGeometry(.055,.007,6,16,Math.PI),dark,[0,-.02,0],null,null,lantern);
    mesh(new THREE.ConeGeometry(.075,.06,12),dark,[0,-.09,0],null,null,lantern);
    mesh(new THREE.CylinderGeometry(.055,.055,.13,14),glassMat,[0,-.185,0],null,null,lantern);
    mesh(new THREE.SphereGeometry(.028,10,8),keep(new THREE.MeshBasicMaterial({color:0xfff2b8})),[0,-.185,0],null,null,lantern);
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+.4;mesh(new THREE.CylinderGeometry(.006,.006,.14,5),dark,[Math.sin(a)*.058,-.185,Math.cos(a)*.058],null,null,lantern);}
    mesh(new THREE.CylinderGeometry(.07,.075,.025,14),dark,[0,-.26,0],null,null,lantern);
    // Path light: a soft additive beam + a warm pool on the ground ahead (no light source, no shader change).
    const beam=new THREE.Group();beam.name='father lantern path light';R.root.add(beam);
    const pool=new THREE.Mesh(g(new THREE.CircleGeometry(1,40)),keep(new THREE.MeshBasicMaterial({map:radialTexture(),color:0xffc77a,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,fog:false})));
    pool.rotation.x=-Math.PI/2;pool.position.set(-.15,.035,2.0);pool.scale.set(1.35,1.75,1);pool.renderOrder=2;beam.add(pool);
    const coneGeo=new THREE.ConeGeometry(1,1,28,6,true);coneGeo.translate(0,-.5,0);{const p=coneGeo.attributes.position,col=[];for(let i=0;i<p.count;i++){const k=Math.pow(Math.max(0,1+p.getY(i)),1.1)*(1-.0*p.getY(i));col.push(k,k*.82,k*.55);}coneGeo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));}
    const cone=new THREE.Mesh(g(coneGeo),keep(new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false})));
    cone.position.set(-.33,.82,.25);cone.scale.set(1.05,2.3,.9);cone.lookAt(new THREE.Vector3(-.2,0,2.1));cone.rotateX(Math.PI/2);cone.renderOrder=2;beam.add(cone);
    // Backpack: olive canvas pack with a rolled red blanket and a little tin cup.
    const pack=new THREE.Group();pack.name='father backpack';R.chest.add(pack);
    const canvas=keep(std(0x6f7a43,{roughness:.95})),flap=keep(std(0x58612f,{roughness:.95})),blanket=keep(std(0xb4553f,{roughness:.95}));
    mesh(new THREE.SphereGeometry(1,20,14),canvas,[0,.16,-.37],[.25,.29,.13],null,pack);
    mesh(new THREE.SphereGeometry(1,18,10),flap,[0,.36,-.36],[.23,.09,.135],null,pack);
    mesh(new THREE.SphereGeometry(1,14,10),flap,[0,.06,-.49],[.14,.11,.05],null,pack);
    mesh(new THREE.CylinderGeometry(.075,.075,.56,16),blanket,[0,.47,-.33],null,[0,0,Math.PI/2],pack);
    for(const s of[-1,1]){mesh(new THREE.TorusGeometry(.076,.008,6,16),flap,[s*.17,.47,-.33],null,[0,Math.PI/2,0],pack);mesh(new THREE.SphereGeometry(1,12,8),canvas,[s*.25,.12,-.36],[.05,.12,.08],null,pack);}
    mesh(new THREE.CylinderGeometry(.04,.035,.07,12),metal,[.27,.0,-.36],null,null,pack);
    // shoulder straps over the vest, with a chest clip
    for(const s of[-1,1]){const pts=[[s*.15,.42,-.24],[s*.18,.53,-.02],[s*.165,.43,.24],[s*.16,.2,.285],[s*.165,-.02,.285]].map(p=>new THREE.Vector3(...p));
      const sg=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.024,6,false);sg.scale(1,1,.55);mesh(sg,flap,null,null,null,pack);mesh(new THREE.BoxGeometry(.05,.03,.012),metal,[s*.163,.05,.292],null,null,pack);}
    mesh(new THREE.BoxGeometry(.3,.02,.01),flap,[0,.24,.29],null,null,pack);
    // A second, packed-away rod rides diagonally on the backpack while walking by the creek.
    const packRod=new THREE.Group();packRod.name='father packed rod';packRod.position.set(.16,.05,-.44);packRod.rotation.set(-.12,0,.42);pack.add(packRod);
    mesh(new THREE.CylinderGeometry(.006,.014,1.25,8),keep(std(0x4d5f3a,{roughness:.45})),[0,.45,0],null,null,packRod);
    mesh(new THREE.CylinderGeometry(.02,.022,.22,10),cork,[0,-.2,0],null,null,packRod);
    mesh(new THREE.CylinderGeometry(.035,.035,.025,14),metal,[0,-.06,.035],null,[0,0,Math.PI/2],packRod);
    const all={rod,stick,lantern,beam,pack,packRod};let tool='axe',packOn=false,beamOn=false,lanternOn=false,rodOnPack=false,t=0,swing=0,lastX=null,lastZ=null;
    const _q=new THREE.Quaternion(),_r=new THREE.Quaternion(),_p=new THREE.Vector3();
    // set({tool:'axe'|'olta'|'cubuk'|'fener'|'none', backpack, light (path light + lantern), lantern, packRod})
    function set(o){o=o||{};if(o.tool!==undefined)tool=o.tool||'none';if(o.backpack!==undefined)packOn=!!o.backpack;if(o.light!==undefined)beamOn=!!o.light;if(o.lantern!==undefined)lanternOn=!!o.lantern;if(o.packRod!==undefined)rodOnPack=!!o.packRod;
      rod.visible=tool==='olta';stick.visible=tool==='cubuk';lantern.visible=tool==='fener'||beamOn||lanternOn;pack.visible=packOn;beam.visible=beamOn;packRod.visible=rodOnPack&&tool!=='olta';
      R.axe.scale.setScalar(tool==='axe'?AXE_S:1e-4);}
    set({tool:'axe',backpack:false,light:false});
    function update(dt){t+=dt;
      if(lantern.visible){R.root.getWorldQuaternion(_r);R.handL.getWorldQuaternion(_q);_q.invert().multiply(_r);lantern.quaternion.copy(_q);
        R.root.getWorldPosition(_p);const v=lastX===null||dt<=0?0:Math.hypot(_p.x-lastX,_p.z-lastZ)/dt;lastX=_p.x;lastZ=_p.z;swing+=(Math.min(1,v/4)-swing)*(1-Math.exp(-4*dt));
        lantern.rotateX(.10*swing*Math.sin(t*7.4));lantern.rotateZ(.05*Math.sin(t*1.7));lantern.updateMatrixWorld(true);
        glassMat.emissiveIntensity=1.5+.18*Math.sin(t*13)+.1*Math.sin(t*7.3);}
      if(beam.visible){const f=.94+.04*Math.sin(t*9.1)+.02*Math.sin(t*3.3);pool.material.opacity=.52*f;cone.material.opacity=.15*f;}}
    function toast(k){k=sat(k);marshMat.color.setRGB(1-.18*k,.97-.40*k,.93-.62*k);}
    function dispose(){for(const o of Object.values(all))if(o.parent)o.parent.remove(o);geos.forEach(x=>x.dispose());mats.forEach(m=>m.dispose());}
    return {set,update,rodTip,toast,parts:all,get tool(){return tool;},get state(){return {tool,backpack:packOn,light:beamOn,lantern:lanternOn,packRod:rodOnPack};},dispose};
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
    const out=b.finish();let time=0,wingPhase=0,diveBlend=0,flapSpeed=4.6,bankBlend=0,neckFollow=0,carryBlend=0,perchBlend=0;
    out.update=(dt,state={})=>{dt=Math.max(0,Math.min(.1,dt));time+=dt;const blend=1-Math.exp(-12*dt),previousDive=diveBlend;diveBlend+=(sat(state.dive||0)-diveBlend)*blend;flapSpeed+=((state.flap||(state.fast?8.6:4.6))-flapSpeed)*blend;wingPhase+=dt*flapSpeed;
      const dive=diveBlend,beat=Math.sin(wingPhase),flap=(beat*.28+.12)*(1-dive*.72)*(1-.93*perchBlend),recovery=sat((previousDive-dive)*18),bankTarget=Math.max(-.16,Math.min(.16,state.bank||0));bankBlend+=(bankTarget-bankBlend)*(1-Math.exp(-7*dt));neckFollow+=(dive-neckFollow)*(1-Math.exp(-8*dt));carryBlend+=(sat(state.carry||0)-carryBlend)*(1-Math.exp(-6*dt));perchBlend+=(sat(state.perch||0)-perchBlend)*(1-Math.exp(-6*dt));const fold=perchBlend;
      body.rotation.set(-.17*dive+.024*Math.sin(time*2.1)+.028*beat*(1-dive)-.42*perchBlend,bankBlend*.20,bankBlend+.012*Math.sin(wingPhase-.35)*(1-dive));
      neck.rotation.set(-.13*neckFollow,.022*Math.sin(time*.9)*(1-dive),-bankBlend*.18);
      head.rotation.set(.51*dive-.075*recovery,.045*Math.sin(time*.8)*(1-dive)-bankBlend*.32,-bankBlend*.38);
      tail.rotation.set(.16*dive+.045*Math.sin(wingPhase-.85)*(1-dive)+.06*recovery,-bankBlend*.32,-bankBlend*.28);
      for(const wing of wings){const downstroke=Math.max(0,-Math.cos(wingPhase));wing.shoulder.rotation.set(.024*beat*(1-dive),wing.side*(.055*dive+.015*recovery+1.15*fold),wing.side*(-flap+.38*dive+.22*fold)-bankBlend*.18);
        // Wrists lag the shoulder through the upstroke; primaries flex rather than flap as a plank.
        wing.wrist.rotation.set(.045*Math.sin(wingPhase-.55)*(1-dive),wing.side*(-.13*dive+.045*downstroke*(1-dive)+1.2*fold),wing.side*((Math.sin(wingPhase-.38)*.28+.12)*.48*(1-dive*.72)+.19*dive));}
      for(let i=0;i<tailFeathers.length;i++){const f=tailFeathers[i],spread=.028+.075*(1-dive)+.028*recovery;f.rotation.set(.012*Math.sin(wingPhase-.5+i*.11)*(1-dive),(i-3)*spread,-bankBlend*.08);}
      for(let i=0;i<talons.length;i++){const t=talons[i];t.rotation.set(-.24+.76*dive+.62*carryBlend+.30*perchBlend-.06*recovery+.014*Math.sin(wingPhase+i*Math.PI)*(1-dive),0,(i===0?-1:1)*.020*(1-dive));}
      root.updateMatrixWorld(true);
    };out.update(0);return out;
  }
  return {father,eagle};
})();
