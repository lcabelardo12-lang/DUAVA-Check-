'use strict';
var URL_HOJA = 'https://script.google.com/macros/s/AKfycbzPZrEd8x6sMAtpB3TilW6NcFh80ato138Uyi1DhJlY7P3pG0nZ78RFzobEo-7dWZ5raQ/exec';

function $(s){return document.querySelector(s)}
function $i(s){return document.getElementById(s)}
function nuevoId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,8)}
function esc(s){if(s==null)return '';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML}

function toast(msg,tipo){
  tipo=tipo||'ok';
  var cls={ok:'tt-s',err:'tt-e',warn:'tt-w'};
  var d=document.createElement('div');
  d.className='tt '+(cls[tipo]||'tt-s');
  d.textContent=msg;
  document.body.appendChild(d);
  requestAnimationFrame(function(){d.classList.add('show')});
  setTimeout(function(){d.classList.remove('show');setTimeout(function(){d.remove()},300)},3500);
}

var Mem={d:{},get:function(k){return this.d[k]||null},set:function(k,v){this.d[k]=v},del:function(k){delete this.d[k]}};

var DB={
  leer:function(hoja,force){
    if(!force){var c=Mem.get(hoja);if(c)return Promise.resolve(c)}
    return fetch(URL_HOJA+'?action=read&sheet='+encodeURIComponent(hoja))
      .then(function(r){return r.json()})
      .then(function(d){if(d.error)throw new Error(d.error);Mem.set(hoja,d);return d});
  },
  escribir:function(hoja,data){
    var u=URL_HOJA+'?action=write&sheet='+encodeURIComponent(hoja)+'&data='+encodeURIComponent(JSON.stringify(data));
    return fetch(u).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Mem.del(hoja);return d});
  },
  actualizar:function(hoja,id,data){
    var u=URL_HOJA+'?action=update&sheet='+encodeURIComponent(hoja)+'&id='+encodeURIComponent(id)+'&data='+encodeURIComponent(JSON.stringify(data));
    return fetch(u).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Mem.del(hoja);return d});
  },
  find:function(lista,id){for(var i=0;i<lista.length;i++){if(lista[i].id===id)return lista[i]}return null}
};

var Ses={
  get:function(){try{return JSON.parse(sessionStorage.getItem('du'))}catch(e){return null}},
  set:function(u){sessionStorage.setItem('du',JSON.stringify(u))},
  del:function(){sessionStorage.removeItem('du')},
  ok:function(){return !!this.get()}
};

var MOD={
  1:{n:'Certificacion Europea (CE/MDR)',s:'Filtro Critico - Poder de Veto',veto:true,tp:'text',
     ph:'Pega aqui el texto del certificado CE, MDR o ficha del producto...',
     lk:[{t:'NANDO (UE)',u:'https://webgate.ec.europa.eu/single-market-compliance-space/#/notified-bodies'},{t:'CertiPedia',u:'https://www.certipedia.com/'},{t:'TUV SUD',u:'https://www.tuvsud.com/en/industries/healthcare-and-medical-devices'}]},
  2:{n:'Identidad Corporativa',s:'Fabricante vs. Intermediario',veto:false,tp:'text',
     ph:'Pega texto de la Licencia Comercial o nombre de empresa...',
     lk:[{t:'Guia Licencias Chinas',u:'https://www.china-briefing.com/news/how-to-read-a-china-business-license/'},{t:'Tianyancha',u:'https://www.tianyancha.com/'}]},
  3:{n:'Especificaciones Tecnicas',s:'Analisis Forense de Datasheet',veto:false,tp:'text',
     ph:'Pega ficha tecnica: voltaje, RPM, torque, IP, normativas...',
     lk:[{t:'IEC 60601',u:'https://webstore.iec.ch/en/publication/25652'}]},
  4:{n:'Cadena de Suministro',s:'Repuestos y Garantia',veto:false,tp:'chk',
     ck:[{id:'m4_catalogo_repuestos',lb:'Tiene Catalogo de Repuestos?',sub:'Lista de piezas con numeros de parte.'},
         {id:'m4_precios_unitarios',lb:'Tiene Precios unitarios?',sub:'Precio claro por cada repuesto.'},
         {id:'m4_garantia_escrita',lb:'Tiene Garantia escrita?',sub:'Documento formal, no verbal.'},
         {id:'m4_procedimiento_reclamacion',lb:'Tiene Procedimiento de reclamacion?',sub:'Pasos, tiempos, cobertura.'}],
     lk:[]},
  5:{n:'Viabilidad Bolivia (AGEMED)',s:'Requisitos Regulatorios',veto:false,tp:'chk',
     ck:[{id:'m5_cfg',lb:'Puede emitir CFG?',sub:'Certificado de Libre Venta.'},
         {id:'m5_apostillado',lb:'CFG apostillado?',sub:'Apostilla de La Haya.'},
         {id:'m5_manual_espanol',lb:'Manual en espanol?',sub:'Traduccion oficial.'}],
     lk:[{t:'AGEMED',u:'https://www.gob.bo/agaemed'}]}
};

