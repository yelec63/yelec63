/* YELEC63 – éléments interactifs. Une ligne dans index.html : <script src="ye-extras.js" defer></script> */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;

/* ---------- CSS (utilise les variables de votre site) ---------- */
const css=document.createElement("style");
css.textContent=`
.ye-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.hero .ye-lit{transition:opacity .7s,filter .7s}
.hero:not(.ye-on) .ye-lit{opacity:.45;filter:saturate(.3)}
.ye-sw{position:absolute;right:var(--s);bottom:22px;z-index:3;display:flex;align-items:center;gap:12px;padding:7px 8px 7px 16px;border-radius:99px;border:1px solid var(--line2);background:var(--card);color:var(--text);font:500 .85rem "DM Sans",sans-serif;cursor:pointer;transition:border-color .3s}
.hero:not(.ye-on) .ye-sw{animation:pulse 2s infinite}
.ye-sw:hover{border-color:var(--gold)}
.ye-trk{width:46px;height:26px;border-radius:99px;background:var(--bg3);border:1px solid var(--line2);position:relative}
.ye-knob{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--muted);transition:transform .3s var(--ease),background .3s,box-shadow .3s}
.ye-on .ye-knob{transform:translateX(20px);background:var(--gold);box-shadow:0 0 14px var(--gold)}
@media(max-width:600px){.ye-sw{bottom:96px}}
.ye-svc,.ye-two{display:grid;gap:18px;margin-top:48px}
.ye-svc{grid-template-columns:1fr 1.15fr}.ye-two{grid-template-columns:1.1fr 1fr}
.ye-list{display:flex;flex-direction:column;gap:8px}
.ye-list button{font:500 1rem "DM Sans",sans-serif;text-align:left;padding:15px 18px;border-radius:var(--radius);border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;transition:transform .35s var(--ease),border-color .3s}
.ye-list button:hover{transform:translateX(6px);border-color:var(--line2)}
.ye-list button[aria-pressed=true]{border-color:var(--gold);box-shadow:inset 3px 0 0 var(--gold)}
.ye-list i{font:500 .68rem "DM Sans",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);border:1px solid var(--line2);border-radius:99px;padding:3px 10px}
.ye-panel,.ye-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:clamp(24px,4vw,38px)}
.ye-panel{display:flex;flex-direction:column;justify-content:center;min-height:260px}
.ye-panel h3,.ye-card h3{font:500 2rem/1.15 "Cormorant Garamond",serif;margin:0 0 10px}
.ye-panel p{color:var(--muted);margin:0 0 22px}
.ye-panel .btn,.ye-card .btn{align-self:flex-start}
.ye-fade{animation:ye-f .4s var(--ease)}@keyframes ye-f{from{opacity:0;transform:translateY(10px)}}
.ye-card label{display:block;font-weight:700;font-size:.9rem;margin:0 0 6px}
.ye-card select{width:100%;font:inherit;padding:12px 14px;border-radius:10px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);margin-bottom:16px}
.ye-sum{margin:2px 0 20px;color:var(--muted)}
.ye-map{width:100%;height:auto;display:block}
.ye-wire{stroke:var(--gold);stroke-width:2;stroke-dasharray:6 8;animation:ye-d 1.2s linear infinite;opacity:.8}
@keyframes ye-d{to{stroke-dashoffset:-14}}
.ye-node{cursor:pointer}.ye-node circle{fill:var(--card);stroke:var(--gold);stroke-width:3;transition:r .2s}
.ye-node:hover circle,.ye-node:focus circle{r:13}
.ye-node.ye-sel circle,.ye-hub circle{fill:var(--gold)}
.ye-node text{fill:var(--text);font:500 15px "DM Sans",sans-serif;text-anchor:middle}
#zone .zones li{cursor:pointer}
.ye-ba{position:relative;aspect-ratio:16/10;border-radius:var(--radius);overflow:hidden;--p:50%;user-select:none;touch-action:pan-y;border:1px solid var(--line);margin-top:48px}
.ye-ba img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ye-ba .ye-after{clip-path:inset(0 0 0 var(--p))}
.ye-bar{position:absolute;top:0;bottom:0;left:var(--p);width:3px;background:var(--gold);transform:translateX(-50%);pointer-events:none}
.ye-bar::after{content:"‹ ›";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--gold);color:#141414;font-weight:700;border-radius:99px;padding:8px 14px;white-space:nowrap}
.ye-ba input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0}
.ye-ba:focus-within{outline:3px solid var(--gold)}
.ye-tag{position:absolute;top:14px;background:rgba(8,8,8,.75);color:#f2f0ea;padding:4px 13px;border-radius:99px;font-size:.85rem;pointer-events:none}
@media(max-width:820px){.ye-svc,.ye-two{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.ye-wire{animation:none}}
`;
document.head.appendChild(css);

