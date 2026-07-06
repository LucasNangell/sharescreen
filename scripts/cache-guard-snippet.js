/**
 * Gera o script inline inserido no <head> de host/client a cada build.
 * Limpa dados locais do ShareScreen quando o buildId de produção muda.
 */
export function makeCacheGuardScript(buildId) {
  return `(function(){
var BUILD_ID=${JSON.stringify(buildId)};
var KEY='sharescreen_build_id';
var RELOAD_KEY='sharescreen_cache_reload';
try{
  if(sessionStorage.getItem(RELOAD_KEY)===BUILD_ID){sessionStorage.removeItem(RELOAD_KEY);return;}
  var stored=localStorage.getItem(KEY);
  if(stored&&stored!==BUILD_ID){
    for(var i=localStorage.length-1;i>=0;i--){
      var k=localStorage.key(i);
      if(k&&k.indexOf('sharescreen')===0)localStorage.removeItem(k);
    }
    sessionStorage.clear();
    document.cookie.split(';').forEach(function(c){
      var n=(c.split('=')[0]||'').trim();
      if(!n||n==='ss_session')return;
      document.cookie=n+'=; Max-Age=0; path=/';
      document.cookie=n+'=; Max-Age=0; path=/; domain='+location.hostname;
    });
    if(window.caches&&caches.keys){
      caches.keys().then(function(ns){return Promise.all(ns.map(function(n){return caches.delete(n);}));}).catch(function(){});
    }
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){
      navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});}).catch(function(){});
    }
    localStorage.setItem(KEY,BUILD_ID);
    sessionStorage.setItem(RELOAD_KEY,BUILD_ID);
    var u=new URL(location.href);
    u.searchParams.set('_sv',BUILD_ID);
    location.replace(u.toString());
    return;
  }
  if(!stored)localStorage.setItem(KEY,BUILD_ID);
}catch(e){}
})();`;
}
