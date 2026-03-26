import { useState, useRef, useEffect, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const STYLE_PRESETS = [
  { id: "cinematic",   label: "Cinematic",        desc: "Anamorphic lenses, wide establishing shots, motivated dramatic lighting" },
  { id: "documentary", label: "Documentary",       desc: "Handheld observational camera, natural light, intimate framing" },
  { id: "anime",       label: "Anime / Stylized",  desc: "Vivid saturated palette, bold outlines, expressive motion" },
  { id: "noir",        label: "Noir",              desc: "Hard chiaroscuro, deep shadows, venetian-blind light, desaturated" },
  { id: "fantasy",     label: "Fantasy / Epic",    desc: "Sweeping drone vistas, volumetric god-rays, rich color grading" },
  { id: "minimal",     label: "Minimalist",        desc: "Negative space, locked-off symmetrical frames, muted palette" },
  { id: "retro",       label: "Retro / Vintage",   desc: "16mm film grain, halation glow, warm faded emulsion tones" },
  { id: "custom",      label: "Custom Style",      desc: "Write your own style description" },
  { id: "youtube",     label: "▶ Match a Video",   desc: "Upload frames from any video — Claude extracts the exact visual language" },
];

const VEO_MODELS = [
  { id: "veo-3.1-generate-preview",      label: "Veo 3.1 Preview" },
  { id: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast"    },
  { id: "veo-3.0-generate-001",          label: "Veo 3 (GA)"      },
  { id: "veo-3.0-fast-generate-001",     label: "Veo 3 Fast (GA)" },
];

const LOCATIONS     = ["us-central1", "europe-west4", "asia-northeast1"];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "21:9"];
const DURATIONS     = [5, 6, 8, 10];
const SCOPES        = "https://www.googleapis.com/auth/cloud-platform";

// ── Utilities ──────────────────────────────────────────────────────────────────
const splitS = t =>
  t.replace(/\n+/g, " ")
   .replace(/([.!?])\s*["'"»]\s*/g, "$1 ")
   .split(/(?<=[.!?…])\s+/)
   .map(s => s.trim())
   .filter(s => s.length > 4 && /[a-zA-Z]/.test(s));

const toB64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(f);
});

const extractYtId = url => {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v") || null;
  } catch { return null; }
};

const wordCount = s => s ? s.trim().split(/\s+/).filter(Boolean).length : 0;

// ── Shared styles ──────────────────────────────────────────────────────────────
const tagS  = c => ({ fontSize:10,padding:"3px 10px",borderRadius:20,background:`${c}18`,color:c,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" });
const pillS = a => ({ padding:"8px 16px",borderRadius:20,border:"1px solid",borderColor:a?"#D4A04A":"rgba(255,255,255,0.06)",background:a?"rgba(212,160,74,0.1)":"transparent",color:a?"#D4A04A":"#777",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s" });
const btnS  = (bg,c,b) => ({ padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,background:bg,color:c,border:b||"none",cursor:"pointer",letterSpacing:0.3,fontFamily:"'JetBrains Mono',monospace" });
const secL  = { fontSize:10,textTransform:"uppercase",letterSpacing:2,color:"#D4A04A",fontWeight:600,fontFamily:"'JetBrains Mono',monospace" };
const inpB  = { width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"#e0e0e0",padding:14,fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box" };

// ── ImageUploadZone ────────────────────────────────────────────────────────────
function ImageUploadZone({ images, onAdd, onRemove, max, label, sub }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const handle = async files => {
    for (const f of Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, max - images.length)) {
      try { const b = await toB64(f); onAdd({ base64:b, mimeType:f.type, name:f.name, preview:URL.createObjectURL(f) }); } catch {}
    }
  };
  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
        <label style={secL}>{label}</label>
        <span style={{ fontSize:10,color:"#555",fontFamily:"'JetBrains Mono',monospace" }}>{images.length}/{max}</span>
      </div>
      {sub && <p style={{ fontSize:11,color:"#666",marginTop:-2,marginBottom:10,lineHeight:1.5 }}>{sub}</p>}
      {images.length > 0 && (
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:10 }}>
          {images.map((img,i) => (
            <div key={i} style={{ position:"relative",width:76,height:76,borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)" }}>
              <img src={img.preview} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              <button onClick={()=>onRemove(i)} style={{ position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.8)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0 }}>✕</button>
              <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"2px 4px",background:"rgba(0,0,0,0.7)",fontSize:8,color:"#aaa",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{img.name}</div>
            </div>
          ))}
        </div>
      )}
      {images.length < max && (
        <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files);}} onClick={()=>ref.current?.click()}
          style={{ padding:"16px 14px",borderRadius:10,cursor:"pointer",border:`2px dashed ${drag?"#D4A04A":"rgba(255,255,255,0.08)"}`,background:drag?"rgba(212,160,74,0.04)":"rgba(255,255,255,0.01)",textAlign:"center",transition:"all 0.2s" }}>
          <input ref={ref} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{handle(e.target.files);e.target.value="";}} />
          <p style={{ margin:0,fontSize:12,color:drag?"#D4A04A":"#555" }}>
            <span style={{ fontSize:15,display:"block",marginBottom:3 }}>{drag ? "◎" : "+"}</span>Drop or click to upload
          </p>
          <p style={{ margin:"3px 0 0",fontSize:9,color:"#3a3a3a" }}>PNG · JPG · WebP</p>
        </div>
      )}
    </div>
  );
}

