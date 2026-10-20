import * as XLSX from "xlsx";

// ===== Réglages =====
// Adresse secrète de la page des résultats (sans mot de passe)
const ADMIN = "/resultats-roulette-2026";
// Cotes de la roue : "weight" = chance relative (tout à 1 = chances égales)
const PRIZES = [
  { points: 5, weight: 30, text: "Petite cote, mais tu es dans le jeu !" },
  { points: 10, weight: 25, text: "Belle cote, bien joué !" },
  { points: 15, weight: 20, text: "Très belle cote !" },
  { points: 20, weight: 13, text: "Excellente cote !" },
  { points: 30, weight: 7, text: "Superbe cote, félicitations !" },
  { points: 50, weight: 5, text: "JACKPOT ! Cote maximale !" }
];

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  const r = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * total;
  let acc = 0;
  for (const p of PRIZES) { acc += p.weight; if (r < acc) return p; }
  return PRIZES[0];
}

// Heure de Bukavu (UTC+2)
async function rows(env) {
  const r = await env.DB.prepare("SELECT id,name,suffix,points,datetime(created_at,'+2 hours') AS date FROM participants ORDER BY id DESC").all();
  return r.results || [];
}

const ADMIN_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Résultats | Dinice.X Pizza</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet"><style>
:root{--red:#ba1621;--green:#237149;--ink:#18252a;--muted:#667278;--line:#eadfd7}
*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--ink);background:radial-gradient(circle at 50% 0,#fff 0 24%,transparent 57%),#fbf7f0;font-family:'DM Sans',Arial,sans-serif}
header{display:flex;align-items:center;gap:12px;padding:12px clamp(14px,5vw,60px);border-bottom:1px solid rgba(163,68,42,.12);background:rgba(255,253,249,.8)}
.logo{width:54px;height:54px;border-radius:50%;overflow:hidden;border:1px solid #ead6ca;background:#fff;display:grid;place-items:center;flex:none}.logo img{width:100%;height:100%;object-fit:contain}
header b{display:block;font:900 16px Montserrat;color:var(--red)}header small{display:block;font-size:11px;color:var(--muted);margin-top:3px}
.tag{margin-left:auto;background:#eaf4ec;color:var(--green);padding:9px 12px;border-radius:99px;font-size:10px;font-weight:800}
main{max-width:1100px;margin:auto;padding:20px}
.hero{text-align:center;padding:14px 0 18px}.hero small{letter-spacing:3px;color:var(--green);font-weight:800;font-size:12px}
.hero h1{font:900 clamp(36px,7vw,64px)/1 Montserrat;letter-spacing:-2px;margin:12px 0}.hero em{font-style:normal;color:var(--red)}.hero p{color:var(--muted);margin:0}
.panel{background:#fff;border:1px solid var(--line);border-radius:24px;padding:clamp(16px,3vw,28px);box-shadow:0 18px 50px rgba(92,37,19,.08)}
.panel h2{font:800 22px Montserrat;margin:0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
.stat{background:#fff7ee;border:1px solid #efdfd4;border-radius:14px;padding:12px;text-align:center}
.stat b{display:block;font:900 24px Montserrat;color:var(--red)}.stat small{color:var(--muted);font-size:11px;font-weight:700}
.bar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.bar input{flex:1;min-width:180px;border:1px solid var(--line);border-radius:12px;padding:13px;font:inherit;background:#fffdf9}
.btn{display:inline-block;border:0;border-radius:12px;padding:14px 18px;font:800 13px Montserrat;cursor:pointer;text-decoration:none;text-align:center;color:#fff}
.btn.g{background:var(--green)}.btn.r{background:var(--red)}.btn.k{background:#fff;color:var(--red);border:2px solid var(--red)}.btn:disabled{opacity:.4;cursor:not-allowed}
.wrap{overflow:auto;max-height:70vh;border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:13px;min-width:600px}
th,td{border:1px solid var(--line);padding:9px 11px;text-align:left;white-space:nowrap}
th{background:var(--green);color:#fff;position:sticky;top:0;font-weight:700}
tbody tr:nth-child(even){background:#fbf5ee}
.jp{color:var(--red);font-weight:800}
#note{color:var(--muted);font-size:12px}
</style></head><body><header><div class="logo"><img src="/logo.png" alt="Logo"></div><div><b>DINICE.X PIZZA</b><small>Résultats de la roulette</small></div><span class="tag">ESPACE ADMIN</span></header><main><section class="hero"><small>CONFIDENTIEL</small><h1>RÉSULTATS DE LA <em>ROULETTE</em></h1><p>Consulte les cotes obtenues en direct et télécharge le fichier Excel.</p></section><section class="panel"><h2>Participations</h2><div class="stats" id="stats"></div><div class="bar"><input id="q" placeholder="Rechercher un nom, une cote..."><button class="btn r" id="refresh" type="button">↻ Actualiser</button><a class="btn g" id="xl" href="#">↓ Télécharger Excel (.xlsx)</a><button class="btn k" id="reset" type="button" disabled title="Télécharge d'abord le fichier Excel">🗑 Réinitialiser le tableau</button></div><div class="wrap"><table><thead><tr><th>ID</th><th>Nom WhatsApp</th><th>3 derniers chiffres</th><th>Cote gagnée (points)</th><th>Date (heure de Bukavu)</th></tr></thead><tbody id="rows"></tbody></table></div><p id="note"></p></section></main><script>
var $=function(x){return document.getElementById(x)};
var base=location.pathname;while(base.length>1&&base.charAt(base.length-1)=="/")base=base.slice(0,-1);
$("xl").href=base+"/export.xlsx";
var all=[];
function stat(label,value){var d=document.createElement("div");d.className="stat";var b=document.createElement("b");b.textContent=value;var s=document.createElement("small");s.textContent=label;d.append(b,s);return d}
function draw(){
  var q=$("q").value.trim().toLowerCase();
  var list=all.filter(function(p){return !q||[p.name,p.suffix,p.points,p.date].join(" ").toLowerCase().indexOf(q)>-1});
  $("rows").replaceChildren();
  list.forEach(function(p){
    var tr=document.createElement("tr");
    [p.id,p.name,p.suffix,p.points,p.date].forEach(function(v,i){
      var td=document.createElement("td");td.textContent=v;
      if(i==3&&Number(p.points)==50)td.className="jp";
      tr.append(td)
    });
    $("rows").append(tr)
  });
  $("note").textContent=list.length+" ligne(s) affichée(s) sur "+all.length;
}
async function load(){
  try{
    var r=await fetch(base+"/entries",{cache:"no-store"});
    if(!r.ok){$("note").textContent="Erreur de chargement";return}
    var d=await r.json();all=d.entries;
    var pts=0,max=0,jp=0;
    all.forEach(function(p){var n=Number(p.points)||0;pts+=n;if(n>max)max=n;if(n==50)jp++});
    var avg=all.length?Math.round(pts/all.length*10)/10:0;
    $("stats").replaceChildren(stat("Participations",all.length),stat("Total des points",pts),stat("Cote moyenne",avg),stat("Jackpots (50)",jp));
    draw();
  }catch(e){$("note").textContent="Erreur de connexion"}
}
$("xl").addEventListener("click",function(){$("reset").disabled=false;$("note").textContent="Excel téléchargé : tu peux maintenant réinitialiser le tableau."});
$("reset").addEventListener("click",async function(){
  if(!all.length){alert("Le tableau est déjà vide.");return}
  var t=prompt("ATTENTION : toutes les participations seront supprimées définitivement. Tape SUPPRIMER pour confirmer.");
  if(t!=="SUPPRIMER")return;
  try{
    var r=await fetch(base+"/reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirm:"SUPPRIMER"})});
    if(!r.ok){alert("Échec de la réinitialisation.");return}
    $("reset").disabled=true;
    await load();
    $("note").textContent="Tableau réinitialisé.";
  }catch(e){alert("Erreur de connexion")}
});
$("q").addEventListener("input",draw);
$("refresh").addEventListener("click",load);
load();setInterval(load,30000);
</script></body></html>`;

export default { async fetch(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
  try {
    if (path === "/api/health") return json({ ok: true });

    if (path === "/api/spin" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name = String(body.displayName || "").trim().replace(/\s+/g, " ");
      const suffix = String(body.phoneSuffix || "").trim();
      if (name.length < 2 || name.length > 50) return json({ error: "Entre le nom affiché sur ton compte WhatsApp." }, 400);
      if (!/^[0-9]{3}$/.test(suffix)) return json({ error: "Entre exactement les 3 derniers chiffres de ton numéro." }, 400);
      const existing = await env.DB.prepare("SELECT id FROM participants WHERE name=? COLLATE NOCASE AND suffix=? LIMIT 1").bind(name, suffix).first();
      if (existing) return json({ error: "Cette identité a déjà participé. Une seule participation est autorisée." }, 409);
      const prize = pickPrize();
      try {
        await env.DB.prepare("INSERT INTO participants(name,suffix,points) VALUES(?,?,?)").bind(name, suffix, prize.points).run();
      } catch (e) {
        return json({ error: "Cette identité a déjà participé. Une seule participation est autorisée." }, 409);
      }
      return json({ points: prize.points, prize: prize.text });
    }

    if (path === ADMIN + "/entries" && request.method === "GET") {
      return json({ entries: (await rows(env)).map(p => ({ id: p.id, name: p.name, suffix: p.suffix, points: p.points || 0, date: p.date || "" })) });
    }

    if (path === ADMIN + "/export.xlsx" && request.method === "GET") {
      const data = (await rows(env)).map(p => ({ ID: p.id, "Nom WhatsApp": p.name, "3 derniers chiffres": p.suffix, "Cote gagnée (points)": p.points || 0, "Date (heure de Bukavu)": p.date || "" }));
      const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Information: "Aucune participation" }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Roulette");
      const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      return new Response(bytes, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": "attachment; filename=\"DiniceX_Roulette.xlsx\"", "cache-control": "no-store" } });
    }

    if (path === ADMIN + "/reset" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (body.confirm !== "SUPPRIMER") return json({ error: "Confirmation manquante." }, 400);
      await env.DB.prepare("DELETE FROM participants").run();
      try { await env.DB.prepare("DELETE FROM sqlite_sequence WHERE name='participants'").run(); } catch (e) {}
      return json({ ok: true });
    }

    if (path === ADMIN && request.method === "GET") {
      return new Response(ADMIN_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
    }

    return env.ASSETS.fetch(request);
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur serveur. Vérifie la configuration Cloudflare et la base D1." }, 500);
  }
} };
