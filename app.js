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
  render('Nueva Auditoria',h,'home');
  if(!AU.prov){
    DB.leer('Proveedores').then(function(d){showPL(d)}).catch(function(e){$i('pl').innerHTML='<p style="color:var(--red);font-size:13px;padding:12px">Error: '+esc(e.message)+'</p>';});
    var s=$i('ps');if(s)s.oninput=function(){var q=this.value.toLowerCase();DB.leer('Proveedores').then(function(d){showPL(d.filter(function(p){return(p.nombre||'').toLowerCase().indexOf(q)!==-1||(p.ciudad||'').toLowerCase().indexOf(q)!==-1;}))});};
  }
  var p=$i('ap');if(p)p.oninput=function(){AU.prod=this.value;};
}
function showPL(data){
  var el=$i('pl');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:12px">Sin proveedores. Crea uno.</p>';return;}
  el.innerHTML=data.map(function(p){return '<div class="li" style="margin-bottom:6px" onclick="selP(\''+esc(p.id)+'\')"><div class="li-b"><div class="li-t">'+esc(p.nombre)+'</div><div class="li-s">'+esc([p.ciudad,p.tipo].filter(Boolean).join(' / '))+'</div></div></div>';}).join('');
}
function selP(id){DB.leer('Proveedores').then(function(d){var p=DB.find(d,id);if(p)AU.prov={id:p.id,nombre:p.nombre,ciudad:p.ciudad||''};vNueva();});}
function mkProv(){
  var n=$i('qn').value.trim(),c=$i('qc').value.trim();
  if(!n){toast('Ingresa el nombre','err');return;}
  var p={id:nuevoId(),nombre:n,ciudad:c,pais:'China',tipo:'',estado:'Evaluacion',email:'',telefono:'',certificaciones:'',notas:'',fecha_creacion:new Date().toISOString()};
  DB.escribir('Proveedores',p).then(function(){selP(p.id);toast('Proveedor creado','ok');}).catch(function(e){toast('Error: '+e.message,'err');});
}
function startAud(){if(!AU.prov){toast('Selecciona un proveedor','warn');return;}if(!AU.prod.trim()){toast('Ingresa el nombre del producto','warn');return;}nav('aud/1');}

