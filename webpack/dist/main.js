(()=>{var o={m:{},u:o=>o+".main.js"};o.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(o){if("object"==typeof window)return window}}(),o.o=(o,t)=>Object.prototype.hasOwnProperty.call(o,t),(()=>{var t;o.g.importScripts&&(t=o.g.location+"");var e=o.g.document;if(!t&&e&&(e.currentScript&&(t=e.currentScript.src),!t)){var n=e.getElementsByTagName("script");n.length&&(t=n[n.length-1].src)}if(!t)throw new Error("Automatic publicPath is not supported in this browser");t=t.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),o.p=t})(),o.b=document.baseURI||self.location.href;var e="",n=console.log;if(console.log=function(o){e+="<p>"+JSON.stringify(arguments)+"</p>",n.apply(console,arguments)},window.Worker){var r=new URLSearchParams(window.location.search),a=parseInt(r.get("n")),c=r.get("dir"),s=[],l=0;for(t=Date.now(),i=0;i<a;i++)s[i]=new Worker(new URL(o.p+o.u(4),o.b)),s[i].onmessage=function(o){console.log(o.data),++l==a&&(t=Date.now()-t,console.log("finished in",t,"on average",t/a),document.write(e))},s[i].postMessage([i+1,window.location.protocol,window.location.hostname,window.location.port,c])}})();