function aM1(t){
  var mdr=/MDR\s*2017\/745|MDD\s*93\/42|Medical Device (Regulation|Directive)/i.test(t);
  var nb=/(?:CE|NB|Notified\s*Body)\s*[^\d]{0,3}\d{4}\b/i.test(t);
  var ce=/\bCE\b|marca\s*CE|marcado\s*CE/i.test(t);
  var fk=/\bce\s+certified\b/i.test(t)&&!/\bCE\b/.test(t);
  var v,f;
  if(mdr&&nb){v='GREEN';f='Certificacion MDR/MDD valida con organismo notificado. Pasa filtro critico.';}
  else if(mdr&&!nb){v='YELLOW';f='Referencia MDR/MDD pero sin numero de organismo. Verificar en NANDO.';}
  else if(ce&&!mdr){v='YELLOW';f='CE sin referencia a MDR/MDD. Posible certificacion obsoleta.';}
  else if(fk){v='RED';f='Posible ce fraudulento (minusculas, sin organismo). Alto riesgo.';}
  else{v='RED';f='Sin certificacion CE/MDR/MDD. NO puede importarse sin certificacion europea valida.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Referencia MDR/MDD',pasa:mdr},{texto:'Numero de organismo notificado',pasa:nb},{texto:'Mencion CE',pasa:ce}]};
}

function aM2(t){
  var mfr=/manufactur|production|factory|producer/i.test(t);
  var trd=/trading|wholesale|import.*(and|&).*export/i.test(t);
  var v,f;
  if(mfr){v='GREEN';f='Indicadores claros de fabricante. Mayor probabilidad de ser fabricante real.';}
  else if(trd&&!mfr){v='YELLOW';f='Solo indicadores de intermediario. Incrementa precio, reduce soporte.';}
  else{v='YELLOW';f='Sin indicadores claros. Solicitar licencia comercial completa.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Fabricante',pasa:mfr},{texto:'Intermediario',pasa:trd}]};
}

function aM3(t){
  var iec=/IEC\s*60601|EN\s*60601|60601-1/i.test(t);
  var ip=/IP\s*[X]?\d{1,2}\b|IP6[5-9]|IPX[5-9]|sumergible|waterproof/i.test(t);
  var tech=/\d+\s*(?:RPM|rpm|N[.]cm|W(?:att)?|V(?:olt)?|kPa|Hz|mA)/i.test(t);
  var vague=/high\s*quality|premium|best\s*motor|superior/i.test(t)&&!tech;
  var v,f;
  if(iec&&ip){v='GREEN';f='IEC 60601-1 y clasificacion IP presentes. Especificaciones adecuadas.';}
  else if(iec||ip){v='YELLOW';var ms=[];if(!iec)ms.push('IEC 60601');if(!ip)ms.push('IP');f='Ficha parcial: falta '+ms.join(' y ')+'.';}
  else if(vague){v='RED';f='Especificaciones vagas sin datos ni normativas.';}
  else{v='RED';f='Sin IEC 60601, IP ni datos tecnicos cuantitativos.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'IEC 60601-1',pasa:iec},{texto:'Clasificacion IP',pasa:ip},{texto:'Datos tecnicos',pasa:tech}]};
}

function aM4(c){
  var a=c.m4_catalogo_repuestos,b=c.m4_precios_unitarios,g=c.m4_garantia_escrita,p=c.m4_procedimiento_reclamacion;
  var v,f;
  if(a&&b&&g&&p){v='GREEN';f='Catalogo con precios, garantia y procedimiento. Suministro documentado.';}
  else if(g&&p&&(a||b)){v='YELLOW';f='Garantia documentada pero catalogo incompleto.';}
  else if((a||b)&&!g){v='YELLOW';f='Repuestos parciales sin garantia formal.';}
  else if(g&&!p){v='YELLOW';f='Garantia sin procedimiento escrito.';}
  else{v='RED';f='Sin catalogo, precios ni garantia. Alto riesgo post-venta.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Catalogo de Repuestos',pasa:a},{texto:'Precios unitarios',pasa:b},{texto:'Garantia escrita',pasa:g},{texto:'Procedimiento reclamacion',pasa:p}]};
}

