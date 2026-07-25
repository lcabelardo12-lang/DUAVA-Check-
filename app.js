'use strict';
/* DUAVA CHECK - FASE 1 - Tema Claro - Acentos seguros */

var URL_HOJA = 'PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT';

function $(s){return document.querySelector(s)}
function $i(s){return document.getElementById(s)}
function nuevoId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,8)}
function limpiar(s){if(s==null)return '';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML}

function toast(m,t){
  t=t||'exito';var d=document.createElement('div');
  d.className='tt tt-'+(t==='exito'?'s':t==='error'?'e':'w');
  d.textContent=m;document.body.appendChild(d);
  requestAnimationFrame(function(){d.classList.add('show')});
  setTimeout(function(){d.classList.remove('show');setTimeout(function(){d.remove()},300)},3500);
}

var Memoria={_d:{},obtener:function(k){return this._d[k]||null},guardar:function(k,v){this._d[k]=v},limpiar:function(k){delete this._d[k]}};

var Hoja={
  leer:function(pestana,forzar){
    if(!forzar){var c=Memoria.obtener(pestana);if(c)return Promise.resolve(c)}
    return fetch(URL_HOJA+'?action=read&sheet='+encodeURIComponent(pestana))
      .then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Memoria.guardar(pestana,d);return d});
  },
  escribir:function(pestana,datos){
    var url=URL_HOJA+'?action=write&sheet='+encodeURIComponent(pestana)+'&data='+encodeURIComponent(JSON.stringify(datos));
    return fetch(url).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Memoria.limpiar(pestana);return d});
  },
  actualizar:function(pestana,id,datos){
    var url=URL_HOJA+'?action=update&sheet='+encodeURIComponent(pestana)+'&id='+encodeURIComponent(id)+'&data='+encodeURIComponent(JSON.stringify(datos));
    return fetch(url).then(function(r){return r.json()}).then(function(d){if(d.error)throw new Error(d.error);Memoria.limpiar(pestana);return d});
  },
  buscarPorId:function(lista,id){for(var i=0;i<lista.length;i++)if(lista[i].id===id)return lista[i];return null}
};

var Sesion={
  obtener:function(){try{return JSON.parse(sessionStorage.getItem('dc_usuario'))}catch(e){return null}},
  guardar:function(u){sessionStorage.setItem('dc_usuario',JSON.stringify(u))},
  cerrar:function(){sessionStorage.removeItem('dc_usuario')},
  activa:function(){return!!this.obtener()}
};

var Modulos={
  1:{nombre:'Certificaci\u00f3n Europea (CE/MDR)',desc:'El Filtro Cr\u00edtico \u2014 Poder de Veto',veto:true,tp:'texto',
     ph:'Pega aqu\u00ed el texto del certificado CE, MDR o ficha del producto...',ic:'\ud83d\udee1\ufe0f',
     lk:[{t:'NANDO (UE)',u:'https://webgate.ec.europa.eu/single-market-compliance-space/#/notified-bodies'},{t:'CertiPedia',u:'https://www.certipedia.com/'},{t:'T\u00dcV S\u00dcD',u:'https://www.tuvsud.com/en/industries/healthcare-and-medical-devices'}]},
  2:{nombre:'Identidad Corporativa',desc:'Fabricante vs. Intermediario',veto:false,tp:'texto',
     ph:'Pega texto de la Licencia Comercial o nombre de empresa...',ic:'\ud83c\udfe2',
     lk:[{t:'Gu\u00eda Licencias Chinas',u:'https://www.china-briefing.com/news/how-to-read-a-china-business-license/'},{t:'Tianyancha',u:'https://www.tianyancha.com/'}]},
  3:{nombre:'Especificaciones T\u00e9cnicas',desc:'An\u00e1lisis Forense de Datasheet',veto:false,tp:'texto',
     ph:'Pega ficha t\u00e9cnica: voltaje, RPM, torque, IP, normativas...',ic:'\u2699\ufe0f',
     lk:[{t:'IEC 60601',u:'https://webstore.iec.ch/en/publication/25652'}]},
  4:{nombre:'Cadena de Suministro',desc:'Repuestos y Garant\u00eda',veto:false,tp:'chk',ic:'\ud83d\ude9a',
     ck:[{id:'m4_catalogo_repuestos',lb:'\u00bfCat\u00e1logo de Repuestos?',sub:'Lista de piezas con n\u00fameros de parte.'},
         {id:'m4_precios_unitarios',lb:'\u00bfPrecios unitarios?',sub:'Precio claro por cada repuesto.'},
         {id:'m4_garantia_escrita',lb:'\u00bfGarant\u00eda escrita?',sub:'Documento formal, no verbal.'},
         {id:'m4_procedimiento_reclamacion',lb:'\u00bfProcedimiento de reclamaci\u00f3n?',sub:'Pasos, tiempos, cobertura definidos.'}],lk:[]},
  5:{nombre:'Viabilidad Bolivia (AGEMED)',desc:'Requisitos Regulatorios',veto:false,tp:'chk',ic:'\u2696\ufe0f',
     ck:[{id:'m5_cfg',lb:'\u00bfPuede emitir CFG?',sub:'Certificado de Libre Venta.'},
         {id:'m5_apostillado',lb:'\u00bfCFG apostillado?',sub:'Apostilla de La Haya.'},
         {id:'m5_manual_espanol',lb:'\u00bfManual en espa\u00f1ol?',sub:'Traducci\u00f3n oficial.'}],
     lk:[{t:'AGEMED',u:'https://www.gob.bo/agaemed'}]}
};

function analizarM1(t){
  var r={mdr:/MDR\s*2017\/745|MDD\s*93\/42|Medical Device (Regulation|Directive)/i.test(t),
         nb:/(?:CE|NB|Notified\s*Body)\s*[^\d]{0,3}\d{4}\b/i.test(t),
         ce:/\bCE\b|marca\s*CE|marcado\s*CE/i.test(t),
         fk:/\bce\s+certified\b/i.test(t)&&!/\bCE\b/.test(t)};
  var v,f;
  if(r.mdr&&r.nb){v='GREEN';f='Certificaci\u00f3n MDR/MDD v\u00e1lida con organismo notificado. Pasa filtro cr\u00edtico.';}
  else if(r.mdr&&!r.nb){v='YELLOW';f='Referencia MDR/MDD pero sin n\u00famero de organismo. Verificar en NANDO.';}
  else if(r.ce&&!r.mdr){v='YELLOW';f='CE sin referencia a MDR/MDD. Posible certificaci\u00f3n obsoleta.';}
  else if(r.fk){v='RED';f='Posible "ce" fraudulento (min\u00fasculas, sin organismo). Alto riesgo.';}
  else{v='RED';f='Sin certificaci\u00f3n CE/MDR/MDD. NO puede importarse sin certificaci\u00f3n europea v\u00e1lida.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Referencia MDR/MDD',pasa:r.mdr},{texto:'N\u00famero de organismo notificado',pasa:r.nb},{texto:'Menci\u00f3n CE',pasa:r.ce}]};
}

function analizarM2(t){
  var m=/manufactur|production|factory|producer/i.test(t);
  var tr=/trading|wholesale|import.*(and|&).*export/i.test(t);
  var v,f;
  if(m){v='GREEN';f='Indicadores claros de fabricante. Mayor probabilidad de ser fabricante real.';}
  else if(tr&&!m){v='YELLOW';f='Solo indicadores de intermediario. Incrementa precio, reduce soporte.';}
  else{v='YELLOW';f='Sin indicadores claros. Solicitar licencia comercial completa.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Fabricante',pasa:m},{texto:'Intermediario',pasa:tr}]};
}

