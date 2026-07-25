'use strict';
/* ===========================================================
 *  DUAVA CHECK — FASE 1
 *  Google Sheets como base de datos principal
 *  Nombres de columnas en español para fácil entendimiento
 * =========================================================== */

/* ===========================================================
 *  CONFIGURACIÓN
 * =========================================================== */

// PEGA AQUI la URL que te dio Google Apps Script
var URL_HOJA = 'https://script.google.com/macros/s/AKfycbzPZrEd8x6sMAtpB3TilW6NcFh80ato138Uyi1DhJlY7P3pG0nZ78RFzobEo-7dWZ5raQ/exec';

/* ===========================================================
 *  UTILIDADES
 * =========================================================== */
function $(s){return document.querySelector(s)}
function $i(s){return document.getElementById(s)}
function nuevoId(){return Date.now().toString(36)+Math.random().toString(36).substr(2,8)}
function limpiar(s){if(s==null)return '';var d=document.createElement('div');d.textContent=String(s);return d.innerHTML}

/* ===========================================================
 *  NOTIFICACIONES TOAST
 * =========================================================== */
function toast(mensaje,tipo){
  tipo=tipo||'exito';
  var d=document.createElement('div');
  d.className='tt tt-'+(tipo==='exito'?'s':tipo==='error'?'e':'w');
  d.textContent=mensaje;
  document.body.appendChild(d);
  requestAnimationFrame(function(){d.classList.add('show')});
  setTimeout(function(){d.classList.remove('show');setTimeout(function(){d.remove()},300)},3500);
}

/* ===========================================================
 *  MEMORIA TEMPORAL (se borra al recargar la página)
 * =========================================================== */
var Memoria={_d:{},obtener:function(k){return this._d[k]||null},guardar:function(k,v){this._d[k]=v},limpiar:function(k){delete this._d[k]}};

/* ===========================================================
 *  GOOGLE SHEETS API (a través de Apps Script)
 * =========================================================== */
var Hoja={
  leer:function(nombrePestaña,forzar){
    if(!forzar){var c=Memoria.obtener(nombrePestaña);if(c)return Promise.resolve(c)}
    return fetch(URL_HOJA+'?action=read&sheet='+encodeURIComponent(nombrePestaña))
      .then(function(r){return r.json()})
      .then(function(d){
        if(d.error)throw new Error(d.error);
        Memoria.guardar(nombrePestaña,d);
        return d;
      });
  },
  escribir:function(nombrePestaña,datos){
    var url=URL_HOJA+'?action=write&sheet='+encodeURIComponent(nombrePestaña)+'&data='+encodeURIComponent(JSON.stringify(datos));
    return fetch(url).then(function(r){return r.json()}).then(function(d){
      if(d.error)throw new Error(d.error);
      Memoria.limpiar(nombrePestaña);
      return d;
    });
  },
  actualizar:function(nombrePestaña,id,datos){
    var url=URL_HOJA+'?action=update&sheet='+encodeURIComponent(nombrePestaña)+'&id='+encodeURIComponent(id)+'&data='+encodeURIComponent(JSON.stringify(datos));
    return fetch(url).then(function(r){return r.json()}).then(function(d){
      if(d.error)throw new Error(d.error);
      Memoria.limpiar(nombrePestaña);
      return d;
    });
  },
  buscarPorId:function(lista,id){for(var i=0;i<lista.length;i++)if(lista[i].id===id)return lista[i];return null}
};

/* ===========================================================
 *  SESION DEL USUARIO
 * =========================================================== */
var Sesion={
  obtener:function(){try{return JSON.parse(sessionStorage.getItem('dc_usuario'))}catch(e){return null}},
  guardar:function(u){sessionStorage.setItem('dc_usuario',JSON.stringify(u))},
  cerrar:function(){sessionStorage.removeItem('dc_usuario')},
  activa:function(){return!!this.obtener()}
};

/* ===========================================================
 *  MOTOR DE AUDITORIA — Los 5 Pilares
 * =========================================================== */
var Modulos={
  1:{nombre:'Certificación Europea (CE/MDR)',descripcion:'El Filtro Crítico — Poder de Veto',veto:true,tipo:'texto',
     placeholder:'Pega aquí el texto del certificado CE, MDR o ficha del producto...',
     icono:'🛡️',enlaces:[{titulo:'NANDO (UE)',url:'https://webgate.ec.europa.eu/single-market-compliance-space/#/notified-bodies'},{titulo:'CertiPedia',url:'https://www.certipedia.com/'},{titulo:'TÜV SÜD',url:'https://www.tuvsud.com/en/industries/healthcare-and-medical-devices'}]},
  2:{nombre:'Identidad Corporativa',descripcion:'Fabricante vs. Intermediario',veto:false,tipo:'texto',
     placeholder:'Pega texto de la Licencia Comercial (Business License) o nombre de empresa...',
     icono:'🏢',enlaces:[{titulo:'Guía Licencias Chinas',url:'https://www.china-briefing.com/news/how-to-read-a-china-business-license/'},{titulo:'Tianyancha',url:'https://www.tianyancha.com/'}]},
  3:{nombre:'Especificaciones Técnicas',descripcion:'Análisis Forense de Datasheet',veto:false,tipo:'texto',
     placeholder:'Pega ficha técnica: voltaje, RPM, torque, IP, normativas...',
     icono:'⚙️',enlaces:[{titulo:'IEC 60601',url:'https://webstore.iec.ch/en/publication/25652'}]},
  4:{nombre:'Cadena de Suministro',descripcion:'Repuestos y Garantía',veto:false,tipo:'checklist',icono:'🚚',
     preguntas:[
       {id:'m4_catalogo_repuestos',pregunta:'¿Catálogo de Repuestos?',ayuda:'Lista de piezas con números de parte.'},
       {id:'m4_precios_unitarios',pregunta:'¿Precios unitarios?',ayuda:'Precio claro por cada repuesto.'},
       {id:'m4_garantia_escrita',pregunta:'¿Garantía escrita?',ayuda:'Documento formal, no verbal.'},
       {id:'m4_procedimiento_reclamacion',pregunta:'¿Procedimiento de reclamación?',ayuda:'Pasos, tiempos, cobertura definidos.'}],
     enlaces:[]},
  5:{nombre:'Viabilidad Bolivia (AGEMED)',descripcion:'Requisitos Regulatorios',veto:false,tipo:'checklist',icono:'⚖️',
     preguntas:[
       {id:'m5_cfg',pregunta:'¿Puede emitir CFG?',ayuda:'Certificado de Libre Venta.'},
       {id:'m5_apostillado',pregunta:'¿CFG apostillado?',ayuda:'Apostilla de La Haya.'},
       {id:'m5_manual_espanol',pregunta:'¿Manual en español?',ayuda:'Traducción oficial.'}],
     enlaces:[{titulo:'AGEMED',url:'https://www.gob.bo/agaemed'}]}
};

// --- Analizar Módulo 1: Certificación ---
function analizarM1(texto){
  var tieneMDR=/MDR\s*2017\/745|MDD\s*93\/42|Medical Device (Regulation|Directive)/i.test(texto);
  var tieneOrganismo=/(?:CE|NB|Notified\s*Body)\s*[^\d]{0,3}\d{4}\b/i.test(texto);
  var tieneCE=/\bCE\b|marca\s*CE|marcado\s*CE/i.test(texto);
  var esFalso=/\bce\s+certified\b/i.test(texto)&&!/\bCE\b/.test(texto);
  var veredicto,hallazgos;
  if(tieneMDR&&tieneOrganismo){veredicto='GREEN';hallazgos='Certificación MDR/MDD válida con organismo notificado. Pasa filtro crítico.';}
  else if(tieneMDR&&!tieneOrganismo){veredicto='YELLOW';hallazgos='Referencia MDR/MDD pero sin número de organismo. Verificar en NANDO.';}
  else if(tieneCE&&!tieneMDR){veredicto='YELLOW';hallazgos='CE sin referencia a MDR/MDD. Posible certificación obsoleta.';}
  else if(esFalso){veredicto='RED';hallazgos='Posible "ce" fraudulento (minúsculas, sin organismo). Alto riesgo.';}
  else{veredicto='RED';hallazgos='Sin certificación CE/MDR/MDD. NO puede importarse sin certificación europea válida.';}
  return{veredicto:veredicto,hallazgos:hallazgos,detalles:[
    {texto:'Referencia MDR/MDD',pasa:tieneMDR},
    {texto:'Número de organismo notificado',pasa:tieneOrganismo},
    {texto:'Mención CE',pasa:tieneCE}
  ]};
}