function vMod(n){
  var m=MOD[n],bk=n>1?'aud/'+(n-1):'aud/nueva';
  var c='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="fm bg bg-g">MODULO '+n+'/5</span>'+(m.veto?'<span style="font-size:11px;color:var(--red)">! Poder de veto</span>':'')+'</div>';
  c+='<h1 class="st-h">'+esc(m.n)+'</h1><p class="st-sub">'+esc(m.s)+'</p>';
  if(m.tp==='text'){
    var val=n===1?AU.m1:n===2?AU.m2:AU.m3;
    c+='<textarea class="ip" id="mt" placeholder="'+esc(m.ph)+'">'+esc(val)+'</textarea>';
    c+='<p style="font-size:11px;color:var(--dim);margin-top:4px" id="cc">'+val.length+' caracteres</p>';
  }
  if(m.tp==='chk'){
    var chk=n===4?AU.m4:AU.m5;
    m.ck.forEach(function(x){
      var on=chk[x.id]||false;
      c+='<div class="ci'+(on?' on':'')+'" id="ci_'+x.id+'" onclick="togC('+n+',\''+x.id+'\')"><input type="checkbox" '+(on?'checked':'')+' tabindex="-1"><div><div class="ci-l">'+esc(x.lb)+'</div><div class="ci-s">'+esc(x.sub)+'</div></div></div>';
    });
  }
  c+='<button class="btn bs bw" style="margin:14px 0 10px" onclick="prevM('+n+')">Vista previa del analisis</button><div id="mpv"></div>'+refL(m.lk);
  var nx=n<5?'aud/'+(n+1):'res';
  c+='<div class="mn">'+(n>1?'<button class="btn bs" onclick="nav(\'aud/'+(n-1)+'\')">< M'+(n-1)+'</button>':'')+'<button class="btn bp" onclick="nav(\''+nx+'\')">'+(n<5?'M'+(n+1)+' >':'Ver Resultados >')+'</button></div>';
  render('M'+n+': '+m.n,c,bk);
  if(m.tp==='text'){var ta=$i('mt');if(ta)ta.oninput=function(){saveT(n);var el=$i('cc');if(el)el.textContent=this.value.length+' caracteres';};}
}
function saveT(n){var ta=$i('mt');if(!ta)return;if(n===1)AU.m1=ta.value;else if(n===2)AU.m2=ta.value;else AU.m3=ta.value;}
function togC(n,id){var chk=n===4?AU.m4:AU.m5;chk[id]=!chk[id];var el=$i('ci_'+id);if(el){var cb=el.querySelector('input[type=checkbox]');if(cb)cb.checked=chk[id];el.classList.toggle('on',chk[id]);}}
function prevM(n){
  var d;
  if(n<=3){var t=n===1?AU.m1:n===2?AU.m2:AU.m3;if(!t.trim()){$i('mpv').innerHTML='<p style="color:var(--dim);font-size:13px">Ingresa texto primero.</p>';return;}d=n===1?aM1(t):n===2?aM2(t):aM3(t);}
  else{var c=n===4?AU.m4:AU.m5;if(!Object.values(c).some(function(v){return v;})){$i('mpv').innerHTML='<p style="color:var(--dim);font-size:13px">Marca al menos un check.</p>';return;}d=n===4?aM4(c):aM5(c);}
  var cls=d.veredicto.toLowerCase();
  var h='<div class="pv pv-'+cls+'"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(d.veredicto,'s',false)+'<div><p style="font-size:13px;line-height:1.6">'+esc(d.hallazgos)+'</p>';
  if(d.detalles&&d.detalles.length){h+='<div style="margin-top:8px">';d.detalles.forEach(function(x){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:2px 0"><span style="color:'+(x.pasa?'var(--grn)':'var(--dim)')+'">'+(x.pasa?'OK':'X')+'</span>'+esc(x.texto)+'</div>';});h+='</div>';}
  h+='</div></div></div>';
  $i('mpv').innerHTML=h;
}

function vRes(){
  if(!RES)RES=runAud({m1_texto:AU.m1,m2_texto:AU.m2,m3_texto:AU.m3,m4:AU.m4,m5:AU.m5});
  var r=RES;
  var h='<div style="text-align:center;margin-bottom:20px">'+sem(r.gv,'l')+'<h1 class="st-h" style="margin-top:14px">Resultado de Auditoria</h1>'+
    '<p style="font-size:13px;color:var(--mut)">'+esc(AU.prod)+' - '+esc(AU.prov?AU.prov.nombre:'')+'</p>'+
    '<p class="fm" style="font-size:11px;color:var(--dim);margin-top:4px">'+new Date().toLocaleString('es-BO')+'</p></div>';
  h+='<div class="cd cd-'+r.gv.toLowerCase()+'" style="margin-bottom:18px"><p style="font-size:13px;line-height:1.7">'+esc(r.sum)+'</p>'+
    '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px;font-family:Syne,sans-serif">'+
    '<span style="color:var(--grn)">'+r.sc.ok+' aprobado(s)</span>'+
    '<span style="color:var(--ylw)">'+r.sc.warn+' con obs.</span>'+
    '<span style="color:var(--red)">'+r.sc.fail+' rechazado(s)</span></div></div>';
  for(var i=1;i<=5;i++){
    var mr=r.m[i];if(!mr)continue;
    h+='<div class="cd cd-'+mr.veredicto.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(mr.veredicto,'s',false)+'<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="fm" style="font-size:11px;color:var(--dim)">M'+i+'</span><span class="fd" style="font-weight:700;font-size:13px">'+esc(MOD[i].n)+'</span>'+(MOD[i].veto&&mr.veredicto==='RED'?' <span class="bg bg-rd">VETO</span>':'')+'</div><p style="font-size:13px;color:var(--mut);line-height:1.6">'+esc(mr.hallazgos)+'</p>';
    if(mr.detalles&&mr.detalles.length){h+='<div style="margin-top:6px">';mr.detalles.forEach(function(x){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:1px 0"><span style="color:'+(x.pasa?'var(--grn)':'var(--dim)')+'">'+(x.pasa?'OK':'X')+'</span>'+esc(x.texto)+'</div>';});h+='</div>';}
    h+='</div></div></div>';
  }
  h+='<div class="g2" style="margin-top:18px"><button class="btn bp bw" id="svb" onclick="saveAud()">Guardar en Sheets</button><button class="btn bs bw" onclick="window.print()">Exportar PDF</button></div>'+
    '<div class="g2" style="margin-top:8px"><button class="btn bs bw" onclick="shareWA()">WhatsApp</button><button class="btn bs bw" onclick="rst();nav(\'home\')">Nueva Auditoria</button></div>';
  render('Resultados',h,'aud/5');
}

function saveAud(){
  var r=RES;if(!r)return;
  var row={
    id:nuevoId(),fecha:new Date().toISOString(),proveedor_id:AU.prov?AU.prov.id:'',proveedor_nombre:AU.prov?AU.prov.nombre:'',producto:AU.prod,
    m1_texto:AU.m1,m1_veredicto:r.m[1].veredicto,m1_hallazgos:r.m[1].hallazgos,
    m2_texto:AU.m2,m2_veredicto:r.m[2].veredicto,m2_hallazgos:r.m[2].hallazgos,
    m3_texto:AU.m3,m3_veredicto:r.m[3].veredicto,m3_hallazgos:r.m[3].hallazgos,
    m4_catalogo_repuestos:String(AU.m4.m4_catalogo_repuestos),m4_precios_unitarios:String(AU.m4.m4_precios_unitarios),
    m4_garantia_escrita:String(AU.m4.m4_garantia_escrita),m4_procedimiento_reclamacion:String(AU.m4.m4_procedimiento_reclamacion),
    m4_veredicto:r.m[4].veredicto,m4_hallazgos:r.m[4].hallazgos,
    m5_cfg:String(AU.m5.m5_cfg),m5_apostillado:String(AU.m5.m5_apostillado),m5_manual_espanol:String(AU.m5.m5_manual_espanol),
    m5_veredicto:r.m[5].veredicto,m5_hallazgos:r.m[5].hallazgos,
    veredicto_global:r.gv,resumen:r.sum,notas:'',creado_por:Ses.get()?Ses.get().nombre:''
  };
  var btn=$i('svb');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  DB.escribir('Auditorias',row).then(function(){toast('Guardado en Google Sheets','ok');if(btn)btn.textContent='Guardado OK';})
    .catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;btn.textContent='Guardar en Sheets';}});
}

function shareWA(){
  var ve={GREEN:'[OK]',YELLOW:'[!]',RED:'[X]'},ms={1:'Certificacion CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garantia',5:'Legalidad AGEMED'};
  var t='AUDITORIA DUAVA CHECK\n========================\n'+esc(AU.prod)+'\n'+esc(AU.prov?AU.prov.nombre:'')+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[RES.m[i].veredicto]+' '+ms[i]+'\n';
  t+='\n========================\n'+RES.sum+'\n\nDuava Check';
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
}

function vHist(){
  var h='<h1 class="st-h">Historial</h1><p class="st-sub" id="hc">Cargando...</p>'+
    '<input class="ip" id="hs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true],['GREEN','Verdes'],['YELLOW','Amarillas'],['RED','Rojas']],'hf')+'<div id="hl">'+ld()+'</div>';
  render('Historial',h,'home');
  DB.leer('Auditorias').then(function(data){data.reverse();$i('hc').textContent=data.length+' auditorias';window._ha=data;showHL(data);$i('hs').oninput=function(){applyHF();};initF('hf',function(){applyHF();});})
    .catch(function(e){$i('hl').innerHTML='<p style="color:var(--red);font-size:13px;padding:16px">Error: '+esc(e.message)+'</p>';});
}
function applyHF(){var q=($i('hs')?$i('hs').value:'').toLowerCase();var fv=document.querySelector('#hf .fb.on');var vt=fv?fv.getAttribute('data-v'):'';showHL((window._ha||[]).filter(function(a){return(!q||(a.producto||'').toLowerCase().indexOf(q)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(q)!==-1)&&(!vt||a.veredicto_global===vt)}));}
function showHL(data){
  var el=$i('hl');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin auditorias</p>';return;}
  el.innerHTML=data.map(function(a){
    return '<div class="li" style="margin-bottom:6px"><div style="min-width:30px">'+sem(a.veredicto_global,'s',false)+'</div>'+
    '<div class="li-b" onclick="nav(\'hist/'+esc(a.id)+'\')"><div class="li-t">'+esc(a.producto||'Sin nombre')+'</div>'+
    '<div class="li-s">'+esc(a.proveedor_nombre)+' / '+(a.fecha?new Date(a.fecha).toLocaleDateString('es-BO'):'')+'</div></div>'+
    '<button class="btn bs bsm" onclick="event.stopPropagation();dupA(\''+esc(a.id)+'\')">Dup</button></div>';
  }).join('');
}
function dupA(id){
  var a=DB.find(window._ha||[],id);if(!a){toast('No encontrada','err');return;}
  AU={prov:{id:a.proveedor_id,nombre:a.proveedor_nombre},prod:a.producto,m1:a.m1_texto||'',m2:a.m2_texto||'',m3:a.m3_texto||'',
    m4:{m4_catalogo_repuestos:a.m4_catalogo_repuestos==='true',m4_precios_unitarios:a.m4_precios_unitarios==='true',m4_garantia_escrita:a.m4_garantia_escrita==='true',m4_procedimiento_reclamacion:a.m4_procedimiento_reclamacion==='true'},
    m5:{m5_cfg:a.m5_cfg==='true',m5_apostillado:a.m5_apostillado==='true',m5_manual_espanol:a.m5_manual_espanol==='true'}};
  RES=null;toast('Datos cargados','ok');setTimeout(function(){nav('aud/1');},400);
}

function vHistDet(id){
  render('Detalle','<div id="detc">'+ld()+'</div>','hist');
  DB.leer('Auditorias').then(function(data){
    var a=DB.find(data,id);if(!a){$i('detc').innerHTML='<p style="text-align:center;color:var(--red);padding:40px">No encontrada</p>';return;}
    var h='<div style="text-align:center;margin-bottom:18px">'+sem(a.veredicto_global,'l')+'<h1 class="st-h" style="margin-top:12px">'+esc(a.producto)+'</h1><p style="font-size:13px;color:var(--mut)">'+esc(a.proveedor_nombre)+'</p><p class="fm" style="font-size:11px;color:var(--dim)">'+(a.fecha?new Date(a.fecha).toLocaleString('es-BO'):'')+'</p></div>';
    if(a.resumen)h+='<div class="cd cd-'+a.veredicto_global.toLowerCase()+'" style="margin-bottom:14px"><p style="font-size:13px;line-height:1.7">'+esc(a.resumen)+'</p></div>';
    for(var i=1;i<=5;i++){var v=a['m'+i+'_veredicto'],f=a['m'+i+'_hallazgos'];if(!v)continue;h+='<div class="cd cd-'+v.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(v,'s',false)+'<div><span class="fd" style="font-weight:700;font-size:13px">'+esc(MOD[i].n)+'</span><p style="font-size:13px;color:var(--mut);margin-top:4px">'+esc(f||'')+'</p></div></div></div>';}
    h+='<div class="g2" style="margin-top:14px"><button class="btn bp bw" onclick="dupA(\''+esc(a.id)+'\')">Duplicar y Re-auditar</button><button class="btn bs bw" onclick="window.print()">Imprimir</button></div>';
    $i('detc').innerHTML=h;
  });
}

function vProv(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Proveedores</h1><p class="st-sub" id="pc">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'prov/new\')">+ Nuevo</button></div>'+
    '<input class="ip" id="prs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true],['Activo','Activos'],['Evaluacion','En evaluacion'],['Descartado','Descartados']],'pf')+'<div id="pl2">'+ld()+'</div>';
  render('Proveedores',h,'home');
  DB.leer('Proveedores').then(function(data){$i('pc').textContent=data.length+' proveedores';window._pv=data;showPVL(data);$i('prs').oninput=function(){applyPF();};initF('pf',function(){applyPF();});})
    .catch(function(e){$i('pl2').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function applyPF(){var q=($i('prs')?$i('prs').value:'').toLowerCase();var fv=document.querySelector('#pf .fb.on');var st=fv?fv.getAttribute('data-v'):'';showPVL((window._pv||[]).filter(function(p){return(!q||(p.nombre||'').toLowerCase().indexOf(q)!==-1)&&(!st||p.estado===st)}));}
function showPVL(data){
  var el=$i('pl2');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin proveedores</p>';return;}
  var ec={Activo:'bg-gn',Evaluacion:'bg-yw',Descartado:'bg-rd'};
  el.innerHTML=data.map(function(p){
    return '<div class="li" style="margin-bottom:6px" onclick="nav(\'prov/'+esc(p.id)+'\')">'+
    '<div style="width:34px;height:34px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;flex-shrink:0;color:var(--gold)">P</div>'+
    '<div class="li-b"><div class="li-t">'+esc(p.nombre)+'</div><div class="li-s">'+esc([p.ciudad,p.email].filter(Boolean).join(' / '))+'</div></div>'+
    '<span class="bg '+(ec[p.estado]||'bg-g')+'">'+esc(p.estado||'?')+'</span></div>';
  }).join('');
}

function vProvF(id){
  var isN=!id,f={nombre:'',email:'',telefono:'',pais:'China',ciudad:'',tipo:'',certificaciones:'',estado:'Evaluacion',notas:'',fecha_creacion:''};
  function draw(d){
    var h='<h1 class="st-h">'+(isN?'Nuevo':'Editar')+' Proveedor</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      ff('nombre','Nombre *',d.nombre)+'<div class="g2">'+ff('pais','Pais',d.pais)+ff('ciudad','Ciudad',d.ciudad)+'</div>'+
      '<div class="g2">'+ff('email','Email',d.email)+ff('telefono','Telefono',d.telefono)+'</div>'+
      '<div><label class="lb">TIPO</label><select class="ip" id="f-tipo"><option value="">Seleccionar...</option>'+
      ['Fabricante','Trading','Distribuidor','Otro'].map(function(t){return '<option'+(d.tipo===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
      '<div><label class="lb">ESTADO</label><select class="ip" id="f-estado">'+
      ['Evaluacion','Activo','Descartado'].map(function(t){return '<option'+(d.estado===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
      ff('certificaciones','Certificaciones',d.certificaciones)+'<div><label class="lb">NOTAS</label><textarea class="ip" id="f-notas" style="min-height:80px">'+esc(d.notas)+'</textarea></div>'+
      '<button class="btn bp bw" id="bpv" onclick="doSaveP(\''+(isN?'':esc(id))+'\',\''+esc(d.fecha_creacion||'')+'\')">'+(isN?'Crear':'Actualizar')+' Proveedor</button></div>';
    render(isN?'Nuevo Proveedor':'Editar Proveedor',h,'prov');
  }
  if(isN)draw(f);else{DB.leer('Proveedores').then(function(data){var found=DB.find(data,id);draw(found||f);}).catch(function(){draw(f);});}
}
function doSaveP(oid,ofc){
  var d={nombre:gf('nombre'),email:gf('email'),telefono:gf('telefono'),pais:gf('pais'),ciudad:gf('ciudad'),tipo:gf('tipo'),certificaciones:gf('certificaciones'),estado:gf('estado'),notas:gf('notas')};
  if(!d.nombre){toast('El nombre es obligatorio','err');return;}
  var btn=$i('bpv');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?(d.id=oid,d.fecha_creacion=ofc,DB.actualizar('Proveedores',oid,d)):(d.id=nuevoId(),d.fecha_creacion=new Date().toISOString(),DB.escribir('Proveedores',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','ok');nav('prov');}).catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;}});
}

function vLegal(){
  var cats=['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'];
  var ci={'Regulaciones UE':'[UE]','Regulaciones Bolivia':'[BO]','Normas Tecnicas':'[TEC]','Procedimientos':'[DOC]'};
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Base Legal</h1><p class="st-sub" id="lc2">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'legal/new\')">+ Nuevo</button></div>'+
    '<input class="ip" id="lgs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true]].concat(cats.map(function(c){return [c,c];})),'lgf')+'<div id="lgl">'+ld()+'</div>';
  render('Base Legal',h,'home');
  DB.leer('Base_Legal').then(function(data){$i('lc2').textContent=data.length+' documentos';window._ll=data;showLL(data,ci);$i('lgs').oninput=function(){applyLF(ci);};initF('lgf',function(){applyLF(ci);});})
    .catch(function(e){$i('lgl').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function applyLF(ci){var q=($i('lgs')?$i('lgs').value:'').toLowerCase();var fv=document.querySelector('#lgf .fb.on');var ct=fv?fv.getAttribute('data-v'):'';showLL((window._ll||[]).filter(function(d){return(!q||(d.titulo||'').toLowerCase().indexOf(q)!==-1||(d.descripcion||'').toLowerCase().indexOf(q)!==-1)&&(!ct||d.categoria===ct)}),ci);}
function showLL(data,ci){
  var el=$i('lgl');if(!el)return;
  if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin documentos</p>';return;}
  el.innerHTML=data.map(function(d){
    var ic=ci[d.categoria]||'[DOC]';
    return '<div class="cd" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+
    '<span style="font-size:14px;font-weight:bold;color:var(--gold);flex-shrink:0">'+ic+'</span>'+
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
      ['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'].map(function(c){return '<option'+(d.categoria===c?' selected':'')+'>'+c+'</option>';}).join('')+'</select></div>'+
      ff('titulo','Titulo *',d.titulo)+'<div><label class="lb">DESCRIPCION</label><textarea class="ip" id="f-descripcion" style="min-height:80px">'+esc(d.descripcion)+'</textarea></div>'+
      ff('enlace_oficial','Enlace Oficial',d.enlace_oficial)+
      '<button class="btn bp bw" id="blg" onclick="doSaveL(\''+(isN?'':esc(id))+'\',\''+esc(d.fecha_actualizacion||'')+'\')">'+(isN?'Crear':'Actualizar')+'</button></div>';
    render(isN?'Nuevo Documento':'Editar Documento',h,'legal');
  }
  if(isN)draw(f);else{DB.leer('Base_Legal').then(function(data){var found=DB.find(data,id);draw(found||f);}).catch(function(){draw(f);});}
}
function doSaveL(oid,ofu){
  var d={categoria:gf('categoria'),titulo:gf('titulo'),descripcion:gf('descripcion'),enlace_oficial:gf('enlace_oficial')};
  if(!d.titulo){toast('Titulo obligatorio','err');return;}
  var btn=$i('blg');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?(d.id=oid,d.fecha_actualizacion=ofu,DB.actualizar('Base_Legal',oid,d)):(d.id=nuevoId(),d.fecha_actualizacion=new Date().toISOString(),DB.escribir('Base_Legal',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','ok');nav('legal');}).catch(function(e){toast('Error: '+e.message,'err');if(btn){btn.disabled=false;}});
}

function vWA(){
  window._wr=null;window._we=null;
  render('WhatsApp','<div id="wac">'+ld()+'</div>','home');
  DB.leer('Auditorias').then(function(data){window._wa=data.reverse();waS1();}).catch(function(e){$i('wac').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+esc(e.message)+'</p>';});
}
function waRP(paso){
  var h='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h1 class="st-h">Generador de Propuesta</h1></div><p class="st-sub">Comparativo para WhatsApp</p><div class="sts">';
  for(var i=1;i<=3;i++){h+='<div class="st-d '+(paso>i?'dn':paso===i?'act':'pd')+'">'+(paso>i?'OK':i)+'</div>';if(i<3)h+='<div class="st-l '+(paso>i?'dn':'')+'"></div>';}
  h+='</div>';return h;
}
function waS1(){
  $i('wac').innerHTML=waRP(1)+'<h3 class="sl">Paso 1: Opcion RECOMENDADA</h3><input class="ip" id="ws" placeholder="Buscar..." style="margin-bottom:8px"><div id="wl"></div>';
  waLst(window._wa,'',false);$i('ws').oninput=function(){waLst(window._wa,this.value,false);};
}
function waS2(){
  var rec=window._wr;
  $i('wac').innerHTML=waRP(2)+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 class="sl">Paso 2: Opcion ECONOMICA</h3><button class="btn bs bsm" onclick="window._wr=null;waS1()">Cambiar</button></div>'+
    '<div class="cd" style="border-color:var(--gold-dim);margin-bottom:10px"><span class="bg bg-g">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:14px;margin-top:4px">'+esc(rec.producto)+'</div></div>'+
    '<input class="ip" id="ws" placeholder="Buscar..." style="margin-bottom:8px"><div id="wl"></div>';
  var filt=(window._wa||[]).filter(function(a){return a.id!==rec.id;});
  waLst(filt,'',true);$i('ws').oninput=function(){waLst(filt,this.value,true);};
}
function waS3(){
  var rec=window._wr,eco=window._we,txt=genWA(rec,eco);
  $i('wac').innerHTML=waRP(3)+
    '<div class="g2" style="margin-bottom:10px"><div class="cd" style="border-color:var(--grn)"><span class="bg bg-gn">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px">'+esc(rec.producto)+'</div></div><div class="cd" style="border-color:var(--ylw)"><span class="bg bg-yw">ECONOMICA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px">'+esc(eco.producto)+'</div></div></div>'+
    '<div class="wa" id="wpre">'+esc(txt)+'</div>'+
    '<div class="g2" style="margin-top:10px"><button class="btn bp bw" onclick="copiarWA()">Copiar al Portapapeles</button><button class="btn bs bw" onclick="window.open(\'https://wa.me/?text=\'+encodeURIComponent(document.getElementById(\'wpre\').textContent),\'_blank\')">Abrir WhatsApp</button></div>'+
    '<button class="btn bs bw" style="margin-top:8px" onclick="window._wr=null;window._we=null;vWA()">Nuevo comparativo</button>';
}
function waLst(data,q,isE){
  q=(q||'').toLowerCase();var f=data.filter(function(a){return!q||(a.producto||'').toLowerCase().indexOf(q)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(q)!==-1;});
  var el=$i('wl');if(!el)return;
  if(!f.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin auditorias</p>';return;}
  el.innerHTML=f.map(function(a){
    return '<div class="li" style="margin-bottom:6px" onclick="waPick('+JSON.stringify(isE)+',\''+esc(a.id)+'\')">'+
    '<div style="min-width:30px">'+sem(a.veredicto_global,'s',false)+'</div>'+
    '<div class="li-b"><div class="li-t">'+esc(a.producto)+'</div><div class="li-s">'+esc(a.proveedor_nombre)+'</div></div></div>';
  }).join('');
}
function waPick(isE,id){var a=DB.find(window._wa||[],id);if(!a)return;if(!isE){window._wr=a;window._we=null;waS2();}else{window._we=a;waS3();}}
function copiarWA(){navigator.clipboard.writeText(document.getElementById('wpre').textContent).then(function(){toast('Copiado','ok');}).catch(function(){toast('Selecciona y copia manualmente','err');});}

function vUsers(){
  render('Usuarios','<div id="ucon">'+ld()+'</div>','home');
  DB.leer('Usuarios',true).then(function(uu){
    var h='<h1 class="st-h">Gestion de Usuarios</h1><p class="st-sub">'+uu.length+' usuarios</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">';
    uu.forEach(function(u){
      var nombre=u.Nombre||'',ac=(u.Activo||'').toLowerCase();
      var activo=(ac==='si'||ac==='s');
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

document.addEventListener('DOMContentLoaded',function(){
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(function(){});}
  ruta();
});