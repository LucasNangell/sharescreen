var Bh=Object.create;var pc=Object.defineProperty;var Mh=Object.getOwnPropertyDescriptor;var Dh=Object.getOwnPropertyNames;var Ph=Object.getPrototypeOf,Uh=Object.prototype.hasOwnProperty;var mt=(M=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(M,{get:(N,L)=>(typeof require<"u"?require:N)[L]}):M)(function(M){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+M+'" is not supported')});var it=(M,N)=>()=>(N||M((N={exports:{}}).exports,N),N.exports);var Nh=(M,N,L,G)=>{if(N&&typeof N=="object"||typeof N=="function")for(let H of Dh(N))!Uh.call(M,H)&&H!==L&&pc(M,H,{get:()=>N[H],enumerable:!(G=Mh(N,H))||G.enumerable});return M};var Lh=(M,N,L)=>(L=M!=null?Bh(Ph(M)):{},Nh(N||!M||!M.__esModule?pc(L,"default",{value:M,enumerable:!0}):L,M));var _n=it(qa=>{"use strict";Object.defineProperty(qa,"__esModule",{value:!0});qa.baseAssetPath=void 0;var qh=typeof window<"u"&&typeof window.document<"u",cc=qh?window.document.currentScript:null,hc="/";cc&&(hc=cc.src.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^/]+$/,"/"));qa.baseAssetPath=hc});var Fa=it(Va=>{"use strict";Object.defineProperty(Va,"__esModule",{value:!0});Va.defaultModelFetcher=void 0;var Vh=M=>fetch(M).then(N=>N.arrayBuffer());Va.defaultModelFetcher=Vh});var hi=it(Wa=>{"use strict";Object.defineProperty(Wa,"__esModule",{value:!0});Wa.log=void 0;var bn=M=>N=>{console.log(`VAD | ${M} >`,N)};Wa.log={error:bn("error"),debug:bn("debug"),warn:bn("warn")}});var wa=it(Ga=>{"use strict";Object.defineProperty(Ga,"__esModule",{value:!0});Ga.Message=void 0;var fc;(function(M){M.AudioFrame="AUDIO_FRAME",M.SpeechStart="SPEECH_START",M.VADMisfire="VAD_MISFIRE",M.SpeechEnd="SPEECH_END",M.SpeechStop="SPEECH_STOP",M.SpeechRealStart="SPEECH_REAL_START",M.FrameProcessed="FRAME_PROCESSED"})(fc||(Ga.Message=fc={}))});var ja=it(dr=>{"use strict";Object.defineProperty(dr,"__esModule",{value:!0});dr.FrameProcessor=dr.validateOptions=dr.defaultFrameProcessorOptions=void 0;var _a=hi(),Hr=wa();dr.defaultFrameProcessorOptions={positiveSpeechThreshold:.3,negativeSpeechThreshold:.25,preSpeechPadMs:800,redemptionMs:1400,minSpeechMs:400,submitUserSpeechOnPause:!1};function Fh(M){(M.positiveSpeechThreshold<0||M.positiveSpeechThreshold>1)&&_a.log.error("positiveSpeechThreshold should be a number between 0 and 1"),(M.negativeSpeechThreshold<0||M.negativeSpeechThreshold>M.positiveSpeechThreshold)&&_a.log.error("negativeSpeechThreshold should be between 0 and positiveSpeechThreshold"),M.preSpeechPadMs<0&&_a.log.error("preSpeechPadMs should be positive"),M.redemptionMs<0&&_a.log.error("redemptionMs should be positive"),M.minSpeechMs<0&&_a.log.error("minSpeechMs should be positive")}dr.validateOptions=Fh;var mc=M=>{let N=M.reduce((G,H)=>(G.push(G.at(-1)+H.length),G),[0]),L=new Float32Array(N.at(-1));return M.forEach((G,H)=>{let z=N[H];L.set(G,z)}),L};function gc(M,N){let L=Math.floor(M.redemptionMs/N),G=Math.floor(M.preSpeechPadMs/N),H=Math.floor(M.minSpeechMs/N);return{redemptionFrames:L,preSpeechPadFrames:G,minSpeechFrames:H}}var $n=class{constructor(N,L,G,H){this.modelProcessFunc=N,this.modelResetFunc=L,this.options=G,this.msPerFrame=H,this.speaking=!1,this.redemptionCounter=0,this.speechFrameCount=0,this.active=!1,this.speechRealStartFired=!1,this.setOptions=ee=>{this.options={...this.options,...ee};let{redemptionFrames:me,preSpeechPadFrames:we,minSpeechFrames:be}=gc(this.options,this.msPerFrame);this.redemptionFrames=me,this.preSpeechPadFrames=we,this.minSpeechFrames=be},this.reset=()=>{this.speaking=!1,this.speechRealStartFired=!1,this.audioBuffer=[],this.modelResetFunc(),this.redemptionCounter=0,this.speechFrameCount=0},this.pause=ee=>{this.active=!1,this.options.submitUserSpeechOnPause?this.endSegment(ee):this.reset()},this.resume=()=>{this.active=!0},this.endSegment=ee=>{let me=this.audioBuffer;this.audioBuffer=[];let we=this.speaking;if(this.reset(),we)if(me.reduce((je,$t)=>$t.isSpeech?je+1:je,0)>=this.minSpeechFrames){let je=mc(me.map($t=>$t.frame));ee({msg:Hr.Message.SpeechEnd,audio:je})}else ee({msg:Hr.Message.VADMisfire});return{}},this.process=async(ee,me)=>{if(!this.active)return;let we=await this.modelProcessFunc(ee),be=we.isSpeech>=this.options.positiveSpeechThreshold;if(me({probs:we,msg:Hr.Message.FrameProcessed,frame:ee}),this.audioBuffer.push({frame:ee,isSpeech:be}),be&&(this.speechFrameCount++,this.redemptionCounter=0),be&&!this.speaking&&(this.speaking=!0,me({msg:Hr.Message.SpeechStart})),this.speaking&&this.speechFrameCount===this.minSpeechFrames&&!this.speechRealStartFired&&(this.speechRealStartFired=!0,me({msg:Hr.Message.SpeechRealStart})),we.isSpeech<this.options.negativeSpeechThreshold&&this.speaking&&++this.redemptionCounter>=this.redemptionFrames){this.redemptionCounter=0,this.speechFrameCount=0,this.speaking=!1,this.speechRealStartFired=!1;let je=this.audioBuffer;if(this.audioBuffer=[],je.reduce((Ie,ut)=>ut.isSpeech?Ie+1:Ie,0)>=this.minSpeechFrames){let Ie=mc(je.map(ut=>ut.frame));me({msg:Hr.Message.SpeechEnd,audio:Ie})}else me({msg:Hr.Message.VADMisfire})}if(!this.speaking){for(;this.audioBuffer.length>this.preSpeechPadFrames;)this.audioBuffer.shift();this.speechFrameCount=0}},this.audioBuffer=[];let{redemptionFrames:z,preSpeechPadFrames:se,minSpeechFrames:ye}=gc(this.options,this.msPerFrame);this.redemptionFrames=z,this.preSpeechPadFrames=se,this.minSpeechFrames=ye,this.reset()}};dr.FrameProcessor=$n});var bc=it((_c,vn)=>{"use strict";var Wh=(()=>{var M=Object.defineProperty,N=Object.getOwnPropertyDescriptor,L=Object.getOwnPropertyNames,G=Object.prototype.hasOwnProperty,H=(e=>typeof mt<"u"?mt:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof mt<"u"?mt:t)[r]}):e)(function(e){if(typeof mt<"u")return mt.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),z=(e,t)=>()=>(e&&(t=e(e=0)),t),se=(e,t)=>{for(var r in t)M(e,r,{get:t[r],enumerable:!0})},ye=(e,t,r,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of L(t))!G.call(e,a)&&a!==r&&M(e,a,{get:()=>t[a],enumerable:!(i=N(t,a))||i.enumerable});return e},ee=e=>ye(M({},"__esModule",{value:!0}),e),me,we,be,je,$t,Ie=z(()=>{"use strict";me=new Map,we=[],be=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let i=me.get(e);if(i===void 0)me.set(e,{backend:t,priority:r});else{if(i.priority>r)return;if(i.priority===r&&i.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=we.indexOf(e);a!==-1&&we.splice(a,1);for(let s=0;s<we.length;s++)if(me.get(we[s]).priority<=r){we.splice(s,0,e);return}we.push(e)}return}throw new TypeError("not a valid backend")},je=async e=>{let t=me.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(i){return r||(t.error=`${i}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},$t=async e=>{let t=e.executionProviders||[],r=t.map(u=>typeof u=="string"?u:u.name),i=r.length===0?we:r,a,s=[],n=new Set;for(let u of i){let l=await je(u);typeof l=="string"?s.push({name:u,err:l}):(a||(a=l),a===l&&n.add(u))}if(!a)throw new Error(`no available backend found. ERR: ${s.map(u=>`[${u.name}] ${u.err}`).join(", ")}`);for(let{name:u,err:l}of s)r.includes(u)&&console.warn(`removing requested execution provider "${u}" from session options because it is not available: ${l}`);let o=t.filter(u=>n.has(typeof u=="string"?u:u.name));return[a,new Proxy(e,{get:(u,l)=>l==="executionProviders"?o:Reflect.get(u,l)})]}}),ut=z(()=>{"use strict";Ie()}),pr,Zr=z(()=>{"use strict";pr="1.27.0"}),cr,xe,fi=z(()=>{"use strict";Zr(),cr="warning",xe={wasm:{},webgl:{},webgpu:{},versions:{common:pr},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);cr=e}},get logLevel(){return cr}},Object.defineProperty(xe,"logLevel",{enumerable:!0})}),he,es=z(()=>{"use strict";fi(),he=xe}),mi,gi,ts=z(()=>{"use strict";mi=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let i=r.getContext("2d");if(i!=null){let a,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],s=e.dims[3]):(a=e.dims[3],s=e.dims[2]);let n=(t==null?void 0:t.format)!==void 0?t.format:"RGB",o=t==null?void 0:t.norm,u,l;o===void 0||o.mean===void 0?u=[255,255,255,255]:typeof o.mean=="number"?u=[o.mean,o.mean,o.mean,o.mean]:(u=[o.mean[0],o.mean[1],o.mean[2],0],o.mean[3]!==void 0&&(u[3]=o.mean[3])),o===void 0||o.bias===void 0?l=[0,0,0,0]:typeof o.bias=="number"?l=[o.bias,o.bias,o.bias,o.bias]:(l=[o.bias[0],o.bias[1],o.bias[2],0],o.bias[3]!==void 0&&(l[3]=o.bias[3]));let d=s*a,p=0,h=d,g=d*2,f=-1;n==="RGBA"?(p=0,h=d,g=d*2,f=d*3):n==="RGB"?(p=0,h=d,g=d*2):n==="RBG"&&(p=0,g=d,h=d*2);for(let w=0;w<s;w++)for(let $=0;$<a;$++){let _=(e.data[p++]-l[0])*u[0],y=(e.data[h++]-l[1])*u[1],x=(e.data[g++]-l[2])*u[2],S=f===-1?255:(e.data[f++]-l[3])*u[3];i.fillStyle="rgba("+_+","+y+","+x+","+S+")",i.fillRect($,w,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},gi=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),i;if(r!=null){let a,s,n;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],s=e.dims[1],n=e.dims[3]):(a=e.dims[3],s=e.dims[2],n=e.dims[1]);let o=t!==void 0&&t.format!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,l,d;u===void 0||u.mean===void 0?l=[255,255,255,255]:typeof u.mean=="number"?l=[u.mean,u.mean,u.mean,u.mean]:(l=[u.mean[0],u.mean[1],u.mean[2],255],u.mean[3]!==void 0&&(l[3]=u.mean[3])),u===void 0||u.bias===void 0?d=[0,0,0,0]:typeof u.bias=="number"?d=[u.bias,u.bias,u.bias,u.bias]:(d=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(d[3]=u.bias[3]));let p=s*a;if(t!==void 0&&(t.format!==void 0&&n===4&&t.format!=="RGBA"||n===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let h=4,g=0,f=1,w=2,$=3,_=0,y=p,x=p*2,S=-1;o==="RGBA"?(_=0,y=p,x=p*2,S=p*3):o==="RGB"?(_=0,y=p,x=p*2):o==="RBG"&&(_=0,x=p,y=p*2),i=r.createImageData(a,s);for(let I=0;I<s*a;g+=h,f+=h,w+=h,$+=h,I++)i.data[g]=(e.data[_++]-d[0])*l[0],i.data[f]=(e.data[y++]-d[1])*l[1],i.data[w]=(e.data[x++]-d[2])*l[2],i.data[$]=S===-1?255:(e.data[S++]-d[3])*l[3]}else throw new Error("Can not access image data");return i}}),Ht,yi,wi,_i,bi,$i,rs=z(()=>{"use strict";fr(),Ht=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:i}=t,a=t.norm??{mean:255,bias:0},s,n;typeof a.mean=="number"?s=[a.mean,a.mean,a.mean,a.mean]:s=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?n=[a.bias,a.bias,a.bias,a.bias]:n=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let o=t.format!==void 0?t.format:"RGBA",u=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*i,d=u==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),p=4,h=0,g=1,f=2,w=3,$=0,_=l,y=l*2,x=-1;o==="RGB"&&(p=3,h=0,g=1,f=2,w=-1),u==="RGBA"?x=l*3:u==="RBG"?($=0,y=l,_=l*2):u==="BGR"&&(y=0,_=l,$=l*2);for(let S=0;S<l;S++,h+=p,f+=p,g+=p,w+=p)d[$++]=(e[h]+n[0])/s[0],d[_++]=(e[g]+n[1])/s[1],d[y++]=(e[f]+n[2])/s[2],x!==-1&&w!==-1&&(d[x++]=(e[w]+n[3])/s[3]);return u==="RGBA"?new Ce("float32",d,[1,4,r,i]):new Ce("float32",d,[1,3,r,i])},yi=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,i=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,s=typeof e=="string",n,o=t??{},u=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=d=>typeof HTMLCanvasElement<"u"&&d instanceof HTMLCanvasElement||d instanceof OffscreenCanvas?d.getContext("2d"):null;if(r){let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let h=e.height,g=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(h=t.resizedHeight,g=t.resizedWidth),t!==void 0){if(o=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");o.tensorFormat="RGBA",o.height=h,o.width=g}else o.tensorFormat="RGBA",o.height=h,o.width=g;p.drawImage(e,0,0),n=p.getImageData(0,0,g,h).data}else throw new Error("Can not access image data")}else if(i){let d,p;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(d=t.resizedHeight,p=t.resizedWidth):(d=e.height,p=e.width),t!==void 0&&(o=t),o.format="RGBA",o.height=d,o.width=p,t!==void 0){let h=u();h.width=p,h.height=d;let g=l(h);if(g!=null)g.putImageData(e,0,0),n=g.getImageData(0,0,p,d).data;else throw new Error("Can not access image data")}else n=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let d=u();d.width=e.width,d.height=e.height;let p=l(d);if(p!=null){let h=e.height,g=e.width;return p.drawImage(e,0,0,g,h),n=p.getImageData(0,0,g,h).data,o.height=h,o.width=g,Ht(n,o)}else throw new Error("Can not access image data")}else{if(s)return new Promise((d,p)=>{let h=u(),g=l(h);if(!e||!g)return p();let f=new Image;f.crossOrigin="Anonymous",f.src=e,f.onload=()=>{h.width=f.width,h.height=f.height,g.drawImage(f,0,0,h.width,h.height);let w=g.getImageData(0,0,h.width,h.height);o.height=h.height,o.width=h.width,d(Ht(w.data,o))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(n!==void 0)return Ht(n,o);throw new Error("Input data provided is not supported - aborted tensor creation")},wi=(e,t)=>{let{width:r,height:i,download:a,dispose:s}=t,n=[1,i,r,4];return new Ce({location:"texture",type:"float32",texture:e,dims:n,download:a,dispose:s})},_i=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:s}=t;return new Ce({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:i,download:a,dispose:s})},bi=(e,t)=>{let{dataType:r,dims:i,download:a,dispose:s}=t;return new Ce({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:i,download:a,dispose:s})},$i=(e,t,r)=>new Ce({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),at,Tt,hr,vi,is=z(()=>{"use strict";at=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Tt=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),hr=!1,vi=()=>{if(!hr){hr=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,i=typeof r<"u"&&r.from;e&&(at.set("int64",BigInt64Array),Tt.set(BigInt64Array,"int64")),t&&(at.set("uint64",BigUint64Array),Tt.set(BigUint64Array,"uint64")),i?(at.set("float16",r),Tt.set(r,"float16")):at.set("float16",Uint16Array)}}}),xi,Si,as=z(()=>{"use strict";fr(),xi=e=>{let t=1;for(let r=0;r<e.length;r++){let i=e[r];if(typeof i!="number"||!Number.isSafeInteger(i))throw new TypeError(`dims[${r}] must be an integer, got: ${i}`);if(i<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${i}`);t*=i}return t},Si=(e,t)=>{switch(e.location){case"cpu":return new Ce(e.type,e.data,t);case"cpu-pinned":return new Ce({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Ce({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Ce({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Ce({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Ce,fr=z(()=>{"use strict";ts(),rs(),is(),as(),Ce=class{constructor(e,t,r){vi();let i,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,i=e.type,a=e.dims,e.location){case"cpu-pinned":{let n=at.get(i);if(!n)throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);if(!(e.data instanceof n))throw new TypeError(`buffer should be of type ${n.name}`);this.cpuData=e.data;break}case"texture":{if(i!=="float32")throw new TypeError(`unsupported type "${i}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(i!=="float32"&&i!=="float16"&&i!=="int32"&&i!=="int64"&&i!=="uint32"&&i!=="uint64"&&i!=="int8"&&i!=="uint8"&&i!=="bool"&&i!=="uint4"&&i!=="int4")throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let n,o;if(typeof e=="string")if(i=e,o=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");n=t}else{let u=at.get(e);if(u===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&u===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${u.name} as data.`);e==="uint64"||e==="int64"?n=u.from(t,BigInt):n=u.from(t)}else if(t instanceof u)n=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")n=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&u!==Uint16Array)n=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${i} tensor's data must be type of ${u}`)}else if(o=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let u=typeof e[0];if(u==="string")i="string",n=e;else if(u==="boolean")i="bool",n=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${u}.`)}else if(e instanceof Uint8ClampedArray)i="uint8",n=Uint8Array.from(e);else{let u=Tt.get(e.constructor);if(u===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);i=u,n=e}if(o===void 0)o=[n.length];else if(!Array.isArray(o))throw new TypeError("A tensor's dims must be a number array");a=o,this.cpuData=n,this.dataLocation="cpu"}let s=xi(a);if(this.cpuData&&s!==this.cpuData.length&&!((i==="uint4"||i==="int4")&&Math.ceil(s/2)===this.cpuData.length))throw new Error(`Tensor's size(${s}) does not match data length(${this.cpuData.length}).`);this.type=i,this.dims=a,this.size=s}static async fromImage(e,t){return yi(e,t)}static fromTexture(e,t){return wi(e,t)}static fromGpuBuffer(e,t){return _i(e,t)}static fromMLTensor(e,t){return bi(e,t)}static fromPinnedBuffer(e,t,r){return $i(e,t,r)}toDataURL(e){return mi(this,e)}toImageData(e){return gi(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Si(this,e)}}}),De,Ti=z(()=>{"use strict";fr(),De=Ce}),Lt,mr,He,Fe,Je,et,Ei=z(()=>{"use strict";fi(),Lt=(e,t)=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.timeStamp(`${e}::ORT::${t}`)},mr=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],i=!1;for(let s=0;s<r.length;s++){if(i&&!r[s].includes("TRACE_FUNC")){let n=`FUNC_${e}::${r[s].trim().split(" ")[1]}`;t&&(n+=`::${t}`),Lt("CPU",n);return}r[s].includes("TRACE_FUNC")&&(i=!0)}},He=e=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||mr("BEGIN",e)},Fe=e=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||mr("END",e)},Je=e=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.time(`ORT::${e}`)},et=e=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.timeEnd(`ORT::${e}`)}}),ki,ss=z(()=>{"use strict";Ie(),Ti(),Ei(),ki=class yc{constructor(t){this.handler=t}async run(t,r,i){He(),Je("InferenceSession.run");let a={},s={};if(typeof t!="object"||t===null||t instanceof De||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let n=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof De)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");n=!1;for(let l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,d=Object.getOwnPropertyNames(r);for(let p of this.outputNames)if(d.indexOf(p)!==-1){let h=r[p];(h===null||h instanceof De)&&(l=!0,n=!1,a[p]=h)}if(l){if(typeof i=="object"&&i!==null)s=i;else if(typeof i<"u")throw new TypeError("'options' must be an object.")}else s=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(n)for(let l of this.outputNames)a[l]=null;let o=await this.handler.run(t,a,s),u={};for(let l in o)if(Object.hasOwnProperty.call(o,l)){let d=o[l];d instanceof De?u[l]=d:u[l]=new De(d.type,d.data,d.dims)}return et("InferenceSession.run"),Fe(),u}async release(){return this.handler.dispose()}static async create(t,r,i,a){He(),Je("InferenceSession.create");let s,n={};if(typeof t=="string"){if(s=t,typeof r=="object"&&r!==null)n=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(s=t,typeof r=="object"&&r!==null)n=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let d=t,p=0,h=t.byteLength;if(typeof r=="object"&&r!==null)n=r;else if(typeof r=="number"){if(p=r,!Number.isSafeInteger(p))throw new RangeError("'byteOffset' must be an integer.");if(p<0||p>=d.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${d.byteLength}).`);if(h=t.byteLength-p,typeof i=="number"){if(h=i,!Number.isSafeInteger(h))throw new RangeError("'byteLength' must be an integer.");if(h<=0||p+h>d.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${d.byteLength-p}].`);if(typeof a=="object"&&a!==null)n=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof i<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");s=new Uint8Array(d,p,h)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[o,u]=await $t(n),l=await o.createInferenceSessionHandler(s,u);return et("InferenceSession.create"),Fe(),new yc(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),gr,ns=z(()=>{"use strict";ss(),gr=ki}),os=z(()=>{"use strict"}),us=z(()=>{"use strict"}),ls=z(()=>{"use strict"}),ds=z(()=>{"use strict"}),Ii={};se(Ii,{InferenceSession:()=>gr,TRACE:()=>Lt,TRACE_EVENT_BEGIN:()=>Je,TRACE_EVENT_END:()=>et,TRACE_FUNC_BEGIN:()=>He,TRACE_FUNC_END:()=>Fe,Tensor:()=>De,env:()=>he,registerBackend:()=>be});var We=z(()=>{"use strict";ut(),es(),ns(),Ti(),os(),us(),Ei(),ls(),ds()}),yr=z(()=>{"use strict"}),zi={};se(zi,{default:()=>Ci});var wr,_r,Ci,ps=z(()=>{"use strict";var e;Qp(),lt(),Sr(),wr="ort-wasm-proxy-worker",_r=((e=globalThis.self)==null?void 0:e.name)===wr,_r&&(self.onmessage=t=>{let{type:r,in:i}=t.data;try{switch(r){case"init-wasm":kr(i.wasm).then(()=>{nn(i).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:s}=i;on(s,a).then(()=>{postMessage({type:r})},n=>{postMessage({type:r,err:n})});break}case"copy-from":{let{buffer:a}=i,s=Ua(a);postMessage({type:r,out:s});break}case"create":{let{model:a,options:s}=i;ln(a,s).then(n=>{postMessage({type:r,out:n})},n=>{postMessage({type:r,err:n})});break}case"release":dn(i),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:s,inputs:n,outputIndices:o,options:u}=i;cn(a,s,n,o,new Array(o.length).fill(null),u).then(l=>{l.some(d=>d[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:l},fn([...n,...l]))},l=>{postMessage({type:r,err:l})});break}case"end-profiling":hn(i),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),Ci=_r?null:t=>new Worker(t??Ae,{type:"classic",name:wr})}),Ai,Oi,Ae,br,Kt,Ri,Bi,$r,Mi,vr,Di,xr,Pi,Sr=z(()=>{"use strict";yr(),Ai=typeof location>"u"?void 0:location.origin,Oi=()=>{var e,t;return typeof document<"u"?(e=document.currentScript)==null?void 0:e.src:typeof self<"u"?(t=self.location)==null?void 0:t.href:void 0},Ae=Oi(),br=()=>{if(Ae&&!Ae.startsWith("blob:"))return Ae.substring(0,Ae.lastIndexOf("/")+1)},Kt=(e,t)=>{try{let r=t??Ae;return(r?new URL(e,r):new URL(e)).origin===Ai}catch{return!1}},Ri=(e,t)=>{let r=t??Ae;try{return(r?new URL(e,r):new URL(e)).href}catch{return}},Bi=(e,t)=>`${t??"./"}${e}`,$r=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Mi=async e=>(await import(e)).default,vr=(ps(),ee(zi)).default,Di=async()=>{if(!Ae)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Kt(Ae))return[void 0,vr()];let e=await $r(Ae);return[e,vr(e)]},xr=void 0,Pi=async(e,t,r,i)=>{let a=xr&&!(e||t);if(a)if(Ae)a=Kt(Ae)||i&&!r;else if(i&&!r)a=!0;else throw new Error("cannot determine the script source URL.");if(a)return[void 0,xr];{let s="ort-wasm-simd-threaded.jsep.mjs",n=e??Ri(s,t),o=r&&n&&!Kt(n,t),u=o?await $r(n):n??Bi(s,t);return[o?u:void 0,await Mi(u)]}}}),Tr,Zt,Et,Er,Ui,Ni,Li,kr,pe,lt=z(()=>{"use strict";Sr(),Zt=!1,Et=!1,Er=!1,Ui=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Ni=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Li=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},kr=async e=>{if(Zt)return Promise.resolve();if(Et)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Er)throw new Error("previous call to 'initializeWebAssembly()' failed.");Et=!0;let t=e.initTimeout,r=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Li())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Ni())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let i=Ui();r>1&&!i&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,s=typeof a=="string"?a:void 0,n=a==null?void 0:a.mjs,o=(n==null?void 0:n.href)??n,u=a==null?void 0:a.wasm,l=(u==null?void 0:u.href)??u,d=e.wasmBinary,[p,h]=await Pi(o,s,r>1,!!d||!!l),g=!1,f=[];if(t>0&&f.push(new Promise(w=>{setTimeout(()=>{g=!0,w()},t)})),f.push(new Promise((w,$)=>{let _={numThreads:r};if(d)_.wasmBinary=d,_.locateFile=y=>y;else if(l||s)_.locateFile=y=>l??s+y;else if(o&&o.indexOf("blob:")!==0)_.locateFile=y=>new URL(y,o).href;else if(p){let y=br();y&&(_.locateFile=x=>y+x)}h(_).then(y=>{Et=!1,Zt=!0,Tr=y,w(),p&&URL.revokeObjectURL(p)},y=>{Et=!1,Er=!0,$(y)})})),await Promise.race(f),g)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},pe=()=>{if(Zt&&Tr)return Tr;throw new Error("WebAssembly is not initialized yet.")}}),Pe,Qt,ue,Ir=z(()=>{"use strict";lt(),Pe=(e,t)=>{let r=pe(),i=r.lengthBytesUTF8(e)+1,a=r._malloc(i);return r.stringToUTF8(e,a,i),t.push(a),a},Qt=(e,t,r,i)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,s])=>{let n=t?t+a:a;if(typeof s=="object")Qt(s,n+".",r,i);else if(typeof s=="string"||typeof s=="number")i(n,s.toString());else if(typeof s=="boolean")i(n,s?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof s}`)})},ue=e=>{let t=pe(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetLastError(a,a+i);let s=Number(t.getValue(a,i===4?"i32":"i64")),n=t.getValue(a+i,"*"),o=n?t.UTF8ToString(n):"";throw new Error(`${e} ERROR_CODE: ${s}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(r)}}}),qi,cs=z(()=>{"use strict";lt(),Ir(),qi=e=>{let t=pe(),r=0,i=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log severity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let s=0;return(e==null?void 0:e.tag)!==void 0&&(s=Pe(e.tag,i)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,s),r===0&&ue("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&Qt(e.extra,"",new WeakSet,(n,o)=>{let u=Pe(n,i),l=Pe(o,i);t._OrtAddRunConfigEntry(r,u,l)!==0&&ue(`Can't set a run config entry: ${n} - ${o}.`)}),[r,i]}catch(s){throw r!==0&&t._OrtReleaseRunOptions(r),i.forEach(n=>t._free(n)),s}}}),Vi,Fi,Wi,st,Gi,ji,hs=z(()=>{"use strict";lt(),Ir(),Vi=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"layout":return 3;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Fi=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Wi=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},st=(e,t,r,i)=>{let a=Pe(t,i),s=Pe(r,i);pe()._OrtAddSessionConfigEntry(e,a,s)!==0&&ue(`Can't set a session config entry: ${t} - ${r}.`)},Gi=async(e,t,r)=>{let i=t.executionProviders;for(let a of i){let s=typeof a=="string"?a:a.name,n=[];switch(s){case"webnn":if(s="WEBNN",st(e,"session.disable_quant_qdq","1",r),st(e,"session.disable_qdq_constant_folding","1",r),typeof a!="string"){let p=a==null?void 0:a.deviceType;p&&st(e,"deviceType",p,r)}break;case"webgpu":if(s="JS",typeof a!="string"){let p=a;if(p!=null&&p.preferredLayout){if(p.preferredLayout!=="NCHW"&&p.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${p.preferredLayout}`);st(e,"preferredLayout",p.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${s}`)}let o=Pe(s,r),u=n.length,l=0,d=0;if(u>0){l=pe()._malloc(u*pe().PTR_SIZE),r.push(l),d=pe()._malloc(u*pe().PTR_SIZE),r.push(d);for(let p=0;p<u;p++)pe().setValue(l+p*pe().PTR_SIZE,n[p][0],"*"),pe().setValue(d+p*pe().PTR_SIZE,n[p][1],"*")}await pe()._OrtAppendExecutionProvider(e,o,l,d,u)!==0&&ue(`Can't append execution provider: ${s}.`)}},ji=async e=>{let t=pe(),r=0,i=[],a=e||{};Wi(a);try{let s=Vi(a.graphOptimizationLevel??"all"),n=Fi(a.executionMode??"sequential"),o=typeof a.logId=="string"?Pe(a.logId,i):0,u=a.logSeverityLevel??2;if(!Number.isInteger(u)||u<0||u>4)throw new Error(`log severity level is not valid: ${u}`);let l=a.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let d=typeof a.optimizedModelFilePath=="string"?Pe(a.optimizedModelFilePath,i):0;if(r=t._OrtCreateSessionOptions(s,!!a.enableCpuMemArena,!!a.enableMemPattern,n,!!a.enableProfiling,0,o,u,l,d),r===0&&ue("Can't create session options."),a.executionProviders&&await Gi(r,a,i),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);st(r,"enableGraphCapture",a.enableGraphCapture.toString(),i)}if(a.freeDimensionOverrides)for(let[p,h]of Object.entries(a.freeDimensionOverrides)){if(typeof p!="string")throw new Error(`free dimension override name must be a string: ${p}`);if(typeof h!="number"||!Number.isInteger(h)||h<0)throw new Error(`free dimension override value must be a non-negative integer: ${h}`);let g=Pe(p,i);t._OrtAddFreeDimensionOverride(r,g,h)!==0&&ue(`Can't set a free dimension override: ${p} - ${h}.`)}return a.extra!==void 0&&Qt(a.extra,"",new WeakSet,(p,h)=>{st(r,p,h,i)}),[r,i]}catch(s){throw r!==0&&t._OrtReleaseSessionOptions(r)!==0&&ue("Can't release session options."),i.forEach(n=>t._free(n)),s}}}),dt,pt,ct,zr,Cr,Ar,Or,Qr,de=z(()=>{"use strict";dt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},pt=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},ct=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],i=typeof t=="number"?t:t.reduce((a,s)=>a*s,1);return r>0?Math.ceil(i*r):void 0},zr=e=>{switch(e){case"float16":return typeof Float16Array<"u"?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Cr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Ar=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Or=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",Qr=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Rr,Hi=z(()=>{"use strict";yr(),Rr=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),i=r?parseInt(r,10):0;if(i<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),s;try{s=new ArrayBuffer(i)}catch(o){if(o instanceof RangeError){let u=Math.ceil(i/65536);s=new WebAssembly.Memory({initial:u,maximum:u}).buffer}else throw o}let n=0;for(;;){let{done:o,value:u}=await a.read();if(o)break;let l=u.byteLength;new Uint8Array(s,n,l).set(u),n+=l}return new Uint8Array(s,0,i)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Ki,Xr,Yr,qt,Jr,ei,_e,gt=z(()=>{"use strict";de(),Ki=["V","I","W","E","F"],Xr=(e,t)=>{console.log(`[${Ki[e]},${new Date().toISOString()}]${t}`)},Jr=(e,t)=>{Yr=e,qt=t},ei=(e,t)=>{let r=Cr(e),i=Cr(Yr);r>=i&&Xr(r,typeof t=="function"?t():t)},_e=(...e)=>{qt&&ei(...e)}}),ti,Vt,P,tr,ri,Zi,kt,ne=z(()=>{"use strict";ti=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},Vt=class{static calcShape(e,t,r=!1){let i=e.length,a=t.length;if(i===0)return t;if(a===0)return e;let s=Math.max(e.length,t.length),n=new Array(s);if(r){if(i<2||a<2)return;let o=ti.calcMatMulShape([e[i-2],e[i-1]],[t[a-2],t[a-1]]);if(o===void 0)return;[n[s-2],n[s-1]]=o}for(let o=r?3:1;o<=s;o++){let u=i-o<0?1:e[i-o],l=a-o<0?1:t[a-o];if(u!==l&&u>1&&l>1)return;let d=Math.max(u,l);if(u&&l)n[s-o]=Math.max(u,l);else{if(d>1)return;n[s-o]=0}}return n}static isValidBroadcast(e,t){let r=e.length,i=t.length;if(r>i)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[i-a])return!1;return!0}},P=class Ha{static size(t){return Ha.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let i=t.length;if(i===0)return[];let a=new Array(i),s=i-1;for(;s>=0;){if(t[s]%r===0){a[s]=t[s]/r;break}if(r%t[s]!==0)throw new Error("cannot convert shape");a[s]=1,r/=t[s],s--}for(s--;s>=0;s--)a[s]=t[s];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Ha.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Ha.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,i){let a=1;for(let s=r;s<i;s++){if(t[s]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=Number(t[s])}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let i=new Array(r);i[r-1]=1,i[r-2]=t[r-1];for(let a=r-3;a>=0;--a)i[a]=i[a+1]*t[a+1];return i}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(i=>this.normalizeAxis(i,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(i=>t[i]):t.slice().reverse()}static padShape(t,r){let i=t.length;return t.map((a,s)=>a+r[s]+r[s+i])}static areEqual(t,r){return t.length!==r.length?!1:t.every((i,a)=>i===r[a])}},tr=class ba{static adjustPoolAttributes(t,r,i,a,s,n){if(!t&&i.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let o=0;o<r.length-2;o++)o>=i.length?i.push(r[o+2]):i[o]=r[o+2];for(let o=0;o<i.length;o++)if(o<a.length){if(a[o]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let o=0;o<i.length;o++)if(o<s.length){if(s[o]<0)throw new Error("dilations should be greater than or equal to 1")}else s.push(1);for(let o=0;o<i.length*2;o++)if(o<n.length){if(n[o]<0)throw new Error("pad should be greater than or equal to 1")}else n.push(0);for(let o=0;o<i.length;o++){if(i[o]<=0)throw new Error("kernel shapes need to be greater than 0");if(n[o]>=i[o]||n[o+i.length]>=i[o])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,i,a,s,n,o){if(o){if(s.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let u=0;u<t.length-2;u++)ba.adjustPadAndReturnShape(t[u+(n?1:2)],r[u],i[u],a[u],s,u,u+t.length-2,o)}}static computePoolOutputShape(t,r,i,a,s,n,o){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let u=[r[0],r[1]];return ba.computeShapeHelper(t,r,u,i,a,s,n,o),u}static computeConvOutputShape(t,r,i,a,s,n,o){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let u=[t[0],r[0]];return ba.computeShapeHelper(!1,t,u,i,a,s,n,o),u}static computeShapeHelper(t,r,i,a,s,n,o,u){if(t)for(let l=0;l<r.length-2;l++)i.push(1);else for(let l=0;l<r.length-2;l++)i.push(ba.adjustPadAndReturnShape(r[l+2],a[l],s[l],n[l],o,l,l+r.length-2,u))}static adjustPadAndReturnShape(t,r,i,a,s,n,o,u){let l=i*(a-1)+1;if(u&&u!=="NOTSET")switch(u){case"VALID":return s[n]=0,s[o]=0,Math.floor((t-l)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(i!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let d=((t+r-1)/r-1)*r+a-t;return s[n]=Math.floor(u==="SAME_LOWER"?(d+1)/2:d/2),s[o]=d-s[n],Math.floor((t+d-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+s[n]+s[o]-l)/r+1)}},ri=class{static getShapeOfGemmResult(e,t,r,i,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let s,n,o;t?(s=e[1],n=e[0]):(s=e[0],n=e[1]);let u=-1;if(i?(o=r[0],u=1):(o=r[1],u=0),r[u]!==n)throw new Error("dimension mismatch");if(s<=0||o<=0||n<=0)throw new Error("invalid shape specified");if(a&&!Vt.isValidBroadcast(a,[s,o]))throw new Error("gemm: invalid bias shape for broadcast");return[s,o,n]}},Zi=-34028234663852886e22,kt=34028234663852886e22}),Ft,rr=z(()=>{"use strict";de(),Ft=(e,t)=>new(zr(t))(e)}),Xt,ir,Br,Mr,It,Wt,ii,ai,si,Qi,Xi,Sa=z(()=>{"use strict";de(),gt(),Xt=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),ir=(e,t)=>{if(t==="int32")return e;let r=Xt.get(t);if(!r)throw new Error(`WebNN backend does not support data type: ${t}`);let i=r/8;if(e.byteLength%i!==0)throw new Error(`Invalid Uint8Array length - must be a multiple of ${i}.`);let a=e.byteLength/i,s=new(zr(t))(e.buffer,e.byteOffset,a);switch(t){case"int64":case"uint64":{let n=new Int32Array(a);for(let o=0;o<a;o++){let u=s[o];if(u>2147483647n||u<-2147483648n)throw new Error("Can not convert int64 data to int32 - value out of range.");n[o]=Number(u)}return new Uint8Array(n.buffer)}case"int8":case"uint8":case"uint32":{if(t==="uint32"&&s.some(o=>o>2147483647))throw new Error("Can not convert uint32 data to int32 - value out of range.");let n=Int32Array.from(s,Number);return new Uint8Array(n.buffer)}default:throw new Error(`Unsupported data conversion from ${t} to 'int32'`)}},Br=(e,t)=>{if(t==="int32")return e;if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");let r=e.byteLength/4,i=new Int32Array(e.buffer,e.byteOffset,r);switch(t){case"int64":{let a=BigInt64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"uint64":{if(i.some(s=>s<0))throw new Error("Can not convert int32 data to uin64 - negative value found.");let a=BigUint64Array.from(i,BigInt);return new Uint8Array(a.buffer)}case"int8":{if(i.some(s=>s<-128||s>127))throw new Error("Can not convert int32 data to int8 - value out of range.");let a=Int8Array.from(i,Number);return new Uint8Array(a.buffer)}case"uint8":{if(i.some(a=>a<0||a>255))throw new Error("Can not convert int32 data to uint8 - value out of range.");return Uint8Array.from(i,Number)}case"uint32":{if(i.some(s=>s<0))throw new Error("Can not convert int32 data to uint32 - negative value found.");let a=Uint32Array.from(i,Number);return new Uint8Array(a.buffer)}default:throw new Error(`Unsupported data conversion from 'int32' to ${t}`)}},Mr=1,It=()=>Mr++,Wt=new Map([["int8","int32"],["uint8","int32"],["uint32","int32"],["int64","int32"]]),ii=(e,t)=>{let r=Xt.get(e);if(!r)throw new Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((i,a)=>i*a)*r/8):0},ai=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:r,tensor:i,dataType:a,shape:s,fallbackDataType:n}=e;this.sessionId=t,this.mlContext=r,this.mlTensor=i,this.dataType=a,this.tensorShape=s,this.fallbackDataType=n}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return ii(this.dataType,this.tensorShape)}destroy(){_e("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),r=Br(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(r);return}else return new Uint8Array(r).buffer}else return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,r){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===r.length&&this.tensorShape.every((i,a)=>i===r[a])}setIsDataConverted(e){this.isDataConverted=e}},si=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,r,i){let a=this.tensorManager.getMLContext(e),s=this.tensorManager.getMLOpSupportLimits(e),n;if(!(s!=null&&s.input.dataTypes.includes(t))){if(n=Wt.get(t),!n||(s==null?void 0:s.input.dataTypes.includes(n)))throw new Error(`WebNN backend does not support data type: ${t}`);_e("verbose",()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${n}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(a,t,r))return this.wrapper.tensor;if(i){if(this.wrapper.byteLength!==ii(t,r))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let o=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,r,o,!0,!0,n),i&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType)if(this.wrapper.fallbackType==="int32")t=ir(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else _e("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,r;if(this.activeUpload){let i=(t=this.wrapper)!=null&&t.isDataConverted?Br(this.activeUpload,(r=this.wrapper)==null?void 0:r.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(i):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(i);return}else return i.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read(e):this.wrapper.read()}},Qi=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}getMLOpSupportLimits(e){return this.backend.getMLOpSupportLimits(e)}reserveTensorId(){let e=It();return this.tensorTrackersById.set(e,new si(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,r,i,a){_e("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${r}, shape: ${i}, copyOld: ${a}}`);let s=this.tensorTrackersById.get(t);if(!s)throw new Error("Tensor not found.");return s.ensureTensor(e,r,i,a)}upload(e,t){let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");r.upload(t)}async download(e,t){_e("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");return r.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,r,i){let a=this.getMLContext(e),s=It(),n=new ai({sessionId:e,context:a,tensor:t,dataType:r,shape:i});return this.tensorTrackersById.set(s,new si(this,n)),this.externalTensors.add(n),s}async getCachedTensor(e,t,r,i,a,s,n){let o=this.getMLContext(e);for(let[l,d]of this.freeTensors.entries())if(d.canReuseTensor(o,t,r)){_e("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, ${n?`fallbackDataType: ${n},`:""} shape: ${r}`);let p=this.freeTensors.splice(l,1)[0];return p.sessionId=e,p}_e("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${n?`fallbackDataType: ${n},`:""} shape: ${r}}`);let u=await o.createTensor({dataType:n??t,shape:r,dimensions:r,usage:i,writable:a,readable:s});return new ai({sessionId:e,context:o,tensor:u,dataType:t,shape:r,fallbackDataType:n})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},Xi=(...e)=>new Qi(...e)}),ar,Yi,Ji,ea=z(()=>{"use strict";de(),lt(),rr(),Sa(),gt(),ar=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),Yi=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let r=Object.keys(e).sort(),i=Object.keys(t).sort();return r.length===i.length&&r.every((a,s)=>a===i[s]&&e[a]===t[a])},Ji=class{constructor(e){this.tensorManager=Xi(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,this.mlOpSupportLimitsBySessionId=new Map,Jr(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){_e("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){_e("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let r of t)_e("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${r}}`),this.tensorManager.releaseTensorId(r);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let r=this.mlContextCache.findIndex(i=>i.gpuDevice===e);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:i}),i}}else if(e===void 0){let r=this.mlContextCache.findIndex(i=>i.options===void 0&&i.gpuDevice===void 0);if(r!==-1)return this.mlContextCache[r].mlContext;{let i=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:i}),i}}let t=this.mlContextCache.findIndex(r=>Yi(r.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:r}),r}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e),this.mlOpSupportLimitsBySessionId.has(e)||this.mlOpSupportLimitsBySessionId.set(e,t.opSupportLimits()),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e),this.mlOpSupportLimitsBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);if(r.delete(e),r.size===0){this.sessionIdsByMLContext.delete(t);let i=this.mlContextCache.findIndex(a=>a.mlContext===t);i!==-1&&this.mlContextCache.splice(i,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}getMLOpSupportLimits(e){return this.mlOpSupportLimitsBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){_e("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,i,a){let s=ar.get(r);if(!s)throw new Error(`Unsupported ONNX data type: ${r}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,s,i,a)}async createTemporaryTensor(e,t,r){_e("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${r}}`);let i=ar.get(t);if(!i)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,a,i,r,!1);let s=this.temporarySessionTensorIds.get(e);return s?s.push(a):this.temporarySessionTensorIds.set(e,[a]),a}uploadTensor(e,t){if(!pe().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");_e("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return Ft(r,t)}}registerMLTensor(e,t,r,i){let a=ar.get(r);if(!a)throw new Error(`Unsupported ONNX data type: ${r}`);let s=this.tensorManager.registerTensor(e,t,a,i);return _e("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${a}, dimensions: ${i}} -> {tensorId: ${s}}`),s}registerMLConstant(e,t,r,i,a,s,n=!1){if(!s)throw new Error("External mounted files are not available.");let o=e;e.startsWith("./")&&(o=e.substring(2));let u=s.get(o);if(!u)throw new Error(`File with name ${o} not found in preloaded files.`);if(t+r>u.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let l=u.slice(t,t+r).buffer,d;switch(a.dataType){case"float32":d=new Float32Array(l);break;case"float16":d=typeof Float16Array<"u"?new Float16Array(l):new Uint16Array(l);break;case"int32":d=new Int32Array(l);break;case"uint32":d=new Uint32Array(l);break;case"int64":if(n){let p=ir(new Uint8Array(l),"int64");d=new Int32Array(p.buffer),a.dataType="int32"}else d=new BigInt64Array(l);break;case"uint64":d=new BigUint64Array(l);break;case"int8":d=new Int8Array(l);break;case"int4":case"uint4":case"uint8":d=new Uint8Array(l);break;default:throw new Error(`Unsupported data type: ${a.dataType} in creating WebNN Constant from external data.`)}return _e("verbose",()=>`[WebNN] registerMLConstant {dataType: ${a.dataType}, shape: ${a.shape}}} ${n?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),i.constant(a,d)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let r=this.sessionGraphInputs.get(e);return r?r.includes(t):!1}isGraphOutput(e,t){let r=this.sessionGraphOutputs.get(e);return r?r.includes(t):!1}isGraphInputOutputTypeSupported(e,t,r=!0){let i=ar.get(dt(t)),a=this.mlOpSupportLimitsBySessionId.get(e);return typeof i>"u"?!1:r?!!(a!=null&&a.input.dataTypes.includes(i)):!!(a!=null&&a.output.dataTypes.includes(i))}flush(){}}}),ni=z(()=>{"use strict"}),oi,ui,Dr,li,di,pi,ta,ra,Ta,fs=z(()=>{"use strict";gt(),ni(),oi=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),ui=[],Dr=e=>Math.ceil(Number(e)/16)*16,li=e=>{for(let t=0;t<ui.length;t++){let r=ui[t];if(e<=r)return r}return Math.ceil(e/16)*16},di=1,pi=()=>di++,ta=async(e,t,r,i)=>{let a=Dr(r),s=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let n=e.getCommandEncoder();e.endComputePass(),n.copyBufferToBuffer(t,0,s,0,a),e.flush(),await s.mapAsync(GPUMapMode.READ);let o=s.getMappedRange();if(i){let u=i();return u.set(new Uint8Array(o,0,r)),u}else return new Uint8Array(o.slice(0,r))}finally{s.destroy()}},ra=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of oi)ui.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let r=t.buffer,i=t.byteOffset,a=t.byteLength,s=Dr(a),n=this.storageCache.get(e);if(!n)throw new Error("gpu data for uploading does not exist");if(Number(n.originalSize)!==a)throw new Error(`inconsistent data size. gpu data size=${n.originalSize}, data size=${a}`);let o=this.backend.device.createBuffer({mappedAtCreation:!0,size:s,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),u=o.getMappedRange();new Uint8Array(u).set(new Uint8Array(r,i,a)),o.unmap();let l=this.backend.device.createCommandEncoder();l.copyBufferToBuffer(o,0,n.gpuData.buffer,0,s),this.backend.device.queue.submit([l.finish()]),o.destroy(),_e("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let i=this.storageCache.get(t);if(!i)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==i.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=Dr(r.originalSize),s=this.backend.getCommandEncoder();this.backend.endComputePass(),s.copyBufferToBuffer(r.gpuData.buffer,0,i.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let i;if(r){if(i=r[0],e===r[1])return _e("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, buffer is the same, skip.`),i;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else i=pi();return this.storageCache.set(i,{gpuData:{id:i,type:0,buffer:e},originalSize:t}),_e("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${i}, registered.`),i}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),_e("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=li(e),i,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,s=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||s){let o=(a?this.freeBuffers:this.freeUniformBuffers).get(r);o?o.length>0?i=o.pop():i=this.backend.device.createBuffer({size:r,usage:t}):i=this.backend.device.createBuffer({size:r,usage:t})}else i=this.backend.device.createBuffer({size:r,usage:t});let n={id:pi(),type:0,buffer:i};return this.storageCache.set(n.id,{gpuData:n,originalSize:Number(e)}),_e("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${n.id}`),n}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,r=this.storageCache.get(t);if(!r){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return _e("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${r.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(r.gpuData.buffer),r.originalSize}async download(e,t){let r=this.storageCache.get(Number(e));if(!r)throw new Error("data does not exist");await ta(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=oi.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(_e("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(r=>{r.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Ta=(...e)=>new ra(...e)}),c,m,b=z(()=>{"use strict";c=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},m=e=>new c(e)}),T,v,A,E,k,R,V,W,q,D,te,C,j,Oe,fe,ge,Re,J=z(()=>{"use strict";de(),ne(),T=64,v=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},A=(e,t=1)=>{let r=v(e,t);return typeof r=="string"?r:r[0]},E=(e,t=1)=>{let r=v(e,t);return typeof r=="string"?r:r[1]},k=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:P.computeStrides(r)})}),t},R=e=>e%4===0?4:e%2===0?2:1,V=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,W=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,q=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,D=(e,t,r,i)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?i==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:i==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,te=(e,t,r,i,a)=>{let s=typeof r=="number",n=s?r:r.length,o=[...new Array(n).keys()],u=n<2?"u32":n<=4?`vec${n}<u32>`:`array<u32, ${n}>`,l=v(t,a),d=typeof l=="string"?l:l[1],p=typeof l=="string"?l:l[0],h={indices:u,value:d,storage:p,tensor:t},g=K=>typeof K=="string"?K:`${K}u`,f={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},w=s?"uniforms.":"",$=`${w}${e}_shape`,_=`${w}${e}_strides`,y="";for(let K=0;K<n-1;K++)y+=`
    let dim${K} = current / ${D(_,K,n)};
    let rest${K} = current % ${D(_,K,n)};
    indices[${K}] = dim${K};
    current = rest${K};
    `;y+=`indices[${n-1}] = current;`;let x=n<2?"":`
  fn o2i_${e}(offset: u32) -> ${h.indices} {
    var indices: ${h.indices};
    var current = offset;
    ${y}
    return indices;
  }`,S=K=>(f.offsetToIndices=!0,n<2?K:`o2i_${e}(${K})`),I=[];if(n>=2)for(let K=n-1;K>=0;K--)I.push(`${D(_,K,n)} * (indices[${K}])`);let O=n<2?"":`
  fn i2o_${e}(indices: ${h.indices}) -> u32 {
    return ${I.join("+")};
  }`,B=K=>(f.indicesToOffset=!0,n<2?K:`i2o_${e}(${K})`),U=(...K)=>n===0?"0u":`${h.indices}(${K.map(g).join(",")})`,F=(K,Y)=>n<2?`${K}`:`${D(K,Y,n)}`,Z=(K,Y,re)=>n<2?`${K}=${re};`:`${D(K,Y,n)}=${re};`,le={},ie=(K,Y)=>{f.broadcastedIndicesToOffset=!0;let re=`${Y.name}broadcastedIndicesTo${e}Offset`;if(re in le)return`${re}(${K})`;let X=[];for(let ze=n-1;ze>=0;ze--){let Jt=Y.indicesGet("outputIndices",ze+Y.rank-n);X.push(`${F(_,ze)} * (${Jt} % ${F($,ze)})`)}return le[re]=`fn ${re}(outputIndices: ${Y.type.indices}) -> u32 {
             return ${X.length>0?X.join("+"):"0u"};
           }`,`${re}(${K})`},ae=(K,Y)=>(()=>{if(h.storage===h.value)return`${e}[${K}]=${Y};`;if(h.storage==="vec2<u32>"&&h.value==="i32")return`${e}[${K}]=vec2<u32>(u32(${Y}), select(0u, 0xFFFFFFFFu, ${Y} < 0));`;if(h.storage==="vec2<u32>"&&h.value==="u32")return`${e}[${K}]=vec2<u32>(u32(${Y}), 0u);`;if(h.storage==="u32"&&h.value==="vec4<bool>")return`${e}[${K}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${Y}));`;throw new Error(`not supported combination of storage type ${h.storage} and value type ${h.value} yet`)})(),ve=K=>(()=>{if(h.storage===h.value)return`${e}[${K}]`;if(h.storage==="vec2<u32>"&&h.value==="i32")return`i32(${e}[${K}].x)`;if(h.storage==="vec2<u32>"&&h.value==="u32")return`u32(${e}[${K}].x)`;if(h.storage==="u32"&&h.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${K}] & 0xFFu), bool(${e}[${K}] & 0xFF00u), bool(${e}[${K}] & 0xFF0000u), bool(${e}[${K}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${h.storage} and value type ${h.value} yet`)})(),Se=n<2?"":`
  fn get_${e}ByIndices(indices: ${h.indices}) -> ${d} {
    return ${ve(`i2o_${e}(indices)`)};
  }`,oe=n<2?"":(()=>{let K=o.map(re=>`d${re}: u32`).join(", "),Y=o.map(re=>`d${re}`).join(", ");return`
  fn get_${e}(${K}) -> ${d} {
    return get_${e}ByIndices(${U(Y)});
  }`})(),ce=(...K)=>{if(K.length!==n)throw new Error(`indices length must be ${n}`);let Y=K.map(g).join(",");return n===0?ve("0u"):n===1?ve(Y[0]):(f.get=!0,f.getByIndices=!0,f.indicesToOffset=!0,`get_${e}(${Y})`)},Le=K=>n<2?ve(K):(f.getByIndices=!0,f.indicesToOffset=!0,`get_${e}ByIndices(${K})`),Q=n<2?"":`
  fn set_${e}ByIndices(indices: ${h.indices}, value: ${d}) {
    ${ae(`i2o_${e}(indices)`,"value")}
  }`,Ee=n<2?"":(()=>{let K=o.map(re=>`d${re}: u32`).join(", "),Y=o.map(re=>`d${re}`).join(", ");return`
  fn set_${e}(${K}, value: ${d}) {
    set_${e}ByIndices(${U(Y)}, value);
  }`})();return{impl:()=>{let K=[],Y=!1;return f.offsetToIndices&&(K.push(x),Y=!0),f.indicesToOffset&&(K.push(O),Y=!0),f.broadcastedIndicesToOffset&&(Object.values(le).forEach(re=>K.push(re)),Y=!0),f.set&&(K.push(Ee),Y=!0),f.setByIndices&&(K.push(Q),Y=!0),f.get&&(K.push(oe),Y=!0),f.getByIndices&&(K.push(Se),Y=!0),!s&&Y&&K.unshift(`const ${$} = ${h.indices}(${r.join(",")});`,`const ${_} = ${h.indices}(${P.computeStrides(r).join(",")});`),K.join(`
`)},type:h,offsetToIndices:S,indicesToOffset:B,broadcastedIndicesToOffset:ie,indices:U,indicesGet:F,indicesSet:Z,set:(...K)=>{if(K.length!==n+1)throw new Error(`indices length must be ${n}`);let Y=K[n];if(typeof Y!="string")throw new Error("value must be string");let re=K.slice(0,n).map(g).join(",");return n===0?ae("0u",Y):n===1?ae(re[0],Y):(f.set=!0,f.setByIndices=!0,f.indicesToOffset=!0,`set_${e}(${re}, ${Y})`)},setByOffset:ae,setByIndices:(K,Y)=>n<2?ae(K,Y):(f.setByIndices=!0,f.indicesToOffset=!0,`set_${e}ByIndices(${K}, ${Y});`),get:ce,getByOffset:ve,getByIndices:Le,usage:i,name:e,strides:_,shape:$,rank:n}},C=(e,t,r,i=1)=>te(e,t,r,"input",i),j=(e,t,r,i=1)=>te(e,t,r,"output",i),Oe=(e,t,r)=>te(e,t,r,"atomicOutput",1),fe=(e,t,r,i=1)=>te(e,t,r,"internal",i),ge=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=T){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],i=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||i>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*i>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${i}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,s=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,n=a?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*r*i}u + local_idx;`;return`@compute @workgroup_size(${t}, ${r}, ${i})
  fn main(${s}) {
    ${n}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let r=e.usage==="input"?"read":"read_write",i=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${t}) var<storage, ${r}> ${e.name}: array<${i}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,r=1){return this.uniforms.push({name:e,type:t,length:r}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:r,length:i}of this.uniforms)if(i&&i>4)r==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${r}>, ${Math.ceil(i/8)}>`):e.push(`${t}:array<vec4<${r}>, ${Math.ceil(i/4)}>`);else{let a=i==null||i===1?r:`vec${i}<${r}>`;e.push(`${t}:${a}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Re=(e,t)=>new ge(e,t)}),yt,Be,Te,Ke,ht,tt,Ze,ia,aa,zt=z(()=>{"use strict";de(),ne(),b(),J(),yt=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Be=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),Te=(e,t)=>P.sortBasedOnPerm(e,Be(e.length,t)),Ke=(e,t,r,i)=>{let a=`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let s=0;s<t;++s)a+=`a[${e[s]}]=i[${s}];`;return a+="return a;}"},ht=(e,t)=>{let r=[],i=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&i.push(t[a]);return{newShape:r,newPerm:i}},tt=(e,t)=>{let r=0;for(let i=0;i<e.length;++i)if(t[e[i]]!==1){if(e[i]<r)return!1;r=e[i]}return!0},Ze=(e,t)=>{let r=e.dataType,i=e.dims.length,a=Be(i,t),s=Te(e.dims,a),n=e.dims,o=s,u=i<2||tt(a,e.dims),l;if(u)return l=f=>{let w=C("input",r,n,4),$=j("output",r,o,4);return`
  ${f.registerUniform("output_size","u32").declareVariables(w,$)}
  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let f=P.size(s);return{outputs:[{dims:s,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64/4)},programUniforms:[{type:12,data:Math.ceil(f/4)}]}},getShaderSource:l};let{newShape:d,newPerm:p}=ht(e.dims,a),h=P.areEqual(p,[2,3,1]),g=P.areEqual(p,[3,1,2]);if(d.length===2||h||g){n=h?[d[0],d[1]*d[2]]:g?[d[0]*d[1],d[2]]:d,o=[n[1],n[0]];let f=16;return l=w=>{let $=C("a",r,n.length),_=j("output",r,o.length);return`
  ${w.registerUniform("output_size","u32").declareVariables($,_)}
  var<workgroup> tile : array<array<${_.type.value}, ${f+1}>, ${f}>;
  ${w.mainStart([f,f,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${f} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${f}u + local_id.x;
    let input_row = workgroup_id_x * ${f}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${$.getByIndices(`${$.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${f}u + local_id.x;
    let output_row = workgroup_id_y * ${f}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${_.setByIndices(`${_.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let w=P.size(s);return{outputs:[{dims:s,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(o[1]/f),y:Math.ceil(o[0]/f)},programUniforms:[{type:12,data:w},...k(n,o)]}},getShaderSource:l}}return l=f=>{let w=C("a",r,n.length),$=j("output",r,o.length);return`
  ${f.registerUniform("output_size","u32").declareVariables(w,$)}

  ${Ke(a,i,w,$)}

  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${$.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${$.setByOffset("global_idx",w.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let f=P.size(s);return{outputs:[{dims:s,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...k(n,o)]}},getShaderSource:l}},ia=(e,t)=>{yt(e.inputs,t.perm),e.compute(Ze(e.inputs[0],t.perm))},aa=e=>m({perm:e.perm})}),wt,vt,sa,$e,_t,Ea,Ct,Pr,Ue,rt,nt,Ur,na,ka,At,Ot,sr,Ne,Me,xt,Ia,ms=z(()=>{"use strict";de(),ne(),J(),ys(),zt(),wt={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},vt={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},sa={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},$e={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},_t=(e,t)=>{let r=[];for(let i=t-e;i<t;++i)r.push(i);return r},Ea=(e,t)=>{let r=[],i=e.length;for(let s=0;s<i;s++)t.indexOf(s)===-1&&r.push(e[s]);let a=t.map(s=>e[s]);return[r,a]},Ct=(e,t)=>{let r=e.length+t.length,i=[],a=0;for(let s=0;s<r;s++)t.indexOf(s)===-1?i.push(e[a++]):i.push(1);return i},Pr=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},Ue=(e,t)=>{let r=[];if(!Pr(e,t)){for(let i=0;i<t;++i)e.indexOf(i)===-1&&r.push(i);e.forEach(i=>r.push(i))}return r},rt=(e,t,r,i,a,s,n)=>{let o=r[0].dims,u=P.size(s),l=P.size(n),d=C("_A",r[0].dataType,o),p=j("output",a,s),h=64;u===1&&(h=256);let g=`
          var<workgroup> aBestValues : array<f32, ${h}>;
       `,f=w=>`
        ${w.registerUniform("reduceSize","u32").declareVariables(d,p)}
        ${g}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${w.mainStart(h)}

          let outputIndex = global_idx / ${h};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${sa[i]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${h}) {
           let candidate = f32(${d.getByOffset("offset + k")});
           bestValue = ${wt[i]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${h}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${vt[i]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${p.setByOffset("outputIndex",`${i==="mean"?`${p.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${p.type.storage}(${$e[i]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${h}`,inputDependencies:["type"]},getShaderSource:f,getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:u},programUniforms:[{type:12,data:l}]})}},nt=(e,t,r,i)=>{let a=e.inputs.length===1?r:gs(e.inputs,r),s=a.axes;s.length===0&&!a.noopWithEmptyAxes&&(s=e.inputs[0].dims.map((g,f)=>f));let n=P.normalizeAxes(s,e.inputs[0].dims.length),o=n,u=e.inputs[0],l=Ue(o,e.inputs[0].dims.length);l.length>0&&(u=e.compute(Ze(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],o=_t(o.length,u.dims.length));let[d,p]=Ea(u.dims,o),h=d;a.keepDims&&(h=Ct(d,n)),e.compute(rt(t,a.cacheKey,[u],i,e.inputs[0].dataType,h,p),{inputs:[u]})},Ur=(e,t)=>{nt(e,"ReduceMeanShared",t,"mean")},na=(e,t)=>{nt(e,"ReduceL1Shared",t,"l1")},ka=(e,t)=>{nt(e,"ReduceL2Shared",t,"l2")},At=(e,t)=>{nt(e,"ReduceLogSumExpShared",t,"logSumExp")},Ot=(e,t)=>{nt(e,"ReduceMaxShared",t,"max")},sr=(e,t)=>{nt(e,"ReduceMinShared",t,"min")},Ne=(e,t)=>{nt(e,"ReduceProdShared",t,"prod")},Me=(e,t)=>{nt(e,"ReduceSumShared",t,"sum")},xt=(e,t)=>{nt(e,"ReduceSumSquareShared",t,"sumSquare")},Ia=(e,t)=>{nt(e,"ReduceLogSumShared",t,"logSum")}}),Rt,Bn,za,gs,Bt,Mn,Dn,Pn,Un,Nn,Ln,qn,Vn,Fn,Wn,Mt,Gn,jn,Hn,Kn,Zn,Qn,Xn,Yn,Jn,eo,ys=z(()=>{"use strict";de(),ne(),b(),J(),ms(),Rt=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},Bn=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],za=(e,t,r,i,a,s,n=!1,o=!1)=>{let u=[],l=r[0].dims,d=l.length,p=P.normalizeAxes(a,d),h=!o&&p.length===0;l.forEach((w,$)=>{h||p.indexOf($)>=0?n&&u.push(1):u.push(w)});let g=u.length,f=P.size(u);return{name:e,shaderCache:t,getShaderSource:w=>{let $=[],_=C("_A",r[0].dataType,d),y=j("output",s,g),x=i(_,y,p),S=x[2];for(let I=0,O=0;I<d;I++)h||p.indexOf(I)>=0?(n&&O++,S=`for(var j${I}: u32 = 0; j${I} < ${l[I]}; j${I}++) {
                  ${x[2].includes("last_index")?`let last_index = j${I};`:""}
                  ${_.indicesSet("input_indices",I,`j${I}`)}
                  ${S}
                }`):($.push(`${_.indicesSet("input_indices",I,y.indicesGet("output_indices",O))};`),O++);return`

        ${w.registerUniform("output_size","u32").declareVariables(_,y)}

        ${w.mainStart()}
          ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${_.type.indices};
          let output_indices = ${y.offsetToIndices("global_idx")};

          ${$.join(`
`)}
          ${x[0]}       // init ops for reduce max/min
          ${x[1]}
          ${S}
          ${x[3]}
          ${x.length===4?y.setByOffset("global_idx","value"):x.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:u,dataType:s}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...k(l,u)]})}},gs=(e,t)=>{let r=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(i=>r.push(Number(i))),m({axes:r,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Bt=(e,t,r,i)=>{let a=e.inputs,s=a.length===1?r:gs(a,r);e.compute(za(t,{hint:s.cacheKey,inputDependencies:["rank"]},[a[0]],s.noopWithEmptyAxes&&s.axes.length===0?Bn:i,s.axes,a[0].dataType,s.keepDims,s.noopWithEmptyAxes),{inputs:[0]})},Mn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceLogSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},Dn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceL1",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},Pn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceL2",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},Un=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceLogSumExp",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},Nn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceMax",t,(r,i,a)=>{let s=[];for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&s.push(r.indicesSet("input_indices",n,0));return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},Ln=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceMean",t,(r,i,a)=>{let s=1;for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&(s*=e.inputs[0].dims[n]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${i.type.value}(sum / ${s});`]})},qn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceMin",t,(r,i,a)=>{let s=[];for(let n=0;n<r.rank;n++)(a.indexOf(n)>=0||a.length===0)&&s.push(`input_indices[${n}] = 0;`);return[`${s.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},Vn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceProd",t,(r,i)=>[`var value = ${i.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},Fn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceSum",t,(r,i)=>[`var value = ${i.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Wn=(e,t)=>{Rt(e.inputs),Bt(e,"ReduceSumSquare",t,(r,i)=>[`var t = ${i.type.value}(0); var value = ${i.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},Mt=(e,t,r)=>{if(t.length===0)return r;let i=1,a=1;for(let s=0;s<t.length;s++)t.indexOf(s)===-1?i*=e[s]:a*=e[s];return a<32&&i>1024},Gn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Ln(e,t):Ur(e,t)},jn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Dn(e,t):na(e,t)},Hn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Pn(e,t):ka(e,t)},Kn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Un(e,t):At(e,t)},Zn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Nn(e,t):Ot(e,t)},Qn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?qn(e,t):sr(e,t)},Xn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Vn(e,t):Ne(e,t)},Yn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Fn(e,t):Me(e,t)},Jn=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Wn(e,t):xt(e,t)},eo=(e,t)=>{Mt(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Mn(e,t):Ia(e,t)}}),ws,to,ro,_s,Uc=z(()=>{"use strict";de(),b(),ys(),ws=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},to=(e,t)=>{ws(e.inputs);let r=(i,a,s)=>{let n=[];for(let o=0;o<i.rank;o++)(s.indexOf(o)>=0||s.length===0)&&n.push(`input_indices[${o}] = 0;`);return[`${n.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(za("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},ro=(e,t)=>{ws(e.inputs);let r=(i,a,s)=>{let n=[];for(let o=0;o<i.rank;o++)(s.indexOf(o)>=0||s.length===0)&&n.push(`input_indices[${o}] = 0;`);return[`${n.join(`
`)}`,`var value = ${i.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${i.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${i.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(za("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},_s=e=>m(e)}),io,Ca,ao,so,no,oa,oo,uo,bs=z(()=>{"use strict";de(),ne(),ni(),J(),io=(e,t)=>{let r=e[0],i=e[1],a=e[2],s=e[3],n=e[4],o=e[5];if(n&&o)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let u=r.dims[0],l=r.dims[1],d=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(i.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(i.dims[0]!==d)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==i.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let p=a.dims[0]/3,h=p,g=h;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let x of t.qkvHiddenSizes)if(x%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");p=t.qkvHiddenSizes[0],h=t.qkvHiddenSizes[1],g=t.qkvHiddenSizes[2]}let f=l;if(p!==h)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==p+h+g)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let w=0;if(n){if(h!==g)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(n.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(n.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(n.dims[1]!==u)throw new Error('Input "past" second dimension must be batch_size');if(n.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(n.dims[4]!==h/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(w=n.dims[3])}let $=f+w,_=-1,y=0;if(s)throw new Error("Mask not supported");if(n)throw new Error("past is not supported");if(o){if(o.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(o.dims[0]!==u||o.dims[1]!==t.numHeads||o.dims[2]!==l||o.dims[3]!==$)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:u,sequenceLength:l,pastSequenceLength:w,kvSequenceLength:f,totalSequenceLength:$,maxSequenceLength:_,inputHiddenSize:d,hiddenSize:p,vHiddenSize:g,headSize:Math.floor(p/t.numHeads),vHeadSize:Math.floor(g/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:y,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Ca=(e,t,r)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e==null?void 0:e.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${r?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,ao=(e,t,r,i,a,s,n,o)=>{let u=R(n?1:s),l=64,d=s/u;d<l&&(l=32);let p=Math.ceil(s/u/l),h=[{type:12,data:t},{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:d},{type:12,data:p}],g=A(e.dataType,u),f=E(1,u),w=["type"];n&&w.push("type"),o&&w.push("type");let $=_=>{let y=j("x",e.dataType,e.dims,u),x=[y],S=n?C("seq_lens",n.dataType,n.dims):void 0;S&&x.push(S);let I=o?C("total_sequence_length_input",o.dataType,o.dims):void 0;I&&x.push(I);let O=E(e.dataType),B=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${_.registerUniforms(B).declareVariables(...x)}
  ${_.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Ca(S,I,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${n?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${f}(-3.4028234663852886e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${f}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(u){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.4028234663852886e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${f}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${f}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(u){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${u}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${y.type.value}(${O}(1.0) / ${O}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${f}(x[offset + i]);
        x[offset + i] = ${y.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${n?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${y.type.value}(${O}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${g};${u}`,inputDependencies:w},getShaderSource:$,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:a,z:t*r},programUniforms:h})}},so=(e,t,r,i,a,s,n,o,u)=>{let l=n+s.kvSequenceLength,d=[s.batchSize,s.numHeads,s.sequenceLength,l],p=e>1&&i,h=s.kvNumHeads?s.kvNumHeads:s.numHeads,g=p?[s.batchSize,h,l,s.headSize]:void 0,f=s.nReps?s.nReps:1,w=s.scale===0?1/Math.sqrt(s.headSize):s.scale,$=R(s.headSize),_=s.headSize/$,y=12,x={x:Math.ceil(l/y),y:Math.ceil(s.sequenceLength/y),z:s.batchSize*s.numHeads},S=[{type:12,data:s.sequenceLength},{type:12,data:_},{type:12,data:l},{type:12,data:s.numHeads},{type:12,data:s.headSize},{type:1,data:w},{type:12,data:n},{type:12,data:s.kvSequenceLength},{type:12,data:f}],I=p&&i&&P.size(i.dims)>0,O=["type","type"];I&&O.push("type"),a&&O.push("type"),o&&O.push("type"),u&&O.push("type");let B=[{dims:d,dataType:t.dataType,gpuDataType:0}];p&&B.push({dims:g,dataType:t.dataType,gpuDataType:0});let U=F=>{let Z=C("q",t.dataType,t.dims,$),le=C("key",r.dataType,r.dims,$),ie=[Z,le];if(I){let Q=C("past_key",i.dataType,i.dims,$);ie.push(Q)}a&&ie.push(C("attention_bias",a.dataType,a.dims));let ae=o?C("seq_lens",o.dataType,o.dims):void 0;ae&&ie.push(ae);let ve=u?C("total_sequence_length_input",u.dataType,u.dims):void 0;ve&&ie.push(ve);let Se=j("output",t.dataType,d),oe=[Se];p&&oe.push(j("present_key",t.dataType,g,$));let ce=E(1,$),Le=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${y}u;

  var<workgroup> tileQ: array<${Z.type.storage}, ${y*y}>;
  var<workgroup> tileK: array<${Z.type.storage}, ${y*y}>;
  ${F.registerUniforms(Le).declareVariables(...ie,...oe)}
  ${F.mainStart([y,y,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${f===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${f===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Ca(ae,ve,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${I&&p?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${p?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${ce}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${I&&p?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${p?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${ce}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch($){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${$}`)}})()};
        output[outputIdx] = ${Se.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${$};${a!==void 0};${i!==void 0};${e}`,inputDependencies:O},getRunData:()=>({outputs:B,dispatchGroup:x,programUniforms:S}),getShaderSource:U}},no=(e,t,r,i,a,s,n=void 0,o=void 0)=>{let u=s+a.kvSequenceLength,l=a.nReps?a.nReps:1,d=a.vHiddenSize*l,p=e>1&&i,h=a.kvNumHeads?a.kvNumHeads:a.numHeads,g=p?[a.batchSize,h,u,a.headSize]:void 0,f=[a.batchSize,a.sequenceLength,d],w=12,$={x:Math.ceil(a.vHeadSize/w),y:Math.ceil(a.sequenceLength/w),z:a.batchSize*a.numHeads},_=[{type:12,data:a.sequenceLength},{type:12,data:u},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:12,data:d},{type:12,data:s},{type:12,data:a.kvSequenceLength},{type:12,data:l}],y=p&&i&&P.size(i.dims)>0,x=["type","type"];y&&x.push("type"),n&&x.push("type"),o&&x.push("type");let S=[{dims:f,dataType:t.dataType,gpuDataType:0}];p&&S.push({dims:g,dataType:t.dataType,gpuDataType:0});let I=O=>{let B=C("probs",t.dataType,t.dims),U=C("v",r.dataType,r.dims),F=[B,U];y&&F.push(C("past_value",i.dataType,i.dims));let Z=n?C("seq_lens",n.dataType,n.dims):void 0;n&&F.push(Z);let le=o?C("total_sequence_length_input",o.dataType,o.dims):void 0;o&&F.push(le);let ie=[j("output",t.dataType,f)];p&&ie.push(j("present_value",t.dataType,g));let ae=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${w}u;
  var<workgroup> tileQ: array<${B.type.value}, ${w*w}>;
  var<workgroup> tileV: array<${B.type.value}, ${w*w}>;
  ${O.registerUniforms(ae).declareVariables(...F,...ie)}
  ${O.mainStart([w,w,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Ca(Z,le,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${y&&p?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${p?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${B.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${y&&p?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${p?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${i!==void 0};${e}`,inputDependencies:x},getRunData:()=>({outputs:S,dispatchGroup:$,programUniforms:_}),getShaderSource:I}},oa=(e,t,r,i,a,s,n,o,u,l,d=void 0,p=void 0)=>{let h=Math.min(e.outputCount,1+(n?1:0)+(o?1:0)),g=h>1?n:void 0,f=h>1?o:void 0,w=h>1?l.pastSequenceLength:0,$=w+l.kvSequenceLength,_=u&&P.size(u.dims)>0?u:void 0,y=[t,r];g&&P.size(g.dims)>0&&y.push(g),_&&y.push(_),d&&y.push(d),p&&y.push(p);let x=e.compute(so(h,t,r,g,_,l,w,d,p),{inputs:y,outputs:h>1?[-1,1]:[-1]})[0];e.compute(ao(x,l.batchSize,l.numHeads,w,l.sequenceLength,$,d,p),{inputs:d&&p?[x,d,p]:[x],outputs:[]});let S=[x,i];f&&P.size(f.dims)>0&&S.push(f),d&&S.push(d),p&&S.push(p),e.compute(no(h,x,i,f,l,w,d,p),{inputs:S,outputs:h>1?[0,2]:[0]})},oo=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],i=t.sequenceLength,a=t.inputHiddenSize,s=t.headSize,n=12,o={x:Math.ceil(t.headSize/n),y:Math.ceil(t.sequenceLength/n),z:t.batchSize*t.numHeads},u=[e.inputs[0],e.inputs[1],e.inputs[2]],l=[{type:12,data:i},{type:12,data:a},{type:12,data:s},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],d=p=>{let h=j("output_q",u[0].dataType,r),g=j("output_k",u[0].dataType,r),f=j("output_v",u[0].dataType,r),w=C("input",u[0].dataType,u[0].dims),$=C("weight",u[1].dataType,u[1].dims),_=C("bias",u[2].dataType,u[2].dims),y=w.type.storage,x=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${n}u;
  var<workgroup> tileInput: array<${y}, ${n*n}>;
  var<workgroup> tileWeightQ: array<${y}, ${n*n}>;
  var<workgroup> tileWeightK: array<${y}, ${n*n}>;
  var<workgroup> tileWeightV: array<${y}, ${n*n}>;
  ${p.registerUniforms(x).declareVariables(w,$,_,h,g,f)}
  ${p.mainStart([n,n,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${y}(0);
    var valueK = ${y}(0);
    var valueV = ${y}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:l}),getShaderSource:d},{inputs:u,outputs:[-1,-1,-1]})},uo=(e,t)=>{let r=io(e.inputs,t),[i,a,s]=oo(e,r);return oa(e,i,a,s,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r)}}),lo,po,co,ho,Nc=z(()=>{"use strict";We(),de(),ne(),b(),J(),lo=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(i,a,s)=>{let n=a.length;if(n!==i.length)throw new Error(`${s}: num dimensions != ${n}`);a.forEach((o,u)=>{if(o!==i[u])throw new Error(`${s}: dim[${u}] do not match`)})};if(e[0].dims.length>1){let i=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,i,"Invalid input scale"),r(e[2].dims,i,"Invalid input B"),r(e[3].dims,i,"Invalid input mean"),r(e[4].dims,i,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},po=(e,t)=>{let{epsilon:r,spatial:i,format:a}=t,s=e[0].dims,n=i?R(s[s.length-1]):1,o=a==="NHWC"&&s.length>1?n:1,u=P.size(s)/n,l=i,d=l?s.length:s,p=C("x",e[0].dataType,e[0].dims,n),h=C("scale",e[1].dataType,e[1].dims,o),g=C("bias",e[2].dataType,e[2].dims,o),f=C("inputMean",e[3].dataType,e[3].dims,o),w=C("inputVar",e[4].dataType,e[4].dims,o),$=j("y",e[0].dataType,d,n),_=()=>{let x="";if(i)x=`let cOffset = ${s.length===1?"0u":a==="NHWC"?`outputIndices[${s.length-1}] / ${n}`:"outputIndices[1]"};`;else if(a==="NCHW")x=`
            ${$.indicesSet("outputIndices","0","0")}
            let cOffset = ${$.indicesToOffset("outputIndices")};`;else{x=`var cIndices = ${h.type.indices}(0);
                       cIndices[0] = outputIndices[${s.length-1}];`;for(let S=1;S<h.rank;S++)x+=`cIndices[${S}] = outputIndices[${S}];`;x+=`let cOffset = ${h.indicesToOffset("cIndices")};`}return x},y=x=>`
  const epsilon = ${r};
  ${x.registerUniform("outputSize","u32").declareVariables(p,h,g,f,w,$)}
  ${x.mainStart()}
  ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${$.offsetToIndices(`global_idx * ${n}`)};
    ${_()}
    let scale = ${h.getByOffset("cOffset")};
    let bias = ${g.getByOffset("cOffset")};
    let inputMean = ${f.getByOffset("cOffset")};
    let inputVar = ${w.getByOffset("cOffset")};
    let x = ${p.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${$.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${i}_${n}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:y,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l?[{type:12,data:u},...k(s)]:[{type:12,data:u}]})}},co=e=>m(e),ho=(e,t)=>{let{inputs:r,outputCount:i}=e,a=co({...t,outputCount:i});if(he.webgpu.validateInputContent&&lo(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(po(r,a))}}),fo,mo,go,Lc=z(()=>{"use strict";ne(),J(),fo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},mo=e=>{let t=e[0].dims,r=e[0].dims[2],i=P.size(t)/4,a=e[0].dataType,s=C("input",a,t,4),n=C("bias",a,[r],4),o=C("residual",a,t,4),u=j("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:l=>`
  const channels = ${r}u / 4;
  ${l.declareVariables(s,n,o,u)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let value = ${s.getByOffset("global_idx")}
      + ${n.getByOffset("global_idx % channels")} + ${o.getByOffset("global_idx")};
    ${u.setByOffset("global_idx","value")}
  }`}},go=e=>{fo(e.inputs),e.compute(mo(e.inputs))}}),yo,ke,wo,_o,bo,$o,vo,xo,So,To,Eo,ko,Io,zo,Co,Ao,ua,Oo,Aa,Ro,Bo,Mo,Do,Po,Uo,No,Lo,qo,Vo,Fo,Wo,Go,jo,Ho,Ko,$s,Zo,vs,xs,Qo,Xo,Yo,Jo,eu,tu,Ss=z(()=>{"use strict";de(),ne(),b(),J(),yo=(e,t,r,i,a,s,n)=>{let o=Math.ceil(t/4),u="";typeof a=="string"?u=`${a}(a)`:u=a("a");let l=C("inputData",r,[o],4),d=j("outputData",i,[o],4),p=[{name:"vec_size",type:"u32"}];return n&&p.push(...n),`
      ${e.registerUniforms(p).declareVariables(l,d)}

  ${s??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${d.setByOffset("global_idx",u)}
  }`},ke=(e,t,r,i,a,s=e.dataType,n,o)=>{let u=[{type:12,data:Math.ceil(P.size(e.dims)/4)}];return n&&u.push(...n),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:l=>yo(l,P.size(e.dims),e.dataType,s,r,i,o),getRunData:l=>({outputs:[{dims:e.dims,dataType:s}],dispatchGroup:{x:Math.ceil(P.size(l[0].dims)/64/4)},programUniforms:u})}},wo=e=>{e.compute(ke(e.inputs[0],"Abs","abs"))},_o=e=>{e.compute(ke(e.inputs[0],"Acos","acos"))},bo=e=>{e.compute(ke(e.inputs[0],"Acosh","acosh"))},$o=e=>{e.compute(ke(e.inputs[0],"Asin","asin"))},vo=e=>{e.compute(ke(e.inputs[0],"Asinh","asinh"))},xo=e=>{e.compute(ke(e.inputs[0],"Atan","atan"))},So=e=>{e.compute(ke(e.inputs[0],"Atanh","atanh"))},To=e=>m(e),Eo=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(ke(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},ko=e=>{let t,r,i=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=i?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=i?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return m({min:t,max:r})},Io=(e,t)=>{let r=t||ko(e.inputs),i=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${i}>(uniforms.min), vec4<${i}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:i},{name:"max",type:i}]),{inputs:[0]})},zo=e=>{e.compute(ke(e.inputs[0],"Ceil","ceil"))},Co=e=>{e.compute(ke(e.inputs[0],"Cos","cos"))},Ao=e=>{e.compute(ke(e.inputs[0],"Cosh","cosh"))},ua=e=>m(e),Oo=(e,t)=>{let r=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"Elu",i=>`elu_vf32(${i})`,`
  const elu_alpha_ = ${r}(${t.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Aa=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Ro=e=>{let t=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Aa(t)))},Bo=e=>{e.compute(ke(e.inputs[0],"Exp","exp"))},Mo=e=>{e.compute(ke(e.inputs[0],"Floor","floor"))},Do=e=>{let t=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Aa(t)))},Po=(e,t)=>{let r=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"LeakyRelu",i=>`select(leaky_relu_alpha_ * ${i}, ${i}, ${i} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},Uo=e=>{e.compute(ke(e.inputs[0],"Not",t=>`!${t}`))},No=e=>{e.compute(ke(e.inputs[0],"Neg",t=>`-${t}`))},Lo=e=>{e.compute(ke(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},qo=e=>{let t=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},Vo=e=>{e.compute(ke(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},Fo=e=>m(e),Wo=(e,t)=>{let r=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"HardSigmoid",i=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${i} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},Go=e=>{e.compute(ke(e.inputs[0],"Sin","sin"))},jo=e=>{e.compute(ke(e.inputs[0],"Sinh","sinh"))},Ho=e=>{e.compute(ke(e.inputs[0],"Sqrt","sqrt"))},Ko=e=>{e.compute(ke(e.inputs[0],"Tan","tan"))},$s=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Zo=e=>{e.compute(ke(e.inputs[0],"Tanh",$s))},vs=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${$s("v")};
}
`,xs=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Qo=e=>{let t=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"FastGelu",xs,vs(t),void 0,e.inputs[0].dataType))},Xo=(e,t)=>{let r=E(e.inputs[0].dataType);return e.compute(ke(e.inputs[0],"ThresholdedRelu",i=>`select(vec4<${r}>(0.0), ${i}, ${i} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},Yo=e=>{e.compute(ke(e.inputs[0],"Log","log"))},Jo=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,eu=e=>`quick_gelu_impl(${e})`,tu=(e,t)=>{let r=E(e.inputs[0].dataType);e.compute(ke(e.inputs[0],"QuickGelu",eu,Jo(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),ru,iu,au,qc=z(()=>{"use strict";ne(),J(),Ss(),ru=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},iu=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=C("input",e[0].dataType,e[0].dims,4),i=C("bias",e[0].dataType,[e[0].dims[2]],4),a=j("output",e[0].dataType,t,4),s=P.size(t)/4,n=A(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)}}),getShaderSource:o=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${o.declareVariables(r,i,a)}

  ${Aa(n)}

  ${o.mainStart()}
    ${o.guardAgainstOutOfBoundsWorkgroupSizes(s)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${a.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},au=e=>{ru(e.inputs),e.compute(iu(e.inputs))}}),su,nu,Dt,ou,uu,lu,du,pu,cu,hu,fu,mu,gu,Vc=z(()=>{"use strict";de(),ne(),J(),su=(e,t,r,i,a,s,n,o,u,l,d,p)=>{let h,g;typeof o=="string"?h=g=(y,x)=>`${o}((${y}),(${x}))`:typeof o=="function"?h=g=o:(h=o.scalar,g=o.vector);let f=j("outputData",d,i.length,4),w=C("aData",u,t.length,4),$=C("bData",l,r.length,4),_;if(a)if(s){let y=P.size(t)===1,x=P.size(r)===1,S=t.length>0&&t[t.length-1]%4===0,I=r.length>0&&r[r.length-1]%4===0;y||x?_=f.setByOffset("global_idx",g(y?`${w.type.value}(${w.getByOffset("0")}.x)`:w.getByOffset("global_idx"),x?`${$.type.value}(${$.getByOffset("0")}.x)`:$.getByOffset("global_idx"))):_=`
            let outputIndices = ${f.offsetToIndices("global_idx * 4u")};
            let offsetA = ${w.broadcastedIndicesToOffset("outputIndices",f)};
            let offsetB = ${$.broadcastedIndicesToOffset("outputIndices",f)};
            ${f.setByOffset("global_idx",g(n||S?w.getByOffset("offsetA / 4u"):`${w.type.value}(${w.getByOffset("offsetA / 4u")}[offsetA % 4u])`,n||I?$.getByOffset("offsetB / 4u"):`${$.type.value}(${$.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else _=f.setByOffset("global_idx",g(w.getByOffset("global_idx"),$.getByOffset("global_idx")));else{if(!s)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let y=(x,S,I="")=>{let O=`aData[indexA${S}][componentA${S}]`,B=`bData[indexB${S}][componentB${S}]`;return`
            let outputIndices${S} = ${f.offsetToIndices(`global_idx * 4u + ${S}u`)};
            let offsetA${S} = ${w.broadcastedIndicesToOffset(`outputIndices${S}`,f)};
            let offsetB${S} = ${$.broadcastedIndicesToOffset(`outputIndices${S}`,f)};
            let indexA${S} = offsetA${S} / 4u;
            let indexB${S} = offsetB${S} / 4u;
            let componentA${S} = offsetA${S} % 4u;
            let componentB${S} = offsetB${S} % 4u;
            ${x}[${S}] = ${I}(${h(O,B)});
          `};d===9?_=`
            var data = vec4<u32>(0);
            ${y("data",0,"u32")}
            ${y("data",1,"u32")}
            ${y("data",2,"u32")}
            ${y("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:_=`
            ${y("outputData[global_idx]",0)}
            ${y("outputData[global_idx]",1)}
            ${y("outputData[global_idx]",2)}
            ${y("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(w,$,f)}

        ${p??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${_}
      }`},nu=(e,t,r,i,a,s,n=r.dataType)=>{let o=r.dims.map(Number),u=i.dims.map(Number),l=!P.areEqual(o,u),d=o,p=P.size(o),h=!1,g=!1,f=[l];if(l){let w=Vt.calcShape(o,u,!1);if(!w)throw new Error("Can't perform binary op on the given tensors");d=w.slice(),p=P.size(d);let $=P.size(o)===1,_=P.size(u)===1,y=o.length>0&&o[o.length-1]%4===0,x=u.length>0&&u[u.length-1]%4===0;f.push($),f.push(_),f.push(y),f.push(x);let S=1;for(let I=1;I<d.length;I++){let O=o[o.length-I],B=u[u.length-I];if(O===B)S*=O;else break}S%4===0?(g=!0,h=!0):($||_||y||x)&&(h=!0)}else h=!0;return f.push(h),{name:e,shaderCache:{hint:t+f.map(w=>w.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:w=>su(w,o,u,d,h,l,g,a,r.dataType,i.dataType,n,s),getRunData:()=>({outputs:[{dims:d,dataType:n}],dispatchGroup:{x:Math.ceil(p/64/4)},programUniforms:[{type:12,data:Math.ceil(P.size(d)/4)},...k(o,u,d)]})}},Dt=(e,t,r,i,a,s)=>{e.compute(nu(t,a??"",e.inputs[0],e.inputs[1],r,i,s))},ou=e=>{Dt(e,"Add",(t,r)=>`${t}+${r}`)},uu=e=>{Dt(e,"Div",(t,r)=>`${t}/${r}`)},lu=e=>{Dt(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},du=e=>{Dt(e,"Mul",(t,r)=>`${t}*${r}`)},pu=e=>{let t=C("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Dt(e,"Pow",{scalar:(r,i)=>`pow_custom(${r},${i})`,vector:(r,i)=>`pow_vector_custom(${r},${i})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},cu=e=>{Dt(e,"Sub",(t,r)=>`${t}-${r}`)},hu=e=>{Dt(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},fu=e=>{Dt(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},mu=e=>{Dt(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},gu=e=>{Dt(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),yu,wu,_u,bu,$u,vu,Fc=z(()=>{"use strict";de(),ne(),b(),J(),yu=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,i=e[r],a=i.dataType,s=i.dims.length;e.forEach((n,o)=>{if(o!==r){if(n.dataType!==a)throw new Error("input tensors should be one type");if(n.dims.length!==s)throw new Error("input tensors should have the same shape");n.dims.forEach((u,l)=>{if(l!==t&&u!==i.dims[l])throw new Error("non concat dimensions must match")})}})},wu=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,_u=(e,t)=>{let r=e.length,i=[];for(let a=0;a<r;++a){let s=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?i.push(s):a===0?i.push(`if (inputIndex == ${a}u) { ${s} }`):a===r-1?i.push(`else { ${s} }`):i.push(`else if (inputIndex == ${a}) { ${s} }`)}return i.join(`
`)},bu=(e,t,r,i)=>{let a=P.size(r),s=new Array(e.length),n=new Array(e.length),o=0,u=[],l=[],d=[{type:12,data:a}];for(let w=0;w<e.length;++w)o+=e[w].dims[t],s[w]=o,l.push(e[w].dims.length),n[w]=C(`input${w}`,i,l[w]),u.push("rank"),d.push({type:12,data:s[w]});for(let w=0;w<e.length;++w)d.push(...k(e[w].dims));d.push(...k(r));let p=j("output",i,r.length),h=p.indicesGet("indices",t),g=Array.from(Array(s.length).keys()).map(w=>`uniforms.sizeInConcatAxis${w}`).join(","),f=w=>`

  ${(()=>{w.registerUniform("outputSize","u32");for(let $=0;$<e.length;$++)w.registerUniform(`sizeInConcatAxis${$}`,"u32");return w.declareVariables(...n,p)})()}

  ${wu(s.length,g)}

  ${w.mainStart()}
    ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${p.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${h});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${s.length}u>(${g});
      ${h} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${_u(n,p)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:i}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:d}),getShaderSource:f}},$u=(e,t)=>{let r=e.inputs,i=r[0].dims,a=P.normalizeAxis(t.axis,i.length);yu(r,a);let s=i.slice();s[a]=r.reduce((o,u)=>o+(u.dims.length>a?u.dims[a]:0),0);let n=r.filter(o=>P.size(o.dims)>0);e.compute(bu(n,a,s,r[0].dataType),{inputs:n})},vu=e=>m({axis:e.axis})}),Nr,Lr,qr,Ts,Vr=z(()=>{"use strict";de(),ne(),Nr=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},Lr=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},qr=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Ts=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,i]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:i}}else if(t==="Clip"){let[r,i]=(e==null?void 0:e.activation_params)||[Zi,kt];return{activation:t,clipMax:i,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),Qe,xu,Es=z(()=>{"use strict";Qe=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},xu=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),Su,Wc=z(()=>{"use strict";Su=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),la,ks,Is=z(()=>{"use strict";de(),ne(),J(),Vr(),la=(e,t,r,i,a)=>{let s=i-r;return`
      ${Array.from({length:r}).map((n,o)=>`
      if (${D(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,D(a,o+s,i))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join("")}
`},ks=(e,t,r,i,a=!1,s)=>{let n=e[0].dims,o=e[1].dims,u=n[n.length-2],l=o[o.length-1],d=n[n.length-1],p=R(l),h=R(d),g=R(u),f=P.size(r)/p/g,w=e.length>2,$=i?i.slice(0,-2):r.slice(0,-2),_=[P.size($),u,l],y=[{type:12,data:f},{type:12,data:u},{type:12,data:l},{type:12,data:d}];Lr(t,y),y.push(...k($,n,o)),w&&y.push(...k(e[2].dims)),y.push(...k(_));let x=S=>{let I=fe("batch_dims",e[0].dataType,$.length),O=C("a",e[0].dataType,n.length,h),B=C("b",e[1].dataType,o.length,p),U=j("output",e[0].dataType,_.length,p),F=A(U.type.tensor),Z=Nr(t,U.type.value,F),le=[O,B],ie="";if(w){let Se=a?p:1;le.push(C("bias",e[2].dataType,e[2].dims.length,Se)),ie=`${a?`value += bias[col / ${Se}];`:`value += ${U.type.value}(bias[row + i]);`}`}let ae=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];qr(t,ae);let ve=()=>{let Se=`var a_data: ${O.type.value};`;for(let oe=0;oe<h;oe++)Se+=`
              let b_data${oe} = b[(b_offset + (k + ${oe}) * uniforms.N + col) / ${p}];`;for(let oe=0;oe<g;oe++){Se+=`a_data = a[(a_offset + (row + ${oe}) * uniforms.K + k) / ${h}];`;for(let ce=0;ce<h;ce++)Se+=`
            values[${oe}] = fma(${B.type.value}(a_data${h===1?"":`[${ce}]`}), b_data${ce}, values[${oe}]);
`}return Se};return`
  ${S.registerUniforms(ae).registerInternalVariables(I).declareVariables(...le,U)}
  ${S.mainStart()}
    ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${p})) * ${p};
    var index1 = global_idx / (uniforms.N / ${p});
    let stride1 = uniforms.M / ${g};
    let row = (index1 % stride1) * ${g};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${I.offsetToIndices("batch")};`}

    var a_indices: ${O.type.indices};
    ${la("a_indices",O,O.rank-2,I.rank,"batch_indices")}
    ${O.indicesSet("a_indices",O.rank-2,0)}
    ${O.indicesSet("a_indices",O.rank-1,0)}
    let a_offset = ${O.indicesToOffset("a_indices")};

    var b_indices: ${B.type.indices};
    ${la("b_indices",B,B.rank-2,I.rank,"batch_indices")}
    ${B.indicesSet("b_indices",B.rank-2,0)}
    ${B.indicesSet("b_indices",B.rank-1,0)}
    let b_offset = ${B.indicesToOffset("b_indices")};
    var values: array<${U.type.value}, ${g}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${h}) {
      ${ve()}
    }
    for (var i = 0u; i < ${g}u; i++) {
      var value = values[i];
      ${ie}
      ${Z}
      let cur_indices = ${U.type.indices}(batch, row + i, col);
      let offset = ${U.indicesToOffset("cur_indices")};
      ${U.setByOffset(`offset / ${p}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${p};${h};${g};${a}`,inputDependencies:w?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:s?s(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:y}),getShaderSource:x}}}),Tu,Eu,zs,Cs,ku,As,Iu,Oa,Os=z(()=>{"use strict";de(),ne(),J(),Vr(),Is(),Es(),Tu=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Eu=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,zs=(e,t,r="f32",i,a=!1,s=32,n=!1,o=32)=>{let u=t[1]*e[1],l=t[0]*e[0],d=a?u:s,p=a?s:u,h=d/t[0],g=s/t[1];if(!((a&&h===4&&e[1]===4||!a&&(h===3||h===4))&&d%t[0]===0&&s%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${a} is true, innerElementSize ${h} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${h} must be 3 or 4.
  tileAWidth ${d} must be divisible by workgroupSize[0]${t[0]}. tileInner ${s} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${h}<${r}>, ${d/h}>, ${p}>;
var<workgroup> mm_Bsub: array<array<vec4<${r}>, ${l/e[0]}>, ${s}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${h};
const tileInner = ${s};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${n?"0":"i32(globalId.z)"};
  ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${u};

  let num_tiles = ${n?`${Math.ceil(o/s)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${n?`i32(globalId.z) * ${o}`:"0"};

  var acc: array<vec4<${r}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${g};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Tu(a,i)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${g}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${i?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${h===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Eu(a,h)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Cs=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,ku=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",As=(e,t,r="f32",i,a=!1,s=32,n=!1,o=32,u=!1)=>{let l=e[1]*t[1],d=e[0]*t[0],p=a?l:s,h=a?s:l;if(!(h%t[1]===0&&p%t[0]===0&&s%t[1]===0))throw new Error(`tileAHight ${h} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${p} must be divisible by workgroupSize[0]${t[0]}, tileInner ${s} must be divisible by workgroupSize[1]${t[1]}`);let g=h/t[1],f=p/t[0],w=s/t[1],$=u?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${d};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${h}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${p}; inputCol = inputCol + ${t[0]}) {
          ${Cs(a,i)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${s}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${d}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${i?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${r}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${a?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${g};
let tileColA = i32(localId.x) * ${f};
let tileRowB = i32(localId.y) * ${w};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${g}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${f}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Cs(a,i)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${w}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${i?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${r}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${ku(a)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${r}, ${p}>, ${h}>;
  var<workgroup> mm_Bsub : array<array<${r}, ${d}>, ${s}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${s};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${n?"0":"i32(globalId.z)"};
    ${i?`let batchIndices = ${i.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${n?`${Math.ceil(o/s)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${n?`i32(globalId.z) * ${o}`:"0"};

    var acc : array<array<${r}, colPerThread>, rowPerThread>;
    ${$}
  }
`},Iu=(e,t,r,i,a=!1)=>{let[s,n,o,u]=i,l=A(i[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${s.type.indices}) -> ${Qe(e,l)} {
      var value = ${Qe(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${n.type.indices};
        ${la("aIndices",n,n.rank-2,s.rank,"batchIndices")}
        ${n.indicesSet("aIndices",n.rank-2,"u32(row)")}
        ${n.indicesSet("aIndices",n.rank-1,"u32(colIn)")}
        value = ${n.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${s.type.indices}) -> ${Qe(e,l)} {
      var value = ${Qe(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${o.type.indices};
        ${la("bIndices",o,o.rank-2,s.rank,"batchIndices")}
        ${o.indicesSet("bIndices",o.rank-2,"u32(row)")}
        ${o.indicesSet("bIndices",o.rank-1,"u32(colIn)")}
        value = ${o.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Qe(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${a?"bias[colIn]":`${Qe(e,l)}(bias[row])`};`:""}
        ${r}
        ${u.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Oa=(e,t,r,i,a=!1,s)=>{let n=e[0].dims,o=e[1].dims,u=n.slice(0,-2),l=o.slice(0,-2),d=i?i.slice(0,-2):r.slice(0,-2),p=P.size(d),h=n[n.length-2],g=n[n.length-1],f=o[o.length-1],w=g%4===0&&f%4===0,$=h<=8?[4,1,1]:[4,4,1],_=[8,8,1],y=[Math.ceil(f/_[0]/$[0]),Math.ceil(h/_[1]/$[1]),Math.ceil(p/_[2]/$[2])],x=w?4:1,S=[...u,h,g/x],I=S.length,O=[...l,g,f/x],B=O.length,U=[p,h,f/x],F=[{type:6,data:h},{type:6,data:f},{type:6,data:g}];Lr(t,F),F.push(...k(d,S,O));let Z=["rank","rank"],le=e.length>2;le&&(F.push(...k(e[2].dims)),Z.push("rank")),F.push(...k(U));let ie=ae=>{let ve=d.length,Se=fe("batchDims",e[0].dataType,ve,1),oe=A(e[0].dataType),ce=C("a",e[0].dataType,I,x),Le=C("b",e[1].dataType,B,x),Q=j("result",e[0].dataType,U.length,x),Ee=[ce,Le];if(le){let ze=a?x:1;Ee.push(C("bias",e[2].dataType,e[2].dims.length,ze))}let K=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];qr(t,K);let Y=A(Q.type.tensor),re=Nr(t,Q.type.value,Y),X=Iu(x,le,re,[Se,ce,Le,Q],a);return`
  ${ae.registerUniforms(K).registerInternalVariables(Se).declareVariables(...Ee,Q)}
  ${X}
  ${w?zs($,_,oe,Se):As($,_,oe,Se)}
                   `};return{name:"MatMul",shaderCache:{hint:`${$};${t.activation};${w};${a}`,inputDependencies:Z},getRunData:()=>({outputs:[{dims:s?s(r):r,dataType:e[0].dataType}],dispatchGroup:{x:y[0],y:y[1],z:y[2]},programUniforms:F}),getShaderSource:ie}}}),zu,Cu,Gc=z(()=>{"use strict";de(),gt(),J(),Vr(),Es(),Wc(),Os(),zu=(e,t,r,i,a=!1,s,n=4,o=4,u=4,l="f32")=>{let d=F=>{switch(F){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${F} is not supported.`)}},p=F=>{switch(F){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${F} is not supported.`)}},h=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,g=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,f=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",w=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",$=e?"row":"col",_=e?"col":"row",y=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${$} / outWidth;
    let outCol = ${$} % outWidth;

    let WRow = ${_} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${_} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${_} % inChannels;
    var resData = ${Qe(n,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${f} && xCol >= 0 && xCol < ${w}) {
      ${h}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${d(n)}
    }
    return resData;`,x=e?t&&i?`
    let col = colIn * ${n};
    ${y}`:`
    let col = colIn * ${n};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${y}
    }
    return ${Qe(n,l)}(0.0);`:i&&r?`
    let col = colIn * ${n};
    ${y}`:`
    let col = colIn * ${n};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${y}
    }
    return ${Qe(n,l)}(0.0);`,S=e?i&&r?p(o):`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${p(o)}
    }
    return ${Qe(o,l)}(0.0);`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${p(o)}
    }
    return ${Qe(o,l)}(0.0);`,I=Qe(u,l),O=Qe(e?n:o,l),B=Qe(e?o:n,l),U=Nr(s,I,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${O} {
      ${e?x:S}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${B} {
      ${e?S:x}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${I}) {
      let col = colIn * ${u};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${g}
      ${xu(a)}
      ${U}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Cu=(e,t,r,i,a,s,n,o,u)=>{let l=t.format==="NHWC",d=l?e[0].dims[3]:e[0].dims[1],p=r[0],h=l?r[2]:r[3],g=l?r[1]:r[2],f=l?r[3]:r[1],w=l&&(d%4===0||d%3===0)&&f%4===0,$=l?f:h*g,_=l?h*g:f,y=[8,8,1],x=i<=8?[4,1,1]:[4,4,1],S=[Math.ceil($/y[0]/x[0]),Math.ceil(_/y[1]/x[1]),Math.ceil(p/y[2]/x[2])];_e("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${S}`);let I=w?l&&d%4!==0?3:4:1,O=y[1]*x[1],B=y[0]*x[0],U=Math.max(y[0]*I,y[1]),F=i%O===0,Z=a%B===0,le=s%U===0,ie=w?[I,4,4]:[1,1,1],ae=[{type:6,data:i},{type:6,data:a},{type:6,data:s},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Lr(t,ae),ae.push(...k(e[0].dims,e[1].dims));let ve=["rank","rank"];n&&(ae.push(...k(e[2].dims)),ve.push("rank")),ae.push(...k(r));let Se=oe=>{let ce=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];qr(t,ce);let Le=w?4:1,Q=A(e[0].dataType),Ee=`
      fn setOutputAtIndex(flatIndex : i32, value : ${w?`vec4<${Q}>`:Q}) {
        result[flatIndex] = ${w?`vec4<${Q}>`:Q}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${w?`vec4<${Q}>`:Q}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${w?"/ 4":""}, value);
      }`,K=C("x",e[0].dataType,e[0].dims.length,I===3?1:I),Y=C("w",e[1].dataType,e[1].dims.length,Le),re=[K,Y],X=j("result",e[0].dataType,r.length,Le);if(n){let ze=C("bias",e[2].dataType,e[2].dims.length,Le);re.push(ze),Ee+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${w?`vec4<${Q}>`:Q} {
          return bias[coords.${l?"w":"y"}${w?"/ 4":""}];
        }`}return`
        ${Su("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${oe.registerUniforms(ce).declareVariables(...re,X)}
        ${Ee}
        ${zu(l,F,Z,le,n,t,ie[0],ie[1],ie[2],Q)}
        ${w?zs(x,y,Q,void 0,!l,U):As(x,y,Q,void 0,!l,U,!1,void 0,o)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${I};${w};${F};${Z};${le};${O};${B};${U}`,inputDependencies:ve},getRunData:()=>({outputs:[{dims:u?u(r):r,dataType:e[0].dataType}],dispatchGroup:{x:S[0],y:S[1],z:S[2]},programUniforms:ae}),getShaderSource:Se}}}),Au,Rs,da,Ou,Bs,Ru,Bu,Mu,jc=z(()=>{"use strict";de(),gt(),ne(),J(),Vr(),Es(),Au=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},Rs=e=>typeof e=="number"?[e,e,e]:e,da=(e,t)=>t<=1?e:e+(e-1)*(t-1),Ou=(e,t,r,i=1)=>{let a=da(t,i);return Math.floor((e[0]*(r-1)-r+a)/2)},Bs=(e,t,r,i,a)=>{a==null&&(a=Ou(e,t[0],i[0]));let s=[0,0,0,r];for(let n=0;n<3;n++)e[n]+2*a>=t[n]&&(s[n]=Math.trunc((e[n]-t[n]+2*a)/i[n]+1));return s},Ru=(e,t,r,i,a,s,n,o,u,l)=>{let d,p,h,g;if(e==="VALID"&&(e=0),typeof e=="number"){d={top:e,bottom:e,left:e,right:e,front:e,back:e};let f=Bs([t,r,i,1],[o,u,l],1,[a,s,n],e);p=f[0],h=f[1],g=f[2]}else if(Array.isArray(e)){if(!e.every((w,$,_)=>w===_[0]))throw Error(`Unsupported padding parameter: ${e}`);d={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let f=Bs([t,r,i,1],[o,u,l],1,[a,s,n],e[0]);p=f[0],h=f[1],g=f[2]}else if(e==="SAME_UPPER"){p=Math.ceil(t/a),h=Math.ceil(r/s),g=Math.ceil(i/n);let f=(p-1)*a+o-t,w=(h-1)*s+u-r,$=(g-1)*n+l-i,_=Math.floor(f/2),y=f-_,x=Math.floor(w/2),S=w-x,I=Math.floor($/2),O=$-I;d={top:x,bottom:S,left:I,right:O,front:_,back:y}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:d,outDepth:p,outHeight:h,outWidth:g}},Bu=(e,t,r,i,a,s=!1,n="channelsLast")=>{let o,u,l,d,p;if(n==="channelsLast")[o,u,l,d,p]=e;else if(n==="channelsFirst")[o,p,u,l,d]=e;else throw new Error(`Unknown dataFormat ${n}`);let[h,,g,f,w]=t,[$,_,y]=Rs(r),[x,S,I]=Rs(i),O=da(g,x),B=da(f,S),U=da(w,I),{padInfo:F,outDepth:Z,outHeight:le,outWidth:ie}=Ru(a,u,l,d,$,_,y,O,B,U),ae=s?h*p:h,ve=[0,0,0,0,0];return n==="channelsFirst"?ve=[o,ae,Z,le,ie]:n==="channelsLast"&&(ve=[o,Z,le,ie,ae]),{batchSize:o,dataFormat:n,inDepth:u,inHeight:l,inWidth:d,inChannels:p,outDepth:Z,outHeight:le,outWidth:ie,outChannels:ae,padInfo:F,strideDepth:$,strideHeight:_,strideWidth:y,filterDepth:g,filterHeight:f,filterWidth:w,effectiveFilterDepth:O,effectiveFilterHeight:B,effectiveFilterWidth:U,dilationDepth:x,dilationHeight:S,dilationWidth:I,inShape:e,outShape:ve,filterShape:t}},Mu=(e,t,r,i,a,s)=>{let n=s==="channelsLast",o=n?e[0].dims[3]:e[0].dims[1],u=!1,l=[64,1,1],d={x:r.map((y,x)=>x)},p=[Math.ceil(Au(d.x.map(y=>r[y]))/l[0]),1,1];_e("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${p}`);let h=u?n&&o%4!==0?3:4:1,g=P.size(r),f=[{type:12,data:g},{type:12,data:i},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];Lr(t,f),f.push(...k(e[0].dims,e[1].dims));let w=["rank","rank"],$=e.length===3;$&&(f.push(...k(e[2].dims)),w.push("rank")),f.push(...k(r));let _=y=>{let x=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:i.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];qr(t,x);let S=u?4:1,I=A(e[0].dataType),O=C("x",e[0].dataType,e[0].dims.length,h===3?1:h),B=C("W",e[1].dataType,e[1].dims.length,S),U=[O,B],F=j("result",e[0].dataType,r.length,S),Z="";if($){let ae=C("bias",e[2].dataType,e[2].dims.length,S);U.push(ae),Z+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${u?`vec4<${I}>`:I} {
          return bias[${n?D("coords",4,5):D("coords",1,5)}${u?"/ 4":""}];
        }`}let le=Qe(h,I),ie=Nr(t,le,I);return`
            ${Z}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${O.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${B.getByIndices("aIndices")};
            }
          ${y.registerUniforms(x).declareVariables(...U,F)}
          ${y.mainStart()}
          ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${F.offsetToIndices("global_idx")};
              let batch = ${D("coords",0,O.rank)};
              let d2 = ${n?D("coords",O.rank-1,O.rank):D("coords",1,O.rank)};
              let xFRCCorner = vec3<u32>(${n?D("coords",1,O.rank):D("coords",2,O.rank)},
              ${n?D("coords",2,O.rank):D("coords",3,O.rank)},
              ${n?D("coords",3,O.rank):D("coords",4,O.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${n?D("uniforms.x_shape",1,O.rank):D("uniforms.x_shape",2,O.rank)};
              let xShapeZ = ${n?D("uniforms.x_shape",2,O.rank):D("uniforms.x_shape",3,O.rank)};
              let xShapeW = ${n?D("uniforms.x_shape",3,O.rank):D("uniforms.x_shape",4,O.rank)};
              let xShapeU = ${n?D("uniforms.x_shape",4,O.rank):D("uniforms.x_shape",1,O.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${n?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${n?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${n?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${n?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${$?"value = value + getBiasByOutputCoords(coords)":""};
              ${ie}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${n};${h};${$}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:p[0],y:p[1],z:p[2]},programUniforms:f}),getShaderSource:_}}}),Du,Pu,Hc=z(()=>{"use strict";de(),ne(),J(),Vr(),Du=(e,t,r,i)=>{let a=e.length>2,s=a?"value += b[output_channel];":"",n=e[0].dims,o=e[1].dims,u=t.format==="NHWC",l=u?r[3]:r[1],d=l/t.group,p=u&&d>=4?R(l):1,h=P.size(r)/p,g=[{type:12,data:h},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:d}];Lr(t,g),g.push(...k(n,[o[0],o[1],o[2],o[3]/p]));let f=a?["rank","rank","rank"]:["rank","rank"];g.push(...k([r[0],r[1],r[2],r[3]/p]));let w=$=>{let _=j("output",e[0].dataType,r.length,p),y=A(_.type.tensor),x=Nr(t,_.type.value,y),S=C("x",e[0].dataType,n.length),I=C("w",e[1].dataType,o.length,p),O=[S,I];a&&O.push(C("b",e[2].dataType,e[2].dims,p));let B=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];qr(t,B);let U=u?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${S.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${I.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${S.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${I.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${$.registerUniforms(B).declareVariables(...O,_)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${_.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${u?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${u?1:2}], outputIndices[${u?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${p} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${u?2:1}];

    var value: ${_.type.value} = ${_.type.value}(0);
    ${U}
    ${s}
    ${x}
    ${_.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${p}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:g}),getShaderSource:w}},Pu=(e,t,r,i)=>{let a=e.length>2,s=R(r[3]),n=R(r[2]),o=P.size(r)/s/n,u=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/s],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/s],d=[r[0],r[1],r[2],r[3]/s],p=[{type:12,data:o},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Lr(t,p),p.push(...k(u,l,d));let h=(n-1)*t.strides[1]+l[1],g=f=>{let w=j("output",e[0].dataType,d.length,s),$=A(w.type.tensor),_=Nr(t,w.type.value,$),y=C("x",e[0].dataType,u.length,s),x=C("w",e[1].dataType,l.length,s),S=[y,x];a&&S.push(C("b",e[2].dataType,e[2].dims,s));let I=a?"value += b[output_channel];":"",O=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return qr(t,O),`
  ${f.registerUniforms(O).declareVariables(...S,w)}
  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${n}u;
    let col = (index1 % width1) * ${n}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${y.type.value}, ${h}>;
    var values: array<${w.type.value}, ${n}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${h}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${y.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${y.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${x.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${n}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${n}u; i++) {
      var value = values[i];
      ${I}
      ${_}
      ${w.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${s};${n};${h};${l[0]};${l[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:p}),getShaderSource:g}}}),Uu,Ra,Nu,Ba,Ms,Ds,Lu,qu,Ps,Kc=z(()=>{"use strict";ne(),Gc(),jc(),Os(),Hc(),Vr(),Is(),zt(),Uu=(e,t,r,i,a,s)=>{let n=e[0],o=e.slice(s?1:2,s?3:4),u=o.length,l=t[0],d=t.slice(2).map((h,g)=>h+(h-1)*(r[g]-1)),p=o.map((h,g)=>h+i[g]+i[g+u]).map((h,g)=>Math.floor((h-d[g]+a[g])/a[g]));return p.splice(0,0,n),p.splice(s?3:1,0,l),p},Ra=[2,3,1,0],Nu=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[1]*t.group;if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Ba=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let s=2;s<t[1].dims.length;++s)r[s-2]===0&&(r[s-2]=t[1].dims[s]);let i=e.pads.slice();tr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,i,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:i}),a},Ms=e=>{let t=Ts(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,s=e.group,n=e.kernel_shape,o=e.pads,u=e.strides,l=e.w_is_const();return{autoPad:i,format:r,dilations:a,group:s,kernelShape:n,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Ds=(e,t,r,i)=>{let a=r.format==="NHWC",s=Uu(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let O=[t[0]];if(a){let B=e.kernelCustomData.wT??e.compute(Ze(t[1],Ra),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=B),O.push(B)}else O.push(t[1]);t.length===3&&O.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(Pu(O,r,s,i),{inputs:O}):e.compute(Du(O,r,s,i),{inputs:O});return}let n=t.length===3,o=t[0].dims[a?1:2],u=t[0].dims[a?2:3],l=t[0].dims[a?3:1],d=t[1].dims[2],p=t[1].dims[3],h=s[a?1:2],g=s[a?2:3],f=s[a?3:1],w=a&&d===o&&p===u&&r.pads[0]===0&&r.pads[1]===0;if(w||d===1&&p===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let O=s[0],B,U,F,Z=[];if(a){let ae=e.kernelCustomData.wT??e.compute(Ze(t[1],Ra),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=ae),w){let ve=o*u*l;B=t[0].reshape([1,O,ve]),U=ae.reshape([1,ve,f]),F=[1,O,f]}else B=t[0].reshape([O,o*u,l]),U=ae.reshape([1,l,f]),F=[O,h*g,f];Z.push(B),Z.push(U)}else B=t[0].reshape([O,l,o*u]),U=t[1].reshape([1,f,l]),F=[O,f,h*g],Z.push(U),Z.push(B);n&&Z.push(t[2]);let le=F[2],ie=Z[0].dims[Z[0].dims.length-1];le<8&&ie<8?e.compute(ks(Z,r,s,F,a,i),{inputs:Z}):e.compute(Oa(Z,r,s,F,a,i),{inputs:Z});return}let $=!0,_=e.kernelCustomData.wT??e.compute(Ze(t[1],Ra),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=_);let y=[t[0],_];n&&y.push(t[2]);let x=a?h*g:f,S=a?f:h*g,I=d*p*l;e.compute(Cu(y,r,s,x,S,I,n,$,i),{inputs:y})},Lu=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],s=[1].concat(t.strides),n=[1].concat(t.dilations),o=[1].concat(t.kernelShape),u=Ba({...t,pads:a,strides:s,dilations:n,kernelShape:o},i);Ds(e,i,u,l=>r?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},qu=(e,t,r)=>{let i=r.format==="NHWC"?"channelsLast":"channelsFirst",a=Ba(r,t),s=r.autoPad==="NOTSET"?r.pads:r.autoPad,n=Bu(t[0].dims,t[1].dims,r.strides,r.dilations,s,!1,i);e.compute(Mu(t,a,n.outShape,[n.filterDepth,n.filterHeight,n.filterWidth],[n.padInfo.front,n.padInfo.top,n.padInfo.left],i))},Ps=(e,t)=>{if(Nu(e.inputs,t),e.inputs[0].dims.length===3)Lu(e,t);else if(e.inputs[0].dims.length===5)qu(e,e.inputs,t);else{let r=Ba(t,e.inputs);Ds(e,e.inputs,r)}}}),Vu,Zc=z(()=>{"use strict";de(),gt(),ne(),J(),Vu=(e,t,r)=>{let i=e.length>2,a=t.outputShape,s=t.format==="NHWC",n=t.group,o=e[1].dims,u=o[2]/n,l=o[3],d=s?R(u):1,p=s&&l===1&&u>=4,h=p?Math.floor(u/4)*4:Math.floor(u/d)*d,g=u-h,f=s?R(l):1,w=s?l===1?d:f:1,$=P.size(a)/f,_=[Math.ceil($/64),1,1];_e("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${_}`);let y=["rank","rank"],x=[t.strides[0],t.strides[1]],S=[t.kernelShape[s?1:2],t.kernelShape[s?2:3]],I=[t.dilations[0],t.dilations[1]],O=[S[0]+(t.dilations[0]<=1?0:(t.kernelShape[s?1:2]-1)*(t.dilations[0]-1)),S[1]+(t.dilations[1]<=1?0:(t.kernelShape[s?2:3]-1)*(t.dilations[1]-1))],B=[O[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),O[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],U=[{type:12,data:$},{type:12,data:x},{type:12,data:S},{type:12,data:I},{type:12,data:O},{type:6,data:B},{type:12,data:h},{type:12,data:u},{type:12,data:l},...k(e[0].dims,e[1].dims)];i&&(U.push(...k(e[2].dims)),y.push("rank")),U.push(...k(a));let F=Z=>{let le=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:x.length},{name:"filter_dims",type:"u32",length:S.length},{name:"dilations",type:"u32",length:S.length},{name:"effective_filter_dims",type:"u32",length:O.length},{name:"pads",type:"i32",length:B.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],ie=A(e[0].dataType),ae=s?1:2,ve=s?2:3,Se=s?3:1,oe=C("W",e[1].dataType,e[1].dims.length,w),ce=C("Dy",e[0].dataType,e[0].dims.length,d),Le=[ce,oe];i&&Le.push(C("bias",e[2].dataType,[a[Se]].length,f));let Q=j("result",e[0].dataType,a.length,f),Ee=()=>{let re="";if(p)d===4?re+=`
        let xValue = ${ce.getByOffset("x_offset")};
        let wValue = ${oe.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:d===2?re+=`
          dotProd = dotProd + dot(vec4<${ie}>(${ce.getByOffset("x_offset")}, ${ce.getByOffset("x_offset + 1u")}), vec4<${ie}>(${oe.getByOffset("w_offset")}, ${oe.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:d===1&&(re+=`
          dotProd = dotProd + dot(vec4<${ie}>(${ce.getByOffset("x_offset")}, ${ce.getByOffset("x_offset + 1u")}, ${ce.getByOffset("x_offset + 2u")}, ${ce.getByOffset("x_offset + 3u")}), vec4<${ie}>(${oe.getByOffset("w_offset")}, ${oe.getByOffset("w_offset + 1u")}, ${oe.getByOffset("w_offset + 2u")}, ${oe.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(re+=`
                  let xValue = ${s?ce.getByOffset(`${ce.indicesToOffset(`${ce.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d}`):ce.get("batch","inputChannel","idyR","idyC")};
        `,d===1)re+=`
          let w_offset = ${oe.indicesToOffset(`${oe.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${oe.getByOffset(`w_offset / ${w}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let X=0;X<d;X++)re+=`
            let wValue${X} = ${oe.getByOffset(`${oe.indicesToOffset(`${oe.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${X}, wOutChannel)`)} / ${w}`)};
            dotProd = dotProd + xValue[${X}] * wValue${X};`;return re},K=()=>{if(g===0)return"";if(!p)throw new Error(`packInputAs4 ${p} is not true.`);let re="";if(d===1){re+="dotProd = dotProd";for(let X=0;X<g;X++)re+=`
            + ${ce.getByOffset(`x_offset + ${X}`)} * ${oe.getByOffset(`w_offset + ${X}`)}`;re+=";"}else if(d===2){if(g!==2)throw new Error(`Invalid inputChannelsRemainder ${g}.`);re+=`
          let xValue = ${ce.getByOffset("x_offset")};
          let wValue = ${oe.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return re},Y=`
            let outputIndices = ${Q.offsetToIndices(`global_idx * ${f}`)};
            let batch = ${Q.indicesGet("outputIndices",0)};
            let d1 = ${Q.indicesGet("outputIndices",Se)};
            let r = ${Q.indicesGet("outputIndices",ae)};
            let c = ${Q.indicesGet("outputIndices",ve)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${Q.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${ie}(dyRCorner) + ${ie}(wR)) / ${ie}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${ie}(uniforms.Dy_shape[${ae}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${ie}(dyCCorner) + ${ie}(wC)) / ${ie}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${ie}(uniforms.Dy_shape[${ve}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${p?`
                var x_offset = ${ce.indicesToOffset(`${ce.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${d};
                var w_offset = ${oe.indicesToOffset(`${oe.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${w};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${p?4:d}) {
                  ${Ee()}
                  inputChannel = inputChannel + ${p?4:d};
                }
                ${K()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${i?` + bias[d1 / ${f}]`:""};
            ${Q.setByOffset("global_idx","value")};
          `;return`
    ${Z.registerUniforms(le).declareVariables(...Le,Q)}
      ${Z.mainStart()}
      ${Z.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${Y}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${d}${w}${f}${p}${g}`,inputDependencies:y},getRunData:()=>({dispatchGroup:{x:_[0],y:_[1],z:_[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:U}),getShaderSource:F}}}),Fu,Wu,Gu,Us,ju,Hu,Ns,Ku,Zu,Qc=z(()=>{"use strict";Zc(),Vr(),zt(),Fu=(e,t,r,i,a,s)=>(e-1)*t+r+(i-1)*a+1-s,Wu=(e,t,r,i,a)=>{let s=Math.floor(e/2);t==="SAME_UPPER"?(r[i]=s,r[a]=e-s):t==="SAME_LOWER"&&(r[i]=e-s,r[a]=s)},Gu=(e,t,r,i,a,s,n,o,u,l)=>{let d=e.length-2,p=l.length===0;u.length<d&&u.push(...Array(d-u.length).fill(0));let h=e[0],g=t[o?3:1]*a;for(let f=0,w=e.length-d-(o?1:0);f<d;++f,++w){let $=e[w],_=p?$*n[f]:l[f],y=Fu($,n[f],s[f],t[w],r[f],_);Wu(y,i,s,f,f+d),p&&l.push(n[f]*($-1)+u[f]+(t[w]-1)*r[f]+1-s[f]-s[f+d])}l.splice(0,0,h),l.splice(o?3:1,0,g)},Us=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((p,h)=>p*h,1)===0){r.length=0;for(let p=2;p<t[1].dims.length;++p)r.push(t[1].dims[p])}let i=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(i?3:1,0,t[1].dims[1]);let a=e.pads.slice(),s=e.outputShape.slice(),n=e.outputPadding.slice(),o=t[0].dims,u=e.dilations.slice();if(u.reduce((p,h)=>p+h,0)===0){let p=t[0].dims.length-2;u=new Array(p).fill(1)}let l=e.strides.slice();if(l.reduce((p,h)=>p+h,0)===0){let p=t[0].dims.length-2;l=new Array(p).fill(1)}Gu(o,r,u,e.autoPad,e.group,a,l,i,n,s);let d=Object.assign({},e);return Object.assign(d,{kernelShape:r,pads:a,outputPadding:n,outputShape:s,dilations:u,strides:l}),d},ju=e=>{let t=Ts(e),r=e.format,i=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,s=e.group??1,n=e.kernelShape,o=e.pads,u=e.strides,l=e.wIsConst(),d=e.outputPadding,p=e.outputShape;return{autoPad:i,format:r,dilations:a,group:s,kernelShape:n,outputPadding:d,outputShape:p,pads:o,strides:u,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Hu=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],i=e[1].dims[0];if(r!==i)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let s=e[0].dims.length-2;if(t.dilations.reduce((n,o)=>n+o,0)>0&&t.dilations.length!==s)throw new Error(`dilations should be ${s}D`);if(t.strides.reduce((n,o)=>n+o,0)>0&&t.strides.length!==s)throw new Error(`strides should be ${s}D`);if(t.pads.reduce((n,o)=>n+o,0)>0&&t.pads.length!==s*2)throw new Error(`pads should be ${s*2}D`);if(t.outputPadding.length!==s&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${s}D`);if(t.kernelShape.reduce((n,o)=>n+o,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Ns=(e,t,r,i)=>{let a=e.kernelCustomData.wT??e.compute(Ze(t[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=a);let s=[t[0],a];t.length===3&&s.push(t[2]),e.compute(Vu(s,r,i),{inputs:s})},Ku=(e,t)=>{let r=t.format==="NHWC",i=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&i.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let s=t.dilations;(s.length===0||s[0]===0)&&(s=[1]);let n=t.strides;(n.length===0||n[0]===0)&&(n=[1]);let o=t.pads;o.length===0&&(o=[0,0]),o=[0,o[0],0,o[1]],n=[1].concat(n),s=[1].concat(s),a=[1].concat(a);let u=t.outputPadding;u=[0].concat(u);let l=Us({...t,pads:o,strides:n,dilations:s,kernelShape:a,outputPadding:u},i);Ns(e,i,l,d=>r?[d[0],d[2],d[3]]:[d[0],d[1],d[3]])},Zu=(e,t)=>{if(Hu(e.inputs,t),e.inputs[0].dims.length===3)Ku(e,t);else{let r=Us(t,e.inputs);Ns(e,e.inputs,r)}}}),Qu,Xu,Yu,Xc=z(()=>{"use strict";de(),ne(),b(),J(),Qu=(e,t,r,i)=>{let a=P.size(t),s=t.length,n=C("input",e,s),o=j("output",e,s),u=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),l=P.normalizeAxis(u,s),d=p=>{let h=` i32(${n.indicesGet("inputIndices","uniforms.axis")}) `,g=D("uniforms.input_shape","uniforms.axis",s),f=i.reverse?h+(i.exclusive?" + 1":""):"0",w=i.reverse?g:h+(i.exclusive?"":" + 1");return`
                ${p.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(n,o)}
                ${p.mainStart()}
                  ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${o.offsetToIndices("global_idx")};
                  var sum = ${o.type.value}(0);
                  let first : i32 = ${f};
                  let last : i32 = ${w};
                  for (var i : i32 = first; i < last; i++) {
                    ${n.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${n.getByIndices("inputIndices")};
                  }
                  ${o.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:i.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:l},...k(t,t)]}),getShaderSource:d}},Xu=(e,t)=>{let r=e.inputs[0].dims,i=e.inputs[0].dataType,a=e.inputs[1];e.compute(Qu(i,r,a,t),{inputs:[0]})},Yu=e=>{let t=e.exclusive===1,r=e.reverse===1;return m({exclusive:t,reverse:r})}}),Ju,el,tl,rl,il,Yc=z(()=>{"use strict";de(),ne(),b(),J(),Ju=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},el=(e,t,r,i)=>{let a=[];a.push(`fn perm(i: ${i.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let s=0;s<t;++s)a.push(r.indicesSet("a",e[s],`i[${s}]`));return a.push("return a;}"),a.join(`
`)},tl=(e,t)=>{let r,i,a,s,n,o,u=t.format==="NHWC",l=t.blocksize,d=t.mode==="DCR";u?([r,i,a,s]=e.dims,n=d?[r,i,a,l,l,s/l**2]:[r,i,a,s/l**2,l,l],o=d?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,i,a,s]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],n=d?[r,l,l,s/l**2,i,a]:[r,s/l**2,l,l,i,a],o=d?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let p=e.reshape(n),h=p.dims.length,g=e.dataType,f=C("a",g,h),w=j("output",g,h),$=_=>`
  ${_.registerUniform("output_size","u32").declareVariables(f,w)}

  ${el(o,h,f,w)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${w.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${w.setByOffset("global_idx",f.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:_=>{let y=u?[r,i*l,a*l,s/l**2]:[r,s/l**2,i*l,a*l],x=P.size(y),S=p.dims,I=P.sortBasedOnPerm(S,o);return{outputs:[{dims:y,dataType:_[0].dataType}],dispatchGroup:{x:Math.ceil(x/64)},programUniforms:[{type:12,data:x},...k(S,I)]}},getShaderSource:$}},rl=(e,t)=>{Ju(e.inputs),e.compute(tl(e.inputs[0],t))},il=e=>m({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Ma,pa,Ls,al,sl,nl,ol,qs,ul,ll,dl,Jc=z(()=>{"use strict";de(),ne(),b(),J(),Ma="[a-zA-Z]|\\.\\.\\.",pa="("+Ma+")+",Ls="^"+pa+"$",al="("+pa+",)*"+pa,sl="^"+al+"$",nl=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},ol=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,i]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(sl)))throw new Error("Invalid LHS term");if(r.split(",").forEach((s,n)=>{let o=e[n].dims.slice();if(!s.match(RegExp(Ls)))throw new Error("Invalid LHS term");let u=this.processTerm(s,!0,o,n);this.lhs.push(u)}),i==="")i+=[...this.symbolToInfo.entries()].filter(([s,n])=>n.count===1||s==="...").map(([s])=>s).join("");else if(!i.match(RegExp(pa)))throw new Error("Invalid RHS");(a=i.match(RegExp(Ma,"g")))==null||a.forEach(s=>{if(s==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let n=this.symbolToInfo.get(s);if(n===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(n.dimValue)}}),this.rhs=this.processTerm(i,!1,this.outputDims)}addSymbol(e,t,r){let i=this.symbolToInfo.get(e);if(i!==void 0){if(i.dimValue!==t&&i.count!==1)throw new Error("Dimension mismatch");i.count++,i.inputIndices.push(r)}else i={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,i)}processTerm(e,t,r,i=-1){let a=r.length,s=!1,n=[],o=0;if(!e.match(RegExp(Ls))&&!t&&e!=="")throw new Error("Invalid LHS term");let u=e.match(RegExp(Ma,"g")),l=new nl(i);return u==null||u.forEach((d,p)=>{if(d==="..."){if(s)throw new Error("Only one ellipsis is allowed per input term");s=!0;let h=a-u.length+1;if(h<0)throw new Error("Ellipsis out of bounds");if(n=r.slice(o,o+h),this.hasEllipsis){if(this.ellipsisDims.length!==n.length||this.ellipsisDims.toString()!==n.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=n;else throw new Error("Ellipsis must be specified in the LHS");for(let g=0;g<n.length;g++){let f=String.fromCharCode(48+g);l.addSymbol(f,p+g),this.addSymbol(f,r[o++],i)}}else l.addSymbol(d,p+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(d,r[o++],i)}),l}},qs=e=>e+"_max",ul=(e,t,r,i)=>{let a=e.map(l=>l.length).map((l,d)=>C(`input${d}`,t,l)),s=P.size(i),n=j("output",t,i.length),o=[...r.symbolToInfo.keys()].filter(l=>!r.rhs.symbolToIndices.has(l)),u=l=>{let d=[],p="var prod = 1.0;",h="var sum = 0.0;",g="sum += prod;",f=[],w=[],$=[],_=[],y=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((S,I)=>{var O;if(r.rhs.symbolToIndices.has(I)){let B=(O=r.rhs.symbolToIndices.get(I))==null?void 0:O[0];B!==void 0&&r.lhs.forEach((U,F)=>{if(S.inputIndices.includes(F)){let Z=U.symbolToIndices.get(I);if(Z===void 0)throw new Error("Invalid symbol error");Z.forEach(le=>{d.push(`${a[F].indicesSet(`input${F}Indices`,le,n.indicesGet("outputIndices",B))}`)})}})}else r.lhs.forEach((B,U)=>{if(S.inputIndices.includes(U)){let F=B.symbolToIndices.get(I);if(F===void 0)throw new Error("Invalid symbol error");F.forEach(Z=>{f.push(`${a[U].indicesSet(`input${U}Indices`,Z,`${I}`)}`)}),_.push(`prod *= ${a[U].getByIndices(`input${U}Indices`)};`)}}),w.push(`for(var ${I}: u32 = 0; ${I} < uniforms.${qs(I)}; ${I}++) {`),$.push("}")});let x=y?[...d,`let sum = ${a.map((S,I)=>S.getByIndices(`input${I}Indices`)).join(" * ")};`]:[...d,h,...w,...f,p,..._,g,...$];return`
            ${l.registerUniforms(o.map(S=>({name:`${qs(S)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,n)}

            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${n.offsetToIndices("global_idx")};
            ${a.map((S,I)=>`var input${I}Indices: ${a[I].type.indices};`).join(`
`)}
            ${x.join(`
`)};
            ${n.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let l=o.filter(p=>r.symbolToInfo.has(p)).map(p=>{var h;return{type:12,data:((h=r.symbolToInfo.get(p))==null?void 0:h.dimValue)||0}});l.push({type:12,data:s});let d=e.map((p,h)=>[...k(p)]).reduce((p,h)=>p.concat(h),l);return d.push(...k(i)),{outputs:[{dims:i,dataType:t}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}},getShaderSource:u}},ll=(e,t)=>{let r=new ol(e.inputs,t.equation),i=r.outputDims,a=e.inputs.map((s,n)=>s.dims);e.compute(ul(a,e.inputs[0].dataType,r,i))},dl=e=>{let t=e.equation.replace(/\s+/g,"");return m({equation:t})}}),pl,Vs,cl,hl,fl,eh=z(()=>{"use strict";de(),ne(),J(),pl=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;i<r.length&&a<t.length;++i,++a)if(r[i]!==t[a]&&r[i]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Vs=(e,t)=>{let r=e.length-t.length,i=[];for(let a=0;a<r;++a)i.push(e[a]);for(let a=0;a<t.length;++a)i.push(t[a]===1?e[a+r]:t[a]);return i},cl=(e,t)=>e.length>t.length?Vs(e,t):Vs(t,e),hl=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),i=cl(t,r),a=e[0].dataType,s=a===9||P.size(t)===1,n=a===9||t.length>0&&t[t.length-1]%4===0?4:1,o=s||i.length>0&&i[i.length-1]%4===0?4:1,u=Math.ceil(P.size(i)/o),l=p=>{let h=C("input",a,t.length,n),g=j("output",a,i.length,o),f;if(a===9){let w=($,_,y="")=>`
          let outputIndices${_} = ${g.offsetToIndices(`outputOffset + ${_}u`)};
          let offset${_} = ${h.broadcastedIndicesToOffset(`outputIndices${_}`,g)};
          let index${_} = offset${_} / 4u;
          let component${_} = offset${_} % 4u;
          ${$}[${_}] = ${y}(${h.getByOffset(`index${_}`)}[component${_}]);
        `;f=`
        let outputOffset = global_idx * ${o};
        var data = vec4<u32>(0);
        ${w("data",0,"u32")}
        ${w("data",1,"u32")}
        ${w("data",2,"u32")}
        ${w("data",3,"u32")}
        ${g.setByOffset("global_idx","data")}
      }`}else f=`
        let outputIndices = ${g.offsetToIndices(`global_idx * ${o}`)};
        let inputOffset = ${h.broadcastedIndicesToOffset("outputIndices",g)};
        let data = ${g.type.value}(${h.getByOffset(`inputOffset / ${n}`)});
        ${g.setByOffset("global_idx","data")}
      }`;return`
    ${p.registerUniform("vec_size","u32").declareVariables(h,g)}
    ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${f}`},d=[{type:12,data:u},...k(t,i)];return{name:"Expand",shaderCache:{hint:`${i.length};${n}${o}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d})}},fl=e=>{pl(e.inputs),e.compute(hl(e.inputs),{inputs:[0]})}}),ml,gl,th=z(()=>{"use strict";de(),ne(),J(),Ss(),ml=e=>{let t=e[0].dataType,r=P.size(e[0].dims),i=P.size(e[1].dims),a=i%4===0,s=n=>{let o=C("x",t,[1],4),u=C("bias",t,[1],4),l=j("y",t,[1],4),d=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],p=g=>`
      let bias${g}_offset: u32 = (global_idx * 4 + ${g}) % uniforms.bias_size;
      let bias${g} = ${u.getByOffset(`bias${g}_offset / 4`)}[bias${g}_offset % 4];`,h=a?`
      let bias = ${u.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${p(0)}${p(1)}${p(2)}${p(3)}
      let bias = ${o.type.value}(bias0, bias1, bias2, bias3);`;return`${n.registerUniforms(d).declareVariables(o,u,l)}

    ${vs(E(t))}

    ${n.mainStart(T)}
      ${n.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${o.getByOffset("global_idx")};
      ${h}
      let x_in = x + bias;
      ${l.setByOffset("global_idx",xs("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:s,getRunData:n=>({outputs:[{dims:n[0].dims,dataType:n[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:i}],dispatchGroup:{x:Math.ceil(r/T/4)}})}},gl=e=>{e.inputs.length<2||P.size(e.inputs[1].dims)===0?Qo(e):e.compute(ml(e.inputs))}}),yl,wl,_l,bl,rh=z(()=>{"use strict";de(),ne(),b(),J(),yl=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},wl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,s=P.normalizeAxis(t.axis,a),n=r.slice(0);n.splice(s,1,...i);let o=r[s],u=e[0].dataType===9?4:1,l=Math.ceil(P.size(n)/u),d=[{type:12,data:l},{type:6,data:o},{type:12,data:s},...k(e[0].dims,e[1].dims,n)],p=h=>{let g=C("data",e[0].dataType,e[0].dims.length,u),f=C("inputIndices",e[1].dataType,e[1].dims.length),w=j("output",e[0].dataType,n.length,u),$=y=>{let x=i.length,S=`var indicesIndices${y}  = ${f.type.indices}(0);`;for(let I=0;I<x;I++)S+=`${x>1?`indicesIndices${y}[${I}]`:`indicesIndices${y}`} = ${n.length>1?`outputIndices${y}[uniforms.axis + ${I}]`:`outputIndices${y}`};`;S+=`
          var idx${y} = ${f.getByIndices(`indicesIndices${y}`)};
          if (idx${y} < 0) {
            idx${y} = idx${y} + uniforms.axisDimLimit;
          }
          var dataIndices${y} : ${g.type.indices};
        `;for(let I=0,O=0;I<a;I++)I===s?(S+=`${a>1?`dataIndices${y}[${I}]`:`dataIndices${y}`} = u32(idx${y});`,O+=x):(S+=`${a>1?`dataIndices${y}[${I}]`:`dataIndices${y}`} = ${n.length>1?`outputIndices${y}[${O}]`:`outputIndices${y}`};`,O++);return S},_;if(e[0].dataType===9){let y=(x,S,I="")=>`
          let outputIndices${S} = ${w.offsetToIndices(`outputOffset + ${S}u`)};
          ${$(S)};
          let offset${S} = ${g.indicesToOffset(`dataIndices${S}`)};
          let index${S} = offset${S} / 4u;
          let component${S} = offset${S} % 4u;
          ${x}[${S}] = ${I}(${g.getByOffset(`index${S}`)}[component${S}]);
        `;_=`
        let outputOffset = global_idx * ${u};
        var value = vec4<u32>(0);
        ${y("value",0,"u32")}
        ${y("value",1,"u32")}
        ${y("value",2,"u32")}
        ${y("value",3,"u32")}
        ${w.setByOffset("global_idx","value")}
      `}else _=`
      let outputIndices = ${w.offsetToIndices("global_idx")};
      ${$("")};
      let value = ${g.getByIndices("dataIndices")};
      ${w.setByOffset("global_idx","value")};
      `;return`
      ${h.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(g,f,w)}
      ${h.mainStart()}
        ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${_}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:p}},_l=e=>m({axis:e.axis}),bl=(e,t)=>{let r=e.inputs;yl(r),e.compute(wl(e.inputs,t))}}),$l,vl,xl,ih=z(()=>{"use strict";de(),ne(),J(),$l=(e,t,r,i,a,s,n,o,u)=>{let l=[{type:12,data:s},{type:12,data:i},{type:12,data:a},{type:12,data:r},{type:12,data:n},{type:12,data:o},{type:12,data:u}],d=[s];l.push(...k(t.dims,d));let p=h=>{let g=C("indices_data",t.dataType,t.dims.length),f=j("input_slice_offsets_data",12,1,1),w=[g,f],$=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:a.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${h.registerUniforms($).declareVariables(...w)}
  ${h.mainStart()}
    ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${a.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${r.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${a.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:d,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:l}),getShaderSource:p},{inputs:[t],outputs:[-1]})[0]},vl=(e,t)=>{let r=e.inputs,i=r[0].dims,a=r[0].dataType,s=r[1].dims,n=s[s.length-1],o=P.sizeToDimension(s,s.length-1),u=P.sizeFromDimension(i,t.batchDims+n),l=P.sizeToDimension(i,t.batchDims),d=P.sizeFromDimension(i,t.batchDims),p=o/l,h=new Array(n),g=u;for(let S=0;S<n;++S)h[n-1-S]=g,g*=i[t.batchDims+n-1-S];let f=$l(e,r[1],h,t.batchDims,i,o,p,d,n),w=t.batchDims+n;if(w>i.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let $=s.slice(0,-1).concat(i.slice(w)),_=P.size($),y=[{type:12,data:_},{type:12,data:u},...k(r[0].dims,f.dims,$)],x=S=>{let I=C("data",r[0].dataType,r[0].dims.length),O=C("slice_offsets",12,f.dims.length),B=j("output",r[0].dataType,$.length);return`
          ${S.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(I,O,B)}
            ${S.mainStart()}
            ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:$,dataType:a}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:y}),getShaderSource:x},{inputs:[r[0],f]})},xl=e=>({batchDims:e.batch_dims,cacheKey:""})}),Sl,Tl,El,kl,ah=z(()=>{"use strict";de(),ne(),b(),J(),Sl=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=P.normalizeAxis(t.quantizeAxis,e[0].dims.length),i=t.blockSize,a=e[0],s=e[2],n=e.length===4?e[3]:void 0;if(s.dims.length!==a.dims.length||!a.dims.map((o,u)=>u===r?Math.ceil(o/i)===s.dims[u]:o===s.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(n){if(n.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(n.dims.length!==s.dims.length||!n.dims.map((o,u)=>o===s.dims[u]).reduce((o,u)=>o&&u,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},Tl=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r.length,s=P.normalizeAxis(t.gatherAxis,a),n=P.normalizeAxis(t.quantizeAxis,a),o=r.slice(0);o.splice(s,1,...i);let u=P.size(o),l=e[2].dataType,d=e[0].dataType===22,p=[{type:12,data:u},{type:12,data:n},{type:12,data:s},{type:12,data:t.blockSize},...k(...e.map((g,f)=>g.dims),o)],h=g=>{let f=C("data",e[0].dataType,e[0].dims.length),w=C("inputIndices",e[1].dataType,e[1].dims.length),$=C("scales",e[2].dataType,e[2].dims.length),_=e.length>3?C("zeroPoint",e[3].dataType,e[3].dims.length):void 0,y=j("output",l,o.length),x=[f,w,$];_&&x.push(_);let S=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${g.registerUniforms(S).declareVariables(...x,y)}
        ${g.mainStart()}
        let output_indices = ${y.offsetToIndices("global_idx")};
        var indices_indices = ${w.type.indices}(0);
        ${i.length>1?`
          for (var i: u32 = 0; i < ${i.length}; i++) {
            let index = ${y.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${w.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${y.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${f.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${y.indicesGet("output_indices","i")};
          ${f.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${w.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${r[s]};
        }
        ${f.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${o.length}; i++) {
          let index = ${y.indicesGet("output_indices",`i + ${i.length} - 1`)};
          ${f.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${f.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${f.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${$.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${$.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${$.getByIndices("scale_indices")};
        ${_?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${_.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${_.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${d?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${E(l)}(quantized_data - zero_point) * scale;
        ${y.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((g,f)=>f!==1).map(g=>g.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(g,f)=>"rank")},getRunData:()=>({outputs:[{dims:o,dataType:l}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:p}),getShaderSource:h}},El=(e,t)=>{let r=e.inputs;Sl(r,t),e.compute(Tl(e.inputs,t))},kl=e=>m({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),Il,zl,Cl,Al,sh=z(()=>{"use strict";de(),ne(),b(),J(),Il=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},zl=(e,t)=>{let r=e[0].dims,i=e[0].dataType,a=r.length,s=e[1].dims,n=e[1].dataType,o=P.normalizeAxis(t.axis,a),u=r[o],l=s.slice(0),d=P.size(l),p=C("input",i,a),h=C("indicesInput",n,s.length),g=j("output",i,l.length),f=[{type:12,data:d},{type:6,data:u},{type:12,data:o}];return f.push(...k(r,s,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:f}),getShaderSource:w=>`
      ${w.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(p,h,g)}
      ${w.mainStart()}
      ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${g.offsetToIndices("global_idx")};

      var idx = ${h.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${p.type.indices}(outputIndices);
      ${p.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${p.getByIndices("inputIndices")};

      ${g.setByOffset("global_idx","value")};
  }`}},Cl=e=>m({axis:e.axis}),Al=(e,t)=>{let r=e.inputs;Il(r),e.compute(zl(e.inputs,t))}}),Ol,Rl,Bl,Ml,nh=z(()=>{"use strict";de(),ne(),J(),Ol=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},Rl=(e,t)=>{let r=e[0].dims.slice(),i=e[1].dims.slice(),[a,s,n]=ri.getShapeOfGemmResult(r,t.transA,i,t.transB,e.length===3?e[2].dims:void 0),o=[a,s];if(!o)throw new Error("Can't use gemm on the given tensors");let u=16,l=Math.ceil(s/u),d=Math.ceil(a/u),p=!0,h=P.size(o),g=[{type:12,data:p?l:h},{type:12,data:a},{type:12,data:s},{type:12,data:n},{type:1,data:t.alpha},{type:1,data:t.beta}],f=["type","type"];e.length===3&&(g.push(...k(e[2].dims)),f.push("rank")),g.push(...k(o));let w=_=>{let y="";t.transA&&t.transB?y="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?y="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?y="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(y="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let x=t.alpha===1?"":"value *= uniforms.alpha;",S=C("a",e[0].dataType,e[0].dims),I=C("b",e[1].dataType,e[1].dims),O=S.type.value,B=null,U=[S,I];e.length===3&&(B=C("c",e[2].dataType,e[2].dims.length),U.push(B));let F=j("output",e[0].dataType,o.length);U.push(F);let Z=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${_.registerUniforms(Z).declareVariables(...U)}

  ${_.mainStart()}
    ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${O}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${y}
    }

    ${x}
    ${B!=null?`let cOffset = ${B.broadcastedIndicesToOffset("vec2(m, n)",F)}; value += ${O}(uniforms.beta) * ${B.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},$=_=>{let y=C("a",e[0].dataType,e[0].dims),x=C("b",e[1].dataType,e[1].dims),S=null,I=[y,x];e.length===3&&(S=C("c",e[2].dataType,e[2].dims.length),I.push(S));let O=j("output",e[0].dataType,o.length);I.push(O);let B=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],U="",F="";t.transA&&t.transB?(F=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${x.type.value}(0);
      }
      `,U="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(F=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${x.type.value}(0);
      }
      `,U="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(F=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${x.type.value}(0);
      }
      `,U="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(F=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${y.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${x.type.value}(0);
      }
      `,U="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let Z=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${_.registerUniforms(B).declareVariables(...I)}
  var<workgroup> tile_a: array<array<${y.type.storage}, ${u}>, ${u}>;
  var<workgroup> tile_b: array<array<${x.type.storage}, ${u}>, ${u}>;
  ${_.mainStart([u,u,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${u};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${u};
    let num_tiles = (uniforms.K - 1) / ${u} + 1;
    var k_start = 0u;
    var value = ${O.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${F}
      k_start = k_start + ${u};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${u}; k++) {
        ${U}
      }
      workgroupBarrier();
    }

    ${Z}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${S!=null?`let cOffset = ${S.broadcastedIndicesToOffset("vec2(m, n)",O)}; value += ${O.type.value}(uniforms.beta) * ${S.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return p?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:l*d},programUniforms:g}),getShaderSource:$}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:g}),getShaderSource:w}},Bl=e=>{let t=e.transA,r=e.transB,i=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:i,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},Ml=(e,t)=>{Ol(e.inputs),e.compute(Rl(e.inputs,t))}}),Gt,Yt,Fr,Wr,Dl,Pl,Ul,Nl,Ll,ql,Vl,Fl,Wl,Gl,oh=z(()=>{"use strict";de(),ne(),b(),J(),[Gt,Yt,Fr,Wr]=[0,1,2,3],Dl=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},Pl=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Ul=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Nl=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Ll=e=>`
  ${e.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,ql=(e,t,r)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${Gt}] = batch;
     indices[${Yt}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${Fr}] = u32(r);
            indices[${Wr}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case"border":return`
          indices[${Fr}] = u32(clamp(r, 0, H - 1));
          indices[${Wr}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${Fr}] = gs_reflect(r, border[1], border[3]);
          indices[${Wr}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${r.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices("indices")};
  }
`,Vl=(e,t,r)=>(()=>{switch(r.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${Gt}], indices[${Yt}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${Gt}], indices[${Yt}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${Gt}], indices[${Yt}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${Gt}], indices[${Yt}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${Gt}], indices[${Yt}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${Gt}], indices[${Yt}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,Fl=(e,t)=>{let r=C("x",e[0].dataType,e[0].dims.length),i=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],a=C("grid",e[1].dataType,i.length,2),s=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(s=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[Gt,Yt,Fr,Wr]=[0,3,1,2]);let n=j("output",e[0].dataType,s.length),o=r.type.value,u=P.size(s),l=[{type:12,data:u},...k(e[0].dims,i,s)],d=p=>`
  ${p.registerUniform("output_size","u32").declareVariables(r,a,n)}
  ${Pl}
  ${Ul(o)}
  ${Nl(t)}
  ${Ll(t)}
  ${ql(r,o,t)}

  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${Fr}]);
      let W_in = i32(uniforms.x_shape[${Wr}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${n.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${Gt}], indices[${Fr}], indices[${Wr}]);
      let nxy = ${a.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${Vl(n,o,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:p=>{let h=P.size(s);return{outputs:[{dims:s,dataType:p[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:l}},getShaderSource:d}},Wl=(e,t)=>{Dl(e.inputs),e.compute(Fl(e.inputs,t))},Gl=e=>m({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),ot,jl,Hl,Fs,Kl,ca,Zl,Ql=z(()=>{"use strict";de(),ne(),b(),ni(),bs(),J(),zt(),ot=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,jl=(e,t)=>{let r=e[0],i=ot(e,1),a=ot(e,2),s=ot(e,3),n=ot(e,4),o=ot(e,5),u=ot(e,6),l=ot(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let d=r.dims[0],p=r.dims[1],h=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],g=p,f=0,w=0,$=Math.floor(h/t.numHeads);if(u&&l&&P.size(u.dims)&&P.size(l.dims)){if(u.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==t.numHeads||u.dims[3]!==$)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==d||l.dims[1]!==t.numHeads||l.dims[3]!==$)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(u.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');f=u.dims[2],w=u.dims[2]}else if(u&&P.size(u.dims)||l&&P.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let _;if(i&&P.size(i.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(i.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');_=2,g=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==$)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');_=5,g=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==$)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');_=0,g=i.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');_=3}if(s&&P.size(s.dims)>0){if(s.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(i&&i.dims.length===5&&i.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let y=f+g,x=0;if(n&&P.size(n.dims)>0){x=8;let B=n.dims;throw B.length===1?B[0]===d?x=1:B[0]===3*d+2&&(x=3):B.length===2&&B[0]===d&&B[1]===y&&(x=5),x===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let S=!1,I=h;if(a&&P.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(g!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');I=a.dims[2]}else{if(g!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');I=a.dims[1]*a.dims[3],S=!0}}let O=!1;if(n&&P.size(n.dims)>0)throw new Error("Key padding mask is not supported");if(o&&P.size(o.dims)>0){if(o.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(o.dims[0]!==d||o.dims[1]!==t.numHeads||o.dims[2]!==p||o.dims[3]!==y)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:p,pastSequenceLength:f,kvSequenceLength:g,totalSequenceLength:y,maxSequenceLength:w,inputHiddenSize:0,hiddenSize:h,vHiddenSize:I,headSize:$,vHeadSize:Math.floor(I/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:x,scale:t.scale,broadcastResPosBias:O,passPastInKv:S,qkvFormat:_}},Hl=e=>m({...e}),Fs=m({perm:[0,2,1,3]}),Kl=(e,t,r,i,a,s,n)=>{let o=[i,a,s],u=P.size(o),l=[{type:12,data:u},{type:12,data:n},{type:12,data:s}],d=p=>{let h=j("qkv_with_bias",t.dataType,o),g=C("qkv",t.dataType,o),f=C("bias",r.dataType,o),w=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${p.registerUniforms(w).declareVariables(g,f,h)}
  ${p.mainStart()}
    ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:o,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:l}),getShaderSource:d},{inputs:[t,r],outputs:[-1]})[0]},ca=(e,t,r,i,a,s,n,o)=>{let u=s;if(n&&P.size(n.dims)>0){if(i===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return u=Kl(e,s,n,t,i,r*a,o),u=u.reshape([t,i,r,a]),r===1||i===1?u:e.compute(Ze(u,Fs.perm),{inputs:[u],outputs:[-1]})[0]}else return s.dims.length===3&&(u=s.reshape([t,i,r,a])),r===1||i===1?u:e.compute(Ze(u,Fs.perm),{inputs:[u],outputs:[-1]})[0]},Zl=(e,t)=>{let r=jl(e.inputs,t),i=e.inputs[0],a=ot(e.inputs,1),s=ot(e.inputs,2),n=ot(e.inputs,3),o=ot(e.inputs,4),u=ot(e.inputs,5),l=ot(e.inputs,6),d=ot(e.inputs,7);if(i.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let p=a&&s&&a.dims.length===4&&s.dims.length===4,h=ca(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,i,n,0);if(p)return oa(e,h,a,s,o,void 0,l,d,u,r);if(!a||!s)throw new Error("key and value must be provided");let g=ca(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,n,r.hiddenSize),f=ca(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,s,n,2*r.hiddenSize);oa(e,h,g,f,o,void 0,l,d,u,r)}}),Xl,Yl,Jl,ed,Ws,td,rd,id=z(()=>{"use strict";de(),ne(),b(),J(),Xl=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Yl=(e,t)=>{let r=[],i=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),i=r.length),m({numOutputs:i,axis:t.axis,splitSizes:r})},Jl=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${D("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,ed=e=>{let t=e.length,r=[];for(let i=0;i<t;++i){let a=e[i].setByIndices("indices","input[global_idx]");t===1?r.push(a):i===0?r.push(`if (output_number == ${i}u) { ${a} }`):i===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${i}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},Ws=(e,t)=>{let r=e[0].dims,i=P.size(r),a=e[0].dataType,s=P.normalizeAxis(t.axis,r.length),n=new Array(t.numOutputs),o=C("input",a,r.length),u=new Array(t.numOutputs),l=[],d=[],p=0,h=[{type:12,data:i}];for(let f=0;f<t.numOutputs;f++){p+=t.splitSizes[f],u[f]=p;let w=r.slice();w[s]=t.splitSizes[f],d.push(w),n[f]=j(`output${f}`,a,w.length),l.push({dims:d[f],dataType:e[0].dataType})}h.push({type:12,data:u},...k(r,...d));let g=f=>`
  ${f.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",u.length).declareVariables(o,...n)}
  ${Jl(u.length)}
  ${ed(n)}

  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${o.offsetToIndices("global_idx")};
    var index = ${o.indicesGet("indices",s)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${D("uniforms.size_in_split_axis","output_number - 1u",u.length)};
      ${o.indicesSet("indices",s,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:g,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(i/64)},programUniforms:h})}},td=(e,t)=>{Xl(e.inputs);let r=e.inputs.length===1?t:Yl(e.inputs,t);e.compute(Ws(e.inputs,r),{inputs:[0]})},rd=e=>{let t=e.axis,r=e.splitSizes,i=e.numOutputs<0?r.length:e.numOutputs;if(i!==r.length)throw new Error("numOutputs and splitSizes length must be equal");return m({axis:t,numOutputs:i,splitSizes:r})}}),ad,Da,sd,nd=z(()=>{"use strict";de(),ne(),b(),J(),ad=(e,t)=>{let[r,i,a,s]=e,{numHeads:n,rotaryEmbeddingDim:o}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!P.areEqual(i.dims,[])&&!P.areEqual(i.dims,[1])&&i.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(s.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${s.dims.length}`);if(!P.areEqual(a.dims,s.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(o>0&&n===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let u=r.dims[0],l=r.dims[r.dims.length-2],d=a.dims[0],p=P.sizeFromDimension(r.dims,1)/l,h=o===0?a.dims[1]*2:p/n;if(o>h)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(i.dims.length===2){if(u!==i.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${i.dims[0]}`);if(l!==i.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${i.dims[1]}`)}if(l>d)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported");if(h/2!==a.dims[1]&&o/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`)},Da=(e,t)=>{let{interleaved:r,numHeads:i,rotaryEmbeddingDim:a,scale:s}=t,n=e[0].dims[0],o=P.sizeFromDimension(e[0].dims,1),u=e[0].dims[e[0].dims.length-2],l=o/u,d=e[2].dims[1],p=a===0?d*2:l/i,h=new Array(n,u,l/p,p-d),g=P.computeStrides(h),f=[{type:1,data:s},{type:12,data:h},{type:12,data:g},...e[0].dims.length===3?new Array({type:12,data:[o,l,p,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[o,p,u*p,1]}):[],...k(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],w=$=>{let _=C("input",e[0].dataType,e[0].dims.length),y=C("position_ids",e[1].dataType,e[1].dims.length),x=C("cos_cache",e[2].dataType,e[2].dims.length),S=C("sin_cache",e[3].dataType,e[3].dims.length),I=j("output",e[0].dataType,e[0].dims.length);return $.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:h.length},{name:"global_strides",type:"u32",length:g.length},{name:"input_output_strides",type:"u32",length:g.length}]),`
        ${$.declareVariables(_,y,x,S,I)}

        ${$.mainStart(T)}
          let half_rotary_emb_dim = uniforms.${x.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${y.broadcastedIndicesToOffset("bsnh.xy",j("",y.type.tensor,2))};
            let position_id =
                u32(${y.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${_.getByOffset("i")} * ${x.get("position_id","bsnh[3]")} -
                ${_.getByOffset("j")} * ${S.get("position_id","bsnh[3]")};
            ${I.setByOffset("i","re")}
            let im = ${_.getByOffset("i")} * ${S.get("position_id","bsnh[3]")} +
                ${_.getByOffset("j")} * ${x.get("position_id","bsnh[3]")};
            ${I.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${I.setByOffset("k",_.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:m({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:w,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(P.size(h)/T)},programUniforms:f})}},sd=(e,t)=>{ad(e.inputs,t),e.compute(Da(e.inputs,t))}}),od,ud,Gs,ld,dd,uh=z(()=>{"use strict";b(),de(),bs(),Ql(),id(),zt(),nd(),J(),od=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=e[0],i=e[1],a=e[2],s=e[3],n=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let o=!1,u=r.dims[0],l=r.dims[1],d=r.dims.length===3?o?r.dims[2]/3:r.dims[2]:t.numHeads*r.dims[4],p=l,h=0,g=!i||i.dims.length===0,f=Math.floor(g?d/(t.numHeads+2*t.kvNumHeads):d/t.numHeads);g&&(d=f*t.numHeads);let w=s&&s.dims.length!==0,$=n&&n.dims.length!==0;if(w&&s.dims.length===4&&s.dims[0]===u&&s.dims[1]!==t.kvNumHeads&&s.dims[2]===t.kvNumHeads&&s.dims[3]===f)throw new Error("BSNH pastKey/pastValue is not supported");if(w&&$){if(s.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(n.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');h=s.dims[2]}else if(w||$)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let _=1;if(i&&i.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(i.dims.length<3||i.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==i.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(i.dims.length===3){if(r.dims[2]%i.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');p=i.dims[1]}else if(i.dims.length===5){if(i.dims[2]!==t.numHeads||i.dims[3]!==2||i.dims[4]!==f)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');p=i.dims[1]}else{if(i.dims[1]!==t.numHeads||i.dims[3]!==f)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');p=i.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');_=3}let y=0,x=!1,S=t.kvNumHeads?f*t.kvNumHeads:d;if(a&&a.dims.length>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(p!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');S=a.dims[2]}else{if(p!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');S=a.dims[1]*a.dims[3],x=!0}}let I=e.length>4?e[5]:void 0;if(I){if(I.dims.length===0)throw new Error("seqlens_k must be at least 1D, got scalar.");let O=I.dims.reduce((B,U)=>B*U,1);if(O!==u)throw new Error(`seqlens_k must have batch_size (${u}) elements, got ${O}.`);for(let B=0;B<I.dims.length;B++)if(I.dims[B]!==1&&I.dims[B]!==u)throw new Error(`seqlens_k has unexpected shape. Each dimension must be 1 or batch_size (${u}), got dims[${B}] = ${I.dims[B]}.`)}return{batchSize:u,sequenceLength:l,pastSequenceLength:h,kvSequenceLength:p,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:d,vHiddenSize:S,headSize:f,vHeadSize:Math.floor(S/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:y,scale:t.scale,broadcastResPosBias:!1,passPastInKv:x,qkvFormat:_}},ud=m({perm:[0,2,1,3]}),Gs=(e,t,r)=>{let i=t,a=r.kvNumHeads;return t.dims.length===3&&r.kvSequenceLength!==0&&(i=t.reshape([r.batchSize,r.kvSequenceLength,a,r.headSize]),i=e.compute(Ze(i,ud.perm),{inputs:[i],outputs:[-1]})[0]),i},ld=(e,t,r,i)=>{let a=7,s=["type","type"],n=[e*t],o=e*t,u=[{type:12,data:o},{type:12,data:t},{type:12,data:e}],l=d=>{let p=C("seq_lens",r.dataType,r.dims),h=C("total_seq_lens",i.dataType,i.dims),g=j("pos_ids",a,n),f=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${d.registerUniforms(f).declareVariables(p,h,g)}
  ${d.mainStart()}
    ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${h.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${p.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${g.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${g.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${g.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:s},getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:u}),getShaderSource:l}},dd=(e,t)=>{var S;let r=od(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((S=e.inputs[1])==null?void 0:S.dims.length)===5)throw new Error("Packed KV is not implemented");let i=e.inputs[0],a=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,s=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,n=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,o=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,u=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,d=r.kvNumHeads?r.kvNumHeads:r.numHeads,p=m({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,d*r.headSize,d*r.headSize]}),[h,g,f]=!a&&!s?e.compute(Ws([i],p),{inputs:[i],outputs:[-1,-1,-1]}):[i,a,s],w,$;if(t.doRotary){let I=e.compute(ld(r.batchSize,r.sequenceLength,u,l),{inputs:[u,l],outputs:[-1]})[0],O=e.inputs[7],B=e.inputs[8],U=m({interleaved:t.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),F=[h,I,O,B],Z=[-1];w=e.compute(Da(F,U),{inputs:F,outputs:Z})[0],F.splice(0,1,g);let le=m({interleaved:t.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});$=e.compute(Da(F,le),{inputs:F,outputs:Z})[0]}let _=ca(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,t.doRotary?w:h,void 0,0),y=Gs(e,t.doRotary?$:g,r),x=Gs(e,f,r);oa(e,_,y,x,void 0,void 0,n,o,void 0,r,u,l)}}),js,pd,cd,hd,lh=z(()=>{"use strict";de(),ne(),zt(),J(),js=(e,t,r,i,a,s,n,o)=>{let u=R(s),l=u===1?"f32":`vec${u}f`,d=u===1?"vec2f":`mat2x${u}f`,p=a*n,h=64;p===1&&(h=256);let g=[a,n,s/u],f=[a,n,2],w=["rank","type","type"],$=[];$.push(...k(g,f));let _=y=>{let x=C("x",t.dataType,3,u),S=C("scale",r.dataType,r.dims),I=C("bias",i.dataType,i.dims),O=j("output",1,3,2),B=[x,S,I,O];return`
  var<workgroup> workgroup_shared : array<${d}, ${h}>;
  const workgroup_size = ${h}u;
  ${y.declareVariables(...B)}
  ${y.mainStart(h)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${x.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${d}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${q("workgroup_shared[0][0]",u)} / f32(hight * ${u});
      let squared_sum_final = ${q("workgroup_shared[0][1]",u)} / f32(hight * ${u});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${o}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${u};${o};${h}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:f,dataType:1}],dispatchGroup:{x:p},programUniforms:$}),getShaderSource:_},{inputs:[t,r,i],outputs:[-1]})[0]},pd=(e,t,r)=>{let i=t[0].dims,a=i,s=2,n=i[0],o=i[1],u=P.sizeFromDimension(i,s),l=R(u),d=P.size(a)/l,p=js(e,t[0],t[1],t[2],n,u,o,r.epsilon),h=[n,o,u/l],g=[n,o],f=["type","none"],w=$=>{let _=C("x",t[0].dataType,h.length,l),y=C("scale_shift",1,g.length,2),x=j("output",t[0].dataType,h.length,l),S=[_,y,x];return`
  ${$.registerUniform("output_size","u32").declareVariables(...S)}
  ${$.mainStart()}
  ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${x.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${y.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${_.getByOffset("global_idx")} * ${x.type.value}(scale_shift.x) + ${x.type.value}(scale_shift.y);
      ${x.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:f},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:[{type:12,data:d},...k(h,g,h)]}),getShaderSource:w},{inputs:[t[0],p]})},cd=(e,t,r)=>{let i=t[0].dims,a=i,s=i[0],n=i[i.length-1],o=P.sizeFromDimension(i,1)/n,u=R(n),l=P.size(a)/u,d=[{type:12,data:o},{type:12,data:Math.floor(n/u)}],p=["type","type"],h=!1,g=[0,i.length-1];for(let _=0;_<i.length-2;_++)h=h||i[_+1]!==1,g.push(_+1);h=h&&i[i.length-1]!==1;let f=h?e.compute(Ze(e.inputs[0],g),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:i.length},(_,y)=>i[g[y]])),w=js(e,f,t[1],t[2],s,o,n,r.epsilon),$=_=>{let y=A(t[0].dataType),x=u===1?"vec2f":`mat${u}x2f`,S=B=>{let U=B===0?"x":"y",F=u===1?"f32":`vec${u}f`;switch(u){case 1:return`${y}(${F}(scale.${U}))`;case 2:return`vec2<${y}>(${F}(scale[0].${U}, scale[1].${U}))`;case 4:return`vec4<${y}>(${F}(scale[0].${U}, scale[1].${U}, scale[2].${U}, scale[3].${U}))`;default:throw new Error(`Not supported compoents ${u}`)}},I=C("input",t[0].dataType,t[0].dims,u),O=j("output",t[0].dataType,a,u);return`
  @group(0) @binding(0) var<storage, read> input : array<${I.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${x}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${O.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${_.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${S(0)}, ${S(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${u}`,inputDependencies:p},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:d}),getShaderSource:$},{inputs:[t[0],w]})},hd=(e,t)=>{t.format==="NHWC"?cd(e,e.inputs,t):pd(e,e.inputs,t)}}),fd,md,gd,dh=z(()=>{"use strict";de(),ne(),J(),fd=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},md=(e,t,r)=>{let i=t.simplified,a=e[0].dims,s=e[1],n=!i&&e[2],o=a,u=P.normalizeAxis(t.axis,a.length),l=P.sizeToDimension(a,u),d=P.sizeFromDimension(a,u),p=P.size(s.dims),h=n?P.size(n.dims):0;if(p!==d||n&&h!==d)throw new Error(`Size of X.shape()[axis:] == ${d}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${p} and bias size of ${h}`);let g=[];for(let I=0;I<a.length;++I)I<u?g.push(a[I]):g.push(1);let f=R(d),w=["type","type"],$=[{type:12,data:l},{type:1,data:d},{type:12,data:Math.floor(d/f)},{type:1,data:t.epsilon}];n&&w.push("type");let _=r>1,y=r>2,x=I=>{let O=A(e[0].dataType),B=[C("x",e[0].dataType,e[0].dims,f),C("scale",s.dataType,s.dims,f)];n&&B.push(C("bias",n.dataType,n.dims,f)),B.push(j("output",e[0].dataType,o,f)),_&&B.push(j("mean_data_output",1,g)),y&&B.push(j("inv_std_output",1,g));let U=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${I.registerUniforms(U).declareVariables(...B)}
  ${I.mainStart()}
    ${I.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${V("f32",f)};
    var mean_square_vector = ${V("f32",f)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${W(O,f,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${q("mean_vector",f)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${q("mean_square_vector",f)} / uniforms.norm_size ${i?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${W(O,f,"x[j + offset]")};
      let f32scale = ${W(O,f,"scale[j]")};
      output[j + offset] = ${B[0].type.value}((f32input ${i?"":"- mean"}) * inv_std_dev * f32scale
        ${n?`+ ${W(O,f,"bias[j]")}`:""}
      );
    }

    ${_?"mean_data_output[global_idx] = mean":""};
    ${y?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},S=[{dims:o,dataType:e[0].dataType}];return _&&S.push({dims:g,dataType:1}),y&&S.push({dims:g,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${f};${r};${i}`,inputDependencies:w},getRunData:()=>({outputs:S,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:$}),getShaderSource:x}},gd=(e,t)=>{fd(e.inputs),e.compute(md(e.inputs,t,e.outputCount))}}),yd,wd,ph=z(()=>{"use strict";ne(),Is(),Os(),yd=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},wd=e=>{yd(e.inputs);let t=Vt.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],i=e.inputs[0].dims[e.inputs[0].dims.length-1];if(r<8&&i<8)e.compute(ks(e.inputs,{activation:""},t));else{let a=t[t.length-2],s=P.size(e.inputs[0].dims.slice(0,-2)),n=P.size(e.inputs[1].dims.slice(0,-2));if(s!==1&&a===1&&n===1){let o=e.inputs[0].reshape([1,s,i]),u=e.inputs[1].reshape([1,i,r]),l=[1,s,r],d=[o,u];e.compute(Oa(d,{activation:""},t,l),{inputs:d})}else e.compute(Oa(e.inputs,{activation:""},t))}}}),_d,bd,$d,vd,xd,ch=z(()=>{"use strict";de(),ne(),b(),J(),_d=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],i=r.dims.length;if(r.dims[i-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),s=t.blockSize/8*t.bits,n=e[1];if(!P.areEqual(n.dims,[t.n,a,s]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let o=e[2].dims;if(P.size(o)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let u=e[3].dims,l=t.n*(t.bits===8?a:Math.floor((a*t.bits+7)/8));if(P.size(u)!==l)throw new Error("zeroPoints input size error.")}},bd=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],s=t.k,n=t.n,o=r.slice(0,i-2),u=P.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=R(t.k),h=R(l),g=R(n),f=o.concat([a,n]),w=a>1&&n/g%2===0?2:1,$=P.size(f)/g/w,_=64,y=[],x=[u,a,s/p],S=P.convertShape(e[1].dims).slice();S.splice(-1,1,l/h),y.push(...k(x)),y.push(...k(S)),y.push(...k(e[2].dims)),e.length===4&&y.push(...k(P.convertShape(e[3].dims)));let I=[u,a,n/g];y.push(...k(I));let O=B=>{let U=x.length,F=C("a",e[0].dataType,U,p),Z=C("b",12,S.length,h),le=C("scales",e[2].dataType,e[2].dims.length),ie=[F,Z,le],ae=e.length===4?C("zero_points",12,e[3].dims.length):void 0;ae&&ie.push(ae);let ve=I.length,Se=j("output",e[0].dataType,ve,g),oe=A(e[0].dataType),ce=(()=>{switch(p){case 1:return`array<${oe}, 8>`;case 2:return`mat4x2<${oe}>`;case 4:return`mat2x4<${oe}>`;default:throw new Error(`${p}-component is not supported.`)}})(),Le=Math.floor(32/t.bits),Q=Math.floor(Le/8),Ee=()=>{let re="";for(let X=0;X<Q;X++){let ze=X*t.bits*4,Jt=ze+t.bits;re+=`
          // reuse a data (pass ${X})
            var input_offset${X>0?X:""} = ${X===0?F.indicesToOffset(`${F.type.indices}(batch, row, word_offset)`):"input_offset"};
            var a_data${X>0?X:""}: ${ce};
            for (var j${X>0?X:""}: u32 = 0; j${X>0?X:""} < ${8/p}; j${X>0?X:""}++) {
              a_data${X>0?X:""}[j${X>0?X:""}] = ${F.getByOffset(`input_offset${X>0?X:""}`)};
              input_offset${X>0?X:""}++;
            }
          `;for(let Ye=0;Ye<g*w;Ye++)re+=`
            b_value = ${h===1?`b${Ye}_data`:`b${Ye}_data[i]`};
            ${t.bits===2?`{
              let half_word = b_value >> ${X*16}u;
              let byte_lo = half_word & 0xFFu;
              let byte_hi = (half_word >> 8u) & 0xFFu;
              let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
              b_value_lower = unpack4xU8(spread_word & b_mask);
              b_value_upper = unpack4xU8((spread_word >> 2u) & b_mask);
            }`:`b_value_lower = unpack4xU8((b_value >> ${ze}u) & b_mask);
            b_value_upper = unpack4xU8((b_value >> ${Jt}u) & b_mask);`}
            b_quantized_values = ${ce}(${Array.from({length:4},(Pt,Ut)=>`${oe}(b_value_lower[${Ut}]), ${oe}(b_value_upper[${Ut}])`).join(", ")});
            b_dequantized_values = ${p===1?`${ce}(${Array.from({length:8},(Pt,Ut)=>`(b_quantized_values[${Ut}] - ${ae?`zero_point${Ye}`:"zero_point"}) * scale${Ye}`).join(", ")});`:`(b_quantized_values - ${ce}(${Array(8).fill(`${ae?`zero_point${Ye}`:"zero_point"}`).join(",")})) * scale${Ye};`};
            workgroup_shared[local_id.x * ${w} + ${Math.floor(Ye/g)}]${g>1?`[${Ye%g}]`:""} += ${Array.from({length:8/p},(Pt,Ut)=>`${p===1?`a_data${X>0?X:""}[${Ut}] * b_dequantized_values[${Ut}]`:`dot(a_data${X>0?X:""}[${Ut}], b_dequantized_values[${Ut}])`}`).join(" + ")};
          `}return re},K=()=>{let re=`
            var col_index = col * ${g};
            ${ae?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (nBlocksPerCol + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is ${Math.pow(2,t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${oe}(${Math.pow(2,t.bits-1).toFixed(1)});`}
            `;for(let X=0;X<g*w;X++)re+=`
            let scale${X} = ${le.getByOffset("col_index * nBlocksPerCol + block")};
            ${ae?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            zero_point_word = ${ae.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${X} = ${oe}((zero_point_word) & ${t.bits===2?"0x3u":"0xFu"});`:""}
            col_index += 1;`;return re},Y=()=>{let re=`col_index = col * ${g};`;for(let X=0;X<g*w;X++)re+=`
            let b${X}_data = ${Z.getByIndices(`${Z.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return re+=`
            var b_value: u32;
            let b_mask: u32 = ${t.bits===2?"0x03030303u":"0x0F0F0F0Fu"};
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${ce};
            var b_dequantized_values: ${ce};`,re};return`
        var<workgroup> workgroup_shared: array<${Se.type.value}, ${w*_}>;
        ${B.declareVariables(...ie,Se)}
        ${B.mainStart([_,1,1])}
          let output_indices = ${Se.offsetToIndices(`(global_idx / ${_}) * ${w}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${_}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/p};
            ${K()}
            for (var word: u32 = 0; word < ${l}; word += ${h}) {
              ${Y()}
              for (var i: u32 = 0; i < ${h}; i++) {
                ${Ee()}
                word_offset += ${Le/p};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${w}) {
            var output_value: ${Se.type.value} = ${Se.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${_}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${w};
            }
            ${Se.setByIndices(`${Se.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${p};${h};${g};${w};${_}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:f,dataType:d}],dispatchGroup:{x:$},programUniforms:y}),getShaderSource:O}},$d=(e,t)=>{let r=e[0].dims,i=r.length,a=r[i-2],s=t.k,n=t.n,o=r.slice(0,i-2),u=P.size(o),l=e[1].dims[2]/4,d=e[0].dataType,p=R(t.k),h=R(l),g=o.concat([a,n]),f=128,w=n%8===0?8:n%4===0?4:1,$=f/w,_=Math.floor(32/t.bits),y=$*h*_,x=y/p,S=y/t.blockSize,I=P.size(g)/w,O=[],B=[u,a,s/p],U=P.convertShape(e[1].dims).slice();U.splice(-1,1,l/h),O.push(...k(B)),O.push(...k(U)),O.push(...k(e[2].dims)),e.length===4&&O.push(...k(P.convertShape(e[3].dims)));let F=[u,a,n];O.push(...k(F));let Z=le=>{let ie=B.length,ae=C("a",e[0].dataType,ie,p),ve=C("b",12,U.length,h),Se=C("scales",e[2].dataType,e[2].dims.length),oe=[ae,ve,Se],ce=e.length===4?C("zero_points",12,e[3].dims.length):void 0;ce&&oe.push(ce);let Le=F.length,Q=j("output",e[0].dataType,Le),Ee=A(e[0].dataType),K=()=>{switch(p){case 1:return`
          let a_data0 = vec4<${Ee}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${Ee}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${Ee}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${Ee}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${p}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${ae.type.value}, ${x}>;
        var<workgroup> inter_results: array<array<${Q.type.value}, ${$}>, ${w}>;
        ${le.declareVariables(...oe,Q)}
        ${le.mainStart([$,w,1])}
          let output_indices = ${Q.offsetToIndices(`workgroup_index * ${w}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${S} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${x};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${x}; a_offset += ${f})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${ae.getByIndices(`${ae.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${ae.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${S} + local_id.x;
            ${ce?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (n_blocks_per_col + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            let zero_point_word = ${ce.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${Ee}((zero_point_word) & ${t.bits===2?"0x3u":"0xFu"});`:`
            // The default zero point is ${Math.pow(2,t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${Ee}(${Math.pow(2,t.bits-1).toFixed(1)});`}
            let scale = ${Se.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${ve.getByIndices(`${ve.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/p};
            for (var i: u32 = 0; i < ${h}; i++) {
              let b_value = ${h===1?"b_data":"b_data[i]"};
              ${(()=>{let Y=Math.floor(_/8),re="";for(let X=0;X<Y;X++){let ze=X*t.bits*4,Jt=ze+t.bits;re+=`
              ${K()}
              {${t.bits===2?`
                let half_word = b_value >> ${X*16}u;
                let byte_lo = half_word & 0xFFu;
                let byte_hi = (half_word >> 8u) & 0xFFu;
                let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
                let b_value_lower = unpack4xU8(spread_word & 0x03030303u);
                let b_value_upper = unpack4xU8((spread_word >> 2u) & 0x03030303u);`:`
                let b_value_lower = unpack4xU8((b_value >> ${ze}u) & 0x0F0F0F0Fu);
                let b_value_upper = unpack4xU8((b_value >> ${Jt}u) & 0x0F0F0F0Fu);`}
                let b_quantized_values = mat2x4<${Ee}>(${Array.from({length:4},(Ye,Pt)=>`${Ee}(b_value_lower[${Pt}]), ${Ee}(b_value_upper[${Pt}])`).join(", ")});
                let b_dequantized_values = (b_quantized_values - mat2x4<${Ee}>(${Array(8).fill("zero_point").join(",")})) * scale;
                inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(Ye,Pt)=>`${`dot(a_data${Pt}, b_dequantized_values[${Pt}])`}`).join(" + ")};
              }
              word_offset += ${8/p};`}return re})()}
            }
            workgroupBarrier();
          }

          if (local_idx < ${w}) {
            var output_value: ${Q.type.value} = ${Q.type.value}(0);
            for (var b = 0u; b < ${$}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${Q.setByIndices(`${Q.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${p};${h};${$};${w}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:g,dataType:d}],dispatchGroup:{x:I},programUniforms:O}),getShaderSource:Z}},vd=(e,t)=>{_d(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute($d(e.inputs,t)):e.compute(bd(e.inputs,t))},xd=e=>m(e)}),Sd,Td,Ed,kd,Id,zd,Cd,Ad,Od,hh=z(()=>{"use strict";de(),ne(),J(),Sd=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},Td=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
            k = i32(${e.indicesGet("indices",a)}) - ${D("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${D("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${D("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${i}
            value = x[offset];
          }
      `},Ed=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${D("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${D("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${D("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${D("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},kd=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${D("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${D("uniforms.x_shape",a,t)})) {
                  k = i32(${D("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${D("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},Id=(e,t,r)=>{let i="";for(let a=t-1;a>=0;--a)i+=`
                k = i32(${e.indicesGet("indices",a)}) - ${D("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${D("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${D("uniforms.x_shape",a,t)})) {
                  k -= i32(${D("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${D("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${i}
              value = x[offset];
          `},zd=(e,t,r)=>{switch(r.mode){case 0:return Td(e,t,r.pads.length);case 1:return Ed(e,t,r.pads.length);case 2:return kd(e,t,r.pads.length);case 3:return Id(e,t,r.pads.length);default:throw new Error("Invalid mode")}},Cd=(e,t)=>{let r=P.padShape(e[0].dims.slice(),t.pads),i=e[0].dims,a=P.size(r),s=[{type:12,data:a},{type:6,data:t.pads}],n=e.length>=3&&e[2].data;t.mode===0&&s.push({type:n?e[2].dataType:1,data:t.value}),s.push(...k(e[0].dims,r));let o=["rank"],u=l=>{let d=j("output",e[0].dataType,r.length),p=C("x",e[0].dataType,i.length),h=p.type.value,g=zd(d,i.length,t),f=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&f.push({name:"constant_value",type:n?h:"f32"}),`
            ${l.registerUniforms(f).declareVariables(p,d)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${d.offsetToIndices("global_idx")};

            var value = ${h}(0);
            ${g}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${n}`,inputDependencies:o},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(P.size(r)/64)},programUniforms:s}),getShaderSource:u}},Ad=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),i=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,s=new Int32Array(2*a).fill(0);if(e.length>=4){let o=e[3].getBigInt64Array();for(let u=0;u<o.length;u++)s[Number(o[u])]=Number(r[u]),s[Number(o[u])+a]=Number(r[u+o.length])}else r.forEach((o,u)=>s[Number(u)]=Number(o));let n=[];return s.forEach(o=>n.push(o)),{mode:t.mode,value:i,pads:n}}else return t},Od=(e,t)=>{Sd(e.inputs);let r=Ad(e.inputs,t);e.compute(Cd(e.inputs,r),{inputs:[0]})}}),ha,Hs,Ks,Zs,Qs,Rd,Bd,Xs,Ys,Md,Dd,Js,Pd,Ud,en,Nd,Ld,qd,Vd,fh=z(()=>{"use strict";We(),de(),ne(),J(),ha=e=>{if(he.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Hs=(e,t,r)=>{let i=t.format==="NHWC",a=e.dims.slice();i&&a.splice(1,0,a.pop());let s=Object.hasOwnProperty.call(t,"dilations"),n=t.kernelShape.slice(),o=t.strides.slice(),u=s?t.dilations.slice():[],l=t.pads.slice();tr.adjustPoolAttributes(r,a,n,o,u,l);let d=tr.computePoolOutputShape(r,a,o,u,n,l,t.autoPad),p=Object.assign({},t);s?Object.assign(p,{kernelShape:n,strides:o,pads:l,dilations:u,cacheKey:t.cacheKey}):Object.assign(p,{kernelShape:n,strides:o,pads:l,cacheKey:t.cacheKey});let h=d.slice();return h.push(h.splice(1,1)[0]),[p,i?h:d]},Ks=(e,t)=>{let r=t.format==="NHWC",i=P.size(e),a=P.size(t.kernelShape),s=[{type:12,data:i},{type:12,data:a}],n=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let o=t.kernelShape[t.kernelShape.length-1],u=t.strides[t.strides.length-1],l=t.pads[t.pads.length/2-1],d=t.pads[t.pads.length-1],p=!!(l+d);s.push({type:12,data:o},{type:12,data:u},{type:12,data:l},{type:12,data:d}),n.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let h=!1;if(t.kernelShape.length===2){let g=t.kernelShape[t.kernelShape.length-2],f=t.strides[t.strides.length-2],w=t.pads[t.pads.length/2-2],$=t.pads[t.pads.length-2];h=!!(w+$),s.push({type:12,data:g},{type:12,data:f},{type:12,data:w},{type:12,data:$}),n.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[s,n,!0,p,h]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let o=P.computeStrides(t.kernelShape);s.push({type:12,data:o},{type:12,data:t.pads},{type:12,data:t.strides}),n.push({name:"kernelStrides",type:"u32",length:o.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let u=t.pads.reduce((l,d)=>l+d);return[s,n,!!u,!1,!1]}},Zs=(e,t,r,i,a,s,n,o,u,l,d,p)=>{let h=a.format==="NHWC",g=t.type.value,f=j("output",t.type.tensor,i);if(a.kernelShape.length<=2){let w="",$="",_="",y=r-(h?2:1);if(d?w=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${y}] = indices[${y}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${y}] < 0 || xIndices[${y}]
                      >= uniforms.x_shape[${y}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${s}
                }`:w=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${y}] = indices[${y}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${s}
                }`,a.kernelShape.length===2){let x=r-(h?3:2);p?$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${x}] = indices[${x}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${x}] < 0 || xIndices[${x}] >= uniforms.x_shape[${x}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:$=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${x}] = indices[${x}] * uniforms.sh - uniforms.phStart + j;
                `,_=`
              }
            `}return`
            ${e.registerUniforms(u).declareVariables(t,f)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${f.offsetToIndices("global_idx")};
              var xIndices = ${f.offsetToIndices("global_idx")};

              var value = ${g}(${o});
              var pad = 0;
              ${$}
              ${w}
              ${_}
              ${n}

              output[global_idx] = value;
            }`}else{if(h)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let w=a.kernelShape.length,$=a.pads.length,_="";return l?_=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${s}
              }`:_=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${s}
            `,`
            ${e.registerUniforms(u).declareVariables(t,f)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${f.offsetToIndices("global_idx")};
              var xIndices = ${f.offsetToIndices("global_idx")};

              var offsets: array<u32, ${w}>;

              var value = ${g}(${o});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${w-1}u; j++) {
                  offsets[j] = offset / ${D("uniforms.kernelStrides","j",w)};
                  offset -= offsets[j] * ${D("uniforms.kernelStrides","j",w)};
                }
                offsets[${w-1}] = offset;

                isPad = false;
                for (var j = ${r-w}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${D("uniforms.strides",`j - ${r-w}u`,w)}
                    + offsets[j - ${r-w}u] - ${D("uniforms.pads","j - 2u",$)};
                  ${_}
              }
              ${n}

              output[global_idx] = value;
            }`}},Qs=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,Rd=e=>`${Qs(e)};${e.countIncludePad}`,Bd=e=>`${Qs(e)};${e.storageOrder};${e.dilations}`,Xs=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),Ys=(e,t,r,i)=>{let[a,s]=Hs(t,i,r),n=C("x",t.dataType,t.dims.length),o=n.type.value,u="value += x_val;",l="";a.countIncludePad?l+=`value /= ${o}(uniforms.kernelSize);`:l+=`value /= ${o}(i32(uniforms.kernelSize) - pad);`;let[d,p,h,g,f]=Ks(s,a);d.push(...k(t.dims,s));let w=["rank"];return{name:e,shaderCache:{hint:`${i.cacheKey};${h};${g};${f}`,inputDependencies:w},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(P.size(s)/64)},programUniforms:d}),getShaderSource:$=>Zs($,n,t.dims.length,s.length,a,u,l,0,p,h,g,f)}},Md=e=>{let t=e.count_include_pad!==0,r=Xs(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let i={countIncludePad:t,...r,cacheKey:""};return{...i,cacheKey:Rd(i)}},Dd=(e,t)=>{ha(e.inputs),e.compute(Ys("AveragePool",e.inputs[0],!1,t))},Js={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},Pd=e=>{let t=e.format;return{format:t,...Js,cacheKey:t}},Ud=(e,t)=>{ha(e.inputs),e.compute(Ys("GlobalAveragePool",e.inputs[0],!0,t))},en=(e,t,r,i)=>{let[a,s]=Hs(t,i,r),n=`
      value = max(x_val, value);
    `,o="",u=C("x",t.dataType,t.dims.length),l=["rank"],[d,p,h,g,f]=Ks(s,a);return d.push(...k(t.dims,s)),{name:e,shaderCache:{hint:`${i.cacheKey};${h};${g};${f}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(P.size(s)/64)},programUniforms:d}),getShaderSource:w=>Zs(w,u,t.dims.length,s.length,a,n,o,t.dataType===10?-65504:-1e5,p,h,g,f)}},Nd=(e,t)=>{ha(e.inputs),e.compute(en("MaxPool",e.inputs[0],!1,t))},Ld=e=>{let t=e.storage_order,r=e.dilations,i=Xs(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(i.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...i,cacheKey:""};return{...a,cacheKey:Bd(a)}},qd=e=>{let t=e.format;return{format:t,...Js,cacheKey:t}},Vd=(e,t)=>{ha(e.inputs),e.compute(en("GlobalMaxPool",e.inputs[0],!0,t))}}),Fd,Wd,Gd,jd,mh=z(()=>{"use strict";de(),ne(),b(),J(),Fd=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,i)=>r===e[2].dims[i]).reduce((r,i)=>r&&i,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,s)=>s===t.axis||a===e[0].dims[s]).reduce((a,s)=>a&&s,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],i=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/i)||t.blockSize>Math.ceil(r/(i-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},Wd=(e,t)=>{let r=P.normalizeAxis(t.axis,e[0].dims.length),i=e[0].dataType,a=i===3,s=e[0].dims,n=e[1].dataType,o=P.size(s),u=i===3||i===2,l=u?[Math.ceil(P.size(e[0].dims)/4)]:e[0].dims,d=e[1].dims,p=e.length>2?e[2]:void 0,h=p?u?[Math.ceil(P.size(p.dims)/4)]:p.dims:void 0,g=d.length===0||d.length===1&&d[0]===1,f=g===!1&&d.length===1,w=R(o),$=g&&(!u||w===4),_=$?w:1,y=$&&!u?w:1,x=C("input",u?12:i,l.length,y),S=C("scale",n,d.length),I=p?C("zero_point",u?12:i,h.length):void 0,O=j("output",n,s.length,_),B=[x,S];I&&B.push(I);let U=[l,d];p&&U.push(h);let F=[{type:12,data:o/_},{type:12,data:r},{type:12,data:t.blockSize},...k(...U,s)],Z=le=>{let ie=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${le.registerUniforms(ie).declareVariables(...B,O)}
      ${le.mainStart()}
          ${le.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${O.offsetToIndices("global_idx")};

          // Set input x
          ${u?`
            let input = ${x.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${_===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${x.getByOffset("global_idx")};`};

          // Set scale input
          ${g?`let scale_value= ${S.getByOffset("0")}`:f?`
            let scale_index = ${O.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${S.getByOffset("scale_index")};`:`
            var scale_indices: ${S.type.indices} = output_indices;
            let index = ${S.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${S.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${S.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${I?g?u?`
                let zero_point_input = ${I.getByOffset("0")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${I.getByOffset("0")}`:f?u?`
                let zero_point_index = ${O.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${I.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${O.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${I.getByOffset("zero_point_index")};`:u?`
                let zero_point_offset = ${S.indicesToOffset("scale_indices")};
                let zero_point_input = ${I.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${I.getByIndices("scale_indices")};`:`let zero_point_value = ${u?a?"i32":"u32":x.type.value}(0);`};
      // Compute and write output
      ${O.setByOffset("global_idx",`${O.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:I?["rank","rank","rank"]:["rank","rank"]},getShaderSource:Z,getRunData:()=>({outputs:[{dims:s,dataType:n}],dispatchGroup:{x:Math.ceil(o/_/64),y:1,z:1},programUniforms:F})}},Gd=(e,t)=>{Fd(e.inputs,t),e.compute(Wd(e.inputs,t))},jd=e=>m({axis:e.axis,blockSize:e.blockSize})}),Hd,Kd,Zd,gh=z(()=>{"use strict";We(),de(),J(),Hd=(e,t,r)=>{let i=e===t,a=e<t&&r<0,s=e>t&&r>0;if(i||a||s)throw new Error("Range these inputs' contents are invalid.")},Kd=(e,t,r,i)=>{let a=Math.abs(Math.ceil((t-e)/r)),s=[a],n=a,o=[{type:12,data:n},{type:i,data:e},{type:i,data:r},...k(s)],u=l=>{let d=j("output",i,s.length),p=d.type.value,h=[{name:"outputSize",type:"u32"},{name:"start",type:p},{name:"delta",type:p}];return`
        ${l.registerUniforms(h).declareVariables(d)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${p}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${i}`},getShaderSource:u,getRunData:()=>({outputs:[{dims:s,dataType:i}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:o})}},Zd=e=>{let t=0,r=0,i=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],i=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],i=e.inputs[2].getFloat32Array()[0]),he.webgpu.validateInputContent&&Hd(t,r,i),e.compute(Kd(t,r,i,e.inputs[0].dataType),{inputs:[]})}}),Qd,Xd,Yd,Jd,yh=z(()=>{"use strict";de(),ne(),b(),J(),Qd=(e,t,r,i)=>{if(e!=="none"&&i!=="i32"&&i!=="u32"&&i!=="f32")throw new Error(`Input ${i} is not supported with reduction ${e}.`);let a=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,s=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case"none":return`${t}=${r};`;case"add":return i==="i32"||i==="u32"?`atomicAdd(&${t}, bitcast<${i}>(${r}));`:`
              ${a}bitcast<${i}>(oldValue) + (${r})${s}`;case"max":return i==="i32"||i==="u32"?`atomicMax(&${t}, bitcast<${i}>(${r}));`:`
                ${a}max(bitcast<f32>(oldValue), (${r}))${s}`;case"min":return i==="i32"||i==="u32"?`atomicMin(&${t}, bitcast<${i}>(${r}));`:`${a}min(bitcast<${i}>(oldValue), (${r}))${s}`;case"mul":return`${a}(bitcast<${i}>(oldValue) * (${r}))${s}`;default:throw new Error(`Reduction ${e} is not supported.`)}},Xd=(e,t)=>{let r=e[0].dims,i=e[1].dims,a=r,s=1,n=Math.ceil(P.sizeToDimension(i,i.length-1)/s),o=i[i.length-1],u=P.sizeFromDimension(r,o),l=[{type:12,data:n},{type:12,data:o},{type:12,data:u},...k(e[1].dims,e[2].dims,a)],d=p=>{let h=C("indices",e[1].dataType,e[1].dims.length),g=C("updates",e[2].dataType,e[2].dims.length,s),f=t.reduction!=="none"&&t.reduction!==""?Oe("output",e[0].dataType,a.length):j("output",e[0].dataType,a.length,s);return`
      ${p.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(h,g,f)}
      ${p.mainStart()}
        ${p.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${e[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${Qd(t.reduction,"output[data_offset + i]","value",f.type.value)}
  }

      }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:l}),getShaderSource:d}},Yd=e=>m({reduction:e.reduction}),Jd=(e,t)=>{e.compute(Xd(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),ep,tp,rp,tn,ip,ap,sp,np,op,up,lp,dp,rn,pp,cp,hp,fp,mp,gp,yp,wh=z(()=>{"use strict";de(),ne(),b(),J(),ep=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},tp=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let i=new Array(r).fill(1);return t.forEach((a,s)=>i[a]=e[s]),i},rp=(e,t,r,i,a,s)=>{let[n,o,u]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(n>0&&e.length>n&&e[n].dims.length>0)e[n].getFloat32Array().forEach(d=>s.push(d));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(o>0&&e.length>o&&e[o].dims.length===1&&e[o].dims[0]>0){if(e[o].getFloat32Array().forEach(d=>i.push(d)),i.length!==0&&i.length!==l&&r>=18&&i.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");ep(i,t),t.axes.length>0&&tp(i,t.axes,l).forEach((d,p)=>i[p]=d)}if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0&&(e[u].getBigInt64Array().forEach(d=>a.push(Number(d))),a.length!==0&&a.length!==l&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(i.length!==0&&i.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof i<"u"&&typeof a<"u"&&i.length>0&&a.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},tn=(e,t,r,i)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${i}(big / (${r}));
  let fract = ${i}(big % (${r})) / ${i}(${r});
  return whole + fract;
`,ip=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${tn("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${tn("xResized","lengthOriginal - 1","lengthResized - 1",t)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",ap=(e,t,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",sp=(e,t,r)=>{let i=new Array(r).fill(0).concat(new Array(r).fill(1)),a=e.length===0?i:e.slice();return t.length>0?(t.forEach((s,n)=>{i[s]=a[n],i[n+r]=a[t.length+n]}),i):a},np=(e,t,r,i)=>{let a=[];if(r.length>0)if(i.length>0){if(e.forEach(s=>a.push(s)),Math.max(...i)>e.length)throw new Error("axes is out of bound");i.forEach((s,n)=>a[s]=r[n])}else r.forEach(s=>a.push(s));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");a=e.map((s,n)=>Math.round(s*t[n]))}return a},op=(e,t,r)=>{let i=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(s=>t[s]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(s=>t[s]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let a=e.slice();return r.axes.length>0?(r.axes.forEach(s=>t[s]=i),r.axes.forEach(s=>a[s]=Math.round(e[s]*t[s]))):(t.fill(i,0,t.length),a.forEach((s,n)=>a[n]=Math.round(s*t[n]))),a},up=(e,t,r,i,a)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${r.length}> {
      var original_indices: array<${e.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${D("uniforms.scales","i",i)};
        var roi_low = ${D("uniforms.roi","i",a)};
        var roi_hi = ${D("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${D("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${D("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,lp=(e,t,r,i,a,s,n)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${i.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${D("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${D("uniforms.roi","i",s)};
          var roi_hi = ${D("uniforms.roi",`i + ${r.length}`,s)};
          var input_shape_i = ${D("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${D("uniforms.output_shape","i",i.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${n} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,dp=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${D("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,rn=(e,t,r,i)=>e.rank>i?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",r,"batch")};
`:"",pp=(e,t,r,i,a)=>{let[s,n,o,u]=r.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",n,`max(0, min(row, ${r[n]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(col, ${r[o]} - 1))`)};
      ${rn(e,u,s,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${l} = originalIndices[${n}];
      var col:${l} = originalIndices[${o}];
      ${i?`if (row < 0 || row > (${r[n]} - 1) || col < 0 || col > (${r[o]} - 1)) {
        return ${a};
      }`:""};
      row = max(0, min(row, ${r[n]} - 1));
      col = max(0, min(col, ${r[o]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${r.length>2?`u32(originalIndices[${u}])`:"0"};
      var batch: u32 =  ${r.length>2?`u32(originalIndices[${s}])`:"0"};
      var x11: ${l} = getInputValue(batch, channel, row1, col1);
      var x12: ${l} = getInputValue(batch, channel, row1, col2);
      var x21: ${l} = getInputValue(batch, channel, row2, col1);
      var x22: ${l} = getInputValue(batch, channel, row2, col2);
      var dx1: ${l} = abs(row - ${l}(row1));
      var dx2: ${l} = abs(${l}(row2) - row);
      var dy1: ${l} = abs(col - ${l}(col1));
      var dy2: ${l} = abs(${l}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},cp=(e,t,r,i,a,s,n,o,u,l)=>{let d=r.length===2,p=!0,[h,g]=d?[0,1]:p?[2,3]:[1,2],f=e.type.value,w=$=>{let _=$===h?"row":"col";return`
      fn ${_}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${f} {
        var output_index = ${t.indicesGet("output_indices",$)};
        var originalIdx: ${f} = getOriginalCoordinateFromResizedCoordinate(output_index, ${a[$]},
        ${i[$]}, ${r[$]}, ${s[$]}, ${s[$]} + ${r.length});
        var fractOriginalIdx: ${f} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${o} && (originalIdx < 0 || originalIdx > (${r[$]} - 1))) {
          return ${u};
        }
        var data: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${_}: ${f} = originalIdx + ${f}(i);
          if (${_} < 0 || ${_} >= ${r[$]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:o?`return ${u};`:`${_} = max(0, min(${_}, ${r[$]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",$,`u32(${_})`)};
          data[i + 1] = ${$===h?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${w(h)};
    ${w(g)};
  fn getCubicInterpolationCoefs(s: ${f}) -> array<${f}, 4> {
    var absS = abs(s);
    var coeffs: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${f} = 1.0 - absS;
    var twoMinusAbsS: ${f} = 2.0 - absS;
    var onePlusAbsS: ${f} = 1.0 + absS;
    coeffs[0] = ((${n} * onePlusAbsS - 5 * ${n}) * onePlusAbsS + 8 * ${n}) * onePlusAbsS - 4 * ${n};
    coeffs[1] = ((${n} + 2) * absS - (${n} + 3)) * absS * absS + 1;
    coeffs[2] = ((${n} + 2) * oneMinusAbsS - (${n} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${n} * twoMinusAbsS - 5 * ${n}) * twoMinusAbsS + 8 * ${n}) * twoMinusAbsS - 4 * ${n};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${f}, 4>, coefs: array<${f}, 4>) -> ${f} {
    var coefsSum: ${f} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${f} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},hp=(e,t,r,i,a)=>{let[s,n,o,u,l]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],d=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${d} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",n,`max(0, min(depth, ${r[n]} - 1))`)};
      ${e.indicesSet("input_indices",o,`max(0, min(height, ${r[o]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(width, ${r[u]} - 1))`)};
      ${rn(e,l,s,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${d} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${d} = originalIndices[${n}];
      var height:${d} = originalIndices[${o}];
      var width:${d} = originalIndices[${u}];
      ${i?`if (depth < 0 || depth > (${r[n]} - 1) || height < 0 || height > (${r[o]} - 1) || width < 0 || (width > ${r[u]} - 1)) {
      return ${a};
        }`:""};

    depth = max(0, min(depth, ${r[n]} - 1));
      height = max(0, min(height, ${r[o]} - 1));
      width = max(0, min(width, ${r[u]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${r.length>3?`u32(originalIndices[${l}])`:"0"};
      var batch: u32 =  ${r.length>3?`u32(originalIndices[${s}])`:"0"};

      var x111: ${d} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${d} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${d} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${d} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${d} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${d} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${d} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${d} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${d} = abs(depth - ${d}(depth1));
      var dx2: ${d} = abs(${d}(depth2) - depth);
      var dy1: ${d} = abs(height - ${d}(height1));
      var dy2: ${d} = abs(${d}(height2) - height);
      var dz1: ${d} = abs(width - ${d}(width1));
      var dz2: ${d} = abs(${d}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},fp=(e,t,r,i,a,s)=>{let n=e.dims,o=sp(s,t.axes,n.length),u=np(n,i,a,t.axes),l=i.slice();i.length===0&&(l=n.map((y,x)=>y===0?1:u[x]/y),t.keepAspectRatioPolicy!=="stretch"&&(u=op(n,l,t)));let d=j("output",e.dataType,u.length),p=C("input",e.dataType,n.length),h=P.size(u),g=n.length===u.length&&n.every((y,x)=>y===u[x]),f=t.coordinateTransformMode==="tf_crop_and_resize",w=t.extrapolationValue,$=p.type.value,_=y=>`
      ${g?"":`
      ${ip(t.coordinateTransformMode,$)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${dp(p,n)};
              ${ap(t.nearestMode,r,$)};
              ${lp(p,d,n,u,l.length,o.length,f)};
              `;case"linear":return`
              ${up(d,n,u,l.length,o.length)};
              ${(()=>{if(n.length===2||n.length===4)return`${pp(p,d,n,f,w)}`;if(n.length===3||n.length===5)return`${hp(p,d,n,f,w)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(n.length===2||n.length===4)return`${cp(p,d,n,u,l,o,t.cubicCoeffA,f,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${y.registerUniform("output_size","u32").registerUniform("scales","f32",l.length).registerUniform("roi","f32",o.length).declareVariables(p,d)}
      ${y.mainStart()}
        ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${g?"output[global_idx] = input[global_idx];":`
        let output_indices = ${d.offsetToIndices("global_idx")};
        var input_indices: ${p.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${p.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${n.length===2||n.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${l.length>0?t.mode==="cubic"?l:l.length:""}|${a.length>0?a:""}|${o.length>0?o:""}|${g}|${t.mode==="nearest"?n.length:n}`,inputDependencies:["rank"]},getShaderSource:_,getRunData:()=>({outputs:[{dims:u,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:[{type:12,data:h},{type:1,data:l},{type:1,data:o},...k(n,u)]})}},mp=e=>{let t=e.customDataBuffer;return new Uint32Array(t.buffer,t.byteOffset,1)[0]},gp=(e,t)=>{let r=[],i=[],a=[],s=mp(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");rp(e.inputs,t,s,r,i,a),e.compute(fp(e.inputs[0],t,s,r,i,a),{inputs:[0]})},yp=e=>{let t=e.antialias,r=e.axes,i=e.coordinateTransformMode,a=e.cubicCoeffA,s=e.excludeOutside!==0,n=e.extrapolationValue,o=e.keepAspectRatioPolicy,u=e.mode,l=e.nearestMode===""?"simple":e.nearestMode;return m({antialias:t,axes:r,coordinateTransformMode:i,cubicCoeffA:a,excludeOutside:s,extrapolationValue:n,keepAspectRatioPolicy:o,mode:u,nearestMode:l})}}),wp,_p,bp,_h=z(()=>{"use strict";de(),ne(),J(),wp=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],i=e[2];if(t.dataType!==r.dataType||t.dataType!==i.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],s=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==s)throw new Error("Skip must have the same sequence length as input");if(i.dims.length!==1)throw new Error("Gamma must be 1D");if(i.dims[i.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let n=e[3];if(n.dims.length!==1)throw new Error("Beta must be 1D");if(n.dims[n.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let n=e[4];if(n.dims.length!==1)throw new Error("Bias must be 1D");if(n.dims[n.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},_p=(e,t,r,i)=>{let a=t.simplified,s=e[0].dims,n=P.size(s),o=s,u=n,l=s.slice(-1)[0],d=i?s.slice(0,-1).concat(1):[],p=!a&&e.length>3,h=e.length>4,g=i&&r>1,f=i&&r>2,w=r>3,$=64,_=R(l),y=[{type:12,data:u},{type:12,data:_},{type:12,data:l},{type:1,data:t.epsilon}],x=I=>{let O=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],B=[C("x",e[0].dataType,e[0].dims,_),C("skip",e[1].dataType,e[1].dims,_),C("gamma",e[2].dataType,e[2].dims,_)];p&&B.push(C("beta",e[3].dataType,e[3].dims,_)),h&&B.push(C("bias",e[4].dataType,e[4].dims,_)),B.push(j("output",e[0].dataType,o,_)),g&&B.push(j("mean_output",1,d)),f&&B.push(j("inv_std_output",1,d)),w&&B.push(j("input_skip_bias_sum",e[0].dataType,o,_));let U=A(e[0].dataType),F=A(1,_);return`

      ${I.registerUniforms(O).declareVariables(...B)}
      var<workgroup> sum_shared : array<${F}, ${$}>;
      var<workgroup> sum_squared_shared : array<${F}, ${$}>;

      ${I.mainStart([$,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${$};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${$};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${$-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${h?"bias[offset1d + i]":U+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${w?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${W(U,_,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${$};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${q("sum",_)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${q("square_sum",_)} / f32(uniforms.hidden_size) ${a?"":"- mean * mean"} + uniforms.epsilon);
        ${g?"mean_output[global_idx] = mean;":""}
        ${f?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${a?"":`- ${U}(mean)`}) *
            ${U}(inv_std_dev) * gamma[offset1d + i]
            ${p?"+ beta[offset1d + i]":""};
        }
      }`},S=[{dims:o,dataType:e[0].dataType}];return r>1&&S.push({dims:d,dataType:1}),r>2&&S.push({dims:d,dataType:1}),r>3&&S.push({dims:s,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${_};${g};${f};${w}`,inputDependencies:e.map((I,O)=>"type")},getShaderSource:x,getRunData:()=>({outputs:S,dispatchGroup:{x:Math.ceil(u/l)},programUniforms:y})}},bp=(e,t)=>{wp(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(_p(e.inputs,t,e.outputCount,!1),{outputs:r})}}),$p,fa,vp,an,xp,Sp,Tp,Ep,bh=z(()=>{"use strict";de(),ne(),b(),J(),$p=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,i)=>{if(e[i+1].dataType!==6&&e[i+1].dataType!==7)throw new Error(`Input ${i} must be an array of int32 or int64`)})},fa=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(i=>r.push(Number(i)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(i=>r.push(Number(i)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},vp=(e,t)=>{if(e.length>1){let r=fa(e,1),i=fa(e,2),a=fa(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),m({starts:r,ends:i,axes:a})}else return t},an=(e,t,r,i,a)=>{let s=e;return e<0&&(s+=r[i[t]]),a[t]<0?Math.max(0,Math.min(s,r[i[t]]-1)):Math.max(0,Math.min(s,r[i[t]]))},xp=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length-1}; i >= 0; i--) {
            let input_shape_i = ${D("uniforms.input_shape","i",r.length)};
            let steps_i = ${D("uniforms.steps","i",r.length)};
            let signs_i = ${D("uniforms.signs","i",r.length)};
            let starts_i = ${D("uniforms.starts","i",r.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,Sp=(e,t)=>{let r=e[0].dims,i=P.size(r),a=t.axes.length>0?P.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],s=fa(e,4);s.forEach(_=>_!==0||(()=>{throw new Error("step cannot be 0")})),s.length===0&&(s=Array(a.length).fill(1));let n=t.starts.map((_,y)=>an(_,y,r,a,s)),o=t.ends.map((_,y)=>an(_,y,r,a,s));if(a.length!==n.length||a.length!==o.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let _=0;_<r.length;++_)a.includes(_)||(n.splice(_,0,0),o.splice(_,0,r[_]),s.splice(_,0,1));let u=s.map(_=>Math.sign(_));s.forEach((_,y,x)=>{if(_<0){let S=(o[y]-n[y])/_,I=n[y],O=I+S*s[y];n[y]=O,o[y]=I,x[y]=-_}});let l=r.slice(0);a.forEach((_,y)=>{l[_]=Math.ceil((o[_]-n[_])/s[_])});let d={dims:l,dataType:e[0].dataType},p=j("output",e[0].dataType,l.length),h=C("input",e[0].dataType,e[0].dims.length),g=P.size(l),f=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:n.length},{name:"signs",type:"i32",length:u.length},{name:"steps",type:"u32",length:s.length}],w=[{type:12,data:g},{type:12,data:n},{type:6,data:u},{type:12,data:s},...k(e[0].dims,l)],$=_=>`
      ${_.registerUniforms(f).declareVariables(h,p)}
        ${xp(h,p,r)}
        ${_.mainStart()}
          ${_.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${p.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${p.setByOffset("global_idx",h.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${u.length}_${n.length}_${s.length}`,inputDependencies:["rank"]},getShaderSource:$,getRunData:()=>({outputs:[d],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:w})}},Tp=(e,t)=>{$p(e.inputs,t);let r=vp(e.inputs,t);e.compute(Sp(e.inputs,r),{inputs:[0]})},Ep=e=>{let t=e.starts,r=e.ends,i=e.axes;return m({starts:t,ends:r,axes:i})}}),kp,Ip,zp,Cp,$h=z(()=>{"use strict";de(),ne(),b(),zt(),J(),kp=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},Ip=(e,t)=>{let r=e.inputs[0],i=r.dims,a=P.size(i),s=i.length,n=P.normalizeAxis(t.axis,s),o=n<i.length-1,u,l=[];o?(l=Array.from({length:s},(B,U)=>U),l[n]=s-1,l[s-1]=n,u=e.compute(Ze(r,l),{inputs:[r],outputs:[-1]})[0]):u=r;let d=u.dims,p=d[s-1],h=a/p,g=R(p),f=p/g,w=64;h===1&&(w=256);let $=(B,U)=>U===4?`max(max(${B}.x, ${B}.y), max(${B}.z, ${B}.w))`:U===2?`max(${B}.x, ${B}.y)`:U===3?`max(max(${B}.x, ${B}.y), ${B}.z)`:B,_=C("x",u.dataType,u.dims,g),y=j("result",u.dataType,u.dims,g),x=_.type.value,S=A(u.dataType)==="f32"?`var threadMax = ${x}(-3.4028234663852886e+38f);`:`var threadMax = ${x}(-65504.0h);`,I=B=>`
      var<workgroup> rowMaxShared : ${x};
      var<workgroup> rowSumShared : ${x};
      var<workgroup> threadShared : array<${x}, ${w}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${x} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${x}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${B.registerUniform("packedCols","i32").declareVariables(_,y)}
      ${B.mainStart(w)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${w};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${S}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${x}(${$("threadShared[0]",g)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${x}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${x}(${q("threadShared[0]",g)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${x}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`,O=e.compute({name:"Softmax",shaderCache:{hint:`${g};${w}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:d,dataType:u.dataType}],dispatchGroup:{x:h},programUniforms:[{type:6,data:f}]}),getShaderSource:I},{inputs:[u],outputs:[o?-1:0]})[0];o&&e.compute(Ze(O,l),{inputs:[O]})},zp=(e,t)=>{kp(e.inputs),Ip(e,t)},Cp=e=>m({axis:e.axis})}),sn,Ap,Op,Rp,Bp,vh=z(()=>{"use strict";de(),ne(),J(),sn=e=>Array.from(e.getBigInt64Array(),Number),Ap=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(sn(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},Op=(e,t)=>{let r=[];for(let i=0;i<e.length;++i)r.push(e[i]*t[i]);return r},Rp=(e,t)=>{let r=e[0].dims,i=t??sn(e[1]),a=Op(r,i),s=P.size(a),n=e[0].dataType,o=C("input",n,r.length),u=j("output",n,a.length),l=d=>`
      const inputShape = ${o.indices(...r)};
      ${d.registerUniform("output_size","u32").declareVariables(o,u)}
      ${d.mainStart()}
      ${d.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${u.offsetToIndices("global_idx")};
      var input_indices: ${o.type.indices};
      for (var i = 0; i < ${r.length}; i++) {
        let input_dim_i = ${o.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${u.indicesGet("output_indices","i")}  % input_dim_i;

        ${o.indicesSet("input_indices","i","input_dim_value")}
      }
      ${u.setByOffset("global_idx",o.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${i}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:[{type:12,data:s},...k(e[0].dims,a)]}),getShaderSource:l}},Bp=e=>{Ap(e.inputs),e.compute(Rp(e.inputs),{inputs:[0]})}}),Mp,Dp,Pp,xh=z(()=>{"use strict";de(),ne(),J(),Mp=(e,t,r,i,a)=>{let s=j("output_data",a,r.length,4),n=C("a_data",t[1].dataType,t[1].dims.length,4),o=C("b_data",t[2].dataType,t[2].dims.length,4),u=C("c_data",t[0].dataType,t[0].dims.length,4),l,d=(p,h,g)=>`select(${h}, ${p}, ${g})`;if(!i)l=s.setByOffset("global_idx",d(n.getByOffset("global_idx"),o.getByOffset("global_idx"),u.getByOffset("global_idx")));else{let p=(h,g,f="")=>{let w=`a_data[index_a${g}][component_a${g}]`,$=`b_data[index_b${g}][component_b${g}]`,_=`bool(c_data[index_c${g}] & (0xffu << (component_c${g} * 8)))`;return`
            let output_indices${g} = ${s.offsetToIndices(`global_idx * 4u + ${g}u`)};
            let offset_a${g} = ${n.broadcastedIndicesToOffset(`output_indices${g}`,s)};
            let offset_b${g} = ${o.broadcastedIndicesToOffset(`output_indices${g}`,s)};
            let offset_c${g} = ${u.broadcastedIndicesToOffset(`output_indices${g}`,s)};
            let index_a${g} = offset_a${g} / 4u;
            let index_b${g} = offset_b${g} / 4u;
            let index_c${g} = offset_c${g} / 4u;
            let component_a${g} = offset_a${g} % 4u;
            let component_b${g} = offset_b${g} % 4u;
            let component_c${g} = offset_c${g} % 4u;
            ${h}[${g}] = ${f}(${d(w,$,_)});
          `};a===9?l=`
            var data = vec4<u32>(0);
            ${p("data",0,"u32")}
            ${p("data",1,"u32")}
            ${p("data",2,"u32")}
            ${p("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:l=`
            ${p("output_data[global_idx]",0)}
            ${p("output_data[global_idx]",1)}
            ${p("output_data[global_idx]",2)}
            ${p("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(u,n,o,s)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${l}
      }`},Dp=e=>{let t=e[1].dims,r=e[2].dims,i=e[0].dims,a=e[1].dataType,s=!(P.areEqual(t,r)&&P.areEqual(r,i)),n=t,o=P.size(t);if(s){let l=Vt.calcShape(Vt.calcShape(t,r,!1),i,!1);if(!l)throw new Error("Can't perform where op on the given tensors");n=l,o=P.size(n)}let u=Math.ceil(o/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>Mp(l,e,n,s,a),getRunData:()=>({outputs:[{dims:n,dataType:a}],dispatchGroup:{x:Math.ceil(o/64/4)},programUniforms:[{type:12,data:u},...k(i,t,r,n)]})}},Pp=e=>{e.compute(Dp(e.inputs))}}),Up,Sh=z(()=>{"use strict";Uc(),bs(),Nc(),Lc(),qc(),Vc(),Fc(),Kc(),Qc(),Xc(),Yc(),Jc(),eh(),th(),rh(),ih(),ah(),sh(),nh(),oh(),uh(),lh(),dh(),ph(),ch(),Ql(),hh(),fh(),mh(),gh(),yh(),ys(),wh(),nd(),_h(),bh(),$h(),id(),vh(),zt(),Ss(),xh(),Up=new Map([["Abs",[wo]],["Acos",[_o]],["Acosh",[bo]],["Add",[ou]],["ArgMax",[ro,_s]],["ArgMin",[to,_s]],["Asin",[$o]],["Asinh",[vo]],["Atan",[xo]],["Atanh",[So]],["Attention",[uo]],["AveragePool",[Dd,Md]],["BatchNormalization",[ho]],["BiasAdd",[go]],["BiasSplitGelu",[au]],["Cast",[Eo,To]],["Ceil",[zo]],["Clip",[Io]],["Concat",[$u,vu]],["Conv",[Ps,Ms]],["ConvTranspose",[Zu,ju]],["Cos",[Co]],["Cosh",[Ao]],["CumSum",[Xu,Yu]],["DepthToSpace",[rl,il]],["DequantizeLinear",[Gd,jd]],["Div",[uu]],["Einsum",[ll,dl]],["Elu",[Oo,ua]],["Equal",[lu]],["Erf",[Ro]],["Exp",[Bo]],["Expand",[fl]],["FastGelu",[gl]],["Floor",[Mo]],["FusedConv",[Ps,Ms]],["Gather",[bl,_l]],["GatherElements",[Al,Cl]],["GatherBlockQuantized",[El,kl]],["GatherND",[vl,xl]],["Gelu",[Do]],["Gemm",[Ml,Bl]],["GlobalAveragePool",[Ud,Pd]],["GlobalMaxPool",[Vd,qd]],["Greater",[hu]],["GreaterOrEqual",[mu]],["GridSample",[Wl,Gl]],["GroupQueryAttention",[dd]],["HardSigmoid",[Wo,Fo]],["InstanceNormalization",[hd]],["LayerNormalization",[gd]],["LeakyRelu",[Po,ua]],["Less",[fu]],["LessOrEqual",[gu]],["Log",[Yo]],["MatMul",[wd]],["MatMulNBits",[vd,xd]],["MaxPool",[Nd,Ld]],["Mul",[du]],["MultiHeadAttention",[Zl,Hl]],["Neg",[No]],["Not",[Uo]],["Pad",[Od]],["Pow",[pu]],["QuickGelu",[tu,ua]],["Range",[Zd]],["Reciprocal",[Lo]],["ReduceMin",[Qn]],["ReduceMean",[Gn]],["ReduceMax",[Zn]],["ReduceSum",[Yn]],["ReduceProd",[Xn]],["ReduceL1",[jn]],["ReduceL2",[Hn]],["ReduceLogSum",[eo]],["ReduceLogSumExp",[Kn]],["ReduceSumSquare",[Jn]],["Relu",[qo]],["Resize",[gp,yp]],["RotaryEmbedding",[sd]],["ScatterND",[Jd,Yd]],["Sigmoid",[Vo]],["Sin",[Go]],["Sinh",[jo]],["Slice",[Tp,Ep]],["SkipLayerNormalization",[bp]],["Split",[td,rd]],["Sqrt",[Ho]],["Softmax",[zp,Cp]],["Sub",[cu]],["Tan",[Ko]],["Tanh",[Zo]],["ThresholdedRelu",[Xo,ua]],["Tile",[Bp]],["Transpose",[ia,aa]],["Where",[Pp]]])}),Np,Th=z(()=>{"use strict";We(),gt(),J(),Np=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,i,a){He(e.programInfo.name);let s=this.backend.device,n=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let o=[];for(let l of t)o.push({binding:o.length,resource:{buffer:l.buffer}});for(let l of r)o.push({binding:o.length,resource:{buffer:l.buffer}});a&&o.push({binding:o.length,resource:a});let u=s.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:o,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let l={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:u,dispatchGroup:i};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(l)}n.setPipeline(e.computePipeline),n.setBindGroup(0,u),n.dispatchWorkgroups(...i),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),Fe(e.programInfo.name)}dispose(){}build(e,t){He(e.name);let r=this.backend.device,i=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(l=>{r.features.has(l.feature)&&i.push(`enable ${l.extension};`)});let a=Re(t,this.backend.device.limits),s=e.getShaderSource(a),n=`${i.join(`
`)}
${a.additionalImplementations}
${s}`,o=r.createShaderModule({code:n,label:e.name});_e("verbose",()=>`[WebGPU] ${e.name} shader code: ${n}`);let u=r.createComputePipeline({compute:{module:o,entryPoint:"main"},layout:"auto",label:e.name});return Fe(e.name),{programInfo:e,computePipeline:u,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,i=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&i<=a)return[t,r,i];let s=t*r*i,n=Math.ceil(Math.sqrt(s));if(n>a){if(n=Math.ceil(Math.cbrt(s)),n>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[n,n,n]}else return[n,n,1]}}}),Lp={};se(Lp,{WebGpuBackend:()=>Wp});var qp,Vp,Fp,Wp,Eh=z(()=>{"use strict";We(),de(),gt(),rr(),fs(),Sh(),Th(),qp=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let i=0;i<e.length;++i){let a=e[i].dataType;switch(t[i]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let s=e[i].dims.length;r.push(`${a};${s}`);break}case"dims":{let s=e[i].dims.join(",");r.push(`${a};${s}`);break}default:throw new Error(`unsupported input dependency: ${t[i]}`)}}return r.join("|")},Vp=(e,t,r)=>{var a,s;let i=e.name;return(a=e.shaderCache)!=null&&a.hint&&(i+="["+e.shaderCache.hint+"]"),i+=":"+r+`:${qp(t,((s=e.shaderCache)==null?void 0:s.inputDependencies)??new Array(t.length).fill("dims"))}`,i},Fp=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Wp=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],i={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r},a=o=>t.features.has(o)&&r.push(o)&&!0;a("chromium-experimental-timestamp-query-inside-passes")||a("timestamp-query"),a("shader-f16"),a("subgroups"),this.device=await t.requestDevice(i);let s=t,n=t.info??(typeof s.requestAdapterInfo=="function"?await s.requestAdapterInfo():void 0);this.adapterInfo=new Fp(n),this.gpuDataManager=Ta(this),this.programManager=new Np(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Jr(e.logLevel,!!e.debug),this.device.onuncapturederror=o=>{o.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${o.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!0}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){var e;typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose(),this.device&&((e=this.env)!=null&&e.webgpu)&&this.device.lost.then(()=>{delete this.env.webgpu.device})}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;He(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var i;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let s=r[a],n=s.kernelId,o=this.kernels.get(n),u=o.kernelType,l=o.kernelName,d=s.programName,p=s.inputTensorViews,h=s.outputTensorViews,g=t[a*2],f=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=g);let w=Number(g-this.queryTimeBase),$=Number(f-this.queryTimeBase);if(!Number.isSafeInteger(w)||!Number.isSafeInteger($))throw new RangeError("incorrect timestamp range");if((i=this.env.webgpu.profiling)!=null&&i.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:p.map(_=>({dims:_.dims,dataType:pt(_.dataType)})),outputsMetadata:h.map(_=>({dims:_.dims,dataType:pt(_.dataType)})),kernelId:n,kernelType:u,kernelName:l,programName:d,startTime:w,endTime:$});else{let _="";p.forEach((x,S)=>{_+=`input[${S}]: [${x.dims}] | ${pt(x.dataType)}, `});let y="";h.forEach((x,S)=>{y+=`output[${S}]: [${x.dims}] | ${pt(x.dataType)}, `}),console.log(`[profiling] kernel "${n}|${u}|${l}|${d}" ${_}${y}start time: ${w} ns, execution time: ${$-w} ns`)}Lt("GPU",`${d}::${g}::${f}`)}e.unmap(),this.pendingQueries.delete(e)}),Fe()}run(e,t,r,i,a,s){He(e.name);let n=[];for(let y=0;y<t.length;++y){let x=t[y].data;if(x===0)continue;let S=this.gpuDataManager.get(x);if(!S)throw new Error(`no GPU data for input: ${x}`);n.push(S)}let{outputs:o,dispatchGroup:u,programUniforms:l}=e.getRunData(t),d=r.length===0?o.map((y,x)=>x):r;if(d.length!==o.length)throw new Error(`Output size ${d.length} must be equal to ${o.length}.`);let p=[],h=[];for(let y=0;y<o.length;++y){if(!Number.isInteger(d[y])||d[y]<-3||d[y]>=s)throw new Error(`Invalid output index: ${d[y]}`);if(d[y]===-3)continue;let x=d[y]===-1,S=d[y]===-2,I=x||S?a(o[y].dataType,o[y].dims):i(d[y],o[y].dataType,o[y].dims);if(p.push(I),I.data===0)continue;let O=this.gpuDataManager.get(I.data);if(!O)throw new Error(`no GPU data for output: ${I.data}`);if(x&&this.temporaryData.push(O),S){let B=this.kernelPersistentData.get(this.currentKernelId);B||(B=[],this.kernelPersistentData.set(this.currentKernelId,B)),B.push(O)}h.push(O)}if(n.length!==t.length||h.length!==p.length){if(h.length===0)return Fe(e.name),p;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let g;if(l){let y=0,x=[];l.forEach(B=>{let U=typeof B.data=="number"?[B.data]:B.data;if(U.length===0)return;let F=B.type===10?2:4,Z,le;B.type===10?(le=U.length>4?16:U.length>2?8:U.length*F,Z=U.length>4?16:F*U.length):(le=U.length<=2?U.length*F:16,Z=16),y=Math.ceil(y/le)*le,x.push(y);let ie=B.type===10?8:4;y+=U.length>4?Math.ceil(U.length/ie)*Z:U.length*F});let S=16;y=Math.ceil(y/S)*S;let I=new ArrayBuffer(y);l.forEach((B,U)=>{let F=x[U],Z=typeof B.data=="number"?[B.data]:B.data;if(B.type===6)new Int32Array(I,F,Z.length).set(Z);else if(B.type===12)new Uint32Array(I,F,Z.length).set(Z);else if(B.type===10)new Uint16Array(I,F,Z.length).set(Z);else if(B.type===1)new Float32Array(I,F,Z.length).set(Z);else throw new Error(`Unsupported uniform type: ${pt(B.type)}`)});let O=this.gpuDataManager.create(y,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(O.buffer,0,I,0,y),this.gpuDataManager.release(O.id),g={offset:0,size:y,buffer:O.buffer}}let f=this.programManager.normalizeDispatchGroupSize(u),w=f[1]===1&&f[2]===1,$=Vp(e,t,w),_=this.programManager.getArtifact($);if(_||(_=this.programManager.build(e,f),this.programManager.setArtifact($,_),_e("info",()=>`[artifact] key: ${$}, programName: ${e.name}`)),l&&_.uniformVariablesInfo){if(l.length!==_.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${_.uniformVariablesInfo.length}, got ${l.length} in program "${_.programInfo.name}".`);for(let y=0;y<l.length;y++){let x=l[y],S=x.type,I=typeof x.data=="number"?1:x.data.length,[O,B]=_.uniformVariablesInfo[y];if(S!==O||I!==B)throw new Error(`Uniform variable ${y} mismatch: expect type ${O} with size ${B}, got type ${S} with size ${I} in program "${_.programInfo.name}".`)}}if(_e("info",()=>`[ProgramManager] run "${e.name}" (key=${$}) with ${f[0]}x${f[1]}x${f[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let y={kernelId:this.currentKernelId,programName:_.programInfo.name,inputTensorViews:t,outputTensorViews:p};this.pendingKernels.push(y),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(y)}return this.programManager.run(_,n,h,f,g),Fe(e.name),p}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,i){let a=Up.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let s={kernelType:e,kernelName:i,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,s)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let i=this.kernels.get(e);if(!i)throw new Error(`kernel not created: ${e}`);let a=i.kernelType,s=i.kernelName,n=i.kernelEntry,o=i.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${s}" is not allowed to be called recursively`);this.currentKernelId=e,o[0]&&(o[1]=o[0](o[1]),o[0]=void 0),_e("info",()=>`[WebGPU] Start to run kernel "[${a}] ${s}"...`);let u=this.env.debug;this.temporaryData=[];try{return u&&this.device.pushErrorScope("validation"),n(t,o[1]),0}catch(l){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${s}" failed. ${l}`)),1}finally{u&&r.push(this.device.popErrorScope().then(l=>l?`GPU validation error for kernel "[${a}] ${s}": ${l.message}`:null));for(let l of this.temporaryData)this.gpuDataManager.release(l.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,i){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let s=a.get(t),n=this.gpuDataManager.registerExternalBuffer(r,i,s);return a.set(t,[n,r]),n}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let i=await ta(this,e,t);return Ft(i.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){_e("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){_e("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){_e("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let i=0;i<r;i++){let a=this.getComputePassEncoder(),s=e[i];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(s.computePipeline),a.setBindGroup(0,s.bindGroup),a.dispatchWorkgroups(...s.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[i]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Gp={};se(Gp,{init:()=>Hp});var Pa,jp,Hp,kh=z(()=>{"use strict";de(),gt(),ne(),ea(),Pa=class wc{constructor(t,r,i,a){this.module=t,this.dataType=r,this.data=i,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=P.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=P.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=P.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=P.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(P.size(t)!==P.size(this.dims))throw new Error("Invalid new shape");return new wc(this.module,this.dataType,this.data,t)}},jp=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let i=e.PTR_SIZE,a=r/e.PTR_SIZE,s=i===4?"i32":"i64";this.opKernelContext=Number(e.getValue(i*a++,s));let n=Number(e.getValue(i*a++,s));this.outputCount=Number(e.getValue(i*a++,s)),this.customDataOffset=Number(e.getValue(i*a++,"*")),this.customDataSize=Number(e.getValue(i*a++,s));let o=[];for(let u=0;u<n;u++){let l=Number(e.getValue(i*a++,s)),d=Number(e.getValue(i*a++,"*")),p=Number(e.getValue(i*a++,s)),h=[];for(let g=0;g<p;g++)h.push(Number(e.getValue(i*a++,s)));o.push(new Pa(e,l,d,h))}this.inputs=o}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var n;let r=((n=t==null?void 0:t.inputs)==null?void 0:n.map(o=>typeof o=="number"?this.inputs[o]:o))??this.inputs,i=(t==null?void 0:t.outputs)??[],a=(o,u,l)=>new Pa(this.module,u,this.output(o,l),l),s=(o,u)=>{let l=ct(o,u);if(!l)throw new Error(`Unsupported data type: ${o}`);let d=l>0?this.backend.gpuDataManager.create(l).id:0;return new Pa(this.module,o,d,u)};return this.backend.run(e,r,i,a,s,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let i=this.module.PTR_SIZE,a=i===4?"i32":"i64",s=this.module.stackAlloc((1+t.length)*i);this.module.setValue(s,t.length,a);for(let n=0;n<t.length;n++)this.module.setValue(s+i*(n+1),t[n],a);return this.module._JsepOutput(this.opKernelContext,e,s)}catch(i){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${i}`)}finally{this.module.stackRestore(r)}}},Hp=async(e,t,r,i)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let s=(Eh(),ee(Lp)).WebGpuBackend,n=new s;await n.initialize(r,i),a("webgpu",[n,o=>n.alloc(Number(o)),o=>n.free(o),(o,u,l,d=!1)=>{if(d)_e("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(o)}, dst=${Number(u)}, size=${Number(l)}`),n.memcpy(Number(o),Number(u));else{_e("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(o)}, gpuDataId=${Number(u)}, size=${Number(l)}`);let p=t.HEAPU8.subarray(Number(o>>>0),Number(o>>>0)+Number(l));n.upload(Number(u),p)}},async(o,u,l)=>{_e("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${o}, dataOffset=${u}, size=${l}`),await n.download(Number(o),()=>t.HEAPU8.subarray(Number(u)>>>0,Number(u+l)>>>0))},(o,u,l)=>n.createKernel(o,Number(u),l,t.UTF8ToString(t._JsepGetNodeName(Number(u)))),o=>n.releaseKernel(o),(o,u,l,d)=>{_e("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${o}, contextDataOffset=${u}`);let p=new jp(t,n,Number(u));return n.computeKernel(Number(o),p,d)},()=>n.captureBegin(),()=>n.captureEnd(),()=>n.replay()])}else{let s=new Ji(r);a("webnn",[s,()=>s.reserveTensorId(),n=>s.releaseTensorId(n),async(n,o,u,l,d)=>s.ensureTensor(n,o,u,l,d),(n,o)=>{s.uploadTensor(n,o)},async(n,o)=>s.downloadTensor(n,o),(n,o)=>s.registerMLContext(n,o),!!r.trace])}}}),Kp,nn,on,nr,Zp,un,Ua,ln,dn,pn,cn,hn,fn,Qp=z(()=>{"use strict";We(),cs(),hs(),de(),lt(),Ir(),Hi(),Kp=(e,t)=>{pe()._OrtInit(e,t)!==0&&ue("Can't initialize onnxruntime.")},nn=async e=>{Kp(e.wasm.numThreads,Cr(e.logLevel))},on=async(e,t)=>{var i,a;(a=(i=pe()).asyncInit)==null||a.call(i);let r=e.webgpu.adapter;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");if(r){if(typeof r.limits!="object"||typeof r.features!="object"||typeof r.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let s=e.webgpu.powerPreference;if(s!==void 0&&s!=="low-power"&&s!=="high-performance")throw new Error(`Invalid powerPreference setting: "${s}"`);let n=e.webgpu.forceFallbackAdapter;if(n!==void 0&&typeof n!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${n}"`);if(r=await navigator.gpu.requestAdapter({powerPreference:s,forceFallbackAdapter:n}),!r)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}}if(t==="webnn"&&(typeof navigator>"u"||!navigator.ml))throw new Error("WebNN is not supported in current environment");{let s=(kh(),ee(Gp)).init;t==="webgpu"&&await s("webgpu",pe(),e,r),t==="webnn"&&await s("webnn",pe(),e)}},nr=new Map,Zp=e=>{let t=pe(),r=t.stackSave();try{let i=t.PTR_SIZE,a=t.stackAlloc(2*i);t._OrtGetInputOutputCount(e,a,a+i)!==0&&ue("Can't get session input/output count.");let s=i===4?"i32":"i64";return[Number(t.getValue(a,s)),Number(t.getValue(a+i,s))]}finally{t.stackRestore(r)}},un=(e,t)=>{let r=pe(),i=r.stackSave(),a=0;try{let s=r.PTR_SIZE,n=r.stackAlloc(2*s);r._OrtGetInputOutputMetadata(e,t,n,n+s)!==0&&ue("Can't get session input/output metadata.");let o=Number(r.getValue(n,"*"));a=Number(r.getValue(n+s,"*"));let u=r.HEAP32[a/4];if(u===0)return[o,0];let l=r.HEAPU32[a/4+1],d=[];for(let p=0;p<l;p++){let h=Number(r.getValue(a+8+p*s,"*"));d.push(h!==0?r.UTF8ToString(h):Number(r.getValue(a+8+(p+l)*s,"*")))}return[o,u,d]}finally{r.stackRestore(i),a!==0&&r._OrtFree(a)}},Ua=e=>{let t=pe(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},ln=async(e,t)=>{var p,h,g,f;let r,i,a=pe();Array.isArray(e)?[r,i]=e:e.buffer===a.HEAPU8.buffer?[r,i]=[e.byteOffset,e.byteLength]:[r,i]=Ua(e);let s=0,n=0,o=0,u=[],l=[],d=[];try{if([n,u]=await ji(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let U=[];for(let F of t.externalData){let Z=typeof F=="string"?F:F.path;U.push(Rr(typeof F=="string"?F:F.data).then(le=>{a.mountExternalData(Z,le)}))}await Promise.all(U)}for(let U of(t==null?void 0:t.executionProviders)??[])if((typeof U=="string"?U:U.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,typeof U!="string"){let F=U,Z=F==null?void 0:F.context,le=F==null?void 0:F.gpuDevice,ie=F==null?void 0:F.deviceType,ae=F==null?void 0:F.powerPreference;Z?a.currentContext=Z:le?a.currentContext=await a.webnnCreateMLContext(le):a.currentContext=await a.webnnCreateMLContext({deviceType:ie,powerPreference:ae})}else a.currentContext=await a.webnnCreateMLContext();break}s=await a._OrtCreateSession(r,i,n),(p=a.webgpuOnCreateSession)==null||p.call(a,s),s===0&&ue("Can't create a session."),(h=a.jsepOnCreateSession)==null||h.call(a),a.currentContext&&(a.webnnRegisterMLContext(s,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[w,$]=Zp(s),_=!!(t!=null&&t.enableGraphCapture),y=[],x=[],S=[],I=[],O=[];for(let U=0;U<w;U++){let[F,Z,le]=un(s,U);F===0&&ue("Can't get an input name."),l.push(F);let ie=a.UTF8ToString(F);y.push(ie),S.push(Z===0?{name:ie,isTensor:!1}:{name:ie,isTensor:!0,type:pt(Z),shape:le})}for(let U=0;U<$;U++){let[F,Z,le]=un(s,U+w);F===0&&ue("Can't get an output name."),d.push(F);let ie=a.UTF8ToString(F);x.push(ie),I.push(Z===0?{name:ie,isTensor:!1}:{name:ie,isTensor:!0,type:pt(Z),shape:le});{if(_&&(t==null?void 0:t.preferredOutputLocation)===void 0){O.push("gpu-buffer");continue}let ae=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((g=t==null?void 0:t.preferredOutputLocation)==null?void 0:g[ie])??"cpu",ve=a.webnnIsGraphOutput;if(ae==="cpu"&&ve&&ve(s,ie)){O.push("ml-tensor-cpu-output");continue}if(ae!=="cpu"&&ae!=="cpu-pinned"&&ae!=="gpu-buffer"&&ae!=="ml-tensor")throw new Error(`Not supported preferred output location: ${ae}.`);if(_&&ae!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${ae}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);O.push(ae)}}let B=null;return O.some(U=>U==="gpu-buffer"||U==="ml-tensor"||U==="ml-tensor-cpu-output")&&(o=a._OrtCreateBinding(s),o===0&&ue("Can't create IO binding."),B={handle:o,outputPreferredLocations:O,outputPreferredLocationsEncoded:O.map(U=>U==="ml-tensor-cpu-output"?"ml-tensor":U).map(U=>Qr(U))}),nr.set(s,[s,l,d,B,_,!1]),[s,y,x,S,I]}catch(w){throw l.forEach($=>a._OrtFree($)),d.forEach($=>a._OrtFree($)),o!==0&&a._OrtReleaseBinding(o)!==0&&ue("Can't release IO binding."),s!==0&&a._OrtReleaseSession(s)!==0&&ue("Can't release session."),w}finally{a._free(r),n!==0&&a._OrtReleaseSessionOptions(n)!==0&&ue("Can't release session options."),u.forEach(w=>a._free(w)),(f=a.unmountExternalData)==null||f.call(a)}},dn=e=>{var u,l,d;let t=pe(),r=nr.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[i,a,s,n,o]=r;n&&(o&&t._OrtClearBoundOutputs(n.handle)!==0&&ue("Can't clear bound outputs."),t._OrtReleaseBinding(n.handle)!==0&&ue("Can't release IO binding.")),(u=t.jsepOnReleaseSession)==null||u.call(t,e),(l=t.webnnOnReleaseSession)==null||l.call(t,e),(d=t.webgpuOnReleaseSession)==null||d.call(t,e),a.forEach(p=>t._OrtFree(p)),s.forEach(p=>t._OrtFree(p)),t._OrtReleaseSession(i)!==0&&ue("Can't release session."),nr.delete(e)},pn=async(e,t,r,i,a,s,n=!1)=>{if(!e){t.push(0);return}let o=pe(),u=o.PTR_SIZE,l=e[0],d=e[1],p=e[3],h=p,g,f;if(l==="string"&&(p==="gpu-buffer"||p==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(n&&p!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${s} when enableGraphCapture is true.`);if(p==="gpu-buffer"){let _=e[2].gpuBuffer;f=ct(dt(l),d);{let y=o.jsepRegisterBuffer;if(!y)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');g=y(i,s,_,f)}}else if(p==="ml-tensor"){let _=e[2].mlTensor;f=ct(dt(l),d);let y=o.webnnRegisterMLTensor;if(!y)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');g=y(i,_,dt(l),d)}else{let _=e[2];if(Array.isArray(_)){f=u*_.length,g=o._malloc(f),r.push(g);for(let y=0;y<_.length;y++){if(typeof _[y]!="string")throw new TypeError(`tensor data at index ${y} is not a string`);o.setValue(g+y*u,Pe(_[y],r),"*")}}else{let y=o.webnnIsGraphInput,x=o.webnnIsGraphOutput;if(l!=="string"&&y&&x){let S=o.UTF8ToString(a);if(y(i,S)||x(i,S)){let I=dt(l);f=ct(I,d),h="ml-tensor";let O=o.webnnCreateTemporaryTensor,B=o.webnnUploadTensor;if(!O||!B)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let U=await O(i,I,d);B(U,new Uint8Array(_.buffer,_.byteOffset,_.byteLength)),g=U}else f=_.byteLength,g=o._malloc(f),r.push(g),o.HEAPU8.set(new Uint8Array(_.buffer,_.byteOffset,f),g)}else f=_.byteLength,g=o._malloc(f),r.push(g),o.HEAPU8.set(new Uint8Array(_.buffer,_.byteOffset,f),g)}}let w=o.stackSave(),$=o.stackAlloc(4*d.length);try{d.forEach((y,x)=>o.setValue($+x*u,y,u===4?"i32":"i64"));let _=o._OrtCreateTensor(dt(l),g,f,$,d.length,Qr(h));_===0&&ue(`Can't create tensor for input/output. session=${i}, index=${s}.`),t.push(_)}finally{o.stackRestore(w)}},cn=async(e,t,r,i,a,s)=>{var ie,ae,ve,Se;let n=pe(),o=n.PTR_SIZE,u=nr.get(e);if(!u)throw new Error(`cannot run inference. invalid session id: ${e}`);let l=u[0],d=u[1],p=u[2],h=u[3],g=u[4],f=u[5],w=t.length,$=i.length,_=0,y=[],x=[],S=[],I=[],O=[],B=n.stackSave(),U=n.stackAlloc(w*o),F=n.stackAlloc(w*o),Z=n.stackAlloc($*o),le=n.stackAlloc($*o);try{[_,y]=qi(s),Je("wasm prepareInputOutputTensor");for(let Q=0;Q<w;Q++)await pn(r[Q],x,I,e,d[t[Q]],t[Q],g);for(let Q=0;Q<$;Q++)await pn(a[Q],S,I,e,p[i[Q]],w+i[Q],g);et("wasm prepareInputOutputTensor");for(let Q=0;Q<w;Q++)n.setValue(U+Q*o,x[Q],"*"),n.setValue(F+Q*o,d[t[Q]],"*");for(let Q=0;Q<$;Q++)n.setValue(Z+Q*o,S[Q],"*"),n.setValue(le+Q*o,p[i[Q]],"*");if(h&&!f){let{handle:Q,outputPreferredLocations:Ee,outputPreferredLocationsEncoded:K}=h;if(d.length!==w)throw new Error(`input count from feeds (${w}) is expected to be always equal to model's input count (${d.length}).`);Je("wasm bindInputsOutputs");for(let Y=0;Y<w;Y++){let re=t[Y];await n._OrtBindInput(Q,d[re],x[Y])!==0&&ue(`Can't bind input[${Y}] for session=${e}.`)}for(let Y=0;Y<$;Y++){let re=i[Y];(ie=a[Y])!=null&&ie[3]?(O.push(S[Y]),n._OrtBindOutput(Q,p[re],S[Y],0)!==0&&ue(`Can't bind pre-allocated output[${Y}] for session=${e}.`)):n._OrtBindOutput(Q,p[re],0,K[re])!==0&&ue(`Can't bind output[${Y}] to ${Ee[Y]} for session=${e}.`)}et("wasm bindInputsOutputs"),nr.set(e,[l,d,p,h,g,!0])}(ae=n.jsepOnRunStart)==null||ae.call(n,l),(ve=n.webnnOnRunStart)==null||ve.call(n,l);let oe;h?oe=await n._OrtRunWithBinding(l,h.handle,$,Z,_):oe=await n._OrtRun(l,F,U,w,le,$,Z,_),oe!==0&&ue("failed to call OrtRun().");let ce=[],Le=[];Je("wasm ProcessOutputTensor");for(let Q=0;Q<$;Q++){let Ee=Number(n.getValue(Z+Q*o,"*"));if(Ee===S[Q]||O.includes(S[Q])){ce.push(a[Q]),Ee!==S[Q]&&n._OrtReleaseTensor(Ee)!==0&&ue("Can't release tensor.");continue}let K=n.stackSave(),Y=n.stackAlloc(4*o),re=!1,X,ze=0;try{n._OrtGetTensorData(Ee,Y,Y+o,Y+2*o,Y+3*o)!==0&&ue(`Can't access output tensor data on index ${Q}.`);let Jt=o===4?"i32":"i64",Ye=Number(n.getValue(Y,Jt));ze=n.getValue(Y+o,"*");let Pt=n.getValue(Y+o*2,"*"),Ut=Number(n.getValue(Y+o*3,Jt)),ur=[];for(let Xe=0;Xe<Ut;Xe++)ur.push(Number(n.getValue(Pt+Xe*o,Jt)));n._OrtFree(Pt)!==0&&ue("Can't free memory for tensor dims.");let lr=ur.reduce((Xe,qe)=>Xe*qe,1);X=pt(Ye);let ya=h==null?void 0:h.outputPreferredLocations[i[Q]];if(X==="string"){if(ya==="gpu-buffer"||ya==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let Xe=[];for(let qe=0;qe<lr;qe++){let er=n.getValue(ze+qe*o,"*"),Oh=n.getValue(ze+(qe+1)*o,"*"),Rh=qe===lr-1?void 0:Oh-er;Xe.push(n.UTF8ToString(er,Rh))}ce.push([X,ur,Xe,"cpu"])}else if(ya==="gpu-buffer"&&lr>0){let Xe=n.jsepGetBuffer;if(!Xe)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let qe=Xe(ze),er=ct(Ye,lr);if(er===void 0||!Ar(X))throw new Error(`Unsupported data type: ${X}`);re=!0,ce.push([X,ur,{gpuBuffer:qe,download:n.jsepCreateDownloader(qe,er,X),dispose:()=>{n._OrtReleaseTensor(Ee)!==0&&ue("Can't release tensor.")}},"gpu-buffer"])}else if(ya==="ml-tensor"&&lr>0){let Xe=n.webnnEnsureTensor,qe=n.webnnIsGraphInputOutputTypeSupported;if(!Xe||!qe)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(ct(Ye,lr)===void 0||!Or(X))throw new Error(`Unsupported data type: ${X}`);if(!qe(e,X,!1))throw new Error(`preferredLocation "ml-tensor" for ${X} output is not supported by current WebNN Context.`);let er=await Xe(e,ze,Ye,ur,!1);re=!0,ce.push([X,ur,{mlTensor:er,download:n.webnnCreateMLTensorDownloader(ze,X),dispose:()=>{n.webnnReleaseTensorId(ze),n._OrtReleaseTensor(Ee)}},"ml-tensor"])}else if(ya==="ml-tensor-cpu-output"&&lr>0){let Xe=n.webnnCreateMLTensorDownloader(ze,X)(),qe=ce.length;re=!0,Le.push((async()=>{let er=[qe,await Xe];return n.webnnReleaseTensorId(ze),n._OrtReleaseTensor(Ee),er})()),ce.push([X,ur,[],"cpu"])}else{let Xe=zr(X),qe=new Xe(lr);new Uint8Array(qe.buffer,qe.byteOffset,qe.byteLength).set(n.HEAPU8.subarray(ze,ze+qe.byteLength)),ce.push([X,ur,qe,"cpu"])}}finally{n.stackRestore(K),X==="string"&&ze&&n._free(ze),re||n._OrtReleaseTensor(Ee)}}h&&!g&&(n._OrtClearBoundOutputs(h.handle)!==0&&ue("Can't clear bound outputs."),nr.set(e,[l,d,p,h,g,!1]));for(let[Q,Ee]of await Promise.all(Le))ce[Q][2]=Ee;return et("wasm ProcessOutputTensor"),ce}finally{(Se=n.webnnOnRunEnd)==null||Se.call(n,l),n.stackRestore(B),x.forEach(oe=>n._OrtReleaseTensor(oe)),S.forEach(oe=>n._OrtReleaseTensor(oe)),I.forEach(oe=>n._free(oe)),_!==0&&n._OrtReleaseRunOptions(_),y.forEach(oe=>n._free(oe))}},hn=e=>{let t=pe(),r=nr.get(e);if(!r)throw new Error("invalid session id");let i=r[0],a=t._OrtEndProfiling(i);a===0&&ue("Can't get an profile file name."),t._OrtFree(a)},fn=e=>{let t=[];for(let r of e){let i=r[2];!Array.isArray(i)&&"buffer"in i&&t.push(i.buffer)}return t}}),or,ft,ci,ma,ga,Na,mn,La,Gr,jr,Xp,Yp,Jp,ec,tc,rc,ic,ac,sc=z(()=>{"use strict";We(),Qp(),lt(),Sr(),or=()=>!!he.wasm.proxy&&typeof document<"u",ci=!1,ma=!1,ga=!1,La=new Map,Gr=(e,t)=>{let r=La.get(e);r?r.push(t):La.set(e,[t])},jr=()=>{if(ci||!ma||ga||!ft)throw new Error("worker not ready")},Xp=e=>{switch(e.data.type){case"init-wasm":ci=!1,e.data.err?(ga=!0,mn[1](e.data.err)):(ma=!0,mn[0]()),Na&&(URL.revokeObjectURL(Na),Na=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=La.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}default:}},Yp=async()=>{if(!ma){if(ci)throw new Error("multiple calls to 'initWasm()' detected.");if(ga)throw new Error("previous call to 'initWasm()' failed.");if(ci=!0,or())return new Promise((e,t)=>{ft==null||ft.terminate(),Di().then(([r,i])=>{try{ft=i,ft.onerror=s=>t(s),ft.onmessage=Xp,mn=[e,t];let a={type:"init-wasm",in:he};if(!a.in.wasm.wasmPaths&&r){let s=br();s&&(a.in.wasm.wasmPaths=s)}ft.postMessage(a),Na=r}catch(a){t(a)}},t)});try{await kr(he.wasm),await nn(he),ma=!0}catch(e){throw ga=!0,e}finally{ci=!1}}},Jp=async e=>{if(or())return jr(),new Promise((t,r)=>{Gr("init-ep",[t,r]);let i={type:"init-ep",in:{epName:e,env:he}};ft.postMessage(i)});await on(he,e)},ec=async e=>or()?(jr(),new Promise((t,r)=>{Gr("copy-from",[t,r]);let i={type:"copy-from",in:{buffer:e}};ft.postMessage(i,[e.buffer])})):Ua(e),tc=async(e,t)=>{if(or()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return jr(),new Promise((r,i)=>{Gr("create",[r,i]);let a={type:"create",in:{model:e,options:{...t}}},s=[];e instanceof Uint8Array&&s.push(e.buffer),ft.postMessage(a,s)})}else return ln(e,t)},rc=async e=>{if(or())return jr(),new Promise((t,r)=>{Gr("release",[t,r]);let i={type:"release",in:e};ft.postMessage(i)});dn(e)},ic=async(e,t,r,i,a,s)=>{if(or()){if(r.some(n=>n[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(n=>n))throw new Error("pre-allocated output tensor is not supported for proxy.");return jr(),new Promise((n,o)=>{Gr("run",[n,o]);let u=r,l={type:"run",in:{sessionId:e,inputIndices:t,inputs:u,outputIndices:i,options:s}};ft.postMessage(l,fn(u))})}else return cn(e,t,r,i,a,s)},ac=async e=>{if(or())return jr(),new Promise((t,r)=>{Gr("end-profiling",[t,r]);let i={type:"end-profiling",in:e};ft.postMessage(i)});hn(e)}}),gn,nc,oc,Ih=z(()=>{"use strict";We(),sc(),de(),yr(),Hi(),gn=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},nc=e=>{switch(e[3]){case"cpu":return new De(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Ar(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:i,dispose:a}=e[2];return De.fromGpuBuffer(r,{dataType:t,dims:e[1],download:i,dispose:a})}case"ml-tensor":{let t=e[0];if(!Or(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:i,dispose:a}=e[2];return De.fromMLTensor(r,{dataType:t,dims:e[1],download:i,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},oc=class{async fetchModelAndCopyToWasmMemory(e){return ec(await Rr(e))}async loadModel(e,t){He();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await tc(r,t),Fe()}async dispose(){return rc(this.sessionId)}async run(e,t,r){He();let i=[],a=[];Object.entries(e).forEach(p=>{let h=p[0],g=p[1],f=this.inputNames.indexOf(h);if(f===-1)throw new Error(`invalid input '${h}'`);i.push(g),a.push(f)});let s=[],n=[];Object.entries(t).forEach(p=>{let h=p[0],g=p[1],f=this.outputNames.indexOf(h);if(f===-1)throw new Error(`invalid output '${h}'`);s.push(g),n.push(f)});let o=i.map((p,h)=>gn(p,()=>`input "${this.inputNames[a[h]]}"`)),u=s.map((p,h)=>p?gn(p,()=>`output "${this.outputNames[n[h]]}"`):null),l=await ic(this.sessionId,a,o,n,u,r),d={};for(let p=0;p<l.length;p++)d[this.outputNames[n[p]]]=s[p]??nc(l[p]);return Fe(),d}startProfiling(){}endProfiling(){ac(this.sessionId)}}}),uc={};se(uc,{OnnxruntimeWebAssemblyBackend:()=>wn,initializeFlags:()=>yn,wasmBackend:()=>lc});var yn,wn,lc,zh=z(()=>{"use strict";We(),sc(),Ih(),yn=()=>{(typeof he.wasm.initTimeout!="number"||he.wasm.initTimeout<0)&&(he.wasm.initTimeout=0);let e=he.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),he.wasm.simd=!1),typeof he.wasm.proxy!="boolean"&&(he.wasm.proxy=!1),typeof he.wasm.trace!="boolean"&&(he.wasm.trace=!1),typeof he.wasm.numThreads!="number"||!Number.isInteger(he.wasm.numThreads)||he.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)he.wasm.numThreads=1;else{let t=typeof navigator>"u"?H("node:os").cpus().length:navigator.hardwareConcurrency;he.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},wn=class{async init(e){yn(),await Yp(),await Jp(e)}async createInferenceSessionHandler(e,t){let r=new oc;return await r.loadModel(e,t),r}},lc=new wn}),dc={};se(dc,{InferenceSession:()=>gr,TRACE:()=>Lt,TRACE_EVENT_BEGIN:()=>Je,TRACE_EVENT_END:()=>et,TRACE_FUNC_BEGIN:()=>He,TRACE_FUNC_END:()=>Fe,Tensor:()=>De,default:()=>Ah,env:()=>he,registerBackend:()=>be}),We(),We(),We();var Ch="1.27.0",Ah=Ii;{let e=(zh(),ee(uc)).wasmBackend;be("webgpu",e,5),be("webnn",e,5),be("cpu",e,10),be("wasm",e,10)}return Object.defineProperty(he.versions,"web",{value:Ch,enumerable:!0}),ee(dc)})();typeof _c=="object"&&typeof vn=="object"&&(vn.exports=Wh)});var vc=it($c=>{"use strict";Object.defineProperty($c,"__esModule",{value:!0})});var Tc=it(Ka=>{"use strict";var Sc;Object.defineProperty(Ka,"__esModule",{value:!0});Ka.SileroLegacy=void 0;var xc=hi(),$a=class{constructor(N,L,G,H,z){this.ortInstance=N,this._session=L,this._h=G,this._c=H,this._sr=z,this.reset_state=()=>{let se=Array(128).fill(0);this._h=new this.ortInstance.Tensor("float32",se,[2,1,64]),this._c=new this.ortInstance.Tensor("float32",se,[2,1,64])},this.process=async se=>{var je;let ee={input:new this.ortInstance.Tensor("float32",se,[1,se.length]),h:this._h,c:this._c,sr:this._sr},me=await this._session.run(ee);this._h=me.hn,this._c=me.cn;let[we]=(je=me.output)==null?void 0:je.data;return{notSpeech:1-we,isSpeech:we}},this.release=async()=>{await this._session.release(),this._h.dispose(),this._c.dispose(),this._sr.dispose()}}};Ka.SileroLegacy=$a;Sc=$a;$a.new=async(M,N)=>{xc.log.debug("initializing vad");let L=await N(),G=await M.InferenceSession.create(L),H=new M.Tensor("int64",[16000n]),z=Array(2*64).fill(0),se=new M.Tensor("float32",z,[2,1,64]),ye=new M.Tensor("float32",z,[2,1,64]);return xc.log.debug("vad is initialized"),new Sc(M,G,se,ye,H)}});var zc=it(Za=>{"use strict";var kc;Object.defineProperty(Za,"__esModule",{value:!0});Za.SileroV5=void 0;var Ec=hi();function Ic(M){let N=Array(256).fill(0);return new M.Tensor("float32",N,[2,1,128])}var va=class{constructor(N,L,G,H){this._session=N,this._state=L,this._sr=G,this.ortInstance=H,this.reset_state=()=>{this._state=Ic(this.ortInstance)},this.process=async z=>{var be;let ye={input:new this.ortInstance.Tensor("float32",z,[1,z.length]),state:this._state,sr:this._sr},ee=await this._session.run(ye);if(!ee.stateN)throw new Error("No state from model");if(this._state=ee.stateN,!((be=ee.output)!=null&&be.data))throw new Error("No output from model");let me=ee.output.data[0];if(typeof me!="number")throw new Error("Weird output data");return{notSpeech:1-me,isSpeech:me}},this.release=async()=>{await this._session.release(),this._state.dispose(),this._sr.dispose()}}};Za.SileroV5=va;kc=va;va.new=async(M,N)=>{Ec.log.debug("Loading VAD...");let L=await N(),G=await M.InferenceSession.create(L),H=new M.Tensor("int64",[16000n]),z=Ic(M);return Ec.log.debug("...finished loading VAD"),new kc(G,z,H,M)}});var xn=it(Nt=>{"use strict";var Gh=Nt&&Nt.__createBinding||(Object.create?function(M,N,L,G){G===void 0&&(G=L);var H=Object.getOwnPropertyDescriptor(N,L);(!H||("get"in H?!N.__esModule:H.writable||H.configurable))&&(H={enumerable:!0,get:function(){return N[L]}}),Object.defineProperty(M,G,H)}:function(M,N,L,G){G===void 0&&(G=L),M[G]=N[L]}),jh=Nt&&Nt.__exportStar||function(M,N){for(var L in M)L!=="default"&&!Object.prototype.hasOwnProperty.call(N,L)&&Gh(N,M,L)};Object.defineProperty(Nt,"__esModule",{value:!0});Nt.SileroV5=Nt.SileroLegacy=void 0;jh(vc(),Nt);var Hh=Tc();Object.defineProperty(Nt,"SileroLegacy",{enumerable:!0,get:function(){return Hh.SileroLegacy}});var Kh=zc();Object.defineProperty(Nt,"SileroV5",{enumerable:!0,get:function(){return Kh.SileroV5}})});var Tn=it(Qa=>{"use strict";Object.defineProperty(Qa,"__esModule",{value:!0});Qa.Resampler=void 0;var Zh=hi(),Sn=class{constructor(N){this.options=N,this.process=L=>{let G=[];for(let H of L)for(this.inputBuffer.push(H);this.hasEnoughDataForFrame();){let z=this.generateOutputFrame();G.push(z)}return G},N.nativeSampleRate<16e3&&Zh.log.error("nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate"),this.inputBuffer=[]}async*stream(N){for(let L of N)for(this.inputBuffer.push(L);this.hasEnoughDataForFrame();)yield this.generateOutputFrame()}hasEnoughDataForFrame(){return this.inputBuffer.length*this.options.targetSampleRate/this.options.nativeSampleRate>=this.options.targetFrameSize}generateOutputFrame(){let N=new Float32Array(this.options.targetFrameSize),L=0,G=0;for(;L<this.options.targetFrameSize;){let H=0,z=0;for(;G<Math.min(this.inputBuffer.length,(L+1)*this.options.nativeSampleRate/this.options.targetSampleRate);){let se=this.inputBuffer[G];se!==void 0&&(H+=se,z++),G++}N[L]=H/z,L++}return this.inputBuffer=this.inputBuffer.slice(G),N}};Qa.Resampler=Sn});var Cc=it(bt=>{"use strict";var Qh=bt&&bt.__createBinding||(Object.create?function(M,N,L,G){G===void 0&&(G=L);var H=Object.getOwnPropertyDescriptor(N,L);(!H||("get"in H?!N.__esModule:H.writable||H.configurable))&&(H={enumerable:!0,get:function(){return N[L]}}),Object.defineProperty(M,G,H)}:function(M,N,L,G){G===void 0&&(G=L),M[G]=N[L]}),Xh=bt&&bt.__setModuleDefault||(Object.create?function(M,N){Object.defineProperty(M,"default",{enumerable:!0,value:N})}:function(M,N){M.default=N}),Yh=bt&&bt.__importStar||function(M){if(M&&M.__esModule)return M;var N={};if(M!=null)for(var L in M)L!=="default"&&Object.prototype.hasOwnProperty.call(M,L)&&Qh(N,M,L);return Xh(N,M),N};Object.defineProperty(bt,"__esModule",{value:!0});bt.NonRealTimeVAD=bt.defaultNonRealTimeVADOptions=void 0;var En=Yh(bc()),Jh=_n(),ef=Fa(),In=ja(),kn=wa(),tf=xn(),rf=Tn();bt.defaultNonRealTimeVADOptions={...In.defaultFrameProcessorOptions,modelURL:Jh.baseAssetPath+"silero_vad_legacy.onnx",modelFetcher:ef.defaultModelFetcher};var zn=class{static async new(N={}){let L={...bt.defaultNonRealTimeVADOptions,...N};(0,In.validateOptions)(L),L.ortConfig!==void 0&&L.ortConfig(En);let G=()=>L.modelFetcher(L.modelURL),H=await tf.SileroLegacy.new(En,G),z=new In.FrameProcessor(H.process,H.reset_state,{positiveSpeechThreshold:L.positiveSpeechThreshold,negativeSpeechThreshold:L.negativeSpeechThreshold,redemptionMs:L.redemptionMs,preSpeechPadMs:L.preSpeechPadMs,minSpeechMs:L.minSpeechMs,submitUserSpeechOnPause:L.submitUserSpeechOnPause},1536/16);return z.resume(),new this(G,En,L,z)}constructor(N,L,G,H){this.modelFetcher=N,this.ort=L,this.options=G,this.frameProcessor=H,this.frameSamples=1536}async*run(N,L){let G={nativeSampleRate:L,targetSampleRate:16e3,targetFrameSize:this.frameSamples},H=new rf.Resampler(G),z=0,se=0,ye=0;for await(let me of H.stream(N)){let we=[];await this.frameProcessor.process(me,be=>{we.push(be)});for(let be of we)switch(be.msg){case kn.Message.SpeechStart:z=ye*this.frameSamples/16;break;case kn.Message.SpeechEnd:se=(ye+1)*this.frameSamples/16,yield{audio:be.audio,start:z,end:se};break;default:break}ye++}let ee=[];this.frameProcessor.endSegment(me=>{ee.push(me)});for(let me of ee)switch(me.msg){case kn.Message.SpeechEnd:yield{audio:me.audio,start:z,end:ye*this.frameSamples/16}}}};bt.NonRealTimeVAD=zn});var Ac=it(jt=>{"use strict";Object.defineProperty(jt,"__esModule",{value:!0});jt.audioFileToArray=jt.encodeWAV=jt.arrayBufferToBase64=jt.minFramesForTargetMS=void 0;function af(M,N,L=16e3){return Math.ceil(M*L/1e3/N)}jt.minFramesForTargetMS=af;function sf(M){let N=new Uint8Array(M),L=N.byteLength,G=new Array(L);for(let H=0;H<L;H++){let z=N[H];if(z===void 0)break;G[H]=String.fromCharCode(z)}return btoa(G.join(""))}jt.arrayBufferToBase64=sf;function nf(M,N=3,L=16e3,G=1,H=32){let z=H/8,se=G*z,ye=new ArrayBuffer(44+M.length*z),ee=new DataView(ye);return Xa(ee,0,"RIFF"),ee.setUint32(4,36+M.length*z,!0),Xa(ee,8,"WAVE"),Xa(ee,12,"fmt "),ee.setUint32(16,16,!0),ee.setUint16(20,N,!0),ee.setUint16(22,G,!0),ee.setUint32(24,L,!0),ee.setUint32(28,L*se,!0),ee.setUint16(32,se,!0),ee.setUint16(34,H,!0),Xa(ee,36,"data"),ee.setUint32(40,M.length*z,!0),N===1?uf(ee,44,M):of(ee,44,M),ye}jt.encodeWAV=nf;function of(M,N,L){for(let G=0;G<L.length;G++,N+=4)M.setFloat32(N,L[G],!0)}function uf(M,N,L){for(let G=0;G<L.length;G++,N+=2){let H=Math.max(-1,Math.min(1,L[G]));M.setInt16(N,H<0?H*32768:H*32767,!0)}}function Xa(M,N,L){for(let G=0;G<L.length;G++)M.setUint8(N+G,L.charCodeAt(G))}async function lf(M){let N=new OfflineAudioContext(1,1,44100),L=new FileReader,G=null;if(await new Promise(se=>{L.addEventListener("loadend",()=>{let ye=L.result;N.decodeAudioData(ye,ee=>{G=ee,N.startRendering().then(()=>{console.log("Rendering completed successfully"),se()}).catch(me=>{console.error("Rendering failed: ",me)})},ee=>{console.log("Error with decoding audio data: ",ee)})}),L.readAsArrayBuffer(M)}),G===null)throw Error("some shit");let H=G,z=new Float32Array(H.length);for(let se=0;se<H.length;se++)for(let ye=0;ye<H.numberOfChannels;ye++){let ee=H.getChannelData(ye)[se],me=z[se];if(ee===void 0||me===void 0)throw new Error("sample or out[i] is undefined");z[se]=me+ee}return{audio:z,sampleRate:H.sampleRate}}jt.audioFileToArray=lf});var Bc=it((Rc,Cn)=>{"use strict";var df=(()=>{var M=Object.defineProperty,N=Object.getOwnPropertyDescriptor,L=Object.getOwnPropertyNames,G=Object.prototype.hasOwnProperty,H=(c=>typeof mt<"u"?mt:typeof Proxy<"u"?new Proxy(c,{get:(m,b)=>(typeof mt<"u"?mt:m)[b]}):c)(function(c){if(typeof mt<"u")return mt.apply(this,arguments);throw Error('Dynamic require of "'+c+'" is not supported')}),z=(c,m)=>()=>(c&&(m=c(c=0)),m),se=(c,m)=>{for(var b in m)M(c,b,{get:m[b],enumerable:!0})},ye=(c,m,b,T)=>{if(m&&typeof m=="object"||typeof m=="function")for(let v of L(m))!G.call(c,v)&&v!==b&&M(c,v,{get:()=>m[v],enumerable:!(T=N(m,v))||T.enumerable});return c},ee=c=>ye(M({},"__esModule",{value:!0}),c),me,we,be,je,$t,Ie=z(()=>{"use strict";me=new Map,we=[],be=(c,m,b)=>{if(m&&typeof m.init=="function"&&typeof m.createInferenceSessionHandler=="function"){let T=me.get(c);if(T===void 0)me.set(c,{backend:m,priority:b});else{if(T.priority>b)return;if(T.priority===b&&T.backend!==m)throw new Error(`cannot register backend "${c}" using priority ${b}`)}if(b>=0){let v=we.indexOf(c);v!==-1&&we.splice(v,1);for(let A=0;A<we.length;A++)if(me.get(we[A]).priority<=b){we.splice(A,0,c);return}we.push(c)}return}throw new TypeError("not a valid backend")},je=async c=>{let m=me.get(c);if(!m)return"backend not found.";if(m.initialized)return m.backend;if(m.aborted)return m.error;{let b=!!m.initPromise;try{return b||(m.initPromise=m.backend.init(c)),await m.initPromise,m.initialized=!0,m.backend}catch(T){return b||(m.error=`${T}`,m.aborted=!0),m.error}finally{delete m.initPromise}}},$t=async c=>{let m=c.executionProviders||[],b=m.map(R=>typeof R=="string"?R:R.name),T=b.length===0?we:b,v,A=[],E=new Set;for(let R of T){let V=await je(R);typeof V=="string"?A.push({name:R,err:V}):(v||(v=V),v===V&&E.add(R))}if(!v)throw new Error(`no available backend found. ERR: ${A.map(R=>`[${R.name}] ${R.err}`).join(", ")}`);for(let{name:R,err:V}of A)b.includes(R)&&console.warn(`removing requested execution provider "${R}" from session options because it is not available: ${V}`);let k=m.filter(R=>E.has(typeof R=="string"?R:R.name));return[v,new Proxy(c,{get:(R,V)=>V==="executionProviders"?k:Reflect.get(R,V)})]}}),ut=z(()=>{"use strict";Ie()}),pr,Zr=z(()=>{"use strict";pr="1.27.0"}),cr,xe,fi=z(()=>{"use strict";Zr(),cr="warning",xe={wasm:{},webgl:{},webgpu:{},versions:{common:pr},set logLevel(c){if(c!==void 0){if(typeof c!="string"||["verbose","info","warning","error","fatal"].indexOf(c)===-1)throw new Error(`Unsupported logging level: ${c}`);cr=c}},get logLevel(){return cr}},Object.defineProperty(xe,"logLevel",{enumerable:!0})}),he,es=z(()=>{"use strict";fi(),he=xe}),mi,gi,ts=z(()=>{"use strict";mi=(c,m)=>{let b=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);b.width=c.dims[3],b.height=c.dims[2];let T=b.getContext("2d");if(T!=null){let v,A;(m==null?void 0:m.tensorLayout)!==void 0&&m.tensorLayout==="NHWC"?(v=c.dims[2],A=c.dims[3]):(v=c.dims[3],A=c.dims[2]);let E=(m==null?void 0:m.format)!==void 0?m.format:"RGB",k=m==null?void 0:m.norm,R,V;k===void 0||k.mean===void 0?R=[255,255,255,255]:typeof k.mean=="number"?R=[k.mean,k.mean,k.mean,k.mean]:(R=[k.mean[0],k.mean[1],k.mean[2],0],k.mean[3]!==void 0&&(R[3]=k.mean[3])),k===void 0||k.bias===void 0?V=[0,0,0,0]:typeof k.bias=="number"?V=[k.bias,k.bias,k.bias,k.bias]:(V=[k.bias[0],k.bias[1],k.bias[2],0],k.bias[3]!==void 0&&(V[3]=k.bias[3]));let W=A*v,q=0,D=W,te=W*2,C=-1;E==="RGBA"?(q=0,D=W,te=W*2,C=W*3):E==="RGB"?(q=0,D=W,te=W*2):E==="RBG"&&(q=0,te=W,D=W*2);for(let j=0;j<A;j++)for(let Oe=0;Oe<v;Oe++){let fe=(c.data[q++]-V[0])*R[0],ge=(c.data[D++]-V[1])*R[1],Re=(c.data[te++]-V[2])*R[2],J=C===-1?255:(c.data[C++]-V[3])*R[3];T.fillStyle="rgba("+fe+","+ge+","+Re+","+J+")",T.fillRect(Oe,j,1,1)}if("toDataURL"in b)return b.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},gi=(c,m)=>{let b=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),T;if(b!=null){let v,A,E;(m==null?void 0:m.tensorLayout)!==void 0&&m.tensorLayout==="NHWC"?(v=c.dims[2],A=c.dims[1],E=c.dims[3]):(v=c.dims[3],A=c.dims[2],E=c.dims[1]);let k=m!==void 0&&m.format!==void 0?m.format:"RGB",R=m==null?void 0:m.norm,V,W;R===void 0||R.mean===void 0?V=[255,255,255,255]:typeof R.mean=="number"?V=[R.mean,R.mean,R.mean,R.mean]:(V=[R.mean[0],R.mean[1],R.mean[2],255],R.mean[3]!==void 0&&(V[3]=R.mean[3])),R===void 0||R.bias===void 0?W=[0,0,0,0]:typeof R.bias=="number"?W=[R.bias,R.bias,R.bias,R.bias]:(W=[R.bias[0],R.bias[1],R.bias[2],0],R.bias[3]!==void 0&&(W[3]=R.bias[3]));let q=A*v;if(m!==void 0&&(m.format!==void 0&&E===4&&m.format!=="RGBA"||E===3&&m.format!=="RGB"&&m.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let D=4,te=0,C=1,j=2,Oe=3,fe=0,ge=q,Re=q*2,J=-1;k==="RGBA"?(fe=0,ge=q,Re=q*2,J=q*3):k==="RGB"?(fe=0,ge=q,Re=q*2):k==="RBG"&&(fe=0,Re=q,ge=q*2),T=b.createImageData(v,A);for(let yt=0;yt<A*v;te+=D,C+=D,j+=D,Oe+=D,yt++)T.data[te]=(c.data[fe++]-W[0])*V[0],T.data[C]=(c.data[ge++]-W[1])*V[1],T.data[j]=(c.data[Re++]-W[2])*V[2],T.data[Oe]=J===-1?255:(c.data[J++]-W[3])*V[3]}else throw new Error("Can not access image data");return T}}),Ht,yi,wi,_i,bi,$i,rs=z(()=>{"use strict";fr(),Ht=(c,m)=>{if(c===void 0)throw new Error("Image buffer must be defined");if(m.height===void 0||m.width===void 0)throw new Error("Image height and width must be defined");if(m.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:b,width:T}=m,v=m.norm??{mean:255,bias:0},A,E;typeof v.mean=="number"?A=[v.mean,v.mean,v.mean,v.mean]:A=[v.mean[0],v.mean[1],v.mean[2],v.mean[3]??255],typeof v.bias=="number"?E=[v.bias,v.bias,v.bias,v.bias]:E=[v.bias[0],v.bias[1],v.bias[2],v.bias[3]??0];let k=m.format!==void 0?m.format:"RGBA",R=m.tensorFormat!==void 0&&m.tensorFormat!==void 0?m.tensorFormat:"RGB",V=b*T,W=R==="RGBA"?new Float32Array(V*4):new Float32Array(V*3),q=4,D=0,te=1,C=2,j=3,Oe=0,fe=V,ge=V*2,Re=-1;k==="RGB"&&(q=3,D=0,te=1,C=2,j=-1),R==="RGBA"?Re=V*3:R==="RBG"?(Oe=0,ge=V,fe=V*2):R==="BGR"&&(ge=0,fe=V,Oe=V*2);for(let J=0;J<V;J++,D+=q,C+=q,te+=q,j+=q)W[Oe++]=(c[D]+E[0])/A[0],W[fe++]=(c[te]+E[1])/A[1],W[ge++]=(c[C]+E[2])/A[2],Re!==-1&&j!==-1&&(W[Re++]=(c[j]+E[3])/A[3]);return R==="RGBA"?new Ce("float32",W,[1,4,b,T]):new Ce("float32",W,[1,3,b,T])},yi=async(c,m)=>{let b=typeof HTMLImageElement<"u"&&c instanceof HTMLImageElement,T=typeof ImageData<"u"&&c instanceof ImageData,v=typeof ImageBitmap<"u"&&c instanceof ImageBitmap,A=typeof c=="string",E,k=m??{},R=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},V=W=>typeof HTMLCanvasElement<"u"&&W instanceof HTMLCanvasElement||W instanceof OffscreenCanvas?W.getContext("2d"):null;if(b){let W=R();W.width=c.width,W.height=c.height;let q=V(W);if(q!=null){let D=c.height,te=c.width;if(m!==void 0&&m.resizedHeight!==void 0&&m.resizedWidth!==void 0&&(D=m.resizedHeight,te=m.resizedWidth),m!==void 0){if(k=m,m.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");k.tensorFormat="RGBA",k.height=D,k.width=te}else k.tensorFormat="RGBA",k.height=D,k.width=te;q.drawImage(c,0,0),E=q.getImageData(0,0,te,D).data}else throw new Error("Can not access image data")}else if(T){let W,q;if(m!==void 0&&m.resizedWidth!==void 0&&m.resizedHeight!==void 0?(W=m.resizedHeight,q=m.resizedWidth):(W=c.height,q=c.width),m!==void 0&&(k=m),k.format="RGBA",k.height=W,k.width=q,m!==void 0){let D=R();D.width=q,D.height=W;let te=V(D);if(te!=null)te.putImageData(c,0,0),E=te.getImageData(0,0,q,W).data;else throw new Error("Can not access image data")}else E=c.data}else if(v){if(m===void 0)throw new Error("Please provide image config with format for Imagebitmap");let W=R();W.width=c.width,W.height=c.height;let q=V(W);if(q!=null){let D=c.height,te=c.width;return q.drawImage(c,0,0,te,D),E=q.getImageData(0,0,te,D).data,k.height=D,k.width=te,Ht(E,k)}else throw new Error("Can not access image data")}else{if(A)return new Promise((W,q)=>{let D=R(),te=V(D);if(!c||!te)return q();let C=new Image;C.crossOrigin="Anonymous",C.src=c,C.onload=()=>{D.width=C.width,D.height=C.height,te.drawImage(C,0,0,D.width,D.height);let j=te.getImageData(0,0,D.width,D.height);k.height=D.height,k.width=D.width,W(Ht(j.data,k))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(E!==void 0)return Ht(E,k);throw new Error("Input data provided is not supported - aborted tensor creation")},wi=(c,m)=>{let{width:b,height:T,download:v,dispose:A}=m,E=[1,T,b,4];return new Ce({location:"texture",type:"float32",texture:c,dims:E,download:v,dispose:A})},_i=(c,m)=>{let{dataType:b,dims:T,download:v,dispose:A}=m;return new Ce({location:"gpu-buffer",type:b??"float32",gpuBuffer:c,dims:T,download:v,dispose:A})},bi=(c,m)=>{let{dataType:b,dims:T,download:v,dispose:A}=m;return new Ce({location:"ml-tensor",type:b??"float32",mlTensor:c,dims:T,download:v,dispose:A})},$i=(c,m,b)=>new Ce({location:"cpu-pinned",type:c,data:m,dims:b??[m.length]})}),at,Tt,hr,vi,is=z(()=>{"use strict";at=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Tt=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),hr=!1,vi=()=>{if(!hr){hr=!0;let c=typeof BigInt64Array<"u"&&BigInt64Array.from,m=typeof BigUint64Array<"u"&&BigUint64Array.from,b=globalThis.Float16Array,T=typeof b<"u"&&b.from;c&&(at.set("int64",BigInt64Array),Tt.set(BigInt64Array,"int64")),m&&(at.set("uint64",BigUint64Array),Tt.set(BigUint64Array,"uint64")),T?(at.set("float16",b),Tt.set(b,"float16")):at.set("float16",Uint16Array)}}}),xi,Si,as=z(()=>{"use strict";fr(),xi=c=>{let m=1;for(let b=0;b<c.length;b++){let T=c[b];if(typeof T!="number"||!Number.isSafeInteger(T))throw new TypeError(`dims[${b}] must be an integer, got: ${T}`);if(T<0)throw new RangeError(`dims[${b}] must be a non-negative integer, got: ${T}`);m*=T}return m},Si=(c,m)=>{switch(c.location){case"cpu":return new Ce(c.type,c.data,m);case"cpu-pinned":return new Ce({location:"cpu-pinned",data:c.data,type:c.type,dims:m});case"texture":return new Ce({location:"texture",texture:c.texture,type:c.type,dims:m});case"gpu-buffer":return new Ce({location:"gpu-buffer",gpuBuffer:c.gpuBuffer,type:c.type,dims:m});case"ml-tensor":return new Ce({location:"ml-tensor",mlTensor:c.mlTensor,type:c.type,dims:m});default:throw new Error(`tensorReshape: tensor location ${c.location} is not supported`)}}}),Ce,fr=z(()=>{"use strict";ts(),rs(),is(),as(),Ce=class{constructor(c,m,b){vi();let T,v;if(typeof c=="object"&&"location"in c)switch(this.dataLocation=c.location,T=c.type,v=c.dims,c.location){case"cpu-pinned":{let E=at.get(T);if(!E)throw new TypeError(`unsupported type "${T}" to create tensor from pinned buffer`);if(!(c.data instanceof E))throw new TypeError(`buffer should be of type ${E.name}`);this.cpuData=c.data;break}case"texture":{if(T!=="float32")throw new TypeError(`unsupported type "${T}" to create tensor from texture`);this.gpuTextureData=c.texture,this.downloader=c.download,this.disposer=c.dispose;break}case"gpu-buffer":{if(T!=="float32"&&T!=="float16"&&T!=="int32"&&T!=="int64"&&T!=="uint32"&&T!=="uint8"&&T!=="bool"&&T!=="uint4"&&T!=="int4")throw new TypeError(`unsupported type "${T}" to create tensor from gpu buffer`);this.gpuBufferData=c.gpuBuffer,this.downloader=c.download,this.disposer=c.dispose;break}case"ml-tensor":{if(T!=="float32"&&T!=="float16"&&T!=="int32"&&T!=="int64"&&T!=="uint32"&&T!=="uint64"&&T!=="int8"&&T!=="uint8"&&T!=="bool"&&T!=="uint4"&&T!=="int4")throw new TypeError(`unsupported type "${T}" to create tensor from MLTensor`);this.mlTensorData=c.mlTensor,this.downloader=c.download,this.disposer=c.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let E,k;if(typeof c=="string")if(T=c,k=b,c==="string"){if(!Array.isArray(m))throw new TypeError("A string tensor's data must be a string array.");E=m}else{let R=at.get(c);if(R===void 0)throw new TypeError(`Unsupported tensor type: ${c}.`);if(Array.isArray(m)){if(c==="float16"&&R===Uint16Array||c==="uint4"||c==="int4")throw new TypeError(`Creating a ${c} tensor from number array is not supported. Please use ${R.name} as data.`);c==="uint64"||c==="int64"?E=R.from(m,BigInt):E=R.from(m)}else if(m instanceof R)E=m;else if(m instanceof Uint8ClampedArray)if(c==="uint8")E=Uint8Array.from(m);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(c==="float16"&&m instanceof Uint16Array&&R!==Uint16Array)E=new globalThis.Float16Array(m.buffer,m.byteOffset,m.length);else throw new TypeError(`A ${T} tensor's data must be type of ${R}`)}else if(k=m,Array.isArray(c)){if(c.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let R=typeof c[0];if(R==="string")T="string",E=c;else if(R==="boolean")T="bool",E=Uint8Array.from(c);else throw new TypeError(`Invalid element type of data array: ${R}.`)}else if(c instanceof Uint8ClampedArray)T="uint8",E=Uint8Array.from(c);else{let R=Tt.get(c.constructor);if(R===void 0)throw new TypeError(`Unsupported type for tensor data: ${c.constructor}.`);T=R,E=c}if(k===void 0)k=[E.length];else if(!Array.isArray(k))throw new TypeError("A tensor's dims must be a number array");v=k,this.cpuData=E,this.dataLocation="cpu"}let A=xi(v);if(this.cpuData&&A!==this.cpuData.length&&!((T==="uint4"||T==="int4")&&Math.ceil(A/2)===this.cpuData.length))throw new Error(`Tensor's size(${A}) does not match data length(${this.cpuData.length}).`);this.type=T,this.dims=v,this.size=A}static async fromImage(c,m){return yi(c,m)}static fromTexture(c,m){return wi(c,m)}static fromGpuBuffer(c,m){return _i(c,m)}static fromMLTensor(c,m){return bi(c,m)}static fromPinnedBuffer(c,m,b){return $i(c,m,b)}toDataURL(c){return mi(this,c)}toImageData(c){return gi(this,c)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(c){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let m=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=m,c&&this.disposer&&(this.disposer(),this.disposer=void 0),m}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(c){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Si(this,c)}}}),De,Ti=z(()=>{"use strict";fr(),De=Ce}),Lt,mr,He,Fe,Je,et,Ei=z(()=>{"use strict";fi(),Lt=(c,m)=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.timeStamp(`${c}::ORT::${m}`)},mr=(c,m)=>{var v;let b=((v=new Error().stack)==null?void 0:v.split(/\r\n|\r|\n/g))||[],T=!1;for(let A=0;A<b.length;A++){if(T&&!b[A].includes("TRACE_FUNC")){let E=`FUNC_${c}::${b[A].trim().split(" ")[1]}`;m&&(E+=`::${m}`),Lt("CPU",E);return}b[A].includes("TRACE_FUNC")&&(T=!0)}},He=c=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||mr("BEGIN",c)},Fe=c=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||mr("END",c)},Je=c=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.time(`ORT::${c}`)},et=c=>{(typeof xe.trace>"u"?!xe.wasm.trace:!xe.trace)||console.timeEnd(`ORT::${c}`)}}),ki,ss=z(()=>{"use strict";Ie(),Ti(),Ei(),ki=class Oc{constructor(m){this.handler=m}async run(m,b,T){He(),Je("InferenceSession.run");let v={},A={};if(typeof m!="object"||m===null||m instanceof De||Array.isArray(m))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let E=!0;if(typeof b=="object"){if(b===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(b instanceof De)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(b)){if(b.length===0)throw new TypeError("'fetches' cannot be an empty array.");E=!1;for(let V of b){if(typeof V!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(V)===-1)throw new RangeError(`'fetches' contains invalid output name: ${V}.`);v[V]=null}if(typeof T=="object"&&T!==null)A=T;else if(typeof T<"u")throw new TypeError("'options' must be an object.")}else{let V=!1,W=Object.getOwnPropertyNames(b);for(let q of this.outputNames)if(W.indexOf(q)!==-1){let D=b[q];(D===null||D instanceof De)&&(V=!0,E=!1,v[q]=D)}if(V){if(typeof T=="object"&&T!==null)A=T;else if(typeof T<"u")throw new TypeError("'options' must be an object.")}else A=b}}else if(typeof b<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let V of this.inputNames)if(typeof m[V]>"u")throw new Error(`input '${V}' is missing in 'feeds'.`);if(E)for(let V of this.outputNames)v[V]=null;let k=await this.handler.run(m,v,A),R={};for(let V in k)if(Object.hasOwnProperty.call(k,V)){let W=k[V];W instanceof De?R[V]=W:R[V]=new De(W.type,W.data,W.dims)}return et("InferenceSession.run"),Fe(),R}async release(){return this.handler.dispose()}static async create(m,b,T,v){He(),Je("InferenceSession.create");let A,E={};if(typeof m=="string"){if(A=m,typeof b=="object"&&b!==null)E=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(m instanceof Uint8Array){if(A=m,typeof b=="object"&&b!==null)E=b;else if(typeof b<"u")throw new TypeError("'options' must be an object.")}else if(m instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&m instanceof SharedArrayBuffer){let W=m,q=0,D=m.byteLength;if(typeof b=="object"&&b!==null)E=b;else if(typeof b=="number"){if(q=b,!Number.isSafeInteger(q))throw new RangeError("'byteOffset' must be an integer.");if(q<0||q>=W.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${W.byteLength}).`);if(D=m.byteLength-q,typeof T=="number"){if(D=T,!Number.isSafeInteger(D))throw new RangeError("'byteLength' must be an integer.");if(D<=0||q+D>W.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${W.byteLength-q}].`);if(typeof v=="object"&&v!==null)E=v;else if(typeof v<"u")throw new TypeError("'options' must be an object.")}else if(typeof T<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof b<"u")throw new TypeError("'options' must be an object.");A=new Uint8Array(W,q,D)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[k,R]=await $t(E),V=await k.createInferenceSessionHandler(A,R);return et("InferenceSession.create"),Fe(),new Oc(V)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),gr,ns=z(()=>{"use strict";ss(),gr=ki}),os=z(()=>{"use strict"}),us=z(()=>{"use strict"}),ls=z(()=>{"use strict"}),ds=z(()=>{"use strict"}),Ii={};se(Ii,{InferenceSession:()=>gr,TRACE:()=>Lt,TRACE_EVENT_BEGIN:()=>Je,TRACE_EVENT_END:()=>et,TRACE_FUNC_BEGIN:()=>He,TRACE_FUNC_END:()=>Fe,Tensor:()=>De,env:()=>he,registerBackend:()=>be});var We=z(()=>{"use strict";ut(),es(),ns(),Ti(),os(),us(),Ei(),ls(),ds()}),yr=z(()=>{"use strict"}),zi={};se(zi,{default:()=>Ci});var wr,_r,Ci,ps=z(()=>{"use strict";var c;Zi(),lt(),Sr(),wr="ort-wasm-proxy-worker",_r=((c=globalThis.self)==null?void 0:c.name)===wr,_r&&(self.onmessage=m=>{let{type:b,in:T}=m.data;try{switch(b){case"init-wasm":kr(T.wasm).then(()=>{Xr(T).then(()=>{postMessage({type:b})},v=>{postMessage({type:b,err:v})})},v=>{postMessage({type:b,err:v})});break;case"init-ep":{let{epName:v,env:A}=T;Yr(A,v).then(()=>{postMessage({type:b})},E=>{postMessage({type:b,err:E})});break}case"copy-from":{let{buffer:v}=T,A=_e(v);postMessage({type:b,out:A});break}case"create":{let{model:v,options:A}=T;gt(v,A).then(E=>{postMessage({type:b,out:E})},E=>{postMessage({type:b,err:E})});break}case"release":ti(T),postMessage({type:b});break;case"run":{let{sessionId:v,inputIndices:A,inputs:E,outputIndices:k,options:R}=T;P(v,A,E,k,new Array(k.length).fill(null),R).then(V=>{V.some(W=>W[3]!=="cpu")?postMessage({type:b,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:b,out:V},ri([...E,...V]))},V=>{postMessage({type:b,err:V})});break}case"end-profiling":tr(T),postMessage({type:b});break;default:}}catch(v){postMessage({type:b,err:v})}}),Ci=_r?null:m=>new Worker(m??Ae,{type:"classic",name:wr})}),Ai,Oi,Ae,br,Kt,Ri,Bi,$r,Mi,vr,Di,xr,Pi,Sr=z(()=>{"use strict";yr(),Ai=typeof location>"u"?void 0:location.origin,Oi=()=>{var c,m;return typeof document<"u"?(c=document.currentScript)==null?void 0:c.src:typeof self<"u"?(m=self.location)==null?void 0:m.href:void 0},Ae=Oi(),br=()=>{if(Ae&&!Ae.startsWith("blob:"))return Ae.substring(0,Ae.lastIndexOf("/")+1)},Kt=(c,m)=>{try{let b=m??Ae;return(b?new URL(c,b):new URL(c)).origin===Ai}catch{return!1}},Ri=(c,m)=>{let b=m??Ae;try{return(b?new URL(c,b):new URL(c)).href}catch{return}},Bi=(c,m)=>`${m??"./"}${c}`,$r=async c=>{let m=await(await fetch(c,{credentials:"same-origin"})).blob();return URL.createObjectURL(m)},Mi=async c=>(await import(c)).default,vr=(ps(),ee(zi)).default,Di=async()=>{if(!Ae)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Kt(Ae))return[void 0,vr()];let c=await $r(Ae);return[c,vr(c)]},xr=void 0,Pi=async(c,m,b,T)=>{let v=xr&&!(c||m);if(v)if(Ae)v=Kt(Ae)||T&&!b;else if(T&&!b)v=!0;else throw new Error("cannot determine the script source URL.");if(v)return[void 0,xr];{let A="ort-wasm-simd-threaded.mjs",E=c??Ri(A,m),k=b&&E&&!Kt(E,m),R=k?await $r(E):E??Bi(A,m);return[k?R:void 0,await Mi(R)]}}}),Tr,Zt,Et,Er,Ui,Ni,Li,kr,pe,lt=z(()=>{"use strict";Sr(),Zt=!1,Et=!1,Er=!1,Ui=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Ni=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Li=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},kr=async c=>{if(Zt)return Promise.resolve();if(Et)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Er)throw new Error("previous call to 'initializeWebAssembly()' failed.");Et=!0;let m=c.initTimeout,b=c.numThreads;if(c.simd!==!1){if(c.simd==="relaxed"){if(!Li())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Ni())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let T=Ui();b>1&&!T&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+b+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),c.numThreads=b=1);let v=c.wasmPaths,A=typeof v=="string"?v:void 0,E=v==null?void 0:v.mjs,k=(E==null?void 0:E.href)??E,R=v==null?void 0:v.wasm,V=(R==null?void 0:R.href)??R,W=c.wasmBinary,[q,D]=await Pi(k,A,b>1,!!W||!!V),te=!1,C=[];if(m>0&&C.push(new Promise(j=>{setTimeout(()=>{te=!0,j()},m)})),C.push(new Promise((j,Oe)=>{let fe={numThreads:b};if(W)fe.wasmBinary=W,fe.locateFile=ge=>ge;else if(V||A)fe.locateFile=ge=>V??A+ge;else if(k&&k.indexOf("blob:")!==0)fe.locateFile=ge=>new URL(ge,k).href;else if(q){let ge=br();ge&&(fe.locateFile=Re=>ge+Re)}D(fe).then(ge=>{Et=!1,Zt=!0,Tr=ge,j(),q&&URL.revokeObjectURL(q)},ge=>{Et=!1,Er=!0,Oe(ge)})})),await Promise.race(C),te)throw new Error(`WebAssembly backend initializing failed due to timeout: ${m}ms`)},pe=()=>{if(Zt&&Tr)return Tr;throw new Error("WebAssembly is not initialized yet.")}}),Pe,Qt,ue,Ir=z(()=>{"use strict";lt(),Pe=(c,m)=>{let b=pe(),T=b.lengthBytesUTF8(c)+1,v=b._malloc(T);return b.stringToUTF8(c,v,T),m.push(v),v},Qt=(c,m,b,T)=>{if(typeof c=="object"&&c!==null){if(b.has(c))throw new Error("Circular reference in options");b.add(c)}Object.entries(c).forEach(([v,A])=>{let E=m?m+v:v;if(typeof A=="object")Qt(A,E+".",b,T);else if(typeof A=="string"||typeof A=="number")T(E,A.toString());else if(typeof A=="boolean")T(E,A?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof A}`)})},ue=c=>{let m=pe(),b=m.stackSave();try{let T=m.PTR_SIZE,v=m.stackAlloc(2*T);m._OrtGetLastError(v,v+T);let A=Number(m.getValue(v,T===4?"i32":"i64")),E=m.getValue(v+T,"*"),k=E?m.UTF8ToString(E):"";throw new Error(`${c} ERROR_CODE: ${A}, ERROR_MESSAGE: ${k}`)}finally{m.stackRestore(b)}}}),qi,cs=z(()=>{"use strict";lt(),Ir(),qi=c=>{let m=pe(),b=0,T=[],v=c||{};try{if((c==null?void 0:c.logSeverityLevel)===void 0)v.logSeverityLevel=2;else if(typeof c.logSeverityLevel!="number"||!Number.isInteger(c.logSeverityLevel)||c.logSeverityLevel<0||c.logSeverityLevel>4)throw new Error(`log severity level is not valid: ${c.logSeverityLevel}`);if((c==null?void 0:c.logVerbosityLevel)===void 0)v.logVerbosityLevel=0;else if(typeof c.logVerbosityLevel!="number"||!Number.isInteger(c.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${c.logVerbosityLevel}`);(c==null?void 0:c.terminate)===void 0&&(v.terminate=!1);let A=0;return(c==null?void 0:c.tag)!==void 0&&(A=Pe(c.tag,T)),b=m._OrtCreateRunOptions(v.logSeverityLevel,v.logVerbosityLevel,!!v.terminate,A),b===0&&ue("Can't create run options."),(c==null?void 0:c.extra)!==void 0&&Qt(c.extra,"",new WeakSet,(E,k)=>{let R=Pe(E,T),V=Pe(k,T);m._OrtAddRunConfigEntry(b,R,V)!==0&&ue(`Can't set a run config entry: ${E} - ${k}.`)}),[b,T]}catch(A){throw b!==0&&m._OrtReleaseRunOptions(b),T.forEach(E=>m._free(E)),A}}}),Vi,Fi,Wi,st,Gi,ji,hs=z(()=>{"use strict";lt(),Ir(),Vi=c=>{switch(c){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"layout":return 3;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${c}`)}},Fi=c=>{switch(c){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${c}`)}},Wi=c=>{c.extra||(c.extra={}),c.extra.session||(c.extra.session={});let m=c.extra.session;m.use_ort_model_bytes_directly||(m.use_ort_model_bytes_directly="1"),c.executionProviders&&c.executionProviders.some(b=>(typeof b=="string"?b:b.name)==="webgpu")&&(c.enableMemPattern=!1)},st=(c,m,b,T)=>{let v=Pe(m,T),A=Pe(b,T);pe()._OrtAddSessionConfigEntry(c,v,A)!==0&&ue(`Can't set a session config entry: ${m} - ${b}.`)},Gi=async(c,m,b)=>{let T=m.executionProviders;for(let v of T){let A=typeof v=="string"?v:v.name,E=[];switch(A){case"webnn":if(A="WEBNN",st(c,"session.disable_quant_qdq","1",b),st(c,"session.disable_qdq_constant_folding","1",b),typeof v!="string"){let q=v==null?void 0:v.deviceType;q&&st(c,"deviceType",q,b)}break;case"webgpu":if(A="JS",typeof v!="string"){let q=v;if(q!=null&&q.preferredLayout){if(q.preferredLayout!=="NCHW"&&q.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${q.preferredLayout}`);st(c,"preferredLayout",q.preferredLayout,b)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${A}`)}let k=Pe(A,b),R=E.length,V=0,W=0;if(R>0){V=pe()._malloc(R*pe().PTR_SIZE),b.push(V),W=pe()._malloc(R*pe().PTR_SIZE),b.push(W);for(let q=0;q<R;q++)pe().setValue(V+q*pe().PTR_SIZE,E[q][0],"*"),pe().setValue(W+q*pe().PTR_SIZE,E[q][1],"*")}await pe()._OrtAppendExecutionProvider(c,k,V,W,R)!==0&&ue(`Can't append execution provider: ${A}.`)}},ji=async c=>{let m=pe(),b=0,T=[],v=c||{};Wi(v);try{let A=Vi(v.graphOptimizationLevel??"all"),E=Fi(v.executionMode??"sequential"),k=typeof v.logId=="string"?Pe(v.logId,T):0,R=v.logSeverityLevel??2;if(!Number.isInteger(R)||R<0||R>4)throw new Error(`log severity level is not valid: ${R}`);let V=v.logVerbosityLevel??0;if(!Number.isInteger(V)||V<0||V>4)throw new Error(`log verbosity level is not valid: ${V}`);let W=typeof v.optimizedModelFilePath=="string"?Pe(v.optimizedModelFilePath,T):0;if(b=m._OrtCreateSessionOptions(A,!!v.enableCpuMemArena,!!v.enableMemPattern,E,!!v.enableProfiling,0,k,R,V,W),b===0&&ue("Can't create session options."),v.executionProviders&&await Gi(b,v,T),v.enableGraphCapture!==void 0){if(typeof v.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${v.enableGraphCapture}`);st(b,"enableGraphCapture",v.enableGraphCapture.toString(),T)}if(v.freeDimensionOverrides)for(let[q,D]of Object.entries(v.freeDimensionOverrides)){if(typeof q!="string")throw new Error(`free dimension override name must be a string: ${q}`);if(typeof D!="number"||!Number.isInteger(D)||D<0)throw new Error(`free dimension override value must be a non-negative integer: ${D}`);let te=Pe(q,T);m._OrtAddFreeDimensionOverride(b,te,D)!==0&&ue(`Can't set a free dimension override: ${q} - ${D}.`)}return v.extra!==void 0&&Qt(v.extra,"",new WeakSet,(q,D)=>{st(b,q,D,T)}),[b,T]}catch(A){throw b!==0&&m._OrtReleaseSessionOptions(b)!==0&&ue("Can't release session options."),T.forEach(E=>m._free(E)),A}}}),dt,pt,ct,zr,Cr,Ar,Or,Qr,de=z(()=>{"use strict";dt=c=>{switch(c){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${c}`)}},pt=c=>{switch(c){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${c}`)}},ct=(c,m)=>{let b=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][c],T=typeof m=="number"?m:m.reduce((v,A)=>v*A,1);return b>0?Math.ceil(T*b):void 0},zr=c=>{switch(c){case"float16":return typeof Float16Array<"u"?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${c}`)}},Cr=c=>{switch(c){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${c}`)}},Ar=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",Or=c=>c==="float32"||c==="float16"||c==="int32"||c==="int64"||c==="uint32"||c==="uint64"||c==="int8"||c==="uint8"||c==="bool"||c==="uint4"||c==="int4",Qr=c=>{switch(c){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${c}`)}}}),Rr,Hi=z(()=>{"use strict";yr(),Rr=async c=>{if(typeof c=="string"){let m=await fetch(c);if(!m.ok)throw new Error(`failed to load external data file: ${c}`);let b=m.headers.get("Content-Length"),T=b?parseInt(b,10):0;if(T<1073741824)return new Uint8Array(await m.arrayBuffer());{if(!m.body)throw new Error(`failed to load external data file: ${c}, no response body.`);let v=m.body.getReader(),A;try{A=new ArrayBuffer(T)}catch(k){if(k instanceof RangeError){let R=Math.ceil(T/65536);A=new WebAssembly.Memory({initial:R,maximum:R}).buffer}else throw k}let E=0;for(;;){let{done:k,value:R}=await v.read();if(k)break;let V=R.byteLength;new Uint8Array(A,E,V).set(R),E+=V}return new Uint8Array(A,0,T)}}else return c instanceof Blob?new Uint8Array(await c.arrayBuffer()):c instanceof Uint8Array?c:new Uint8Array(c)}}),Ki,Xr,Yr,qt,Jr,ei,_e,gt,ti,Vt,P,tr,ri,Zi=z(()=>{"use strict";We(),cs(),hs(),de(),lt(),Ir(),Hi(),Ki=(c,m)=>{pe()._OrtInit(c,m)!==0&&ue("Can't initialize onnxruntime.")},Xr=async c=>{Ki(c.wasm.numThreads,Cr(c.logLevel))},Yr=async(c,m)=>{var T,v;(v=(T=pe()).asyncInit)==null||v.call(T);let b=c.webgpu.adapter;if(m==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");if(b){if(typeof b.limits!="object"||typeof b.features!="object"||typeof b.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let A=c.webgpu.powerPreference;if(A!==void 0&&A!=="low-power"&&A!=="high-performance")throw new Error(`Invalid powerPreference setting: "${A}"`);let E=c.webgpu.forceFallbackAdapter;if(E!==void 0&&typeof E!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${E}"`);if(b=await navigator.gpu.requestAdapter({powerPreference:A,forceFallbackAdapter:E}),!b)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}}if(m==="webnn"&&(typeof navigator>"u"||!navigator.ml))throw new Error("WebNN is not supported in current environment")},qt=new Map,Jr=c=>{let m=pe(),b=m.stackSave();try{let T=m.PTR_SIZE,v=m.stackAlloc(2*T);m._OrtGetInputOutputCount(c,v,v+T)!==0&&ue("Can't get session input/output count.");let A=T===4?"i32":"i64";return[Number(m.getValue(v,A)),Number(m.getValue(v+T,A))]}finally{m.stackRestore(b)}},ei=(c,m)=>{let b=pe(),T=b.stackSave(),v=0;try{let A=b.PTR_SIZE,E=b.stackAlloc(2*A);b._OrtGetInputOutputMetadata(c,m,E,E+A)!==0&&ue("Can't get session input/output metadata.");let k=Number(b.getValue(E,"*"));v=Number(b.getValue(E+A,"*"));let R=b.HEAP32[v/4];if(R===0)return[k,0];let V=b.HEAPU32[v/4+1],W=[];for(let q=0;q<V;q++){let D=Number(b.getValue(v+8+q*A,"*"));W.push(D!==0?b.UTF8ToString(D):Number(b.getValue(v+8+(q+V)*A,"*")))}return[k,R,W]}finally{b.stackRestore(T),v!==0&&b._OrtFree(v)}},_e=c=>{let m=pe(),b=m._malloc(c.byteLength);if(b===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${c.byteLength}.`);return m.HEAPU8.set(c,b),[b,c.byteLength]},gt=async(c,m)=>{var q,D,te;let b,T,v=pe();Array.isArray(c)?[b,T]=c:c.buffer===v.HEAPU8.buffer?[b,T]=[c.byteOffset,c.byteLength]:[b,T]=_e(c);let A=0,E=0,k=0,R=[],V=[],W=[];try{if([E,R]=await ji(m),(m==null?void 0:m.externalData)&&v.mountExternalData){let Be=[];for(let Te of m.externalData){let Ke=typeof Te=="string"?Te:Te.path;Be.push(Rr(typeof Te=="string"?Te:Te.data).then(ht=>{v.mountExternalData(Ke,ht)}))}await Promise.all(Be)}for(let Be of(m==null?void 0:m.executionProviders)??[])if((typeof Be=="string"?Be:Be.name)==="webnn"){if(v.shouldTransferToMLTensor=!1,typeof Be!="string"){let Te=Be,Ke=Te==null?void 0:Te.context,ht=Te==null?void 0:Te.gpuDevice,tt=Te==null?void 0:Te.deviceType,Ze=Te==null?void 0:Te.powerPreference;Ke?v.currentContext=Ke:ht?v.currentContext=await v.webnnCreateMLContext(ht):v.currentContext=await v.webnnCreateMLContext({deviceType:tt,powerPreference:Ze})}else v.currentContext=await v.webnnCreateMLContext();break}A=await v._OrtCreateSession(b,T,E),(q=v.webgpuOnCreateSession)==null||q.call(v,A),A===0&&ue("Can't create a session."),(D=v.jsepOnCreateSession)==null||D.call(v),v.currentContext&&(v.webnnRegisterMLContext(A,v.currentContext),v.currentContext=void 0,v.shouldTransferToMLTensor=!0);let[C,j]=Jr(A),Oe=!!(m!=null&&m.enableGraphCapture),fe=[],ge=[],Re=[],J=[],yt=[];for(let Be=0;Be<C;Be++){let[Te,Ke,ht]=ei(A,Be);Te===0&&ue("Can't get an input name."),V.push(Te);let tt=v.UTF8ToString(Te);fe.push(tt),Re.push(Ke===0?{name:tt,isTensor:!1}:{name:tt,isTensor:!0,type:pt(Ke),shape:ht})}for(let Be=0;Be<j;Be++){let[Te,Ke,ht]=ei(A,Be+C);Te===0&&ue("Can't get an output name."),W.push(Te);let tt=v.UTF8ToString(Te);ge.push(tt),J.push(Ke===0?{name:tt,isTensor:!1}:{name:tt,isTensor:!0,type:pt(Ke),shape:ht})}return qt.set(A,[A,V,W,null,Oe,!1]),[A,fe,ge,Re,J]}catch(C){throw V.forEach(j=>v._OrtFree(j)),W.forEach(j=>v._OrtFree(j)),k!==0&&v._OrtReleaseBinding(k)!==0&&ue("Can't release IO binding."),A!==0&&v._OrtReleaseSession(A)!==0&&ue("Can't release session."),C}finally{v._free(b),E!==0&&v._OrtReleaseSessionOptions(E)!==0&&ue("Can't release session options."),R.forEach(C=>v._free(C)),(te=v.unmountExternalData)==null||te.call(v)}},ti=c=>{var R,V,W;let m=pe(),b=qt.get(c);if(!b)throw new Error(`cannot release session. invalid session id: ${c}`);let[T,v,A,E,k]=b;E&&(k&&m._OrtClearBoundOutputs(E.handle)!==0&&ue("Can't clear bound outputs."),m._OrtReleaseBinding(E.handle)!==0&&ue("Can't release IO binding.")),(R=m.jsepOnReleaseSession)==null||R.call(m,c),(V=m.webnnOnReleaseSession)==null||V.call(m,c),(W=m.webgpuOnReleaseSession)==null||W.call(m,c),v.forEach(q=>m._OrtFree(q)),A.forEach(q=>m._OrtFree(q)),m._OrtReleaseSession(T)!==0&&ue("Can't release session."),qt.delete(c)},Vt=async(c,m,b,T,v,A,E=!1)=>{if(!c){m.push(0);return}let k=pe(),R=k.PTR_SIZE,V=c[0],W=c[1],q=c[3],D=q,te,C;if(V==="string"&&(q==="gpu-buffer"||q==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(E&&q!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${A} when enableGraphCapture is true.`);if(q==="gpu-buffer"){let fe=c[2].gpuBuffer;C=ct(dt(V),W);{let ge=k.jsepRegisterBuffer;if(!ge)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');te=ge(T,A,fe,C)}}else if(q==="ml-tensor"){let fe=c[2].mlTensor;C=ct(dt(V),W);let ge=k.webnnRegisterMLTensor;if(!ge)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');te=ge(T,fe,dt(V),W)}else{let fe=c[2];if(Array.isArray(fe)){C=R*fe.length,te=k._malloc(C),b.push(te);for(let ge=0;ge<fe.length;ge++){if(typeof fe[ge]!="string")throw new TypeError(`tensor data at index ${ge} is not a string`);k.setValue(te+ge*R,Pe(fe[ge],b),"*")}}else{let ge=k.webnnIsGraphInput,Re=k.webnnIsGraphOutput;if(V!=="string"&&ge&&Re){let J=k.UTF8ToString(v);if(ge(T,J)||Re(T,J)){let yt=dt(V);C=ct(yt,W),D="ml-tensor";let Be=k.webnnCreateTemporaryTensor,Te=k.webnnUploadTensor;if(!Be||!Te)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let Ke=await Be(T,yt,W);Te(Ke,new Uint8Array(fe.buffer,fe.byteOffset,fe.byteLength)),te=Ke}else C=fe.byteLength,te=k._malloc(C),b.push(te),k.HEAPU8.set(new Uint8Array(fe.buffer,fe.byteOffset,C),te)}else C=fe.byteLength,te=k._malloc(C),b.push(te),k.HEAPU8.set(new Uint8Array(fe.buffer,fe.byteOffset,C),te)}}let j=k.stackSave(),Oe=k.stackAlloc(4*W.length);try{W.forEach((ge,Re)=>k.setValue(Oe+Re*R,ge,R===4?"i32":"i64"));let fe=k._OrtCreateTensor(dt(V),te,C,Oe,W.length,Qr(D));fe===0&&ue(`Can't create tensor for input/output. session=${T}, index=${A}.`),m.push(fe)}finally{k.stackRestore(j)}},P=async(c,m,b,T,v,A)=>{var ia,aa,zt;let E=pe(),k=E.PTR_SIZE,R=qt.get(c);if(!R)throw new Error(`cannot run inference. invalid session id: ${c}`);let V=R[0],W=R[1],q=R[2],D=R[3],te=R[4],C=R[5],j=m.length,Oe=T.length,fe=0,ge=[],Re=[],J=[],yt=[],Be=[],Te=E.stackSave(),Ke=E.stackAlloc(j*k),ht=E.stackAlloc(j*k),tt=E.stackAlloc(Oe*k),Ze=E.stackAlloc(Oe*k);try{[fe,ge]=qi(A),Je("wasm prepareInputOutputTensor");for(let $e=0;$e<j;$e++)await Vt(b[$e],Re,yt,c,W[m[$e]],m[$e],te);for(let $e=0;$e<Oe;$e++)await Vt(v[$e],J,yt,c,q[T[$e]],j+T[$e],te);et("wasm prepareInputOutputTensor");for(let $e=0;$e<j;$e++)E.setValue(Ke+$e*k,Re[$e],"*"),E.setValue(ht+$e*k,W[m[$e]],"*");for(let $e=0;$e<Oe;$e++)E.setValue(tt+$e*k,J[$e],"*"),E.setValue(Ze+$e*k,q[T[$e]],"*");(ia=E.jsepOnRunStart)==null||ia.call(E,V),(aa=E.webnnOnRunStart)==null||aa.call(E,V);let wt;wt=await E._OrtRun(V,ht,Ke,j,Ze,Oe,tt,fe),wt!==0&&ue("failed to call OrtRun().");let vt=[],sa=[];Je("wasm ProcessOutputTensor");for(let $e=0;$e<Oe;$e++){let _t=Number(E.getValue(tt+$e*k,"*"));if(_t===J[$e]||Be.includes(J[$e])){vt.push(v[$e]),_t!==J[$e]&&E._OrtReleaseTensor(_t)!==0&&ue("Can't release tensor.");continue}let Ea=E.stackSave(),Ct=E.stackAlloc(4*k),Pr=!1,Ue,rt=0;try{E._OrtGetTensorData(_t,Ct,Ct+k,Ct+2*k,Ct+3*k)!==0&&ue(`Can't access output tensor data on index ${$e}.`);let nt=k===4?"i32":"i64",Ur=Number(E.getValue(Ct,nt));rt=E.getValue(Ct+k,"*");let na=E.getValue(Ct+k*2,"*"),ka=Number(E.getValue(Ct+k*3,nt)),At=[];for(let Ne=0;Ne<ka;Ne++)At.push(Number(E.getValue(na+Ne*k,nt)));E._OrtFree(na)!==0&&ue("Can't free memory for tensor dims.");let Ot=At.reduce((Ne,Me)=>Ne*Me,1);Ue=pt(Ur);let sr=D==null?void 0:D.outputPreferredLocations[T[$e]];if(Ue==="string"){if(sr==="gpu-buffer"||sr==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let Ne=[];for(let Me=0;Me<Ot;Me++){let xt=E.getValue(rt+Me*k,"*"),Ia=E.getValue(rt+(Me+1)*k,"*"),ms=Me===Ot-1?void 0:Ia-xt;Ne.push(E.UTF8ToString(xt,ms))}vt.push([Ue,At,Ne,"cpu"])}else if(sr==="gpu-buffer"&&Ot>0){let Ne=E.jsepGetBuffer;if(!Ne)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let Me=Ne(rt),xt=ct(Ur,Ot);if(xt===void 0||!Ar(Ue))throw new Error(`Unsupported data type: ${Ue}`);Pr=!0,vt.push([Ue,At,{gpuBuffer:Me,download:E.jsepCreateDownloader(Me,xt,Ue),dispose:()=>{E._OrtReleaseTensor(_t)!==0&&ue("Can't release tensor.")}},"gpu-buffer"])}else if(sr==="ml-tensor"&&Ot>0){let Ne=E.webnnEnsureTensor,Me=E.webnnIsGraphInputOutputTypeSupported;if(!Ne||!Me)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(ct(Ur,Ot)===void 0||!Or(Ue))throw new Error(`Unsupported data type: ${Ue}`);if(!Me(c,Ue,!1))throw new Error(`preferredLocation "ml-tensor" for ${Ue} output is not supported by current WebNN Context.`);let xt=await Ne(c,rt,Ur,At,!1);Pr=!0,vt.push([Ue,At,{mlTensor:xt,download:E.webnnCreateMLTensorDownloader(rt,Ue),dispose:()=>{E.webnnReleaseTensorId(rt),E._OrtReleaseTensor(_t)}},"ml-tensor"])}else if(sr==="ml-tensor-cpu-output"&&Ot>0){let Ne=E.webnnCreateMLTensorDownloader(rt,Ue)(),Me=vt.length;Pr=!0,sa.push((async()=>{let xt=[Me,await Ne];return E.webnnReleaseTensorId(rt),E._OrtReleaseTensor(_t),xt})()),vt.push([Ue,At,[],"cpu"])}else{let Ne=zr(Ue),Me=new Ne(Ot);new Uint8Array(Me.buffer,Me.byteOffset,Me.byteLength).set(E.HEAPU8.subarray(rt,rt+Me.byteLength)),vt.push([Ue,At,Me,"cpu"])}}finally{E.stackRestore(Ea),Ue==="string"&&rt&&E._free(rt),Pr||E._OrtReleaseTensor(_t)}}D&&!te&&(E._OrtClearBoundOutputs(D.handle)!==0&&ue("Can't clear bound outputs."),qt.set(c,[V,W,q,D,te,!1]));for(let[$e,_t]of await Promise.all(sa))vt[$e][2]=_t;return et("wasm ProcessOutputTensor"),vt}finally{(zt=E.webnnOnRunEnd)==null||zt.call(E,V),E.stackRestore(Te),Re.forEach(wt=>E._OrtReleaseTensor(wt)),J.forEach(wt=>E._OrtReleaseTensor(wt)),yt.forEach(wt=>E._free(wt)),fe!==0&&E._OrtReleaseRunOptions(fe),ge.forEach(wt=>E._free(wt))}},tr=c=>{let m=pe(),b=qt.get(c);if(!b)throw new Error("invalid session id");let T=b[0],v=m._OrtEndProfiling(T);v===0&&ue("Can't get an profile file name."),m._OrtFree(v)},ri=c=>{let m=[];for(let b of c){let T=b[2];!Array.isArray(T)&&"buffer"in T&&m.push(T.buffer)}return m}}),kt,ne,Ft,rr,Xt,ir,Br,Mr,It,Wt,ii,ai,si,Qi,Xi,Sa,ar,Yi,Ji=z(()=>{"use strict";We(),Zi(),lt(),Sr(),kt=()=>!!he.wasm.proxy&&typeof document<"u",Ft=!1,rr=!1,Xt=!1,Mr=new Map,It=(c,m)=>{let b=Mr.get(c);b?b.push(m):Mr.set(c,[m])},Wt=()=>{if(Ft||!rr||Xt||!ne)throw new Error("worker not ready")},ii=c=>{switch(c.data.type){case"init-wasm":Ft=!1,c.data.err?(Xt=!0,Br[1](c.data.err)):(rr=!0,Br[0]()),ir&&(URL.revokeObjectURL(ir),ir=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let m=Mr.get(c.data.type);c.data.err?m.shift()[1](c.data.err):m.shift()[0](c.data.out);break}default:}},ai=async()=>{if(!rr){if(Ft)throw new Error("multiple calls to 'initWasm()' detected.");if(Xt)throw new Error("previous call to 'initWasm()' failed.");if(Ft=!0,kt())return new Promise((c,m)=>{ne==null||ne.terminate(),Di().then(([b,T])=>{try{ne=T,ne.onerror=A=>m(A),ne.onmessage=ii,Br=[c,m];let v={type:"init-wasm",in:he};if(!v.in.wasm.wasmPaths&&b){let A=br();A&&(v.in.wasm.wasmPaths=A)}ne.postMessage(v),ir=b}catch(v){m(v)}},m)});try{await kr(he.wasm),await Xr(he),rr=!0}catch(c){throw Xt=!0,c}finally{Ft=!1}}},si=async c=>{if(kt())return Wt(),new Promise((m,b)=>{It("init-ep",[m,b]);let T={type:"init-ep",in:{epName:c,env:he}};ne.postMessage(T)});await Yr(he,c)},Qi=async c=>kt()?(Wt(),new Promise((m,b)=>{It("copy-from",[m,b]);let T={type:"copy-from",in:{buffer:c}};ne.postMessage(T,[c.buffer])})):_e(c),Xi=async(c,m)=>{if(kt()){if(m!=null&&m.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return Wt(),new Promise((b,T)=>{It("create",[b,T]);let v={type:"create",in:{model:c,options:{...m}}},A=[];c instanceof Uint8Array&&A.push(c.buffer),ne.postMessage(v,A)})}else return gt(c,m)},Sa=async c=>{if(kt())return Wt(),new Promise((m,b)=>{It("release",[m,b]);let T={type:"release",in:c};ne.postMessage(T)});ti(c)},ar=async(c,m,b,T,v,A)=>{if(kt()){if(b.some(E=>E[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(v.some(E=>E))throw new Error("pre-allocated output tensor is not supported for proxy.");return Wt(),new Promise((E,k)=>{It("run",[E,k]);let R=b,V={type:"run",in:{sessionId:c,inputIndices:m,inputs:R,outputIndices:T,options:A}};ne.postMessage(V,ri(R))})}else return P(c,m,b,T,v,A)},Yi=async c=>{if(kt())return Wt(),new Promise((m,b)=>{It("end-profiling",[m,b]);let T={type:"end-profiling",in:c};ne.postMessage(T)});tr(c)}}),ea,ni,oi,ui=z(()=>{"use strict";We(),Ji(),de(),yr(),Hi(),ea=(c,m)=>{switch(c.location){case"cpu":return[c.type,c.dims,c.data,"cpu"];case"gpu-buffer":return[c.type,c.dims,{gpuBuffer:c.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[c.type,c.dims,{mlTensor:c.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${c.location} for ${m()}`)}},ni=c=>{switch(c[3]){case"cpu":return new De(c[0],c[2],c[1]);case"gpu-buffer":{let m=c[0];if(!Ar(m))throw new Error(`not supported data type: ${m} for deserializing GPU tensor`);let{gpuBuffer:b,download:T,dispose:v}=c[2];return De.fromGpuBuffer(b,{dataType:m,dims:c[1],download:T,dispose:v})}case"ml-tensor":{let m=c[0];if(!Or(m))throw new Error(`not supported data type: ${m} for deserializing MLTensor tensor`);let{mlTensor:b,download:T,dispose:v}=c[2];return De.fromMLTensor(b,{dataType:m,dims:c[1],download:T,dispose:v})}default:throw new Error(`invalid data location: ${c[3]}`)}},oi=class{async fetchModelAndCopyToWasmMemory(c){return Qi(await Rr(c))}async loadModel(c,m){He();let b;typeof c=="string"?b=await this.fetchModelAndCopyToWasmMemory(c):b=c,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Xi(b,m),Fe()}async dispose(){return Sa(this.sessionId)}async run(c,m,b){He();let T=[],v=[];Object.entries(c).forEach(q=>{let D=q[0],te=q[1],C=this.inputNames.indexOf(D);if(C===-1)throw new Error(`invalid input '${D}'`);T.push(te),v.push(C)});let A=[],E=[];Object.entries(m).forEach(q=>{let D=q[0],te=q[1],C=this.outputNames.indexOf(D);if(C===-1)throw new Error(`invalid output '${D}'`);A.push(te),E.push(C)});let k=T.map((q,D)=>ea(q,()=>`input "${this.inputNames[v[D]]}"`)),R=A.map((q,D)=>q?ea(q,()=>`output "${this.outputNames[E[D]]}"`):null),V=await ar(this.sessionId,v,k,E,R,b),W={};for(let q=0;q<V.length;q++)W[this.outputNames[E[q]]]=A[q]??ni(V[q]);return Fe(),W}startProfiling(){}endProfiling(){Yi(this.sessionId)}}}),Dr={};se(Dr,{OnnxruntimeWebAssemblyBackend:()=>di,initializeFlags:()=>li,wasmBackend:()=>pi});var li,di,pi,ta=z(()=>{"use strict";We(),Ji(),ui(),li=()=>{(typeof he.wasm.initTimeout!="number"||he.wasm.initTimeout<0)&&(he.wasm.initTimeout=0);let c=he.wasm.simd;if(typeof c!="boolean"&&c!==void 0&&c!=="fixed"&&c!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${c}". Reset it to \`false\` and ignore SIMD feature checking.`),he.wasm.simd=!1),typeof he.wasm.proxy!="boolean"&&(he.wasm.proxy=!1),typeof he.wasm.trace!="boolean"&&(he.wasm.trace=!1),typeof he.wasm.numThreads!="number"||!Number.isInteger(he.wasm.numThreads)||he.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)he.wasm.numThreads=1;else{let m=typeof navigator>"u"?H("node:os").cpus().length:navigator.hardwareConcurrency;he.wasm.numThreads=Math.min(4,Math.ceil((m||1)/2))}},di=class{async init(c){li(),await ai(),await si(c)}async createInferenceSessionHandler(c,m){let b=new oi;return await b.loadModel(c,m),b}},pi=new di}),ra={};se(ra,{InferenceSession:()=>gr,TRACE:()=>Lt,TRACE_EVENT_BEGIN:()=>Je,TRACE_EVENT_END:()=>et,TRACE_FUNC_BEGIN:()=>He,TRACE_FUNC_END:()=>Fe,Tensor:()=>De,default:()=>fs,env:()=>he,registerBackend:()=>be}),We(),We(),We();var Ta="1.27.0",fs=Ii;{let c=(ta(),ee(Dr)).wasmBackend;be("cpu",c,10),be("wasm",c,10)}return Object.defineProperty(he.versions,"web",{value:Ta,enumerable:!0}),ee(ra)})();typeof Rc=="object"&&typeof Cn=="object"&&(Cn.exports=df)});var Dc=it(Ve=>{"use strict";var pf=Ve&&Ve.__createBinding||(Object.create?function(M,N,L,G){G===void 0&&(G=L);var H=Object.getOwnPropertyDescriptor(N,L);(!H||("get"in H?!N.__esModule:H.writable||H.configurable))&&(H={enumerable:!0,get:function(){return N[L]}}),Object.defineProperty(M,G,H)}:function(M,N,L,G){G===void 0&&(G=L),M[G]=N[L]}),cf=Ve&&Ve.__setModuleDefault||(Object.create?function(M,N){Object.defineProperty(M,"default",{enumerable:!0,value:N})}:function(M,N){M.default=N}),hf=Ve&&Ve.__importStar||function(M){if(M&&M.__esModule)return M;var N={};if(M!=null)for(var L in M)L!=="default"&&Object.prototype.hasOwnProperty.call(M,L)&&pf(N,M,L);return cf(N,M),N};Object.defineProperty(Ve,"__esModule",{value:!0});Ve.MicVAD=Ve.getDefaultRealTimeVADOptions=Ve.ort=Ve.DEFAULT_MODEL=void 0;var ff=hf(Bc()),mf=Fa(),An=ja(),St=hi(),Kr=wa(),Mc=xn(),gf=Tn();Ve.DEFAULT_MODEL="legacy";Ve.ort=ff;var yf="vad.worklet.bundle.min.js",wf="silero_vad_v5.onnx",_f="silero_vad_legacy.onnx",bf=M=>({...An.defaultFrameProcessorOptions,onFrameProcessed:()=>{},onVADMisfire:()=>{St.log.debug("VAD misfire")},onSpeechStart:()=>{St.log.debug("Detected speech start")},onSpeechEnd:()=>{St.log.debug("Detected speech end")},onSpeechRealStart:()=>{St.log.debug("Detected real speech start")},baseAssetPath:"./",onnxWASMBasePath:"./",model:M,workletOptions:{},getStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),pauseStream:async N=>{N.getTracks().forEach(L=>{L.stop()})},resumeStream:async()=>await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:!0,autoGainControl:!0,noiseSuppression:!0}}),ortConfig:N=>{N.env.logLevel="error"},startOnLoad:!0,processorType:"auto"});Ve.getDefaultRealTimeVADOptions=bf;var $f=M=>"audioWorklet"in M&&typeof AudioWorkletNode=="function"?"AudioWorklet":"ScriptProcessor";async function vf(M,N,L,G,H){await L.audioWorklet.addModule(M),N.processorOptions={...N.processorOptions??{},frameSamples:G};let z=new AudioWorkletNode(L,"vad-helper-worklet",N);return z.port.onmessage=async se=>{let ye=se.data;if(!(typeof ye=="object"&&ye&&"message"in ye)){console.error("Invalid message event",ye);return}switch(ye.message){case Kr.Message.AudioFrame:{if(!("data"in ye&&ye.data instanceof ArrayBuffer)){console.log("Audio frame message has no data");return}let ee=new Float32Array(ye.data);await H(ee);break}}},z}async function xf(M,N,L){let G=new gf.Resampler({nativeSampleRate:M.sampleRate,targetSampleRate:16e3,targetFrameSize:N});St.log.debug("using script processor");let z=M.createScriptProcessor(4096,1,1),se=!1;return z.onaudioprocess=async ye=>{if(!se){se=!0;try{let ee=ye.inputBuffer.getChannelData(0);ye.outputBuffer.getChannelData(0).fill(0);let we=G.process(ee);for(let be of we)await L(be)}catch(ee){console.error("Error processing audio:",ee)}finally{se=!1}}},z.connect(M.destination),z}var On=class M{constructor(N,L,G,H,z=!1,se=null,ye=null,ee=null,me=null,we=null,be=null,je="uninitialized",$t=!1){this.options=N,this.frameProcessor=L,this.model=G,this.frameSamples=H,this.listening=z,this.errored=se,this._stream=ye,this._audioContext=ee,this._vadNode=me,this._mediaStreamAudioSourceNode=we,this._audioProcessorAdapterType=be,this.initializationState=je,this.ownsAudioContext=$t,this.getAudioInstances=()=>{if(this._stream===null||this._audioContext===null||this._vadNode==null||this._mediaStreamAudioSourceNode==null)throw new Error("MicVAD has null stream, audio context, or processor adapter");return{stream:this._stream,audioContext:this._audioContext,vadNode:this._vadNode,mediaStreamAudioSourceNode:this._mediaStreamAudioSourceNode}},this.setErrored=Ie=>{this.initializationState="errored",this.errored=Ie},this.start=async()=>{switch(this.initializationState){case"uninitialized":{St.log.debug("initializing micVAD"),this.initializationState="initializing",this.frameProcessor.resume();try{this._stream=await this.options.getStream()}catch(Ie){throw Ie instanceof Error?this.setErrored(Ie.message):this.setErrored(String(Ie)),Ie}if(this.options.audioContext?(console.log("using custom audio context"),this._audioContext=this.options.audioContext):(console.log("using default audio context"),this._audioContext=new AudioContext,this.ownsAudioContext=!0),!this._audioContext)throw this.setErrored("Audio context is null"),Error("Audio context is null");switch(this._audioProcessorAdapterType=this.options.processorType=="auto"?$f(this._audioContext):this.options.processorType,this._audioProcessorAdapterType){case"AudioWorklet":this._vadNode=await vf(this.options.baseAssetPath+yf,this.options.workletOptions,this._audioContext,this.frameSamples,this.processFrame);break;case"ScriptProcessor":this._vadNode=await xf(this._audioContext,this.frameSamples,this.processFrame);break;default:throw new Error(`Unsupported audio processor adapter type: ${this._audioProcessorAdapterType}`)}this._mediaStreamAudioSourceNode=new MediaStreamAudioSourceNode(this._audioContext,{mediaStream:this._stream}),this._mediaStreamAudioSourceNode.connect(this._vadNode),St.log.debug("started micVAD"),this.listening=!0,this.initializationState="initialized";break}case"initializing":{St.log.warn("start called while initializing");break}case"initialized":{if(this.listening)return;this.listening=!0,this.frameProcessor.resume();let{stream:Ie,audioContext:ut,vadNode:pr}=this.getAudioInstances();this._stream=await this.options.resumeStream(Ie);let Zr=new MediaStreamAudioSourceNode(ut,{mediaStream:this._stream});this._mediaStreamAudioSourceNode=Zr,Zr.connect(pr);break}case"destroyed":{St.log.warn("start called after destroyed");break}case"errored":{St.log.error("start called after errored");break}default:{St.log.warn("weird initialization state");break}}},this.pause=async()=>{if(!this.listening)return;this.listening=!1;let{stream:Ie,mediaStreamAudioSourceNode:ut}=this.getAudioInstances();await this.options.pauseStream(Ie),ut.disconnect(),this.frameProcessor.pause(this.handleFrameProcessorEvent)},this.destroy=async()=>{var ut;St.log.debug("destroy called"),this.initializationState="destroyed";let{vadNode:Ie}=this.getAudioInstances();Ie instanceof AudioWorkletNode&&Ie.port.postMessage(Kr.Message.SpeechStop),this.listening&&await this.pause(),await this.model.release(),this.ownsAudioContext&&await((ut=this._audioContext)==null?void 0:ut.close())},this.setOptions=Ie=>{this.frameProcessor.setOptions(Ie)},this.processFrame=async Ie=>{await this.frameProcessor.process(Ie,this.handleFrameProcessorEvent)},this.handleFrameProcessorEvent=Ie=>{switch(Ie.msg){case Kr.Message.FrameProcessed:this.options.onFrameProcessed(Ie.probs,Ie.frame);break;case Kr.Message.SpeechStart:this.options.onSpeechStart();break;case Kr.Message.SpeechRealStart:this.options.onSpeechRealStart();break;case Kr.Message.VADMisfire:this.options.onVADMisfire();break;case Kr.Message.SpeechEnd:this.options.onSpeechEnd(Ie.audio);break}}}static async new(N={}){let L={...(0,Ve.getDefaultRealTimeVADOptions)(N.model??Ve.DEFAULT_MODEL),...N};(0,An.validateOptions)(L),Ve.ort.env.wasm.wasmPaths=L.onnxWASMBasePath,L.ortConfig!==void 0&&L.ortConfig(Ve.ort);let G=L.model==="v5"?wf:_f,H=L.baseAssetPath+G,z=L.model==="v5"?Mc.SileroV5.new:Mc.SileroLegacy.new,se;try{se=await z(Ve.ort,()=>(0,mf.defaultModelFetcher)(H))}catch(be){throw console.error(`Encountered an error while loading model file ${H}`),be}let ye=L.model==="v5"?512:1536,ee=ye/16,me=new An.FrameProcessor(se.process,se.reset_state,{positiveSpeechThreshold:L.positiveSpeechThreshold,negativeSpeechThreshold:L.negativeSpeechThreshold,redemptionMs:L.redemptionMs,preSpeechPadMs:L.preSpeechPadMs,minSpeechMs:L.minSpeechMs,submitUserSpeechOnPause:L.submitUserSpeechOnPause},ee),we=new M(L,me,se,ye);if(L.startOnLoad)try{await we.start()}catch(be){throw console.error("Error starting micVad",be),be}return we}};Ve.MicVAD=On});var Pc=it(Ge=>{"use strict";Object.defineProperty(Ge,"__esModule",{value:!0});Ge.getDefaultRealTimeVADOptions=Ge.MicVAD=Ge.DEFAULT_MODEL=Ge.utils=Ge.NonRealTimeVAD=Ge.Message=Ge.FrameProcessor=Ge.defaultModelFetcher=Ge.baseAssetPath=void 0;var Sf=_n();Object.defineProperty(Ge,"baseAssetPath",{enumerable:!0,get:function(){return Sf.baseAssetPath}});var Tf=Fa();Object.defineProperty(Ge,"defaultModelFetcher",{enumerable:!0,get:function(){return Tf.defaultModelFetcher}});var Ef=ja();Object.defineProperty(Ge,"FrameProcessor",{enumerable:!0,get:function(){return Ef.FrameProcessor}});var kf=wa();Object.defineProperty(Ge,"Message",{enumerable:!0,get:function(){return kf.Message}});var If=Cc();Object.defineProperty(Ge,"NonRealTimeVAD",{enumerable:!0,get:function(){return If.NonRealTimeVAD}});var Ya=Ac();Ge.utils={audioFileToArray:Ya.audioFileToArray,minFramesForTargetMS:Ya.minFramesForTargetMS,arrayBufferToBase64:Ya.arrayBufferToBase64,encodeWAV:Ya.encodeWAV};var Rn=Dc();Object.defineProperty(Ge,"DEFAULT_MODEL",{enumerable:!0,get:function(){return Rn.DEFAULT_MODEL}});Object.defineProperty(Ge,"MicVAD",{enumerable:!0,get:function(){return Rn.MicVAD}});Object.defineProperty(Ge,"getDefaultRealTimeVADOptions",{enumerable:!0,get:function(){return Rn.getDefaultRealTimeVADOptions}})});var zf="/shared/vad/",Ja=null;async function Cf(){return Ja||(Ja=await Promise.resolve().then(()=>Lh(Pc(),1)),Ja)}async function Af({stream:M,baseAssetPath:N=zf,hangoverMs:L=400,onSpeechChange:G=null}={}){var me,we;if(!((we=(me=M==null?void 0:M.getAudioTracks)==null?void 0:me.call(M))!=null&&we.length))return null;let{MicVAD:H}=await Cf(),z=!1,se=null,ye=be=>{if(!!be){se&&(clearTimeout(se),se=null),z||(z=!0,G==null||G(!0));return}z&&(se&&clearTimeout(se),se=setTimeout(()=>{se=null,z=!1,G==null||G(!1)},L))},ee=await H.new({baseAssetPath:N,onnxWASMBasePath:N,startOnLoad:!1,getStream:async()=>M,pauseStream:async()=>{},resumeStream:async()=>M,onSpeechStart:()=>ye(!0),onSpeechEnd:()=>ye(!1),onVADMisfire:()=>ye(!1)});return await ee.start(),{isSpeaking:()=>z,destroy:()=>{se&&clearTimeout(se);try{ee.destroy()}catch{}}}}var Of="/shared/rnnoise/NoiseSuppressorWorklet.js",Rf="NoiseSuppressorWorklet",xa=null;function Bf(M){return M!=null&&M.audioWorklet?xa||(xa=M.audioWorklet.addModule(Of).then(()=>!0).catch(N=>(console.warn("[rnnoise] worklet indisponivel:",N),xa=null,!1)),xa):Promise.resolve(!1)}async function Mf(M,N,L){if(!M||!N||!L||!await Bf(M))return null;try{let H=new AudioWorkletNode(M,Rf);return N.connect(H),H.connect(L),H}catch(H){return console.warn("[rnnoise] falha ao criar AudioWorkletNode:",H),null}}export{Mf as createRnnoiseNode,Af as createSpeechVadController};
/*! Bundled license information:

onnxruntime-web/dist/ort.min.js:
  (*!
   * ONNX Runtime Web v1.27.0
   * Copyright (c) Microsoft Corporation. All rights reserved.
   * Licensed under the MIT License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC. All Rights Reserved.
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   * =============================================================================
   *)
  (**
   * @license
   * Copyright 2020 Google LLC. All Rights Reserved.
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   * =============================================================================
   *)
  (**
   * @license
   * Copyright 2019 Google LLC. All Rights Reserved.
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   * =============================================================================
   *)

onnxruntime-web/dist/ort.wasm.min.js:
  (*!
   * ONNX Runtime Web v1.27.0
   * Copyright (c) Microsoft Corporation. All rights reserved.
   * Licensed under the MIT License.
   *)
*/