// --- Analizar Módulo 2: Identidad ---
function analizarM2(texto){
  var esFabricante=/manufactur|production|factory|producer|制造|生产|工厂/i.test(texto);
  var esIntermediario=/trading|wholesale|import.*(and|&).*export|贸易|批发|零售|进出口/i.test(texto);
  var veredicto,hallazgos;
  if(esFabricante){veredicto='GREEN';hallazgos='Indicadores claros de fabricante. Mayor probabilidad de ser fabricante real.';}
  else if(esIntermediario&&!esFabricante){veredicto='YELLOW';hallazgos='Solo indicadores de intermediario. Incrementa precio, reduce soporte.';}
  else{veredicto='YELLOW';hallazgos='Sin indicadores claros. Solicitar licencia comercial completa.';}
  return{veredicto:veredicto,hallazgos:hallazgos,detalles:[{texto:'Fabricante',pasa:esFabricante},{texto:'Intermediario',pasa:esIntermediario}]};
}

// --- Analizar Módulo 3: Especificaciones ---
function analizarM3(texto){
  var tieneIEC=/IEC\s*60601|EN\s*60601|60601-1/i.test(texto);
  var tieneIP=/IP\s*[X]?\d{1,2}\b|IP6[5-9]|IPX[5-9]|sumergible|waterproof/i.test(texto);
  var tieneDatos=/\d+\s*(?:RPM|rpm|N[·.]cm|W(?:att)?|V(?:olt)?|kPa|Hz|mA)/i.test(texto);
  var esVago=/high\s*quality|premium|best\s*motor|superior/i.test(texto)&&!tieneDatos;
  var veredicto,hallazgos;
  if(tieneIEC&&tieneIP){veredicto='GREEN';hallazgos='IEC 60601-1 y clasificación IP presentes. Especificaciones adecuadas.';}
  else if(tieneIEC||tieneIP){veredicto='YELLOW';var faltan=[];if(!tieneIEC)faltan.push('IEC 60601');if(!tieneIP)faltan.push('IP');hallazgos='Ficha parcial: falta '+faltan.join(' y ')+'.';}
  else if(esVago){veredicto='RED';hallazgos='Especificaciones vagas sin datos ni normativas.';}
  else{veredicto='RED';hallazgos='Sin IEC 60601, IP ni datos técnicos cuantitativos.';}
  return{veredicto:veredicto,hallazgos:hallazgos,detalles:[{texto:'IEC 60601-1',pasa:tieneIEC},{texto:'Clasificación IP',pasa:tieneIP},{texto:'Datos técnicos',pasa:tieneDatos}]};
}

// --- Analizar Módulo 4: Cadena de Suministro ---
function analizarM4(checks){
  var cat=checks.m4_catalogo_repuestos,pre=checks.m4_precios_unitarios,gar=checks.m4_garantia_escrita,pro=checks.m4_procedimiento_reclamacion;
  var veredicto,hallazgos;
  if(cat&&pre&&gar&&pro){veredicto='GREEN';hallazgos='Catálogo con precios, garantía y procedimiento. Suministro documentado.';}
  else if(gar&&pro&&(cat||pre)){veredicto='YELLOW';hallazgos='Garantía documentada pero catálogo incompleto.';}
  else if((cat||pre)&&!gar){veredicto='YELLOW';hallazgos='Repuestos parciales sin garantía formal.';}
  else if(gar&&!pro){veredicto='YELLOW';hallazgos='Garantía sin procedimiento escrito.';}
  else{veredicto='RED';hallazgos='Sin catálogo, precios ni garantía. Alto riesgo post-venta.';}
  return{veredicto:veredicto,hallazgos:hallazgos,detalles:[{texto:'Catálogo de Repuestos',pasa:cat},{texto:'Precios unitarios',pasa:pre},{texto:'Garantía escrita',pasa:gar},{texto:'Procedimiento reclamación',pasa:pro}]};
}

// --- Analizar Módulo 5: AGEMED ---
function analizarM5(checks){
  var cfg=checks.m5_cfg,apo=checks.m5_apostillado,man=checks.m5_manual_espanol;
  var veredicto,hallazgos;
  if(cfg&&apo&&man){veredicto='GREEN';hallazgos='CFG apostillado y manual en español. Cumple AGEMED.';}
  else if(cfg&&apo&&!man){veredicto='YELLOW';hallazgos='CFG apostillado pero sin manual español.';}
  else if(man&&(!cfg||!apo)){veredicto='YELLOW';hallazgos='Manual español pero falta CFG o apostillado.';}
  else if(cfg&&!apo){veredicto='YELLOW';hallazgos='CFG sin apostillado.';}
  else{veredicto='RED';hallazgos='Sin CFG apostillado ni manual español. NO registra ante AGEMED.';}
  return{veredicto:veredicto,hallazgos:hallazgos,detalles:[{texto:'Free Sales Certificate',pasa:cfg},{texto:'Apostillado',pasa:apo},{texto:'Manual en español',pasa:man}]};
}

// --- Ejecutar auditoría completa ---
function ejecutarAuditoria(datos){
  var resultados={};
  resultados[1]=datos.m1_texto.trim()?analizarM1(datos.m1_texto):{veredicto:'RED',hallazgos:'Sin información.',detalles:[]};
  resultados[2]=datos.m2_texto.trim()?analizarM2(datos.m2_texto):{veredicto:'RED',hallazgos:'Sin información.',detalles:[]};
  resultados[3]=datos.m3_texto.trim()?analizarM3(datos.m3_texto):{veredicto:'RED',hallazgos:'Sin información.',detalles:[]};
  var c4=datos.m4||{};resultados[4]=Object.values(c4).some(function(v){return v})?analizarM4(c4):{veredicto:'RED',hallazgos:'Sin verificación.',detalles:[]};
  var c5=datos.m5||{};resultados[5]=Object.values(c5).some(function(v){return v})?analizarM5(c5):{veredicto:'RED',hallazgos:'Sin verificación.',detalles:[]};

  var global='GREEN',peso={GREEN:0,YELLOW:1,RED:2};
  if(resultados[1].veredicto==='RED')global='RED';
  else for(var i=1;i<=5;i++)if(peso[resultados[i].veredicto]>peso[global])global=resultados[i].veredicto;

  var rojos=[],amarillos=[];
  for(var i=1;i<=5;i++){if(resultados[i].veredicto==='RED')rojos.push(Modulos[i].nombre);else if(resultados[i].veredicto==='YELLOW')amarillos.push(Modulos[i].nombre);}
  var resumen='';
  if(global==='RED')resumen=resultados[1].veredicto==='RED'?'RECHAZADA: Sin CE/MDR. Riesgo legal inaceptable.':'RIESGOS CRÍTICOS: '+rojos.length+' módulo(s) en rojo ('+rojos.join(', ')+').';
  else if(global==='YELLOW')resumen='CON OBSERVACIONES: '+amarillos.length+' módulo(s) con advertencias ('+amarillos.join(', ')+').';
  else resumen='APROBADA: Todos los módulos cumplen. Procede con negociación.';
  return{veredicto_global:global,resumen:resumen,resultados:resultados,score:{aprobados:5-rojos.length-amarillos.length,observaciones:amarillos.length,rechazados:rojos.length}};
}

/* ===========================================================
 *  GENERADOR DE TEXTO PARA WHATSAPP
 * =========================================================== */
