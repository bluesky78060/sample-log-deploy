window.NETWORK_CONFIG={ALLOWED_GATEWAY:"111.21.101.254"};const pu={STORAGE_KEY:"networkAccessConfig",GATEWAY_STORAGE_KEY:"networkGatewayIP",getAllowedGateway(){var r;try{const e=localStorage.getItem(this.GATEWAY_STORAGE_KEY);if(e)return e}catch{}return((r=window.NETWORK_CONFIG)==null?void 0:r.ALLOWED_GATEWAY)||null},saveGateway(r){try{localStorage.setItem(this.GATEWAY_STORAGE_KEY,r),window.logger&&window.logger.info("[NetworkAccess] 게이트웨이 저장됨:",r)}catch(e){window.logger&&window.logger.error("[NetworkAccess] 게이트웨이 저장 실패:",e)}},removeGateway(){try{localStorage.removeItem(this.GATEWAY_STORAGE_KEY),window.logger&&window.logger.info("[NetworkAccess] 게이트웨이 삭제됨")}catch{}},defaultConfig:{adminIPs:[],timeout:5e3},_currentIP:null,_lastCheck:null,_cacheTimeout:6e4,loadConfig(){try{const r=localStorage.getItem(this.STORAGE_KEY);if(r)return{...this.defaultConfig,...JSON.parse(r)}}catch(r){window.logger&&window.logger.error("[NetworkAccess] 설정 로드 실패:",r)}return{...this.defaultConfig}},saveConfig(r){try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(r)),window.logger&&window.logger.info("[NetworkAccess] 설정 저장됨:",r)}catch(e){window.logger&&window.logger.error("[NetworkAccess] 설정 저장 실패:",e)}},async getCurrentIP(r){if(this._currentIP&&this._lastCheck&&Date.now()-this._lastCheck<this._cacheTimeout)return this._currentIP;const e=r||this.loadConfig().timeout;try{const t=new AbortController,n=setTimeout(()=>t.abort(),e),i=await fetch("https://api.ipify.org?format=json",{signal:t.signal});clearTimeout(n);const s=await i.json();return this._currentIP=s.ip,this._lastCheck=Date.now(),window.logger&&window.logger.info("[NetworkAccess] 현재 IP:",this._currentIP),this._currentIP}catch(t){return window.logger&&window.logger.warn("[NetworkAccess] IP 조회 실패:",t.message),null}},getSubnetPrefix(r){if(!r)return"";const e=r.split(".");return e.length!==4?"":e.slice(0,3).join(".")+"."},async checkAccess(){var i;if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0)return{allowed:!0,reason:"Electron 환경 (항상 허용)",ip:null};if(window.location.protocol==="file:")return{allowed:!0,reason:"Electron 로컬 실행",ip:null};const r=this.getAllowedGateway();if(!r)return window.logger&&window.logger.warn("[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요"),{allowed:!1,reason:"게이트웨이 미설정",ip:null,needsSetup:!0};const e=this.getSubnetPrefix(r),t=await this.getCurrentIP();if(!t)return window.logger&&window.logger.warn("[NetworkAccess] IP 확인 불가 - 접근 거부"),{allowed:!1,reason:"IP 확인 불가",ip:null};if(t.startsWith(e))return window.logger&&window.logger.info("[NetworkAccess] 허용된 네트워크:",t),{allowed:!0,reason:`허용된 네트워크 (${r})`,ip:t};const n=this.loadConfig();return n.adminIPs&&n.adminIPs.includes(t)?{allowed:!0,reason:"관리자 IP",ip:t}:(window.logger&&window.logger.warn("[NetworkAccess] 허용되지 않은 네트워크:",t),{allowed:!1,reason:`허용되지 않은 네트워크 (허용: ${e}x)`,ip:t})},async isAllowed(){return(await this.checkAccess()).allowed},addAdminIP(r){const e=this.loadConfig();e.adminIPs.includes(r)||(e.adminIPs.push(r),this.saveConfig(e))},removeAdminIP(r){const e=this.loadConfig();e.adminIPs=e.adminIPs.filter(t=>t!==r),this.saveConfig(e)},async registerCurrentAsAdmin(){const r=await this.getCurrentIP();return r?(this.addAdminIP(r),r):null},resetConfig(){localStorage.removeItem(this.STORAGE_KEY),localStorage.removeItem(this.GATEWAY_STORAGE_KEY),this._currentIP=null,this._lastCheck=null,window.logger&&window.logger.info("[NetworkAccess] 설정 초기화됨")},async printStatus(){var s;const r=this.loadConfig(),e=await this.getCurrentIP(),t=await this.checkAccess(),n=((s=window.electronAPI)==null?void 0:s.isElectron)===!0||window.location.protocol==="file:",i=this.getAllowedGateway();return console.log("========================================"),window.logger&&window.logger.info("[NetworkAccess] 현재 상태"),console.log("========================================"),console.log("환경:",n?"Electron (네트워크 체크 안함)":"웹 (네트워크 체크 활성화)"),console.log("허용된 게이트웨이:",i||"설정 없음"),console.log("허용된 서브넷:",i?this.getSubnetPrefix(i)+"x":"없음"),console.log("현재 공인 IP:",e||"확인 불가"),console.log("접근 허용:",t.allowed,`(${t.reason})`),console.log("관리자 IP (예외):",r.adminIPs||[]),console.log("========================================"),{config:r,currentIP:e,access:t,isElectron:n,allowedGateway:i}},showGatewaySetupModal(){return new Promise(r=>{const e=document.getElementById("gatewaySetupModal");e&&e.remove();const t=document.documentElement.getAttribute("data-theme")==="dark",n=document.createElement("div");n.id="gatewaySetupModal",n.style.cssText=`
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
            `,n.appendChild(i),document.body.appendChild(n);const s=document.getElementById("gatewayIPInput"),o=document.getElementById("gatewaySaveBtn"),c=document.getElementById("gatewaySkipBtn");s.focus();function l(u){const d=u.trim().split(".");return d.length!==4?!1:d.every(p=>{const g=Number(p);return Number.isInteger(g)&&g>=0&&g<=255})}s.addEventListener("focus",()=>{s.style.borderColor="#7C9082",s.style.boxShadow="0 0 0 3px rgba(124, 144, 130, 0.12)"}),s.addEventListener("blur",()=>{s.style.borderColor=t?"#57534E":"#E8E4DF",s.style.boxShadow="none"}),s.addEventListener("keydown",u=>{u.key==="Enter"&&o.click()}),o.addEventListener("click",()=>{const u=s.value.trim();if(!u){s.style.borderColor="#dc2626",s.placeholder="IP 주소를 입력하세요";return}if(!l(u)){s.style.borderColor="#dc2626",s.value="",s.placeholder="올바른 IP 형식: 0~255.0~255.0~255.0~255";return}pu.saveGateway(u),n.remove(),r(u)}),c.addEventListener("click",()=>{n.remove(),r(null)})})},async promptGatewayIfNeeded(){var e;return((e=window.electronAPI)==null?void 0:e.isElectron)===!0||window.location.protocol==="file:"||this.getAllowedGateway()?!0:!!await this.showGatewaySetupModal()}};window.NetworkAccess=pu;var Im;if(((Im=window.electronAPI)==null?void 0:Im.isElectron)===!0||window.location.protocol==="file:")window.logger&&window.logger.info("[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)");else{const r=pu.getAllowedGateway();window.logger&&(window.logger.info("[NetworkAccess] 웹 환경 - 네트워크 체크 활성화"),r?window.logger.info(`[NetworkAccess] 허용된 게이트웨이: ${r}`):window.logger.warn("[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요"))}const kI=()=>{};var lf={};/**
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
 */const Em=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},DI=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],l=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(l>>10)),e[n++]=String.fromCharCode(56320+(l&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},vm={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,l=i+2<r.length,u=l?r[i+2]:0,d=s>>2,p=(s&3)<<4|c>>4;let g=(c&15)<<2|u>>6,E=u&63;l||(E=64,o||(g=64)),n.push(t[d],t[p],t[g],t[E])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(Em(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):DI(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const u=i<r.length?t[r.charAt(i)]:64;++i;const p=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||u==null||p==null)throw new xI;const g=s<<2|c>>4;if(n.push(g),u!==64){const E=c<<4&240|u>>2;if(n.push(E),p!==64){const k=u<<6&192|p;n.push(k)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class xI extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const NI=function(r){const e=Em(r);return vm.encodeByteArray(e,!0)},pa=function(r){return NI(r).replace(/\./g,"")},mu=function(r){try{return vm.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function ma(r,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:r===void 0&&(r={});break;case Array:r=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!VI(t)||(r[t]=ma(r[t],e[t]));return r}function VI(r){return r!=="__proto__"}/**
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
 */function gu(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const OI=()=>gu().__FIREBASE_DEFAULTS__,MI=()=>{if(typeof process>"u"||typeof lf>"u")return;const r=lf.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},LI=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&mu(r[1]);return e&&JSON.parse(e)},yu=()=>{try{return kI()||OI()||MI()||LI()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},_u=()=>{var r;return(r=yu())==null?void 0:r.config},FI=r=>{var e;return(e=yu())==null?void 0:e[`_${r}`]};/**
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
 */class UI{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
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
 */function Ri(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Tm(r){return(await fetch(r,{credentials:"include"})).ok}/**
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
 */function BI(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...r};return[pa(JSON.stringify(t)),pa(JSON.stringify(o)),""].join(".")}const ws={};function qI(){const r={prod:[],emulator:[]};for(const e of Object.keys(ws))ws[e]?r.emulator.push(e):r.prod.push(e);return r}function $I(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let uf=!1;function bm(r,e){if(typeof window>"u"||typeof document>"u"||!Ri(window.location.host)||ws[r]===e||ws[r]||uf)return;ws[r]=e;function t(g){return`__firebase__banner__${g}`}const n="__firebase__banner",s=qI().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function l(g,E){g.setAttribute("width","24"),g.setAttribute("id",E),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function u(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{uf=!0,o()},g}function d(g,E){g.setAttribute("id",E),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function p(){const g=$I(n),E=t("text"),k=document.getElementById(E)||document.createElement("span"),D=t("learnmore"),T=document.getElementById(D)||document.createElement("a"),V=t("preprendIcon"),M=document.getElementById(V)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const B=g.element;c(B),d(T,D);const j=u();l(M,V),B.append(M,k,T,j),document.body.appendChild(B)}s?(k.innerText="Preview backend disconnected.",M.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
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
</defs>`,k.innerText="Preview backend running in this workspace."),k.setAttribute("id",E)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function ye(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function KI(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ye())}function $a(){var e;const r=(e=yu())==null?void 0:e.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function zI(){return typeof window<"u"||Am()}function Am(){return typeof WorkerGlobalScope<"u"&&typeof self<"u"&&self instanceof WorkerGlobalScope}function jI(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Sm(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function wu(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Rm(){const r=ye();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function Pm(){return!$a()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Cm(){return!$a()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Vs(){try{return typeof indexedDB=="object"}catch{return!1}}function GI(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)==null?void 0:s.message)||"")}}catch(t){e(t)}})}/**
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
 */const WI="FirebaseError";class Ze extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=WI,Object.setPrototypeOf(this,Ze.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ar.prototype.create)}}class Ar{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?HI(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new Ze(i,c,n)}}function HI(r,e){return r.replace(QI,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const QI=/\{\$([^}]+)}/g;/**
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
 */function hf(r,e){return Object.prototype.hasOwnProperty.call(r,e)}function YI(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function An(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(df(s)&&df(o)){if(!An(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function df(r){return r!==null&&typeof r=="object"}/**
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
 */function Pi(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function Hr(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function hs(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function km(r,e){const t=new JI(r,e);return t.subscribe.bind(t)}class JI{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");XI(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=rl),i.error===void 0&&(i.error=rl),i.complete===void 0&&(i.complete=rl);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function XI(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function rl(){}/**
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
 */function z(r){return r&&r._delegate?r._delegate:r}class Ft{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Xn="[DEFAULT]";/**
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
 */class ZI{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new UI;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),n=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(n)return null;throw i}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(tE(e))try{this.getOrInitializeService({instanceIdentifier:Xn})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=Xn){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Xn){return this.instances.has(e)}getOptions(e=Xn){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(n)??new Set;i.add(e),this.onInitCallbacks.set(n,i);const s=this.instances.get(n);return s&&e(s,n),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:eE(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=Xn){return this.component?this.component.multipleInstances?e:Xn:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function eE(r){return r===Xn?void 0:r}function tE(r){return r.instantiationMode==="EAGER"}/**
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
 */class Dm{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new ZI(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */const Iu=[];var J;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(J||(J={}));const xm={debug:J.DEBUG,verbose:J.VERBOSE,info:J.INFO,warn:J.WARN,error:J.ERROR,silent:J.SILENT},nE=J.INFO,rE={[J.DEBUG]:"log",[J.VERBOSE]:"log",[J.INFO]:"info",[J.WARN]:"warn",[J.ERROR]:"error"},iE=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=rE[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Ka{constructor(e){this.name=e,this._logLevel=nE,this._logHandler=iE,this._userLogHandler=null,Iu.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in J))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?xm[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,J.DEBUG,...e),this._logHandler(this,J.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,J.VERBOSE,...e),this._logHandler(this,J.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,J.INFO,...e),this._logHandler(this,J.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,J.WARN,...e),this._logHandler(this,J.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,J.ERROR,...e),this._logHandler(this,J.ERROR,...e)}}function sE(r){Iu.forEach(e=>{e.setLogLevel(r)})}function oE(r,e){for(const t of Iu){let n=null;e&&e.level&&(n=xm[e.level]),r===null?t.userLogHandler=null:t.userLogHandler=(i,s,...o)=>{const c=o.map(l=>{if(l==null)return null;if(typeof l=="string")return l;if(typeof l=="number"||typeof l=="boolean")return l.toString();if(l instanceof Error)return l.message;try{return JSON.stringify(l)}catch{return null}}).filter(l=>l).join(" ");s>=(n??i.logLevel)&&r({level:J[s].toLowerCase(),message:c,args:o,type:i.name})}}}const aE=(r,e)=>e.some(t=>r instanceof t);let ff,pf;function cE(){return ff||(ff=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function lE(){return pf||(pf=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Nm=new WeakMap,Tl=new WeakMap,Vm=new WeakMap,il=new WeakMap,Eu=new WeakMap;function uE(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",o)},s=()=>{t(In(r.result)),i()},o=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Nm.set(t,r)}).catch(()=>{}),Eu.set(e,r),e}function hE(r){if(Tl.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",o),r.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",o),r.addEventListener("abort",o)});Tl.set(r,e)}let bl={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return Tl.get(r);if(e==="objectStoreNames")return r.objectStoreNames||Vm.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return In(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function dE(r){bl=r(bl)}function fE(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(sl(this),e,...t);return Vm.set(n,e.sort?e.sort():[e]),In(n)}:lE().includes(r)?function(...e){return r.apply(sl(this),e),In(Nm.get(this))}:function(...e){return In(r.apply(sl(this),e))}}function pE(r){return typeof r=="function"?fE(r):(r instanceof IDBTransaction&&hE(r),aE(r,cE())?new Proxy(r,bl):r)}function In(r){if(r instanceof IDBRequest)return uE(r);if(il.has(r))return il.get(r);const e=pE(r);return e!==r&&(il.set(r,e),Eu.set(e,r)),e}const sl=r=>Eu.get(r);function mE(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const o=indexedDB.open(r,e),c=In(o);return n&&o.addEventListener("upgradeneeded",l=>{n(In(o.result),l.oldVersion,l.newVersion,In(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{s&&l.addEventListener("close",()=>s()),i&&l.addEventListener("versionchange",u=>i(u.oldVersion,u.newVersion,u))}).catch(()=>{}),c}const gE=["get","getKey","getAll","getAllKeys","count"],yE=["put","add","delete","clear"],ol=new Map;function mf(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(ol.get(e))return ol.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=yE.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||gE.includes(t)))return;const s=async function(o,...c){const l=this.transaction(o,i?"readwrite":"readonly");let u=l.store;return n&&(u=u.index(c.shift())),(await Promise.all([u[t](...c),i&&l.done]))[0]};return ol.set(e,s),s}dE(r=>({...r,get:(e,t,n)=>mf(e,t)||r.get(e,t,n),has:(e,t)=>!!mf(e,t)||r.has(e,t)}));/**
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
 */class _E{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(wE(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function wE(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const ga="@firebase/app",Al="0.14.6";/**
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
 */const Gt=new Ka("@firebase/app"),IE="@firebase/app-compat",EE="@firebase/analytics-compat",vE="@firebase/analytics",TE="@firebase/app-check-compat",bE="@firebase/app-check",AE="@firebase/auth",SE="@firebase/auth-compat",RE="@firebase/database",PE="@firebase/data-connect",CE="@firebase/database-compat",kE="@firebase/functions",DE="@firebase/functions-compat",xE="@firebase/installations",NE="@firebase/installations-compat",VE="@firebase/messaging",OE="@firebase/messaging-compat",ME="@firebase/performance",LE="@firebase/performance-compat",FE="@firebase/remote-config",UE="@firebase/remote-config-compat",BE="@firebase/storage",qE="@firebase/storage-compat",$E="@firebase/firestore",KE="@firebase/ai",zE="@firebase/firestore-compat",jE="firebase",GE="12.6.0";/**
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
 */const Sn="[DEFAULT]",WE={[ga]:"fire-core",[IE]:"fire-core-compat",[vE]:"fire-analytics",[EE]:"fire-analytics-compat",[bE]:"fire-app-check",[TE]:"fire-app-check-compat",[AE]:"fire-auth",[SE]:"fire-auth-compat",[RE]:"fire-rtdb",[PE]:"fire-data-connect",[CE]:"fire-rtdb-compat",[kE]:"fire-fn",[DE]:"fire-fn-compat",[xE]:"fire-iid",[NE]:"fire-iid-compat",[VE]:"fire-fcm",[OE]:"fire-fcm-compat",[ME]:"fire-perf",[LE]:"fire-perf-compat",[FE]:"fire-rc",[UE]:"fire-rc-compat",[BE]:"fire-gcs",[qE]:"fire-gcs-compat",[$E]:"fire-fst",[zE]:"fire-fst-compat",[KE]:"fire-vertex","fire-js":"fire-js",[jE]:"fire-js-all"};/**
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
 */const Rn=new Map,ri=new Map,ii=new Map;function Os(r,e){try{r.container.addComponent(e)}catch(t){Gt.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function Om(r,e){r.container.addOrOverwriteComponent(e)}function Pn(r){const e=r.name;if(ii.has(e))return Gt.debug(`There were multiple attempts to register component ${e}.`),!1;ii.set(e,r);for(const t of Rn.values())Os(t,r);for(const t of ri.values())Os(t,r);return!0}function Mm(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function HE(r,e,t=Sn){Mm(r,e).clearInstance(t)}function vu(r){return r.options!==void 0}function Lm(r){return vu(r)?!1:"authIdToken"in r||"appCheckToken"in r||"releaseOnDeref"in r||"automaticDataCollectionEnabled"in r}function pe(r){return r==null?!1:r.settings!==void 0}function QE(){ii.clear()}/**
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
 */const YE={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},dt=new Ar("app","Firebase",YE);/**
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
 */let Fm=class{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new Ft("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw dt.create("app-deleted",{appName:this._name})}};/**
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
 */function gf(r,e){const t=mu(r.split(".")[1]);if(t===null){console.error(`FirebaseServerApp ${e} is invalid: second part could not be parsed.`);return}if(JSON.parse(t).exp===void 0){console.error(`FirebaseServerApp ${e} is invalid: expiration claim could not be parsed`);return}const i=JSON.parse(t).exp*1e3,s=new Date().getTime();i-s<=0&&console.error(`FirebaseServerApp ${e} is invalid: the token has expired.`)}class JE extends Fm{constructor(e,t,n,i){const s=t.automaticDataCollectionEnabled!==void 0?t.automaticDataCollectionEnabled:!0,o={name:n,automaticDataCollectionEnabled:s};if(e.apiKey!==void 0)super(e,o,i);else{const c=e;super(c.options,o,i)}this._serverConfig={automaticDataCollectionEnabled:s,...t},this._serverConfig.authIdToken&&gf(this._serverConfig.authIdToken,"authIdToken"),this._serverConfig.appCheckToken&&gf(this._serverConfig.appCheckToken,"appCheckToken"),this._finalizationRegistry=null,typeof FinalizationRegistry<"u"&&(this._finalizationRegistry=new FinalizationRegistry(()=>{this.automaticCleanup()})),this._refCount=0,this.incRefCount(this._serverConfig.releaseOnDeref),this._serverConfig.releaseOnDeref=void 0,t.releaseOnDeref=void 0,wt(ga,Al,"serverapp")}toJSON(){}get refCount(){return this._refCount}incRefCount(e){this.isDeleted||(this._refCount++,e!==void 0&&this._finalizationRegistry!==null&&this._finalizationRegistry.register(e,this))}decRefCount(){return this.isDeleted?0:--this._refCount}automaticCleanup(){bu(this)}get settings(){return this.checkDestroyed(),this._serverConfig}checkDestroyed(){if(this.isDeleted)throw dt.create("server-app-deleted")}}/**
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
 */const Ln=GE;function Tu(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:Sn,automaticDataCollectionEnabled:!0,...e},i=n.name;if(typeof i!="string"||!i)throw dt.create("bad-app-name",{appName:String(i)});if(t||(t=_u()),!t)throw dt.create("no-options");const s=Rn.get(i);if(s){if(An(t,s.options)&&An(n,s.config))return s;throw dt.create("duplicate-app",{appName:i})}const o=new Dm(i);for(const l of ii.values())o.addComponent(l);const c=new Fm(t,n,o);return Rn.set(i,c),c}function XE(r,e={}){if(zI()&&!Am())throw dt.create("invalid-server-app-environment");let t,n=e||{};if(r&&(vu(r)?t=r.options:Lm(r)?n=r:t=r),n.automaticDataCollectionEnabled===void 0&&(n.automaticDataCollectionEnabled=!0),t||(t=_u()),!t)throw dt.create("no-options");const i={...n,...t};i.releaseOnDeref!==void 0&&delete i.releaseOnDeref;const s=d=>[...d].reduce((p,g)=>Math.imul(31,p)+g.charCodeAt(0)|0,0);if(n.releaseOnDeref!==void 0&&typeof FinalizationRegistry>"u")throw dt.create("finalization-registry-not-supported",{});const o=""+s(JSON.stringify(i)),c=ri.get(o);if(c)return c.incRefCount(n.releaseOnDeref),c;const l=new Dm(o);for(const d of ii.values())l.addComponent(d);const u=new JE(t,n,o,l);return ri.set(o,u),u}function ZE(r=Sn){const e=Rn.get(r);if(!e&&r===Sn&&_u())return Tu();if(!e)throw dt.create("no-app",{appName:r});return e}function ev(){return Array.from(Rn.values())}async function bu(r){let e=!1;const t=r.name;Rn.has(t)?(e=!0,Rn.delete(t)):ri.has(t)&&r.decRefCount()<=0&&(ri.delete(t),e=!0),e&&(await Promise.all(r.container.getProviders().map(n=>n.delete())),r.isDeleted=!0)}function wt(r,e,t){let n=WE[r]??r;t&&(n+=`-${t}`);const i=n.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${n}" with version "${e}":`];i&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Gt.warn(o.join(" "));return}Pn(new Ft(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}function Um(r,e){if(r!==null&&typeof r!="function")throw dt.create("invalid-log-argument");oE(r,e)}function Bm(r){sE(r)}/**
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
 */const tv="firebase-heartbeat-database",nv=1,Ms="firebase-heartbeat-store";let al=null;function qm(){return al||(al=mE(tv,nv,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(Ms)}catch(t){console.warn(t)}}}}).catch(r=>{throw dt.create("idb-open",{originalErrorMessage:r.message})})),al}async function rv(r){try{const t=(await qm()).transaction(Ms),n=await t.objectStore(Ms).get($m(r));return await t.done,n}catch(e){if(e instanceof Ze)Gt.warn(e.message);else{const t=dt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Gt.warn(t.message)}}}async function yf(r,e){try{const n=(await qm()).transaction(Ms,"readwrite");await n.objectStore(Ms).put(e,$m(r)),await n.done}catch(t){if(t instanceof Ze)Gt.warn(t.message);else{const n=dt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Gt.warn(n.message)}}}function $m(r){return`${r.name}!${r.options.appId}`}/**
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
 */const iv=1024,sv=30;class ov{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new cv(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=_f();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>sv){const o=lv(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){Gt.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=_f(),{heartbeatsToSend:n,unsentEntries:i}=av(this._heartbeatsCache.heartbeats),s=pa(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Gt.warn(t),""}}}function _f(){return new Date().toISOString().substring(0,10)}function av(r,e=iv){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),wf(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),wf(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class cv{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Vs()?GI().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await rv(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return yf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return yf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function wf(r){return pa(JSON.stringify({version:2,heartbeats:r})).length}function lv(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
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
 */function uv(r){Pn(new Ft("platform-logger",e=>new _E(e),"PRIVATE")),Pn(new Ft("heartbeat",e=>new ov(e),"PRIVATE")),wt(ga,Al,r),wt(ga,Al,"esm2020"),wt("fire-js","")}uv("");const hv=Object.freeze(Object.defineProperty({__proto__:null,FirebaseError:Ze,SDK_VERSION:Ln,_DEFAULT_ENTRY_NAME:Sn,_addComponent:Os,_addOrOverwriteComponent:Om,_apps:Rn,_clearComponents:QE,_components:ii,_getProvider:Mm,_isFirebaseApp:vu,_isFirebaseServerApp:pe,_isFirebaseServerAppSettings:Lm,_registerComponent:Pn,_removeServiceInstance:HE,_serverApps:ri,deleteApp:bu,getApp:ZE,getApps:ev,initializeApp:Tu,initializeServerApp:XE,onLog:Um,registerVersion:wt,setLogLevel:Bm},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dv{constructor(e,t){this._delegate=e,this.firebase=t,Os(e,new Ft("app-compat",()=>this,"PUBLIC")),this.container=e.container}get automaticDataCollectionEnabled(){return this._delegate.automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this._delegate.automaticDataCollectionEnabled=e}get name(){return this._delegate.name}get options(){return this._delegate.options}delete(){return new Promise(e=>{this._delegate.checkDestroyed(),e()}).then(()=>(this.firebase.INTERNAL.removeApp(this.name),bu(this._delegate)))}_getService(e,t=Sn){var i;this._delegate.checkDestroyed();const n=this._delegate.container.getProvider(e);return!n.isInitialized()&&((i=n.getComponent())==null?void 0:i.instantiationMode)==="EXPLICIT"&&n.initialize(),n.getImmediate({identifier:t})}_removeServiceInstance(e,t=Sn){this._delegate.container.getProvider(e).clearInstance(t)}_addComponent(e){Os(this._delegate,e)}_addOrOverwriteComponent(e){Om(this._delegate,e)}toJSON(){return{name:this.name,automaticDataCollectionEnabled:this.automaticDataCollectionEnabled,options:this.options}}}/**
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
 */const fv={"no-app":"No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance."},If=new Ar("app-compat","Firebase",fv);/**
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
 */function pv(r){const e={},t={__esModule:!0,initializeApp:s,app:i,registerVersion:wt,setLogLevel:Bm,onLog:Um,apps:null,SDK_VERSION:Ln,INTERNAL:{registerComponent:c,removeApp:n,useAsService:l,modularAPIs:hv}};t.default=t,Object.defineProperty(t,"apps",{get:o});function n(u){delete e[u]}function i(u){if(u=u||Sn,!hf(e,u))throw If.create("no-app",{appName:u});return e[u]}i.App=r;function s(u,d={}){const p=Tu(u,d);if(hf(e,p.name))return e[p.name];const g=new r(p,t);return e[p.name]=g,g}function o(){return Object.keys(e).map(u=>e[u])}function c(u){const d=u.name,p=d.replace("-compat","");if(Pn(u)&&u.type==="PUBLIC"){const g=(E=i())=>{if(typeof E[p]!="function")throw If.create("invalid-app-argument",{appName:d});return E[p]()};u.serviceProps!==void 0&&ma(g,u.serviceProps),t[p]=g,r.prototype[p]=function(...E){return this._getService.bind(this,d).apply(this,u.multipleInstances?E:[])}}return u.type==="PUBLIC"?t[p]:null}function l(u,d){return d==="serverAuth"?null:d}return t}/**
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
 */function Km(){const r=pv(dv);r.INTERNAL={...r.INTERNAL,createFirebaseNamespace:Km,extendNamespace:e,createSubscribe:km,ErrorFactory:Ar,deepExtend:ma};function e(t){ma(r,t)}return r}const mv=Km();/**
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
 */const Ef=new Ka("@firebase/app-compat"),gv="@firebase/app-compat",yv="0.5.6";/**
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
 */function _v(r){wt(gv,yv,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */try{const r=gu();if(r.firebase!==void 0){Ef.warn(`
      Warning: Firebase is already defined in the global scope. Please make sure
      Firebase library is only loaded once.
    `);const e=r.firebase.SDK_VERSION;e&&e.indexOf("LITE")>=0&&Ef.warn(`
        Warning: You are trying to load Firebase while using Firebase Performance standalone script.
        You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
        `)}}catch{}const oo=mv;_v();var wv="firebase",Iv="12.7.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */oo.registerVersion(wv,Iv,"app-compat");const ns={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",TWITTER:"twitter.com"},Vr={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ev(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function zm(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const vv=Ev,Tv=zm,jm=new Ar("auth","Firebase",zm());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ya=new Ka("@firebase/auth");function bv(r,...e){ya.logLevel<=J.WARN&&ya.warn(`Auth (${Ln}): ${r}`,...e)}function Zo(r,...e){ya.logLevel<=J.ERROR&&ya.error(`Auth (${Ln}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Be(r,...e){throw Su(r,...e)}function De(r,...e){return Su(r,...e)}function Au(r,e,t){const n={...Tv(),[e]:t};return new Ar("auth","Firebase",n).create(e,{appName:r.name})}function Me(r){return Au(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Ci(r,e,t){const n=t;if(!(e instanceof n))throw n.name!==e.constructor.name&&Be(r,"argument-error"),Au(r,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Su(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return jm.create(r,...e)}function O(r,e,...t){if(!r)throw Su(e,...t)}function xt(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Zo(e),new Error(e)}function vt(r,e){r||xt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ls(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.href)||""}function Ru(){return vf()==="http:"||vf()==="https:"}function vf(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Av(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Ru()||Sm()||"connection"in navigator)?navigator.onLine:!0}function Sv(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ao{constructor(e,t){this.shortDelay=e,this.longDelay=t,vt(t>e,"Short delay should be less than long delay!"),this.isMobile=KI()||wu()}get(){return Av()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pu(r,e){vt(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gm{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;xt("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;xt("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;xt("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rv={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pv=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Cv=new ao(3e4,6e4);function ve(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function Te(r,e,t,n,i={}){return Wm(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=Pi({key:r.config.apiKey,...o}).slice(1),l=await r._getAdditionalHeaders();l["Content-Type"]="application/json",r.languageCode&&(l["X-Firebase-Locale"]=r.languageCode);const u={method:e,headers:l,...s};return jI()||(u.referrerPolicy="no-referrer"),r.emulatorConfig&&Ri(r.emulatorConfig.host)&&(u.credentials="include"),Gm.fetch()(await Hm(r,r.config.apiHost,t,c),u)})}async function Wm(r,e,t){r._canInitEmulator=!1;const n={...Rv,...e};try{const i=new Dv(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw ds(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[l,u]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw ds(r,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw ds(r,"email-already-in-use",o);if(l==="USER_DISABLED")throw ds(r,"user-disabled",o);const d=n[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(u)throw Au(r,d,u);Be(r,d)}}catch(i){if(i instanceof Ze)throw i;Be(r,"network-request-failed",{message:String(i)})}}async function Jt(r,e,t,n,i={}){const s=await Te(r,e,t,n,i);return"mfaPendingCredential"in s&&Be(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function Hm(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?Pu(r.config,i):`${r.config.apiScheme}://${i}`;return Pv.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function kv(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Dv{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(De(this.auth,"network-request-failed")),Cv.get())})}}function ds(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=De(r,e,n);return i.customData._tokenResponse=t,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tf(r){return r!==void 0&&r.getResponse!==void 0}function bf(r){return r!==void 0&&r.enterprise!==void 0}class Qm{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return kv(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xv(r){return(await Te(r,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function Ym(r,e){return Te(r,"GET","/v2/recaptchaConfig",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nv(r,e){return Te(r,"POST","/v1/accounts:delete",e)}async function Vv(r,e){return Te(r,"POST","/v1/accounts:update",e)}async function _a(r,e){return Te(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Is(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Ov(r,e=!1){const t=z(r),n=await t.getIdToken(e),i=za(n);O(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:Is(cl(i.auth_time)),issuedAtTime:Is(cl(i.iat)),expirationTime:Is(cl(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function cl(r){return Number(r)*1e3}function za(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Zo("JWT malformed, contained fewer than 3 sections"),null;try{const i=mu(t);return i?JSON.parse(i):(Zo("Failed to decode base64 JWT payload"),null)}catch(i){return Zo("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Af(r){const e=za(r);return O(e,"internal-error"),O(typeof e.exp<"u","internal-error"),O(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wt(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof Ze&&Mv(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function Mv({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lv{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sl{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Is(this.lastLoginAt),this.creationTime=Is(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Fs(r){var p;const e=r.auth,t=await r.getIdToken(),n=await Wt(r,_a(e,{idToken:t}));O(n==null?void 0:n.users.length,e,"internal-error");const i=n.users[0];r._notifyReloadListener(i);const s=(p=i.providerUserInfo)!=null&&p.length?Jm(i.providerUserInfo):[],o=Uv(r.providerData,s),c=r.isAnonymous,l=!(r.email&&i.passwordHash)&&!(o!=null&&o.length),u=c?l:!1,d={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new Sl(i.createdAt,i.lastLoginAt),isAnonymous:u};Object.assign(r,d)}async function Fv(r){const e=z(r);await Fs(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function Uv(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function Jm(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Bv(r,e){const t=await Wm(r,{},async()=>{const n=Pi({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await Hm(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:n};return r.emulatorConfig&&Ri(r.emulatorConfig.host)&&(l.credentials="include"),Gm.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function qv(r,e){return Te(r,"POST","/v2/accounts:revokeToken",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jr{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){O(e.idToken,"internal-error"),O(typeof e.idToken<"u","internal-error"),O(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Af(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){O(e.length!==0,"internal-error");const t=Af(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(O(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await Bv(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new Jr;return n&&(O(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(O(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(O(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Jr,this.toJSON())}_performRefresh(){return xt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hn(r,e){O(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class _t{constructor({uid:e,auth:t,stsTokenManager:n,...i}){this.providerId="firebase",this.proactiveRefresh=new Lv(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new Sl(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Wt(this,this.stsTokenManager.getToken(this.auth,e));return O(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Ov(this,e)}reload(){return Fv(this)}_assign(e){this!==e&&(O(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new _t({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){O(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Fs(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(pe(this.auth.app))return Promise.reject(Me(this.auth));const e=await this.getIdToken();return await Wt(this,Nv(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,u=t.createdAt??void 0,d=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:E,providerData:k,stsTokenManager:D}=t;O(p&&D,e,"internal-error");const T=Jr.fromJSON(this.name,D);O(typeof p=="string",e,"internal-error"),hn(n,e.name),hn(i,e.name),O(typeof g=="boolean",e,"internal-error"),O(typeof E=="boolean",e,"internal-error"),hn(s,e.name),hn(o,e.name),hn(c,e.name),hn(l,e.name),hn(u,e.name),hn(d,e.name);const V=new _t({uid:p,auth:e,email:i,emailVerified:g,displayName:n,isAnonymous:E,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:T,createdAt:u,lastLoginAt:d});return k&&Array.isArray(k)&&(V.providerData=k.map(M=>({...M}))),l&&(V._redirectEventId=l),V}static async _fromIdTokenResponse(e,t,n=!1){const i=new Jr;i.updateFromServerResponse(t);const s=new _t({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Fs(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];O(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?Jm(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new Jr;c.updateFromIdToken(n);const l=new _t({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),u={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Sl(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(l,u),l}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Sf=new Map;function ht(r){vt(r instanceof Function,"Expected a class definition");let e=Sf.get(r);return e?(vt(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,Sf.set(r,e),e)}/**
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
 */class Xm{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Xm.type="NONE";const si=Xm;/**
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
 */function ur(r,e,t){return`firebase:${r}:${e}:${t}`}class Xr{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=ur(this.userKey,i.apiKey,s),this.fullPersistenceKey=ur("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await _a(this.auth,{idToken:e}).catch(()=>{});return t?_t._fromGetAccountInfoResponse(this.auth,t,e):null}return _t._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new Xr(ht(si),e,n);const i=(await Promise.all(t.map(async u=>{if(await u._isAvailable())return u}))).filter(u=>u);let s=i[0]||ht(si);const o=ur(n,e.config.apiKey,e.name);let c=null;for(const u of t)try{const d=await u._get(o);if(d){let p;if(typeof d=="string"){const g=await _a(e,{idToken:d}).catch(()=>{});if(!g)break;p=await _t._fromGetAccountInfoResponse(e,g,d)}else p=_t._fromJSON(e,d);u!==s&&(c=p),s=u;break}}catch{}const l=i.filter(u=>u._shouldAllowMigration);return!s._shouldAllowMigration||!l.length?new Xr(s,e,n):(s=l[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async u=>{if(u!==s)try{await u._remove(o)}catch{}})),new Xr(s,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rf(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(ng(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Zm(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(rg(e))return"Blackberry";if(ig(e))return"Webos";if(eg(e))return"Safari";if((e.includes("chrome/")||tg(e))&&!e.includes("edge/"))return"Chrome";if(co(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function Zm(r=ye()){return/firefox\//i.test(r)}function eg(r=ye()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function tg(r=ye()){return/crios\//i.test(r)}function ng(r=ye()){return/iemobile/i.test(r)}function co(r=ye()){return/android/i.test(r)}function rg(r=ye()){return/blackberry/i.test(r)}function ig(r=ye()){return/webos/i.test(r)}function lo(r=ye()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function $v(r=ye()){return/(iPad|iPhone|iPod).*OS 7_\d/i.test(r)||/(iPad|iPhone|iPod).*OS 8_\d/i.test(r)}function Kv(r=ye()){var e;return lo(r)&&!!((e=window.navigator)!=null&&e.standalone)}function zv(){return Rm()&&document.documentMode===10}function sg(r=ye()){return lo(r)||co(r)||ig(r)||rg(r)||/windows phone/i.test(r)||ng(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function og(r,e=[]){let t;switch(r){case"Browser":t=Rf(ye());break;case"Worker":t=`${Rf(ye())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Ln}/${n}`}/**
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
 */class jv{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const l=e(s);o(l)}catch(l){c(l)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
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
 */async function Gv(r,e={}){return Te(r,"GET","/v2/passwordPolicy",ve(r,e))}/**
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
 */const Wv=6;class Hv{constructor(e){var n;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??Wv,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((n=e.allowedNonAlphanumericCharacters)==null?void 0:n.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qv{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Pf(this),this.idTokenSubscription=new Pf(this),this.beforeStateQueue=new jv(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=jm,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=ht(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await Xr.create(this,e),(n=this._resolvePersistenceManagerAvailable)==null||n.call(this),!this._deleted)){if((i=this._popupRedirectResolver)!=null&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)==null?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await _a(this,{idToken:e}),n=await _t._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var s;if(pe(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(s=this.redirectUser)==null?void 0:s._redirectEventId,c=n==null?void 0:n._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(n=l.user,i=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(n)}catch(o){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return O(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Fs(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Sv()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(pe(this.app))return Promise.reject(Me(this));const t=e?z(e):null;return t&&O(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&O(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return pe(this.app)?Promise.reject(Me(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return pe(this.app)?Promise.reject(Me(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(ht(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Gv(this),t=new Hv(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new Ar("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await qv(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&ht(e)||this._popupRedirectResolver;O(t,this,"argument-error"),this.redirectPersistenceManager=await Xr.create(this,[ht(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)==null?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(O(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,n,i);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return O(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=og(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var i;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((i=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:i.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){var t;if(pe(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&bv(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function _e(r){return z(r)}class Pf{constructor(e){this.auth=e,this.observer=null,this.addObserver=km(t=>this.observer=t)}get next(){return O(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let uo={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function Yv(r){uo=r}function Cu(r){return uo.loadJS(r)}function Jv(){return uo.recaptchaV2Script}function Xv(){return uo.recaptchaEnterpriseScript}function Zv(){return uo.gapiScript}function ag(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eT=500,tT=6e4,jo=1e12;class nT{constructor(e){this.auth=e,this.counter=jo,this._widgets=new Map}render(e,t){const n=this.counter;return this._widgets.set(n,new sT(e,this.auth.name,t||{})),this.counter++,n}reset(e){var n;const t=e||jo;(n=this._widgets.get(t))==null||n.delete(),this._widgets.delete(t)}getResponse(e){var n;const t=e||jo;return((n=this._widgets.get(t))==null?void 0:n.getResponse())||""}async execute(e){var n;const t=e||jo;return(n=this._widgets.get(t))==null||n.execute(),""}}class rT{constructor(){this.enterprise=new iT}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class iT{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class sT{constructor(e,t,n){this.params=n,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;O(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=oT(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},tT)},eT))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function oT(r){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let n=0;n<r;n++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const aT="recaptcha-enterprise",Es="NO_RECAPTCHA";class cg{constructor(e){this.type=aT,this.auth=_e(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{Ym(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(l=>{if(l.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const u=new Qm(l);return s.tenantId==null?s._agentRecaptchaConfig=u:s._tenantRecaptchaConfigs[s.tenantId]=u,o(u.siteKey)}}).catch(l=>{c(l)})})}function i(s,o,c){const l=window.grecaptcha;bf(l)?l.enterprise.ready(()=>{l.enterprise.execute(s,{action:e}).then(u=>{o(u)}).catch(()=>{o(Es)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new rT().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&bf(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let l=Xv();l.length!==0&&(l+=c),Cu(l).then(()=>{i(c,s,o)}).catch(u=>{o(u)})}}).catch(c=>{o(c)})})}}async function rs(r,e,t,n=!1,i=!1){const s=new cg(r);let o;if(i)o=Es;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const l=c.phoneEnrollmentInfo.phoneNumber,u=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:l,recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const l=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function En(r,e,t,n,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if((s=r._getRecaptchaConfig())!=null&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await rs(r,e,t,t==="getOobCode");return n(r,c)}else return n(r,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await rs(r,e,t,t==="getOobCode");return n(r,l)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if((o=r._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await rs(r,e,t);return n(r,c).catch(async l=>{var u;if(((u=r._getRecaptchaConfig())==null?void 0:u.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(l.code==="auth/missing-recaptcha-token"||l.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await rs(r,e,t,!1,!0);return n(r,d)}return Promise.reject(l)})}else{const c=await rs(r,e,t,!1,!0);return n(r,c)}else return Promise.reject(i+" provider is not supported.")}async function cT(r){const e=_e(r),t=await Ym(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),n=new Qm(t);e.tenantId==null?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,n.isAnyProviderEnabled()&&new cg(e).verify()}function lT(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(ht);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function uT(r,e,t){const n=_e(r);O(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=lg(e),{host:o,port:c}=hT(e),l=c===null?"":`:${c}`,u={url:`${s}//${o}${l}/`},d=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){O(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),O(An(u,n.config.emulator)&&An(d,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=u,n.emulatorConfig=d,n.settings.appVerificationDisabledForTesting=!0,Ri(o)?(Tm(`${s}//${o}${l}`),bm("Auth",!0)):i||dT()}function lg(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function hT(r){const e=lg(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:Cf(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:Cf(o)}}}function Cf(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function dT(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ki{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return xt("not implemented")}_getIdTokenResponse(e){return xt("not implemented")}_linkToIdToken(e,t){return xt("not implemented")}_getReauthenticationResolver(e){return xt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ug(r,e){return Te(r,"POST","/v1/accounts:resetPassword",ve(r,e))}async function fT(r,e){return Te(r,"POST","/v1/accounts:update",e)}async function pT(r,e){return Te(r,"POST","/v1/accounts:signUp",e)}async function mT(r,e){return Te(r,"POST","/v1/accounts:update",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gT(r,e){return Jt(r,"POST","/v1/accounts:signInWithPassword",ve(r,e))}async function ja(r,e){return Te(r,"POST","/v1/accounts:sendOobCode",ve(r,e))}async function yT(r,e){return ja(r,e)}async function _T(r,e){return ja(r,e)}async function wT(r,e){return ja(r,e)}async function IT(r,e){return ja(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ET(r,e){return Jt(r,"POST","/v1/accounts:signInWithEmailLink",ve(r,e))}async function vT(r,e){return Jt(r,"POST","/v1/accounts:signInWithEmailLink",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Us extends ki{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new Us(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Us(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return En(e,t,"signInWithPassword",gT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return ET(e,{email:this._email,oobCode:this._password});default:Be(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return En(e,n,"signUpPassword",pT,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return vT(e,{idToken:t,email:this._email,oobCode:this._password});default:Be(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function zt(r,e){return Jt(r,"POST","/v1/accounts:signInWithIdp",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const TT="http://localhost";class Ut extends ki{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Ut(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):Be("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,...s}=t;if(!n||!i)return null;const o=new Ut(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return zt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,zt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,zt(e,t)}buildRequest(){const e={requestUri:TT,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=Pi(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function kf(r,e){return Te(r,"POST","/v1/accounts:sendVerificationCode",ve(r,e))}async function bT(r,e){return Jt(r,"POST","/v1/accounts:signInWithPhoneNumber",ve(r,e))}async function AT(r,e){const t=await Jt(r,"POST","/v1/accounts:signInWithPhoneNumber",ve(r,e));if(t.temporaryProof)throw ds(r,"account-exists-with-different-credential",t);return t}const ST={USER_NOT_FOUND:"user-not-found"};async function RT(r,e){const t={...e,operation:"REAUTH"};return Jt(r,"POST","/v1/accounts:signInWithPhoneNumber",ve(r,t),ST)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hr extends ki{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new hr({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new hr({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return bT(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return AT(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return RT(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:n,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:n,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s}=e;return!n&&!t&&!i&&!s?null:new hr({verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function PT(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function CT(r){const e=Hr(hs(r)).link,t=e?Hr(hs(e)).deep_link_id:null,n=Hr(hs(r)).deep_link_id;return(n?Hr(hs(n)).link:null)||n||t||e||r}class Ga{constructor(e){const t=Hr(hs(e)),n=t.apiKey??null,i=t.oobCode??null,s=PT(t.mode??null);O(n&&i&&s,"argument-error"),this.apiKey=n,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=CT(e);try{return new Ga(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fn{constructor(){this.providerId=Fn.PROVIDER_ID}static credential(e,t){return Us._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=Ga.parseLink(t);return O(n,"argument-error"),Us._fromEmailAndCode(e,n.code,n.tenantId)}}Fn.PROVIDER_ID="password";Fn.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Fn.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xt{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class Di extends Xt{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class Zr extends Di{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return O("providerId"in t&&"signInMethod"in t,"argument-error"),Ut._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return O(e.idToken||e.accessToken,"argument-error"),Ut._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return Zr.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return Zr.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!n&&!i&&!t&&!s||!c)return null;try{return new Zr(c)._credential({idToken:t,accessToken:n,nonce:o,pendingToken:s})}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pt extends Di{constructor(){super("facebook.com")}static credential(e){return Ut._fromParams({providerId:Pt.PROVIDER_ID,signInMethod:Pt.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Pt.credentialFromTaggedObject(e)}static credentialFromError(e){return Pt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Pt.credential(e.oauthAccessToken)}catch{return null}}}Pt.FACEBOOK_SIGN_IN_METHOD="facebook.com";Pt.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ct extends Di{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Ut._fromParams({providerId:Ct.PROVIDER_ID,signInMethod:Ct.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return Ct.credentialFromTaggedObject(e)}static credentialFromError(e){return Ct.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return Ct.credential(t,n)}catch{return null}}}Ct.GOOGLE_SIGN_IN_METHOD="google.com";Ct.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt extends Di{constructor(){super("github.com")}static credential(e){return Ut._fromParams({providerId:kt.PROVIDER_ID,signInMethod:kt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return kt.credentialFromTaggedObject(e)}static credentialFromError(e){return kt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return kt.credential(e.oauthAccessToken)}catch{return null}}}kt.GITHUB_SIGN_IN_METHOD="github.com";kt.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kT="http://localhost";class oi extends ki{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return zt(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,zt(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,zt(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,pendingToken:s}=t;return!n||!i||!s||n!==i?null:new oi(n,s)}static _create(e,t){return new oi(e,t)}buildRequest(){return{requestUri:kT,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const DT="saml.";class wa extends Xt{constructor(e){O(e.startsWith(DT),"argument-error"),super(e)}static credentialFromResult(e){return wa.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return wa.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=oi.fromJSON(e);return O(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:n}=e;if(!t||!n)return null;try{return oi._create(n,t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dt extends Di{constructor(){super("twitter.com")}static credential(e,t){return Ut._fromParams({providerId:Dt.PROVIDER_ID,signInMethod:Dt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return Dt.credentialFromTaggedObject(e)}static credentialFromError(e){return Dt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return Dt.credential(t,n)}catch{return null}}}Dt.TWITTER_SIGN_IN_METHOD="twitter.com";Dt.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hg(r,e){return Jt(r,"POST","/v1/accounts:signUp",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await _t._fromIdTokenResponse(e,n,i),o=Df(n);return new gt({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=Df(n);return new gt({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function Df(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xT(r){var i;if(pe(r.app))return Promise.reject(Me(r));const e=_e(r);if(await e._initializationPromise,(i=e.currentUser)!=null&&i.isAnonymous)return new gt({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await hg(e,{returnSecureToken:!0}),n=await gt._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(n.user),n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ia extends Ze{constructor(e,t,n,i){super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,Ia.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new Ia(e,t,n,i)}}function dg(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?Ia._fromErrorAndOperation(r,s,e,n):s})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fg(r){return new Set(r.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function NT(r,e){const t=z(r);await Wa(!0,t,e);const{providerUserInfo:n}=await Vv(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=fg(n||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function ku(r,e,t=!1){const n=await Wt(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return gt._forOperation(r,"link",n)}async function Wa(r,e,t){await Fs(e);const n=fg(e.providerData),i=r===!1?"provider-already-linked":"no-such-provider";O(n.has(t)===r,e.auth,i)}/**
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
 */async function pg(r,e,t=!1){const{auth:n}=r;if(pe(n.app))return Promise.reject(Me(n));const i="reauthenticate";try{const s=await Wt(r,dg(n,i,e,r),t);O(s.idToken,n,"internal-error");const o=za(s.idToken);O(o,n,"internal-error");const{sub:c}=o;return O(r.uid===c,n,"user-mismatch"),gt._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&Be(n,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mg(r,e,t=!1){if(pe(r.app))return Promise.reject(Me(r));const n="signIn",i=await dg(r,n,e),s=await gt._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function Ha(r,e){return mg(_e(r),e)}async function gg(r,e){const t=z(r);return await Wa(!1,t,e.providerId),ku(t,e)}async function yg(r,e){return pg(z(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function VT(r,e){return Jt(r,"POST","/v1/accounts:signInWithCustomToken",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function OT(r,e){if(pe(r.app))return Promise.reject(Me(r));const t=_e(r),n=await VT(t,{token:e,returnSecureToken:!0}),i=await gt._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ho{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Du._fromServerResponse(e,t):"totpInfo"in t?xu._fromServerResponse(e,t):Be(e,"internal-error")}}class Du extends ho{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Du(t)}}class xu extends ho{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new xu(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qa(r,e,t){var n;O(((n=t.url)==null?void 0:n.length)>0,r,"invalid-continue-uri"),O(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),O(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(O(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(O(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nu(r){const e=_e(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function MT(r,e,t){const n=_e(r),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&Qa(n,i,t),await En(n,i,"getOobCode",_T,"EMAIL_PASSWORD_PROVIDER")}async function LT(r,e,t){await ug(z(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Nu(r),n})}async function FT(r,e){await mT(z(r),{oobCode:e})}async function _g(r,e){const t=z(r),n=await ug(t,{oobCode:e}),i=n.requestType;switch(O(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":O(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":O(n.mfaInfo,t,"internal-error");default:O(n.email,t,"internal-error")}let s=null;return n.mfaInfo&&(s=ho._fromServerResponse(_e(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:s},operation:i}}async function UT(r,e){const{data:t}=await _g(z(r),e);return t.email}async function BT(r,e,t){if(pe(r.app))return Promise.reject(Me(r));const n=_e(r),o=await En(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",hg,"EMAIL_PASSWORD_PROVIDER").catch(l=>{throw l.code==="auth/password-does-not-meet-requirements"&&Nu(r),l}),c=await gt._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function qT(r,e,t){return pe(r.app)?Promise.reject(Me(r)):Ha(z(r),Fn.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Nu(r),n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $T(r,e,t){const n=_e(r),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){O(c.handleCodeInApp,n,"argument-error"),c&&Qa(n,o,c)}s(i,t),await En(n,i,"getOobCode",wT,"EMAIL_PASSWORD_PROVIDER")}function KT(r,e){const t=Ga.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function zT(r,e,t){if(pe(r.app))return Promise.reject(Me(r));const n=z(r),i=Fn.credentialWithLink(e,t||Ls());return O(i._tenantId===(n.tenantId||null),n,"tenant-id-mismatch"),Ha(n,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function jT(r,e){return Te(r,"POST","/v1/accounts:createAuthUri",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function GT(r,e){const t=Ru()?Ls():"http://localhost",n={identifier:e,continueUri:t},{signinMethods:i}=await jT(z(r),n);return i||[]}async function WT(r,e){const t=z(r),i={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&Qa(t.auth,i,e);const{email:s}=await yT(t.auth,i);s!==r.email&&await r.reload()}async function HT(r,e,t){const n=z(r),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await r.getIdToken(),newEmail:e};t&&Qa(n.auth,s,t);const{email:o}=await IT(n.auth,s);o!==r.email&&await r.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function QT(r,e){return Te(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function YT(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=z(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Wt(n,QT(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function JT(r,e){const t=z(r);return pe(t.auth.app)?Promise.reject(Me(t.auth)):wg(t,e,null)}function XT(r,e){return wg(z(r),null,e)}async function wg(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Wt(r,fT(n,s));await r._updateTokensIfNecessary(o,!0)}/**
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
 */function ZT(r){var i,s;if(!r)return null;const{providerId:e}=r,t=r.rawUserInfo?JSON.parse(r.rawUserInfo):{},n=r.isNewUser||r.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(r!=null&&r.idToken)){const o=(s=(i=za(r.idToken))==null?void 0:i.firebase)==null?void 0:s.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new ei(n,c)}}if(!e)return null;switch(e){case"facebook.com":return new eb(n,t);case"github.com":return new tb(n,t);case"google.com":return new nb(n,t);case"twitter.com":return new rb(n,t,r.screenName||null);case"custom":case"anonymous":return new ei(n,null);default:return new ei(n,e,t)}}class ei{constructor(e,t,n={}){this.isNewUser=e,this.providerId=t,this.profile=n}}class Ig extends ei{constructor(e,t,n,i){super(e,t,n),this.username=i}}class eb extends ei{constructor(e,t){super(e,"facebook.com",t)}}class tb extends Ig{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class nb extends ei{constructor(e,t){super(e,"google.com",t)}}class rb extends Ig{constructor(e,t,n){super(e,"twitter.com",t,n)}}function ib(r){const{user:e,_tokenResponse:t}=r;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:ZT(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class or{constructor(e,t,n){this.type=e,this.credential=t,this.user=n}static _fromIdtoken(e,t){return new or("enroll",e,t)}static _fromMfaPendingCredential(e){return new or("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,n;if(e!=null&&e.multiFactorSession){if((t=e.multiFactorSession)!=null&&t.pendingCredential)return or._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if((n=e.multiFactorSession)!=null&&n.idToken)return or._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vu{constructor(e,t,n){this.session=e,this.hints=t,this.signInResolver=n}static _fromError(e,t){const n=_e(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>ho._fromServerResponse(n,c));O(i.mfaPendingCredential,n,"internal-error");const o=or._fromMfaPendingCredential(i.mfaPendingCredential);return new Vu(o,s,async c=>{const l=await c._process(n,o);delete i.mfaInfo,delete i.mfaPendingCredential;const u={...i,idToken:l.idToken,refreshToken:l.refreshToken};switch(t.operationType){case"signIn":const d=await gt._fromIdTokenResponse(n,t.operationType,u);return await n._updateCurrentUser(d.user),d;case"reauthenticate":return O(t.user,n,"internal-error"),gt._forOperation(t.user,t.operationType,u);default:Be(n,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function sb(r,e){var i;const t=z(r),n=e;return O(e.customData.operationType,t,"argument-error"),O((i=n.customData._serverResponse)==null?void 0:i.mfaPendingCredential,t,"argument-error"),Vu._fromError(t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xf(r,e){return Te(r,"POST","/v2/accounts/mfaEnrollment:start",ve(r,e))}function ob(r,e){return Te(r,"POST","/v2/accounts/mfaEnrollment:finalize",ve(r,e))}function ab(r,e){return Te(r,"POST","/v2/accounts/mfaEnrollment:withdraw",ve(r,e))}class Ou{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(n=>ho._fromServerResponse(e.auth,n)))})}static _fromUser(e){return new Ou(e)}async getSession(){return or._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const n=e,i=await this.getSession(),s=await Wt(this.user,n._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,n=await this.user.getIdToken();try{const i=await Wt(this.user,ab(this.user.auth,{idToken:n,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const ll=new WeakMap;function cb(r){const e=z(r);return ll.has(e)||ll.set(e,Ou._fromUser(e)),ll.get(e)}const Ea="__sak";/**
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
 */class Eg{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Ea,"1"),this.storage.removeItem(Ea),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lb=1e3,ub=10;class vg extends Eg{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=sg(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);zv()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,ub):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},lb)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}vg.type="LOCAL";const Mu=vg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tg extends Eg{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Tg.type="SESSION";const fr=Tg;/**
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
 */function hb(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class Ya{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new Ya(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async u=>u(t.origin,s)),l=await hb(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Ya.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fo(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
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
 */class db{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,l)=>{const u=fo("",20);i.port1.start();const d=setTimeout(()=>{l(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(p){const g=p;if(g.data.eventId===u)switch(g.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(d),clearTimeout(s),l(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:u,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pe(){return window}function fb(r){Pe().location.href=r}/**
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
 */function Lu(){return typeof Pe().WorkerGlobalScope<"u"&&typeof Pe().importScripts=="function"}async function pb(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function mb(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)==null?void 0:r.controller)||null}function gb(){return Lu()?self:null}/**
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
 */const bg="firebaseLocalStorageDb",yb=1,va="firebaseLocalStorage",Ag="fbase_key";class po{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Ja(r,e){return r.transaction([va],e?"readwrite":"readonly").objectStore(va)}function _b(){const r=indexedDB.deleteDatabase(bg);return new po(r).toPromise()}function Rl(){const r=indexedDB.open(bg,yb);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(va,{keyPath:Ag})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(va)?e(n):(n.close(),await _b(),e(await Rl()))})})}async function Nf(r,e,t){const n=Ja(r,!0).put({[Ag]:e,value:t});return new po(n).toPromise()}async function wb(r,e){const t=Ja(r,!1).get(e),n=await new po(t).toPromise();return n===void 0?null:n.value}function Vf(r,e){const t=Ja(r,!0).delete(e);return new po(t).toPromise()}const Ib=800,Eb=3;class Sg{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Rl(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>Eb)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Lu()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Ya._getInstance(gb()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await pb(),!this.activeServiceWorker)return;this.sender=new db(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(n=e[0])!=null&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||mb()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Rl();return await Nf(e,Ea,"1"),await Vf(e,Ea),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Nf(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>wb(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Vf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=Ja(i,!1).getAll();return new po(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Ib)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Sg.type="LOCAL";const Bs=Sg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Of(r,e){return Te(r,"POST","/v2/accounts/mfaSignIn:start",ve(r,e))}function vb(r,e){return Te(r,"POST","/v2/accounts/mfaSignIn:finalize",ve(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ul=ag("rcb"),Tb=new ao(3e4,6e4);class bb{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=Pe().grecaptcha)!=null&&e.render)}load(e,t=""){return O(Ab(t),e,"argument-error"),this.shouldResolveImmediately(t)&&Tf(Pe().grecaptcha)?Promise.resolve(Pe().grecaptcha):new Promise((n,i)=>{const s=Pe().setTimeout(()=>{i(De(e,"network-request-failed"))},Tb.get());Pe()[ul]=()=>{Pe().clearTimeout(s),delete Pe()[ul];const c=Pe().grecaptcha;if(!c||!Tf(c)){i(De(e,"internal-error"));return}const l=c.render;c.render=(u,d)=>{const p=l(u,d);return this.counter++,p},this.hostLanguage=t,n(c)};const o=`${Jv()}?${Pi({onload:ul,render:"explicit",hl:t})}`;Cu(o).catch(()=>{clearTimeout(s),i(De(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=Pe().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function Ab(r){return r.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(r)}class Sb{async load(e){return new nT(e)}clearedOneInstance(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vs="recaptcha",Rb={theme:"light",type:"image"};let Pb=class{constructor(e,t,n={...Rb}){this.parameters=n,this.type=vs,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=_e(e),this.isInvisible=this.parameters.size==="invisible",O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;O(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new Sb:new bb,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),n=t.getResponse(e);return n||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){O(!this.parameters.sitekey,this.auth,"argument-error"),O(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),O(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(n=>n(t)),typeof e=="function")e(t);else if(typeof e=="string"){const n=Pe()[e];typeof n=="function"&&n(t)}}}assertNotDestroyed(){O(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){O(Ru()&&!Lu(),this.auth,"internal-error"),await Cb(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await xv(this.auth);O(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return O(this.recaptcha,this.auth,"internal-error"),this.recaptcha}};function Cb(){let r=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}r=()=>e(),window.addEventListener("load",r)}).catch(e=>{throw r&&window.removeEventListener("load",r),e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fu{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=hr._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function kb(r,e,t){if(pe(r.app))return Promise.reject(Me(r));const n=_e(r),i=await Xa(n,e,z(t));return new Fu(i,s=>Ha(n,s))}async function Db(r,e,t){const n=z(r);await Wa(!1,n,"phone");const i=await Xa(n.auth,e,z(t));return new Fu(i,s=>gg(n,s))}async function xb(r,e,t){const n=z(r);if(pe(n.auth.app))return Promise.reject(Me(n.auth));const i=await Xa(n.auth,e,z(t));return new Fu(i,s=>yg(n,s))}async function Xa(r,e,t){var n;if(!r._getRecaptchaConfig())try{await cT(r)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){O(s.type==="enroll",r,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await En(r,o,"mfaSmsEnrollment",async(d,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===Es){O((t==null?void 0:t.type)===vs,d,"argument-error");const g=await hl(d,p,t);return xf(d,g)}return xf(d,p)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{O(s.type==="signin",r,"internal-error");const o=((n=i.multiFactorHint)==null?void 0:n.uid)||i.multiFactorUid;O(o,r,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await En(r,c,"mfaSmsSignIn",async(p,g)=>{if(g.phoneSignInInfo.captchaResponse===Es){O((t==null?void 0:t.type)===vs,p,"argument-error");const E=await hl(p,g,t);return Of(p,E)}return Of(p,g)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await En(r,s,"sendVerificationCode",async(u,d)=>{if(d.captchaResponse===Es){O((t==null?void 0:t.type)===vs,u,"argument-error");const p=await hl(u,d,t);return kf(u,p)}return kf(u,d)},"PHONE_PROVIDER").catch(u=>Promise.reject(u))).sessionInfo}}finally{t==null||t._reset()}}async function Nb(r,e){const t=z(r);if(pe(t.auth.app))return Promise.reject(Me(t.auth));await ku(t,e)}async function hl(r,e,t){O(t.type===vs,r,"argument-error");const n=await t.verify();O(typeof n=="string",r,"argument-error");const i={...e};if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,l=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:n,captchaResponse:o,clientType:c,recaptchaVersion:l}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:n,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:n}),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let pr=class ea{constructor(e){this.providerId=ea.PROVIDER_ID,this.auth=_e(e)}verifyPhoneNumber(e,t){return Xa(this.auth,e,z(t))}static credential(e,t){return hr._fromVerification(e,t)}static credentialFromResult(e){const t=e;return ea.credentialFromTaggedObject(t)}static credentialFromError(e){return ea.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:n}=e;return t&&n?hr._fromTokenResponse(t,n):null}};pr.PROVIDER_ID="phone";pr.PHONE_SIGN_IN_METHOD="phone";/**
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
 */function Sr(r,e){return e?ht(e):(O(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
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
 */class Uu extends ki{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return zt(e,this._buildIdpRequest())}_linkToIdToken(e,t){return zt(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return zt(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function Vb(r){return mg(r.auth,new Uu(r),r.bypassAuthState)}function Ob(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),pg(t,new Uu(r),r.bypassAuthState)}async function Mb(r){const{auth:e,user:t}=r;return O(t,e,"internal-error"),ku(t,new Uu(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rg{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(u){this.reject(u)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Vb;case"linkViaPopup":case"linkViaRedirect":return Mb;case"reauthViaPopup":case"reauthViaRedirect":return Ob;default:Be(this.auth,"internal-error")}}resolve(e){vt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){vt(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lb=new ao(2e3,1e4);async function Fb(r,e,t){if(pe(r.app))return Promise.reject(De(r,"operation-not-supported-in-this-environment"));const n=_e(r);Ci(r,e,Xt);const i=Sr(n,t);return new $t(n,"signInViaPopup",e,i).executeNotNull()}async function Ub(r,e,t){const n=z(r);if(pe(n.auth.app))return Promise.reject(De(n.auth,"operation-not-supported-in-this-environment"));Ci(n.auth,e,Xt);const i=Sr(n.auth,t);return new $t(n.auth,"reauthViaPopup",e,i,n).executeNotNull()}async function Bb(r,e,t){const n=z(r);Ci(n.auth,e,Xt);const i=Sr(n.auth,t);return new $t(n.auth,"linkViaPopup",e,i,n).executeNotNull()}class $t extends Rg{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,$t.currentPopupAction&&$t.currentPopupAction.cancel(),$t.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return O(e,this.auth,"internal-error"),e}async onExecution(){vt(this.filter.length===1,"Popup operations only handle one event");const e=fo();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(De(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(De(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,$t.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if((n=(t=this.authWindow)==null?void 0:t.window)!=null&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(De(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Lb.get())};e()}}$t.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qb="pendingRedirect",Ts=new Map;class $b extends Rg{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=Ts.get(this.auth._key());if(!e){try{const n=await Kb(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}Ts.set(this.auth._key(),e)}return this.bypassAuthState||Ts.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Kb(r,e){const t=Cg(e),n=Pg(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}async function Bu(r,e){return Pg(r)._set(Cg(e),"true")}function zb(){Ts.clear()}function qu(r,e){Ts.set(r._key(),e)}function Pg(r){return ht(r._redirectPersistence)}function Cg(r){return ur(qb,r.config.apiKey,r.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jb(r,e,t){return Gb(r,e,t)}async function Gb(r,e,t){if(pe(r.app))return Promise.reject(Me(r));const n=_e(r);Ci(r,e,Xt),await n._initializationPromise;const i=Sr(n,t);return await Bu(i,n),i._openRedirect(n,e,"signInViaRedirect")}function Wb(r,e,t){return Hb(r,e,t)}async function Hb(r,e,t){const n=z(r);if(Ci(n.auth,e,Xt),pe(n.auth.app))return Promise.reject(Me(n.auth));await n.auth._initializationPromise;const i=Sr(n.auth,t);await Bu(i,n.auth);const s=await kg(n);return i._openRedirect(n.auth,e,"reauthViaRedirect",s)}function Qb(r,e,t){return Yb(r,e,t)}async function Yb(r,e,t){const n=z(r);Ci(n.auth,e,Xt),await n.auth._initializationPromise;const i=Sr(n.auth,t);await Wa(!1,n,e.providerId),await Bu(i,n.auth);const s=await kg(n);return i._openRedirect(n.auth,e,"linkViaRedirect",s)}async function Jb(r,e){return await _e(r)._initializationPromise,Za(r,e,!1)}async function Za(r,e,t=!1){if(pe(r.app))return Promise.reject(Me(r));const n=_e(r),i=Sr(n,e),o=await new $b(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}async function kg(r){const e=fo(`${r.uid}:::`);return r._redirectEventId=e,await r.auth._setRedirectUser(r),await r.auth._persistUserIfCurrent(r),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xb=10*60*1e3;class Dg{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Zb(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!xg(e)){const i=((n=e.error.code)==null?void 0:n.split("auth/")[1])||"internal-error";t.onError(De(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Xb&&this.cachedEventUids.clear(),this.cachedEventUids.has(Mf(e))}saveEventToCache(e){this.cachedEventUids.add(Mf(e)),this.lastProcessedEventTime=Date.now()}}function Mf(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function xg({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function Zb(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return xg(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ng(r,e={}){return Te(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eA=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,tA=/^https?/;async function nA(r){if(r.config.emulator)return;const{authorizedDomains:e}=await Ng(r);for(const t of e)try{if(rA(t))return}catch{}Be(r,"unauthorized-domain")}function rA(r){const e=Ls(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!tA.test(t))return!1;if(eA.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
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
 */const iA=new ao(3e4,6e4);function Lf(){const r=Pe().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function sA(r){return new Promise((e,t)=>{var i,s,o;function n(){Lf(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Lf(),t(De(r,"network-request-failed"))},timeout:iA.get()})}if((s=(i=Pe().gapi)==null?void 0:i.iframes)!=null&&s.Iframe)e(gapi.iframes.getContext());else if((o=Pe().gapi)!=null&&o.load)n();else{const c=ag("iframefcb");return Pe()[c]=()=>{gapi.load?n():t(De(r,"network-request-failed"))},Cu(`${Zv()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw ta=null,e})}let ta=null;function oA(r){return ta=ta||sA(r),ta}/**
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
 */const aA=new ao(5e3,15e3),cA="__/auth/iframe",lA="emulator/auth/iframe",uA={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},hA=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function dA(r){const e=r.config;O(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Pu(e,lA):`https://${r.config.authDomain}/${cA}`,n={apiKey:e.apiKey,appName:r.name,v:Ln},i=hA.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${Pi(n).slice(1)}`}async function fA(r){const e=await oA(r),t=Pe().gapi;return O(t,r,"internal-error"),e.open({where:document.body,url:dA(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:uA,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=De(r,"network-request-failed"),c=Pe().setTimeout(()=>{s(o)},aA.get());function l(){Pe().clearTimeout(c),i(n)}n.ping(l).then(l,()=>{s(o)})}))}/**
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
 */const pA={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},mA=500,gA=600,yA="_blank",_A="http://localhost";class Ff{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function wA(r,e,t,n=mA,i=gA){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const l={...pA,width:n.toString(),height:i.toString(),top:s,left:o},u=ye().toLowerCase();t&&(c=tg(u)?yA:t),Zm(u)&&(e=e||_A,l.scrollbars="yes");const d=Object.entries(l).reduce((g,[E,k])=>`${g}${E}=${k},`,"");if(Kv(u)&&c!=="_self")return IA(e||"",c),new Ff(null);const p=window.open(e||"",c,d);O(p,r,"popup-blocked");try{p.focus()}catch{}return new Ff(p)}function IA(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
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
 */const EA="__/auth/handler",vA="emulator/auth/handler",TA=encodeURIComponent("fac");async function Pl(r,e,t,n,i,s){O(r.config.authDomain,r,"auth-domain-config-required"),O(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:Ln,eventId:i};if(e instanceof Xt){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",YI(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries(s||{}))o[d]=p}if(e instanceof Di){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const l=await r._getAppCheckToken(),u=l?`#${TA}=${encodeURIComponent(l)}`:"";return`${bA(r)}?${Pi(c).slice(1)}${u}`}function bA({config:r}){return r.emulator?Pu(r,vA):`https://${r.authDomain}/${EA}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dl="webStorageSupport";class AA{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=fr,this._completeRedirectFn=Za,this._overrideRedirectResult=qu}async _openPopup(e,t,n,i){var o;vt((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const s=await Pl(e,t,n,Ls(),i);return wA(e,s,fo())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await Pl(e,t,n,Ls(),i);return fb(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(vt(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await fA(e),n=new Dg(e);return t.register("authEvent",i=>(O(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(dl,{type:dl},i=>{var o;const s=(o=i==null?void 0:i[0])==null?void 0:o[dl];s!==void 0&&t(!!s),Be(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=nA(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return sg()||eg()||lo()}}const SA=AA;class RA{constructor(e){this.factorId=e}_process(e,t,n){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,n);case"signin":return this._finalizeSignIn(e,t.credential);default:return xt("unexpected MultiFactorSessionType")}}}class $u extends RA{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new $u(e)}_finalizeEnroll(e,t,n){return ob(e,{idToken:t,displayName:n,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return vb(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class Vg{constructor(){}static assertion(e){return $u._fromCredential(e)}}Vg.FACTOR_ID="phone";var Uf="@firebase/auth",Bf="1.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PA{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){O(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function CA(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function kA(r){Pn(new Ft("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;O(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const l={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:og(r)},u=new Qv(n,i,s,l);return lT(u,t),u},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),Pn(new Ft("auth-internal",e=>{const t=_e(e.getProvider("auth").getImmediate());return(n=>new PA(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),wt(Uf,Bf,CA(r)),wt(Uf,Bf,"esm2020")}/**
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
 */const DA=5*60;FI("authIdTokenMaxAge");function xA(){var r;return((r=document.getElementsByTagName("head"))==null?void 0:r[0])??document}Yv({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=De("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",xA().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});kA("Browser");/**
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
 */function mr(){return window}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const NA=2e3;async function VA(r,e,t){const{BuildInfo:n}=mr();vt(e.sessionId,"AuthEvent did not contain a session ID");const i=await UA(e.sessionId),s={};return lo()?s.ibi=n.packageName:co()?s.apn=n.packageName:Be(r,"operation-not-supported-in-this-environment"),n.displayName&&(s.appDisplayName=n.displayName),s.sessionId=i,Pl(r,t,e.type,void 0,e.eventId??void 0,s)}async function OA(r){const{BuildInfo:e}=mr(),t={};lo()?t.iosBundleId=e.packageName:co()?t.androidPackageName=e.packageName:Be(r,"operation-not-supported-in-this-environment"),await Ng(r,t)}function MA(r){const{cordova:e}=mr();return new Promise(t=>{e.plugins.browsertab.isAvailable(n=>{let i=null;n?e.plugins.browsertab.openUrl(r):i=e.InAppBrowser.open(r,$v()?"_blank":"_system","location=yes"),t(i)})})}async function LA(r,e,t){const{cordova:n}=mr();let i=()=>{};try{await new Promise((s,o)=>{let c=null;function l(){var g;s();const p=(g=n.plugins.browsertab)==null?void 0:g.close;typeof p=="function"&&p(),typeof(t==null?void 0:t.close)=="function"&&t.close()}function u(){c||(c=window.setTimeout(()=>{o(De(r,"redirect-cancelled-by-user"))},NA))}function d(){(document==null?void 0:document.visibilityState)==="visible"&&u()}e.addPassiveListener(l),document.addEventListener("resume",u,!1),co()&&document.addEventListener("visibilitychange",d,!1),i=()=>{e.removePassiveListener(l),document.removeEventListener("resume",u,!1),document.removeEventListener("visibilitychange",d,!1),c&&window.clearTimeout(c)}})}finally{i()}}function FA(r){var t,n,i,s,o,c,l,u,d,p;const e=mr();O(typeof((t=e==null?void 0:e.universalLinks)==null?void 0:t.subscribe)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-universal-links-plugin-fix"}),O(typeof((n=e==null?void 0:e.BuildInfo)==null?void 0:n.packageName)<"u",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-buildInfo"}),O(typeof((o=(s=(i=e==null?void 0:e.cordova)==null?void 0:i.plugins)==null?void 0:s.browsertab)==null?void 0:o.openUrl)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((u=(l=(c=e==null?void 0:e.cordova)==null?void 0:c.plugins)==null?void 0:l.browsertab)==null?void 0:u.isAvailable)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),O(typeof((p=(d=e==null?void 0:e.cordova)==null?void 0:d.InAppBrowser)==null?void 0:p.open)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-inappbrowser"})}async function UA(r){const e=BA(r),t=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(t)).map(i=>i.toString(16).padStart(2,"0")).join("")}function BA(r){if(vt(/[0-9a-zA-Z]+/.test(r),"Can only convert alpha-numeric strings"),typeof TextEncoder<"u")return new TextEncoder().encode(r);const e=new ArrayBuffer(r.length),t=new Uint8Array(e);for(let n=0;n<r.length;n++)t[n]=r.charCodeAt(n);return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qA=20;class $A extends Dg{constructor(){super(...arguments),this.passiveListeners=new Set,this.initPromise=new Promise(e=>{this.resolveInitialized=e})}addPassiveListener(e){this.passiveListeners.add(e)}removePassiveListener(e){this.passiveListeners.delete(e)}resetRedirect(){this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1}onEvent(e){return this.resolveInitialized(),this.passiveListeners.forEach(t=>t(e)),super.onEvent(e)}async initialized(){await this.initPromise}}function KA(r,e,t=null){return{type:e,eventId:t,urlResponse:null,sessionId:GA(),postBody:null,tenantId:r.tenantId,error:De(r,"no-auth-event")}}function zA(r,e){return Cl()._set(kl(r),e)}async function qf(r){const e=await Cl()._get(kl(r));return e&&await Cl()._remove(kl(r)),e}function jA(r,e){var n,i;const t=HA(e);if(t.includes("/__/auth/callback")){const s=na(t),o=s.firebaseError?WA(decodeURIComponent(s.firebaseError)):null,c=(i=(n=o==null?void 0:o.code)==null?void 0:n.split("auth/"))==null?void 0:i[1],l=c?De(c):null;return l?{type:r.type,eventId:r.eventId,tenantId:r.tenantId,error:l,urlResponse:null,sessionId:null,postBody:null}:{type:r.type,eventId:r.eventId,tenantId:r.tenantId,sessionId:r.sessionId,urlResponse:t,postBody:null}}return null}function GA(){const r=[],e="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let t=0;t<qA;t++){const n=Math.floor(Math.random()*e.length);r.push(e.charAt(n))}return r.join("")}function Cl(){return ht(Mu)}function kl(r){return ur("authEvent",r.config.apiKey,r.name)}function WA(r){try{return JSON.parse(r)}catch{return null}}function HA(r){const e=na(r),t=e.link?decodeURIComponent(e.link):void 0,n=na(t).link,i=e.deep_link_id?decodeURIComponent(e.deep_link_id):void 0;return na(i).link||i||n||t||r}function na(r){if(!(r!=null&&r.includes("?")))return{};const[e,...t]=r.split("?");return Hr(t.join("?"))}/**
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
 */const QA=500;class YA{constructor(){this._redirectPersistence=fr,this._shouldInitProactively=!0,this.eventManagers=new Map,this.originValidationPromises={},this._completeRedirectFn=Za,this._overrideRedirectResult=qu}async _initialize(e){const t=e._key();let n=this.eventManagers.get(t);return n||(n=new $A(e),this.eventManagers.set(t,n),this.attachCallbackListeners(e,n)),n}_openPopup(e){Be(e,"operation-not-supported-in-this-environment")}async _openRedirect(e,t,n,i){FA(e);const s=await this._initialize(e);await s.initialized(),s.resetRedirect(),zb(),await this._originValidation(e);const o=KA(e,n,i);await zA(e,o);const c=await VA(e,o,t),l=await MA(c);return LA(e,s,l)}_isIframeWebStorageSupported(e,t){throw new Error("Method not implemented.")}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=OA(e)),this.originValidationPromises[t]}attachCallbackListeners(e,t){const{universalLinks:n,handleOpenURL:i,BuildInfo:s}=mr(),o=setTimeout(async()=>{await qf(e),t.onEvent($f())},QA),c=async d=>{clearTimeout(o);const p=await qf(e);let g=null;p&&(d!=null&&d.url)&&(g=jA(p,d.url)),t.onEvent(g||$f())};typeof n<"u"&&typeof n.subscribe=="function"&&n.subscribe(null,c);const l=i,u=`${s.packageName.toLowerCase()}://`;mr().handleOpenURL=async d=>{if(d.toLowerCase().startsWith(u)&&c({url:d}),typeof l=="function")try{l(d)}catch(p){console.error(p)}}}}const JA=YA;function $f(){return{type:"unknown",eventId:null,sessionId:null,urlResponse:null,postBody:null,tenantId:null,error:De("no-auth-event")}}/**
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
 */function XA(r,e){_e(r)._logFramework(e)}var ZA="@firebase/auth-compat",eS="0.6.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tS=1e3;function bs(){var r;return((r=self==null?void 0:self.location)==null?void 0:r.protocol)||null}function nS(){return bs()==="http:"||bs()==="https:"}function Og(r=ye()){return!!((bs()==="file:"||bs()==="ionic:"||bs()==="capacitor:")&&r.toLowerCase().match(/iphone|ipad|ipod|android/))}function rS(){return wu()||$a()}function iS(){return Rm()&&(document==null?void 0:document.documentMode)===11}function sS(r=ye()){return/Edge\/\d+/.test(r)}function oS(r=ye()){return iS()||sS(r)}function Mg(){try{const r=self.localStorage,e=fo();if(r)return r.setItem(e,"1"),r.removeItem(e),oS()?Vs():!0}catch{return Ku()&&Vs()}return!1}function Ku(){return typeof global<"u"&&"WorkerGlobalScope"in global&&"importScripts"in global}function fl(){return(nS()||Sm()||Og())&&!rS()&&Mg()&&!Ku()}function Lg(){return Og()&&typeof document<"u"}async function aS(){return Lg()?new Promise(r=>{const e=setTimeout(()=>{r(!1)},tS);document.addEventListener("deviceready",()=>{clearTimeout(e),r(!0)})}):!1}function cS(){return typeof window<"u"?window:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ut={LOCAL:"local",NONE:"none",SESSION:"session"},is=O,Fg="persistence";function lS(r,e){if(is(Object.values(ut).includes(e),r,"invalid-persistence-type"),wu()){is(e!==ut.SESSION,r,"unsupported-persistence-type");return}if($a()){is(e===ut.NONE,r,"unsupported-persistence-type");return}if(Ku()){is(e===ut.NONE||e===ut.LOCAL&&Vs(),r,"unsupported-persistence-type");return}is(e===ut.NONE||Mg(),r,"unsupported-persistence-type")}async function Dl(r){await r._initializationPromise;const e=Ug(),t=ur(Fg,r.config.apiKey,r.name);e&&e.setItem(t,r._getPersistenceType())}function uS(r,e){const t=Ug();if(!t)return[];const n=ur(Fg,r,e);switch(t.getItem(n)){case ut.NONE:return[si];case ut.LOCAL:return[Bs,fr];case ut.SESSION:return[fr];default:return[]}}function Ug(){var r;try{return((r=cS())==null?void 0:r.sessionStorage)||null}catch{return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hS=O;class yn{constructor(){this.browserResolver=ht(SA),this.cordovaResolver=ht(JA),this.underlyingResolver=null,this._redirectPersistence=fr,this._completeRedirectFn=Za,this._overrideRedirectResult=qu}async _initialize(e){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._initialize(e)}async _openPopup(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openPopup(e,t,n,i)}async _openRedirect(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openRedirect(e,t,n,i)}_isIframeWebStorageSupported(e,t){this.assertedUnderlyingResolver._isIframeWebStorageSupported(e,t)}_originValidation(e){return this.assertedUnderlyingResolver._originValidation(e)}get _shouldInitProactively(){return Lg()||this.browserResolver._shouldInitProactively}get assertedUnderlyingResolver(){return hS(this.underlyingResolver,"internal-error"),this.underlyingResolver}async selectUnderlyingResolver(){if(this.underlyingResolver)return;const e=await aS();this.underlyingResolver=e?this.cordovaResolver:this.browserResolver}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bg(r){return r.unwrap()}function dS(r){return r.wrapped()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fS(r){return qg(r)}function pS(r,e){var n;const t=(n=e.customData)==null?void 0:n._tokenResponse;if((e==null?void 0:e.code)==="auth/multi-factor-auth-required"){const i=e;i.resolver=new mS(r,sb(r,e))}else if(t){const i=qg(e),s=e;i&&(s.credential=i,s.tenantId=t.tenantId||void 0,s.email=t.email||void 0,s.phoneNumber=t.phoneNumber||void 0)}}function qg(r){const{_tokenResponse:e}=r instanceof Ze?r.customData:r;if(!e)return null;if(!(r instanceof Ze)&&"temporaryProof"in e&&"phoneNumber"in e)return pr.credentialFromResult(r);const t=e.providerId;if(!t||t===ns.PASSWORD)return null;let n;switch(t){case ns.GOOGLE:n=Ct;break;case ns.FACEBOOK:n=Pt;break;case ns.GITHUB:n=kt;break;case ns.TWITTER:n=Dt;break;default:const{oauthIdToken:i,oauthAccessToken:s,oauthTokenSecret:o,pendingToken:c,nonce:l}=e;return!s&&!o&&!i&&!c?null:c?t.startsWith("saml.")?oi._create(t,c):Ut._fromParams({providerId:t,signInMethod:t,pendingToken:c,idToken:i,accessToken:s}):new Zr(t).credential({idToken:i,accessToken:s,rawNonce:l})}return r instanceof Ze?n.credentialFromError(r):n.credentialFromResult(r)}function rt(r,e){return e.catch(t=>{throw t instanceof Ze&&pS(r,t),t}).then(t=>{const n=t.operationType,i=t.user;return{operationType:n,credential:fS(t),additionalUserInfo:ib(t),user:ec.getOrCreate(i)}})}async function xl(r,e){const t=await e;return{verificationId:t.verificationId,confirm:n=>rt(r,t.confirm(n))}}class mS{constructor(e,t){this.resolver=t,this.auth=dS(e)}get session(){return this.resolver.session}get hints(){return this.resolver.hints}resolveSignIn(e){return rt(Bg(this.auth),this.resolver.resolveSignIn(e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ec=class fs{constructor(e){this._delegate=e,this.multiFactor=cb(e)}static getOrCreate(e){return fs.USER_MAP.has(e)||fs.USER_MAP.set(e,new fs(e)),fs.USER_MAP.get(e)}delete(){return this._delegate.delete()}reload(){return this._delegate.reload()}toJSON(){return this._delegate.toJSON()}getIdTokenResult(e){return this._delegate.getIdTokenResult(e)}getIdToken(e){return this._delegate.getIdToken(e)}linkAndRetrieveDataWithCredential(e){return this.linkWithCredential(e)}async linkWithCredential(e){return rt(this.auth,gg(this._delegate,e))}async linkWithPhoneNumber(e,t){return xl(this.auth,Db(this._delegate,e,t))}async linkWithPopup(e){return rt(this.auth,Bb(this._delegate,e,yn))}async linkWithRedirect(e){return await Dl(_e(this.auth)),Qb(this._delegate,e,yn)}reauthenticateAndRetrieveDataWithCredential(e){return this.reauthenticateWithCredential(e)}async reauthenticateWithCredential(e){return rt(this.auth,yg(this._delegate,e))}reauthenticateWithPhoneNumber(e,t){return xl(this.auth,xb(this._delegate,e,t))}reauthenticateWithPopup(e){return rt(this.auth,Ub(this._delegate,e,yn))}async reauthenticateWithRedirect(e){return await Dl(_e(this.auth)),Wb(this._delegate,e,yn)}sendEmailVerification(e){return WT(this._delegate,e)}async unlink(e){return await NT(this._delegate,e),this}updateEmail(e){return JT(this._delegate,e)}updatePassword(e){return XT(this._delegate,e)}updatePhoneNumber(e){return Nb(this._delegate,e)}updateProfile(e){return YT(this._delegate,e)}verifyBeforeUpdateEmail(e,t){return HT(this._delegate,e,t)}get emailVerified(){return this._delegate.emailVerified}get isAnonymous(){return this._delegate.isAnonymous}get metadata(){return this._delegate.metadata}get phoneNumber(){return this._delegate.phoneNumber}get providerData(){return this._delegate.providerData}get refreshToken(){return this._delegate.refreshToken}get tenantId(){return this._delegate.tenantId}get displayName(){return this._delegate.displayName}get email(){return this._delegate.email}get photoURL(){return this._delegate.photoURL}get providerId(){return this._delegate.providerId}get uid(){return this._delegate.uid}get auth(){return this._delegate.auth}};ec.USER_MAP=new WeakMap;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ss=O;class Nl{constructor(e,t){if(this.app=e,t.isInitialized()){this._delegate=t.getImmediate(),this.linkUnderlyingAuth();return}const{apiKey:n}=e.options;ss(n,"invalid-api-key",{appName:e.name}),ss(n,"invalid-api-key",{appName:e.name});const i=typeof window<"u"?yn:void 0;this._delegate=t.initialize({options:{persistence:gS(n,e.name),popupRedirectResolver:i}}),this._delegate._updateErrorMap(vv),this.linkUnderlyingAuth()}get emulatorConfig(){return this._delegate.emulatorConfig}get currentUser(){return this._delegate.currentUser?ec.getOrCreate(this._delegate.currentUser):null}get languageCode(){return this._delegate.languageCode}set languageCode(e){this._delegate.languageCode=e}get settings(){return this._delegate.settings}get tenantId(){return this._delegate.tenantId}set tenantId(e){this._delegate.tenantId=e}useDeviceLanguage(){this._delegate.useDeviceLanguage()}signOut(){return this._delegate.signOut()}useEmulator(e,t){uT(this._delegate,e,t)}applyActionCode(e){return FT(this._delegate,e)}checkActionCode(e){return _g(this._delegate,e)}confirmPasswordReset(e,t){return LT(this._delegate,e,t)}async createUserWithEmailAndPassword(e,t){return rt(this._delegate,BT(this._delegate,e,t))}fetchProvidersForEmail(e){return this.fetchSignInMethodsForEmail(e)}fetchSignInMethodsForEmail(e){return GT(this._delegate,e)}isSignInWithEmailLink(e){return KT(this._delegate,e)}async getRedirectResult(){ss(fl(),this._delegate,"operation-not-supported-in-this-environment");const e=await Jb(this._delegate,yn);return e?rt(this._delegate,Promise.resolve(e)):{credential:null,user:null}}addFrameworkForLogging(e){XA(this._delegate,e)}onAuthStateChanged(e,t,n){const{next:i,error:s,complete:o}=Kf(e,t,n);return this._delegate.onAuthStateChanged(i,s,o)}onIdTokenChanged(e,t,n){const{next:i,error:s,complete:o}=Kf(e,t,n);return this._delegate.onIdTokenChanged(i,s,o)}sendSignInLinkToEmail(e,t){return $T(this._delegate,e,t)}sendPasswordResetEmail(e,t){return MT(this._delegate,e,t||void 0)}async setPersistence(e){lS(this._delegate,e);let t;switch(e){case ut.SESSION:t=fr;break;case ut.LOCAL:t=await ht(Bs)._isAvailable()?Bs:Mu;break;case ut.NONE:t=si;break;default:return Be("argument-error",{appName:this._delegate.name})}return this._delegate.setPersistence(t)}signInAndRetrieveDataWithCredential(e){return this.signInWithCredential(e)}signInAnonymously(){return rt(this._delegate,xT(this._delegate))}signInWithCredential(e){return rt(this._delegate,Ha(this._delegate,e))}signInWithCustomToken(e){return rt(this._delegate,OT(this._delegate,e))}signInWithEmailAndPassword(e,t){return rt(this._delegate,qT(this._delegate,e,t))}signInWithEmailLink(e,t){return rt(this._delegate,zT(this._delegate,e,t))}signInWithPhoneNumber(e,t){return xl(this._delegate,kb(this._delegate,e,t))}async signInWithPopup(e){return ss(fl(),this._delegate,"operation-not-supported-in-this-environment"),rt(this._delegate,Fb(this._delegate,e,yn))}async signInWithRedirect(e){return ss(fl(),this._delegate,"operation-not-supported-in-this-environment"),await Dl(this._delegate),jb(this._delegate,e,yn)}updateCurrentUser(e){return this._delegate.updateCurrentUser(e)}verifyPasswordResetCode(e){return UT(this._delegate,e)}unwrap(){return this._delegate}_delete(){return this._delegate._delete()}linkUnderlyingAuth(){this._delegate.wrapped=()=>this}}Nl.Persistence=ut;function Kf(r,e,t){let n=r;typeof r!="function"&&({next:n,error:e,complete:t}=r);const i=n;return{next:o=>i(o&&ec.getOrCreate(o)),error:e,complete:t}}function gS(r,e){const t=uS(r,e);if(typeof self<"u"&&!t.includes(Bs)&&t.push(Bs),typeof window<"u")for(const n of[Mu,fr])t.includes(n)||t.push(n);return t.includes(si)||t.push(si),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zu{static credential(e,t){return pr.credential(e,t)}constructor(){this.providerId="phone",this._delegate=new pr(Bg(oo.auth()))}verifyPhoneNumber(e,t){return this._delegate.verifyPhoneNumber(e,t)}unwrap(){return this._delegate}}zu.PHONE_SIGN_IN_METHOD=pr.PHONE_SIGN_IN_METHOD;zu.PROVIDER_ID=pr.PROVIDER_ID;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yS=O;class _S{constructor(e,t,n=oo.app()){var i;yS((i=n.options)==null?void 0:i.apiKey,"invalid-api-key",{appName:n.name}),this._delegate=new Pb(n.auth(),e,t),this.type=this._delegate.type}clear(){this._delegate.clear()}render(){return this._delegate.render()}verify(){return this._delegate.verify()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wS="auth-compat";function IS(r){r.INTERNAL.registerComponent(new Ft(wS,e=>{const t=e.getProvider("app-compat").getImmediate(),n=e.getProvider("auth");return new Nl(t,n)},"PUBLIC").setServiceProps({ActionCodeInfo:{Operation:{EMAIL_SIGNIN:Vr.EMAIL_SIGNIN,PASSWORD_RESET:Vr.PASSWORD_RESET,RECOVER_EMAIL:Vr.RECOVER_EMAIL,REVERT_SECOND_FACTOR_ADDITION:Vr.REVERT_SECOND_FACTOR_ADDITION,VERIFY_AND_CHANGE_EMAIL:Vr.VERIFY_AND_CHANGE_EMAIL,VERIFY_EMAIL:Vr.VERIFY_EMAIL}},EmailAuthProvider:Fn,FacebookAuthProvider:Pt,GithubAuthProvider:kt,GoogleAuthProvider:Ct,OAuthProvider:Zr,SAMLAuthProvider:wa,PhoneAuthProvider:zu,PhoneMultiFactorGenerator:Vg,RecaptchaVerifier:_S,TwitterAuthProvider:Dt,Auth:Nl,AuthCredential:ki,Error:Ze}).setInstantiationMode("LAZY").setMultipleInstances(!1)),r.registerVersion(ZA,eS)}IS(oo);var zf=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var vn,$g;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(I,y){function w(){}w.prototype=y.prototype,I.F=y.prototype,I.prototype=new w,I.prototype.constructor=I,I.D=function(b,v,R){for(var _=Array(arguments.length-2),nt=2;nt<arguments.length;nt++)_[nt-2]=arguments[nt];return y.prototype[v].apply(b,_)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(I,y,w){w||(w=0);const b=Array(16);if(typeof y=="string")for(var v=0;v<16;++v)b[v]=y.charCodeAt(w++)|y.charCodeAt(w++)<<8|y.charCodeAt(w++)<<16|y.charCodeAt(w++)<<24;else for(v=0;v<16;++v)b[v]=y[w++]|y[w++]<<8|y[w++]<<16|y[w++]<<24;y=I.g[0],w=I.g[1],v=I.g[2];let R=I.g[3],_;_=y+(R^w&(v^R))+b[0]+3614090360&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[1]+3905402710&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[2]+606105819&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[3]+3250441966&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[4]+4118548399&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[5]+1200080426&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[6]+2821735955&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[7]+4249261313&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[8]+1770035416&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[9]+2336552879&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[10]+4294925233&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[11]+2304563134&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(R^w&(v^R))+b[12]+1804603682&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(v^y&(w^v))+b[13]+4254626195&4294967295,R=y+(_<<12&4294967295|_>>>20),_=v+(w^R&(y^w))+b[14]+2792965006&4294967295,v=R+(_<<17&4294967295|_>>>15),_=w+(y^v&(R^y))+b[15]+1236535329&4294967295,w=v+(_<<22&4294967295|_>>>10),_=y+(v^R&(w^v))+b[1]+4129170786&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[6]+3225465664&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[11]+643717713&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[0]+3921069994&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[5]+3593408605&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[10]+38016083&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[15]+3634488961&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[4]+3889429448&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[9]+568446438&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[14]+3275163606&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[3]+4107603335&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[8]+1163531501&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(v^R&(w^v))+b[13]+2850285829&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^v&(y^w))+b[2]+4243563512&4294967295,R=y+(_<<9&4294967295|_>>>23),_=v+(y^w&(R^y))+b[7]+1735328473&4294967295,v=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(v^R))+b[12]+2368359562&4294967295,w=v+(_<<20&4294967295|_>>>12),_=y+(w^v^R)+b[5]+4294588738&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[8]+2272392833&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[11]+1839030562&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[14]+4259657740&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[1]+2763975236&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[4]+1272893353&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[7]+4139469664&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[10]+3200236656&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[13]+681279174&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[0]+3936430074&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[3]+3572445317&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[6]+76029189&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(w^v^R)+b[9]+3654602809&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^v)+b[12]+3873151461&4294967295,R=y+(_<<11&4294967295|_>>>21),_=v+(R^y^w)+b[15]+530742520&4294967295,v=R+(_<<16&4294967295|_>>>16),_=w+(v^R^y)+b[2]+3299628645&4294967295,w=v+(_<<23&4294967295|_>>>9),_=y+(v^(w|~R))+b[0]+4096336452&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[7]+1126891415&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[14]+2878612391&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[5]+4237533241&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[12]+1700485571&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[3]+2399980690&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[10]+4293915773&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[1]+2240044497&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[8]+1873313359&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[15]+4264355552&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[6]+2734768916&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[13]+1309151649&4294967295,w=v+(_<<21&4294967295|_>>>11),_=y+(v^(w|~R))+b[4]+4149444226&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~v))+b[11]+3174756917&4294967295,R=y+(_<<10&4294967295|_>>>22),_=v+(y^(R|~w))+b[2]+718787259&4294967295,v=R+(_<<15&4294967295|_>>>17),_=w+(R^(v|~y))+b[9]+3951481745&4294967295,I.g[0]=I.g[0]+y&4294967295,I.g[1]=I.g[1]+(v+(_<<21&4294967295|_>>>11))&4294967295,I.g[2]=I.g[2]+v&4294967295,I.g[3]=I.g[3]+R&4294967295}n.prototype.v=function(I,y){y===void 0&&(y=I.length);const w=y-this.blockSize,b=this.C;let v=this.h,R=0;for(;R<y;){if(v==0)for(;R<=w;)i(this,I,R),R+=this.blockSize;if(typeof I=="string"){for(;R<y;)if(b[v++]=I.charCodeAt(R++),v==this.blockSize){i(this,b),v=0;break}}else for(;R<y;)if(b[v++]=I[R++],v==this.blockSize){i(this,b),v=0;break}}this.h=v,this.o+=y},n.prototype.A=function(){var I=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);I[0]=128;for(var y=1;y<I.length-8;++y)I[y]=0;y=this.o*8;for(var w=I.length-8;w<I.length;++w)I[w]=y&255,y/=256;for(this.v(I),I=Array(16),y=0,w=0;w<4;++w)for(let b=0;b<32;b+=8)I[y++]=this.g[w]>>>b&255;return I};function s(I,y){var w=c;return Object.prototype.hasOwnProperty.call(w,I)?w[I]:w[I]=y(I)}function o(I,y){this.h=y;const w=[];let b=!0;for(let v=I.length-1;v>=0;v--){const R=I[v]|0;b&&R==y||(w[v]=R,b=!1)}this.g=w}var c={};function l(I){return-128<=I&&I<128?s(I,function(y){return new o([y|0],y<0?-1:0)}):new o([I|0],I<0?-1:0)}function u(I){if(isNaN(I)||!isFinite(I))return p;if(I<0)return T(u(-I));const y=[];let w=1;for(let b=0;I>=w;b++)y[b]=I/w|0,w*=4294967296;return new o(y,0)}function d(I,y){if(I.length==0)throw Error("number format error: empty string");if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(I.charAt(0)=="-")return T(d(I.substring(1),y));if(I.indexOf("-")>=0)throw Error('number format error: interior "-" character');const w=u(Math.pow(y,8));let b=p;for(let R=0;R<I.length;R+=8){var v=Math.min(8,I.length-R);const _=parseInt(I.substring(R,R+v),y);v<8?(v=u(Math.pow(y,v)),b=b.j(v).add(u(_))):(b=b.j(w),b=b.add(u(_)))}return b}var p=l(0),g=l(1),E=l(16777216);r=o.prototype,r.m=function(){if(D(this))return-T(this).m();let I=0,y=1;for(let w=0;w<this.g.length;w++){const b=this.i(w);I+=(b>=0?b:4294967296+b)*y,y*=4294967296}return I},r.toString=function(I){if(I=I||10,I<2||36<I)throw Error("radix out of range: "+I);if(k(this))return"0";if(D(this))return"-"+T(this).toString(I);const y=u(Math.pow(I,6));var w=this;let b="";for(;;){const v=j(w,y).g;w=V(w,v.j(y));let R=((w.g.length>0?w.g[0]:w.h)>>>0).toString(I);if(w=v,k(w))return R+b;for(;R.length<6;)R="0"+R;b=R+b}},r.i=function(I){return I<0?0:I<this.g.length?this.g[I]:this.h};function k(I){if(I.h!=0)return!1;for(let y=0;y<I.g.length;y++)if(I.g[y]!=0)return!1;return!0}function D(I){return I.h==-1}r.l=function(I){return I=V(this,I),D(I)?-1:k(I)?0:1};function T(I){const y=I.g.length,w=[];for(let b=0;b<y;b++)w[b]=~I.g[b];return new o(w,~I.h).add(g)}r.abs=function(){return D(this)?T(this):this},r.add=function(I){const y=Math.max(this.g.length,I.g.length),w=[];let b=0;for(let v=0;v<=y;v++){let R=b+(this.i(v)&65535)+(I.i(v)&65535),_=(R>>>16)+(this.i(v)>>>16)+(I.i(v)>>>16);b=_>>>16,R&=65535,_&=65535,w[v]=_<<16|R}return new o(w,w[w.length-1]&-2147483648?-1:0)};function V(I,y){return I.add(T(y))}r.j=function(I){if(k(this)||k(I))return p;if(D(this))return D(I)?T(this).j(T(I)):T(T(this).j(I));if(D(I))return T(this.j(T(I)));if(this.l(E)<0&&I.l(E)<0)return u(this.m()*I.m());const y=this.g.length+I.g.length,w=[];for(var b=0;b<2*y;b++)w[b]=0;for(b=0;b<this.g.length;b++)for(let v=0;v<I.g.length;v++){const R=this.i(b)>>>16,_=this.i(b)&65535,nt=I.i(v)>>>16,zn=I.i(v)&65535;w[2*b+2*v]+=_*zn,M(w,2*b+2*v),w[2*b+2*v+1]+=R*zn,M(w,2*b+2*v+1),w[2*b+2*v+1]+=_*nt,M(w,2*b+2*v+1),w[2*b+2*v+2]+=R*nt,M(w,2*b+2*v+2)}for(I=0;I<y;I++)w[I]=w[2*I+1]<<16|w[2*I];for(I=y;I<2*y;I++)w[I]=0;return new o(w,0)};function M(I,y){for(;(I[y]&65535)!=I[y];)I[y+1]+=I[y]>>>16,I[y]&=65535,y++}function B(I,y){this.g=I,this.h=y}function j(I,y){if(k(y))throw Error("division by zero");if(k(I))return new B(p,p);if(D(I))return y=j(T(I),y),new B(T(y.g),T(y.h));if(D(y))return y=j(I,T(y)),new B(T(y.g),y.h);if(I.g.length>30){if(D(I)||D(y))throw Error("slowDivide_ only works with positive integers.");for(var w=g,b=y;b.l(I)<=0;)w=Q(w),b=Q(b);var v=W(w,1),R=W(b,1);for(b=W(b,2),w=W(w,2);!k(b);){var _=R.add(b);_.l(I)<=0&&(v=v.add(w),R=_),b=W(b,1),w=W(w,1)}return y=V(I,v.j(y)),new B(v,y)}for(v=p;I.l(y)>=0;){for(w=Math.max(1,Math.floor(I.m()/y.m())),b=Math.ceil(Math.log(w)/Math.LN2),b=b<=48?1:Math.pow(2,b-48),R=u(w),_=R.j(y);D(_)||_.l(I)>0;)w-=b,R=u(w),_=R.j(y);k(R)&&(R=g),v=v.add(R),I=V(I,_)}return new B(v,I)}r.B=function(I){return j(this,I).h},r.and=function(I){const y=Math.max(this.g.length,I.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)&I.i(b);return new o(w,this.h&I.h)},r.or=function(I){const y=Math.max(this.g.length,I.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)|I.i(b);return new o(w,this.h|I.h)},r.xor=function(I){const y=Math.max(this.g.length,I.g.length),w=[];for(let b=0;b<y;b++)w[b]=this.i(b)^I.i(b);return new o(w,this.h^I.h)};function Q(I){const y=I.g.length+1,w=[];for(let b=0;b<y;b++)w[b]=I.i(b)<<1|I.i(b-1)>>>31;return new o(w,I.h)}function W(I,y){const w=y>>5;y%=32;const b=I.g.length-w,v=[];for(let R=0;R<b;R++)v[R]=y>0?I.i(R+w)>>>y|I.i(R+w+1)<<32-y:I.i(R+w);return new o(v,I.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,$g=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=u,o.fromString=d,vn=o}).apply(typeof zf<"u"?zf:typeof self<"u"?self:typeof window<"u"?window:{});var Go=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Kg,ps,zg,ra,Vl,jg,Gg,Wg;(function(){var r,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Go=="object"&&Go];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var n=t(this);function i(a,h){if(h)e:{var f=n;a=a.split(".");for(var m=0;m<a.length-1;m++){var S=a[m];if(!(S in f))break e;f=f[S]}a=a[a.length-1],m=f[a],h=h(m),h!=m&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(h){var f=[],m;for(m in h)Object.prototype.hasOwnProperty.call(h,m)&&f.push([m,h[m]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function l(a,h,f){return a.call.apply(a.bind,arguments)}function u(a,h,f){return u=l,u.apply(null,arguments)}function d(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var m=f.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,h){function f(){}f.prototype=h.prototype,a.Z=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Ob=function(m,S,C){for(var F=Array(arguments.length-2),Y=2;Y<arguments.length;Y++)F[Y-2]=arguments[Y];return h.prototype[S].apply(m,F)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function E(a){const h=a.length;if(h>0){const f=Array(h);for(let m=0;m<h;m++)f[m]=a[m];return f}return[]}function k(a,h){for(let m=1;m<arguments.length;m++){const S=arguments[m];var f=typeof S;if(f=f!="object"?f:S?Array.isArray(S)?"array":f:"null",f=="array"||f=="object"&&typeof S.length=="number"){f=a.length||0;const C=S.length||0;a.length=f+C;for(let F=0;F<C;F++)a[f+F]=S[F]}else a.push(S)}}class D{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function T(a){o.setTimeout(()=>{throw a},0)}function V(){var a=I;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class M{constructor(){this.h=this.g=null}add(h,f){const m=B.get();m.set(h,f),this.h?this.h.next=m:this.g=m,this.h=m}}var B=new D(()=>new j,a=>a.reset());class j{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let Q,W=!1,I=new M,y=()=>{const a=Promise.resolve(void 0);Q=()=>{a.then(w)}};function w(){for(var a;a=V();){try{a.h.call(a.g)}catch(f){T(f)}var h=B;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}W=!1}function b(){this.u=this.u,this.C=this.C}b.prototype.u=!1,b.prototype.dispose=function(){this.u||(this.u=!0,this.N())},b.prototype[Symbol.dispose]=function(){this.dispose()},b.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function v(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}v.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};o.addEventListener("test",f,h),o.removeEventListener("test",f,h)}catch{}return a}();function _(a){return/^[\s\xa0]*$/.test(a)}function nt(a,h){v.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(nt,v),nt.prototype.init=function(a,h){const f=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&nt.Z.h.call(this)},nt.prototype.h=function(){nt.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var zn="closure_listenable_"+(Math.random()*1e6|0),Xw=0;function Zw(a,h,f,m,S){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!m,this.ha=S,this.key=++Xw,this.da=this.fa=!1}function ko(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function Do(a,h,f){for(const m in a)h.call(f,a[m],m,a)}function eI(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function ad(a){const h={};for(const f in a)h[f]=a[f];return h}const cd="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function ld(a,h){let f,m;for(let S=1;S<arguments.length;S++){m=arguments[S];for(f in m)a[f]=m[f];for(let C=0;C<cd.length;C++)f=cd[C],Object.prototype.hasOwnProperty.call(m,f)&&(a[f]=m[f])}}function xo(a){this.src=a,this.g={},this.h=0}xo.prototype.add=function(a,h,f,m,S){const C=a.toString();a=this.g[C],a||(a=this.g[C]=[],this.h++);const F=Vc(a,h,m,S);return F>-1?(h=a[F],f||(h.fa=!1)):(h=new Zw(h,this.src,C,!!m,S),h.fa=f,a.push(h)),h};function Nc(a,h){const f=h.type;if(f in a.g){var m=a.g[f],S=Array.prototype.indexOf.call(m,h,void 0),C;(C=S>=0)&&Array.prototype.splice.call(m,S,1),C&&(ko(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function Vc(a,h,f,m){for(let S=0;S<a.length;++S){const C=a[S];if(!C.da&&C.listener==h&&C.capture==!!f&&C.ha==m)return S}return-1}var Oc="closure_lm_"+(Math.random()*1e6|0),Mc={};function ud(a,h,f,m,S){if(Array.isArray(h)){for(let C=0;C<h.length;C++)ud(a,h[C],f,m,S);return null}return f=fd(f),a&&a[zn]?a.J(h,f,c(m)?!!m.capture:!1,S):tI(a,h,f,!1,m,S)}function tI(a,h,f,m,S,C){if(!h)throw Error("Invalid event type");const F=c(S)?!!S.capture:!!S;let Y=Fc(a);if(Y||(a[Oc]=Y=new xo(a)),f=Y.add(h,f,m,F,C),f.proxy)return f;if(m=nI(),f.proxy=m,m.src=a,m.listener=f,a.addEventListener)R||(S=F),S===void 0&&(S=!1),a.addEventListener(h.toString(),m,S);else if(a.attachEvent)a.attachEvent(dd(h.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return f}function nI(){function a(f){return h.call(a.src,a.listener,f)}const h=rI;return a}function hd(a,h,f,m,S){if(Array.isArray(h))for(var C=0;C<h.length;C++)hd(a,h[C],f,m,S);else m=c(m)?!!m.capture:!!m,f=fd(f),a&&a[zn]?(a=a.i,C=String(h).toString(),C in a.g&&(h=a.g[C],f=Vc(h,f,m,S),f>-1&&(ko(h[f]),Array.prototype.splice.call(h,f,1),h.length==0&&(delete a.g[C],a.h--)))):a&&(a=Fc(a))&&(h=a.g[h.toString()],a=-1,h&&(a=Vc(h,f,m,S)),(f=a>-1?h[a]:null)&&Lc(f))}function Lc(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[zn])Nc(h.i,a);else{var f=a.type,m=a.proxy;h.removeEventListener?h.removeEventListener(f,m,a.capture):h.detachEvent?h.detachEvent(dd(f),m):h.addListener&&h.removeListener&&h.removeListener(m),(f=Fc(h))?(Nc(f,a),f.h==0&&(f.src=null,h[Oc]=null)):ko(a)}}}function dd(a){return a in Mc?Mc[a]:Mc[a]="on"+a}function rI(a,h){if(a.da)a=!0;else{h=new nt(h,this);const f=a.listener,m=a.ha||a.src;a.fa&&Lc(a),a=f.call(m,h)}return a}function Fc(a){return a=a[Oc],a instanceof xo?a:null}var Uc="__closure_events_fn_"+(Math.random()*1e9>>>0);function fd(a){return typeof a=="function"?a:(a[Uc]||(a[Uc]=function(h){return a.handleEvent(h)}),a[Uc])}function qe(){b.call(this),this.i=new xo(this),this.M=this,this.G=null}p(qe,b),qe.prototype[zn]=!0,qe.prototype.removeEventListener=function(a,h,f,m){hd(this,a,h,f,m)};function We(a,h){var f,m=a.G;if(m)for(f=[];m;m=m.G)f.push(m);if(a=a.M,m=h.type||h,typeof h=="string")h=new v(h,a);else if(h instanceof v)h.target=h.target||a;else{var S=h;h=new v(m,a),ld(h,S)}S=!0;let C,F;if(f)for(F=f.length-1;F>=0;F--)C=h.g=f[F],S=No(C,m,!0,h)&&S;if(C=h.g=a,S=No(C,m,!0,h)&&S,S=No(C,m,!1,h)&&S,f)for(F=0;F<f.length;F++)C=h.g=f[F],S=No(C,m,!1,h)&&S}qe.prototype.N=function(){if(qe.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const f=a.g[h];for(let m=0;m<f.length;m++)ko(f[m]);delete a.g[h],a.h--}}this.G=null},qe.prototype.J=function(a,h,f,m){return this.i.add(String(a),h,!1,f,m)},qe.prototype.K=function(a,h,f,m){return this.i.add(String(a),h,!0,f,m)};function No(a,h,f,m){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let S=!0;for(let C=0;C<h.length;++C){const F=h[C];if(F&&!F.da&&F.capture==f){const Y=F.listener,ke=F.ha||F.src;F.fa&&Nc(a.i,F),S=Y.call(ke,m)!==!1&&S}}return S&&!m.defaultPrevented}function iI(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=u(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function pd(a){a.g=iI(()=>{a.g=null,a.i&&(a.i=!1,pd(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class sI extends b{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:pd(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Bi(a){b.call(this),this.h=a,this.g={}}p(Bi,b);var md=[];function gd(a){Do(a.g,function(h,f){this.g.hasOwnProperty(f)&&Lc(h)},a),a.g={}}Bi.prototype.N=function(){Bi.Z.N.call(this),gd(this)},Bi.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Bc=o.JSON.stringify,oI=o.JSON.parse,aI=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function yd(){}function _d(){}var qi={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function qc(){v.call(this,"d")}p(qc,v);function $c(){v.call(this,"c")}p($c,v);var jn={},wd=null;function Vo(){return wd=wd||new qe}jn.Ia="serverreachability";function Id(a){v.call(this,jn.Ia,a)}p(Id,v);function $i(a){const h=Vo();We(h,new Id(h))}jn.STAT_EVENT="statevent";function Ed(a,h){v.call(this,jn.STAT_EVENT,a),this.stat=h}p(Ed,v);function He(a){const h=Vo();We(h,new Ed(h,a))}jn.Ja="timingevent";function vd(a,h){v.call(this,jn.Ja,a),this.size=h}p(vd,v);function Ki(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function zi(){this.g=!0}zi.prototype.ua=function(){this.g=!1};function cI(a,h,f,m,S,C){a.info(function(){if(a.g)if(C){var F="",Y=C.split("&");for(let oe=0;oe<Y.length;oe++){var ke=Y[oe].split("=");if(ke.length>1){const Ne=ke[0];ke=ke[1];const At=Ne.split("_");F=At.length>=2&&At[1]=="type"?F+(Ne+"="+ke+"&"):F+(Ne+"=redacted&")}}}else F=null;else F=C;return"XMLHTTP REQ ("+m+") [attempt "+S+"]: "+h+`
`+f+`
`+F})}function lI(a,h,f,m,S,C,F){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+S+"]: "+h+`
`+f+`
`+C+" "+F})}function Dr(a,h,f,m){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+hI(a,f)+(m?" "+m:"")})}function uI(a,h){a.info(function(){return"TIMEOUT: "+h})}zi.prototype.info=function(){};function hI(a,h){if(!a.g)return h;if(!h)return null;try{const C=JSON.parse(h);if(C){for(a=0;a<C.length;a++)if(Array.isArray(C[a])){var f=C[a];if(!(f.length<2)){var m=f[1];if(Array.isArray(m)&&!(m.length<1)){var S=m[0];if(S!="noop"&&S!="stop"&&S!="close")for(let F=1;F<m.length;F++)m[F]=""}}}}return Bc(C)}catch{return h}}var Oo={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Td={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},bd;function Kc(){}p(Kc,yd),Kc.prototype.g=function(){return new XMLHttpRequest},bd=new Kc;function ji(a){return encodeURIComponent(String(a))}function dI(a){var h=1;a=a.split(":");const f=[];for(;h>0&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function sn(a,h,f,m){this.j=a,this.i=h,this.l=f,this.S=m||1,this.V=new Bi(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Ad}function Ad(){this.i=null,this.g="",this.h=!1}var Sd={},zc={};function jc(a,h,f){a.M=1,a.A=Lo(bt(h)),a.u=f,a.R=!0,Rd(a,null)}function Rd(a,h){a.F=Date.now(),Mo(a),a.B=bt(a.A);var f=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),Bd(f.i,"t",m),a.C=0,f=a.j.L,a.h=new Ad,a.g=sf(a.j,f?h:null,!a.u),a.P>0&&(a.O=new sI(u(a.Y,a,a.g),a.P)),h=a.V,f=a.g,m=a.ba;var S="readystatechange";Array.isArray(S)||(S&&(md[0]=S.toString()),S=md);for(let C=0;C<S.length;C++){const F=ud(f,S[C],m||h.handleEvent,!1,h.h||h);if(!F)break;h.g[F.key]=F}h=a.J?ad(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),$i(),cI(a.i,a.v,a.B,a.l,a.S,a.u)}sn.prototype.ba=function(a){a=a.target;const h=this.O;h&&cn(a)==3?h.j():this.Y(a)},sn.prototype.Y=function(a){try{if(a==this.g)e:{const Y=cn(this.g),ke=this.g.ya(),oe=this.g.ca();if(!(Y<3)&&(Y!=3||this.g&&(this.h.h||this.g.la()||Wd(this.g)))){this.K||Y!=4||ke==7||(ke==8||oe<=0?$i(3):$i(2)),Gc(this);var h=this.g.ca();this.X=h;var f=fI(this);if(this.o=h==200,lI(this.i,this.v,this.B,this.l,this.S,Y,h),this.o){if(this.U&&!this.L){t:{if(this.g){var m,S=this.g;if((m=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!_(m)){var C=m;break t}}C=null}if(a=C)Dr(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Wc(this,a);else{this.o=!1,this.m=3,He(12),Gn(this),Gi(this);break e}}if(this.R){a=!0;let Ne;for(;!this.K&&this.C<f.length;)if(Ne=pI(this,f),Ne==zc){Y==4&&(this.m=4,He(14),a=!1),Dr(this.i,this.l,null,"[Incomplete Response]");break}else if(Ne==Sd){this.m=4,He(15),Dr(this.i,this.l,f,"[Invalid Chunk]"),a=!1;break}else Dr(this.i,this.l,Ne,null),Wc(this,Ne);if(Pd(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),Y!=4||f.length!=0||this.h.h||(this.m=1,He(16),a=!1),this.o=this.o&&a,!a)Dr(this.i,this.l,f,"[Invalid Chunked Response]"),Gn(this),Gi(this);else if(f.length>0&&!this.W){this.W=!0;var F=this.j;F.g==this&&F.aa&&!F.P&&(F.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),tl(F),F.P=!0,He(11))}}else Dr(this.i,this.l,f,null),Wc(this,f);Y==4&&Gn(this),this.o&&!this.K&&(Y==4?ef(this.j,this):(this.o=!1,Mo(this)))}else PI(this.g),h==400&&f.indexOf("Unknown SID")>0?(this.m=3,He(12)):(this.m=0,He(13)),Gn(this),Gi(this)}}}catch{}finally{}};function fI(a){if(!Pd(a))return a.g.la();const h=Wd(a.g);if(h==="")return"";let f="";const m=h.length,S=cn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Gn(a),Gi(a),"";a.h.i=new o.TextDecoder}for(let C=0;C<m;C++)a.h.h=!0,f+=a.h.i.decode(h[C],{stream:!(S&&C==m-1)});return h.length=0,a.h.g+=f,a.C=0,a.h.g}function Pd(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function pI(a,h){var f=a.C,m=h.indexOf(`
`,f);return m==-1?zc:(f=Number(h.substring(f,m)),isNaN(f)?Sd:(m+=1,m+f>h.length?zc:(h=h.slice(m,m+f),a.C=m+f,h)))}sn.prototype.cancel=function(){this.K=!0,Gn(this)};function Mo(a){a.T=Date.now()+a.H,Cd(a,a.H)}function Cd(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Ki(u(a.aa,a),h)}function Gc(a){a.D&&(o.clearTimeout(a.D),a.D=null)}sn.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(uI(this.i,this.B),this.M!=2&&($i(),He(17)),Gn(this),this.m=2,Gi(this)):Cd(this,this.T-a)};function Gi(a){a.j.I==0||a.K||ef(a.j,a)}function Gn(a){Gc(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,gd(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function Wc(a,h){try{var f=a.j;if(f.I!=0&&(f.g==a||Hc(f.h,a))){if(!a.L&&Hc(f.h,a)&&f.I==3){try{var m=f.Ba.g.parse(h)}catch{m=null}if(Array.isArray(m)&&m.length==3){var S=m;if(S[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<a.F)$o(f),Bo(f);else break e;el(f),He(18)}}else f.xa=S[1],0<f.xa-f.K&&S[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=Ki(u(f.Va,f),6e3));xd(f.h)<=1&&f.ta&&(f.ta=void 0)}else Hn(f,11)}else if((a.L||f.g==a)&&$o(f),!_(h))for(S=f.Ba.g.parse(h),h=0;h<S.length;h++){let oe=S[h];const Ne=oe[0];if(!(Ne<=f.K))if(f.K=Ne,oe=oe[1],f.I==2)if(oe[0]=="c"){f.M=oe[1],f.ba=oe[2];const At=oe[3];At!=null&&(f.ka=At,f.j.info("VER="+f.ka));const Qn=oe[4];Qn!=null&&(f.za=Qn,f.j.info("SVER="+f.za));const ln=oe[5];ln!=null&&typeof ln=="number"&&ln>0&&(m=1.5*ln,f.O=m,f.j.info("backChannelRequestTimeoutMs_="+m)),m=f;const un=a.g;if(un){const zo=un.g?un.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(zo){var C=m.h;C.g||zo.indexOf("spdy")==-1&&zo.indexOf("quic")==-1&&zo.indexOf("h2")==-1||(C.j=C.l,C.g=new Set,C.h&&(Qc(C,C.h),C.h=null))}if(m.G){const nl=un.g?un.g.getResponseHeader("X-HTTP-Session-Id"):null;nl&&(m.wa=nl,le(m.J,m.G,nl))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-a.F,f.j.info("Handshake RTT: "+f.T+"ms")),m=f;var F=a;if(m.na=rf(m,m.L?m.ba:null,m.W),F.L){Nd(m.h,F);var Y=F,ke=m.O;ke&&(Y.H=ke),Y.D&&(Gc(Y),Mo(Y)),m.g=F}else Xd(m);f.i.length>0&&qo(f)}else oe[0]!="stop"&&oe[0]!="close"||Hn(f,7);else f.I==3&&(oe[0]=="stop"||oe[0]=="close"?oe[0]=="stop"?Hn(f,7):Zc(f):oe[0]!="noop"&&f.l&&f.l.qa(oe),f.A=0)}}$i(4)}catch{}}var mI=class{constructor(a,h){this.g=a,this.map=h}};function kd(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Dd(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function xd(a){return a.h?1:a.g?a.g.size:0}function Hc(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function Qc(a,h){a.g?a.g.add(h):a.h=h}function Nd(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}kd.prototype.cancel=function(){if(this.i=Vd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Vd(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.G);return h}return E(a.i)}var Od=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function gI(a,h){if(a){a=a.split("&");for(let f=0;f<a.length;f++){const m=a[f].indexOf("=");let S,C=null;m>=0?(S=a[f].substring(0,m),C=a[f].substring(m+1)):S=a[f],h(S,C?decodeURIComponent(C.replace(/\+/g," ")):"")}}}function on(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof on?(this.l=a.l,Wi(this,a.j),this.o=a.o,this.g=a.g,Hi(this,a.u),this.h=a.h,Yc(this,qd(a.i)),this.m=a.m):a&&(h=String(a).match(Od))?(this.l=!1,Wi(this,h[1]||"",!0),this.o=Qi(h[2]||""),this.g=Qi(h[3]||"",!0),Hi(this,h[4]),this.h=Qi(h[5]||"",!0),Yc(this,h[6]||"",!0),this.m=Qi(h[7]||"")):(this.l=!1,this.i=new Ji(null,this.l))}on.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Yi(h,Md,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Yi(h,Md,!0),"@"),a.push(ji(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&a.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(Yi(f,f.charAt(0)=="/"?wI:_I,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",Yi(f,EI)),a.join("")},on.prototype.resolve=function(a){const h=bt(this);let f=!!a.j;f?Wi(h,a.j):f=!!a.o,f?h.o=a.o:f=!!a.g,f?h.g=a.g:f=a.u!=null;var m=a.h;if(f)Hi(h,a.u);else if(f=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var S=h.h.lastIndexOf("/");S!=-1&&(m=h.h.slice(0,S+1)+m)}if(S=m,S==".."||S==".")m="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){m=S.lastIndexOf("/",0)==0,S=S.split("/");const C=[];for(let F=0;F<S.length;){const Y=S[F++];Y=="."?m&&F==S.length&&C.push(""):Y==".."?((C.length>1||C.length==1&&C[0]!="")&&C.pop(),m&&F==S.length&&C.push("")):(C.push(Y),m=!0)}m=C.join("/")}else m=S}return f?h.h=m:f=a.i.toString()!=="",f?Yc(h,qd(a.i)):f=!!a.m,f&&(h.m=a.m),h};function bt(a){return new on(a)}function Wi(a,h,f){a.j=f?Qi(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function Hi(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function Yc(a,h,f){h instanceof Ji?(a.i=h,vI(a.i,a.l)):(f||(h=Yi(h,II)),a.i=new Ji(h,a.l))}function le(a,h,f){a.i.set(h,f)}function Lo(a){return le(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function Qi(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Yi(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,yI),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function yI(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Md=/[#\/\?@]/g,_I=/[#\?:]/g,wI=/[#\?]/g,II=/[#\?@]/g,EI=/#/g;function Ji(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Wn(a){a.g||(a.g=new Map,a.h=0,a.i&&gI(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}r=Ji.prototype,r.add=function(a,h){Wn(this),this.i=null,a=xr(this,a);let f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function Ld(a,h){Wn(a),h=xr(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function Fd(a,h){return Wn(a),h=xr(a,h),a.g.has(h)}r.forEach=function(a,h){Wn(this),this.g.forEach(function(f,m){f.forEach(function(S){a.call(h,S,m,this)},this)},this)};function Ud(a,h){Wn(a);let f=[];if(typeof h=="string")Fd(a,h)&&(f=f.concat(a.g.get(xr(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)f=f.concat(a[h]);return f}r.set=function(a,h){return Wn(this),this.i=null,a=xr(this,a),Fd(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},r.get=function(a,h){return a?(a=Ud(this,a),a.length>0?String(a[0]):h):h};function Bd(a,h,f){Ld(a,h),f.length>0&&(a.i=null,a.g.set(xr(a,h),E(f)),a.h+=f.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let m=0;m<h.length;m++){var f=h[m];const S=ji(f);f=Ud(this,f);for(let C=0;C<f.length;C++){let F=S;f[C]!==""&&(F+="="+ji(f[C])),a.push(F)}}return this.i=a.join("&")};function qd(a){const h=new Ji;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function xr(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function vI(a,h){h&&!a.j&&(Wn(a),a.i=null,a.g.forEach(function(f,m){const S=m.toLowerCase();m!=S&&(Ld(this,m),Bd(this,S,f))},a)),a.j=h}function TI(a,h){const f=new zi;if(o.Image){const m=new Image;m.onload=d(an,f,"TestLoadImage: loaded",!0,h,m),m.onerror=d(an,f,"TestLoadImage: error",!1,h,m),m.onabort=d(an,f,"TestLoadImage: abort",!1,h,m),m.ontimeout=d(an,f,"TestLoadImage: timeout",!1,h,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else h(!1)}function bI(a,h){const f=new zi,m=new AbortController,S=setTimeout(()=>{m.abort(),an(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:m.signal}).then(C=>{clearTimeout(S),C.ok?an(f,"TestPingServer: ok",!0,h):an(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(S),an(f,"TestPingServer: error",!1,h)})}function an(a,h,f,m,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),m(f)}catch{}}function AI(){this.g=new aI}function Jc(a){this.i=a.Sb||null,this.h=a.ab||!1}p(Jc,yd),Jc.prototype.g=function(){return new Fo(this.i,this.h)};function Fo(a,h){qe.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Fo,qe),r=Fo.prototype,r.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,Zi(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Xi(this)),this.readyState=0},r.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Zi(this)),this.g&&(this.readyState=3,Zi(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;$d(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function $d(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}r.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Xi(this):Zi(this),this.readyState==3&&$d(this)}},r.Oa=function(a){this.g&&(this.response=this.responseText=a,Xi(this))},r.Na=function(a){this.g&&(this.response=a,Xi(this))},r.ga=function(){this.g&&Xi(this)};function Xi(a){a.readyState=4,a.l=null,a.j=null,a.B=null,Zi(a)}r.setRequestHeader=function(a,h){this.A.append(a,h)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function Zi(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Fo.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Kd(a){let h="";return Do(a,function(f,m){h+=m,h+=":",h+=f,h+=`\r
`}),h}function Xc(a,h,f){e:{for(m in f){var m=!1;break e}m=!0}m||(f=Kd(f),typeof a=="string"?f!=null&&ji(f):le(a,h,f))}function we(a){qe.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(we,qe);var SI=/^https?$/i,RI=["POST","PUT"];r=we.prototype,r.Fa=function(a){this.H=a},r.ea=function(a,h,f,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():bd.g(),this.g.onreadystatechange=g(u(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(C){zd(this,C);return}if(a=f||"",f=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var S in m)f.set(S,m[S]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const C of m.keys())f.set(C,m.get(C));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(f.keys()).find(C=>C.toLowerCase()=="content-type"),S=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(RI,h,void 0)>=0)||m||S||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[C,F]of f)this.g.setRequestHeader(C,F);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(C){zd(this,C)}};function zd(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,jd(a),Uo(a)}function jd(a){a.A||(a.A=!0,We(a,"complete"),We(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,We(this,"complete"),We(this,"abort"),Uo(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Uo(this,!0)),we.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?Gd(this):this.Xa())},r.Xa=function(){Gd(this)};function Gd(a){if(a.h&&typeof s<"u"){if(a.v&&cn(a)==4)setTimeout(a.Ca.bind(a),0);else if(We(a,"readystatechange"),cn(a)==4){a.h=!1;try{const C=a.ca();e:switch(C){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var m;if(m=C===0){let F=String(a.D).match(Od)[1]||null;!F&&o.self&&o.self.location&&(F=o.self.location.protocol.slice(0,-1)),m=!SI.test(F?F.toLowerCase():"")}f=m}if(f)We(a,"complete"),We(a,"success");else{a.o=6;try{var S=cn(a)>2?a.g.statusText:""}catch{S=""}a.l=S+" ["+a.ca()+"]",jd(a)}}finally{Uo(a)}}}}function Uo(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const f=a.g;a.g=null,h||We(a,"ready");try{f.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function cn(a){return a.g?a.g.readyState:0}r.ca=function(){try{return cn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),oI(h)}};function Wd(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function PI(a){const h={};a=(a.g&&cn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(_(a[m]))continue;var f=dI(a[m]);const S=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const C=h[S]||[];h[S]=C,C.push(f)}eI(h,function(m){return m.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function es(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function Hd(a){this.za=0,this.i=[],this.j=new zi,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=es("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=es("baseRetryDelayMs",5e3,a),this.Za=es("retryDelaySeedMs",1e4,a),this.Ta=es("forwardChannelMaxRetries",2,a),this.va=es("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new kd(a&&a.concurrentRequestLimit),this.Ba=new AI,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=Hd.prototype,r.ka=8,r.I=1,r.connect=function(a,h,f,m){He(0),this.W=a,this.H=h||{},f&&m!==void 0&&(this.H.OSID=f,this.H.OAID=m),this.F=this.X,this.J=rf(this,null,this.W),qo(this)};function Zc(a){if(Qd(a),a.I==3){var h=a.V++,f=bt(a.J);if(le(f,"SID",a.M),le(f,"RID",h),le(f,"TYPE","terminate"),ts(a,f),h=new sn(a,a.j,h),h.M=2,h.A=Lo(bt(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=h.A,f=!0),f||(h.g=sf(h.j,null),h.g.ea(h.A)),h.F=Date.now(),Mo(h)}nf(a)}function Bo(a){a.g&&(tl(a),a.g.cancel(),a.g=null)}function Qd(a){Bo(a),a.v&&(o.clearTimeout(a.v),a.v=null),$o(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function qo(a){if(!Dd(a.h)&&!a.m){a.m=!0;var h=a.Ea;Q||y(),W||(Q(),W=!0),I.add(h,a),a.D=0}}function CI(a,h){return xd(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Ki(u(a.Ea,a,h),tf(a,a.D)),a.D++,!0)}r.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const S=new sn(this,this.j,a);let C=this.o;if(this.U&&(C?(C=ad(C),ld(C,this.U)):C=this.U),this.u!==null||this.R||(S.J=C,C=null),this.S)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var m=this.i[f];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(h+=m,h>4096){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=Jd(this,S,h),f=bt(this.J),le(f,"RID",a),le(f,"CVER",22),this.G&&le(f,"X-HTTP-Session-Id",this.G),ts(this,f),C&&(this.R?h="headers="+ji(Kd(C))+"&"+h:this.u&&Xc(f,this.u,C)),Qc(this.h,S),this.Ra&&le(f,"TYPE","init"),this.S?(le(f,"$req",h),le(f,"SID","null"),S.U=!0,jc(S,f,null)):jc(S,f,h),this.I=2}}else this.I==3&&(a?Yd(this,a):this.i.length==0||Dd(this.h)||Yd(this))};function Yd(a,h){var f;h?f=h.l:f=a.V++;const m=bt(a.J);le(m,"SID",a.M),le(m,"RID",f),le(m,"AID",a.K),ts(a,m),a.u&&a.o&&Xc(m,a.u,a.o),f=new sn(a,a.j,f,a.D+1),a.u===null&&(f.J=a.o),h&&(a.i=h.G.concat(a.i)),h=Jd(a,f,1e3),f.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),Qc(a.h,f),jc(f,m,h)}function ts(a,h){a.H&&Do(a.H,function(f,m){le(h,m,f)}),a.l&&Do({},function(f,m){le(h,m,f)})}function Jd(a,h,f){f=Math.min(a.i.length,f);const m=a.l?u(a.l.Ka,a.l,a):null;e:{var S=a.i;let Y=-1;for(;;){const ke=["count="+f];Y==-1?f>0?(Y=S[0].g,ke.push("ofs="+Y)):Y=0:ke.push("ofs="+Y);let oe=!0;for(let Ne=0;Ne<f;Ne++){var C=S[Ne].g;const At=S[Ne].map;if(C-=Y,C<0)Y=Math.max(0,S[Ne].g-100),oe=!1;else try{C="req"+C+"_"||"";try{var F=At instanceof Map?At:Object.entries(At);for(const[Qn,ln]of F){let un=ln;c(ln)&&(un=Bc(ln)),ke.push(C+Qn+"="+encodeURIComponent(un))}}catch(Qn){throw ke.push(C+"type="+encodeURIComponent("_badmap")),Qn}}catch{m&&m(At)}}if(oe){F=ke.join("&");break e}}F=void 0}return a=a.i.splice(0,f),h.G=a,F}function Xd(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;Q||y(),W||(Q(),W=!0),I.add(h,a),a.A=0}}function el(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Ki(u(a.Da,a),tf(a,a.A)),a.A++,!0)}r.Da=function(){if(this.v=null,Zd(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Ki(u(this.Wa,this),a)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,He(10),Bo(this),Zd(this))};function tl(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Zd(a){a.g=new sn(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=bt(a.na);le(h,"RID","rpc"),le(h,"SID",a.M),le(h,"AID",a.K),le(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&le(h,"TO",a.ia),le(h,"TYPE","xmlhttp"),ts(a,h),a.u&&a.o&&Xc(h,a.u,a.o),a.O&&(a.g.H=a.O);var f=a.g;a=a.ba,f.M=1,f.A=Lo(bt(h)),f.u=null,f.R=!0,Rd(f,a)}r.Va=function(){this.C!=null&&(this.C=null,Bo(this),el(this),He(19))};function $o(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function ef(a,h){var f=null;if(a.g==h){$o(a),tl(a),a.g=null;var m=2}else if(Hc(a.h,h))f=h.G,Nd(a.h,h),m=1;else return;if(a.I!=0){if(h.o)if(m==1){f=h.u?h.u.length:0,h=Date.now()-h.F;var S=a.D;m=Vo(),We(m,new vd(m,f)),qo(a)}else Xd(a);else if(S=h.m,S==3||S==0&&h.X>0||!(m==1&&CI(a,h)||m==2&&el(a)))switch(f&&f.length>0&&(h=a.h,h.i=h.i.concat(f)),S){case 1:Hn(a,5);break;case 4:Hn(a,10);break;case 3:Hn(a,6);break;default:Hn(a,2)}}}function tf(a,h){let f=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(f*=2),f*h}function Hn(a,h){if(a.j.info("Error code "+h),h==2){var f=u(a.bb,a),m=a.Ua;const S=!m;m=new on(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Wi(m,"https"),Lo(m),S?TI(m.toString(),f):bI(m.toString(),f)}else He(2);a.I=0,a.l&&a.l.pa(h),nf(a),Qd(a)}r.bb=function(a){a?(this.j.info("Successfully pinged google.com"),He(2)):(this.j.info("Failed to ping google.com"),He(1))};function nf(a){if(a.I=0,a.ja=[],a.l){const h=Vd(a.h);(h.length!=0||a.i.length!=0)&&(k(a.ja,h),k(a.ja,a.i),a.h.i.length=0,E(a.i),a.i.length=0),a.l.oa()}}function rf(a,h,f){var m=f instanceof on?bt(f):new on(f);if(m.g!="")h&&(m.g=h+"."+m.g),Hi(m,m.u);else{var S=o.location;m=S.protocol,h=h?h+"."+S.hostname:S.hostname,S=+S.port;const C=new on(null);m&&Wi(C,m),h&&(C.g=h),S&&Hi(C,S),f&&(C.h=f),m=C}return f=a.G,h=a.wa,f&&h&&le(m,f,h),le(m,"VER",a.ka),ts(a,m),m}function sf(a,h,f){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new we(new Jc({ab:f})):new we(a.ma),h.Fa(a.L),h}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function of(){}r=of.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function Ko(){}Ko.prototype.g=function(a,h){return new ct(a,h)};function ct(a,h){qe.call(this),this.g=new Hd(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!_(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!_(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Nr(this)}p(ct,qe),ct.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},ct.prototype.close=function(){Zc(this.g)},ct.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.v&&(f={},f.__data__=Bc(a),a=f);h.i.push(new mI(h.Ya++,a)),h.I==3&&qo(h)},ct.prototype.N=function(){this.g.l=null,delete this.j,Zc(this.g),delete this.g,ct.Z.N.call(this)};function af(a){qc.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(af,qc);function cf(){$c.call(this),this.status=1}p(cf,$c);function Nr(a){this.g=a}p(Nr,of),Nr.prototype.ra=function(){We(this.g,"a")},Nr.prototype.qa=function(a){We(this.g,new af(a))},Nr.prototype.pa=function(a){We(this.g,new cf)},Nr.prototype.oa=function(){We(this.g,"b")},Ko.prototype.createWebChannel=Ko.prototype.g,ct.prototype.send=ct.prototype.o,ct.prototype.open=ct.prototype.m,ct.prototype.close=ct.prototype.close,Wg=function(){return new Ko},Gg=function(){return Vo()},jg=jn,Vl={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Oo.NO_ERROR=0,Oo.TIMEOUT=8,Oo.HTTP_ERROR=6,ra=Oo,Td.COMPLETE="complete",zg=Td,_d.EventType=qi,qi.OPEN="a",qi.CLOSE="b",qi.ERROR="c",qi.MESSAGE="d",qe.prototype.listen=qe.prototype.J,ps=_d,we.prototype.listenOnce=we.prototype.K,we.prototype.getLastError=we.prototype.Ha,we.prototype.getLastErrorCode=we.prototype.ya,we.prototype.getStatus=we.prototype.ca,we.prototype.getResponseJson=we.prototype.La,we.prototype.getResponseText=we.prototype.la,we.prototype.send=we.prototype.ea,we.prototype.setWithCredentials=we.prototype.Fa,Kg=we}).apply(typeof Go<"u"?Go:typeof self<"u"?self:typeof window<"u"?window:{});const jf="@firebase/firestore",Gf="4.9.3";/**
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
 */class Oe{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}Oe.UNAUTHENTICATED=new Oe(null),Oe.GOOGLE_CREDENTIALS=new Oe("google-credentials-uid"),Oe.FIRST_PARTY=new Oe("first-party-uid"),Oe.MOCK_USER=new Oe("mock-user");/**
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
 */let xi="12.7.0";/**
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
 */const Cn=new Ka("@firebase/firestore");function Kr(){return Cn.logLevel}function ES(r){Cn.setLogLevel(r)}function N(r,...e){if(Cn.logLevel<=J.DEBUG){const t=e.map(ju);Cn.debug(`Firestore (${xi}): ${r}`,...t)}}function be(r,...e){if(Cn.logLevel<=J.ERROR){const t=e.map(ju);Cn.error(`Firestore (${xi}): ${r}`,...t)}}function Bt(r,...e){if(Cn.logLevel<=J.WARN){const t=e.map(ju);Cn.warn(`Firestore (${xi}): ${r}`,...t)}}function ju(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
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
 */function q(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,Hg(r,n,t)}function Hg(r,e,t){let n=`FIRESTORE (${xi}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw be(n),new Error(n)}function $(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||Hg(e,i,n)}function vS(r,e){r||q(57014,e)}function U(r,e){return r}/**
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
 */const P={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class x extends Ze{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class Ue{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class Qg{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class TS{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(Oe.UNAUTHENTICATED))}shutdown(){}}class bS{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class AS{constructor(e){this.t=e,this.currentUser=Oe.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){$(this.o===void 0,42304);let n=this.i;const i=l=>this.i!==n?(n=this.i,t(l)):Promise.resolve();let s=new Ue;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new Ue,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const l=s;e.enqueueRetryable(async()=>{await l.promise,await i(this.currentUser)})},c=l=>{N("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){const l=this.t.getImmediate({optional:!0});l?c(l):(N("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new Ue)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(N("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?($(typeof n.accessToken=="string",31837,{l:n}),new Qg(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return $(e===null||typeof e=="string",2055,{h:e}),new Oe(e)}}class SS{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=Oe.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class RS{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new SS(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(Oe.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Wf{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class PS{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,pe(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){$(this.o===void 0,3512);const n=s=>{s.error!=null&&N("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,N("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{N("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):N("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new Wf(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?($(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new Wf(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function CS(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
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
 */class Gu{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=CS(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function G(r,e){return r<e?-1:r>e?1:0}function Ol(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const i=r.charAt(n),s=e.charAt(n);if(i!==s)return pl(i)===pl(s)?G(i,s):pl(i)?1:-1}return G(r.length,e.length)}const kS=55296,DS=57343;function pl(r){const e=r.charCodeAt(0);return e>=kS&&e<=DS}function ai(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function Yg(r){return r+"\0"}/**
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
 */const Hf="__name__";class St{constructor(e,t,n){t===void 0?t=0:t>e.length&&q(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&q(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return St.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof St?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=St.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return G(e.length,t.length)}static compareSegments(e,t){const n=St.isNumericId(e),i=St.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?St.extractNumericId(e).compare(St.extractNumericId(t)):Ol(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return vn.fromString(e.substring(4,e.length-2))}}class X extends St{construct(e,t,n){return new X(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new x(P.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new X(t)}static emptyPath(){return new X([])}}const xS=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class me extends St{construct(e,t,n){return new me(e,t,n)}static isValidIdentifier(e){return xS.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),me.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Hf}static keyField(){return new me([Hf])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new x(P.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new x(P.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const l=e[i+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new x(P.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=l,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new x(P.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new me(t)}static emptyPath(){return new me([])}}/**
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
 */class L{constructor(e){this.path=e}static fromPath(e){return new L(X.fromString(e))}static fromName(e){return new L(X.fromString(e).popFirst(5))}static empty(){return new L(X.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&X.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return X.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new L(new X(e.slice()))}}/**
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
 */function Wu(r,e,t){if(!t)throw new x(P.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function Jg(r,e,t,n){if(e===!0&&n===!0)throw new x(P.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function Qf(r){if(!L.isDocumentKey(r))throw new x(P.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function Yf(r){if(L.isDocumentKey(r))throw new x(P.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Xg(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function tc(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":q(12329,{type:typeof r})}function ne(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new x(P.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=tc(r);throw new x(P.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function Zg(r,e){if(e<=0)throw new x(P.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
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
 */function Ce(r,e){const t={typeString:r};return e&&(t.value=e),t}function mo(r,e){if(!Xg(r))throw new x(P.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new x(P.INVALID_ARGUMENT,t);return!0}/**
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
 */const Jf=-62135596800,Xf=1e6;class re{static now(){return re.fromMillis(Date.now())}static fromDate(e){return re.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*Xf);return new re(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new x(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new x(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Jf)throw new x(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new x(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Xf}_compareTo(e){return this.seconds===e.seconds?G(this.nanoseconds,e.nanoseconds):G(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:re._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(mo(e,re._jsonSchema))return new re(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Jf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}re._jsonSchemaVersion="firestore/timestamp/1.0",re._jsonSchema={type:Ce("string",re._jsonSchemaVersion),seconds:Ce("number"),nanoseconds:Ce("number")};/**
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
 */class K{static fromTimestamp(e){return new K(e)}static min(){return new K(new re(0,0))}static max(){return new K(new re(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const ci=-1;class Ta{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function Ml(r){return r.fields.find(e=>e.kind===2)}function Zn(r){return r.fields.filter(e=>e.kind!==2)}Ta.UNKNOWN_ID=-1;class ia{constructor(e,t){this.fieldPath=e,this.kind=t}}class qs{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new qs(0,ft.min())}}function ey(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=K.fromTimestamp(n===1e9?new re(t+1,0):new re(t,n));return new ft(i,L.empty(),e)}function ty(r){return new ft(r.readTime,r.key,ci)}class ft{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new ft(K.min(),L.empty(),ci)}static max(){return new ft(K.max(),L.empty(),ci)}}function Hu(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=L.comparator(r.documentKey,e.documentKey),t!==0?t:G(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ny="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class ry{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Un(r){if(r.code!==P.FAILED_PRECONDITION||r.message!==ny)throw r;N("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class A{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&q(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new A((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof A?t:A.resolve(t)}catch(t){return A.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):A.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):A.reject(t)}static resolve(e){return new A((t,n)=>{t(e)})}static reject(e){return new A((t,n)=>{n(e)})}static waitFor(e){return new A((t,n)=>{let i=0,s=0,o=!1;e.forEach(c=>{++i,c.next(()=>{++s,o&&s===i&&t()},l=>n(l))}),o=!0,s===i&&t()})}static or(e){let t=A.resolve(!1);for(const n of e)t=t.next(i=>i?A.resolve(i):n());return t}static forEach(e,t){const n=[];return e.forEach((i,s)=>{n.push(t.call(this,i,s))}),this.waitFor(n)}static mapArray(e,t){return new A((n,i)=>{const s=e.length,o=new Array(s);let c=0;for(let l=0;l<s;l++){const u=l;t(e[u]).next(d=>{o[u]=d,++c,c===s&&n(o)},d=>i(d))}})}static doWhile(e,t){return new A((n,i)=>{const s=()=>{e()===!0?t().next(()=>{s()},i):n()};s()})}}/**
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
 */const lt="SimpleDb";class nc{static open(e,t,n,i){try{return new nc(t,e.transaction(i,n))}catch(s){throw new As(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new Ue,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new As(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=Qu(n.target.error);this.S.reject(new As(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(N(lt,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new VS(t)}}class Ot{static delete(e){return N(lt,"Removing database:",e),tr(gu().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Vs())return!1;if(Ot.F())return!0;const e=ye(),t=Ot.M(e),n=0<t&&t<10,i=iy(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,Ot.M(ye())===12.2&&be("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(N(lt,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new As(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new x(P.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new x(P.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new As(e,o))},i.onupgradeneeded=s=>{N(lt,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next(()=>{N(lt,"Database upgrade to version "+this.version+" complete")})}})),this.q&&(this.db.onversionchange=t=>this.q(t)),this.db}$(e){this.q=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=nc.open(this.db,e,s?"readonly":"readwrite",n),l=i(c).next(u=>(c.C(),u)).catch(u=>(c.abort(u),A.reject(u))).toPromise();return l.catch(()=>{}),await c.D,l}catch(c){const l=c,u=l.name!=="FirebaseError"&&o<3;if(N(lt,"Transaction failed with error:",l.message,"Retrying:",u),this.close(),!u)return Promise.reject(l)}}}close(){this.db&&this.db.close(),this.db=void 0}}function iy(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class NS{constructor(e){this.U=e,this.K=!1,this.W=null}get isDone(){return this.K}get G(){return this.W}set cursor(e){this.U=e}done(){this.K=!0}j(e){this.W=e}delete(){return tr(this.U.delete())}}class As extends x{constructor(e,t){super(P.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Bn(r){return r.name==="IndexedDbTransactionError"}class VS{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(N(lt,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(N(lt,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),tr(n)}add(e){return N(lt,"ADD",this.store.name,e,e),tr(this.store.add(e))}get(e){return tr(this.store.get(e)).next(t=>(t===void 0&&(t=null),N(lt,"GET",this.store.name,e,t),t))}delete(e){return N(lt,"DELETE",this.store.name,e),tr(this.store.delete(e))}count(){return N(lt,"COUNT",this.store.name),tr(this.store.count())}J(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new A((o,c)=>{s.onerror=l=>{c(l.target.error)},s.onsuccess=l=>{o(l.target.result)}})}{const s=this.cursor(n),o=[];return this.H(s,(c,l)=>{o.push(l)}).next(()=>o)}}Y(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new A((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}})}Z(e,t){N(lt,"DELETE ALL",this.store.name);const n=this.options(e,t);n.X=!1;const i=this.cursor(n);return this.H(i,(s,o,c)=>c.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.H(i,t)}te(e){const t=this.cursor({});return new A((n,i)=>{t.onerror=s=>{const o=Qu(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():n()}):n()}})}H(e,t){const n=[];return new A((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const l=new NS(c),u=t(c.primaryKey,c.value,l);if(u instanceof A){const d=u.catch(p=>(l.done(),A.reject(p)));n.push(d)}l.isDone?i():l.G===null?c.continue():c.continue(l.G)}}).next(()=>A.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.X?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function tr(r){return new A((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=Qu(n.target.error);t(i)}})}let Zf=!1;function Qu(r){const e=Ot.M(ye());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new x("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Zf||(Zf=!0,setTimeout(()=>{throw n},0)),n}}return r}const Ss="IndexBackfiller";class OS{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){N(Ss,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();N(Ss,`Documents written: ${t}`)}catch(t){Bn(t)?N(Ss,"Ignoring IndexedDB error during index backfill: ",t):await Un(t)}await this.re(6e4)})}}class MS{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let i=t,s=!0;return A.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return N(Ss,`Processing collection: ${o}`),this.oe(e,o,i).next(c=>{i-=c,n.add(o)});s=!1})).next(()=>t-i)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(i,s)).next(c=>(N(Ss,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((i,s)=>{const o=ty(s);Hu(o,n)>0&&(n=o)}),new ft(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class st{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}st.ce=-1;/**
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
 */const Tn=-1;function go(r){return r==null}function $s(r){return r===0&&1/r==-1/0}function sy(r){return typeof r=="number"&&Number.isInteger(r)&&!$s(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
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
 */const ba="";function je(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=ep(e)),e=LS(r.get(t),e);return ep(e)}function LS(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case ba:t+="";break;default:t+=s}}return t}function ep(r){return r+ba+""}function Nt(r){const e=r.length;if($(e>=2,64408,{path:r}),e===2)return $(r.charAt(0)===ba&&r.charAt(1)==="",56145,{path:r}),X.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(ba,s);switch((o<0||o>t)&&q(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let l;i.length===0?l=c:(i+=c,l=i,i=""),n.push(l);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:q(61167,{path:r})}s=o+2}return new X(n)}/**
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
 */const er="remoteDocuments",yo="owner",Or="owner",Ks="mutationQueues",FS="userId",yt="mutations",tp="batchId",ar="userMutationsIndex",np=["userId","batchId"];/**
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
 */function sa(r,e){return[r,je(e)]}function oy(r,e,t){return[r,je(e),t]}const US={},li="documentMutations",Aa="remoteDocumentsV14",BS=["prefixPath","collectionGroup","readTime","documentId"],oa="documentKeyIndex",qS=["prefixPath","collectionGroup","documentId"],ay="collectionGroupIndex",$S=["collectionGroup","readTime","prefixPath","documentId"],zs="remoteDocumentGlobal",Ll="remoteDocumentGlobalKey",ui="targets",cy="queryTargetsIndex",KS=["canonicalId","targetId"],hi="targetDocuments",zS=["targetId","path"],Yu="documentTargetsIndex",jS=["path","targetId"],Sa="targetGlobalKey",dr="targetGlobal",js="collectionParents",GS=["collectionId","parent"],di="clientMetadata",WS="clientId",rc="bundles",HS="bundleId",ic="namedQueries",QS="name",Ju="indexConfiguration",YS="indexId",Fl="collectionGroupIndex",JS="collectionGroup",Rs="indexState",XS=["indexId","uid"],ly="sequenceNumberIndex",ZS=["uid","sequenceNumber"],Ps="indexEntries",eR=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],uy="documentKeyIndex",tR=["indexId","uid","orderedDocumentKey"],sc="documentOverlays",nR=["userId","collectionPath","documentId"],Ul="collectionPathOverlayIndex",rR=["userId","collectionPath","largestBatchId"],hy="collectionGroupOverlayIndex",iR=["userId","collectionGroup","largestBatchId"],Xu="globals",sR="name",dy=[Ks,yt,li,er,ui,yo,dr,hi,di,zs,js,rc,ic],oR=[...dy,sc],fy=[Ks,yt,li,Aa,ui,yo,dr,hi,di,zs,js,rc,ic,sc],py=fy,Zu=[...py,Ju,Rs,Ps],aR=Zu,my=[...Zu,Xu],cR=my;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bl extends ry{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function xe(r,e){const t=U(r);return Ot.O(t.le,e)}/**
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
 */function rp(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function qn(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function gy(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
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
 */class ce{constructor(e,t){this.comparator=e,this.root=t||Le.EMPTY}insert(e,t){return new ce(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,Le.BLACK,null,null))}remove(e){return new ce(this.comparator,this.root.remove(e,this.comparator).copy(null,null,Le.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Wo(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Wo(this.root,e,this.comparator,!1)}getReverseIterator(){return new Wo(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Wo(this.root,e,this.comparator,!0)}}class Wo{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class Le{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??Le.RED,this.left=i??Le.EMPTY,this.right=s??Le.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new Le(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return Le.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return Le.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,Le.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,Le.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw q(43730,{key:this.key,value:this.value});if(this.right.isRed())throw q(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw q(27949);return e+(this.isRed()?0:1)}}Le.EMPTY=null,Le.RED=!0,Le.BLACK=!1;Le.EMPTY=new class{constructor(){this.size=0}get key(){throw q(57766)}get value(){throw q(16141)}get color(){throw q(16727)}get left(){throw q(29726)}get right(){throw q(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new Le(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class se{constructor(e){this.comparator=e,this.data=new ce(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new ip(this.data.getIterator())}getIteratorFrom(e){return new ip(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof se)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new se(this.comparator);return t.data=e,t}}class ip{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Mr(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ot{constructor(e){this.fields=e,e.sort(me.comparator)}static empty(){return new ot([])}unionWith(e){let t=new se(me.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new ot(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return ai(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */class yy extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lR(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ee{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new yy("Invalid base64 string: "+s):s}}(e);return new Ee(t)}static fromUint8Array(e){const t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new Ee(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return G(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ee.EMPTY_BYTE_STRING=new Ee("");const uR=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Ht(r){if($(!!r,39018),typeof r=="string"){let e=0;const t=uR.exec(r);if($(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:de(r.seconds),nanos:de(r.nanos)}}function de(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function Qt(r){return typeof r=="string"?Ee.fromBase64String(r):Ee.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _y="server_timestamp",wy="__type__",Iy="__previous_value__",Ey="__local_write_time__";function oc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[wy])==null?void 0:n.stringValue)===_y}function ac(r){const e=r.mapValue.fields[Iy];return oc(e)?ac(e):e}function Gs(r){const e=Ht(r.mapValue.fields[Ey].timestampValue);return new re(e.seconds,e.nanos)}/**
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
 */class hR{constructor(e,t,n,i,s,o,c,l,u,d){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=u,this.isUsingEmulator=d}}const ql="(default)";class kn{constructor(e,t){this.projectId=e,this.database=t||ql}static empty(){return new kn("","")}get isDefaultDatabase(){return this.database===ql}isEqual(e){return e instanceof kn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eh="__type__",vy="__max__",_n={mapValue:{fields:{__type__:{stringValue:vy}}}},th="__vector__",fi="value",aa={nullValue:"NULL_VALUE"};function Dn(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?oc(r)?4:Ty(r)?9007199254740991:cc(r)?10:11:q(28295,{value:r})}function qt(r,e){if(r===e)return!0;const t=Dn(r);if(t!==Dn(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return Gs(r).isEqual(Gs(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Ht(i.timestampValue),c=Ht(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return Qt(i.bytesValue).isEqual(Qt(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return de(i.geoPointValue.latitude)===de(s.geoPointValue.latitude)&&de(i.geoPointValue.longitude)===de(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return de(i.integerValue)===de(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=de(i.doubleValue),c=de(s.doubleValue);return o===c?$s(o)===$s(c):isNaN(o)&&isNaN(c)}return!1}(r,e);case 9:return ai(r.arrayValue.values||[],e.arrayValue.values||[],qt);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(rp(o)!==rp(c))return!1;for(const l in o)if(o.hasOwnProperty(l)&&(c[l]===void 0||!qt(o[l],c[l])))return!1;return!0}(r,e);default:return q(52216,{left:r})}}function Ws(r,e){return(r.values||[]).find(t=>qt(t,e))!==void 0}function xn(r,e){if(r===e)return 0;const t=Dn(r),n=Dn(e);if(t!==n)return G(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return G(r.booleanValue,e.booleanValue);case 2:return function(s,o){const c=de(s.integerValue||s.doubleValue),l=de(o.integerValue||o.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1}(r,e);case 3:return sp(r.timestampValue,e.timestampValue);case 4:return sp(Gs(r),Gs(e));case 5:return Ol(r.stringValue,e.stringValue);case 6:return function(s,o){const c=Qt(s),l=Qt(o);return c.compareTo(l)}(r.bytesValue,e.bytesValue);case 7:return function(s,o){const c=s.split("/"),l=o.split("/");for(let u=0;u<c.length&&u<l.length;u++){const d=G(c[u],l[u]);if(d!==0)return d}return G(c.length,l.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,o){const c=G(de(s.latitude),de(o.latitude));return c!==0?c:G(de(s.longitude),de(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return op(r.arrayValue,e.arrayValue);case 10:return function(s,o){var g,E,k,D;const c=s.fields||{},l=o.fields||{},u=(g=c[fi])==null?void 0:g.arrayValue,d=(E=l[fi])==null?void 0:E.arrayValue,p=G(((k=u==null?void 0:u.values)==null?void 0:k.length)||0,((D=d==null?void 0:d.values)==null?void 0:D.length)||0);return p!==0?p:op(u,d)}(r.mapValue,e.mapValue);case 11:return function(s,o){if(s===_n.mapValue&&o===_n.mapValue)return 0;if(s===_n.mapValue)return 1;if(o===_n.mapValue)return-1;const c=s.fields||{},l=Object.keys(c),u=o.fields||{},d=Object.keys(u);l.sort(),d.sort();for(let p=0;p<l.length&&p<d.length;++p){const g=Ol(l[p],d[p]);if(g!==0)return g;const E=xn(c[l[p]],u[d[p]]);if(E!==0)return E}return G(l.length,d.length)}(r.mapValue,e.mapValue);default:throw q(23264,{he:t})}}function sp(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return G(r,e);const t=Ht(r),n=Ht(e),i=G(t.seconds,n.seconds);return i!==0?i:G(t.nanos,n.nanos)}function op(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=xn(t[i],n[i]);if(s)return s}return G(t.length,n.length)}function pi(r){return $l(r)}function $l(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=Ht(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return Qt(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return L.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=$l(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${$l(t.fields[o])}`;return i+"}"}(r.mapValue):q(61005,{value:r})}function ca(r){switch(Dn(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=ac(r);return e?16+ca(e):16;case 5:return 2*r.stringValue.length;case 6:return Qt(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((i,s)=>i+ca(s),0)}(r.arrayValue);case 10:case 11:return function(n){let i=0;return qn(n.fields,(s,o)=>{i+=s.length+ca(o)}),i}(r.mapValue);default:throw q(13486,{value:r})}}function gr(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function Kl(r){return!!r&&"integerValue"in r}function Hs(r){return!!r&&"arrayValue"in r}function ap(r){return!!r&&"nullValue"in r}function cp(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function la(r){return!!r&&"mapValue"in r}function cc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[eh])==null?void 0:n.stringValue)===th}function Cs(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return qn(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=Cs(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=Cs(r.arrayValue.values[t]);return e}return{...r}}function Ty(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===vy}const by={mapValue:{fields:{[eh]:{stringValue:th},[fi]:{arrayValue:{}}}}};function dR(r){return"nullValue"in r?aa:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?gr(kn.empty(),L.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?cc(r)?by:{mapValue:{}}:q(35942,{value:r})}function fR(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?gr(kn.empty(),L.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?by:"mapValue"in r?cc(r)?{mapValue:{}}:_n:q(61959,{value:r})}function lp(r,e){const t=xn(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function up(r,e){const t=xn(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
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
 */class Fe{constructor(e){this.value=e}static empty(){return new Fe({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!la(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Cs(t)}setAll(e){let t=me.emptyPath(),n={},i=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const l=this.getFieldsMap(t);this.applyChanges(l,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=Cs(o):i.push(c.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());la(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return qt(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];la(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){qn(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new Fe(Cs(this.value))}}function Ay(r){const e=[];return qn(r.fields,(t,n)=>{const i=new me([t]);if(la(n)){const s=Ay(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new ot(e)}/**
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
 */class ue{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new ue(e,0,K.min(),K.min(),K.min(),Fe.empty(),0)}static newFoundDocument(e,t,n,i){return new ue(e,1,t,K.min(),n,i,0)}static newNoDocument(e,t){return new ue(e,2,t,K.min(),K.min(),Fe.empty(),0)}static newUnknownDocument(e,t){return new ue(e,3,t,K.min(),K.min(),Fe.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(K.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Fe.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Fe.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=K.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ue&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ue(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Nn{constructor(e,t){this.position=e,this.inclusive=t}}function hp(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=L.comparator(L.fromName(o.referenceValue),t.key):n=xn(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function dp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!qt(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class Qs{constructor(e,t="asc"){this.field=e,this.dir=t}}function pR(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class Sy{}class ee extends Sy{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new mR(e,t,n):t==="array-contains"?new _R(e,n):t==="in"?new xy(e,n):t==="not-in"?new wR(e,n):t==="array-contains-any"?new IR(e,n):new ee(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new gR(e,n):new yR(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(xn(t,this.value)):t!==null&&Dn(this.value)===Dn(t)&&this.matchesComparison(xn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return q(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class ie extends Sy{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new ie(e,t)}matches(e){return mi(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function mi(r){return r.op==="and"}function zl(r){return r.op==="or"}function nh(r){return Ry(r)&&mi(r)}function Ry(r){for(const e of r.filters)if(e instanceof ie)return!1;return!0}function jl(r){if(r instanceof ee)return r.field.canonicalString()+r.op.toString()+pi(r.value);if(nh(r))return r.filters.map(e=>jl(e)).join(",");{const e=r.filters.map(t=>jl(t)).join(",");return`${r.op}(${e})`}}function Py(r,e){return r instanceof ee?function(n,i){return i instanceof ee&&n.op===i.op&&n.field.isEqual(i.field)&&qt(n.value,i.value)}(r,e):r instanceof ie?function(n,i){return i instanceof ie&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,o,c)=>s&&Py(o,i.filters[c]),!0):!1}(r,e):void q(19439)}function Cy(r,e){const t=r.filters.concat(e);return ie.create(t,r.op)}function ky(r){return r instanceof ee?function(t){return`${t.field.canonicalString()} ${t.op} ${pi(t.value)}`}(r):r instanceof ie?function(t){return t.op.toString()+" {"+t.getFilters().map(ky).join(" ,")+"}"}(r):"Filter"}class mR extends ee{constructor(e,t,n){super(e,t,n),this.key=L.fromName(n.referenceValue)}matches(e){const t=L.comparator(e.key,this.key);return this.matchesComparison(t)}}class gR extends ee{constructor(e,t){super(e,"in",t),this.keys=Dy("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class yR extends ee{constructor(e,t){super(e,"not-in",t),this.keys=Dy("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Dy(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>L.fromName(n.referenceValue))}class _R extends ee{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Hs(t)&&Ws(t.arrayValue,this.value)}}class xy extends ee{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Ws(this.value.arrayValue,t)}}class wR extends ee{constructor(e,t){super(e,"not-in",t)}matches(e){if(Ws(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Ws(this.value.arrayValue,t)}}class IR extends ee{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Hs(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Ws(this.value.arrayValue,n))}}/**
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
 */class ER{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function Gl(r,e=null,t=[],n=[],i=null,s=null,o=null){return new ER(r,e,t,n,i,s,o)}function yr(r){const e=U(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>jl(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),go(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>pi(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>pi(n)).join(",")),e.Te=t}return e.Te}function _o(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!pR(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Py(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!dp(r.startAt,e.startAt)&&dp(r.endAt,e.endAt)}function Ra(r){return L.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function Pa(r,e){return r.filters.filter(t=>t instanceof ee&&t.field.isEqual(e))}function fp(r,e,t){let n=aa,i=!0;for(const s of Pa(r,e)){let o=aa,c=!0;switch(s.op){case"<":case"<=":o=dR(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=aa}lp({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];lp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function pp(r,e,t){let n=_n,i=!0;for(const s of Pa(r,e)){let o=_n,c=!0;switch(s.op){case">=":case">":o=fR(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=_n}up({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];up({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
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
 */class Zt{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function Ny(r,e,t,n,i,s,o,c){return new Zt(r,e,t,n,i,s,o,c)}function Ni(r){return new Zt(r)}function mp(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function rh(r){return r.collectionGroup!==null}function ti(r){const e=U(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new se(me.comparator);return o.filters.forEach(l=>{l.getFlattenedFilters().forEach(u=>{u.isInequality()&&(c=c.add(u.field))})}),c})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new Qs(s,n))}),t.has(me.keyField().canonicalString())||e.Ie.push(new Qs(me.keyField(),n))}return e.Ie}function et(r){const e=U(r);return e.Ee||(e.Ee=vR(e,ti(r))),e.Ee}function vR(r,e){if(r.limitType==="F")return Gl(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new Qs(i.field,s)});const t=r.endAt?new Nn(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Nn(r.startAt.position,r.startAt.inclusive):null;return Gl(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function Wl(r,e){const t=r.filters.concat([e]);return new Zt(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function Ca(r,e,t){return new Zt(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function wo(r,e){return _o(et(r),et(e))&&r.limitType===e.limitType}function Vy(r){return`${yr(et(r))}|lt:${r.limitType}`}function zr(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>ky(i)).join(", ")}]`),go(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>pi(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>pi(i)).join(",")),`Target(${n})`}(et(r))}; limitType=${r.limitType})`}function Io(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):L.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of ti(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(o,c,l){const u=hp(o,c,l);return o.inclusive?u<=0:u<0}(n.startAt,ti(n),i)||n.endAt&&!function(o,c,l){const u=hp(o,c,l);return o.inclusive?u>=0:u>0}(n.endAt,ti(n),i))}(r,e)}function Oy(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function My(r){return(e,t)=>{let n=!1;for(const i of ti(r)){const s=TR(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function TR(r,e,t){const n=r.field.isKeyField()?L.comparator(e.key,t.key):function(s,o,c){const l=o.data.field(s),u=c.data.field(s);return l!==null&&u!==null?xn(l,u):q(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return q(19790,{direction:r.dir})}}/**
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
 */class en{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){qn(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return gy(this.inner)}size(){return this.innerSize}}/**
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
 */const bR=new ce(L.comparator);function at(){return bR}const Ly=new ce(L.comparator);function ms(...r){let e=Ly;for(const t of r)e=e.insert(t.key,t);return e}function Fy(r){let e=Ly;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function Vt(){return ks()}function Uy(){return ks()}function ks(){return new en(r=>r.toString(),(r,e)=>r.isEqual(e))}const AR=new ce(L.comparator),SR=new se(L.comparator);function H(...r){let e=SR;for(const t of r)e=e.add(t);return e}const RR=new se(G);function ih(){return RR}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sh(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:$s(e)?"-0":e}}function By(r){return{integerValue:""+r}}function qy(r,e){return sy(e)?By(e):sh(r,e)}/**
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
 */class lc{constructor(){this._=void 0}}function PR(r,e,t){return r instanceof gi?function(i,s){const o={fields:{[wy]:{stringValue:_y},[Ey]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&oc(s)&&(s=ac(s)),s&&(o.fields[Iy]=s),{mapValue:o}}(t,e):r instanceof _r?Ky(r,e):r instanceof wr?zy(r,e):function(i,s){const o=$y(i,s),c=gp(o)+gp(i.Ae);return Kl(o)&&Kl(i.Ae)?By(c):sh(i.serializer,c)}(r,e)}function CR(r,e,t){return r instanceof _r?Ky(r,e):r instanceof wr?zy(r,e):t}function $y(r,e){return r instanceof yi?function(n){return Kl(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class gi extends lc{}class _r extends lc{constructor(e){super(),this.elements=e}}function Ky(r,e){const t=jy(e);for(const n of r.elements)t.some(i=>qt(i,n))||t.push(n);return{arrayValue:{values:t}}}class wr extends lc{constructor(e){super(),this.elements=e}}function zy(r,e){let t=jy(e);for(const n of r.elements)t=t.filter(i=>!qt(i,n));return{arrayValue:{values:t}}}class yi extends lc{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function gp(r){return de(r.integerValue||r.doubleValue)}function jy(r){return Hs(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
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
 */class Eo{constructor(e,t){this.field=e,this.transform=t}}function kR(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof _r&&i instanceof _r||n instanceof wr&&i instanceof wr?ai(n.elements,i.elements,qt):n instanceof yi&&i instanceof yi?qt(n.Ae,i.Ae):n instanceof gi&&i instanceof gi}(r.transform,e.transform)}class DR{constructor(e,t){this.version=e,this.transformResults=t}}class ge{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new ge}static exists(e){return new ge(void 0,e)}static updateTime(e){return new ge(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function ua(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class uc{}function Gy(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new Oi(r.key,ge.none()):new Vi(r.key,r.data,ge.none());{const t=r.data,n=Fe.empty();let i=new se(me.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new tn(r.key,n,new ot(i.toArray()),ge.none())}}function xR(r,e,t){r instanceof Vi?function(i,s,o){const c=i.value.clone(),l=_p(i.fieldTransforms,s,o.transformResults);c.setAll(l),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):r instanceof tn?function(i,s,o){if(!ua(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=_p(i.fieldTransforms,s,o.transformResults),l=s.data;l.setAll(Wy(i)),l.setAll(c),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(r,e,t):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function Ds(r,e,t,n){return r instanceof Vi?function(s,o,c,l){if(!ua(s.precondition,o))return c;const u=s.value.clone(),d=wp(s.fieldTransforms,l,o);return u.setAll(d),o.convertToFoundDocument(o.version,u).setHasLocalMutations(),null}(r,e,t,n):r instanceof tn?function(s,o,c,l){if(!ua(s.precondition,o))return c;const u=wp(s.fieldTransforms,l,o),d=o.data;return d.setAll(Wy(s)),d.setAll(u),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(r,e,t,n):function(s,o,c){return ua(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(r,e,t)}function NR(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=$y(n.transform,i||null);s!=null&&(t===null&&(t=Fe.empty()),t.set(n.field,s))}return t||null}function yp(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&ai(n,i,(s,o)=>kR(s,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class Vi extends uc{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class tn extends uc{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function Wy(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function _p(r,e,t){const n=new Map;$(r.length===t.length,32656,{Re:t.length,Ve:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,CR(o,c,t[i]))}return n}function wp(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,PR(s,o,e))}return n}class Oi extends uc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class oh extends uc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class ah{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&xR(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=Ds(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=Ds(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=Uy();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const l=Gy(o,c);l!==null&&n.set(i.key,l),o.isValidDocument()||o.convertToNoDocument(K.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),H())}isEqual(e){return this.batchId===e.batchId&&ai(this.mutations,e.mutations,(t,n)=>yp(t,n))&&ai(this.baseMutations,e.baseMutations,(t,n)=>yp(t,n))}}class ch{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){$(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let i=function(){return AR}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new ch(e,t,n,i)}}/**
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
 */class lh{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class VR{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var Re,te;function Hy(r){switch(r){case P.OK:return q(64938);case P.CANCELLED:case P.UNKNOWN:case P.DEADLINE_EXCEEDED:case P.RESOURCE_EXHAUSTED:case P.INTERNAL:case P.UNAVAILABLE:case P.UNAUTHENTICATED:return!1;case P.INVALID_ARGUMENT:case P.NOT_FOUND:case P.ALREADY_EXISTS:case P.PERMISSION_DENIED:case P.FAILED_PRECONDITION:case P.ABORTED:case P.OUT_OF_RANGE:case P.UNIMPLEMENTED:case P.DATA_LOSS:return!0;default:return q(15467,{code:r})}}function Qy(r){if(r===void 0)return be("GRPC error has no .code"),P.UNKNOWN;switch(r){case Re.OK:return P.OK;case Re.CANCELLED:return P.CANCELLED;case Re.UNKNOWN:return P.UNKNOWN;case Re.DEADLINE_EXCEEDED:return P.DEADLINE_EXCEEDED;case Re.RESOURCE_EXHAUSTED:return P.RESOURCE_EXHAUSTED;case Re.INTERNAL:return P.INTERNAL;case Re.UNAVAILABLE:return P.UNAVAILABLE;case Re.UNAUTHENTICATED:return P.UNAUTHENTICATED;case Re.INVALID_ARGUMENT:return P.INVALID_ARGUMENT;case Re.NOT_FOUND:return P.NOT_FOUND;case Re.ALREADY_EXISTS:return P.ALREADY_EXISTS;case Re.PERMISSION_DENIED:return P.PERMISSION_DENIED;case Re.FAILED_PRECONDITION:return P.FAILED_PRECONDITION;case Re.ABORTED:return P.ABORTED;case Re.OUT_OF_RANGE:return P.OUT_OF_RANGE;case Re.UNIMPLEMENTED:return P.UNIMPLEMENTED;case Re.DATA_LOSS:return P.DATA_LOSS;default:return q(39323,{code:r})}}(te=Re||(Re={}))[te.OK=0]="OK",te[te.CANCELLED=1]="CANCELLED",te[te.UNKNOWN=2]="UNKNOWN",te[te.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",te[te.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",te[te.NOT_FOUND=5]="NOT_FOUND",te[te.ALREADY_EXISTS=6]="ALREADY_EXISTS",te[te.PERMISSION_DENIED=7]="PERMISSION_DENIED",te[te.UNAUTHENTICATED=16]="UNAUTHENTICATED",te[te.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",te[te.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",te[te.ABORTED=10]="ABORTED",te[te.OUT_OF_RANGE=11]="OUT_OF_RANGE",te[te.UNIMPLEMENTED=12]="UNIMPLEMENTED",te[te.INTERNAL=13]="INTERNAL",te[te.UNAVAILABLE=14]="UNAVAILABLE",te[te.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function Yy(){return new TextEncoder}/**
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
 */const OR=new vn([4294967295,4294967295],0);function Ip(r){const e=Yy().encode(r),t=new $g;return t.update(e),new Uint8Array(t.digest())}function Ep(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new vn([t,n],0),new vn([i,s],0)]}class uh{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new gs(`Invalid padding: ${t}`);if(n<0)throw new gs(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new gs(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new gs(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=vn.fromNumber(this.ge)}ye(e,t,n){let i=e.add(t.multiply(vn.fromNumber(n)));return i.compare(OR)===1&&(i=new vn([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=Ip(e),[n,i]=Ep(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);if(!this.we(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new uh(s,i,t);return n.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=Ip(e),[n,i]=Ep(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);this.Se(o)}}Se(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class gs extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class vo{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,To.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new vo(K.min(),i,new ce(G),at(),H())}}class To{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new To(n,t,H(),H(),H())}}/**
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
 */class ha{constructor(e,t,n,i){this.be=e,this.removedTargetIds=t,this.key=n,this.De=i}}class Jy{constructor(e,t){this.targetId=e,this.Ce=t}}class Xy{constructor(e,t,n=Ee.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class vp{constructor(){this.ve=0,this.Fe=Tp(),this.Me=Ee.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=H(),t=H(),n=H();return this.Fe.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:q(38017,{changeType:s})}}),new To(this.Me,this.xe,e,t,n)}qe(){this.Oe=!1,this.Fe=Tp()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,$(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class MR{constructor(e){this.Ge=e,this.ze=new Map,this.je=at(),this.Je=Ho(),this.He=Ho(),this.Ye=new ce(G)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(e.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.We(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:q(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,i)=>{this.rt(i)&&t(i)})}st(e){const t=e.targetId,n=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(Ra(s))if(n===0){const o=new L(s.path);this.et(t,o,ue.newNoDocument(o,K.min()))}else $(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const c=this.ut(e),l=c?this.ct(c,e,o):1;if(l!==0){this.it(t);const u=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,u)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=Qt(n).toUint8Array()}catch(l){if(l instanceof yy)return Bt("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l}try{c=new uh(o,i,s)}catch(l){return Bt(l instanceof gs?"BloomFilter error: ":"Applying bloom filter failed: ",l),null}return c.ge===0?null:c}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)}),i}Tt(e){const t=new Map;this.ze.forEach((s,o)=>{const c=this.ot(o);if(c){if(s.current&&Ra(c.target)){const l=new L(c.target.path);this.It(l).has(o)||this.Et(o,l)||this.et(o,l,ue.newNoDocument(l,e))}s.Be&&(t.set(o,s.ke()),s.qe())}});let n=H();this.He.forEach((s,o)=>{let c=!0;o.forEachWhile(l=>{const u=this.ot(l);return!u||u.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(n=n.add(s))}),this.je.forEach((s,o)=>o.setReadTime(e));const i=new vo(e,t,this.Ye,this.je,n);return this.je=at(),this.Je=Ho(),this.He=Ho(),this.Ye=new ce(G),i}Xe(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,n),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.Qe(t,1):i.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new vp,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new se(G),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new se(G),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||N("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new vp),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function Ho(){return new ce(L.comparator)}function Tp(){return new ce(L.comparator)}const LR={asc:"ASCENDING",desc:"DESCENDING"},FR={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},UR={and:"AND",or:"OR"};class BR{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function Hl(r,e){return r.useProto3Json||go(e)?e:{value:e}}function _i(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Zy(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function qR(r,e){return _i(r,e.toTimestamp())}function Ae(r){return $(!!r,49232),K.fromTimestamp(function(t){const n=Ht(t);return new re(n.seconds,n.nanos)}(r))}function hh(r,e){return Ql(r,e).canonicalString()}function Ql(r,e){const t=function(i){return new X(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function e_(r){const e=X.fromString(r);return $(u_(e),10190,{key:e.toString()}),e}function Ys(r,e){return hh(r.databaseId,e.path)}function Mt(r,e){const t=e_(e);if(t.get(1)!==r.databaseId.projectId)throw new x(P.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new x(P.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new L(r_(t))}function t_(r,e){return hh(r.databaseId,e)}function n_(r){const e=e_(r);return e.length===4?X.emptyPath():r_(e)}function Yl(r){return new X(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function r_(r){return $(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function bp(r,e,t){return{name:Ys(r,e),fields:t.value.mapValue.fields}}function i_(r,e,t){const n=Mt(r,e.name),i=Ae(e.updateTime),s=e.createTime?Ae(e.createTime):K.min(),o=new Fe({mapValue:{fields:e.fields}}),c=ue.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function $R(r,e){return"found"in e?function(n,i){$(!!i.found,43571),i.found.name,i.found.updateTime;const s=Mt(n,i.found.name),o=Ae(i.found.updateTime),c=i.found.createTime?Ae(i.found.createTime):K.min(),l=new Fe({mapValue:{fields:i.found.fields}});return ue.newFoundDocument(s,o,c,l)}(r,e):"missing"in e?function(n,i){$(!!i.missing,3894),$(!!i.readTime,22933);const s=Mt(n,i.missing),o=Ae(i.readTime);return ue.newNoDocument(s,o)}(r,e):q(7234,{result:e})}function KR(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(u){return u==="NO_CHANGE"?0:u==="ADD"?1:u==="REMOVE"?2:u==="CURRENT"?3:u==="RESET"?4:q(39313,{state:u})}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(u,d){return u.useProto3Json?($(d===void 0||typeof d=="string",58123),Ee.fromBase64String(d||"")):($(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),Ee.fromUint8Array(d||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(u){const d=u.code===void 0?P.UNKNOWN:Qy(u.code);return new x(d,u.message||"")}(o);t=new Xy(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=Mt(r,n.document.name),s=Ae(n.document.updateTime),o=n.document.createTime?Ae(n.document.createTime):K.min(),c=new Fe({mapValue:{fields:n.document.fields}}),l=ue.newFoundDocument(i,s,o,c),u=n.targetIds||[],d=n.removedTargetIds||[];t=new ha(u,d,l.key,l)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=Mt(r,n.document),s=n.readTime?Ae(n.readTime):K.min(),o=ue.newNoDocument(i,s),c=n.removedTargetIds||[];t=new ha([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=Mt(r,n.document),s=n.removedTargetIds||[];t=new ha([],s,i,null)}else{if(!("filter"in e))return q(11601,{Rt:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new VR(i,s),c=n.targetId;t=new Jy(c,o)}}return t}function Js(r,e){let t;if(e instanceof Vi)t={update:bp(r,e.key,e.value)};else if(e instanceof Oi)t={delete:Ys(r,e.key)};else if(e instanceof tn)t={update:bp(r,e.key,e.data),updateMask:QR(e.fieldMask)};else{if(!(e instanceof oh))return q(16599,{Vt:e.type});t={verify:Ys(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,o){const c=o.transform;if(c instanceof gi)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof _r)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof wr)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof yi)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw q(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:qR(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:q(27497)}(r,e.precondition)),t}function Jl(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?ge.updateTime(Ae(s.updateTime)):s.exists!==void 0?ge.exists(s.exists):ge.none()}(e.currentDocument):ge.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(o,c){let l=null;if("setToServerValue"in c)$(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),l=new gi;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];l=new _r(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];l=new wr(d)}else"increment"in c?l=new yi(o,c.increment):q(16584,{proto:c});const u=me.fromServerFormat(c.fieldPath);return new Eo(u,l)}(r,i)):[];if(e.update){e.update.name;const i=Mt(r,e.update.name),s=new Fe({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(l){const u=l.fieldPaths||[];return new ot(u.map(d=>me.fromServerFormat(d)))}(e.updateMask);return new tn(i,s,o,t,n)}return new Vi(i,s,t,n)}if(e.delete){const i=Mt(r,e.delete);return new Oi(i,t)}if(e.verify){const i=Mt(r,e.verify);return new oh(i,t)}return q(1463,{proto:e})}function zR(r,e){return r&&r.length>0?($(e!==void 0,14353),r.map(t=>function(i,s){let o=i.updateTime?Ae(i.updateTime):Ae(s);return o.isEqual(K.min())&&(o=Ae(s)),new DR(o,i.transformResults||[])}(t,e))):[]}function s_(r,e){return{documents:[t_(r,e.path)]}}function o_(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=t_(r,i);const s=function(u){if(u.length!==0)return l_(ie.create(u,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const o=function(u){if(u.length!==0)return u.map(d=>function(g){return{field:jr(g.field),direction:GR(g.dir)}}(d))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=Hl(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(u){return{before:u.inclusive,values:u.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(u){return{before:!u.inclusive,values:u.position}}(e.endAt)),{ft:t,parent:i}}function a_(r){let e=n_(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){$(n===1,65062);const d=t.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];t.where&&(s=function(p){const g=c_(p);return g instanceof ie&&nh(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(g=>function(k){return new Qs(Gr(k.field),function(T){switch(T){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(k.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,go(g)?null:g}(t.limit));let l=null;t.startAt&&(l=function(p){const g=!!p.before,E=p.values||[];return new Nn(E,g)}(t.startAt));let u=null;return t.endAt&&(u=function(p){const g=!p.before,E=p.values||[];return new Nn(E,g)}(t.endAt)),Ny(e,i,o,s,c,"F",l,u)}function jR(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return q(28987,{purpose:i})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function c_(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Gr(t.unaryFilter.field);return ee.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Gr(t.unaryFilter.field);return ee.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Gr(t.unaryFilter.field);return ee.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Gr(t.unaryFilter.field);return ee.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return q(61313);default:return q(60726)}}(r):r.fieldFilter!==void 0?function(t){return ee.create(Gr(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return q(58110);default:return q(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return ie.create(t.compositeFilter.filters.map(n=>c_(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return q(1026)}}(t.compositeFilter.op))}(r):q(30097,{filter:r})}function GR(r){return LR[r]}function WR(r){return FR[r]}function HR(r){return UR[r]}function jr(r){return{fieldPath:r.canonicalString()}}function Gr(r){return me.fromServerFormat(r.fieldPath)}function l_(r){return r instanceof ee?function(t){if(t.op==="=="){if(cp(t.value))return{unaryFilter:{field:jr(t.field),op:"IS_NAN"}};if(ap(t.value))return{unaryFilter:{field:jr(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(cp(t.value))return{unaryFilter:{field:jr(t.field),op:"IS_NOT_NAN"}};if(ap(t.value))return{unaryFilter:{field:jr(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:jr(t.field),op:WR(t.op),value:t.value}}}(r):r instanceof ie?function(t){const n=t.getFilters().map(i=>l_(i));return n.length===1?n[0]:{compositeFilter:{op:HR(t.op),filters:n}}}(r):q(54877,{filter:r})}function QR(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function u_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
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
 */class Kt{constructor(e,t,n,i,s=K.min(),o=K.min(),c=Ee.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=l}withSequenceNumber(e){return new Kt(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Kt(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class h_{constructor(e){this.yt=e}}function YR(r,e){let t;if(e.document)t=i_(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=L.fromSegments(e.noDocument.path),i=Er(e.noDocument.readTime);t=ue.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return q(56709);{const n=L.fromSegments(e.unknownDocument.path),i=Er(e.unknownDocument.version);t=ue.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new re(i[0],i[1]);return K.fromTimestamp(s)}(e.readTime)),t}function Ap(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:ka(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,o){return{name:Ys(s,o.key),fields:o.data.value.mapValue.fields,updateTime:_i(s,o.version.toTimestamp()),createTime:_i(s,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:Ir(e.version)};else{if(!e.isUnknownDocument())return q(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:Ir(e.version)}}return n}function ka(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function Ir(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function Er(r){const e=new re(r.seconds,r.nanoseconds);return K.fromTimestamp(e)}function nr(r,e){const t=(e.baseMutations||[]).map(s=>Jl(r.yt,s));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>Jl(r.yt,s)),i=re.fromMillis(e.localWriteTimeMs);return new ah(e.batchId,i,t,n)}function ys(r){const e=Er(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?Er(r.lastLimboFreeSnapshotVersion):K.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){const o=s.documents.length;return $(o===1,1966,{count:o}),et(Ni(n_(s.documents[0])))}(r.query):function(s){return et(a_(s))}(r.query),new Kt(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,Ee.fromBase64String(r.resumeToken))}function d_(r,e){const t=Ir(e.snapshotVersion),n=Ir(e.lastLimboFreeSnapshotVersion);let i;i=Ra(e.target)?s_(r.yt,e.target):o_(r.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:yr(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function dh(r){const e=a_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?Ca(e,e.limit,"L"):e}function ml(r,e){return new lh(e.largestBatchId,Jl(r.yt,e.overlayMutation))}function Sp(r,e){const t=e.path.lastSegment();return[r,je(e.path.popLast()),t]}function Rp(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:Ir(n.readTime),documentKey:je(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class JR{getBundleMetadata(e,t){return Pp(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:Er(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return Pp(e).put(function(i){return{bundleId:i.id,createTime:Ir(Ae(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return Cp(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:dh(s.bundledQuery),readTime:Er(s.readTime)}}(n)})}saveNamedQuery(e,t){return Cp(e).put(function(i){return{name:i.name,readTime:Ir(Ae(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function Pp(r){return xe(r,rc)}function Cp(r){return xe(r,ic)}/**
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
 */class hc{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new hc(e,n)}getOverlay(e,t){return os(e).get(Sp(this.userId,t)).next(n=>n?ml(this.serializer,n):null)}getOverlays(e,t){const n=Vt();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,o)=>{const c=new lh(t,o);i.push(this.St(e,c))}),A.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(o=>i.add(je(o.getCollectionPath())));const s=[];return i.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(os(e).Z(Ul,c))}),A.waitFor(s)}getOverlaysForCollection(e,t,n){const i=Vt(),s=je(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return os(e).J(Ul,o).next(c=>{for(const l of c){const u=ml(this.serializer,l);i.set(u.getKey(),u)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=Vt();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return os(e).ee({index:hy,range:c},(l,u,d)=>{const p=ml(this.serializer,u);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):d.done()}).next(()=>s)}St(e,t){return os(e).put(function(i,s,o){const[c,l,u]=Sp(s,o.mutation.key);return{userId:s,collectionPath:l,documentId:u,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Js(i.yt,o.mutation)}}(this.serializer,this.userId,t))}}function os(r){return xe(r,sc)}/**
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
 */class XR{bt(e){return xe(e,Xu)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?Ee.fromUint8Array(n):Ee.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class rr{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(de(e.integerValue));else if("doubleValue"in e){const n=de(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),$s(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=Ht(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(Qt(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?Ty(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):cc(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):q(19022,{$t:e})}Ot(e,t){this.Ft(t,25),this.Ut(e,t)}Ut(e,t){t.xt(e)}qt(e,t){const n=e.fields||{};this.Ft(t,55);for(const i of Object.keys(n))this.Ot(i,t),this.Ct(n[i],t)}kt(e,t){var o,c;const n=e.fields||{};this.Ft(t,53);const i=fi,s=((c=(o=n[i].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(de(s)),this.Ot(i,t),this.Ct(n[i],t)}Qt(e,t){const n=e.values||[];this.Ft(t,50);for(const i of n)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),L.fromName(e).path.forEach(n=>{this.Ft(t,60),this.Ut(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}rr.Kt=new rr;/**
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
 */const Lr=255;function ZR(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function kp(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const o=ZR(255&n[s]);if(i+=o,o!==8)break}return i}(r);return Math.ceil(e/8)}class eP{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Wt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Jt(n.value),n=t.next();this.Ht()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Jt(n);else if(n<2048)this.Jt(960|n>>>6),this.Jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|n>>>12),this.Jt(128|63&n>>>6),this.Jt(128|63&n);else{const i=t.codePointAt(0);this.Jt(240|i>>>18),this.Jt(128|63&i>>>12),this.Jt(128|63&i>>>6),this.Jt(128|63&i)}}this.Ht()}Xt(e){const t=this.en(e),n=kp(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),n=kp(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(Lr),this.sn(255)}_n(){this.an(Lr),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===Lr?(this.sn(Lr),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===Lr?(this.an(Lr),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class tP{constructor(e){this.cn=e}Bt(e){this.cn.Wt(e)}xt(e){this.cn.Yt(e)}Mt(e){this.cn.Xt(e)}vt(){this.cn.rn()}}class nP{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class as{constructor(){this.cn=new eP,this.ln=new tP(this.cn),this.hn=new nP(this.cn)}seed(e){this.cn.seed(e)}Pn(e){return e===0?this.ln:this.hn}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class ir{constructor(e,t,n,i){this.Tn=e,this.In=t,this.En=n,this.dn=i}An(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new ir(this.Tn,this.In,this.En,n)}Rn(e,t,n){return{indexId:this.Tn,uid:e,arrayValue:da(this.En),directionalValue:da(this.dn),orderedDocumentKey:da(t),documentKey:n.path.toArray()}}Vn(e,t,n){const i=this.Rn(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function dn(r,e){let t=r.Tn-e.Tn;return t!==0?t:(t=Dp(r.En,e.En),t!==0?t:(t=Dp(r.dn,e.dn),t!==0?t:L.comparator(r.In,e.In)))}function Dp(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function da(r){return Cm()?function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n}(r):r}function xp(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(r)}class Np{constructor(e){this.mn=new se((t,n)=>me.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.fn=e.orderBy,this.gn=[];for(const t of e.filters){const n=t;n.isInequality()?this.mn=this.mn.add(n):this.gn.push(n)}}get pn(){return this.mn.size>1}yn(e){if($(e.collectionGroup===this.collectionId,49279),this.pn)return!1;const t=Ml(e);if(t!==void 0&&!this.wn(t))return!1;const n=Zn(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.wn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.mn.size>0){const c=this.mn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const l=n[s];if(!this.Sn(c,l)||!this.bn(this.fn[o++],l))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.fn.length||!this.bn(this.fn[o++],c))return!1}return!0}Dn(){if(this.pn)return null;let e=new se(me.comparator);const t=[];for(const n of this.gn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new ia(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new ia(n.field,0))}for(const n of this.fn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new ia(n.field,n.dir==="asc"?0:1)));return new Ta(Ta.UNKNOWN_ID,this.collectionId,t,qs.empty())}wn(e){for(const t of this.gn)if(this.Sn(t,e))return!0;return!1}Sn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}bn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function f_(r){var t,n;if($(r instanceof ee||r instanceof ie,20012),r instanceof ee){if(r instanceof xy){const i=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(s=>ee.create(r.field,"==",s)))||[];return ie.create(i,"or")}return r}const e=r.filters.map(i=>f_(i));return ie.create(e,r.op)}function rP(r){if(r.getFilters().length===0)return[];const e=eu(f_(r));return $(p_(e),7391),Xl(e)||Zl(e)?[e]:e.getFilters()}function Xl(r){return r instanceof ee}function Zl(r){return r instanceof ie&&nh(r)}function p_(r){return Xl(r)||Zl(r)||function(t){if(t instanceof ie&&zl(t)){for(const n of t.getFilters())if(!Xl(n)&&!Zl(n))return!1;return!0}return!1}(r)}function eu(r){if($(r instanceof ee||r instanceof ie,34018),r instanceof ee)return r;if(r.filters.length===1)return eu(r.filters[0]);const e=r.filters.map(n=>eu(n));let t=ie.create(e,r.op);return t=Da(t),p_(t)?t:($(t instanceof ie,64498),$(mi(t),40251),$(t.filters.length>1,57927),t.filters.reduce((n,i)=>fh(n,i)))}function fh(r,e){let t;return $(r instanceof ee||r instanceof ie,38388),$(e instanceof ee||e instanceof ie,25473),t=r instanceof ee?e instanceof ee?function(i,s){return ie.create([i,s],"and")}(r,e):Vp(r,e):e instanceof ee?Vp(e,r):function(i,s){if($(i.filters.length>0&&s.filters.length>0,48005),mi(i)&&mi(s))return Cy(i,s.getFilters());const o=zl(i)?i:s,c=zl(i)?s:i,l=o.filters.map(u=>fh(u,c));return ie.create(l,"or")}(r,e),Da(t)}function Vp(r,e){if(mi(e))return Cy(e,r.getFilters());{const t=e.filters.map(n=>fh(r,n));return ie.create(t,"or")}}function Da(r){if($(r instanceof ee||r instanceof ie,11850),r instanceof ee)return r;const e=r.getFilters();if(e.length===1)return Da(e[0]);if(Ry(r))return r;const t=e.map(i=>Da(i)),n=[];return t.forEach(i=>{i instanceof ee?n.push(i):i instanceof ie&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:ie.create(n,r.op)}/**
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
 */class iP{constructor(){this.Cn=new ph}addToCollectionParentIndex(e,t){return this.Cn.add(t),A.resolve()}getCollectionParents(e,t){return A.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return A.resolve()}deleteFieldIndex(e,t){return A.resolve()}deleteAllFieldIndexes(e){return A.resolve()}createTargetIndexes(e,t){return A.resolve()}getDocumentsMatchingTarget(e,t){return A.resolve(null)}getIndexType(e,t){return A.resolve(0)}getFieldIndexes(e,t){return A.resolve([])}getNextCollectionGroupToUpdate(e){return A.resolve(null)}getMinOffset(e,t){return A.resolve(ft.min())}getMinOffsetFromCollectionGroup(e,t){return A.resolve(ft.min())}updateCollectionGroup(e,t,n){return A.resolve()}updateIndexEntries(e,t){return A.resolve()}}class ph{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new se(X.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new se(X.comparator)).toArray()}}/**
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
 */const Op="IndexedDbIndexManager",Qo=new Uint8Array(0);class sP{constructor(e,t){this.databaseId=t,this.vn=new ph,this.Fn=new en(n=>yr(n),(n,i)=>_o(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.vn.add(t)});const s={collectionId:n,parent:je(i)};return Mp(e).put(s)}return A.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[Yg(t),""],!1,!0);return Mp(e).J(i).next(s=>{for(const o of s){if(o.collectionId!==t)break;n.push(Nt(o.parent))}return n})}addFieldIndex(e,t){const n=cs(e),i=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(l=>[l.fieldPath.canonicalString(),l.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=Ur(e);return s.next(c=>{o.put(Rp(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=cs(e),i=Ur(e),s=Fr(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=cs(e),n=Fr(e),i=Ur(e);return t.Z().next(()=>n.Z()).next(()=>i.Z())}createTargetIndexes(e,t){return A.forEach(this.Mn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new Np(n).Dn();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=Fr(e);let i=!0;const s=new Map;return A.forEach(this.Mn(t),o=>this.xn(e,o).next(c=>{i&&(i=!!c),s.set(o,c)})).next(()=>{if(i){let o=H();const c=[];return A.forEach(s,(l,u)=>{N(Op,`Using index ${function(B){return`id=${B.indexId}|cg=${B.collectionGroup}|f=${B.fields.map(j=>`${j.fieldPath}:${j.kind}`).join(",")}`}(l)} to execute ${yr(t)}`);const d=function(B,j){const Q=Ml(j);if(Q===void 0)return null;for(const W of Pa(B,Q.fieldPath))switch(W.op){case"array-contains-any":return W.value.arrayValue.values||[];case"array-contains":return[W.value]}return null}(u,l),p=function(B,j){const Q=new Map;for(const W of Zn(j))for(const I of Pa(B,W.fieldPath))switch(I.op){case"==":case"in":Q.set(W.fieldPath.canonicalString(),I.value);break;case"not-in":case"!=":return Q.set(W.fieldPath.canonicalString(),I.value),Array.from(Q.values())}return null}(u,l),g=function(B,j){const Q=[];let W=!0;for(const I of Zn(j)){const y=I.kind===0?fp(B,I.fieldPath,B.startAt):pp(B,I.fieldPath,B.startAt);Q.push(y.value),W&&(W=y.inclusive)}return new Nn(Q,W)}(u,l),E=function(B,j){const Q=[];let W=!0;for(const I of Zn(j)){const y=I.kind===0?pp(B,I.fieldPath,B.endAt):fp(B,I.fieldPath,B.endAt);Q.push(y.value),W&&(W=y.inclusive)}return new Nn(Q,W)}(u,l),k=this.On(l,u,g),D=this.On(l,u,E),T=this.Nn(l,u,p),V=this.Bn(l.indexId,d,k,g.inclusive,D,E.inclusive,T);return A.forEach(V,M=>n.Y(M,t.limit).next(B=>{B.forEach(j=>{const Q=L.fromSegments(j.documentKey);o.has(Q)||(o=o.add(Q),c.push(Q))})}))}).next(()=>c)}return A.resolve(null)})}Mn(e){let t=this.Fn.get(e);return t||(e.filters.length===0?t=[e]:t=rP(ie.create(e.filters,"and")).map(n=>Gl(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Fn.set(e,t),t)}Bn(e,t,n,i,s,o,c){const l=(t!=null?t.length:1)*Math.max(n.length,s.length),u=l/(t!=null?t.length:1),d=[];for(let p=0;p<l;++p){const g=t?this.Ln(t[p/u]):Qo,E=this.kn(e,g,n[p%u],i),k=this.qn(e,g,s[p%u],o),D=c.map(T=>this.kn(e,g,T,!0));d.push(...this.createRange(E,k,D))}return d}kn(e,t,n,i){const s=new ir(e,L.empty(),t,n);return i?s:s.An()}qn(e,t,n,i){const s=new ir(e,L.empty(),t,n);return i?s.An():s}xn(e,t){const n=new Np(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let o=null;for(const c of s)n.yn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let n=2;const i=this.Mn(t);return A.forEach(i,s=>this.xn(e,s).next(o=>{o?n!==0&&o.fields.length<function(l){let u=new se(me.comparator),d=!1;for(const p of l.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?d=!0:u=u.add(g.field));for(const p of l.orderBy)p.field.isKeyField()||(u=u.add(p.field));return u.size+(d?1:0)}(s)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&i.length>1&&n===2?1:n)}Qn(e,t){const n=new as;for(const i of Zn(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.Pn(i.kind);rr.Kt.Dt(s,o)}return n.un()}Ln(e){const t=new as;return rr.Kt.Dt(e,t.Pn(0)),t.un()}$n(e,t){const n=new as;return rr.Kt.Dt(gr(this.databaseId,t),n.Pn(function(s){const o=Zn(s);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}Nn(e,t,n){if(n===null)return[];let i=[];i.push(new as);let s=0;for(const o of Zn(e)){const c=n[s++];for(const l of i)if(this.Un(t,o.fieldPath)&&Hs(c))i=this.Kn(i,o,c);else{const u=l.Pn(o.kind);rr.Kt.Dt(c,u)}}return this.Wn(i)}On(e,t,n){return this.Nn(e,t,n.position)}Wn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Kn(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const l=new as;l.seed(c.un()),rr.Kt.Dt(o,l.Pn(t.kind)),s.push(l)}return s}Un(e,t){return!!e.filters.find(n=>n instanceof ee&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=cs(e),i=Ur(e);return(t?n.J(Fl,IDBKeyRange.bound(t,t)):n.J()).next(s=>{const o=[];return A.forEach(s,c=>i.get([c.indexId,this.uid]).next(l=>{o.push(function(d,p){const g=p?new qs(p.sequenceNumber,new ft(Er(p.readTime),new L(Nt(p.documentKey)),p.largestBatchId)):qs.empty(),E=d.fields.map(([k,D])=>new ia(me.fromServerFormat(k),D));return new Ta(d.indexId,d.collectionGroup,E,g)}(c,l))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:G(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=cs(e),s=Ur(e);return this.Gn(e).next(o=>i.J(Fl,IDBKeyRange.bound(t,t)).next(c=>A.forEach(c,l=>s.put(Rp(l.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return A.forEach(t,(i,s)=>{const o=n.get(i.collectionGroup);return(o?A.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next(c=>(n.set(i.collectionGroup,c),A.forEach(c,l=>this.zn(e,i,l).next(u=>{const d=this.jn(s,l);return u.isEqual(d)?A.resolve():this.Jn(e,s,l,u,d)}))))})}Hn(e,t,n,i){return Fr(e).put(i.Rn(this.uid,this.$n(n,t.key),t.key))}Yn(e,t,n,i){return Fr(e).delete(i.Vn(this.uid,this.$n(n,t.key),t.key))}zn(e,t,n){const i=Fr(e);let s=new se(dn);return i.ee({index:uy,range:IDBKeyRange.only([n.indexId,this.uid,da(this.$n(n,t))])},(o,c)=>{s=s.add(new ir(n.indexId,t,xp(c.arrayValue),xp(c.directionalValue)))}).next(()=>s)}jn(e,t){let n=new se(dn);const i=this.Qn(t,e);if(i==null)return n;const s=Ml(t);if(s!=null){const o=e.data.field(s.fieldPath);if(Hs(o))for(const c of o.arrayValue.values||[])n=n.add(new ir(t.indexId,e.key,this.Ln(c),i))}else n=n.add(new ir(t.indexId,e.key,Qo,i));return n}Jn(e,t,n,i,s){N(Op,"Updating index entries for document '%s'",t.key);const o=[];return function(l,u,d,p,g){const E=l.getIterator(),k=u.getIterator();let D=Mr(E),T=Mr(k);for(;D||T;){let V=!1,M=!1;if(D&&T){const B=d(D,T);B<0?M=!0:B>0&&(V=!0)}else D!=null?M=!0:V=!0;V?(p(T),T=Mr(k)):M?(g(D),D=Mr(E)):(D=Mr(E),T=Mr(k))}}(i,s,dn,c=>{o.push(this.Hn(e,t,n,c))},c=>{o.push(this.Yn(e,t,n,c))}),A.waitFor(o)}Gn(e){let t=1;return Ur(e).ee({index:ly,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,c)=>dn(o,c)).filter((o,c,l)=>!c||dn(o,l[c-1])!==0);const i=[];i.push(e);for(const o of n){const c=dn(o,e),l=dn(o,t);if(c===0)i[0]=e.An();else if(c>0&&l<0)i.push(o),i.push(o.An());else if(l>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Zn(i[o],i[o+1]))return[];const c=i[o].Vn(this.uid,Qo,L.empty()),l=i[o+1].Vn(this.uid,Qo,L.empty());s.push(IDBKeyRange.bound(c,l))}return s}Zn(e,t){return dn(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Lp)}getMinOffset(e,t){return A.mapArray(this.Mn(t),n=>this.xn(e,n).next(i=>i||q(44426))).next(Lp)}}function Mp(r){return xe(r,js)}function Fr(r){return xe(r,Ps)}function cs(r){return xe(r,Ju)}function Ur(r){return xe(r,Rs)}function Lp(r){$(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;Hu(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new ft(e.readTime,e.documentKey,t)}/**
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
 */const Fp={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},m_=41943040;class Ke{static withCacheSize(e){return new Ke(e,Ke.DEFAULT_COLLECTION_PERCENTILE,Ke.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function g_(r,e,t){const n=r.store(yt),i=r.store(li),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const l=n.ee({range:o},(d,p,g)=>(c++,g.delete()));s.push(l.next(()=>{$(c===1,47070,{batchId:t.batchId})}));const u=[];for(const d of t.mutations){const p=oy(e,d.key.path,t.batchId);s.push(i.delete(p)),u.push(d.key)}return A.waitFor(s).next(()=>u)}function xa(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw q(14731);e=r.noDocument}return JSON.stringify(e).length}/**
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
 */Ke.DEFAULT_COLLECTION_PERCENTILE=10,Ke.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Ke.DEFAULT=new Ke(m_,Ke.DEFAULT_COLLECTION_PERCENTILE,Ke.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Ke.DISABLED=new Ke(-1,0,0);class dc{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Xn={}}static wt(e,t,n,i){$(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new dc(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return fn(e).ee({index:ar,range:n},(i,s,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=Wr(e),o=fn(e);return o.add({}).next(c=>{$(typeof c=="number",49019);const l=new ah(c,t,n,i),u=function(E,k,D){const T=D.baseMutations.map(M=>Js(E.yt,M)),V=D.mutations.map(M=>Js(E.yt,M));return{userId:k,batchId:D.batchId,localWriteTimeMs:D.localWriteTime.toMillis(),baseMutations:T,mutations:V}}(this.serializer,this.userId,l),d=[];let p=new se((g,E)=>G(g.canonicalString(),E.canonicalString()));for(const g of i){const E=oy(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),d.push(o.put(u)),d.push(s.put(E,US))}return p.forEach(g=>{d.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Xn[c]=l.keys()}),A.waitFor(d).next(()=>l)})}lookupMutationBatch(e,t){return fn(e).get(t).next(n=>n?($(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),nr(this.serializer,n)):null)}er(e,t){return this.Xn[t]?A.resolve(this.Xn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Xn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return fn(e).ee({index:ar,range:i},(o,c,l)=>{c.userId===this.userId&&($(c.batchId>=n,47524,{tr:n}),s=nr(this.serializer,c)),l.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=Tn;return fn(e).ee({index:ar,range:t,reverse:!0},(i,s,o)=>{n=s.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,Tn],[this.userId,Number.POSITIVE_INFINITY]);return fn(e).J(ar,t).next(n=>n.map(i=>nr(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=sa(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return Wr(e).ee({range:i},(o,c,l)=>{const[u,d,p]=o,g=Nt(d);if(u===this.userId&&t.path.isEqual(g))return fn(e).get(p).next(E=>{if(!E)throw q(61480,{nr:o,batchId:p});$(E.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:E.userId,batchId:p}),s.push(nr(this.serializer,E))});l.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new se(G);const i=[];return t.forEach(s=>{const o=sa(this.userId,s.path),c=IDBKeyRange.lowerBound(o),l=Wr(e).ee({range:c},(u,d,p)=>{const[g,E,k]=u,D=Nt(E);g===this.userId&&s.path.isEqual(D)?n=n.add(k):p.done()});i.push(l)}),A.waitFor(i).next(()=>this.rr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=sa(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new se(G);return Wr(e).ee({range:o},(l,u,d)=>{const[p,g,E]=l,k=Nt(g);p===this.userId&&n.isPrefixOf(k)?k.length===i&&(c=c.add(E)):d.done()}).next(()=>this.rr(e,c))}rr(e,t){const n=[],i=[];return t.forEach(s=>{i.push(fn(e).get(s).next(o=>{if(o===null)throw q(35274,{batchId:s});$(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(nr(this.serializer,o))}))}),A.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return g_(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.ir(t.batchId)}),A.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}ir(e){delete this.Xn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return A.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),i=[];return Wr(e).ee({range:n},(s,o,c)=>{if(s[0]===this.userId){const l=Nt(s[1]);i.push(l)}else c.done()}).next(()=>{$(i.length===0,56720,{sr:i.map(s=>s.canonicalString())})})})}containsKey(e,t){return y_(e,this.userId,t)}_r(e){return __(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:Tn,lastStreamToken:""})}}function y_(r,e,t){const n=sa(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return Wr(r).ee({range:s,X:!0},(c,l,u)=>{const[d,p,g]=c;d===e&&p===i&&(o=!0),u.done()}).next(()=>o)}function fn(r){return xe(r,yt)}function Wr(r){return xe(r,li)}function __(r){return xe(r,Ks)}/**
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
 */class vr{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new vr(0)}static cr(){return new vr(-1)}}/**
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
 */class oP{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.lr(e).next(t=>{const n=new vr(t.highestTargetId);return t.highestTargetId=n.next(),this.hr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.lr(e).next(t=>K.fromTimestamp(new re(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.lr(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.lr(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.hr(e,i)))}addTargetData(e,t){return this.Pr(e,t).next(()=>this.lr(e).next(n=>(n.targetCount+=1,this.Tr(t,n),this.hr(e,n))))}updateTargetData(e,t){return this.Pr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Br(e).delete(t.targetId)).next(()=>this.lr(e)).next(n=>($(n.targetCount>0,8065),n.targetCount-=1,this.hr(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return Br(e).ee((o,c)=>{const l=ys(c);l.sequenceNumber<=t&&n.get(l.targetId)===null&&(i++,s.push(this.removeTargetData(e,l)))}).next(()=>A.waitFor(s)).next(()=>i)}forEachTarget(e,t){return Br(e).ee((n,i)=>{const s=ys(i);t(s)})}lr(e){return Up(e).get(Sa).next(t=>($(t!==null,2888),t))}hr(e,t){return Up(e).put(Sa,t)}Pr(e,t){return Br(e).put(d_(this.serializer,t))}Tr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.lr(e).next(t=>t.targetCount)}getTargetData(e,t){const n=yr(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return Br(e).ee({range:i,index:cy},(o,c,l)=>{const u=ys(c);_o(t,u.target)&&(s=u,l.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=gn(e);return t.forEach(o=>{const c=je(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))}),A.waitFor(i)}removeMatchingKeys(e,t,n){const i=gn(e);return A.forEach(t,s=>{const o=je(s.path);return A.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=gn(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=gn(e);let s=H();return i.ee({range:n,X:!0},(o,c,l)=>{const u=Nt(o[1]),d=new L(u);s=s.add(d)}).next(()=>s)}containsKey(e,t){const n=je(t.path),i=IDBKeyRange.bound([n],[Yg(n)],!1,!0);let s=0;return gn(e).ee({index:Yu,X:!0,range:i},([o,c],l,u)=>{o!==0&&(s++,u.done())}).next(()=>s>0)}At(e,t){return Br(e).get(t).next(n=>n?ys(n):null)}}function Br(r){return xe(r,ui)}function Up(r){return xe(r,dr)}function gn(r){return xe(r,hi)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bp="LruGarbageCollector",aP=1048576;function qp([r,e],[t,n]){const i=G(r,t);return i===0?G(e,n):i}class cP{constructor(e){this.Ir=e,this.buffer=new se(qp),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();qp(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class w_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){N(Bp,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Bn(t)?N(Bp,"Ignoring IndexedDB error during garbage collection: ",t):await Un(t)}await this.Vr(3e5)})}}class lP{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return A.resolve(st.ce);const n=new cP(t);return this.mr.forEachTarget(e,i=>n.Ar(i.sequenceNumber)).next(()=>this.mr.pr(e,i=>n.Ar(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.mr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(N("LruGarbageCollector","Garbage collection skipped; disabled"),A.resolve(Fp)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(N("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Fp):this.yr(e,t))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let n,i,s,o,c,l,u;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(N("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i))).next(p=>(n=p,c=Date.now(),this.removeTargets(e,n,t))).next(p=>(s=p,l=Date.now(),this.removeOrphanedDocuments(e,n))).next(p=>(u=Date.now(),Kr()<=J.DEBUG&&N("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(l-c)+`ms
	Removed ${p} documents in `+(u-l)+`ms
Total Duration: ${u-d}ms`),A.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p})))}}function I_(r,e){return new lP(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uP{constructor(e,t){this.db=e,this.garbageCollector=I_(this,t)}gr(e){const t=this.wr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}pr(e,t){return this.Sr(e,(n,i)=>t(i))}addReference(e,t,n){return Yo(e,n)}removeReference(e,t,n){return Yo(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return Yo(e,t)}br(e,t){return function(i,s){let o=!1;return __(i).te(c=>y_(i,c,s).next(l=>(l&&(o=!0),A.resolve(!l)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.Sr(e,(o,c)=>{if(c<=t){const l=this.br(e,o).next(u=>{if(!u)return s++,n.getEntry(e,o).next(()=>(n.removeEntry(o,K.min()),gn(e).delete(function(p){return[0,je(p.path)]}(o))))});i.push(l)}}).next(()=>A.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return Yo(e,t)}Sr(e,t){const n=gn(e);let i,s=st.ce;return n.ee({index:Yu},([o,c],{path:l,sequenceNumber:u})=>{o===0?(s!==st.ce&&t(new L(Nt(i)),s),s=u,i=l):s=st.ce}).next(()=>{s!==st.ce&&t(new L(Nt(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Yo(r,e){return gn(r).put(function(n,i){return{targetId:0,path:je(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
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
 */class E_{constructor(){this.changes=new en(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ue.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?A.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class hP{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return Yn(e).put(n)}removeEntry(e,t,n){return Yn(e).delete(function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],ka(o),c[c.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Dr(e,n)))}getEntry(e,t){let n=ue.newInvalidDocument(t);return Yn(e).ee({index:oa,range:IDBKeyRange.only(ls(t))},(i,s)=>{n=this.Cr(t,s)}).next(()=>n)}vr(e,t){let n={size:0,document:ue.newInvalidDocument(t)};return Yn(e).ee({index:oa,range:IDBKeyRange.only(ls(t))},(i,s)=>{n={document:this.Cr(t,s),size:xa(s)}}).next(()=>n)}getEntries(e,t){let n=at();return this.Fr(e,t,(i,s)=>{const o=this.Cr(i,s);n=n.insert(i,o)}).next(()=>n)}Mr(e,t){let n=at(),i=new ce(L.comparator);return this.Fr(e,t,(s,o)=>{const c=this.Cr(s,o);n=n.insert(s,c),i=i.insert(s,xa(o))}).next(()=>({documents:n,Or:i}))}Fr(e,t,n){if(t.isEmpty())return A.resolve();let i=new se(zp);t.forEach(l=>i=i.add(l));const s=IDBKeyRange.bound(ls(i.first()),ls(i.last())),o=i.getIterator();let c=o.getNext();return Yn(e).ee({index:oa,range:s},(l,u,d)=>{const p=L.fromSegments([...u.prefixPath,u.collectionGroup,u.documentId]);for(;c&&zp(c,p)<0;)n(c,null),c=o.getNext();c&&c.isEqual(p)&&(n(c,u),c=o.hasNext()?o.getNext():null),c?d.j(ls(c)):d.done()}).next(()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),ka(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],l=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return Yn(e).J(IDBKeyRange.bound(c,l,!0)).next(u=>{s==null||s.incrementDocumentReadCount(u.length);let d=at();for(const p of u){const g=this.Cr(L.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(Io(t,g)||i.has(g.key))&&(d=d.insert(g.key,g))}return d})}getAllFromCollectionGroup(e,t,n,i){let s=at();const o=Kp(t,n),c=Kp(t,ft.max());return Yn(e).ee({index:ay,range:IDBKeyRange.bound(o,c,!0)},(l,u,d)=>{const p=this.Cr(L.fromSegments(u.prefixPath.concat(u.collectionGroup,u.documentId)),u);s=s.insert(p.key,p),s.size===i&&d.done()}).next(()=>s)}newChangeBuffer(e){return new dP(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return $p(e).get(Ll).next(t=>($(!!t,20021),t))}Dr(e,t){return $p(e).put(Ll,t)}Cr(e,t){if(t){const n=YR(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(K.min())))return n}return ue.newInvalidDocument(e)}}function v_(r){return new hP(r)}class dP extends E_{constructor(e,t){super(),this.Nr=e,this.trackRemovals=t,this.Br=new en(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new se((s,o)=>G(s.canonicalString(),o.canonicalString()));return this.changes.forEach((s,o)=>{const c=this.Br.get(s);if(t.push(this.Nr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const l=Ap(this.Nr.serializer,o);i=i.add(s.path.popLast());const u=xa(l);n+=u-c.size,t.push(this.Nr.addEntry(e,s,l))}else if(n-=c.size,this.trackRemovals){const l=Ap(this.Nr.serializer,o.convertToNoDocument(K.min()));t.push(this.Nr.addEntry(e,s,l))}}),i.forEach(s=>{t.push(this.Nr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.Nr.updateMetadata(e,n)),A.waitFor(t)}getFromCache(e,t){return this.Nr.vr(e,t).next(n=>(this.Br.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Nr.Mr(e,t).next(({documents:n,Or:i})=>(i.forEach((s,o)=>{this.Br.set(s,{size:o,readTime:n.get(s).readTime})}),n))}}function $p(r){return xe(r,zs)}function Yn(r){return xe(r,Aa)}function ls(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Kp(r,e){const t=e.documentKey.path.toArray();return[r,ka(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function zp(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=G(t[s],n[s]),i)return i;return i=G(t.length,n.length),i||(i=G(t[t.length-2],n[n.length-2]),i||G(t[t.length-1],n[n.length-1]))}/**
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
 */class fP{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class T_{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&Ds(n.mutation,i,ot.empty(),re.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,H()).next(()=>n))}getLocalViewOfDocuments(e,t,n=H()){const i=Vt();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let o=ms();return s.forEach((c,l)=>{o=o.insert(c,l.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=Vt();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,H()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,n,i){let s=at();const o=ks(),c=function(){return ks()}();return t.forEach((l,u)=>{const d=n.get(u.key);i.has(u.key)&&(d===void 0||d.mutation instanceof tn)?s=s.insert(u.key,u):d!==void 0?(o.set(u.key,d.mutation.getFieldMask()),Ds(d.mutation,u,d.mutation.getFieldMask(),re.now())):o.set(u.key,ot.empty())}),this.recalculateAndSaveOverlays(e,s).next(l=>(l.forEach((u,d)=>o.set(u,d)),t.forEach((u,d)=>c.set(u,new fP(d,o.get(u)??null))),c))}recalculateAndSaveOverlays(e,t){const n=ks();let i=new ce((o,c)=>o-c),s=H();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(l=>{const u=t.get(l);if(u===null)return;let d=n.get(l)||ot.empty();d=c.applyToLocalView(u,d),n.set(l,d);const p=(i.get(c.batchId)||H()).add(l);i=i.insert(c.batchId,p)})}).next(()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const l=c.getNext(),u=l.key,d=l.value,p=Uy();d.forEach(g=>{if(!s.has(g)){const E=Gy(t.get(g),n.get(g));E!==null&&p.set(g,E),s=s.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,u,p))}return A.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(o){return L.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):rh(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):A.resolve(Vt());let c=ci,l=s;return o.next(u=>A.forEach(u,(d,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(d)?A.resolve():this.remoteDocumentCache.getEntry(e,d).next(g=>{l=l.insert(d,g)}))).next(()=>this.populateOverlays(e,u,s)).next(()=>this.computeViews(e,l,u,H())).next(d=>({batchId:c,changes:Fy(d)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new L(t)).next(n=>{let i=ms();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=ms();return this.indexManager.getCollectionParents(e,s).next(c=>A.forEach(c,l=>{const u=function(p,g){return new Zt(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,l.child(s));return this.getDocumentsMatchingCollectionQuery(e,u,n,i).next(d=>{d.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(o=>{s.forEach((l,u)=>{const d=u.getKey();o.get(d)===null&&(o=o.insert(d,ue.newInvalidDocument(d)))});let c=ms();return o.forEach((l,u)=>{const d=s.get(l);d!==void 0&&Ds(d.mutation,u,ot.empty(),re.now()),Io(t,u)&&(c=c.insert(l,u))}),c})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pP{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return A.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:Ae(i.createTime)}}(t)),A.resolve()}getNamedQuery(e,t){return A.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,function(i){return{name:i.name,query:dh(i.bundledQuery),readTime:Ae(i.readTime)}}(t)),A.resolve()}}/**
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
 */class mP{constructor(){this.overlays=new ce(L.comparator),this.qr=new Map}getOverlay(e,t){return A.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Vt();return A.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.St(e,t,s)}),A.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.qr.delete(n)),A.resolve()}getOverlaysForCollection(e,t,n){const i=Vt(),s=t.length+1,o=new L(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const l=c.getNext().value,u=l.getKey();if(!t.isPrefixOf(u.path))break;u.path.length===s&&l.largestBatchId>n&&i.set(l.getKey(),l)}return A.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new ce((u,d)=>u-d);const o=this.overlays.getIterator();for(;o.hasNext();){const u=o.getNext().value;if(u.getKey().getCollectionGroup()===t&&u.largestBatchId>n){let d=s.get(u.largestBatchId);d===null&&(d=Vt(),s=s.insert(u.largestBatchId,d)),d.set(u.getKey(),u)}}const c=Vt(),l=s.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((u,d)=>c.set(u,d)),!(c.size()>=i)););return A.resolve(c)}St(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new lh(t,n));let s=this.qr.get(t);s===void 0&&(s=H(),this.qr.set(t,s)),this.qr.set(t,s.add(n.key))}}/**
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
 */class gP{constructor(){this.sessionToken=Ee.EMPTY_BYTE_STRING}getSessionToken(e){return A.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,A.resolve()}}/**
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
 */class mh{constructor(){this.Qr=new se(Ve.$r),this.Ur=new se(Ve.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const n=new Ve(e,t);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Gr(new Ve(e,t))}zr(e,t){e.forEach(n=>this.removeReference(n,t))}jr(e){const t=new L(new X([])),n=new Ve(t,e),i=new Ve(t,e+1),s=[];return this.Ur.forEachInRange([n,i],o=>{this.Gr(o),s.push(o.key)}),s}Jr(){this.Qr.forEach(e=>this.Gr(e))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new L(new X([])),n=new Ve(t,e),i=new Ve(t,e+1);let s=H();return this.Ur.forEachInRange([n,i],o=>{s=s.add(o.key)}),s}containsKey(e){const t=new Ve(e,0),n=this.Qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class Ve{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return L.comparator(e.key,t.key)||G(e.Yr,t.Yr)}static Kr(e,t){return G(e.Yr,t.Yr)||L.comparator(e.key,t.key)}}/**
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
 */class yP{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new se(Ve.$r)}checkEmpty(e){return A.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new ah(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Zr=this.Zr.add(new Ve(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return A.resolve(o)}lookupMutationBatch(e,t){return A.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.ei(n),s=i<0?0:i;return A.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return A.resolve(this.mutationQueue.length===0?Tn:this.tr-1)}getAllMutationBatches(e){return A.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new Ve(t,0),i=new Ve(t,Number.POSITIVE_INFINITY),s=[];return this.Zr.forEachInRange([n,i],o=>{const c=this.Xr(o.Yr);s.push(c)}),A.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new se(G);return t.forEach(i=>{const s=new Ve(i,0),o=new Ve(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([s,o],c=>{n=n.add(c.Yr)})}),A.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;L.isDocumentKey(s)||(s=s.child(""));const o=new Ve(new L(s),0);let c=new se(G);return this.Zr.forEachWhile(l=>{const u=l.key.path;return!!n.isPrefixOf(u)&&(u.length===i&&(c=c.add(l.Yr)),!0)},o),A.resolve(this.ti(c))}ti(e){const t=[];return e.forEach(n=>{const i=this.Xr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){$(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return A.forEach(t.mutations,i=>{const s=new Ve(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.Zr=n})}ir(e){}containsKey(e,t){const n=new Ve(t,0),i=this.Zr.firstAfterOrEqual(n);return A.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,A.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class _P{constructor(e){this.ri=e,this.docs=function(){return new ce(L.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ri(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return A.resolve(n?n.document.mutableCopy():ue.newInvalidDocument(t))}getEntries(e,t){let n=at();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():ue.newInvalidDocument(i))}),A.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=at();const o=t.path,c=new L(o.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:u,value:{document:d}}=l.getNext();if(!o.isPrefixOf(u.path))break;u.path.length>o.length+1||Hu(ty(d),n)<=0||(i.has(d.key)||Io(t,d))&&(s=s.insert(d.key,d.mutableCopy()))}return A.resolve(s)}getAllFromCollectionGroup(e,t,n,i){q(9500)}ii(e,t){return A.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new wP(this)}getSize(e){return A.resolve(this.size)}}class wP extends E_{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.Nr.addEntry(e,i)):this.Nr.removeEntry(n)}),A.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
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
 */class IP{constructor(e){this.persistence=e,this.si=new en(t=>yr(t),_o),this.lastRemoteSnapshotVersion=K.min(),this.highestTargetId=0,this.oi=0,this._i=new mh,this.targetCount=0,this.ai=vr.ur()}forEachTarget(e,t){return this.si.forEach((n,i)=>t(i)),A.resolve()}getLastRemoteSnapshotVersion(e){return A.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return A.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),A.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.oi&&(this.oi=t),A.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new vr(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,A.resolve()}updateTargetData(e,t){return this.Pr(t),A.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,A.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.si.forEach((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.si.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)}),A.waitFor(s).next(()=>i)}getTargetCount(e){return A.resolve(this.targetCount)}getTargetData(e,t){const n=this.si.get(t)||null;return A.resolve(n)}addMatchingKeys(e,t,n){return this._i.Wr(t,n),A.resolve()}removeMatchingKeys(e,t,n){this._i.zr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),A.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),A.resolve()}getMatchingKeysForTargetId(e,t){const n=this._i.Hr(t);return A.resolve(n)}containsKey(e,t){return A.resolve(this._i.containsKey(t))}}/**
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
 */class gh{constructor(e,t){this.ui={},this.overlays={},this.ci=new st(0),this.li=!1,this.li=!0,this.hi=new gP,this.referenceDelegate=e(this),this.Pi=new IP(this),this.indexManager=new iP,this.remoteDocumentCache=function(i){return new _P(i)}(n=>this.referenceDelegate.Ti(n)),this.serializer=new h_(t),this.Ii=new pP(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new mP,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ui[e.toKey()];return n||(n=new yP(t,this.referenceDelegate),this.ui[e.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,n){N("MemoryPersistence","Starting transaction:",e);const i=new EP(this.ci.next());return this.referenceDelegate.Ei(),n(i).next(s=>this.referenceDelegate.di(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Ai(e,t){return A.or(Object.values(this.ui).map(n=>()=>n.containsKey(e,t)))}}class EP extends ry{constructor(e){super(),this.currentSequenceNumber=e}}class fc{constructor(e){this.persistence=e,this.Ri=new mh,this.Vi=null}static mi(e){return new fc(e)}get fi(){if(this.Vi)return this.Vi;throw q(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.fi.delete(n.toString()),A.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.fi.add(n.toString()),A.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),A.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(i=>this.fi.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.fi.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return A.forEach(this.fi,n=>{const i=L.fromPath(n);return this.gi(e,i).next(s=>{s||t.removeEntry(i,K.min())})}).next(()=>(this.Vi=null,t.apply(e)))}updateLimboDocument(e,t){return this.gi(e,t).next(n=>{n?this.fi.delete(t.toString()):this.fi.add(t.toString())})}Ti(e){return 0}gi(e,t){return A.or([()=>A.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class Na{constructor(e,t){this.persistence=e,this.pi=new en(n=>je(n.path),(n,i)=>n.isEqual(i)),this.garbageCollector=I_(this,t)}static mi(e,t){return new Na(e,t)}Ei(){}di(e){return A.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}pr(e,t){return A.forEach(this.pi,(n,i)=>this.br(e,n,i).next(s=>s?A.resolve():t(i)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ii(e,o=>this.br(e,o,t).next(c=>{c||(n++,s.removeEntry(o,K.min()))})).next(()=>s.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}removeReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),A.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),A.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=ca(e.data.value)),t}br(e,t,n){return A.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.pi.get(t);return A.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vP{constructor(e){this.serializer=e}k(e,t,n,i){const s=new nc("createOrUpgrade",t);n<1&&i>=1&&(function(l){l.createObjectStore(yo)}(e),function(l){l.createObjectStore(Ks,{keyPath:FS}),l.createObjectStore(yt,{keyPath:tp,autoIncrement:!0}).createIndex(ar,np,{unique:!0}),l.createObjectStore(li)}(e),jp(e),function(l){l.createObjectStore(er)}(e));let o=A.resolve();return n<3&&i>=3&&(n!==0&&(function(l){l.deleteObjectStore(hi),l.deleteObjectStore(ui),l.deleteObjectStore(dr)}(e),jp(e)),o=o.next(()=>function(l){const u=l.store(dr),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:K.min().toTimestamp(),targetCount:0};return u.put(Sa,d)}(s))),n<4&&i>=4&&(n!==0&&(o=o.next(()=>function(l,u){return u.store(yt).J().next(p=>{l.deleteObjectStore(yt),l.createObjectStore(yt,{keyPath:tp,autoIncrement:!0}).createIndex(ar,np,{unique:!0});const g=u.store(yt),E=p.map(k=>g.put(k));return A.waitFor(E)})}(e,s))),o=o.next(()=>{(function(l){l.createObjectStore(di,{keyPath:WS})})(e)})),n<5&&i>=5&&(o=o.next(()=>this.yi(s))),n<6&&i>=6&&(o=o.next(()=>(function(l){l.createObjectStore(zs)}(e),this.wi(s)))),n<7&&i>=7&&(o=o.next(()=>this.Si(s))),n<8&&i>=8&&(o=o.next(()=>this.bi(e,s))),n<9&&i>=9&&(o=o.next(()=>{(function(l){l.objectStoreNames.contains("remoteDocumentChanges")&&l.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(o=o.next(()=>this.Di(s))),n<11&&i>=11&&(o=o.next(()=>{(function(l){l.createObjectStore(rc,{keyPath:HS})})(e),function(l){l.createObjectStore(ic,{keyPath:QS})}(e)})),n<12&&i>=12&&(o=o.next(()=>{(function(l){const u=l.createObjectStore(sc,{keyPath:nR});u.createIndex(Ul,rR,{unique:!1}),u.createIndex(hy,iR,{unique:!1})})(e)})),n<13&&i>=13&&(o=o.next(()=>function(l){const u=l.createObjectStore(Aa,{keyPath:BS});u.createIndex(oa,qS),u.createIndex(ay,$S)}(e)).next(()=>this.Ci(e,s)).next(()=>e.deleteObjectStore(er))),n<14&&i>=14&&(o=o.next(()=>this.Fi(e,s))),n<15&&i>=15&&(o=o.next(()=>function(l){l.createObjectStore(Ju,{keyPath:YS,autoIncrement:!0}).createIndex(Fl,JS,{unique:!1}),l.createObjectStore(Rs,{keyPath:XS}).createIndex(ly,ZS,{unique:!1}),l.createObjectStore(Ps,{keyPath:eR}).createIndex(uy,tR,{unique:!1})}(e))),n<16&&i>=16&&(o=o.next(()=>{t.objectStore(Rs).clear()}).next(()=>{t.objectStore(Ps).clear()})),n<17&&i>=17&&(o=o.next(()=>{(function(l){l.createObjectStore(Xu,{keyPath:sR})})(e)})),n<18&&i>=18&&Cm()&&(o=o.next(()=>{t.objectStore(Rs).clear()}).next(()=>{t.objectStore(Ps).clear()})),o}wi(e){let t=0;return e.store(er).ee((n,i)=>{t+=xa(i)}).next(()=>{const n={byteSize:t};return e.store(zs).put(Ll,n)})}yi(e){const t=e.store(Ks),n=e.store(yt);return t.J().next(i=>A.forEach(i,s=>{const o=IDBKeyRange.bound([s.userId,Tn],[s.userId,s.lastAcknowledgedBatchId]);return n.J(ar,o).next(c=>A.forEach(c,l=>{$(l.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:l.batchId});const u=nr(this.serializer,l);return g_(e,s.userId,u).next(()=>{})}))}))}Si(e){const t=e.store(hi),n=e.store(er);return e.store(dr).get(Sa).next(i=>{const s=[];return n.ee((o,c)=>{const l=new X(o),u=function(p){return[0,je(p)]}(l);s.push(t.get(u).next(d=>d?A.resolve():(p=>t.put({targetId:0,path:je(p),sequenceNumber:i.highestListenSequenceNumber}))(l)))}).next(()=>A.waitFor(s))})}bi(e,t){e.createObjectStore(js,{keyPath:GS});const n=t.store(js),i=new ph,s=o=>{if(i.add(o)){const c=o.lastSegment(),l=o.popLast();return n.put({collectionId:c,parent:je(l)})}};return t.store(er).ee({X:!0},(o,c)=>{const l=new X(o);return s(l.popLast())}).next(()=>t.store(li).ee({X:!0},([o,c,l],u)=>{const d=Nt(c);return s(d.popLast())}))}Di(e){const t=e.store(ui);return t.ee((n,i)=>{const s=ys(i),o=d_(this.serializer,s);return t.put(o)})}Ci(e,t){const n=t.store(er),i=[];return n.ee((s,o)=>{const c=t.store(Aa),l=function(p){return p.document?new L(X.fromString(p.document.name).popFirst(5)):p.noDocument?L.fromSegments(p.noDocument.path):p.unknownDocument?L.fromSegments(p.unknownDocument.path):q(36783)}(o).path.toArray(),u={prefixPath:l.slice(0,l.length-2),collectionGroup:l[l.length-2],documentId:l[l.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(u))}).next(()=>A.waitFor(i))}Fi(e,t){const n=t.store(yt),i=v_(this.serializer),s=new gh(fc.mi,this.serializer.yt);return n.J().next(o=>{const c=new Map;return o.forEach(l=>{let u=c.get(l.userId)??H();nr(this.serializer,l).keys().forEach(d=>u=u.add(d)),c.set(l.userId,u)}),A.forEach(c,(l,u)=>{const d=new Oe(u),p=hc.wt(this.serializer,d),g=s.getIndexManager(d),E=dc.wt(d,this.serializer,g,s.referenceDelegate);return new T_(i,E,p,g).recalculateAndSaveOverlaysForDocumentKeys(new Bl(t,st.ce),l).next()})})}}function jp(r){r.createObjectStore(hi,{keyPath:zS}).createIndex(Yu,jS,{unique:!0}),r.createObjectStore(ui,{keyPath:"targetId"}).createIndex(cy,KS,{unique:!0}),r.createObjectStore(dr)}const pn="IndexedDbPersistence",gl=18e5,yl=5e3,_l="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",b_="main";class yh{constructor(e,t,n,i,s,o,c,l,u,d,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Mi=s,this.window=o,this.document=c,this.xi=u,this.Oi=d,this.Ni=p,this.ci=null,this.li=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Bi=null,this.inForeground=!1,this.Li=null,this.ki=null,this.qi=Number.NEGATIVE_INFINITY,this.Qi=g=>Promise.resolve(),!yh.v())throw new x(P.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new uP(this,i),this.$i=t+b_,this.serializer=new h_(l),this.Ui=new Ot(this.$i,this.Ni,new vP(this.serializer)),this.hi=new XR,this.Pi=new oP(this.referenceDelegate,this.serializer),this.remoteDocumentCache=v_(this.serializer),this.Ii=new JR,this.window&&this.window.localStorage?this.Ki=this.window.localStorage:(this.Ki=null,d===!1&&be(pn,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Wi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new x(P.FAILED_PRECONDITION,_l);return this.Gi(),this.zi(),this.ji(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Pi.getHighestSequenceNumber(e))}).then(e=>{this.ci=new st(e,this.xi)}).then(()=>{this.li=!0}).catch(e=>(this.Ui&&this.Ui.close(),Promise.reject(e)))}Ji(e){return this.Qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ui.$(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Mi.enqueueAndForget(async()=>{this.started&&await this.Wi()}))}Wi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>Jo(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Hi(e).next(t=>{t||(this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)))})}).next(()=>this.Yi(e)).next(t=>this.isPrimary&&!t?this.Zi(e).next(()=>!1):!!t&&this.Xi(e).next(()=>!0))).catch(e=>{if(Bn(e))return N(pn,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return N(pn,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Mi.enqueueRetryable(()=>this.Qi(e)),this.isPrimary=e})}Hi(e){return us(e).get(Or).next(t=>A.resolve(this.es(t)))}ts(e){return Jo(e).delete(this.clientId)}async ns(){if(this.isPrimary&&!this.rs(this.qi,gl)){this.qi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=xe(t,di);return n.J().next(i=>{const s=this.ss(i,gl),o=i.filter(c=>s.indexOf(c)===-1);return A.forEach(o,c=>n.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ki)for(const t of e)this.Ki.removeItem(this._s(t.clientId))}}ji(){this.ki=this.Mi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Wi().then(()=>this.ns()).then(()=>this.ji()))}es(e){return!!e&&e.ownerId===this.clientId}Yi(e){return this.Oi?A.resolve(!0):us(e).get(Or).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,yl)&&!this.us(t.ownerId)){if(this.es(t)&&this.networkEnabled)return!0;if(!this.es(t)){if(!t.allowTabSynchronization)throw new x(P.FAILED_PRECONDITION,_l);return!1}}return!(!this.networkEnabled||!this.inForeground)||Jo(e).J().next(n=>this.ss(n,yl).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&N(pn,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.li=!1,this.cs(),this.ki&&(this.ki.cancel(),this.ki=null),this.ls(),this.hs(),await this.Ui.runTransaction("shutdown","readwrite",[yo,di],e=>{const t=new Bl(e,st.ce);return this.Zi(t).next(()=>this.ts(t))}),this.Ui.close(),this.Ps()}ss(e,t){return e.filter(n=>this.rs(n.updateTimeMs,t)&&!this.us(n.clientId))}Ts(){return this.runTransaction("getActiveClients","readonly",e=>Jo(e).J().next(t=>this.ss(t,gl).map(n=>n.clientId)))}get started(){return this.li}getGlobalsCache(){return this.hi}getMutationQueue(e,t){return dc.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new sP(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return hc.wt(this.serializer,e)}getBundleCache(){return this.Ii}runTransaction(e,t,n){N(pn,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(l){return l===18?cR:l===17?my:l===16?aR:l===15?Zu:l===14?py:l===13?fy:l===12?oR:l===11?dy:void q(60245)}(this.Ni);let o;return this.Ui.runTransaction(e,i,s,c=>(o=new Bl(c,this.ci?this.ci.next():st.ce),t==="readwrite-primary"?this.Hi(o).next(l=>!!l||this.Yi(o)).next(l=>{if(!l)throw be(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)),new x(P.FAILED_PRECONDITION,ny);return n(o)}).next(l=>this.Xi(o).next(()=>l)):this.Is(o).next(()=>n(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Is(e){return us(e).get(Or).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,yl)&&!this.us(t.ownerId)&&!this.es(t)&&!(this.Oi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new x(P.FAILED_PRECONDITION,_l)})}Xi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return us(e).put(Or,t)}static v(){return Ot.v()}Zi(e){const t=us(e);return t.get(Or).next(n=>this.es(n)?(N(pn,"Releasing primary lease."),t.delete(Or)):A.resolve())}rs(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(be(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Gi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Li=()=>{this.Mi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Wi()))},this.document.addEventListener("visibilitychange",this.Li),this.inForeground=this.document.visibilityState==="visible")}ls(){this.Li&&(this.document.removeEventListener("visibilitychange",this.Li),this.Li=null)}zi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Bi=()=>{this.cs();const t=/(?:Version|Mobile)\/1[456]/;Pm()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Mi.enterRestrictedMode(!0),this.Mi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Bi))}hs(){this.Bi&&(this.window.removeEventListener("pagehide",this.Bi),this.Bi=null)}us(e){var t;try{const n=((t=this.Ki)==null?void 0:t.getItem(this._s(e)))!==null;return N(pn,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return be(pn,"Failed to get zombied client id.",n),!1}}cs(){if(this.Ki)try{this.Ki.setItem(this._s(this.clientId),String(Date.now()))}catch(e){be("Failed to set zombie client id.",e)}}Ps(){if(this.Ki)try{this.Ki.removeItem(this._s(this.clientId))}catch{}}_s(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function us(r){return xe(r,yo)}function Jo(r){return xe(r,di)}function _h(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class wh{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Es=n,this.ds=i}static As(e,t){let n=H(),i=H();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new wh(e,t.fromCache,n,i)}}/**
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
 */class TP{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class A_{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return Pm()?8:iy(ye())>0?6:4}()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ys(e,t).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.ws(e,t,i,n).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new TP;return this.Ss(e,t,o).next(c=>{if(s.result=c,this.Vs)return this.bs(e,t,o,c.size)})}).next(()=>s.result)}bs(e,t,n,i){return n.documentReadCount<this.fs?(Kr()<=J.DEBUG&&N("QueryEngine","SDK will not create cache indexes for query:",zr(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),A.resolve()):(Kr()<=J.DEBUG&&N("QueryEngine","Query:",zr(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(Kr()<=J.DEBUG&&N("QueryEngine","The SDK decides to create cache indexes for query:",zr(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,et(t))):A.resolve())}ys(e,t){if(mp(t))return A.resolve(null);let n=et(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=Ca(t,null,"F"),n=et(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const o=H(...s);return this.ps.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,n).next(l=>{const u=this.Ds(t,c);return this.Cs(t,u,o,l.readTime)?this.ys(e,Ca(t,null,"F")):this.vs(e,u,t,l)}))})))}ws(e,t,n,i){return mp(t)||i.isEqual(K.min())?A.resolve(null):this.ps.getDocuments(e,n).next(s=>{const o=this.Ds(t,s);return this.Cs(t,o,n,i)?A.resolve(null):(Kr()<=J.DEBUG&&N("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),zr(t)),this.vs(e,o,t,ey(i,ci)).next(c=>c))})}Ds(e,t){let n=new se(My(e));return t.forEach((i,s)=>{Io(e,s)&&(n=n.add(s))}),n}Cs(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Ss(e,t,n){return Kr()<=J.DEBUG&&N("QueryEngine","Using full collection scan to execute query:",zr(t)),this.ps.getDocumentsMatchingQuery(e,t,ft.min(),n)}vs(e,t,n,i){return this.ps.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ih="LocalStore",bP=3e8;class AP{constructor(e,t,n,i){this.persistence=e,this.Fs=t,this.serializer=i,this.Ms=new ce(G),this.xs=new en(s=>yr(s),_o),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(n)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new T_(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms))}}function S_(r,e,t,n){return new AP(r,e,t,n)}async function R_(r,e){const t=U(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.Bs(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const o=[],c=[];let l=H();for(const u of i){o.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}for(const u of s){c.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}return t.localDocuments.getDocuments(n,l).next(u=>({Ls:u,removedBatchIds:o,addedBatchIds:c}))})})}function SP(r,e){const t=U(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,u,d){const p=u.batch,g=p.keys();let E=A.resolve();return g.forEach(k=>{E=E.next(()=>d.getEntry(l,k)).next(D=>{const T=u.docVersions.get(k);$(T!==null,48541),D.version.compareTo(T)<0&&(p.applyToRemoteDocument(D,u),D.isValidDocument()&&(D.setReadTime(u.commitVersion),d.addEntry(D)))})}),E.next(()=>c.mutationQueue.removeMutationBatch(l,p))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(c){let l=H();for(let u=0;u<c.mutationResults.length;++u)c.mutationResults[u].transformResults.length>0&&(l=l.add(c.batch.mutations[u].key));return l}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function P_(r){const e=U(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t))}function RP(r,e){const t=U(r),n=e.snapshotVersion;let i=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=t.Ns.newChangeBuffer({trackRemovals:!0});i=t.Ms;const c=[];e.targetChanges.forEach((d,p)=>{const g=i.get(p);if(!g)return;c.push(t.Pi.removeMatchingKeys(s,d.removedDocuments,p).next(()=>t.Pi.addMatchingKeys(s,d.addedDocuments,p)));let E=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?E=E.withResumeToken(Ee.EMPTY_BYTE_STRING,K.min()).withLastLimboFreeSnapshotVersion(K.min()):d.resumeToken.approximateByteSize()>0&&(E=E.withResumeToken(d.resumeToken,n)),i=i.insert(p,E),function(D,T,V){return D.resumeToken.approximateByteSize()===0||T.snapshotVersion.toMicroseconds()-D.snapshotVersion.toMicroseconds()>=bP?!0:V.addedDocuments.size+V.modifiedDocuments.size+V.removedDocuments.size>0}(g,E,d)&&c.push(t.Pi.updateTargetData(s,E))});let l=at(),u=H();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,d))}),c.push(C_(s,o,e.documentUpdates).next(d=>{l=d.ks,u=d.qs})),!n.isEqual(K.min())){const d=t.Pi.getLastRemoteSnapshotVersion(s).next(p=>t.Pi.setTargetsMetadata(s,s.currentSequenceNumber,n));c.push(d)}return A.waitFor(c).next(()=>o.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,l,u)).next(()=>l)}).then(s=>(t.Ms=i,s))}function C_(r,e,t){let n=H(),i=H();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let o=at();return t.forEach((c,l)=>{const u=s.get(c);l.isFoundDocument()!==u.isFoundDocument()&&(i=i.add(c)),l.isNoDocument()&&l.version.isEqual(K.min())?(e.removeEntry(c,l.readTime),o=o.insert(c,l)):!u.isValidDocument()||l.version.compareTo(u.version)>0||l.version.compareTo(u.version)===0&&u.hasPendingWrites?(e.addEntry(l),o=o.insert(c,l)):N(Ih,"Ignoring outdated watch update for ",c,". Current version:",u.version," Watch version:",l.version)}),{ks:o,qs:i}})}function PP(r,e){const t=U(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=Tn),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function wi(r,e){const t=U(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Pi.getTargetData(n,e).next(s=>s?(i=s,A.resolve(i)):t.Pi.allocateTargetId(n).next(o=>(i=new Kt(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.Pi.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(n.targetId,n),t.xs.set(e,n.targetId)),n})}async function Ii(r,e,t){const n=U(r),i=n.Ms.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,o=>n.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!Bn(o))throw o;N(Ih,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Ms=n.Ms.remove(e),n.xs.delete(i.target)}function Va(r,e,t){const n=U(r);let i=K.min(),s=H();return n.persistence.runTransaction("Execute query","readwrite",o=>function(l,u,d){const p=U(l),g=p.xs.get(d);return g!==void 0?A.resolve(p.Ms.get(g)):p.Pi.getTargetData(u,d)}(n,o,et(e)).next(c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(o,c.targetId).next(l=>{s=l})}).next(()=>n.Fs.getDocumentsMatchingQuery(o,e,t?i:K.min(),t?s:H())).next(c=>(x_(n,Oy(e),c),{documents:c,Qs:s})))}function k_(r,e){const t=U(r),n=U(t.Pi),i=t.Ms.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.At(s,e).next(o=>o?o.target:null))}function D_(r,e){const t=U(r),n=t.Os.get(e)||K.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.Ns.getAllFromCollectionGroup(i,e,ey(n,ci),Number.MAX_SAFE_INTEGER)).then(i=>(x_(t,e,i),i))}function x_(r,e,t){let n=r.Os.get(e)||K.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.Os.set(e,n)}async function CP(r,e,t,n){const i=U(r);let s=H(),o=at();for(const u of t){const d=e.$s(u.metadata.name);u.document&&(s=s.add(d));const p=e.Us(u);p.setReadTime(e.Ks(u.metadata.readTime)),o=o.insert(d,p)}const c=i.Ns.newChangeBuffer({trackRemovals:!0}),l=await wi(i,function(d){return et(Ni(X.fromString(`__bundle__/docs/${d}`)))}(n));return i.persistence.runTransaction("Apply bundle documents","readwrite",u=>C_(u,c,o).next(d=>(c.apply(u),d)).next(d=>i.Pi.removeMatchingKeysForTargetId(u,l.targetId).next(()=>i.Pi.addMatchingKeys(u,s,l.targetId)).next(()=>i.localDocuments.getLocalViewOfDocuments(u,d.ks,d.qs)).next(()=>d.ks)))}async function kP(r,e,t=H()){const n=await wi(r,et(dh(e.bundledQuery))),i=U(r);return i.persistence.runTransaction("Save named query","readwrite",s=>{const o=Ae(e.readTime);if(n.snapshotVersion.compareTo(o)>=0)return i.Ii.saveNamedQuery(s,e);const c=n.withResumeToken(Ee.EMPTY_BYTE_STRING,o);return i.Ms=i.Ms.insert(c.targetId,c),i.Pi.updateTargetData(s,c).next(()=>i.Pi.removeMatchingKeysForTargetId(s,n.targetId)).next(()=>i.Pi.addMatchingKeys(s,t,n.targetId)).next(()=>i.Ii.saveNamedQuery(s,e))})}/**
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
 */const N_="firestore_clients";function Gp(r,e){return`${N_}_${r}_${e}`}const V_="firestore_mutations";function Wp(r,e,t){let n=`${V_}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const O_="firestore_targets";function wl(r,e){return`${O_}_${r}_${e}`}/**
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
 */const Rt="SharedClientState";class Oa{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Ws(e,t,n){const i=JSON.parse(n);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new x(i.error.code,i.error.message))),o?new Oa(e,t,i.state,s):(be(Rt,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class xs{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ws(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new x(n.error.code,n.error.message))),s?new xs(e,n.state,i):(be(Rt,`Failed to parse target state for ID '${e}': ${t}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Ma{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ws(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=ih();for(let o=0;i&&o<n.activeTargetIds.length;++o)i=sy(n.activeTargetIds[o]),s=s.add(n.activeTargetIds[o]);return i?new Ma(e,s):(be(Rt,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Eh{constructor(e,t){this.clientId=e,this.onlineState=t}static Ws(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Eh(t.clientId,t.onlineState):(be(Rt,`Failed to parse online state: ${e}`),null)}}class tu{constructor(){this.activeTargetIds=ih()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Il{constructor(e,t,n,i,s){this.window=e,this.Mi=t,this.persistenceKey=n,this.Js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Hs=this.Ys.bind(this),this.Zs=new ce(G),this.started=!1,this.Xs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.eo=Gp(this.persistenceKey,this.Js),this.no=function(l){return`firestore_sequence_number_${l}`}(this.persistenceKey),this.Zs=this.Zs.insert(this.Js,new tu),this.ro=new RegExp(`^${N_}_${o}_([^_]*)$`),this.io=new RegExp(`^${V_}_${o}_(\\d+)(?:_(.*))?$`),this.so=new RegExp(`^${O_}_${o}_(\\d+)$`),this.oo=function(l){return`firestore_online_state_${l}`}(this.persistenceKey),this._o=function(l){return`firestore_bundle_loaded_v2_${l}`}(this.persistenceKey),this.window.addEventListener("storage",this.Hs)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ts();for(const n of e){if(n===this.Js)continue;const i=this.getItem(Gp(this.persistenceKey,n));if(i){const s=Ma.Ws(n,i);s&&(this.Zs=this.Zs.insert(s.clientId,s))}}this.ao();const t=this.storage.getItem(this.oo);if(t){const n=this.uo(t);n&&this.co(n)}for(const n of this.Xs)this.Ys(n);this.Xs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.no,JSON.stringify(e))}getAllActiveQueryTargets(){return this.lo(this.Zs)}isActiveQueryTarget(e){let t=!1;return this.Zs.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.ho(e,"pending")}updateMutationState(e,t,n){this.ho(e,t,n),this.Po(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(wl(this.persistenceKey,e));if(i){const s=xs.Ws(e,i);s&&(n=s.state)}}return t&&this.To.zs(e),this.ao(),n}removeLocalQueryTarget(e){this.To.js(e),this.ao()}isLocalQueryTarget(e){return this.To.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(wl(this.persistenceKey,e))}updateQueryState(e,t,n){this.Io(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Po(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Eo(e)}notifyBundleLoaded(e){this.Ao(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Hs),this.removeItem(this.eo),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return N(Rt,"READ",e,t),t}setItem(e,t){N(Rt,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){N(Rt,"REMOVE",e),this.storage.removeItem(e)}Ys(e){const t=e;if(t.storageArea===this.storage){if(N(Rt,"EVENT",t.key,t.newValue),t.key===this.eo)return void be("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Mi.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.ro.test(t.key)){if(t.newValue==null){const n=this.Ro(t.key);return this.Vo(n,null)}{const n=this.mo(t.key,t.newValue);if(n)return this.Vo(n.clientId,n)}}else if(this.io.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(this.so.test(t.key)){if(t.newValue!==null){const n=this.yo(t.key,t.newValue);if(n)return this.wo(n)}}else if(t.key===this.oo){if(t.newValue!==null){const n=this.uo(t.newValue);if(n)return this.co(n)}}else if(t.key===this.no){const n=function(s){let o=st.ce;if(s!=null)try{const c=JSON.parse(s);$(typeof c=="number",30636,{So:s}),o=c}catch(c){be(Rt,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);n!==st.ce&&this.sequenceNumberHandler(n)}else if(t.key===this._o){const n=this.bo(t.newValue);await Promise.all(n.map(i=>this.syncEngine.Do(i)))}}}else this.Xs.push(t)})}}get To(){return this.Zs.get(this.Js)}ao(){this.setItem(this.eo,this.To.Gs())}ho(e,t,n){const i=new Oa(this.currentUser,e,t,n),s=Wp(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Gs())}Po(e){const t=Wp(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Eo(e){const t={clientId:this.Js,onlineState:e};this.storage.setItem(this.oo,JSON.stringify(t))}Io(e,t,n){const i=wl(this.persistenceKey,e),s=new xs(e,t,n);this.setItem(i,s.Gs())}Ao(e){const t=JSON.stringify(Array.from(e));this.setItem(this._o,t)}Ro(e){const t=this.ro.exec(e);return t?t[1]:null}mo(e,t){const n=this.Ro(e);return Ma.Ws(n,t)}fo(e,t){const n=this.io.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return Oa.Ws(new Oe(s),i,t)}yo(e,t){const n=this.so.exec(e),i=Number(n[1]);return xs.Ws(i,t)}uo(e){return Eh.Ws(e)}bo(e){return JSON.parse(e)}async po(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Co(e.batchId,e.state,e.error);N(Rt,`Ignoring mutation for non-active user ${e.user.uid}`)}wo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Vo(e,t){const n=t?this.Zs.insert(e,t):this.Zs.remove(e),i=this.lo(this.Zs),s=this.lo(n),o=[],c=[];return s.forEach(l=>{i.has(l)||o.push(l)}),i.forEach(l=>{s.has(l)||c.push(l)}),this.syncEngine.Fo(o,c).then(()=>{this.Zs=n})}co(e){this.Zs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}lo(e){let t=ih();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class M_{constructor(){this.Mo=new tu,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,n){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new tu,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class DP{Oo(e){}shutdown(){}}/**
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
 */const Hp="ConnectivityMonitor";class Qp{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){N(Hp,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){N(Hp,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Xo=null;function nu(){return Xo===null?Xo=function(){return 268435456+Math.round(2147483648*Math.random())}():Xo++,"0x"+Xo.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const El="RestConnection",xP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class NP{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===ql?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(e,t,n,i,s){const o=nu(),c=this.zo(e,t.toUriEncodedString());N(El,`Sending RPC '${e}' ${o}:`,c,n);const l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,i,s);const{host:u}=new URL(c),d=Ri(u);return this.Jo(e,c,l,n,d).then(p=>(N(El,`Received RPC '${e}' ${o}: `,p),p),p=>{throw Bt(El,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",n),p})}Ho(e,t,n,i,s,o){return this.Go(e,t,n,i,s)}jo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+xi}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),n&&n.headers.forEach((i,s)=>e[s]=i)}zo(e,t){const n=xP[e];return`${this.Uo}/v1/${t}:${n}`}terminate(){}}/**
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
 */class VP{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
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
 */const $e="WebChannelConnection";class OP extends NP{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,n,i,s){const o=nu();return new Promise((c,l)=>{const u=new Kg;u.setWithCredentials(!0),u.listenOnce(zg.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case ra.NO_ERROR:const p=u.getResponseJson();N($e,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case ra.TIMEOUT:N($e,`RPC '${e}' ${o} timed out`),l(new x(P.DEADLINE_EXCEEDED,"Request time out"));break;case ra.HTTP_ERROR:const g=u.getStatus();if(N($e,`RPC '${e}' ${o} failed with status:`,g,"response text:",u.getResponseText()),g>0){let E=u.getResponseJson();Array.isArray(E)&&(E=E[0]);const k=E==null?void 0:E.error;if(k&&k.status&&k.message){const D=function(V){const M=V.toLowerCase().replace(/_/g,"-");return Object.values(P).indexOf(M)>=0?M:P.UNKNOWN}(k.status);l(new x(D,k.message))}else l(new x(P.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new x(P.UNAVAILABLE,"Connection failed."));break;default:q(9055,{l_:e,streamId:o,h_:u.getLastErrorCode(),P_:u.getLastError()})}}finally{N($e,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(i);N($e,`RPC '${e}' ${o} sending request:`,i),u.send(t,"POST",d,n,15)})}T_(e,t,n){const i=nu(),s=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=Wg(),c=Gg(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;const d=s.join("");N($e,`Creating RPC '${e}' stream ${i}: ${d}`,l);const p=o.createWebChannel(d,l);this.I_(p);let g=!1,E=!1;const k=new VP({Yo:T=>{E?N($e,`Not sending because RPC '${e}' stream ${i} is closed:`,T):(g||(N($e,`Opening RPC '${e}' stream ${i} transport.`),p.open(),g=!0),N($e,`RPC '${e}' stream ${i} sending:`,T),p.send(T))},Zo:()=>p.close()}),D=(T,V,M)=>{T.listen(V,B=>{try{M(B)}catch(j){setTimeout(()=>{throw j},0)}})};return D(p,ps.EventType.OPEN,()=>{E||(N($e,`RPC '${e}' stream ${i} transport opened.`),k.o_())}),D(p,ps.EventType.CLOSE,()=>{E||(E=!0,N($e,`RPC '${e}' stream ${i} transport closed`),k.a_(),this.E_(p))}),D(p,ps.EventType.ERROR,T=>{E||(E=!0,Bt($e,`RPC '${e}' stream ${i} transport errored. Name:`,T.name,"Message:",T.message),k.a_(new x(P.UNAVAILABLE,"The operation could not be completed")))}),D(p,ps.EventType.MESSAGE,T=>{var V;if(!E){const M=T.data[0];$(!!M,16349);const B=M,j=(B==null?void 0:B.error)||((V=B[0])==null?void 0:V.error);if(j){N($e,`RPC '${e}' stream ${i} received error:`,j);const Q=j.status;let W=function(w){const b=Re[w];if(b!==void 0)return Qy(b)}(Q),I=j.message;W===void 0&&(W=P.INTERNAL,I="Unknown error status: "+Q+" with message "+j.message),E=!0,k.a_(new x(W,I)),p.close()}else N($e,`RPC '${e}' stream ${i} received:`,M),k.u_(M)}}),D(c,jg.STAT_EVENT,T=>{T.stat===Vl.PROXY?N($e,`RPC '${e}' stream ${i} detected buffering proxy`):T.stat===Vl.NOPROXY&&N($e,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{k.__()},0),k}terminate(){this.c_.forEach(e=>e.close()),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter(t=>t===e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */function L_(){return typeof window<"u"?window:null}function fa(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bo(r){return new BR(r,!0)}/**
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
 */class vh{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Mi=e,this.timerId=t,this.d_=n,this.A_=i,this.R_=s,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-n);i>0&&N("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
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
 */const Yp="PersistentStream";class F_{constructor(e,t,n,i,s,o,c,l){this.Mi=e,this.S_=n,this.b_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new vh(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===P.RESOURCE_EXHAUSTED?(be(t.toString()),be("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===P.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.D_===t&&this.G_(n,i)},n=>{e(()=>{const i=new x(P.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)})})}G_(e,t){const n=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{n(()=>this.listener.Xo())}),this.stream.t_(()=>{n(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()))}),this.stream.r_(i=>{n(()=>this.z_(i))}),this.stream.onMessage(i=>{n(()=>++this.F_==1?this.J_(i):this.onNext(i))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return N(Yp,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():(N(Yp,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class MP extends F_{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=KR(this.serializer,e),n=function(s){if(!("targetChange"in s))return K.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?K.min():o.readTime?Ae(o.readTime):K.min()}(e);return this.listener.H_(t,n)}Y_(e){const t={};t.database=Yl(this.serializer),t.addTarget=function(s,o){let c;const l=o.target;if(c=Ra(l)?{documents:s_(s,l)}:{query:o_(s,l).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Zy(s,o.resumeToken);const u=Hl(s,o.expectedCount);u!==null&&(c.expectedCount=u)}else if(o.snapshotVersion.compareTo(K.min())>0){c.readTime=_i(s,o.snapshotVersion.toTimestamp());const u=Hl(s,o.expectedCount);u!==null&&(c.expectedCount=u)}return c}(this.serializer,e);const n=jR(this.serializer,e);n&&(t.labels=n),this.q_(t)}Z_(e){const t={};t.database=Yl(this.serializer),t.removeTarget=e,this.q_(t)}}class LP extends F_{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return $(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,$(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){$(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=zR(e.writeResults,e.commitTime),n=Ae(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=Yl(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Js(this.serializer,n))};this.q_(t)}}/**
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
 */class FP{}class UP extends FP{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new x(P.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Go(e,Ql(t,n),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new x(P.UNKNOWN,s.toString())})}Ho(e,t,n,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.Ho(e,Ql(t,n),i,o,c,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new x(P.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}class BP{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(be(t),this.aa=!1):N("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const Tr="RemoteStore";class qP{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=s,this.Aa.Oo(o=>{n.enqueueAndForget(async()=>{$n(this)&&(N(Tr,"Restarting streams for network reachability change."),await async function(l){const u=U(l);u.Ea.add(4),await Mi(u),u.Ra.set("Unknown"),u.Ea.delete(4),await Ao(u)}(this))})}),this.Ra=new BP(n,i)}}async function Ao(r){if($n(r))for(const e of r.da)await e(!0)}async function Mi(r){for(const e of r.da)await e(!1)}function pc(r,e){const t=U(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),Ah(t)?bh(t):Fi(t).O_()&&Th(t,e))}function Ei(r,e){const t=U(r),n=Fi(t);t.Ia.delete(e),n.O_()&&U_(t,e),t.Ia.size===0&&(n.O_()?n.L_():$n(t)&&t.Ra.set("Unknown"))}function Th(r,e){if(r.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(K.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Fi(r).Y_(e)}function U_(r,e){r.Va.Ue(e),Fi(r).Z_(e)}function bh(r){r.Va=new MR({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),Fi(r).start(),r.Ra.ua()}function Ah(r){return $n(r)&&!Fi(r).x_()&&r.Ia.size>0}function $n(r){return U(r).Ea.size===0}function B_(r){r.Va=void 0}async function $P(r){r.Ra.set("Online")}async function KP(r){r.Ia.forEach((e,t)=>{Th(r,e)})}async function zP(r,e){B_(r),Ah(r)?(r.Ra.ha(e),bh(r)):r.Ra.set("Unknown")}async function jP(r,e,t){if(r.Ra.set("Online"),e instanceof Xy&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.Va.removeTarget(c))}(r,e)}catch(n){N(Tr,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await La(r,n)}else if(e instanceof ha?r.Va.Ze(e):e instanceof Jy?r.Va.st(e):r.Va.tt(e),!t.isEqual(K.min()))try{const n=await P_(r.localStore);t.compareTo(n)>=0&&await function(s,o){const c=s.Va.Tt(o);return c.targetChanges.forEach((l,u)=>{if(l.resumeToken.approximateByteSize()>0){const d=s.Ia.get(u);d&&s.Ia.set(u,d.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,u)=>{const d=s.Ia.get(l);if(!d)return;s.Ia.set(l,d.withResumeToken(Ee.EMPTY_BYTE_STRING,d.snapshotVersion)),U_(s,l);const p=new Kt(d.target,l,u,d.sequenceNumber);Th(s,p)}),s.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){N(Tr,"Failed to raise snapshot:",n),await La(r,n)}}async function La(r,e,t){if(!Bn(e))throw e;r.Ea.add(1),await Mi(r),r.Ra.set("Offline"),t||(t=()=>P_(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{N(Tr,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await Ao(r)})}function q_(r,e){return e().catch(t=>La(r,t,e))}async function Li(r){const e=U(r),t=Vn(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Tn;for(;GP(e);)try{const i=await PP(e.localStore,n);if(i===null){e.Ta.length===0&&t.L_();break}n=i.batchId,WP(e,i)}catch(i){await La(e,i)}$_(e)&&K_(e)}function GP(r){return $n(r)&&r.Ta.length<10}function WP(r,e){r.Ta.push(e);const t=Vn(r);t.O_()&&t.X_&&t.ea(e.mutations)}function $_(r){return $n(r)&&!Vn(r).x_()&&r.Ta.length>0}function K_(r){Vn(r).start()}async function HP(r){Vn(r).ra()}async function QP(r){const e=Vn(r);for(const t of r.Ta)e.ea(t.mutations)}async function YP(r,e,t){const n=r.Ta.shift(),i=ch.from(n,e,t);await q_(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await Li(r)}async function JP(r,e){e&&Vn(r).X_&&await async function(n,i){if(function(o){return Hy(o)&&o!==P.ABORTED}(i.code)){const s=n.Ta.shift();Vn(n).B_(),await q_(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await Li(n)}}(r,e),$_(r)&&K_(r)}async function Jp(r,e){const t=U(r);t.asyncQueue.verifyOperationInProgress(),N(Tr,"RemoteStore received new credentials");const n=$n(t);t.Ea.add(3),await Mi(t),n&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Ao(t)}async function ru(r,e){const t=U(r);e?(t.Ea.delete(2),await Ao(t)):e||(t.Ea.add(2),await Mi(t),t.Ra.set("Unknown"))}function Fi(r){return r.ma||(r.ma=function(t,n,i){const s=U(t);return s.sa(),new MP(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:$P.bind(null,r),t_:KP.bind(null,r),r_:zP.bind(null,r),H_:jP.bind(null,r)}),r.da.push(async e=>{e?(r.ma.B_(),Ah(r)?bh(r):r.Ra.set("Unknown")):(await r.ma.stop(),B_(r))})),r.ma}function Vn(r){return r.fa||(r.fa=function(t,n,i){const s=U(t);return s.sa(),new LP(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:HP.bind(null,r),r_:JP.bind(null,r),ta:QP.bind(null,r),na:YP.bind(null,r)}),r.da.push(async e=>{e?(r.fa.B_(),await Li(r)):(await r.fa.stop(),r.Ta.length>0&&(N(Tr,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
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
 */class Sh{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new Ue,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new Sh(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new x(P.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Ui(r,e){if(be("AsyncQueue",`${e}: ${r}`),Bn(r))return new x(P.UNAVAILABLE,`${e}: ${r}`);throw r}/**
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
 */class ni{static emptySet(e){return new ni(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||L.comparator(t.key,n.key):(t,n)=>L.comparator(t.key,n.key),this.keyedMap=ms(),this.sortedSet=new ce(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof ni)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new ni;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
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
 */class Xp{constructor(){this.ga=new ce(L.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):q(63341,{Rt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class vi{constructor(e,t,n,i,s,o,c,l,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new vi(e,t,ni.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&wo(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
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
 */class XP{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some(e=>e.Da())}}class ZP{constructor(){this.queries=Zp(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const i=U(t),s=i.queries;i.queries=Zp(),s.forEach((o,c)=>{for(const l of c.Sa)l.onError(n)})})(this,new x(P.ABORTED,"Firestore shutting down"))}}function Zp(){return new en(r=>Vy(r),wo)}async function Rh(r,e){const t=U(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.ba()&&e.Da()&&(n=2):(s=new XP,n=e.Da()?0:1);try{switch(n){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Ui(o,`Initialization of query '${zr(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.Sa.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&Ch(t)}async function Ph(r,e){const t=U(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.Sa.indexOf(e);o>=0&&(s.Sa.splice(o,1),s.Sa.length===0?i=e.Da()?0:1:!s.ba()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function eC(r,e){const t=U(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.Sa)c.Fa(i)&&(n=!0);o.wa=i}}n&&Ch(t)}function tC(r,e,t){const n=U(r),i=n.queries.get(e);if(i)for(const s of i.Sa)s.onError(t);n.queries.delete(e)}function Ch(r){r.Ca.forEach(e=>{e.next()})}var iu,em;(em=iu||(iu={})).Ma="default",em.Cache="cache";class kh{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new vi(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.qa||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=vi.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==iu.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nC{constructor(e,t){this.Qa=e,this.byteLength=t}$a(){return"metadata"in this.Qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tm{constructor(e){this.serializer=e}$s(e){return Mt(this.serializer,e)}Us(e){return e.metadata.exists?i_(this.serializer,e.document,!1):ue.newNoDocument(this.$s(e.metadata.name),this.Ks(e.metadata.readTime))}Ks(e){return Ae(e)}}class rC{constructor(e,t){this.Ua=e,this.serializer=t,this.Ka=[],this.Wa=[],this.collectionGroups=new Set,this.progress=z_(e)}get queries(){return this.Ka}get documents(){return this.Wa}Ga(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.Qa.namedQuery)this.Ka.push(e.Qa.namedQuery);else if(e.Qa.documentMetadata){this.Wa.push({metadata:e.Qa.documentMetadata}),e.Qa.documentMetadata.exists||++t;const n=X.fromString(e.Qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else e.Qa.document&&(this.Wa[this.Wa.length-1].document=e.Qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,{...this.progress}):null}za(e){const t=new Map,n=new tm(this.serializer);for(const i of e)if(i.metadata.queries){const s=n.$s(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||H()).add(s);t.set(o,c)}}return t}async ja(e){const t=await CP(e,new tm(this.serializer),this.Wa,this.Ua.id),n=this.za(this.documents);for(const i of this.Ka)await kP(e,i,n.get(i.name));return this.progress.taskState="Success",{progress:this.progress,Ja:this.collectionGroups,Ha:t}}}function z_(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
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
 */class j_{constructor(e){this.key=e}}class G_{constructor(e){this.key=e}}class W_{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=H(),this.mutatedKeys=H(),this.eu=My(e),this.tu=new ni(this.eu)}get nu(){return this.Ya}ru(e,t){const n=t?t.iu:new Xp,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const l=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,u=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((d,p)=>{const g=i.get(d),E=Io(this.query,p)?p:null,k=!!g&&this.mutatedKeys.has(g.key),D=!!E&&(E.hasLocalMutations||this.mutatedKeys.has(E.key)&&E.hasCommittedMutations);let T=!1;g&&E?g.data.isEqual(E.data)?k!==D&&(n.track({type:3,doc:E}),T=!0):this.su(g,E)||(n.track({type:2,doc:E}),T=!0,(l&&this.eu(E,l)>0||u&&this.eu(E,u)<0)&&(c=!0)):!g&&E?(n.track({type:0,doc:E}),T=!0):g&&!E&&(n.track({type:1,doc:g}),T=!0,(l||u)&&(c=!0)),T&&(E?(o=o.add(E),s=D?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),n.track({type:1,doc:d})}return{tu:o,iu:n,Cs:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((d,p)=>function(E,k){const D=T=>{switch(T){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return q(20277,{Rt:T})}};return D(E)-D(k)}(d.type,p.type)||this.eu(d.doc,p.doc)),this.ou(n),i=i??!1;const c=t&&!i?this._u():[],l=this.Xa.size===0&&this.current&&!i?1:0,u=l!==this.Za;return this.Za=l,o.length!==0||u?{snapshot:new vi(this.query,e.tu,s,o,e.mutatedKeys,l===0,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Xp,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=H(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))});const t=[];return e.forEach(n=>{this.Xa.has(n)||t.push(new G_(n))}),this.Xa.forEach(n=>{e.has(n)||t.push(new j_(n))}),t}cu(e){this.Ya=e.Qs,this.Xa=H();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return vi.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const Kn="SyncEngine";class iC{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class sC{constructor(e){this.key=e,this.hu=!1}}class oC{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new en(c=>Vy(c),wo),this.Iu=new Map,this.Eu=new Set,this.du=new ce(L.comparator),this.Au=new Map,this.Ru=new mh,this.Vu={},this.mu=new Map,this.fu=vr.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function aC(r,e,t=!0){const n=mc(r);let i;const s=n.Tu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await H_(n,e,t,!0),i}async function cC(r,e){const t=mc(r);await H_(t,e,!0,!1)}async function H_(r,e,t,n){const i=await wi(r.localStore,et(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await Dh(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&pc(r.remoteStore,i),c}async function Dh(r,e,t,n,i){r.pu=(p,g,E)=>async function(D,T,V,M){let B=T.view.ru(V);B.Cs&&(B=await Va(D.localStore,T.query,!1).then(({documents:I})=>T.view.ru(I,B)));const j=M&&M.targetChanges.get(T.targetId),Q=M&&M.targetMismatches.get(T.targetId)!=null,W=T.view.applyChanges(B,D.isPrimaryClient,j,Q);return su(D,T.targetId,W.au),W.snapshot}(r,p,g,E);const s=await Va(r.localStore,e,!0),o=new W_(e,s.Qs),c=o.ru(s.documents),l=To.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),u=o.applyChanges(c,r.isPrimaryClient,l);su(r,t,u.au);const d=new iC(e,t,o);return r.Tu.set(e,d),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),u.snapshot}async function lC(r,e,t){const n=U(r),i=n.Tu.get(e),s=n.Iu.get(i.targetId);if(s.length>1)return n.Iu.set(i.targetId,s.filter(o=>!wo(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await Ii(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&Ei(n.remoteStore,i.targetId),Ti(n,i.targetId)}).catch(Un)):(Ti(n,i.targetId),await Ii(n.localStore,i.targetId,!0))}async function uC(r,e){const t=U(r),n=t.Tu.get(e),i=t.Iu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),Ei(t.remoteStore,n.targetId))}async function hC(r,e,t){const n=Oh(r);try{const i=await function(o,c){const l=U(o),u=re.now(),d=c.reduce((E,k)=>E.add(k.key),H());let p,g;return l.persistence.runTransaction("Locally write mutations","readwrite",E=>{let k=at(),D=H();return l.Ns.getEntries(E,d).next(T=>{k=T,k.forEach((V,M)=>{M.isValidDocument()||(D=D.add(V))})}).next(()=>l.localDocuments.getOverlayedDocuments(E,k)).next(T=>{p=T;const V=[];for(const M of c){const B=NR(M,p.get(M.key).overlayedDocument);B!=null&&V.push(new tn(M.key,B,Ay(B.value.mapValue),ge.exists(!0)))}return l.mutationQueue.addMutationBatch(E,u,V,c)}).next(T=>{g=T;const V=T.applyToLocalDocumentSet(p,D);return l.documentOverlayCache.saveOverlays(E,T.batchId,V)})}).then(()=>({batchId:g.batchId,changes:Fy(p)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(o,c,l){let u=o.Vu[o.currentUser.toKey()];u||(u=new ce(G)),u=u.insert(c,l),o.Vu[o.currentUser.toKey()]=u}(n,i.batchId,t),await nn(n,i.changes),await Li(n.remoteStore)}catch(i){const s=Ui(i,"Failed to persist write");t.reject(s)}}async function Q_(r,e){const t=U(r);try{const n=await RP(t.localStore,e);e.targetChanges.forEach((i,s)=>{const o=t.Au.get(s);o&&($(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?$(o.hu,14607):i.removedDocuments.size>0&&($(o.hu,42227),o.hu=!1))}),await nn(t,n,e)}catch(n){await Un(n)}}function nm(r,e,t){const n=U(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Tu.forEach((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)}),function(o,c){const l=U(o);l.onlineState=c;let u=!1;l.queries.forEach((d,p)=>{for(const g of p.Sa)g.va(c)&&(u=!0)}),u&&Ch(l)}(n.eventManager,e),i.length&&n.Pu.H_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function dC(r,e,t){const n=U(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Au.get(e),s=i&&i.key;if(s){let o=new ce(L.comparator);o=o.insert(s,ue.newNoDocument(s,K.min()));const c=H().add(s),l=new vo(K.min(),new Map,new ce(G),o,c);await Q_(n,l),n.du=n.du.remove(s),n.Au.delete(e),Vh(n)}else await Ii(n.localStore,e,!1).then(()=>Ti(n,e,t)).catch(Un)}async function fC(r,e){const t=U(r),n=e.batch.batchId;try{const i=await SP(t.localStore,e);Nh(t,n,null),xh(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await nn(t,i)}catch(i){await Un(i)}}async function pC(r,e,t){const n=U(r);try{const i=await function(o,c){const l=U(o);return l.persistence.runTransaction("Reject batch","readwrite-primary",u=>{let d;return l.mutationQueue.lookupMutationBatch(u,c).next(p=>($(p!==null,37113),d=p.keys(),l.mutationQueue.removeMutationBatch(u,p))).next(()=>l.mutationQueue.performConsistencyCheck(u)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(u,d,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(u,d)).next(()=>l.localDocuments.getDocuments(u,d))})}(n.localStore,e);Nh(n,e,t),xh(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await nn(n,i)}catch(i){await Un(i)}}async function mC(r,e){const t=U(r);$n(t.remoteStore)||N(Kn,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const c=U(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",l=>c.mutationQueue.getHighestUnacknowledgedBatchId(l))}(t.localStore);if(n===Tn)return void e.resolve();const i=t.mu.get(n)||[];i.push(e),t.mu.set(n,i)}catch(n){const i=Ui(n,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function xh(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Nh(r,e,t){const n=U(r);let i=n.Vu[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Vu[n.currentUser.toKey()]=i}}function Ti(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Ru.jr(e).forEach(n=>{r.Ru.containsKey(n)||Y_(r,n)})}function Y_(r,e){r.Eu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(Ei(r.remoteStore,t),r.du=r.du.remove(e),r.Au.delete(t),Vh(r))}function su(r,e,t){for(const n of t)n instanceof j_?(r.Ru.addReference(n.key,e),gC(r,n)):n instanceof G_?(N(Kn,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,e),r.Ru.containsKey(n.key)||Y_(r,n.key)):q(19791,{wu:n})}function gC(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Eu.has(n)||(N(Kn,"New document in limbo: "+t),r.Eu.add(n),Vh(r))}function Vh(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new L(X.fromString(e)),n=r.fu.next();r.Au.set(n,new sC(t)),r.du=r.du.insert(t,n),pc(r.remoteStore,new Kt(et(Ni(t.path)),n,"TargetPurposeLimboResolution",st.ce))}}async function nn(r,e,t){const n=U(r),i=[],s=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((c,l)=>{o.push(n.pu(l,e,t).then(u=>{var d;if((u||t)&&n.isPrimaryClient){const p=u?!u.fromCache:(d=t==null?void 0:t.targetChanges.get(l.targetId))==null?void 0:d.current;n.sharedClientState.updateQueryState(l.targetId,p?"current":"not-current")}if(u){i.push(u);const p=wh.As(l.targetId,u);s.push(p)}}))}),await Promise.all(o),n.Pu.H_(i),await async function(l,u){const d=U(l);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>A.forEach(u,g=>A.forEach(g.Es,E=>d.persistence.referenceDelegate.addReference(p,g.targetId,E)).next(()=>A.forEach(g.ds,E=>d.persistence.referenceDelegate.removeReference(p,g.targetId,E)))))}catch(p){if(!Bn(p))throw p;N(Ih,"Failed to update sequence numbers: "+p)}for(const p of u){const g=p.targetId;if(!p.fromCache){const E=d.Ms.get(g),k=E.snapshotVersion,D=E.withLastLimboFreeSnapshotVersion(k);d.Ms=d.Ms.insert(g,D)}}}(n.localStore,s))}async function yC(r,e){const t=U(r);if(!t.currentUser.isEqual(e)){N(Kn,"User change. New user:",e.toKey());const n=await R_(t.localStore,e);t.currentUser=e,function(s,o){s.mu.forEach(c=>{c.forEach(l=>{l.reject(new x(P.CANCELLED,o))})}),s.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await nn(t,n.Ls)}}function _C(r,e){const t=U(r),n=t.Au.get(e);if(n&&n.hu)return H().add(n.key);{let i=H();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function wC(r,e){const t=U(r),n=await Va(t.localStore,e.query,!0),i=e.view.cu(n);return t.isPrimaryClient&&su(t,e.targetId,i.au),i}async function IC(r,e){const t=U(r);return D_(t.localStore,e).then(n=>nn(t,n))}async function EC(r,e,t,n){const i=U(r),s=await function(c,l){const u=U(c),d=U(u.mutationQueue);return u.persistence.runTransaction("Lookup mutation documents","readonly",p=>d.er(p,l).next(g=>g?u.localDocuments.getDocuments(p,g):A.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await Li(i.remoteStore):t==="acknowledged"||t==="rejected"?(Nh(i,e,n||null),xh(i,e),function(c,l){U(U(c).mutationQueue).ir(l)}(i.localStore,e)):q(6720,"Unknown batchState",{Su:t}),await nn(i,s)):N(Kn,"Cannot apply mutation batch with id: "+e)}async function vC(r,e){const t=U(r);if(mc(t),Oh(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await rm(t,n.toArray());t.gu=!0,await ru(t.remoteStore,!0);for(const s of i)pc(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const n=[];let i=Promise.resolve();t.Iu.forEach((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):i=i.then(()=>(Ti(t,o),Ii(t.localStore,o,!0))),Ei(t.remoteStore,o)}),await i,await rm(t,n),function(o){const c=U(o);c.Au.forEach((l,u)=>{Ei(c.remoteStore,u)}),c.Ru.Jr(),c.Au=new Map,c.du=new ce(L.comparator)}(t),t.gu=!1,await ru(t.remoteStore,!1)}}async function rm(r,e,t){const n=U(r),i=[],s=[];for(const o of e){let c;const l=n.Iu.get(o);if(l&&l.length!==0){c=await wi(n.localStore,et(l[0]));for(const u of l){const d=n.Tu.get(u),p=await wC(n,d);p.snapshot&&s.push(p.snapshot)}}else{const u=await k_(n.localStore,o);c=await wi(n.localStore,u),await Dh(n,J_(u),o,!1,c.resumeToken)}i.push(c)}return n.Pu.H_(s),i}function J_(r){return Ny(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function TC(r){return function(t){return U(U(t).persistence).Ts()}(U(r).localStore)}async function bC(r,e,t,n){const i=U(r);if(i.gu)return void N(Kn,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await D_(i.localStore,Oy(s[0])),c=vo.createSynthesizedRemoteEventForCurrentChange(e,t==="current",Ee.EMPTY_BYTE_STRING);await nn(i,o,c);break}case"rejected":await Ii(i.localStore,e,!0),Ti(i,e,n);break;default:q(64155,t)}}async function AC(r,e,t){const n=mc(r);if(n.gu){for(const i of e){if(n.Iu.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){N(Kn,"Adding an already active target "+i);continue}const s=await k_(n.localStore,i),o=await wi(n.localStore,s);await Dh(n,J_(s),o.targetId,!1,o.resumeToken),pc(n.remoteStore,o)}for(const i of t)n.Iu.has(i)&&await Ii(n.localStore,i,!1).then(()=>{Ei(n.remoteStore,i),Ti(n,i)}).catch(Un)}}function mc(r){const e=U(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=Q_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=_C.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=dC.bind(null,e),e.Pu.H_=eC.bind(null,e.eventManager),e.Pu.yu=tC.bind(null,e.eventManager),e}function Oh(r){const e=U(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=fC.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=pC.bind(null,e),e}function SC(r,e,t){const n=U(r);(async function(s,o,c){try{const l=await o.getMetadata();if(await function(E,k){const D=U(E),T=Ae(k.createTime);return D.persistence.runTransaction("hasNewerBundle","readonly",V=>D.Ii.getBundleMetadata(V,k.id)).then(V=>!!V&&V.createTime.compareTo(T)>=0)}(s.localStore,l))return await o.close(),c._completeWith(function(E){return{taskState:"Success",documentsLoaded:E.totalDocuments,bytesLoaded:E.totalBytes,totalDocuments:E.totalDocuments,totalBytes:E.totalBytes}}(l)),Promise.resolve(new Set);c._updateProgress(z_(l));const u=new rC(l,o.serializer);let d=await o.bu();for(;d;){const g=await u.Ga(d);g&&c._updateProgress(g),d=await o.bu()}const p=await u.ja(s.localStore);return await nn(s,p.Ha,void 0),await function(E,k){const D=U(E);return D.persistence.runTransaction("Save bundle","readwrite",T=>D.Ii.saveBundleMetadata(T,k))}(s.localStore,l),c._completeWith(p.progress),Promise.resolve(p.Ja)}catch(l){return Bt(Kn,`Loading bundle failed with ${l}`),c._failWith(l),Promise.resolve(new Set)}})(n,e,t).then(i=>{n.sharedClientState.notifyBundleLoaded(i)})}class Xs{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=bo(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return S_(this.persistence,new A_,e.initialUser,this.serializer)}Cu(e){return new gh(fc.mi,this.serializer)}Du(e){return new M_}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Xs.provider={build:()=>new Xs};class RC extends Xs{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){$(this.persistence.referenceDelegate instanceof Na,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new w_(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?Ke.withCacheSize(this.cacheSizeBytes):Ke.DEFAULT;return new gh(n=>Na.mi(n,t),this.serializer)}}class X_ extends Xs{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Oh(this.xu.syncEngine),await Li(this.xu.remoteStore),await this.persistence.Ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return S_(this.persistence,new A_,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new w_(n,e.asyncQueue,t)}Mu(e,t){const n=new MS(t,this.persistence);return new OS(e.asyncQueue,n)}Cu(e){const t=_h(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Ke.withCacheSize(this.cacheSizeBytes):Ke.DEFAULT;return new yh(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,L_(),fa(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new M_}}class PC extends X_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Il&&(this.sharedClientState.syncEngine={Co:EC.bind(null,t),vo:bC.bind(null,t),Fo:AC.bind(null,t),Ts:TC.bind(null,t),Do:IC.bind(null,t)},await this.sharedClientState.start()),await this.persistence.Ji(async n=>{await vC(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=L_();if(!Il.v(t))throw new x(P.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=_h(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Il(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class Zs{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>nm(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=yC.bind(null,this.syncEngine),await ru(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new ZP}()}createDatastore(e){const t=bo(e.databaseInfo.databaseId),n=function(s){return new OP(s)}(e.databaseInfo);return function(s,o,c,l){return new UP(s,o,c,l)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,o,c){return new qP(n,i,s,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>nm(this.syncEngine,t,0),function(){return Qp.v()?new Qp:new DP}())}createSyncEngine(e,t){return function(i,s,o,c,l,u,d){const p=new oC(i,s,o,c,l,u);return d&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=U(i);N(Tr,"RemoteStore shutting down."),s.Ea.add(5),await Mi(s),s.Aa.shutdown(),s.Ra.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}Zs.provider={build:()=>new Zs};function im(r,e=10240){let t=0;return{async read(){if(t<r.byteLength){const n={value:r.slice(t,t+e),done:!1};return t+=e,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class gc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):be("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class CC{constructor(e,t){this.Bu=e,this.serializer=t,this.metadata=new Ue,this.buffer=new Uint8Array,this.Lu=function(){return new TextDecoder("utf-8")}(),this.ku().then(n=>{n&&n.$a()?this.metadata.resolve(n.Qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n==null?void 0:n.Qa)}`))},n=>this.metadata.reject(n))}close(){return this.Bu.cancel()}async getMetadata(){return this.metadata.promise}async bu(){return await this.getMetadata(),this.ku()}async ku(){const e=await this.qu();if(e===null)return null;const t=this.Lu.decode(e),n=Number(t);isNaN(n)&&this.Qu(`length string (${t}) is not valid number`);const i=await this.$u(n);return new nC(JSON.parse(i),e.length+n)}Uu(){return this.buffer.findIndex(e=>e===123)}async qu(){for(;this.Uu()<0&&!await this.Ku(););if(this.buffer.length===0)return null;const e=this.Uu();e<0&&this.Qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async $u(e){for(;this.buffer.length<e;)await this.Ku()&&this.Qu("Reached the end of bundle when more is expected.");const t=this.Lu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}Qu(e){throw this.Bu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Ku(){const e=await this.Bu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
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
 */class kC{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new x(P.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(i,s){const o=U(i),c={documents:s.map(p=>Ys(o.serializer,p))},l=await o.Ho("BatchGetDocuments",o.serializer.databaseId,X.emptyPath(),c,s.length),u=new Map;l.forEach(p=>{const g=$R(o.serializer,p);u.set(g.key.toString(),g)});const d=[];return s.forEach(p=>{const g=u.get(p.toString());$(!!g,55234,{key:p}),d.push(g)}),d}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new Oi(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const i=L.fromPath(n);this.mutations.push(new oh(i,this.precondition(i)))}),await async function(n,i){const s=U(n),o={writes:i.map(c=>Js(s.serializer,c))};await s.Go("Commit",s.serializer.databaseId,X.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw q(50498,{Gu:e.constructor.name});t=K.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new x(P.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(K.min())?ge.exists(!1):ge.updateTime(t):ge.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(K.min()))throw new x(P.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return ge.updateTime(t)}return ge.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
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
 */class DC{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.zu=n.maxAttempts,this.M_=new vh(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Ju()}Ju(){this.M_.p_(async()=>{const e=new kC(this.datastore),t=this.Hu(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(i=>{this.Yu(i)}))}).catch(n=>{this.Yu(n)})})}Hu(e){try{const t=this.updateFunction(e);return!go(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e)}Zu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Hy(t)}return!1}}/**
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
 */const On="FirestoreClient";class xC{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=Oe.UNAUTHENTICATED,this.clientId=Gu.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async o=>{N(On,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(N(On,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new Ue;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Ui(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function vl(r,e){r.asyncQueue.verifyOperationInProgress(),N(On,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await R_(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function sm(r,e){r.asyncQueue.verifyOperationInProgress();const t=await Mh(r);N(On,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>Jp(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>Jp(e.remoteStore,i)),r._onlineComponents=e}async function Mh(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){N(On,"Using user provided OfflineComponentProvider");try{await vl(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===P.FAILED_PRECONDITION||i.code===P.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;Bt("Error using user provided cache. Falling back to memory cache: "+t),await vl(r,new Xs)}}else N(On,"Using default OfflineComponentProvider"),await vl(r,new RC(void 0));return r._offlineComponents}async function yc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(N(On,"Using user provided OnlineComponentProvider"),await sm(r,r._uninitializedComponentsProvider._online)):(N(On,"Using default OnlineComponentProvider"),await sm(r,new Zs))),r._onlineComponents}function Z_(r){return Mh(r).then(e=>e.persistence)}function Lh(r){return Mh(r).then(e=>e.localStore)}function ew(r){return yc(r).then(e=>e.remoteStore)}function Fh(r){return yc(r).then(e=>e.syncEngine)}function NC(r){return yc(r).then(e=>e.datastore)}async function bi(r){const e=await yc(r),t=e.eventManager;return t.onListen=aC.bind(null,e.syncEngine),t.onUnlisten=lC.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=cC.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=uC.bind(null,e.syncEngine),t}function VC(r){return r.asyncQueue.enqueue(async()=>{const e=await Z_(r),t=await ew(r);return e.setNetworkEnabled(!0),function(i){const s=U(i);return s.Ea.delete(0),Ao(s)}(t)})}function OC(r){return r.asyncQueue.enqueue(async()=>{const e=await Z_(r),t=await ew(r);return e.setNetworkEnabled(!1),async function(i){const s=U(i);s.Ea.add(0),await Mi(s),s.Ra.set("Offline")}(t)})}function MC(r,e){const t=new Ue;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await function(u,d){const p=U(u);return p.persistence.runTransaction("read document","readonly",g=>p.localDocuments.getDocument(g,d))}(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new x(P.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const l=Ui(c,`Failed to get document '${s} from cache`);o.reject(l)}}(await Lh(r),e,t)),t.promise}function tw(r,e,t={}){const n=new Ue;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new gc({next:g=>{d.Nu(),o.enqueueAndForget(()=>Ph(s,p));const E=g.docs.has(c);!E&&g.fromCache?u.reject(new x(P.UNAVAILABLE,"Failed to get document because the client is offline.")):E&&g.fromCache&&l&&l.source==="server"?u.reject(new x(P.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new kh(Ni(c.path),d,{includeMetadataChanges:!0,qa:!0});return Rh(s,p)}(await bi(r),r.asyncQueue,e,t,n)),n.promise}function LC(r,e){const t=new Ue;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await Va(i,s,!0),l=new W_(s,c.Qs),u=l.ru(c.documents),d=l.applyChanges(u,!1);o.resolve(d.snapshot)}catch(c){const l=Ui(c,`Failed to execute query '${s} against cache`);o.reject(l)}}(await Lh(r),e,t)),t.promise}function nw(r,e,t={}){const n=new Ue;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new gc({next:g=>{d.Nu(),o.enqueueAndForget(()=>Ph(s,p)),g.fromCache&&l.source==="server"?u.reject(new x(P.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new kh(c,d,{includeMetadataChanges:!0,qa:!0});return Rh(s,p)}(await bi(r),r.asyncQueue,e,t,n)),n.promise}function FC(r,e){const t=new gc(e);return r.asyncQueue.enqueueAndForget(async()=>function(i,s){U(i).Ca.add(s),s.next()}(await bi(r),t)),()=>{t.Nu(),r.asyncQueue.enqueueAndForget(async()=>function(i,s){U(i).Ca.delete(s)}(await bi(r),t))}}function UC(r,e,t,n){const i=function(o,c){let l;return l=typeof o=="string"?Yy().encode(o):o,function(d,p){return new CC(d,p)}(function(d,p){if(d instanceof Uint8Array)return im(d,p);if(d instanceof ArrayBuffer)return im(new Uint8Array(d),p);if(d instanceof ReadableStream)return d.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(l),c)}(t,bo(e));r.asyncQueue.enqueueAndForget(async()=>{SC(await Fh(r),i,n)})}function BC(r,e){return r.asyncQueue.enqueue(async()=>function(n,i){const s=U(n);return s.persistence.runTransaction("Get named query","readonly",o=>s.Ii.getNamedQuery(o,i))}(await Lh(r),e))}/**
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
 */function rw(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const om=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const iw="firestore.googleapis.com",am=!0;class cm{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new x(P.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=iw,this.ssl=am}else this.host=e.host,this.ssl=e.ssl??am;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=m_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<aP)throw new x(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Jg("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=rw(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new x(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new x(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new x(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class So{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new cm({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new x(P.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new x(P.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new cm(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new TS;switch(n.type){case"firstParty":return new RS(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new x(P.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=om.get(t);n&&(N("ComponentProvider","Removing Datastore"),om.delete(t),n.terminate())}(this),Promise.resolve()}}function qC(r,e,t,n={}){var u;r=ne(r,So);const i=Ri(e),s=r._getSettings(),o={...s,emulatorOptions:r._getEmulatorOptions()},c=`${e}:${t}`;i&&(Tm(`https://${c}`),bm("Firestore",!0)),s.host!==iw&&s.host!==c&&Bt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l={...s,host:c,ssl:i,emulatorOptions:n};if(!An(l,o)&&(r._setSettings(l),n.mockUserToken)){let d,p;if(typeof n.mockUserToken=="string")d=n.mockUserToken,p=Oe.MOCK_USER;else{d=BI(n.mockUserToken,(u=r._app)==null?void 0:u.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new x(P.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new Oe(g)}r._authCredentials=new bS(new Qg(d,p))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let tt=class sw{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new sw(this.firestore,e,this._query)}},ae=class _s{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new bn(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new _s(this.firestore,e,this._key)}toJSON(){return{type:_s._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(mo(t,_s._jsonSchema))return new _s(e,n||null,new L(X.fromString(t.referencePath)))}};ae._jsonSchemaVersion="firestore/documentReference/1.0",ae._jsonSchema={type:Ce("string",ae._jsonSchemaVersion),referencePath:Ce("string")};let bn=class ow extends tt{constructor(e,t,n){super(e,t,Ni(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ae(this.firestore,null,new L(e))}withConverter(e){return new ow(this.firestore,e,this._path)}};function aw(r,e,...t){if(r=z(r),Wu("collection","path",e),r instanceof So){const n=X.fromString(e,...t);return Yf(n),new bn(r,null,n)}{if(!(r instanceof ae||r instanceof bn))throw new x(P.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(X.fromString(e,...t));return Yf(n),new bn(r.firestore,null,n)}}function $C(r,e){if(r=ne(r,So),Wu("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new x(P.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new tt(r,null,function(n){return new Zt(X.emptyPath(),n)}(e))}function Fa(r,e,...t){if(r=z(r),arguments.length===1&&(e=Gu.newId()),Wu("doc","path",e),r instanceof So){const n=X.fromString(e,...t);return Qf(n),new ae(r,null,new L(n))}{if(!(r instanceof ae||r instanceof bn))throw new x(P.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(X.fromString(e,...t));return Qf(n),new ae(r.firestore,r instanceof bn?r.converter:null,new L(n))}}function cw(r,e){return r=z(r),e=z(e),(r instanceof ae||r instanceof bn)&&(e instanceof ae||e instanceof bn)&&r.firestore===e.firestore&&r.path===e.path&&r.converter===e.converter}function lw(r,e){return r=z(r),e=z(e),r instanceof tt&&e instanceof tt&&r.firestore===e.firestore&&wo(r._query,e._query)&&r.converter===e.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lm="AsyncQueue";class um{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new vh(this,"async_queue_retry"),this._c=()=>{const n=fa();n&&N(lm,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=fa();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=fa();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new Ue;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Bn(e))throw e;N(lm,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,be("INTERNAL UNHANDLED ERROR: ",hm(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=Sh.createAndSchedule(this,e,t,n,s=>this.hc(s));return this.tc.push(i),i}uc(){this.nc&&q(47125,{Pc:hm(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function hm(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
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
 */function ou(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class KC{constructor(){this._progressObserver={},this._taskCompletionResolver=new Ue,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,n){this._progressObserver={next:e,error:t,complete:n}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zC=-1;let Se=class extends So{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new um,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new um(e),this._firestoreClient=void 0,await e}}};function Ge(r){if(r._terminated)throw new x(P.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||uw(r),r._firestoreClient}function uw(r){var n,i,s;const e=r._freezeSettings(),t=function(c,l,u,d){return new hR(c,l,u,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,rw(d.experimentalLongPollingOptions),d.useFetchStreams,d.isUsingEmulator)}(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((s=e.localCache)!=null&&s._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new xC(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(c){const l=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(l),_online:l}}(r._componentsProvider))}function jC(r,e){Bt("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return hw(r,Zs.provider,{build:n=>new X_(n,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function GC(r){Bt("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();hw(r,Zs.provider,{build:t=>new PC(t,e.cacheSizeBytes)})}function hw(r,e,t){if((r=ne(r,Se))._firestoreClient||r._terminated)throw new x(P.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new x(P.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},uw(r)}function WC(r){if(r._initialized&&!r._terminated)throw new x(P.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new Ue;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!Ot.v())return Promise.resolve();const i=n+b_;await Ot.delete(i)}(_h(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}}),e.promise}function HC(r){return function(t){const n=new Ue;return t.asyncQueue.enqueueAndForget(async()=>mC(await Fh(t),n)),n.promise}(Ge(r=ne(r,Se)))}function QC(r){return VC(Ge(r=ne(r,Se)))}function YC(r){return OC(Ge(r=ne(r,Se)))}function JC(r,e){const t=Ge(r=ne(r,Se)),n=new KC;return UC(t,r._databaseId,e,n),n}function XC(r,e){return BC(Ge(r=ne(r,Se)),e).then(t=>t?new tt(r,null,t.query):null)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e){this._byteString=e}static fromBase64String(e){try{return new ze(Ee.fromBase64String(e))}catch(t){throw new x(P.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new ze(Ee.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:ze._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(mo(e,ze._jsonSchema))return ze.fromBase64String(e.bytes)}}ze._jsonSchemaVersion="firestore/bytes/1.0",ze._jsonSchema={type:Ce("string",ze._jsonSchemaVersion),bytes:Ce("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Mn=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new x(P.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new me(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Rr=class{constructor(e){this._methodName=e}};/**
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
 */class It{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new x(P.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new x(P.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return G(this._lat,e._lat)||G(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:It._jsonSchemaVersion}}static fromJSON(e){if(mo(e,It._jsonSchema))return new It(e.latitude,e.longitude)}}It._jsonSchemaVersion="firestore/geoPoint/1.0",It._jsonSchema={type:Ce("string",It._jsonSchemaVersion),latitude:Ce("number"),longitude:Ce("number")};/**
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
 */class Lt{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:Lt._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(mo(e,Lt._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new Lt(e.vectorValues);throw new x(P.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Lt._jsonSchemaVersion="firestore/vectorValue/1.0",Lt._jsonSchema={type:Ce("string",Lt._jsonSchemaVersion),vectorValues:Ce("object")};/**
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
 */const ZC=/^__.*__$/;class ek{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new tn(e,this.data,this.fieldMask,t,this.fieldTransforms):new Vi(e,this.data,t,this.fieldTransforms)}}class dw{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new tn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function fw(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw q(40011,{Ac:r})}}class _c{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Rc(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new _c({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.gc(e),n}yc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.Rc(),n}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Ua(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(fw(this.Ac)&&ZC.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class tk{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||bo(e)}Cc(e,t,n,i=!1){return new _c({Ac:e,methodName:t,Dc:n,path:me.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Pr(r){const e=r._freezeSettings(),t=bo(r._databaseId);return new tk(r._databaseId,!!e.ignoreUndefinedProperties,t)}function wc(r,e,t,n,i,s={}){const o=r.Cc(s.merge||s.mergeFields?2:0,e,t,i);jh("Data must be an object, but it was:",o,n);const c=gw(n,o);let l,u;if(s.merge)l=new ot(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const p of s.mergeFields){const g=au(e,p,t);if(!o.contains(g))throw new x(P.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);_w(d,g)||d.push(g)}l=new ot(d),u=o.fieldTransforms.filter(p=>l.covers(p.field))}else l=null,u=o.fieldTransforms;return new ek(new Fe(c),l,u)}class Ro extends Rr{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof Ro}}function pw(r,e,t){return new _c({Ac:3,Dc:e.settings.Dc,methodName:r._methodName,fc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class Uh extends Rr{_toFieldTransform(e){return new Eo(e.path,new gi)}isEqual(e){return e instanceof Uh}}class Bh extends Rr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=pw(this,e,!0),n=this.vc.map(s=>Cr(s,t)),i=new _r(n);return new Eo(e.path,i)}isEqual(e){return e instanceof Bh&&An(this.vc,e.vc)}}class qh extends Rr{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=pw(this,e,!0),n=this.vc.map(s=>Cr(s,t)),i=new wr(n);return new Eo(e.path,i)}isEqual(e){return e instanceof qh&&An(this.vc,e.vc)}}class $h extends Rr{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new yi(e.serializer,qy(e.serializer,this.Fc));return new Eo(e.path,t)}isEqual(e){return e instanceof $h&&this.Fc===e.Fc}}function Kh(r,e,t,n){const i=r.Cc(1,e,t);jh("Data must be an object, but it was:",i,n);const s=[],o=Fe.empty();qn(n,(l,u)=>{const d=Gh(e,l,t);u=z(u);const p=i.yc(d);if(u instanceof Ro)s.push(d);else{const g=Cr(u,p);g!=null&&(s.push(d),o.set(d,g))}});const c=new ot(s);return new dw(o,c,i.fieldTransforms)}function zh(r,e,t,n,i,s){const o=r.Cc(1,e,t),c=[au(e,n,t)],l=[i];if(s.length%2!=0)throw new x(P.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(au(e,s[g])),l.push(s[g+1]);const u=[],d=Fe.empty();for(let g=c.length-1;g>=0;--g)if(!_w(u,c[g])){const E=c[g];let k=l[g];k=z(k);const D=o.yc(E);if(k instanceof Ro)u.push(E);else{const T=Cr(k,D);T!=null&&(u.push(E),d.set(E,T))}}const p=new ot(u);return new dw(d,p,o.fieldTransforms)}function mw(r,e,t,n=!1){return Cr(t,r.Cc(n?4:3,e))}function Cr(r,e){if(yw(r=z(r)))return jh("Unsupported field value:",e,r),gw(r,e);if(r instanceof Rr)return function(n,i){if(!fw(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(n,i){const s=[];let o=0;for(const c of n){let l=Cr(c,i.wc(o));l==null&&(l={nullValue:"NULL_VALUE"}),s.push(l),o++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=z(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return qy(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=re.fromDate(n);return{timestampValue:_i(i.serializer,s)}}if(n instanceof re){const s=new re(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:_i(i.serializer,s)}}if(n instanceof It)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof ze)return{bytesValue:Zy(i.serializer,n._byteString)};if(n instanceof ae){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.Sc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:hh(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof Lt)return function(o,c){return{mapValue:{fields:{[eh]:{stringValue:th},[fi]:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw c.Sc("VectorValues must only contain numeric values.");return sh(c.serializer,u)})}}}}}}(n,i);throw i.Sc(`Unsupported field value: ${tc(n)}`)}(r,e)}function gw(r,e){const t={};return gy(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):qn(r,(n,i)=>{const s=Cr(i,e.mc(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function yw(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof re||r instanceof It||r instanceof ze||r instanceof ae||r instanceof Rr||r instanceof Lt)}function jh(r,e,t){if(!yw(t)||!Xg(t)){const n=tc(t);throw n==="an object"?e.Sc(r+" a custom object"):e.Sc(r+" "+n)}}function au(r,e,t){if((e=z(e))instanceof Mn)return e._internalPath;if(typeof e=="string")return Gh(r,e);throw Ua("Field path arguments must be of type string or ",r,!1,void 0,t)}const nk=new RegExp("[~\\*/\\[\\]]");function Gh(r,e,t){if(e.search(nk)>=0)throw Ua(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Mn(...e.split("."))._internalPath}catch{throw Ua(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ua(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(s||o)&&(l+=" (found",s&&(l+=` in field ${n}`),o&&(l+=` in document ${i}`),l+=")"),new x(P.INVALID_ARGUMENT,c+r+l)}function _w(r,e){return r.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new ae(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new rk(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(Ic("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class rk extends eo{data(){return super.data()}}function Ic(r,e){return typeof e=="string"?Gh(r,e):e instanceof Mn?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ww(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new x(P.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class Wh{}class Po extends Wh{}function mn(r,e,...t){let n=[];e instanceof Wh&&n.push(e),n=n.concat(t),function(s){const o=s.filter(l=>l instanceof Hh).length,c=s.filter(l=>l instanceof Ec).length;if(o>1||o>0&&c>0)throw new x(P.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class Ec extends Po{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new Ec(e,t,n)}_apply(e){const t=this._parse(e);return Ew(e._query,t),new tt(e.firestore,e.converter,Wl(e._query,t))}_parse(e){const t=Pr(e.firestore);return function(s,o,c,l,u,d,p){let g;if(u.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new x(P.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){fm(p,d);const k=[];for(const D of p)k.push(dm(l,s,D));g={arrayValue:{values:k}}}else g=dm(l,s,p)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||fm(p,d),g=mw(c,o,p,d==="in"||d==="not-in");return ee.create(u,d,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function ik(r,e,t){const n=e,i=Ic("where",r);return Ec._create(i,n,t)}class Hh extends Wh{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new Hh(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:ie.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(i,s){let o=i;const c=s.getFlattenedFilters();for(const l of c)Ew(o,l),o=Wl(o,l)}(e._query,t),new tt(e.firestore,e.converter,Wl(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class Qh extends Po{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new Qh(e,t)}_apply(e){const t=function(i,s,o){if(i.startAt!==null)throw new x(P.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new x(P.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Qs(s,o)}(e._query,this._field,this._direction);return new tt(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new Zt(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,t))}}function sk(r,e="asc"){const t=e,n=Ic("orderBy",r);return Qh._create(n,t)}class vc extends Po{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new vc(e,t,n)}_apply(e){return new tt(e.firestore,e.converter,Ca(e._query,this._limit,this._limitType))}}function ok(r){return Zg("limit",r),vc._create("limit",r,"F")}function ak(r){return Zg("limitToLast",r),vc._create("limitToLast",r,"L")}class Tc extends Po{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new Tc(e,t,n)}_apply(e){const t=Iw(e,this.type,this._docOrFields,this._inclusive);return new tt(e.firestore,e.converter,function(i,s){return new Zt(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(e._query,t))}}function ck(...r){return Tc._create("startAt",r,!0)}function lk(...r){return Tc._create("startAfter",r,!1)}class bc extends Po{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new bc(e,t,n)}_apply(e){const t=Iw(e,this.type,this._docOrFields,this._inclusive);return new tt(e.firestore,e.converter,function(i,s){return new Zt(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(e._query,t))}}function uk(...r){return bc._create("endBefore",r,!1)}function hk(...r){return bc._create("endAt",r,!0)}function Iw(r,e,t,n){if(t[0]=z(t[0]),t[0]instanceof eo)return function(s,o,c,l,u){if(!l)throw new x(P.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const p of ti(s))if(p.field.isKeyField())d.push(gr(o,l.key));else{const g=l.data.field(p.field);if(oc(g))throw new x(P.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const E=p.field.canonicalString();throw new x(P.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${E}' (used as the orderBy) does not exist.`)}d.push(g)}return new Nn(d,u)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const i=Pr(r.firestore);return function(o,c,l,u,d,p){const g=o.explicitOrderBy;if(d.length>g.length)throw new x(P.INVALID_ARGUMENT,`Too many arguments provided to ${u}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const E=[];for(let k=0;k<d.length;k++){const D=d[k];if(g[k].field.isKeyField()){if(typeof D!="string")throw new x(P.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${u}(), but got a ${typeof D}`);if(!rh(o)&&D.indexOf("/")!==-1)throw new x(P.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${u}() must be a plain document ID, but '${D}' contains a slash.`);const T=o.path.child(X.fromString(D));if(!L.isDocumentKey(T))throw new x(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${u}() must result in a valid document path, but '${T}' is not because it contains an odd number of segments.`);const V=new L(T);E.push(gr(c,V))}else{const T=mw(l,u,D);E.push(T)}}return new Nn(E,p)}(r._query,r.firestore._databaseId,i,e,t,n)}}function dm(r,e,t){if(typeof(t=z(t))=="string"){if(t==="")throw new x(P.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!rh(e)&&t.indexOf("/")!==-1)throw new x(P.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(X.fromString(t));if(!L.isDocumentKey(n))throw new x(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return gr(r,new L(n))}if(t instanceof ae)return gr(r,t._key);throw new x(P.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${tc(t)}.`)}function fm(r,e){if(!Array.isArray(r)||r.length===0)throw new x(P.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function Ew(r,e){const t=function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new x(P.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new x(P.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class Yh{convertValue(e,t="none"){switch(Dn(e)){case 0:return null;case 1:return e.booleanValue;case 2:return de(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Qt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw q(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return qn(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var n,i,s;const t=(s=(i=(n=e.fields)==null?void 0:n[fi].arrayValue)==null?void 0:i.values)==null?void 0:s.map(o=>de(o.doubleValue));return new Lt(t)}convertGeoPoint(e){return new It(de(e.latitude),de(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=ac(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(Gs(e));default:return null}}convertTimestamp(e){const t=Ht(e);return new re(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=X.fromString(e);$(u_(n),9688,{name:e});const i=new kn(n.get(1),n.get(3)),s=new L(n.popFirst(5));return i.isEqual(t)||be(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ac(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class dk extends Yh{constructor(e){super(),this.firestore=e}convertBytes(e){return new ze(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ae(this.firestore,null,t)}}class cr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}let mt=class vw extends eo{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Ns(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(Ic("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new x(P.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=vw._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}};mt._jsonSchemaVersion="firestore/documentSnapshot/1.0",mt._jsonSchema={type:Ce("string",mt._jsonSchemaVersion),bundleSource:Ce("string","DocumentSnapshot"),bundleName:Ce("string"),bundle:Ce("string")};let Ns=class extends mt{data(e={}){return super.data(e)}},Et=class Tw{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new cr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new Ns(this._firestore,this._userDataWriter,n.key,n,new cr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new x(P.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(c=>{const l=new Ns(i._firestore,i._userDataWriter,c.doc.key,c.doc,new cr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(c=>s||c.type!==3).map(c=>{const l=new Ns(i._firestore,i._userDataWriter,c.doc.key,c.doc,new cr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let u=-1,d=-1;return c.type!==0&&(u=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:fk(c.type),doc:l,oldIndex:u,newIndex:d}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new x(P.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Tw._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Gu.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach(s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}};function fk(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return q(61501,{type:r})}}function bw(r,e){return r instanceof mt&&e instanceof mt?r._firestore===e._firestore&&r._key.isEqual(e._key)&&(r._document===null?e._document===null:r._document.isEqual(e._document))&&r._converter===e._converter:r instanceof Et&&e instanceof Et&&r._firestore===e._firestore&&lw(r.query,e.query)&&r.metadata.isEqual(e.metadata)&&r._snapshot.isEqual(e._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pk(r){r=ne(r,ae);const e=ne(r.firestore,Se);return tw(Ge(e),r._key).then(t=>Jh(e,r,t))}Et._jsonSchemaVersion="firestore/querySnapshot/1.0",Et._jsonSchema={type:Ce("string",Et._jsonSchemaVersion),bundleSource:Ce("string","QuerySnapshot"),bundleName:Ce("string"),bundle:Ce("string")};class kr extends Yh{constructor(e){super(),this.firestore=e}convertBytes(e){return new ze(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ae(this.firestore,null,t)}}function mk(r){r=ne(r,ae);const e=ne(r.firestore,Se),t=Ge(e),n=new kr(e);return MC(t,r._key).then(i=>new mt(e,n,r._key,i,new cr(i!==null&&i.hasLocalMutations,!0),r.converter))}function gk(r){r=ne(r,ae);const e=ne(r.firestore,Se);return tw(Ge(e),r._key,{source:"server"}).then(t=>Jh(e,r,t))}function yk(r){r=ne(r,tt);const e=ne(r.firestore,Se),t=Ge(e),n=new kr(e);return ww(r._query),nw(t,r._query).then(i=>new Et(e,n,r,i))}function _k(r){r=ne(r,tt);const e=ne(r.firestore,Se),t=Ge(e),n=new kr(e);return LC(t,r._query).then(i=>new Et(e,n,r,i))}function wk(r){r=ne(r,tt);const e=ne(r.firestore,Se),t=Ge(e),n=new kr(e);return nw(t,r._query,{source:"server"}).then(i=>new Et(e,n,r,i))}function pm(r,e,t){r=ne(r,ae);const n=ne(r.firestore,Se),i=Ac(r.converter,e,t);return Co(n,[wc(Pr(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,ge.none())])}function mm(r,e,t,...n){r=ne(r,ae);const i=ne(r.firestore,Se),s=Pr(i);let o;return o=typeof(e=z(e))=="string"||e instanceof Mn?zh(s,"updateDoc",r._key,e,t,n):Kh(s,"updateDoc",r._key,e),Co(i,[o.toMutation(r._key,ge.exists(!0))])}function Ik(r){return Co(ne(r.firestore,Se),[new Oi(r._key,ge.none())])}function Ek(r,e){const t=ne(r.firestore,Se),n=Fa(r),i=Ac(r.converter,e);return Co(t,[wc(Pr(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,ge.exists(!1))]).then(()=>n)}function Aw(r,...e){var l,u,d;r=z(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||ou(e[n])||(t=e[n++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(ou(e[n])){const p=e[n];e[n]=(l=p.next)==null?void 0:l.bind(p),e[n+1]=(u=p.error)==null?void 0:u.bind(p),e[n+2]=(d=p.complete)==null?void 0:d.bind(p)}let s,o,c;if(r instanceof ae)o=ne(r.firestore,Se),c=Ni(r._key.path),s={next:p=>{e[n]&&e[n](Jh(o,r,p))},error:e[n+1],complete:e[n+2]};else{const p=ne(r,tt);o=ne(p.firestore,Se),c=p._query;const g=new kr(o);s={next:E=>{e[n]&&e[n](new Et(o,g,p,E))},error:e[n+1],complete:e[n+2]},ww(r._query)}return function(g,E,k,D){const T=new gc(D),V=new kh(E,T,k);return g.asyncQueue.enqueueAndForget(async()=>Rh(await bi(g),V)),()=>{T.Nu(),g.asyncQueue.enqueueAndForget(async()=>Ph(await bi(g),V))}}(Ge(o),c,i,s)}function vk(r,e){return FC(Ge(r=ne(r,Se)),ou(e)?e:{next:e})}function Co(r,e){return function(n,i){const s=new Ue;return n.asyncQueue.enqueueAndForget(async()=>hC(await Fh(n),i,s)),s.promise}(Ge(r),e)}function Jh(r,e,t){const n=t.docs.get(e._key),i=new kr(r);return new mt(r,i,e._key,n,new cr(t.hasPendingWrites,t.fromCache),e.converter)}/**
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
 */const Tk={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let bk=class{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Pr(e)}set(e,t,n){this._verifyNotCommitted();const i=wn(e,this._firestore),s=Ac(i.converter,t,n),o=wc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,ge.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=wn(e,this._firestore);let o;return o=typeof(t=z(t))=="string"||t instanceof Mn?zh(this._dataReader,"WriteBatch.update",s._key,t,n,i):Kh(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,ge.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=wn(e,this._firestore);return this._mutations=this._mutations.concat(new Oi(t._key,ge.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new x(P.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}};function wn(r,e){if((r=z(r)).firestore!==e)throw new x(P.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ak{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Pr(e)}get(e){const t=wn(e,this._firestore),n=new dk(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return q(24041);const s=i[0];if(s.isFoundDocument())return new eo(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new eo(this._firestore,n,t._key,null,t.converter);throw q(18433,{doc:s})})}set(e,t,n){const i=wn(e,this._firestore),s=Ac(i.converter,t,n),o=wc(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=wn(e,this._firestore);let o;return o=typeof(t=z(t))=="string"||t instanceof Mn?zh(this._dataReader,"Transaction.update",s._key,t,n,i):Kh(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=wn(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Sk=class extends Ak{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=wn(e,this._firestore),n=new kr(this._firestore);return super.get(e).then(i=>new mt(this._firestore,n,t._key,i._document,new cr(!1,!1),t.converter))}};function Rk(r,e,t){r=ne(r,Se);const n={...Tk,...t};return function(s){if(s.maxAttempts<1)throw new x(P.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(s,o,c){const l=new Ue;return s.asyncQueue.enqueueAndForget(async()=>{const u=await NC(s);new DC(s.asyncQueue,u,c,o,l).ju()}),l.promise}(Ge(r),i=>e(new Sk(r,i)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pk(){return new Ro("deleteField")}function Ck(){return new Uh("serverTimestamp")}function kk(...r){return new Bh("arrayUnion",r)}function Dk(...r){return new qh("arrayRemove",r)}function xk(r){return new $h("increment",r)}(function(e,t=!0){(function(i){xi=i})(Ln),Pn(new Ft("firestore",(n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new Se(new AS(n.getProvider("auth-internal")),new PS(o,n.getProvider("app-check-internal")),function(u,d){if(!Object.prototype.hasOwnProperty.apply(u.options,["projectId"]))throw new x(P.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new kn(u.options.projectId,d)}(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c},"PUBLIC").setMultipleInstances(!0)),wt(jf,Gf,e),wt(jf,Gf,"esm2020")})();const Nk="@firebase/firestore-compat",Vk="0.4.3";/**
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
 */function Xh(r,e){if(e===void 0)return{merge:!1};if(e.mergeFields!==void 0&&e.merge!==void 0)throw new x("invalid-argument",`Invalid options passed to function ${r}(): You cannot specify both "merge" and "mergeFields".`);return e}/**
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
 */function gm(){if(typeof Uint8Array>"u")throw new x("unimplemented","Uint8Arrays are not available in this environment.")}function ym(){if(!lR())throw new x("unimplemented","Blobs are unavailable in Firestore in this environment.")}let Sw=class cu{constructor(e){this._delegate=e}static fromBase64String(e){return ym(),new cu(ze.fromBase64String(e))}static fromUint8Array(e){return gm(),new cu(ze.fromUint8Array(e))}toBase64(){return ym(),this._delegate.toBase64()}toUint8Array(){return gm(),this._delegate.toUint8Array()}isEqual(e){return this._delegate.isEqual(e._delegate)}toString(){return"Blob(base64: "+this.toBase64()+")"}};/**
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
 */function lu(r){return Ok(r,["next","error","complete"])}function Ok(r,e){if(typeof r!="object"||r===null)return!1;const t=r;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}/**
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
 */class Mk{enableIndexedDbPersistence(e,t){return jC(e._delegate,{forceOwnership:t})}enableMultiTabIndexedDbPersistence(e){return GC(e._delegate)}clearIndexedDbPersistence(e){return WC(e._delegate)}}class Rw{constructor(e,t,n){this._delegate=t,this._persistenceProvider=n,this.INTERNAL={delete:()=>this.terminate()},e instanceof kn||(this._appCompat=e)}get _databaseId(){return this._delegate._databaseId}settings(e){const t=this._delegate._getSettings();!e.merge&&t.host!==e.host&&Bt("You are overriding the original host. If you did not intend to override your settings, use {merge: true}."),e.merge&&(e={...t,...e},delete e.merge),this._delegate._setSettings(e)}useEmulator(e,t,n={}){qC(this._delegate,e,t,n)}enableNetwork(){return QC(this._delegate)}disableNetwork(){return YC(this._delegate)}enablePersistence(e){let t=!1,n=!1;return e&&(t=!!e.synchronizeTabs,n=!!e.experimentalForceOwningTab,Jg("synchronizeTabs",t,"experimentalForceOwningTab",n)),t?this._persistenceProvider.enableMultiTabIndexedDbPersistence(this):this._persistenceProvider.enableIndexedDbPersistence(this,n)}clearPersistence(){return this._persistenceProvider.clearIndexedDbPersistence(this)}terminate(){return this._appCompat&&(this._appCompat._removeServiceInstance("firestore-compat"),this._appCompat._removeServiceInstance("firestore")),this._delegate._delete()}waitForPendingWrites(){return HC(this._delegate)}onSnapshotsInSync(e){return vk(this._delegate,e)}get app(){if(!this._appCompat)throw new x("failed-precondition","Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._appCompat}collection(e){try{return new Ai(this,aw(this._delegate,e))}catch(t){throw Ye(t,"collection()","Firestore.collection()")}}doc(e){try{return new pt(this,Fa(this._delegate,e))}catch(t){throw Ye(t,"doc()","Firestore.doc()")}}collectionGroup(e){try{return new Qe(this,$C(this._delegate,e))}catch(t){throw Ye(t,"collectionGroup()","Firestore.collectionGroup()")}}runTransaction(e){return Rk(this._delegate,t=>e(new Pw(this,t)))}batch(){return Ge(this._delegate),new Cw(new bk(this._delegate,e=>Co(this._delegate,e)))}loadBundle(e){return JC(this._delegate,e)}namedQuery(e){return XC(this._delegate,e).then(t=>t?new Qe(this,t):null)}}class Sc extends Yh{constructor(e){super(),this.firestore=e}convertBytes(e){return new Sw(new ze(e))}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return pt.forKey(t,this.firestore,null)}}function Lk(r){ES(r)}class Pw{constructor(e,t){this._firestore=e,this._delegate=t,this._userDataWriter=new Sc(e)}get(e){const t=lr(e);return this._delegate.get(t).then(n=>new to(this._firestore,new mt(this._firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,t.converter)))}set(e,t,n){const i=lr(e);return n?(Xh("Transaction.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=lr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=lr(e);return this._delegate.delete(t),this}}class Cw{constructor(e){this._delegate=e}set(e,t,n){const i=lr(e);return n?(Xh("WriteBatch.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=lr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=lr(e);return this._delegate.delete(t),this}commit(){return this._delegate.commit()}}class br{constructor(e,t,n){this._firestore=e,this._userDataWriter=t,this._delegate=n}fromFirestore(e,t){const n=new Ns(this._firestore._delegate,this._userDataWriter,e._key,e._document,e.metadata,null);return this._delegate.fromFirestore(new no(this._firestore,n),t??{})}toFirestore(e,t){return t?this._delegate.toFirestore(e,t):this._delegate.toFirestore(e)}static getInstance(e,t){const n=br.INSTANCES;let i=n.get(e);i||(i=new WeakMap,n.set(e,i));let s=i.get(t);return s||(s=new br(e,new Sc(e),t),i.set(t,s)),s}}br.INSTANCES=new WeakMap;class pt{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Sc(e)}static forPath(e,t,n){if(e.length%2!==0)throw new x("invalid-argument",`Invalid document reference. Document references must have an even number of segments, but ${e.canonicalString()} has ${e.length}`);return new pt(t,new ae(t._delegate,n,new L(e)))}static forKey(e,t,n){return new pt(t,new ae(t._delegate,n,e))}get id(){return this._delegate.id}get parent(){return new Ai(this.firestore,this._delegate.parent)}get path(){return this._delegate.path}collection(e){try{return new Ai(this.firestore,aw(this._delegate,e))}catch(t){throw Ye(t,"collection()","DocumentReference.collection()")}}isEqual(e){return e=z(e),e instanceof ae?cw(this._delegate,e):!1}set(e,t){t=Xh("DocumentReference.set",t);try{return t?pm(this._delegate,e,t):pm(this._delegate,e)}catch(n){throw Ye(n,"setDoc()","DocumentReference.set()")}}update(e,t,...n){try{return arguments.length===1?mm(this._delegate,e):mm(this._delegate,e,t,...n)}catch(i){throw Ye(i,"updateDoc()","DocumentReference.update()")}}delete(){return Ik(this._delegate)}onSnapshot(...e){const t=kw(e),n=Dw(e,i=>new to(this.firestore,new mt(this.firestore._delegate,this._userDataWriter,i._key,i._document,i.metadata,this._delegate.converter)));return Aw(this._delegate,t,n)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=mk(this._delegate):(e==null?void 0:e.source)==="server"?t=gk(this._delegate):t=pk(this._delegate),t.then(n=>new to(this.firestore,new mt(this.firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,this._delegate.converter)))}withConverter(e){return new pt(this.firestore,e?this._delegate.withConverter(br.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function Ye(r,e,t){return r.message=r.message.replace(e,t),r}function kw(r){for(const e of r)if(typeof e=="object"&&!lu(e))return e;return{}}function Dw(r,e){var n,i;let t;return lu(r[0])?t=r[0]:lu(r[1])?t=r[1]:typeof r[0]=="function"?t={next:r[0],error:r[1],complete:r[2]}:t={next:r[1],error:r[2],complete:r[3]},{next:s=>{t.next&&t.next(e(s))},error:(n=t.error)==null?void 0:n.bind(t),complete:(i=t.complete)==null?void 0:i.bind(t)}}class to{constructor(e,t){this._firestore=e,this._delegate=t}get ref(){return new pt(this._firestore,this._delegate.ref)}get id(){return this._delegate.id}get metadata(){return this._delegate.metadata}get exists(){return this._delegate.exists()}data(e){return this._delegate.data(e)}get(e,t){return this._delegate.get(e,t)}isEqual(e){return bw(this._delegate,e._delegate)}}class no extends to{data(e){const t=this._delegate.data(e);return this._delegate._converter||vS(t!==void 0,"Document in a QueryDocumentSnapshot should exist"),t}}class Qe{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new Sc(e)}where(e,t,n){try{return new Qe(this.firestore,mn(this._delegate,ik(e,t,n)))}catch(i){throw Ye(i,/(orderBy|where)\(\)/,"Query.$1()")}}orderBy(e,t){try{return new Qe(this.firestore,mn(this._delegate,sk(e,t)))}catch(n){throw Ye(n,/(orderBy|where)\(\)/,"Query.$1()")}}limit(e){try{return new Qe(this.firestore,mn(this._delegate,ok(e)))}catch(t){throw Ye(t,"limit()","Query.limit()")}}limitToLast(e){try{return new Qe(this.firestore,mn(this._delegate,ak(e)))}catch(t){throw Ye(t,"limitToLast()","Query.limitToLast()")}}startAt(...e){try{return new Qe(this.firestore,mn(this._delegate,ck(...e)))}catch(t){throw Ye(t,"startAt()","Query.startAt()")}}startAfter(...e){try{return new Qe(this.firestore,mn(this._delegate,lk(...e)))}catch(t){throw Ye(t,"startAfter()","Query.startAfter()")}}endBefore(...e){try{return new Qe(this.firestore,mn(this._delegate,uk(...e)))}catch(t){throw Ye(t,"endBefore()","Query.endBefore()")}}endAt(...e){try{return new Qe(this.firestore,mn(this._delegate,hk(...e)))}catch(t){throw Ye(t,"endAt()","Query.endAt()")}}isEqual(e){return lw(this._delegate,e._delegate)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=_k(this._delegate):(e==null?void 0:e.source)==="server"?t=wk(this._delegate):t=yk(this._delegate),t.then(n=>new uu(this.firestore,new Et(this.firestore._delegate,this._userDataWriter,this._delegate,n._snapshot)))}onSnapshot(...e){const t=kw(e),n=Dw(e,i=>new uu(this.firestore,new Et(this.firestore._delegate,this._userDataWriter,this._delegate,i._snapshot)));return Aw(this._delegate,t,n)}withConverter(e){return new Qe(this.firestore,e?this._delegate.withConverter(br.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}class Fk{constructor(e,t){this._firestore=e,this._delegate=t}get type(){return this._delegate.type}get doc(){return new no(this._firestore,this._delegate.doc)}get oldIndex(){return this._delegate.oldIndex}get newIndex(){return this._delegate.newIndex}}class uu{constructor(e,t){this._firestore=e,this._delegate=t}get query(){return new Qe(this._firestore,this._delegate.query)}get metadata(){return this._delegate.metadata}get size(){return this._delegate.size}get empty(){return this._delegate.empty}get docs(){return this._delegate.docs.map(e=>new no(this._firestore,e))}docChanges(e){return this._delegate.docChanges(e).map(t=>new Fk(this._firestore,t))}forEach(e,t){this._delegate.forEach(n=>{e.call(t,new no(this._firestore,n))})}isEqual(e){return bw(this._delegate,e._delegate)}}class Ai extends Qe{constructor(e,t){super(e,t),this.firestore=e,this._delegate=t}get id(){return this._delegate.id}get path(){return this._delegate.path}get parent(){const e=this._delegate.parent;return e?new pt(this.firestore,e):null}doc(e){try{return e===void 0?new pt(this.firestore,Fa(this._delegate)):new pt(this.firestore,Fa(this._delegate,e))}catch(t){throw Ye(t,"doc()","CollectionReference.doc()")}}add(e){return Ek(this._delegate,e).then(t=>new pt(this.firestore,t))}isEqual(e){return cw(this._delegate,e._delegate)}withConverter(e){return new Ai(this.firestore,e?this._delegate.withConverter(br.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function lr(r){return ne(r,ae)}/**
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
 */class Zh{constructor(...e){this._delegate=new Mn(...e)}static documentId(){return new Zh(me.keyField().canonicalString())}isEqual(e){return e=z(e),e instanceof Mn?this._delegate._internalPath.isEqual(e._internalPath):!1}}/**
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
 */class sr{static serverTimestamp(){const e=Ck();return e._methodName="FieldValue.serverTimestamp",new sr(e)}static delete(){const e=Pk();return e._methodName="FieldValue.delete",new sr(e)}static arrayUnion(...e){const t=kk(...e);return t._methodName="FieldValue.arrayUnion",new sr(t)}static arrayRemove(...e){const t=Dk(...e);return t._methodName="FieldValue.arrayRemove",new sr(t)}static increment(e){const t=xk(e);return t._methodName="FieldValue.increment",new sr(t)}constructor(e){this._delegate=e}isEqual(e){return this._delegate.isEqual(e._delegate)}}/**
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
 */const Uk={Firestore:Rw,GeoPoint:It,Timestamp:re,Blob:Sw,Transaction:Pw,WriteBatch:Cw,DocumentReference:pt,DocumentSnapshot:to,Query:Qe,QueryDocumentSnapshot:no,QuerySnapshot:uu,CollectionReference:Ai,FieldPath:Zh,FieldValue:sr,setLogLevel:Lk,CACHE_SIZE_UNLIMITED:zC};function Bk(r,e){r.INTERNAL.registerComponent(new Ft("firestore-compat",t=>{const n=t.getProvider("app-compat").getImmediate(),i=t.getProvider("firestore").getImmediate();return e(n,i)},"PUBLIC").setServiceProps({...Uk}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qk(r){Bk(r,(e,t)=>new Rw(e,t,new Mk)),r.registerVersion(Nk,Vk)}qk(oo);class xw{constructor(){this.lastCheckTime=null,this.checkInterval=null,this.reconnectAttempts=0,this.maxReconnectAttempts=3}async diagnose(){const e={timestamp:new Date().toISOString(),checks:{},overallStatus:"unknown",recommendations:[]};return e.checks.configLoaded=this.checkConfigLoaded(),e.checks.initialized=this.checkInitialized(),e.checks.authenticated=await this.checkAuthentication(),e.checks.networkOnline=this.checkNetworkStatus(),e.checks.initialized.passed&&(e.checks.firestoreConnection=await this.checkFirestoreConnection()),e.checks.offlineQueue=this.checkOfflineQueue(),e.checks.collectionNames=this.checkCollectionNames(),e.overallStatus=this.determineOverallStatus(e.checks),e.recommendations=this.generateRecommendations(e.checks),this.lastCheckTime=Date.now(),e}checkConfigLoaded(){var t;const e=window.firebaseConfig&&typeof window.firebaseConfig.getDb=="function";return{passed:e,message:e?"Firebase 설정이 로드되었습니다.":"Firebase 설정을 찾을 수 없습니다.",details:{configExists:!!window.firebaseConfig,isEnabled:((t=window.firebaseConfig)==null?void 0:t.isEnabled())||!1}}}checkInitialized(){var n;const e=(n=window.firebaseConfig)==null?void 0:n.getDb(),t=!!e;return{passed:t,message:t?"Firebase가 초기화되었습니다.":"Firebase가 초기화되지 않았습니다.",details:{hasDb:!!e}}}async checkAuthentication(){var e;try{const t=(e=window.firebaseConfig)==null?void 0:e.getAuth();if(!t)return{passed:!1,message:"인증 객체를 찾을 수 없습니다.",details:{authExists:!1}};const n=t.currentUser,i=!!n;return{passed:!0,message:i?"인증되었습니다.":"익명 모드입니다.",details:{authenticated:i,userId:(n==null?void 0:n.uid)||null}}}catch(t){return{passed:!1,message:`인증 확인 실패: ${t.message}`,details:{error:t.message}}}}checkNetworkStatus(){var n;const e=navigator.onLine,t=window.networkStatus;return{passed:e,message:e?"온라인 상태입니다.":"오프라인 상태입니다.",details:{navigatorOnline:e,networkStatusOnline:t==null?void 0:t.isOnline,queueSize:((n=t==null?void 0:t.offlineQueue)==null?void 0:n.length)||0}}}async checkFirestoreConnection(){var e;try{const t=(e=window.firebaseConfig)==null?void 0:e.getDb();if(!t)return{passed:!1,message:"Firestore DB를 찾을 수 없습니다.",details:{}};const n=t.collection("_connection_test").limit(1).get(),i=new Promise((s,o)=>setTimeout(()=>o(new Error("Timeout")),5e3));return await Promise.race([n,i]),{passed:!0,message:"Firestore 연결이 정상입니다.",details:{connectionTest:"success"}}}catch(t){return{passed:!1,message:`Firestore 연결 실패: ${t.message}`,details:{error:t.message,code:t.code}}}}checkOfflineQueue(){var n,i;const e=window.networkStatus,t=((n=e==null?void 0:e.offlineQueue)==null?void 0:n.length)||0;return{passed:!0,message:t>0?`오프라인 큐에 ${t}개 작업이 대기 중입니다.`:"오프라인 큐가 비어있습니다.",details:{queueSize:t,queueItems:((i=e==null?void 0:e.getQueueStatus)==null?void 0:i.call(e))||null}}}checkCollectionNames(){const e=["soil","water","compost","heavyMetal","pesticide"],t=new Date().getFullYear(),n={};if(window.firestoreDb&&typeof window.firestoreDb.getCollectionName=="function")e.forEach(s=>{const o=window.firestoreDb.getCollectionName(s,t),c="test_";n[s]={actual:o,hasPrefix:o.startsWith(c),year:t}});else return{passed:!1,message:"firestoreDb 모듈을 찾을 수 없습니다.",details:{error:"Module not loaded"}};const i=Object.values(n).every(s=>s.hasPrefix);return{passed:i,message:i?"모든 컬렉션 이름이 올바릅니다.":"일부 컬렉션 이름에 test_ 접두사가 없습니다.",details:n}}determineOverallStatus(e){var i;return["configLoaded","initialized"].some(s=>{var o;return!((o=e[s])!=null&&o.passed)})?"error":(i=e.networkOnline)!=null&&i.passed?e.firestoreConnection&&!e.firestoreConnection.passed?"degraded":"healthy":"offline"}generateRecommendations(e){var n,i,s,o,c;const t=[];return(n=e.configLoaded)!=null&&n.passed||t.push({priority:"critical",message:"Firebase 설정 파일(firebase-auth.json)을 확인하세요.",action:"checkAuthFile"}),(i=e.initialized)!=null&&i.passed||t.push({priority:"critical",message:"Firebase 초기화 코드를 확인하세요.",action:"reinitialize"}),(s=e.networkOnline)!=null&&s.passed||t.push({priority:"warning",message:"인터넷 연결을 확인하세요. 오프라인 모드로 작동 중입니다.",action:"checkNetwork"}),e.firestoreConnection&&!e.firestoreConnection.passed&&t.push({priority:"warning",message:"Firestore 연결을 재시도하세요.",action:"reconnect"}),((c=(o=e.offlineQueue)==null?void 0:o.details)==null?void 0:c.queueSize)>0&&t.push({priority:"info",message:`${e.offlineQueue.details.queueSize}개의 작업이 동기화 대기 중입니다.`,action:"processQueue"}),t}async attemptAutoRecovery(){var t,n;console.log("[Firebase Diagnostics] 자동 복구 시작...");const e=await this.diagnose();if(e.overallStatus==="healthy")return console.log("[Firebase Diagnostics] 연결 상태 정상"),{success:!0,message:"연결 정상"};if(e.overallStatus==="offline")return console.log("[Firebase Diagnostics] 오프라인 상태 - 큐 사용 중"),{success:!1,message:"오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다.",canRetry:!0};if(!((t=e.checks.initialized)!=null&&t.passed))try{if(console.log("[Firebase Diagnostics] Firebase 재초기화 시도..."),(n=window.firebaseConfig)!=null&&n.init)return await window.firebaseConfig.init(),{success:!0,message:"Firebase 재초기화 성공"}}catch(i){console.error("[Firebase Diagnostics] 재초기화 실패:",i)}return{success:!1,message:"자동 복구 실패. 수동 확인이 필요합니다.",diagnosis:e}}startHealthCheck(e=6e4){this.checkInterval&&clearInterval(this.checkInterval),this.checkInterval=setInterval(async()=>{const t=await this.diagnose();t.overallStatus!=="healthy"&&(console.warn("[Firebase Diagnostics] 연결 문제 감지:",t),window.showToast&&showToast("Firebase 연결 문제가 감지되었습니다.","warning",{actionLabel:"진단",action:()=>this.showDiagnosticsUI()}))},e)}stopHealthCheck(){this.checkInterval&&(clearInterval(this.checkInterval),this.checkInterval=null)}showDiagnosticsUI(){this.diagnose().then(e=>{if(console.group("🔍 Firebase 진단 결과"),console.log("전체 상태:",e.overallStatus),console.log("검사 항목:",e.checks),console.log("권장 사항:",e.recommendations),console.groupEnd(),window.showToast){const t={healthy:"Firebase 연결 정상",offline:"오프라인 모드 (큐 사용 중)",degraded:"Firebase 연결 불안정",error:"Firebase 설정 오류"};showToast(t[e.overallStatus],e.overallStatus==="healthy"?"success":"warning")}})}}window.firebaseDiagnostics=new xw;typeof module<"u"&&module.exports&&(module.exports=xw);const Rc=["name","phone","address","birthDate","corpNumber","parcels","phoneNumber","farmAddress"],$k="2.0",Kk="AES-GCM",zk=256,jk=12,Gk=16,Nw=6e5,Wk="SHA-256",Ba=10;function ro(r){const e=new Uint8Array(r);let t="";for(let n=0;n<e.byteLength;n++)t+=String.fromCharCode(e[n]);return btoa(t)}function hu(r){const e=atob(r),t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t.buffer}function Vw(r){return new TextEncoder().encode(r)}async function Hk(r,e){const t=Vw(e),n=await crypto.subtle.digest("SHA-256",t),i=ro(n);return r+i}async function Qk(r,e,t=!1){const n=await crypto.subtle.importKey("raw",Vw(r),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:Nw,hash:Wk},n,{name:Kk,length:zk},t,["encrypt","decrypt"])}async function Yk(r,e,t,n=!1){t||(t=crypto.getRandomValues(new Uint8Array(Gk)).buffer);const i=await Hk(r,e);return{key:await Qk(i,t,n),salt:t}}async function Pc(r,e,t){if(!r||typeof r!="string")return null;const n=crypto.getRandomValues(new Uint8Array(jk)),i=new TextEncoder,s=i.encode(r),o={name:"AES-GCM",iv:n};t&&(o.additionalData=i.encode(t));const c=await crypto.subtle.encrypt(o,e,s);return{iv:ro(n.buffer),ct:ro(c)}}async function Cc(r,e,t,n){if(!r||!e)return null;const i=new Uint8Array(hu(r)),s=hu(e),o={name:"AES-GCM",iv:i};n&&(o.additionalData=new TextEncoder().encode(n));const c=await crypto.subtle.decrypt(o,t,s);return new TextDecoder().decode(c)}async function Ow(r,e){if(!r||!e)return r;const t={...r},n={v:"2.1"};let i=!1;for(const s of Rc){const o=r[s];if(o!=null&&o!=="")try{const c=typeof o=="string"?o:JSON.stringify(o),l=await Pc(c,e,s);l&&(n[s]=l,delete t[s],i=!0)}catch(c){console.warn(`[CryptoUtils] Failed to encrypt field "${s}":`,c)}}return i&&(t._enc=n),t}async function Mw(r,e){if(!r||!e||!r._enc)return r;const t={...r},n=r._enc,i=n.v==="2.1";for(const s of Rc){const o=n[s];if(o&&typeof o=="object"&&"iv"in o&&"ct"in o)try{const c=i?s:void 0,l=await Cc(o.iv,o.ct,e,c);if(l!==null)if(s==="parcels")try{t[s]=JSON.parse(l)}catch{t[s]=l}else t[s]=l}catch(c){console.warn(`[CryptoUtils] Failed to decrypt field "${s}":`,c),s==="parcels"?t[s]=[]:t[s]="[복호화 실패]"}}return delete t._enc,t}async function du(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Ba){const i=r.slice(n,n+Ba),s=await Promise.all(i.map(o=>Ow(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}async function Lw(r,e){if(!Array.isArray(r)||!e)return r;const t=new Array(r.length);for(let n=0;n<r.length;n+=Ba){const i=r.slice(n,n+Ba),s=await Promise.all(i.map(o=>Mw(o,e)));for(let o=0;o<s.length;o++)t[n+o]=s[o]}return t}function Jk(r){const e=r;return!!(e&&e._enc&&e._enc.v)}function Xk(){return[...Rc]}function Zk(r){const e=[];(!r||r.length<8)&&e.push("비밀번호는 8자 이상이어야 합니다"),r&&r.length>64&&e.push("비밀번호는 64자 이하여야 합니다"),/[a-z]/.test(r)||e.push("소문자를 1개 이상 포함해야 합니다"),/[0-9]/.test(r)||e.push("숫자를 1개 이상 포함해야 합니다"),/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(r)||e.push("특수문자를 1개 이상 포함해야 합니다");let t="약함";return e.length===0&&(t=r.length>=12?"강함":"보통"),{valid:e.length===0,strength:t,errors:e}}function e0(){const r=crypto.getRandomValues(new Uint8Array(32));return ro(r.buffer)}function t0(r){const e=r.replace(/[^a-zA-Z0-9\-_]/g,"");return`
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
        </div>`}function n0(r){const{prefix:e,input:t,confirmInput:n,submitBtn:i,submitColor:s="#4A90D9",extraCheck:o,verifyMode:c=!1}=r,l=document.getElementById(`${e}-strength-fill`),u=document.getElementById(`${e}-strength-text`),d=document.getElementById(`${e}-rule-length`),p=document.getElementById(`${e}-rule-lower`),g=document.getElementById(`${e}-rule-number`),E=document.getElementById(`${e}-rule-special`),k=document.getElementById(`${e}-rule-upper`);function D(V,M){V&&(V.style.color=M?"#16A34A":"#15803D",V.textContent=(M?"✓ ":"• ")+V.textContent.replace(/^[\u2713\u2022] /,""))}function T(){const V=t.value,M=V.length>=8&&V.length<=64,B=/[a-z]/.test(V),j=/[0-9]/.test(V),Q=/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(V),W=/[A-Z]/.test(V);D(d,M),D(p,B),D(g,j),D(E,Q),k&&(k.style.color=W?"#16A34A":"#9CA3AF",k.textContent=(W?"✓ ":"• ")+k.textContent.replace(/^[\u2713\u2022] /,""));const I=M&&B&&j&&Q;l&&u&&(V.length===0?(l.style.width="0",l.style.background="#E5E7EB",u.textContent="-",u.style.color="#9CA3AF"):I?c?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="입력 완료",u.style.color="#16A34A"):V.length>=12||V.length>=10&&W?(l.style.width="100%",l.style.background="linear-gradient(90deg, #22C55E, #16A34A)",u.textContent="강함",u.style.color="#16A34A"):(l.style.width="66%",l.style.background="linear-gradient(90deg, #F59E0B, #EAB308)",u.textContent="보통",u.style.color="#F59E0B"):(l.style.width="33%",l.style.background="#EF4444",u.textContent="요건 미충족",u.style.color="#EF4444"));let y=I;n&&(y=y&&V===n.value&&n.value.length>0),o&&(y=y&&o()),y?(i.disabled=!1,i.style.background=s,i.style.cursor="pointer"):(i.disabled=!0,i.style.background="#ccc",i.style.cursor="default")}return t.addEventListener("input",T),n&&n.addEventListener("input",T),{updateValidation:T}}async function r0(r,e){var n,i;const t=window;try{if((n=t.encryptionManager)!=null&&n.isReady()){const s=t.encryptionManager.getKey();if(s){const o=JSON.stringify(e),c=await Pc(o,s);if(c){const l={_localEnc:!0,iv:c.iv,ct:c.ct};localStorage.setItem(r,JSON.stringify(l));return}}}localStorage.setItem(r,JSON.stringify(e))}catch(s){if(console.error("[SecureStorage] 암호화 저장 실패:",s.message),(i=t.encryptionManager)!=null&&i.isReady())throw new Error("데이터 암호화에 실패하여 저장을 중단합니다: "+s.message);localStorage.setItem(r,JSON.stringify(e))}}async function i0(r){var n;const e=window,t=localStorage.getItem(r);if(!t)return null;try{const i=JSON.parse(t);if(i&&i._localEnc&&i.iv&&i.ct){if((n=e.encryptionManager)!=null&&n.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await Cc(o.iv,o.ct,s);if(c)return JSON.parse(c)}}return console.warn("[SecureStorage] 암호화된 데이터이나 키 미준비:",r),null}return i}catch(i){return console.error("[SecureStorage] 로드 실패:",r,i.message),null}}async function s0(r){var t;const e=window;if((t=e.encryptionManager)!=null&&t.isReady()){const n=e.encryptionManager.getKey();if(n){const i=typeof r=="string"?JSON.parse(r):r;if(i&&Array.isArray(i.data)){const c=i,l=await du(c.data,n),u={...c,_fileEnc:"2.1",data:l};return JSON.stringify(u,null,2)}if(Array.isArray(i)){const c=await du(i,n);return JSON.stringify(c,null,2)}const s=typeof r=="string"?r:JSON.stringify(r),o=await Pc(s,n);if(o){const c={_localEnc:!0,iv:o.iv,ct:o.ct};return JSON.stringify(c,null,2)}}}return typeof r=="string"?r:JSON.stringify(r,null,2)}async function o0(r){var t,n;const e=window;if(!r)return null;try{const i=JSON.parse(r);if(i&&i._fileEnc&&Array.isArray(i.data)){if((t=e.encryptionManager)!=null&&t.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await Lw(o.data,s),l={...o,data:c};return delete l._fileEnc,l}}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}if(i&&i._localEnc&&i.iv&&i.ct){if((n=e.encryptionManager)!=null&&n.isReady()){const s=e.encryptionManager.getKey();if(s){const o=i,c=await Cc(o.iv,o.ct,s);if(c)return JSON.parse(c)}}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}return i}catch(i){return console.error("[SecureStorage] 파일 복호화 실패:",i.message),null}}const a0={createMasterKey:Yk,generateKeyFileContent:e0,validatePassword:Zk,encrypt:Pc,decrypt:Cc,encryptRecord:Ow,decryptRecord:Mw,encryptRecords:du,decryptRecords:Lw,isEncrypted:Jk,getSensitiveFields:Xk,bufferToBase64:ro,base64ToBuffer:hu,createPasswordRulesHTML:t0,bindPasswordValidation:n0,saveToLocalStorage:r0,loadFromLocalStorage:i0,encryptForFile:s0,decryptFromFile:o0,SENSITIVE_FIELDS:Rc,ENCRYPTION_VERSION:$k,PBKDF2_ITERATIONS:Nw};window.CryptoUtils=a0;const Fw=Symbol("recover");let he=null,fe=null,Si=!1,it=!1,Qr=null,Je=null,Z=null,qa=!1,jt=null;const Uw="encryption_keyFile",Bw="encryption_salt",ed="encryption_recoveryBlob",td="encryption_sessionPw",fu='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',Yr='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',qr=3,c0=24,l0=6e5,u0=5*60*1e3,qw=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);function $w(){if(document.getElementById("enc-modal-dark-styles"))return;const r=document.createElement("style");r.id="enc-modal-dark-styles",r.textContent=`
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
    `,document.head.appendChild(r)}function h0(r,e){if(typeof r!="string"||typeof e!="string")return!1;const t=Math.max(r.length,e.length);let n=r.length^e.length;for(let i=0;i<t;i++)n|=(r.charCodeAt(i)||0)^(e.charCodeAt(i)||0);return n===0}function Kw(){var r;return(r=window.firestoreDb)!=null&&r.getCollectionName&&window.firestoreDb.getCollectionName("soil",2e3).startsWith("test_")?"test_":""}function Tt(){const r=Kw();return r?r+"system":"_system"}async function d0(r){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!0;const e=window.firebaseConfig.getDb();if(!e)return!0;const t=Tt(),n=e.collection(t).doc(`lock_${r}`);try{return await e.runTransaction(async o=>{const c=await o.get(n);if(c.exists){const l=c.data();if(Date.now()-new Date(l.lockedAt).getTime()<u0)return!1}return o.set(n,{lockedBy:qw,lockedAt:new Date().toISOString()}),!0})}catch(s){return console.warn(`[Encryption] Lock acquire failed (${r}):`,s.message),!0}}async function f0(r){var i;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Tt(),n=e.collection(t).doc(`lock_${r}`);try{await e.runTransaction(async s=>{const o=await s.get(n);o.exists&&o.data().lockedBy===qw&&s.delete(n)})}catch(s){console.warn(`[Encryption] Lock release failed (${r}):`,s.message)}}async function Yt(){var r,e,t,n,i,s;if((r=window.firebaseConfig)!=null&&r.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Tt(),l=Kw();try{const u=await o.collection(c).doc("encryptionKey").get();if(u.exists){const d=u.data();if(d.keyFileContent)return Je="firebase",console.log(`[Encryption] Key loaded from Firebase ${c}/encryptionKey`),d.keyFileContent}console.log(`[Encryption] ${c}/encryptionKey not found or empty`)}catch(u){console.warn(`[Encryption] Firebase ${c} read failed:`,u.message)}if(l){const u=l+"_system";try{console.log(`[Encryption] Trying fallback: ${u}/encryptionKey...`);const d=await o.collection(u).doc("encryptionKey").get();if(d.exists&&((e=d.data())!=null&&e.keyFileContent)){Je="firebase",console.log(`[Encryption] Key loaded from Firebase ${u} (fallback)`);try{await o.collection(c).doc("encryptionKey").set(d.data()),console.log(`[Encryption] Migrated encryptionKey: ${u} → ${c}`);const p=await o.collection(u).doc("recoveryBlob").get();p.exists&&(await o.collection(c).doc("recoveryBlob").set(p.data()),console.log(`[Encryption] Migrated recoveryBlob: ${u} → ${c}`))}catch(p){console.warn("[Encryption] Migration failed:",p.message)}return d.data().keyFileContent}}catch(d){console.warn(`[Encryption] ${u} fallback failed:`,d.message)}try{console.log("[Encryption] Trying fallback: _system/encryptionKey...");const d=await o.collection("_system").doc("encryptionKey").get();if(d.exists&&((t=d.data())!=null&&t.keyFileContent))return Je="firebase",console.log("[Encryption] Key loaded from Firebase _system (fallback)"),d.data().keyFileContent}catch(d){console.warn("[Encryption] _system fallback failed:",d.message)}}}}if((n=window.electronAPI)!=null&&n.isElectron){try{const o=await((s=(i=window.electronAPI).readKeyFile)==null?void 0:s.call(i));if(o)return Je="local",console.debug("[Encryption] Key loaded from local file"),o}catch(o){console.warn("[Encryption] Local key file not found:",o.message)}return null}try{const o=localStorage.getItem(Uw);if(o)return Je="local",console.log("[Encryption] Key loaded from localStorage"),o}catch(o){console.warn("[Encryption] localStorage key load failed:",o.message)}return null}async function p0(r){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return;const e=window.firebaseConfig.getDb();if(!e)return;const t=Tt();try{const s=await e.collection(t).doc("encryptionKey").get();if(s.exists&&((i=s.data())!=null&&i.keyFileContent)){console.log(`[Encryption] Firebase already has key in ${t} - skip sync`);return}await e.collection(t).doc("encryptionKey").set({keyFileContent:r,createdAt:new Date().toISOString(),version:"2.0",syncedFrom:"local"}),console.log(`[Encryption] Local key synced to Firebase ${t}/encryptionKey`)}catch(s){console.warn("[Encryption] Failed to sync key to Firebase:",s.message)}}function m0(r){setTimeout(async()=>{try{confirm(`[암호화 키 파일 백업 안내]

암호화 키가 새로 생성되었습니다.
키 파일을 USB 또는 안전한 곳에 백업해두면
다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.

지금 키 파일을 백업하시겠습니까?`)&&await zw()}catch(e){console.warn("[Encryption] Key backup prompt failed:",e.message)}},1e3)}async function g0(){var n,i,s;const r=window.CryptoUtils;if(!(r!=null&&r.generateKeyFileContent))return console.error("[Encryption] CryptoUtils.generateKeyFileContent not available"),null;const e=r.generateKeyFileContent();if(console.debug("[Encryption] New key file generated"),(n=window.firebaseConfig)!=null&&n.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Tt();try{return await o.collection(c).doc("encryptionKey").set({keyFileContent:e,createdAt:new Date().toISOString(),version:"2.0"}),console.log(`[Encryption] Key stored in Firebase ${c}/encryptionKey`),Je="generated",e}catch(l){console.error("[Encryption] Failed to store key in Firebase:",l.message)}}}if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0){if((s=window.electronAPI)!=null&&s.saveKeyFile)try{const o=await window.electronAPI.saveKeyFile(e);if(o!=null&&o.success)return console.log("[Encryption] Key stored in local file (safeStorage protected)"),Je="local",e}catch(o){console.error("[Encryption] Failed to store key locally:",o.message)}}else try{return localStorage.setItem(Uw,e),console.log("[Encryption] Key stored in localStorage"),Je="local",e}catch(o){console.warn("[Encryption] localStorage key save failed:",o.message)}return Je="generated",e}async function zw(){var t,n;let r=Z;if(r||(r=await Yt()),!r)return{success:!1,error:"활성화된 암호화 키가 없습니다."};if(((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&((n=window.electronAPI)!=null&&n.exportKeyFile)){const i=await window.electronAPI.exportKeyFile(r);return i!=null&&i.success?(console.log("[Encryption] Key file exported to:",i.filePath),window.showToast&&window.showToast("키 파일이 저장되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}):(i==null?void 0:i.error)==="canceled"?{success:!1,error:"취소됨"}:(console.error("[Encryption] Key export failed:",i==null?void 0:i.error),{success:!1,error:(i==null?void 0:i.error)||"내보내기 실패"})}try{const i=new Blob([r],{type:"text/plain"}),s=URL.createObjectURL(i),o=document.createElement("a");return o.href=s,o.download="sample-log.key",document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(s),window.showToast&&window.showToast("키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}}catch(i){return{success:!1,error:i.message}}}async function jw(){var t,n,i;const r=((t=window.electronAPI)==null?void 0:t.isElectron)===!0;let e=null;if(r&&((n=window.electronAPI)!=null&&n.importKeyFile)){const s=await window.electronAPI.importKeyFile();if(!(s!=null&&s.success))return(s==null?void 0:s.error)==="canceled"?{success:!1,error:"취소됨"}:{success:!1,error:(s==null?void 0:s.error)||"가져오기 실패"};e=s.content||null}else try{e=await new Promise((s,o)=>{const c=document.createElement("input");c.type="file",c.accept=".key",c.onchange=async l=>{var g;const d=(g=l.target.files)==null?void 0:g[0];if(!d){o(new Error("파일 선택 취소"));return}const p=await d.text();s(p.trim())},c.click()})}catch(s){return{success:!1,error:s.message}}if(!e||e.length<20||e.length>64)return{success:!1,error:"유효하지 않은 키 파일입니다. (길이 불일치)"};if(!/^[A-Za-z0-9+/=]+$/.test(e))return{success:!1,error:"유효하지 않은 키 파일입니다. (형식 오류)"};if(r&&((i=window.electronAPI)!=null&&i.saveKeyFile))try{const s=await window.electronAPI.saveKeyFile(e);if(!(s!=null&&s.success))return{success:!1,error:"키 파일 로컬 저장 실패"}}catch(s){return{success:!1,error:"로컬 저장 실패: "+s.message}}return Z=e,Je="local",console.log("[Encryption] Key file imported successfully"),window.showToast&&window.showToast("키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.","success"),{success:!0}}async function nd(){var e;const r=window.CryptoUtils;if((e=window.electronAPI)!=null&&e.loadSalt)try{const t=await window.electronAPI.loadSalt();if(t&&r)return console.log(`[Encryption] Salt loaded from Electron (${t.length} chars)`),r.base64ToBuffer(t)}catch(t){console.warn("[Encryption] Electron salt load failed:",t.message)}try{const t=localStorage.getItem(Bw);if(t&&r)return console.log(`[Encryption] Salt loaded from localStorage (${t.length} chars)`),r.base64ToBuffer(t)}catch(t){console.warn("[Encryption] localStorage salt load failed:",t.message)}return console.log("[Encryption] No saved salt found"),null}async function io(r){var n;const e=window.CryptoUtils;if(!e)return;const t=e.bufferToBase64(r);if((n=window.electronAPI)!=null&&n.saveSalt)try{await window.electronAPI.saveSalt(t),console.log("[Encryption] Salt saved to Electron");return}catch(i){console.warn("[Encryption] Electron salt save failed:",i.message)}try{localStorage.setItem(Bw,t),console.log("[Encryption] Salt saved to localStorage")}catch(i){console.warn("[Encryption] localStorage salt save failed:",i.message)}}async function rd(r){var e;if((e=window.electronAPI)!=null&&e.storeSessionPassword){await window.electronAPI.storeSessionPassword(r),console.log("[Encryption] Password stored in session (main process memory)");return}try{sessionStorage.setItem(td,r),console.log("[Encryption] Password stored in sessionStorage")}catch(t){console.warn("[Encryption] sessionStorage password store failed:",t.message)}}async function kc(){var r;if((r=window.electronAPI)!=null&&r.getSessionPassword){const e=await window.electronAPI.getSessionPassword();if(e)return console.log("[Encryption] Session password found in main process"),e}try{const e=sessionStorage.getItem(td);if(e)return console.log("[Encryption] Session password found in sessionStorage"),e}catch(e){console.warn("[Encryption] sessionStorage password read failed:",e.message)}return null}async function so(r){var t,n,i;const e=window.CryptoUtils;if(!((t=window.firebaseConfig)!=null&&t.isEnabled())||!window.firestoreDb)return console.log("[Encryption] Key verification skipped (no Firestore)"),{verified:!0,skipped:!0};try{const s=window.firebaseConfig.getDb();if(!s)return{verified:!0,skipped:!0};const o=["soil","water","compost","heavy-metal","pesticide"],c=new Date().getFullYear();let l=null;for(const k of o){const D=window.firestoreDb.getCollectionName(k,c);if((await s.collection(D).limit(5).get()).forEach(V=>{const M=V.data();M!=null&&M._enc&&!l&&(l=M)}),l)break}const u=l;if(!(u!=null&&u._enc))return console.log("[Encryption] Key verification: no encrypted documents found - skipping"),{verified:!0,skipped:!0};const d=u._enc,p=Object.keys(d).find(k=>k!=="v");if(!p||!((n=d[p])!=null&&n.iv)||!((i=d[p])!=null&&i.ct))return console.log("[Encryption] Key verification: no valid encrypted field found - skipping"),{verified:!0,skipped:!0};const g=d.v==="2.1";return console.log(`[Encryption] Key verification: testing decrypt of "${p}" (v${d.v||"1"}, AAD=${g})...`),e?await e.decrypt(d[p].iv,d[p].ct,r,g?p:void 0)!==null?(console.log("[Encryption] Key verification: SUCCESS"),{verified:!0,skipped:!1}):(console.warn("[Encryption] Key verification: decrypt returned null (wrong key)"),{verified:!1,skipped:!1}):{verified:!1,skipped:!1}}catch(s){return console.warn("[Encryption] Key verification FAILED:",s.message),{verified:!1,skipped:!1}}}function y0(){const r="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",e=256-256%r.length;let t="";for(;t.length<c0;){const n=crypto.getRandomValues(new Uint8Array(1));n[0]<e&&(t+=r[n[0]%r.length])}return t.match(/.{1,4}/g).join("-")}async function Gw(r,e){const t=r.replace(/-/g,"").toUpperCase(),n=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:l0,hash:"SHA-256"},n,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function Dc(r){var E,k,D;const e=window.CryptoUtils;if(!e)return null;const t=y0(),n=crypto.getRandomValues(new Uint8Array(16)),i=await Gw(t,n.buffer);let s;const o=await kc(),c=Z||await Yt();if(o&&c&&fe){const T=await e.createMasterKey(o,c,fe,!0);s=await crypto.subtle.exportKey("raw",T.key)}else s=await crypto.subtle.exportKey("raw",r);const l=crypto.getRandomValues(new Uint8Array(12)),u=await crypto.subtle.encrypt({name:"AES-GCM",iv:l},i,s),d={version:"2.0",iv:e.bufferToBase64(l.buffer),ct:e.bufferToBase64(u),salt:e.bufferToBase64(n.buffer),createdAt:new Date().toISOString()};let p=!1;if((E=window.firebaseConfig)!=null&&E.isEnabled()){const T=window.firebaseConfig.getDb();if(T){const V=Tt();try{await T.collection(V).doc("recoveryBlob").set(d),console.log(`[Encryption] Recovery blob (v2.0) stored in ${V}/recoveryBlob`),p=!0}catch(M){console.error("[Encryption] Failed to store recovery blob in Firebase:",M.message)}}}if(((k=window.electronAPI)==null?void 0:k.isElectron)===!0&&((D=window.electronAPI)!=null&&D.saveRecoveryBlob))try{const T=await window.electronAPI.saveRecoveryBlob(JSON.stringify(d));T!=null&&T.success&&(console.log("[Encryption] Recovery blob stored locally (safeStorage protected)"),p=!0)}catch(T){console.error("[Encryption] Failed to store recovery blob locally:",T.message)}if(!p)try{localStorage.setItem(ed,JSON.stringify(d)),console.log("[Encryption] Recovery blob stored in localStorage"),p=!0}catch(T){console.error("[Encryption] Failed to store recovery blob in localStorage:",T.message)}return p?t:null}async function id(){var e,t,n,i;if((e=window.firebaseConfig)!=null&&e.isEnabled()){const s=window.firebaseConfig.getDb();if(s){const o=Tt();try{const c=await s.collection(o).doc("recoveryBlob").get();if(c.exists&&((t=c.data())!=null&&t.ct))return!0}catch(c){console.warn("[Encryption] Recovery blob check (Firebase) failed:",c.message)}}}if(((n=window.electronAPI)==null?void 0:n.isElectron)===!0&&((i=window.electronAPI)!=null&&i.loadRecoveryBlob))try{const s=await window.electronAPI.loadRecoveryBlob();if(s){const o=JSON.parse(s);if(o!=null&&o.ct)return!0}}catch(s){console.warn("[Encryption] Recovery blob check (local) failed:",s.message)}try{const s=localStorage.getItem(ed);if(s){const o=JSON.parse(s);if(o!=null&&o.ct)return!0}}catch(s){console.warn("[Encryption] Recovery blob check (localStorage) failed:",s.message)}return!1}async function _m(r){try{if(!await id()){console.log("[Encryption] No recovery blob found - generating for existing user...");const t=await Dc(r);t&&(await xc(t),console.log("[Encryption] Recovery blob created for existing user"))}}catch(e){console.warn("[Encryption] ensureRecoveryBlob failed:",e.message)}}async function _0(r){var n,i,s;const e=window.CryptoUtils;if(!e)return null;let t=null;if((n=window.firebaseConfig)!=null&&n.isEnabled()){const o=window.firebaseConfig.getDb();if(o){const c=Tt();try{const l=await o.collection(c).doc("recoveryBlob").get();l.exists&&(t=l.data())}catch(l){console.warn("[Encryption] Recovery blob load (Firebase) failed:",l.message)}}}if(!t&&((i=window.electronAPI)==null?void 0:i.isElectron)===!0&&(s=window.electronAPI)!=null&&s.loadRecoveryBlob)try{const c=await window.electronAPI.loadRecoveryBlob();c&&(t=JSON.parse(c))}catch(c){console.warn("[Encryption] Recovery blob load (local) failed:",c.message)}if(!t)try{const o=localStorage.getItem(ed);o&&(t=JSON.parse(o),console.log("[Encryption] Recovery blob loaded from localStorage"))}catch(o){console.warn("[Encryption] Recovery blob load (localStorage) failed:",o.message)}if(!t)return console.warn("[Encryption] Recovery blob not found"),null;try{if(!t.version||!["1.0","2.0"].includes(t.version))return console.warn("[Encryption] Unknown recovery blob version:",t.version),null;if(!t.iv||!t.ct||!t.salt)return console.warn("[Encryption] Invalid recovery blob format"),null;const o=e.base64ToBuffer(t.salt),c=await Gw(r,o),l=new Uint8Array(e.base64ToBuffer(t.iv)),u=e.base64ToBuffer(t.ct),d=await crypto.subtle.decrypt({name:"AES-GCM",iv:l},c,u);if(t.version==="2.0")return await crypto.subtle.importKey("raw",d,{name:"AES-GCM"},!1,["encrypt","decrypt"]);{const p=new TextDecoder().decode(d),g=await Yt(),E=await nd();return!g||!E?null:(await e.createMasterKey(p,g,E)).key}}catch(o){return console.warn("[Encryption] Recovery decryption failed:",o.message),null}}function xc(r){return new Promise(e=>{const t=document.getElementById("recovery-key-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-key-modal",n.innerHTML=`
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
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-display");i&&(i.textContent=r);let s=null;const o=document.getElementById("recovery-key-copy");o&&o.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(r),o.textContent="복사됨! (30초 후 클립보드 삭제)",o.style.background="#dcfce7",o.style.borderColor="#22c55e",o.style.color="#16a34a",s&&clearTimeout(s),s=setTimeout(async()=>{try{await navigator.clipboard.readText()===r&&await navigator.clipboard.writeText("")}catch{}const l=document.getElementById("recovery-key-copy");l&&(l.textContent="복사",l.style.background="#eff6ff",l.style.borderColor="#3b82f6",l.style.color="#3b82f6")},3e4)}catch(l){console.warn("Clipboard write failed:",l)}});const c=document.getElementById("recovery-key-close");c&&c.addEventListener("click",()=>{s&&clearTimeout(s);try{navigator.clipboard.writeText("").catch(()=>{})}catch{}n.remove(),e()})})}function w0(){return new Promise(r=>{const e=d=>{jt=null,r(d)};jt=()=>{var d;(d=document.getElementById("recovery-input-modal"))==null||d.remove(),r(null)};const t=document.getElementById("recovery-input-modal");t&&t.remove();const n=document.createElement("div");n.id="recovery-input-modal",n.innerHTML=`
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
        `,document.body.appendChild(n);const i=document.getElementById("recovery-key-input"),s=document.getElementById("recovery-input-submit"),o=document.getElementById("recovery-input-cancel"),c=document.getElementById("recovery-input-error");i.addEventListener("input",()=>{var g;c.style.display="none";let d=i.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();d.length>24&&(d=d.substring(0,24));const p=((g=d.match(/.{1,4}/g))==null?void 0:g.join("-"))||d;i.value=p});function l(){const d=i.value.replace(/-/g,"").trim();if(d.length!==24){c.textContent="복구 키는 24자리여야 합니다.",c.style.display="block";return}n.remove(),e(d)}function u(){n.remove(),e(null)}s.addEventListener("click",l),o.addEventListener("click",u),i.addEventListener("keydown",d=>{d.key==="Enter"&&l(),d.key==="Escape"&&u()}),setTimeout(()=>i.focus(),100)})}function $r(r){let e=document.getElementById("recovery-progress-overlay");if(e){const t=document.getElementById("recovery-progress-text");t&&(t.textContent=r),e.style.display="flex"}else{e=document.createElement("div"),e.id="recovery-progress-overlay",e.style.cssText=`
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
        `;const i=document.createElement("style");i.textContent="@keyframes encSpin { to { transform: rotate(360deg); } }",document.head.appendChild(i);const s=document.createElement("div");s.id="recovery-progress-text",s.style.cssText="font-size: 14px; color: #333;",s.textContent=r,t.appendChild(n),t.appendChild(s),e.appendChild(t),document.body.appendChild(e)}}function Jn(){const r=document.getElementById("recovery-progress-overlay");r&&r.remove()}async function I0(){var s;if(!((s=window.firebaseConfig)!=null&&s.isEnabled()))return{allowed:!0,remaining:5};const t=window.firebaseConfig.getDb();if(!t)return{allowed:!0,remaining:5};const n=Tt(),i=t.collection(n).doc("recoveryAttempts");try{return await t.runTransaction(async c=>{const l=await c.get(i),u=l.exists?l.data():null;if(u){const d=new Date(u.lastAttemptAt),p=new Date,g=(p.getTime()-d.getTime())/6e4;return g>=30?(c.set(i,{count:1,lastAttemptAt:p.toISOString()}),{allowed:!0,remaining:4}):u.count>=5?{allowed:!1,remaining:0,lockoutMinutes:Math.ceil(30-g)}:(c.update(i,{count:u.count+1,lastAttemptAt:p.toISOString()}),{allowed:!0,remaining:5-u.count-1})}return c.set(i,{count:1,lastAttemptAt:new Date().toISOString()}),{allowed:!0,remaining:4}})}catch(o){return console.warn("[Encryption] Recovery attempts check failed:",o.message),{allowed:!0,remaining:5}}}async function E0(){var t;if(!((t=window.firebaseConfig)!=null&&t.isEnabled()))return;const r=window.firebaseConfig.getDb();if(!r)return;const e=Tt();try{await r.collection(e).doc("recoveryAttempts").delete()}catch(n){console.warn("[Encryption] Failed to reset recovery attempts:",n.message)}}async function wm(r,e,t,n){var u,d;const i=window.CryptoUtils;if(!i)return;const s=await r.collection(e).get();if(s.empty)return;const o=200,c=[];s.forEach(p=>{c.push({ref:p.ref,id:p.id,data:p.data()})});const l=[];for(let p=0;p<c.length;p+=o){const g=c.slice(p,p+o),E=r.batch();let k=!1;for(const{ref:D,id:T,data:V}of g)if(V._enc)try{const M=await i.decryptRecord({...V},t),B=await i.encryptRecord(M,n);if(B._enc){const j={...B},Q=(d=(u=window.firebase)==null?void 0:u.firestore)==null?void 0:d.FieldValue;if(Q){for(const W of i.SENSITIVE_FIELDS)(!(W in j)||j[W]===void 0)&&(j[W]=Q.delete());j.updatedAt=Q.serverTimestamp()}E.set(D,j,{merge:!0}),k=!0}}catch(M){l.push(T),console.error(`[ReEncrypt] ${e}/${T}: re-encrypt failed -`,M.message)}if(l.length>0)throw new Error(`${e}: ${l.length}개 문서 재암호화 실패 (${l.join(", ")})`);k&&await E.commit()}console.log(`[ReEncrypt] ${e}: re-encrypted ${c.length} docs`)}function v0(r,e){$w();const t=window.CryptoUtils;return new Promise(n=>{var D;const i=T=>{jt=null,n(T)};jt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),n(null)};const s=document.getElementById("encryption-password-modal");s&&s.remove();const o=document.createElement("div");if(o.id="encryption-password-modal",o.innerHTML=`
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
                                ${Yr}
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
        `,document.body.appendChild(o),r){const T=document.getElementById("enc-error-msg");T&&(T.textContent=r,T.style.display="block");const V=document.getElementById("enc-password-input");V&&(V.style.borderColor="#e74c3c")}const c=document.getElementById("enc-password-input"),l=document.getElementById("enc-submit-btn"),u=document.getElementById("enc-skip-btn"),d=document.getElementById("enc-password-error");t!=null&&t.bindPasswordValidation&&t.bindPasswordValidation({prefix:"enc",input:c,submitBtn:l,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const p=document.getElementById("enc-toggle-pw");p&&p.addEventListener("click",()=>{const T=c.type==="password";c.type=T?"text":"password",p.innerHTML=T?fu:Yr}),c.addEventListener("focus",()=>{c.style.borderColor="#22C55E",c.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),c.addEventListener("blur",()=>{c.style.borderColor="#D1D5DB",c.style.boxShadow="none"}),c.addEventListener("input",()=>{d.style.display="none"});async function g(){const T=c.value;if(!T){d.textContent="비밀번호를 입력해주세요.",d.style.display="block";return}if(e){l.disabled=!0,l.textContent="검증 중...",c.disabled=!0;const V=document.getElementById("enc-error-msg");V&&(V.style.display="none");try{const M=await e(T);if(M.valid)o.remove(),i(T);else if(M.exhausted)o.remove(),i(null);else{c.disabled=!1,l.textContent="확인",V&&(V.textContent=M.error||"비밀번호가 올바르지 않습니다.",V.style.display="block"),c.value="",c.style.borderColor="#e74c3c",c.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",c.focus();const B=o.querySelector("div > div");B&&(B.style.animation="none",B.offsetHeight,B.style.animation="enc-shake 0.4s ease")}}catch(M){c.disabled=!1,l.textContent="확인",V&&(V.textContent="검증 중 오류: "+(M.message||"알 수 없는 오류"),V.style.display="block"),c.focus()}return}o.remove(),i(T)}function E(){o.remove(),i(null)}l.addEventListener("click",g),u.addEventListener("click",E),c.addEventListener("keydown",T=>{T.key==="Enter"&&!l.disabled&&g(),T.key==="Escape"&&E()}),id().then(T=>{const V=document.getElementById("enc-recover-link");V&&T&&(V.style.display="block")}).catch(T=>{console.debug("[Encryption] Recovery blob check for link display failed:",T.message)});const k=document.getElementById("enc-recover-btn");k&&k.addEventListener("click",T=>{T.preventDefault(),o.remove(),i(Fw)}),setTimeout(()=>c.focus(),100)})}function Ww(){$w();const r=window.CryptoUtils;return new Promise(e=>{var D;const t=T=>{jt=null,e(T)};jt=()=>{var T;(T=document.getElementById("encryption-password-modal"))==null||T.remove(),e(null)};const n=document.getElementById("encryption-password-modal");n&&n.remove();const i=document.createElement("div");i.id="encryption-password-modal",i.innerHTML=`
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
                                ${Yr}
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
                                ${Yr}
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
        `,document.body.appendChild(i);const s=document.getElementById("enc-password-input"),o=document.getElementById("enc-password-confirm"),c=document.getElementById("enc-submit-btn"),l=document.getElementById("enc-skip-btn"),u=document.getElementById("enc-password-error");r!=null&&r.bindPasswordValidation&&r.bindPasswordValidation({prefix:"enc",input:s,confirmInput:o,submitBtn:c,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)"});const d=document.getElementById("enc-toggle-pw");d&&d.addEventListener("click",()=>{const T=s.type==="password";s.type=T?"text":"password",d.innerHTML=T?fu:Yr});const p=document.getElementById("enc-toggle-pw-confirm");p&&p.addEventListener("click",()=>{const T=o.type==="password";o.type=T?"text":"password",p.innerHTML=T?fu:Yr}),[s,o].forEach(T=>{T.addEventListener("focus",()=>{T.style.borderColor="#22C55E",T.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),T.addEventListener("blur",()=>{T.style.borderColor="#D1D5DB",T.style.boxShadow="none"})}),s.addEventListener("input",()=>{u.style.display="none"}),o.addEventListener("input",()=>{u.style.display="none"});function g(T){u.textContent=T,u.style.display="block"}function E(){const T=s.value,V=o.value;if(r!=null&&r.validatePassword){const M=r.validatePassword(T);if(!M.valid){g(M.errors[0]);return}}if(T!==V){g("비밀번호가 일치하지 않습니다.");return}i.remove(),t(T)}function k(){i.remove(),t(null)}c.addEventListener("click",E),l.addEventListener("click",k),o.addEventListener("keydown",T=>{T.key==="Enter"&&!c.disabled&&E(),T.key==="Escape"&&k()}),s.addEventListener("keydown",T=>{T.key==="Escape"&&k()}),setTimeout(()=>s.focus(),100)})}async function T0(r){const e=window.CryptoUtils;if(!e)return!1;console.log("[Encryption] === FIRST-TIME SETUP ===");const t=await Ww();if(!t)return console.warn("[Encryption] First-time setup skipped by user"),Z=null,!1;console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const n=await e.createMasterKey(t,Z,fe);he=n.key,fe=n.salt,r&&(console.log("[Encryption] Saving new salt..."),await io(fe)),await rd(t);try{const i=await Dc(he);i&&await xc(i)}catch(i){console.warn("[Encryption] Recovery key generation failed:",i.message)}return Z&&m0(),console.log("[Encryption] First-time setup SUCCESS (verification skipped - no existing encrypted data)"),Z=null,qa=!1,!0}async function b0(r){var o;const e=window.CryptoUtils;if(!e)return!1;const t=await kc();if(t){console.log("[Encryption] Auto-login with stored session password...");const c=await e.createMasterKey(t,Z,fe);if(he=c.key,fe=c.salt,r&&await io(fe),(await so(he)).verified)return await _m(he),Z=null,console.log("[Encryption] Auto-login SUCCESS (session password)"),!0;console.warn("[Encryption] Stored session password is invalid - clearing"),he=null,(o=window.electronAPI)!=null&&o.clearSessionPassword&&await window.electronAPI.clearSessionPassword()}let n=0,i=null;const s=async c=>{console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const l=await e.createMasterKey(c,Z,fe);return he=l.key,fe=l.salt,r&&n===0&&(console.log("[Encryption] Saving new salt..."),await io(fe)),console.log("[Encryption] Verifying key against encrypted data..."),(await so(he)).verified?{valid:!0}:(n++,he=null,console.warn(`[Encryption] Key verification failed (attempt ${n}/${qr})`),n>=qr?{valid:!1,error:`비밀번호 시도 횟수를 초과했습니다. (${qr}회)`,exhausted:!0}:{valid:!1,error:`비밀번호가 올바르지 않습니다. (${n}/${qr})`})};for(;n<qr;){console.log(`[Encryption] Password prompt (attempt ${n+1}/${qr})...`);const c=await v0(i,s);if(!c)return console.warn("[Encryption] Password skipped - encryption disabled"),Z=null,!1;if(c===Fw){console.log("[Encryption] Password recovery requested from login prompt");try{const l=await Qw();if(l!=null&&l.success)return console.log("[Encryption] Password recovered successfully"),!0;i=(l==null?void 0:l.error)==="Cancelled"?null:"비밀번호 복구에 실패했습니다. 다시 시도해주세요."}catch(l){console.error("[Encryption] Recovery error:",l),i="비밀번호 복구 중 오류: "+(l.message||"알 수 없는 오류")}continue}return await rd(c),await _m(he),Z=null,console.log(`[Encryption] Login SUCCESS (source: ${Je})`),!0}return console.error("[Encryption] All password attempts exhausted"),Z=null,he=null,!1}async function Hw(){return Si?!!he:it?Qr||!1:(it=!0,Qr=A0().finally(()=>{Qr=null}),Qr)}async function A0(){var e;if(!window.CryptoUtils)return console.warn("[Encryption] CryptoUtils not loaded"),it=!1,!1;try{if(console.log("[Encryption] Step 1: Loading key file..."),Z=await Yt(),Z||(e=window.firebaseConfig)!=null&&e.isEnabled()&&(console.log("[Encryption] Retrying Firebase key load..."),Z=await Yt()),!Z&&(console.log("[Encryption] No existing key found - starting first-time setup"),qa=!0,Z=await g0(),!Z))return console.error("[Encryption] Failed to generate key file"),!1;console.debug(`[Encryption] Key ready (source: ${Je})`),Je==="local"&&(console.log("[Encryption] Key loaded from local - syncing to Firebase..."),await p0(Z)),console.log("[Encryption] Step 2: Loading salt..."),fe=await nd();const t=!fe;console.log(fe?`[Encryption] Salt loaded (${new Uint8Array(fe).length} bytes)`:"[Encryption] No saved salt - will generate new one");let n;return qa?n=await T0(t):n=await b0(t),n&&(Si=!0),it=!1,n}catch(t){return console.error("[Encryption] Init FAILED:",t.message),console.error("[Encryption] Stack:",t.stack),Z=null,it=!1,!1}}async function S0(){const r=window.CryptoUtils;if(Si)return!!he;if(it)return Qr||!1;if(it=!0,!r)return it=!1,!1;try{const e=await kc();if(!e)return console.log("[Encryption] Silent init: no session password - skipping"),it=!1,!1;if(Z=await Yt(),!Z)return it=!1,!1;fe=await nd();const t=!fe,n=await r.createMasterKey(e,Z,fe);return he=n.key,fe=n.salt,t&&await io(fe),(await so(he)).verified?(Si=!0,Z=null,console.log("[Encryption] Silent init SUCCESS"),it=!1,!0):(he=null,Z=null,it=!1,!1)}catch(e){return console.warn("[Encryption] Silent init failed:",e.message),Z=null,it=!1,!1}}async function Qw(){var t,n,i;const r=window.CryptoUtils;if(!r)return{success:!1,error:"CryptoUtils not available"};if(!await d0("passwordChange"))return window.showToast&&window.showToast("다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요.","warning"),{success:!1,error:"Another password operation in progress"};try{let o=0,c=null;for(;o<3;){const l=await I0();if(!l.allowed)return window.showToast&&window.showToast(`복구 시도 횟수를 초과했습니다.
${l.lockoutMinutes}분 후에 다시 시도해주세요.`,"error"),{success:!1,error:"Rate limited"};const u=await w0();if(!u)return{success:!1,error:"Cancelled"};if($r("복구 키 검증 중..."),c=await _0(u),c)break;if(o++,Jn(),o>=3)return window.showToast&&window.showToast("복구 키 시도 횟수를 초과했습니다. (3회)","error"),{success:!1,error:"Max retries exceeded"};window.showToast&&window.showToast("복구 키가 올바르지 않습니다. ("+o+"/3)"+(l.remaining>0?`
남은 전체 시도: `+l.remaining+"회":""),"error")}$r("마스터 키 검증 중...");try{if(!(await so(c)).verified)return Jn(),window.showToast&&window.showToast(`복구된 키로 데이터를 검증할 수 없습니다.
복구 블롭이 오래되었거나 손상되었을 수 있습니다.`,"error"),{success:!1,error:"Key verification failed"};await E0(),$r("키 파일 로드 중...");let u=Z||await Yt();if(!u){if(Jn(),((t=window.electronAPI)==null?void 0:t.isElectron)===!0&&confirm(`키 파일을 찾을 수 없습니다.
키 파일을 가져오시겠습니까?`)){const B=await jw();B!=null&&B.success&&(u=Z||await Yt())}if(!u)return window.showToast&&window.showToast(`키 파일을 불러올 수 없습니다.
키 파일 내보내기로 백업한 .key 파일을 가져오거나,
Firebase 연결을 확인해주세요.`,"error"),{success:!1,error:"Key file not found"}}Jn();const d=await Ww();if(!d)return{success:!1,error:"New password cancelled"};$r("새 마스터 키 생성 중...");const p=await r.createMasterKey(d,u,null),g=p.key,E=p.salt,k=c,D=[];try{if((n=window.firebaseConfig)!=null&&n.isEnabled()&&window.firestoreDb){const V=window.firebaseConfig.getDb();if(V){const M=["soil","water","pesticide","compost","heavyMetal"],B=new Date().getFullYear();let j=0;const Q=M.length*(B-2020+1);for(const W of M)for(let I=2020;I<=B;I++){j++,$r(`데이터 재암호화 중... (${j}/${Q})`);const y=window.firestoreDb.getCollectionName(W,I);await wm(V,y,k,g),D.push(y)}}}}catch(V){console.error("[Encryption] Recovery re-encryption failed, rolling back...",V);const M=[];if(D.length>0&&((i=window.firebaseConfig)!=null&&i.isEnabled())){const B=window.firebaseConfig.getDb();if(B)for(const j of D)try{await wm(B,j,g,k)}catch(Q){console.error(`[Encryption] Rollback FAILED: ${j}`,Q.message),M.push(j)}}return Jn(),M.length>0?window.showToast&&window.showToast(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${M.join(", ")}. 관리자에게 문의하세요.`,"error"):window.showToast&&window.showToast("재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요.","error"),{success:!1,error:"Re-encryption failed, rolled back"}}$r("설정 저장 중..."),fe=E,await io(E),he=g,Si=!0,Z=null,await rd(d);const T=await Dc(g);return Jn(),T&&await xc(T),console.log("[Encryption] Password recovery completed successfully"),window.showToast&&window.showToast("비밀번호가 성공적으로 복구되었습니다.","success"),{success:!0}}catch(l){return Jn(),console.error("[Encryption] Password recovery failed:",l),window.showToast&&window.showToast("비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요.","error"),{success:!1,error:l.message}}}finally{await f0("passwordChange")}}async function R0(){return he?{success:!1,error:"Not implemented in abbreviated version"}:(window.showToast&&window.showToast("암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요.","warning"),{success:!1,error:"Encryption not active"})}async function P0(r){const e=window.CryptoUtils;if(!r||typeof r!="string")return!1;const t=await kc();if(t&&h0(r,t))return!0;try{const n=Z||await Yt();if(!n||!fe||!e)return!1;const i=await e.createMasterKey(r,n,fe);return(await so(i.key)).verified}catch(n){return console.warn("[Encryption] verifyPassword failed:",n.message),!1}}async function C0(){return he?!0:(console.warn("[Encryption] verifyPasswordForExport: no active key"),!1)}async function k0(){if(!he)return{success:!1,message:"암호화가 활성화되지 않았습니다."};try{const r=await Dc(he);return r?(await xc(r),{success:!0,message:"복구 키가 재발급되었습니다."}):{success:!1,message:"복구 키 생성에 실패했습니다."}}catch(r){return console.error("[Encryption] regenerateRecoveryKey error:",r),{success:!1,message:r.message}}}function D0(){return!!he}function x0(){return he}function N0(){return Je}function sd(){if(he=null,Z&&typeof Z=="string")try{const r=crypto.getRandomValues(new Uint8Array(Z.length));Z=String.fromCharCode(...r)}catch{}Z=null,fe=null,Si=!1,it=!1,Qr=null,Je=null,qa=!1;try{sessionStorage.removeItem(td)}catch{}}function V0(){sd()}async function O0(){var r;if(console.log("[Encryption] === KEY REGENERATION ==="),(r=window.firebaseConfig)!=null&&r.isEnabled()){const e=window.firebaseConfig.getDb();if(e){const t=Tt();try{await e.collection(t).doc("encryptionKey").delete(),console.log(`[Encryption] Deleted ${t}/encryptionKey from Firebase`)}catch(n){console.warn("[Encryption] Firebase key delete failed:",n.message)}}}return sd(),await Hw()}function Yw(){jt&&(jt(),jt=null)}const M0={init:Hw,initSilent:S0,isReady:D0,getKey:x0,getKeySource:N0,destroy:sd,reset:V0,regenerateKey:O0,verifyPassword:P0,verifyPasswordForExport:C0,changePassword:R0,recoverPassword:Qw,checkRecoveryBlobExists:id,regenerateRecoveryKey:k0,exportKeyFile:zw,importKeyFile:jw,_cleanupModal:Yw};window.encryptionManager=M0;window.addEventListener("beforeunload",()=>{Yw()});const Ie={LOCAL_ONLY:"local",CLOUD_SYNC:"cloud",CLOUD_ONLY:"cloudOnly"};let Xe=Ie.LOCAL_ONLY;const L0=!1,F0=(...r)=>L0,rn={lastSyncTime:null,pendingChanges:0,isOnline:navigator.onLine};window.addEventListener("online",()=>{rn.isOnline=!0,Jw()});window.addEventListener("offline",()=>{rn.isOnline=!1});async function U0(){var n,i,s;const r=localStorage.getItem("storageMode"),e=Object.values(Ie);let t=!1;if((n=window.firebaseConfig)!=null&&n.initialize)try{await window.firebaseConfig.initialize()&&(await((i=window.firestoreDb)==null?void 0:i.init()),t=!0)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Storage] Firebase 초기화 실패:",o)}return r&&e.includes(r)?(r===Ie.CLOUD_SYNC||r===Ie.CLOUD_ONLY)&&!t?Xe=Ie.LOCAL_ONLY:Xe=r:Xe=t?Ie.CLOUD_SYNC:Ie.LOCAL_ONLY,Xe}function B0(r){var t;return Object.values(Ie).includes(r)?(r===Ie.CLOUD_SYNC||r===Ie.CLOUD_ONLY)&&!((t=window.firestoreDb)!=null&&t.isEnabled())?{success:!1,message:"Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다."}:(Xe=r,localStorage.setItem("storageMode",r),window.dispatchEvent(new CustomEvent("storage-mode-changed",{detail:{mode:r}})),{success:!0,message:`저장 모드가 변경되었습니다: ${r}`}):{success:!1,message:`유효하지 않은 모드: ${r}`}}function q0(){var e;const r=((e=window.firestoreDb)==null?void 0:e.isEnabled())||!1;return[{value:Ie.LOCAL_ONLY,label:"로컬 저장소만",description:"이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.",available:!0},{value:Ie.CLOUD_SYNC,label:"클라우드 동기화",description:"로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.",available:r},{value:Ie.CLOUD_ONLY,label:"클라우드 전용",description:"Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.",available:r}]}async function $0(r,e,t,n){var i,s;try{if(localStorage.setItem(t,JSON.stringify(n)),F0(`localStorage 저장: ${t}`),Xe===Ie.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())){const o=n.map(c=>({...c,id:c.id||od()}));await window.firestoreDb.batchSave(r,e,o),rn.lastSyncTime=new Date}return!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("데이터 저장 실패:",o),!1}}async function K0(r,e,t,n){var i,s;try{const o=JSON.parse(localStorage.getItem(t)||"[]"),c={...n,id:n.id||od()},l=o.findIndex(u=>u.id===c.id);return l>=0?o[l]=c:o.push(c),localStorage.setItem(t,JSON.stringify(o)),Xe===Ie.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.save(r,e,c.id,c),rn.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 저장 실패:",o),!1}}async function z0(r,e,t){var n,i;try{if(Xe===Ie.CLOUD_SYNC&&((n=window.firestoreDb)!=null&&n.isEnabled())){const o=await window.firestoreDb.getAll(r,e);if(o.length>0)return localStorage.setItem(t,JSON.stringify(o)),rn.lastSyncTime=new Date,o}const s=localStorage.getItem(t);return s?JSON.parse(s):[]}catch(s){(((i=window.logger)==null?void 0:i.error)||console.error)("데이터 로드 실패:",s);const o=localStorage.getItem(t);return o?JSON.parse(o):[]}}async function j0(r,e,t,n){var i,s;try{const c=JSON.parse(localStorage.getItem(t)||"[]").filter(l=>l.id!==n);return localStorage.setItem(t,JSON.stringify(c)),Xe===Ie.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.delete(r,e,n),rn.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 삭제 실패:",o),!1}}function G0(r,e,t,n){var i;return Xe!==Ie.CLOUD_SYNC||!((i=window.firestoreDb)!=null&&i.isEnabled())?null:window.firestoreDb.subscribe(r,e,(s,o)=>{localStorage.setItem(t,JSON.stringify(s)),n(s,o),o||(rn.lastSyncTime=new Date)})}async function W0(r,e,t){return Xe!==Ie.CLOUD_SYNC?{success:!1,count:0,message:"클라우드 동기화 모드가 아닙니다."}:await window.firestoreDb.migrate(r,e,t)}async function Jw(){Xe!==Ie.CLOUD_SYNC||!rn.isOnline||window.dispatchEvent(new CustomEvent("storage-sync-requested"))}function od(){var r;return typeof window<"u"&&((r=window.SampleUtils)!=null&&r.generateUUID)?window.SampleUtils.generateUUID():typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),e=>e.toString(36)).join("").substring(0,9)}function H0(){return Xe}function Q0(){var r,e;return{...rn,mode:Xe,isCloudEnabled:((r=window.firestoreDb)==null?void 0:r.isEnabled())||!1,isOfflineSupported:((e=window.firestoreDb)==null?void 0:e.isOfflineEnabled())||!1}}function Y0(){return Xe===Ie.CLOUD_SYNC}window.storageManager={init:U0,save:$0,saveItem:K0,load:z0,delete:j0,subscribe:G0,migrate:W0,sync:Jw,getMode:H0,setMode:B0,getAvailableModes:q0,getStatus:Q0,isCloudEnabled:Y0,generateId:od,MODES:Ie};export{oo as f};
