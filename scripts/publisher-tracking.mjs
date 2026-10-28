/** Static-site publisher policy: only HTTPS production hosts may load integrations.
 * A static noscript iframe cannot inspect protocol/hostname. The noscript fallback
 * is intentionally inert, preserving the local-preview zero-network requirement.
 */
export const PUBLISHER_IDS = Object.freeze({gtm:'GTM-NV2WWQXB',ga:'G-2ZYSF0173P',ads:'ca-pub-9767176956440077',cf:'9f3423bb0d034d91bbe1a12afeff2429'});
export function publisherHead() {
  return `<!-- publisher-tracking:start -->
<script data-publisher-bootstrap>
(function(w,d){
  'use strict';
  var host=String(w.location.hostname||'').toLowerCase();
  if(w.location.protocol!=='https:' || !(host==='nanacompany.github.io'||host==='nanalab.kr'||host.endsWith('.nanalab.kr')))return;
  if(w.__nanaPublisherLoaded)return;
  w.__nanaPublisherLoaded=true;
  var ids={gtm:'${PUBLISHER_IDS.gtm}',ga:'${PUBLISHER_IDS.ga}',ads:'${PUBLISHER_IDS.ads}',cf:'${PUBLISHER_IDS.cf}'};
  function add(src,attrs){
    var all=d.querySelectorAll('script[src]');
    for(var i=0;i<all.length;i++)if(all[i].src===src)return all[i];
    var s=d.createElement('script');s.async=true;s.src=src;
    Object.keys(attrs||{}).forEach(function(k){s.setAttribute(k,attrs[k]);});
    d.head.appendChild(s);return s;
  }
  w.dataLayer=w.dataLayer||[];
  w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};
  w.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
  add('https://www.googletagmanager.com/gtm.js?id='+ids.gtm);
  add('https://www.googletagmanager.com/gtag/js?id='+ids.ga);
  // Suppress automatic full URL/referrer collection; never pass game input here.
  w.gtag('js',new Date());
  w.gtag('config',ids.ga,{send_page_view:false,page_location:w.location.origin+w.location.pathname,page_referrer:''});
  w.gtag('event','page_view',{page_location:w.location.origin+w.location.pathname,page_referrer:'',page_title:d.title});
  add('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+ids.ads,{crossorigin:'anonymous'});
  function beacon(){
    if(d.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]'))return;
    add('https://static.cloudflareinsights.com/beacon.min.js',{'data-cf-beacon':JSON.stringify({token:ids.cf})});
  }
  // Delay until the document is parsed so an edge-injected beacon is reused.
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',beacon,{once:true});else beacon();
})(window,document);
</script>
<!-- publisher-tracking:end -->`;
}
const TRACKING = /(?:googletagmanager\.com|google-analytics\.com|googlesyndication\.com|cloudflareinsights\.com|\bGTM-[A-Z0-9]+\b|\bG-[A-Z0-9]{6,}\b|ca-pub-\d+|\bgtag\s*\(|data-cf-beacon|\badsbygoogle\b)/i;
export function completeTracking(html) {
  if(typeof html!=='string')throw new TypeError('HTML must be a string');
  if(!/<html\b/i.test(html))return html;
  let clean=html.replace(/<!-- publisher-tracking:start -->[\s\S]*?<!-- publisher-tracking:end -->\s*/g,'').replace(/<!-- publisher-noscript:start -->[\s\S]*?<!-- publisher-noscript:end -->\s*/g,'');
  clean=clean.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, block=>TRACKING.test(block)?'':block);
  clean=clean.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, block=>TRACKING.test(block)?'':block);
  clean=clean.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, block=>TRACKING.test(block)?'':block);
  clean=clean.replace(/<link\b[^>]*>/gi, block=>TRACKING.test(block)?'':block);
  clean=clean.replace(/<!--\s*\/?(?:NaNa publisher:|Google (?:Tag Manager|Analytics)|Cloudflare Web Analytics)[\s\S]*?-->/gi,'');
  if(!/<head\b/i.test(clean))clean=clean.replace(/<html\b[^>]*>/i,m=>`${m}<head></head>`);
  if(!/<\/head\s*>/i.test(clean))throw new Error('HTML head is not closed');
  // Remove trailing whitespace before the anchor for byte-stable repeated builds.
  clean=clean.replace(/\s*<\/head\s*>/i,`\n${publisherHead()}\n</head>`);
  const fallback='<!-- publisher-noscript:start --><noscript data-publisher-gtm-fallback="GTM-NV2WWQXB"><!-- GTM noscript iframe omitted: static HTML cannot restrict iframe requests to production HTTPS. --></noscript><!-- publisher-noscript:end -->';
  if(/<body\b[^>]*>/i.test(clean))clean=clean.replace(/<body\b[^>]*>\s*/i,m=>m.trimEnd()+`\n${fallback}\n`);
  else throw new Error('HTML body is required');
  return clean;
}