function analizarM3(t){
  var iec=/IEC\s*60601|EN\s*60601|60601-1/i.test(t);
  var ip=/IP\s*[X]?\d{1,2}\b|IP6[5-9]|IPX[5-9]|sumergible|waterproof/i.test(t);
  var tech=/\d+\s*(?:RPM|rpm|N[·.]cm|W(?:att)?|V(?:olt)?|kPa|Hz|mA)/i.test(t);
  var vague=/high\s*quality|premium|best\s*motor|superior/i.test(t)&&!tech;
  var v,f;
  if(iec&&ip){v='GREEN';f='IEC 60601-1 y clasificaci\u00f3n IP presentes. Especificaciones adecuadas.';}
  else if(iec||ip){v='YELLOW';var ms=[];if(!iec)ms.push('IEC 60601');if(!ip)ms.push('IP');f='Ficha parcial: falta '+ms.join(' y ')+'.';}
  else if(vague){v='RED';f='Especificaciones vagas sin datos ni normativas.';}
  else{v='RED';f='Sin IEC 60601, IP ni datos t\u00e9cnicos cuantitativos.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'IEC 60601-1',pasa:iec},{texto:'Clasificaci\u00f3n IP',pasa:ip},{texto:'Datos t\u00e9cnicos',pasa:tech}]};
}

function analizarM4(c){
  var a=c.m4_catalogo_repuestos,b=c.m4_precios_unitarios,gc=c.m4_garantia_escrita,pr=c.m4_procedimiento_reclamacion;
  var v,f;
  if(a&&b&&gc&&pr){v='GREEN';f='Cat\u00e1logo con precios, garant\u00eda y procedimiento. Suministro documentado.';}
  else if(gc&&pr&&(a||b)){v='YELLOW';f='Garant\u00eda documentada pero cat\u00e1logo incompleto.';}
  else if((a||b)&&!gc){v='YELLOW';f='Repuestos parciales sin garant\u00eda formal.';}
  else if(gc&&!pr){v='YELLOW';f='Garant\u00eda sin procedimiento escrito.';}
  else{v='RED';f='Sin cat\u00e1logo, precios ni garant\u00eda. Alto riesgo post-venta.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Cat\u00e1logo de Repuestos',pasa:a},{texto:'Precios unitarios',pasa:b},{texto:'Garant\u00eda escrita',pasa:gc},{texto:'Procedimiento reclamaci\u00f3n',pasa:pr}]};
}

function analizarM5(c){
  var cfg=c.m5_cfg,apo=c.m5_apostillado,man=c.m5_manual_espanol;
  var v,f;
  if(cfg&&apo&&man){v='GREEN';f='CFG apostillado y manual en espa\u00f1ol. Cumple AGEMED.';}
  else if(cfg&&apo&&!man){v='YELLOW';f='CFG apostillado pero sin manual en espa\u00f1ol.';}
  else if(man&&(!cfg||!apo)){v='YELLOW';f='Manual en espa\u00f1ol pero falta CFG o apostillado.';}
  else if(cfg&&!apo){v='YELLOW';f='CFG sin apostillado.';}
  else{v='RED';f='Sin CFG apostillado ni manual en espa\u00f1ol. NO registra ante AGEMED.';}
  return{veredicto:v,hallazgos:f,detalles:[{texto:'Free Sales Certificate',pasa:cfg},{texto:'Apostillado',pasa:apo},{texto:'Manual en espa\u00f1ol',pasa:man}]};
}

function ejecutarAuditoria(d){
  var m={};
  m[1]=d.m1_texto.trim()?analizarM1(d.m1_texto):{veredicto:'RED',hallazgos:'Sin informaci\u00f3n.',detalles:[]};
  m[2]=d.m2_texto.trim()?analizarM2(d.m2_texto):{veredicto:'RED',hallazgos:'Sin informaci\u00f3n.',detalles:[]};
  m[3]=d.m3_texto.trim()?analizarM3(d.m3_texto):{veredicto:'RED',hallazgos:'Sin informaci\u00f3n.',detalles:[]};
  var c4=d.m4||{};m[4]=Object.values(c4).some(function(v){return v})?analizarM4(c4):{veredicto:'RED',hallazgos:'Sin verificaci\u00f3n.',detalles:[]};
  var c5=d.m5||{};m[5]=Object.values(c5).some(function(v){return v})?analizarM5(c5):{veredicto:'RED',hallazgos:'Sin verificaci\u00f3n.',detalles:[]};
  var gv='GREEN',peso={GREEN:0,YELLOW:1,RED:2};
  if(m[1].veredicto==='RED')gv='RED';else for(var i=1;i<=5;i++)if(peso[m[i].veredicto]>peso[gv])gv=m[i].veredicto;
  var rs=[],ys=[];
  for(var i=1;i<=5;i++){if(m[i].veredicto==='RED')rs.push(Modulos[i].nombre);else if(m[i].veredicto==='YELLOW')ys.push(Modulos[i].nombre);}
  var sum='';
  if(gv==='RED')sum=m[1].veredicto==='RED'?'RECHAZADA: Sin CE/MDR. Riesgo legal inaceptable.':'RIESGOS CR\u00cdTICOS: '+rs.length+' m\u00f3dulo(s) en rojo ('+rs.join(', ')+').';
  else if(gv==='YELLOW')sum='CON OBSERVACIONES: '+ys.length+' m\u00f3dulo(s) con advertencias ('+ys.join(', ')+').';
  else sum='APROBADA: Todos los m\u00f3dulos cumplen. Procede con negociaci\u00f3n.';
  return{veredicto_global:gv,resumen:sum,resultados:m,score:{aprobados:5-rs.length-ys.length,observaciones:ys.length,rechazados:rs.length}};
}

function generarWhatsApp(rec,eco){
  var ve={GREEN:'\u2705',YELLOW:'\u26a0\ufe0f',RED:'\u274c'};
  var ms={1:'Certificaci\u00f3n CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garant\u00eda',5:'Legalidad AGEMED'};
  var t='\ud83d\udcca *COMPARATIVO DE EQUIPOS M\u00c9DICOS*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n';
  t+='\ud83c\udfe5 *RECOMENDADA*\n\ud83d\udce6 '+limpiar(rec.producto)+'\n\ud83c\udfed '+limpiar(rec.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[rec['m'+i+'_veredicto']]+' *'+ms[i]+'*\n';
  t+='\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n\ud83d\udcb0 *ECON\u00d3MICA*\n\ud83d\udce6 '+limpiar(eco.producto)+'\n\ud83c\udfed '+limpiar(eco.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[eco['m'+i+'_veredicto']]+' *'+ms[i]+'*\n';
  t+='\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n\ud83d\udca1 *RECOMENDACI\u00d3N*\nSe recomienda '+limpiar(rec.producto)+'. Garantiza certificaci\u00f3n v\u00e1lida y cumplimiento AGEMED.\n\n_Duava Check \u2014 Auditor\u00eda Forense_';
  return t;
}

function nav(p){location.hash='#/'+p}
function getR(){return location.hash.replace('#/','')||'login'}
window.addEventListener('hashchange',ruta);
function ruta(){
  if(URL_HOJA.indexOf('PEGA_AQUI')!==-1){mostrarConfig();return;}
  var r=getR();
  if(r==='login')return vLogin();
  if(!Sesion.activa())return nav('login');
  if(r==='home'||r==='')return vHome();
  if(r==='auditoria/nueva')return vNueva();
  if(/^auditoria\/\d$/.test(r))return vMod(parseInt(r.split('/')[1]));
  if(r==='resultados')return vResultados();
  if(r==='historial')return vHistorial();
  if(/^historial\/.+/.test(r))return vHistDet(r.split('/')[1]);
  if(r==='proveedores')return vProveedores();
  if(r==='proveedor/nuevo')return vProvForm(null);
  if(/^proveedor\/.+/.test(r))return vProvForm(r.split('/')[1]);
  if(r==='legal')return vLegal();
  if(r==='legal/nuevo')return vLegForm(null);
  if(/^legal\/.+/.test(r))return vLegForm(r.split('/')[1]);
  if(r==='whatsapp')return vWA();
  if(r==='usuarios')return vUsuarios();
  nav('home');
}

var AU={prov:null,prod:'',m1:'',m2:'',m3:'',m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}};
var RES=null;
function reiniciar(){AU={prov:null,prod:'',m1:'',m2:'',m3:'',m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}};RES=null;}