/* ---------- 1. Disjoncteur + circuit dans le hero ---------- */
const hero=$(".hero");
if(hero){
 $$(".badge,h1,.lead,.facts",hero).forEach(e=>e.classList.add("ye-lit"));
 const cv=document.createElement("canvas");cv.className="ye-cv";cv.setAttribute("aria-hidden","true");
 hero.insertBefore(cv,$(".w",hero));
 const sw=document.createElement("button");sw.className="ye-sw";sw.setAttribute("role","switch");
 sw.innerHTML=`<span id="ye-swl"></span><span class="ye-trk"><span class="ye-knob"></span></span>`;
 hero.appendChild(sw);
 const cx=cv.getContext("2d");let W,H,P=[],m={x:-999,y:-999},on=false,vis=true;
 function build(){const d=devicePixelRatio||1;W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0);P=[];
  const g=48,n=Math.round(W/60)+8;
  for(let i=0;i<n;i++){let x=Math.floor(Math.random()*W/g)*g,y=Math.floor(Math.random()*H/g)*g,h=Math.random()<.5,pts=[[x,y]],L=0;
   for(let k=0;k<5+Math.random()*4;k++){const l=(2+Math.random()*5|0)*g*(Math.random()<.5?-1:1);h?x+=l:y+=l;pts.push([x,y]);L+=Math.abs(l);h=!h}
   P.push({pts,L,t:Math.random(),v:.0009+Math.random()*.0012})}draw()}
 const at=(p,d)=>{for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l){const r=d/l;return[a[0]+(b[0]-a[0])*r,a[1]+(b[1]-a[1])*r]}d-=l}return p.pts[p.pts.length-1]};
 function draw(){cx.clearRect(0,0,W,H);cx.lineCap="round";
  for(const p of P){cx.beginPath();p.pts.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1]));
   cx.strokeStyle=on?"rgba(233,184,36,.28)":"rgba(233,184,36,.12)";cx.lineWidth=1.5;cx.stroke();
   if(on){for(let i=1;i<p.pts.length;i++){const a=p.pts[i-1],b=p.pts[i],d=Math.hypot((a[0]+b[0])/2-m.x,(a[1]+b[1])/2-m.y);
     if(d<170){cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.strokeStyle=`rgba(233,184,36,${1-d/170})`;cx.lineWidth=3;cx.shadowColor="#e9b824";cx.shadowBlur=14;cx.stroke();cx.shadowBlur=0}}
    const q=at(p,p.t*p.L);cx.beginPath();cx.arc(q[0],q[1],3.5,0,7);cx.fillStyle="#e9b824";cx.shadowColor="#e9b824";cx.shadowBlur=16;cx.fill();cx.shadowBlur=0;p.t=(p.t+p.v)%1}}
  if(on&&m.x>0){const g=cx.createRadialGradient(m.x,m.y,0,m.x,m.y,200);g.addColorStop(0,"rgba(233,184,36,.2)");g.addColorStop(1,"rgba(233,184,36,0)");cx.fillStyle=g;cx.fillRect(0,0,W,H)}}
 (function loop(){if(on&&vis&&!RM)draw();requestAnimationFrame(loop)})();
 new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(hero);
 hero.addEventListener("pointermove",e=>{const r=cv.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top;if(RM&&on)draw()});
 hero.addEventListener("pointerleave",()=>{m.x=m.y=-999});
 const set=v=>{on=v;hero.classList.toggle("ye-on",on);sw.setAttribute("aria-checked",on);$("#ye-swl").textContent=on?"Circuit sous tension":"Rétablir le courant";draw()};
 sw.onclick=()=>set(!on);
 addEventListener("resize",build);build();set(true);
}

/* ---------- 2. « Qu’est-ce qui vous arrive ? » dans #prestations ---------- */
const S=[
["Le disjoncteur saute","Dépannage électricité","Coupure, disjoncteur qui saute, panne de courant. Intervention rapide, H24.",1],
["Une fuite d’eau","Dépannage plomberie","Fuite, canalisation, robinetterie. Nous intervenons H24.",1],
["Prises, tableau, éclairage","Installation électrique","Tableaux, prises, interrupteurs, luminaires et éclairages LED, en neuf comme en rénovation.",0],
["Installation ancienne","Mise aux normes","Rénovation et mise en conformité complète de votre installation électrique.",0],
["Humidité, air vicié","VMC","Pose de ventilation mécanique contrôlée pour un air sain et une humidité maîtrisée.",0],
["Murs, plafonds, peinture","Placo & peinture","Cloisons, isolation, faux plafonds, bandes à joints et peinture.",0],
["Refaire une pièce","Rénovation intérieure","Tous vos travaux d’intérieur, avec un seul interlocuteur du devis à la livraison.",0]];
const grid=$("#prestations .svc-grid");
if(grid){
 const box=document.createElement("div");box.className="ye-svc";
 box.innerHTML=`<div class="ye-list"></div><div class="ye-panel" aria-live="polite"></div>`;
 grid.before(box);grid.style.display="none";
 const L=$(".ye-list",box),Pn=$(".ye-panel",box);let s=0;
 const r=()=>{L.innerHTML=S.map((x,i)=>`<button aria-pressed="${i==s}" data-i="${i}">${x[0]}${x[3]?"<i>H24</i>":""}</button>`).join("");
  const x=S[s];Pn.innerHTML=`<div class="ye-fade"><h3>${x[1]}</h3><p>${x[2]}</p><a class="btn btn-gold" href="${x[3]?"tel:+33650154926":"#contact"}">${x[3]?"Appeler le 06 50 15 49 26":"Demander un devis"}</a></div>`};
 L.onclick=e=>{const b=e.target.closest("button");if(b){s=+b.dataset.i;r()}};r();
}