function generarWhatsApp(recomendada,economica){
  var iconos={GREEN:'✅',YELLOW:'⚠️',RED:'❌'};
  var nombres={1:'Certificación CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garantía',5:'Legalidad AGEMED'};
  var t='📊 *COMPARATIVO DE EQUIPOS MÉDICOS*\n━━━━━━━━━━━━━━━━━━━━\n\n';
  t+='🏥 *RECOMENDADA*\n📦 '+limpiar(recomendada.producto)+'\n🏭 '+limpiar(recomendada.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=iconos[recomendada['m'+i+'_veredicto']]+' *'+nombres[i]+'*\n';
  t+='\n━━━━━━━━━━━━━━━━━━━━\n\n💰 *ECONÓMICA*\n📦 '+limpiar(economica.producto)+'\n🏭 '+limpiar(economica.proveedor_nombre)+'\n\n';
  for(var i=1;i<=5;i++)t+=iconos[economica['m'+i+'_veredicto']]+' *'+nombres[i]+'*\n';
  t+='\n━━━━━━━━━━━━━━━━━━━━\n\n💡 *RECOMENDACIÓN*\nSe recomienda '+limpiar(recomendada.producto)+'. Garantiza certificación válida y cumplimiento AGEMED.\n\n_Duava Check — Auditoría Forense_';
  return t;
}

/* ===========================================================
 *  NAVEGACION
 * =========================================================== */
function nav(p){location.hash='#/'+p}
function getR(){return location.hash.replace('#/','')||'login'}
window.addEventListener('hashchange',ruta);
function ruta(){
  if(URL_HOJA.indexOf('PEGA_AQUI')!==-1){mostrarConfig();return;}
  var r=getR();
  if(r==='login')return pantallaLogin();
  if(!Sesion.activa())return nav('login');
  if(r==='home'||r==='')return pantallaHome();
  if(r==='auditoria/nueva')return pantallaNuevaAuditoria();
  if(/^auditoria\/\d$/.test(r))return pantallaModulo(parseInt(r.split('/')[1]));
  if(r==='resultados')return pantallaResultados();
  if(r==='historial')return pantallaHistorial();
  if(/^historial\/.+/.test(r))return pantallaDetalleHistorial(r.split('/')[1]);
  if(r==='proveedores')return pantallaProveedores();
  if(r==='proveedor/nuevo')return pantallaFormularioProveedor(null);
  if(/^proveedor\/.+/.test(r))return pantallaFormularioProveedor(r.split('/')[1]);
  if(r==='legal')return pantallaBaseLegal();
  if(r==='legal/nuevo')return pantallaFormularioLegal(null);
  if(/^legal\/.+/.test(r))return pantallaFormularioLegal(r.split('/')[1]);
  if(r==='whatsapp')return pantallaWhatsApp();
  if(r==='usuarios')return pantallaUsuarios();
  nav('home');
}

/* ===========================================================
 *  ESTADO ACTUAL DE LA AUDITORIA
 * =========================================================== */
var AuditoriaActual={
  proveedor:null,producto:'',
  m1_texto:'',m2_texto:'',m3_texto:'',
  m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},
  m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}
};
var ResultadoActual=null;

function reiniciarAuditoria(){
  AuditoriaActual={proveedor:null,producto:'',m1_texto:'',m2_texto:'',m3_texto:'',
    m4:{m4_catalogo_repuestos:false,m4_precios_unitarios:false,m4_garantia_escrita:false,m4_procedimiento_reclamacion:false},
    m5:{m5_cfg:false,m5_apostillado:false,m5_manual_espanol:false}};
  ResultadoActual=null;
}

/* ===========================================================
 *  COMPONENTES DE INTERFAZ
 * =========================================================== */
function renderizar(titulo,contenido,volverAtras){
  var botonVolver=volverAtras?'<button onclick="nav(\''+volverAtras+'\')" style="background:none;border:none;color:var(--mut);font-size:18px;cursor:pointer;margin-right:6px">←</button>':'';
  var usuario=Sesion.obtener();
  $i('R').innerHTML='<div class="hd"><div class="hd-l">'+botonVolver+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Duava Check</span></div>'+
    '<div class="hd-r"><span class="offb" id="sincon">Sin conexión</span><span style="font-size:12px;color:var(--dim)">'+limpiar(usuario?usuario.nombre:'')+'</span><button class="btn-lo" onclick="Sesion.cerrar();nav(\'login\')">Salir</button></div></div>'+
    '<div style="padding:18px 0;animation:fadeIn .3s ease">'+contenido+'</div>';
  var ob=$i('sincon');if(ob)ob.className='offb'+(navigator.onLine?'':' on');
}

function semaforo(veredicto,tamano,mostrarEtiqueta){
  tamano=tamano||'n';var iconos={GREEN:'✓',YELLOW:'⚠',RED:'✗'},clases={GREEN:'sm-g',YELLOW:'sm-y',RED:'sm-r'},etiquetas={GREEN:'APROBADO',YELLOW:'CON OBSERVACIONES',RED:'RECHAZADO'};
  return'<div class="sm-w '+clases[veredicto]+'"><div class="sm-c '+tamano+'">'+(iconos[veredicto]||'?')+'</div>'+(mostrarEtiqueta!==false?'<span class="sm-t">'+(etiquetas[veredicto]||'')+'</span>':'')+'</div>';
}

function cargando(m){return'<div class="ld"><div class="spn"></div><p style="font-size:13px;color:var(--mut)">'+(m||'Cargando...')+'</p></div>';}

function enlacesRef(enlaces){
  if(!enlaces||!enlaces.length)return'';var id='en_'+nuevoId();
  return'<div class="ch" onclick="$i(\''+id+'\').classList.toggle(\'open\')">📎 Recursos de referencia ▾</div><div id="'+id+'" class="cb">'+enlaces.map(function(e){return'<a class="rl" href="'+e.url+'" target="_blank" rel="noopener">🔗 '+limpiar(e.titulo)+'</a>'}).join('')+'</div>';
}

function filtroHTML(items,idContenedor){return'<div class="fs" id="'+idContenedor+'">'+items.map(function(item){return'<button class="fb'+(item[2]?' on':'')+'" data-v="'+item[0]+'">'+item[1]+'</button>'}).join('')+'</div>';}

function inicializarFiltros(idContenedor,callback){var w=$i(idContenedor);if(!w)return;w.onclick=function(e){var b=e.target.closest('.fb');if(!b)return;w.querySelectorAll('.fb').forEach(function(x){x.classList.remove('on')});b.classList.add('on');callback(b.getAttribute('data-v'))};}

function mostrarConfig(){$i('R').innerHTML='<div class="err-full"><div><h2>⚙️ Configuración requerida</h2><p>Abre <code>app.js</code> y busca la línea que dice <code>URL_HOJA</code>. Reemplaza <code>PEGA_AQUI_LA_URL_DEL_APPS_SCRIPT</code> con la URL de tu Google Apps Script.<br><br>Las instrucciones están en los comentarios al inicio del archivo.</p></div></div>';}

/* ===========================================================
 *  PANTALLA: LOGIN
 * =========================================================== */
function pantallaLogin(){
  $i('R').innerHTML='<div class="lg-w"><div class="lg-b"><div class="lg-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>'+
    '<h1 class="lg-h">Duava Check</h1><p class="lg-sub">Auditoría Forense de Proveedores Médicos</p><div id="login-error"></div>'+
    '<div style="text-align:left;margin-bottom:12px"><label class="lb">NOMBRE</label><input class="ip" id="campo-nombre" placeholder="Tu nombre" autocomplete="username"></div>'+
    '<div style="text-align:left;margin-bottom:18px"><label class="lb">CLAVE</label><input class="ip" id="campo-clave" type="password" placeholder="Tu clave" autocomplete="current-password"></div>'+
    '<button class="btn bp bw" id="boton-login" onclick="hacerLogin()">Iniciar Sesión</button>'+
    '<p style="font-size:11px;color:var(--dim);margin-top:14px">Acceso restringido a usuarios autorizados</p></div></div>';
  $i('campo-clave').onkeydown=function(e){if(e.key==='Enter')hacerLogin()};
  $i('campo-nombre').focus();
}

function hacerLogin(){
  var nombre=$i('campo-nombre').value.trim(),clave=$i('campo-clave').value;
  if(!nombre||!clave){mostrarErrorLogin('Completa ambos campos');return;}
  $i('boton-login').disabled=true;$i('boton-login').textContent='Conectando con Google Sheets...';
  Hoja.leer('Usuarios').then(function(usuarios){
    var encontrado=null;
    for(var i=0;i<usuarios.length;i++)if(usuarios[i].Nombre===nombre&&usuarios[i].Clave===clave){encontrado=usuarios[i];break;}
    if(!encontrado){mostrarErrorLogin('Nombre o clave incorrectos');resetearBotonLogin();return;}
    var activo=(encontrado.Activo||'').toLowerCase();
    if(activo!=='sí'&&activo!=='si'&&activo!=='s'){mostrarErrorLogin('Usuario inactivo. Contacta al administrador.');resetearBotonLogin();return;}
    Sesion.guardar({nombre:encontrado.Nombre});
    nav('home');
  }).catch(function(e){mostrarErrorLogin('Error de conexión: '+e.message+'. Verifica tu internet y la URL.');resetearBotonLogin()});
}
function mostrarErrorLogin(m){$i('login-error').innerHTML='<div class="lg-err">'+limpiar(m)+'</div>';}
function resetearBotonLogin(){$i('boton-login').disabled=false;$i('boton-login').textContent='Iniciar Sesión';}

/* ===========================================================
 *  PANTALLA: HOME
 * =========================================================== */
