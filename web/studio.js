import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// This extension is ONLY for the H3 Director Studio V1 node. It does not patch
// Motion Context, samplers, models, reference loaders, or installed custom nodes.
const TYPE = 'H3DirectorStudioV1';
const ID = { resolution: 73, baseSteps: 71, upscaleSteps: 135,
             upscaler: 101, baseSampler: 58, upscaleSampler: 136,
             seed: 63, chain: 150, load: 148, save: 149,
             preview: 173, final: 115 };
const HEADER = /^[ \t]*\[\s*SEGMENT\s+(\d+)\s*\][ \t]*$/gim;
const $ = (tag, css={}, txt=null) => {
  const el = document.createElement(tag);
  Object.assign(el.style, css);
  if (txt !== null) el.textContent = txt;
  return el;
};
const colors = {
  bg:'var(--h3-bg, #252c34)', panel:'var(--h3-card, #303946)',
  field:'var(--h3-field, #191f26)', line:'var(--h3-line, #525d6b)',
  fg:'var(--h3-fg, #f1f3f6)', sub:'var(--h3-sub, #abb7c5)',
  warn:'#ffd386', green:'#96e1ae'
};
const parseColor=(v)=>{
  const str=String(v??'').trim();
  if(/^#[0-9a-f]{3}$/i.test(str))return [1,2,3].map(i=>parseInt(str[i]+str[i],16));
  if(/^#[0-9a-f]{6}$/i.test(str))return [1,3,5].map(i=>parseInt(str.slice(i,i+2),16));
  const m=str.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
  return m?[m[1],m[2],m[3]].map(Number):null;
};
const mix=(a,b,t)=>`rgb(${a.map((v,i)=>Math.round(v*(1-t)+b[i]*t)).join(', ')})`;
function updateTheme(node,panel){
  // The custom HTML is not part of ComfyUI's built-in node painting.
  // Synchronize CSS properties when the native node palette changes.
  const key=`${node.bgcolor||''}|${node.color||''}`;
  if(panel.__h3ColorKey===key)return;
  panel.__h3ColorKey=key;
  const base=parseColor(node.bgcolor)||parseColor(node.color)||[37,44,52];
  const light=(base[0]*299+base[1]*587+base[2]*114)/1000>158;
  const other=light?[0,0,0]:[255,255,255];
  panel.style.setProperty('--h3-bg',mix(base,base,0));
  panel.style.setProperty('--h3-card',mix(base,other,light?0.045:0.095));
  panel.style.setProperty('--h3-field',mix(base,light?[255,255,255]:[0,0,0],light?0.18:0.30));
  panel.style.setProperty('--h3-button',mix(base,other,light?0.08:0.15));
  panel.style.setProperty('--h3-line',mix(base,other,light?0.28:0.34));
  panel.style.setProperty('--h3-fg',light?'#131820':'#f1f3f6');
  panel.style.setProperty('--h3-sub',light?'#424b57':'#bdc8d5');
}
// Keep the three output sockets usable but out of LiteGraph's default slot-flow,
// which otherwise reserves ~140px of empty header above the DOM panel.
function anchorOutputs(node){
  const width=node.size?.[0]??1050;
  node.outputs?.forEach((slot,i)=>{
    const pos=[width+1,45+i*22];
    if(!Array.isArray(slot.pos)||slot.pos[0]!==pos[0]||slot.pos[1]!==pos[1])slot.pos=pos;
  });
}
const S = {
  btn: {background:'var(--h3-button, #334454)',border:`1px solid ${colors.line}`,color:colors.fg,
    borderRadius:'5px',fontSize:'12px',padding:'6px 9px',cursor:'pointer'},
  input: {width:'100%',boxSizing:'border-box',minWidth:'0',padding:'6px 8px',
    borderRadius:'5px',background:colors.field,color:colors.fg,border:`1px solid ${colors.line}`,fontSize:'13px'},
  text: {width:'100%',boxSizing:'border-box',resize:'vertical',padding:'8px',
    background:colors.field,color:colors.fg,border:`1px solid ${colors.line}`,
    borderRadius:'5px',font:'13px/1.5 sans-serif'},
  caption: {fontSize:'11px',color:colors.sub},
};
function decode(raw) {
  const text = String(raw ?? '');
  const matches = [...text.matchAll(HEADER)];
  if (!matches.length || text.slice(0,matches[0].index).trim()) return null;
  const shots=[];
  for (let i=0;i<matches.length;i++) {
    if (Number(matches[i][1]) !== i+1) return null;
    const end = i+1<matches.length ? matches[i+1].index:text.length;
    shots.push(text.slice(matches[i].index+matches[i][0].length,end).trim());
  }
  return shots;
}
const encode = shots => shots.map((shot,i)=>`[SEGMENT ${i+1}]\n${shot??''}`).join('\n\n');
// Technical nodes are no longer in the canvas: virtual read/write adapters map
// the original Studio UI to persistent widgets on the integrated Director.
let studioVirtualNodes = new Map();
const graphNode = id => studioVirtualNodes.get(id) ?? null;
function widget(node,name,idx=null) {
  if (!node) return null;
  return node.widgets?.find(w=>w.name===name) ?? (idx===null?null:node.widgets?.[idx]) ?? null;
}
function setNative(id,name,value,idx=null) {
  const n=graphNode(id), w=widget(n,name,idx);
  if (!w) return false;
  if (w.value !== value) {
    w.value=value;
    try { w.callback?.(value, app.canvas, n); }
    catch(e) { console.warn('[H3 Studio] Native widget callback:', id,name,e); }
    app.graph?.setDirtyCanvas?.(true,true);
  }
  return true;
}
const getNative=(id,name,idx=null)=>widget(graphNode(id),name,idx)?.value;
const button=(name, onclick, parent, style={})=>{
  const b=$('button',{...S.btn,...style},name);
  b.type='button'; b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();onclick();});
  parent.append(b); return b;
};
const label=(name)=>$('div',{fontSize:'12px',color:colors.sub,marginBottom:'3px'},name);
function item(parent,name,control) {
  const box=$('div',{flex:'1 1 140px',minWidth:'115px'});
  box.append(label(name),control);parent.append(box);return box;
}
function line(parent) { parent.append($('div',{height:'1px',background:colors.line,margin:'8px 0'})); }
function headline(parent,title) {parent.append($('div',{color:colors.fg,fontSize:'14px',fontWeight:'bold',margin:'7px 0 6px'},title));}
const row=parent=>{const r=$('div',{display:'flex',gap:'9px',flexWrap:'wrap',alignItems:'end'});parent.append(r);return r;};
function input(type,min,max,step) {
  const el=$('input',S.input);el.type=type;
  if(min!=null)el.min=String(min);if(max!=null)el.max=String(max);
  if(step!=null)el.step=String(step);return el;
}
function select(options) {
  const el=$('select',S.input);
  for(const [value,text] of options) { const op=$('option',{},text);op.value=value;el.append(op); }
  return el;
}
function heading(parent,text) {parent.append($('div',{fontSize:'17px',fontWeight:'700',color:colors.fg},text));}
function mirror(node) {
  if (node.__h3studio) return;
  const source={};
  for (const name of ['general_prompt','segments_text','project_key','production_mode',
    'render_mode','duration_s','ratio','megapixels','base_steps','refine_steps',
    'upscale_multiplier','clip_index','h3_rng_value','seed_mode',
    'base_sampler','base_scheduler','upscale_sampler','upscale_scheduler','upscaler_model']) {
    source[name]=node.widgets?.find(w=>w.name===name);
    if (!source[name]) {console.warn('[H3 Studio] Missing persistent widget:',name);return;}
    // Keep the persistent backend value/serialization while removing the DOM canvas space.
    source[name].hidden=true;
    source[name].options??={};source[name].options.hidden=true;
    source[name].computeSize=()=>[0,-4];
    for(const key of ['element','inputEl'])if(source[name][key]?.style)source[name][key].style.display='none';
  }
  // Virtual widget bridge. All values are serialized ON the Studio node,
  // not synchronized into external sampler, scheduler or chain nodes.
  const valueWidget=(name,options=null,transform=null)=>{
    const w={name, options:{values:options??[]}};
    Object.defineProperty(w,'value',{
      get:()=>transform?.get ? transform.get() : source[name]?.value,
      set:v=>{ if(transform?.set) transform.set(v);
               else if(source[name]){source[name].value=v;source[name].callback?.(v);} },
    });
    return w;
  };
  const virtual=(id, entries)=>{
    const n={widgets:entries,mode:0};studioVirtualNodes.set(id,n);return n;
  };
  const RATIO_CHOICES=['1:1 (Square)','2:3 (Portrait Photo)','3:2 (Photo)',
    '3:4 (Portrait Standard)','4:3 (Standard)','9:16 (Portrait Widescreen)',
    '16:9 (Widescreen)','21:9 (Ultrawide)'];
  const SAMPLER_CHOICES=['euler','euler_ancestral','heun','dpm_2','dpm_2_ancestral',
    'lms','dpmpp_2m','dpmpp_2m_sde','res_multistep','uni_pc','ddim'];
  const SCHEDULERS=['simple','normal','karras','exponential','sgm_uniform','ddim_uniform','beta','linear_quadratic'];
  const UPSCALER_MODELS=[]; // Listado real de MinimaxH3LatentUpscaler3D, NO una lista fija.
  // H3 V1: Unlike the old fixed eleven-item list, mirror the native ComfyUI
  // KSamplerSelect and BasicScheduler definitions. Both choices update together.
  // This is FRONTEND ONLY: model graph, saved values and sampling engine unchanged.
  const replaceChoiceValues=(target,values)=>{
    const valid=Array.isArray(values) ? values.filter(v=>typeof v==='string' && v.trim()) : [];
    if(valid.length)target.splice(0,target.length,...new Set(valid));
  };
  const getNodeOptions=(defs,nodeName,inputName)=>{
    const input=defs?.[nodeName]?.input;
    const field=input?.required?.[inputName] ?? input?.optional?.[inputName];
    const names=Array.isArray(field) ? field[0] : null;
    return Array.isArray(names) ? names : [];
  };

  virtual(ID.resolution,[valueWidget('aspect_ratio',RATIO_CHOICES,{get:()=>source.ratio.value,set:v=>source.ratio.value=v}),
    valueWidget('megapixels',[],{get:()=>source.megapixels.value,set:v=>source.megapixels.value=v})]);
  virtual(ID.baseSteps,[valueWidget('scheduler',SCHEDULERS,{get:()=>source.base_scheduler.value,set:v=>source.base_scheduler.value=v}),
    valueWidget('steps',[],{get:()=>source.base_steps.value,set:v=>source.base_steps.value=v})]);
  virtual(ID.upscaleSteps,[valueWidget('scheduler',SCHEDULERS,{get:()=>source.upscale_scheduler.value,set:v=>source.upscale_scheduler.value=v}),
    valueWidget('steps',[],{get:()=>source.refine_steps.value,set:v=>source.refine_steps.value=v})]);
  virtual(ID.baseSampler,[valueWidget('sampler_name',SAMPLER_CHOICES,{get:()=>source.base_sampler.value,set:v=>source.base_sampler.value=v})]);
  virtual(ID.upscaleSampler,[valueWidget('sampler_name',SAMPLER_CHOICES,{get:()=>source.upscale_sampler.value,set:v=>source.upscale_sampler.value=v})]);
  virtual(ID.upscaler,[valueWidget('model_name',UPSCALER_MODELS,{get:()=>source.upscaler_model.value,set:v=>source.upscaler_model.value=v})]);
  virtual(ID.seed,[valueWidget('h3_rng_value',[],{get:()=>source.h3_rng_value.value,set:v=>source.h3_rng_value.value=v}),
    valueWidget('control_after_generate',['randomize','fixed'],{get:()=>source.seed_mode.value,set:v=>source.seed_mode.value=v})]);
  virtual(ID.load,[valueWidget('latent_path',[],{get:()=>source.project_key.value,set:v=>source.project_key.value=v}),
    valueWidget('clip_index',[],{get:()=>Math.max(0,Number(source.clip_index.value)-1),
      set:v=>source.clip_index.value=Number(v)+1})]);
  virtual(ID.save,[valueWidget('filename_prefix',[],{get:()=>`${source.project_key.value}/clip`,set:()=>{}}),
    valueWidget('clip_index',[],{get:()=>Number(source.clip_index.value),set:v=>source.clip_index.value=Number(v)})]);
  virtual(ID.preview,[]); virtual(ID.final,[]);
  const chainMeta={awaiting:false,chaining:false,remaining:0};
  virtual(ID.chain,[valueWidget('segments',[],{get:()=>chainMeta.remaining,set:v=>chainMeta.remaining=Number(v)})])._h3mc=chainMeta;
  let chainRunOwner=false;
  // The Studio becomes the source of truth; the on-disk latent slot remains
  // handled by the existing Motion Context plugin in the internal runtime graph.
  const hideNativeWidgets=()=>{
    for (const w of node.widgets ?? []) {
      if(w.name==='h3_full_director_panel')continue;
      if(w.element?.classList?.contains('h3-director-v7-ui'))continue;
      w.hidden=true;
      w.options??={};w.options.hidden=true;
      w.computeSize=()=>[0,-4];
      for(const key of ['element','inputEl'])if(w[key]?.style)w[key].style.display='none';
    }
  };
  hideNativeWidgets();
  const state=()=>Object.fromEntries(Object.keys(source).map(k=>[k,source[k].value]));
  function keep(name,v) {source[name].value=v;source[name].callback?.(v);app.graph?.setDirtyCanvas?.(true,true);}
  // Keep the panel inside the node's resize borders.  In V8 the DOM widget had
  // zero margin and occupied the entire canvas hit area, intercepting corner drags.
  const panel=$('div',{display:'flex',flexDirection:'column',gap:'6px',boxSizing:'border-box',
    padding:'11px',width:'100%',height:'100%',overflowY:'auto',borderRadius:'3px',
    position:'relative',minWidth:'0',minHeight:'0',
    background:colors.bg,fontFamily:'Arial, sans-serif',color:colors.fg});
  updateTheme(node,panel);
  anchorOutputs(node);
  const priorResize=node.onResize;
  node.onResize=function(){const r=priorResize?.apply(this,arguments);anchorOutputs(this);return r;};
  const title=$('div',{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'});
  const txt=$('div');heading(txt,'H3 DIRECTOR STUDIO');txt.append($('div',S.caption,'MiniMax H3 · Base + Upscale · Motion Context Chain'));
  title.append(txt,$('span',{...S.caption,color:colors.green},'Latent 3D Upscale'));panel.append(title);
  const warning=$('div',{fontSize:'12px',color:colors.warn,minHeight:'16px'});

  headline(panel,'PROJECT & CHAIN');
  let r=row(panel);
  const project=input('text');item(r,'Project / continuity folder',project);
  // Run/Re-roll generates one selected clip; Chain generates a sequence. No separate production mode dropdown.
  const count=$('span',{fontSize:'12px',color:colors.sub});
  const status=$('div',{fontSize:'12px',color:colors.green,marginTop:'2px'});
  const actions=row(panel);
  const run=button('▶ Run / Re-roll',()=>dispatch('Run/Re-roll'),actions);
  const approve=button('✓ Approve',()=>dispatch('Approve'),actions);
  const chain=button('▶▶ Chain',()=>dispatch('Chain'),actions,{background:'#235844'});
  const reset=button('↺ Reset indices',()=>{
    if (window.confirm('Reset to Load 0 / Save 1? Existing latent files are kept.')) dispatch('Reset');
  },actions);
  button('Clear latents',()=>{
    if(window.confirm('Delete numbered latent files for the current project? This breaks existing continuity.') &&
       window.confirm('Confirm permanent deletion of numbered latent files.')) dispatch('Clear latents');
  },actions,{background:'#663b40'});
  const jump=row(panel);
  const clipPicker=select([]);
  item(jump,'Select clip to generate / re-roll',clipPicker);
  button('Set clip (no render)',()=>selectClip(),jump);
  const clipHint=$('span',{...S.caption,alignSelf:'center'},'For clip N, Load = N−1 / Save = N.');
  jump.append(clipHint);
  panel.append(status,count,warning);

  // Integrated live monitor: passive progress and KJ Preview Override events.
  line(panel);headline(panel,'LIVE GENERATION MONITOR');
  const mon=$('section',{background:colors.panel,border:'1px solid '+colors.line,borderRadius:'7px',padding:'8px',display:'flex',flexDirection:'column',gap:'6px'});
  const monInfo=$('div',{...S.caption},'Ready · no active render');
  const monTrack=$('div',{height:'8px',width:'100%',background:colors.field,borderRadius:'5px',overflow:'hidden'});
  const monFill=$('div',{height:'100%',width:'0%',background:'#39a978',transition:'width 120ms linear'});monTrack.append(monFill);
  const monImage=$('img',{width:'100%',height:'auto',maxHeight:'290px',objectFit:'contain',display:'none',background:'#12151a'});
  const monVideo=$('video',{width:'100%',height:'auto',maxHeight:'290px',objectFit:'contain',display:'none',background:'#12151a'});
  monVideo.autoplay=true;monVideo.muted=true;monVideo.loop=true;monVideo.playsInline=true;monVideo.controls=false;
  const monPlaceholder=$('div',{...S.caption,textAlign:'center',padding:'15px'},'Waiting for KJ Preview Override frames');
  const monFooter=$('div',{...S.caption},'ComfyUI progress + KJ Preview Override media');
  mon.append(monInfo,monTrack,monVideo,monImage,monPlaceholder,monFooter);
  const monDetails=$('details',{open:true});
  monDetails.append($('summary',{fontSize:'12px',cursor:'pointer',fontWeight:'bold'},'Monitor / Preview'),mon);panel.append(monDetails);
  let monURL=null,monStart=0,monPct=0;
  function monitorSetStatus(message,pct){monInfo.textContent=message;if(Number.isFinite(pct))monPct=Math.max(0,Math.min(100,pct));monFill.style.width=monPct+'%';}
  function monitorBegin(){monStart=Date.now();monPct=0;monImage.style.display='none';monVideo.style.display='none';monPlaceholder.style.display='block';try{monVideo.pause();}catch{}monitorSetStatus('Rendering clip '+source.clip_index.value+' of '+shots.length+' · starting',0);}
  function monitorEnd(ok){const elapsed=monStart?' · '+Math.round((Date.now()-monStart)/1000)+'s':'';monitorSetStatus((ok?'Completed':'Stopped / error')+' · clip '+source.clip_index.value+elapsed,ok?100:monPct);}
  function monitorShowMedia(blob,mime){
    const prior=monURL;monURL=URL.createObjectURL(blob);
    if(mime==='video/mp4'){monImage.style.display='none';monVideo.src=monURL;monVideo.style.display='block';const play=monVideo.play?.();if(play?.catch)play.catch(()=>{});}
    else{try{monVideo.pause();}catch{}monVideo.removeAttribute('src');monVideo.load?.();monImage.src=monURL;monImage.style.display='block';monVideo.style.display='none';}
    monPlaceholder.style.display='none';if(prior)URL.revokeObjectURL(prior);
  }
  function monitorDecodeKJ(data,mime){
    if(!['image/jpeg','image/png','image/webp','video/mp4'].includes(mime))return null;
    if(typeof data!=='string'||data.length>34000000)return null;
    try{const binary=atob(data),chunks=[];for(let i=0;i<binary.length;i+=32768){const part=binary.slice(i,i+32768),bytes=new Uint8Array(part.length);for(let j=0;j<part.length;j++)bytes[j]=part.charCodeAt(j);chunks.push(bytes);}return new Blob(chunks,{type:mime});}catch(_){return null;}
  }
  // Passive listeners are intentional: KJ events can be emitted by hidden expanded nodes.
  const monitorProgress=e=>{const d=e?.detail??{},step=Number(d.value),max=Number(d.max);const pct=max>0&&Number.isFinite(step)?Math.round(100*step/max):monPct;monitorSetStatus('Clip '+source.clip_index.value+'/'+shots.length+' · sampling '+(Number.isFinite(step)?step:'?')+' / '+(max>0?max:'?')+' ('+pct+'%)',pct);};
  const monitorExecuting=e=>{if(e?.detail?.node!=null)monFooter.textContent='Executing node '+e.detail.node+' · waiting for KJ preview';};
  const monitorPreview=e=>{const d=e?.detail,blob=d instanceof Blob?d:(d?.blob instanceof Blob?d.blob:null);if(blob)monitorShowMedia(blob,blob.type||'image/jpeg');};
  const monitorKJPreview=e=>{
    const d=e?.detail??{};if(!d.image)return;
    const mime=String(d.mime||'image/jpeg'),step=Number(d.step),max=Number(d.total);
    if(Number.isFinite(step)&&max>0){const pct=Math.max(monPct,Math.round(100*step/max));monitorSetStatus('Clip '+source.clip_index.value+'/'+shots.length+' · sampling '+step+' / '+max+' ('+pct+'%)',pct);}
    monFooter.textContent='KJ Preview Override'+(d.node_id!=null?' · node '+d.node_id:'')+(Number.isFinite(step)&&max>0?' · step '+step+'/'+max:'');
    const blob=monitorDecodeKJ(d.image,mime);if(blob)monitorShowMedia(blob,mime);
  };
  api.addEventListener('progress',monitorProgress);api.addEventListener('executing',monitorExecuting);api.addEventListener('b_preview',monitorPreview);api.addEventListener('kj_preview_override',monitorKJPreview);
  node.__h3MonitorCleanup=()=>{
    api.removeEventListener('progress',monitorProgress);api.removeEventListener('executing',monitorExecuting);api.removeEventListener('b_preview',monitorPreview);api.removeEventListener('kj_preview_override',monitorKJPreview);
    if(monURL)URL.revokeObjectURL(monURL);monURL=null;try{monVideo.pause();}catch{}monVideo.removeAttribute('src');
  };

  line(panel);headline(panel,'VIDEO · BASE PASS');
  r=row(panel);
  const duration=input('number',0.5,180,0.5);item(r,'Duration per clip · seconds',duration);
  const ratio=select([]);item(r,'Aspect ratio',ratio);
  const mp=input('number',0.05,4,0.05);item(r,'Base resolution · MP',mp);
  r=row(panel);
  const base=input('number',1,100,1);item(r,'Base steps',base);
  const seed=input('number',0,Number.MAX_SAFE_INTEGER,1);item(r,'Seed',seed);
  const seedMode=select([['randomize','Randomize'],['fixed','Fixed']]);item(r,'Seed behavior',seedMode);
  button('Lock current seed',()=>{
    const current=getNative(ID.seed,'h3_rng_value',0);
    if(current===undefined)return;
    if (!setNative(ID.seed,'control_after_generate','fixed',1)) {
      warning.textContent='Cannot lock seed: RandomNoise mode widget is missing.';return;
    }
    seed.value=String(current);seedMode.value='fixed';
  },r);
  line(panel);headline(panel,'UPSCALE & OUTPUT');
  r=row(panel);
  const renderMode=select([['Final','Final — base + upscale'],['Preview base','Preview — base only']]);item(r,'Render mode',renderMode);
  const refine=input('number',1,100,1);item(r,'Upscale steps',refine);
  const scale=input('number',1,3,0.05);item(r,'Latent 3D multiplier',scale);
  // ADVANCED SETTINGS: expose the existing native widgets, do not replace any of their nodes.
  // Each native widget is serialized by ComfyUI in its original node; this panel is only a mirror.
  line(panel);
  const advanced=$('details',{background:colors.panel,border:`1px solid ${colors.line}`,borderRadius:'7px',padding:'8px 10px'});
  const summary=$('summary',{cursor:'pointer',fontSize:'13px',fontWeight:'bold',padding:'5px 1px'},'ADVANCED SETTINGS · SAMPLERS, SCHEDULERS & UPSCALER');
  advanced.append(summary);
  const advDescription=$('div',{...S.caption,margin:'7px 0'},'Optional technical choices. These settings are stored inside the Director. UPSCALE denoise remains fixed internally at 0.20.');
  advanced.append(advDescription);
  const advancedRows=row(advanced);
  panel.append(advanced);
  const advancedFields=[
    {id:ID.baseSampler,name:'sampler_name',index:0,label:'Base sampler',fallback:['euler']},
    {id:ID.baseSteps,name:'scheduler',index:0,label:'Base scheduler',fallback:['simple']},
    {id:ID.upscaler,name:'model_name',index:0,label:'Latent 3D upscaler model',fallback:['minimax_h3_latent_upscaler_3d_conv_v1_fp16.safetensors']},
    {id:ID.upscaleSampler,name:'sampler_name',index:0,label:'Upscale sampler',fallback:['res_multistep']},
    {id:ID.upscaleSteps,name:'scheduler',index:0,label:'Upscale scheduler',fallback:['simple']},
  ];
  for(const f of advancedFields){
    f.control=select([]);
    item(advancedRows,f.label,f.control);
    f.control.addEventListener('change',()=>{
      if(active()){
        warning.textContent='Wait until Motion Context Chain finishes before changing advanced settings.';
        refreshAdvanced();return;
      }
      const requested=f.control.value;
      if(!setNative(f.id,f.name,requested,f.index)){
        warning.textContent=`Cannot update ${f.label}: native node #${f.id} is unavailable.`;
        return;
      }
      // Read back the authoritative native widget: never silently claim
      // a changed sampler or scheduler if the backend widget rejected it.
      const actual=String(getNative(f.id,f.name,f.index)??'');
      if(actual!==requested){
        warning.textContent=`${f.label} did not synchronize with node #${f.id} (current: ${actual}).`;
        refreshAdvanced();return;
      }
      warning.textContent='';
    });
  }
  function refreshAdvanced(){
    for(const f of advancedFields){
      const w=widget(graphNode(f.id),f.name,f.index);
      if(!w)continue;
      const optionsRaw=w.options?.values;
      const choices=Array.isArray(optionsRaw)?optionsRaw:
        (Array.isArray(optionsRaw?.values)?optionsRaw.values:[]);
      const current=String(w.value??'');
      const names=[...new Set([...choices.map(String),...f.fallback,current].filter(Boolean))];
      const sig=names.join('\u0000');
      if(f.listSignature!==sig){
        f.control.replaceChildren();
        for(const name of names){const o=$('option',{},name);o.value=name;f.control.append(o);}
        f.listSignature=sig;
      }
      if(document.activeElement!==f.control)f.control.value=current;
    }
  }

  // H3_V1_SAMPLERS_LIVE_V2: native sampler/scheduler options, requested from
  // the ComfyUI server. Visible status prevents silent fallback to 11 values.
  const samplerStatus=$('div',{...S.caption,margin:'6px 0 2px'},
    'Samplers V1 v2 · consultando opciones de ComfyUI…');
  advanced.append(samplerStatus);
  const upscalerStatus=$('div',{...S.caption,margin:'2px 0 2px'},
    'Modelos UPSCALE · consultando ComfyUI…');
  advanced.append(upscalerStatus);
  const namesFrom=(data,nodeName,inputName)=>getNodeOptions(data,nodeName,inputName);
  let retrievingChoices=false;
  let hasFullSamplers=false;
  async function fetchDefinitions(url){
    if(typeof api.fetchApi!=='function')throw new Error('ComfyUI api.fetchApi is unavailable');
    const response=await api.fetchApi(url);
    if(!response?.ok)throw new Error(`${url}: HTTP ${response?.status??'unknown'}`);
    return await response.json();
  }
  async function loadNativeChoices(){
    if(retrievingChoices)return;
    retrievingChoices=true;
    if(!hasFullSamplers)samplerStatus.textContent='Samplers V1 v2 · consultando opciones de ComfyUI…';
    let samplers=[],schedulers=[];
    const errors=[];
    try{
      // Query the precise node route FIRST: getNodeDefs() can be partial or stale.
      // KSamplerSelect is exactly the node executed by the internal BASE/UPSCALE.
      for(const [url,nodeName] of [
        ['/object_info/KSamplerSelect','KSamplerSelect'],
        ['/object_info','KSamplerSelect'],
        ['/object_info/KSampler','KSampler'],
      ]){
        try{
          const defs=await fetchDefinitions(url);
          const found=namesFrom(defs,nodeName,'sampler_name');
          if(found.length>samplers.length)samplers=found;
          if(samplers.length>11)break;
        }catch(e){errors.push(String(e));}
      }
      for(const [url,nodeName] of [
        ['/object_info/BasicScheduler','BasicScheduler'],
        ['/object_info/KSampler','KSampler'],
      ]){
        try{
          const defs=await fetchDefinitions(url);
          const found=namesFrom(defs,nodeName,'scheduler');
          if(found.length>schedulers.length)schedulers=found;
          if(schedulers.length)break;
        }catch(e){errors.push(String(e));}
      }
      if((!samplers.length||!schedulers.length)&&typeof api.getNodeDefs==='function'){
        try{
          const defs=await api.getNodeDefs();
          if(!samplers.length)samplers=namesFrom(defs,'KSamplerSelect','sampler_name');
          if(!schedulers.length)schedulers=namesFrom(defs,'BasicScheduler','scheduler');
        }catch(e){errors.push(String(e));}
      }
      if(samplers.length){
        replaceChoiceValues(SAMPLER_CHOICES,samplers);
        hasFullSamplers=samplers.length>11;
      }
      if(schedulers.length)replaceChoiceValues(SCHEDULERS,schedulers);
      refreshAdvanced();
      const count=SAMPLER_CHOICES.length;
      samplerStatus.textContent=hasFullSamplers
        ? `Samplers V1 v2 · ${count} disponibles en ComfyUI · ${SCHEDULERS.length} schedulers`
        : `Samplers V1 v2 · solo ${count} disponibles; revisa la consola (F12). Al reabrir este panel se vuelve a consultar.`;
      if(!hasFullSamplers)console.warn('[H3 Studio V1 samplers v2] Incomplete options:',{samplers,schedulers,errors});
    }catch(error){
      samplerStatus.textContent='Samplers V1 v2 · error al consultar ComfyUI (F12 para detalles)';
      console.warn('[H3 Studio V1 samplers v2] Unexpected options error',error);
    }finally{retrievingChoices=false;}
  }
  advanced.addEventListener('toggle',()=>{if(advanced.open)void loadNativeChoices();});
  void loadNativeChoices();

  // H3_V1_UPSCALER_MODELS_LIVE_V2: same live-choice mechanism as the working
  // sampler controls, but queried independently, so sampler fetches cannot block it.
  // The model directory endpoint is queried FIRST and we also compare node defs;
  // never stop on the first nonempty result (it may contain just one model).
  let loadingUpscalerModels=false;
  async function loadUpscalerModels(){
    if(loadingUpscalerModels)return;
    loadingUpscalerModels=true;
    upscalerStatus.textContent='Modelos UPSCALE v2 · consultando ComfyUI…';
    const errors=[];
    const candidates=[];
    const acceptedModel=(value)=>typeof value==='string' && /\.(?:safetensors|pth)$/i.test(value.trim());
    const addNames=(values,sourceName)=>{
      if(!Array.isArray(values))return;
      const valid=values.map(v=>typeof v==='string'?v.trim():null).filter(acceptedModel);
      if(valid.length)candidates.push({names:[...new Set(valid)],source:sourceName});
    };
    try{
      // This is the ComfyUI registered 'latent_upscale_models' model folder,
      // shared with the actual MinimaxH3LatentUpscaler3D node.
      try{
        const list=await fetchDefinitions('/models/latent_upscale_models');
        addNames(Array.isArray(list)?list:(list?.models??list?.filenames),'/models/latent_upscale_models');
      }catch(e){errors.push('models: '+String(e));}
      for(const url of ['/object_info/MinimaxH3LatentUpscaler3D','/object_info']){
        try{
          const defs=await fetchDefinitions(url);
          addNames(namesFrom(defs,'MinimaxH3LatentUpscaler3D','model_name'),url);
        }catch(e){errors.push(url+': '+String(e));}
      }
      if(typeof api.getNodeDefs==='function'){
        try{
          const defs=await api.getNodeDefs();
          addNames(namesFrom(defs,'MinimaxH3LatentUpscaler3D','model_name'),'api.getNodeDefs');
        }catch(e){errors.push('getNodeDefs: '+String(e));}
      }
      // Combine the model names reported by all sources. A short cached
      // object_info response must not hide models returned by the folder API.
      const names=[...new Set(candidates.flatMap(group=>group.names))];
      if(names.length){
        replaceChoiceValues(UPSCALER_MODELS,names);
        refreshAdvanced();
        upscalerStatus.textContent=`Modelos UPSCALE v2 · ${UPSCALER_MODELS.length} disponibles en ComfyUI`;
        upscalerStatus.title=candidates.map(g=>`${g.source}: ${g.names.length}`).join(' · ');
        console.info('[H3 V1 UPSCALE v2] Modelos:',UPSCALER_MODELS.slice(),upscalerStatus.title);
      }else{
        upscalerStatus.textContent='Modelos UPSCALE v2 · consulta sin modelos (F12)';
        console.warn('[H3 V1 UPSCALE v2] No models returned. Check folder and ComfyUI restart.',errors);
      }
    }catch(error){
      upscalerStatus.textContent='Modelos UPSCALE v2 · fallo de consulta (F12)';
      console.warn('[H3 V1 UPSCALE v2] Query error',error);
    }finally{loadingUpscalerModels=false;}
  }
  advanced.addEventListener('toggle',()=>{if(advanced.open)void loadUpscalerModels();});
  void loadUpscalerModels();

  line(panel);
  const globalSection=$('details',{background:colors.panel,border:`1px solid ${colors.line}`,borderRadius:'7px',padding:'8px 10px'});
  globalSection.append($('summary',{cursor:'pointer',fontSize:'13px',fontWeight:'bold',padding:'5px 1px'},'GLOBAL PROMPT · SHARED'));
  const general=$('textarea',{...S.text,minHeight:'160px',maxHeight:'600px',marginTop:'8px'});
  general.placeholder='Subject definitions, setting, sound and shared directions for all clips...';
  globalSection.append(general);panel.append(globalSection);
  line(panel);
  const shotsSection=$('details',{background:colors.panel,border:`1px solid ${colors.line}`,borderRadius:'7px',padding:'8px 10px'});
  shotsSection.open=true;
  shotsSection.append($('summary',{cursor:'pointer',fontSize:'13px',fontWeight:'bold',padding:'5px 1px'},'MULTI-SHOT · SEGMENT PROMPTS'));
  const bar=$('div',{display:'flex',gap:'7px',alignItems:'center',flexWrap:'wrap'});
  const boxes=$('div',{display:'flex',flexDirection:'column',gap:'7px',marginTop:'3px'});
  const raw=$('textarea',{...S.text,minHeight:'120px',display:'none'});
  button('+ Add segment',()=>{
    if (invalid) return;
    shots.push(''); expanded=shots.length-1;persistSegments();renderShots();
    boxes.querySelector('textarea')?.focus();
  },bar,{background:'#2b5747'});
  button('Reset to 4',()=>{
    if(!window.confirm('Reset to four EMPTY segments? All segment prompts in this Studio node will be lost.'))return;
    invalid=false;shots=['','','',''];expanded=0;persistSegments();renderShots();
  },bar);
  bar.append($('span',{...S.caption,marginLeft:'auto'},'Add only the segments you need'));
  shotsSection.append(bar,boxes,raw);panel.append(shotsSection);
  let shots=[],expanded=0,invalid=false;
  const slug=(v)=>String(v??'').trim().replace(/[^a-zA-Z0-9_\-/]/g,'_').replace(/\.{2,}/g,'_').replace(/^\/+|\/+$/g,'').slice(0,120);
  let busy=false;
  const syncChainCount=()=>{
    const total=shots.length;
    if(!active())setNative(ID.chain,'segments',total,0);
    const current=clipPicker.value;
    clipPicker.replaceChildren();
    for(let i=1;i<=shots.length;i++){
      const o=$('option',{},`Clip ${i}`);o.value=String(i);clipPicker.append(o);
    }
    const selected=Number(current);
    const {save}=readIndices();
    clipPicker.value=String(selected>=1&&selected<=shots.length?selected:
      Math.min(Math.max(1,save||1),shots.length));
    count.textContent=`${shots.length} segment prompt(s) · up to ${total} clip(s) configured`;
  };
  const syncProject=()=>{
    if(active())return;
    const name=slug(source.project_key.value);
    if (!name) {warning.textContent='Enter a valid project name.';return;}
    setNative(ID.load,'latent_path',name,0);
    setNative(ID.save,'filename_prefix',`${name}/clip`,0);
  };
  const syncControls=()=>{
    if (busy || !app.graph?.getNodeById?.(node.id) || active()) return;
    busy=true;
    try{
      const v=state();
      // Duration flows DIRECTLY as a FLOAT edge from Studio to the frame-count expression.
      setNative(ID.resolution,'aspect_ratio',v.ratio,0);
      setNative(ID.resolution,'megapixels',Number(v.megapixels),1);
      setNative(ID.baseSteps,'steps',Number(v.base_steps),1);
      setNative(ID.upscaleSteps,'steps',Number(v.refine_steps),1);
      // Latent multiplier flows DIRECTLY as a FLOAT edge to the upscale math and node.
      // The persistent Studio seed widget is authoritative.
      // Do not write it here: doing so would reset a randomized seed when
      // unrelated controls (MP, duration, steps, etc.) are changed.
      // The pre-refine saver and the final saver are already wired.
      // Mute the unused OUTPUT node so ComfyUI prunes its upstream branch.
      const p=graphNode(ID.preview),f=graphNode(ID.final);
      if(p && f) {
        p.mode=v.render_mode==='Preview base'?0:4;
        f.mode=v.render_mode==='Preview base'?2:0;
      }
      syncChainCount();syncProject();
    }finally{busy=false;}
    app.graph?.setDirtyCanvas?.(true,true);
  };
  const persistSegments=()=>{keep('segments_text',encode(shots));syncChainCount();};
  function renderShots(){
    boxes.replaceChildren();
    if(invalid){
      const error=$('div',{color:colors.warn,fontSize:'12px'},'Unrecognized segment format. Edit the raw text without losing your content.');
      boxes.append(error);raw.style.display='block';raw.value=String(source.segments_text.value??'');return;
    }
    raw.style.display='none';
    shots.forEach((value,i)=>{
      const outer=$('section',{border:`1px solid ${colors.line}`,borderRadius:'5px',overflow:'hidden',background:colors.panel});
      const head=$('div',{display:'flex',gap:'5px',alignItems:'center',padding:'5px'});
      button(`${expanded===i?'▼':'▶'} SEGMENT ${i+1} · ${value.trim()?'ready':'empty'}`,()=>{
        expanded=expanded===i?-1:i;renderShots();
      },head,{border:'none',background:'transparent',textAlign:'left',flex:'1',fontWeight:'bold'});
      const remove=button('Remove',()=>{
        if(shots.length===1)return;
        if(value.trim() && !window.confirm(`Delete SEGMENT ${i+1} and renumber later segments?`))return;
        shots.splice(i,1);expanded=Math.min(i,shots.length-1);persistSegments();renderShots();
      },head,{background:'#623a42'});
      remove.disabled=shots.length===1;
      outer.append(head);
      if(expanded===i){
        const area=$('textarea',{...S.text,margin:'0 7px 8px',width:'calc(100% - 14px)',minHeight:'165px',maxHeight:'440px'});
        area.value=value;area.placeholder='[SHOT 1]\nAction, expressions, dialogue, camera...';
        area.addEventListener('input',()=>{shots[i]=area.value;persistSegments();});
        area.addEventListener('keydown',e=>e.stopPropagation());outer.append(area);
      }
      boxes.append(outer);
    });
  }
  function active(){return Boolean(chainMeta.awaiting||chainMeta.chaining);}
  async function queueOnce(){
    if(chainMeta.awaiting)return false;
    if(!shots[Number(source.clip_index.value)-1]?.trim()){
      warning.textContent=`Segment ${source.clip_index.value} has no prompt.`;return false;
    }
    if(source.seed_mode.value==='randomize'){
      const values=new Uint32Array(2);crypto.getRandomValues(values);
      const next=(BigInt(values[0])<<32n)|BigInt(values[1]);
      // Use JS safe 53-bit precision, matching ComfyUI widget serialization.
      source.h3_rng_value.value=Number(next&((1n<<53n)-1n));
      seed.value=String(source.h3_rng_value.value);
    }
    chainMeta.awaiting=true;chainRunOwner=true;warning.textContent='';monitorBegin();
    try{await app.queuePrompt(0,1);return true;}
    catch(e){chainMeta.awaiting=false;chainMeta.chaining=false;chainRunOwner=false;
      warning.textContent=`Cannot queue clip: ${e.message}`;monitorEnd(false);return false;}
  }
  function completeQueue(ok){
    if(!chainRunOwner||!chainMeta.awaiting)return;
    chainMeta.awaiting=false;monitorEnd(ok);
    if(!ok){chainMeta.chaining=false;chainRunOwner=false;
      warning.textContent='Rendering failed or interrupted; Chain stopped.';return;}
    if(!chainMeta.chaining){chainRunOwner=false;refreshStatus();return;}
    const next=Number(source.clip_index.value)+1;
    if(next>shots.length){chainMeta.chaining=false;chainRunOwner=false;refreshStatus();return;}
    source.clip_index.value=next;expanded=next-1;renderShots();refreshStatus();
    queueOnce();
  }
  const onSuccess=()=>completeQueue(true);
  const onError=()=>completeQueue(false);
  api.addEventListener('execution_success',onSuccess);
  api.addEventListener('execution_error',onError);
  api.addEventListener('execution_interrupted',onError);
  async function nativeAction(action){
    if(action==='Stop'||(action==='Chain'&&chainMeta.chaining)){
      chainMeta.chaining=false;warning.textContent='Chain stops after the current clip.';return true;
    }
    if(action==='Reset'){
      source.clip_index.value=1;refreshStatus();return true;
    }
    if(action==='Clear latents'){
      try{
        const response=await api.fetchApi('/h3_motion_context/clear_latents',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({latent_path:source.project_key.value})});
        if(!response.ok)throw Error(`HTTP ${response.status}`);
        const data=await response.json();source.clip_index.value=1;
        warning.textContent=`Removed ${data.removed??0} continuity slots.`;refreshStatus();return true;
      }catch(e){warning.textContent=`Cannot clear latents: ${e.message}`;return false;}
    }
    if(chainMeta.awaiting)return false;
    if(action==='Approve'){
      const curr=Number(source.clip_index.value);
      if(curr>=shots.length)return false;
      if(!await slotExists(curr)){
        warning.textContent=`Clip ${curr} has no saved BASE latent.`;return false;
      }
      source.clip_index.value=curr+1;expanded=curr;renderShots();refreshStatus();
      return queueOnce();
    }
    if(action==='Chain'){
      const curr=Number(source.clip_index.value);
      const exists=await slotExists(curr);
      const first=(curr===1&&!exists)?1:curr+1;
      if(first>shots.length){warning.textContent='All segments already generated.';return false;}
      source.clip_index.value=first;expanded=first-1;renderShots();refreshStatus();
      chainMeta.chaining=true;return queueOnce();
    }
    return queueOnce();
  }
  async function slotExists(slot){
    const path=getNative(ID.load,'latent_path',0);
    const response=await api.fetchApi('/h3_motion_context/slot_exists',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({latent_path:path||'h3_context',clip_index:slot})
    });
    if(!response.ok)throw Error(`Slot check returned HTTP ${response.status}`);
    const data=await response.json();
    return Boolean(data.exists);
  }
  function readIndices(){
    return {load:Number(getNative(ID.load,'clip_index',1)),
            save:Number(getNative(ID.save,'clip_index',1))};
  }
  async function selectClip(){
    if(active()){warning.textContent='Stop the active Chain before selecting another clip.';return;}
    const clip=Number(clipPicker.value);
    if(!Number.isInteger(clip)||clip<1||clip>shots.length){
      warning.textContent='Choose an existing segment.';return;
    }
    if(clip>1){
      try{
        if(!await slotExists(clip-1)){
          warning.textContent=`Cannot select clip ${clip}: previous latent slot ${clip-1} is missing. Generate clip ${clip-1} first.`;
          return;
        }
      }catch(e){warning.textContent=`Unable to verify previous latent: ${e.message}. Indices unchanged.`;return;}
    }
    if(active()){warning.textContent='Chain started while checking latents. Indices unchanged.';return;}
    if(!setNative(ID.load,'clip_index',clip-1,1)||
       !setNative(ID.save,'clip_index',clip,1)){
      warning.textContent='Continuity controls are unavailable.';return;
    }
    expanded=clip-1;renderShots();
    warning.textContent=clip<shots.length
       ?`Clip ${clip} selected. Re-rolling it overwrites slot ${clip}; later clips still use older continuity until regenerated.`
       :`Clip ${clip} selected. Press Run/Re-roll to generate this clip.`;
    refreshStatus();
  }
  async function dispatch(action){
    if(action==='Chain'&&chainMeta.chaining){await nativeAction('Stop');return;}
    if(active()){warning.textContent='A clip is rendering; wait for it to finish.';return;}
    const {load,save}=readIndices();
    if(save!==load+1){warning.textContent='Continuity clip indices inconsistent.';return;}
    if(action==='Approve'&&save>=shots.length){warning.textContent='Last segment reached.';return;}
    await nativeAction(action);
  }
  const apply=(el,name,parser=(v)=>v,when=null,event='change')=>{
    el.addEventListener(event,()=>{
      const val=parser(el.value);
      if(val===null || Number.isNaN(val))return;
      keep(name,val);
      if(when)when(); else syncControls();
    });
  };
  const validNumber=(min,max,int=false)=>(v)=>{
    if(v==='')return null;
    let n=Number(v);if(!Number.isFinite(n)||n<min||n>max)return null;
    return int?Math.round(n):n;
  };
  apply(duration,'duration_s',validNumber(0.5,180));
  apply(ratio,'ratio');
  apply(mp,'megapixels',validNumber(0.05,4));
  apply(base,'base_steps',validNumber(1,100,true));
  apply(refine,'refine_steps',validNumber(1,100,true));
  apply(scale,'upscale_multiplier',validNumber(1,3));
  seed.addEventListener('change',()=>{
    const val=validNumber(0,Number.MAX_SAFE_INTEGER,true)(seed.value);
    if(val===null){warning.textContent='Seed must be a nonnegative integer.';return;}
    if(!setNative(ID.seed,'h3_rng_value',val,0)){
      warning.textContent='RandomNoise seed widget is unavailable.';return;
    }
    seed.value=String(val);warning.textContent='';
  });
  seedMode.addEventListener('change',()=>{
    if(!setNative(ID.seed,'control_after_generate',seedMode.value,1))
      warning.textContent='RandomNoise seed mode widget is unavailable.';
    else warning.textContent='';
  });
  apply(renderMode,'render_mode');
  // Numeric/text production fields: Enter commits exactly like leaving the field.
  // Never bubble Enter to ComfyUI canvas shortcuts or trigger a render.
  for(const field of [project,duration,mp,base,refine,scale,seed]){
    field.addEventListener('keydown',e=>{
      if(e.key!=='Enter')return;
      e.preventDefault();e.stopPropagation();
      field.dispatchEvent(new Event('change',{bubbles:false}));
      field.blur();
    });
  }
  apply(project,'project_key',slug,()=>{
    // Never silently reset Load/Save; changing a project redirects future latents.
    if(Number(getNative(ID.load,'clip_index',1))>0){
      warning.textContent='Project changed during an active sequence. Reset indices before generating in the new folder.';
    } else warning.textContent='';
    syncProject();
  });
  general.addEventListener('input',()=>keep('general_prompt',general.value));
  general.addEventListener('keydown',e=>e.stopPropagation());
  project.addEventListener('keydown',e=>e.stopPropagation());
  raw.addEventListener('input',()=>keep('segments_text',raw.value));
  raw.addEventListener('change',()=>{
    const parsed=decode(raw.value);if(parsed){shots=parsed;invalid=false;expanded=0;renderShots();syncChainCount();}
  });
  raw.addEventListener('keydown',e=>e.stopPropagation());
  // Prevent drag or keyboard shortcuts inside text/number inputs from editing the canvas.
  panel.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))e.stopPropagation();});

  const restore=()=>{
    const v=state();
    project.value=v.project_key??'';
    // Legacy serialized field is fixed to Chain; the user chooses Run or Chain using buttons.
    if(v.production_mode!=='Chain')keep('production_mode','Chain');
    renderMode.value=v.render_mode??'Final';
    duration.value=v.duration_s;mp.value=v.megapixels;
    base.value=v.base_steps;refine.value=v.refine_steps;scale.value=v.upscale_multiplier;
    seed.value=String(getNative(ID.seed,'h3_rng_value',0)??'0');
    seedMode.value=String(getNative(ID.seed,'control_after_generate',1)??'randomize');
    general.value=String(v.general_prompt??'');
    ratio.replaceChildren();
    const available=widget(graphNode(ID.resolution),'aspect_ratio',0)?.options?.values;
    const options=Array.isArray(available)?available:(Array.isArray(available?.values)?available.values:[]);
    const names=options.length ? options.map(v=>String(v)) : [String(v.ratio??'16:9 (Widescreen)')];
    if(!names.includes(String(v.ratio)))names.unshift(String(v.ratio));
    for(const name of [...new Set(names)]) {let op=$('option',{},name);op.value=name;ratio.append(op);}
    ratio.value=String(v.ratio);
    shots=decode(v.segments_text)??[];
    invalid=decode(v.segments_text)===null;
    expanded=0;
    renderShots();
    refreshAdvanced();
    hideNativeWidgets();
    anchorOutputs(node);
    updateTheme(node,panel);
    // Defer mirroring until LiteGraph has restored all original nodes.
    Promise.resolve().then(()=>syncControls());
  };
  // Manual size grip stays accessible even if a ComfyUI frontend build
  // intercepts canvas node resize handles under custom DOM widgets.
  // Coordinates are screen pixels, while node sizes are in graph units.
  const grip=$('div',{
    position:'sticky',bottom:'2px',alignSelf:'flex-end',marginTop:'auto',
    padding:'5px 10px',border:`1px solid ${colors.line}`,borderRadius:'5px',
    background:colors.panel,color:colors.sub,fontSize:'12px',fontWeight:'bold',
    cursor:'nwse-resize',touchAction:'none',userSelect:'none',zIndex:'5',
  },'↘ Resize');
  grip.title='Drag to resize the Director width and height';
  panel.append(grip);
  grip.addEventListener('pointerdown',event=>{
    if(event.button !== undefined && event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const pointerId=event.pointerId;
    const x=event.clientX,y=event.clientY;
    const [w,h]=Array.isArray(node.size)?[...node.size]:[1050,1220];
    const scale=Math.max(0.05,Number(app.canvas?.ds?.scale)||1);
    const move=ev=>{
      if(ev.pointerId!==pointerId)return;
      ev.preventDefault();ev.stopPropagation();
      const nw=Math.max(490,Math.round(w+(ev.clientX-x)/scale));
      const nh=Math.max(440,Math.round(h+(ev.clientY-y)/scale));
      // LiteGraph setSize updates the graph layout, output ports and DOM widget.
      node.setSize?.([nw,nh]);
      anchorOutputs(node);
      // Some frontend releases cache a DOM widget's width instead of tracking
      // the parent node's width. Clear only this Studio widget's cached width.
      if(ui)ui.width=undefined;
      app.graph?.setDirtyCanvas?.(true,true);
    };
    const finish=ev=>{
      if(ev.pointerId!==pointerId)return;
      window.removeEventListener('pointermove',move,true);
      window.removeEventListener('pointerup',finish,true);
      window.removeEventListener('pointercancel',finish,true);
      try{grip.releasePointerCapture?.(pointerId);}catch{}
      app.graph?.setDirtyCanvas?.(true,true);
    };
    window.addEventListener('pointermove',move,true);
    window.addEventListener('pointerup',finish,true);
    window.addEventListener('pointercancel',finish,true);
    try{grip.setPointerCapture?.(pointerId);}catch{}
  });

  // Keep source widgets serialized, and hide only their canvas widget rendering.
  // No maxHeight: the panel must be able to grow beyond 1600px when expanded.
  const ui=node.addDOMWidget('h3_full_director_panel','h3_director_studio_ui',panel,{
    getMinHeight:()=>360,hideOnZoom:false,margin:11,
    serialize:false,getValue:()=>'',setValue:()=>{},
    afterResize:()=>{anchorOutputs(node);ui.width=undefined;},
  });
  ui.serialize=false;ui.options??={};ui.options.serialize=false;
  panel.classList.add('h3-director-v1-ui');
  hideNativeWidgets();
  node.__h3studio={restore,syncControls};
  // Do not force node.size: respect the saved JSON geometry and manual resizing.
  restore();
  function refreshStatus(){
    const {load,save}=readIndices();
    status.textContent=`Continuity · Load ${load} / Save ${save} · Clip ${load+1}`;
  }
  refreshStatus();
  const timer=window.setInterval(()=>{
    if(!app.graph?._nodes?.includes(node)){window.clearInterval(timer);return;}
    const load=Number(getNative(ID.load,'clip_index',1)??0);
    const save=Number(getNative(ID.save,'clip_index',1)??1);
    status.textContent=`Continuity · Load ${load} / Save ${save} · Clip ${load+1}`;
    // Important: DO NOT rewrite Load/Save indices while Chain is running.
    chain.disabled=false;
    chain.textContent=graphNode(ID.chain)?._h3mc?.chaining?'■ Stop':'▶▶ Chain';
    if(advanced.open)refreshAdvanced();
    updateTheme(node,panel);
    anchorOutputs(node);
    // RandomNoise itself randomizes seeds on queue; don't overwrite them here.
    if(document.activeElement!==seedMode)
      seedMode.value=String(getNative(ID.seed,'control_after_generate',1)??'randomize');
    if(getNative(ID.seed,'control_after_generate',1)==='randomize' && document.activeElement!==seed){
      const current=getNative(ID.seed,'h3_rng_value',0);
      if(current!==undefined)seed.value=String(current);
    }
  },1500);
}
app.registerExtension({
  name:'h3.director.studio.v1.integrated',
  async beforeRegisterNodeDef(nodeType,nodeData){
    if(nodeData.name!==TYPE)return;
    const origCreated=nodeType.prototype.onNodeCreated;
    const origConfigure=nodeType.prototype.onConfigure;
    const origRemoved=nodeType.prototype.onRemoved;
    nodeType.prototype.onNodeCreated=function(){const x=origCreated?.apply(this,arguments);mirror(this);return x;};
    nodeType.prototype.onConfigure=function(){const x=origConfigure?.apply(this,arguments);this.__h3studio?.restore();return x;};
    nodeType.prototype.onRemoved=function(){this.__h3MonitorCleanup?.();return origRemoved?.apply(this,arguments);};
  },
  loadedGraphNode(node){
    if(node.comfyClass===TYPE||node.type===TYPE){
      if(!node.__h3studio)mirror(node);
      node.__h3studio?.restore();
    }
  },
});