function aM5(c){
  var cfg=c.m5_cfg,apo=c.m5_apostillado,man=c.m5_manual_espanol;
  var v,f;
  if(cfg&&apo&&man){v='GREEN';f='CFG apostillado y manual en espanol. Cumple AGEMED.';}
  else if(cfg&&apo&&!man){v='YELLOW';f='CFG apostillado pero sin manual en espanol.';}
  else if(man&&(!cfg||!apo)){v='YELLOW';f='Manual en espanol pero falta CFG o apostillado.';}
  else if(cfg&&!apo){v='YELLOW';f='CFG sin apostillado.';}
  else{v='RED';f='Sin CFG apostillado ni manual en espanol. NO registra ante AGEMED.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Free Sales Certificate',pasa:cfg},{texto:'Apostillado',pasa:apo},{texto:'Manual en espanol',pasa:man}]};
}

function runAud(d){
  var m={};
  m[1]=d.m1_texto.trim()?aM1(d.m1_texto):{veredicto:'RED',hallazgos:'Sin informacion.',detalles:[]};
  m[2]=d.m2_texto.trim()?aM2(d.m2_texto):{veredicto:'RED',hallazgos:'Sin informacion.',detalles:[]};
  m[3]=d.m3_texto.trim()?aM3(d.m3_texto):{veredicto:'RED',hallazgos:'Sin informacion.',detalles:[]};
  var c4=d.m4||{};m[4]=Object.values(c4).some(function(v){return v})?aM4(c4):{veredicto:'RED',hallazgos:'Sin verificacion.',detalles:[]};
  var c5=d.m5||{};m[5]=Object.values(c5).some(function(v){return v})?aM5(c5):{veredicto:'RED',hallazgos:'Sin verificacion.',detalles:[]};
  var gv='GREEN',pw={GREEN:0,YELLOW:1,RED:2};
  if(m[1].veredicto==='RED')gv='RED';else for(var i=1;i<=5;i++){if(pw[m[i].veredicto]>pw[gv])gv=m[i].veredicto;}
  var rs=[],ys=[];
  for(var i=1;i<=5;i++){if(m[i].veredicto==='RED')rs.push(MOD[i].n);else if(m[i].veredicto==='YELLOW')ys.push(MOD[i].n);}
  var sum='';
  if(gv==='RED')sum=m[1].veredicto==='RED'?'RECHAZADA: Sin CE/MDR. Riesgo legal inaceptable.':'RIESGOS CRITICOS: '+rs.length+' modulo(s) en rojo ('+rs.join(', ')+').';
  else if(gv==='YELLOW')sum='CON OBSERVACIONES: '+ys.length+' modulo(s) con advertencias ('+ys.join(', ')+').';
  else sum='APROBADA: Todos los modulos cumplen. Procede con negociacion.';
  return{gv:gv,sum:sum,m:m,sc:{ok:5-rs.length-ys.length,warn:ys.length,fail:rs.length}};
}