function pantallaHome(){
  var usuario=Sesion.obtener();
  var h='<div style="text-align:center;margin-bottom:6px">'+
    '<img src="logo.png" alt="Logo Duava Check" style="max-width:150px;height:auto;margin-bottom:8px">'+
    '<!-- INSTRUCCIÓN: Reemplazar logo.png con el archivo de imagen del logo real --></div>'+
    '<p style="font-size:13px;color:var(--mut);margin-bottom:18px;text-align:center">Bienvenido, <strong style="color:var(--gold)">'+limpiar(usuario?usuario.nombre:'')+'</strong></p>'+
    '<div class="cd cd-cl" onclick="nav(\'auditoria/nueva\')" style="margin-bottom:20px;border-color:var(--gold-dim)"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:26px">🔍</span><div><div class="fd" style="font-weight:700;font-size:15px">Nueva Auditoría</div><div style="font-size:12px;color:var(--mut)">Evaluar proveedor con los 5 Pilares</div></div></div></div>'+
    '<h3 class="sl">Los 5 Pilares</h3><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
  for(var i=1;i<=5;i++){var m=Modulos[i];h+='<div class="cd" style="opacity:.7"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">'+m.icono+'</span><div><span class="fm" style="font-size:11px;color:var(--gold);background:var(--gold-bg);padding:1px 6px;border-radius:4px">M'+i+'</span> <span class="fd" style="font-weight:700;font-size:13px">'+limpiar(m.nombre)+'</span>'+(m.veto?' <span class="bg bg-rd">VETO</span>':'')+'</div></div></div>';}
  h+='</div><h3 class="sl">Herramientas</h3><div class="g2">'+
    tarjetaMenu('📋','Historial','Consultar auditorías','historial')+tarjetaMenu('👥','Proveedores','Base de contactos','proveedores')+
    tarjetaMenu('📖','Base Legal','Regulaciones y normas','legal')+tarjetaMenu('💬','WhatsApp','Comparativos','whatsapp')+
    tarjetaMenu('👤','Usuarios','Gestionar accesos','usuarios')+'</div>';
  renderizar('Duava Check',h);
}
function tarjetaMenu(icono,titulo,subtitulo,ruta){return'<div class="cd cd-cl" onclick="nav(\''+ruta+'\')"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">'+icono+'</span><div><div class="fd" style="font-weight:700;font-size:13px">'+limpiar(titulo)+'</div><div style="font-size:11px;color:var(--dim)">'+limpiar(subtitulo)+'</div></div></div></div>';}

/* ===========================================================
 *  PANTALLA: NUEVA AUDITORIA
 * =========================================================== */
function pantallaNuevaAuditoria(){
  var h='<h1 class="st-h">Nueva Auditoría</h1><p class="st-sub">Selecciona proveedor y nombra el producto</p><label class="lb">PROVEEDOR</label>';
  if(AuditoriaActual.proveedor){
    h+='<div class="cd" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="fd" style="font-weight:700">'+limpiar(AuditoriaActual.proveedor.nombre)+'</div><div style="font-size:12px;color:var(--dim)">'+limpiar(AuditoriaActual.proveedor.ciudad||'')+'</div></div><button class="btn bs bsm" onclick="AuditoriaActual.proveedor=null;pantallaNuevaAuditoria()">Cambiar</button></div></div>';
  }else{
    h+='<input class="ip" id="buscar-proveedor" placeholder="Buscar proveedor..." style="margin-bottom:8px"><div id="lista-proveedores">'+cargando()+'</div>'+
      '<button class="btn bs bw" style="margin-top:8px" onclick="var e=$i(\'form-rapido\');e.style.display=e.style.display===\'none\'?\'block\':\'none\'">+ Crear proveedor rápido</button>'+
      '<div id="form-rapido" style="display:none;margin-top:8px"><input class="ip" id="rapido-nombre" placeholder="Nombre de la empresa *" style="margin-bottom:6px"><input class="ip" id="rapido-ciudad" placeholder="Ciudad (ej: Shenzhen)" style="margin-bottom:6px"><button class="btn bp bw" onclick="crearProveedorRapido()">Crear y seleccionar</button></div>';
  }
  h+='<div style="margin-top:16px"><label class="lb">PRODUCTO</label><input class="ip" id="campo-producto" placeholder="Nombre del equipo o dispositivo médico" value="'+limpiar(AuditoriaActual.producto)+'"></div>'+
    '<button class="btn bp bw" style="margin-top:18px" onclick="iniciarAuditoria()">Comenzar Auditoría →</button>';
  renderizar('Nueva Auditoría',h,'home');
  if(!AuditoriaActual.proveedor){
    Hoja.leer('Proveedores').then(function(d){mostrarListaProveedores(d)}).catch(function(e){$i('lista-proveedores').innerHTML='<p style="color:var(--red);font-size:13px;padding:12px">Error: '+limpiar(e.message)+'</p>'});
    var s=$i('buscar-proveedor');if(s)s.oninput=function(){var q=this.value.toLowerCase();Hoja.leer('Proveedores').then(function(d){mostrarListaProveedores(d.filter(function(p){return(p.nombre||'').toLowerCase().indexOf(q)!==-1||(p.ciudad||'').toLowerCase().indexOf(q)!==-1}))})};
  }
  var p=$i('campo-producto');if(p)p.oninput=function(){AuditoriaActual.producto=this.value};
}
function mostrarListaProveedores(data){var el=$i('lista-proveedores');if(!el)return;if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:12px">Sin proveedores. Crea uno.</p>';return;}el.innerHTML=data.map(function(p){return'<div class="li" style="margin-bottom:6px" onclick="seleccionarProveedor(\''+limpiar(p.id)+'\')"><div class="li-b"><div class="li-t">'+limpiar(p.nombre)+'</div><div class="li-s">'+limpiar([p.ciudad,p.tipo].filter(Boolean).join(' · '))+'</div></div></div>'}).join('');}
function seleccionarProveedor(id){Hoja.leer('Proveedores').then(function(d){var p=Hoja.buscarPorId(d,id);if(p)AuditoriaActual.proveedor={id:p.id,nombre:p.nombre,ciudad:p.ciudad||''};pantallaNuevaAuditoria()});}
function crearProveedorRapido(){var n=$i('rapido-nombre').value.trim(),c=$i('rapido-ciudad').value.trim();if(!n){toast('Ingresa el nombre','error');return;}var p={id:nuevoId(),nombre:n,ciudad:c,pais:'China',tipo:'',estado:'Evaluacion',email:'',telefono:'',certificaciones:'',notas:'',fecha_creacion:new Date().toISOString()};Hoja.escribir('Proveedores',p).then(function(){seleccionarProveedor(p.id);toast('Proveedor creado','exito')}).catch(function(e){toast('Error: '+e.message,'error')});}
function iniciarAuditoria(){if(!AuditoriaActual.proveedor){toast('Selecciona un proveedor','warning');return;}if(!AuditoriaActual.producto.trim()){toast('Ingresa el nombre del producto','warning');return;}nav('auditoria/1');}

/* ===========================================================
 *  PANTALLA: MODULOS 1-5
 * =========================================================== */