function renderizar(tit,cont,volver){
  var bv=volver?'<button onclick="nav(\''+volver+'\')" style="background:none;border:none;color:#6b7280;font-size:20px;cursor:pointer;padding:8px 0;margin-bottom:8px;display:inline-block">\u2190 Volver</button>':'';
  var u=Sesion.obtener();
  var barra='<div style="position:fixed;bottom:0;left:0;right:0;background:#ffffff;border-top:1px solid #d1d5db;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;z-index:50;max-width:720px;margin:0 auto;font-family:Syne,sans-serif">'+
    '<span style="font-size:12px;color:#6b7280">\ud83d\udc64 '+limpiar(u?u.nombre:'')+'</span>'+
    '<span id="sincon" style="font-size:11px;color:#ca8a04;display:'+(navigator.onLine?'none':'inline')+'">\u26a0 Sin conexi\u00f3n</span>'+
    '<button onclick="Sesion.cerrar();nav(\'login\')" style="background:none;border:1px solid #d1d5db;color:#dc2626;font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:Syne,sans-serif">Salir</button></div>';
  $i('R').innerHTML='<div style="padding:18px 16px 70px;animation:fadeIn .3s ease">'+bv+cont+'</div>'+barra;
}

function sem(v,sz,lbl){
  sz=sz||'n';var ic={GREEN:'\u2713',YELLOW:'\u26a0',RED:'\u2717'},cl={GREEN:'sm-g',YELLOW:'sm-y',RED:'sm-r'},lb={GREEN:'APROBADO',YELLOW:'CON OBSERVACIONES',RED:'RECHAZADO'};
  return'<div class="sm-w '+cl[v]+'"><div class="sm-c '+sz+'">'+(ic[v]||'?')+'</div>'+(lbl!==false?'<span class="sm-t">'+(lb[v]||'')+'</span>':'')+'</div>';
}
function ld(m){return'<div class="ld"><div class="spn"></div><p style="font-size:13px;color:#6b7280">'+(m||'Cargando...')+'</p></div>';}
function refL(lk){if(!lk||!lk.length)return'';var id='en_'+nuevoId();return'<div class="ch" onclick="$i(\''+id+'\').classList.toggle(\'open\')">Recursos de referencia</div><div id="'+id+'" class="cb">'+lk.map(function(e){return'<a class="rl" href="'+e.u+'" target="_blank" rel="noopener">\ud83d\udd17 '+limpiar(e.t)+'</a>'}).join('')+'</div>';}
function filtH(arr,wid){return'<div class="fs" id="'+wid+'">'+arr.map(function(a){return'<button class="fb'+(a[2]?' on':'')+'" data-v="'+a[0]+'">'+a[1]+'</button>'}).join('')+'</div>';}
function initF(wid,cb){var w=$i(wid);if(!w)return;w.onclick=function(e){var b=e.target.closest('.fb');if(!b)return;w.querySelectorAll('.fb').forEach(function(x){x.classList.remove('on')});b.classList.add('on');cb(b.getAttribute('data-v'))};}
function mostrarConfig(){$i('R').innerHTML='<div class="err-full"><div><h2>\u2699\ufe0f Configuraci\u00f3n requerida</h2><p>Abre <code>app.js</code> y busca la l\u00ednea <code>URL_HOJA</code>. Reemplaza <code>PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT</code> con la URL de tu Google Apps Script.</p></div></div>';}
function ff(n,lb,v){return'<div><label class="lb">'+lb+'</label><input class="ip" id="f-'+n+'" value="'+limpiar(v||'')+'"></div>';}
function gf(n){var el=$i('f-'+n);return el?el.value.trim():'';}

function vLogin(){
  $i('R').innerHTML='<div class="lg-w"><div class="lg-b"><div class="lg-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>'+
    '<h1 class="lg-h">Duava Check</h1><p class="lg-sub">Auditor\u00eda Forense de Proveedores M\u00e9dicos</p><p style="font-size:11px;color:#9ca3af;margin-bottom:24px;font-family:DM Mono,monospace">v1.0</p><div id="le"></div>'+
    '<div style="text-align:left;margin-bottom:12px"><label class="lb">NOMBRE</label><input class="ip" id="ln" placeholder="Tu nombre" autocomplete="username"></div>'+
    '<div style="text-align:left;margin-bottom:18px"><label class="lb">CLAVE</label><input class="ip" id="lc" type="password" placeholder="Tu clave" autocomplete="current-password"></div>'+
    '<button class="btn bp bw" id="lbtn" onclick="doLogin()">Iniciar Sesi\u00f3n</button>'+
    '<p style="font-size:11px;color:#9ca3af;margin-top:14px">Acceso restringido a usuarios autorizados</p></div></div>';
  $i('lc').onkeydown=function(e){if(e.key==='Enter')doLogin()};$i('ln').focus();
}

