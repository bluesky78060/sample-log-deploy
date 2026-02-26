window.NETWORK_CONFIG={ALLOWED_GATEWAY:"111.21.101.254"};const ku={STORAGE_KEY:"networkAccessConfig",GATEWAY_STORAGE_KEY:"networkGatewayIP",getAllowedGateway(){var r;try{const e=localStorage.getItem(this.GATEWAY_STORAGE_KEY);if(e)return e}catch{}return((r=window.NETWORK_CONFIG)==null?void 0:r.ALLOWED_GATEWAY)||null},saveGateway(r){try{localStorage.setItem(this.GATEWAY_STORAGE_KEY,r),logger.info("[NetworkAccess] 게이트웨이 저장됨:",r)}catch(e){logger.error("[NetworkAccess] 게이트웨이 저장 실패:",e)}},removeGateway(){try{localStorage.removeItem(this.GATEWAY_STORAGE_KEY),logger.info("[NetworkAccess] 게이트웨이 삭제됨")}catch{}},defaultConfig:{adminIPs:[],timeout:5e3},_currentIP:null,_lastCheck:null,_cacheTimeout:6e4,loadConfig(){try{const r=localStorage.getItem(this.STORAGE_KEY);if(r)return{...this.defaultConfig,...JSON.parse(r)}}catch(r){logger.error("[NetworkAccess] 설정 로드 실패:",r)}return{...this.defaultConfig}},saveConfig(r){try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(r)),logger.info("[NetworkAccess] 설정 저장됨:",r)}catch(e){logger.error("[NetworkAccess] 설정 저장 실패:",e)}},async getCurrentIP(r){if(this._currentIP&&this._lastCheck&&Date.now()-this._lastCheck<this._cacheTimeout)return this._currentIP;const e=r||this.loadConfig().timeout;try{const t=new AbortController,n=setTimeout(()=>t.abort(),e),i=await fetch("https://api.ipify.org?format=json",{signal:t.signal});clearTimeout(n);const s=await i.json();return this._currentIP=s.ip,this._lastCheck=Date.now(),logger.info("[NetworkAccess] 현재 IP:",this._currentIP),this._currentIP}catch(t){return logger.warn("[NetworkAccess] IP 조회 실패:",t.message),null}},getSubnetPrefix(r){if(!r)return"";const e=r.split(".");return e.length!==4?"":e.slice(0,3).join(".")+"."},async checkAccess(){var i;if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0)return{allowed:!0,reason:"Electron 환경 (항상 허용)",ip:null};if(window.location.protocol==="file:")return{allowed:!0,reason:"Electron 로컬 실행",ip:null};const r=this.getAllowedGateway();if(!r)return logger.warn("[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요"),{allowed:!1,reason:"게이트웨이 미설정",ip:null,needsSetup:!0};const e=this.getSubnetPrefix(r),t=await this.getCurrentIP();if(!t)return logger.warn("[NetworkAccess] IP 확인 불가 - 접근 거부"),{allowed:!1,reason:"IP 확인 불가",ip:null};if(t.startsWith(e))return logger.info("[NetworkAccess] 허용된 네트워크:",t),{allowed:!0,reason:`허용된 네트워크 (${r})`,ip:t};const n=this.loadConfig();return n.adminIPs&&n.adminIPs.includes(t)?{allowed:!0,reason:"관리자 IP",ip:t}:(logger.warn("[NetworkAccess] 허용되지 않은 네트워크:",t),{allowed:!1,reason:`허용되지 않은 네트워크 (허용: ${e}x)`,ip:t})},async isAllowed(){return(await this.checkAccess()).allowed},addAdminIP(r){const e=this.loadConfig();e.adminIPs.includes(r)||(e.adminIPs.push(r),this.saveConfig(e))},removeAdminIP(r){const e=this.loadConfig();e.adminIPs=e.adminIPs.filter(t=>t!==r),this.saveConfig(e)},async registerCurrentAsAdmin(){const r=await this.getCurrentIP();return r?(this.addAdminIP(r),r):null},resetConfig(){localStorage.removeItem(this.STORAGE_KEY),localStorage.removeItem(this.GATEWAY_STORAGE_KEY),this._currentIP=null,this._lastCheck=null,logger.info("[NetworkAccess] 설정 초기화됨")},async printStatus(){var s;const r=this.loadConfig(),e=await this.getCurrentIP(),t=await this.checkAccess(),n=((s=window.electronAPI)==null?void 0:s.isElectron)===!0||window.location.protocol==="file:",i=this.getAllowedGateway();return console.log("========================================"),logger.info("[NetworkAccess] 현재 상태"),console.log("========================================"),console.log("환경:",n?"Electron (네트워크 체크 안함)":"웹 (네트워크 체크 활성화)"),console.log("허용된 게이트웨이:",i||"설정 없음"),console.log("허용된 서브넷:",i?this.getSubnetPrefix(i)+"x":"없음"),console.log("현재 공인 IP:",e||"확인 불가"),console.log("접근 허용:",t.allowed,`(${t.reason})`),console.log("관리자 IP (예외):",r.adminIPs||[]),console.log("========================================"),{config:r,currentIP:e,access:t,isElectron:n,allowedGateway:i}},showGatewaySetupModal(){return new Promise(r=>{const e=document.getElementById("gatewaySetupModal");e&&e.remove();const t=document.documentElement.getAttribute("data-theme")==="dark",n=document.createElement("div");n.id="gatewaySetupModal",n.style.cssText=`
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
            `,n.appendChild(i),document.body.appendChild(n);const s=document.getElementById("gatewayIPInput"),o=document.getElementById("gatewaySaveBtn"),c=document.getElementById("gatewaySkipBtn");s.focus();function l(u){const h=u.trim().split(".");return h.length!==4?!1:h.every(p=>{const g=Number(p);return Number.isInteger(g)&&g>=0&&g<=255})}s.addEventListener("focus",()=>{s.style.borderColor="#7C9082",s.style.boxShadow="0 0 0 3px rgba(124, 144, 130, 0.12)"}),s.addEventListener("blur",()=>{s.style.borderColor=t?"#57534E":"#E8E4DF",s.style.boxShadow="none"}),s.addEventListener("keydown",u=>{u.key==="Enter"&&o.click()}),o.addEventListener("click",()=>{const u=s.value.trim();if(!u){s.style.borderColor="#dc2626",s.placeholder="IP 주소를 입력하세요";return}if(!l(u)){s.style.borderColor="#dc2626",s.value="",s.placeholder="올바른 IP 형식: 0~255.0~255.0~255.0~255";return}ku.saveGateway(u),n.remove(),r(u)}),c.addEventListener("click",()=>{n.remove(),r(null)})})},async promptGatewayIfNeeded(){var e;return((e=window.electronAPI)==null?void 0:e.isElectron)===!0||window.location.protocol==="file:"||this.getAllowedGateway()?!0:!!await this.showGatewaySetupModal()}};window.NetworkAccess=ku;var hg;if(((hg=window.electronAPI)==null?void 0:hg.isElectron)===!0||window.location.protocol==="file:")logger.info("[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)");else{const r=ku.getAllowedGateway();logger.info("[NetworkAccess] 웹 환경 - 네트워크 체크 활성화"),r?logger.info(`[NetworkAccess] 허용된 게이트웨이: ${r}`):logger.warn("[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요")}const Jw=()=>{};var tf={};/**
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
 */const fg=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},Xw=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],l=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(l>>10)),e[n++]=String.fromCharCode(56320+(l&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},pg={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,l=i+2<r.length,u=l?r[i+2]:0,h=s>>2,p=(s&3)<<4|c>>4;let g=(c&15)<<2|u>>6,E=u&63;l||(E=64,o||(g=64)),n.push(t[h],t[p],t[g],t[E])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(fg(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):Xw(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const u=i<r.length?t[r.charAt(i)]:64;++i;const p=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||u==null||p==null)throw new Zw;const g=s<<2|c>>4;if(n.push(g),u!==64){const E=c<<4&240|u>>2;if(n.push(E),p!==64){const N=u<<6&192|p;n.push(N)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class Zw extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const eE=function(r){const e=fg(r);return pg.encodeByteArray(e,!0)},Ya=function(r){return eE(r).replace(/\./g,"")},xu=function(r){try{return pg.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function Ja(r,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:r===void 0&&(r={});break;case Array:r=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!tE(t)||(r[t]=Ja(r[t],e[t]));return r}function tE(r){return r!=="__proto__"}/**
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
 */function Du(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const nE=()=>Du().__FIREBASE_DEFAULTS__,rE=()=>{if(typeof process>"u"||typeof tf>"u")return;const r=tf.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},iE=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&xu(r[1]);return e&&JSON.parse(e)},Nu=()=>{try{return Jw()||nE()||rE()||iE()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},Vu=()=>{var r;return(r=Nu())==null?void 0:r.config},sE=r=>{var e;return(e=Nu())==null?void 0:e[`_${r}`]};/**
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
 */class oE{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
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
 */function gs(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function gg(r){return(await fetch(r,{credentials:"include"})).ok}/**
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
 */function aE(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Ya(JSON.stringify(t)),Ya(JSON.stringify(o)),""].join(".")}const io={};function cE(){const r={prod:[],emulator:[]};for(const e of Object.keys(io))io[e]?r.emulator.push(e):r.prod.push(e);return r}function lE(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let nf=!1;function mg(r,e){if(typeof window>"u"||typeof document>"u"||!gs(window.location.host)||io[r]===e||io[r]||nf)return;io[r]=e;function t(g){return`__firebase__banner__${g}`}const n="__firebase__banner",s=cE().prod.length>0;function o(){const g=document.getElementById(n);g&&g.remove()}function c(g){g.style.display="flex",g.style.background="#7faaf0",g.style.position="fixed",g.style.bottom="5px",g.style.left="5px",g.style.padding=".5em",g.style.borderRadius="5px",g.style.alignItems="center"}function l(g,E){g.setAttribute("width","24"),g.setAttribute("id",E),g.setAttribute("height","24"),g.setAttribute("viewBox","0 0 24 24"),g.setAttribute("fill","none"),g.style.marginLeft="-6px"}function u(){const g=document.createElement("span");return g.style.cursor="pointer",g.style.marginLeft="16px",g.style.fontSize="24px",g.innerHTML=" &times;",g.onclick=()=>{nf=!0,o()},g}function h(g,E){g.setAttribute("id",E),g.innerText="Learn more",g.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",g.setAttribute("target","__blank"),g.style.paddingLeft="5px",g.style.textDecoration="underline"}function p(){const g=lE(n),E=t("text"),N=document.getElementById(E)||document.createElement("span"),V=t("learnmore"),O=document.getElementById(V)||document.createElement("a"),Y=t("preprendIcon"),ee=document.getElementById(Y)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(g.created){const X=g.element;c(X),h(O,V);const de=u();l(ee,Y),X.append(ee,N,O,de),document.body.appendChild(X)}s?(N.innerText="Preview backend disconnected.",ee.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(ee.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,N.innerText="Preview backend running in this workspace."),N.setAttribute("id",E)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
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
 */function Ke(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function uE(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Ke())}function vc(){var e;const r=(e=Nu())==null?void 0:e.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function dE(){return typeof window<"u"||yg()}function yg(){return typeof WorkerGlobalScope<"u"&&typeof self<"u"&&self instanceof WorkerGlobalScope}function hE(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function _g(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Ou(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function wg(){const r=Ke();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function Eg(){return!vc()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Ig(){return!vc()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Eo(){try{return typeof indexedDB=="object"}catch{return!1}}function fE(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)==null?void 0:s.message)||"")}}catch(t){e(t)}})}/**
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
 */const pE="FirebaseError";class xt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=pE,Object.setPrototypeOf(this,xt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,yi.prototype.create)}}class yi{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?gE(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new xt(i,c,n)}}function gE(r,e){return r.replace(mE,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const mE=/\{\$([^}]+)}/g;/**
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
 */function rf(r,e){return Object.prototype.hasOwnProperty.call(r,e)}function yE(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function pr(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(sf(s)&&sf(o)){if(!pr(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function sf(r){return r!==null&&typeof r=="object"}/**
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
 */function ms(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function Ui(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Ys(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function vg(r,e){const t=new _E(r,e);return t.subscribe.bind(t)}class _E{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");wE(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=Il),i.error===void 0&&(i.error=Il),i.complete===void 0&&(i.complete=Il);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function wE(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function Il(){}/**
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
 */function ue(r){return r&&r._delegate?r._delegate:r}class bn{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const Kr="[DEFAULT]";/**
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
 */class EE{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new oE;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),n=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(n)return null;throw i}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(vE(e))try{this.getOrInitializeService({instanceIdentifier:Kr})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=Kr){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Kr){return this.instances.has(e)}getOptions(e=Kr){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(n)??new Set;i.add(e),this.onInitCallbacks.set(n,i);const s=this.instances.get(n);return s&&e(s,n),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:IE(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=Kr){return this.component?this.component.multipleInstances?e:Kr:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function IE(r){return r===Kr?void 0:r}function vE(r){return r.instantiationMode==="EAGER"}/**
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
 */class Tg{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new EE(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
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
 */const Mu=[];var Ee;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(Ee||(Ee={}));const bg={debug:Ee.DEBUG,verbose:Ee.VERBOSE,info:Ee.INFO,warn:Ee.WARN,error:Ee.ERROR,silent:Ee.SILENT},TE=Ee.INFO,bE={[Ee.DEBUG]:"log",[Ee.VERBOSE]:"log",[Ee.INFO]:"info",[Ee.WARN]:"warn",[Ee.ERROR]:"error"},AE=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=bE[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Tc{constructor(e){this.name=e,this._logLevel=TE,this._logHandler=AE,this._userLogHandler=null,Mu.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in Ee))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?bg[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,Ee.DEBUG,...e),this._logHandler(this,Ee.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,Ee.VERBOSE,...e),this._logHandler(this,Ee.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,Ee.INFO,...e),this._logHandler(this,Ee.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,Ee.WARN,...e),this._logHandler(this,Ee.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,Ee.ERROR,...e),this._logHandler(this,Ee.ERROR,...e)}}function SE(r){Mu.forEach(e=>{e.setLogLevel(r)})}function RE(r,e){for(const t of Mu){let n=null;e&&e.level&&(n=bg[e.level]),r===null?t.userLogHandler=null:t.userLogHandler=(i,s,...o)=>{const c=o.map(l=>{if(l==null)return null;if(typeof l=="string")return l;if(typeof l=="number"||typeof l=="boolean")return l.toString();if(l instanceof Error)return l.message;try{return JSON.stringify(l)}catch{return null}}).filter(l=>l).join(" ");s>=(n??i.logLevel)&&r({level:Ee[s].toLowerCase(),message:c,args:o,type:i.name})}}}const PE=(r,e)=>e.some(t=>r instanceof t);let of,af;function CE(){return of||(of=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function kE(){return af||(af=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ag=new WeakMap,$l=new WeakMap,Sg=new WeakMap,vl=new WeakMap,Lu=new WeakMap;function xE(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",o)},s=()=>{t(lr(r.result)),i()},o=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&Ag.set(t,r)}).catch(()=>{}),Lu.set(e,r),e}function DE(r){if($l.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",o),r.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",o),r.addEventListener("abort",o)});$l.set(r,e)}let ql={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return $l.get(r);if(e==="objectStoreNames")return r.objectStoreNames||Sg.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return lr(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function NE(r){ql=r(ql)}function VE(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(Tl(this),e,...t);return Sg.set(n,e.sort?e.sort():[e]),lr(n)}:kE().includes(r)?function(...e){return r.apply(Tl(this),e),lr(Ag.get(this))}:function(...e){return lr(r.apply(Tl(this),e))}}function OE(r){return typeof r=="function"?VE(r):(r instanceof IDBTransaction&&DE(r),PE(r,CE())?new Proxy(r,ql):r)}function lr(r){if(r instanceof IDBRequest)return xE(r);if(vl.has(r))return vl.get(r);const e=OE(r);return e!==r&&(vl.set(r,e),Lu.set(e,r)),e}const Tl=r=>Lu.get(r);function ME(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const o=indexedDB.open(r,e),c=lr(o);return n&&o.addEventListener("upgradeneeded",l=>{n(lr(o.result),l.oldVersion,l.newVersion,lr(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{s&&l.addEventListener("close",()=>s()),i&&l.addEventListener("versionchange",u=>i(u.oldVersion,u.newVersion,u))}).catch(()=>{}),c}const LE=["get","getKey","getAll","getAllKeys","count"],FE=["put","add","delete","clear"],bl=new Map;function cf(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(bl.get(e))return bl.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=FE.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||LE.includes(t)))return;const s=async function(o,...c){const l=this.transaction(o,i?"readwrite":"readonly");let u=l.store;return n&&(u=u.index(c.shift())),(await Promise.all([u[t](...c),i&&l.done]))[0]};return bl.set(e,s),s}NE(r=>({...r,get:(e,t,n)=>cf(e,t)||r.get(e,t,n),has:(e,t)=>!!cf(e,t)||r.has(e,t)}));/**
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
 */class UE{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(BE(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function BE(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Xa="@firebase/app",Kl="0.14.6";/**
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
 */const Dn=new Tc("@firebase/app"),$E="@firebase/app-compat",qE="@firebase/analytics-compat",KE="@firebase/analytics",zE="@firebase/app-check-compat",jE="@firebase/app-check",GE="@firebase/auth",WE="@firebase/auth-compat",HE="@firebase/database",QE="@firebase/data-connect",YE="@firebase/database-compat",JE="@firebase/functions",XE="@firebase/functions-compat",ZE="@firebase/installations",eI="@firebase/installations-compat",tI="@firebase/messaging",nI="@firebase/messaging-compat",rI="@firebase/performance",iI="@firebase/performance-compat",sI="@firebase/remote-config",oI="@firebase/remote-config-compat",aI="@firebase/storage",cI="@firebase/storage-compat",lI="@firebase/firestore",uI="@firebase/ai",dI="@firebase/firestore-compat",hI="firebase",fI="12.6.0";/**
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
 */const gr="[DEFAULT]",pI={[Xa]:"fire-core",[$E]:"fire-core-compat",[KE]:"fire-analytics",[qE]:"fire-analytics-compat",[jE]:"fire-app-check",[zE]:"fire-app-check-compat",[GE]:"fire-auth",[WE]:"fire-auth-compat",[HE]:"fire-rtdb",[QE]:"fire-data-connect",[YE]:"fire-rtdb-compat",[JE]:"fire-fn",[XE]:"fire-fn-compat",[ZE]:"fire-iid",[eI]:"fire-iid-compat",[tI]:"fire-fcm",[nI]:"fire-fcm-compat",[rI]:"fire-perf",[iI]:"fire-perf-compat",[sI]:"fire-rc",[oI]:"fire-rc-compat",[aI]:"fire-gcs",[cI]:"fire-gcs-compat",[lI]:"fire-fst",[dI]:"fire-fst-compat",[uI]:"fire-vertex","fire-js":"fire-js",[hI]:"fire-js-all"};/**
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
 */const mr=new Map,Gi=new Map,Wi=new Map;function Io(r,e){try{r.container.addComponent(e)}catch(t){Dn.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function Rg(r,e){r.container.addOrOverwriteComponent(e)}function yr(r){const e=r.name;if(Wi.has(e))return Dn.debug(`There were multiple attempts to register component ${e}.`),!1;Wi.set(e,r);for(const t of mr.values())Io(t,r);for(const t of Gi.values())Io(t,r);return!0}function Pg(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function gI(r,e,t=gr){Pg(r,e).clearInstance(t)}function Fu(r){return r.options!==void 0}function Cg(r){return Fu(r)?!1:"authIdToken"in r||"appCheckToken"in r||"releaseOnDeref"in r||"automaticDataCollectionEnabled"in r}function Ue(r){return r==null?!1:r.settings!==void 0}function mI(){Wi.clear()}/**
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
 */const yI={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},zt=new yi("app","Firebase",yI);/**
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
 */let kg=class{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new bn("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw zt.create("app-deleted",{appName:this._name})}};/**
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
 */function lf(r,e){const t=xu(r.split(".")[1]);if(t===null){console.error(`FirebaseServerApp ${e} is invalid: second part could not be parsed.`);return}if(JSON.parse(t).exp===void 0){console.error(`FirebaseServerApp ${e} is invalid: expiration claim could not be parsed`);return}const i=JSON.parse(t).exp*1e3,s=new Date().getTime();i-s<=0&&console.error(`FirebaseServerApp ${e} is invalid: the token has expired.`)}class _I extends kg{constructor(e,t,n,i){const s=t.automaticDataCollectionEnabled!==void 0?t.automaticDataCollectionEnabled:!0,o={name:n,automaticDataCollectionEnabled:s};if(e.apiKey!==void 0)super(e,o,i);else{const c=e;super(c.options,o,i)}this._serverConfig={automaticDataCollectionEnabled:s,...t},this._serverConfig.authIdToken&&lf(this._serverConfig.authIdToken,"authIdToken"),this._serverConfig.appCheckToken&&lf(this._serverConfig.appCheckToken,"appCheckToken"),this._finalizationRegistry=null,typeof FinalizationRegistry<"u"&&(this._finalizationRegistry=new FinalizationRegistry(()=>{this.automaticCleanup()})),this._refCount=0,this.incRefCount(this._serverConfig.releaseOnDeref),this._serverConfig.releaseOnDeref=void 0,t.releaseOnDeref=void 0,tn(Xa,Kl,"serverapp")}toJSON(){}get refCount(){return this._refCount}incRefCount(e){this.isDeleted||(this._refCount++,e!==void 0&&this._finalizationRegistry!==null&&this._finalizationRegistry.register(e,this))}decRefCount(){return this.isDeleted?0:--this._refCount}automaticCleanup(){Bu(this)}get settings(){return this.checkDestroyed(),this._serverConfig}checkDestroyed(){if(this.isDeleted)throw zt.create("server-app-deleted")}}/**
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
 */const Sr=fI;function Uu(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:gr,automaticDataCollectionEnabled:!0,...e},i=n.name;if(typeof i!="string"||!i)throw zt.create("bad-app-name",{appName:String(i)});if(t||(t=Vu()),!t)throw zt.create("no-options");const s=mr.get(i);if(s){if(pr(t,s.options)&&pr(n,s.config))return s;throw zt.create("duplicate-app",{appName:i})}const o=new Tg(i);for(const l of Wi.values())o.addComponent(l);const c=new kg(t,n,o);return mr.set(i,c),c}function wI(r,e={}){if(dE()&&!yg())throw zt.create("invalid-server-app-environment");let t,n=e||{};if(r&&(Fu(r)?t=r.options:Cg(r)?n=r:t=r),n.automaticDataCollectionEnabled===void 0&&(n.automaticDataCollectionEnabled=!0),t||(t=Vu()),!t)throw zt.create("no-options");const i={...n,...t};i.releaseOnDeref!==void 0&&delete i.releaseOnDeref;const s=h=>[...h].reduce((p,g)=>Math.imul(31,p)+g.charCodeAt(0)|0,0);if(n.releaseOnDeref!==void 0&&typeof FinalizationRegistry>"u")throw zt.create("finalization-registry-not-supported",{});const o=""+s(JSON.stringify(i)),c=Gi.get(o);if(c)return c.incRefCount(n.releaseOnDeref),c;const l=new Tg(o);for(const h of Wi.values())l.addComponent(h);const u=new _I(t,n,o,l);return Gi.set(o,u),u}function EI(r=gr){const e=mr.get(r);if(!e&&r===gr&&Vu())return Uu();if(!e)throw zt.create("no-app",{appName:r});return e}function II(){return Array.from(mr.values())}async function Bu(r){let e=!1;const t=r.name;mr.has(t)?(e=!0,mr.delete(t)):Gi.has(t)&&r.decRefCount()<=0&&(Gi.delete(t),e=!0),e&&(await Promise.all(r.container.getProviders().map(n=>n.delete())),r.isDeleted=!0)}function tn(r,e,t){let n=pI[r]??r;t&&(n+=`-${t}`);const i=n.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${n}" with version "${e}":`];i&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Dn.warn(o.join(" "));return}yr(new bn(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}function xg(r,e){if(r!==null&&typeof r!="function")throw zt.create("invalid-log-argument");RE(r,e)}function Dg(r){SE(r)}/**
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
 */const vI="firebase-heartbeat-database",TI=1,vo="firebase-heartbeat-store";let Al=null;function Ng(){return Al||(Al=ME(vI,TI,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(vo)}catch(t){console.warn(t)}}}}).catch(r=>{throw zt.create("idb-open",{originalErrorMessage:r.message})})),Al}async function bI(r){try{const t=(await Ng()).transaction(vo),n=await t.objectStore(vo).get(Vg(r));return await t.done,n}catch(e){if(e instanceof xt)Dn.warn(e.message);else{const t=zt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Dn.warn(t.message)}}}async function uf(r,e){try{const n=(await Ng()).transaction(vo,"readwrite");await n.objectStore(vo).put(e,Vg(r)),await n.done}catch(t){if(t instanceof xt)Dn.warn(t.message);else{const n=zt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Dn.warn(n.message)}}}function Vg(r){return`${r.name}!${r.options.appId}`}/**
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
 */const AI=1024,SI=30;class RI{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new CI(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=df();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>SI){const o=kI(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){Dn.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=df(),{heartbeatsToSend:n,unsentEntries:i}=PI(this._heartbeatsCache.heartbeats),s=Ya(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Dn.warn(t),""}}}function df(){return new Date().toISOString().substring(0,10)}function PI(r,e=AI){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),hf(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),hf(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class CI{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Eo()?fE().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await bI(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return uf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return uf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function hf(r){return Ya(JSON.stringify({version:2,heartbeats:r})).length}function kI(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
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
 */function xI(r){yr(new bn("platform-logger",e=>new UE(e),"PRIVATE")),yr(new bn("heartbeat",e=>new RI(e),"PRIVATE")),tn(Xa,Kl,r),tn(Xa,Kl,"esm2020"),tn("fire-js","")}xI("");const DI=Object.freeze(Object.defineProperty({__proto__:null,FirebaseError:xt,SDK_VERSION:Sr,_DEFAULT_ENTRY_NAME:gr,_addComponent:Io,_addOrOverwriteComponent:Rg,_apps:mr,_clearComponents:mI,_components:Wi,_getProvider:Pg,_isFirebaseApp:Fu,_isFirebaseServerApp:Ue,_isFirebaseServerAppSettings:Cg,_registerComponent:yr,_removeServiceInstance:gI,_serverApps:Gi,deleteApp:Bu,getApp:EI,getApps:II,initializeApp:Uu,initializeServerApp:wI,onLog:xg,registerVersion:tn,setLogLevel:Dg},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class NI{constructor(e,t){this._delegate=e,this.firebase=t,Io(e,new bn("app-compat",()=>this,"PUBLIC")),this.container=e.container}get automaticDataCollectionEnabled(){return this._delegate.automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this._delegate.automaticDataCollectionEnabled=e}get name(){return this._delegate.name}get options(){return this._delegate.options}delete(){return new Promise(e=>{this._delegate.checkDestroyed(),e()}).then(()=>(this.firebase.INTERNAL.removeApp(this.name),Bu(this._delegate)))}_getService(e,t=gr){var i;this._delegate.checkDestroyed();const n=this._delegate.container.getProvider(e);return!n.isInitialized()&&((i=n.getComponent())==null?void 0:i.instantiationMode)==="EXPLICIT"&&n.initialize(),n.getImmediate({identifier:t})}_removeServiceInstance(e,t=gr){this._delegate.container.getProvider(e).clearInstance(t)}_addComponent(e){Io(this._delegate,e)}_addOrOverwriteComponent(e){Rg(this._delegate,e)}toJSON(){return{name:this.name,automaticDataCollectionEnabled:this.automaticDataCollectionEnabled,options:this.options}}}/**
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
 */const VI={"no-app":"No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance."},ff=new yi("app-compat","Firebase",VI);/**
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
 */function OI(r){const e={},t={__esModule:!0,initializeApp:s,app:i,registerVersion:tn,setLogLevel:Dg,onLog:xg,apps:null,SDK_VERSION:Sr,INTERNAL:{registerComponent:c,removeApp:n,useAsService:l,modularAPIs:DI}};t.default=t,Object.defineProperty(t,"apps",{get:o});function n(u){delete e[u]}function i(u){if(u=u||gr,!rf(e,u))throw ff.create("no-app",{appName:u});return e[u]}i.App=r;function s(u,h={}){const p=Uu(u,h);if(rf(e,p.name))return e[p.name];const g=new r(p,t);return e[p.name]=g,g}function o(){return Object.keys(e).map(u=>e[u])}function c(u){const h=u.name,p=h.replace("-compat","");if(yr(u)&&u.type==="PUBLIC"){const g=(E=i())=>{if(typeof E[p]!="function")throw ff.create("invalid-app-argument",{appName:h});return E[p]()};u.serviceProps!==void 0&&Ja(g,u.serviceProps),t[p]=g,r.prototype[p]=function(...E){return this._getService.bind(this,h).apply(this,u.multipleInstances?E:[])}}return u.type==="PUBLIC"?t[p]:null}function l(u,h){return h==="serverAuth"?null:h}return t}/**
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
 */function Og(){const r=OI(NI);r.INTERNAL={...r.INTERNAL,createFirebaseNamespace:Og,extendNamespace:e,createSubscribe:vg,ErrorFactory:yi,deepExtend:Ja};function e(t){Ja(r,t)}return r}const MI=Og();/**
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
 */const pf=new Tc("@firebase/app-compat"),LI="@firebase/app-compat",FI="0.5.6";/**
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
 */function UI(r){tn(LI,FI,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */try{const r=Du();if(r.firebase!==void 0){pf.warn(`
      Warning: Firebase is already defined in the global scope. Please make sure
      Firebase library is only loaded once.
    `);const e=r.firebase.SDK_VERSION;e&&e.indexOf("LITE")>=0&&pf.warn(`
        Warning: You are trying to load Firebase while using Firebase Performance standalone script.
        You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
        `)}}catch{}const Be=MI;UI();var BI="firebase",$I="12.7.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Be.registerVersion(BI,$I,"app-compat");const $s={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",TWITTER:"twitter.com"},Ri={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qI(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function Mg(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const KI=qI,zI=Mg,Lg=new yi("auth","Firebase",Mg());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Za=new Tc("@firebase/auth");function jI(r,...e){Za.logLevel<=Ee.WARN&&Za.warn(`Auth (${Sr}): ${r}`,...e)}function Oa(r,...e){Za.logLevel<=Ee.ERROR&&Za.error(`Auth (${Sr}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vt(r,...e){throw qu(r,...e)}function at(r,...e){return qu(r,...e)}function $u(r,e,t){const n={...zI(),[e]:t};return new yi("auth","Firebase",n).create(e,{appName:r.name})}function gt(r){return $u(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function ys(r,e,t){const n=t;if(!(e instanceof n))throw n.name!==e.constructor.name&&vt(r,"argument-error"),$u(r,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function qu(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return Lg.create(r,...e)}function K(r,e,...t){if(!r)throw qu(e,...t)}function _n(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Oa(e),new Error(e)}function sn(r,e){r||_n(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function To(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.href)||""}function Ku(){return gf()==="http:"||gf()==="https:"}function gf(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function GI(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Ku()||_g()||"connection"in navigator)?navigator.onLine:!0}function WI(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jo{constructor(e,t){this.shortDelay=e,this.longDelay=t,sn(t>e,"Short delay should be less than long delay!"),this.isMobile=uE()||Ou()}get(){return GI()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zu(r,e){sn(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fg{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;_n("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;_n("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;_n("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const HI={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const QI=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],YI=new jo(3e4,6e4);function He(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function Qe(r,e,t,n,i={}){return Ug(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=ms({key:r.config.apiKey,...o}).slice(1),l=await r._getAdditionalHeaders();l["Content-Type"]="application/json",r.languageCode&&(l["X-Firebase-Locale"]=r.languageCode);const u={method:e,headers:l,...s};return hE()||(u.referrerPolicy="no-referrer"),r.emulatorConfig&&gs(r.emulatorConfig.host)&&(u.credentials="include"),Fg.fetch()(await Bg(r,r.config.apiHost,t,c),u)})}async function Ug(r,e,t){r._canInitEmulator=!1;const n={...HI,...e};try{const i=new XI(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw Js(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[l,u]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw Js(r,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw Js(r,"email-already-in-use",o);if(l==="USER_DISABLED")throw Js(r,"user-disabled",o);const h=n[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(u)throw $u(r,h,u);vt(r,h)}}catch(i){if(i instanceof xt)throw i;vt(r,"network-request-failed",{message:String(i)})}}async function Mn(r,e,t,n,i={}){const s=await Qe(r,e,t,n,i);return"mfaPendingCredential"in s&&vt(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function Bg(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?zu(r.config,i):`${r.config.apiScheme}://${i}`;return QI.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function JI(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class XI{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(at(this.auth,"network-request-failed")),YI.get())})}}function Js(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=at(r,e,n);return i.customData._tokenResponse=t,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mf(r){return r!==void 0&&r.getResponse!==void 0}function yf(r){return r!==void 0&&r.enterprise!==void 0}class $g{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return JI(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ZI(r){return(await Qe(r,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function qg(r,e){return Qe(r,"GET","/v2/recaptchaConfig",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ev(r,e){return Qe(r,"POST","/v1/accounts:delete",e)}async function tv(r,e){return Qe(r,"POST","/v1/accounts:update",e)}async function ec(r,e){return Qe(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function so(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function nv(r,e=!1){const t=ue(r),n=await t.getIdToken(e),i=bc(n);K(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:so(Sl(i.auth_time)),issuedAtTime:so(Sl(i.iat)),expirationTime:so(Sl(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function Sl(r){return Number(r)*1e3}function bc(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Oa("JWT malformed, contained fewer than 3 sections"),null;try{const i=xu(t);return i?JSON.parse(i):(Oa("Failed to decode base64 JWT payload"),null)}catch(i){return Oa("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function _f(r){const e=bc(r);return K(e,"internal-error"),K(typeof e.exp<"u","internal-error"),K(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nn(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof xt&&rv(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function rv({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class iv{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zl{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=so(this.lastLoginAt),this.creationTime=so(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function bo(r){var p;const e=r.auth,t=await r.getIdToken(),n=await Nn(r,ec(e,{idToken:t}));K(n==null?void 0:n.users.length,e,"internal-error");const i=n.users[0];r._notifyReloadListener(i);const s=(p=i.providerUserInfo)!=null&&p.length?Kg(i.providerUserInfo):[],o=ov(r.providerData,s),c=r.isAnonymous,l=!(r.email&&i.passwordHash)&&!(o!=null&&o.length),u=c?l:!1,h={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new zl(i.createdAt,i.lastLoginAt),isAnonymous:u};Object.assign(r,h)}async function sv(r){const e=ue(r);await bo(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function ov(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function Kg(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function av(r,e){const t=await Ug(r,{},async()=>{const n=ms({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await Bg(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:n};return r.emulatorConfig&&gs(r.emulatorConfig.host)&&(l.credentials="include"),Fg.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function cv(r,e){return Qe(r,"POST","/v2/accounts:revokeToken",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bi{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){K(e.idToken,"internal-error"),K(typeof e.idToken<"u","internal-error"),K(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):_f(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){K(e.length!==0,"internal-error");const t=_f(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(K(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await av(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new Bi;return n&&(K(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(K(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(K(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Bi,this.toJSON())}_performRefresh(){return _n("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function er(r,e){K(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class en{constructor({uid:e,auth:t,stsTokenManager:n,...i}){this.providerId="firebase",this.proactiveRefresh=new iv(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new zl(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Nn(this,this.stsTokenManager.getToken(this.auth,e));return K(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return nv(this,e)}reload(){return sv(this)}_assign(e){this!==e&&(K(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new en({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){K(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await bo(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Ue(this.auth.app))return Promise.reject(gt(this.auth));const e=await this.getIdToken();return await Nn(this,ev(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,u=t.createdAt??void 0,h=t.lastLoginAt??void 0,{uid:p,emailVerified:g,isAnonymous:E,providerData:N,stsTokenManager:V}=t;K(p&&V,e,"internal-error");const O=Bi.fromJSON(this.name,V);K(typeof p=="string",e,"internal-error"),er(n,e.name),er(i,e.name),K(typeof g=="boolean",e,"internal-error"),K(typeof E=="boolean",e,"internal-error"),er(s,e.name),er(o,e.name),er(c,e.name),er(l,e.name),er(u,e.name),er(h,e.name);const Y=new en({uid:p,auth:e,email:i,emailVerified:g,displayName:n,isAnonymous:E,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:O,createdAt:u,lastLoginAt:h});return N&&Array.isArray(N)&&(Y.providerData=N.map(ee=>({...ee}))),l&&(Y._redirectEventId=l),Y}static async _fromIdTokenResponse(e,t,n=!1){const i=new Bi;i.updateFromServerResponse(t);const s=new en({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await bo(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];K(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?Kg(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new Bi;c.updateFromIdToken(n);const l=new en({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),u={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new zl(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(l,u),l}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wf=new Map;function Kt(r){sn(r instanceof Function,"Expected a class definition");let e=wf.get(r);return e?(sn(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,wf.set(r,e),e)}/**
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
 */class zg{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}zg.type="NONE";const Hi=zg;/**
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
 */function ti(r,e,t){return`firebase:${r}:${e}:${t}`}class $i{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=ti(this.userKey,i.apiKey,s),this.fullPersistenceKey=ti("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ec(this.auth,{idToken:e}).catch(()=>{});return t?en._fromGetAccountInfoResponse(this.auth,t,e):null}return en._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new $i(Kt(Hi),e,n);const i=(await Promise.all(t.map(async u=>{if(await u._isAvailable())return u}))).filter(u=>u);let s=i[0]||Kt(Hi);const o=ti(n,e.config.apiKey,e.name);let c=null;for(const u of t)try{const h=await u._get(o);if(h){let p;if(typeof h=="string"){const g=await ec(e,{idToken:h}).catch(()=>{});if(!g)break;p=await en._fromGetAccountInfoResponse(e,g,h)}else p=en._fromJSON(e,h);u!==s&&(c=p),s=u;break}}catch{}const l=i.filter(u=>u._shouldAllowMigration);return!s._shouldAllowMigration||!l.length?new $i(s,e,n):(s=l[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async u=>{if(u!==s)try{await u._remove(o)}catch{}})),new $i(s,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ef(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Hg(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(jg(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Qg(e))return"Blackberry";if(Yg(e))return"Webos";if(Gg(e))return"Safari";if((e.includes("chrome/")||Wg(e))&&!e.includes("edge/"))return"Chrome";if(Go(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function jg(r=Ke()){return/firefox\//i.test(r)}function Gg(r=Ke()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Wg(r=Ke()){return/crios\//i.test(r)}function Hg(r=Ke()){return/iemobile/i.test(r)}function Go(r=Ke()){return/android/i.test(r)}function Qg(r=Ke()){return/blackberry/i.test(r)}function Yg(r=Ke()){return/webos/i.test(r)}function Wo(r=Ke()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function lv(r=Ke()){return/(iPad|iPhone|iPod).*OS 7_\d/i.test(r)||/(iPad|iPhone|iPod).*OS 8_\d/i.test(r)}function uv(r=Ke()){var e;return Wo(r)&&!!((e=window.navigator)!=null&&e.standalone)}function dv(){return wg()&&document.documentMode===10}function Jg(r=Ke()){return Wo(r)||Go(r)||Yg(r)||Qg(r)||/windows phone/i.test(r)||Hg(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xg(r,e=[]){let t;switch(r){case"Browser":t=Ef(Ke());break;case"Worker":t=`${Ef(Ke())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${Sr}/${n}`}/**
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
 */class hv{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const l=e(s);o(l)}catch(l){c(l)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
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
 */async function fv(r,e={}){return Qe(r,"GET","/v2/passwordPolicy",He(r,e))}/**
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
 */const pv=6;class gv{constructor(e){var n;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??pv,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((n=e.allowedNonAlphanumericCharacters)==null?void 0:n.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mv{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new If(this),this.idTokenSubscription=new If(this),this.beforeStateQueue=new hv(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Lg,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=Kt(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await $i.create(this,e),(n=this._resolvePersistenceManagerAvailable)==null||n.call(this),!this._deleted)){if((i=this._popupRedirectResolver)!=null&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)==null?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ec(this,{idToken:e}),n=await en._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var s;if(Ue(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(s=this.redirectUser)==null?void 0:s._redirectEventId,c=n==null?void 0:n._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(n=l.user,i=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(n)}catch(o){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return K(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await bo(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=WI()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Ue(this.app))return Promise.reject(gt(this));const t=e?ue(e):null;return t&&K(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&K(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Ue(this.app)?Promise.reject(gt(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Ue(this.app)?Promise.reject(gt(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Kt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await fv(this),t=new gv(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new yi("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await cv(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&Kt(e)||this._popupRedirectResolver;K(t,this,"argument-error"),this.redirectPersistenceManager=await $i.create(this,[Kt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)==null?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(K(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,n,i);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return K(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Xg(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var i;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((i=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:i.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){var t;if(Ue(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&jI(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function ze(r){return ue(r)}class If{constructor(e){this.auth=e,this.observer=null,this.addObserver=vg(t=>this.observer=t)}get next(){return K(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ho={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function yv(r){Ho=r}function ju(r){return Ho.loadJS(r)}function _v(){return Ho.recaptchaV2Script}function wv(){return Ho.recaptchaEnterpriseScript}function Ev(){return Ho.gapiScript}function Zg(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iv=500,vv=6e4,Ra=1e12;class Tv{constructor(e){this.auth=e,this.counter=Ra,this._widgets=new Map}render(e,t){const n=this.counter;return this._widgets.set(n,new Sv(e,this.auth.name,t||{})),this.counter++,n}reset(e){var n;const t=e||Ra;(n=this._widgets.get(t))==null||n.delete(),this._widgets.delete(t)}getResponse(e){var n;const t=e||Ra;return((n=this._widgets.get(t))==null?void 0:n.getResponse())||""}async execute(e){var n;const t=e||Ra;return(n=this._widgets.get(t))==null||n.execute(),""}}class bv{constructor(){this.enterprise=new Av}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Av{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Sv{constructor(e,t,n){this.params=n,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;K(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=Rv(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},vv)},Iv))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function Rv(r){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let n=0;n<r;n++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const Pv="recaptcha-enterprise",oo="NO_RECAPTCHA";class em{constructor(e){this.type=Pv,this.auth=ze(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{qg(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(l=>{if(l.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const u=new $g(l);return s.tenantId==null?s._agentRecaptchaConfig=u:s._tenantRecaptchaConfigs[s.tenantId]=u,o(u.siteKey)}}).catch(l=>{c(l)})})}function i(s,o,c){const l=window.grecaptcha;yf(l)?l.enterprise.ready(()=>{l.enterprise.execute(s,{action:e}).then(u=>{o(u)}).catch(()=>{o(oo)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new bv().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&yf(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let l=wv();l.length!==0&&(l+=c),ju(l).then(()=>{i(c,s,o)}).catch(u=>{o(u)})}}).catch(c=>{o(c)})})}}async function qs(r,e,t,n=!1,i=!1){const s=new em(r);let o;if(i)o=oo;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const l=c.phoneEnrollmentInfo.phoneNumber,u=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:l,recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const l=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function ur(r,e,t,n,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if((s=r._getRecaptchaConfig())!=null&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await qs(r,e,t,t==="getOobCode");return n(r,c)}else return n(r,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await qs(r,e,t,t==="getOobCode");return n(r,l)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if((o=r._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await qs(r,e,t);return n(r,c).catch(async l=>{var u;if(((u=r._getRecaptchaConfig())==null?void 0:u.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(l.code==="auth/missing-recaptcha-token"||l.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const h=await qs(r,e,t,!1,!0);return n(r,h)}return Promise.reject(l)})}else{const c=await qs(r,e,t,!1,!0);return n(r,c)}else return Promise.reject(i+" provider is not supported.")}async function Cv(r){const e=ze(r),t=await qg(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),n=new $g(t);e.tenantId==null?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,n.isAnyProviderEnabled()&&new em(e).verify()}function kv(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(Kt);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function xv(r,e,t){const n=ze(r);K(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=tm(e),{host:o,port:c}=Dv(e),l=c===null?"":`:${c}`,u={url:`${s}//${o}${l}/`},h=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){K(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),K(pr(u,n.config.emulator)&&pr(h,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=u,n.emulatorConfig=h,n.settings.appVerificationDisabledForTesting=!0,gs(o)?(gg(`${s}//${o}${l}`),mg("Auth",!0)):i||Nv()}function tm(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function Dv(r){const e=tm(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:vf(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:vf(o)}}}function vf(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function Nv(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _s{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return _n("not implemented")}_getIdTokenResponse(e){return _n("not implemented")}_linkToIdToken(e,t){return _n("not implemented")}_getReauthenticationResolver(e){return _n("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nm(r,e){return Qe(r,"POST","/v1/accounts:resetPassword",He(r,e))}async function Vv(r,e){return Qe(r,"POST","/v1/accounts:update",e)}async function Ov(r,e){return Qe(r,"POST","/v1/accounts:signUp",e)}async function Mv(r,e){return Qe(r,"POST","/v1/accounts:update",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lv(r,e){return Mn(r,"POST","/v1/accounts:signInWithPassword",He(r,e))}async function Ac(r,e){return Qe(r,"POST","/v1/accounts:sendOobCode",He(r,e))}async function Fv(r,e){return Ac(r,e)}async function Uv(r,e){return Ac(r,e)}async function Bv(r,e){return Ac(r,e)}async function $v(r,e){return Ac(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function qv(r,e){return Mn(r,"POST","/v1/accounts:signInWithEmailLink",He(r,e))}async function Kv(r,e){return Mn(r,"POST","/v1/accounts:signInWithEmailLink",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ao extends _s{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new Ao(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new Ao(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return ur(e,t,"signInWithPassword",Lv,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return qv(e,{email:this._email,oobCode:this._password});default:vt(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return ur(e,n,"signUpPassword",Ov,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Kv(e,{idToken:t,email:this._email,oobCode:this._password});default:vt(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xn(r,e){return Mn(r,"POST","/v1/accounts:signInWithIdp",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zv="http://localhost";class An extends _s{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new An(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):vt("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,...s}=t;if(!n||!i)return null;const o=new An(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return xn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,xn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,xn(e,t)}buildRequest(){const e={requestUri:zv,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ms(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Tf(r,e){return Qe(r,"POST","/v1/accounts:sendVerificationCode",He(r,e))}async function jv(r,e){return Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",He(r,e))}async function Gv(r,e){const t=await Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",He(r,e));if(t.temporaryProof)throw Js(r,"account-exists-with-different-credential",t);return t}const Wv={USER_NOT_FOUND:"user-not-found"};async function Hv(r,e){const t={...e,operation:"REAUTH"};return Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",He(r,t),Wv)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ni extends _s{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new ni({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new ni({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return jv(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return Gv(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return Hv(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:n,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:n,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s}=e;return!n&&!t&&!i&&!s?null:new ni({verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qv(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function Yv(r){const e=Ui(Ys(r)).link,t=e?Ui(Ys(e)).deep_link_id:null,n=Ui(Ys(r)).deep_link_id;return(n?Ui(Ys(n)).link:null)||n||t||e||r}class Sc{constructor(e){const t=Ui(Ys(e)),n=t.apiKey??null,i=t.oobCode??null,s=Qv(t.mode??null);K(n&&i&&s,"argument-error"),this.apiKey=n,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=Yv(e);try{return new Sc(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rr{constructor(){this.providerId=Rr.PROVIDER_ID}static credential(e,t){return Ao._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=Sc.parseLink(t);return K(n,"argument-error"),Ao._fromEmailAndCode(e,n.code,n.tenantId)}}Rr.PROVIDER_ID="password";Rr.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Rr.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ln{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
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
 */class ws extends Ln{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class qi extends ws{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return K("providerId"in t&&"signInMethod"in t,"argument-error"),An._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return K(e.idToken||e.accessToken,"argument-error"),An._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return qi.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return qi.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!n&&!i&&!t&&!s||!c)return null;try{return new qi(c)._credential({idToken:t,accessToken:n,nonce:o,pendingToken:s})}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pn extends ws{constructor(){super("facebook.com")}static credential(e){return An._fromParams({providerId:pn.PROVIDER_ID,signInMethod:pn.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return pn.credentialFromTaggedObject(e)}static credentialFromError(e){return pn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return pn.credential(e.oauthAccessToken)}catch{return null}}}pn.FACEBOOK_SIGN_IN_METHOD="facebook.com";pn.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gn extends ws{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return An._fromParams({providerId:gn.PROVIDER_ID,signInMethod:gn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return gn.credentialFromTaggedObject(e)}static credentialFromError(e){return gn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return gn.credential(t,n)}catch{return null}}}gn.GOOGLE_SIGN_IN_METHOD="google.com";gn.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mn extends ws{constructor(){super("github.com")}static credential(e){return An._fromParams({providerId:mn.PROVIDER_ID,signInMethod:mn.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return mn.credentialFromTaggedObject(e)}static credentialFromError(e){return mn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return mn.credential(e.oauthAccessToken)}catch{return null}}}mn.GITHUB_SIGN_IN_METHOD="github.com";mn.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jv="http://localhost";class Qi extends _s{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return xn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,xn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,xn(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,pendingToken:s}=t;return!n||!i||!s||n!==i?null:new Qi(n,s)}static _create(e,t){return new Qi(e,t)}buildRequest(){return{requestUri:Jv,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xv="saml.";class tc extends Ln{constructor(e){K(e.startsWith(Xv),"argument-error"),super(e)}static credentialFromResult(e){return tc.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return tc.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=Qi.fromJSON(e);return K(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:n}=e;if(!t||!n)return null;try{return Qi._create(n,t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yn extends ws{constructor(){super("twitter.com")}static credential(e,t){return An._fromParams({providerId:yn.PROVIDER_ID,signInMethod:yn.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return yn.credentialFromTaggedObject(e)}static credentialFromError(e){return yn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return yn.credential(t,n)}catch{return null}}}yn.TWITTER_SIGN_IN_METHOD="twitter.com";yn.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function rm(r,e){return Mn(r,"POST","/v1/accounts:signUp",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await en._fromIdTokenResponse(e,n,i),o=bf(n);return new Jt({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=bf(n);return new Jt({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function bf(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zv(r){var i;if(Ue(r.app))return Promise.reject(gt(r));const e=ze(r);if(await e._initializationPromise,(i=e.currentUser)!=null&&i.isAnonymous)return new Jt({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await rm(e,{returnSecureToken:!0}),n=await Jt._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(n.user),n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc extends xt{constructor(e,t,n,i){super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,nc.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new nc(e,t,n,i)}}function im(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?nc._fromErrorAndOperation(r,s,e,n):s})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sm(r){return new Set(r.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function eT(r,e){const t=ue(r);await Rc(!0,t,e);const{providerUserInfo:n}=await tv(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=sm(n||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function Gu(r,e,t=!1){const n=await Nn(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return Jt._forOperation(r,"link",n)}async function Rc(r,e,t){await bo(e);const n=sm(e.providerData),i=r===!1?"provider-already-linked":"no-such-provider";K(n.has(t)===r,e.auth,i)}/**
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
 */async function om(r,e,t=!1){const{auth:n}=r;if(Ue(n.app))return Promise.reject(gt(n));const i="reauthenticate";try{const s=await Nn(r,im(n,i,e,r),t);K(s.idToken,n,"internal-error");const o=bc(s.idToken);K(o,n,"internal-error");const{sub:c}=o;return K(r.uid===c,n,"user-mismatch"),Jt._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&vt(n,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function am(r,e,t=!1){if(Ue(r.app))return Promise.reject(gt(r));const n="signIn",i=await im(r,n,e),s=await Jt._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function Pc(r,e){return am(ze(r),e)}async function cm(r,e){const t=ue(r);return await Rc(!1,t,e.providerId),Gu(t,e)}async function lm(r,e){return om(ue(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function tT(r,e){return Mn(r,"POST","/v1/accounts:signInWithCustomToken",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nT(r,e){if(Ue(r.app))return Promise.reject(gt(r));const t=ze(r),n=await tT(t,{token:e,returnSecureToken:!0}),i=await Jt._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qo{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Wu._fromServerResponse(e,t):"totpInfo"in t?Hu._fromServerResponse(e,t):vt(e,"internal-error")}}class Wu extends Qo{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Wu(t)}}class Hu extends Qo{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new Hu(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cc(r,e,t){var n;K(((n=t.url)==null?void 0:n.length)>0,r,"invalid-continue-uri"),K(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),K(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(K(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(K(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qu(r){const e=ze(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function rT(r,e,t){const n=ze(r),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&Cc(n,i,t),await ur(n,i,"getOobCode",Uv,"EMAIL_PASSWORD_PROVIDER")}async function iT(r,e,t){await nm(ue(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Qu(r),n})}async function sT(r,e){await Mv(ue(r),{oobCode:e})}async function um(r,e){const t=ue(r),n=await nm(t,{oobCode:e}),i=n.requestType;switch(K(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":K(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":K(n.mfaInfo,t,"internal-error");default:K(n.email,t,"internal-error")}let s=null;return n.mfaInfo&&(s=Qo._fromServerResponse(ze(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:s},operation:i}}async function oT(r,e){const{data:t}=await um(ue(r),e);return t.email}async function aT(r,e,t){if(Ue(r.app))return Promise.reject(gt(r));const n=ze(r),o=await ur(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",rm,"EMAIL_PASSWORD_PROVIDER").catch(l=>{throw l.code==="auth/password-does-not-meet-requirements"&&Qu(r),l}),c=await Jt._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function cT(r,e,t){return Ue(r.app)?Promise.reject(gt(r)):Pc(ue(r),Rr.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Qu(r),n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function lT(r,e,t){const n=ze(r),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){K(c.handleCodeInApp,n,"argument-error"),c&&Cc(n,o,c)}s(i,t),await ur(n,i,"getOobCode",Bv,"EMAIL_PASSWORD_PROVIDER")}function uT(r,e){const t=Sc.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function dT(r,e,t){if(Ue(r.app))return Promise.reject(gt(r));const n=ue(r),i=Rr.credentialWithLink(e,t||To());return K(i._tenantId===(n.tenantId||null),n,"tenant-id-mismatch"),Pc(n,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hT(r,e){return Qe(r,"POST","/v1/accounts:createAuthUri",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function fT(r,e){const t=Ku()?To():"http://localhost",n={identifier:e,continueUri:t},{signinMethods:i}=await hT(ue(r),n);return i||[]}async function pT(r,e){const t=ue(r),i={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&Cc(t.auth,i,e);const{email:s}=await Fv(t.auth,i);s!==r.email&&await r.reload()}async function gT(r,e,t){const n=ue(r),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await r.getIdToken(),newEmail:e};t&&Cc(n.auth,s,t);const{email:o}=await $v(n.auth,s);o!==r.email&&await r.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function mT(r,e){return Qe(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function yT(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=ue(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Nn(n,mT(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function _T(r,e){const t=ue(r);return Ue(t.auth.app)?Promise.reject(gt(t.auth)):dm(t,e,null)}function wT(r,e){return dm(ue(r),null,e)}async function dm(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Nn(r,Vv(n,s));await r._updateTokensIfNecessary(o,!0)}/**
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
 */function ET(r){var i,s;if(!r)return null;const{providerId:e}=r,t=r.rawUserInfo?JSON.parse(r.rawUserInfo):{},n=r.isNewUser||r.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(r!=null&&r.idToken)){const o=(s=(i=bc(r.idToken))==null?void 0:i.firebase)==null?void 0:s.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new Ki(n,c)}}if(!e)return null;switch(e){case"facebook.com":return new IT(n,t);case"github.com":return new vT(n,t);case"google.com":return new TT(n,t);case"twitter.com":return new bT(n,t,r.screenName||null);case"custom":case"anonymous":return new Ki(n,null);default:return new Ki(n,e,t)}}class Ki{constructor(e,t,n={}){this.isNewUser=e,this.providerId=t,this.profile=n}}class hm extends Ki{constructor(e,t,n,i){super(e,t,n),this.username=i}}class IT extends Ki{constructor(e,t){super(e,"facebook.com",t)}}class vT extends hm{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class TT extends Ki{constructor(e,t){super(e,"google.com",t)}}class bT extends hm{constructor(e,t,n){super(e,"twitter.com",t,n)}}function AT(r){const{user:e,_tokenResponse:t}=r;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:ET(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jr{constructor(e,t,n){this.type=e,this.credential=t,this.user=n}static _fromIdtoken(e,t){return new Jr("enroll",e,t)}static _fromMfaPendingCredential(e){return new Jr("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,n;if(e!=null&&e.multiFactorSession){if((t=e.multiFactorSession)!=null&&t.pendingCredential)return Jr._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if((n=e.multiFactorSession)!=null&&n.idToken)return Jr._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yu{constructor(e,t,n){this.session=e,this.hints=t,this.signInResolver=n}static _fromError(e,t){const n=ze(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>Qo._fromServerResponse(n,c));K(i.mfaPendingCredential,n,"internal-error");const o=Jr._fromMfaPendingCredential(i.mfaPendingCredential);return new Yu(o,s,async c=>{const l=await c._process(n,o);delete i.mfaInfo,delete i.mfaPendingCredential;const u={...i,idToken:l.idToken,refreshToken:l.refreshToken};switch(t.operationType){case"signIn":const h=await Jt._fromIdTokenResponse(n,t.operationType,u);return await n._updateCurrentUser(h.user),h;case"reauthenticate":return K(t.user,n,"internal-error"),Jt._forOperation(t.user,t.operationType,u);default:vt(n,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function ST(r,e){var i;const t=ue(r),n=e;return K(e.customData.operationType,t,"argument-error"),K((i=n.customData._serverResponse)==null?void 0:i.mfaPendingCredential,t,"argument-error"),Yu._fromError(t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Af(r,e){return Qe(r,"POST","/v2/accounts/mfaEnrollment:start",He(r,e))}function RT(r,e){return Qe(r,"POST","/v2/accounts/mfaEnrollment:finalize",He(r,e))}function PT(r,e){return Qe(r,"POST","/v2/accounts/mfaEnrollment:withdraw",He(r,e))}class Ju{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(n=>Qo._fromServerResponse(e.auth,n)))})}static _fromUser(e){return new Ju(e)}async getSession(){return Jr._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const n=e,i=await this.getSession(),s=await Nn(this.user,n._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,n=await this.user.getIdToken();try{const i=await Nn(this.user,PT(this.user.auth,{idToken:n,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const Rl=new WeakMap;function CT(r){const e=ue(r);return Rl.has(e)||Rl.set(e,Ju._fromUser(e)),Rl.get(e)}const rc="__sak";/**
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
 */class fm{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(rc,"1"),this.storage.removeItem(rc),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kT=1e3,xT=10;class pm extends fm{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Jg(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);dv()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,xT):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},kT)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}pm.type="LOCAL";const Xu=pm;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gm extends fm{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}gm.type="SESSION";const si=gm;/**
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
 */function DT(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class kc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new kc(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async u=>u(t.origin,s)),l=await DT(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}kc.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yo(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
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
 */class NT{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,l)=>{const u=Yo("",20);i.port1.start();const h=setTimeout(()=>{l(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(p){const g=p;if(g.data.eventId===u)switch(g.data.status){case"ack":clearTimeout(h),s=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(g.data.response);break;default:clearTimeout(h),clearTimeout(s),l(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:u,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tt(){return window}function VT(r){tt().location.href=r}/**
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
 */function Zu(){return typeof tt().WorkerGlobalScope<"u"&&typeof tt().importScripts=="function"}async function OT(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function MT(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)==null?void 0:r.controller)||null}function LT(){return Zu()?self:null}/**
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
 */const mm="firebaseLocalStorageDb",FT=1,ic="firebaseLocalStorage",ym="fbase_key";class Jo{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function xc(r,e){return r.transaction([ic],e?"readwrite":"readonly").objectStore(ic)}function UT(){const r=indexedDB.deleteDatabase(mm);return new Jo(r).toPromise()}function jl(){const r=indexedDB.open(mm,FT);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(ic,{keyPath:ym})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(ic)?e(n):(n.close(),await UT(),e(await jl()))})})}async function Sf(r,e,t){const n=xc(r,!0).put({[ym]:e,value:t});return new Jo(n).toPromise()}async function BT(r,e){const t=xc(r,!1).get(e),n=await new Jo(t).toPromise();return n===void 0?null:n.value}function Rf(r,e){const t=xc(r,!0).delete(e);return new Jo(t).toPromise()}const $T=800,qT=3;class _m{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await jl(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>qT)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Zu()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=kc._getInstance(LT()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await OT(),!this.activeServiceWorker)return;this.sender=new NT(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(n=e[0])!=null&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||MT()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await jl();return await Sf(e,rc,"1"),await Rf(e,rc),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Sf(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>BT(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Rf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=xc(i,!1).getAll();return new Jo(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),$T)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}_m.type="LOCAL";const So=_m;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pf(r,e){return Qe(r,"POST","/v2/accounts/mfaSignIn:start",He(r,e))}function KT(r,e){return Qe(r,"POST","/v2/accounts/mfaSignIn:finalize",He(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pl=Zg("rcb"),zT=new jo(3e4,6e4);class jT{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=tt().grecaptcha)!=null&&e.render)}load(e,t=""){return K(GT(t),e,"argument-error"),this.shouldResolveImmediately(t)&&mf(tt().grecaptcha)?Promise.resolve(tt().grecaptcha):new Promise((n,i)=>{const s=tt().setTimeout(()=>{i(at(e,"network-request-failed"))},zT.get());tt()[Pl]=()=>{tt().clearTimeout(s),delete tt()[Pl];const c=tt().grecaptcha;if(!c||!mf(c)){i(at(e,"internal-error"));return}const l=c.render;c.render=(u,h)=>{const p=l(u,h);return this.counter++,p},this.hostLanguage=t,n(c)};const o=`${_v()}?${ms({onload:Pl,render:"explicit",hl:t})}`;ju(o).catch(()=>{clearTimeout(s),i(at(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=tt().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function GT(r){return r.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(r)}class WT{async load(e){return new Tv(e)}clearedOneInstance(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ao="recaptcha",HT={theme:"light",type:"image"};let QT=class{constructor(e,t,n={...HT}){this.parameters=n,this.type=ao,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=ze(e),this.isInvisible=this.parameters.size==="invisible",K(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;K(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new WT:new jT,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),n=t.getResponse(e);return n||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){K(!this.parameters.sitekey,this.auth,"argument-error"),K(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),K(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(n=>n(t)),typeof e=="function")e(t);else if(typeof e=="string"){const n=tt()[e];typeof n=="function"&&n(t)}}}assertNotDestroyed(){K(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){K(Ku()&&!Zu(),this.auth,"internal-error"),await YT(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await ZI(this.auth);K(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return K(this.recaptcha,this.auth,"internal-error"),this.recaptcha}};function YT(){let r=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}r=()=>e(),window.addEventListener("load",r)}).catch(e=>{throw r&&window.removeEventListener("load",r),e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ed{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=ni._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function JT(r,e,t){if(Ue(r.app))return Promise.reject(gt(r));const n=ze(r),i=await Dc(n,e,ue(t));return new ed(i,s=>Pc(n,s))}async function XT(r,e,t){const n=ue(r);await Rc(!1,n,"phone");const i=await Dc(n.auth,e,ue(t));return new ed(i,s=>cm(n,s))}async function ZT(r,e,t){const n=ue(r);if(Ue(n.auth.app))return Promise.reject(gt(n.auth));const i=await Dc(n.auth,e,ue(t));return new ed(i,s=>lm(n,s))}async function Dc(r,e,t){var n;if(!r._getRecaptchaConfig())try{await Cv(r)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){K(s.type==="enroll",r,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await ur(r,o,"mfaSmsEnrollment",async(h,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===oo){K((t==null?void 0:t.type)===ao,h,"argument-error");const g=await Cl(h,p,t);return Af(h,g)}return Af(h,p)},"PHONE_PROVIDER").catch(h=>Promise.reject(h))).phoneSessionInfo.sessionInfo}else{K(s.type==="signin",r,"internal-error");const o=((n=i.multiFactorHint)==null?void 0:n.uid)||i.multiFactorUid;K(o,r,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await ur(r,c,"mfaSmsSignIn",async(p,g)=>{if(g.phoneSignInInfo.captchaResponse===oo){K((t==null?void 0:t.type)===ao,p,"argument-error");const E=await Cl(p,g,t);return Pf(p,E)}return Pf(p,g)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await ur(r,s,"sendVerificationCode",async(u,h)=>{if(h.captchaResponse===oo){K((t==null?void 0:t.type)===ao,u,"argument-error");const p=await Cl(u,h,t);return Tf(u,p)}return Tf(u,h)},"PHONE_PROVIDER").catch(u=>Promise.reject(u))).sessionInfo}}finally{t==null||t._reset()}}async function eb(r,e){const t=ue(r);if(Ue(t.auth.app))return Promise.reject(gt(t.auth));await Gu(t,e)}async function Cl(r,e,t){K(t.type===ao,r,"argument-error");const n=await t.verify();K(typeof n=="string",r,"argument-error");const i={...e};if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,l=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:n,captchaResponse:o,clientType:c,recaptchaVersion:l}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:n,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:n}),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let oi=class Ma{constructor(e){this.providerId=Ma.PROVIDER_ID,this.auth=ze(e)}verifyPhoneNumber(e,t){return Dc(this.auth,e,ue(t))}static credential(e,t){return ni._fromVerification(e,t)}static credentialFromResult(e){const t=e;return Ma.credentialFromTaggedObject(t)}static credentialFromError(e){return Ma.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:n}=e;return t&&n?ni._fromTokenResponse(t,n):null}};oi.PROVIDER_ID="phone";oi.PHONE_SIGN_IN_METHOD="phone";/**
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
 */function _i(r,e){return e?Kt(e):(K(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
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
 */class td extends _s{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return xn(e,this._buildIdpRequest())}_linkToIdToken(e,t){return xn(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return xn(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function tb(r){return am(r.auth,new td(r),r.bypassAuthState)}function nb(r){const{auth:e,user:t}=r;return K(t,e,"internal-error"),om(t,new td(r),r.bypassAuthState)}async function rb(r){const{auth:e,user:t}=r;return K(t,e,"internal-error"),Gu(t,new td(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wm{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(u){this.reject(u)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return tb;case"linkViaPopup":case"linkViaRedirect":return rb;case"reauthViaPopup":case"reauthViaRedirect":return nb;default:vt(this.auth,"internal-error")}}resolve(e){sn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){sn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ib=new jo(2e3,1e4);async function sb(r,e,t){if(Ue(r.app))return Promise.reject(at(r,"operation-not-supported-in-this-environment"));const n=ze(r);ys(r,e,Ln);const i=_i(n,t);return new Cn(n,"signInViaPopup",e,i).executeNotNull()}async function ob(r,e,t){const n=ue(r);if(Ue(n.auth.app))return Promise.reject(at(n.auth,"operation-not-supported-in-this-environment"));ys(n.auth,e,Ln);const i=_i(n.auth,t);return new Cn(n.auth,"reauthViaPopup",e,i,n).executeNotNull()}async function ab(r,e,t){const n=ue(r);ys(n.auth,e,Ln);const i=_i(n.auth,t);return new Cn(n.auth,"linkViaPopup",e,i,n).executeNotNull()}class Cn extends wm{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,Cn.currentPopupAction&&Cn.currentPopupAction.cancel(),Cn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return K(e,this.auth,"internal-error"),e}async onExecution(){sn(this.filter.length===1,"Popup operations only handle one event");const e=Yo();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(at(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(at(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Cn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if((n=(t=this.authWindow)==null?void 0:t.window)!=null&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(at(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,ib.get())};e()}}Cn.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cb="pendingRedirect",co=new Map;class lb extends wm{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=co.get(this.auth._key());if(!e){try{const n=await ub(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}co.set(this.auth._key(),e)}return this.bypassAuthState||co.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function ub(r,e){const t=Im(e),n=Em(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}async function nd(r,e){return Em(r)._set(Im(e),"true")}function db(){co.clear()}function rd(r,e){co.set(r._key(),e)}function Em(r){return Kt(r._redirectPersistence)}function Im(r){return ti(cb,r.config.apiKey,r.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hb(r,e,t){return fb(r,e,t)}async function fb(r,e,t){if(Ue(r.app))return Promise.reject(gt(r));const n=ze(r);ys(r,e,Ln),await n._initializationPromise;const i=_i(n,t);return await nd(i,n),i._openRedirect(n,e,"signInViaRedirect")}function pb(r,e,t){return gb(r,e,t)}async function gb(r,e,t){const n=ue(r);if(ys(n.auth,e,Ln),Ue(n.auth.app))return Promise.reject(gt(n.auth));await n.auth._initializationPromise;const i=_i(n.auth,t);await nd(i,n.auth);const s=await vm(n);return i._openRedirect(n.auth,e,"reauthViaRedirect",s)}function mb(r,e,t){return yb(r,e,t)}async function yb(r,e,t){const n=ue(r);ys(n.auth,e,Ln),await n.auth._initializationPromise;const i=_i(n.auth,t);await Rc(!1,n,e.providerId),await nd(i,n.auth);const s=await vm(n);return i._openRedirect(n.auth,e,"linkViaRedirect",s)}async function _b(r,e){return await ze(r)._initializationPromise,Nc(r,e,!1)}async function Nc(r,e,t=!1){if(Ue(r.app))return Promise.reject(gt(r));const n=ze(r),i=_i(n,e),o=await new lb(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}async function vm(r){const e=Yo(`${r.uid}:::`);return r._redirectEventId=e,await r.auth._setRedirectUser(r),await r.auth._persistUserIfCurrent(r),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wb=10*60*1e3;class Tm{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!Eb(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!bm(e)){const i=((n=e.error.code)==null?void 0:n.split("auth/")[1])||"internal-error";t.onError(at(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=wb&&this.cachedEventUids.clear(),this.cachedEventUids.has(Cf(e))}saveEventToCache(e){this.cachedEventUids.add(Cf(e)),this.lastProcessedEventTime=Date.now()}}function Cf(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function bm({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function Eb(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return bm(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Am(r,e={}){return Qe(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ib=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,vb=/^https?/;async function Tb(r){if(r.config.emulator)return;const{authorizedDomains:e}=await Am(r);for(const t of e)try{if(bb(t))return}catch{}vt(r,"unauthorized-domain")}function bb(r){const e=To(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!vb.test(t))return!1;if(Ib.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
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
 */const Ab=new jo(3e4,6e4);function kf(){const r=tt().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function Sb(r){return new Promise((e,t)=>{var i,s,o;function n(){kf(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{kf(),t(at(r,"network-request-failed"))},timeout:Ab.get()})}if((s=(i=tt().gapi)==null?void 0:i.iframes)!=null&&s.Iframe)e(gapi.iframes.getContext());else if((o=tt().gapi)!=null&&o.load)n();else{const c=Zg("iframefcb");return tt()[c]=()=>{gapi.load?n():t(at(r,"network-request-failed"))},ju(`${Ev()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw La=null,e})}let La=null;function Rb(r){return La=La||Sb(r),La}/**
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
 */const Pb=new jo(5e3,15e3),Cb="__/auth/iframe",kb="emulator/auth/iframe",xb={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Db=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Nb(r){const e=r.config;K(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?zu(e,kb):`https://${r.config.authDomain}/${Cb}`,n={apiKey:e.apiKey,appName:r.name,v:Sr},i=Db.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${ms(n).slice(1)}`}async function Vb(r){const e=await Rb(r),t=tt().gapi;return K(t,r,"internal-error"),e.open({where:document.body,url:Nb(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:xb,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=at(r,"network-request-failed"),c=tt().setTimeout(()=>{s(o)},Pb.get());function l(){tt().clearTimeout(c),i(n)}n.ping(l).then(l,()=>{s(o)})}))}/**
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
 */const Ob={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Mb=500,Lb=600,Fb="_blank",Ub="http://localhost";class xf{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Bb(r,e,t,n=Mb,i=Lb){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const l={...Ob,width:n.toString(),height:i.toString(),top:s,left:o},u=Ke().toLowerCase();t&&(c=Wg(u)?Fb:t),jg(u)&&(e=e||Ub,l.scrollbars="yes");const h=Object.entries(l).reduce((g,[E,N])=>`${g}${E}=${N},`,"");if(uv(u)&&c!=="_self")return $b(e||"",c),new xf(null);const p=window.open(e||"",c,h);K(p,r,"popup-blocked");try{p.focus()}catch{}return new xf(p)}function $b(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
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
 */const qb="__/auth/handler",Kb="emulator/auth/handler",zb=encodeURIComponent("fac");async function Gl(r,e,t,n,i,s){K(r.config.authDomain,r,"auth-domain-config-required"),K(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:Sr,eventId:i};if(e instanceof Ln){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",yE(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[h,p]of Object.entries(s||{}))o[h]=p}if(e instanceof ws){const h=e.getScopes().filter(p=>p!=="");h.length>0&&(o.scopes=h.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const h of Object.keys(c))c[h]===void 0&&delete c[h];const l=await r._getAppCheckToken(),u=l?`#${zb}=${encodeURIComponent(l)}`:"";return`${jb(r)}?${ms(c).slice(1)}${u}`}function jb({config:r}){return r.emulator?zu(r,Kb):`https://${r.authDomain}/${qb}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kl="webStorageSupport";class Gb{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=si,this._completeRedirectFn=Nc,this._overrideRedirectResult=rd}async _openPopup(e,t,n,i){var o;sn((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const s=await Gl(e,t,n,To(),i);return Bb(e,s,Yo())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await Gl(e,t,n,To(),i);return VT(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(sn(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await Vb(e),n=new Tm(e);return t.register("authEvent",i=>(K(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(kl,{type:kl},i=>{var o;const s=(o=i==null?void 0:i[0])==null?void 0:o[kl];s!==void 0&&t(!!s),vt(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Tb(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Jg()||Gg()||Wo()}}const Wb=Gb;class Hb{constructor(e){this.factorId=e}_process(e,t,n){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,n);case"signin":return this._finalizeSignIn(e,t.credential);default:return _n("unexpected MultiFactorSessionType")}}}class id extends Hb{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new id(e)}_finalizeEnroll(e,t,n){return RT(e,{idToken:t,displayName:n,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return KT(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class Sm{constructor(){}static assertion(e){return id._fromCredential(e)}}Sm.FACTOR_ID="phone";var Df="@firebase/auth",Nf="1.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qb{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){K(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yb(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Jb(r){yr(new bn("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;K(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const l={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Xg(r)},u=new mv(n,i,s,l);return kv(u,t),u},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),yr(new bn("auth-internal",e=>{const t=ze(e.getProvider("auth").getImmediate());return(n=>new Qb(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),tn(Df,Nf,Yb(r)),tn(Df,Nf,"esm2020")}/**
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
 */const Xb=5*60;sE("authIdTokenMaxAge");function Zb(){var r;return((r=document.getElementsByTagName("head"))==null?void 0:r[0])??document}yv({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=at("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",Zb().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Jb("Browser");/**
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
 */function ai(){return window}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eA=2e3;async function tA(r,e,t){const{BuildInfo:n}=ai();sn(e.sessionId,"AuthEvent did not contain a session ID");const i=await oA(e.sessionId),s={};return Wo()?s.ibi=n.packageName:Go()?s.apn=n.packageName:vt(r,"operation-not-supported-in-this-environment"),n.displayName&&(s.appDisplayName=n.displayName),s.sessionId=i,Gl(r,t,e.type,void 0,e.eventId??void 0,s)}async function nA(r){const{BuildInfo:e}=ai(),t={};Wo()?t.iosBundleId=e.packageName:Go()?t.androidPackageName=e.packageName:vt(r,"operation-not-supported-in-this-environment"),await Am(r,t)}function rA(r){const{cordova:e}=ai();return new Promise(t=>{e.plugins.browsertab.isAvailable(n=>{let i=null;n?e.plugins.browsertab.openUrl(r):i=e.InAppBrowser.open(r,lv()?"_blank":"_system","location=yes"),t(i)})})}async function iA(r,e,t){const{cordova:n}=ai();let i=()=>{};try{await new Promise((s,o)=>{let c=null;function l(){var g;s();const p=(g=n.plugins.browsertab)==null?void 0:g.close;typeof p=="function"&&p(),typeof(t==null?void 0:t.close)=="function"&&t.close()}function u(){c||(c=window.setTimeout(()=>{o(at(r,"redirect-cancelled-by-user"))},eA))}function h(){(document==null?void 0:document.visibilityState)==="visible"&&u()}e.addPassiveListener(l),document.addEventListener("resume",u,!1),Go()&&document.addEventListener("visibilitychange",h,!1),i=()=>{e.removePassiveListener(l),document.removeEventListener("resume",u,!1),document.removeEventListener("visibilitychange",h,!1),c&&window.clearTimeout(c)}})}finally{i()}}function sA(r){var t,n,i,s,o,c,l,u,h,p;const e=ai();K(typeof((t=e==null?void 0:e.universalLinks)==null?void 0:t.subscribe)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-universal-links-plugin-fix"}),K(typeof((n=e==null?void 0:e.BuildInfo)==null?void 0:n.packageName)<"u",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-buildInfo"}),K(typeof((o=(s=(i=e==null?void 0:e.cordova)==null?void 0:i.plugins)==null?void 0:s.browsertab)==null?void 0:o.openUrl)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),K(typeof((u=(l=(c=e==null?void 0:e.cordova)==null?void 0:c.plugins)==null?void 0:l.browsertab)==null?void 0:u.isAvailable)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),K(typeof((p=(h=e==null?void 0:e.cordova)==null?void 0:h.InAppBrowser)==null?void 0:p.open)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-inappbrowser"})}async function oA(r){const e=aA(r),t=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(t)).map(i=>i.toString(16).padStart(2,"0")).join("")}function aA(r){if(sn(/[0-9a-zA-Z]+/.test(r),"Can only convert alpha-numeric strings"),typeof TextEncoder<"u")return new TextEncoder().encode(r);const e=new ArrayBuffer(r.length),t=new Uint8Array(e);for(let n=0;n<r.length;n++)t[n]=r.charCodeAt(n);return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cA=20;class lA extends Tm{constructor(){super(...arguments),this.passiveListeners=new Set,this.initPromise=new Promise(e=>{this.resolveInitialized=e})}addPassiveListener(e){this.passiveListeners.add(e)}removePassiveListener(e){this.passiveListeners.delete(e)}resetRedirect(){this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1}onEvent(e){return this.resolveInitialized(),this.passiveListeners.forEach(t=>t(e)),super.onEvent(e)}async initialized(){await this.initPromise}}function uA(r,e,t=null){return{type:e,eventId:t,urlResponse:null,sessionId:fA(),postBody:null,tenantId:r.tenantId,error:at(r,"no-auth-event")}}function dA(r,e){return Wl()._set(Hl(r),e)}async function Vf(r){const e=await Wl()._get(Hl(r));return e&&await Wl()._remove(Hl(r)),e}function hA(r,e){var n,i;const t=gA(e);if(t.includes("/__/auth/callback")){const s=Fa(t),o=s.firebaseError?pA(decodeURIComponent(s.firebaseError)):null,c=(i=(n=o==null?void 0:o.code)==null?void 0:n.split("auth/"))==null?void 0:i[1],l=c?at(c):null;return l?{type:r.type,eventId:r.eventId,tenantId:r.tenantId,error:l,urlResponse:null,sessionId:null,postBody:null}:{type:r.type,eventId:r.eventId,tenantId:r.tenantId,sessionId:r.sessionId,urlResponse:t,postBody:null}}return null}function fA(){const r=[],e="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let t=0;t<cA;t++){const n=Math.floor(Math.random()*e.length);r.push(e.charAt(n))}return r.join("")}function Wl(){return Kt(Xu)}function Hl(r){return ti("authEvent",r.config.apiKey,r.name)}function pA(r){try{return JSON.parse(r)}catch{return null}}function gA(r){const e=Fa(r),t=e.link?decodeURIComponent(e.link):void 0,n=Fa(t).link,i=e.deep_link_id?decodeURIComponent(e.deep_link_id):void 0;return Fa(i).link||i||n||t||r}function Fa(r){if(!(r!=null&&r.includes("?")))return{};const[e,...t]=r.split("?");return Ui(t.join("?"))}/**
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
 */const mA=500;class yA{constructor(){this._redirectPersistence=si,this._shouldInitProactively=!0,this.eventManagers=new Map,this.originValidationPromises={},this._completeRedirectFn=Nc,this._overrideRedirectResult=rd}async _initialize(e){const t=e._key();let n=this.eventManagers.get(t);return n||(n=new lA(e),this.eventManagers.set(t,n),this.attachCallbackListeners(e,n)),n}_openPopup(e){vt(e,"operation-not-supported-in-this-environment")}async _openRedirect(e,t,n,i){sA(e);const s=await this._initialize(e);await s.initialized(),s.resetRedirect(),db(),await this._originValidation(e);const o=uA(e,n,i);await dA(e,o);const c=await tA(e,o,t),l=await rA(c);return iA(e,s,l)}_isIframeWebStorageSupported(e,t){throw new Error("Method not implemented.")}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=nA(e)),this.originValidationPromises[t]}attachCallbackListeners(e,t){const{universalLinks:n,handleOpenURL:i,BuildInfo:s}=ai(),o=setTimeout(async()=>{await Vf(e),t.onEvent(Of())},mA),c=async h=>{clearTimeout(o);const p=await Vf(e);let g=null;p&&(h!=null&&h.url)&&(g=hA(p,h.url)),t.onEvent(g||Of())};typeof n<"u"&&typeof n.subscribe=="function"&&n.subscribe(null,c);const l=i,u=`${s.packageName.toLowerCase()}://`;ai().handleOpenURL=async h=>{if(h.toLowerCase().startsWith(u)&&c({url:h}),typeof l=="function")try{l(h)}catch(p){console.error(p)}}}}const _A=yA;function Of(){return{type:"unknown",eventId:null,sessionId:null,urlResponse:null,postBody:null,tenantId:null,error:at("no-auth-event")}}/**
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
 */function wA(r,e){ze(r)._logFramework(e)}var EA="@firebase/auth-compat",IA="0.6.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vA=1e3;function lo(){var r;return((r=self==null?void 0:self.location)==null?void 0:r.protocol)||null}function TA(){return lo()==="http:"||lo()==="https:"}function Rm(r=Ke()){return!!((lo()==="file:"||lo()==="ionic:"||lo()==="capacitor:")&&r.toLowerCase().match(/iphone|ipad|ipod|android/))}function bA(){return Ou()||vc()}function AA(){return wg()&&(document==null?void 0:document.documentMode)===11}function SA(r=Ke()){return/Edge\/\d+/.test(r)}function RA(r=Ke()){return AA()||SA(r)}function Pm(){try{const r=self.localStorage,e=Yo();if(r)return r.setItem(e,"1"),r.removeItem(e),RA()?Eo():!0}catch{return sd()&&Eo()}return!1}function sd(){return typeof global<"u"&&"WorkerGlobalScope"in global&&"importScripts"in global}function xl(){return(TA()||_g()||Rm())&&!bA()&&Pm()&&!sd()}function Cm(){return Rm()&&typeof document<"u"}async function PA(){return Cm()?new Promise(r=>{const e=setTimeout(()=>{r(!1)},vA);document.addEventListener("deviceready",()=>{clearTimeout(e),r(!0)})}):!1}function CA(){return typeof window<"u"?window:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qt={LOCAL:"local",NONE:"none",SESSION:"session"},Ks=K,km="persistence";function kA(r,e){if(Ks(Object.values(qt).includes(e),r,"invalid-persistence-type"),Ou()){Ks(e!==qt.SESSION,r,"unsupported-persistence-type");return}if(vc()){Ks(e===qt.NONE,r,"unsupported-persistence-type");return}if(sd()){Ks(e===qt.NONE||e===qt.LOCAL&&Eo(),r,"unsupported-persistence-type");return}Ks(e===qt.NONE||Pm(),r,"unsupported-persistence-type")}async function Ql(r){await r._initializationPromise;const e=xm(),t=ti(km,r.config.apiKey,r.name);e&&e.setItem(t,r._getPersistenceType())}function xA(r,e){const t=xm();if(!t)return[];const n=ti(km,r,e);switch(t.getItem(n)){case qt.NONE:return[Hi];case qt.LOCAL:return[So,si];case qt.SESSION:return[si];default:return[]}}function xm(){var r;try{return((r=CA())==null?void 0:r.sessionStorage)||null}catch{return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const DA=K;class or{constructor(){this.browserResolver=Kt(Wb),this.cordovaResolver=Kt(_A),this.underlyingResolver=null,this._redirectPersistence=si,this._completeRedirectFn=Nc,this._overrideRedirectResult=rd}async _initialize(e){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._initialize(e)}async _openPopup(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openPopup(e,t,n,i)}async _openRedirect(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openRedirect(e,t,n,i)}_isIframeWebStorageSupported(e,t){this.assertedUnderlyingResolver._isIframeWebStorageSupported(e,t)}_originValidation(e){return this.assertedUnderlyingResolver._originValidation(e)}get _shouldInitProactively(){return Cm()||this.browserResolver._shouldInitProactively}get assertedUnderlyingResolver(){return DA(this.underlyingResolver,"internal-error"),this.underlyingResolver}async selectUnderlyingResolver(){if(this.underlyingResolver)return;const e=await PA();this.underlyingResolver=e?this.cordovaResolver:this.browserResolver}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dm(r){return r.unwrap()}function NA(r){return r.wrapped()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function VA(r){return Nm(r)}function OA(r,e){var n;const t=(n=e.customData)==null?void 0:n._tokenResponse;if((e==null?void 0:e.code)==="auth/multi-factor-auth-required"){const i=e;i.resolver=new MA(r,ST(r,e))}else if(t){const i=Nm(e),s=e;i&&(s.credential=i,s.tenantId=t.tenantId||void 0,s.email=t.email||void 0,s.phoneNumber=t.phoneNumber||void 0)}}function Nm(r){const{_tokenResponse:e}=r instanceof xt?r.customData:r;if(!e)return null;if(!(r instanceof xt)&&"temporaryProof"in e&&"phoneNumber"in e)return oi.credentialFromResult(r);const t=e.providerId;if(!t||t===$s.PASSWORD)return null;let n;switch(t){case $s.GOOGLE:n=gn;break;case $s.FACEBOOK:n=pn;break;case $s.GITHUB:n=mn;break;case $s.TWITTER:n=yn;break;default:const{oauthIdToken:i,oauthAccessToken:s,oauthTokenSecret:o,pendingToken:c,nonce:l}=e;return!s&&!o&&!i&&!c?null:c?t.startsWith("saml.")?Qi._create(t,c):An._fromParams({providerId:t,signInMethod:t,pendingToken:c,idToken:i,accessToken:s}):new qi(t).credential({idToken:i,accessToken:s,rawNonce:l})}return r instanceof xt?n.credentialFromError(r):n.credentialFromResult(r)}function Ot(r,e){return e.catch(t=>{throw t instanceof xt&&OA(r,t),t}).then(t=>{const n=t.operationType,i=t.user;return{operationType:n,credential:VA(t),additionalUserInfo:AT(t),user:Vc.getOrCreate(i)}})}async function Yl(r,e){const t=await e;return{verificationId:t.verificationId,confirm:n=>Ot(r,t.confirm(n))}}class MA{constructor(e,t){this.resolver=t,this.auth=NA(e)}get session(){return this.resolver.session}get hints(){return this.resolver.hints}resolveSignIn(e){return Ot(Dm(this.auth),this.resolver.resolveSignIn(e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vc=class Xs{constructor(e){this._delegate=e,this.multiFactor=CT(e)}static getOrCreate(e){return Xs.USER_MAP.has(e)||Xs.USER_MAP.set(e,new Xs(e)),Xs.USER_MAP.get(e)}delete(){return this._delegate.delete()}reload(){return this._delegate.reload()}toJSON(){return this._delegate.toJSON()}getIdTokenResult(e){return this._delegate.getIdTokenResult(e)}getIdToken(e){return this._delegate.getIdToken(e)}linkAndRetrieveDataWithCredential(e){return this.linkWithCredential(e)}async linkWithCredential(e){return Ot(this.auth,cm(this._delegate,e))}async linkWithPhoneNumber(e,t){return Yl(this.auth,XT(this._delegate,e,t))}async linkWithPopup(e){return Ot(this.auth,ab(this._delegate,e,or))}async linkWithRedirect(e){return await Ql(ze(this.auth)),mb(this._delegate,e,or)}reauthenticateAndRetrieveDataWithCredential(e){return this.reauthenticateWithCredential(e)}async reauthenticateWithCredential(e){return Ot(this.auth,lm(this._delegate,e))}reauthenticateWithPhoneNumber(e,t){return Yl(this.auth,ZT(this._delegate,e,t))}reauthenticateWithPopup(e){return Ot(this.auth,ob(this._delegate,e,or))}async reauthenticateWithRedirect(e){return await Ql(ze(this.auth)),pb(this._delegate,e,or)}sendEmailVerification(e){return pT(this._delegate,e)}async unlink(e){return await eT(this._delegate,e),this}updateEmail(e){return _T(this._delegate,e)}updatePassword(e){return wT(this._delegate,e)}updatePhoneNumber(e){return eb(this._delegate,e)}updateProfile(e){return yT(this._delegate,e)}verifyBeforeUpdateEmail(e,t){return gT(this._delegate,e,t)}get emailVerified(){return this._delegate.emailVerified}get isAnonymous(){return this._delegate.isAnonymous}get metadata(){return this._delegate.metadata}get phoneNumber(){return this._delegate.phoneNumber}get providerData(){return this._delegate.providerData}get refreshToken(){return this._delegate.refreshToken}get tenantId(){return this._delegate.tenantId}get displayName(){return this._delegate.displayName}get email(){return this._delegate.email}get photoURL(){return this._delegate.photoURL}get providerId(){return this._delegate.providerId}get uid(){return this._delegate.uid}get auth(){return this._delegate.auth}};Vc.USER_MAP=new WeakMap;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zs=K;class Jl{constructor(e,t){if(this.app=e,t.isInitialized()){this._delegate=t.getImmediate(),this.linkUnderlyingAuth();return}const{apiKey:n}=e.options;zs(n,"invalid-api-key",{appName:e.name}),zs(n,"invalid-api-key",{appName:e.name});const i=typeof window<"u"?or:void 0;this._delegate=t.initialize({options:{persistence:LA(n,e.name),popupRedirectResolver:i}}),this._delegate._updateErrorMap(KI),this.linkUnderlyingAuth()}get emulatorConfig(){return this._delegate.emulatorConfig}get currentUser(){return this._delegate.currentUser?Vc.getOrCreate(this._delegate.currentUser):null}get languageCode(){return this._delegate.languageCode}set languageCode(e){this._delegate.languageCode=e}get settings(){return this._delegate.settings}get tenantId(){return this._delegate.tenantId}set tenantId(e){this._delegate.tenantId=e}useDeviceLanguage(){this._delegate.useDeviceLanguage()}signOut(){return this._delegate.signOut()}useEmulator(e,t){xv(this._delegate,e,t)}applyActionCode(e){return sT(this._delegate,e)}checkActionCode(e){return um(this._delegate,e)}confirmPasswordReset(e,t){return iT(this._delegate,e,t)}async createUserWithEmailAndPassword(e,t){return Ot(this._delegate,aT(this._delegate,e,t))}fetchProvidersForEmail(e){return this.fetchSignInMethodsForEmail(e)}fetchSignInMethodsForEmail(e){return fT(this._delegate,e)}isSignInWithEmailLink(e){return uT(this._delegate,e)}async getRedirectResult(){zs(xl(),this._delegate,"operation-not-supported-in-this-environment");const e=await _b(this._delegate,or);return e?Ot(this._delegate,Promise.resolve(e)):{credential:null,user:null}}addFrameworkForLogging(e){wA(this._delegate,e)}onAuthStateChanged(e,t,n){const{next:i,error:s,complete:o}=Mf(e,t,n);return this._delegate.onAuthStateChanged(i,s,o)}onIdTokenChanged(e,t,n){const{next:i,error:s,complete:o}=Mf(e,t,n);return this._delegate.onIdTokenChanged(i,s,o)}sendSignInLinkToEmail(e,t){return lT(this._delegate,e,t)}sendPasswordResetEmail(e,t){return rT(this._delegate,e,t||void 0)}async setPersistence(e){kA(this._delegate,e);let t;switch(e){case qt.SESSION:t=si;break;case qt.LOCAL:t=await Kt(So)._isAvailable()?So:Xu;break;case qt.NONE:t=Hi;break;default:return vt("argument-error",{appName:this._delegate.name})}return this._delegate.setPersistence(t)}signInAndRetrieveDataWithCredential(e){return this.signInWithCredential(e)}signInAnonymously(){return Ot(this._delegate,Zv(this._delegate))}signInWithCredential(e){return Ot(this._delegate,Pc(this._delegate,e))}signInWithCustomToken(e){return Ot(this._delegate,nT(this._delegate,e))}signInWithEmailAndPassword(e,t){return Ot(this._delegate,cT(this._delegate,e,t))}signInWithEmailLink(e,t){return Ot(this._delegate,dT(this._delegate,e,t))}signInWithPhoneNumber(e,t){return Yl(this._delegate,JT(this._delegate,e,t))}async signInWithPopup(e){return zs(xl(),this._delegate,"operation-not-supported-in-this-environment"),Ot(this._delegate,sb(this._delegate,e,or))}async signInWithRedirect(e){return zs(xl(),this._delegate,"operation-not-supported-in-this-environment"),await Ql(this._delegate),hb(this._delegate,e,or)}updateCurrentUser(e){return this._delegate.updateCurrentUser(e)}verifyPasswordResetCode(e){return oT(this._delegate,e)}unwrap(){return this._delegate}_delete(){return this._delegate._delete()}linkUnderlyingAuth(){this._delegate.wrapped=()=>this}}Jl.Persistence=qt;function Mf(r,e,t){let n=r;typeof r!="function"&&({next:n,error:e,complete:t}=r);const i=n;return{next:o=>i(o&&Vc.getOrCreate(o)),error:e,complete:t}}function LA(r,e){const t=xA(r,e);if(typeof self<"u"&&!t.includes(So)&&t.push(So),typeof window<"u")for(const n of[Xu,si])t.includes(n)||t.push(n);return t.includes(Hi)||t.push(Hi),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class od{static credential(e,t){return oi.credential(e,t)}constructor(){this.providerId="phone",this._delegate=new oi(Dm(Be.auth()))}verifyPhoneNumber(e,t){return this._delegate.verifyPhoneNumber(e,t)}unwrap(){return this._delegate}}od.PHONE_SIGN_IN_METHOD=oi.PHONE_SIGN_IN_METHOD;od.PROVIDER_ID=oi.PROVIDER_ID;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const FA=K;class UA{constructor(e,t,n=Be.app()){var i;FA((i=n.options)==null?void 0:i.apiKey,"invalid-api-key",{appName:n.name}),this._delegate=new QT(n.auth(),e,t),this.type=this._delegate.type}clear(){this._delegate.clear()}render(){return this._delegate.render()}verify(){return this._delegate.verify()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const BA="auth-compat";function $A(r){r.INTERNAL.registerComponent(new bn(BA,e=>{const t=e.getProvider("app-compat").getImmediate(),n=e.getProvider("auth");return new Jl(t,n)},"PUBLIC").setServiceProps({ActionCodeInfo:{Operation:{EMAIL_SIGNIN:Ri.EMAIL_SIGNIN,PASSWORD_RESET:Ri.PASSWORD_RESET,RECOVER_EMAIL:Ri.RECOVER_EMAIL,REVERT_SECOND_FACTOR_ADDITION:Ri.REVERT_SECOND_FACTOR_ADDITION,VERIFY_AND_CHANGE_EMAIL:Ri.VERIFY_AND_CHANGE_EMAIL,VERIFY_EMAIL:Ri.VERIFY_EMAIL}},EmailAuthProvider:Rr,FacebookAuthProvider:pn,GithubAuthProvider:mn,GoogleAuthProvider:gn,OAuthProvider:qi,SAMLAuthProvider:tc,PhoneAuthProvider:od,PhoneMultiFactorGenerator:Sm,RecaptchaVerifier:UA,TwitterAuthProvider:yn,Auth:Jl,AuthCredential:_s,Error:xt}).setInstantiationMode("LAZY").setMultipleInstances(!1)),r.registerVersion(EA,IA)}$A(Be);var qA={};const KA=(()=>{var r;if(typeof process<"u"&&qA)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),xe=(...r)=>KA&&console.log("[Firebase]",...r);let dn=null,ri=null,Ro=!1,ad=!1,Po=!1,Ht=null;const cd="firebase_config",Vm={encode:r=>{try{return btoa(encodeURIComponent(r))}catch{return r}},decode:r=>{try{return decodeURIComponent(atob(r))}catch{return r}}};async function zA(){var r,e,t;if(!((r=window.electronAPI)!=null&&r.isElectron))return xe("웹 환경 - 인증 파일 사용 불가"),null;try{if(!((e=window.electronAPI)!=null&&e.readAuthFile))return xe("readAuthFile API 없음"),null;const n=await window.electronAPI.readAuthFile();if(!n.exists)return xe("인증 파일 없음 - 로컬 모드로 동작"),null;const i=JSON.parse(n.content);return i.apiKey&&i.projectId?(xe("인증 파일에서 Firebase 설정 로드됨"),i):(xe("인증 파일에 필수 설정 없음"),null)}catch(n){return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] 인증 파일 로드 실패:",n),null}}function jA(){var r;try{const e=localStorage.getItem(cd);if(e){let t;if(e.startsWith("eyJ"))try{t=JSON.parse(Vm.decode(e))}catch{t=JSON.parse(e)}else t=JSON.parse(e);if(t.apiKey&&t.projectId)return t}}catch(e){(((r=window.logger)==null?void 0:r.error)||console.error)("Firebase 설정 로드 실패:",e)}return null}async function GA(){const r=await zA();if(r)return r;const e=jA();return e?(xe("localStorage에서 설정 로드됨"),e):(xe("Firebase 설정 없음 - 로컬 모드로 동작"),null)}function Om(r){return r?r.apiKey&&r.apiKey.trim()!==""&&r.projectId&&r.projectId.trim()!=="":!1}async function Mm(){var r,e,t,n,i,s,o,c,l,u,h,p;if(xe("초기화 시작..."),Ro&&dn)return xe("이미 초기화됨"),!0;if(!navigator.onLine)return xe("오프라인 상태 - 로컬 모드로 동작"),(((r=window.logger)==null?void 0:r.info)||console.info)("[Firebase] 인터넷 연결 없음. 로컬 모드로 동작합니다."),!1;if(window.NetworkAccess){let g=await window.NetworkAccess.checkAccess();if(xe("네트워크 접근 체크:",g),!g.allowed&&g.needsSetup&&await window.NetworkAccess.promptGatewayIfNeeded()&&(g=await window.NetworkAccess.checkAccess()),!g.allowed)return xe("네트워크 접근 거부:",g.reason),(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다."),!1}if(typeof Be>"u")return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요."),!1;if(Ht=await GA(),xe("로드된 설정:",Ht?"있음":"없음"),!Ht)return xe("설정이 없습니다. 로컬 모드로 동작합니다."),!1;if(xe("설정값 확인:",{apiKey:Ht.apiKey?Ht.apiKey.substring(0,10)+"...":"없음",projectId:Ht.projectId||"없음",authDomain:Ht.authDomain||"없음"}),!Om(Ht))return xe("설정이 유효하지 않습니다."),!1;try{xe("앱 초기화 중..."),Be.apps.length||Be.initializeApp(Ht),dn=Be.firestore(),xe("Firestore 연결됨");try{ri=Be.auth();const g=await ri.signInAnonymously();Po=!0,xe("익명 인증 성공:",g.user.uid)}catch(g){(((n=window.logger)==null?void 0:n.error)||console.error)("[Firebase] 익명 인증 실패:",g),Po=!1;const E=g.code||"";if(E==="auth/operation-not-allowed")return(((i=window.logger)==null?void 0:i.error)||console.error)("[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요."),!1;E==="auth/network-request-failed"?(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다."):(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)")}try{await dn.enablePersistence({synchronizeTabs:!0}),ad=!0,xe("오프라인 지원 활성화됨 (멀티탭 동기화)")}catch(g){(((c=window.logger)==null?void 0:c.warn)||console.warn)("[Firebase] 오프라인 지원 에러:",g.code,g.message),g.code==="failed-precondition"?(((l=window.logger)==null?void 0:l.warn)||console.warn)("[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다."):g.code==="unimplemented"&&(((u=window.logger)==null?void 0:u.warn)||console.warn)("[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.")}return Ro=!0,xe("초기화 완료:",Ht.projectId),window.addEventListener("offline",()=>{xe("네트워크 끊김 감지 - Firestore 네트워크 비활성화"),dn&&dn.disableNetwork().catch(()=>{})}),window.addEventListener("online",()=>{xe("네트워크 복구 감지 - Firestore 네트워크 활성화"),dn&&dn.enableNetwork().catch(()=>{})}),!0}catch(g){return(((h=window.logger)==null?void 0:h.error)||console.error)("[Firebase] 초기화 실패:",g),(((p=window.logger)==null?void 0:p.error)||console.error)("[Firebase] 에러 상세:",g.message,g.stack),!1}}function WA(){return dn}function HA(){return Ro}function QA(){return ad}function YA(){return Po}function JA(){var r;return((r=ri==null?void 0:ri.currentUser)==null?void 0:r.uid)||null}function XA(r){var e;try{const t=Vm.encode(JSON.stringify(r));localStorage.setItem(cd,t),xe("설정 저장됨 (난독화)")}catch(t){(((e=window.logger)==null?void 0:e.error)||console.error)("Firebase 설정 저장 실패:",t)}}function ZA(){localStorage.removeItem(cd),Ro=!1,Po=!1,dn=null,ri=null,Ht=null,xe("설정 초기화됨")}async function eS(){var r;if(xe("재초기화 시작..."),Ro=!1,Po=!1,ad=!1,dn=null,ri=null,Ht=null,typeof Be<"u"&&Be.apps.length>0)try{await Be.app().delete(),xe("기존 Firebase 앱 삭제됨")}catch(e){(((r=window.logger)==null?void 0:r.warn)||console.warn)("[Firebase] 앱 삭제 실패:",e)}return await Mm()}window.firebaseConfig={initialize:Mm,reinitialize:eS,getDb:WA,isEnabled:HA,isOfflineSupported:QA,isAuthenticated:YA,getCurrentUserId:JA,isConfigValid:Om,saveConfig:XA,resetConfig:ZA};const tS=function(){const r=["name","phone","address","birthDate","corpNumber","parcels","phoneNumber","farmAddress"],e="2.0";function t(B){const Z=new Uint8Array(B);let ne="";for(let z=0;z<Z.byteLength;z++)ne+=String.fromCharCode(Z[z]);return btoa(ne)}function n(B){const Z=atob(B),ne=new Uint8Array(Z.length);for(let z=0;z<Z.length;z++)ne[z]=Z.charCodeAt(z);return ne.buffer}const i="AES-GCM",s=256,o=16,c=6e5,l="SHA-256";function u(B){return new TextEncoder().encode(B)}async function h(B,Z){const ne=u(Z),z=await crypto.subtle.digest("SHA-256",ne),me=t(z);return B+me}async function p(B,Z,ne=!1){const z=await crypto.subtle.importKey("raw",u(B),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:Z,iterations:c,hash:l},z,{name:i,length:s},ne,["encrypt","decrypt"])}async function g(B,Z,ne,z=!1){ne||(ne=crypto.getRandomValues(new Uint8Array(o)).buffer);const me=await h(B,Z);return{key:await p(me,ne,z),salt:ne}}async function E(B,Z,ne){if(!B||typeof B!="string")return null;const z=crypto.getRandomValues(new Uint8Array(12)),me=new TextEncoder,le=me.encode(B),ce={name:"AES-GCM",iv:z};ne&&(ce.additionalData=me.encode(ne));const rt=await crypto.subtle.encrypt(ce,Z,le);return{iv:t(z.buffer),ct:t(rt)}}async function N(B,Z,ne,z){if(!B||!Z)return null;const me=new Uint8Array(n(B)),le=n(Z),ce={name:"AES-GCM",iv:me};z&&(ce.additionalData=new TextEncoder().encode(z));const rt=await crypto.subtle.decrypt(ce,ne,le);return new TextDecoder().decode(rt)}async function V(B,Z){if(!B||!Z)return B;const ne={...B},z={v:"2.1"};let me=!1;for(const le of r){const ce=B[le];if(ce!=null&&ce!=="")try{const rt=typeof ce=="string"?ce:JSON.stringify(ce);z[le]=await E(rt,Z,le),delete ne[le],me=!0}catch(rt){console.warn(`[CryptoUtils] Failed to encrypt field "${le}":`,rt)}}return me&&(ne._enc=z),ne}async function O(B,Z){if(!B||!Z||!B._enc)return B;const ne={...B},z=B._enc,me=z.v==="2.1";for(const le of r)if(z[le]&&z[le].iv&&z[le].ct)try{const ce=me?le:void 0,rt=await N(z[le].iv,z[le].ct,Z,ce);if(rt!==null)if(le==="parcels")try{ne[le]=JSON.parse(rt)}catch{ne[le]=rt}else ne[le]=rt}catch(ce){console.warn(`[CryptoUtils] Failed to decrypt field "${le}":`,ce),le==="parcels"?ne[le]=[]:ne[le]="[복호화 실패]"}return delete ne._enc,ne}const Y=10;async function ee(B,Z){if(!Array.isArray(B)||!Z)return B;const ne=new Array(B.length);for(let z=0;z<B.length;z+=Y){const me=B.slice(z,z+Y),le=await Promise.all(me.map(ce=>V(ce,Z)));for(let ce=0;ce<le.length;ce++)ne[z+ce]=le[ce]}return ne}async function X(B,Z){if(!Array.isArray(B)||!Z)return B;const ne=new Array(B.length);for(let z=0;z<B.length;z+=Y){const me=B.slice(z,z+Y),le=await Promise.all(me.map(ce=>O(ce,Z)));for(let ce=0;ce<le.length;ce++)ne[z+ce]=le[ce]}return ne}function de(B){return!!(B&&B._enc&&B._enc.v)}function he(){return[...r]}function ye(B){const Z=[];(!B||B.length<8)&&Z.push("비밀번호는 8자 이상이어야 합니다"),B&&B.length>64&&Z.push("비밀번호는 64자 이하여야 합니다"),/[a-z]/.test(B)||Z.push("소문자를 1개 이상 포함해야 합니다"),/[0-9]/.test(B)||Z.push("숫자를 1개 이상 포함해야 합니다"),/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(B)||Z.push("특수문자를 1개 이상 포함해야 합니다");let ne="약함";return Z.length===0&&(ne=B.length>=12?"강함":"보통"),{valid:Z.length===0,strength:ne,errors:Z}}function I(){const B=crypto.getRandomValues(new Uint8Array(32));return t(B.buffer)}function y(B){return B=B.replace(/[^a-zA-Z0-9\-_]/g,""),`
            <div class="enc-password-rules" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 12px; color: #15803D;">
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #166534;">비밀번호 규칙</div>
                <div id="${B}-rule-length" style="color: #15803D; margin-bottom: 2px;">• 8~64자 길이</div>
                <div id="${B}-rule-lower" style="color: #15803D; margin-bottom: 2px;">• 소문자 포함 (필수)</div>
                <div id="${B}-rule-number" style="color: #15803D; margin-bottom: 2px;">• 숫자 포함 (필수)</div>
                <div id="${B}-rule-special" style="color: #15803D; margin-bottom: 2px;">• 특수문자 포함 (필수)</div>
                <div id="${B}-rule-upper" style="color: #9CA3AF; font-size: 12px;">• 대문자 포함 (권장)</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 500; color: #6B7280;">비밀번호 강도</span>
                <span id="${B}-strength-text" style="font-size: 12px; font-weight: 600; color: #9CA3AF;">-</span>
            </div>
            <div id="${B}-strength-bar" style="height: 6px; border-radius: 3px; background: #E5E7EB; margin-bottom: 16px; transition: all 0.3s;">
                <div id="${B}-strength-fill" style="height: 100%; border-radius: 3px; width: 0; transition: all 0.3s;"></div>
            </div>`}function _(B){const{prefix:Z,input:ne,confirmInput:z,submitBtn:me,submitColor:le="#4A90D9",extraCheck:ce,verifyMode:rt=!1}=B,mt=document.getElementById(`${Z}-strength-fill`),it=document.getElementById(`${Z}-strength-text`),on=document.getElementById(`${Z}-rule-length`),zn=document.getElementById(`${Z}-rule-lower`),Nr=document.getElementById(`${Z}-rule-number`),Vr=document.getElementById(`${Z}-rule-special`),Vt=document.getElementById(`${Z}-rule-upper`);function Pn(Le,an){Le.style.color=an?"#16A34A":"#15803D",Le.textContent=(an?"✓ ":"• ")+Le.textContent.replace(/^[\u2713\u2022] /,"")}function Gt(){const Le=ne.value,an=Le.length>=8&&Le.length<=64,jn=/[a-z]/.test(Le),Gn=/[0-9]/.test(Le),Or=/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(Le),Wt=/[A-Z]/.test(Le);Pn(on,an),Pn(zn,jn),Pn(Nr,Gn),Pn(Vr,Or),Vt&&(Vt.style.color=Wt?"#16A34A":"#9CA3AF",Vt.textContent=(Wt?"✓ ":"• ")+Vt.textContent.replace(/^[\u2713\u2022] /,""));const Ut=an&&jn&&Gn&&Or;Le.length===0?(mt.style.width="0",mt.style.background="#E5E7EB",it.textContent="-",it.style.color="#9CA3AF"):Ut?rt?(mt.style.width="100%",mt.style.background="linear-gradient(90deg, #22C55E, #16A34A)",it.textContent="입력 완료",it.style.color="#16A34A"):Le.length>=12||Le.length>=10&&Wt?(mt.style.width="100%",mt.style.background="linear-gradient(90deg, #22C55E, #16A34A)",it.textContent="강함",it.style.color="#16A34A"):(mt.style.width="66%",mt.style.background="linear-gradient(90deg, #F59E0B, #EAB308)",it.textContent="보통",it.style.color="#F59E0B"):(mt.style.width="33%",mt.style.background="#EF4444",it.textContent="요건 미충족",it.style.color="#EF4444");let cn=Ut;z&&(cn=cn&&Le===z.value&&z.value.length>0),ce&&(cn=cn&&ce()),cn?(me.disabled=!1,me.style.background=le,me.style.cursor="pointer"):(me.disabled=!0,me.style.background="#ccc",me.style.cursor="default")}return ne.addEventListener("input",Gt),z&&z.addEventListener("input",Gt),{updateValidation:Gt}}async function v(B,Z){var ne,z;try{if((ne=window.encryptionManager)!=null&&ne.isReady()){const me=window.encryptionManager.getKey(),le=JSON.stringify(Z),ce=await E(le,me);localStorage.setItem(B,JSON.stringify({_localEnc:!0,iv:ce.iv,ct:ce.ct}))}else localStorage.setItem(B,JSON.stringify(Z))}catch(me){if(console.error("[SecureStorage] 암호화 저장 실패:",me.message),(z=window.encryptionManager)!=null&&z.isReady())throw new Error("데이터 암호화에 실패하여 저장을 중단합니다: "+me.message);localStorage.setItem(B,JSON.stringify(Z))}}async function T(B){var ne;const Z=localStorage.getItem(B);if(!Z)return null;try{const z=JSON.parse(Z);if(z&&z._localEnc&&z.iv&&z.ct){if((ne=window.encryptionManager)!=null&&ne.isReady()){const me=window.encryptionManager.getKey(),le=await N(z.iv,z.ct,me);return JSON.parse(le)}return console.warn("[SecureStorage] 암호화된 데이터이나 키 미준비:",B),null}return z}catch(z){return console.error("[SecureStorage] 로드 실패:",B,z.message),null}}async function S(B){var Z;if((Z=window.encryptionManager)!=null&&Z.isReady()){const ne=window.encryptionManager.getKey(),z=typeof B=="string"?JSON.parse(B):B;if(z&&Array.isArray(z.data)){const ce=await ee(z.data,ne);return JSON.stringify({...z,_fileEnc:"2.1",data:ce},null,2)}if(Array.isArray(z)){const ce=await ee(z,ne);return JSON.stringify(ce,null,2)}const me=typeof B=="string"?B:JSON.stringify(B),le=await E(me,ne);return JSON.stringify({_localEnc:!0,iv:le.iv,ct:le.ct},null,2)}return typeof B=="string"?B:JSON.stringify(B,null,2)}async function w(B){var Z,ne;if(!B)return null;try{const z=JSON.parse(B);if(z&&z._fileEnc&&Array.isArray(z.data)){if((Z=window.encryptionManager)!=null&&Z.isReady()){const me=window.encryptionManager.getKey(),le=await X(z.data,me),ce={...z,data:le};return delete ce._fileEnc,ce}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}if(z&&z._localEnc&&z.iv&&z.ct){if((ne=window.encryptionManager)!=null&&ne.isReady()){const me=window.encryptionManager.getKey(),le=await N(z.iv,z.ct,me);return JSON.parse(le)}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}return z}catch(z){return console.error("[SecureStorage] 파일 복호화 실패:",z.message),null}}return{createMasterKey:g,generateKeyFileContent:I,validatePassword:ye,encrypt:E,decrypt:N,encryptRecord:V,decryptRecord:O,encryptRecords:ee,decryptRecords:X,isEncrypted:de,getSensitiveFields:he,bufferToBase64:t,base64ToBuffer:n,createPasswordRulesHTML:y,bindPasswordValidation:_,saveToLocalStorage:v,loadFromLocalStorage:T,encryptForFile:S,decryptFromFile:w,SENSITIVE_FIELDS:r,ENCRYPTION_VERSION:e,PBKDF2_ITERATIONS:c}}();window.CryptoUtils=tS;const Xl=function(){let r=null,e=null,t=!1,n=!1,i=null,s=null,o=!1,c=null;const l="encryption_keyFile",u="encryption_salt",h="encryption_recoveryBlob",p="encryption_sessionPw",g=Symbol("recover"),E='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',N='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';function V(){if(document.getElementById("enc-modal-dark-styles"))return;const P=document.createElement("style");P.id="enc-modal-dark-styles",P.textContent=`
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
        `,document.head.appendChild(P)}const O=3,Y=24,ee=6e5;function X(P,R){if(typeof P!="string"||typeof R!="string")return!1;const U=Math.max(P.length,R.length);let F=P.length^R.length;for(let M=0;M<U;M++)F|=(P.charCodeAt(M)||0)^(R.charCodeAt(M)||0);return F===0}function de(){var P;return(P=window.firestoreDb)!=null&&P.getCollectionName&&window.firestoreDb.getCollectionName("soil",2e3).startsWith("test_")?"test_":""}function he(){const P=de();return P?P+"system":"_system"}const ye=5*60*1e3,I=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);async function y(P){var M;if(!((M=window.firebaseConfig)!=null&&M.isEnabled()))return!0;const R=window.firebaseConfig.getDb();if(!R)return!0;const U=he(),F=R.collection(U).doc(`lock_${P}`);try{return await R.runTransaction(async k=>{const L=await k.get(F);if(L.exists){const se=L.data();if(Date.now()-new Date(se.lockedAt).getTime()<ye)return!1}return k.set(F,{lockedBy:I,lockedAt:new Date().toISOString()}),!0})}catch(D){return console.warn(`[Encryption] Lock acquire failed (${P}):`,D.message),!0}}async function _(P){var M;if(!((M=window.firebaseConfig)!=null&&M.isEnabled()))return;const R=window.firebaseConfig.getDb();if(!R)return;const U=he(),F=R.collection(U).doc(`lock_${P}`);try{await R.runTransaction(async D=>{const k=await D.get(F);k.exists&&k.data().lockedBy===I&&D.delete(F)})}catch(D){console.warn(`[Encryption] Lock release failed (${P}):`,D.message)}}async function v(){var P,R,U,F,M,D;if((P=window.firebaseConfig)!=null&&P.isEnabled()){const k=window.firebaseConfig.getDb();if(k){const L=he(),se=de();try{const j=await k.collection(L).doc("encryptionKey").get();if(j.exists){const H=j.data();if(H.keyFileContent)return i="firebase",console.log(`[Encryption] Key loaded from Firebase ${L}/encryptionKey`),H.keyFileContent}console.log(`[Encryption] ${L}/encryptionKey not found or empty`)}catch(j){console.warn(`[Encryption] Firebase ${L} read failed:`,j.message)}if(se){const j=se+"_system";try{console.log(`[Encryption] Trying fallback: ${j}/encryptionKey...`);const H=await k.collection(j).doc("encryptionKey").get();if(H.exists&&((R=H.data())!=null&&R.keyFileContent)){i="firebase",console.log(`[Encryption] Key loaded from Firebase ${j} (fallback)`);try{await k.collection(L).doc("encryptionKey").set(H.data()),console.log(`[Encryption] Migrated encryptionKey: ${j} → ${L}`);const oe=await k.collection(j).doc("recoveryBlob").get();oe.exists&&(await k.collection(L).doc("recoveryBlob").set(oe.data()),console.log(`[Encryption] Migrated recoveryBlob: ${j} → ${L}`))}catch(oe){console.warn("[Encryption] Migration failed:",oe.message)}return H.data().keyFileContent}}catch(H){console.warn(`[Encryption] ${j} fallback failed:`,H.message)}try{console.log("[Encryption] Trying fallback: _system/encryptionKey...");const H=await k.collection("_system").doc("encryptionKey").get();if(H.exists&&((U=H.data())!=null&&U.keyFileContent))return i="firebase",console.log("[Encryption] Key loaded from Firebase _system (fallback)"),H.data().keyFileContent}catch(H){console.warn("[Encryption] _system fallback failed:",H.message)}}}}if((F=window.electronAPI)!=null&&F.isElectron)try{const k=await((D=(M=window.electronAPI).readKeyFile)==null?void 0:D.call(M));if(k)return i="local",console.debug("[Encryption] Key loaded from local file"),k}catch(k){console.warn("[Encryption] Local key file not found:",k.message)}try{const k=localStorage.getItem(l);if(k)return i="local",console.log("[Encryption] Key loaded from localStorage"),k}catch(k){console.warn("[Encryption] localStorage key load failed:",k.message)}return null}async function T(P){var F;if(!((F=window.firebaseConfig)!=null&&F.isEnabled()))return;const R=window.firebaseConfig.getDb();if(!R)return;const U=he();try{await R.collection(U).doc("encryptionKey").set({keyFileContent:P,createdAt:new Date().toISOString(),version:"2.0",syncedFrom:"local"}),console.log(`[Encryption] Local key synced to Firebase ${U}/encryptionKey`)}catch(M){console.warn("[Encryption] Failed to sync key to Firebase:",M.message)}}async function S(){var U,F,M,D;if(!((U=window.CryptoUtils)!=null&&U.generateKeyFileContent))return console.error("[Encryption] CryptoUtils.generateKeyFileContent not available"),null;const P=window.CryptoUtils.generateKeyFileContent();if(console.debug("[Encryption] New key file generated"),(F=window.firebaseConfig)!=null&&F.isEnabled()){const k=window.firebaseConfig.getDb();if(k){const L=he();try{return await k.collection(L).doc("encryptionKey").set({keyFileContent:P,createdAt:new Date().toISOString(),version:"2.0"}),console.log(`[Encryption] Key stored in Firebase ${L}/encryptionKey`),i="generated",P}catch(se){console.error("[Encryption] Failed to store key in Firebase:",se.message)}}}if(((M=window.electronAPI)==null?void 0:M.isElectron)===!0&&((D=window.electronAPI)!=null&&D.saveKeyFile))try{const k=await window.electronAPI.saveKeyFile(P);if(k!=null&&k.success)return console.log("[Encryption] Key stored in local file (safeStorage protected)"),i="local",w(P),P}catch(k){console.error("[Encryption] Failed to store key locally:",k.message)}try{return localStorage.setItem(l,P),console.log("[Encryption] Key stored in localStorage"),i="local",P}catch(k){console.warn("[Encryption] localStorage key save failed:",k.message)}return i="generated",P}function w(P){setTimeout(async()=>{try{confirm(`[암호화 키 파일 백업 안내]

암호화 키가 새로 생성되었습니다.
키 파일을 USB 또는 안전한 곳에 백업해두면
다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.

지금 키 파일을 백업하시겠습니까?`)&&await B()}catch(R){console.warn("[Encryption] Key backup prompt failed:",R.message)}},1e3)}async function B(){var U,F;let P=s;if(P||(P=await v()),!P)return{success:!1,error:"활성화된 암호화 키가 없습니다."};if(((U=window.electronAPI)==null?void 0:U.isElectron)===!0&&((F=window.electronAPI)!=null&&F.exportKeyFile)){const M=await window.electronAPI.exportKeyFile(P);return M!=null&&M.success?(console.log("[Encryption] Key file exported to:",M.filePath),window.showToast&&window.showToast("키 파일이 저장되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}):(M==null?void 0:M.error)==="canceled"?{success:!1,error:"취소됨"}:(console.error("[Encryption] Key export failed:",M==null?void 0:M.error),{success:!1,error:(M==null?void 0:M.error)||"내보내기 실패"})}try{const M=new Blob([P],{type:"text/plain"}),D=URL.createObjectURL(M),k=document.createElement("a");return k.href=D,k.download="sample-log.key",document.body.appendChild(k),k.click(),document.body.removeChild(k),URL.revokeObjectURL(D),window.showToast&&window.showToast("키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}}catch(M){return{success:!1,error:M.message}}}async function Z(){var U,F,M;const P=((U=window.electronAPI)==null?void 0:U.isElectron)===!0;let R=null;if(P&&((F=window.electronAPI)!=null&&F.importKeyFile)){const D=await window.electronAPI.importKeyFile();if(!(D!=null&&D.success))return(D==null?void 0:D.error)==="canceled"?{success:!1,error:"취소됨"}:{success:!1,error:(D==null?void 0:D.error)||"가져오기 실패"};R=D.content}else try{R=await new Promise((D,k)=>{const L=document.createElement("input");L.type="file",L.accept=".key",L.onchange=async se=>{const j=se.target.files[0];if(!j){k(new Error("파일 선택 취소"));return}const H=await j.text();D(H.trim())},L.click()})}catch(D){return{success:!1,error:D.message}}if(!R||R.length<20||R.length>64)return{success:!1,error:"유효하지 않은 키 파일입니다. (길이 불일치)"};if(!/^[A-Za-z0-9+/=]+$/.test(R))return{success:!1,error:"유효하지 않은 키 파일입니다. (형식 오류)"};if(P&&((M=window.electronAPI)!=null&&M.saveKeyFile))try{const D=await window.electronAPI.saveKeyFile(R);if(!(D!=null&&D.success))return{success:!1,error:"키 파일 로컬 저장 실패"}}catch(D){return{success:!1,error:"로컬 저장 실패: "+D.message}}return s=R,i="local",console.log("[Encryption] Key file imported successfully"),window.showToast&&window.showToast("키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.","success"),{success:!0}}async function ne(){var P;if((P=window.electronAPI)!=null&&P.loadSalt)try{const R=await window.electronAPI.loadSalt();if(R&&window.CryptoUtils)return console.log(`[Encryption] Salt loaded from Electron (${R.length} chars)`),window.CryptoUtils.base64ToBuffer(R)}catch(R){console.warn("[Encryption] Electron salt load failed:",R.message)}try{const R=localStorage.getItem(u);if(R&&window.CryptoUtils)return console.log(`[Encryption] Salt loaded from localStorage (${R.length} chars)`),window.CryptoUtils.base64ToBuffer(R)}catch(R){console.warn("[Encryption] localStorage salt load failed:",R.message)}return console.log("[Encryption] No saved salt found"),null}async function z(P){var U;if(!window.CryptoUtils)return;const R=window.CryptoUtils.bufferToBase64(P);if((U=window.electronAPI)!=null&&U.saveSalt)try{await window.electronAPI.saveSalt(R),console.log("[Encryption] Salt saved to Electron");return}catch(F){console.warn("[Encryption] Electron salt save failed:",F.message)}try{localStorage.setItem(u,R),console.log("[Encryption] Salt saved to localStorage")}catch(F){console.warn("[Encryption] localStorage salt save failed:",F.message)}}function me(P,R){return V(),new Promise(U=>{const F=pe=>{c=null,U(pe)};c=()=>{var pe;(pe=document.getElementById("encryption-password-modal"))==null||pe.remove(),U(null)};const M=document.getElementById("encryption-password-modal");M&&M.remove();const D=document.createElement("div");if(D.id="encryption-password-modal",D.innerHTML=`
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

                        ${CryptoUtils.createPasswordRulesHTML("enc")}

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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
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
            `,document.body.appendChild(D),P){const pe=document.getElementById("enc-error-msg");pe.textContent=P,pe.style.display="block",document.getElementById("enc-password-input").style.borderColor="#e74c3c"}const k=document.getElementById("enc-password-input"),L=document.getElementById("enc-submit-btn"),se=document.getElementById("enc-skip-btn"),j=document.getElementById("enc-password-error");CryptoUtils.bindPasswordValidation({prefix:"enc",input:k,submitBtn:L,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const H=document.getElementById("enc-toggle-pw");H&&H.addEventListener("click",()=>{const pe=k.type==="password";k.type=pe?"text":"password",H.innerHTML=pe?E:N}),k.addEventListener("focus",()=>{k.style.borderColor="#22C55E",k.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),k.addEventListener("blur",()=>{k.style.borderColor="#D1D5DB",k.style.boxShadow="none"}),k.addEventListener("input",()=>{j.style.display="none"});async function oe(){const pe=k.value;if(!pe){j.textContent="비밀번호를 입력해주세요.",j.style.display="block";return}if(R){L.disabled=!0,L.textContent="검증 중...",k.disabled=!0;const ae=document.getElementById("enc-error-msg");ae&&(ae.style.display="none");try{const be=await R(pe);if(be.valid)D.remove(),F(pe);else if(be.exhausted)D.remove(),F(null);else{k.disabled=!1,L.textContent="확인",ae&&(ae.textContent=be.error||"비밀번호가 올바르지 않습니다.",ae.style.display="block"),k.value="",k.style.borderColor="#e74c3c",k.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",k.focus();const Ve=D.querySelector("div > div");Ve&&(Ve.style.animation="none",Ve.offsetHeight,Ve.style.animation="enc-shake 0.4s ease")}}catch(be){k.disabled=!1,L.textContent="확인",ae&&(ae.textContent="검증 중 오류: "+(be.message||"알 수 없는 오류"),ae.style.display="block"),k.focus()}return}D.remove(),F(pe)}function re(){D.remove(),F(null)}D._showError=pe=>{const ae=document.getElementById("enc-error-msg");ae&&(ae.textContent=pe,ae.style.display="block"),k.value="",k.style.borderColor="#e74c3c",k.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",L.disabled=!0,k.focus();const be=D.querySelector("div > div");be&&(be.style.animation="none",be.offsetHeight,be.style.animation="enc-shake 0.4s ease")},L.addEventListener("click",oe),se.addEventListener("click",re),k.addEventListener("keydown",pe=>{pe.key==="Enter"&&!L.disabled&&oe(),pe.key==="Escape"&&re()}),on().then(pe=>{const ae=document.getElementById("enc-recover-link");ae&&pe&&(ae.style.display="block")}).catch(pe=>{console.debug("[Encryption] Recovery blob check for link display failed:",pe.message)});const fe=document.getElementById("enc-recover-btn");fe&&fe.addEventListener("click",async pe=>{pe.preventDefault(),D.remove(),F(g)}),setTimeout(()=>k.focus(),100)})}function le(){return V(),new Promise(P=>{const R=fe=>{c=null,P(fe)};c=()=>{var fe;(fe=document.getElementById("encryption-password-modal"))==null||fe.remove(),P(null)};const U=document.getElementById("encryption-password-modal");U&&U.remove();const F=document.createElement("div");F.id="encryption-password-modal",F.innerHTML=`
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

                        ${CryptoUtils.createPasswordRulesHTML("enc")}

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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            </button>
                        </div>
                        </div>

                        <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호 확인</label>
                        <input type="password" id="enc-password-confirm" placeholder="비밀번호 다시 입력" maxlength="64"
                            style="
                                width: 100%; padding: 12px 14px; font-size: 14px;
                                border: 1px solid #D1D5DB; border-radius: 10px;
                                box-sizing: border-box; outline: none; background: #F9FAFB;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                        />
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
            `,document.body.appendChild(F);const M=document.getElementById("enc-password-input"),D=document.getElementById("enc-password-confirm"),k=document.getElementById("enc-submit-btn"),L=document.getElementById("enc-skip-btn"),se=document.getElementById("enc-password-error");CryptoUtils.bindPasswordValidation({prefix:"enc",input:M,confirmInput:D,submitBtn:k,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)"});const j=document.getElementById("enc-toggle-pw");j&&j.addEventListener("click",()=>{const fe=M.type==="password";M.type=fe?"text":"password",j.innerHTML=fe?E:N}),[M,D].forEach(fe=>{fe.addEventListener("focus",()=>{fe.style.borderColor="#22C55E",fe.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),fe.addEventListener("blur",()=>{fe.style.borderColor="#D1D5DB",fe.style.boxShadow="none"})}),M.addEventListener("input",()=>{se.style.display="none"}),D.addEventListener("input",()=>{se.style.display="none"});function H(fe){se.textContent=fe,se.style.display="block"}function oe(){var ae;const fe=M.value,pe=D.value;if((ae=window.CryptoUtils)!=null&&ae.validatePassword){const be=window.CryptoUtils.validatePassword(fe);if(!be.valid){H(be.errors[0]);return}}if(fe!==pe){H("비밀번호가 일치하지 않습니다.");return}F.remove(),R(fe)}function re(){F.remove(),R(null)}k.addEventListener("click",oe),L.addEventListener("click",re),D.addEventListener("keydown",fe=>{fe.key==="Enter"&&!k.disabled&&oe(),fe.key==="Escape"&&re()}),M.addEventListener("keydown",fe=>{fe.key==="Escape"&&re()}),setTimeout(()=>M.focus(),100)})}async function ce(P){var R,U,F;if(!((R=window.firebaseConfig)!=null&&R.isEnabled())||!window.firestoreDb)return console.log("[Encryption] Key verification skipped (no Firestore)"),{verified:!0,skipped:!0};try{const M=window.firebaseConfig.getDb();if(!M)return{verified:!0,skipped:!0};const D=["soil","water","compost","heavy-metal","pesticide"],k=new Date().getFullYear();let L=null;for(const oe of D){const re=window.firestoreDb.getCollectionName(oe,k);if((await M.collection(re).limit(5).get()).forEach(pe=>{const ae=pe.data();ae._enc&&!L&&(L=ae)}),L)break}if(!L||!L._enc)return console.log("[Encryption] Key verification: no encrypted documents found - skipping"),{verified:!0,skipped:!0};const se=Object.keys(L._enc).find(oe=>oe!=="v");if(!se||!((U=L._enc[se])!=null&&U.iv)||!((F=L._enc[se])!=null&&F.ct))return console.log("[Encryption] Key verification: no valid encrypted field found - skipping"),{verified:!0,skipped:!0};const j=L._enc.v==="2.1";return console.log(`[Encryption] Key verification: testing decrypt of "${se}" (v${L._enc.v||"1"}, AAD=${j})...`),await window.CryptoUtils.decrypt(L._enc[se].iv,L._enc[se].ct,P,j?se:void 0)!==null?(console.log("[Encryption] Key verification: SUCCESS"),{verified:!0,skipped:!1}):(console.warn("[Encryption] Key verification: decrypt returned null (wrong key)"),{verified:!1,skipped:!1})}catch(M){return console.warn("[Encryption] Key verification FAILED:",M.message),{verified:!1,skipped:!1}}}function rt(){const P="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",R=256-256%P.length;let U="";for(;U.length<Y;){const F=crypto.getRandomValues(new Uint8Array(1));F[0]<R&&(U+=P[F[0]%P.length])}return U.match(/.{1,4}/g).join("-")}async function mt(P,R){const U=P.replace(/-/g,"").toUpperCase(),F=await crypto.subtle.importKey("raw",new TextEncoder().encode(U),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:R,iterations:ee,hash:"SHA-256"},F,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function it(P){var re,fe,pe;const R=rt(),U=crypto.getRandomValues(new Uint8Array(16)),F=await mt(R,U.buffer);let M;const D=await Ut(),k=s||await v();if(D&&k&&e){const ae=await window.CryptoUtils.createMasterKey(D,k,e,!0);M=await crypto.subtle.exportKey("raw",ae.key)}else M=await crypto.subtle.exportKey("raw",P);const L=crypto.getRandomValues(new Uint8Array(12)),se=await crypto.subtle.encrypt({name:"AES-GCM",iv:L},F,M),j={version:"2.0",iv:CryptoUtils.bufferToBase64(L.buffer),ct:CryptoUtils.bufferToBase64(se),salt:CryptoUtils.bufferToBase64(U.buffer),createdAt:new Date().toISOString()};let H=!1;if((re=window.firebaseConfig)!=null&&re.isEnabled()){const ae=window.firebaseConfig.getDb();if(ae){const be=he();try{await ae.collection(be).doc("recoveryBlob").set(j),console.log(`[Encryption] Recovery blob (v2.0) stored in ${be}/recoveryBlob`),H=!0}catch(Ve){console.error("[Encryption] Failed to store recovery blob in Firebase:",Ve.message)}}}if(((fe=window.electronAPI)==null?void 0:fe.isElectron)===!0&&((pe=window.electronAPI)!=null&&pe.saveRecoveryBlob))try{const ae=await window.electronAPI.saveRecoveryBlob(JSON.stringify(j));ae!=null&&ae.success&&(console.log("[Encryption] Recovery blob stored locally (safeStorage protected)"),H=!0)}catch(ae){console.error("[Encryption] Failed to store recovery blob locally:",ae.message)}if(!H)try{localStorage.setItem(h,JSON.stringify(j)),console.log("[Encryption] Recovery blob stored in localStorage"),H=!0}catch(ae){console.error("[Encryption] Failed to store recovery blob in localStorage:",ae.message)}return H?R:null}async function on(){var R,U,F,M;if((R=window.firebaseConfig)!=null&&R.isEnabled()){const D=window.firebaseConfig.getDb();if(D){const k=he();try{const L=await D.collection(k).doc("recoveryBlob").get();if(L.exists&&((U=L.data())!=null&&U.ct))return!0}catch(L){console.warn("[Encryption] Recovery blob check (Firebase) failed:",L.message)}}}if(((F=window.electronAPI)==null?void 0:F.isElectron)===!0&&((M=window.electronAPI)!=null&&M.loadRecoveryBlob))try{const D=await window.electronAPI.loadRecoveryBlob();if(D){const k=JSON.parse(D);if(k!=null&&k.ct)return!0}}catch(D){console.warn("[Encryption] Recovery blob check (local) failed:",D.message)}try{const D=localStorage.getItem(h);if(D){const k=JSON.parse(D);if(k!=null&&k.ct)return!0}}catch(D){console.warn("[Encryption] Recovery blob check (localStorage) failed:",D.message)}return!1}async function zn(P){try{if(!await on()){console.log("[Encryption] No recovery blob found - generating for existing user...");const U=await it(P);U&&(await Vt(U),console.log("[Encryption] Recovery blob created for existing user"))}}catch(R){console.warn("[Encryption] ensureRecoveryBlob failed:",R.message)}}async function Nr(){if(!r)return{success:!1,message:"암호화가 활성화되지 않았습니다."};try{const P=await it(r);return P?(await Vt(P),{success:!0,message:"복구 키가 재발급되었습니다."}):{success:!1,message:"복구 키 생성에 실패했습니다."}}catch(P){return console.error("[Encryption] regenerateRecoveryKey error:",P),{success:!1,message:P.message}}}async function Vr(P){var U,F,M;let R=null;if((U=window.firebaseConfig)!=null&&U.isEnabled()){const D=window.firebaseConfig.getDb();if(D){const k=he();try{const L=await D.collection(k).doc("recoveryBlob").get();L.exists&&(R=L.data())}catch(L){console.warn("[Encryption] Recovery blob load (Firebase) failed:",L.message)}}}if(!R&&((F=window.electronAPI)==null?void 0:F.isElectron)===!0&&(M=window.electronAPI)!=null&&M.loadRecoveryBlob)try{const k=await window.electronAPI.loadRecoveryBlob();k&&(R=JSON.parse(k))}catch(k){console.warn("[Encryption] Recovery blob load (local) failed:",k.message)}if(!R)try{const D=localStorage.getItem(h);D&&(R=JSON.parse(D),console.log("[Encryption] Recovery blob loaded from localStorage"))}catch(D){console.warn("[Encryption] Recovery blob load (localStorage) failed:",D.message)}if(!R)return console.warn("[Encryption] Recovery blob not found"),null;try{if(!R.version||!["1.0","2.0"].includes(R.version))return console.warn("[Encryption] Unknown recovery blob version:",R.version),null;if(!R.iv||!R.ct||!R.salt)return console.warn("[Encryption] Invalid recovery blob format"),null;const D=CryptoUtils.base64ToBuffer(R.salt),k=await mt(P,D),L=new Uint8Array(CryptoUtils.base64ToBuffer(R.iv)),se=CryptoUtils.base64ToBuffer(R.ct),j=await crypto.subtle.decrypt({name:"AES-GCM",iv:L},k,se);if(R.version==="2.0")return await crypto.subtle.importKey("raw",j,{name:"AES-GCM"},!1,["encrypt","decrypt"]);{const H=new TextDecoder().decode(j),oe=await v(),re=await ne();return!oe||!re?null:(await window.CryptoUtils.createMasterKey(H,oe,re)).key}}catch(D){return console.warn("[Encryption] Recovery decryption failed:",D.message),null}}function Vt(P){return new Promise(R=>{const U=document.getElementById("recovery-key-modal");U&&U.remove();const F=document.createElement("div");F.id="recovery-key-modal",F.innerHTML=`
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
            `,document.body.appendChild(F),document.getElementById("recovery-key-display").textContent=P;let M=null;document.getElementById("recovery-key-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(P);const D=document.getElementById("recovery-key-copy");D.textContent="복사됨! (30초 후 클립보드 삭제)",D.style.background="#dcfce7",D.style.borderColor="#22c55e",D.style.color="#16a34a",M&&clearTimeout(M),M=setTimeout(async()=>{try{await navigator.clipboard.readText()===P&&await navigator.clipboard.writeText("")}catch{}const k=document.getElementById("recovery-key-copy");k&&(k.textContent="복사",k.style.background="#eff6ff",k.style.borderColor="#3b82f6",k.style.color="#3b82f6")},3e4)}catch(D){console.warn("Clipboard write failed:",D)}}),document.getElementById("recovery-key-close").addEventListener("click",()=>{M&&clearTimeout(M);try{navigator.clipboard.writeText("").catch(()=>{})}catch{}F.remove(),R()})})}function Pn(){return new Promise(P=>{const R=H=>{c=null,P(H)};c=()=>{var H;(H=document.getElementById("recovery-input-modal"))==null||H.remove(),P(null)};const U=document.getElementById("recovery-input-modal");U&&U.remove();const F=document.createElement("div");F.id="recovery-input-modal",F.innerHTML=`
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
            `,document.body.appendChild(F);const M=document.getElementById("recovery-key-input"),D=document.getElementById("recovery-input-submit"),k=document.getElementById("recovery-input-cancel"),L=document.getElementById("recovery-input-error");M.addEventListener("input",()=>{var re;L.style.display="none";let H=M.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();H.length>24&&(H=H.substring(0,24));const oe=((re=H.match(/.{1,4}/g))==null?void 0:re.join("-"))||H;M.value=oe});function se(){const H=M.value.replace(/-/g,"").trim();if(H.length!==24){L.textContent="복구 키는 24자리여야 합니다.",L.style.display="block";return}F.remove(),R(H)}function j(){F.remove(),R(null)}D.addEventListener("click",se),k.addEventListener("click",j),M.addEventListener("keydown",H=>{H.key==="Enter"&&se(),H.key==="Escape"&&j()}),setTimeout(()=>M.focus(),100)})}function Gt(P){let R=document.getElementById("recovery-progress-overlay");if(R){const U=document.getElementById("recovery-progress-text");U&&(U.textContent=P),R.style.display="flex"}else{R=document.createElement("div"),R.id="recovery-progress-overlay",R.style.cssText=`
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 99998;
                display: flex; align-items: center; justify-content: center;
            `;const U=document.createElement("div");U.style.cssText=`
                background: white; border-radius: 12px; padding: 32px;
                text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                min-width: 280px;
            `;const F=document.createElement("div");F.style.cssText=`
                width: 40px; height: 40px; border: 4px solid #e2e8f0;
                border-top: 4px solid #3b82f6; border-radius: 50%;
                animation: encSpin 1s linear infinite; margin: 0 auto 16px;
            `;const M=document.createElement("style");M.textContent="@keyframes encSpin { to { transform: rotate(360deg); } }",document.head.appendChild(M);const D=document.createElement("div");D.id="recovery-progress-text",D.style.cssText="font-size: 14px; color: #333;",D.textContent=P,U.appendChild(F),U.appendChild(D),R.appendChild(U),document.body.appendChild(R)}}function Le(){const P=document.getElementById("recovery-progress-overlay");P&&P.remove()}async function an(){var D;if(!((D=window.firebaseConfig)!=null&&D.isEnabled()))return{allowed:!0,remaining:5};const U=window.firebaseConfig.getDb();if(!U)return{allowed:!0,remaining:5};const F=he(),M=U.collection(F).doc("recoveryAttempts");try{return await U.runTransaction(async L=>{const se=await L.get(M),j=se.exists?se.data():null;if(j){const H=new Date(j.lastAttemptAt),oe=new Date,re=(oe-H)/6e4;return re>=30?(L.set(M,{count:1,lastAttemptAt:oe.toISOString()}),{allowed:!0,remaining:4}):j.count>=5?{allowed:!1,remaining:0,lockoutMinutes:Math.ceil(30-re)}:(L.update(M,{count:j.count+1,lastAttemptAt:oe.toISOString()}),{allowed:!0,remaining:5-j.count-1})}return L.set(M,{count:1,lastAttemptAt:new Date().toISOString()}),{allowed:!0,remaining:4}})}catch(k){return console.warn("[Encryption] Recovery attempts check failed:",k.message),{allowed:!0,remaining:5}}}async function jn(){var U;if(!((U=window.firebaseConfig)!=null&&U.isEnabled()))return;const P=window.firebaseConfig.getDb();if(!P)return;const R=he();try{await P.collection(R).doc("recoveryAttempts").delete()}catch(F){console.warn("[Encryption] Failed to reset recovery attempts:",F.message)}}async function Gn(){var R,U,F;if(!await y("passwordChange"))return alert("다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요."),{success:!1,error:"Another password operation in progress"};try{let D=0,k=null;for(;D<3;){const L=await an();if(!L.allowed)return alert(`복구 시도 횟수를 초과했습니다.
${L.lockoutMinutes}분 후에 다시 시도해주세요.`),{success:!1,error:"Rate limited"};const se=await Pn();if(!se)return{success:!1,error:"Cancelled"};if(Gt("복구 키 검증 중..."),k=await Vr(se),k)break;if(D++,Le(),D>=3)return alert("복구 키 시도 횟수를 초과했습니다. (3회)"),{success:!1,error:"Max retries exceeded"};alert("복구 키가 올바르지 않습니다. ("+D+"/3)"+(L.remaining>0?`
남은 전체 시도: `+L.remaining+"회":""))}Gt("마스터 키 검증 중...");try{if(!(await ce(k)).verified)return Le(),alert(`복구된 키로 데이터를 검증할 수 없습니다.
복구 블롭이 오래되었거나 손상되었을 수 있습니다.`),{success:!1,error:"Key verification failed"};await jn(),Gt("키 파일 로드 중...");let se=s||await v();if(!se){if(Le(),((R=window.electronAPI)==null?void 0:R.isElectron)===!0&&confirm(`키 파일을 찾을 수 없습니다.
키 파일을 가져오시겠습니까?`)){const Ze=await Z();Ze!=null&&Ze.success&&(se=s||await v())}if(!se)return alert(`키 파일을 불러올 수 없습니다.
키 파일 내보내기로 백업한 .key 파일을 가져오거나,
Firebase 연결을 확인해주세요.`),{success:!1,error:"Key file not found"}}Le();const j=await le();if(!j)return{success:!1,error:"New password cancelled"};Gt("새 마스터 키 생성 중...");const H=await window.CryptoUtils.createMasterKey(j,se,null),oe=H.key,re=H.salt,fe=k,pe=[];try{if((U=window.firebaseConfig)!=null&&U.isEnabled()&&window.firestoreDb){const be=window.firebaseConfig.getDb();if(be){const Ve=["soil","water","pesticide","compost","heavyMetal"],Ze=new Date().getFullYear();let Ce=0;const ut=Ve.length*(Ze-2020+1);for(const _t of Ve)for(let dt=2020;dt<=Ze;dt++){Ce++,Gt(`데이터 재암호화 중... (${Ce}/${ut})`);const Wn=window.firestoreDb.getCollectionName(_t,dt);await Lr(be,Wn,fe,oe),pe.push(Wn)}}}}catch(be){console.error("[Encryption] Recovery re-encryption failed, rolling back...",be);const Ve=[];if(pe.length>0&&((F=window.firebaseConfig)!=null&&F.isEnabled())){const Ze=window.firebaseConfig.getDb();if(Ze)for(const Ce of pe)try{await Lr(Ze,Ce,oe,fe)}catch(ut){console.error(`[Encryption] Rollback FAILED: ${Ce}`,ut.message),Ve.push(Ce)}}return Le(),Ve.length>0?alert(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${Ve.join(", ")}. 관리자에게 문의하세요.`):alert("재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요."),{success:!1,error:"Re-encryption failed, rolled back"}}Gt("설정 저장 중..."),e=re,await z(re),r=oe,t=!0,s=null,await Wt(j);const ae=await it(oe);return Le(),ae&&await Vt(ae),console.log("[Encryption] Password recovery completed successfully"),alert("비밀번호가 성공적으로 복구되었습니다."),{success:!0}}catch(L){return Le(),console.error("[Encryption] Password recovery failed:",L),alert("비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요."),{success:!1,error:L.message}}}finally{await _("passwordChange")}}async function Or(){if(t)return!!r;if(n)return!1;if(n=!0,!window.CryptoUtils)return console.warn("[Encryption] CryptoUtils not loaded"),n=!1,!1;try{if(console.log("[Encryption] Step 1: Loading key file..."),s=await v(),!s&&(console.log("[Encryption] No existing key found - starting first-time setup"),o=!0,s=await S(),!s))return console.error("[Encryption] Failed to generate key file"),!1;console.debug(`[Encryption] Key ready (source: ${i})`),i==="local"&&(console.log("[Encryption] Key loaded from local - syncing to Firebase..."),await T(s)),console.log("[Encryption] Step 2: Loading salt..."),e=await ne();const P=!e;console.log(e?`[Encryption] Salt loaded (${new Uint8Array(e).length} bytes)`:"[Encryption] No saved salt - will generate new one");let R;return o?R=await cn(P):R=await lt(P),R&&(t=!0),n=!1,R}catch(P){return console.error("[Encryption] Init FAILED:",P.message),console.error("[Encryption] Stack:",P.stack),s=null,n=!1,!1}}async function Wt(P){var R;if((R=window.electronAPI)!=null&&R.storeSessionPassword){await window.electronAPI.storeSessionPassword(P),console.log("[Encryption] Password stored in session (main process memory)");return}try{sessionStorage.setItem(p,P),console.log("[Encryption] Password stored in sessionStorage")}catch(U){console.warn("[Encryption] sessionStorage password store failed:",U.message)}}async function Ut(){var P;if((P=window.electronAPI)!=null&&P.getSessionPassword){const R=await window.electronAPI.getSessionPassword();if(R)return console.log("[Encryption] Session password found in main process"),R}try{const R=sessionStorage.getItem(p);if(R)return console.log("[Encryption] Session password found in sessionStorage"),R}catch(R){console.warn("[Encryption] sessionStorage password read failed:",R.message)}return null}async function cn(P){console.log("[Encryption] === FIRST-TIME SETUP ===");const R=await le();if(!R)return console.warn("[Encryption] First-time setup skipped by user"),s=null,!1;console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const U=await window.CryptoUtils.createMasterKey(R,s,e);r=U.key,e=U.salt,P&&(console.log("[Encryption] Saving new salt..."),await z(e)),await Wt(R);try{const F=await it(r);F&&await Vt(F)}catch(F){console.warn("[Encryption] Recovery key generation failed:",F.message)}return console.log("[Encryption] First-time setup SUCCESS (verification skipped - no existing encrypted data)"),s=null,o=!1,!0}async function lt(P){var D;const R=await Ut();if(R){console.log("[Encryption] Auto-login with stored session password...");const k=await window.CryptoUtils.createMasterKey(R,s,e);if(r=k.key,e=k.salt,P&&await z(e),(await ce(r)).verified)return await zn(r),s=null,console.log("[Encryption] Auto-login SUCCESS (session password)"),!0;console.warn("[Encryption] Stored session password is invalid - clearing"),r=null,(D=window.electronAPI)!=null&&D.clearSessionPassword&&await window.electronAPI.clearSessionPassword()}let U=0,F=null;const M=async k=>{console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const L=await window.CryptoUtils.createMasterKey(k,s,e);return r=L.key,e=L.salt,P&&U===0&&(console.log("[Encryption] Saving new salt..."),await z(e)),console.log("[Encryption] Verifying key against encrypted data..."),(await ce(r)).verified?{valid:!0}:(U++,r=null,console.warn(`[Encryption] Key verification failed (attempt ${U}/${O})`),U>=O?{valid:!1,error:`비밀번호 시도 횟수를 초과했습니다. (${O}회)`,exhausted:!0}:{valid:!1,error:`비밀번호가 올바르지 않습니다. (${U}/${O})`})};for(;U<O;){console.log(`[Encryption] Password prompt (attempt ${U+1}/${O})...`);const k=await me(F,M);if(!k)return console.warn("[Encryption] Password skipped - encryption disabled"),s=null,!1;if(k===g){console.log("[Encryption] Password recovery requested from login prompt");try{const L=await Gn();if(L!=null&&L.success)return console.log("[Encryption] Password recovered successfully"),!0;F=(L==null?void 0:L.error)==="Cancelled"?null:"비밀번호 복구에 실패했습니다. 다시 시도해주세요."}catch(L){console.error("[Encryption] Recovery error:",L),F="비밀번호 복구 중 오류: "+(L.message||"알 수 없는 오류")}continue}return await Wt(k),await zn(r),s=null,console.log(`[Encryption] Login SUCCESS (source: ${i})`),!0}return console.error("[Encryption] All password attempts exhausted"),s=null,r=null,!1}async function yt(){var P;if(console.log("[Encryption] === KEY REGENERATION ==="),(P=window.firebaseConfig)!=null&&P.isEnabled()){const R=window.firebaseConfig.getDb();if(R){const U=he();try{await R.collection(U).doc("encryptionKey").delete(),console.log(`[Encryption] Deleted ${U}/encryptionKey from Firebase`)}catch(F){console.warn("[Encryption] Firebase key delete failed:",F.message)}}}return Cs(),await Or()}function Ti(){return V(),new Promise(P=>{const R=oe=>{c=null,P(oe)};c=()=>{var oe;(oe=document.getElementById("encryption-password-modal"))==null||oe.remove(),P(null)};const U=document.getElementById("encryption-password-modal");U&&U.remove();const F=document.createElement("div");F.id="encryption-password-modal",F.innerHTML=`
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
                                비밀번호 확인
                            </h3>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                                데이터 내보내기를 위해 암호화 비밀번호를 입력해주세요.
                            </p>
                        </div>

                        ${CryptoUtils.createPasswordRulesHTML("enc-export")}

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-export-pw-input" placeholder="비밀번호를 입력하세요" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1px solid #D1D5DB; border-radius: 10px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-export-toggle-pw" style="
                                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                    background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                                " title="비밀번호 표시/숨기기">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                </button>
                            </div>
                            <div id="enc-export-pw-error" style="
                                color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                            "></div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button id="enc-export-cancel" style="
                                flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                                border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                                transition: background 0.2s;
                            ">취소</button>
                            <button id="enc-export-submit" style="
                                flex: 1; padding: 12px 20px; border: none;
                                background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                                color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: opacity 0.2s;
                            " disabled>확인</button>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(F);const M=document.getElementById("enc-export-pw-input"),D=document.getElementById("enc-export-submit"),k=document.getElementById("enc-export-cancel"),L=document.getElementById("enc-export-pw-error");CryptoUtils.bindPasswordValidation({prefix:"enc-export",input:M,submitBtn:D,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const se=document.getElementById("enc-export-toggle-pw");se&&se.addEventListener("click",()=>{const oe=M.type==="password";M.type=oe?"text":"password",se.innerHTML=oe?E:N}),M.addEventListener("focus",()=>{M.style.borderColor="#22C55E",M.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),M.addEventListener("blur",()=>{M.style.borderColor="#D1D5DB",M.style.boxShadow="none"}),M.addEventListener("input",()=>{L.style.display="none"});function j(){const oe=M.value;if(!oe){L.textContent="비밀번호를 입력해주세요.",L.style.display="block";return}F.remove(),R(oe)}function H(){F.remove(),R(null)}D.addEventListener("click",j),k.addEventListener("click",H),M.addEventListener("keydown",oe=>{oe.key==="Enter"&&!D.disabled&&j(),oe.key==="Escape"&&H()}),setTimeout(()=>M.focus(),100)})}async function al(P){if(!P||typeof P!="string")return!1;const R=await Ut();if(R&&X(P,R))return!0;try{const U=s||await v();if(!U||!e)return!1;const F=await window.CryptoUtils.createMasterKey(P,U,e);return(await ce(F.key)).verified}catch(U){return console.warn("[Encryption] verifyPassword failed:",U.message),!1}}async function fa(){if(!r)return console.warn("[Encryption] verifyPasswordForExport: no active key"),!1;const P=await Ti();if(!P)return!1;const R=await Ut();if(R&&X(P,R))return console.log("[Encryption] Export password verification: MATCH"),!0;try{const U=await v();if(!U)return!1;const F=await window.CryptoUtils.createMasterKey(P,U,e);if((await ce(F.key)).verified)return console.log("[Encryption] Export password verification: VALID (key-derived)"),!0}catch(U){console.warn("[Encryption] Export password verification failed:",U.message)}return alert("비밀번호가 올바르지 않습니다."),!1}function cl(){return V(),new Promise(P=>{const R=re=>{c=null,P(re)};c=()=>{var re;(re=document.getElementById("encryption-password-modal"))==null||re.remove(),P(null)};const U=document.getElementById("encryption-password-modal");U&&U.remove();const F=document.createElement("div");F.id="encryption-password-modal",F.innerHTML=`
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <div style="
                        background: white; border-radius: 20px; padding: 36px;
                        width: 440px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex; flex-direction: column; gap: 16px;
                    ">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%); display: flex; align-items: center; justify-content: center;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                            </div>
                            <h3 style="margin: 0; font-size: 22px; font-weight: 700; color: #111827;">비밀번호 변경</h3>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; text-align: center; line-height: 1.5;">
                                현재 비밀번호를 확인하고 새 비밀번호를 설정합니다.<br>
                                <span style="color: #D97706; font-size: 12px; font-weight: 500;">모든 암호화된 데이터가 새 비밀번호로 재암호화됩니다.</span>
                            </p>
                        </div>

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">현재 비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-old-pw" placeholder="현재 비밀번호" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-old" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">새 비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-new-pw" placeholder="새 비밀번호 입력" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 4px;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-new" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>
                        ${CryptoUtils.createPasswordRulesHTML("enc-ch")}

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">새 비밀번호 확인</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-confirm-pw" placeholder="새 비밀번호 다시 입력" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-confirm" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>
                        <div id="enc-ch-error" style="
                            color: #EF4444; font-size: 12px; display: none;
                        "></div>
                        <div id="enc-ch-progress" style="display: none;">
                            <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px;">비밀번호 변경 중... 데이터를 재암호화하고 있습니다.</div>
                            <div style="height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
                                <div id="enc-ch-progress-bar" style="height: 100%; background: linear-gradient(90deg, #22C55E, #16A34A); border-radius: 3px; width: 0; transition: width 0.5s;"></div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="enc-ch-cancel" style="
                                padding: 10px 24px; border: 1.5px solid #D1D5DB; background: white;
                                border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151;
                                transition: background 0.2s;
                            ">취소</button>
                            <button id="enc-ch-submit" style="
                                padding: 10px 24px; border: none; background: #ccc;
                                color: white; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: background 0.2s;
                            " disabled>변경</button>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(F);const M=document.getElementById("enc-ch-old-pw"),D=document.getElementById("enc-ch-new-pw"),k=document.getElementById("enc-ch-confirm-pw"),L=document.getElementById("enc-ch-submit"),se=document.getElementById("enc-ch-cancel"),j=document.getElementById("enc-ch-error"),H=CryptoUtils.bindPasswordValidation({prefix:"enc-ch",input:D,confirmInput:k,submitBtn:L,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",extraCheck:()=>M.value.length>0});M.addEventListener("input",()=>{H.updateValidation(),j.style.display="none"}),D.addEventListener("input",()=>{j.style.display="none"}),k.addEventListener("input",()=>{j.style.display="none"});function oe(re,fe){const pe=document.getElementById(re);pe&&pe.addEventListener("click",()=>{const ae=fe.type==="password";fe.type=ae?"text":"password",pe.innerHTML=ae?E:N})}oe("enc-ch-toggle-old",M),oe("enc-ch-toggle-new",D),oe("enc-ch-toggle-confirm",k),[M,D,k].forEach(re=>{re.addEventListener("focus",()=>{re.style.borderColor="#22C55E",re.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),re.addEventListener("blur",()=>{re.style.borderColor="#D1D5DB",re.style.boxShadow="none"})}),L.addEventListener("click",()=>{var ae;const re=M.value,fe=D.value,pe=k.value;if(fe!==pe){j.textContent="새 비밀번호가 일치하지 않습니다.",j.style.display="block";return}if((ae=window.CryptoUtils)!=null&&ae.validatePassword){const be=window.CryptoUtils.validatePassword(fe);if(!be.valid){j.textContent=be.errors[0],j.style.display="block";return}}M.disabled=!0,D.disabled=!0,k.disabled=!0,L.disabled=!0,se.disabled=!0,L.style.background="#ccc",R({oldPassword:re,newPassword:fe,modal:F,errDiv:j})}),se.addEventListener("click",()=>{F.remove(),R(null)}),M.addEventListener("keydown",re=>{re.key==="Escape"&&(F.remove(),R(null))}),D.addEventListener("keydown",re=>{re.key==="Escape"&&(F.remove(),R(null))}),k.addEventListener("keydown",re=>{re.key==="Enter"&&!L.disabled&&L.click(),re.key==="Escape"&&(F.remove(),R(null))}),setTimeout(()=>M.focus(),100)})}async function Mr(){var R,U;if(!r)return alert("암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요."),{success:!1,error:"Encryption not active"};if(!await y("passwordChange"))return alert("다른 창에서 비밀번호 변경이 진행 중입니다. 잠시 후 다시 시도해주세요."),{success:!1,error:"Another password change in progress"};try{const F=await cl();if(!F)return{success:!1,error:"Cancelled"};const{oldPassword:M,newPassword:D,modal:k,errDiv:L}=F,se=document.getElementById("enc-ch-progress"),j=document.getElementById("enc-ch-progress-bar");try{const H=await v();if(!H)return L.textContent="키 파일을 불러올 수 없습니다.",L.style.display="block",k.remove(),{success:!1,error:"Key file not found"};const oe=await Ut();let re=!1;if(oe&&X(M,oe))re=!0;else{const Ce=await window.CryptoUtils.createMasterKey(M,H,e);re=(await ce(Ce.key)).verified}if(!re)return L.textContent="현재 비밀번호가 올바르지 않습니다.",L.style.display="block",document.getElementById("enc-ch-old-pw").disabled=!1,document.getElementById("enc-ch-new-pw").disabled=!1,document.getElementById("enc-ch-confirm-pw").disabled=!1,document.getElementById("enc-ch-cancel").disabled=!1,{success:!1,error:"Invalid current password"};const fe=e,pe=r,ae=[];se.style.display="block",j.style.width="10%",console.log("[Encryption] Deriving new master key...");const be=await window.CryptoUtils.createMasterKey(D,H,null),Ve=be.key,Ze=be.salt;j.style.width="20%";try{if((R=window.firebaseConfig)!=null&&R.isEnabled()&&window.firestoreDb){const Ce=window.firebaseConfig.getDb();if(Ce){const ut=["soil","water","pesticide","compost","heavyMetal"],_t=new Date().getFullYear(),dt=[];for(let Hn=2020;Hn<=_t;Hn++)dt.push(Hn);const Wn=ut.length*dt.length;let Xt=0;for(const Hn of ut)for(const ya of dt){const bi=window.firestoreDb.getCollectionName(Hn,ya);await Lr(Ce,bi,pe,Ve),ae.push(bi),Xt++;const ks=20+Xt/Wn*70;j.style.width=ks+"%"}}}}catch(Ce){console.error("[Encryption] Re-encryption failed, attempting rollback...",Ce),j.style.background="#e74c3c";const ut=[];if(ae.length>0&&((U=window.firebaseConfig)!=null&&U.isEnabled())){const _t=window.firebaseConfig.getDb();if(_t)for(const dt of ae)try{await Lr(_t,dt,Ve,pe),console.log(`[Encryption] Rollback success: ${dt}`)}catch(Wn){console.error(`[Encryption] Rollback FAILED: ${dt}`,Wn.message),ut.push(dt)}}if(ut.length>0){const _t=ut.join(", ");console.error(`[Encryption] CRITICAL: Rollback failed for: ${_t}`),console.error("[Encryption] These collections may have mixed encryption state (old+new keys)"),L.textContent=`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${_t}. 관리자에게 문의하세요.`}else L.textContent="재암호화 실패. 기존 비밀번호가 유지됩니다.";return L.style.display="block",document.getElementById("enc-ch-old-pw").disabled=!1,document.getElementById("enc-ch-new-pw").disabled=!1,document.getElementById("enc-ch-confirm-pw").disabled=!1,document.getElementById("enc-ch-cancel").disabled=!1,se.style.display="none",{success:!1,error:"Re-encryption failed, rolled back"}}j.style.width="95%",e=Ze,await z(Ze),r=Ve,await Wt(D);try{const Ce=await it(Ve);if(Ce)return j.style.width="100%",k.remove(),await Vt(Ce),console.log("[Encryption] Password change completed successfully"),alert("비밀번호가 성공적으로 변경되었습니다."),{success:!0}}catch(Ce){console.warn("[Encryption] Recovery blob update failed:",Ce.message)}return j.style.width="100%",console.log("[Encryption] Password change completed successfully"),k.remove(),alert("비밀번호가 성공적으로 변경되었습니다."),{success:!0}}catch(H){return console.error("[Encryption] Password change failed:",H),k.remove(),alert("비밀번호 변경 중 오류가 발생했습니다: "+H.message),{success:!1,error:H.message}}}finally{await _("passwordChange")}}async function Lr(P,R,U,F){var se,j;const M=await P.collection(R).get();if(M.empty)return;const D=200,k=[];M.forEach(H=>k.push({ref:H.ref,id:H.id,data:H.data()}));const L=[];for(let H=0;H<k.length;H+=D){const oe=k.slice(H,H+D),re=P.batch();let fe=!1;for(const{ref:pe,id:ae,data:be}of oe)if(be._enc)try{const Ve=await window.CryptoUtils.decryptRecord({...be},U),Ze=await window.CryptoUtils.encryptRecord(Ve,F);if(Ze._enc){const Ce={...Ze},ut=(j=(se=window.firebase)==null?void 0:se.firestore)==null?void 0:j.FieldValue;if(ut){for(const _t of window.CryptoUtils.SENSITIVE_FIELDS)(!(_t in Ce)||Ce[_t]===void 0)&&(Ce[_t]=ut.delete());Ce.updatedAt=ut.serverTimestamp()}re.set(pe,Ce,{merge:!0}),fe=!0}}catch(Ve){L.push(ae),console.error(`[ReEncrypt] ${R}/${ae}: re-encrypt failed -`,Ve.message)}if(L.length>0)throw new Error(`${R}: ${L.length}개 문서 재암호화 실패 (${L.join(", ")})`);fe&&await re.commit()}console.log(`[ReEncrypt] ${R}: re-encrypted ${k.length} docs`)}function pa(){return!!r}function Ps(){return r}function ll(){return i}function Cs(){if(r=null,s&&typeof s=="string")try{const P=crypto.getRandomValues(new Uint8Array(s.length));s=String.fromCharCode(...P)}catch{}s=null,e=null,t=!1,n=!1,i=null,o=!1;try{sessionStorage.removeItem(p)}catch{}}function ga(){Cs()}async function ma(){if(t)return!!r;if(n)return!1;if(n=!0,!window.CryptoUtils)return n=!1,!1;try{const P=await Ut();if(!P)return console.log("[Encryption] Silent init: no session password - skipping"),n=!1,!1;if(s=await v(),!s)return n=!1,!1;e=await ne();const R=!e,U=await window.CryptoUtils.createMasterKey(P,s,e);return r=U.key,e=U.salt,R&&await z(e),(await ce(r)).verified?(t=!0,s=null,console.log("[Encryption] Silent init SUCCESS"),n=!1,!0):(r=null,s=null,n=!1,!1)}catch(P){return console.warn("[Encryption] Silent init failed:",P.message),s=null,n=!1,!1}}return{init:Or,initSilent:ma,isReady:pa,getKey:Ps,getKeySource:ll,destroy:Cs,reset:ga,regenerateKey:yt,verifyPassword:al,verifyPasswordForExport:fa,changePassword:Mr,recoverPassword:Gn,checkRecoveryBlobExists:on,regenerateRecoveryKey:Nr,exportKeyFile:B,importKeyFile:Z,_cleanupModal(){c&&(c(),c=null)}}}();window.encryptionManager=Xl;window.addEventListener("beforeunload",()=>{typeof Xl._cleanupModal=="function"&&Xl._cleanupModal()});var Lf=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var dr,Lm;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(I,y){function _(){}_.prototype=y.prototype,I.F=y.prototype,I.prototype=new _,I.prototype.constructor=I,I.D=function(v,T,S){for(var w=Array(arguments.length-2),B=2;B<arguments.length;B++)w[B-2]=arguments[B];return y.prototype[T].apply(v,w)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(I,y,_){_||(_=0);const v=Array(16);if(typeof y=="string")for(var T=0;T<16;++T)v[T]=y.charCodeAt(_++)|y.charCodeAt(_++)<<8|y.charCodeAt(_++)<<16|y.charCodeAt(_++)<<24;else for(T=0;T<16;++T)v[T]=y[_++]|y[_++]<<8|y[_++]<<16|y[_++]<<24;y=I.g[0],_=I.g[1],T=I.g[2];let S=I.g[3],w;w=y+(S^_&(T^S))+v[0]+3614090360&4294967295,y=_+(w<<7&4294967295|w>>>25),w=S+(T^y&(_^T))+v[1]+3905402710&4294967295,S=y+(w<<12&4294967295|w>>>20),w=T+(_^S&(y^_))+v[2]+606105819&4294967295,T=S+(w<<17&4294967295|w>>>15),w=_+(y^T&(S^y))+v[3]+3250441966&4294967295,_=T+(w<<22&4294967295|w>>>10),w=y+(S^_&(T^S))+v[4]+4118548399&4294967295,y=_+(w<<7&4294967295|w>>>25),w=S+(T^y&(_^T))+v[5]+1200080426&4294967295,S=y+(w<<12&4294967295|w>>>20),w=T+(_^S&(y^_))+v[6]+2821735955&4294967295,T=S+(w<<17&4294967295|w>>>15),w=_+(y^T&(S^y))+v[7]+4249261313&4294967295,_=T+(w<<22&4294967295|w>>>10),w=y+(S^_&(T^S))+v[8]+1770035416&4294967295,y=_+(w<<7&4294967295|w>>>25),w=S+(T^y&(_^T))+v[9]+2336552879&4294967295,S=y+(w<<12&4294967295|w>>>20),w=T+(_^S&(y^_))+v[10]+4294925233&4294967295,T=S+(w<<17&4294967295|w>>>15),w=_+(y^T&(S^y))+v[11]+2304563134&4294967295,_=T+(w<<22&4294967295|w>>>10),w=y+(S^_&(T^S))+v[12]+1804603682&4294967295,y=_+(w<<7&4294967295|w>>>25),w=S+(T^y&(_^T))+v[13]+4254626195&4294967295,S=y+(w<<12&4294967295|w>>>20),w=T+(_^S&(y^_))+v[14]+2792965006&4294967295,T=S+(w<<17&4294967295|w>>>15),w=_+(y^T&(S^y))+v[15]+1236535329&4294967295,_=T+(w<<22&4294967295|w>>>10),w=y+(T^S&(_^T))+v[1]+4129170786&4294967295,y=_+(w<<5&4294967295|w>>>27),w=S+(_^T&(y^_))+v[6]+3225465664&4294967295,S=y+(w<<9&4294967295|w>>>23),w=T+(y^_&(S^y))+v[11]+643717713&4294967295,T=S+(w<<14&4294967295|w>>>18),w=_+(S^y&(T^S))+v[0]+3921069994&4294967295,_=T+(w<<20&4294967295|w>>>12),w=y+(T^S&(_^T))+v[5]+3593408605&4294967295,y=_+(w<<5&4294967295|w>>>27),w=S+(_^T&(y^_))+v[10]+38016083&4294967295,S=y+(w<<9&4294967295|w>>>23),w=T+(y^_&(S^y))+v[15]+3634488961&4294967295,T=S+(w<<14&4294967295|w>>>18),w=_+(S^y&(T^S))+v[4]+3889429448&4294967295,_=T+(w<<20&4294967295|w>>>12),w=y+(T^S&(_^T))+v[9]+568446438&4294967295,y=_+(w<<5&4294967295|w>>>27),w=S+(_^T&(y^_))+v[14]+3275163606&4294967295,S=y+(w<<9&4294967295|w>>>23),w=T+(y^_&(S^y))+v[3]+4107603335&4294967295,T=S+(w<<14&4294967295|w>>>18),w=_+(S^y&(T^S))+v[8]+1163531501&4294967295,_=T+(w<<20&4294967295|w>>>12),w=y+(T^S&(_^T))+v[13]+2850285829&4294967295,y=_+(w<<5&4294967295|w>>>27),w=S+(_^T&(y^_))+v[2]+4243563512&4294967295,S=y+(w<<9&4294967295|w>>>23),w=T+(y^_&(S^y))+v[7]+1735328473&4294967295,T=S+(w<<14&4294967295|w>>>18),w=_+(S^y&(T^S))+v[12]+2368359562&4294967295,_=T+(w<<20&4294967295|w>>>12),w=y+(_^T^S)+v[5]+4294588738&4294967295,y=_+(w<<4&4294967295|w>>>28),w=S+(y^_^T)+v[8]+2272392833&4294967295,S=y+(w<<11&4294967295|w>>>21),w=T+(S^y^_)+v[11]+1839030562&4294967295,T=S+(w<<16&4294967295|w>>>16),w=_+(T^S^y)+v[14]+4259657740&4294967295,_=T+(w<<23&4294967295|w>>>9),w=y+(_^T^S)+v[1]+2763975236&4294967295,y=_+(w<<4&4294967295|w>>>28),w=S+(y^_^T)+v[4]+1272893353&4294967295,S=y+(w<<11&4294967295|w>>>21),w=T+(S^y^_)+v[7]+4139469664&4294967295,T=S+(w<<16&4294967295|w>>>16),w=_+(T^S^y)+v[10]+3200236656&4294967295,_=T+(w<<23&4294967295|w>>>9),w=y+(_^T^S)+v[13]+681279174&4294967295,y=_+(w<<4&4294967295|w>>>28),w=S+(y^_^T)+v[0]+3936430074&4294967295,S=y+(w<<11&4294967295|w>>>21),w=T+(S^y^_)+v[3]+3572445317&4294967295,T=S+(w<<16&4294967295|w>>>16),w=_+(T^S^y)+v[6]+76029189&4294967295,_=T+(w<<23&4294967295|w>>>9),w=y+(_^T^S)+v[9]+3654602809&4294967295,y=_+(w<<4&4294967295|w>>>28),w=S+(y^_^T)+v[12]+3873151461&4294967295,S=y+(w<<11&4294967295|w>>>21),w=T+(S^y^_)+v[15]+530742520&4294967295,T=S+(w<<16&4294967295|w>>>16),w=_+(T^S^y)+v[2]+3299628645&4294967295,_=T+(w<<23&4294967295|w>>>9),w=y+(T^(_|~S))+v[0]+4096336452&4294967295,y=_+(w<<6&4294967295|w>>>26),w=S+(_^(y|~T))+v[7]+1126891415&4294967295,S=y+(w<<10&4294967295|w>>>22),w=T+(y^(S|~_))+v[14]+2878612391&4294967295,T=S+(w<<15&4294967295|w>>>17),w=_+(S^(T|~y))+v[5]+4237533241&4294967295,_=T+(w<<21&4294967295|w>>>11),w=y+(T^(_|~S))+v[12]+1700485571&4294967295,y=_+(w<<6&4294967295|w>>>26),w=S+(_^(y|~T))+v[3]+2399980690&4294967295,S=y+(w<<10&4294967295|w>>>22),w=T+(y^(S|~_))+v[10]+4293915773&4294967295,T=S+(w<<15&4294967295|w>>>17),w=_+(S^(T|~y))+v[1]+2240044497&4294967295,_=T+(w<<21&4294967295|w>>>11),w=y+(T^(_|~S))+v[8]+1873313359&4294967295,y=_+(w<<6&4294967295|w>>>26),w=S+(_^(y|~T))+v[15]+4264355552&4294967295,S=y+(w<<10&4294967295|w>>>22),w=T+(y^(S|~_))+v[6]+2734768916&4294967295,T=S+(w<<15&4294967295|w>>>17),w=_+(S^(T|~y))+v[13]+1309151649&4294967295,_=T+(w<<21&4294967295|w>>>11),w=y+(T^(_|~S))+v[4]+4149444226&4294967295,y=_+(w<<6&4294967295|w>>>26),w=S+(_^(y|~T))+v[11]+3174756917&4294967295,S=y+(w<<10&4294967295|w>>>22),w=T+(y^(S|~_))+v[2]+718787259&4294967295,T=S+(w<<15&4294967295|w>>>17),w=_+(S^(T|~y))+v[9]+3951481745&4294967295,I.g[0]=I.g[0]+y&4294967295,I.g[1]=I.g[1]+(T+(w<<21&4294967295|w>>>11))&4294967295,I.g[2]=I.g[2]+T&4294967295,I.g[3]=I.g[3]+S&4294967295}n.prototype.v=function(I,y){y===void 0&&(y=I.length);const _=y-this.blockSize,v=this.C;let T=this.h,S=0;for(;S<y;){if(T==0)for(;S<=_;)i(this,I,S),S+=this.blockSize;if(typeof I=="string"){for(;S<y;)if(v[T++]=I.charCodeAt(S++),T==this.blockSize){i(this,v),T=0;break}}else for(;S<y;)if(v[T++]=I[S++],T==this.blockSize){i(this,v),T=0;break}}this.h=T,this.o+=y},n.prototype.A=function(){var I=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);I[0]=128;for(var y=1;y<I.length-8;++y)I[y]=0;y=this.o*8;for(var _=I.length-8;_<I.length;++_)I[_]=y&255,y/=256;for(this.v(I),I=Array(16),y=0,_=0;_<4;++_)for(let v=0;v<32;v+=8)I[y++]=this.g[_]>>>v&255;return I};function s(I,y){var _=c;return Object.prototype.hasOwnProperty.call(_,I)?_[I]:_[I]=y(I)}function o(I,y){this.h=y;const _=[];let v=!0;for(let T=I.length-1;T>=0;T--){const S=I[T]|0;v&&S==y||(_[T]=S,v=!1)}this.g=_}var c={};function l(I){return-128<=I&&I<128?s(I,function(y){return new o([y|0],y<0?-1:0)}):new o([I|0],I<0?-1:0)}function u(I){if(isNaN(I)||!isFinite(I))return p;if(I<0)return O(u(-I));const y=[];let _=1;for(let v=0;I>=_;v++)y[v]=I/_|0,_*=4294967296;return new o(y,0)}function h(I,y){if(I.length==0)throw Error("number format error: empty string");if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(I.charAt(0)=="-")return O(h(I.substring(1),y));if(I.indexOf("-")>=0)throw Error('number format error: interior "-" character');const _=u(Math.pow(y,8));let v=p;for(let S=0;S<I.length;S+=8){var T=Math.min(8,I.length-S);const w=parseInt(I.substring(S,S+T),y);T<8?(T=u(Math.pow(y,T)),v=v.j(T).add(u(w))):(v=v.j(_),v=v.add(u(w)))}return v}var p=l(0),g=l(1),E=l(16777216);r=o.prototype,r.m=function(){if(V(this))return-O(this).m();let I=0,y=1;for(let _=0;_<this.g.length;_++){const v=this.i(_);I+=(v>=0?v:4294967296+v)*y,y*=4294967296}return I},r.toString=function(I){if(I=I||10,I<2||36<I)throw Error("radix out of range: "+I);if(N(this))return"0";if(V(this))return"-"+O(this).toString(I);const y=u(Math.pow(I,6));var _=this;let v="";for(;;){const T=de(_,y).g;_=Y(_,T.j(y));let S=((_.g.length>0?_.g[0]:_.h)>>>0).toString(I);if(_=T,N(_))return S+v;for(;S.length<6;)S="0"+S;v=S+v}},r.i=function(I){return I<0?0:I<this.g.length?this.g[I]:this.h};function N(I){if(I.h!=0)return!1;for(let y=0;y<I.g.length;y++)if(I.g[y]!=0)return!1;return!0}function V(I){return I.h==-1}r.l=function(I){return I=Y(this,I),V(I)?-1:N(I)?0:1};function O(I){const y=I.g.length,_=[];for(let v=0;v<y;v++)_[v]=~I.g[v];return new o(_,~I.h).add(g)}r.abs=function(){return V(this)?O(this):this},r.add=function(I){const y=Math.max(this.g.length,I.g.length),_=[];let v=0;for(let T=0;T<=y;T++){let S=v+(this.i(T)&65535)+(I.i(T)&65535),w=(S>>>16)+(this.i(T)>>>16)+(I.i(T)>>>16);v=w>>>16,S&=65535,w&=65535,_[T]=w<<16|S}return new o(_,_[_.length-1]&-2147483648?-1:0)};function Y(I,y){return I.add(O(y))}r.j=function(I){if(N(this)||N(I))return p;if(V(this))return V(I)?O(this).j(O(I)):O(O(this).j(I));if(V(I))return O(this.j(O(I)));if(this.l(E)<0&&I.l(E)<0)return u(this.m()*I.m());const y=this.g.length+I.g.length,_=[];for(var v=0;v<2*y;v++)_[v]=0;for(v=0;v<this.g.length;v++)for(let T=0;T<I.g.length;T++){const S=this.i(v)>>>16,w=this.i(v)&65535,B=I.i(T)>>>16,Z=I.i(T)&65535;_[2*v+2*T]+=w*Z,ee(_,2*v+2*T),_[2*v+2*T+1]+=S*Z,ee(_,2*v+2*T+1),_[2*v+2*T+1]+=w*B,ee(_,2*v+2*T+1),_[2*v+2*T+2]+=S*B,ee(_,2*v+2*T+2)}for(I=0;I<y;I++)_[I]=_[2*I+1]<<16|_[2*I];for(I=y;I<2*y;I++)_[I]=0;return new o(_,0)};function ee(I,y){for(;(I[y]&65535)!=I[y];)I[y+1]+=I[y]>>>16,I[y]&=65535,y++}function X(I,y){this.g=I,this.h=y}function de(I,y){if(N(y))throw Error("division by zero");if(N(I))return new X(p,p);if(V(I))return y=de(O(I),y),new X(O(y.g),O(y.h));if(V(y))return y=de(I,O(y)),new X(O(y.g),y.h);if(I.g.length>30){if(V(I)||V(y))throw Error("slowDivide_ only works with positive integers.");for(var _=g,v=y;v.l(I)<=0;)_=he(_),v=he(v);var T=ye(_,1),S=ye(v,1);for(v=ye(v,2),_=ye(_,2);!N(v);){var w=S.add(v);w.l(I)<=0&&(T=T.add(_),S=w),v=ye(v,1),_=ye(_,1)}return y=Y(I,T.j(y)),new X(T,y)}for(T=p;I.l(y)>=0;){for(_=Math.max(1,Math.floor(I.m()/y.m())),v=Math.ceil(Math.log(_)/Math.LN2),v=v<=48?1:Math.pow(2,v-48),S=u(_),w=S.j(y);V(w)||w.l(I)>0;)_-=v,S=u(_),w=S.j(y);N(S)&&(S=g),T=T.add(S),I=Y(I,w)}return new X(T,I)}r.B=function(I){return de(this,I).h},r.and=function(I){const y=Math.max(this.g.length,I.g.length),_=[];for(let v=0;v<y;v++)_[v]=this.i(v)&I.i(v);return new o(_,this.h&I.h)},r.or=function(I){const y=Math.max(this.g.length,I.g.length),_=[];for(let v=0;v<y;v++)_[v]=this.i(v)|I.i(v);return new o(_,this.h|I.h)},r.xor=function(I){const y=Math.max(this.g.length,I.g.length),_=[];for(let v=0;v<y;v++)_[v]=this.i(v)^I.i(v);return new o(_,this.h^I.h)};function he(I){const y=I.g.length+1,_=[];for(let v=0;v<y;v++)_[v]=I.i(v)<<1|I.i(v-1)>>>31;return new o(_,I.h)}function ye(I,y){const _=y>>5;y%=32;const v=I.g.length-_,T=[];for(let S=0;S<v;S++)T[S]=y>0?I.i(S+_)>>>y|I.i(S+_+1)<<32-y:I.i(S+_);return new o(T,I.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,Lm=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=u,o.fromString=h,dr=o}).apply(typeof Lf<"u"?Lf:typeof self<"u"?self:typeof window<"u"?window:{});var Pa=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Fm,Zs,Um,Ua,Zl,Bm,$m,qm;(function(){var r,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Pa=="object"&&Pa];for(var d=0;d<a.length;++d){var f=a[d];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var n=t(this);function i(a,d){if(d)e:{var f=n;a=a.split(".");for(var m=0;m<a.length-1;m++){var A=a[m];if(!(A in f))break e;f=f[A]}a=a[a.length-1],m=f[a],d=d(m),d!=m&&d!=null&&e(f,a,{configurable:!0,writable:!0,value:d})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(d){var f=[],m;for(m in d)Object.prototype.hasOwnProperty.call(d,m)&&f.push([m,d[m]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var d=typeof a;return d=="object"&&a!=null||d=="function"}function l(a,d,f){return a.call.apply(a.bind,arguments)}function u(a,d,f){return u=l,u.apply(null,arguments)}function h(a,d){var f=Array.prototype.slice.call(arguments,1);return function(){var m=f.slice();return m.push.apply(m,arguments),a.apply(this,m)}}function p(a,d){function f(){}f.prototype=d.prototype,a.Z=d.prototype,a.prototype=new f,a.prototype.constructor=a,a.Ob=function(m,A,x){for(var W=Array(arguments.length-2),we=2;we<arguments.length;we++)W[we-2]=arguments[we];return d.prototype[A].apply(m,W)}}var g=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function E(a){const d=a.length;if(d>0){const f=Array(d);for(let m=0;m<d;m++)f[m]=a[m];return f}return[]}function N(a,d){for(let m=1;m<arguments.length;m++){const A=arguments[m];var f=typeof A;if(f=f!="object"?f:A?Array.isArray(A)?"array":f:"null",f=="array"||f=="object"&&typeof A.length=="number"){f=a.length||0;const x=A.length||0;a.length=f+x;for(let W=0;W<x;W++)a[f+W]=A[W]}else a.push(A)}}class V{constructor(d,f){this.i=d,this.j=f,this.h=0,this.g=null}get(){let d;return this.h>0?(this.h--,d=this.g,this.g=d.next,d.next=null):d=this.i(),d}}function O(a){o.setTimeout(()=>{throw a},0)}function Y(){var a=I;let d=null;return a.g&&(d=a.g,a.g=a.g.next,a.g||(a.h=null),d.next=null),d}class ee{constructor(){this.h=this.g=null}add(d,f){const m=X.get();m.set(d,f),this.h?this.h.next=m:this.g=m,this.h=m}}var X=new V(()=>new de,a=>a.reset());class de{constructor(){this.next=this.g=this.h=null}set(d,f){this.h=d,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let he,ye=!1,I=new ee,y=()=>{const a=Promise.resolve(void 0);he=()=>{a.then(_)}};function _(){for(var a;a=Y();){try{a.h.call(a.g)}catch(f){O(f)}var d=X;d.j(a),d.h<100&&(d.h++,a.next=d.g,d.g=a)}ye=!1}function v(){this.u=this.u,this.C=this.C}v.prototype.u=!1,v.prototype.dispose=function(){this.u||(this.u=!0,this.N())},v.prototype[Symbol.dispose]=function(){this.dispose()},v.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function T(a,d){this.type=a,this.g=this.target=d,this.defaultPrevented=!1}T.prototype.h=function(){this.defaultPrevented=!0};var S=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,d=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};o.addEventListener("test",f,d),o.removeEventListener("test",f,d)}catch{}return a}();function w(a){return/^[\s\xa0]*$/.test(a)}function B(a,d){T.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,d)}p(B,T),B.prototype.init=function(a,d){const f=this.type=a.type,m=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=d,d=a.relatedTarget,d||(f=="mouseover"?d=a.fromElement:f=="mouseout"&&(d=a.toElement)),this.relatedTarget=d,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&B.Z.h.call(this)},B.prototype.h=function(){B.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var Z="closure_listenable_"+(Math.random()*1e6|0),ne=0;function z(a,d,f,m,A){this.listener=a,this.proxy=null,this.src=d,this.type=f,this.capture=!!m,this.ha=A,this.key=++ne,this.da=this.fa=!1}function me(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function le(a,d,f){for(const m in a)d.call(f,a[m],m,a)}function ce(a,d){for(const f in a)d.call(void 0,a[f],f,a)}function rt(a){const d={};for(const f in a)d[f]=a[f];return d}const mt="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function it(a,d){let f,m;for(let A=1;A<arguments.length;A++){m=arguments[A];for(f in m)a[f]=m[f];for(let x=0;x<mt.length;x++)f=mt[x],Object.prototype.hasOwnProperty.call(m,f)&&(a[f]=m[f])}}function on(a){this.src=a,this.g={},this.h=0}on.prototype.add=function(a,d,f,m,A){const x=a.toString();a=this.g[x],a||(a=this.g[x]=[],this.h++);const W=Nr(a,d,m,A);return W>-1?(d=a[W],f||(d.fa=!1)):(d=new z(d,this.src,x,!!m,A),d.fa=f,a.push(d)),d};function zn(a,d){const f=d.type;if(f in a.g){var m=a.g[f],A=Array.prototype.indexOf.call(m,d,void 0),x;(x=A>=0)&&Array.prototype.splice.call(m,A,1),x&&(me(d),a.g[f].length==0&&(delete a.g[f],a.h--))}}function Nr(a,d,f,m){for(let A=0;A<a.length;++A){const x=a[A];if(!x.da&&x.listener==d&&x.capture==!!f&&x.ha==m)return A}return-1}var Vr="closure_lm_"+(Math.random()*1e6|0),Vt={};function Pn(a,d,f,m,A){if(Array.isArray(d)){for(let x=0;x<d.length;x++)Pn(a,d[x],f,m,A);return null}return f=cn(f),a&&a[Z]?a.J(d,f,c(m)?!!m.capture:!1,A):Gt(a,d,f,!1,m,A)}function Gt(a,d,f,m,A,x){if(!d)throw Error("Invalid event type");const W=c(A)?!!A.capture:!!A;let we=Wt(a);if(we||(a[Vr]=we=new on(a)),f=we.add(d,f,m,W,x),f.proxy)return f;if(m=Le(),f.proxy=m,m.src=a,m.listener=f,a.addEventListener)S||(A=W),A===void 0&&(A=!1),a.addEventListener(d.toString(),m,A);else if(a.attachEvent)a.attachEvent(Gn(d.toString()),m);else if(a.addListener&&a.removeListener)a.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return f}function Le(){function a(f){return d.call(a.src,a.listener,f)}const d=Or;return a}function an(a,d,f,m,A){if(Array.isArray(d))for(var x=0;x<d.length;x++)an(a,d[x],f,m,A);else m=c(m)?!!m.capture:!!m,f=cn(f),a&&a[Z]?(a=a.i,x=String(d).toString(),x in a.g&&(d=a.g[x],f=Nr(d,f,m,A),f>-1&&(me(d[f]),Array.prototype.splice.call(d,f,1),d.length==0&&(delete a.g[x],a.h--)))):a&&(a=Wt(a))&&(d=a.g[d.toString()],a=-1,d&&(a=Nr(d,f,m,A)),(f=a>-1?d[a]:null)&&jn(f))}function jn(a){if(typeof a!="number"&&a&&!a.da){var d=a.src;if(d&&d[Z])zn(d.i,a);else{var f=a.type,m=a.proxy;d.removeEventListener?d.removeEventListener(f,m,a.capture):d.detachEvent?d.detachEvent(Gn(f),m):d.addListener&&d.removeListener&&d.removeListener(m),(f=Wt(d))?(zn(f,a),f.h==0&&(f.src=null,d[Vr]=null)):me(a)}}}function Gn(a){return a in Vt?Vt[a]:Vt[a]="on"+a}function Or(a,d){if(a.da)a=!0;else{d=new B(d,this);const f=a.listener,m=a.ha||a.src;a.fa&&jn(a),a=f.call(m,d)}return a}function Wt(a){return a=a[Vr],a instanceof on?a:null}var Ut="__closure_events_fn_"+(Math.random()*1e9>>>0);function cn(a){return typeof a=="function"?a:(a[Ut]||(a[Ut]=function(d){return a.handleEvent(d)}),a[Ut])}function lt(){v.call(this),this.i=new on(this),this.M=this,this.G=null}p(lt,v),lt.prototype[Z]=!0,lt.prototype.removeEventListener=function(a,d,f,m){an(this,a,d,f,m)};function yt(a,d){var f,m=a.G;if(m)for(f=[];m;m=m.G)f.push(m);if(a=a.M,m=d.type||d,typeof d=="string")d=new T(d,a);else if(d instanceof T)d.target=d.target||a;else{var A=d;d=new T(m,a),it(d,A)}A=!0;let x,W;if(f)for(W=f.length-1;W>=0;W--)x=d.g=f[W],A=Ti(x,m,!0,d)&&A;if(x=d.g=a,A=Ti(x,m,!0,d)&&A,A=Ti(x,m,!1,d)&&A,f)for(W=0;W<f.length;W++)x=d.g=f[W],A=Ti(x,m,!1,d)&&A}lt.prototype.N=function(){if(lt.Z.N.call(this),this.i){var a=this.i;for(const d in a.g){const f=a.g[d];for(let m=0;m<f.length;m++)me(f[m]);delete a.g[d],a.h--}}this.G=null},lt.prototype.J=function(a,d,f,m){return this.i.add(String(a),d,!1,f,m)},lt.prototype.K=function(a,d,f,m){return this.i.add(String(a),d,!0,f,m)};function Ti(a,d,f,m){if(d=a.i.g[String(d)],!d)return!0;d=d.concat();let A=!0;for(let x=0;x<d.length;++x){const W=d[x];if(W&&!W.da&&W.capture==f){const we=W.listener,st=W.ha||W.src;W.fa&&zn(a.i,W),A=we.call(st,m)!==!1&&A}}return A&&!m.defaultPrevented}function al(a,d){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=u(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(d)>2147483647?-1:o.setTimeout(a,d||0)}function fa(a){a.g=al(()=>{a.g=null,a.i&&(a.i=!1,fa(a))},a.l);const d=a.h;a.h=null,a.m.apply(null,d)}class cl extends v{constructor(d,f){super(),this.m=d,this.l=f,this.h=null,this.i=!1,this.g=null}j(d){this.h=arguments,this.g?this.i=!0:fa(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Mr(a){v.call(this),this.h=a,this.g={}}p(Mr,v);var Lr=[];function pa(a){le(a.g,function(d,f){this.g.hasOwnProperty(f)&&jn(d)},a),a.g={}}Mr.prototype.N=function(){Mr.Z.N.call(this),pa(this)},Mr.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ps=o.JSON.stringify,ll=o.JSON.parse,Cs=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function ga(){}function ma(){}var P={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function R(){T.call(this,"d")}p(R,T);function U(){T.call(this,"c")}p(U,T);var F={},M=null;function D(){return M=M||new lt}F.Ia="serverreachability";function k(a){T.call(this,F.Ia,a)}p(k,T);function L(a){const d=D();yt(d,new k(d))}F.STAT_EVENT="statevent";function se(a,d){T.call(this,F.STAT_EVENT,a),this.stat=d}p(se,T);function j(a){const d=D();yt(d,new se(d,a))}F.Ja="timingevent";function H(a,d){T.call(this,F.Ja,a),this.size=d}p(H,T);function oe(a,d){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},d)}function re(){this.g=!0}re.prototype.ua=function(){this.g=!1};function fe(a,d,f,m,A,x){a.info(function(){if(a.g)if(x){var W="",we=x.split("&");for(let ke=0;ke<we.length;ke++){var st=we[ke].split("=");if(st.length>1){const ht=st[0];st=st[1];const un=ht.split("_");W=un.length>=2&&un[1]=="type"?W+(ht+"="+st+"&"):W+(ht+"=redacted&")}}}else W=null;else W=x;return"XMLHTTP REQ ("+m+") [attempt "+A+"]: "+d+`
`+f+`
`+W})}function pe(a,d,f,m,A,x,W){a.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+A+"]: "+d+`
`+f+`
`+x+" "+W})}function ae(a,d,f,m){a.info(function(){return"XMLHTTP TEXT ("+d+"): "+Ve(a,f)+(m?" "+m:"")})}function be(a,d){a.info(function(){return"TIMEOUT: "+d})}re.prototype.info=function(){};function Ve(a,d){if(!a.g)return d;if(!d)return null;try{const x=JSON.parse(d);if(x){for(a=0;a<x.length;a++)if(Array.isArray(x[a])){var f=x[a];if(!(f.length<2)){var m=f[1];if(Array.isArray(m)&&!(m.length<1)){var A=m[0];if(A!="noop"&&A!="stop"&&A!="close")for(let W=1;W<m.length;W++)m[W]=""}}}}return Ps(x)}catch{return d}}var Ze={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Ce={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},ut;function _t(){}p(_t,ga),_t.prototype.g=function(){return new XMLHttpRequest},ut=new _t;function dt(a){return encodeURIComponent(String(a))}function Wn(a){var d=1;a=a.split(":");const f=[];for(;d>0&&a.length;)f.push(a.shift()),d--;return a.length&&f.push(a.join(":")),f}function Xt(a,d,f,m){this.j=a,this.i=d,this.l=f,this.S=m||1,this.V=new Mr(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Hn}function Hn(){this.i=null,this.g="",this.h=!1}var ya={},bi={};function ks(a,d,f){a.M=1,a.A=wa(ln(d)),a.u=f,a.R=!0,Eh(a,null)}function Eh(a,d){a.F=Date.now(),_a(a),a.B=ln(a.A);var f=a.B,m=a.S;Array.isArray(m)||(m=[String(m)]),Nh(f.i,"t",m),a.C=0,f=a.j.L,a.h=new Hn,a.g=Jh(a.j,f?d:null,!a.u),a.P>0&&(a.O=new cl(u(a.Y,a,a.g),a.P)),d=a.V,f=a.g,m=a.ba;var A="readystatechange";Array.isArray(A)||(A&&(Lr[0]=A.toString()),A=Lr);for(let x=0;x<A.length;x++){const W=Pn(f,A[x],m||d.handleEvent,!1,d.h||d);if(!W)break;d.g[W.key]=W}d=a.J?rt(a.J):{},a.u?(a.v||(a.v="POST"),d["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,d)):(a.v="GET",a.g.ea(a.B,a.v,null,d)),L(),fe(a.i,a.v,a.B,a.l,a.S,a.u)}Xt.prototype.ba=function(a){a=a.target;const d=this.O;d&&Jn(a)==3?d.j():this.Y(a)},Xt.prototype.Y=function(a){try{if(a==this.g)e:{const we=Jn(this.g),st=this.g.ya(),ke=this.g.ca();if(!(we<3)&&(we!=3||this.g&&(this.h.h||this.g.la()||Bh(this.g)))){this.K||we!=4||st==7||(st==8||ke<=0?L(3):L(2)),ul(this);var d=this.g.ca();this.X=d;var f=Vw(this);if(this.o=d==200,pe(this.i,this.v,this.B,this.l,this.S,we,d),this.o){if(this.U&&!this.L){t:{if(this.g){var m,A=this.g;if((m=A.g?A.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!w(m)){var x=m;break t}}x=null}if(a=x)ae(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,dl(this,a);else{this.o=!1,this.m=3,j(12),Fr(this),xs(this);break e}}if(this.R){a=!0;let ht;for(;!this.K&&this.C<f.length;)if(ht=Ow(this,f),ht==bi){we==4&&(this.m=4,j(14),a=!1),ae(this.i,this.l,null,"[Incomplete Response]");break}else if(ht==ya){this.m=4,j(15),ae(this.i,this.l,f,"[Invalid Chunk]"),a=!1;break}else ae(this.i,this.l,ht,null),dl(this,ht);if(Ih(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),we!=4||f.length!=0||this.h.h||(this.m=1,j(16),a=!1),this.o=this.o&&a,!a)ae(this.i,this.l,f,"[Invalid Chunked Response]"),Fr(this),xs(this);else if(f.length>0&&!this.W){this.W=!0;var W=this.j;W.g==this&&W.aa&&!W.P&&(W.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),wl(W),W.P=!0,j(11))}}else ae(this.i,this.l,f,null),dl(this,f);we==4&&Fr(this),this.o&&!this.K&&(we==4?Wh(this.j,this):(this.o=!1,_a(this)))}else Qw(this.g),d==400&&f.indexOf("Unknown SID")>0?(this.m=3,j(12)):(this.m=0,j(13)),Fr(this),xs(this)}}}catch{}finally{}};function Vw(a){if(!Ih(a))return a.g.la();const d=Bh(a.g);if(d==="")return"";let f="";const m=d.length,A=Jn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Fr(a),xs(a),"";a.h.i=new o.TextDecoder}for(let x=0;x<m;x++)a.h.h=!0,f+=a.h.i.decode(d[x],{stream:!(A&&x==m-1)});return d.length=0,a.h.g+=f,a.C=0,a.h.g}function Ih(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function Ow(a,d){var f=a.C,m=d.indexOf(`
`,f);return m==-1?bi:(f=Number(d.substring(f,m)),isNaN(f)?ya:(m+=1,m+f>d.length?bi:(d=d.slice(m,m+f),a.C=m+f,d)))}Xt.prototype.cancel=function(){this.K=!0,Fr(this)};function _a(a){a.T=Date.now()+a.H,vh(a,a.H)}function vh(a,d){if(a.D!=null)throw Error("WatchDog timer not null");a.D=oe(u(a.aa,a),d)}function ul(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Xt.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(be(this.i,this.B),this.M!=2&&(L(),j(17)),Fr(this),this.m=2,xs(this)):vh(this,this.T-a)};function xs(a){a.j.I==0||a.K||Wh(a.j,a)}function Fr(a){ul(a);var d=a.O;d&&typeof d.dispose=="function"&&d.dispose(),a.O=null,pa(a.V),a.g&&(d=a.g,a.g=null,d.abort(),d.dispose())}function dl(a,d){try{var f=a.j;if(f.I!=0&&(f.g==a||hl(f.h,a))){if(!a.L&&hl(f.h,a)&&f.I==3){try{var m=f.Ba.g.parse(d)}catch{m=null}if(Array.isArray(m)&&m.length==3){var A=m;if(A[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<a.F)ba(f),va(f);else break e;_l(f),j(18)}}else f.xa=A[1],0<f.xa-f.K&&A[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=oe(u(f.Va,f),6e3));Ah(f.h)<=1&&f.ta&&(f.ta=void 0)}else Br(f,11)}else if((a.L||f.g==a)&&ba(f),!w(d))for(A=f.Ba.g.parse(d),d=0;d<A.length;d++){let ke=A[d];const ht=ke[0];if(!(ht<=f.K))if(f.K=ht,ke=ke[1],f.I==2)if(ke[0]=="c"){f.M=ke[1],f.ba=ke[2];const un=ke[3];un!=null&&(f.ka=un,f.j.info("VER="+f.ka));const $r=ke[4];$r!=null&&(f.za=$r,f.j.info("SVER="+f.za));const Xn=ke[5];Xn!=null&&typeof Xn=="number"&&Xn>0&&(m=1.5*Xn,f.O=m,f.j.info("backChannelRequestTimeoutMs_="+m)),m=f;const Zn=a.g;if(Zn){const Sa=Zn.g?Zn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Sa){var x=m.h;x.g||Sa.indexOf("spdy")==-1&&Sa.indexOf("quic")==-1&&Sa.indexOf("h2")==-1||(x.j=x.l,x.g=new Set,x.h&&(fl(x,x.h),x.h=null))}if(m.G){const El=Zn.g?Zn.g.getResponseHeader("X-HTTP-Session-Id"):null;El&&(m.wa=El,Oe(m.J,m.G,El))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-a.F,f.j.info("Handshake RTT: "+f.T+"ms")),m=f;var W=a;if(m.na=Yh(m,m.L?m.ba:null,m.W),W.L){Sh(m.h,W);var we=W,st=m.O;st&&(we.H=st),we.D&&(ul(we),_a(we)),m.g=W}else jh(m);f.i.length>0&&Ta(f)}else ke[0]!="stop"&&ke[0]!="close"||Br(f,7);else f.I==3&&(ke[0]=="stop"||ke[0]=="close"?ke[0]=="stop"?Br(f,7):yl(f):ke[0]!="noop"&&f.l&&f.l.qa(ke),f.A=0)}}L(4)}catch{}}var Mw=class{constructor(a,d){this.g=a,this.map=d}};function Th(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function bh(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Ah(a){return a.h?1:a.g?a.g.size:0}function hl(a,d){return a.h?a.h==d:a.g?a.g.has(d):!1}function fl(a,d){a.g?a.g.add(d):a.h=d}function Sh(a,d){a.h&&a.h==d?a.h=null:a.g&&a.g.has(d)&&a.g.delete(d)}Th.prototype.cancel=function(){if(this.i=Rh(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Rh(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let d=a.i;for(const f of a.g.values())d=d.concat(f.G);return d}return E(a.i)}var Ph=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Lw(a,d){if(a){a=a.split("&");for(let f=0;f<a.length;f++){const m=a[f].indexOf("=");let A,x=null;m>=0?(A=a[f].substring(0,m),x=a[f].substring(m+1)):A=a[f],d(A,x?decodeURIComponent(x.replace(/\+/g," ")):"")}}}function Qn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let d;a instanceof Qn?(this.l=a.l,Ds(this,a.j),this.o=a.o,this.g=a.g,Ns(this,a.u),this.h=a.h,pl(this,Vh(a.i)),this.m=a.m):a&&(d=String(a).match(Ph))?(this.l=!1,Ds(this,d[1]||"",!0),this.o=Vs(d[2]||""),this.g=Vs(d[3]||"",!0),Ns(this,d[4]),this.h=Vs(d[5]||"",!0),pl(this,d[6]||"",!0),this.m=Vs(d[7]||"")):(this.l=!1,this.i=new Ms(null,this.l))}Qn.prototype.toString=function(){const a=[];var d=this.j;d&&a.push(Os(d,Ch,!0),":");var f=this.g;return(f||d=="file")&&(a.push("//"),(d=this.o)&&a.push(Os(d,Ch,!0),"@"),a.push(dt(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&a.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(Os(f,f.charAt(0)=="/"?Bw:Uw,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",Os(f,qw)),a.join("")},Qn.prototype.resolve=function(a){const d=ln(this);let f=!!a.j;f?Ds(d,a.j):f=!!a.o,f?d.o=a.o:f=!!a.g,f?d.g=a.g:f=a.u!=null;var m=a.h;if(f)Ns(d,a.u);else if(f=!!a.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var A=d.h.lastIndexOf("/");A!=-1&&(m=d.h.slice(0,A+1)+m)}if(A=m,A==".."||A==".")m="";else if(A.indexOf("./")!=-1||A.indexOf("/.")!=-1){m=A.lastIndexOf("/",0)==0,A=A.split("/");const x=[];for(let W=0;W<A.length;){const we=A[W++];we=="."?m&&W==A.length&&x.push(""):we==".."?((x.length>1||x.length==1&&x[0]!="")&&x.pop(),m&&W==A.length&&x.push("")):(x.push(we),m=!0)}m=x.join("/")}else m=A}return f?d.h=m:f=a.i.toString()!=="",f?pl(d,Vh(a.i)):f=!!a.m,f&&(d.m=a.m),d};function ln(a){return new Qn(a)}function Ds(a,d,f){a.j=f?Vs(d,!0):d,a.j&&(a.j=a.j.replace(/:$/,""))}function Ns(a,d){if(d){if(d=Number(d),isNaN(d)||d<0)throw Error("Bad port number "+d);a.u=d}else a.u=null}function pl(a,d,f){d instanceof Ms?(a.i=d,Kw(a.i,a.l)):(f||(d=Os(d,$w)),a.i=new Ms(d,a.l))}function Oe(a,d,f){a.i.set(d,f)}function wa(a){return Oe(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function Vs(a,d){return a?d?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Os(a,d,f){return typeof a=="string"?(a=encodeURI(a).replace(d,Fw),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Fw(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Ch=/[#\/\?@]/g,Uw=/[#\?:]/g,Bw=/[#\?]/g,$w=/[#\?@]/g,qw=/#/g;function Ms(a,d){this.h=this.g=null,this.i=a||null,this.j=!!d}function Ur(a){a.g||(a.g=new Map,a.h=0,a.i&&Lw(a.i,function(d,f){a.add(decodeURIComponent(d.replace(/\+/g," ")),f)}))}r=Ms.prototype,r.add=function(a,d){Ur(this),this.i=null,a=Ai(this,a);let f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(d),this.h+=1,this};function kh(a,d){Ur(a),d=Ai(a,d),a.g.has(d)&&(a.i=null,a.h-=a.g.get(d).length,a.g.delete(d))}function xh(a,d){return Ur(a),d=Ai(a,d),a.g.has(d)}r.forEach=function(a,d){Ur(this),this.g.forEach(function(f,m){f.forEach(function(A){a.call(d,A,m,this)},this)},this)};function Dh(a,d){Ur(a);let f=[];if(typeof d=="string")xh(a,d)&&(f=f.concat(a.g.get(Ai(a,d))));else for(a=Array.from(a.g.values()),d=0;d<a.length;d++)f=f.concat(a[d]);return f}r.set=function(a,d){return Ur(this),this.i=null,a=Ai(this,a),xh(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[d]),this.h+=1,this},r.get=function(a,d){return a?(a=Dh(this,a),a.length>0?String(a[0]):d):d};function Nh(a,d,f){kh(a,d),f.length>0&&(a.i=null,a.g.set(Ai(a,d),E(f)),a.h+=f.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],d=Array.from(this.g.keys());for(let m=0;m<d.length;m++){var f=d[m];const A=dt(f);f=Dh(this,f);for(let x=0;x<f.length;x++){let W=A;f[x]!==""&&(W+="="+dt(f[x])),a.push(W)}}return this.i=a.join("&")};function Vh(a){const d=new Ms;return d.i=a.i,a.g&&(d.g=new Map(a.g),d.h=a.h),d}function Ai(a,d){return d=String(d),a.j&&(d=d.toLowerCase()),d}function Kw(a,d){d&&!a.j&&(Ur(a),a.i=null,a.g.forEach(function(f,m){const A=m.toLowerCase();m!=A&&(kh(this,m),Nh(this,A,f))},a)),a.j=d}function zw(a,d){const f=new re;if(o.Image){const m=new Image;m.onload=h(Yn,f,"TestLoadImage: loaded",!0,d,m),m.onerror=h(Yn,f,"TestLoadImage: error",!1,d,m),m.onabort=h(Yn,f,"TestLoadImage: abort",!1,d,m),m.ontimeout=h(Yn,f,"TestLoadImage: timeout",!1,d,m),o.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=a}else d(!1)}function jw(a,d){const f=new re,m=new AbortController,A=setTimeout(()=>{m.abort(),Yn(f,"TestPingServer: timeout",!1,d)},1e4);fetch(a,{signal:m.signal}).then(x=>{clearTimeout(A),x.ok?Yn(f,"TestPingServer: ok",!0,d):Yn(f,"TestPingServer: server error",!1,d)}).catch(()=>{clearTimeout(A),Yn(f,"TestPingServer: error",!1,d)})}function Yn(a,d,f,m,A){try{A&&(A.onload=null,A.onerror=null,A.onabort=null,A.ontimeout=null),m(f)}catch{}}function Gw(){this.g=new Cs}function gl(a){this.i=a.Sb||null,this.h=a.ab||!1}p(gl,ga),gl.prototype.g=function(){return new Ea(this.i,this.h)};function Ea(a,d){lt.call(this),this.H=a,this.o=d,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Ea,lt),r=Ea.prototype,r.open=function(a,d){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=d,this.readyState=1,Fs(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const d={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(d.body=a),(this.H||o).fetch(new Request(this.D,d)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Ls(this)),this.readyState=0},r.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Fs(this)),this.g&&(this.readyState=3,Fs(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Oh(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function Oh(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}r.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var d=a.value?a.value:new Uint8Array(0);(d=this.B.decode(d,{stream:!a.done}))&&(this.response=this.responseText+=d)}a.done?Ls(this):Fs(this),this.readyState==3&&Oh(this)}},r.Oa=function(a){this.g&&(this.response=this.responseText=a,Ls(this))},r.Na=function(a){this.g&&(this.response=a,Ls(this))},r.ga=function(){this.g&&Ls(this)};function Ls(a){a.readyState=4,a.l=null,a.j=null,a.B=null,Fs(a)}r.setRequestHeader=function(a,d){this.A.append(a,d)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],d=this.h.entries();for(var f=d.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=d.next();return a.join(`\r
`)};function Fs(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Ea.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Mh(a){let d="";return le(a,function(f,m){d+=m,d+=":",d+=f,d+=`\r
`}),d}function ml(a,d,f){e:{for(m in f){var m=!1;break e}m=!0}m||(f=Mh(f),typeof a=="string"?f!=null&&dt(f):Oe(a,d,f))}function je(a){lt.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(je,lt);var Ww=/^https?$/i,Hw=["POST","PUT"];r=je.prototype,r.Fa=function(a){this.H=a},r.ea=function(a,d,f,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);d=d?d.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():ut.g(),this.g.onreadystatechange=g(u(this.Ca,this));try{this.B=!0,this.g.open(d,String(a),!0),this.B=!1}catch(x){Lh(this,x);return}if(a=f||"",f=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var A in m)f.set(A,m[A]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const x of m.keys())f.set(x,m.get(x));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(f.keys()).find(x=>x.toLowerCase()=="content-type"),A=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(Hw,d,void 0)>=0)||m||A||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[x,W]of f)this.g.setRequestHeader(x,W);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(x){Lh(this,x)}};function Lh(a,d){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=d,a.o=5,Fh(a),Ia(a)}function Fh(a){a.A||(a.A=!0,yt(a,"complete"),yt(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,yt(this,"complete"),yt(this,"abort"),Ia(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Ia(this,!0)),je.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?Uh(this):this.Xa())},r.Xa=function(){Uh(this)};function Uh(a){if(a.h&&typeof s<"u"){if(a.v&&Jn(a)==4)setTimeout(a.Ca.bind(a),0);else if(yt(a,"readystatechange"),Jn(a)==4){a.h=!1;try{const x=a.ca();e:switch(x){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var d=!0;break e;default:d=!1}var f;if(!(f=d)){var m;if(m=x===0){let W=String(a.D).match(Ph)[1]||null;!W&&o.self&&o.self.location&&(W=o.self.location.protocol.slice(0,-1)),m=!Ww.test(W?W.toLowerCase():"")}f=m}if(f)yt(a,"complete"),yt(a,"success");else{a.o=6;try{var A=Jn(a)>2?a.g.statusText:""}catch{A=""}a.l=A+" ["+a.ca()+"]",Fh(a)}}finally{Ia(a)}}}}function Ia(a,d){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const f=a.g;a.g=null,d||yt(a,"ready");try{f.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function Jn(a){return a.g?a.g.readyState:0}r.ca=function(){try{return Jn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(a){if(this.g){var d=this.g.responseText;return a&&d.indexOf(a)==0&&(d=d.substring(a.length)),ll(d)}};function Bh(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function Qw(a){const d={};a=(a.g&&Jn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<a.length;m++){if(w(a[m]))continue;var f=Wn(a[m]);const A=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const x=d[A]||[];d[A]=x,x.push(f)}ce(d,function(m){return m.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Us(a,d,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||d}function $h(a){this.za=0,this.i=[],this.j=new re,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Us("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Us("baseRetryDelayMs",5e3,a),this.Za=Us("retryDelaySeedMs",1e4,a),this.Ta=Us("forwardChannelMaxRetries",2,a),this.va=Us("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Th(a&&a.concurrentRequestLimit),this.Ba=new Gw,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=$h.prototype,r.ka=8,r.I=1,r.connect=function(a,d,f,m){j(0),this.W=a,this.H=d||{},f&&m!==void 0&&(this.H.OSID=f,this.H.OAID=m),this.F=this.X,this.J=Yh(this,null,this.W),Ta(this)};function yl(a){if(qh(a),a.I==3){var d=a.V++,f=ln(a.J);if(Oe(f,"SID",a.M),Oe(f,"RID",d),Oe(f,"TYPE","terminate"),Bs(a,f),d=new Xt(a,a.j,d),d.M=2,d.A=wa(ln(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(d.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=d.A,f=!0),f||(d.g=Jh(d.j,null),d.g.ea(d.A)),d.F=Date.now(),_a(d)}Qh(a)}function va(a){a.g&&(wl(a),a.g.cancel(),a.g=null)}function qh(a){va(a),a.v&&(o.clearTimeout(a.v),a.v=null),ba(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Ta(a){if(!bh(a.h)&&!a.m){a.m=!0;var d=a.Ea;he||y(),ye||(he(),ye=!0),I.add(d,a),a.D=0}}function Yw(a,d){return Ah(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=d.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=oe(u(a.Ea,a,d),Hh(a,a.D)),a.D++,!0)}r.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const A=new Xt(this,this.j,a);let x=this.o;if(this.U&&(x?(x=rt(x),it(x,this.U)):x=this.U),this.u!==null||this.R||(A.J=x,x=null),this.S)e:{for(var d=0,f=0;f<this.i.length;f++){t:{var m=this.i[f];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(d+=m,d>4096){d=f;break e}if(d===4096||f===this.i.length-1){d=f+1;break e}}d=1e3}else d=1e3;d=zh(this,A,d),f=ln(this.J),Oe(f,"RID",a),Oe(f,"CVER",22),this.G&&Oe(f,"X-HTTP-Session-Id",this.G),Bs(this,f),x&&(this.R?d="headers="+dt(Mh(x))+"&"+d:this.u&&ml(f,this.u,x)),fl(this.h,A),this.Ra&&Oe(f,"TYPE","init"),this.S?(Oe(f,"$req",d),Oe(f,"SID","null"),A.U=!0,ks(A,f,null)):ks(A,f,d),this.I=2}}else this.I==3&&(a?Kh(this,a):this.i.length==0||bh(this.h)||Kh(this))};function Kh(a,d){var f;d?f=d.l:f=a.V++;const m=ln(a.J);Oe(m,"SID",a.M),Oe(m,"RID",f),Oe(m,"AID",a.K),Bs(a,m),a.u&&a.o&&ml(m,a.u,a.o),f=new Xt(a,a.j,f,a.D+1),a.u===null&&(f.J=a.o),d&&(a.i=d.G.concat(a.i)),d=zh(a,f,1e3),f.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),fl(a.h,f),ks(f,m,d)}function Bs(a,d){a.H&&le(a.H,function(f,m){Oe(d,m,f)}),a.l&&le({},function(f,m){Oe(d,m,f)})}function zh(a,d,f){f=Math.min(a.i.length,f);const m=a.l?u(a.l.Ka,a.l,a):null;e:{var A=a.i;let we=-1;for(;;){const st=["count="+f];we==-1?f>0?(we=A[0].g,st.push("ofs="+we)):we=0:st.push("ofs="+we);let ke=!0;for(let ht=0;ht<f;ht++){var x=A[ht].g;const un=A[ht].map;if(x-=we,x<0)we=Math.max(0,A[ht].g-100),ke=!1;else try{x="req"+x+"_"||"";try{var W=un instanceof Map?un:Object.entries(un);for(const[$r,Xn]of W){let Zn=Xn;c(Xn)&&(Zn=Ps(Xn)),st.push(x+$r+"="+encodeURIComponent(Zn))}}catch($r){throw st.push(x+"type="+encodeURIComponent("_badmap")),$r}}catch{m&&m(un)}}if(ke){W=st.join("&");break e}}W=void 0}return a=a.i.splice(0,f),d.G=a,W}function jh(a){if(!a.g&&!a.v){a.Y=1;var d=a.Da;he||y(),ye||(he(),ye=!0),I.add(d,a),a.A=0}}function _l(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=oe(u(a.Da,a),Hh(a,a.A)),a.A++,!0)}r.Da=function(){if(this.v=null,Gh(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=oe(u(this.Wa,this),a)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,j(10),va(this),Gh(this))};function wl(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Gh(a){a.g=new Xt(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var d=ln(a.na);Oe(d,"RID","rpc"),Oe(d,"SID",a.M),Oe(d,"AID",a.K),Oe(d,"CI",a.F?"0":"1"),!a.F&&a.ia&&Oe(d,"TO",a.ia),Oe(d,"TYPE","xmlhttp"),Bs(a,d),a.u&&a.o&&ml(d,a.u,a.o),a.O&&(a.g.H=a.O);var f=a.g;a=a.ba,f.M=1,f.A=wa(ln(d)),f.u=null,f.R=!0,Eh(f,a)}r.Va=function(){this.C!=null&&(this.C=null,va(this),_l(this),j(19))};function ba(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function Wh(a,d){var f=null;if(a.g==d){ba(a),wl(a),a.g=null;var m=2}else if(hl(a.h,d))f=d.G,Sh(a.h,d),m=1;else return;if(a.I!=0){if(d.o)if(m==1){f=d.u?d.u.length:0,d=Date.now()-d.F;var A=a.D;m=D(),yt(m,new H(m,f)),Ta(a)}else jh(a);else if(A=d.m,A==3||A==0&&d.X>0||!(m==1&&Yw(a,d)||m==2&&_l(a)))switch(f&&f.length>0&&(d=a.h,d.i=d.i.concat(f)),A){case 1:Br(a,5);break;case 4:Br(a,10);break;case 3:Br(a,6);break;default:Br(a,2)}}}function Hh(a,d){let f=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(f*=2),f*d}function Br(a,d){if(a.j.info("Error code "+d),d==2){var f=u(a.bb,a),m=a.Ua;const A=!m;m=new Qn(m||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Ds(m,"https"),wa(m),A?zw(m.toString(),f):jw(m.toString(),f)}else j(2);a.I=0,a.l&&a.l.pa(d),Qh(a),qh(a)}r.bb=function(a){a?(this.j.info("Successfully pinged google.com"),j(2)):(this.j.info("Failed to ping google.com"),j(1))};function Qh(a){if(a.I=0,a.ja=[],a.l){const d=Rh(a.h);(d.length!=0||a.i.length!=0)&&(N(a.ja,d),N(a.ja,a.i),a.h.i.length=0,E(a.i),a.i.length=0),a.l.oa()}}function Yh(a,d,f){var m=f instanceof Qn?ln(f):new Qn(f);if(m.g!="")d&&(m.g=d+"."+m.g),Ns(m,m.u);else{var A=o.location;m=A.protocol,d=d?d+"."+A.hostname:A.hostname,A=+A.port;const x=new Qn(null);m&&Ds(x,m),d&&(x.g=d),A&&Ns(x,A),f&&(x.h=f),m=x}return f=a.G,d=a.wa,f&&d&&Oe(m,f,d),Oe(m,"VER",a.ka),Bs(a,m),m}function Jh(a,d,f){if(d&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return d=a.Aa&&!a.ma?new je(new gl({ab:f})):new je(a.ma),d.Fa(a.L),d}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Xh(){}r=Xh.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function Aa(){}Aa.prototype.g=function(a,d){return new Bt(a,d)};function Bt(a,d){lt.call(this),this.g=new $h(d),this.l=a,this.h=d&&d.messageUrlParams||null,a=d&&d.messageHeaders||null,d&&d.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=d&&d.initMessageHeaders||null,d&&d.messageContentType&&(a?a["X-WebChannel-Content-Type"]=d.messageContentType:a={"X-WebChannel-Content-Type":d.messageContentType}),d&&d.sa&&(a?a["X-WebChannel-Client-Profile"]=d.sa:a={"X-WebChannel-Client-Profile":d.sa}),this.g.U=a,(a=d&&d.Qb)&&!w(a)&&(this.g.u=a),this.A=d&&d.supportsCrossDomainXhr||!1,this.v=d&&d.sendRawJson||!1,(d=d&&d.httpSessionIdParam)&&!w(d)&&(this.g.G=d,a=this.h,a!==null&&d in a&&(a=this.h,d in a&&delete a[d])),this.j=new Si(this)}p(Bt,lt),Bt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Bt.prototype.close=function(){yl(this.g)},Bt.prototype.o=function(a){var d=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.v&&(f={},f.__data__=Ps(a),a=f);d.i.push(new Mw(d.Ya++,a)),d.I==3&&Ta(d)},Bt.prototype.N=function(){this.g.l=null,delete this.j,yl(this.g),delete this.g,Bt.Z.N.call(this)};function Zh(a){R.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var d=a.__sm__;if(d){e:{for(const f in d){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,d=d!==null&&a in d?d[a]:void 0),this.data=d}else this.data=a}p(Zh,R);function ef(){U.call(this),this.status=1}p(ef,U);function Si(a){this.g=a}p(Si,Xh),Si.prototype.ra=function(){yt(this.g,"a")},Si.prototype.qa=function(a){yt(this.g,new Zh(a))},Si.prototype.pa=function(a){yt(this.g,new ef)},Si.prototype.oa=function(){yt(this.g,"b")},Aa.prototype.createWebChannel=Aa.prototype.g,Bt.prototype.send=Bt.prototype.o,Bt.prototype.open=Bt.prototype.m,Bt.prototype.close=Bt.prototype.close,qm=function(){return new Aa},$m=function(){return D()},Bm=F,Zl={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Ze.NO_ERROR=0,Ze.TIMEOUT=8,Ze.HTTP_ERROR=6,Ua=Ze,Ce.COMPLETE="complete",Um=Ce,ma.EventType=P,P.OPEN="a",P.CLOSE="b",P.ERROR="c",P.MESSAGE="d",lt.prototype.listen=lt.prototype.J,Zs=ma,je.prototype.listenOnce=je.prototype.K,je.prototype.getLastError=je.prototype.Ha,je.prototype.getLastErrorCode=je.prototype.ya,je.prototype.getStatus=je.prototype.ca,je.prototype.getResponseJson=je.prototype.La,je.prototype.getResponseText=je.prototype.la,je.prototype.send=je.prototype.ea,je.prototype.setWithCredentials=je.prototype.Fa,Fm=je}).apply(typeof Pa<"u"?Pa:typeof self<"u"?self:typeof window<"u"?window:{});const Ff="@firebase/firestore",Uf="4.9.3";/**
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
 */class pt{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}pt.UNAUTHENTICATED=new pt(null),pt.GOOGLE_CREDENTIALS=new pt("google-credentials-uid"),pt.FIRST_PARTY=new pt("first-party-uid"),pt.MOCK_USER=new pt("mock-user");/**
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
 */let Es="12.7.0";/**
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
 */const _r=new Tc("@firebase/firestore");function Vi(){return _r.logLevel}function nS(r){_r.setLogLevel(r)}function q(r,...e){if(_r.logLevel<=Ee.DEBUG){const t=e.map(ld);_r.debug(`Firestore (${Es}): ${r}`,...t)}}function Ye(r,...e){if(_r.logLevel<=Ee.ERROR){const t=e.map(ld);_r.error(`Firestore (${Es}): ${r}`,...t)}}function Sn(r,...e){if(_r.logLevel<=Ee.WARN){const t=e.map(ld);_r.warn(`Firestore (${Es}): ${r}`,...t)}}function ld(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
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
 */function J(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,Km(r,n,t)}function Km(r,e,t){let n=`FIRESTORE (${Es}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Ye(n),new Error(n)}function te(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||Km(e,i,n)}function rS(r,e){r||J(57014,e)}function Q(r,e){return r}/**
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
 */const C={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class $ extends xt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
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
 */class It{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
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
 */class zm{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class iS{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(pt.UNAUTHENTICATED))}shutdown(){}}class sS{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class oS{constructor(e){this.t=e,this.currentUser=pt.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){te(this.o===void 0,42304);let n=this.i;const i=l=>this.i!==n?(n=this.i,t(l)):Promise.resolve();let s=new It;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new It,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const l=s;e.enqueueRetryable(async()=>{await l.promise,await i(this.currentUser)})},c=l=>{q("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){const l=this.t.getImmediate({optional:!0});l?c(l):(q("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new It)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?(q("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(te(typeof n.accessToken=="string",31837,{l:n}),new zm(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return te(e===null||typeof e=="string",2055,{h:e}),new pt(e)}}class aS{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=pt.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class cS{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new aS(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(pt.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Bf{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class lS{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Ue(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){te(this.o===void 0,3512);const n=s=>{s.error!=null&&q("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,q("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{q("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):q("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new Bf(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(te(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new Bf(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uS(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
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
 */class ud{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=uS(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function ge(r,e){return r<e?-1:r>e?1:0}function eu(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const i=r.charAt(n),s=e.charAt(n);if(i!==s)return Dl(i)===Dl(s)?ge(i,s):Dl(i)?1:-1}return ge(r.length,e.length)}const dS=55296,hS=57343;function Dl(r){const e=r.charCodeAt(0);return e>=dS&&e<=hS}function Yi(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function jm(r){return r+"\0"}/**
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
 */const $f="__name__";class hn{constructor(e,t,n){t===void 0?t=0:t>e.length&&J(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&J(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return hn.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof hn?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=hn.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return ge(e.length,t.length)}static compareSegments(e,t){const n=hn.isNumericId(e),i=hn.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?hn.extractNumericId(e).compare(hn.extractNumericId(t)):eu(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return dr.fromString(e.substring(4,e.length-2))}}class Ie extends hn{construct(e,t,n){return new Ie(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new $(C.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new Ie(t)}static emptyPath(){return new Ie([])}}const fS=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class $e extends hn{construct(e,t,n){return new $e(e,t,n)}static isValidIdentifier(e){return fS.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),$e.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===$f}static keyField(){return new $e([$f])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new $(C.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new $(C.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const l=e[i+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new $(C.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=l,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new $(C.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new $e(t)}static emptyPath(){return new $e([])}}/**
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
 */class G{constructor(e){this.path=e}static fromPath(e){return new G(Ie.fromString(e))}static fromName(e){return new G(Ie.fromString(e).popFirst(5))}static empty(){return new G(Ie.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&Ie.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return Ie.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new G(new Ie(e.slice()))}}/**
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
 */function dd(r,e,t){if(!t)throw new $(C.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function Gm(r,e,t,n){if(e===!0&&n===!0)throw new $(C.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function qf(r){if(!G.isDocumentKey(r))throw new $(C.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function Kf(r){if(G.isDocumentKey(r))throw new $(C.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Wm(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function Oc(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":J(12329,{type:typeof r})}function Ae(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new $(C.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Oc(r);throw new $(C.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function Hm(r,e){if(e<=0)throw new $(C.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
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
 */function nt(r,e){const t={typeString:r};return e&&(t.value=e),t}function Xo(r,e){if(!Wm(r))throw new $(C.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new $(C.INVALID_ARGUMENT,t);return!0}/**
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
 */const zf=-62135596800,jf=1e6;class Se{static now(){return Se.fromMillis(Date.now())}static fromDate(e){return Se.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*jf);return new Se(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new $(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new $(C.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<zf)throw new $(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new $(C.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/jf}_compareTo(e){return this.seconds===e.seconds?ge(this.nanoseconds,e.nanoseconds):ge(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:Se._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Xo(e,Se._jsonSchema))return new Se(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-zf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}Se._jsonSchemaVersion="firestore/timestamp/1.0",Se._jsonSchema={type:nt("string",Se._jsonSchemaVersion),seconds:nt("number"),nanoseconds:nt("number")};/**
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
 */class ie{static fromTimestamp(e){return new ie(e)}static min(){return new ie(new Se(0,0))}static max(){return new ie(new Se(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const Ji=-1;class sc{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function tu(r){return r.fields.find(e=>e.kind===2)}function zr(r){return r.fields.filter(e=>e.kind!==2)}sc.UNKNOWN_ID=-1;class Ba{constructor(e,t){this.fieldPath=e,this.kind=t}}class Co{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new Co(0,jt.min())}}function Qm(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=ie.fromTimestamp(n===1e9?new Se(t+1,0):new Se(t,n));return new jt(i,G.empty(),e)}function Ym(r){return new jt(r.readTime,r.key,Ji)}class jt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new jt(ie.min(),G.empty(),Ji)}static max(){return new jt(ie.max(),G.empty(),Ji)}}function hd(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=G.comparator(r.documentKey,e.documentKey),t!==0?t:ge(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jm="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Xm{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
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
 */async function Pr(r){if(r.code!==C.FAILED_PRECONDITION||r.message!==Jm)throw r;q("LocalStore","Unexpectedly lost primary lease")}/**
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
 */class b{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&J(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new b((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof b?t:b.resolve(t)}catch(t){return b.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):b.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):b.reject(t)}static resolve(e){return new b((t,n)=>{t(e)})}static reject(e){return new b((t,n)=>{n(e)})}static waitFor(e){return new b((t,n)=>{let i=0,s=0,o=!1;e.forEach(c=>{++i,c.next(()=>{++s,o&&s===i&&t()},l=>n(l))}),o=!0,s===i&&t()})}static or(e){let t=b.resolve(!1);for(const n of e)t=t.next(i=>i?b.resolve(i):n());return t}static forEach(e,t){const n=[];return e.forEach((i,s)=>{n.push(t.call(this,i,s))}),this.waitFor(n)}static mapArray(e,t){return new b((n,i)=>{const s=e.length,o=new Array(s);let c=0;for(let l=0;l<s;l++){const u=l;t(e[u]).next(h=>{o[u]=h,++c,c===s&&n(o)},h=>i(h))}})}static doWhile(e,t){return new b((n,i)=>{const s=()=>{e()===!0?t().next(()=>{s()},i):n()};s()})}}/**
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
 */const $t="SimpleDb";class Mc{static open(e,t,n,i){try{return new Mc(t,e.transaction(i,n))}catch(s){throw new uo(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new It,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new uo(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=fd(n.target.error);this.S.reject(new uo(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||(q($t,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new gS(t)}}class In{static delete(e){return q($t,"Removing database:",e),Gr(Du().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Eo())return!1;if(In.F())return!0;const e=Ke(),t=In.M(e),n=0<t&&t<10,i=Zm(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,In.M(Ke())===12.2&&Ye("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||(q($t,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new uo(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new $(C.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new $(C.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new uo(e,o))},i.onupgradeneeded=s=>{q($t,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next(()=>{q($t,"Database upgrade to version "+this.version+" complete")})}})),this.q&&(this.db.onversionchange=t=>this.q(t)),this.db}$(e){this.q=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=Mc.open(this.db,e,s?"readonly":"readwrite",n),l=i(c).next(u=>(c.C(),u)).catch(u=>(c.abort(u),b.reject(u))).toPromise();return l.catch(()=>{}),await c.D,l}catch(c){const l=c,u=l.name!=="FirebaseError"&&o<3;if(q($t,"Transaction failed with error:",l.message,"Retrying:",u),this.close(),!u)return Promise.reject(l)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Zm(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class pS{constructor(e){this.U=e,this.K=!1,this.W=null}get isDone(){return this.K}get G(){return this.W}set cursor(e){this.U=e}done(){this.K=!0}j(e){this.W=e}delete(){return Gr(this.U.delete())}}class uo extends ${constructor(e,t){super(C.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Cr(r){return r.name==="IndexedDbTransactionError"}class gS{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?(q($t,"PUT",this.store.name,e,t),n=this.store.put(t,e)):(q($t,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),Gr(n)}add(e){return q($t,"ADD",this.store.name,e,e),Gr(this.store.add(e))}get(e){return Gr(this.store.get(e)).next(t=>(t===void 0&&(t=null),q($t,"GET",this.store.name,e,t),t))}delete(e){return q($t,"DELETE",this.store.name,e),Gr(this.store.delete(e))}count(){return q($t,"COUNT",this.store.name),Gr(this.store.count())}J(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new b((o,c)=>{s.onerror=l=>{c(l.target.error)},s.onsuccess=l=>{o(l.target.result)}})}{const s=this.cursor(n),o=[];return this.H(s,(c,l)=>{o.push(l)}).next(()=>o)}}Y(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new b((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}})}Z(e,t){q($t,"DELETE ALL",this.store.name);const n=this.options(e,t);n.X=!1;const i=this.cursor(n);return this.H(i,(s,o,c)=>c.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.H(i,t)}te(e){const t=this.cursor({});return new b((n,i)=>{t.onerror=s=>{const o=fd(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():n()}):n()}})}H(e,t){const n=[];return new b((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const l=new pS(c),u=t(c.primaryKey,c.value,l);if(u instanceof b){const h=u.catch(p=>(l.done(),b.reject(p)));n.push(h)}l.isDone?i():l.G===null?c.continue():c.continue(l.G)}}).next(()=>b.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.X?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function Gr(r){return new b((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=fd(n.target.error);t(i)}})}let Gf=!1;function fd(r){const e=In.M(Ke());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new $("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Gf||(Gf=!0,setTimeout(()=>{throw n},0)),n}}return r}const ho="IndexBackfiller";class mS{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){q(ho,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();q(ho,`Documents written: ${t}`)}catch(t){Cr(t)?q(ho,"Ignoring IndexedDB error during index backfill: ",t):await Pr(t)}await this.re(6e4)})}}class yS{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let i=t,s=!0;return b.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return q(ho,`Processing collection: ${o}`),this.oe(e,o,i).next(c=>{i-=c,n.add(o)});s=!1})).next(()=>t-i)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(i,s)).next(c=>(q(ho,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((i,s)=>{const o=Ym(s);hd(o,n)>0&&(n=o)}),new jt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class Mt{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}Mt.ce=-1;/**
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
 */const hr=-1;function Zo(r){return r==null}function ko(r){return r===0&&1/r==-1/0}function ey(r){return typeof r=="number"&&Number.isInteger(r)&&!ko(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
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
 */const oc="";function St(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=Wf(e)),e=_S(r.get(t),e);return Wf(e)}function _S(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case oc:t+="";break;default:t+=s}}return t}function Wf(r){return r+oc+""}function wn(r){const e=r.length;if(te(e>=2,64408,{path:r}),e===2)return te(r.charAt(0)===oc&&r.charAt(1)==="",56145,{path:r}),Ie.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(oc,s);switch((o<0||o>t)&&J(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let l;i.length===0?l=c:(i+=c,l=i,i=""),n.push(l);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:J(61167,{path:r})}s=o+2}return new Ie(n)}/**
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
 */const jr="remoteDocuments",ea="owner",Pi="owner",xo="mutationQueues",wS="userId",Zt="mutations",Hf="batchId",Xr="userMutationsIndex",Qf=["userId","batchId"];/**
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
 */function $a(r,e){return[r,St(e)]}function ty(r,e,t){return[r,St(e),t]}const ES={},Xi="documentMutations",ac="remoteDocumentsV14",IS=["prefixPath","collectionGroup","readTime","documentId"],qa="documentKeyIndex",vS=["prefixPath","collectionGroup","documentId"],ny="collectionGroupIndex",TS=["collectionGroup","readTime","prefixPath","documentId"],Do="remoteDocumentGlobal",nu="remoteDocumentGlobalKey",Zi="targets",ry="queryTargetsIndex",bS=["canonicalId","targetId"],es="targetDocuments",AS=["targetId","path"],pd="documentTargetsIndex",SS=["path","targetId"],cc="targetGlobalKey",ii="targetGlobal",No="collectionParents",RS=["collectionId","parent"],ts="clientMetadata",PS="clientId",Lc="bundles",CS="bundleId",Fc="namedQueries",kS="name",gd="indexConfiguration",xS="indexId",ru="collectionGroupIndex",DS="collectionGroup",fo="indexState",NS=["indexId","uid"],iy="sequenceNumberIndex",VS=["uid","sequenceNumber"],po="indexEntries",OS=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],sy="documentKeyIndex",MS=["indexId","uid","orderedDocumentKey"],Uc="documentOverlays",LS=["userId","collectionPath","documentId"],iu="collectionPathOverlayIndex",FS=["userId","collectionPath","largestBatchId"],oy="collectionGroupOverlayIndex",US=["userId","collectionGroup","largestBatchId"],md="globals",BS="name",ay=[xo,Zt,Xi,jr,Zi,ea,ii,es,ts,Do,No,Lc,Fc],$S=[...ay,Uc],cy=[xo,Zt,Xi,ac,Zi,ea,ii,es,ts,Do,No,Lc,Fc,Uc],ly=cy,yd=[...ly,gd,fo,po],qS=yd,uy=[...yd,md],KS=uy;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class su extends Xm{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function ct(r,e){const t=Q(r);return In.O(t.le,e)}/**
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
 */function Yf(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function kr(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function dy(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
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
 */class Ne{constructor(e,t){this.comparator=e,this.root=t||wt.EMPTY}insert(e,t){return new Ne(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,wt.BLACK,null,null))}remove(e){return new Ne(this.comparator,this.root.remove(e,this.comparator).copy(null,null,wt.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Ca(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Ca(this.root,e,this.comparator,!1)}getReverseIterator(){return new Ca(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Ca(this.root,e,this.comparator,!0)}}class Ca{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class wt{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??wt.RED,this.left=i??wt.EMPTY,this.right=s??wt.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new wt(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return wt.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return wt.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,wt.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,wt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw J(43730,{key:this.key,value:this.value});if(this.right.isRed())throw J(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw J(27949);return e+(this.isRed()?0:1)}}wt.EMPTY=null,wt.RED=!0,wt.BLACK=!1;wt.EMPTY=new class{constructor(){this.size=0}get key(){throw J(57766)}get value(){throw J(16141)}get color(){throw J(16727)}get left(){throw J(29726)}get right(){throw J(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new wt(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
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
 */class Pe{constructor(e){this.comparator=e,this.data=new Ne(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Jf(this.data.getIterator())}getIteratorFrom(e){return new Jf(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof Pe)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new Pe(this.comparator);return t.data=e,t}}class Jf{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Ci(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lt{constructor(e){this.fields=e,e.sort($e.comparator)}static empty(){return new Lt([])}unionWith(e){let t=new Pe($e.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Lt(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Yi(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */class hy extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zS(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class We{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new hy("Invalid base64 string: "+s):s}}(e);return new We(t)}static fromUint8Array(e){const t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new We(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return ge(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}We.EMPTY_BYTE_STRING=new We("");const jS=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Vn(r){if(te(!!r,39018),typeof r=="string"){let e=0;const t=jS.exec(r);if(te(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:Fe(r.seconds),nanos:Fe(r.nanos)}}function Fe(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function On(r){return typeof r=="string"?We.fromBase64String(r):We.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fy="server_timestamp",py="__type__",gy="__previous_value__",my="__local_write_time__";function Bc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[py])==null?void 0:n.stringValue)===fy}function $c(r){const e=r.mapValue.fields[gy];return Bc(e)?$c(e):e}function Vo(r){const e=Vn(r.mapValue.fields[my].timestampValue);return new Se(e.seconds,e.nanos)}/**
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
 */class GS{constructor(e,t,n,i,s,o,c,l,u,h){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=u,this.isUsingEmulator=h}}const ou="(default)";class wr{constructor(e,t){this.projectId=e,this.database=t||ou}static empty(){return new wr("","")}get isDefaultDatabase(){return this.database===ou}isEqual(e){return e instanceof wr&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _d="__type__",yy="__max__",ar={mapValue:{fields:{__type__:{stringValue:yy}}}},wd="__vector__",ns="value",Ka={nullValue:"NULL_VALUE"};function Er(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?Bc(r)?4:_y(r)?9007199254740991:qc(r)?10:11:J(28295,{value:r})}function Rn(r,e){if(r===e)return!0;const t=Er(r);if(t!==Er(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return Vo(r).isEqual(Vo(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Vn(i.timestampValue),c=Vn(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return On(i.bytesValue).isEqual(On(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return Fe(i.geoPointValue.latitude)===Fe(s.geoPointValue.latitude)&&Fe(i.geoPointValue.longitude)===Fe(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return Fe(i.integerValue)===Fe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=Fe(i.doubleValue),c=Fe(s.doubleValue);return o===c?ko(o)===ko(c):isNaN(o)&&isNaN(c)}return!1}(r,e);case 9:return Yi(r.arrayValue.values||[],e.arrayValue.values||[],Rn);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(Yf(o)!==Yf(c))return!1;for(const l in o)if(o.hasOwnProperty(l)&&(c[l]===void 0||!Rn(o[l],c[l])))return!1;return!0}(r,e);default:return J(52216,{left:r})}}function Oo(r,e){return(r.values||[]).find(t=>Rn(t,e))!==void 0}function Ir(r,e){if(r===e)return 0;const t=Er(r),n=Er(e);if(t!==n)return ge(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return ge(r.booleanValue,e.booleanValue);case 2:return function(s,o){const c=Fe(s.integerValue||s.doubleValue),l=Fe(o.integerValue||o.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1}(r,e);case 3:return Xf(r.timestampValue,e.timestampValue);case 4:return Xf(Vo(r),Vo(e));case 5:return eu(r.stringValue,e.stringValue);case 6:return function(s,o){const c=On(s),l=On(o);return c.compareTo(l)}(r.bytesValue,e.bytesValue);case 7:return function(s,o){const c=s.split("/"),l=o.split("/");for(let u=0;u<c.length&&u<l.length;u++){const h=ge(c[u],l[u]);if(h!==0)return h}return ge(c.length,l.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,o){const c=ge(Fe(s.latitude),Fe(o.latitude));return c!==0?c:ge(Fe(s.longitude),Fe(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return Zf(r.arrayValue,e.arrayValue);case 10:return function(s,o){var g,E,N,V;const c=s.fields||{},l=o.fields||{},u=(g=c[ns])==null?void 0:g.arrayValue,h=(E=l[ns])==null?void 0:E.arrayValue,p=ge(((N=u==null?void 0:u.values)==null?void 0:N.length)||0,((V=h==null?void 0:h.values)==null?void 0:V.length)||0);return p!==0?p:Zf(u,h)}(r.mapValue,e.mapValue);case 11:return function(s,o){if(s===ar.mapValue&&o===ar.mapValue)return 0;if(s===ar.mapValue)return 1;if(o===ar.mapValue)return-1;const c=s.fields||{},l=Object.keys(c),u=o.fields||{},h=Object.keys(u);l.sort(),h.sort();for(let p=0;p<l.length&&p<h.length;++p){const g=eu(l[p],h[p]);if(g!==0)return g;const E=Ir(c[l[p]],u[h[p]]);if(E!==0)return E}return ge(l.length,h.length)}(r.mapValue,e.mapValue);default:throw J(23264,{he:t})}}function Xf(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return ge(r,e);const t=Vn(r),n=Vn(e),i=ge(t.seconds,n.seconds);return i!==0?i:ge(t.nanos,n.nanos)}function Zf(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=Ir(t[i],n[i]);if(s)return s}return ge(t.length,n.length)}function rs(r){return au(r)}function au(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=Vn(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return On(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return G.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=au(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${au(t.fields[o])}`;return i+"}"}(r.mapValue):J(61005,{value:r})}function za(r){switch(Er(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=$c(r);return e?16+za(e):16;case 5:return 2*r.stringValue.length;case 6:return On(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((i,s)=>i+za(s),0)}(r.arrayValue);case 10:case 11:return function(n){let i=0;return kr(n.fields,(s,o)=>{i+=s.length+za(o)}),i}(r.mapValue);default:throw J(13486,{value:r})}}function ci(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function cu(r){return!!r&&"integerValue"in r}function Mo(r){return!!r&&"arrayValue"in r}function ep(r){return!!r&&"nullValue"in r}function tp(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function ja(r){return!!r&&"mapValue"in r}function qc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[_d])==null?void 0:n.stringValue)===wd}function go(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return kr(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=go(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=go(r.arrayValue.values[t]);return e}return{...r}}function _y(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===yy}const wy={mapValue:{fields:{[_d]:{stringValue:wd},[ns]:{arrayValue:{}}}}};function WS(r){return"nullValue"in r?Ka:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?ci(wr.empty(),G.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?qc(r)?wy:{mapValue:{}}:J(35942,{value:r})}function HS(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?ci(wr.empty(),G.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?wy:"mapValue"in r?qc(r)?{mapValue:{}}:ar:J(61959,{value:r})}function np(r,e){const t=Ir(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function rp(r,e){const t=Ir(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
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
 */class Et{constructor(e){this.value=e}static empty(){return new Et({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!ja(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=go(t)}setAll(e){let t=$e.emptyPath(),n={},i=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const l=this.getFieldsMap(t);this.applyChanges(l,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=go(o):i.push(c.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());ja(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Rn(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];ja(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){kr(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new Et(go(this.value))}}function Ey(r){const e=[];return kr(r.fields,(t,n)=>{const i=new $e([t]);if(ja(n)){const s=Ey(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new Lt(e)}/**
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
 */class Me{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new Me(e,0,ie.min(),ie.min(),ie.min(),Et.empty(),0)}static newFoundDocument(e,t,n,i){return new Me(e,1,t,ie.min(),n,i,0)}static newNoDocument(e,t){return new Me(e,2,t,ie.min(),ie.min(),Et.empty(),0)}static newUnknownDocument(e,t){return new Me(e,3,t,ie.min(),ie.min(),Et.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(ie.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Et.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Et.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=ie.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof Me&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new Me(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class vr{constructor(e,t){this.position=e,this.inclusive=t}}function ip(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=G.comparator(G.fromName(o.referenceValue),t.key):n=Ir(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function sp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!Rn(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class Lo{constructor(e,t="asc"){this.field=e,this.dir=t}}function QS(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class Iy{}class ve extends Iy{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new YS(e,t,n):t==="array-contains"?new ZS(e,n):t==="in"?new Ry(e,n):t==="not-in"?new eR(e,n):t==="array-contains-any"?new tR(e,n):new ve(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new JS(e,n):new XS(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(Ir(t,this.value)):t!==null&&Er(this.value)===Er(t)&&this.matchesComparison(Ir(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return J(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Re extends Iy{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new Re(e,t)}matches(e){return is(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function is(r){return r.op==="and"}function lu(r){return r.op==="or"}function Ed(r){return vy(r)&&is(r)}function vy(r){for(const e of r.filters)if(e instanceof Re)return!1;return!0}function uu(r){if(r instanceof ve)return r.field.canonicalString()+r.op.toString()+rs(r.value);if(Ed(r))return r.filters.map(e=>uu(e)).join(",");{const e=r.filters.map(t=>uu(t)).join(",");return`${r.op}(${e})`}}function Ty(r,e){return r instanceof ve?function(n,i){return i instanceof ve&&n.op===i.op&&n.field.isEqual(i.field)&&Rn(n.value,i.value)}(r,e):r instanceof Re?function(n,i){return i instanceof Re&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,o,c)=>s&&Ty(o,i.filters[c]),!0):!1}(r,e):void J(19439)}function by(r,e){const t=r.filters.concat(e);return Re.create(t,r.op)}function Ay(r){return r instanceof ve?function(t){return`${t.field.canonicalString()} ${t.op} ${rs(t.value)}`}(r):r instanceof Re?function(t){return t.op.toString()+" {"+t.getFilters().map(Ay).join(" ,")+"}"}(r):"Filter"}class YS extends ve{constructor(e,t,n){super(e,t,n),this.key=G.fromName(n.referenceValue)}matches(e){const t=G.comparator(e.key,this.key);return this.matchesComparison(t)}}class JS extends ve{constructor(e,t){super(e,"in",t),this.keys=Sy("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class XS extends ve{constructor(e,t){super(e,"not-in",t),this.keys=Sy("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Sy(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>G.fromName(n.referenceValue))}class ZS extends ve{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Mo(t)&&Oo(t.arrayValue,this.value)}}class Ry extends ve{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Oo(this.value.arrayValue,t)}}class eR extends ve{constructor(e,t){super(e,"not-in",t)}matches(e){if(Oo(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Oo(this.value.arrayValue,t)}}class tR extends ve{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Mo(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Oo(this.value.arrayValue,n))}}/**
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
 */class nR{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function du(r,e=null,t=[],n=[],i=null,s=null,o=null){return new nR(r,e,t,n,i,s,o)}function li(r){const e=Q(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>uu(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),Zo(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>rs(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>rs(n)).join(",")),e.Te=t}return e.Te}function ta(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!QS(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!Ty(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!sp(r.startAt,e.startAt)&&sp(r.endAt,e.endAt)}function lc(r){return G.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function uc(r,e){return r.filters.filter(t=>t instanceof ve&&t.field.isEqual(e))}function op(r,e,t){let n=Ka,i=!0;for(const s of uc(r,e)){let o=Ka,c=!0;switch(s.op){case"<":case"<=":o=WS(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=Ka}np({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];np({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function ap(r,e,t){let n=ar,i=!0;for(const s of uc(r,e)){let o=ar,c=!0;switch(s.op){case">=":case">":o=HS(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=ar}rp({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];rp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
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
 */class Fn{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function Py(r,e,t,n,i,s,o,c){return new Fn(r,e,t,n,i,s,o,c)}function Is(r){return new Fn(r)}function cp(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Id(r){return r.collectionGroup!==null}function zi(r){const e=Q(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new Pe($e.comparator);return o.filters.forEach(l=>{l.getFlattenedFilters().forEach(u=>{u.isInequality()&&(c=c.add(u.field))})}),c})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new Lo(s,n))}),t.has($e.keyField().canonicalString())||e.Ie.push(new Lo($e.keyField(),n))}return e.Ie}function Dt(r){const e=Q(r);return e.Ee||(e.Ee=rR(e,zi(r))),e.Ee}function rR(r,e){if(r.limitType==="F")return du(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new Lo(i.field,s)});const t=r.endAt?new vr(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new vr(r.startAt.position,r.startAt.inclusive):null;return du(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function hu(r,e){const t=r.filters.concat([e]);return new Fn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function dc(r,e,t){return new Fn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function na(r,e){return ta(Dt(r),Dt(e))&&r.limitType===e.limitType}function Cy(r){return`${li(Dt(r))}|lt:${r.limitType}`}function Oi(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>Ay(i)).join(", ")}]`),Zo(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>rs(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>rs(i)).join(",")),`Target(${n})`}(Dt(r))}; limitType=${r.limitType})`}function ra(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):G.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of zi(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(o,c,l){const u=ip(o,c,l);return o.inclusive?u<=0:u<0}(n.startAt,zi(n),i)||n.endAt&&!function(o,c,l){const u=ip(o,c,l);return o.inclusive?u>=0:u>0}(n.endAt,zi(n),i))}(r,e)}function ky(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function xy(r){return(e,t)=>{let n=!1;for(const i of zi(r)){const s=iR(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function iR(r,e,t){const n=r.field.isKeyField()?G.comparator(e.key,t.key):function(s,o,c){const l=o.data.field(s),u=c.data.field(s);return l!==null&&u!==null?Ir(l,u):J(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return J(19790,{direction:r.dir})}}/**
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
 */class Un{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){kr(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return dy(this.inner)}size(){return this.innerSize}}/**
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
 */const sR=new Ne(G.comparator);function Ft(){return sR}const Dy=new Ne(G.comparator);function eo(...r){let e=Dy;for(const t of r)e=e.insert(t.key,t);return e}function Ny(r){let e=Dy;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function En(){return mo()}function Vy(){return mo()}function mo(){return new Un(r=>r.toString(),(r,e)=>r.isEqual(e))}const oR=new Ne(G.comparator),aR=new Pe(G.comparator);function _e(...r){let e=aR;for(const t of r)e=e.add(t);return e}const cR=new Pe(ge);function vd(){return cR}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Td(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:ko(e)?"-0":e}}function Oy(r){return{integerValue:""+r}}function My(r,e){return ey(e)?Oy(e):Td(r,e)}/**
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
 */class Kc{constructor(){this._=void 0}}function lR(r,e,t){return r instanceof ss?function(i,s){const o={fields:{[py]:{stringValue:fy},[my]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Bc(s)&&(s=$c(s)),s&&(o.fields[gy]=s),{mapValue:o}}(t,e):r instanceof ui?Fy(r,e):r instanceof di?Uy(r,e):function(i,s){const o=Ly(i,s),c=lp(o)+lp(i.Ae);return cu(o)&&cu(i.Ae)?Oy(c):Td(i.serializer,c)}(r,e)}function uR(r,e,t){return r instanceof ui?Fy(r,e):r instanceof di?Uy(r,e):t}function Ly(r,e){return r instanceof os?function(n){return cu(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class ss extends Kc{}class ui extends Kc{constructor(e){super(),this.elements=e}}function Fy(r,e){const t=By(e);for(const n of r.elements)t.some(i=>Rn(i,n))||t.push(n);return{arrayValue:{values:t}}}class di extends Kc{constructor(e){super(),this.elements=e}}function Uy(r,e){let t=By(e);for(const n of r.elements)t=t.filter(i=>!Rn(i,n));return{arrayValue:{values:t}}}class os extends Kc{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function lp(r){return Fe(r.integerValue||r.doubleValue)}function By(r){return Mo(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
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
 */class ia{constructor(e,t){this.field=e,this.transform=t}}function dR(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof ui&&i instanceof ui||n instanceof di&&i instanceof di?Yi(n.elements,i.elements,Rn):n instanceof os&&i instanceof os?Rn(n.Ae,i.Ae):n instanceof ss&&i instanceof ss}(r.transform,e.transform)}class hR{constructor(e,t){this.version=e,this.transformResults=t}}class qe{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new qe}static exists(e){return new qe(void 0,e)}static updateTime(e){return new qe(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ga(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class zc{}function $y(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new Ts(r.key,qe.none()):new vs(r.key,r.data,qe.none());{const t=r.data,n=Et.empty();let i=new Pe($e.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new Bn(r.key,n,new Lt(i.toArray()),qe.none())}}function fR(r,e,t){r instanceof vs?function(i,s,o){const c=i.value.clone(),l=dp(i.fieldTransforms,s,o.transformResults);c.setAll(l),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):r instanceof Bn?function(i,s,o){if(!Ga(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=dp(i.fieldTransforms,s,o.transformResults),l=s.data;l.setAll(qy(i)),l.setAll(c),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(r,e,t):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function yo(r,e,t,n){return r instanceof vs?function(s,o,c,l){if(!Ga(s.precondition,o))return c;const u=s.value.clone(),h=hp(s.fieldTransforms,l,o);return u.setAll(h),o.convertToFoundDocument(o.version,u).setHasLocalMutations(),null}(r,e,t,n):r instanceof Bn?function(s,o,c,l){if(!Ga(s.precondition,o))return c;const u=hp(s.fieldTransforms,l,o),h=o.data;return h.setAll(qy(s)),h.setAll(u),o.convertToFoundDocument(o.version,h).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(r,e,t,n):function(s,o,c){return Ga(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(r,e,t)}function pR(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=Ly(n.transform,i||null);s!=null&&(t===null&&(t=Et.empty()),t.set(n.field,s))}return t||null}function up(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&Yi(n,i,(s,o)=>dR(s,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class vs extends zc{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Bn extends zc{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function qy(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function dp(r,e,t){const n=new Map;te(r.length===t.length,32656,{Re:t.length,Ve:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,uR(o,c,t[i]))}return n}function hp(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,lR(s,o,e))}return n}class Ts extends zc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class bd extends zc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
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
 */class Ad{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&fR(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=yo(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=yo(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=Vy();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const l=$y(o,c);l!==null&&n.set(i.key,l),o.isValidDocument()||o.convertToNoDocument(ie.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),_e())}isEqual(e){return this.batchId===e.batchId&&Yi(this.mutations,e.mutations,(t,n)=>up(t,n))&&Yi(this.baseMutations,e.baseMutations,(t,n)=>up(t,n))}}class Sd{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){te(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let i=function(){return oR}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new Sd(e,t,n,i)}}/**
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
 */class Rd{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class gR{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
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
 */var et,Te;function Ky(r){switch(r){case C.OK:return J(64938);case C.CANCELLED:case C.UNKNOWN:case C.DEADLINE_EXCEEDED:case C.RESOURCE_EXHAUSTED:case C.INTERNAL:case C.UNAVAILABLE:case C.UNAUTHENTICATED:return!1;case C.INVALID_ARGUMENT:case C.NOT_FOUND:case C.ALREADY_EXISTS:case C.PERMISSION_DENIED:case C.FAILED_PRECONDITION:case C.ABORTED:case C.OUT_OF_RANGE:case C.UNIMPLEMENTED:case C.DATA_LOSS:return!0;default:return J(15467,{code:r})}}function zy(r){if(r===void 0)return Ye("GRPC error has no .code"),C.UNKNOWN;switch(r){case et.OK:return C.OK;case et.CANCELLED:return C.CANCELLED;case et.UNKNOWN:return C.UNKNOWN;case et.DEADLINE_EXCEEDED:return C.DEADLINE_EXCEEDED;case et.RESOURCE_EXHAUSTED:return C.RESOURCE_EXHAUSTED;case et.INTERNAL:return C.INTERNAL;case et.UNAVAILABLE:return C.UNAVAILABLE;case et.UNAUTHENTICATED:return C.UNAUTHENTICATED;case et.INVALID_ARGUMENT:return C.INVALID_ARGUMENT;case et.NOT_FOUND:return C.NOT_FOUND;case et.ALREADY_EXISTS:return C.ALREADY_EXISTS;case et.PERMISSION_DENIED:return C.PERMISSION_DENIED;case et.FAILED_PRECONDITION:return C.FAILED_PRECONDITION;case et.ABORTED:return C.ABORTED;case et.OUT_OF_RANGE:return C.OUT_OF_RANGE;case et.UNIMPLEMENTED:return C.UNIMPLEMENTED;case et.DATA_LOSS:return C.DATA_LOSS;default:return J(39323,{code:r})}}(Te=et||(et={}))[Te.OK=0]="OK",Te[Te.CANCELLED=1]="CANCELLED",Te[Te.UNKNOWN=2]="UNKNOWN",Te[Te.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",Te[Te.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",Te[Te.NOT_FOUND=5]="NOT_FOUND",Te[Te.ALREADY_EXISTS=6]="ALREADY_EXISTS",Te[Te.PERMISSION_DENIED=7]="PERMISSION_DENIED",Te[Te.UNAUTHENTICATED=16]="UNAUTHENTICATED",Te[Te.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",Te[Te.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",Te[Te.ABORTED=10]="ABORTED",Te[Te.OUT_OF_RANGE=11]="OUT_OF_RANGE",Te[Te.UNIMPLEMENTED=12]="UNIMPLEMENTED",Te[Te.INTERNAL=13]="INTERNAL",Te[Te.UNAVAILABLE=14]="UNAVAILABLE",Te[Te.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function jy(){return new TextEncoder}/**
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
 */const mR=new dr([4294967295,4294967295],0);function fp(r){const e=jy().encode(r),t=new Lm;return t.update(e),new Uint8Array(t.digest())}function pp(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new dr([t,n],0),new dr([i,s],0)]}class Pd{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new to(`Invalid padding: ${t}`);if(n<0)throw new to(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new to(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new to(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=dr.fromNumber(this.ge)}ye(e,t,n){let i=e.add(t.multiply(dr.fromNumber(n)));return i.compare(mR)===1&&(i=new dr([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=fp(e),[n,i]=pp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);if(!this.we(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new Pd(s,i,t);return n.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=fp(e),[n,i]=pp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);this.Se(o)}}Se(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class to extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
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
 */class sa{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,oa.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new sa(ie.min(),i,new Ne(ge),Ft(),_e())}}class oa{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new oa(n,t,_e(),_e(),_e())}}/**
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
 */class Wa{constructor(e,t,n,i){this.be=e,this.removedTargetIds=t,this.key=n,this.De=i}}class Gy{constructor(e,t){this.targetId=e,this.Ce=t}}class Wy{constructor(e,t,n=We.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class gp{constructor(){this.ve=0,this.Fe=mp(),this.Me=We.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=_e(),t=_e(),n=_e();return this.Fe.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:J(38017,{changeType:s})}}),new oa(this.Me,this.xe,e,t,n)}qe(){this.Oe=!1,this.Fe=mp()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,te(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class yR{constructor(e){this.Ge=e,this.ze=new Map,this.je=Ft(),this.Je=ka(),this.He=ka(),this.Ye=new Ne(ge)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(e.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.We(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:J(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,i)=>{this.rt(i)&&t(i)})}st(e){const t=e.targetId,n=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(lc(s))if(n===0){const o=new G(s.path);this.et(t,o,Me.newNoDocument(o,ie.min()))}else te(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const c=this.ut(e),l=c?this.ct(c,e,o):1;if(l!==0){this.it(t);const u=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,u)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=On(n).toUint8Array()}catch(l){if(l instanceof hy)return Sn("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l}try{c=new Pd(o,i,s)}catch(l){return Sn(l instanceof to?"BloomFilter error: ":"Applying bloom filter failed: ",l),null}return c.ge===0?null:c}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)}),i}Tt(e){const t=new Map;this.ze.forEach((s,o)=>{const c=this.ot(o);if(c){if(s.current&&lc(c.target)){const l=new G(c.target.path);this.It(l).has(o)||this.Et(o,l)||this.et(o,l,Me.newNoDocument(l,e))}s.Be&&(t.set(o,s.ke()),s.qe())}});let n=_e();this.He.forEach((s,o)=>{let c=!0;o.forEachWhile(l=>{const u=this.ot(l);return!u||u.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(n=n.add(s))}),this.je.forEach((s,o)=>o.setReadTime(e));const i=new sa(e,t,this.Ye,this.je,n);return this.je=Ft(),this.Je=ka(),this.He=ka(),this.Ye=new Ne(ge),i}Xe(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,n),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.Qe(t,1):i.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new gp,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new Pe(ge),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new Pe(ge),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||q("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new gp),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function ka(){return new Ne(G.comparator)}function mp(){return new Ne(G.comparator)}const _R={asc:"ASCENDING",desc:"DESCENDING"},wR={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},ER={and:"AND",or:"OR"};class IR{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function fu(r,e){return r.useProto3Json||Zo(e)?e:{value:e}}function as(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Hy(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function vR(r,e){return as(r,e.toTimestamp())}function Je(r){return te(!!r,49232),ie.fromTimestamp(function(t){const n=Vn(t);return new Se(n.seconds,n.nanos)}(r))}function Cd(r,e){return pu(r,e).canonicalString()}function pu(r,e){const t=function(i){return new Ie(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function Qy(r){const e=Ie.fromString(r);return te(s_(e),10190,{key:e.toString()}),e}function Fo(r,e){return Cd(r.databaseId,e.path)}function vn(r,e){const t=Qy(e);if(t.get(1)!==r.databaseId.projectId)throw new $(C.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new $(C.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new G(Xy(t))}function Yy(r,e){return Cd(r.databaseId,e)}function Jy(r){const e=Qy(r);return e.length===4?Ie.emptyPath():Xy(e)}function gu(r){return new Ie(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Xy(r){return te(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function yp(r,e,t){return{name:Fo(r,e),fields:t.value.mapValue.fields}}function Zy(r,e,t){const n=vn(r,e.name),i=Je(e.updateTime),s=e.createTime?Je(e.createTime):ie.min(),o=new Et({mapValue:{fields:e.fields}}),c=Me.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function TR(r,e){return"found"in e?function(n,i){te(!!i.found,43571),i.found.name,i.found.updateTime;const s=vn(n,i.found.name),o=Je(i.found.updateTime),c=i.found.createTime?Je(i.found.createTime):ie.min(),l=new Et({mapValue:{fields:i.found.fields}});return Me.newFoundDocument(s,o,c,l)}(r,e):"missing"in e?function(n,i){te(!!i.missing,3894),te(!!i.readTime,22933);const s=vn(n,i.missing),o=Je(i.readTime);return Me.newNoDocument(s,o)}(r,e):J(7234,{result:e})}function bR(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(u){return u==="NO_CHANGE"?0:u==="ADD"?1:u==="REMOVE"?2:u==="CURRENT"?3:u==="RESET"?4:J(39313,{state:u})}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(u,h){return u.useProto3Json?(te(h===void 0||typeof h=="string",58123),We.fromBase64String(h||"")):(te(h===void 0||h instanceof Buffer||h instanceof Uint8Array,16193),We.fromUint8Array(h||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(u){const h=u.code===void 0?C.UNKNOWN:zy(u.code);return new $(h,u.message||"")}(o);t=new Wy(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=vn(r,n.document.name),s=Je(n.document.updateTime),o=n.document.createTime?Je(n.document.createTime):ie.min(),c=new Et({mapValue:{fields:n.document.fields}}),l=Me.newFoundDocument(i,s,o,c),u=n.targetIds||[],h=n.removedTargetIds||[];t=new Wa(u,h,l.key,l)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=vn(r,n.document),s=n.readTime?Je(n.readTime):ie.min(),o=Me.newNoDocument(i,s),c=n.removedTargetIds||[];t=new Wa([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=vn(r,n.document),s=n.removedTargetIds||[];t=new Wa([],s,i,null)}else{if(!("filter"in e))return J(11601,{Rt:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new gR(i,s),c=n.targetId;t=new Gy(c,o)}}return t}function Uo(r,e){let t;if(e instanceof vs)t={update:yp(r,e.key,e.value)};else if(e instanceof Ts)t={delete:Fo(r,e.key)};else if(e instanceof Bn)t={update:yp(r,e.key,e.data),updateMask:kR(e.fieldMask)};else{if(!(e instanceof bd))return J(16599,{Vt:e.type});t={verify:Fo(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,o){const c=o.transform;if(c instanceof ss)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof ui)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof di)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof os)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw J(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:vR(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:J(27497)}(r,e.precondition)),t}function mu(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?qe.updateTime(Je(s.updateTime)):s.exists!==void 0?qe.exists(s.exists):qe.none()}(e.currentDocument):qe.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(o,c){let l=null;if("setToServerValue"in c)te(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),l=new ss;else if("appendMissingElements"in c){const h=c.appendMissingElements.values||[];l=new ui(h)}else if("removeAllFromArray"in c){const h=c.removeAllFromArray.values||[];l=new di(h)}else"increment"in c?l=new os(o,c.increment):J(16584,{proto:c});const u=$e.fromServerFormat(c.fieldPath);return new ia(u,l)}(r,i)):[];if(e.update){e.update.name;const i=vn(r,e.update.name),s=new Et({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(l){const u=l.fieldPaths||[];return new Lt(u.map(h=>$e.fromServerFormat(h)))}(e.updateMask);return new Bn(i,s,o,t,n)}return new vs(i,s,t,n)}if(e.delete){const i=vn(r,e.delete);return new Ts(i,t)}if(e.verify){const i=vn(r,e.verify);return new bd(i,t)}return J(1463,{proto:e})}function AR(r,e){return r&&r.length>0?(te(e!==void 0,14353),r.map(t=>function(i,s){let o=i.updateTime?Je(i.updateTime):Je(s);return o.isEqual(ie.min())&&(o=Je(s)),new hR(o,i.transformResults||[])}(t,e))):[]}function e_(r,e){return{documents:[Yy(r,e.path)]}}function t_(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=Yy(r,i);const s=function(u){if(u.length!==0)return i_(Re.create(u,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const o=function(u){if(u.length!==0)return u.map(h=>function(g){return{field:Mi(g.field),direction:RR(g.dir)}}(h))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=fu(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(u){return{before:u.inclusive,values:u.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(u){return{before:!u.inclusive,values:u.position}}(e.endAt)),{ft:t,parent:i}}function n_(r){let e=Jy(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){te(n===1,65062);const h=t.from[0];h.allDescendants?i=h.collectionId:e=e.child(h.collectionId)}let s=[];t.where&&(s=function(p){const g=r_(p);return g instanceof Re&&Ed(g)?g.getFilters():[g]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(g=>function(N){return new Lo(Li(N.field),function(O){switch(O){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(N.direction))}(g))}(t.orderBy));let c=null;t.limit&&(c=function(p){let g;return g=typeof p=="object"?p.value:p,Zo(g)?null:g}(t.limit));let l=null;t.startAt&&(l=function(p){const g=!!p.before,E=p.values||[];return new vr(E,g)}(t.startAt));let u=null;return t.endAt&&(u=function(p){const g=!p.before,E=p.values||[];return new vr(E,g)}(t.endAt)),Py(e,i,o,s,c,"F",l,u)}function SR(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return J(28987,{purpose:i})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function r_(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Li(t.unaryFilter.field);return ve.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Li(t.unaryFilter.field);return ve.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Li(t.unaryFilter.field);return ve.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Li(t.unaryFilter.field);return ve.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return J(61313);default:return J(60726)}}(r):r.fieldFilter!==void 0?function(t){return ve.create(Li(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return J(58110);default:return J(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return Re.create(t.compositeFilter.filters.map(n=>r_(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return J(1026)}}(t.compositeFilter.op))}(r):J(30097,{filter:r})}function RR(r){return _R[r]}function PR(r){return wR[r]}function CR(r){return ER[r]}function Mi(r){return{fieldPath:r.canonicalString()}}function Li(r){return $e.fromServerFormat(r.fieldPath)}function i_(r){return r instanceof ve?function(t){if(t.op==="=="){if(tp(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NAN"}};if(ep(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(tp(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NOT_NAN"}};if(ep(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Mi(t.field),op:PR(t.op),value:t.value}}}(r):r instanceof Re?function(t){const n=t.getFilters().map(i=>i_(i));return n.length===1?n[0]:{compositeFilter:{op:CR(t.op),filters:n}}}(r):J(54877,{filter:r})}function kR(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function s_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
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
 */class kn{constructor(e,t,n,i,s=ie.min(),o=ie.min(),c=We.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=l}withSequenceNumber(e){return new kn(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
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
 */class o_{constructor(e){this.yt=e}}function xR(r,e){let t;if(e.document)t=Zy(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=G.fromSegments(e.noDocument.path),i=fi(e.noDocument.readTime);t=Me.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return J(56709);{const n=G.fromSegments(e.unknownDocument.path),i=fi(e.unknownDocument.version);t=Me.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new Se(i[0],i[1]);return ie.fromTimestamp(s)}(e.readTime)),t}function _p(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:hc(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,o){return{name:Fo(s,o.key),fields:o.data.value.mapValue.fields,updateTime:as(s,o.version.toTimestamp()),createTime:as(s,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:hi(e.version)};else{if(!e.isUnknownDocument())return J(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:hi(e.version)}}return n}function hc(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function hi(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function fi(r){const e=new Se(r.seconds,r.nanoseconds);return ie.fromTimestamp(e)}function Wr(r,e){const t=(e.baseMutations||[]).map(s=>mu(r.yt,s));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>mu(r.yt,s)),i=Se.fromMillis(e.localWriteTimeMs);return new Ad(e.batchId,i,t,n)}function no(r){const e=fi(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?fi(r.lastLimboFreeSnapshotVersion):ie.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){const o=s.documents.length;return te(o===1,1966,{count:o}),Dt(Is(Jy(s.documents[0])))}(r.query):function(s){return Dt(n_(s))}(r.query),new kn(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,We.fromBase64String(r.resumeToken))}function a_(r,e){const t=hi(e.snapshotVersion),n=hi(e.lastLimboFreeSnapshotVersion);let i;i=lc(e.target)?e_(r.yt,e.target):t_(r.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:li(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function kd(r){const e=n_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?dc(e,e.limit,"L"):e}function Nl(r,e){return new Rd(e.largestBatchId,mu(r.yt,e.overlayMutation))}function wp(r,e){const t=e.path.lastSegment();return[r,St(e.path.popLast()),t]}function Ep(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:hi(n.readTime),documentKey:St(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class DR{getBundleMetadata(e,t){return Ip(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:fi(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return Ip(e).put(function(i){return{bundleId:i.id,createTime:hi(Je(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return vp(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:kd(s.bundledQuery),readTime:fi(s.readTime)}}(n)})}saveNamedQuery(e,t){return vp(e).put(function(i){return{name:i.name,readTime:hi(Je(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function Ip(r){return ct(r,Lc)}function vp(r){return ct(r,Fc)}/**
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
 */class jc{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new jc(e,n)}getOverlay(e,t){return js(e).get(wp(this.userId,t)).next(n=>n?Nl(this.serializer,n):null)}getOverlays(e,t){const n=En();return b.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,o)=>{const c=new Rd(t,o);i.push(this.St(e,c))}),b.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(o=>i.add(St(o.getCollectionPath())));const s=[];return i.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(js(e).Z(iu,c))}),b.waitFor(s)}getOverlaysForCollection(e,t,n){const i=En(),s=St(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return js(e).J(iu,o).next(c=>{for(const l of c){const u=Nl(this.serializer,l);i.set(u.getKey(),u)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=En();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return js(e).ee({index:oy,range:c},(l,u,h)=>{const p=Nl(this.serializer,u);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):h.done()}).next(()=>s)}St(e,t){return js(e).put(function(i,s,o){const[c,l,u]=wp(s,o.mutation.key);return{userId:s,collectionPath:l,documentId:u,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Uo(i.yt,o.mutation)}}(this.serializer,this.userId,t))}}function js(r){return ct(r,Uc)}/**
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
 */class NR{bt(e){return ct(e,md)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?We.fromUint8Array(n):We.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class Hr{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(Fe(e.integerValue));else if("doubleValue"in e){const n=Fe(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),ko(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=Vn(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(On(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?_y(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):qc(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):J(19022,{$t:e})}Ot(e,t){this.Ft(t,25),this.Ut(e,t)}Ut(e,t){t.xt(e)}qt(e,t){const n=e.fields||{};this.Ft(t,55);for(const i of Object.keys(n))this.Ot(i,t),this.Ct(n[i],t)}kt(e,t){var o,c;const n=e.fields||{};this.Ft(t,53);const i=ns,s=((c=(o=n[i].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(Fe(s)),this.Ot(i,t),this.Ct(n[i],t)}Qt(e,t){const n=e.values||[];this.Ft(t,50);for(const i of n)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),G.fromName(e).path.forEach(n=>{this.Ft(t,60),this.Ut(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Hr.Kt=new Hr;/**
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
 */const ki=255;function VR(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Tp(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const o=VR(255&n[s]);if(i+=o,o!==8)break}return i}(r);return Math.ceil(e/8)}class OR{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Wt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Jt(n.value),n=t.next();this.Ht()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Jt(n);else if(n<2048)this.Jt(960|n>>>6),this.Jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|n>>>12),this.Jt(128|63&n>>>6),this.Jt(128|63&n);else{const i=t.codePointAt(0);this.Jt(240|i>>>18),this.Jt(128|63&i>>>12),this.Jt(128|63&i>>>6),this.Jt(128|63&i)}}this.Ht()}Xt(e){const t=this.en(e),n=Tp(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),n=Tp(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(ki),this.sn(255)}_n(){this.an(ki),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===ki?(this.sn(ki),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===ki?(this.an(ki),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class MR{constructor(e){this.cn=e}Bt(e){this.cn.Wt(e)}xt(e){this.cn.Yt(e)}Mt(e){this.cn.Xt(e)}vt(){this.cn.rn()}}class LR{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class Gs{constructor(){this.cn=new OR,this.ln=new MR(this.cn),this.hn=new LR(this.cn)}seed(e){this.cn.seed(e)}Pn(e){return e===0?this.ln:this.hn}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class Qr{constructor(e,t,n,i){this.Tn=e,this.In=t,this.En=n,this.dn=i}An(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new Qr(this.Tn,this.In,this.En,n)}Rn(e,t,n){return{indexId:this.Tn,uid:e,arrayValue:Ha(this.En),directionalValue:Ha(this.dn),orderedDocumentKey:Ha(t),documentKey:n.path.toArray()}}Vn(e,t,n){const i=this.Rn(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function tr(r,e){let t=r.Tn-e.Tn;return t!==0?t:(t=bp(r.En,e.En),t!==0?t:(t=bp(r.dn,e.dn),t!==0?t:G.comparator(r.In,e.In)))}function bp(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function Ha(r){return Ig()?function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n}(r):r}function Ap(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(r)}class Sp{constructor(e){this.mn=new Pe((t,n)=>$e.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.fn=e.orderBy,this.gn=[];for(const t of e.filters){const n=t;n.isInequality()?this.mn=this.mn.add(n):this.gn.push(n)}}get pn(){return this.mn.size>1}yn(e){if(te(e.collectionGroup===this.collectionId,49279),this.pn)return!1;const t=tu(e);if(t!==void 0&&!this.wn(t))return!1;const n=zr(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.wn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.mn.size>0){const c=this.mn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const l=n[s];if(!this.Sn(c,l)||!this.bn(this.fn[o++],l))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.fn.length||!this.bn(this.fn[o++],c))return!1}return!0}Dn(){if(this.pn)return null;let e=new Pe($e.comparator);const t=[];for(const n of this.gn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new Ba(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new Ba(n.field,0))}for(const n of this.fn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new Ba(n.field,n.dir==="asc"?0:1)));return new sc(sc.UNKNOWN_ID,this.collectionId,t,Co.empty())}wn(e){for(const t of this.gn)if(this.Sn(t,e))return!0;return!1}Sn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}bn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function c_(r){var t,n;if(te(r instanceof ve||r instanceof Re,20012),r instanceof ve){if(r instanceof Ry){const i=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(s=>ve.create(r.field,"==",s)))||[];return Re.create(i,"or")}return r}const e=r.filters.map(i=>c_(i));return Re.create(e,r.op)}function FR(r){if(r.getFilters().length===0)return[];const e=wu(c_(r));return te(l_(e),7391),yu(e)||_u(e)?[e]:e.getFilters()}function yu(r){return r instanceof ve}function _u(r){return r instanceof Re&&Ed(r)}function l_(r){return yu(r)||_u(r)||function(t){if(t instanceof Re&&lu(t)){for(const n of t.getFilters())if(!yu(n)&&!_u(n))return!1;return!0}return!1}(r)}function wu(r){if(te(r instanceof ve||r instanceof Re,34018),r instanceof ve)return r;if(r.filters.length===1)return wu(r.filters[0]);const e=r.filters.map(n=>wu(n));let t=Re.create(e,r.op);return t=fc(t),l_(t)?t:(te(t instanceof Re,64498),te(is(t),40251),te(t.filters.length>1,57927),t.filters.reduce((n,i)=>xd(n,i)))}function xd(r,e){let t;return te(r instanceof ve||r instanceof Re,38388),te(e instanceof ve||e instanceof Re,25473),t=r instanceof ve?e instanceof ve?function(i,s){return Re.create([i,s],"and")}(r,e):Rp(r,e):e instanceof ve?Rp(e,r):function(i,s){if(te(i.filters.length>0&&s.filters.length>0,48005),is(i)&&is(s))return by(i,s.getFilters());const o=lu(i)?i:s,c=lu(i)?s:i,l=o.filters.map(u=>xd(u,c));return Re.create(l,"or")}(r,e),fc(t)}function Rp(r,e){if(is(e))return by(e,r.getFilters());{const t=e.filters.map(n=>xd(r,n));return Re.create(t,"or")}}function fc(r){if(te(r instanceof ve||r instanceof Re,11850),r instanceof ve)return r;const e=r.getFilters();if(e.length===1)return fc(e[0]);if(vy(r))return r;const t=e.map(i=>fc(i)),n=[];return t.forEach(i=>{i instanceof ve?n.push(i):i instanceof Re&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:Re.create(n,r.op)}/**
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
 */class UR{constructor(){this.Cn=new Dd}addToCollectionParentIndex(e,t){return this.Cn.add(t),b.resolve()}getCollectionParents(e,t){return b.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return b.resolve()}deleteFieldIndex(e,t){return b.resolve()}deleteAllFieldIndexes(e){return b.resolve()}createTargetIndexes(e,t){return b.resolve()}getDocumentsMatchingTarget(e,t){return b.resolve(null)}getIndexType(e,t){return b.resolve(0)}getFieldIndexes(e,t){return b.resolve([])}getNextCollectionGroupToUpdate(e){return b.resolve(null)}getMinOffset(e,t){return b.resolve(jt.min())}getMinOffsetFromCollectionGroup(e,t){return b.resolve(jt.min())}updateCollectionGroup(e,t,n){return b.resolve()}updateIndexEntries(e,t){return b.resolve()}}class Dd{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new Pe(Ie.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new Pe(Ie.comparator)).toArray()}}/**
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
 */const Pp="IndexedDbIndexManager",xa=new Uint8Array(0);class BR{constructor(e,t){this.databaseId=t,this.vn=new Dd,this.Fn=new Un(n=>li(n),(n,i)=>ta(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.vn.add(t)});const s={collectionId:n,parent:St(i)};return Cp(e).put(s)}return b.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[jm(t),""],!1,!0);return Cp(e).J(i).next(s=>{for(const o of s){if(o.collectionId!==t)break;n.push(wn(o.parent))}return n})}addFieldIndex(e,t){const n=Ws(e),i=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(l=>[l.fieldPath.canonicalString(),l.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=Di(e);return s.next(c=>{o.put(Ep(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=Ws(e),i=Di(e),s=xi(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Ws(e),n=xi(e),i=Di(e);return t.Z().next(()=>n.Z()).next(()=>i.Z())}createTargetIndexes(e,t){return b.forEach(this.Mn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new Sp(n).Dn();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=xi(e);let i=!0;const s=new Map;return b.forEach(this.Mn(t),o=>this.xn(e,o).next(c=>{i&&(i=!!c),s.set(o,c)})).next(()=>{if(i){let o=_e();const c=[];return b.forEach(s,(l,u)=>{q(Pp,`Using index ${function(X){return`id=${X.indexId}|cg=${X.collectionGroup}|f=${X.fields.map(de=>`${de.fieldPath}:${de.kind}`).join(",")}`}(l)} to execute ${li(t)}`);const h=function(X,de){const he=tu(de);if(he===void 0)return null;for(const ye of uc(X,he.fieldPath))switch(ye.op){case"array-contains-any":return ye.value.arrayValue.values||[];case"array-contains":return[ye.value]}return null}(u,l),p=function(X,de){const he=new Map;for(const ye of zr(de))for(const I of uc(X,ye.fieldPath))switch(I.op){case"==":case"in":he.set(ye.fieldPath.canonicalString(),I.value);break;case"not-in":case"!=":return he.set(ye.fieldPath.canonicalString(),I.value),Array.from(he.values())}return null}(u,l),g=function(X,de){const he=[];let ye=!0;for(const I of zr(de)){const y=I.kind===0?op(X,I.fieldPath,X.startAt):ap(X,I.fieldPath,X.startAt);he.push(y.value),ye&&(ye=y.inclusive)}return new vr(he,ye)}(u,l),E=function(X,de){const he=[];let ye=!0;for(const I of zr(de)){const y=I.kind===0?ap(X,I.fieldPath,X.endAt):op(X,I.fieldPath,X.endAt);he.push(y.value),ye&&(ye=y.inclusive)}return new vr(he,ye)}(u,l),N=this.On(l,u,g),V=this.On(l,u,E),O=this.Nn(l,u,p),Y=this.Bn(l.indexId,h,N,g.inclusive,V,E.inclusive,O);return b.forEach(Y,ee=>n.Y(ee,t.limit).next(X=>{X.forEach(de=>{const he=G.fromSegments(de.documentKey);o.has(he)||(o=o.add(he),c.push(he))})}))}).next(()=>c)}return b.resolve(null)})}Mn(e){let t=this.Fn.get(e);return t||(e.filters.length===0?t=[e]:t=FR(Re.create(e.filters,"and")).map(n=>du(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Fn.set(e,t),t)}Bn(e,t,n,i,s,o,c){const l=(t!=null?t.length:1)*Math.max(n.length,s.length),u=l/(t!=null?t.length:1),h=[];for(let p=0;p<l;++p){const g=t?this.Ln(t[p/u]):xa,E=this.kn(e,g,n[p%u],i),N=this.qn(e,g,s[p%u],o),V=c.map(O=>this.kn(e,g,O,!0));h.push(...this.createRange(E,N,V))}return h}kn(e,t,n,i){const s=new Qr(e,G.empty(),t,n);return i?s:s.An()}qn(e,t,n,i){const s=new Qr(e,G.empty(),t,n);return i?s.An():s}xn(e,t){const n=new Sp(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let o=null;for(const c of s)n.yn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let n=2;const i=this.Mn(t);return b.forEach(i,s=>this.xn(e,s).next(o=>{o?n!==0&&o.fields.length<function(l){let u=new Pe($e.comparator),h=!1;for(const p of l.filters)for(const g of p.getFlattenedFilters())g.field.isKeyField()||(g.op==="array-contains"||g.op==="array-contains-any"?h=!0:u=u.add(g.field));for(const p of l.orderBy)p.field.isKeyField()||(u=u.add(p.field));return u.size+(h?1:0)}(s)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&i.length>1&&n===2?1:n)}Qn(e,t){const n=new Gs;for(const i of zr(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.Pn(i.kind);Hr.Kt.Dt(s,o)}return n.un()}Ln(e){const t=new Gs;return Hr.Kt.Dt(e,t.Pn(0)),t.un()}$n(e,t){const n=new Gs;return Hr.Kt.Dt(ci(this.databaseId,t),n.Pn(function(s){const o=zr(s);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}Nn(e,t,n){if(n===null)return[];let i=[];i.push(new Gs);let s=0;for(const o of zr(e)){const c=n[s++];for(const l of i)if(this.Un(t,o.fieldPath)&&Mo(c))i=this.Kn(i,o,c);else{const u=l.Pn(o.kind);Hr.Kt.Dt(c,u)}}return this.Wn(i)}On(e,t,n){return this.Nn(e,t,n.position)}Wn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Kn(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const l=new Gs;l.seed(c.un()),Hr.Kt.Dt(o,l.Pn(t.kind)),s.push(l)}return s}Un(e,t){return!!e.filters.find(n=>n instanceof ve&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=Ws(e),i=Di(e);return(t?n.J(ru,IDBKeyRange.bound(t,t)):n.J()).next(s=>{const o=[];return b.forEach(s,c=>i.get([c.indexId,this.uid]).next(l=>{o.push(function(h,p){const g=p?new Co(p.sequenceNumber,new jt(fi(p.readTime),new G(wn(p.documentKey)),p.largestBatchId)):Co.empty(),E=h.fields.map(([N,V])=>new Ba($e.fromServerFormat(N),V));return new sc(h.indexId,h.collectionGroup,E,g)}(c,l))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:ge(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=Ws(e),s=Di(e);return this.Gn(e).next(o=>i.J(ru,IDBKeyRange.bound(t,t)).next(c=>b.forEach(c,l=>s.put(Ep(l.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return b.forEach(t,(i,s)=>{const o=n.get(i.collectionGroup);return(o?b.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next(c=>(n.set(i.collectionGroup,c),b.forEach(c,l=>this.zn(e,i,l).next(u=>{const h=this.jn(s,l);return u.isEqual(h)?b.resolve():this.Jn(e,s,l,u,h)}))))})}Hn(e,t,n,i){return xi(e).put(i.Rn(this.uid,this.$n(n,t.key),t.key))}Yn(e,t,n,i){return xi(e).delete(i.Vn(this.uid,this.$n(n,t.key),t.key))}zn(e,t,n){const i=xi(e);let s=new Pe(tr);return i.ee({index:sy,range:IDBKeyRange.only([n.indexId,this.uid,Ha(this.$n(n,t))])},(o,c)=>{s=s.add(new Qr(n.indexId,t,Ap(c.arrayValue),Ap(c.directionalValue)))}).next(()=>s)}jn(e,t){let n=new Pe(tr);const i=this.Qn(t,e);if(i==null)return n;const s=tu(t);if(s!=null){const o=e.data.field(s.fieldPath);if(Mo(o))for(const c of o.arrayValue.values||[])n=n.add(new Qr(t.indexId,e.key,this.Ln(c),i))}else n=n.add(new Qr(t.indexId,e.key,xa,i));return n}Jn(e,t,n,i,s){q(Pp,"Updating index entries for document '%s'",t.key);const o=[];return function(l,u,h,p,g){const E=l.getIterator(),N=u.getIterator();let V=Ci(E),O=Ci(N);for(;V||O;){let Y=!1,ee=!1;if(V&&O){const X=h(V,O);X<0?ee=!0:X>0&&(Y=!0)}else V!=null?ee=!0:Y=!0;Y?(p(O),O=Ci(N)):ee?(g(V),V=Ci(E)):(V=Ci(E),O=Ci(N))}}(i,s,tr,c=>{o.push(this.Hn(e,t,n,c))},c=>{o.push(this.Yn(e,t,n,c))}),b.waitFor(o)}Gn(e){let t=1;return Di(e).ee({index:iy,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,c)=>tr(o,c)).filter((o,c,l)=>!c||tr(o,l[c-1])!==0);const i=[];i.push(e);for(const o of n){const c=tr(o,e),l=tr(o,t);if(c===0)i[0]=e.An();else if(c>0&&l<0)i.push(o),i.push(o.An());else if(l>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Zn(i[o],i[o+1]))return[];const c=i[o].Vn(this.uid,xa,G.empty()),l=i[o+1].Vn(this.uid,xa,G.empty());s.push(IDBKeyRange.bound(c,l))}return s}Zn(e,t){return tr(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(kp)}getMinOffset(e,t){return b.mapArray(this.Mn(t),n=>this.xn(e,n).next(i=>i||J(44426))).next(kp)}}function Cp(r){return ct(r,No)}function xi(r){return ct(r,po)}function Ws(r){return ct(r,gd)}function Di(r){return ct(r,fo)}function kp(r){te(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;hd(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new jt(e.readTime,e.documentKey,t)}/**
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
 */const xp={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},u_=41943040;class bt{static withCacheSize(e){return new bt(e,bt.DEFAULT_COLLECTION_PERCENTILE,bt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function d_(r,e,t){const n=r.store(Zt),i=r.store(Xi),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const l=n.ee({range:o},(h,p,g)=>(c++,g.delete()));s.push(l.next(()=>{te(c===1,47070,{batchId:t.batchId})}));const u=[];for(const h of t.mutations){const p=ty(e,h.key.path,t.batchId);s.push(i.delete(p)),u.push(h.key)}return b.waitFor(s).next(()=>u)}function pc(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw J(14731);e=r.noDocument}return JSON.stringify(e).length}/**
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
 */bt.DEFAULT_COLLECTION_PERCENTILE=10,bt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,bt.DEFAULT=new bt(u_,bt.DEFAULT_COLLECTION_PERCENTILE,bt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),bt.DISABLED=new bt(-1,0,0);class Gc{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Xn={}}static wt(e,t,n,i){te(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new Gc(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return nr(e).ee({index:Xr,range:n},(i,s,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=Fi(e),o=nr(e);return o.add({}).next(c=>{te(typeof c=="number",49019);const l=new Ad(c,t,n,i),u=function(E,N,V){const O=V.baseMutations.map(ee=>Uo(E.yt,ee)),Y=V.mutations.map(ee=>Uo(E.yt,ee));return{userId:N,batchId:V.batchId,localWriteTimeMs:V.localWriteTime.toMillis(),baseMutations:O,mutations:Y}}(this.serializer,this.userId,l),h=[];let p=new Pe((g,E)=>ge(g.canonicalString(),E.canonicalString()));for(const g of i){const E=ty(this.userId,g.key.path,c);p=p.add(g.key.path.popLast()),h.push(o.put(u)),h.push(s.put(E,ES))}return p.forEach(g=>{h.push(this.indexManager.addToCollectionParentIndex(e,g))}),e.addOnCommittedListener(()=>{this.Xn[c]=l.keys()}),b.waitFor(h).next(()=>l)})}lookupMutationBatch(e,t){return nr(e).get(t).next(n=>n?(te(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),Wr(this.serializer,n)):null)}er(e,t){return this.Xn[t]?b.resolve(this.Xn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Xn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return nr(e).ee({index:Xr,range:i},(o,c,l)=>{c.userId===this.userId&&(te(c.batchId>=n,47524,{tr:n}),s=Wr(this.serializer,c)),l.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=hr;return nr(e).ee({index:Xr,range:t,reverse:!0},(i,s,o)=>{n=s.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,hr],[this.userId,Number.POSITIVE_INFINITY]);return nr(e).J(Xr,t).next(n=>n.map(i=>Wr(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=$a(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return Fi(e).ee({range:i},(o,c,l)=>{const[u,h,p]=o,g=wn(h);if(u===this.userId&&t.path.isEqual(g))return nr(e).get(p).next(E=>{if(!E)throw J(61480,{nr:o,batchId:p});te(E.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:E.userId,batchId:p}),s.push(Wr(this.serializer,E))});l.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new Pe(ge);const i=[];return t.forEach(s=>{const o=$a(this.userId,s.path),c=IDBKeyRange.lowerBound(o),l=Fi(e).ee({range:c},(u,h,p)=>{const[g,E,N]=u,V=wn(E);g===this.userId&&s.path.isEqual(V)?n=n.add(N):p.done()});i.push(l)}),b.waitFor(i).next(()=>this.rr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=$a(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new Pe(ge);return Fi(e).ee({range:o},(l,u,h)=>{const[p,g,E]=l,N=wn(g);p===this.userId&&n.isPrefixOf(N)?N.length===i&&(c=c.add(E)):h.done()}).next(()=>this.rr(e,c))}rr(e,t){const n=[],i=[];return t.forEach(s=>{i.push(nr(e).get(s).next(o=>{if(o===null)throw J(35274,{batchId:s});te(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(Wr(this.serializer,o))}))}),b.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return d_(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.ir(t.batchId)}),b.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}ir(e){delete this.Xn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return b.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),i=[];return Fi(e).ee({range:n},(s,o,c)=>{if(s[0]===this.userId){const l=wn(s[1]);i.push(l)}else c.done()}).next(()=>{te(i.length===0,56720,{sr:i.map(s=>s.canonicalString())})})})}containsKey(e,t){return h_(e,this.userId,t)}_r(e){return f_(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:hr,lastStreamToken:""})}}function h_(r,e,t){const n=$a(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return Fi(r).ee({range:s,X:!0},(c,l,u)=>{const[h,p,g]=c;h===e&&p===i&&(o=!0),u.done()}).next(()=>o)}function nr(r){return ct(r,Zt)}function Fi(r){return ct(r,Xi)}function f_(r){return ct(r,xo)}/**
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
 */class pi{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new pi(0)}static cr(){return new pi(-1)}}/**
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
 */class $R{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.lr(e).next(t=>{const n=new pi(t.highestTargetId);return t.highestTargetId=n.next(),this.hr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.lr(e).next(t=>ie.fromTimestamp(new Se(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.lr(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.lr(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.hr(e,i)))}addTargetData(e,t){return this.Pr(e,t).next(()=>this.lr(e).next(n=>(n.targetCount+=1,this.Tr(t,n),this.hr(e,n))))}updateTargetData(e,t){return this.Pr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Ni(e).delete(t.targetId)).next(()=>this.lr(e)).next(n=>(te(n.targetCount>0,8065),n.targetCount-=1,this.hr(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return Ni(e).ee((o,c)=>{const l=no(c);l.sequenceNumber<=t&&n.get(l.targetId)===null&&(i++,s.push(this.removeTargetData(e,l)))}).next(()=>b.waitFor(s)).next(()=>i)}forEachTarget(e,t){return Ni(e).ee((n,i)=>{const s=no(i);t(s)})}lr(e){return Dp(e).get(cc).next(t=>(te(t!==null,2888),t))}hr(e,t){return Dp(e).put(cc,t)}Pr(e,t){return Ni(e).put(a_(this.serializer,t))}Tr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.lr(e).next(t=>t.targetCount)}getTargetData(e,t){const n=li(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return Ni(e).ee({range:i,index:ry},(o,c,l)=>{const u=no(c);ta(t,u.target)&&(s=u,l.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=sr(e);return t.forEach(o=>{const c=St(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))}),b.waitFor(i)}removeMatchingKeys(e,t,n){const i=sr(e);return b.forEach(t,s=>{const o=St(s.path);return b.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=sr(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=sr(e);let s=_e();return i.ee({range:n,X:!0},(o,c,l)=>{const u=wn(o[1]),h=new G(u);s=s.add(h)}).next(()=>s)}containsKey(e,t){const n=St(t.path),i=IDBKeyRange.bound([n],[jm(n)],!1,!0);let s=0;return sr(e).ee({index:pd,X:!0,range:i},([o,c],l,u)=>{o!==0&&(s++,u.done())}).next(()=>s>0)}At(e,t){return Ni(e).get(t).next(n=>n?no(n):null)}}function Ni(r){return ct(r,Zi)}function Dp(r){return ct(r,ii)}function sr(r){return ct(r,es)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Np="LruGarbageCollector",qR=1048576;function Vp([r,e],[t,n]){const i=ge(r,t);return i===0?ge(e,n):i}class KR{constructor(e){this.Ir=e,this.buffer=new Pe(Vp),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();Vp(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class p_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){q(Np,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Cr(t)?q(Np,"Ignoring IndexedDB error during garbage collection: ",t):await Pr(t)}await this.Vr(3e5)})}}class zR{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return b.resolve(Mt.ce);const n=new KR(t);return this.mr.forEachTarget(e,i=>n.Ar(i.sequenceNumber)).next(()=>this.mr.pr(e,i=>n.Ar(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.mr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(q("LruGarbageCollector","Garbage collection skipped; disabled"),b.resolve(xp)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(q("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),xp):this.yr(e,t))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let n,i,s,o,c,l,u;const h=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?(q("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i))).next(p=>(n=p,c=Date.now(),this.removeTargets(e,n,t))).next(p=>(s=p,l=Date.now(),this.removeOrphanedDocuments(e,n))).next(p=>(u=Date.now(),Vi()<=Ee.DEBUG&&q("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-h}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(l-c)+`ms
	Removed ${p} documents in `+(u-l)+`ms
Total Duration: ${u-h}ms`),b.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p})))}}function g_(r,e){return new zR(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jR{constructor(e,t){this.db=e,this.garbageCollector=g_(this,t)}gr(e){const t=this.wr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}pr(e,t){return this.Sr(e,(n,i)=>t(i))}addReference(e,t,n){return Da(e,n)}removeReference(e,t,n){return Da(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return Da(e,t)}br(e,t){return function(i,s){let o=!1;return f_(i).te(c=>h_(i,c,s).next(l=>(l&&(o=!0),b.resolve(!l)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.Sr(e,(o,c)=>{if(c<=t){const l=this.br(e,o).next(u=>{if(!u)return s++,n.getEntry(e,o).next(()=>(n.removeEntry(o,ie.min()),sr(e).delete(function(p){return[0,St(p.path)]}(o))))});i.push(l)}}).next(()=>b.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return Da(e,t)}Sr(e,t){const n=sr(e);let i,s=Mt.ce;return n.ee({index:pd},([o,c],{path:l,sequenceNumber:u})=>{o===0?(s!==Mt.ce&&t(new G(wn(i)),s),s=u,i=l):s=Mt.ce}).next(()=>{s!==Mt.ce&&t(new G(wn(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Da(r,e){return sr(r).put(function(n,i){return{targetId:0,path:St(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
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
 */class m_{constructor(){this.changes=new Un(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,Me.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?b.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
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
 */class GR{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return qr(e).put(n)}removeEntry(e,t,n){return qr(e).delete(function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],hc(o),c[c.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Dr(e,n)))}getEntry(e,t){let n=Me.newInvalidDocument(t);return qr(e).ee({index:qa,range:IDBKeyRange.only(Hs(t))},(i,s)=>{n=this.Cr(t,s)}).next(()=>n)}vr(e,t){let n={size:0,document:Me.newInvalidDocument(t)};return qr(e).ee({index:qa,range:IDBKeyRange.only(Hs(t))},(i,s)=>{n={document:this.Cr(t,s),size:pc(s)}}).next(()=>n)}getEntries(e,t){let n=Ft();return this.Fr(e,t,(i,s)=>{const o=this.Cr(i,s);n=n.insert(i,o)}).next(()=>n)}Mr(e,t){let n=Ft(),i=new Ne(G.comparator);return this.Fr(e,t,(s,o)=>{const c=this.Cr(s,o);n=n.insert(s,c),i=i.insert(s,pc(o))}).next(()=>({documents:n,Or:i}))}Fr(e,t,n){if(t.isEmpty())return b.resolve();let i=new Pe(Lp);t.forEach(l=>i=i.add(l));const s=IDBKeyRange.bound(Hs(i.first()),Hs(i.last())),o=i.getIterator();let c=o.getNext();return qr(e).ee({index:qa,range:s},(l,u,h)=>{const p=G.fromSegments([...u.prefixPath,u.collectionGroup,u.documentId]);for(;c&&Lp(c,p)<0;)n(c,null),c=o.getNext();c&&c.isEqual(p)&&(n(c,u),c=o.hasNext()?o.getNext():null),c?h.j(Hs(c)):h.done()}).next(()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),hc(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],l=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return qr(e).J(IDBKeyRange.bound(c,l,!0)).next(u=>{s==null||s.incrementDocumentReadCount(u.length);let h=Ft();for(const p of u){const g=this.Cr(G.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);g.isFoundDocument()&&(ra(t,g)||i.has(g.key))&&(h=h.insert(g.key,g))}return h})}getAllFromCollectionGroup(e,t,n,i){let s=Ft();const o=Mp(t,n),c=Mp(t,jt.max());return qr(e).ee({index:ny,range:IDBKeyRange.bound(o,c,!0)},(l,u,h)=>{const p=this.Cr(G.fromSegments(u.prefixPath.concat(u.collectionGroup,u.documentId)),u);s=s.insert(p.key,p),s.size===i&&h.done()}).next(()=>s)}newChangeBuffer(e){return new WR(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Op(e).get(nu).next(t=>(te(!!t,20021),t))}Dr(e,t){return Op(e).put(nu,t)}Cr(e,t){if(t){const n=xR(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(ie.min())))return n}return Me.newInvalidDocument(e)}}function y_(r){return new GR(r)}class WR extends m_{constructor(e,t){super(),this.Nr=e,this.trackRemovals=t,this.Br=new Un(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new Pe((s,o)=>ge(s.canonicalString(),o.canonicalString()));return this.changes.forEach((s,o)=>{const c=this.Br.get(s);if(t.push(this.Nr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const l=_p(this.Nr.serializer,o);i=i.add(s.path.popLast());const u=pc(l);n+=u-c.size,t.push(this.Nr.addEntry(e,s,l))}else if(n-=c.size,this.trackRemovals){const l=_p(this.Nr.serializer,o.convertToNoDocument(ie.min()));t.push(this.Nr.addEntry(e,s,l))}}),i.forEach(s=>{t.push(this.Nr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.Nr.updateMetadata(e,n)),b.waitFor(t)}getFromCache(e,t){return this.Nr.vr(e,t).next(n=>(this.Br.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Nr.Mr(e,t).next(({documents:n,Or:i})=>(i.forEach((s,o)=>{this.Br.set(s,{size:o,readTime:n.get(s).readTime})}),n))}}function Op(r){return ct(r,Do)}function qr(r){return ct(r,ac)}function Hs(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Mp(r,e){const t=e.documentKey.path.toArray();return[r,hc(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function Lp(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=ge(t[s],n[s]),i)return i;return i=ge(t.length,n.length),i||(i=ge(t[t.length-2],n[n.length-2]),i||ge(t[t.length-1],n[n.length-1]))}/**
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
 */class HR{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
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
 */class __{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&yo(n.mutation,i,Lt.empty(),Se.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,_e()).next(()=>n))}getLocalViewOfDocuments(e,t,n=_e()){const i=En();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let o=eo();return s.forEach((c,l)=>{o=o.insert(c,l.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=En();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,_e()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,n,i){let s=Ft();const o=mo(),c=function(){return mo()}();return t.forEach((l,u)=>{const h=n.get(u.key);i.has(u.key)&&(h===void 0||h.mutation instanceof Bn)?s=s.insert(u.key,u):h!==void 0?(o.set(u.key,h.mutation.getFieldMask()),yo(h.mutation,u,h.mutation.getFieldMask(),Se.now())):o.set(u.key,Lt.empty())}),this.recalculateAndSaveOverlays(e,s).next(l=>(l.forEach((u,h)=>o.set(u,h)),t.forEach((u,h)=>c.set(u,new HR(h,o.get(u)??null))),c))}recalculateAndSaveOverlays(e,t){const n=mo();let i=new Ne((o,c)=>o-c),s=_e();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(l=>{const u=t.get(l);if(u===null)return;let h=n.get(l)||Lt.empty();h=c.applyToLocalView(u,h),n.set(l,h);const p=(i.get(c.batchId)||_e()).add(l);i=i.insert(c.batchId,p)})}).next(()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const l=c.getNext(),u=l.key,h=l.value,p=Vy();h.forEach(g=>{if(!s.has(g)){const E=$y(t.get(g),n.get(g));E!==null&&p.set(g,E),s=s.add(g)}}),o.push(this.documentOverlayCache.saveOverlays(e,u,p))}return b.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(o){return G.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Id(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):b.resolve(En());let c=Ji,l=s;return o.next(u=>b.forEach(u,(h,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(h)?b.resolve():this.remoteDocumentCache.getEntry(e,h).next(g=>{l=l.insert(h,g)}))).next(()=>this.populateOverlays(e,u,s)).next(()=>this.computeViews(e,l,u,_e())).next(h=>({batchId:c,changes:Ny(h)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new G(t)).next(n=>{let i=eo();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=eo();return this.indexManager.getCollectionParents(e,s).next(c=>b.forEach(c,l=>{const u=function(p,g){return new Fn(g,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,l.child(s));return this.getDocumentsMatchingCollectionQuery(e,u,n,i).next(h=>{h.forEach((p,g)=>{o=o.insert(p,g)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(o=>{s.forEach((l,u)=>{const h=u.getKey();o.get(h)===null&&(o=o.insert(h,Me.newInvalidDocument(h)))});let c=eo();return o.forEach((l,u)=>{const h=s.get(l);h!==void 0&&yo(h.mutation,u,Lt.empty(),Se.now()),ra(t,u)&&(c=c.insert(l,u))}),c})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class QR{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return b.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:Je(i.createTime)}}(t)),b.resolve()}getNamedQuery(e,t){return b.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,function(i){return{name:i.name,query:kd(i.bundledQuery),readTime:Je(i.readTime)}}(t)),b.resolve()}}/**
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
 */class YR{constructor(){this.overlays=new Ne(G.comparator),this.qr=new Map}getOverlay(e,t){return b.resolve(this.overlays.get(t))}getOverlays(e,t){const n=En();return b.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.St(e,t,s)}),b.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.qr.delete(n)),b.resolve()}getOverlaysForCollection(e,t,n){const i=En(),s=t.length+1,o=new G(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const l=c.getNext().value,u=l.getKey();if(!t.isPrefixOf(u.path))break;u.path.length===s&&l.largestBatchId>n&&i.set(l.getKey(),l)}return b.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new Ne((u,h)=>u-h);const o=this.overlays.getIterator();for(;o.hasNext();){const u=o.getNext().value;if(u.getKey().getCollectionGroup()===t&&u.largestBatchId>n){let h=s.get(u.largestBatchId);h===null&&(h=En(),s=s.insert(u.largestBatchId,h)),h.set(u.getKey(),u)}}const c=En(),l=s.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((u,h)=>c.set(u,h)),!(c.size()>=i)););return b.resolve(c)}St(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Rd(t,n));let s=this.qr.get(t);s===void 0&&(s=_e(),this.qr.set(t,s)),this.qr.set(t,s.add(n.key))}}/**
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
 */class JR{constructor(){this.sessionToken=We.EMPTY_BYTE_STRING}getSessionToken(e){return b.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,b.resolve()}}/**
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
 */class Nd{constructor(){this.Qr=new Pe(ft.$r),this.Ur=new Pe(ft.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const n=new ft(e,t);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Gr(new ft(e,t))}zr(e,t){e.forEach(n=>this.removeReference(n,t))}jr(e){const t=new G(new Ie([])),n=new ft(t,e),i=new ft(t,e+1),s=[];return this.Ur.forEachInRange([n,i],o=>{this.Gr(o),s.push(o.key)}),s}Jr(){this.Qr.forEach(e=>this.Gr(e))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new G(new Ie([])),n=new ft(t,e),i=new ft(t,e+1);let s=_e();return this.Ur.forEachInRange([n,i],o=>{s=s.add(o.key)}),s}containsKey(e){const t=new ft(e,0),n=this.Qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class ft{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return G.comparator(e.key,t.key)||ge(e.Yr,t.Yr)}static Kr(e,t){return ge(e.Yr,t.Yr)||G.comparator(e.key,t.key)}}/**
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
 */class XR{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new Pe(ft.$r)}checkEmpty(e){return b.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Ad(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Zr=this.Zr.add(new ft(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return b.resolve(o)}lookupMutationBatch(e,t){return b.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.ei(n),s=i<0?0:i;return b.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return b.resolve(this.mutationQueue.length===0?hr:this.tr-1)}getAllMutationBatches(e){return b.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new ft(t,0),i=new ft(t,Number.POSITIVE_INFINITY),s=[];return this.Zr.forEachInRange([n,i],o=>{const c=this.Xr(o.Yr);s.push(c)}),b.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new Pe(ge);return t.forEach(i=>{const s=new ft(i,0),o=new ft(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([s,o],c=>{n=n.add(c.Yr)})}),b.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;G.isDocumentKey(s)||(s=s.child(""));const o=new ft(new G(s),0);let c=new Pe(ge);return this.Zr.forEachWhile(l=>{const u=l.key.path;return!!n.isPrefixOf(u)&&(u.length===i&&(c=c.add(l.Yr)),!0)},o),b.resolve(this.ti(c))}ti(e){const t=[];return e.forEach(n=>{const i=this.Xr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){te(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return b.forEach(t.mutations,i=>{const s=new ft(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.Zr=n})}ir(e){}containsKey(e,t){const n=new ft(t,0),i=this.Zr.firstAfterOrEqual(n);return b.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,b.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
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
 */class ZR{constructor(e){this.ri=e,this.docs=function(){return new Ne(G.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ri(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return b.resolve(n?n.document.mutableCopy():Me.newInvalidDocument(t))}getEntries(e,t){let n=Ft();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():Me.newInvalidDocument(i))}),b.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=Ft();const o=t.path,c=new G(o.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:u,value:{document:h}}=l.getNext();if(!o.isPrefixOf(u.path))break;u.path.length>o.length+1||hd(Ym(h),n)<=0||(i.has(h.key)||ra(t,h))&&(s=s.insert(h.key,h.mutableCopy()))}return b.resolve(s)}getAllFromCollectionGroup(e,t,n,i){J(9500)}ii(e,t){return b.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new eP(this)}getSize(e){return b.resolve(this.size)}}class eP extends m_{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.Nr.addEntry(e,i)):this.Nr.removeEntry(n)}),b.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
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
 */class tP{constructor(e){this.persistence=e,this.si=new Un(t=>li(t),ta),this.lastRemoteSnapshotVersion=ie.min(),this.highestTargetId=0,this.oi=0,this._i=new Nd,this.targetCount=0,this.ai=pi.ur()}forEachTarget(e,t){return this.si.forEach((n,i)=>t(i)),b.resolve()}getLastRemoteSnapshotVersion(e){return b.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return b.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),b.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.oi&&(this.oi=t),b.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new pi(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,b.resolve()}updateTargetData(e,t){return this.Pr(t),b.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,b.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.si.forEach((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.si.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)}),b.waitFor(s).next(()=>i)}getTargetCount(e){return b.resolve(this.targetCount)}getTargetData(e,t){const n=this.si.get(t)||null;return b.resolve(n)}addMatchingKeys(e,t,n){return this._i.Wr(t,n),b.resolve()}removeMatchingKeys(e,t,n){this._i.zr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),b.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),b.resolve()}getMatchingKeysForTargetId(e,t){const n=this._i.Hr(t);return b.resolve(n)}containsKey(e,t){return b.resolve(this._i.containsKey(t))}}/**
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
 */class Vd{constructor(e,t){this.ui={},this.overlays={},this.ci=new Mt(0),this.li=!1,this.li=!0,this.hi=new JR,this.referenceDelegate=e(this),this.Pi=new tP(this),this.indexManager=new UR,this.remoteDocumentCache=function(i){return new ZR(i)}(n=>this.referenceDelegate.Ti(n)),this.serializer=new o_(t),this.Ii=new QR(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new YR,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ui[e.toKey()];return n||(n=new XR(t,this.referenceDelegate),this.ui[e.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,n){q("MemoryPersistence","Starting transaction:",e);const i=new nP(this.ci.next());return this.referenceDelegate.Ei(),n(i).next(s=>this.referenceDelegate.di(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Ai(e,t){return b.or(Object.values(this.ui).map(n=>()=>n.containsKey(e,t)))}}class nP extends Xm{constructor(e){super(),this.currentSequenceNumber=e}}class Wc{constructor(e){this.persistence=e,this.Ri=new Nd,this.Vi=null}static mi(e){return new Wc(e)}get fi(){if(this.Vi)return this.Vi;throw J(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.fi.delete(n.toString()),b.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.fi.add(n.toString()),b.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),b.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(i=>this.fi.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.fi.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return b.forEach(this.fi,n=>{const i=G.fromPath(n);return this.gi(e,i).next(s=>{s||t.removeEntry(i,ie.min())})}).next(()=>(this.Vi=null,t.apply(e)))}updateLimboDocument(e,t){return this.gi(e,t).next(n=>{n?this.fi.delete(t.toString()):this.fi.add(t.toString())})}Ti(e){return 0}gi(e,t){return b.or([()=>b.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class gc{constructor(e,t){this.persistence=e,this.pi=new Un(n=>St(n.path),(n,i)=>n.isEqual(i)),this.garbageCollector=g_(this,t)}static mi(e,t){return new gc(e,t)}Ei(){}di(e){return b.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}pr(e,t){return b.forEach(this.pi,(n,i)=>this.br(e,n,i).next(s=>s?b.resolve():t(i)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ii(e,o=>this.br(e,o,t).next(c=>{c||(n++,s.removeEntry(o,ie.min()))})).next(()=>s.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),b.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),b.resolve()}removeReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),b.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),b.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=za(e.data.value)),t}br(e,t,n){return b.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.pi.get(t);return b.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rP{constructor(e){this.serializer=e}k(e,t,n,i){const s=new Mc("createOrUpgrade",t);n<1&&i>=1&&(function(l){l.createObjectStore(ea)}(e),function(l){l.createObjectStore(xo,{keyPath:wS}),l.createObjectStore(Zt,{keyPath:Hf,autoIncrement:!0}).createIndex(Xr,Qf,{unique:!0}),l.createObjectStore(Xi)}(e),Fp(e),function(l){l.createObjectStore(jr)}(e));let o=b.resolve();return n<3&&i>=3&&(n!==0&&(function(l){l.deleteObjectStore(es),l.deleteObjectStore(Zi),l.deleteObjectStore(ii)}(e),Fp(e)),o=o.next(()=>function(l){const u=l.store(ii),h={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:ie.min().toTimestamp(),targetCount:0};return u.put(cc,h)}(s))),n<4&&i>=4&&(n!==0&&(o=o.next(()=>function(l,u){return u.store(Zt).J().next(p=>{l.deleteObjectStore(Zt),l.createObjectStore(Zt,{keyPath:Hf,autoIncrement:!0}).createIndex(Xr,Qf,{unique:!0});const g=u.store(Zt),E=p.map(N=>g.put(N));return b.waitFor(E)})}(e,s))),o=o.next(()=>{(function(l){l.createObjectStore(ts,{keyPath:PS})})(e)})),n<5&&i>=5&&(o=o.next(()=>this.yi(s))),n<6&&i>=6&&(o=o.next(()=>(function(l){l.createObjectStore(Do)}(e),this.wi(s)))),n<7&&i>=7&&(o=o.next(()=>this.Si(s))),n<8&&i>=8&&(o=o.next(()=>this.bi(e,s))),n<9&&i>=9&&(o=o.next(()=>{(function(l){l.objectStoreNames.contains("remoteDocumentChanges")&&l.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(o=o.next(()=>this.Di(s))),n<11&&i>=11&&(o=o.next(()=>{(function(l){l.createObjectStore(Lc,{keyPath:CS})})(e),function(l){l.createObjectStore(Fc,{keyPath:kS})}(e)})),n<12&&i>=12&&(o=o.next(()=>{(function(l){const u=l.createObjectStore(Uc,{keyPath:LS});u.createIndex(iu,FS,{unique:!1}),u.createIndex(oy,US,{unique:!1})})(e)})),n<13&&i>=13&&(o=o.next(()=>function(l){const u=l.createObjectStore(ac,{keyPath:IS});u.createIndex(qa,vS),u.createIndex(ny,TS)}(e)).next(()=>this.Ci(e,s)).next(()=>e.deleteObjectStore(jr))),n<14&&i>=14&&(o=o.next(()=>this.Fi(e,s))),n<15&&i>=15&&(o=o.next(()=>function(l){l.createObjectStore(gd,{keyPath:xS,autoIncrement:!0}).createIndex(ru,DS,{unique:!1}),l.createObjectStore(fo,{keyPath:NS}).createIndex(iy,VS,{unique:!1}),l.createObjectStore(po,{keyPath:OS}).createIndex(sy,MS,{unique:!1})}(e))),n<16&&i>=16&&(o=o.next(()=>{t.objectStore(fo).clear()}).next(()=>{t.objectStore(po).clear()})),n<17&&i>=17&&(o=o.next(()=>{(function(l){l.createObjectStore(md,{keyPath:BS})})(e)})),n<18&&i>=18&&Ig()&&(o=o.next(()=>{t.objectStore(fo).clear()}).next(()=>{t.objectStore(po).clear()})),o}wi(e){let t=0;return e.store(jr).ee((n,i)=>{t+=pc(i)}).next(()=>{const n={byteSize:t};return e.store(Do).put(nu,n)})}yi(e){const t=e.store(xo),n=e.store(Zt);return t.J().next(i=>b.forEach(i,s=>{const o=IDBKeyRange.bound([s.userId,hr],[s.userId,s.lastAcknowledgedBatchId]);return n.J(Xr,o).next(c=>b.forEach(c,l=>{te(l.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:l.batchId});const u=Wr(this.serializer,l);return d_(e,s.userId,u).next(()=>{})}))}))}Si(e){const t=e.store(es),n=e.store(jr);return e.store(ii).get(cc).next(i=>{const s=[];return n.ee((o,c)=>{const l=new Ie(o),u=function(p){return[0,St(p)]}(l);s.push(t.get(u).next(h=>h?b.resolve():(p=>t.put({targetId:0,path:St(p),sequenceNumber:i.highestListenSequenceNumber}))(l)))}).next(()=>b.waitFor(s))})}bi(e,t){e.createObjectStore(No,{keyPath:RS});const n=t.store(No),i=new Dd,s=o=>{if(i.add(o)){const c=o.lastSegment(),l=o.popLast();return n.put({collectionId:c,parent:St(l)})}};return t.store(jr).ee({X:!0},(o,c)=>{const l=new Ie(o);return s(l.popLast())}).next(()=>t.store(Xi).ee({X:!0},([o,c,l],u)=>{const h=wn(c);return s(h.popLast())}))}Di(e){const t=e.store(Zi);return t.ee((n,i)=>{const s=no(i),o=a_(this.serializer,s);return t.put(o)})}Ci(e,t){const n=t.store(jr),i=[];return n.ee((s,o)=>{const c=t.store(ac),l=function(p){return p.document?new G(Ie.fromString(p.document.name).popFirst(5)):p.noDocument?G.fromSegments(p.noDocument.path):p.unknownDocument?G.fromSegments(p.unknownDocument.path):J(36783)}(o).path.toArray(),u={prefixPath:l.slice(0,l.length-2),collectionGroup:l[l.length-2],documentId:l[l.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(u))}).next(()=>b.waitFor(i))}Fi(e,t){const n=t.store(Zt),i=y_(this.serializer),s=new Vd(Wc.mi,this.serializer.yt);return n.J().next(o=>{const c=new Map;return o.forEach(l=>{let u=c.get(l.userId)??_e();Wr(this.serializer,l).keys().forEach(h=>u=u.add(h)),c.set(l.userId,u)}),b.forEach(c,(l,u)=>{const h=new pt(u),p=jc.wt(this.serializer,h),g=s.getIndexManager(h),E=Gc.wt(h,this.serializer,g,s.referenceDelegate);return new __(i,E,p,g).recalculateAndSaveOverlaysForDocumentKeys(new su(t,Mt.ce),l).next()})})}}function Fp(r){r.createObjectStore(es,{keyPath:AS}).createIndex(pd,SS,{unique:!0}),r.createObjectStore(Zi,{keyPath:"targetId"}).createIndex(ry,bS,{unique:!0}),r.createObjectStore(ii)}const rr="IndexedDbPersistence",Vl=18e5,Ol=5e3,Ml="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",w_="main";class Od{constructor(e,t,n,i,s,o,c,l,u,h,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Mi=s,this.window=o,this.document=c,this.xi=u,this.Oi=h,this.Ni=p,this.ci=null,this.li=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Bi=null,this.inForeground=!1,this.Li=null,this.ki=null,this.qi=Number.NEGATIVE_INFINITY,this.Qi=g=>Promise.resolve(),!Od.v())throw new $(C.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new jR(this,i),this.$i=t+w_,this.serializer=new o_(l),this.Ui=new In(this.$i,this.Ni,new rP(this.serializer)),this.hi=new NR,this.Pi=new $R(this.referenceDelegate,this.serializer),this.remoteDocumentCache=y_(this.serializer),this.Ii=new DR,this.window&&this.window.localStorage?this.Ki=this.window.localStorage:(this.Ki=null,h===!1&&Ye(rr,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Wi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new $(C.FAILED_PRECONDITION,Ml);return this.Gi(),this.zi(),this.ji(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Pi.getHighestSequenceNumber(e))}).then(e=>{this.ci=new Mt(e,this.xi)}).then(()=>{this.li=!0}).catch(e=>(this.Ui&&this.Ui.close(),Promise.reject(e)))}Ji(e){return this.Qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ui.$(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Mi.enqueueAndForget(async()=>{this.started&&await this.Wi()}))}Wi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>Na(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Hi(e).next(t=>{t||(this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)))})}).next(()=>this.Yi(e)).next(t=>this.isPrimary&&!t?this.Zi(e).next(()=>!1):!!t&&this.Xi(e).next(()=>!0))).catch(e=>{if(Cr(e))return q(rr,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return q(rr,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Mi.enqueueRetryable(()=>this.Qi(e)),this.isPrimary=e})}Hi(e){return Qs(e).get(Pi).next(t=>b.resolve(this.es(t)))}ts(e){return Na(e).delete(this.clientId)}async ns(){if(this.isPrimary&&!this.rs(this.qi,Vl)){this.qi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=ct(t,ts);return n.J().next(i=>{const s=this.ss(i,Vl),o=i.filter(c=>s.indexOf(c)===-1);return b.forEach(o,c=>n.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ki)for(const t of e)this.Ki.removeItem(this._s(t.clientId))}}ji(){this.ki=this.Mi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Wi().then(()=>this.ns()).then(()=>this.ji()))}es(e){return!!e&&e.ownerId===this.clientId}Yi(e){return this.Oi?b.resolve(!0):Qs(e).get(Pi).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Ol)&&!this.us(t.ownerId)){if(this.es(t)&&this.networkEnabled)return!0;if(!this.es(t)){if(!t.allowTabSynchronization)throw new $(C.FAILED_PRECONDITION,Ml);return!1}}return!(!this.networkEnabled||!this.inForeground)||Na(e).J().next(n=>this.ss(n,Ol).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&q(rr,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.li=!1,this.cs(),this.ki&&(this.ki.cancel(),this.ki=null),this.ls(),this.hs(),await this.Ui.runTransaction("shutdown","readwrite",[ea,ts],e=>{const t=new su(e,Mt.ce);return this.Zi(t).next(()=>this.ts(t))}),this.Ui.close(),this.Ps()}ss(e,t){return e.filter(n=>this.rs(n.updateTimeMs,t)&&!this.us(n.clientId))}Ts(){return this.runTransaction("getActiveClients","readonly",e=>Na(e).J().next(t=>this.ss(t,Vl).map(n=>n.clientId)))}get started(){return this.li}getGlobalsCache(){return this.hi}getMutationQueue(e,t){return Gc.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new BR(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return jc.wt(this.serializer,e)}getBundleCache(){return this.Ii}runTransaction(e,t,n){q(rr,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(l){return l===18?KS:l===17?uy:l===16?qS:l===15?yd:l===14?ly:l===13?cy:l===12?$S:l===11?ay:void J(60245)}(this.Ni);let o;return this.Ui.runTransaction(e,i,s,c=>(o=new su(c,this.ci?this.ci.next():Mt.ce),t==="readwrite-primary"?this.Hi(o).next(l=>!!l||this.Yi(o)).next(l=>{if(!l)throw Ye(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)),new $(C.FAILED_PRECONDITION,Jm);return n(o)}).next(l=>this.Xi(o).next(()=>l)):this.Is(o).next(()=>n(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Is(e){return Qs(e).get(Pi).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Ol)&&!this.us(t.ownerId)&&!this.es(t)&&!(this.Oi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new $(C.FAILED_PRECONDITION,Ml)})}Xi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Qs(e).put(Pi,t)}static v(){return In.v()}Zi(e){const t=Qs(e);return t.get(Pi).next(n=>this.es(n)?(q(rr,"Releasing primary lease."),t.delete(Pi)):b.resolve())}rs(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Ye(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Gi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Li=()=>{this.Mi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Wi()))},this.document.addEventListener("visibilitychange",this.Li),this.inForeground=this.document.visibilityState==="visible")}ls(){this.Li&&(this.document.removeEventListener("visibilitychange",this.Li),this.Li=null)}zi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Bi=()=>{this.cs();const t=/(?:Version|Mobile)\/1[456]/;Eg()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Mi.enterRestrictedMode(!0),this.Mi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Bi))}hs(){this.Bi&&(this.window.removeEventListener("pagehide",this.Bi),this.Bi=null)}us(e){var t;try{const n=((t=this.Ki)==null?void 0:t.getItem(this._s(e)))!==null;return q(rr,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return Ye(rr,"Failed to get zombied client id.",n),!1}}cs(){if(this.Ki)try{this.Ki.setItem(this._s(this.clientId),String(Date.now()))}catch(e){Ye("Failed to set zombie client id.",e)}}Ps(){if(this.Ki)try{this.Ki.removeItem(this._s(this.clientId))}catch{}}_s(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Qs(r){return ct(r,ea)}function Na(r){return ct(r,ts)}function Md(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
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
 */class Ld{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Es=n,this.ds=i}static As(e,t){let n=_e(),i=_e();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Ld(e,t.fromCache,n,i)}}/**
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
 */class iP{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class E_{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return Eg()?8:Zm(Ke())>0?6:4}()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ys(e,t).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.ws(e,t,i,n).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new iP;return this.Ss(e,t,o).next(c=>{if(s.result=c,this.Vs)return this.bs(e,t,o,c.size)})}).next(()=>s.result)}bs(e,t,n,i){return n.documentReadCount<this.fs?(Vi()<=Ee.DEBUG&&q("QueryEngine","SDK will not create cache indexes for query:",Oi(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),b.resolve()):(Vi()<=Ee.DEBUG&&q("QueryEngine","Query:",Oi(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(Vi()<=Ee.DEBUG&&q("QueryEngine","The SDK decides to create cache indexes for query:",Oi(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Dt(t))):b.resolve())}ys(e,t){if(cp(t))return b.resolve(null);let n=Dt(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=dc(t,null,"F"),n=Dt(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const o=_e(...s);return this.ps.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,n).next(l=>{const u=this.Ds(t,c);return this.Cs(t,u,o,l.readTime)?this.ys(e,dc(t,null,"F")):this.vs(e,u,t,l)}))})))}ws(e,t,n,i){return cp(t)||i.isEqual(ie.min())?b.resolve(null):this.ps.getDocuments(e,n).next(s=>{const o=this.Ds(t,s);return this.Cs(t,o,n,i)?b.resolve(null):(Vi()<=Ee.DEBUG&&q("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Oi(t)),this.vs(e,o,t,Qm(i,Ji)).next(c=>c))})}Ds(e,t){let n=new Pe(xy(e));return t.forEach((i,s)=>{ra(e,s)&&(n=n.add(s))}),n}Cs(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Ss(e,t,n){return Vi()<=Ee.DEBUG&&q("QueryEngine","Using full collection scan to execute query:",Oi(t)),this.ps.getDocumentsMatchingQuery(e,t,jt.min(),n)}vs(e,t,n,i){return this.ps.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fd="LocalStore",sP=3e8;class oP{constructor(e,t,n,i){this.persistence=e,this.Fs=t,this.serializer=i,this.Ms=new Ne(ge),this.xs=new Un(s=>li(s),ta),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(n)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new __(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms))}}function I_(r,e,t,n){return new oP(r,e,t,n)}async function v_(r,e){const t=Q(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.Bs(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const o=[],c=[];let l=_e();for(const u of i){o.push(u.batchId);for(const h of u.mutations)l=l.add(h.key)}for(const u of s){c.push(u.batchId);for(const h of u.mutations)l=l.add(h.key)}return t.localDocuments.getDocuments(n,l).next(u=>({Ls:u,removedBatchIds:o,addedBatchIds:c}))})})}function aP(r,e){const t=Q(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,u,h){const p=u.batch,g=p.keys();let E=b.resolve();return g.forEach(N=>{E=E.next(()=>h.getEntry(l,N)).next(V=>{const O=u.docVersions.get(N);te(O!==null,48541),V.version.compareTo(O)<0&&(p.applyToRemoteDocument(V,u),V.isValidDocument()&&(V.setReadTime(u.commitVersion),h.addEntry(V)))})}),E.next(()=>c.mutationQueue.removeMutationBatch(l,p))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(c){let l=_e();for(let u=0;u<c.mutationResults.length;++u)c.mutationResults[u].transformResults.length>0&&(l=l.add(c.batch.mutations[u].key));return l}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function T_(r){const e=Q(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t))}function cP(r,e){const t=Q(r),n=e.snapshotVersion;let i=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=t.Ns.newChangeBuffer({trackRemovals:!0});i=t.Ms;const c=[];e.targetChanges.forEach((h,p)=>{const g=i.get(p);if(!g)return;c.push(t.Pi.removeMatchingKeys(s,h.removedDocuments,p).next(()=>t.Pi.addMatchingKeys(s,h.addedDocuments,p)));let E=g.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?E=E.withResumeToken(We.EMPTY_BYTE_STRING,ie.min()).withLastLimboFreeSnapshotVersion(ie.min()):h.resumeToken.approximateByteSize()>0&&(E=E.withResumeToken(h.resumeToken,n)),i=i.insert(p,E),function(V,O,Y){return V.resumeToken.approximateByteSize()===0||O.snapshotVersion.toMicroseconds()-V.snapshotVersion.toMicroseconds()>=sP?!0:Y.addedDocuments.size+Y.modifiedDocuments.size+Y.removedDocuments.size>0}(g,E,h)&&c.push(t.Pi.updateTargetData(s,E))});let l=Ft(),u=_e();if(e.documentUpdates.forEach(h=>{e.resolvedLimboDocuments.has(h)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,h))}),c.push(b_(s,o,e.documentUpdates).next(h=>{l=h.ks,u=h.qs})),!n.isEqual(ie.min())){const h=t.Pi.getLastRemoteSnapshotVersion(s).next(p=>t.Pi.setTargetsMetadata(s,s.currentSequenceNumber,n));c.push(h)}return b.waitFor(c).next(()=>o.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,l,u)).next(()=>l)}).then(s=>(t.Ms=i,s))}function b_(r,e,t){let n=_e(),i=_e();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let o=Ft();return t.forEach((c,l)=>{const u=s.get(c);l.isFoundDocument()!==u.isFoundDocument()&&(i=i.add(c)),l.isNoDocument()&&l.version.isEqual(ie.min())?(e.removeEntry(c,l.readTime),o=o.insert(c,l)):!u.isValidDocument()||l.version.compareTo(u.version)>0||l.version.compareTo(u.version)===0&&u.hasPendingWrites?(e.addEntry(l),o=o.insert(c,l)):q(Fd,"Ignoring outdated watch update for ",c,". Current version:",u.version," Watch version:",l.version)}),{ks:o,qs:i}})}function lP(r,e){const t=Q(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=hr),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function cs(r,e){const t=Q(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Pi.getTargetData(n,e).next(s=>s?(i=s,b.resolve(i)):t.Pi.allocateTargetId(n).next(o=>(i=new kn(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.Pi.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(n.targetId,n),t.xs.set(e,n.targetId)),n})}async function ls(r,e,t){const n=Q(r),i=n.Ms.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,o=>n.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!Cr(o))throw o;q(Fd,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Ms=n.Ms.remove(e),n.xs.delete(i.target)}function mc(r,e,t){const n=Q(r);let i=ie.min(),s=_e();return n.persistence.runTransaction("Execute query","readwrite",o=>function(l,u,h){const p=Q(l),g=p.xs.get(h);return g!==void 0?b.resolve(p.Ms.get(g)):p.Pi.getTargetData(u,h)}(n,o,Dt(e)).next(c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(o,c.targetId).next(l=>{s=l})}).next(()=>n.Fs.getDocumentsMatchingQuery(o,e,t?i:ie.min(),t?s:_e())).next(c=>(R_(n,ky(e),c),{documents:c,Qs:s})))}function A_(r,e){const t=Q(r),n=Q(t.Pi),i=t.Ms.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.At(s,e).next(o=>o?o.target:null))}function S_(r,e){const t=Q(r),n=t.Os.get(e)||ie.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.Ns.getAllFromCollectionGroup(i,e,Qm(n,Ji),Number.MAX_SAFE_INTEGER)).then(i=>(R_(t,e,i),i))}function R_(r,e,t){let n=r.Os.get(e)||ie.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.Os.set(e,n)}async function uP(r,e,t,n){const i=Q(r);let s=_e(),o=Ft();for(const u of t){const h=e.$s(u.metadata.name);u.document&&(s=s.add(h));const p=e.Us(u);p.setReadTime(e.Ks(u.metadata.readTime)),o=o.insert(h,p)}const c=i.Ns.newChangeBuffer({trackRemovals:!0}),l=await cs(i,function(h){return Dt(Is(Ie.fromString(`__bundle__/docs/${h}`)))}(n));return i.persistence.runTransaction("Apply bundle documents","readwrite",u=>b_(u,c,o).next(h=>(c.apply(u),h)).next(h=>i.Pi.removeMatchingKeysForTargetId(u,l.targetId).next(()=>i.Pi.addMatchingKeys(u,s,l.targetId)).next(()=>i.localDocuments.getLocalViewOfDocuments(u,h.ks,h.qs)).next(()=>h.ks)))}async function dP(r,e,t=_e()){const n=await cs(r,Dt(kd(e.bundledQuery))),i=Q(r);return i.persistence.runTransaction("Save named query","readwrite",s=>{const o=Je(e.readTime);if(n.snapshotVersion.compareTo(o)>=0)return i.Ii.saveNamedQuery(s,e);const c=n.withResumeToken(We.EMPTY_BYTE_STRING,o);return i.Ms=i.Ms.insert(c.targetId,c),i.Pi.updateTargetData(s,c).next(()=>i.Pi.removeMatchingKeysForTargetId(s,n.targetId)).next(()=>i.Pi.addMatchingKeys(s,t,n.targetId)).next(()=>i.Ii.saveNamedQuery(s,e))})}/**
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
 */const P_="firestore_clients";function Up(r,e){return`${P_}_${r}_${e}`}const C_="firestore_mutations";function Bp(r,e,t){let n=`${C_}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const k_="firestore_targets";function Ll(r,e){return`${k_}_${r}_${e}`}/**
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
 */const fn="SharedClientState";class yc{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Ws(e,t,n){const i=JSON.parse(n);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new $(i.error.code,i.error.message))),o?new yc(e,t,i.state,s):(Ye(fn,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class _o{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ws(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new $(n.error.code,n.error.message))),s?new _o(e,n.state,i):(Ye(fn,`Failed to parse target state for ID '${e}': ${t}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class _c{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ws(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=vd();for(let o=0;i&&o<n.activeTargetIds.length;++o)i=ey(n.activeTargetIds[o]),s=s.add(n.activeTargetIds[o]);return i?new _c(e,s):(Ye(fn,`Failed to parse client data for instance '${e}': ${t}`),null)}}class Ud{constructor(e,t){this.clientId=e,this.onlineState=t}static Ws(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new Ud(t.clientId,t.onlineState):(Ye(fn,`Failed to parse online state: ${e}`),null)}}class Eu{constructor(){this.activeTargetIds=vd()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Fl{constructor(e,t,n,i,s){this.window=e,this.Mi=t,this.persistenceKey=n,this.Js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Hs=this.Ys.bind(this),this.Zs=new Ne(ge),this.started=!1,this.Xs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.eo=Up(this.persistenceKey,this.Js),this.no=function(l){return`firestore_sequence_number_${l}`}(this.persistenceKey),this.Zs=this.Zs.insert(this.Js,new Eu),this.ro=new RegExp(`^${P_}_${o}_([^_]*)$`),this.io=new RegExp(`^${C_}_${o}_(\\d+)(?:_(.*))?$`),this.so=new RegExp(`^${k_}_${o}_(\\d+)$`),this.oo=function(l){return`firestore_online_state_${l}`}(this.persistenceKey),this._o=function(l){return`firestore_bundle_loaded_v2_${l}`}(this.persistenceKey),this.window.addEventListener("storage",this.Hs)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ts();for(const n of e){if(n===this.Js)continue;const i=this.getItem(Up(this.persistenceKey,n));if(i){const s=_c.Ws(n,i);s&&(this.Zs=this.Zs.insert(s.clientId,s))}}this.ao();const t=this.storage.getItem(this.oo);if(t){const n=this.uo(t);n&&this.co(n)}for(const n of this.Xs)this.Ys(n);this.Xs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.no,JSON.stringify(e))}getAllActiveQueryTargets(){return this.lo(this.Zs)}isActiveQueryTarget(e){let t=!1;return this.Zs.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.ho(e,"pending")}updateMutationState(e,t,n){this.ho(e,t,n),this.Po(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(Ll(this.persistenceKey,e));if(i){const s=_o.Ws(e,i);s&&(n=s.state)}}return t&&this.To.zs(e),this.ao(),n}removeLocalQueryTarget(e){this.To.js(e),this.ao()}isLocalQueryTarget(e){return this.To.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Ll(this.persistenceKey,e))}updateQueryState(e,t,n){this.Io(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Po(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Eo(e)}notifyBundleLoaded(e){this.Ao(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Hs),this.removeItem(this.eo),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return q(fn,"READ",e,t),t}setItem(e,t){q(fn,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){q(fn,"REMOVE",e),this.storage.removeItem(e)}Ys(e){const t=e;if(t.storageArea===this.storage){if(q(fn,"EVENT",t.key,t.newValue),t.key===this.eo)return void Ye("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Mi.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.ro.test(t.key)){if(t.newValue==null){const n=this.Ro(t.key);return this.Vo(n,null)}{const n=this.mo(t.key,t.newValue);if(n)return this.Vo(n.clientId,n)}}else if(this.io.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(this.so.test(t.key)){if(t.newValue!==null){const n=this.yo(t.key,t.newValue);if(n)return this.wo(n)}}else if(t.key===this.oo){if(t.newValue!==null){const n=this.uo(t.newValue);if(n)return this.co(n)}}else if(t.key===this.no){const n=function(s){let o=Mt.ce;if(s!=null)try{const c=JSON.parse(s);te(typeof c=="number",30636,{So:s}),o=c}catch(c){Ye(fn,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);n!==Mt.ce&&this.sequenceNumberHandler(n)}else if(t.key===this._o){const n=this.bo(t.newValue);await Promise.all(n.map(i=>this.syncEngine.Do(i)))}}}else this.Xs.push(t)})}}get To(){return this.Zs.get(this.Js)}ao(){this.setItem(this.eo,this.To.Gs())}ho(e,t,n){const i=new yc(this.currentUser,e,t,n),s=Bp(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Gs())}Po(e){const t=Bp(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Eo(e){const t={clientId:this.Js,onlineState:e};this.storage.setItem(this.oo,JSON.stringify(t))}Io(e,t,n){const i=Ll(this.persistenceKey,e),s=new _o(e,t,n);this.setItem(i,s.Gs())}Ao(e){const t=JSON.stringify(Array.from(e));this.setItem(this._o,t)}Ro(e){const t=this.ro.exec(e);return t?t[1]:null}mo(e,t){const n=this.Ro(e);return _c.Ws(n,t)}fo(e,t){const n=this.io.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return yc.Ws(new pt(s),i,t)}yo(e,t){const n=this.so.exec(e),i=Number(n[1]);return _o.Ws(i,t)}uo(e){return Ud.Ws(e)}bo(e){return JSON.parse(e)}async po(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Co(e.batchId,e.state,e.error);q(fn,`Ignoring mutation for non-active user ${e.user.uid}`)}wo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Vo(e,t){const n=t?this.Zs.insert(e,t):this.Zs.remove(e),i=this.lo(this.Zs),s=this.lo(n),o=[],c=[];return s.forEach(l=>{i.has(l)||o.push(l)}),i.forEach(l=>{s.has(l)||c.push(l)}),this.syncEngine.Fo(o,c).then(()=>{this.Zs=n})}co(e){this.Zs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}lo(e){let t=vd();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class x_{constructor(){this.Mo=new Eu,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,n){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new Eu,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class hP{Oo(e){}shutdown(){}}/**
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
 */const $p="ConnectivityMonitor";class qp{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){q($p,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){q($p,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Va=null;function Iu(){return Va===null?Va=function(){return 268435456+Math.round(2147483648*Math.random())}():Va++,"0x"+Va.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ul="RestConnection",fP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class pP{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===ou?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(e,t,n,i,s){const o=Iu(),c=this.zo(e,t.toUriEncodedString());q(Ul,`Sending RPC '${e}' ${o}:`,c,n);const l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,i,s);const{host:u}=new URL(c),h=gs(u);return this.Jo(e,c,l,n,h).then(p=>(q(Ul,`Received RPC '${e}' ${o}: `,p),p),p=>{throw Sn(Ul,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",n),p})}Ho(e,t,n,i,s,o){return this.Go(e,t,n,i,s)}jo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Es}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),n&&n.headers.forEach((i,s)=>e[s]=i)}zo(e,t){const n=fP[e];return`${this.Uo}/v1/${t}:${n}`}terminate(){}}/**
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
 */class gP{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
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
 */const Tt="WebChannelConnection";class mP extends pP{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,n,i,s){const o=Iu();return new Promise((c,l)=>{const u=new Fm;u.setWithCredentials(!0),u.listenOnce(Um.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case Ua.NO_ERROR:const p=u.getResponseJson();q(Tt,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case Ua.TIMEOUT:q(Tt,`RPC '${e}' ${o} timed out`),l(new $(C.DEADLINE_EXCEEDED,"Request time out"));break;case Ua.HTTP_ERROR:const g=u.getStatus();if(q(Tt,`RPC '${e}' ${o} failed with status:`,g,"response text:",u.getResponseText()),g>0){let E=u.getResponseJson();Array.isArray(E)&&(E=E[0]);const N=E==null?void 0:E.error;if(N&&N.status&&N.message){const V=function(Y){const ee=Y.toLowerCase().replace(/_/g,"-");return Object.values(C).indexOf(ee)>=0?ee:C.UNKNOWN}(N.status);l(new $(V,N.message))}else l(new $(C.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new $(C.UNAVAILABLE,"Connection failed."));break;default:J(9055,{l_:e,streamId:o,h_:u.getLastErrorCode(),P_:u.getLastError()})}}finally{q(Tt,`RPC '${e}' ${o} completed.`)}});const h=JSON.stringify(i);q(Tt,`RPC '${e}' ${o} sending request:`,i),u.send(t,"POST",h,n,15)})}T_(e,t,n){const i=Iu(),s=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=qm(),c=$m(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;const h=s.join("");q(Tt,`Creating RPC '${e}' stream ${i}: ${h}`,l);const p=o.createWebChannel(h,l);this.I_(p);let g=!1,E=!1;const N=new gP({Yo:O=>{E?q(Tt,`Not sending because RPC '${e}' stream ${i} is closed:`,O):(g||(q(Tt,`Opening RPC '${e}' stream ${i} transport.`),p.open(),g=!0),q(Tt,`RPC '${e}' stream ${i} sending:`,O),p.send(O))},Zo:()=>p.close()}),V=(O,Y,ee)=>{O.listen(Y,X=>{try{ee(X)}catch(de){setTimeout(()=>{throw de},0)}})};return V(p,Zs.EventType.OPEN,()=>{E||(q(Tt,`RPC '${e}' stream ${i} transport opened.`),N.o_())}),V(p,Zs.EventType.CLOSE,()=>{E||(E=!0,q(Tt,`RPC '${e}' stream ${i} transport closed`),N.a_(),this.E_(p))}),V(p,Zs.EventType.ERROR,O=>{E||(E=!0,Sn(Tt,`RPC '${e}' stream ${i} transport errored. Name:`,O.name,"Message:",O.message),N.a_(new $(C.UNAVAILABLE,"The operation could not be completed")))}),V(p,Zs.EventType.MESSAGE,O=>{var Y;if(!E){const ee=O.data[0];te(!!ee,16349);const X=ee,de=(X==null?void 0:X.error)||((Y=X[0])==null?void 0:Y.error);if(de){q(Tt,`RPC '${e}' stream ${i} received error:`,de);const he=de.status;let ye=function(_){const v=et[_];if(v!==void 0)return zy(v)}(he),I=de.message;ye===void 0&&(ye=C.INTERNAL,I="Unknown error status: "+he+" with message "+de.message),E=!0,N.a_(new $(ye,I)),p.close()}else q(Tt,`RPC '${e}' stream ${i} received:`,ee),N.u_(ee)}}),V(c,Bm.STAT_EVENT,O=>{O.stat===Zl.PROXY?q(Tt,`RPC '${e}' stream ${i} detected buffering proxy`):O.stat===Zl.NOPROXY&&q(Tt,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{N.__()},0),N}terminate(){this.c_.forEach(e=>e.close()),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter(t=>t===e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */function D_(){return typeof window<"u"?window:null}function Qa(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function aa(r){return new IR(r,!0)}/**
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
 */class Bd{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Mi=e,this.timerId=t,this.d_=n,this.A_=i,this.R_=s,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-n);i>0&&q("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
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
 */const Kp="PersistentStream";class N_{constructor(e,t,n,i,s,o,c,l){this.Mi=e,this.S_=n,this.b_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new Bd(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===C.RESOURCE_EXHAUSTED?(Ye(t.toString()),Ye("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===C.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.D_===t&&this.G_(n,i)},n=>{e(()=>{const i=new $(C.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)})})}G_(e,t){const n=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{n(()=>this.listener.Xo())}),this.stream.t_(()=>{n(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()))}),this.stream.r_(i=>{n(()=>this.z_(i))}),this.stream.onMessage(i=>{n(()=>++this.F_==1?this.J_(i):this.onNext(i))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return q(Kp,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():(q(Kp,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class yP extends N_{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=bR(this.serializer,e),n=function(s){if(!("targetChange"in s))return ie.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?ie.min():o.readTime?Je(o.readTime):ie.min()}(e);return this.listener.H_(t,n)}Y_(e){const t={};t.database=gu(this.serializer),t.addTarget=function(s,o){let c;const l=o.target;if(c=lc(l)?{documents:e_(s,l)}:{query:t_(s,l).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Hy(s,o.resumeToken);const u=fu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}else if(o.snapshotVersion.compareTo(ie.min())>0){c.readTime=as(s,o.snapshotVersion.toTimestamp());const u=fu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}return c}(this.serializer,e);const n=SR(this.serializer,e);n&&(t.labels=n),this.q_(t)}Z_(e){const t={};t.database=gu(this.serializer),t.removeTarget=e,this.q_(t)}}class _P extends N_{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return te(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,te(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){te(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=AR(e.writeResults,e.commitTime),n=Je(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=gu(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Uo(this.serializer,n))};this.q_(t)}}/**
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
 */class wP{}class EP extends wP{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new $(C.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Go(e,pu(t,n),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new $(C.UNKNOWN,s.toString())})}Ho(e,t,n,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.Ho(e,pu(t,n),i,o,c,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===C.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new $(C.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}class IP{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Ye(t),this.aa=!1):q("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
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
 */const gi="RemoteStore";class vP{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=s,this.Aa.Oo(o=>{n.enqueueAndForget(async()=>{xr(this)&&(q(gi,"Restarting streams for network reachability change."),await async function(l){const u=Q(l);u.Ea.add(4),await bs(u),u.Ra.set("Unknown"),u.Ea.delete(4),await ca(u)}(this))})}),this.Ra=new IP(n,i)}}async function ca(r){if(xr(r))for(const e of r.da)await e(!0)}async function bs(r){for(const e of r.da)await e(!1)}function Hc(r,e){const t=Q(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),Kd(t)?qd(t):Ss(t).O_()&&$d(t,e))}function us(r,e){const t=Q(r),n=Ss(t);t.Ia.delete(e),n.O_()&&V_(t,e),t.Ia.size===0&&(n.O_()?n.L_():xr(t)&&t.Ra.set("Unknown"))}function $d(r,e){if(r.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(ie.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Ss(r).Y_(e)}function V_(r,e){r.Va.Ue(e),Ss(r).Z_(e)}function qd(r){r.Va=new yR({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),Ss(r).start(),r.Ra.ua()}function Kd(r){return xr(r)&&!Ss(r).x_()&&r.Ia.size>0}function xr(r){return Q(r).Ea.size===0}function O_(r){r.Va=void 0}async function TP(r){r.Ra.set("Online")}async function bP(r){r.Ia.forEach((e,t)=>{$d(r,e)})}async function AP(r,e){O_(r),Kd(r)?(r.Ra.ha(e),qd(r)):r.Ra.set("Unknown")}async function SP(r,e,t){if(r.Ra.set("Online"),e instanceof Wy&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.Va.removeTarget(c))}(r,e)}catch(n){q(gi,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await wc(r,n)}else if(e instanceof Wa?r.Va.Ze(e):e instanceof Gy?r.Va.st(e):r.Va.tt(e),!t.isEqual(ie.min()))try{const n=await T_(r.localStore);t.compareTo(n)>=0&&await function(s,o){const c=s.Va.Tt(o);return c.targetChanges.forEach((l,u)=>{if(l.resumeToken.approximateByteSize()>0){const h=s.Ia.get(u);h&&s.Ia.set(u,h.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,u)=>{const h=s.Ia.get(l);if(!h)return;s.Ia.set(l,h.withResumeToken(We.EMPTY_BYTE_STRING,h.snapshotVersion)),V_(s,l);const p=new kn(h.target,l,u,h.sequenceNumber);$d(s,p)}),s.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){q(gi,"Failed to raise snapshot:",n),await wc(r,n)}}async function wc(r,e,t){if(!Cr(e))throw e;r.Ea.add(1),await bs(r),r.Ra.set("Offline"),t||(t=()=>T_(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{q(gi,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await ca(r)})}function M_(r,e){return e().catch(t=>wc(r,t,e))}async function As(r){const e=Q(r),t=Tr(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:hr;for(;RP(e);)try{const i=await lP(e.localStore,n);if(i===null){e.Ta.length===0&&t.L_();break}n=i.batchId,PP(e,i)}catch(i){await wc(e,i)}L_(e)&&F_(e)}function RP(r){return xr(r)&&r.Ta.length<10}function PP(r,e){r.Ta.push(e);const t=Tr(r);t.O_()&&t.X_&&t.ea(e.mutations)}function L_(r){return xr(r)&&!Tr(r).x_()&&r.Ta.length>0}function F_(r){Tr(r).start()}async function CP(r){Tr(r).ra()}async function kP(r){const e=Tr(r);for(const t of r.Ta)e.ea(t.mutations)}async function xP(r,e,t){const n=r.Ta.shift(),i=Sd.from(n,e,t);await M_(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await As(r)}async function DP(r,e){e&&Tr(r).X_&&await async function(n,i){if(function(o){return Ky(o)&&o!==C.ABORTED}(i.code)){const s=n.Ta.shift();Tr(n).B_(),await M_(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await As(n)}}(r,e),L_(r)&&F_(r)}async function zp(r,e){const t=Q(r);t.asyncQueue.verifyOperationInProgress(),q(gi,"RemoteStore received new credentials");const n=xr(t);t.Ea.add(3),await bs(t),n&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await ca(t)}async function vu(r,e){const t=Q(r);e?(t.Ea.delete(2),await ca(t)):e||(t.Ea.add(2),await bs(t),t.Ra.set("Unknown"))}function Ss(r){return r.ma||(r.ma=function(t,n,i){const s=Q(t);return s.sa(),new yP(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:TP.bind(null,r),t_:bP.bind(null,r),r_:AP.bind(null,r),H_:SP.bind(null,r)}),r.da.push(async e=>{e?(r.ma.B_(),Kd(r)?qd(r):r.Ra.set("Unknown")):(await r.ma.stop(),O_(r))})),r.ma}function Tr(r){return r.fa||(r.fa=function(t,n,i){const s=Q(t);return s.sa(),new _P(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:CP.bind(null,r),r_:DP.bind(null,r),ta:kP.bind(null,r),na:xP.bind(null,r)}),r.da.push(async e=>{e?(r.fa.B_(),await As(r)):(await r.fa.stop(),r.Ta.length>0&&(q(gi,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
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
 */class zd{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new It,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new zd(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new $(C.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Rs(r,e){if(Ye("AsyncQueue",`${e}: ${r}`),Cr(r))return new $(C.UNAVAILABLE,`${e}: ${r}`);throw r}/**
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
 */class ji{static emptySet(e){return new ji(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||G.comparator(t.key,n.key):(t,n)=>G.comparator(t.key,n.key),this.keyedMap=eo(),this.sortedSet=new Ne(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof ji)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const n=new ji;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}/**
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
 */class jp{constructor(){this.ga=new Ne(G.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):J(63341,{Rt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class ds{constructor(e,t,n,i,s,o,c,l,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new ds(e,t,ji.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&na(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
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
 */class NP{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some(e=>e.Da())}}class VP{constructor(){this.queries=Gp(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const i=Q(t),s=i.queries;i.queries=Gp(),s.forEach((o,c)=>{for(const l of c.Sa)l.onError(n)})})(this,new $(C.ABORTED,"Firestore shutting down"))}}function Gp(){return new Un(r=>Cy(r),na)}async function jd(r,e){const t=Q(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.ba()&&e.Da()&&(n=2):(s=new NP,n=e.Da()?0:1);try{switch(n){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Rs(o,`Initialization of query '${Oi(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.Sa.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&Wd(t)}async function Gd(r,e){const t=Q(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.Sa.indexOf(e);o>=0&&(s.Sa.splice(o,1),s.Sa.length===0?i=e.Da()?0:1:!s.ba()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function OP(r,e){const t=Q(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.Sa)c.Fa(i)&&(n=!0);o.wa=i}}n&&Wd(t)}function MP(r,e,t){const n=Q(r),i=n.queries.get(e);if(i)for(const s of i.Sa)s.onError(t);n.queries.delete(e)}function Wd(r){r.Ca.forEach(e=>{e.next()})}var Tu,Wp;(Wp=Tu||(Tu={})).Ma="default",Wp.Cache="cache";class Hd{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new ds(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.qa||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=ds.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==Tu.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class LP{constructor(e,t){this.Qa=e,this.byteLength=t}$a(){return"metadata"in this.Qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hp{constructor(e){this.serializer=e}$s(e){return vn(this.serializer,e)}Us(e){return e.metadata.exists?Zy(this.serializer,e.document,!1):Me.newNoDocument(this.$s(e.metadata.name),this.Ks(e.metadata.readTime))}Ks(e){return Je(e)}}class FP{constructor(e,t){this.Ua=e,this.serializer=t,this.Ka=[],this.Wa=[],this.collectionGroups=new Set,this.progress=U_(e)}get queries(){return this.Ka}get documents(){return this.Wa}Ga(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.Qa.namedQuery)this.Ka.push(e.Qa.namedQuery);else if(e.Qa.documentMetadata){this.Wa.push({metadata:e.Qa.documentMetadata}),e.Qa.documentMetadata.exists||++t;const n=Ie.fromString(e.Qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else e.Qa.document&&(this.Wa[this.Wa.length-1].document=e.Qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,{...this.progress}):null}za(e){const t=new Map,n=new Hp(this.serializer);for(const i of e)if(i.metadata.queries){const s=n.$s(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||_e()).add(s);t.set(o,c)}}return t}async ja(e){const t=await uP(e,new Hp(this.serializer),this.Wa,this.Ua.id),n=this.za(this.documents);for(const i of this.Ka)await dP(e,i,n.get(i.name));return this.progress.taskState="Success",{progress:this.progress,Ja:this.collectionGroups,Ha:t}}}function U_(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
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
 */class B_{constructor(e){this.key=e}}class $_{constructor(e){this.key=e}}class q_{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=_e(),this.mutatedKeys=_e(),this.eu=xy(e),this.tu=new ji(this.eu)}get nu(){return this.Ya}ru(e,t){const n=t?t.iu:new jp,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const l=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,u=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((h,p)=>{const g=i.get(h),E=ra(this.query,p)?p:null,N=!!g&&this.mutatedKeys.has(g.key),V=!!E&&(E.hasLocalMutations||this.mutatedKeys.has(E.key)&&E.hasCommittedMutations);let O=!1;g&&E?g.data.isEqual(E.data)?N!==V&&(n.track({type:3,doc:E}),O=!0):this.su(g,E)||(n.track({type:2,doc:E}),O=!0,(l&&this.eu(E,l)>0||u&&this.eu(E,u)<0)&&(c=!0)):!g&&E?(n.track({type:0,doc:E}),O=!0):g&&!E&&(n.track({type:1,doc:g}),O=!0,(l||u)&&(c=!0)),O&&(E?(o=o.add(E),s=V?s.add(h):s.delete(h)):(o=o.delete(h),s=s.delete(h)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const h=this.query.limitType==="F"?o.last():o.first();o=o.delete(h.key),s=s.delete(h.key),n.track({type:1,doc:h})}return{tu:o,iu:n,Cs:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((h,p)=>function(E,N){const V=O=>{switch(O){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return J(20277,{Rt:O})}};return V(E)-V(N)}(h.type,p.type)||this.eu(h.doc,p.doc)),this.ou(n),i=i??!1;const c=t&&!i?this._u():[],l=this.Xa.size===0&&this.current&&!i?1:0,u=l!==this.Za;return this.Za=l,o.length!==0||u?{snapshot:new ds(this.query,e.tu,s,o,e.mutatedKeys,l===0,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new jp,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=_e(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))});const t=[];return e.forEach(n=>{this.Xa.has(n)||t.push(new $_(n))}),this.Xa.forEach(n=>{e.has(n)||t.push(new B_(n))}),t}cu(e){this.Ya=e.Qs,this.Xa=_e();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return ds.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const Dr="SyncEngine";class UP{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class BP{constructor(e){this.key=e,this.hu=!1}}class $P{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new Un(c=>Cy(c),na),this.Iu=new Map,this.Eu=new Set,this.du=new Ne(G.comparator),this.Au=new Map,this.Ru=new Nd,this.Vu={},this.mu=new Map,this.fu=pi.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function qP(r,e,t=!0){const n=Qc(r);let i;const s=n.Tu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await K_(n,e,t,!0),i}async function KP(r,e){const t=Qc(r);await K_(t,e,!0,!1)}async function K_(r,e,t,n){const i=await cs(r.localStore,Dt(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await Qd(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&Hc(r.remoteStore,i),c}async function Qd(r,e,t,n,i){r.pu=(p,g,E)=>async function(V,O,Y,ee){let X=O.view.ru(Y);X.Cs&&(X=await mc(V.localStore,O.query,!1).then(({documents:I})=>O.view.ru(I,X)));const de=ee&&ee.targetChanges.get(O.targetId),he=ee&&ee.targetMismatches.get(O.targetId)!=null,ye=O.view.applyChanges(X,V.isPrimaryClient,de,he);return bu(V,O.targetId,ye.au),ye.snapshot}(r,p,g,E);const s=await mc(r.localStore,e,!0),o=new q_(e,s.Qs),c=o.ru(s.documents),l=oa.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),u=o.applyChanges(c,r.isPrimaryClient,l);bu(r,t,u.au);const h=new UP(e,t,o);return r.Tu.set(e,h),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),u.snapshot}async function zP(r,e,t){const n=Q(r),i=n.Tu.get(e),s=n.Iu.get(i.targetId);if(s.length>1)return n.Iu.set(i.targetId,s.filter(o=>!na(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await ls(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&us(n.remoteStore,i.targetId),hs(n,i.targetId)}).catch(Pr)):(hs(n,i.targetId),await ls(n.localStore,i.targetId,!0))}async function jP(r,e){const t=Q(r),n=t.Tu.get(e),i=t.Iu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),us(t.remoteStore,n.targetId))}async function GP(r,e,t){const n=Zd(r);try{const i=await function(o,c){const l=Q(o),u=Se.now(),h=c.reduce((E,N)=>E.add(N.key),_e());let p,g;return l.persistence.runTransaction("Locally write mutations","readwrite",E=>{let N=Ft(),V=_e();return l.Ns.getEntries(E,h).next(O=>{N=O,N.forEach((Y,ee)=>{ee.isValidDocument()||(V=V.add(Y))})}).next(()=>l.localDocuments.getOverlayedDocuments(E,N)).next(O=>{p=O;const Y=[];for(const ee of c){const X=pR(ee,p.get(ee.key).overlayedDocument);X!=null&&Y.push(new Bn(ee.key,X,Ey(X.value.mapValue),qe.exists(!0)))}return l.mutationQueue.addMutationBatch(E,u,Y,c)}).next(O=>{g=O;const Y=O.applyToLocalDocumentSet(p,V);return l.documentOverlayCache.saveOverlays(E,O.batchId,Y)})}).then(()=>({batchId:g.batchId,changes:Ny(p)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(o,c,l){let u=o.Vu[o.currentUser.toKey()];u||(u=new Ne(ge)),u=u.insert(c,l),o.Vu[o.currentUser.toKey()]=u}(n,i.batchId,t),await $n(n,i.changes),await As(n.remoteStore)}catch(i){const s=Rs(i,"Failed to persist write");t.reject(s)}}async function z_(r,e){const t=Q(r);try{const n=await cP(t.localStore,e);e.targetChanges.forEach((i,s)=>{const o=t.Au.get(s);o&&(te(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?te(o.hu,14607):i.removedDocuments.size>0&&(te(o.hu,42227),o.hu=!1))}),await $n(t,n,e)}catch(n){await Pr(n)}}function Qp(r,e,t){const n=Q(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Tu.forEach((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)}),function(o,c){const l=Q(o);l.onlineState=c;let u=!1;l.queries.forEach((h,p)=>{for(const g of p.Sa)g.va(c)&&(u=!0)}),u&&Wd(l)}(n.eventManager,e),i.length&&n.Pu.H_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function WP(r,e,t){const n=Q(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Au.get(e),s=i&&i.key;if(s){let o=new Ne(G.comparator);o=o.insert(s,Me.newNoDocument(s,ie.min()));const c=_e().add(s),l=new sa(ie.min(),new Map,new Ne(ge),o,c);await z_(n,l),n.du=n.du.remove(s),n.Au.delete(e),Xd(n)}else await ls(n.localStore,e,!1).then(()=>hs(n,e,t)).catch(Pr)}async function HP(r,e){const t=Q(r),n=e.batch.batchId;try{const i=await aP(t.localStore,e);Jd(t,n,null),Yd(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await $n(t,i)}catch(i){await Pr(i)}}async function QP(r,e,t){const n=Q(r);try{const i=await function(o,c){const l=Q(o);return l.persistence.runTransaction("Reject batch","readwrite-primary",u=>{let h;return l.mutationQueue.lookupMutationBatch(u,c).next(p=>(te(p!==null,37113),h=p.keys(),l.mutationQueue.removeMutationBatch(u,p))).next(()=>l.mutationQueue.performConsistencyCheck(u)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(u,h,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(u,h)).next(()=>l.localDocuments.getDocuments(u,h))})}(n.localStore,e);Jd(n,e,t),Yd(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await $n(n,i)}catch(i){await Pr(i)}}async function YP(r,e){const t=Q(r);xr(t.remoteStore)||q(Dr,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const c=Q(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",l=>c.mutationQueue.getHighestUnacknowledgedBatchId(l))}(t.localStore);if(n===hr)return void e.resolve();const i=t.mu.get(n)||[];i.push(e),t.mu.set(n,i)}catch(n){const i=Rs(n,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function Yd(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Jd(r,e,t){const n=Q(r);let i=n.Vu[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Vu[n.currentUser.toKey()]=i}}function hs(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Ru.jr(e).forEach(n=>{r.Ru.containsKey(n)||j_(r,n)})}function j_(r,e){r.Eu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(us(r.remoteStore,t),r.du=r.du.remove(e),r.Au.delete(t),Xd(r))}function bu(r,e,t){for(const n of t)n instanceof B_?(r.Ru.addReference(n.key,e),JP(r,n)):n instanceof $_?(q(Dr,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,e),r.Ru.containsKey(n.key)||j_(r,n.key)):J(19791,{wu:n})}function JP(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Eu.has(n)||(q(Dr,"New document in limbo: "+t),r.Eu.add(n),Xd(r))}function Xd(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new G(Ie.fromString(e)),n=r.fu.next();r.Au.set(n,new BP(t)),r.du=r.du.insert(t,n),Hc(r.remoteStore,new kn(Dt(Is(t.path)),n,"TargetPurposeLimboResolution",Mt.ce))}}async function $n(r,e,t){const n=Q(r),i=[],s=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((c,l)=>{o.push(n.pu(l,e,t).then(u=>{var h;if((u||t)&&n.isPrimaryClient){const p=u?!u.fromCache:(h=t==null?void 0:t.targetChanges.get(l.targetId))==null?void 0:h.current;n.sharedClientState.updateQueryState(l.targetId,p?"current":"not-current")}if(u){i.push(u);const p=Ld.As(l.targetId,u);s.push(p)}}))}),await Promise.all(o),n.Pu.H_(i),await async function(l,u){const h=Q(l);try{await h.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>b.forEach(u,g=>b.forEach(g.Es,E=>h.persistence.referenceDelegate.addReference(p,g.targetId,E)).next(()=>b.forEach(g.ds,E=>h.persistence.referenceDelegate.removeReference(p,g.targetId,E)))))}catch(p){if(!Cr(p))throw p;q(Fd,"Failed to update sequence numbers: "+p)}for(const p of u){const g=p.targetId;if(!p.fromCache){const E=h.Ms.get(g),N=E.snapshotVersion,V=E.withLastLimboFreeSnapshotVersion(N);h.Ms=h.Ms.insert(g,V)}}}(n.localStore,s))}async function XP(r,e){const t=Q(r);if(!t.currentUser.isEqual(e)){q(Dr,"User change. New user:",e.toKey());const n=await v_(t.localStore,e);t.currentUser=e,function(s,o){s.mu.forEach(c=>{c.forEach(l=>{l.reject(new $(C.CANCELLED,o))})}),s.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await $n(t,n.Ls)}}function ZP(r,e){const t=Q(r),n=t.Au.get(e);if(n&&n.hu)return _e().add(n.key);{let i=_e();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function e0(r,e){const t=Q(r),n=await mc(t.localStore,e.query,!0),i=e.view.cu(n);return t.isPrimaryClient&&bu(t,e.targetId,i.au),i}async function t0(r,e){const t=Q(r);return S_(t.localStore,e).then(n=>$n(t,n))}async function n0(r,e,t,n){const i=Q(r),s=await function(c,l){const u=Q(c),h=Q(u.mutationQueue);return u.persistence.runTransaction("Lookup mutation documents","readonly",p=>h.er(p,l).next(g=>g?u.localDocuments.getDocuments(p,g):b.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await As(i.remoteStore):t==="acknowledged"||t==="rejected"?(Jd(i,e,n||null),Yd(i,e),function(c,l){Q(Q(c).mutationQueue).ir(l)}(i.localStore,e)):J(6720,"Unknown batchState",{Su:t}),await $n(i,s)):q(Dr,"Cannot apply mutation batch with id: "+e)}async function r0(r,e){const t=Q(r);if(Qc(t),Zd(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await Yp(t,n.toArray());t.gu=!0,await vu(t.remoteStore,!0);for(const s of i)Hc(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const n=[];let i=Promise.resolve();t.Iu.forEach((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):i=i.then(()=>(hs(t,o),ls(t.localStore,o,!0))),us(t.remoteStore,o)}),await i,await Yp(t,n),function(o){const c=Q(o);c.Au.forEach((l,u)=>{us(c.remoteStore,u)}),c.Ru.Jr(),c.Au=new Map,c.du=new Ne(G.comparator)}(t),t.gu=!1,await vu(t.remoteStore,!1)}}async function Yp(r,e,t){const n=Q(r),i=[],s=[];for(const o of e){let c;const l=n.Iu.get(o);if(l&&l.length!==0){c=await cs(n.localStore,Dt(l[0]));for(const u of l){const h=n.Tu.get(u),p=await e0(n,h);p.snapshot&&s.push(p.snapshot)}}else{const u=await A_(n.localStore,o);c=await cs(n.localStore,u),await Qd(n,G_(u),o,!1,c.resumeToken)}i.push(c)}return n.Pu.H_(s),i}function G_(r){return Py(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function i0(r){return function(t){return Q(Q(t).persistence).Ts()}(Q(r).localStore)}async function s0(r,e,t,n){const i=Q(r);if(i.gu)return void q(Dr,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await S_(i.localStore,ky(s[0])),c=sa.createSynthesizedRemoteEventForCurrentChange(e,t==="current",We.EMPTY_BYTE_STRING);await $n(i,o,c);break}case"rejected":await ls(i.localStore,e,!0),hs(i,e,n);break;default:J(64155,t)}}async function o0(r,e,t){const n=Qc(r);if(n.gu){for(const i of e){if(n.Iu.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){q(Dr,"Adding an already active target "+i);continue}const s=await A_(n.localStore,i),o=await cs(n.localStore,s);await Qd(n,G_(s),o.targetId,!1,o.resumeToken),Hc(n.remoteStore,o)}for(const i of t)n.Iu.has(i)&&await ls(n.localStore,i,!1).then(()=>{us(n.remoteStore,i),hs(n,i)}).catch(Pr)}}function Qc(r){const e=Q(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=z_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=ZP.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=WP.bind(null,e),e.Pu.H_=OP.bind(null,e.eventManager),e.Pu.yu=MP.bind(null,e.eventManager),e}function Zd(r){const e=Q(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=HP.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=QP.bind(null,e),e}function a0(r,e,t){const n=Q(r);(async function(s,o,c){try{const l=await o.getMetadata();if(await function(E,N){const V=Q(E),O=Je(N.createTime);return V.persistence.runTransaction("hasNewerBundle","readonly",Y=>V.Ii.getBundleMetadata(Y,N.id)).then(Y=>!!Y&&Y.createTime.compareTo(O)>=0)}(s.localStore,l))return await o.close(),c._completeWith(function(E){return{taskState:"Success",documentsLoaded:E.totalDocuments,bytesLoaded:E.totalBytes,totalDocuments:E.totalDocuments,totalBytes:E.totalBytes}}(l)),Promise.resolve(new Set);c._updateProgress(U_(l));const u=new FP(l,o.serializer);let h=await o.bu();for(;h;){const g=await u.Ga(h);g&&c._updateProgress(g),h=await o.bu()}const p=await u.ja(s.localStore);return await $n(s,p.Ha,void 0),await function(E,N){const V=Q(E);return V.persistence.runTransaction("Save bundle","readwrite",O=>V.Ii.saveBundleMetadata(O,N))}(s.localStore,l),c._completeWith(p.progress),Promise.resolve(p.Ja)}catch(l){return Sn(Dr,`Loading bundle failed with ${l}`),c._failWith(l),Promise.resolve(new Set)}})(n,e,t).then(i=>{n.sharedClientState.notifyBundleLoaded(i)})}class Bo{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=aa(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return I_(this.persistence,new E_,e.initialUser,this.serializer)}Cu(e){return new Vd(Wc.mi,this.serializer)}Du(e){return new x_}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Bo.provider={build:()=>new Bo};class c0 extends Bo{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){te(this.persistence.referenceDelegate instanceof gc,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new p_(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?bt.withCacheSize(this.cacheSizeBytes):bt.DEFAULT;return new Vd(n=>gc.mi(n,t),this.serializer)}}class W_ extends Bo{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await Zd(this.xu.syncEngine),await As(this.xu.remoteStore),await this.persistence.Ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return I_(this.persistence,new E_,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new p_(n,e.asyncQueue,t)}Mu(e,t){const n=new yS(t,this.persistence);return new mS(e.asyncQueue,n)}Cu(e){const t=Md(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?bt.withCacheSize(this.cacheSizeBytes):bt.DEFAULT;return new Od(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,D_(),Qa(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new x_}}class l0 extends W_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Fl&&(this.sharedClientState.syncEngine={Co:n0.bind(null,t),vo:s0.bind(null,t),Fo:o0.bind(null,t),Ts:i0.bind(null,t),Do:t0.bind(null,t)},await this.sharedClientState.start()),await this.persistence.Ji(async n=>{await r0(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=D_();if(!Fl.v(t))throw new $(C.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Md(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Fl(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class $o{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Qp(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=XP.bind(null,this.syncEngine),await vu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new VP}()}createDatastore(e){const t=aa(e.databaseInfo.databaseId),n=function(s){return new mP(s)}(e.databaseInfo);return function(s,o,c,l){return new EP(s,o,c,l)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,o,c){return new vP(n,i,s,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>Qp(this.syncEngine,t,0),function(){return qp.v()?new qp:new hP}())}createSyncEngine(e,t){return function(i,s,o,c,l,u,h){const p=new $P(i,s,o,c,l,u);return h&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=Q(i);q(gi,"RemoteStore shutting down."),s.Ea.add(5),await bs(s),s.Aa.shutdown(),s.Ra.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}$o.provider={build:()=>new $o};function Jp(r,e=10240){let t=0;return{async read(){if(t<r.byteLength){const n={value:r.slice(t,t+e),done:!1};return t+=e,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class Yc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Ye("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class u0{constructor(e,t){this.Bu=e,this.serializer=t,this.metadata=new It,this.buffer=new Uint8Array,this.Lu=function(){return new TextDecoder("utf-8")}(),this.ku().then(n=>{n&&n.$a()?this.metadata.resolve(n.Qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n==null?void 0:n.Qa)}`))},n=>this.metadata.reject(n))}close(){return this.Bu.cancel()}async getMetadata(){return this.metadata.promise}async bu(){return await this.getMetadata(),this.ku()}async ku(){const e=await this.qu();if(e===null)return null;const t=this.Lu.decode(e),n=Number(t);isNaN(n)&&this.Qu(`length string (${t}) is not valid number`);const i=await this.$u(n);return new LP(JSON.parse(i),e.length+n)}Uu(){return this.buffer.findIndex(e=>e===123)}async qu(){for(;this.Uu()<0&&!await this.Ku(););if(this.buffer.length===0)return null;const e=this.Uu();e<0&&this.Qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async $u(e){for(;this.buffer.length<e;)await this.Ku()&&this.Qu("Reached the end of bundle when more is expected.");const t=this.Lu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}Qu(e){throw this.Bu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Ku(){const e=await this.Bu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
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
 */class d0{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new $(C.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(i,s){const o=Q(i),c={documents:s.map(p=>Fo(o.serializer,p))},l=await o.Ho("BatchGetDocuments",o.serializer.databaseId,Ie.emptyPath(),c,s.length),u=new Map;l.forEach(p=>{const g=TR(o.serializer,p);u.set(g.key.toString(),g)});const h=[];return s.forEach(p=>{const g=u.get(p.toString());te(!!g,55234,{key:p}),h.push(g)}),h}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new Ts(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const i=G.fromPath(n);this.mutations.push(new bd(i,this.precondition(i)))}),await async function(n,i){const s=Q(n),o={writes:i.map(c=>Uo(s.serializer,c))};await s.Go("Commit",s.serializer.databaseId,Ie.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw J(50498,{Gu:e.constructor.name});t=ie.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new $(C.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(ie.min())?qe.exists(!1):qe.updateTime(t):qe.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(ie.min()))throw new $(C.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return qe.updateTime(t)}return qe.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
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
 */class h0{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.zu=n.maxAttempts,this.M_=new Bd(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Ju()}Ju(){this.M_.p_(async()=>{const e=new d0(this.datastore),t=this.Hu(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(i=>{this.Yu(i)}))}).catch(n=>{this.Yu(n)})})}Hu(e){try{const t=this.updateFunction(e);return!Zo(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e)}Zu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!Ky(t)}return!1}}/**
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
 */const br="FirestoreClient";class f0{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=pt.UNAUTHENTICATED,this.clientId=ud.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async o=>{q(br,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>(q(br,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new It;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Rs(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function Bl(r,e){r.asyncQueue.verifyOperationInProgress(),q(br,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await v_(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function Xp(r,e){r.asyncQueue.verifyOperationInProgress();const t=await eh(r);q(br,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>zp(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>zp(e.remoteStore,i)),r._onlineComponents=e}async function eh(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){q(br,"Using user provided OfflineComponentProvider");try{await Bl(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===C.FAILED_PRECONDITION||i.code===C.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;Sn("Error using user provided cache. Falling back to memory cache: "+t),await Bl(r,new Bo)}}else q(br,"Using default OfflineComponentProvider"),await Bl(r,new c0(void 0));return r._offlineComponents}async function Jc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?(q(br,"Using user provided OnlineComponentProvider"),await Xp(r,r._uninitializedComponentsProvider._online)):(q(br,"Using default OnlineComponentProvider"),await Xp(r,new $o))),r._onlineComponents}function H_(r){return eh(r).then(e=>e.persistence)}function th(r){return eh(r).then(e=>e.localStore)}function Q_(r){return Jc(r).then(e=>e.remoteStore)}function nh(r){return Jc(r).then(e=>e.syncEngine)}function p0(r){return Jc(r).then(e=>e.datastore)}async function fs(r){const e=await Jc(r),t=e.eventManager;return t.onListen=qP.bind(null,e.syncEngine),t.onUnlisten=zP.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=KP.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=jP.bind(null,e.syncEngine),t}function g0(r){return r.asyncQueue.enqueue(async()=>{const e=await H_(r),t=await Q_(r);return e.setNetworkEnabled(!0),function(i){const s=Q(i);return s.Ea.delete(0),ca(s)}(t)})}function m0(r){return r.asyncQueue.enqueue(async()=>{const e=await H_(r),t=await Q_(r);return e.setNetworkEnabled(!1),async function(i){const s=Q(i);s.Ea.add(0),await bs(s),s.Ra.set("Offline")}(t)})}function y0(r,e){const t=new It;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await function(u,h){const p=Q(u);return p.persistence.runTransaction("read document","readonly",g=>p.localDocuments.getDocument(g,h))}(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new $(C.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const l=Rs(c,`Failed to get document '${s} from cache`);o.reject(l)}}(await th(r),e,t)),t.promise}function Y_(r,e,t={}){const n=new It;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const h=new Yc({next:g=>{h.Nu(),o.enqueueAndForget(()=>Gd(s,p));const E=g.docs.has(c);!E&&g.fromCache?u.reject(new $(C.UNAVAILABLE,"Failed to get document because the client is offline.")):E&&g.fromCache&&l&&l.source==="server"?u.reject(new $(C.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new Hd(Is(c.path),h,{includeMetadataChanges:!0,qa:!0});return jd(s,p)}(await fs(r),r.asyncQueue,e,t,n)),n.promise}function _0(r,e){const t=new It;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await mc(i,s,!0),l=new q_(s,c.Qs),u=l.ru(c.documents),h=l.applyChanges(u,!1);o.resolve(h.snapshot)}catch(c){const l=Rs(c,`Failed to execute query '${s} against cache`);o.reject(l)}}(await th(r),e,t)),t.promise}function J_(r,e,t={}){const n=new It;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const h=new Yc({next:g=>{h.Nu(),o.enqueueAndForget(()=>Gd(s,p)),g.fromCache&&l.source==="server"?u.reject(new $(C.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):u.resolve(g)},error:g=>u.reject(g)}),p=new Hd(c,h,{includeMetadataChanges:!0,qa:!0});return jd(s,p)}(await fs(r),r.asyncQueue,e,t,n)),n.promise}function w0(r,e){const t=new Yc(e);return r.asyncQueue.enqueueAndForget(async()=>function(i,s){Q(i).Ca.add(s),s.next()}(await fs(r),t)),()=>{t.Nu(),r.asyncQueue.enqueueAndForget(async()=>function(i,s){Q(i).Ca.delete(s)}(await fs(r),t))}}function E0(r,e,t,n){const i=function(o,c){let l;return l=typeof o=="string"?jy().encode(o):o,function(h,p){return new u0(h,p)}(function(h,p){if(h instanceof Uint8Array)return Jp(h,p);if(h instanceof ArrayBuffer)return Jp(new Uint8Array(h),p);if(h instanceof ReadableStream)return h.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(l),c)}(t,aa(e));r.asyncQueue.enqueueAndForget(async()=>{a0(await nh(r),i,n)})}function I0(r,e){return r.asyncQueue.enqueue(async()=>function(n,i){const s=Q(n);return s.persistence.runTransaction("Get named query","readonly",o=>s.Ii.getNamedQuery(o,i))}(await th(r),e))}/**
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
 */function X_(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zp=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Z_="firestore.googleapis.com",eg=!0;class tg{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new $(C.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=Z_,this.ssl=eg}else this.host=e.host,this.ssl=e.ssl??eg;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=u_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<qR)throw new $(C.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Gm("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=X_(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new $(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new $(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new $(C.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class la{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new tg({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new $(C.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new $(C.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new tg(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new iS;switch(n.type){case"firstParty":return new cS(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new $(C.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=Zp.get(t);n&&(q("ComponentProvider","Removing Datastore"),Zp.delete(t),n.terminate())}(this),Promise.resolve()}}function v0(r,e,t,n={}){var u;r=Ae(r,la);const i=gs(e),s=r._getSettings(),o={...s,emulatorOptions:r._getEmulatorOptions()},c=`${e}:${t}`;i&&(gg(`https://${c}`),mg("Firestore",!0)),s.host!==Z_&&s.host!==c&&Sn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l={...s,host:c,ssl:i,emulatorOptions:n};if(!pr(l,o)&&(r._setSettings(l),n.mockUserToken)){let h,p;if(typeof n.mockUserToken=="string")h=n.mockUserToken,p=pt.MOCK_USER;else{h=aE(n.mockUserToken,(u=r._app)==null?void 0:u.options.projectId);const g=n.mockUserToken.sub||n.mockUserToken.user_id;if(!g)throw new $(C.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new pt(g)}r._authCredentials=new sS(new zm(h,p))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Nt=class ew{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new ew(this.firestore,e,this._query)}},De=class ro{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new fr(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new ro(this.firestore,e,this._key)}toJSON(){return{type:ro._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(Xo(t,ro._jsonSchema))return new ro(e,n||null,new G(Ie.fromString(t.referencePath)))}};De._jsonSchemaVersion="firestore/documentReference/1.0",De._jsonSchema={type:nt("string",De._jsonSchemaVersion),referencePath:nt("string")};let fr=class tw extends Nt{constructor(e,t,n){super(e,t,Is(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new De(this.firestore,null,new G(e))}withConverter(e){return new tw(this.firestore,e,this._path)}};function nw(r,e,...t){if(r=ue(r),dd("collection","path",e),r instanceof la){const n=Ie.fromString(e,...t);return Kf(n),new fr(r,null,n)}{if(!(r instanceof De||r instanceof fr))throw new $(C.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Ie.fromString(e,...t));return Kf(n),new fr(r.firestore,null,n)}}function T0(r,e){if(r=Ae(r,la),dd("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new $(C.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new Nt(r,null,function(n){return new Fn(Ie.emptyPath(),n)}(e))}function Ec(r,e,...t){if(r=ue(r),arguments.length===1&&(e=ud.newId()),dd("doc","path",e),r instanceof la){const n=Ie.fromString(e,...t);return qf(n),new De(r,null,new G(n))}{if(!(r instanceof De||r instanceof fr))throw new $(C.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Ie.fromString(e,...t));return qf(n),new De(r.firestore,r instanceof fr?r.converter:null,new G(n))}}function rw(r,e){return r=ue(r),e=ue(e),(r instanceof De||r instanceof fr)&&(e instanceof De||e instanceof fr)&&r.firestore===e.firestore&&r.path===e.path&&r.converter===e.converter}function iw(r,e){return r=ue(r),e=ue(e),r instanceof Nt&&e instanceof Nt&&r.firestore===e.firestore&&na(r._query,e._query)&&r.converter===e.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ng="AsyncQueue";class rg{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new Bd(this,"async_queue_retry"),this._c=()=>{const n=Qa();n&&q(ng,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=Qa();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=Qa();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new It;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Cr(e))throw e;q(ng,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,Ye("INTERNAL UNHANDLED ERROR: ",ig(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=zd.createAndSchedule(this,e,t,n,s=>this.hc(s));return this.tc.push(i),i}uc(){this.nc&&J(47125,{Pc:ig(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function ig(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
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
 */function Au(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class b0{constructor(){this._progressObserver={},this._taskCompletionResolver=new It,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,n){this._progressObserver={next:e,error:t,complete:n}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const A0=-1;let Xe=class extends la{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new rg,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new rg(e),this._firestoreClient=void 0,await e}}};function Rt(r){if(r._terminated)throw new $(C.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||sw(r),r._firestoreClient}function sw(r){var n,i,s;const e=r._freezeSettings(),t=function(c,l,u,h){return new GS(c,l,u,h.host,h.ssl,h.experimentalForceLongPolling,h.experimentalAutoDetectLongPolling,X_(h.experimentalLongPollingOptions),h.useFetchStreams,h.isUsingEmulator)}(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((s=e.localCache)!=null&&s._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new f0(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(c){const l=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(l),_online:l}}(r._componentsProvider))}function S0(r,e){Sn("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return ow(r,$o.provider,{build:n=>new W_(n,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function R0(r){Sn("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();ow(r,$o.provider,{build:t=>new l0(t,e.cacheSizeBytes)})}function ow(r,e,t){if((r=Ae(r,Xe))._firestoreClient||r._terminated)throw new $(C.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new $(C.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},sw(r)}function P0(r){if(r._initialized&&!r._terminated)throw new $(C.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new It;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!In.v())return Promise.resolve();const i=n+w_;await In.delete(i)}(Md(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}}),e.promise}function C0(r){return function(t){const n=new It;return t.asyncQueue.enqueueAndForget(async()=>YP(await nh(t),n)),n.promise}(Rt(r=Ae(r,Xe)))}function k0(r){return g0(Rt(r=Ae(r,Xe)))}function x0(r){return m0(Rt(r=Ae(r,Xe)))}function D0(r,e){const t=Rt(r=Ae(r,Xe)),n=new b0;return E0(t,r._databaseId,e,n),n}function N0(r,e){return I0(Rt(r=Ae(r,Xe)),e).then(t=>t?new Nt(r,null,t.query):null)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(e){this._byteString=e}static fromBase64String(e){try{return new At(We.fromBase64String(e))}catch(t){throw new $(C.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new At(We.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:At._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Xo(e,At._jsonSchema))return At.fromBase64String(e.bytes)}}At._jsonSchemaVersion="firestore/bytes/1.0",At._jsonSchema={type:nt("string",At._jsonSchemaVersion),bytes:nt("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ar=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new $(C.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new $e(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let wi=class{constructor(e){this._methodName=e}};/**
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
 */class nn{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new $(C.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new $(C.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return ge(this._lat,e._lat)||ge(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:nn._jsonSchemaVersion}}static fromJSON(e){if(Xo(e,nn._jsonSchema))return new nn(e.latitude,e.longitude)}}nn._jsonSchemaVersion="firestore/geoPoint/1.0",nn._jsonSchema={type:nt("string",nn._jsonSchemaVersion),latitude:nt("number"),longitude:nt("number")};/**
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
 */class Tn{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:Tn._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Xo(e,Tn._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new Tn(e.vectorValues);throw new $(C.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Tn._jsonSchemaVersion="firestore/vectorValue/1.0",Tn._jsonSchema={type:nt("string",Tn._jsonSchemaVersion),vectorValues:nt("object")};/**
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
 */const V0=/^__.*__$/;class O0{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Bn(e,this.data,this.fieldMask,t,this.fieldTransforms):new vs(e,this.data,t,this.fieldTransforms)}}class aw{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Bn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function cw(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw J(40011,{Ac:r})}}class Xc{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Rc(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new Xc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.gc(e),n}yc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.Rc(),n}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Ic(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(cw(this.Ac)&&V0.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class M0{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||aa(e)}Cc(e,t,n,i=!1){return new Xc({Ac:e,methodName:t,Dc:n,path:$e.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Ei(r){const e=r._freezeSettings(),t=aa(r._databaseId);return new M0(r._databaseId,!!e.ignoreUndefinedProperties,t)}function Zc(r,e,t,n,i,s={}){const o=r.Cc(s.merge||s.mergeFields?2:0,e,t,i);lh("Data must be an object, but it was:",o,n);const c=dw(n,o);let l,u;if(s.merge)l=new Lt(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const h=[];for(const p of s.mergeFields){const g=Su(e,p,t);if(!o.contains(g))throw new $(C.INVALID_ARGUMENT,`Field '${g}' is specified in your field mask but missing from your input data.`);fw(h,g)||h.push(g)}l=new Lt(h),u=o.fieldTransforms.filter(p=>l.covers(p.field))}else l=null,u=o.fieldTransforms;return new O0(new Et(c),l,u)}class ua extends wi{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof ua}}function lw(r,e,t){return new Xc({Ac:3,Dc:e.settings.Dc,methodName:r._methodName,fc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class rh extends wi{_toFieldTransform(e){return new ia(e.path,new ss)}isEqual(e){return e instanceof rh}}class ih extends wi{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=lw(this,e,!0),n=this.vc.map(s=>Ii(s,t)),i=new ui(n);return new ia(e.path,i)}isEqual(e){return e instanceof ih&&pr(this.vc,e.vc)}}class sh extends wi{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=lw(this,e,!0),n=this.vc.map(s=>Ii(s,t)),i=new di(n);return new ia(e.path,i)}isEqual(e){return e instanceof sh&&pr(this.vc,e.vc)}}class oh extends wi{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new os(e.serializer,My(e.serializer,this.Fc));return new ia(e.path,t)}isEqual(e){return e instanceof oh&&this.Fc===e.Fc}}function ah(r,e,t,n){const i=r.Cc(1,e,t);lh("Data must be an object, but it was:",i,n);const s=[],o=Et.empty();kr(n,(l,u)=>{const h=uh(e,l,t);u=ue(u);const p=i.yc(h);if(u instanceof ua)s.push(h);else{const g=Ii(u,p);g!=null&&(s.push(h),o.set(h,g))}});const c=new Lt(s);return new aw(o,c,i.fieldTransforms)}function ch(r,e,t,n,i,s){const o=r.Cc(1,e,t),c=[Su(e,n,t)],l=[i];if(s.length%2!=0)throw new $(C.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let g=0;g<s.length;g+=2)c.push(Su(e,s[g])),l.push(s[g+1]);const u=[],h=Et.empty();for(let g=c.length-1;g>=0;--g)if(!fw(u,c[g])){const E=c[g];let N=l[g];N=ue(N);const V=o.yc(E);if(N instanceof ua)u.push(E);else{const O=Ii(N,V);O!=null&&(u.push(E),h.set(E,O))}}const p=new Lt(u);return new aw(h,p,o.fieldTransforms)}function uw(r,e,t,n=!1){return Ii(t,r.Cc(n?4:3,e))}function Ii(r,e){if(hw(r=ue(r)))return lh("Unsupported field value:",e,r),dw(r,e);if(r instanceof wi)return function(n,i){if(!cw(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(n,i){const s=[];let o=0;for(const c of n){let l=Ii(c,i.wc(o));l==null&&(l={nullValue:"NULL_VALUE"}),s.push(l),o++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=ue(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return My(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=Se.fromDate(n);return{timestampValue:as(i.serializer,s)}}if(n instanceof Se){const s=new Se(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:as(i.serializer,s)}}if(n instanceof nn)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof At)return{bytesValue:Hy(i.serializer,n._byteString)};if(n instanceof De){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.Sc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:Cd(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof Tn)return function(o,c){return{mapValue:{fields:{[_d]:{stringValue:wd},[ns]:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw c.Sc("VectorValues must only contain numeric values.");return Td(c.serializer,u)})}}}}}}(n,i);throw i.Sc(`Unsupported field value: ${Oc(n)}`)}(r,e)}function dw(r,e){const t={};return dy(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):kr(r,(n,i)=>{const s=Ii(i,e.mc(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function hw(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof Se||r instanceof nn||r instanceof At||r instanceof De||r instanceof wi||r instanceof Tn)}function lh(r,e,t){if(!hw(t)||!Wm(t)){const n=Oc(t);throw n==="an object"?e.Sc(r+" a custom object"):e.Sc(r+" "+n)}}function Su(r,e,t){if((e=ue(e))instanceof Ar)return e._internalPath;if(typeof e=="string")return uh(r,e);throw Ic("Field path arguments must be of type string or ",r,!1,void 0,t)}const L0=new RegExp("[~\\*/\\[\\]]");function uh(r,e,t){if(e.search(L0)>=0)throw Ic(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Ar(...e.split("."))._internalPath}catch{throw Ic(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ic(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(s||o)&&(l+=" (found",s&&(l+=` in field ${n}`),o&&(l+=` in document ${i}`),l+=")"),new $(C.INVALID_ARGUMENT,c+r+l)}function fw(r,e){return r.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qo{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new De(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new F0(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(el("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class F0 extends qo{data(){return super.data()}}function el(r,e){return typeof e=="string"?uh(r,e):e instanceof Ar?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pw(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new $(C.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class dh{}class da extends dh{}function ir(r,e,...t){let n=[];e instanceof dh&&n.push(e),n=n.concat(t),function(s){const o=s.filter(l=>l instanceof hh).length,c=s.filter(l=>l instanceof tl).length;if(o>1||o>0&&c>0)throw new $(C.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class tl extends da{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new tl(e,t,n)}_apply(e){const t=this._parse(e);return mw(e._query,t),new Nt(e.firestore,e.converter,hu(e._query,t))}_parse(e){const t=Ei(e.firestore);return function(s,o,c,l,u,h,p){let g;if(u.isKeyField()){if(h==="array-contains"||h==="array-contains-any")throw new $(C.INVALID_ARGUMENT,`Invalid Query. You can't perform '${h}' queries on documentId().`);if(h==="in"||h==="not-in"){og(p,h);const N=[];for(const V of p)N.push(sg(l,s,V));g={arrayValue:{values:N}}}else g=sg(l,s,p)}else h!=="in"&&h!=="not-in"&&h!=="array-contains-any"||og(p,h),g=uw(c,o,p,h==="in"||h==="not-in");return ve.create(u,h,g)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function U0(r,e,t){const n=e,i=el("where",r);return tl._create(i,n,t)}class hh extends dh{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new hh(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:Re.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(i,s){let o=i;const c=s.getFlattenedFilters();for(const l of c)mw(o,l),o=hu(o,l)}(e._query,t),new Nt(e.firestore,e.converter,hu(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class fh extends da{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new fh(e,t)}_apply(e){const t=function(i,s,o){if(i.startAt!==null)throw new $(C.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new $(C.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Lo(s,o)}(e._query,this._field,this._direction);return new Nt(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new Fn(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,t))}}function B0(r,e="asc"){const t=e,n=el("orderBy",r);return fh._create(n,t)}class nl extends da{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new nl(e,t,n)}_apply(e){return new Nt(e.firestore,e.converter,dc(e._query,this._limit,this._limitType))}}function $0(r){return Hm("limit",r),nl._create("limit",r,"F")}function q0(r){return Hm("limitToLast",r),nl._create("limitToLast",r,"L")}class rl extends da{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new rl(e,t,n)}_apply(e){const t=gw(e,this.type,this._docOrFields,this._inclusive);return new Nt(e.firestore,e.converter,function(i,s){return new Fn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(e._query,t))}}function K0(...r){return rl._create("startAt",r,!0)}function z0(...r){return rl._create("startAfter",r,!1)}class il extends da{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new il(e,t,n)}_apply(e){const t=gw(e,this.type,this._docOrFields,this._inclusive);return new Nt(e.firestore,e.converter,function(i,s){return new Fn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(e._query,t))}}function j0(...r){return il._create("endBefore",r,!1)}function G0(...r){return il._create("endAt",r,!0)}function gw(r,e,t,n){if(t[0]=ue(t[0]),t[0]instanceof qo)return function(s,o,c,l,u){if(!l)throw new $(C.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const h=[];for(const p of zi(s))if(p.field.isKeyField())h.push(ci(o,l.key));else{const g=l.data.field(p.field);if(Bc(g))throw new $(C.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(g===null){const E=p.field.canonicalString();throw new $(C.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${E}' (used as the orderBy) does not exist.`)}h.push(g)}return new vr(h,u)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const i=Ei(r.firestore);return function(o,c,l,u,h,p){const g=o.explicitOrderBy;if(h.length>g.length)throw new $(C.INVALID_ARGUMENT,`Too many arguments provided to ${u}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const E=[];for(let N=0;N<h.length;N++){const V=h[N];if(g[N].field.isKeyField()){if(typeof V!="string")throw new $(C.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${u}(), but got a ${typeof V}`);if(!Id(o)&&V.indexOf("/")!==-1)throw new $(C.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${u}() must be a plain document ID, but '${V}' contains a slash.`);const O=o.path.child(Ie.fromString(V));if(!G.isDocumentKey(O))throw new $(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${u}() must result in a valid document path, but '${O}' is not because it contains an odd number of segments.`);const Y=new G(O);E.push(ci(c,Y))}else{const O=uw(l,u,V);E.push(O)}}return new vr(E,p)}(r._query,r.firestore._databaseId,i,e,t,n)}}function sg(r,e,t){if(typeof(t=ue(t))=="string"){if(t==="")throw new $(C.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Id(e)&&t.indexOf("/")!==-1)throw new $(C.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(Ie.fromString(t));if(!G.isDocumentKey(n))throw new $(C.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return ci(r,new G(n))}if(t instanceof De)return ci(r,t._key);throw new $(C.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Oc(t)}.`)}function og(r,e){if(!Array.isArray(r)||r.length===0)throw new $(C.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function mw(r,e){const t=function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new $(C.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new $(C.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class ph{convertValue(e,t="none"){switch(Er(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Fe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(On(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw J(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return kr(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var n,i,s;const t=(s=(i=(n=e.fields)==null?void 0:n[ns].arrayValue)==null?void 0:i.values)==null?void 0:s.map(o=>Fe(o.doubleValue));return new Tn(t)}convertGeoPoint(e){return new nn(Fe(e.latitude),Fe(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=$c(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(Vo(e));default:return null}}convertTimestamp(e){const t=Vn(e);return new Se(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=Ie.fromString(e);te(s_(n),9688,{name:e});const i=new wr(n.get(1),n.get(3)),s=new G(n.popFirst(5));return i.isEqual(t)||Ye(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sl(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class W0 extends ph{constructor(e){super(),this.firestore=e}convertBytes(e){return new At(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new De(this.firestore,null,t)}}class Zr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}let Yt=class yw extends qo{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new wo(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(el("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new $(C.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=yw._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}};Yt._jsonSchemaVersion="firestore/documentSnapshot/1.0",Yt._jsonSchema={type:nt("string",Yt._jsonSchemaVersion),bundleSource:nt("string","DocumentSnapshot"),bundleName:nt("string"),bundle:nt("string")};let wo=class extends Yt{data(e={}){return super.data(e)}},rn=class _w{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new Zr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new wo(this._firestore,this._userDataWriter,n.key,n,new Zr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new $(C.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(c=>{const l=new wo(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Zr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(c=>s||c.type!==3).map(c=>{const l=new wo(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Zr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let u=-1,h=-1;return c.type!==0&&(u=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),h=o.indexOf(c.doc.key)),{type:H0(c.type),doc:l,oldIndex:u,newIndex:h}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new $(C.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=_w._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=ud.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach(s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}};function H0(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return J(61501,{type:r})}}function ww(r,e){return r instanceof Yt&&e instanceof Yt?r._firestore===e._firestore&&r._key.isEqual(e._key)&&(r._document===null?e._document===null:r._document.isEqual(e._document))&&r._converter===e._converter:r instanceof rn&&e instanceof rn&&r._firestore===e._firestore&&iw(r.query,e.query)&&r.metadata.isEqual(e.metadata)&&r._snapshot.isEqual(e._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Q0(r){r=Ae(r,De);const e=Ae(r.firestore,Xe);return Y_(Rt(e),r._key).then(t=>gh(e,r,t))}rn._jsonSchemaVersion="firestore/querySnapshot/1.0",rn._jsonSchema={type:nt("string",rn._jsonSchemaVersion),bundleSource:nt("string","QuerySnapshot"),bundleName:nt("string"),bundle:nt("string")};class vi extends ph{constructor(e){super(),this.firestore=e}convertBytes(e){return new At(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new De(this.firestore,null,t)}}function Y0(r){r=Ae(r,De);const e=Ae(r.firestore,Xe),t=Rt(e),n=new vi(e);return y0(t,r._key).then(i=>new Yt(e,n,r._key,i,new Zr(i!==null&&i.hasLocalMutations,!0),r.converter))}function J0(r){r=Ae(r,De);const e=Ae(r.firestore,Xe);return Y_(Rt(e),r._key,{source:"server"}).then(t=>gh(e,r,t))}function X0(r){r=Ae(r,Nt);const e=Ae(r.firestore,Xe),t=Rt(e),n=new vi(e);return pw(r._query),J_(t,r._query).then(i=>new rn(e,n,r,i))}function Z0(r){r=Ae(r,Nt);const e=Ae(r.firestore,Xe),t=Rt(e),n=new vi(e);return _0(t,r._query).then(i=>new rn(e,n,r,i))}function eC(r){r=Ae(r,Nt);const e=Ae(r.firestore,Xe),t=Rt(e),n=new vi(e);return J_(t,r._query,{source:"server"}).then(i=>new rn(e,n,r,i))}function ag(r,e,t){r=Ae(r,De);const n=Ae(r.firestore,Xe),i=sl(r.converter,e,t);return ha(n,[Zc(Ei(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,qe.none())])}function cg(r,e,t,...n){r=Ae(r,De);const i=Ae(r.firestore,Xe),s=Ei(i);let o;return o=typeof(e=ue(e))=="string"||e instanceof Ar?ch(s,"updateDoc",r._key,e,t,n):ah(s,"updateDoc",r._key,e),ha(i,[o.toMutation(r._key,qe.exists(!0))])}function tC(r){return ha(Ae(r.firestore,Xe),[new Ts(r._key,qe.none())])}function nC(r,e){const t=Ae(r.firestore,Xe),n=Ec(r),i=sl(r.converter,e);return ha(t,[Zc(Ei(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,qe.exists(!1))]).then(()=>n)}function Ew(r,...e){var l,u,h;r=ue(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||Au(e[n])||(t=e[n++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Au(e[n])){const p=e[n];e[n]=(l=p.next)==null?void 0:l.bind(p),e[n+1]=(u=p.error)==null?void 0:u.bind(p),e[n+2]=(h=p.complete)==null?void 0:h.bind(p)}let s,o,c;if(r instanceof De)o=Ae(r.firestore,Xe),c=Is(r._key.path),s={next:p=>{e[n]&&e[n](gh(o,r,p))},error:e[n+1],complete:e[n+2]};else{const p=Ae(r,Nt);o=Ae(p.firestore,Xe),c=p._query;const g=new vi(o);s={next:E=>{e[n]&&e[n](new rn(o,g,p,E))},error:e[n+1],complete:e[n+2]},pw(r._query)}return function(g,E,N,V){const O=new Yc(V),Y=new Hd(E,O,N);return g.asyncQueue.enqueueAndForget(async()=>jd(await fs(g),Y)),()=>{O.Nu(),g.asyncQueue.enqueueAndForget(async()=>Gd(await fs(g),Y))}}(Rt(o),c,i,s)}function rC(r,e){return w0(Rt(r=Ae(r,Xe)),Au(e)?e:{next:e})}function ha(r,e){return function(n,i){const s=new It;return n.asyncQueue.enqueueAndForget(async()=>GP(await nh(n),i,s)),s.promise}(Rt(r),e)}function gh(r,e,t){const n=t.docs.get(e._key),i=new vi(r);return new Yt(r,i,e._key,n,new Zr(t.hasPendingWrites,t.fromCache),e.converter)}/**
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
 */const iC={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let sC=class{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Ei(e)}set(e,t,n){this._verifyNotCommitted();const i=cr(e,this._firestore),s=sl(i.converter,t,n),o=Zc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,qe.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=cr(e,this._firestore);let o;return o=typeof(t=ue(t))=="string"||t instanceof Ar?ch(this._dataReader,"WriteBatch.update",s._key,t,n,i):ah(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,qe.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=cr(e,this._firestore);return this._mutations=this._mutations.concat(new Ts(t._key,qe.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new $(C.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}};function cr(r,e){if((r=ue(r)).firestore!==e)throw new $(C.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oC{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=Ei(e)}get(e){const t=cr(e,this._firestore),n=new W0(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return J(24041);const s=i[0];if(s.isFoundDocument())return new qo(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new qo(this._firestore,n,t._key,null,t.converter);throw J(18433,{doc:s})})}set(e,t,n){const i=cr(e,this._firestore),s=sl(i.converter,t,n),o=Zc(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=cr(e,this._firestore);let o;return o=typeof(t=ue(t))=="string"||t instanceof Ar?ch(this._dataReader,"Transaction.update",s._key,t,n,i):ah(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=cr(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let aC=class extends oC{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=cr(e,this._firestore),n=new vi(this._firestore);return super.get(e).then(i=>new Yt(this._firestore,n,t._key,i._document,new Zr(!1,!1),t.converter))}};function cC(r,e,t){r=Ae(r,Xe);const n={...iC,...t};return function(s){if(s.maxAttempts<1)throw new $(C.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(s,o,c){const l=new It;return s.asyncQueue.enqueueAndForget(async()=>{const u=await p0(s);new h0(s.asyncQueue,u,c,o,l).ju()}),l.promise}(Rt(r),i=>e(new aC(r,i)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lC(){return new ua("deleteField")}function uC(){return new rh("serverTimestamp")}function dC(...r){return new ih("arrayUnion",r)}function hC(...r){return new sh("arrayRemove",r)}function fC(r){return new oh("increment",r)}(function(e,t=!0){(function(i){Es=i})(Sr),yr(new bn("firestore",(n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new Xe(new oS(n.getProvider("auth-internal")),new lS(o,n.getProvider("app-check-internal")),function(u,h){if(!Object.prototype.hasOwnProperty.apply(u.options,["projectId"]))throw new $(C.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new wr(u.options.projectId,h)}(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c},"PUBLIC").setMultipleInstances(!0)),tn(Ff,Uf,e),tn(Ff,Uf,"esm2020")})();const pC="@firebase/firestore-compat",gC="0.4.3";/**
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
 */function mh(r,e){if(e===void 0)return{merge:!1};if(e.mergeFields!==void 0&&e.merge!==void 0)throw new $("invalid-argument",`Invalid options passed to function ${r}(): You cannot specify both "merge" and "mergeFields".`);return e}/**
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
 */function lg(){if(typeof Uint8Array>"u")throw new $("unimplemented","Uint8Arrays are not available in this environment.")}function ug(){if(!zS())throw new $("unimplemented","Blobs are unavailable in Firestore in this environment.")}let Iw=class Ru{constructor(e){this._delegate=e}static fromBase64String(e){return ug(),new Ru(At.fromBase64String(e))}static fromUint8Array(e){return lg(),new Ru(At.fromUint8Array(e))}toBase64(){return ug(),this._delegate.toBase64()}toUint8Array(){return lg(),this._delegate.toUint8Array()}isEqual(e){return this._delegate.isEqual(e._delegate)}toString(){return"Blob(base64: "+this.toBase64()+")"}};/**
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
 */function Pu(r){return mC(r,["next","error","complete"])}function mC(r,e){if(typeof r!="object"||r===null)return!1;const t=r;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}/**
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
 */class yC{enableIndexedDbPersistence(e,t){return S0(e._delegate,{forceOwnership:t})}enableMultiTabIndexedDbPersistence(e){return R0(e._delegate)}clearIndexedDbPersistence(e){return P0(e._delegate)}}class vw{constructor(e,t,n){this._delegate=t,this._persistenceProvider=n,this.INTERNAL={delete:()=>this.terminate()},e instanceof wr||(this._appCompat=e)}get _databaseId(){return this._delegate._databaseId}settings(e){const t=this._delegate._getSettings();!e.merge&&t.host!==e.host&&Sn("You are overriding the original host. If you did not intend to override your settings, use {merge: true}."),e.merge&&(e={...t,...e},delete e.merge),this._delegate._setSettings(e)}useEmulator(e,t,n={}){v0(this._delegate,e,t,n)}enableNetwork(){return k0(this._delegate)}disableNetwork(){return x0(this._delegate)}enablePersistence(e){let t=!1,n=!1;return e&&(t=!!e.synchronizeTabs,n=!!e.experimentalForceOwningTab,Gm("synchronizeTabs",t,"experimentalForceOwningTab",n)),t?this._persistenceProvider.enableMultiTabIndexedDbPersistence(this):this._persistenceProvider.enableIndexedDbPersistence(this,n)}clearPersistence(){return this._persistenceProvider.clearIndexedDbPersistence(this)}terminate(){return this._appCompat&&(this._appCompat._removeServiceInstance("firestore-compat"),this._appCompat._removeServiceInstance("firestore")),this._delegate._delete()}waitForPendingWrites(){return C0(this._delegate)}onSnapshotsInSync(e){return rC(this._delegate,e)}get app(){if(!this._appCompat)throw new $("failed-precondition","Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._appCompat}collection(e){try{return new ps(this,nw(this._delegate,e))}catch(t){throw Ct(t,"collection()","Firestore.collection()")}}doc(e){try{return new Qt(this,Ec(this._delegate,e))}catch(t){throw Ct(t,"doc()","Firestore.doc()")}}collectionGroup(e){try{return new Pt(this,T0(this._delegate,e))}catch(t){throw Ct(t,"collectionGroup()","Firestore.collectionGroup()")}}runTransaction(e){return cC(this._delegate,t=>e(new Tw(this,t)))}batch(){return Rt(this._delegate),new bw(new sC(this._delegate,e=>ha(this._delegate,e)))}loadBundle(e){return D0(this._delegate,e)}namedQuery(e){return N0(this._delegate,e).then(t=>t?new Pt(this,t):null)}}class ol extends ph{constructor(e){super(),this.firestore=e}convertBytes(e){return new Iw(new At(e))}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return Qt.forKey(t,this.firestore,null)}}function _C(r){nS(r)}class Tw{constructor(e,t){this._firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}get(e){const t=ei(e);return this._delegate.get(t).then(n=>new Ko(this._firestore,new Yt(this._firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,t.converter)))}set(e,t,n){const i=ei(e);return n?(mh("Transaction.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=ei(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=ei(e);return this._delegate.delete(t),this}}class bw{constructor(e){this._delegate=e}set(e,t,n){const i=ei(e);return n?(mh("WriteBatch.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=ei(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=ei(e);return this._delegate.delete(t),this}commit(){return this._delegate.commit()}}class mi{constructor(e,t,n){this._firestore=e,this._userDataWriter=t,this._delegate=n}fromFirestore(e,t){const n=new wo(this._firestore._delegate,this._userDataWriter,e._key,e._document,e.metadata,null);return this._delegate.fromFirestore(new zo(this._firestore,n),t??{})}toFirestore(e,t){return t?this._delegate.toFirestore(e,t):this._delegate.toFirestore(e)}static getInstance(e,t){const n=mi.INSTANCES;let i=n.get(e);i||(i=new WeakMap,n.set(e,i));let s=i.get(t);return s||(s=new mi(e,new ol(e),t),i.set(t,s)),s}}mi.INSTANCES=new WeakMap;class Qt{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}static forPath(e,t,n){if(e.length%2!==0)throw new $("invalid-argument",`Invalid document reference. Document references must have an even number of segments, but ${e.canonicalString()} has ${e.length}`);return new Qt(t,new De(t._delegate,n,new G(e)))}static forKey(e,t,n){return new Qt(t,new De(t._delegate,n,e))}get id(){return this._delegate.id}get parent(){return new ps(this.firestore,this._delegate.parent)}get path(){return this._delegate.path}collection(e){try{return new ps(this.firestore,nw(this._delegate,e))}catch(t){throw Ct(t,"collection()","DocumentReference.collection()")}}isEqual(e){return e=ue(e),e instanceof De?rw(this._delegate,e):!1}set(e,t){t=mh("DocumentReference.set",t);try{return t?ag(this._delegate,e,t):ag(this._delegate,e)}catch(n){throw Ct(n,"setDoc()","DocumentReference.set()")}}update(e,t,...n){try{return arguments.length===1?cg(this._delegate,e):cg(this._delegate,e,t,...n)}catch(i){throw Ct(i,"updateDoc()","DocumentReference.update()")}}delete(){return tC(this._delegate)}onSnapshot(...e){const t=Aw(e),n=Sw(e,i=>new Ko(this.firestore,new Yt(this.firestore._delegate,this._userDataWriter,i._key,i._document,i.metadata,this._delegate.converter)));return Ew(this._delegate,t,n)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=Y0(this._delegate):(e==null?void 0:e.source)==="server"?t=J0(this._delegate):t=Q0(this._delegate),t.then(n=>new Ko(this.firestore,new Yt(this.firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,this._delegate.converter)))}withConverter(e){return new Qt(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function Ct(r,e,t){return r.message=r.message.replace(e,t),r}function Aw(r){for(const e of r)if(typeof e=="object"&&!Pu(e))return e;return{}}function Sw(r,e){var n,i;let t;return Pu(r[0])?t=r[0]:Pu(r[1])?t=r[1]:typeof r[0]=="function"?t={next:r[0],error:r[1],complete:r[2]}:t={next:r[1],error:r[2],complete:r[3]},{next:s=>{t.next&&t.next(e(s))},error:(n=t.error)==null?void 0:n.bind(t),complete:(i=t.complete)==null?void 0:i.bind(t)}}class Ko{constructor(e,t){this._firestore=e,this._delegate=t}get ref(){return new Qt(this._firestore,this._delegate.ref)}get id(){return this._delegate.id}get metadata(){return this._delegate.metadata}get exists(){return this._delegate.exists()}data(e){return this._delegate.data(e)}get(e,t){return this._delegate.get(e,t)}isEqual(e){return ww(this._delegate,e._delegate)}}class zo extends Ko{data(e){const t=this._delegate.data(e);return this._delegate._converter||rS(t!==void 0,"Document in a QueryDocumentSnapshot should exist"),t}}class Pt{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}where(e,t,n){try{return new Pt(this.firestore,ir(this._delegate,U0(e,t,n)))}catch(i){throw Ct(i,/(orderBy|where)\(\)/,"Query.$1()")}}orderBy(e,t){try{return new Pt(this.firestore,ir(this._delegate,B0(e,t)))}catch(n){throw Ct(n,/(orderBy|where)\(\)/,"Query.$1()")}}limit(e){try{return new Pt(this.firestore,ir(this._delegate,$0(e)))}catch(t){throw Ct(t,"limit()","Query.limit()")}}limitToLast(e){try{return new Pt(this.firestore,ir(this._delegate,q0(e)))}catch(t){throw Ct(t,"limitToLast()","Query.limitToLast()")}}startAt(...e){try{return new Pt(this.firestore,ir(this._delegate,K0(...e)))}catch(t){throw Ct(t,"startAt()","Query.startAt()")}}startAfter(...e){try{return new Pt(this.firestore,ir(this._delegate,z0(...e)))}catch(t){throw Ct(t,"startAfter()","Query.startAfter()")}}endBefore(...e){try{return new Pt(this.firestore,ir(this._delegate,j0(...e)))}catch(t){throw Ct(t,"endBefore()","Query.endBefore()")}}endAt(...e){try{return new Pt(this.firestore,ir(this._delegate,G0(...e)))}catch(t){throw Ct(t,"endAt()","Query.endAt()")}}isEqual(e){return iw(this._delegate,e._delegate)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=Z0(this._delegate):(e==null?void 0:e.source)==="server"?t=eC(this._delegate):t=X0(this._delegate),t.then(n=>new Cu(this.firestore,new rn(this.firestore._delegate,this._userDataWriter,this._delegate,n._snapshot)))}onSnapshot(...e){const t=Aw(e),n=Sw(e,i=>new Cu(this.firestore,new rn(this.firestore._delegate,this._userDataWriter,this._delegate,i._snapshot)));return Ew(this._delegate,t,n)}withConverter(e){return new Pt(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}class wC{constructor(e,t){this._firestore=e,this._delegate=t}get type(){return this._delegate.type}get doc(){return new zo(this._firestore,this._delegate.doc)}get oldIndex(){return this._delegate.oldIndex}get newIndex(){return this._delegate.newIndex}}class Cu{constructor(e,t){this._firestore=e,this._delegate=t}get query(){return new Pt(this._firestore,this._delegate.query)}get metadata(){return this._delegate.metadata}get size(){return this._delegate.size}get empty(){return this._delegate.empty}get docs(){return this._delegate.docs.map(e=>new zo(this._firestore,e))}docChanges(e){return this._delegate.docChanges(e).map(t=>new wC(this._firestore,t))}forEach(e,t){this._delegate.forEach(n=>{e.call(t,new zo(this._firestore,n))})}isEqual(e){return ww(this._delegate,e._delegate)}}class ps extends Pt{constructor(e,t){super(e,t),this.firestore=e,this._delegate=t}get id(){return this._delegate.id}get path(){return this._delegate.path}get parent(){const e=this._delegate.parent;return e?new Qt(this.firestore,e):null}doc(e){try{return e===void 0?new Qt(this.firestore,Ec(this._delegate)):new Qt(this.firestore,Ec(this._delegate,e))}catch(t){throw Ct(t,"doc()","CollectionReference.doc()")}}add(e){return nC(this._delegate,e).then(t=>new Qt(this.firestore,t))}isEqual(e){return rw(this._delegate,e._delegate)}withConverter(e){return new ps(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function ei(r){return Ae(r,De)}/**
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
 */class yh{constructor(...e){this._delegate=new Ar(...e)}static documentId(){return new yh($e.keyField().canonicalString())}isEqual(e){return e=ue(e),e instanceof Ar?this._delegate._internalPath.isEqual(e._internalPath):!1}}/**
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
 */class Yr{static serverTimestamp(){const e=uC();return e._methodName="FieldValue.serverTimestamp",new Yr(e)}static delete(){const e=lC();return e._methodName="FieldValue.delete",new Yr(e)}static arrayUnion(...e){const t=dC(...e);return t._methodName="FieldValue.arrayUnion",new Yr(t)}static arrayRemove(...e){const t=hC(...e);return t._methodName="FieldValue.arrayRemove",new Yr(t)}static increment(e){const t=fC(e);return t._methodName="FieldValue.increment",new Yr(t)}constructor(e){this._delegate=e}isEqual(e){return this._delegate.isEqual(e._delegate)}}/**
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
 */const EC={Firestore:vw,GeoPoint:nn,Timestamp:Se,Blob:Iw,Transaction:Tw,WriteBatch:bw,DocumentReference:Qt,DocumentSnapshot:Ko,Query:Pt,QueryDocumentSnapshot:zo,QuerySnapshot:Cu,CollectionReference:ps,FieldPath:yh,FieldValue:Yr,setLogLevel:_C,CACHE_SIZE_UNLIMITED:A0};function IC(r,e){r.INTERNAL.registerComponent(new bn("firestore-compat",t=>{const n=t.getProvider("app-compat").getImmediate(),i=t.getProvider("firestore").getImmediate();return e(n,i)},"PUBLIC").setServiceProps({...EC}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vC(r){IC(r,(e,t)=>new vw(e,t,new yC)),r.registerVersion(pC,gC)}vC(Be);var TC={};const bC=(()=>{var r;if(typeof process<"u"&&TC)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),ot=(...r)=>bC&&console.log("[Firestore]",...r),Rw="test_",_h={soil:"soilSamples",water:"waterSamples",compost:"compostSamples",heavyMetal:"heavyMetalSamples","heavy-metal":"heavyMetalSamples",pesticide:"pesticideSamples"};function qn(r,e){const t=_h[r]||r;return`${Rw}${t}_${e}`}function Pw(r){return r==null?"":String(r)}function dg(r){return Array.isArray(r)?r.map(e=>({...e,id:Pw(e.id)})):r}async function AC(r,e,t,n){var i,s,o,c;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!1;try{const l=window.firebaseConfig.getDb();if(!l)return!1;const u=qn(r,e);let h=n,p=!1;if((s=window.encryptionManager)!=null&&s.isReady()&&window.CryptoUtils)try{const E=window.encryptionManager.getKey();h=await window.CryptoUtils.encryptRecord(n,E),p=!!h._enc,p&&ot(`문서 암호화 완료: ${t} (필드: ${Object.keys(h._enc).join(", ")})`)}catch(E){return console.error(`[Firestore] 암호화 실패 (${t}):`,E.message),!1}const g={...h,updatedAt:Be.firestore.FieldValue.serverTimestamp(),syncedAt:Be.firestore.FieldValue.serverTimestamp()};if(p&&((o=window.CryptoUtils)!=null&&o.SENSITIVE_FIELDS))for(const E of window.CryptoUtils.SENSITIVE_FIELDS)(!(E in g)||g[E]===void 0)&&(g[E]=Be.firestore.FieldValue.delete());return await l.collection(u).doc(t).set(g,{merge:!0}),ot(`저장 완료: ${u}/${t}`),!0}catch(l){return(((c=window.logger)==null?void 0:c.error)||console.error)("Firestore 저장 실패:",l),!1}}async function SC(r,e,t){var n,i,s,o,c;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const l=window.firebaseConfig.getDb();if(!l)return null;const u=qn(r,e),h=await l.collection(u).doc(t).get();if(h.exists){let p={id:h.id,...h.data()};if(p._enc&&((i=window.encryptionManager)!=null&&i.isReady())&&window.CryptoUtils)try{const g=window.encryptionManager.getKey(),E=Object.keys(p._enc);ot(`문서 복호화 시도: ${t} (암호화 필드: ${E.join(", ")})`),p=await window.CryptoUtils.decryptRecord(p,g),ot("문서 복호화 완료:",t)}catch(g){console.error(`[Firestore] 문서 복호화 실패: ${t}`,g.message),console.error("[Firestore] 복호화 실패 상세 - 키소스:",window.encryptionManager.getKeySource(),", _enc 필드:",Object.keys(p._enc||{}))}else p._enc&&!((s=window.encryptionManager)!=null&&s.isReady())&&console.warn(`[Firestore] 암호화된 문서이나 키 미준비: ${t} (encManager ready: ${(o=window.encryptionManager)==null?void 0:o.isReady()}, CryptoUtils: ${!!window.CryptoUtils})`);return p}return null}catch(l){return(((c=window.logger)==null?void 0:c.error)||console.error)("Firestore 조회 실패:",l),null}}async function RC(r,e,t={}){var n,i,s,o,c;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return[];try{const l=window.firebaseConfig.getDb();if(!l)return[];const u=qn(r,e);let h=l.collection(u);if(!t.skipOrder)try{h=h.orderBy("createdAt","asc")}catch{try{h=h.orderBy("updatedAt","asc")}catch(V){(((i=window.logger)==null?void 0:i.warn)||console.warn)("[Firestore] 인덱스 없음, 정렬 없이 조회:",V.message)}}const p=await h.get(),g=[];p.forEach(N=>{g.push({id:N.id,...N.data()})}),t.skipOrder&&g.length>0&&g.sort((N,V)=>{var ee,X,de,he;const O=((ee=N.createdAt)==null?void 0:ee.seconds)||((X=N.updatedAt)==null?void 0:X.seconds)||0,Y=((de=V.createdAt)==null?void 0:de.seconds)||((he=V.updatedAt)==null?void 0:he.seconds)||0;return O-Y}),ot(`조회 완료: ${u} (${g.length}건)`);const E=g.filter(N=>N._enc).length;if((s=window.encryptionManager)!=null&&s.isReady()&&window.CryptoUtils){E>0&&ot(`일괄 복호화 시도: ${E}/${g.length}건 암호화됨`);try{const N=window.encryptionManager.getKey(),V=await window.CryptoUtils.decryptRecords(g,N),O=V.filter(Y=>Y._enc);return O.length>0&&console.warn(`[Firestore] 부분 복호화 실패: ${O.length}건 (IDs: ${O.map(Y=>Y.id).join(", ")})`),ot(`복호화 완료: ${V.length}건 (실패: ${O.length}건)`),dg(V)}catch(N){console.error("[Firestore] 일괄 복호화 실패:",N.message),console.error("[Firestore] 키소스:",window.encryptionManager.getKeySource())}}else E>0&&console.warn(`[Firestore] 암호화된 문서 ${E}건이 있으나 키 미준비 (encManager: ${!!window.encryptionManager}, ready: ${(o=window.encryptionManager)==null?void 0:o.isReady()}, CryptoUtils: ${!!window.CryptoUtils})`);return dg(g)}catch(l){return(((c=window.logger)==null?void 0:c.error)||console.error)("Firestore 전체 조회 실패:",l),[]}}async function PC(r,e,t){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return!1;try{const i=window.firebaseConfig.getDb();if(!i)return!1;const s=qn(r,e),o=String(typeof t=="number"?t:t||""),c=parseInt(o,10);if(!o)return!1;const l=i.collection(s).doc(o);if((await l.get()).exists)return await l.delete(),ot(`삭제 완료: ${s}/${o}`),!0;let h=await i.collection(s).where("id","==",o).get();if(h.empty&&!isNaN(c)&&(h=await i.collection(s).where("id","==",c).get()),h.empty)return ot(`삭제 대상 없음: ${s}/${o}`),!1;const p=[];return h.forEach(g=>{p.push(g.ref.delete())}),await Promise.all(p),ot(`삭제 완료 (쿼리): ${s}/${o} (${h.size}건)`),!0}catch(i){return console.error("Firestore 삭제 실패:",i),!1}}async function Cw(r,e,t){var n,i,s;if(!((n=window.firebaseConfig)!=null&&n.isEnabled())||!t.length)return!1;try{const o=window.firebaseConfig.getDb();if(!o)return!1;const c=qn(r,e);let l=t,u=!1;if((i=window.encryptionManager)!=null&&i.isReady()&&window.CryptoUtils)try{const g=window.encryptionManager.getKey();l=await window.CryptoUtils.encryptRecords(t,g),u=l.some(E=>E._enc),ot(`배치 암호화 완료: ${l.length}건`)}catch(g){return console.error("[Firestore] 배치 암호화 실패, 저장 중단:",g.message),!1}const h=450,p=[];for(let g=0;g<l.length;g+=h)p.push(l.slice(g,g+h));ot(`배치 저장 시작: ${c} (${l.length}건, ${p.length}개 청크)`);for(let g=0;g<p.length;g++){const E=p[g],N=o.batch();E.forEach(V=>{var X;let O=Pw(V.id).trim();O||(O=kw());const Y={...V,id:O,updatedAt:Be.firestore.FieldValue.serverTimestamp(),syncedAt:Be.firestore.FieldValue.serverTimestamp()};if(u&&V._enc&&((X=window.CryptoUtils)!=null&&X.SENSITIVE_FIELDS))for(const de of window.CryptoUtils.SENSITIVE_FIELDS)(!(de in Y)||Y[de]===void 0)&&(Y[de]=Be.firestore.FieldValue.delete());const ee=o.collection(c).doc(O);N.set(ee,Y,{merge:!0})}),await N.commit(),ot(`청크 ${g+1}/${p.length} 완료 (${E.length}건)`)}return ot(`배치 저장 완료: ${c} (${t.length}건)`),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("Firestore 배치 저장 실패:",o),!1}}async function CC(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return{success:!1,count:0};try{const s=localStorage.getItem(t);if(!s)return ot("마이그레이션할 데이터가 없습니다."),{success:!0,count:0};const o=JSON.parse(s);if(!Array.isArray(o)||o.length===0)return{success:!0,count:0};const c=o.map(l=>({...l,id:l.id||kC()}));return await Cw(r,e,c),ot(`마이그레이션 완료: ${t} → Firestore (${c.length}건)`),{success:!0,count:c.length}}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("마이그레이션 실패:",s),{success:!1,count:0}}}function kw(){return typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),r=>r.toString(36)).join("").substring(0,9)}function kC(){return kw()}function xC(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=qn(r,e),c=s.collection(o).orderBy("updatedAt","desc").onSnapshot(async l=>{var g;const u=[];l.forEach(E=>{u.push({id:E.id,...E.data()})});let h=u;const p=u.filter(E=>E._enc).length;if((g=window.encryptionManager)!=null&&g.isReady()&&window.CryptoUtils)try{const E=window.encryptionManager.getKey();h=await window.CryptoUtils.decryptRecords(u,E),p>0&&ot(`실시간 동기화 복호화: ${p}건 처리`)}catch(E){console.error("[Firestore] 실시간 동기화 복호화 실패:",E.message,"(암호화 문서:",p,"건)")}else p>0&&console.warn(`[Firestore] 실시간 동기화: 암호화된 문서 ${p}건이 있으나 키 미준비`);t(h,l.metadata.fromCache)},l=>{var u;(((u=window.logger)==null?void 0:u.error)||console.error)("실시간 동기화 에러:",l)});return ot(`실시간 동기화 시작: ${o}`),c}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("실시간 동기화 설정 실패:",s),null}}function xw(){var r;return((r=window.firebaseConfig)==null?void 0:r.isEnabled())===!0}function DC(){var r;return((r=window.firebaseConfig)==null?void 0:r.isOfflineSupported())===!0}async function Dw(r,e){var t,n;if(!((t=window.firebaseConfig)!=null&&t.isEnabled()))return{success:!1,total:0,reEncrypted:0,failed:0,plaintext:0,error:"Firebase not enabled"};if(!((n=window.encryptionManager)!=null&&n.isReady())||!window.CryptoUtils)return{success:!1,total:0,reEncrypted:0,failed:0,plaintext:0,error:"Encryption not ready"};try{const i=window.firebaseConfig.getDb();if(!i)return{success:!1,total:0,reEncrypted:0,failed:0,plaintext:0,error:"No DB"};const s=qn(r,e),o=window.encryptionManager.getKey();console.log(`[ReEncrypt] Starting re-encryption: ${s}`);const c=await i.collection(s).get(),l=c.size;let u=0,h=0,p=0;console.log(`[ReEncrypt] Found ${l} documents in ${s}`);const g=200,E=[];c.forEach(V=>E.push({ref:V.ref,id:V.id,data:V.data()}));for(let V=0;V<E.length;V+=g){const O=E.slice(V,V+g),Y=i.batch();for(const{ref:ee,id:X,data:de}of O)try{if(!de._enc){const y=await window.CryptoUtils.encryptRecord({...de},o);if(y._enc){const _={...y};for(const v of window.CryptoUtils.SENSITIVE_FIELDS)(!(v in _)||_[v]===void 0)&&(_[v]=Be.firestore.FieldValue.delete());_.updatedAt=Be.firestore.FieldValue.serverTimestamp(),Y.set(ee,_,{merge:!0}),p++}continue}if(!window.CryptoUtils.SENSITIVE_FIELDS.some(y=>de[y]&&de[y]!=="[복호화 실패]"))try{const y=await window.CryptoUtils.decryptRecord({...de},o);console.log(`[ReEncrypt] ${X}: already correctly encrypted, skip`);continue}catch{console.error(`[ReEncrypt] ${X}: UNRECOVERABLE - no plaintext, wrong key`),h++;continue}console.log(`[ReEncrypt] ${X}: has plaintext fields, re-encrypting...`);const ye={...de};delete ye._enc;const I=await window.CryptoUtils.encryptRecord(ye,o);if(I._enc){const y={...I};for(const _ of window.CryptoUtils.SENSITIVE_FIELDS)(!(_ in y)||y[_]===void 0)&&(y[_]=Be.firestore.FieldValue.delete());y.updatedAt=Be.firestore.FieldValue.serverTimestamp(),Y.set(ee,y,{merge:!0}),u++}}catch(he){console.error(`[ReEncrypt] ${X}: ERROR -`,he.message),h++}await Y.commit(),console.log(`[ReEncrypt] Batch ${Math.floor(V/g)+1} committed`)}const N={success:!0,total:l,reEncrypted:u,failed:h,plaintext:p};return console.log("[ReEncrypt] Complete:",N),N}catch(i){return console.error("[ReEncrypt] Failed:",i),{success:!1,total:0,reEncrypted:0,failed:0,plaintext:0,error:i.message}}}async function NC(r){const e=Object.keys(_h),t={};for(const n of e)console.log(`[ReEncrypt] Processing type: ${n}...`),t[n]=await Dw(n,r);return console.log("[ReEncrypt] All types complete:",t),t}async function VC(r){if(!xw())return{error:"Firestore not enabled"};const e=window.firebaseConfig.getDb(),t={systemKeyDeleted:!1,collectionsCleared:{}},n=Rw+"system";try{await e.collection(n).doc("encryptionKey").delete(),t.systemKeyDeleted=!0,console.log(`[Cleanup] Deleted ${n}/encryptionKey`)}catch(s){console.warn(`[Cleanup] ${n}/encryptionKey delete failed:`,s.message)}try{await e.collection("_system").doc("encryptionKey").delete(),console.log("[Cleanup] Deleted _system/encryptionKey (fallback)")}catch{}const i=Object.keys(_h);for(const s of i){const o=qn(s,r);try{const c=await e.collection(o).get();let l=0;for(const u of c.docs)u.data()._enc&&(await e.collection(o).doc(u.id).update({_enc:Be.firestore.FieldValue.delete()}),l++);t.collectionsCleared[s]={total:c.size,cleaned:l},l>0&&console.log(`[Cleanup] ${o}: removed _enc from ${l}/${c.size} docs`)}catch(c){t.collectionsCleared[s]={error:c.message},console.warn(`[Cleanup] ${o} cleanup failed:`,c.message)}}return console.log("[Cleanup] Complete:",JSON.stringify(t,null,2)),t}window.firestoreDb={init:async function(){return ot("firestoreDb.init() 호출됨 (no-op)"),!0},save:AC,get:SC,getAll:RC,delete:PC,batchSave:Cw,migrate:CC,subscribe:xC,isEnabled:xw,isOfflineEnabled:DC,getCollectionName:qn,reEncrypt:Dw,reEncryptAll:NC,cleanupEncryption:VC};const Ge={LOCAL_ONLY:"local",CLOUD_SYNC:"cloud",CLOUD_ONLY:"cloudOnly"};let kt=Ge.LOCAL_ONLY;const OC=!1,MC=(...r)=>OC;let Kn={lastSyncTime:null,pendingChanges:0,isOnline:navigator.onLine};window.addEventListener("online",()=>{Kn.isOnline=!0,Nw()});window.addEventListener("offline",()=>{Kn.isOnline=!1});async function LC(){var n,i,s;const r=localStorage.getItem("storageMode"),e=Object.values(Ge);let t=!1;if((n=window.firebaseConfig)!=null&&n.initialize)try{await window.firebaseConfig.initialize()&&(await((i=window.firestoreDb)==null?void 0:i.init()),t=!0)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Storage] Firebase 초기화 실패:",o)}return r&&e.includes(r)?(r===Ge.CLOUD_SYNC||r===Ge.CLOUD_ONLY)&&!t?kt=Ge.LOCAL_ONLY:kt=r:kt=t?Ge.CLOUD_SYNC:Ge.LOCAL_ONLY,kt}function FC(r){var t;return Object.values(Ge).includes(r)?(r===Ge.CLOUD_SYNC||r===Ge.CLOUD_ONLY)&&!((t=window.firestoreDb)!=null&&t.isEnabled())?{success:!1,message:"Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다."}:(kt=r,localStorage.setItem("storageMode",r),window.dispatchEvent(new CustomEvent("storage-mode-changed",{detail:{mode:r}})),{success:!0,message:`저장 모드가 변경되었습니다: ${r}`}):{success:!1,message:`유효하지 않은 모드: ${r}`}}function UC(){var e;const r=((e=window.firestoreDb)==null?void 0:e.isEnabled())||!1;return[{value:Ge.LOCAL_ONLY,label:"로컬 저장소만",description:"이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.",available:!0},{value:Ge.CLOUD_SYNC,label:"클라우드 동기화",description:"로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.",available:r},{value:Ge.CLOUD_ONLY,label:"클라우드 전용",description:"Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.",available:r}]}async function BC(r,e,t,n){var i,s;try{if(localStorage.setItem(t,JSON.stringify(n)),MC(`localStorage 저장: ${t}`),kt===Ge.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())){const o=n.map(c=>({...c,id:c.id||wh()}));await window.firestoreDb.batchSave(r,e,o),Kn.lastSyncTime=new Date}return!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("데이터 저장 실패:",o),!1}}async function $C(r,e,t,n){var i,s;try{const o=JSON.parse(localStorage.getItem(t)||"[]"),c={...n,id:n.id||wh()},l=o.findIndex(u=>u.id===c.id);return l>=0?o[l]=c:o.push(c),localStorage.setItem(t,JSON.stringify(o)),kt===Ge.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.save(r,e,c.id,c),Kn.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 저장 실패:",o),!1}}async function qC(r,e,t){var n,i;try{if(kt===Ge.CLOUD_SYNC&&((n=window.firestoreDb)!=null&&n.isEnabled())){const o=await window.firestoreDb.getAll(r,e);if(o.length>0)return localStorage.setItem(t,JSON.stringify(o)),Kn.lastSyncTime=new Date,o}const s=localStorage.getItem(t);return s?JSON.parse(s):[]}catch(s){(((i=window.logger)==null?void 0:i.error)||console.error)("데이터 로드 실패:",s);const o=localStorage.getItem(t);return o?JSON.parse(o):[]}}async function KC(r,e,t,n){var i,s;try{const c=JSON.parse(localStorage.getItem(t)||"[]").filter(l=>l.id!==n);return localStorage.setItem(t,JSON.stringify(c)),kt===Ge.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.delete(r,e,n),Kn.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 삭제 실패:",o),!1}}function zC(r,e,t,n){var i;return kt!==Ge.CLOUD_SYNC||!((i=window.firestoreDb)!=null&&i.isEnabled())?null:window.firestoreDb.subscribe(r,e,(s,o)=>{localStorage.setItem(t,JSON.stringify(s)),n(s,o),o||(Kn.lastSyncTime=new Date)})}async function jC(r,e,t){return kt!==Ge.CLOUD_SYNC?{success:!1,count:0,message:"클라우드 동기화 모드가 아닙니다."}:await window.firestoreDb.migrate(r,e,t)}async function Nw(){kt!==Ge.CLOUD_SYNC||!Kn.isOnline||window.dispatchEvent(new CustomEvent("storage-sync-requested"))}function wh(){var r;return typeof window<"u"&&((r=window.SampleUtils)!=null&&r.generateUUID)?window.SampleUtils.generateUUID():typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),e=>e.toString(36)).join("").substring(0,9)}function GC(){return kt}function WC(){var r,e;return{...Kn,mode:kt,isCloudEnabled:((r=window.firestoreDb)==null?void 0:r.isEnabled())||!1,isOfflineSupported:((e=window.firestoreDb)==null?void 0:e.isOfflineEnabled())||!1}}function HC(){return kt===Ge.CLOUD_SYNC}window.storageManager={init:LC,save:BC,saveItem:$C,load:qC,delete:KC,subscribe:zC,migrate:jC,sync:Nw,getMode:GC,setMode:FC,getAvailableModes:UC,getStatus:WC,isCloudEnabled:HC,generateId:wh,MODES:Ge};