function pantallaModulo(numero){
  var modulo=Modulos[numero],volverAtras=numero>1?'auditoria/'+(numero-1):'auditoria/nueva';
  var c='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="fm bg bg-g">MÓDULO '+numero+'/5</span>'+(modulo.veto?'<span style="font-size:11px;color:var(--red)">⚠ Poder de veto</span>':'')+'</div>';
  c+='<h1 class="st-h">'+limpiar(modulo.nombre)+'</h1><p class="st-sub">'+limpiar(modulo.descripcion)+'</p>';
  if(modulo.tipo==='texto'){var valor=numero===1?AuditoriaActual.m1_texto:numero===2?AuditoriaActual.m2_texto:AuditoriaActual.m3_texto;c+='<textarea class="ip" id="campo-modulo" placeholder="'+limpiar(modulo.placeholder)+'">'+limpiar(valor)+'</textarea><p style="font-size:11px;color:var(--dim);margin-top:4px" id="contador-caracteres">'+valor.length+' caracteres</p>';}
  if(modulo.tipo==='checklist'){var checks=numero===4?AuditoriaActual.m4:AuditoriaActual.m5;modulo.preguntas.forEach(function(preg){var activo=checks[preg.id]||false;c+='<div class="ci'+(activo?' on':'')+'" id="check_'+preg.id+'" onclick="alternarCheck('+numero+',\''+preg.id+'\')"><input type="checkbox" '+(activo?'checked':'')+' tabindex="-1"><div><div class="ci-l">'+limpiar(preg.pregunta)+'</div><div class="ci-s">'+limpiar(preg.ayuda)+'</div></div></div>'});}
  c+='<button class="btn bs bw" style="margin:14px 0 10px" onclick="vistaPreviaModulo('+numero+')">🔍 Vista previa del análisis</button><div id="preview-modulo"></div>'+enlacesRef(modulo.enlaces);
  var siguiente=numero<5?'auditoria/'+(numero+1):'resultados';
  c+='<div class="mn">'+(numero>1?'<button class="btn bs" onclick="nav(\'auditoria/'+(numero-1)+'\')">← M'+(numero-1)+'</button>':'')+'<button class="btn bp" onclick="nav(\''+siguiente+'\')">'+(numero<5?'M'+(numero+1)+' →':'Ver Resultados →')+'</button></div>';
  renderizar('M'+numero+': '+modulo.nombre,c,volverAtras);
  if(modulo.tipo==='texto'){var ta=$i('campo-modulo');if(ta)ta.oninput=function(){guardarTextoModulo(numero);var el=$i('contador-caracteres');if(el)el.textContent=this.value.length+' caracteres'};}
}
function guardarTextoModulo(numero){var ta=$i('campo-modulo');if(!ta)return;if(numero===1)AuditoriaActual.m1_texto=ta.value;else if(numero===2)AuditoriaActual.m2_texto=ta.value;else AuditoriaActual.m3_texto=ta.value;}
function alternarCheck(numero,id){var checks=numero===4?AuditoriaActual.m4:AuditoriaActual.m5;checks[id]=!checks[id];var el=$i('check_'+id);if(el){var cb=el.querySelector('input[type=checkbox]');if(cb)cb.checked=checks[id];el.classList.toggle('on',checks[id]);}}
function vistaPreviaModulo(numero){
  var resultado;if(numero<=3){var texto=numero===1?AuditoriaActual.m1_texto:numero===2?AuditoriaActual.m2_texto:AuditoriaActual.m3_texto;if(!texto.trim()){$i('preview-modulo').innerHTML='<p style="color:var(--dim);font-size:13px">Ingresa texto primero.</p>';return;}resultado=numero===1?analizarM1(texto):numero===2?analizarM2(texto):analizarM3(texto);}
  else{var checks=numero===4?AuditoriaActual.m4:AuditoriaActual.m5;if(!Object.values(checks).some(function(v){return v})){$i('preview-modulo').innerHTML='<p style="color:var(--dim);font-size:13px">Marca al menos un check.</p>';return;}resultado=numero===4?analizarM4(checks):analizarM5(checks);}
  var clase=resultado.veredicto.toLowerCase();
  var h='<div class="pv pv-'+clase+'"><div style="display:flex;align-items:flex-start;gap:10px">'+semaforo(resultado.veredicto,'s',false)+'<div><p style="font-size:13px;line-height:1.6">'+limpiar(resultado.hallazgos)+'</p>';
  if(resultado.detalles&&resultado.detalles.length){h+='<div style="margin-top:8px">';resultado.detalles.forEach(function(d){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:2px 0"><span style="color:'+(d.pasa?'var(--grn)':'var(--dim)')+'">'+(d.pasa?'✓':'✗')+'</span>'+limpiar(d.texto)+'</div>'});h+='</div>';}
  h+='</div></div></div>';$i('preview-modulo').innerHTML=h;
}

/* ===========================================================
 *  PANTALLA: RESULTADOS
 * =========================================================== */
function pantallaResultados(){
  if(!ResultadoActual)ResultadoActual=ejecutarAuditoria({m1_texto:AuditoriaActual.m1_texto,m2_texto:AuditoriaActual.m2_texto,m3_texto:AuditoriaActual.m3_texto,m4:AuditoriaActual.m4,m5:AuditoriaActual.m5});
  var r=ResultadoActual;
  var h='<div style="text-align:center;margin-bottom:20px">'+semaforo(r.veredicto_global,'l')+'<h1 class="st-h" style="margin-top:14px">Resultado de Auditoría</h1>'+
    '<p style="font-size:13px;color:var(--mut)">'+limpiar(AuditoriaActual.producto)+' — '+limpiar(AuditoriaActual.proveedor?AuditoriaActual.proveedor.nombre:'')+'</p>'+
    '<p class="fm" style="font-size:11px;color:var(--dim);margin-top:4px">'+new Date().toLocaleString('es-BO')+'</p></div>';
  var clase=r.veredicto_global.toLowerCase();
  h+='<div class="cd cd-'+clase+'" style="margin-bottom:18px"><p style="font-size:13px;line-height:1.7">'+limpiar(r.resumen)+'</p>'+
    '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px;font-family:Syne,sans-serif"><span style="color:var(--grn)">'+r.score.aprobados+' aprobado(s)</span><span style="color:var(--ylw)">'+r.score.observaciones+' con obs.</span><span style="color:var(--red)">'+r.score.rechazados+' rechazado(s)</span></div></div>';
  for(var i=1;i<=5;i++){var mr=r.resultados[i];if(!mr)continue;h+='<div class="cd cd-'+mr.veredicto.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+semaforo(mr.veredicto,'s',false)+'<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="fm" style="font-size:11px;color:var(--dim)">M'+i+'</span><span class="fd" style="font-weight:700;font-size:13px">'+limpiar(Modulos[i].nombre)+'</span>'+(Modulos[i].veto&&mr.veredicto==='RED'?' <span class="bg bg-rd">VETO</span>':'')+'</div><p style="font-size:13px;color:var(--mut);line-height:1.6">'+limpiar(mr.hallazgos)+'</p>';
    if(mr.detalles&&mr.detalles.length){h+='<div style="margin-top:6px">';mr.detalles.forEach(function(d){h+='<div style="font-size:12px;display:flex;align-items:center;gap:6px;padding:1px 0"><span style="color:'+(d.pasa?'var(--grn)':'var(--dim)')+'">'+(d.pasa?'✓':'✗')+'</span>'+limpiar(d.texto)+'</div>'});h+='</div>';}
    h+='</div></div></div>';}
  h+='<div class="g2" style="margin-top:18px"><button class="btn bp bw" id="boton-guardar" onclick="guardarAuditoria()">💾 Guardar en Sheets</button><button class="btn bs bw" onclick="window.print()">📄 Exportar PDF</button></div>'+
    '<div class="g2" style="margin-top:8px"><button class="btn bs bw" onclick="compartirWhatsApp()">💬 WhatsApp</button><button class="btn bs bw" onclick="reiniciarAuditoria();nav(\'home\')">🏠 Nueva Auditoría</button></div>';
  renderizar('Resultados',h,'auditoria/5');
}
function guardarAuditoria(){
  var r=ResultadoActual;if(!r)return;
  var fila={
    id:nuevoId(),fecha:new Date().toISOString(),
    proveedor_id:AuditoriaActual.proveedor?AuditoriaActual.proveedor.id:'',
    proveedor_nombre:AuditoriaActual.proveedor?AuditoriaActual.proveedor.nombre:'',
    producto:AuditoriaActual.producto,
    m1_texto:AuditoriaActual.m1_texto,m1_veredicto:r.resultados[1].veredicto,m1_hallazgos:r.resultados[1].hallazgos,
    m2_texto:AuditoriaActual.m2_texto,m2_veredicto:r.resultados[2].veredicto,m2_hallazgos:r.resultados[2].hallazgos,
    m3_texto:AuditoriaActual.m3_texto,m3_veredicto:r.resultados[3].veredicto,m3_hallazgos:r.resultados[3].hallazgos,
    m4_catalogo_repuestos:String(AuditoriaActual.m4.m4_catalogo_repuestos),
    m4_precios_unitarios:String(AuditoriaActual.m4.m4_precios_unitarios),
    m4_garantia_escrita:String(AuditoriaActual.m4.m4_garantia_escrita),
    m4_procedimiento_reclamacion:String(AuditoriaActual.m4.m4_procedimiento_reclamacion),
    m4_veredicto:r.resultados[4].veredicto,m4_hallazgos:r.resultados[4].hallazgos,
    m5_cfg:String(AuditoriaActual.m5.m5_cfg),
    m5_apostillado:String(AuditoriaActual.m5.m5_apostillado),
    m5_manual_espanol:String(AuditoriaActual.m5.m5_manual_espanol),
    m5_veredicto:r.resultados[5].veredicto,m5_hallazgos:r.resultados[5].hallazgos,
    veredicto_global:r.veredicto_global,resumen:r.resumen,notas:'',
    creado_por:Sesion.obtener()?Sesion.obtener().nombre:''
  };
  var btn=$i('boton-guardar');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  Hoja.escribir('Auditorias',fila).then(function(){toast('Auditoría guardada en Google Sheets','exito');if(btn)btn.textContent='✓ Guardado';})
    .catch(function(e){toast('Error al guardar: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent='💾 Guardar en Sheets';}});
}
function compartirWhatsApp(){
  var iconos={GREEN:'✅',YELLOW:'⚠️',RED:'✗'},nombres={1:'Certificación CE/MDR',2:'Tipo de Empresa',3:'Especificaciones',4:'Repuestos/Garantía',5:'Legalidad AGEMED'};
  var t='📋 *AUDITORÍA DUAVA CHECK*\n━━━━━━━━━━━━━━\n📦 *'+limpiar(AuditoriaActual.producto)+'*\n🏭 '+limpiar(AuditoriaActual.proveedor?AuditoriaActual.proveedor.nombre:'')+'\n\n';
  for(var i=1;i<=5;i++)t+=iconos[ResultadoActual.resultados[i].veredicto]+' *'+nombres[i]+'*\n';
  t+='\n━━━━━━━━━━━━━━\n'+ResultadoActual.resumen+'\n\n_Duava Check_';
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank');
}

/* ===========================================================
 *  PANTALLA: HISTORIAL
 * =========================================================== */
function pantallaHistorial(){
  var h='<h1 class="st-h">Historial</h1><p class="st-sub" id="historial-contador">Cargando...</p>'+
    '<input class="ip" id="historial-buscar" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtroHTML([['','Todos',true],['GREEN','Verdes'],['YELLOW','Amarillas'],['RED','Rojas']],'filtros-historial')+'<div id="historial-lista">'+cargando()+'</div>';
  renderizar('Historial',h,'home');
  Hoja.leer('Auditorias').then(function(data){data.reverse();$i('historial-contador').textContent=data.length+' auditorías';window._cacheHistorial=data;mostrarListaHistorial(data);$i('historial-buscar').oninput=function(){aplicarFiltroHistorial()};inicializarFiltros('filtros-historial',function(){aplicarFiltroHistorial()});})
    .catch(function(e){$i('historial-lista').innerHTML='<p style="color:var(--red);font-size:13px;padding:16px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarFiltroHistorial(){var q=($i('historial-buscar')?$i('historial-buscar').value:'').toLowerCase();var fv=document.querySelector('#filtros-historial .fb.on');var vt=fv?fv.getAttribute('data-v'):'';mostrarListaHistorial((window._cacheHistorial||[]).filter(function(a){return(!q||(a.producto||'').toLowerCase().indexOf(q)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(q)!==-1)&&(!vt||a.veredicto_global===vt)}));}
function mostrarListaHistorial(data){var el=$i('historial-lista');if(!el)return;if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin auditorías</p>';return;}el.innerHTML=data.map(function(a){return'<div class="li" style="margin-bottom:6px"><div style="min-width:30px">'+semaforo(a.veredicto_global,'s',false)+'</div><div class="li-b" onclick="nav(\'historial/'+limpiar(a.id)+'\')"><div class="li-t">'+limpiar(a.producto||'Sin nombre')+'</div><div class="li-s">'+limpiar(a.proveedor_nombre)+' · '+(a.fecha?new Date(a.fecha).toLocaleDateString('es-BO'):'')+'</div></div><button class="btn bs bsm" onclick="event.stopPropagation();duplicarAuditoria(\''+limpiar(a.id)+'\')" title="Duplicar">📋</button></div>'}).join('');}
function duplicarAuditoria(id){var a=Hoja.buscarPorId(window._cacheHistorial||[],id);if(!a){toast('No encontrada','error');return;}AuditoriaActual={proveedor:{id:a.proveedor_id,nombre:a.proveedor_nombre},producto:a.producto,m1_texto:a.m1_texto||'',m2_texto:a.m2_texto||'',m3_texto:a.m3_texto||'',m4:{m4_catalogo_repuestos:a.m4_catalogo_repuestos==='true',m4_precios_unitarios:a.m4_precios_unitarios==='true',m4_garantia_escrita:a.m4_garantia_escrita==='true',m4_procedimiento_reclamacion:a.m4_procedimiento_reclamacion==='true'},m5:{m5_cfg:a.m5_cfg==='true',m5_apostillado:a.m5_apostillado==='true',m5_manual_espanol:a.m5_manual_espanol==='true'}};ResultadoActual=null;toast('Datos cargados','exito');setTimeout(function(){nav('auditoria/1')},400);}

/* ===========================================================
 *  PANTALLA: DETALLE DE HISTORIAL
 * =========================================================== */
function pantallaDetalleHistorial(id){
  renderizar('Detalle','<div id="detalle-contenido">'+cargando()+'</div>','historial');
  Hoja.leer('Auditorias').then(function(data){var a=Hoja.buscarPorId(data,id);if(!a){$i('detalle-contenido').innerHTML='<p style="text-align:center;color:var(--red);padding:40px">No encontrada</p>';return;}
    var h='<div style="text-align:center;margin-bottom:18px">'+semaforo(a.veredicto_global,'l')+'<h1 class="st-h" style="margin-top:12px">'+limpiar(a.producto)+'</h1><p style="font-size:13px;color:var(--mut)">'+limpiar(a.proveedor_nombre)+'</p><p class="fm" style="font-size:11px;color:var(--dim)">'+(a.fecha?new Date(a.fecha).toLocaleString('es-BO'):'')+'</p></div>';
    if(a.resumen)h+='<div class="cd cd-'+a.veredicto_global.toLowerCase()+'" style="margin-bottom:14px"><p style="font-size:13px;line-height:1.7">'+limpiar(a.resumen)+'</p></div>';
    for(var i=1;i<=5;i++){var v=a['m'+i+'_veredicto'],f=a['m'+i+'_hallazgos'];if(!v)continue;h+='<div class="cd cd-'+v.toLowerCase()+'" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px">'+semaforo(v,'s',false)+'<div><span class="fd" style="font-weight:700;font-size:13px">'+limpiar(Modulos[i].nombre)+'</span><p style="font-size:13px;color:var(--mut);margin-top:4px">'+limpiar(f||'')+'</p></div></div></div>';}
    h+='<div class="g2 no-print" style="margin-top:14px"><button class="btn bp bw" onclick="duplicarAuditoria(\''+limpiar(a.id)+'\')">📋 Duplicar y Re-auditar</button><button class="btn bs bw" onclick="window.print()">🖨️ Imprimir</button></div>';
    $i('detalle-contenido').innerHTML=h;});
}

/* ===========================================================
 *  PANTALLA: PROVEEDORES
 * =========================================================== */
function pantallaProveedores(){
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Proveedores</h1><p class="st-sub" id="proveedores-contador">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'proveedor/nuevo\')">+ Nuevo</button></div>'+
    '<input class="ip" id="buscar-proveedores" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtroHTML([['','Todos',true],['Activo','Activos'],['Evaluacion','En evaluación'],['Descartado','Descartados']],'filtros-proveedores')+'<div id="lista-proveedores2">'+cargando()+'</div>';
  renderizar('Proveedores',h,'home');
  Hoja.leer('Proveedores').then(function(data){$i('proveedores-contador').textContent=data.length+' proveedores';window._cacheProveedores=data;mostrarListaProveedores2(data);$i('buscar-proveedores').oninput=function(){aplicarFiltroProveedores()};inicializarFiltros('filtros-proveedores',function(){aplicarFiltroProveedores()});})
    .catch(function(e){$i('lista-proveedores2').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarFiltroProveedores(){var q=($i('buscar-proveedores')?$i('buscar-proveedores').value:'').toLowerCase();var fv=document.querySelector('#filtros-proveedores .fb.on');var st=fv?fv.getAttribute('data-v'):'';mostrarListaProveedores2((window._cacheProveedores||[]).filter(function(p){return(!q||(p.nombre||'').toLowerCase().indexOf(q)!==-1)&&(!st||p.estado===st)}));}
function mostrarListaProveedores2(data){var el=$i('lista-proveedores2');if(!el)return;if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin proveedores</p>';return;}var ec={Activo:'bg-gn',Evaluacion:'bg-yw',Descartado:'bg-rd'};el.innerHTML=data.map(function(p){return'<div class="li" style="margin-bottom:6px" onclick="nav(\'proveedor/'+limpiar(p.id)+'\')"><div style="width:34px;height:34px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🏢</div><div class="li-b"><div class="li-t">'+limpiar(p.nombre)+'</div><div class="li-s">'+limpiar([p.ciudad,p.email].filter(Boolean).join(' · '))+'</div></div><span class="bg '+(ec[p.estado]||'bg-g')+'">'+limpiar(p.estado||'?')+'</span></div>'}).join('');}

/* ===========================================================
 *  PANTALLA: FORMULARIO PROVEEDOR
 * =========================================================== */
function pantallaFormularioProveedor(id){
  var esNuevo=!id,valoresPorDefecto={nombre:'',email:'',telefono:'',pais:'China',ciudad:'',tipo:'',certificaciones:'',estado:'Evaluacion',notas:'',fecha_creacion:''};
  function dibujar(d){
    var h='<h1 class="st-h">'+(esNuevo?'Nuevo':'Editar')+' Proveedor</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      campoFormulario('nombre','Nombre *',d.nombre)+'<div class="g2">'+campoFormulario('pais','País',d.pais)+campoFormulario('ciudad','Ciudad',d.ciudad)+'</div>'+
      '<div class="g2">'+campoFormulario('email','Email',d.email)+campoFormulario('telefono','Teléfono',d.telefono)+'</div>'+
      '<div><label class="lb">TIPO</label><select class="ip" id="campo-tipo"><option value="">Seleccionar...</option>'+['Fabricante','Trading','Distribuidor','Otro'].map(function(t){return'<option'+(d.tipo===t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div>'+
      '<div><label class="lb">ESTADO</label><select class="ip" id="campo-estado">'+['Evaluacion','Activo','Descartado'].map(function(t){return'<option'+(d.estado===t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div>'+
      campoFormulario('certificaciones','Certificaciones',d.certificaciones)+'<div><label class="lb">NOTAS</label><textarea class="ip" id="campo-notas" style="min-height:80px">'+limpiar(d.notas)+'</textarea></div>'+
      '<button class="btn bp bw" id="boton-proveedor" onclick="guardarProveedor(\''+(esNuevo?'':limpiar(id))+'\',\''+limpiar(d.fecha_creacion||'')+'\')">'+(esNuevo?'Crear':'Actualizar')+' Proveedor</button></div>';
    renderizar(esNuevo?'Nuevo Proveedor':'Editar Proveedor',h,'proveedores');
  }
  if(esNuevo)dibujar(valoresPorDefecto);else{Hoja.leer('Proveedores').then(function(data){var encontrado=Hoja.buscarPorId(data,id);dibujar(encontrado||valoresPorDefecto)}).catch(function(){dibujar(valoresPorDefecto)});}
}
function campoFormulario(nombre,etiqueta,valor){return'<div><label class="lb">'+etiqueta+'</label><input class="ip" id="campo-'+nombre+'" value="'+limpiar(valor||'')+'"></div>';}
function obtenerCampo(nombre){var el=$i('campo-'+nombre);return el?el.value.trim():'';}
function guardarProveedor(idViejo,fechaVieja){
  var datos={nombre:obtenerCampo('nombre'),email:obtenerCampo('email'),telefono:obtenerCampo('telefono'),pais:obtenerCampo('pais'),ciudad:obtenerCampo('ciudad'),tipo:obtenerCampo('tipo'),certificaciones:obtenerCampo('certificaciones'),estado:obtenerCampo('estado'),notas:obtenerCampo('notas')};
  if(!datos.nombre){toast('El nombre es obligatorio','error');return;}
  var btn=$i('boton-proveedor');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var operacion=idViejo?(datos.id=idViejo,datos.fecha_creacion=fechaVieja,Hoja.actualizar('Proveedores',idViejo,datos)):(datos.id=nuevoId(),datos.fecha_creacion=new Date().toISOString(),Hoja.escribir('Proveedores',datos));
  operacion.then(function(){toast(idViejo?'Actualizado':'Creado','exito');nav('proveedores')}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent=(idViejo?'Actualizar':'Crear')+' Proveedor';}});
}

/* ===========================================================
 *  PANTALLA: BASE LEGAL
 * =========================================================== */
function pantallaBaseLegal(){
  var categorias=['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'];
  var iconosCat={'Regulaciones UE':'🌐','Regulaciones Bolivia':'⚖️','Normas Tecnicas':'🔧','Procedimientos':'📄'};
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div><h1 class="st-h">Base Legal</h1><p class="st-sub" id="legal-contador">Cargando...</p></div><button class="btn bp bsm" onclick="nav(\'legal/nuevo\')">+ Nuevo</button></div>'+
    '<input class="ip" id="buscar-legal" placeholder="Buscar..." style="margin-bottom:8px">'+
    filtroHTML([['','Todos',true]].concat(categorias.map(function(c){return[c,c]})),'filtros-legal')+'<div id="lista-legal">'+cargando()+'</div>';
  renderizar('Base Legal',h,'home');
  Hoja.leer('Base_Legal').then(function(data){$i('legal-contador').textContent=data.length+' documentos';window._cacheLegal=data;mostrarListaLegal(data,iconosCat);$i('buscar-legal').oninput=function(){aplicarFiltroLegal(iconosCat)};inicializarFiltros('filtros-legal',function(){aplicarFiltroLegal(iconosCat)});})
    .catch(function(e){$i('lista-legal').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function aplicarFiltroLegal(iconosCat){var q=($i('buscar-legal')?$i('buscar-legal').value:'').toLowerCase();var fv=document.querySelector('#filtros-legal .fb.on');var ct=fv?fv.getAttribute('data-v'):'';mostrarListaLegal((window._cacheLegal||[]).filter(function(d){return(!q||(d.titulo||'').toLowerCase().indexOf(q)!==-1||(d.descripcion||'').toLowerCase().indexOf(q)!==-1)&&(!ct||d.categoria===ct)}),iconosCat);}
function mostrarListaLegal(data,iconosCat){var el=$i('lista-legal');if(!el)return;if(!data.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin documentos</p>';return;}el.innerHTML=data.map(function(d){var icono=iconosCat[d.categoria]||'📄';return'<div class="cd" style="margin-bottom:8px"><div style="display:flex;align-items:flex-start;gap:10px"><span style="font-size:20px;flex-shrink:0">'+icono+'</span><div style="flex:1;min-width:0"><div class="fd" style="font-weight:700;font-size:13px">'+limpiar(d.titulo)+'</div><div style="font-size:11px;color:var(--dim);margin-top:2px">'+limpiar(d.categoria)+'</div>'+(d.descripcion?'<p style="font-size:12px;color:var(--mut);margin-top:4px">'+limpiar(d.descripcion)+'</p>':'')+(d.enlace_oficial?'<a href="'+limpiar(d.enlace_oficial)+'" target="_blank" rel="noopener" style="font-size:12px;margin-top:4px;display:inline-block">🔗 Enlace oficial</a>':'')+'</div><button class="btn bs bsm" onclick="nav(\'legal/'+limpiar(d.id)+'\')">✏️</button></div></div>'}).join('');}

/* ===========================================================
 *  PANTALLA: FORMULARIO LEGAL
 * =========================================================== */
function pantallaFormularioLegal(id){
  var esNuevo=!id,valoresPorDefecto={categoria:'Regulaciones UE',titulo:'',descripcion:'',enlace_oficial:'',fecha_actualizacion:''};
  function dibujar(d){
    var h='<h1 class="st-h">'+(esNuevo?'Nuevo':'Editar')+' Documento</h1><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">'+
      '<div><label class="lb">CATEGORÍA</label><select class="ip" id="campo-categoria">'+['Regulaciones UE','Regulaciones Bolivia','Normas Tecnicas','Procedimientos'].map(function(c){return'<option'+(d.categoria===c?' selected':'')+'>'+c+'</option>'}).join('')+'</select></div>'+
      campoFormulario('titulo','Título *',d.titulo)+'<div><label class="lb">DESCRIPCIÓN</label><textarea class="ip" id="campo-descripcion" style="min-height:80px">'+limpiar(d.descripcion)+'</textarea></div>'+
      campoFormulario('enlace_oficial','Enlace Oficial',d.enlace_oficial)+
      '<button class="btn bp bw" id="boton-legal" onclick="guardarDocumento(\''+(esNuevo?'':limpiar(id))+'\',\''+limpiar(d.fecha_actualizacion||'')+'\')">'+(esNuevo?'Crear':'Actualizar')+'</button></div>';
    renderizar(esNuevo?'Nuevo Documento':'Editar Documento',h,'legal');
  }
  if(esNuevo)dibujar(valoresPorDefecto);else{Hoja.leer('Base_Legal').then(function(data){var encontrado=Hoja.buscarPorId(data,id);dibujar(encontrado||valoresPorDefecto)}).catch(function(){dibujar(valoresPorDefecto)});}
}
function guardarDocumento(idViejo,fechaVieja){
  var datos={categoria:obtenerCampo('categoria'),titulo:obtenerCampo('titulo'),descripcion:obtenerCampo('descripcion'),enlace_oficial:obtenerCampo('enlace_oficial')};
  if(!datos.titulo){toast('Título obligatorio','error');return;}
  var btn=$i('boton-legal');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  var operacion=idViejo?(datos.id=idViejo,datos.fecha_actualizacion=fechaVieja,Hoja.actualizar('Base_Legal',idViejo,datos)):(datos.id=nuevoId(),datos.fecha_actualizacion=new Date().toISOString(),Hoja.escribir('Base_Legal',datos));
  operacion.then(function(){toast(idViejo?'Actualizado':'Creado','exito');nav('legal')}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;}});
}

/* ===========================================================
 *  PANTALLA: WHATSAPP GENERATOR
 * =========================================================== */
function pantallaWhatsApp(){
  window._waRecomendada=null;window._waEconomica=null;
  renderizar('WhatsApp','<div id="wa-contenido">'+cargando()+'</div>','home');
  Hoja.leer('Auditorias').then(function(data){window._cacheWA=data.reverse();waPaso1()}).catch(function(e){$i('wa-contenido').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function waRenderizarPasos(paso){
  var h='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:22px">💬</span><h1 class="st-h">Generador de Propuesta</h1></div><p class="st-sub">Comparativo para WhatsApp</p><div class="sts">';
  for(var i=1;i<=3;i++){h+='<div class="st-d '+(paso>i?'dn':paso===i?'act':'pd')+'">'+(paso>i?'✓':i)+'</div>';if(i<3)h+='<div class="st-l '+(paso>i?'dn':'')+'"></div>';}
  h+='</div>';return h;
}
function waPaso1(){
  $i('wa-contenido').innerHTML=waRenderizarPasos(1)+'<h3 class="sl">Paso 1: Opción RECOMENDADA</h3><input class="ip" id="wa-buscar" placeholder="Buscar..." style="margin-bottom:8px"><div id="wa-lista"></div>';
  waMostrarLista(window._cacheWA,'',false);$i('wa-buscar').oninput=function(){waMostrarLista(window._cacheWA,this.value,false)};
}
function waPaso2(){
  var rec=window._waRecomendada;
  $i('wa-contenido').innerHTML=waRenderizarPasos(2)+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 class="sl">Paso 2: Opción ECONÓMICA</h3><button class="btn bs bsm" onclick="window._waRecomendada=null;waPaso1()">Cambiar</button></div>'+
    '<div class="cd" style="border-color:var(--gold-dim);margin-bottom:10px"><span class="bg bg-g">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:14px;margin-top:4px">'+limpiar(rec.producto)+'</div></div>'+
    '<input class="ip" id="wa-buscar" placeholder="Buscar..." style="margin-bottom:8px"><div id="wa-lista"></div>';
  var filtrados=(window._cacheWA||[]).filter(function(a){return a.id!==rec.id});
  waMostrarLista(filtrados,'',true);$i('wa-buscar').oninput=function(){waMostrarLista(filtrados,this.value,true)};
}
function waPaso3(){
  var rec=window._waRecomendada,eco=window._waEconomica,texto=generarWhatsApp(rec,eco);
  $i('wa-contenido').innerHTML=waRenderizarPasos(3)+
    '<div class="g2" style="margin-bottom:10px"><div class="cd" style="border-color:var(--grn)"><span class="bg bg-gn">RECOMENDADA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px">'+limpiar(rec.producto)+'</div></div><div class="cd" style="border-color:var(--ylw)"><span class="bg bg-yw">ECONÓMICA</span><div class="fd" style="font-weight:700;font-size:13px;margin-top:4px">'+limpiar(eco.producto)+'</div></div></div>'+
    '<div class="wa" id="wa-preview">'+limpiar(texto)+'</div>'+
    '<div class="g2" style="margin-top:10px"><button class="btn bp bw" onclick="copiarWhatsApp()">📋 Copiar al Portapapeles</button><button class="btn bs bw" onclick="window.open(\'https://wa.me/?text=\'+encodeURIComponent($i(\'wa-preview\').textContent),\'_blank\')">💬 Abrir WhatsApp</button></div>'+
    '<button class="btn bs bw" style="margin-top:8px" onclick="window._waRecomendada=null;window._waEconomica=null;pantallaWhatsApp()">🔄 Nuevo comparativo</button>';
}
function waMostrarLista(data,query,esEconomica){
  query=(query||'').toLowerCase();var filtrados=data.filter(function(a){return!query||(a.producto||'').toLowerCase().indexOf(query)!==-1||(a.proveedor_nombre||'').toLowerCase().indexOf(query)!==-1});
  var el=$i('wa-lista');if(!el)return;if(!filtrados.length){el.innerHTML='<p style="color:var(--dim);font-size:13px;padding:16px;text-align:center">Sin auditorías</p>';return;}
  el.innerHTML=filtrados.map(function(a){return'<div class="li" style="margin-bottom:6px" onclick="waSeleccionar('+JSON.stringify(esEconomica)+',\''+limpiar(a.id)+'\')"><div style="min-width:30px">'+semaforo(a.veredicto_global,'s',false)+'</div><div class="li-b"><div class="li-t">'+limpiar(a.producto)+'</div><div class="li-s">'+limpiar(a.proveedor_nombre)+'</div></div></div>'}).join('');
}
function waSeleccionar(esEconomica,id){var a=Hoja.buscarPorId(window._cacheWA||[],id);if(!a)return;if(!esEconomica){window._waRecomendada=a;window._waEconomica=null;waPaso2();}else{window._waEconomica=a;waPaso3();}}
function copiarWhatsApp(){navigator.clipboard.writeText($i('wa-preview').textContent).then(function(){toast('Copiado','exito')}).catch(function(){toast('Selecciona y copia manualmente','error')});}

/* ===========================================================
 *  PANTALLA: USUARIOS
 * =========================================================== */
function pantallaUsuarios(){
  renderizar('Usuarios','<div id="usuarios-contenido">'+cargando()+'</div>','home');
  Hoja.leer('Usuarios',true).then(function(usuarios){
    var h='<h1 class="st-h">Gestión de Usuarios</h1><p class="st-sub">'+usuarios.length+' usuarios</p><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">';
    usuarios.forEach(function(u){
      var nombre=u.Nombre||'',activo=(u.Activo||'').toLowerCase();
      var estaActivo=(activo==='sí'||activo==='si'||activo==='s');
      h+='<div class="cd"><div style="display:flex;align-items:center;justify-content:space-between"><div><span class="fd" style="font-weight:700;font-size:14px">'+limpiar(nombre)+'</span> <span class="bg '+(estaActivo?'bg-gn':'bg-rd')+'">'+(estaActivo?'Activo':'Bloqueado')+'</span></div></div></div>';
    });
    h+='</div><h3 class="sl" style="margin-top:18px">Añadir Usuario</h3><div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">'+
      campoFormulario('nuevo_nombre','Nombre','')+campoFormulario('nuevo_clave','Clave','')+
      '<button class="btn bp bw" id="boton-nuevo-usuario" onclick="crearUsuario()">Crear Usuario</button></div>';
    $i('usuarios-contenido').innerHTML=h;
  }).catch(function(e){$i('usuarios-contenido').innerHTML='<p style="color:var(--red);font-size:13px">Error: '+limpiar(e.message)+'</p>'});
}
function crearUsuario(){
  var nombre=obtenerCampo('nuevo_nombre'),clave=obtenerCampo('nuevo_clave');if(!nombre||!clave){toast('Nombre y clave obligatorios','error');return;}
  var btn=$i('boton-nuevo-usuario');if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  Hoja.leer('Usuarios',true).then(function(usuarios){
    for(var i=0;i<usuarios.length;i++)if((usuarios[i].Nombre||'')===nombre){toast('Ese nombre ya existe','error');if(btn){btn.disabled=false;btn.textContent='Crear Usuario';}return;}
    Hoja.escribir('Usuarios',{Nombre:nombre,Clave:clave,Activo:'Sí'}).then(function(){toast('Usuario creado','exito');pantallaUsuarios()}).catch(function(e){toast('Error: '+e.message,'error');if(btn){btn.disabled=false;}});
  });
}

/* ===========================================================
 *  INICIO DE LA APP
 * =========================================================== */
document.addEventListener('DOMContentLoaded',function(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
  ruta();
});