function genWA(rec,eco){
  var ve={GREEN:'[OK]',YELLOW:'[!]',RED:'[X]'};
  var ms={1:'Certificacion CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garantia',5:'Legalidad AGEMED'};
  var t='COMPARATIVO DE EQUIPOS MEDICOS\n================================\n\n';
  t+='RECOMENDADA\n'+esc(rec.producto)+'\n'+esc(rec.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[rec['m'+i+'_veredicto']]+' '+ms[i]+'\n';
  t+='\n================================\n\nECONOMICA\n'+esc(eco.producto)+'\n'+esc(eco.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[eco['m'+i+'_veredicto']]+' '+ms[i]+'\n';
  t+='\n================================\n\nRECOMENDACION:\nSe recomienda '+esc(rec.producto)+'. Garantiza certificacion valida y cumplimiento AGEMED.\n\nDuava Check - Auditoria Forense';
  return t;
}

function nav(p){location.hash='#/'+p}
function getR(){return location.hash.replace('#/','')||'login'}
window.addEventListener('hashchange',ruta);
function ruta(){
  if(URL_HOJA.indexOf('PEGA_AQUI')!==-1){showCfg();return;}
  var r=getR();
  if(r==='login')return vLogin();
  if(!Ses.ok())return nav('login');
  if(r==='home'||r==='')return vHome();
  if(r==='aud/nueva')return vNueva();
  if(/^aud\/\d$/.test(r))return vMod(parseInt(r.split('/')[1]));
  if(r==='res')return vRes();
  if(r==='hist')return vHist();
  if(/^hist\/.+/.test(r))return vHistDet(r.split('/')[1]);
  if(r==='prov')return vProv();
  if(r==='prov/new')return vProvF(null);
  if(/^prov\/.+/.test(r))return vProvF(r.split('/')[1]);
  if(r==='legal')return vLegal();
  if(r==='legal/new')return vLegF(null);
  if(/^legal\/.+/.test(r))return vLegF(r.split('/')[1]);
  if(r==='wa')return vWA();
  if(r==='users')return vUsers();
  nav('home');
}

var AU={prov:null,prod:'',m1:'',m2:'',m3:'',m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}};
var RES=null;
function rst(){AU={prov:null,prod:'',m1:'',m2:'',m3:'',m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}};RES=null;}

function render(tit,cont,bk){
  var bv=bk?'<button onclick="nav(\''+bk+'\')" style="background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:8px 0;margin-bottom:8px;display:inline-block;font-family:Syne,sans-serif">< Volver</button>':'';
  var u=Ses.get();
  var bar='<div style="position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--bdr);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;z-index:50;max-width:720px;margin:0 auto;font-family:Syne,sans-serif">'+
    '<span style="font-size:12px;color:var(--mut)">'+esc(u?u.nombre:'')+'</span>'+
    '<span id="off" style="font-size:11px;color:var(--ylw);display:'+(navigator.onLine?'none':'inline')+'">Sin conexion</span>'+
    '<button onclick="Ses.del();nav(\'login\')" style="background:none;border:1px solid var(--bdr);color:var(--red);font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:Syne,sans-serif">Salir</button></div>';
  $i('R').innerHTML='<div style="padding:18px 16px 70px">'+bv+cont+'</div>'+bar;
}

function sem(v,sz,lbl){
  sz=sz||'n';
  var ic={GREEN:'OK',YELLOW:'!',RED:'X'};
  var cl={GREEN:'sm-g',YELLOW:'sm-y',RED:'sm-r'};
  var lb={GREEN:'APROBADO',YELLOW:'CON OBSERVACIONES',RED:'RECHAZADO'};
  return '<div class="sm-w '+cl[v]+'"><div class="sm-c '+sz+'">'+(ic[v]||'?')+'</div>'+(lbl!==false?'<span class="sm-t">'+(lb[v]||'')+'</span>':'')+'</div>';
}

function ld(m){return '<div class="ld"><div class="spn"></div><p style="font-size:13px;color:var(--mut)">'+(m||'Cargando...')+'</p></div>';}

