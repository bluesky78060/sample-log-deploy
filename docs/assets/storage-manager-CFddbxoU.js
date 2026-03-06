var ZI=Object.defineProperty;var eE=(r,e,t)=>e in r?ZI(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var tE=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var ls=(r,e,t)=>eE(r,typeof e!="symbol"?e+"":e,t);var KD=tE((tx,ba)=>{window.NETWORK_CONFIG={ALLOWED_GATEWAY:"111.21.101.254"};const ku={STORAGE_KEY:"networkAccessConfig",GATEWAY_STORAGE_KEY:"networkGatewayIP",getAllowedGateway(){var r;try{const e=localStorage.getItem(this.GATEWAY_STORAGE_KEY);if(e)return e}catch{}return((r=window.NETWORK_CONFIG)==null?void 0:r.ALLOWED_GATEWAY)||null},saveGateway(r){try{localStorage.setItem(this.GATEWAY_STORAGE_KEY,r),window.logger&&window.logger.info("[NetworkAccess] 게이트웨이 저장됨:",r)}catch(e){window.logger&&window.logger.error("[NetworkAccess] 게이트웨이 저장 실패:",e)}},removeGateway(){try{localStorage.removeItem(this.GATEWAY_STORAGE_KEY),window.logger&&window.logger.info("[NetworkAccess] 게이트웨이 삭제됨")}catch{}},defaultConfig:{adminIPs:[],timeout:5e3},_currentIP:null,_lastCheck:null,_cacheTimeout:6e4,loadConfig(){try{const r=localStorage.getItem(this.STORAGE_KEY);if(r)return{...this.defaultConfig,...JSON.parse(r)}}catch(r){window.logger&&window.logger.error("[NetworkAccess] 설정 로드 실패:",r)}return{...this.defaultConfig}},saveConfig(r){try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(r)),window.logger&&window.logger.info("[NetworkAccess] 설정 저장됨:",r)}catch(e){window.logger&&window.logger.error("[NetworkAccess] 설정 저장 실패:",e)}},async getCurrentIP(r){if(this._currentIP&&this._lastCheck&&Date.now()-this._lastCheck<this._cacheTimeout)return this._currentIP;const e=r||this.loadConfig().timeout;try{const t=new AbortController,n=setTimeout(()=>t.abort(),e),i=await fetch("https://api.ipify.org?format=json",{signal:t.signal});clearTimeout(n);const s=await i.json();return this._currentIP=s.ip,this._lastCheck=Date.now(),window.logger&&window.logger.info("[NetworkAccess] 현재 IP:",this._currentIP),this._currentIP}catch(t){return window.logger&&window.logger.warn("[NetworkAccess] IP 조회 실패:",t.message),null}},getSubnetPrefix(r){if(!r)return"";const e=r.split(".");return e.length!==4?"":e.slice(0,3).join(".")+"."},async checkAccess(){var i;if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0)return{allowed:!0,reason:"Electron 환경 (항상 허용)",ip:null};if(window.location.protocol==="file:")return{allowed:!0,reason:"Electron 로컬 실행",ip:null};const r=this.getAllowedGateway();if(!r)return window.logger&&window.logger.warn("[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요"),{allowed:!1,reason:"게이트웨이 미설정",ip:null,needsSetup:!0};const e=this.getSubnetPrefix(r),t=await this.getCurrentIP();if(!t)return window.logger&&window.logger.warn("[NetworkAccess] IP 확인 불가 - 접근 거부"),{allowed:!1,reason:"IP 확인 불가",ip:null};if(t.startsWith(e))return window.logger&&window.logger.info("[NetworkAccess] 허용된 네트워크:",t),{allowed:!0,reason:`허용된 네트워크 (${r})`,ip:t};const n=this.loadConfig();return n.adminIPs&&n.adminIPs.includes(t)?{allowed:!0,reason:"관리자 IP",ip:t}:(window.logger&&window.logger.warn("[NetworkAccess] 허용되지 않은 네트워크:",t),{allowed:!1,reason:`허용되지 않은 네트워크 (허용: ${e}x)`,ip:t})},async isAllowed(){return(await this.checkAccess()).allowed},addAdminIP(r){const e=this.loadConfig();e.adminIPs.includes(r)||(e.adminIPs.push(r),this.saveConfig(e))},removeAdminIP(r){const e=this.loadConfig();e.adminIPs=e.adminIPs.filter(t=>t!==r),this.saveConfig(e)},async registerCurrentAsAdmin(){const r=await this.getCurrentIP();return r?(this.addAdminIP(r),r):null},resetConfig(){localStorage.removeItem(this.STORAGE_KEY),localStorage.removeItem(this.GATEWAY_STORAGE_KEY),this._currentIP=null,this._lastCheck=null,window.logger&&window.logger.info("[NetworkAccess] 설정 초기화됨")},async printStatus(){var s;const r=this.loadConfig(),e=await this.getCurrentIP(),t=await this.checkAccess(),n=((s=window.electronAPI)==null?void 0:s.isElectron)===!0||window.location.protocol==="file:",i=this.getAllowedGateway();return console.log("========================================"),window.logger&&window.logger.info("[NetworkAccess] 현재 상태"),console.log("========================================"),console.log("환경:",n?"Electron (네트워크 체크 안함)":"웹 (네트워크 체크 활성화)"),console.log("허용된 게이트웨이:",i||"설정 없음"),console.log("허용된 서브넷:",i?this.getSubnetPrefix(i)+"x":"없음"),console.log("현재 공인 IP:",e||"확인 불가"),console.log("접근 허용:",t.allowed,`(${t.reason})`),console.log("관리자 IP (예외):",r.adminIPs||[]),console.log("========================================"),{config:r,currentIP:e,access:t,isElectron:n,allowedGateway:i}},showGatewaySetupModal(){return new Promise(r=>{const e=document.getElementById("gatewaySetupModal");e&&e.remove();const t=document.documentElement.getAttribute("data-theme")==="dark",n=document.createElement("div");n.id="gatewaySetupModal",n.style.cssText=`
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
            `,n.appendChild(i),document.body.appendChild(n);const s=document.getElementById("gatewayIPInput"),o=document.getElementById("gatewaySaveBtn"),c=document.getElementById("gatewaySkipBtn");s.focus();function l(u){const d=u.trim().split(".");return d.length!==4?!1:d.every(p=>{const g=Number(p);return Number.isInteger(g)&&g>=0&&g<=255})}s.addEventListener("focus",()=>{s.style.borderColor="#7C9082",s.style.boxShadow="0 0 0 3px rgba(124, 144, 130, 0.12)"}),s.addEventListener("blur",()=>{s.style.borderColor=t?"#57534E":"#E8E4DF",s.style.boxShadow="none"}),s.addEventListener("keydown",u=>{u.key==="Enter"&&o.click()}),o.addEventListener("click",()=>{const u=s.value.trim();if(!u){s.style.borderColor="#dc2626",s.placeholder="IP 주소를 입력하세요";return}if(!l(u)){s.style.borderColor="#dc2626",s.value="",s.placeholder="올바른 IP 형식: 0~255.0~255.0~255.0~255";return}ku.saveGateway(u),n.remove(),r(u)}),c.addEventListener("click",()=>{n.remove(),r(null)})})},async promptGatewayIfNeeded(){var e;return((e=window.electronAPI)==null?void 0:e.isElectron)===!0||window.location.protocol==="file:"||this.getAllowedGateway()?!0:!!await this.showGatewaySetupModal()}};window.NetworkAccess=ku;var Ug;if(((Ug=window.electronAPI)==null?void 0:Ug.isElectron)===!0||window.location.protocol==="file:")window.logger&&window.logger.info("[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)");else{const r=ku.getAllowedGateway();window.logger&&(window.logger.info("[NetworkAccess] 웹 환경 - 네트워크 체크 활성화"),r?window.logger.info(`[NetworkAccess] 허용된 게이트웨이: ${r}`):window.logger.warn("[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요"))}const nE=()=>{};var Rf={};/**
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
 */const Bg=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},rE=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],l=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(l>>10)),e[n++]=String.fromCharCode(56320+(l&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},$g={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,l=i+2<r.length,u=l?r[i+2]:0,d=s>>2,p=(s&3)<<4|c>>4;let g=(c&15)<<2|u>>6,I=u&63;l||(I=64,o||(g=64)),n.push(t[d],t[p],t[g],t[I])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(Bg(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):rE(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const u=i<r.length?t[r.charAt(i)]:64;++i;const p=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||u==null||p==null)throw new iE;const g=s<<2|c>>4;if(n.push(g),u!==64){const I=c<<4&240|u>>2;if(n.push(I),p!==64){const P=u<<6&192|p;n.push(P)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class iE extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const sE=function(r){const e=Bg(r);return $g.encodeByteArray(e,!0)},Aa=function(r){return sE(r).replace(/\./g,"")},Du=function(r){try{return $g.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function Sa(r,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:r===void 0&&(r={});break;case Array:r=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!oE(t)||(r[t]=Sa(r[t],e[t]));return r}function oE(r){return r!=="__proto__"}/**
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
 */function xu(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const aE=()=>xu().__FIREBASE_DEFAULTS__,cE=()=>{if(typeof process>"u"||typeof Rf>"u")return;const r=Rf.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},lE=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&Du(r[1]);return e&&JSON.parse(e)},Nu=()=>{try{return nE()||aE()||cE()||lE()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},Vu=()=>{var r;return(r=Nu())==null?void 0:r.config},uE=r=>{var e;return(e=Nu())==null?void 0:e[`_${r}`]};/**
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
 */class hE{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
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
 */function Vi(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function qg(r){return(await fetch(r,{credentials:"include"})).ok}/**
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
 */function dE(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Aa(JSON.stringify(t)),Aa(JSON.stringify(o)),""].join(".")}const Ps={};function fE(){const r={prod:[],emulator:[]};for(const e of Object.keys(Ps))Ps[e]?r.emulator.push(e):r.prod.push(e);return r}function pE(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let Pf=!1;function zg(r,e){if(typeof window>"u"||typeof document>"u"||!Vi(window.location.host)||Ps[r]===e||Ps[r]||Pf)return;Ps[r]=e;function t(g){return`__firebase__banner__${g}`}const n="__firebase__banner",s=fE().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function l(g,I){g.setAttribute("width","24"),g.setAttribute("id",I),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function u(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{Pf=!0,o()},g}function d(g,I){g.setAttribute("id",I),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function p(){const g=pE(n),I=t("text"),P=document.getElementById(I)||document.createElement("span"),D=t("learnmore"),T=document.getElementById(D)||document.createElement("a"),V=t("preprendIcon"),M=document.getElementById(V)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const B=g.element;c(B),d(T,D);const j=u();l(M,V),B.append(M,P,T,j),document.body.appendChild(B)}s?(P.innerText="Preview backend disconnected.",M.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
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
</defs>`,P.innerText="Preview backend running in this workspace."),P.setAttribute("id",I)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function _e(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function gE(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(_e())}function tc(){var e;const r=(e=Nu())==null?void 0:e.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function mE(){return typeof window<"u"||Kg()}function Kg(){return typeof WorkerGlobalScope<"u"&&typeof self<"u"&&self instanceof WorkerGlobalScope}function yE(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function jg(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Ou(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Gg(){const r=_e();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function Wg(){return!tc()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Hg(){return!tc()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function zs(){try{return typeof indexedDB=="object"}catch{return!1}}function _E(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)==null?void 0:s.message)||"")}}catch(t){e(t)}})}/**
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
 */const wE="FirebaseError";class nt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=wE,Object.setPrototypeOf(this,nt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Dr.prototype.create)}}class Dr{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?IE(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new nt(i,c,n)}}function IE(r,e){return r.replace(EE,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const EE=/\{\$([^}]+)}/g;/**
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
 */function Cf(r,e){return Object.prototype.hasOwnProperty.call(r,e)}function vE(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function kn(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(kf(s)&&kf(o)){if(!kn(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function kf(r){return r!==null&&typeof r=="object"}/**
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
 */function Oi(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function ti(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Is(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function Qg(r,e){const t=new TE(r,e);return t.subscribe.bind(t)}class TE{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");bE(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=yl),i.error===void 0&&(i.error=yl),i.complete===void 0&&(i.complete=yl);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function bE(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function yl(){}/**
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
 */function K(r){return r&&r._delegate?r._delegate:r}class zt{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const rr="[DEFAULT]";/**
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
 */class AE{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new hE;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),n=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(n)return null;throw i}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(RE(e))try{this.getOrInitializeService({instanceIdentifier:rr})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=rr){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=rr){return this.instances.has(e)}getOptions(e=rr){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(n)??new Set;i.add(e),this.onInitCallbacks.set(n,i);const s=this.instances.get(n);return s&&e(s,n),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:SE(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=rr){return this.component?this.component.multipleInstances?e:rr:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function SE(r){return r===rr?void 0:r}function RE(r){return r.instantiationMode==="EAGER"}/**
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
 */class Yg{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new AE(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */const Mu=[];var J;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(J||(J={}));const Jg={debug:J.DEBUG,verbose:J.VERBOSE,info:J.INFO,warn:J.WARN,error:J.ERROR,silent:J.SILENT},PE=J.INFO,CE={[J.DEBUG]:"log",[J.VERBOSE]:"log",[J.INFO]:"info",[J.WARN]:"warn",[J.ERROR]:"error"},kE=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=CE[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class nc{constructor(e){this.name=e,this._logLevel=PE,this._logHandler=kE,this._userLogHandler=null,Mu.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in J))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Jg[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,J.DEBUG,...e),this._logHandler(this,J.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,J.VERBOSE,...e),this._logHandler(this,J.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,J.INFO,...e),this._logHandler(this,J.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,J.WARN,...e),this._logHandler(this,J.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,J.ERROR,...e),this._logHandler(this,J.ERROR,...e)}}function DE(r){Mu.forEach(e=>{e.setLogLevel(r)})}function xE(r,e){for(const t of Mu){let n=null;e&&e.level&&(n=Jg[e.level]),r===null?t.userLogHandler=null:t.userLogHandler=(i,s,...o)=>{const c=o.map(l=>{if(l==null)return null;if(typeof l=="string")return l;if(typeof l=="number"||typeof l=="boolean")return l.toString();if(l instanceof Error)return l.message;try{return JSON.stringify(l)}catch{return null}}).filter(l=>l).join(" ");s>=(n??i.logLevel)&&r({level:J[s].toLowerCase(),message:c,args:o,type:i.name})}}}const NE=(r,e)=>e.some(t=>r instanceof t);let Df,xf;function VE(){return Df||(Df=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function OE(){return xf||(xf=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Xg=new WeakMap,Fl=new WeakMap,Zg=new WeakMap,_l=new WeakMap,Fu=new WeakMap;function ME(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",o)},s=()=>{t(An(r.result)),i()},o=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Xg.set(t,r)}).catch(()=>{}),Fu.set(e,r),e}function FE(r){if(Fl.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",o),r.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",o),r.addEventListener("abort",o)});Fl.set(r,e)}let Ll={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return Fl.get(r);if(e==="objectStoreNames")return r.objectStoreNames||Zg.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return An(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function LE(r){Ll=r(Ll)}function UE(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(wl(this),e,...t);return Zg.set(n,e.sort?e.sort():[e]),An(n)}:OE().includes(r)?function(...e){return r.apply(wl(this),e),An(Xg.get(this))}:function(...e){return An(r.apply(wl(this),e))}}function BE(r){return typeof r=="function"?UE(r):(r instanceof IDBTransaction&&FE(r),NE(r,VE())?new Proxy(r,Ll):r)}function An(r){if(r instanceof IDBRequest)return ME(r);if(_l.has(r))return _l.get(r);const e=BE(r);return e!==r&&(_l.set(r,e),Fu.set(e,r)),e}const wl=r=>Fu.get(r);function $E(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const o=indexedDB.open(r,e),c=An(o);return n&&o.addEventListener("upgradeneeded",l=>{n(An(o.result),l.oldVersion,l.newVersion,An(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{s&&l.addEventListener("close",()=>s()),i&&l.addEventListener("versionchange",u=>i(u.oldVersion,u.newVersion,u))}).catch(()=>{}),c}const qE=["get","getKey","getAll","getAllKeys","count"],zE=["put","add","delete","clear"],Il=new Map;function Nf(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(Il.get(e))return Il.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=zE.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||qE.includes(t)))return;const s=async function(o,...c){const l=this.transaction(o,i?"readwrite":"readonly");let u=l.store;return n&&(u=u.index(c.shift())),(await Promise.all([u[t](...c),i&&l.done]))[0]};return Il.set(e,s),s}LE(r=>({...r,get:(e,t,n)=>Nf(e,t)||r.get(e,t,n),has:(e,t)=>!!Nf(e,t)||r.has(e,t)}));/**
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
 */class KE{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(jE(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function jE(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Ra="@firebase/app",Ul="0.14.6";/**
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
 */const Jt=new nc("@firebase/app"),GE="@firebase/app-compat",WE="@firebase/analytics-compat",HE="@firebase/analytics",QE="@firebase/app-check-compat",YE="@firebase/app-check",JE="@firebase/auth",XE="@firebase/auth-compat",ZE="@firebase/database",ev="@firebase/data-connect",tv="@firebase/database-compat",nv="@firebase/functions",rv="@firebase/functions-compat",iv="@firebase/installations",sv="@firebase/installations-compat",ov="@firebase/messaging",av="@firebase/messaging-compat",cv="@firebase/performance",lv="@firebase/performance-compat",uv="@firebase/remote-config",hv="@firebase/remote-config-compat",dv="@firebase/storage",fv="@firebase/storage-compat",pv="@firebase/firestore",gv="@firebase/ai",mv="@firebase/firestore-compat",yv="firebase",_v="12.6.0";/**
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
 */const Dn="[DEFAULT]",wv={[Ra]:"fire-core",[GE]:"fire-core-compat",[HE]:"fire-analytics",[WE]:"fire-analytics-compat",[YE]:"fire-app-check",[QE]:"fire-app-check-compat",[JE]:"fire-auth",[XE]:"fire-auth-compat",[ZE]:"fire-rtdb",[ev]:"fire-data-connect",[tv]:"fire-rtdb-compat",[nv]:"fire-fn",[rv]:"fire-fn-compat",[iv]:"fire-iid",[sv]:"fire-iid-compat",[ov]:"fire-fcm",[av]:"fire-fcm-compat",[cv]:"fire-perf",[lv]:"fire-perf-compat",[uv]:"fire-rc",[hv]:"fire-rc-compat",[dv]:"fire-gcs",[fv]:"fire-gcs-compat",[pv]:"fire-fst",[mv]:"fire-fst-compat",[gv]:"fire-vertex","fire-js":"fire-js",[yv]:"fire-js-all"};/**
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
 */const xn=new Map,ui=new Map,hi=new Map;function Ks(r,e){try{r.container.addComponent(e)}catch(t){Jt.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function em(r,e){r.container.addOrOverwriteComponent(e)}function Nn(r){const e=r.name;if(hi.has(e))return Jt.debug(`There were multiple attempts to register component ${e}.`),!1;hi.set(e,r);for(const t of xn.values())Ks(t,r);for(const t of ui.values())Ks(t,r);return!0}function tm(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function Iv(r,e,t=Dn){tm(r,e).clearInstance(t)}function Lu(r){return r.options!==void 0}function nm(r){return Lu(r)?!1:"authIdToken"in r||"appCheckToken"in r||"releaseOnDeref"in r||"automaticDataCollectionEnabled"in r}function ge(r){return r==null?!1:r.settings!==void 0}function Ev(){hi.clear()}/**
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
 */const vv={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},gt=new Dr("app","Firebase",vv);/**
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
 */let rm=class{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new zt("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw gt.create("app-deleted",{appName:this._name})}};/**
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
 */function Vf(r,e){const t=Du(r.split(".")[1]);if(t===null){console.error(`FirebaseServerApp ${e} is invalid: second part could not be parsed.`);return}if(JSON.parse(t).exp===void 0){console.error(`FirebaseServerApp ${e} is invalid: expiration claim could not be parsed`);return}const i=JSON.parse(t).exp*1e3,s=new Date().getTime();i-s<=0&&console.error(`FirebaseServerApp ${e} is invalid: the token has expired.`)}class Tv extends rm{constructor(e,t,n,i){const s=t.automaticDataCollectionEnabled!==void 0?t.automaticDataCollectionEnabled:!0,o={name:n,automaticDataCollectionEnabled:s};if(e.apiKey!==void 0)super(e,o,i);else{const c=e;super(c.options,o,i)}this._serverConfig={automaticDataCollectionEnabled:s,...t},this._serverConfig.authIdToken&&Vf(this._serverConfig.authIdToken,"authIdToken"),this._serverConfig.appCheckToken&&Vf(this._serverConfig.appCheckToken,"appCheckToken"),this._finalizationRegistry=null,typeof FinalizationRegistry<"u"&&(this._finalizationRegistry=new FinalizationRegistry(()=>{this.automaticCleanup()})),this._refCount=0,this.incRefCount(this._serverConfig.releaseOnDeref),this._serverConfig.releaseOnDeref=void 0,t.releaseOnDeref=void 0,Tt(Ra,Ul,"serverapp")}toJSON(){}get refCount(){return this._refCount}incRefCount(e){this.isDeleted||(this._refCount++,e!==void 0&&this._finalizationRegistry!==null&&this._finalizationRegistry.register(e,this))}decRefCount(){return this.isDeleted?0:--this._refCount}automaticCleanup(){Bu(this)}get settings(){return this.checkDestroyed(),this._serverConfig}checkDestroyed(){if(this.isDeleted)throw gt.create("server-app-deleted")}}/**
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
 */const qn=_v;function Uu(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:Dn,automaticDataCollectionEnabled:!0,...e},i=n.name;if(typeof i!="string"||!i)throw gt.create("bad-app-name",{appName:String(i)});if(t||(t=Vu()),!t)throw gt.create("no-options");const s=xn.get(i);if(s){if(kn(t,s.options)&&kn(n,s.config))return s;throw gt.create("duplicate-app",{appName:i})}const o=new Yg(i);for(const l of hi.values())o.addComponent(l);const c=new rm(t,n,o);return xn.set(i,c),c}function bv(r,e={}){if(mE()&&!Kg())throw gt.create("invalid-server-app-environment");let t,n=e||{};if(r&&(Lu(r)?t=r.options:nm(r)?n=r:t=r),n.automaticDataCollectionEnabled===void 0&&(n.automaticDataCollectionEnabled=!0),t||(t=Vu()),!t)throw gt.create("no-options");const i={...n,...t};i.releaseOnDeref!==void 0&&delete i.releaseOnDeref;const s=d=>[...d].reduce((p,g)=>Math.imul(31,p)+g.charCodeAt(0)|0,0);if(n.releaseOnDeref!==void 0&&typeof FinalizationRegistry>"u")throw gt.create("finalization-registry-not-supported",{});const o=""+s(JSON.stringify(i)),c=ui.get(o);if(c)return c.incRefCount(n.releaseOnDeref),c;const l=new Yg(o);for(const d of hi.values())l.addComponent(d);const u=new Tv(t,n,o,l);return ui.set(o,u),u}function Av(r=Dn){const e=xn.get(r);if(!e&&r===Dn&&Vu())return Uu();if(!e)throw gt.create("no-app",{appName:r});return e}function Sv(){return Array.from(xn.values())}async function Bu(r){let e=!1;const t=r.name;xn.has(t)?(e=!0,xn.delete(t)):ui.has(t)&&r.decRefCount()<=0&&(ui.delete(t),e=!0),e&&(await Promise.all(r.container.getProviders().map(n=>n.delete())),r.isDeleted=!0)}function Tt(r,e,t){let n=wv[r]??r;t&&(n+=`-${t}`);const i=n.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${n}" with version "${e}":`];i&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Jt.warn(o.join(" "));return}Nn(new zt(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}function im(r,e){if(r!==null&&typeof r!="function")throw gt.create("invalid-log-argument");xE(r,e)}function sm(r){DE(r)}/**
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
 */const Rv="firebase-heartbeat-database",Pv=1,js="firebase-heartbeat-store";let El=null;function om(){return El||(El=$E(Rv,Pv,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(js)}catch(t){console.warn(t)}}}}).catch(r=>{throw gt.create("idb-open",{originalErrorMessage:r.message})})),El}async function Cv(r){try{const t=(await om()).transaction(js),n=await t.objectStore(js).get(am(r));return await t.done,n}catch(e){if(e instanceof nt)Jt.warn(e.message);else{const t=gt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Jt.warn(t.message)}}}async function Of(r,e){try{const n=(await om()).transaction(js,"readwrite");await n.objectStore(js).put(e,am(r)),await n.done}catch(t){if(t instanceof nt)Jt.warn(t.message);else{const n=gt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Jt.warn(n.message)}}}function am(r){return`${r.name}!${r.options.appId}`}/**
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
 */const kv=1024,Dv=30;class xv{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Vv(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Mf();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>Dv){const o=Ov(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){Jt.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Mf(),{heartbeatsToSend:n,unsentEntries:i}=Nv(this._heartbeatsCache.heartbeats),s=Aa(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Jt.warn(t),""}}}function Mf(){return new Date().toISOString().substring(0,10)}function Nv(r,e=kv){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),Ff(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Ff(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class Vv{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return zs()?_E().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await Cv(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Of(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return Of(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function Ff(r){return Aa(JSON.stringify({version:2,heartbeats:r})).length}function Ov(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
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
 */function Mv(r){Nn(new zt("platform-logger",e=>new KE(e),"PRIVATE")),Nn(new zt("heartbeat",e=>new xv(e),"PRIVATE")),Tt(Ra,Ul,r),Tt(Ra,Ul,"esm2020"),Tt("fire-js","")}Mv("");const Fv=Object.freeze(Object.defineProperty({__proto__:null,FirebaseError:nt,SDK_VERSION:qn,_DEFAULT_ENTRY_NAME:Dn,_addComponent:Ks,_addOrOverwriteComponent:em,_apps:xn,_clearComponents:Ev,_components:hi,_getProvider:tm,_isFirebaseApp:Lu,_isFirebaseServerApp:ge,_isFirebaseServerAppSettings:nm,_registerComponent:Nn,_removeServiceInstance:Iv,_serverApps:ui,deleteApp:Bu,getApp:Av,getApps:Sv,initializeApp:Uu,initializeServerApp:bv,onLog:im,registerVersion:Tt,setLogLevel:sm},Symbol.toStringTag,{value:"Module"}));/**
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
 */class Lv{constructor(e,t){this._delegate=e,this.firebase=t,Ks(e,new zt("app-compat",()=>this,"PUBLIC")),this.container=e.container}get automaticDataCollectionEnabled(){return this._delegate.automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this._delegate.automaticDataCollectionEnabled=e}get name(){return this._delegate.name}get options(){return this._delegate.options}delete(){return new Promise(e=>{this._delegate.checkDestroyed(),e()}).then(()=>(this.firebase.INTERNAL.removeApp(this.name),Bu(this._delegate)))}_getService(e,t=Dn){var i;this._delegate.checkDestroyed();const n=this._delegate.container.getProvider(e);return!n.isInitialized()&&((i=n.getComponent())==null?void 0:i.instantiationMode)==="EXPLICIT"&&n.initialize(),n.getImmediate({identifier:t})}_removeServiceInstance(e,t=Dn){this._delegate.container.getProvider(e).clearInstance(t)}_addComponent(e){Ks(this._delegate,e)}_addOrOverwriteComponent(e){em(this._delegate,e)}toJSON(){return{name:this.name,automaticDataCollectionEnabled:this.automaticDataCollectionEnabled,options:this.options}}}/**
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
 */const Uv={"no-app":"No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance."},Lf=new Dr("app-compat","Firebase",Uv);/**
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
 */function Bv(r){const e={},t={__esModule:!0,initializeApp:s,app:i,registerVersion:Tt,setLogLevel:sm,onLog:im,apps:null,SDK_VERSION:qn,INTERNAL:{registerComponent:c,removeApp:n,useAsService:l,modularAPIs:Fv}};t.default=t,Object.defineProperty(t,"apps",{get:o});function n(u){delete e[u]}function i(u){if(u=u||Dn,!Cf(e,u))throw Lf.create("no-app",{appName:u});return e[u]}i.App=r;function s(u,d={}){const p=Uu(u,d);if(Cf(e,p.name))return e[p.name];const g=new r(p,t);return e[p.name]=g,g}function o(){return Object.keys(e).map(u=>e[u])}function c(u){const d=u.name,p=d.replace("-compat","");if(Nn(u)&&u.type==="PUBLIC"){const g=(I=i())=>{if(typeof I[p]!="function")throw Lf.create("invalid-app-argument",{appName:d});return I[p]()};u.serviceProps!==void 0&&Sa(g,u.serviceProps),t[p]=g,r.prototype[p]=function(...I){return this._getService.bind(this,d).apply(this,u.multipleInstances?I:[])}}return u.type==="PUBLIC"?t[p]:null}function l(u,d){return d==="serverAuth"?null:d}return t}/**
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
 */function cm(){const r=Bv(Lv);r.INTERNAL={...r.INTERNAL,createFirebaseNamespace:cm,extendNamespace:e,createSubscribe:Qg,ErrorFactory:Dr,deepExtend:Sa};function e(t){Sa(r,t)}return r}const $v=cm();/**
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
 */const Uf=new nc("@firebase/app-compat"),qv="@firebase/app-compat",zv="0.5.6";/**
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
 */function Kv(r){Tt(qv,zv,r)}/**
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
 */try{const r=xu();if(r.firebase!==void 0){Uf.warn(`
      Warning: Firebase is already defined in the global scope. Please make sure
      Firebase library is only loaded once.
    `);const e=r.firebase.SDK_VERSION;e&&e.indexOf("LITE")>=0&&Uf.warn(`
        Warning: You are trying to load Firebase while using Firebase Performance standalone script.
        You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
        `)}}catch{}const Ue=$v;Kv();var jv="firebase",Gv="12.7.0";/**
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
 */Ue.registerVersion(jv,Gv,"app-compat");const us={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",TWITTER:"twitter.com"},$r={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
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
 */function Wv(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function lm(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Hv=Wv,Qv=lm,um=new Dr("auth","Firebase",lm());/**
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
 */const Pa=new nc("@firebase/auth");function Yv(r,...e){Pa.logLevel<=J.WARN&&Pa.warn(`Auth (${qn}): ${r}`,...e)}function la(r,...e){Pa.logLevel<=J.ERROR&&Pa.error(`Auth (${qn}): ${r}`,...e)}/**
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
 */function ze(r,...e){throw qu(r,...e)}function xe(r,...e){return qu(r,...e)}function $u(r,e,t){const n={...Qv(),[e]:t};return new Dr("auth","Firebase",n).create(e,{appName:r.name})}function Fe(r){return $u(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Mi(r,e,t){const n=t;if(!(e instanceof n))throw n.name!==e.constructor.name&&ze(r,"argument-error"),$u(r,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function qu(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return um.create(r,...e)}function O(r,e,...t){if(!r)throw qu(e,...t)}function Ft(r){const e="INTERNAL ASSERTION FAILED: "+r;throw la(e),new Error(e)}function St(r,e){r||Ft(e)}/**
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
 */function Gs(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.href)||""}function zu(){return Bf()==="http:"||Bf()==="https:"}function Bf(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.protocol)||null}/**
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
 */function Jv(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(zu()||jg()||"connection"in navigator)?navigator.onLine:!0}function Xv(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
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
 */class yo{constructor(e,t){this.shortDelay=e,this.longDelay=t,St(t>e,"Short delay should be less than long delay!"),this.isMobile=gE()||Ou()}get(){return Jv()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
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
 */function Ku(r,e){St(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
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
 */class hm{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Ft("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Ft("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Ft("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
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
 */const Zv={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
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
 */const eT=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],tT=new yo(3e4,6e4);function Te(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function be(r,e,t,n,i={}){return dm(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=Oi({key:r.config.apiKey,...o}).slice(1),l=await r._getAdditionalHeaders();l["Content-Type"]="application/json",r.languageCode&&(l["X-Firebase-Locale"]=r.languageCode);const u={method:e,headers:l,...s};return yE()||(u.referrerPolicy="no-referrer"),r.emulatorConfig&&Vi(r.emulatorConfig.host)&&(u.credentials="include"),hm.fetch()(await fm(r,r.config.apiHost,t,c),u)})}async function dm(r,e,t){r._canInitEmulator=!1;const n={...Zv,...e};try{const i=new rT(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw Es(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[l,u]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw Es(r,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw Es(r,"email-already-in-use",o);if(l==="USER_DISABLED")throw Es(r,"user-disabled",o);const d=n[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(u)throw $u(r,d,u);ze(r,d)}}catch(i){if(i instanceof nt)throw i;ze(r,"network-request-failed",{message:String(i)})}}async function nn(r,e,t,n,i={}){const s=await be(r,e,t,n,i);return"mfaPendingCredential"in s&&ze(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function fm(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?Ku(r.config,i):`${r.config.apiScheme}://${i}`;return eT.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function nT(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class rT{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(xe(this.auth,"network-request-failed")),tT.get())})}}function Es(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=xe(r,e,n);return i.customData._tokenResponse=t,i}/**
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
 */function $f(r){return r!==void 0&&r.getResponse!==void 0}function qf(r){return r!==void 0&&r.enterprise!==void 0}class pm{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return nT(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
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
 */async function iT(r){return(await be(r,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function gm(r,e){return be(r,"GET","/v2/recaptchaConfig",Te(r,e))}/**
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
 */async function sT(r,e){return be(r,"POST","/v1/accounts:delete",e)}async function oT(r,e){return be(r,"POST","/v1/accounts:update",e)}async function Ca(r,e){return be(r,"POST","/v1/accounts:lookup",e)}/**
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
 */function Cs(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function aT(r,e=!1){const t=K(r),n=await t.getIdToken(e),i=rc(n);O(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:Cs(vl(i.auth_time)),issuedAtTime:Cs(vl(i.iat)),expirationTime:Cs(vl(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function vl(r){return Number(r)*1e3}function rc(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return la("JWT malformed, contained fewer than 3 sections"),null;try{const i=Du(t);return i?JSON.parse(i):(la("Failed to decode base64 JWT payload"),null)}catch(i){return la("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function zf(r){const e=rc(r);return O(e,"internal-error"),O(typeof e.exp<"u","internal-error"),O(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
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
 */async function Xt(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof nt&&cT(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function cT({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
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
 */class lT{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
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
 */class Bl{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Cs(this.lastLoginAt),this.creationTime=Cs(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Ws(r){var p;const e=r.auth,t=await r.getIdToken(),n=await Xt(r,Ca(e,{idToken:t}));O(n==null?void 0:n.users.length,e,"internal-error");const i=n.users[0];r._notifyReloadListener(i);const s=(p=i.providerUserInfo)!=null&&p.length?mm(i.providerUserInfo):[],o=hT(r.providerData,s),c=r.isAnonymous,l=!(r.email&&i.passwordHash)&&!(o!=null&&o.length),u=c?l:!1,d={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new Bl(i.createdAt,i.lastLoginAt),isAnonymous:u};Object.assign(r,d)}async function uT(r){const e=K(r);await Ws(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function hT(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function mm(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
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
 */async function dT(r,e){const t=await dm(r,{},async()=>{const n=Oi({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await fm(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:n};return r.emulatorConfig&&Vi(r.emulatorConfig.host)&&(l.credentials="include"),hm.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function fT(r,e){return be(r,"POST","/v2/accounts:revokeToken",Te(r,e))}/**
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
 */class ii{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){O(e.idToken,"internal-error"),O(typeof e.idToken<"u","internal-error"),O(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):zf(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){O(e.length!==0,"internal-error");const t=zf(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(O(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await dT(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new ii;return n&&(O(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(O(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(O(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new ii,this.toJSON())}_performRefresh(){return Ft("not implemented")}}/**
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
 */function mn(r,e){O(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class vt{constructor({uid:e,auth:t,stsTokenManager:n,...i}){this.providerId="firebase",this.proactiveRefresh=new lT(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new Bl(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Xt(this,this.stsTokenManager.getToken(this.auth,e));return O(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return aT(this,e)}reload(){return uT(this)}_assign(e){this!==e&&(O(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new vt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){O(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Ws(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(ge(this.auth.app))return Promise.reject(Fe(this.auth));const e=await this.getIdToken();return await Xt(this,sT(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,u=t.createdAt??void 0,d=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:I,providerData:P,stsTokenManager:D}=t;O(p&&D,e,"internal-error");const T=ii.fromJSON(this.name,D);O(typeof p=="string",e,"internal-error"),mn(n,e.name),mn(i,e.name),O(typeof g=="boolean",e,"internal-error"),O(typeof I=="boolean",e,"internal-error"),mn(s,e.name),mn(o,e.name),mn(c,e.name),mn(l,e.name),mn(u,e.name),mn(d,e.name);const V=new vt({uid:p,auth:e,email:i,emailVerified:g,displayName:n,isAnonymous:I,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:T,createdAt:u,lastLoginAt:d});return P&&Array.isArray(P)&&(V.providerData=P.map(M=>({...M}))),l&&(V._redirectEventId=l),V}static async _fromIdTokenResponse(e,t,n=!1){const i=new ii;i.updateFromServerResponse(t);const s=new vt({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Ws(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];O(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?mm(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new ii;c.updateFromIdToken(n);const l=new vt({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),u={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Bl(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(l,u),l}}/**
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
 */const Kf=new Map;function pt(r){St(r instanceof Function,"Expected a class definition");let e=Kf.get(r);return e?(St(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,Kf.set(r,e),e)}/**
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
 */class ym{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}ym.type="NONE";const di=ym;/**
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
 */function gr(r,e,t){return`firebase:${r}:${e}:${t}`}class si{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=gr(this.userKey,i.apiKey,s),this.fullPersistenceKey=gr("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Ca(this.auth,{idToken:e}).catch(()=>{});return t?vt._fromGetAccountInfoResponse(this.auth,t,e):null}return vt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new si(pt(di),e,n);const i=(await Promise.all(t.map(async u=>{if(await u._isAvailable())return u}))).filter(u=>u);let s=i[0]||pt(di);const o=gr(n,e.config.apiKey,e.name);let c=null;for(const u of t)try{const d=await u._get(o);if(d){let p;if(typeof d=="string"){const g=await Ca(e,{idToken:d}).catch(()=>{});if(!g)break;p=await vt._fromGetAccountInfoResponse(e,g,d)}else p=vt._fromJSON(e,d);u!==s&&(c=p),s=u;break}}catch{}const l=i.filter(u=>u._shouldAllowMigration);return!s._shouldAllowMigration||!l.length?new si(s,e,n):(s=l[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async u=>{if(u!==s)try{await u._remove(o)}catch{}})),new si(s,e,n))}}/**
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
 */function jf(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Em(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(_m(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(vm(e))return"Blackberry";if(Tm(e))return"Webos";if(wm(e))return"Safari";if((e.includes("chrome/")||Im(e))&&!e.includes("edge/"))return"Chrome";if(_o(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function _m(r=_e()){return/firefox\//i.test(r)}function wm(r=_e()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Im(r=_e()){return/crios\//i.test(r)}function Em(r=_e()){return/iemobile/i.test(r)}function _o(r=_e()){return/android/i.test(r)}function vm(r=_e()){return/blackberry/i.test(r)}function Tm(r=_e()){return/webos/i.test(r)}function wo(r=_e()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function pT(r=_e()){return/(iPad|iPhone|iPod).*OS 7_\d/i.test(r)||/(iPad|iPhone|iPod).*OS 8_\d/i.test(r)}function gT(r=_e()){var e;return wo(r)&&!!((e=window.navigator)!=null&&e.standalone)}function mT(){return Gg()&&document.documentMode===10}function bm(r=_e()){return wo(r)||_o(r)||Tm(r)||vm(r)||/windows phone/i.test(r)||Em(r)}/**
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
 */function Am(r,e=[]){let t;switch(r){case"Browser":t=jf(_e());break;case"Worker":t=`${jf(_e())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${qn}/${n}`}/**
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
 */class yT{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const l=e(s);o(l)}catch(l){c(l)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
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
 */async function _T(r,e={}){return be(r,"GET","/v2/passwordPolicy",Te(r,e))}/**
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
 */const wT=6;class IT{constructor(e){var n;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??wT,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((n=e.allowedNonAlphanumericCharacters)==null?void 0:n.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
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
 */class ET{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Gf(this),this.idTokenSubscription=new Gf(this),this.beforeStateQueue=new yT(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=um,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=pt(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await si.create(this,e),(n=this._resolvePersistenceManagerAvailable)==null||n.call(this),!this._deleted)){if((i=this._popupRedirectResolver)!=null&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)==null?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Ca(this,{idToken:e}),n=await vt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var s;if(ge(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(s=this.redirectUser)==null?void 0:s._redirectEventId,c=n==null?void 0:n._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(n=l.user,i=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(n)}catch(o){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return O(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Ws(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Xv()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(ge(this.app))return Promise.reject(Fe(this));const t=e?K(e):null;return t&&O(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&O(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return ge(this.app)?Promise.reject(Fe(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return ge(this.app)?Promise.reject(Fe(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(pt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await _T(this),t=new IT(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Dr("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await fT(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&pt(e)||this._popupRedirectResolver;O(t,this,"argument-error"),this.redirectPersistenceManager=await si.create(this,[pt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)==null?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(O(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,n,i);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return O(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Am(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var i;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((i=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:i.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){var t;if(ge(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&Yv(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function we(r){return K(r)}class Gf{constructor(e){this.auth=e,this.observer=null,this.addObserver=Qg(t=>this.observer=t)}get next(){return O(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
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
 */let Io={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function vT(r){Io=r}function ju(r){return Io.loadJS(r)}function TT(){return Io.recaptchaV2Script}function bT(){return Io.recaptchaEnterpriseScript}function AT(){return Io.gapiScript}function Sm(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
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
 */const ST=500,RT=6e4,ta=1e12;class PT{constructor(e){this.auth=e,this.counter=ta,this._widgets=new Map}render(e,t){const n=this.counter;return this._widgets.set(n,new DT(e,this.auth.name,t||{})),this.counter++,n}reset(e){var n;const t=e||ta;(n=this._widgets.get(t))==null||n.delete(),this._widgets.delete(t)}getResponse(e){var n;const t=e||ta;return((n=this._widgets.get(t))==null?void 0:n.getResponse())||""}async execute(e){var n;const t=e||ta;return(n=this._widgets.get(t))==null||n.execute(),""}}class CT{constructor(){this.enterprise=new kT}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class kT{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class DT{constructor(e,t,n){this.params=n,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;O(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=xT(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},RT)},ST))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function xT(r){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let n=0;n<r;n++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const NT="recaptcha-enterprise",ks="NO_RECAPTCHA";class Rm{constructor(e){this.type=NT,this.auth=we(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{gm(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(l=>{if(l.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const u=new pm(l);return s.tenantId==null?s._agentRecaptchaConfig=u:s._tenantRecaptchaConfigs[s.tenantId]=u,o(u.siteKey)}}).catch(l=>{c(l)})})}function i(s,o,c){const l=window.grecaptcha;qf(l)?l.enterprise.ready(()=>{l.enterprise.execute(s,{action:e}).then(u=>{o(u)}).catch(()=>{o(ks)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new CT().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&qf(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let l=bT();l.length!==0&&(l+=c),ju(l).then(()=>{i(c,s,o)}).catch(u=>{o(u)})}}).catch(c=>{o(c)})})}}async function hs(r,e,t,n=!1,i=!1){const s=new Rm(r);let o;if(i)o=ks;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const l=c.phoneEnrollmentInfo.phoneNumber,u=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:l,recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const l=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function Sn(r,e,t,n,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if((s=r._getRecaptchaConfig())!=null&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await hs(r,e,t,t==="getOobCode");return n(r,c)}else return n(r,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await hs(r,e,t,t==="getOobCode");return n(r,l)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if((o=r._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await hs(r,e,t);return n(r,c).catch(async l=>{var u;if(((u=r._getRecaptchaConfig())==null?void 0:u.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(l.code==="auth/missing-recaptcha-token"||l.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await hs(r,e,t,!1,!0);return n(r,d)}return Promise.reject(l)})}else{const c=await hs(r,e,t,!1,!0);return n(r,c)}else return Promise.reject(i+" provider is not supported.")}async function VT(r){const e=we(r),t=await gm(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),n=new pm(t);e.tenantId==null?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,n.isAnyProviderEnabled()&&new Rm(e).verify()}function OT(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(pt);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function MT(r,e,t){const n=we(r);O(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=Pm(e),{host:o,port:c}=FT(e),l=c===null?"":`:${c}`,u={url:`${s}//${o}${l}/`},d=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){O(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),O(kn(u,n.config.emulator)&&kn(d,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=u,n.emulatorConfig=d,n.settings.appVerificationDisabledForTesting=!0,Vi(o)?(qg(`${s}//${o}${l}`),zg("Auth",!0)):i||LT()}function Pm(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function FT(r){const e=Pm(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:Wf(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:Wf(o)}}}function Wf(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function LT(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
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
 */class Fi{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return Ft("not implemented")}_getIdTokenResponse(e){return Ft("not implemented")}_linkToIdToken(e,t){return Ft("not implemented")}_getReauthenticationResolver(e){return Ft("not implemented")}}/**
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
 */async function Cm(r,e){return be(r,"POST","/v1/accounts:resetPassword",Te(r,e))}async function UT(r,e){return be(r,"POST","/v1/accounts:update",e)}async function BT(r,e){return be(r,"POST","/v1/accounts:signUp",e)}async function $T(r,e){return be(r,"POST","/v1/accounts:update",Te(r,e))}/**
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
 */async function qT(r,e){return nn(r,"POST","/v1/accounts:signInWithPassword",Te(r,e))}async function ic(r,e){return be(r,"POST","/v1/accounts:sendOobCode",Te(r,e))}async function zT(r,e){return ic(r,e)}async function KT(r,e){return ic(r,e)}async function jT(r,e){return ic(r,e)}async function GT(r,e){return ic(r,e)}/**
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
 */async function WT(r,e){return nn(r,"POST","/v1/accounts:signInWithEmailLink",Te(r,e))}async function HT(r,e){return nn(r,"POST","/v1/accounts:signInWithEmailLink",Te(r,e))}/**
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
 */class Hs extends Fi{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new Hs(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Hs(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Sn(e,t,"signInWithPassword",qT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return WT(e,{email:this._email,oobCode:this._password});default:ze(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Sn(e,n,"signUpPassword",BT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return HT(e,{idToken:t,email:this._email,oobCode:this._password});default:ze(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
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
 */async function Qt(r,e){return nn(r,"POST","/v1/accounts:signInWithIdp",Te(r,e))}/**
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
 */const QT="http://localhost";class Kt extends Fi{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Kt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):ze("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,...s}=t;if(!n||!i)return null;const o=new Kt(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return Qt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Qt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Qt(e,t)}buildRequest(){const e={requestUri:QT,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Oi(t)}return e}}/**
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
 */async function Hf(r,e){return be(r,"POST","/v1/accounts:sendVerificationCode",Te(r,e))}async function YT(r,e){return nn(r,"POST","/v1/accounts:signInWithPhoneNumber",Te(r,e))}async function JT(r,e){const t=await nn(r,"POST","/v1/accounts:signInWithPhoneNumber",Te(r,e));if(t.temporaryProof)throw Es(r,"account-exists-with-different-credential",t);return t}const XT={USER_NOT_FOUND:"user-not-found"};async function ZT(r,e){const t={...e,operation:"REAUTH"};return nn(r,"POST","/v1/accounts:signInWithPhoneNumber",Te(r,t),XT)}/**
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
 */class mr extends Fi{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new mr({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new mr({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return YT(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return JT(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return ZT(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:n,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:n,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s}=e;return!n&&!t&&!i&&!s?null:new mr({verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s})}}/**
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
 */function eb(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function tb(r){const e=ti(Is(r)).link,t=e?ti(Is(e)).deep_link_id:null,n=ti(Is(r)).deep_link_id;return(n?ti(Is(n)).link:null)||n||t||e||r}class sc{constructor(e){const t=ti(Is(e)),n=t.apiKey??null,i=t.oobCode??null,s=eb(t.mode??null);O(n&&i&&s,"argument-error"),this.apiKey=n,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=tb(e);try{return new sc(t)}catch{return null}}}/**
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
 */class zn{constructor(){this.providerId=zn.PROVIDER_ID}static credential(e,t){return Hs._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=sc.parseLink(t);return O(n,"argument-error"),Hs._fromEmailAndCode(e,n.code,n.tenantId)}}zn.PROVIDER_ID="password";zn.EMAIL_PASSWORD_SIGN_IN_METHOD="password";zn.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
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
 */class rn{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Li extends rn{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class oi extends Li{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return O("providerId"in t&&"signInMethod"in t,"argument-error"),Kt._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return O(e.idToken||e.accessToken,"argument-error"),Kt._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return oi.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return oi.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!n&&!i&&!t&&!s||!c)return null;try{return new oi(c)._credential({idToken:t,accessToken:n,nonce:o,pendingToken:s})}catch{return null}}}/**
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
 */class Nt extends Li{constructor(){super("facebook.com")}static credential(e){return Kt._fromParams({providerId:Nt.PROVIDER_ID,signInMethod:Nt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Nt.credentialFromTaggedObject(e)}static credentialFromError(e){return Nt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Nt.credential(e.oauthAccessToken)}catch{return null}}}Nt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Nt.PROVIDER_ID="facebook.com";/**
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
 */class Vt extends Li{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Kt._fromParams({providerId:Vt.PROVIDER_ID,signInMethod:Vt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Vt.credentialFromTaggedObject(e)}static credentialFromError(e){return Vt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Vt.credential(t,n)}catch{return null}}}Vt.GOOGLE_SIGN_IN_METHOD="google.com";Vt.PROVIDER_ID="google.com";/**
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
 */class Ot extends Li{constructor(){super("github.com")}static credential(e){return Kt._fromParams({providerId:Ot.PROVIDER_ID,signInMethod:Ot.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Ot.credentialFromTaggedObject(e)}static credentialFromError(e){return Ot.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Ot.credential(e.oauthAccessToken)}catch{return null}}}Ot.GITHUB_SIGN_IN_METHOD="github.com";Ot.PROVIDER_ID="github.com";/**
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
 */const nb="http://localhost";class fi extends Fi{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return Qt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,Qt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,Qt(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,pendingToken:s}=t;return!n||!i||!s||n!==i?null:new fi(n,s)}static _create(e,t){return new fi(e,t)}buildRequest(){return{requestUri:nb,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
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
 */const rb="saml.";class ka extends rn{constructor(e){O(e.startsWith(rb),"argument-error"),super(e)}static credentialFromResult(e){return ka.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return ka.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=fi.fromJSON(e);return O(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:n}=e;if(!t||!n)return null;try{return fi._create(n,t)}catch{return null}}}/**
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
 */class Mt extends Li{constructor(){super("twitter.com")}static credential(e,t){return Kt._fromParams({providerId:Mt.PROVIDER_ID,signInMethod:Mt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Mt.credentialFromTaggedObject(e)}static credentialFromError(e){return Mt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return Mt.credential(t,n)}catch{return null}}}Mt.TWITTER_SIGN_IN_METHOD="twitter.com";Mt.PROVIDER_ID="twitter.com";/**
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
 */async function km(r,e){return nn(r,"POST","/v1/accounts:signUp",Te(r,e))}/**
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
 */class It{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await vt._fromIdTokenResponse(e,n,i),o=Qf(n);return new It({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=Qf(n);return new It({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function Qf(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
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
 */async function ib(r){var i;if(ge(r.app))return Promise.reject(Fe(r));const e=we(r);if(await e._initializationPromise,(i=e.currentUser)!=null&&i.isAnonymous)return new It({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await km(e,{returnSecureToken:!0}),n=await It._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(n.user),n}/**
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
 */class Da extends nt{constructor(e,t,n,i){super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,Da.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new Da(e,t,n,i)}}function Dm(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?Da._fromErrorAndOperation(r,s,e,n):s})}/**
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
 */function xm(r){return new Set(r.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function sb(r,e){const t=K(r);await oc(!0,t,e);const{providerUserInfo:n}=await oT(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=xm(n||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function Gu(r,e,t=!1){const n=await Xt(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return It._forOperation(r,"link",n)}async function oc(r,e,t){await Ws(e);const n=xm(e.providerData),i=r===!1?"provider-already-linked":"no-such-provider";O(n.has(t)===r,e.auth,i)}/**
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
 */async function Nm(r,e,t=!1){const{auth:n}=r;if(ge(n.app))return Promise.reject(Fe(n));const i="reauthenticate";try{const s=await Xt(r,Dm(n,i,e,r),t);O(s.idToken,n,"internal-error");const o=rc(s.idToken);O(o,n,"internal-error");const{sub:c}=o;return O(r.uid===c,n,"user-mismatch"),It._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&ze(n,"user-mismatch"),s}}/**
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
 */async function Vm(r,e,t=!1){if(ge(r.app))return Promise.reject(Fe(r));const n="signIn",i=await Dm(r,n,e),s=await It._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function ac(r,e){return Vm(we(r),e)}async function Om(r,e){const t=K(r);return await oc(!1,t,e.providerId),Gu(t,e)}async function Mm(r,e){return Nm(K(r),e)}/**
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
 */async function ob(r,e){return nn(r,"POST","/v1/accounts:signInWithCustomToken",Te(r,e))}/**
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
 */async function ab(r,e){if(ge(r.app))return Promise.reject(Fe(r));const t=we(r),n=await ob(t,{token:e,returnSecureToken:!0}),i=await It._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(i.user),i}/**
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
 */class Eo{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Wu._fromServerResponse(e,t):"totpInfo"in t?Hu._fromServerResponse(e,t):ze(e,"internal-error")}}class Wu extends Eo{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Wu(t)}}class Hu extends Eo{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new Hu(t)}}/**
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
 */function cc(r,e,t){var n;O(((n=t.url)==null?void 0:n.length)>0,r,"invalid-continue-uri"),O(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),O(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(O(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(O(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
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
 */async function Qu(r){const e=we(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function cb(r,e,t){const n=we(r),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&cc(n,i,t),await Sn(n,i,"getOobCode",KT,"EMAIL_PASSWORD_PROVIDER")}async function lb(r,e,t){await Cm(K(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Qu(r),n})}async function ub(r,e){await $T(K(r),{oobCode:e})}async function Fm(r,e){const t=K(r),n=await Cm(t,{oobCode:e}),i=n.requestType;switch(O(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":O(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":O(n.mfaInfo,t,"internal-error");default:O(n.email,t,"internal-error")}let s=null;return n.mfaInfo&&(s=Eo._fromServerResponse(we(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:s},operation:i}}async function hb(r,e){const{data:t}=await Fm(K(r),e);return t.email}async function db(r,e,t){if(ge(r.app))return Promise.reject(Fe(r));const n=we(r),o=await Sn(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",km,"EMAIL_PASSWORD_PROVIDER").catch(l=>{throw l.code==="auth/password-does-not-meet-requirements"&&Qu(r),l}),c=await It._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function fb(r,e,t){return ge(r.app)?Promise.reject(Fe(r)):ac(K(r),zn.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Qu(r),n})}/**
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
 */async function pb(r,e,t){const n=we(r),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){O(c.handleCodeInApp,n,"argument-error"),c&&cc(n,o,c)}s(i,t),await Sn(n,i,"getOobCode",jT,"EMAIL_PASSWORD_PROVIDER")}function gb(r,e){const t=sc.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function mb(r,e,t){if(ge(r.app))return Promise.reject(Fe(r));const n=K(r),i=zn.credentialWithLink(e,t||Gs());return O(i._tenantId===(n.tenantId||null),n,"tenant-id-mismatch"),ac(n,i)}/**
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
 */async function yb(r,e){return be(r,"POST","/v1/accounts:createAuthUri",Te(r,e))}/**
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
 */async function _b(r,e){const t=zu()?Gs():"http://localhost",n={identifier:e,continueUri:t},{signinMethods:i}=await yb(K(r),n);return i||[]}async function wb(r,e){const t=K(r),i={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&cc(t.auth,i,e);const{email:s}=await zT(t.auth,i);s!==r.email&&await r.reload()}async function Ib(r,e,t){const n=K(r),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await r.getIdToken(),newEmail:e};t&&cc(n.auth,s,t);const{email:o}=await GT(n.auth,s);o!==r.email&&await r.reload()}/**
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
 */async function Eb(r,e){return be(r,"POST","/v1/accounts:update",e)}/**
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
 */async function vb(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=K(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Xt(n,Eb(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function Tb(r,e){const t=K(r);return ge(t.auth.app)?Promise.reject(Fe(t.auth)):Lm(t,e,null)}function bb(r,e){return Lm(K(r),null,e)}async function Lm(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Xt(r,UT(n,s));await r._updateTokensIfNecessary(o,!0)}/**
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
 */function Ab(r){var i,s;if(!r)return null;const{providerId:e}=r,t=r.rawUserInfo?JSON.parse(r.rawUserInfo):{},n=r.isNewUser||r.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(r!=null&&r.idToken)){const o=(s=(i=rc(r.idToken))==null?void 0:i.firebase)==null?void 0:s.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new ai(n,c)}}if(!e)return null;switch(e){case"facebook.com":return new Sb(n,t);case"github.com":return new Rb(n,t);case"google.com":return new Pb(n,t);case"twitter.com":return new Cb(n,t,r.screenName||null);case"custom":case"anonymous":return new ai(n,null);default:return new ai(n,e,t)}}class ai{constructor(e,t,n={}){this.isNewUser=e,this.providerId=t,this.profile=n}}class Um extends ai{constructor(e,t,n,i){super(e,t,n),this.username=i}}class Sb extends ai{constructor(e,t){super(e,"facebook.com",t)}}class Rb extends Um{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class Pb extends ai{constructor(e,t){super(e,"google.com",t)}}class Cb extends Um{constructor(e,t,n){super(e,"twitter.com",t,n)}}function kb(r){const{user:e,_tokenResponse:t}=r;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:Ab(t)}/**
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
 */class hr{constructor(e,t,n){this.type=e,this.credential=t,this.user=n}static _fromIdtoken(e,t){return new hr("enroll",e,t)}static _fromMfaPendingCredential(e){return new hr("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,n;if(e!=null&&e.multiFactorSession){if((t=e.multiFactorSession)!=null&&t.pendingCredential)return hr._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if((n=e.multiFactorSession)!=null&&n.idToken)return hr._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
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
 */class Yu{constructor(e,t,n){this.session=e,this.hints=t,this.signInResolver=n}static _fromError(e,t){const n=we(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>Eo._fromServerResponse(n,c));O(i.mfaPendingCredential,n,"internal-error");const o=hr._fromMfaPendingCredential(i.mfaPendingCredential);return new Yu(o,s,async c=>{const l=await c._process(n,o);delete i.mfaInfo,delete i.mfaPendingCredential;const u={...i,idToken:l.idToken,refreshToken:l.refreshToken};switch(t.operationType){case"signIn":const d=await It._fromIdTokenResponse(n,t.operationType,u);return await n._updateCurrentUser(d.user),d;case"reauthenticate":return O(t.user,n,"internal-error"),It._forOperation(t.user,t.operationType,u);default:ze(n,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function Db(r,e){var i;const t=K(r),n=e;return O(e.customData.operationType,t,"argument-error"),O((i=n.customData._serverResponse)==null?void 0:i.mfaPendingCredential,t,"argument-error"),Yu._fromError(t,n)}/**
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
 */function Yf(r,e){return be(r,"POST","/v2/accounts/mfaEnrollment:start",Te(r,e))}function xb(r,e){return be(r,"POST","/v2/accounts/mfaEnrollment:finalize",Te(r,e))}function Nb(r,e){return be(r,"POST","/v2/accounts/mfaEnrollment:withdraw",Te(r,e))}class Ju{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(n=>Eo._fromServerResponse(e.auth,n)))})}static _fromUser(e){return new Ju(e)}async getSession(){return hr._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const n=e,i=await this.getSession(),s=await Xt(this.user,n._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,n=await this.user.getIdToken();try{const i=await Xt(this.user,Nb(this.user.auth,{idToken:n,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const Tl=new WeakMap;function Vb(r){const e=K(r);return Tl.has(e)||Tl.set(e,Ju._fromUser(e)),Tl.get(e)}const xa="__sak";/**
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
 */class Bm{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(xa,"1"),this.storage.removeItem(xa),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
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
 */const Ob=1e3,Mb=10;class $m extends Bm{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=bm(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);mT()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,Mb):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},Ob)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}$m.type="LOCAL";const Xu=$m;/**
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
 */class qm extends Bm{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}qm.type="SESSION";const wr=qm;/**
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
 */function Fb(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class lc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new lc(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async u=>u(t.origin,s)),l=await Fb(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}lc.receivers=[];/**
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
 */function vo(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
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
 */class Lb{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,l)=>{const u=vo("",20);i.port1.start();const d=setTimeout(()=>{l(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(p){const g=p;if(g.data.eventId===u)switch(g.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(d),clearTimeout(s),l(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:u,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
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
 */function Ce(){return window}function Ub(r){Ce().location.href=r}/**
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
 */function Zu(){return typeof Ce().WorkerGlobalScope<"u"&&typeof Ce().importScripts=="function"}async function Bb(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function $b(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)==null?void 0:r.controller)||null}function qb(){return Zu()?self:null}/**
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
 */const zm="firebaseLocalStorageDb",zb=1,Na="firebaseLocalStorage",Km="fbase_key";class To{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function uc(r,e){return r.transaction([Na],e?"readwrite":"readonly").objectStore(Na)}function Kb(){const r=indexedDB.deleteDatabase(zm);return new To(r).toPromise()}function $l(){const r=indexedDB.open(zm,zb);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(Na,{keyPath:Km})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(Na)?e(n):(n.close(),await Kb(),e(await $l()))})})}async function Jf(r,e,t){const n=uc(r,!0).put({[Km]:e,value:t});return new To(n).toPromise()}async function jb(r,e){const t=uc(r,!1).get(e),n=await new To(t).toPromise();return n===void 0?null:n.value}function Xf(r,e){const t=uc(r,!0).delete(e);return new To(t).toPromise()}const Gb=800,Wb=3;class jm{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await $l(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>Wb)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Zu()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=lc._getInstance(qb()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await Bb(),!this.activeServiceWorker)return;this.sender=new Lb(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(n=e[0])!=null&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||$b()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await $l();return await Jf(e,xa,"1"),await Xf(e,xa),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Jf(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>jb(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Xf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=uc(i,!1).getAll();return new To(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Gb)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}jm.type="LOCAL";const Qs=jm;/**
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
 */function Zf(r,e){return be(r,"POST","/v2/accounts/mfaSignIn:start",Te(r,e))}function Hb(r,e){return be(r,"POST","/v2/accounts/mfaSignIn:finalize",Te(r,e))}/**
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
 */const bl=Sm("rcb"),Qb=new yo(3e4,6e4);class Yb{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=Ce().grecaptcha)!=null&&e.render)}load(e,t=""){return O(Jb(t),e,"argument-error"),this.shouldResolveImmediately(t)&&$f(Ce().grecaptcha)?Promise.resolve(Ce().grecaptcha):new Promise((n,i)=>{const s=Ce().setTimeout(()=>{i(xe(e,"network-request-failed"))},Qb.get());Ce()[bl]=()=>{Ce().clearTimeout(s),delete Ce()[bl];const c=Ce().grecaptcha;if(!c||!$f(c)){i(xe(e,"internal-error"));return}const l=c.render;c.render=(u,d)=>{const p=l(u,d);return this.counter++,p},this.hostLanguage=t,n(c)};const o=`${TT()}?${Oi({onload:bl,render:"explicit",hl:t})}`;ju(o).catch(()=>{clearTimeout(s),i(xe(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=Ce().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function Jb(r){return r.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(r)}class Xb{async load(e){return new PT(e)}clearedOneInstance(){}}/**
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
 */const Ds="recaptcha",Zb={theme:"light",type:"image"};let eA=class{constructor(e,t,n={...Zb}){this.parameters=n,this.type=Ds,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=we(e),this.isInvisible=this.parameters.size==="invisible",O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;O(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new Xb:new Yb,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),n=t.getResponse(e);return n||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){O(!this.parameters.sitekey,this.auth,"argument-error"),O(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(n=>n(t)),typeof e=="function")e(t);else if(typeof e=="string"){const n=Ce()[e];typeof n=="function"&&n(t)}}}assertNotDestroyed(){O(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){O(zu()&&!Zu(),this.auth,"internal-error"),await tA(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await iT(this.auth);O(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return O(this.recaptcha,this.auth,"internal-error"),this.recaptcha}};function tA(){let r=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}r=()=>e(),window.addEventListener("load",r)}).catch(e=>{throw r&&window.removeEventListener("load",r),e})}/**
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
 */class eh{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=mr._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function nA(r,e,t){if(ge(r.app))return Promise.reject(Fe(r));const n=we(r),i=await hc(n,e,K(t));return new eh(i,s=>ac(n,s))}async function rA(r,e,t){const n=K(r);await oc(!1,n,"phone");const i=await hc(n.auth,e,K(t));return new eh(i,s=>Om(n,s))}async function iA(r,e,t){const n=K(r);if(ge(n.auth.app))return Promise.reject(Fe(n.auth));const i=await hc(n.auth,e,K(t));return new eh(i,s=>Mm(n,s))}async function hc(r,e,t){var n;if(!r._getRecaptchaConfig())try{await VT(r)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){O(s.type==="enroll",r,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await Sn(r,o,"mfaSmsEnrollment",async(d,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===ks){O((t==null?void 0:t.type)===Ds,d,"argument-error");const g=await Al(d,p,t);return Yf(d,g)}return Yf(d,p)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{O(s.type==="signin",r,"internal-error");const o=((n=i.multiFactorHint)==null?void 0:n.uid)||i.multiFactorUid;O(o,r,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await Sn(r,c,"mfaSmsSignIn",async(p,g)=>{if(g.phoneSignInInfo.captchaResponse===ks){O((t==null?void 0:t.type)===Ds,p,"argument-error");const I=await Al(p,g,t);return Zf(p,I)}return Zf(p,g)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await Sn(r,s,"sendVerificationCode",async(u,d)=>{if(d.captchaResponse===ks){O((t==null?void 0:t.type)===Ds,u,"argument-error");const p=await Al(u,d,t);return Hf(u,p)}return Hf(u,d)},"PHONE_PROVIDER").catch(u=>Promise.reject(u))).sessionInfo}}finally{t==null||t._reset()}}async function sA(r,e){const t=K(r);if(ge(t.auth.app))return Promise.reject(Fe(t.auth));await Gu(t,e)}async function Al(r,e,t){O(t.type===Ds,r,"argument-error");const n=await t.verify();O(typeof n=="string",r,"argument-error");const i={...e};if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,l=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:n,captchaResponse:o,clientType:c,recaptchaVersion:l}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:n,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:n}),i}/**
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
 */let Ir=class ua{constructor(e){this.providerId=ua.PROVIDER_ID,this.auth=we(e)}verifyPhoneNumber(e,t){return hc(this.auth,e,K(t))}static credential(e,t){return mr._fromVerification(e,t)}static credentialFromResult(e){const t=e;return ua.credentialFromTaggedObject(t)}static credentialFromError(e){return ua.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:n}=e;return t&&n?mr._fromTokenResponse(t,n):null}};Ir.PROVIDER_ID="phone";Ir.PHONE_SIGN_IN_METHOD="phone";/**
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
 */function xr(r,e){return e?pt(e):(O(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
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
 */class th extends Fi{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return Qt(e,this._buildIdpRequest())}_linkToIdToken(e,t){return Qt(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return Qt(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function oA(r){return Vm(r.auth,new th(r),r.bypassAuthState)}function aA(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),Nm(t,new th(r),r.bypassAuthState)}async function cA(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),Gu(t,new th(r),r.bypassAuthState)}/**
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
 */class Gm{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(u){this.reject(u)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return oA;case"linkViaPopup":case"linkViaRedirect":return cA;case"reauthViaPopup":case"reauthViaRedirect":return aA;default:ze(this.auth,"internal-error")}}resolve(e){St(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){St(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
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
 */const lA=new yo(2e3,1e4);async function uA(r,e,t){if(ge(r.app))return Promise.reject(xe(r,"operation-not-supported-in-this-environment"));const n=we(r);Mi(r,e,rn);const i=xr(n,t);return new Wt(n,"signInViaPopup",e,i).executeNotNull()}async function hA(r,e,t){const n=K(r);if(ge(n.auth.app))return Promise.reject(xe(n.auth,"operation-not-supported-in-this-environment"));Mi(n.auth,e,rn);const i=xr(n.auth,t);return new Wt(n.auth,"reauthViaPopup",e,i,n).executeNotNull()}async function dA(r,e,t){const n=K(r);Mi(n.auth,e,rn);const i=xr(n.auth,t);return new Wt(n.auth,"linkViaPopup",e,i,n).executeNotNull()}class Wt extends Gm{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,Wt.currentPopupAction&&Wt.currentPopupAction.cancel(),Wt.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return O(e,this.auth,"internal-error"),e}async onExecution(){St(this.filter.length===1,"Popup operations only handle one event");const e=vo();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(xe(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(xe(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Wt.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if((n=(t=this.authWindow)==null?void 0:t.window)!=null&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(xe(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,lA.get())};e()}}Wt.currentPopupAction=null;/**
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
 */const fA="pendingRedirect",xs=new Map;class pA extends Gm{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=xs.get(this.auth._key());if(!e){try{const n=await gA(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}xs.set(this.auth._key(),e)}return this.bypassAuthState||xs.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function gA(r,e){const t=Hm(e),n=Wm(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}async function nh(r,e){return Wm(r)._set(Hm(e),"true")}function mA(){xs.clear()}function rh(r,e){xs.set(r._key(),e)}function Wm(r){return pt(r._redirectPersistence)}function Hm(r){return gr(fA,r.config.apiKey,r.name)}/**
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
 */function yA(r,e,t){return _A(r,e,t)}async function _A(r,e,t){if(ge(r.app))return Promise.reject(Fe(r));const n=we(r);Mi(r,e,rn),await n._initializationPromise;const i=xr(n,t);return await nh(i,n),i._openRedirect(n,e,"signInViaRedirect")}function wA(r,e,t){return IA(r,e,t)}async function IA(r,e,t){const n=K(r);if(Mi(n.auth,e,rn),ge(n.auth.app))return Promise.reject(Fe(n.auth));await n.auth._initializationPromise;const i=xr(n.auth,t);await nh(i,n.auth);const s=await Qm(n);return i._openRedirect(n.auth,e,"reauthViaRedirect",s)}function EA(r,e,t){return vA(r,e,t)}async function vA(r,e,t){const n=K(r);Mi(n.auth,e,rn),await n.auth._initializationPromise;const i=xr(n.auth,t);await oc(!1,n,e.providerId),await nh(i,n.auth);const s=await Qm(n);return i._openRedirect(n.auth,e,"linkViaRedirect",s)}async function TA(r,e){return await we(r)._initializationPromise,dc(r,e,!1)}async function dc(r,e,t=!1){if(ge(r.app))return Promise.reject(Fe(r));const n=we(r),i=xr(n,e),o=await new pA(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}async function Qm(r){const e=vo(`${r.uid}:::`);return r._redirectEventId=e,await r.auth._setRedirectUser(r),await r.auth._persistUserIfCurrent(r),e}/**
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
 */const bA=10*60*1e3;class Ym{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!AA(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!Jm(e)){const i=((n=e.error.code)==null?void 0:n.split("auth/")[1])||"internal-error";t.onError(xe(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=bA&&this.cachedEventUids.clear(),this.cachedEventUids.has(ep(e))}saveEventToCache(e){this.cachedEventUids.add(ep(e)),this.lastProcessedEventTime=Date.now()}}function ep(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function Jm({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function AA(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Jm(r);default:return!1}}/**
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
 */async function Xm(r,e={}){return be(r,"GET","/v1/projects",e)}/**
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
 */const SA=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,RA=/^https?/;async function PA(r){if(r.config.emulator)return;const{authorizedDomains:e}=await Xm(r);for(const t of e)try{if(CA(t))return}catch{}ze(r,"unauthorized-domain")}function CA(r){const e=Gs(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!RA.test(t))return!1;if(SA.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
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
 */const kA=new yo(3e4,6e4);function tp(){const r=Ce().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function DA(r){return new Promise((e,t)=>{var i,s,o;function n(){tp(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{tp(),t(xe(r,"network-request-failed"))},timeout:kA.get()})}if((s=(i=Ce().gapi)==null?void 0:i.iframes)!=null&&s.Iframe)e(gapi.iframes.getContext());else if((o=Ce().gapi)!=null&&o.load)n();else{const c=Sm("iframefcb");return Ce()[c]=()=>{gapi.load?n():t(xe(r,"network-request-failed"))},ju(`${AT()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw ha=null,e})}let ha=null;function xA(r){return ha=ha||DA(r),ha}/**
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
 */const NA=new yo(5e3,15e3),VA="__/auth/iframe",OA="emulator/auth/iframe",MA={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},FA=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function LA(r){const e=r.config;O(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Ku(e,OA):`https://${r.config.authDomain}/${VA}`,n={apiKey:e.apiKey,appName:r.name,v:qn},i=FA.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${Oi(n).slice(1)}`}async function UA(r){const e=await xA(r),t=Ce().gapi;return O(t,r,"internal-error"),e.open({where:document.body,url:LA(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:MA,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=xe(r,"network-request-failed"),c=Ce().setTimeout(()=>{s(o)},NA.get());function l(){Ce().clearTimeout(c),i(n)}n.ping(l).then(l,()=>{s(o)})}))}/**
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
 */const BA={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},$A=500,qA=600,zA="_blank",KA="http://localhost";class np{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function jA(r,e,t,n=$A,i=qA){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const l={...BA,width:n.toString(),height:i.toString(),top:s,left:o},u=_e().toLowerCase();t&&(c=Im(u)?zA:t),_m(u)&&(e=e||KA,l.scrollbars="yes");const d=Object.entries(l).reduce((g,[I,P])=>`${g}${I}=${P},`,"");if(gT(u)&&c!=="_self")return GA(e||"",c),new np(null);const p=window.open(e||"",c,d);O(p,r,"popup-blocked");try{p.focus()}catch{}return new np(p)}function GA(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
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
 */const WA="__/auth/handler",HA="emulator/auth/handler",QA=encodeURIComponent("fac");async function ql(r,e,t,n,i,s){O(r.config.authDomain,r,"auth-domain-config-required"),O(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:qn,eventId:i};if(e instanceof rn){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",vE(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries(s||{}))o[d]=p}if(e instanceof Li){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const l=await r._getAppCheckToken(),u=l?`#${QA}=${encodeURIComponent(l)}`:"";return`${YA(r)}?${Oi(c).slice(1)}${u}`}function YA({config:r}){return r.emulator?Ku(r,HA):`https://${r.authDomain}/${WA}`}/**
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
 */const Sl="webStorageSupport";class JA{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=wr,this._completeRedirectFn=dc,this._overrideRedirectResult=rh}async _openPopup(e,t,n,i){var o;St((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const s=await ql(e,t,n,Gs(),i);return jA(e,s,vo())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await ql(e,t,n,Gs(),i);return Ub(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(St(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await UA(e),n=new Ym(e);return t.register("authEvent",i=>(O(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Sl,{type:Sl},i=>{var o;const s=(o=i==null?void 0:i[0])==null?void 0:o[Sl];s!==void 0&&t(!!s),ze(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=PA(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return bm()||wm()||wo()}}const XA=JA;class ZA{constructor(e){this.factorId=e}_process(e,t,n){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,n);case"signin":return this._finalizeSignIn(e,t.credential);default:return Ft("unexpected MultiFactorSessionType")}}}class ih extends ZA{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new ih(e)}_finalizeEnroll(e,t,n){return xb(e,{idToken:t,displayName:n,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return Hb(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class Zm{constructor(){}static assertion(e){return ih._fromCredential(e)}}Zm.FACTOR_ID="phone";var rp="@firebase/auth",ip="1.12.0";/**
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
 */class eS{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){O(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
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
 */function tS(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function nS(r){Nn(new zt("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;O(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const l={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Am(r)},u=new ET(n,i,s,l);return OT(u,t),u},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Nn(new zt("auth-internal",e=>{const t=we(e.getProvider("auth").getImmediate());return(n=>new eS(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Tt(rp,ip,tS(r)),Tt(rp,ip,"esm2020")}/**
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
 */const rS=5*60;uE("authIdTokenMaxAge");function iS(){var r;return((r=document.getElementsByTagName("head"))==null?void 0:r[0])??document}vT({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=xe("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",iS().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});nS("Browser");/**
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
 */function Er(){return window}/**
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
 */const sS=2e3;async function oS(r,e,t){const{BuildInfo:n}=Er();St(e.sessionId,"AuthEvent did not contain a session ID");const i=await hS(e.sessionId),s={};return wo()?s.ibi=n.packageName:_o()?s.apn=n.packageName:ze(r,"operation-not-supported-in-this-environment"),n.displayName&&(s.appDisplayName=n.displayName),s.sessionId=i,ql(r,t,e.type,void 0,e.eventId??void 0,s)}async function aS(r){const{BuildInfo:e}=Er(),t={};wo()?t.iosBundleId=e.packageName:_o()?t.androidPackageName=e.packageName:ze(r,"operation-not-supported-in-this-environment"),await Xm(r,t)}function cS(r){const{cordova:e}=Er();return new Promise(t=>{e.plugins.browsertab.isAvailable(n=>{let i=null;n?e.plugins.browsertab.openUrl(r):i=e.InAppBrowser.open(r,pT()?"_blank":"_system","location=yes"),t(i)})})}async function lS(r,e,t){const{cordova:n}=Er();let i=()=>{};try{await new Promise((s,o)=>{let c=null;function l(){var g;s();const p=(g=n.plugins.browsertab)==null?void 0:g.close;typeof p=="function"&&p(),typeof(t==null?void 0:t.close)=="function"&&t.close()}function u(){c||(c=window.setTimeout(()=>{o(xe(r,"redirect-cancelled-by-user"))},sS))}function d(){(document==null?void 0:document.visibilityState)==="visible"&&u()}e.addPassiveListener(l),document.addEventListener("resume",u,!1),_o()&&document.addEventListener("visibilitychange",d,!1),i=()=>{e.removePassiveListener(l),document.removeEventListener("resume",u,!1),document.removeEventListener("visibilitychange",d,!1),c&&window.clearTimeout(c)}})}finally{i()}}function uS(r){var t,n,i,s,o,c,l,u,d,p;const e=Er();O(typeof((t=e==null?void 0:e.universalLinks)==null?void 0:t.subscribe)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-universal-links-plugin-fix"}),O(typeof((n=e==null?void 0:e.BuildInfo)==null?void 0:n.packageName)<"u",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-buildInfo"}),O(typeof((o=(s=(i=e==null?void 0:e.cordova)==null?void 0:i.plugins)==null?void 0:s.browsertab)==null?void 0:o.openUrl)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((u=(l=(c=e==null?void 0:e.cordova)==null?void 0:c.plugins)==null?void 0:l.browsertab)==null?void 0:u.isAvailable)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((p=(d=e==null?void 0:e.cordova)==null?void 0:d.InAppBrowser)==null?void 0:p.open)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-inappbrowser"})}async function hS(r){const e=dS(r),t=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(t)).map(i=>i.toString(16).padStart(2,"0")).join("")}function dS(r){if(St(/[0-9a-zA-Z]+/.test(r),"Can only convert alpha-numeric strings"),typeof TextEncoder<"u")return new TextEncoder().encode(r);const e=new ArrayBuffer(r.length),t=new Uint8Array(e);for(let n=0;n<r.length;n++)t[n]=r.charCodeAt(n);return t}/**
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
 */const fS=20;class pS extends Ym{constructor(){super(...arguments),this.passiveListeners=new Set,this.initPromise=new Promise(e=>{this.resolveInitialized=e})}addPassiveListener(e){this.passiveListeners.add(e)}removePassiveListener(e){this.passiveListeners.delete(e)}resetRedirect(){this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1}onEvent(e){return this.resolveInitialized(),this.passiveListeners.forEach(t=>t(e)),super.onEvent(e)}async initialized(){await this.initPromise}}function gS(r,e,t=null){return{type:e,eventId:t,urlResponse:null,sessionId:_S(),postBody:null,tenantId:r.tenantId,error:xe(r,"no-auth-event")}}function mS(r,e){return zl()._set(Kl(r),e)}async function sp(r){const e=await zl()._get(Kl(r));return e&&await zl()._remove(Kl(r)),e}function yS(r,e){var n,i;const t=IS(e);if(t.includes("/__/auth/callback")){const s=da(t),o=s.firebaseError?wS(decodeURIComponent(s.firebaseError)):null,c=(i=(n=o==null?void 0:o.code)==null?void 0:n.split("auth/"))==null?void 0:i[1],l=c?xe(c):null;return l?{type:r.type,eventId:r.eventId,tenantId:r.tenantId,error:l,urlResponse:null,sessionId:null,postBody:null}:{type:r.type,eventId:r.eventId,tenantId:r.tenantId,sessionId:r.sessionId,urlResponse:t,postBody:null}}return null}function _S(){const r=[],e="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let t=0;t<fS;t++){const n=Math.floor(Math.random()*e.length);r.push(e.charAt(n))}return r.join("")}function zl(){return pt(Xu)}function Kl(r){return gr("authEvent",r.config.apiKey,r.name)}function wS(r){try{return JSON.parse(r)}catch{return null}}function IS(r){const e=da(r),t=e.link?decodeURIComponent(e.link):void 0,n=da(t).link,i=e.deep_link_id?decodeURIComponent(e.deep_link_id):void 0;return da(i).link||i||n||t||r}function da(r){if(!(r!=null&&r.includes("?")))return{};const[e,...t]=r.split("?");return ti(t.join("?"))}/**
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
 */const ES=500;class vS{constructor(){this._redirectPersistence=wr,this._shouldInitProactively=!0,this.eventManagers=new Map,this.originValidationPromises={},this._completeRedirectFn=dc,this._overrideRedirectResult=rh}async _initialize(e){const t=e._key();let n=this.eventManagers.get(t);return n||(n=new pS(e),this.eventManagers.set(t,n),this.attachCallbackListeners(e,n)),n}_openPopup(e){ze(e,"operation-not-supported-in-this-environment")}async _openRedirect(e,t,n,i){uS(e);const s=await this._initialize(e);await s.initialized(),s.resetRedirect(),mA(),await this._originValidation(e);const o=gS(e,n,i);await mS(e,o);const c=await oS(e,o,t),l=await cS(c);return lS(e,s,l)}_isIframeWebStorageSupported(e,t){throw new Error("Method not implemented.")}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=aS(e)),this.originValidationPromises[t]}attachCallbackListeners(e,t){const{universalLinks:n,handleOpenURL:i,BuildInfo:s}=Er(),o=setTimeout(async()=>{await sp(e),t.onEvent(op())},ES),c=async d=>{clearTimeout(o);const p=await sp(e);let g=null;p&&(d!=null&&d.url)&&(g=yS(p,d.url)),t.onEvent(g||op())};typeof n<"u"&&typeof n.subscribe=="function"&&n.subscribe(null,c);const l=i,u=`${s.packageName.toLowerCase()}://`;Er().handleOpenURL=async d=>{if(d.toLowerCase().startsWith(u)&&c({url:d}),typeof l=="function")try{l(d)}catch(p){console.error(p)}}}}const TS=vS;function op(){return{type:"unknown",eventId:null,sessionId:null,urlResponse:null,postBody:null,tenantId:null,error:xe("no-auth-event")}}/**
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
 */function bS(r,e){we(r)._logFramework(e)}var AS="@firebase/auth-compat",SS="0.6.2";/**
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
 */const RS=1e3;function Ns(){var r;return((r=self==null?void 0:self.location)==null?void 0:r.protocol)||null}function PS(){return Ns()==="http:"||Ns()==="https:"}function ey(r=_e()){return!!((Ns()==="file:"||Ns()==="ionic:"||Ns()==="capacitor:")&&r.toLowerCase().match(/iphone|ipad|ipod|android/))}function CS(){return Ou()||tc()}function kS(){return Gg()&&(document==null?void 0:document.documentMode)===11}function DS(r=_e()){return/Edge\/\d+/.test(r)}function xS(r=_e()){return kS()||DS(r)}function ty(){try{const r=self.localStorage,e=vo();if(r)return r.setItem(e,"1"),r.removeItem(e),xS()?zs():!0}catch{return sh()&&zs()}return!1}function sh(){return typeof global<"u"&&"WorkerGlobalScope"in global&&"importScripts"in global}function Rl(){return(PS()||jg()||ey())&&!CS()&&ty()&&!sh()}function ny(){return ey()&&typeof document<"u"}async function NS(){return ny()?new Promise(r=>{const e=setTimeout(()=>{r(!1)},RS);document.addEventListener("deviceready",()=>{clearTimeout(e),r(!0)})}):!1}function VS(){return typeof window<"u"?window:null}/**
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
 */const ft={LOCAL:"local",NONE:"none",SESSION:"session"},ds=O,ry="persistence";function OS(r,e){if(ds(Object.values(ft).includes(e),r,"invalid-persistence-type"),Ou()){ds(e!==ft.SESSION,r,"unsupported-persistence-type");return}if(tc()){ds(e===ft.NONE,r,"unsupported-persistence-type");return}if(sh()){ds(e===ft.NONE||e===ft.LOCAL&&zs(),r,"unsupported-persistence-type");return}ds(e===ft.NONE||ty(),r,"unsupported-persistence-type")}async function jl(r){await r._initializationPromise;const e=iy(),t=gr(ry,r.config.apiKey,r.name);e&&e.setItem(t,r._getPersistenceType())}function MS(r,e){const t=iy();if(!t)return[];const n=gr(ry,r,e);switch(t.getItem(n)){case ft.NONE:return[di];case ft.LOCAL:return[Qs,wr];case ft.SESSION:return[wr];default:return[]}}function iy(){var r;try{return((r=VS())==null?void 0:r.sessionStorage)||null}catch{return null}}/**
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
 */const FS=O;class vn{constructor(){this.browserResolver=pt(XA),this.cordovaResolver=pt(TS),this.underlyingResolver=null,this._redirectPersistence=wr,this._completeRedirectFn=dc,this._overrideRedirectResult=rh}async _initialize(e){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._initialize(e)}async _openPopup(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openPopup(e,t,n,i)}async _openRedirect(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openRedirect(e,t,n,i)}_isIframeWebStorageSupported(e,t){this.assertedUnderlyingResolver._isIframeWebStorageSupported(e,t)}_originValidation(e){return this.assertedUnderlyingResolver._originValidation(e)}get _shouldInitProactively(){return ny()||this.browserResolver._shouldInitProactively}get assertedUnderlyingResolver(){return FS(this.underlyingResolver,"internal-error"),this.underlyingResolver}async selectUnderlyingResolver(){if(this.underlyingResolver)return;const e=await NS();this.underlyingResolver=e?this.cordovaResolver:this.browserResolver}}/**
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
 */function sy(r){return r.unwrap()}function LS(r){return r.wrapped()}/**
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
 */function US(r){return oy(r)}function BS(r,e){var n;const t=(n=e.customData)==null?void 0:n._tokenResponse;if((e==null?void 0:e.code)==="auth/multi-factor-auth-required"){const i=e;i.resolver=new $S(r,Db(r,e))}else if(t){const i=oy(e),s=e;i&&(s.credential=i,s.tenantId=t.tenantId||void 0,s.email=t.email||void 0,s.phoneNumber=t.phoneNumber||void 0)}}function oy(r){const{_tokenResponse:e}=r instanceof nt?r.customData:r;if(!e)return null;if(!(r instanceof nt)&&"temporaryProof"in e&&"phoneNumber"in e)return Ir.credentialFromResult(r);const t=e.providerId;if(!t||t===us.PASSWORD)return null;let n;switch(t){case us.GOOGLE:n=Vt;break;case us.FACEBOOK:n=Nt;break;case us.GITHUB:n=Ot;break;case us.TWITTER:n=Mt;break;default:const{oauthIdToken:i,oauthAccessToken:s,oauthTokenSecret:o,pendingToken:c,nonce:l}=e;return!s&&!o&&!i&&!c?null:c?t.startsWith("saml.")?fi._create(t,c):Kt._fromParams({providerId:t,signInMethod:t,pendingToken:c,idToken:i,accessToken:s}):new oi(t).credential({idToken:i,accessToken:s,rawNonce:l})}return r instanceof nt?n.credentialFromError(r):n.credentialFromResult(r)}function ot(r,e){return e.catch(t=>{throw t instanceof nt&&BS(r,t),t}).then(t=>{const n=t.operationType,i=t.user;return{operationType:n,credential:US(t),additionalUserInfo:kb(t),user:fc.getOrCreate(i)}})}async function Gl(r,e){const t=await e;return{verificationId:t.verificationId,confirm:n=>ot(r,t.confirm(n))}}class $S{constructor(e,t){this.resolver=t,this.auth=LS(e)}get session(){return this.resolver.session}get hints(){return this.resolver.hints}resolveSignIn(e){return ot(sy(this.auth),this.resolver.resolveSignIn(e))}}/**
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
 */let fc=class vs{constructor(e){this._delegate=e,this.multiFactor=Vb(e)}static getOrCreate(e){return vs.USER_MAP.has(e)||vs.USER_MAP.set(e,new vs(e)),vs.USER_MAP.get(e)}delete(){return this._delegate.delete()}reload(){return this._delegate.reload()}toJSON(){return this._delegate.toJSON()}getIdTokenResult(e){return this._delegate.getIdTokenResult(e)}getIdToken(e){return this._delegate.getIdToken(e)}linkAndRetrieveDataWithCredential(e){return this.linkWithCredential(e)}async linkWithCredential(e){return ot(this.auth,Om(this._delegate,e))}async linkWithPhoneNumber(e,t){return Gl(this.auth,rA(this._delegate,e,t))}async linkWithPopup(e){return ot(this.auth,dA(this._delegate,e,vn))}async linkWithRedirect(e){return await jl(we(this.auth)),EA(this._delegate,e,vn)}reauthenticateAndRetrieveDataWithCredential(e){return this.reauthenticateWithCredential(e)}async reauthenticateWithCredential(e){return ot(this.auth,Mm(this._delegate,e))}reauthenticateWithPhoneNumber(e,t){return Gl(this.auth,iA(this._delegate,e,t))}reauthenticateWithPopup(e){return ot(this.auth,hA(this._delegate,e,vn))}async reauthenticateWithRedirect(e){return await jl(we(this.auth)),wA(this._delegate,e,vn)}sendEmailVerification(e){return wb(this._delegate,e)}async unlink(e){return await sb(this._delegate,e),this}updateEmail(e){return Tb(this._delegate,e)}updatePassword(e){return bb(this._delegate,e)}updatePhoneNumber(e){return sA(this._delegate,e)}updateProfile(e){return vb(this._delegate,e)}verifyBeforeUpdateEmail(e,t){return Ib(this._delegate,e,t)}get emailVerified(){return this._delegate.emailVerified}get isAnonymous(){return this._delegate.isAnonymous}get metadata(){return this._delegate.metadata}get phoneNumber(){return this._delegate.phoneNumber}get providerData(){return this._delegate.providerData}get refreshToken(){return this._delegate.refreshToken}get tenantId(){return this._delegate.tenantId}get displayName(){return this._delegate.displayName}get email(){return this._delegate.email}get photoURL(){return this._delegate.photoURL}get providerId(){return this._delegate.providerId}get uid(){return this._delegate.uid}get auth(){return this._delegate.auth}};fc.USER_MAP=new WeakMap;/**
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
 */const fs=O;class Wl{constructor(e,t){if(this.app=e,t.isInitialized()){this._delegate=t.getImmediate(),this.linkUnderlyingAuth();return}const{apiKey:n}=e.options;fs(n,"invalid-api-key",{appName:e.name}),fs(n,"invalid-api-key",{appName:e.name});const i=typeof window<"u"?vn:void 0;this._delegate=t.initialize({options:{persistence:qS(n,e.name),popupRedirectResolver:i}}),this._delegate._updateErrorMap(Hv),this.linkUnderlyingAuth()}get emulatorConfig(){return this._delegate.emulatorConfig}get currentUser(){return this._delegate.currentUser?fc.getOrCreate(this._delegate.currentUser):null}get languageCode(){return this._delegate.languageCode}set languageCode(e){this._delegate.languageCode=e}get settings(){return this._delegate.settings}get tenantId(){return this._delegate.tenantId}set tenantId(e){this._delegate.tenantId=e}useDeviceLanguage(){this._delegate.useDeviceLanguage()}signOut(){return this._delegate.signOut()}useEmulator(e,t){MT(this._delegate,e,t)}applyActionCode(e){return ub(this._delegate,e)}checkActionCode(e){return Fm(this._delegate,e)}confirmPasswordReset(e,t){return lb(this._delegate,e,t)}async createUserWithEmailAndPassword(e,t){return ot(this._delegate,db(this._delegate,e,t))}fetchProvidersForEmail(e){return this.fetchSignInMethodsForEmail(e)}fetchSignInMethodsForEmail(e){return _b(this._delegate,e)}isSignInWithEmailLink(e){return gb(this._delegate,e)}async getRedirectResult(){fs(Rl(),this._delegate,"operation-not-supported-in-this-environment");const e=await TA(this._delegate,vn);return e?ot(this._delegate,Promise.resolve(e)):{credential:null,user:null}}addFrameworkForLogging(e){bS(this._delegate,e)}onAuthStateChanged(e,t,n){const{next:i,error:s,complete:o}=ap(e,t,n);return this._delegate.onAuthStateChanged(i,s,o)}onIdTokenChanged(e,t,n){const{next:i,error:s,complete:o}=ap(e,t,n);return this._delegate.onIdTokenChanged(i,s,o)}sendSignInLinkToEmail(e,t){return pb(this._delegate,e,t)}sendPasswordResetEmail(e,t){return cb(this._delegate,e,t||void 0)}async setPersistence(e){OS(this._delegate,e);let t;switch(e){case ft.SESSION:t=wr;break;case ft.LOCAL:t=await pt(Qs)._isAvailable()?Qs:Xu;break;case ft.NONE:t=di;break;default:return ze("argument-error",{appName:this._delegate.name})}return this._delegate.setPersistence(t)}signInAndRetrieveDataWithCredential(e){return this.signInWithCredential(e)}signInAnonymously(){return ot(this._delegate,ib(this._delegate))}signInWithCredential(e){return ot(this._delegate,ac(this._delegate,e))}signInWithCustomToken(e){return ot(this._delegate,ab(this._delegate,e))}signInWithEmailAndPassword(e,t){return ot(this._delegate,fb(this._delegate,e,t))}signInWithEmailLink(e,t){return ot(this._delegate,mb(this._delegate,e,t))}signInWithPhoneNumber(e,t){return Gl(this._delegate,nA(this._delegate,e,t))}async signInWithPopup(e){return fs(Rl(),this._delegate,"operation-not-supported-in-this-environment"),ot(this._delegate,uA(this._delegate,e,vn))}async signInWithRedirect(e){return fs(Rl(),this._delegate,"operation-not-supported-in-this-environment"),await jl(this._delegate),yA(this._delegate,e,vn)}updateCurrentUser(e){return this._delegate.updateCurrentUser(e)}verifyPasswordResetCode(e){return hb(this._delegate,e)}unwrap(){return this._delegate}_delete(){return this._delegate._delete()}linkUnderlyingAuth(){this._delegate.wrapped=()=>this}}Wl.Persistence=ft;function ap(r,e,t){let n=r;typeof r!="function"&&({next:n,error:e,complete:t}=r);const i=n;return{next:o=>i(o&&fc.getOrCreate(o)),error:e,complete:t}}function qS(r,e){const t=MS(r,e);if(typeof self<"u"&&!t.includes(Qs)&&t.push(Qs),typeof window<"u")for(const n of[Xu,wr])t.includes(n)||t.push(n);return t.includes(di)||t.push(di),t}/**
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
 */class oh{static credential(e,t){return Ir.credential(e,t)}constructor(){this.providerId="phone",this._delegate=new Ir(sy(Ue.auth()))}verifyPhoneNumber(e,t){return this._delegate.verifyPhoneNumber(e,t)}unwrap(){return this._delegate}}oh.PHONE_SIGN_IN_METHOD=Ir.PHONE_SIGN_IN_METHOD;oh.PROVIDER_ID=Ir.PROVIDER_ID;/**
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
 */const zS=O;class KS{constructor(e,t,n=Ue.app()){var i;zS((i=n.options)==null?void 0:i.apiKey,"invalid-api-key",{appName:n.name}),this._delegate=new eA(n.auth(),e,t),this.type=this._delegate.type}clear(){this._delegate.clear()}render(){return this._delegate.render()}verify(){return this._delegate.verify()}}/**
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
 */const jS="auth-compat";function GS(r){r.INTERNAL.registerComponent(new zt(jS,e=>{const t=e.getProvider("app-compat").getImmediate(),n=e.getProvider("auth");return new Wl(t,n)},"PUBLIC").setServiceProps({ActionCodeInfo:{Operation:{EMAIL_SIGNIN:$r.EMAIL_SIGNIN,PASSWORD_RESET:$r.PASSWORD_RESET,RECOVER_EMAIL:$r.RECOVER_EMAIL,REVERT_SECOND_FACTOR_ADDITION:$r.REVERT_SECOND_FACTOR_ADDITION,VERIFY_AND_CHANGE_EMAIL:$r.VERIFY_AND_CHANGE_EMAIL,VERIFY_EMAIL:$r.VERIFY_EMAIL}},EmailAuthProvider:zn,FacebookAuthProvider:Nt,GithubAuthProvider:Ot,GoogleAuthProvider:Vt,OAuthProvider:oi,SAMLAuthProvider:ka,PhoneAuthProvider:oh,PhoneMultiFactorGenerator:Zm,RecaptchaVerifier:KS,TwitterAuthProvider:Mt,Auth:Wl,AuthCredential:Fi,Error:nt}).setInstantiationMode("LAZY").setMultipleInstances(!1)),r.registerVersion(AS,SS)}GS(Ue);var cp=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Rn,ay;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,y){function w(){}w.prototype=y.prototype,E.F=y.prototype,E.prototype=new w,E.prototype.constructor=E,E.D=function(b,v,R){for(var _=Array(arguments.length-2),st=2;st<arguments.length;st++)_[st-2]=arguments[st];return y.prototype[v].apply(b,_)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(E,y,w){w||(w=0);const b=Array(16);if(typeof y=="string")for(var v=0;v<16;++v)b[v]=y.charCodeAt(w++)|y.charCodeAt(w++)<<8|y.charCodeAt(w++)<<16|y.charCodeAt(w++)<<24;else for(v=0;v<16;++v)b[v]=y[w++]|y[w++]<<8|y[w++]<<16|y[w++]<<24;y=E.g[0],w=E.g[1],v=E.g[2];let R=E.g[3],_;_=y+(R^w&(v^R))+b[0]+3614090360&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[1]+3905402710&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[2]+606105819&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[3]+3250441966&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[4]+4118548399&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[5]+1200080426&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[6]+2821735955&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[7]+4249261313&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[8]+1770035416&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[9]+2336552879&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[10]+4294925233&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[11]+2304563134&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[12]+1804603682&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[13]+4254626195&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[14]+2792965006&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[15]+1236535329&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(v^R&(w^v))+b[1]+4129170786&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[6]+3225465664&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[11]+643717713&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[0]+3921069994&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[5]+3593408605&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[10]+38016083&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[15]+3634488961&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[4]+3889429448&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[9]+568446438&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[14]+3275163606&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[3]+4107603335&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[8]+1163531501&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[13]+2850285829&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[2]+4243563512&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[7]+1735328473&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[12]+2368359562&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(w^v^R)+b[5]+4294588738&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[8]+2272392833&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[11]+1839030562&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[14]+4259657740&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[1]+2763975236&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[4]+1272893353&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[7]+4139469664&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[10]+3200236656&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[13]+681279174&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[0]+3936430074&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[3]+3572445317&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[6]+76029189&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[9]+3654602809&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[12]+3873151461&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[15]+530742520&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[2]+3299628645&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(v^(w|~R))+b[0]+4096336452&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[7]+1126891415&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[14]+2878612391&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[5]+4237533241&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[12]+1700485571&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[3]+2399980690&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[10]+4293915773&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[1]+2240044497&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[8]+1873313359&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[15]+4264355552&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[6]+2734768916&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[13]+1309151649&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[4]+4149444226&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[11]+3174756917&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[2]+718787259&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[9]+3951481745&4294967295,E.g[0]=E.g[0]+y&4294967295,E.g[1]=E.g[1]+(v+(_<<21&4294967295|_>>>11))&4294967295,E.g[2]=E.g[2]+v&4294967295,E.g[3]=E.g[3]+R&4294967295}n.prototype.v=function(E,y){y===void 0&&(y=E.length);const w=y-this.blockSize,b=this.C;let v=this.h,R=0;for(;R<y;){if(v==0)for(;R<=w;)i(this,E,R),R+=this.blockSize;if(typeof E=="string"){for(;R<y;)if(b[v++]=E.charCodeAt(R++),v==this.blockSize){i(this,b),v=0;break}}else for(;R<y;)if(b[v++]=E[R++],v==this.blockSize){i(this,b),v=0;break}}this.h=v,this.o+=y},n.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var y=1;y<E.length-8;++y)E[y]=0;y=this.o*8;for(var w=E.length-8;w<E.length;++w)E[w]=y&255,y/=256;for(this.v(E),E=Array(16),y=0,w=0;w<4;++w)for(let b=0;b<32;b+=8)E[y++]=this.g[w]>>>b&255;return E};function s(E,y){var w=c;return Object.prototype.hasOwnProperty.call(w,E)?w[E]:w[E]=y(E)}function o(E,y){this.h=y;const w=[];let b=!0;for(let v=E.length-1;v>=0;v--){const R=E[v]|0;b&&R==y||(w[v]=R,b=!1)}this.g=w}var c={};function l(E){return-128<=E&&E<128?s(E,function(y){return new o([y|0],y<0?-1:0)}):new o([E|0],E<0?-1:0)}function u(E){if(isNaN(E)||!isFinite(E))return p;if(E<0)return T(u(-E));const y=[];let w=1;for(let b=0;E>=w;b++)y[b]=E/w|0,w*=4294967296;return new o(y,0)}function d(E,y){if(E.length==0)throw Error("number format error: empty string");if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(E.charAt(0)=="-")return T(d(E.substring(1),y));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const w=u(Math.pow(y,8));let b=p;for(let R=0;R<E.length;R+=8){var v=Math.min(8,E.length-R);const _=parseInt(E.substring(R,R+v),y);v<8?(v=u(Math.pow(y,v)),b=b.j(v).add(u(_))):(b=b.j(w),b=b.add(u(_)))}return b}var p=l(0),g=l(1),I=l(16777216);r=o.prototype,r.m=function(){if(D(this))return-T(this).m();let E=0,y=1;for(let w=0;w<this.g.length;w++){const b=this.i(w);E+=(b>=0?b:4294967296+b)*y,y*=4294967296}return E},r.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(P(this))return"0";if(D(this))return"-"+T(this).toString(E);const y=u(Math.pow(E,6));var w=this;let b="";for(;;){const v=j(w,y).g;w=V(w,v.j(y));let R=((w.g.length>0?w.g[0]:w.h)>>>0).toString(E);if(w=v,P(w))return R+b;for(;R.length<6;)R="0"+R;b=R+b}},r.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function P(E){if(E.h!=0)return!1;for(let y=0;y<E.g.length;y++)if(E.g[y]!=0)return!1;return!0}function D(E){return E.h==-1}r.l=function(E){return E=V(this,E),D(E)?-1:P(E)?0:1};function T(E){const y=E.g.length,w=[];for(let b=0;b<y;b++)w[b]=~E.g[b];return new o(w,~E.h).add(g)}r.abs=function(){return D(this)?T(this):this},r.add=function(E){const y=Math.max(this.g.length,E.g.length),w=[];let b=0;for(let v=0;v<=y;v++){let R=b+(this.i(v)&65535)+(E.i(v)&65535),_=(R>>>16)+(this.i(v)>>>16)+(E.i(v)>>>16);b=_>>>16,R&=65535,_&=65535,w[v]=_<<16|R}return new o(w,w[w.length-1]&-2147483648?-1:0)};function V(E,y){return E.add(T(y))}r.j=function(E){if(P(this)||P(E))return p;if(D(this))return D(E)?T(this).j(T(E)):T(T(this).j(E));if(D(E))return T(this.j(T(E)));if(this.l(I)<0&&E.l(I)<0)return u(this.m()*E.m());const y=this.g.length+E.g.length,w=[];for(var b=0;b<2*y;b++)w[b]=0;for(b=0;b<this.g.length;b++)for(let v=0;v<E.g.length;v++){const R=this.i(b)>>>16,_=this.i(b)&65535,st=E.i(v)>>>16,Qn=E.i(v)&65535;w[2*b+2*v]+=_*Qn,M(w,2*b+2*v),w[2*b+2*v+1]+=R*Qn,M(w,2*b+2*v+1),w[2*b+2*v+1]+=_*st,M(w,2*b+2*v+1),w[2*b+2*v+2]+=R*st,M(w,2*b+2*v+2)}for(E=0;E<y;E++)w[E]=w[2*E+1]<<16|w[2*E];for(E=y;E<2*y;E++)w[E]=0;return new o(w,0)};function M(E,y){for(;(E[y]&65535)!=E[y];)E[y+1]+=E[y]>>>16,E[y]&=65535,y++}function B(E,y){this.g=E,this.h=y}function j(E,y){if(P(y))throw Error("division by zero");if(P(E))return new B(p,p);if(D(E))return y=j(T(E),y),new B(T(y.g),T(y.h));if(D(y))return y=j(E,T(y)),new B(T(y.g),y.h);if(E.g.length>30){if(D(E)||D(y))throw Error("slowDivide_ only works with positive integers.");for(var w=g,b=y;b.l(E)<=0;)w=Q(w),b=Q(b);var v=W(w,1),R=W(b,1);for(b=W(b,2),w=W(w,2);!P(b);){var _=R.add(b);_.l(E)<=0&&(v=v.add(w),R=_),b=W(b,1),w=W(w,1)}return y=V(E,v.j(y)),new B(v,y)}for(v=p;E.l(y)>=0;){for(w=Math.max(1,Math.floor(E.m()/y.m())),b=Math.ceil(Math.log(w)/Math.LN2),b=b<=48?1:Math.pow(2,b-48),R=u(w),_=R.j(y);D(_)||_.l(E)>0;)w-=b,R=u(w),_=R.j(y);P(R)&&(R=g),v=v.add(R),E=V(E,_)}return new B(v,E)}r.B=function(E){return j(this,E).h},r.and=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)&E.i(b);return new o(w,this.h&E.h)},r.or=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)|E.i(b);return new o(w,this.h|E.h)},r.xor=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)^E.i(b);return new o(w,this.h^E.h)};function Q(E){const y=E.g.length+1,w=[];for(let b=0;b<y;b++)w[b]=E.i(b)<<1|E.i(b-1)>>>31;return new o(w,E.h)}function W(E,y){const w=y>>5;y%=32;const b=E.g.length-w,v=[];for(let R=0;R<b;R++)v[R]=y>0?E.i(R+w)>>>y|E.i(R+w+1)<<32-y:E.i(R+w);return new o(v,E.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,ay=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=u,o.fromString=d,Rn=o}).apply(typeof cp<"u"?cp:typeof self<"u"?self:typeof window<"u"?window:{});var na=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var cy,Ts,ly,fa,Hl,uy,hy,dy;(function(){var r,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof na=="object"&&na];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var n=t(this);function i(a,h){if(h)e:{var f=n;a=a.split(".");for(var m=0;m<a.length-1;m++){var S=a[m];if(!(S in f))break e;f=f[S]}a=a[a.length-1],m=f[a],h=h(m),h!=m&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(h){var f=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&f.push([m,h[m]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function l(a,h,f){return a.call.apply(a.bind,arguments)}function u(a,h,f){return u=l,u.apply(null,arguments)}function d(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var m=f.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,h){function f(){}f.prototype=h.prototype,a.Z=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Ob=function(m,S,k){for(var L=Array(arguments.length-2),Y=2;Y<arguments.length;Y++)L[Y-2]=arguments[Y];return h.prototype[S].apply(m,L)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function I(a){const h=a.length;if(h>0){const f=Array(h);for(let m=0;m<h;m++)f[m]=a[m];return f}return[]}function P(a,h){for(let m=1;m<arguments.length;m++){const S=arguments[m];var f=typeof S;if(f=f!="object"?f:S?Array.isArray(S)?"array":f:"null",f=="array"||f=="object"&&typeof S.length=="number"){f=a.length||0;const k=S.length||0;a.length=f+k;for(let L=0;L<k;L++)a[f+L]=S[L]}else a.push(S)}}class D{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function T(a){o.setTimeout(()=>{throw a},0)}function V(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class M{constructor(){this.h=this.g=null}add(h,f){const m=B.get();m.set(h,f),this.h?this.h.next=m:this.g=m,this.h=m}}var B=new D(()=>new j,a=>a.reset());class j{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let Q,W=!1,E=new M,y=()=>{const a=Promise.resolve(void 0);Q=()=>{a.then(w)}};function w(){for(var a;a=V();){try{a.h.call(a.g)}catch(f){T(f)}var h=B;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}W=!1}function b(){this.u=this.u,this.C=this.C}b.prototype.u=!1,b.prototype.dispose=function(){this.u||(this.u=!0,this.N())},b.prototype[Symbol.dispose]=function(){this.dispose()},b.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function v(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}v.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};o.addEventListener("test",f,h),o.removeEventListener("test",f,h)}catch{}return a}();function _(a){return/^[\s\xa0]*$/.test(a)}function st(a,h){v.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(st,v),st.prototype.init=function(a,h){const f=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&st.Z.h.call(this)},st.prototype.h=function(){st.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Qn="closure_listenable_"+(Math.random()*1e6|0),EI=0;function vI(a,h,f,m,S){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!m,this.ha=S,this.key=++EI,this.da=this.fa=!1}function Bo(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function $o(a,h,f){for(const m in a)h.call(f,a[m],m,a)}function TI(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function Ad(a){const h={};for(const f in a)h[f]=a[f];return h}const Sd="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Rd(a,h){let f,m;for(let S=1;S<arguments.length;S++){m=arguments[S];for(f in m)a[f]=m[f];for(let k=0;k<Sd.length;k++)f=Sd[k],Object.prototype.hasOwnProperty.call(m,f)&&(a[f]=m[f])}}function qo(a){this.src=a,this.g={},this.h=0}qo.prototype.add=function(a,h,f,m,S){const k=a.toString();a=this.g[k],a||(a=this.g[k]=[],this.h++);const L=Hc(a,h,m,S);return L>-1?(h=a[L],f||(h.fa=!1)):(h=new vI(h,this.src,k,!!m,S),h.fa=f,a.push(h)),h};function Wc(a,h){const f=h.type;if(f in a.g){var m=a.g[f],S=Array.prototype.indexOf.call(m,h,void 0),k;(k=S>=0)&&Array.prototype.splice.call(m,S,1),k&&(Bo(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function Hc(a,h,f,m){for(let S=0;S<a.length;++S){const k=a[S];if(!k.da&&k.listener==h&&k.capture==!!f&&k.ha==m)return S}return-1}var Qc="closure_lm_"+(Math.random()*1e6|0),Yc={};function Pd(a,h,f,m,S){if(Array.isArray(h)){for(let k=0;k<h.length;k++)Pd(a,h[k],f,m,S);return null}return f=Dd(f),a&&a[Qn]?a.J(h,f,c(m)?!!m.capture:!1,S):bI(a,h,f,!1,m,S)}function bI(a,h,f,m,S,k){if(!h)throw Error("Invalid event type");const L=c(S)?!!S.capture:!!S;let Y=Xc(a);if(Y||(a[Qc]=Y=new qo(a)),f=Y.add(h,f,m,L,k),f.proxy)return f;if(m=AI(),f.proxy=m,m.src=a,m.listener=f,a.addEventListener)R||(S=L),S===void 0&&(S=!1),a.addEventListener(h.toString(),m,S);else if(a.attachEvent)a.attachEvent(kd(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return f}function AI(){function a(f){return h.call(a.src,a.listener,f)}const h=SI;return a}function Cd(a,h,f,m,S){if(Array.isArray(h))for(var k=0;k<h.length;k++)Cd(a,h[k],f,m,S);else m=c(m)?!!m.capture:!!m,f=Dd(f),a&&a[Qn]?(a=a.i,k=String(h).toString(),k in a.g&&(h=a.g[k],f=Hc(h,f,m,S),f>-1&&(Bo(h[f]),Array.prototype.splice.call(h,f,1),h.length==0&&(delete a.g[k],a.h--)))):a&&(a=Xc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Hc(h,f,m,S)),(f=a>-1?h[a]:null)&&Jc(f))}function Jc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[Qn])Wc(h.i,a);else{var f=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(f,m,a.capture):h.detachEvent?h.detachEvent(kd(f),m):h.addListener&&h.removeListener&&h.removeListener(m),(f=Xc(h))?(Wc(f,a),f.h==0&&(f.src=null,h[Qc]=null)):Bo(a)}}}function kd(a){return a in Yc?Yc[a]:Yc[a]="on"+a}function SI(a,h){if(a.da)a=!0;else{h=new st(h,this);const f=a.listener,m=a.ha||a.src;a.fa&&Jc(a),a=f.call(m,h)}return a}function Xc(a){return a=a[Qc],a instanceof qo?a:null}var Zc="__closure_events_fn_"+(Math.random()*1e9>>>0);function Dd(a){return typeof a=="function"?a:(a[Zc]||(a[Zc]=function(h){return a.handleEvent(h)}),a[Zc])}function Ke(){b.call(this),this.i=new qo(this),this.M=this,this.G=null}p(Ke,b),Ke.prototype[Qn]=!0,Ke.prototype.removeEventListener=function(a,h,f,m){Cd(this,a,h,f,m)};function Ye(a,h){var f,m=a.G;if(m)for(f=[];m;m=m.G)f.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new v(h,a);else if(h instanceof v)h.target=h.target||a;else{var S=h;h=new v(m,a),Rd(h,S)}S=!0;let k,L;if(f)for(L=f.length-1;L>=0;L--)k=h.g=f[L],S=zo(k,m,!0,h)&&S;if(k=h.g=a,S=zo(k,m,!0,h)&&S,S=zo(k,m,!1,h)&&S,f)for(L=0;L<f.length;L++)k=h.g=f[L],S=zo(k,m,!1,h)&&S}Ke.prototype.N=function(){if(Ke.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const f=a.g[h];for(let m=0;m<f.length;m++)Bo(f[m]);delete a.g[h],a.h--}}this.G=null},Ke.prototype.J=function(a,h,f,m){return this.i.add(String(a),h,!1,f,m)},Ke.prototype.K=function(a,h,f,m){return this.i.add(String(a),h,!0,f,m)};function zo(a,h,f,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let S=!0;for(let k=0;k<h.length;++k){const L=h[k];if(L&&!L.da&&L.capture==f){const Y=L.listener,De=L.ha||L.src;L.fa&&Wc(a.i,L),S=Y.call(De,m)!==!1&&S}}return S&&!m.defaultPrevented}function RI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=u(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function xd(a){a.g=RI(()=>{a.g=null,a.i&&(a.i=!1,xd(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class PI extends b{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:xd(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Wi(a){b.call(this),this.h=a,this.g={}}p(Wi,b);var Nd=[];function Vd(a){$o(a.g,function(h,f){this.g.hasOwnProperty(f)&&Jc(h)},a),a.g={}}Wi.prototype.N=function(){Wi.Z.N.call(this),Vd(this)},Wi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var el=o.JSON.stringify,CI=o.JSON.parse,kI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function Od(){}function Md(){}var Hi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function tl(){v.call(this,"d")}p(tl,v);function nl(){v.call(this,"c")}p(nl,v);var Yn={},Fd=null;function Ko(){return Fd=Fd||new Ke}Yn.Ia="serverreachability";function Ld(a){v.call(this,Yn.Ia,a)}p(Ld,v);function Qi(a){const h=Ko();Ye(h,new Ld(h))}Yn.STAT_EVENT="statevent";function Ud(a,h){v.call(this,Yn.STAT_EVENT,a),this.stat=h}p(Ud,v);function Je(a){const h=Ko();Ye(h,new Ud(h,a))}Yn.Ja="timingevent";function Bd(a,h){v.call(this,Yn.Ja,a),this.size=h}p(Bd,v);function Yi(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function Ji(){this.g=!0}Ji.prototype.ua=function(){this.g=!1};function DI(a,h,f,m,S,k){a.info(function(){if(a.g)if(k){var L="",Y=k.split("&");for(let ae=0;ae<Y.length;ae++){var De=Y[ae].split("=");if(De.length>1){const Ve=De[0];De=De[1];const Ct=Ve.split("_");L=Ct.length>=2&&Ct[1]=="type"?L+(Ve+"="+De+"&"):L+(Ve+"=redacted&")}}}else L=null;else L=k;return"XMLHTTP REQ ("+m+") [attempt "+S+"]: "+h+`
`+f+`
`+L})}function xI(a,h,f,m,S,k,L){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+S+"]: "+h+`
`+f+`
`+k+" "+L})}function Lr(a,h,f,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+VI(a,f)+(m?" "+m:"")})}function NI(a,h){a.info(function(){return"TIMEOUT: "+h})}Ji.prototype.info=function(){};function VI(a,h){if(!a.g)return h;if(!h)return null;try{const k=JSON.parse(h);if(k){for(a=0;a<k.length;a++)if(Array.isArray(k[a])){var f=k[a];if(!(f.length<2)){var m=f[1];if(Array.isArray(m)&&!(m.length<1)){var S=m[0];if(S!="noop"&&S!="stop"&&S!="close")for(let L=1;L<m.length;L++)m[L]=""}}}}return el(k)}catch{return h}}var jo={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},$d={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},qd;function rl(){}p(rl,Od),rl.prototype.g=function(){return new XMLHttpRequest},qd=new rl;function Xi(a){return encodeURIComponent(String(a))}function OI(a){var h=1;a=a.split(":");const f=[];for(;h>0&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function un(a,h,f,m){this.j=a,this.i=h,this.l=f,this.S=m||1,this.V=new Wi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new zd}function zd(){this.i=null,this.g="",this.h=!1}var Kd={},il={};function sl(a,h,f){a.M=1,a.A=Wo(Pt(h)),a.u=f,a.R=!0,jd(a,null)}function jd(a,h){a.F=Date.now(),Go(a),a.B=Pt(a.A);var f=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),sf(f.i,"t",m),a.C=0,f=a.j.L,a.h=new zd,a.g=Tf(a.j,f?h:null,!a.u),a.P>0&&(a.O=new PI(u(a.Y,a,a.g),a.P)),h=a.V,f=a.g,m=a.ba;var S="readystatechange";Array.isArray(S)||(S&&(Nd[0]=S.toString()),S=Nd);for(let k=0;k<S.length;k++){const L=Pd(f,S[k],m||h.handleEvent,!1,h.h||h);if(!L)break;h.g[L.key]=L}h=a.J?Ad(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),Qi(),DI(a.i,a.v,a.B,a.l,a.S,a.u)}un.prototype.ba=function(a){a=a.target;const h=this.O;h&&fn(a)==3?h.j():this.Y(a)},un.prototype.Y=function(a){try{if(a==this.g)e:{const Y=fn(this.g),De=this.g.ya(),ae=this.g.ca();if(!(Y<3)&&(Y!=3||this.g&&(this.h.h||this.g.la()||df(this.g)))){this.K||Y!=4||De==7||(De==8||ae<=0?Qi(3):Qi(2)),ol(this);var h=this.g.ca();this.X=h;var f=MI(this);if(this.o=h==200,xI(this.i,this.v,this.B,this.l,this.S,Y,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,S=this.g;if((m=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!_(m)){var k=m;break t}}k=null}if(a=k)Lr(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,al(this,a);else{this.o=!1,this.m=3,Je(12),Jn(this),Zi(this);break e}}if(this.R){a=!0;let Ve;for(;!this.K&&this.C<f.length;)if(Ve=FI(this,f),Ve==il){Y==4&&(this.m=4,Je(14),a=!1),Lr(this.i,this.l,null,"[Incomplete Response]");break}else if(Ve==Kd){this.m=4,Je(15),Lr(this.i,this.l,f,"[Invalid Chunk]"),a=!1;break}else Lr(this.i,this.l,Ve,null),al(this,Ve);if(Gd(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Y!=4||f.length!=0||this.h.h||(this.m=1,Je(16),a=!1),this.o=this.o&&a,!a)Lr(this.i,this.l,f,"[Invalid Chunked Response]"),Jn(this),Zi(this);else if(f.length>0&&!this.W){this.W=!0;var L=this.j;L.g==this&&L.aa&&!L.P&&(L.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),gl(L),L.P=!0,Je(11))}}else Lr(this.i,this.l,f,null),al(this,f);Y==4&&Jn(this),this.o&&!this.K&&(Y==4?wf(this.j,this):(this.o=!1,Go(this)))}else JI(this.g),h==400&&f.indexOf("Unknown SID")>0?(this.m=3,Je(12)):(this.m=0,Je(13)),Jn(this),Zi(this)}}}catch{}finally{}};function MI(a){if(!Gd(a))return a.g.la();const h=df(a.g);if(h==="")return"";let f="";const m=h.length,S=fn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Jn(a),Zi(a),"";a.h.i=new o.TextDecoder}for(let k=0;k<m;k++)a.h.h=!0,f+=a.h.i.decode(h[k],{stream:!(S&&k==m-1)});return h.length=0,a.h.g+=f,a.C=0,a.h.g}function Gd(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function FI(a,h){var f=a.C,m=h.indexOf(`
`,f);return m==-1?il:(f=Number(h.substring(f,m)),isNaN(f)?Kd:(m+=1,m+f>h.length?il:(h=h.slice(m,m+f),a.C=m+f,h)))}un.prototype.cancel=function(){this.K=!0,Jn(this)};function Go(a){a.T=Date.now()+a.H,Wd(a,a.H)}function Wd(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Yi(u(a.aa,a),h)}function ol(a){a.D&&(o.clearTimeout(a.D),a.D=null)}un.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(NI(this.i,this.B),this.M!=2&&(Qi(),Je(17)),Jn(this),this.m=2,Zi(this)):Wd(this,this.T-a)};function Zi(a){a.j.I==0||a.K||wf(a.j,a)}function Jn(a){ol(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,Vd(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function al(a,h){try{var f=a.j;if(f.I!=0&&(f.g==a||cl(f.h,a))){if(!a.L&&cl(f.h,a)&&f.I==3){try{var m=f.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var S=m;if(S[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<a.F)Xo(f),Yo(f);else break e;pl(f),Je(18)}}else f.xa=S[1],0<f.xa-f.K&&S[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=Yi(u(f.Va,f),6e3));Yd(f.h)<=1&&f.ta&&(f.ta=void 0)}else Zn(f,11)}else if((a.L||f.g==a)&&Xo(f),!_(h))for(S=f.Ba.g.parse(h),h=0;h<S.length;h++){let ae=S[h];const Ve=ae[0];if(!(Ve<=f.K))if(f.K=Ve,ae=ae[1],f.I==2)if(ae[0]=="c"){f.M=ae[1],f.ba=ae[2];const Ct=ae[3];Ct!=null&&(f.ka=Ct,f.j.info("VER="+f.ka));const er=ae[4];er!=null&&(f.za=er,f.j.info("SVER="+f.za));const pn=ae[5];pn!=null&&typeof pn=="number"&&pn>0&&(m=1.5*pn,f.O=m,f.j.info("backChannelRequestTimeoutMs_="+m)),m=f;const gn=a.g;if(gn){const ea=gn.g?gn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(ea){var k=m.h;k.g||ea.indexOf("spdy")==-1&&ea.indexOf("quic")==-1&&ea.indexOf("h2")==-1||(k.j=k.l,k.g=new Set,k.h&&(ll(k,k.h),k.h=null))}if(m.G){const ml=gn.g?gn.g.getResponseHeader("X-HTTP-Session-Id"):null;ml&&(m.wa=ml,ue(m.J,m.G,ml))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-a.F,f.j.info("Handshake RTT: "+f.T+"ms")),m=f;var L=a;if(m.na=vf(m,m.L?m.ba:null,m.W),L.L){Jd(m.h,L);var Y=L,De=m.O;De&&(Y.H=De),Y.D&&(ol(Y),Go(Y)),m.g=L}else yf(m);f.i.length>0&&Jo(f)}else ae[0]!="stop"&&ae[0]!="close"||Zn(f,7);else f.I==3&&(ae[0]=="stop"||ae[0]=="close"?ae[0]=="stop"?Zn(f,7):fl(f):ae[0]!="noop"&&f.l&&f.l.qa(ae),f.A=0)}}Qi(4)}catch{}}var LI=class{constructor(a,h){this.g=a,this.map=h}};function Hd(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Qd(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Yd(a){return a.h?1:a.g?a.g.size:0}function cl(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function ll(a,h){a.g?a.g.add(h):a.h=h}function Jd(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Hd.prototype.cancel=function(){if(this.i=Xd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Xd(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.G);return h}return I(a.i)}var Zd=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function UI(a,h){if(a){a=a.split("&");for(let f=0;f<a.length;f++){const m=a[f].indexOf("=");let S,k=null;m>=0?(S=a[f].substring(0,m),k=a[f].substring(m+1)):S=a[f],h(S,k?decodeURIComponent(k.replace(/\+/g," ")):"")}}}function hn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof hn?(this.l=a.l,es(this,a.j),this.o=a.o,this.g=a.g,ts(this,a.u),this.h=a.h,ul(this,of(a.i)),this.m=a.m):a&&(h=String(a).match(Zd))?(this.l=!1,es(this,h[1]||"",!0),this.o=ns(h[2]||""),this.g=ns(h[3]||"",!0),ts(this,h[4]),this.h=ns(h[5]||"",!0),ul(this,h[6]||"",!0),this.m=ns(h[7]||"")):(this.l=!1,this.i=new is(null,this.l))}hn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(rs(h,ef,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(rs(h,ef,!0),"@"),a.push(Xi(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&a.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(rs(f,f.charAt(0)=="/"?qI:$I,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",rs(f,KI)),a.join("")},hn.prototype.resolve=function(a){const h=Pt(this);let f=!!a.j;f?es(h,a.j):f=!!a.o,f?h.o=a.o:f=!!a.g,f?h.g=a.g:f=a.u!=null;var m=a.h;if(f)ts(h,a.u);else if(f=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var S=h.h.lastIndexOf("/");S!=-1&&(m=h.h.slice(0,S+1)+m)}if(S=m,S==".."||S==".")m="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){m=S.lastIndexOf("/",0)==0,S=S.split("/");const k=[];for(let L=0;L<S.length;){const Y=S[L++];Y=="."?m&&L==S.length&&k.push(""):Y==".."?((k.length>1||k.length==1&&k[0]!="")&&k.pop(),m&&L==S.length&&k.push("")):(k.push(Y),m=!0)}m=k.join("/")}else m=S}return f?h.h=m:f=a.i.toString()!=="",f?ul(h,of(a.i)):f=!!a.m,f&&(h.m=a.m),h};function Pt(a){return new hn(a)}function es(a,h,f){a.j=f?ns(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function ts(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function ul(a,h,f){h instanceof is?(a.i=h,jI(a.i,a.l)):(f||(h=rs(h,zI)),a.i=new is(h,a.l))}function ue(a,h,f){a.i.set(h,f)}function Wo(a){return ue(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function ns(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function rs(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,BI),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function BI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var ef=/[#\/\?@]/g,$I=/[#\?:]/g,qI=/[#\?]/g,zI=/[#\?@]/g,KI=/#/g;function is(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Xn(a){a.g||(a.g=new Map,a.h=0,a.i&&UI(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}r=is.prototype,r.add=function(a,h){Xn(this),this.i=null,a=Ur(this,a);let f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function tf(a,h){Xn(a),h=Ur(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function nf(a,h){return Xn(a),h=Ur(a,h),a.g.has(h)}r.forEach=function(a,h){Xn(this),this.g.forEach(function(f,m){f.forEach(function(S){a.call(h,S,m,this)},this)},this)};function rf(a,h){Xn(a);let f=[];if(typeof h=="string")nf(a,h)&&(f=f.concat(a.g.get(Ur(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)f=f.concat(a[h]);return f}r.set=function(a,h){return Xn(this),this.i=null,a=Ur(this,a),nf(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},r.get=function(a,h){return a?(a=rf(this,a),a.length>0?String(a[0]):h):h};function sf(a,h,f){tf(a,h),f.length>0&&(a.i=null,a.g.set(Ur(a,h),I(f)),a.h+=f.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var f=h[m];const S=Xi(f);f=rf(this,f);for(let k=0;k<f.length;k++){let L=S;f[k]!==""&&(L+="="+Xi(f[k])),a.push(L)}}return this.i=a.join("&")};function of(a){const h=new is;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function Ur(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function jI(a,h){h&&!a.j&&(Xn(a),a.i=null,a.g.forEach(function(f,m){const S=m.toLowerCase();m!=S&&(tf(this,m),sf(this,S,f))},a)),a.j=h}function GI(a,h){const f=new Ji;if(o.Image){const m=new Image;m.onload=d(dn,f,"TestLoadImage: loaded",!0,h,m),m.onerror=d(dn,f,"TestLoadImage: error",!1,h,m),m.onabort=d(dn,f,"TestLoadImage: abort",!1,h,m),m.ontimeout=d(dn,f,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function WI(a,h){const f=new Ji,m=new AbortController,S=setTimeout(()=>{m.abort(),dn(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(k=>{clearTimeout(S),k.ok?dn(f,"TestPingServer: ok",!0,h):dn(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(S),dn(f,"TestPingServer: error",!1,h)})}function dn(a,h,f,m,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),m(f)}catch{}}function HI(){this.g=new kI}function hl(a){this.i=a.Sb||null,this.h=a.ab||!1}p(hl,Od),hl.prototype.g=function(){return new Ho(this.i,this.h)};function Ho(a,h){Ke.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Ho,Ke),r=Ho.prototype,r.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,os(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,ss(this)),this.readyState=0},r.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,os(this)),this.g&&(this.readyState=3,os(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;af(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function af(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}r.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?ss(this):os(this),this.readyState==3&&af(this)}},r.Oa=function(a){this.g&&(this.response=this.responseText=a,ss(this))},r.Na=function(a){this.g&&(this.response=a,ss(this))},r.ga=function(){this.g&&ss(this)};function ss(a){a.readyState=4,a.l=null,a.j=null,a.B=null,os(a)}r.setRequestHeader=function(a,h){this.A.append(a,h)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function os(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Ho.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function cf(a){let h="";return $o(a,function(f,m){h+=m,h+=":",h+=f,h+=`\r
`}),h}function dl(a,h,f){e:{for(m in f){var m=!1;break e}m=!0}m||(f=cf(f),typeof a=="string"?f!=null&&Xi(f):ue(a,h,f))}function Ie(a){Ke.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(Ie,Ke);var QI=/^https?$/i,YI=["POST","PUT"];r=Ie.prototype,r.Fa=function(a){this.H=a},r.ea=function(a,h,f,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():qd.g(),this.g.onreadystatechange=g(u(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(k){lf(this,k);return}if(a=f||"",f=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var S in m)f.set(S,m[S]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const k of m.keys())f.set(k,m.get(k));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(f.keys()).find(k=>k.toLowerCase()=="content-type"),S=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(YI,h,void 0)>=0)||m||S||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[k,L]of f)this.g.setRequestHeader(k,L);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(k){lf(this,k)}};function lf(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,uf(a),Qo(a)}function uf(a){a.A||(a.A=!0,Ye(a,"complete"),Ye(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,Ye(this,"complete"),Ye(this,"abort"),Qo(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Qo(this,!0)),Ie.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?hf(this):this.Xa())},r.Xa=function(){hf(this)};function hf(a){if(a.h&&typeof s<"u"){if(a.v&&fn(a)==4)setTimeout(a.Ca.bind(a),0);else if(Ye(a,"readystatechange"),fn(a)==4){a.h=!1;try{const k=a.ca();e:switch(k){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var m;if(m=k===0){let L=String(a.D).match(Zd)[1]||null;!L&&o.self&&o.self.location&&(L=o.self.location.protocol.slice(0,-1)),m=!QI.test(L?L.toLowerCase():"")}f=m}if(f)Ye(a,"complete"),Ye(a,"success");else{a.o=6;try{var S=fn(a)>2?a.g.statusText:""}catch{S=""}a.l=S+" ["+a.ca()+"]",uf(a)}}finally{Qo(a)}}}}function Qo(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const f=a.g;a.g=null,h||Ye(a,"ready");try{f.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function fn(a){return a.g?a.g.readyState:0}r.ca=function(){try{return fn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),CI(h)}};function df(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function JI(a){const h={};a=(a.g&&fn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(_(a[m]))continue;var f=OI(a[m]);const S=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const k=h[S]||[];h[S]=k,k.push(f)}TI(h,function(m){return m.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function as(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function ff(a){this.za=0,this.i=[],this.j=new Ji,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=as("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=as("baseRetryDelayMs",5e3,a),this.Za=as("retryDelaySeedMs",1e4,a),this.Ta=as("forwardChannelMaxRetries",2,a),this.va=as("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Hd(a&&a.concurrentRequestLimit),this.Ba=new HI,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=ff.prototype,r.ka=8,r.I=1,r.connect=function(a,h,f,m){Je(0),this.W=a,this.H=h||{},f&&m!==void 0&&(this.H.OSID=f,this.H.OAID=m),this.F=this.X,this.J=vf(this,null,this.W),Jo(this)};function fl(a){if(pf(a),a.I==3){var h=a.V++,f=Pt(a.J);if(ue(f,"SID",a.M),ue(f,"RID",h),ue(f,"TYPE","terminate"),cs(a,f),h=new un(a,a.j,h),h.M=2,h.A=Wo(Pt(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=h.A,f=!0),f||(h.g=Tf(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Go(h)}Ef(a)}function Yo(a){a.g&&(gl(a),a.g.cancel(),a.g=null)}function pf(a){Yo(a),a.v&&(o.clearTimeout(a.v),a.v=null),Xo(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Jo(a){if(!Qd(a.h)&&!a.m){a.m=!0;var h=a.Ea;Q||y(),W||(Q(),W=!0),E.add(h,a),a.D=0}}function XI(a,h){return Yd(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Yi(u(a.Ea,a,h),If(a,a.D)),a.D++,!0)}r.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const S=new un(this,this.j,a);let k=this.o;if(this.U&&(k?(k=Ad(k),Rd(k,this.U)):k=this.U),this.u!==null||this.R||(S.J=k,k=null),this.S)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var m=this.i[f];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=mf(this,S,h),f=Pt(this.J),ue(f,"RID",a),ue(f,"CVER",22),this.G&&ue(f,"X-HTTP-Session-Id",this.G),cs(this,f),k&&(this.R?h="headers="+Xi(cf(k))+"&"+h:this.u&&dl(f,this.u,k)),ll(this.h,S),this.Ra&&ue(f,"TYPE","init"),this.S?(ue(f,"$req",h),ue(f,"SID","null"),S.U=!0,sl(S,f,null)):sl(S,f,h),this.I=2}}else this.I==3&&(a?gf(this,a):this.i.length==0||Qd(this.h)||gf(this))};function gf(a,h){var f;h?f=h.l:f=a.V++;const m=Pt(a.J);ue(m,"SID",a.M),ue(m,"RID",f),ue(m,"AID",a.K),cs(a,m),a.u&&a.o&&dl(m,a.u,a.o),f=new un(a,a.j,f,a.D+1),a.u===null&&(f.J=a.o),h&&(a.i=h.G.concat(a.i)),h=mf(a,f,1e3),f.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),ll(a.h,f),sl(f,m,h)}function cs(a,h){a.H&&$o(a.H,function(f,m){ue(h,m,f)}),a.l&&$o({},function(f,m){ue(h,m,f)})}function mf(a,h,f){f=Math.min(a.i.length,f);const m=a.l?u(a.l.Ka,a.l,a):null;e:{var S=a.i;let Y=-1;for(;;){const De=["count="+f];Y==-1?f>0?(Y=S[0].g,De.push("ofs="+Y)):Y=0:De.push("ofs="+Y);let ae=!0;for(let Ve=0;Ve<f;Ve++){var k=S[Ve].g;const Ct=S[Ve].map;if(k-=Y,k<0)Y=Math.max(0,S[Ve].g-100),ae=!1;else try{k="req"+k+"_"||"";try{var L=Ct instanceof Map?Ct:Object.entries(Ct);for(const[er,pn]of L){let gn=pn;c(pn)&&(gn=el(pn)),De.push(k+er+"="+encodeURIComponent(gn))}}catch(er){throw De.push(k+"type="+encodeURIComponent("_badmap")),er}}catch{m&&m(Ct)}}if(ae){L=De.join("&");break e}}L=void 0}return a=a.i.splice(0,f),h.G=a,L}function yf(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;Q||y(),W||(Q(),W=!0),E.add(h,a),a.A=0}}function pl(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Yi(u(a.Da,a),If(a,a.A)),a.A++,!0)}r.Da=function(){if(this.v=null,_f(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Yi(u(this.Wa,this),a)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,Je(10),Yo(this),_f(this))};function gl(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function _f(a){a.g=new un(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=Pt(a.na);ue(h,"RID","rpc"),ue(h,"SID",a.M),ue(h,"AID",a.K),ue(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&ue(h,"TO",a.ia),ue(h,"TYPE","xmlhttp"),cs(a,h),a.u&&a.o&&dl(h,a.u,a.o),a.O&&(a.g.H=a.O);var f=a.g;a=a.ba,f.M=1,f.A=Wo(Pt(h)),f.u=null,f.R=!0,jd(f,a)}r.Va=function(){this.C!=null&&(this.C=null,Yo(this),pl(this),Je(19))};function Xo(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function wf(a,h){var f=null;if(a.g==h){Xo(a),gl(a),a.g=null;var m=2}else if(cl(a.h,h))f=h.G,Jd(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){f=h.u?h.u.length:0,h=Date.now()-h.F;var S=a.D;m=Ko(),Ye(m,new Bd(m,f)),Jo(a)}else yf(a);else if(S=h.m,S==3||S==0&&h.X>0||!(m==1&&XI(a,h)||m==2&&pl(a)))switch(f&&f.length>0&&(h=a.h,h.i=h.i.concat(f)),S){case 1:Zn(a,5);break;case 4:Zn(a,10);break;case 3:Zn(a,6);break;default:Zn(a,2)}}}function If(a,h){let f=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(f*=2),f*h}function Zn(a,h){if(a.j.info("Error code "+h),h==2){var f=u(a.bb,a),m=a.Ua;const S=!m;m=new hn(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||es(m,"https"),Wo(m),S?GI(m.toString(),f):WI(m.toString(),f)}else Je(2);a.I=0,a.l&&a.l.pa(h),Ef(a),pf(a)}r.bb=function(a){a?(this.j.info("Successfully pinged google.com"),Je(2)):(this.j.info("Failed to ping google.com"),Je(1))};function Ef(a){if(a.I=0,a.ja=[],a.l){const h=Xd(a.h);(h.length!=0||a.i.length!=0)&&(P(a.ja,h),P(a.ja,a.i),a.h.i.length=0,I(a.i),a.i.length=0),a.l.oa()}}function vf(a,h,f){var m=f instanceof hn?Pt(f):new hn(f);if(m.g!="")h&&(m.g=h+"."+m.g),ts(m,m.u);else{var S=o.location;m=S.protocol,h=h?h+"."+S.hostname:S.hostname,S=+S.port;const k=new hn(null);m&&es(k,m),h&&(k.g=h),S&&ts(k,S),f&&(k.h=f),m=k}return f=a.G,h=a.wa,f&&h&&ue(m,f,h),ue(m,"VER",a.ka),cs(a,m),m}function Tf(a,h,f){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Ie(new hl({ab:f})):new Ie(a.ma),h.Fa(a.L),h}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function bf(){}r=bf.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function Zo(){}Zo.prototype.g=function(a,h){return new ht(a,h)};function ht(a,h){Ke.call(this),this.g=new ff(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!_(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!_(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Br(this)}p(ht,Ke),ht.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},ht.prototype.close=function(){fl(this.g)},ht.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.v&&(f={},f.__data__=el(a),a=f);h.i.push(new LI(h.Ya++,a)),h.I==3&&Jo(h)},ht.prototype.N=function(){this.g.l=null,delete this.j,fl(this.g),delete this.g,ht.Z.N.call(this)};function Af(a){tl.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Af,tl);function Sf(){nl.call(this),this.status=1}p(Sf,nl);function Br(a){this.g=a}p(Br,bf),Br.prototype.ra=function(){Ye(this.g,"a")},Br.prototype.qa=function(a){Ye(this.g,new Af(a))},Br.prototype.pa=function(a){Ye(this.g,new Sf)},Br.prototype.oa=function(){Ye(this.g,"b")},Zo.prototype.createWebChannel=Zo.prototype.g,ht.prototype.send=ht.prototype.o,ht.prototype.open=ht.prototype.m,ht.prototype.close=ht.prototype.close,dy=function(){return new Zo},hy=function(){return Ko()},uy=Yn,Hl={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},jo.NO_ERROR=0,jo.TIMEOUT=8,jo.HTTP_ERROR=6,fa=jo,$d.COMPLETE="complete",ly=$d,Md.EventType=Hi,Hi.OPEN="a",Hi.CLOSE="b",Hi.ERROR="c",Hi.MESSAGE="d",Ke.prototype.listen=Ke.prototype.J,Ts=Md,Ie.prototype.listenOnce=Ie.prototype.K,Ie.prototype.getLastError=Ie.prototype.Ha,Ie.prototype.getLastErrorCode=Ie.prototype.ya,Ie.prototype.getStatus=Ie.prototype.ca,Ie.prototype.getResponseJson=Ie.prototype.La,Ie.prototype.getResponseText=Ie.prototype.la,Ie.prototype.send=Ie.prototype.ea,Ie.prototype.setWithCredentials=Ie.prototype.Fa,cy=Ie}).apply(typeof na<"u"?na:typeof self<"u"?self:typeof window<"u"?window:{});const lp="@firebase/firestore",up="4.9.3";/**
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
 */class Me{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Me.UNAUTHENTICATED=new Me(null),Me.GOOGLE_CREDENTIALS=new Me("google-credentials-uid"),Me.FIRST_PARTY=new Me("first-party-uid"),Me.MOCK_USER=new Me("mock-user");/**
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
 */const Vn=new nc("@firebase/firestore");function Yr(){return Vn.logLevel}function WS(r){Vn.setLogLevel(r)}function N(r,...e){if(Vn.logLevel<=J.DEBUG){const t=e.map(ah);Vn.debug(`Firestore (${Ui}): ${r}`,...t)}}function Ae(r,...e){if(Vn.logLevel<=J.ERROR){const t=e.map(ah);Vn.error(`Firestore (${Ui}): ${r}`,...t)}}function jt(r,...e){if(Vn.logLevel<=J.WARN){const t=e.map(ah);Vn.warn(`Firestore (${Ui}): ${r}`,...t)}}function ah(r){if(typeof r=="string")return r;try{/**
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
 */function $(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,fy(r,n,t)}function fy(r,e,t){let n=`FIRESTORE (${Ui}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Ae(n),new Error(n)}function q(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||fy(e,i,n)}function HS(r,e){r||$(57014,e)}function U(r,e){return r}/**
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
 */const C={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class x extends nt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class qe{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class py{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class QS{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Me.UNAUTHENTICATED))}shutdown(){}}class YS{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class JS{constructor(e){this.t=e,this.currentUser=Me.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){q(this.o===void 0,42304);let n=this.i;const i=l=>this.i!==n?(n=this.i,t(l)):Promise.resolve();let s=new qe;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new qe,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const l=s;e.enqueueRetryable(async()=>{await l.promise,await i(this.currentUser)})},c=l=>{N("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){const l=this.t.getImmediate({optional:!0});l?c(l):(N("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new qe)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(N("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(q(typeof n.accessToken=="string",31837,{l:n}),new py(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return q(e===null||typeof e=="string",2055,{h:e}),new Me(e)}}class XS{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=Me.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class ZS{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new XS(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Me.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class hp{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class eR{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,ge(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){q(this.o===void 0,3512);const n=s=>{s.error!=null&&N("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,N("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{N("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):N("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new hp(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(q(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new hp(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
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
 */function tR(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
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
 */class ch{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=tR(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function G(r,e){return r<e?-1:r>e?1:0}function Ql(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const i=r.charAt(n),s=e.charAt(n);if(i!==s)return Pl(i)===Pl(s)?G(i,s):Pl(i)?1:-1}return G(r.length,e.length)}const nR=55296,rR=57343;function Pl(r){const e=r.charCodeAt(0);return e>=nR&&e<=rR}function pi(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function gy(r){return r+"\0"}/**
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
 */const dp="__name__";class kt{constructor(e,t,n){t===void 0?t=0:t>e.length&&$(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&$(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return kt.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof kt?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=kt.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return G(e.length,t.length)}static compareSegments(e,t){const n=kt.isNumericId(e),i=kt.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?kt.extractNumericId(e).compare(kt.extractNumericId(t)):Ql(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Rn.fromString(e.substring(4,e.length-2))}}class X extends kt{construct(e,t,n){return new X(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new x(C.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new X(t)}static emptyPath(){return new X([])}}const iR=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class me extends kt{construct(e,t,n){return new me(e,t,n)}static isValidIdentifier(e){return iR.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),me.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===dp}static keyField(){return new me([dp])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new x(C.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new x(C.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const l=e[i+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new x(C.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=l,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new x(C.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new me(t)}static emptyPath(){return new me([])}}/**
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
 */class F{constructor(e){this.path=e}static fromPath(e){return new F(X.fromString(e))}static fromName(e){return new F(X.fromString(e).popFirst(5))}static empty(){return new F(X.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&X.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return X.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new F(new X(e.slice()))}}/**
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
 */function lh(r,e,t){if(!t)throw new x(C.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function my(r,e,t,n){if(e===!0&&n===!0)throw new x(C.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function fp(r){if(!F.isDocumentKey(r))throw new x(C.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function pp(r){if(F.isDocumentKey(r))throw new x(C.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function yy(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function pc(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":$(12329,{type:typeof r})}function ne(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new x(C.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=pc(r);throw new x(C.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function _y(r,e){if(e<=0)throw new x(C.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
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
 */function ke(r,e){const t={typeString:r};return e&&(t.value=e),t}function bo(r,e){if(!yy(r))throw new x(C.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new x(C.INVALID_ARGUMENT,t);return!0}/**
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
 */const gp=-62135596800,mp=1e6;class re{static now(){return re.fromMillis(Date.now())}static fromDate(e){return re.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*mp);return new re(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new x(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new x(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<gp)throw new x(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new x(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/mp}_compareTo(e){return this.seconds===e.seconds?G(this.nanoseconds,e.nanoseconds):G(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:re._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(bo(e,re._jsonSchema))return new re(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-gp;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}re._jsonSchemaVersion="firestore/timestamp/1.0",re._jsonSchema={type:ke("string",re._jsonSchemaVersion),seconds:ke("number"),nanoseconds:ke("number")};/**
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
 */class z{static fromTimestamp(e){return new z(e)}static min(){return new z(new re(0,0))}static max(){return new z(new re(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const gi=-1;class Va{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function Yl(r){return r.fields.find(e=>e.kind===2)}function ir(r){return r.fields.filter(e=>e.kind!==2)}Va.UNKNOWN_ID=-1;class pa{constructor(e,t){this.fieldPath=e,this.kind=t}}class Ys{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Ys(0,mt.min())}}function wy(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=z.fromTimestamp(n===1e9?new re(t+1,0):new re(t,n));return new mt(i,F.empty(),e)}function Iy(r){return new mt(r.readTime,r.key,gi)}class mt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new mt(z.min(),F.empty(),gi)}static max(){return new mt(z.max(),F.empty(),gi)}}function uh(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=F.comparator(r.documentKey,e.documentKey),t!==0?t:G(r.largestBatchId,e.largestBatchId))}/**
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
 */const Ey="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class vy{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Kn(r){if(r.code!==C.FAILED_PRECONDITION||r.message!==Ey)throw r;N("LocalStore","Unexpectedly lost primary lease")}/**
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
 */const dt="SimpleDb";class gc{static open(e,t,n,i){try{return new gc(t,e.transaction(i,n))}catch(s){throw new Vs(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new qe,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new Vs(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=hh(n.target.error);this.S.reject(new Vs(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(N(dt,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new oR(t)}}class Bt{static delete(e){return N(dt,"Removing database:",e),or(xu().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!zs())return!1;if(Bt.F())return!0;const e=_e(),t=Bt.M(e),n=0<t&&t<10,i=Ty(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,Bt.M(_e())===12.2&&Ae("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(N(dt,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new Vs(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new x(C.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new x(C.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new Vs(e,o))},i.onupgradeneeded=s=>{N(dt,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next(()=>{N(dt,"Database upgrade to version "+this.version+" complete")})}})),this.q&&(this.db.onversionchange=t=>this.q(t)),this.db}$(e){this.q=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=gc.open(this.db,e,s?"readonly":"readwrite",n),l=i(c).next(u=>(c.C(),u)).catch(u=>(c.abort(u),A.reject(u))).toPromise();return l.catch(()=>{}),await c.D,l}catch(c){const l=c,u=l.name!=="FirebaseError"&&o<3;if(N(dt,"Transaction failed with error:",l.message,"Retrying:",u),this.close(),!u)return Promise.reject(l)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Ty(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class sR{constructor(e){this.U=e,this.K=!1,this.W=null}get isDone(){return this.K}get G(){return this.W}set cursor(e){this.U=e}done(){this.K=!0}j(e){this.W=e}delete(){return or(this.U.delete())}}class Vs extends x{constructor(e,t){super(C.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function jn(r){return r.name==="IndexedDbTransactionError"}class oR{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(N(dt,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(N(dt,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),or(n)}add(e){return N(dt,"ADD",this.store.name,e,e),or(this.store.add(e))}get(e){return or(this.store.get(e)).next(t=>(t===void 0&&(t=null),N(dt,"GET",this.store.name,e,t),t))}delete(e){return N(dt,"DELETE",this.store.name,e),or(this.store.delete(e))}count(){return N(dt,"COUNT",this.store.name),or(this.store.count())}J(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new A((o,c)=>{s.onerror=l=>{c(l.target.error)},s.onsuccess=l=>{o(l.target.result)}})}{const s=this.cursor(n),o=[];return this.H(s,(c,l)=>{o.push(l)}).next(()=>o)}}Y(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new A((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}})}Z(e,t){N(dt,"DELETE ALL",this.store.name);const n=this.options(e,t);n.X=!1;const i=this.cursor(n);return this.H(i,(s,o,c)=>c.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.H(i,t)}te(e){const t=this.cursor({});return new A((n,i)=>{t.onerror=s=>{const o=hh(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():n()}):n()}})}H(e,t){const n=[];return new A((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const l=new sR(c),u=t(c.primaryKey,c.value,l);if(u instanceof A){const d=u.catch(p=>(l.done(),A.reject(p)));n.push(d)}l.isDone?i():l.G===null?c.continue():c.continue(l.G)}}).next(()=>A.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.X?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function or(r){return new A((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=hh(n.target.error);t(i)}})}let yp=!1;function hh(r){const e=Bt.M(_e());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new x("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return yp||(yp=!0,setTimeout(()=>{throw n},0)),n}}return r}const Os="IndexBackfiller";class aR{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){N(Os,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();N(Os,`Documents written: ${t}`)}catch(t){jn(t)?N(Os,"Ignoring IndexedDB error during index backfill: ",t):await Kn(t)}await this.re(6e4)})}}class cR{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let i=t,s=!0;return A.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return N(Os,`Processing collection: ${o}`),this.oe(e,o,i).next(c=>{i-=c,n.add(o)});s=!1})).next(()=>t-i)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(i,s)).next(c=>(N(Os,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((i,s)=>{const o=Iy(s);uh(o,n)>0&&(n=o)}),new mt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class ct{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}ct.ce=-1;/**
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
 */const Pn=-1;function Ao(r){return r==null}function Js(r){return r===0&&1/r==-1/0}function by(r){return typeof r=="number"&&Number.isInteger(r)&&!Js(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
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
 */const Oa="";function He(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=_p(e)),e=lR(r.get(t),e);return _p(e)}function lR(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case Oa:t+="";break;default:t+=s}}return t}function _p(r){return r+Oa+""}function Lt(r){const e=r.length;if(q(e>=2,64408,{path:r}),e===2)return q(r.charAt(0)===Oa&&r.charAt(1)==="",56145,{path:r}),X.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(Oa,s);switch((o<0||o>t)&&$(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let l;i.length===0?l=c:(i+=c,l=i,i=""),n.push(l);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:$(61167,{path:r})}s=o+2}return new X(n)}/**
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
 */const sr="remoteDocuments",So="owner",qr="owner",Xs="mutationQueues",uR="userId",Et="mutations",wp="batchId",dr="userMutationsIndex",Ip=["userId","batchId"];/**
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
 */function ga(r,e){return[r,He(e)]}function Ay(r,e,t){return[r,He(e),t]}const hR={},mi="documentMutations",Ma="remoteDocumentsV14",dR=["prefixPath","collectionGroup","readTime","documentId"],ma="documentKeyIndex",fR=["prefixPath","collectionGroup","documentId"],Sy="collectionGroupIndex",pR=["collectionGroup","readTime","prefixPath","documentId"],Zs="remoteDocumentGlobal",Jl="remoteDocumentGlobalKey",yi="targets",Ry="queryTargetsIndex",gR=["canonicalId","targetId"],_i="targetDocuments",mR=["targetId","path"],dh="documentTargetsIndex",yR=["path","targetId"],Fa="targetGlobalKey",yr="targetGlobal",eo="collectionParents",_R=["collectionId","parent"],wi="clientMetadata",wR="clientId",mc="bundles",IR="bundleId",yc="namedQueries",ER="name",fh="indexConfiguration",vR="indexId",Xl="collectionGroupIndex",TR="collectionGroup",Ms="indexState",bR=["indexId","uid"],Py="sequenceNumberIndex",AR=["uid","sequenceNumber"],Fs="indexEntries",SR=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Cy="documentKeyIndex",RR=["indexId","uid","orderedDocumentKey"],_c="documentOverlays",PR=["userId","collectionPath","documentId"],Zl="collectionPathOverlayIndex",CR=["userId","collectionPath","largestBatchId"],ky="collectionGroupOverlayIndex",kR=["userId","collectionGroup","largestBatchId"],ph="globals",DR="name",Dy=[Xs,Et,mi,sr,yi,So,yr,_i,wi,Zs,eo,mc,yc],xR=[...Dy,_c],xy=[Xs,Et,mi,Ma,yi,So,yr,_i,wi,Zs,eo,mc,yc,_c],Ny=xy,gh=[...Ny,fh,Ms,Fs],NR=gh,Vy=[...gh,ph],VR=Vy;/**
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
 */class eu extends vy{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function Ne(r,e){const t=U(r);return Bt.O(t.le,e)}/**
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
 */function Ep(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Gn(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function Oy(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
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
 */class le{constructor(e,t){this.comparator=e,this.root=t||Le.EMPTY}insert(e,t){return new le(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Le.BLACK,null,null))}remove(e){return new le(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Le.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new ra(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new ra(this.root,e,this.comparator,!1)}getReverseIterator(){return new ra(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new ra(this.root,e,this.comparator,!0)}}class ra{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Le{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??Le.RED,this.left=i??Le.EMPTY,this.right=s??Le.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new Le(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return Le.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return Le.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Le.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Le.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw $(43730,{key:this.key,value:this.value});if(this.right.isRed())throw $(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw $(27949);return e+(this.isRed()?0:1)}}Le.EMPTY=null,Le.RED=!0,Le.BLACK=!1;Le.EMPTY=new class{constructor(){this.size=0}get key(){throw $(57766)}get value(){throw $(16141)}get color(){throw $(16727)}get left(){throw $(29726)}get right(){throw $(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new Le(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class se{constructor(e){this.comparator=e,this.data=new le(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new vp(this.data.getIterator())}getIteratorFrom(e){return new vp(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof se)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new se(this.comparator);return t.data=e,t}}class vp{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function zr(r){return r.hasNext()?r.getNext():void 0}/**
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
 */class lt{constructor(e){this.fields=e,e.sort(me.comparator)}static empty(){return new lt([])}unionWith(e){let t=new se(me.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new lt(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return pi(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */class My extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
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
 */function OR(){return typeof atob<"u"}/**
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
 */class ve{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new My("Invalid base64 string: "+s):s}}(e);return new ve(t)}static fromUint8Array(e){const t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new ve(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return G(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}ve.EMPTY_BYTE_STRING=new ve("");const MR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Zt(r){if(q(!!r,39018),typeof r=="string"){let e=0;const t=MR.exec(r);if(q(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:fe(r.seconds),nanos:fe(r.nanos)}}function fe(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function en(r){return typeof r=="string"?ve.fromBase64String(r):ve.fromUint8Array(r)}/**
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
 */const Fy="server_timestamp",Ly="__type__",Uy="__previous_value__",By="__local_write_time__";function wc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[Ly])==null?void 0:n.stringValue)===Fy}function Ic(r){const e=r.mapValue.fields[Uy];return wc(e)?Ic(e):e}function to(r){const e=Zt(r.mapValue.fields[By].timestampValue);return new re(e.seconds,e.nanos)}/**
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
 */class FR{constructor(e,t,n,i,s,o,c,l,u,d){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=u,this.isUsingEmulator=d}}const tu="(default)";class On{constructor(e,t){this.projectId=e,this.database=t||tu}static empty(){return new On("","")}get isDefaultDatabase(){return this.database===tu}isEqual(e){return e instanceof On&&e.projectId===this.projectId&&e.database===this.database}}/**
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
 */const mh="__type__",$y="__max__",Tn={mapValue:{fields:{__type__:{stringValue:$y}}}},yh="__vector__",Ii="value",ya={nullValue:"NULL_VALUE"};function Mn(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?wc(r)?4:qy(r)?9007199254740991:Ec(r)?10:11:$(28295,{value:r})}function Gt(r,e){if(r===e)return!0;const t=Mn(r);if(t!==Mn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return to(r).isEqual(to(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Zt(i.timestampValue),c=Zt(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return en(i.bytesValue).isEqual(en(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return fe(i.geoPointValue.latitude)===fe(s.geoPointValue.latitude)&&fe(i.geoPointValue.longitude)===fe(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return fe(i.integerValue)===fe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=fe(i.doubleValue),c=fe(s.doubleValue);return o===c?Js(o)===Js(c):isNaN(o)&&isNaN(c)}return!1}(r,e);case 9:return pi(r.arrayValue.values||[],e.arrayValue.values||[],Gt);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(Ep(o)!==Ep(c))return!1;for(const l in o)if(o.hasOwnProperty(l)&&(c[l]===void 0||!Gt(o[l],c[l])))return!1;return!0}(r,e);default:return $(52216,{left:r})}}function no(r,e){return(r.values||[]).find(t=>Gt(t,e))!==void 0}function Fn(r,e){if(r===e)return 0;const t=Mn(r),n=Mn(e);if(t!==n)return G(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return G(r.booleanValue,e.booleanValue);case 2:return function(s,o){const c=fe(s.integerValue||s.doubleValue),l=fe(o.integerValue||o.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1}(r,e);case 3:return Tp(r.timestampValue,e.timestampValue);case 4:return Tp(to(r),to(e));case 5:return Ql(r.stringValue,e.stringValue);case 6:return function(s,o){const c=en(s),l=en(o);return c.compareTo(l)}(r.bytesValue,e.bytesValue);case 7:return function(s,o){const c=s.split("/"),l=o.split("/");for(let u=0;u<c.length&&u<l.length;u++){const d=G(c[u],l[u]);if(d!==0)return d}return G(c.length,l.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,o){const c=G(fe(s.latitude),fe(o.latitude));return c!==0?c:G(fe(s.longitude),fe(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return bp(r.arrayValue,e.arrayValue);case 10:return function(s,o){var g,I,P,D;const c=s.fields||{},l=o.fields||{},u=(g=c[Ii])==null?void 0:g.arrayValue,d=(I=l[Ii])==null?void 0:I.arrayValue,p=G(((P=u==null?void 0:u.values)==null?void 0:P.length)||0,((D=d==null?void 0:d.values)==null?void 0:D.length)||0);return p!==0?p:bp(u,d)}(r.mapValue,e.mapValue);case 11:return function(s,o){if(s===Tn.mapValue&&o===Tn.mapValue)return 0;if(s===Tn.mapValue)return 1;if(o===Tn.mapValue)return-1;const c=s.fields||{},l=Object.keys(c),u=o.fields||{},d=Object.keys(u);l.sort(),d.sort();for(let p=0;p<l.length&&p<d.length;++p){const g=Ql(l[p],d[p]);if(g!==0)return g;const I=Fn(c[l[p]],u[d[p]]);if(I!==0)return I}return G(l.length,d.length)}(r.mapValue,e.mapValue);default:throw $(23264,{he:t})}}function Tp(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return G(r,e);const t=Zt(r),n=Zt(e),i=G(t.seconds,n.seconds);return i!==0?i:G(t.nanos,n.nanos)}function bp(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=Fn(t[i],n[i]);if(s)return s}return G(t.length,n.length)}function Ei(r){return nu(r)}function nu(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=Zt(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return en(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return F.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=nu(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${nu(t.fields[o])}`;return i+"}"}(r.mapValue):$(61005,{value:r})}function _a(r){switch(Mn(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=Ic(r);return e?16+_a(e):16;case 5:return 2*r.stringValue.length;case 6:return en(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((i,s)=>i+_a(s),0)}(r.arrayValue);case 10:case 11:return function(n){let i=0;return Gn(n.fields,(s,o)=>{i+=s.length+_a(o)}),i}(r.mapValue);default:throw $(13486,{value:r})}}function vr(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function ru(r){return!!r&&"integerValue"in r}function ro(r){return!!r&&"arrayValue"in r}function Ap(r){return!!r&&"nullValue"in r}function Sp(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function wa(r){return!!r&&"mapValue"in r}function Ec(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[mh])==null?void 0:n.stringValue)===yh}function Ls(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return Gn(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=Ls(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Ls(r.arrayValue.values[t]);return e}return{...r}}function qy(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===$y}const zy={mapValue:{fields:{[mh]:{stringValue:yh},[Ii]:{arrayValue:{}}}}};function LR(r){return"nullValue"in r?ya:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?vr(On.empty(),F.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?Ec(r)?zy:{mapValue:{}}:$(35942,{value:r})}function UR(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?vr(On.empty(),F.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?zy:"mapValue"in r?Ec(r)?{mapValue:{}}:Tn:$(61959,{value:r})}function Rp(r,e){const t=Fn(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function Pp(r,e){const t=Fn(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
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
 */class Be{constructor(e){this.value=e}static empty(){return new Be({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!wa(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Ls(t)}setAll(e){let t=me.emptyPath(),n={},i=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const l=this.getFieldsMap(t);this.applyChanges(l,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=Ls(o):i.push(c.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());wa(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Gt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];wa(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){Gn(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new Be(Ls(this.value))}}function Ky(r){const e=[];return Gn(r.fields,(t,n)=>{const i=new me([t]);if(wa(n)){const s=Ky(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new lt(e)}/**
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
 */class he{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new he(e,0,z.min(),z.min(),z.min(),Be.empty(),0)}static newFoundDocument(e,t,n,i){return new he(e,1,t,z.min(),n,i,0)}static newNoDocument(e,t){return new he(e,2,t,z.min(),z.min(),Be.empty(),0)}static newUnknownDocument(e,t){return new he(e,3,t,z.min(),z.min(),Be.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(z.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Be.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Be.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=z.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof he&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new he(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Ln{constructor(e,t){this.position=e,this.inclusive=t}}function Cp(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=F.comparator(F.fromName(o.referenceValue),t.key):n=Fn(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function kp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!Gt(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class io{constructor(e,t="asc"){this.field=e,this.dir=t}}function BR(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class jy{}class ee extends jy{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new $R(e,t,n):t==="array-contains"?new KR(e,n):t==="in"?new Jy(e,n):t==="not-in"?new jR(e,n):t==="array-contains-any"?new GR(e,n):new ee(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new qR(e,n):new zR(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Fn(t,this.value)):t!==null&&Mn(this.value)===Mn(t)&&this.matchesComparison(Fn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return $(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class ie extends jy{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new ie(e,t)}matches(e){return vi(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function vi(r){return r.op==="and"}function iu(r){return r.op==="or"}function _h(r){return Gy(r)&&vi(r)}function Gy(r){for(const e of r.filters)if(e instanceof ie)return!1;return!0}function su(r){if(r instanceof ee)return r.field.canonicalString()+r.op.toString()+Ei(r.value);if(_h(r))return r.filters.map(e=>su(e)).join(",");{const e=r.filters.map(t=>su(t)).join(",");return`${r.op}(${e})`}}function Wy(r,e){return r instanceof ee?function(n,i){return i instanceof ee&&n.op===i.op&&n.field.isEqual(i.field)&&Gt(n.value,i.value)}(r,e):r instanceof ie?function(n,i){return i instanceof ie&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,o,c)=>s&&Wy(o,i.filters[c]),!0):!1}(r,e):void $(19439)}function Hy(r,e){const t=r.filters.concat(e);return ie.create(t,r.op)}function Qy(r){return r instanceof ee?function(t){return`${t.field.canonicalString()} ${t.op} ${Ei(t.value)}`}(r):r instanceof ie?function(t){return t.op.toString()+" {"+t.getFilters().map(Qy).join(" ,")+"}"}(r):"Filter"}class $R extends ee{constructor(e,t,n){super(e,t,n),this.key=F.fromName(n.referenceValue)}matches(e){const t=F.comparator(e.key,this.key);return this.matchesComparison(t)}}class qR extends ee{constructor(e,t){super(e,"in",t),this.keys=Yy("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class zR extends ee{constructor(e,t){super(e,"not-in",t),this.keys=Yy("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Yy(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>F.fromName(n.referenceValue))}class KR extends ee{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return ro(t)&&no(t.arrayValue,this.value)}}class Jy extends ee{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&no(this.value.arrayValue,t)}}class jR extends ee{constructor(e,t){super(e,"not-in",t)}matches(e){if(no(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!no(this.value.arrayValue,t)}}class GR extends ee{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!ro(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>no(this.value.arrayValue,n))}}/**
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
 */class WR{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function ou(r,e=null,t=[],n=[],i=null,s=null,o=null){return new WR(r,e,t,n,i,s,o)}function Tr(r){const e=U(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>su(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),Ao(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>Ei(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>Ei(n)).join(",")),e.Te=t}return e.Te}function Ro(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!BR(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Wy(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!kp(r.startAt,e.startAt)&&kp(r.endAt,e.endAt)}function La(r){return F.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Ua(r,e){return r.filters.filter(t=>t instanceof ee&&t.field.isEqual(e))}function Dp(r,e,t){let n=ya,i=!0;for(const s of Ua(r,e)){let o=ya,c=!0;switch(s.op){case"<":case"<=":o=LR(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=ya}Rp({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Rp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function xp(r,e,t){let n=Tn,i=!0;for(const s of Ua(r,e)){let o=Tn,c=!0;switch(s.op){case">=":case">":o=UR(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=Tn}Pp({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];Pp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
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
 */class sn{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function Xy(r,e,t,n,i,s,o,c){return new sn(r,e,t,n,i,s,o,c)}function Bi(r){return new sn(r)}function Np(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function wh(r){return r.collectionGroup!==null}function ci(r){const e=U(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new se(me.comparator);return o.filters.forEach(l=>{l.getFlattenedFilters().forEach(u=>{u.isInequality()&&(c=c.add(u.field))})}),c})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new io(s,n))}),t.has(me.keyField().canonicalString())||e.Ie.push(new io(me.keyField(),n))}return e.Ie}function rt(r){const e=U(r);return e.Ee||(e.Ee=HR(e,ci(r))),e.Ee}function HR(r,e){if(r.limitType==="F")return ou(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new io(i.field,s)});const t=r.endAt?new Ln(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Ln(r.startAt.position,r.startAt.inclusive):null;return ou(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function au(r,e){const t=r.filters.concat([e]);return new sn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function Ba(r,e,t){return new sn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function Po(r,e){return Ro(rt(r),rt(e))&&r.limitType===e.limitType}function Zy(r){return`${Tr(rt(r))}|lt:${r.limitType}`}function Jr(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>Qy(i)).join(", ")}]`),Ao(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>Ei(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>Ei(i)).join(",")),`Target(${n})`}(rt(r))}; limitType=${r.limitType})`}function Co(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):F.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of ci(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(o,c,l){const u=Cp(o,c,l);return o.inclusive?u<=0:u<0}(n.startAt,ci(n),i)||n.endAt&&!function(o,c,l){const u=Cp(o,c,l);return o.inclusive?u>=0:u>0}(n.endAt,ci(n),i))}(r,e)}function e_(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function t_(r){return(e,t)=>{let n=!1;for(const i of ci(r)){const s=QR(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function QR(r,e,t){const n=r.field.isKeyField()?F.comparator(e.key,t.key):function(s,o,c){const l=o.data.field(s),u=c.data.field(s);return l!==null&&u!==null?Fn(l,u):$(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return $(19790,{direction:r.dir})}}/**
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
 */class on{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Gn(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return Oy(this.inner)}size(){return this.innerSize}}/**
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
 */const YR=new le(F.comparator);function ut(){return YR}const n_=new le(F.comparator);function bs(...r){let e=n_;for(const t of r)e=e.insert(t.key,t);return e}function r_(r){let e=n_;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function Ut(){return Us()}function i_(){return Us()}function Us(){return new on(r=>r.toString(),(r,e)=>r.isEqual(e))}const JR=new le(F.comparator),XR=new se(F.comparator);function H(...r){let e=XR;for(const t of r)e=e.add(t);return e}const ZR=new se(G);function Ih(){return ZR}/**
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
 */function Eh(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:Js(e)?"-0":e}}function s_(r){return{integerValue:""+r}}function o_(r,e){return by(e)?s_(e):Eh(r,e)}/**
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
 */class vc{constructor(){this._=void 0}}function eP(r,e,t){return r instanceof Ti?function(i,s){const o={fields:{[Ly]:{stringValue:Fy},[By]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&wc(s)&&(s=Ic(s)),s&&(o.fields[Uy]=s),{mapValue:o}}(t,e):r instanceof br?c_(r,e):r instanceof Ar?l_(r,e):function(i,s){const o=a_(i,s),c=Vp(o)+Vp(i.Ae);return ru(o)&&ru(i.Ae)?s_(c):Eh(i.serializer,c)}(r,e)}function tP(r,e,t){return r instanceof br?c_(r,e):r instanceof Ar?l_(r,e):t}function a_(r,e){return r instanceof bi?function(n){return ru(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class Ti extends vc{}class br extends vc{constructor(e){super(),this.elements=e}}function c_(r,e){const t=u_(e);for(const n of r.elements)t.some(i=>Gt(i,n))||t.push(n);return{arrayValue:{values:t}}}class Ar extends vc{constructor(e){super(),this.elements=e}}function l_(r,e){let t=u_(e);for(const n of r.elements)t=t.filter(i=>!Gt(i,n));return{arrayValue:{values:t}}}class bi extends vc{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function Vp(r){return fe(r.integerValue||r.doubleValue)}function u_(r){return ro(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
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
 */class ko{constructor(e,t){this.field=e,this.transform=t}}function nP(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof br&&i instanceof br||n instanceof Ar&&i instanceof Ar?pi(n.elements,i.elements,Gt):n instanceof bi&&i instanceof bi?Gt(n.Ae,i.Ae):n instanceof Ti&&i instanceof Ti}(r.transform,e.transform)}class rP{constructor(e,t){this.version=e,this.transformResults=t}}class ye{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ye}static exists(e){return new ye(void 0,e)}static updateTime(e){return new ye(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ia(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class Tc{}function h_(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new qi(r.key,ye.none()):new $i(r.key,r.data,ye.none());{const t=r.data,n=Be.empty();let i=new se(me.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new an(r.key,n,new lt(i.toArray()),ye.none())}}function iP(r,e,t){r instanceof $i?function(i,s,o){const c=i.value.clone(),l=Mp(i.fieldTransforms,s,o.transformResults);c.setAll(l),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):r instanceof an?function(i,s,o){if(!Ia(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=Mp(i.fieldTransforms,s,o.transformResults),l=s.data;l.setAll(d_(i)),l.setAll(c),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(r,e,t):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function Bs(r,e,t,n){return r instanceof $i?function(s,o,c,l){if(!Ia(s.precondition,o))return c;const u=s.value.clone(),d=Fp(s.fieldTransforms,l,o);return u.setAll(d),o.convertToFoundDocument(o.version,u).setHasLocalMutations(),null}(r,e,t,n):r instanceof an?function(s,o,c,l){if(!Ia(s.precondition,o))return c;const u=Fp(s.fieldTransforms,l,o),d=o.data;return d.setAll(d_(s)),d.setAll(u),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(r,e,t,n):function(s,o,c){return Ia(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(r,e,t)}function sP(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=a_(n.transform,i||null);s!=null&&(t===null&&(t=Be.empty()),t.set(n.field,s))}return t||null}function Op(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&pi(n,i,(s,o)=>nP(s,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class $i extends Tc{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class an extends Tc{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function d_(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function Mp(r,e,t){const n=new Map;q(r.length===t.length,32656,{Re:t.length,Ve:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,tP(o,c,t[i]))}return n}function Fp(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,eP(s,o,e))}return n}class qi extends Tc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class vh extends Tc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Th{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&iP(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=Bs(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=Bs(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=i_();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const l=h_(o,c);l!==null&&n.set(i.key,l),o.isValidDocument()||o.convertToNoDocument(z.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),H())}isEqual(e){return this.batchId===e.batchId&&pi(this.mutations,e.mutations,(t,n)=>Op(t,n))&&pi(this.baseMutations,e.baseMutations,(t,n)=>Op(t,n))}}class bh{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){q(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let i=function(){return JR}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new bh(e,t,n,i)}}/**
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
 */class Ah{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class oP{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var Pe,te;function f_(r){switch(r){case C.OK:return $(64938);case C.CANCELLED:case C.UNKNOWN:case C.DEADLINE_EXCEEDED:case C.RESOURCE_EXHAUSTED:case C.INTERNAL:case C.UNAVAILABLE:case C.UNAUTHENTICATED:return!1;case C.INVALID_ARGUMENT:case C.NOT_FOUND:case C.ALREADY_EXISTS:case C.PERMISSION_DENIED:case C.FAILED_PRECONDITION:case C.ABORTED:case C.OUT_OF_RANGE:case C.UNIMPLEMENTED:case C.DATA_LOSS:return!0;default:return $(15467,{code:r})}}function p_(r){if(r===void 0)return Ae("GRPC error has no .code"),C.UNKNOWN;switch(r){case Pe.OK:return C.OK;case Pe.CANCELLED:return C.CANCELLED;case Pe.UNKNOWN:return C.UNKNOWN;case Pe.DEADLINE_EXCEEDED:return C.DEADLINE_EXCEEDED;case Pe.RESOURCE_EXHAUSTED:return C.RESOURCE_EXHAUSTED;case Pe.INTERNAL:return C.INTERNAL;case Pe.UNAVAILABLE:return C.UNAVAILABLE;case Pe.UNAUTHENTICATED:return C.UNAUTHENTICATED;case Pe.INVALID_ARGUMENT:return C.INVALID_ARGUMENT;case Pe.NOT_FOUND:return C.NOT_FOUND;case Pe.ALREADY_EXISTS:return C.ALREADY_EXISTS;case Pe.PERMISSION_DENIED:return C.PERMISSION_DENIED;case Pe.FAILED_PRECONDITION:return C.FAILED_PRECONDITION;case Pe.ABORTED:return C.ABORTED;case Pe.OUT_OF_RANGE:return C.OUT_OF_RANGE;case Pe.UNIMPLEMENTED:return C.UNIMPLEMENTED;case Pe.DATA_LOSS:return C.DATA_LOSS;default:return $(39323,{code:r})}}(te=Pe||(Pe={}))[te.OK=0]="OK",te[te.CANCELLED=1]="CANCELLED",te[te.UNKNOWN=2]="UNKNOWN",te[te.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",te[te.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",te[te.NOT_FOUND=5]="NOT_FOUND",te[te.ALREADY_EXISTS=6]="ALREADY_EXISTS",te[te.PERMISSION_DENIED=7]="PERMISSION_DENIED",te[te.UNAUTHENTICATED=16]="UNAUTHENTICATED",te[te.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",te[te.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",te[te.ABORTED=10]="ABORTED",te[te.OUT_OF_RANGE=11]="OUT_OF_RANGE",te[te.UNIMPLEMENTED=12]="UNIMPLEMENTED",te[te.INTERNAL=13]="INTERNAL",te[te.UNAVAILABLE=14]="UNAVAILABLE",te[te.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function g_(){return new TextEncoder}/**
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
 */const aP=new Rn([4294967295,4294967295],0);function Lp(r){const e=g_().encode(r),t=new ay;return t.update(e),new Uint8Array(t.digest())}function Up(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new Rn([t,n],0),new Rn([i,s],0)]}class Sh{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new As(`Invalid padding: ${t}`);if(n<0)throw new As(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new As(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new As(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=Rn.fromNumber(this.ge)}ye(e,t,n){let i=e.add(t.multiply(Rn.fromNumber(n)));return i.compare(aP)===1&&(i=new Rn([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Lp(e),[n,i]=Up(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);if(!this.we(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new Sh(s,i,t);return n.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Lp(e),[n,i]=Up(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);this.Se(o)}}Se(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class As extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class Do{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,xo.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new Do(z.min(),i,new le(G),ut(),H())}}class xo{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new xo(n,t,H(),H(),H())}}/**
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
 */class Ea{constructor(e,t,n,i){this.be=e,this.removedTargetIds=t,this.key=n,this.De=i}}class m_{constructor(e,t){this.targetId=e,this.Ce=t}}class y_{constructor(e,t,n=ve.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class Bp{constructor(){this.ve=0,this.Fe=$p(),this.Me=ve.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=H(),t=H(),n=H();return this.Fe.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:$(38017,{changeType:s})}}),new xo(this.Me,this.xe,e,t,n)}qe(){this.Oe=!1,this.Fe=$p()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,q(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class cP{constructor(e){this.Ge=e,this.ze=new Map,this.je=ut(),this.Je=ia(),this.He=ia(),this.Ye=new le(G)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(e.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.We(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:$(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,i)=>{this.rt(i)&&t(i)})}st(e){const t=e.targetId,n=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(La(s))if(n===0){const o=new F(s.path);this.et(t,o,he.newNoDocument(o,z.min()))}else q(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const c=this.ut(e),l=c?this.ct(c,e,o):1;if(l!==0){this.it(t);const u=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,u)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=en(n).toUint8Array()}catch(l){if(l instanceof My)return jt("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l}try{c=new Sh(o,i,s)}catch(l){return jt(l instanceof As?"BloomFilter error: ":"Applying bloom filter failed: ",l),null}return c.ge===0?null:c}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)}),i}Tt(e){const t=new Map;this.ze.forEach((s,o)=>{const c=this.ot(o);if(c){if(s.current&&La(c.target)){const l=new F(c.target.path);this.It(l).has(o)||this.Et(o,l)||this.et(o,l,he.newNoDocument(l,e))}s.Be&&(t.set(o,s.ke()),s.qe())}});let n=H();this.He.forEach((s,o)=>{let c=!0;o.forEachWhile(l=>{const u=this.ot(l);return!u||u.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(n=n.add(s))}),this.je.forEach((s,o)=>o.setReadTime(e));const i=new Do(e,t,this.Ye,this.je,n);return this.je=ut(),this.Je=ia(),this.He=ia(),this.Ye=new le(G),i}Xe(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,n),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.Qe(t,1):i.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new Bp,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new se(G),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new se(G),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||N("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new Bp),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function ia(){return new le(F.comparator)}function $p(){return new le(F.comparator)}const lP={asc:"ASCENDING",desc:"DESCENDING"},uP={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},hP={and:"AND",or:"OR"};class dP{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function cu(r,e){return r.useProto3Json||Ao(e)?e:{value:e}}function Ai(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function __(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function fP(r,e){return Ai(r,e.toTimestamp())}function Se(r){return q(!!r,49232),z.fromTimestamp(function(t){const n=Zt(t);return new re(n.seconds,n.nanos)}(r))}function Rh(r,e){return lu(r,e).canonicalString()}function lu(r,e){const t=function(i){return new X(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function w_(r){const e=X.fromString(r);return q(C_(e),10190,{key:e.toString()}),e}function so(r,e){return Rh(r.databaseId,e.path)}function $t(r,e){const t=w_(e);if(t.get(1)!==r.databaseId.projectId)throw new x(C.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new x(C.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new F(v_(t))}function I_(r,e){return Rh(r.databaseId,e)}function E_(r){const e=w_(r);return e.length===4?X.emptyPath():v_(e)}function uu(r){return new X(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function v_(r){return q(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function qp(r,e,t){return{name:so(r,e),fields:t.value.mapValue.fields}}function T_(r,e,t){const n=$t(r,e.name),i=Se(e.updateTime),s=e.createTime?Se(e.createTime):z.min(),o=new Be({mapValue:{fields:e.fields}}),c=he.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function pP(r,e){return"found"in e?function(n,i){q(!!i.found,43571),i.found.name,i.found.updateTime;const s=$t(n,i.found.name),o=Se(i.found.updateTime),c=i.found.createTime?Se(i.found.createTime):z.min(),l=new Be({mapValue:{fields:i.found.fields}});return he.newFoundDocument(s,o,c,l)}(r,e):"missing"in e?function(n,i){q(!!i.missing,3894),q(!!i.readTime,22933);const s=$t(n,i.missing),o=Se(i.readTime);return he.newNoDocument(s,o)}(r,e):$(7234,{result:e})}function gP(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(u){return u==="NO_CHANGE"?0:u==="ADD"?1:u==="REMOVE"?2:u==="CURRENT"?3:u==="RESET"?4:$(39313,{state:u})}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(u,d){return u.useProto3Json?(q(d===void 0||typeof d=="string",58123),ve.fromBase64String(d||"")):(q(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),ve.fromUint8Array(d||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(u){const d=u.code===void 0?C.UNKNOWN:p_(u.code);return new x(d,u.message||"")}(o);t=new y_(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=$t(r,n.document.name),s=Se(n.document.updateTime),o=n.document.createTime?Se(n.document.createTime):z.min(),c=new Be({mapValue:{fields:n.document.fields}}),l=he.newFoundDocument(i,s,o,c),u=n.targetIds||[],d=n.removedTargetIds||[];t=new Ea(u,d,l.key,l)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=$t(r,n.document),s=n.readTime?Se(n.readTime):z.min(),o=he.newNoDocument(i,s),c=n.removedTargetIds||[];t=new Ea([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=$t(r,n.document),s=n.removedTargetIds||[];t=new Ea([],s,i,null)}else{if(!("filter"in e))return $(11601,{Rt:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new oP(i,s),c=n.targetId;t=new m_(c,o)}}return t}function oo(r,e){let t;if(e instanceof $i)t={update:qp(r,e.key,e.value)};else if(e instanceof qi)t={delete:so(r,e.key)};else if(e instanceof an)t={update:qp(r,e.key,e.data),updateMask:EP(e.fieldMask)};else{if(!(e instanceof vh))return $(16599,{Vt:e.type});t={verify:so(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,o){const c=o.transform;if(c instanceof Ti)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof br)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof Ar)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof bi)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw $(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:fP(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:$(27497)}(r,e.precondition)),t}function hu(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?ye.updateTime(Se(s.updateTime)):s.exists!==void 0?ye.exists(s.exists):ye.none()}(e.currentDocument):ye.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(o,c){let l=null;if("setToServerValue"in c)q(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),l=new Ti;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];l=new br(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];l=new Ar(d)}else"increment"in c?l=new bi(o,c.increment):$(16584,{proto:c});const u=me.fromServerFormat(c.fieldPath);return new ko(u,l)}(r,i)):[];if(e.update){e.update.name;const i=$t(r,e.update.name),s=new Be({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(l){const u=l.fieldPaths||[];return new lt(u.map(d=>me.fromServerFormat(d)))}(e.updateMask);return new an(i,s,o,t,n)}return new $i(i,s,t,n)}if(e.delete){const i=$t(r,e.delete);return new qi(i,t)}if(e.verify){const i=$t(r,e.verify);return new vh(i,t)}return $(1463,{proto:e})}function mP(r,e){return r&&r.length>0?(q(e!==void 0,14353),r.map(t=>function(i,s){let o=i.updateTime?Se(i.updateTime):Se(s);return o.isEqual(z.min())&&(o=Se(s)),new rP(o,i.transformResults||[])}(t,e))):[]}function b_(r,e){return{documents:[I_(r,e.path)]}}function A_(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=I_(r,i);const s=function(u){if(u.length!==0)return P_(ie.create(u,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const o=function(u){if(u.length!==0)return u.map(d=>function(g){return{field:Xr(g.field),direction:_P(g.dir)}}(d))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=cu(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(u){return{before:u.inclusive,values:u.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(u){return{before:!u.inclusive,values:u.position}}(e.endAt)),{ft:t,parent:i}}function S_(r){let e=E_(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){q(n===1,65062);const d=t.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];t.where&&(s=function(p){const g=R_(p);return g instanceof ie&&_h(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(g=>function(P){return new io(Zr(P.field),function(T){switch(T){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(P.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,Ao(g)?null:g}(t.limit));let l=null;t.startAt&&(l=function(p){const g=!!p.before,I=p.values||[];return new Ln(I,g)}(t.startAt));let u=null;return t.endAt&&(u=function(p){const g=!p.before,I=p.values||[];return new Ln(I,g)}(t.endAt)),Xy(e,i,o,s,c,"F",l,u)}function yP(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return $(28987,{purpose:i})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function R_(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Zr(t.unaryFilter.field);return ee.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Zr(t.unaryFilter.field);return ee.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Zr(t.unaryFilter.field);return ee.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Zr(t.unaryFilter.field);return ee.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return $(61313);default:return $(60726)}}(r):r.fieldFilter!==void 0?function(t){return ee.create(Zr(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return $(58110);default:return $(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return ie.create(t.compositeFilter.filters.map(n=>R_(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return $(1026)}}(t.compositeFilter.op))}(r):$(30097,{filter:r})}function _P(r){return lP[r]}function wP(r){return uP[r]}function IP(r){return hP[r]}function Xr(r){return{fieldPath:r.canonicalString()}}function Zr(r){return me.fromServerFormat(r.fieldPath)}function P_(r){return r instanceof ee?function(t){if(t.op==="=="){if(Sp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NAN"}};if(Ap(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Sp(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NOT_NAN"}};if(Ap(t.value))return{unaryFilter:{field:Xr(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Xr(t.field),op:wP(t.op),value:t.value}}}(r):r instanceof ie?function(t){const n=t.getFilters().map(i=>P_(i));return n.length===1?n[0]:{compositeFilter:{op:IP(t.op),filters:n}}}(r):$(54877,{filter:r})}function EP(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function C_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
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
 */class Ht{constructor(e,t,n,i,s=z.min(),o=z.min(),c=ve.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=l}withSequenceNumber(e){return new Ht(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Ht(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Ht(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Ht(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class k_{constructor(e){this.yt=e}}function vP(r,e){let t;if(e.document)t=T_(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=F.fromSegments(e.noDocument.path),i=Rr(e.noDocument.readTime);t=he.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return $(56709);{const n=F.fromSegments(e.unknownDocument.path),i=Rr(e.unknownDocument.version);t=he.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new re(i[0],i[1]);return z.fromTimestamp(s)}(e.readTime)),t}function zp(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:$a(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,o){return{name:so(s,o.key),fields:o.data.value.mapValue.fields,updateTime:Ai(s,o.version.toTimestamp()),createTime:Ai(s,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:Sr(e.version)};else{if(!e.isUnknownDocument())return $(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:Sr(e.version)}}return n}function $a(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function Sr(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Rr(r){const e=new re(r.seconds,r.nanoseconds);return z.fromTimestamp(e)}function ar(r,e){const t=(e.baseMutations||[]).map(s=>hu(r.yt,s));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>hu(r.yt,s)),i=re.fromMillis(e.localWriteTimeMs);return new Th(e.batchId,i,t,n)}function Ss(r){const e=Rr(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?Rr(r.lastLimboFreeSnapshotVersion):z.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){const o=s.documents.length;return q(o===1,1966,{count:o}),rt(Bi(E_(s.documents[0])))}(r.query):function(s){return rt(S_(s))}(r.query),new Ht(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,ve.fromBase64String(r.resumeToken))}function D_(r,e){const t=Sr(e.snapshotVersion),n=Sr(e.lastLimboFreeSnapshotVersion);let i;i=La(e.target)?b_(r.yt,e.target):A_(r.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:Tr(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function Ph(r){const e=S_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?Ba(e,e.limit,"L"):e}function Cl(r,e){return new Ah(e.largestBatchId,hu(r.yt,e.overlayMutation))}function Kp(r,e){const t=e.path.lastSegment();return[r,He(e.path.popLast()),t]}function jp(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:Sr(n.readTime),documentKey:He(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
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
 */class TP{getBundleMetadata(e,t){return Gp(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:Rr(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return Gp(e).put(function(i){return{bundleId:i.id,createTime:Sr(Se(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return Wp(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:Ph(s.bundledQuery),readTime:Rr(s.readTime)}}(n)})}saveNamedQuery(e,t){return Wp(e).put(function(i){return{name:i.name,readTime:Sr(Se(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function Gp(r){return Ne(r,mc)}function Wp(r){return Ne(r,yc)}/**
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
 */class bc{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new bc(e,n)}getOverlay(e,t){return ps(e).get(Kp(this.userId,t)).next(n=>n?Cl(this.serializer,n):null)}getOverlays(e,t){const n=Ut();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,o)=>{const c=new Ah(t,o);i.push(this.St(e,c))}),A.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(o=>i.add(He(o.getCollectionPath())));const s=[];return i.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(ps(e).Z(Zl,c))}),A.waitFor(s)}getOverlaysForCollection(e,t,n){const i=Ut(),s=He(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return ps(e).J(Zl,o).next(c=>{for(const l of c){const u=Cl(this.serializer,l);i.set(u.getKey(),u)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=Ut();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return ps(e).ee({index:ky,range:c},(l,u,d)=>{const p=Cl(this.serializer,u);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):d.done()}).next(()=>s)}St(e,t){return ps(e).put(function(i,s,o){const[c,l,u]=Kp(s,o.mutation.key);return{userId:s,collectionPath:l,documentId:u,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:oo(i.yt,o.mutation)}}(this.serializer,this.userId,t))}}function ps(r){return Ne(r,_c)}/**
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
 */class bP{bt(e){return Ne(e,ph)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?ve.fromUint8Array(n):ve.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class cr{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(fe(e.integerValue));else if("doubleValue"in e){const n=fe(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),Js(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=Zt(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(en(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?qy(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):Ec(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):$(19022,{$t:e})}Ot(e,t){this.Ft(t,25),this.Ut(e,t)}Ut(e,t){t.xt(e)}qt(e,t){const n=e.fields||{};this.Ft(t,55);for(const i of Object.keys(n))this.Ot(i,t),this.Ct(n[i],t)}kt(e,t){var o,c;const n=e.fields||{};this.Ft(t,53);const i=Ii,s=((c=(o=n[i].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(fe(s)),this.Ot(i,t),this.Ct(n[i],t)}Qt(e,t){const n=e.values||[];this.Ft(t,50);for(const i of n)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),F.fromName(e).path.forEach(n=>{this.Ft(t,60),this.Ut(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}cr.Kt=new cr;/**
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
 */const Kr=255;function AP(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Hp(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const o=AP(255&n[s]);if(i+=o,o!==8)break}return i}(r);return Math.ceil(e/8)}class SP{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Wt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Jt(n.value),n=t.next();this.Ht()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Jt(n);else if(n<2048)this.Jt(960|n>>>6),this.Jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|n>>>12),this.Jt(128|63&n>>>6),this.Jt(128|63&n);else{const i=t.codePointAt(0);this.Jt(240|i>>>18),this.Jt(128|63&i>>>12),this.Jt(128|63&i>>>6),this.Jt(128|63&i)}}this.Ht()}Xt(e){const t=this.en(e),n=Hp(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),n=Hp(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(Kr),this.sn(255)}_n(){this.an(Kr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===Kr?(this.sn(Kr),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===Kr?(this.an(Kr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class RP{constructor(e){this.cn=e}Bt(e){this.cn.Wt(e)}xt(e){this.cn.Yt(e)}Mt(e){this.cn.Xt(e)}vt(){this.cn.rn()}}class PP{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class gs{constructor(){this.cn=new SP,this.ln=new RP(this.cn),this.hn=new PP(this.cn)}seed(e){this.cn.seed(e)}Pn(e){return e===0?this.ln:this.hn}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class lr{constructor(e,t,n,i){this.Tn=e,this.In=t,this.En=n,this.dn=i}An(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new lr(this.Tn,this.In,this.En,n)}Rn(e,t,n){return{indexId:this.Tn,uid:e,arrayValue:va(this.En),directionalValue:va(this.dn),orderedDocumentKey:va(t),documentKey:n.path.toArray()}}Vn(e,t,n){const i=this.Rn(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function yn(r,e){let t=r.Tn-e.Tn;return t!==0?t:(t=Qp(r.En,e.En),t!==0?t:(t=Qp(r.dn,e.dn),t!==0?t:F.comparator(r.In,e.In)))}function Qp(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function va(r){return Hg()?function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n}(r):r}function Yp(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(r)}class Jp{constructor(e){this.mn=new se((t,n)=>me.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.fn=e.orderBy,this.gn=[];for(const t of e.filters){const n=t;n.isInequality()?this.mn=this.mn.add(n):this.gn.push(n)}}get pn(){return this.mn.size>1}yn(e){if(q(e.collectionGroup===this.collectionId,49279),this.pn)return!1;const t=Yl(e);if(t!==void 0&&!this.wn(t))return!1;const n=ir(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.wn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.mn.size>0){const c=this.mn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const l=n[s];if(!this.Sn(c,l)||!this.bn(this.fn[o++],l))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.fn.length||!this.bn(this.fn[o++],c))return!1}return!0}Dn(){if(this.pn)return null;let e=new se(me.comparator);const t=[];for(const n of this.gn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new pa(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new pa(n.field,0))}for(const n of this.fn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new pa(n.field,n.dir==="asc"?0:1)));return new Va(Va.UNKNOWN_ID,this.collectionId,t,Ys.empty())}wn(e){for(const t of this.gn)if(this.Sn(t,e))return!0;return!1}Sn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}bn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function x_(r){var t,n;if(q(r instanceof ee||r instanceof ie,20012),r instanceof ee){if(r instanceof Jy){const i=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(s=>ee.create(r.field,"==",s)))||[];return ie.create(i,"or")}return r}const e=r.filters.map(i=>x_(i));return ie.create(e,r.op)}function CP(r){if(r.getFilters().length===0)return[];const e=pu(x_(r));return q(N_(e),7391),du(e)||fu(e)?[e]:e.getFilters()}function du(r){return r instanceof ee}function fu(r){return r instanceof ie&&_h(r)}function N_(r){return du(r)||fu(r)||function(t){if(t instanceof ie&&iu(t)){for(const n of t.getFilters())if(!du(n)&&!fu(n))return!1;return!0}return!1}(r)}function pu(r){if(q(r instanceof ee||r instanceof ie,34018),r instanceof ee)return r;if(r.filters.length===1)return pu(r.filters[0]);const e=r.filters.map(n=>pu(n));let t=ie.create(e,r.op);return t=qa(t),N_(t)?t:(q(t instanceof ie,64498),q(vi(t),40251),q(t.filters.length>1,57927),t.filters.reduce((n,i)=>Ch(n,i)))}function Ch(r,e){let t;return q(r instanceof ee||r instanceof ie,38388),q(e instanceof ee||e instanceof ie,25473),t=r instanceof ee?e instanceof ee?function(i,s){return ie.create([i,s],"and")}(r,e):Xp(r,e):e instanceof ee?Xp(e,r):function(i,s){if(q(i.filters.length>0&&s.filters.length>0,48005),vi(i)&&vi(s))return Hy(i,s.getFilters());const o=iu(i)?i:s,c=iu(i)?s:i,l=o.filters.map(u=>Ch(u,c));return ie.create(l,"or")}(r,e),qa(t)}function Xp(r,e){if(vi(e))return Hy(e,r.getFilters());{const t=e.filters.map(n=>Ch(r,n));return ie.create(t,"or")}}function qa(r){if(q(r instanceof ee||r instanceof ie,11850),r instanceof ee)return r;const e=r.getFilters();if(e.length===1)return qa(e[0]);if(Gy(r))return r;const t=e.map(i=>qa(i)),n=[];return t.forEach(i=>{i instanceof ee?n.push(i):i instanceof ie&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:ie.create(n,r.op)}/**
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
 */class kP{constructor(){this.Cn=new kh}addToCollectionParentIndex(e,t){return this.Cn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(mt.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(mt.min())}updateCollectionGroup(e,t,n){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class kh{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new se(X.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new se(X.comparator)).toArray()}}/**
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
 */const Zp="IndexedDbIndexManager",sa=new Uint8Array(0);class DP{constructor(e,t){this.databaseId=t,this.vn=new kh,this.Fn=new on(n=>Tr(n),(n,i)=>Ro(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.vn.add(t)});const s={collectionId:n,parent:He(i)};return eg(e).put(s)}return A.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[gy(t),""],!1,!0);return eg(e).J(i).next(s=>{for(const o of s){if(o.collectionId!==t)break;n.push(Lt(o.parent))}return n})}addFieldIndex(e,t){const n=ms(e),i=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(l=>[l.fieldPath.canonicalString(),l.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=Gr(e);return s.next(c=>{o.put(jp(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=ms(e),i=Gr(e),s=jr(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=ms(e),n=jr(e),i=Gr(e);return t.Z().next(()=>n.Z()).next(()=>i.Z())}createTargetIndexes(e,t){return A.forEach(this.Mn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new Jp(n).Dn();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=jr(e);let i=!0;const s=new Map;return A.forEach(this.Mn(t),o=>this.xn(e,o).next(c=>{i&&(i=!!c),s.set(o,c)})).next(()=>{if(i){let o=H();const c=[];return A.forEach(s,(l,u)=>{N(Zp,`Using index ${function(B){return`id=${B.indexId}|cg=${B.collectionGroup}|f=${B.fields.map(j=>`${j.fieldPath}:${j.kind}`).join(",")}`}(l)} to execute ${Tr(t)}`);const d=function(B,j){const Q=Yl(j);if(Q===void 0)return null;for(const W of Ua(B,Q.fieldPath))switch(W.op){case"array-contains-any":return W.value.arrayValue.values||[];case"array-contains":return[W.value]}return null}(u,l),p=function(B,j){const Q=new Map;for(const W of ir(j))for(const E of Ua(B,W.fieldPath))switch(E.op){case"==":case"in":Q.set(W.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return Q.set(W.fieldPath.canonicalString(),E.value),Array.from(Q.values())}return null}(u,l),g=function(B,j){const Q=[];let W=!0;for(const E of ir(j)){const y=E.kind===0?Dp(B,E.fieldPath,B.startAt):xp(B,E.fieldPath,B.startAt);Q.push(y.value),W&&(W=y.inclusive)}return new Ln(Q,W)}(u,l),I=function(B,j){const Q=[];let W=!0;for(const E of ir(j)){const y=E.kind===0?xp(B,E.fieldPath,B.endAt):Dp(B,E.fieldPath,B.endAt);Q.push(y.value),W&&(W=y.inclusive)}return new Ln(Q,W)}(u,l),P=this.On(l,u,g),D=this.On(l,u,I),T=this.Nn(l,u,p),V=this.Bn(l.indexId,d,P,g.inclusive,D,I.inclusive,T);return A.forEach(V,M=>n.Y(M,t.limit).next(B=>{B.forEach(j=>{const Q=F.fromSegments(j.documentKey);o.has(Q)||(o=o.add(Q),c.push(Q))})}))}).next(()=>c)}return A.resolve(null)})}Mn(e){let t=this.Fn.get(e);return t||(e.filters.length===0?t=[e]:t=CP(ie.create(e.filters,"and")).map(n=>ou(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Fn.set(e,t),t)}Bn(e,t,n,i,s,o,c){const l=(t!=null?t.length:1)*Math.max(n.length,s.length),u=l/(t!=null?t.length:1),d=[];for(let p=0;p<l;++p){const g=t?this.Ln(t[p/u]):sa,I=this.kn(e,g,n[p%u],i),P=this.qn(e,g,s[p%u],o),D=c.map(T=>this.kn(e,g,T,!0));d.push(...this.createRange(I,P,D))}return d}kn(e,t,n,i){const s=new lr(e,F.empty(),t,n);return i?s:s.An()}qn(e,t,n,i){const s=new lr(e,F.empty(),t,n);return i?s.An():s}xn(e,t){const n=new Jp(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let o=null;for(const c of s)n.yn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let n=2;const i=this.Mn(t);return A.forEach(i,s=>this.xn(e,s).next(o=>{o?n!==0&&o.fields.length<function(l){let u=new se(me.comparator),d=!1;for(const p of l.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?d=!0:u=u.add(g.field));for(const p of l.orderBy)p.field.isKeyField()||(u=u.add(p.field));return u.size+(d?1:0)}(s)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&i.length>1&&n===2?1:n)}Qn(e,t){const n=new gs;for(const i of ir(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.Pn(i.kind);cr.Kt.Dt(s,o)}return n.un()}Ln(e){const t=new gs;return cr.Kt.Dt(e,t.Pn(0)),t.un()}$n(e,t){const n=new gs;return cr.Kt.Dt(vr(this.databaseId,t),n.Pn(function(s){const o=ir(s);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}Nn(e,t,n){if(n===null)return[];let i=[];i.push(new gs);let s=0;for(const o of ir(e)){const c=n[s++];for(const l of i)if(this.Un(t,o.fieldPath)&&ro(c))i=this.Kn(i,o,c);else{const u=l.Pn(o.kind);cr.Kt.Dt(c,u)}}return this.Wn(i)}On(e,t,n){return this.Nn(e,t,n.position)}Wn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Kn(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const l=new gs;l.seed(c.un()),cr.Kt.Dt(o,l.Pn(t.kind)),s.push(l)}return s}Un(e,t){return!!e.filters.find(n=>n instanceof ee&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=ms(e),i=Gr(e);return(t?n.J(Xl,IDBKeyRange.bound(t,t)):n.J()).next(s=>{const o=[];return A.forEach(s,c=>i.get([c.indexId,this.uid]).next(l=>{o.push(function(d,p){const g=p?new Ys(p.sequenceNumber,new mt(Rr(p.readTime),new F(Lt(p.documentKey)),p.largestBatchId)):Ys.empty(),I=d.fields.map(([P,D])=>new pa(me.fromServerFormat(P),D));return new Va(d.indexId,d.collectionGroup,I,g)}(c,l))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:G(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=ms(e),s=Gr(e);return this.Gn(e).next(o=>i.J(Xl,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,l=>s.put(jp(l.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return A.forEach(t,(i,s)=>{const o=n.get(i.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next(c=>(n.set(i.collectionGroup,c),A.forEach(c,l=>this.zn(e,i,l).next(u=>{const d=this.jn(s,l);return u.isEqual(d)?A.resolve():this.Jn(e,s,l,u,d)}))))})}Hn(e,t,n,i){return jr(e).put(i.Rn(this.uid,this.$n(n,t.key),t.key))}Yn(e,t,n,i){return jr(e).delete(i.Vn(this.uid,this.$n(n,t.key),t.key))}zn(e,t,n){const i=jr(e);let s=new se(yn);return i.ee({index:Cy,range:IDBKeyRange.only([n.indexId,this.uid,va(this.$n(n,t))])},(o,c)=>{s=s.add(new lr(n.indexId,t,Yp(c.arrayValue),Yp(c.directionalValue)))}).next(()=>s)}jn(e,t){let n=new se(yn);const i=this.Qn(t,e);if(i==null)return n;const s=Yl(t);if(s!=null){const o=e.data.field(s.fieldPath);if(ro(o))for(const c of o.arrayValue.values||[])n=n.add(new lr(t.indexId,e.key,this.Ln(c),i))}else n=n.add(new lr(t.indexId,e.key,sa,i));return n}Jn(e,t,n,i,s){N(Zp,"Updating index entries for document '%s'",t.key);const o=[];return function(l,u,d,p,g){const I=l.getIterator(),P=u.getIterator();let D=zr(I),T=zr(P);for(;D||T;){let V=!1,M=!1;if(D&&T){const B=d(D,T);B<0?M=!0:B>0&&(V=!0)}else D!=null?M=!0:V=!0;V?(p(T),T=zr(P)):M?(g(D),D=zr(I)):(D=zr(I),T=zr(P))}}(i,s,yn,c=>{o.push(this.Hn(e,t,n,c))},c=>{o.push(this.Yn(e,t,n,c))}),A.waitFor(o)}Gn(e){let t=1;return Gr(e).ee({index:Py,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,c)=>yn(o,c)).filter((o,c,l)=>!c||yn(o,l[c-1])!==0);const i=[];i.push(e);for(const o of n){const c=yn(o,e),l=yn(o,t);if(c===0)i[0]=e.An();else if(c>0&&l<0)i.push(o),i.push(o.An());else if(l>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Zn(i[o],i[o+1]))return[];const c=i[o].Vn(this.uid,sa,F.empty()),l=i[o+1].Vn(this.uid,sa,F.empty());s.push(IDBKeyRange.bound(c,l))}return s}Zn(e,t){return yn(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(tg)}getMinOffset(e,t){return A.mapArray(this.Mn(t),n=>this.xn(e,n).next(i=>i||$(44426))).next(tg)}}function eg(r){return Ne(r,eo)}function jr(r){return Ne(r,Fs)}function ms(r){return Ne(r,fh)}function Gr(r){return Ne(r,Ms)}function tg(r){q(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;uh(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new mt(e.readTime,e.documentKey,t)}/**
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
 */const ng={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},V_=41943040;class Ge{static withCacheSize(e){return new Ge(e,Ge.DEFAULT_COLLECTION_PERCENTILE,Ge.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
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
 */function O_(r,e,t){const n=r.store(Et),i=r.store(mi),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const l=n.ee({range:o},(d,p,g)=>(c++,g.delete()));s.push(l.next(()=>{q(c===1,47070,{batchId:t.batchId})}));const u=[];for(const d of t.mutations){const p=Ay(e,d.key.path,t.batchId);s.push(i.delete(p)),u.push(d.key)}return A.waitFor(s).next(()=>u)}function za(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw $(14731);e=r.noDocument}return JSON.stringify(e).length}/**
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
 */Ge.DEFAULT_COLLECTION_PERCENTILE=10,Ge.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Ge.DEFAULT=new Ge(V_,Ge.DEFAULT_COLLECTION_PERCENTILE,Ge.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Ge.DISABLED=new Ge(-1,0,0);class Ac{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Xn={}}static wt(e,t,n,i){q(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new Ac(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return _n(e).ee({index:dr,range:n},(i,s,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=ei(e),o=_n(e);return o.add({}).next(c=>{q(typeof c=="number",49019);const l=new Th(c,t,n,i),u=function(I,P,D){const T=D.baseMutations.map(M=>oo(I.yt,M)),V=D.mutations.map(M=>oo(I.yt,M));return{userId:P,batchId:D.batchId,localWriteTimeMs:D.localWriteTime.toMillis(),baseMutations:T,mutations:V}}(this.serializer,this.userId,l),d=[];let p=new se((g,I)=>G(g.canonicalString(),I.canonicalString()));for(const g of i){const I=Ay(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),d.push(o.put(u)),d.push(s.put(I,hR))}return p.forEach(g=>{d.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Xn[c]=l.keys()}),A.waitFor(d).next(()=>l)})}lookupMutationBatch(e,t){return _n(e).get(t).next(n=>n?(q(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),ar(this.serializer,n)):null)}er(e,t){return this.Xn[t]?A.resolve(this.Xn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Xn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return _n(e).ee({index:dr,range:i},(o,c,l)=>{c.userId===this.userId&&(q(c.batchId>=n,47524,{tr:n}),s=ar(this.serializer,c)),l.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=Pn;return _n(e).ee({index:dr,range:t,reverse:!0},(i,s,o)=>{n=s.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Pn],[this.userId,Number.POSITIVE_INFINITY]);return _n(e).J(dr,t).next(n=>n.map(i=>ar(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=ga(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return ei(e).ee({range:i},(o,c,l)=>{const[u,d,p]=o,g=Lt(d);if(u===this.userId&&t.path.isEqual(g))return _n(e).get(p).next(I=>{if(!I)throw $(61480,{nr:o,batchId:p});q(I.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:I.userId,batchId:p}),s.push(ar(this.serializer,I))});l.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new se(G);const i=[];return t.forEach(s=>{const o=ga(this.userId,s.path),c=IDBKeyRange.lowerBound(o),l=ei(e).ee({range:c},(u,d,p)=>{const[g,I,P]=u,D=Lt(I);g===this.userId&&s.path.isEqual(D)?n=n.add(P):p.done()});i.push(l)}),A.waitFor(i).next(()=>this.rr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=ga(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new se(G);return ei(e).ee({range:o},(l,u,d)=>{const[p,g,I]=l,P=Lt(g);p===this.userId&&n.isPrefixOf(P)?P.length===i&&(c=c.add(I)):d.done()}).next(()=>this.rr(e,c))}rr(e,t){const n=[],i=[];return t.forEach(s=>{i.push(_n(e).get(s).next(o=>{if(o===null)throw $(35274,{batchId:s});q(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(ar(this.serializer,o))}))}),A.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return O_(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.ir(t.batchId)}),A.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}ir(e){delete this.Xn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),i=[];return ei(e).ee({range:n},(s,o,c)=>{if(s[0]===this.userId){const l=Lt(s[1]);i.push(l)}else c.done()}).next(()=>{q(i.length===0,56720,{sr:i.map(s=>s.canonicalString())})})})}containsKey(e,t){return M_(e,this.userId,t)}_r(e){return F_(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:Pn,lastStreamToken:""})}}function M_(r,e,t){const n=ga(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return ei(r).ee({range:s,X:!0},(c,l,u)=>{const[d,p,g]=c;d===e&&p===i&&(o=!0),u.done()}).next(()=>o)}function _n(r){return Ne(r,Et)}function ei(r){return Ne(r,mi)}function F_(r){return Ne(r,Xs)}/**
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
 */class Pr{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new Pr(0)}static cr(){return new Pr(-1)}}/**
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
 */class xP{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.lr(e).next(t=>{const n=new Pr(t.highestTargetId);return t.highestTargetId=n.next(),this.hr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.lr(e).next(t=>z.fromTimestamp(new re(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.lr(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.lr(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.hr(e,i)))}addTargetData(e,t){return this.Pr(e,t).next(()=>this.lr(e).next(n=>(n.targetCount+=1,this.Tr(t,n),this.hr(e,n))))}updateTargetData(e,t){return this.Pr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Wr(e).delete(t.targetId)).next(()=>this.lr(e)).next(n=>(q(n.targetCount>0,8065),n.targetCount-=1,this.hr(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return Wr(e).ee((o,c)=>{const l=Ss(c);l.sequenceNumber<=t&&n.get(l.targetId)===null&&(i++,s.push(this.removeTargetData(e,l)))}).next(()=>A.waitFor(s)).next(()=>i)}forEachTarget(e,t){return Wr(e).ee((n,i)=>{const s=Ss(i);t(s)})}lr(e){return rg(e).get(Fa).next(t=>(q(t!==null,2888),t))}hr(e,t){return rg(e).put(Fa,t)}Pr(e,t){return Wr(e).put(D_(this.serializer,t))}Tr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.lr(e).next(t=>t.targetCount)}getTargetData(e,t){const n=Tr(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return Wr(e).ee({range:i,index:Ry},(o,c,l)=>{const u=Ss(c);Ro(t,u.target)&&(s=u,l.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=En(e);return t.forEach(o=>{const c=He(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))}),A.waitFor(i)}removeMatchingKeys(e,t,n){const i=En(e);return A.forEach(t,s=>{const o=He(s.path);return A.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=En(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=En(e);let s=H();return i.ee({range:n,X:!0},(o,c,l)=>{const u=Lt(o[1]),d=new F(u);s=s.add(d)}).next(()=>s)}containsKey(e,t){const n=He(t.path),i=IDBKeyRange.bound([n],[gy(n)],!1,!0);let s=0;return En(e).ee({index:dh,X:!0,range:i},([o,c],l,u)=>{o!==0&&(s++,u.done())}).next(()=>s>0)}At(e,t){return Wr(e).get(t).next(n=>n?Ss(n):null)}}function Wr(r){return Ne(r,yi)}function rg(r){return Ne(r,yr)}function En(r){return Ne(r,_i)}/**
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
 */const ig="LruGarbageCollector",NP=1048576;function sg([r,e],[t,n]){const i=G(r,t);return i===0?G(e,n):i}class VP{constructor(e){this.Ir=e,this.buffer=new se(sg),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();sg(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class L_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){N(ig,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){jn(t)?N(ig,"Ignoring IndexedDB error during garbage collection: ",t):await Kn(t)}await this.Vr(3e5)})}}class OP{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return A.resolve(ct.ce);const n=new VP(t);return this.mr.forEachTarget(e,i=>n.Ar(i.sequenceNumber)).next(()=>this.mr.pr(e,i=>n.Ar(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.mr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(N("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(ng)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(N("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),ng):this.yr(e,t))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let n,i,s,o,c,l,u;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(N("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i))).next(p=>(n=p,c=Date.now(),this.removeTargets(e,n,t))).next(p=>(s=p,l=Date.now(),this.removeOrphanedDocuments(e,n))).next(p=>(u=Date.now(),Yr()<=J.DEBUG&&N("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(l-c)+`ms
	Removed ${p} documents in `+(u-l)+`ms
Total Duration: ${u-d}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p})))}}function U_(r,e){return new OP(r,e)}/**
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
 */class MP{constructor(e,t){this.db=e,this.garbageCollector=U_(this,t)}gr(e){const t=this.wr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}pr(e,t){return this.Sr(e,(n,i)=>t(i))}addReference(e,t,n){return oa(e,n)}removeReference(e,t,n){return oa(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return oa(e,t)}br(e,t){return function(i,s){let o=!1;return F_(i).te(c=>M_(i,c,s).next(l=>(l&&(o=!0),A.resolve(!l)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.Sr(e,(o,c)=>{if(c<=t){const l=this.br(e,o).next(u=>{if(!u)return s++,n.getEntry(e,o).next(()=>(n.removeEntry(o,z.min()),En(e).delete(function(p){return[0,He(p.path)]}(o))))});i.push(l)}}).next(()=>A.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return oa(e,t)}Sr(e,t){const n=En(e);let i,s=ct.ce;return n.ee({index:dh},([o,c],{path:l,sequenceNumber:u})=>{o===0?(s!==ct.ce&&t(new F(Lt(i)),s),s=u,i=l):s=ct.ce}).next(()=>{s!==ct.ce&&t(new F(Lt(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function oa(r,e){return En(r).put(function(n,i){return{targetId:0,path:He(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
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
 */class B_{constructor(){this.changes=new on(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,he.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?A.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class FP{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return tr(e).put(n)}removeEntry(e,t,n){return tr(e).delete(function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],$a(o),c[c.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Dr(e,n)))}getEntry(e,t){let n=he.newInvalidDocument(t);return tr(e).ee({index:ma,range:IDBKeyRange.only(ys(t))},(i,s)=>{n=this.Cr(t,s)}).next(()=>n)}vr(e,t){let n={size:0,document:he.newInvalidDocument(t)};return tr(e).ee({index:ma,range:IDBKeyRange.only(ys(t))},(i,s)=>{n={document:this.Cr(t,s),size:za(s)}}).next(()=>n)}getEntries(e,t){let n=ut();return this.Fr(e,t,(i,s)=>{const o=this.Cr(i,s);n=n.insert(i,o)}).next(()=>n)}Mr(e,t){let n=ut(),i=new le(F.comparator);return this.Fr(e,t,(s,o)=>{const c=this.Cr(s,o);n=n.insert(s,c),i=i.insert(s,za(o))}).next(()=>({documents:n,Or:i}))}Fr(e,t,n){if(t.isEmpty())return A.resolve();let i=new se(cg);t.forEach(l=>i=i.add(l));const s=IDBKeyRange.bound(ys(i.first()),ys(i.last())),o=i.getIterator();let c=o.getNext();return tr(e).ee({index:ma,range:s},(l,u,d)=>{const p=F.fromSegments([...u.prefixPath,u.collectionGroup,u.documentId]);for(;c&&cg(c,p)<0;)n(c,null),c=o.getNext();c&&c.isEqual(p)&&(n(c,u),c=o.hasNext()?o.getNext():null),c?d.j(ys(c)):d.done()}).next(()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),$a(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],l=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return tr(e).J(IDBKeyRange.bound(c,l,!0)).next(u=>{s==null||s.incrementDocumentReadCount(u.length);let d=ut();for(const p of u){const g=this.Cr(F.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(Co(t,g)||i.has(g.key))&&(d=d.insert(g.key,g))}return d})}getAllFromCollectionGroup(e,t,n,i){let s=ut();const o=ag(t,n),c=ag(t,mt.max());return tr(e).ee({index:Sy,range:IDBKeyRange.bound(o,c,!0)},(l,u,d)=>{const p=this.Cr(F.fromSegments(u.prefixPath.concat(u.collectionGroup,u.documentId)),u);s=s.insert(p.key,p),s.size===i&&d.done()}).next(()=>s)}newChangeBuffer(e){return new LP(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return og(e).get(Jl).next(t=>(q(!!t,20021),t))}Dr(e,t){return og(e).put(Jl,t)}Cr(e,t){if(t){const n=vP(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(z.min())))return n}return he.newInvalidDocument(e)}}function $_(r){return new FP(r)}class LP extends B_{constructor(e,t){super(),this.Nr=e,this.trackRemovals=t,this.Br=new on(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new se((s,o)=>G(s.canonicalString(),o.canonicalString()));return this.changes.forEach((s,o)=>{const c=this.Br.get(s);if(t.push(this.Nr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const l=zp(this.Nr.serializer,o);i=i.add(s.path.popLast());const u=za(l);n+=u-c.size,t.push(this.Nr.addEntry(e,s,l))}else if(n-=c.size,this.trackRemovals){const l=zp(this.Nr.serializer,o.convertToNoDocument(z.min()));t.push(this.Nr.addEntry(e,s,l))}}),i.forEach(s=>{t.push(this.Nr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.Nr.updateMetadata(e,n)),A.waitFor(t)}getFromCache(e,t){return this.Nr.vr(e,t).next(n=>(this.Br.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Nr.Mr(e,t).next(({documents:n,Or:i})=>(i.forEach((s,o)=>{this.Br.set(s,{size:o,readTime:n.get(s).readTime})}),n))}}function og(r){return Ne(r,Zs)}function tr(r){return Ne(r,Ma)}function ys(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function ag(r,e){const t=e.documentKey.path.toArray();return[r,$a(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function cg(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=G(t[s],n[s]),i)return i;return i=G(t.length,n.length),i||(i=G(t[t.length-2],n[n.length-2]),i||G(t[t.length-1],n[n.length-1]))}/**
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
 */class UP{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class q_{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&Bs(n.mutation,i,lt.empty(),re.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,H()).next(()=>n))}getLocalViewOfDocuments(e,t,n=H()){const i=Ut();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let o=bs();return s.forEach((c,l)=>{o=o.insert(c,l.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=Ut();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,H()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,n,i){let s=ut();const o=Us(),c=function(){return Us()}();return t.forEach((l,u)=>{const d=n.get(u.key);i.has(u.key)&&(d===void 0||d.mutation instanceof an)?s=s.insert(u.key,u):d!==void 0?(o.set(u.key,d.mutation.getFieldMask()),Bs(d.mutation,u,d.mutation.getFieldMask(),re.now())):o.set(u.key,lt.empty())}),this.recalculateAndSaveOverlays(e,s).next(l=>(l.forEach((u,d)=>o.set(u,d)),t.forEach((u,d)=>c.set(u,new UP(d,o.get(u)??null))),c))}recalculateAndSaveOverlays(e,t){const n=Us();let i=new le((o,c)=>o-c),s=H();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(l=>{const u=t.get(l);if(u===null)return;let d=n.get(l)||lt.empty();d=c.applyToLocalView(u,d),n.set(l,d);const p=(i.get(c.batchId)||H()).add(l);i=i.insert(c.batchId,p)})}).next(()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const l=c.getNext(),u=l.key,d=l.value,p=i_();d.forEach(g=>{if(!s.has(g)){const I=h_(t.get(g),n.get(g));I!==null&&p.set(g,I),s=s.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,u,p))}return A.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(o){return F.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):wh(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):A.resolve(Ut());let c=gi,l=s;return o.next(u=>A.forEach(u,(d,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(d)?A.resolve():this.remoteDocumentCache.getEntry(e,d).next(g=>{l=l.insert(d,g)}))).next(()=>this.populateOverlays(e,u,s)).next(()=>this.computeViews(e,l,u,H())).next(d=>({batchId:c,changes:r_(d)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new F(t)).next(n=>{let i=bs();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=bs();return this.indexManager.getCollectionParents(e,s).next(c=>A.forEach(c,l=>{const u=function(p,g){return new sn(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,l.child(s));return this.getDocumentsMatchingCollectionQuery(e,u,n,i).next(d=>{d.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(o=>{s.forEach((l,u)=>{const d=u.getKey();o.get(d)===null&&(o=o.insert(d,he.newInvalidDocument(d)))});let c=bs();return o.forEach((l,u)=>{const d=s.get(l);d!==void 0&&Bs(d.mutation,u,lt.empty(),re.now()),Co(t,u)&&(c=c.insert(l,u))}),c})}}/**
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
 */class BP{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return A.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:Se(i.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,function(i){return{name:i.name,query:Ph(i.bundledQuery),readTime:Se(i.readTime)}}(t)),A.resolve()}}/**
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
 */class $P{constructor(){this.overlays=new le(F.comparator),this.qr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Ut();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.St(e,t,s)}),A.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.qr.delete(n)),A.resolve()}getOverlaysForCollection(e,t,n){const i=Ut(),s=t.length+1,o=new F(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const l=c.getNext().value,u=l.getKey();if(!t.isPrefixOf(u.path))break;u.path.length===s&&l.largestBatchId>n&&i.set(l.getKey(),l)}return A.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new le((u,d)=>u-d);const o=this.overlays.getIterator();for(;o.hasNext();){const u=o.getNext().value;if(u.getKey().getCollectionGroup()===t&&u.largestBatchId>n){let d=s.get(u.largestBatchId);d===null&&(d=Ut(),s=s.insert(u.largestBatchId,d)),d.set(u.getKey(),u)}}const c=Ut(),l=s.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((u,d)=>c.set(u,d)),!(c.size()>=i)););return A.resolve(c)}St(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Ah(t,n));let s=this.qr.get(t);s===void 0&&(s=H(),this.qr.set(t,s)),this.qr.set(t,s.add(n.key))}}/**
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
 */class qP{constructor(){this.sessionToken=ve.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
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
 */class Dh{constructor(){this.Qr=new se(Oe.$r),this.Ur=new se(Oe.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const n=new Oe(e,t);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Gr(new Oe(e,t))}zr(e,t){e.forEach(n=>this.removeReference(n,t))}jr(e){const t=new F(new X([])),n=new Oe(t,e),i=new Oe(t,e+1),s=[];return this.Ur.forEachInRange([n,i],o=>{this.Gr(o),s.push(o.key)}),s}Jr(){this.Qr.forEach(e=>this.Gr(e))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new F(new X([])),n=new Oe(t,e),i=new Oe(t,e+1);let s=H();return this.Ur.forEachInRange([n,i],o=>{s=s.add(o.key)}),s}containsKey(e){const t=new Oe(e,0),n=this.Qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class Oe{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return F.comparator(e.key,t.key)||G(e.Yr,t.Yr)}static Kr(e,t){return G(e.Yr,t.Yr)||F.comparator(e.key,t.key)}}/**
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
 */class zP{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new se(Oe.$r)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Th(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Zr=this.Zr.add(new Oe(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.ei(n),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?Pn:this.tr-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Oe(t,0),i=new Oe(t,Number.POSITIVE_INFINITY),s=[];return this.Zr.forEachInRange([n,i],o=>{const c=this.Xr(o.Yr);s.push(c)}),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new se(G);return t.forEach(i=>{const s=new Oe(i,0),o=new Oe(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([s,o],c=>{n=n.add(c.Yr)})}),A.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;F.isDocumentKey(s)||(s=s.child(""));const o=new Oe(new F(s),0);let c=new se(G);return this.Zr.forEachWhile(l=>{const u=l.key.path;return!!n.isPrefixOf(u)&&(u.length===i&&(c=c.add(l.Yr)),!0)},o),A.resolve(this.ti(c))}ti(e){const t=[];return e.forEach(n=>{const i=this.Xr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){q(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return A.forEach(t.mutations,i=>{const s=new Oe(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.Zr=n})}ir(e){}containsKey(e,t){const n=new Oe(t,0),i=this.Zr.firstAfterOrEqual(n);return A.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class KP{constructor(e){this.ri=e,this.docs=function(){return new le(F.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ri(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return A.resolve(n?n.document.mutableCopy():he.newInvalidDocument(t))}getEntries(e,t){let n=ut();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():he.newInvalidDocument(i))}),A.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=ut();const o=t.path,c=new F(o.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:u,value:{document:d}}=l.getNext();if(!o.isPrefixOf(u.path))break;u.path.length>o.length+1||uh(Iy(d),n)<=0||(i.has(d.key)||Co(t,d))&&(s=s.insert(d.key,d.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(e,t,n,i){$(9500)}ii(e,t){return A.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new jP(this)}getSize(e){return A.resolve(this.size)}}class jP extends B_{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.Nr.addEntry(e,i)):this.Nr.removeEntry(n)}),A.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
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
 */class GP{constructor(e){this.persistence=e,this.si=new on(t=>Tr(t),Ro),this.lastRemoteSnapshotVersion=z.min(),this.highestTargetId=0,this.oi=0,this._i=new Dh,this.targetCount=0,this.ai=Pr.ur()}forEachTarget(e,t){return this.si.forEach((n,i)=>t(i)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.oi&&(this.oi=t),A.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new Pr(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.Pr(t),A.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.si.forEach((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.si.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)}),A.waitFor(s).next(()=>i)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const n=this.si.get(t)||null;return A.resolve(n)}addMatchingKeys(e,t,n){return this._i.Wr(t,n),A.resolve()}removeMatchingKeys(e,t,n){this._i.zr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),A.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const n=this._i.Hr(t);return A.resolve(n)}containsKey(e,t){return A.resolve(this._i.containsKey(t))}}/**
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
 */class xh{constructor(e,t){this.ui={},this.overlays={},this.ci=new ct(0),this.li=!1,this.li=!0,this.hi=new qP,this.referenceDelegate=e(this),this.Pi=new GP(this),this.indexManager=new kP,this.remoteDocumentCache=function(i){return new KP(i)}(n=>this.referenceDelegate.Ti(n)),this.serializer=new k_(t),this.Ii=new BP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new $P,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ui[e.toKey()];return n||(n=new zP(t,this.referenceDelegate),this.ui[e.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,n){N("MemoryPersistence","Starting transaction:",e);const i=new WP(this.ci.next());return this.referenceDelegate.Ei(),n(i).next(s=>this.referenceDelegate.di(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Ai(e,t){return A.or(Object.values(this.ui).map(n=>()=>n.containsKey(e,t)))}}class WP extends vy{constructor(e){super(),this.currentSequenceNumber=e}}class Sc{constructor(e){this.persistence=e,this.Ri=new Dh,this.Vi=null}static mi(e){return new Sc(e)}get fi(){if(this.Vi)return this.Vi;throw $(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.fi.delete(n.toString()),A.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.fi.add(n.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(i=>this.fi.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.fi.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.fi,n=>{const i=F.fromPath(n);return this.gi(e,i).next(s=>{s||t.removeEntry(i,z.min())})}).next(()=>(this.Vi=null,t.apply(e)))}updateLimboDocument(e,t){return this.gi(e,t).next(n=>{n?this.fi.delete(t.toString()):this.fi.add(t.toString())})}Ti(e){return 0}gi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class Ka{constructor(e,t){this.persistence=e,this.pi=new on(n=>He(n.path),(n,i)=>n.isEqual(i)),this.garbageCollector=U_(this,t)}static mi(e,t){return new Ka(e,t)}Ei(){}di(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}pr(e,t){return A.forEach(this.pi,(n,i)=>this.br(e,n,i).next(s=>s?A.resolve():t(i)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ii(e,o=>this.br(e,o,t).next(c=>{c||(n++,s.removeEntry(o,z.min()))})).next(()=>s.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}removeReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=_a(e.data.value)),t}br(e,t,n){return A.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.pi.get(t);return A.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
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
 */class HP{constructor(e){this.serializer=e}k(e,t,n,i){const s=new gc("createOrUpgrade",t);n<1&&i>=1&&(function(l){l.createObjectStore(So)}(e),function(l){l.createObjectStore(Xs,{keyPath:uR}),l.createObjectStore(Et,{keyPath:wp,autoIncrement:!0}).createIndex(dr,Ip,{unique:!0}),l.createObjectStore(mi)}(e),lg(e),function(l){l.createObjectStore(sr)}(e));let o=A.resolve();return n<3&&i>=3&&(n!==0&&(function(l){l.deleteObjectStore(_i),l.deleteObjectStore(yi),l.deleteObjectStore(yr)}(e),lg(e)),o=o.next(()=>function(l){const u=l.store(yr),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:z.min().toTimestamp(),targetCount:0};return u.put(Fa,d)}(s))),n<4&&i>=4&&(n!==0&&(o=o.next(()=>function(l,u){return u.store(Et).J().next(p=>{l.deleteObjectStore(Et),l.createObjectStore(Et,{keyPath:wp,autoIncrement:!0}).createIndex(dr,Ip,{unique:!0});const g=u.store(Et),I=p.map(P=>g.put(P));return A.waitFor(I)})}(e,s))),o=o.next(()=>{(function(l){l.createObjectStore(wi,{keyPath:wR})})(e)})),n<5&&i>=5&&(o=o.next(()=>this.yi(s))),n<6&&i>=6&&(o=o.next(()=>(function(l){l.createObjectStore(Zs)}(e),this.wi(s)))),n<7&&i>=7&&(o=o.next(()=>this.Si(s))),n<8&&i>=8&&(o=o.next(()=>this.bi(e,s))),n<9&&i>=9&&(o=o.next(()=>{(function(l){l.objectStoreNames.contains("remoteDocumentChanges")&&l.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(o=o.next(()=>this.Di(s))),n<11&&i>=11&&(o=o.next(()=>{(function(l){l.createObjectStore(mc,{keyPath:IR})})(e),function(l){l.createObjectStore(yc,{keyPath:ER})}(e)})),n<12&&i>=12&&(o=o.next(()=>{(function(l){const u=l.createObjectStore(_c,{keyPath:PR});u.createIndex(Zl,CR,{unique:!1}),u.createIndex(ky,kR,{unique:!1})})(e)})),n<13&&i>=13&&(o=o.next(()=>function(l){const u=l.createObjectStore(Ma,{keyPath:dR});u.createIndex(ma,fR),u.createIndex(Sy,pR)}(e)).next(()=>this.Ci(e,s)).next(()=>e.deleteObjectStore(sr))),n<14&&i>=14&&(o=o.next(()=>this.Fi(e,s))),n<15&&i>=15&&(o=o.next(()=>function(l){l.createObjectStore(fh,{keyPath:vR,autoIncrement:!0}).createIndex(Xl,TR,{unique:!1}),l.createObjectStore(Ms,{keyPath:bR}).createIndex(Py,AR,{unique:!1}),l.createObjectStore(Fs,{keyPath:SR}).createIndex(Cy,RR,{unique:!1})}(e))),n<16&&i>=16&&(o=o.next(()=>{t.objectStore(Ms).clear()}).next(()=>{t.objectStore(Fs).clear()})),n<17&&i>=17&&(o=o.next(()=>{(function(l){l.createObjectStore(ph,{keyPath:DR})})(e)})),n<18&&i>=18&&Hg()&&(o=o.next(()=>{t.objectStore(Ms).clear()}).next(()=>{t.objectStore(Fs).clear()})),o}wi(e){let t=0;return e.store(sr).ee((n,i)=>{t+=za(i)}).next(()=>{const n={byteSize:t};return e.store(Zs).put(Jl,n)})}yi(e){const t=e.store(Xs),n=e.store(Et);return t.J().next(i=>A.forEach(i,s=>{const o=IDBKeyRange.bound([s.userId,Pn],[s.userId,s.lastAcknowledgedBatchId]);return n.J(dr,o).next(c=>A.forEach(c,l=>{q(l.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:l.batchId});const u=ar(this.serializer,l);return O_(e,s.userId,u).next(()=>{})}))}))}Si(e){const t=e.store(_i),n=e.store(sr);return e.store(yr).get(Fa).next(i=>{const s=[];return n.ee((o,c)=>{const l=new X(o),u=function(p){return[0,He(p)]}(l);s.push(t.get(u).next(d=>d?A.resolve():(p=>t.put({targetId:0,path:He(p),sequenceNumber:i.highestListenSequenceNumber}))(l)))}).next(()=>A.waitFor(s))})}bi(e,t){e.createObjectStore(eo,{keyPath:_R});const n=t.store(eo),i=new kh,s=o=>{if(i.add(o)){const c=o.lastSegment(),l=o.popLast();return n.put({collectionId:c,parent:He(l)})}};return t.store(sr).ee({X:!0},(o,c)=>{const l=new X(o);return s(l.popLast())}).next(()=>t.store(mi).ee({X:!0},([o,c,l],u)=>{const d=Lt(c);return s(d.popLast())}))}Di(e){const t=e.store(yi);return t.ee((n,i)=>{const s=Ss(i),o=D_(this.serializer,s);return t.put(o)})}Ci(e,t){const n=t.store(sr),i=[];return n.ee((s,o)=>{const c=t.store(Ma),l=function(p){return p.document?new F(X.fromString(p.document.name).popFirst(5)):p.noDocument?F.fromSegments(p.noDocument.path):p.unknownDocument?F.fromSegments(p.unknownDocument.path):$(36783)}(o).path.toArray(),u={prefixPath:l.slice(0,l.length-2),collectionGroup:l[l.length-2],documentId:l[l.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(u))}).next(()=>A.waitFor(i))}Fi(e,t){const n=t.store(Et),i=$_(this.serializer),s=new xh(Sc.mi,this.serializer.yt);return n.J().next(o=>{const c=new Map;return o.forEach(l=>{let u=c.get(l.userId)??H();ar(this.serializer,l).keys().forEach(d=>u=u.add(d)),c.set(l.userId,u)}),A.forEach(c,(l,u)=>{const d=new Me(u),p=bc.wt(this.serializer,d),g=s.getIndexManager(d),I=Ac.wt(d,this.serializer,g,s.referenceDelegate);return new q_(i,I,p,g).recalculateAndSaveOverlaysForDocumentKeys(new eu(t,ct.ce),l).next()})})}}function lg(r){r.createObjectStore(_i,{keyPath:mR}).createIndex(dh,yR,{unique:!0}),r.createObjectStore(yi,{keyPath:"targetId"}).createIndex(Ry,gR,{unique:!0}),r.createObjectStore(yr)}const wn="IndexedDbPersistence",kl=18e5,Dl=5e3,xl="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",z_="main";class Nh{constructor(e,t,n,i,s,o,c,l,u,d,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Mi=s,this.window=o,this.document=c,this.xi=u,this.Oi=d,this.Ni=p,this.ci=null,this.li=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Bi=null,this.inForeground=!1,this.Li=null,this.ki=null,this.qi=Number.NEGATIVE_INFINITY,this.Qi=g=>Promise.resolve(),!Nh.v())throw new x(C.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new MP(this,i),this.$i=t+z_,this.serializer=new k_(l),this.Ui=new Bt(this.$i,this.Ni,new HP(this.serializer)),this.hi=new bP,this.Pi=new xP(this.referenceDelegate,this.serializer),this.remoteDocumentCache=$_(this.serializer),this.Ii=new TP,this.window&&this.window.localStorage?this.Ki=this.window.localStorage:(this.Ki=null,d===!1&&Ae(wn,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Wi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new x(C.FAILED_PRECONDITION,xl);return this.Gi(),this.zi(),this.ji(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Pi.getHighestSequenceNumber(e))}).then(e=>{this.ci=new ct(e,this.xi)}).then(()=>{this.li=!0}).catch(e=>(this.Ui&&this.Ui.close(),Promise.reject(e)))}Ji(e){return this.Qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ui.$(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Mi.enqueueAndForget(async()=>{this.started&&await this.Wi()}))}Wi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>aa(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Hi(e).next(t=>{t||(this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)))})}).next(()=>this.Yi(e)).next(t=>this.isPrimary&&!t?this.Zi(e).next(()=>!1):!!t&&this.Xi(e).next(()=>!0))).catch(e=>{if(jn(e))return N(wn,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return N(wn,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Mi.enqueueRetryable(()=>this.Qi(e)),this.isPrimary=e})}Hi(e){return _s(e).get(qr).next(t=>A.resolve(this.es(t)))}ts(e){return aa(e).delete(this.clientId)}async ns(){if(this.isPrimary&&!this.rs(this.qi,kl)){this.qi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=Ne(t,wi);return n.J().next(i=>{const s=this.ss(i,kl),o=i.filter(c=>s.indexOf(c)===-1);return A.forEach(o,c=>n.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ki)for(const t of e)this.Ki.removeItem(this._s(t.clientId))}}ji(){this.ki=this.Mi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Wi().then(()=>this.ns()).then(()=>this.ji()))}es(e){return!!e&&e.ownerId===this.clientId}Yi(e){return this.Oi?A.resolve(!0):_s(e).get(qr).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Dl)&&!this.us(t.ownerId)){if(this.es(t)&&this.networkEnabled)return!0;if(!this.es(t)){if(!t.allowTabSynchronization)throw new x(C.FAILED_PRECONDITION,xl);return!1}}return!(!this.networkEnabled||!this.inForeground)||aa(e).J().next(n=>this.ss(n,Dl).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&N(wn,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.li=!1,this.cs(),this.ki&&(this.ki.cancel(),this.ki=null),this.ls(),this.hs(),await this.Ui.runTransaction("shutdown","readwrite",[So,wi],e=>{const t=new eu(e,ct.ce);return this.Zi(t).next(()=>this.ts(t))}),this.Ui.close(),this.Ps()}ss(e,t){return e.filter(n=>this.rs(n.updateTimeMs,t)&&!this.us(n.clientId))}Ts(){return this.runTransaction("getActiveClients","readonly",e=>aa(e).J().next(t=>this.ss(t,kl).map(n=>n.clientId)))}get started(){return this.li}getGlobalsCache(){return this.hi}getMutationQueue(e,t){return Ac.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new DP(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return bc.wt(this.serializer,e)}getBundleCache(){return this.Ii}runTransaction(e,t,n){N(wn,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(l){return l===18?VR:l===17?Vy:l===16?NR:l===15?gh:l===14?Ny:l===13?xy:l===12?xR:l===11?Dy:void $(60245)}(this.Ni);let o;return this.Ui.runTransaction(e,i,s,c=>(o=new eu(c,this.ci?this.ci.next():ct.ce),t==="readwrite-primary"?this.Hi(o).next(l=>!!l||this.Yi(o)).next(l=>{if(!l)throw Ae(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)),new x(C.FAILED_PRECONDITION,Ey);return n(o)}).next(l=>this.Xi(o).next(()=>l)):this.Is(o).next(()=>n(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Is(e){return _s(e).get(qr).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Dl)&&!this.us(t.ownerId)&&!this.es(t)&&!(this.Oi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new x(C.FAILED_PRECONDITION,xl)})}Xi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return _s(e).put(qr,t)}static v(){return Bt.v()}Zi(e){const t=_s(e);return t.get(qr).next(n=>this.es(n)?(N(wn,"Releasing primary lease."),t.delete(qr)):A.resolve())}rs(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Ae(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Gi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Li=()=>{this.Mi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Wi()))},this.document.addEventListener("visibilitychange",this.Li),this.inForeground=this.document.visibilityState==="visible")}ls(){this.Li&&(this.document.removeEventListener("visibilitychange",this.Li),this.Li=null)}zi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Bi=()=>{this.cs();const t=/(?:Version|Mobile)\/1[456]/;Wg()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Mi.enterRestrictedMode(!0),this.Mi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Bi))}hs(){this.Bi&&(this.window.removeEventListener("pagehide",this.Bi),this.Bi=null)}us(e){var t;try{const n=((t=this.Ki)==null?void 0:t.getItem(this._s(e)))!==null;return N(wn,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return Ae(wn,"Failed to get zombied client id.",n),!1}}cs(){if(this.Ki)try{this.Ki.setItem(this._s(this.clientId),String(Date.now()))}catch(e){Ae("Failed to set zombie client id.",e)}}Ps(){if(this.Ki)try{this.Ki.removeItem(this._s(this.clientId))}catch{}}_s(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function _s(r){return Ne(r,So)}function aa(r){return Ne(r,wi)}function Vh(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class Oh{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Es=n,this.ds=i}static As(e,t){let n=H(),i=H();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Oh(e,t.fromCache,n,i)}}/**
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
 */class QP{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class K_{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return Wg()?8:Ty(_e())>0?6:4}()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ys(e,t).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.ws(e,t,i,n).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new QP;return this.Ss(e,t,o).next(c=>{if(s.result=c,this.Vs)return this.bs(e,t,o,c.size)})}).next(()=>s.result)}bs(e,t,n,i){return n.documentReadCount<this.fs?(Yr()<=J.DEBUG&&N("QueryEngine","SDK will not create cache indexes for query:",Jr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),A.resolve()):(Yr()<=J.DEBUG&&N("QueryEngine","Query:",Jr(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(Yr()<=J.DEBUG&&N("QueryEngine","The SDK decides to create cache indexes for query:",Jr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,rt(t))):A.resolve())}ys(e,t){if(Np(t))return A.resolve(null);let n=rt(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=Ba(t,null,"F"),n=rt(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const o=H(...s);return this.ps.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,n).next(l=>{const u=this.Ds(t,c);return this.Cs(t,u,o,l.readTime)?this.ys(e,Ba(t,null,"F")):this.vs(e,u,t,l)}))})))}ws(e,t,n,i){return Np(t)||i.isEqual(z.min())?A.resolve(null):this.ps.getDocuments(e,n).next(s=>{const o=this.Ds(t,s);return this.Cs(t,o,n,i)?A.resolve(null):(Yr()<=J.DEBUG&&N("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Jr(t)),this.vs(e,o,t,wy(i,gi)).next(c=>c))})}Ds(e,t){let n=new se(t_(e));return t.forEach((i,s)=>{Co(e,s)&&(n=n.add(s))}),n}Cs(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Ss(e,t,n){return Yr()<=J.DEBUG&&N("QueryEngine","Using full collection scan to execute query:",Jr(t)),this.ps.getDocumentsMatchingQuery(e,t,mt.min(),n)}vs(e,t,n,i){return this.ps.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
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
 */const Mh="LocalStore",YP=3e8;class JP{constructor(e,t,n,i){this.persistence=e,this.Fs=t,this.serializer=i,this.Ms=new le(G),this.xs=new on(s=>Tr(s),Ro),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(n)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new q_(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms))}}function j_(r,e,t,n){return new JP(r,e,t,n)}async function G_(r,e){const t=U(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.Bs(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const o=[],c=[];let l=H();for(const u of i){o.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}for(const u of s){c.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}return t.localDocuments.getDocuments(n,l).next(u=>({Ls:u,removedBatchIds:o,addedBatchIds:c}))})})}function XP(r,e){const t=U(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,u,d){const p=u.batch,g=p.keys();let I=A.resolve();return g.forEach(P=>{I=I.next(()=>d.getEntry(l,P)).next(D=>{const T=u.docVersions.get(P);q(T!==null,48541),D.version.compareTo(T)<0&&(p.applyToRemoteDocument(D,u),D.isValidDocument()&&(D.setReadTime(u.commitVersion),d.addEntry(D)))})}),I.next(()=>c.mutationQueue.removeMutationBatch(l,p))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(c){let l=H();for(let u=0;u<c.mutationResults.length;++u)c.mutationResults[u].transformResults.length>0&&(l=l.add(c.batch.mutations[u].key));return l}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function W_(r){const e=U(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t))}function ZP(r,e){const t=U(r),n=e.snapshotVersion;let i=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=t.Ns.newChangeBuffer({trackRemovals:!0});i=t.Ms;const c=[];e.targetChanges.forEach((d,p)=>{const g=i.get(p);if(!g)return;c.push(t.Pi.removeMatchingKeys(s,d.removedDocuments,p).next(()=>t.Pi.addMatchingKeys(s,d.addedDocuments,p)));let I=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?I=I.withResumeToken(ve.EMPTY_BYTE_STRING,z.min()).withLastLimboFreeSnapshotVersion(z.min()):d.resumeToken.approximateByteSize()>0&&(I=I.withResumeToken(d.resumeToken,n)),i=i.insert(p,I),function(D,T,V){return D.resumeToken.approximateByteSize()===0||T.snapshotVersion.toMicroseconds()-D.snapshotVersion.toMicroseconds()>=YP?!0:V.addedDocuments.size+V.modifiedDocuments.size+V.removedDocuments.size>0}(g,I,d)&&c.push(t.Pi.updateTargetData(s,I))});let l=ut(),u=H();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,d))}),c.push(H_(s,o,e.documentUpdates).next(d=>{l=d.ks,u=d.qs})),!n.isEqual(z.min())){const d=t.Pi.getLastRemoteSnapshotVersion(s).next(p=>t.Pi.setTargetsMetadata(s,s.currentSequenceNumber,n));c.push(d)}return A.waitFor(c).next(()=>o.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,l,u)).next(()=>l)}).then(s=>(t.Ms=i,s))}function H_(r,e,t){let n=H(),i=H();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let o=ut();return t.forEach((c,l)=>{const u=s.get(c);l.isFoundDocument()!==u.isFoundDocument()&&(i=i.add(c)),l.isNoDocument()&&l.version.isEqual(z.min())?(e.removeEntry(c,l.readTime),o=o.insert(c,l)):!u.isValidDocument()||l.version.compareTo(u.version)>0||l.version.compareTo(u.version)===0&&u.hasPendingWrites?(e.addEntry(l),o=o.insert(c,l)):N(Mh,"Ignoring outdated watch update for ",c,". Current version:",u.version," Watch version:",l.version)}),{ks:o,qs:i}})}function eC(r,e){const t=U(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=Pn),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function Si(r,e){const t=U(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Pi.getTargetData(n,e).next(s=>s?(i=s,A.resolve(i)):t.Pi.allocateTargetId(n).next(o=>(i=new Ht(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.Pi.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(n.targetId,n),t.xs.set(e,n.targetId)),n})}async function Ri(r,e,t){const n=U(r),i=n.Ms.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,o=>n.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!jn(o))throw o;N(Mh,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Ms=n.Ms.remove(e),n.xs.delete(i.target)}function ja(r,e,t){const n=U(r);let i=z.min(),s=H();return n.persistence.runTransaction("Execute query","readwrite",o=>function(l,u,d){const p=U(l),g=p.xs.get(d);return g!==void 0?A.resolve(p.Ms.get(g)):p.Pi.getTargetData(u,d)}(n,o,rt(e)).next(c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(o,c.targetId).next(l=>{s=l})}).next(()=>n.Fs.getDocumentsMatchingQuery(o,e,t?i:z.min(),t?s:H())).next(c=>(J_(n,e_(e),c),{documents:c,Qs:s})))}function Q_(r,e){const t=U(r),n=U(t.Pi),i=t.Ms.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.At(s,e).next(o=>o?o.target:null))}function Y_(r,e){const t=U(r),n=t.Os.get(e)||z.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.Ns.getAllFromCollectionGroup(i,e,wy(n,gi),Number.MAX_SAFE_INTEGER)).then(i=>(J_(t,e,i),i))}function J_(r,e,t){let n=r.Os.get(e)||z.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.Os.set(e,n)}async function tC(r,e,t,n){const i=U(r);let s=H(),o=ut();for(const u of t){const d=e.$s(u.metadata.name);u.document&&(s=s.add(d));const p=e.Us(u);p.setReadTime(e.Ks(u.metadata.readTime)),o=o.insert(d,p)}const c=i.Ns.newChangeBuffer({trackRemovals:!0}),l=await Si(i,function(d){return rt(Bi(X.fromString(`__bundle__/docs/${d}`)))}(n));return i.persistence.runTransaction("Apply bundle documents","readwrite",u=>H_(u,c,o).next(d=>(c.apply(u),d)).next(d=>i.Pi.removeMatchingKeysForTargetId(u,l.targetId).next(()=>i.Pi.addMatchingKeys(u,s,l.targetId)).next(()=>i.localDocuments.getLocalViewOfDocuments(u,d.ks,d.qs)).next(()=>d.ks)))}async function nC(r,e,t=H()){const n=await Si(r,rt(Ph(e.bundledQuery))),i=U(r);return i.persistence.runTransaction("Save named query","readwrite",s=>{const o=Se(e.readTime);if(n.snapshotVersion.compareTo(o)>=0)return i.Ii.saveNamedQuery(s,e);const c=n.withResumeToken(ve.EMPTY_BYTE_STRING,o);return i.Ms=i.Ms.insert(c.targetId,c),i.Pi.updateTargetData(s,c).next(()=>i.Pi.removeMatchingKeysForTargetId(s,n.targetId)).next(()=>i.Pi.addMatchingKeys(s,t,n.targetId)).next(()=>i.Ii.saveNamedQuery(s,e))})}/**
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
 */const X_="firestore_clients";function ug(r,e){return`${X_}_${r}_${e}`}const Z_="firestore_mutations";function hg(r,e,t){let n=`${Z_}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const ew="firestore_targets";function Nl(r,e){return`${ew}_${r}_${e}`}/**
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
 */const xt="SharedClientState";class Ga{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Ws(e,t,n){const i=JSON.parse(n);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new x(i.error.code,i.error.message))),o?new Ga(e,t,i.state,s):(Ae(xt,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class $s{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ws(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new x(n.error.code,n.error.message))),s?new $s(e,n.state,i):(Ae(xt,`Failed to parse target state for ID '${e}': ${t}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Wa{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ws(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=Ih();for(let o=0;i&&o<n.activeTargetIds.length;++o)i=by(n.activeTargetIds[o]),s=s.add(n.activeTargetIds[o]);return i?new Wa(e,s):(Ae(xt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Fh{constructor(e,t){this.clientId=e,this.onlineState=t}static Ws(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Fh(t.clientId,t.onlineState):(Ae(xt,`Failed to parse online state: ${e}`),null)}}class gu{constructor(){this.activeTargetIds=Ih()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Vl{constructor(e,t,n,i,s){this.window=e,this.Mi=t,this.persistenceKey=n,this.Js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Hs=this.Ys.bind(this),this.Zs=new le(G),this.started=!1,this.Xs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.eo=ug(this.persistenceKey,this.Js),this.no=function(l){return`firestore_sequence_number_${l}`}(this.persistenceKey),this.Zs=this.Zs.insert(this.Js,new gu),this.ro=new RegExp(`^${X_}_${o}_([^_]*)$`),this.io=new RegExp(`^${Z_}_${o}_(\\d+)(?:_(.*))?$`),this.so=new RegExp(`^${ew}_${o}_(\\d+)$`),this.oo=function(l){return`firestore_online_state_${l}`}(this.persistenceKey),this._o=function(l){return`firestore_bundle_loaded_v2_${l}`}(this.persistenceKey),this.window.addEventListener("storage",this.Hs)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ts();for(const n of e){if(n===this.Js)continue;const i=this.getItem(ug(this.persistenceKey,n));if(i){const s=Wa.Ws(n,i);s&&(this.Zs=this.Zs.insert(s.clientId,s))}}this.ao();const t=this.storage.getItem(this.oo);if(t){const n=this.uo(t);n&&this.co(n)}for(const n of this.Xs)this.Ys(n);this.Xs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.no,JSON.stringify(e))}getAllActiveQueryTargets(){return this.lo(this.Zs)}isActiveQueryTarget(e){let t=!1;return this.Zs.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.ho(e,"pending")}updateMutationState(e,t,n){this.ho(e,t,n),this.Po(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(Nl(this.persistenceKey,e));if(i){const s=$s.Ws(e,i);s&&(n=s.state)}}return t&&this.To.zs(e),this.ao(),n}removeLocalQueryTarget(e){this.To.js(e),this.ao()}isLocalQueryTarget(e){return this.To.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Nl(this.persistenceKey,e))}updateQueryState(e,t,n){this.Io(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Po(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Eo(e)}notifyBundleLoaded(e){this.Ao(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Hs),this.removeItem(this.eo),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return N(xt,"READ",e,t),t}setItem(e,t){N(xt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){N(xt,"REMOVE",e),this.storage.removeItem(e)}Ys(e){const t=e;if(t.storageArea===this.storage){if(N(xt,"EVENT",t.key,t.newValue),t.key===this.eo)return void Ae("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Mi.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.ro.test(t.key)){if(t.newValue==null){const n=this.Ro(t.key);return this.Vo(n,null)}{const n=this.mo(t.key,t.newValue);if(n)return this.Vo(n.clientId,n)}}else if(this.io.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(this.so.test(t.key)){if(t.newValue!==null){const n=this.yo(t.key,t.newValue);if(n)return this.wo(n)}}else if(t.key===this.oo){if(t.newValue!==null){const n=this.uo(t.newValue);if(n)return this.co(n)}}else if(t.key===this.no){const n=function(s){let o=ct.ce;if(s!=null)try{const c=JSON.parse(s);q(typeof c=="number",30636,{So:s}),o=c}catch(c){Ae(xt,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);n!==ct.ce&&this.sequenceNumberHandler(n)}else if(t.key===this._o){const n=this.bo(t.newValue);await Promise.all(n.map(i=>this.syncEngine.Do(i)))}}}else this.Xs.push(t)})}}get To(){return this.Zs.get(this.Js)}ao(){this.setItem(this.eo,this.To.Gs())}ho(e,t,n){const i=new Ga(this.currentUser,e,t,n),s=hg(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Gs())}Po(e){const t=hg(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Eo(e){const t={clientId:this.Js,onlineState:e};this.storage.setItem(this.oo,JSON.stringify(t))}Io(e,t,n){const i=Nl(this.persistenceKey,e),s=new $s(e,t,n);this.setItem(i,s.Gs())}Ao(e){const t=JSON.stringify(Array.from(e));this.setItem(this._o,t)}Ro(e){const t=this.ro.exec(e);return t?t[1]:null}mo(e,t){const n=this.Ro(e);return Wa.Ws(n,t)}fo(e,t){const n=this.io.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return Ga.Ws(new Me(s),i,t)}yo(e,t){const n=this.so.exec(e),i=Number(n[1]);return $s.Ws(i,t)}uo(e){return Fh.Ws(e)}bo(e){return JSON.parse(e)}async po(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Co(e.batchId,e.state,e.error);N(xt,`Ignoring mutation for non-active user ${e.user.uid}`)}wo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Vo(e,t){const n=t?this.Zs.insert(e,t):this.Zs.remove(e),i=this.lo(this.Zs),s=this.lo(n),o=[],c=[];return s.forEach(l=>{i.has(l)||o.push(l)}),i.forEach(l=>{s.has(l)||c.push(l)}),this.syncEngine.Fo(o,c).then(()=>{this.Zs=n})}co(e){this.Zs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}lo(e){let t=Ih();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class tw{constructor(){this.Mo=new gu,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,n){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new gu,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class rC{Oo(e){}shutdown(){}}/**
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
 */const dg="ConnectivityMonitor";class fg{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){N(dg,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){N(dg,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let ca=null;function mu(){return ca===null?ca=function(){return 268435456+Math.round(2147483648*Math.random())}():ca++,"0x"+ca.toString(16)}/**
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
 */const Ol="RestConnection",iC={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class sC{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===tu?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(e,t,n,i,s){const o=mu(),c=this.zo(e,t.toUriEncodedString());N(Ol,`Sending RPC '${e}' ${o}:`,c,n);const l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,i,s);const{host:u}=new URL(c),d=Vi(u);return this.Jo(e,c,l,n,d).then(p=>(N(Ol,`Received RPC '${e}' ${o}: `,p),p),p=>{throw jt(Ol,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",n),p})}Ho(e,t,n,i,s,o){return this.Go(e,t,n,i,s)}jo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Ui}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),n&&n.headers.forEach((i,s)=>e[s]=i)}zo(e,t){const n=iC[e];return`${this.Uo}/v1/${t}:${n}`}terminate(){}}/**
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
 */class oC{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
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
 */const je="WebChannelConnection";class aC extends sC{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,n,i,s){const o=mu();return new Promise((c,l)=>{const u=new cy;u.setWithCredentials(!0),u.listenOnce(ly.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case fa.NO_ERROR:const p=u.getResponseJson();N(je,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case fa.TIMEOUT:N(je,`RPC '${e}' ${o} timed out`),l(new x(C.DEADLINE_EXCEEDED,"Request time out"));break;case fa.HTTP_ERROR:const g=u.getStatus();if(N(je,`RPC '${e}' ${o} failed with status:`,g,"response text:",u.getResponseText()),g>0){let I=u.getResponseJson();Array.isArray(I)&&(I=I[0]);const P=I==null?void 0:I.error;if(P&&P.status&&P.message){const D=function(V){const M=V.toLowerCase().replace(/_/g,"-");return Object.values(C).indexOf(M)>=0?M:C.UNKNOWN}(P.status);l(new x(D,P.message))}else l(new x(C.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new x(C.UNAVAILABLE,"Connection failed."));break;default:$(9055,{l_:e,streamId:o,h_:u.getLastErrorCode(),P_:u.getLastError()})}}finally{N(je,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(i);N(je,`RPC '${e}' ${o} sending request:`,i),u.send(t,"POST",d,n,15)})}T_(e,t,n){const i=mu(),s=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=dy(),c=hy(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;const d=s.join("");N(je,`Creating RPC '${e}' stream ${i}: ${d}`,l);const p=o.createWebChannel(d,l);this.I_(p);let g=!1,I=!1;const P=new oC({Yo:T=>{I?N(je,`Not sending because RPC '${e}' stream ${i} is closed:`,T):(g||(N(je,`Opening RPC '${e}' stream ${i} transport.`),p.open(),g=!0),N(je,`RPC '${e}' stream ${i} sending:`,T),p.send(T))},Zo:()=>p.close()}),D=(T,V,M)=>{T.listen(V,B=>{try{M(B)}catch(j){setTimeout(()=>{throw j},0)}})};return D(p,Ts.EventType.OPEN,()=>{I||(N(je,`RPC '${e}' stream ${i} transport opened.`),P.o_())}),D(p,Ts.EventType.CLOSE,()=>{I||(I=!0,N(je,`RPC '${e}' stream ${i} transport closed`),P.a_(),this.E_(p))}),D(p,Ts.EventType.ERROR,T=>{I||(I=!0,jt(je,`RPC '${e}' stream ${i} transport errored. Name:`,T.name,"Message:",T.message),P.a_(new x(C.UNAVAILABLE,"The operation could not be completed")))}),D(p,Ts.EventType.MESSAGE,T=>{var V;if(!I){const M=T.data[0];q(!!M,16349);const B=M,j=(B==null?void 0:B.error)||((V=B[0])==null?void 0:V.error);if(j){N(je,`RPC '${e}' stream ${i} received error:`,j);const Q=j.status;let W=function(w){const b=Pe[w];if(b!==void 0)return p_(b)}(Q),E=j.message;W===void 0&&(W=C.INTERNAL,E="Unknown error status: "+Q+" with message "+j.message),I=!0,P.a_(new x(W,E)),p.close()}else N(je,`RPC '${e}' stream ${i} received:`,M),P.u_(M)}}),D(c,uy.STAT_EVENT,T=>{T.stat===Hl.PROXY?N(je,`RPC '${e}' stream ${i} detected buffering proxy`):T.stat===Hl.NOPROXY&&N(je,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{P.__()},0),P}terminate(){this.c_.forEach(e=>e.close()),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter(t=>t===e)}}/**
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
 */function nw(){return typeof window<"u"?window:null}function Ta(){return typeof document<"u"?document:null}/**
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
 */function No(r){return new dP(r,!0)}/**
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
 */class Lh{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Mi=e,this.timerId=t,this.d_=n,this.A_=i,this.R_=s,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-n);i>0&&N("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
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
 */const pg="PersistentStream";class rw{constructor(e,t,n,i,s,o,c,l){this.Mi=e,this.S_=n,this.b_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Lh(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===C.RESOURCE_EXHAUSTED?(Ae(t.toString()),Ae("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===C.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.D_===t&&this.G_(n,i)},n=>{e(()=>{const i=new x(C.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)})})}G_(e,t){const n=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{n(()=>this.listener.Xo())}),this.stream.t_(()=>{n(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()))}),this.stream.r_(i=>{n(()=>this.z_(i))}),this.stream.onMessage(i=>{n(()=>++this.F_==1?this.J_(i):this.onNext(i))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return N(pg,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():(N(pg,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class cC extends rw{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=gP(this.serializer,e),n=function(s){if(!("targetChange"in s))return z.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?z.min():o.readTime?Se(o.readTime):z.min()}(e);return this.listener.H_(t,n)}Y_(e){const t={};t.database=uu(this.serializer),t.addTarget=function(s,o){let c;const l=o.target;if(c=La(l)?{documents:b_(s,l)}:{query:A_(s,l).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=__(s,o.resumeToken);const u=cu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}else if(o.snapshotVersion.compareTo(z.min())>0){c.readTime=Ai(s,o.snapshotVersion.toTimestamp());const u=cu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}return c}(this.serializer,e);const n=yP(this.serializer,e);n&&(t.labels=n),this.q_(t)}Z_(e){const t={};t.database=uu(this.serializer),t.removeTarget=e,this.q_(t)}}class lC extends rw{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return q(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,q(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){q(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=mP(e.writeResults,e.commitTime),n=Se(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=uu(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>oo(this.serializer,n))};this.q_(t)}}/**
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
 */class uC{}class hC extends uC{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new x(C.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Go(e,lu(t,n),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new x(C.UNKNOWN,s.toString())})}Ho(e,t,n,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.Ho(e,lu(t,n),i,o,c,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new x(C.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}class dC{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Ae(t),this.aa=!1):N("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const Cr="RemoteStore";class fC{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=s,this.Aa.Oo(o=>{n.enqueueAndForget(async()=>{Wn(this)&&(N(Cr,"Restarting streams for network reachability change."),await async function(l){const u=U(l);u.Ea.add(4),await zi(u),u.Ra.set("Unknown"),u.Ea.delete(4),await Vo(u)}(this))})}),this.Ra=new dC(n,i)}}async function Vo(r){if(Wn(r))for(const e of r.da)await e(!0)}async function zi(r){for(const e of r.da)await e(!1)}function Rc(r,e){const t=U(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),$h(t)?Bh(t):ji(t).O_()&&Uh(t,e))}function Pi(r,e){const t=U(r),n=ji(t);t.Ia.delete(e),n.O_()&&iw(t,e),t.Ia.size===0&&(n.O_()?n.L_():Wn(t)&&t.Ra.set("Unknown"))}function Uh(r,e){if(r.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(z.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}ji(r).Y_(e)}function iw(r,e){r.Va.Ue(e),ji(r).Z_(e)}function Bh(r){r.Va=new cP({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),ji(r).start(),r.Ra.ua()}function $h(r){return Wn(r)&&!ji(r).x_()&&r.Ia.size>0}function Wn(r){return U(r).Ea.size===0}function sw(r){r.Va=void 0}async function pC(r){r.Ra.set("Online")}async function gC(r){r.Ia.forEach((e,t)=>{Uh(r,e)})}async function mC(r,e){sw(r),$h(r)?(r.Ra.ha(e),Bh(r)):r.Ra.set("Unknown")}async function yC(r,e,t){if(r.Ra.set("Online"),e instanceof y_&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.Va.removeTarget(c))}(r,e)}catch(n){N(Cr,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await Ha(r,n)}else if(e instanceof Ea?r.Va.Ze(e):e instanceof m_?r.Va.st(e):r.Va.tt(e),!t.isEqual(z.min()))try{const n=await W_(r.localStore);t.compareTo(n)>=0&&await function(s,o){const c=s.Va.Tt(o);return c.targetChanges.forEach((l,u)=>{if(l.resumeToken.approximateByteSize()>0){const d=s.Ia.get(u);d&&s.Ia.set(u,d.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,u)=>{const d=s.Ia.get(l);if(!d)return;s.Ia.set(l,d.withResumeToken(ve.EMPTY_BYTE_STRING,d.snapshotVersion)),iw(s,l);const p=new Ht(d.target,l,u,d.sequenceNumber);Uh(s,p)}),s.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){N(Cr,"Failed to raise snapshot:",n),await Ha(r,n)}}async function Ha(r,e,t){if(!jn(e))throw e;r.Ea.add(1),await zi(r),r.Ra.set("Offline"),t||(t=()=>W_(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{N(Cr,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await Vo(r)})}function ow(r,e){return e().catch(t=>Ha(r,t,e))}async function Ki(r){const e=U(r),t=Un(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Pn;for(;_C(e);)try{const i=await eC(e.localStore,n);if(i===null){e.Ta.length===0&&t.L_();break}n=i.batchId,wC(e,i)}catch(i){await Ha(e,i)}aw(e)&&cw(e)}function _C(r){return Wn(r)&&r.Ta.length<10}function wC(r,e){r.Ta.push(e);const t=Un(r);t.O_()&&t.X_&&t.ea(e.mutations)}function aw(r){return Wn(r)&&!Un(r).x_()&&r.Ta.length>0}function cw(r){Un(r).start()}async function IC(r){Un(r).ra()}async function EC(r){const e=Un(r);for(const t of r.Ta)e.ea(t.mutations)}async function vC(r,e,t){const n=r.Ta.shift(),i=bh.from(n,e,t);await ow(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await Ki(r)}async function TC(r,e){e&&Un(r).X_&&await async function(n,i){if(function(o){return f_(o)&&o!==C.ABORTED}(i.code)){const s=n.Ta.shift();Un(n).B_(),await ow(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await Ki(n)}}(r,e),aw(r)&&cw(r)}async function gg(r,e){const t=U(r);t.asyncQueue.verifyOperationInProgress(),N(Cr,"RemoteStore received new credentials");const n=Wn(t);t.Ea.add(3),await zi(t),n&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Vo(t)}async function yu(r,e){const t=U(r);e?(t.Ea.delete(2),await Vo(t)):e||(t.Ea.add(2),await zi(t),t.Ra.set("Unknown"))}function ji(r){return r.ma||(r.ma=function(t,n,i){const s=U(t);return s.sa(),new cC(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:pC.bind(null,r),t_:gC.bind(null,r),r_:mC.bind(null,r),H_:yC.bind(null,r)}),r.da.push(async e=>{e?(r.ma.B_(),$h(r)?Bh(r):r.Ra.set("Unknown")):(await r.ma.stop(),sw(r))})),r.ma}function Un(r){return r.fa||(r.fa=function(t,n,i){const s=U(t);return s.sa(),new lC(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:IC.bind(null,r),r_:TC.bind(null,r),ta:EC.bind(null,r),na:vC.bind(null,r)}),r.da.push(async e=>{e?(r.fa.B_(),await Ki(r)):(await r.fa.stop(),r.Ta.length>0&&(N(Cr,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
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
 */class qh{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new qe,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new qh(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new x(C.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Gi(r,e){if(Ae("AsyncQueue",`${e}: ${r}`),jn(r))return new x(C.UNAVAILABLE,`${e}: ${r}`);throw r}/**
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
 */class li{static emptySet(e){return new li(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||F.comparator(t.key,n.key):(t,n)=>F.comparator(t.key,n.key),this.keyedMap=bs(),this.sortedSet=new le(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof li)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
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
 */class mg{constructor(){this.ga=new le(F.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):$(63341,{Rt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class Ci{constructor(e,t,n,i,s,o,c,l,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new Ci(e,t,li.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Po(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
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
 */class bC{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some(e=>e.Da())}}class AC{constructor(){this.queries=yg(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const i=U(t),s=i.queries;i.queries=yg(),s.forEach((o,c)=>{for(const l of c.Sa)l.onError(n)})})(this,new x(C.ABORTED,"Firestore shutting down"))}}function yg(){return new on(r=>Zy(r),Po)}async function zh(r,e){const t=U(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.ba()&&e.Da()&&(n=2):(s=new bC,n=e.Da()?0:1);try{switch(n){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Gi(o,`Initialization of query '${Jr(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.Sa.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&jh(t)}async function Kh(r,e){const t=U(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.Sa.indexOf(e);o>=0&&(s.Sa.splice(o,1),s.Sa.length===0?i=e.Da()?0:1:!s.ba()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function SC(r,e){const t=U(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.Sa)c.Fa(i)&&(n=!0);o.wa=i}}n&&jh(t)}function RC(r,e,t){const n=U(r),i=n.queries.get(e);if(i)for(const s of i.Sa)s.onError(t);n.queries.delete(e)}function jh(r){r.Ca.forEach(e=>{e.next()})}var _u,_g;(_g=_u||(_u={})).Ma="default",_g.Cache="cache";class Gh{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new Ci(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.qa||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=Ci.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==_u.Cache}}/**
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
 */class PC{constructor(e,t){this.Qa=e,this.byteLength=t}$a(){return"metadata"in this.Qa}}/**
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
 */class wg{constructor(e){this.serializer=e}$s(e){return $t(this.serializer,e)}Us(e){return e.metadata.exists?T_(this.serializer,e.document,!1):he.newNoDocument(this.$s(e.metadata.name),this.Ks(e.metadata.readTime))}Ks(e){return Se(e)}}class CC{constructor(e,t){this.Ua=e,this.serializer=t,this.Ka=[],this.Wa=[],this.collectionGroups=new Set,this.progress=lw(e)}get queries(){return this.Ka}get documents(){return this.Wa}Ga(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.Qa.namedQuery)this.Ka.push(e.Qa.namedQuery);else if(e.Qa.documentMetadata){this.Wa.push({metadata:e.Qa.documentMetadata}),e.Qa.documentMetadata.exists||++t;const n=X.fromString(e.Qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else e.Qa.document&&(this.Wa[this.Wa.length-1].document=e.Qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,{...this.progress}):null}za(e){const t=new Map,n=new wg(this.serializer);for(const i of e)if(i.metadata.queries){const s=n.$s(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||H()).add(s);t.set(o,c)}}return t}async ja(e){const t=await tC(e,new wg(this.serializer),this.Wa,this.Ua.id),n=this.za(this.documents);for(const i of this.Ka)await nC(e,i,n.get(i.name));return this.progress.taskState="Success",{progress:this.progress,Ja:this.collectionGroups,Ha:t}}}function lw(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
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
 */class uw{constructor(e){this.key=e}}class hw{constructor(e){this.key=e}}class dw{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=H(),this.mutatedKeys=H(),this.eu=t_(e),this.tu=new li(this.eu)}get nu(){return this.Ya}ru(e,t){const n=t?t.iu:new mg,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const l=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,u=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((d,p)=>{const g=i.get(d),I=Co(this.query,p)?p:null,P=!!g&&this.mutatedKeys.has(g.key),D=!!I&&(I.hasLocalMutations||this.mutatedKeys.has(I.key)&&I.hasCommittedMutations);let T=!1;g&&I?g.data.isEqual(I.data)?P!==D&&(n.track({type:3,doc:I}),T=!0):this.su(g,I)||(n.track({type:2,doc:I}),T=!0,(l&&this.eu(I,l)>0||u&&this.eu(I,u)<0)&&(c=!0)):!g&&I?(n.track({type:0,doc:I}),T=!0):g&&!I&&(n.track({type:1,doc:g}),T=!0,(l||u)&&(c=!0)),T&&(I?(o=o.add(I),s=D?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),n.track({type:1,doc:d})}return{tu:o,iu:n,Cs:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((d,p)=>function(I,P){const D=T=>{switch(T){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return $(20277,{Rt:T})}};return D(I)-D(P)}(d.type,p.type)||this.eu(d.doc,p.doc)),this.ou(n),i=i??!1;const c=t&&!i?this._u():[],l=this.Xa.size===0&&this.current&&!i?1:0,u=l!==this.Za;return this.Za=l,o.length!==0||u?{snapshot:new Ci(this.query,e.tu,s,o,e.mutatedKeys,l===0,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new mg,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=H(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))});const t=[];return e.forEach(n=>{this.Xa.has(n)||t.push(new hw(n))}),this.Xa.forEach(n=>{e.has(n)||t.push(new uw(n))}),t}cu(e){this.Ya=e.Qs,this.Xa=H();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return Ci.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const Hn="SyncEngine";class kC{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class DC{constructor(e){this.key=e,this.hu=!1}}class xC{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new on(c=>Zy(c),Po),this.Iu=new Map,this.Eu=new Set,this.du=new le(F.comparator),this.Au=new Map,this.Ru=new Dh,this.Vu={},this.mu=new Map,this.fu=Pr.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function NC(r,e,t=!0){const n=Pc(r);let i;const s=n.Tu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await fw(n,e,t,!0),i}async function VC(r,e){const t=Pc(r);await fw(t,e,!0,!1)}async function fw(r,e,t,n){const i=await Si(r.localStore,rt(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await Wh(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&Rc(r.remoteStore,i),c}async function Wh(r,e,t,n,i){r.pu=(p,g,I)=>async function(D,T,V,M){let B=T.view.ru(V);B.Cs&&(B=await ja(D.localStore,T.query,!1).then(({documents:E})=>T.view.ru(E,B)));const j=M&&M.targetChanges.get(T.targetId),Q=M&&M.targetMismatches.get(T.targetId)!=null,W=T.view.applyChanges(B,D.isPrimaryClient,j,Q);return wu(D,T.targetId,W.au),W.snapshot}(r,p,g,I);const s=await ja(r.localStore,e,!0),o=new dw(e,s.Qs),c=o.ru(s.documents),l=xo.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),u=o.applyChanges(c,r.isPrimaryClient,l);wu(r,t,u.au);const d=new kC(e,t,o);return r.Tu.set(e,d),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),u.snapshot}async function OC(r,e,t){const n=U(r),i=n.Tu.get(e),s=n.Iu.get(i.targetId);if(s.length>1)return n.Iu.set(i.targetId,s.filter(o=>!Po(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await Ri(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&Pi(n.remoteStore,i.targetId),ki(n,i.targetId)}).catch(Kn)):(ki(n,i.targetId),await Ri(n.localStore,i.targetId,!0))}async function MC(r,e){const t=U(r),n=t.Tu.get(e),i=t.Iu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Pi(t.remoteStore,n.targetId))}async function FC(r,e,t){const n=Jh(r);try{const i=await function(o,c){const l=U(o),u=re.now(),d=c.reduce((I,P)=>I.add(P.key),H());let p,g;return l.persistence.runTransaction("Locally write mutations","readwrite",I=>{let P=ut(),D=H();return l.Ns.getEntries(I,d).next(T=>{P=T,P.forEach((V,M)=>{M.isValidDocument()||(D=D.add(V))})}).next(()=>l.localDocuments.getOverlayedDocuments(I,P)).next(T=>{p=T;const V=[];for(const M of c){const B=sP(M,p.get(M.key).overlayedDocument);B!=null&&V.push(new an(M.key,B,Ky(B.value.mapValue),ye.exists(!0)))}return l.mutationQueue.addMutationBatch(I,u,V,c)}).next(T=>{g=T;const V=T.applyToLocalDocumentSet(p,D);return l.documentOverlayCache.saveOverlays(I,T.batchId,V)})}).then(()=>({batchId:g.batchId,changes:r_(p)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(o,c,l){let u=o.Vu[o.currentUser.toKey()];u||(u=new le(G)),u=u.insert(c,l),o.Vu[o.currentUser.toKey()]=u}(n,i.batchId,t),await cn(n,i.changes),await Ki(n.remoteStore)}catch(i){const s=Gi(i,"Failed to persist write");t.reject(s)}}async function pw(r,e){const t=U(r);try{const n=await ZP(t.localStore,e);e.targetChanges.forEach((i,s)=>{const o=t.Au.get(s);o&&(q(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?q(o.hu,14607):i.removedDocuments.size>0&&(q(o.hu,42227),o.hu=!1))}),await cn(t,n,e)}catch(n){await Kn(n)}}function Ig(r,e,t){const n=U(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Tu.forEach((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)}),function(o,c){const l=U(o);l.onlineState=c;let u=!1;l.queries.forEach((d,p)=>{for(const g of p.Sa)g.va(c)&&(u=!0)}),u&&jh(l)}(n.eventManager,e),i.length&&n.Pu.H_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function LC(r,e,t){const n=U(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Au.get(e),s=i&&i.key;if(s){let o=new le(F.comparator);o=o.insert(s,he.newNoDocument(s,z.min()));const c=H().add(s),l=new Do(z.min(),new Map,new le(G),o,c);await pw(n,l),n.du=n.du.remove(s),n.Au.delete(e),Yh(n)}else await Ri(n.localStore,e,!1).then(()=>ki(n,e,t)).catch(Kn)}async function UC(r,e){const t=U(r),n=e.batch.batchId;try{const i=await XP(t.localStore,e);Qh(t,n,null),Hh(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await cn(t,i)}catch(i){await Kn(i)}}async function BC(r,e,t){const n=U(r);try{const i=await function(o,c){const l=U(o);return l.persistence.runTransaction("Reject batch","readwrite-primary",u=>{let d;return l.mutationQueue.lookupMutationBatch(u,c).next(p=>(q(p!==null,37113),d=p.keys(),l.mutationQueue.removeMutationBatch(u,p))).next(()=>l.mutationQueue.performConsistencyCheck(u)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(u,d,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(u,d)).next(()=>l.localDocuments.getDocuments(u,d))})}(n.localStore,e);Qh(n,e,t),Hh(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await cn(n,i)}catch(i){await Kn(i)}}async function $C(r,e){const t=U(r);Wn(t.remoteStore)||N(Hn,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const c=U(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",l=>c.mutationQueue.getHighestUnacknowledgedBatchId(l))}(t.localStore);if(n===Pn)return void e.resolve();const i=t.mu.get(n)||[];i.push(e),t.mu.set(n,i)}catch(n){const i=Gi(n,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function Hh(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Qh(r,e,t){const n=U(r);let i=n.Vu[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Vu[n.currentUser.toKey()]=i}}function ki(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Ru.jr(e).forEach(n=>{r.Ru.containsKey(n)||gw(r,n)})}function gw(r,e){r.Eu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(Pi(r.remoteStore,t),r.du=r.du.remove(e),r.Au.delete(t),Yh(r))}function wu(r,e,t){for(const n of t)n instanceof uw?(r.Ru.addReference(n.key,e),qC(r,n)):n instanceof hw?(N(Hn,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,e),r.Ru.containsKey(n.key)||gw(r,n.key)):$(19791,{wu:n})}function qC(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Eu.has(n)||(N(Hn,"New document in limbo: "+t),r.Eu.add(n),Yh(r))}function Yh(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new F(X.fromString(e)),n=r.fu.next();r.Au.set(n,new DC(t)),r.du=r.du.insert(t,n),Rc(r.remoteStore,new Ht(rt(Bi(t.path)),n,"TargetPurposeLimboResolution",ct.ce))}}async function cn(r,e,t){const n=U(r),i=[],s=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((c,l)=>{o.push(n.pu(l,e,t).then(u=>{var d;if((u||t)&&n.isPrimaryClient){const p=u?!u.fromCache:(d=t==null?void 0:t.targetChanges.get(l.targetId))==null?void 0:d.current;n.sharedClientState.updateQueryState(l.targetId,p?"current":"not-current")}if(u){i.push(u);const p=Oh.As(l.targetId,u);s.push(p)}}))}),await Promise.all(o),n.Pu.H_(i),await async function(l,u){const d=U(l);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(u,g=>A.forEach(g.Es,I=>d.persistence.referenceDelegate.addReference(p,g.targetId,I)).next(()=>A.forEach(g.ds,I=>d.persistence.referenceDelegate.removeReference(p,g.targetId,I)))))}catch(p){if(!jn(p))throw p;N(Mh,"Failed to update sequence numbers: "+p)}for(const p of u){const g=p.targetId;if(!p.fromCache){const I=d.Ms.get(g),P=I.snapshotVersion,D=I.withLastLimboFreeSnapshotVersion(P);d.Ms=d.Ms.insert(g,D)}}}(n.localStore,s))}async function zC(r,e){const t=U(r);if(!t.currentUser.isEqual(e)){N(Hn,"User change. New user:",e.toKey());const n=await G_(t.localStore,e);t.currentUser=e,function(s,o){s.mu.forEach(c=>{c.forEach(l=>{l.reject(new x(C.CANCELLED,o))})}),s.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await cn(t,n.Ls)}}function KC(r,e){const t=U(r),n=t.Au.get(e);if(n&&n.hu)return H().add(n.key);{let i=H();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function jC(r,e){const t=U(r),n=await ja(t.localStore,e.query,!0),i=e.view.cu(n);return t.isPrimaryClient&&wu(t,e.targetId,i.au),i}async function GC(r,e){const t=U(r);return Y_(t.localStore,e).then(n=>cn(t,n))}async function WC(r,e,t,n){const i=U(r),s=await function(c,l){const u=U(c),d=U(u.mutationQueue);return u.persistence.runTransaction("Lookup mutation documents","readonly",p=>d.er(p,l).next(g=>g?u.localDocuments.getDocuments(p,g):A.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await Ki(i.remoteStore):t==="acknowledged"||t==="rejected"?(Qh(i,e,n||null),Hh(i,e),function(c,l){U(U(c).mutationQueue).ir(l)}(i.localStore,e)):$(6720,"Unknown batchState",{Su:t}),await cn(i,s)):N(Hn,"Cannot apply mutation batch with id: "+e)}async function HC(r,e){const t=U(r);if(Pc(t),Jh(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await Eg(t,n.toArray());t.gu=!0,await yu(t.remoteStore,!0);for(const s of i)Rc(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const n=[];let i=Promise.resolve();t.Iu.forEach((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):i=i.then(()=>(ki(t,o),Ri(t.localStore,o,!0))),Pi(t.remoteStore,o)}),await i,await Eg(t,n),function(o){const c=U(o);c.Au.forEach((l,u)=>{Pi(c.remoteStore,u)}),c.Ru.Jr(),c.Au=new Map,c.du=new le(F.comparator)}(t),t.gu=!1,await yu(t.remoteStore,!1)}}async function Eg(r,e,t){const n=U(r),i=[],s=[];for(const o of e){let c;const l=n.Iu.get(o);if(l&&l.length!==0){c=await Si(n.localStore,rt(l[0]));for(const u of l){const d=n.Tu.get(u),p=await jC(n,d);p.snapshot&&s.push(p.snapshot)}}else{const u=await Q_(n.localStore,o);c=await Si(n.localStore,u),await Wh(n,mw(u),o,!1,c.resumeToken)}i.push(c)}return n.Pu.H_(s),i}function mw(r){return Xy(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function QC(r){return function(t){return U(U(t).persistence).Ts()}(U(r).localStore)}async function YC(r,e,t,n){const i=U(r);if(i.gu)return void N(Hn,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await Y_(i.localStore,e_(s[0])),c=Do.createSynthesizedRemoteEventForCurrentChange(e,t==="current",ve.EMPTY_BYTE_STRING);await cn(i,o,c);break}case"rejected":await Ri(i.localStore,e,!0),ki(i,e,n);break;default:$(64155,t)}}async function JC(r,e,t){const n=Pc(r);if(n.gu){for(const i of e){if(n.Iu.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){N(Hn,"Adding an already active target "+i);continue}const s=await Q_(n.localStore,i),o=await Si(n.localStore,s);await Wh(n,mw(s),o.targetId,!1,o.resumeToken),Rc(n.remoteStore,o)}for(const i of t)n.Iu.has(i)&&await Ri(n.localStore,i,!1).then(()=>{Pi(n.remoteStore,i),ki(n,i)}).catch(Kn)}}function Pc(r){const e=U(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=pw.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=KC.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=LC.bind(null,e),e.Pu.H_=SC.bind(null,e.eventManager),e.Pu.yu=RC.bind(null,e.eventManager),e}function Jh(r){const e=U(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=UC.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=BC.bind(null,e),e}function XC(r,e,t){const n=U(r);(async function(s,o,c){try{const l=await o.getMetadata();if(await function(I,P){const D=U(I),T=Se(P.createTime);return D.persistence.runTransaction("hasNewerBundle","readonly",V=>D.Ii.getBundleMetadata(V,P.id)).then(V=>!!V&&V.createTime.compareTo(T)>=0)}(s.localStore,l))return await o.close(),c._completeWith(function(I){return{taskState:"Success",documentsLoaded:I.totalDocuments,bytesLoaded:I.totalBytes,totalDocuments:I.totalDocuments,totalBytes:I.totalBytes}}(l)),Promise.resolve(new Set);c._updateProgress(lw(l));const u=new CC(l,o.serializer);let d=await o.bu();for(;d;){const g=await u.Ga(d);g&&c._updateProgress(g),d=await o.bu()}const p=await u.ja(s.localStore);return await cn(s,p.Ha,void 0),await function(I,P){const D=U(I);return D.persistence.runTransaction("Save bundle","readwrite",T=>D.Ii.saveBundleMetadata(T,P))}(s.localStore,l),c._completeWith(p.progress),Promise.resolve(p.Ja)}catch(l){return jt(Hn,`Loading bundle failed with ${l}`),c._failWith(l),Promise.resolve(new Set)}})(n,e,t).then(i=>{n.sharedClientState.notifyBundleLoaded(i)})}class ao{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=No(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return j_(this.persistence,new K_,e.initialUser,this.serializer)}Cu(e){return new xh(Sc.mi,this.serializer)}Du(e){return new tw}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}ao.provider={build:()=>new ao};class ZC extends ao{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){q(this.persistence.referenceDelegate instanceof Ka,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new L_(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?Ge.withCacheSize(this.cacheSizeBytes):Ge.DEFAULT;return new xh(n=>Ka.mi(n,t),this.serializer)}}class yw extends ao{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Jh(this.xu.syncEngine),await Ki(this.xu.remoteStore),await this.persistence.Ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return j_(this.persistence,new K_,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new L_(n,e.asyncQueue,t)}Mu(e,t){const n=new cR(t,this.persistence);return new aR(e.asyncQueue,n)}Cu(e){const t=Vh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Ge.withCacheSize(this.cacheSizeBytes):Ge.DEFAULT;return new Nh(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,nw(),Ta(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new tw}}class ek extends yw{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Vl&&(this.sharedClientState.syncEngine={Co:WC.bind(null,t),vo:YC.bind(null,t),Fo:JC.bind(null,t),Ts:QC.bind(null,t),Do:GC.bind(null,t)},await this.sharedClientState.start()),await this.persistence.Ji(async n=>{await HC(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=nw();if(!Vl.v(t))throw new x(C.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Vh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Vl(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class co{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Ig(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=zC.bind(null,this.syncEngine),await yu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new AC}()}createDatastore(e){const t=No(e.databaseInfo.databaseId),n=function(s){return new aC(s)}(e.databaseInfo);return function(s,o,c,l){return new hC(s,o,c,l)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,o,c){return new fC(n,i,s,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>Ig(this.syncEngine,t,0),function(){return fg.v()?new fg:new rC}())}createSyncEngine(e,t){return function(i,s,o,c,l,u,d){const p=new xC(i,s,o,c,l,u);return d&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=U(i);N(Cr,"RemoteStore shutting down."),s.Ea.add(5),await zi(s),s.Aa.shutdown(),s.Ra.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}co.provider={build:()=>new co};function vg(r,e=10240){let t=0;return{async read(){if(t<r.byteLength){const n={value:r.slice(t,t+e),done:!1};return t+=e,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
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
 */class Cc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Ae("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
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
 */class tk{constructor(e,t){this.Bu=e,this.serializer=t,this.metadata=new qe,this.buffer=new Uint8Array,this.Lu=function(){return new TextDecoder("utf-8")}(),this.ku().then(n=>{n&&n.$a()?this.metadata.resolve(n.Qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n==null?void 0:n.Qa)}`))},n=>this.metadata.reject(n))}close(){return this.Bu.cancel()}async getMetadata(){return this.metadata.promise}async bu(){return await this.getMetadata(),this.ku()}async ku(){const e=await this.qu();if(e===null)return null;const t=this.Lu.decode(e),n=Number(t);isNaN(n)&&this.Qu(`length string (${t}) is not valid number`);const i=await this.$u(n);return new PC(JSON.parse(i),e.length+n)}Uu(){return this.buffer.findIndex(e=>e===123)}async qu(){for(;this.Uu()<0&&!await this.Ku(););if(this.buffer.length===0)return null;const e=this.Uu();e<0&&this.Qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async $u(e){for(;this.buffer.length<e;)await this.Ku()&&this.Qu("Reached the end of bundle when more is expected.");const t=this.Lu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}Qu(e){throw this.Bu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Ku(){const e=await this.Bu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
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
 */class nk{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new x(C.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(i,s){const o=U(i),c={documents:s.map(p=>so(o.serializer,p))},l=await o.Ho("BatchGetDocuments",o.serializer.databaseId,X.emptyPath(),c,s.length),u=new Map;l.forEach(p=>{const g=pP(o.serializer,p);u.set(g.key.toString(),g)});const d=[];return s.forEach(p=>{const g=u.get(p.toString());q(!!g,55234,{key:p}),d.push(g)}),d}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new qi(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const i=F.fromPath(n);this.mutations.push(new vh(i,this.precondition(i)))}),await async function(n,i){const s=U(n),o={writes:i.map(c=>oo(s.serializer,c))};await s.Go("Commit",s.serializer.databaseId,X.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw $(50498,{Gu:e.constructor.name});t=z.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new x(C.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(z.min())?ye.exists(!1):ye.updateTime(t):ye.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(z.min()))throw new x(C.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ye.updateTime(t)}return ye.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
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
 */class rk{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.zu=n.maxAttempts,this.M_=new Lh(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Ju()}Ju(){this.M_.p_(async()=>{const e=new nk(this.datastore),t=this.Hu(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(i=>{this.Yu(i)}))}).catch(n=>{this.Yu(n)})})}Hu(e){try{const t=this.updateFunction(e);return!Ao(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e)}Zu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!f_(t)}return!1}}/**
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
 */const Bn="FirestoreClient";class ik{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=Me.UNAUTHENTICATED,this.clientId=ch.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async o=>{N(Bn,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(N(Bn,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new qe;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Gi(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function Ml(r,e){r.asyncQueue.verifyOperationInProgress(),N(Bn,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await G_(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function Tg(r,e){r.asyncQueue.verifyOperationInProgress();const t=await Xh(r);N(Bn,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>gg(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>gg(e.remoteStore,i)),r._onlineComponents=e}async function Xh(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){N(Bn,"Using user provided OfflineComponentProvider");try{await Ml(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===C.FAILED_PRECONDITION||i.code===C.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;jt("Error using user provided cache. Falling back to memory cache: "+t),await Ml(r,new ao)}}else N(Bn,"Using default OfflineComponentProvider"),await Ml(r,new ZC(void 0));return r._offlineComponents}async function kc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(N(Bn,"Using user provided OnlineComponentProvider"),await Tg(r,r._uninitializedComponentsProvider._online)):(N(Bn,"Using default OnlineComponentProvider"),await Tg(r,new co))),r._onlineComponents}function _w(r){return Xh(r).then(e=>e.persistence)}function Zh(r){return Xh(r).then(e=>e.localStore)}function ww(r){return kc(r).then(e=>e.remoteStore)}function ed(r){return kc(r).then(e=>e.syncEngine)}function sk(r){return kc(r).then(e=>e.datastore)}async function Di(r){const e=await kc(r),t=e.eventManager;return t.onListen=NC.bind(null,e.syncEngine),t.onUnlisten=OC.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=VC.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=MC.bind(null,e.syncEngine),t}function ok(r){return r.asyncQueue.enqueue(async()=>{const e=await _w(r),t=await ww(r);return e.setNetworkEnabled(!0),function(i){const s=U(i);return s.Ea.delete(0),Vo(s)}(t)})}function ak(r){return r.asyncQueue.enqueue(async()=>{const e=await _w(r),t=await ww(r);return e.setNetworkEnabled(!1),async function(i){const s=U(i);s.Ea.add(0),await zi(s),s.Ra.set("Offline")}(t)})}function ck(r,e){const t=new qe;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await function(u,d){const p=U(u);return p.persistence.runTransaction("read document","readonly",g=>p.localDocuments.getDocument(g,d))}(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new x(C.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const l=Gi(c,`Failed to get document '${s} from cache`);o.reject(l)}}(await Zh(r),e,t)),t.promise}function Iw(r,e,t={}){const n=new qe;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new Cc({next:g=>{d.Nu(),o.enqueueAndForget(()=>Kh(s,p));const I=g.docs.has(c);!I&&g.fromCache?u.reject(new x(C.UNAVAILABLE,"Failed to get document because the client is offline.")):I&&g.fromCache&&l&&l.source==="server"?u.reject(new x(C.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new Gh(Bi(c.path),d,{includeMetadataChanges:!0,qa:!0});return zh(s,p)}(await Di(r),r.asyncQueue,e,t,n)),n.promise}function lk(r,e){const t=new qe;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await ja(i,s,!0),l=new dw(s,c.Qs),u=l.ru(c.documents),d=l.applyChanges(u,!1);o.resolve(d.snapshot)}catch(c){const l=Gi(c,`Failed to execute query '${s} against cache`);o.reject(l)}}(await Zh(r),e,t)),t.promise}function Ew(r,e,t={}){const n=new qe;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new Cc({next:g=>{d.Nu(),o.enqueueAndForget(()=>Kh(s,p)),g.fromCache&&l.source==="server"?u.reject(new x(C.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new Gh(c,d,{includeMetadataChanges:!0,qa:!0});return zh(s,p)}(await Di(r),r.asyncQueue,e,t,n)),n.promise}function uk(r,e){const t=new Cc(e);return r.asyncQueue.enqueueAndForget(async()=>function(i,s){U(i).Ca.add(s),s.next()}(await Di(r),t)),()=>{t.Nu(),r.asyncQueue.enqueueAndForget(async()=>function(i,s){U(i).Ca.delete(s)}(await Di(r),t))}}function hk(r,e,t,n){const i=function(o,c){let l;return l=typeof o=="string"?g_().encode(o):o,function(d,p){return new tk(d,p)}(function(d,p){if(d instanceof Uint8Array)return vg(d,p);if(d instanceof ArrayBuffer)return vg(new Uint8Array(d),p);if(d instanceof ReadableStream)return d.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(l),c)}(t,No(e));r.asyncQueue.enqueueAndForget(async()=>{XC(await ed(r),i,n)})}function dk(r,e){return r.asyncQueue.enqueue(async()=>function(n,i){const s=U(n);return s.persistence.runTransaction("Get named query","readonly",o=>s.Ii.getNamedQuery(o,i))}(await Zh(r),e))}/**
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
 */function vw(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
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
 */const bg=new Map;/**
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
 */const Tw="firestore.googleapis.com",Ag=!0;class Sg{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new x(C.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Tw,this.ssl=Ag}else this.host=e.host,this.ssl=e.ssl??Ag;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=V_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<NP)throw new x(C.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}my("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=vw(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new x(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new x(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new x(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class Oo{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Sg({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new x(C.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new x(C.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Sg(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new QS;switch(n.type){case"firstParty":return new ZS(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new x(C.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=bg.get(t);n&&(N("ComponentProvider","Removing Datastore"),bg.delete(t),n.terminate())}(this),Promise.resolve()}}function fk(r,e,t,n={}){var u;r=ne(r,Oo);const i=Vi(e),s=r._getSettings(),o={...s,emulatorOptions:r._getEmulatorOptions()},c=`${e}:${t}`;i&&(qg(`https://${c}`),zg("Firestore",!0)),s.host!==Tw&&s.host!==c&&jt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l={...s,host:c,ssl:i,emulatorOptions:n};if(!kn(l,o)&&(r._setSettings(l),n.mockUserToken)){let d,p;if(typeof n.mockUserToken=="string")d=n.mockUserToken,p=Me.MOCK_USER;else{d=dE(n.mockUserToken,(u=r._app)==null?void 0:u.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new x(C.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new Me(g)}r._authCredentials=new YS(new py(d,p))}}/**
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
 */let it=class bw{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new bw(this.firestore,e,this._query)}},ce=class Rs{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Cn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Rs(this.firestore,e,this._key)}toJSON(){return{type:Rs._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(bo(t,Rs._jsonSchema))return new Rs(e,n||null,new F(X.fromString(t.referencePath)))}};ce._jsonSchemaVersion="firestore/documentReference/1.0",ce._jsonSchema={type:ke("string",ce._jsonSchemaVersion),referencePath:ke("string")};let Cn=class Aw extends it{constructor(e,t,n){super(e,t,Bi(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ce(this.firestore,null,new F(e))}withConverter(e){return new Aw(this.firestore,e,this._path)}};function Sw(r,e,...t){if(r=K(r),lh("collection","path",e),r instanceof Oo){const n=X.fromString(e,...t);return pp(n),new Cn(r,null,n)}{if(!(r instanceof ce||r instanceof Cn))throw new x(C.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(X.fromString(e,...t));return pp(n),new Cn(r.firestore,null,n)}}function pk(r,e){if(r=ne(r,Oo),lh("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new x(C.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new it(r,null,function(n){return new sn(X.emptyPath(),n)}(e))}function Qa(r,e,...t){if(r=K(r),arguments.length===1&&(e=ch.newId()),lh("doc","path",e),r instanceof Oo){const n=X.fromString(e,...t);return fp(n),new ce(r,null,new F(n))}{if(!(r instanceof ce||r instanceof Cn))throw new x(C.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(X.fromString(e,...t));return fp(n),new ce(r.firestore,r instanceof Cn?r.converter:null,new F(n))}}function Rw(r,e){return r=K(r),e=K(e),(r instanceof ce||r instanceof Cn)&&(e instanceof ce||e instanceof Cn)&&r.firestore===e.firestore&&r.path===e.path&&r.converter===e.converter}function Pw(r,e){return r=K(r),e=K(e),r instanceof it&&e instanceof it&&r.firestore===e.firestore&&Po(r._query,e._query)&&r.converter===e.converter}/**
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
 */const Rg="AsyncQueue";class Pg{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Lh(this,"async_queue_retry"),this._c=()=>{const n=Ta();n&&N(Rg,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=Ta();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=Ta();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new qe;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!jn(e))throw e;N(Rg,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,Ae("INTERNAL UNHANDLED ERROR: ",Cg(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=qh.createAndSchedule(this,e,t,n,s=>this.hc(s));return this.tc.push(i),i}uc(){this.nc&&$(47125,{Pc:Cg(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function Cg(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
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
 */function Iu(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class gk{constructor(){this._progressObserver={},this._taskCompletionResolver=new qe,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,n){this._progressObserver={next:e,error:t,complete:n}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
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
 */const mk=-1;let Re=class extends Oo{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new Pg,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Pg(e),this._firestoreClient=void 0,await e}}};function Qe(r){if(r._terminated)throw new x(C.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||Cw(r),r._firestoreClient}function Cw(r){var n,i,s;const e=r._freezeSettings(),t=function(c,l,u,d){return new FR(c,l,u,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,vw(d.experimentalLongPollingOptions),d.useFetchStreams,d.isUsingEmulator)}(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((s=e.localCache)!=null&&s._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new ik(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(c){const l=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(l),_online:l}}(r._componentsProvider))}function yk(r,e){jt("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return kw(r,co.provider,{build:n=>new yw(n,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function _k(r){jt("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();kw(r,co.provider,{build:t=>new ek(t,e.cacheSizeBytes)})}function kw(r,e,t){if((r=ne(r,Re))._firestoreClient||r._terminated)throw new x(C.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new x(C.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},Cw(r)}function wk(r){if(r._initialized&&!r._terminated)throw new x(C.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new qe;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!Bt.v())return Promise.resolve();const i=n+z_;await Bt.delete(i)}(Vh(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}}),e.promise}function Ik(r){return function(t){const n=new qe;return t.asyncQueue.enqueueAndForget(async()=>$C(await ed(t),n)),n.promise}(Qe(r=ne(r,Re)))}function Ek(r){return ok(Qe(r=ne(r,Re)))}function vk(r){return ak(Qe(r=ne(r,Re)))}function Tk(r,e){const t=Qe(r=ne(r,Re)),n=new gk;return hk(t,r._databaseId,e,n),n}function bk(r,e){return dk(Qe(r=ne(r,Re)),e).then(t=>t?new it(r,null,t.query):null)}/**
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
 */class We{constructor(e){this._byteString=e}static fromBase64String(e){try{return new We(ve.fromBase64String(e))}catch(t){throw new x(C.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new We(ve.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:We._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(bo(e,We._jsonSchema))return We.fromBase64String(e.bytes)}}We._jsonSchemaVersion="firestore/bytes/1.0",We._jsonSchema={type:ke("string",We._jsonSchemaVersion),bytes:ke("string")};/**
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
 */let $n=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new x(C.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new me(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};/**
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
 */let Nr=class{constructor(e){this._methodName=e}};/**
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
 */class bt{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new x(C.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new x(C.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return G(this._lat,e._lat)||G(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:bt._jsonSchemaVersion}}static fromJSON(e){if(bo(e,bt._jsonSchema))return new bt(e.latitude,e.longitude)}}bt._jsonSchemaVersion="firestore/geoPoint/1.0",bt._jsonSchema={type:ke("string",bt._jsonSchemaVersion),latitude:ke("number"),longitude:ke("number")};/**
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
 */class qt{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:qt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(bo(e,qt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new qt(e.vectorValues);throw new x(C.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}qt._jsonSchemaVersion="firestore/vectorValue/1.0",qt._jsonSchema={type:ke("string",qt._jsonSchemaVersion),vectorValues:ke("object")};/**
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
 */const Ak=/^__.*__$/;class Sk{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new an(e,this.data,this.fieldMask,t,this.fieldTransforms):new $i(e,this.data,t,this.fieldTransforms)}}class Dw{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new an(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function xw(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw $(40011,{Ac:r})}}class Dc{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Rc(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new Dc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.gc(e),n}yc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.Rc(),n}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Ya(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(xw(this.Ac)&&Ak.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class Rk{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||No(e)}Cc(e,t,n,i=!1){return new Dc({Ac:e,methodName:t,Dc:n,path:me.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Vr(r){const e=r._freezeSettings(),t=No(r._databaseId);return new Rk(r._databaseId,!!e.ignoreUndefinedProperties,t)}function xc(r,e,t,n,i,s={}){const o=r.Cc(s.merge||s.mergeFields?2:0,e,t,i);ad("Data must be an object, but it was:",o,n);const c=Ow(n,o);let l,u;if(s.merge)l=new lt(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const p of s.mergeFields){const g=Eu(e,p,t);if(!o.contains(g))throw new x(C.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);Fw(d,g)||d.push(g)}l=new lt(d),u=o.fieldTransforms.filter(p=>l.covers(p.field))}else l=null,u=o.fieldTransforms;return new Sk(new Be(c),l,u)}class Mo extends Nr{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Mo}}function Nw(r,e,t){return new Dc({Ac:3,Dc:e.settings.Dc,methodName:r._methodName,fc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class td extends Nr{_toFieldTransform(e){return new ko(e.path,new Ti)}isEqual(e){return e instanceof td}}class nd extends Nr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=Nw(this,e,!0),n=this.vc.map(s=>Or(s,t)),i=new br(n);return new ko(e.path,i)}isEqual(e){return e instanceof nd&&kn(this.vc,e.vc)}}class rd extends Nr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=Nw(this,e,!0),n=this.vc.map(s=>Or(s,t)),i=new Ar(n);return new ko(e.path,i)}isEqual(e){return e instanceof rd&&kn(this.vc,e.vc)}}class id extends Nr{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new bi(e.serializer,o_(e.serializer,this.Fc));return new ko(e.path,t)}isEqual(e){return e instanceof id&&this.Fc===e.Fc}}function sd(r,e,t,n){const i=r.Cc(1,e,t);ad("Data must be an object, but it was:",i,n);const s=[],o=Be.empty();Gn(n,(l,u)=>{const d=cd(e,l,t);u=K(u);const p=i.yc(d);if(u instanceof Mo)s.push(d);else{const g=Or(u,p);g!=null&&(s.push(d),o.set(d,g))}});const c=new lt(s);return new Dw(o,c,i.fieldTransforms)}function od(r,e,t,n,i,s){const o=r.Cc(1,e,t),c=[Eu(e,n,t)],l=[i];if(s.length%2!=0)throw new x(C.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(Eu(e,s[g])),l.push(s[g+1]);const u=[],d=Be.empty();for(let g=c.length-1;g>=0;--g)if(!Fw(u,c[g])){const I=c[g];let P=l[g];P=K(P);const D=o.yc(I);if(P instanceof Mo)u.push(I);else{const T=Or(P,D);T!=null&&(u.push(I),d.set(I,T))}}const p=new lt(u);return new Dw(d,p,o.fieldTransforms)}function Vw(r,e,t,n=!1){return Or(t,r.Cc(n?4:3,e))}function Or(r,e){if(Mw(r=K(r)))return ad("Unsupported field value:",e,r),Ow(r,e);if(r instanceof Nr)return function(n,i){if(!xw(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(n,i){const s=[];let o=0;for(const c of n){let l=Or(c,i.wc(o));l==null&&(l={nullValue:"NULL_VALUE"}),s.push(l),o++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=K(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return o_(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=re.fromDate(n);return{timestampValue:Ai(i.serializer,s)}}if(n instanceof re){const s=new re(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:Ai(i.serializer,s)}}if(n instanceof bt)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof We)return{bytesValue:__(i.serializer,n._byteString)};if(n instanceof ce){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.Sc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Rh(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof qt)return function(o,c){return{mapValue:{fields:{[mh]:{stringValue:yh},[Ii]:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw c.Sc("VectorValues must only contain numeric values.");return Eh(c.serializer,u)})}}}}}}(n,i);throw i.Sc(`Unsupported field value: ${pc(n)}`)}(r,e)}function Ow(r,e){const t={};return Oy(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Gn(r,(n,i)=>{const s=Or(i,e.mc(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function Mw(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof re||r instanceof bt||r instanceof We||r instanceof ce||r instanceof Nr||r instanceof qt)}function ad(r,e,t){if(!Mw(t)||!yy(t)){const n=pc(t);throw n==="an object"?e.Sc(r+" a custom object"):e.Sc(r+" "+n)}}function Eu(r,e,t){if((e=K(e))instanceof $n)return e._internalPath;if(typeof e=="string")return cd(r,e);throw Ya("Field path arguments must be of type string or ",r,!1,void 0,t)}const Pk=new RegExp("[~\\*/\\[\\]]");function cd(r,e,t){if(e.search(Pk)>=0)throw Ya(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new $n(...e.split("."))._internalPath}catch{throw Ya(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ya(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(s||o)&&(l+=" (found",s&&(l+=` in field ${n}`),o&&(l+=` in document ${i}`),l+=")"),new x(C.INVALID_ARGUMENT,c+r+l)}function Fw(r,e){return r.some(t=>t.isEqual(e))}/**
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
 */class lo{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new ce(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new Ck(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Nc("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class Ck extends lo{data(){return super.data()}}function Nc(r,e){return typeof e=="string"?cd(r,e):e instanceof $n?e._internalPath:e._delegate._internalPath}/**
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
 */function Lw(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new x(C.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ld{}class Fo extends ld{}function In(r,e,...t){let n=[];e instanceof ld&&n.push(e),n=n.concat(t),function(s){const o=s.filter(l=>l instanceof ud).length,c=s.filter(l=>l instanceof Vc).length;if(o>1||o>0&&c>0)throw new x(C.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class Vc extends Fo{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new Vc(e,t,n)}_apply(e){const t=this._parse(e);return Bw(e._query,t),new it(e.firestore,e.converter,au(e._query,t))}_parse(e){const t=Vr(e.firestore);return function(s,o,c,l,u,d,p){let g;if(u.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new x(C.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){Dg(p,d);const P=[];for(const D of p)P.push(kg(l,s,D));g={arrayValue:{values:P}}}else g=kg(l,s,p)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||Dg(p,d),g=Vw(c,o,p,d==="in"||d==="not-in");return ee.create(u,d,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function kk(r,e,t){const n=e,i=Nc("where",r);return Vc._create(i,n,t)}class ud extends ld{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new ud(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:ie.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(i,s){let o=i;const c=s.getFlattenedFilters();for(const l of c)Bw(o,l),o=au(o,l)}(e._query,t),new it(e.firestore,e.converter,au(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class hd extends Fo{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new hd(e,t)}_apply(e){const t=function(i,s,o){if(i.startAt!==null)throw new x(C.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new x(C.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new io(s,o)}(e._query,this._field,this._direction);return new it(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new sn(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,t))}}function Dk(r,e="asc"){const t=e,n=Nc("orderBy",r);return hd._create(n,t)}class Oc extends Fo{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new Oc(e,t,n)}_apply(e){return new it(e.firestore,e.converter,Ba(e._query,this._limit,this._limitType))}}function xk(r){return _y("limit",r),Oc._create("limit",r,"F")}function Nk(r){return _y("limitToLast",r),Oc._create("limitToLast",r,"L")}class Mc extends Fo{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new Mc(e,t,n)}_apply(e){const t=Uw(e,this.type,this._docOrFields,this._inclusive);return new it(e.firestore,e.converter,function(i,s){return new sn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(e._query,t))}}function Vk(...r){return Mc._create("startAt",r,!0)}function Ok(...r){return Mc._create("startAfter",r,!1)}class Fc extends Fo{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new Fc(e,t,n)}_apply(e){const t=Uw(e,this.type,this._docOrFields,this._inclusive);return new it(e.firestore,e.converter,function(i,s){return new sn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(e._query,t))}}function Mk(...r){return Fc._create("endBefore",r,!1)}function Fk(...r){return Fc._create("endAt",r,!0)}function Uw(r,e,t,n){if(t[0]=K(t[0]),t[0]instanceof lo)return function(s,o,c,l,u){if(!l)throw new x(C.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const p of ci(s))if(p.field.isKeyField())d.push(vr(o,l.key));else{const g=l.data.field(p.field);if(wc(g))throw new x(C.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const I=p.field.canonicalString();throw new x(C.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${I}' (used as the orderBy) does not exist.`)}d.push(g)}return new Ln(d,u)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const i=Vr(r.firestore);return function(o,c,l,u,d,p){const g=o.explicitOrderBy;if(d.length>g.length)throw new x(C.INVALID_ARGUMENT,`Too many arguments provided to ${u}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const I=[];for(let P=0;P<d.length;P++){const D=d[P];if(g[P].field.isKeyField()){if(typeof D!="string")throw new x(C.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${u}(), but got a ${typeof D}`);if(!wh(o)&&D.indexOf("/")!==-1)throw new x(C.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${u}() must be a plain document ID, but '${D}' contains a slash.`);const T=o.path.child(X.fromString(D));if(!F.isDocumentKey(T))throw new x(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${u}() must result in a valid document path, but '${T}' is not because it contains an odd number of segments.`);const V=new F(T);I.push(vr(c,V))}else{const T=Vw(l,u,D);I.push(T)}}return new Ln(I,p)}(r._query,r.firestore._databaseId,i,e,t,n)}}function kg(r,e,t){if(typeof(t=K(t))=="string"){if(t==="")throw new x(C.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!wh(e)&&t.indexOf("/")!==-1)throw new x(C.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(X.fromString(t));if(!F.isDocumentKey(n))throw new x(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return vr(r,new F(n))}if(t instanceof ce)return vr(r,t._key);throw new x(C.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${pc(t)}.`)}function Dg(r,e){if(!Array.isArray(r)||r.length===0)throw new x(C.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function Bw(r,e){const t=function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new x(C.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new x(C.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class dd{convertValue(e,t="none"){switch(Mn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return fe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(en(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw $(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Gn(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var n,i,s;const t=(s=(i=(n=e.fields)==null?void 0:n[Ii].arrayValue)==null?void 0:i.values)==null?void 0:s.map(o=>fe(o.doubleValue));return new qt(t)}convertGeoPoint(e){return new bt(fe(e.latitude),fe(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=Ic(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(to(e));default:return null}}convertTimestamp(e){const t=Zt(e);return new re(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=X.fromString(e);q(C_(n),9688,{name:e});const i=new On(n.get(1),n.get(3)),s=new F(n.popFirst(5));return i.isEqual(t)||Ae(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
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
 */function Lc(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class Lk extends dd{constructor(e){super(),this.firestore=e}convertBytes(e){return new We(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ce(this.firestore,null,t)}}class fr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}let wt=class $w extends lo{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new qs(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Nc("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new x(C.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=$w._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}};wt._jsonSchemaVersion="firestore/documentSnapshot/1.0",wt._jsonSchema={type:ke("string",wt._jsonSchemaVersion),bundleSource:ke("string","DocumentSnapshot"),bundleName:ke("string"),bundle:ke("string")};let qs=class extends wt{data(e={}){return super.data(e)}},At=class qw{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new fr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new qs(this._firestore,this._userDataWriter,n.key,n,new fr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new x(C.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(c=>{const l=new qs(i._firestore,i._userDataWriter,c.doc.key,c.doc,new fr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(c=>s||c.type!==3).map(c=>{const l=new qs(i._firestore,i._userDataWriter,c.doc.key,c.doc,new fr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let u=-1,d=-1;return c.type!==0&&(u=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:Uk(c.type),doc:l,oldIndex:u,newIndex:d}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new x(C.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=qw._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=ch.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach(s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}};function Uk(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return $(61501,{type:r})}}function zw(r,e){return r instanceof wt&&e instanceof wt?r._firestore===e._firestore&&r._key.isEqual(e._key)&&(r._document===null?e._document===null:r._document.isEqual(e._document))&&r._converter===e._converter:r instanceof At&&e instanceof At&&r._firestore===e._firestore&&Pw(r.query,e.query)&&r.metadata.isEqual(e.metadata)&&r._snapshot.isEqual(e._snapshot)}/**
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
 */function Bk(r){r=ne(r,ce);const e=ne(r.firestore,Re);return Iw(Qe(e),r._key).then(t=>fd(e,r,t))}At._jsonSchemaVersion="firestore/querySnapshot/1.0",At._jsonSchema={type:ke("string",At._jsonSchemaVersion),bundleSource:ke("string","QuerySnapshot"),bundleName:ke("string"),bundle:ke("string")};class Mr extends dd{constructor(e){super(),this.firestore=e}convertBytes(e){return new We(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ce(this.firestore,null,t)}}function $k(r){r=ne(r,ce);const e=ne(r.firestore,Re),t=Qe(e),n=new Mr(e);return ck(t,r._key).then(i=>new wt(e,n,r._key,i,new fr(i!==null&&i.hasLocalMutations,!0),r.converter))}function qk(r){r=ne(r,ce);const e=ne(r.firestore,Re);return Iw(Qe(e),r._key,{source:"server"}).then(t=>fd(e,r,t))}function zk(r){r=ne(r,it);const e=ne(r.firestore,Re),t=Qe(e),n=new Mr(e);return Lw(r._query),Ew(t,r._query).then(i=>new At(e,n,r,i))}function Kk(r){r=ne(r,it);const e=ne(r.firestore,Re),t=Qe(e),n=new Mr(e);return lk(t,r._query).then(i=>new At(e,n,r,i))}function jk(r){r=ne(r,it);const e=ne(r.firestore,Re),t=Qe(e),n=new Mr(e);return Ew(t,r._query,{source:"server"}).then(i=>new At(e,n,r,i))}function xg(r,e,t){r=ne(r,ce);const n=ne(r.firestore,Re),i=Lc(r.converter,e,t);return Lo(n,[xc(Vr(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,ye.none())])}function Ng(r,e,t,...n){r=ne(r,ce);const i=ne(r.firestore,Re),s=Vr(i);let o;return o=typeof(e=K(e))=="string"||e instanceof $n?od(s,"updateDoc",r._key,e,t,n):sd(s,"updateDoc",r._key,e),Lo(i,[o.toMutation(r._key,ye.exists(!0))])}function Gk(r){return Lo(ne(r.firestore,Re),[new qi(r._key,ye.none())])}function Wk(r,e){const t=ne(r.firestore,Re),n=Qa(r),i=Lc(r.converter,e);return Lo(t,[xc(Vr(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,ye.exists(!1))]).then(()=>n)}function Kw(r,...e){var l,u,d;r=K(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||Iu(e[n])||(t=e[n++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Iu(e[n])){const p=e[n];e[n]=(l=p.next)==null?void 0:l.bind(p),e[n+1]=(u=p.error)==null?void 0:u.bind(p),e[n+2]=(d=p.complete)==null?void 0:d.bind(p)}let s,o,c;if(r instanceof ce)o=ne(r.firestore,Re),c=Bi(r._key.path),s={next:p=>{e[n]&&e[n](fd(o,r,p))},error:e[n+1],complete:e[n+2]};else{const p=ne(r,it);o=ne(p.firestore,Re),c=p._query;const g=new Mr(o);s={next:I=>{e[n]&&e[n](new At(o,g,p,I))},error:e[n+1],complete:e[n+2]},Lw(r._query)}return function(g,I,P,D){const T=new Cc(D),V=new Gh(I,T,P);return g.asyncQueue.enqueueAndForget(async()=>zh(await Di(g),V)),()=>{T.Nu(),g.asyncQueue.enqueueAndForget(async()=>Kh(await Di(g),V))}}(Qe(o),c,i,s)}function Hk(r,e){return uk(Qe(r=ne(r,Re)),Iu(e)?e:{next:e})}function Lo(r,e){return function(n,i){const s=new qe;return n.asyncQueue.enqueueAndForget(async()=>FC(await ed(n),i,s)),s.promise}(Qe(r),e)}function fd(r,e,t){const n=t.docs.get(e._key),i=new Mr(r);return new wt(r,i,e._key,n,new fr(t.hasPendingWrites,t.fromCache),e.converter)}/**
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
 */const Qk={maxAttempts:5};/**
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
 */let Yk=class{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Vr(e)}set(e,t,n){this._verifyNotCommitted();const i=bn(e,this._firestore),s=Lc(i.converter,t,n),o=xc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,ye.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=bn(e,this._firestore);let o;return o=typeof(t=K(t))=="string"||t instanceof $n?od(this._dataReader,"WriteBatch.update",s._key,t,n,i):sd(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,ye.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=bn(e,this._firestore);return this._mutations=this._mutations.concat(new qi(t._key,ye.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new x(C.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}};function bn(r,e){if((r=K(r)).firestore!==e)throw new x(C.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
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
 */class Jk{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Vr(e)}get(e){const t=bn(e,this._firestore),n=new Lk(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return $(24041);const s=i[0];if(s.isFoundDocument())return new lo(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new lo(this._firestore,n,t._key,null,t.converter);throw $(18433,{doc:s})})}set(e,t,n){const i=bn(e,this._firestore),s=Lc(i.converter,t,n),o=xc(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=bn(e,this._firestore);let o;return o=typeof(t=K(t))=="string"||t instanceof $n?od(this._dataReader,"Transaction.update",s._key,t,n,i):sd(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=bn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
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
 */let Xk=class extends Jk{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=bn(e,this._firestore),n=new Mr(this._firestore);return super.get(e).then(i=>new wt(this._firestore,n,t._key,i._document,new fr(!1,!1),t.converter))}};function Zk(r,e,t){r=ne(r,Re);const n={...Qk,...t};return function(s){if(s.maxAttempts<1)throw new x(C.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(s,o,c){const l=new qe;return s.asyncQueue.enqueueAndForget(async()=>{const u=await sk(s);new rk(s.asyncQueue,u,c,o,l).ju()}),l.promise}(Qe(r),i=>e(new Xk(r,i)),n)}/**
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
 */function e0(){return new Mo("deleteField")}function t0(){return new td("serverTimestamp")}function n0(...r){return new nd("arrayUnion",r)}function r0(...r){return new rd("arrayRemove",r)}function i0(r){return new id("increment",r)}(function(e,t=!0){(function(i){Ui=i})(qn),Nn(new zt("firestore",(n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new Re(new JS(n.getProvider("auth-internal")),new eR(o,n.getProvider("app-check-internal")),function(u,d){if(!Object.prototype.hasOwnProperty.apply(u.options,["projectId"]))throw new x(C.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new On(u.options.projectId,d)}(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c},"PUBLIC").setMultipleInstances(!0)),Tt(lp,up,e),Tt(lp,up,"esm2020")})();const s0="@firebase/firestore-compat",o0="0.4.3";/**
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
 */function pd(r,e){if(e===void 0)return{merge:!1};if(e.mergeFields!==void 0&&e.merge!==void 0)throw new x("invalid-argument",`Invalid options passed to function ${r}(): You cannot specify both "merge" and "mergeFields".`);return e}/**
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
 */function Vg(){if(typeof Uint8Array>"u")throw new x("unimplemented","Uint8Arrays are not available in this environment.")}function Og(){if(!OR())throw new x("unimplemented","Blobs are unavailable in Firestore in this environment.")}let jw=class vu{constructor(e){this._delegate=e}static fromBase64String(e){return Og(),new vu(We.fromBase64String(e))}static fromUint8Array(e){return Vg(),new vu(We.fromUint8Array(e))}toBase64(){return Og(),this._delegate.toBase64()}toUint8Array(){return Vg(),this._delegate.toUint8Array()}isEqual(e){return this._delegate.isEqual(e._delegate)}toString(){return"Blob(base64: "+this.toBase64()+")"}};/**
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
 */function Tu(r){return a0(r,["next","error","complete"])}function a0(r,e){if(typeof r!="object"||r===null)return!1;const t=r;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}/**
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
 */class c0{enableIndexedDbPersistence(e,t){return yk(e._delegate,{forceOwnership:t})}enableMultiTabIndexedDbPersistence(e){return _k(e._delegate)}clearIndexedDbPersistence(e){return wk(e._delegate)}}class Gw{constructor(e,t,n){this._delegate=t,this._persistenceProvider=n,this.INTERNAL={delete:()=>this.terminate()},e instanceof On||(this._appCompat=e)}get _databaseId(){return this._delegate._databaseId}settings(e){const t=this._delegate._getSettings();!e.merge&&t.host!==e.host&&jt("You are overriding the original host. If you did not intend to override your settings, use {merge: true}."),e.merge&&(e={...t,...e},delete e.merge),this._delegate._setSettings(e)}useEmulator(e,t,n={}){fk(this._delegate,e,t,n)}enableNetwork(){return Ek(this._delegate)}disableNetwork(){return vk(this._delegate)}enablePersistence(e){let t=!1,n=!1;return e&&(t=!!e.synchronizeTabs,n=!!e.experimentalForceOwningTab,my("synchronizeTabs",t,"experimentalForceOwningTab",n)),t?this._persistenceProvider.enableMultiTabIndexedDbPersistence(this):this._persistenceProvider.enableIndexedDbPersistence(this,n)}clearPersistence(){return this._persistenceProvider.clearIndexedDbPersistence(this)}terminate(){return this._appCompat&&(this._appCompat._removeServiceInstance("firestore-compat"),this._appCompat._removeServiceInstance("firestore")),this._delegate._delete()}waitForPendingWrites(){return Ik(this._delegate)}onSnapshotsInSync(e){return Hk(this._delegate,e)}get app(){if(!this._appCompat)throw new x("failed-precondition","Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._appCompat}collection(e){try{return new xi(this,Sw(this._delegate,e))}catch(t){throw Ze(t,"collection()","Firestore.collection()")}}doc(e){try{return new _t(this,Qa(this._delegate,e))}catch(t){throw Ze(t,"doc()","Firestore.doc()")}}collectionGroup(e){try{return new Xe(this,pk(this._delegate,e))}catch(t){throw Ze(t,"collectionGroup()","Firestore.collectionGroup()")}}runTransaction(e){return Zk(this._delegate,t=>e(new Ww(this,t)))}batch(){return Qe(this._delegate),new Hw(new Yk(this._delegate,e=>Lo(this._delegate,e)))}loadBundle(e){return Tk(this._delegate,e)}namedQuery(e){return bk(this._delegate,e).then(t=>t?new Xe(this,t):null)}}class Uc extends dd{constructor(e){super(),this.firestore=e}convertBytes(e){return new jw(new We(e))}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return _t.forKey(t,this.firestore,null)}}function l0(r){WS(r)}class Ww{constructor(e,t){this._firestore=e,this._delegate=t,this._userDataWriter=new Uc(e)}get(e){const t=pr(e);return this._delegate.get(t).then(n=>new uo(this._firestore,new wt(this._firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,t.converter)))}set(e,t,n){const i=pr(e);return n?(pd("Transaction.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=pr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=pr(e);return this._delegate.delete(t),this}}class Hw{constructor(e){this._delegate=e}set(e,t,n){const i=pr(e);return n?(pd("WriteBatch.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=pr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=pr(e);return this._delegate.delete(t),this}commit(){return this._delegate.commit()}}class kr{constructor(e,t,n){this._firestore=e,this._userDataWriter=t,this._delegate=n}fromFirestore(e,t){const n=new qs(this._firestore._delegate,this._userDataWriter,e._key,e._document,e.metadata,null);return this._delegate.fromFirestore(new ho(this._firestore,n),t??{})}toFirestore(e,t){return t?this._delegate.toFirestore(e,t):this._delegate.toFirestore(e)}static getInstance(e,t){const n=kr.INSTANCES;let i=n.get(e);i||(i=new WeakMap,n.set(e,i));let s=i.get(t);return s||(s=new kr(e,new Uc(e),t),i.set(t,s)),s}}kr.INSTANCES=new WeakMap;class _t{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Uc(e)}static forPath(e,t,n){if(e.length%2!==0)throw new x("invalid-argument",`Invalid document reference. Document references must have an even number of segments, but ${e.canonicalString()} has ${e.length}`);return new _t(t,new ce(t._delegate,n,new F(e)))}static forKey(e,t,n){return new _t(t,new ce(t._delegate,n,e))}get id(){return this._delegate.id}get parent(){return new xi(this.firestore,this._delegate.parent)}get path(){return this._delegate.path}collection(e){try{return new xi(this.firestore,Sw(this._delegate,e))}catch(t){throw Ze(t,"collection()","DocumentReference.collection()")}}isEqual(e){return e=K(e),e instanceof ce?Rw(this._delegate,e):!1}set(e,t){t=pd("DocumentReference.set",t);try{return t?xg(this._delegate,e,t):xg(this._delegate,e)}catch(n){throw Ze(n,"setDoc()","DocumentReference.set()")}}update(e,t,...n){try{return arguments.length===1?Ng(this._delegate,e):Ng(this._delegate,e,t,...n)}catch(i){throw Ze(i,"updateDoc()","DocumentReference.update()")}}delete(){return Gk(this._delegate)}onSnapshot(...e){const t=Qw(e),n=Yw(e,i=>new uo(this.firestore,new wt(this.firestore._delegate,this._userDataWriter,i._key,i._document,i.metadata,this._delegate.converter)));return Kw(this._delegate,t,n)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=$k(this._delegate):(e==null?void 0:e.source)==="server"?t=qk(this._delegate):t=Bk(this._delegate),t.then(n=>new uo(this.firestore,new wt(this.firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,this._delegate.converter)))}withConverter(e){return new _t(this.firestore,e?this._delegate.withConverter(kr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function Ze(r,e,t){return r.message=r.message.replace(e,t),r}function Qw(r){for(const e of r)if(typeof e=="object"&&!Tu(e))return e;return{}}function Yw(r,e){var n,i;let t;return Tu(r[0])?t=r[0]:Tu(r[1])?t=r[1]:typeof r[0]=="function"?t={next:r[0],error:r[1],complete:r[2]}:t={next:r[1],error:r[2],complete:r[3]},{next:s=>{t.next&&t.next(e(s))},error:(n=t.error)==null?void 0:n.bind(t),complete:(i=t.complete)==null?void 0:i.bind(t)}}class uo{constructor(e,t){this._firestore=e,this._delegate=t}get ref(){return new _t(this._firestore,this._delegate.ref)}get id(){return this._delegate.id}get metadata(){return this._delegate.metadata}get exists(){return this._delegate.exists()}data(e){return this._delegate.data(e)}get(e,t){return this._delegate.get(e,t)}isEqual(e){return zw(this._delegate,e._delegate)}}class ho extends uo{data(e){const t=this._delegate.data(e);return this._delegate._converter||HS(t!==void 0,"Document in a QueryDocumentSnapshot should exist"),t}}class Xe{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Uc(e)}where(e,t,n){try{return new Xe(this.firestore,In(this._delegate,kk(e,t,n)))}catch(i){throw Ze(i,/(orderBy|where)\(\)/,"Query.$1()")}}orderBy(e,t){try{return new Xe(this.firestore,In(this._delegate,Dk(e,t)))}catch(n){throw Ze(n,/(orderBy|where)\(\)/,"Query.$1()")}}limit(e){try{return new Xe(this.firestore,In(this._delegate,xk(e)))}catch(t){throw Ze(t,"limit()","Query.limit()")}}limitToLast(e){try{return new Xe(this.firestore,In(this._delegate,Nk(e)))}catch(t){throw Ze(t,"limitToLast()","Query.limitToLast()")}}startAt(...e){try{return new Xe(this.firestore,In(this._delegate,Vk(...e)))}catch(t){throw Ze(t,"startAt()","Query.startAt()")}}startAfter(...e){try{return new Xe(this.firestore,In(this._delegate,Ok(...e)))}catch(t){throw Ze(t,"startAfter()","Query.startAfter()")}}endBefore(...e){try{return new Xe(this.firestore,In(this._delegate,Mk(...e)))}catch(t){throw Ze(t,"endBefore()","Query.endBefore()")}}endAt(...e){try{return new Xe(this.firestore,In(this._delegate,Fk(...e)))}catch(t){throw Ze(t,"endAt()","Query.endAt()")}}isEqual(e){return Pw(this._delegate,e._delegate)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=Kk(this._delegate):(e==null?void 0:e.source)==="server"?t=jk(this._delegate):t=zk(this._delegate),t.then(n=>new bu(this.firestore,new At(this.firestore._delegate,this._userDataWriter,this._delegate,n._snapshot)))}onSnapshot(...e){const t=Qw(e),n=Yw(e,i=>new bu(this.firestore,new At(this.firestore._delegate,this._userDataWriter,this._delegate,i._snapshot)));return Kw(this._delegate,t,n)}withConverter(e){return new Xe(this.firestore,e?this._delegate.withConverter(kr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}class u0{constructor(e,t){this._firestore=e,this._delegate=t}get type(){return this._delegate.type}get doc(){return new ho(this._firestore,this._delegate.doc)}get oldIndex(){return this._delegate.oldIndex}get newIndex(){return this._delegate.newIndex}}class bu{constructor(e,t){this._firestore=e,this._delegate=t}get query(){return new Xe(this._firestore,this._delegate.query)}get metadata(){return this._delegate.metadata}get size(){return this._delegate.size}get empty(){return this._delegate.empty}get docs(){return this._delegate.docs.map(e=>new ho(this._firestore,e))}docChanges(e){return this._delegate.docChanges(e).map(t=>new u0(this._firestore,t))}forEach(e,t){this._delegate.forEach(n=>{e.call(t,new ho(this._firestore,n))})}isEqual(e){return zw(this._delegate,e._delegate)}}class xi extends Xe{constructor(e,t){super(e,t),this.firestore=e,this._delegate=t}get id(){return this._delegate.id}get path(){return this._delegate.path}get parent(){const e=this._delegate.parent;return e?new _t(this.firestore,e):null}doc(e){try{return e===void 0?new _t(this.firestore,Qa(this._delegate)):new _t(this.firestore,Qa(this._delegate,e))}catch(t){throw Ze(t,"doc()","CollectionReference.doc()")}}add(e){return Wk(this._delegate,e).then(t=>new _t(this.firestore,t))}isEqual(e){return Rw(this._delegate,e._delegate)}withConverter(e){return new xi(this.firestore,e?this._delegate.withConverter(kr.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function pr(r){return ne(r,ce)}/**
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
 */class gd{constructor(...e){this._delegate=new $n(...e)}static documentId(){return new gd(me.keyField().canonicalString())}isEqual(e){return e=K(e),e instanceof $n?this._delegate._internalPath.isEqual(e._internalPath):!1}}/**
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
 */class ur{static serverTimestamp(){const e=t0();return e._methodName="FieldValue.serverTimestamp",new ur(e)}static delete(){const e=e0();return e._methodName="FieldValue.delete",new ur(e)}static arrayUnion(...e){const t=n0(...e);return t._methodName="FieldValue.arrayUnion",new ur(t)}static arrayRemove(...e){const t=r0(...e);return t._methodName="FieldValue.arrayRemove",new ur(t)}static increment(e){const t=i0(e);return t._methodName="FieldValue.increment",new ur(t)}constructor(e){this._delegate=e}isEqual(e){return this._delegate.isEqual(e._delegate)}}/**
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
 */const h0={Firestore:Gw,GeoPoint:bt,Timestamp:re,Blob:jw,Transaction:Ww,WriteBatch:Hw,DocumentReference:_t,DocumentSnapshot:uo,Query:Xe,QueryDocumentSnapshot:ho,QuerySnapshot:bu,CollectionReference:xi,FieldPath:gd,FieldValue:ur,setLogLevel:l0,CACHE_SIZE_UNLIMITED:mk};function d0(r,e){r.INTERNAL.registerComponent(new zt("firestore-compat",t=>{const n=t.getProvider("app-compat").getImmediate(),i=t.getProvider("firestore").getImmediate();return e(n,i)},"PUBLIC").setServiceProps({...h0}))}/**
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
 */function f0(r){d0(r,(e,t)=>new Gw(e,t,new c0)),r.registerVersion(s0,o0)}f0(Ue);var p0={};(()=>{var r;if(typeof process<"u"&&p0)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})();const oe=(...r)=>{console.log("[Firebase]",...r)};let Dt=null,_r=null,fo=!1,md=!1,Ja=!1,yt=null;const yd="firebase_config",Jw={encode:r=>{try{return btoa(encodeURIComponent(r))}catch{return r}},decode:r=>{try{return decodeURIComponent(atob(r))}catch{return r}}};async function g0(){var r,e,t;if(!((r=window.electronAPI)!=null&&r.isElectron))return oe("웹 환경 - 인증 파일 사용 불가"),null;try{if(!((e=window.electronAPI)!=null&&e.readAuthFile))return oe("readAuthFile API 없음"),null;const n=await window.electronAPI.readAuthFile();if(!n.success||!n.content)return oe("인증 파일 없음 - 로컬 모드로 동작"),null;const i=JSON.parse(n.content);return i.apiKey&&i.projectId?(oe("인증 파일에서 Firebase 설정 로드됨"),i):(oe("인증 파일에 필수 설정 없음"),null)}catch(n){return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] 인증 파일 로드 실패:",n),null}}function m0(){var r;try{const e=localStorage.getItem(yd);if(e){let t;if(e.startsWith("eyJ"))try{t=JSON.parse(Jw.decode(e))}catch{t=JSON.parse(e)}else t=JSON.parse(e);if(t.apiKey&&t.projectId)return t}}catch(e){(((r=window.logger)==null?void 0:r.error)||console.error)("Firebase 설정 로드 실패:",e)}return null}async function y0(){const r=await g0();if(r)return r;const e=m0();return e?(oe("localStorage에서 설정 로드됨"),e):(oe("Firebase 설정 없음 - 로컬 모드로 동작"),null)}function Xw(r){return r?!!(r.apiKey&&r.apiKey.trim()!==""&&r.projectId&&r.projectId.trim()!==""):!1}async function Zw(){var r,e,t,n,i,s,o,c,l,u,d,p,g;if(oe("초기화 시작..."),fo&&Dt)return oe("이미 초기화됨"),!0;if(!navigator.onLine)return oe("오프라인 상태 - 로컬 모드로 동작"),(((r=window.logger)==null?void 0:r.info)||console.info)("[Firebase] 인터넷 연결 없음. 로컬 모드로 동작합니다."),!1;if(typeof window.NetworkAccess<"u"){let P=await window.NetworkAccess.checkAccess();if(oe("네트워크 접근 체크:",P),!P.allowed&&P.needsSetup&&oe("네트워크 접근 거부: 게이트웨이 미설정"),!P.allowed)return oe("네트워크 접근 거부:",P.reason),(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다."),!1}if(typeof Ue>"u")return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요."),!1;if(yt=await y0(),oe("로드된 설정:",yt?"있음":"없음"),!yt)return oe("설정이 없습니다. 로컬 모드로 동작합니다."),!1;if(oe("설정값 확인:",{apiKey:yt.apiKey?yt.apiKey.substring(0,10)+"...":"없음",projectId:yt.projectId||"없음",authDomain:yt.authDomain||"없음"}),!Xw(yt))return oe("설정이 유효하지 않습니다."),!1;try{oe("앱 초기화 중..."),Ue.apps.length||Ue.initializeApp(yt),Dt=Ue.firestore(),oe("Firestore 연결됨");try{_r=Ue.auth();const I=await _r.signInAnonymously();Ja=!0,oe("익명 인증 성공:",(n=I.user)==null?void 0:n.uid)}catch(I){(((i=window.logger)==null?void 0:i.error)||console.error)("[Firebase] 익명 인증 실패:",I),Ja=!1;const P=I.code||"";if(P==="auth/operation-not-allowed")return(((s=window.logger)==null?void 0:s.error)||console.error)("[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요."),!1;P==="auth/network-request-failed"?(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다."):(((c=window.logger)==null?void 0:c.warn)||console.warn)("[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)")}try{await Dt.enablePersistence({synchronizeTabs:!0}),md=!0,oe("오프라인 지원 활성화됨 (멀티탭 동기화)")}catch(I){const P=I;(((l=window.logger)==null?void 0:l.warn)||console.warn)("[Firebase] 오프라인 지원 에러:",P.code,P.message),P.code==="failed-precondition"?(((u=window.logger)==null?void 0:u.warn)||console.warn)("[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다."):P.code==="unimplemented"&&(((d=window.logger)==null?void 0:d.warn)||console.warn)("[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.")}return fo=!0,oe("초기화 완료:",yt.projectId),window.addEventListener("offline",()=>{oe("네트워크 끊김 감지 - Firestore 네트워크 비활성화"),Dt&&Dt.disableNetwork().catch(()=>{})}),window.addEventListener("online",()=>{oe("네트워크 복구 감지 - Firestore 네트워크 활성화"),Dt&&Dt.enableNetwork().catch(()=>{})}),!0}catch(I){return(((p=window.logger)==null?void 0:p.error)||console.error)("[Firebase] 초기화 실패:",I),(((g=window.logger)==null?void 0:g.error)||console.error)("[Firebase] 에러 상세:",I.message,I.stack),!1}}function _0(){return Dt}function w0(){return fo}function I0(){return md}function E0(){var r;return((r=_r==null?void 0:_r.currentUser)==null?void 0:r.uid)||null}function v0(r){var e;try{const t=Jw.encode(JSON.stringify(r));localStorage.setItem(yd,t),oe("설정 저장됨 (난독화)")}catch(t){(((e=window.logger)==null?void 0:e.error)||console.error)("Firebase 설정 저장 실패:",t)}}function T0(){localStorage.removeItem(yd),fo=!1,Ja=!1,Dt=null,_r=null,yt=null,oe("설정 초기화됨")}async function b0(){var r;if(oe("재초기화 시작..."),fo=!1,Ja=!1,md=!1,Dt=null,_r=null,yt=null,typeof Ue<"u"&&Ue.apps.length>0)try{await Ue.app().delete(),oe("기존 Firebase 앱 삭제됨")}catch(e){(((r=window.logger)==null?void 0:r.warn)||console.warn)("[Firebase] 앱 삭제 실패:",e)}return await Zw()}window.firebaseConfig={initialize:Zw,reinitialize:b0,getDb:_0,isEnabled:w0,isOfflineSupported:I0,getCurrentUserId:E0,isConfigValid:Xw,saveConfig:v0,resetConfig:T0};class eI{constructor(){ls(this,"lastCheckTime",null);ls(this,"checkInterval",null);ls(this,"reconnectAttempts",0);ls(this,"maxReconnectAttempts",3)}async diagnose(){const e={timestamp:new Date().toISOString(),checks:{},overallStatus:"unknown",recommendations:[]};return e.checks.configLoaded=this.checkConfigLoaded(),e.checks.initialized=this.checkInitialized(),e.checks.authenticated=await this.checkAuthentication(),e.checks.networkOnline=this.checkNetworkStatus(),e.checks.initialized.passed&&(e.checks.firestoreConnection=await this.checkFirestoreConnection()),e.checks.offlineQueue=this.checkOfflineQueue(),e.checks.collectionNames=this.checkCollectionNames(),e.overallStatus=this.determineOverallStatus(e.checks),e.recommendations=this.generateRecommendations(e.checks),this.lastCheckTime=Date.now(),e}checkConfigLoaded(){var t;const e=!!(window.firebaseConfig&&typeof window.firebaseConfig.getDb=="function");return{passed:e,message:e?"Firebase 설정이 로드되었습니다.":"Firebase 설정을 찾을 수 없습니다.",details:{configExists:!!window.firebaseConfig,isEnabled:((t=window.firebaseConfig)==null?void 0:t.isEnabled())||!1}}}checkInitialized(){var n;const e=(n=window.firebaseConfig)==null?void 0:n.getDb(),t=!!e;return{passed:t,message:t?"Firebase가 초기화되었습니다.":"Firebase가 초기화되지 않았습니다.",details:{hasDb:!!e}}}async checkAuthentication(){var e,t;try{const n=(t=(e=window.firebaseConfig)==null?void 0:e.getAuth)==null?void 0:t.call(e);if(!n)return{passed:!1,message:"인증 객체를 찾을 수 없습니다.",details:{authExists:!1}};const i=n.currentUser,s=!!i;return{passed:!0,message:s?"인증되었습니다.":"익명 모드입니다.",details:{authenticated:s,userId:(i==null?void 0:i.uid)||null}}}catch(n){return{passed:!1,message:`인증 확인 실패: ${n.message}`,details:{error:n.message}}}}checkNetworkStatus(){var n;const e=navigator.onLine,t=window.networkStatus;return{passed:e,message:e?"온라인 상태입니다.":"오프라인 상태입니다.",details:{navigatorOnline:e,networkStatusOnline:t==null?void 0:t.isOnline,queueSize:((n=t==null?void 0:t.offlineQueue)==null?void 0:n.length)||0}}}async checkFirestoreConnection(){var e;try{const t=(e=window.firebaseConfig)==null?void 0:e.getDb();if(!t)return{passed:!1,message:"Firestore DB를 찾을 수 없습니다.",details:{}};const n=t.collection("_connection_test").limit(1).get(),i=new Promise((s,o)=>setTimeout(()=>o(new Error("Timeout")),5e3));return await Promise.race([n,i]),{passed:!0,message:"Firestore 연결이 정상입니다.",details:{connectionTest:"success"}}}catch(t){return{passed:!1,message:`Firestore 연결 실패: ${t.message}`,details:{error:t.message,code:t.code}}}}checkOfflineQueue(){var n,i;const e=window.networkStatus,t=((n=e==null?void 0:e.offlineQueue)==null?void 0:n.length)||0;return{passed:!0,message:t>0?`오프라인 큐에 ${t}개 작업이 대기 중입니다.`:"오프라인 큐가 비어있습니다.",details:{queueSize:t,queueItems:((i=e==null?void 0:e.getQueueStatus)==null?void 0:i.call(e))||null}}}checkCollectionNames(){const e=["soil","water","compost","heavyMetal","pesticide"],t=new Date().getFullYear(),n={};if(window.firestoreDb&&typeof window.firestoreDb.getCollectionName=="function")e.forEach(s=>{const o=window.firestoreDb.getCollectionName(s,t),c="test_";n[s]={actual:o,hasPrefix:o.startsWith(c),year:t}});else return{passed:!1,message:"firestoreDb 모듈을 찾을 수 없습니다.",details:{error:"Module not loaded"}};const i=Object.values(n).every(s=>s.hasPrefix);return{passed:i,message:i?"모든 컬렉션 이름이 올바릅니다.":"일부 컬렉션 이름에 test_ 접두사가 없습니다.",details:n}}determineOverallStatus(e){var i;return["configLoaded","initialized"].some(s=>{var o;return!((o=e[s])!=null&&o.passed)})?"error":(i=e.networkOnline)!=null&&i.passed?e.firestoreConnection&&!e.firestoreConnection.passed?"degraded":"healthy":"offline"}generateRecommendations(e){var i,s,o,c,l;const t=[];(i=e.configLoaded)!=null&&i.passed||t.push({priority:"critical",message:"Firebase 설정 파일(firebase-auth.json)을 확인하세요.",action:"checkAuthFile"}),(s=e.initialized)!=null&&s.passed||t.push({priority:"critical",message:"Firebase 초기화 코드를 확인하세요.",action:"reinitialize"}),(o=e.networkOnline)!=null&&o.passed||t.push({priority:"warning",message:"인터넷 연결을 확인하세요. 오프라인 모드로 작동 중입니다.",action:"checkNetwork"}),e.firestoreConnection&&!e.firestoreConnection.passed&&t.push({priority:"warning",message:"Firestore 연결을 재시도하세요.",action:"reconnect"});const n=(l=(c=e.offlineQueue)==null?void 0:c.details)==null?void 0:l.queueSize;return n&&n>0&&t.push({priority:"info",message:`${n}개의 작업이 동기화 대기 중입니다.`,action:"processQueue"}),t}async attemptAutoRecovery(){var t,n;console.log("[Firebase Diagnostics] 자동 복구 시작...");const e=await this.diagnose();if(e.overallStatus==="healthy")return console.log("[Firebase Diagnostics] 연결 상태 정상"),{success:!0,message:"연결 정상"};if(e.overallStatus==="offline")return console.log("[Firebase Diagnostics] 오프라인 상태 - 큐 사용 중"),{success:!1,message:"오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다.",canRetry:!0};if(!((t=e.checks.initialized)!=null&&t.passed))try{if(console.log("[Firebase Diagnostics] Firebase 재초기화 시도..."),(n=window.firebaseConfig)!=null&&n.initialize)return await window.firebaseConfig.initialize(),{success:!0,message:"Firebase 재초기화 성공"}}catch(i){console.error("[Firebase Diagnostics] 재초기화 실패:",i)}return{success:!1,message:"자동 복구 실패. 수동 확인이 필요합니다.",diagnosis:e}}startHealthCheck(e=6e4){this.checkInterval&&clearInterval(this.checkInterval),this.checkInterval=window.setInterval(async()=>{const t=await this.diagnose();t.overallStatus!=="healthy"&&(console.warn("[Firebase Diagnostics] 연결 문제 감지:",t),typeof window.showToast=="function"&&window.showToast("Firebase 연결 문제가 감지되었습니다.","warning",{actionLabel:"진단",action:()=>this.showDiagnosticsUI()}))},e)}stopHealthCheck(){this.checkInterval&&(clearInterval(this.checkInterval),this.checkInterval=null)}showDiagnosticsUI(){this.diagnose().then(e=>{if(console.group("🔍 Firebase 진단 결과"),console.log("전체 상태:",e.overallStatus),console.log("검사 항목:",e.checks),console.log("권장 사항:",e.recommendations),console.groupEnd(),typeof window.showToast=="function"){const t={healthy:"Firebase 연결 정상",offline:"오프라인 모드 (큐 사용 중)",degraded:"Firebase 연결 불안정",error:"Firebase 설정 오류",unknown:"Firebase 상태 불명"};window.showToast(t[e.overallStatus],e.overallStatus==="healthy"?"success":"warning")}})}}window.firebaseDiagnostics=new eI;typeof ba<"u"&&ba.exports&&(ba.exports=eI);const Bc=["name","phone","address","birthDate","corpNumber","parcels","phoneNumber","farmAddress"],A0="2.0",S0="AES-GCM",R0=256,P0=12,C0=16,tI=6e5,k0="SHA-256",Xa=10;function po(r){const e=new Uint8Array(r);let t="";for(let n=0;n<e.byteLength;n++)t+=String.fromCharCode(e[n]);return btoa(t)}function Au(r){const e=atob(r),t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t.buffer}function nI(r){return new TextEncoder().encode(r)}async function D0(r,e){const t=nI(e),n=await crypto.subtle.digest("SHA-256",t),i=po(n);return r+i}async function x0(r,e,t=!1){const n=await crypto.subtle.importKey("raw",nI(r),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:tI,hash:k0},n,{name:S0,length:R0},t,["encrypt","decrypt"])}async function N0(r,e,t,n=!1){t||(t=crypto.getRandomValues(new Uint8Array(C0)).buffer);const i=await D0(r,e);return{key:await x0(i,t,n),salt:t}}async function $c(r,e,t){if(!r||typeof r!="string")return null;const n=crypto.getRandomValues(new Uint8Array(P0)),i=new TextEncoder,s=i.encode(r),o={name:"AES-GCM",iv:n};t&&(o.additionalData=i.encode(t));const c=await crypto.subtle.encrypt(o,e,s);return{iv:po(n.buffer),ct:po(c)}}async function qc(r,e,t,n){if(!r||!e)return null;const i=new Uint8Array(Au(r)),s=Au(e),o={name:"AES-GCM",iv:i};n&&(o.additionalData=new TextEncoder().encode(n));const c=await crypto.subtle.decrypt(o,t,s);return new TextDecoder().decode(c)}async function rI(r,e){if(!r||!e)return r;const t={...r},n={v:"2.1"};let i=!1;for(const s of Bc){const o=r[s];if(o!=null&&o!=="")try{const c=typeof o=="string"?o:JSON.stringify(o),l=await $c(c,e,s);l&&(n[s]=l,delete t[s],i=!0)}catch(c){console.warn(`[CryptoUtils] Failed to encrypt field "${s}":`,c)}}return i&&(t._enc=n),t}async function iI(r,e){if(!r||!e||!r._enc)return r;const t={...r},n=r._enc,i=n.v==="2.1";for(const s of Bc){const o=n[s];if(o&&typeof o=="object"&&"iv"in o&&"ct"in o)try{const c=i?s:void 0,l=await qc(o.iv,o.ct,e,c);if(l!==null)if(s==="parcels")try{t[s]=JSON.parse(l)}catch{t[s]=l}else t[s]=l}catch(c){console.warn(`[CryptoUtils] Failed to decrypt field "${s}":`,c),s==="parcels"?t[s]=[]:t[s]="[복호화 실패]"}}return delete t._enc,t}async function Su(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Xa){const i=r.slice(n,n+Xa),s=await Promise.all(i.map(o=>rI(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}async function sI(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Xa){const i=r.slice(n,n+Xa),s=await Promise.all(i.map(o=>iI(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}function V0(r){const e=r;return!!(e&&e._enc&&e._enc.v)}function O0(){return[...Bc]}function M0(r){const e=[];(!r||r.length<8)&&e.push("비밀번호는 8자 이상이어야 합니다"),r&&r.length>64&&e.push("비밀번호는 64자 이하여야 합니다"),/[a-z]/.test(r)||e.push("소문자를 1개 이상 포함해야 합니다"),/[0-9]/.test(r)||e.push("숫자를 1개 이상 포함해야 합니다"),/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(r)||e.push("특수문자를 1개 이상 포함해야 합니다");let t="약함";return e.length===0&&(t=r.length>=12?"강함":"보통"),{valid:e.length===0,strength:t,errors:e}}function F0(){const r=crypto.getRandomValues(new Uint8Array(32));return po(r.buffer)}function L0(r){const e=r.replace(/[^a-zA-Z0-9\-_]/g,"");return`
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
        </div>`}function U0(r){const{prefix:e,input:t,confirmInput:n,submitBtn:i,submitColor:s="#4A90D9",extraCheck:o,verifyMode:c=!1}=r,l=document.getElementById(`${e}-strength-fill`),u=document.getElementById(`${e}-strength-text`),d=document.getElementById(`${e}-rule-length`),p=document.getElementById(`${e}-rule-lower`),g=document.getElementById(`${e}-rule-number`),I=document.getElementById(`${e}-rule-special`),P=document.getElementById(`${e}-rule-upper`);function D(V,M){V&&(V.style.color=M?"#16A34A":"#15803D",V.textContent=(M?"✓ ":"• ")+V.textContent.replace(/^[\u2713\u2022] /,""))}function T(){const V=t.value,M=V.length>=8&&V.length<=64,B=/[a-z]/.test(V),j=/[0-9]/.test(V),Q=/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(V),W=/[A-Z]/.test(V);D(d,M),D(p,B),D(g,j),D(I,Q),P&&(P.style.color=W?"#16A34A":"#9CA3AF",P.textContent=(W?"✓ ":"• ")+P.textContent.replace(/^[\u2713\u2022] /,""));const E=M&&B&&j&&Q;l&&u&&(V.length===0?(l.style.width="0",l.style.background="#E5E7EB",u.textContent="-",u.style.color="#9CA3AF"):E?c?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="입력 완료",u.style.color="#16A34A"):V.length>=12||V.length>=10&&W?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="강함",u.style.color="#16A34A"):(l.style.width="66%",l.style.background="linear-gradient(90deg, #F59E0B, #EAB308)",u.textContent="보통",u.style.color="#F59E0B"):(l.style.width="33%",l.style.background="#EF4444",u.textContent="요건 미충족",u.style.color="#EF4444"));let y=E;n&&(y=y&&V===n.value&&n.value.length>0),o&&(y=y&&o()),y?(i.disabled=!1,i.style.background=s,i.style.cursor="pointer"):(i.disabled=!0,i.style.background="#ccc",i.style.cursor="default")}return t.addEventListener("input",T),n&&n.addEventListener("input",T),{updateValidation:T}}async function B0(r,e){var n,i;const t=window;try{if((n=t.encryptionManager)!=null&&n.isReady()){const s=t.encryptionManager.getKey();if(s){const o=JSON.stringify(e),c=await $c(o,s);if(c){const l={_localEnc:!0,iv:c.iv,ct:c.ct};localStorage.setItem(r,JSON.stringify(l));return}}}localStorage.setItem(r,JSON.stringify(e))}catch(s){if(console.error("[SecureStorage] 암호화 저장 실패:",s.message),(i=t.encryptionManager)!=null&&i.isReady())throw new Error("데이터 암호화에 실패하여 저장을 중단합니다: "+s.message);localStorage.setItem(r,JSON.stringify(e))}}async function $0(r){var n;const e=window,t=localStorage.getItem(r);if(!t)return null;try{const i=JSON.parse(t);if(i&&i._localEnc&&i.iv&&i.ct){if((n=e.encryptionManager)!=null&&n.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await qc(o.iv,o.ct,s);if(c)return JSON.parse(c)}}return console.warn("[SecureStorage] 암호화된 데이터이나 키 미준비:",r),null}return i}catch(i){return console.error("[SecureStorage] 로드 실패:",r,i.message),null}}async function q0(r){var t;const e=window;if((t=e.encryptionManager)!=null&&t.isReady()){const n=e.encryptionManager.getKey();if(n){const i=typeof r=="string"?JSON.parse(r):r;if(i&&Array.isArray(i.data)){const c=i,l=await Su(c.data,n),u={...c,_fileEnc:"2.1",data:l};return JSON.stringify(u,null,2)}if(Array.isArray(i)){const c=await Su(i,n);return JSON.stringify(c,null,2)}const s=typeof r=="string"?r:JSON.stringify(r),o=await $c(s,n);if(o){const c={_localEnc:!0,iv:o.iv,ct:o.ct};return JSON.stringify(c,null,2)}}}return typeof r=="string"?r:JSON.stringify(r,null,2)}async function z0(r){var t,n;const e=window;if(!r)return null;try{const i=JSON.parse(r);if(i&&i._fileEnc&&Array.isArray(i.data)){if((t=e.encryptionManager)!=null&&t.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await sI(o.data,s),l={...o,data:c};return delete l._fileEnc,l}}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}if(i&&i._localEnc&&i.iv&&i.ct){if((n=e.encryptionManager)!=null&&n.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await qc(o.iv,o.ct,s);if(c)return JSON.parse(c)}}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}return i}catch(i){return console.error("[SecureStorage] 파일 복호화 실패:",i.message),null}}const K0={createMasterKey:N0,generateKeyFileContent:F0,validatePassword:M0,encrypt:$c,decrypt:qc,encryptRecord:rI,decryptRecord:iI,encryptRecords:Su,decryptRecords:sI,isEncrypted:V0,getSensitiveFields:O0,bufferToBase64:po,base64ToBuffer:Au,createPasswordRulesHTML:L0,bindPasswordValidation:U0,saveToLocalStorage:B0,loadFromLocalStorage:$0,encryptForFile:q0,decryptFromFile:z0,SENSITIVE_FIELDS:Bc,ENCRYPTION_VERSION:A0,PBKDF2_ITERATIONS:tI};window.CryptoUtils=K0;const oI=Symbol("recover");let de=null,pe=null,Ni=!1,at=!1,ni=null,et=null,Z=null,Za=!1,Yt=null;const aI="encryption_keyFile",cI="encryption_salt",_d="encryption_recoveryBlob",wd="encryption_sessionPw",Ru='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',ri='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',Hr=3,j0=24,G0=6e5,W0=5*60*1e3,lI=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);function uI(){if(document.getElementById("enc-modal-dark-styles"))return;const r=document.createElement("style");r.id="enc-modal-dark-styles",r.textContent=`
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
    `,document.head.appendChild(r)}function H0(r,e){if(typeof r!="string"||typeof e!="string")return!1;const t=Math.max(r.length,e.length);let n=r.length^e.length;for(let i=0;i<t;i++)n|=(r.charCodeAt(i)||0)^(e.charCodeAt(i)||0);return n===0}function hI(){var r;return(r=window.firestoreDb)!=null&&r.getCollectionName&&window.firestoreDb.getCollectionName("soil",2e3).startsWith("test_")?"test_":""}function Rt(){const r=hI();return r?r+"system":"_system"}async function Q0(r){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!0;const e=window.firebaseConfig.getDb();if(!e)return!0;const t=Rt(),n=e.collection(t).doc(`lock_${r}`);try{return await e.runTransaction(async o=>{const c=await o.get(n);if(c.exists){const l=c.data();if(Date.now()-new Date(l.lockedAt).getTime()<W0)return!1}return o.set(n,{lockedBy:lI,lockedAt:new Date().toISOString()}),!0})}catch(s){return console.warn(`[Encryption] Lock acquire failed (${r}):`,s.message),!0}}async function Y0(r){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Rt(),n=e.collection(t).doc(`lock_${r}`);try{await e.runTransaction(async s=>{const o=await s.get(n);o.exists&&o.data().lockedBy===lI&&s.delete(n)})}catch(s){console.warn(`[Encryption] Lock release failed (${r}):`,s.message)}}async function tn(){var r,e,t,n,i,s;if((r=window.firebaseConfig)!=null&&r.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Rt(),l=hI();try{const u=await o.collection(c).doc("encryptionKey").get();if(u.exists){const d=u.data();if(d.keyFileContent)return et="firebase",console.log(`[Encryption] Key loaded from Firebase ${c}/encryptionKey`),d.keyFileContent}console.log(`[Encryption] ${c}/encryptionKey not found or empty`)}catch(u){console.warn(`[Encryption] Firebase ${c} read failed:`,u.message)}if(l){const u=l+"_system";try{console.log(`[Encryption] Trying fallback: ${u}/encryptionKey...`);const d=await o.collection(u).doc("encryptionKey").get();if(d.exists&&((e=d.data())!=null&&e.keyFileContent)){et="firebase",console.log(`[Encryption] Key loaded from Firebase ${u} (fallback)`);try{await o.collection(c).doc("encryptionKey").set(d.data()),console.log(`[Encryption] Migrated encryptionKey: ${u} → ${c}`);const p=await o.collection(u).doc("recoveryBlob").get();p.exists&&(await o.collection(c).doc("recoveryBlob").set(p.data()),console.log(`[Encryption] Migrated recoveryBlob: ${u} → ${c}`))}catch(p){console.warn("[Encryption] Migration failed:",p.message)}return d.data().keyFileContent}}catch(d){console.warn(`[Encryption] ${u} fallback failed:`,d.message)}try{console.log("[Encryption] Trying fallback: _system/encryptionKey...");const d=await o.collection("_system").doc("encryptionKey").get();if(d.exists&&((t=d.data())!=null&&t.keyFileContent))return et="firebase",console.log("[Encryption] Key loaded from Firebase _system (fallback)"),d.data().keyFileContent}catch(d){console.warn("[Encryption] _system fallback failed:",d.message)}}}}if((n=window.electronAPI)!=null&&n.isElectron){try{const o=await((s=(i=window.electronAPI).readKeyFile)==null?void 0:s.call(i));if(o)return et="local",console.debug("[Encryption] Key loaded from local file"),o}catch(o){console.warn("[Encryption] Local key file not found:",o.message)}return null}try{const o=localStorage.getItem(aI);if(o)return et="local",console.log("[Encryption] Key loaded from localStorage"),o}catch(o){console.warn("[Encryption] localStorage key load failed:",o.message)}return null}async function J0(r){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Rt();try{const s=await e.collection(t).doc("encryptionKey").get();if(s.exists&&((i=s.data())!=null&&i.keyFileContent)){console.log(`[Encryption] Firebase already has key in ${t} - skip sync`);return}await e.collection(t).doc("encryptionKey").set({keyFileContent:r,createdAt:new Date().toISOString(),version:"2.0",syncedFrom:"local"}),console.log(`[Encryption] Local key synced to Firebase ${t}/encryptionKey`)}catch(s){console.warn("[Encryption] Failed to sync key to Firebase:",s.message)}}function X0(r){setTimeout(async()=>{try{confirm(`[암호화 키 파일 백업 안내]

암호화 키가 새로 생성되었습니다.
키 파일을 USB 또는 안전한 곳에 백업해두면
다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.

지금 키 파일을 백업하시겠습니까?`)&&await dI()}catch(e){console.warn("[Encryption] Key backup prompt failed:",e.message)}},1e3)}async function Z0(){var n,i,s;const r=window.CryptoUtils;if(!(r!=null&&r.generateKeyFileContent))return console.error("[Encryption] CryptoUtils.generateKeyFileContent not available"),null;const e=r.generateKeyFileContent();if(console.debug("[Encryption] New key file generated"),(n=window.firebaseConfig)!=null&&n.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Rt();try{return await o.collection(c).doc("encryptionKey").set({keyFileContent:e,createdAt:new Date().toISOString(),version:"2.0"}),console.log(`[Encryption] Key stored in Firebase ${c}/encryptionKey`),et="generated",e}catch(l){console.error("[Encryption] Failed to store key in Firebase:",l.message)}}}if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0){if((s=window.electronAPI)!=null&&s.saveKeyFile)try{const o=await window.electronAPI.saveKeyFile(e);if(o!=null&&o.success)return console.log("[Encryption] Key stored in local file (safeStorage protected)"),et="local",e}catch(o){console.error("[Encryption] Failed to store key locally:",o.message)}}else try{return localStorage.setItem(aI,e),console.log("[Encryption] Key stored in localStorage"),et="local",e}catch(o){console.warn("[Encryption] localStorage key save failed:",o.message)}return et="generated",e}async function dI(){var t,n;let r=Z;if(r||(r=await tn()),!r)return{success:!1,error:"활성화된 암호화 키가 없습니다."};if(((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&((n=window.electronAPI)!=null&&n.exportKeyFile)){const i=await window.electronAPI.exportKeyFile(r);return i!=null&&i.success?(console.log("[Encryption] Key file exported to:",i.filePath),window.showToast&&window.showToast("키 파일이 저장되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}):(i==null?void 0:i.error)==="canceled"?{success:!1,error:"취소됨"}:(console.error("[Encryption] Key export failed:",i==null?void 0:i.error),{success:!1,error:(i==null?void 0:i.error)||"내보내기 실패"})}try{const i=new Blob([r],{type:"text/plain"}),s=URL.createObjectURL(i),o=document.createElement("a");return o.href=s,o.download="sample-log.key",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(s),window.showToast&&window.showToast("키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}}catch(i){return{success:!1,error:i.message}}}async function fI(){var t,n,i;const r=((t=window.electronAPI)==null?void 0:t.isElectron)===!0;let e=null;if(r&&((n=window.electronAPI)!=null&&n.importKeyFile)){const s=await window.electronAPI.importKeyFile();if(!(s!=null&&s.success))return(s==null?void 0:s.error)==="canceled"?{success:!1,error:"취소됨"}:{success:!1,error:(s==null?void 0:s.error)||"가져오기 실패"};e=s.content||null}else try{e=await new Promise((s,o)=>{const c=document.createElement("input");c.type="file",c.accept=".key",c.onchange=async l=>{var g;const d=(g=l.target.files)==null?void 0:g[0];if(!d){o(new Error("파일 선택 취소"));return}const p=await d.text();s(p.trim())},c.click()})}catch(s){return{success:!1,error:s.message}}if(!e||e.length<20||e.length>64)return{success:!1,error:"유효하지 않은 키 파일입니다. (길이 불일치)"};if(!/^[A-Za-z0-9+/=]+$/.test(e))return{success:!1,error:"유효하지 않은 키 파일입니다. (형식 오류)"};if(r&&((i=window.electronAPI)!=null&&i.saveKeyFile))try{const s=await window.electronAPI.saveKeyFile(e);if(!(s!=null&&s.success))return{success:!1,error:"키 파일 로컬 저장 실패"}}catch(s){return{success:!1,error:"로컬 저장 실패: "+s.message}}return Z=e,et="local",console.log("[Encryption] Key file imported successfully"),window.showToast&&window.showToast("키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.","success"),{success:!0}}async function Id(){var e;const r=window.CryptoUtils;if((e=window.electronAPI)!=null&&e.loadSalt)try{const t=await window.electronAPI.loadSalt();if(t&&r)return console.log(`[Encryption] Salt loaded from Electron (${t.length} chars)`),r.base64ToBuffer(t)}catch(t){console.warn("[Encryption] Electron salt load failed:",t.message)}try{const t=localStorage.getItem(cI);if(t&&r)return console.log(`[Encryption] Salt loaded from localStorage (${t.length} chars)`),r.base64ToBuffer(t)}catch(t){console.warn("[Encryption] localStorage salt load failed:",t.message)}return console.log("[Encryption] No saved salt found"),null}async function go(r){var n;const e=window.CryptoUtils;if(!e)return;const t=e.bufferToBase64(r);if((n=window.electronAPI)!=null&&n.saveSalt)try{await window.electronAPI.saveSalt(t),console.log("[Encryption] Salt saved to Electron");return}catch(i){console.warn("[Encryption] Electron salt save failed:",i.message)}try{localStorage.setItem(cI,t),console.log("[Encryption] Salt saved to localStorage")}catch(i){console.warn("[Encryption] localStorage salt save failed:",i.message)}}async function Ed(r){var e;if((e=window.electronAPI)!=null&&e.storeSessionPassword){await window.electronAPI.storeSessionPassword(r),console.log("[Encryption] Password stored in session (main process memory)");return}try{sessionStorage.setItem(wd,r),console.log("[Encryption] Password stored in sessionStorage")}catch(t){console.warn("[Encryption] sessionStorage password store failed:",t.message)}}async function zc(){var r;if((r=window.electronAPI)!=null&&r.getSessionPassword){const e=await window.electronAPI.getSessionPassword();if(e)return console.log("[Encryption] Session password found in main process"),e}try{const e=sessionStorage.getItem(wd);if(e)return console.log("[Encryption] Session password found in sessionStorage"),e}catch(e){console.warn("[Encryption] sessionStorage password read failed:",e.message)}return null}async function mo(r){var t,n,i;const e=window.CryptoUtils;if(!((t=window.firebaseConfig)!=null&&t.isEnabled())||!window.firestoreDb)return console.log("[Encryption] Key verification skipped (no Firestore)"),{verified:!0,skipped:!0};try{const s=window.firebaseConfig.getDb();if(!s)return{verified:!0,skipped:!0};const o=["soil","water","compost","heavy-metal","pesticide"],c=new Date().getFullYear();let l=null;for(const P of o){const D=window.firestoreDb.getCollectionName(P,c);if((await s.collection(D).limit(5).get()).forEach(V=>{const M=V.data();M!=null&&M._enc&&!l&&(l=M)}),l)break}const u=l;if(!(u!=null&&u._enc))return console.log("[Encryption] Key verification: no encrypted documents found - skipping"),{verified:!0,skipped:!0};const d=u._enc,p=Object.keys(d).find(P=>P!=="v");if(!p||!((n=d[p])!=null&&n.iv)||!((i=d[p])!=null&&i.ct))return console.log("[Encryption] Key verification: no valid encrypted field found - skipping"),{verified:!0,skipped:!0};const g=d.v==="2.1";return console.log(`[Encryption] Key verification: testing decrypt of "${p}" (v${d.v||"1"}, AAD=${g})...`),e?await e.decrypt(d[p].iv,d[p].ct,r,g?p:void 0)!==null?(console.log("[Encryption] Key verification: SUCCESS"),{verified:!0,skipped:!1}):(console.warn("[Encryption] Key verification: decrypt returned null (wrong key)"),{verified:!1,skipped:!1}):{verified:!1,skipped:!1}}catch(s){return console.warn("[Encryption] Key verification FAILED:",s.message),{verified:!1,skipped:!1}}}function eD(){const r="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",e=256-256%r.length;let t="";for(;t.length<j0;){const n=crypto.getRandomValues(new Uint8Array(1));n[0]<e&&(t+=r[n[0]%r.length])}return t.match(/.{1,4}/g).join("-")}async function pI(r,e){const t=r.replace(/-/g,"").toUpperCase(),n=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:G0,hash:"SHA-256"},n,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function Kc(r){var I,P,D;const e=window.CryptoUtils;if(!e)return null;const t=eD(),n=crypto.getRandomValues(new Uint8Array(16)),i=await pI(t,n.buffer);let s;const o=await zc(),c=Z||await tn();if(o&&c&&pe){const T=await e.createMasterKey(o,c,pe,!0);s=await crypto.subtle.exportKey("raw",T.key)}else s=await crypto.subtle.exportKey("raw",r);const l=crypto.getRandomValues(new Uint8Array(12)),u=await crypto.subtle.encrypt({name:"AES-GCM",iv:l},i,s),d={version:"2.0",iv:e.bufferToBase64(l.buffer),ct:e.bufferToBase64(u),salt:e.bufferToBase64(n.buffer),createdAt:new Date().toISOString()};let p=!1;if((I=window.firebaseConfig)!=null&&I.isEnabled()){const T=window.firebaseConfig.getDb();if(T){const V=Rt();try{await T.collection(V).doc("recoveryBlob").set(d),console.log(`[Encryption] Recovery blob (v2.0) stored in ${V}/recoveryBlob`),p=!0}catch(M){console.error("[Encryption] Failed to store recovery blob in Firebase:",M.message)}}}if(((P=window.electronAPI)==null?void 0:P.isElectron)===!0&&((D=window.electronAPI)!=null&&D.saveRecoveryBlob))try{const T=await window.electronAPI.saveRecoveryBlob(JSON.stringify(d));T!=null&&T.success&&(console.log("[Encryption] Recovery blob stored locally (safeStorage protected)"),p=!0)}catch(T){console.error("[Encryption] Failed to store recovery blob locally:",T.message)}if(!p)try{localStorage.setItem(_d,JSON.stringify(d)),console.log("[Encryption] Recovery blob stored in localStorage"),p=!0}catch(T){console.error("[Encryption] Failed to store recovery blob in localStorage:",T.message)}return p?t:null}async function vd(){var e,t,n,i;if((e=window.firebaseConfig)!=null&&e.isEnabled()){const s=window.firebaseConfig.getDb();if(s){const o=Rt();try{const c=await s.collection(o).doc("recoveryBlob").get();if(c.exists&&((t=c.data())!=null&&t.ct))return!0}catch(c){console.warn("[Encryption] Recovery blob check (Firebase) failed:",c.message)}}}if(((n=window.electronAPI)==null?void 0:n.isElectron)===!0&&((i=window.electronAPI)!=null&&i.loadRecoveryBlob))try{const s=await window.electronAPI.loadRecoveryBlob();if(s){const o=JSON.parse(s);if(o!=null&&o.ct)return!0}}catch(s){console.warn("[Encryption] Recovery blob check (local) failed:",s.message)}try{const s=localStorage.getItem(_d);if(s){const o=JSON.parse(s);if(o!=null&&o.ct)return!0}}catch(s){console.warn("[Encryption] Recovery blob check (localStorage) failed:",s.message)}return!1}async function Mg(r){try{if(!await vd()){console.log("[Encryption] No recovery blob found - generating for existing user...");const t=await Kc(r);t&&(await jc(t),console.log("[Encryption] Recovery blob created for existing user"))}}catch(e){console.warn("[Encryption] ensureRecoveryBlob failed:",e.message)}}async function tD(r){var n,i,s;const e=window.CryptoUtils;if(!e)return null;let t=null;if((n=window.firebaseConfig)!=null&&n.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Rt();try{const l=await o.collection(c).doc("recoveryBlob").get();l.exists&&(t=l.data())}catch(l){console.warn("[Encryption] Recovery blob load (Firebase) failed:",l.message)}}}if(!t&&((i=window.electronAPI)==null?void 0:i.isElectron)===!0&&(s=window.electronAPI)!=null&&s.loadRecoveryBlob)try{const c=await window.electronAPI.loadRecoveryBlob();c&&(t=JSON.parse(c))}catch(c){console.warn("[Encryption] Recovery blob load (local) failed:",c.message)}if(!t)try{const o=localStorage.getItem(_d);o&&(t=JSON.parse(o),console.log("[Encryption] Recovery blob loaded from localStorage"))}catch(o){console.warn("[Encryption] Recovery blob load (localStorage) failed:",o.message)}if(!t)return console.warn("[Encryption] Recovery blob not found"),null;try{if(!t.version||!["1.0","2.0"].includes(t.version))return console.warn("[Encryption] Unknown recovery blob version:",t.version),null;if(!t.iv||!t.ct||!t.salt)return console.warn("[Encryption] Invalid recovery blob format"),null;const o=e.base64ToBuffer(t.salt),c=await pI(r,o),l=new Uint8Array(e.base64ToBuffer(t.iv)),u=e.base64ToBuffer(t.ct),d=await crypto.subtle.decrypt({name:"AES-GCM",iv:l},c,u);if(t.version==="2.0")return await crypto.subtle.importKey("raw",d,{name:"AES-GCM"},!1,["encrypt","decrypt"]);{const p=new TextDecoder().decode(d),g=await tn(),I=await Id();return!g||!I?null:(await e.createMasterKey(p,g,I)).key}}catch(o){return console.warn("[Encryption] Recovery decryption failed:",o.message),null}}function jc(r){return new Promise(e=>{const t=document.getElementById("recovery-key-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-key-modal",n.innerHTML=`
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
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-display");i&&(i.textContent=r);let s=null;const o=document.getElementById("recovery-key-copy");o&&o.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(r),o.textContent="복사됨! (30초 후 클립보드 삭제)",o.style.background="#dcfce7",o.style.borderColor="#22c55e",o.style.color="#16a34a",s&&clearTimeout(s),s=setTimeout(async()=>{try{await navigator.clipboard.readText()===r&&await navigator.clipboard.writeText("")}catch{}const l=document.getElementById("recovery-key-copy");l&&(l.textContent="복사",l.style.background="#eff6ff",l.style.borderColor="#3b82f6",l.style.color="#3b82f6")},3e4)}catch(l){console.warn("Clipboard write failed:",l)}});const c=document.getElementById("recovery-key-close");c&&c.addEventListener("click",()=>{s&&clearTimeout(s);try{navigator.clipboard.writeText("").catch(()=>{})}catch{}n.remove(),e()})})}function nD(){return new Promise(r=>{const e=d=>{Yt=null,r(d)};Yt=()=>{var d;(d=document.getElementById("recovery-input-modal"))==null||d.remove(),r(null)};const t=document.getElementById("recovery-input-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-input-modal",n.innerHTML=`
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
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-input"),s=document.getElementById("recovery-input-submit"),o=document.getElementById("recovery-input-cancel"),c=document.getElementById("recovery-input-error");i.addEventListener("input",()=>{var g;c.style.display="none";let d=i.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();d.length>24&&(d=d.substring(0,24));const p=((g=d.match(/.{1,4}/g))==null?void 0:g.join("-"))||d;i.value=p});function l(){const d=i.value.replace(/-/g,"").trim();if(d.length!==24){c.textContent="복구 키는 24자리여야 합니다.",c.style.display="block";return}n.remove(),e(d)}function u(){n.remove(),e(null)}s.addEventListener("click",l),o.addEventListener("click",u),i.addEventListener("keydown",d=>{d.key==="Enter"&&l(),d.key==="Escape"&&u()}),setTimeout(()=>i.focus(),100)})}function Qr(r){let e=document.getElementById("recovery-progress-overlay");if(e){const t=document.getElementById("recovery-progress-text");t&&(t.textContent=r),e.style.display="flex"}else{e=document.createElement("div"),e.id="recovery-progress-overlay",e.style.cssText=`
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
        `;const i=document.createElement("style");i.textContent="@keyframes encSpin { to { transform: rotate(360deg); } }",document.head.appendChild(i);const s=document.createElement("div");s.id="recovery-progress-text",s.style.cssText="font-size: 14px; color: #333;",s.textContent=r,t.appendChild(n),t.appendChild(s),e.appendChild(t),document.body.appendChild(e)}}function nr(){const r=document.getElementById("recovery-progress-overlay");r&&r.remove()}async function rD(){var s;if(!((s=window.firebaseConfig)!=null&&s.isEnabled()))return{allowed:!0,remaining:5};const t=window.firebaseConfig.getDb();if(!t)return{allowed:!0,remaining:5};const n=Rt(),i=t.collection(n).doc("recoveryAttempts");try{return await t.runTransaction(async c=>{const l=await c.get(i),u=l.exists?l.data():null;if(u){const d=new Date(u.lastAttemptAt),p=new Date,g=(p.getTime()-d.getTime())/6e4;return g>=30?(c.set(i,{count:1,lastAttemptAt:p.toISOString()}),{allowed:!0,remaining:4}):u.count>=5?{allowed:!1,remaining:0,lockoutMinutes:Math.ceil(30-g)}:(c.update(i,{count:u.count+1,lastAttemptAt:p.toISOString()}),{allowed:!0,remaining:5-u.count-1})}return c.set(i,{count:1,lastAttemptAt:new Date().toISOString()}),{allowed:!0,remaining:4}})}catch(o){return console.warn("[Encryption] Recovery attempts check failed:",o.message),{allowed:!0,remaining:5}}}async function iD(){var t;if(!((t=window.firebaseConfig)!=null&&t.isEnabled()))return;const r=window.firebaseConfig.getDb();if(!r)return;const e=Rt();try{await r.collection(e).doc("recoveryAttempts").delete()}catch(n){console.warn("[Encryption] Failed to reset recovery attempts:",n.message)}}async function Fg(r,e,t,n){var u,d;const i=window.CryptoUtils;if(!i)return;const s=await r.collection(e).get();if(s.empty)return;const o=200,c=[];s.forEach(p=>{c.push({ref:p.ref,id:p.id,data:p.data()})});const l=[];for(let p=0;p<c.length;p+=o){const g=c.slice(p,p+o),I=r.batch();let P=!1;for(const{ref:D,id:T,data:V}of g)if(V._enc)try{const M=await i.decryptRecord({...V},t),B=await i.encryptRecord(M,n);if(B._enc){const j={...B},Q=(d=(u=window.firebase)==null?void 0:u.firestore)==null?void 0:d.FieldValue;if(Q){for(const W of i.SENSITIVE_FIELDS)(!(W in j)||j[W]===void 0)&&(j[W]=Q.delete());j.updatedAt=Q.serverTimestamp()}I.set(D,j,{merge:!0}),P=!0}}catch(M){l.push(T),console.error(`[ReEncrypt] ${e}/${T}: re-encrypt failed -`,M.message)}if(l.length>0)throw new Error(`${e}: ${l.length}개 문서 재암호화 실패 (${l.join(", ")})`);P&&await I.commit()}console.log(`[ReEncrypt] ${e}: re-encrypted ${c.length} docs`)}function sD(r,e){uI();const t=window.CryptoUtils;return new Promise(n=>{var D;const i=T=>{Yt=null,n(T)};Yt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),n(null)};const s=document.getElementById("encryption-password-modal");s&&s.remove();const o=document.createElement("div");if(o.id="encryption-password-modal",o.innerHTML=`
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

                    ${((D=t==null?void 0:t.createPasswordRulesHTML)==null?void 0:D.call(t,"enc"))||""}

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
        `,document.body.appendChild(o),r){const T=document.getElementById("enc-error-msg");T&&(T.textContent=r,T.style.display="block");const V=document.getElementById("enc-password-input");V&&(V.style.borderColor="#e74c3c")}const c=document.getElementById("enc-password-input"),l=document.getElementById("enc-submit-btn"),u=document.getElementById("enc-skip-btn"),d=document.getElementById("enc-password-error");t!=null&&t.bindPasswordValidation&&t.bindPasswordValidation({prefix:"enc",input:c,submitBtn:l,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const p=document.getElementById("enc-toggle-pw");p&&p.addEventListener("click",()=>{const T=c.type==="password";c.type=T?"text":"password",p.innerHTML=T?Ru:ri}),c.addEventListener("focus",()=>{c.style.borderColor="#22C55E",c.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),c.addEventListener("blur",()=>{c.style.borderColor="#D1D5DB",c.style.boxShadow="none"}),c.addEventListener("input",()=>{d.style.display="none"});async function g(){const T=c.value;if(!T){d.textContent="비밀번호를 입력해주세요.",d.style.display="block";return}if(e){l.disabled=!0,l.textContent="검증 중...",c.disabled=!0;const V=document.getElementById("enc-error-msg");V&&(V.style.display="none");try{const M=await e(T);if(M.valid)o.remove(),i(T);else if(M.exhausted)o.remove(),i(null);else{c.disabled=!1,l.textContent="확인",V&&(V.textContent=M.error||"비밀번호가 올바르지 않습니다.",V.style.display="block"),c.value="",c.style.borderColor="#e74c3c",c.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",c.focus();const B=o.querySelector("div > div");B&&(B.style.animation="none",B.offsetHeight,B.style.animation="enc-shake 0.4s ease")}}catch(M){c.disabled=!1,l.textContent="확인",V&&(V.textContent="검증 중 오류: "+(M.message||"알 수 없는 오류"),V.style.display="block"),c.focus()}return}o.remove(),i(T)}function I(){o.remove(),i(null)}l.addEventListener("click",g),u.addEventListener("click",I),c.addEventListener("keydown",T=>{T.key==="Enter"&&!l.disabled&&g(),T.key==="Escape"&&I()}),vd().then(T=>{const V=document.getElementById("enc-recover-link");V&&T&&(V.style.display="block")}).catch(T=>{console.debug("[Encryption] Recovery blob check for link display failed:",T.message)});const P=document.getElementById("enc-recover-btn");P&&P.addEventListener("click",T=>{T.preventDefault(),o.remove(),i(oI)}),setTimeout(()=>c.focus(),100)})}function gI(){uI();const r=window.CryptoUtils;return new Promise(e=>{var D;const t=T=>{Yt=null,e(T)};Yt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),e(null)};const n=document.getElementById("encryption-password-modal");n&&n.remove();const i=document.createElement("div");i.id="encryption-password-modal",i.innerHTML=`
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

                    ${((D=r==null?void 0:r.createPasswordRulesHTML)==null?void 0:D.call(r,"enc"))||""}

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
        `,document.body.appendChild(i);const s=document.getElementById("enc-password-input"),o=document.getElementById("enc-password-confirm"),c=document.getElementById("enc-submit-btn"),l=document.getElementById("enc-skip-btn"),u=document.getElementById("enc-password-error");r!=null&&r.bindPasswordValidation&&r.bindPasswordValidation({prefix:"enc",input:s,confirmInput:o,submitBtn:c,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)"});const d=document.getElementById("enc-toggle-pw");d&&d.addEventListener("click",()=>{const T=s.type==="password";s.type=T?"text":"password",d.innerHTML=T?Ru:ri});const p=document.getElementById("enc-toggle-pw-confirm");p&&p.addEventListener("click",()=>{const T=o.type==="password";o.type=T?"text":"password",p.innerHTML=T?Ru:ri}),[s,o].forEach(T=>{T.addEventListener("focus",()=>{T.style.borderColor="#22C55E",T.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),T.addEventListener("blur",()=>{T.style.borderColor="#D1D5DB",T.style.boxShadow="none"})}),s.addEventListener("input",()=>{u.style.display="none"}),o.addEventListener("input",()=>{u.style.display="none"});function g(T){u.textContent=T,u.style.display="block"}function I(){const T=s.value,V=o.value;if(r!=null&&r.validatePassword){const M=r.validatePassword(T);if(!M.valid){g(M.errors[0]);return}}if(T!==V){g("비밀번호가 일치하지 않습니다.");return}i.remove(),t(T)}function P(){i.remove(),t(null)}c.addEventListener("click",I),l.addEventListener("click",P),o.addEventListener("keydown",T=>{T.key==="Enter"&&!c.disabled&&I(),T.key==="Escape"&&P()}),s.addEventListener("keydown",T=>{T.key==="Escape"&&P()}),setTimeout(()=>s.focus(),100)})}async function oD(r){const e=window.CryptoUtils;if(!e)return!1;console.log("[Encryption] === FIRST-TIME SETUP ===");const t=await gI();if(!t)return console.warn("[Encryption] First-time setup skipped by user"),Z=null,!1;console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const n=await e.createMasterKey(t,Z,pe);de=n.key,pe=n.salt,r&&(console.log("[Encryption] Saving new salt..."),await go(pe)),await Ed(t);try{const i=await Kc(de);i&&await jc(i)}catch(i){console.warn("[Encryption] Recovery key generation failed:",i.message)}return Z&&X0(),console.log("[Encryption] First-time setup SUCCESS (verification skipped - no existing encrypted data)"),Z=null,Za=!1,!0}async function aD(r){var o;const e=window.CryptoUtils;if(!e)return!1;const t=await zc();if(t){console.log("[Encryption] Auto-login with stored session password...");const c=await e.createMasterKey(t,Z,pe);if(de=c.key,pe=c.salt,r&&await go(pe),(await mo(de)).verified)return await Mg(de),Z=null,console.log("[Encryption] Auto-login SUCCESS (session password)"),!0;console.warn("[Encryption] Stored session password is invalid - clearing"),de=null,(o=window.electronAPI)!=null&&o.clearSessionPassword&&await window.electronAPI.clearSessionPassword()}let n=0,i=null;const s=async c=>{console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const l=await e.createMasterKey(c,Z,pe);return de=l.key,pe=l.salt,r&&n===0&&(console.log("[Encryption] Saving new salt..."),await go(pe)),console.log("[Encryption] Verifying key against encrypted data..."),(await mo(de)).verified?{valid:!0}:(n++,de=null,console.warn(`[Encryption] Key verification failed (attempt ${n}/${Hr})`),n>=Hr?{valid:!1,error:`비밀번호 시도 횟수를 초과했습니다. (${Hr}회)`,exhausted:!0}:{valid:!1,error:`비밀번호가 올바르지 않습니다. (${n}/${Hr})`})};for(;n<Hr;){console.log(`[Encryption] Password prompt (attempt ${n+1}/${Hr})...`);const c=await sD(i,s);if(!c)return console.warn("[Encryption] Password skipped - encryption disabled"),Z=null,!1;if(c===oI){console.log("[Encryption] Password recovery requested from login prompt");try{const l=await yI();if(l!=null&&l.success)return console.log("[Encryption] Password recovered successfully"),!0;i=(l==null?void 0:l.error)==="Cancelled"?null:"비밀번호 복구에 실패했습니다. 다시 시도해주세요."}catch(l){console.error("[Encryption] Recovery error:",l),i="비밀번호 복구 중 오류: "+(l.message||"알 수 없는 오류")}continue}return await Ed(c),await Mg(de),Z=null,console.log(`[Encryption] Login SUCCESS (source: ${et})`),!0}return console.error("[Encryption] All password attempts exhausted"),Z=null,de=null,!1}async function mI(){return Ni?!!de:at?ni||!1:(at=!0,ni=cD().finally(()=>{ni=null}),ni)}async function cD(){var e;if(!window.CryptoUtils)return console.warn("[Encryption] CryptoUtils not loaded"),at=!1,!1;try{if(console.log("[Encryption] Step 1: Loading key file..."),Z=await tn(),Z||(e=window.firebaseConfig)!=null&&e.isEnabled()&&(console.log("[Encryption] Retrying Firebase key load..."),Z=await tn()),!Z&&(console.log("[Encryption] No existing key found - starting first-time setup"),Za=!0,Z=await Z0(),!Z))return console.error("[Encryption] Failed to generate key file"),!1;console.debug(`[Encryption] Key ready (source: ${et})`),et==="local"&&(console.log("[Encryption] Key loaded from local - syncing to Firebase..."),await J0(Z)),console.log("[Encryption] Step 2: Loading salt..."),pe=await Id();const t=!pe;console.log(pe?`[Encryption] Salt loaded (${new Uint8Array(pe).length} bytes)`:"[Encryption] No saved salt - will generate new one");let n;return Za?n=await oD(t):n=await aD(t),n&&(Ni=!0),at=!1,n}catch(t){return console.error("[Encryption] Init FAILED:",t.message),console.error("[Encryption] Stack:",t.stack),Z=null,at=!1,!1}}async function lD(){const r=window.CryptoUtils;if(Ni)return!!de;if(at)return ni||!1;if(at=!0,!r)return at=!1,!1;try{const e=await zc();if(!e)return console.log("[Encryption] Silent init: no session password - skipping"),at=!1,!1;if(Z=await tn(),!Z)return at=!1,!1;pe=await Id();const t=!pe,n=await r.createMasterKey(e,Z,pe);return de=n.key,pe=n.salt,t&&await go(pe),(await mo(de)).verified?(Ni=!0,Z=null,console.log("[Encryption] Silent init SUCCESS"),at=!1,!0):(de=null,Z=null,at=!1,!1)}catch(e){return console.warn("[Encryption] Silent init failed:",e.message),Z=null,at=!1,!1}}async function yI(){var t,n,i;const r=window.CryptoUtils;if(!r)return{success:!1,error:"CryptoUtils not available"};if(!await Q0("passwordChange"))return window.showToast&&window.showToast("다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요.","warning"),{success:!1,error:"Another password operation in progress"};try{let o=0,c=null;for(;o<3;){const l=await rD();if(!l.allowed)return window.showToast&&window.showToast(`복구 시도 횟수를 초과했습니다.
${l.lockoutMinutes}분 후에 다시 시도해주세요.`,"error"),{success:!1,error:"Rate limited"};const u=await nD();if(!u)return{success:!1,error:"Cancelled"};if(Qr("복구 키 검증 중..."),c=await tD(u),c)break;if(o++,nr(),o>=3)return window.showToast&&window.showToast("복구 키 시도 횟수를 초과했습니다. (3회)","error"),{success:!1,error:"Max retries exceeded"};window.showToast&&window.showToast("복구 키가 올바르지 않습니다. ("+o+"/3)"+(l.remaining>0?`
남은 전체 시도: `+l.remaining+"회":""),"error")}Qr("마스터 키 검증 중...");try{if(!(await mo(c)).verified)return nr(),window.showToast&&window.showToast(`복구된 키로 데이터를 검증할 수 없습니다.
복구 블롭이 오래되었거나 손상되었을 수 있습니다.`,"error"),{success:!1,error:"Key verification failed"};await iD(),Qr("키 파일 로드 중...");let u=Z||await tn();if(!u){if(nr(),((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&confirm(`키 파일을 찾을 수 없습니다.
키 파일을 가져오시겠습니까?`)){const B=await fI();B!=null&&B.success&&(u=Z||await tn())}if(!u)return window.showToast&&window.showToast(`키 파일을 불러올 수 없습니다.
키 파일 내보내기로 백업한 .key 파일을 가져오거나,
Firebase 연결을 확인해주세요.`,"error"),{success:!1,error:"Key file not found"}}nr();const d=await gI();if(!d)return{success:!1,error:"New password cancelled"};Qr("새 마스터 키 생성 중...");const p=await r.createMasterKey(d,u,null),g=p.key,I=p.salt,P=c,D=[];try{if((n=window.firebaseConfig)!=null&&n.isEnabled()&&window.firestoreDb){const V=window.firebaseConfig.getDb();if(V){const M=["soil","water","pesticide","compost","heavyMetal"],B=new Date().getFullYear();let j=0;const Q=M.length*(B-2020+1);for(const W of M)for(let E=2020;E<=B;E++){j++,Qr(`데이터 재암호화 중... (${j}/${Q})`);const y=window.firestoreDb.getCollectionName(W,E);await Fg(V,y,P,g),D.push(y)}}}}catch(V){console.error("[Encryption] Recovery re-encryption failed, rolling back...",V);const M=[];if(D.length>0&&((i=window.firebaseConfig)!=null&&i.isEnabled())){const B=window.firebaseConfig.getDb();if(B)for(const j of D)try{await Fg(B,j,g,P)}catch(Q){console.error(`[Encryption] Rollback FAILED: ${j}`,Q.message),M.push(j)}}return nr(),M.length>0?window.showToast&&window.showToast(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${M.join(", ")}. 관리자에게 문의하세요.`,"error"):window.showToast&&window.showToast("재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요.","error"),{success:!1,error:"Re-encryption failed, rolled back"}}Qr("설정 저장 중..."),pe=I,await go(I),de=g,Ni=!0,Z=null,await Ed(d);const T=await Kc(g);return nr(),T&&await jc(T),console.log("[Encryption] Password recovery completed successfully"),window.showToast&&window.showToast("비밀번호가 성공적으로 복구되었습니다.","success"),{success:!0}}catch(l){return nr(),console.error("[Encryption] Password recovery failed:",l),window.showToast&&window.showToast("비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요.","error"),{success:!1,error:l.message}}}finally{await Y0("passwordChange")}}async function uD(){return de?{success:!1,error:"Not implemented in abbreviated version"}:(window.showToast&&window.showToast("암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요.","warning"),{success:!1,error:"Encryption not active"})}async function hD(r){const e=window.CryptoUtils;if(!r||typeof r!="string")return!1;const t=await zc();if(t&&H0(r,t))return!0;try{const n=Z||await tn();if(!n||!pe||!e)return!1;const i=await e.createMasterKey(r,n,pe);return(await mo(i.key)).verified}catch(n){return console.warn("[Encryption] verifyPassword failed:",n.message),!1}}async function dD(){return de?!0:(console.warn("[Encryption] verifyPasswordForExport: no active key"),!1)}async function fD(){if(!de)return{success:!1,message:"암호화가 활성화되지 않았습니다."};try{const r=await Kc(de);return r?(await jc(r),{success:!0,message:"복구 키가 재발급되었습니다."}):{success:!1,message:"복구 키 생성에 실패했습니다."}}catch(r){return console.error("[Encryption] regenerateRecoveryKey error:",r),{success:!1,message:r.message}}}function pD(){return!!de}function gD(){return de}function mD(){return et}function Td(){if(de=null,Z&&typeof Z=="string")try{const r=crypto.getRandomValues(new Uint8Array(Z.length));Z=String.fromCharCode(...r)}catch{}Z=null,pe=null,Ni=!1,at=!1,ni=null,et=null,Za=!1;try{sessionStorage.removeItem(wd)}catch{}}function yD(){Td()}async function _D(){var r;if(console.log("[Encryption] === KEY REGENERATION ==="),(r=window.firebaseConfig)!=null&&r.isEnabled()){const e=window.firebaseConfig.getDb();if(e){const t=Rt();try{await e.collection(t).doc("encryptionKey").delete(),console.log(`[Encryption] Deleted ${t}/encryptionKey from Firebase`)}catch(n){console.warn("[Encryption] Firebase key delete failed:",n.message)}}}return Td(),await mI()}function _I(){Yt&&(Yt(),Yt=null)}const wD={init:mI,initSilent:lD,isReady:pD,getKey:gD,getKeySource:mD,destroy:Td,reset:yD,regenerateKey:_D,verifyPassword:hD,verifyPasswordForExport:dD,changePassword:uD,recoverPassword:yI,checkRecoveryBlobExists:vd,regenerateRecoveryKey:fD,exportKeyFile:dI,importKeyFile:fI,_cleanupModal:_I};window.encryptionManager=wD;window.addEventListener("beforeunload",()=>{_I()});var ID={};const wI=(()=>{var r;if(typeof process<"u"&&ID)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),$e=(...r)=>{wI&&console.log("[Firestore]",...r)},ws={maxRetries:3,retryDelay:2e3,maxDelay:8e3};async function Gc(r,e){let t;for(let n=1;n<=ws.maxRetries;n++)try{return await r()}catch(i){t=i;const s=["permission-denied","unauthenticated","invalid-argument","not-found"],o=i.code;if(o&&s.includes(o)){$e(`재시도 불가 에러 (${e}):`,o);break}if(n<ws.maxRetries){const c=Math.min(ws.retryDelay*Math.pow(2,n-1),ws.maxDelay);$e(`${e} 실패 (${n}/${ws.maxRetries}), ${c}ms 후 재시도:`,o||i.message),await new Promise(l=>setTimeout(l,c))}}throw $e(`${e} 최종 실패:`,t),t}const Lg="test_",ED={soil:"soilSamples",water:"waterSamples",compost:"compostSamples",heavyMetal:"heavyMetalSamples","heavy-metal":"heavyMetalSamples",pesticide:"pesticideSamples"};function Fr(r,e){const t=ED[r]||r,n=`${Lg}${t}_${e}`;return wI&&console.log(`[Firestore] Collection name: ${n} (prefix: "${Lg}", base: ${t}, year: ${e})`),n.startsWith("test_")?n:(console.warn(`[Firestore] WARNING: Collection name missing 'test_' prefix: ${n}`),console.warn("[Firestore] Forcing test_ prefix..."),`test_${t}_${e}`)}function Uo(r){return r==null?"":String(r)}function vD(r){return Array.isArray(r)?r.map(e=>({...e,id:Uo(e.id)})):r}async function Pu(r,e,t,n){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!1;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>Pu(r,e,t,n),{type:"firebase-save",description:`${r} ${e}년 문서 ${t} 저장`,sampleType:r,year:e,docId:t}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;try{return await Gc(async()=>{const s=window.firebaseConfig.getDb();if(!s)return!1;const o=Fr(r,e),c=Uo(t),l={...n,id:c,updatedAt:Ue.firestore.FieldValue.serverTimestamp()};return l.createdAt||(l.createdAt=Ue.firestore.FieldValue.serverTimestamp()),await s.collection(o).doc(c).set(l,{merge:!0}),$e(`저장 완료: ${o}/${c}`),!0},"saveDocument")}catch(s){return window.networkStatus&&window.networkStatus.queueOperation(()=>Pu(r,e,t,n),{type:"firebase-save",description:`${r} ${e}년 문서 ${t} 저장 (재시도)`,sampleType:r,year:e,docId:t}),window.ErrorHandler&&window.ErrorHandler.handle(s,"FIREBASE_SYNC",{silent:!1}),!1}}async function TD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=Fr(r,e),c=await s.collection(o).doc(t).get();return c.exists?{id:c.id,...c.data()}:null}catch(s){return window.ErrorHandler?window.ErrorHandler.handle(s,"FIREBASE_LOAD",{silent:!0}):(((i=window.logger)==null?void 0:i.error)||console.error)("Firestore 조회 실패:",s),null}}async function bD(r,e,t={}){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return[];try{return await Gc(async()=>{const i=window.firebaseConfig.getDb();if(!i)return[];const s=Fr(r,e),o=await i.collection(s).get(),c=[];return o.forEach(l=>{const u=l.data();c.push({...u,id:Uo(u.id||l.id)})}),c.length>0&&c.sort((l,u)=>{var g,I,P,D;const d=((g=l.createdAt)==null?void 0:g.seconds)||((I=l.updatedAt)==null?void 0:I.seconds)||0,p=((P=u.createdAt)==null?void 0:P.seconds)||((D=u.updatedAt)==null?void 0:D.seconds)||0;return d-p}),$e(`조회 완료: ${s}, ${c.length}건`),vD(c)},"getAllDocuments")}catch(i){return window.ErrorHandler&&window.ErrorHandler.handle&&window.ErrorHandler.handle(i,"FIREBASE_LOAD",{silent:!0}),[]}}async function Cu(r,e,t){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return!1;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>Cu(r,e,t),{type:"firebase-delete",description:`${r} ${e}년 문서 ${t} 삭제`,sampleType:r,year:e,docId:t}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;try{return await Gc(async()=>{const i=window.firebaseConfig.getDb();if(!i)return!1;const s=Fr(r,e),o=Uo(t),c=parseInt(o,10);if(!o)return!1;const l=i.collection(s).doc(o);if((await l.get()).exists)return await l.delete(),$e(`삭제 완료: ${s}/${o}`),!0;let d=await i.collection(s).where("id","==",o).get();if(d.empty&&!isNaN(c)&&(d=await i.collection(s).where("id","==",c).get()),d.empty)return $e(`삭제 대상 없음: ${s}/${o}`),!1;const p=[];return d.forEach(g=>{p.push(g.ref.delete())}),await Promise.all(p),$e(`삭제 완료 (쿼리): ${s}/${o} (${d.size}건)`),!0},"deleteDocument")}catch(i){return window.networkStatus&&window.networkStatus.queueOperation(()=>Cu(r,e,t),{type:"firebase-delete",description:`${r} ${e}년 문서 ${t} 삭제 (재시도)`,sampleType:r,year:e,docId:t}),window.ErrorHandler&&window.ErrorHandler.handle(i,"FIREBASE_SYNC",{silent:!1}),!1}}async function ec(r,e,t,n={}){var o;if(!((o=window.firebaseConfig)!=null&&o.isEnabled())||!t.length)return!1;const{signal:i}=n;if(window.networkStatus&&typeof window.networkStatus.queueOperation=="function"&&!window.networkStatus.isOnline)return window.networkStatus.queueOperation(()=>ec(r,e,t,n),{type:"firebase-batch",description:`${r} ${e}년 데이터 ${t.length}건 일괄 동기화`,sampleType:r,year:e,count:t.length}),typeof window.showToast=="function"&&window.showToast("오프라인 상태입니다. 나중에 동기화됩니다.","warning"),!0;const s="firebaseBatchSave";try{return await Gc(async()=>{const c=window.firebaseConfig.getDb();if(!c)return!1;const l=Fr(r,e),u=500,d=[];for(let p=0;p<t.length;p+=u)d.push(t.slice(p,p+u));$e(`배치 저장 시작: ${l}, ${t.length}건 (${d.length} 청크)`),window.loadingManager&&window.loadingManager.show(s,`Firebase 동기화 중... (0/${d.length})`,{showProgress:!0,cancellable:!0,onCancel:()=>{$e("사용자가 배치 저장을 취소했습니다.")}});for(let p=0;p<d.length;p++){if(i!=null&&i.aborted)throw $e("배치 저장이 취소되었습니다."),new DOMException("작업이 취소되었습니다.","AbortError");const g=d[p],I=c.batch();g.forEach(D=>{const T=Uo(D.id),V=c.collection(l).doc(T),M={...D,id:T,updatedAt:Ue.firestore.FieldValue.serverTimestamp()};M.createdAt||(M.createdAt=Ue.firestore.FieldValue.serverTimestamp()),I.set(V,M,{merge:!0})}),await I.commit();const P=(p+1)/d.length*100;window.loadingManager&&window.loadingManager.updateProgress(s,P,`Firebase 동기화 중... (${p+1}/${d.length})`),$e(`배치 진행률: ${Math.round(P)}% (${p+1}/${d.length} 청크)`)}return $e(`배치 저장 완료: ${t.length}건`),!0},"batchSave")}catch(c){return c.name==="AbortError"?(typeof window.showToast=="function"&&window.showToast("동기화가 취소되었습니다.","info"),!1):(window.networkStatus&&window.networkStatus.queueOperation(()=>ec(r,e,t,n),{type:"firebase-batch",description:`${r} ${e}년 데이터 ${t.length}건 일괄 동기화 (재시도)`,sampleType:r,year:e,count:t.length}),window.ErrorHandler&&window.ErrorHandler.handle(c,"FIREBASE_SYNC",{silent:!1}),!1)}finally{window.loadingManager&&window.loadingManager.hide(s)}}async function AD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return{success:!1,count:0};try{const s=localStorage.getItem(t);if(!s)return $e("마이그레이션할 데이터가 없습니다."),{success:!0,count:0};const o=JSON.parse(s);if(!Array.isArray(o)||o.length===0)return{success:!0,count:0};const c=o.map(l=>({...l,id:l.id||RD()}));return await ec(r,e,c),$e(`마이그레이션 완료: ${t} → Firestore (${c.length}건)`),{success:!0,count:c.length}}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("마이그레이션 실패:",s),{success:!1,count:0}}}function SD(){return typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),r=>r.toString(36)).join("").substring(0,9)}function RD(){return SD()}function PD(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=Fr(r,e),c=s.collection(o).onSnapshot(l=>{const u=[];l.forEach(d=>{u.push({id:d.id,...d.data()})}),t(u,l.metadata.fromCache)},l=>{var u;(((u=window.logger)==null?void 0:u.error)||console.error)("실시간 동기화 에러:",l)});return $e(`실시간 동기화 시작: ${o}`),c}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("실시간 동기화 설정 실패:",s),null}}function CD(){var r;return((r=window.firebaseConfig)==null?void 0:r.isEnabled())===!0}function kD(){var r;return((r=window.firebaseConfig)==null?void 0:r.isOfflineSupported())===!0}window.firestoreDb={init:async function(){return $e("firestoreDb.init() 호출됨 (no-op)"),!0},save:Pu,get:TD,getAll:bD,delete:Cu,batchSave:ec,migrate:AD,subscribe:PD,isEnabled:CD,isOfflineEnabled:kD,getCollectionName:Fr};const Ee={LOCAL_ONLY:"local",CLOUD_SYNC:"cloud",CLOUD_ONLY:"cloudOnly"};let tt=Ee.LOCAL_ONLY;const DD=(...r)=>{},ln={lastSyncTime:null,pendingChanges:0,isOnline:navigator.onLine};window.addEventListener("online",()=>{ln.isOnline=!0,II()});window.addEventListener("offline",()=>{ln.isOnline=!1});async function xD(){var n,i,s;const r=localStorage.getItem("storageMode"),e=Object.values(Ee);let t=!1;if((n=window.firebaseConfig)!=null&&n.initialize)try{await window.firebaseConfig.initialize()&&(await((i=window.firestoreDb)==null?void 0:i.init()),t=!0)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Storage] Firebase 초기화 실패:",o)}return r&&e.includes(r)?(r===Ee.CLOUD_SYNC||r===Ee.CLOUD_ONLY)&&!t?tt=Ee.LOCAL_ONLY:tt=r:tt=t?Ee.CLOUD_SYNC:Ee.LOCAL_ONLY,tt}function ND(r){var t;return Object.values(Ee).includes(r)?(r===Ee.CLOUD_SYNC||r===Ee.CLOUD_ONLY)&&!((t=window.firestoreDb)!=null&&t.isEnabled())?{success:!1,message:"Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다."}:(tt=r,localStorage.setItem("storageMode",r),window.dispatchEvent(new CustomEvent("storage-mode-changed",{detail:{mode:r}})),{success:!0,message:`저장 모드가 변경되었습니다: ${r}`}):{success:!1,message:`유효하지 않은 모드: ${r}`}}function VD(){var e;const r=((e=window.firestoreDb)==null?void 0:e.isEnabled())||!1;return[{value:Ee.LOCAL_ONLY,label:"로컬 저장소만",description:"이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.",available:!0},{value:Ee.CLOUD_SYNC,label:"클라우드 동기화",description:"로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.",available:r},{value:Ee.CLOUD_ONLY,label:"클라우드 전용",description:"Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.",available:r}]}async function OD(r,e,t,n){var i,s;try{if(localStorage.setItem(t,JSON.stringify(n)),DD(`localStorage 저장: ${t}`),tt===Ee.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())){const o=n.map(c=>({...c,id:c.id||bd()}));await window.firestoreDb.batchSave(r,e,o),ln.lastSyncTime=new Date}return!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("데이터 저장 실패:",o),!1}}async function MD(r,e,t,n){var i,s;try{const o=JSON.parse(localStorage.getItem(t)||"[]"),c={...n,id:n.id||bd()},l=o.findIndex(u=>u.id===c.id);return l>=0?o[l]=c:o.push(c),localStorage.setItem(t,JSON.stringify(o)),tt===Ee.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.save(r,e,c.id,c),ln.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 저장 실패:",o),!1}}async function FD(r,e,t){var n,i;try{if(tt===Ee.CLOUD_SYNC&&((n=window.firestoreDb)!=null&&n.isEnabled())){const o=await window.firestoreDb.getAll(r,e);if(o.length>0)return localStorage.setItem(t,JSON.stringify(o)),ln.lastSyncTime=new Date,o}const s=localStorage.getItem(t);return s?JSON.parse(s):[]}catch(s){(((i=window.logger)==null?void 0:i.error)||console.error)("데이터 로드 실패:",s);const o=localStorage.getItem(t);return o?JSON.parse(o):[]}}async function LD(r,e,t,n){var i,s;try{const c=JSON.parse(localStorage.getItem(t)||"[]").filter(l=>l.id!==n);return localStorage.setItem(t,JSON.stringify(c)),tt===Ee.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.delete(r,e,n),ln.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 삭제 실패:",o),!1}}function UD(r,e,t,n){var i;return tt!==Ee.CLOUD_SYNC||!((i=window.firestoreDb)!=null&&i.isEnabled())?null:window.firestoreDb.subscribe(r,e,(s,o)=>{localStorage.setItem(t,JSON.stringify(s)),n(s,o),o||(ln.lastSyncTime=new Date)})}async function BD(r,e,t){return tt!==Ee.CLOUD_SYNC?{success:!1,count:0,message:"클라우드 동기화 모드가 아닙니다."}:await window.firestoreDb.migrate(r,e,t)}async function II(){tt!==Ee.CLOUD_SYNC||!ln.isOnline||window.dispatchEvent(new CustomEvent("storage-sync-requested"))}function bd(){var r;return typeof window<"u"&&((r=window.SampleUtils)!=null&&r.generateUUID)?window.SampleUtils.generateUUID():typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),e=>e.toString(36)).join("").substring(0,9)}function $D(){return tt}function qD(){var r,e;return{...ln,mode:tt,isCloudEnabled:((r=window.firestoreDb)==null?void 0:r.isEnabled())||!1,isOfflineSupported:((e=window.firestoreDb)==null?void 0:e.isOfflineEnabled())||!1}}function zD(){return tt===Ee.CLOUD_SYNC}window.storageManager={init:xD,save:OD,saveItem:MD,load:FD,delete:LD,subscribe:UD,migrate:BD,sync:II,getMode:$D,setMode:ND,getAvailableModes:VD,getStatus:qD,isCloudEnabled:zD,generateId:bd,MODES:Ee}});export default KD();
