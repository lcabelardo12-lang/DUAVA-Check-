'use strict';
/* DUAVA CHECK V2.0 - Mapeo real: 8 columnas de Fabricantes_801 */

var URL_HOJA='https://script.google.com/macros/s/AKfycbzPZrEd8x6sMAtpB3TilW6NcFh80ato138Uyi1DhJlY7P3pG0nZ78RFzobEo-7dWZ5raQ/exec';

/* === UTILIDADES === */
function $(s){return document.querySelector(s)}
function $i(s){return document.getElementById(s)}
function nid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,8)}
function esc(s){if(s==null)return '';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML}
function r2(v){return Math.round(v*10)/10}

function toast(msg,tipo){
  tipo=tipo||'ok';var cls={ok:'tt-s',err:'tt-e',warn:'tt-w'};
  var d=document.createElement('div');d.className='tt '+(cls[tipo]||'tt-s');d.textContent=msg;
  document.body.appendChild(d);requestAnimationFrame(function(){d.classList.add('show')});
  setTimeout(function(){d.classList.remove('show');setTimeout(function(){d.remove()},300)},3500);
}

function nav(p){location.hash='#/'+p}
function getR(){return location.hash.replace('#/','')||'login'}
window.addEventListener('hashchange',ruta);

/* === MAPEO DE COLUMNAS DE TU HOJA === */
function getVal(obj,exact,parcial){
  if(obj[exact]!==undefined&&obj[exact]!=='')return obj[exact];
  var keys=Object.keys(obj);
  for(var i=0;i<keys.length;i++){if(keys[i].indexOf(parcial)>=0&&obj[keys[i]])return obj[keys[i]];}
  return '';
}
function normFab(f){
  return{
    id:getVal(f,'C\u00f3digo SRN','SRN')||f.id||'',
    nombre:getVal(f,'Nombre Legal de la F\u00e1brica','Legal')||'',
    nombre_corto:getVal(f,'Nombre Abreviado / Marca','Abreviado')||'',
    ciudad:getVal(f,'Ciudad / Provincia','Ciudad')||'',
    pais:f['Pa\u00eds']||'China',
    especialidad:f['Especialidad']||'',
    certificaciones:f['Certificaciones']||'',
    estado:f['Estado']||'Activo'
  };
}

/* === MEMORIA CACHE === */
var Mem={d:{},get:function(k){return this.d[k]||null},set:function(k,v){this.d[k]=v},del:function(k){delete this.d[k]}};

/* === BASE DE DATOS === */
var DB={
  leer:function(h,force){
    if(!force){var c=Mem.get(h);if(c)return Promise.resolve(c)}
    return fetch(URL_HOJA+'?action=read&sheet='+encodeURIComponent(h))
      .then(function(r){return r.json()})
      .then(function(d){if(d.error)throw new Error(d.error);Mem.set(h,d);return d});
  },
  escribir:function(h,data){
    var u=URL_HOJA+'?action=write&sheet='+encodeURIComponent(h)+'&data='+encodeURIComponent(JSON.stringify(data));
    return fetch(u).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Mem.del(h);return d});
  },
  actualizar:function(h,id,data){
    var u=URL_HOJA+'?action=update&sheet='+encodeURIComponent(h)+'&id='+encodeURIComponent(id)+'&data='+encodeURIComponent(JSON.stringify(data));
    return fetch(u).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Mem.del(h);return d});
  },
  find:function(arr,id){for(var i=0;i<arr.length;i++){if(arr[i].id===id)return arr[i]}return null}
};

/* === SESION === */
var Ses={
  get:function(){try{return JSON.parse(sessionStorage.getItem('dv2'))}catch(e){return null}},
  set:function(u){sessionStorage.setItem('dv2',JSON.stringify(u))},
  del:function(){sessionStorage.removeItem('dv2')},
  ok:function(){return!!this.get()}
};

/* === MODULOS === */
var MOD={
  1:{n:'Certificacion CE/MDR',s:'Verificacion documental rapida',tp:'text',
    ph:'Pega aqui el texto del certificado CE, MDR, ficha del producto o documentacion regulatoria...',
    lk:[{t:'NANDO (UE)',u:'https://webgate.ec.europa.eu/single-market-compliance-space/#/notified-bodies'},{t:'CertiPedia',u:'https://www.certipedia.com/'},{t:'TUV SUD',u:'https://www.tuvsud.com/en/industries/healthcare-and-medical-devices'}]},
  2:{n:'Perfil de Empresa',s:'Tamano, experiencia, capacidad, presencia internacional',tp:'text',
    ph:'Informacion sobre la empresa: empleados, anos de experiencia, mercados, instalaciones, certificaciones de fabrica...',
    lk:[{t:'Tianyancha',u:'https://www.tianyancha.com/'},{t:'Licencias Chinas',u:'https://www.china-briefing.com/news/how-to-read-a-china-business-license/'}]},
  3:{n:'Especificaciones Tecnicas',s:'Competitividad tecnica del producto',tp:'text',
    ph:'Ficha tecnica: voltaje, RPM, torque, IP, normativas, materiales, dimensiones, peso, accesorios...',
    lk:[{t:'IEC 60601',u:'https://webstore.iec.ch/en/publication/25652'}]},
  4:{n:'Cadena de Suministro',s:'MOQ, entrega, garantia, logistica',tp:'chk',
    ck:[{id:'m4_catalogo',lb:'Tiene catalogo de repuestos?',sub:'Lista de piezas con numeros de parte.'},
        {id:'m4_precios',lb:'Tiene precios unitarios claros?',sub:'Precio FOB detallado por producto.'},
        {id:'m4_moz',lb:'MOQ razonable?',sub:'Minimo de pedido aceptable (<=50 unidades).'},
        {id:'m4_entrega',lb:'Tiempo de entrega definido?',sub:'Dias o semanas claros de produccion.'},
        {id:'m4_garantia',lb:'Garantia escrita (>=12 meses)?',sub:'Documento formal de garantia.'},
        {id:'m4_soporte',lb:'Soporte tecnico post-venta?',sub:'Asistencia tecnica despues de compra.'}],
    lk:[]},
  5:{n:'Viabilidad Bolivia (AGEMED)',s:'Requisitos regulatorios para Bolivia',tp:'chk',
    ck:[{id:'m5_cfg',lb:'Puede emitir CFG?',sub:'Certificado de Libre Venta del pais de origen.'},
        {id:'m5_apostillado',lb:'CFG apostillado?',sub:'Apostilla de La Haya.'},
        {id:'m5_manual',lb:'Manual en espanol?',sub:'Traduccion oficial del manual.'},
        {id:'m5_agemed',lb:'Compatible con AGEMED?',sub:'Cumple requisitos de registro.'}],
    lk:[{t:'AGEMED',u:'https://www.gob.bo/agaemed'}]},
  6:{n:'Valor Estrategico',s:'Flexibilidad, comunicacion, potencial de largo plazo',tp:'chk',
    ck:[{id:'m6_flex',lb:'Flexibilidad en pedidos?',sub:'Adapta cantidades a tu ritmo.'},
        {id:'m6_comm',lb:'Comunicacion rapida y clara?',sub:'Responde en menos de 24h.'},
        {id:'m6_oem',lb:'Dispuesto a marca privada (OEM/ODM)?',sub:'Puede fabricar con tu marca.'},
        {id:'m6_excl',lb:'Posibilidad de exclusividad?',sub:'Ofrece territorio o producto exclusivo.'},
        {id:'m6_interes',lb:'Interes comercial genuino?',sub:'Busca activamente la venta.'},
        {id:'m6_crec',lb:'Capacidad de crecimiento?',sub:'Puede escalar produccion.'},
        {id:'m6_lp',lb:'Potencial de largo plazo?',sub:'Vision de relacion duradera.'}],
    lk:[]}
};