function refL(lk){
  if(!lk||!lk.length)return '';
  var id='r_'+nuevoId();
  return '<div class="ch" onclick="var e=document.getElementById(\''+id+'\');e.className=e.className.indexOf(\'open\')>-1?\'cb\':\'cb open\'">Recursos de referencia</div><div id="'+id+'" class="cb">'+lk.map(function(e){return '<a class="rl" href="'+e.u+'" target="_blank" rel="noopener">'+esc(e.t)+'</a>';}).join('')+'</div>';
}

function filtH(arr,wid){
  return '<div class="fs" id="'+wid+'">'+arr.map(function(a){return '<button class="fb'+(a[2]?' on':'')+'" data-v="'+a[0]+'">'+a[1]+'</button>';}).join('')+'</div>';
}

function initF(wid,cb){
  var w=$i(wid);if(!w)return;
  w.onclick=function(e){var b=e.target.closest('.fb');if(!b)return;w.querySelectorAll('.fb').forEach(function(x){x.classList.remove('on')});b.classList.add('on');cb(b.getAttribute('data-v'));};
}

function showCfg(){
  $i('R').innerHTML='<div class="err-full"><div><h2>Configuracion requerida</h2><p>Abre <code>app.js</code> y busca la linea que dice <code>URL_HOJA</code>. Reemplaza <code>PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT</code> con la URL de tu Google Apps Script.</p></div></div>';
}

function ff(n,lb,v){return '<div><label class="lb">'+lb+'</label><input class="ip" id="f-'+n+'" value="'+esc(v||'')+'"></div>';}
function gf(n){var el=$i('f-'+n);return el?el.value.trim():'';}

function vLogin(){
  $i('R').innerHTML='<div class="lg-w"><div class="lg-b">'+
    '<div class="lg-i">DC</div>'+
    '<h1 class="lg-h">Duava Check</h1>'+
    '<p class="lg-sub">Auditoria Forense de Proveedores Medicos</p>'+
    '<p style="font-size:11px;color:var(--dim);margin-bottom:24px;font-family:DM Mono,monospace">v1.0</p>'+
    '<div id="le"></div>'+
    '<div style="text-align:left;margin-bottom:12px"><label class="lb">NOMBRE</label><input class="ip" id="ln" placeholder="Tu nombre"></div>'+
    '<div style="text-align:left;margin-bottom:18px"><label class="lb">CLAVE</label><input class="ip" id="lc" type="password" placeholder="Tu clave"></div>'+
    '<button class="btn bp bw" id="lbtn" onclick="doLogin()">Iniciar Sesion</button>'+
    '<p style="font-size:11px;color:var(--dim);margin-top:14px">Acceso restringido a usuarios autorizados</p>'+
    '</div></div>';
  $i('lc').onkeydown=function(e){if(e.key==='Enter')doLogin()};
  $i('ln').focus();
}

function doLogin(){
  var n=$i('ln').value.trim(),c=$i('lc').value;
  if(!n||!c){lgErr('Completa ambos campos');return;}
  $i('lbtn').disabled=true;$i('lbtn').textContent='Conectando...';
  DB.leer('Usuarios').then(function(uu){
    var f=null;
    for(var i=0;i<uu.length;i++){if(uu[i].Nombre===n&&uu[i].Clave===c){f=uu[i];break;}}
    if(!f){lgErr('Nombre o clave incorrectos');resB();return;}
    var a=(f.Activo||'').toLowerCase();
    if(a!=='si'&&a!=='s'){lgErr('Usuario inactivo.');resB();return;}
    Ses.set({nombre:f.Nombre});nav('home');
  }).catch(function(e){lgErr('Error: '+e.message);resB()});
}
function lgErr(m){$i('le').innerHTML='<div class="lg-err">'+esc(m)+'</div>';}
function resB(){$i('lbtn').disabled=false;$i('lbtn').textContent='Iniciar Sesion';}