function doLogin(){
  var n=$i('ln').value.trim(),c=$i('lc').value;
  if(!n||!c){lgErr('Completa ambos campos');return;}
  $i('lbtn').disabled=true;$i('lbtn').textContent='Conectando...';
  Hoja.leer('Usuarios').then(function(usuarios){
    var f=null;for(var i=0;i<usuarios.length;i++)if(usuarios[i].Nombre===n&&usuarios[i].Clave===c){f=usuarios[i];break;}
    if(!f){lgErr('Nombre o clave incorrectos');resBtn();return;}
    var a=(f.Activo||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(a!=='si'&&a!=='s'){lgErr('Usuario inactivo. Contacta al administrador.');resBtn();return;}
    Sesion.guardar({nombre:f.Nombre});nav('home');
  }).catch(function(e){lgErr('Error de conexi\u00f3n: '+e.message+'. Verifica tu internet y la URL.');resBtn()});
}
function lgErr(m){$i('le').innerHTML='<div class="lg-err">'+limpiar(m)+'</div>';}
function resBtn(){$i('lbtn').disabled=false;$i('lbtn').textContent='Iniciar Sesi\u00f3n';}

function vHome(){
  var u=Sesion.obtener();
  var h='<div style="text-align:center;margin-bottom:6px"><img src="logo.png" alt="Logo Duava Check" style="max-width:150px;height:auto;margin-bottom:8px"></div>'+
    '<h2 style="font-family:Syne,sans-serif;font-weight:800;font-size:24px;text-align:center;margin-bottom:4px;color:#1a1a1a;letter-spacing:-.02em">Duava Check</h2>'+
    '<p style="font-size:13px;color:#6b7280;margin-bottom:18px;text-align:center">Bienvenido, <strong style="color:var(--gold)">'+limpiar(u?u.nombre:'')+'</strong></p>'+
    '<div class="cd cd-cl" onclick="nav(\'auditoria/nueva\')" style="margin-bottom:20px;border-color:var(--gold-dim)"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:26px">\ud83d\udd0d</span><div><div class="fd" style="font-weight:700;font-size:15px;color:#1a1a1a">Nueva Auditor\u00eda</div><div style="font-size:12px;color:#6b7280">Evaluar proveedor con los 5 Pilares</div></div></div></div>'+
    '<h3 class="sl" style="color:#1a1a1a;font-size:14px;margin-top:8px">Los 5 Pilares</h3><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
  for(var i=1;i<=5;i++){var m=Modulos[i];h+='<div class="cd" style="opacity:.7"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">'+m.ic+'</span><div><span class="fm" style="font-size:11px;color:var(--gold);background:var(--gold-bg);padding:1px 6px;border-radius:4px">M'+i+'</span> <span class="fd" style="font-weight:700;font-size:13px;color:#1a1a1a">'+limpiar(m.nombre)+'</span>'+(m.veto?' <span class="bg bg-rd">VETO</span>':'')+'</div></div></div>';}
  h+='</div><h3 class="sl" style="color:#1a1a1a;font-size:14px">Herramientas</h3><div class="g2">'+
    tc('\ud83d\udccb','Historial','Consultar auditor\u00edas','historial')+tc('\ud83d\udc65','Proveedores','Base de contactos','proveedores')+
    tc('\ud83d\udcd6','Base Legal','Regulaciones y normas','legal')+tc('\ud83d\udcac','WhatsApp','Comparativos','whatsapp')+
    tc('\ud83d\udc64','Usuarios','Gestionar accesos','usuarios')+'</div>';
  renderizar('Duava Check',h);
}
function tc(ic,t,s,p){return'<div class="cd cd-cl" onclick="nav(\''+p+'\')"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">'+ic+'</span><div><div class="fd" style="font-weight:700;font-size:13px;color:#1a1a1a">'+limpiar(t)+'</div><div style="font-size:11px;color:#6b7280">'+limpiar(s)+'</div></div></div></div>';}

function vNueva(){
  var h='<h1 class="st-h">Nueva Auditor\u00eda</h1><p class="st-sub">Selecciona proveedor y nombra el producto</p><label class="lb">PROVEEDOR</label>';
  if(AU.prov){
    h+='<div class="cd" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700;color:#1a1a1a">'+limpiar(AU.prov.nombre)+'</div><div style="font-size:12px;color:#6b7280">'+limpiar(AU.prov.ciudad||'')+'</div></div><button class="btn bs bsm" onclick="AU.prov=null;vNueva()">Cambiar</button></div></div>';
  }else{
    h+='<input class="ip" id="ps" placeholder="Buscar proveedor..." style="margin-bottom:8px"><div id="pl">'+ld()+'</div>'+
      '<button class="btn bs bw" style="margin-top:8px" onclick="var e=$i(\'qpf\');e.style.display=e.style.display===\'none\'?\'block\':\'none\''>+ Crear proveedor r\u00e1pido</button>'+
      '<div id="qpf" style="display:none;margin-top:8px"><input class="ip" id="qn" placeholder="Nombre de la empresa *" style="margin-bottom:6px"><input class="ip" id="qc" placeholder="Ciudad (ej: Shenzhen)" style="margin-bottom:6px"><button class="btn bp bw" onclick="mkProv()">Crear y seleccionar</button></div>';
  }
  h+='<div style="margin-top:16px"><label class="lb">PRODUCTO</label><input class="ip" id="ap" placeholder="Nombre del equipo o dispositivo m\u00e9dico" value="'+limpiar(AU.prod)+'"></div>'+
    '<button class="btn bp bw" style="margin-top:18px" onclick="startAud()">Comenzar Auditor\u00eda \u2192</button>';
  renderizar('Nueva Auditor\u00eda',h,'home');
  if(!AU.prov){
    Hoja.leer('Proveedores').then(function(d){showPL(d)}).catch(function(e){$i('pl').innerHTML='<p style="color:var(--red);font-size:13px;padding:12px">Error: '+limpiar(e.message)+'</p>'});
    var s=$i('ps');if(s)s.oninput=function(){var q=this.value.toLowerCase();Hoja.leer('Proveedores').then(function(d){showPL(d.filter(function(p){return(p.nombre||'').toLowerCase().indexOf(q)!==-1||(p.ciudad||'').toLowerCase().indexOf(q)!==-1}))})};
  }
  var p=$i('ap');if(p)p.oninput=function(){AU.prod=this.value};
}
function showPL(data){var el=$i('pl');if(!el)return;if(!data.length){el.innerHTML='<p style="color:#9ca3af;font-size:13px;padding:12px">Sin proveedores. Crea uno.</p>';return;}el.innerHTML=data.map(function(p){return'<div class="li" style="margin-bottom:6px" onclick="selP(\''+limpiar(p.id)+'\')"><div class="li-b"><div class="li-t">'+limpiar(p.nombre)+'</div><div class="li-s">'+limpiar([p.ciudad,p.tipo].filter(Boolean).join(' \u00b7 '))+'</div></div></div>'}).join('');}
function selP(id){Hoja.leer('Proveedores').then(function(d){var p=Hoja.buscarPorId(d,id);if(p)AU.prov={id:p.id,nombre:p.nombre,ciudad:p.ciudad||''};vNueva()});}
function mkProv(){var n=$i('qn').value.trim(),c=$i('qc').value.trim();if(!n){toast('Ingresa el nombre','error');return;}var p={id:nuevoId(),nombre:n,ciudad:c,pais:'China',tipo:'',estado:'Evaluacion',email:'',telefono:'',certificaciones:'',notas:'',fecha_creacion:new Date().toISOString()};Hoja.escribir('Proveedores',p).then(function(){selP(p.id);toast('Proveedor creado','exito')}).catch(function(e){toast('Error: '+e.message,'error')});}
function startAud(){if(!AU.prov){toast('Selecciona un proveedor','warning');return;}if(!AU.prod.trim()){toast('Ingresa el nombre del producto','warning');return;}nav('auditoria/1');}

function vMod(n){
  var m=Modulos[n],bk=n>1?'auditoria/'+(n-1):'auditoria/nueva';
  var c='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="fm bg bg-g">M\u00d3DULO '+n+'/5</span>'+(m.veto?'<span style="font-size:11px;color:var(--red)">\u26a0 Poder de veto</span>':'')+'</div>';
  c+='<h1 class="st-h">'+limpiar(m.nombre)+'</h1><p class="st-sub">'+limpiar(m.desc)+'</p>';
  if(m.tp==='texto'){var val=n===1?AU.m1:n===2?AU.m2:AU.m3;c+='<textarea class="ip" id="mt" placeholder="'+limpiar(m.ph)+'">'+limpiar(val)+'</textarea><p style="font-size:11px;color:#9ca3af;margin-top:4px" id="cc">'+val.length+' caracteres</p>';}
  if(m.tp==='chk'){var chk=n===4?AU.m4:AU.m5;m.ck.forEach(function(x){var on=chk[x.id]||false;c+='<div class="ci'+(on?' on':'')+'" id="ci_'+x.id+'" onclick="togC('+n+',\''+x.id+'\')"><input type="checkbox" '+(on?'checked':'')+' tabindex="-1"><div><div class="ci-l">'+limpiar(x.lb)+'</div><div class="ci-s">'+limpiar(x.sub)+'</div></div></div>'});}
  c+='<button class="btn bs bw" style="margin:14px 0 10px" onclick="prevM('+n+')">\ud83d\udd0d Vista previa del an\u00e1lisis</button><div id="mpv"></div>'+refL(m.lk);
  var nx=n<5?'auditoria/'+(n+1):'resultados';
  c+='<div class="mn">'+(n>1?'<button class="btn bs" onclick="nav(\'auditoria/'+(n-1)+'\')">\u2190 M'+(n-1)+'</button>':'')+'<button class="btn bp" onclick="nav(\''+nx+'\')">'+(n<5?'M'+(n+1)+' \u2192':'Ver Resultados \u2192')+'</button></div>';
  renderizar('M'+n+': '+m.nombre,c,bk);
  if(m.tp==='texto'){var ta=$i('mt');if(ta)ta.oninput=function(){saveT(n);var el=$i('cc');if(el)el.textContent=this.value.length+' caracteres'};}
}
function saveT(n){var ta=$i('mt');if(!ta)return;if(n===1)AU.m1=ta.value;else if(n===2)AU.m2=ta.value;else AU.m3=ta.value;}
function togC(n,id){var chk=n===4?AU.m4:AU.m5;chk[id]=!chk[id];var el=$i('ci_'+id);if(el){var cb=el.querySelector('input[type=checkbox]');if(cb)cb.checked=chk[id];el.classList.toggle('on',chk[id]);}}
function prevM(n){
  var d;if(n<=3){var t=n===1?AU.m1:n===2?AU.m2:AU.m3;if(!t.trim()){$i('mpv').innerHTML='<p style="color:#9ca3af;font-size:13px">Ingresa texto primero.</p>';return;}d=n===1?analizarM1(t):n===2?analizarM2(t):analizarM3(t);}
  else{var c=n===4?AU.m4:AU.m5;if(!Object.values(c).some(function(v){return v})){$i('mpv').innerHTML='<p style="color:#9ca3af;font-size:13px">Marca al menos un check.</p>';return;}d=n===4?analizarM4(c):analizarM5(c);}
  var cl=d.veredicto.toLowerCase();
  var h='<div class="pv pv-'+cl+'"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(d.veredicto,'s',false)+'<div><p style="font-size:13px;line-height:1.6;color:#1a1a1a">'+limpiar(d.hallazgos)+'</p>';
  if(d.detalles&&d.detalles.length){h+='<div style="margin-top:8px">';d.detalles.forEach(function(x){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:2px 0"><span style="color:'+(x.pasa?'var(--grn)':'#9ca3af')+'">'+(x.pasa?'\u2713':'\u2717')+'</span>'+limpiar(x.texto)+'</div>'});h+='</div>';}
  h+='</div></div></div>';$i('mpv').innerHTML=h;
}

function vResultados(){
  if(!RES)RES=ejecutarAuditoria({m1_texto:AU.m1,m2_texto:AU.m2,m3_texto:AU.m3,m4:AU.m4,m5:AU.m5});
  var r=RES;
  var h='<div style="text-align:center;margin-bottom:20px">'+sem(r.veredicto_global,'l')+'<h1 class="st-h" style="margin-top:14px">Resultado de Auditor\u00eda</h1>'+
    '<p style="font-size:13px;color:#6b7280">'+limpiar(AU.prod)+' \u2014 '+limpiar(AU.prov?AU.prov.nombre:'')+'</p>'+
    '<p class="fm" style="font-size:11px;color:#9ca3af;margin-top:4px">'+new Date().toLocaleString('es-BO')+'</p></div>';
  h+='<div class="cd cd-'+r.veredicto_global.toLowerCase()+'" style="margin-bottom:18px"><p style="font-size:13px;line-height:1.7;color:#1a1a1a">'+limpiar(r.resumen)+'</p>'+
    '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px;font-family:Syne,sans-serif"><span style="color:var(--grn)">'+r.score.aprobados+' aprobado(s)</span><span style="color:var(--ylw)">'+r.score.observaciones+' con obs.</span><span style="color:var(--red)">'+r.score.rechazados+' rechazado(s)</span></div></div>';
  for(var i=1;i<=5;i++){var mr=r.resultados[i];if(!mr)continue;h+='<div class="cd cd-'+mr.veredicto.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(mr.veredicto,'s',false)+'<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="fm" style="font-size:11px;color:#9ca3af">M'+i+'</span><span class="fd" style="font-weight:700;font-size:13px;color:#1a1a1a">'+limpiar(Modulos[i].nombre)+'</span>'+(Modulos[i].veto&&mr.veredicto==='RED'?' <span class="bg bg-rd">VETO</span>':'')+'</div><p style="font-size:13px;color:#6b7280;line-height:1.6">'+limpiar(mr.hallazgos)+'</p>';
    if(mr.detalles&&mr.detalles.length){h+='<div style="margin-top:6px">';mr.detalles.forEach(function(x){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:1px 0"><span style="color:'+(x.pasa?'var(--grn)':'#9ca3af')+'">'+(x.pasa?'\u2713':'\u2717')+'</span>'+limpiar(x.texto)+'</div>'});h+='</div>';}
    h+='</div></div></div>';}
  h+='<div class="g2" style="margin-top:18px"><button class="btn bp bw" id="svb" onclick="guardarAud()">\ud83d\udcbe Guardar en Sheets</button><button class="btn bs bw" onclick="window.print()">\ud83d\udcc4 Exportar PDF</button></div>'+
    '<div class="g2" style="margin-top:8px"><button class="btn bs bw" onclick="shareWA()">\ud83d\udcac WhatsApp</button><button class="btn bs bw" onclick="reiniciar();nav(\'home\')">Nueva Auditor\u00eda</button></div>';
  renderizar('Resultados',h,'auditoria/5');
}
function guardarAud(){
  var r=RES;if(!r)return;
  var fila={id:nuevoId(),fecha:new Date().toISOString(),proveedor_id:AU.prov?AU.prov.id:'',proveedor_nombre:AU.prov?AU.prov.nombre:'',producto:AU.prod,
    m1_texto:AU.m1,m1_veredicto:r.resultados[1].veredicto,m1_hallazgos:r.resultados[1].hallazgos,
    m2_texto:AU.m2,m2_veredicto:r.resultados[2].veredicto,m2_hallazgos:r.resultados[2].hallazgos,
    m3_texto:AU.m3,m3_veredicto:r.resultados[3].veredicto,m3_hallazgos:r.resultados[3].hallazgos,
    m4_catalogo_repuestos:String(AU.m4.m4_catalogo_repuestos),m4_precios_unitarios:String(AU.m4.m4_precios_unitarios),
    m4_garantia_escrita:String(AU.m4.m4_garantia_escrita),m4_procedimiento_reclamacion:String(AU.m4.m4_procedimiento_reclamacion),
    m4_veredicto:r.resultados[4].veredicto,m4_hallazgos:r.resultados[4].hallazgos,
    m5_cfg:String(AU.m5.m5_cfg),m5_apostillado:String(AU.m5.m5_apostillado),m5_manual_espanol:String(AU.m5.m5_manual_espanol),
    m5_veredicto:r.resultados[5].veredicto,m5_hallazgos:r.resultados[5].hallazgos,
    veredicto_global:r.veredicto_global,resumen:r.resumen,notas:'',creado_por:Sesion.obtener()?Sesion.obtener().nombre:''};
  var btn=$i('svb');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  Hoja.escribir('Auditorias',fila).then(function(){toast('Auditor\u00eda guardada en Google Sheets','exito');if(btn)btn.textContent='\u2713 Guardado';})
    .catch(function(e){toast('Error al guardar: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent='\ud83d\udcbe Guardar en Sheets';}});
}
function shareWA(){
  var ve={GREEN:'\u2705',YELLOW:'\u26a0\ufe0f',RED:'\u2717'},ms={1:'Certificaci\u00f3n CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garant\u00eda',5:'Legalidad AGEMED'};
  var t='\ud83d\udccb *AUDITOR\u00cdA DUAVA CHECK*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\ud83d\udce6 *'+limpiar(AU.prod)+'*\n\ud83c\udfed '+limpiar(AU.prov?AU.prov.nombre:'')+'\n\n';
  for(var i=1;i<=5;i++)t+=ve[RES.resultados[i].veredicto]+' *'+ms[i]+'*\n';
  t+='\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n'+RES.resumen+'\n\n_Duava Check_';
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
}

function vHistorial(){
  var h='<h1 class="st-h">Historial</h1><p class="st-sub" id="hc">Cargando...</p>'+
    '<input class="ip" id="hs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true],['GREEN','Verdes'],['YELLOW','Amarillas'],['RED','Rojas']],'hf')+'<div id="hl">'+ld()+'</div>';
  renderizar('Historial',h,'home');
  Hoja.leer('Auditorias').then(function(data){data.reverse();$i('hc').textContent=data.length+' auditor\u00edas';window._ha=data;showHL(data);$i('hs').oninput=function(){aplicarHF()};initF('hf',function(){aplicarHF()});})
    .catch(function(e){$i('hl').innerHTML='<p style="color:var(--red);font-size:13px;padding:16px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarHF(){var q=($i('hs')?$i('hs').value:'').toLowerCase();var fv=document.querySelector('#hf .fb.on');var vt=fv?fv.getAttribute('data-v'):'';showHL((window._ha||[]).filter(function(a){return(!q||(a.producto||'').toLowerCase().indexOf(q)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(q)!==-1)&&(!vt||a.veredicto_global===vt)}));}
function showHL(data){var el=$i('hl');if(!el)return;if(!data.length){el.innerHTML='<p style="color:#9ca3af;font-size:13px;padding:16px;text-align:center">Sin auditor\u00edas</p>';return;}el.innerHTML=data.map(function(a){return'<div class="li" style="margin-bottom:6px"><div style="min-width:30px">'+sem(a.veredicto_global,'s',false)+'</div><div class="li-b" onclick="nav(\'historial/'+limpiar(a.id)+'\')"><div class="li-t">'+limpiar(a.producto||'Sin nombre')+'</div><div class="li-s">'+limpiar(a.proveedor_nombre)+' \u00b7 '+(a.fecha?new Date(a.fecha).toLocaleDateString('es-BO'):'')+'</div></div><button class="btn bs bsm" onclick="event.stopPropagation();dupA(\''+limpiar(a.id)+'\')" title="Duplicar">\ud83d\udccb</button></div>'}).join('');}
function dupA(id){var a=Hoja.buscarPorId(window._ha||[],id);if(!a){toast('No encontrada','error');return;}AU={prov:{id:a.proveedor_id,nombre:a.proveedor_nombre},prod:a.producto,m1:a.m1_texto||'',m2:a.m2_texto||'',m3:a.m3_texto||'',m4:{m4_catalogo_repuestos:a.m4_catalogo_repuestos==='true',m4_precios_unitarios:a.m4_precios_unitarios==='true',m4_garantia_escrita:a.m4_garantia_escrita==='true',m4_procedimiento_reclamacion:a.m4_procedimiento_reclamacion==='true'},m5:{m5_cfg:a.m5_cfg==='true',m5_apostillado:a.m5_apostillado==='true',m5_manual_espanol:a.m5_manual_espanol==='true'}};RES=null;toast('Datos cargados','exito');setTimeout(function(){nav('auditoria/1')},400);}

function vHistDet(id){
  renderizar('Detalle','<div id="detc">'+ld()+'</div>','historial');
  Hoja.leer('Auditorias').then(function(data){var a=Hoja.buscarPorId(data,id);if(!a){$i('detc').innerHTML='<p style="text-align:center;color:var(--red);padding:40px">No encontrada</p>';return;}
    var h='<div style="text-align:center;margin-bottom:18px">'+sem(a.veredicto_global,'l')+'<h1 class="st-h" style="margin-top:12px">'+limpiar(a.producto)+'</h1><p style="font-size:13px;color:#6b7280">'+limpiar(a.proveedor_nombre)+'</p><p class="fm" style="font-size:11px;color:#9ca3af">'+(a.fecha?new Date(a.fecha).toLocaleString('es-BO'):'')+'</p></div>';
    if(a.resumen)h+='<div class="cd cd-'+a.veredicto_global.toLowerCase()+'" style="margin-bottom:14px"><p style="font-size:13px;line-height:1.7;color:#1a1a1a">'+limpiar(a.resumen)+'</p></div>';
    for(var i=1;i<=5;i++){var v=a['m'+i+'_veredicto'],f=a['m'+i+'_hallazgos'];if(!v)continue;h+='<div class="cd cd-'+v.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+sem(v,'s',false)+'<div><span class="fd" style="font-weight:700;font-size:13px;color:#1a1a1a">'+limpiar(Modulos[i].nombre)+'</span><p style="font-size:13px;color:#6b7280;margin-top:4px">'+limpiar(f||'')+'</p></div></div></div>';}
    h+='<div class="g2 no-print" style="margin-top:14px"><button class="btn bp bw" onclick="dupA(\''+limpiar(a.id)+'\')">\ud83d\udccb Duplicar y Re-auditar</button><button class="btn bs bw" onclick="window.print()">Imprimir</button></div>';
    $i('detc').innerHTML=h;});
}

function vProveedores(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Proveedores</h1><p class="st-sub" id="pc">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'proveedor/nuevo\')">+ Nuevo</button></div>'+
    '<input class="ip" id="prs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true],['Activo','Activos'],['Evaluacion','En evaluaci\u00f3n'],['Descartado','Descartados']],'pf')+'<div id="pl2">'+ld()+'</div>';
  renderizar('Proveedores',h,'home');
  Hoja.leer('Proveedores').then(function(data){$i('pc').textContent=data.length+' proveedores';window._pv=data;showPVL(data);$i('prs').oninput=function(){aplicarPF()};initF('pf',function(){aplicarPF()});})
    .catch(function(e){$i('pl2').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarPF(){var q=($i('prs')?$i('prs').value:'').toLowerCase();var fv=document.querySelector('#pf .fb.on');var st=fv?fv.getAttribute('data-v'):'';showPVL((window._pv||[]).filter(function(p){return(!q||(p.nombre||'').toLowerCase().indexOf(q)!==-1)&&(!st||p.estado===st)}));}
function showPVL(data){var el=$i('pl2');if(!el)return;if(!data.length){el.innerHTML='<p style="color:#9ca3af;font-size:13px;padding:16px;text-align:center">Sin proveedores</p>';return;}var ec={Activo:'bg-gn',Evaluacion:'bg-yw',Descartado:'bg-rd'};el.innerHTML=data.map(function(p){return'<div class="li" style="margin-bottom:6px" onclick="nav(\'proveedor/'+limpiar(p.id)+'\')"><div style="width:34px;height:34px;border-radius:8px;background:#f0eeea;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">\ud83c\udfe2</div><div class="li-b"><div class="li-t">'+limpiar(p.nombre)+'</div><div class="li-s">'+limpiar([p.ciudad,p.email].filter(Boolean).join(' \u00b7 '))+'</div></div><span class="bg '+(ec[p.estado]||'bg-g')+'">'+limpiar(p.estado||'?')+'</span></div>'}).join('');}

function vProvForm(id){
  var esN=!id,f={nombre:'',email:'',telefono:'',pais:'China',ciudad:'',tipo:'',certificaciones:'',estado:'Evaluacion',notas:'',fecha_creacion:''};
  function draw(d){
    var h='<h1 class="st-h">'+(esN?'Nuevo':'Editar')+' Proveedor</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      ff('nombre','Nombre *',d.nombre)+'<div class="g2">'+ff('pais','Pa\u00eds',d.pais)+ff('ciudad','Ciudad',d.ciudad)+'</div>'+
      '<div class="g2">'+ff('email','Email',d.email)+ff('telefono','Tel\u00e9fono',d.telefono)+'</div>'+
      '<div><label class="lb">TIPO</label><select class="ip" id="f-tipo"><option value="">Seleccionar...</option>'+['Fabricante','Trading','Distribuidor','Otro'].map(function(t){return'<option'+(d.tipo===t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div>'+
      '<div><label class="lb">ESTADO</label><select class="ip" id="f-estado">'+['Evaluacion','Activo','Descartado'].map(function(t){return'<option'+(d.estado===t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div>'+
      ff('certificaciones','Certificaciones',d.certificaciones)+'<div><label class="lb">NOTAS</label><textarea class="ip" id="f-notas" style="min-height:80px">'+limpiar(d.notas)+'</textarea></div>'+
      '<button class="btn bp bw" id="bpv" onclick="doSaveProv(\''+(esN?'':limpiar(id))+'\',\''+limpiar(d.fecha_creacion||'')+'\')">'+(esN?'Crear':'Actualizar')+' Proveedor</button></div>';
    renderizar(esN?'Nuevo Proveedor':'Editar Proveedor',h,'proveedores');
  }
  if(esN)draw(f);else{Hoja.leer('Proveedores').then(function(data){var found=Hoja.buscarPorId(data,id);draw(found||f)}).catch(function(){draw(f)});}
}
function doSaveProv(oid,ofc){
  var d={nombre:gf('nombre'),email:gf('email'),telefono:gf('telefono'),pais:gf('pais'),ciudad:gf('ciudad'),tipo:gf('tipo'),certificaciones:gf('certificaciones'),estado:gf('estado'),notas:gf('notas')};
  if(!d.nombre){toast('El nombre es obligatorio','error');return;}
  var btn=$i('bpv');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?(d.id=oid,d.fecha_creacion=ofc,Hoja.actualizar('Proveedores',oid,d)):(d.id=nuevoId(),d.fecha_creacion=new Date().toISOString(),Hoja.escribir('Proveedores',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','exito');nav('proveedores')}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent=(oid?'Actualizar':'Crear')+' Proveedor';}});
}

function vLegal(){
  var cats=['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'];
  var ci={'Regulaciones UE':'\ud83c\udf10','Regulaciones Bolivia':'\u2696\ufe0f','Normas Tecnicas':'\ud83d\udd27','Procedimientos':'\ud83d\udcc4'};
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Base Legal</h1><p class="st-sub" id="lc2">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'legal/nuevo\')">+ Nuevo</button></div>'+
    '<input class="ip" id="lgs" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtH([['','Todos',true]].concat(cats.map(function(c){return[c,c]})),'lgf')+'<div id="lgl">'+ld()+'</div>';
  renderizar('Base Legal',h,'home');
  Hoja.leer('Base_Legal').then(function(data){$i('lc2').textContent=data.length+' documentos';window._ll=data;showLL(data,ci);$i('lgs').oninput=function(){aplicarLF(ci)};initF('lgf',function(){aplicarLF(ci)});})
    .catch(function(e){$i('lgl').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarLF(ci){var q=($i('lgs')?$i('lgs').value:'').toLowerCase();var fv=document.querySelector('#lgf .fb.on');var ct=fv?fv.getAttribute('data-v'):'';showLL((window._ll||[]).filter(function(d){return(!q||(d.titulo||'').toLowerCase().indexOf(q)!==-1||(d.descripcion||'').toLowerCase().indexOf(q)!==-1)&&(!ct||d.categoria===ct)}),ci);}
function showLL(data,ci){var el=$i('lgl');if(!el)return;if(!data.length){el.innerHTML='<p style="color:#9ca3af;font-size:13px;padding:16px;text-align:center">Sin documentos</p>';return;}el.innerHTML=data.map(function(d){var ic=ci[d.categoria]||'\ud83d\udcc4';return'<div class="cd" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px"><span style="font-size:20px;flex-shrink:0">'+ic+'</span><div style="flex:1;min-width:0"><div class="fd" style="font-weight:700;font-size:13px;color:#1a1a1a">'+limpiar(d.titulo)+'</div><div style="font-size:11px;color:#9ca3af;margin-top:2px">'+limpiar(d.categoria)+'</div>'+(d.descripcion?'<p style="font-size:12px;color:#6b7280;margin-top:4px">'+limpiar(d.descripcion)+'</p>':'')+(d.enlace_oficial?'<a href="'+limpiar(d.enlace_oficial)+'" target="_blank" rel="noopener" style="font-size:12px;margin-top:4px;display:inline-block">\ud83d\udd17 Enlace oficial</a>':'')+'</div><button class="btn bs bsm" onclick="nav(\'legal/'+limpiar(d.id)+'\')">Editar</button></div></div>'}).join('');}

function vLegForm(id){
  var esN=!id,f={categoria:'Regulaciones UE',titulo:'',descripcion:'',enlace_oficial:'',fecha_actualizacion:''};
  function draw(d){
    var h='<h1 class="st-h">'+(esN?'Nuevo':'Editar')+' Documento</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      '<div><label class="lb">CATEGOR\u00cdA</label><select class="ip" id="f-categoria">'+['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'].map(function(c){return'<option'+(d.categoria===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select></div>'+
      ff('titulo','T\u00edtulo *',d.titulo)+'<div><label class="lb">DESCRIPCI\u00d3N</label><textarea class="ip" id="f-descripcion" style="min-height:80px">'+limpiar(d.descripcion)+'</textarea></div>'+
      ff('enlace_oficial','Enlace Oficial',d.enlace_oficial)+
      '<button class="btn bp bw" id="blg" onclick="doSaveLeg(\''+(esN?'':limpiar(id))+'\',\''+limpiar(d.fecha_actualizacion||'')+'\')">'+(esN?'Crear':'Actualizar')+'</button></div>';
    renderizar(esN?'Nuevo Documento':'Editar Documento',h,'legal');
  }
  if(esN)draw(f);else{Hoja.leer('Base_Legal').then(function(data){var found=Hoja.buscarPorId(data,id);draw(found||f)}).catch(function(){draw(f)});}
}
function doSaveLeg(oid,ofu){
  var d={categoria:gf('categoria'),titulo:gf('titulo'),descripcion:gf('descripcion'),enlace_oficial:gf('enlace_oficial')};
  if(!d.titulo){toast('T\u00edtulo obligatorio','error');return;}
  var btn=$i('blg');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var op=oid?(d.id=oid,d.fecha_actualizacion=ofu,Hoja.actualizar('Base_Legal',oid,d)):(d.id=nuevoId(),d.fecha_actualizacion=new Date().toISOString(),Hoja.escribir('Base_Legal',d));
  op.then(function(){toast(oid?'Actualizado':'Creado','exito');nav('legal')}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;}});
}

function vWA(){
  window._wr=null;window._we=null;
  renderizar('WhatsApp','<div id="wac">'+ld()+'</div>','home');
  Hoja.leer('Auditorias').then(function(data){window._wa=data.reverse();waS1()}).catch(function(e){$i('wac').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function waRP(paso){
  var h='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:22px">\ud83d\udcac</span><h1 class="st-h">Generador de Propuesta</h1></div><p class="st-sub">Comparativo para WhatsApp</p><div class="sts">';
  for(var i=1;i<=3;i++){h+='<div class="st-d '+(paso>i?'dn':paso===i?'act':'pd')+'">'+(paso>i?'\u2713':i)+'</div>';if(i<3)h+='<div class="st-l '+(paso>i?'dn':'')+'"></div>';}
  h+='</div>';return h;
}
function waS1(){
  $i('wac').innerHTML=waRP(1)+'<h3 class="sl">Paso 1: Opci\u00f3n RECOMENDADA</h3><input class="ip" id="ws" placeholder="Buscar..." style="margin-bottom:8px"><div id="wl"></div>';
  waLst(window._wa,'',false);$i('ws').oninput=function(){waLst(window._wa,this.value,false)};
}
function waS2(){
  var rec=window._wr;
  $i('wac').innerHTML=waRP(2)+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 class="sl">Paso 2: Opci\u00f3n ECON\u00d3MICA</h3><button class="btn bs bsm" onclick="window._wr=null;waS1()">Cambiar</button></div>'+
    '<div class="cd" style="border-color:var(--gold-dim);margin-bottom:10px"><span class="bg bg-g">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:14px;margin-top:4px;color:#1a1a1a">'+limpiar(rec.producto)+'</div></div>'+
    '<input class="ip" id="ws" placeholder="Buscar..." style="margin-bottom:8px"><div id="wl"></div>';
  var filt=(window._wa||[]).filter(function(a){return a.id!==rec.id});
  waLst(filt,'',true);$i('ws').oninput=function(){waLst(filt,this.value,true)};
}
function waS3(){
  var rec=window._wr,eco=window._we,txt=generarWhatsApp(rec,eco);
  $i('wac').innerHTML=waRP(3)+
    '<div class="g2" style="margin-bottom:10px"><div class="cd" style="border-color:var(--grn)"><span class="bg bg-gn">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px;color:#1a1a1a">'+limpiar(rec.producto)+'</div></div><div class="cd" style="border-color:var(--ylw)"><span class="bg bg-yw">ECON\u00d3MICA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px;color:#1a1a1a">'+limpiar(eco.producto)+'</div></div></div>'+
    '<div class="wa" id="wpre">'+limpiar(txt)+'</div>'+
    '<div class="g2" style="margin-top:10px"><button class="btn bp bw" onclick="copiarWA()">\ud83d\udccb Copiar al Portapapeles</button><button class="btn bs bw" onclick="window.open(\'https://wa.me/?text=\'+encodeURIComponent($i(\'wpre\').textContent),\'_blank\')">\ud83d\udcac Abrir WhatsApp</button></div>'+
    '<button class="btn bs bw" style="margin-top:8px" onclick="window._wr=null;window._we=null;vWA()">Nuevo comparativo</button>';
}
function waLst(data,q,isE){
  q=(q||'').toLowerCase();var f=data.filter(function(a){return!q||(a.producto||'').toLowerCase().indexOf(q)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(q)!==-1});
  var el=$i('wl');if(!el)return;if(!f.length){el.innerHTML='<p style="color:#9ca3af;font-size:13px;padding:16px;text-align:center">Sin auditor\u00edas</p>';return;}
  el.innerHTML=f.map(function(a){return'<div class="li" style="margin-bottom:6px" onclick="waPick('+JSON.stringify(isE)+',\''+limpiar(a.id)+'\')"><div style="min-width:30px">'+sem(a.veredicto_global,'s',false)+'</div><div class="li-b"><div class="li-t">'+limpiar(a.producto)+'</div><div class="li-s">'+limpiar(a.proveedor_nombre)+'</div></div></div>'}).join('');
}
function waPick(isE,id){var a=Hoja.buscarPorId(window._wa||[],id);if(!a)return;if(!isE){window._wr=a;window._we=null;waS2();}else{window._we=a;waS3();}}
function copiarWA(){navigator.clipboard.writeText($i('wpre').textContent).then(function(){toast('Copiado','exito')}).catch(function(){toast('Selecciona y copia manualmente','error')});}

function vUsuarios(){
  renderizar('Usuarios','<div id="ucon">'+ld()+'</div>','home');
  Hoja.leer('Usuarios',true).then(function(usuarios){
    var h='<h1 class="st-h">Gesti\u00f3n de Usuarios</h1><p class="st-sub">'+usuarios.length+' usuarios</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">';
    usuarios.forEach(function(u){
      var nombre=u.Nombre||'',ac=(u.Activo||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      var activo=(ac==='si'||ac==='s');
      h+='<div class="cd"><div style="display:flex;align-items:center;justify-content:space-between"><div><span class="fd" style="font-weight:700;font-size:14px;color:#1a1a1a">'+limpiar(nombre)+'</span> <span class="bg '+(activo?'bg-gn':'bg-rd')+'">'+(activo?'Activo':'Bloqueado')+'</span></div></div></div>';
    });
    h+='</div><h3 class="sl" style="margin-top:18px;color:#1a1a1a">A\u00f1adir Usuario</h3><div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">'+
      ff('nuevo_nombre','Nombre','')+ff('nuevo_clave','Clave','')+
      '<button class="btn bp bw" id="buadd" onclick="crearU()">Crear Usuario</button></div>';
    $i('ucon').innerHTML=h;
  }).catch(function(e){$i('ucon').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function crearU(){
  var nombre=gf('nuevo_nombre'),clave=gf('nuevo_clave');if(!nombre||!clave){toast('Nombre y clave obligatorios','error');return;}
  var btn=$i('buadd');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  Hoja.leer('Usuarios',true).then(function(usuarios){
    for(var i=0;i<usuarios.length;i++)if((usuarios[i].Nombre||'')===nombre){toast('Ese nombre ya existe','error');if(btn){btn.disabled=false;btn.textContent='Crear Usuario';}return;}
    Hoja.escribir('Usuarios',{Nombre:nombre,Clave:clave,Activo:'S\u00ed'}).then(function(){toast('Usuario creado','exito');vUsuarios()}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;}});
  });
}

document.addEventListener('DOMContentLoaded',function(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
  ruta();
});