/* === ANALISIS === */
function aM1(t){
  var mdr=/MDR\s*2017\/745|MDD\s*93\/42|Medical Device (Regulation|Directive)/i.test(t);
  var nb=/(?:NB|Notified\s*Body)\s*[^\d]{0,3}\d{4}\b/i.test(t);
  var ce=/\bCE\b|marcado\s*CE/i.test(t);
  var iso=/ISO\s*13485/i.test(t);
  var sc=1,fn=[];
  if(mdr&&nb){sc=9;fn.push('MDR/MDD con organismo notificado verificable');}
  else if(mdr&&iso){sc=7;fn.push('MDR/MDD con ISO 13485');}
  else if(mdr){sc=6;fn.push('MDR/MDD sin organismo verificable');}
  else if(ce&&iso){sc=5;fn.push('CE con ISO 13485');}
  else if(ce){sc=4;fn.push('CE mencionado sin detalle');}
  else{sc=2;fn.push('Sin referencia CE/MDR/MDD');}
  if(iso)fn.push('ISO 13485');
  return{score:sc,text:fn.join('. ')+'.'};
}
function aM2(t){
  var sc=0,fn=[];
  if(/(?:employees?|empleados|trabajadores|staff).*(?:\d+)/i.test(t)){sc+=2;fn.push('Tamano verificable');}
  if(/(?:established|fundad[oa]|desde|since)\s*\d{4}/i.test(t)){sc+=2;fn.push('Experiencia documentada');}
  if(/medical|medic[oa]|clinical|hospital|healthcare|dental|surgical/i.test(t)){sc+=2;fn.push('Especializacion medica');}
  if(/production\s*(?:capacity|line)|(?:monthly|annual)\s*(?:output|capacity)/i.test(t)){sc+=2;fn.push('Capacidad de produccion');}
  if(/export|international|\d+\s*(?:countries|paises|markets)/i.test(t)){sc+=2;fn.push('Presencia internacional');}
  return{score:Math.max(Math.min(sc,10),1),text:fn.length?fn.join('. ')+'.':'Informacion limitada sobre la empresa.'};
}
function aM3(t){
  var sc=0,fn=[];
  if(/IEC\s*60601|EN\s*60601|60601-1/i.test(t)){sc+=3;fn.push('IEC 60601-1 presente');}
  if(/IP\s*[X]?\d{1,2}\b|IP6[5-9]|waterproof/i.test(t)){sc+=2;fn.push('Clasificacion IP');}
  var td=0;if(/\d+\s*(?:RPM|rpm)/i.test(t))td++;if(/\d+\s*(?:W|V|kPa|Hz|mA)/i.test(t))td++;
  if(td>=2){sc+=3;fn.push('Multiples datos tecnicos');}else if(td===1){sc+=1;fn.push('Datos tecnicos parciales');}
  return{score:Math.max(Math.min(sc,10),1),text:fn.length?fn.join('. ')+'.':'Sin datos tecnicos significativos.'};
}
function aChk(c,ids){var hit=0;for(var i=0;i<ids.length;i++){if(c[ids[i]])hit++;}return{score:hit===0?1:Math.round((hit/ids.length)*10),text:hit+' de '+ids.length+' criterios cumplidos.'};}
function aM4(c){return aChk(c,['m4_catalogo','m4_precios','m4_moz','m4_entrega','m4_garantia','m4_soporte']);}
function aM5(c){return aChk(c,['m5_cfg','m5_apostillado','m5_manual','m5_agemed']);}
function aM6(c){return aChk(c,['m6_flex','m6_comm','m6_oem','m6_excl','m6_interes','m6_crec','m6_lp']);}

function calcDims(m){
  var d={riesgo:0,competitividad:0,valor_estrategico:0,facilidad:0,potencial:0};
  d.riesgo=m[1].score;
  d.competitividad=r2((m[2].score*0.5+m[3].score*0.5));
  d.valor_estrategico=m[6].score;
  d.facilidad=r2((m[4].score*0.5+m[5].score*0.5));
  d.potencial=r2(m[2].score*0.4+m[6].score*0.6);
  d.global=r2(d.riesgo*0.20+d.competitividad*0.25+d.valor_estrategico*0.25+d.facilidad*0.15+d.potencial*0.15);
  return d;
}
function getConclusion(d){
  if(d.global>=8){if(d.riesgo>=7&&d.competitividad>=8)return'Excelente candidato para proveedor principal.';if(d.valor_estrategico>=8)return'Excelente candidato con alto valor estrategico.';return'Muy buen candidato para DUAVA.';}
  if(d.global>=6.5){if(d.competitividad>=8&&d.valor_estrategico<6)return'Muy competitivo tecnicamente. Evaluar valor comercial.';if(d.valor_estrategico>=8&&d.competitividad<6)return'Alto valor estrategico. Mejorar perfil tecnico.';return'Competitivo. Requiere negociacion final.';}
  if(d.global>=5){if(d.competitividad>=7)return'Buena calidad tecnica pero bajo potencial comercial.';return'Candidato como proveedor secundario.';}
  if(d.global>=3.5)return'Perfil limitado. Evaluar alternativas.';
  return'No recomendable para estrategia DUAVA.';
}
function getResumen(m,d){
  var fu=[],deb=[],ri=[];
  for(var i=1;i<=6;i++){if(m[i].score>=7)fu.push(MOD[i].n+' ('+m[i].score+'/10)');if(m[i].score<=4)deb.push(MOD[i].n+' ('+m[i].score+'/10)');}
  if(d.riesgo<=4)ri.push('Riesgo regulatorio alto');if(d.facilidad<=4)ri.push('Dificultad de importacion');if(d.competitividad<=4)ri.push('Perfil tecnico debil');
  return{fortalezas:fu.length?fu.join(', '):'Ninguna destacada',debilidades:deb.length?deb.join(', '):'Ninguna critica',riesgos:ri.length?ri.join(', '):'Sin riesgos mayores'};
}
function runEval(d){
  var m={};
  m[1]=d.m1_texto.trim()?aM1(d.m1_texto):{score:1,text:'Sin informacion.'};
  m[2]=d.m2_texto.trim()?aM2(d.m2_texto):{score:1,text:'Sin informacion.'};
  m[3]=d.m3_texto.trim()?aM3(d.m3_texto):{score:1,text:'Sin informacion.'};
  m[4]=Object.values(d.m4||{}).some(function(v){return v})?aM4(d.m4):{score:1,text:'Sin verificacion.'};
  m[5]=Object.values(d.m5||{}).some(function(v){return v})?aM5(d.m5):{score:1,text:'Sin verificacion.'};
  m[6]=Object.values(d.m6||{}).some(function(v){return v})?aM6(d.m6):{score:1,text:'Sin verificacion.'};
  var dims=calcDims(m);dims.conclusion=getConclusion(dims);dims.resumen=getResumen(m,dims);
  return{m:m,d:dims};
}

function applyTpl(tpl,vars){var r=tpl;for(var k in vars){r=r.replace(new RegExp('\\{\\{'+k+'\\}\\}','g'),vars[k]||'');}return r;}

/* === ESTADO === */
var AU={fab:null,fab_nombre:'',fab_pais:'',fab_ciudad:'',prod:'',m1:'',m2:'',m3:'',
  m4:{m4_catalogo:false,m4_precios:false,m4_moz:false,m4_entrega:false,m4_garantia:false,m4_soporte:false},
  m5:{m5_cfg:false,m5_apostillado:false,m5_manual:false,m5_agemed:false},
  m6:{m6_flex:false,m6_comm:false,m6_oem:false,m6_excl:false,m6_interes:false,m6_crec:false,m6_lp:false}};
