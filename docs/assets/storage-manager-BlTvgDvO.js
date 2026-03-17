var iE=Object.defineProperty;var sE=(r,e,t)=>e in r?iE(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var oE=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var ls=(r,e,t)=>sE(r,typeof e!="symbol"?e+"":e,t);var YD=oE((ax,Aa)=>{window.NETWORK_CONFIG={ALLOWED_GATEWAY:"111.21.101.254",VWORLD_API_KEY:"5390BC39-A15B-3BA2-8025-28867877615A"};const Du={STORAGE_KEY:"networkAccessConfig",GATEWAY_STORAGE_KEY:"networkGatewayIP",getAllowedGateway(){var r;try{const e=localStorage.getItem(this.GATEWAY_STORAGE_KEY);if(e)return e}catch{}return((r=window.NETWORK_CONFIG)==null?void 0:r.ALLOWED_GATEWAY)||null},saveGateway(r){var e,t;try{localStorage.setItem(this.GATEWAY_STORAGE_KEY,r),(((e=window.logger)==null?void 0:e.info)||console.info)("[NetworkAccess] 게이트웨이 저장됨:",r)}catch(n){(((t=window.logger)==null?void 0:t.error)||console.error)("[NetworkAccess] 게이트웨이 저장 실패:",n)}},removeGateway(){var r;try{localStorage.removeItem(this.GATEWAY_STORAGE_KEY),(((r=window.logger)==null?void 0:r.info)||console.info)("[NetworkAccess] 게이트웨이 삭제됨")}catch{}},defaultConfig:{adminIPs:[],timeout:5e3},_currentIP:null,_lastCheck:null,_cacheTimeout:6e4,loadConfig(){var r;try{const e=localStorage.getItem(this.STORAGE_KEY);if(e)return{...this.defaultConfig,...JSON.parse(e)}}catch(e){(((r=window.logger)==null?void 0:r.error)||console.error)("[NetworkAccess] 설정 로드 실패:",e)}return{...this.defaultConfig}},saveConfig(r){var e,t;try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(r)),(((e=window.logger)==null?void 0:e.info)||console.info)("[NetworkAccess] 설정 저장됨:",r)}catch(n){(((t=window.logger)==null?void 0:t.error)||console.error)("[NetworkAccess] 설정 저장 실패:",n)}},async getCurrentIP(r){var t,n;if(this._currentIP&&this._lastCheck&&Date.now()-this._lastCheck<this._cacheTimeout)return this._currentIP;const e=r||this.loadConfig().timeout;try{const i=new AbortController,s=setTimeout(()=>i.abort(),e),o=await fetch("https://api.ipify.org?format=json",{signal:i.signal});clearTimeout(s);const c=await o.json();return this._currentIP=c.ip,this._lastCheck=Date.now(),(((t=window.logger)==null?void 0:t.info)||console.info)("[NetworkAccess] 현재 IP:",this._currentIP),this._currentIP}catch(i){return(((n=window.logger)==null?void 0:n.warn)||console.warn)("[NetworkAccess] IP 조회 실패:",i.message),null}},getSubnetPrefix(r){if(!r)return"";const e=r.split(".");return e.length!==4?"":e.slice(0,3).join(".")+"."},async checkAccess(){var i,s,o,c,l;if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0)return{allowed:!0,reason:"Electron 환경 (항상 허용)",ip:null};if(window.location.protocol==="file:")return{allowed:!0,reason:"Electron 로컬 실행",ip:null};const r=this.getAllowedGateway();if(!r)return(((s=window.logger)==null?void 0:s.warn)||console.warn)("[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요"),{allowed:!1,reason:"게이트웨이 미설정",ip:null,needsSetup:!0};const e=this.getSubnetPrefix(r),t=await this.getCurrentIP();if(!t)return(((o=window.logger)==null?void 0:o.warn)||console.warn)("[NetworkAccess] IP 확인 불가 - 접근 거부"),{allowed:!1,reason:"IP 확인 불가",ip:null};if(t.startsWith(e))return(((c=window.logger)==null?void 0:c.info)||console.info)("[NetworkAccess] 허용된 네트워크:",t),{allowed:!0,reason:`허용된 네트워크 (${r})`,ip:t};const n=this.loadConfig();return n.adminIPs&&n.adminIPs.includes(t)?{allowed:!0,reason:"관리자 IP",ip:t}:((((l=window.logger)==null?void 0:l.warn)||console.warn)("[NetworkAccess] 허용되지 않은 네트워크:",t),{allowed:!1,reason:`허용되지 않은 네트워크 (허용: ${e}x)`,ip:t})},async isAllowed(){return(await this.checkAccess()).allowed},addAdminIP(r){const e=this.loadConfig();e.adminIPs.includes(r)||(e.adminIPs.push(r),this.saveConfig(e))},removeAdminIP(r){const e=this.loadConfig();e.adminIPs=e.adminIPs.filter(t=>t!==r),this.saveConfig(e)},async registerCurrentAsAdmin(){const r=await this.getCurrentIP();return r?(this.addAdminIP(r),r):null},resetConfig(){var r;localStorage.removeItem(this.STORAGE_KEY),localStorage.removeItem(this.GATEWAY_STORAGE_KEY),this._currentIP=null,this._lastCheck=null,(((r=window.logger)==null?void 0:r.info)||console.info)("[NetworkAccess] 설정 초기화됨")},async printStatus(){var s,o,c,l,u,d,f,g,_,R,k;const r=this.loadConfig(),e=await this.getCurrentIP(),t=await this.checkAccess(),n=((s=window.electronAPI)==null?void 0:s.isElectron)===!0||window.location.protocol==="file:",i=this.getAllowedGateway();return(((o=window.logger)==null?void 0:o.info)||console.info)("========================================"),(((c=window.logger)==null?void 0:c.info)||console.info)("[NetworkAccess] 현재 상태"),(((l=window.logger)==null?void 0:l.info)||console.info)("========================================"),(((u=window.logger)==null?void 0:u.info)||console.info)("환경:",n?"Electron (네트워크 체크 안함)":"웹 (네트워크 체크 활성화)"),(((d=window.logger)==null?void 0:d.info)||console.info)("허용된 게이트웨이:",i||"설정 없음"),(((f=window.logger)==null?void 0:f.info)||console.info)("허용된 서브넷:",i?this.getSubnetPrefix(i)+"x":"없음"),(((g=window.logger)==null?void 0:g.info)||console.info)("현재 공인 IP:",e||"확인 불가"),(((_=window.logger)==null?void 0:_.info)||console.info)("접근 허용:",t.allowed,`(${t.reason})`),(((R=window.logger)==null?void 0:R.info)||console.info)("관리자 IP (예외):",r.adminIPs||[]),(((k=window.logger)==null?void 0:k.info)||console.info)("========================================"),{config:r,currentIP:e,access:t,isElectron:n,allowedGateway:i}},showGatewaySetupModal(){return new Promise(r=>{const e=document.getElementById("gatewaySetupModal");e&&e.remove();const t=document.documentElement.getAttribute("data-theme")==="dark",n=document.createElement("div");n.id="gatewaySetupModal",n.style.cssText=`
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', 'Noto Sans KR', sans-serif;
            `;const i=document.createElement("div");i.style.cssText=`
                background: ${t?"#292524":"#fff"}; border-radius: 16px;
                padding: 2rem; max-width: 420px; width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                color: ${t?"#E7E5E4":"#3C3530"};
            `,i.innerHTML=`
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌐</div>
                    <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">네트워크 설정</h2>
                    <p style="font-size: 0.85rem; color: ${t?"#A8A29E":"#6B6460"}; line-height: 1.5;">
                        Firebase 데이터 접근을 위해<br>허용할 게이트웨이 IP를 입력하세요.
                    </p>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.8rem; font-weight: 500; color: ${t?"#A8A29E":"#6B6460"}; margin-bottom: 0.5rem;">
                        게이트웨이 IP 주소
                    </label>
                    <input type="text" id="gatewayIPInput"
                        placeholder="예: 203.xxx.xxx.xxx"
                        style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid ${t?"#57534E":"#E8E4DF"};
                        border-radius: 8px; font-size: 0.95rem; font-family: monospace;
                        background: ${t?"#1C1917":"#FAFAF9"}; color: ${t?"#E7E5E4":"#3C3530"};
                        outline: none; transition: border-color 0.2s;">
                    <p style="font-size: 0.75rem; color: ${t?"#78716C":"#94a3b8"}; margin-top: 0.5rem;">
                        같은 서브넷(xxx.xxx.xxx.*)의 접속만 허용됩니다.<br>
                        나중에 설정 페이지에서 변경할 수 있습니다.
                    </p>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <button id="gatewaySkipBtn" style="
                        flex: 1; padding: 0.7rem; border-radius: 8px; border: 1.5px solid ${t?"#57534E":"#E8E4DF"};
                        background: ${t?"#1C1917":"#f5f5f0"}; color: ${t?"#A8A29E":"#6B6460"};
                        font-size: 0.875rem; cursor: pointer; font-weight: 500;">
                        건너뛰기
                    </button>
                    <button id="gatewaySaveBtn" style="
                        flex: 1; padding: 0.7rem; border-radius: 8px; border: none;
                        background: #7C9082; color: white;
                        font-size: 0.875rem; cursor: pointer; font-weight: 500;">
                        저장
                    </button>
                </div>
            `,n.appendChild(i),document.body.appendChild(n);const s=document.getElementById("gatewayIPInput"),o=document.getElementById("gatewaySaveBtn"),c=document.getElementById("gatewaySkipBtn");s.focus();function l(u){const d=u.trim().split(".");return d.length!==4?!1:d.every(f=>{const g=Number(f);return Number.isInteger(g)&&g>=0&&g<=255})}s.addEventListener("focus",()=>{s.style.borderColor="#7C9082",s.style.boxShadow="0 0 0 3px rgba(124, 144, 130, 0.12)"}),s.addEventListener("blur",()=>{s.style.borderColor=t?"#57534E":"#E8E4DF",s.style.boxShadow="none"}),s.addEventListener("keydown",u=>{u.key==="Enter"&&o.click()}),o.addEventListener("click",()=>{const u=s.value.trim();if(!u){s.style.borderColor="#dc2626",s.placeholder="IP 주소를 입력하세요";return}if(!l(u)){s.style.borderColor="#dc2626",s.value="",s.placeholder="올바른 IP 형식: 0~255.0~255.0~255.0~255";return}Du.saveGateway(u),n.remove(),r(u)}),c.addEventListener("click",()=>{n.remove(),r(null)})})},async promptGatewayIfNeeded(){var e;return((e=window.electronAPI)==null?void 0:e.isElectron)===!0||window.location.protocol==="file:"||this.getAllowedGateway()?!0:!!await this.showGatewaySetupModal()}};window.NetworkAccess=Du;var Bg,$g,qg,zg,Kg;if(((Bg=window.electronAPI)==null?void 0:Bg.isElectron)===!0||window.location.protocol==="file:")((($g=window.logger)==null?void 0:$g.info)||console.info)("[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)");else{const r=Du.getAllowedGateway();(((qg=window.logger)==null?void 0:qg.info)||console.info)("[NetworkAccess] 웹 환경 - 네트워크 체크 활성화"),r?(((zg=window.logger)==null?void 0:zg.info)||console.info)(`[NetworkAccess] 허용된 게이트웨이: ${r}`):(((Kg=window.logger)==null?void 0:Kg.warn)||console.warn)("[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요")}const aE=()=>{};var Pf={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jg=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},cE=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],l=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(l>>10)),e[n++]=String.fromCharCode(56320+(l&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},Gg={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,l=i+2<r.length,u=l?r[i+2]:0,d=s>>2,f=(s&3)<<4|c>>4;let g=(c&15)<<2|u>>6,_=u&63;l||(_=64,o||(g=64)),n.push(t[d],t[f],t[g],t[_])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(jg(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):cE(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const u=i<r.length?t[r.charAt(i)]:64;++i;const f=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||u==null||f==null)throw new lE;const g=s<<2|c>>4;if(n.push(g),u!==64){const _=c<<4&240|u>>2;if(n.push(_),f!==64){const R=u<<6&192|f;n.push(R)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class lE extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const uE=function(r){const e=jg(r);return Gg.encodeByteArray(e,!0)},Sa=function(r){return uE(r).replace(/\./g,"")},xu=function(r){try{return Gg.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function Ra(r,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:r===void 0&&(r={});break;case Array:r=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!hE(t)||(r[t]=Ra(r[t],e[t]));return r}function hE(r){return r!=="__proto__"}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nu(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dE=()=>Nu().__FIREBASE_DEFAULTS__,fE=()=>{if(typeof process>"u"||typeof Pf>"u")return;const r=Pf.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},pE=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&xu(r[1]);return e&&JSON.parse(e)},Vu=()=>{try{return aE()||dE()||fE()||pE()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},Ou=()=>{var r;return(r=Vu())==null?void 0:r.config},gE=r=>{var e;return(e=Vu())==null?void 0:e[`_${r}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mE{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vi(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Wg(r){return(await fetch(r,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yE(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Sa(JSON.stringify(t)),Sa(JSON.stringify(o)),""].join(".")}const Cs={};function _E(){const r={prod:[],emulator:[]};for(const e of Object.keys(Cs))Cs[e]?r.emulator.push(e):r.prod.push(e);return r}function wE(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let Cf=!1;function Hg(r,e){if(typeof window>"u"||typeof document>"u"||!Vi(window.location.host)||Cs[r]===e||Cs[r]||Cf)return;Cs[r]=e;function t(g){return`__firebase__banner__${g}`}const n="__firebase__banner",s=_E().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function l(g,_){g.setAttribute("width","24"),g.setAttribute("id",_),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function u(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{Cf=!0,o()},g}function d(g,_){g.setAttribute("id",_),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function f(){const g=wE(n),_=t("text"),R=document.getElementById(_)||document.createElement("span"),k=t("learnmore"),T=document.getElementById(k)||document.createElement("a"),x=t("preprendIcon"),M=document.getElementById(x)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const F=g.element;c(F),d(T,k);const K=u();l(M,x),F.append(M,R,T,K),document.body.appendChild(F)}s?(R.innerText="Preview backend disconnected.",M.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(M.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,R.innerText="Preview backend running in this workspace."),R.setAttribute("id",_)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",f):f()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function we(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function IE(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(we())}function nc(){var e;const r=(e=Vu())==null?void 0:e.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function EE(){return typeof window<"u"||Qg()}function Qg(){return typeof WorkerGlobalScope<"u"&&typeof self<"u"&&self instanceof WorkerGlobalScope}function vE(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Yg(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Mu(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Jg(){const r=we();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function Xg(){return!nc()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Zg(){return!nc()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Ks(){try{return typeof indexedDB=="object"}catch{return!1}}function TE(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)==null?void 0:s.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bE="FirebaseError";class nt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=bE,Object.setPrototypeOf(this,nt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,xr.prototype.create)}}class xr{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?AE(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new nt(i,c,n)}}function AE(r,e){return r.replace(SE,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const SE=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kf(r,e){return Object.prototype.hasOwnProperty.call(r,e)}function RE(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function Dn(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(Df(s)&&Df(o)){if(!Dn(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function Df(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oi(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function ti(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Es(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function em(r,e){const t=new PE(r,e);return t.subscribe.bind(t)}class PE{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");CE(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=_l),i.error===void 0&&(i.error=_l),i.complete===void 0&&(i.complete=_l);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function CE(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function _l(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function G(r){return r&&r._delegate?r._delegate:r}class Kt{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ir="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kE{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new mE;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),n=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(n)return null;throw i}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(xE(e))try{this.getOrInitializeService({instanceIdentifier:ir})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=ir){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=ir){return this.instances.has(e)}getOptions(e=ir){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(n)??new Set;i.add(e),this.onInitCallbacks.set(n,i);const s=this.instances.get(n);return s&&e(s,n),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:DE(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=ir){return this.component?this.component.multipleInstances?e:ir:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function DE(r){return r===ir?void 0:r}function xE(r){return r.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tm{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new kE(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fu=[];var X;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(X||(X={}));const nm={debug:X.DEBUG,verbose:X.VERBOSE,info:X.INFO,warn:X.WARN,error:X.ERROR,silent:X.SILENT},NE=X.INFO,VE={[X.DEBUG]:"log",[X.VERBOSE]:"log",[X.INFO]:"info",[X.WARN]:"warn",[X.ERROR]:"error"},OE=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=VE[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class rc{constructor(e){this.name=e,this._logLevel=NE,this._logHandler=OE,this._userLogHandler=null,Fu.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in X))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?nm[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,X.DEBUG,...e),this._logHandler(this,X.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,X.VERBOSE,...e),this._logHandler(this,X.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,X.INFO,...e),this._logHandler(this,X.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,X.WARN,...e),this._logHandler(this,X.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,X.ERROR,...e),this._logHandler(this,X.ERROR,...e)}}function ME(r){Fu.forEach(e=>{e.setLogLevel(r)})}function FE(r,e){for(const t of Fu){let n=null;e&&e.level&&(n=nm[e.level]),r===null?t.userLogHandler=null:t.userLogHandler=(i,s,...o)=>{const c=o.map(l=>{if(l==null)return null;if(typeof l=="string")return l;if(typeof l=="number"||typeof l=="boolean")return l.toString();if(l instanceof Error)return l.message;try{return JSON.stringify(l)}catch{return null}}).filter(l=>l).join(" ");s>=(n??i.logLevel)&&r({level:X[s].toLowerCase(),message:c,args:o,type:i.name})}}}const LE=(r,e)=>e.some(t=>r instanceof t);let xf,Nf;function UE(){return xf||(xf=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function BE(){return Nf||(Nf=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const rm=new WeakMap,Ll=new WeakMap,im=new WeakMap,wl=new WeakMap,Lu=new WeakMap;function $E(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",o)},s=()=>{t(Sn(r.result)),i()},o=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&rm.set(t,r)}).catch(()=>{}),Lu.set(e,r),e}function qE(r){if(Ll.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",o),r.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",o),r.addEventListener("abort",o)});Ll.set(r,e)}let Ul={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return Ll.get(r);if(e==="objectStoreNames")return r.objectStoreNames||im.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return Sn(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function zE(r){Ul=r(Ul)}function KE(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(Il(this),e,...t);return im.set(n,e.sort?e.sort():[e]),Sn(n)}:BE().includes(r)?function(...e){return r.apply(Il(this),e),Sn(rm.get(this))}:function(...e){return Sn(r.apply(Il(this),e))}}function jE(r){return typeof r=="function"?KE(r):(r instanceof IDBTransaction&&qE(r),LE(r,UE())?new Proxy(r,Ul):r)}function Sn(r){if(r instanceof IDBRequest)return $E(r);if(wl.has(r))return wl.get(r);const e=jE(r);return e!==r&&(wl.set(r,e),Lu.set(e,r)),e}const Il=r=>Lu.get(r);function GE(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const o=indexedDB.open(r,e),c=Sn(o);return n&&o.addEventListener("upgradeneeded",l=>{n(Sn(o.result),l.oldVersion,l.newVersion,Sn(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{s&&l.addEventListener("close",()=>s()),i&&l.addEventListener("versionchange",u=>i(u.oldVersion,u.newVersion,u))}).catch(()=>{}),c}const WE=["get","getKey","getAll","getAllKeys","count"],HE=["put","add","delete","clear"],El=new Map;function Vf(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(El.get(e))return El.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=HE.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||WE.includes(t)))return;const s=async function(o,...c){const l=this.transaction(o,i?"readwrite":"readonly");let u=l.store;return n&&(u=u.index(c.shift())),(await Promise.all([u[t](...c),i&&l.done]))[0]};return El.set(e,s),s}zE(r=>({...r,get:(e,t,n)=>Vf(e,t)||r.get(e,t,n),has:(e,t)=>!!Vf(e,t)||r.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class QE{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(YE(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function YE(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Pa="@firebase/app",Bl="0.14.6";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xt=new rc("@firebase/app"),JE="@firebase/app-compat",XE="@firebase/analytics-compat",ZE="@firebase/analytics",ev="@firebase/app-check-compat",tv="@firebase/app-check",nv="@firebase/auth",rv="@firebase/auth-compat",iv="@firebase/database",sv="@firebase/data-connect",ov="@firebase/database-compat",av="@firebase/functions",cv="@firebase/functions-compat",lv="@firebase/installations",uv="@firebase/installations-compat",hv="@firebase/messaging",dv="@firebase/messaging-compat",fv="@firebase/performance",pv="@firebase/performance-compat",gv="@firebase/remote-config",mv="@firebase/remote-config-compat",yv="@firebase/storage",_v="@firebase/storage-compat",wv="@firebase/firestore",Iv="@firebase/ai",Ev="@firebase/firestore-compat",vv="firebase",Tv="12.6.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xn="[DEFAULT]",bv={[Pa]:"fire-core",[JE]:"fire-core-compat",[ZE]:"fire-analytics",[XE]:"fire-analytics-compat",[tv]:"fire-app-check",[ev]:"fire-app-check-compat",[nv]:"fire-auth",[rv]:"fire-auth-compat",[iv]:"fire-rtdb",[sv]:"fire-data-connect",[ov]:"fire-rtdb-compat",[av]:"fire-fn",[cv]:"fire-fn-compat",[lv]:"fire-iid",[uv]:"fire-iid-compat",[hv]:"fire-fcm",[dv]:"fire-fcm-compat",[fv]:"fire-perf",[pv]:"fire-perf-compat",[gv]:"fire-rc",[mv]:"fire-rc-compat",[yv]:"fire-gcs",[_v]:"fire-gcs-compat",[wv]:"fire-fst",[Ev]:"fire-fst-compat",[Iv]:"fire-vertex","fire-js":"fire-js",[vv]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nn=new Map,ui=new Map,hi=new Map;function js(r,e){try{r.container.addComponent(e)}catch(t){Xt.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function sm(r,e){r.container.addOrOverwriteComponent(e)}function Vn(r){const e=r.name;if(hi.has(e))return Xt.debug(`There were multiple attempts to register component ${e}.`),!1;hi.set(e,r);for(const t of Nn.values())js(t,r);for(const t of ui.values())js(t,r);return!0}function om(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function Av(r,e,t=xn){om(r,e).clearInstance(t)}function Uu(r){return r.options!==void 0}function am(r){return Uu(r)?!1:"authIdToken"in r||"appCheckToken"in r||"releaseOnDeref"in r||"automaticDataCollectionEnabled"in r}function me(r){return r==null?!1:r.settings!==void 0}function Sv(){hi.clear()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rv={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},mt=new xr("app","Firebase",Rv);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let cm=class{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new Kt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw mt.create("app-deleted",{appName:this._name})}};/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Of(r,e){const t=xu(r.split(".")[1]);if(t===null){console.error(`FirebaseServerApp ${e} is invalid: second part could not be parsed.`);return}if(JSON.parse(t).exp===void 0){console.error(`FirebaseServerApp ${e} is invalid: expiration claim could not be parsed`);return}const i=JSON.parse(t).exp*1e3,s=new Date().getTime();i-s<=0&&console.error(`FirebaseServerApp ${e} is invalid: the token has expired.`)}class Pv extends cm{constructor(e,t,n,i){const s=t.automaticDataCollectionEnabled!==void 0?t.automaticDataCollectionEnabled:!0,o={name:n,automaticDataCollectionEnabled:s};if(e.apiKey!==void 0)super(e,o,i);else{const c=e;super(c.options,o,i)}this._serverConfig={automaticDataCollectionEnabled:s,...t},this._serverConfig.authIdToken&&Of(this._serverConfig.authIdToken,"authIdToken"),this._serverConfig.appCheckToken&&Of(this._serverConfig.appCheckToken,"appCheckToken"),this._finalizationRegistry=null,typeof FinalizationRegistry<"u"&&(this._finalizationRegistry=new FinalizationRegistry(()=>{this.automaticCleanup()})),this._refCount=0,this.incRefCount(this._serverConfig.releaseOnDeref),this._serverConfig.releaseOnDeref=void 0,t.releaseOnDeref=void 0,bt(Pa,Bl,"serverapp")}toJSON(){}get refCount(){return this._refCount}incRefCount(e){this.isDeleted||(this._refCount++,e!==void 0&&this._finalizationRegistry!==null&&this._finalizationRegistry.register(e,this))}decRefCount(){return this.isDeleted?0:--this._refCount}automaticCleanup(){$u(this)}get settings(){return this.checkDestroyed(),this._serverConfig}checkDestroyed(){if(this.isDeleted)throw mt.create("server-app-deleted")}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zn=Tv;function Bu(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:xn,automaticDataCollectionEnabled:!0,...e},i=n.name;if(typeof i!="string"||!i)throw mt.create("bad-app-name",{appName:String(i)});if(t||(t=Ou()),!t)throw mt.create("no-options");const s=Nn.get(i);if(s){if(Dn(t,s.options)&&Dn(n,s.config))return s;throw mt.create("duplicate-app",{appName:i})}const o=new tm(i);for(const l of hi.values())o.addComponent(l);const c=new cm(t,n,o);return Nn.set(i,c),c}function Cv(r,e={}){if(EE()&&!Qg())throw mt.create("invalid-server-app-environment");let t,n=e||{};if(r&&(Uu(r)?t=r.options:am(r)?n=r:t=r),n.automaticDataCollectionEnabled===void 0&&(n.automaticDataCollectionEnabled=!0),t||(t=Ou()),!t)throw mt.create("no-options");const i={...n,...t};i.releaseOnDeref!==void 0&&delete i.releaseOnDeref;const s=d=>[...d].reduce((f,g)=>Math.imul(31,f)+g.charCodeAt(0)|0,0);if(n.releaseOnDeref!==void 0&&typeof FinalizationRegistry>"u")throw mt.create("finalization-registry-not-supported",{});const o=""+s(JSON.stringify(i)),c=ui.get(o);if(c)return c.incRefCount(n.releaseOnDeref),c;const l=new tm(o);for(const d of hi.values())l.addComponent(d);const u=new Pv(t,n,o,l);return ui.set(o,u),u}function kv(r=xn){const e=Nn.get(r);if(!e&&r===xn&&Ou())return Bu();if(!e)throw mt.create("no-app",{appName:r});return e}function Dv(){return Array.from(Nn.values())}async function $u(r){let e=!1;const t=r.name;Nn.has(t)?(e=!0,Nn.delete(t)):ui.has(t)&&r.decRefCount()<=0&&(ui.delete(t),e=!0),e&&(await Promise.all(r.container.getProviders().map(n=>n.delete())),r.isDeleted=!0)}function bt(r,e,t){let n=bv[r]??r;t&&(n+=`-${t}`);const i=n.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${n}" with version "${e}":`];i&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Xt.warn(o.join(" "));return}Vn(new Kt(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}function lm(r,e){if(r!==null&&typeof r!="function")throw mt.create("invalid-log-argument");FE(r,e)}function um(r){ME(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xv="firebase-heartbeat-database",Nv=1,Gs="firebase-heartbeat-store";let vl=null;function hm(){return vl||(vl=GE(xv,Nv,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(Gs)}catch(t){console.warn(t)}}}}).catch(r=>{throw mt.create("idb-open",{originalErrorMessage:r.message})})),vl}async function Vv(r){try{const t=(await hm()).transaction(Gs),n=await t.objectStore(Gs).get(dm(r));return await t.done,n}catch(e){if(e instanceof nt)Xt.warn(e.message);else{const t=mt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Xt.warn(t.message)}}}async function Mf(r,e){try{const n=(await hm()).transaction(Gs,"readwrite");await n.objectStore(Gs).put(e,dm(r)),await n.done}catch(t){if(t instanceof nt)Xt.warn(t.message);else{const n=mt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Xt.warn(n.message)}}}function dm(r){return`${r.name}!${r.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ov=1024,Mv=30;class Fv{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Uv(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Ff();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>Mv){const o=Bv(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){Xt.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Ff(),{heartbeatsToSend:n,unsentEntries:i}=Lv(this._heartbeatsCache.heartbeats),s=Sa(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Xt.warn(t),""}}}function Ff(){return new Date().toISOString().substring(0,10)}function Lv(r,e=Ov){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),Lf(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Lf(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class Uv{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Ks()?TE().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await Vv(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Mf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Mf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function Lf(r){return Sa(JSON.stringify({version:2,heartbeats:r})).length}function Bv(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $v(r){Vn(new Kt("platform-logger",e=>new QE(e),"PRIVATE")),Vn(new Kt("heartbeat",e=>new Fv(e),"PRIVATE")),bt(Pa,Bl,r),bt(Pa,Bl,"esm2020"),bt("fire-js","")}$v("");const qv=Object.freeze(Object.defineProperty({__proto__:null,FirebaseError:nt,SDK_VERSION:zn,_DEFAULT_ENTRY_NAME:xn,_addComponent:js,_addOrOverwriteComponent:sm,_apps:Nn,_clearComponents:Sv,_components:hi,_getProvider:om,_isFirebaseApp:Uu,_isFirebaseServerApp:me,_isFirebaseServerAppSettings:am,_registerComponent:Vn,_removeServiceInstance:Av,_serverApps:ui,deleteApp:$u,getApp:kv,getApps:Dv,initializeApp:Bu,initializeServerApp:Cv,onLog:lm,registerVersion:bt,setLogLevel:um},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zv{constructor(e,t){this._delegate=e,this.firebase=t,js(e,new Kt("app-compat",()=>this,"PUBLIC")),this.container=e.container}get automaticDataCollectionEnabled(){return this._delegate.automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this._delegate.automaticDataCollectionEnabled=e}get name(){return this._delegate.name}get options(){return this._delegate.options}delete(){return new Promise(e=>{this._delegate.checkDestroyed(),e()}).then(()=>(this.firebase.INTERNAL.removeApp(this.name),$u(this._delegate)))}_getService(e,t=xn){var i;this._delegate.checkDestroyed();const n=this._delegate.container.getProvider(e);return!n.isInitialized()&&((i=n.getComponent())==null?void 0:i.instantiationMode)==="EXPLICIT"&&n.initialize(),n.getImmediate({identifier:t})}_removeServiceInstance(e,t=xn){this._delegate.container.getProvider(e).clearInstance(t)}_addComponent(e){js(this._delegate,e)}_addOrOverwriteComponent(e){sm(this._delegate,e)}toJSON(){return{name:this.name,automaticDataCollectionEnabled:this.automaticDataCollectionEnabled,options:this.options}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Kv={"no-app":"No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance."},Uf=new xr("app-compat","Firebase",Kv);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jv(r){const e={},t={__esModule:!0,initializeApp:s,app:i,registerVersion:bt,setLogLevel:um,onLog:lm,apps:null,SDK_VERSION:zn,INTERNAL:{registerComponent:c,removeApp:n,useAsService:l,modularAPIs:qv}};t.default=t,Object.defineProperty(t,"apps",{get:o});function n(u){delete e[u]}function i(u){if(u=u||xn,!kf(e,u))throw Uf.create("no-app",{appName:u});return e[u]}i.App=r;function s(u,d={}){const f=Bu(u,d);if(kf(e,f.name))return e[f.name];const g=new r(f,t);return e[f.name]=g,g}function o(){return Object.keys(e).map(u=>e[u])}function c(u){const d=u.name,f=d.replace("-compat","");if(Vn(u)&&u.type==="PUBLIC"){const g=(_=i())=>{if(typeof _[f]!="function")throw Uf.create("invalid-app-argument",{appName:d});return _[f]()};u.serviceProps!==void 0&&Ra(g,u.serviceProps),t[f]=g,r.prototype[f]=function(..._){return this._getService.bind(this,d).apply(this,u.multipleInstances?_:[])}}return u.type==="PUBLIC"?t[f]:null}function l(u,d){return d==="serverAuth"?null:d}return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fm(){const r=jv(zv);r.INTERNAL={...r.INTERNAL,createFirebaseNamespace:fm,extendNamespace:e,createSubscribe:em,ErrorFactory:xr,deepExtend:Ra};function e(t){Ra(r,t)}return r}const Gv=fm();/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bf=new rc("@firebase/app-compat"),Wv="@firebase/app-compat",Hv="0.5.6";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qv(r){bt(Wv,Hv,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */try{const r=Nu();if(r.firebase!==void 0){Bf.warn(`
      Warning: Firebase is already defined in the global scope. Please make sure
      Firebase library is only loaded once.
    `);const e=r.firebase.SDK_VERSION;e&&e.indexOf("LITE")>=0&&Bf.warn(`
        Warning: You are trying to load Firebase while using Firebase Performance standalone script.
        You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
        `)}}catch{}const De=Gv;Qv();var Yv="firebase",Jv="12.7.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */De.registerVersion(Yv,Jv,"app-compat");const us={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",TWITTER:"twitter.com"},qr={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xv(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function pm(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Zv=Xv,eT=pm,gm=new xr("auth","Firebase",pm());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ca=new rc("@firebase/auth");function tT(r,...e){Ca.logLevel<=X.WARN&&Ca.warn(`Auth (${zn}): ${r}`,...e)}function ua(r,...e){Ca.logLevel<=X.ERROR&&Ca.error(`Auth (${zn}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ke(r,...e){throw zu(r,...e)}function Ve(r,...e){return zu(r,...e)}function qu(r,e,t){const n={...eT(),[e]:t};return new xr("auth","Firebase",n).create(e,{appName:r.name})}function Ue(r){return qu(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Mi(r,e,t){const n=t;if(!(e instanceof n))throw n.name!==e.constructor.name&&Ke(r,"argument-error"),qu(r,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function zu(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return gm.create(r,...e)}function O(r,e,...t){if(!r)throw zu(e,...t)}function Lt(r){const e="INTERNAL ASSERTION FAILED: "+r;throw ua(e),new Error(e)}function Rt(r,e){r||Lt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ws(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.href)||""}function Ku(){return $f()==="http:"||$f()==="https:"}function $f(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nT(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Ku()||Yg()||"connection"in navigator)?navigator.onLine:!0}function rT(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _o{constructor(e,t){this.shortDelay=e,this.longDelay=t,Rt(t>e,"Short delay should be less than long delay!"),this.isMobile=IE()||Mu()}get(){return nT()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ju(r,e){Rt(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mm{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Lt("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Lt("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Lt("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iT={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sT=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],oT=new _o(3e4,6e4);function be(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function Ae(r,e,t,n,i={}){return ym(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=Oi({key:r.config.apiKey,...o}).slice(1),l=await r._getAdditionalHeaders();l["Content-Type"]="application/json",r.languageCode&&(l["X-Firebase-Locale"]=r.languageCode);const u={method:e,headers:l,...s};return vE()||(u.referrerPolicy="no-referrer"),r.emulatorConfig&&Vi(r.emulatorConfig.host)&&(u.credentials="include"),mm.fetch()(await _m(r,r.config.apiHost,t,c),u)})}async function ym(r,e,t){r._canInitEmulator=!1;const n={...iT,...e};try{const i=new cT(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw vs(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[l,u]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw vs(r,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw vs(r,"email-already-in-use",o);if(l==="USER_DISABLED")throw vs(r,"user-disabled",o);const d=n[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(u)throw qu(r,d,u);Ke(r,d)}}catch(i){if(i instanceof nt)throw i;Ke(r,"network-request-failed",{message:String(i)})}}async function rn(r,e,t,n,i={}){const s=await Ae(r,e,t,n,i);return"mfaPendingCredential"in s&&Ke(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function _m(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?ju(r.config,i):`${r.config.apiScheme}://${i}`;return sT.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function aT(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class cT{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(Ve(this.auth,"network-request-failed")),oT.get())})}}function vs(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=Ve(r,e,n);return i.customData._tokenResponse=t,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qf(r){return r!==void 0&&r.getResponse!==void 0}function zf(r){return r!==void 0&&r.enterprise!==void 0}class wm{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return aT(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lT(r){return(await Ae(r,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function Im(r,e){return Ae(r,"GET","/v2/recaptchaConfig",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function uT(r,e){return Ae(r,"POST","/v1/accounts:delete",e)}async function hT(r,e){return Ae(r,"POST","/v1/accounts:update",e)}async function ka(r,e){return Ae(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ks(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function dT(r,e=!1){const t=G(r),n=await t.getIdToken(e),i=ic(n);O(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:ks(Tl(i.auth_time)),issuedAtTime:ks(Tl(i.iat)),expirationTime:ks(Tl(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function Tl(r){return Number(r)*1e3}function ic(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return ua("JWT malformed, contained fewer than 3 sections"),null;try{const i=xu(t);return i?JSON.parse(i):(ua("Failed to decode base64 JWT payload"),null)}catch(i){return ua("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Kf(r){const e=ic(r);return O(e,"internal-error"),O(typeof e.exp<"u","internal-error"),O(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zt(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof nt&&fT(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function fT({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pT{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $l{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=ks(this.lastLoginAt),this.creationTime=ks(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hs(r){var f;const e=r.auth,t=await r.getIdToken(),n=await Zt(r,ka(e,{idToken:t}));O(n==null?void 0:n.users.length,e,"internal-error");const i=n.users[0];r._notifyReloadListener(i);const s=(f=i.providerUserInfo)!=null&&f.length?Em(i.providerUserInfo):[],o=mT(r.providerData,s),c=r.isAnonymous,l=!(r.email&&i.passwordHash)&&!(o!=null&&o.length),u=c?l:!1,d={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new $l(i.createdAt,i.lastLoginAt),isAnonymous:u};Object.assign(r,d)}async function gT(r){const e=G(r);await Hs(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function mT(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function Em(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function yT(r,e){const t=await ym(r,{},async()=>{const n=Oi({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await _m(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:n};return r.emulatorConfig&&Vi(r.emulatorConfig.host)&&(l.credentials="include"),mm.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function _T(r,e){return Ae(r,"POST","/v2/accounts:revokeToken",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ii{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){O(e.idToken,"internal-error"),O(typeof e.idToken<"u","internal-error"),O(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Kf(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){O(e.length!==0,"internal-error");const t=Kf(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(O(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await yT(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new ii;return n&&(O(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(O(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(O(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new ii,this.toJSON())}_performRefresh(){return Lt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yn(r,e){O(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class Tt{constructor({uid:e,auth:t,stsTokenManager:n,...i}){this.providerId="firebase",this.proactiveRefresh=new pT(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new $l(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Zt(this,this.stsTokenManager.getToken(this.auth,e));return O(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return dT(this,e)}reload(){return gT(this)}_assign(e){this!==e&&(O(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Tt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){O(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Hs(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(me(this.auth.app))return Promise.reject(Ue(this.auth));const e=await this.getIdToken();return await Zt(this,uT(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,u=t.createdAt??void 0,d=t.lastLoginAt??void 0,{uid:f,emailVerified:g,isAnonymous:_,providerData:R,stsTokenManager:k}=t;O(f&&k,e,"internal-error");const T=ii.fromJSON(this.name,k);O(typeof f=="string",e,"internal-error"),yn(n,e.name),yn(i,e.name),O(typeof g=="boolean",e,"internal-error"),O(typeof _=="boolean",e,"internal-error"),yn(s,e.name),yn(o,e.name),yn(c,e.name),yn(l,e.name),yn(u,e.name),yn(d,e.name);const x=new Tt({uid:f,auth:e,email:i,emailVerified:g,displayName:n,isAnonymous:_,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:T,createdAt:u,lastLoginAt:d});return R&&Array.isArray(R)&&(x.providerData=R.map(M=>({...M}))),l&&(x._redirectEventId=l),x}static async _fromIdTokenResponse(e,t,n=!1){const i=new ii;i.updateFromServerResponse(t);const s=new Tt({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Hs(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];O(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?Em(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new ii;c.updateFromIdToken(n);const l=new Tt({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),u={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new $l(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(l,u),l}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jf=new Map;function gt(r){Rt(r instanceof Function,"Expected a class definition");let e=jf.get(r);return e?(Rt(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,jf.set(r,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vm{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}vm.type="NONE";const di=vm;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mr(r,e,t){return`firebase:${r}:${e}:${t}`}class si{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=mr(this.userKey,i.apiKey,s),this.fullPersistenceKey=mr("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ka(this.auth,{idToken:e}).catch(()=>{});return t?Tt._fromGetAccountInfoResponse(this.auth,t,e):null}return Tt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new si(gt(di),e,n);const i=(await Promise.all(t.map(async u=>{if(await u._isAvailable())return u}))).filter(u=>u);let s=i[0]||gt(di);const o=mr(n,e.config.apiKey,e.name);let c=null;for(const u of t)try{const d=await u._get(o);if(d){let f;if(typeof d=="string"){const g=await ka(e,{idToken:d}).catch(()=>{});if(!g)break;f=await Tt._fromGetAccountInfoResponse(e,g,d)}else f=Tt._fromJSON(e,d);u!==s&&(c=f),s=u;break}}catch{}const l=i.filter(u=>u._shouldAllowMigration);return!s._shouldAllowMigration||!l.length?new si(s,e,n):(s=l[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async u=>{if(u!==s)try{await u._remove(o)}catch{}})),new si(s,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gf(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Sm(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Tm(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Rm(e))return"Blackberry";if(Pm(e))return"Webos";if(bm(e))return"Safari";if((e.includes("chrome/")||Am(e))&&!e.includes("edge/"))return"Chrome";if(wo(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function Tm(r=we()){return/firefox\//i.test(r)}function bm(r=we()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Am(r=we()){return/crios\//i.test(r)}function Sm(r=we()){return/iemobile/i.test(r)}function wo(r=we()){return/android/i.test(r)}function Rm(r=we()){return/blackberry/i.test(r)}function Pm(r=we()){return/webos/i.test(r)}function Io(r=we()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function wT(r=we()){return/(iPad|iPhone|iPod).*OS 7_\d/i.test(r)||/(iPad|iPhone|iPod).*OS 8_\d/i.test(r)}function IT(r=we()){var e;return Io(r)&&!!((e=window.navigator)!=null&&e.standalone)}function ET(){return Jg()&&document.documentMode===10}function Cm(r=we()){return Io(r)||wo(r)||Pm(r)||Rm(r)||/windows phone/i.test(r)||Sm(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function km(r,e=[]){let t;switch(r){case"Browser":t=Gf(we());break;case"Worker":t=`${Gf(we())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${zn}/${n}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vT{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const l=e(s);o(l)}catch(l){c(l)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function TT(r,e={}){return Ae(r,"GET","/v2/passwordPolicy",be(r,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bT=6;class AT{constructor(e){var n;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??bT,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((n=e.allowedNonAlphanumericCharacters)==null?void 0:n.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ST{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Wf(this),this.idTokenSubscription=new Wf(this),this.beforeStateQueue=new vT(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=gm,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=gt(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await si.create(this,e),(n=this._resolvePersistenceManagerAvailable)==null||n.call(this),!this._deleted)){if((i=this._popupRedirectResolver)!=null&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)==null?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ka(this,{idToken:e}),n=await Tt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var s;if(me(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(s=this.redirectUser)==null?void 0:s._redirectEventId,c=n==null?void 0:n._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(n=l.user,i=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(n)}catch(o){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return O(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Hs(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=rT()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(me(this.app))return Promise.reject(Ue(this));const t=e?G(e):null;return t&&O(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&O(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return me(this.app)?Promise.reject(Ue(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return me(this.app)?Promise.reject(Ue(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(gt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await TT(this),t=new AT(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new xr("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await _T(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&gt(e)||this._popupRedirectResolver;O(t,this,"argument-error"),this.redirectPersistenceManager=await si.create(this,[gt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)==null?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(O(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,n,i);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return O(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=km(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var i;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((i=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:i.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){var t;if(me(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&tT(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function Ie(r){return G(r)}class Wf{constructor(e){this.auth=e,this.observer=null,this.addObserver=em(t=>this.observer=t)}get next(){return O(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Eo={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function RT(r){Eo=r}function Gu(r){return Eo.loadJS(r)}function PT(){return Eo.recaptchaV2Script}function CT(){return Eo.recaptchaEnterpriseScript}function kT(){return Eo.gapiScript}function Dm(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const DT=500,xT=6e4,na=1e12;class NT{constructor(e){this.auth=e,this.counter=na,this._widgets=new Map}render(e,t){const n=this.counter;return this._widgets.set(n,new MT(e,this.auth.name,t||{})),this.counter++,n}reset(e){var n;const t=e||na;(n=this._widgets.get(t))==null||n.delete(),this._widgets.delete(t)}getResponse(e){var n;const t=e||na;return((n=this._widgets.get(t))==null?void 0:n.getResponse())||""}async execute(e){var n;const t=e||na;return(n=this._widgets.get(t))==null||n.execute(),""}}class VT{constructor(){this.enterprise=new OT}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class OT{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class MT{constructor(e,t,n){this.params=n,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;O(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=FT(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},xT)},DT))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function FT(r){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let n=0;n<r;n++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const LT="recaptcha-enterprise",Ds="NO_RECAPTCHA";class xm{constructor(e){this.type=LT,this.auth=Ie(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{Im(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(l=>{if(l.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const u=new wm(l);return s.tenantId==null?s._agentRecaptchaConfig=u:s._tenantRecaptchaConfigs[s.tenantId]=u,o(u.siteKey)}}).catch(l=>{c(l)})})}function i(s,o,c){const l=window.grecaptcha;zf(l)?l.enterprise.ready(()=>{l.enterprise.execute(s,{action:e}).then(u=>{o(u)}).catch(()=>{o(Ds)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new VT().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&zf(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let l=CT();l.length!==0&&(l+=c),Gu(l).then(()=>{i(c,s,o)}).catch(u=>{o(u)})}}).catch(c=>{o(c)})})}}async function hs(r,e,t,n=!1,i=!1){const s=new xm(r);let o;if(i)o=Ds;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const l=c.phoneEnrollmentInfo.phoneNumber,u=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:l,recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const l=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function Rn(r,e,t,n,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if((s=r._getRecaptchaConfig())!=null&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await hs(r,e,t,t==="getOobCode");return n(r,c)}else return n(r,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await hs(r,e,t,t==="getOobCode");return n(r,l)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if((o=r._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await hs(r,e,t);return n(r,c).catch(async l=>{var u;if(((u=r._getRecaptchaConfig())==null?void 0:u.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(l.code==="auth/missing-recaptcha-token"||l.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await hs(r,e,t,!1,!0);return n(r,d)}return Promise.reject(l)})}else{const c=await hs(r,e,t,!1,!0);return n(r,c)}else return Promise.reject(i+" provider is not supported.")}async function UT(r){const e=Ie(r),t=await Im(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),n=new wm(t);e.tenantId==null?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,n.isAnyProviderEnabled()&&new xm(e).verify()}function BT(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(gt);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function $T(r,e,t){const n=Ie(r);O(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=Nm(e),{host:o,port:c}=qT(e),l=c===null?"":`:${c}`,u={url:`${s}//${o}${l}/`},d=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){O(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),O(Dn(u,n.config.emulator)&&Dn(d,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=u,n.emulatorConfig=d,n.settings.appVerificationDisabledForTesting=!0,Vi(o)?(Wg(`${s}//${o}${l}`),Hg("Auth",!0)):i||zT()}function Nm(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function qT(r){const e=Nm(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:Hf(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:Hf(o)}}}function Hf(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function zT(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fi{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Lt("not implemented")}_getIdTokenResponse(e){return Lt("not implemented")}_linkToIdToken(e,t){return Lt("not implemented")}_getReauthenticationResolver(e){return Lt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vm(r,e){return Ae(r,"POST","/v1/accounts:resetPassword",be(r,e))}async function KT(r,e){return Ae(r,"POST","/v1/accounts:update",e)}async function jT(r,e){return Ae(r,"POST","/v1/accounts:signUp",e)}async function GT(r,e){return Ae(r,"POST","/v1/accounts:update",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function WT(r,e){return rn(r,"POST","/v1/accounts:signInWithPassword",be(r,e))}async function sc(r,e){return Ae(r,"POST","/v1/accounts:sendOobCode",be(r,e))}async function HT(r,e){return sc(r,e)}async function QT(r,e){return sc(r,e)}async function YT(r,e){return sc(r,e)}async function JT(r,e){return sc(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function XT(r,e){return rn(r,"POST","/v1/accounts:signInWithEmailLink",be(r,e))}async function ZT(r,e){return rn(r,"POST","/v1/accounts:signInWithEmailLink",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qs extends Fi{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new Qs(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Qs(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Rn(e,t,"signInWithPassword",WT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return XT(e,{email:this._email,oobCode:this._password});default:Ke(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Rn(e,n,"signUpPassword",jT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return ZT(e,{idToken:t,email:this._email,oobCode:this._password});default:Ke(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Yt(r,e){return rn(r,"POST","/v1/accounts:signInWithIdp",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eb="http://localhost";class jt extends Fi{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new jt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):Ke("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,...s}=t;if(!n||!i)return null;const o=new jt(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Yt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Yt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Yt(e,t)}buildRequest(){const e={requestUri:eb,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Oi(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qf(r,e){return Ae(r,"POST","/v1/accounts:sendVerificationCode",be(r,e))}async function tb(r,e){return rn(r,"POST","/v1/accounts:signInWithPhoneNumber",be(r,e))}async function nb(r,e){const t=await rn(r,"POST","/v1/accounts:signInWithPhoneNumber",be(r,e));if(t.temporaryProof)throw vs(r,"account-exists-with-different-credential",t);return t}const rb={USER_NOT_FOUND:"user-not-found"};async function ib(r,e){const t={...e,operation:"REAUTH"};return rn(r,"POST","/v1/accounts:signInWithPhoneNumber",be(r,t),rb)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yr extends Fi{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new yr({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new yr({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return tb(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return nb(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return ib(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:n,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:n,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s}=e;return!n&&!t&&!i&&!s?null:new yr({verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sb(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function ob(r){const e=ti(Es(r)).link,t=e?ti(Es(e)).deep_link_id:null,n=ti(Es(r)).deep_link_id;return(n?ti(Es(n)).link:null)||n||t||e||r}class oc{constructor(e){const t=ti(Es(e)),n=t.apiKey??null,i=t.oobCode??null,s=sb(t.mode??null);O(n&&i&&s,"argument-error"),this.apiKey=n,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=ob(e);try{return new oc(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kn{constructor(){this.providerId=Kn.PROVIDER_ID}static credential(e,t){return Qs._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=oc.parseLink(t);return O(n,"argument-error"),Qs._fromEmailAndCode(e,n.code,n.tenantId)}}Kn.PROVIDER_ID="password";Kn.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Kn.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sn{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Li extends sn{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class oi extends Li{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return O("providerId"in t&&"signInMethod"in t,"argument-error"),jt._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return O(e.idToken||e.accessToken,"argument-error"),jt._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return oi.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return oi.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!n&&!i&&!t&&!s||!c)return null;try{return new oi(c)._credential({idToken:t,accessToken:n,nonce:o,pendingToken:s})}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vt extends Li{constructor(){super("facebook.com")}static credential(e){return jt._fromParams({providerId:Vt.PROVIDER_ID,signInMethod:Vt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Vt.credentialFromTaggedObject(e)}static credentialFromError(e){return Vt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Vt.credential(e.oauthAccessToken)}catch{return null}}}Vt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Vt.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ot extends Li{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return jt._fromParams({providerId:Ot.PROVIDER_ID,signInMethod:Ot.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Ot.credentialFromTaggedObject(e)}static credentialFromError(e){return Ot.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Ot.credential(t,n)}catch{return null}}}Ot.GOOGLE_SIGN_IN_METHOD="google.com";Ot.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt extends Li{constructor(){super("github.com")}static credential(e){return jt._fromParams({providerId:Mt.PROVIDER_ID,signInMethod:Mt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Mt.credentialFromTaggedObject(e)}static credentialFromError(e){return Mt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Mt.credential(e.oauthAccessToken)}catch{return null}}}Mt.GITHUB_SIGN_IN_METHOD="github.com";Mt.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ab="http://localhost";class fi extends Fi{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return Yt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Yt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Yt(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,pendingToken:s}=t;return!n||!i||!s||n!==i?null:new fi(n,s)}static _create(e,t){return new fi(e,t)}buildRequest(){return{requestUri:ab,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cb="saml.";class Da extends sn{constructor(e){O(e.startsWith(cb),"argument-error"),super(e)}static credentialFromResult(e){return Da.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return Da.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=fi.fromJSON(e);return O(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:n}=e;if(!t||!n)return null;try{return fi._create(n,t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft extends Li{constructor(){super("twitter.com")}static credential(e,t){return jt._fromParams({providerId:Ft.PROVIDER_ID,signInMethod:Ft.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Ft.credentialFromTaggedObject(e)}static credentialFromError(e){return Ft.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return Ft.credential(t,n)}catch{return null}}}Ft.TWITTER_SIGN_IN_METHOD="twitter.com";Ft.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Om(r,e){return rn(r,"POST","/v1/accounts:signUp",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Et{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await Tt._fromIdTokenResponse(e,n,i),o=Yf(n);return new Et({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=Yf(n);return new Et({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function Yf(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lb(r){var i;if(me(r.app))return Promise.reject(Ue(r));const e=Ie(r);if(await e._initializationPromise,(i=e.currentUser)!=null&&i.isAnonymous)return new Et({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await Om(e,{returnSecureToken:!0}),n=await Et._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(n.user),n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa extends nt{constructor(e,t,n,i){super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,xa.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new xa(e,t,n,i)}}function Mm(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?xa._fromErrorAndOperation(r,s,e,n):s})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fm(r){return new Set(r.map(({providerId:e})=>e).filter(e=>!!e))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ub(r,e){const t=G(r);await ac(!0,t,e);const{providerUserInfo:n}=await hT(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=Fm(n||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function Wu(r,e,t=!1){const n=await Zt(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return Et._forOperation(r,"link",n)}async function ac(r,e,t){await Hs(e);const n=Fm(e.providerData),i=r===!1?"provider-already-linked":"no-such-provider";O(n.has(t)===r,e.auth,i)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lm(r,e,t=!1){const{auth:n}=r;if(me(n.app))return Promise.reject(Ue(n));const i="reauthenticate";try{const s=await Zt(r,Mm(n,i,e,r),t);O(s.idToken,n,"internal-error");const o=ic(s.idToken);O(o,n,"internal-error");const{sub:c}=o;return O(r.uid===c,n,"user-mismatch"),Et._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&Ke(n,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Um(r,e,t=!1){if(me(r.app))return Promise.reject(Ue(r));const n="signIn",i=await Mm(r,n,e),s=await Et._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function cc(r,e){return Um(Ie(r),e)}async function Bm(r,e){const t=G(r);return await ac(!1,t,e.providerId),Wu(t,e)}async function $m(r,e){return Lm(G(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hb(r,e){return rn(r,"POST","/v1/accounts:signInWithCustomToken",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function db(r,e){if(me(r.app))return Promise.reject(Ue(r));const t=Ie(r),n=await hb(t,{token:e,returnSecureToken:!0}),i=await Et._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vo{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Hu._fromServerResponse(e,t):"totpInfo"in t?Qu._fromServerResponse(e,t):Ke(e,"internal-error")}}class Hu extends vo{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Hu(t)}}class Qu extends vo{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new Qu(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lc(r,e,t){var n;O(((n=t.url)==null?void 0:n.length)>0,r,"invalid-continue-uri"),O(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),O(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(O(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(O(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Yu(r){const e=Ie(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function fb(r,e,t){const n=Ie(r),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&lc(n,i,t),await Rn(n,i,"getOobCode",QT,"EMAIL_PASSWORD_PROVIDER")}async function pb(r,e,t){await Vm(G(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Yu(r),n})}async function gb(r,e){await GT(G(r),{oobCode:e})}async function qm(r,e){const t=G(r),n=await Vm(t,{oobCode:e}),i=n.requestType;switch(O(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":O(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":O(n.mfaInfo,t,"internal-error");default:O(n.email,t,"internal-error")}let s=null;return n.mfaInfo&&(s=vo._fromServerResponse(Ie(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:s},operation:i}}async function mb(r,e){const{data:t}=await qm(G(r),e);return t.email}async function yb(r,e,t){if(me(r.app))return Promise.reject(Ue(r));const n=Ie(r),o=await Rn(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",Om,"EMAIL_PASSWORD_PROVIDER").catch(l=>{throw l.code==="auth/password-does-not-meet-requirements"&&Yu(r),l}),c=await Et._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function _b(r,e,t){return me(r.app)?Promise.reject(Ue(r)):cc(G(r),Kn.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Yu(r),n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wb(r,e,t){const n=Ie(r),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){O(c.handleCodeInApp,n,"argument-error"),c&&lc(n,o,c)}s(i,t),await Rn(n,i,"getOobCode",YT,"EMAIL_PASSWORD_PROVIDER")}function Ib(r,e){const t=oc.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function Eb(r,e,t){if(me(r.app))return Promise.reject(Ue(r));const n=G(r),i=Kn.credentialWithLink(e,t||Ws());return O(i._tenantId===(n.tenantId||null),n,"tenant-id-mismatch"),cc(n,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function vb(r,e){return Ae(r,"POST","/v1/accounts:createAuthUri",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Tb(r,e){const t=Ku()?Ws():"http://localhost",n={identifier:e,continueUri:t},{signinMethods:i}=await vb(G(r),n);return i||[]}async function bb(r,e){const t=G(r),i={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&lc(t.auth,i,e);const{email:s}=await HT(t.auth,i);s!==r.email&&await r.reload()}async function Ab(r,e,t){const n=G(r),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await r.getIdToken(),newEmail:e};t&&lc(n.auth,s,t);const{email:o}=await JT(n.auth,s);o!==r.email&&await r.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Sb(r,e){return Ae(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rb(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=G(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Zt(n,Sb(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function Pb(r,e){const t=G(r);return me(t.auth.app)?Promise.reject(Ue(t.auth)):zm(t,e,null)}function Cb(r,e){return zm(G(r),null,e)}async function zm(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Zt(r,KT(n,s));await r._updateTokensIfNecessary(o,!0)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kb(r){var i,s;if(!r)return null;const{providerId:e}=r,t=r.rawUserInfo?JSON.parse(r.rawUserInfo):{},n=r.isNewUser||r.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(r!=null&&r.idToken)){const o=(s=(i=ic(r.idToken))==null?void 0:i.firebase)==null?void 0:s.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new ai(n,c)}}if(!e)return null;switch(e){case"facebook.com":return new Db(n,t);case"github.com":return new xb(n,t);case"google.com":return new Nb(n,t);case"twitter.com":return new Vb(n,t,r.screenName||null);case"custom":case"anonymous":return new ai(n,null);default:return new ai(n,e,t)}}class ai{constructor(e,t,n={}){this.isNewUser=e,this.providerId=t,this.profile=n}}class Km extends ai{constructor(e,t,n,i){super(e,t,n),this.username=i}}class Db extends ai{constructor(e,t){super(e,"facebook.com",t)}}class xb extends Km{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class Nb extends ai{constructor(e,t){super(e,"google.com",t)}}class Vb extends Km{constructor(e,t,n){super(e,"twitter.com",t,n)}}function Ob(r){const{user:e,_tokenResponse:t}=r;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:kb(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr{constructor(e,t,n){this.type=e,this.credential=t,this.user=n}static _fromIdtoken(e,t){return new dr("enroll",e,t)}static _fromMfaPendingCredential(e){return new dr("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,n;if(e!=null&&e.multiFactorSession){if((t=e.multiFactorSession)!=null&&t.pendingCredential)return dr._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if((n=e.multiFactorSession)!=null&&n.idToken)return dr._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ju{constructor(e,t,n){this.session=e,this.hints=t,this.signInResolver=n}static _fromError(e,t){const n=Ie(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>vo._fromServerResponse(n,c));O(i.mfaPendingCredential,n,"internal-error");const o=dr._fromMfaPendingCredential(i.mfaPendingCredential);return new Ju(o,s,async c=>{const l=await c._process(n,o);delete i.mfaInfo,delete i.mfaPendingCredential;const u={...i,idToken:l.idToken,refreshToken:l.refreshToken};switch(t.operationType){case"signIn":const d=await Et._fromIdTokenResponse(n,t.operationType,u);return await n._updateCurrentUser(d.user),d;case"reauthenticate":return O(t.user,n,"internal-error"),Et._forOperation(t.user,t.operationType,u);default:Ke(n,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function Mb(r,e){var i;const t=G(r),n=e;return O(e.customData.operationType,t,"argument-error"),O((i=n.customData._serverResponse)==null?void 0:i.mfaPendingCredential,t,"argument-error"),Ju._fromError(t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jf(r,e){return Ae(r,"POST","/v2/accounts/mfaEnrollment:start",be(r,e))}function Fb(r,e){return Ae(r,"POST","/v2/accounts/mfaEnrollment:finalize",be(r,e))}function Lb(r,e){return Ae(r,"POST","/v2/accounts/mfaEnrollment:withdraw",be(r,e))}class Xu{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(n=>vo._fromServerResponse(e.auth,n)))})}static _fromUser(e){return new Xu(e)}async getSession(){return dr._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const n=e,i=await this.getSession(),s=await Zt(this.user,n._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,n=await this.user.getIdToken();try{const i=await Zt(this.user,Lb(this.user.auth,{idToken:n,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const bl=new WeakMap;function Ub(r){const e=G(r);return bl.has(e)||bl.set(e,Xu._fromUser(e)),bl.get(e)}const Na="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jm{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Na,"1"),this.storage.removeItem(Na),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bb=1e3,$b=10;class Gm extends jm{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Cm(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);ET()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,$b):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},Bb)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Gm.type="LOCAL";const Zu=Gm;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wm extends jm{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Wm.type="SESSION";const Ir=Wm;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qb(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new uc(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async u=>u(t.origin,s)),l=await qb(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}uc.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function To(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zb{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,l)=>{const u=To("",20);i.port1.start();const d=setTimeout(()=>{l(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(f){const g=f;if(g.data.eventId===u)switch(g.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(d),clearTimeout(s),l(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:u,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ke(){return window}function Kb(r){ke().location.href=r}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function eh(){return typeof ke().WorkerGlobalScope<"u"&&typeof ke().importScripts=="function"}async function jb(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Gb(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)==null?void 0:r.controller)||null}function Wb(){return eh()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hm="firebaseLocalStorageDb",Hb=1,Va="firebaseLocalStorage",Qm="fbase_key";class bo{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function hc(r,e){return r.transaction([Va],e?"readwrite":"readonly").objectStore(Va)}function Qb(){const r=indexedDB.deleteDatabase(Hm);return new bo(r).toPromise()}function ql(){const r=indexedDB.open(Hm,Hb);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(Va,{keyPath:Qm})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(Va)?e(n):(n.close(),await Qb(),e(await ql()))})})}async function Xf(r,e,t){const n=hc(r,!0).put({[Qm]:e,value:t});return new bo(n).toPromise()}async function Yb(r,e){const t=hc(r,!1).get(e),n=await new bo(t).toPromise();return n===void 0?null:n.value}function Zf(r,e){const t=hc(r,!0).delete(e);return new bo(t).toPromise()}const Jb=800,Xb=3;class Ym{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await ql(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>Xb)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return eh()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=uc._getInstance(Wb()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await jb(),!this.activeServiceWorker)return;this.sender=new zb(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(n=e[0])!=null&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Gb()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await ql();return await Xf(e,Na,"1"),await Zf(e,Na),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Xf(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>Yb(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Zf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=hc(i,!1).getAll();return new bo(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Jb)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Ym.type="LOCAL";const Ys=Ym;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ep(r,e){return Ae(r,"POST","/v2/accounts/mfaSignIn:start",be(r,e))}function Zb(r,e){return Ae(r,"POST","/v2/accounts/mfaSignIn:finalize",be(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Al=Dm("rcb"),eA=new _o(3e4,6e4);class tA{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=ke().grecaptcha)!=null&&e.render)}load(e,t=""){return O(nA(t),e,"argument-error"),this.shouldResolveImmediately(t)&&qf(ke().grecaptcha)?Promise.resolve(ke().grecaptcha):new Promise((n,i)=>{const s=ke().setTimeout(()=>{i(Ve(e,"network-request-failed"))},eA.get());ke()[Al]=()=>{ke().clearTimeout(s),delete ke()[Al];const c=ke().grecaptcha;if(!c||!qf(c)){i(Ve(e,"internal-error"));return}const l=c.render;c.render=(u,d)=>{const f=l(u,d);return this.counter++,f},this.hostLanguage=t,n(c)};const o=`${PT()}?${Oi({onload:Al,render:"explicit",hl:t})}`;Gu(o).catch(()=>{clearTimeout(s),i(Ve(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=ke().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function nA(r){return r.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(r)}class rA{async load(e){return new NT(e)}clearedOneInstance(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xs="recaptcha",iA={theme:"light",type:"image"};let sA=class{constructor(e,t,n={...iA}){this.parameters=n,this.type=xs,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=Ie(e),this.isInvisible=this.parameters.size==="invisible",O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;O(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new rA:new tA,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),n=t.getResponse(e);return n||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){O(!this.parameters.sitekey,this.auth,"argument-error"),O(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(n=>n(t)),typeof e=="function")e(t);else if(typeof e=="string"){const n=ke()[e];typeof n=="function"&&n(t)}}}assertNotDestroyed(){O(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){O(Ku()&&!eh(),this.auth,"internal-error"),await oA(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await lT(this.auth);O(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return O(this.recaptcha,this.auth,"internal-error"),this.recaptcha}};function oA(){let r=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}r=()=>e(),window.addEventListener("load",r)}).catch(e=>{throw r&&window.removeEventListener("load",r),e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class th{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=yr._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function aA(r,e,t){if(me(r.app))return Promise.reject(Ue(r));const n=Ie(r),i=await dc(n,e,G(t));return new th(i,s=>cc(n,s))}async function cA(r,e,t){const n=G(r);await ac(!1,n,"phone");const i=await dc(n.auth,e,G(t));return new th(i,s=>Bm(n,s))}async function lA(r,e,t){const n=G(r);if(me(n.auth.app))return Promise.reject(Ue(n.auth));const i=await dc(n.auth,e,G(t));return new th(i,s=>$m(n,s))}async function dc(r,e,t){var n;if(!r._getRecaptchaConfig())try{await UT(r)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){O(s.type==="enroll",r,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await Rn(r,o,"mfaSmsEnrollment",async(d,f)=>{if(f.phoneEnrollmentInfo.captchaResponse===Ds){O((t==null?void 0:t.type)===xs,d,"argument-error");const g=await Sl(d,f,t);return Jf(d,g)}return Jf(d,f)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{O(s.type==="signin",r,"internal-error");const o=((n=i.multiFactorHint)==null?void 0:n.uid)||i.multiFactorUid;O(o,r,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await Rn(r,c,"mfaSmsSignIn",async(f,g)=>{if(g.phoneSignInInfo.captchaResponse===Ds){O((t==null?void 0:t.type)===xs,f,"argument-error");const _=await Sl(f,g,t);return ep(f,_)}return ep(f,g)},"PHONE_PROVIDER").catch(f=>Promise.reject(f))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await Rn(r,s,"sendVerificationCode",async(u,d)=>{if(d.captchaResponse===Ds){O((t==null?void 0:t.type)===xs,u,"argument-error");const f=await Sl(u,d,t);return Qf(u,f)}return Qf(u,d)},"PHONE_PROVIDER").catch(u=>Promise.reject(u))).sessionInfo}}finally{t==null||t._reset()}}async function uA(r,e){const t=G(r);if(me(t.auth.app))return Promise.reject(Ue(t.auth));await Wu(t,e)}async function Sl(r,e,t){O(t.type===xs,r,"argument-error");const n=await t.verify();O(typeof n=="string",r,"argument-error");const i={...e};if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,l=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:n,captchaResponse:o,clientType:c,recaptchaVersion:l}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:n,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:n}),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Er=class ha{constructor(e){this.providerId=ha.PROVIDER_ID,this.auth=Ie(e)}verifyPhoneNumber(e,t){return dc(this.auth,e,G(t))}static credential(e,t){return yr._fromVerification(e,t)}static credentialFromResult(e){const t=e;return ha.credentialFromTaggedObject(t)}static credentialFromError(e){return ha.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:n}=e;return t&&n?yr._fromTokenResponse(t,n):null}};Er.PROVIDER_ID="phone";Er.PHONE_SIGN_IN_METHOD="phone";/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nr(r,e){return e?gt(e):(O(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nh extends Fi{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Yt(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Yt(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Yt(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function hA(r){return Um(r.auth,new nh(r),r.bypassAuthState)}function dA(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),Lm(t,new nh(r),r.bypassAuthState)}async function fA(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),Wu(t,new nh(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jm{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(u){this.reject(u)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return hA;case"linkViaPopup":case"linkViaRedirect":return fA;case"reauthViaPopup":case"reauthViaRedirect":return dA;default:Ke(this.auth,"internal-error")}}resolve(e){Rt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Rt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pA=new _o(2e3,1e4);async function gA(r,e,t){if(me(r.app))return Promise.reject(Ve(r,"operation-not-supported-in-this-environment"));const n=Ie(r);Mi(r,e,sn);const i=Nr(n,t);return new Ht(n,"signInViaPopup",e,i).executeNotNull()}async function mA(r,e,t){const n=G(r);if(me(n.auth.app))return Promise.reject(Ve(n.auth,"operation-not-supported-in-this-environment"));Mi(n.auth,e,sn);const i=Nr(n.auth,t);return new Ht(n.auth,"reauthViaPopup",e,i,n).executeNotNull()}async function yA(r,e,t){const n=G(r);Mi(n.auth,e,sn);const i=Nr(n.auth,t);return new Ht(n.auth,"linkViaPopup",e,i,n).executeNotNull()}class Ht extends Jm{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,Ht.currentPopupAction&&Ht.currentPopupAction.cancel(),Ht.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return O(e,this.auth,"internal-error"),e}async onExecution(){Rt(this.filter.length===1,"Popup operations only handle one event");const e=To();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(Ve(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(Ve(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Ht.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if((n=(t=this.authWindow)==null?void 0:t.window)!=null&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(Ve(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,pA.get())};e()}}Ht.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _A="pendingRedirect",Ns=new Map;class wA extends Jm{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Ns.get(this.auth._key());if(!e){try{const n=await IA(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}Ns.set(this.auth._key(),e)}return this.bypassAuthState||Ns.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function IA(r,e){const t=Zm(e),n=Xm(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}async function rh(r,e){return Xm(r)._set(Zm(e),"true")}function EA(){Ns.clear()}function ih(r,e){Ns.set(r._key(),e)}function Xm(r){return gt(r._redirectPersistence)}function Zm(r){return mr(_A,r.config.apiKey,r.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vA(r,e,t){return TA(r,e,t)}async function TA(r,e,t){if(me(r.app))return Promise.reject(Ue(r));const n=Ie(r);Mi(r,e,sn),await n._initializationPromise;const i=Nr(n,t);return await rh(i,n),i._openRedirect(n,e,"signInViaRedirect")}function bA(r,e,t){return AA(r,e,t)}async function AA(r,e,t){const n=G(r);if(Mi(n.auth,e,sn),me(n.auth.app))return Promise.reject(Ue(n.auth));await n.auth._initializationPromise;const i=Nr(n.auth,t);await rh(i,n.auth);const s=await ey(n);return i._openRedirect(n.auth,e,"reauthViaRedirect",s)}function SA(r,e,t){return RA(r,e,t)}async function RA(r,e,t){const n=G(r);Mi(n.auth,e,sn),await n.auth._initializationPromise;const i=Nr(n.auth,t);await ac(!1,n,e.providerId),await rh(i,n.auth);const s=await ey(n);return i._openRedirect(n.auth,e,"linkViaRedirect",s)}async function PA(r,e){return await Ie(r)._initializationPromise,fc(r,e,!1)}async function fc(r,e,t=!1){if(me(r.app))return Promise.reject(Ue(r));const n=Ie(r),i=Nr(n,e),o=await new wA(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}async function ey(r){const e=To(`${r.uid}:::`);return r._redirectEventId=e,await r.auth._setRedirectUser(r),await r.auth._persistUserIfCurrent(r),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const CA=10*60*1e3;class ty{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!kA(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!ny(e)){const i=((n=e.error.code)==null?void 0:n.split("auth/")[1])||"internal-error";t.onError(Ve(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=CA&&this.cachedEventUids.clear(),this.cachedEventUids.has(tp(e))}saveEventToCache(e){this.cachedEventUids.add(tp(e)),this.lastProcessedEventTime=Date.now()}}function tp(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function ny({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function kA(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return ny(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ry(r,e={}){return Ae(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const DA=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,xA=/^https?/;async function NA(r){if(r.config.emulator)return;const{authorizedDomains:e}=await ry(r);for(const t of e)try{if(VA(t))return}catch{}Ke(r,"unauthorized-domain")}function VA(r){const e=Ws(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!xA.test(t))return!1;if(DA.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const OA=new _o(3e4,6e4);function np(){const r=ke().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function MA(r){return new Promise((e,t)=>{var i,s,o;function n(){np(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{np(),t(Ve(r,"network-request-failed"))},timeout:OA.get()})}if((s=(i=ke().gapi)==null?void 0:i.iframes)!=null&&s.Iframe)e(gapi.iframes.getContext());else if((o=ke().gapi)!=null&&o.load)n();else{const c=Dm("iframefcb");return ke()[c]=()=>{gapi.load?n():t(Ve(r,"network-request-failed"))},Gu(`${kT()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw da=null,e})}let da=null;function FA(r){return da=da||MA(r),da}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LA=new _o(5e3,15e3),UA="__/auth/iframe",BA="emulator/auth/iframe",$A={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},qA=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function zA(r){const e=r.config;O(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?ju(e,BA):`https://${r.config.authDomain}/${UA}`,n={apiKey:e.apiKey,appName:r.name,v:zn},i=qA.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${Oi(n).slice(1)}`}async function KA(r){const e=await FA(r),t=ke().gapi;return O(t,r,"internal-error"),e.open({where:document.body,url:zA(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:$A,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=Ve(r,"network-request-failed"),c=ke().setTimeout(()=>{s(o)},LA.get());function l(){ke().clearTimeout(c),i(n)}n.ping(l).then(l,()=>{s(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jA={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},GA=500,WA=600,HA="_blank",QA="http://localhost";class rp{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function YA(r,e,t,n=GA,i=WA){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const l={...jA,width:n.toString(),height:i.toString(),top:s,left:o},u=we().toLowerCase();t&&(c=Am(u)?HA:t),Tm(u)&&(e=e||QA,l.scrollbars="yes");const d=Object.entries(l).reduce((g,[_,R])=>`${g}${_}=${R},`,"");if(IT(u)&&c!=="_self")return JA(e||"",c),new rp(null);const f=window.open(e||"",c,d);O(f,r,"popup-blocked");try{f.focus()}catch{}return new rp(f)}function JA(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const XA="__/auth/handler",ZA="emulator/auth/handler",eS=encodeURIComponent("fac");async function zl(r,e,t,n,i,s){O(r.config.authDomain,r,"auth-domain-config-required"),O(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:zn,eventId:i};if(e instanceof sn){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",RE(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,f]of Object.entries(s||{}))o[d]=f}if(e instanceof Li){const d=e.getScopes().filter(f=>f!=="");d.length>0&&(o.scopes=d.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const l=await r._getAppCheckToken(),u=l?`#${eS}=${encodeURIComponent(l)}`:"";return`${tS(r)}?${Oi(c).slice(1)}${u}`}function tS({config:r}){return r.emulator?ju(r,ZA):`https://${r.authDomain}/${XA}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rl="webStorageSupport";class nS{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Ir,this._completeRedirectFn=fc,this._overrideRedirectResult=ih}async _openPopup(e,t,n,i){var o;Rt((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const s=await zl(e,t,n,Ws(),i);return YA(e,s,To())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await zl(e,t,n,Ws(),i);return Kb(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(Rt(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await KA(e),n=new ty(e);return t.register("authEvent",i=>(O(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Rl,{type:Rl},i=>{var o;const s=(o=i==null?void 0:i[0])==null?void 0:o[Rl];s!==void 0&&t(!!s),Ke(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=NA(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Cm()||bm()||Io()}}const rS=nS;class iS{constructor(e){this.factorId=e}_process(e,t,n){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,n);case"signin":return this._finalizeSignIn(e,t.credential);default:return Lt("unexpected MultiFactorSessionType")}}}class sh extends iS{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new sh(e)}_finalizeEnroll(e,t,n){return Fb(e,{idToken:t,displayName:n,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return Zb(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class iy{constructor(){}static assertion(e){return sh._fromCredential(e)}}iy.FACTOR_ID="phone";var ip="@firebase/auth",sp="1.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sS{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){O(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oS(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function aS(r){Vn(new Kt("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;O(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const l={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:km(r)},u=new ST(n,i,s,l);return BT(u,t),u},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Vn(new Kt("auth-internal",e=>{const t=Ie(e.getProvider("auth").getImmediate());return(n=>new sS(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),bt(ip,sp,oS(r)),bt(ip,sp,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cS=5*60;gE("authIdTokenMaxAge");function lS(){var r;return((r=document.getElementsByTagName("head"))==null?void 0:r[0])??document}RT({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=Ve("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",lS().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});aS("Browser");/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vr(){return window}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uS=2e3;async function hS(r,e,t){const{BuildInfo:n}=vr();Rt(e.sessionId,"AuthEvent did not contain a session ID");const i=await mS(e.sessionId),s={};return Io()?s.ibi=n.packageName:wo()?s.apn=n.packageName:Ke(r,"operation-not-supported-in-this-environment"),n.displayName&&(s.appDisplayName=n.displayName),s.sessionId=i,zl(r,t,e.type,void 0,e.eventId??void 0,s)}async function dS(r){const{BuildInfo:e}=vr(),t={};Io()?t.iosBundleId=e.packageName:wo()?t.androidPackageName=e.packageName:Ke(r,"operation-not-supported-in-this-environment"),await ry(r,t)}function fS(r){const{cordova:e}=vr();return new Promise(t=>{e.plugins.browsertab.isAvailable(n=>{let i=null;n?e.plugins.browsertab.openUrl(r):i=e.InAppBrowser.open(r,wT()?"_blank":"_system","location=yes"),t(i)})})}async function pS(r,e,t){const{cordova:n}=vr();let i=()=>{};try{await new Promise((s,o)=>{let c=null;function l(){var g;s();const f=(g=n.plugins.browsertab)==null?void 0:g.close;typeof f=="function"&&f(),typeof(t==null?void 0:t.close)=="function"&&t.close()}function u(){c||(c=window.setTimeout(()=>{o(Ve(r,"redirect-cancelled-by-user"))},uS))}function d(){(document==null?void 0:document.visibilityState)==="visible"&&u()}e.addPassiveListener(l),document.addEventListener("resume",u,!1),wo()&&document.addEventListener("visibilitychange",d,!1),i=()=>{e.removePassiveListener(l),document.removeEventListener("resume",u,!1),document.removeEventListener("visibilitychange",d,!1),c&&window.clearTimeout(c)}})}finally{i()}}function gS(r){var t,n,i,s,o,c,l,u,d,f;const e=vr();O(typeof((t=e==null?void 0:e.universalLinks)==null?void 0:t.subscribe)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-universal-links-plugin-fix"}),O(typeof((n=e==null?void 0:e.BuildInfo)==null?void 0:n.packageName)<"u",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-buildInfo"}),O(typeof((o=(s=(i=e==null?void 0:e.cordova)==null?void 0:i.plugins)==null?void 0:s.browsertab)==null?void 0:o.openUrl)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((u=(l=(c=e==null?void 0:e.cordova)==null?void 0:c.plugins)==null?void 0:l.browsertab)==null?void 0:u.isAvailable)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((f=(d=e==null?void 0:e.cordova)==null?void 0:d.InAppBrowser)==null?void 0:f.open)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-inappbrowser"})}async function mS(r){const e=yS(r),t=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(t)).map(i=>i.toString(16).padStart(2,"0")).join("")}function yS(r){if(Rt(/[0-9a-zA-Z]+/.test(r),"Can only convert alpha-numeric strings"),typeof TextEncoder<"u")return new TextEncoder().encode(r);const e=new ArrayBuffer(r.length),t=new Uint8Array(e);for(let n=0;n<r.length;n++)t[n]=r.charCodeAt(n);return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _S=20;class wS extends ty{constructor(){super(...arguments),this.passiveListeners=new Set,this.initPromise=new Promise(e=>{this.resolveInitialized=e})}addPassiveListener(e){this.passiveListeners.add(e)}removePassiveListener(e){this.passiveListeners.delete(e)}resetRedirect(){this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1}onEvent(e){return this.resolveInitialized(),this.passiveListeners.forEach(t=>t(e)),super.onEvent(e)}async initialized(){await this.initPromise}}function IS(r,e,t=null){return{type:e,eventId:t,urlResponse:null,sessionId:TS(),postBody:null,tenantId:r.tenantId,error:Ve(r,"no-auth-event")}}function ES(r,e){return Kl()._set(jl(r),e)}async function op(r){const e=await Kl()._get(jl(r));return e&&await Kl()._remove(jl(r)),e}function vS(r,e){var n,i;const t=AS(e);if(t.includes("/__/auth/callback")){const s=fa(t),o=s.firebaseError?bS(decodeURIComponent(s.firebaseError)):null,c=(i=(n=o==null?void 0:o.code)==null?void 0:n.split("auth/"))==null?void 0:i[1],l=c?Ve(c):null;return l?{type:r.type,eventId:r.eventId,tenantId:r.tenantId,error:l,urlResponse:null,sessionId:null,postBody:null}:{type:r.type,eventId:r.eventId,tenantId:r.tenantId,sessionId:r.sessionId,urlResponse:t,postBody:null}}return null}function TS(){const r=[],e="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let t=0;t<_S;t++){const n=Math.floor(Math.random()*e.length);r.push(e.charAt(n))}return r.join("")}function Kl(){return gt(Zu)}function jl(r){return mr("authEvent",r.config.apiKey,r.name)}function bS(r){try{return JSON.parse(r)}catch{return null}}function AS(r){const e=fa(r),t=e.link?decodeURIComponent(e.link):void 0,n=fa(t).link,i=e.deep_link_id?decodeURIComponent(e.deep_link_id):void 0;return fa(i).link||i||n||t||r}function fa(r){if(!(r!=null&&r.includes("?")))return{};const[e,...t]=r.split("?");return ti(t.join("?"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const SS=500;class RS{constructor(){this._redirectPersistence=Ir,this._shouldInitProactively=!0,this.eventManagers=new Map,this.originValidationPromises={},this._completeRedirectFn=fc,this._overrideRedirectResult=ih}async _initialize(e){const t=e._key();let n=this.eventManagers.get(t);return n||(n=new wS(e),this.eventManagers.set(t,n),this.attachCallbackListeners(e,n)),n}_openPopup(e){Ke(e,"operation-not-supported-in-this-environment")}async _openRedirect(e,t,n,i){gS(e);const s=await this._initialize(e);await s.initialized(),s.resetRedirect(),EA(),await this._originValidation(e);const o=IS(e,n,i);await ES(e,o);const c=await hS(e,o,t),l=await fS(c);return pS(e,s,l)}_isIframeWebStorageSupported(e,t){throw new Error("Method not implemented.")}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=dS(e)),this.originValidationPromises[t]}attachCallbackListeners(e,t){const{universalLinks:n,handleOpenURL:i,BuildInfo:s}=vr(),o=setTimeout(async()=>{await op(e),t.onEvent(ap())},SS),c=async d=>{clearTimeout(o);const f=await op(e);let g=null;f&&(d!=null&&d.url)&&(g=vS(f,d.url)),t.onEvent(g||ap())};typeof n<"u"&&typeof n.subscribe=="function"&&n.subscribe(null,c);const l=i,u=`${s.packageName.toLowerCase()}://`;vr().handleOpenURL=async d=>{if(d.toLowerCase().startsWith(u)&&c({url:d}),typeof l=="function")try{l(d)}catch(f){console.error(f)}}}}const PS=RS;function ap(){return{type:"unknown",eventId:null,sessionId:null,urlResponse:null,postBody:null,tenantId:null,error:Ve("no-auth-event")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function CS(r,e){Ie(r)._logFramework(e)}var kS="@firebase/auth-compat",DS="0.6.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xS=1e3;function Vs(){var r;return((r=self==null?void 0:self.location)==null?void 0:r.protocol)||null}function NS(){return Vs()==="http:"||Vs()==="https:"}function sy(r=we()){return!!((Vs()==="file:"||Vs()==="ionic:"||Vs()==="capacitor:")&&r.toLowerCase().match(/iphone|ipad|ipod|android/))}function VS(){return Mu()||nc()}function OS(){return Jg()&&(document==null?void 0:document.documentMode)===11}function MS(r=we()){return/Edge\/\d+/.test(r)}function FS(r=we()){return OS()||MS(r)}function oy(){try{const r=self.localStorage,e=To();if(r)return r.setItem(e,"1"),r.removeItem(e),FS()?Ks():!0}catch{return oh()&&Ks()}return!1}function oh(){return typeof global<"u"&&"WorkerGlobalScope"in global&&"importScripts"in global}function Pl(){return(NS()||Yg()||sy())&&!VS()&&oy()&&!oh()}function ay(){return sy()&&typeof document<"u"}async function LS(){return ay()?new Promise(r=>{const e=setTimeout(()=>{r(!1)},xS);document.addEventListener("deviceready",()=>{clearTimeout(e),r(!0)})}):!1}function US(){return typeof window<"u"?window:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt={LOCAL:"local",NONE:"none",SESSION:"session"},ds=O,cy="persistence";function BS(r,e){if(ds(Object.values(pt).includes(e),r,"invalid-persistence-type"),Mu()){ds(e!==pt.SESSION,r,"unsupported-persistence-type");return}if(nc()){ds(e===pt.NONE,r,"unsupported-persistence-type");return}if(oh()){ds(e===pt.NONE||e===pt.LOCAL&&Ks(),r,"unsupported-persistence-type");return}ds(e===pt.NONE||oy(),r,"unsupported-persistence-type")}async function Gl(r){await r._initializationPromise;const e=ly(),t=mr(cy,r.config.apiKey,r.name);e&&e.setItem(t,r._getPersistenceType())}function $S(r,e){const t=ly();if(!t)return[];const n=mr(cy,r,e);switch(t.getItem(n)){case pt.NONE:return[di];case pt.LOCAL:return[Ys,Ir];case pt.SESSION:return[Ir];default:return[]}}function ly(){var r;try{return((r=US())==null?void 0:r.sessionStorage)||null}catch{return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qS=O;class Tn{constructor(){this.browserResolver=gt(rS),this.cordovaResolver=gt(PS),this.underlyingResolver=null,this._redirectPersistence=Ir,this._completeRedirectFn=fc,this._overrideRedirectResult=ih}async _initialize(e){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._initialize(e)}async _openPopup(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openPopup(e,t,n,i)}async _openRedirect(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openRedirect(e,t,n,i)}_isIframeWebStorageSupported(e,t){this.assertedUnderlyingResolver._isIframeWebStorageSupported(e,t)}_originValidation(e){return this.assertedUnderlyingResolver._originValidation(e)}get _shouldInitProactively(){return ay()||this.browserResolver._shouldInitProactively}get assertedUnderlyingResolver(){return qS(this.underlyingResolver,"internal-error"),this.underlyingResolver}async selectUnderlyingResolver(){if(this.underlyingResolver)return;const e=await LS();this.underlyingResolver=e?this.cordovaResolver:this.browserResolver}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uy(r){return r.unwrap()}function zS(r){return r.wrapped()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function KS(r){return hy(r)}function jS(r,e){var n;const t=(n=e.customData)==null?void 0:n._tokenResponse;if((e==null?void 0:e.code)==="auth/multi-factor-auth-required"){const i=e;i.resolver=new GS(r,Mb(r,e))}else if(t){const i=hy(e),s=e;i&&(s.credential=i,s.tenantId=t.tenantId||void 0,s.email=t.email||void 0,s.phoneNumber=t.phoneNumber||void 0)}}function hy(r){const{_tokenResponse:e}=r instanceof nt?r.customData:r;if(!e)return null;if(!(r instanceof nt)&&"temporaryProof"in e&&"phoneNumber"in e)return Er.credentialFromResult(r);const t=e.providerId;if(!t||t===us.PASSWORD)return null;let n;switch(t){case us.GOOGLE:n=Ot;break;case us.FACEBOOK:n=Vt;break;case us.GITHUB:n=Mt;break;case us.TWITTER:n=Ft;break;default:const{oauthIdToken:i,oauthAccessToken:s,oauthTokenSecret:o,pendingToken:c,nonce:l}=e;return!s&&!o&&!i&&!c?null:c?t.startsWith("saml.")?fi._create(t,c):jt._fromParams({providerId:t,signInMethod:t,pendingToken:c,idToken:i,accessToken:s}):new oi(t).credential({idToken:i,accessToken:s,rawNonce:l})}return r instanceof nt?n.credentialFromError(r):n.credentialFromResult(r)}function ot(r,e){return e.catch(t=>{throw t instanceof nt&&jS(r,t),t}).then(t=>{const n=t.operationType,i=t.user;return{operationType:n,credential:KS(t),additionalUserInfo:Ob(t),user:pc.getOrCreate(i)}})}async function Wl(r,e){const t=await e;return{verificationId:t.verificationId,confirm:n=>ot(r,t.confirm(n))}}class GS{constructor(e,t){this.resolver=t,this.auth=zS(e)}get session(){return this.resolver.session}get hints(){return this.resolver.hints}resolveSignIn(e){return ot(uy(this.auth),this.resolver.resolveSignIn(e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let pc=class Ts{constructor(e){this._delegate=e,this.multiFactor=Ub(e)}static getOrCreate(e){return Ts.USER_MAP.has(e)||Ts.USER_MAP.set(e,new Ts(e)),Ts.USER_MAP.get(e)}delete(){return this._delegate.delete()}reload(){return this._delegate.reload()}toJSON(){return this._delegate.toJSON()}getIdTokenResult(e){return this._delegate.getIdTokenResult(e)}getIdToken(e){return this._delegate.getIdToken(e)}linkAndRetrieveDataWithCredential(e){return this.linkWithCredential(e)}async linkWithCredential(e){return ot(this.auth,Bm(this._delegate,e))}async linkWithPhoneNumber(e,t){return Wl(this.auth,cA(this._delegate,e,t))}async linkWithPopup(e){return ot(this.auth,yA(this._delegate,e,Tn))}async linkWithRedirect(e){return await Gl(Ie(this.auth)),SA(this._delegate,e,Tn)}reauthenticateAndRetrieveDataWithCredential(e){return this.reauthenticateWithCredential(e)}async reauthenticateWithCredential(e){return ot(this.auth,$m(this._delegate,e))}reauthenticateWithPhoneNumber(e,t){return Wl(this.auth,lA(this._delegate,e,t))}reauthenticateWithPopup(e){return ot(this.auth,mA(this._delegate,e,Tn))}async reauthenticateWithRedirect(e){return await Gl(Ie(this.auth)),bA(this._delegate,e,Tn)}sendEmailVerification(e){return bb(this._delegate,e)}async unlink(e){return await ub(this._delegate,e),this}updateEmail(e){return Pb(this._delegate,e)}updatePassword(e){return Cb(this._delegate,e)}updatePhoneNumber(e){return uA(this._delegate,e)}updateProfile(e){return Rb(this._delegate,e)}verifyBeforeUpdateEmail(e,t){return Ab(this._delegate,e,t)}get emailVerified(){return this._delegate.emailVerified}get isAnonymous(){return this._delegate.isAnonymous}get metadata(){return this._delegate.metadata}get phoneNumber(){return this._delegate.phoneNumber}get providerData(){return this._delegate.providerData}get refreshToken(){return this._delegate.refreshToken}get tenantId(){return this._delegate.tenantId}get displayName(){return this._delegate.displayName}get email(){return this._delegate.email}get photoURL(){return this._delegate.photoURL}get providerId(){return this._delegate.providerId}get uid(){return this._delegate.uid}get auth(){return this._delegate.auth}};pc.USER_MAP=new WeakMap;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fs=O;class Hl{constructor(e,t){if(this.app=e,t.isInitialized()){this._delegate=t.getImmediate(),this.linkUnderlyingAuth();return}const{apiKey:n}=e.options;fs(n,"invalid-api-key",{appName:e.name}),fs(n,"invalid-api-key",{appName:e.name});const i=typeof window<"u"?Tn:void 0;this._delegate=t.initialize({options:{persistence:WS(n,e.name),popupRedirectResolver:i}}),this._delegate._updateErrorMap(Zv),this.linkUnderlyingAuth()}get emulatorConfig(){return this._delegate.emulatorConfig}get currentUser(){return this._delegate.currentUser?pc.getOrCreate(this._delegate.currentUser):null}get languageCode(){return this._delegate.languageCode}set languageCode(e){this._delegate.languageCode=e}get settings(){return this._delegate.settings}get tenantId(){return this._delegate.tenantId}set tenantId(e){this._delegate.tenantId=e}useDeviceLanguage(){this._delegate.useDeviceLanguage()}signOut(){return this._delegate.signOut()}useEmulator(e,t){$T(this._delegate,e,t)}applyActionCode(e){return gb(this._delegate,e)}checkActionCode(e){return qm(this._delegate,e)}confirmPasswordReset(e,t){return pb(this._delegate,e,t)}async createUserWithEmailAndPassword(e,t){return ot(this._delegate,yb(this._delegate,e,t))}fetchProvidersForEmail(e){return this.fetchSignInMethodsForEmail(e)}fetchSignInMethodsForEmail(e){return Tb(this._delegate,e)}isSignInWithEmailLink(e){return Ib(this._delegate,e)}async getRedirectResult(){fs(Pl(),this._delegate,"operation-not-supported-in-this-environment");const e=await PA(this._delegate,Tn);return e?ot(this._delegate,Promise.resolve(e)):{credential:null,user:null}}addFrameworkForLogging(e){CS(this._delegate,e)}onAuthStateChanged(e,t,n){const{next:i,error:s,complete:o}=cp(e,t,n);return this._delegate.onAuthStateChanged(i,s,o)}onIdTokenChanged(e,t,n){const{next:i,error:s,complete:o}=cp(e,t,n);return this._delegate.onIdTokenChanged(i,s,o)}sendSignInLinkToEmail(e,t){return wb(this._delegate,e,t)}sendPasswordResetEmail(e,t){return fb(this._delegate,e,t||void 0)}async setPersistence(e){BS(this._delegate,e);let t;switch(e){case pt.SESSION:t=Ir;break;case pt.LOCAL:t=await gt(Ys)._isAvailable()?Ys:Zu;break;case pt.NONE:t=di;break;default:return Ke("argument-error",{appName:this._delegate.name})}return this._delegate.setPersistence(t)}signInAndRetrieveDataWithCredential(e){return this.signInWithCredential(e)}signInAnonymously(){return ot(this._delegate,lb(this._delegate))}signInWithCredential(e){return ot(this._delegate,cc(this._delegate,e))}signInWithCustomToken(e){return ot(this._delegate,db(this._delegate,e))}signInWithEmailAndPassword(e,t){return ot(this._delegate,_b(this._delegate,e,t))}signInWithEmailLink(e,t){return ot(this._delegate,Eb(this._delegate,e,t))}signInWithPhoneNumber(e,t){return Wl(this._delegate,aA(this._delegate,e,t))}async signInWithPopup(e){return fs(Pl(),this._delegate,"operation-not-supported-in-this-environment"),ot(this._delegate,gA(this._delegate,e,Tn))}async signInWithRedirect(e){return fs(Pl(),this._delegate,"operation-not-supported-in-this-environment"),await Gl(this._delegate),vA(this._delegate,e,Tn)}updateCurrentUser(e){return this._delegate.updateCurrentUser(e)}verifyPasswordResetCode(e){return mb(this._delegate,e)}unwrap(){return this._delegate}_delete(){return this._delegate._delete()}linkUnderlyingAuth(){this._delegate.wrapped=()=>this}}Hl.Persistence=pt;function cp(r,e,t){let n=r;typeof r!="function"&&({next:n,error:e,complete:t}=r);const i=n;return{next:o=>i(o&&pc.getOrCreate(o)),error:e,complete:t}}function WS(r,e){const t=$S(r,e);if(typeof self<"u"&&!t.includes(Ys)&&t.push(Ys),typeof window<"u")for(const n of[Zu,Ir])t.includes(n)||t.push(n);return t.includes(di)||t.push(di),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ah{static credential(e,t){return Er.credential(e,t)}constructor(){this.providerId="phone",this._delegate=new Er(uy(De.auth()))}verifyPhoneNumber(e,t){return this._delegate.verifyPhoneNumber(e,t)}unwrap(){return this._delegate}}ah.PHONE_SIGN_IN_METHOD=Er.PHONE_SIGN_IN_METHOD;ah.PROVIDER_ID=Er.PROVIDER_ID;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const HS=O;class QS{constructor(e,t,n=De.app()){var i;HS((i=n.options)==null?void 0:i.apiKey,"invalid-api-key",{appName:n.name}),this._delegate=new sA(n.auth(),e,t),this.type=this._delegate.type}clear(){this._delegate.clear()}render(){return this._delegate.render()}verify(){return this._delegate.verify()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const YS="auth-compat";function JS(r){r.INTERNAL.registerComponent(new Kt(YS,e=>{const t=e.getProvider("app-compat").getImmediate(),n=e.getProvider("auth");return new Hl(t,n)},"PUBLIC").setServiceProps({ActionCodeInfo:{Operation:{EMAIL_SIGNIN:qr.EMAIL_SIGNIN,PASSWORD_RESET:qr.PASSWORD_RESET,RECOVER_EMAIL:qr.RECOVER_EMAIL,REVERT_SECOND_FACTOR_ADDITION:qr.REVERT_SECOND_FACTOR_ADDITION,VERIFY_AND_CHANGE_EMAIL:qr.VERIFY_AND_CHANGE_EMAIL,VERIFY_EMAIL:qr.VERIFY_EMAIL}},EmailAuthProvider:Kn,FacebookAuthProvider:Vt,GithubAuthProvider:Mt,GoogleAuthProvider:Ot,OAuthProvider:oi,SAMLAuthProvider:Da,PhoneAuthProvider:ah,PhoneMultiFactorGenerator:iy,RecaptchaVerifier:QS,TwitterAuthProvider:Ft,Auth:Hl,AuthCredential:Fi,Error:nt}).setInstantiationMode("LAZY").setMultipleInstances(!1)),r.registerVersion(kS,DS)}JS(De);var lp=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Pn,dy;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,y){function w(){}w.prototype=y.prototype,E.F=y.prototype,E.prototype=new w,E.prototype.constructor=E,E.D=function(v,b,P){for(var I=Array(arguments.length-2),st=2;st<arguments.length;st++)I[st-2]=arguments[st];return y.prototype[b].apply(v,I)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(E,y,w){w||(w=0);const v=Array(16);if(typeof y=="string")for(var b=0;b<16;++b)v[b]=y.charCodeAt(w++)|y.charCodeAt(w++)<<8|y.charCodeAt(w++)<<16|y.charCodeAt(w++)<<24;else for(b=0;b<16;++b)v[b]=y[w++]|y[w++]<<8|y[w++]<<16|y[w++]<<24;y=E.g[0],w=E.g[1],b=E.g[2];let P=E.g[3],I;I=y+(P^w&(b^P))+v[0]+3614090360&4294967295,y=w+(I<<7&4294967295|I>>>25),I=P+(b^y&(w^b))+v[1]+3905402710&4294967295,P=y+(I<<12&4294967295|I>>>20),I=b+(w^P&(y^w))+v[2]+606105819&4294967295,b=P+(I<<17&4294967295|I>>>15),I=w+(y^b&(P^y))+v[3]+3250441966&4294967295,w=b+(I<<22&4294967295|I>>>10),I=y+(P^w&(b^P))+v[4]+4118548399&4294967295,y=w+(I<<7&4294967295|I>>>25),I=P+(b^y&(w^b))+v[5]+1200080426&4294967295,P=y+(I<<12&4294967295|I>>>20),I=b+(w^P&(y^w))+v[6]+2821735955&4294967295,b=P+(I<<17&4294967295|I>>>15),I=w+(y^b&(P^y))+v[7]+4249261313&4294967295,w=b+(I<<22&4294967295|I>>>10),I=y+(P^w&(b^P))+v[8]+1770035416&4294967295,y=w+(I<<7&4294967295|I>>>25),I=P+(b^y&(w^b))+v[9]+2336552879&4294967295,P=y+(I<<12&4294967295|I>>>20),I=b+(w^P&(y^w))+v[10]+4294925233&4294967295,b=P+(I<<17&4294967295|I>>>15),I=w+(y^b&(P^y))+v[11]+2304563134&4294967295,w=b+(I<<22&4294967295|I>>>10),I=y+(P^w&(b^P))+v[12]+1804603682&4294967295,y=w+(I<<7&4294967295|I>>>25),I=P+(b^y&(w^b))+v[13]+4254626195&4294967295,P=y+(I<<12&4294967295|I>>>20),I=b+(w^P&(y^w))+v[14]+2792965006&4294967295,b=P+(I<<17&4294967295|I>>>15),I=w+(y^b&(P^y))+v[15]+1236535329&4294967295,w=b+(I<<22&4294967295|I>>>10),I=y+(b^P&(w^b))+v[1]+4129170786&4294967295,y=w+(I<<5&4294967295|I>>>27),I=P+(w^b&(y^w))+v[6]+3225465664&4294967295,P=y+(I<<9&4294967295|I>>>23),I=b+(y^w&(P^y))+v[11]+643717713&4294967295,b=P+(I<<14&4294967295|I>>>18),I=w+(P^y&(b^P))+v[0]+3921069994&4294967295,w=b+(I<<20&4294967295|I>>>12),I=y+(b^P&(w^b))+v[5]+3593408605&4294967295,y=w+(I<<5&4294967295|I>>>27),I=P+(w^b&(y^w))+v[10]+38016083&4294967295,P=y+(I<<9&4294967295|I>>>23),I=b+(y^w&(P^y))+v[15]+3634488961&4294967295,b=P+(I<<14&4294967295|I>>>18),I=w+(P^y&(b^P))+v[4]+3889429448&4294967295,w=b+(I<<20&4294967295|I>>>12),I=y+(b^P&(w^b))+v[9]+568446438&4294967295,y=w+(I<<5&4294967295|I>>>27),I=P+(w^b&(y^w))+v[14]+3275163606&4294967295,P=y+(I<<9&4294967295|I>>>23),I=b+(y^w&(P^y))+v[3]+4107603335&4294967295,b=P+(I<<14&4294967295|I>>>18),I=w+(P^y&(b^P))+v[8]+1163531501&4294967295,w=b+(I<<20&4294967295|I>>>12),I=y+(b^P&(w^b))+v[13]+2850285829&4294967295,y=w+(I<<5&4294967295|I>>>27),I=P+(w^b&(y^w))+v[2]+4243563512&4294967295,P=y+(I<<9&4294967295|I>>>23),I=b+(y^w&(P^y))+v[7]+1735328473&4294967295,b=P+(I<<14&4294967295|I>>>18),I=w+(P^y&(b^P))+v[12]+2368359562&4294967295,w=b+(I<<20&4294967295|I>>>12),I=y+(w^b^P)+v[5]+4294588738&4294967295,y=w+(I<<4&4294967295|I>>>28),I=P+(y^w^b)+v[8]+2272392833&4294967295,P=y+(I<<11&4294967295|I>>>21),I=b+(P^y^w)+v[11]+1839030562&4294967295,b=P+(I<<16&4294967295|I>>>16),I=w+(b^P^y)+v[14]+4259657740&4294967295,w=b+(I<<23&4294967295|I>>>9),I=y+(w^b^P)+v[1]+2763975236&4294967295,y=w+(I<<4&4294967295|I>>>28),I=P+(y^w^b)+v[4]+1272893353&4294967295,P=y+(I<<11&4294967295|I>>>21),I=b+(P^y^w)+v[7]+4139469664&4294967295,b=P+(I<<16&4294967295|I>>>16),I=w+(b^P^y)+v[10]+3200236656&4294967295,w=b+(I<<23&4294967295|I>>>9),I=y+(w^b^P)+v[13]+681279174&4294967295,y=w+(I<<4&4294967295|I>>>28),I=P+(y^w^b)+v[0]+3936430074&4294967295,P=y+(I<<11&4294967295|I>>>21),I=b+(P^y^w)+v[3]+3572445317&4294967295,b=P+(I<<16&4294967295|I>>>16),I=w+(b^P^y)+v[6]+76029189&4294967295,w=b+(I<<23&4294967295|I>>>9),I=y+(w^b^P)+v[9]+3654602809&4294967295,y=w+(I<<4&4294967295|I>>>28),I=P+(y^w^b)+v[12]+3873151461&4294967295,P=y+(I<<11&4294967295|I>>>21),I=b+(P^y^w)+v[15]+530742520&4294967295,b=P+(I<<16&4294967295|I>>>16),I=w+(b^P^y)+v[2]+3299628645&4294967295,w=b+(I<<23&4294967295|I>>>9),I=y+(b^(w|~P))+v[0]+4096336452&4294967295,y=w+(I<<6&4294967295|I>>>26),I=P+(w^(y|~b))+v[7]+1126891415&4294967295,P=y+(I<<10&4294967295|I>>>22),I=b+(y^(P|~w))+v[14]+2878612391&4294967295,b=P+(I<<15&4294967295|I>>>17),I=w+(P^(b|~y))+v[5]+4237533241&4294967295,w=b+(I<<21&4294967295|I>>>11),I=y+(b^(w|~P))+v[12]+1700485571&4294967295,y=w+(I<<6&4294967295|I>>>26),I=P+(w^(y|~b))+v[3]+2399980690&4294967295,P=y+(I<<10&4294967295|I>>>22),I=b+(y^(P|~w))+v[10]+4293915773&4294967295,b=P+(I<<15&4294967295|I>>>17),I=w+(P^(b|~y))+v[1]+2240044497&4294967295,w=b+(I<<21&4294967295|I>>>11),I=y+(b^(w|~P))+v[8]+1873313359&4294967295,y=w+(I<<6&4294967295|I>>>26),I=P+(w^(y|~b))+v[15]+4264355552&4294967295,P=y+(I<<10&4294967295|I>>>22),I=b+(y^(P|~w))+v[6]+2734768916&4294967295,b=P+(I<<15&4294967295|I>>>17),I=w+(P^(b|~y))+v[13]+1309151649&4294967295,w=b+(I<<21&4294967295|I>>>11),I=y+(b^(w|~P))+v[4]+4149444226&4294967295,y=w+(I<<6&4294967295|I>>>26),I=P+(w^(y|~b))+v[11]+3174756917&4294967295,P=y+(I<<10&4294967295|I>>>22),I=b+(y^(P|~w))+v[2]+718787259&4294967295,b=P+(I<<15&4294967295|I>>>17),I=w+(P^(b|~y))+v[9]+3951481745&4294967295,E.g[0]=E.g[0]+y&4294967295,E.g[1]=E.g[1]+(b+(I<<21&4294967295|I>>>11))&4294967295,E.g[2]=E.g[2]+b&4294967295,E.g[3]=E.g[3]+P&4294967295}n.prototype.v=function(E,y){y===void 0&&(y=E.length);const w=y-this.blockSize,v=this.C;let b=this.h,P=0;for(;P<y;){if(b==0)for(;P<=w;)i(this,E,P),P+=this.blockSize;if(typeof E=="string"){for(;P<y;)if(v[b++]=E.charCodeAt(P++),b==this.blockSize){i(this,v),b=0;break}}else for(;P<y;)if(v[b++]=E[P++],b==this.blockSize){i(this,v),b=0;break}}this.h=b,this.o+=y},n.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var y=1;y<E.length-8;++y)E[y]=0;y=this.o*8;for(var w=E.length-8;w<E.length;++w)E[w]=y&255,y/=256;for(this.v(E),E=Array(16),y=0,w=0;w<4;++w)for(let v=0;v<32;v+=8)E[y++]=this.g[w]>>>v&255;return E};function s(E,y){var w=c;return Object.prototype.hasOwnProperty.call(w,E)?w[E]:w[E]=y(E)}function o(E,y){this.h=y;const w=[];let v=!0;for(let b=E.length-1;b>=0;b--){const P=E[b]|0;v&&P==y||(w[b]=P,v=!1)}this.g=w}var c={};function l(E){return-128<=E&&E<128?s(E,function(y){return new o([y|0],y<0?-1:0)}):new o([E|0],E<0?-1:0)}function u(E){if(isNaN(E)||!isFinite(E))return f;if(E<0)return T(u(-E));const y=[];let w=1;for(let v=0;E>=w;v++)y[v]=E/w|0,w*=4294967296;return new o(y,0)}function d(E,y){if(E.length==0)throw Error("number format error: empty string");if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(E.charAt(0)=="-")return T(d(E.substring(1),y));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const w=u(Math.pow(y,8));let v=f;for(let P=0;P<E.length;P+=8){var b=Math.min(8,E.length-P);const I=parseInt(E.substring(P,P+b),y);b<8?(b=u(Math.pow(y,b)),v=v.j(b).add(u(I))):(v=v.j(w),v=v.add(u(I)))}return v}var f=l(0),g=l(1),_=l(16777216);r=o.prototype,r.m=function(){if(k(this))return-T(this).m();let E=0,y=1;for(let w=0;w<this.g.length;w++){const v=this.i(w);E+=(v>=0?v:4294967296+v)*y,y*=4294967296}return E},r.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(R(this))return"0";if(k(this))return"-"+T(this).toString(E);const y=u(Math.pow(E,6));var w=this;let v="";for(;;){const b=K(w,y).g;w=x(w,b.j(y));let P=((w.g.length>0?w.g[0]:w.h)>>>0).toString(E);if(w=b,R(w))return P+v;for(;P.length<6;)P="0"+P;v=P+v}},r.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function R(E){if(E.h!=0)return!1;for(let y=0;y<E.g.length;y++)if(E.g[y]!=0)return!1;return!0}function k(E){return E.h==-1}r.l=function(E){return E=x(this,E),k(E)?-1:R(E)?0:1};function T(E){const y=E.g.length,w=[];for(let v=0;v<y;v++)w[v]=~E.g[v];return new o(w,~E.h).add(g)}r.abs=function(){return k(this)?T(this):this},r.add=function(E){const y=Math.max(this.g.length,E.g.length),w=[];let v=0;for(let b=0;b<=y;b++){let P=v+(this.i(b)&65535)+(E.i(b)&65535),I=(P>>>16)+(this.i(b)>>>16)+(E.i(b)>>>16);v=I>>>16,P&=65535,I&=65535,w[b]=I<<16|P}return new o(w,w[w.length-1]&-2147483648?-1:0)};function x(E,y){return E.add(T(y))}r.j=function(E){if(R(this)||R(E))return f;if(k(this))return k(E)?T(this).j(T(E)):T(T(this).j(E));if(k(E))return T(this.j(T(E)));if(this.l(_)<0&&E.l(_)<0)return u(this.m()*E.m());const y=this.g.length+E.g.length,w=[];for(var v=0;v<2*y;v++)w[v]=0;for(v=0;v<this.g.length;v++)for(let b=0;b<E.g.length;b++){const P=this.i(v)>>>16,I=this.i(v)&65535,st=E.i(b)>>>16,Yn=E.i(b)&65535;w[2*v+2*b]+=I*Yn,M(w,2*v+2*b),w[2*v+2*b+1]+=P*Yn,M(w,2*v+2*b+1),w[2*v+2*b+1]+=I*st,M(w,2*v+2*b+1),w[2*v+2*b+2]+=P*st,M(w,2*v+2*b+2)}for(E=0;E<y;E++)w[E]=w[2*E+1]<<16|w[2*E];for(E=y;E<2*y;E++)w[E]=0;return new o(w,0)};function M(E,y){for(;(E[y]&65535)!=E[y];)E[y+1]+=E[y]>>>16,E[y]&=65535,y++}function F(E,y){this.g=E,this.h=y}function K(E,y){if(R(y))throw Error("division by zero");if(R(E))return new F(f,f);if(k(E))return y=K(T(E),y),new F(T(y.g),T(y.h));if(k(y))return y=K(E,T(y)),new F(T(y.g),y.h);if(E.g.length>30){if(k(E)||k(y))throw Error("slowDivide_ only works with positive integers.");for(var w=g,v=y;v.l(E)<=0;)w=W(w),v=W(v);var b=j(w,1),P=j(v,1);for(v=j(v,2),w=j(w,2);!R(v);){var I=P.add(v);I.l(E)<=0&&(b=b.add(w),P=I),v=j(v,1),w=j(w,1)}return y=x(E,b.j(y)),new F(b,y)}for(b=f;E.l(y)>=0;){for(w=Math.max(1,Math.floor(E.m()/y.m())),v=Math.ceil(Math.log(w)/Math.LN2),v=v<=48?1:Math.pow(2,v-48),P=u(w),I=P.j(y);k(I)||I.l(E)>0;)w-=v,P=u(w),I=P.j(y);R(P)&&(P=g),b=b.add(P),E=x(E,I)}return new F(b,E)}r.B=function(E){return K(this,E).h},r.and=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let v=0;v<y;v++)w[v]=this.i(v)&E.i(v);return new o(w,this.h&E.h)},r.or=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let v=0;v<y;v++)w[v]=this.i(v)|E.i(v);return new o(w,this.h|E.h)},r.xor=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let v=0;v<y;v++)w[v]=this.i(v)^E.i(v);return new o(w,this.h^E.h)};function W(E){const y=E.g.length+1,w=[];for(let v=0;v<y;v++)w[v]=E.i(v)<<1|E.i(v-1)>>>31;return new o(w,E.h)}function j(E,y){const w=y>>5;y%=32;const v=E.g.length-w,b=[];for(let P=0;P<v;P++)b[P]=y>0?E.i(P+w)>>>y|E.i(P+w+1)<<32-y:E.i(P+w);return new o(b,E.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,dy=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=u,o.fromString=d,Pn=o}).apply(typeof lp<"u"?lp:typeof self<"u"?self:typeof window<"u"?window:{});var ra=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var fy,bs,py,pa,Ql,gy,my,yy;(function(){var r,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof ra=="object"&&ra];for(var h=0;h<a.length;++h){var p=a[h];if(p&&p.Math==Math)return p}throw Error("Cannot find global object")}var n=t(this);function i(a,h){if(h)e:{var p=n;a=a.split(".");for(var m=0;m<a.length-1;m++){var S=a[m];if(!(S in p))break e;p=p[S]}a=a[a.length-1],m=p[a],h=h(m),h!=m&&h!=null&&e(p,a,{configurable:!0,writable:!0,value:h})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(h){var p=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&p.push([m,h[m]]);return p}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function l(a,h,p){return a.call.apply(a.bind,arguments)}function u(a,h,p){return u=l,u.apply(null,arguments)}function d(a,h){var p=Array.prototype.slice.call(arguments,1);return function(){var m=p.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function f(a,h){function p(){}p.prototype=h.prototype,a.Z=h.prototype,a.prototype=new p,a.prototype.constructor=a,a.Ob=function(m,S,D){for(var U=Array(arguments.length-2),J=2;J<arguments.length;J++)U[J-2]=arguments[J];return h.prototype[S].apply(m,U)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function _(a){const h=a.length;if(h>0){const p=Array(h);for(let m=0;m<h;m++)p[m]=a[m];return p}return[]}function R(a,h){for(let m=1;m<arguments.length;m++){const S=arguments[m];var p=typeof S;if(p=p!="object"?p:S?Array.isArray(S)?"array":p:"null",p=="array"||p=="object"&&typeof S.length=="number"){p=a.length||0;const D=S.length||0;a.length=p+D;for(let U=0;U<D;U++)a[p+U]=S[U]}else a.push(S)}}class k{constructor(h,p){this.i=h,this.j=p,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function T(a){o.setTimeout(()=>{throw a},0)}function x(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class M{constructor(){this.h=this.g=null}add(h,p){const m=F.get();m.set(h,p),this.h?this.h.next=m:this.g=m,this.h=m}}var F=new k(()=>new K,a=>a.reset());class K{constructor(){this.next=this.g=this.h=null}set(h,p){this.h=h,this.g=p,this.next=null}reset(){this.next=this.g=this.h=null}}let W,j=!1,E=new M,y=()=>{const a=Promise.resolve(void 0);W=()=>{a.then(w)}};function w(){for(var a;a=x();){try{a.h.call(a.g)}catch(p){T(p)}var h=F;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}j=!1}function v(){this.u=this.u,this.C=this.C}v.prototype.u=!1,v.prototype.dispose=function(){this.u||(this.u=!0,this.N())},v.prototype[Symbol.dispose]=function(){this.dispose()},v.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function b(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}b.prototype.h=function(){this.defaultPrevented=!0};var P=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const p=()=>{};o.addEventListener("test",p,h),o.removeEventListener("test",p,h)}catch{}return a}();function I(a){return/^[\s\xa0]*$/.test(a)}function st(a,h){b.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}f(st,b),st.prototype.init=function(a,h){const p=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(p=="mouseover"?h=a.fromElement:p=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&st.Z.h.call(this)},st.prototype.h=function(){st.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Yn="closure_listenable_"+(Math.random()*1e6|0),SI=0;function RI(a,h,p,m,S){this.listener=a,this.proxy=null,this.src=h,this.type=p,this.capture=!!m,this.ha=S,this.key=++SI,this.da=this.fa=!1}function $o(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function qo(a,h,p){for(const m in a)h.call(p,a[m],m,a)}function PI(a,h){for(const p in a)h.call(void 0,a[p],p,a)}function Sd(a){const h={};for(const p in a)h[p]=a[p];return h}const Rd="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Pd(a,h){let p,m;for(let S=1;S<arguments.length;S++){m=arguments[S];for(p in m)a[p]=m[p];for(let D=0;D<Rd.length;D++)p=Rd[D],Object.prototype.hasOwnProperty.call(m,p)&&(a[p]=m[p])}}function zo(a){this.src=a,this.g={},this.h=0}zo.prototype.add=function(a,h,p,m,S){const D=a.toString();a=this.g[D],a||(a=this.g[D]=[],this.h++);const U=Qc(a,h,m,S);return U>-1?(h=a[U],p||(h.fa=!1)):(h=new RI(h,this.src,D,!!m,S),h.fa=p,a.push(h)),h};function Hc(a,h){const p=h.type;if(p in a.g){var m=a.g[p],S=Array.prototype.indexOf.call(m,h,void 0),D;(D=S>=0)&&Array.prototype.splice.call(m,S,1),D&&($o(h),a.g[p].length==0&&(delete a.g[p],a.h--))}}function Qc(a,h,p,m){for(let S=0;S<a.length;++S){const D=a[S];if(!D.da&&D.listener==h&&D.capture==!!p&&D.ha==m)return S}return-1}var Yc="closure_lm_"+(Math.random()*1e6|0),Jc={};function Cd(a,h,p,m,S){if(Array.isArray(h)){for(let D=0;D<h.length;D++)Cd(a,h[D],p,m,S);return null}return p=xd(p),a&&a[Yn]?a.J(h,p,c(m)?!!m.capture:!1,S):CI(a,h,p,!1,m,S)}function CI(a,h,p,m,S,D){if(!h)throw Error("Invalid event type");const U=c(S)?!!S.capture:!!S;let J=Zc(a);if(J||(a[Yc]=J=new zo(a)),p=J.add(h,p,m,U,D),p.proxy)return p;if(m=kI(),p.proxy=m,m.src=a,m.listener=p,a.addEventListener)P||(S=U),S===void 0&&(S=!1),a.addEventListener(h.toString(),m,S);else if(a.attachEvent)a.attachEvent(Dd(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return p}function kI(){function a(p){return h.call(a.src,a.listener,p)}const h=DI;return a}function kd(a,h,p,m,S){if(Array.isArray(h))for(var D=0;D<h.length;D++)kd(a,h[D],p,m,S);else m=c(m)?!!m.capture:!!m,p=xd(p),a&&a[Yn]?(a=a.i,D=String(h).toString(),D in a.g&&(h=a.g[D],p=Qc(h,p,m,S),p>-1&&($o(h[p]),Array.prototype.splice.call(h,p,1),h.length==0&&(delete a.g[D],a.h--)))):a&&(a=Zc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Qc(h,p,m,S)),(p=a>-1?h[a]:null)&&Xc(p))}function Xc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Yn])Hc(h.i,a);else{var p=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(p,m,a.capture):h.detachEvent?h.detachEvent(Dd(p),m):h.addListener&&h.removeListener&&h.removeListener(m),(p=Zc(h))?(Hc(p,a),p.h==0&&(p.src=null,h[Yc]=null)):$o(a)}}}function Dd(a){return a in Jc?Jc[a]:Jc[a]="on"+a}function DI(a,h){if(a.da)a=!0;else{h=new st(h,this);const p=a.listener,m=a.ha||a.src;a.fa&&Xc(a),a=p.call(m,h)}return a}function Zc(a){return a=a[Yc],a instanceof zo?a:null}var el="__closure_events_fn_"+(Math.random()*1e9>>>0);function xd(a){return typeof a=="function"?a:(a[el]||(a[el]=function(h){return a.handleEvent(h)}),a[el])}function je(){v.call(this),this.i=new zo(this),this.M=this,this.G=null}f(je,v),je.prototype[Yn]=!0,je.prototype.removeEventListener=function(a,h,p,m){kd(this,a,h,p,m)};function Je(a,h){var p,m=a.G;if(m)for(p=[];m;m=m.G)p.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new b(h,a);else if(h instanceof b)h.target=h.target||a;else{var S=h;h=new b(m,a),Pd(h,S)}S=!0;let D,U;if(p)for(U=p.length-1;U>=0;U--)D=h.g=p[U],S=Ko(D,m,!0,h)&&S;if(D=h.g=a,S=Ko(D,m,!0,h)&&S,S=Ko(D,m,!1,h)&&S,p)for(U=0;U<p.length;U++)D=h.g=p[U],S=Ko(D,m,!1,h)&&S}je.prototype.N=function(){if(je.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const p=a.g[h];for(let m=0;m<p.length;m++)$o(p[m]);delete a.g[h],a.h--}}this.G=null},je.prototype.J=function(a,h,p,m){return this.i.add(String(a),h,!1,p,m)},je.prototype.K=function(a,h,p,m){return this.i.add(String(a),h,!0,p,m)};function Ko(a,h,p,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let S=!0;for(let D=0;D<h.length;++D){const U=h[D];if(U&&!U.da&&U.capture==p){const J=U.listener,Ne=U.ha||U.src;U.fa&&Hc(a.i,U),S=J.call(Ne,m)!==!1&&S}}return S&&!m.defaultPrevented}function xI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=u(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function Nd(a){a.g=xI(()=>{a.g=null,a.i&&(a.i=!1,Nd(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class NI extends v{constructor(h,p){super(),this.m=h,this.l=p,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:Nd(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Wi(a){v.call(this),this.h=a,this.g={}}f(Wi,v);var Vd=[];function Od(a){qo(a.g,function(h,p){this.g.hasOwnProperty(p)&&Xc(h)},a),a.g={}}Wi.prototype.N=function(){Wi.Z.N.call(this),Od(this)},Wi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var tl=o.JSON.stringify,VI=o.JSON.parse,OI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Md(){}function Fd(){}var Hi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function nl(){b.call(this,"d")}f(nl,b);function rl(){b.call(this,"c")}f(rl,b);var Jn={},Ld=null;function jo(){return Ld=Ld||new je}Jn.Ia="serverreachability";function Ud(a){b.call(this,Jn.Ia,a)}f(Ud,b);function Qi(a){const h=jo();Je(h,new Ud(h))}Jn.STAT_EVENT="statevent";function Bd(a,h){b.call(this,Jn.STAT_EVENT,a),this.stat=h}f(Bd,b);function Xe(a){const h=jo();Je(h,new Bd(h,a))}Jn.Ja="timingevent";function $d(a,h){b.call(this,Jn.Ja,a),this.size=h}f($d,b);function Yi(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function Ji(){this.g=!0}Ji.prototype.ua=function(){this.g=!1};function MI(a,h,p,m,S,D){a.info(function(){if(a.g)if(D){var U="",J=D.split("&");for(let ce=0;ce<J.length;ce++){var Ne=J[ce].split("=");if(Ne.length>1){const Me=Ne[0];Ne=Ne[1];const kt=Me.split("_");U=kt.length>=2&&kt[1]=="type"?U+(Me+"="+Ne+"&"):U+(Me+"=redacted&")}}}else U=null;else U=D;return"XMLHTTP REQ ("+m+") [attempt "+S+"]: "+h+`
`+p+`
`+U})}function FI(a,h,p,m,S,D,U){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+S+"]: "+h+`
`+p+`
`+D+" "+U})}function Ur(a,h,p,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+UI(a,p)+(m?" "+m:"")})}function LI(a,h){a.info(function(){return"TIMEOUT: "+h})}Ji.prototype.info=function(){};function UI(a,h){if(!a.g)return h;if(!h)return null;try{const D=JSON.parse(h);if(D){for(a=0;a<D.length;a++)if(Array.isArray(D[a])){var p=D[a];if(!(p.length<2)){var m=p[1];if(Array.isArray(m)&&!(m.length<1)){var S=m[0];if(S!="noop"&&S!="stop"&&S!="close")for(let U=1;U<m.length;U++)m[U]=""}}}}return tl(D)}catch{return h}}var Go={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},qd={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},zd;function il(){}f(il,Md),il.prototype.g=function(){return new XMLHttpRequest},zd=new il;function Xi(a){return encodeURIComponent(String(a))}function BI(a){var h=1;a=a.split(":");const p=[];for(;h>0&&a.length;)p.push(a.shift()),h--;return a.length&&p.push(a.join(":")),p}function hn(a,h,p,m){this.j=a,this.i=h,this.l=p,this.S=m||1,this.V=new Wi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Kd}function Kd(){this.i=null,this.g="",this.h=!1}var jd={},sl={};function ol(a,h,p){a.M=1,a.A=Ho(Ct(h)),a.u=p,a.R=!0,Gd(a,null)}function Gd(a,h){a.F=Date.now(),Wo(a),a.B=Ct(a.A);var p=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),of(p.i,"t",m),a.C=0,p=a.j.L,a.h=new Kd,a.g=bf(a.j,p?h:null,!a.u),a.P>0&&(a.O=new NI(u(a.Y,a,a.g),a.P)),h=a.V,p=a.g,m=a.ba;var S="readystatechange";Array.isArray(S)||(S&&(Vd[0]=S.toString()),S=Vd);for(let D=0;D<S.length;D++){const U=Cd(p,S[D],m||h.handleEvent,!1,h.h||h);if(!U)break;h.g[U.key]=U}h=a.J?Sd(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),Qi(),MI(a.i,a.v,a.B,a.l,a.S,a.u)}hn.prototype.ba=function(a){a=a.target;const h=this.O;h&&pn(a)==3?h.j():this.Y(a)},hn.prototype.Y=function(a){try{if(a==this.g)e:{const J=pn(this.g),Ne=this.g.ya(),ce=this.g.ca();if(!(J<3)&&(J!=3||this.g&&(this.h.h||this.g.la()||ff(this.g)))){this.K||J!=4||Ne==7||(Ne==8||ce<=0?Qi(3):Qi(2)),al(this);var h=this.g.ca();this.X=h;var p=$I(this);if(this.o=h==200,FI(this.i,this.v,this.B,this.l,this.S,J,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,S=this.g;if((m=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!I(m)){var D=m;break t}}D=null}if(a=D)Ur(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,cl(this,a);else{this.o=!1,this.m=3,Xe(12),Xn(this),Zi(this);break e}}if(this.R){a=!0;let Me;for(;!this.K&&this.C<p.length;)if(Me=qI(this,p),Me==sl){J==4&&(this.m=4,Xe(14),a=!1),Ur(this.i,this.l,null,"[Incomplete Response]");break}else if(Me==jd){this.m=4,Xe(15),Ur(this.i,this.l,p,"[Invalid Chunk]"),a=!1;break}else Ur(this.i,this.l,Me,null),cl(this,Me);if(Wd(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),J!=4||p.length!=0||this.h.h||(this.m=1,Xe(16),a=!1),this.o=this.o&&a,!a)Ur(this.i,this.l,p,"[Invalid Chunked Response]"),Xn(this),Zi(this);else if(p.length>0&&!this.W){this.W=!0;var U=this.j;U.g==this&&U.aa&&!U.P&&(U.j.info("Great, no buffering proxy detected. Bytes received: "+p.length),ml(U),U.P=!0,Xe(11))}}else Ur(this.i,this.l,p,null),cl(this,p);J==4&&Xn(this),this.o&&!this.K&&(J==4?If(this.j,this):(this.o=!1,Wo(this)))}else nE(this.g),h==400&&p.indexOf("Unknown SID")>0?(this.m=3,Xe(12)):(this.m=0,Xe(13)),Xn(this),Zi(this)}}}catch{}finally{}};function $I(a){if(!Wd(a))return a.g.la();const h=ff(a.g);if(h==="")return"";let p="";const m=h.length,S=pn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Xn(a),Zi(a),"";a.h.i=new o.TextDecoder}for(let D=0;D<m;D++)a.h.h=!0,p+=a.h.i.decode(h[D],{stream:!(S&&D==m-1)});return h.length=0,a.h.g+=p,a.C=0,a.h.g}function Wd(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function qI(a,h){var p=a.C,m=h.indexOf(`
`,p);return m==-1?sl:(p=Number(h.substring(p,m)),isNaN(p)?jd:(m+=1,m+p>h.length?sl:(h=h.slice(m,m+p),a.C=m+p,h)))}hn.prototype.cancel=function(){this.K=!0,Xn(this)};function Wo(a){a.T=Date.now()+a.H,Hd(a,a.H)}function Hd(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Yi(u(a.aa,a),h)}function al(a){a.D&&(o.clearTimeout(a.D),a.D=null)}hn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(LI(this.i,this.B),this.M!=2&&(Qi(),Xe(17)),Xn(this),this.m=2,Zi(this)):Hd(this,this.T-a)};function Zi(a){a.j.I==0||a.K||If(a.j,a)}function Xn(a){al(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Od(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function cl(a,h){try{var p=a.j;if(p.I!=0&&(p.g==a||ll(p.h,a))){if(!a.L&&ll(p.h,a)&&p.I==3){try{var m=p.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var S=m;if(S[0]==0){e:if(!p.v){if(p.g)if(p.g.F+3e3<a.F)Zo(p),Jo(p);else break e;gl(p),Xe(18)}}else p.xa=S[1],0<p.xa-p.K&&S[2]<37500&&p.F&&p.A==0&&!p.C&&(p.C=Yi(u(p.Va,p),6e3));Jd(p.h)<=1&&p.ta&&(p.ta=void 0)}else er(p,11)}else if((a.L||p.g==a)&&Zo(p),!I(h))for(S=p.Ba.g.parse(h),h=0;h<S.length;h++){let ce=S[h];const Me=ce[0];if(!(Me<=p.K))if(p.K=Me,ce=ce[1],p.I==2)if(ce[0]=="c"){p.M=ce[1],p.ba=ce[2];const kt=ce[3];kt!=null&&(p.ka=kt,p.j.info("VER="+p.ka));const tr=ce[4];tr!=null&&(p.za=tr,p.j.info("SVER="+p.za));const gn=ce[5];gn!=null&&typeof gn=="number"&&gn>0&&(m=1.5*gn,p.O=m,p.j.info("backChannelRequestTimeoutMs_="+m)),m=p;const mn=a.g;if(mn){const ta=mn.g?mn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ta){var D=m.h;D.g||ta.indexOf("spdy")==-1&&ta.indexOf("quic")==-1&&ta.indexOf("h2")==-1||(D.j=D.l,D.g=new Set,D.h&&(ul(D,D.h),D.h=null))}if(m.G){const yl=mn.g?mn.g.getResponseHeader("X-HTTP-Session-Id"):null;yl&&(m.wa=yl,he(m.J,m.G,yl))}}p.I=3,p.l&&p.l.ra(),p.aa&&(p.T=Date.now()-a.F,p.j.info("Handshake RTT: "+p.T+"ms")),m=p;var U=a;if(m.na=Tf(m,m.L?m.ba:null,m.W),U.L){Xd(m.h,U);var J=U,Ne=m.O;Ne&&(J.H=Ne),J.D&&(al(J),Wo(J)),m.g=U}else _f(m);p.i.length>0&&Xo(p)}else ce[0]!="stop"&&ce[0]!="close"||er(p,7);else p.I==3&&(ce[0]=="stop"||ce[0]=="close"?ce[0]=="stop"?er(p,7):pl(p):ce[0]!="noop"&&p.l&&p.l.qa(ce),p.A=0)}}Qi(4)}catch{}}var zI=class{constructor(a,h){this.g=a,this.map=h}};function Qd(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Yd(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Jd(a){return a.h?1:a.g?a.g.size:0}function ll(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function ul(a,h){a.g?a.g.add(h):a.h=h}function Xd(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Qd.prototype.cancel=function(){if(this.i=Zd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Zd(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const p of a.g.values())h=h.concat(p.G);return h}return _(a.i)}var ef=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function KI(a,h){if(a){a=a.split("&");for(let p=0;p<a.length;p++){const m=a[p].indexOf("=");let S,D=null;m>=0?(S=a[p].substring(0,m),D=a[p].substring(m+1)):S=a[p],h(S,D?decodeURIComponent(D.replace(/\+/g," ")):"")}}}function dn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof dn?(this.l=a.l,es(this,a.j),this.o=a.o,this.g=a.g,ts(this,a.u),this.h=a.h,hl(this,af(a.i)),this.m=a.m):a&&(h=String(a).match(ef))?(this.l=!1,es(this,h[1]||"",!0),this.o=ns(h[2]||""),this.g=ns(h[3]||"",!0),ts(this,h[4]),this.h=ns(h[5]||"",!0),hl(this,h[6]||"",!0),this.m=ns(h[7]||"")):(this.l=!1,this.i=new is(null,this.l))}dn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(rs(h,tf,!0),":");var p=this.g;return(p||h=="file")&&(a.push("//"),(h=this.o)&&a.push(rs(h,tf,!0),"@"),a.push(Xi(p).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),p=this.u,p!=null&&a.push(":",String(p))),(p=this.h)&&(this.g&&p.charAt(0)!="/"&&a.push("/"),a.push(rs(p,p.charAt(0)=="/"?WI:GI,!0))),(p=this.i.toString())&&a.push("?",p),(p=this.m)&&a.push("#",rs(p,QI)),a.join("")},dn.prototype.resolve=function(a){const h=Ct(this);let p=!!a.j;p?es(h,a.j):p=!!a.o,p?h.o=a.o:p=!!a.g,p?h.g=a.g:p=a.u!=null;var m=a.h;if(p)ts(h,a.u);else if(p=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var S=h.h.lastIndexOf("/");S!=-1&&(m=h.h.slice(0,S+1)+m)}if(S=m,S==".."||S==".")m="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){m=S.lastIndexOf("/",0)==0,S=S.split("/");const D=[];for(let U=0;U<S.length;){const J=S[U++];J=="."?m&&U==S.length&&D.push(""):J==".."?((D.length>1||D.length==1&&D[0]!="")&&D.pop(),m&&U==S.length&&D.push("")):(D.push(J),m=!0)}m=D.join("/")}else m=S}return p?h.h=m:p=a.i.toString()!=="",p?hl(h,af(a.i)):p=!!a.m,p&&(h.m=a.m),h};function Ct(a){return new dn(a)}function es(a,h,p){a.j=p?ns(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ts(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function hl(a,h,p){h instanceof is?(a.i=h,YI(a.i,a.l)):(p||(h=rs(h,HI)),a.i=new is(h,a.l))}function he(a,h,p){a.i.set(h,p)}function Ho(a){return he(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function ns(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function rs(a,h,p){return typeof a=="string"?(a=encodeURI(a).replace(h,jI),p&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function jI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var tf=/[#\/\?@]/g,GI=/[#\?:]/g,WI=/[#\?]/g,HI=/[#\?@]/g,QI=/#/g;function is(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Zn(a){a.g||(a.g=new Map,a.h=0,a.i&&KI(a.i,function(h,p){a.add(decodeURIComponent(h.replace(/\+/g," ")),p)}))}r=is.prototype,r.add=function(a,h){Zn(this),this.i=null,a=Br(this,a);let p=this.g.get(a);return p||this.g.set(a,p=[]),p.push(h),this.h+=1,this};function nf(a,h){Zn(a),h=Br(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function rf(a,h){return Zn(a),h=Br(a,h),a.g.has(h)}r.forEach=function(a,h){Zn(this),this.g.forEach(function(p,m){p.forEach(function(S){a.call(h,S,m,this)},this)},this)};function sf(a,h){Zn(a);let p=[];if(typeof h=="string")rf(a,h)&&(p=p.concat(a.g.get(Br(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)p=p.concat(a[h]);return p}r.set=function(a,h){return Zn(this),this.i=null,a=Br(this,a),rf(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},r.get=function(a,h){return a?(a=sf(this,a),a.length>0?String(a[0]):h):h};function of(a,h,p){nf(a,h),p.length>0&&(a.i=null,a.g.set(Br(a,h),_(p)),a.h+=p.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var p=h[m];const S=Xi(p);p=sf(this,p);for(let D=0;D<p.length;D++){let U=S;p[D]!==""&&(U+="="+Xi(p[D])),a.push(U)}}return this.i=a.join("&")};function af(a){const h=new is;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function Br(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function YI(a,h){h&&!a.j&&(Zn(a),a.i=null,a.g.forEach(function(p,m){const S=m.toLowerCase();m!=S&&(nf(this,m),of(this,S,p))},a)),a.j=h}function JI(a,h){const p=new Ji;if(o.Image){const m=new Image;m.onload=d(fn,p,"TestLoadImage: loaded",!0,h,m),m.onerror=d(fn,p,"TestLoadImage: error",!1,h,m),m.onabort=d(fn,p,"TestLoadImage: abort",!1,h,m),m.ontimeout=d(fn,p,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function XI(a,h){const p=new Ji,m=new AbortController,S=setTimeout(()=>{m.abort(),fn(p,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(D=>{clearTimeout(S),D.ok?fn(p,"TestPingServer: ok",!0,h):fn(p,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(S),fn(p,"TestPingServer: error",!1,h)})}function fn(a,h,p,m,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),m(p)}catch{}}function ZI(){this.g=new OI}function dl(a){this.i=a.Sb||null,this.h=a.ab||!1}f(dl,Md),dl.prototype.g=function(){return new Qo(this.i,this.h)};function Qo(a,h){je.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}f(Qo,je),r=Qo.prototype,r.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,os(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,ss(this)),this.readyState=0},r.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,os(this)),this.g&&(this.readyState=3,os(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;cf(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function cf(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}r.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ss(this):os(this),this.readyState==3&&cf(this)}},r.Oa=function(a){this.g&&(this.response=this.responseText=a,ss(this))},r.Na=function(a){this.g&&(this.response=a,ss(this))},r.ga=function(){this.g&&ss(this)};function ss(a){a.readyState=4,a.l=null,a.j=null,a.B=null,os(a)}r.setRequestHeader=function(a,h){this.A.append(a,h)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var p=h.next();!p.done;)p=p.value,a.push(p[0]+": "+p[1]),p=h.next();return a.join(`\r
`)};function os(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Qo.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function lf(a){let h="";return qo(a,function(p,m){h+=m,h+=":",h+=p,h+=`\r
`}),h}function fl(a,h,p){e:{for(m in p){var m=!1;break e}m=!0}m||(p=lf(p),typeof a=="string"?p!=null&&Xi(p):he(a,h,p))}function Ee(a){je.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}f(Ee,je);var eE=/^https?$/i,tE=["POST","PUT"];r=Ee.prototype,r.Fa=function(a){this.H=a},r.ea=function(a,h,p,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():zd.g(),this.g.onreadystatechange=g(u(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(D){uf(this,D);return}if(a=p||"",p=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var S in m)p.set(S,m[S]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const D of m.keys())p.set(D,m.get(D));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(p.keys()).find(D=>D.toLowerCase()=="content-type"),S=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(tE,h,void 0)>=0)||m||S||p.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[D,U]of p)this.g.setRequestHeader(D,U);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(D){uf(this,D)}};function uf(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,hf(a),Yo(a)}function hf(a){a.A||(a.A=!0,Je(a,"complete"),Je(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,Je(this,"complete"),Je(this,"abort"),Yo(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Yo(this,!0)),Ee.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?df(this):this.Xa())},r.Xa=function(){df(this)};function df(a){if(a.h&&typeof s<"u"){if(a.v&&pn(a)==4)setTimeout(a.Ca.bind(a),0);else if(Je(a,"readystatechange"),pn(a)==4){a.h=!1;try{const D=a.ca();e:switch(D){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var p;if(!(p=h)){var m;if(m=D===0){let U=String(a.D).match(ef)[1]||null;!U&&o.self&&o.self.location&&(U=o.self.location.protocol.slice(0,-1)),m=!eE.test(U?U.toLowerCase():"")}p=m}if(p)Je(a,"complete"),Je(a,"success");else{a.o=6;try{var S=pn(a)>2?a.g.statusText:""}catch{S=""}a.l=S+" ["+a.ca()+"]",hf(a)}}finally{Yo(a)}}}}function Yo(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const p=a.g;a.g=null,h||Je(a,"ready");try{p.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function pn(a){return a.g?a.g.readyState:0}r.ca=function(){try{return pn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),VI(h)}};function ff(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function nE(a){const h={};a=(a.g&&pn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(I(a[m]))continue;var p=BI(a[m]);const S=p[0];if(p=p[1],typeof p!="string")continue;p=p.trim();const D=h[S]||[];h[S]=D,D.push(p)}PI(h,function(m){return m.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function as(a,h,p){return p&&p.internalChannelParams&&p.internalChannelParams[a]||h}function pf(a){this.za=0,this.i=[],this.j=new Ji,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=as("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=as("baseRetryDelayMs",5e3,a),this.Za=as("retryDelaySeedMs",1e4,a),this.Ta=as("forwardChannelMaxRetries",2,a),this.va=as("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Qd(a&&a.concurrentRequestLimit),this.Ba=new ZI,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=pf.prototype,r.ka=8,r.I=1,r.connect=function(a,h,p,m){Xe(0),this.W=a,this.H=h||{},p&&m!==void 0&&(this.H.OSID=p,this.H.OAID=m),this.F=this.X,this.J=Tf(this,null,this.W),Xo(this)};function pl(a){if(gf(a),a.I==3){var h=a.V++,p=Ct(a.J);if(he(p,"SID",a.M),he(p,"RID",h),he(p,"TYPE","terminate"),cs(a,p),h=new hn(a,a.j,h),h.M=2,h.A=Ho(Ct(p)),p=!1,o.navigator&&o.navigator.sendBeacon)try{p=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!p&&o.Image&&(new Image().src=h.A,p=!0),p||(h.g=bf(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Wo(h)}vf(a)}function Jo(a){a.g&&(ml(a),a.g.cancel(),a.g=null)}function gf(a){Jo(a),a.v&&(o.clearTimeout(a.v),a.v=null),Zo(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Xo(a){if(!Yd(a.h)&&!a.m){a.m=!0;var h=a.Ea;W||y(),j||(W(),j=!0),E.add(h,a),a.D=0}}function rE(a,h){return Jd(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Yi(u(a.Ea,a,h),Ef(a,a.D)),a.D++,!0)}r.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const S=new hn(this,this.j,a);let D=this.o;if(this.U&&(D?(D=Sd(D),Pd(D,this.U)):D=this.U),this.u!==null||this.R||(S.J=D,D=null),this.S)e:{for(var h=0,p=0;p<this.i.length;p++){t:{var m=this.i[p];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=p;break e}if(h===4096||p===this.i.length-1){h=p+1;break e}}h=1e3}else h=1e3;h=yf(this,S,h),p=Ct(this.J),he(p,"RID",a),he(p,"CVER",22),this.G&&he(p,"X-HTTP-Session-Id",this.G),cs(this,p),D&&(this.R?h="headers="+Xi(lf(D))+"&"+h:this.u&&fl(p,this.u,D)),ul(this.h,S),this.Ra&&he(p,"TYPE","init"),this.S?(he(p,"$req",h),he(p,"SID","null"),S.U=!0,ol(S,p,null)):ol(S,p,h),this.I=2}}else this.I==3&&(a?mf(this,a):this.i.length==0||Yd(this.h)||mf(this))};function mf(a,h){var p;h?p=h.l:p=a.V++;const m=Ct(a.J);he(m,"SID",a.M),he(m,"RID",p),he(m,"AID",a.K),cs(a,m),a.u&&a.o&&fl(m,a.u,a.o),p=new hn(a,a.j,p,a.D+1),a.u===null&&(p.J=a.o),h&&(a.i=h.G.concat(a.i)),h=yf(a,p,1e3),p.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),ul(a.h,p),ol(p,m,h)}function cs(a,h){a.H&&qo(a.H,function(p,m){he(h,m,p)}),a.l&&qo({},function(p,m){he(h,m,p)})}function yf(a,h,p){p=Math.min(a.i.length,p);const m=a.l?u(a.l.Ka,a.l,a):null;e:{var S=a.i;let J=-1;for(;;){const Ne=["count="+p];J==-1?p>0?(J=S[0].g,Ne.push("ofs="+J)):J=0:Ne.push("ofs="+J);let ce=!0;for(let Me=0;Me<p;Me++){var D=S[Me].g;const kt=S[Me].map;if(D-=J,D<0)J=Math.max(0,S[Me].g-100),ce=!1;else try{D="req"+D+"_"||"";try{var U=kt instanceof Map?kt:Object.entries(kt);for(const[tr,gn]of U){let mn=gn;c(gn)&&(mn=tl(gn)),Ne.push(D+tr+"="+encodeURIComponent(mn))}}catch(tr){throw Ne.push(D+"type="+encodeURIComponent("_badmap")),tr}}catch{m&&m(kt)}}if(ce){U=Ne.join("&");break e}}U=void 0}return a=a.i.splice(0,p),h.G=a,U}function _f(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;W||y(),j||(W(),j=!0),E.add(h,a),a.A=0}}function gl(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Yi(u(a.Da,a),Ef(a,a.A)),a.A++,!0)}r.Da=function(){if(this.v=null,wf(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Yi(u(this.Wa,this),a)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,Xe(10),Jo(this),wf(this))};function ml(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function wf(a){a.g=new hn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=Ct(a.na);he(h,"RID","rpc"),he(h,"SID",a.M),he(h,"AID",a.K),he(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&he(h,"TO",a.ia),he(h,"TYPE","xmlhttp"),cs(a,h),a.u&&a.o&&fl(h,a.u,a.o),a.O&&(a.g.H=a.O);var p=a.g;a=a.ba,p.M=1,p.A=Ho(Ct(h)),p.u=null,p.R=!0,Gd(p,a)}r.Va=function(){this.C!=null&&(this.C=null,Jo(this),gl(this),Xe(19))};function Zo(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function If(a,h){var p=null;if(a.g==h){Zo(a),ml(a),a.g=null;var m=2}else if(ll(a.h,h))p=h.G,Xd(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){p=h.u?h.u.length:0,h=Date.now()-h.F;var S=a.D;m=jo(),Je(m,new $d(m,p)),Xo(a)}else _f(a);else if(S=h.m,S==3||S==0&&h.X>0||!(m==1&&rE(a,h)||m==2&&gl(a)))switch(p&&p.length>0&&(h=a.h,h.i=h.i.concat(p)),S){case 1:er(a,5);break;case 4:er(a,10);break;case 3:er(a,6);break;default:er(a,2)}}}function Ef(a,h){let p=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(p*=2),p*h}function er(a,h){if(a.j.info("Error code "+h),h==2){var p=u(a.bb,a),m=a.Ua;const S=!m;m=new dn(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||es(m,"https"),Ho(m),S?JI(m.toString(),p):XI(m.toString(),p)}else Xe(2);a.I=0,a.l&&a.l.pa(h),vf(a),gf(a)}r.bb=function(a){a?(this.j.info("Successfully pinged google.com"),Xe(2)):(this.j.info("Failed to ping google.com"),Xe(1))};function vf(a){if(a.I=0,a.ja=[],a.l){const h=Zd(a.h);(h.length!=0||a.i.length!=0)&&(R(a.ja,h),R(a.ja,a.i),a.h.i.length=0,_(a.i),a.i.length=0),a.l.oa()}}function Tf(a,h,p){var m=p instanceof dn?Ct(p):new dn(p);if(m.g!="")h&&(m.g=h+"."+m.g),ts(m,m.u);else{var S=o.location;m=S.protocol,h=h?h+"."+S.hostname:S.hostname,S=+S.port;const D=new dn(null);m&&es(D,m),h&&(D.g=h),S&&ts(D,S),p&&(D.h=p),m=D}return p=a.G,h=a.wa,p&&h&&he(m,p,h),he(m,"VER",a.ka),cs(a,m),m}function bf(a,h,p){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Ee(new dl({ab:p})):new Ee(a.ma),h.Fa(a.L),h}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Af(){}r=Af.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function ea(){}ea.prototype.g=function(a,h){return new dt(a,h)};function dt(a,h){je.call(this),this.g=new pf(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!I(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!I(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new $r(this)}f(dt,je),dt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},dt.prototype.close=function(){pl(this.g)},dt.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var p={};p.__data__=a,a=p}else this.v&&(p={},p.__data__=tl(a),a=p);h.i.push(new zI(h.Ya++,a)),h.I==3&&Xo(h)},dt.prototype.N=function(){this.g.l=null,delete this.j,pl(this.g),delete this.g,dt.Z.N.call(this)};function Sf(a){nl.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const p in h){a=p;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}f(Sf,nl);function Rf(){rl.call(this),this.status=1}f(Rf,rl);function $r(a){this.g=a}f($r,Af),$r.prototype.ra=function(){Je(this.g,"a")},$r.prototype.qa=function(a){Je(this.g,new Sf(a))},$r.prototype.pa=function(a){Je(this.g,new Rf)},$r.prototype.oa=function(){Je(this.g,"b")},ea.prototype.createWebChannel=ea.prototype.g,dt.prototype.send=dt.prototype.o,dt.prototype.open=dt.prototype.m,dt.prototype.close=dt.prototype.close,yy=function(){return new ea},my=function(){return jo()},gy=Jn,Ql={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Go.NO_ERROR=0,Go.TIMEOUT=8,Go.HTTP_ERROR=6,pa=Go,qd.COMPLETE="complete",py=qd,Fd.EventType=Hi,Hi.OPEN="a",Hi.CLOSE="b",Hi.ERROR="c",Hi.MESSAGE="d",je.prototype.listen=je.prototype.J,bs=Fd,Ee.prototype.listenOnce=Ee.prototype.K,Ee.prototype.getLastError=Ee.prototype.Ha,Ee.prototype.getLastErrorCode=Ee.prototype.ya,Ee.prototype.getStatus=Ee.prototype.ca,Ee.prototype.getResponseJson=Ee.prototype.La,Ee.prototype.getResponseText=Ee.prototype.la,Ee.prototype.send=Ee.prototype.ea,Ee.prototype.setWithCredentials=Ee.prototype.Fa,fy=Ee}).apply(typeof ra<"u"?ra:typeof self<"u"?self:typeof window<"u"?window:{});const up="@firebase/firestore",hp="4.9.3";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Le{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Le.UNAUTHENTICATED=new Le(null),Le.GOOGLE_CREDENTIALS=new Le("google-credentials-uid"),Le.FIRST_PARTY=new Le("first-party-uid"),Le.MOCK_USER=new Le("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ui="12.7.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const On=new rc("@firebase/firestore");function Yr(){return On.logLevel}function XS(r){On.setLogLevel(r)}function V(r,...e){if(On.logLevel<=X.DEBUG){const t=e.map(ch);On.debug(`Firestore (${Ui}): ${r}`,...t)}}function Se(r,...e){if(On.logLevel<=X.ERROR){const t=e.map(ch);On.error(`Firestore (${Ui}): ${r}`,...t)}}function Gt(r,...e){if(On.logLevel<=X.WARN){const t=e.map(ch);On.warn(`Firestore (${Ui}): ${r}`,...t)}}function ch(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return function(t){return JSON.stringify(t)}(r)}catch{return r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,_y(r,n,t)}function _y(r,e,t){let n=`FIRESTORE (${Ui}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Se(n),new Error(n)}function q(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||_y(e,i,n)}function ZS(r,e){r||$(57014,e)}function B(r,e){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const C={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class N extends nt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wy{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class eR{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Le.UNAUTHENTICATED))}shutdown(){}}class tR{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class nR{constructor(e){this.t=e,this.currentUser=Le.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){q(this.o===void 0,42304);let n=this.i;const i=l=>this.i!==n?(n=this.i,t(l)):Promise.resolve();let s=new ze;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new ze,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const l=s;e.enqueueRetryable(async()=>{await l.promise,await i(this.currentUser)})},c=l=>{V("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){const l=this.t.getImmediate({optional:!0});l?c(l):(V("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new ze)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(V("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(q(typeof n.accessToken=="string",31837,{l:n}),new wy(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return q(e===null||typeof e=="string",2055,{h:e}),new Le(e)}}class rR{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=Le.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class iR{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new rR(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Le.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class dp{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class sR{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,me(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){q(this.o===void 0,3512);const n=s=>{s.error!=null&&V("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,V("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{V("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):V("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new dp(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(q(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new dp(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oR(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lh{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=oR(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function H(r,e){return r<e?-1:r>e?1:0}function Yl(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const i=r.charAt(n),s=e.charAt(n);if(i!==s)return Cl(i)===Cl(s)?H(i,s):Cl(i)?1:-1}return H(r.length,e.length)}const aR=55296,cR=57343;function Cl(r){const e=r.charCodeAt(0);return e>=aR&&e<=cR}function pi(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function Iy(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fp="__name__";class Dt{constructor(e,t,n){t===void 0?t=0:t>e.length&&$(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&$(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return Dt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Dt?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=Dt.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return H(e.length,t.length)}static compareSegments(e,t){const n=Dt.isNumericId(e),i=Dt.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?Dt.extractNumericId(e).compare(Dt.extractNumericId(t)):Yl(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Pn.fromString(e.substring(4,e.length-2))}}class Z extends Dt{construct(e,t,n){return new Z(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new N(C.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new Z(t)}static emptyPath(){return new Z([])}}const lR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ye extends Dt{construct(e,t,n){return new ye(e,t,n)}static isValidIdentifier(e){return lR.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ye.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===fp}static keyField(){return new ye([fp])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new N(C.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new N(C.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const l=e[i+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new N(C.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=l,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new N(C.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new ye(t)}static emptyPath(){return new ye([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class L{constructor(e){this.path=e}static fromPath(e){return new L(Z.fromString(e))}static fromName(e){return new L(Z.fromString(e).popFirst(5))}static empty(){return new L(Z.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&Z.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return Z.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new L(new Z(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uh(r,e,t){if(!t)throw new N(C.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function Ey(r,e,t,n){if(e===!0&&n===!0)throw new N(C.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function pp(r){if(!L.isDocumentKey(r))throw new N(C.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function gp(r){if(L.isDocumentKey(r))throw new N(C.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function vy(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function gc(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":$(12329,{type:typeof r})}function re(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new N(C.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=gc(r);throw new N(C.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function Ty(r,e){if(e<=0)throw new N(C.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xe(r,e){const t={typeString:r};return e&&(t.value=e),t}function Ao(r,e){if(!vy(r))throw new N(C.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new N(C.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mp=-62135596800,yp=1e6;class ie{static now(){return ie.fromMillis(Date.now())}static fromDate(e){return ie.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*yp);return new ie(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new N(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new N(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<mp)throw new N(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/yp}_compareTo(e){return this.seconds===e.seconds?H(this.nanoseconds,e.nanoseconds):H(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:ie._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Ao(e,ie._jsonSchema))return new ie(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-mp;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}ie._jsonSchemaVersion="firestore/timestamp/1.0",ie._jsonSchema={type:xe("string",ie._jsonSchemaVersion),seconds:xe("number"),nanoseconds:xe("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z{static fromTimestamp(e){return new z(e)}static min(){return new z(new ie(0,0))}static max(){return new z(new ie(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gi=-1;class Oa{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function Jl(r){return r.fields.find(e=>e.kind===2)}function sr(r){return r.fields.filter(e=>e.kind!==2)}Oa.UNKNOWN_ID=-1;class ga{constructor(e,t){this.fieldPath=e,this.kind=t}}class Js{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Js(0,yt.min())}}function by(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=z.fromTimestamp(n===1e9?new ie(t+1,0):new ie(t,n));return new yt(i,L.empty(),e)}function Ay(r){return new yt(r.readTime,r.key,gi)}class yt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new yt(z.min(),L.empty(),gi)}static max(){return new yt(z.max(),L.empty(),gi)}}function hh(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=L.comparator(r.documentKey,e.documentKey),t!==0?t:H(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sy="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Ry{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jn(r){if(r.code!==C.FAILED_PRECONDITION||r.message!==Sy)throw r;V("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&$(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,n)=>{t(e)})}static reject(e){return new A((t,n)=>{n(e)})}static waitFor(e){return new A((t,n)=>{let i=0,s=0,o=!1;e.forEach(c=>{++i,c.next(()=>{++s,o&&s===i&&t()},l=>n(l))}),o=!0,s===i&&t()})}static or(e){let t=A.resolve(!1);for(const n of e)t=t.next(i=>i?A.resolve(i):n());return t}static forEach(e,t){const n=[];return e.forEach((i,s)=>{n.push(t.call(this,i,s))}),this.waitFor(n)}static mapArray(e,t){return new A((n,i)=>{const s=e.length,o=new Array(s);let c=0;for(let l=0;l<s;l++){const u=l;t(e[u]).next(d=>{o[u]=d,++c,c===s&&n(o)},d=>i(d))}})}static doWhile(e,t){return new A((n,i)=>{const s=()=>{e()===!0?t().next(()=>{s()},i):n()};s()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ft="SimpleDb";class mc{static open(e,t,n,i){try{return new mc(t,e.transaction(i,n))}catch(s){throw new Os(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new ze,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new Os(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=dh(n.target.error);this.S.reject(new Os(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(V(ft,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new hR(t)}}class $t{static delete(e){return V(ft,"Removing database:",e),ar(Nu().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Ks())return!1;if($t.F())return!0;const e=we(),t=$t.M(e),n=0<t&&t<10,i=Py(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,$t.M(we())===12.2&&Se("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(V(ft,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new Os(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new N(C.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new N(C.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new Os(e,o))},i.onupgradeneeded=s=>{V(ft,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next(()=>{V(ft,"Database upgrade to version "+this.version+" complete")})}})),this.q&&(this.db.onversionchange=t=>this.q(t)),this.db}$(e){this.q=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=mc.open(this.db,e,s?"readonly":"readwrite",n),l=i(c).next(u=>(c.C(),u)).catch(u=>(c.abort(u),A.reject(u))).toPromise();return l.catch(()=>{}),await c.D,l}catch(c){const l=c,u=l.name!=="FirebaseError"&&o<3;if(V(ft,"Transaction failed with error:",l.message,"Retrying:",u),this.close(),!u)return Promise.reject(l)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Py(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class uR{constructor(e){this.U=e,this.K=!1,this.W=null}get isDone(){return this.K}get G(){return this.W}set cursor(e){this.U=e}done(){this.K=!0}j(e){this.W=e}delete(){return ar(this.U.delete())}}class Os extends N{constructor(e,t){super(C.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Gn(r){return r.name==="IndexedDbTransactionError"}class hR{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(V(ft,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(V(ft,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),ar(n)}add(e){return V(ft,"ADD",this.store.name,e,e),ar(this.store.add(e))}get(e){return ar(this.store.get(e)).next(t=>(t===void 0&&(t=null),V(ft,"GET",this.store.name,e,t),t))}delete(e){return V(ft,"DELETE",this.store.name,e),ar(this.store.delete(e))}count(){return V(ft,"COUNT",this.store.name),ar(this.store.count())}J(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new A((o,c)=>{s.onerror=l=>{c(l.target.error)},s.onsuccess=l=>{o(l.target.result)}})}{const s=this.cursor(n),o=[];return this.H(s,(c,l)=>{o.push(l)}).next(()=>o)}}Y(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new A((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}})}Z(e,t){V(ft,"DELETE ALL",this.store.name);const n=this.options(e,t);n.X=!1;const i=this.cursor(n);return this.H(i,(s,o,c)=>c.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.H(i,t)}te(e){const t=this.cursor({});return new A((n,i)=>{t.onerror=s=>{const o=dh(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():n()}):n()}})}H(e,t){const n=[];return new A((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const l=new uR(c),u=t(c.primaryKey,c.value,l);if(u instanceof A){const d=u.catch(f=>(l.done(),A.reject(f)));n.push(d)}l.isDone?i():l.G===null?c.continue():c.continue(l.G)}}).next(()=>A.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.X?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function ar(r){return new A((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=dh(n.target.error);t(i)}})}let _p=!1;function dh(r){const e=$t.M(we());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new N("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return _p||(_p=!0,setTimeout(()=>{throw n},0)),n}}return r}const Ms="IndexBackfiller";class dR{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){V(Ms,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();V(Ms,`Documents written: ${t}`)}catch(t){Gn(t)?V(Ms,"Ignoring IndexedDB error during index backfill: ",t):await jn(t)}await this.re(6e4)})}}class fR{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let i=t,s=!0;return A.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return V(Ms,`Processing collection: ${o}`),this.oe(e,o,i).next(c=>{i-=c,n.add(o)});s=!1})).next(()=>t-i)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(i,s)).next(c=>(V(Ms,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((i,s)=>{const o=Ay(s);hh(o,n)>0&&(n=o)}),new yt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lt{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}lt.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cn=-1;function So(r){return r==null}function Xs(r){return r===0&&1/r==-1/0}function Cy(r){return typeof r=="number"&&Number.isInteger(r)&&!Xs(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ma="";function Qe(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=wp(e)),e=pR(r.get(t),e);return wp(e)}function pR(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case Ma:t+="";break;default:t+=s}}return t}function wp(r){return r+Ma+""}function Ut(r){const e=r.length;if(q(e>=2,64408,{path:r}),e===2)return q(r.charAt(0)===Ma&&r.charAt(1)==="",56145,{path:r}),Z.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(Ma,s);switch((o<0||o>t)&&$(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let l;i.length===0?l=c:(i+=c,l=i,i=""),n.push(l);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:$(61167,{path:r})}s=o+2}return new Z(n)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const or="remoteDocuments",Ro="owner",zr="owner",Zs="mutationQueues",gR="userId",vt="mutations",Ip="batchId",fr="userMutationsIndex",Ep=["userId","batchId"];/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ma(r,e){return[r,Qe(e)]}function ky(r,e,t){return[r,Qe(e),t]}const mR={},mi="documentMutations",Fa="remoteDocumentsV14",yR=["prefixPath","collectionGroup","readTime","documentId"],ya="documentKeyIndex",_R=["prefixPath","collectionGroup","documentId"],Dy="collectionGroupIndex",wR=["collectionGroup","readTime","prefixPath","documentId"],eo="remoteDocumentGlobal",Xl="remoteDocumentGlobalKey",yi="targets",xy="queryTargetsIndex",IR=["canonicalId","targetId"],_i="targetDocuments",ER=["targetId","path"],fh="documentTargetsIndex",vR=["path","targetId"],La="targetGlobalKey",_r="targetGlobal",to="collectionParents",TR=["collectionId","parent"],wi="clientMetadata",bR="clientId",yc="bundles",AR="bundleId",_c="namedQueries",SR="name",ph="indexConfiguration",RR="indexId",Zl="collectionGroupIndex",PR="collectionGroup",Fs="indexState",CR=["indexId","uid"],Ny="sequenceNumberIndex",kR=["uid","sequenceNumber"],Ls="indexEntries",DR=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Vy="documentKeyIndex",xR=["indexId","uid","orderedDocumentKey"],wc="documentOverlays",NR=["userId","collectionPath","documentId"],eu="collectionPathOverlayIndex",VR=["userId","collectionPath","largestBatchId"],Oy="collectionGroupOverlayIndex",OR=["userId","collectionGroup","largestBatchId"],gh="globals",MR="name",My=[Zs,vt,mi,or,yi,Ro,_r,_i,wi,eo,to,yc,_c],FR=[...My,wc],Fy=[Zs,vt,mi,Fa,yi,Ro,_r,_i,wi,eo,to,yc,_c,wc],Ly=Fy,mh=[...Ly,ph,Fs,Ls],LR=mh,Uy=[...mh,gh],UR=Uy;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tu extends Ry{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function Oe(r,e){const t=B(r);return $t.O(t.le,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vp(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Wn(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function By(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(e,t){this.comparator=e,this.root=t||Be.EMPTY}insert(e,t){return new ue(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Be.BLACK,null,null))}remove(e){return new ue(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Be.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new ia(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new ia(this.root,e,this.comparator,!1)}getReverseIterator(){return new ia(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new ia(this.root,e,this.comparator,!0)}}class ia{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Be{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??Be.RED,this.left=i??Be.EMPTY,this.right=s??Be.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new Be(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return Be.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return Be.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Be.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Be.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw $(43730,{key:this.key,value:this.value});if(this.right.isRed())throw $(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw $(27949);return e+(this.isRed()?0:1)}}Be.EMPTY=null,Be.RED=!0,Be.BLACK=!1;Be.EMPTY=new class{constructor(){this.size=0}get key(){throw $(57766)}get value(){throw $(16141)}get color(){throw $(16727)}get left(){throw $(29726)}get right(){throw $(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new Be(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ae{constructor(e){this.comparator=e,this.data=new ue(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Tp(this.data.getIterator())}getIteratorFrom(e){return new Tp(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof ae)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new ae(this.comparator);return t.data=e,t}}class Tp{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Kr(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ut{constructor(e){this.fields=e,e.sort(ye.comparator)}static empty(){return new ut([])}unionWith(e){let t=new ae(ye.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new ut(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return pi(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $y extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function BR(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Te{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new $y("Invalid base64 string: "+s):s}}(e);return new Te(t)}static fromUint8Array(e){const t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new Te(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return H(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Te.EMPTY_BYTE_STRING=new Te("");const $R=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function en(r){if(q(!!r,39018),typeof r=="string"){let e=0;const t=$R.exec(r);if(q(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:pe(r.seconds),nanos:pe(r.nanos)}}function pe(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function tn(r){return typeof r=="string"?Te.fromBase64String(r):Te.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qy="server_timestamp",zy="__type__",Ky="__previous_value__",jy="__local_write_time__";function Ic(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[zy])==null?void 0:n.stringValue)===qy}function Ec(r){const e=r.mapValue.fields[Ky];return Ic(e)?Ec(e):e}function no(r){const e=en(r.mapValue.fields[jy].timestampValue);return new ie(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qR{constructor(e,t,n,i,s,o,c,l,u,d){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=u,this.isUsingEmulator=d}}const nu="(default)";class Mn{constructor(e,t){this.projectId=e,this.database=t||nu}static empty(){return new Mn("","")}get isDefaultDatabase(){return this.database===nu}isEqual(e){return e instanceof Mn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yh="__type__",Gy="__max__",bn={mapValue:{fields:{__type__:{stringValue:Gy}}}},_h="__vector__",Ii="value",_a={nullValue:"NULL_VALUE"};function Fn(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?Ic(r)?4:Wy(r)?9007199254740991:vc(r)?10:11:$(28295,{value:r})}function Wt(r,e){if(r===e)return!0;const t=Fn(r);if(t!==Fn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return no(r).isEqual(no(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=en(i.timestampValue),c=en(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return tn(i.bytesValue).isEqual(tn(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return pe(i.geoPointValue.latitude)===pe(s.geoPointValue.latitude)&&pe(i.geoPointValue.longitude)===pe(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return pe(i.integerValue)===pe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=pe(i.doubleValue),c=pe(s.doubleValue);return o===c?Xs(o)===Xs(c):isNaN(o)&&isNaN(c)}return!1}(r,e);case 9:return pi(r.arrayValue.values||[],e.arrayValue.values||[],Wt);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(vp(o)!==vp(c))return!1;for(const l in o)if(o.hasOwnProperty(l)&&(c[l]===void 0||!Wt(o[l],c[l])))return!1;return!0}(r,e);default:return $(52216,{left:r})}}function ro(r,e){return(r.values||[]).find(t=>Wt(t,e))!==void 0}function Ln(r,e){if(r===e)return 0;const t=Fn(r),n=Fn(e);if(t!==n)return H(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return H(r.booleanValue,e.booleanValue);case 2:return function(s,o){const c=pe(s.integerValue||s.doubleValue),l=pe(o.integerValue||o.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1}(r,e);case 3:return bp(r.timestampValue,e.timestampValue);case 4:return bp(no(r),no(e));case 5:return Yl(r.stringValue,e.stringValue);case 6:return function(s,o){const c=tn(s),l=tn(o);return c.compareTo(l)}(r.bytesValue,e.bytesValue);case 7:return function(s,o){const c=s.split("/"),l=o.split("/");for(let u=0;u<c.length&&u<l.length;u++){const d=H(c[u],l[u]);if(d!==0)return d}return H(c.length,l.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,o){const c=H(pe(s.latitude),pe(o.latitude));return c!==0?c:H(pe(s.longitude),pe(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return Ap(r.arrayValue,e.arrayValue);case 10:return function(s,o){var g,_,R,k;const c=s.fields||{},l=o.fields||{},u=(g=c[Ii])==null?void 0:g.arrayValue,d=(_=l[Ii])==null?void 0:_.arrayValue,f=H(((R=u==null?void 0:u.values)==null?void 0:R.length)||0,((k=d==null?void 0:d.values)==null?void 0:k.length)||0);return f!==0?f:Ap(u,d)}(r.mapValue,e.mapValue);case 11:return function(s,o){if(s===bn.mapValue&&o===bn.mapValue)return 0;if(s===bn.mapValue)return 1;if(o===bn.mapValue)return-1;const c=s.fields||{},l=Object.keys(c),u=o.fields||{},d=Object.keys(u);l.sort(),d.sort();for(let f=0;f<l.length&&f<d.length;++f){const g=Yl(l[f],d[f]);if(g!==0)return g;const _=Ln(c[l[f]],u[d[f]]);if(_!==0)return _}return H(l.length,d.length)}(r.mapValue,e.mapValue);default:throw $(23264,{he:t})}}function bp(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return H(r,e);const t=en(r),n=en(e),i=H(t.seconds,n.seconds);return i!==0?i:H(t.nanos,n.nanos)}function Ap(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=Ln(t[i],n[i]);if(s)return s}return H(t.length,n.length)}function Ei(r){return ru(r)}function ru(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=en(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return tn(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return L.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=ru(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${ru(t.fields[o])}`;return i+"}"}(r.mapValue):$(61005,{value:r})}function wa(r){switch(Fn(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=Ec(r);return e?16+wa(e):16;case 5:return 2*r.stringValue.length;case 6:return tn(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((i,s)=>i+wa(s),0)}(r.arrayValue);case 10:case 11:return function(n){let i=0;return Wn(n.fields,(s,o)=>{i+=s.length+wa(o)}),i}(r.mapValue);default:throw $(13486,{value:r})}}function Tr(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function iu(r){return!!r&&"integerValue"in r}function io(r){return!!r&&"arrayValue"in r}function Sp(r){return!!r&&"nullValue"in r}function Rp(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function Ia(r){return!!r&&"mapValue"in r}function vc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[yh])==null?void 0:n.stringValue)===_h}function Us(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return Wn(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=Us(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Us(r.arrayValue.values[t]);return e}return{...r}}function Wy(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===Gy}const Hy={mapValue:{fields:{[yh]:{stringValue:_h},[Ii]:{arrayValue:{}}}}};function zR(r){return"nullValue"in r?_a:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?Tr(Mn.empty(),L.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?vc(r)?Hy:{mapValue:{}}:$(35942,{value:r})}function KR(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?Tr(Mn.empty(),L.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?Hy:"mapValue"in r?vc(r)?{mapValue:{}}:bn:$(61959,{value:r})}function Pp(r,e){const t=Ln(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function Cp(r,e){const t=Ln(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $e{constructor(e){this.value=e}static empty(){return new $e({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!Ia(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Us(t)}setAll(e){let t=ye.emptyPath(),n={},i=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const l=this.getFieldsMap(t);this.applyChanges(l,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=Us(o):i.push(c.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());Ia(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Wt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];Ia(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){Wn(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new $e(Us(this.value))}}function Qy(r){const e=[];return Wn(r.fields,(t,n)=>{const i=new ye([t]);if(Ia(n)){const s=Qy(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new ut(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new de(e,0,z.min(),z.min(),z.min(),$e.empty(),0)}static newFoundDocument(e,t,n,i){return new de(e,1,t,z.min(),n,i,0)}static newNoDocument(e,t){return new de(e,2,t,z.min(),z.min(),$e.empty(),0)}static newUnknownDocument(e,t){return new de(e,3,t,z.min(),z.min(),$e.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(z.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=$e.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=$e.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=z.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof de&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new de(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Un{constructor(e,t){this.position=e,this.inclusive=t}}function kp(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=L.comparator(L.fromName(o.referenceValue),t.key):n=Ln(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function Dp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!Wt(r.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class so{constructor(e,t="asc"){this.field=e,this.dir=t}}function jR(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yy{}class te extends Yy{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new GR(e,t,n):t==="array-contains"?new QR(e,n):t==="in"?new n_(e,n):t==="not-in"?new YR(e,n):t==="array-contains-any"?new JR(e,n):new te(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new WR(e,n):new HR(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Ln(t,this.value)):t!==null&&Fn(this.value)===Fn(t)&&this.matchesComparison(Ln(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return $(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class oe extends Yy{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new oe(e,t)}matches(e){return vi(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function vi(r){return r.op==="and"}function su(r){return r.op==="or"}function wh(r){return Jy(r)&&vi(r)}function Jy(r){for(const e of r.filters)if(e instanceof oe)return!1;return!0}function ou(r){if(r instanceof te)return r.field.canonicalString()+r.op.toString()+Ei(r.value);if(wh(r))return r.filters.map(e=>ou(e)).join(",");{const e=r.filters.map(t=>ou(t)).join(",");return`${r.op}(${e})`}}function Xy(r,e){return r instanceof te?function(n,i){return i instanceof te&&n.op===i.op&&n.field.isEqual(i.field)&&Wt(n.value,i.value)}(r,e):r instanceof oe?function(n,i){return i instanceof oe&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,o,c)=>s&&Xy(o,i.filters[c]),!0):!1}(r,e):void $(19439)}function Zy(r,e){const t=r.filters.concat(e);return oe.create(t,r.op)}function e_(r){return r instanceof te?function(t){return`${t.field.canonicalString()} ${t.op} ${Ei(t.value)}`}(r):r instanceof oe?function(t){return t.op.toString()+" {"+t.getFilters().map(e_).join(" ,")+"}"}(r):"Filter"}class GR extends te{constructor(e,t,n){super(e,t,n),this.key=L.fromName(n.referenceValue)}matches(e){const t=L.comparator(e.key,this.key);return this.matchesComparison(t)}}class WR extends te{constructor(e,t){super(e,"in",t),this.keys=t_("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class HR extends te{constructor(e,t){super(e,"not-in",t),this.keys=t_("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function t_(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>L.fromName(n.referenceValue))}class QR extends te{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return io(t)&&ro(t.arrayValue,this.value)}}class n_ extends te{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&ro(this.value.arrayValue,t)}}class YR extends te{constructor(e,t){super(e,"not-in",t)}matches(e){if(ro(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!ro(this.value.arrayValue,t)}}class JR extends te{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!io(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>ro(this.value.arrayValue,n))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XR{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function au(r,e=null,t=[],n=[],i=null,s=null,o=null){return new XR(r,e,t,n,i,s,o)}function br(r){const e=B(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>ou(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),So(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>Ei(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>Ei(n)).join(",")),e.Te=t}return e.Te}function Po(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!jR(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Xy(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!Dp(r.startAt,e.startAt)&&Dp(r.endAt,e.endAt)}function Ua(r){return L.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Ba(r,e){return r.filters.filter(t=>t instanceof te&&t.field.isEqual(e))}function xp(r,e,t){let n=_a,i=!0;for(const s of Ba(r,e)){let o=_a,c=!0;switch(s.op){case"<":case"<=":o=zR(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=_a}Pp({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Pp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function Np(r,e,t){let n=bn,i=!0;for(const s of Ba(r,e)){let o=bn,c=!0;switch(s.op){case">=":case">":o=KR(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=bn}Cp({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Cp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class on{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function r_(r,e,t,n,i,s,o,c){return new on(r,e,t,n,i,s,o,c)}function Bi(r){return new on(r)}function Vp(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Ih(r){return r.collectionGroup!==null}function ci(r){const e=B(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new ae(ye.comparator);return o.filters.forEach(l=>{l.getFlattenedFilters().forEach(u=>{u.isInequality()&&(c=c.add(u.field))})}),c})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new so(s,n))}),t.has(ye.keyField().canonicalString())||e.Ie.push(new so(ye.keyField(),n))}return e.Ie}function rt(r){const e=B(r);return e.Ee||(e.Ee=ZR(e,ci(r))),e.Ee}function ZR(r,e){if(r.limitType==="F")return au(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new so(i.field,s)});const t=r.endAt?new Un(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Un(r.startAt.position,r.startAt.inclusive):null;return au(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function cu(r,e){const t=r.filters.concat([e]);return new on(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function $a(r,e,t){return new on(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function Co(r,e){return Po(rt(r),rt(e))&&r.limitType===e.limitType}function i_(r){return`${br(rt(r))}|lt:${r.limitType}`}function Jr(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>e_(i)).join(", ")}]`),So(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>Ei(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>Ei(i)).join(",")),`Target(${n})`}(rt(r))}; limitType=${r.limitType})`}function ko(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):L.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of ci(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(o,c,l){const u=kp(o,c,l);return o.inclusive?u<=0:u<0}(n.startAt,ci(n),i)||n.endAt&&!function(o,c,l){const u=kp(o,c,l);return o.inclusive?u>=0:u>0}(n.endAt,ci(n),i))}(r,e)}function s_(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function o_(r){return(e,t)=>{let n=!1;for(const i of ci(r)){const s=eP(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function eP(r,e,t){const n=r.field.isKeyField()?L.comparator(e.key,t.key):function(s,o,c){const l=o.data.field(s),u=c.data.field(s);return l!==null&&u!==null?Ln(l,u):$(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return $(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class an{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Wn(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return By(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tP=new ue(L.comparator);function ht(){return tP}const a_=new ue(L.comparator);function As(...r){let e=a_;for(const t of r)e=e.insert(t.key,t);return e}function c_(r){let e=a_;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function Bt(){return Bs()}function l_(){return Bs()}function Bs(){return new an(r=>r.toString(),(r,e)=>r.isEqual(e))}const nP=new ue(L.comparator),rP=new ae(L.comparator);function Y(...r){let e=rP;for(const t of r)e=e.add(t);return e}const iP=new ae(H);function Eh(){return iP}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vh(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Xs(e)?"-0":e}}function u_(r){return{integerValue:""+r}}function h_(r,e){return Cy(e)?u_(e):vh(r,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tc{constructor(){this._=void 0}}function sP(r,e,t){return r instanceof Ti?function(i,s){const o={fields:{[zy]:{stringValue:qy},[jy]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Ic(s)&&(s=Ec(s)),s&&(o.fields[Ky]=s),{mapValue:o}}(t,e):r instanceof Ar?f_(r,e):r instanceof Sr?p_(r,e):function(i,s){const o=d_(i,s),c=Op(o)+Op(i.Ae);return iu(o)&&iu(i.Ae)?u_(c):vh(i.serializer,c)}(r,e)}function oP(r,e,t){return r instanceof Ar?f_(r,e):r instanceof Sr?p_(r,e):t}function d_(r,e){return r instanceof bi?function(n){return iu(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class Ti extends Tc{}class Ar extends Tc{constructor(e){super(),this.elements=e}}function f_(r,e){const t=g_(e);for(const n of r.elements)t.some(i=>Wt(i,n))||t.push(n);return{arrayValue:{values:t}}}class Sr extends Tc{constructor(e){super(),this.elements=e}}function p_(r,e){let t=g_(e);for(const n of r.elements)t=t.filter(i=>!Wt(i,n));return{arrayValue:{values:t}}}class bi extends Tc{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Op(r){return pe(r.integerValue||r.doubleValue)}function g_(r){return io(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Do{constructor(e,t){this.field=e,this.transform=t}}function aP(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof Ar&&i instanceof Ar||n instanceof Sr&&i instanceof Sr?pi(n.elements,i.elements,Wt):n instanceof bi&&i instanceof bi?Wt(n.Ae,i.Ae):n instanceof Ti&&i instanceof Ti}(r.transform,e.transform)}class cP{constructor(e,t){this.version=e,this.transformResults=t}}class _e{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new _e}static exists(e){return new _e(void 0,e)}static updateTime(e){return new _e(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ea(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class bc{}function m_(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new qi(r.key,_e.none()):new $i(r.key,r.data,_e.none());{const t=r.data,n=$e.empty();let i=new ae(ye.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new cn(r.key,n,new ut(i.toArray()),_e.none())}}function lP(r,e,t){r instanceof $i?function(i,s,o){const c=i.value.clone(),l=Fp(i.fieldTransforms,s,o.transformResults);c.setAll(l),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):r instanceof cn?function(i,s,o){if(!Ea(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=Fp(i.fieldTransforms,s,o.transformResults),l=s.data;l.setAll(y_(i)),l.setAll(c),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(r,e,t):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function $s(r,e,t,n){return r instanceof $i?function(s,o,c,l){if(!Ea(s.precondition,o))return c;const u=s.value.clone(),d=Lp(s.fieldTransforms,l,o);return u.setAll(d),o.convertToFoundDocument(o.version,u).setHasLocalMutations(),null}(r,e,t,n):r instanceof cn?function(s,o,c,l){if(!Ea(s.precondition,o))return c;const u=Lp(s.fieldTransforms,l,o),d=o.data;return d.setAll(y_(s)),d.setAll(u),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(f=>f.field))}(r,e,t,n):function(s,o,c){return Ea(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(r,e,t)}function uP(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=d_(n.transform,i||null);s!=null&&(t===null&&(t=$e.empty()),t.set(n.field,s))}return t||null}function Mp(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&pi(n,i,(s,o)=>aP(s,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class $i extends bc{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class cn extends bc{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function y_(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function Fp(r,e,t){const n=new Map;q(r.length===t.length,32656,{Re:t.length,Ve:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,oP(o,c,t[i]))}return n}function Lp(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,sP(s,o,e))}return n}class qi extends bc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Th extends bc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bh{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&lP(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=$s(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=$s(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=l_();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const l=m_(o,c);l!==null&&n.set(i.key,l),o.isValidDocument()||o.convertToNoDocument(z.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),Y())}isEqual(e){return this.batchId===e.batchId&&pi(this.mutations,e.mutations,(t,n)=>Mp(t,n))&&pi(this.baseMutations,e.baseMutations,(t,n)=>Mp(t,n))}}class Ah{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){q(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let i=function(){return nP}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new Ah(e,t,n,i)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sh{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hP{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Ce,ne;function __(r){switch(r){case C.OK:return $(64938);case C.CANCELLED:case C.UNKNOWN:case C.DEADLINE_EXCEEDED:case C.RESOURCE_EXHAUSTED:case C.INTERNAL:case C.UNAVAILABLE:case C.UNAUTHENTICATED:return!1;case C.INVALID_ARGUMENT:case C.NOT_FOUND:case C.ALREADY_EXISTS:case C.PERMISSION_DENIED:case C.FAILED_PRECONDITION:case C.ABORTED:case C.OUT_OF_RANGE:case C.UNIMPLEMENTED:case C.DATA_LOSS:return!0;default:return $(15467,{code:r})}}function w_(r){if(r===void 0)return Se("GRPC error has no .code"),C.UNKNOWN;switch(r){case Ce.OK:return C.OK;case Ce.CANCELLED:return C.CANCELLED;case Ce.UNKNOWN:return C.UNKNOWN;case Ce.DEADLINE_EXCEEDED:return C.DEADLINE_EXCEEDED;case Ce.RESOURCE_EXHAUSTED:return C.RESOURCE_EXHAUSTED;case Ce.INTERNAL:return C.INTERNAL;case Ce.UNAVAILABLE:return C.UNAVAILABLE;case Ce.UNAUTHENTICATED:return C.UNAUTHENTICATED;case Ce.INVALID_ARGUMENT:return C.INVALID_ARGUMENT;case Ce.NOT_FOUND:return C.NOT_FOUND;case Ce.ALREADY_EXISTS:return C.ALREADY_EXISTS;case Ce.PERMISSION_DENIED:return C.PERMISSION_DENIED;case Ce.FAILED_PRECONDITION:return C.FAILED_PRECONDITION;case Ce.ABORTED:return C.ABORTED;case Ce.OUT_OF_RANGE:return C.OUT_OF_RANGE;case Ce.UNIMPLEMENTED:return C.UNIMPLEMENTED;case Ce.DATA_LOSS:return C.DATA_LOSS;default:return $(39323,{code:r})}}(ne=Ce||(Ce={}))[ne.OK=0]="OK",ne[ne.CANCELLED=1]="CANCELLED",ne[ne.UNKNOWN=2]="UNKNOWN",ne[ne.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ne[ne.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ne[ne.NOT_FOUND=5]="NOT_FOUND",ne[ne.ALREADY_EXISTS=6]="ALREADY_EXISTS",ne[ne.PERMISSION_DENIED=7]="PERMISSION_DENIED",ne[ne.UNAUTHENTICATED=16]="UNAUTHENTICATED",ne[ne.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ne[ne.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ne[ne.ABORTED=10]="ABORTED",ne[ne.OUT_OF_RANGE=11]="OUT_OF_RANGE",ne[ne.UNIMPLEMENTED=12]="UNIMPLEMENTED",ne[ne.INTERNAL=13]="INTERNAL",ne[ne.UNAVAILABLE=14]="UNAVAILABLE",ne[ne.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function I_(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dP=new Pn([4294967295,4294967295],0);function Up(r){const e=I_().encode(r),t=new dy;return t.update(e),new Uint8Array(t.digest())}function Bp(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new Pn([t,n],0),new Pn([i,s],0)]}class Rh{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new Ss(`Invalid padding: ${t}`);if(n<0)throw new Ss(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new Ss(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new Ss(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=Pn.fromNumber(this.ge)}ye(e,t,n){let i=e.add(t.multiply(Pn.fromNumber(n)));return i.compare(dP)===1&&(i=new Pn([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Up(e),[n,i]=Bp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);if(!this.we(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new Rh(s,i,t);return n.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Up(e),[n,i]=Bp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);this.Se(o)}}Se(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class Ss extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xo{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,No.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new xo(z.min(),i,new ue(H),ht(),Y())}}class No{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new No(n,t,Y(),Y(),Y())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class va{constructor(e,t,n,i){this.be=e,this.removedTargetIds=t,this.key=n,this.De=i}}class E_{constructor(e,t){this.targetId=e,this.Ce=t}}class v_{constructor(e,t,n=Te.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class $p{constructor(){this.ve=0,this.Fe=qp(),this.Me=Te.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=Y(),t=Y(),n=Y();return this.Fe.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:$(38017,{changeType:s})}}),new No(this.Me,this.xe,e,t,n)}qe(){this.Oe=!1,this.Fe=qp()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,q(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class fP{constructor(e){this.Ge=e,this.ze=new Map,this.je=ht(),this.Je=sa(),this.He=sa(),this.Ye=new ue(H)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(e.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.We(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:$(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,i)=>{this.rt(i)&&t(i)})}st(e){const t=e.targetId,n=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(Ua(s))if(n===0){const o=new L(s.path);this.et(t,o,de.newNoDocument(o,z.min()))}else q(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const c=this.ut(e),l=c?this.ct(c,e,o):1;if(l!==0){this.it(t);const u=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,u)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=tn(n).toUint8Array()}catch(l){if(l instanceof $y)return Gt("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l}try{c=new Rh(o,i,s)}catch(l){return Gt(l instanceof Ss?"BloomFilter error: ":"Applying bloom filter failed: ",l),null}return c.ge===0?null:c}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)}),i}Tt(e){const t=new Map;this.ze.forEach((s,o)=>{const c=this.ot(o);if(c){if(s.current&&Ua(c.target)){const l=new L(c.target.path);this.It(l).has(o)||this.Et(o,l)||this.et(o,l,de.newNoDocument(l,e))}s.Be&&(t.set(o,s.ke()),s.qe())}});let n=Y();this.He.forEach((s,o)=>{let c=!0;o.forEachWhile(l=>{const u=this.ot(l);return!u||u.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(n=n.add(s))}),this.je.forEach((s,o)=>o.setReadTime(e));const i=new xo(e,t,this.Ye,this.je,n);return this.je=ht(),this.Je=sa(),this.He=sa(),this.Ye=new ue(H),i}Xe(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,n),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.Qe(t,1):i.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new $p,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new ae(H),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new ae(H),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||V("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new $p),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function sa(){return new ue(L.comparator)}function qp(){return new ue(L.comparator)}const pP={asc:"ASCENDING",desc:"DESCENDING"},gP={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},mP={and:"AND",or:"OR"};class yP{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function lu(r,e){return r.useProto3Json||So(e)?e:{value:e}}function Ai(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function T_(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function _P(r,e){return Ai(r,e.toTimestamp())}function Re(r){return q(!!r,49232),z.fromTimestamp(function(t){const n=en(t);return new ie(n.seconds,n.nanos)}(r))}function Ph(r,e){return uu(r,e).canonicalString()}function uu(r,e){const t=function(i){return new Z(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function b_(r){const e=Z.fromString(r);return q(V_(e),10190,{key:e.toString()}),e}function oo(r,e){return Ph(r.databaseId,e.path)}function qt(r,e){const t=b_(e);if(t.get(1)!==r.databaseId.projectId)throw new N(C.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new N(C.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new L(R_(t))}function A_(r,e){return Ph(r.databaseId,e)}function S_(r){const e=b_(r);return e.length===4?Z.emptyPath():R_(e)}function hu(r){return new Z(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function R_(r){return q(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function zp(r,e,t){return{name:oo(r,e),fields:t.value.mapValue.fields}}function P_(r,e,t){const n=qt(r,e.name),i=Re(e.updateTime),s=e.createTime?Re(e.createTime):z.min(),o=new $e({mapValue:{fields:e.fields}}),c=de.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function wP(r,e){return"found"in e?function(n,i){q(!!i.found,43571),i.found.name,i.found.updateTime;const s=qt(n,i.found.name),o=Re(i.found.updateTime),c=i.found.createTime?Re(i.found.createTime):z.min(),l=new $e({mapValue:{fields:i.found.fields}});return de.newFoundDocument(s,o,c,l)}(r,e):"missing"in e?function(n,i){q(!!i.missing,3894),q(!!i.readTime,22933);const s=qt(n,i.missing),o=Re(i.readTime);return de.newNoDocument(s,o)}(r,e):$(7234,{result:e})}function IP(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(u){return u==="NO_CHANGE"?0:u==="ADD"?1:u==="REMOVE"?2:u==="CURRENT"?3:u==="RESET"?4:$(39313,{state:u})}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(u,d){return u.useProto3Json?(q(d===void 0||typeof d=="string",58123),Te.fromBase64String(d||"")):(q(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),Te.fromUint8Array(d||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(u){const d=u.code===void 0?C.UNKNOWN:w_(u.code);return new N(d,u.message||"")}(o);t=new v_(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=qt(r,n.document.name),s=Re(n.document.updateTime),o=n.document.createTime?Re(n.document.createTime):z.min(),c=new $e({mapValue:{fields:n.document.fields}}),l=de.newFoundDocument(i,s,o,c),u=n.targetIds||[],d=n.removedTargetIds||[];t=new va(u,d,l.key,l)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=qt(r,n.document),s=n.readTime?Re(n.readTime):z.min(),o=de.newNoDocument(i,s),c=n.removedTargetIds||[];t=new va([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=qt(r,n.document),s=n.removedTargetIds||[];t=new va([],s,i,null)}else{if(!("filter"in e))return $(11601,{Rt:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new hP(i,s),c=n.targetId;t=new E_(c,o)}}return t}function ao(r,e){let t;if(e instanceof $i)t={update:zp(r,e.key,e.value)};else if(e instanceof qi)t={delete:oo(r,e.key)};else if(e instanceof cn)t={update:zp(r,e.key,e.data),updateMask:SP(e.fieldMask)};else{if(!(e instanceof Th))return $(16599,{Vt:e.type});t={verify:oo(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,o){const c=o.transform;if(c instanceof Ti)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof Ar)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof Sr)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof bi)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw $(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:_P(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:$(27497)}(r,e.precondition)),t}function du(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?_e.updateTime(Re(s.updateTime)):s.exists!==void 0?_e.exists(s.exists):_e.none()}(e.currentDocument):_e.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(o,c){let l=null;if("setToServerValue"in c)q(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),l=new Ti;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];l=new Ar(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];l=new Sr(d)}else"increment"in c?l=new bi(o,c.increment):$(16584,{proto:c});const u=ye.fromServerFormat(c.fieldPath);return new Do(u,l)}(r,i)):[];if(e.update){e.update.name;const i=qt(r,e.update.name),s=new $e({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(l){const u=l.fieldPaths||[];return new ut(u.map(d=>ye.fromServerFormat(d)))}(e.updateMask);return new cn(i,s,o,t,n)}return new $i(i,s,t,n)}if(e.delete){const i=qt(r,e.delete);return new qi(i,t)}if(e.verify){const i=qt(r,e.verify);return new Th(i,t)}return $(1463,{proto:e})}function EP(r,e){return r&&r.length>0?(q(e!==void 0,14353),r.map(t=>function(i,s){let o=i.updateTime?Re(i.updateTime):Re(s);return o.isEqual(z.min())&&(o=Re(s)),new cP(o,i.transformResults||[])}(t,e))):[]}function C_(r,e){return{documents:[A_(r,e.path)]}}function k_(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=A_(r,i);const s=function(u){if(u.length!==0)return N_(oe.create(u,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const o=function(u){if(u.length!==0)return u.map(d=>function(g){return{field:Xr(g.field),direction:TP(g.dir)}}(d))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=lu(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(u){return{before:u.inclusive,values:u.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(u){return{before:!u.inclusive,values:u.position}}(e.endAt)),{ft:t,parent:i}}function D_(r){let e=S_(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){q(n===1,65062);const d=t.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];t.where&&(s=function(f){const g=x_(f);return g instanceof oe&&wh(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(f){return f.map(g=>function(R){return new so(Zr(R.field),function(T){switch(T){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(R.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(f){let g;return g=typeof f=="object"?f.value:f,So(g)?null:g}(t.limit));let l=null;t.startAt&&(l=function(f){const g=!!f.before,_=f.values||[];return new Un(_,g)}(t.startAt));let u=null;return t.endAt&&(u=function(f){const g=!f.before,_=f.values||[];return new Un(_,g)}(t.endAt)),r_(e,i,o,s,c,"F",l,u)}function vP(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return $(28987,{purpose:i})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function x_(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Zr(t.unaryFilter.field);return te.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Zr(t.unaryFilter.field);return te.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Zr(t.unaryFilter.field);return te.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Zr(t.unaryFilter.field);return te.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return $(61313);default:return $(60726)}}(r):r.fieldFilter!==void 0?function(t){return te.create(Zr(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return $(58110);default:return $(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return oe.create(t.compositeFilter.filters.map(n=>x_(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return $(1026)}}(t.compositeFilter.op))}(r):$(30097,{filter:r})}function TP(r){return pP[r]}function bP(r){return gP[r]}function AP(r){return mP[r]}function Xr(r){return{fieldPath:r.canonicalString()}}function Zr(r){return ye.fromServerFormat(r.fieldPath)}function N_(r){return r instanceof te?function(t){if(t.op==="=="){if(Rp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NAN"}};if(Sp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Rp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NOT_NAN"}};if(Sp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Xr(t.field),op:bP(t.op),value:t.value}}}(r):r instanceof oe?function(t){const n=t.getFilters().map(i=>N_(i));return n.length===1?n[0]:{compositeFilter:{op:AP(t.op),filters:n}}}(r):$(54877,{filter:r})}function SP(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function V_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qt{constructor(e,t,n,i,s=z.min(),o=z.min(),c=Te.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=l}withSequenceNumber(e){return new Qt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Qt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O_{constructor(e){this.yt=e}}function RP(r,e){let t;if(e.document)t=P_(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=L.fromSegments(e.noDocument.path),i=Pr(e.noDocument.readTime);t=de.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return $(56709);{const n=L.fromSegments(e.unknownDocument.path),i=Pr(e.unknownDocument.version);t=de.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new ie(i[0],i[1]);return z.fromTimestamp(s)}(e.readTime)),t}function Kp(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:qa(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,o){return{name:oo(s,o.key),fields:o.data.value.mapValue.fields,updateTime:Ai(s,o.version.toTimestamp()),createTime:Ai(s,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:Rr(e.version)};else{if(!e.isUnknownDocument())return $(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:Rr(e.version)}}return n}function qa(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function Rr(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Pr(r){const e=new ie(r.seconds,r.nanoseconds);return z.fromTimestamp(e)}function cr(r,e){const t=(e.baseMutations||[]).map(s=>du(r.yt,s));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>du(r.yt,s)),i=ie.fromMillis(e.localWriteTimeMs);return new bh(e.batchId,i,t,n)}function Rs(r){const e=Pr(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?Pr(r.lastLimboFreeSnapshotVersion):z.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){const o=s.documents.length;return q(o===1,1966,{count:o}),rt(Bi(S_(s.documents[0])))}(r.query):function(s){return rt(D_(s))}(r.query),new Qt(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,Te.fromBase64String(r.resumeToken))}function M_(r,e){const t=Rr(e.snapshotVersion),n=Rr(e.lastLimboFreeSnapshotVersion);let i;i=Ua(e.target)?C_(r.yt,e.target):k_(r.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:br(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function Ch(r){const e=D_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?$a(e,e.limit,"L"):e}function kl(r,e){return new Sh(e.largestBatchId,du(r.yt,e.overlayMutation))}function jp(r,e){const t=e.path.lastSegment();return[r,Qe(e.path.popLast()),t]}function Gp(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:Rr(n.readTime),documentKey:Qe(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PP{getBundleMetadata(e,t){return Wp(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:Pr(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return Wp(e).put(function(i){return{bundleId:i.id,createTime:Rr(Re(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return Hp(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:Ch(s.bundledQuery),readTime:Pr(s.readTime)}}(n)})}saveNamedQuery(e,t){return Hp(e).put(function(i){return{name:i.name,readTime:Rr(Re(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function Wp(r){return Oe(r,yc)}function Hp(r){return Oe(r,_c)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ac{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new Ac(e,n)}getOverlay(e,t){return ps(e).get(jp(this.userId,t)).next(n=>n?kl(this.serializer,n):null)}getOverlays(e,t){const n=Bt();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,o)=>{const c=new Sh(t,o);i.push(this.St(e,c))}),A.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(o=>i.add(Qe(o.getCollectionPath())));const s=[];return i.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(ps(e).Z(eu,c))}),A.waitFor(s)}getOverlaysForCollection(e,t,n){const i=Bt(),s=Qe(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return ps(e).J(eu,o).next(c=>{for(const l of c){const u=kl(this.serializer,l);i.set(u.getKey(),u)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=Bt();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return ps(e).ee({index:Oy,range:c},(l,u,d)=>{const f=kl(this.serializer,u);s.size()<i||f.largestBatchId===o?(s.set(f.getKey(),f),o=f.largestBatchId):d.done()}).next(()=>s)}St(e,t){return ps(e).put(function(i,s,o){const[c,l,u]=jp(s,o.mutation.key);return{userId:s,collectionPath:l,documentId:u,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:ao(i.yt,o.mutation)}}(this.serializer,this.userId,t))}}function ps(r){return Oe(r,wc)}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CP{bt(e){return Oe(e,gh)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?Te.fromUint8Array(n):Te.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lr{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(pe(e.integerValue));else if("doubleValue"in e){const n=pe(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),Xs(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=en(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(tn(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?Wy(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):vc(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):$(19022,{$t:e})}Ot(e,t){this.Ft(t,25),this.Ut(e,t)}Ut(e,t){t.xt(e)}qt(e,t){const n=e.fields||{};this.Ft(t,55);for(const i of Object.keys(n))this.Ot(i,t),this.Ct(n[i],t)}kt(e,t){var o,c;const n=e.fields||{};this.Ft(t,53);const i=Ii,s=((c=(o=n[i].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(pe(s)),this.Ot(i,t),this.Ct(n[i],t)}Qt(e,t){const n=e.values||[];this.Ft(t,50);for(const i of n)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),L.fromName(e).path.forEach(n=>{this.Ft(t,60),this.Ut(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}lr.Kt=new lr;/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const jr=255;function kP(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Qp(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const o=kP(255&n[s]);if(i+=o,o!==8)break}return i}(r);return Math.ceil(e/8)}class DP{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Wt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Jt(n.value),n=t.next();this.Ht()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Jt(n);else if(n<2048)this.Jt(960|n>>>6),this.Jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|n>>>12),this.Jt(128|63&n>>>6),this.Jt(128|63&n);else{const i=t.codePointAt(0);this.Jt(240|i>>>18),this.Jt(128|63&i>>>12),this.Jt(128|63&i>>>6),this.Jt(128|63&i)}}this.Ht()}Xt(e){const t=this.en(e),n=Qp(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),n=Qp(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(jr),this.sn(255)}_n(){this.an(jr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===jr?(this.sn(jr),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===jr?(this.an(jr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class xP{constructor(e){this.cn=e}Bt(e){this.cn.Wt(e)}xt(e){this.cn.Yt(e)}Mt(e){this.cn.Xt(e)}vt(){this.cn.rn()}}class NP{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class gs{constructor(){this.cn=new DP,this.ln=new xP(this.cn),this.hn=new NP(this.cn)}seed(e){this.cn.seed(e)}Pn(e){return e===0?this.ln:this.hn}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ur{constructor(e,t,n,i){this.Tn=e,this.In=t,this.En=n,this.dn=i}An(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new ur(this.Tn,this.In,this.En,n)}Rn(e,t,n){return{indexId:this.Tn,uid:e,arrayValue:Ta(this.En),directionalValue:Ta(this.dn),orderedDocumentKey:Ta(t),documentKey:n.path.toArray()}}Vn(e,t,n){const i=this.Rn(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function _n(r,e){let t=r.Tn-e.Tn;return t!==0?t:(t=Yp(r.En,e.En),t!==0?t:(t=Yp(r.dn,e.dn),t!==0?t:L.comparator(r.In,e.In)))}function Yp(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function Ta(r){return Zg()?function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n}(r):r}function Jp(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(r)}class Xp{constructor(e){this.mn=new ae((t,n)=>ye.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.fn=e.orderBy,this.gn=[];for(const t of e.filters){const n=t;n.isInequality()?this.mn=this.mn.add(n):this.gn.push(n)}}get pn(){return this.mn.size>1}yn(e){if(q(e.collectionGroup===this.collectionId,49279),this.pn)return!1;const t=Jl(e);if(t!==void 0&&!this.wn(t))return!1;const n=sr(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.wn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.mn.size>0){const c=this.mn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const l=n[s];if(!this.Sn(c,l)||!this.bn(this.fn[o++],l))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.fn.length||!this.bn(this.fn[o++],c))return!1}return!0}Dn(){if(this.pn)return null;let e=new ae(ye.comparator);const t=[];for(const n of this.gn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new ga(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new ga(n.field,0))}for(const n of this.fn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new ga(n.field,n.dir==="asc"?0:1)));return new Oa(Oa.UNKNOWN_ID,this.collectionId,t,Js.empty())}wn(e){for(const t of this.gn)if(this.Sn(t,e))return!0;return!1}Sn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}bn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function F_(r){var t,n;if(q(r instanceof te||r instanceof oe,20012),r instanceof te){if(r instanceof n_){const i=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(s=>te.create(r.field,"==",s)))||[];return oe.create(i,"or")}return r}const e=r.filters.map(i=>F_(i));return oe.create(e,r.op)}function VP(r){if(r.getFilters().length===0)return[];const e=gu(F_(r));return q(L_(e),7391),fu(e)||pu(e)?[e]:e.getFilters()}function fu(r){return r instanceof te}function pu(r){return r instanceof oe&&wh(r)}function L_(r){return fu(r)||pu(r)||function(t){if(t instanceof oe&&su(t)){for(const n of t.getFilters())if(!fu(n)&&!pu(n))return!1;return!0}return!1}(r)}function gu(r){if(q(r instanceof te||r instanceof oe,34018),r instanceof te)return r;if(r.filters.length===1)return gu(r.filters[0]);const e=r.filters.map(n=>gu(n));let t=oe.create(e,r.op);return t=za(t),L_(t)?t:(q(t instanceof oe,64498),q(vi(t),40251),q(t.filters.length>1,57927),t.filters.reduce((n,i)=>kh(n,i)))}function kh(r,e){let t;return q(r instanceof te||r instanceof oe,38388),q(e instanceof te||e instanceof oe,25473),t=r instanceof te?e instanceof te?function(i,s){return oe.create([i,s],"and")}(r,e):Zp(r,e):e instanceof te?Zp(e,r):function(i,s){if(q(i.filters.length>0&&s.filters.length>0,48005),vi(i)&&vi(s))return Zy(i,s.getFilters());const o=su(i)?i:s,c=su(i)?s:i,l=o.filters.map(u=>kh(u,c));return oe.create(l,"or")}(r,e),za(t)}function Zp(r,e){if(vi(e))return Zy(e,r.getFilters());{const t=e.filters.map(n=>kh(r,n));return oe.create(t,"or")}}function za(r){if(q(r instanceof te||r instanceof oe,11850),r instanceof te)return r;const e=r.getFilters();if(e.length===1)return za(e[0]);if(Jy(r))return r;const t=e.map(i=>za(i)),n=[];return t.forEach(i=>{i instanceof te?n.push(i):i instanceof oe&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:oe.create(n,r.op)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class OP{constructor(){this.Cn=new Dh}addToCollectionParentIndex(e,t){return this.Cn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(yt.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(yt.min())}updateCollectionGroup(e,t,n){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class Dh{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new ae(Z.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new ae(Z.comparator)).toArray()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eg="IndexedDbIndexManager",oa=new Uint8Array(0);class MP{constructor(e,t){this.databaseId=t,this.vn=new Dh,this.Fn=new an(n=>br(n),(n,i)=>Po(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.vn.add(t)});const s={collectionId:n,parent:Qe(i)};return tg(e).put(s)}return A.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[Iy(t),""],!1,!0);return tg(e).J(i).next(s=>{for(const o of s){if(o.collectionId!==t)break;n.push(Ut(o.parent))}return n})}addFieldIndex(e,t){const n=ms(e),i=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(l=>[l.fieldPath.canonicalString(),l.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=Wr(e);return s.next(c=>{o.put(Gp(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=ms(e),i=Wr(e),s=Gr(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=ms(e),n=Gr(e),i=Wr(e);return t.Z().next(()=>n.Z()).next(()=>i.Z())}createTargetIndexes(e,t){return A.forEach(this.Mn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new Xp(n).Dn();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=Gr(e);let i=!0;const s=new Map;return A.forEach(this.Mn(t),o=>this.xn(e,o).next(c=>{i&&(i=!!c),s.set(o,c)})).next(()=>{if(i){let o=Y();const c=[];return A.forEach(s,(l,u)=>{V(eg,`Using index ${function(F){return`id=${F.indexId}|cg=${F.collectionGroup}|f=${F.fields.map(K=>`${K.fieldPath}:${K.kind}`).join(",")}`}(l)} to execute ${br(t)}`);const d=function(F,K){const W=Jl(K);if(W===void 0)return null;for(const j of Ba(F,W.fieldPath))switch(j.op){case"array-contains-any":return j.value.arrayValue.values||[];case"array-contains":return[j.value]}return null}(u,l),f=function(F,K){const W=new Map;for(const j of sr(K))for(const E of Ba(F,j.fieldPath))switch(E.op){case"==":case"in":W.set(j.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return W.set(j.fieldPath.canonicalString(),E.value),Array.from(W.values())}return null}(u,l),g=function(F,K){const W=[];let j=!0;for(const E of sr(K)){const y=E.kind===0?xp(F,E.fieldPath,F.startAt):Np(F,E.fieldPath,F.startAt);W.push(y.value),j&&(j=y.inclusive)}return new Un(W,j)}(u,l),_=function(F,K){const W=[];let j=!0;for(const E of sr(K)){const y=E.kind===0?Np(F,E.fieldPath,F.endAt):xp(F,E.fieldPath,F.endAt);W.push(y.value),j&&(j=y.inclusive)}return new Un(W,j)}(u,l),R=this.On(l,u,g),k=this.On(l,u,_),T=this.Nn(l,u,f),x=this.Bn(l.indexId,d,R,g.inclusive,k,_.inclusive,T);return A.forEach(x,M=>n.Y(M,t.limit).next(F=>{F.forEach(K=>{const W=L.fromSegments(K.documentKey);o.has(W)||(o=o.add(W),c.push(W))})}))}).next(()=>c)}return A.resolve(null)})}Mn(e){let t=this.Fn.get(e);return t||(e.filters.length===0?t=[e]:t=VP(oe.create(e.filters,"and")).map(n=>au(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Fn.set(e,t),t)}Bn(e,t,n,i,s,o,c){const l=(t!=null?t.length:1)*Math.max(n.length,s.length),u=l/(t!=null?t.length:1),d=[];for(let f=0;f<l;++f){const g=t?this.Ln(t[f/u]):oa,_=this.kn(e,g,n[f%u],i),R=this.qn(e,g,s[f%u],o),k=c.map(T=>this.kn(e,g,T,!0));d.push(...this.createRange(_,R,k))}return d}kn(e,t,n,i){const s=new ur(e,L.empty(),t,n);return i?s:s.An()}qn(e,t,n,i){const s=new ur(e,L.empty(),t,n);return i?s.An():s}xn(e,t){const n=new Xp(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let o=null;for(const c of s)n.yn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let n=2;const i=this.Mn(t);return A.forEach(i,s=>this.xn(e,s).next(o=>{o?n!==0&&o.fields.length<function(l){let u=new ae(ye.comparator),d=!1;for(const f of l.filters)for(const g of f.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?d=!0:u=u.add(g.field));for(const f of l.orderBy)f.field.isKeyField()||(u=u.add(f.field));return u.size+(d?1:0)}(s)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&i.length>1&&n===2?1:n)}Qn(e,t){const n=new gs;for(const i of sr(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.Pn(i.kind);lr.Kt.Dt(s,o)}return n.un()}Ln(e){const t=new gs;return lr.Kt.Dt(e,t.Pn(0)),t.un()}$n(e,t){const n=new gs;return lr.Kt.Dt(Tr(this.databaseId,t),n.Pn(function(s){const o=sr(s);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}Nn(e,t,n){if(n===null)return[];let i=[];i.push(new gs);let s=0;for(const o of sr(e)){const c=n[s++];for(const l of i)if(this.Un(t,o.fieldPath)&&io(c))i=this.Kn(i,o,c);else{const u=l.Pn(o.kind);lr.Kt.Dt(c,u)}}return this.Wn(i)}On(e,t,n){return this.Nn(e,t,n.position)}Wn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Kn(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const l=new gs;l.seed(c.un()),lr.Kt.Dt(o,l.Pn(t.kind)),s.push(l)}return s}Un(e,t){return!!e.filters.find(n=>n instanceof te&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=ms(e),i=Wr(e);return(t?n.J(Zl,IDBKeyRange.bound(t,t)):n.J()).next(s=>{const o=[];return A.forEach(s,c=>i.get([c.indexId,this.uid]).next(l=>{o.push(function(d,f){const g=f?new Js(f.sequenceNumber,new yt(Pr(f.readTime),new L(Ut(f.documentKey)),f.largestBatchId)):Js.empty(),_=d.fields.map(([R,k])=>new ga(ye.fromServerFormat(R),k));return new Oa(d.indexId,d.collectionGroup,_,g)}(c,l))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:H(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=ms(e),s=Wr(e);return this.Gn(e).next(o=>i.J(Zl,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,l=>s.put(Gp(l.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return A.forEach(t,(i,s)=>{const o=n.get(i.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next(c=>(n.set(i.collectionGroup,c),A.forEach(c,l=>this.zn(e,i,l).next(u=>{const d=this.jn(s,l);return u.isEqual(d)?A.resolve():this.Jn(e,s,l,u,d)}))))})}Hn(e,t,n,i){return Gr(e).put(i.Rn(this.uid,this.$n(n,t.key),t.key))}Yn(e,t,n,i){return Gr(e).delete(i.Vn(this.uid,this.$n(n,t.key),t.key))}zn(e,t,n){const i=Gr(e);let s=new ae(_n);return i.ee({index:Vy,range:IDBKeyRange.only([n.indexId,this.uid,Ta(this.$n(n,t))])},(o,c)=>{s=s.add(new ur(n.indexId,t,Jp(c.arrayValue),Jp(c.directionalValue)))}).next(()=>s)}jn(e,t){let n=new ae(_n);const i=this.Qn(t,e);if(i==null)return n;const s=Jl(t);if(s!=null){const o=e.data.field(s.fieldPath);if(io(o))for(const c of o.arrayValue.values||[])n=n.add(new ur(t.indexId,e.key,this.Ln(c),i))}else n=n.add(new ur(t.indexId,e.key,oa,i));return n}Jn(e,t,n,i,s){V(eg,"Updating index entries for document '%s'",t.key);const o=[];return function(l,u,d,f,g){const _=l.getIterator(),R=u.getIterator();let k=Kr(_),T=Kr(R);for(;k||T;){let x=!1,M=!1;if(k&&T){const F=d(k,T);F<0?M=!0:F>0&&(x=!0)}else k!=null?M=!0:x=!0;x?(f(T),T=Kr(R)):M?(g(k),k=Kr(_)):(k=Kr(_),T=Kr(R))}}(i,s,_n,c=>{o.push(this.Hn(e,t,n,c))},c=>{o.push(this.Yn(e,t,n,c))}),A.waitFor(o)}Gn(e){let t=1;return Wr(e).ee({index:Ny,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,c)=>_n(o,c)).filter((o,c,l)=>!c||_n(o,l[c-1])!==0);const i=[];i.push(e);for(const o of n){const c=_n(o,e),l=_n(o,t);if(c===0)i[0]=e.An();else if(c>0&&l<0)i.push(o),i.push(o.An());else if(l>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Zn(i[o],i[o+1]))return[];const c=i[o].Vn(this.uid,oa,L.empty()),l=i[o+1].Vn(this.uid,oa,L.empty());s.push(IDBKeyRange.bound(c,l))}return s}Zn(e,t){return _n(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(ng)}getMinOffset(e,t){return A.mapArray(this.Mn(t),n=>this.xn(e,n).next(i=>i||$(44426))).next(ng)}}function tg(r){return Oe(r,to)}function Gr(r){return Oe(r,Ls)}function ms(r){return Oe(r,ph)}function Wr(r){return Oe(r,Fs)}function ng(r){q(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;hh(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new yt(e.readTime,e.documentKey,t)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rg={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},U_=41943040;class We{static withCacheSize(e){return new We(e,We.DEFAULT_COLLECTION_PERCENTILE,We.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B_(r,e,t){const n=r.store(vt),i=r.store(mi),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const l=n.ee({range:o},(d,f,g)=>(c++,g.delete()));s.push(l.next(()=>{q(c===1,47070,{batchId:t.batchId})}));const u=[];for(const d of t.mutations){const f=ky(e,d.key.path,t.batchId);s.push(i.delete(f)),u.push(d.key)}return A.waitFor(s).next(()=>u)}function Ka(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw $(14731);e=r.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */We.DEFAULT_COLLECTION_PERCENTILE=10,We.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,We.DEFAULT=new We(U_,We.DEFAULT_COLLECTION_PERCENTILE,We.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),We.DISABLED=new We(-1,0,0);class Sc{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Xn={}}static wt(e,t,n,i){q(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new Sc(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return wn(e).ee({index:fr,range:n},(i,s,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=ei(e),o=wn(e);return o.add({}).next(c=>{q(typeof c=="number",49019);const l=new bh(c,t,n,i),u=function(_,R,k){const T=k.baseMutations.map(M=>ao(_.yt,M)),x=k.mutations.map(M=>ao(_.yt,M));return{userId:R,batchId:k.batchId,localWriteTimeMs:k.localWriteTime.toMillis(),baseMutations:T,mutations:x}}(this.serializer,this.userId,l),d=[];let f=new ae((g,_)=>H(g.canonicalString(),_.canonicalString()));for(const g of i){const _=ky(this.userId,g.key.path,c);f=f.add(g.key.path.popLast()),d.push(o.put(u)),d.push(s.put(_,mR))}return f.forEach(g=>{d.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Xn[c]=l.keys()}),A.waitFor(d).next(()=>l)})}lookupMutationBatch(e,t){return wn(e).get(t).next(n=>n?(q(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),cr(this.serializer,n)):null)}er(e,t){return this.Xn[t]?A.resolve(this.Xn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Xn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return wn(e).ee({index:fr,range:i},(o,c,l)=>{c.userId===this.userId&&(q(c.batchId>=n,47524,{tr:n}),s=cr(this.serializer,c)),l.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=Cn;return wn(e).ee({index:fr,range:t,reverse:!0},(i,s,o)=>{n=s.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Cn],[this.userId,Number.POSITIVE_INFINITY]);return wn(e).J(fr,t).next(n=>n.map(i=>cr(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=ma(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return ei(e).ee({range:i},(o,c,l)=>{const[u,d,f]=o,g=Ut(d);if(u===this.userId&&t.path.isEqual(g))return wn(e).get(f).next(_=>{if(!_)throw $(61480,{nr:o,batchId:f});q(_.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:_.userId,batchId:f}),s.push(cr(this.serializer,_))});l.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ae(H);const i=[];return t.forEach(s=>{const o=ma(this.userId,s.path),c=IDBKeyRange.lowerBound(o),l=ei(e).ee({range:c},(u,d,f)=>{const[g,_,R]=u,k=Ut(_);g===this.userId&&s.path.isEqual(k)?n=n.add(R):f.done()});i.push(l)}),A.waitFor(i).next(()=>this.rr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=ma(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new ae(H);return ei(e).ee({range:o},(l,u,d)=>{const[f,g,_]=l,R=Ut(g);f===this.userId&&n.isPrefixOf(R)?R.length===i&&(c=c.add(_)):d.done()}).next(()=>this.rr(e,c))}rr(e,t){const n=[],i=[];return t.forEach(s=>{i.push(wn(e).get(s).next(o=>{if(o===null)throw $(35274,{batchId:s});q(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(cr(this.serializer,o))}))}),A.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return B_(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.ir(t.batchId)}),A.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}ir(e){delete this.Xn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),i=[];return ei(e).ee({range:n},(s,o,c)=>{if(s[0]===this.userId){const l=Ut(s[1]);i.push(l)}else c.done()}).next(()=>{q(i.length===0,56720,{sr:i.map(s=>s.canonicalString())})})})}containsKey(e,t){return $_(e,this.userId,t)}_r(e){return q_(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:Cn,lastStreamToken:""})}}function $_(r,e,t){const n=ma(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return ei(r).ee({range:s,X:!0},(c,l,u)=>{const[d,f,g]=c;d===e&&f===i&&(o=!0),u.done()}).next(()=>o)}function wn(r){return Oe(r,vt)}function ei(r){return Oe(r,mi)}function q_(r){return Oe(r,Zs)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cr{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new Cr(0)}static cr(){return new Cr(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class FP{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.lr(e).next(t=>{const n=new Cr(t.highestTargetId);return t.highestTargetId=n.next(),this.hr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.lr(e).next(t=>z.fromTimestamp(new ie(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.lr(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.lr(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.hr(e,i)))}addTargetData(e,t){return this.Pr(e,t).next(()=>this.lr(e).next(n=>(n.targetCount+=1,this.Tr(t,n),this.hr(e,n))))}updateTargetData(e,t){return this.Pr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Hr(e).delete(t.targetId)).next(()=>this.lr(e)).next(n=>(q(n.targetCount>0,8065),n.targetCount-=1,this.hr(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return Hr(e).ee((o,c)=>{const l=Rs(c);l.sequenceNumber<=t&&n.get(l.targetId)===null&&(i++,s.push(this.removeTargetData(e,l)))}).next(()=>A.waitFor(s)).next(()=>i)}forEachTarget(e,t){return Hr(e).ee((n,i)=>{const s=Rs(i);t(s)})}lr(e){return ig(e).get(La).next(t=>(q(t!==null,2888),t))}hr(e,t){return ig(e).put(La,t)}Pr(e,t){return Hr(e).put(M_(this.serializer,t))}Tr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.lr(e).next(t=>t.targetCount)}getTargetData(e,t){const n=br(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return Hr(e).ee({range:i,index:xy},(o,c,l)=>{const u=Rs(c);Po(t,u.target)&&(s=u,l.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=vn(e);return t.forEach(o=>{const c=Qe(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))}),A.waitFor(i)}removeMatchingKeys(e,t,n){const i=vn(e);return A.forEach(t,s=>{const o=Qe(s.path);return A.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=vn(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=vn(e);let s=Y();return i.ee({range:n,X:!0},(o,c,l)=>{const u=Ut(o[1]),d=new L(u);s=s.add(d)}).next(()=>s)}containsKey(e,t){const n=Qe(t.path),i=IDBKeyRange.bound([n],[Iy(n)],!1,!0);let s=0;return vn(e).ee({index:fh,X:!0,range:i},([o,c],l,u)=>{o!==0&&(s++,u.done())}).next(()=>s>0)}At(e,t){return Hr(e).get(t).next(n=>n?Rs(n):null)}}function Hr(r){return Oe(r,yi)}function ig(r){return Oe(r,_r)}function vn(r){return Oe(r,_i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sg="LruGarbageCollector",LP=1048576;function og([r,e],[t,n]){const i=H(r,t);return i===0?H(e,n):i}class UP{constructor(e){this.Ir=e,this.buffer=new ae(og),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();og(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class z_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){V(sg,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Gn(t)?V(sg,"Ignoring IndexedDB error during garbage collection: ",t):await jn(t)}await this.Vr(3e5)})}}class BP{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return A.resolve(lt.ce);const n=new UP(t);return this.mr.forEachTarget(e,i=>n.Ar(i.sequenceNumber)).next(()=>this.mr.pr(e,i=>n.Ar(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.mr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(V("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(rg)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(V("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),rg):this.yr(e,t))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let n,i,s,o,c,l,u;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(f=>(f>this.params.maximumSequenceNumbersToCollect?(V("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${f}`),i=this.params.maximumSequenceNumbersToCollect):i=f,o=Date.now(),this.nthSequenceNumber(e,i))).next(f=>(n=f,c=Date.now(),this.removeTargets(e,n,t))).next(f=>(s=f,l=Date.now(),this.removeOrphanedDocuments(e,n))).next(f=>(u=Date.now(),Yr()<=X.DEBUG&&V("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(l-c)+`ms
	Removed ${f} documents in `+(u-l)+`ms
Total Duration: ${u-d}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:f})))}}function K_(r,e){return new BP(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $P{constructor(e,t){this.db=e,this.garbageCollector=K_(this,t)}gr(e){const t=this.wr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}pr(e,t){return this.Sr(e,(n,i)=>t(i))}addReference(e,t,n){return aa(e,n)}removeReference(e,t,n){return aa(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return aa(e,t)}br(e,t){return function(i,s){let o=!1;return q_(i).te(c=>$_(i,c,s).next(l=>(l&&(o=!0),A.resolve(!l)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.Sr(e,(o,c)=>{if(c<=t){const l=this.br(e,o).next(u=>{if(!u)return s++,n.getEntry(e,o).next(()=>(n.removeEntry(o,z.min()),vn(e).delete(function(f){return[0,Qe(f.path)]}(o))))});i.push(l)}}).next(()=>A.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return aa(e,t)}Sr(e,t){const n=vn(e);let i,s=lt.ce;return n.ee({index:fh},([o,c],{path:l,sequenceNumber:u})=>{o===0?(s!==lt.ce&&t(new L(Ut(i)),s),s=u,i=l):s=lt.ce}).next(()=>{s!==lt.ce&&t(new L(Ut(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function aa(r,e){return vn(r).put(function(n,i){return{targetId:0,path:Qe(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j_{constructor(){this.changes=new an(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,de.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?A.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qP{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return nr(e).put(n)}removeEntry(e,t,n){return nr(e).delete(function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],qa(o),c[c.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Dr(e,n)))}getEntry(e,t){let n=de.newInvalidDocument(t);return nr(e).ee({index:ya,range:IDBKeyRange.only(ys(t))},(i,s)=>{n=this.Cr(t,s)}).next(()=>n)}vr(e,t){let n={size:0,document:de.newInvalidDocument(t)};return nr(e).ee({index:ya,range:IDBKeyRange.only(ys(t))},(i,s)=>{n={document:this.Cr(t,s),size:Ka(s)}}).next(()=>n)}getEntries(e,t){let n=ht();return this.Fr(e,t,(i,s)=>{const o=this.Cr(i,s);n=n.insert(i,o)}).next(()=>n)}Mr(e,t){let n=ht(),i=new ue(L.comparator);return this.Fr(e,t,(s,o)=>{const c=this.Cr(s,o);n=n.insert(s,c),i=i.insert(s,Ka(o))}).next(()=>({documents:n,Or:i}))}Fr(e,t,n){if(t.isEmpty())return A.resolve();let i=new ae(lg);t.forEach(l=>i=i.add(l));const s=IDBKeyRange.bound(ys(i.first()),ys(i.last())),o=i.getIterator();let c=o.getNext();return nr(e).ee({index:ya,range:s},(l,u,d)=>{const f=L.fromSegments([...u.prefixPath,u.collectionGroup,u.documentId]);for(;c&&lg(c,f)<0;)n(c,null),c=o.getNext();c&&c.isEqual(f)&&(n(c,u),c=o.hasNext()?o.getNext():null),c?d.j(ys(c)):d.done()}).next(()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),qa(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],l=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return nr(e).J(IDBKeyRange.bound(c,l,!0)).next(u=>{s==null||s.incrementDocumentReadCount(u.length);let d=ht();for(const f of u){const g=this.Cr(L.fromSegments(f.prefixPath.concat(f.collectionGroup,f.documentId)),f);g.isFoundDocument()&&(ko(t,g)||i.has(g.key))&&(d=d.insert(g.key,g))}return d})}getAllFromCollectionGroup(e,t,n,i){let s=ht();const o=cg(t,n),c=cg(t,yt.max());return nr(e).ee({index:Dy,range:IDBKeyRange.bound(o,c,!0)},(l,u,d)=>{const f=this.Cr(L.fromSegments(u.prefixPath.concat(u.collectionGroup,u.documentId)),u);s=s.insert(f.key,f),s.size===i&&d.done()}).next(()=>s)}newChangeBuffer(e){return new zP(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return ag(e).get(Xl).next(t=>(q(!!t,20021),t))}Dr(e,t){return ag(e).put(Xl,t)}Cr(e,t){if(t){const n=RP(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(z.min())))return n}return de.newInvalidDocument(e)}}function G_(r){return new qP(r)}class zP extends j_{constructor(e,t){super(),this.Nr=e,this.trackRemovals=t,this.Br=new an(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new ae((s,o)=>H(s.canonicalString(),o.canonicalString()));return this.changes.forEach((s,o)=>{const c=this.Br.get(s);if(t.push(this.Nr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const l=Kp(this.Nr.serializer,o);i=i.add(s.path.popLast());const u=Ka(l);n+=u-c.size,t.push(this.Nr.addEntry(e,s,l))}else if(n-=c.size,this.trackRemovals){const l=Kp(this.Nr.serializer,o.convertToNoDocument(z.min()));t.push(this.Nr.addEntry(e,s,l))}}),i.forEach(s=>{t.push(this.Nr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.Nr.updateMetadata(e,n)),A.waitFor(t)}getFromCache(e,t){return this.Nr.vr(e,t).next(n=>(this.Br.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Nr.Mr(e,t).next(({documents:n,Or:i})=>(i.forEach((s,o)=>{this.Br.set(s,{size:o,readTime:n.get(s).readTime})}),n))}}function ag(r){return Oe(r,eo)}function nr(r){return Oe(r,Fa)}function ys(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function cg(r,e){const t=e.documentKey.path.toArray();return[r,qa(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function lg(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=H(t[s],n[s]),i)return i;return i=H(t.length,n.length),i||(i=H(t[t.length-2],n[n.length-2]),i||H(t[t.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class KP{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class W_{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&$s(n.mutation,i,ut.empty(),ie.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,Y()).next(()=>n))}getLocalViewOfDocuments(e,t,n=Y()){const i=Bt();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let o=As();return s.forEach((c,l)=>{o=o.insert(c,l.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=Bt();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,Y()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,n,i){let s=ht();const o=Bs(),c=function(){return Bs()}();return t.forEach((l,u)=>{const d=n.get(u.key);i.has(u.key)&&(d===void 0||d.mutation instanceof cn)?s=s.insert(u.key,u):d!==void 0?(o.set(u.key,d.mutation.getFieldMask()),$s(d.mutation,u,d.mutation.getFieldMask(),ie.now())):o.set(u.key,ut.empty())}),this.recalculateAndSaveOverlays(e,s).next(l=>(l.forEach((u,d)=>o.set(u,d)),t.forEach((u,d)=>c.set(u,new KP(d,o.get(u)??null))),c))}recalculateAndSaveOverlays(e,t){const n=Bs();let i=new ue((o,c)=>o-c),s=Y();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(l=>{const u=t.get(l);if(u===null)return;let d=n.get(l)||ut.empty();d=c.applyToLocalView(u,d),n.set(l,d);const f=(i.get(c.batchId)||Y()).add(l);i=i.insert(c.batchId,f)})}).next(()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const l=c.getNext(),u=l.key,d=l.value,f=l_();d.forEach(g=>{if(!s.has(g)){const _=m_(t.get(g),n.get(g));_!==null&&f.set(g,_),s=s.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,u,f))}return A.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(o){return L.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Ih(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):A.resolve(Bt());let c=gi,l=s;return o.next(u=>A.forEach(u,(d,f)=>(c<f.largestBatchId&&(c=f.largestBatchId),s.get(d)?A.resolve():this.remoteDocumentCache.getEntry(e,d).next(g=>{l=l.insert(d,g)}))).next(()=>this.populateOverlays(e,u,s)).next(()=>this.computeViews(e,l,u,Y())).next(d=>({batchId:c,changes:c_(d)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new L(t)).next(n=>{let i=As();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=As();return this.indexManager.getCollectionParents(e,s).next(c=>A.forEach(c,l=>{const u=function(f,g){return new on(g,null,f.explicitOrderBy.slice(),f.filters.slice(),f.limit,f.limitType,f.startAt,f.endAt)}(t,l.child(s));return this.getDocumentsMatchingCollectionQuery(e,u,n,i).next(d=>{d.forEach((f,g)=>{o=o.insert(f,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(o=>{s.forEach((l,u)=>{const d=u.getKey();o.get(d)===null&&(o=o.insert(d,de.newInvalidDocument(d)))});let c=As();return o.forEach((l,u)=>{const d=s.get(l);d!==void 0&&$s(d.mutation,u,ut.empty(),ie.now()),ko(t,u)&&(c=c.insert(l,u))}),c})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jP{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return A.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:Re(i.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,function(i){return{name:i.name,query:Ch(i.bundledQuery),readTime:Re(i.readTime)}}(t)),A.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class GP{constructor(){this.overlays=new ue(L.comparator),this.qr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Bt();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.St(e,t,s)}),A.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.qr.delete(n)),A.resolve()}getOverlaysForCollection(e,t,n){const i=Bt(),s=t.length+1,o=new L(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const l=c.getNext().value,u=l.getKey();if(!t.isPrefixOf(u.path))break;u.path.length===s&&l.largestBatchId>n&&i.set(l.getKey(),l)}return A.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new ue((u,d)=>u-d);const o=this.overlays.getIterator();for(;o.hasNext();){const u=o.getNext().value;if(u.getKey().getCollectionGroup()===t&&u.largestBatchId>n){let d=s.get(u.largestBatchId);d===null&&(d=Bt(),s=s.insert(u.largestBatchId,d)),d.set(u.getKey(),u)}}const c=Bt(),l=s.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((u,d)=>c.set(u,d)),!(c.size()>=i)););return A.resolve(c)}St(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Sh(t,n));let s=this.qr.get(t);s===void 0&&(s=Y(),this.qr.set(t,s)),this.qr.set(t,s.add(n.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WP{constructor(){this.sessionToken=Te.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xh{constructor(){this.Qr=new ae(Fe.$r),this.Ur=new ae(Fe.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const n=new Fe(e,t);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Gr(new Fe(e,t))}zr(e,t){e.forEach(n=>this.removeReference(n,t))}jr(e){const t=new L(new Z([])),n=new Fe(t,e),i=new Fe(t,e+1),s=[];return this.Ur.forEachInRange([n,i],o=>{this.Gr(o),s.push(o.key)}),s}Jr(){this.Qr.forEach(e=>this.Gr(e))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new L(new Z([])),n=new Fe(t,e),i=new Fe(t,e+1);let s=Y();return this.Ur.forEachInRange([n,i],o=>{s=s.add(o.key)}),s}containsKey(e){const t=new Fe(e,0),n=this.Qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class Fe{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return L.comparator(e.key,t.key)||H(e.Yr,t.Yr)}static Kr(e,t){return H(e.Yr,t.Yr)||L.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class HP{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new ae(Fe.$r)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new bh(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Zr=this.Zr.add(new Fe(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.ei(n),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?Cn:this.tr-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Fe(t,0),i=new Fe(t,Number.POSITIVE_INFINITY),s=[];return this.Zr.forEachInRange([n,i],o=>{const c=this.Xr(o.Yr);s.push(c)}),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new ae(H);return t.forEach(i=>{const s=new Fe(i,0),o=new Fe(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([s,o],c=>{n=n.add(c.Yr)})}),A.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;L.isDocumentKey(s)||(s=s.child(""));const o=new Fe(new L(s),0);let c=new ae(H);return this.Zr.forEachWhile(l=>{const u=l.key.path;return!!n.isPrefixOf(u)&&(u.length===i&&(c=c.add(l.Yr)),!0)},o),A.resolve(this.ti(c))}ti(e){const t=[];return e.forEach(n=>{const i=this.Xr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){q(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return A.forEach(t.mutations,i=>{const s=new Fe(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.Zr=n})}ir(e){}containsKey(e,t){const n=new Fe(t,0),i=this.Zr.firstAfterOrEqual(n);return A.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class QP{constructor(e){this.ri=e,this.docs=function(){return new ue(L.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ri(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return A.resolve(n?n.document.mutableCopy():de.newInvalidDocument(t))}getEntries(e,t){let n=ht();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():de.newInvalidDocument(i))}),A.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=ht();const o=t.path,c=new L(o.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:u,value:{document:d}}=l.getNext();if(!o.isPrefixOf(u.path))break;u.path.length>o.length+1||hh(Ay(d),n)<=0||(i.has(d.key)||ko(t,d))&&(s=s.insert(d.key,d.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(e,t,n,i){$(9500)}ii(e,t){return A.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new YP(this)}getSize(e){return A.resolve(this.size)}}class YP extends j_{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.Nr.addEntry(e,i)):this.Nr.removeEntry(n)}),A.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JP{constructor(e){this.persistence=e,this.si=new an(t=>br(t),Po),this.lastRemoteSnapshotVersion=z.min(),this.highestTargetId=0,this.oi=0,this._i=new xh,this.targetCount=0,this.ai=Cr.ur()}forEachTarget(e,t){return this.si.forEach((n,i)=>t(i)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.oi&&(this.oi=t),A.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new Cr(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.Pr(t),A.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.si.forEach((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.si.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)}),A.waitFor(s).next(()=>i)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const n=this.si.get(t)||null;return A.resolve(n)}addMatchingKeys(e,t,n){return this._i.Wr(t,n),A.resolve()}removeMatchingKeys(e,t,n){this._i.zr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),A.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const n=this._i.Hr(t);return A.resolve(n)}containsKey(e,t){return A.resolve(this._i.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nh{constructor(e,t){this.ui={},this.overlays={},this.ci=new lt(0),this.li=!1,this.li=!0,this.hi=new WP,this.referenceDelegate=e(this),this.Pi=new JP(this),this.indexManager=new OP,this.remoteDocumentCache=function(i){return new QP(i)}(n=>this.referenceDelegate.Ti(n)),this.serializer=new O_(t),this.Ii=new jP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new GP,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ui[e.toKey()];return n||(n=new HP(t,this.referenceDelegate),this.ui[e.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,n){V("MemoryPersistence","Starting transaction:",e);const i=new XP(this.ci.next());return this.referenceDelegate.Ei(),n(i).next(s=>this.referenceDelegate.di(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Ai(e,t){return A.or(Object.values(this.ui).map(n=>()=>n.containsKey(e,t)))}}class XP extends Ry{constructor(e){super(),this.currentSequenceNumber=e}}class Rc{constructor(e){this.persistence=e,this.Ri=new xh,this.Vi=null}static mi(e){return new Rc(e)}get fi(){if(this.Vi)return this.Vi;throw $(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.fi.delete(n.toString()),A.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.fi.add(n.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(i=>this.fi.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.fi.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.fi,n=>{const i=L.fromPath(n);return this.gi(e,i).next(s=>{s||t.removeEntry(i,z.min())})}).next(()=>(this.Vi=null,t.apply(e)))}updateLimboDocument(e,t){return this.gi(e,t).next(n=>{n?this.fi.delete(t.toString()):this.fi.add(t.toString())})}Ti(e){return 0}gi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class ja{constructor(e,t){this.persistence=e,this.pi=new an(n=>Qe(n.path),(n,i)=>n.isEqual(i)),this.garbageCollector=K_(this,t)}static mi(e,t){return new ja(e,t)}Ei(){}di(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}pr(e,t){return A.forEach(this.pi,(n,i)=>this.br(e,n,i).next(s=>s?A.resolve():t(i)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ii(e,o=>this.br(e,o,t).next(c=>{c||(n++,s.removeEntry(o,z.min()))})).next(()=>s.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}removeReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=wa(e.data.value)),t}br(e,t,n){return A.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.pi.get(t);return A.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZP{constructor(e){this.serializer=e}k(e,t,n,i){const s=new mc("createOrUpgrade",t);n<1&&i>=1&&(function(l){l.createObjectStore(Ro)}(e),function(l){l.createObjectStore(Zs,{keyPath:gR}),l.createObjectStore(vt,{keyPath:Ip,autoIncrement:!0}).createIndex(fr,Ep,{unique:!0}),l.createObjectStore(mi)}(e),ug(e),function(l){l.createObjectStore(or)}(e));let o=A.resolve();return n<3&&i>=3&&(n!==0&&(function(l){l.deleteObjectStore(_i),l.deleteObjectStore(yi),l.deleteObjectStore(_r)}(e),ug(e)),o=o.next(()=>function(l){const u=l.store(_r),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:z.min().toTimestamp(),targetCount:0};return u.put(La,d)}(s))),n<4&&i>=4&&(n!==0&&(o=o.next(()=>function(l,u){return u.store(vt).J().next(f=>{l.deleteObjectStore(vt),l.createObjectStore(vt,{keyPath:Ip,autoIncrement:!0}).createIndex(fr,Ep,{unique:!0});const g=u.store(vt),_=f.map(R=>g.put(R));return A.waitFor(_)})}(e,s))),o=o.next(()=>{(function(l){l.createObjectStore(wi,{keyPath:bR})})(e)})),n<5&&i>=5&&(o=o.next(()=>this.yi(s))),n<6&&i>=6&&(o=o.next(()=>(function(l){l.createObjectStore(eo)}(e),this.wi(s)))),n<7&&i>=7&&(o=o.next(()=>this.Si(s))),n<8&&i>=8&&(o=o.next(()=>this.bi(e,s))),n<9&&i>=9&&(o=o.next(()=>{(function(l){l.objectStoreNames.contains("remoteDocumentChanges")&&l.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(o=o.next(()=>this.Di(s))),n<11&&i>=11&&(o=o.next(()=>{(function(l){l.createObjectStore(yc,{keyPath:AR})})(e),function(l){l.createObjectStore(_c,{keyPath:SR})}(e)})),n<12&&i>=12&&(o=o.next(()=>{(function(l){const u=l.createObjectStore(wc,{keyPath:NR});u.createIndex(eu,VR,{unique:!1}),u.createIndex(Oy,OR,{unique:!1})})(e)})),n<13&&i>=13&&(o=o.next(()=>function(l){const u=l.createObjectStore(Fa,{keyPath:yR});u.createIndex(ya,_R),u.createIndex(Dy,wR)}(e)).next(()=>this.Ci(e,s)).next(()=>e.deleteObjectStore(or))),n<14&&i>=14&&(o=o.next(()=>this.Fi(e,s))),n<15&&i>=15&&(o=o.next(()=>function(l){l.createObjectStore(ph,{keyPath:RR,autoIncrement:!0}).createIndex(Zl,PR,{unique:!1}),l.createObjectStore(Fs,{keyPath:CR}).createIndex(Ny,kR,{unique:!1}),l.createObjectStore(Ls,{keyPath:DR}).createIndex(Vy,xR,{unique:!1})}(e))),n<16&&i>=16&&(o=o.next(()=>{t.objectStore(Fs).clear()}).next(()=>{t.objectStore(Ls).clear()})),n<17&&i>=17&&(o=o.next(()=>{(function(l){l.createObjectStore(gh,{keyPath:MR})})(e)})),n<18&&i>=18&&Zg()&&(o=o.next(()=>{t.objectStore(Fs).clear()}).next(()=>{t.objectStore(Ls).clear()})),o}wi(e){let t=0;return e.store(or).ee((n,i)=>{t+=Ka(i)}).next(()=>{const n={byteSize:t};return e.store(eo).put(Xl,n)})}yi(e){const t=e.store(Zs),n=e.store(vt);return t.J().next(i=>A.forEach(i,s=>{const o=IDBKeyRange.bound([s.userId,Cn],[s.userId,s.lastAcknowledgedBatchId]);return n.J(fr,o).next(c=>A.forEach(c,l=>{q(l.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:l.batchId});const u=cr(this.serializer,l);return B_(e,s.userId,u).next(()=>{})}))}))}Si(e){const t=e.store(_i),n=e.store(or);return e.store(_r).get(La).next(i=>{const s=[];return n.ee((o,c)=>{const l=new Z(o),u=function(f){return[0,Qe(f)]}(l);s.push(t.get(u).next(d=>d?A.resolve():(f=>t.put({targetId:0,path:Qe(f),sequenceNumber:i.highestListenSequenceNumber}))(l)))}).next(()=>A.waitFor(s))})}bi(e,t){e.createObjectStore(to,{keyPath:TR});const n=t.store(to),i=new Dh,s=o=>{if(i.add(o)){const c=o.lastSegment(),l=o.popLast();return n.put({collectionId:c,parent:Qe(l)})}};return t.store(or).ee({X:!0},(o,c)=>{const l=new Z(o);return s(l.popLast())}).next(()=>t.store(mi).ee({X:!0},([o,c,l],u)=>{const d=Ut(c);return s(d.popLast())}))}Di(e){const t=e.store(yi);return t.ee((n,i)=>{const s=Rs(i),o=M_(this.serializer,s);return t.put(o)})}Ci(e,t){const n=t.store(or),i=[];return n.ee((s,o)=>{const c=t.store(Fa),l=function(f){return f.document?new L(Z.fromString(f.document.name).popFirst(5)):f.noDocument?L.fromSegments(f.noDocument.path):f.unknownDocument?L.fromSegments(f.unknownDocument.path):$(36783)}(o).path.toArray(),u={prefixPath:l.slice(0,l.length-2),collectionGroup:l[l.length-2],documentId:l[l.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(u))}).next(()=>A.waitFor(i))}Fi(e,t){const n=t.store(vt),i=G_(this.serializer),s=new Nh(Rc.mi,this.serializer.yt);return n.J().next(o=>{const c=new Map;return o.forEach(l=>{let u=c.get(l.userId)??Y();cr(this.serializer,l).keys().forEach(d=>u=u.add(d)),c.set(l.userId,u)}),A.forEach(c,(l,u)=>{const d=new Le(u),f=Ac.wt(this.serializer,d),g=s.getIndexManager(d),_=Sc.wt(d,this.serializer,g,s.referenceDelegate);return new W_(i,_,f,g).recalculateAndSaveOverlaysForDocumentKeys(new tu(t,lt.ce),l).next()})})}}function ug(r){r.createObjectStore(_i,{keyPath:ER}).createIndex(fh,vR,{unique:!0}),r.createObjectStore(yi,{keyPath:"targetId"}).createIndex(xy,IR,{unique:!0}),r.createObjectStore(_r)}const In="IndexedDbPersistence",Dl=18e5,xl=5e3,Nl="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",H_="main";class Vh{constructor(e,t,n,i,s,o,c,l,u,d,f=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Mi=s,this.window=o,this.document=c,this.xi=u,this.Oi=d,this.Ni=f,this.ci=null,this.li=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Bi=null,this.inForeground=!1,this.Li=null,this.ki=null,this.qi=Number.NEGATIVE_INFINITY,this.Qi=g=>Promise.resolve(),!Vh.v())throw new N(C.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new $P(this,i),this.$i=t+H_,this.serializer=new O_(l),this.Ui=new $t(this.$i,this.Ni,new ZP(this.serializer)),this.hi=new CP,this.Pi=new FP(this.referenceDelegate,this.serializer),this.remoteDocumentCache=G_(this.serializer),this.Ii=new PP,this.window&&this.window.localStorage?this.Ki=this.window.localStorage:(this.Ki=null,d===!1&&Se(In,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Wi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new N(C.FAILED_PRECONDITION,Nl);return this.Gi(),this.zi(),this.ji(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Pi.getHighestSequenceNumber(e))}).then(e=>{this.ci=new lt(e,this.xi)}).then(()=>{this.li=!0}).catch(e=>(this.Ui&&this.Ui.close(),Promise.reject(e)))}Ji(e){return this.Qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ui.$(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Mi.enqueueAndForget(async()=>{this.started&&await this.Wi()}))}Wi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>ca(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Hi(e).next(t=>{t||(this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)))})}).next(()=>this.Yi(e)).next(t=>this.isPrimary&&!t?this.Zi(e).next(()=>!1):!!t&&this.Xi(e).next(()=>!0))).catch(e=>{if(Gn(e))return V(In,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return V(In,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Mi.enqueueRetryable(()=>this.Qi(e)),this.isPrimary=e})}Hi(e){return _s(e).get(zr).next(t=>A.resolve(this.es(t)))}ts(e){return ca(e).delete(this.clientId)}async ns(){if(this.isPrimary&&!this.rs(this.qi,Dl)){this.qi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=Oe(t,wi);return n.J().next(i=>{const s=this.ss(i,Dl),o=i.filter(c=>s.indexOf(c)===-1);return A.forEach(o,c=>n.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ki)for(const t of e)this.Ki.removeItem(this._s(t.clientId))}}ji(){this.ki=this.Mi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Wi().then(()=>this.ns()).then(()=>this.ji()))}es(e){return!!e&&e.ownerId===this.clientId}Yi(e){return this.Oi?A.resolve(!0):_s(e).get(zr).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,xl)&&!this.us(t.ownerId)){if(this.es(t)&&this.networkEnabled)return!0;if(!this.es(t)){if(!t.allowTabSynchronization)throw new N(C.FAILED_PRECONDITION,Nl);return!1}}return!(!this.networkEnabled||!this.inForeground)||ca(e).J().next(n=>this.ss(n,xl).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&V(In,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.li=!1,this.cs(),this.ki&&(this.ki.cancel(),this.ki=null),this.ls(),this.hs(),await this.Ui.runTransaction("shutdown","readwrite",[Ro,wi],e=>{const t=new tu(e,lt.ce);return this.Zi(t).next(()=>this.ts(t))}),this.Ui.close(),this.Ps()}ss(e,t){return e.filter(n=>this.rs(n.updateTimeMs,t)&&!this.us(n.clientId))}Ts(){return this.runTransaction("getActiveClients","readonly",e=>ca(e).J().next(t=>this.ss(t,Dl).map(n=>n.clientId)))}get started(){return this.li}getGlobalsCache(){return this.hi}getMutationQueue(e,t){return Sc.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new MP(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return Ac.wt(this.serializer,e)}getBundleCache(){return this.Ii}runTransaction(e,t,n){V(In,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(l){return l===18?UR:l===17?Uy:l===16?LR:l===15?mh:l===14?Ly:l===13?Fy:l===12?FR:l===11?My:void $(60245)}(this.Ni);let o;return this.Ui.runTransaction(e,i,s,c=>(o=new tu(c,this.ci?this.ci.next():lt.ce),t==="readwrite-primary"?this.Hi(o).next(l=>!!l||this.Yi(o)).next(l=>{if(!l)throw Se(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)),new N(C.FAILED_PRECONDITION,Sy);return n(o)}).next(l=>this.Xi(o).next(()=>l)):this.Is(o).next(()=>n(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Is(e){return _s(e).get(zr).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,xl)&&!this.us(t.ownerId)&&!this.es(t)&&!(this.Oi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new N(C.FAILED_PRECONDITION,Nl)})}Xi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return _s(e).put(zr,t)}static v(){return $t.v()}Zi(e){const t=_s(e);return t.get(zr).next(n=>this.es(n)?(V(In,"Releasing primary lease."),t.delete(zr)):A.resolve())}rs(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Se(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Gi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Li=()=>{this.Mi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Wi()))},this.document.addEventListener("visibilitychange",this.Li),this.inForeground=this.document.visibilityState==="visible")}ls(){this.Li&&(this.document.removeEventListener("visibilitychange",this.Li),this.Li=null)}zi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Bi=()=>{this.cs();const t=/(?:Version|Mobile)\/1[456]/;Xg()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Mi.enterRestrictedMode(!0),this.Mi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Bi))}hs(){this.Bi&&(this.window.removeEventListener("pagehide",this.Bi),this.Bi=null)}us(e){var t;try{const n=((t=this.Ki)==null?void 0:t.getItem(this._s(e)))!==null;return V(In,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return Se(In,"Failed to get zombied client id.",n),!1}}cs(){if(this.Ki)try{this.Ki.setItem(this._s(this.clientId),String(Date.now()))}catch(e){Se("Failed to set zombie client id.",e)}}Ps(){if(this.Ki)try{this.Ki.removeItem(this._s(this.clientId))}catch{}}_s(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function _s(r){return Oe(r,Ro)}function ca(r){return Oe(r,wi)}function Oh(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mh{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Es=n,this.ds=i}static As(e,t){let n=Y(),i=Y();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Mh(e,t.fromCache,n,i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eC{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Q_{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return Xg()?8:Py(we())>0?6:4}()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ys(e,t).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.ws(e,t,i,n).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new eC;return this.Ss(e,t,o).next(c=>{if(s.result=c,this.Vs)return this.bs(e,t,o,c.size)})}).next(()=>s.result)}bs(e,t,n,i){return n.documentReadCount<this.fs?(Yr()<=X.DEBUG&&V("QueryEngine","SDK will not create cache indexes for query:",Jr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),A.resolve()):(Yr()<=X.DEBUG&&V("QueryEngine","Query:",Jr(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(Yr()<=X.DEBUG&&V("QueryEngine","The SDK decides to create cache indexes for query:",Jr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,rt(t))):A.resolve())}ys(e,t){if(Vp(t))return A.resolve(null);let n=rt(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=$a(t,null,"F"),n=rt(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const o=Y(...s);return this.ps.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,n).next(l=>{const u=this.Ds(t,c);return this.Cs(t,u,o,l.readTime)?this.ys(e,$a(t,null,"F")):this.vs(e,u,t,l)}))})))}ws(e,t,n,i){return Vp(t)||i.isEqual(z.min())?A.resolve(null):this.ps.getDocuments(e,n).next(s=>{const o=this.Ds(t,s);return this.Cs(t,o,n,i)?A.resolve(null):(Yr()<=X.DEBUG&&V("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Jr(t)),this.vs(e,o,t,by(i,gi)).next(c=>c))})}Ds(e,t){let n=new ae(o_(e));return t.forEach((i,s)=>{ko(e,s)&&(n=n.add(s))}),n}Cs(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Ss(e,t,n){return Yr()<=X.DEBUG&&V("QueryEngine","Using full collection scan to execute query:",Jr(t)),this.ps.getDocumentsMatchingQuery(e,t,yt.min(),n)}vs(e,t,n,i){return this.ps.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fh="LocalStore",tC=3e8;class nC{constructor(e,t,n,i){this.persistence=e,this.Fs=t,this.serializer=i,this.Ms=new ue(H),this.xs=new an(s=>br(s),Po),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(n)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new W_(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms))}}function Y_(r,e,t,n){return new nC(r,e,t,n)}async function J_(r,e){const t=B(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.Bs(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const o=[],c=[];let l=Y();for(const u of i){o.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}for(const u of s){c.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}return t.localDocuments.getDocuments(n,l).next(u=>({Ls:u,removedBatchIds:o,addedBatchIds:c}))})})}function rC(r,e){const t=B(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,u,d){const f=u.batch,g=f.keys();let _=A.resolve();return g.forEach(R=>{_=_.next(()=>d.getEntry(l,R)).next(k=>{const T=u.docVersions.get(R);q(T!==null,48541),k.version.compareTo(T)<0&&(f.applyToRemoteDocument(k,u),k.isValidDocument()&&(k.setReadTime(u.commitVersion),d.addEntry(k)))})}),_.next(()=>c.mutationQueue.removeMutationBatch(l,f))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(c){let l=Y();for(let u=0;u<c.mutationResults.length;++u)c.mutationResults[u].transformResults.length>0&&(l=l.add(c.batch.mutations[u].key));return l}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function X_(r){const e=B(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t))}function iC(r,e){const t=B(r),n=e.snapshotVersion;let i=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=t.Ns.newChangeBuffer({trackRemovals:!0});i=t.Ms;const c=[];e.targetChanges.forEach((d,f)=>{const g=i.get(f);if(!g)return;c.push(t.Pi.removeMatchingKeys(s,d.removedDocuments,f).next(()=>t.Pi.addMatchingKeys(s,d.addedDocuments,f)));let _=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(f)!==null?_=_.withResumeToken(Te.EMPTY_BYTE_STRING,z.min()).withLastLimboFreeSnapshotVersion(z.min()):d.resumeToken.approximateByteSize()>0&&(_=_.withResumeToken(d.resumeToken,n)),i=i.insert(f,_),function(k,T,x){return k.resumeToken.approximateByteSize()===0||T.snapshotVersion.toMicroseconds()-k.snapshotVersion.toMicroseconds()>=tC?!0:x.addedDocuments.size+x.modifiedDocuments.size+x.removedDocuments.size>0}(g,_,d)&&c.push(t.Pi.updateTargetData(s,_))});let l=ht(),u=Y();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,d))}),c.push(Z_(s,o,e.documentUpdates).next(d=>{l=d.ks,u=d.qs})),!n.isEqual(z.min())){const d=t.Pi.getLastRemoteSnapshotVersion(s).next(f=>t.Pi.setTargetsMetadata(s,s.currentSequenceNumber,n));c.push(d)}return A.waitFor(c).next(()=>o.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,l,u)).next(()=>l)}).then(s=>(t.Ms=i,s))}function Z_(r,e,t){let n=Y(),i=Y();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let o=ht();return t.forEach((c,l)=>{const u=s.get(c);l.isFoundDocument()!==u.isFoundDocument()&&(i=i.add(c)),l.isNoDocument()&&l.version.isEqual(z.min())?(e.removeEntry(c,l.readTime),o=o.insert(c,l)):!u.isValidDocument()||l.version.compareTo(u.version)>0||l.version.compareTo(u.version)===0&&u.hasPendingWrites?(e.addEntry(l),o=o.insert(c,l)):V(Fh,"Ignoring outdated watch update for ",c,". Current version:",u.version," Watch version:",l.version)}),{ks:o,qs:i}})}function sC(r,e){const t=B(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=Cn),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function Si(r,e){const t=B(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Pi.getTargetData(n,e).next(s=>s?(i=s,A.resolve(i)):t.Pi.allocateTargetId(n).next(o=>(i=new Qt(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.Pi.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(n.targetId,n),t.xs.set(e,n.targetId)),n})}async function Ri(r,e,t){const n=B(r),i=n.Ms.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,o=>n.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!Gn(o))throw o;V(Fh,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Ms=n.Ms.remove(e),n.xs.delete(i.target)}function Ga(r,e,t){const n=B(r);let i=z.min(),s=Y();return n.persistence.runTransaction("Execute query","readwrite",o=>function(l,u,d){const f=B(l),g=f.xs.get(d);return g!==void 0?A.resolve(f.Ms.get(g)):f.Pi.getTargetData(u,d)}(n,o,rt(e)).next(c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(o,c.targetId).next(l=>{s=l})}).next(()=>n.Fs.getDocumentsMatchingQuery(o,e,t?i:z.min(),t?s:Y())).next(c=>(nw(n,s_(e),c),{documents:c,Qs:s})))}function ew(r,e){const t=B(r),n=B(t.Pi),i=t.Ms.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.At(s,e).next(o=>o?o.target:null))}function tw(r,e){const t=B(r),n=t.Os.get(e)||z.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.Ns.getAllFromCollectionGroup(i,e,by(n,gi),Number.MAX_SAFE_INTEGER)).then(i=>(nw(t,e,i),i))}function nw(r,e,t){let n=r.Os.get(e)||z.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.Os.set(e,n)}async function oC(r,e,t,n){const i=B(r);let s=Y(),o=ht();for(const u of t){const d=e.$s(u.metadata.name);u.document&&(s=s.add(d));const f=e.Us(u);f.setReadTime(e.Ks(u.metadata.readTime)),o=o.insert(d,f)}const c=i.Ns.newChangeBuffer({trackRemovals:!0}),l=await Si(i,function(d){return rt(Bi(Z.fromString(`__bundle__/docs/${d}`)))}(n));return i.persistence.runTransaction("Apply bundle documents","readwrite",u=>Z_(u,c,o).next(d=>(c.apply(u),d)).next(d=>i.Pi.removeMatchingKeysForTargetId(u,l.targetId).next(()=>i.Pi.addMatchingKeys(u,s,l.targetId)).next(()=>i.localDocuments.getLocalViewOfDocuments(u,d.ks,d.qs)).next(()=>d.ks)))}async function aC(r,e,t=Y()){const n=await Si(r,rt(Ch(e.bundledQuery))),i=B(r);return i.persistence.runTransaction("Save named query","readwrite",s=>{const o=Re(e.readTime);if(n.snapshotVersion.compareTo(o)>=0)return i.Ii.saveNamedQuery(s,e);const c=n.withResumeToken(Te.EMPTY_BYTE_STRING,o);return i.Ms=i.Ms.insert(c.targetId,c),i.Pi.updateTargetData(s,c).next(()=>i.Pi.removeMatchingKeysForTargetId(s,n.targetId)).next(()=>i.Pi.addMatchingKeys(s,t,n.targetId)).next(()=>i.Ii.saveNamedQuery(s,e))})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rw="firestore_clients";function hg(r,e){return`${rw}_${r}_${e}`}const iw="firestore_mutations";function dg(r,e,t){let n=`${iw}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const sw="firestore_targets";function Vl(r,e){return`${sw}_${r}_${e}`}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nt="SharedClientState";class Wa{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Ws(e,t,n){const i=JSON.parse(n);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new N(i.error.code,i.error.message))),o?new Wa(e,t,i.state,s):(Se(Nt,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class qs{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ws(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new N(n.error.code,n.error.message))),s?new qs(e,n.state,i):(Se(Nt,`Failed to parse target state for ID '${e}': ${t}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ha{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ws(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=Eh();for(let o=0;i&&o<n.activeTargetIds.length;++o)i=Cy(n.activeTargetIds[o]),s=s.add(n.activeTargetIds[o]);return i?new Ha(e,s):(Se(Nt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Lh{constructor(e,t){this.clientId=e,this.onlineState=t}static Ws(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Lh(t.clientId,t.onlineState):(Se(Nt,`Failed to parse online state: ${e}`),null)}}class mu{constructor(){this.activeTargetIds=Eh()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Ol{constructor(e,t,n,i,s){this.window=e,this.Mi=t,this.persistenceKey=n,this.Js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Hs=this.Ys.bind(this),this.Zs=new ue(H),this.started=!1,this.Xs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.eo=hg(this.persistenceKey,this.Js),this.no=function(l){return`firestore_sequence_number_${l}`}(this.persistenceKey),this.Zs=this.Zs.insert(this.Js,new mu),this.ro=new RegExp(`^${rw}_${o}_([^_]*)$`),this.io=new RegExp(`^${iw}_${o}_(\\d+)(?:_(.*))?$`),this.so=new RegExp(`^${sw}_${o}_(\\d+)$`),this.oo=function(l){return`firestore_online_state_${l}`}(this.persistenceKey),this._o=function(l){return`firestore_bundle_loaded_v2_${l}`}(this.persistenceKey),this.window.addEventListener("storage",this.Hs)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ts();for(const n of e){if(n===this.Js)continue;const i=this.getItem(hg(this.persistenceKey,n));if(i){const s=Ha.Ws(n,i);s&&(this.Zs=this.Zs.insert(s.clientId,s))}}this.ao();const t=this.storage.getItem(this.oo);if(t){const n=this.uo(t);n&&this.co(n)}for(const n of this.Xs)this.Ys(n);this.Xs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.no,JSON.stringify(e))}getAllActiveQueryTargets(){return this.lo(this.Zs)}isActiveQueryTarget(e){let t=!1;return this.Zs.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.ho(e,"pending")}updateMutationState(e,t,n){this.ho(e,t,n),this.Po(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(Vl(this.persistenceKey,e));if(i){const s=qs.Ws(e,i);s&&(n=s.state)}}return t&&this.To.zs(e),this.ao(),n}removeLocalQueryTarget(e){this.To.js(e),this.ao()}isLocalQueryTarget(e){return this.To.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Vl(this.persistenceKey,e))}updateQueryState(e,t,n){this.Io(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Po(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Eo(e)}notifyBundleLoaded(e){this.Ao(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Hs),this.removeItem(this.eo),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return V(Nt,"READ",e,t),t}setItem(e,t){V(Nt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){V(Nt,"REMOVE",e),this.storage.removeItem(e)}Ys(e){const t=e;if(t.storageArea===this.storage){if(V(Nt,"EVENT",t.key,t.newValue),t.key===this.eo)return void Se("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Mi.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.ro.test(t.key)){if(t.newValue==null){const n=this.Ro(t.key);return this.Vo(n,null)}{const n=this.mo(t.key,t.newValue);if(n)return this.Vo(n.clientId,n)}}else if(this.io.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(this.so.test(t.key)){if(t.newValue!==null){const n=this.yo(t.key,t.newValue);if(n)return this.wo(n)}}else if(t.key===this.oo){if(t.newValue!==null){const n=this.uo(t.newValue);if(n)return this.co(n)}}else if(t.key===this.no){const n=function(s){let o=lt.ce;if(s!=null)try{const c=JSON.parse(s);q(typeof c=="number",30636,{So:s}),o=c}catch(c){Se(Nt,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);n!==lt.ce&&this.sequenceNumberHandler(n)}else if(t.key===this._o){const n=this.bo(t.newValue);await Promise.all(n.map(i=>this.syncEngine.Do(i)))}}}else this.Xs.push(t)})}}get To(){return this.Zs.get(this.Js)}ao(){this.setItem(this.eo,this.To.Gs())}ho(e,t,n){const i=new Wa(this.currentUser,e,t,n),s=dg(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Gs())}Po(e){const t=dg(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Eo(e){const t={clientId:this.Js,onlineState:e};this.storage.setItem(this.oo,JSON.stringify(t))}Io(e,t,n){const i=Vl(this.persistenceKey,e),s=new qs(e,t,n);this.setItem(i,s.Gs())}Ao(e){const t=JSON.stringify(Array.from(e));this.setItem(this._o,t)}Ro(e){const t=this.ro.exec(e);return t?t[1]:null}mo(e,t){const n=this.Ro(e);return Ha.Ws(n,t)}fo(e,t){const n=this.io.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return Wa.Ws(new Le(s),i,t)}yo(e,t){const n=this.so.exec(e),i=Number(n[1]);return qs.Ws(i,t)}uo(e){return Lh.Ws(e)}bo(e){return JSON.parse(e)}async po(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Co(e.batchId,e.state,e.error);V(Nt,`Ignoring mutation for non-active user ${e.user.uid}`)}wo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Vo(e,t){const n=t?this.Zs.insert(e,t):this.Zs.remove(e),i=this.lo(this.Zs),s=this.lo(n),o=[],c=[];return s.forEach(l=>{i.has(l)||o.push(l)}),i.forEach(l=>{s.has(l)||c.push(l)}),this.syncEngine.Fo(o,c).then(()=>{this.Zs=n})}co(e){this.Zs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}lo(e){let t=Eh();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class ow{constructor(){this.Mo=new mu,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,n){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new mu,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cC{Oo(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fg="ConnectivityMonitor";class pg{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){V(fg,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){V(fg,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let la=null;function yu(){return la===null?la=function(){return 268435456+Math.round(2147483648*Math.random())}():la++,"0x"+la.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ml="RestConnection",lC={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class uC{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===nu?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(e,t,n,i,s){const o=yu(),c=this.zo(e,t.toUriEncodedString());V(Ml,`Sending RPC '${e}' ${o}:`,c,n);const l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,i,s);const{host:u}=new URL(c),d=Vi(u);return this.Jo(e,c,l,n,d).then(f=>(V(Ml,`Received RPC '${e}' ${o}: `,f),f),f=>{throw Gt(Ml,`RPC '${e}' ${o} failed with error: `,f,"url: ",c,"request:",n),f})}Ho(e,t,n,i,s,o){return this.Go(e,t,n,i,s)}jo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Ui}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),n&&n.headers.forEach((i,s)=>e[s]=i)}zo(e,t){const n=lC[e];return`${this.Uo}/v1/${t}:${n}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hC{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ge="WebChannelConnection";class dC extends uC{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,n,i,s){const o=yu();return new Promise((c,l)=>{const u=new fy;u.setWithCredentials(!0),u.listenOnce(py.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case pa.NO_ERROR:const f=u.getResponseJson();V(Ge,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(f)),c(f);break;case pa.TIMEOUT:V(Ge,`RPC '${e}' ${o} timed out`),l(new N(C.DEADLINE_EXCEEDED,"Request time out"));break;case pa.HTTP_ERROR:const g=u.getStatus();if(V(Ge,`RPC '${e}' ${o} failed with status:`,g,"response text:",u.getResponseText()),g>0){let _=u.getResponseJson();Array.isArray(_)&&(_=_[0]);const R=_==null?void 0:_.error;if(R&&R.status&&R.message){const k=function(x){const M=x.toLowerCase().replace(/_/g,"-");return Object.values(C).indexOf(M)>=0?M:C.UNKNOWN}(R.status);l(new N(k,R.message))}else l(new N(C.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new N(C.UNAVAILABLE,"Connection failed."));break;default:$(9055,{l_:e,streamId:o,h_:u.getLastErrorCode(),P_:u.getLastError()})}}finally{V(Ge,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(i);V(Ge,`RPC '${e}' ${o} sending request:`,i),u.send(t,"POST",d,n,15)})}T_(e,t,n){const i=yu(),s=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=yy(),c=my(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;const d=s.join("");V(Ge,`Creating RPC '${e}' stream ${i}: ${d}`,l);const f=o.createWebChannel(d,l);this.I_(f);let g=!1,_=!1;const R=new hC({Yo:T=>{_?V(Ge,`Not sending because RPC '${e}' stream ${i} is closed:`,T):(g||(V(Ge,`Opening RPC '${e}' stream ${i} transport.`),f.open(),g=!0),V(Ge,`RPC '${e}' stream ${i} sending:`,T),f.send(T))},Zo:()=>f.close()}),k=(T,x,M)=>{T.listen(x,F=>{try{M(F)}catch(K){setTimeout(()=>{throw K},0)}})};return k(f,bs.EventType.OPEN,()=>{_||(V(Ge,`RPC '${e}' stream ${i} transport opened.`),R.o_())}),k(f,bs.EventType.CLOSE,()=>{_||(_=!0,V(Ge,`RPC '${e}' stream ${i} transport closed`),R.a_(),this.E_(f))}),k(f,bs.EventType.ERROR,T=>{_||(_=!0,Gt(Ge,`RPC '${e}' stream ${i} transport errored. Name:`,T.name,"Message:",T.message),R.a_(new N(C.UNAVAILABLE,"The operation could not be completed")))}),k(f,bs.EventType.MESSAGE,T=>{var x;if(!_){const M=T.data[0];q(!!M,16349);const F=M,K=(F==null?void 0:F.error)||((x=F[0])==null?void 0:x.error);if(K){V(Ge,`RPC '${e}' stream ${i} received error:`,K);const W=K.status;let j=function(w){const v=Ce[w];if(v!==void 0)return w_(v)}(W),E=K.message;j===void 0&&(j=C.INTERNAL,E="Unknown error status: "+W+" with message "+K.message),_=!0,R.a_(new N(j,E)),f.close()}else V(Ge,`RPC '${e}' stream ${i} received:`,M),R.u_(M)}}),k(c,gy.STAT_EVENT,T=>{T.stat===Ql.PROXY?V(Ge,`RPC '${e}' stream ${i} detected buffering proxy`):T.stat===Ql.NOPROXY&&V(Ge,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{R.__()},0),R}terminate(){this.c_.forEach(e=>e.close()),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter(t=>t===e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function aw(){return typeof window<"u"?window:null}function ba(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vo(r){return new yP(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uh{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Mi=e,this.timerId=t,this.d_=n,this.A_=i,this.R_=s,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-n);i>0&&V("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gg="PersistentStream";class cw{constructor(e,t,n,i,s,o,c,l){this.Mi=e,this.S_=n,this.b_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Uh(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===C.RESOURCE_EXHAUSTED?(Se(t.toString()),Se("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===C.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.D_===t&&this.G_(n,i)},n=>{e(()=>{const i=new N(C.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)})})}G_(e,t){const n=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{n(()=>this.listener.Xo())}),this.stream.t_(()=>{n(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()))}),this.stream.r_(i=>{n(()=>this.z_(i))}),this.stream.onMessage(i=>{n(()=>++this.F_==1?this.J_(i):this.onNext(i))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return V(gg,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():(V(gg,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class fC extends cw{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=IP(this.serializer,e),n=function(s){if(!("targetChange"in s))return z.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?z.min():o.readTime?Re(o.readTime):z.min()}(e);return this.listener.H_(t,n)}Y_(e){const t={};t.database=hu(this.serializer),t.addTarget=function(s,o){let c;const l=o.target;if(c=Ua(l)?{documents:C_(s,l)}:{query:k_(s,l).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=T_(s,o.resumeToken);const u=lu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}else if(o.snapshotVersion.compareTo(z.min())>0){c.readTime=Ai(s,o.snapshotVersion.toTimestamp());const u=lu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}return c}(this.serializer,e);const n=vP(this.serializer,e);n&&(t.labels=n),this.q_(t)}Z_(e){const t={};t.database=hu(this.serializer),t.removeTarget=e,this.q_(t)}}class pC extends cw{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return q(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,q(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){q(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=EP(e.writeResults,e.commitTime),n=Re(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=hu(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>ao(this.serializer,n))};this.q_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gC{}class mC extends gC{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new N(C.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Go(e,uu(t,n),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new N(C.UNKNOWN,s.toString())})}Ho(e,t,n,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.Ho(e,uu(t,n),i,o,c,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new N(C.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}class yC{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Se(t),this.aa=!1):V("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kr="RemoteStore";class _C{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=s,this.Aa.Oo(o=>{n.enqueueAndForget(async()=>{Hn(this)&&(V(kr,"Restarting streams for network reachability change."),await async function(l){const u=B(l);u.Ea.add(4),await zi(u),u.Ra.set("Unknown"),u.Ea.delete(4),await Oo(u)}(this))})}),this.Ra=new yC(n,i)}}async function Oo(r){if(Hn(r))for(const e of r.da)await e(!0)}async function zi(r){for(const e of r.da)await e(!1)}function Pc(r,e){const t=B(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),qh(t)?$h(t):ji(t).O_()&&Bh(t,e))}function Pi(r,e){const t=B(r),n=ji(t);t.Ia.delete(e),n.O_()&&lw(t,e),t.Ia.size===0&&(n.O_()?n.L_():Hn(t)&&t.Ra.set("Unknown"))}function Bh(r,e){if(r.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(z.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}ji(r).Y_(e)}function lw(r,e){r.Va.Ue(e),ji(r).Z_(e)}function $h(r){r.Va=new fP({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),ji(r).start(),r.Ra.ua()}function qh(r){return Hn(r)&&!ji(r).x_()&&r.Ia.size>0}function Hn(r){return B(r).Ea.size===0}function uw(r){r.Va=void 0}async function wC(r){r.Ra.set("Online")}async function IC(r){r.Ia.forEach((e,t)=>{Bh(r,e)})}async function EC(r,e){uw(r),qh(r)?(r.Ra.ha(e),$h(r)):r.Ra.set("Unknown")}async function vC(r,e,t){if(r.Ra.set("Online"),e instanceof v_&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.Va.removeTarget(c))}(r,e)}catch(n){V(kr,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await Qa(r,n)}else if(e instanceof va?r.Va.Ze(e):e instanceof E_?r.Va.st(e):r.Va.tt(e),!t.isEqual(z.min()))try{const n=await X_(r.localStore);t.compareTo(n)>=0&&await function(s,o){const c=s.Va.Tt(o);return c.targetChanges.forEach((l,u)=>{if(l.resumeToken.approximateByteSize()>0){const d=s.Ia.get(u);d&&s.Ia.set(u,d.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,u)=>{const d=s.Ia.get(l);if(!d)return;s.Ia.set(l,d.withResumeToken(Te.EMPTY_BYTE_STRING,d.snapshotVersion)),lw(s,l);const f=new Qt(d.target,l,u,d.sequenceNumber);Bh(s,f)}),s.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){V(kr,"Failed to raise snapshot:",n),await Qa(r,n)}}async function Qa(r,e,t){if(!Gn(e))throw e;r.Ea.add(1),await zi(r),r.Ra.set("Offline"),t||(t=()=>X_(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{V(kr,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await Oo(r)})}function hw(r,e){return e().catch(t=>Qa(r,t,e))}async function Ki(r){const e=B(r),t=Bn(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Cn;for(;TC(e);)try{const i=await sC(e.localStore,n);if(i===null){e.Ta.length===0&&t.L_();break}n=i.batchId,bC(e,i)}catch(i){await Qa(e,i)}dw(e)&&fw(e)}function TC(r){return Hn(r)&&r.Ta.length<10}function bC(r,e){r.Ta.push(e);const t=Bn(r);t.O_()&&t.X_&&t.ea(e.mutations)}function dw(r){return Hn(r)&&!Bn(r).x_()&&r.Ta.length>0}function fw(r){Bn(r).start()}async function AC(r){Bn(r).ra()}async function SC(r){const e=Bn(r);for(const t of r.Ta)e.ea(t.mutations)}async function RC(r,e,t){const n=r.Ta.shift(),i=Ah.from(n,e,t);await hw(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await Ki(r)}async function PC(r,e){e&&Bn(r).X_&&await async function(n,i){if(function(o){return __(o)&&o!==C.ABORTED}(i.code)){const s=n.Ta.shift();Bn(n).B_(),await hw(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await Ki(n)}}(r,e),dw(r)&&fw(r)}async function mg(r,e){const t=B(r);t.asyncQueue.verifyOperationInProgress(),V(kr,"RemoteStore received new credentials");const n=Hn(t);t.Ea.add(3),await zi(t),n&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Oo(t)}async function _u(r,e){const t=B(r);e?(t.Ea.delete(2),await Oo(t)):e||(t.Ea.add(2),await zi(t),t.Ra.set("Unknown"))}function ji(r){return r.ma||(r.ma=function(t,n,i){const s=B(t);return s.sa(),new fC(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:wC.bind(null,r),t_:IC.bind(null,r),r_:EC.bind(null,r),H_:vC.bind(null,r)}),r.da.push(async e=>{e?(r.ma.B_(),qh(r)?$h(r):r.Ra.set("Unknown")):(await r.ma.stop(),uw(r))})),r.ma}function Bn(r){return r.fa||(r.fa=function(t,n,i){const s=B(t);return s.sa(),new pC(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:AC.bind(null,r),r_:PC.bind(null,r),ta:SC.bind(null,r),na:RC.bind(null,r)}),r.da.push(async e=>{e?(r.fa.B_(),await Ki(r)):(await r.fa.stop(),r.Ta.length>0&&(V(kr,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zh{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new ze,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new zh(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(C.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Gi(r,e){if(Se("AsyncQueue",`${e}: ${r}`),Gn(r))return new N(C.UNAVAILABLE,`${e}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class li{static emptySet(e){return new li(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||L.comparator(t.key,n.key):(t,n)=>L.comparator(t.key,n.key),this.keyedMap=As(),this.sortedSet=new ue(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof li)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new li;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yg{constructor(){this.ga=new ue(L.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):$(63341,{Rt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class Ci{constructor(e,t,n,i,s,o,c,l,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new Ci(e,t,li.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Co(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CC{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some(e=>e.Da())}}class kC{constructor(){this.queries=_g(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const i=B(t),s=i.queries;i.queries=_g(),s.forEach((o,c)=>{for(const l of c.Sa)l.onError(n)})})(this,new N(C.ABORTED,"Firestore shutting down"))}}function _g(){return new an(r=>i_(r),Co)}async function Kh(r,e){const t=B(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.ba()&&e.Da()&&(n=2):(s=new CC,n=e.Da()?0:1);try{switch(n){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Gi(o,`Initialization of query '${Jr(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.Sa.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&Gh(t)}async function jh(r,e){const t=B(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.Sa.indexOf(e);o>=0&&(s.Sa.splice(o,1),s.Sa.length===0?i=e.Da()?0:1:!s.ba()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function DC(r,e){const t=B(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.Sa)c.Fa(i)&&(n=!0);o.wa=i}}n&&Gh(t)}function xC(r,e,t){const n=B(r),i=n.queries.get(e);if(i)for(const s of i.Sa)s.onError(t);n.queries.delete(e)}function Gh(r){r.Ca.forEach(e=>{e.next()})}var wu,wg;(wg=wu||(wu={})).Ma="default",wg.Cache="cache";class Wh{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new Ci(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.qa||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=Ci.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==wu.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class NC{constructor(e,t){this.Qa=e,this.byteLength=t}$a(){return"metadata"in this.Qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ig{constructor(e){this.serializer=e}$s(e){return qt(this.serializer,e)}Us(e){return e.metadata.exists?P_(this.serializer,e.document,!1):de.newNoDocument(this.$s(e.metadata.name),this.Ks(e.metadata.readTime))}Ks(e){return Re(e)}}class VC{constructor(e,t){this.Ua=e,this.serializer=t,this.Ka=[],this.Wa=[],this.collectionGroups=new Set,this.progress=pw(e)}get queries(){return this.Ka}get documents(){return this.Wa}Ga(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.Qa.namedQuery)this.Ka.push(e.Qa.namedQuery);else if(e.Qa.documentMetadata){this.Wa.push({metadata:e.Qa.documentMetadata}),e.Qa.documentMetadata.exists||++t;const n=Z.fromString(e.Qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else e.Qa.document&&(this.Wa[this.Wa.length-1].document=e.Qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,{...this.progress}):null}za(e){const t=new Map,n=new Ig(this.serializer);for(const i of e)if(i.metadata.queries){const s=n.$s(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||Y()).add(s);t.set(o,c)}}return t}async ja(e){const t=await oC(e,new Ig(this.serializer),this.Wa,this.Ua.id),n=this.za(this.documents);for(const i of this.Ka)await aC(e,i,n.get(i.name));return this.progress.taskState="Success",{progress:this.progress,Ja:this.collectionGroups,Ha:t}}}function pw(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gw{constructor(e){this.key=e}}class mw{constructor(e){this.key=e}}class yw{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=Y(),this.mutatedKeys=Y(),this.eu=o_(e),this.tu=new li(this.eu)}get nu(){return this.Ya}ru(e,t){const n=t?t.iu:new yg,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const l=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,u=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((d,f)=>{const g=i.get(d),_=ko(this.query,f)?f:null,R=!!g&&this.mutatedKeys.has(g.key),k=!!_&&(_.hasLocalMutations||this.mutatedKeys.has(_.key)&&_.hasCommittedMutations);let T=!1;g&&_?g.data.isEqual(_.data)?R!==k&&(n.track({type:3,doc:_}),T=!0):this.su(g,_)||(n.track({type:2,doc:_}),T=!0,(l&&this.eu(_,l)>0||u&&this.eu(_,u)<0)&&(c=!0)):!g&&_?(n.track({type:0,doc:_}),T=!0):g&&!_&&(n.track({type:1,doc:g}),T=!0,(l||u)&&(c=!0)),T&&(_?(o=o.add(_),s=k?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),n.track({type:1,doc:d})}return{tu:o,iu:n,Cs:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((d,f)=>function(_,R){const k=T=>{switch(T){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return $(20277,{Rt:T})}};return k(_)-k(R)}(d.type,f.type)||this.eu(d.doc,f.doc)),this.ou(n),i=i??!1;const c=t&&!i?this._u():[],l=this.Xa.size===0&&this.current&&!i?1:0,u=l!==this.Za;return this.Za=l,o.length!==0||u?{snapshot:new Ci(this.query,e.tu,s,o,e.mutatedKeys,l===0,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new yg,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=Y(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))});const t=[];return e.forEach(n=>{this.Xa.has(n)||t.push(new mw(n))}),this.Xa.forEach(n=>{e.has(n)||t.push(new gw(n))}),t}cu(e){this.Ya=e.Qs,this.Xa=Y();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return Ci.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const Qn="SyncEngine";class OC{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class MC{constructor(e){this.key=e,this.hu=!1}}class FC{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new an(c=>i_(c),Co),this.Iu=new Map,this.Eu=new Set,this.du=new ue(L.comparator),this.Au=new Map,this.Ru=new xh,this.Vu={},this.mu=new Map,this.fu=Cr.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function LC(r,e,t=!0){const n=Cc(r);let i;const s=n.Tu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await _w(n,e,t,!0),i}async function UC(r,e){const t=Cc(r);await _w(t,e,!0,!1)}async function _w(r,e,t,n){const i=await Si(r.localStore,rt(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await Hh(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&Pc(r.remoteStore,i),c}async function Hh(r,e,t,n,i){r.pu=(f,g,_)=>async function(k,T,x,M){let F=T.view.ru(x);F.Cs&&(F=await Ga(k.localStore,T.query,!1).then(({documents:E})=>T.view.ru(E,F)));const K=M&&M.targetChanges.get(T.targetId),W=M&&M.targetMismatches.get(T.targetId)!=null,j=T.view.applyChanges(F,k.isPrimaryClient,K,W);return Iu(k,T.targetId,j.au),j.snapshot}(r,f,g,_);const s=await Ga(r.localStore,e,!0),o=new yw(e,s.Qs),c=o.ru(s.documents),l=No.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),u=o.applyChanges(c,r.isPrimaryClient,l);Iu(r,t,u.au);const d=new OC(e,t,o);return r.Tu.set(e,d),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),u.snapshot}async function BC(r,e,t){const n=B(r),i=n.Tu.get(e),s=n.Iu.get(i.targetId);if(s.length>1)return n.Iu.set(i.targetId,s.filter(o=>!Co(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await Ri(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&Pi(n.remoteStore,i.targetId),ki(n,i.targetId)}).catch(jn)):(ki(n,i.targetId),await Ri(n.localStore,i.targetId,!0))}async function $C(r,e){const t=B(r),n=t.Tu.get(e),i=t.Iu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Pi(t.remoteStore,n.targetId))}async function qC(r,e,t){const n=Xh(r);try{const i=await function(o,c){const l=B(o),u=ie.now(),d=c.reduce((_,R)=>_.add(R.key),Y());let f,g;return l.persistence.runTransaction("Locally write mutations","readwrite",_=>{let R=ht(),k=Y();return l.Ns.getEntries(_,d).next(T=>{R=T,R.forEach((x,M)=>{M.isValidDocument()||(k=k.add(x))})}).next(()=>l.localDocuments.getOverlayedDocuments(_,R)).next(T=>{f=T;const x=[];for(const M of c){const F=uP(M,f.get(M.key).overlayedDocument);F!=null&&x.push(new cn(M.key,F,Qy(F.value.mapValue),_e.exists(!0)))}return l.mutationQueue.addMutationBatch(_,u,x,c)}).next(T=>{g=T;const x=T.applyToLocalDocumentSet(f,k);return l.documentOverlayCache.saveOverlays(_,T.batchId,x)})}).then(()=>({batchId:g.batchId,changes:c_(f)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(o,c,l){let u=o.Vu[o.currentUser.toKey()];u||(u=new ue(H)),u=u.insert(c,l),o.Vu[o.currentUser.toKey()]=u}(n,i.batchId,t),await ln(n,i.changes),await Ki(n.remoteStore)}catch(i){const s=Gi(i,"Failed to persist write");t.reject(s)}}async function ww(r,e){const t=B(r);try{const n=await iC(t.localStore,e);e.targetChanges.forEach((i,s)=>{const o=t.Au.get(s);o&&(q(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?q(o.hu,14607):i.removedDocuments.size>0&&(q(o.hu,42227),o.hu=!1))}),await ln(t,n,e)}catch(n){await jn(n)}}function Eg(r,e,t){const n=B(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Tu.forEach((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)}),function(o,c){const l=B(o);l.onlineState=c;let u=!1;l.queries.forEach((d,f)=>{for(const g of f.Sa)g.va(c)&&(u=!0)}),u&&Gh(l)}(n.eventManager,e),i.length&&n.Pu.H_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function zC(r,e,t){const n=B(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Au.get(e),s=i&&i.key;if(s){let o=new ue(L.comparator);o=o.insert(s,de.newNoDocument(s,z.min()));const c=Y().add(s),l=new xo(z.min(),new Map,new ue(H),o,c);await ww(n,l),n.du=n.du.remove(s),n.Au.delete(e),Jh(n)}else await Ri(n.localStore,e,!1).then(()=>ki(n,e,t)).catch(jn)}async function KC(r,e){const t=B(r),n=e.batch.batchId;try{const i=await rC(t.localStore,e);Yh(t,n,null),Qh(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await ln(t,i)}catch(i){await jn(i)}}async function jC(r,e,t){const n=B(r);try{const i=await function(o,c){const l=B(o);return l.persistence.runTransaction("Reject batch","readwrite-primary",u=>{let d;return l.mutationQueue.lookupMutationBatch(u,c).next(f=>(q(f!==null,37113),d=f.keys(),l.mutationQueue.removeMutationBatch(u,f))).next(()=>l.mutationQueue.performConsistencyCheck(u)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(u,d,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(u,d)).next(()=>l.localDocuments.getDocuments(u,d))})}(n.localStore,e);Yh(n,e,t),Qh(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await ln(n,i)}catch(i){await jn(i)}}async function GC(r,e){const t=B(r);Hn(t.remoteStore)||V(Qn,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const c=B(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",l=>c.mutationQueue.getHighestUnacknowledgedBatchId(l))}(t.localStore);if(n===Cn)return void e.resolve();const i=t.mu.get(n)||[];i.push(e),t.mu.set(n,i)}catch(n){const i=Gi(n,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function Qh(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Yh(r,e,t){const n=B(r);let i=n.Vu[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Vu[n.currentUser.toKey()]=i}}function ki(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Ru.jr(e).forEach(n=>{r.Ru.containsKey(n)||Iw(r,n)})}function Iw(r,e){r.Eu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(Pi(r.remoteStore,t),r.du=r.du.remove(e),r.Au.delete(t),Jh(r))}function Iu(r,e,t){for(const n of t)n instanceof gw?(r.Ru.addReference(n.key,e),WC(r,n)):n instanceof mw?(V(Qn,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,e),r.Ru.containsKey(n.key)||Iw(r,n.key)):$(19791,{wu:n})}function WC(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Eu.has(n)||(V(Qn,"New document in limbo: "+t),r.Eu.add(n),Jh(r))}function Jh(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new L(Z.fromString(e)),n=r.fu.next();r.Au.set(n,new MC(t)),r.du=r.du.insert(t,n),Pc(r.remoteStore,new Qt(rt(Bi(t.path)),n,"TargetPurposeLimboResolution",lt.ce))}}async function ln(r,e,t){const n=B(r),i=[],s=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((c,l)=>{o.push(n.pu(l,e,t).then(u=>{var d;if((u||t)&&n.isPrimaryClient){const f=u?!u.fromCache:(d=t==null?void 0:t.targetChanges.get(l.targetId))==null?void 0:d.current;n.sharedClientState.updateQueryState(l.targetId,f?"current":"not-current")}if(u){i.push(u);const f=Mh.As(l.targetId,u);s.push(f)}}))}),await Promise.all(o),n.Pu.H_(i),await async function(l,u){const d=B(l);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",f=>A.forEach(u,g=>A.forEach(g.Es,_=>d.persistence.referenceDelegate.addReference(f,g.targetId,_)).next(()=>A.forEach(g.ds,_=>d.persistence.referenceDelegate.removeReference(f,g.targetId,_)))))}catch(f){if(!Gn(f))throw f;V(Fh,"Failed to update sequence numbers: "+f)}for(const f of u){const g=f.targetId;if(!f.fromCache){const _=d.Ms.get(g),R=_.snapshotVersion,k=_.withLastLimboFreeSnapshotVersion(R);d.Ms=d.Ms.insert(g,k)}}}(n.localStore,s))}async function HC(r,e){const t=B(r);if(!t.currentUser.isEqual(e)){V(Qn,"User change. New user:",e.toKey());const n=await J_(t.localStore,e);t.currentUser=e,function(s,o){s.mu.forEach(c=>{c.forEach(l=>{l.reject(new N(C.CANCELLED,o))})}),s.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await ln(t,n.Ls)}}function QC(r,e){const t=B(r),n=t.Au.get(e);if(n&&n.hu)return Y().add(n.key);{let i=Y();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function YC(r,e){const t=B(r),n=await Ga(t.localStore,e.query,!0),i=e.view.cu(n);return t.isPrimaryClient&&Iu(t,e.targetId,i.au),i}async function JC(r,e){const t=B(r);return tw(t.localStore,e).then(n=>ln(t,n))}async function XC(r,e,t,n){const i=B(r),s=await function(c,l){const u=B(c),d=B(u.mutationQueue);return u.persistence.runTransaction("Lookup mutation documents","readonly",f=>d.er(f,l).next(g=>g?u.localDocuments.getDocuments(f,g):A.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await Ki(i.remoteStore):t==="acknowledged"||t==="rejected"?(Yh(i,e,n||null),Qh(i,e),function(c,l){B(B(c).mutationQueue).ir(l)}(i.localStore,e)):$(6720,"Unknown batchState",{Su:t}),await ln(i,s)):V(Qn,"Cannot apply mutation batch with id: "+e)}async function ZC(r,e){const t=B(r);if(Cc(t),Xh(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await vg(t,n.toArray());t.gu=!0,await _u(t.remoteStore,!0);for(const s of i)Pc(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const n=[];let i=Promise.resolve();t.Iu.forEach((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):i=i.then(()=>(ki(t,o),Ri(t.localStore,o,!0))),Pi(t.remoteStore,o)}),await i,await vg(t,n),function(o){const c=B(o);c.Au.forEach((l,u)=>{Pi(c.remoteStore,u)}),c.Ru.Jr(),c.Au=new Map,c.du=new ue(L.comparator)}(t),t.gu=!1,await _u(t.remoteStore,!1)}}async function vg(r,e,t){const n=B(r),i=[],s=[];for(const o of e){let c;const l=n.Iu.get(o);if(l&&l.length!==0){c=await Si(n.localStore,rt(l[0]));for(const u of l){const d=n.Tu.get(u),f=await YC(n,d);f.snapshot&&s.push(f.snapshot)}}else{const u=await ew(n.localStore,o);c=await Si(n.localStore,u),await Hh(n,Ew(u),o,!1,c.resumeToken)}i.push(c)}return n.Pu.H_(s),i}function Ew(r){return r_(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function ek(r){return function(t){return B(B(t).persistence).Ts()}(B(r).localStore)}async function tk(r,e,t,n){const i=B(r);if(i.gu)return void V(Qn,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await tw(i.localStore,s_(s[0])),c=xo.createSynthesizedRemoteEventForCurrentChange(e,t==="current",Te.EMPTY_BYTE_STRING);await ln(i,o,c);break}case"rejected":await Ri(i.localStore,e,!0),ki(i,e,n);break;default:$(64155,t)}}async function nk(r,e,t){const n=Cc(r);if(n.gu){for(const i of e){if(n.Iu.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){V(Qn,"Adding an already active target "+i);continue}const s=await ew(n.localStore,i),o=await Si(n.localStore,s);await Hh(n,Ew(s),o.targetId,!1,o.resumeToken),Pc(n.remoteStore,o)}for(const i of t)n.Iu.has(i)&&await Ri(n.localStore,i,!1).then(()=>{Pi(n.remoteStore,i),ki(n,i)}).catch(jn)}}function Cc(r){const e=B(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=ww.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=QC.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=zC.bind(null,e),e.Pu.H_=DC.bind(null,e.eventManager),e.Pu.yu=xC.bind(null,e.eventManager),e}function Xh(r){const e=B(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=KC.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=jC.bind(null,e),e}function rk(r,e,t){const n=B(r);(async function(s,o,c){try{const l=await o.getMetadata();if(await function(_,R){const k=B(_),T=Re(R.createTime);return k.persistence.runTransaction("hasNewerBundle","readonly",x=>k.Ii.getBundleMetadata(x,R.id)).then(x=>!!x&&x.createTime.compareTo(T)>=0)}(s.localStore,l))return await o.close(),c._completeWith(function(_){return{taskState:"Success",documentsLoaded:_.totalDocuments,bytesLoaded:_.totalBytes,totalDocuments:_.totalDocuments,totalBytes:_.totalBytes}}(l)),Promise.resolve(new Set);c._updateProgress(pw(l));const u=new VC(l,o.serializer);let d=await o.bu();for(;d;){const g=await u.Ga(d);g&&c._updateProgress(g),d=await o.bu()}const f=await u.ja(s.localStore);return await ln(s,f.Ha,void 0),await function(_,R){const k=B(_);return k.persistence.runTransaction("Save bundle","readwrite",T=>k.Ii.saveBundleMetadata(T,R))}(s.localStore,l),c._completeWith(f.progress),Promise.resolve(f.Ja)}catch(l){return Gt(Qn,`Loading bundle failed with ${l}`),c._failWith(l),Promise.resolve(new Set)}})(n,e,t).then(i=>{n.sharedClientState.notifyBundleLoaded(i)})}class co{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Vo(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return Y_(this.persistence,new Q_,e.initialUser,this.serializer)}Cu(e){return new Nh(Rc.mi,this.serializer)}Du(e){return new ow}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}co.provider={build:()=>new co};class ik extends co{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){q(this.persistence.referenceDelegate instanceof ja,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new z_(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?We.withCacheSize(this.cacheSizeBytes):We.DEFAULT;return new Nh(n=>ja.mi(n,t),this.serializer)}}class vw extends co{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Xh(this.xu.syncEngine),await Ki(this.xu.remoteStore),await this.persistence.Ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return Y_(this.persistence,new Q_,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new z_(n,e.asyncQueue,t)}Mu(e,t){const n=new fR(t,this.persistence);return new dR(e.asyncQueue,n)}Cu(e){const t=Oh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?We.withCacheSize(this.cacheSizeBytes):We.DEFAULT;return new Vh(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,aw(),ba(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new ow}}class sk extends vw{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Ol&&(this.sharedClientState.syncEngine={Co:XC.bind(null,t),vo:tk.bind(null,t),Fo:nk.bind(null,t),Ts:ek.bind(null,t),Do:JC.bind(null,t)},await this.sharedClientState.start()),await this.persistence.Ji(async n=>{await ZC(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=aw();if(!Ol.v(t))throw new N(C.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Oh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Ol(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class lo{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Eg(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=HC.bind(null,this.syncEngine),await _u(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new kC}()}createDatastore(e){const t=Vo(e.databaseInfo.databaseId),n=function(s){return new dC(s)}(e.databaseInfo);return function(s,o,c,l){return new mC(s,o,c,l)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,o,c){return new _C(n,i,s,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>Eg(this.syncEngine,t,0),function(){return pg.v()?new pg:new cC}())}createSyncEngine(e,t){return function(i,s,o,c,l,u,d){const f=new FC(i,s,o,c,l,u);return d&&(f.gu=!0),f}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=B(i);V(kr,"RemoteStore shutting down."),s.Ea.add(5),await zi(s),s.Aa.shutdown(),s.Ra.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}lo.provider={build:()=>new lo};function Tg(r,e=10240){let t=0;return{async read(){if(t<r.byteLength){const n={value:r.slice(t,t+e),done:!1};return t+=e,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Se("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ok{constructor(e,t){this.Bu=e,this.serializer=t,this.metadata=new ze,this.buffer=new Uint8Array,this.Lu=function(){return new TextDecoder("utf-8")}(),this.ku().then(n=>{n&&n.$a()?this.metadata.resolve(n.Qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n==null?void 0:n.Qa)}`))},n=>this.metadata.reject(n))}close(){return this.Bu.cancel()}async getMetadata(){return this.metadata.promise}async bu(){return await this.getMetadata(),this.ku()}async ku(){const e=await this.qu();if(e===null)return null;const t=this.Lu.decode(e),n=Number(t);isNaN(n)&&this.Qu(`length string (${t}) is not valid number`);const i=await this.$u(n);return new NC(JSON.parse(i),e.length+n)}Uu(){return this.buffer.findIndex(e=>e===123)}async qu(){for(;this.Uu()<0&&!await this.Ku(););if(this.buffer.length===0)return null;const e=this.Uu();e<0&&this.Qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async $u(e){for(;this.buffer.length<e;)await this.Ku()&&this.Qu("Reached the end of bundle when more is expected.");const t=this.Lu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}Qu(e){throw this.Bu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Ku(){const e=await this.Bu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ak{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new N(C.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(i,s){const o=B(i),c={documents:s.map(f=>oo(o.serializer,f))},l=await o.Ho("BatchGetDocuments",o.serializer.databaseId,Z.emptyPath(),c,s.length),u=new Map;l.forEach(f=>{const g=wP(o.serializer,f);u.set(g.key.toString(),g)});const d=[];return s.forEach(f=>{const g=u.get(f.toString());q(!!g,55234,{key:f}),d.push(g)}),d}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new qi(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const i=L.fromPath(n);this.mutations.push(new Th(i,this.precondition(i)))}),await async function(n,i){const s=B(n),o={writes:i.map(c=>ao(s.serializer,c))};await s.Go("Commit",s.serializer.databaseId,Z.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw $(50498,{Gu:e.constructor.name});t=z.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new N(C.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(z.min())?_e.exists(!1):_e.updateTime(t):_e.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(z.min()))throw new N(C.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return _e.updateTime(t)}return _e.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ck{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.zu=n.maxAttempts,this.M_=new Uh(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Ju()}Ju(){this.M_.p_(async()=>{const e=new ak(this.datastore),t=this.Hu(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(i=>{this.Yu(i)}))}).catch(n=>{this.Yu(n)})})}Hu(e){try{const t=this.updateFunction(e);return!So(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e)}Zu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!__(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $n="FirestoreClient";class lk{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=Le.UNAUTHENTICATED,this.clientId=lh.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async o=>{V($n,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(V($n,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new ze;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Gi(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function Fl(r,e){r.asyncQueue.verifyOperationInProgress(),V($n,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await J_(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function bg(r,e){r.asyncQueue.verifyOperationInProgress();const t=await Zh(r);V($n,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>mg(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>mg(e.remoteStore,i)),r._onlineComponents=e}async function Zh(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){V($n,"Using user provided OfflineComponentProvider");try{await Fl(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===C.FAILED_PRECONDITION||i.code===C.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;Gt("Error using user provided cache. Falling back to memory cache: "+t),await Fl(r,new co)}}else V($n,"Using default OfflineComponentProvider"),await Fl(r,new ik(void 0));return r._offlineComponents}async function Dc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(V($n,"Using user provided OnlineComponentProvider"),await bg(r,r._uninitializedComponentsProvider._online)):(V($n,"Using default OnlineComponentProvider"),await bg(r,new lo))),r._onlineComponents}function Tw(r){return Zh(r).then(e=>e.persistence)}function ed(r){return Zh(r).then(e=>e.localStore)}function bw(r){return Dc(r).then(e=>e.remoteStore)}function td(r){return Dc(r).then(e=>e.syncEngine)}function uk(r){return Dc(r).then(e=>e.datastore)}async function Di(r){const e=await Dc(r),t=e.eventManager;return t.onListen=LC.bind(null,e.syncEngine),t.onUnlisten=BC.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=UC.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=$C.bind(null,e.syncEngine),t}function hk(r){return r.asyncQueue.enqueue(async()=>{const e=await Tw(r),t=await bw(r);return e.setNetworkEnabled(!0),function(i){const s=B(i);return s.Ea.delete(0),Oo(s)}(t)})}function dk(r){return r.asyncQueue.enqueue(async()=>{const e=await Tw(r),t=await bw(r);return e.setNetworkEnabled(!1),async function(i){const s=B(i);s.Ea.add(0),await zi(s),s.Ra.set("Offline")}(t)})}function fk(r,e){const t=new ze;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await function(u,d){const f=B(u);return f.persistence.runTransaction("read document","readonly",g=>f.localDocuments.getDocument(g,d))}(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new N(C.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const l=Gi(c,`Failed to get document '${s} from cache`);o.reject(l)}}(await ed(r),e,t)),t.promise}function Aw(r,e,t={}){const n=new ze;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new kc({next:g=>{d.Nu(),o.enqueueAndForget(()=>jh(s,f));const _=g.docs.has(c);!_&&g.fromCache?u.reject(new N(C.UNAVAILABLE,"Failed to get document because the client is offline.")):_&&g.fromCache&&l&&l.source==="server"?u.reject(new N(C.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):u.resolve(g)},error:g=>u.reject(g)}),f=new Wh(Bi(c.path),d,{includeMetadataChanges:!0,qa:!0});return Kh(s,f)}(await Di(r),r.asyncQueue,e,t,n)),n.promise}function pk(r,e){const t=new ze;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await Ga(i,s,!0),l=new yw(s,c.Qs),u=l.ru(c.documents),d=l.applyChanges(u,!1);o.resolve(d.snapshot)}catch(c){const l=Gi(c,`Failed to execute query '${s} against cache`);o.reject(l)}}(await ed(r),e,t)),t.promise}function Sw(r,e,t={}){const n=new ze;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new kc({next:g=>{d.Nu(),o.enqueueAndForget(()=>jh(s,f)),g.fromCache&&l.source==="server"?u.reject(new N(C.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):u.resolve(g)},error:g=>u.reject(g)}),f=new Wh(c,d,{includeMetadataChanges:!0,qa:!0});return Kh(s,f)}(await Di(r),r.asyncQueue,e,t,n)),n.promise}function gk(r,e){const t=new kc(e);return r.asyncQueue.enqueueAndForget(async()=>function(i,s){B(i).Ca.add(s),s.next()}(await Di(r),t)),()=>{t.Nu(),r.asyncQueue.enqueueAndForget(async()=>function(i,s){B(i).Ca.delete(s)}(await Di(r),t))}}function mk(r,e,t,n){const i=function(o,c){let l;return l=typeof o=="string"?I_().encode(o):o,function(d,f){return new ok(d,f)}(function(d,f){if(d instanceof Uint8Array)return Tg(d,f);if(d instanceof ArrayBuffer)return Tg(new Uint8Array(d),f);if(d instanceof ReadableStream)return d.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(l),c)}(t,Vo(e));r.asyncQueue.enqueueAndForget(async()=>{rk(await td(r),i,n)})}function yk(r,e){return r.asyncQueue.enqueue(async()=>function(n,i){const s=B(n);return s.persistence.runTransaction("Get named query","readonly",o=>s.Ii.getNamedQuery(o,i))}(await ed(r),e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rw(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ag=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pw="firestore.googleapis.com",Sg=!0;class Rg{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new N(C.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Pw,this.ssl=Sg}else this.host=e.host,this.ssl=e.ssl??Sg;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=U_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<LP)throw new N(C.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Ey("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Rw(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new N(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new N(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new N(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Mo{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Rg({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(C.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(C.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Rg(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new eR;switch(n.type){case"firstParty":return new iR(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new N(C.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=Ag.get(t);n&&(V("ComponentProvider","Removing Datastore"),Ag.delete(t),n.terminate())}(this),Promise.resolve()}}function _k(r,e,t,n={}){var u;r=re(r,Mo);const i=Vi(e),s=r._getSettings(),o={...s,emulatorOptions:r._getEmulatorOptions()},c=`${e}:${t}`;i&&(Wg(`https://${c}`),Hg("Firestore",!0)),s.host!==Pw&&s.host!==c&&Gt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l={...s,host:c,ssl:i,emulatorOptions:n};if(!Dn(l,o)&&(r._setSettings(l),n.mockUserToken)){let d,f;if(typeof n.mockUserToken=="string")d=n.mockUserToken,f=Le.MOCK_USER;else{d=yE(n.mockUserToken,(u=r._app)==null?void 0:u.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new N(C.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");f=new Le(g)}r._authCredentials=new tR(new wy(d,f))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let it=class Cw{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Cw(this.firestore,e,this._query)}},le=class Ps{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new kn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Ps(this.firestore,e,this._key)}toJSON(){return{type:Ps._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(Ao(t,Ps._jsonSchema))return new Ps(e,n||null,new L(Z.fromString(t.referencePath)))}};le._jsonSchemaVersion="firestore/documentReference/1.0",le._jsonSchema={type:xe("string",le._jsonSchemaVersion),referencePath:xe("string")};let kn=class kw extends it{constructor(e,t,n){super(e,t,Bi(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new le(this.firestore,null,new L(e))}withConverter(e){return new kw(this.firestore,e,this._path)}};function Dw(r,e,...t){if(r=G(r),uh("collection","path",e),r instanceof Mo){const n=Z.fromString(e,...t);return gp(n),new kn(r,null,n)}{if(!(r instanceof le||r instanceof kn))throw new N(C.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Z.fromString(e,...t));return gp(n),new kn(r.firestore,null,n)}}function wk(r,e){if(r=re(r,Mo),uh("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new N(C.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new it(r,null,function(n){return new on(Z.emptyPath(),n)}(e))}function Ya(r,e,...t){if(r=G(r),arguments.length===1&&(e=lh.newId()),uh("doc","path",e),r instanceof Mo){const n=Z.fromString(e,...t);return pp(n),new le(r,null,new L(n))}{if(!(r instanceof le||r instanceof kn))throw new N(C.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Z.fromString(e,...t));return pp(n),new le(r.firestore,r instanceof kn?r.converter:null,new L(n))}}function xw(r,e){return r=G(r),e=G(e),(r instanceof le||r instanceof kn)&&(e instanceof le||e instanceof kn)&&r.firestore===e.firestore&&r.path===e.path&&r.converter===e.converter}function Nw(r,e){return r=G(r),e=G(e),r instanceof it&&e instanceof it&&r.firestore===e.firestore&&Co(r._query,e._query)&&r.converter===e.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pg="AsyncQueue";class Cg{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Uh(this,"async_queue_retry"),this._c=()=>{const n=ba();n&&V(Pg,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=ba();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=ba();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new ze;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Gn(e))throw e;V(Pg,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,Se("INTERNAL UNHANDLED ERROR: ",kg(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=zh.createAndSchedule(this,e,t,n,s=>this.hc(s));return this.tc.push(i),i}uc(){this.nc&&$(47125,{Pc:kg(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function kg(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
`+r.stack),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Eu(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class Ik{constructor(){this._progressObserver={},this._taskCompletionResolver=new ze,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,n){this._progressObserver={next:e,error:t,complete:n}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ek=-1;let Pe=class extends Mo{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new Cg,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Cg(e),this._firestoreClient=void 0,await e}}};function Ye(r){if(r._terminated)throw new N(C.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Vw(r),r._firestoreClient}function Vw(r){var n,i,s;const e=r._freezeSettings(),t=function(c,l,u,d){return new qR(c,l,u,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,Rw(d.experimentalLongPollingOptions),d.useFetchStreams,d.isUsingEmulator)}(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((s=e.localCache)!=null&&s._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new lk(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(c){const l=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(l),_online:l}}(r._componentsProvider))}function vk(r,e){Gt("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return Ow(r,lo.provider,{build:n=>new vw(n,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function Tk(r){Gt("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();Ow(r,lo.provider,{build:t=>new sk(t,e.cacheSizeBytes)})}function Ow(r,e,t){if((r=re(r,Pe))._firestoreClient||r._terminated)throw new N(C.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new N(C.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},Vw(r)}function bk(r){if(r._initialized&&!r._terminated)throw new N(C.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new ze;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!$t.v())return Promise.resolve();const i=n+H_;await $t.delete(i)}(Oh(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}}),e.promise}function Ak(r){return function(t){const n=new ze;return t.asyncQueue.enqueueAndForget(async()=>GC(await td(t),n)),n.promise}(Ye(r=re(r,Pe)))}function Sk(r){return hk(Ye(r=re(r,Pe)))}function Rk(r){return dk(Ye(r=re(r,Pe)))}function Pk(r,e){const t=Ye(r=re(r,Pe)),n=new Ik;return mk(t,r._databaseId,e,n),n}function Ck(r,e){return yk(Ye(r=re(r,Pe)),e).then(t=>t?new it(r,null,t.query):null)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class He{constructor(e){this._byteString=e}static fromBase64String(e){try{return new He(Te.fromBase64String(e))}catch(t){throw new N(C.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new He(Te.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:He._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Ao(e,He._jsonSchema))return He.fromBase64String(e.bytes)}}He._jsonSchemaVersion="firestore/bytes/1.0",He._jsonSchema={type:xe("string",He._jsonSchemaVersion),bytes:xe("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let qn=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new N(C.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ye(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vr=class{constructor(e){this._methodName=e}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new N(C.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new N(C.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return H(this._lat,e._lat)||H(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:At._jsonSchemaVersion}}static fromJSON(e){if(Ao(e,At._jsonSchema))return new At(e.latitude,e.longitude)}}At._jsonSchemaVersion="firestore/geoPoint/1.0",At._jsonSchema={type:xe("string",At._jsonSchemaVersion),latitude:xe("number"),longitude:xe("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zt{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:zt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Ao(e,zt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new zt(e.vectorValues);throw new N(C.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}zt._jsonSchemaVersion="firestore/vectorValue/1.0",zt._jsonSchema={type:xe("string",zt._jsonSchemaVersion),vectorValues:xe("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kk=/^__.*__$/;class Dk{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new cn(e,this.data,this.fieldMask,t,this.fieldTransforms):new $i(e,this.data,t,this.fieldTransforms)}}class Mw{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new cn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Fw(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw $(40011,{Ac:r})}}class xc{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Rc(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new xc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.gc(e),n}yc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.Rc(),n}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Ja(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(Fw(this.Ac)&&kk.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class xk{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||Vo(e)}Cc(e,t,n,i=!1){return new xc({Ac:e,methodName:t,Dc:n,path:ye.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Or(r){const e=r._freezeSettings(),t=Vo(r._databaseId);return new xk(r._databaseId,!!e.ignoreUndefinedProperties,t)}function Nc(r,e,t,n,i,s={}){const o=r.Cc(s.merge||s.mergeFields?2:0,e,t,i);cd("Data must be an object, but it was:",o,n);const c=Bw(n,o);let l,u;if(s.merge)l=new ut(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const f of s.mergeFields){const g=vu(e,f,t);if(!o.contains(g))throw new N(C.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);qw(d,g)||d.push(g)}l=new ut(d),u=o.fieldTransforms.filter(f=>l.covers(f.field))}else l=null,u=o.fieldTransforms;return new Dk(new $e(c),l,u)}class Fo extends Vr{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Fo}}function Lw(r,e,t){return new xc({Ac:3,Dc:e.settings.Dc,methodName:r._methodName,fc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class nd extends Vr{_toFieldTransform(e){return new Do(e.path,new Ti)}isEqual(e){return e instanceof nd}}class rd extends Vr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=Lw(this,e,!0),n=this.vc.map(s=>Mr(s,t)),i=new Ar(n);return new Do(e.path,i)}isEqual(e){return e instanceof rd&&Dn(this.vc,e.vc)}}class id extends Vr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=Lw(this,e,!0),n=this.vc.map(s=>Mr(s,t)),i=new Sr(n);return new Do(e.path,i)}isEqual(e){return e instanceof id&&Dn(this.vc,e.vc)}}class sd extends Vr{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new bi(e.serializer,h_(e.serializer,this.Fc));return new Do(e.path,t)}isEqual(e){return e instanceof sd&&this.Fc===e.Fc}}function od(r,e,t,n){const i=r.Cc(1,e,t);cd("Data must be an object, but it was:",i,n);const s=[],o=$e.empty();Wn(n,(l,u)=>{const d=ld(e,l,t);u=G(u);const f=i.yc(d);if(u instanceof Fo)s.push(d);else{const g=Mr(u,f);g!=null&&(s.push(d),o.set(d,g))}});const c=new ut(s);return new Mw(o,c,i.fieldTransforms)}function ad(r,e,t,n,i,s){const o=r.Cc(1,e,t),c=[vu(e,n,t)],l=[i];if(s.length%2!=0)throw new N(C.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(vu(e,s[g])),l.push(s[g+1]);const u=[],d=$e.empty();for(let g=c.length-1;g>=0;--g)if(!qw(u,c[g])){const _=c[g];let R=l[g];R=G(R);const k=o.yc(_);if(R instanceof Fo)u.push(_);else{const T=Mr(R,k);T!=null&&(u.push(_),d.set(_,T))}}const f=new ut(u);return new Mw(d,f,o.fieldTransforms)}function Uw(r,e,t,n=!1){return Mr(t,r.Cc(n?4:3,e))}function Mr(r,e){if($w(r=G(r)))return cd("Unsupported field value:",e,r),Bw(r,e);if(r instanceof Vr)return function(n,i){if(!Fw(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(n,i){const s=[];let o=0;for(const c of n){let l=Mr(c,i.wc(o));l==null&&(l={nullValue:"NULL_VALUE"}),s.push(l),o++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=G(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return h_(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=ie.fromDate(n);return{timestampValue:Ai(i.serializer,s)}}if(n instanceof ie){const s=new ie(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:Ai(i.serializer,s)}}if(n instanceof At)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof He)return{bytesValue:T_(i.serializer,n._byteString)};if(n instanceof le){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.Sc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Ph(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof zt)return function(o,c){return{mapValue:{fields:{[yh]:{stringValue:_h},[Ii]:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw c.Sc("VectorValues must only contain numeric values.");return vh(c.serializer,u)})}}}}}}(n,i);throw i.Sc(`Unsupported field value: ${gc(n)}`)}(r,e)}function Bw(r,e){const t={};return By(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Wn(r,(n,i)=>{const s=Mr(i,e.mc(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function $w(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof ie||r instanceof At||r instanceof He||r instanceof le||r instanceof Vr||r instanceof zt)}function cd(r,e,t){if(!$w(t)||!vy(t)){const n=gc(t);throw n==="an object"?e.Sc(r+" a custom object"):e.Sc(r+" "+n)}}function vu(r,e,t){if((e=G(e))instanceof qn)return e._internalPath;if(typeof e=="string")return ld(r,e);throw Ja("Field path arguments must be of type string or ",r,!1,void 0,t)}const Nk=new RegExp("[~\\*/\\[\\]]");function ld(r,e,t){if(e.search(Nk)>=0)throw Ja(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new qn(...e.split("."))._internalPath}catch{throw Ja(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ja(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(s||o)&&(l+=" (found",s&&(l+=` in field ${n}`),o&&(l+=` in document ${i}`),l+=")"),new N(C.INVALID_ARGUMENT,c+r+l)}function qw(r,e){return r.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uo{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new le(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Vk(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Vc("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class Vk extends uo{data(){return super.data()}}function Vc(r,e){return typeof e=="string"?ld(r,e):e instanceof qn?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zw(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new N(C.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ud{}class Lo extends ud{}function En(r,e,...t){let n=[];e instanceof ud&&n.push(e),n=n.concat(t),function(s){const o=s.filter(l=>l instanceof hd).length,c=s.filter(l=>l instanceof Oc).length;if(o>1||o>0&&c>0)throw new N(C.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class Oc extends Lo{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new Oc(e,t,n)}_apply(e){const t=this._parse(e);return jw(e._query,t),new it(e.firestore,e.converter,cu(e._query,t))}_parse(e){const t=Or(e.firestore);return function(s,o,c,l,u,d,f){let g;if(u.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new N(C.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){xg(f,d);const R=[];for(const k of f)R.push(Dg(l,s,k));g={arrayValue:{values:R}}}else g=Dg(l,s,f)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||xg(f,d),g=Uw(c,o,f,d==="in"||d==="not-in");return te.create(u,d,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function Ok(r,e,t){const n=e,i=Vc("where",r);return Oc._create(i,n,t)}class hd extends ud{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new hd(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:oe.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(i,s){let o=i;const c=s.getFlattenedFilters();for(const l of c)jw(o,l),o=cu(o,l)}(e._query,t),new it(e.firestore,e.converter,cu(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class dd extends Lo{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new dd(e,t)}_apply(e){const t=function(i,s,o){if(i.startAt!==null)throw new N(C.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new N(C.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new so(s,o)}(e._query,this._field,this._direction);return new it(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new on(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,t))}}function Mk(r,e="asc"){const t=e,n=Vc("orderBy",r);return dd._create(n,t)}class Mc extends Lo{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new Mc(e,t,n)}_apply(e){return new it(e.firestore,e.converter,$a(e._query,this._limit,this._limitType))}}function Fk(r){return Ty("limit",r),Mc._create("limit",r,"F")}function Lk(r){return Ty("limitToLast",r),Mc._create("limitToLast",r,"L")}class Fc extends Lo{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new Fc(e,t,n)}_apply(e){const t=Kw(e,this.type,this._docOrFields,this._inclusive);return new it(e.firestore,e.converter,function(i,s){return new on(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(e._query,t))}}function Uk(...r){return Fc._create("startAt",r,!0)}function Bk(...r){return Fc._create("startAfter",r,!1)}class Lc extends Lo{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new Lc(e,t,n)}_apply(e){const t=Kw(e,this.type,this._docOrFields,this._inclusive);return new it(e.firestore,e.converter,function(i,s){return new on(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(e._query,t))}}function $k(...r){return Lc._create("endBefore",r,!1)}function qk(...r){return Lc._create("endAt",r,!0)}function Kw(r,e,t,n){if(t[0]=G(t[0]),t[0]instanceof uo)return function(s,o,c,l,u){if(!l)throw new N(C.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const f of ci(s))if(f.field.isKeyField())d.push(Tr(o,l.key));else{const g=l.data.field(f.field);if(Ic(g))throw new N(C.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+f.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const _=f.field.canonicalString();throw new N(C.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${_}' (used as the orderBy) does not exist.`)}d.push(g)}return new Un(d,u)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const i=Or(r.firestore);return function(o,c,l,u,d,f){const g=o.explicitOrderBy;if(d.length>g.length)throw new N(C.INVALID_ARGUMENT,`Too many arguments provided to ${u}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const _=[];for(let R=0;R<d.length;R++){const k=d[R];if(g[R].field.isKeyField()){if(typeof k!="string")throw new N(C.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${u}(), but got a ${typeof k}`);if(!Ih(o)&&k.indexOf("/")!==-1)throw new N(C.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${u}() must be a plain document ID, but '${k}' contains a slash.`);const T=o.path.child(Z.fromString(k));if(!L.isDocumentKey(T))throw new N(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${u}() must result in a valid document path, but '${T}' is not because it contains an odd number of segments.`);const x=new L(T);_.push(Tr(c,x))}else{const T=Uw(l,u,k);_.push(T)}}return new Un(_,f)}(r._query,r.firestore._databaseId,i,e,t,n)}}function Dg(r,e,t){if(typeof(t=G(t))=="string"){if(t==="")throw new N(C.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Ih(e)&&t.indexOf("/")!==-1)throw new N(C.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(Z.fromString(t));if(!L.isDocumentKey(n))throw new N(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return Tr(r,new L(n))}if(t instanceof le)return Tr(r,t._key);throw new N(C.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${gc(t)}.`)}function xg(r,e){if(!Array.isArray(r)||r.length===0)throw new N(C.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function jw(r,e){const t=function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new N(C.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new N(C.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class fd{convertValue(e,t="none"){switch(Fn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return pe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(tn(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw $(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Wn(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var n,i,s;const t=(s=(i=(n=e.fields)==null?void 0:n[Ii].arrayValue)==null?void 0:i.values)==null?void 0:s.map(o=>pe(o.doubleValue));return new zt(t)}convertGeoPoint(e){return new At(pe(e.latitude),pe(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=Ec(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(no(e));default:return null}}convertTimestamp(e){const t=en(e);return new ie(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=Z.fromString(e);q(V_(n),9688,{name:e});const i=new Mn(n.get(1),n.get(3)),s=new L(n.popFirst(5));return i.isEqual(t)||Se(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Uc(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class zk extends fd{constructor(e){super(),this.firestore=e}convertBytes(e){return new He(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new le(this.firestore,null,t)}}class pr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}let It=class Gw extends uo{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new zs(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Vc("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(C.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=Gw._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}};It._jsonSchemaVersion="firestore/documentSnapshot/1.0",It._jsonSchema={type:xe("string",It._jsonSchemaVersion),bundleSource:xe("string","DocumentSnapshot"),bundleName:xe("string"),bundle:xe("string")};let zs=class extends It{data(e={}){return super.data(e)}},St=class Ww{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new pr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new zs(this._firestore,this._userDataWriter,n.key,n,new pr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new N(C.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(c=>{const l=new zs(i._firestore,i._userDataWriter,c.doc.key,c.doc,new pr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(c=>s||c.type!==3).map(c=>{const l=new zs(i._firestore,i._userDataWriter,c.doc.key,c.doc,new pr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let u=-1,d=-1;return c.type!==0&&(u=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:Kk(c.type),doc:l,oldIndex:u,newIndex:d}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(C.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Ww._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=lh.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach(s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}};function Kk(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return $(61501,{type:r})}}function Hw(r,e){return r instanceof It&&e instanceof It?r._firestore===e._firestore&&r._key.isEqual(e._key)&&(r._document===null?e._document===null:r._document.isEqual(e._document))&&r._converter===e._converter:r instanceof St&&e instanceof St&&r._firestore===e._firestore&&Nw(r.query,e.query)&&r.metadata.isEqual(e.metadata)&&r._snapshot.isEqual(e._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jk(r){r=re(r,le);const e=re(r.firestore,Pe);return Aw(Ye(e),r._key).then(t=>pd(e,r,t))}St._jsonSchemaVersion="firestore/querySnapshot/1.0",St._jsonSchema={type:xe("string",St._jsonSchemaVersion),bundleSource:xe("string","QuerySnapshot"),bundleName:xe("string"),bundle:xe("string")};class Fr extends fd{constructor(e){super(),this.firestore=e}convertBytes(e){return new He(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new le(this.firestore,null,t)}}function Gk(r){r=re(r,le);const e=re(r.firestore,Pe),t=Ye(e),n=new Fr(e);return fk(t,r._key).then(i=>new It(e,n,r._key,i,new pr(i!==null&&i.hasLocalMutations,!0),r.converter))}function Wk(r){r=re(r,le);const e=re(r.firestore,Pe);return Aw(Ye(e),r._key,{source:"server"}).then(t=>pd(e,r,t))}function Hk(r){r=re(r,it);const e=re(r.firestore,Pe),t=Ye(e),n=new Fr(e);return zw(r._query),Sw(t,r._query).then(i=>new St(e,n,r,i))}function Qk(r){r=re(r,it);const e=re(r.firestore,Pe),t=Ye(e),n=new Fr(e);return pk(t,r._query).then(i=>new St(e,n,r,i))}function Yk(r){r=re(r,it);const e=re(r.firestore,Pe),t=Ye(e),n=new Fr(e);return Sw(t,r._query,{source:"server"}).then(i=>new St(e,n,r,i))}function Ng(r,e,t){r=re(r,le);const n=re(r.firestore,Pe),i=Uc(r.converter,e,t);return Uo(n,[Nc(Or(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,_e.none())])}function Vg(r,e,t,...n){r=re(r,le);const i=re(r.firestore,Pe),s=Or(i);let o;return o=typeof(e=G(e))=="string"||e instanceof qn?ad(s,"updateDoc",r._key,e,t,n):od(s,"updateDoc",r._key,e),Uo(i,[o.toMutation(r._key,_e.exists(!0))])}function Jk(r){return Uo(re(r.firestore,Pe),[new qi(r._key,_e.none())])}function Xk(r,e){const t=re(r.firestore,Pe),n=Ya(r),i=Uc(r.converter,e);return Uo(t,[Nc(Or(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,_e.exists(!1))]).then(()=>n)}function Qw(r,...e){var l,u,d;r=G(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||Eu(e[n])||(t=e[n++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Eu(e[n])){const f=e[n];e[n]=(l=f.next)==null?void 0:l.bind(f),e[n+1]=(u=f.error)==null?void 0:u.bind(f),e[n+2]=(d=f.complete)==null?void 0:d.bind(f)}let s,o,c;if(r instanceof le)o=re(r.firestore,Pe),c=Bi(r._key.path),s={next:f=>{e[n]&&e[n](pd(o,r,f))},error:e[n+1],complete:e[n+2]};else{const f=re(r,it);o=re(f.firestore,Pe),c=f._query;const g=new Fr(o);s={next:_=>{e[n]&&e[n](new St(o,g,f,_))},error:e[n+1],complete:e[n+2]},zw(r._query)}return function(g,_,R,k){const T=new kc(k),x=new Wh(_,T,R);return g.asyncQueue.enqueueAndForget(async()=>Kh(await Di(g),x)),()=>{T.Nu(),g.asyncQueue.enqueueAndForget(async()=>jh(await Di(g),x))}}(Ye(o),c,i,s)}function Zk(r,e){return gk(Ye(r=re(r,Pe)),Eu(e)?e:{next:e})}function Uo(r,e){return function(n,i){const s=new ze;return n.asyncQueue.enqueueAndForget(async()=>qC(await td(n),i,s)),s.promise}(Ye(r),e)}function pd(r,e,t){const n=t.docs.get(e._key),i=new Fr(r);return new It(r,i,e._key,n,new pr(t.hasPendingWrites,t.fromCache),e.converter)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const e0={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let t0=class{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Or(e)}set(e,t,n){this._verifyNotCommitted();const i=An(e,this._firestore),s=Uc(i.converter,t,n),o=Nc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,_e.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=An(e,this._firestore);let o;return o=typeof(t=G(t))=="string"||t instanceof qn?ad(this._dataReader,"WriteBatch.update",s._key,t,n,i):od(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,_e.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=An(e,this._firestore);return this._mutations=this._mutations.concat(new qi(t._key,_e.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new N(C.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}};function An(r,e){if((r=G(r)).firestore!==e)throw new N(C.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class n0{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Or(e)}get(e){const t=An(e,this._firestore),n=new zk(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return $(24041);const s=i[0];if(s.isFoundDocument())return new uo(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new uo(this._firestore,n,t._key,null,t.converter);throw $(18433,{doc:s})})}set(e,t,n){const i=An(e,this._firestore),s=Uc(i.converter,t,n),o=Nc(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=An(e,this._firestore);let o;return o=typeof(t=G(t))=="string"||t instanceof qn?ad(this._dataReader,"Transaction.update",s._key,t,n,i):od(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=An(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let r0=class extends n0{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=An(e,this._firestore),n=new Fr(this._firestore);return super.get(e).then(i=>new It(this._firestore,n,t._key,i._document,new pr(!1,!1),t.converter))}};function i0(r,e,t){r=re(r,Pe);const n={...e0,...t};return function(s){if(s.maxAttempts<1)throw new N(C.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(s,o,c){const l=new ze;return s.asyncQueue.enqueueAndForget(async()=>{const u=await uk(s);new ck(s.asyncQueue,u,c,o,l).ju()}),l.promise}(Ye(r),i=>e(new r0(r,i)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function s0(){return new Fo("deleteField")}function o0(){return new nd("serverTimestamp")}function a0(...r){return new rd("arrayUnion",r)}function c0(...r){return new id("arrayRemove",r)}function l0(r){return new sd("increment",r)}(function(e,t=!0){(function(i){Ui=i})(zn),Vn(new Kt("firestore",(n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new Pe(new nR(n.getProvider("auth-internal")),new sR(o,n.getProvider("app-check-internal")),function(u,d){if(!Object.prototype.hasOwnProperty.apply(u.options,["projectId"]))throw new N(C.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Mn(u.options.projectId,d)}(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c},"PUBLIC").setMultipleInstances(!0)),bt(up,hp,e),bt(up,hp,"esm2020")})();const u0="@firebase/firestore-compat",h0="0.4.3";/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gd(r,e){if(e===void 0)return{merge:!1};if(e.mergeFields!==void 0&&e.merge!==void 0)throw new N("invalid-argument",`Invalid options passed to function ${r}(): You cannot specify both "merge" and "mergeFields".`);return e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Og(){if(typeof Uint8Array>"u")throw new N("unimplemented","Uint8Arrays are not available in this environment.")}function Mg(){if(!BR())throw new N("unimplemented","Blobs are unavailable in Firestore in this environment.")}let Yw=class Tu{constructor(e){this._delegate=e}static fromBase64String(e){return Mg(),new Tu(He.fromBase64String(e))}static fromUint8Array(e){return Og(),new Tu(He.fromUint8Array(e))}toBase64(){return Mg(),this._delegate.toBase64()}toUint8Array(){return Og(),this._delegate.toUint8Array()}isEqual(e){return this._delegate.isEqual(e._delegate)}toString(){return"Blob(base64: "+this.toBase64()+")"}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bu(r){return d0(r,["next","error","complete"])}function d0(r,e){if(typeof r!="object"||r===null)return!1;const t=r;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class f0{enableIndexedDbPersistence(e,t){return vk(e._delegate,{forceOwnership:t})}enableMultiTabIndexedDbPersistence(e){return Tk(e._delegate)}clearIndexedDbPersistence(e){return bk(e._delegate)}}class Jw{constructor(e,t,n){this._delegate=t,this._persistenceProvider=n,this.INTERNAL={delete:()=>this.terminate()},e instanceof Mn||(this._appCompat=e)}get _databaseId(){return this._delegate._databaseId}settings(e){const t=this._delegate._getSettings();!e.merge&&t.host!==e.host&&Gt("You are overriding the original host. If you did not intend to override your settings, use {merge: true}."),e.merge&&(e={...t,...e},delete e.merge),this._delegate._setSettings(e)}useEmulator(e,t,n={}){_k(this._delegate,e,t,n)}enableNetwork(){return Sk(this._delegate)}disableNetwork(){return Rk(this._delegate)}enablePersistence(e){let t=!1,n=!1;return e&&(t=!!e.synchronizeTabs,n=!!e.experimentalForceOwningTab,Ey("synchronizeTabs",t,"experimentalForceOwningTab",n)),t?this._persistenceProvider.enableMultiTabIndexedDbPersistence(this):this._persistenceProvider.enableIndexedDbPersistence(this,n)}clearPersistence(){return this._persistenceProvider.clearIndexedDbPersistence(this)}terminate(){return this._appCompat&&(this._appCompat._removeServiceInstance("firestore-compat"),this._appCompat._removeServiceInstance("firestore")),this._delegate._delete()}waitForPendingWrites(){return Ak(this._delegate)}onSnapshotsInSync(e){return Zk(this._delegate,e)}get app(){if(!this._appCompat)throw new N("failed-precondition","Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._appCompat}collection(e){try{return new xi(this,Dw(this._delegate,e))}catch(t){throw et(t,"collection()","Firestore.collection()")}}doc(e){try{return new wt(this,Ya(this._delegate,e))}catch(t){throw et(t,"doc()","Firestore.doc()")}}collectionGroup(e){try{return new Ze(this,wk(this._delegate,e))}catch(t){throw et(t,"collectionGroup()","Firestore.collectionGroup()")}}runTransaction(e){return i0(this._delegate,t=>e(new Xw(this,t)))}batch(){return Ye(this._delegate),new Zw(new t0(this._delegate,e=>Uo(this._delegate,e)))}loadBundle(e){return Pk(this._delegate,e)}namedQuery(e){return Ck(this._delegate,e).then(t=>t?new Ze(this,t):null)}}class Bc extends fd{constructor(e){super(),this.firestore=e}convertBytes(e){return new Yw(new He(e))}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return wt.forKey(t,this.firestore,null)}}function p0(r){XS(r)}class Xw{constructor(e,t){this._firestore=e,this._delegate=t,this._userDataWriter=new Bc(e)}get(e){const t=gr(e);return this._delegate.get(t).then(n=>new ho(this._firestore,new It(this._firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,t.converter)))}set(e,t,n){const i=gr(e);return n?(gd("Transaction.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=gr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=gr(e);return this._delegate.delete(t),this}}class Zw{constructor(e){this._delegate=e}set(e,t,n){const i=gr(e);return n?(gd("WriteBatch.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=gr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=gr(e);return this._delegate.delete(t),this}commit(){return this._delegate.commit()}}class Dr{constructor(e,t,n){this._firestore=e,this._userDataWriter=t,this._delegate=n}fromFirestore(e,t){const n=new zs(this._firestore._delegate,this._userDataWriter,e._key,e._document,e.metadata,null);return this._delegate.fromFirestore(new fo(this._firestore,n),t??{})}toFirestore(e,t){return t?this._delegate.toFirestore(e,t):this._delegate.toFirestore(e)}static getInstance(e,t){const n=Dr.INSTANCES;let i=n.get(e);i||(i=new WeakMap,n.set(e,i));let s=i.get(t);return s||(s=new Dr(e,new Bc(e),t),i.set(t,s)),s}}Dr.INSTANCES=new WeakMap;class wt{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Bc(e)}static forPath(e,t,n){if(e.length%2!==0)throw new N("invalid-argument",`Invalid document reference. Document references must have an even number of segments, but ${e.canonicalString()} has ${e.length}`);return new wt(t,new le(t._delegate,n,new L(e)))}static forKey(e,t,n){return new wt(t,new le(t._delegate,n,e))}get id(){return this._delegate.id}get parent(){return new xi(this.firestore,this._delegate.parent)}get path(){return this._delegate.path}collection(e){try{return new xi(this.firestore,Dw(this._delegate,e))}catch(t){throw et(t,"collection()","DocumentReference.collection()")}}isEqual(e){return e=G(e),e instanceof le?xw(this._delegate,e):!1}set(e,t){t=gd("DocumentReference.set",t);try{return t?Ng(this._delegate,e,t):Ng(this._delegate,e)}catch(n){throw et(n,"setDoc()","DocumentReference.set()")}}update(e,t,...n){try{return arguments.length===1?Vg(this._delegate,e):Vg(this._delegate,e,t,...n)}catch(i){throw et(i,"updateDoc()","DocumentReference.update()")}}delete(){return Jk(this._delegate)}onSnapshot(...e){const t=eI(e),n=tI(e,i=>new ho(this.firestore,new It(this.firestore._delegate,this._userDataWriter,i._key,i._document,i.metadata,this._delegate.converter)));return Qw(this._delegate,t,n)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=Gk(this._delegate):(e==null?void 0:e.source)==="server"?t=Wk(this._delegate):t=jk(this._delegate),t.then(n=>new ho(this.firestore,new It(this.firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,this._delegate.converter)))}withConverter(e){return new wt(this.firestore,e?this._delegate.withConverter(Dr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function et(r,e,t){return r.message=r.message.replace(e,t),r}function eI(r){for(const e of r)if(typeof e=="object"&&!bu(e))return e;return{}}function tI(r,e){var n,i;let t;return bu(r[0])?t=r[0]:bu(r[1])?t=r[1]:typeof r[0]=="function"?t={next:r[0],error:r[1],complete:r[2]}:t={next:r[1],error:r[2],complete:r[3]},{next:s=>{t.next&&t.next(e(s))},error:(n=t.error)==null?void 0:n.bind(t),complete:(i=t.complete)==null?void 0:i.bind(t)}}class ho{constructor(e,t){this._firestore=e,this._delegate=t}get ref(){return new wt(this._firestore,this._delegate.ref)}get id(){return this._delegate.id}get metadata(){return this._delegate.metadata}get exists(){return this._delegate.exists()}data(e){return this._delegate.data(e)}get(e,t){return this._delegate.get(e,t)}isEqual(e){return Hw(this._delegate,e._delegate)}}class fo extends ho{data(e){const t=this._delegate.data(e);return this._delegate._converter||ZS(t!==void 0,"Document in a QueryDocumentSnapshot should exist"),t}}class Ze{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Bc(e)}where(e,t,n){try{return new Ze(this.firestore,En(this._delegate,Ok(e,t,n)))}catch(i){throw et(i,/(orderBy|where)\(\)/,"Query.$1()")}}orderBy(e,t){try{return new Ze(this.firestore,En(this._delegate,Mk(e,t)))}catch(n){throw et(n,/(orderBy|where)\(\)/,"Query.$1()")}}limit(e){try{return new Ze(this.firestore,En(this._delegate,Fk(e)))}catch(t){throw et(t,"limit()","Query.limit()")}}limitToLast(e){try{return new Ze(this.firestore,En(this._delegate,Lk(e)))}catch(t){throw et(t,"limitToLast()","Query.limitToLast()")}}startAt(...e){try{return new Ze(this.firestore,En(this._delegate,Uk(...e)))}catch(t){throw et(t,"startAt()","Query.startAt()")}}startAfter(...e){try{return new Ze(this.firestore,En(this._delegate,Bk(...e)))}catch(t){throw et(t,"startAfter()","Query.startAfter()")}}endBefore(...e){try{return new Ze(this.firestore,En(this._delegate,$k(...e)))}catch(t){throw et(t,"endBefore()","Query.endBefore()")}}endAt(...e){try{return new Ze(this.firestore,En(this._delegate,qk(...e)))}catch(t){throw et(t,"endAt()","Query.endAt()")}}isEqual(e){return Nw(this._delegate,e._delegate)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=Qk(this._delegate):(e==null?void 0:e.source)==="server"?t=Yk(this._delegate):t=Hk(this._delegate),t.then(n=>new Au(this.firestore,new St(this.firestore._delegate,this._userDataWriter,this._delegate,n._snapshot)))}onSnapshot(...e){const t=eI(e),n=tI(e,i=>new Au(this.firestore,new St(this.firestore._delegate,this._userDataWriter,this._delegate,i._snapshot)));return Qw(this._delegate,t,n)}withConverter(e){return new Ze(this.firestore,e?this._delegate.withConverter(Dr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}class g0{constructor(e,t){this._firestore=e,this._delegate=t}get type(){return this._delegate.type}get doc(){return new fo(this._firestore,this._delegate.doc)}get oldIndex(){return this._delegate.oldIndex}get newIndex(){return this._delegate.newIndex}}class Au{constructor(e,t){this._firestore=e,this._delegate=t}get query(){return new Ze(this._firestore,this._delegate.query)}get metadata(){return this._delegate.metadata}get size(){return this._delegate.size}get empty(){return this._delegate.empty}get docs(){return this._delegate.docs.map(e=>new fo(this._firestore,e))}docChanges(e){return this._delegate.docChanges(e).map(t=>new g0(this._firestore,t))}forEach(e,t){this._delegate.forEach(n=>{e.call(t,new fo(this._firestore,n))})}isEqual(e){return Hw(this._delegate,e._delegate)}}class xi extends Ze{constructor(e,t){super(e,t),this.firestore=e,this._delegate=t}get id(){return this._delegate.id}get path(){return this._delegate.path}get parent(){const e=this._delegate.parent;return e?new wt(this.firestore,e):null}doc(e){try{return e===void 0?new wt(this.firestore,Ya(this._delegate)):new wt(this.firestore,Ya(this._delegate,e))}catch(t){throw et(t,"doc()","CollectionReference.doc()")}}add(e){return Xk(this._delegate,e).then(t=>new wt(this.firestore,t))}isEqual(e){return xw(this._delegate,e._delegate)}withConverter(e){return new xi(this.firestore,e?this._delegate.withConverter(Dr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function gr(r){return re(r,le)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class md{constructor(...e){this._delegate=new qn(...e)}static documentId(){return new md(ye.keyField().canonicalString())}isEqual(e){return e=G(e),e instanceof qn?this._delegate._internalPath.isEqual(e._internalPath):!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hr{static serverTimestamp(){const e=o0();return e._methodName="FieldValue.serverTimestamp",new hr(e)}static delete(){const e=s0();return e._methodName="FieldValue.delete",new hr(e)}static arrayUnion(...e){const t=a0(...e);return t._methodName="FieldValue.arrayUnion",new hr(t)}static arrayRemove(...e){const t=c0(...e);return t._methodName="FieldValue.arrayRemove",new hr(t)}static increment(e){const t=l0(e);return t._methodName="FieldValue.increment",new hr(t)}constructor(e){this._delegate=e}isEqual(e){return this._delegate.isEqual(e._delegate)}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const m0={Firestore:Jw,GeoPoint:At,Timestamp:ie,Blob:Yw,Transaction:Xw,WriteBatch:Zw,DocumentReference:wt,DocumentSnapshot:ho,Query:Ze,QueryDocumentSnapshot:fo,QuerySnapshot:Au,CollectionReference:xi,FieldPath:md,FieldValue:hr,setLogLevel:p0,CACHE_SIZE_UNLIMITED:Ek};function y0(r,e){r.INTERNAL.registerComponent(new Kt("firestore-compat",t=>{const n=t.getProvider("app-compat").getImmediate(),i=t.getProvider("firestore").getImmediate();return e(n,i)},"PUBLIC").setServiceProps({...m0}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _0(r){y0(r,(e,t)=>new Jw(e,t,new f0)),r.registerVersion(u0,h0)}_0(De);var w0={};const I0=(()=>{var r;if(typeof process<"u"&&w0)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),se=(...r)=>{var e,t;I0&&(((e=window.logger)==null?void 0:e.info)||((t=window.logger)==null?void 0:t.debug)||console.log)("[Firebase]",...r)};let xt=null,wr=null,po=!1,yd=!1,Xa=!1,_t=null;const _d="firebase_config",nI={encode:r=>{try{return btoa(encodeURIComponent(r))}catch{return r}},decode:r=>{try{return decodeURIComponent(atob(r))}catch{return r}}};async function E0(){var r,e,t,n,i;if(!((r=window.electronAPI)!=null&&r.isElectron))return se("웹 환경 - 인증 파일 사용 불가"),null;try{if(!((e=window.electronAPI)!=null&&e.readAuthFile))return se("readAuthFile API 없음"),null;const s=await window.electronAPI.readAuthFile();if(se("readAuthFile 결과:",{success:s.success,exists:s.exists,hasContent:!!s.content,contentLength:((t=s.content)==null?void 0:t.length)||0}),!s.success||!s.content)return se("인증 파일 없음 - 로컬 모드로 동작 (success:",s.success,", exists:",s.exists,", content:",!!s.content,")"),null;const o=JSON.parse(s.content);return o.apiKey&&o.projectId?(se("인증 파일에서 Firebase 설정 로드됨"),o):(se("인증 파일에 필수 설정 없음"),null)}catch(s){return(((n=window.logger)==null?void 0:n.error)||((i=window.logger)==null?void 0:i.error)||console.error)("[Firebase] 인증 파일 로드 실패:",s),null}}function v0(){var r,e;try{const t=localStorage.getItem(_d);if(t){let n;if(t.startsWith("eyJ"))try{n=JSON.parse(nI.decode(t))}catch{n=JSON.parse(t)}else n=JSON.parse(t);if(n.apiKey&&n.projectId)return n}}catch(t){(((r=window.logger)==null?void 0:r.error)||((e=window.logger)==null?void 0:e.error)||console.error)("Firebase 설정 로드 실패:",t)}return null}async function T0(){const r=await E0();if(r)return r;const e=v0();return e?(se("localStorage에서 설정 로드됨"),e):(se("Firebase 설정 없음 - 로컬 모드로 동작"),null)}function rI(r){return r?!!(r.apiKey&&r.apiKey.trim()!==""&&r.projectId&&r.projectId.trim()!==""):!1}async function iI(){var r,e,t,n,i,s,o,c,l,u,d,f,g,_,R,k,T,x,M,F,K,W,j,E,y;if(se("초기화 시작..."),po&&xt)return se("이미 초기화됨"),!0;if(!navigator.onLine)return se("오프라인 상태 - 로컬 모드로 동작"),(((r=window.logger)==null?void 0:r.info)||((e=window.logger)==null?void 0:e.info)||console.info)("[Firebase] 인터넷 연결 없음. 로컬 모드로 동작합니다."),!1;if(typeof window.NetworkAccess<"u"){let v=await window.NetworkAccess.checkAccess();if(se("네트워크 접근 체크:",v),!v.allowed&&v.needsSetup&&se("네트워크 접근 거부: 게이트웨이 미설정"),!v.allowed)return se("네트워크 접근 거부:",v.reason),(((t=window.logger)==null?void 0:t.warn)||((n=window.logger)==null?void 0:n.warn)||console.warn)("[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다."),!1}if(typeof De>"u")return(((i=window.logger)==null?void 0:i.error)||((s=window.logger)==null?void 0:s.error)||console.error)("[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요."),!1;if(_t=await T0(),se("로드된 설정:",_t?"있음":"없음"),!_t)return se("설정이 없습니다. 로컬 모드로 동작합니다."),!1;if(se("설정값 확인:",{apiKey:_t.apiKey?_t.apiKey.substring(0,10)+"...":"없음",projectId:_t.projectId||"없음",authDomain:_t.authDomain||"없음"}),!rI(_t))return se("설정이 유효하지 않습니다."),!1;try{se("앱 초기화 중..."),De.apps.length||(De.initializeApp(_t),De.firestore&&typeof De.firestore.setLogLevel=="function"&&De.firestore.setLogLevel("error")),xt=De.firestore(),se("Firestore 연결됨");try{wr=De.auth();const w=await wr.signInAnonymously();Xa=!0,se("익명 인증 성공:",(o=w.user)==null?void 0:o.uid)}catch(w){(((c=window.logger)==null?void 0:c.error)||((l=window.logger)==null?void 0:l.error)||console.error)("[Firebase] 익명 인증 실패:",w),Xa=!1;const v=w.code||"";if(v==="auth/operation-not-allowed")return(((u=window.logger)==null?void 0:u.error)||((d=window.logger)==null?void 0:d.error)||console.error)("[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요."),!1;v==="auth/network-request-failed"?(((f=window.logger)==null?void 0:f.warn)||((g=window.logger)==null?void 0:g.warn)||console.warn)("[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다."):(((_=window.logger)==null?void 0:_.warn)||((R=window.logger)==null?void 0:R.warn)||console.warn)("[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)")}try{await xt.enablePersistence({synchronizeTabs:!0}),yd=!0,se("오프라인 지원 활성화됨 (멀티탭 동기화)")}catch(w){const v=w;(((k=window.logger)==null?void 0:k.warn)||((T=window.logger)==null?void 0:T.warn)||console.warn)("[Firebase] 오프라인 지원 에러:",v.code,v.message),v.code==="failed-precondition"?(((x=window.logger)==null?void 0:x.warn)||((M=window.logger)==null?void 0:M.warn)||console.warn)("[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다."):v.code==="unimplemented"&&(((F=window.logger)==null?void 0:F.warn)||((K=window.logger)==null?void 0:K.warn)||console.warn)("[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.")}return po=!0,se("초기화 완료:",_t.projectId),window.addEventListener("offline",()=>{se("네트워크 끊김 감지 - Firestore 네트워크 비활성화"),xt&&xt.disableNetwork().catch(()=>{})}),window.addEventListener("online",()=>{se("네트워크 복구 감지 - Firestore 네트워크 활성화"),xt&&xt.enableNetwork().catch(()=>{})}),!0}catch(w){return(((W=window.logger)==null?void 0:W.error)||((j=window.logger)==null?void 0:j.error)||console.error)("[Firebase] 초기화 실패:",w),(((E=window.logger)==null?void 0:E.error)||((y=window.logger)==null?void 0:y.error)||console.error)("[Firebase] 에러 상세:",w.message,w.stack),!1}}function b0(){return xt}function A0(){return po}function S0(){return yd}function R0(){var r;return((r=wr==null?void 0:wr.currentUser)==null?void 0:r.uid)||null}function P0(r){var e,t;try{const n=nI.encode(JSON.stringify(r));localStorage.setItem(_d,n),se("설정 저장됨 (난독화)")}catch(n){(((e=window.logger)==null?void 0:e.error)||((t=window.logger)==null?void 0:t.error)||console.error)("Firebase 설정 저장 실패:",n)}}function C0(){localStorage.removeItem(_d),po=!1,Xa=!1,xt=null,wr=null,_t=null,se("설정 초기화됨")}async function k0(){var r,e;if(se("재초기화 시작..."),po=!1,Xa=!1,yd=!1,xt=null,wr=null,_t=null,typeof De<"u"&&De.apps.length>0)try{await De.app().delete(),se("기존 Firebase 앱 삭제됨")}catch(t){(((r=window.logger)==null?void 0:r.warn)||((e=window.logger)==null?void 0:e.warn)||console.warn)("[Firebase] 앱 삭제 실패:",t)}return await iI()}window.firebaseConfig={initialize:iI,reinitialize:k0,getDb:b0,isEnabled:A0,isOfflineSupported:S0,getCurrentUserId:R0,isConfigValid:rI,saveConfig:P0,resetConfig:C0};class sI{constructor(){ls(this,"lastCheckTime",null);ls(this,"checkInterval",null);ls(this,"reconnectAttempts",0);ls(this,"maxReconnectAttempts",3)}async diagnose(){const e={timestamp:new Date().toISOString(),checks:{},overallStatus:"unknown",recommendations:[]};return e.checks.configLoaded=this.checkConfigLoaded(),e.checks.initialized=this.checkInitialized(),e.checks.authenticated=await this.checkAuthentication(),e.checks.networkOnline=this.checkNetworkStatus(),e.checks.initialized.passed&&(e.checks.firestoreConnection=await this.checkFirestoreConnection()),e.checks.offlineQueue=this.checkOfflineQueue(),e.checks.collectionNames=this.checkCollectionNames(),e.overallStatus=this.determineOverallStatus(e.checks),e.recommendations=this.generateRecommendations(e.checks),this.lastCheckTime=Date.now(),e}checkConfigLoaded(){var t;const e=!!(window.firebaseConfig&&typeof window.firebaseConfig.getDb=="function");return{passed:e,message:e?"Firebase 설정이 로드되었습니다.":"Firebase 설정을 찾을 수 없습니다.",details:{configExists:!!window.firebaseConfig,isEnabled:((t=window.firebaseConfig)==null?void 0:t.isEnabled())||!1}}}checkInitialized(){var n;const e=(n=window.firebaseConfig)==null?void 0:n.getDb(),t=!!e;return{passed:t,message:t?"Firebase가 초기화되었습니다.":"Firebase가 초기화되지 않았습니다.",details:{hasDb:!!e}}}async checkAuthentication(){var e,t;try{const n=(t=(e=window.firebaseConfig)==null?void 0:e.getAuth)==null?void 0:t.call(e);if(!n)return{passed:!1,message:"인증 객체를 찾을 수 없습니다.",details:{authExists:!1}};const i=n.currentUser,s=!!i;return{passed:!0,message:s?"인증되었습니다.":"익명 모드입니다.",details:{authenticated:s,userId:(i==null?void 0:i.uid)||null}}}catch(n){return{passed:!1,message:`인증 확인 실패: ${n.message}`,details:{error:n.message}}}}checkNetworkStatus(){var n;const e=navigator.onLine,t=window.networkStatus;return{passed:e,message:e?"온라인 상태입니다.":"오프라인 상태입니다.",details:{navigatorOnline:e,networkStatusOnline:t==null?void 0:t.isOnline,queueSize:((n=t==null?void 0:t.offlineQueue)==null?void 0:n.length)||0}}}async checkFirestoreConnection(){var e;try{const t=(e=window.firebaseConfig)==null?void 0:e.getDb();if(!t)return{passed:!1,message:"Firestore DB를 찾을 수 없습니다.",details:{}};const n=t.collection("_connection_test").limit(1).get(),i=new Promise((s,o)=>setTimeout(()=>o(new Error("Timeout")),5e3));return await Promise.race([n,i]),{passed:!0,message:"Firestore 연결이 정상입니다.",details:{connectionTest:"success"}}}catch(t){return{passed:!1,message:`Firestore 연결 실패: ${t.message}`,details:{error:t.message,code:t.code}}}}checkOfflineQueue(){var n,i;const e=window.networkStatus,t=((n=e==null?void 0:e.offlineQueue)==null?void 0:n.length)||0;return{passed:!0,message:t>0?`오프라인 큐에 ${t}개 작업이 대기 중입니다.`:"오프라인 큐가 비어있습니다.",details:{queueSize:t,queueItems:((i=e==null?void 0:e.getQueueStatus)==null?void 0:i.call(e))||null}}}checkCollectionNames(){const e=["soil","water","compost","heavyMetal","pesticide"],t=new Date().getFullYear(),n={};if(window.firestoreDb&&typeof window.firestoreDb.getCollectionName=="function")e.forEach(s=>{const o=window.firestoreDb.getCollectionName(s,t),c="test_";n[s]={actual:o,hasPrefix:o.startsWith(c),year:t}});else return{passed:!1,message:"firestoreDb 모듈을 찾을 수 없습니다.",details:{error:"Module not loaded"}};const i=Object.values(n).every(s=>s.hasPrefix);return{passed:i,message:i?"모든 컬렉션 이름이 올바릅니다.":"일부 컬렉션 이름에 test_ 접두사가 없습니다.",details:n}}determineOverallStatus(e){var i;return["configLoaded","initialized"].some(s=>{var o;return!((o=e[s])!=null&&o.passed)})?"error":(i=e.networkOnline)!=null&&i.passed?e.firestoreConnection&&!e.firestoreConnection.passed?"degraded":"healthy":"offline"}generateRecommendations(e){var i,s,o,c,l;const t=[];(i=e.configLoaded)!=null&&i.passed||t.push({priority:"critical",message:"Firebase 설정 파일(firebase-auth.json)을 확인하세요.",action:"checkAuthFile"}),(s=e.initialized)!=null&&s.passed||t.push({priority:"critical",message:"Firebase 초기화 코드를 확인하세요.",action:"reinitialize"}),(o=e.networkOnline)!=null&&o.passed||t.push({priority:"warning",message:"인터넷 연결을 확인하세요. 오프라인 모드로 작동 중입니다.",action:"checkNetwork"}),e.firestoreConnection&&!e.firestoreConnection.passed&&t.push({priority:"warning",message:"Firestore 연결을 재시도하세요.",action:"reconnect"});const n=(l=(c=e.offlineQueue)==null?void 0:c.details)==null?void 0:l.queueSize;return n&&n>0&&t.push({priority:"info",message:`${n}개의 작업이 동기화 대기 중입니다.`,action:"processQueue"}),t}async attemptAutoRecovery(){var t,n,i,s,o,c,l;(((t=window.logger)==null?void 0:t.debug)||console.log)("[Firebase Diagnostics] 자동 복구 시작...");const e=await this.diagnose();if(e.overallStatus==="healthy")return(((n=window.logger)==null?void 0:n.debug)||console.log)("[Firebase Diagnostics] 연결 상태 정상"),{success:!0,message:"연결 정상"};if(e.overallStatus==="offline")return(((i=window.logger)==null?void 0:i.debug)||console.log)("[Firebase Diagnostics] 오프라인 상태 - 큐 사용 중"),{success:!1,message:"오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다.",canRetry:!0};if(!((s=e.checks.initialized)!=null&&s.passed))try{if((((o=window.logger)==null?void 0:o.debug)||console.log)("[Firebase Diagnostics] Firebase 재초기화 시도..."),(c=window.firebaseConfig)!=null&&c.initialize)return await window.firebaseConfig.initialize(),{success:!0,message:"Firebase 재초기화 성공"}}catch(u){(((l=window.logger)==null?void 0:l.error)||console.error)("[Firebase Diagnostics] 재초기화 실패:",u)}return{success:!1,message:"자동 복구 실패. 수동 확인이 필요합니다.",diagnosis:e}}startHealthCheck(e=6e4){this.checkInterval&&clearInterval(this.checkInterval),this.checkInterval=window.setInterval(async()=>{var n;const t=await this.diagnose();t.overallStatus!=="healthy"&&((((n=window.logger)==null?void 0:n.warn)||console.warn)("[Firebase Diagnostics] 연결 문제 감지:",t),typeof window.showToast=="function"&&window.showToast("Firebase 연결 문제가 감지되었습니다.","warning",{actionLabel:"진단",action:()=>this.showDiagnosticsUI()}))},e)}stopHealthCheck(){this.checkInterval&&(clearInterval(this.checkInterval),this.checkInterval=null)}showDiagnosticsUI(){this.diagnose().then(e=>{var t,n,i;if(console.group("🔍 Firebase 진단 결과"),(((t=window.logger)==null?void 0:t.debug)||console.log)("전체 상태:",e.overallStatus),(((n=window.logger)==null?void 0:n.debug)||console.log)("검사 항목:",e.checks),(((i=window.logger)==null?void 0:i.debug)||console.log)("권장 사항:",e.recommendations),console.groupEnd(),typeof window.showToast=="function"){const s={healthy:"Firebase 연결 정상",offline:"오프라인 모드 (큐 사용 중)",degraded:"Firebase 연결 불안정",error:"Firebase 설정 오류",unknown:"Firebase 상태 불명"};window.showToast(s[e.overallStatus],e.overallStatus==="healthy"?"success":"warning")}})}}window.firebaseDiagnostics=new sI;typeof Aa<"u"&&Aa.exports&&(Aa.exports=sI);const $c=["name","phone","address","birthDate","corpNumber","parcels","phoneNumber","farmAddress"],D0="2.0",x0="AES-GCM",N0=256,V0=12,O0=16,oI=6e5,M0="SHA-256",Za=10;function go(r){const e=new Uint8Array(r);let t="";for(let n=0;n<e.byteLength;n++)t+=String.fromCharCode(e[n]);return btoa(t)}function Su(r){const e=atob(r),t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t.buffer}function aI(r){return new TextEncoder().encode(r)}async function F0(r,e){const t=aI(e),n=await crypto.subtle.digest("SHA-256",t),i=go(n);return r+i}async function L0(r,e,t=!1){const n=await crypto.subtle.importKey("raw",aI(r),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:oI,hash:M0},n,{name:x0,length:N0},t,["encrypt","decrypt"])}async function U0(r,e,t,n=!1){t||(t=crypto.getRandomValues(new Uint8Array(O0)).buffer);const i=await F0(r,e);return{key:await L0(i,t,n),salt:t}}async function qc(r,e,t){if(!r||typeof r!="string")return null;const n=crypto.getRandomValues(new Uint8Array(V0)),i=new TextEncoder,s=i.encode(r),o={name:"AES-GCM",iv:n};t&&(o.additionalData=i.encode(t));const c=await crypto.subtle.encrypt(o,e,s);return{iv:go(n.buffer),ct:go(c)}}async function zc(r,e,t,n){if(!r||!e)return null;const i=new Uint8Array(Su(r)),s=Su(e),o={name:"AES-GCM",iv:i};n&&(o.additionalData=new TextEncoder().encode(n));const c=await crypto.subtle.decrypt(o,t,s);return new TextDecoder().decode(c)}async function cI(r,e){var s;if(!r||!e)return r;const t={...r},n={v:"2.1"};let i=!1;for(const o of $c){const c=r[o];if(c!=null&&c!=="")try{const l=typeof c=="string"?c:JSON.stringify(c),u=await qc(l,e,o);u&&(n[o]=u,delete t[o],i=!0)}catch(l){(((s=window.logger)==null?void 0:s.warn)||console.warn)(`[CryptoUtils] Failed to encrypt field "${o}":`,l)}}return i&&(t._enc=n),t}async function lI(r,e){var s;if(!r||!e||!r._enc)return r;const t={...r},n=r._enc,i=n.v==="2.1";for(const o of $c){const c=n[o];if(c&&typeof c=="object"&&"iv"in c&&"ct"in c)try{const l=i?o:void 0,u=await zc(c.iv,c.ct,e,l);if(u!==null)if(o==="parcels")try{t[o]=JSON.parse(u)}catch{t[o]=u}else t[o]=u}catch(l){(((s=window.logger)==null?void 0:s.warn)||console.warn)(`[CryptoUtils] Failed to decrypt field "${o}":`,l),o==="parcels"?t[o]=[]:t[o]="[복호화 실패]"}}return delete t._enc,t}async function Ru(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Za){const i=r.slice(n,n+Za),s=await Promise.all(i.map(o=>cI(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}async function uI(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Za){const i=r.slice(n,n+Za),s=await Promise.all(i.map(o=>lI(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}function B0(r){const e=r;return!!(e&&e._enc&&e._enc.v)}function $0(){return[...$c]}function q0(r){const e=[];(!r||r.length<8)&&e.push("비밀번호는 8자 이상이어야 합니다"),r&&r.length>64&&e.push("비밀번호는 64자 이하여야 합니다"),/[a-z]/.test(r)||e.push("소문자를 1개 이상 포함해야 합니다"),/[0-9]/.test(r)||e.push("숫자를 1개 이상 포함해야 합니다"),/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(r)||e.push("특수문자를 1개 이상 포함해야 합니다");let t="약함";return e.length===0&&(t=r.length>=12?"강함":"보통"),{valid:e.length===0,strength:t,errors:e}}function z0(){const r=crypto.getRandomValues(new Uint8Array(32));return go(r.buffer)}function K0(r){const e=r.replace(/[^a-zA-Z0-9\-_]/g,"");return`
        <div class="enc-password-rules" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 12px; color: #15803D;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #166534;">비밀번호 규칙</div>
            <div id="${e}-rule-length" style="color: #15803D; margin-bottom: 2px;">• 8~64자 길이</div>
            <div id="${e}-rule-lower" style="color: #15803D; margin-bottom: 2px;">• 소문자 포함 (필수)</div>
            <div id="${e}-rule-number" style="color: #15803D; margin-bottom: 2px;">• 숫자 포함 (필수)</div>
            <div id="${e}-rule-special" style="color: #15803D; margin-bottom: 2px;">• 특수문자 포함 (필수)</div>
            <div id="${e}-rule-upper" style="color: #9CA3AF; font-size: 12px;">• 대문자 포함 (권장)</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 500; color: #6B7280;">비밀번호 강도</span>
            <span id="${e}-strength-text" style="font-size: 12px; font-weight: 600; color: #9CA3AF;">-</span>
        </div>
        <div id="${e}-strength-bar" style="height: 6px; border-radius: 3px; background: #E5E7EB; margin-bottom: 16px; transition: all 0.3s;">
            <div id="${e}-strength-fill" style="height: 100%; border-radius: 3px; width: 0; transition: all 0.3s;"></div>
        </div>`}function j0(r){const{prefix:e,input:t,confirmInput:n,submitBtn:i,submitColor:s="#4A90D9",extraCheck:o,verifyMode:c=!1}=r,l=document.getElementById(`${e}-strength-fill`),u=document.getElementById(`${e}-strength-text`),d=document.getElementById(`${e}-rule-length`),f=document.getElementById(`${e}-rule-lower`),g=document.getElementById(`${e}-rule-number`),_=document.getElementById(`${e}-rule-special`),R=document.getElementById(`${e}-rule-upper`);function k(x,M){x&&(x.style.color=M?"#16A34A":"#15803D",x.textContent=(M?"✓ ":"• ")+x.textContent.replace(/^[\u2713\u2022] /,""))}function T(){const x=t.value,M=x.length>=8&&x.length<=64,F=/[a-z]/.test(x),K=/[0-9]/.test(x),W=/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(x),j=/[A-Z]/.test(x);k(d,M),k(f,F),k(g,K),k(_,W),R&&(R.style.color=j?"#16A34A":"#9CA3AF",R.textContent=(j?"✓ ":"• ")+R.textContent.replace(/^[\u2713\u2022] /,""));const E=M&&F&&K&&W;l&&u&&(x.length===0?(l.style.width="0",l.style.background="#E5E7EB",u.textContent="-",u.style.color="#9CA3AF"):E?c?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="입력 완료",u.style.color="#16A34A"):x.length>=12||x.length>=10&&j?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="강함",u.style.color="#16A34A"):(l.style.width="66%",l.style.background="linear-gradient(90deg, #F59E0B, #EAB308)",u.textContent="보통",u.style.color="#F59E0B"):(l.style.width="33%",l.style.background="#EF4444",u.textContent="요건 미충족",u.style.color="#EF4444"));let y=E;n&&(y=y&&x===n.value&&n.value.length>0),o&&(y=y&&o()),y?(i.disabled=!1,i.style.background=s,i.style.cursor="pointer"):(i.disabled=!0,i.style.background="#ccc",i.style.cursor="default")}return t.addEventListener("input",T),n&&n.addEventListener("input",T),{updateValidation:T}}async function G0(r,e){var n,i,s;const t=window;try{if((n=t.encryptionManager)!=null&&n.isReady()){const o=t.encryptionManager.getKey();if(o){const c=JSON.stringify(e),l=await qc(c,o);if(l){const u={_localEnc:!0,iv:l.iv,ct:l.ct};localStorage.setItem(r,JSON.stringify(u));return}}}localStorage.setItem(r,JSON.stringify(e))}catch(o){if((((i=window.logger)==null?void 0:i.error)||console.error)("[SecureStorage] 암호화 저장 실패:",o.message),(s=t.encryptionManager)!=null&&s.isReady())throw new Error("데이터 암호화에 실패하여 저장을 중단합니다: "+o.message);localStorage.setItem(r,JSON.stringify(e))}}async function W0(r){var n,i,s;const e=window,t=localStorage.getItem(r);if(!t)return null;try{const o=JSON.parse(t);if(o&&o._localEnc&&o.iv&&o.ct){if((n=e.encryptionManager)!=null&&n.isReady()){const c=e.encryptionManager.getKey();if(c){const l=o,u=await zc(l.iv,l.ct,c);if(u)return JSON.parse(u)}}return(((i=window.logger)==null?void 0:i.warn)||console.warn)("[SecureStorage] 암호화된 데이터이나 키 미준비:",r),null}return o}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("[SecureStorage] 로드 실패:",r,o.message),null}}async function H0(r){var t;const e=window;if((t=e.encryptionManager)!=null&&t.isReady()){const n=e.encryptionManager.getKey();if(n){const i=typeof r=="string"?JSON.parse(r):r;if(i&&Array.isArray(i.data)){const c=i,l=await Ru(c.data,n),u={...c,_fileEnc:"2.1",data:l};return JSON.stringify(u,null,2)}if(Array.isArray(i)){const c=await Ru(i,n);return JSON.stringify(c,null,2)}const s=typeof r=="string"?r:JSON.stringify(r),o=await qc(s,n);if(o){const c={_localEnc:!0,iv:o.iv,ct:o.ct};return JSON.stringify(c,null,2)}}}return typeof r=="string"?r:JSON.stringify(r,null,2)}async function Q0(r){var t,n,i,s,o;const e=window;if(!r)return null;try{const c=JSON.parse(r);if(c&&c._fileEnc&&Array.isArray(c.data)){if((t=e.encryptionManager)!=null&&t.isReady()){const l=e.encryptionManager.getKey();if(l){const u=c,d=await uI(u.data,l),f={...u,data:d};return delete f._fileEnc,f}}return(((n=window.logger)==null?void 0:n.warn)||console.warn)("[SecureStorage] 암호화된 파일이나 키 미준비"),null}if(c&&c._localEnc&&c.iv&&c.ct){if((i=e.encryptionManager)!=null&&i.isReady()){const l=e.encryptionManager.getKey();if(l){const u=c,d=await zc(u.iv,u.ct,l);if(d)return JSON.parse(d)}}return(((s=window.logger)==null?void 0:s.warn)||console.warn)("[SecureStorage] 암호화된 파일이나 키 미준비"),null}return c}catch(c){return(((o=window.logger)==null?void 0:o.error)||console.error)("[SecureStorage] 파일 복호화 실패:",c.message),null}}const Y0={createMasterKey:U0,generateKeyFileContent:z0,validatePassword:q0,encrypt:qc,decrypt:zc,encryptRecord:cI,decryptRecord:lI,encryptRecords:Ru,decryptRecords:uI,isEncrypted:B0,getSensitiveFields:$0,bufferToBase64:go,base64ToBuffer:Su,createPasswordRulesHTML:K0,bindPasswordValidation:j0,saveToLocalStorage:G0,loadFromLocalStorage:W0,encryptForFile:H0,decryptFromFile:Q0,SENSITIVE_FIELDS:$c,ENCRYPTION_VERSION:D0,PBKDF2_ITERATIONS:oI};window.CryptoUtils=Y0;const Q=(...r)=>{},hI=Symbol("recover");let fe=null,ge=null,Ni=!1,at=!1,ni=null,ct=null,ee=null,ec=!1,Jt=null;const dI="encryption_keyFile",fI="encryption_salt",wd="encryption_recoveryBlob",Id="encryption_sessionPw",Pu='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',ri='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',ws=3,J0=24,X0=6e5,Z0=5*60*1e3,pI=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);function gI(){if(document.getElementById("enc-modal-dark-styles"))return;const r=document.createElement("style");r.id="enc-modal-dark-styles",r.textContent=`
        [data-theme="dark"] #encryption-password-modal > div > div {
            background: #1e293b !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        [data-theme="dark"] #encryption-password-modal h3 {
            color: #F1F5F9 !important;
        }
        [data-theme="dark"] #encryption-password-modal p {
            color: #94a3b8 !important;
        }
        [data-theme="dark"] #encryption-password-modal p span {
            color: #f59e0b !important;
        }
        [data-theme="dark"] #encryption-password-modal label {
            color: #cbd5e1 !important;
        }
        [data-theme="dark"] #encryption-password-modal input[type="password"],
        [data-theme="dark"] #encryption-password-modal input[type="text"] {
            background: #0f172a !important;
            border-color: #475569 !important;
            color: #e2e8f0 !important;
        }
        [data-theme="dark"] #enc-toggle-pw {
            color: #64748B !important;
        }
        [data-theme="dark"] #enc-error-msg {
            background: #451a1a !important;
            border-color: #7f1d1d !important;
            color: #fca5a5 !important;
        }
        [data-theme="dark"] #enc-password-error,
        [data-theme="dark"] #enc-export-pw-error,
        [data-theme="dark"] #enc-ch-error {
            color: #fca5a5 !important;
        }
        [data-theme="dark"] #enc-skip-btn,
        [data-theme="dark"] #enc-export-cancel,
        [data-theme="dark"] #enc-ch-cancel {
            background: #334155 !important;
            border-color: #475569 !important;
            color: #cbd5e1 !important;
        }
        [data-theme="dark"] #enc-submit-btn[disabled],
        [data-theme="dark"] #enc-export-submit[disabled],
        [data-theme="dark"] #enc-ch-submit[disabled] {
            background: #475569 !important;
            color: #94a3b8 !important;
        }
        [data-theme="dark"] .enc-password-rules {
            background: #0D2818 !important;
            border-color: #166534 !important;
            color: #86EFAC !important;
        }
        [data-theme="dark"] .enc-password-rules div {
            color: #86EFAC !important;
        }
        [data-theme="dark"] .enc-password-rules div:first-child {
            color: #BBF7D0 !important;
        }
        [data-theme="dark"] .enc-password-rules div:last-child {
            color: #64748B !important;
        }
        [data-theme="dark"] div[id$="-strength-bar"] {
            background: #334155 !important;
        }
        [data-theme="dark"] div[id$="-strength-text"] {
            color: #94a3b8 !important;
        }
        [data-theme="dark"] #enc-ch-progress div {
            color: #94a3b8 !important;
        }
        @keyframes enc-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
    `,document.head.appendChild(r)}function eD(r,e){if(typeof r!="string"||typeof e!="string")return!1;const t=Math.max(r.length,e.length);let n=r.length^e.length;for(let i=0;i<t;i++)n|=(r.charCodeAt(i)||0)^(e.charCodeAt(i)||0);return n===0}function mI(){var r;return(r=window.firestoreDb)!=null&&r.getCollectionName&&window.firestoreDb.getCollectionName("soil",2e3).startsWith("test_")?"test_":""}function Pt(){const r=mI();return r?r+"system":"_system"}async function tD(r){var i,s;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!0;const e=window.firebaseConfig.getDb();if(!e)return!0;const t=Pt(),n=e.collection(t).doc(`lock_${r}`);try{return await e.runTransaction(async c=>{const l=await c.get(n);if(l.exists){const u=l.data();if(Date.now()-new Date(u.lockedAt).getTime()<Z0)return!1}return c.set(n,{lockedBy:pI,lockedAt:new Date().toISOString()}),!0})}catch(o){return(((s=window.logger)==null?void 0:s.warn)||console.warn)(`[Encryption] Lock acquire failed (${r}):`,o.message),!0}}async function nD(r){var i,s;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Pt(),n=e.collection(t).doc(`lock_${r}`);try{await e.runTransaction(async o=>{const c=await o.get(n);c.exists&&c.data().lockedBy===pI&&o.delete(n)})}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)(`[Encryption] Lock release failed (${r}):`,o.message)}}async function nn(){var r,e,t,n,i,s,o,c,l,u,d,f,g;if((r=window.firebaseConfig)!=null&&r.isEnabled()){const _=window.firebaseConfig.getDb();if(_){const R=Pt(),k=mI();try{const T=await _.collection(R).doc("encryptionKey").get();if(T.exists){const x=T.data();if(x.keyFileContent)return ct="firebase",Q(`[Encryption] Key loaded from Firebase ${R}/encryptionKey`),x.keyFileContent}Q(`[Encryption] ${R}/encryptionKey not found or empty`)}catch(T){(((e=window.logger)==null?void 0:e.warn)||console.warn)(`[Encryption] Firebase ${R} read failed:`,T.message)}if(k){const T=k+"_system";try{Q(`[Encryption] Trying fallback: ${T}/encryptionKey...`);const x=await _.collection(T).doc("encryptionKey").get();if(x.exists&&((t=x.data())!=null&&t.keyFileContent)){ct="firebase",Q(`[Encryption] Key loaded from Firebase ${T} (fallback)`);try{await _.collection(R).doc("encryptionKey").set(x.data()),Q(`[Encryption] Migrated encryptionKey: ${T} → ${R}`);const M=await _.collection(T).doc("recoveryBlob").get();M.exists&&(await _.collection(R).doc("recoveryBlob").set(M.data()),Q(`[Encryption] Migrated recoveryBlob: ${T} → ${R}`))}catch(M){(((n=window.logger)==null?void 0:n.warn)||console.warn)("[Encryption] Migration failed:",M.message)}return x.data().keyFileContent}}catch(x){(((i=window.logger)==null?void 0:i.warn)||console.warn)(`[Encryption] ${T} fallback failed:`,x.message)}try{Q("[Encryption] Trying fallback: _system/encryptionKey...");const x=await _.collection("_system").doc("encryptionKey").get();if(x.exists&&((s=x.data())!=null&&s.keyFileContent))return ct="firebase",Q("[Encryption] Key loaded from Firebase _system (fallback)"),x.data().keyFileContent}catch(x){(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Encryption] _system fallback failed:",x.message)}}}}if((c=window.electronAPI)!=null&&c.isElectron){try{const _=await((u=(l=window.electronAPI).readKeyFile)==null?void 0:u.call(l));if(_)return ct="local",(((d=window.logger)==null?void 0:d.debug)||console.debug)("[Encryption] Key loaded from local file"),_}catch(_){(((f=window.logger)==null?void 0:f.warn)||console.warn)("[Encryption] Local key file not found:",_.message)}return null}try{const _=localStorage.getItem(dI);if(_)return ct="local",Q("[Encryption] Key loaded from localStorage"),_}catch(_){(((g=window.logger)==null?void 0:g.warn)||console.warn)("[Encryption] localStorage key load failed:",_.message)}return null}async function rD(r){var n,i,s;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Pt();try{const o=await e.collection(t).doc("encryptionKey").get();if(o.exists&&((i=o.data())!=null&&i.keyFileContent)){Q(`[Encryption] Firebase already has key in ${t} - skip sync`);return}await e.collection(t).doc("encryptionKey").set({keyFileContent:r,createdAt:new Date().toISOString(),version:"2.0",syncedFrom:"local"}),Q(`[Encryption] Local key synced to Firebase ${t}/encryptionKey`)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Encryption] Failed to sync key to Firebase:",o.message)}}function iD(r){setTimeout(async()=>{var e;try{confirm(`[암호화 키 파일 백업 안내]

암호화 키가 새로 생성되었습니다.
키 파일을 USB 또는 안전한 곳에 백업해두면
다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.

지금 키 파일을 백업하시겠습니까?`)&&await yI()}catch(t){(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] Key backup prompt failed:",t.message)}},1e3)}async function sD(){var n,i,s,o,c,l,u,d;const r=window.CryptoUtils;if(!(r!=null&&r.generateKeyFileContent))return(((n=window.logger)==null?void 0:n.error)||console.error)("[Encryption] CryptoUtils.generateKeyFileContent not available"),null;const e=r.generateKeyFileContent();if((((i=window.logger)==null?void 0:i.debug)||console.debug)("[Encryption] New key file generated"),(s=window.firebaseConfig)!=null&&s.isEnabled()){const f=window.firebaseConfig.getDb();if(f){const g=Pt();try{return await f.collection(g).doc("encryptionKey").set({keyFileContent:e,createdAt:new Date().toISOString(),version:"2.0"}),Q(`[Encryption] Key stored in Firebase ${g}/encryptionKey`),ct="generated",e}catch(_){(((o=window.logger)==null?void 0:o.error)||console.error)("[Encryption] Failed to store key in Firebase:",_.message)}}}if(((c=window.electronAPI)==null?void 0:c.isElectron)===!0){if((l=window.electronAPI)!=null&&l.saveKeyFile)try{const f=await window.electronAPI.saveKeyFile(e);if(f!=null&&f.success)return Q("[Encryption] Key stored in local file (safeStorage protected)"),ct="local",e}catch(f){(((u=window.logger)==null?void 0:u.error)||console.error)("[Encryption] Failed to store key locally:",f.message)}}else try{return localStorage.setItem(dI,e),Q("[Encryption] Key stored in localStorage"),ct="local",e}catch(f){(((d=window.logger)==null?void 0:d.warn)||console.warn)("[Encryption] localStorage key save failed:",f.message)}return ct="generated",e}async function yI(){var t,n,i;let r=ee;if(r||(r=await nn()),!r)return{success:!1,error:"활성화된 암호화 키가 없습니다."};if(((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&((n=window.electronAPI)!=null&&n.exportKeyFile)){const s=await window.electronAPI.exportKeyFile(r);return s!=null&&s.success?(Q("[Encryption] Key file exported to:",s.filePath),window.showToast&&window.showToast("키 파일이 저장되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}):(s==null?void 0:s.error)==="canceled"?{success:!1,error:"취소됨"}:((((i=window.logger)==null?void 0:i.error)||console.error)("[Encryption] Key export failed:",s==null?void 0:s.error),{success:!1,error:(s==null?void 0:s.error)||"내보내기 실패"})}try{const s=new Blob([r],{type:"text/plain"}),o=URL.createObjectURL(s),c=document.createElement("a");return c.href=o,c.download="sample-log.key",document.body.appendChild(c),c.click(),document.body.removeChild(c),URL.revokeObjectURL(o),window.showToast&&window.showToast("키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}}catch(s){return{success:!1,error:s.message}}}async function _I(){var t,n,i;const r=((t=window.electronAPI)==null?void 0:t.isElectron)===!0;let e=null;if(r&&((n=window.electronAPI)!=null&&n.importKeyFile)){const s=await window.electronAPI.importKeyFile();if(!(s!=null&&s.success))return(s==null?void 0:s.error)==="canceled"?{success:!1,error:"취소됨"}:{success:!1,error:(s==null?void 0:s.error)||"가져오기 실패"};e=s.content||null}else try{e=await new Promise((s,o)=>{const c=document.createElement("input");c.type="file",c.accept=".key",c.onchange=async l=>{var g;const d=(g=l.target.files)==null?void 0:g[0];if(!d){o(new Error("파일 선택 취소"));return}const f=await d.text();s(f.trim())},c.click()})}catch(s){return{success:!1,error:s.message}}if(!e||e.length<20||e.length>64)return{success:!1,error:"유효하지 않은 키 파일입니다. (길이 불일치)"};if(!/^[A-Za-z0-9+/=]+$/.test(e))return{success:!1,error:"유효하지 않은 키 파일입니다. (형식 오류)"};if(r&&((i=window.electronAPI)!=null&&i.saveKeyFile))try{const s=await window.electronAPI.saveKeyFile(e);if(!(s!=null&&s.success))return{success:!1,error:"키 파일 로컬 저장 실패"}}catch(s){return{success:!1,error:"로컬 저장 실패: "+s.message}}return ee=e,ct="local",window.showToast&&window.showToast("키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.","success"),{success:!0}}async function Ed(){var e,t,n;const r=window.CryptoUtils;if((e=window.electronAPI)!=null&&e.loadSalt)try{const i=await window.electronAPI.loadSalt();if(i&&r)return Q(`[Encryption] Salt loaded from Electron (${i.length} chars)`),r.base64ToBuffer(i)}catch(i){(((t=window.logger)==null?void 0:t.warn)||console.warn)("[Encryption] Electron salt load failed:",i.message)}try{const i=localStorage.getItem(fI);if(i&&r)return Q(`[Encryption] Salt loaded from localStorage (${i.length} chars)`),r.base64ToBuffer(i)}catch(i){(((n=window.logger)==null?void 0:n.warn)||console.warn)("[Encryption] localStorage salt load failed:",i.message)}return null}async function mo(r){var n,i,s;const e=window.CryptoUtils;if(!e)return;const t=e.bufferToBase64(r);if((n=window.electronAPI)!=null&&n.saveSalt)try{await window.electronAPI.saveSalt(t),Q("[Encryption] Salt saved to Electron");return}catch(o){(((i=window.logger)==null?void 0:i.warn)||console.warn)("[Encryption] Electron salt save failed:",o.message)}try{localStorage.setItem(fI,t),Q("[Encryption] Salt saved to localStorage")}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Encryption] localStorage salt save failed:",o.message)}}async function vd(r){var e,t;if((e=window.electronAPI)!=null&&e.storeSessionPassword){await window.electronAPI.storeSessionPassword(r);return}try{sessionStorage.setItem(Id,r),Q("[Encryption] Password stored in sessionStorage")}catch(n){(((t=window.logger)==null?void 0:t.warn)||console.warn)("[Encryption] sessionStorage password store failed:",n.message)}}async function Kc(){var r,e;if((r=window.electronAPI)!=null&&r.getSessionPassword){const t=await window.electronAPI.getSessionPassword();if(t)return t}try{const t=sessionStorage.getItem(Id);if(t)return Q("[Encryption] Session password found in sessionStorage"),t}catch(t){(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] sessionStorage password read failed:",t.message)}return null}async function yo(r){var t,n,i,s,o;const e=window.CryptoUtils;if(!((t=window.firebaseConfig)!=null&&t.isEnabled())||!window.firestoreDb)return{verified:!0,skipped:!0};try{const c=window.firebaseConfig.getDb();if(!c)return{verified:!0,skipped:!0};const l=["soil","water","compost","heavy-metal","pesticide"],u=new Date().getFullYear();let d=null;for(const T of l){const x=window.firestoreDb.getCollectionName(T,u);if((await c.collection(x).limit(5).get()).forEach(F=>{const K=F.data();K!=null&&K._enc&&!d&&(d=K)}),d)break}const f=d;if(!(f!=null&&f._enc))return Q("[Encryption] Key verification: no encrypted documents found - skipping"),{verified:!0,skipped:!0};const g=f._enc,_=Object.keys(g).find(T=>T!=="v");if(!_||!((n=g[_])!=null&&n.iv)||!((i=g[_])!=null&&i.ct))return Q("[Encryption] Key verification: no valid encrypted field found - skipping"),{verified:!0,skipped:!0};const R=g.v==="2.1";return Q(`[Encryption] Key verification: testing decrypt of "${_}" (v${g.v||"1"}, AAD=${R})...`),e?await e.decrypt(g[_].iv,g[_].ct,r,R?_:void 0)!==null?(Q("[Encryption] Key verification: SUCCESS"),{verified:!0,skipped:!1}):((((s=window.logger)==null?void 0:s.warn)||console.warn)("[Encryption] Key verification: decrypt returned null (wrong key)"),{verified:!1,skipped:!1}):{verified:!1,skipped:!1}}catch(c){return(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Encryption] Key verification FAILED:",c.message),{verified:!1,skipped:!1}}}function oD(){const r="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",e=256-256%r.length;let t="";for(;t.length<J0;){const n=crypto.getRandomValues(new Uint8Array(1));n[0]<e&&(t+=r[n[0]%r.length])}return t.match(/.{1,4}/g).join("-")}async function wI(r,e){const t=r.replace(/-/g,"").toUpperCase(),n=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:X0,hash:"SHA-256"},n,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function jc(r){var _,R,k,T,x,M;const e=window.CryptoUtils;if(!e)return null;const t=oD(),n=crypto.getRandomValues(new Uint8Array(16)),i=await wI(t,n.buffer);let s;const o=await Kc(),c=ee||await nn();if(o&&c&&ge){const F=await e.createMasterKey(o,c,ge,!0);s=await crypto.subtle.exportKey("raw",F.key)}else s=await crypto.subtle.exportKey("raw",r);const l=crypto.getRandomValues(new Uint8Array(12)),u=await crypto.subtle.encrypt({name:"AES-GCM",iv:l},i,s),d={version:"2.0",iv:e.bufferToBase64(l.buffer),ct:e.bufferToBase64(u),salt:e.bufferToBase64(n.buffer),createdAt:new Date().toISOString()};let f=!1;if((_=window.firebaseConfig)!=null&&_.isEnabled()){const F=window.firebaseConfig.getDb();if(F){const K=Pt();try{await F.collection(K).doc("recoveryBlob").set(d),Q(`[Encryption] Recovery blob (v2.0) stored in ${K}/recoveryBlob`),f=!0}catch(W){(((R=window.logger)==null?void 0:R.error)||console.error)("[Encryption] Failed to store recovery blob in Firebase:",W.message)}}}if(((k=window.electronAPI)==null?void 0:k.isElectron)===!0&&((T=window.electronAPI)!=null&&T.saveRecoveryBlob))try{const F=await window.electronAPI.saveRecoveryBlob(JSON.stringify(d));F!=null&&F.success&&(Q("[Encryption] Recovery blob stored locally (safeStorage protected)"),f=!0)}catch(F){(((x=window.logger)==null?void 0:x.error)||console.error)("[Encryption] Failed to store recovery blob locally:",F.message)}if(!f)try{localStorage.setItem(wd,JSON.stringify(d)),Q("[Encryption] Recovery blob stored in localStorage"),f=!0}catch(F){(((M=window.logger)==null?void 0:M.error)||console.error)("[Encryption] Failed to store recovery blob in localStorage:",F.message)}return f?t:null}async function Td(){var e,t,n,i,s,o,c;if((e=window.firebaseConfig)!=null&&e.isEnabled()){const l=window.firebaseConfig.getDb();if(l){const u=Pt();try{const d=await l.collection(u).doc("recoveryBlob").get();if(d.exists&&((t=d.data())!=null&&t.ct))return!0}catch(d){(((n=window.logger)==null?void 0:n.warn)||console.warn)("[Encryption] Recovery blob check (Firebase) failed:",d.message)}}}if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0&&((s=window.electronAPI)!=null&&s.loadRecoveryBlob))try{const l=await window.electronAPI.loadRecoveryBlob();if(l){const u=JSON.parse(l);if(u!=null&&u.ct)return!0}}catch(l){(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Encryption] Recovery blob check (local) failed:",l.message)}try{const l=localStorage.getItem(wd);if(l){const u=JSON.parse(l);if(u!=null&&u.ct)return!0}}catch(l){(((c=window.logger)==null?void 0:c.warn)||console.warn)("[Encryption] Recovery blob check (localStorage) failed:",l.message)}return!1}async function Fg(r){var e;try{if(!await Td()){Q("[Encryption] No recovery blob found - generating for existing user...");const n=await jc(r);n&&(await Gc(n),Q("[Encryption] Recovery blob created for existing user"))}}catch(t){(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] ensureRecoveryBlob failed:",t.message)}}async function aD(r){var n,i,s,o,c,l,u,d,f,g;const e=window.CryptoUtils;if(!e)return null;let t=null;if((n=window.firebaseConfig)!=null&&n.isEnabled()){const _=window.firebaseConfig.getDb();if(_){const R=Pt();try{const k=await _.collection(R).doc("recoveryBlob").get();k.exists&&(t=k.data())}catch(k){(((i=window.logger)==null?void 0:i.warn)||console.warn)("[Encryption] Recovery blob load (Firebase) failed:",k.message)}}}if(!t&&((s=window.electronAPI)==null?void 0:s.isElectron)===!0&&(o=window.electronAPI)!=null&&o.loadRecoveryBlob)try{const R=await window.electronAPI.loadRecoveryBlob();R&&(t=JSON.parse(R))}catch(R){(((c=window.logger)==null?void 0:c.warn)||console.warn)("[Encryption] Recovery blob load (local) failed:",R.message)}if(!t)try{const _=localStorage.getItem(wd);_&&(t=JSON.parse(_),Q("[Encryption] Recovery blob loaded from localStorage"))}catch(_){(((l=window.logger)==null?void 0:l.warn)||console.warn)("[Encryption] Recovery blob load (localStorage) failed:",_.message)}if(!t)return(((u=window.logger)==null?void 0:u.warn)||console.warn)("[Encryption] Recovery blob not found"),null;try{if(!t.version||!["1.0","2.0"].includes(t.version))return(((d=window.logger)==null?void 0:d.warn)||console.warn)("[Encryption] Unknown recovery blob version:",t.version),null;if(!t.iv||!t.ct||!t.salt)return(((f=window.logger)==null?void 0:f.warn)||console.warn)("[Encryption] Invalid recovery blob format"),null;const _=e.base64ToBuffer(t.salt),R=await wI(r,_),k=new Uint8Array(e.base64ToBuffer(t.iv)),T=e.base64ToBuffer(t.ct),x=await crypto.subtle.decrypt({name:"AES-GCM",iv:k},R,T);if(t.version==="2.0")return await crypto.subtle.importKey("raw",x,{name:"AES-GCM"},!1,["encrypt","decrypt"]);{const M=new TextDecoder().decode(x),F=await nn(),K=await Ed();return!F||!K?null:(await e.createMasterKey(M,F,K)).key}}catch(_){return(((g=window.logger)==null?void 0:g.warn)||console.warn)("[Encryption] Recovery decryption failed:",_.message),null}}function Gc(r){return new Promise(e=>{const t=document.getElementById("recovery-key-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-key-modal",n.innerHTML=`
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 32px;
                    width: 480px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #333;">
                        복구 키가 생성되었습니다
                    </h3>
                    <div style="
                        background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;
                        padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;
                    ">
                        <strong>중요!</strong> 이 복구 키는 비밀번호를 잊었을 때 사용됩니다.<br>
                        안전한 곳에 따로 보관하세요. 이 키는 다시 표시되지 않습니다.
                    </div>
                    <div id="recovery-key-display" style="
                        background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 8px;
                        padding: 16px; text-align: center; font-family: 'Courier New', monospace;
                        font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #1e293b;
                        user-select: all; cursor: pointer; margin-bottom: 12px;
                    "></div>
                    <div style="text-align: center; margin-bottom: 16px;">
                        <button id="recovery-key-copy" style="
                            padding: 6px 16px; border: 1px solid #3b82f6; background: #eff6ff;
                            border-radius: 6px; cursor: pointer; font-size: 13px; color: #3b82f6;
                        ">복사</button>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button id="recovery-key-close" style="
                            padding: 8px 24px; border: none; background: #3b82f6;
                            color: white; border-radius: 6px; cursor: pointer; font-size: 14px;
                        ">확인, 안전하게 저장했습니다</button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-display");i&&(i.textContent=r);let s=null;const o=document.getElementById("recovery-key-copy");o&&o.addEventListener("click",async()=>{var l;try{await navigator.clipboard.writeText(r),o.textContent="복사됨! (30초 후 클립보드 삭제)",o.style.background="#dcfce7",o.style.borderColor="#22c55e",o.style.color="#16a34a",s&&clearTimeout(s),s=setTimeout(async()=>{try{await navigator.clipboard.readText()===r&&await navigator.clipboard.writeText("")}catch{}const u=document.getElementById("recovery-key-copy");u&&(u.textContent="복사",u.style.background="#eff6ff",u.style.borderColor="#3b82f6",u.style.color="#3b82f6")},3e4)}catch(u){(((l=window.logger)==null?void 0:l.warn)||console.warn)("Clipboard write failed:",u)}});const c=document.getElementById("recovery-key-close");c&&c.addEventListener("click",()=>{s&&clearTimeout(s);try{navigator.clipboard.writeText("").catch(()=>{})}catch{}n.remove(),e()})})}function cD(){return new Promise(r=>{const e=d=>{Jt=null,r(d)};Jt=()=>{var d;(d=document.getElementById("recovery-input-modal"))==null||d.remove(),r(null)};const t=document.getElementById("recovery-input-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-input-modal",n.innerHTML=`
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
            ">
                <div style="
                    background: white; border-radius: 12px; padding: 32px;
                    width: 460px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">
                        비밀번호 복구
                    </h3>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #666;">
                        비밀번호 설정 시 받은 복구 키를 입력해주세요.
                    </p>
                    <input type="text" id="recovery-key-input" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                        style="
                            width: 100%; padding: 12px; font-size: 16px;
                            font-family: 'Courier New', monospace; letter-spacing: 2px;
                            border: 2px solid #ddd; border-radius: 8px;
                            box-sizing: border-box; outline: none; text-align: center;
                            text-transform: uppercase;
                        "
                    />
                    <div id="recovery-input-error" style="
                        color: #e74c3c; font-size: 12px; margin-top: 6px; display: none; text-align: center;
                    "></div>
                    <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                        <button id="recovery-input-cancel" style="
                            padding: 8px 20px; border: 1px solid #ddd; background: white;
                            border-radius: 6px; cursor: pointer; font-size: 14px; color: #666;
                        ">취소</button>
                        <button id="recovery-input-submit" style="
                            padding: 8px 20px; border: none; background: #3b82f6;
                            color: white; border-radius: 6px; cursor: pointer; font-size: 14px;
                        ">복구</button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-input"),s=document.getElementById("recovery-input-submit"),o=document.getElementById("recovery-input-cancel"),c=document.getElementById("recovery-input-error");i.addEventListener("input",()=>{var g;c.style.display="none";let d=i.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();d.length>24&&(d=d.substring(0,24));const f=((g=d.match(/.{1,4}/g))==null?void 0:g.join("-"))||d;i.value=f});function l(){const d=i.value.replace(/-/g,"").trim();if(d.length!==24){c.textContent="복구 키는 24자리여야 합니다.",c.style.display="block";return}n.remove(),e(d)}function u(){n.remove(),e(null)}s.addEventListener("click",l),o.addEventListener("click",u),i.addEventListener("keydown",d=>{d.key==="Enter"&&l(),d.key==="Escape"&&u()}),setTimeout(()=>i.focus(),100)})}function Qr(r){let e=document.getElementById("recovery-progress-overlay");if(e){const t=document.getElementById("recovery-progress-text");t&&(t.textContent=r),e.style.display="flex"}else{e=document.createElement("div"),e.id="recovery-progress-overlay",e.style.cssText=`
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 99998;
            display: flex; align-items: center; justify-content: center;
        `;const t=document.createElement("div");t.style.cssText=`
            background: white; border-radius: 12px; padding: 32px;
            text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            min-width: 280px;
        `;const n=document.createElement("div");n.style.cssText=`
            width: 40px; height: 40px; border: 4px solid #e2e8f0;
            border-top: 4px solid #3b82f6; border-radius: 50%;
            animation: encSpin 1s linear infinite; margin: 0 auto 16px;
        `;const i=document.createElement("style");i.textContent="@keyframes encSpin { to { transform: rotate(360deg); } }",document.head.appendChild(i);const s=document.createElement("div");s.id="recovery-progress-text",s.style.cssText="font-size: 14px; color: #333;",s.textContent=r,t.appendChild(n),t.appendChild(s),e.appendChild(t),document.body.appendChild(e)}}function rr(){const r=document.getElementById("recovery-progress-overlay");r&&r.remove()}async function lD(){var s,o;if(!((s=window.firebaseConfig)!=null&&s.isEnabled()))return{allowed:!0,remaining:5};const t=window.firebaseConfig.getDb();if(!t)return{allowed:!0,remaining:5};const n=Pt(),i=t.collection(n).doc("recoveryAttempts");try{return await t.runTransaction(async l=>{const u=await l.get(i),d=u.exists?u.data():null;if(d){const f=new Date(d.lastAttemptAt),g=new Date,_=(g.getTime()-f.getTime())/6e4;return _>=30?(l.set(i,{count:1,lastAttemptAt:g.toISOString()}),{allowed:!0,remaining:4}):d.count>=5?{allowed:!1,remaining:0,lockoutMinutes:Math.ceil(30-_)}:(l.update(i,{count:d.count+1,lastAttemptAt:g.toISOString()}),{allowed:!0,remaining:5-d.count-1})}return l.set(i,{count:1,lastAttemptAt:new Date().toISOString()}),{allowed:!0,remaining:4}})}catch(c){return(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Encryption] Recovery attempts check failed:",c.message),{allowed:!0,remaining:5}}}async function uD(){var t,n;if(!((t=window.firebaseConfig)!=null&&t.isEnabled()))return;const r=window.firebaseConfig.getDb();if(!r)return;const e=Pt();try{await r.collection(e).doc("recoveryAttempts").delete()}catch(i){(((n=window.logger)==null?void 0:n.warn)||console.warn)("[Encryption] Failed to reset recovery attempts:",i.message)}}async function Lg(r,e,t,n){var u,d,f,g;const i=window.CryptoUtils;if(!i)return;const s=await r.collection(e).get();if(s.empty)return;const o=200,c=[];s.forEach(_=>{c.push({ref:_.ref,id:_.id,data:_.data()})});const l=[];for(let _=0;_<c.length;_+=o){const R=c.slice(_,_+o),k=r.batch();let T=!1;for(const{ref:x,id:M,data:F}of R)if(F._enc)try{const K=await i.decryptRecord({...F},t),W=await i.encryptRecord(K,n);if(W._enc){const j={...W},E=(d=(u=window.firebase)==null?void 0:u.firestore)==null?void 0:d.FieldValue;if(E){for(const y of i.SENSITIVE_FIELDS)(!(y in j)||j[y]===void 0)&&(j[y]=E.delete());j.updatedAt=E.serverTimestamp()}k.set(x,j,{merge:!0}),T=!0}}catch(K){l.push(M),(((f=window.logger)==null?void 0:f.error)||console.error)(`[ReEncrypt] ${e}/${M}: re-encrypt failed -`,K.message)}if(l.length>0)throw new Error(`${e}: ${l.length}개 문서 재암호화 실패 (${l.join(", ")})`);T&&await k.commit()}(((g=window.logger)==null?void 0:g.debug)||console.log)(`[ReEncrypt] ${e}: re-encrypted ${c.length} docs`)}function hD(r,e){gI();const t=window.CryptoUtils;return new Promise(n=>{var k;const i=T=>{Jt=null,n(T)};Jt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),n(null)};const s=document.getElementById("encryption-password-modal");s&&s.remove();const o=document.createElement("div");if(o.id="encryption-password-modal",o.innerHTML=`
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(4px);
            ">
                <div style="
                    background: white; border-radius: 20px; padding: 36px;
                    width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex; flex-direction: column; gap: 20px;
                ">
                    <div style="display: flex; justify-content: center;">
                        <div style="
                            width: 64px; height: 64px; border-radius: 50%;
                            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                            display: flex; align-items: center; justify-content: center;
                        ">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #111827;">
                            암호화 비밀번호 입력
                        </h3>
                        <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                            데이터 복호화를 위해 비밀번호를 입력해주세요.
                        </p>
                    </div>
                    <div id="enc-error-msg" style="
                        background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
                        padding: 10px 14px; font-size: 13px; color: #DC2626;
                        display: none;
                    "></div>

                    ${((k=t==null?void 0:t.createPasswordRulesHTML)==null?void 0:k.call(t,"enc"))||""}

                    <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                        <div style="position: relative;">
                            <input type="password" id="enc-password-input" placeholder="비밀번호를 입력하세요" maxlength="64"
                                style="
                                    width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                    border: 1px solid #D1D5DB; border-radius: 10px;
                                    box-sizing: border-box; outline: none; background: #F9FAFB;
                                    transition: border-color 0.2s, box-shadow 0.2s;
                                "
                            />
                            <button type="button" id="enc-toggle-pw" style="
                                position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                            " title="비밀번호 표시/숨기기">
                                ${ri}
                            </button>
                        </div>
                        <div id="enc-password-error" style="
                            color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                        "></div>
                    </div>
                    <div id="enc-recover-link" style="text-align: center; display: none;">
                        <a href="#" id="enc-recover-btn" style="
                            font-size: 13px; color: #3B82F6; text-decoration: none;
                            cursor: pointer;
                        ">비밀번호를 잊으셨나요?</a>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button id="enc-skip-btn" style="
                            flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                            border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                            transition: background 0.2s;
                        ">건너뛰기</button>
                        <button id="enc-submit-btn" style="
                            flex: 1; padding: 12px 20px; border: none;
                            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                            color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                            transition: opacity 0.2s;
                        " disabled>확인</button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(o),r){const T=document.getElementById("enc-error-msg");T&&(T.textContent=r,T.style.display="block");const x=document.getElementById("enc-password-input");x&&(x.style.borderColor="#e74c3c")}const c=document.getElementById("enc-password-input"),l=document.getElementById("enc-submit-btn"),u=document.getElementById("enc-skip-btn"),d=document.getElementById("enc-password-error");t!=null&&t.bindPasswordValidation&&t.bindPasswordValidation({prefix:"enc",input:c,submitBtn:l,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const f=document.getElementById("enc-toggle-pw");f&&f.addEventListener("click",()=>{const T=c.type==="password";c.type=T?"text":"password",f.innerHTML=T?Pu:ri}),c.addEventListener("focus",()=>{c.style.borderColor="#22C55E",c.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),c.addEventListener("blur",()=>{c.style.borderColor="#D1D5DB",c.style.boxShadow="none"}),c.addEventListener("input",()=>{d.style.display="none"});async function g(){const T=c.value;if(!T){d.textContent="비밀번호를 입력해주세요.",d.style.display="block";return}if(e){l.disabled=!0,l.textContent="검증 중...",c.disabled=!0;const x=document.getElementById("enc-error-msg");x&&(x.style.display="none");try{const M=await e(T);if(M.valid)o.remove(),i(T);else if(M.exhausted)o.remove(),i(null);else{c.disabled=!1,l.textContent="확인",x&&(x.textContent=M.error||"비밀번호가 올바르지 않습니다.",x.style.display="block"),c.value="",c.style.borderColor="#e74c3c",c.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",c.focus();const F=o.querySelector("div > div");F&&(F.style.animation="none",F.offsetHeight,F.style.animation="enc-shake 0.4s ease")}}catch(M){c.disabled=!1,l.textContent="확인",x&&(x.textContent="검증 중 오류: "+(M.message||"알 수 없는 오류"),x.style.display="block"),c.focus()}return}o.remove(),i(T)}function _(){o.remove(),i(null)}l.addEventListener("click",g),u.addEventListener("click",_),c.addEventListener("keydown",T=>{T.key==="Enter"&&!l.disabled&&g(),T.key==="Escape"&&_()}),Td().then(T=>{const x=document.getElementById("enc-recover-link");x&&T&&(x.style.display="block")}).catch(T=>{var x;(((x=window.logger)==null?void 0:x.debug)||console.debug)("[Encryption] Recovery blob check for link display failed:",T.message)});const R=document.getElementById("enc-recover-btn");R&&R.addEventListener("click",T=>{T.preventDefault(),o.remove(),i(hI)}),setTimeout(()=>c.focus(),100)})}function II(){gI();const r=window.CryptoUtils;return new Promise(e=>{var k;const t=T=>{Jt=null,e(T)};Jt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),e(null)};const n=document.getElementById("encryption-password-modal");n&&n.remove();const i=document.createElement("div");i.id="encryption-password-modal",i.innerHTML=`
            <div style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(4px);
            ">
                <div style="
                    background: white; border-radius: 20px; padding: 36px;
                    width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex; flex-direction: column; gap: 20px;
                ">
                    <div style="display: flex; justify-content: center;">
                        <div style="
                            width: 64px; height: 64px; border-radius: 50%;
                            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                            display: flex; align-items: center; justify-content: center;
                        ">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #111827;">
                            암호화 비밀번호 설정
                        </h3>
                        <p style="margin: 0 0 4px 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                            데이터 암호화에 사용할 비밀번호를 설정해주세요.
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                            이 비밀번호는 앱 실행 시 매번 입력해야 합니다.
                        </p>
                    </div>

                    ${((k=r==null?void 0:r.createPasswordRulesHTML)==null?void 0:k.call(r,"enc"))||""}

                    <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                        <div style="position: relative;">
                            <input type="password" id="enc-password-input" placeholder="비밀번호 입력" maxlength="64"
                                style="
                                    width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                    border: 1px solid #D1D5DB; border-radius: 10px;
                                    box-sizing: border-box; outline: none; background: #F9FAFB;
                                    transition: border-color 0.2s, box-shadow 0.2s;
                                "
                            />
                            <button type="button" id="enc-toggle-pw" style="
                                position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                            " title="비밀번호 표시/숨기기">
                                ${ri}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호 확인</label>
                        <div style="position: relative;">
                            <input type="password" id="enc-password-confirm" placeholder="비밀번호 다시 입력" maxlength="64"
                                style="
                                    width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                    border: 1px solid #D1D5DB; border-radius: 10px;
                                    box-sizing: border-box; outline: none; background: #F9FAFB;
                                    transition: border-color 0.2s, box-shadow 0.2s;
                                "
                            />
                            <button type="button" id="enc-toggle-pw-confirm" style="
                                position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                            " title="비밀번호 표시/숨기기">
                                ${ri}
                            </button>
                        </div>
                    </div>
                    <div id="enc-password-error" style="
                        color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                    "></div>
                    <div style="display: flex; gap: 12px;">
                        <button id="enc-skip-btn" style="
                            flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                            border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                            transition: background 0.2s;
                        ">건너뛰기</button>
                        <button id="enc-submit-btn" style="
                            flex: 1; padding: 12px 20px; border: none;
                            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                            color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                            transition: opacity 0.2s;
                        " disabled>설정 완료</button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(i);const s=document.getElementById("enc-password-input"),o=document.getElementById("enc-password-confirm"),c=document.getElementById("enc-submit-btn"),l=document.getElementById("enc-skip-btn"),u=document.getElementById("enc-password-error");r!=null&&r.bindPasswordValidation&&r.bindPasswordValidation({prefix:"enc",input:s,confirmInput:o,submitBtn:c,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)"});const d=document.getElementById("enc-toggle-pw");d&&d.addEventListener("click",()=>{const T=s.type==="password";s.type=T?"text":"password",d.innerHTML=T?Pu:ri});const f=document.getElementById("enc-toggle-pw-confirm");f&&f.addEventListener("click",()=>{const T=o.type==="password";o.type=T?"text":"password",f.innerHTML=T?Pu:ri}),[s,o].forEach(T=>{T.addEventListener("focus",()=>{T.style.borderColor="#22C55E",T.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),T.addEventListener("blur",()=>{T.style.borderColor="#D1D5DB",T.style.boxShadow="none"})}),s.addEventListener("input",()=>{u.style.display="none"}),o.addEventListener("input",()=>{u.style.display="none"});function g(T){u.textContent=T,u.style.display="block"}function _(){const T=s.value,x=o.value;if(r!=null&&r.validatePassword){const M=r.validatePassword(T);if(!M.valid){g(M.errors[0]);return}}if(T!==x){g("비밀번호가 일치하지 않습니다.");return}i.remove(),t(T)}function R(){i.remove(),t(null)}c.addEventListener("click",_),l.addEventListener("click",R),o.addEventListener("keydown",T=>{T.key==="Enter"&&!c.disabled&&_(),T.key==="Escape"&&R()}),s.addEventListener("keydown",T=>{T.key==="Escape"&&R()}),setTimeout(()=>s.focus(),100)})}async function dD(r){var i,s;const e=window.CryptoUtils;if(!e)return!1;const t=await II();if(!t)return(((i=window.logger)==null?void 0:i.warn)||console.warn)("[Encryption] First-time setup skipped by user"),ee=null,!1;const n=await e.createMasterKey(t,ee,ge);fe=n.key,ge=n.salt,r&&await mo(ge),await vd(t);try{const o=await jc(fe);o&&await Gc(o)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Encryption] Recovery key generation failed:",o.message)}return ee&&iD(),ee=null,ec=!1,!0}async function fD(r){var o,c,l,u,d;const e=window.CryptoUtils;if(!e)return!1;const t=await Kc();if(t){const f=await e.createMasterKey(t,ee,ge);if(fe=f.key,ge=f.salt,r&&await mo(ge),(await yo(fe)).verified)return await Fg(fe),ee=null,!0;(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Encryption] Stored session password is invalid - clearing"),fe=null,(c=window.electronAPI)!=null&&c.clearSessionPassword&&await window.electronAPI.clearSessionPassword()}let n=0,i=null;const s=async f=>{var R;const g=await e.createMasterKey(f,ee,ge);return fe=g.key,ge=g.salt,r&&n===0&&await mo(ge),(await yo(fe)).verified?{valid:!0}:(n++,fe=null,(((R=window.logger)==null?void 0:R.warn)||console.warn)(`[Encryption] Key verification failed (attempt ${n}/${ws})`),n>=ws?{valid:!1,error:`비밀번호 시도 횟수를 초과했습니다. (${ws}회)`,exhausted:!0}:{valid:!1,error:`비밀번호가 올바르지 않습니다. (${n}/${ws})`})};for(;n<ws;){const f=await hD(i,s);if(!f)return(((l=window.logger)==null?void 0:l.warn)||console.warn)("[Encryption] Password skipped - encryption disabled"),ee=null,!1;if(f===hI){try{const g=await vI();if(g!=null&&g.success)return Q("[Encryption] Password recovered successfully"),!0;i=(g==null?void 0:g.error)==="Cancelled"?null:"비밀번호 복구에 실패했습니다. 다시 시도해주세요."}catch(g){(((u=window.logger)==null?void 0:u.error)||console.error)("[Encryption] Recovery error:",g),i="비밀번호 복구 중 오류: "+(g.message||"알 수 없는 오류")}continue}return await vd(f),await Fg(fe),ee=null,!0}return(((d=window.logger)==null?void 0:d.error)||console.error)("[Encryption] All password attempts exhausted"),ee=null,fe=null,!1}async function EI(){return Ni?!!fe:at?ni||!1:(at=!0,ni=pD().finally(()=>{ni=null}),ni)}async function pD(){var e,t,n,i,s,o;if(!window.CryptoUtils)return(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] CryptoUtils not loaded"),at=!1,!1;try{if(Q("[Encryption] Step 1: Loading key file..."),ee=await nn(),ee||(t=window.firebaseConfig)!=null&&t.isEnabled()&&(Q("[Encryption] Retrying Firebase key load..."),ee=await nn()),!ee&&(Q("[Encryption] No existing key found - starting first-time setup"),ec=!0,ee=await sD(),!ee))return(((n=window.logger)==null?void 0:n.error)||console.error)("[Encryption] Failed to generate key file"),!1;(((i=window.logger)==null?void 0:i.debug)||console.debug)(`[Encryption] Key ready (source: ${ct})`),ct==="local"&&(Q("[Encryption] Key loaded from local - syncing to Firebase..."),await rD(ee)),Q("[Encryption] Step 2: Loading salt..."),ge=await Ed();const c=!ge;Q(ge?`[Encryption] Salt loaded (${new Uint8Array(ge).length} bytes)`:"[Encryption] No saved salt - will generate new one");let l;return ec?l=await dD(c):l=await fD(c),l&&(Ni=!0),at=!1,l}catch(c){return(((s=window.logger)==null?void 0:s.error)||console.error)("[Encryption] Init FAILED:",c.message),(((o=window.logger)==null?void 0:o.error)||console.error)("[Encryption] Stack:",c.stack),ee=null,at=!1,!1}}async function gD(){var e;const r=window.CryptoUtils;if(Ni)return!!fe;if(at)return ni||!1;if(at=!0,!r)return at=!1,!1;try{const t=await Kc();if(!t)return Q("[Encryption] Silent init: no session password - skipping"),at=!1,!1;if(ee=await nn(),!ee)return at=!1,!1;ge=await Ed();const n=!ge,i=await r.createMasterKey(t,ee,ge);return fe=i.key,ge=i.salt,n&&await mo(ge),(await yo(fe)).verified?(Ni=!0,ee=null,Q("[Encryption] Silent init SUCCESS"),at=!1,!0):(fe=null,ee=null,at=!1,!1)}catch(t){return(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] Silent init failed:",t.message),ee=null,at=!1,!1}}async function vI(){var t,n,i,s,o,c;const r=window.CryptoUtils;if(!r)return{success:!1,error:"CryptoUtils not available"};if(!await tD("passwordChange"))return window.showToast&&window.showToast("다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요.","warning"),{success:!1,error:"Another password operation in progress"};try{let u=0,d=null;for(;u<3;){const f=await lD();if(!f.allowed)return window.showToast&&window.showToast(`복구 시도 횟수를 초과했습니다.
${f.lockoutMinutes}분 후에 다시 시도해주세요.`,"error"),{success:!1,error:"Rate limited"};const g=await cD();if(!g)return{success:!1,error:"Cancelled"};if(Qr("복구 키 검증 중..."),d=await aD(g),d)break;if(u++,rr(),u>=3)return window.showToast&&window.showToast("복구 키 시도 횟수를 초과했습니다. (3회)","error"),{success:!1,error:"Max retries exceeded"};window.showToast&&window.showToast("복구 키가 올바르지 않습니다. ("+u+"/3)"+(f.remaining>0?`
남은 전체 시도: `+f.remaining+"회":""),"error")}Qr("마스터 키 검증 중...");try{if(!(await yo(d)).verified)return rr(),window.showToast&&window.showToast(`복구된 키로 데이터를 검증할 수 없습니다.
복구 블롭이 오래되었거나 손상되었을 수 있습니다.`,"error"),{success:!1,error:"Key verification failed"};await uD(),Qr("키 파일 로드 중...");let g=ee||await nn();if(!g){if(rr(),((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&confirm(`키 파일을 찾을 수 없습니다.
키 파일을 가져오시겠습니까?`)){const j=await _I();j!=null&&j.success&&(g=ee||await nn())}if(!g)return window.showToast&&window.showToast(`키 파일을 불러올 수 없습니다.
키 파일 내보내기로 백업한 .key 파일을 가져오거나,
Firebase 연결을 확인해주세요.`,"error"),{success:!1,error:"Key file not found"}}rr();const _=await II();if(!_)return{success:!1,error:"New password cancelled"};Qr("새 마스터 키 생성 중...");const R=await r.createMasterKey(_,g,null),k=R.key,T=R.salt,x=d,M=[];try{if((n=window.firebaseConfig)!=null&&n.isEnabled()&&window.firestoreDb){const K=window.firebaseConfig.getDb();if(K){const W=["soil","water","pesticide","compost","heavyMetal"],j=new Date().getFullYear();let E=0;const y=W.length*(j-2020+1);for(const w of W)for(let v=2020;v<=j;v++){E++,Qr(`데이터 재암호화 중... (${E}/${y})`);const b=window.firestoreDb.getCollectionName(w,v);await Lg(K,b,x,k),M.push(b)}}}}catch(K){(((i=window.logger)==null?void 0:i.error)||console.error)("[Encryption] Recovery re-encryption failed, rolling back...",K);const W=[];if(M.length>0&&((s=window.firebaseConfig)!=null&&s.isEnabled())){const j=window.firebaseConfig.getDb();if(j)for(const E of M)try{await Lg(j,E,k,x)}catch(y){(((o=window.logger)==null?void 0:o.error)||console.error)(`[Encryption] Rollback FAILED: ${E}`,y.message),W.push(E)}}return rr(),W.length>0?window.showToast&&window.showToast(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${W.join(", ")}. 관리자에게 문의하세요.`,"error"):window.showToast&&window.showToast("재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요.","error"),{success:!1,error:"Re-encryption failed, rolled back"}}Qr("설정 저장 중..."),ge=T,await mo(T),fe=k,Ni=!0,ee=null,await vd(_);const F=await jc(k);return rr(),F&&await Gc(F),Q("[Encryption] Password recovery completed successfully"),window.showToast&&window.showToast("비밀번호가 성공적으로 복구되었습니다.","success"),{success:!0}}catch(f){return rr(),(((c=window.logger)==null?void 0:c.error)||console.error)("[Encryption] Password recovery failed:",f),window.showToast&&window.showToast("비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요.","error"),{success:!1,error:f.message}}}finally{await nD("passwordChange")}}async function mD(){return fe?{success:!1,error:"Not implemented in abbreviated version"}:(window.showToast&&window.showToast("암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요.","warning"),{success:!1,error:"Encryption not active"})}async function yD(r){var n;const e=window.CryptoUtils;if(!r||typeof r!="string")return!1;const t=await Kc();if(t&&eD(r,t))return!0;try{const i=ee||await nn();if(!i||!ge||!e)return!1;const s=await e.createMasterKey(r,i,ge);return(await yo(s.key)).verified}catch(i){return(((n=window.logger)==null?void 0:n.warn)||console.warn)("[Encryption] verifyPassword failed:",i.message),!1}}async function _D(){var r;return fe?!0:((((r=window.logger)==null?void 0:r.warn)||console.warn)("[Encryption] verifyPasswordForExport: no active key"),!1)}async function wD(){var r;if(!fe)return{success:!1,message:"암호화가 활성화되지 않았습니다."};try{const e=await jc(fe);return e?(await Gc(e),{success:!0,message:"복구 키가 재발급되었습니다."}):{success:!1,message:"복구 키 생성에 실패했습니다."}}catch(e){return(((r=window.logger)==null?void 0:r.error)||console.error)("[Encryption] regenerateRecoveryKey error:",e),{success:!1,message:e.message}}}function ID(){return!!fe}function ED(){return fe}function vD(){return ct}function bd(){if(fe=null,ee&&typeof ee=="string")try{const r=crypto.getRandomValues(new Uint8Array(ee.length));ee=String.fromCharCode(...r)}catch{}ee=null,ge=null,Ni=!1,at=!1,ni=null,ct=null,ec=!1;try{sessionStorage.removeItem(Id)}catch{}}function TD(){bd()}async function bD(){var r,e;if((r=window.firebaseConfig)!=null&&r.isEnabled()){const t=window.firebaseConfig.getDb();if(t){const n=Pt();try{await t.collection(n).doc("encryptionKey").delete(),Q(`[Encryption] Deleted ${n}/encryptionKey from Firebase`)}catch(i){(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Encryption] Firebase key delete failed:",i.message)}}}return bd(),await EI()}function TI(){Jt&&(Jt(),Jt=null)}const AD={init:EI,initSilent:gD,isReady:ID,getKey:ED,getKeySource:vD,destroy:bd,reset:TD,regenerateKey:bD,verifyPassword:yD,verifyPasswordForExport:_D,changePassword:mD,recoverPassword:vI,checkRecoveryBlobExists:Td,regenerateRecoveryKey:wD,exportKeyFile:yI,importKeyFile:_I,_cleanupModal:TI};window.encryptionManager=AD;window.addEventListener("beforeunload",()=>{TI()});var SD={};const bI=(()=>{var r;if(typeof process<"u"&&SD)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),qe=(...r)=>{var e;bI&&(((e=window.logger)==null?void 0:e.info)||console.log)("[Firestore]",...r)},Is={maxRetries:3,retryDelay:2e3,maxDelay:8e3};async function Wc(r,e){let t;for(let n=1;n<=Is.maxRetries;n++)try{return await r()}catch(i){t=i;const s=["permission-denied","unauthenticated","invalid-argument","not-found"],o=i.code;if(o&&s.includes(o)){qe(`재시도 불가 에러 (${e}):`,o);break}if(n<Is.maxRetries){const c=Math.min(Is.retryDelay*Math.pow(2,n-1),Is.maxDelay);qe(`${e} 실패 (${n}/${Is.maxRetries}), ${c}ms 후 재시도:`,o||i.message),await new Promise(l=>setTimeout(l,c))}}throw qe(`${e} 최종 실패:`,t),t}const Ug="test_",RD={soil:"soilSamples",water:"waterSamples",compost:"compostSamples",heavyMetal:"heavyMetalSamples","heavy-metal":"heavyMetalSamples",pesticide:"pesticideSamples"};function Lr(r,e){var i,s,o;const t=RD[r]||r,n=`${Ug}${t}_${e}`;return bI&&(((i=window.logger)==null?void 0:i.debug)||console.log)(`[Firestore] Collection name: ${n} (prefix: "${Ug}", base: ${t}, year: ${e})`),n.startsWith("test_")?n:((((s=window.logger)==null?void 0:s.warn)||console.warn)(`[Firestore] WARNING: Collection name missing 'test_' prefix: ${n}`),(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Firestore] Forcing test_ prefix..."),`test_${t}_${e}`)}function Bo(r){return r==null?"":String(r)}function PD(r){return Array.isArray(r)?r.map(e=>({...e,id:Bo(e.id)})):r}async function Cu(r,e,t,n){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!1;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>Cu(r,e,t,n),{type:"firebase-save",description:`${r} ${e}년 문서 ${t} 저장`,sampleType:r,year:e,docId:t}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;try{return await Wc(async()=>{const s=window.firebaseConfig.getDb();if(!s)return!1;const o=Lr(r,e),c=Bo(t),l={...n,id:c,updatedAt:De.firestore.FieldValue.serverTimestamp()};return l.createdAt||(l.createdAt=De.firestore.FieldValue.serverTimestamp()),await s.collection(o).doc(c).set(l,{merge:!0}),qe(`저장 완료: ${o}/${c}`),!0},"saveDocument")}catch(s){return window.networkStatus&&window.networkStatus.queueOperation(()=>Cu(r,e,t,n),{type:"firebase-save",description:`${r} ${e}년 문서 ${t} 저장 (재시도)`,sampleType:r,year:e,docId:t}),window.ErrorHandler&&window.ErrorHandler.handle(s,"FIREBASE_SYNC",{silent:!1}),!1}}async function CD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=Lr(r,e),c=await s.collection(o).doc(t).get();return c.exists?{id:c.id,...c.data()}:null}catch(s){return window.ErrorHandler?window.ErrorHandler.handle(s,"FIREBASE_LOAD",{silent:!0}):(((i=window.logger)==null?void 0:i.error)||console.error)("Firestore 조회 실패:",s),null}}async function kD(r,e,t={}){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return[];try{return await Wc(async()=>{const i=window.firebaseConfig.getDb();if(!i)return[];const s=Lr(r,e),o=await i.collection(s).get(),c=[];return o.forEach(l=>{const u=l.data();c.push({...u,id:Bo(u.id||l.id)})}),c.length>0&&c.sort((l,u)=>{var g,_,R,k;const d=((g=l.createdAt)==null?void 0:g.seconds)||((_=l.updatedAt)==null?void 0:_.seconds)||0,f=((R=u.createdAt)==null?void 0:R.seconds)||((k=u.updatedAt)==null?void 0:k.seconds)||0;return d-f}),qe(`조회 완료: ${s}, ${c.length}건`),PD(c)},"getAllDocuments")}catch(i){return window.ErrorHandler&&window.ErrorHandler.handle&&window.ErrorHandler.handle(i,"FIREBASE_LOAD",{silent:!0}),[]}}async function ku(r,e,t){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return!1;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>ku(r,e,t),{type:"firebase-delete",description:`${r} ${e}년 문서 ${t} 삭제`,sampleType:r,year:e,docId:t}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;try{return await Wc(async()=>{const i=window.firebaseConfig.getDb();if(!i)return!1;const s=Lr(r,e),o=Bo(t),c=parseInt(o,10);if(!o)return!1;const l=i.collection(s).doc(o);if((await l.get()).exists)return await l.delete(),qe(`삭제 완료: ${s}/${o}`),!0;let d=await i.collection(s).where("id","==",o).get();if(d.empty&&!isNaN(c)&&(d=await i.collection(s).where("id","==",c).get()),d.empty)return qe(`삭제 대상 없음: ${s}/${o}`),!1;const f=[];return d.forEach(g=>{f.push(g.ref.delete())}),await Promise.all(f),qe(`삭제 완료 (쿼리): ${s}/${o} (${d.size}건)`),!0},"deleteDocument")}catch(i){return window.networkStatus&&window.networkStatus.queueOperation(()=>ku(r,e,t),{type:"firebase-delete",description:`${r} ${e}년 문서 ${t} 삭제 (재시도)`,sampleType:r,year:e,docId:t}),window.ErrorHandler&&window.ErrorHandler.handle(i,"FIREBASE_SYNC",{silent:!1}),!1}}async function tc(r,e,t,n={}){var o;if(!((o=window.firebaseConfig)!=null&&o.isEnabled())||!t.length)return!1;const{signal:i}=n;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>tc(r,e,t,n),{type:"firebase-batch",description:`${r} ${e}년 데이터 ${t.length}건 일괄 동기화`,sampleType:r,year:e,count:t.length}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;const s="firebaseBatchSave";try{return await Wc(async()=>{const c=window.firebaseConfig.getDb();if(!c)return!1;const l=Lr(r,e),u=500,d=[];for(let f=0;f<t.length;f+=u)d.push(t.slice(f,f+u));qe(`배치 저장 시작: ${l}, ${t.length}건 (${d.length} 청크)`),window.loadingManager&&window.loadingManager.show(s,`Firebase 동기화 중... (0/${d.length})`,{showProgress:!0,cancellable:!0,onCancel:()=>{qe("사용자가 배치 저장을 취소했습니다.")}});for(let f=0;f<d.length;f++){if(i!=null&&i.aborted)throw qe("배치 저장이 취소되었습니다."),new DOMException("작업이 취소되었습니다.","AbortError");const g=d[f],_=c.batch();g.forEach(k=>{const T=Bo(k.id),x=c.collection(l).doc(T),M={...k,id:T,updatedAt:De.firestore.FieldValue.serverTimestamp()};M.createdAt||(M.createdAt=De.firestore.FieldValue.serverTimestamp()),_.set(x,M,{merge:!0})}),await _.commit();const R=(f+1)/d.length*100;window.loadingManager&&window.loadingManager.updateProgress(s,R,`Firebase 동기화 중... (${f+1}/${d.length})`),qe(`배치 진행률: ${Math.round(R)}% (${f+1}/${d.length} 청크)`)}return qe(`배치 저장 완료: ${t.length}건`),!0},"batchSave")}catch(c){return c.name==="AbortError"?(typeof window.showToast=="function"&&window.showToast("동기화가 취소되었습니다.","info"),!1):(window.networkStatus&&window.networkStatus.queueOperation(()=>tc(r,e,t,n),{type:"firebase-batch",description:`${r} ${e}년 데이터 ${t.length}건 일괄 동기화 (재시도)`,sampleType:r,year:e,count:t.length}),window.ErrorHandler&&window.ErrorHandler.handle(c,"FIREBASE_SYNC",{silent:!1}),!1)}finally{window.loadingManager&&window.loadingManager.hide(s)}}async function DD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return{success:!1,count:0};try{const s=localStorage.getItem(t);if(!s)return qe("마이그레이션할 데이터가 없습니다."),{success:!0,count:0};const o=JSON.parse(s);if(!Array.isArray(o)||o.length===0)return{success:!0,count:0};const c=o.map(l=>({...l,id:l.id||ND()}));return await tc(r,e,c),qe(`마이그레이션 완료: ${t} → Firestore (${c.length}건)`),{success:!0,count:c.length}}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("마이그레이션 실패:",s),{success:!1,count:0}}}function xD(){return typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),r=>r.toString(36)).join("").substring(0,9)}function ND(){return xD()}function VD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=Lr(r,e),c=s.collection(o).onSnapshot(l=>{const u=[];l.forEach(d=>{u.push({id:d.id,...d.data()})}),t(u,l.metadata.fromCache)},l=>{var u;(((u=window.logger)==null?void 0:u.error)||console.error)("실시간 동기화 에러:",l)});return qe(`실시간 동기화 시작: ${o}`),c}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("실시간 동기화 설정 실패:",s),null}}function OD(){var r;return((r=window.firebaseConfig)==null?void 0:r.isEnabled())===!0}function MD(){var r;return((r=window.firebaseConfig)==null?void 0:r.isOfflineSupported())===!0}window.firestoreDb={init:async function(){return qe("firestoreDb.init() 호출됨 (no-op)"),!0},save:Cu,get:CD,getAll:kD,delete:ku,batchSave:tc,migrate:DD,subscribe:VD,isEnabled:OD,isOfflineEnabled:MD,getCollectionName:Lr};const ve={LOCAL_ONLY:"local",CLOUD_SYNC:"cloud",CLOUD_ONLY:"cloudOnly"};let tt=ve.LOCAL_ONLY;const FD=(...r)=>{},un={lastSyncTime:null,pendingChanges:0,isOnline:navigator.onLine};window.addEventListener("online",()=>{un.isOnline=!0,AI()});window.addEventListener("offline",()=>{un.isOnline=!1});async function LD(){var n,i,s;const r=localStorage.getItem("storageMode"),e=Object.values(ve);let t=!1;if((n=window.firebaseConfig)!=null&&n.initialize)try{await window.firebaseConfig.initialize()&&(await((i=window.firestoreDb)==null?void 0:i.init()),t=!0)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Storage] Firebase 초기화 실패:",o)}return r&&e.includes(r)?(r===ve.CLOUD_SYNC||r===ve.CLOUD_ONLY)&&!t?tt=ve.LOCAL_ONLY:tt=r:tt=t?ve.CLOUD_SYNC:ve.LOCAL_ONLY,tt}function UD(r){var t;return Object.values(ve).includes(r)?(r===ve.CLOUD_SYNC||r===ve.CLOUD_ONLY)&&!((t=window.firestoreDb)!=null&&t.isEnabled())?{success:!1,message:"Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다."}:(tt=r,localStorage.setItem("storageMode",r),window.dispatchEvent(new CustomEvent("storage-mode-changed",{detail:{mode:r}})),{success:!0,message:`저장 모드가 변경되었습니다: ${r}`}):{success:!1,message:`유효하지 않은 모드: ${r}`}}function BD(){var e;const r=((e=window.firestoreDb)==null?void 0:e.isEnabled())||!1;return[{value:ve.LOCAL_ONLY,label:"로컬 저장소만",description:"이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.",available:!0},{value:ve.CLOUD_SYNC,label:"클라우드 동기화",description:"로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.",available:r},{value:ve.CLOUD_ONLY,label:"클라우드 전용",description:"Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.",available:r}]}async function $D(r,e,t,n){var i,s;try{if(localStorage.setItem(t,JSON.stringify(n)),FD(`localStorage 저장: ${t}`),tt===ve.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())){const o=n.map(c=>({...c,id:c.id||Ad()}));await window.firestoreDb.batchSave(r,e,o),un.lastSyncTime=new Date}return!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("데이터 저장 실패:",o),!1}}async function qD(r,e,t,n){var i,s;try{const o=JSON.parse(localStorage.getItem(t)||"[]"),c={...n,id:n.id||Ad()},l=o.findIndex(u=>u.id===c.id);return l>=0?o[l]=c:o.push(c),localStorage.setItem(t,JSON.stringify(o)),tt===ve.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.save(r,e,c.id,c),un.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 저장 실패:",o),!1}}async function zD(r,e,t){var n,i;try{if(tt===ve.CLOUD_SYNC&&((n=window.firestoreDb)!=null&&n.isEnabled())){const o=await window.firestoreDb.getAll(r,e);if(o.length>0)return localStorage.setItem(t,JSON.stringify(o)),un.lastSyncTime=new Date,o}const s=localStorage.getItem(t);return s?JSON.parse(s):[]}catch(s){(((i=window.logger)==null?void 0:i.error)||console.error)("데이터 로드 실패:",s);const o=localStorage.getItem(t);return o?JSON.parse(o):[]}}async function KD(r,e,t,n){var i,s;try{const c=JSON.parse(localStorage.getItem(t)||"[]").filter(l=>l.id!==n);return localStorage.setItem(t,JSON.stringify(c)),tt===ve.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.delete(r,e,n),un.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 삭제 실패:",o),!1}}function jD(r,e,t,n){var i;return tt!==ve.CLOUD_SYNC||!((i=window.firestoreDb)!=null&&i.isEnabled())?null:window.firestoreDb.subscribe(r,e,(s,o)=>{localStorage.setItem(t,JSON.stringify(s)),n(s,o),o||(un.lastSyncTime=new Date)})}async function GD(r,e,t){return tt!==ve.CLOUD_SYNC?{success:!1,count:0,message:"클라우드 동기화 모드가 아닙니다."}:await window.firestoreDb.migrate(r,e,t)}async function AI(){tt!==ve.CLOUD_SYNC||!un.isOnline||window.dispatchEvent(new CustomEvent("storage-sync-requested"))}function Ad(){var r;return typeof window<"u"&&((r=window.SampleUtils)!=null&&r.generateUUID)?window.SampleUtils.generateUUID():typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),e=>e.toString(36)).join("").substring(0,9)}function WD(){return tt}function HD(){var r,e;return{...un,mode:tt,isCloudEnabled:((r=window.firestoreDb)==null?void 0:r.isEnabled())||!1,isOfflineSupported:((e=window.firestoreDb)==null?void 0:e.isOfflineEnabled())||!1}}function QD(){return tt===ve.CLOUD_SYNC}window.storageManager={init:LD,save:$D,saveItem:qD,load:zD,delete:KD,subscribe:jD,migrate:GD,sync:AI,getMode:WD,setMode:UD,getAvailableModes:BD,getStatus:HD,isCloudEnabled:QD,generateId:Ad,MODES:ve}});export default YD();