function vHome(){
  var u=Ses.get();
  var h='<div style="text-align:center;margin-bottom:6px"><img src="logo.png" alt="Logo" style="max-width:150px;height:auto"></div>'+
    '<h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px">Duava Check</h2>'+
    '<p style="font-size:13px;color:var(--mut);margin-bottom:18px;text-align:center">Bienvenido, <strong style="color:var(--gold)">'+esc(u?u.nombre:'')+'</strong></p>'+
    '<div class="cd cd-cl" onclick="nav(\'aud/nueva\')" style="margin-bottom:20px;border-color:var(--gold-dim)">'+
    '<div style="display:flex;align-items:center;gap:12px"><span style="font-size:26px">[+]</span>'+
    '<div><div class="fd" style="font-weight:700;font-size:15px">Nueva Auditoria</div>'+
    '<div style="font-size:12px;color:var(--mut)">Evaluar proveedor con los 5 Pilares</div></div></div></div>'+
    '<h3 class="sl" style="color:var(--txt);font-size:14px;margin-top:8px">Los 5 Pilares</h3>'+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
  for(var i=1;i<=5;i++){
    var m=MOD[i];
    h+='<div class="cd" style="opacity:.7"><div style="display:flex;align-items:center;gap:10px"><div>'+
    '<span class="fm" style="font-size:11px;color:var(--gold);background:var(--gold-bg);padding:1px 6px;border-radius:4px">M'+i+'</span> '+
    '<span class="fd" style="font-weight:700;font-size:13px">'+esc(m.n)+'</span>'+
    (m.veto?' <span class="bg bg-rd">VETO</span>':'')+
    '</div></div></div>';
  }
  h+='</div><h3 class="sl" style="color:var(--txt);font-size:14px">Herramientas</h3><div class="g2">'+
    hC('[H]','Historial','Consultar auditorias','hist')+
    hC('[P]','Proveedores','Base de contactos','prov')+
    hC('[L]','Base Legal','Regulaciones y normas','legal')+
    hC('[W]','WhatsApp','Comparativos','wa')+
    hC('[U]','Usuarios','Gestionar accesos','users')+'</div>';
  render('Duava Check',h);
}
function hC(ic,t,s,p){
  return '<div class="cd cd-cl" onclick="nav(\''+p+'\')"><div style="display:flex;align-items:center;gap:10px">'+
    '<span style="font-size:16px;font-weight:bold;color:var(--gold)">'+ic+'</span>'+
    '<div><div class="fd" style="font-weight:700;font-size:13px">'+esc(t)+'</div>'+
    '<div style="font-size:11px;color:var(--mut)">'+esc(s)+'</div></div></div></div>';
}

function vNueva(){
  var h='<h1 class="st-h">Nueva Auditoria</h1><p class="st-sub">Selecciona proveedor y nombra el producto</p><label class="lb">PROVEEDOR</label>';
  if(AU.prov){
    h+='<div class="cd" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700">'+esc(AU.prov.nombre)+'</div><div style="font-size:12px;color:var(--mut)">'+esc(AU.prov.ciudad||'')+'</div></div><button class="btn bs bsm" onclick="AU.prov=null;vNueva()">Cambiar</button></div></div>';
  }else{
    h+='<input class="ip" id="ps" placeholder="Buscar proveedor..." style="margin-bottom:8px"><div id="pl">'+ld()+'</div>'+
      '<button class="btn bs bw" style="margin-top:8px" onclick="var e=$i(\'qpf\');e.style.display=e.style.display===\'none\'?\'block\':\'none\'">+ Crear proveedor rapido</button>'+
      '<div id="qpf" style="display:none;margin-top:8px"><input class="ip" id="qn" placeholder="Nombre de la empresa" style="margin-bottom:6px"><input class="ip" id="qc" placeholder="Ciudad (ej: Shenzhen)" style="margin-bottom:6px"><button class="btn bp bw" onclick="mkProv()">Crear y seleccionar</button></div>';
  }
  h+='<div style="margin-top:16px"><label class="lb">PRODUCTO</label><input class="ip" id="ap" placeholder="Nombre del equipo o dispositivo medico" value="'+esc(AU.prod)+'"></div>'+
    '<button class="btn bp bw" style="margin-top:18px" onclick="startAud()">Comenzar Auditoria ></button>';
  render('Nueva Audit