/* ---------- 3. Demande de devis + plan cliquable dans #zone ---------- */
const zone=$("#zone .w");
if(zone){
 const T=[["Clermont-Ferrand",130,235],["Riom",170,95],["Vichy",430,60],["Thiers",410,310],["La Monnerie-le-Montel",340,190]],hub=T[4];
 let s=0,t=T[0][0];
 const box=document.createElement("div");box.className="ye-two";
 box.innerHTML=`<div class="ye-card"><h3>Votre demande</h3>
 <label for="ye-ss">Service</label><select id="ye-ss">${S.map((x,i)=>`<option value="${i}">${x[1]}</option>`).join("")}</select>
 <label for="ye-st">Ville</label><select id="ye-st">${T.map(x=>`<option>${x[0]}</option>`).join("")}</select>
 <p class="ye-sum" id="ye-sum"></p><a class="btn btn-gold" id="ye-act" href="#">…</a></div>
 <div class="ye-card"><svg class="ye-map" viewBox="0 0 600 380" role="group" aria-label="Plan des villes desservies (schéma)">
 ${T.slice(0,4).map(x=>`<line class="ye-wire" x1="${hub[1]}" y1="${hub[2]}" x2="${x[1]}" y2="${x[2]}"/>`).join("")}
 ${T.map((x,i)=>`<g class="ye-node${i==4?" ye-hub":""}" tabindex="0" role="button" data-t="${x[0]}" transform="translate(${x[1]} ${x[2]})"><circle r="10"/><text y="-20">${x[0]}</text></g>`).join("")}</svg></div>`;
 zone.appendChild(box);
 const r=()=>{const x=S[s],a=$("#ye-act");$("#ye-ss").value=s;$("#ye-st").value=t;
  $("#ye-sum").textContent=`${x[1]} à ${t} : ${x[3]?"appel direct, intervention H24.":"devis gratuit sous 48 h."}`;
  if(x[3]){a.href="tel:+33650154926";a.textContent="Appeler maintenant"}
  else{a.href="mailto:yelec63650@gmail.com?subject="+encodeURIComponent("Demande de devis – "+x[1])+"&body="+encodeURIComponent(`Bonjour, je souhaite un devis : ${x[1]} à ${t}.`);a.textContent="Envoyer ma demande"}
  $$(".ye-node",box).forEach(n=>n.classList.toggle("ye-sel",n.dataset.t==t))};
 $("#ye-ss").onchange=e=>{s=+e.target.value;r()};$("#ye-st").onchange=e=>{t=e.target.value;r()};
 $$(".ye-node",box).forEach(n=>{const go=()=>{t=n.dataset.t;r()};n.onclick=go;n.onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();go()}}});
 $$("#zone .zones li").forEach(li=>li.addEventListener("click",()=>{if(T.some(x=>x[0]==li.textContent)){t=li.textContent;r()}}));
 r();
}

/* ---------- 4. Curseur Avant / Après (optionnel, voir mode d’emploi) ---------- */
$$(".ye-ba[data-before][data-after]").forEach(ba=>{
 const a=ba.dataset.alt||"Chantier";
 ba.innerHTML=`<img src="${ba.dataset.before}" alt="${a} avant" loading="lazy"><img class="ye-after" src="${ba.dataset.after}" alt="${a} après" loading="lazy"><span class="ye-tag" style="left:14px">Avant</span><span class="ye-tag" style="right:14px">Après</span><div class="ye-bar"></div><input type="range" min="0" max="100" value="50" aria-label="Comparer avant et après">`;
 const rg=$("input",ba),set=v=>{rg.value=v;ba.style.setProperty("--p",v+"%")};rg.oninput=()=>set(rg.value);
 let done=0;new IntersectionObserver(([e])=>{if(e.isIntersecting&&!done&&!RM){done=1;const t0=performance.now();
  (function f(n){const k=(n-t0)/2200;if(k<1){set(50+40*Math.sin(k*Math.PI*2)*(1-k));requestAnimationFrame(f)}else set(50)})(t0)}},{threshold:.6}).observe(ba);
});
})();