// ── VeoStatus ──────────────────────────────────────────────────────────────────
function VeoStatus({ status }) {
  const m = {
    pending:      { c:"#555",    l:"Queued",        i:"◻" },
    submitting:   { c:"#D4A04A", l:"Submitting…",   i:"↑" },
    polling:      { c:"#6BA5E7", l:"Processing…",   i:"◎" },
    done:         { c:"#7ECB8B", l:"Complete",       i:"✓" },
    error:        { c:"#E74C3C", l:"Failed",         i:"✕" },
    prompt_ready: { c:"#D4A04A", l:"Prompt Ready",  i:"●" },
    regenerating: { c:"#C084FC", l:"Regenerating…", i:"↺" },
  };
  const s = m[status] || m.pending;
  const animated = ["polling","submitting","regenerating"].includes(status);
  return (
    <span style={{ fontSize:10,padding:"2px 8px",borderRadius:10,background:`${s.c}18`,color:s.c,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",display:"inline-flex",alignItems:"center",gap:4,animation:animated?"pulse 1.5s infinite":"none" }}>
      {s.i} {s.l}
    </span>
  );
}

// ── SceneCard ──────────────────────────────────────────────────────────────────
function SceneCard({ scene, index, total, onUpdatePrompt, onRetryVeo, onRegenerate, onMoveUp, onMoveDown, hasCreds, isGenerating }) {
  const [exp, setExp]         = useState(false);
  const [copied, setCopied]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [ev, setEv]           = useState(scene.prompt || "");

  useEffect(() => { setEv(scene.prompt || ""); }, [scene.prompt]);
  // Auto-expand only scene 1 on initial generation, or any scene after individual regeneration
  useEffect(() => { if (scene.veoStatus === "prompt_ready" && scene.prompt && (index === 0 || scene._justRegenerated)) setExp(true); }, [scene.veoStatus]);

  const isRetryable   = scene.veoStatus === "error" || scene.veoStatus === "prompt_ready";
  const isRegenerating= scene.veoStatus === "regenerating";
  const wc            = wordCount(scene.prompt);

  return (
    <div style={{ background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"flex-start" }}>
        {/* Reorder */}
        <div style={{ display:"flex",flexDirection:"column",justifyContent:"center",gap:3,padding:"17px 8px 17px 12px" }}>
          <button onClick={e=>{e.stopPropagation();onMoveUp(index);}} disabled={index===0||isGenerating} title="Move up"
            style={{ background:"none",border:"none",color:"#3a3a3a",cursor:index===0||isGenerating?"default":"pointer",fontSize:11,lineHeight:1,padding:"3px 5px",borderRadius:4,opacity:index===0?0.15:0.6 }}>▲</button>
          <button onClick={e=>{e.stopPropagation();onMoveDown(index);}} disabled={index===total-1||isGenerating} title="Move down"
            style={{ background:"none",border:"none",color:"#3a3a3a",cursor:index===total-1||isGenerating?"default":"pointer",fontSize:11,lineHeight:1,padding:"3px 5px",borderRadius:4,opacity:index===total-1?0.15:0.6 }}>▼</button>
        </div>
        {/* Row */}
        <div onClick={()=>setExp(!exp)} style={{ display:"flex",alignItems:"flex-start",gap:14,padding:"16px 17px 16px 0",cursor:"pointer",userSelect:"none",flex:1,minWidth:0 }}>
          <div style={{ minWidth:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#D4A04A,#B8860B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#1a1a1a",fontFamily:"'JetBrains Mono',monospace",flexShrink:0 }}>
            {String(index+1).padStart(2,"0")}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ margin:0,fontSize:13,color:"#d8d8d8",lineHeight:1.65,fontFamily:"'Source Serif 4',Georgia,serif" }}>"{scene.sentence}"</p>
            <div style={{ display:"flex",gap:7,marginTop:9,flexWrap:"wrap",alignItems:"center" }}>
              <VeoStatus status={scene.veoStatus||"pending"} />
              {scene.mood    && <span style={tagS("#D4A04A")}>{scene.mood}</span>}
              {scene.setting && <span style={tagS("#6BA5E7")}>{scene.setting}</span>}
              {scene.camera  && <span style={tagS("#7ECB8B")}>{scene.camera}</span>}
              {wc > 0 && <span style={{ fontSize:9,color:"#333",fontFamily:"'JetBrains Mono',monospace",marginLeft:2 }}>{wc}w</span>}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" style={{ marginTop:5,transform:exp?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",fill:"none",stroke:"#444",strokeWidth:2,flexShrink:0 }}><path d="M4 6l4 4 4-4"/></svg>
        </div>
      </div>

      {exp && (
        <div style={{ padding:"0 17px 17px 68px",borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ paddingTop:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
              <label style={{ ...secL,fontSize:9 }}>Veo 3.1 Prompt</label>
              {wc > 0 && <span style={{ fontSize:9,color:"#333",fontFamily:"'JetBrains Mono',monospace" }}>{wc} words</span>}
            </div>
            {editing ? (
              <div>
                <textarea value={ev} onChange={e=>setEv(e.target.value)}
                  style={{ ...inpB,minHeight:110,fontFamily:"'Source Serif 4',Georgia,serif",fontSize:13,lineHeight:1.7,resize:"vertical" }} />
                <div style={{ display:"flex",gap:8,marginTop:8 }}>
                  <button onClick={()=>{onUpdatePrompt(index,ev);setEditing(false);}} style={btnS("#D4A04A","#1a1a1a")}>Save</button>
                  <button onClick={()=>{setEditing(false);setEv(scene.prompt);}} style={btnS("transparent","#666","1px solid rgba(255,255,255,0.09)")}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ margin:0,fontSize:13,color:"#bbb",lineHeight:1.75,fontFamily:"'Source Serif 4',Georgia,serif" }}>
                {scene.prompt || <span style={{ color:"#3a3a3a",fontStyle:"italic" }}>Generating…</span>}
              </p>
            )}
            {!editing && scene.prompt && (
              <div style={{ display:"flex",gap:7,marginTop:12,flexWrap:"wrap" }}>
                <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(scene.prompt);setCopied(true);setTimeout(()=>setCopied(false),1500);}}
                  style={btnS("transparent",copied?"#7ECB8B":"#777","1px solid rgba(255,255,255,0.07)")}>{copied?"✓ Copied":"Copy"}</button>
                <button onClick={e=>{e.stopPropagation();setEditing(true);}}
                  style={btnS("transparent","#777","1px solid rgba(255,255,255,0.07)")}>Edit</button>
                <button onClick={e=>{e.stopPropagation();onRegenerate(index);}} disabled={isRegenerating}
                  title="Re-run Claude for this scene only"
                  style={btnS("rgba(192,132,252,0.07)",isRegenerating?"#555":"#C084FC","1px solid rgba(192,132,252,0.18)")}>
                  {isRegenerating ? "↺ Regenerating…" : "↺ Regenerate"}
                </button>
                {hasCreds && isRetryable && (
                  <button onClick={e=>{e.stopPropagation();onRetryVeo(index);}}
                    style={btnS("rgba(212,160,74,0.09)","#D4A04A","1px solid rgba(212,160,74,0.22)")}>
                    {scene.veoStatus==="error" ? "Retry Veo" : "Send to Veo"}
                  </button>
                )}
              </div>
            )}
            {scene.veoError && (
              <p style={{ marginTop:8,fontSize:11,color:"#E74C3C",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5 }}>✕ {scene.veoError}</p>
            )}
            {scene.videoUri && (
              <div style={{ marginTop:14,padding:14,borderRadius:10,background:"rgba(126,203,139,0.04)",border:"1px solid rgba(126,203,139,0.12)" }}>
                <label style={{ ...secL,fontSize:9,color:"#7ECB8B" }}>Generated Video</label>
                {scene.videoUri.startsWith("https://") ? (
                  <video src={scene.videoUri} controls style={{ width:"100%",marginTop:10,borderRadius:8,background:"#000",maxHeight:280,outline:"none" }} />
                ) : (
                  <p style={{ margin:"8px 0 4px",fontSize:11,color:"#7ECB8B",fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all",lineHeight:1.6 }}>{scene.videoUri}</p>
                )}
                <div style={{ display:"flex",gap:7,marginTop:10,flexWrap:"wrap" }}>
                  <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(scene.videoUri);}}
                    style={btnS("transparent","#7ECB8B","1px solid rgba(126,203,139,0.2)")}>Copy URI</button>
                  {scene.videoUri.startsWith("https://") && (
                    <a href={scene.videoUri} download target="_blank" rel="noreferrer"
                      style={{ ...btnS("rgba(126,203,139,0.07)","#7ECB8B","1px solid rgba(126,203,139,0.2)"),textDecoration:"none",display:"inline-block" }}>⬇ Download</a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export Modal (zero external dependencies) ─────────────────────────────────
function ExportModal({ scenes, aspectRatio, duration, veoModel, negativePrompt, styleLabel, onClose }) {
  const [exporting, setExporting] = useState(null);
  const [done, setDone]           = useState(null);
  const meta = [`Style: ${styleLabel}`,`Aspect: ${aspectRatio}`,`Duration: ${duration}s`,`Model: ${veoModel}`,`${scenes.length} scenes`,new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})].join("  ·  ");

  // ── Word (.doc via HTML) ──
  function exportDoc() {
    setExporting("doc");
    try {
      const esc=s=>(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const scenesHtml=scenes.map((s,i)=>{
        const tags=[s.mood&&`Mood: ${esc(s.mood)}`,s.setting&&`Setting: ${esc(s.setting)}`,s.camera&&`Camera: ${esc(s.camera)}`].filter(Boolean).join("&nbsp;&nbsp;&nbsp;&nbsp;");
        return `
          <div style="margin-bottom:28px;${i<scenes.length-1?"border-bottom:1px solid #e0e0e0;padding-bottom:24px;":""}">
            <h2 style="font-family:'Courier New',monospace;font-size:13px;color:#B8860B;margin:0 0 8px;letter-spacing:1px;">SCENE ${String(i+1).padStart(2,"0")}</h2>
            <p style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;margin:0 0 10px;line-height:1.7;font-style:italic;">"${esc(s.sentence)}"</p>
            ${tags?`<p style="font-family:'Courier New',monospace;font-size:10px;color:#6BA5E7;margin:0 0 10px;">${tags}</p>`:""}
            <p style="font-family:'Courier New',monospace;font-size:9px;color:#B8860B;font-weight:bold;margin:0 0 4px;letter-spacing:1.5px;">VEO PROMPT</p>
            <p style="font-family:Georgia,serif;font-size:13px;color:${s.prompt?"#2a2a2a":"#999"};margin:0 0 8px;line-height:1.75;">${esc(s.prompt)||"(no prompt)"}</p>
            ${s.videoUri?`<p style="font-family:'Courier New',monospace;font-size:10px;color:#4CAF50;margin:0;"><b>Video:</b> ${esc(s.videoUri)}</p>`:""}
          </div>`;
      }).join("");

      const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Veo 3.1 Scene Breakdown</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>@page{size:letter;margin:1in;}body{font-family:Georgia,serif;font-size:13px;color:#1a1a1a;line-height:1.6;}</style>
</head><body>
<div style="border-bottom:3px solid #D4A04A;padding-bottom:16px;margin-bottom:24px;">
  <h1 style="font-family:Georgia,serif;font-size:26px;color:#111;margin:0 0 6px;">Script → Video</h1>
  <p style="font-family:'Courier New',monospace;font-size:11px;color:#888;margin:0 0 4px;">Veo 3.1 Scene Breakdown</p>
  <p style="font-family:'Courier New',monospace;font-size:10px;color:#666;margin:0;">${esc(meta)}</p>
</div>
${scenesHtml}
</body></html>`;

      const blob=new Blob([html],{type:"application/msword"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download="veo31-scenes.doc"; a.click(); URL.revokeObjectURL(url);
      setDone("doc");
    } catch(e){console.error("DOC export error:",e);}
    setExporting(null);
  }

  // ── PDF (raw binary, no library) ──
  function exportPdf() {
    setExporting("pdf");
    try {
      const PW=612,PH=792,MG=54,CW=PW-MG*2; // letter size in pts
      const pages=[]; let curPage=[]; let y=MG;
      const accent=[0.831,0.627,0.290]; // #D4A04A as rgb 0-1
      const flush=()=>{if(curPage.length>0){pages.push([...curPage]);curPage=[];y=MG;}};
      const chk=(h)=>{if(y+h>PH-MG-20)flush();};
      // PDF stream helpers
      const textCmd=(text,x,yy,font,size,rgb)=>{
        const safe=text.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
        return `BT /${font} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${yy} Td (${safe}) Tj ET`;
      };
      const wrapText=(text,maxW,fontSize)=>{
        const avg=fontSize*0.48; const maxChars=Math.floor(maxW/avg); const lines=[];
        const words=(text||"").split(/\s+/);let line="";
        for(const w of words){
          if((line+" "+w).trim().length>maxChars&&line){lines.push(line);line=w;}
          else line=line?line+" "+w:w;
        }
        if(line)lines.push(line); return lines.length?lines:[""];
      };

      // Title
      curPage.push(`${accent[0]} ${accent[1]} ${accent[2]} rg ${MG} ${PH-y-2} ${CW} 3 re f`); y+=16;
      curPage.push(textCmd("Script -> Video",MG,PH-y,"Helvetica-Bold",20,[0.07,0.07,0.07])); y+=24;
      curPage.push(textCmd("Veo 3.1 Scene Breakdown",MG,PH-y,"Courier",8,[0.43,0.43,0.43])); y+=12;
      const metaClean=meta.replace(/·/g,"-"); // PDF safe
      wrapText(metaClean,CW,7.5).forEach(l=>{curPage.push(textCmd(l,MG,PH-y,"Courier",7.5,[0.35,0.35,0.35]));y+=10;});
      y+=4;
      curPage.push(`${accent[0]} ${accent[1]} ${accent[2]} RG 0.4 w ${MG} ${PH-y} m ${PW-MG} ${PH-y} l S`); y+=16;

      scenes.forEach((s,i)=>{
        chk(75);
        curPage.push(textCmd(`SCENE ${String(i+1).padStart(2,"0")}`,MG,PH-y,"Courier-Bold",8,accent)); y+=14;
        const sentLines=wrapText(`"${s.sentence}"`,CW,11);
        sentLines.forEach(l=>{chk(14);curPage.push(textCmd(l,MG,PH-y,"Helvetica-Bold",11,[0.1,0.1,0.1]));y+=14;}); y+=4;

        const tags=[s.mood&&`Mood: ${s.mood}`,s.setting&&`Setting: ${s.setting}`,s.camera&&`Camera: ${s.camera}`].filter(Boolean).join("   -   ");
        if(tags){chk(11);curPage.push(textCmd(tags,MG,PH-y,"Courier",7.5,[0.42,0.65,0.91]));y+=12;}

        chk(11);curPage.push(textCmd("VEO PROMPT",MG,PH-y,"Courier-Bold",7.5,accent));y+=11;
        const promptLines=wrapText(s.prompt||"(no prompt)",CW,9.5);
        const pColor=s.prompt?[0.18,0.18,0.18]:[0.59,0.59,0.59];
        promptLines.forEach(l=>{chk(13);curPage.push(textCmd(l,MG,PH-y,"Helvetica",9.5,pColor));y+=13;});

        if(s.videoUri){y+=3;chk(11);
          wrapText(`Video: ${s.videoUri}`,CW,7.5).forEach(l=>{chk(11);curPage.push(textCmd(l,MG,PH-y,"Courier",7.5,[0.49,0.80,0.55]));y+=11;});
        }
        y+=8;
        if(i<scenes.length-1){chk(10);curPage.push(`0.17 0.17 0.17 RG 0.25 w ${MG} ${PH-y} m ${PW-MG} ${PH-y} l S`);y+=12;}
      });
      if(curPage.length>0)pages.push([...curPage]);

      // Build raw PDF
      const fonts=["Helvetica","Helvetica-Bold","Courier","Courier-Bold"];
      const objs=[]; const offsets=[];
      const addObj=(content)=>{objs.push(content);return objs.length;};

      // 1 - Catalog
      addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
      // 2 - Pages (placeholder)
      addObj(""); // will be replaced
      // 3-6 Fonts
      const fontIds=fonts.map((f,fi)=>{
        const id=addObj(`${fi+3} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>\nendobj`);
        return id;
      });
      // Page objects + content streams
      const pageObjIds=[];
      pages.forEach((pageContent,pi)=>{
        // Footer
        const footer=[
          `${accent[0]} ${accent[1]} ${accent[2]} RG 0.4 w ${MG} 28 m ${PW-MG} 28 l S`,
          textCmd(`Script -> Video  -  ${scenes.length} scenes  -  Page ${pi+1} of ${pages.length}`,MG,18,"Courier",7,[0.27,0.27,0.27]),
        ];
        const stream=[...pageContent,...footer].join("\n");
        const streamId=addObj(`${objs.length+1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
        const pageId=addObj(`${objs.length+1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${streamId} 0 R /Resources << /Font << /Helvetica ${fontIds[0]} 0 R /Helvetica-Bold ${fontIds[1]} 0 R /Courier ${fontIds[2]} 0 R /Courier-Bold ${fontIds[3]} 0 R >> >> >>\nendobj`);
        pageObjIds.push(pageId);
      });
      // Fix Pages object
      objs[1]=`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj`;

      // Serialize
      let pdf="%PDF-1.4\n";
      objs.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=obj+"\n";});
      const xrefOff=pdf.length;
      pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
      offsets.forEach(off=>{pdf+=`${String(off).padStart(10,"0")} 00000 n \n`;});
      pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;

      const blob=new Blob([pdf],{type:"application/pdf"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download="veo31-scenes.pdf"; a.click(); URL.revokeObjectURL(url);
      setDone("pdf");
    } catch(e){console.error("PDF export error:",e);}
    setExporting(null);
  }

  // ── JSON ──
  function exportJson() {
    setExporting("json");
    const d=scenes.map((s,i)=>({scene:i+1,sentence:s.sentence,prompt:s.prompt,mood:s.mood,setting:s.setting,camera:s.camera,aspect_ratio:aspectRatio,duration_seconds:duration,model:veoModel,...(negativePrompt?.trim()?{negative_prompt:negativePrompt.trim()}:{}),video_uri:s.videoUri||null,status:s.veoStatus}));
    const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="veo31-scenes.json"; a.click(); URL.revokeObjectURL(u);
    setDone("json"); setExporting(null);
  }

  const formats=[
    {id:"doc", label:"Word Document",ext:".doc", desc:"Formatted breakdown with scene tags, prompts, and video URIs.",icon:"W",iconBg:"rgba(37,99,235,0.12)",iconColor:"#6BA5E7",action:exportDoc},
    {id:"pdf", label:"PDF",          ext:".pdf", desc:"Print-ready with golden accents, page numbers, and footer.",icon:"P",iconBg:"rgba(231,76,60,0.12)",iconColor:"#E74C3C",action:exportPdf},
    {id:"json",label:"JSON Data",    ext:".json",desc:"Raw structured data — scenes, prompts, statuses, and video URIs.",icon:"{}",iconBg:"rgba(212,160,74,0.1)", iconColor:"#D4A04A",action:exportJson},
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(5px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:455,background:"#17171a",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:26,animation:"fadeIn 0.2s ease",boxShadow:"0 28px 70px rgba(0,0,0,0.65)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,fontFamily:"'Source Serif 4',Georgia,serif",color:"#f0f0f0"}}>Export Scenes</h2>
            <p style={{margin:"4px 0 0",fontSize:11,color:"#555",fontFamily:"'JetBrains Mono',monospace"}}>{scenes.length} scenes  ·  choose a format</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#444",fontSize:17,cursor:"pointer",padding:"2px 6px",borderRadius:4,lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {formats.map(f=>(
            <button key={f.id} onClick={f.action} disabled={!!exporting}
              style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:10,border:`1px solid ${done===f.id?"rgba(126,203,139,0.3)":"rgba(255,255,255,0.05)"}`,background:done===f.id?"rgba(126,203,139,0.04)":exporting===f.id?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.02)",cursor:exporting?"not-allowed":"pointer",textAlign:"left",width:"100%",transition:"all 0.2s",opacity:exporting&&exporting!==f.id?0.35:1}}>
              <div style={{minWidth:38,height:38,borderRadius:9,background:f.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:f.iconColor,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>
                {exporting===f.id?<span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>↻</span>:done===f.id?"✓":f.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:600,color:done===f.id?"#7ECB8B":"#e0e0e0"}}>{f.label}</span>
                  <span style={{fontSize:9,color:"#444",fontFamily:"'JetBrains Mono',monospace"}}>{f.ext}</span>
                </div>
                <p style={{margin:0,fontSize:10.5,color:"#555",lineHeight:1.45}}>{f.desc}</p>
              </div>
              {!exporting&&done!==f.id&&<span style={{color:"#333",fontSize:13,flexShrink:0}}>→</span>}
            </button>
          ))}
        </div>
        {done&&<p style={{marginTop:14,marginBottom:0,fontSize:11,color:"#7ECB8B",textAlign:"center",fontFamily:"'JetBrains Mono',monospace"}}>✓ Downloaded</p>}
      </div>
    </div>
  );
}

// ── Google OAuth ───────────────────────────────────────────────────────────────
function useGoogleAuth() {
  const [user,setUser]=useState(null);
  const [gsiReady,setGsiReady]=useState(false);
  const [clientId,setClientId]=useState("");
  const tcRef=useRef(null);
  useEffect(()=>{
    if(document.getElementById("gsi-script")) return;
    const s=document.createElement("script"); s.id="gsi-script"; s.src="https://accounts.google.com/gsi/client"; s.async=true; s.onload=()=>setGsiReady(true); document.head.appendChild(s);
  },[]);
  const init=useCallback(cid=>{
    if(!window.google?.accounts?.oauth2||!cid) return;
    tcRef.current=window.google.accounts.oauth2.initTokenClient({client_id:cid,scope:SCOPES,callback:r=>{
      if(r.error) return;
      const exp=Date.now()+(r.expires_in*1000);
      fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${r.access_token}`}}).then(x=>x.json()).then(i=>setUser({email:i.email||"User",name:i.name||"User",picture:i.picture,accessToken:r.access_token,expiresAt:exp})).catch(()=>setUser({email:"User",name:"User",picture:null,accessToken:r.access_token,expiresAt:exp}));
    }});
  },[]);
  useEffect(()=>{if(gsiReady&&clientId)init(clientId);},[gsiReady,clientId,init]);
  return {
    user,gsiReady,clientId,setClientId,
    signIn:  useCallback(()=>{if(tcRef.current)tcRef.current.requestAccessToken();},[]),
    signOut: useCallback(()=>{if(user?.accessToken&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(user.accessToken);setUser(null);},[user]),
    refresh: useCallback(()=>{if(tcRef.current)tcRef.current.requestAccessToken({prompt:""});},[]),
    expiring:user?(user.expiresAt-Date.now()<300000):false,
  };
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [step,setStep]             = useState(0);
  const [script,setScript]         = useState("");
  const [stylePreset,setStylePreset]=useState("cinematic");
  const [customStyle,setCustomStyle]=useState("");
  const [styleImgs,setStyleImgs]   = useState([]);
  const [ytApiKey,setYtApiKey]     = useState("");
  const [ytUrl,setYtUrl]           = useState("");
  const [ytFrames,setYtFrames]     = useState([]);
  const [ytMeta,setYtMeta]         = useState(null);
  const [ytAnalysis,setYtAnalysis] = useState(null);
  const [ytAnalyzing,setYtAnalyzing]=useState(false);
  const [ytError,setYtError]       = useState("");
  const [aspectRatio,setAR]        = useState("16:9");
  const [duration,setDur]          = useState(8);
  const [notes,setNotes]           = useState("");
  const [negativePrompt,setNegPrompt]=useState("");
  const [veoModel,setVeoModel]     = useState(VEO_MODELS[0].id);
  const [projectId,setPid]         = useState("");
  const [loc,setLoc]               = useState("us-central1");
  const [manualToken,setMT]        = useState("");
  const [authMode,setAM]           = useState("google");
  const [storageUri,setSU]         = useState("");
  const [scenes,setScenes]         = useState([]);
  const [progress,setProg]         = useState(0);
  const [genLabel,setGenLabel]     = useState("");
  const [error,setError]           = useState("");
  const [allCopied,setAC]          = useState(false);
  const [showCreds,setSC]          = useState(false);
  const [showExport,setShowExport] = useState(false);
  const pollRef   = useRef({});
  const tokenRef  = useRef(null);
  const locRef    = useRef(loc);
  const scenesRef = useRef([]);
  const auth      = useGoogleAuth();

  const selStyle    = STYLE_PRESETS.find(s=>s.id===stylePreset);
  const sc          = splitS(script).length;
  const token       = authMode==="google" ? auth.user?.accessToken : manualToken;
  const hasCreds    = !!(projectId.trim()&&token);
  const signedIn    = authMode==="google"&&!!auth.user;
  const curModel    = VEO_MODELS.find(m=>m.id===veoModel);
  const hasStyleRef = styleImgs.length>0;
  const ytNotReady  = stylePreset==="youtube"&&!ytAnalysis;
  const styleLabel  = stylePreset==="youtube" ? (ytMeta?`YT: ${ytMeta.title.slice(0,38)}…`:"YouTube Style") : (selStyle?.label||"Custom");

  useEffect(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },[step]);
  useEffect(()=>{ if(authMode==="google"&&auth.expiring&&auth.user) auth.refresh(); },[authMode,auth.expiring]);
  useEffect(()=>{ tokenRef.current=token; },[token]);
  useEffect(()=>{ locRef.current=loc; },[loc]);
  useEffect(()=>{ scenesRef.current=scenes; },[scenes]);

  const veoUrl=useCallback(m=>`https://${loc}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${loc}/publishers/google/models/${m}`,[loc,projectId]);

  // ── Veo submit ──
  const submit=useCallback(async(idx,prompt)=>{
    if(!token||!projectId) return;
    setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"submitting",veoError:null};return u;});
    try {
      const params={aspectRatio,durationSeconds:duration,sampleCount:1,...(storageUri?{storageUri}:{}),...(negativePrompt.trim()?{negativePrompt:negativePrompt.trim()}:{})};
      const res=await fetch(`${veoUrl(veoModel)}:predictLongRunning`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({instances:[{prompt}],parameters:params})});
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${res.status}`);}
      const data=await res.json();
      setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"polling",opName:data.name};return u;});
      startPoll(idx,data.name);
    } catch(err){setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"error",veoError:err.message};return u;});}
  },[token,projectId,aspectRatio,duration,storageUri,negativePrompt,veoModel,veoUrl]);

  // ── Poll (uses refs so interval always reads fresh token) ──
  const startPoll=useCallback((idx,opName)=>{
    const k=`s${idx}`;
    if(pollRef.current[k]) clearInterval(pollRef.current[k]);
    const poll=async()=>{
      const t=tokenRef.current, l=locRef.current;
      if(!t){clearInterval(pollRef.current[k]);delete pollRef.current[k];setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"error",veoError:"Token expired — refresh and retry"};return u;});return;}
      try {
        const res=await fetch(`https://${l}-aiplatform.googleapis.com/v1/${opName}:fetchPredictOperation`,{method:"POST",headers:{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}});
        if(!res.ok) throw new Error(`Poll ${res.status}`);
        const d=await res.json();
        if(d.done){
          clearInterval(pollRef.current[k]); delete pollRef.current[k];
          if(d.error) setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"error",veoError:d.error.message};return u;});
          else { const uri=d.response?.predictions?.[0]?.gcsUri||d.response?.videos?.[0]?.gcsUri||storageUri||"Check GCS"; setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"done",videoUri:uri};return u;}); }
        }
      } catch(e){clearInterval(pollRef.current[k]);delete pollRef.current[k];setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"error",veoError:e.message};return u;});}
    };
    pollRef.current[k]=setInterval(poll,10000); poll();
  },[storageUri]);

  useEffect(()=>()=>{Object.values(pollRef.current).forEach(id=>clearInterval(id));},[]);

  // ── Unified style descriptor ──
  const getStyleDesc=useCallback(()=>{
    if(stylePreset==="youtube"&&ytAnalysis) return ytAnalysis;
    if(stylePreset==="custom") return customStyle.trim()||"Cinematic — film-grade wide lenses, motivated dramatic lighting, rich color grading";
    return `${selStyle?.label} — ${selStyle?.desc}`;
  },[stylePreset,ytAnalysis,customStyle,selStyle]);

  // ── Analyze YouTube video ──
  const analyzeYtStyle=useCallback(async()=>{
    const id=extractYtId(ytUrl);
    if(!id){setYtError("Can't find a video ID — check the URL.");return;}
    if(ytFrames.length===0){setYtError("Upload at least 1 screenshot first.");return;}
    setYtAnalyzing(true); setYtError(""); setYtAnalysis(null); setYtMeta(null);

    let metaContext="";
    if(ytApiKey.trim()){
      try {
        const r=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${ytApiKey.trim()}`);
        if(r.ok){const j=await r.json();const sn=j.items?.[0]?.snippet;if(sn){const meta={title:sn.title,channel:sn.channelTitle,tags:(sn.tags||[]).slice(0,10).join(", "),desc:(sn.description||"").slice(0,500)};setYtMeta(meta);metaContext=`\n\n---\nVIDEO CONTEXT\nTitle: "${meta.title}"\nChannel: ${meta.channel}\nTags: ${meta.tags||"none"}\nDescription: ${meta.desc}\n---`;}}
      } catch {}
    }

    try {
      const imageBlocks=ytFrames.map(f=>({type:"image",source:{type:"base64",media_type:f.mimeType,data:f.base64}}));
      const textBlock={type:"text",text:`You are a cinematography expert analyzing video frames to extract a reusable visual style descriptor for AI video generation.

These ${ytFrames.length} frames are screenshots taken at different moments from the same video.${metaContext}

Study all frames as a unified aesthetic system. Extract the visual language with maximum precision and specificity.

Analyze:
• COLOR GRADING — dominant palette, shadows/midtones/highlights treatment, color temperature, saturation, any LUT character (teal-orange, bleach bypass, warm film emulation, cool desaturated, etc.)
• LIGHTING — quality (hard/soft/diffuse), sources (natural window, overcast, artificial key/fill, practicals), shadow hardness, time-of-day feel
• LENS & OPTICS — focal length character (wide, standard, telephoto), depth of field treatment, bokeh quality, any optical artifacts (flares, distortion, vignetting)
• CAMERA BEHAVIOR — stabilization vs handheld float, motion handling (crisp or blur), typical framing distance
• COMPOSITION — framing tendencies, negative space usage, foreground/background layering, symmetry or asymmetry
• TEXTURE — film grain level, digital sharpness, halation, noise character

Output ONLY a single paragraph of 90-130 words starting with "STYLE:". Write it as a direct cinematic prompt a video AI receives. Be concrete — name exact looks: "warm teal-shifted shadows," "Zeiss 35mm at T1.4," "overcast north-facing window light." No bullet points, no preamble, no explanation outside the paragraph.`};

      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:[...imageBlocks,textBlock]}]})});
      const data=await res.json();
      const txt=data.content?.map(c=>c.text||"").join("").trim();
      if(!txt) throw new Error("Empty response");
      setYtAnalysis(txt);
    } catch(e){setYtError(`Analysis failed: ${e.message}`);}
    setYtAnalyzing(false);
  },[ytUrl,ytApiKey,ytFrames]);

  // ── Build system prompt ──
  const buildSys=useCallback((allSents,styleDesc,refNote)=>`You are a senior visual director writing generation prompts for Google Veo 3.1, a state-of-the-art text-to-video model.

═══ VISUAL LANGUAGE ═══
${styleDesc}

═══ PRODUCTION SPECS ═══
Aspect ratio: ${aspectRatio}  |  Clip duration: ${duration}s per scene  |  Model: Veo 3.1
${notes.trim()?`Director's notes: ${notes.trim()}`:""}
${refNote?refNote:""}

═══ FULL SCRIPT (read for continuity) ═══
${allSents.map((s,i)=>`[${i+1}] ${s}`).join("\n")}

═══ PROMPT WRITING RULES ═══
1. Length: 75-110 words per prompt. Dense, specific, no filler.
2. Structure: open with SHOT TYPE + SUBJECT → ENVIRONMENT → LIGHTING → CAMERA MOVEMENT → MOOD/TEXTURE.
3. Express the visual language concretely in every prompt — don't describe the style, embody it through specific details.
4. Continuity: lighting direction, color temperature, and focal length should evolve logically scene-to-scene. Reference prior scene context.
5. Never use vague adjectives ("beautiful," "stunning," "cinematic") — use specific cinematographic language instead.
6. No text, titles, captions, watermarks, or UI elements in any prompt.
7. Translate meaning into pure visual action — never echo the script sentence literally.

Shot vocabulary: EWS, WS, MWS, MS, MCU, CU, ECU, OTS, POV, bird's-eye, worm's-eye, Dutch angle
Camera moves: locked-off, slow dolly push, pull-back reveal, lateral tracking, pan, tilt, crane rise, handheld float, rack focus

═══ RESPONSE FORMAT ═══
Return ONLY a valid JSON array. Each element: { "prompt": string, "mood": "1-2 words", "setting": "1-3 words", "camera": "movement" }
No markdown fences. No explanation outside the array.`
  ,[aspectRatio,duration,notes]);

  // ── Generate all prompts ──
  async function generate(){
    setStep(2); setError(""); setScenes([]); setProg(0); setGenLabel("");
    const sents=splitS(script);
    if(!sents.length){setError("No valid sentences found. Add proper sentence punctuation to your script.");setStep(1);return;}
    const sd=getStyleDesc();
    const refNote=hasStyleRef?"STYLE REFERENCE IMAGES PROVIDED: Precisely match the color palette, lighting character, texture, and compositional tendencies from the reference images in every scene.":"";
    let idCounter=0;
    let all=sents.map(s=>({id:`s_${++idCounter}_${Date.now()}`,sentence:s,prompt:"",mood:"",setting:"",camera:"",veoStatus:"pending"}));
    setScenes([...all]);
    const BATCH=4,total=Math.ceil(sents.length/BATCH);
    for(let b=0;b<total;b++){
      const st=b*BATCH,batch=sents.slice(st,st+BATCH);
      setGenLabel(`Writing prompt${batch.length>1?"s":""} for scene${batch.length>1?"s":""} ${st+1}${batch.length>1?`–${st+batch.length}`:""}…`);
      const sys=buildSys(sents,sd,refNote);
      const usr=[`Write prompts for scene${batch.length>1?"s":""} ${st+1}${batch.length>1?`–${st+batch.length}`:""}:`,"",...batch.map((s,i)=>`[${st+i+1}] "${s}"`),"",`Return a JSON array of exactly ${batch.length} object${batch.length>1?"s":""}.`,`Each prompt must be 75-110 words and fully express the visual language described in the style section.`].join("\n");
      try {
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,system:sys,messages:[{role:"user",content:usr}]})});
        const data=await res.json(); const txt=data.content?.map(c=>c.text||"").join("")||"";
        const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
        if(!Array.isArray(parsed)) throw new Error("Response is not an array");
        parsed.forEach((item,i)=>{const idx=st+i;if(idx<all.length&&item?.prompt)all[idx]={...all[idx],...item,veoStatus:"prompt_ready"};});
        setScenes([...all]);
      } catch {
        batch.forEach((_,i)=>{const idx=st+i;if(idx<all.length)all[idx]={...all[idx],prompt:"[Failed — click ↺ Regenerate]",mood:"—",setting:"—",camera:"—",veoStatus:"error",veoError:"Claude API error"};});
        setScenes([...all]);
      }
      setProg(Math.round(((b+1)/total)*100));
    }
    setGenLabel(""); setStep(3);
    if(hasCreds){
      const q=all.map((_,i)=>i).filter(i=>all[i].prompt&&!all[i].prompt.startsWith("["));
      for(let i=0;i<q.length;i+=2){await Promise.all(q.slice(i,i+2).map(idx=>submit(idx,all[idx].prompt)));if(i+2<q.length)await new Promise(r=>setTimeout(r,2000));}
    }
  }

  // ── Regenerate one scene ──
  const regenerateScene=useCallback(async(idx)=>{
    const currentScenes=scenesRef.current;
    const scene=currentScenes[idx]; if(!scene) return;
    setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"regenerating",veoError:null};return u;});
    const sents=currentScenes.map(s=>s.sentence);
    const sd=getStyleDesc();
    const refNote=hasStyleRef?"STYLE REFERENCE IMAGES PROVIDED: Match their color palette, lighting, texture, lens aesthetic.":"";
    const sys=buildSys(sents,sd,refNote);
    const prev=idx>0?currentScenes[idx-1]:null;
    const next=idx<currentScenes.length-1?currentScenes[idx+1]:null;
    const usr=[
      `Regenerate the prompt for scene ${idx+1} only.`,``,
      `Scene: [${idx+1}] "${scene.sentence}"`,``,
      ...(prev?[`Previous scene [${idx}]: "${prev.sentence}" — Mood: ${prev.mood}, Setting: ${prev.setting}, Camera: ${prev.camera}`]:[]),
      ...(next?[`Next scene [${idx+2}]: "${next.sentence}"`]:[]),``,
      `Return a JSON array of exactly 1 object. Generate a meaningfully different take — vary the shot type or angle while maintaining visual continuity and matching the visual language.`,
    ].join("\n");
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:sys,messages:[{role:"user",content:usr}]})});
      const data=await res.json(); const txt=data.content?.map(c=>c.text||"").join("")||"";
      const parsed=JSON.parse(txt.replace(/```json|```/g,"").trim());
      const item=parsed?.[0];
      if(!item?.prompt) throw new Error("No valid prompt returned");
      setScenes(p=>{const u=[...p];u[idx]={...u[idx],...item,veoStatus:"prompt_ready",_justRegenerated:true};return u;});
    } catch(e) {
      setScenes(p=>{const u=[...p];u[idx]={...u[idx],veoStatus:"error",veoError:e?.message||"Regeneration failed — try again"};return u;});
    }
  },[getStyleDesc,hasStyleRef,buildSys]);

  // ── Send all ready scenes ──
  const sendAllToVeo=useCallback(async()=>{
    if(!hasCreds) return;
    const s=scenesRef.current;
    const ready=s.map((_,i)=>i).filter(i=>s[i].veoStatus==="prompt_ready"&&s[i].prompt&&!s[i].prompt.startsWith("["));
    for(let i=0;i<ready.length;i+=2){await Promise.all(ready.slice(i,i+2).map(idx=>submit(idx,s[idx].prompt)));if(i+2<ready.length)await new Promise(r=>setTimeout(r,2000));}
  },[hasCreds,submit]);

  // ── Reorder ──
  const moveScene=useCallback((idx,dir)=>{setScenes(p=>{const u=[...p];const sw=idx+dir;if(sw<0||sw>=u.length)return p;[u[idx],u[sw]]=[u[sw],u[idx]];return u;});},[]);

  const dn=scenes.filter(s=>s.veoStatus==="done").length;
  const en=scenes.filter(s=>s.veoStatus==="error").length;
  const an=scenes.filter(s=>["submitting","polling"].includes(s.veoStatus)).length;
  const readyCount=scenes.filter(s=>s.veoStatus==="prompt_ready").length;
  const isGenerating=step===2;

  // ─────────────────────────────────────────────────────────────────────────────
  return (<>
    <div style={{minHeight:"100vh",background:"#111113",color:"#e0e0e0",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",opacity:0.025,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:880,margin:"0 auto",padding:"32px 24px 80px"}}>

        {/* HEADER */}
        <div style={{marginBottom:30,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:9,marginBottom:11}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:an>0?"#E74C3C":"#D4A04A",boxShadow:an>0?"0 0 10px #E74C3C88":"0 0 10px #D4A04A44",animation:an>0?"pulse 1.5s infinite":"none"}}/>
              <span style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"#D4A04A",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>Script → Video Pipeline</span>
            </div>
            {/* Breadcrumb */}
            <div style={{display:"flex",alignItems:"center",marginBottom:13}}>
              {[{n:0,label:"Script"},{n:1,label:"Direction"},{n:3,label:"Scenes"}].map((s,i,arr)=>{
                const isActive=step===s.n||(step===2&&s.n===1);
                const isPast=step>s.n&&!(step===2&&s.n===3);
                const canNav=isPast||(s.n===3&&step===3);
                return (
                  <span key={s.n} style={{display:"inline-flex",alignItems:"center"}}>
                    <button onClick={()=>{if(canNav)setStep(s.n);}} disabled={!canNav&&!isActive}
                      style={{background:"none",border:"none",padding:"2px 0",cursor:canNav?"pointer":"default",fontSize:11,fontWeight:isActive?700:400,color:isActive?"#f0f0f0":isPast?"#D4A04A":"#333",fontFamily:"'JetBrains Mono',monospace",textDecoration:isPast?"underline":"none",textUnderlineOffset:3,transition:"color 0.15s"}}>
                      {s.label}
                    </button>
                    {i<arr.length-1&&<span style={{margin:"0 7px",color:"#292929",fontSize:10}}>›</span>}
                  </span>
                );
              })}
            </div>
            <h1 style={{fontSize:step===0?32:22,fontWeight:700,margin:0,fontFamily:"'Source Serif 4',Georgia,serif",color:"#f5f5f5",lineHeight:1.2}}>
              {step===0?"Script to Visual":step===1?"Creative Direction":step===2?"Generating…":"Scene Breakdown"}
            </h1>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {signedIn&&auth.user.picture&&<img src={auth.user.picture} alt="" style={{width:28,height:28,borderRadius:"50%",border:"2px solid rgba(126,203,139,0.3)"}}/>}
            <button onClick={()=>setSC(!showCreds)} style={{...btnS("transparent",hasCreds?"#7ECB8B":"#666",`1px solid ${hasCreds?"rgba(126,203,139,0.22)":"rgba(255,255,255,0.07)"}`),padding:"8px 14px"}}>
              {hasCreds?"✓ Connected":"⚙ Connect"}
            </button>
          </div>
        </div>

        {/* CONNECT PANEL */}
        {showCreds&&(
          <div style={{marginBottom:22,padding:22,borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.055)",animation:"fadeIn 0.3s ease"}}>
            <div style={{display:"flex",marginBottom:18,borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",width:"fit-content"}}>
              {[{id:"google",l:"Google Sign-In"},{id:"manual",l:"Manual Token"}].map(m=>(
                <button key={m.id} onClick={()=>setAM(m.id)} style={{padding:"9px 18px",fontSize:11,fontWeight:600,border:"none",cursor:"pointer",background:authMode===m.id?"rgba(212,160,74,0.12)":"transparent",color:authMode===m.id?"#D4A04A":"#666",fontFamily:"'JetBrains Mono',monospace"}}>{m.l}</button>
              ))}
            </div>
            {authMode==="google"&&!signedIn&&(
              <div>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:10,color:"#666",display:"block",marginBottom:5}}>OAuth Client ID *</label>
                  <input value={auth.clientId} onChange={e=>auth.setClientId(e.target.value)} placeholder="123456789.apps.googleusercontent.com" style={inpB}/>
                </div>
                <button onClick={auth.signIn} disabled={!auth.gsiReady||!auth.clientId}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"11px 22px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:(auth.gsiReady&&auth.clientId)?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.02)",color:(auth.gsiReady&&auth.clientId)?"#e0e0e0":"#3a3a3a",fontSize:12,fontWeight:600,cursor:(auth.gsiReady&&auth.clientId)?"pointer":"default"}}>
                  <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.78.42 3.47 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Sign in with Google
                </button>
                <div style={{marginTop:12,padding:11,borderRadius:8,background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.04)"}}>
                  <p style={{margin:0,fontSize:9.5,color:"#555",lineHeight:1.8,fontFamily:"'JetBrains Mono',monospace"}}>
                    <span style={{color:"#D4A04A",fontWeight:600}}>Setup:</span> console.cloud.google.com → APIs & Services → Credentials → OAuth Client (Web) → add <span style={{color:"#6BA5E7"}}>{window.location.origin}</span> to Authorized JS Origins
                  </p>
                </div>
              </div>
            )}
            {authMode==="google"&&signedIn&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  {auth.user.picture&&<img src={auth.user.picture} alt="" style={{width:38,height:38,borderRadius:"50%",border:"2px solid rgba(126,203,139,0.3)"}}/>}
                  <div>
                    <p style={{margin:0,fontSize:13,color:"#e0e0e0",fontWeight:600}}>{auth.user.name}</p>
                    <p style={{margin:"2px 0 0",fontSize:10,color:"#7ECB8B",fontFamily:"'JetBrains Mono',monospace"}}>{auth.user.email}</p>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={auth.refresh} style={btnS("transparent","#6BA5E7","1px solid rgba(107,165,231,0.2)")}>Refresh</button>
                  <button onClick={auth.signOut} style={btnS("transparent","#E74C3C","1px solid rgba(231,76,60,0.2)")}>Sign Out</button>
                </div>
              </div>
            )}
            {authMode==="manual"&&(
              <div>
                <label style={{fontSize:10,color:"#666",display:"block",marginBottom:5}}>Access Token</label>
                <input value={manualToken} onChange={e=>setMT(e.target.value)} type="password" placeholder="ya29.a0Af…" style={inpB}/>
              </div>
            )}
            <div style={{marginTop:18,paddingTop:18,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
              <label style={{...secL,marginBottom:11,display:"block"}}>Project Config</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
                <div><label style={{fontSize:10,color:"#555",display:"block",marginBottom:5}}>Project ID *</label><input value={projectId} onChange={e=>setPid(e.target.value)} placeholder="my-gcp-project" style={inpB}/></div>
                <div><label style={{fontSize:10,color:"#555",display:"block",marginBottom:5}}>Location</label><select value={loc} onChange={e=>setLoc(e.target.value)} style={{...inpB,cursor:"pointer"}}>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                <div><label style={{fontSize:10,color:"#555",display:"block",marginBottom:5}}>Veo Model</label><select value={veoModel} onChange={e=>setVeoModel(e.target.value)} style={{...inpB,cursor:"pointer"}}>{VEO_MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
                <div><label style={{fontSize:10,color:"#555",display:"block",marginBottom:5}}>GCS Output URI</label><input value={storageUri} onChange={e=>setSU(e.target.value)} placeholder="gs://bucket/output/" style={inpB}/></div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 0 — Script */}
        {step===0&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {!showCreds&&<p style={{fontSize:14,color:"#666",marginBottom:18,lineHeight:1.65}}>Paste your voiceover script below. Each sentence becomes a scene — Claude writes a cinematic Veo 3.1 prompt for each one{hasCreds?" and auto-submits to Vertex AI":""}.</p>}
            <textarea value={script} onChange={e=>setScript(e.target.value)}
              placeholder={"Paste your script here…\n\nTip: Each sentence becomes one scene. Use complete sentences with proper punctuation.\n\nExample:\nThe city wakes before the sun rises. Steam curls from iron grates as the first commuters emerge. A street vendor arranges oranges in careful rows, her breath visible in the cold air."}
              style={{...inpB,minHeight:240,fontSize:14,padding:22,fontFamily:"'Source Serif 4',Georgia,serif",lineHeight:1.85,resize:"vertical"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                {sc>=2&&<span style={{fontSize:11,color:"#555",fontFamily:"'JetBrains Mono',monospace"}}>{sc} scenes detected</span>}
                {sc===1&&<span style={{fontSize:11,color:"#555",fontFamily:"'JetBrains Mono',monospace"}}>1 sentence</span>}
                {script.length>0&&<span style={{fontSize:10,color:"#2e2e2e",fontFamily:"'JetBrains Mono',monospace"}}>{script.length} chars</span>}
              </div>
              <button onClick={()=>script.trim()&&setStep(1)} disabled={!script.trim()}
                style={{padding:"11px 30px",borderRadius:8,border:"none",background:script.trim()?"linear-gradient(135deg,#D4A04A,#B8860B)":"rgba(255,255,255,0.04)",color:script.trim()?"#1a1a1a":"#3a3a3a",fontSize:12,fontWeight:700,cursor:script.trim()?"pointer":"default",fontFamily:"'JetBrains Mono',monospace"}}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — Direction */}
        {step===1&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>

            {/* Visual Style */}
            <div style={{marginBottom:26}}>
              <label style={secL}>Visual Style</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(172px,1fr))",gap:9,marginTop:11}}>
                {STYLE_PRESETS.map(s=>(
                  <button key={s.id} onClick={()=>setStylePreset(s.id)}
                    style={{padding:"13px 14px",borderRadius:10,border:"1px solid",borderColor:stylePreset===s.id?"#D4A04A":"rgba(255,255,255,0.055)",background:stylePreset===s.id?"rgba(212,160,74,0.07)":"rgba(255,255,255,0.013)",color:stylePreset===s.id?"#D4A04A":"#888",textAlign:"left",cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{s.label}</div>
                    <div style={{fontSize:10.5,color:stylePreset===s.id?"#B8860B":"#484848",lineHeight:1.4}}>{s.desc}</div>
                  </button>
                ))}
              </div>

              {stylePreset==="custom"&&(
                <textarea value={customStyle} onChange={e=>setCustomStyle(e.target.value)}
                  placeholder="Describe the visual language precisely — e.g. 'Desaturated teal shadows with warm skin tones, anamorphic 2.39:1 with lens flares, slow push-in dolly shots, overcast soft directional light, shallow DOF with 85mm'"
                  style={{...inpB,minHeight:90,marginTop:11,fontFamily:"'Source Serif 4',Georgia,serif",fontSize:13,lineHeight:1.7}}/>
              )}

              {stylePreset==="youtube"&&(
                <div style={{marginTop:13,padding:22,borderRadius:12,background:"rgba(255,255,255,0.017)",border:"1px solid rgba(255,255,255,0.06)"}}>

                  {/* ① URL */}
                  <div style={{marginBottom:18}}>
                    <label style={{...secL,fontSize:9,display:"block",marginBottom:7}}>① YouTube Video URL</label>
                    <input value={ytUrl} onChange={e=>{setYtUrl(e.target.value);setYtAnalysis(null);setYtMeta(null);setYtError("");}}
                      placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
                      style={{...inpB,fontSize:12}}/>
                    {ytUrl&&!extractYtId(ytUrl)&&<p style={{margin:"5px 0 0",fontSize:10,color:"#E74C3C",fontFamily:"'JetBrains Mono',monospace"}}>⚠ Can't find a video ID — check the URL format.</p>}
                    {ytUrl&&extractYtId(ytUrl)&&<p style={{margin:"5px 0 0",fontSize:10,color:"#7ECB8B",fontFamily:"'JetBrains Mono',monospace"}}>✓ Video ID: {extractYtId(ytUrl)}</p>}
                  </div>

                  {/* ② Frames */}
                  <div style={{marginBottom:18}}>
                    <label style={{...secL,fontSize:9,display:"block",marginBottom:5}}>② Upload Frames from the Video</label>
                    <p style={{fontSize:11,color:"#4a4a4a",margin:"0 0 11px",lineHeight:1.6}}>
                      Pause the video at different moments — wide establishing shots, close-ups, low-light scenes, action cuts — and screenshot them. Upload 3–6 frames. The more varied the better: Claude studies them together as a visual system.
                    </p>
                    <ImageUploadZone images={ytFrames} onAdd={img=>{setYtFrames(p=>[...p,img].slice(0,6));setYtAnalysis(null);}} onRemove={i=>{if(ytFrames[i]?.preview)URL.revokeObjectURL(ytFrames[i].preview);setYtFrames(p=>p.filter((_,j)=>j!==i));setYtAnalysis(null);}} max={6} label="Video Frames" sub=""/>
                  </div>

                  {/* ③ API Key */}
                  <div style={{marginBottom:18,padding:13,borderRadius:9,background:"rgba(255,255,255,0.013)",border:"1px solid rgba(255,255,255,0.042)"}}>
                    <label style={{...secL,fontSize:9,display:"block",marginBottom:5}}>
                      ③ YouTube Data API Key{" "}
                      <span style={{color:"#3a3a3a",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — enriches analysis with title, tags & description)</span>
                    </label>
                    <input value={ytApiKey} onChange={e=>setYtApiKey(e.target.value)} type="password" placeholder="AIza…" style={{...inpB,fontSize:12}}/>
                    <p style={{margin:"7px 0 0",fontSize:9.5,color:"#333",lineHeight:1.6,fontFamily:"'JetBrains Mono',monospace"}}>
                      Free key at <span style={{color:"#6BA5E7"}}>console.cloud.google.com</span> → YouTube Data API v3 → Credentials → API Key
                    </p>
                  </div>

                  {/* Analyze */}
                  <button onClick={analyzeYtStyle} disabled={ytAnalyzing||!ytUrl||!extractYtId(ytUrl)||ytFrames.length===0}
                    style={{width:"100%",padding:"11px 0",borderRadius:8,border:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,transition:"all 0.2s",
                      cursor:(ytAnalyzing||!ytUrl||!extractYtId(ytUrl)||ytFrames.length===0)?"not-allowed":"pointer",
                      background:(ytAnalyzing||!ytUrl||!extractYtId(ytUrl)||ytFrames.length===0)?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#D4A04A,#B8860B)",
                      color:(ytAnalyzing||!ytUrl||!extractYtId(ytUrl)||ytFrames.length===0)?"#3a3a3a":"#1a1a1a"}}>
                    {ytAnalyzing?<span style={{display:"inline-flex",alignItems:"center",gap:8}}><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>↻</span>Analyzing with Claude…</span>:ytAnalysis?"↺ Re-analyze":"Analyze Style ✦"}
                  </button>

                  {ytError&&<p style={{marginTop:10,fontSize:11,color:"#E74C3C",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5}}>⚠ {ytError}</p>}

                  {ytAnalysis&&(
                    <div style={{marginTop:13,padding:15,borderRadius:10,background:"rgba(126,203,139,0.03)",border:"1px solid rgba(126,203,139,0.13)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <label style={{...secL,fontSize:9,color:"#7ECB8B",margin:0}}>✓ Style Extracted</label>
                        {ytMeta&&<span style={{fontSize:9.5,color:"#3a3a3a",fontFamily:"'JetBrains Mono',monospace",maxWidth:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ytMeta.title}</span>}
                      </div>
                      <p style={{margin:0,fontSize:12,color:"#bbb",lineHeight:1.75,fontFamily:"'Source Serif 4',Georgia,serif"}}>{ytAnalysis}</p>
                      <p style={{margin:"9px 0 0",fontSize:9.5,color:"#7ECB8B",fontFamily:"'JetBrains Mono',monospace"}}>✓ Applied to every scene prompt automatically.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Art Style Reference */}
            <div style={{marginBottom:26,padding:22,borderRadius:12,background:"rgba(255,255,255,0.012)",border:"1px solid rgba(255,255,255,0.045)"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                <label style={{...secL,margin:0}}>Art Style Reference</label>
                <span style={{fontSize:9.5,color:"#3a3a3a",fontFamily:"'JetBrains Mono',monospace"}}>(optional)</span>
              </div>
              <p style={{fontSize:11,color:"#4a4a4a",margin:"0 0 13px",lineHeight:1.55}}>Upload images that define the palette, lighting, texture, and composition you want. Claude reads them alongside your style selection and incorporates them into every prompt.</p>
              <ImageUploadZone images={styleImgs} onAdd={img=>setStyleImgs(p=>[...p,img].slice(0,3))} onRemove={i=>{if(styleImgs[i]?.preview)URL.revokeObjectURL(styleImgs[i].preview);setStyleImgs(p=>p.filter((_,j)=>j!==i));}} max={3} label="Reference Images" sub=""/>
            </div>

            {/* Aspect + Duration */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22,marginBottom:26}}>
              <div><label style={secL}>Aspect Ratio</label><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}>{ASPECT_RATIOS.map(ar=><button key={ar} onClick={()=>setAR(ar)} style={pillS(aspectRatio===ar)}>{ar}</button>)}</div></div>
              <div><label style={secL}>Clip Duration</label><div style={{display:"flex",gap:7,marginTop:11,flexWrap:"wrap"}}>{DURATIONS.map(d=><button key={d} onClick={()=>setDur(d)} style={pillS(duration===d)}>{d}s</button>)}</div></div>
            </div>

            {/* Director's Notes */}
            <div style={{marginBottom:26}}>
              <label style={secL}>Director's Notes <span style={{color:"#333",fontWeight:400}}>(optional)</span></label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="e.g. Maintain continuous golden-hour warmth throughout. Use slow-motion for emotional beats. Keep camera movement subtle — no abrupt handheld shake. Match the pacing of the narration."
                style={{...inpB,minHeight:70,marginTop:11,fontFamily:"'Source Serif 4',Georgia,serif",fontSize:13,lineHeight:1.7}}/>
            </div>

            {/* Negative Prompt */}
            <div style={{marginBottom:26}}>
              <label style={secL}>Negative Prompt <span style={{color:"#333",fontWeight:400}}>(optional)</span></label>
              <p style={{fontSize:11,color:"#4a4a4a",margin:"5px 0 9px",lineHeight:1.55}}>What to avoid in every clip — sent directly to the Veo API.</p>
              <textarea value={negativePrompt} onChange={e=>setNegPrompt(e.target.value)}
                placeholder="e.g. blurry, low quality, text overlays, watermarks, distorted faces, extra limbs, overexposed, cartoonish"
                style={{...inpB,minHeight:58,fontFamily:"'Source Serif 4',Georgia,serif",fontSize:13,lineHeight:1.7}}/>
            </div>

            {/* Bottom action bar */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderRadius:12,background:"rgba(212,160,74,0.03)",border:"1px solid rgba(212,160,74,0.09)",flexWrap:"wrap",gap:12}}>
              <div>
                <span style={{fontSize:11,color:"#666",fontFamily:"'JetBrains Mono',monospace"}}>
                  {sc} scene{sc!==1?"s":""} · {styleLabel} · {aspectRatio} · {duration}s
                  {hasStyleRef?` · ${styleImgs.length} ref`:""}
                  {negativePrompt.trim()?" · neg prompt":""}
                </span>
                {hasCreds&&<span style={{fontSize:10,color:"#7ECB8B",display:"block",marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>✓ Auto-submit to {curModel?.label}{signedIn?` · ${auth.user.email}`:""}</span>}
                {ytNotReady&&<span style={{fontSize:10,color:"#E74C3C",display:"block",marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>⚠ Analyze the video first</span>}
              </div>
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setStep(0)} style={btnS("transparent","#666","1px solid rgba(255,255,255,0.08)")}>← Back</button>
                <button onClick={generate} disabled={ytNotReady}
                  style={{padding:"11px 28px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s",background:ytNotReady?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#D4A04A,#B8860B)",color:ytNotReady?"#3a3a3a":"#1a1a1a",cursor:ytNotReady?"not-allowed":"pointer"}}>
                  {hasCreds?"Generate & Submit ✦":"Generate Prompts ✦"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Generating */}
        {step===2&&(
          <div style={{animation:"fadeIn 0.4s ease",textAlign:"center",paddingTop:44}}>
            <div style={{width:50,height:50,margin:"0 auto 18px",borderRadius:"50%",border:"2px solid rgba(212,160,74,0.12)",borderTopColor:"#D4A04A",animation:"spin 1s linear infinite"}}/>
            <p style={{fontSize:13,color:"#666",marginBottom:5}}>{genLabel||"Generating scene prompts…"}</p>
            <p style={{fontSize:11,color:"#3a3a3a",marginBottom:18,fontFamily:"'JetBrains Mono',monospace"}}>
              {scenes.filter(s=>s.veoStatus==="prompt_ready").length} of {scenes.length} ready
            </p>
            <div style={{width:"100%",maxWidth:360,height:3,borderRadius:2,background:"rgba(255,255,255,0.04)",margin:"0 auto",overflow:"hidden"}}>
              <div style={{width:`${progress}%`,height:"100%",borderRadius:2,background:"linear-gradient(90deg,#D4A04A,#B8860B)",transition:"width 0.5s ease"}}/>
            </div>
            <p style={{fontSize:10,color:"#2e2e2e",marginTop:9,fontFamily:"'JetBrains Mono',monospace"}}>{progress}%</p>
          </div>
        )}

        {/* STEP 3 — Scenes */}
        {step===3&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:9}}>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:"#4a4a4a",fontFamily:"'JetBrains Mono',monospace"}}>{scenes.length} scenes</span>
                {hasStyleRef&&<span style={{fontSize:10,color:"#C084FC",fontFamily:"'JetBrains Mono',monospace"}}>🎨 {styleImgs.length} ref</span>}
                {dn>0&&<span style={{fontSize:10,color:"#7ECB8B",fontFamily:"'JetBrains Mono',monospace"}}>✓ {dn}</span>}
                {an>0&&<span style={{fontSize:10,color:"#6BA5E7",fontFamily:"'JetBrains Mono',monospace",animation:"pulse 1.5s infinite"}}>◎ {an}</span>}
                {en>0&&<span style={{fontSize:10,color:"#E74C3C",fontFamily:"'JetBrains Mono',monospace"}}>✕ {en}</span>}
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                <button onClick={()=>setStep(1)} style={btnS("transparent","#666","1px solid rgba(255,255,255,0.07)")}>← Back</button>
                <button onClick={()=>{setStep(0);setScenes([]);}} style={btnS("transparent","#3a3a3a","1px solid rgba(255,255,255,0.05)")}>New</button>
                {hasCreds&&readyCount>0&&(
                  <button onClick={sendAllToVeo} style={btnS("rgba(212,160,74,0.09)","#D4A04A","1px solid rgba(212,160,74,0.22)")} title={`Submit all ${readyCount} ready scenes`}>
                    ↑ Send {readyCount} to Veo
                  </button>
                )}
                <button onClick={()=>{navigator.clipboard.writeText(scenes.map((s,i)=>`--- Scene ${i+1} ---\n"${s.sentence}"\nMood: ${s.mood}  Setting: ${s.setting}  Camera: ${s.camera}\n\nPROMPT:\n${s.prompt}${s.videoUri?`\n\nVideo: ${s.videoUri}`:""}`).join("\n\n"));setAC(true);setTimeout(()=>setAC(false),2000);}}
                  style={btnS("transparent",allCopied?"#7ECB8B":"#D4A04A",`1px solid ${allCopied?"rgba(126,203,139,0.25)":"rgba(212,160,74,0.22)"}`)}>
                  {allCopied?"✓ Copied":"Copy All"}
                </button>
                <button onClick={()=>setShowExport(true)} style={{...btnS("linear-gradient(135deg,#D4A04A,#B8860B)","#1a1a1a"),fontWeight:700}}>⬇ Export</button>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {scenes.map((s,i)=>(
                <SceneCard key={s.id||i} scene={s} index={i} total={scenes.length}
                  onUpdatePrompt={(idx,p)=>setScenes(pr=>{const u=[...pr];u[idx]={...u[idx],prompt:p,veoStatus:"prompt_ready"};return u;})}
                  onRetryVeo={idx=>{if(hasCreds&&scenes[idx].prompt)submit(idx,scenes[idx].prompt);}}
                  onRegenerate={regenerateScene} onMoveUp={idx=>moveScene(idx,-1)} onMoveDown={idx=>moveScene(idx,1)}
                  hasCreds={hasCreds} isGenerating={isGenerating}
                />
              ))}
            </div>

            <div style={{marginTop:22,padding:"13px 19px",borderRadius:10,background:"rgba(255,255,255,0.012)",border:"1px solid rgba(255,255,255,0.032)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <p style={{fontSize:11,color:"#3a3a3a",margin:0}}>Click to expand · ↺ Regenerate · ▲▼ Reorder · Edit inline</p>
              {!hasCreds&&<span style={{fontSize:10,color:"#D4A04A",fontFamily:"'JetBrains Mono',monospace"}}>⚙ Connect to submit to Veo</span>}
            </div>
          </div>
        )}

        {error&&<div style={{marginTop:14,padding:14,borderRadius:10,background:"rgba(231,76,60,0.06)",border:"1px solid rgba(231,76,60,0.15)",color:"#E74C3C",fontSize:12,lineHeight:1.5}}>✕ {error}</div>}
      </div>

      {showExport&&<ExportModal scenes={scenes} aspectRatio={aspectRatio} duration={duration} veoModel={veoModel} negativePrompt={negativePrompt} styleLabel={styleLabel} onClose={()=>setShowExport(false)}/>}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        textarea::placeholder,input::placeholder{color:#2e2e2e}
        textarea:focus,input:focus,select:focus{border-color:rgba(212,160,74,0.32)!important;outline:none}
        button:hover:not(:disabled){opacity:0.8}
        select option{background:#1e1e20;color:#e0e0e0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:3px}
      `}</style>
    </div>
  </>);
}