var RES=null;
function rst(){AU={fab:null,fab_nombre:'',fab_pais:'',fab_ciudad:'',prod:'',m1:'',m2:'',m3:'',
  m4:{m4_catalogo:false,m4_precios:false,m4_moz:false,m4_entrega:false,m4_garantia:false,m4_soporte:false},
  m5:{m5_cfg:false,m5_apostillado:false,m5_manual:false,m5_agemed:false},
  m6:{m6_flex:false,m6_comm:false,m6_oem:false,m6_excl:false,m6_interes:false,m6_crec:false,m6_lp:false}};RES=null;}

/* === RENDER === */
function render(tit,cont,bk){
  var bv=bk?'<button onclick="nav(\''+bk+'\')" style="background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:8px 0;margin-bottom:8px;display:inline-block;font-family:Syne,sans-serif">< Volver</button>':'';
  var u=Ses.get();
  var bar='<div style="position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--bdr);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;z-index:50;max-width:720px;margin:0 auto;font-family:Syne,sans-serif">'+
    '<span style="font-size:12px;color:var(--mut)">'+esc(u?u.nombre:'')+'</span>'+
    '<span id="off" style="font-size:11px;color:var(--ylw);display:'+(navigator.onLine?'none':'inline')+'">Sin conexion</span>'+
    '<button onclick="Ses.del();nav(\'login\')" style="background:none;border:1px solid var(--bdr);color:var(--red);font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:Syne,sans-serif">Salir</button></div>';
  $i('R').innerHTML='<div style="padding:18px 16px 70px">'+bv+cont+'</div>'+bar;
}
function ld(m){return'<div class="ld"><div class="spn"></div><p style="font-size:13px;color:var(--mut)">'+(m||'Cargando...')+'</p></div>';}
function filtH(arr,wid){return'<div class="fs" id="'+wid+'">'+arr.map(function(a){return'<button class="fb'+(a[2]?' on':'')+'" data-v="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div>';}
function initF(wid,cb){var w=$i(wid);if(!w)return;w.onclick=function(e){var b=e.target.closest('.fb');if(!b)return;w.querySelectorAll('.fb').forEach(function(x){x.classList.remove('on')});b.classList.add('on');cb(b.getAttribute('data-v'));};}
function barra(sc,label){var col=sc>=8?'var(--grn)':sc>=5?'var(--gold)':'var(--red)';return'<div class="db"><div class="db-l">'+label+'</div><div class="db-b"><div class="db-f" style="width:'+(sc*10)+'%;background:'+col+'"></div></div><div class="db-v" style="color:'+col+'">'+r2(sc)+'</div></div>';}
function showCfg(){$i('R').innerHTML='<div class="err-full"><div><h2>Configuracion requerida</h2><p>Abre <code>app.js</code> y busca <code>URL_HOJA</code>. Reemplaza con tu URL de Google Apps Script.</p></div></div>';}
function ff(n,lb,v){return'<div><label class="lb">'+lb+'</label><input class="ip" id="f-'+n+'" value="'+esc(v||'')+'"></div>';}
function gf(n){var el=$i('f-'+n);return el?el.value.trim():'';}
function refL(lk){if(!lk||!lk.length)return'';var id='r_'+nid();return'<div class="ch" onclick="var e=document.getElementById(\''+id+'\');e.className=e.className.indexOf(\'open\')>-1?\'cb\':\'cb open\'">Recursos de referencia</div><div id="'+id+'" class="cb">'+lk.map(function(e){return'<a class="rl" href="'+e.u+'" target="_blank" rel="noopener">'+esc(e.t)+'</a>';}).join('')+'</div>';}

/* === ROUTER === */
function ruta(){
  if(URL_HOJA.indexOf('PEGA_AQUI')!==-1){showCfg();return;}
  var r=getR();
  if(r==='login')return vLogin();
  if(!Ses.ok())return nav('login');
  if(r==='home'||r==='')return vHome();
  if(r==='eval/nueva')return vNueva();
  if(/^eval\/\d$/.test(r))return vMod(parseInt(r.split('/')[1]));
  if(r==='eval/res')return vRes();
  if(r==='exp')return vExp();
  if(/^exp\/.+/.test(r))return vExpDet(r.split('/')[1]);
  if(r==='fab')return vFab();
  if(/^fab\/.+/.test(r))return vFabDet(r.split('/')[1]);
  if(r==='plant')return vPlant();
  if(r==='wa')return vWA();
  if(r==='legal')return vLegal();
  if(r==='legal/new')return vLegF(null);
  if(/^legal\/.+/.test(r))return vLegF(r.split('/')[1]);
  if(r==='users')return vUsers();
  nav('home');
}

/* === LOGIN === */
function vLogin(){
  $i('R').innerHTML='<div class="lg-w"><div class="lg-b">'+
    '<div class="lg-i">DC</div>'+
    '<h1 class="lg-h">Duava Check V2</h1>'+
    '<p class="lg-sub">Plataforma de Evaluacion Estrategica de Fabricantes</p>'+
    '<p style="font-size:11px;color:var(--dim);margin-bottom:24px;font-family:DM Mono,monospace">v2.0</p>'+
    '<div id="le"></div>'+
    '<div style="text-align:left;margin-bottom:12px"><label class="lb">NOMBRE</label><input class="ip" id="ln" placeholder="Tu nombre"></div>'+
    '<div style="text-align:left;margin-bottom:18px"><label class="lb">CLAVE</label><input class="ip" id="lc" type="password" placeholder="Tu clave"></div>'+
    '<button class="btn bp bw" id="lbtn" onclick="doLogin()">Iniciar Sesion</button>'+
    '<p style="font-size:11px;color:var(--dim);margin-top:14px">Acceso restringido a usuarios autorizados</p>'+
    '</div></div>';
  $i('lc').onkeydown=function(e){if(e.key==='Enter')doLogin()};$i('ln').focus();
}
function doLogin(){
  var n=$i('ln').value.trim(),c=$i('lc').value;
  if(!n||!c){lgErr('Completa ambos campos');return;}
  $i('lbtn').disabled=true;$i('lbtn').textContent='Conectando...';
  DB.leer('Usuarios').then(function(uu){
    var f=null;for(var i=0;i<uu.length;i++){if(uu[i].Nombre===n&&uu[i].Clave===c){f=uu[i];break;}}
    if(!f){lgErr('Nombre o clave incorrectos');resB();return;}
    var a=(f.Activo||'').toLowerCase();if(a!=='si'&&a!=='s'){lgErr('Usuario inactivo.');resB();return;}
    Ses.set({nombre:f.Nombre});nav('home');
  }).catch(function(e){lgErr('Error: '+e.message);resB()});
}
function lgErr(m){$i('le').innerHTML='<div class="lg-err">'+esc(m)+'</div>';}
function resB(){$i('lbtn').disabled=false;$i('lbtn').textContent='Iniciar Sesion';}

/* === HOME === */
function vHome(){
  var u=Ses.get();
  var h='<div style="text-align:center;margin-bottom:6px"><img src="logo.png" alt="Logo" style="max-width:150px;height:auto"></div>'+
    '<h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px">Duava Check V2</h2>'+
    '<p style="font-size:13px;color:var(--mut);margin-bottom:18px;text-align:center">Bienvenido, <strong style="color:var(--gold)">'+esc(u?u.nombre:'')+'</strong></p>'+
    '<div class="cd cd-cl" onclick="nav(\'eval/nueva\')" style="margin-bottom:20px;border-color:var(--gold-dim)">'+
    '<div style="display:flex;align-items:center;gap:12px"><span style="font-size:20px;font-weight:bold;color:var(--gold)">[+]</span>'+
    '<div><div class="fd" style="font-weight:700;font-size:15px">Nueva Evaluacion</div>'+
    '<div style="font-size:12px;color:var(--mut)">Evaluar fabricante con los 6 Modulos</div></div></div></div>'+
    '<h3 class="sl" style="color:var(--txt);font-size:14px;margin-top:8px">Modulos de Evaluacion</h3>'+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
  for(var i=1;i<=6;i++){var m=MOD[i];
    h+='<div class="cd" style="opacity:.7"><div style="display:flex;align-items:center;gap:10px"><div>'+
    '<span class="fm" style="font-size:11px;color:var(--gold);background:var(--gold-bg);padding:1px 6px;border-radius:4px">M'+i+'</span> '+
    '<span class="fd" style="font-weight:700;font-size:13px">'+esc(m.n)+'</span>'+
    '<div style="font-size:11px;color:var(--mut);margin-top:2px">'+esc(m.s)+'</div>'+
    '</div></div></div>';}
  h+='</div><h3 class="sl" style="color:var(--txt);font-size:14px">Herramientas</h3><div class="g2">'+
    hC('[E]','Expedientes','Evaluaciones por fabricante','exp')+
    hC('[F]','Fabricantes','Base de fabricantes','fab')+
    hC('[T]','Plantillas','Gestionar plantillas IA','plant')+
    hC('[W]','WhatsApp','Generar mensajes','wa')+
    hC('[L]','Base Legal','Regulaciones y normas','legal')+
    hC('[U]','Usuarios','Gestionar accesos','users')+'</div>';
  render('Duava Check V2',h);
}
function hC(ic,t,s,p){return'<div class="cd cd-cl" onclick="nav(\''+p+'\')"><div style="display:flex;align-items:center;gap:10px">'+
  '<span style="font-size:14px;font-weight:bold;color:var(--gold)">'+ic+'</span>'+
  '<div><div class="fd" style="font-weight:700;font-size:13px">'+esc(t)+'</div>'+
  '<div style="font-size:11px;color:var(--mut)">'+esc(s)+'</div></div></div></div>';}

/* === NUEVA EVALUACION (con normFab) === */
function vNueva(){
  var h='<h1 class="st-h">Nueva Evaluacion</h1><p class="st-sub">Selecciona fabricante y nombra el producto</p><label class="lb">FABRICANTE</label>';
  if(AU.fab){
    h+='<div class="cd" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700">'+esc(AU.fab_nombre)+'</div><div style="font-size:12px;color:var(--mut)">'+esc([AU.fab_ciudad,AU.fab_pais].filter(Boolean).join(', '))+'</div></div><button class="btn bs bsm" onclick="AU.fab=null;AU.fab_nombre=\'\';vNueva()">Cambiar</button></div></div>';
  }else{
    h+='<input class="ip" id="fs" placeholder="Buscar por nombre, ciudad, especialidad..." style="margin-bottom:8px"><div id="fl">'+ld()+'</div>';
  }
  h+='<div style="margin-top:16px"><label class="lb">PRODUCTO</label><input class="ip" id="ap" placeholder="Nombre del equipo o dispositivo medico" value="'+esc(AU.prod)+'"></div>'+
    '<button class="btn bp bw" style="margin-top:18px" onclick="startEval()">Comenzar Evaluacion ></button>';
  render('Nueva Evaluacion',h,'home');
  if(!AU.fab){
    DB.leer('Fabricantes_801').then(function(raw){
      var data=raw.map(normFab);
      window._f8=data;
      showFL(data);
    }).catch(function(e){$i('fl').innerHTML='<p style="color:var(--red);font-size:13px;padding:12px">Error: '+esc(e.message)+'</p>';});
    var s=$i('fs');if(s)s.oninput=function(){var q=this.value.toLowerCase();showFL((window._f8||[]).filter(function(f){return f.nombre.toLowerCase().indexOf(q)!==-1||f.nombre_corto.toLowerCase().indexOf(q)!==-1||f.ciudad.toLowerCase().indexOf(q)!==-1||f.pais.toLowerCase().indexOf(q)!==-1||f.especialidad.toLowerCase().indexOf(q)!==-1;}));};
  }
  var p=$i('ap');if(p)p.oninput=function(){AU.prod=this.value;};
}
function showFL(data){
  var el=$i('fl');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:12px">Sin resultados.</p>';return;}
  var show=data.slice(0,50);
  el.innerHTML=show.map(function(f){
    var label=f.nombre_corto?f.nombre_corto:f.nombre;
    var sub=[f.ciudad,f.especialidad,f.certificaciones].filter(Boolean).join(' / ');
    return'<div class="li" style="margin-bottom:6px" onclick="selFab(\''+esc(f.id)+'\')"><div class="li-b"><div class="li-t">'+esc(label)+'</div><div class="li-s">'+esc(sub)+'</div></div>'+(f.estado==='Activo'?'<span class="bg bg-gn">OK</span>':'')+'</div>';
  }).join('')+(data.length>50?'<p style="color:var(--dim);font-size:12px;padding:8px;text-align:center">Mostrando 50 de '+data.length+'</p>':'');
}
function selFab(id){
  var f=DB.find(window._f8||[],id);if(!f)return;
  AU.fab=f.id;AU.fab_nombre=f.nombre_corto||f.nombre;AU.fab_pais=f.pais;AU.fab_ciudad=f.ciudad;
  vNueva();
}
function startEval(){if(!AU.fab){toast('Selecciona un fabricante','warn');return;}if(!AU.prod.trim()){toast('Ingresa el nombre del producto','warn');return;}nav('eval/1');}

/* === MODULOS === */
function vMod(n){
  var m=MOD[n],bk=n>1?'eval/'+(n-1):'eval/nueva';
  var c='<div style="margin-bottom:4px"><span class="fm bg bg-g">MODULO '+n+'/6</span></div>';
  c+='<h1 class="st-h">'+esc(m.n)+'</h1><p class="st-sub">'+esc(m.s)+'</p>';
  if(m.tp==='text'){
    var val=n===1?AU.m1:n===2?AU.m2:AU.m3;
    c+='<textarea class="ip" id="mt" placeholder="'+esc(m.ph)+'">'+esc(val)+'</textarea>';
    c+='<p style="font-size:11px;color:var(--dim);margin-top:4px" id="cc">'+val.length+' caracteres</p>';
  }
  if(m.tp==='chk'){
    var chk=n===4?AU.m4:n===5?AU.m5:AU.m6;
    m.ck.forEach(function(x){
      var on=chk[x.id]||false;
      c+='<div class="ci'+(on?' on':'')+'" id="ci_'+x.id+'" onclick="togC('+n+',\''+x.id+'\')"><input type="checkbox" '+(on?'checked':'')+' tabindex="-1"><div><div class="ci-l">'+esc(x.lb)+'</div><div class="ci-s">'+esc(x.sub)+'</div></div></div>';
    });
  }
  c+='<button class="btn bs bw" style="margin:14px 0 10px" onclick="prevM('+n+')">Vista previa del analisis</button><div id="mpv"></div>'+refL(m.lk);
  var nx=n<6?'eval/'+(n+1):'eval/res';
  c+='<div class="mn">'+(n>1?'<button class="btn bs" onclick="nav(\'eval/'+(n-1)+'\')">< M'+(n-1)+'</button>':'')+'<button class="btn bp" onclick="nav(\''+nx+'\')">'+(n<6?'M'+(n+1)+' >':'Ver Resultados >')+'</button></div>';
  render('M'+n+': '+m.n,c,bk);
  if(m.tp==='text'){var ta=$i('mt');if(ta)ta.oninput=function(){saveT(n);var el=$i('cc');if(el)el.textContent=this.value.length+' caracteres';};}
}
function saveT(n){var ta=$i('mt');if(!ta)return;if(n===1)AU.m1=ta.value;else if(n===2)AU.m2=ta.value;else AU.m3=ta.value;}
function togC(n,id){var chk=n===4?AU.m4:n===5?AU.m5:AU.m6;chk[id]=!chk[id];var el=$i('ci_'+id);if(el){var cb=el.querySelector('input[type=checkbox]');if(cb)cb.checked=chk[id];el.classList.toggle('on',chk[id]);}}
function prevM(n){
  var r;
  if(n<=3){var t=n===1?AU.m1:n===2?AU.m2:AU.m3;if(!t.trim()){$i('mpv').innerHTML='<p style="color:var(--dim);font-size:13px">Ingresa texto primero.</p>';return;}r=n===1?aM1(t):n===2?aM2(t):aM3(t);}
  else{var c=n===4?AU.m4:n===5?AU.m5:AU.m6;if(!Object.values(c).some(function(v){return v;})){$i('mpv').innerHTML='<p style="color:var(--dim);font-size:13px">Marca al menos un criterio.</p>';return;}r=n===4?aM4(c):n===5?aM5(c):aM6(c);}
  var col=r.score>=8?'g':r.score>=5?'y':'r';
  $i('mpv').innerHTML='<div class="pv pv-'+col+'">'+barra(r.score,'Score')+'<p style="font-size:13px;line-height:1.6;margin-top:6px">'+esc(r.text)+'</p></div>';
}

/* === RESULTADOS === */
function vRes(){
  if(!RES)RES=runEval({m1_texto:AU.m1,m2_texto:AU.m2,m3_texto:AU.m3,m4:AU.m4,m5:AU.m5,m6:AU.m6});
  var m=RES.m,d=RES.d,res=d.resumen;
  var h='<div style="text-align:center;margin-bottom:20px"><h1 class="st-h">Resultado de Evaluacion</h1>'+
    '<p style="font-size:13px;color:var(--mut)">'+esc(AU.prod)+' - '+esc(AU.fab_nombre)+'</p>'+
    '<p class="fm" style="font-size:11px;color:var(--dim);margin-top:4px">'+new Date().toLocaleString('es-BO')+'</p></div>';
  h+='<div class="cd" style="margin-bottom:18px;text-align:center"><div class="fm" style="font-size:48px;font-weight:800;color:var(--gold)">'+r2(d.global)+'</div><div style="font-size:12px;color:var(--mut)">PUNTUACION GLOBAL /10</div><p style="font-size:14px;margin-top:10px;font-weight:600">'+esc(d.conclusion)+'</p></div>';
  h+='<div class="cd" style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">Dimensiones</div>'+
    barra(d.riesgo,'Riesgo')+barra(d.competitividad,'Competitividad')+barra(d.valor_estrategico,'Valor Estrategico')+barra(d.facilidad,'Facilidad Import.')+barra(d.potencial,'Potencial')+'</div>';
  h+='<div class="cd" style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Resumen</div>'+
    '<p style="font-size:13px;line-height:1.6"><strong>Fortalezas:</strong> '+esc(res.fortalezas)+'</p>'+
    '<p style="font-size:13px;line-height:1.6;margin-top:4px"><strong>Debilidades:</strong> '+esc(res.debilidades)+'</p>'+
    '<p style="font-size:13px;line-height:1.6;margin-top:4px"><strong>Riesgos:</strong> '+esc(res.riesgos)+'</p></div>';
  for(var i=1;i<=6;i++){var mr=m[i];
    h+='<div class="cd" style="margin-bottom:8px"><div style="display:flex;align-items:center;justify-content:space-between"><div><span class="fm" style="font-size:11px;color:var(--dim)">M'+i+'</span> <span class="fd" style="font-weight:700;font-size:13px">'+esc(MOD[i].n)+'</span></div><span class="fm" style="font-weight:700;font-size:14px;color:'+(mr.score>=8?'var(--grn)':mr.score>=5?'var(--gold)':'var(--red)')+'">'+mr.score+'/10</span></div><p style="font-size:12px;color:var(--mut);margin-top:4px">'+esc(mr.text)+'</p></div>';}
  h+='<div style="margin-top:14px"><label class="lb">NOTAS</label><textarea class="ip" id="evnotas" style="min-height:60px" placeholder="Observaciones...">'+esc(AU.notas||'')+'</textarea></div>';
  h+='<div class="g2" style="margin-top:14px"><button class="btn bp bw" id="svb" onclick="saveEval()">Guardar Evaluacion</button><button class="btn bs bw" onclick="window.print()">Exportar PDF</button></div>'+
    '<div class="g2" style="margin-top:8px"><button class="btn bs bw" onclick="shareEval()">WhatsApp</button><button class="btn bs bw" onclick="rst();nav(\'home\')">Nueva Evaluacion</button></div>';
  render('Resultados',h,'eval/6');
}
function saveEval(){
  var na=$i('evnotas');if(na)AU.notas=na.value;
  var m=RES.m,d=RES.d,row={
    id:nid(),fecha:new Date().toISOString(),fabricante_id:AU.fab||'',fabricante_nombre:AU.fab_nombre,producto:AU.prod,
    m1_texto:AU.m1,m1_score:m[1].score,m1_resumen:m[1].text,
    m2_texto:AU.m2,m2_score:m[2].score,m2_resumen:m[2].text,
    m3_texto:AU.m3,m3_score:m[3].score,m3_resumen:m[3].text,
    m4_checks:Object.keys(AU.m4).filter(function(k){return AU.m4[k]}).join(','),m4_score:m[4].score,m4_resumen:m[4].text,
    m5_checks:Object.keys(AU.m5).filter(function(k){return AU.m5[k]}).join(','),m5_score:m[5].score,m5_resumen:m[5].text,
    m6_checks:Object.keys(AU.m6).filter(function(k){return AU.m6[k]}).join(','),m6_score:m[6].score,m6_resumen:m[6].text,
    riesgo:d.riesgo,competitividad:d.competitividad,valor_estrategico:d.valor_estrategico,facilidad:d.facilidad,potencial:d.potencial,global:d.global,
    conclusion:d.conclusion,resumen:d.resumen.fortalezas+' | '+d.resumen.debilidades+' | '+d.resumen.riesgos,
    notas:AU.notas||'',creado_por:Ses.get()?Ses.get().nombre:''
  };
  var btn=$i('svb');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  DB.escribir('Evaluaciones',row).then(function(){toast('Evaluacion guardada','ok');if(btn)btn.textContent='Guardado OK';})
    .catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;btn.textContent='Guardar';}});
}
function shareEval(){
  var d=RES.d;var t='EVALUACION DUAVA CHECK V2\n==========================\n'+esc(AU.fab_nombre)+'\n'+esc(AU.prod)+'\nPuntuacion: '+r2(d.global)+'/10\n'+esc(d.conclusion)+'\n\nFortalezas: '+esc(d.resumen.fortalezas)+'\nDebilidades: '+esc(d.resumen.debilidades)+'\nRiesgos: '+esc(d.resumen.riesgos)+'\n\nDuava Check V2';
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
}

/* === EXPEDIENTES === */
function vExp(){
  render('Expedientes','<div id="expc">'+ld()+'</div>','home');
  DB.leer('Evaluaciones').then(function(data){
    var byFab={};
    data.forEach(function(a){
      var key=a.fabricante_id||a.fabricante_nombre;
      if(!byFab[key])byFab[key]={id:key,nombre:a.fabricante_nombre,evals:[],best:0};
      byFab[key].evals.push(a);
      var g=parseFloat(a.global)||0;if(g>byFab[key].best)byFab[key].best=g;
    });
    var arr=Object.values(byFab).sort(function(a,b){return b.best-a.best});
    window._exp=arr;window._evals=data;
    var h='<h1 class="st-h">Expedientes</h1><p class="st-sub">'+arr.length+' fabricantes evaluados</p>';
    if(!arr.length){h+='<div class="cd" style="text-align:center;padding:32px"><p style="color:var(--mut)">Sin evaluaciones.</p><button class="btn bp" style="margin-top:12px" onclick="nav(\'eval/nueva\')">Crear primera evaluacion</button></div>';}
    else{h+='<input class="ip" id="exps" placeholder="Buscar..." style="margin-bottom:8px"><div id="expl">'+expList(arr)+'</div>';}
    $i('expc').innerHTML=h;
    if(arr.length&&$i('exps')){$i('exps').oninput=function(){var q=this.value.toLowerCase();$i('expl').innerHTML=expList(arr.filter(function(e){return e.nombre.toLowerCase().indexOf(q)!==-1;}));};}
  }).catch(function(e){$i('expc').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function expList(arr){return arr.map(function(e){
  var col=e.best>=8?'var(--grn)':e.best>=5?'var(--gold)':'var(--red)';
  return'<div class="li" style="margin-bottom:6px" onclick="nav(\'exp/'+esc(e.id)+'\')"><div style="min-width:44px;text-align:center"><div class="fm" style="font-size:18px;font-weight:800;color:'+col+'">'+r2(e.best)+'</div><div style="font-size:10px;color:var(--dim)">/10</div></div><div class="li-b"><div class="li-t">'+esc(e.nombre)+'</div><div class="li-s">'+e.evals.length+' evaluacion(es)</div></div></div>';
}).join('');}

function vExpDet(id){
  render('Expediente','<div id="exd">'+ld()+'</div>','exp');
  DB.leer('Evaluaciones').then(function(data){
    var evs=data.filter(function(a){return(a.fabricante_id||a.fabricante_nombre)===id;});
    if(!evs.length){$i('exd').innerHTML='<p style="text-align:center;color:var(--mut);padding:40px">Sin evaluaciones</p>';return;}
    evs.sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});
    var lt=evs[0],lg=parseFloat(lt.global)||0;
    var h='<h1 class="st-h">'+esc(lt.fabricante_nombre)+'</h1><p class="st-sub">'+evs.length+' evaluacion(es)</p>';
    h+='<div class="cd" style="margin-bottom:14px;text-align:center"><div class="fm" style="font-size:36px;font-weight:800;color:'+(lg>=8?'var(--grn)':lg>=5?'var(--gold)':'var(--red)')+'">'+r2(lg)+'</div><div style="font-size:12px;color:var(--mut)">Puntuacion mas reciente</div><p style="font-size:14px;margin-top:8px;font-weight:600">'+esc(lt.conclusion)+'</p></div>';
    h+='<h3 class="sl" style="color:var(--txt)">Historial</h3>';
    evs.forEach(function(a){
      var g=parseFloat(a.global)||0;
      h+='<div class="cd" style="margin-bottom:8px;cursor:pointer" onclick="dupEval(\''+esc(a.id)+'\')"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700;font-size:13px">'+esc(a.producto)+'</div><div style="font-size:11px;color:var(--dim)">'+(a.fecha?new Date(a.fecha).toLocaleDateString('es-BO'):'')+'</div></div><span class="fm" style="font-weight:800;font-size:16px;color:'+(g>=8?'var(--grn)':g>=5?'var(--gold)':'var(--red)')+'">'+r2(g)+'</span></div></div>';
    });
    h+='<h3 class="sl" style="color:var(--txt);margin-top:16px">Notas</h3><div id="notasarea">'+ld()+'</div>';
    h+='<div style="margin-top:8px"><textarea class="ip" id="newnote" style="min-height:60px" placeholder="Agregar nota..."></textarea>';
    h+='<select class="ip" id="notetype" style="margin-top:6px"><option value="nota">Nota</option><option value="negociacion">Negociacion</option><option value="decision">Decision</option><option value="seguimiento">Seguimiento</option></select>';
    h+='<button class="btn bp bsm" style="margin-top:8px" onclick="addNote(\''+esc(id)+'\')">Agregar</button></div>';
    h+='<div class="g2" style="margin-top:14px"><button class="btn bp bw" onclick="nav(\'eval/nueva\')">Nueva evaluacion</button><button class="btn bs bw" onclick="nav(\'exp\')">Volver</button></div>';
    $i('exd').innerHTML=h;
    loadNotes(id);
  });
}
function dupEval(id){
  var a=DB.find(window._evals||[],id);if(!a){toast('No encontrada','err');return;}
  AU={fab:a.fabricante_id,fab_nombre:a.fabricante_nombre,fab_pais:'',fab_ciudad:'',prod:a.producto,
    m1:a.m1_texto||'',m2:a.m2_texto||'',m3:a.m3_texto||'',m4:{},m5:{},m6:{}};
  (a.m4_checks||'').split(',').forEach(function(k){if(k)AU.m4[k]=true;});
  (a.m5_checks||'').split(',').forEach(function(k){if(k)AU.m5[k]=true;});
  (a.m6_checks||'').split(',').forEach(function(k){if(k)AU.m6[k]=true;});
  if(!AU.m4.m4_catalogo)AU.m4={m4_catalogo:false,m4_precios:false,m4_moz:false,m4_entrega:false,m4_garantia:false,m4_soporte:false};
  if(!AU.m5.m5_cfg)AU.m5={m5_cfg:false,m5_apostillado:false,m5_manual:false,m5_agemed:false};
  if(!AU.m6.m6_flex)AU.m6={m6_flex:false,m6_comm:false,m6_oem:false,m6_excl:false,m6_interes:false,m6_crec:false,m6_lp:false};
  RES=null;toast('Datos cargados','ok');setTimeout(function(){nav('eval/1');},400);
}

function loadNotes(fabId){
  DB.leer('Notas').then(function(data){
    var notes=data.filter(function(n){return n.fabricante_id===fabId;}).sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});
    var el=$i('notasarea');if(!el)return;
    if(!notes.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:8px">Sin notas.</p>';return;}
    el.innerHTML=notes.map(function(n){
      var ty={nota:'bg-g',negociacion:'bg-yw',decision:'bg-gn',seguimiento:'bg-rd'};
      return'<div class="na"><div class="na-h"><span class="na-ty bg '+(ty[n.tipo]||'bg-g')+'">'+esc(n.tipo)+'</span><span class="na-t">'+(n.fecha?new Date(n.fecha).toLocaleDateString('es-BO'):'')+'</span></div><p style="font-size:13px;line-height:1.5">'+esc(n.contenido)+'</p><p style="font-size:11px;color:var(--dim);margin-top:4px">'+esc(n.creado_por)+'</p></div>';
    }).join('');
  }).catch(function(){var el=$i('notasarea');if(el)el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:8px">Sin notas.</p>';});
}
function addNote(fabId){
  var cont=$i('newnote').value.trim();if(!cont){toast('Escribe una nota','warn');return;}
  DB.escribir('Notas',{id:nid(),fabricante_id:fabId,fecha:new Date().toISOString(),tipo:$i('notetype').value,contenido:cont,creado_por:Ses.get()?Ses.get().nombre:''})
    .then(function(){$i('newnote').value='';toast('Nota agregada','ok');loadNotes(fabId);Mem.del('Notas');})
    .catch(function(e){toast('Error: '+e.message,'err');});
}

/* === FABRICANTES (con normFab y tus 8 columnas) === */
function vFab(){
  var h='<h1 class="st-h">Fabricantes</h1><p class="st-sub" id="fc">Cargando...</p>'+
    '<input class="ip" id="fbs" placeholder="Buscar por nombre, ciudad, especialidad..." style="margin-bottom:8px">'+
    filtH([['','Todos',true],['Activo','Activos'],['Inactivo','Inactivos']],'fff')+'<div id="fbl">'+ld()+'</div>';
  render('Fabricantes',h,'home');
  DB.leer('Fabricantes_801').then(function(raw){
    var data=raw.map(normFab);
    window._f8=data;$i('fc').textContent=data.length+' fabricantes';showFBL(data);
    $i('fbs').oninput=function(){applyFF();};
    initF('fff',function(){applyFF();});
  }).catch(function(e){$i('fbl').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function applyFF(){
  var q=($i('fbs')?$i('fbs').value:'').toLowerCase();
  var fv=document.querySelector('#fff .fb.on');var st=fv?fv.getAttribute('data-v'):'';
  showFBL((window._f8||[]).filter(function(f){
    return(!q||f.nombre.toLowerCase().indexOf(q)!==-1||f.nombre_corto.toLowerCase().indexOf(q)!==-1||f.ciudad.toLowerCase().indexOf(q)!==-1||f.especialidad.toLowerCase().indexOf(q)!==-1)&&(!st||f.estado===st);
  }));
}
function showFBL(data){
  var el=$i('fbl');if(!el)return;
  var show=data.slice(0,80);
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin fabricantes</p>';return;}
  el.innerHTML=show.map(function(f){
    var label=f.nombre_corto?f.nombre_corto:f.nombre;
    var sub=[f.ciudad,f.especialidad,f.certificaciones].filter(Boolean).join(' / ');
    return'<div class="li" style="margin-bottom:6px" onclick="nav(\'fab/'+esc(f.id)+'\')">'+
    '<div style="width:34px;height:34px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0;color:var(--gold)">'+esc(f.id).substr(0,4)+'</div>'+
    '<div class="li-b"><div class="li-t">'+esc(label)+'</div><div class="li-s">'+esc(sub)+'</div></div>'+
    '<span class="bg '+(f.estado==='Activo'?'bg-gn':'bg-rd')+'">'+esc(f.estado)+'</span></div>';
  }).join('')+(data.length>80?'<p style="color:var(--dim);font-size:12px;padding:8px;text-align:center">Mostrando 80 de '+data.length+'</p>':'');
}

function vFabDet(id){
  render('Fabricante','<div id="fbd">'+ld()+'</div>','fab');
  DB.leer('Fabricantes_801').then(function(raw){
    var data=raw.map(normFab);
    var f=DB.find(data,id);if(!f){$i('fbd').innerHTML='<p style="text-align:center;color:var(--red);padding:40px">No encontrado</p>';return;}
    var h='<h1 class="st-h">'+esc(f.nombre)+'</h1>';
    if(f.nombre_corto)h+='<p style="font-size:14px;color:var(--gold);margin-bottom:4px">'+esc(f.nombre_corto)+'</p>';
    h+='<p class="st-sub">'+esc([f.ciudad,f.pais].filter(Boolean).join(', '))+'</p>';
    h+='<div class="cd" style="margin-bottom:14px">';
    var fields=[['Codigo SRN',f.id],['Especialidad',f.especialidad],['Certificaciones',f.certificaciones],['Estado',f.estado]];
    fields.forEach(function(p){if(p[1])h+='<div style="margin-bottom:6px"><span style="font-size:11px;color:var(--dim);text-transform:uppercase">'+esc(p[0])+'</span><div style="font-size:13px">'+esc(p[1])+'</div></div>';});
    h+='</div>';
    h+='<div class="g2" style="margin-top:14px"><button class="btn bp bw" onclick="AU.fab=\''+esc(f.id)+'\';AU.fab_nombre=\''+esc(f.nombre_corto||f.nombre)+'\';AU.fab_pais=\''+esc(f.pais)+'\';AU.fab_ciudad=\''+esc(f.ciudad)+'\';AU.prod=\'\';rst();nav(\'eval/nueva\')">Evaluar este fabricante</button><button class="btn bs bw" onclick="nav(\'fab\')">Volver a lista</button></div>';
    $i('fbd').innerHTML=h;
  });
}

/* === PLANTILLAS === */
function vPlant(){
  render('Plantillas','<div id="plc">'+ld()+'</div>','home');
  DB.leer('Plantillas_IA').then(function(data){
    window._tpl=data;
    var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Plantillas IA</h1><p class="st-sub">'+data.length+' plantillas</p></div><button class="btn bp bsm" onclick="showTplForm(null)">+ Nueva</button></div>';
    data.forEach(function(t){
      var activo=(t.activo||'').toLowerCase()==='si';
      h+='<div class="cd" style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700;font-size:13px">'+esc(t.nombre)+'</div><div style="font-size:11px;color:var(--dim)">'+esc(t.tipo)+' | '+(activo?'Activa':'Inactiva')+'</div></div><button class="btn bs bsm" onclick="showTplForm(\''+esc(t.id)+'\')">Editar</button></div></div>';
    });
    h+='<div id="tplform" style="display:none"></div>';
    $i('plc').innerHTML=h;
  }).catch(function(e){$i('plc').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function showTplForm(id){
  var isN=!id;var f={nombre:'',tipo:'WhatsApp',plantilla:'',activo:'Si'};
  if(!isN){var t=DB.find(window._tpl||[],id);if(t)f=t;}
  var h='<h3 class="sl" style="margin-top:16px;color:var(--txt)">'+(isN?'Nueva':'Editar')+' Plantilla</h3>'+
    '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">'+
    ff('tpl_nombre','Nombre',f.nombre)+
    '<div><label class="lb">TIPO</label><select class="ip" id="f-tpl_tipo">'+['WhatsApp','Correo','Informe','Comparativo'].map(function(t){return'<option'+(f.tipo===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div><label class="lb">PLANTILLA (variables: {{FABRICANTE}}, {{PRODUCTO}}, {{PAIS}}, {{CIUDAD}}, {{FORTALEZAS}}, {{DEBILIDADES}}, {{RIESGOS}}, {{PUNTUACION}}, {{RECOMENDACION}}, {{FECHA}})</label><textarea class="ip" id="f-tpl_texto" style="min-height:180px">'+esc(f.plantilla)+'</textarea></div>'+
    '<div><label class="lb">ACTIVO</label><select class="ip" id="f-tpl_activo"><option'+(f.activo==='Si'?' selected':'')+'>Si</option><option'+(f.activo==='No'?' selected':'')+'>No</option></select></div>'+
    '<button class="btn bp bw" id="btpl" onclick="saveTpl(\''+(isN?'':esc(id))+'\')">'+(isN?'Crear':'Actualizar')+'</button>'+
    '<button class="btn bs bw" onclick="vPlant()">Cancelar</button></div>';
  var el=$i('tplform');el.innerHTML=h;el.style.display='block';
}
function saveTpl(oid){
  var d={nombre:gf('tpl_nombre'),tipo:gf('tpl_tipo'),plantilla:document.getElementById('f-tpl_texto').value,activo:gf('tpl_activo')};
  if(!d.nombre){toast('Nombre obligatorio','err');return;}
  var btn=$i('btpl');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?DB.actualizar('Plantillas_IA',oid,d):(d.id=nid(),DB.escribir('Plantillas_IA',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','ok');Mem.del('Plantillas_IA');vPlant();}).catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;}});
}

/* === WHATSAPP === */
function vWA(){
  render('WhatsApp','<div id="wac">'+ld()+'</div>','home');
  Promise.all([DB.leer('Evaluaciones'),DB.leer('Plantillas_IA')]).then(function(r){
    var evals=r[0],tpls=r[1];
    window._weva=evals;window._wtpl=tpls.filter(function(t){return(t.activo||'').toLowerCase()==='si';});
    var h='<h1 class="st-h">Generador de Mensajes</h1><p class="st-sub">Selecciona evaluacion y plantilla</p>';
    h+='<label class="lb">EVALUACION</label><select class="ip" id="wa-eval"><option value="">Seleccionar...</option>';
    evals.forEach(function(a){h+='<option value="'+esc(a.id)+'">'+esc(a.fabricante_nombre)+' - '+esc(a.producto)+' ('+r2(parseFloat(a.global)||0)+'/10)</option>';});
    h+='</select>';
    h+='<label class="lb" style="margin-top:12px">PLANTILLA</label><select class="ip" id="wa-tpl"><option value="">Seleccionar...</option>';
    tpls.forEach(function(t){h+='<option value="'+esc(t.id)+'">['+esc(t.tipo)+'] '+esc(t.nombre)+'</option>';});
    h+='</select>';
    h+='<button class="btn bp bw" style="margin-top:14px" onclick="genMsg()">Generar Mensaje</button>';
    h+='<div id="waprev" style="margin-top:14px"></div>';
    $i('wac').innerHTML=h;
  }).catch(function(e){$i('wac').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function genMsg(){
  var evId=$i('wa-eval').value,tplId=$i('wa-tpl').value;
  if(!evId||!tplId){toast('Selecciona evaluacion y plantilla','warn');return;}
  var ev=DB.find(window._weva||[],evId),tpl=DB.find(window._wtpl||[],tplId);
  if(!ev||!tpl){toast('No encontrado','err');return;}
  var res=ev.resumen?ev.resumen:'';
  var parts=res.split(' | ');
  var vars={FABRICANTE:ev.fabricante_nombre,PRODUCTO:ev.producto,PAIS:'',CIUDAD:'',
    FORTALEZAS:parts[0]||'',DEBILIDADES:parts[1]||'',RIESGOS:parts[2]||'',
    PUNTUACION:r2(parseFloat(ev.global)||0),OBSERVACIONES:ev.notas||'',
    RECOMENDACION:ev.conclusion||'',PROXIMO_PASO:'',FECHA:new Date().toLocaleDateString('es-BO')};
  var txt=applyTpl(tpl.plantilla,vars);
  $i('waprev').innerHTML='<div class="wa" id="wpre">'+esc(txt)+'</div>'+
    '<div class="g2" style="margin-top:10px"><button class="btn bp bw" onclick="navigator.clipboard.writeText(document.getElementById(\'wpre\').textContent).then(function(){toast(\'Copiado\',\'ok\')})">Copiar</button>'+
    '<button class="btn bs bw" onclick="window.open(\'https://wa.me/?text=\'+encodeURIComponent(document.getElementById(\'wpre\').textContent),\'_blank\')">WhatsApp</button></div>';
}

/* === BASE LEGAL === */
function vLegal(){
  var cats=['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'];
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Base Legal</h1><p class="st-sub" id="lc2">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'legal/new\')">+ Nuevo</button></div>'+
    '<input class="ip" id="lgs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true]].concat(cats.map(function(c){return[c,c];})),'lgf')+'<div id="lgl">'+ld()+'</div>';
  render('Base Legal',h,'home');
  DB.leer('Base_Legal').then(function(data){$i('lc2').textContent=data.length+' documentos';window._ll=data;showLL(data);$i('lgs').oninput=function(){applyLF();};initF('lgf',function(){applyLF();});})
    .catch(function(e){$i('lgl').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function applyLF(){var q=($i('lgs')?$i('lgs').value:'').toLowerCase();var fv=document.querySelector('#lgf .fb.on');var ct=fv?fv.getAttribute('data-v'):'';showLL((window._ll||[]).filter(function(d){return(!q||(d.titulo||'').toLowerCase().indexOf(q)!==-1)&&(!ct||d.categoria===ct)}));}
function showLL(data){
  var el=$i('lgl');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin documentos</p>';return;}
  el.innerHTML=data.map(function(d){
    return'<div class="cd" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+
    '<span style="font-size:14px;font-weight:bold;color:var(--gold);flex-shrink:0">[L]</span>'+
    '<div style="flex:1;min-width:0"><div class="fd" style="font-weight:700;font-size:13px">'+esc(d.titulo)+'</div>'+
    '<div style="font-size:11px;color:var(--dim);margin-top:2px">'+esc(d.categoria)+'</div>'+
    (d.descripcion?'<p style="font-size:12px;color:var(--mut);margin-top:4px">'+esc(d.descripcion)+'</p>':'')+
    (d.enlace_oficial?'<a href="'+esc(d.enlace_oficial)+'" target="_blank" rel="noopener" style="font-size:12px;margin-top:4px;display:inline-block">Enlace oficial</a>':'')+
    '</div><button class="btn bs bsm" onclick="nav(\'legal/'+esc(d.id)+'\')">Editar</button></div></div>';
  }).join('');
}
function vLegF(id){
  var isN=!id,f={categoria:'Regulaciones UE',titulo:'',descripcion:'',enlace_oficial:'',fecha_actualizacion:''};
  function draw(d){
    var h='<h1 class="st-h">'+(isN?'Nuevo':'Editar')+' Documento</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      '<div><label class="lb">CATEGORIA</label><select class="ip" id="f-categoria">'+
      ['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'].map(function(c){return'<option'+(d.categoria===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div>'+
      ff('titulo','Titulo *',d.titulo)+'<div><label class="lb">DESCRIPCION</label><textarea class="ip" id="f-descripcion" style="min-height:80px">'+esc(d.descripcion)+'</textarea></div>'+
      ff('enlace_oficial','Enlace Oficial',d.enlace_oficial)+
      '<button class="btn bp bw" id="blg" onclick="doSaveL(\''+(isN?'':esc(id))+'\',\''+esc(d.fecha_actualizacion||'')+'\')">'+(isN?'Crear':'Actualizar')+'</button></div>';
    render(isN?'Nuevo Documento':'Editar Documento',h,'legal');
  }
  if(isN)draw(f);else{DB.leer('Base_Legal').then(function(data){draw(DB.find(data,id)||f);}).catch(function(){draw(f);});}
}
function doSaveL(oid,ofu){
  var d={categoria:gf('categoria'),titulo:gf('titulo'),descripcion:gf('descripcion'),enlace_oficial:gf('enlace_oficial')};
  if(!d.titulo){toast('Titulo obligatorio','err');return;}
  var btn=$i('blg');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?(d.id=oid,d.fecha_actualizacion=ofu,DB.actualizar('Base_Legal',oid,d)):(d.id=nid(),d.fecha_actualizacion=new Date().toISOString(),DB.escribir('Base_Legal',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','ok');nav('legal');}).catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;}});
}

/* === USUARIOS === */
function vUsers(){
  render('Usuarios','<div id="ucon">'+ld()+'</div>','home');
  DB.leer('Usuarios',true).then(function(uu){
    var h='<h1 class="st-h">Gestion de Usuarios</h1><p class="st-sub">'+uu.length+' usuarios</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">';
    uu.forEach(function(u){
      var nombre=u.Nombre||'',ac=(u.Activo||'').toLowerCase();var activo=(ac==='si'||ac==='s');
      h+='<div class="cd"><div style="display:flex;align-items:center;justify-content:space-between"><div><span class="fd" style="font-weight:700;font-size:14px">'+esc(nombre)+'</span> <span class="bg '+(activo?'bg-gn':'bg-rd')+'">'+(activo?'Activo':'Bloqueado')+'</span></div></div></div>';
    });
    h+='</div><h3 class="sl" style="margin-top:18px">Anadir Usuario</h3><div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">'+
      ff('nuevo_nombre','Nombre','')+ff('nuevo_clave','Clave','')+
      '<button class="btn bp bw" id="buadd" onclick="crearU()">Crear Usuario</button></div>';
    $i('ucon').innerHTML=h;
  }).catch(function(e){$i('ucon').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function crearU(){
  var nombre=gf('nuevo_nombre'),clave=gf('nuevo_clave');if(!nombre||!clave){toast('Nombre y clave obligatorios','err');return;}
  var btn=$i('buadd');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  DB.leer('Usuarios',true).then(function(uu){
    for(var i=0;i<uu.length;i++){if((uu[i].Nombre||'')===nombre){toast('Ese nombre ya existe','err');if(btn){btn.disabled=false;btn.textContent='Crear Usuario';}return;}}
    DB.escribir('Usuarios',{Nombre:nombre,Clave:clave,Activo:'Si'}).then(function(){toast('Usuario creado','ok');vUsers();}).catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;}});
  });
}

/* === INICIO === */
document.addEventListener('DOMContentLoaded',function(){
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(function(){});}
  ruta();
});