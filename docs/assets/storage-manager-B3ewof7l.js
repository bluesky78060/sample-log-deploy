window.NETWORK_CONFIG={ALLOWED_GATEWAY:"111.21.101.254"};const Du={STORAGE_KEY:"networkAccessConfig",GATEWAY_STORAGE_KEY:"networkGatewayIP",getAllowedGateway(){var r;try{const e=localStorage.getItem(this.GATEWAY_STORAGE_KEY);if(e)return e}catch{}return((r=window.NETWORK_CONFIG)==null?void 0:r.ALLOWED_GATEWAY)||null},saveGateway(r){try{localStorage.setItem(this.GATEWAY_STORAGE_KEY,r),logger.info("[NetworkAccess] 게이트웨이 저장됨:",r)}catch(e){logger.error("[NetworkAccess] 게이트웨이 저장 실패:",e)}},removeGateway(){try{localStorage.removeItem(this.GATEWAY_STORAGE_KEY),logger.info("[NetworkAccess] 게이트웨이 삭제됨")}catch{}},defaultConfig:{adminIPs:[],timeout:5e3},_currentIP:null,_lastCheck:null,_cacheTimeout:6e4,loadConfig(){try{const r=localStorage.getItem(this.STORAGE_KEY);if(r)return{...this.defaultConfig,...JSON.parse(r)}}catch(r){logger.error("[NetworkAccess] 설정 로드 실패:",r)}return{...this.defaultConfig}},saveConfig(r){try{localStorage.setItem(this.STORAGE_KEY,JSON.stringify(r)),logger.info("[NetworkAccess] 설정 저장됨:",r)}catch(e){logger.error("[NetworkAccess] 설정 저장 실패:",e)}},async getCurrentIP(r){if(this._currentIP&&this._lastCheck&&Date.now()-this._lastCheck<this._cacheTimeout)return this._currentIP;const e=r||this.loadConfig().timeout;try{const t=new AbortController,n=setTimeout(()=>t.abort(),e),i=await fetch("https://api.ipify.org?format=json",{signal:t.signal});clearTimeout(n);const s=await i.json();return this._currentIP=s.ip,this._lastCheck=Date.now(),logger.info("[NetworkAccess] 현재 IP:",this._currentIP),this._currentIP}catch(t){return logger.warn("[NetworkAccess] IP 조회 실패:",t.message),null}},getSubnetPrefix(r){if(!r)return"";const e=r.split(".");return e.length!==4?"":e.slice(0,3).join(".")+"."},async checkAccess(){var i;if(((i=window.electronAPI)==null?void 0:i.isElectron)===!0)return{allowed:!0,reason:"Electron 환경 (항상 허용)",ip:null};if(window.location.protocol==="file:")return{allowed:!0,reason:"Electron 로컬 실행",ip:null};const r=this.getAllowedGateway();if(!r)return logger.warn("[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요"),{allowed:!1,reason:"게이트웨이 미설정",ip:null,needsSetup:!0};const e=this.getSubnetPrefix(r),t=await this.getCurrentIP();if(!t)return logger.warn("[NetworkAccess] IP 확인 불가 - 접근 거부"),{allowed:!1,reason:"IP 확인 불가",ip:null};if(t.startsWith(e))return logger.info("[NetworkAccess] 허용된 네트워크:",t),{allowed:!0,reason:`허용된 네트워크 (${r})`,ip:t};const n=this.loadConfig();return n.adminIPs&&n.adminIPs.includes(t)?{allowed:!0,reason:"관리자 IP",ip:t}:(logger.warn("[NetworkAccess] 허용되지 않은 네트워크:",t),{allowed:!1,reason:`허용되지 않은 네트워크 (허용: ${e}x)`,ip:t})},async isAllowed(){return(await this.checkAccess()).allowed},addAdminIP(r){const e=this.loadConfig();e.adminIPs.includes(r)||(e.adminIPs.push(r),this.saveConfig(e))},removeAdminIP(r){const e=this.loadConfig();e.adminIPs=e.adminIPs.filter(t=>t!==r),this.saveConfig(e)},async registerCurrentAsAdmin(){const r=await this.getCurrentIP();return r?(this.addAdminIP(r),r):null},resetConfig(){localStorage.removeItem(this.STORAGE_KEY),localStorage.removeItem(this.GATEWAY_STORAGE_KEY),this._currentIP=null,this._lastCheck=null,logger.info("[NetworkAccess] 설정 초기화됨")},async printStatus(){var s;const r=this.loadConfig(),e=await this.getCurrentIP(),t=await this.checkAccess(),n=((s=window.electronAPI)==null?void 0:s.isElectron)===!0||window.location.protocol==="file:",i=this.getAllowedGateway();return console.log("========================================"),logger.info("[NetworkAccess] 현재 상태"),console.log("========================================"),console.log("환경:",n?"Electron (네트워크 체크 안함)":"웹 (네트워크 체크 활성화)"),console.log("허용된 게이트웨이:",i||"설정 없음"),console.log("허용된 서브넷:",i?this.getSubnetPrefix(i)+"x":"없음"),console.log("현재 공인 IP:",e||"확인 불가"),console.log("접근 허용:",t.allowed,`(${t.reason})`),console.log("관리자 IP (예외):",r.adminIPs||[]),console.log("========================================"),{config:r,currentIP:e,access:t,isElectron:n,allowedGateway:i}},showGatewaySetupModal(){return new Promise(r=>{const e=document.getElementById("gatewaySetupModal");e&&e.remove();const t=document.documentElement.getAttribute("data-theme")==="dark",n=document.createElement("div");n.id="gatewaySetupModal",n.style.cssText=`
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
            `,n.appendChild(i),document.body.appendChild(n);const s=document.getElementById("gatewayIPInput"),o=document.getElementById("gatewaySaveBtn"),c=document.getElementById("gatewaySkipBtn");s.focus();function l(u){const d=u.trim().split(".");return d.length!==4?!1:d.every(p=>{const m=Number(p);return Number.isInteger(m)&&m>=0&&m<=255})}s.addEventListener("focus",()=>{s.style.borderColor="#7C9082",s.style.boxShadow="0 0 0 3px rgba(124, 144, 130, 0.12)"}),s.addEventListener("blur",()=>{s.style.borderColor=t?"#57534E":"#E8E4DF",s.style.boxShadow="none"}),s.addEventListener("keydown",u=>{u.key==="Enter"&&o.click()}),o.addEventListener("click",()=>{const u=s.value.trim();if(!u){s.style.borderColor="#dc2626",s.placeholder="IP 주소를 입력하세요";return}if(!l(u)){s.style.borderColor="#dc2626",s.value="",s.placeholder="올바른 IP 형식: 0~255.0~255.0~255.0~255";return}Du.saveGateway(u),n.remove(),r(u)}),c.addEventListener("click",()=>{n.remove(),r(null)})})},async promptGatewayIfNeeded(){var e;return((e=window.electronAPI)==null?void 0:e.isElectron)===!0||window.location.protocol==="file:"||this.getAllowedGateway()?!0:!!await this.showGatewaySetupModal()}};window.NetworkAccess=Du;var hm;if(((hm=window.electronAPI)==null?void 0:hm.isElectron)===!0||window.location.protocol==="file:")logger.info("[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)");else{const r=Du.getAllowedGateway();logger.info("[NetworkAccess] 웹 환경 - 네트워크 체크 활성화"),r?logger.info(`[NetworkAccess] 허용된 게이트웨이: ${r}`):logger.warn("[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요")}const Gw=()=>{};var tf={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dm=function(r){const e=[];let t=0;for(let n=0;n<r.length;n++){let i=r.charCodeAt(n);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&n+1<r.length&&(r.charCodeAt(n+1)&64512)===56320?(i=65536+((i&1023)<<10)+(r.charCodeAt(++n)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},Ww=function(r){const e=[];let t=0,n=0;for(;t<r.length;){const i=r[t++];if(i<128)e[n++]=String.fromCharCode(i);else if(i>191&&i<224){const s=r[t++];e[n++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){const s=r[t++],o=r[t++],c=r[t++],l=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[n++]=String.fromCharCode(55296+(l>>10)),e[n++]=String.fromCharCode(56320+(l&1023))}else{const s=r[t++],o=r[t++];e[n++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},fm={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(r,e){if(!Array.isArray(r))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,n=[];for(let i=0;i<r.length;i+=3){const s=r[i],o=i+1<r.length,c=o?r[i+1]:0,l=i+2<r.length,u=l?r[i+2]:0,d=s>>2,p=(s&3)<<4|c>>4;let m=(c&15)<<2|u>>6,v=u&63;l||(v=64,o||(m=64)),n.push(t[d],t[p],t[m],t[v])}return n.join("")},encodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(r):this.encodeByteArray(dm(r),e)},decodeString(r,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(r):Ww(this.decodeStringToByteArray(r,e))},decodeStringToByteArray(r,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,n=[];for(let i=0;i<r.length;){const s=t[r.charAt(i++)],c=i<r.length?t[r.charAt(i)]:0;++i;const u=i<r.length?t[r.charAt(i)]:64;++i;const p=i<r.length?t[r.charAt(i)]:64;if(++i,s==null||c==null||u==null||p==null)throw new Hw;const m=s<<2|c>>4;if(n.push(m),u!==64){const v=c<<4&240|u>>2;if(n.push(v),p!==64){const M=u<<6&192|p;n.push(M)}}}return n},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let r=0;r<this.ENCODED_VALS.length;r++)this.byteToCharMap_[r]=this.ENCODED_VALS.charAt(r),this.charToByteMap_[this.byteToCharMap_[r]]=r,this.byteToCharMapWebSafe_[r]=this.ENCODED_VALS_WEBSAFE.charAt(r),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[r]]=r,r>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(r)]=r,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(r)]=r)}}};class Hw extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Qw=function(r){const e=dm(r);return fm.encodeByteArray(e,!0)},Ya=function(r){return Qw(r).replace(/\./g,"")},Nu=function(r){try{return fm.decodeString(r,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function Ja(r,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const t=e;return new Date(t.getTime());case Object:r===void 0&&(r={});break;case Array:r=[];break;default:return e}for(const t in e)!e.hasOwnProperty(t)||!Yw(t)||(r[t]=Ja(r[t],e[t]));return r}function Yw(r){return r!=="__proto__"}/**
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
 */function Vu(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
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
 */const Jw=()=>Vu().__FIREBASE_DEFAULTS__,Xw=()=>{if(typeof process>"u"||typeof tf>"u")return;const r=tf.__FIREBASE_DEFAULTS__;if(r)return JSON.parse(r)},Zw=()=>{if(typeof document>"u")return;let r;try{r=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=r&&Nu(r[1]);return e&&JSON.parse(e)},Ou=()=>{try{return Gw()||Jw()||Xw()||Zw()}catch(r){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${r}`);return}},Mu=()=>{var r;return(r=Ou())==null?void 0:r.config},eI=r=>{var e;return(e=Ou())==null?void 0:e[`_${r}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tI{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,n)=>{t?this.reject(t):this.resolve(n),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,n))}}}/**
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
 */function ms(r){try{return(r.startsWith("http://")||r.startsWith("https://")?new URL(r).hostname:r).endsWith(".cloudworkstations.dev")}catch{return!1}}async function pm(r){return(await fetch(r,{credentials:"include"})).ok}/**
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
 */function nI(r,e){if(r.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},n=e||"demo-project",i=r.iat||0,s=r.sub||r.user_id;if(!s)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o={iss:`https://securetoken.google.com/${n}`,aud:n,iat:i,exp:i+3600,auth_time:i,sub:s,user_id:s,firebase:{sign_in_provider:"custom",identities:{}},...r};return[Ya(JSON.stringify(t)),Ya(JSON.stringify(o)),""].join(".")}const so={};function rI(){const r={prod:[],emulator:[]};for(const e of Object.keys(so))so[e]?r.emulator.push(e):r.prod.push(e);return r}function iI(r){let e=document.getElementById(r),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",r),t=!0),{created:t,element:e}}let nf=!1;function mm(r,e){if(typeof window>"u"||typeof document>"u"||!ms(window.location.host)||so[r]===e||so[r]||nf)return;so[r]=e;function t(m){return`__firebase__banner__${m}`}const n="__firebase__banner",s=rI().prod.length>0;function o(){const m=document.getElementById(n);m&&m.remove()}function c(m){m.style.display="flex",m.style.background="#7faaf0",m.style.position="fixed",m.style.bottom="5px",m.style.left="5px",m.style.padding=".5em",m.style.borderRadius="5px",m.style.alignItems="center"}function l(m,v){m.setAttribute("width","24"),m.setAttribute("id",v),m.setAttribute("height","24"),m.setAttribute("viewBox","0 0 24 24"),m.setAttribute("fill","none"),m.style.marginLeft="-6px"}function u(){const m=document.createElement("span");return m.style.cursor="pointer",m.style.marginLeft="16px",m.style.fontSize="24px",m.innerHTML=" &times;",m.onclick=()=>{nf=!0,o()},m}function d(m,v){m.setAttribute("id",v),m.innerText="Learn more",m.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",m.setAttribute("target","__blank"),m.style.paddingLeft="5px",m.style.textDecoration="underline"}function p(){const m=iI(n),v=t("text"),M=document.getElementById(v)||document.createElement("span"),F=t("learnmore"),U=document.getElementById(F)||document.createElement("a"),X=t("preprendIcon"),ie=document.getElementById(X)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(m.created){const re=m.element;c(re),d(U,F);const _e=u();l(ie,X),re.append(ie,M,U,_e),document.body.appendChild(re)}s?(M.innerText="Preview backend disconnected.",ie.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(ie.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,M.innerText="Preview backend running in this workspace."),M.setAttribute("id",v)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ke(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function sI(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Ke())}function vc(){var e;const r=(e=Ou())==null?void 0:e.forceEnvironment;if(r==="node")return!0;if(r==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function oI(){return typeof window<"u"||gm()}function gm(){return typeof WorkerGlobalScope<"u"&&typeof self<"u"&&self instanceof WorkerGlobalScope}function aI(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function ym(){const r=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof r=="object"&&r.id!==void 0}function Lu(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function _m(){const r=Ke();return r.indexOf("MSIE ")>=0||r.indexOf("Trident/")>=0}function wm(){return!vc()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Im(){return!vc()&&!!navigator.userAgent&&(navigator.userAgent.includes("Safari")||navigator.userAgent.includes("WebKit"))&&!navigator.userAgent.includes("Chrome")}function Eo(){try{return typeof indexedDB=="object"}catch{return!1}}function cI(){return new Promise((r,e)=>{try{let t=!0;const n="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(n);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(n),r(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)==null?void 0:s.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lI="FirebaseError";class xt extends Error{constructor(e,t,n){super(t),this.code=e,this.customData=n,this.name=lI,Object.setPrototypeOf(this,xt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,gi.prototype.create)}}class gi{constructor(e,t,n){this.service=e,this.serviceName=t,this.errors=n}create(e,...t){const n=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?uI(s,n):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new xt(i,c,n)}}function uI(r,e){return r.replace(hI,(t,n)=>{const i=e[n];return i!=null?String(i):`<${n}?>`})}const hI=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rf(r,e){return Object.prototype.hasOwnProperty.call(r,e)}function dI(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}function dr(r,e){if(r===e)return!0;const t=Object.keys(r),n=Object.keys(e);for(const i of t){if(!n.includes(i))return!1;const s=r[i],o=e[i];if(sf(s)&&sf(o)){if(!dr(s,o))return!1}else if(s!==o)return!1}for(const i of n)if(!t.includes(i))return!1;return!0}function sf(r){return r!==null&&typeof r=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gs(r){const e=[];for(const[t,n]of Object.entries(r))Array.isArray(n)?n.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(n));return e.length?"&"+e.join("&"):""}function Ui(r){const e={};return r.replace(/^\?/,"").split("&").forEach(n=>{if(n){const[i,s]=n.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function Js(r){const e=r.indexOf("?");if(!e)return"";const t=r.indexOf("#",e);return r.substring(e,t>0?t:void 0)}function Em(r,e){const t=new fI(r,e);return t.subscribe.bind(t)}class fI{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(n=>{this.error(n)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,n){let i;if(e===void 0&&t===void 0&&n===void 0)throw new Error("Missing Observer.");pI(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:n},i.next===void 0&&(i.next=Tl),i.error===void 0&&(i.error=Tl),i.complete===void 0&&(i.complete=Tl);const s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(n){typeof console<"u"&&console.error&&console.error(n)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function pI(r,e){if(typeof r!="object"||r===null)return!1;for(const t of e)if(t in r&&typeof r[t]=="function")return!0;return!1}function Tl(){}/**
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
 */function le(r){return r&&r._delegate?r._delegate:r}class vn{constructor(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
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
 */const $r="[DEFAULT]";/**
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
 */class mI{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const n=new tI;if(this.instancesDeferred.set(t,n),this.isInitialized(t)||this.shouldAutoInitialize())try{const i=this.getOrInitializeService({instanceIdentifier:t});i&&n.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),n=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(i){if(n)return null;throw i}else{if(n)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(yI(e))try{this.getOrInitializeService({instanceIdentifier:$r})}catch{}for(const[t,n]of this.instancesDeferred.entries()){const i=this.normalizeInstanceIdentifier(t);try{const s=this.getOrInitializeService({instanceIdentifier:i});n.resolve(s)}catch{}}}}clearInstance(e=$r){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=$r){return this.instances.has(e)}getOptions(e=$r){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,n=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(n))throw Error(`${this.name}(${n}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const i=this.getOrInitializeService({instanceIdentifier:n,options:t});for(const[s,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(s);n===c&&o.resolve(i)}return i}onInit(e,t){const n=this.normalizeInstanceIdentifier(t),i=this.onInitCallbacks.get(n)??new Set;i.add(e),this.onInitCallbacks.set(n,i);const s=this.instances.get(n);return s&&e(s,n),()=>{i.delete(e)}}invokeOnInitCallbacks(e,t){const n=this.onInitCallbacks.get(t);if(n)for(const i of n)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let n=this.instances.get(e);if(!n&&this.component&&(n=this.component.instanceFactory(this.container,{instanceIdentifier:gI(e),options:t}),this.instances.set(e,n),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(n,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,n)}catch{}return n||null}normalizeInstanceIdentifier(e=$r){return this.component?this.component.multipleInstances?e:$r:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function gI(r){return r===$r?void 0:r}function yI(r){return r.instantiationMode==="EAGER"}/**
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
 */class vm{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new mI(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fu=[];var we;(function(r){r[r.DEBUG=0]="DEBUG",r[r.VERBOSE=1]="VERBOSE",r[r.INFO=2]="INFO",r[r.WARN=3]="WARN",r[r.ERROR=4]="ERROR",r[r.SILENT=5]="SILENT"})(we||(we={}));const Tm={debug:we.DEBUG,verbose:we.VERBOSE,info:we.INFO,warn:we.WARN,error:we.ERROR,silent:we.SILENT},_I=we.INFO,wI={[we.DEBUG]:"log",[we.VERBOSE]:"log",[we.INFO]:"info",[we.WARN]:"warn",[we.ERROR]:"error"},II=(r,e,...t)=>{if(e<r.logLevel)return;const n=new Date().toISOString(),i=wI[e];if(i)console[i](`[${n}]  ${r.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Tc{constructor(e){this.name=e,this._logLevel=_I,this._logHandler=II,this._userLogHandler=null,Fu.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in we))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Tm[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,we.DEBUG,...e),this._logHandler(this,we.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,we.VERBOSE,...e),this._logHandler(this,we.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,we.INFO,...e),this._logHandler(this,we.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,we.WARN,...e),this._logHandler(this,we.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,we.ERROR,...e),this._logHandler(this,we.ERROR,...e)}}function EI(r){Fu.forEach(e=>{e.setLogLevel(r)})}function vI(r,e){for(const t of Fu){let n=null;e&&e.level&&(n=Tm[e.level]),r===null?t.userLogHandler=null:t.userLogHandler=(i,s,...o)=>{const c=o.map(l=>{if(l==null)return null;if(typeof l=="string")return l;if(typeof l=="number"||typeof l=="boolean")return l.toString();if(l instanceof Error)return l.message;try{return JSON.stringify(l)}catch{return null}}).filter(l=>l).join(" ");s>=(n??i.logLevel)&&r({level:we[s].toLowerCase(),message:c,args:o,type:i.name})}}}const TI=(r,e)=>e.some(t=>r instanceof t);let of,af;function bI(){return of||(of=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function AI(){return af||(af=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const bm=new WeakMap,zl=new WeakMap,Am=new WeakMap,bl=new WeakMap,Uu=new WeakMap;function SI(r){const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("success",s),r.removeEventListener("error",o)},s=()=>{t(ar(r.result)),i()},o=()=>{n(r.error),i()};r.addEventListener("success",s),r.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&bm.set(t,r)}).catch(()=>{}),Uu.set(e,r),e}function RI(r){if(zl.has(r))return;const e=new Promise((t,n)=>{const i=()=>{r.removeEventListener("complete",s),r.removeEventListener("error",o),r.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{n(r.error||new DOMException("AbortError","AbortError")),i()};r.addEventListener("complete",s),r.addEventListener("error",o),r.addEventListener("abort",o)});zl.set(r,e)}let Kl={get(r,e,t){if(r instanceof IDBTransaction){if(e==="done")return zl.get(r);if(e==="objectStoreNames")return r.objectStoreNames||Am.get(r);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return ar(r[e])},set(r,e,t){return r[e]=t,!0},has(r,e){return r instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in r}};function PI(r){Kl=r(Kl)}function CI(r){return r===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const n=r.call(Al(this),e,...t);return Am.set(n,e.sort?e.sort():[e]),ar(n)}:AI().includes(r)?function(...e){return r.apply(Al(this),e),ar(bm.get(this))}:function(...e){return ar(r.apply(Al(this),e))}}function kI(r){return typeof r=="function"?CI(r):(r instanceof IDBTransaction&&RI(r),TI(r,bI())?new Proxy(r,Kl):r)}function ar(r){if(r instanceof IDBRequest)return SI(r);if(bl.has(r))return bl.get(r);const e=kI(r);return e!==r&&(bl.set(r,e),Uu.set(e,r)),e}const Al=r=>Uu.get(r);function xI(r,e,{blocked:t,upgrade:n,blocking:i,terminated:s}={}){const o=indexedDB.open(r,e),c=ar(o);return n&&o.addEventListener("upgradeneeded",l=>{n(ar(o.result),l.oldVersion,l.newVersion,ar(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{s&&l.addEventListener("close",()=>s()),i&&l.addEventListener("versionchange",u=>i(u.oldVersion,u.newVersion,u))}).catch(()=>{}),c}const DI=["get","getKey","getAll","getAllKeys","count"],NI=["put","add","delete","clear"],Sl=new Map;function cf(r,e){if(!(r instanceof IDBDatabase&&!(e in r)&&typeof e=="string"))return;if(Sl.get(e))return Sl.get(e);const t=e.replace(/FromIndex$/,""),n=e!==t,i=NI.includes(t);if(!(t in(n?IDBIndex:IDBObjectStore).prototype)||!(i||DI.includes(t)))return;const s=async function(o,...c){const l=this.transaction(o,i?"readwrite":"readonly");let u=l.store;return n&&(u=u.index(c.shift())),(await Promise.all([u[t](...c),i&&l.done]))[0]};return Sl.set(e,s),s}PI(r=>({...r,get:(e,t,n)=>cf(e,t)||r.get(e,t,n),has:(e,t)=>!!cf(e,t)||r.has(e,t)}));/**
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
 */class VI{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(OI(t)){const n=t.getImmediate();return`${n.library}/${n.version}`}else return null}).filter(t=>t).join(" ")}}function OI(r){const e=r.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Xa="@firebase/app",jl="0.14.6";/**
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
 */const Dn=new Tc("@firebase/app"),MI="@firebase/app-compat",LI="@firebase/analytics-compat",FI="@firebase/analytics",UI="@firebase/app-check-compat",BI="@firebase/app-check",qI="@firebase/auth",$I="@firebase/auth-compat",zI="@firebase/database",KI="@firebase/data-connect",jI="@firebase/database-compat",GI="@firebase/functions",WI="@firebase/functions-compat",HI="@firebase/installations",QI="@firebase/installations-compat",YI="@firebase/messaging",JI="@firebase/messaging-compat",XI="@firebase/performance",ZI="@firebase/performance-compat",eE="@firebase/remote-config",tE="@firebase/remote-config-compat",nE="@firebase/storage",rE="@firebase/storage-compat",iE="@firebase/firestore",sE="@firebase/ai",oE="@firebase/firestore-compat",aE="firebase",cE="12.6.0";/**
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
 */const fr="[DEFAULT]",lE={[Xa]:"fire-core",[MI]:"fire-core-compat",[FI]:"fire-analytics",[LI]:"fire-analytics-compat",[BI]:"fire-app-check",[UI]:"fire-app-check-compat",[qI]:"fire-auth",[$I]:"fire-auth-compat",[zI]:"fire-rtdb",[KI]:"fire-data-connect",[jI]:"fire-rtdb-compat",[GI]:"fire-fn",[WI]:"fire-fn-compat",[HI]:"fire-iid",[QI]:"fire-iid-compat",[YI]:"fire-fcm",[JI]:"fire-fcm-compat",[XI]:"fire-perf",[ZI]:"fire-perf-compat",[eE]:"fire-rc",[tE]:"fire-rc-compat",[nE]:"fire-gcs",[rE]:"fire-gcs-compat",[iE]:"fire-fst",[oE]:"fire-fst-compat",[sE]:"fire-vertex","fire-js":"fire-js",[aE]:"fire-js-all"};/**
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
 */const pr=new Map,Gi=new Map,Wi=new Map;function vo(r,e){try{r.container.addComponent(e)}catch(t){Dn.debug(`Component ${e.name} failed to register with FirebaseApp ${r.name}`,t)}}function Sm(r,e){r.container.addOrOverwriteComponent(e)}function mr(r){const e=r.name;if(Wi.has(e))return Dn.debug(`There were multiple attempts to register component ${e}.`),!1;Wi.set(e,r);for(const t of pr.values())vo(t,r);for(const t of Gi.values())vo(t,r);return!0}function Rm(r,e){const t=r.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),r.container.getProvider(e)}function uE(r,e,t=fr){Rm(r,e).clearInstance(t)}function Bu(r){return r.options!==void 0}function Pm(r){return Bu(r)?!1:"authIdToken"in r||"appCheckToken"in r||"releaseOnDeref"in r||"automaticDataCollectionEnabled"in r}function Ue(r){return r==null?!1:r.settings!==void 0}function hE(){Wi.clear()}/**
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
 */const dE={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Kt=new gi("app","Firebase",dE);/**
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
 */let Cm=class{constructor(e,t,n){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=n,this.container.addComponent(new vn("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Kt.create("app-deleted",{appName:this._name})}};/**
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
 */function lf(r,e){const t=Nu(r.split(".")[1]);if(t===null){console.error(`FirebaseServerApp ${e} is invalid: second part could not be parsed.`);return}if(JSON.parse(t).exp===void 0){console.error(`FirebaseServerApp ${e} is invalid: expiration claim could not be parsed`);return}const i=JSON.parse(t).exp*1e3,s=new Date().getTime();i-s<=0&&console.error(`FirebaseServerApp ${e} is invalid: the token has expired.`)}class fE extends Cm{constructor(e,t,n,i){const s=t.automaticDataCollectionEnabled!==void 0?t.automaticDataCollectionEnabled:!0,o={name:n,automaticDataCollectionEnabled:s};if(e.apiKey!==void 0)super(e,o,i);else{const c=e;super(c.options,o,i)}this._serverConfig={automaticDataCollectionEnabled:s,...t},this._serverConfig.authIdToken&&lf(this._serverConfig.authIdToken,"authIdToken"),this._serverConfig.appCheckToken&&lf(this._serverConfig.appCheckToken,"appCheckToken"),this._finalizationRegistry=null,typeof FinalizationRegistry<"u"&&(this._finalizationRegistry=new FinalizationRegistry(()=>{this.automaticCleanup()})),this._refCount=0,this.incRefCount(this._serverConfig.releaseOnDeref),this._serverConfig.releaseOnDeref=void 0,t.releaseOnDeref=void 0,en(Xa,jl,"serverapp")}toJSON(){}get refCount(){return this._refCount}incRefCount(e){this.isDeleted||(this._refCount++,e!==void 0&&this._finalizationRegistry!==null&&this._finalizationRegistry.register(e,this))}decRefCount(){return this.isDeleted?0:--this._refCount}automaticCleanup(){$u(this)}get settings(){return this.checkDestroyed(),this._serverConfig}checkDestroyed(){if(this.isDeleted)throw Kt.create("server-app-deleted")}}/**
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
 */const br=cE;function qu(r,e={}){let t=r;typeof e!="object"&&(e={name:e});const n={name:fr,automaticDataCollectionEnabled:!0,...e},i=n.name;if(typeof i!="string"||!i)throw Kt.create("bad-app-name",{appName:String(i)});if(t||(t=Mu()),!t)throw Kt.create("no-options");const s=pr.get(i);if(s){if(dr(t,s.options)&&dr(n,s.config))return s;throw Kt.create("duplicate-app",{appName:i})}const o=new vm(i);for(const l of Wi.values())o.addComponent(l);const c=new Cm(t,n,o);return pr.set(i,c),c}function pE(r,e={}){if(oI()&&!gm())throw Kt.create("invalid-server-app-environment");let t,n=e||{};if(r&&(Bu(r)?t=r.options:Pm(r)?n=r:t=r),n.automaticDataCollectionEnabled===void 0&&(n.automaticDataCollectionEnabled=!0),t||(t=Mu()),!t)throw Kt.create("no-options");const i={...n,...t};i.releaseOnDeref!==void 0&&delete i.releaseOnDeref;const s=d=>[...d].reduce((p,m)=>Math.imul(31,p)+m.charCodeAt(0)|0,0);if(n.releaseOnDeref!==void 0&&typeof FinalizationRegistry>"u")throw Kt.create("finalization-registry-not-supported",{});const o=""+s(JSON.stringify(i)),c=Gi.get(o);if(c)return c.incRefCount(n.releaseOnDeref),c;const l=new vm(o);for(const d of Wi.values())l.addComponent(d);const u=new fE(t,n,o,l);return Gi.set(o,u),u}function mE(r=fr){const e=pr.get(r);if(!e&&r===fr&&Mu())return qu();if(!e)throw Kt.create("no-app",{appName:r});return e}function gE(){return Array.from(pr.values())}async function $u(r){let e=!1;const t=r.name;pr.has(t)?(e=!0,pr.delete(t)):Gi.has(t)&&r.decRefCount()<=0&&(Gi.delete(t),e=!0),e&&(await Promise.all(r.container.getProviders().map(n=>n.delete())),r.isDeleted=!0)}function en(r,e,t){let n=lE[r]??r;t&&(n+=`-${t}`);const i=n.match(/\s|\//),s=e.match(/\s|\//);if(i||s){const o=[`Unable to register library "${n}" with version "${e}":`];i&&o.push(`library name "${n}" contains illegal characters (whitespace or "/")`),i&&s&&o.push("and"),s&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Dn.warn(o.join(" "));return}mr(new vn(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}function km(r,e){if(r!==null&&typeof r!="function")throw Kt.create("invalid-log-argument");vI(r,e)}function xm(r){EI(r)}/**
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
 */const yE="firebase-heartbeat-database",_E=1,To="firebase-heartbeat-store";let Rl=null;function Dm(){return Rl||(Rl=xI(yE,_E,{upgrade:(r,e)=>{switch(e){case 0:try{r.createObjectStore(To)}catch(t){console.warn(t)}}}}).catch(r=>{throw Kt.create("idb-open",{originalErrorMessage:r.message})})),Rl}async function wE(r){try{const t=(await Dm()).transaction(To),n=await t.objectStore(To).get(Nm(r));return await t.done,n}catch(e){if(e instanceof xt)Dn.warn(e.message);else{const t=Kt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Dn.warn(t.message)}}}async function uf(r,e){try{const n=(await Dm()).transaction(To,"readwrite");await n.objectStore(To).put(e,Nm(r)),await n.done}catch(t){if(t instanceof xt)Dn.warn(t.message);else{const n=Kt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Dn.warn(n.message)}}}function Nm(r){return`${r.name}!${r.options.appId}`}/**
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
 */const IE=1024,EE=30;class vE{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new bE(t),this._heartbeatsCachePromise=this._storage.read().then(n=>(this._heartbeatsCache=n,n))}async triggerHeartbeat(){var e,t;try{const i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=hf();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>EE){const o=AE(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(n){Dn.warn(n)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=hf(),{heartbeatsToSend:n,unsentEntries:i}=TE(this._heartbeatsCache.heartbeats),s=Ya(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return Dn.warn(t),""}}}function hf(){return new Date().toISOString().substring(0,10)}function TE(r,e=IE){const t=[];let n=r.slice();for(const i of r){const s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),df(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),df(t)>e){t.pop();break}n=n.slice(1)}return{heartbeatsToSend:t,unsentEntries:n}}class bE{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Eo()?cI().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await wE(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return uf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const n=await this.read();return uf(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function df(r){return Ya(JSON.stringify({version:2,heartbeats:r})).length}function AE(r){if(r.length===0)return-1;let e=0,t=r[0].date;for(let n=1;n<r.length;n++)r[n].date<t&&(t=r[n].date,e=n);return e}/**
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
 */function SE(r){mr(new vn("platform-logger",e=>new VI(e),"PRIVATE")),mr(new vn("heartbeat",e=>new vE(e),"PRIVATE")),en(Xa,jl,r),en(Xa,jl,"esm2020"),en("fire-js","")}SE("");const RE=Object.freeze(Object.defineProperty({__proto__:null,FirebaseError:xt,SDK_VERSION:br,_DEFAULT_ENTRY_NAME:fr,_addComponent:vo,_addOrOverwriteComponent:Sm,_apps:pr,_clearComponents:hE,_components:Wi,_getProvider:Rm,_isFirebaseApp:Bu,_isFirebaseServerApp:Ue,_isFirebaseServerAppSettings:Pm,_registerComponent:mr,_removeServiceInstance:uE,_serverApps:Gi,deleteApp:$u,getApp:mE,getApps:gE,initializeApp:qu,initializeServerApp:pE,onLog:km,registerVersion:en,setLogLevel:xm},Symbol.toStringTag,{value:"Module"}));/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PE{constructor(e,t){this._delegate=e,this.firebase=t,vo(e,new vn("app-compat",()=>this,"PUBLIC")),this.container=e.container}get automaticDataCollectionEnabled(){return this._delegate.automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this._delegate.automaticDataCollectionEnabled=e}get name(){return this._delegate.name}get options(){return this._delegate.options}delete(){return new Promise(e=>{this._delegate.checkDestroyed(),e()}).then(()=>(this.firebase.INTERNAL.removeApp(this.name),$u(this._delegate)))}_getService(e,t=fr){var i;this._delegate.checkDestroyed();const n=this._delegate.container.getProvider(e);return!n.isInitialized()&&((i=n.getComponent())==null?void 0:i.instantiationMode)==="EXPLICIT"&&n.initialize(),n.getImmediate({identifier:t})}_removeServiceInstance(e,t=fr){this._delegate.container.getProvider(e).clearInstance(t)}_addComponent(e){vo(this._delegate,e)}_addOrOverwriteComponent(e){Sm(this._delegate,e)}toJSON(){return{name:this.name,automaticDataCollectionEnabled:this.automaticDataCollectionEnabled,options:this.options}}}/**
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
 */const CE={"no-app":"No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance."},ff=new gi("app-compat","Firebase",CE);/**
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
 */function kE(r){const e={},t={__esModule:!0,initializeApp:s,app:i,registerVersion:en,setLogLevel:xm,onLog:km,apps:null,SDK_VERSION:br,INTERNAL:{registerComponent:c,removeApp:n,useAsService:l,modularAPIs:RE}};t.default=t,Object.defineProperty(t,"apps",{get:o});function n(u){delete e[u]}function i(u){if(u=u||fr,!rf(e,u))throw ff.create("no-app",{appName:u});return e[u]}i.App=r;function s(u,d={}){const p=qu(u,d);if(rf(e,p.name))return e[p.name];const m=new r(p,t);return e[p.name]=m,m}function o(){return Object.keys(e).map(u=>e[u])}function c(u){const d=u.name,p=d.replace("-compat","");if(mr(u)&&u.type==="PUBLIC"){const m=(v=i())=>{if(typeof v[p]!="function")throw ff.create("invalid-app-argument",{appName:d});return v[p]()};u.serviceProps!==void 0&&Ja(m,u.serviceProps),t[p]=m,r.prototype[p]=function(...v){return this._getService.bind(this,d).apply(this,u.multipleInstances?v:[])}}return u.type==="PUBLIC"?t[p]:null}function l(u,d){return d==="serverAuth"?null:d}return t}/**
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
 */function Vm(){const r=kE(PE);r.INTERNAL={...r.INTERNAL,createFirebaseNamespace:Vm,extendNamespace:e,createSubscribe:Em,ErrorFactory:gi,deepExtend:Ja};function e(t){Ja(r,t)}return r}const xE=Vm();/**
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
 */const pf=new Tc("@firebase/app-compat"),DE="@firebase/app-compat",NE="0.5.6";/**
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
 */function VE(r){en(DE,NE,r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */try{const r=Vu();if(r.firebase!==void 0){pf.warn(`
      Warning: Firebase is already defined in the global scope. Please make sure
      Firebase library is only loaded once.
    `);const e=r.firebase.SDK_VERSION;e&&e.indexOf("LITE")>=0&&pf.warn(`
        Warning: You are trying to load Firebase while using Firebase Performance standalone script.
        You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.
        `)}}catch{}const dt=xE;VE();var OE="firebase",ME="12.7.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */dt.registerVersion(OE,ME,"app-compat");const $s={FACEBOOK:"facebook.com",GITHUB:"github.com",GOOGLE:"google.com",PASSWORD:"password",TWITTER:"twitter.com"},Ri={EMAIL_SIGNIN:"EMAIL_SIGNIN",PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",REVERT_SECOND_FACTOR_ADDITION:"REVERT_SECOND_FACTOR_ADDITION",VERIFY_AND_CHANGE_EMAIL:"VERIFY_AND_CHANGE_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function LE(){return{"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-change-needs-verification":"Multi-factor users must always have a verified email.","email-already-in-use":"The email address is already in use by another account.","emulator-config-failed":'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "connectAuthEmulator()" sooner.',"expired-action-code":"The action code has expired.","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal AuthError has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registered for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal AuthError has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure to use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-emulator-scheme":"Emulator URL must start with a valid scheme (http:// or https://).","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is incorrect, malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-multi-factor-session":"The request does not contain a valid proof of first factor successful sign-in.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","login-blocked":"Login blocked by user-provided method: {$originalMessage}","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal AuthError has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-password":"A non-empty password must be provided","missing-multi-factor-info":"No second factor identifier is provided.","missing-multi-factor-session":"The request is missing proof of first factor successful sign-in.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","multi-factor-info-not-found":"The user does not have a second factor matching the identifier provided.","multi-factor-auth-required":"Proof of ownership of a second factor is required to complete sign-in.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal AuthError has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","second-factor-already-in-use":"The second factor is already enrolled on this account.","maximum-second-factor-count-exceeded":"The maximum allowed number of second factors on a user has been exceeded.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-first-factor":"Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","unverified-email":"The operation requires a verified email.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled.","already-initialized":"initializeAuth() has already been called with different options. To avoid this error, call initializeAuth() with the same options as when it was originally called, or call getAuth() to return the already initialized instance.","missing-recaptcha-token":"The reCAPTCHA token is missing when sending request to the backend.","invalid-recaptcha-token":"The reCAPTCHA token is invalid when sending request to the backend.","invalid-recaptcha-action":"The reCAPTCHA action is invalid when sending request to the backend.","recaptcha-not-enabled":"reCAPTCHA Enterprise integration is not enabled for this project.","missing-client-type":"The reCAPTCHA client type is missing when sending request to the backend.","missing-recaptcha-version":"The reCAPTCHA version is missing when sending request to the backend.","invalid-req-type":"Invalid request parameters.","invalid-recaptcha-version":"The reCAPTCHA version is invalid when sending request to the backend.","unsupported-password-policy-schema-version":"The password policy received from the backend uses a schema version that is not supported by this version of the Firebase SDK.","password-does-not-meet-requirements":"The password does not meet the requirements.","invalid-hosting-link-domain":"The provided Hosting link domain is not configured in Firebase Hosting or is not owned by the current project. This cannot be a default Hosting domain (`web.app` or `firebaseapp.com`)."}}function Om(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const FE=LE,UE=Om,Mm=new gi("auth","Firebase",Om());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Za=new Tc("@firebase/auth");function BE(r,...e){Za.logLevel<=we.WARN&&Za.warn(`Auth (${br}): ${r}`,...e)}function Oa(r,...e){Za.logLevel<=we.ERROR&&Za.error(`Auth (${br}): ${r}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _t(r,...e){throw Ku(r,...e)}function ot(r,...e){return Ku(r,...e)}function zu(r,e,t){const n={...UE(),[e]:t};return new gi("auth","Firebase",n).create(e,{appName:r.name})}function ft(r){return zu(r,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function ys(r,e,t){const n=t;if(!(e instanceof n))throw n.name!==e.constructor.name&&_t(r,"argument-error"),zu(r,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function Ku(r,...e){if(typeof r!="string"){const t=e[0],n=[...e.slice(1)];return n[0]&&(n[0].appName=r.name),r._errorFactory.create(t,...n)}return Mm.create(r,...e)}function z(r,e,...t){if(!r)throw Ku(e,...t)}function gn(r){const e="INTERNAL ASSERTION FAILED: "+r;throw Oa(e),new Error(e)}function rn(r,e){r||gn(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function bo(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.href)||""}function ju(){return mf()==="http:"||mf()==="https:"}function mf(){var r;return typeof self<"u"&&((r=self.location)==null?void 0:r.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qE(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(ju()||ym()||"connection"in navigator)?navigator.onLine:!0}function $E(){if(typeof navigator>"u")return null;const r=navigator;return r.languages&&r.languages[0]||r.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Go{constructor(e,t){this.shortDelay=e,this.longDelay=t,rn(t>e,"Short delay should be less than long delay!"),this.isMobile=sI()||Lu()}get(){return qE()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gu(r,e){rn(r.emulator,"Emulator should always be set here");const{url:t}=r.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lm{static initialize(e,t,n){this.fetchImpl=e,t&&(this.headersImpl=t),n&&(this.responseImpl=n)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;gn("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;gn("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;gn("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zE={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const KE=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],jE=new Go(3e4,6e4);function Qe(r,e){return r.tenantId&&!e.tenantId?{...e,tenantId:r.tenantId}:e}async function Ye(r,e,t,n,i={}){return Fm(r,i,async()=>{let s={},o={};n&&(e==="GET"?o=n:s={body:JSON.stringify(n)});const c=gs({key:r.config.apiKey,...o}).slice(1),l=await r._getAdditionalHeaders();l["Content-Type"]="application/json",r.languageCode&&(l["X-Firebase-Locale"]=r.languageCode);const u={method:e,headers:l,...s};return aI()||(u.referrerPolicy="no-referrer"),r.emulatorConfig&&ms(r.emulatorConfig.host)&&(u.credentials="include"),Lm.fetch()(await Um(r,r.config.apiHost,t,c),u)})}async function Fm(r,e,t){r._canInitEmulator=!1;const n={...zE,...e};try{const i=new WE(r),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();const o=await s.json();if("needConfirmation"in o)throw Xs(r,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{const c=s.ok?o.errorMessage:o.error.message,[l,u]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw Xs(r,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw Xs(r,"email-already-in-use",o);if(l==="USER_DISABLED")throw Xs(r,"user-disabled",o);const d=n[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(u)throw zu(r,d,u);_t(r,d)}}catch(i){if(i instanceof xt)throw i;_t(r,"network-request-failed",{message:String(i)})}}async function Mn(r,e,t,n,i={}){const s=await Ye(r,e,t,n,i);return"mfaPendingCredential"in s&&_t(r,"multi-factor-auth-required",{_serverResponse:s}),s}async function Um(r,e,t,n){const i=`${e}${t}?${n}`,s=r,o=s.config.emulator?Gu(r.config,i):`${r.config.apiScheme}://${i}`;return KE.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function GE(r){switch(r){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class WE{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,n)=>{this.timer=setTimeout(()=>n(ot(this.auth,"network-request-failed")),jE.get())})}}function Xs(r,e,t){const n={appName:r.name};t.email&&(n.email=t.email),t.phoneNumber&&(n.phoneNumber=t.phoneNumber);const i=ot(r,e,n);return i.customData._tokenResponse=t,i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gf(r){return r!==void 0&&r.getResponse!==void 0}function yf(r){return r!==void 0&&r.enterprise!==void 0}class Bm{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return GE(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function HE(r){return(await Ye(r,"GET","/v1/recaptchaParams")).recaptchaSiteKey||""}async function qm(r,e){return Ye(r,"GET","/v2/recaptchaConfig",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function QE(r,e){return Ye(r,"POST","/v1/accounts:delete",e)}async function YE(r,e){return Ye(r,"POST","/v1/accounts:update",e)}async function ec(r,e){return Ye(r,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oo(r){if(r)try{const e=new Date(Number(r));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function JE(r,e=!1){const t=le(r),n=await t.getIdToken(e),i=bc(n);z(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");const s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:n,authTime:oo(Pl(i.auth_time)),issuedAtTime:oo(Pl(i.iat)),expirationTime:oo(Pl(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function Pl(r){return Number(r)*1e3}function bc(r){const[e,t,n]=r.split(".");if(e===void 0||t===void 0||n===void 0)return Oa("JWT malformed, contained fewer than 3 sections"),null;try{const i=Nu(t);return i?JSON.parse(i):(Oa("Failed to decode base64 JWT payload"),null)}catch(i){return Oa("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function _f(r){const e=bc(r);return z(e,"internal-error"),z(typeof e.exp<"u","internal-error"),z(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nn(r,e,t=!1){if(t)return e;try{return await e}catch(n){throw n instanceof xt&&XE(n)&&r.auth.currentUser===r&&await r.auth.signOut(),n}}function XE({code:r}){return r==="auth/user-disabled"||r==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ZE{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const n=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,n)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gl{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=oo(this.lastLoginAt),this.creationTime=oo(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
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
 */async function Ao(r){var p;const e=r.auth,t=await r.getIdToken(),n=await Nn(r,ec(e,{idToken:t}));z(n==null?void 0:n.users.length,e,"internal-error");const i=n.users[0];r._notifyReloadListener(i);const s=(p=i.providerUserInfo)!=null&&p.length?$m(i.providerUserInfo):[],o=tv(r.providerData,s),c=r.isAnonymous,l=!(r.email&&i.passwordHash)&&!(o!=null&&o.length),u=c?l:!1,d={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:o,metadata:new Gl(i.createdAt,i.lastLoginAt),isAnonymous:u};Object.assign(r,d)}async function ev(r){const e=le(r);await Ao(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function tv(r,e){return[...r.filter(n=>!e.some(i=>i.providerId===n.providerId)),...e]}function $m(r){return r.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function nv(r,e){const t=await Fm(r,{},async()=>{const n=gs({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=r.config,o=await Um(r,i,"/v1/token",`key=${s}`),c=await r._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:n};return r.emulatorConfig&&ms(r.emulatorConfig.host)&&(l.credentials="include"),Lm.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function rv(r,e){return Ye(r,"POST","/v2/accounts:revokeToken",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bi{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){z(e.idToken,"internal-error"),z(typeof e.idToken<"u","internal-error"),z(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):_f(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){z(e.length!==0,"internal-error");const t=_f(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(z(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:n,refreshToken:i,expiresIn:s}=await nv(e,t);this.updateTokensAndExpiration(n,i,Number(s))}updateTokensAndExpiration(e,t,n){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+n*1e3}static fromJSON(e,t){const{refreshToken:n,accessToken:i,expirationTime:s}=t,o=new Bi;return n&&(z(typeof n=="string","internal-error",{appName:e}),o.refreshToken=n),i&&(z(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(z(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Bi,this.toJSON())}_performRefresh(){return gn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xn(r,e){z(typeof r=="string"||typeof r>"u","internal-error",{appName:e})}class Zt{constructor({uid:e,auth:t,stsTokenManager:n,...i}){this.providerId="firebase",this.proactiveRefresh=new ZE(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=n,this.accessToken=n.accessToken,this.displayName=i.displayName||null,this.email=i.email||null,this.emailVerified=i.emailVerified||!1,this.phoneNumber=i.phoneNumber||null,this.photoURL=i.photoURL||null,this.isAnonymous=i.isAnonymous||!1,this.tenantId=i.tenantId||null,this.providerData=i.providerData?[...i.providerData]:[],this.metadata=new Gl(i.createdAt||void 0,i.lastLoginAt||void 0)}async getIdToken(e){const t=await Nn(this,this.stsTokenManager.getToken(this.auth,e));return z(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return JE(this,e)}reload(){return ev(this)}_assign(e){this!==e&&(z(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Zt({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){z(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let n=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),n=!0),t&&await Ao(this),await this.auth._persistUserIfCurrent(this),n&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Ue(this.auth.app))return Promise.reject(ft(this.auth));const e=await this.getIdToken();return await Nn(this,QE(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const n=t.displayName??void 0,i=t.email??void 0,s=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,u=t.createdAt??void 0,d=t.lastLoginAt??void 0,{uid:p,emailVerified:m,isAnonymous:v,providerData:M,stsTokenManager:F}=t;z(p&&F,e,"internal-error");const U=Bi.fromJSON(this.name,F);z(typeof p=="string",e,"internal-error"),Xn(n,e.name),Xn(i,e.name),z(typeof m=="boolean",e,"internal-error"),z(typeof v=="boolean",e,"internal-error"),Xn(s,e.name),Xn(o,e.name),Xn(c,e.name),Xn(l,e.name),Xn(u,e.name),Xn(d,e.name);const X=new Zt({uid:p,auth:e,email:i,emailVerified:m,displayName:n,isAnonymous:v,photoURL:o,phoneNumber:s,tenantId:c,stsTokenManager:U,createdAt:u,lastLoginAt:d});return M&&Array.isArray(M)&&(X.providerData=M.map(ie=>({...ie}))),l&&(X._redirectEventId=l),X}static async _fromIdTokenResponse(e,t,n=!1){const i=new Bi;i.updateFromServerResponse(t);const s=new Zt({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:n});return await Ao(s),s}static async _fromGetAccountInfoResponse(e,t,n){const i=t.users[0];z(i.localId!==void 0,"internal-error");const s=i.providerUserInfo!==void 0?$m(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new Bi;c.updateFromIdToken(n);const l=new Zt({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),u={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Gl(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(l,u),l}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wf=new Map;function zt(r){rn(r instanceof Function,"Expected a class definition");let e=wf.get(r);return e?(rn(e instanceof r,"Instance stored in cache mismatched with class"),e):(e=new r,wf.set(r,e),e)}/**
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
 */class zm{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}zm.type="NONE";const Hi=zm;/**
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
 */function ei(r,e,t){return`firebase:${r}:${e}:${t}`}class qi{constructor(e,t,n){this.persistence=e,this.auth=t,this.userKey=n;const{config:i,name:s}=this.auth;this.fullUserKey=ei(this.userKey,i.apiKey,s),this.fullPersistenceKey=ei("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ec(this.auth,{idToken:e}).catch(()=>{});return t?Zt._fromGetAccountInfoResponse(this.auth,t,e):null}return Zt._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,n="authUser"){if(!t.length)return new qi(zt(Hi),e,n);const i=(await Promise.all(t.map(async u=>{if(await u._isAvailable())return u}))).filter(u=>u);let s=i[0]||zt(Hi);const o=ei(n,e.config.apiKey,e.name);let c=null;for(const u of t)try{const d=await u._get(o);if(d){let p;if(typeof d=="string"){const m=await ec(e,{idToken:d}).catch(()=>{});if(!m)break;p=await Zt._fromGetAccountInfoResponse(e,m,d)}else p=Zt._fromJSON(e,d);u!==s&&(c=p),s=u;break}}catch{}const l=i.filter(u=>u._shouldAllowMigration);return!s._shouldAllowMigration||!l.length?new qi(s,e,n):(s=l[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async u=>{if(u!==s)try{await u._remove(o)}catch{}})),new qi(s,e,n))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function If(r){const e=r.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Wm(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Km(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Hm(e))return"Blackberry";if(Qm(e))return"Webos";if(jm(e))return"Safari";if((e.includes("chrome/")||Gm(e))&&!e.includes("edge/"))return"Chrome";if(Wo(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,n=r.match(t);if((n==null?void 0:n.length)===2)return n[1]}return"Other"}function Km(r=Ke()){return/firefox\//i.test(r)}function jm(r=Ke()){const e=r.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Gm(r=Ke()){return/crios\//i.test(r)}function Wm(r=Ke()){return/iemobile/i.test(r)}function Wo(r=Ke()){return/android/i.test(r)}function Hm(r=Ke()){return/blackberry/i.test(r)}function Qm(r=Ke()){return/webos/i.test(r)}function Ho(r=Ke()){return/iphone|ipad|ipod/i.test(r)||/macintosh/i.test(r)&&/mobile/i.test(r)}function iv(r=Ke()){return/(iPad|iPhone|iPod).*OS 7_\d/i.test(r)||/(iPad|iPhone|iPod).*OS 8_\d/i.test(r)}function sv(r=Ke()){var e;return Ho(r)&&!!((e=window.navigator)!=null&&e.standalone)}function ov(){return _m()&&document.documentMode===10}function Ym(r=Ke()){return Ho(r)||Wo(r)||Qm(r)||Hm(r)||/windows phone/i.test(r)||Wm(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jm(r,e=[]){let t;switch(r){case"Browser":t=If(Ke());break;case"Worker":t=`${If(Ke())}-${r}`;break;default:t=r}const n=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${br}/${n}`}/**
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
 */class av{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const n=s=>new Promise((o,c)=>{try{const l=e(s);o(l)}catch(l){c(l)}});n.onAbort=t,this.queue.push(n);const i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const n of this.queue)await n(e),n.onAbort&&t.push(n.onAbort)}catch(n){t.reverse();for(const i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:n==null?void 0:n.message})}}}/**
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
 */async function cv(r,e={}){return Ye(r,"GET","/v2/passwordPolicy",Qe(r,e))}/**
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
 */const lv=6;class uv{constructor(e){var n;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??lv,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((n=e.allowedNonAlphanumericCharacters)==null?void 0:n.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const n=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;n&&(t.meetsMinPasswordLength=e.length>=n),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let n;for(let i=0;i<e.length;i++)n=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,n>="a"&&n<="z",n>="A"&&n<="Z",n>="0"&&n<="9",this.allowedNonAlphanumericCharacters.includes(n))}updatePasswordCharacterOptionsStatuses(e,t,n,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=n)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hv{constructor(e,t,n,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=n,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Ef(this),this.idTokenSubscription=new Ef(this),this.beforeStateQueue=new av(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Mm,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=zt(t)),this._initializationPromise=this.queue(async()=>{var n,i,s;if(!this._deleted&&(this.persistenceManager=await qi.create(this,e),(n=this._resolvePersistenceManagerAvailable)==null||n.call(this),!this._deleted)){if((i=this._popupRedirectResolver)!=null&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)==null?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ec(this,{idToken:e}),n=await Zt._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(n)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var s;if(Ue(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let n=t,i=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(s=this.redirectUser)==null?void 0:s._redirectEventId,c=n==null?void 0:n._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(n=l.user,i=!0)}if(!n)return this.directlySetCurrentUser(null);if(!n._redirectEventId){if(i)try{await this.beforeStateQueue.runMiddleware(n)}catch(o){n=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return n?this.reloadAndSetCurrentUserOrClear(n):this.directlySetCurrentUser(null)}return z(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===n._redirectEventId?this.directlySetCurrentUser(n):this.reloadAndSetCurrentUserOrClear(n)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Ao(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=$E()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Ue(this.app))return Promise.reject(ft(this));const t=e?le(e):null;return t&&z(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&z(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Ue(this.app)?Promise.reject(ft(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Ue(this.app)?Promise.reject(ft(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(zt(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await cv(this),t=new uv(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new gi("auth","Firebase",e())}onAuthStateChanged(e,t,n){return this.registerStateListener(this.authStateSubscription,e,t,n)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,n){return this.registerStateListener(this.idTokenSubscription,e,t,n)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const n=this.onAuthStateChanged(()=>{n(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),n={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(n.tenantId=this.tenantId),await rv(this,n)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const n=await this.getOrInitRedirectPersistenceManager(t);return e===null?n.removeCurrentUser():n.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&zt(e)||this._popupRedirectResolver;z(t,this,"argument-error"),this.redirectPersistenceManager=await qi.create(this,[zt(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,n;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((n=this.redirectUser)==null?void 0:n._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,n,i){if(this._deleted)return()=>{};const s=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(z(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,n,i);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return z(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Jm(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var i;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((i=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:i.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const n=await this._getAppCheckToken();return n&&(e["X-Firebase-AppCheck"]=n),e}async _getAppCheckToken(){var t;if(Ue(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&BE(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function je(r){return le(r)}class Ef{constructor(e){this.auth=e,this.observer=null,this.addObserver=Em(t=>this.observer=t)}get next(){return z(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Qo={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function dv(r){Qo=r}function Wu(r){return Qo.loadJS(r)}function fv(){return Qo.recaptchaV2Script}function pv(){return Qo.recaptchaEnterpriseScript}function mv(){return Qo.gapiScript}function Xm(r){return`__${r}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gv=500,yv=6e4,Ra=1e12;class _v{constructor(e){this.auth=e,this.counter=Ra,this._widgets=new Map}render(e,t){const n=this.counter;return this._widgets.set(n,new Ev(e,this.auth.name,t||{})),this.counter++,n}reset(e){var n;const t=e||Ra;(n=this._widgets.get(t))==null||n.delete(),this._widgets.delete(t)}getResponse(e){var n;const t=e||Ra;return((n=this._widgets.get(t))==null?void 0:n.getResponse())||""}async execute(e){var n;const t=e||Ra;return(n=this._widgets.get(t))==null||n.execute(),""}}class wv{constructor(){this.enterprise=new Iv}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Iv{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}}class Ev{constructor(e,t,n){this.params=n,this.timerId=null,this.deleted=!1,this.responseToken=null,this.clickHandler=()=>{this.execute()};const i=typeof e=="string"?document.getElementById(e):e;z(i,"argument-error",{appName:t}),this.container=i,this.isVisible=this.params.size!=="invisible",this.isVisible?this.execute():this.container.addEventListener("click",this.clickHandler)}getResponse(){return this.checkIfDeleted(),this.responseToken}delete(){this.checkIfDeleted(),this.deleted=!0,this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.container.removeEventListener("click",this.clickHandler)}execute(){this.checkIfDeleted(),!this.timerId&&(this.timerId=window.setTimeout(()=>{this.responseToken=vv(50);const{callback:e,"expired-callback":t}=this.params;if(e)try{e(this.responseToken)}catch{}this.timerId=window.setTimeout(()=>{if(this.timerId=null,this.responseToken=null,t)try{t()}catch{}this.isVisible&&this.execute()},yv)},gv))}checkIfDeleted(){if(this.deleted)throw new Error("reCAPTCHA mock was already deleted!")}}function vv(r){const e=[],t="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let n=0;n<r;n++)e.push(t.charAt(Math.floor(Math.random()*t.length)));return e.join("")}const Tv="recaptcha-enterprise",ao="NO_RECAPTCHA";class Zm{constructor(e){this.type=Tv,this.auth=je(e)}async verify(e="verify",t=!1){async function n(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{qm(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(l=>{if(l.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{const u=new Bm(l);return s.tenantId==null?s._agentRecaptchaConfig=u:s._tenantRecaptchaConfigs[s.tenantId]=u,o(u.siteKey)}}).catch(l=>{c(l)})})}function i(s,o,c){const l=window.grecaptcha;yf(l)?l.enterprise.ready(()=>{l.enterprise.execute(s,{action:e}).then(u=>{o(u)}).catch(()=>{o(ao)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new wv().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{n(this.auth).then(c=>{if(!t&&yf(window.grecaptcha))i(c,s,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let l=pv();l.length!==0&&(l+=c),Wu(l).then(()=>{i(c,s,o)}).catch(u=>{o(u)})}}).catch(c=>{o(c)})})}}async function zs(r,e,t,n=!1,i=!1){const s=new Zm(r);let o;if(i)o=ao;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}const c={...e};if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){const l=c.phoneEnrollmentInfo.phoneNumber,u=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:l,recaptchaToken:u,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){const l=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return n?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function cr(r,e,t,n,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if((s=r._getRecaptchaConfig())!=null&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const c=await zs(r,e,t,t==="getOobCode");return n(r,c)}else return n(r,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const l=await zs(r,e,t,t==="getOobCode");return n(r,l)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if((o=r._getRecaptchaConfig())!=null&&o.isProviderEnabled("PHONE_PROVIDER")){const c=await zs(r,e,t);return n(r,c).catch(async l=>{var u;if(((u=r._getRecaptchaConfig())==null?void 0:u.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(l.code==="auth/missing-recaptcha-token"||l.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);const d=await zs(r,e,t,!1,!0);return n(r,d)}return Promise.reject(l)})}else{const c=await zs(r,e,t,!1,!0);return n(r,c)}else return Promise.reject(i+" provider is not supported.")}async function bv(r){const e=je(r),t=await qm(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),n=new Bm(t);e.tenantId==null?e._agentRecaptchaConfig=n:e._tenantRecaptchaConfigs[e.tenantId]=n,n.isAnyProviderEnabled()&&new Zm(e).verify()}function Av(r,e){const t=(e==null?void 0:e.persistence)||[],n=(Array.isArray(t)?t:[t]).map(zt);e!=null&&e.errorMap&&r._updateErrorMap(e.errorMap),r._initializeWithPersistence(n,e==null?void 0:e.popupRedirectResolver)}function Sv(r,e,t){const n=je(r);z(/^https?:\/\//.test(e),n,"invalid-emulator-scheme");const i=!!(t!=null&&t.disableWarnings),s=eg(e),{host:o,port:c}=Rv(e),l=c===null?"":`:${c}`,u={url:`${s}//${o}${l}/`},d=Object.freeze({host:o,port:c,protocol:s.replace(":",""),options:Object.freeze({disableWarnings:i})});if(!n._canInitEmulator){z(n.config.emulator&&n.emulatorConfig,n,"emulator-config-failed"),z(dr(u,n.config.emulator)&&dr(d,n.emulatorConfig),n,"emulator-config-failed");return}n.config.emulator=u,n.emulatorConfig=d,n.settings.appVerificationDisabledForTesting=!0,ms(o)?(pm(`${s}//${o}${l}`),mm("Auth",!0)):i||Pv()}function eg(r){const e=r.indexOf(":");return e<0?"":r.substr(0,e+1)}function Rv(r){const e=eg(r),t=/(\/\/)?([^?#/]+)/.exec(r.substr(e.length));if(!t)return{host:"",port:null};const n=t[2].split("@").pop()||"",i=/^(\[[^\]]+\])(:|$)/.exec(n);if(i){const s=i[1];return{host:s,port:vf(n.substr(s.length+1))}}else{const[s,o]=n.split(":");return{host:s,port:vf(o)}}}function vf(r){if(!r)return null;const e=Number(r);return isNaN(e)?null:e}function Pv(){function r(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",r):r())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _s{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return gn("not implemented")}_getIdTokenResponse(e){return gn("not implemented")}_linkToIdToken(e,t){return gn("not implemented")}_getReauthenticationResolver(e){return gn("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function tg(r,e){return Ye(r,"POST","/v1/accounts:resetPassword",Qe(r,e))}async function Cv(r,e){return Ye(r,"POST","/v1/accounts:update",e)}async function kv(r,e){return Ye(r,"POST","/v1/accounts:signUp",e)}async function xv(r,e){return Ye(r,"POST","/v1/accounts:update",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dv(r,e){return Mn(r,"POST","/v1/accounts:signInWithPassword",Qe(r,e))}async function Ac(r,e){return Ye(r,"POST","/v1/accounts:sendOobCode",Qe(r,e))}async function Nv(r,e){return Ac(r,e)}async function Vv(r,e){return Ac(r,e)}async function Ov(r,e){return Ac(r,e)}async function Mv(r,e){return Ac(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lv(r,e){return Mn(r,"POST","/v1/accounts:signInWithEmailLink",Qe(r,e))}async function Fv(r,e){return Mn(r,"POST","/v1/accounts:signInWithEmailLink",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class So extends _s{constructor(e,t,n,i=null){super("password",n),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new So(e,t,"password")}static _fromEmailAndCode(e,t,n=null){return new So(e,t,"emailLink",n)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":const t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return cr(e,t,"signInWithPassword",Dv,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Lv(e,{email:this._email,oobCode:this._password});default:_t(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":const n={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return cr(e,n,"signUpPassword",kv,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Fv(e,{idToken:t,email:this._email,oobCode:this._password});default:_t(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function xn(r,e){return Mn(r,"POST","/v1/accounts:signInWithIdp",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Uv="http://localhost";class Tn extends _s{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Tn(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):_t("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,...s}=t;if(!n||!i)return null;const o=new Tn(n,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return xn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,xn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,xn(e,t)}buildRequest(){const e={requestUri:Uv,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=gs(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Tf(r,e){return Ye(r,"POST","/v1/accounts:sendVerificationCode",Qe(r,e))}async function Bv(r,e){return Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",Qe(r,e))}async function qv(r,e){const t=await Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",Qe(r,e));if(t.temporaryProof)throw Xs(r,"account-exists-with-different-credential",t);return t}const $v={USER_NOT_FOUND:"user-not-found"};async function zv(r,e){const t={...e,operation:"REAUTH"};return Mn(r,"POST","/v1/accounts:signInWithPhoneNumber",Qe(r,t),$v)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ti extends _s{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new ti({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new ti({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return Bv(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return qv(e,{idToken:t,...this._makeVerificationRequest()})}_getReauthenticationResolver(e){return zv(e,this._makeVerificationRequest())}_makeVerificationRequest(){const{temporaryProof:e,phoneNumber:t,verificationId:n,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:n,code:i}}toJSON(){const e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));const{verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s}=e;return!n&&!t&&!i&&!s?null:new ti({verificationId:t,verificationCode:n,phoneNumber:i,temporaryProof:s})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Kv(r){switch(r){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function jv(r){const e=Ui(Js(r)).link,t=e?Ui(Js(e)).deep_link_id:null,n=Ui(Js(r)).deep_link_id;return(n?Ui(Js(n)).link:null)||n||t||e||r}class Sc{constructor(e){const t=Ui(Js(e)),n=t.apiKey??null,i=t.oobCode??null,s=Kv(t.mode??null);z(n&&i&&s,"argument-error"),this.apiKey=n,this.operation=s,this.code=i,this.continueUrl=t.continueUrl??null,this.languageCode=t.lang??null,this.tenantId=t.tenantId??null}static parseLink(e){const t=jv(e);try{return new Sc(t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ar{constructor(){this.providerId=Ar.PROVIDER_ID}static credential(e,t){return So._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){const n=Sc.parseLink(t);return z(n,"argument-error"),So._fromEmailAndCode(e,n.code,n.tenantId)}}Ar.PROVIDER_ID="password";Ar.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Ar.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class ws extends Ln{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}class $i extends ws{static credentialFromJSON(e){const t=typeof e=="string"?JSON.parse(e):e;return z("providerId"in t&&"signInMethod"in t,"argument-error"),Tn._fromParams(t)}credential(e){return this._credential({...e,nonce:e.rawNonce})}_credential(e){return z(e.idToken||e.accessToken,"argument-error"),Tn._fromParams({...e,providerId:this.providerId,signInMethod:this.providerId})}static credentialFromResult(e){return $i.oauthCredentialFromTaggedObject(e)}static credentialFromError(e){return $i.oauthCredentialFromTaggedObject(e.customData||{})}static oauthCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n,oauthTokenSecret:i,pendingToken:s,nonce:o,providerId:c}=e;if(!n&&!i&&!t&&!s||!c)return null;try{return new $i(c)._credential({idToken:t,accessToken:n,nonce:o,pendingToken:s})}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn extends ws{constructor(){super("facebook.com")}static credential(e){return Tn._fromParams({providerId:dn.PROVIDER_ID,signInMethod:dn.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return dn.credentialFromTaggedObject(e)}static credentialFromError(e){return dn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return dn.credential(e.oauthAccessToken)}catch{return null}}}dn.FACEBOOK_SIGN_IN_METHOD="facebook.com";dn.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fn extends ws{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Tn._fromParams({providerId:fn.PROVIDER_ID,signInMethod:fn.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return fn.credentialFromTaggedObject(e)}static credentialFromError(e){return fn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:n}=e;if(!t&&!n)return null;try{return fn.credential(t,n)}catch{return null}}}fn.GOOGLE_SIGN_IN_METHOD="google.com";fn.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pn extends ws{constructor(){super("github.com")}static credential(e){return Tn._fromParams({providerId:pn.PROVIDER_ID,signInMethod:pn.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return pn.credentialFromTaggedObject(e)}static credentialFromError(e){return pn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return pn.credential(e.oauthAccessToken)}catch{return null}}}pn.GITHUB_SIGN_IN_METHOD="github.com";pn.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gv="http://localhost";class Qi extends _s{constructor(e,t){super(e,e),this.pendingToken=t}_getIdTokenResponse(e){const t=this.buildRequest();return xn(e,t)}_linkToIdToken(e,t){const n=this.buildRequest();return n.idToken=t,xn(e,n)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,xn(e,t)}toJSON(){return{signInMethod:this.signInMethod,providerId:this.providerId,pendingToken:this.pendingToken}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:n,signInMethod:i,pendingToken:s}=t;return!n||!i||!s||n!==i?null:new Qi(n,s)}static _create(e,t){return new Qi(e,t)}buildRequest(){return{requestUri:Gv,returnSecureToken:!0,pendingToken:this.pendingToken}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wv="saml.";class tc extends Ln{constructor(e){z(e.startsWith(Wv),"argument-error"),super(e)}static credentialFromResult(e){return tc.samlCredentialFromTaggedObject(e)}static credentialFromError(e){return tc.samlCredentialFromTaggedObject(e.customData||{})}static credentialFromJSON(e){const t=Qi.fromJSON(e);return z(t,"argument-error"),t}static samlCredentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{pendingToken:t,providerId:n}=e;if(!t||!n)return null;try{return Qi._create(n,t)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mn extends ws{constructor(){super("twitter.com")}static credential(e,t){return Tn._fromParams({providerId:mn.PROVIDER_ID,signInMethod:mn.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return mn.credentialFromTaggedObject(e)}static credentialFromError(e){return mn.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:n}=e;if(!t||!n)return null;try{return mn.credential(t,n)}catch{return null}}}mn.TWITTER_SIGN_IN_METHOD="twitter.com";mn.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ng(r,e){return Mn(r,"POST","/v1/accounts:signUp",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,n,i=!1){const s=await Zt._fromIdTokenResponse(e,n,i),o=bf(n);return new Jt({user:s,providerId:o,_tokenResponse:n,operationType:t})}static async _forOperation(e,t,n){await e._updateTokensIfNecessary(n,!0);const i=bf(n);return new Jt({user:e,providerId:i,_tokenResponse:n,operationType:t})}}function bf(r){return r.providerId?r.providerId:"phoneNumber"in r?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hv(r){var i;if(Ue(r.app))return Promise.reject(ft(r));const e=je(r);if(await e._initializationPromise,(i=e.currentUser)!=null&&i.isAnonymous)return new Jt({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await ng(e,{returnSecureToken:!0}),n=await Jt._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(n.user),n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc extends xt{constructor(e,t,n,i){super(t.code,t.message),this.operationType=n,this.user=i,Object.setPrototypeOf(this,nc.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:n}}static _fromErrorAndOperation(e,t,n,i){return new nc(e,t,n,i)}}function rg(r,e,t,n){return(e==="reauthenticate"?t._getReauthenticationResolver(r):t._getIdTokenResponse(r)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?nc._fromErrorAndOperation(r,s,e,n):s})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ig(r){return new Set(r.map(({providerId:e})=>e).filter(e=>!!e))}/**
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
 */async function Qv(r,e){const t=le(r);await Rc(!0,t,e);const{providerUserInfo:n}=await YE(t.auth,{idToken:await t.getIdToken(),deleteProvider:[e]}),i=ig(n||[]);return t.providerData=t.providerData.filter(s=>i.has(s.providerId)),i.has("phone")||(t.phoneNumber=null),await t.auth._persistUserIfCurrent(t),t}async function Hu(r,e,t=!1){const n=await Nn(r,e._linkToIdToken(r.auth,await r.getIdToken()),t);return Jt._forOperation(r,"link",n)}async function Rc(r,e,t){await Ao(e);const n=ig(e.providerData),i=r===!1?"provider-already-linked":"no-such-provider";z(n.has(t)===r,e.auth,i)}/**
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
 */async function sg(r,e,t=!1){const{auth:n}=r;if(Ue(n.app))return Promise.reject(ft(n));const i="reauthenticate";try{const s=await Nn(r,rg(n,i,e,r),t);z(s.idToken,n,"internal-error");const o=bc(s.idToken);z(o,n,"internal-error");const{sub:c}=o;return z(r.uid===c,n,"user-mismatch"),Jt._forOperation(r,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&_t(n,"user-mismatch"),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function og(r,e,t=!1){if(Ue(r.app))return Promise.reject(ft(r));const n="signIn",i=await rg(r,n,e),s=await Jt._fromIdTokenResponse(r,n,i);return t||await r._updateCurrentUser(s.user),s}async function Pc(r,e){return og(je(r),e)}async function ag(r,e){const t=le(r);return await Rc(!1,t,e.providerId),Hu(t,e)}async function cg(r,e){return sg(le(r),e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Yv(r,e){return Mn(r,"POST","/v1/accounts:signInWithCustomToken",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Jv(r,e){if(Ue(r.app))return Promise.reject(ft(r));const t=je(r),n=await Yv(t,{token:e,returnSecureToken:!0}),i=await Jt._fromIdTokenResponse(t,"signIn",n);return await t._updateCurrentUser(i.user),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yo{constructor(e,t){this.factorId=e,this.uid=t.mfaEnrollmentId,this.enrollmentTime=new Date(t.enrolledAt).toUTCString(),this.displayName=t.displayName}static _fromServerResponse(e,t){return"phoneInfo"in t?Qu._fromServerResponse(e,t):"totpInfo"in t?Yu._fromServerResponse(e,t):_t(e,"internal-error")}}class Qu extends Yo{constructor(e){super("phone",e),this.phoneNumber=e.phoneInfo}static _fromServerResponse(e,t){return new Qu(t)}}class Yu extends Yo{constructor(e){super("totp",e)}static _fromServerResponse(e,t){return new Yu(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cc(r,e,t){var n;z(((n=t.url)==null?void 0:n.length)>0,r,"invalid-continue-uri"),z(typeof t.dynamicLinkDomain>"u"||t.dynamicLinkDomain.length>0,r,"invalid-dynamic-link-domain"),z(typeof t.linkDomain>"u"||t.linkDomain.length>0,r,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(z(t.iOS.bundleId.length>0,r,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(z(t.android.packageName.length>0,r,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ju(r){const e=je(r);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function Xv(r,e,t){const n=je(r),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&Cc(n,i,t),await cr(n,i,"getOobCode",Vv,"EMAIL_PASSWORD_PROVIDER")}async function Zv(r,e,t){await tg(le(r),{oobCode:e,newPassword:t}).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Ju(r),n})}async function eT(r,e){await xv(le(r),{oobCode:e})}async function lg(r,e){const t=le(r),n=await tg(t,{oobCode:e}),i=n.requestType;switch(z(i,t,"internal-error"),i){case"EMAIL_SIGNIN":break;case"VERIFY_AND_CHANGE_EMAIL":z(n.newEmail,t,"internal-error");break;case"REVERT_SECOND_FACTOR_ADDITION":z(n.mfaInfo,t,"internal-error");default:z(n.email,t,"internal-error")}let s=null;return n.mfaInfo&&(s=Yo._fromServerResponse(je(t),n.mfaInfo)),{data:{email:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.newEmail:n.email)||null,previousEmail:(n.requestType==="VERIFY_AND_CHANGE_EMAIL"?n.email:n.newEmail)||null,multiFactorInfo:s},operation:i}}async function tT(r,e){const{data:t}=await lg(le(r),e);return t.email}async function nT(r,e,t){if(Ue(r.app))return Promise.reject(ft(r));const n=je(r),o=await cr(n,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",ng,"EMAIL_PASSWORD_PROVIDER").catch(l=>{throw l.code==="auth/password-does-not-meet-requirements"&&Ju(r),l}),c=await Jt._fromIdTokenResponse(n,"signIn",o);return await n._updateCurrentUser(c.user),c}function rT(r,e,t){return Ue(r.app)?Promise.reject(ft(r)):Pc(le(r),Ar.credential(e,t)).catch(async n=>{throw n.code==="auth/password-does-not-meet-requirements"&&Ju(r),n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function iT(r,e,t){const n=je(r),i={requestType:"EMAIL_SIGNIN",email:e,clientType:"CLIENT_TYPE_WEB"};function s(o,c){z(c.handleCodeInApp,n,"argument-error"),c&&Cc(n,o,c)}s(i,t),await cr(n,i,"getOobCode",Ov,"EMAIL_PASSWORD_PROVIDER")}function sT(r,e){const t=Sc.parseLink(e);return(t==null?void 0:t.operation)==="EMAIL_SIGNIN"}async function oT(r,e,t){if(Ue(r.app))return Promise.reject(ft(r));const n=le(r),i=Ar.credentialWithLink(e,t||bo());return z(i._tenantId===(n.tenantId||null),n,"tenant-id-mismatch"),Pc(n,i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function aT(r,e){return Ye(r,"POST","/v1/accounts:createAuthUri",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function cT(r,e){const t=ju()?bo():"http://localhost",n={identifier:e,continueUri:t},{signinMethods:i}=await aT(le(r),n);return i||[]}async function lT(r,e){const t=le(r),i={requestType:"VERIFY_EMAIL",idToken:await r.getIdToken()};e&&Cc(t.auth,i,e);const{email:s}=await Nv(t.auth,i);s!==r.email&&await r.reload()}async function uT(r,e,t){const n=le(r),s={requestType:"VERIFY_AND_CHANGE_EMAIL",idToken:await r.getIdToken(),newEmail:e};t&&Cc(n.auth,s,t);const{email:o}=await Mv(n.auth,s);o!==r.email&&await r.reload()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hT(r,e){return Ye(r,"POST","/v1/accounts:update",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function dT(r,{displayName:e,photoURL:t}){if(e===void 0&&t===void 0)return;const n=le(r),s={idToken:await n.getIdToken(),displayName:e,photoUrl:t,returnSecureToken:!0},o=await Nn(n,hT(n.auth,s));n.displayName=o.displayName||null,n.photoURL=o.photoUrl||null;const c=n.providerData.find(({providerId:l})=>l==="password");c&&(c.displayName=n.displayName,c.photoURL=n.photoURL),await n._updateTokensIfNecessary(o)}function fT(r,e){const t=le(r);return Ue(t.auth.app)?Promise.reject(ft(t.auth)):ug(t,e,null)}function pT(r,e){return ug(le(r),null,e)}async function ug(r,e,t){const{auth:n}=r,s={idToken:await r.getIdToken(),returnSecureToken:!0};e&&(s.email=e),t&&(s.password=t);const o=await Nn(r,Cv(n,s));await r._updateTokensIfNecessary(o,!0)}/**
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
 */function mT(r){var i,s;if(!r)return null;const{providerId:e}=r,t=r.rawUserInfo?JSON.parse(r.rawUserInfo):{},n=r.isNewUser||r.kind==="identitytoolkit#SignupNewUserResponse";if(!e&&(r!=null&&r.idToken)){const o=(s=(i=bc(r.idToken))==null?void 0:i.firebase)==null?void 0:s.sign_in_provider;if(o){const c=o!=="anonymous"&&o!=="custom"?o:null;return new zi(n,c)}}if(!e)return null;switch(e){case"facebook.com":return new gT(n,t);case"github.com":return new yT(n,t);case"google.com":return new _T(n,t);case"twitter.com":return new wT(n,t,r.screenName||null);case"custom":case"anonymous":return new zi(n,null);default:return new zi(n,e,t)}}class zi{constructor(e,t,n={}){this.isNewUser=e,this.providerId=t,this.profile=n}}class hg extends zi{constructor(e,t,n,i){super(e,t,n),this.username=i}}class gT extends zi{constructor(e,t){super(e,"facebook.com",t)}}class yT extends hg{constructor(e,t){super(e,"github.com",t,typeof(t==null?void 0:t.login)=="string"?t==null?void 0:t.login:null)}}class _T extends zi{constructor(e,t){super(e,"google.com",t)}}class wT extends hg{constructor(e,t,n){super(e,"twitter.com",t,n)}}function IT(r){const{user:e,_tokenResponse:t}=r;return e.isAnonymous&&!t?{providerId:null,isNewUser:!1,profile:null}:mT(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yr{constructor(e,t,n){this.type=e,this.credential=t,this.user=n}static _fromIdtoken(e,t){return new Yr("enroll",e,t)}static _fromMfaPendingCredential(e){return new Yr("signin",e)}toJSON(){return{multiFactorSession:{[this.type==="enroll"?"idToken":"pendingCredential"]:this.credential}}}static fromJSON(e){var t,n;if(e!=null&&e.multiFactorSession){if((t=e.multiFactorSession)!=null&&t.pendingCredential)return Yr._fromMfaPendingCredential(e.multiFactorSession.pendingCredential);if((n=e.multiFactorSession)!=null&&n.idToken)return Yr._fromIdtoken(e.multiFactorSession.idToken)}return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xu{constructor(e,t,n){this.session=e,this.hints=t,this.signInResolver=n}static _fromError(e,t){const n=je(e),i=t.customData._serverResponse,s=(i.mfaInfo||[]).map(c=>Yo._fromServerResponse(n,c));z(i.mfaPendingCredential,n,"internal-error");const o=Yr._fromMfaPendingCredential(i.mfaPendingCredential);return new Xu(o,s,async c=>{const l=await c._process(n,o);delete i.mfaInfo,delete i.mfaPendingCredential;const u={...i,idToken:l.idToken,refreshToken:l.refreshToken};switch(t.operationType){case"signIn":const d=await Jt._fromIdTokenResponse(n,t.operationType,u);return await n._updateCurrentUser(d.user),d;case"reauthenticate":return z(t.user,n,"internal-error"),Jt._forOperation(t.user,t.operationType,u);default:_t(n,"internal-error")}})}async resolveSignIn(e){const t=e;return this.signInResolver(t)}}function ET(r,e){var i;const t=le(r),n=e;return z(e.customData.operationType,t,"argument-error"),z((i=n.customData._serverResponse)==null?void 0:i.mfaPendingCredential,t,"argument-error"),Xu._fromError(t,n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Af(r,e){return Ye(r,"POST","/v2/accounts/mfaEnrollment:start",Qe(r,e))}function vT(r,e){return Ye(r,"POST","/v2/accounts/mfaEnrollment:finalize",Qe(r,e))}function TT(r,e){return Ye(r,"POST","/v2/accounts/mfaEnrollment:withdraw",Qe(r,e))}class Zu{constructor(e){this.user=e,this.enrolledFactors=[],e._onReload(t=>{t.mfaInfo&&(this.enrolledFactors=t.mfaInfo.map(n=>Yo._fromServerResponse(e.auth,n)))})}static _fromUser(e){return new Zu(e)}async getSession(){return Yr._fromIdtoken(await this.user.getIdToken(),this.user)}async enroll(e,t){const n=e,i=await this.getSession(),s=await Nn(this.user,n._process(this.user.auth,i,t));return await this.user._updateTokensIfNecessary(s),this.user.reload()}async unenroll(e){const t=typeof e=="string"?e:e.uid,n=await this.user.getIdToken();try{const i=await Nn(this.user,TT(this.user.auth,{idToken:n,mfaEnrollmentId:t}));this.enrolledFactors=this.enrolledFactors.filter(({uid:s})=>s!==t),await this.user._updateTokensIfNecessary(i),await this.user.reload()}catch(i){throw i}}}const Cl=new WeakMap;function bT(r){const e=le(r);return Cl.has(e)||Cl.set(e,Zu._fromUser(e)),Cl.get(e)}const rc="__sak";/**
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
 */class dg{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(rc,"1"),this.storage.removeItem(rc),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const AT=1e3,ST=10;class fg extends dg{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Ym(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const n=this.storage.getItem(t),i=this.localCache[t];n!==i&&e(t,i,n)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const n=e.key;t?this.detachListener():this.stopPolling();const i=()=>{const o=this.storage.getItem(n);!t&&this.localCache[n]===o||this.notifyListeners(n,o)},s=this.storage.getItem(n);ov()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,ST):i()}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,n)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:n}),!0)})},AT)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}fg.type="LOCAL";const eh=fg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pg extends dg{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}pg.type="SESSION";const ii=pg;/**
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
 */function RT(r){return Promise.all(r.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
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
 */class kc{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;const n=new kc(e);return this.receivers.push(n),n}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:n,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:n,eventType:i});const c=Array.from(o).map(async u=>u(t.origin,s)),l=await RT(c);t.ports[0].postMessage({status:"done",eventId:n,eventType:i,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}kc.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jo(r="",e=10){let t="";for(let n=0;n<e;n++)t+=Math.floor(Math.random()*10);return r+t}/**
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
 */class PT{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,n=50){const i=typeof MessageChannel<"u"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,l)=>{const u=Jo("",20);i.port1.start();const d=setTimeout(()=>{l(new Error("unsupported_event"))},n);o={messageChannel:i,onMessage(p){const m=p;if(m.data.eventId===u)switch(m.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(m.data.response);break;default:clearTimeout(d),clearTimeout(s),l(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:u,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rt(){return window}function CT(r){rt().location.href=r}/**
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
 */function th(){return typeof rt().WorkerGlobalScope<"u"&&typeof rt().importScripts=="function"}async function kT(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function xT(){var r;return((r=navigator==null?void 0:navigator.serviceWorker)==null?void 0:r.controller)||null}function DT(){return th()?self:null}/**
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
 */const mg="firebaseLocalStorageDb",NT=1,ic="firebaseLocalStorage",gg="fbase_key";class Xo{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function xc(r,e){return r.transaction([ic],e?"readwrite":"readonly").objectStore(ic)}function VT(){const r=indexedDB.deleteDatabase(mg);return new Xo(r).toPromise()}function Wl(){const r=indexedDB.open(mg,NT);return new Promise((e,t)=>{r.addEventListener("error",()=>{t(r.error)}),r.addEventListener("upgradeneeded",()=>{const n=r.result;try{n.createObjectStore(ic,{keyPath:gg})}catch(i){t(i)}}),r.addEventListener("success",async()=>{const n=r.result;n.objectStoreNames.contains(ic)?e(n):(n.close(),await VT(),e(await Wl()))})})}async function Sf(r,e,t){const n=xc(r,!0).put({[gg]:e,value:t});return new Xo(n).toPromise()}async function OT(r,e){const t=xc(r,!1).get(e),n=await new Xo(t).toPromise();return n===void 0?null:n.value}function Rf(r,e){const t=xc(r,!0).delete(e);return new Xo(t).toPromise()}const MT=800,LT=3;class yg{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await Wl(),this.db)}async _withRetries(e){let t=0;for(;;)try{const n=await this._openDb();return await e(n)}catch(n){if(t++>LT)throw n;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return th()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=kc._getInstance(DT()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await kT(),!this.activeServiceWorker)return;this.sender=new PT(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(n=e[0])!=null&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||xT()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await Wl();return await Sf(e,rc,"1"),await Rf(e,rc),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(n=>Sf(n,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(n=>OT(n,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Rf(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(i=>{const s=xc(i,!1).getAll();return new Xo(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],n=new Set;if(e.length!==0)for(const{fbase_key:i,value:s}of e)n.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(const i of Object.keys(this.localCache))this.localCache[i]&&!n.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;const n=this.listeners[e];if(n)for(const i of Array.from(n))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),MT)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}yg.type="LOCAL";const Ro=yg;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pf(r,e){return Ye(r,"POST","/v2/accounts/mfaSignIn:start",Qe(r,e))}function FT(r,e){return Ye(r,"POST","/v2/accounts/mfaSignIn:finalize",Qe(r,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kl=Xm("rcb"),UT=new Go(3e4,6e4);class BT{constructor(){var e;this.hostLanguage="",this.counter=0,this.librarySeparatelyLoaded=!!((e=rt().grecaptcha)!=null&&e.render)}load(e,t=""){return z(qT(t),e,"argument-error"),this.shouldResolveImmediately(t)&&gf(rt().grecaptcha)?Promise.resolve(rt().grecaptcha):new Promise((n,i)=>{const s=rt().setTimeout(()=>{i(ot(e,"network-request-failed"))},UT.get());rt()[kl]=()=>{rt().clearTimeout(s),delete rt()[kl];const c=rt().grecaptcha;if(!c||!gf(c)){i(ot(e,"internal-error"));return}const l=c.render;c.render=(u,d)=>{const p=l(u,d);return this.counter++,p},this.hostLanguage=t,n(c)};const o=`${fv()}?${gs({onload:kl,render:"explicit",hl:t})}`;Wu(o).catch(()=>{clearTimeout(s),i(ot(e,"internal-error"))})})}clearedOneInstance(){this.counter--}shouldResolveImmediately(e){var t;return!!((t=rt().grecaptcha)!=null&&t.render)&&(e===this.hostLanguage||this.counter>0||this.librarySeparatelyLoaded)}}function qT(r){return r.length<=6&&/^\s*[a-zA-Z0-9\-]*\s*$/.test(r)}class $T{async load(e){return new _v(e)}clearedOneInstance(){}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const co="recaptcha",zT={theme:"light",type:"image"};let KT=class{constructor(e,t,n={...zT}){this.parameters=n,this.type=co,this.destroyed=!1,this.widgetId=null,this.tokenChangeListeners=new Set,this.renderPromise=null,this.recaptcha=null,this.auth=je(e),this.isInvisible=this.parameters.size==="invisible",z(typeof document<"u",this.auth,"operation-not-supported-in-this-environment");const i=typeof t=="string"?document.getElementById(t):t;z(i,this.auth,"argument-error"),this.container=i,this.parameters.callback=this.makeTokenCallback(this.parameters.callback),this._recaptchaLoader=this.auth.settings.appVerificationDisabledForTesting?new $T:new BT,this.validateStartingState()}async verify(){this.assertNotDestroyed();const e=await this.render(),t=this.getAssertedRecaptcha(),n=t.getResponse(e);return n||new Promise(i=>{const s=o=>{o&&(this.tokenChangeListeners.delete(s),i(o))};this.tokenChangeListeners.add(s),this.isInvisible&&t.execute(e)})}render(){try{this.assertNotDestroyed()}catch(e){return Promise.reject(e)}return this.renderPromise?this.renderPromise:(this.renderPromise=this.makeRenderPromise().catch(e=>{throw this.renderPromise=null,e}),this.renderPromise)}_reset(){this.assertNotDestroyed(),this.widgetId!==null&&this.getAssertedRecaptcha().reset(this.widgetId)}clear(){this.assertNotDestroyed(),this.destroyed=!0,this._recaptchaLoader.clearedOneInstance(),this.isInvisible||this.container.childNodes.forEach(e=>{this.container.removeChild(e)})}validateStartingState(){z(!this.parameters.sitekey,this.auth,"argument-error"),z(this.isInvisible||!this.container.hasChildNodes(),this.auth,"argument-error"),z(typeof document<"u",this.auth,"operation-not-supported-in-this-environment")}makeTokenCallback(e){return t=>{if(this.tokenChangeListeners.forEach(n=>n(t)),typeof e=="function")e(t);else if(typeof e=="string"){const n=rt()[e];typeof n=="function"&&n(t)}}}assertNotDestroyed(){z(!this.destroyed,this.auth,"internal-error")}async makeRenderPromise(){if(await this.init(),!this.widgetId){let e=this.container;if(!this.isInvisible){const t=document.createElement("div");e.appendChild(t),e=t}this.widgetId=this.getAssertedRecaptcha().render(e,this.parameters)}return this.widgetId}async init(){z(ju()&&!th(),this.auth,"internal-error"),await jT(),this.recaptcha=await this._recaptchaLoader.load(this.auth,this.auth.languageCode||void 0);const e=await HE(this.auth);z(e,this.auth,"internal-error"),this.parameters.sitekey=e}getAssertedRecaptcha(){return z(this.recaptcha,this.auth,"internal-error"),this.recaptcha}};function jT(){let r=null;return new Promise(e=>{if(document.readyState==="complete"){e();return}r=()=>e(),window.addEventListener("load",r)}).catch(e=>{throw r&&window.removeEventListener("load",r),e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nh{constructor(e,t){this.verificationId=e,this.onConfirmation=t}confirm(e){const t=ti._fromVerification(this.verificationId,e);return this.onConfirmation(t)}}async function GT(r,e,t){if(Ue(r.app))return Promise.reject(ft(r));const n=je(r),i=await Dc(n,e,le(t));return new nh(i,s=>Pc(n,s))}async function WT(r,e,t){const n=le(r);await Rc(!1,n,"phone");const i=await Dc(n.auth,e,le(t));return new nh(i,s=>ag(n,s))}async function HT(r,e,t){const n=le(r);if(Ue(n.auth.app))return Promise.reject(ft(n.auth));const i=await Dc(n.auth,e,le(t));return new nh(i,s=>cg(n,s))}async function Dc(r,e,t){var n;if(!r._getRecaptchaConfig())try{await bv(r)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){const s=i.session;if("phoneNumber"in i){z(s.type==="enroll",r,"internal-error");const o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await cr(r,o,"mfaSmsEnrollment",async(d,p)=>{if(p.phoneEnrollmentInfo.captchaResponse===ao){z((t==null?void 0:t.type)===co,d,"argument-error");const m=await xl(d,p,t);return Af(d,m)}return Af(d,p)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{z(s.type==="signin",r,"internal-error");const o=((n=i.multiFactorHint)==null?void 0:n.uid)||i.multiFactorUid;z(o,r,"missing-multi-factor-info");const c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await cr(r,c,"mfaSmsSignIn",async(p,m)=>{if(m.phoneSignInInfo.captchaResponse===ao){z((t==null?void 0:t.type)===co,p,"argument-error");const v=await xl(p,m,t);return Pf(p,v)}return Pf(p,m)},"PHONE_PROVIDER").catch(p=>Promise.reject(p))).phoneResponseInfo.sessionInfo}}else{const s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await cr(r,s,"sendVerificationCode",async(u,d)=>{if(d.captchaResponse===ao){z((t==null?void 0:t.type)===co,u,"argument-error");const p=await xl(u,d,t);return Tf(u,p)}return Tf(u,d)},"PHONE_PROVIDER").catch(u=>Promise.reject(u))).sessionInfo}}finally{t==null||t._reset()}}async function QT(r,e){const t=le(r);if(Ue(t.auth.app))return Promise.reject(ft(t.auth));await Hu(t,e)}async function xl(r,e,t){z(t.type===co,r,"argument-error");const n=await t.verify();z(typeof n=="string",r,"argument-error");const i={...e};if("phoneEnrollmentInfo"in i){const s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,l=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:n,captchaResponse:o,clientType:c,recaptchaVersion:l}}),i}else if("phoneSignInInfo"in i){const s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:n,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:n}),i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let si=class Ma{constructor(e){this.providerId=Ma.PROVIDER_ID,this.auth=je(e)}verifyPhoneNumber(e,t){return Dc(this.auth,e,le(t))}static credential(e,t){return ti._fromVerification(e,t)}static credentialFromResult(e){const t=e;return Ma.credentialFromTaggedObject(t)}static credentialFromError(e){return Ma.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{phoneNumber:t,temporaryProof:n}=e;return t&&n?ti._fromTokenResponse(t,n):null}};si.PROVIDER_ID="phone";si.PHONE_SIGN_IN_METHOD="phone";/**
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
 */function yi(r,e){return e?zt(e):(z(r._popupRedirectResolver,r,"argument-error"),r._popupRedirectResolver)}/**
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
 */class rh extends _s{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return xn(e,this._buildIdpRequest())}_linkToIdToken(e,t){return xn(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return xn(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function YT(r){return og(r.auth,new rh(r),r.bypassAuthState)}function JT(r){const{auth:e,user:t}=r;return z(t,e,"internal-error"),sg(t,new rh(r),r.bypassAuthState)}async function XT(r){const{auth:e,user:t}=r;return z(t,e,"internal-error"),Hu(t,new rh(r),r.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _g{constructor(e,t,n,i,s=!1){this.auth=e,this.resolver=n,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(n){this.reject(n)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:n,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:n,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(u){this.reject(u)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return YT;case"linkViaPopup":case"linkViaRedirect":return XT;case"reauthViaPopup":case"reauthViaRedirect":return JT;default:_t(this.auth,"internal-error")}}resolve(e){rn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){rn(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ZT=new Go(2e3,1e4);async function eb(r,e,t){if(Ue(r.app))return Promise.reject(ot(r,"operation-not-supported-in-this-environment"));const n=je(r);ys(r,e,Ln);const i=yi(n,t);return new Cn(n,"signInViaPopup",e,i).executeNotNull()}async function tb(r,e,t){const n=le(r);if(Ue(n.auth.app))return Promise.reject(ot(n.auth,"operation-not-supported-in-this-environment"));ys(n.auth,e,Ln);const i=yi(n.auth,t);return new Cn(n.auth,"reauthViaPopup",e,i,n).executeNotNull()}async function nb(r,e,t){const n=le(r);ys(n.auth,e,Ln);const i=yi(n.auth,t);return new Cn(n.auth,"linkViaPopup",e,i,n).executeNotNull()}class Cn extends _g{constructor(e,t,n,i,s){super(e,t,i,s),this.provider=n,this.authWindow=null,this.pollId=null,Cn.currentPopupAction&&Cn.currentPopupAction.cancel(),Cn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return z(e,this.auth,"internal-error"),e}async onExecution(){rn(this.filter.length===1,"Popup operations only handle one event");const e=Jo();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(ot(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(ot(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,Cn.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,n;if((n=(t=this.authWindow)==null?void 0:t.window)!=null&&n.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(ot(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,ZT.get())};e()}}Cn.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rb="pendingRedirect",lo=new Map;class ib extends _g{constructor(e,t,n=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,n),this.eventId=null}async execute(){let e=lo.get(this.auth._key());if(!e){try{const n=await sb(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(n)}catch(t){e=()=>Promise.reject(t)}lo.set(this.auth._key(),e)}return this.bypassAuthState||lo.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function sb(r,e){const t=Ig(e),n=wg(r);if(!await n._isAvailable())return!1;const i=await n._get(t)==="true";return await n._remove(t),i}async function ih(r,e){return wg(r)._set(Ig(e),"true")}function ob(){lo.clear()}function sh(r,e){lo.set(r._key(),e)}function wg(r){return zt(r._redirectPersistence)}function Ig(r){return ei(rb,r.config.apiKey,r.name)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ab(r,e,t){return cb(r,e,t)}async function cb(r,e,t){if(Ue(r.app))return Promise.reject(ft(r));const n=je(r);ys(r,e,Ln),await n._initializationPromise;const i=yi(n,t);return await ih(i,n),i._openRedirect(n,e,"signInViaRedirect")}function lb(r,e,t){return ub(r,e,t)}async function ub(r,e,t){const n=le(r);if(ys(n.auth,e,Ln),Ue(n.auth.app))return Promise.reject(ft(n.auth));await n.auth._initializationPromise;const i=yi(n.auth,t);await ih(i,n.auth);const s=await Eg(n);return i._openRedirect(n.auth,e,"reauthViaRedirect",s)}function hb(r,e,t){return db(r,e,t)}async function db(r,e,t){const n=le(r);ys(n.auth,e,Ln),await n.auth._initializationPromise;const i=yi(n.auth,t);await Rc(!1,n,e.providerId),await ih(i,n.auth);const s=await Eg(n);return i._openRedirect(n.auth,e,"linkViaRedirect",s)}async function fb(r,e){return await je(r)._initializationPromise,Nc(r,e,!1)}async function Nc(r,e,t=!1){if(Ue(r.app))return Promise.reject(ft(r));const n=je(r),i=yi(n,e),o=await new ib(n,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await n._persistUserIfCurrent(o.user),await n._setRedirectUser(null,e)),o}async function Eg(r){const e=Jo(`${r.uid}:::`);return r._redirectEventId=e,await r.auth._setRedirectUser(r),await r.auth._persistUserIfCurrent(r),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pb=10*60*1e3;class vg{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(n=>{this.isEventForConsumer(e,n)&&(t=!0,this.sendToConsumer(e,n),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!mb(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var n;if(e.error&&!Tg(e)){const i=((n=e.error.code)==null?void 0:n.split("auth/")[1])||"internal-error";t.onError(ot(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const n=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&n}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=pb&&this.cachedEventUids.clear(),this.cachedEventUids.has(Cf(e))}saveEventToCache(e){this.cachedEventUids.add(Cf(e)),this.lastProcessedEventTime=Date.now()}}function Cf(r){return[r.type,r.eventId,r.sessionId,r.tenantId].filter(e=>e).join("-")}function Tg({type:r,error:e}){return r==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function mb(r){switch(r.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Tg(r);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bg(r,e={}){return Ye(r,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gb=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,yb=/^https?/;async function _b(r){if(r.config.emulator)return;const{authorizedDomains:e}=await bg(r);for(const t of e)try{if(wb(t))return}catch{}_t(r,"unauthorized-domain")}function wb(r){const e=bo(),{protocol:t,hostname:n}=new URL(e);if(r.startsWith("chrome-extension://")){const o=new URL(r);return o.hostname===""&&n===""?t==="chrome-extension:"&&r.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===n}if(!yb.test(t))return!1;if(gb.test(r))return n===r;const i=r.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(n)}/**
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
 */const Ib=new Go(3e4,6e4);function kf(){const r=rt().___jsl;if(r!=null&&r.H){for(const e of Object.keys(r.H))if(r.H[e].r=r.H[e].r||[],r.H[e].L=r.H[e].L||[],r.H[e].r=[...r.H[e].L],r.CP)for(let t=0;t<r.CP.length;t++)r.CP[t]=null}}function Eb(r){return new Promise((e,t)=>{var i,s,o;function n(){kf(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{kf(),t(ot(r,"network-request-failed"))},timeout:Ib.get()})}if((s=(i=rt().gapi)==null?void 0:i.iframes)!=null&&s.Iframe)e(gapi.iframes.getContext());else if((o=rt().gapi)!=null&&o.load)n();else{const c=Xm("iframefcb");return rt()[c]=()=>{gapi.load?n():t(ot(r,"network-request-failed"))},Wu(`${mv()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw La=null,e})}let La=null;function vb(r){return La=La||Eb(r),La}/**
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
 */const Tb=new Go(5e3,15e3),bb="__/auth/iframe",Ab="emulator/auth/iframe",Sb={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Rb=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Pb(r){const e=r.config;z(e.authDomain,r,"auth-domain-config-required");const t=e.emulator?Gu(e,Ab):`https://${r.config.authDomain}/${bb}`,n={apiKey:e.apiKey,appName:r.name,v:br},i=Rb.get(r.config.apiHost);i&&(n.eid=i);const s=r._getFrameworks();return s.length&&(n.fw=s.join(",")),`${t}?${gs(n).slice(1)}`}async function Cb(r){const e=await vb(r),t=rt().gapi;return z(t,r,"internal-error"),e.open({where:document.body,url:Pb(r),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Sb,dontclear:!0},n=>new Promise(async(i,s)=>{await n.restyle({setHideOnLeave:!1});const o=ot(r,"network-request-failed"),c=rt().setTimeout(()=>{s(o)},Tb.get());function l(){rt().clearTimeout(c),i(n)}n.ping(l).then(l,()=>{s(o)})}))}/**
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
 */const kb={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},xb=500,Db=600,Nb="_blank",Vb="http://localhost";class xf{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Ob(r,e,t,n=xb,i=Db){const s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-n)/2,0).toString();let c="";const l={...kb,width:n.toString(),height:i.toString(),top:s,left:o},u=Ke().toLowerCase();t&&(c=Gm(u)?Nb:t),Km(u)&&(e=e||Vb,l.scrollbars="yes");const d=Object.entries(l).reduce((m,[v,M])=>`${m}${v}=${M},`,"");if(sv(u)&&c!=="_self")return Mb(e||"",c),new xf(null);const p=window.open(e||"",c,d);z(p,r,"popup-blocked");try{p.focus()}catch{}return new xf(p)}function Mb(r,e){const t=document.createElement("a");t.href=r,t.target=e;const n=document.createEvent("MouseEvent");n.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(n)}/**
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
 */const Lb="__/auth/handler",Fb="emulator/auth/handler",Ub=encodeURIComponent("fac");async function Hl(r,e,t,n,i,s){z(r.config.authDomain,r,"auth-domain-config-required"),z(r.config.apiKey,r,"invalid-api-key");const o={apiKey:r.config.apiKey,appName:r.name,authType:t,redirectUrl:n,v:br,eventId:i};if(e instanceof Ln){e.setDefaultLanguage(r.languageCode),o.providerId=e.providerId||"",dI(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[d,p]of Object.entries(s||{}))o[d]=p}if(e instanceof ws){const d=e.getScopes().filter(p=>p!=="");d.length>0&&(o.scopes=d.join(","))}r.tenantId&&(o.tid=r.tenantId);const c=o;for(const d of Object.keys(c))c[d]===void 0&&delete c[d];const l=await r._getAppCheckToken(),u=l?`#${Ub}=${encodeURIComponent(l)}`:"";return`${Bb(r)}?${gs(c).slice(1)}${u}`}function Bb({config:r}){return r.emulator?Gu(r,Fb):`https://${r.authDomain}/${Lb}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dl="webStorageSupport";class qb{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=ii,this._completeRedirectFn=Nc,this._overrideRedirectResult=sh}async _openPopup(e,t,n,i){var o;rn((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const s=await Hl(e,t,n,bo(),i);return Ob(e,s,Jo())}async _openRedirect(e,t,n,i){await this._originValidation(e);const s=await Hl(e,t,n,bo(),i);return CT(s),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(rn(s,"If manager is not set, promise should be"),s)}const n=this.initAndGetManager(e);return this.eventManagers[t]={promise:n},n.catch(()=>{delete this.eventManagers[t]}),n}async initAndGetManager(e){const t=await Cb(e),n=new vg(e);return t.register("authEvent",i=>(z(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:n.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:n},this.iframes[e._key()]=t,n}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Dl,{type:Dl},i=>{var o;const s=(o=i==null?void 0:i[0])==null?void 0:o[Dl];s!==void 0&&t(!!s),_t(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=_b(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Ym()||jm()||Ho()}}const $b=qb;class zb{constructor(e){this.factorId=e}_process(e,t,n){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,n);case"signin":return this._finalizeSignIn(e,t.credential);default:return gn("unexpected MultiFactorSessionType")}}}class oh extends zb{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new oh(e)}_finalizeEnroll(e,t,n){return vT(e,{idToken:t,displayName:n,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return FT(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}}class Ag{constructor(){}static assertion(e){return oh._fromCredential(e)}}Ag.FACTOR_ID="phone";var Df="@firebase/auth",Nf="1.12.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kb{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(n=>{e((n==null?void 0:n.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){z(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jb(r){switch(r){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Gb(r){mr(new vn("auth",(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=n.options;z(o&&!o.includes(":"),"invalid-api-key",{appName:n.name});const l={apiKey:o,authDomain:c,clientPlatform:r,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Jm(r)},u=new hv(n,i,s,l);return Av(u,t),u},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,n)=>{e.getProvider("auth-internal").initialize()})),mr(new vn("auth-internal",e=>{const t=je(e.getProvider("auth").getImmediate());return(n=>new Kb(n))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),en(Df,Nf,jb(r)),en(Df,Nf,"esm2020")}/**
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
 */const Wb=5*60;eI("authIdTokenMaxAge");function Hb(){var r;return((r=document.getElementsByTagName("head"))==null?void 0:r[0])??document}dv({loadJS(r){return new Promise((e,t)=>{const n=document.createElement("script");n.setAttribute("src",r),n.onload=e,n.onerror=i=>{const s=ot("internal-error");s.customData=i,t(s)},n.type="text/javascript",n.charset="UTF-8",Hb().appendChild(n)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Gb("Browser");/**
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
 */function oi(){return window}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qb=2e3;async function Yb(r,e,t){const{BuildInfo:n}=oi();rn(e.sessionId,"AuthEvent did not contain a session ID");const i=await tA(e.sessionId),s={};return Ho()?s.ibi=n.packageName:Wo()?s.apn=n.packageName:_t(r,"operation-not-supported-in-this-environment"),n.displayName&&(s.appDisplayName=n.displayName),s.sessionId=i,Hl(r,t,e.type,void 0,e.eventId??void 0,s)}async function Jb(r){const{BuildInfo:e}=oi(),t={};Ho()?t.iosBundleId=e.packageName:Wo()?t.androidPackageName=e.packageName:_t(r,"operation-not-supported-in-this-environment"),await bg(r,t)}function Xb(r){const{cordova:e}=oi();return new Promise(t=>{e.plugins.browsertab.isAvailable(n=>{let i=null;n?e.plugins.browsertab.openUrl(r):i=e.InAppBrowser.open(r,iv()?"_blank":"_system","location=yes"),t(i)})})}async function Zb(r,e,t){const{cordova:n}=oi();let i=()=>{};try{await new Promise((s,o)=>{let c=null;function l(){var m;s();const p=(m=n.plugins.browsertab)==null?void 0:m.close;typeof p=="function"&&p(),typeof(t==null?void 0:t.close)=="function"&&t.close()}function u(){c||(c=window.setTimeout(()=>{o(ot(r,"redirect-cancelled-by-user"))},Qb))}function d(){(document==null?void 0:document.visibilityState)==="visible"&&u()}e.addPassiveListener(l),document.addEventListener("resume",u,!1),Wo()&&document.addEventListener("visibilitychange",d,!1),i=()=>{e.removePassiveListener(l),document.removeEventListener("resume",u,!1),document.removeEventListener("visibilitychange",d,!1),c&&window.clearTimeout(c)}})}finally{i()}}function eA(r){var t,n,i,s,o,c,l,u,d,p;const e=oi();z(typeof((t=e==null?void 0:e.universalLinks)==null?void 0:t.subscribe)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-universal-links-plugin-fix"}),z(typeof((n=e==null?void 0:e.BuildInfo)==null?void 0:n.packageName)<"u",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-buildInfo"}),z(typeof((o=(s=(i=e==null?void 0:e.cordova)==null?void 0:i.plugins)==null?void 0:s.browsertab)==null?void 0:o.openUrl)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),z(typeof((u=(l=(c=e==null?void 0:e.cordova)==null?void 0:c.plugins)==null?void 0:l.browsertab)==null?void 0:u.isAvailable)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-browsertab"}),z(typeof((p=(d=e==null?void 0:e.cordova)==null?void 0:d.InAppBrowser)==null?void 0:p.open)=="function",r,"invalid-cordova-configuration",{missingPlugin:"cordova-plugin-inappbrowser"})}async function tA(r){const e=nA(r),t=await crypto.subtle.digest("SHA-256",e);return Array.from(new Uint8Array(t)).map(i=>i.toString(16).padStart(2,"0")).join("")}function nA(r){if(rn(/[0-9a-zA-Z]+/.test(r),"Can only convert alpha-numeric strings"),typeof TextEncoder<"u")return new TextEncoder().encode(r);const e=new ArrayBuffer(r.length),t=new Uint8Array(e);for(let n=0;n<r.length;n++)t[n]=r.charCodeAt(n);return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rA=20;class iA extends vg{constructor(){super(...arguments),this.passiveListeners=new Set,this.initPromise=new Promise(e=>{this.resolveInitialized=e})}addPassiveListener(e){this.passiveListeners.add(e)}removePassiveListener(e){this.passiveListeners.delete(e)}resetRedirect(){this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1}onEvent(e){return this.resolveInitialized(),this.passiveListeners.forEach(t=>t(e)),super.onEvent(e)}async initialized(){await this.initPromise}}function sA(r,e,t=null){return{type:e,eventId:t,urlResponse:null,sessionId:cA(),postBody:null,tenantId:r.tenantId,error:ot(r,"no-auth-event")}}function oA(r,e){return Ql()._set(Yl(r),e)}async function Vf(r){const e=await Ql()._get(Yl(r));return e&&await Ql()._remove(Yl(r)),e}function aA(r,e){var n,i;const t=uA(e);if(t.includes("/__/auth/callback")){const s=Fa(t),o=s.firebaseError?lA(decodeURIComponent(s.firebaseError)):null,c=(i=(n=o==null?void 0:o.code)==null?void 0:n.split("auth/"))==null?void 0:i[1],l=c?ot(c):null;return l?{type:r.type,eventId:r.eventId,tenantId:r.tenantId,error:l,urlResponse:null,sessionId:null,postBody:null}:{type:r.type,eventId:r.eventId,tenantId:r.tenantId,sessionId:r.sessionId,urlResponse:t,postBody:null}}return null}function cA(){const r=[],e="1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(let t=0;t<rA;t++){const n=Math.floor(Math.random()*e.length);r.push(e.charAt(n))}return r.join("")}function Ql(){return zt(eh)}function Yl(r){return ei("authEvent",r.config.apiKey,r.name)}function lA(r){try{return JSON.parse(r)}catch{return null}}function uA(r){const e=Fa(r),t=e.link?decodeURIComponent(e.link):void 0,n=Fa(t).link,i=e.deep_link_id?decodeURIComponent(e.deep_link_id):void 0;return Fa(i).link||i||n||t||r}function Fa(r){if(!(r!=null&&r.includes("?")))return{};const[e,...t]=r.split("?");return Ui(t.join("?"))}/**
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
 */const hA=500;class dA{constructor(){this._redirectPersistence=ii,this._shouldInitProactively=!0,this.eventManagers=new Map,this.originValidationPromises={},this._completeRedirectFn=Nc,this._overrideRedirectResult=sh}async _initialize(e){const t=e._key();let n=this.eventManagers.get(t);return n||(n=new iA(e),this.eventManagers.set(t,n),this.attachCallbackListeners(e,n)),n}_openPopup(e){_t(e,"operation-not-supported-in-this-environment")}async _openRedirect(e,t,n,i){eA(e);const s=await this._initialize(e);await s.initialized(),s.resetRedirect(),ob(),await this._originValidation(e);const o=sA(e,n,i);await oA(e,o);const c=await Yb(e,o,t),l=await Xb(c);return Zb(e,s,l)}_isIframeWebStorageSupported(e,t){throw new Error("Method not implemented.")}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Jb(e)),this.originValidationPromises[t]}attachCallbackListeners(e,t){const{universalLinks:n,handleOpenURL:i,BuildInfo:s}=oi(),o=setTimeout(async()=>{await Vf(e),t.onEvent(Of())},hA),c=async d=>{clearTimeout(o);const p=await Vf(e);let m=null;p&&(d!=null&&d.url)&&(m=aA(p,d.url)),t.onEvent(m||Of())};typeof n<"u"&&typeof n.subscribe=="function"&&n.subscribe(null,c);const l=i,u=`${s.packageName.toLowerCase()}://`;oi().handleOpenURL=async d=>{if(d.toLowerCase().startsWith(u)&&c({url:d}),typeof l=="function")try{l(d)}catch(p){console.error(p)}}}}const fA=dA;function Of(){return{type:"unknown",eventId:null,sessionId:null,urlResponse:null,postBody:null,tenantId:null,error:ot("no-auth-event")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pA(r,e){je(r)._logFramework(e)}var mA="@firebase/auth-compat",gA="0.6.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yA=1e3;function uo(){var r;return((r=self==null?void 0:self.location)==null?void 0:r.protocol)||null}function _A(){return uo()==="http:"||uo()==="https:"}function Sg(r=Ke()){return!!((uo()==="file:"||uo()==="ionic:"||uo()==="capacitor:")&&r.toLowerCase().match(/iphone|ipad|ipod|android/))}function wA(){return Lu()||vc()}function IA(){return _m()&&(document==null?void 0:document.documentMode)===11}function EA(r=Ke()){return/Edge\/\d+/.test(r)}function vA(r=Ke()){return IA()||EA(r)}function Rg(){try{const r=self.localStorage,e=Jo();if(r)return r.setItem(e,"1"),r.removeItem(e),vA()?Eo():!0}catch{return ah()&&Eo()}return!1}function ah(){return typeof global<"u"&&"WorkerGlobalScope"in global&&"importScripts"in global}function Nl(){return(_A()||ym()||Sg())&&!wA()&&Rg()&&!ah()}function Pg(){return Sg()&&typeof document<"u"}async function TA(){return Pg()?new Promise(r=>{const e=setTimeout(()=>{r(!1)},yA);document.addEventListener("deviceready",()=>{clearTimeout(e),r(!0)})}):!1}function bA(){return typeof window<"u"?window:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $t={LOCAL:"local",NONE:"none",SESSION:"session"},Ks=z,Cg="persistence";function AA(r,e){if(Ks(Object.values($t).includes(e),r,"invalid-persistence-type"),Lu()){Ks(e!==$t.SESSION,r,"unsupported-persistence-type");return}if(vc()){Ks(e===$t.NONE,r,"unsupported-persistence-type");return}if(ah()){Ks(e===$t.NONE||e===$t.LOCAL&&Eo(),r,"unsupported-persistence-type");return}Ks(e===$t.NONE||Rg(),r,"unsupported-persistence-type")}async function Jl(r){await r._initializationPromise;const e=kg(),t=ei(Cg,r.config.apiKey,r.name);e&&e.setItem(t,r._getPersistenceType())}function SA(r,e){const t=kg();if(!t)return[];const n=ei(Cg,r,e);switch(t.getItem(n)){case $t.NONE:return[Hi];case $t.LOCAL:return[Ro,ii];case $t.SESSION:return[ii];default:return[]}}function kg(){var r;try{return((r=bA())==null?void 0:r.sessionStorage)||null}catch{return null}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const RA=z;class ir{constructor(){this.browserResolver=zt($b),this.cordovaResolver=zt(fA),this.underlyingResolver=null,this._redirectPersistence=ii,this._completeRedirectFn=Nc,this._overrideRedirectResult=sh}async _initialize(e){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._initialize(e)}async _openPopup(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openPopup(e,t,n,i)}async _openRedirect(e,t,n,i){return await this.selectUnderlyingResolver(),this.assertedUnderlyingResolver._openRedirect(e,t,n,i)}_isIframeWebStorageSupported(e,t){this.assertedUnderlyingResolver._isIframeWebStorageSupported(e,t)}_originValidation(e){return this.assertedUnderlyingResolver._originValidation(e)}get _shouldInitProactively(){return Pg()||this.browserResolver._shouldInitProactively}get assertedUnderlyingResolver(){return RA(this.underlyingResolver,"internal-error"),this.underlyingResolver}async selectUnderlyingResolver(){if(this.underlyingResolver)return;const e=await TA();this.underlyingResolver=e?this.cordovaResolver:this.browserResolver}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xg(r){return r.unwrap()}function PA(r){return r.wrapped()}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function CA(r){return Dg(r)}function kA(r,e){var n;const t=(n=e.customData)==null?void 0:n._tokenResponse;if((e==null?void 0:e.code)==="auth/multi-factor-auth-required"){const i=e;i.resolver=new xA(r,ET(r,e))}else if(t){const i=Dg(e),s=e;i&&(s.credential=i,s.tenantId=t.tenantId||void 0,s.email=t.email||void 0,s.phoneNumber=t.phoneNumber||void 0)}}function Dg(r){const{_tokenResponse:e}=r instanceof xt?r.customData:r;if(!e)return null;if(!(r instanceof xt)&&"temporaryProof"in e&&"phoneNumber"in e)return si.credentialFromResult(r);const t=e.providerId;if(!t||t===$s.PASSWORD)return null;let n;switch(t){case $s.GOOGLE:n=fn;break;case $s.FACEBOOK:n=dn;break;case $s.GITHUB:n=pn;break;case $s.TWITTER:n=mn;break;default:const{oauthIdToken:i,oauthAccessToken:s,oauthTokenSecret:o,pendingToken:c,nonce:l}=e;return!s&&!o&&!i&&!c?null:c?t.startsWith("saml.")?Qi._create(t,c):Tn._fromParams({providerId:t,signInMethod:t,pendingToken:c,idToken:i,accessToken:s}):new $i(t).credential({idToken:i,accessToken:s,rawNonce:l})}return r instanceof xt?n.credentialFromError(r):n.credentialFromResult(r)}function Vt(r,e){return e.catch(t=>{throw t instanceof xt&&kA(r,t),t}).then(t=>{const n=t.operationType,i=t.user;return{operationType:n,credential:CA(t),additionalUserInfo:IT(t),user:Vc.getOrCreate(i)}})}async function Xl(r,e){const t=await e;return{verificationId:t.verificationId,confirm:n=>Vt(r,t.confirm(n))}}class xA{constructor(e,t){this.resolver=t,this.auth=PA(e)}get session(){return this.resolver.session}get hints(){return this.resolver.hints}resolveSignIn(e){return Vt(xg(this.auth),this.resolver.resolveSignIn(e))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Vc=class Zs{constructor(e){this._delegate=e,this.multiFactor=bT(e)}static getOrCreate(e){return Zs.USER_MAP.has(e)||Zs.USER_MAP.set(e,new Zs(e)),Zs.USER_MAP.get(e)}delete(){return this._delegate.delete()}reload(){return this._delegate.reload()}toJSON(){return this._delegate.toJSON()}getIdTokenResult(e){return this._delegate.getIdTokenResult(e)}getIdToken(e){return this._delegate.getIdToken(e)}linkAndRetrieveDataWithCredential(e){return this.linkWithCredential(e)}async linkWithCredential(e){return Vt(this.auth,ag(this._delegate,e))}async linkWithPhoneNumber(e,t){return Xl(this.auth,WT(this._delegate,e,t))}async linkWithPopup(e){return Vt(this.auth,nb(this._delegate,e,ir))}async linkWithRedirect(e){return await Jl(je(this.auth)),hb(this._delegate,e,ir)}reauthenticateAndRetrieveDataWithCredential(e){return this.reauthenticateWithCredential(e)}async reauthenticateWithCredential(e){return Vt(this.auth,cg(this._delegate,e))}reauthenticateWithPhoneNumber(e,t){return Xl(this.auth,HT(this._delegate,e,t))}reauthenticateWithPopup(e){return Vt(this.auth,tb(this._delegate,e,ir))}async reauthenticateWithRedirect(e){return await Jl(je(this.auth)),lb(this._delegate,e,ir)}sendEmailVerification(e){return lT(this._delegate,e)}async unlink(e){return await Qv(this._delegate,e),this}updateEmail(e){return fT(this._delegate,e)}updatePassword(e){return pT(this._delegate,e)}updatePhoneNumber(e){return QT(this._delegate,e)}updateProfile(e){return dT(this._delegate,e)}verifyBeforeUpdateEmail(e,t){return uT(this._delegate,e,t)}get emailVerified(){return this._delegate.emailVerified}get isAnonymous(){return this._delegate.isAnonymous}get metadata(){return this._delegate.metadata}get phoneNumber(){return this._delegate.phoneNumber}get providerData(){return this._delegate.providerData}get refreshToken(){return this._delegate.refreshToken}get tenantId(){return this._delegate.tenantId}get displayName(){return this._delegate.displayName}get email(){return this._delegate.email}get photoURL(){return this._delegate.photoURL}get providerId(){return this._delegate.providerId}get uid(){return this._delegate.uid}get auth(){return this._delegate.auth}};Vc.USER_MAP=new WeakMap;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const js=z;class Zl{constructor(e,t){if(this.app=e,t.isInitialized()){this._delegate=t.getImmediate(),this.linkUnderlyingAuth();return}const{apiKey:n}=e.options;js(n,"invalid-api-key",{appName:e.name}),js(n,"invalid-api-key",{appName:e.name});const i=typeof window<"u"?ir:void 0;this._delegate=t.initialize({options:{persistence:DA(n,e.name),popupRedirectResolver:i}}),this._delegate._updateErrorMap(FE),this.linkUnderlyingAuth()}get emulatorConfig(){return this._delegate.emulatorConfig}get currentUser(){return this._delegate.currentUser?Vc.getOrCreate(this._delegate.currentUser):null}get languageCode(){return this._delegate.languageCode}set languageCode(e){this._delegate.languageCode=e}get settings(){return this._delegate.settings}get tenantId(){return this._delegate.tenantId}set tenantId(e){this._delegate.tenantId=e}useDeviceLanguage(){this._delegate.useDeviceLanguage()}signOut(){return this._delegate.signOut()}useEmulator(e,t){Sv(this._delegate,e,t)}applyActionCode(e){return eT(this._delegate,e)}checkActionCode(e){return lg(this._delegate,e)}confirmPasswordReset(e,t){return Zv(this._delegate,e,t)}async createUserWithEmailAndPassword(e,t){return Vt(this._delegate,nT(this._delegate,e,t))}fetchProvidersForEmail(e){return this.fetchSignInMethodsForEmail(e)}fetchSignInMethodsForEmail(e){return cT(this._delegate,e)}isSignInWithEmailLink(e){return sT(this._delegate,e)}async getRedirectResult(){js(Nl(),this._delegate,"operation-not-supported-in-this-environment");const e=await fb(this._delegate,ir);return e?Vt(this._delegate,Promise.resolve(e)):{credential:null,user:null}}addFrameworkForLogging(e){pA(this._delegate,e)}onAuthStateChanged(e,t,n){const{next:i,error:s,complete:o}=Mf(e,t,n);return this._delegate.onAuthStateChanged(i,s,o)}onIdTokenChanged(e,t,n){const{next:i,error:s,complete:o}=Mf(e,t,n);return this._delegate.onIdTokenChanged(i,s,o)}sendSignInLinkToEmail(e,t){return iT(this._delegate,e,t)}sendPasswordResetEmail(e,t){return Xv(this._delegate,e,t||void 0)}async setPersistence(e){AA(this._delegate,e);let t;switch(e){case $t.SESSION:t=ii;break;case $t.LOCAL:t=await zt(Ro)._isAvailable()?Ro:eh;break;case $t.NONE:t=Hi;break;default:return _t("argument-error",{appName:this._delegate.name})}return this._delegate.setPersistence(t)}signInAndRetrieveDataWithCredential(e){return this.signInWithCredential(e)}signInAnonymously(){return Vt(this._delegate,Hv(this._delegate))}signInWithCredential(e){return Vt(this._delegate,Pc(this._delegate,e))}signInWithCustomToken(e){return Vt(this._delegate,Jv(this._delegate,e))}signInWithEmailAndPassword(e,t){return Vt(this._delegate,rT(this._delegate,e,t))}signInWithEmailLink(e,t){return Vt(this._delegate,oT(this._delegate,e,t))}signInWithPhoneNumber(e,t){return Xl(this._delegate,GT(this._delegate,e,t))}async signInWithPopup(e){return js(Nl(),this._delegate,"operation-not-supported-in-this-environment"),Vt(this._delegate,eb(this._delegate,e,ir))}async signInWithRedirect(e){return js(Nl(),this._delegate,"operation-not-supported-in-this-environment"),await Jl(this._delegate),ab(this._delegate,e,ir)}updateCurrentUser(e){return this._delegate.updateCurrentUser(e)}verifyPasswordResetCode(e){return tT(this._delegate,e)}unwrap(){return this._delegate}_delete(){return this._delegate._delete()}linkUnderlyingAuth(){this._delegate.wrapped=()=>this}}Zl.Persistence=$t;function Mf(r,e,t){let n=r;typeof r!="function"&&({next:n,error:e,complete:t}=r);const i=n;return{next:o=>i(o&&Vc.getOrCreate(o)),error:e,complete:t}}function DA(r,e){const t=SA(r,e);if(typeof self<"u"&&!t.includes(Ro)&&t.push(Ro),typeof window<"u")for(const n of[eh,ii])t.includes(n)||t.push(n);return t.includes(Hi)||t.push(Hi),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ch{static credential(e,t){return si.credential(e,t)}constructor(){this.providerId="phone",this._delegate=new si(xg(dt.auth()))}verifyPhoneNumber(e,t){return this._delegate.verifyPhoneNumber(e,t)}unwrap(){return this._delegate}}ch.PHONE_SIGN_IN_METHOD=si.PHONE_SIGN_IN_METHOD;ch.PROVIDER_ID=si.PROVIDER_ID;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const NA=z;class VA{constructor(e,t,n=dt.app()){var i;NA((i=n.options)==null?void 0:i.apiKey,"invalid-api-key",{appName:n.name}),this._delegate=new KT(n.auth(),e,t),this.type=this._delegate.type}clear(){this._delegate.clear()}render(){return this._delegate.render()}verify(){return this._delegate.verify()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const OA="auth-compat";function MA(r){r.INTERNAL.registerComponent(new vn(OA,e=>{const t=e.getProvider("app-compat").getImmediate(),n=e.getProvider("auth");return new Zl(t,n)},"PUBLIC").setServiceProps({ActionCodeInfo:{Operation:{EMAIL_SIGNIN:Ri.EMAIL_SIGNIN,PASSWORD_RESET:Ri.PASSWORD_RESET,RECOVER_EMAIL:Ri.RECOVER_EMAIL,REVERT_SECOND_FACTOR_ADDITION:Ri.REVERT_SECOND_FACTOR_ADDITION,VERIFY_AND_CHANGE_EMAIL:Ri.VERIFY_AND_CHANGE_EMAIL,VERIFY_EMAIL:Ri.VERIFY_EMAIL}},EmailAuthProvider:Ar,FacebookAuthProvider:dn,GithubAuthProvider:pn,GoogleAuthProvider:fn,OAuthProvider:$i,SAMLAuthProvider:tc,PhoneAuthProvider:ch,PhoneMultiFactorGenerator:Ag,RecaptchaVerifier:VA,TwitterAuthProvider:mn,Auth:Zl,AuthCredential:_s,Error:xt}).setInstantiationMode("LAZY").setMultipleInstances(!1)),r.registerVersion(mA,gA)}MA(dt);var LA={};const FA=(()=>{var r;if(typeof process<"u"&&LA)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),xe=(...r)=>FA&&console.log("[Firebase]",...r);let ln=null,ni=null,Po=!1,lh=!1,Co=!1,Wt=null;const uh="firebase_config",Ng={encode:r=>{try{return btoa(encodeURIComponent(r))}catch{return r}},decode:r=>{try{return decodeURIComponent(atob(r))}catch{return r}}};async function UA(){var r,e,t;if(!((r=window.electronAPI)!=null&&r.isElectron))return xe("웹 환경 - 인증 파일 사용 불가"),null;try{if(!((e=window.electronAPI)!=null&&e.readAuthFile))return xe("readAuthFile API 없음"),null;const n=await window.electronAPI.readAuthFile();if(!n.exists)return xe("인증 파일 없음 - 로컬 모드로 동작"),null;const i=JSON.parse(n.content);return i.apiKey&&i.projectId?(xe("인증 파일에서 Firebase 설정 로드됨"),i):(xe("인증 파일에 필수 설정 없음"),null)}catch(n){return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] 인증 파일 로드 실패:",n),null}}function BA(){var r;try{const e=localStorage.getItem(uh);if(e){let t;if(e.startsWith("eyJ"))try{t=JSON.parse(Ng.decode(e))}catch{t=JSON.parse(e)}else t=JSON.parse(e);if(t.apiKey&&t.projectId)return t}}catch(e){(((r=window.logger)==null?void 0:r.error)||console.error)("Firebase 설정 로드 실패:",e)}return null}async function qA(){const r=await UA();if(r)return r;const e=BA();return e?(xe("localStorage에서 설정 로드됨"),e):(xe("Firebase 설정 없음 - 로컬 모드로 동작"),null)}function Vg(r){return r?r.apiKey&&r.apiKey.trim()!==""&&r.projectId&&r.projectId.trim()!=="":!1}async function Og(){var r,e,t,n,i,s,o,c,l,u,d,p;if(xe("초기화 시작..."),Po&&ln)return xe("이미 초기화됨"),!0;if(!navigator.onLine)return xe("오프라인 상태 - 로컬 모드로 동작"),(((r=window.logger)==null?void 0:r.info)||console.info)("[Firebase] 인터넷 연결 없음. 로컬 모드로 동작합니다."),!1;if(window.NetworkAccess){let m=await window.NetworkAccess.checkAccess();if(xe("네트워크 접근 체크:",m),!m.allowed&&m.needsSetup&&await window.NetworkAccess.promptGatewayIfNeeded()&&(m=await window.NetworkAccess.checkAccess()),!m.allowed)return xe("네트워크 접근 거부:",m.reason),(((e=window.logger)==null?void 0:e.warn)||console.warn)("[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다."),!1}if(typeof dt>"u")return(((t=window.logger)==null?void 0:t.error)||console.error)("[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요."),!1;if(Wt=await qA(),xe("로드된 설정:",Wt?"있음":"없음"),!Wt)return xe("설정이 없습니다. 로컬 모드로 동작합니다."),!1;if(xe("설정값 확인:",{apiKey:Wt.apiKey?Wt.apiKey.substring(0,10)+"...":"없음",projectId:Wt.projectId||"없음",authDomain:Wt.authDomain||"없음"}),!Vg(Wt))return xe("설정이 유효하지 않습니다."),!1;try{xe("앱 초기화 중..."),dt.apps.length||dt.initializeApp(Wt),ln=dt.firestore(),xe("Firestore 연결됨");try{ni=dt.auth();const m=await ni.signInAnonymously();Co=!0,xe("익명 인증 성공:",m.user.uid)}catch(m){(((n=window.logger)==null?void 0:n.error)||console.error)("[Firebase] 익명 인증 실패:",m),Co=!1;const v=m.code||"";if(v==="auth/operation-not-allowed")return(((i=window.logger)==null?void 0:i.error)||console.error)("[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요."),!1;v==="auth/network-request-failed"?(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다."):(((o=window.logger)==null?void 0:o.warn)||console.warn)("[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)")}try{await ln.enablePersistence({synchronizeTabs:!0}),lh=!0,xe("오프라인 지원 활성화됨 (멀티탭 동기화)")}catch(m){(((c=window.logger)==null?void 0:c.warn)||console.warn)("[Firebase] 오프라인 지원 에러:",m.code,m.message),m.code==="failed-precondition"?(((l=window.logger)==null?void 0:l.warn)||console.warn)("[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다."):m.code==="unimplemented"&&(((u=window.logger)==null?void 0:u.warn)||console.warn)("[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.")}return Po=!0,xe("초기화 완료:",Wt.projectId),window.addEventListener("offline",()=>{xe("네트워크 끊김 감지 - Firestore 네트워크 비활성화"),ln&&ln.disableNetwork().catch(()=>{})}),window.addEventListener("online",()=>{xe("네트워크 복구 감지 - Firestore 네트워크 활성화"),ln&&ln.enableNetwork().catch(()=>{})}),!0}catch(m){return(((d=window.logger)==null?void 0:d.error)||console.error)("[Firebase] 초기화 실패:",m),(((p=window.logger)==null?void 0:p.error)||console.error)("[Firebase] 에러 상세:",m.message,m.stack),!1}}function $A(){return ln}function zA(){return Po}function KA(){return lh}function jA(){return Co}function GA(){var r;return((r=ni==null?void 0:ni.currentUser)==null?void 0:r.uid)||null}function WA(r){var e;try{const t=Ng.encode(JSON.stringify(r));localStorage.setItem(uh,t),xe("설정 저장됨 (난독화)")}catch(t){(((e=window.logger)==null?void 0:e.error)||console.error)("Firebase 설정 저장 실패:",t)}}function HA(){localStorage.removeItem(uh),Po=!1,Co=!1,ln=null,ni=null,Wt=null,xe("설정 초기화됨")}async function QA(){var r;if(xe("재초기화 시작..."),Po=!1,Co=!1,lh=!1,ln=null,ni=null,Wt=null,typeof dt<"u"&&dt.apps.length>0)try{await dt.app().delete(),xe("기존 Firebase 앱 삭제됨")}catch(e){(((r=window.logger)==null?void 0:r.warn)||console.warn)("[Firebase] 앱 삭제 실패:",e)}return await Og()}window.firebaseConfig={initialize:Og,reinitialize:QA,getDb:$A,isEnabled:zA,isOfflineSupported:KA,isAuthenticated:jA,getCurrentUserId:GA,isConfigValid:Vg,saveConfig:WA,resetConfig:HA};const YA=function(){const r=["name","phone","address","birthDate","corpNumber","parcels","phoneNumber","farmAddress"],e="2.0";function t(q){const J=new Uint8Array(q);let ee="";for(let K=0;K<J.byteLength;K++)ee+=String.fromCharCode(J[K]);return btoa(ee)}function n(q){const J=atob(q),ee=new Uint8Array(J.length);for(let K=0;K<J.length;K++)ee[K]=J.charCodeAt(K);return ee.buffer}const i="AES-GCM",s=256,o=16,c=6e5,l="SHA-256";function u(q){return new TextEncoder().encode(q)}async function d(q,J){const ee=u(J),K=await crypto.subtle.digest("SHA-256",ee),fe=t(K);return q+fe}async function p(q,J,ee=!1){const K=await crypto.subtle.importKey("raw",u(q),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:J,iterations:c,hash:l},K,{name:i,length:s},ee,["encrypt","decrypt"])}async function m(q,J,ee,K=!1){ee||(ee=crypto.getRandomValues(new Uint8Array(o)).buffer);const fe=await d(q,J);return{key:await p(fe,ee,K),salt:ee}}async function v(q,J,ee){if(!q||typeof q!="string")return null;const K=crypto.getRandomValues(new Uint8Array(12)),fe=new TextEncoder,ue=fe.encode(q),pe={name:"AES-GCM",iv:K};ee&&(pe.additionalData=fe.encode(ee));const Oe=await crypto.subtle.encrypt(pe,J,ue);return{iv:t(K.buffer),ct:t(Oe)}}async function M(q,J,ee,K){if(!q||!J)return null;const fe=new Uint8Array(n(q)),ue=n(J),pe={name:"AES-GCM",iv:fe};K&&(pe.additionalData=new TextEncoder().encode(K));const Oe=await crypto.subtle.decrypt(pe,ee,ue);return new TextDecoder().decode(Oe)}async function F(q,J){if(!q||!J)return q;const ee={...q},K={v:"2.1"};let fe=!1;for(const ue of r){const pe=q[ue];if(pe!=null&&pe!=="")try{const Oe=typeof pe=="string"?pe:JSON.stringify(pe);K[ue]=await v(Oe,J,ue),delete ee[ue],fe=!0}catch(Oe){console.warn(`[CryptoUtils] Failed to encrypt field "${ue}":`,Oe)}}return fe&&(ee._enc=K),ee}async function U(q,J){if(!q||!J||!q._enc)return q;const ee={...q},K=q._enc,fe=K.v==="2.1";for(const ue of r)if(K[ue]&&K[ue].iv&&K[ue].ct)try{const pe=fe?ue:void 0,Oe=await M(K[ue].iv,K[ue].ct,J,pe);if(Oe!==null)if(ue==="parcels")try{ee[ue]=JSON.parse(Oe)}catch{ee[ue]=Oe}else ee[ue]=Oe}catch(pe){console.warn(`[CryptoUtils] Failed to decrypt field "${ue}":`,pe),ue==="parcels"?ee[ue]=[]:ee[ue]="[복호화 실패]"}return delete ee._enc,ee}const X=10;async function ie(q,J){if(!Array.isArray(q)||!J)return q;const ee=new Array(q.length);for(let K=0;K<q.length;K+=X){const fe=q.slice(K,K+X),ue=await Promise.all(fe.map(pe=>F(pe,J)));for(let pe=0;pe<ue.length;pe++)ee[K+pe]=ue[pe]}return ee}async function re(q,J){if(!Array.isArray(q)||!J)return q;const ee=new Array(q.length);for(let K=0;K<q.length;K+=X){const fe=q.slice(K,K+X),ue=await Promise.all(fe.map(pe=>U(pe,J)));for(let pe=0;pe<ue.length;pe++)ee[K+pe]=ue[pe]}return ee}function _e(q){return!!(q&&q._enc&&q._enc.v)}function Te(){return[...r]}function de(q){const J=[];(!q||q.length<8)&&J.push("비밀번호는 8자 이상이어야 합니다"),q&&q.length>64&&J.push("비밀번호는 64자 이하여야 합니다"),/[a-z]/.test(q)||J.push("소문자를 1개 이상 포함해야 합니다"),/[0-9]/.test(q)||J.push("숫자를 1개 이상 포함해야 합니다"),/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(q)||J.push("특수문자를 1개 이상 포함해야 합니다");let ee="약함";return J.length===0&&(ee=q.length>=12?"강함":"보통"),{valid:J.length===0,strength:ee,errors:J}}function E(){const q=crypto.getRandomValues(new Uint8Array(32));return t(q.buffer)}function y(q){return q=q.replace(/[^a-zA-Z0-9\-_]/g,""),`
            <div class="enc-password-rules" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 12px; color: #15803D;">
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #166534;">비밀번호 규칙</div>
                <div id="${q}-rule-length" style="color: #15803D; margin-bottom: 2px;">• 8~64자 길이</div>
                <div id="${q}-rule-lower" style="color: #15803D; margin-bottom: 2px;">• 소문자 포함 (필수)</div>
                <div id="${q}-rule-number" style="color: #15803D; margin-bottom: 2px;">• 숫자 포함 (필수)</div>
                <div id="${q}-rule-special" style="color: #15803D; margin-bottom: 2px;">• 특수문자 포함 (필수)</div>
                <div id="${q}-rule-upper" style="color: #9CA3AF; font-size: 12px;">• 대문자 포함 (권장)</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 500; color: #6B7280;">비밀번호 강도</span>
                <span id="${q}-strength-text" style="font-size: 12px; font-weight: 600; color: #9CA3AF;">-</span>
            </div>
            <div id="${q}-strength-bar" style="height: 6px; border-radius: 3px; background: #E5E7EB; margin-bottom: 16px; transition: all 0.3s;">
                <div id="${q}-strength-fill" style="height: 100%; border-radius: 3px; width: 0; transition: all 0.3s;"></div>
            </div>`}function w(q){const{prefix:J,input:ee,confirmInput:K,submitBtn:fe,submitColor:ue="#4A90D9",extraCheck:pe,verifyMode:Oe=!1}=q,wt=document.getElementById(`${J}-strength-fill`),It=document.getElementById(`${J}-strength-text`),Gt=document.getElementById(`${J}-rule-length`),Sn=document.getElementById(`${J}-rule-lower`),zn=document.getElementById(`${J}-rule-number`),xr=document.getElementById(`${J}-rule-special`),sn=document.getElementById(`${J}-rule-upper`);function Ft($e,Et){$e.style.color=Et?"#16A34A":"#15803D",$e.textContent=(Et?"✓ ":"• ")+$e.textContent.replace(/^[\u2713\u2022] /,"")}function Dr(){const $e=ee.value,Et=$e.length>=8&&$e.length<=64,Kn=/[a-z]/.test($e),Nr=/[0-9]/.test($e),Vr=/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test($e),on=/[A-Z]/.test($e);Ft(Gt,Et),Ft(Sn,Kn),Ft(zn,Nr),Ft(xr,Vr),sn&&(sn.style.color=on?"#16A34A":"#9CA3AF",sn.textContent=(on?"✓ ":"• ")+sn.textContent.replace(/^[\u2713\u2022] /,""));const jn=Et&&Kn&&Nr&&Vr;$e.length===0?(wt.style.width="0",wt.style.background="#E5E7EB",It.textContent="-",It.style.color="#9CA3AF"):jn?Oe?(wt.style.width="100%",wt.style.background="linear-gradient(90deg, #22C55E, #16A34A)",It.textContent="입력 완료",It.style.color="#16A34A"):$e.length>=12||$e.length>=10&&on?(wt.style.width="100%",wt.style.background="linear-gradient(90deg, #22C55E, #16A34A)",It.textContent="강함",It.style.color="#16A34A"):(wt.style.width="66%",wt.style.background="linear-gradient(90deg, #F59E0B, #EAB308)",It.textContent="보통",It.style.color="#F59E0B"):(wt.style.width="33%",wt.style.background="#EF4444",It.textContent="요건 미충족",It.style.color="#EF4444");let Ut=jn;K&&(Ut=Ut&&$e===K.value&&K.value.length>0),pe&&(Ut=Ut&&pe()),Ut?(fe.disabled=!1,fe.style.background=ue,fe.style.cursor="pointer"):(fe.disabled=!0,fe.style.background="#ccc",fe.style.cursor="default")}return ee.addEventListener("input",Dr),K&&K.addEventListener("input",Dr),{updateValidation:Dr}}async function T(q,J){var ee,K;try{if((ee=window.encryptionManager)!=null&&ee.isReady()){const fe=window.encryptionManager.getKey(),ue=JSON.stringify(J),pe=await v(ue,fe);localStorage.setItem(q,JSON.stringify({_localEnc:!0,iv:pe.iv,ct:pe.ct}))}else localStorage.setItem(q,JSON.stringify(J))}catch(fe){if(console.error("[SecureStorage] 암호화 저장 실패:",fe.message),(K=window.encryptionManager)!=null&&K.isReady())throw new Error("데이터 암호화에 실패하여 저장을 중단합니다: "+fe.message);localStorage.setItem(q,JSON.stringify(J))}}async function I(q){var ee;const J=localStorage.getItem(q);if(!J)return null;try{const K=JSON.parse(J);if(K&&K._localEnc&&K.iv&&K.ct){if((ee=window.encryptionManager)!=null&&ee.isReady()){const fe=window.encryptionManager.getKey(),ue=await M(K.iv,K.ct,fe);return JSON.parse(ue)}return console.warn("[SecureStorage] 암호화된 데이터이나 키 미준비:",q),null}return K}catch(K){return console.error("[SecureStorage] 로드 실패:",q,K.message),null}}async function R(q){var J;if((J=window.encryptionManager)!=null&&J.isReady()){const ee=window.encryptionManager.getKey(),K=typeof q=="string"?JSON.parse(q):q;if(K&&Array.isArray(K.data)){const pe=await ie(K.data,ee);return JSON.stringify({...K,_fileEnc:"2.1",data:pe},null,2)}if(Array.isArray(K)){const pe=await ie(K,ee);return JSON.stringify(pe,null,2)}const fe=typeof q=="string"?q:JSON.stringify(q),ue=await v(fe,ee);return JSON.stringify({_localEnc:!0,iv:ue.iv,ct:ue.ct},null,2)}return typeof q=="string"?q:JSON.stringify(q,null,2)}async function _(q){var J,ee;if(!q)return null;try{const K=JSON.parse(q);if(K&&K._fileEnc&&Array.isArray(K.data)){if((J=window.encryptionManager)!=null&&J.isReady()){const fe=window.encryptionManager.getKey(),ue=await re(K.data,fe),pe={...K,data:ue};return delete pe._fileEnc,pe}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}if(K&&K._localEnc&&K.iv&&K.ct){if((ee=window.encryptionManager)!=null&&ee.isReady()){const fe=window.encryptionManager.getKey(),ue=await M(K.iv,K.ct,fe);return JSON.parse(ue)}return console.warn("[SecureStorage] 암호화된 파일이나 키 미준비"),null}return K}catch(K){return console.error("[SecureStorage] 파일 복호화 실패:",K.message),null}}return{createMasterKey:m,generateKeyFileContent:E,validatePassword:de,encrypt:v,decrypt:M,encryptRecord:F,decryptRecord:U,encryptRecords:ie,decryptRecords:re,isEncrypted:_e,getSensitiveFields:Te,bufferToBase64:t,base64ToBuffer:n,createPasswordRulesHTML:y,bindPasswordValidation:w,saveToLocalStorage:T,loadFromLocalStorage:I,encryptForFile:R,decryptFromFile:_,SENSITIVE_FIELDS:r,ENCRYPTION_VERSION:e,PBKDF2_ITERATIONS:c}}();window.CryptoUtils=YA;const eu=function(){let r=null,e=null,t=!1,n=!1,i=null,s=null,o=null,c=!1,l=null;const u="encryption_keyFile",d="encryption_salt",p="encryption_recoveryBlob",m="encryption_sessionPw",v=Symbol("recover"),M='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',F='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';function U(){if(document.getElementById("enc-modal-dark-styles"))return;const k=document.createElement("style");k.id="enc-modal-dark-styles",k.textContent=`
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
        `,document.head.appendChild(k)}const X=3,ie=24,re=6e5;function _e(k,A){if(typeof k!="string"||typeof A!="string")return!1;const O=Math.max(k.length,A.length);let L=k.length^A.length;for(let V=0;V<O;V++)L|=(k.charCodeAt(V)||0)^(A.charCodeAt(V)||0);return L===0}function Te(){var k;return(k=window.firestoreDb)!=null&&k.getCollectionName&&window.firestoreDb.getCollectionName("soil",2e3).startsWith("test_")?"test_":""}function de(){const k=Te();return k?k+"system":"_system"}const E=5*60*1e3,y=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);async function w(k){var V;if(!((V=window.firebaseConfig)!=null&&V.isEnabled()))return!0;const A=window.firebaseConfig.getDb();if(!A)return!0;const O=de(),L=A.collection(O).doc(`lock_${k}`);try{return await A.runTransaction(async C=>{const N=await C.get(L);if(N.exists){const ne=N.data();if(Date.now()-new Date(ne.lockedAt).getTime()<E)return!1}return C.set(L,{lockedBy:y,lockedAt:new Date().toISOString()}),!0})}catch(x){return console.warn(`[Encryption] Lock acquire failed (${k}):`,x.message),!0}}async function T(k){var V;if(!((V=window.firebaseConfig)!=null&&V.isEnabled()))return;const A=window.firebaseConfig.getDb();if(!A)return;const O=de(),L=A.collection(O).doc(`lock_${k}`);try{await A.runTransaction(async x=>{const C=await x.get(L);C.exists&&C.data().lockedBy===y&&x.delete(L)})}catch(x){console.warn(`[Encryption] Lock release failed (${k}):`,x.message)}}async function I(){var k,A,O,L,V,x;if((k=window.firebaseConfig)!=null&&k.isEnabled()){const C=window.firebaseConfig.getDb();if(C){const N=de(),ne=Te();try{const Q=await C.collection(N).doc("encryptionKey").get();if(Q.exists){const j=Q.data();if(j.keyFileContent)return s="firebase",console.log(`[Encryption] Key loaded from Firebase ${N}/encryptionKey`),j.keyFileContent}console.log(`[Encryption] ${N}/encryptionKey not found or empty`)}catch(Q){console.warn(`[Encryption] Firebase ${N} read failed:`,Q.message)}if(ne){const Q=ne+"_system";try{console.log(`[Encryption] Trying fallback: ${Q}/encryptionKey...`);const j=await C.collection(Q).doc("encryptionKey").get();if(j.exists&&((A=j.data())!=null&&A.keyFileContent)){s="firebase",console.log(`[Encryption] Key loaded from Firebase ${Q} (fallback)`);try{await C.collection(N).doc("encryptionKey").set(j.data()),console.log(`[Encryption] Migrated encryptionKey: ${Q} → ${N}`);const ae=await C.collection(Q).doc("recoveryBlob").get();ae.exists&&(await C.collection(N).doc("recoveryBlob").set(ae.data()),console.log(`[Encryption] Migrated recoveryBlob: ${Q} → ${N}`))}catch(ae){console.warn("[Encryption] Migration failed:",ae.message)}return j.data().keyFileContent}}catch(j){console.warn(`[Encryption] ${Q} fallback failed:`,j.message)}try{console.log("[Encryption] Trying fallback: _system/encryptionKey...");const j=await C.collection("_system").doc("encryptionKey").get();if(j.exists&&((O=j.data())!=null&&O.keyFileContent))return s="firebase",console.log("[Encryption] Key loaded from Firebase _system (fallback)"),j.data().keyFileContent}catch(j){console.warn("[Encryption] _system fallback failed:",j.message)}}}}if((L=window.electronAPI)!=null&&L.isElectron){try{const C=await((x=(V=window.electronAPI).readKeyFile)==null?void 0:x.call(V));if(C)return s="local",console.debug("[Encryption] Key loaded from local file"),C}catch(C){console.warn("[Encryption] Local key file not found:",C.message)}return null}try{const C=localStorage.getItem(u);if(C)return s="local",console.log("[Encryption] Key loaded from localStorage"),C}catch(C){console.warn("[Encryption] localStorage key load failed:",C.message)}return null}async function R(k){var L,V;if(!((L=window.firebaseConfig)!=null&&L.isEnabled()))return;const A=window.firebaseConfig.getDb();if(!A)return;const O=de();try{const x=await A.collection(O).doc("encryptionKey").get();if(x.exists&&((V=x.data())!=null&&V.keyFileContent)){console.log(`[Encryption] Firebase already has key in ${O} - skip sync`);return}await A.collection(O).doc("encryptionKey").set({keyFileContent:k,createdAt:new Date().toISOString(),version:"2.0",syncedFrom:"local"}),console.log(`[Encryption] Local key synced to Firebase ${O}/encryptionKey`)}catch(x){console.warn("[Encryption] Failed to sync key to Firebase:",x.message)}}async function _(){var O,L,V,x;if(!((O=window.CryptoUtils)!=null&&O.generateKeyFileContent))return console.error("[Encryption] CryptoUtils.generateKeyFileContent not available"),null;const k=window.CryptoUtils.generateKeyFileContent();if(console.debug("[Encryption] New key file generated"),(L=window.firebaseConfig)!=null&&L.isEnabled()){const C=window.firebaseConfig.getDb();if(C){const N=de();try{return await C.collection(N).doc("encryptionKey").set({keyFileContent:k,createdAt:new Date().toISOString(),version:"2.0"}),console.log(`[Encryption] Key stored in Firebase ${N}/encryptionKey`),s="generated",k}catch(ne){console.error("[Encryption] Failed to store key in Firebase:",ne.message)}}}if(((V=window.electronAPI)==null?void 0:V.isElectron)===!0){if((x=window.electronAPI)!=null&&x.saveKeyFile)try{const C=await window.electronAPI.saveKeyFile(k);if(C!=null&&C.success)return console.log("[Encryption] Key stored in local file (safeStorage protected)"),s="local",q(k),k}catch(C){console.error("[Encryption] Failed to store key locally:",C.message)}}else try{return localStorage.setItem(u,k),console.log("[Encryption] Key stored in localStorage"),s="local",k}catch(C){console.warn("[Encryption] localStorage key save failed:",C.message)}return s="generated",k}function q(k){setTimeout(async()=>{try{confirm(`[암호화 키 파일 백업 안내]

암호화 키가 새로 생성되었습니다.
키 파일을 USB 또는 안전한 곳에 백업해두면
다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.

지금 키 파일을 백업하시겠습니까?`)&&await J()}catch(A){console.warn("[Encryption] Key backup prompt failed:",A.message)}},1e3)}async function J(){var O,L;let k=o;if(k||(k=await I()),!k)return{success:!1,error:"활성화된 암호화 키가 없습니다."};if(((O=window.electronAPI)==null?void 0:O.isElectron)===!0&&((L=window.electronAPI)!=null&&L.exportKeyFile)){const V=await window.electronAPI.exportKeyFile(k);return V!=null&&V.success?(console.log("[Encryption] Key file exported to:",V.filePath),window.showToast&&window.showToast("키 파일이 저장되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}):(V==null?void 0:V.error)==="canceled"?{success:!1,error:"취소됨"}:(console.error("[Encryption] Key export failed:",V==null?void 0:V.error),{success:!1,error:(V==null?void 0:V.error)||"내보내기 실패"})}try{const V=new Blob([k],{type:"text/plain"}),x=URL.createObjectURL(V),C=document.createElement("a");return C.href=x,C.download="sample-log.key",document.body.appendChild(C),C.click(),document.body.removeChild(C),URL.revokeObjectURL(x),window.showToast&&window.showToast("키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.","success"),{success:!0}}catch(V){return{success:!1,error:V.message}}}async function ee(){var O,L,V;const k=((O=window.electronAPI)==null?void 0:O.isElectron)===!0;let A=null;if(k&&((L=window.electronAPI)!=null&&L.importKeyFile)){const x=await window.electronAPI.importKeyFile();if(!(x!=null&&x.success))return(x==null?void 0:x.error)==="canceled"?{success:!1,error:"취소됨"}:{success:!1,error:(x==null?void 0:x.error)||"가져오기 실패"};A=x.content}else try{A=await new Promise((x,C)=>{const N=document.createElement("input");N.type="file",N.accept=".key",N.onchange=async ne=>{const Q=ne.target.files[0];if(!Q){C(new Error("파일 선택 취소"));return}const j=await Q.text();x(j.trim())},N.click()})}catch(x){return{success:!1,error:x.message}}if(!A||A.length<20||A.length>64)return{success:!1,error:"유효하지 않은 키 파일입니다. (길이 불일치)"};if(!/^[A-Za-z0-9+/=]+$/.test(A))return{success:!1,error:"유효하지 않은 키 파일입니다. (형식 오류)"};if(k&&((V=window.electronAPI)!=null&&V.saveKeyFile))try{const x=await window.electronAPI.saveKeyFile(A);if(!(x!=null&&x.success))return{success:!1,error:"키 파일 로컬 저장 실패"}}catch(x){return{success:!1,error:"로컬 저장 실패: "+x.message}}return o=A,s="local",console.log("[Encryption] Key file imported successfully"),window.showToast&&window.showToast("키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.","success"),{success:!0}}async function K(){var k;if((k=window.electronAPI)!=null&&k.loadSalt)try{const A=await window.electronAPI.loadSalt();if(A&&window.CryptoUtils)return console.log(`[Encryption] Salt loaded from Electron (${A.length} chars)`),window.CryptoUtils.base64ToBuffer(A)}catch(A){console.warn("[Encryption] Electron salt load failed:",A.message)}try{const A=localStorage.getItem(d);if(A&&window.CryptoUtils)return console.log(`[Encryption] Salt loaded from localStorage (${A.length} chars)`),window.CryptoUtils.base64ToBuffer(A)}catch(A){console.warn("[Encryption] localStorage salt load failed:",A.message)}return console.log("[Encryption] No saved salt found"),null}async function fe(k){var O;if(!window.CryptoUtils)return;const A=window.CryptoUtils.bufferToBase64(k);if((O=window.electronAPI)!=null&&O.saveSalt)try{await window.electronAPI.saveSalt(A),console.log("[Encryption] Salt saved to Electron");return}catch(L){console.warn("[Encryption] Electron salt save failed:",L.message)}try{localStorage.setItem(d,A),console.log("[Encryption] Salt saved to localStorage")}catch(L){console.warn("[Encryption] localStorage salt save failed:",L.message)}}function ue(k,A){return U(),new Promise(O=>{const L=he=>{l=null,O(he)};l=()=>{var he;(he=document.getElementById("encryption-password-modal"))==null||he.remove(),O(null)};const V=document.getElementById("encryption-password-modal");V&&V.remove();const x=document.createElement("div");if(x.id="encryption-password-modal",x.innerHTML=`
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
            `,document.body.appendChild(x),k){const he=document.getElementById("enc-error-msg");he.textContent=k,he.style.display="block",document.getElementById("enc-password-input").style.borderColor="#e74c3c"}const C=document.getElementById("enc-password-input"),N=document.getElementById("enc-submit-btn"),ne=document.getElementById("enc-skip-btn"),Q=document.getElementById("enc-password-error");CryptoUtils.bindPasswordValidation({prefix:"enc",input:C,submitBtn:N,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const j=document.getElementById("enc-toggle-pw");j&&j.addEventListener("click",()=>{const he=C.type==="password";C.type=he?"text":"password",j.innerHTML=he?M:F}),C.addEventListener("focus",()=>{C.style.borderColor="#22C55E",C.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),C.addEventListener("blur",()=>{C.style.borderColor="#D1D5DB",C.style.boxShadow="none"}),C.addEventListener("input",()=>{Q.style.display="none"});async function ae(){const he=C.value;if(!he){Q.textContent="비밀번호를 입력해주세요.",Q.style.display="block";return}if(A){N.disabled=!0,N.textContent="검증 중...",C.disabled=!0;const ce=document.getElementById("enc-error-msg");ce&&(ce.style.display="none");try{const Ee=await A(he);if(Ee.valid)x.remove(),L(he);else if(Ee.exhausted)x.remove(),L(null);else{C.disabled=!1,N.textContent="확인",ce&&(ce.textContent=Ee.error||"비밀번호가 올바르지 않습니다.",ce.style.display="block"),C.value="",C.style.borderColor="#e74c3c",C.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",C.focus();const De=x.querySelector("div > div");De&&(De.style.animation="none",De.offsetHeight,De.style.animation="enc-shake 0.4s ease")}}catch(Ee){C.disabled=!1,N.textContent="확인",ce&&(ce.textContent="검증 중 오류: "+(Ee.message||"알 수 없는 오류"),ce.style.display="block"),C.focus()}return}x.remove(),L(he)}function se(){x.remove(),L(null)}x._showError=he=>{const ce=document.getElementById("enc-error-msg");ce&&(ce.textContent=he,ce.style.display="block"),C.value="",C.style.borderColor="#e74c3c",C.style.boxShadow="0 0 0 3px rgba(231,76,60,0.1)",N.disabled=!0,C.focus();const Ee=x.querySelector("div > div");Ee&&(Ee.style.animation="none",Ee.offsetHeight,Ee.style.animation="enc-shake 0.4s ease")},N.addEventListener("click",ae),ne.addEventListener("click",se),C.addEventListener("keydown",he=>{he.key==="Enter"&&!N.disabled&&ae(),he.key==="Escape"&&se()}),Sn().then(he=>{const ce=document.getElementById("enc-recover-link");ce&&he&&(ce.style.display="block")}).catch(he=>{console.debug("[Encryption] Recovery blob check for link display failed:",he.message)});const oe=document.getElementById("enc-recover-btn");oe&&oe.addEventListener("click",async he=>{he.preventDefault(),x.remove(),L(v)}),setTimeout(()=>C.focus(),100)})}function pe(){return U(),new Promise(k=>{const A=oe=>{l=null,k(oe)};l=()=>{var oe;(oe=document.getElementById("encryption-password-modal"))==null||oe.remove(),k(null)};const O=document.getElementById("encryption-password-modal");O&&O.remove();const L=document.createElement("div");L.id="encryption-password-modal",L.innerHTML=`
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
            `,document.body.appendChild(L);const V=document.getElementById("enc-password-input"),x=document.getElementById("enc-password-confirm"),C=document.getElementById("enc-submit-btn"),N=document.getElementById("enc-skip-btn"),ne=document.getElementById("enc-password-error");CryptoUtils.bindPasswordValidation({prefix:"enc",input:V,confirmInput:x,submitBtn:C,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)"});const Q=document.getElementById("enc-toggle-pw");Q&&Q.addEventListener("click",()=>{const oe=V.type==="password";V.type=oe?"text":"password",Q.innerHTML=oe?M:F}),[V,x].forEach(oe=>{oe.addEventListener("focus",()=>{oe.style.borderColor="#22C55E",oe.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),oe.addEventListener("blur",()=>{oe.style.borderColor="#D1D5DB",oe.style.boxShadow="none"})}),V.addEventListener("input",()=>{ne.style.display="none"}),x.addEventListener("input",()=>{ne.style.display="none"});function j(oe){ne.textContent=oe,ne.style.display="block"}function ae(){var ce;const oe=V.value,he=x.value;if((ce=window.CryptoUtils)!=null&&ce.validatePassword){const Ee=window.CryptoUtils.validatePassword(oe);if(!Ee.valid){j(Ee.errors[0]);return}}if(oe!==he){j("비밀번호가 일치하지 않습니다.");return}L.remove(),A(oe)}function se(){L.remove(),A(null)}C.addEventListener("click",ae),N.addEventListener("click",se),x.addEventListener("keydown",oe=>{oe.key==="Enter"&&!C.disabled&&ae(),oe.key==="Escape"&&se()}),V.addEventListener("keydown",oe=>{oe.key==="Escape"&&se()}),setTimeout(()=>V.focus(),100)})}async function Oe(k){var A,O,L;if(!((A=window.firebaseConfig)!=null&&A.isEnabled())||!window.firestoreDb)return console.log("[Encryption] Key verification skipped (no Firestore)"),{verified:!0,skipped:!0};try{const V=window.firebaseConfig.getDb();if(!V)return{verified:!0,skipped:!0};const x=["soil","water","compost","heavy-metal","pesticide"],C=new Date().getFullYear();let N=null;for(const ae of x){const se=window.firestoreDb.getCollectionName(ae,C);if((await V.collection(se).limit(5).get()).forEach(he=>{const ce=he.data();ce._enc&&!N&&(N=ce)}),N)break}if(!N||!N._enc)return console.log("[Encryption] Key verification: no encrypted documents found - skipping"),{verified:!0,skipped:!0};const ne=Object.keys(N._enc).find(ae=>ae!=="v");if(!ne||!((O=N._enc[ne])!=null&&O.iv)||!((L=N._enc[ne])!=null&&L.ct))return console.log("[Encryption] Key verification: no valid encrypted field found - skipping"),{verified:!0,skipped:!0};const Q=N._enc.v==="2.1";return console.log(`[Encryption] Key verification: testing decrypt of "${ne}" (v${N._enc.v||"1"}, AAD=${Q})...`),await window.CryptoUtils.decrypt(N._enc[ne].iv,N._enc[ne].ct,k,Q?ne:void 0)!==null?(console.log("[Encryption] Key verification: SUCCESS"),{verified:!0,skipped:!1}):(console.warn("[Encryption] Key verification: decrypt returned null (wrong key)"),{verified:!1,skipped:!1})}catch(V){return console.warn("[Encryption] Key verification FAILED:",V.message),{verified:!1,skipped:!1}}}function wt(){const k="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",A=256-256%k.length;let O="";for(;O.length<ie;){const L=crypto.getRandomValues(new Uint8Array(1));L[0]<A&&(O+=k[L[0]%k.length])}return O.match(/.{1,4}/g).join("-")}async function It(k,A){const O=k.replace(/-/g,"").toUpperCase(),L=await crypto.subtle.importKey("raw",new TextEncoder().encode(O),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:A,iterations:re,hash:"SHA-256"},L,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function Gt(k){var se,oe,he;const A=wt(),O=crypto.getRandomValues(new Uint8Array(16)),L=await It(A,O.buffer);let V;const x=await ze(),C=o||await I();if(x&&C&&e){const ce=await window.CryptoUtils.createMasterKey(x,C,e,!0);V=await crypto.subtle.exportKey("raw",ce.key)}else V=await crypto.subtle.exportKey("raw",k);const N=crypto.getRandomValues(new Uint8Array(12)),ne=await crypto.subtle.encrypt({name:"AES-GCM",iv:N},L,V),Q={version:"2.0",iv:CryptoUtils.bufferToBase64(N.buffer),ct:CryptoUtils.bufferToBase64(ne),salt:CryptoUtils.bufferToBase64(O.buffer),createdAt:new Date().toISOString()};let j=!1;if((se=window.firebaseConfig)!=null&&se.isEnabled()){const ce=window.firebaseConfig.getDb();if(ce){const Ee=de();try{await ce.collection(Ee).doc("recoveryBlob").set(Q),console.log(`[Encryption] Recovery blob (v2.0) stored in ${Ee}/recoveryBlob`),j=!0}catch(De){console.error("[Encryption] Failed to store recovery blob in Firebase:",De.message)}}}if(((oe=window.electronAPI)==null?void 0:oe.isElectron)===!0&&((he=window.electronAPI)!=null&&he.saveRecoveryBlob))try{const ce=await window.electronAPI.saveRecoveryBlob(JSON.stringify(Q));ce!=null&&ce.success&&(console.log("[Encryption] Recovery blob stored locally (safeStorage protected)"),j=!0)}catch(ce){console.error("[Encryption] Failed to store recovery blob locally:",ce.message)}if(!j)try{localStorage.setItem(p,JSON.stringify(Q)),console.log("[Encryption] Recovery blob stored in localStorage"),j=!0}catch(ce){console.error("[Encryption] Failed to store recovery blob in localStorage:",ce.message)}return j?A:null}async function Sn(){var A,O,L,V;if((A=window.firebaseConfig)!=null&&A.isEnabled()){const x=window.firebaseConfig.getDb();if(x){const C=de();try{const N=await x.collection(C).doc("recoveryBlob").get();if(N.exists&&((O=N.data())!=null&&O.ct))return!0}catch(N){console.warn("[Encryption] Recovery blob check (Firebase) failed:",N.message)}}}if(((L=window.electronAPI)==null?void 0:L.isElectron)===!0&&((V=window.electronAPI)!=null&&V.loadRecoveryBlob))try{const x=await window.electronAPI.loadRecoveryBlob();if(x){const C=JSON.parse(x);if(C!=null&&C.ct)return!0}}catch(x){console.warn("[Encryption] Recovery blob check (local) failed:",x.message)}try{const x=localStorage.getItem(p);if(x){const C=JSON.parse(x);if(C!=null&&C.ct)return!0}}catch(x){console.warn("[Encryption] Recovery blob check (localStorage) failed:",x.message)}return!1}async function zn(k){try{if(!await Sn()){console.log("[Encryption] No recovery blob found - generating for existing user...");const O=await Gt(k);O&&(await Ft(O),console.log("[Encryption] Recovery blob created for existing user"))}}catch(A){console.warn("[Encryption] ensureRecoveryBlob failed:",A.message)}}async function xr(){if(!r)return{success:!1,message:"암호화가 활성화되지 않았습니다."};try{const k=await Gt(r);return k?(await Ft(k),{success:!0,message:"복구 키가 재발급되었습니다."}):{success:!1,message:"복구 키 생성에 실패했습니다."}}catch(k){return console.error("[Encryption] regenerateRecoveryKey error:",k),{success:!1,message:k.message}}}async function sn(k){var O,L,V;let A=null;if((O=window.firebaseConfig)!=null&&O.isEnabled()){const x=window.firebaseConfig.getDb();if(x){const C=de();try{const N=await x.collection(C).doc("recoveryBlob").get();N.exists&&(A=N.data())}catch(N){console.warn("[Encryption] Recovery blob load (Firebase) failed:",N.message)}}}if(!A&&((L=window.electronAPI)==null?void 0:L.isElectron)===!0&&(V=window.electronAPI)!=null&&V.loadRecoveryBlob)try{const C=await window.electronAPI.loadRecoveryBlob();C&&(A=JSON.parse(C))}catch(C){console.warn("[Encryption] Recovery blob load (local) failed:",C.message)}if(!A)try{const x=localStorage.getItem(p);x&&(A=JSON.parse(x),console.log("[Encryption] Recovery blob loaded from localStorage"))}catch(x){console.warn("[Encryption] Recovery blob load (localStorage) failed:",x.message)}if(!A)return console.warn("[Encryption] Recovery blob not found"),null;try{if(!A.version||!["1.0","2.0"].includes(A.version))return console.warn("[Encryption] Unknown recovery blob version:",A.version),null;if(!A.iv||!A.ct||!A.salt)return console.warn("[Encryption] Invalid recovery blob format"),null;const x=CryptoUtils.base64ToBuffer(A.salt),C=await It(k,x),N=new Uint8Array(CryptoUtils.base64ToBuffer(A.iv)),ne=CryptoUtils.base64ToBuffer(A.ct),Q=await crypto.subtle.decrypt({name:"AES-GCM",iv:N},C,ne);if(A.version==="2.0")return await crypto.subtle.importKey("raw",Q,{name:"AES-GCM"},!1,["encrypt","decrypt"]);{const j=new TextDecoder().decode(Q),ae=await I(),se=await K();return!ae||!se?null:(await window.CryptoUtils.createMasterKey(j,ae,se)).key}}catch(x){return console.warn("[Encryption] Recovery decryption failed:",x.message),null}}function Ft(k){return new Promise(A=>{const O=document.getElementById("recovery-key-modal");O&&O.remove();const L=document.createElement("div");L.id="recovery-key-modal",L.innerHTML=`
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
            `,document.body.appendChild(L),document.getElementById("recovery-key-display").textContent=k;let V=null;document.getElementById("recovery-key-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(k);const x=document.getElementById("recovery-key-copy");x.textContent="복사됨! (30초 후 클립보드 삭제)",x.style.background="#dcfce7",x.style.borderColor="#22c55e",x.style.color="#16a34a",V&&clearTimeout(V),V=setTimeout(async()=>{try{await navigator.clipboard.readText()===k&&await navigator.clipboard.writeText("")}catch{}const C=document.getElementById("recovery-key-copy");C&&(C.textContent="복사",C.style.background="#eff6ff",C.style.borderColor="#3b82f6",C.style.color="#3b82f6")},3e4)}catch(x){console.warn("Clipboard write failed:",x)}}),document.getElementById("recovery-key-close").addEventListener("click",()=>{V&&clearTimeout(V);try{navigator.clipboard.writeText("").catch(()=>{})}catch{}L.remove(),A()})})}function Dr(){return new Promise(k=>{const A=j=>{l=null,k(j)};l=()=>{var j;(j=document.getElementById("recovery-input-modal"))==null||j.remove(),k(null)};const O=document.getElementById("recovery-input-modal");O&&O.remove();const L=document.createElement("div");L.id="recovery-input-modal",L.innerHTML=`
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
            `,document.body.appendChild(L);const V=document.getElementById("recovery-key-input"),x=document.getElementById("recovery-input-submit"),C=document.getElementById("recovery-input-cancel"),N=document.getElementById("recovery-input-error");V.addEventListener("input",()=>{var se;N.style.display="none";let j=V.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase();j.length>24&&(j=j.substring(0,24));const ae=((se=j.match(/.{1,4}/g))==null?void 0:se.join("-"))||j;V.value=ae});function ne(){const j=V.value.replace(/-/g,"").trim();if(j.length!==24){N.textContent="복구 키는 24자리여야 합니다.",N.style.display="block";return}L.remove(),A(j)}function Q(){L.remove(),A(null)}x.addEventListener("click",ne),C.addEventListener("click",Q),V.addEventListener("keydown",j=>{j.key==="Enter"&&ne(),j.key==="Escape"&&Q()}),setTimeout(()=>V.focus(),100)})}function $e(k){let A=document.getElementById("recovery-progress-overlay");if(A){const O=document.getElementById("recovery-progress-text");O&&(O.textContent=k),A.style.display="flex"}else{A=document.createElement("div"),A.id="recovery-progress-overlay",A.style.cssText=`
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 99998;
                display: flex; align-items: center; justify-content: center;
            `;const O=document.createElement("div");O.style.cssText=`
                background: white; border-radius: 12px; padding: 32px;
                text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                min-width: 280px;
            `;const L=document.createElement("div");L.style.cssText=`
                width: 40px; height: 40px; border: 4px solid #e2e8f0;
                border-top: 4px solid #3b82f6; border-radius: 50%;
                animation: encSpin 1s linear infinite; margin: 0 auto 16px;
            `;const V=document.createElement("style");V.textContent="@keyframes encSpin { to { transform: rotate(360deg); } }",document.head.appendChild(V);const x=document.createElement("div");x.id="recovery-progress-text",x.style.cssText="font-size: 14px; color: #333;",x.textContent=k,O.appendChild(L),O.appendChild(x),A.appendChild(O),document.body.appendChild(A)}}function Et(){const k=document.getElementById("recovery-progress-overlay");k&&k.remove()}async function Kn(){var x;if(!((x=window.firebaseConfig)!=null&&x.isEnabled()))return{allowed:!0,remaining:5};const O=window.firebaseConfig.getDb();if(!O)return{allowed:!0,remaining:5};const L=de(),V=O.collection(L).doc("recoveryAttempts");try{return await O.runTransaction(async N=>{const ne=await N.get(V),Q=ne.exists?ne.data():null;if(Q){const j=new Date(Q.lastAttemptAt),ae=new Date,se=(ae-j)/6e4;return se>=30?(N.set(V,{count:1,lastAttemptAt:ae.toISOString()}),{allowed:!0,remaining:4}):Q.count>=5?{allowed:!1,remaining:0,lockoutMinutes:Math.ceil(30-se)}:(N.update(V,{count:Q.count+1,lastAttemptAt:ae.toISOString()}),{allowed:!0,remaining:5-Q.count-1})}return N.set(V,{count:1,lastAttemptAt:new Date().toISOString()}),{allowed:!0,remaining:4}})}catch(C){return console.warn("[Encryption] Recovery attempts check failed:",C.message),{allowed:!0,remaining:5}}}async function Nr(){var O;if(!((O=window.firebaseConfig)!=null&&O.isEnabled()))return;const k=window.firebaseConfig.getDb();if(!k)return;const A=de();try{await k.collection(A).doc("recoveryAttempts").delete()}catch(L){console.warn("[Encryption] Failed to reset recovery attempts:",L.message)}}async function Vr(){var A,O,L;if(!await w("passwordChange"))return alert("다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요."),{success:!1,error:"Another password operation in progress"};try{let x=0,C=null;for(;x<3;){const N=await Kn();if(!N.allowed)return alert(`복구 시도 횟수를 초과했습니다.
${N.lockoutMinutes}분 후에 다시 시도해주세요.`),{success:!1,error:"Rate limited"};const ne=await Dr();if(!ne)return{success:!1,error:"Cancelled"};if($e("복구 키 검증 중..."),C=await sn(ne),C)break;if(x++,Et(),x>=3)return alert("복구 키 시도 횟수를 초과했습니다. (3회)"),{success:!1,error:"Max retries exceeded"};alert("복구 키가 올바르지 않습니다. ("+x+"/3)"+(N.remaining>0?`
남은 전체 시도: `+N.remaining+"회":""))}$e("마스터 키 검증 중...");try{if(!(await Oe(C)).verified)return Et(),alert(`복구된 키로 데이터를 검증할 수 없습니다.
복구 블롭이 오래되었거나 손상되었을 수 있습니다.`),{success:!1,error:"Key verification failed"};await Nr(),$e("키 파일 로드 중...");let ne=o||await I();if(!ne){if(Et(),((A=window.electronAPI)==null?void 0:A.isElectron)===!0&&confirm(`키 파일을 찾을 수 없습니다.
키 파일을 가져오시겠습니까?`)){const ct=await ee();ct!=null&&ct.success&&(ne=o||await I())}if(!ne)return alert(`키 파일을 불러올 수 없습니다.
키 파일 내보내기로 백업한 .key 파일을 가져오거나,
Firebase 연결을 확인해주세요.`),{success:!1,error:"Key file not found"}}Et();const Q=await pe();if(!Q)return{success:!1,error:"New password cancelled"};$e("새 마스터 키 생성 중...");const j=await window.CryptoUtils.createMasterKey(Q,ne,null),ae=j.key,se=j.salt,oe=C,he=[];try{if((O=window.firebaseConfig)!=null&&O.isEnabled()&&window.firestoreDb){const Ee=window.firebaseConfig.getDb();if(Ee){const De=["soil","water","pesticide","compost","heavyMetal"],ct=new Date().getFullYear();let Ce=0;const Je=De.length*(ct-2020+1);for(const Rt of De)for(let Xe=2020;Xe<=ct;Xe++){Ce++,$e(`데이터 재암호화 중... (${Ce}/${Je})`);const Rn=window.firestoreDb.getCollectionName(Rt,Xe);await Gn(Ee,Rn,oe,ae),he.push(Rn)}}}}catch(Ee){console.error("[Encryption] Recovery re-encryption failed, rolling back...",Ee);const De=[];if(he.length>0&&((L=window.firebaseConfig)!=null&&L.isEnabled())){const ct=window.firebaseConfig.getDb();if(ct)for(const Ce of he)try{await Gn(ct,Ce,ae,oe)}catch(Je){console.error(`[Encryption] Rollback FAILED: ${Ce}`,Je.message),De.push(Ce)}}return Et(),De.length>0?alert(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${De.join(", ")}. 관리자에게 문의하세요.`):alert("재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요."),{success:!1,error:"Re-encryption failed, rolled back"}}$e("설정 저장 중..."),e=se,await fe(se),r=ae,t=!0,o=null,await Ut(Q);const ce=await Gt(ae);return Et(),ce&&await Ft(ce),console.log("[Encryption] Password recovery completed successfully"),alert("비밀번호가 성공적으로 복구되었습니다."),{success:!0}}catch(N){return Et(),console.error("[Encryption] Password recovery failed:",N),alert("비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요."),{success:!1,error:N.message}}}finally{await T("passwordChange")}}async function on(){return t?!!r:n?i||!1:(n=!0,i=jn().finally(()=>{i=null}),i)}async function jn(){var k;if(!window.CryptoUtils)return console.warn("[Encryption] CryptoUtils not loaded"),n=!1,!1;try{if(console.log("[Encryption] Step 1: Loading key file..."),o=await I(),o||(k=window.firebaseConfig)!=null&&k.isEnabled()&&(console.log("[Encryption] Retrying Firebase key load..."),o=await I()),!o&&(console.log("[Encryption] No existing key found - starting first-time setup"),c=!0,o=await _(),!o))return console.error("[Encryption] Failed to generate key file"),!1;console.debug(`[Encryption] Key ready (source: ${s})`),s==="local"&&(console.log("[Encryption] Key loaded from local - syncing to Firebase..."),await R(o)),console.log("[Encryption] Step 2: Loading salt..."),e=await K();const A=!e;console.log(e?`[Encryption] Salt loaded (${new Uint8Array(e).length} bytes)`:"[Encryption] No saved salt - will generate new one");let O;return c?O=await pt(A):O=await Ti(A),O&&(t=!0),n=!1,O}catch(A){return console.error("[Encryption] Init FAILED:",A.message),console.error("[Encryption] Stack:",A.stack),o=null,n=!1,!1}}async function Ut(k){var A;if((A=window.electronAPI)!=null&&A.storeSessionPassword){await window.electronAPI.storeSessionPassword(k),console.log("[Encryption] Password stored in session (main process memory)");return}try{sessionStorage.setItem(m,k),console.log("[Encryption] Password stored in sessionStorage")}catch(O){console.warn("[Encryption] sessionStorage password store failed:",O.message)}}async function ze(){var k;if((k=window.electronAPI)!=null&&k.getSessionPassword){const A=await window.electronAPI.getSessionPassword();if(A)return console.log("[Encryption] Session password found in main process"),A}try{const A=sessionStorage.getItem(m);if(A)return console.log("[Encryption] Session password found in sessionStorage"),A}catch(A){console.warn("[Encryption] sessionStorage password read failed:",A.message)}return null}async function pt(k){console.log("[Encryption] === FIRST-TIME SETUP ===");const A=await pe();if(!A)return console.warn("[Encryption] First-time setup skipped by user"),o=null,!1;console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const O=await window.CryptoUtils.createMasterKey(A,o,e);r=O.key,e=O.salt,k&&(console.log("[Encryption] Saving new salt..."),await fe(e)),await Ut(A);try{const L=await Gt(r);L&&await Ft(L)}catch(L){console.warn("[Encryption] Recovery key generation failed:",L.message)}return console.log("[Encryption] First-time setup SUCCESS (verification skipped - no existing encrypted data)"),o=null,c=!1,!0}async function Ti(k){var x;const A=await ze();if(A){console.log("[Encryption] Auto-login with stored session password...");const C=await window.CryptoUtils.createMasterKey(A,o,e);if(r=C.key,e=C.salt,k&&await fe(e),(await Oe(r)).verified)return await zn(r),o=null,console.log("[Encryption] Auto-login SUCCESS (session password)"),!0;console.warn("[Encryption] Stored session password is invalid - clearing"),r=null,(x=window.electronAPI)!=null&&x.clearSessionPassword&&await window.electronAPI.clearSessionPassword()}let O=0,L=null;const V=async C=>{console.log("[Encryption] Deriving master key (PBKDF2 600K iterations)...");const N=await window.CryptoUtils.createMasterKey(C,o,e);return r=N.key,e=N.salt,k&&O===0&&(console.log("[Encryption] Saving new salt..."),await fe(e)),console.log("[Encryption] Verifying key against encrypted data..."),(await Oe(r)).verified?{valid:!0}:(O++,r=null,console.warn(`[Encryption] Key verification failed (attempt ${O}/${X})`),O>=X?{valid:!1,error:`비밀번호 시도 횟수를 초과했습니다. (${X}회)`,exhausted:!0}:{valid:!1,error:`비밀번호가 올바르지 않습니다. (${O}/${X})`})};for(;O<X;){console.log(`[Encryption] Password prompt (attempt ${O+1}/${X})...`);const C=await ue(L,V);if(!C)return console.warn("[Encryption] Password skipped - encryption disabled"),o=null,!1;if(C===v){console.log("[Encryption] Password recovery requested from login prompt");try{const N=await Vr();if(N!=null&&N.success)return console.log("[Encryption] Password recovered successfully"),!0;L=(N==null?void 0:N.error)==="Cancelled"?null:"비밀번호 복구에 실패했습니다. 다시 시도해주세요."}catch(N){console.error("[Encryption] Recovery error:",N),L="비밀번호 복구 중 오류: "+(N.message||"알 수 없는 오류")}continue}return await Ut(C),await zn(r),o=null,console.log(`[Encryption] Login SUCCESS (source: ${s})`),!0}return console.error("[Encryption] All password attempts exhausted"),o=null,r=null,!1}async function al(){var k;if(console.log("[Encryption] === KEY REGENERATION ==="),(k=window.firebaseConfig)!=null&&k.isEnabled()){const A=window.firebaseConfig.getDb();if(A){const O=de();try{await A.collection(O).doc("encryptionKey").delete(),console.log(`[Encryption] Deleted ${O}/encryptionKey from Firebase`)}catch(L){console.warn("[Encryption] Firebase key delete failed:",L.message)}}}return bi(),await on()}function pa(){return U(),new Promise(k=>{const A=ae=>{l=null,k(ae)};l=()=>{var ae;(ae=document.getElementById("encryption-password-modal"))==null||ae.remove(),k(null)};const O=document.getElementById("encryption-password-modal");O&&O.remove();const L=document.createElement("div");L.id="encryption-password-modal",L.innerHTML=`
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
            `,document.body.appendChild(L);const V=document.getElementById("enc-export-pw-input"),x=document.getElementById("enc-export-submit"),C=document.getElementById("enc-export-cancel"),N=document.getElementById("enc-export-pw-error");CryptoUtils.bindPasswordValidation({prefix:"enc-export",input:V,submitBtn:x,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",verifyMode:!0});const ne=document.getElementById("enc-export-toggle-pw");ne&&ne.addEventListener("click",()=>{const ae=V.type==="password";V.type=ae?"text":"password",ne.innerHTML=ae?M:F}),V.addEventListener("focus",()=>{V.style.borderColor="#22C55E",V.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),V.addEventListener("blur",()=>{V.style.borderColor="#D1D5DB",V.style.boxShadow="none"}),V.addEventListener("input",()=>{N.style.display="none"});function Q(){const ae=V.value;if(!ae){N.textContent="비밀번호를 입력해주세요.",N.style.display="block";return}L.remove(),A(ae)}function j(){L.remove(),A(null)}x.addEventListener("click",Q),C.addEventListener("click",j),V.addEventListener("keydown",ae=>{ae.key==="Enter"&&!x.disabled&&Q(),ae.key==="Escape"&&j()}),setTimeout(()=>V.focus(),100)})}async function cl(k){if(!k||typeof k!="string")return!1;const A=await ze();if(A&&_e(k,A))return!0;try{const O=o||await I();if(!O||!e)return!1;const L=await window.CryptoUtils.createMasterKey(k,O,e);return(await Oe(L.key)).verified}catch(O){return console.warn("[Encryption] verifyPassword failed:",O.message),!1}}async function Or(){if(!r)return console.warn("[Encryption] verifyPasswordForExport: no active key"),!1;const k=await pa();if(!k)return!1;const A=await ze();if(A&&_e(k,A))return console.log("[Encryption] Export password verification: MATCH"),!0;try{const O=await I();if(!O)return!1;const L=await window.CryptoUtils.createMasterKey(k,O,e);if((await Oe(L.key)).verified)return console.log("[Encryption] Export password verification: VALID (key-derived)"),!0}catch(O){console.warn("[Encryption] Export password verification failed:",O.message)}return alert("비밀번호가 올바르지 않습니다."),!1}function ma(){return U(),new Promise(k=>{const A=se=>{l=null,k(se)};l=()=>{var se;(se=document.getElementById("encryption-password-modal"))==null||se.remove(),k(null)};const O=document.getElementById("encryption-password-modal");O&&O.remove();const L=document.createElement("div");L.id="encryption-password-modal",L.innerHTML=`
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
            `,document.body.appendChild(L);const V=document.getElementById("enc-ch-old-pw"),x=document.getElementById("enc-ch-new-pw"),C=document.getElementById("enc-ch-confirm-pw"),N=document.getElementById("enc-ch-submit"),ne=document.getElementById("enc-ch-cancel"),Q=document.getElementById("enc-ch-error"),j=CryptoUtils.bindPasswordValidation({prefix:"enc-ch",input:x,confirmInput:C,submitBtn:N,submitColor:"linear-gradient(180deg, #22C55E 0%, #16A34A 100%)",extraCheck:()=>V.value.length>0});V.addEventListener("input",()=>{j.updateValidation(),Q.style.display="none"}),x.addEventListener("input",()=>{Q.style.display="none"}),C.addEventListener("input",()=>{Q.style.display="none"});function ae(se,oe){const he=document.getElementById(se);he&&he.addEventListener("click",()=>{const ce=oe.type==="password";oe.type=ce?"text":"password",he.innerHTML=ce?M:F})}ae("enc-ch-toggle-old",V),ae("enc-ch-toggle-new",x),ae("enc-ch-toggle-confirm",C),[V,x,C].forEach(se=>{se.addEventListener("focus",()=>{se.style.borderColor="#22C55E",se.style.boxShadow="0 0 0 3px rgba(34,197,94,0.1)"}),se.addEventListener("blur",()=>{se.style.borderColor="#D1D5DB",se.style.boxShadow="none"})}),N.addEventListener("click",()=>{var ce;const se=V.value,oe=x.value,he=C.value;if(oe!==he){Q.textContent="새 비밀번호가 일치하지 않습니다.",Q.style.display="block";return}if((ce=window.CryptoUtils)!=null&&ce.validatePassword){const Ee=window.CryptoUtils.validatePassword(oe);if(!Ee.valid){Q.textContent=Ee.errors[0],Q.style.display="block";return}}V.disabled=!0,x.disabled=!0,C.disabled=!0,N.disabled=!0,ne.disabled=!0,N.style.background="#ccc",A({oldPassword:se,newPassword:oe,modal:L,errDiv:Q})}),ne.addEventListener("click",()=>{L.remove(),A(null)}),V.addEventListener("keydown",se=>{se.key==="Escape"&&(L.remove(),A(null))}),x.addEventListener("keydown",se=>{se.key==="Escape"&&(L.remove(),A(null))}),C.addEventListener("keydown",se=>{se.key==="Enter"&&!N.disabled&&N.click(),se.key==="Escape"&&(L.remove(),A(null))}),setTimeout(()=>V.focus(),100)})}async function ga(){var A,O;if(!r)return alert("암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요."),{success:!1,error:"Encryption not active"};if(!await w("passwordChange"))return alert("다른 창에서 비밀번호 변경이 진행 중입니다. 잠시 후 다시 시도해주세요."),{success:!1,error:"Another password change in progress"};try{const L=await ma();if(!L)return{success:!1,error:"Cancelled"};const{oldPassword:V,newPassword:x,modal:C,errDiv:N}=L,ne=document.getElementById("enc-ch-progress"),Q=document.getElementById("enc-ch-progress-bar");try{const j=await I();if(!j)return N.textContent="키 파일을 불러올 수 없습니다.",N.style.display="block",C.remove(),{success:!1,error:"Key file not found"};const ae=await ze();let se=!1;if(ae&&_e(V,ae))se=!0;else{const Ce=await window.CryptoUtils.createMasterKey(V,j,e);se=(await Oe(Ce.key)).verified}if(!se)return N.textContent="현재 비밀번호가 올바르지 않습니다.",N.style.display="block",document.getElementById("enc-ch-old-pw").disabled=!1,document.getElementById("enc-ch-new-pw").disabled=!1,document.getElementById("enc-ch-confirm-pw").disabled=!1,document.getElementById("enc-ch-cancel").disabled=!1,{success:!1,error:"Invalid current password"};const oe=e,he=r,ce=[];ne.style.display="block",Q.style.width="10%",console.log("[Encryption] Deriving new master key...");const Ee=await window.CryptoUtils.createMasterKey(x,j,null),De=Ee.key,ct=Ee.salt;Q.style.width="20%";try{if((A=window.firebaseConfig)!=null&&A.isEnabled()&&window.firestoreDb){const Ce=window.firebaseConfig.getDb();if(Ce){const Je=["soil","water","pesticide","compost","heavyMetal"],Rt=new Date().getFullYear(),Xe=[];for(let Pn=2020;Pn<=Rt;Pn++)Xe.push(Pn);const Rn=Je.length*Xe.length;let Cs=0;for(const Pn of Je)for(const ks of Xe){const xs=window.firestoreDb.getCollectionName(Pn,ks);await Gn(Ce,xs,he,De),ce.push(xs),Cs++;const hl=20+Cs/Rn*70;Q.style.width=hl+"%"}}}}catch(Ce){console.error("[Encryption] Re-encryption failed, attempting rollback...",Ce),Q.style.background="#e74c3c";const Je=[];if(ce.length>0&&((O=window.firebaseConfig)!=null&&O.isEnabled())){const Rt=window.firebaseConfig.getDb();if(Rt)for(const Xe of ce)try{await Gn(Rt,Xe,De,he),console.log(`[Encryption] Rollback success: ${Xe}`)}catch(Rn){console.error(`[Encryption] Rollback FAILED: ${Xe}`,Rn.message),Je.push(Xe)}}if(Je.length>0){const Rt=Je.join(", ");console.error(`[Encryption] CRITICAL: Rollback failed for: ${Rt}`),console.error("[Encryption] These collections may have mixed encryption state (old+new keys)"),N.textContent=`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${Rt}. 관리자에게 문의하세요.`}else N.textContent="재암호화 실패. 기존 비밀번호가 유지됩니다.";return N.style.display="block",document.getElementById("enc-ch-old-pw").disabled=!1,document.getElementById("enc-ch-new-pw").disabled=!1,document.getElementById("enc-ch-confirm-pw").disabled=!1,document.getElementById("enc-ch-cancel").disabled=!1,ne.style.display="none",{success:!1,error:"Re-encryption failed, rolled back"}}Q.style.width="95%",e=ct,await fe(ct),r=De,await Ut(x);try{const Ce=await Gt(De);if(Ce)return Q.style.width="100%",C.remove(),await Ft(Ce),console.log("[Encryption] Password change completed successfully"),alert("비밀번호가 성공적으로 변경되었습니다."),{success:!0}}catch(Ce){console.warn("[Encryption] Recovery blob update failed:",Ce.message)}return Q.style.width="100%",console.log("[Encryption] Password change completed successfully"),C.remove(),alert("비밀번호가 성공적으로 변경되었습니다."),{success:!0}}catch(j){return console.error("[Encryption] Password change failed:",j),C.remove(),alert("비밀번호 변경 중 오류가 발생했습니다: "+j.message),{success:!1,error:j.message}}}finally{await T("passwordChange")}}async function Gn(k,A,O,L){var ne,Q;const V=await k.collection(A).get();if(V.empty)return;const x=200,C=[];V.forEach(j=>C.push({ref:j.ref,id:j.id,data:j.data()}));const N=[];for(let j=0;j<C.length;j+=x){const ae=C.slice(j,j+x),se=k.batch();let oe=!1;for(const{ref:he,id:ce,data:Ee}of ae)if(Ee._enc)try{const De=await window.CryptoUtils.decryptRecord({...Ee},O),ct=await window.CryptoUtils.encryptRecord(De,L);if(ct._enc){const Ce={...ct},Je=(Q=(ne=window.firebase)==null?void 0:ne.firestore)==null?void 0:Q.FieldValue;if(Je){for(const Rt of window.CryptoUtils.SENSITIVE_FIELDS)(!(Rt in Ce)||Ce[Rt]===void 0)&&(Ce[Rt]=Je.delete());Ce.updatedAt=Je.serverTimestamp()}se.set(he,Ce,{merge:!0}),oe=!0}}catch(De){N.push(ce),console.error(`[ReEncrypt] ${A}/${ce}: re-encrypt failed -`,De.message)}if(N.length>0)throw new Error(`${A}: ${N.length}개 문서 재암호화 실패 (${N.join(", ")})`);oe&&await se.commit()}console.log(`[ReEncrypt] ${A}: re-encrypted ${C.length} docs`)}function ll(){return!!r}function ul(){return r}function ya(){return s}function bi(){if(r=null,o&&typeof o=="string")try{const k=crypto.getRandomValues(new Uint8Array(o.length));o=String.fromCharCode(...k)}catch{}o=null,e=null,t=!1,n=!1,i=null,s=null,c=!1;try{sessionStorage.removeItem(m)}catch{}}function Mr(){bi()}async function Ps(){if(t)return!!r;if(n)return i||!1;if(n=!0,!window.CryptoUtils)return n=!1,!1;try{const k=await ze();if(!k)return console.log("[Encryption] Silent init: no session password - skipping"),n=!1,!1;if(o=await I(),!o)return n=!1,!1;e=await K();const A=!e,O=await window.CryptoUtils.createMasterKey(k,o,e);return r=O.key,e=O.salt,A&&await fe(e),(await Oe(r)).verified?(t=!0,o=null,console.log("[Encryption] Silent init SUCCESS"),n=!1,!0):(r=null,o=null,n=!1,!1)}catch(k){return console.warn("[Encryption] Silent init failed:",k.message),o=null,n=!1,!1}}return{init:on,initSilent:Ps,isReady:ll,getKey:ul,getKeySource:ya,destroy:bi,reset:Mr,regenerateKey:al,verifyPassword:cl,verifyPasswordForExport:Or,changePassword:ga,recoverPassword:Vr,checkRecoveryBlobExists:Sn,regenerateRecoveryKey:xr,exportKeyFile:J,importKeyFile:ee,_cleanupModal(){l&&(l(),l=null)}}}();window.encryptionManager=eu;window.addEventListener("beforeunload",()=>{typeof eu._cleanupModal=="function"&&eu._cleanupModal()});var Lf=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var lr,Mg;(function(){var r;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,y){function w(){}w.prototype=y.prototype,E.F=y.prototype,E.prototype=new w,E.prototype.constructor=E,E.D=function(T,I,R){for(var _=Array(arguments.length-2),q=2;q<arguments.length;q++)_[q-2]=arguments[q];return y.prototype[I].apply(T,_)}}function t(){this.blockSize=-1}function n(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(n,t),n.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function i(E,y,w){w||(w=0);const T=Array(16);if(typeof y=="string")for(var I=0;I<16;++I)T[I]=y.charCodeAt(w++)|y.charCodeAt(w++)<<8|y.charCodeAt(w++)<<16|y.charCodeAt(w++)<<24;else for(I=0;I<16;++I)T[I]=y[w++]|y[w++]<<8|y[w++]<<16|y[w++]<<24;y=E.g[0],w=E.g[1],I=E.g[2];let R=E.g[3],_;_=y+(R^w&(I^R))+T[0]+3614090360&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(I^y&(w^I))+T[1]+3905402710&4294967295,R=y+(_<<12&4294967295|_>>>20),_=I+(w^R&(y^w))+T[2]+606105819&4294967295,I=R+(_<<17&4294967295|_>>>15),_=w+(y^I&(R^y))+T[3]+3250441966&4294967295,w=I+(_<<22&4294967295|_>>>10),_=y+(R^w&(I^R))+T[4]+4118548399&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(I^y&(w^I))+T[5]+1200080426&4294967295,R=y+(_<<12&4294967295|_>>>20),_=I+(w^R&(y^w))+T[6]+2821735955&4294967295,I=R+(_<<17&4294967295|_>>>15),_=w+(y^I&(R^y))+T[7]+4249261313&4294967295,w=I+(_<<22&4294967295|_>>>10),_=y+(R^w&(I^R))+T[8]+1770035416&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(I^y&(w^I))+T[9]+2336552879&4294967295,R=y+(_<<12&4294967295|_>>>20),_=I+(w^R&(y^w))+T[10]+4294925233&4294967295,I=R+(_<<17&4294967295|_>>>15),_=w+(y^I&(R^y))+T[11]+2304563134&4294967295,w=I+(_<<22&4294967295|_>>>10),_=y+(R^w&(I^R))+T[12]+1804603682&4294967295,y=w+(_<<7&4294967295|_>>>25),_=R+(I^y&(w^I))+T[13]+4254626195&4294967295,R=y+(_<<12&4294967295|_>>>20),_=I+(w^R&(y^w))+T[14]+2792965006&4294967295,I=R+(_<<17&4294967295|_>>>15),_=w+(y^I&(R^y))+T[15]+1236535329&4294967295,w=I+(_<<22&4294967295|_>>>10),_=y+(I^R&(w^I))+T[1]+4129170786&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^I&(y^w))+T[6]+3225465664&4294967295,R=y+(_<<9&4294967295|_>>>23),_=I+(y^w&(R^y))+T[11]+643717713&4294967295,I=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(I^R))+T[0]+3921069994&4294967295,w=I+(_<<20&4294967295|_>>>12),_=y+(I^R&(w^I))+T[5]+3593408605&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^I&(y^w))+T[10]+38016083&4294967295,R=y+(_<<9&4294967295|_>>>23),_=I+(y^w&(R^y))+T[15]+3634488961&4294967295,I=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(I^R))+T[4]+3889429448&4294967295,w=I+(_<<20&4294967295|_>>>12),_=y+(I^R&(w^I))+T[9]+568446438&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^I&(y^w))+T[14]+3275163606&4294967295,R=y+(_<<9&4294967295|_>>>23),_=I+(y^w&(R^y))+T[3]+4107603335&4294967295,I=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(I^R))+T[8]+1163531501&4294967295,w=I+(_<<20&4294967295|_>>>12),_=y+(I^R&(w^I))+T[13]+2850285829&4294967295,y=w+(_<<5&4294967295|_>>>27),_=R+(w^I&(y^w))+T[2]+4243563512&4294967295,R=y+(_<<9&4294967295|_>>>23),_=I+(y^w&(R^y))+T[7]+1735328473&4294967295,I=R+(_<<14&4294967295|_>>>18),_=w+(R^y&(I^R))+T[12]+2368359562&4294967295,w=I+(_<<20&4294967295|_>>>12),_=y+(w^I^R)+T[5]+4294588738&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^I)+T[8]+2272392833&4294967295,R=y+(_<<11&4294967295|_>>>21),_=I+(R^y^w)+T[11]+1839030562&4294967295,I=R+(_<<16&4294967295|_>>>16),_=w+(I^R^y)+T[14]+4259657740&4294967295,w=I+(_<<23&4294967295|_>>>9),_=y+(w^I^R)+T[1]+2763975236&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^I)+T[4]+1272893353&4294967295,R=y+(_<<11&4294967295|_>>>21),_=I+(R^y^w)+T[7]+4139469664&4294967295,I=R+(_<<16&4294967295|_>>>16),_=w+(I^R^y)+T[10]+3200236656&4294967295,w=I+(_<<23&4294967295|_>>>9),_=y+(w^I^R)+T[13]+681279174&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^I)+T[0]+3936430074&4294967295,R=y+(_<<11&4294967295|_>>>21),_=I+(R^y^w)+T[3]+3572445317&4294967295,I=R+(_<<16&4294967295|_>>>16),_=w+(I^R^y)+T[6]+76029189&4294967295,w=I+(_<<23&4294967295|_>>>9),_=y+(w^I^R)+T[9]+3654602809&4294967295,y=w+(_<<4&4294967295|_>>>28),_=R+(y^w^I)+T[12]+3873151461&4294967295,R=y+(_<<11&4294967295|_>>>21),_=I+(R^y^w)+T[15]+530742520&4294967295,I=R+(_<<16&4294967295|_>>>16),_=w+(I^R^y)+T[2]+3299628645&4294967295,w=I+(_<<23&4294967295|_>>>9),_=y+(I^(w|~R))+T[0]+4096336452&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~I))+T[7]+1126891415&4294967295,R=y+(_<<10&4294967295|_>>>22),_=I+(y^(R|~w))+T[14]+2878612391&4294967295,I=R+(_<<15&4294967295|_>>>17),_=w+(R^(I|~y))+T[5]+4237533241&4294967295,w=I+(_<<21&4294967295|_>>>11),_=y+(I^(w|~R))+T[12]+1700485571&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~I))+T[3]+2399980690&4294967295,R=y+(_<<10&4294967295|_>>>22),_=I+(y^(R|~w))+T[10]+4293915773&4294967295,I=R+(_<<15&4294967295|_>>>17),_=w+(R^(I|~y))+T[1]+2240044497&4294967295,w=I+(_<<21&4294967295|_>>>11),_=y+(I^(w|~R))+T[8]+1873313359&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~I))+T[15]+4264355552&4294967295,R=y+(_<<10&4294967295|_>>>22),_=I+(y^(R|~w))+T[6]+2734768916&4294967295,I=R+(_<<15&4294967295|_>>>17),_=w+(R^(I|~y))+T[13]+1309151649&4294967295,w=I+(_<<21&4294967295|_>>>11),_=y+(I^(w|~R))+T[4]+4149444226&4294967295,y=w+(_<<6&4294967295|_>>>26),_=R+(w^(y|~I))+T[11]+3174756917&4294967295,R=y+(_<<10&4294967295|_>>>22),_=I+(y^(R|~w))+T[2]+718787259&4294967295,I=R+(_<<15&4294967295|_>>>17),_=w+(R^(I|~y))+T[9]+3951481745&4294967295,E.g[0]=E.g[0]+y&4294967295,E.g[1]=E.g[1]+(I+(_<<21&4294967295|_>>>11))&4294967295,E.g[2]=E.g[2]+I&4294967295,E.g[3]=E.g[3]+R&4294967295}n.prototype.v=function(E,y){y===void 0&&(y=E.length);const w=y-this.blockSize,T=this.C;let I=this.h,R=0;for(;R<y;){if(I==0)for(;R<=w;)i(this,E,R),R+=this.blockSize;if(typeof E=="string"){for(;R<y;)if(T[I++]=E.charCodeAt(R++),I==this.blockSize){i(this,T),I=0;break}}else for(;R<y;)if(T[I++]=E[R++],I==this.blockSize){i(this,T),I=0;break}}this.h=I,this.o+=y},n.prototype.A=function(){var E=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);E[0]=128;for(var y=1;y<E.length-8;++y)E[y]=0;y=this.o*8;for(var w=E.length-8;w<E.length;++w)E[w]=y&255,y/=256;for(this.v(E),E=Array(16),y=0,w=0;w<4;++w)for(let T=0;T<32;T+=8)E[y++]=this.g[w]>>>T&255;return E};function s(E,y){var w=c;return Object.prototype.hasOwnProperty.call(w,E)?w[E]:w[E]=y(E)}function o(E,y){this.h=y;const w=[];let T=!0;for(let I=E.length-1;I>=0;I--){const R=E[I]|0;T&&R==y||(w[I]=R,T=!1)}this.g=w}var c={};function l(E){return-128<=E&&E<128?s(E,function(y){return new o([y|0],y<0?-1:0)}):new o([E|0],E<0?-1:0)}function u(E){if(isNaN(E)||!isFinite(E))return p;if(E<0)return U(u(-E));const y=[];let w=1;for(let T=0;E>=w;T++)y[T]=E/w|0,w*=4294967296;return new o(y,0)}function d(E,y){if(E.length==0)throw Error("number format error: empty string");if(y=y||10,y<2||36<y)throw Error("radix out of range: "+y);if(E.charAt(0)=="-")return U(d(E.substring(1),y));if(E.indexOf("-")>=0)throw Error('number format error: interior "-" character');const w=u(Math.pow(y,8));let T=p;for(let R=0;R<E.length;R+=8){var I=Math.min(8,E.length-R);const _=parseInt(E.substring(R,R+I),y);I<8?(I=u(Math.pow(y,I)),T=T.j(I).add(u(_))):(T=T.j(w),T=T.add(u(_)))}return T}var p=l(0),m=l(1),v=l(16777216);r=o.prototype,r.m=function(){if(F(this))return-U(this).m();let E=0,y=1;for(let w=0;w<this.g.length;w++){const T=this.i(w);E+=(T>=0?T:4294967296+T)*y,y*=4294967296}return E},r.toString=function(E){if(E=E||10,E<2||36<E)throw Error("radix out of range: "+E);if(M(this))return"0";if(F(this))return"-"+U(this).toString(E);const y=u(Math.pow(E,6));var w=this;let T="";for(;;){const I=_e(w,y).g;w=X(w,I.j(y));let R=((w.g.length>0?w.g[0]:w.h)>>>0).toString(E);if(w=I,M(w))return R+T;for(;R.length<6;)R="0"+R;T=R+T}},r.i=function(E){return E<0?0:E<this.g.length?this.g[E]:this.h};function M(E){if(E.h!=0)return!1;for(let y=0;y<E.g.length;y++)if(E.g[y]!=0)return!1;return!0}function F(E){return E.h==-1}r.l=function(E){return E=X(this,E),F(E)?-1:M(E)?0:1};function U(E){const y=E.g.length,w=[];for(let T=0;T<y;T++)w[T]=~E.g[T];return new o(w,~E.h).add(m)}r.abs=function(){return F(this)?U(this):this},r.add=function(E){const y=Math.max(this.g.length,E.g.length),w=[];let T=0;for(let I=0;I<=y;I++){let R=T+(this.i(I)&65535)+(E.i(I)&65535),_=(R>>>16)+(this.i(I)>>>16)+(E.i(I)>>>16);T=_>>>16,R&=65535,_&=65535,w[I]=_<<16|R}return new o(w,w[w.length-1]&-2147483648?-1:0)};function X(E,y){return E.add(U(y))}r.j=function(E){if(M(this)||M(E))return p;if(F(this))return F(E)?U(this).j(U(E)):U(U(this).j(E));if(F(E))return U(this.j(U(E)));if(this.l(v)<0&&E.l(v)<0)return u(this.m()*E.m());const y=this.g.length+E.g.length,w=[];for(var T=0;T<2*y;T++)w[T]=0;for(T=0;T<this.g.length;T++)for(let I=0;I<E.g.length;I++){const R=this.i(T)>>>16,_=this.i(T)&65535,q=E.i(I)>>>16,J=E.i(I)&65535;w[2*T+2*I]+=_*J,ie(w,2*T+2*I),w[2*T+2*I+1]+=R*J,ie(w,2*T+2*I+1),w[2*T+2*I+1]+=_*q,ie(w,2*T+2*I+1),w[2*T+2*I+2]+=R*q,ie(w,2*T+2*I+2)}for(E=0;E<y;E++)w[E]=w[2*E+1]<<16|w[2*E];for(E=y;E<2*y;E++)w[E]=0;return new o(w,0)};function ie(E,y){for(;(E[y]&65535)!=E[y];)E[y+1]+=E[y]>>>16,E[y]&=65535,y++}function re(E,y){this.g=E,this.h=y}function _e(E,y){if(M(y))throw Error("division by zero");if(M(E))return new re(p,p);if(F(E))return y=_e(U(E),y),new re(U(y.g),U(y.h));if(F(y))return y=_e(E,U(y)),new re(U(y.g),y.h);if(E.g.length>30){if(F(E)||F(y))throw Error("slowDivide_ only works with positive integers.");for(var w=m,T=y;T.l(E)<=0;)w=Te(w),T=Te(T);var I=de(w,1),R=de(T,1);for(T=de(T,2),w=de(w,2);!M(T);){var _=R.add(T);_.l(E)<=0&&(I=I.add(w),R=_),T=de(T,1),w=de(w,1)}return y=X(E,I.j(y)),new re(I,y)}for(I=p;E.l(y)>=0;){for(w=Math.max(1,Math.floor(E.m()/y.m())),T=Math.ceil(Math.log(w)/Math.LN2),T=T<=48?1:Math.pow(2,T-48),R=u(w),_=R.j(y);F(_)||_.l(E)>0;)w-=T,R=u(w),_=R.j(y);M(R)&&(R=m),I=I.add(R),E=X(E,_)}return new re(I,E)}r.B=function(E){return _e(this,E).h},r.and=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let T=0;T<y;T++)w[T]=this.i(T)&E.i(T);return new o(w,this.h&E.h)},r.or=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let T=0;T<y;T++)w[T]=this.i(T)|E.i(T);return new o(w,this.h|E.h)},r.xor=function(E){const y=Math.max(this.g.length,E.g.length),w=[];for(let T=0;T<y;T++)w[T]=this.i(T)^E.i(T);return new o(w,this.h^E.h)};function Te(E){const y=E.g.length+1,w=[];for(let T=0;T<y;T++)w[T]=E.i(T)<<1|E.i(T-1)>>>31;return new o(w,E.h)}function de(E,y){const w=y>>5;y%=32;const T=E.g.length-w,I=[];for(let R=0;R<T;R++)I[R]=y>0?E.i(R+w)>>>y|E.i(R+w+1)<<32-y:E.i(R+w);return new o(I,E.h)}n.prototype.digest=n.prototype.A,n.prototype.reset=n.prototype.u,n.prototype.update=n.prototype.v,Mg=n,o.prototype.add=o.prototype.add,o.prototype.multiply=o.prototype.j,o.prototype.modulo=o.prototype.B,o.prototype.compare=o.prototype.l,o.prototype.toNumber=o.prototype.m,o.prototype.toString=o.prototype.toString,o.prototype.getBits=o.prototype.i,o.fromNumber=u,o.fromString=d,lr=o}).apply(typeof Lf<"u"?Lf:typeof self<"u"?self:typeof window<"u"?window:{});var Pa=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Lg,eo,Fg,Ua,tu,Ug,Bg,qg;(function(){var r,e=Object.defineProperty;function t(a){a=[typeof globalThis=="object"&&globalThis,a,typeof window=="object"&&window,typeof self=="object"&&self,typeof Pa=="object"&&Pa];for(var h=0;h<a.length;++h){var f=a[h];if(f&&f.Math==Math)return f}throw Error("Cannot find global object")}var n=t(this);function i(a,h){if(h)e:{var f=n;a=a.split(".");for(var g=0;g<a.length-1;g++){var S=a[g];if(!(S in f))break e;f=f[S]}a=a[a.length-1],g=f[a],h=h(g),h!=g&&h!=null&&e(f,a,{configurable:!0,writable:!0,value:h})}}i("Symbol.dispose",function(a){return a||Symbol("Symbol.dispose")}),i("Array.prototype.values",function(a){return a||function(){return this[Symbol.iterator]()}}),i("Object.entries",function(a){return a||function(h){var f=[],g;for(g in h)Object.prototype.hasOwnProperty.call(h,g)&&f.push([g,h[g]]);return f}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var s=s||{},o=this||self;function c(a){var h=typeof a;return h=="object"&&a!=null||h=="function"}function l(a,h,f){return a.call.apply(a.bind,arguments)}function u(a,h,f){return u=l,u.apply(null,arguments)}function d(a,h){var f=Array.prototype.slice.call(arguments,1);return function(){var g=f.slice();return g.push.apply(g,arguments),a.apply(this,g)}}function p(a,h){function f(){}f.prototype=h.prototype,a.Z=h.prototype,a.prototype=new f,a.prototype.constructor=a,a.Ob=function(g,S,D){for(var W=Array(arguments.length-2),ye=2;ye<arguments.length;ye++)W[ye-2]=arguments[ye];return h.prototype[S].apply(g,W)}}var m=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?a=>a&&AsyncContext.Snapshot.wrap(a):a=>a;function v(a){const h=a.length;if(h>0){const f=Array(h);for(let g=0;g<h;g++)f[g]=a[g];return f}return[]}function M(a,h){for(let g=1;g<arguments.length;g++){const S=arguments[g];var f=typeof S;if(f=f!="object"?f:S?Array.isArray(S)?"array":f:"null",f=="array"||f=="object"&&typeof S.length=="number"){f=a.length||0;const D=S.length||0;a.length=f+D;for(let W=0;W<D;W++)a[f+W]=S[W]}else a.push(S)}}class F{constructor(h,f){this.i=h,this.j=f,this.h=0,this.g=null}get(){let h;return this.h>0?(this.h--,h=this.g,this.g=h.next,h.next=null):h=this.i(),h}}function U(a){o.setTimeout(()=>{throw a},0)}function X(){var a=E;let h=null;return a.g&&(h=a.g,a.g=a.g.next,a.g||(a.h=null),h.next=null),h}class ie{constructor(){this.h=this.g=null}add(h,f){const g=re.get();g.set(h,f),this.h?this.h.next=g:this.g=g,this.h=g}}var re=new F(()=>new _e,a=>a.reset());class _e{constructor(){this.next=this.g=this.h=null}set(h,f){this.h=h,this.g=f,this.next=null}reset(){this.next=this.g=this.h=null}}let Te,de=!1,E=new ie,y=()=>{const a=Promise.resolve(void 0);Te=()=>{a.then(w)}};function w(){for(var a;a=X();){try{a.h.call(a.g)}catch(f){U(f)}var h=re;h.j(a),h.h<100&&(h.h++,a.next=h.g,h.g=a)}de=!1}function T(){this.u=this.u,this.C=this.C}T.prototype.u=!1,T.prototype.dispose=function(){this.u||(this.u=!0,this.N())},T.prototype[Symbol.dispose]=function(){this.dispose()},T.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function I(a,h){this.type=a,this.g=this.target=h,this.defaultPrevented=!1}I.prototype.h=function(){this.defaultPrevented=!0};var R=function(){if(!o.addEventListener||!Object.defineProperty)return!1;var a=!1,h=Object.defineProperty({},"passive",{get:function(){a=!0}});try{const f=()=>{};o.addEventListener("test",f,h),o.removeEventListener("test",f,h)}catch{}return a}();function _(a){return/^[\s\xa0]*$/.test(a)}function q(a,h){I.call(this,a?a.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,a&&this.init(a,h)}p(q,I),q.prototype.init=function(a,h){const f=this.type=a.type,g=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement,this.g=h,h=a.relatedTarget,h||(f=="mouseover"?h=a.fromElement:f=="mouseout"&&(h=a.toElement)),this.relatedTarget=h,g?(this.clientX=g.clientX!==void 0?g.clientX:g.pageX,this.clientY=g.clientY!==void 0?g.clientY:g.pageY,this.screenX=g.screenX||0,this.screenY=g.screenY||0):(this.clientX=a.clientX!==void 0?a.clientX:a.pageX,this.clientY=a.clientY!==void 0?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0),this.button=a.button,this.key=a.key||"",this.ctrlKey=a.ctrlKey,this.altKey=a.altKey,this.shiftKey=a.shiftKey,this.metaKey=a.metaKey,this.pointerId=a.pointerId||0,this.pointerType=a.pointerType,this.state=a.state,this.i=a,a.defaultPrevented&&q.Z.h.call(this)},q.prototype.h=function(){q.Z.h.call(this);const a=this.i;a.preventDefault?a.preventDefault():a.returnValue=!1};var J="closure_listenable_"+(Math.random()*1e6|0),ee=0;function K(a,h,f,g,S){this.listener=a,this.proxy=null,this.src=h,this.type=f,this.capture=!!g,this.ha=S,this.key=++ee,this.da=this.fa=!1}function fe(a){a.da=!0,a.listener=null,a.proxy=null,a.src=null,a.ha=null}function ue(a,h,f){for(const g in a)h.call(f,a[g],g,a)}function pe(a,h){for(const f in a)h.call(void 0,a[f],f,a)}function Oe(a){const h={};for(const f in a)h[f]=a[f];return h}const wt="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function It(a,h){let f,g;for(let S=1;S<arguments.length;S++){g=arguments[S];for(f in g)a[f]=g[f];for(let D=0;D<wt.length;D++)f=wt[D],Object.prototype.hasOwnProperty.call(g,f)&&(a[f]=g[f])}}function Gt(a){this.src=a,this.g={},this.h=0}Gt.prototype.add=function(a,h,f,g,S){const D=a.toString();a=this.g[D],a||(a=this.g[D]=[],this.h++);const W=zn(a,h,g,S);return W>-1?(h=a[W],f||(h.fa=!1)):(h=new K(h,this.src,D,!!g,S),h.fa=f,a.push(h)),h};function Sn(a,h){const f=h.type;if(f in a.g){var g=a.g[f],S=Array.prototype.indexOf.call(g,h,void 0),D;(D=S>=0)&&Array.prototype.splice.call(g,S,1),D&&(fe(h),a.g[f].length==0&&(delete a.g[f],a.h--))}}function zn(a,h,f,g){for(let S=0;S<a.length;++S){const D=a[S];if(!D.da&&D.listener==h&&D.capture==!!f&&D.ha==g)return S}return-1}var xr="closure_lm_"+(Math.random()*1e6|0),sn={};function Ft(a,h,f,g,S){if(Array.isArray(h)){for(let D=0;D<h.length;D++)Ft(a,h[D],f,g,S);return null}return f=Ut(f),a&&a[J]?a.J(h,f,c(g)?!!g.capture:!1,S):Dr(a,h,f,!1,g,S)}function Dr(a,h,f,g,S,D){if(!h)throw Error("Invalid event type");const W=c(S)?!!S.capture:!!S;let ye=on(a);if(ye||(a[xr]=ye=new Gt(a)),f=ye.add(h,f,g,W,D),f.proxy)return f;if(g=$e(),f.proxy=g,g.src=a,g.listener=f,a.addEventListener)R||(S=W),S===void 0&&(S=!1),a.addEventListener(h.toString(),g,S);else if(a.attachEvent)a.attachEvent(Nr(h.toString()),g);else if(a.addListener&&a.removeListener)a.addListener(g);else throw Error("addEventListener and attachEvent are unavailable.");return f}function $e(){function a(f){return h.call(a.src,a.listener,f)}const h=Vr;return a}function Et(a,h,f,g,S){if(Array.isArray(h))for(var D=0;D<h.length;D++)Et(a,h[D],f,g,S);else g=c(g)?!!g.capture:!!g,f=Ut(f),a&&a[J]?(a=a.i,D=String(h).toString(),D in a.g&&(h=a.g[D],f=zn(h,f,g,S),f>-1&&(fe(h[f]),Array.prototype.splice.call(h,f,1),h.length==0&&(delete a.g[D],a.h--)))):a&&(a=on(a))&&(h=a.g[h.toString()],a=-1,h&&(a=zn(h,f,g,S)),(f=a>-1?h[a]:null)&&Kn(f))}function Kn(a){if(typeof a!="number"&&a&&!a.da){var h=a.src;if(h&&h[J])Sn(h.i,a);else{var f=a.type,g=a.proxy;h.removeEventListener?h.removeEventListener(f,g,a.capture):h.detachEvent?h.detachEvent(Nr(f),g):h.addListener&&h.removeListener&&h.removeListener(g),(f=on(h))?(Sn(f,a),f.h==0&&(f.src=null,h[xr]=null)):fe(a)}}}function Nr(a){return a in sn?sn[a]:sn[a]="on"+a}function Vr(a,h){if(a.da)a=!0;else{h=new q(h,this);const f=a.listener,g=a.ha||a.src;a.fa&&Kn(a),a=f.call(g,h)}return a}function on(a){return a=a[xr],a instanceof Gt?a:null}var jn="__closure_events_fn_"+(Math.random()*1e9>>>0);function Ut(a){return typeof a=="function"?a:(a[jn]||(a[jn]=function(h){return a.handleEvent(h)}),a[jn])}function ze(){T.call(this),this.i=new Gt(this),this.M=this,this.G=null}p(ze,T),ze.prototype[J]=!0,ze.prototype.removeEventListener=function(a,h,f,g){Et(this,a,h,f,g)};function pt(a,h){var f,g=a.G;if(g)for(f=[];g;g=g.G)f.push(g);if(a=a.M,g=h.type||h,typeof h=="string")h=new I(h,a);else if(h instanceof I)h.target=h.target||a;else{var S=h;h=new I(g,a),It(h,S)}S=!0;let D,W;if(f)for(W=f.length-1;W>=0;W--)D=h.g=f[W],S=Ti(D,g,!0,h)&&S;if(D=h.g=a,S=Ti(D,g,!0,h)&&S,S=Ti(D,g,!1,h)&&S,f)for(W=0;W<f.length;W++)D=h.g=f[W],S=Ti(D,g,!1,h)&&S}ze.prototype.N=function(){if(ze.Z.N.call(this),this.i){var a=this.i;for(const h in a.g){const f=a.g[h];for(let g=0;g<f.length;g++)fe(f[g]);delete a.g[h],a.h--}}this.G=null},ze.prototype.J=function(a,h,f,g){return this.i.add(String(a),h,!1,f,g)},ze.prototype.K=function(a,h,f,g){return this.i.add(String(a),h,!0,f,g)};function Ti(a,h,f,g){if(h=a.i.g[String(h)],!h)return!0;h=h.concat();let S=!0;for(let D=0;D<h.length;++D){const W=h[D];if(W&&!W.da&&W.capture==f){const ye=W.listener,st=W.ha||W.src;W.fa&&Sn(a.i,W),S=ye.call(st,g)!==!1&&S}}return S&&!g.defaultPrevented}function al(a,h){if(typeof a!="function")if(a&&typeof a.handleEvent=="function")a=u(a.handleEvent,a);else throw Error("Invalid listener argument");return Number(h)>2147483647?-1:o.setTimeout(a,h||0)}function pa(a){a.g=al(()=>{a.g=null,a.i&&(a.i=!1,pa(a))},a.l);const h=a.h;a.h=null,a.m.apply(null,h)}class cl extends T{constructor(h,f){super(),this.m=h,this.l=f,this.h=null,this.i=!1,this.g=null}j(h){this.h=arguments,this.g?this.i=!0:pa(this)}N(){super.N(),this.g&&(o.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Or(a){T.call(this),this.h=a,this.g={}}p(Or,T);var ma=[];function ga(a){ue(a.g,function(h,f){this.g.hasOwnProperty(f)&&Kn(h)},a),a.g={}}Or.prototype.N=function(){Or.Z.N.call(this),ga(this)},Or.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Gn=o.JSON.stringify,ll=o.JSON.parse,ul=class{stringify(a){return o.JSON.stringify(a,void 0)}parse(a){return o.JSON.parse(a,void 0)}};function ya(){}function bi(){}var Mr={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function Ps(){I.call(this,"d")}p(Ps,I);function k(){I.call(this,"c")}p(k,I);var A={},O=null;function L(){return O=O||new ze}A.Ia="serverreachability";function V(a){I.call(this,A.Ia,a)}p(V,I);function x(a){const h=L();pt(h,new V(h))}A.STAT_EVENT="statevent";function C(a,h){I.call(this,A.STAT_EVENT,a),this.stat=h}p(C,I);function N(a){const h=L();pt(h,new C(h,a))}A.Ja="timingevent";function ne(a,h){I.call(this,A.Ja,a),this.size=h}p(ne,I);function Q(a,h){if(typeof a!="function")throw Error("Fn must not be null and must be a function");return o.setTimeout(function(){a()},h)}function j(){this.g=!0}j.prototype.ua=function(){this.g=!1};function ae(a,h,f,g,S,D){a.info(function(){if(a.g)if(D){var W="",ye=D.split("&");for(let ke=0;ke<ye.length;ke++){var st=ye[ke].split("=");if(st.length>1){const lt=st[0];st=st[1];const cn=lt.split("_");W=cn.length>=2&&cn[1]=="type"?W+(lt+"="+st+"&"):W+(lt+"=redacted&")}}}else W=null;else W=D;return"XMLHTTP REQ ("+g+") [attempt "+S+"]: "+h+`
`+f+`
`+W})}function se(a,h,f,g,S,D,W){a.info(function(){return"XMLHTTP RESP ("+g+") [ attempt "+S+"]: "+h+`
`+f+`
`+D+" "+W})}function oe(a,h,f,g){a.info(function(){return"XMLHTTP TEXT ("+h+"): "+ce(a,f)+(g?" "+g:"")})}function he(a,h){a.info(function(){return"TIMEOUT: "+h})}j.prototype.info=function(){};function ce(a,h){if(!a.g)return h;if(!h)return null;try{const D=JSON.parse(h);if(D){for(a=0;a<D.length;a++)if(Array.isArray(D[a])){var f=D[a];if(!(f.length<2)){var g=f[1];if(Array.isArray(g)&&!(g.length<1)){var S=g[0];if(S!="noop"&&S!="stop"&&S!="close")for(let W=1;W<g.length;W++)g[W]=""}}}}return Gn(D)}catch{return h}}var Ee={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},De={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},ct;function Ce(){}p(Ce,ya),Ce.prototype.g=function(){return new XMLHttpRequest},ct=new Ce;function Je(a){return encodeURIComponent(String(a))}function Rt(a){var h=1;a=a.split(":");const f=[];for(;h>0&&a.length;)f.push(a.shift()),h--;return a.length&&f.push(a.join(":")),f}function Xe(a,h,f,g){this.j=a,this.i=h,this.l=f,this.S=g||1,this.V=new Or(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Rn}function Rn(){this.i=null,this.g="",this.h=!1}var Cs={},Pn={};function ks(a,h,f){a.M=1,a.A=wa(an(h)),a.u=f,a.R=!0,xs(a,null)}function xs(a,h){a.F=Date.now(),_a(a),a.B=an(a.A);var f=a.B,g=a.S;Array.isArray(g)||(g=[String(g)]),Nd(f.i,"t",g),a.C=0,f=a.j.L,a.h=new Rn,a.g=Jd(a.j,f?h:null,!a.u),a.P>0&&(a.O=new cl(u(a.Y,a,a.g),a.P)),h=a.V,f=a.g,g=a.ba;var S="readystatechange";Array.isArray(S)||(S&&(ma[0]=S.toString()),S=ma);for(let D=0;D<S.length;D++){const W=Ft(f,S[D],g||h.handleEvent,!1,h.h||h);if(!W)break;h.g[W.key]=W}h=a.J?Oe(a.J):{},a.u?(a.v||(a.v="POST"),h["Content-Type"]="application/x-www-form-urlencoded",a.g.ea(a.B,a.v,a.u,h)):(a.v="GET",a.g.ea(a.B,a.v,null,h)),x(),ae(a.i,a.v,a.B,a.l,a.S,a.u)}Xe.prototype.ba=function(a){a=a.target;const h=this.O;h&&Qn(a)==3?h.j():this.Y(a)},Xe.prototype.Y=function(a){try{if(a==this.g)e:{const ye=Qn(this.g),st=this.g.ya(),ke=this.g.ca();if(!(ye<3)&&(ye!=3||this.g&&(this.h.h||this.g.la()||Bd(this.g)))){this.K||ye!=4||st==7||(st==8||ke<=0?x(3):x(2)),dl(this);var h=this.g.ca();this.X=h;var f=hl(this);if(this.o=h==200,se(this.i,this.v,this.B,this.l,this.S,ye,h),this.o){if(this.U&&!this.L){t:{if(this.g){var g,S=this.g;if((g=S.g?S.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!_(g)){var D=g;break t}}D=null}if(a=D)oe(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,fl(this,a);else{this.o=!1,this.m=3,N(12),Lr(this),Ds(this);break e}}if(this.R){a=!0;let lt;for(;!this.K&&this.C<f.length;)if(lt=kw(this,f),lt==Pn){ye==4&&(this.m=4,N(14),a=!1),oe(this.i,this.l,null,"[Incomplete Response]");break}else if(lt==Cs){this.m=4,N(15),oe(this.i,this.l,f,"[Invalid Chunk]"),a=!1;break}else oe(this.i,this.l,lt,null),fl(this,lt);if(Ed(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),ye!=4||f.length!=0||this.h.h||(this.m=1,N(16),a=!1),this.o=this.o&&a,!a)oe(this.i,this.l,f,"[Invalid Chunked Response]"),Lr(this),Ds(this);else if(f.length>0&&!this.W){this.W=!0;var W=this.j;W.g==this&&W.aa&&!W.P&&(W.j.info("Great, no buffering proxy detected. Bytes received: "+f.length),El(W),W.P=!0,N(11))}}else oe(this.i,this.l,f,null),fl(this,f);ye==4&&Lr(this),this.o&&!this.K&&(ye==4?Wd(this.j,this):(this.o=!1,_a(this)))}else Kw(this.g),h==400&&f.indexOf("Unknown SID")>0?(this.m=3,N(12)):(this.m=0,N(13)),Lr(this),Ds(this)}}}catch{}finally{}};function hl(a){if(!Ed(a))return a.g.la();const h=Bd(a.g);if(h==="")return"";let f="";const g=h.length,S=Qn(a.g)==4;if(!a.h.i){if(typeof TextDecoder>"u")return Lr(a),Ds(a),"";a.h.i=new o.TextDecoder}for(let D=0;D<g;D++)a.h.h=!0,f+=a.h.i.decode(h[D],{stream:!(S&&D==g-1)});return h.length=0,a.h.g+=f,a.C=0,a.h.g}function Ed(a){return a.g?a.v=="GET"&&a.M!=2&&a.j.Aa:!1}function kw(a,h){var f=a.C,g=h.indexOf(`
`,f);return g==-1?Pn:(f=Number(h.substring(f,g)),isNaN(f)?Cs:(g+=1,g+f>h.length?Pn:(h=h.slice(g,g+f),a.C=g+f,h)))}Xe.prototype.cancel=function(){this.K=!0,Lr(this)};function _a(a){a.T=Date.now()+a.H,vd(a,a.H)}function vd(a,h){if(a.D!=null)throw Error("WatchDog timer not null");a.D=Q(u(a.aa,a),h)}function dl(a){a.D&&(o.clearTimeout(a.D),a.D=null)}Xe.prototype.aa=function(){this.D=null;const a=Date.now();a-this.T>=0?(he(this.i,this.B),this.M!=2&&(x(),N(17)),Lr(this),this.m=2,Ds(this)):vd(this,this.T-a)};function Ds(a){a.j.I==0||a.K||Wd(a.j,a)}function Lr(a){dl(a);var h=a.O;h&&typeof h.dispose=="function"&&h.dispose(),a.O=null,ga(a.V),a.g&&(h=a.g,a.g=null,h.abort(),h.dispose())}function fl(a,h){try{var f=a.j;if(f.I!=0&&(f.g==a||pl(f.h,a))){if(!a.L&&pl(f.h,a)&&f.I==3){try{var g=f.Ba.g.parse(h)}catch{g=null}if(Array.isArray(g)&&g.length==3){var S=g;if(S[0]==0){e:if(!f.v){if(f.g)if(f.g.F+3e3<a.F)ba(f),va(f);else break e;Il(f),N(18)}}else f.xa=S[1],0<f.xa-f.K&&S[2]<37500&&f.F&&f.A==0&&!f.C&&(f.C=Q(u(f.Va,f),6e3));Ad(f.h)<=1&&f.ta&&(f.ta=void 0)}else Ur(f,11)}else if((a.L||f.g==a)&&ba(f),!_(h))for(S=f.Ba.g.parse(h),h=0;h<S.length;h++){let ke=S[h];const lt=ke[0];if(!(lt<=f.K))if(f.K=lt,ke=ke[1],f.I==2)if(ke[0]=="c"){f.M=ke[1],f.ba=ke[2];const cn=ke[3];cn!=null&&(f.ka=cn,f.j.info("VER="+f.ka));const Br=ke[4];Br!=null&&(f.za=Br,f.j.info("SVER="+f.za));const Yn=ke[5];Yn!=null&&typeof Yn=="number"&&Yn>0&&(g=1.5*Yn,f.O=g,f.j.info("backChannelRequestTimeoutMs_="+g)),g=f;const Jn=a.g;if(Jn){const Sa=Jn.g?Jn.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(Sa){var D=g.h;D.g||Sa.indexOf("spdy")==-1&&Sa.indexOf("quic")==-1&&Sa.indexOf("h2")==-1||(D.j=D.l,D.g=new Set,D.h&&(ml(D,D.h),D.h=null))}if(g.G){const vl=Jn.g?Jn.g.getResponseHeader("X-HTTP-Session-Id"):null;vl&&(g.wa=vl,Me(g.J,g.G,vl))}}f.I=3,f.l&&f.l.ra(),f.aa&&(f.T=Date.now()-a.F,f.j.info("Handshake RTT: "+f.T+"ms")),g=f;var W=a;if(g.na=Yd(g,g.L?g.ba:null,g.W),W.L){Sd(g.h,W);var ye=W,st=g.O;st&&(ye.H=st),ye.D&&(dl(ye),_a(ye)),g.g=W}else jd(g);f.i.length>0&&Ta(f)}else ke[0]!="stop"&&ke[0]!="close"||Ur(f,7);else f.I==3&&(ke[0]=="stop"||ke[0]=="close"?ke[0]=="stop"?Ur(f,7):wl(f):ke[0]!="noop"&&f.l&&f.l.qa(ke),f.A=0)}}x(4)}catch{}}var xw=class{constructor(a,h){this.g=a,this.map=h}};function Td(a){this.l=a||10,o.PerformanceNavigationTiming?(a=o.performance.getEntriesByType("navigation"),a=a.length>0&&(a[0].nextHopProtocol=="hq"||a[0].nextHopProtocol=="h2")):a=!!(o.chrome&&o.chrome.loadTimes&&o.chrome.loadTimes()&&o.chrome.loadTimes().wasFetchedViaSpdy),this.j=a?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function bd(a){return a.h?!0:a.g?a.g.size>=a.j:!1}function Ad(a){return a.h?1:a.g?a.g.size:0}function pl(a,h){return a.h?a.h==h:a.g?a.g.has(h):!1}function ml(a,h){a.g?a.g.add(h):a.h=h}function Sd(a,h){a.h&&a.h==h?a.h=null:a.g&&a.g.has(h)&&a.g.delete(h)}Td.prototype.cancel=function(){if(this.i=Rd(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const a of this.g.values())a.cancel();this.g.clear()}};function Rd(a){if(a.h!=null)return a.i.concat(a.h.G);if(a.g!=null&&a.g.size!==0){let h=a.i;for(const f of a.g.values())h=h.concat(f.G);return h}return v(a.i)}var Pd=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Dw(a,h){if(a){a=a.split("&");for(let f=0;f<a.length;f++){const g=a[f].indexOf("=");let S,D=null;g>=0?(S=a[f].substring(0,g),D=a[f].substring(g+1)):S=a[f],h(S,D?decodeURIComponent(D.replace(/\+/g," ")):"")}}}function Wn(a){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let h;a instanceof Wn?(this.l=a.l,Ns(this,a.j),this.o=a.o,this.g=a.g,Vs(this,a.u),this.h=a.h,gl(this,Vd(a.i)),this.m=a.m):a&&(h=String(a).match(Pd))?(this.l=!1,Ns(this,h[1]||"",!0),this.o=Os(h[2]||""),this.g=Os(h[3]||"",!0),Vs(this,h[4]),this.h=Os(h[5]||"",!0),gl(this,h[6]||"",!0),this.m=Os(h[7]||"")):(this.l=!1,this.i=new Ls(null,this.l))}Wn.prototype.toString=function(){const a=[];var h=this.j;h&&a.push(Ms(h,Cd,!0),":");var f=this.g;return(f||h=="file")&&(a.push("//"),(h=this.o)&&a.push(Ms(h,Cd,!0),"@"),a.push(Je(f).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),f=this.u,f!=null&&a.push(":",String(f))),(f=this.h)&&(this.g&&f.charAt(0)!="/"&&a.push("/"),a.push(Ms(f,f.charAt(0)=="/"?Ow:Vw,!0))),(f=this.i.toString())&&a.push("?",f),(f=this.m)&&a.push("#",Ms(f,Lw)),a.join("")},Wn.prototype.resolve=function(a){const h=an(this);let f=!!a.j;f?Ns(h,a.j):f=!!a.o,f?h.o=a.o:f=!!a.g,f?h.g=a.g:f=a.u!=null;var g=a.h;if(f)Vs(h,a.u);else if(f=!!a.h){if(g.charAt(0)!="/")if(this.g&&!this.h)g="/"+g;else{var S=h.h.lastIndexOf("/");S!=-1&&(g=h.h.slice(0,S+1)+g)}if(S=g,S==".."||S==".")g="";else if(S.indexOf("./")!=-1||S.indexOf("/.")!=-1){g=S.lastIndexOf("/",0)==0,S=S.split("/");const D=[];for(let W=0;W<S.length;){const ye=S[W++];ye=="."?g&&W==S.length&&D.push(""):ye==".."?((D.length>1||D.length==1&&D[0]!="")&&D.pop(),g&&W==S.length&&D.push("")):(D.push(ye),g=!0)}g=D.join("/")}else g=S}return f?h.h=g:f=a.i.toString()!=="",f?gl(h,Vd(a.i)):f=!!a.m,f&&(h.m=a.m),h};function an(a){return new Wn(a)}function Ns(a,h,f){a.j=f?Os(h,!0):h,a.j&&(a.j=a.j.replace(/:$/,""))}function Vs(a,h){if(h){if(h=Number(h),isNaN(h)||h<0)throw Error("Bad port number "+h);a.u=h}else a.u=null}function gl(a,h,f){h instanceof Ls?(a.i=h,Fw(a.i,a.l)):(f||(h=Ms(h,Mw)),a.i=new Ls(h,a.l))}function Me(a,h,f){a.i.set(h,f)}function wa(a){return Me(a,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),a}function Os(a,h){return a?h?decodeURI(a.replace(/%25/g,"%2525")):decodeURIComponent(a):""}function Ms(a,h,f){return typeof a=="string"?(a=encodeURI(a).replace(h,Nw),f&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Nw(a){return a=a.charCodeAt(0),"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Cd=/[#\/\?@]/g,Vw=/[#\?:]/g,Ow=/[#\?]/g,Mw=/[#\?@]/g,Lw=/#/g;function Ls(a,h){this.h=this.g=null,this.i=a||null,this.j=!!h}function Fr(a){a.g||(a.g=new Map,a.h=0,a.i&&Dw(a.i,function(h,f){a.add(decodeURIComponent(h.replace(/\+/g," ")),f)}))}r=Ls.prototype,r.add=function(a,h){Fr(this),this.i=null,a=Ai(this,a);let f=this.g.get(a);return f||this.g.set(a,f=[]),f.push(h),this.h+=1,this};function kd(a,h){Fr(a),h=Ai(a,h),a.g.has(h)&&(a.i=null,a.h-=a.g.get(h).length,a.g.delete(h))}function xd(a,h){return Fr(a),h=Ai(a,h),a.g.has(h)}r.forEach=function(a,h){Fr(this),this.g.forEach(function(f,g){f.forEach(function(S){a.call(h,S,g,this)},this)},this)};function Dd(a,h){Fr(a);let f=[];if(typeof h=="string")xd(a,h)&&(f=f.concat(a.g.get(Ai(a,h))));else for(a=Array.from(a.g.values()),h=0;h<a.length;h++)f=f.concat(a[h]);return f}r.set=function(a,h){return Fr(this),this.i=null,a=Ai(this,a),xd(this,a)&&(this.h-=this.g.get(a).length),this.g.set(a,[h]),this.h+=1,this},r.get=function(a,h){return a?(a=Dd(this,a),a.length>0?String(a[0]):h):h};function Nd(a,h,f){kd(a,h),f.length>0&&(a.i=null,a.g.set(Ai(a,h),v(f)),a.h+=f.length)}r.toString=function(){if(this.i)return this.i;if(!this.g)return"";const a=[],h=Array.from(this.g.keys());for(let g=0;g<h.length;g++){var f=h[g];const S=Je(f);f=Dd(this,f);for(let D=0;D<f.length;D++){let W=S;f[D]!==""&&(W+="="+Je(f[D])),a.push(W)}}return this.i=a.join("&")};function Vd(a){const h=new Ls;return h.i=a.i,a.g&&(h.g=new Map(a.g),h.h=a.h),h}function Ai(a,h){return h=String(h),a.j&&(h=h.toLowerCase()),h}function Fw(a,h){h&&!a.j&&(Fr(a),a.i=null,a.g.forEach(function(f,g){const S=g.toLowerCase();g!=S&&(kd(this,g),Nd(this,S,f))},a)),a.j=h}function Uw(a,h){const f=new j;if(o.Image){const g=new Image;g.onload=d(Hn,f,"TestLoadImage: loaded",!0,h,g),g.onerror=d(Hn,f,"TestLoadImage: error",!1,h,g),g.onabort=d(Hn,f,"TestLoadImage: abort",!1,h,g),g.ontimeout=d(Hn,f,"TestLoadImage: timeout",!1,h,g),o.setTimeout(function(){g.ontimeout&&g.ontimeout()},1e4),g.src=a}else h(!1)}function Bw(a,h){const f=new j,g=new AbortController,S=setTimeout(()=>{g.abort(),Hn(f,"TestPingServer: timeout",!1,h)},1e4);fetch(a,{signal:g.signal}).then(D=>{clearTimeout(S),D.ok?Hn(f,"TestPingServer: ok",!0,h):Hn(f,"TestPingServer: server error",!1,h)}).catch(()=>{clearTimeout(S),Hn(f,"TestPingServer: error",!1,h)})}function Hn(a,h,f,g,S){try{S&&(S.onload=null,S.onerror=null,S.onabort=null,S.ontimeout=null),g(f)}catch{}}function qw(){this.g=new ul}function yl(a){this.i=a.Sb||null,this.h=a.ab||!1}p(yl,ya),yl.prototype.g=function(){return new Ia(this.i,this.h)};function Ia(a,h){ze.call(this),this.H=a,this.o=h,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(Ia,ze),r=Ia.prototype,r.open=function(a,h){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=a,this.D=h,this.readyState=1,Us(this)},r.send=function(a){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const h={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};a&&(h.body=a),(this.H||o).fetch(new Request(this.D,h)).then(this.Pa.bind(this),this.ga.bind(this))},r.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Fs(this)),this.readyState=0},r.Pa=function(a){if(this.g&&(this.l=a,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=a.headers,this.readyState=2,Us(this)),this.g&&(this.readyState=3,Us(this),this.g)))if(this.responseType==="arraybuffer")a.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof o.ReadableStream<"u"&&"body"in a){if(this.j=a.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Od(this)}else a.text().then(this.Oa.bind(this),this.ga.bind(this))};function Od(a){a.j.read().then(a.Ma.bind(a)).catch(a.ga.bind(a))}r.Ma=function(a){if(this.g){if(this.o&&a.value)this.response.push(a.value);else if(!this.o){var h=a.value?a.value:new Uint8Array(0);(h=this.B.decode(h,{stream:!a.done}))&&(this.response=this.responseText+=h)}a.done?Fs(this):Us(this),this.readyState==3&&Od(this)}},r.Oa=function(a){this.g&&(this.response=this.responseText=a,Fs(this))},r.Na=function(a){this.g&&(this.response=a,Fs(this))},r.ga=function(){this.g&&Fs(this)};function Fs(a){a.readyState=4,a.l=null,a.j=null,a.B=null,Us(a)}r.setRequestHeader=function(a,h){this.A.append(a,h)},r.getResponseHeader=function(a){return this.h&&this.h.get(a.toLowerCase())||""},r.getAllResponseHeaders=function(){if(!this.h)return"";const a=[],h=this.h.entries();for(var f=h.next();!f.done;)f=f.value,a.push(f[0]+": "+f[1]),f=h.next();return a.join(`\r
`)};function Us(a){a.onreadystatechange&&a.onreadystatechange.call(a)}Object.defineProperty(Ia.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(a){this.m=a?"include":"same-origin"}});function Md(a){let h="";return ue(a,function(f,g){h+=g,h+=":",h+=f,h+=`\r
`}),h}function _l(a,h,f){e:{for(g in f){var g=!1;break e}g=!0}g||(f=Md(f),typeof a=="string"?f!=null&&Je(f):Me(a,h,f))}function Ge(a){ze.call(this),this.headers=new Map,this.L=a||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(Ge,ze);var $w=/^https?$/i,zw=["POST","PUT"];r=Ge.prototype,r.Fa=function(a){this.H=a},r.ea=function(a,h,f,g){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+a);h=h?h.toUpperCase():"GET",this.D=a,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():ct.g(),this.g.onreadystatechange=m(u(this.Ca,this));try{this.B=!0,this.g.open(h,String(a),!0),this.B=!1}catch(D){Ld(this,D);return}if(a=f||"",f=new Map(this.headers),g)if(Object.getPrototypeOf(g)===Object.prototype)for(var S in g)f.set(S,g[S]);else if(typeof g.keys=="function"&&typeof g.get=="function")for(const D of g.keys())f.set(D,g.get(D));else throw Error("Unknown input type for opt_headers: "+String(g));g=Array.from(f.keys()).find(D=>D.toLowerCase()=="content-type"),S=o.FormData&&a instanceof o.FormData,!(Array.prototype.indexOf.call(zw,h,void 0)>=0)||g||S||f.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[D,W]of f)this.g.setRequestHeader(D,W);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(a),this.v=!1}catch(D){Ld(this,D)}};function Ld(a,h){a.h=!1,a.g&&(a.j=!0,a.g.abort(),a.j=!1),a.l=h,a.o=5,Fd(a),Ea(a)}function Fd(a){a.A||(a.A=!0,pt(a,"complete"),pt(a,"error"))}r.abort=function(a){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=a||7,pt(this,"complete"),pt(this,"abort"),Ea(this))},r.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Ea(this,!0)),Ge.Z.N.call(this)},r.Ca=function(){this.u||(this.B||this.v||this.j?Ud(this):this.Xa())},r.Xa=function(){Ud(this)};function Ud(a){if(a.h&&typeof s<"u"){if(a.v&&Qn(a)==4)setTimeout(a.Ca.bind(a),0);else if(pt(a,"readystatechange"),Qn(a)==4){a.h=!1;try{const D=a.ca();e:switch(D){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var h=!0;break e;default:h=!1}var f;if(!(f=h)){var g;if(g=D===0){let W=String(a.D).match(Pd)[1]||null;!W&&o.self&&o.self.location&&(W=o.self.location.protocol.slice(0,-1)),g=!$w.test(W?W.toLowerCase():"")}f=g}if(f)pt(a,"complete"),pt(a,"success");else{a.o=6;try{var S=Qn(a)>2?a.g.statusText:""}catch{S=""}a.l=S+" ["+a.ca()+"]",Fd(a)}}finally{Ea(a)}}}}function Ea(a,h){if(a.g){a.m&&(clearTimeout(a.m),a.m=null);const f=a.g;a.g=null,h||pt(a,"ready");try{f.onreadystatechange=null}catch{}}}r.isActive=function(){return!!this.g};function Qn(a){return a.g?a.g.readyState:0}r.ca=function(){try{return Qn(this)>2?this.g.status:-1}catch{return-1}},r.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},r.La=function(a){if(this.g){var h=this.g.responseText;return a&&h.indexOf(a)==0&&(h=h.substring(a.length)),ll(h)}};function Bd(a){try{if(!a.g)return null;if("response"in a.g)return a.g.response;switch(a.F){case"":case"text":return a.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in a.g)return a.g.mozResponseArrayBuffer}return null}catch{return null}}function Kw(a){const h={};a=(a.g&&Qn(a)>=2&&a.g.getAllResponseHeaders()||"").split(`\r
`);for(let g=0;g<a.length;g++){if(_(a[g]))continue;var f=Rt(a[g]);const S=f[0];if(f=f[1],typeof f!="string")continue;f=f.trim();const D=h[S]||[];h[S]=D,D.push(f)}pe(h,function(g){return g.join(", ")})}r.ya=function(){return this.o},r.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Bs(a,h,f){return f&&f.internalChannelParams&&f.internalChannelParams[a]||h}function qd(a){this.za=0,this.i=[],this.j=new j,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Bs("failFast",!1,a),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Bs("baseRetryDelayMs",5e3,a),this.Za=Bs("retryDelaySeedMs",1e4,a),this.Ta=Bs("forwardChannelMaxRetries",2,a),this.va=Bs("forwardChannelRequestTimeoutMs",2e4,a),this.ma=a&&a.xmlHttpFactory||void 0,this.Ua=a&&a.Rb||void 0,this.Aa=a&&a.useFetchStreams||!1,this.O=void 0,this.L=a&&a.supportsCrossDomainXhr||!1,this.M="",this.h=new Td(a&&a.concurrentRequestLimit),this.Ba=new qw,this.S=a&&a.fastHandshake||!1,this.R=a&&a.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=a&&a.Pb||!1,a&&a.ua&&this.j.ua(),a&&a.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&a&&a.detectBufferingProxy||!1,this.ia=void 0,a&&a.longPollingTimeout&&a.longPollingTimeout>0&&(this.ia=a.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}r=qd.prototype,r.ka=8,r.I=1,r.connect=function(a,h,f,g){N(0),this.W=a,this.H=h||{},f&&g!==void 0&&(this.H.OSID=f,this.H.OAID=g),this.F=this.X,this.J=Yd(this,null,this.W),Ta(this)};function wl(a){if($d(a),a.I==3){var h=a.V++,f=an(a.J);if(Me(f,"SID",a.M),Me(f,"RID",h),Me(f,"TYPE","terminate"),qs(a,f),h=new Xe(a,a.j,h),h.M=2,h.A=wa(an(f)),f=!1,o.navigator&&o.navigator.sendBeacon)try{f=o.navigator.sendBeacon(h.A.toString(),"")}catch{}!f&&o.Image&&(new Image().src=h.A,f=!0),f||(h.g=Jd(h.j,null),h.g.ea(h.A)),h.F=Date.now(),_a(h)}Qd(a)}function va(a){a.g&&(El(a),a.g.cancel(),a.g=null)}function $d(a){va(a),a.v&&(o.clearTimeout(a.v),a.v=null),ba(a),a.h.cancel(),a.m&&(typeof a.m=="number"&&o.clearTimeout(a.m),a.m=null)}function Ta(a){if(!bd(a.h)&&!a.m){a.m=!0;var h=a.Ea;Te||y(),de||(Te(),de=!0),E.add(h,a),a.D=0}}function jw(a,h){return Ad(a.h)>=a.h.j-(a.m?1:0)?!1:a.m?(a.i=h.G.concat(a.i),!0):a.I==1||a.I==2||a.D>=(a.Sa?0:a.Ta)?!1:(a.m=Q(u(a.Ea,a,h),Hd(a,a.D)),a.D++,!0)}r.Ea=function(a){if(this.m)if(this.m=null,this.I==1){if(!a){this.V=Math.floor(Math.random()*1e5),a=this.V++;const S=new Xe(this,this.j,a);let D=this.o;if(this.U&&(D?(D=Oe(D),It(D,this.U)):D=this.U),this.u!==null||this.R||(S.J=D,D=null),this.S)e:{for(var h=0,f=0;f<this.i.length;f++){t:{var g=this.i[f];if("__data__"in g.map&&(g=g.map.__data__,typeof g=="string")){g=g.length;break t}g=void 0}if(g===void 0)break;if(h+=g,h>4096){h=f;break e}if(h===4096||f===this.i.length-1){h=f+1;break e}}h=1e3}else h=1e3;h=Kd(this,S,h),f=an(this.J),Me(f,"RID",a),Me(f,"CVER",22),this.G&&Me(f,"X-HTTP-Session-Id",this.G),qs(this,f),D&&(this.R?h="headers="+Je(Md(D))+"&"+h:this.u&&_l(f,this.u,D)),ml(this.h,S),this.Ra&&Me(f,"TYPE","init"),this.S?(Me(f,"$req",h),Me(f,"SID","null"),S.U=!0,ks(S,f,null)):ks(S,f,h),this.I=2}}else this.I==3&&(a?zd(this,a):this.i.length==0||bd(this.h)||zd(this))};function zd(a,h){var f;h?f=h.l:f=a.V++;const g=an(a.J);Me(g,"SID",a.M),Me(g,"RID",f),Me(g,"AID",a.K),qs(a,g),a.u&&a.o&&_l(g,a.u,a.o),f=new Xe(a,a.j,f,a.D+1),a.u===null&&(f.J=a.o),h&&(a.i=h.G.concat(a.i)),h=Kd(a,f,1e3),f.H=Math.round(a.va*.5)+Math.round(a.va*.5*Math.random()),ml(a.h,f),ks(f,g,h)}function qs(a,h){a.H&&ue(a.H,function(f,g){Me(h,g,f)}),a.l&&ue({},function(f,g){Me(h,g,f)})}function Kd(a,h,f){f=Math.min(a.i.length,f);const g=a.l?u(a.l.Ka,a.l,a):null;e:{var S=a.i;let ye=-1;for(;;){const st=["count="+f];ye==-1?f>0?(ye=S[0].g,st.push("ofs="+ye)):ye=0:st.push("ofs="+ye);let ke=!0;for(let lt=0;lt<f;lt++){var D=S[lt].g;const cn=S[lt].map;if(D-=ye,D<0)ye=Math.max(0,S[lt].g-100),ke=!1;else try{D="req"+D+"_"||"";try{var W=cn instanceof Map?cn:Object.entries(cn);for(const[Br,Yn]of W){let Jn=Yn;c(Yn)&&(Jn=Gn(Yn)),st.push(D+Br+"="+encodeURIComponent(Jn))}}catch(Br){throw st.push(D+"type="+encodeURIComponent("_badmap")),Br}}catch{g&&g(cn)}}if(ke){W=st.join("&");break e}}W=void 0}return a=a.i.splice(0,f),h.G=a,W}function jd(a){if(!a.g&&!a.v){a.Y=1;var h=a.Da;Te||y(),de||(Te(),de=!0),E.add(h,a),a.A=0}}function Il(a){return a.g||a.v||a.A>=3?!1:(a.Y++,a.v=Q(u(a.Da,a),Hd(a,a.A)),a.A++,!0)}r.Da=function(){if(this.v=null,Gd(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var a=4*this.T;this.j.info("BP detection timer enabled: "+a),this.B=Q(u(this.Wa,this),a)}},r.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,N(10),va(this),Gd(this))};function El(a){a.B!=null&&(o.clearTimeout(a.B),a.B=null)}function Gd(a){a.g=new Xe(a,a.j,"rpc",a.Y),a.u===null&&(a.g.J=a.o),a.g.P=0;var h=an(a.na);Me(h,"RID","rpc"),Me(h,"SID",a.M),Me(h,"AID",a.K),Me(h,"CI",a.F?"0":"1"),!a.F&&a.ia&&Me(h,"TO",a.ia),Me(h,"TYPE","xmlhttp"),qs(a,h),a.u&&a.o&&_l(h,a.u,a.o),a.O&&(a.g.H=a.O);var f=a.g;a=a.ba,f.M=1,f.A=wa(an(h)),f.u=null,f.R=!0,xs(f,a)}r.Va=function(){this.C!=null&&(this.C=null,va(this),Il(this),N(19))};function ba(a){a.C!=null&&(o.clearTimeout(a.C),a.C=null)}function Wd(a,h){var f=null;if(a.g==h){ba(a),El(a),a.g=null;var g=2}else if(pl(a.h,h))f=h.G,Sd(a.h,h),g=1;else return;if(a.I!=0){if(h.o)if(g==1){f=h.u?h.u.length:0,h=Date.now()-h.F;var S=a.D;g=L(),pt(g,new ne(g,f)),Ta(a)}else jd(a);else if(S=h.m,S==3||S==0&&h.X>0||!(g==1&&jw(a,h)||g==2&&Il(a)))switch(f&&f.length>0&&(h=a.h,h.i=h.i.concat(f)),S){case 1:Ur(a,5);break;case 4:Ur(a,10);break;case 3:Ur(a,6);break;default:Ur(a,2)}}}function Hd(a,h){let f=a.Qa+Math.floor(Math.random()*a.Za);return a.isActive()||(f*=2),f*h}function Ur(a,h){if(a.j.info("Error code "+h),h==2){var f=u(a.bb,a),g=a.Ua;const S=!g;g=new Wn(g||"//www.google.com/images/cleardot.gif"),o.location&&o.location.protocol=="http"||Ns(g,"https"),wa(g),S?Uw(g.toString(),f):Bw(g.toString(),f)}else N(2);a.I=0,a.l&&a.l.pa(h),Qd(a),$d(a)}r.bb=function(a){a?(this.j.info("Successfully pinged google.com"),N(2)):(this.j.info("Failed to ping google.com"),N(1))};function Qd(a){if(a.I=0,a.ja=[],a.l){const h=Rd(a.h);(h.length!=0||a.i.length!=0)&&(M(a.ja,h),M(a.ja,a.i),a.h.i.length=0,v(a.i),a.i.length=0),a.l.oa()}}function Yd(a,h,f){var g=f instanceof Wn?an(f):new Wn(f);if(g.g!="")h&&(g.g=h+"."+g.g),Vs(g,g.u);else{var S=o.location;g=S.protocol,h=h?h+"."+S.hostname:S.hostname,S=+S.port;const D=new Wn(null);g&&Ns(D,g),h&&(D.g=h),S&&Vs(D,S),f&&(D.h=f),g=D}return f=a.G,h=a.wa,f&&h&&Me(g,f,h),Me(g,"VER",a.ka),qs(a,g),g}function Jd(a,h,f){if(h&&!a.L)throw Error("Can't create secondary domain capable XhrIo object.");return h=a.Aa&&!a.ma?new Ge(new yl({ab:f})):new Ge(a.ma),h.Fa(a.L),h}r.isActive=function(){return!!this.l&&this.l.isActive(this)};function Xd(){}r=Xd.prototype,r.ra=function(){},r.qa=function(){},r.pa=function(){},r.oa=function(){},r.isActive=function(){return!0},r.Ka=function(){};function Aa(){}Aa.prototype.g=function(a,h){return new Bt(a,h)};function Bt(a,h){ze.call(this),this.g=new qd(h),this.l=a,this.h=h&&h.messageUrlParams||null,a=h&&h.messageHeaders||null,h&&h.clientProtocolHeaderRequired&&(a?a["X-Client-Protocol"]="webchannel":a={"X-Client-Protocol":"webchannel"}),this.g.o=a,a=h&&h.initMessageHeaders||null,h&&h.messageContentType&&(a?a["X-WebChannel-Content-Type"]=h.messageContentType:a={"X-WebChannel-Content-Type":h.messageContentType}),h&&h.sa&&(a?a["X-WebChannel-Client-Profile"]=h.sa:a={"X-WebChannel-Client-Profile":h.sa}),this.g.U=a,(a=h&&h.Qb)&&!_(a)&&(this.g.u=a),this.A=h&&h.supportsCrossDomainXhr||!1,this.v=h&&h.sendRawJson||!1,(h=h&&h.httpSessionIdParam)&&!_(h)&&(this.g.G=h,a=this.h,a!==null&&h in a&&(a=this.h,h in a&&delete a[h])),this.j=new Si(this)}p(Bt,ze),Bt.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},Bt.prototype.close=function(){wl(this.g)},Bt.prototype.o=function(a){var h=this.g;if(typeof a=="string"){var f={};f.__data__=a,a=f}else this.v&&(f={},f.__data__=Gn(a),a=f);h.i.push(new xw(h.Ya++,a)),h.I==3&&Ta(h)},Bt.prototype.N=function(){this.g.l=null,delete this.j,wl(this.g),delete this.g,Bt.Z.N.call(this)};function Zd(a){Ps.call(this),a.__headers__&&(this.headers=a.__headers__,this.statusCode=a.__status__,delete a.__headers__,delete a.__status__);var h=a.__sm__;if(h){e:{for(const f in h){a=f;break e}a=void 0}(this.i=a)&&(a=this.i,h=h!==null&&a in h?h[a]:void 0),this.data=h}else this.data=a}p(Zd,Ps);function ef(){k.call(this),this.status=1}p(ef,k);function Si(a){this.g=a}p(Si,Xd),Si.prototype.ra=function(){pt(this.g,"a")},Si.prototype.qa=function(a){pt(this.g,new Zd(a))},Si.prototype.pa=function(a){pt(this.g,new ef)},Si.prototype.oa=function(){pt(this.g,"b")},Aa.prototype.createWebChannel=Aa.prototype.g,Bt.prototype.send=Bt.prototype.o,Bt.prototype.open=Bt.prototype.m,Bt.prototype.close=Bt.prototype.close,qg=function(){return new Aa},Bg=function(){return L()},Ug=A,tu={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Ee.NO_ERROR=0,Ee.TIMEOUT=8,Ee.HTTP_ERROR=6,Ua=Ee,De.COMPLETE="complete",Fg=De,bi.EventType=Mr,Mr.OPEN="a",Mr.CLOSE="b",Mr.ERROR="c",Mr.MESSAGE="d",ze.prototype.listen=ze.prototype.J,eo=bi,Ge.prototype.listenOnce=Ge.prototype.K,Ge.prototype.getLastError=Ge.prototype.Ha,Ge.prototype.getLastErrorCode=Ge.prototype.ya,Ge.prototype.getStatus=Ge.prototype.ca,Ge.prototype.getResponseJson=Ge.prototype.La,Ge.prototype.getResponseText=Ge.prototype.la,Ge.prototype.send=Ge.prototype.ea,Ge.prototype.setWithCredentials=Ge.prototype.Fa,Lg=Ge}).apply(typeof Pa<"u"?Pa:typeof self<"u"?self:typeof window<"u"?window:{});const Ff="@firebase/firestore",Uf="4.9.3";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ht{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}ht.UNAUTHENTICATED=new ht(null),ht.GOOGLE_CREDENTIALS=new ht("google-credentials-uid"),ht.FIRST_PARTY=new ht("first-party-uid"),ht.MOCK_USER=new ht("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Is="12.7.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gr=new Tc("@firebase/firestore");function Vi(){return gr.logLevel}function JA(r){gr.setLogLevel(r)}function $(r,...e){if(gr.logLevel<=we.DEBUG){const t=e.map(hh);gr.debug(`Firestore (${Is}): ${r}`,...t)}}function Ze(r,...e){if(gr.logLevel<=we.ERROR){const t=e.map(hh);gr.error(`Firestore (${Is}): ${r}`,...t)}}function bn(r,...e){if(gr.logLevel<=we.WARN){const t=e.map(hh);gr.warn(`Firestore (${Is}): ${r}`,...t)}}function hh(r){if(typeof r=="string")return r;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
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
 */function Y(r,e,t){let n="Unexpected state";typeof e=="string"?n=e:t=e,$g(r,n,t)}function $g(r,e,t){let n=`FIRESTORE (${Is}) INTERNAL ASSERTION FAILED: ${e} (ID: ${r.toString(16)})`;if(t!==void 0)try{n+=" CONTEXT: "+JSON.stringify(t)}catch{n+=" CONTEXT: "+t}throw Ze(n),new Error(n)}function Z(r,e,t,n){let i="Unexpected state";typeof t=="string"?i=t:n=t,r||$g(e,i,n)}function XA(r,e){r||Y(57014,e)}function H(r,e){return r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const P={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class B extends xt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yt{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zg{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class ZA{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(ht.UNAUTHENTICATED))}shutdown(){}}class eS{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class tS{constructor(e){this.t=e,this.currentUser=ht.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){Z(this.o===void 0,42304);let n=this.i;const i=l=>this.i!==n?(n=this.i,t(l)):Promise.resolve();let s=new yt;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new yt,e.enqueueRetryable(()=>i(this.currentUser))};const o=()=>{const l=s;e.enqueueRetryable(async()=>{await l.promise,await i(this.currentUser)})},c=l=>{$("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=l,this.o&&(this.auth.addAuthTokenListener(this.o),o())};this.t.onInit(l=>c(l)),setTimeout(()=>{if(!this.auth){const l=this.t.getImmediate({optional:!0});l?c(l):($("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new yt)}},0),o()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(n=>this.i!==e?($("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):n?(Z(typeof n.accessToken=="string",31837,{l:n}),new zg(n.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return Z(e===null||typeof e=="string",2055,{h:e}),new ht(e)}}class nS{constructor(e,t,n){this.P=e,this.T=t,this.I=n,this.type="FirstParty",this.user=ht.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class rS{constructor(e,t,n){this.P=e,this.T=t,this.I=n}getToken(){return Promise.resolve(new nS(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable(()=>t(ht.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class Bf{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class iS{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Ue(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){Z(this.o===void 0,3512);const n=s=>{s.error!=null&&$("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${s.error.message}`);const o=s.token!==this.m;return this.m=s.token,$("FirebaseAppCheckTokenProvider",`Received ${o?"new":"existing"} token.`),o?t(s.token):Promise.resolve()};this.o=s=>{e.enqueueRetryable(()=>n(s))};const i=s=>{$("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=s,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit(s=>i(s)),setTimeout(()=>{if(!this.appCheck){const s=this.V.getImmediate({optional:!0});s?i(s):$("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){if(this.p)return Promise.resolve(new Bf(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(t=>t?(Z(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new Bf(t.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sS(r){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(r);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let n=0;n<r;n++)t[n]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dh{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let n="";for(;n.length<20;){const i=sS(40);for(let s=0;s<i.length;++s)n.length<20&&i[s]<t&&(n+=e.charAt(i[s]%62))}return n}}function me(r,e){return r<e?-1:r>e?1:0}function nu(r,e){const t=Math.min(r.length,e.length);for(let n=0;n<t;n++){const i=r.charAt(n),s=e.charAt(n);if(i!==s)return Vl(i)===Vl(s)?me(i,s):Vl(i)?1:-1}return me(r.length,e.length)}const oS=55296,aS=57343;function Vl(r){const e=r.charCodeAt(0);return e>=oS&&e<=aS}function Yi(r,e,t){return r.length===e.length&&r.every((n,i)=>t(n,e[i]))}function Kg(r){return r+"\0"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qf="__name__";class un{constructor(e,t,n){t===void 0?t=0:t>e.length&&Y(637,{offset:t,range:e.length}),n===void 0?n=e.length-t:n>e.length-t&&Y(1746,{length:n,range:e.length-t}),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return un.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof un?e.forEach(n=>{t.push(n)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let i=0;i<n;i++){const s=un.compareSegments(e.get(i),t.get(i));if(s!==0)return s}return me(e.length,t.length)}static compareSegments(e,t){const n=un.isNumericId(e),i=un.isNumericId(t);return n&&!i?-1:!n&&i?1:n&&i?un.extractNumericId(e).compare(un.extractNumericId(t)):nu(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return lr.fromString(e.substring(4,e.length-2))}}class Ie extends un{construct(e,t,n){return new Ie(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new B(P.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(i=>i.length>0))}return new Ie(t)}static emptyPath(){return new Ie([])}}const cS=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class Be extends un{construct(e,t,n){return new Be(e,t,n)}static isValidIdentifier(e){return cS.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),Be.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===qf}static keyField(){return new Be([qf])}static fromServerFormat(e){const t=[];let n="",i=0;const s=()=>{if(n.length===0)throw new B(P.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let o=!1;for(;i<e.length;){const c=e[i];if(c==="\\"){if(i+1===e.length)throw new B(P.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const l=e[i+1];if(l!=="\\"&&l!=="."&&l!=="`")throw new B(P.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=l,i+=2}else c==="`"?(o=!o,i++):c!=="."||o?(n+=c,i++):(s(),i++)}if(s(),o)throw new B(P.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new Be(t)}static emptyPath(){return new Be([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */function fh(r,e,t){if(!t)throw new B(P.INVALID_ARGUMENT,`Function ${r}() cannot be called with an empty ${e}.`)}function jg(r,e,t,n){if(e===!0&&n===!0)throw new B(P.INVALID_ARGUMENT,`${r} and ${t} cannot be used together.`)}function $f(r){if(!G.isDocumentKey(r))throw new B(P.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${r} has ${r.length}.`)}function zf(r){if(G.isDocumentKey(r))throw new B(P.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${r} has ${r.length}.`)}function Gg(r){return typeof r=="object"&&r!==null&&(Object.getPrototypeOf(r)===Object.prototype||Object.getPrototypeOf(r)===null)}function Oc(r){if(r===void 0)return"undefined";if(r===null)return"null";if(typeof r=="string")return r.length>20&&(r=`${r.substring(0,20)}...`),JSON.stringify(r);if(typeof r=="number"||typeof r=="boolean")return""+r;if(typeof r=="object"){if(r instanceof Array)return"an array";{const e=function(n){return n.constructor?n.constructor.name:null}(r);return e?`a custom ${e} object`:"an object"}}return typeof r=="function"?"a function":Y(12329,{type:typeof r})}function Ae(r,e){if("_delegate"in r&&(r=r._delegate),!(r instanceof e)){if(e.name===r.constructor.name)throw new B(P.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Oc(r);throw new B(P.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return r}function Wg(r,e){if(e<=0)throw new B(P.INVALID_ARGUMENT,`Function ${r}() requires a positive number, but it was: ${e}.`)}/**
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
 */function it(r,e){const t={typeString:r};return e&&(t.value=e),t}function Zo(r,e){if(!Gg(r))throw new B(P.INVALID_ARGUMENT,"JSON must be an object");let t;for(const n in e)if(e[n]){const i=e[n].typeString,s="value"in e[n]?{value:e[n].value}:void 0;if(!(n in r)){t=`JSON missing required field: '${n}'`;break}const o=r[n];if(i&&typeof o!==i){t=`JSON field '${n}' must be a ${i}.`;break}if(s!==void 0&&o!==s.value){t=`Expected '${n}' field to equal '${s.value}'`;break}}if(t)throw new B(P.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Kf=-62135596800,jf=1e6;class Se{static now(){return Se.fromMillis(Date.now())}static fromDate(e){return Se.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor((e-1e3*t)*jf);return new Se(t,n)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new B(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new B(P.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Kf)throw new B(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(P.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/jf}_compareTo(e){return this.seconds===e.seconds?me(this.nanoseconds,e.nanoseconds):me(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:Se._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Zo(e,Se._jsonSchema))return new Se(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Kf;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}Se._jsonSchemaVersion="firestore/timestamp/1.0",Se._jsonSchema={type:it("string",Se._jsonSchemaVersion),seconds:it("number"),nanoseconds:it("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class te{static fromTimestamp(e){return new te(e)}static min(){return new te(new Se(0,0))}static max(){return new te(new Se(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
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
 */const Ji=-1;class sc{constructor(e,t,n,i){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=i}}function ru(r){return r.fields.find(e=>e.kind===2)}function zr(r){return r.fields.filter(e=>e.kind!==2)}sc.UNKNOWN_ID=-1;class Ba{constructor(e,t){this.fieldPath=e,this.kind=t}}class ko{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new ko(0,jt.min())}}function Hg(r,e){const t=r.toTimestamp().seconds,n=r.toTimestamp().nanoseconds+1,i=te.fromTimestamp(n===1e9?new Se(t+1,0):new Se(t,n));return new jt(i,G.empty(),e)}function Qg(r){return new jt(r.readTime,r.key,Ji)}class jt{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new jt(te.min(),G.empty(),Ji)}static max(){return new jt(te.max(),G.empty(),Ji)}}function ph(r,e){let t=r.readTime.compareTo(e.readTime);return t!==0?t:(t=G.comparator(r.documentKey,e.documentKey),t!==0?t:me(r.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yg="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class Jg{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Sr(r){if(r.code!==P.FAILED_PRECONDITION||r.message!==Yg)throw r;$("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class b{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)},t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&Y(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new b((n,i)=>{this.nextCallback=s=>{this.wrapSuccess(e,s).next(n,i)},this.catchCallback=s=>{this.wrapFailure(t,s).next(n,i)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof b?t:b.resolve(t)}catch(t){return b.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):b.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):b.reject(t)}static resolve(e){return new b((t,n)=>{t(e)})}static reject(e){return new b((t,n)=>{n(e)})}static waitFor(e){return new b((t,n)=>{let i=0,s=0,o=!1;e.forEach(c=>{++i,c.next(()=>{++s,o&&s===i&&t()},l=>n(l))}),o=!0,s===i&&t()})}static or(e){let t=b.resolve(!1);for(const n of e)t=t.next(i=>i?b.resolve(i):n());return t}static forEach(e,t){const n=[];return e.forEach((i,s)=>{n.push(t.call(this,i,s))}),this.waitFor(n)}static mapArray(e,t){return new b((n,i)=>{const s=e.length,o=new Array(s);let c=0;for(let l=0;l<s;l++){const u=l;t(e[u]).next(d=>{o[u]=d,++c,c===s&&n(o)},d=>i(d))}})}static doWhile(e,t){return new b((n,i)=>{const s=()=>{e()===!0?t().next(()=>{s()},i):n()};s()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qt="SimpleDb";class Mc{static open(e,t,n,i){try{return new Mc(t,e.transaction(i,n))}catch(s){throw new ho(t,s)}}constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.S=new yt,this.transaction.oncomplete=()=>{this.S.resolve()},this.transaction.onabort=()=>{t.error?this.S.reject(new ho(e,t.error)):this.S.resolve()},this.transaction.onerror=n=>{const i=mh(n.target.error);this.S.reject(new ho(e,i))}}get D(){return this.S.promise}abort(e){e&&this.S.reject(e),this.aborted||($(qt,"Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}C(){const e=this.transaction;this.aborted||typeof e.commit!="function"||e.commit()}store(e){const t=this.transaction.objectStore(e);return new uS(t)}}class wn{static delete(e){return $(qt,"Removing database:",e),jr(Vu().indexedDB.deleteDatabase(e)).toPromise()}static v(){if(!Eo())return!1;if(wn.F())return!0;const e=Ke(),t=wn.M(e),n=0<t&&t<10,i=Xg(e),s=0<i&&i<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static F(){var e;return typeof process<"u"&&((e=process.__PRIVATE_env)==null?void 0:e.__PRIVATE_USE_MOCK_PERSISTENCE)==="YES"}static O(e,t){return e.store(t)}static M(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}constructor(e,t,n){this.name=e,this.version=t,this.N=n,this.B=null,wn.M(Ke())===12.2&&Ze("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}async L(e){return this.db||($(qt,"Opening database:",this.name),this.db=await new Promise((t,n)=>{const i=indexedDB.open(this.name,this.version);i.onsuccess=s=>{const o=s.target.result;t(o)},i.onblocked=()=>{n(new ho(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},i.onerror=s=>{const o=s.target.error;o.name==="VersionError"?n(new B(P.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):o.name==="InvalidStateError"?n(new B(P.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+o)):n(new ho(e,o))},i.onupgradeneeded=s=>{$(qt,'Database "'+this.name+'" requires upgrade from version:',s.oldVersion);const o=s.target.result;this.N.k(o,i.transaction,s.oldVersion,this.version).next(()=>{$(qt,"Database upgrade to version "+this.version+" complete")})}})),this.q&&(this.db.onversionchange=t=>this.q(t)),this.db}$(e){this.q=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,i){const s=t==="readonly";let o=0;for(;;){++o;try{this.db=await this.L(e);const c=Mc.open(this.db,e,s?"readonly":"readwrite",n),l=i(c).next(u=>(c.C(),u)).catch(u=>(c.abort(u),b.reject(u))).toPromise();return l.catch(()=>{}),await c.D,l}catch(c){const l=c,u=l.name!=="FirebaseError"&&o<3;if($(qt,"Transaction failed with error:",l.message,"Retrying:",u),this.close(),!u)return Promise.reject(l)}}}close(){this.db&&this.db.close(),this.db=void 0}}function Xg(r){const e=r.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}class lS{constructor(e){this.U=e,this.K=!1,this.W=null}get isDone(){return this.K}get G(){return this.W}set cursor(e){this.U=e}done(){this.K=!0}j(e){this.W=e}delete(){return jr(this.U.delete())}}class ho extends B{constructor(e,t){super(P.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function Rr(r){return r.name==="IndexedDbTransactionError"}class uS{constructor(e){this.store=e}put(e,t){let n;return t!==void 0?($(qt,"PUT",this.store.name,e,t),n=this.store.put(t,e)):($(qt,"PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),jr(n)}add(e){return $(qt,"ADD",this.store.name,e,e),jr(this.store.add(e))}get(e){return jr(this.store.get(e)).next(t=>(t===void 0&&(t=null),$(qt,"GET",this.store.name,e,t),t))}delete(e){return $(qt,"DELETE",this.store.name,e),jr(this.store.delete(e))}count(){return $(qt,"COUNT",this.store.name),jr(this.store.count())}J(e,t){const n=this.options(e,t),i=n.index?this.store.index(n.index):this.store;if(typeof i.getAll=="function"){const s=i.getAll(n.range);return new b((o,c)=>{s.onerror=l=>{c(l.target.error)},s.onsuccess=l=>{o(l.target.result)}})}{const s=this.cursor(n),o=[];return this.H(s,(c,l)=>{o.push(l)}).next(()=>o)}}Y(e,t){const n=this.store.getAll(e,t===null?void 0:t);return new b((i,s)=>{n.onerror=o=>{s(o.target.error)},n.onsuccess=o=>{i(o.target.result)}})}Z(e,t){$(qt,"DELETE ALL",this.store.name);const n=this.options(e,t);n.X=!1;const i=this.cursor(n);return this.H(i,(s,o,c)=>c.delete())}ee(e,t){let n;t?n=e:(n={},t=e);const i=this.cursor(n);return this.H(i,t)}te(e){const t=this.cursor({});return new b((n,i)=>{t.onerror=s=>{const o=mh(s.target.error);i(o)},t.onsuccess=s=>{const o=s.target.result;o?e(o.primaryKey,o.value).next(c=>{c?o.continue():n()}):n()}})}H(e,t){const n=[];return new b((i,s)=>{e.onerror=o=>{s(o.target.error)},e.onsuccess=o=>{const c=o.target.result;if(!c)return void i();const l=new lS(c),u=t(c.primaryKey,c.value,l);if(u instanceof b){const d=u.catch(p=>(l.done(),b.reject(p)));n.push(d)}l.isDone?i():l.G===null?c.continue():c.continue(l.G)}}).next(()=>b.waitFor(n))}options(e,t){let n;return e!==void 0&&(typeof e=="string"?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.X?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function jr(r){return new b((e,t)=>{r.onsuccess=n=>{const i=n.target.result;e(i)},r.onerror=n=>{const i=mh(n.target.error);t(i)}})}let Gf=!1;function mh(r){const e=wn.M(Ke());if(e>=12.2&&e<13){const t="An internal error was encountered in the Indexed Database server";if(r.message.indexOf(t)>=0){const n=new B("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return Gf||(Gf=!0,setTimeout(()=>{throw n},0)),n}}return r}const fo="IndexBackfiller";class hS{constructor(e,t){this.asyncQueue=e,this.ne=t,this.task=null}start(){this.re(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return this.task!==null}re(e){$(fo,`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{const t=await this.ne.ie();$(fo,`Documents written: ${t}`)}catch(t){Rr(t)?$(fo,"Ignoring IndexedDB error during index backfill: ",t):await Sr(t)}await this.re(6e4)})}}class dS{constructor(e,t){this.localStore=e,this.persistence=t}async ie(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.se(t,e))}se(e,t){const n=new Set;let i=t,s=!0;return b.doWhile(()=>s===!0&&i>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(o=>{if(o!==null&&!n.has(o))return $(fo,`Processing collection: ${o}`),this.oe(e,o,i).next(c=>{i-=c,n.add(o)});s=!1})).next(()=>t-i)}oe(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(i=>this.localStore.localDocuments.getNextDocuments(e,t,i,n).next(s=>{const o=s.changes;return this.localStore.indexManager.updateIndexEntries(e,o).next(()=>this._e(i,s)).next(c=>($(fo,`Updating offset: ${c}`),this.localStore.indexManager.updateCollectionGroup(e,t,c))).next(()=>o.size)}))}_e(e,t){let n=e;return t.changes.forEach((i,s)=>{const o=Qg(s);ph(o,n)>0&&(n=o)}),new jt(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}/**
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
 */class Ot{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=n=>this.ae(n),this.ue=n=>t.writeSequenceNumber(n))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}Ot.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ur=-1;function ea(r){return r==null}function xo(r){return r===0&&1/r==-1/0}function Zg(r){return typeof r=="number"&&Number.isInteger(r)&&!xo(r)&&r<=Number.MAX_SAFE_INTEGER&&r>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oc="";function At(r){let e="";for(let t=0;t<r.length;t++)e.length>0&&(e=Wf(e)),e=fS(r.get(t),e);return Wf(e)}function fS(r,e){let t=e;const n=r.length;for(let i=0;i<n;i++){const s=r.charAt(i);switch(s){case"\0":t+="";break;case oc:t+="";break;default:t+=s}}return t}function Wf(r){return r+oc+""}function yn(r){const e=r.length;if(Z(e>=2,64408,{path:r}),e===2)return Z(r.charAt(0)===oc&&r.charAt(1)==="",56145,{path:r}),Ie.emptyPath();const t=e-2,n=[];let i="";for(let s=0;s<e;){const o=r.indexOf(oc,s);switch((o<0||o>t)&&Y(50515,{path:r}),r.charAt(o+1)){case"":const c=r.substring(s,o);let l;i.length===0?l=c:(i+=c,l=i,i=""),n.push(l);break;case"":i+=r.substring(s,o),i+="\0";break;case"":i+=r.substring(s,o+1);break;default:Y(61167,{path:r})}s=o+2}return new Ie(n)}/**
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
 */const Kr="remoteDocuments",ta="owner",Pi="owner",Do="mutationQueues",pS="userId",Xt="mutations",Hf="batchId",Jr="userMutationsIndex",Qf=["userId","batchId"];/**
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
 */function qa(r,e){return[r,At(e)]}function ey(r,e,t){return[r,At(e),t]}const mS={},Xi="documentMutations",ac="remoteDocumentsV14",gS=["prefixPath","collectionGroup","readTime","documentId"],$a="documentKeyIndex",yS=["prefixPath","collectionGroup","documentId"],ty="collectionGroupIndex",_S=["collectionGroup","readTime","prefixPath","documentId"],No="remoteDocumentGlobal",iu="remoteDocumentGlobalKey",Zi="targets",ny="queryTargetsIndex",wS=["canonicalId","targetId"],es="targetDocuments",IS=["targetId","path"],gh="documentTargetsIndex",ES=["path","targetId"],cc="targetGlobalKey",ri="targetGlobal",Vo="collectionParents",vS=["collectionId","parent"],ts="clientMetadata",TS="clientId",Lc="bundles",bS="bundleId",Fc="namedQueries",AS="name",yh="indexConfiguration",SS="indexId",su="collectionGroupIndex",RS="collectionGroup",po="indexState",PS=["indexId","uid"],ry="sequenceNumberIndex",CS=["uid","sequenceNumber"],mo="indexEntries",kS=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],iy="documentKeyIndex",xS=["indexId","uid","orderedDocumentKey"],Uc="documentOverlays",DS=["userId","collectionPath","documentId"],ou="collectionPathOverlayIndex",NS=["userId","collectionPath","largestBatchId"],sy="collectionGroupOverlayIndex",VS=["userId","collectionGroup","largestBatchId"],_h="globals",OS="name",oy=[Do,Xt,Xi,Kr,Zi,ta,ri,es,ts,No,Vo,Lc,Fc],MS=[...oy,Uc],ay=[Do,Xt,Xi,ac,Zi,ta,ri,es,ts,No,Vo,Lc,Fc,Uc],cy=ay,wh=[...cy,yh,po,mo],LS=wh,ly=[...wh,_h],FS=ly;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class au extends Jg{constructor(e,t){super(),this.le=e,this.currentSequenceNumber=t}}function at(r,e){const t=H(r);return wn.O(t.le,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yf(r){let e=0;for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e++;return e}function Pr(r,e){for(const t in r)Object.prototype.hasOwnProperty.call(r,t)&&e(t,r[t])}function uy(r){for(const e in r)if(Object.prototype.hasOwnProperty.call(r,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ve{constructor(e,t){this.comparator=e,this.root=t||mt.EMPTY}insert(e,t){return new Ve(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,mt.BLACK,null,null))}remove(e){return new Ve(this.comparator,this.root.remove(e,this.comparator).copy(null,null,mt.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(n===0)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const i=this.comparator(e,n.key);if(i===0)return t+n.left.size;i<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Ca(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Ca(this.root,e,this.comparator,!1)}getReverseIterator(){return new Ca(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Ca(this.root,e,this.comparator,!0)}}class Ca{constructor(e,t,n,i){this.isReverse=i,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&i&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(s===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class mt{constructor(e,t,n,i,s){this.key=e,this.value=t,this.color=n??mt.RED,this.left=i??mt.EMPTY,this.right=s??mt.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,i,s){return new mt(e??this.key,t??this.value,n??this.color,i??this.left,s??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let i=this;const s=n(e,i.key);return i=s<0?i.copy(null,null,null,i.left.insert(e,t,n),null):s===0?i.copy(null,t,null,null,null):i.copy(null,null,null,null,i.right.insert(e,t,n)),i.fixUp()}removeMin(){if(this.left.isEmpty())return mt.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,i=this;if(t(e,i.key)<0)i.left.isEmpty()||i.left.isRed()||i.left.left.isRed()||(i=i.moveRedLeft()),i=i.copy(null,null,null,i.left.remove(e,t),null);else{if(i.left.isRed()&&(i=i.rotateRight()),i.right.isEmpty()||i.right.isRed()||i.right.left.isRed()||(i=i.moveRedRight()),t(e,i.key)===0){if(i.right.isEmpty())return mt.EMPTY;n=i.right.min(),i=i.copy(n.key,n.value,null,null,i.right.removeMin())}i=i.copy(null,null,null,null,i.right.remove(e,t))}return i.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,mt.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,mt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw Y(43730,{key:this.key,value:this.value});if(this.right.isRed())throw Y(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw Y(27949);return e+(this.isRed()?0:1)}}mt.EMPTY=null,mt.RED=!0,mt.BLACK=!1;mt.EMPTY=new class{constructor(){this.size=0}get key(){throw Y(57766)}get value(){throw Y(16141)}get color(){throw Y(16727)}get left(){throw Y(29726)}get right(){throw Y(36894)}copy(e,t,n,i,s){return this}insert(e,t,n){return new mt(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pe{constructor(e){this.comparator=e,this.data=new Ve(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const i=n.getNext();if(this.comparator(i.key,e[1])>=0)return;t(i.key)}}forEachWhile(e,t){let n;for(n=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new Jf(this.data.getIterator())}getIteratorFrom(e){return new Jf(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(n=>{t=t.add(n)}),t}isEqual(e){if(!(e instanceof Pe)||this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(this.comparator(i,s)!==0)return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new Pe(this.comparator);return t.data=e,t}}class Jf{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function Ci(r){return r.hasNext()?r.getNext():void 0}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mt{constructor(e){this.fields=e,e.sort(Be.comparator)}static empty(){return new Mt([])}unionWith(e){let t=new Pe(Be.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new Mt(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Yi(this.fields,e.fields,(t,n)=>t.isEqual(n))}}/**
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
 */function US(){return typeof atob<"u"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class He{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(i){try{return atob(i)}catch(s){throw typeof DOMException<"u"&&s instanceof DOMException?new hy("Invalid base64 string: "+s):s}}(e);return new He(t)}static fromUint8Array(e){const t=function(i){let s="";for(let o=0;o<i.length;++o)s+=String.fromCharCode(i[o]);return s}(e);return new He(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(t){return btoa(t)}(this.binaryString)}toUint8Array(){return function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return me(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}He.EMPTY_BYTE_STRING=new He("");const BS=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Vn(r){if(Z(!!r,39018),typeof r=="string"){let e=0;const t=BS.exec(r);if(Z(!!t,46558,{timestamp:r}),t[1]){let i=t[1];i=(i+"000000000").substr(0,9),e=Number(i)}const n=new Date(r);return{seconds:Math.floor(n.getTime()/1e3),nanos:e}}return{seconds:Fe(r.seconds),nanos:Fe(r.nanos)}}function Fe(r){return typeof r=="number"?r:typeof r=="string"?Number(r):0}function On(r){return typeof r=="string"?He.fromBase64String(r):He.fromUint8Array(r)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dy="server_timestamp",fy="__type__",py="__previous_value__",my="__local_write_time__";function Bc(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[fy])==null?void 0:n.stringValue)===dy}function qc(r){const e=r.mapValue.fields[py];return Bc(e)?qc(e):e}function Oo(r){const e=Vn(r.mapValue.fields[my].timestampValue);return new Se(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qS{constructor(e,t,n,i,s,o,c,l,u,d){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=i,this.ssl=s,this.forceLongPolling=o,this.autoDetectLongPolling=c,this.longPollingOptions=l,this.useFetchStreams=u,this.isUsingEmulator=d}}const cu="(default)";class yr{constructor(e,t){this.projectId=e,this.database=t||cu}static empty(){return new yr("","")}get isDefaultDatabase(){return this.database===cu}isEqual(e){return e instanceof yr&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ih="__type__",gy="__max__",sr={mapValue:{fields:{__type__:{stringValue:gy}}}},Eh="__vector__",ns="value",za={nullValue:"NULL_VALUE"};function _r(r){return"nullValue"in r?0:"booleanValue"in r?1:"integerValue"in r||"doubleValue"in r?2:"timestampValue"in r?3:"stringValue"in r?5:"bytesValue"in r?6:"referenceValue"in r?7:"geoPointValue"in r?8:"arrayValue"in r?9:"mapValue"in r?Bc(r)?4:yy(r)?9007199254740991:$c(r)?10:11:Y(28295,{value:r})}function An(r,e){if(r===e)return!0;const t=_r(r);if(t!==_r(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return r.booleanValue===e.booleanValue;case 4:return Oo(r).isEqual(Oo(e));case 3:return function(i,s){if(typeof i.timestampValue=="string"&&typeof s.timestampValue=="string"&&i.timestampValue.length===s.timestampValue.length)return i.timestampValue===s.timestampValue;const o=Vn(i.timestampValue),c=Vn(s.timestampValue);return o.seconds===c.seconds&&o.nanos===c.nanos}(r,e);case 5:return r.stringValue===e.stringValue;case 6:return function(i,s){return On(i.bytesValue).isEqual(On(s.bytesValue))}(r,e);case 7:return r.referenceValue===e.referenceValue;case 8:return function(i,s){return Fe(i.geoPointValue.latitude)===Fe(s.geoPointValue.latitude)&&Fe(i.geoPointValue.longitude)===Fe(s.geoPointValue.longitude)}(r,e);case 2:return function(i,s){if("integerValue"in i&&"integerValue"in s)return Fe(i.integerValue)===Fe(s.integerValue);if("doubleValue"in i&&"doubleValue"in s){const o=Fe(i.doubleValue),c=Fe(s.doubleValue);return o===c?xo(o)===xo(c):isNaN(o)&&isNaN(c)}return!1}(r,e);case 9:return Yi(r.arrayValue.values||[],e.arrayValue.values||[],An);case 10:case 11:return function(i,s){const o=i.mapValue.fields||{},c=s.mapValue.fields||{};if(Yf(o)!==Yf(c))return!1;for(const l in o)if(o.hasOwnProperty(l)&&(c[l]===void 0||!An(o[l],c[l])))return!1;return!0}(r,e);default:return Y(52216,{left:r})}}function Mo(r,e){return(r.values||[]).find(t=>An(t,e))!==void 0}function wr(r,e){if(r===e)return 0;const t=_r(r),n=_r(e);if(t!==n)return me(t,n);switch(t){case 0:case 9007199254740991:return 0;case 1:return me(r.booleanValue,e.booleanValue);case 2:return function(s,o){const c=Fe(s.integerValue||s.doubleValue),l=Fe(o.integerValue||o.doubleValue);return c<l?-1:c>l?1:c===l?0:isNaN(c)?isNaN(l)?0:-1:1}(r,e);case 3:return Xf(r.timestampValue,e.timestampValue);case 4:return Xf(Oo(r),Oo(e));case 5:return nu(r.stringValue,e.stringValue);case 6:return function(s,o){const c=On(s),l=On(o);return c.compareTo(l)}(r.bytesValue,e.bytesValue);case 7:return function(s,o){const c=s.split("/"),l=o.split("/");for(let u=0;u<c.length&&u<l.length;u++){const d=me(c[u],l[u]);if(d!==0)return d}return me(c.length,l.length)}(r.referenceValue,e.referenceValue);case 8:return function(s,o){const c=me(Fe(s.latitude),Fe(o.latitude));return c!==0?c:me(Fe(s.longitude),Fe(o.longitude))}(r.geoPointValue,e.geoPointValue);case 9:return Zf(r.arrayValue,e.arrayValue);case 10:return function(s,o){var m,v,M,F;const c=s.fields||{},l=o.fields||{},u=(m=c[ns])==null?void 0:m.arrayValue,d=(v=l[ns])==null?void 0:v.arrayValue,p=me(((M=u==null?void 0:u.values)==null?void 0:M.length)||0,((F=d==null?void 0:d.values)==null?void 0:F.length)||0);return p!==0?p:Zf(u,d)}(r.mapValue,e.mapValue);case 11:return function(s,o){if(s===sr.mapValue&&o===sr.mapValue)return 0;if(s===sr.mapValue)return 1;if(o===sr.mapValue)return-1;const c=s.fields||{},l=Object.keys(c),u=o.fields||{},d=Object.keys(u);l.sort(),d.sort();for(let p=0;p<l.length&&p<d.length;++p){const m=nu(l[p],d[p]);if(m!==0)return m;const v=wr(c[l[p]],u[d[p]]);if(v!==0)return v}return me(l.length,d.length)}(r.mapValue,e.mapValue);default:throw Y(23264,{he:t})}}function Xf(r,e){if(typeof r=="string"&&typeof e=="string"&&r.length===e.length)return me(r,e);const t=Vn(r),n=Vn(e),i=me(t.seconds,n.seconds);return i!==0?i:me(t.nanos,n.nanos)}function Zf(r,e){const t=r.values||[],n=e.values||[];for(let i=0;i<t.length&&i<n.length;++i){const s=wr(t[i],n[i]);if(s)return s}return me(t.length,n.length)}function rs(r){return lu(r)}function lu(r){return"nullValue"in r?"null":"booleanValue"in r?""+r.booleanValue:"integerValue"in r?""+r.integerValue:"doubleValue"in r?""+r.doubleValue:"timestampValue"in r?function(t){const n=Vn(t);return`time(${n.seconds},${n.nanos})`}(r.timestampValue):"stringValue"in r?r.stringValue:"bytesValue"in r?function(t){return On(t).toBase64()}(r.bytesValue):"referenceValue"in r?function(t){return G.fromName(t).toString()}(r.referenceValue):"geoPointValue"in r?function(t){return`geo(${t.latitude},${t.longitude})`}(r.geoPointValue):"arrayValue"in r?function(t){let n="[",i=!0;for(const s of t.values||[])i?i=!1:n+=",",n+=lu(s);return n+"]"}(r.arrayValue):"mapValue"in r?function(t){const n=Object.keys(t.fields||{}).sort();let i="{",s=!0;for(const o of n)s?s=!1:i+=",",i+=`${o}:${lu(t.fields[o])}`;return i+"}"}(r.mapValue):Y(61005,{value:r})}function Ka(r){switch(_r(r)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=qc(r);return e?16+Ka(e):16;case 5:return 2*r.stringValue.length;case 6:return On(r.bytesValue).approximateByteSize();case 7:return r.referenceValue.length;case 9:return function(n){return(n.values||[]).reduce((i,s)=>i+Ka(s),0)}(r.arrayValue);case 10:case 11:return function(n){let i=0;return Pr(n.fields,(s,o)=>{i+=s.length+Ka(o)}),i}(r.mapValue);default:throw Y(13486,{value:r})}}function ai(r,e){return{referenceValue:`projects/${r.projectId}/databases/${r.database}/documents/${e.path.canonicalString()}`}}function uu(r){return!!r&&"integerValue"in r}function Lo(r){return!!r&&"arrayValue"in r}function ep(r){return!!r&&"nullValue"in r}function tp(r){return!!r&&"doubleValue"in r&&isNaN(Number(r.doubleValue))}function ja(r){return!!r&&"mapValue"in r}function $c(r){var t,n;return((n=(((t=r==null?void 0:r.mapValue)==null?void 0:t.fields)||{})[Ih])==null?void 0:n.stringValue)===Eh}function go(r){if(r.geoPointValue)return{geoPointValue:{...r.geoPointValue}};if(r.timestampValue&&typeof r.timestampValue=="object")return{timestampValue:{...r.timestampValue}};if(r.mapValue){const e={mapValue:{fields:{}}};return Pr(r.mapValue.fields,(t,n)=>e.mapValue.fields[t]=go(n)),e}if(r.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(r.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=go(r.arrayValue.values[t]);return e}return{...r}}function yy(r){return(((r.mapValue||{}).fields||{}).__type__||{}).stringValue===gy}const _y={mapValue:{fields:{[Ih]:{stringValue:Eh},[ns]:{arrayValue:{}}}}};function $S(r){return"nullValue"in r?za:"booleanValue"in r?{booleanValue:!1}:"integerValue"in r||"doubleValue"in r?{doubleValue:NaN}:"timestampValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in r?{stringValue:""}:"bytesValue"in r?{bytesValue:""}:"referenceValue"in r?ai(yr.empty(),G.empty()):"geoPointValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in r?{arrayValue:{}}:"mapValue"in r?$c(r)?_y:{mapValue:{}}:Y(35942,{value:r})}function zS(r){return"nullValue"in r?{booleanValue:!1}:"booleanValue"in r?{doubleValue:NaN}:"integerValue"in r||"doubleValue"in r?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in r?{stringValue:""}:"stringValue"in r?{bytesValue:""}:"bytesValue"in r?ai(yr.empty(),G.empty()):"referenceValue"in r?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in r?{arrayValue:{}}:"arrayValue"in r?_y:"mapValue"in r?$c(r)?{mapValue:{}}:sr:Y(61959,{value:r})}function np(r,e){const t=wr(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?-1:!r.inclusive&&e.inclusive?1:0}function rp(r,e){const t=wr(r.value,e.value);return t!==0?t:r.inclusive&&!e.inclusive?1:!r.inclusive&&e.inclusive?-1:0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(e){this.value=e}static empty(){return new gt({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!ja(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=go(t)}setAll(e){let t=Be.emptyPath(),n={},i=[];e.forEach((o,c)=>{if(!t.isImmediateParentOf(c)){const l=this.getFieldsMap(t);this.applyChanges(l,n,i),n={},i=[],t=c.popLast()}o?n[c.lastSegment()]=go(o):i.push(c.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,i)}delete(e){const t=this.field(e.popLast());ja(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return An(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let i=t.mapValue.fields[e.get(n)];ja(i)&&i.mapValue.fields||(i={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=i),t=i}return t.mapValue.fields}applyChanges(e,t,n){Pr(t,(i,s)=>e[i]=s);for(const i of n)delete e[i]}clone(){return new gt(go(this.value))}}function wy(r){const e=[];return Pr(r.fields,(t,n)=>{const i=new Be([t]);if(ja(n)){const s=wy(n.mapValue).fields;if(s.length===0)e.push(i);else for(const o of s)e.push(i.child(o))}else e.push(i)}),new Mt(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Le{constructor(e,t,n,i,s,o,c){this.key=e,this.documentType=t,this.version=n,this.readTime=i,this.createTime=s,this.data=o,this.documentState=c}static newInvalidDocument(e){return new Le(e,0,te.min(),te.min(),te.min(),gt.empty(),0)}static newFoundDocument(e,t,n,i){return new Le(e,1,t,te.min(),n,i,0)}static newNoDocument(e,t){return new Le(e,2,t,te.min(),te.min(),gt.empty(),0)}static newUnknownDocument(e,t){return new Le(e,3,t,te.min(),te.min(),gt.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(te.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=gt.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=gt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=te.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof Le&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new Le(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
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
 */class Ir{constructor(e,t){this.position=e,this.inclusive=t}}function ip(r,e,t){let n=0;for(let i=0;i<r.position.length;i++){const s=e[i],o=r.position[i];if(s.field.isKeyField()?n=G.comparator(G.fromName(o.referenceValue),t.key):n=wr(o,t.data.field(s.field)),s.dir==="desc"&&(n*=-1),n!==0)break}return n}function sp(r,e){if(r===null)return e===null;if(e===null||r.inclusive!==e.inclusive||r.position.length!==e.position.length)return!1;for(let t=0;t<r.position.length;t++)if(!An(r.position[t],e.position[t]))return!1;return!0}/**
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
 */class Fo{constructor(e,t="asc"){this.field=e,this.dir=t}}function KS(r,e){return r.dir===e.dir&&r.field.isEqual(e.field)}/**
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
 */class Iy{}class ve extends Iy{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,n):new jS(e,t,n):t==="array-contains"?new HS(e,n):t==="in"?new Sy(e,n):t==="not-in"?new QS(e,n):t==="array-contains-any"?new YS(e,n):new ve(e,t,n)}static createKeyFieldInFilter(e,t,n){return t==="in"?new GS(e,n):new WS(e,n)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(wr(t,this.value)):t!==null&&_r(this.value)===_r(t)&&this.matchesComparison(wr(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return Y(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Re extends Iy{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new Re(e,t)}matches(e){return is(this)?this.filters.find(t=>!t.matches(e))===void 0:this.filters.find(t=>t.matches(e))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function is(r){return r.op==="and"}function hu(r){return r.op==="or"}function vh(r){return Ey(r)&&is(r)}function Ey(r){for(const e of r.filters)if(e instanceof Re)return!1;return!0}function du(r){if(r instanceof ve)return r.field.canonicalString()+r.op.toString()+rs(r.value);if(vh(r))return r.filters.map(e=>du(e)).join(",");{const e=r.filters.map(t=>du(t)).join(",");return`${r.op}(${e})`}}function vy(r,e){return r instanceof ve?function(n,i){return i instanceof ve&&n.op===i.op&&n.field.isEqual(i.field)&&An(n.value,i.value)}(r,e):r instanceof Re?function(n,i){return i instanceof Re&&n.op===i.op&&n.filters.length===i.filters.length?n.filters.reduce((s,o,c)=>s&&vy(o,i.filters[c]),!0):!1}(r,e):void Y(19439)}function Ty(r,e){const t=r.filters.concat(e);return Re.create(t,r.op)}function by(r){return r instanceof ve?function(t){return`${t.field.canonicalString()} ${t.op} ${rs(t.value)}`}(r):r instanceof Re?function(t){return t.op.toString()+" {"+t.getFilters().map(by).join(" ,")+"}"}(r):"Filter"}class jS extends ve{constructor(e,t,n){super(e,t,n),this.key=G.fromName(n.referenceValue)}matches(e){const t=G.comparator(e.key,this.key);return this.matchesComparison(t)}}class GS extends ve{constructor(e,t){super(e,"in",t),this.keys=Ay("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class WS extends ve{constructor(e,t){super(e,"not-in",t),this.keys=Ay("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function Ay(r,e){var t;return(((t=e.arrayValue)==null?void 0:t.values)||[]).map(n=>G.fromName(n.referenceValue))}class HS extends ve{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Lo(t)&&Mo(t.arrayValue,this.value)}}class Sy extends ve{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&Mo(this.value.arrayValue,t)}}class QS extends ve{constructor(e,t){super(e,"not-in",t)}matches(e){if(Mo(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!Mo(this.value.arrayValue,t)}}class YS extends ve{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Lo(t)||!t.arrayValue.values)&&t.arrayValue.values.some(n=>Mo(this.value.arrayValue,n))}}/**
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
 */class JS{constructor(e,t=null,n=[],i=[],s=null,o=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=i,this.limit=s,this.startAt=o,this.endAt=c,this.Te=null}}function fu(r,e=null,t=[],n=[],i=null,s=null,o=null){return new JS(r,e,t,n,i,s,o)}function ci(r){const e=H(r);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map(n=>du(n)).join(","),t+="|ob:",t+=e.orderBy.map(n=>function(s){return s.field.canonicalString()+s.dir}(n)).join(","),ea(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(n=>rs(n)).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(n=>rs(n)).join(",")),e.Te=t}return e.Te}function na(r,e){if(r.limit!==e.limit||r.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<r.orderBy.length;t++)if(!KS(r.orderBy[t],e.orderBy[t]))return!1;if(r.filters.length!==e.filters.length)return!1;for(let t=0;t<r.filters.length;t++)if(!vy(r.filters[t],e.filters[t]))return!1;return r.collectionGroup===e.collectionGroup&&!!r.path.isEqual(e.path)&&!!sp(r.startAt,e.startAt)&&sp(r.endAt,e.endAt)}function lc(r){return G.isDocumentKey(r.path)&&r.collectionGroup===null&&r.filters.length===0}function uc(r,e){return r.filters.filter(t=>t instanceof ve&&t.field.isEqual(e))}function op(r,e,t){let n=za,i=!0;for(const s of uc(r,e)){let o=za,c=!0;switch(s.op){case"<":case"<=":o=$S(s.value);break;case"==":case"in":case">=":o=s.value;break;case">":o=s.value,c=!1;break;case"!=":case"not-in":o=za}np({value:n,inclusive:i},{value:o,inclusive:c})<0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];np({value:n,inclusive:i},{value:o,inclusive:t.inclusive})<0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}function ap(r,e,t){let n=sr,i=!0;for(const s of uc(r,e)){let o=sr,c=!0;switch(s.op){case">=":case">":o=zS(s.value),c=!1;break;case"==":case"in":case"<=":o=s.value;break;case"<":o=s.value,c=!1;break;case"!=":case"not-in":o=sr}rp({value:n,inclusive:i},{value:o,inclusive:c})>0&&(n=o,i=c)}if(t!==null){for(let s=0;s<r.orderBy.length;++s)if(r.orderBy[s].field.isEqual(e)){const o=t.position[s];rp({value:n,inclusive:i},{value:o,inclusive:t.inclusive})>0&&(n=o,i=t.inclusive);break}}return{value:n,inclusive:i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fn{constructor(e,t=null,n=[],i=[],s=null,o="F",c=null,l=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=i,this.limit=s,this.limitType=o,this.startAt=c,this.endAt=l,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function Ry(r,e,t,n,i,s,o,c){return new Fn(r,e,t,n,i,s,o,c)}function Es(r){return new Fn(r)}function cp(r){return r.filters.length===0&&r.limit===null&&r.startAt==null&&r.endAt==null&&(r.explicitOrderBy.length===0||r.explicitOrderBy.length===1&&r.explicitOrderBy[0].field.isKeyField())}function Th(r){return r.collectionGroup!==null}function Ki(r){const e=H(r);if(e.Ie===null){e.Ie=[];const t=new Set;for(const s of e.explicitOrderBy)e.Ie.push(s),t.add(s.field.canonicalString());const n=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(o){let c=new Pe(Be.comparator);return o.filters.forEach(l=>{l.getFlattenedFilters().forEach(u=>{u.isInequality()&&(c=c.add(u.field))})}),c})(e).forEach(s=>{t.has(s.canonicalString())||s.isKeyField()||e.Ie.push(new Fo(s,n))}),t.has(Be.keyField().canonicalString())||e.Ie.push(new Fo(Be.keyField(),n))}return e.Ie}function Dt(r){const e=H(r);return e.Ee||(e.Ee=XS(e,Ki(r))),e.Ee}function XS(r,e){if(r.limitType==="F")return fu(r.path,r.collectionGroup,e,r.filters,r.limit,r.startAt,r.endAt);{e=e.map(i=>{const s=i.dir==="desc"?"asc":"desc";return new Fo(i.field,s)});const t=r.endAt?new Ir(r.endAt.position,r.endAt.inclusive):null,n=r.startAt?new Ir(r.startAt.position,r.startAt.inclusive):null;return fu(r.path,r.collectionGroup,e,r.filters,r.limit,t,n)}}function pu(r,e){const t=r.filters.concat([e]);return new Fn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),t,r.limit,r.limitType,r.startAt,r.endAt)}function hc(r,e,t){return new Fn(r.path,r.collectionGroup,r.explicitOrderBy.slice(),r.filters.slice(),e,t,r.startAt,r.endAt)}function ra(r,e){return na(Dt(r),Dt(e))&&r.limitType===e.limitType}function Py(r){return`${ci(Dt(r))}|lt:${r.limitType}`}function Oi(r){return`Query(target=${function(t){let n=t.path.canonicalString();return t.collectionGroup!==null&&(n+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(n+=`, filters: [${t.filters.map(i=>by(i)).join(", ")}]`),ea(t.limit)||(n+=", limit: "+t.limit),t.orderBy.length>0&&(n+=`, orderBy: [${t.orderBy.map(i=>function(o){return`${o.field.canonicalString()} (${o.dir})`}(i)).join(", ")}]`),t.startAt&&(n+=", startAt: ",n+=t.startAt.inclusive?"b:":"a:",n+=t.startAt.position.map(i=>rs(i)).join(",")),t.endAt&&(n+=", endAt: ",n+=t.endAt.inclusive?"a:":"b:",n+=t.endAt.position.map(i=>rs(i)).join(",")),`Target(${n})`}(Dt(r))}; limitType=${r.limitType})`}function ia(r,e){return e.isFoundDocument()&&function(n,i){const s=i.key.path;return n.collectionGroup!==null?i.key.hasCollectionId(n.collectionGroup)&&n.path.isPrefixOf(s):G.isDocumentKey(n.path)?n.path.isEqual(s):n.path.isImmediateParentOf(s)}(r,e)&&function(n,i){for(const s of Ki(n))if(!s.field.isKeyField()&&i.data.field(s.field)===null)return!1;return!0}(r,e)&&function(n,i){for(const s of n.filters)if(!s.matches(i))return!1;return!0}(r,e)&&function(n,i){return!(n.startAt&&!function(o,c,l){const u=ip(o,c,l);return o.inclusive?u<=0:u<0}(n.startAt,Ki(n),i)||n.endAt&&!function(o,c,l){const u=ip(o,c,l);return o.inclusive?u>=0:u>0}(n.endAt,Ki(n),i))}(r,e)}function Cy(r){return r.collectionGroup||(r.path.length%2==1?r.path.lastSegment():r.path.get(r.path.length-2))}function ky(r){return(e,t)=>{let n=!1;for(const i of Ki(r)){const s=ZS(i,e,t);if(s!==0)return s;n=n||i.field.isKeyField()}return 0}}function ZS(r,e,t){const n=r.field.isKeyField()?G.comparator(e.key,t.key):function(s,o,c){const l=o.data.field(s),u=c.data.field(s);return l!==null&&u!==null?wr(l,u):Y(42886)}(r.field,e,t);switch(r.dir){case"asc":return n;case"desc":return-1*n;default:return Y(19790,{direction:r.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Un{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n!==void 0){for(const[i,s]of n)if(this.equalsFn(i,e))return s}}has(e){return this.get(e)!==void 0}set(e,t){const n=this.mapKeyFn(e),i=this.inner[n];if(i===void 0)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<i.length;s++)if(this.equalsFn(i[s][0],e))return void(i[s]=[e,t]);i.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(n===void 0)return!1;for(let i=0;i<n.length;i++)if(this.equalsFn(n[i][0],e))return n.length===1?delete this.inner[t]:n.splice(i,1),this.innerSize--,!0;return!1}forEach(e){Pr(this.inner,(t,n)=>{for(const[i,s]of n)e(i,s)})}isEmpty(){return uy(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const eR=new Ve(G.comparator);function Lt(){return eR}const xy=new Ve(G.comparator);function to(...r){let e=xy;for(const t of r)e=e.insert(t.key,t);return e}function Dy(r){let e=xy;return r.forEach((t,n)=>e=e.insert(t,n.overlayedDocument)),e}function _n(){return yo()}function Ny(){return yo()}function yo(){return new Un(r=>r.toString(),(r,e)=>r.isEqual(e))}const tR=new Ve(G.comparator),nR=new Pe(G.comparator);function ge(...r){let e=nR;for(const t of r)e=e.add(t);return e}const rR=new Pe(me);function bh(){return rR}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ah(r,e){if(r.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:xo(e)?"-0":e}}function Vy(r){return{integerValue:""+r}}function Oy(r,e){return Zg(e)?Vy(e):Ah(r,e)}/**
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
 */class zc{constructor(){this._=void 0}}function iR(r,e,t){return r instanceof ss?function(i,s){const o={fields:{[fy]:{stringValue:dy},[my]:{timestampValue:{seconds:i.seconds,nanos:i.nanoseconds}}}};return s&&Bc(s)&&(s=qc(s)),s&&(o.fields[py]=s),{mapValue:o}}(t,e):r instanceof li?Ly(r,e):r instanceof ui?Fy(r,e):function(i,s){const o=My(i,s),c=lp(o)+lp(i.Ae);return uu(o)&&uu(i.Ae)?Vy(c):Ah(i.serializer,c)}(r,e)}function sR(r,e,t){return r instanceof li?Ly(r,e):r instanceof ui?Fy(r,e):t}function My(r,e){return r instanceof os?function(n){return uu(n)||function(s){return!!s&&"doubleValue"in s}(n)}(e)?e:{integerValue:0}:null}class ss extends zc{}class li extends zc{constructor(e){super(),this.elements=e}}function Ly(r,e){const t=Uy(e);for(const n of r.elements)t.some(i=>An(i,n))||t.push(n);return{arrayValue:{values:t}}}class ui extends zc{constructor(e){super(),this.elements=e}}function Fy(r,e){let t=Uy(e);for(const n of r.elements)t=t.filter(i=>!An(i,n));return{arrayValue:{values:t}}}class os extends zc{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function lp(r){return Fe(r.integerValue||r.doubleValue)}function Uy(r){return Lo(r)&&r.arrayValue.values?r.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sa{constructor(e,t){this.field=e,this.transform=t}}function oR(r,e){return r.field.isEqual(e.field)&&function(n,i){return n instanceof li&&i instanceof li||n instanceof ui&&i instanceof ui?Yi(n.elements,i.elements,An):n instanceof os&&i instanceof os?An(n.Ae,i.Ae):n instanceof ss&&i instanceof ss}(r.transform,e.transform)}class aR{constructor(e,t){this.version=e,this.transformResults=t}}class qe{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new qe}static exists(e){return new qe(void 0,e)}static updateTime(e){return new qe(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function Ga(r,e){return r.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(r.updateTime):r.exists===void 0||r.exists===e.isFoundDocument()}class Kc{}function By(r,e){if(!r.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return r.isNoDocument()?new Ts(r.key,qe.none()):new vs(r.key,r.data,qe.none());{const t=r.data,n=gt.empty();let i=new Pe(Be.comparator);for(let s of e.fields)if(!i.has(s)){let o=t.field(s);o===null&&s.length>1&&(s=s.popLast(),o=t.field(s)),o===null?n.delete(s):n.set(s,o),i=i.add(s)}return new Bn(r.key,n,new Mt(i.toArray()),qe.none())}}function cR(r,e,t){r instanceof vs?function(i,s,o){const c=i.value.clone(),l=hp(i.fieldTransforms,s,o.transformResults);c.setAll(l),s.convertToFoundDocument(o.version,c).setHasCommittedMutations()}(r,e,t):r instanceof Bn?function(i,s,o){if(!Ga(i.precondition,s))return void s.convertToUnknownDocument(o.version);const c=hp(i.fieldTransforms,s,o.transformResults),l=s.data;l.setAll(qy(i)),l.setAll(c),s.convertToFoundDocument(o.version,l).setHasCommittedMutations()}(r,e,t):function(i,s,o){s.convertToNoDocument(o.version).setHasCommittedMutations()}(0,e,t)}function _o(r,e,t,n){return r instanceof vs?function(s,o,c,l){if(!Ga(s.precondition,o))return c;const u=s.value.clone(),d=dp(s.fieldTransforms,l,o);return u.setAll(d),o.convertToFoundDocument(o.version,u).setHasLocalMutations(),null}(r,e,t,n):r instanceof Bn?function(s,o,c,l){if(!Ga(s.precondition,o))return c;const u=dp(s.fieldTransforms,l,o),d=o.data;return d.setAll(qy(s)),d.setAll(u),o.convertToFoundDocument(o.version,d).setHasLocalMutations(),c===null?null:c.unionWith(s.fieldMask.fields).unionWith(s.fieldTransforms.map(p=>p.field))}(r,e,t,n):function(s,o,c){return Ga(s.precondition,o)?(o.convertToNoDocument(o.version).setHasLocalMutations(),null):c}(r,e,t)}function lR(r,e){let t=null;for(const n of r.fieldTransforms){const i=e.data.field(n.field),s=My(n.transform,i||null);s!=null&&(t===null&&(t=gt.empty()),t.set(n.field,s))}return t||null}function up(r,e){return r.type===e.type&&!!r.key.isEqual(e.key)&&!!r.precondition.isEqual(e.precondition)&&!!function(n,i){return n===void 0&&i===void 0||!(!n||!i)&&Yi(n,i,(s,o)=>oR(s,o))}(r.fieldTransforms,e.fieldTransforms)&&(r.type===0?r.value.isEqual(e.value):r.type!==1||r.data.isEqual(e.data)&&r.fieldMask.isEqual(e.fieldMask))}class vs extends Kc{constructor(e,t,n,i=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=i,this.type=0}getFieldMask(){return null}}class Bn extends Kc{constructor(e,t,n,i,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=i,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function qy(r){const e=new Map;return r.fieldMask.fields.forEach(t=>{if(!t.isEmpty()){const n=r.data.field(t);e.set(t,n)}}),e}function hp(r,e,t){const n=new Map;Z(r.length===t.length,32656,{Re:t.length,Ve:r.length});for(let i=0;i<t.length;i++){const s=r[i],o=s.transform,c=e.data.field(s.field);n.set(s.field,sR(o,c,t[i]))}return n}function dp(r,e,t){const n=new Map;for(const i of r){const s=i.transform,o=t.data.field(i.field);n.set(i.field,iR(s,o,e))}return n}class Ts extends Kc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class Sh extends Kc{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rh{constructor(e,t,n,i){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=i}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let i=0;i<this.mutations.length;i++){const s=this.mutations[i];s.key.isEqual(e.key)&&cR(s,e,n[i])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=_o(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=_o(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=Ny();return this.mutations.forEach(i=>{const s=e.get(i.key),o=s.overlayedDocument;let c=this.applyToLocalView(o,s.mutatedFields);c=t.has(i.key)?null:c;const l=By(o,c);l!==null&&n.set(i.key,l),o.isValidDocument()||o.convertToNoDocument(te.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),ge())}isEqual(e){return this.batchId===e.batchId&&Yi(this.mutations,e.mutations,(t,n)=>up(t,n))&&Yi(this.baseMutations,e.baseMutations,(t,n)=>up(t,n))}}class Ph{constructor(e,t,n,i){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=i}static from(e,t,n){Z(e.mutations.length===n.length,58842,{me:e.mutations.length,fe:n.length});let i=function(){return tR}();const s=e.mutations;for(let o=0;o<s.length;o++)i=i.insert(s[o].key,n[o].version);return new Ph(e,t,n,i)}}/**
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
 */class Ch{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
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
 */class uR{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var nt,be;function $y(r){switch(r){case P.OK:return Y(64938);case P.CANCELLED:case P.UNKNOWN:case P.DEADLINE_EXCEEDED:case P.RESOURCE_EXHAUSTED:case P.INTERNAL:case P.UNAVAILABLE:case P.UNAUTHENTICATED:return!1;case P.INVALID_ARGUMENT:case P.NOT_FOUND:case P.ALREADY_EXISTS:case P.PERMISSION_DENIED:case P.FAILED_PRECONDITION:case P.ABORTED:case P.OUT_OF_RANGE:case P.UNIMPLEMENTED:case P.DATA_LOSS:return!0;default:return Y(15467,{code:r})}}function zy(r){if(r===void 0)return Ze("GRPC error has no .code"),P.UNKNOWN;switch(r){case nt.OK:return P.OK;case nt.CANCELLED:return P.CANCELLED;case nt.UNKNOWN:return P.UNKNOWN;case nt.DEADLINE_EXCEEDED:return P.DEADLINE_EXCEEDED;case nt.RESOURCE_EXHAUSTED:return P.RESOURCE_EXHAUSTED;case nt.INTERNAL:return P.INTERNAL;case nt.UNAVAILABLE:return P.UNAVAILABLE;case nt.UNAUTHENTICATED:return P.UNAUTHENTICATED;case nt.INVALID_ARGUMENT:return P.INVALID_ARGUMENT;case nt.NOT_FOUND:return P.NOT_FOUND;case nt.ALREADY_EXISTS:return P.ALREADY_EXISTS;case nt.PERMISSION_DENIED:return P.PERMISSION_DENIED;case nt.FAILED_PRECONDITION:return P.FAILED_PRECONDITION;case nt.ABORTED:return P.ABORTED;case nt.OUT_OF_RANGE:return P.OUT_OF_RANGE;case nt.UNIMPLEMENTED:return P.UNIMPLEMENTED;case nt.DATA_LOSS:return P.DATA_LOSS;default:return Y(39323,{code:r})}}(be=nt||(nt={}))[be.OK=0]="OK",be[be.CANCELLED=1]="CANCELLED",be[be.UNKNOWN=2]="UNKNOWN",be[be.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",be[be.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",be[be.NOT_FOUND=5]="NOT_FOUND",be[be.ALREADY_EXISTS=6]="ALREADY_EXISTS",be[be.PERMISSION_DENIED=7]="PERMISSION_DENIED",be[be.UNAUTHENTICATED=16]="UNAUTHENTICATED",be[be.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",be[be.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",be[be.ABORTED=10]="ABORTED",be[be.OUT_OF_RANGE=11]="OUT_OF_RANGE",be[be.UNIMPLEMENTED=12]="UNIMPLEMENTED",be[be.INTERNAL=13]="INTERNAL",be[be.UNAVAILABLE=14]="UNAVAILABLE",be[be.DATA_LOSS=15]="DATA_LOSS";/**
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
 */function Ky(){return new TextEncoder}/**
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
 */const hR=new lr([4294967295,4294967295],0);function fp(r){const e=Ky().encode(r),t=new Mg;return t.update(e),new Uint8Array(t.digest())}function pp(r){const e=new DataView(r.buffer),t=e.getUint32(0,!0),n=e.getUint32(4,!0),i=e.getUint32(8,!0),s=e.getUint32(12,!0);return[new lr([t,n],0),new lr([i,s],0)]}class kh{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new no(`Invalid padding: ${t}`);if(n<0)throw new no(`Invalid hash count: ${n}`);if(e.length>0&&this.hashCount===0)throw new no(`Invalid hash count: ${n}`);if(e.length===0&&t!==0)throw new no(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=lr.fromNumber(this.ge)}ye(e,t,n){let i=e.add(t.multiply(lr.fromNumber(n)));return i.compare(hR)===1&&(i=new lr([i.getBits(0),i.getBits(1)],0)),i.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=fp(e),[n,i]=pp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);if(!this.we(o))return!1}return!0}static create(e,t,n){const i=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),o=new kh(s,i,t);return n.forEach(c=>o.insert(c)),o}insert(e){if(this.ge===0)return;const t=fp(e),[n,i]=pp(t);for(let s=0;s<this.hashCount;s++){const o=this.ye(n,i,s);this.Se(o)}}Se(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class no extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oa{constructor(e,t,n,i,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=i,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const i=new Map;return i.set(e,aa.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new oa(te.min(),i,new Ve(me),Lt(),ge())}}class aa{constructor(e,t,n,i,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=i,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new aa(n,t,ge(),ge(),ge())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wa{constructor(e,t,n,i){this.be=e,this.removedTargetIds=t,this.key=n,this.De=i}}class jy{constructor(e,t){this.targetId=e,this.Ce=t}}class Gy{constructor(e,t,n=He.EMPTY_BYTE_STRING,i=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=i}}class mp{constructor(){this.ve=0,this.Fe=gp(),this.Me=He.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=ge(),t=ge(),n=ge();return this.Fe.forEach((i,s)=>{switch(s){case 0:e=e.add(i);break;case 2:t=t.add(i);break;case 1:n=n.add(i);break;default:Y(38017,{changeType:s})}}),new aa(this.Me,this.xe,e,t,n)}qe(){this.Oe=!1,this.Fe=gp()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,Z(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class dR{constructor(e){this.Ge=e,this.ze=new Map,this.je=Lt(),this.Je=ka(),this.He=ka(),this.Ye=new Ve(me)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,t=>{const n=this.nt(t);switch(e.state){case 0:this.rt(t)&&n.Le(e.resumeToken);break;case 1:n.Ke(),n.Ne||n.qe(),n.Le(e.resumeToken);break;case 2:n.Ke(),n.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(n.We(),n.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),n.Le(e.resumeToken));break;default:Y(56790,{state:e.state})}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach((n,i)=>{this.rt(i)&&t(i)})}st(e){const t=e.targetId,n=e.Ce.count,i=this.ot(t);if(i){const s=i.target;if(lc(s))if(n===0){const o=new G(s.path);this.et(t,o,Le.newNoDocument(o,te.min()))}else Z(n===1,20013,{expectedCount:n});else{const o=this._t(t);if(o!==n){const c=this.ut(e),l=c?this.ct(c,e,o):1;if(l!==0){this.it(t);const u=l===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,u)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:i=0},hashCount:s=0}=t;let o,c;try{o=On(n).toUint8Array()}catch(l){if(l instanceof hy)return bn("Decoding the base64 bloom filter in existence filter failed ("+l.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw l}try{c=new kh(o,i,s)}catch(l){return bn(l instanceof no?"BloomFilter error: ":"Applying bloom filter failed: ",l),null}return c.ge===0?null:c}ct(e,t,n){return t.Ce.count===n-this.Pt(e,t.targetId)?0:2}Pt(e,t){const n=this.Ge.getRemoteKeysForTarget(t);let i=0;return n.forEach(s=>{const o=this.Ge.ht(),c=`projects/${o.projectId}/databases/${o.database}/documents/${s.path.canonicalString()}`;e.mightContain(c)||(this.et(t,s,null),i++)}),i}Tt(e){const t=new Map;this.ze.forEach((s,o)=>{const c=this.ot(o);if(c){if(s.current&&lc(c.target)){const l=new G(c.target.path);this.It(l).has(o)||this.Et(o,l)||this.et(o,l,Le.newNoDocument(l,e))}s.Be&&(t.set(o,s.ke()),s.qe())}});let n=ge();this.He.forEach((s,o)=>{let c=!0;o.forEachWhile(l=>{const u=this.ot(l);return!u||u.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)}),c&&(n=n.add(s))}),this.je.forEach((s,o)=>o.setReadTime(e));const i=new oa(e,t,this.Ye,this.je,n);return this.je=Lt(),this.Je=ka(),this.He=ka(),this.Ye=new Ve(me),i}Xe(e,t){if(!this.rt(e))return;const n=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,n),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,n){if(!this.rt(e))return;const i=this.nt(e);this.Et(e,t)?i.Qe(t,1):i.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),n&&(this.je=this.je.insert(t,n))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new mp,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new Pe(me),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new Pe(me),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||$("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new mp),this.Ge.getRemoteKeysForTarget(e).forEach(t=>{this.et(e,t,null)})}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function ka(){return new Ve(G.comparator)}function gp(){return new Ve(G.comparator)}const fR={asc:"ASCENDING",desc:"DESCENDING"},pR={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},mR={and:"AND",or:"OR"};class gR{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function mu(r,e){return r.useProto3Json||ea(e)?e:{value:e}}function as(r,e){return r.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Wy(r,e){return r.useProto3Json?e.toBase64():e.toUint8Array()}function yR(r,e){return as(r,e.toTimestamp())}function et(r){return Z(!!r,49232),te.fromTimestamp(function(t){const n=Vn(t);return new Se(n.seconds,n.nanos)}(r))}function xh(r,e){return gu(r,e).canonicalString()}function gu(r,e){const t=function(i){return new Ie(["projects",i.projectId,"databases",i.database])}(r).child("documents");return e===void 0?t:t.child(e)}function Hy(r){const e=Ie.fromString(r);return Z(i_(e),10190,{key:e.toString()}),e}function Uo(r,e){return xh(r.databaseId,e.path)}function In(r,e){const t=Hy(e);if(t.get(1)!==r.databaseId.projectId)throw new B(P.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+r.databaseId.projectId);if(t.get(3)!==r.databaseId.database)throw new B(P.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+r.databaseId.database);return new G(Jy(t))}function Qy(r,e){return xh(r.databaseId,e)}function Yy(r){const e=Hy(r);return e.length===4?Ie.emptyPath():Jy(e)}function yu(r){return new Ie(["projects",r.databaseId.projectId,"databases",r.databaseId.database]).canonicalString()}function Jy(r){return Z(r.length>4&&r.get(4)==="documents",29091,{key:r.toString()}),r.popFirst(5)}function yp(r,e,t){return{name:Uo(r,e),fields:t.value.mapValue.fields}}function Xy(r,e,t){const n=In(r,e.name),i=et(e.updateTime),s=e.createTime?et(e.createTime):te.min(),o=new gt({mapValue:{fields:e.fields}}),c=Le.newFoundDocument(n,i,s,o);return t&&c.setHasCommittedMutations(),t?c.setHasCommittedMutations():c}function _R(r,e){return"found"in e?function(n,i){Z(!!i.found,43571),i.found.name,i.found.updateTime;const s=In(n,i.found.name),o=et(i.found.updateTime),c=i.found.createTime?et(i.found.createTime):te.min(),l=new gt({mapValue:{fields:i.found.fields}});return Le.newFoundDocument(s,o,c,l)}(r,e):"missing"in e?function(n,i){Z(!!i.missing,3894),Z(!!i.readTime,22933);const s=In(n,i.missing),o=et(i.readTime);return Le.newNoDocument(s,o)}(r,e):Y(7234,{result:e})}function wR(r,e){let t;if("targetChange"in e){e.targetChange;const n=function(u){return u==="NO_CHANGE"?0:u==="ADD"?1:u==="REMOVE"?2:u==="CURRENT"?3:u==="RESET"?4:Y(39313,{state:u})}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],s=function(u,d){return u.useProto3Json?(Z(d===void 0||typeof d=="string",58123),He.fromBase64String(d||"")):(Z(d===void 0||d instanceof Buffer||d instanceof Uint8Array,16193),He.fromUint8Array(d||new Uint8Array))}(r,e.targetChange.resumeToken),o=e.targetChange.cause,c=o&&function(u){const d=u.code===void 0?P.UNKNOWN:zy(u.code);return new B(d,u.message||"")}(o);t=new Gy(n,i,s,c||null)}else if("documentChange"in e){e.documentChange;const n=e.documentChange;n.document,n.document.name,n.document.updateTime;const i=In(r,n.document.name),s=et(n.document.updateTime),o=n.document.createTime?et(n.document.createTime):te.min(),c=new gt({mapValue:{fields:n.document.fields}}),l=Le.newFoundDocument(i,s,o,c),u=n.targetIds||[],d=n.removedTargetIds||[];t=new Wa(u,d,l.key,l)}else if("documentDelete"in e){e.documentDelete;const n=e.documentDelete;n.document;const i=In(r,n.document),s=n.readTime?et(n.readTime):te.min(),o=Le.newNoDocument(i,s),c=n.removedTargetIds||[];t=new Wa([],c,o.key,o)}else if("documentRemove"in e){e.documentRemove;const n=e.documentRemove;n.document;const i=In(r,n.document),s=n.removedTargetIds||[];t=new Wa([],s,i,null)}else{if(!("filter"in e))return Y(11601,{Rt:e});{e.filter;const n=e.filter;n.targetId;const{count:i=0,unchangedNames:s}=n,o=new uR(i,s),c=n.targetId;t=new jy(c,o)}}return t}function Bo(r,e){let t;if(e instanceof vs)t={update:yp(r,e.key,e.value)};else if(e instanceof Ts)t={delete:Uo(r,e.key)};else if(e instanceof Bn)t={update:yp(r,e.key,e.data),updateMask:AR(e.fieldMask)};else{if(!(e instanceof Sh))return Y(16599,{Vt:e.type});t={verify:Uo(r,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map(n=>function(s,o){const c=o.transform;if(c instanceof ss)return{fieldPath:o.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof li)return{fieldPath:o.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof ui)return{fieldPath:o.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof os)return{fieldPath:o.field.canonicalString(),increment:c.Ae};throw Y(20930,{transform:o.transform})}(0,n))),e.precondition.isNone||(t.currentDocument=function(i,s){return s.updateTime!==void 0?{updateTime:yR(i,s.updateTime)}:s.exists!==void 0?{exists:s.exists}:Y(27497)}(r,e.precondition)),t}function _u(r,e){const t=e.currentDocument?function(s){return s.updateTime!==void 0?qe.updateTime(et(s.updateTime)):s.exists!==void 0?qe.exists(s.exists):qe.none()}(e.currentDocument):qe.none(),n=e.updateTransforms?e.updateTransforms.map(i=>function(o,c){let l=null;if("setToServerValue"in c)Z(c.setToServerValue==="REQUEST_TIME",16630,{proto:c}),l=new ss;else if("appendMissingElements"in c){const d=c.appendMissingElements.values||[];l=new li(d)}else if("removeAllFromArray"in c){const d=c.removeAllFromArray.values||[];l=new ui(d)}else"increment"in c?l=new os(o,c.increment):Y(16584,{proto:c});const u=Be.fromServerFormat(c.fieldPath);return new sa(u,l)}(r,i)):[];if(e.update){e.update.name;const i=In(r,e.update.name),s=new gt({mapValue:{fields:e.update.fields}});if(e.updateMask){const o=function(l){const u=l.fieldPaths||[];return new Mt(u.map(d=>Be.fromServerFormat(d)))}(e.updateMask);return new Bn(i,s,o,t,n)}return new vs(i,s,t,n)}if(e.delete){const i=In(r,e.delete);return new Ts(i,t)}if(e.verify){const i=In(r,e.verify);return new Sh(i,t)}return Y(1463,{proto:e})}function IR(r,e){return r&&r.length>0?(Z(e!==void 0,14353),r.map(t=>function(i,s){let o=i.updateTime?et(i.updateTime):et(s);return o.isEqual(te.min())&&(o=et(s)),new aR(o,i.transformResults||[])}(t,e))):[]}function Zy(r,e){return{documents:[Qy(r,e.path)]}}function e_(r,e){const t={structuredQuery:{}},n=e.path;let i;e.collectionGroup!==null?(i=n,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(i=n.popLast(),t.structuredQuery.from=[{collectionId:n.lastSegment()}]),t.parent=Qy(r,i);const s=function(u){if(u.length!==0)return r_(Re.create(u,"and"))}(e.filters);s&&(t.structuredQuery.where=s);const o=function(u){if(u.length!==0)return u.map(d=>function(m){return{field:Mi(m.field),direction:vR(m.dir)}}(d))}(e.orderBy);o&&(t.structuredQuery.orderBy=o);const c=mu(r,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=function(u){return{before:u.inclusive,values:u.position}}(e.startAt)),e.endAt&&(t.structuredQuery.endAt=function(u){return{before:!u.inclusive,values:u.position}}(e.endAt)),{ft:t,parent:i}}function t_(r){let e=Yy(r.parent);const t=r.structuredQuery,n=t.from?t.from.length:0;let i=null;if(n>0){Z(n===1,65062);const d=t.from[0];d.allDescendants?i=d.collectionId:e=e.child(d.collectionId)}let s=[];t.where&&(s=function(p){const m=n_(p);return m instanceof Re&&vh(m)?m.getFilters():[m]}(t.where));let o=[];t.orderBy&&(o=function(p){return p.map(m=>function(M){return new Fo(Li(M.field),function(U){switch(U){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(M.direction))}(m))}(t.orderBy));let c=null;t.limit&&(c=function(p){let m;return m=typeof p=="object"?p.value:p,ea(m)?null:m}(t.limit));let l=null;t.startAt&&(l=function(p){const m=!!p.before,v=p.values||[];return new Ir(v,m)}(t.startAt));let u=null;return t.endAt&&(u=function(p){const m=!p.before,v=p.values||[];return new Ir(v,m)}(t.endAt)),Ry(e,i,o,s,c,"F",l,u)}function ER(r,e){const t=function(i){switch(i){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return Y(28987,{purpose:i})}}(e.purpose);return t==null?null:{"goog-listen-tags":t}}function n_(r){return r.unaryFilter!==void 0?function(t){switch(t.unaryFilter.op){case"IS_NAN":const n=Li(t.unaryFilter.field);return ve.create(n,"==",{doubleValue:NaN});case"IS_NULL":const i=Li(t.unaryFilter.field);return ve.create(i,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const s=Li(t.unaryFilter.field);return ve.create(s,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const o=Li(t.unaryFilter.field);return ve.create(o,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return Y(61313);default:return Y(60726)}}(r):r.fieldFilter!==void 0?function(t){return ve.create(Li(t.fieldFilter.field),function(i){switch(i){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return Y(58110);default:return Y(50506)}}(t.fieldFilter.op),t.fieldFilter.value)}(r):r.compositeFilter!==void 0?function(t){return Re.create(t.compositeFilter.filters.map(n=>n_(n)),function(i){switch(i){case"AND":return"and";case"OR":return"or";default:return Y(1026)}}(t.compositeFilter.op))}(r):Y(30097,{filter:r})}function vR(r){return fR[r]}function TR(r){return pR[r]}function bR(r){return mR[r]}function Mi(r){return{fieldPath:r.canonicalString()}}function Li(r){return Be.fromServerFormat(r.fieldPath)}function r_(r){return r instanceof ve?function(t){if(t.op==="=="){if(tp(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NAN"}};if(ep(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(tp(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NOT_NAN"}};if(ep(t.value))return{unaryFilter:{field:Mi(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Mi(t.field),op:TR(t.op),value:t.value}}}(r):r instanceof Re?function(t){const n=t.getFilters().map(i=>r_(i));return n.length===1?n[0]:{compositeFilter:{op:bR(t.op),filters:n}}}(r):Y(54877,{filter:r})}function AR(r){const e=[];return r.fields.forEach(t=>e.push(t.canonicalString())),{fieldPaths:e}}function i_(r){return r.length>=4&&r.get(0)==="projects"&&r.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kn{constructor(e,t,n,i,s=te.min(),o=te.min(),c=He.EMPTY_BYTE_STRING,l=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=i,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=c,this.expectedCount=l}withSequenceNumber(e){return new kn(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new kn(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class s_{constructor(e){this.yt=e}}function SR(r,e){let t;if(e.document)t=Xy(r.yt,e.document,!!e.hasCommittedMutations);else if(e.noDocument){const n=G.fromSegments(e.noDocument.path),i=di(e.noDocument.readTime);t=Le.newNoDocument(n,i),e.hasCommittedMutations&&t.setHasCommittedMutations()}else{if(!e.unknownDocument)return Y(56709);{const n=G.fromSegments(e.unknownDocument.path),i=di(e.unknownDocument.version);t=Le.newUnknownDocument(n,i)}}return e.readTime&&t.setReadTime(function(i){const s=new Se(i[0],i[1]);return te.fromTimestamp(s)}(e.readTime)),t}function _p(r,e){const t=e.key,n={prefixPath:t.getCollectionPath().popLast().toArray(),collectionGroup:t.collectionGroup,documentId:t.path.lastSegment(),readTime:dc(e.readTime),hasCommittedMutations:e.hasCommittedMutations};if(e.isFoundDocument())n.document=function(s,o){return{name:Uo(s,o.key),fields:o.data.value.mapValue.fields,updateTime:as(s,o.version.toTimestamp()),createTime:as(s,o.createTime.toTimestamp())}}(r.yt,e);else if(e.isNoDocument())n.noDocument={path:t.path.toArray(),readTime:hi(e.version)};else{if(!e.isUnknownDocument())return Y(57904,{document:e});n.unknownDocument={path:t.path.toArray(),version:hi(e.version)}}return n}function dc(r){const e=r.toTimestamp();return[e.seconds,e.nanoseconds]}function hi(r){const e=r.toTimestamp();return{seconds:e.seconds,nanoseconds:e.nanoseconds}}function di(r){const e=new Se(r.seconds,r.nanoseconds);return te.fromTimestamp(e)}function Gr(r,e){const t=(e.baseMutations||[]).map(s=>_u(r.yt,s));for(let s=0;s<e.mutations.length-1;++s){const o=e.mutations[s];if(s+1<e.mutations.length&&e.mutations[s+1].transform!==void 0){const c=e.mutations[s+1];o.updateTransforms=c.transform.fieldTransforms,e.mutations.splice(s+1,1),++s}}const n=e.mutations.map(s=>_u(r.yt,s)),i=Se.fromMillis(e.localWriteTimeMs);return new Rh(e.batchId,i,t,n)}function ro(r){const e=di(r.readTime),t=r.lastLimboFreeSnapshotVersion!==void 0?di(r.lastLimboFreeSnapshotVersion):te.min();let n;return n=function(s){return s.documents!==void 0}(r.query)?function(s){const o=s.documents.length;return Z(o===1,1966,{count:o}),Dt(Es(Yy(s.documents[0])))}(r.query):function(s){return Dt(t_(s))}(r.query),new kn(n,r.targetId,"TargetPurposeListen",r.lastListenSequenceNumber,e,t,He.fromBase64String(r.resumeToken))}function o_(r,e){const t=hi(e.snapshotVersion),n=hi(e.lastLimboFreeSnapshotVersion);let i;i=lc(e.target)?Zy(r.yt,e.target):e_(r.yt,e.target).ft;const s=e.resumeToken.toBase64();return{targetId:e.targetId,canonicalId:ci(e.target),readTime:t,resumeToken:s,lastListenSequenceNumber:e.sequenceNumber,lastLimboFreeSnapshotVersion:n,query:i}}function Dh(r){const e=t_({parent:r.parent,structuredQuery:r.structuredQuery});return r.limitType==="LAST"?hc(e,e.limit,"L"):e}function Ol(r,e){return new Ch(e.largestBatchId,_u(r.yt,e.overlayMutation))}function wp(r,e){const t=e.path.lastSegment();return[r,At(e.path.popLast()),t]}function Ip(r,e,t,n){return{indexId:r,uid:e,sequenceNumber:t,readTime:hi(n.readTime),documentKey:At(n.documentKey.path),largestBatchId:n.largestBatchId}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class RR{getBundleMetadata(e,t){return Ep(e).get(t).next(n=>{if(n)return function(s){return{id:s.bundleId,createTime:di(s.createTime),version:s.version}}(n)})}saveBundleMetadata(e,t){return Ep(e).put(function(i){return{bundleId:i.id,createTime:hi(et(i.createTime)),version:i.version}}(t))}getNamedQuery(e,t){return vp(e).get(t).next(n=>{if(n)return function(s){return{name:s.name,query:Dh(s.bundledQuery),readTime:di(s.readTime)}}(n)})}saveNamedQuery(e,t){return vp(e).put(function(i){return{name:i.name,readTime:hi(et(i.readTime)),bundledQuery:i.bundledQuery}}(t))}}function Ep(r){return at(r,Lc)}function vp(r){return at(r,Fc)}/**
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
 */class jc{constructor(e,t){this.serializer=e,this.userId=t}static wt(e,t){const n=t.uid||"";return new jc(e,n)}getOverlay(e,t){return Gs(e).get(wp(this.userId,t)).next(n=>n?Ol(this.serializer,n):null)}getOverlays(e,t){const n=_n();return b.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){const i=[];return n.forEach((s,o)=>{const c=new Ch(t,o);i.push(this.St(e,c))}),b.waitFor(i)}removeOverlaysForBatchId(e,t,n){const i=new Set;t.forEach(o=>i.add(At(o.getCollectionPath())));const s=[];return i.forEach(o=>{const c=IDBKeyRange.bound([this.userId,o,n],[this.userId,o,n+1],!1,!0);s.push(Gs(e).Z(ou,c))}),b.waitFor(s)}getOverlaysForCollection(e,t,n){const i=_n(),s=At(t),o=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return Gs(e).J(ou,o).next(c=>{for(const l of c){const u=Ol(this.serializer,l);i.set(u.getKey(),u)}return i})}getOverlaysForCollectionGroup(e,t,n,i){const s=_n();let o;const c=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return Gs(e).ee({index:sy,range:c},(l,u,d)=>{const p=Ol(this.serializer,u);s.size()<i||p.largestBatchId===o?(s.set(p.getKey(),p),o=p.largestBatchId):d.done()}).next(()=>s)}St(e,t){return Gs(e).put(function(i,s,o){const[c,l,u]=wp(s,o.mutation.key);return{userId:s,collectionPath:l,documentId:u,collectionGroup:o.mutation.key.getCollectionGroup(),largestBatchId:o.largestBatchId,overlayMutation:Bo(i.yt,o.mutation)}}(this.serializer,this.userId,t))}}function Gs(r){return at(r,Uc)}/**
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
 */class PR{bt(e){return at(e,_h)}getSessionToken(e){return this.bt(e).get("sessionToken").next(t=>{const n=t==null?void 0:t.value;return n?He.fromUint8Array(n):He.EMPTY_BYTE_STRING})}setSessionToken(e,t){return this.bt(e).put({name:"sessionToken",value:t.toUint8Array()})}}/**
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
 */class Wr{constructor(){}Dt(e,t){this.Ct(e,t),t.vt()}Ct(e,t){if("nullValue"in e)this.Ft(t,5);else if("booleanValue"in e)this.Ft(t,10),t.Mt(e.booleanValue?1:0);else if("integerValue"in e)this.Ft(t,15),t.Mt(Fe(e.integerValue));else if("doubleValue"in e){const n=Fe(e.doubleValue);isNaN(n)?this.Ft(t,13):(this.Ft(t,15),xo(n)?t.Mt(0):t.Mt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Ft(t,20),typeof n=="string"&&(n=Vn(n)),t.xt(`${n.seconds||""}`),t.Mt(n.nanos||0)}else if("stringValue"in e)this.Ot(e.stringValue,t),this.Nt(t);else if("bytesValue"in e)this.Ft(t,30),t.Bt(On(e.bytesValue)),this.Nt(t);else if("referenceValue"in e)this.Lt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Ft(t,45),t.Mt(n.latitude||0),t.Mt(n.longitude||0)}else"mapValue"in e?yy(e)?this.Ft(t,Number.MAX_SAFE_INTEGER):$c(e)?this.kt(e.mapValue,t):(this.qt(e.mapValue,t),this.Nt(t)):"arrayValue"in e?(this.Qt(e.arrayValue,t),this.Nt(t)):Y(19022,{$t:e})}Ot(e,t){this.Ft(t,25),this.Ut(e,t)}Ut(e,t){t.xt(e)}qt(e,t){const n=e.fields||{};this.Ft(t,55);for(const i of Object.keys(n))this.Ot(i,t),this.Ct(n[i],t)}kt(e,t){var o,c;const n=e.fields||{};this.Ft(t,53);const i=ns,s=((c=(o=n[i].arrayValue)==null?void 0:o.values)==null?void 0:c.length)||0;this.Ft(t,15),t.Mt(Fe(s)),this.Ot(i,t),this.Ct(n[i],t)}Qt(e,t){const n=e.values||[];this.Ft(t,50);for(const i of n)this.Ct(i,t)}Lt(e,t){this.Ft(t,37),G.fromName(e).path.forEach(n=>{this.Ft(t,60),this.Ut(n,t)})}Ft(e,t){e.Mt(t)}Nt(e){e.Mt(2)}}Wr.Kt=new Wr;/**
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
 */const ki=255;function CR(r){if(r===0)return 8;let e=0;return r>>4||(e+=4,r<<=4),r>>6||(e+=2,r<<=2),r>>7||(e+=1),e}function Tp(r){const e=64-function(n){let i=0;for(let s=0;s<8;++s){const o=CR(255&n[s]);if(i+=o,o!==8)break}return i}(r);return Math.ceil(e/8)}class kR{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Wt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Gt(n.value),n=t.next();this.zt()}jt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Jt(n.value),n=t.next();this.Ht()}Yt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Gt(n);else if(n<2048)this.Gt(960|n>>>6),this.Gt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Gt(480|n>>>12),this.Gt(128|63&n>>>6),this.Gt(128|63&n);else{const i=t.codePointAt(0);this.Gt(240|i>>>18),this.Gt(128|63&i>>>12),this.Gt(128|63&i>>>6),this.Gt(128|63&i)}}this.zt()}Zt(e){for(const t of e){const n=t.charCodeAt(0);if(n<128)this.Jt(n);else if(n<2048)this.Jt(960|n>>>6),this.Jt(128|63&n);else if(t<"\uD800"||"\uDBFF"<t)this.Jt(480|n>>>12),this.Jt(128|63&n>>>6),this.Jt(128|63&n);else{const i=t.codePointAt(0);this.Jt(240|i>>>18),this.Jt(128|63&i>>>12),this.Jt(128|63&i>>>6),this.Jt(128|63&i)}}this.Ht()}Xt(e){const t=this.en(e),n=Tp(t);this.tn(1+n),this.buffer[this.position++]=255&n;for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=255&t[i]}nn(e){const t=this.en(e),n=Tp(t);this.tn(1+n),this.buffer[this.position++]=~(255&n);for(let i=t.length-n;i<t.length;++i)this.buffer[this.position++]=~(255&t[i])}rn(){this.sn(ki),this.sn(255)}_n(){this.an(ki),this.an(255)}reset(){this.position=0}seed(e){this.tn(e.length),this.buffer.set(e,this.position),this.position+=e.length}un(){return this.buffer.slice(0,this.position)}en(e){const t=function(s){const o=new DataView(new ArrayBuffer(8));return o.setFloat64(0,s,!1),new Uint8Array(o.buffer)}(e),n=!!(128&t[0]);t[0]^=n?255:128;for(let i=1;i<t.length;++i)t[i]^=n?255:0;return t}Gt(e){const t=255&e;t===0?(this.sn(0),this.sn(255)):t===ki?(this.sn(ki),this.sn(0)):this.sn(t)}Jt(e){const t=255&e;t===0?(this.an(0),this.an(255)):t===ki?(this.an(ki),this.an(0)):this.an(e)}zt(){this.sn(0),this.sn(1)}Ht(){this.an(0),this.an(1)}sn(e){this.tn(1),this.buffer[this.position++]=e}an(e){this.tn(1),this.buffer[this.position++]=~e}tn(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const i=new Uint8Array(n);i.set(this.buffer),this.buffer=i}}class xR{constructor(e){this.cn=e}Bt(e){this.cn.Wt(e)}xt(e){this.cn.Yt(e)}Mt(e){this.cn.Xt(e)}vt(){this.cn.rn()}}class DR{constructor(e){this.cn=e}Bt(e){this.cn.jt(e)}xt(e){this.cn.Zt(e)}Mt(e){this.cn.nn(e)}vt(){this.cn._n()}}class Ws{constructor(){this.cn=new kR,this.ln=new xR(this.cn),this.hn=new DR(this.cn)}seed(e){this.cn.seed(e)}Pn(e){return e===0?this.ln:this.hn}un(){return this.cn.un()}reset(){this.cn.reset()}}/**
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
 */class Hr{constructor(e,t,n,i){this.Tn=e,this.In=t,this.En=n,this.dn=i}An(){const e=this.dn.length,t=e===0||this.dn[e-1]===255?e+1:e,n=new Uint8Array(t);return n.set(this.dn,0),t!==e?n.set([0],this.dn.length):++n[n.length-1],new Hr(this.Tn,this.In,this.En,n)}Rn(e,t,n){return{indexId:this.Tn,uid:e,arrayValue:Ha(this.En),directionalValue:Ha(this.dn),orderedDocumentKey:Ha(t),documentKey:n.path.toArray()}}Vn(e,t,n){const i=this.Rn(e,t,n);return[i.indexId,i.uid,i.arrayValue,i.directionalValue,i.orderedDocumentKey,i.documentKey]}}function Zn(r,e){let t=r.Tn-e.Tn;return t!==0?t:(t=bp(r.En,e.En),t!==0?t:(t=bp(r.dn,e.dn),t!==0?t:G.comparator(r.In,e.In)))}function bp(r,e){for(let t=0;t<r.length&&t<e.length;++t){const n=r[t]-e[t];if(n!==0)return n}return r.length-e.length}function Ha(r){return Im()?function(t){let n="";for(let i=0;i<t.length;i++)n+=String.fromCharCode(t[i]);return n}(r):r}function Ap(r){return typeof r!="string"?r:function(t){const n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n}(r)}class Sp{constructor(e){this.mn=new Pe((t,n)=>Be.comparator(t.field,n.field)),this.collectionId=e.collectionGroup!=null?e.collectionGroup:e.path.lastSegment(),this.fn=e.orderBy,this.gn=[];for(const t of e.filters){const n=t;n.isInequality()?this.mn=this.mn.add(n):this.gn.push(n)}}get pn(){return this.mn.size>1}yn(e){if(Z(e.collectionGroup===this.collectionId,49279),this.pn)return!1;const t=ru(e);if(t!==void 0&&!this.wn(t))return!1;const n=zr(e);let i=new Set,s=0,o=0;for(;s<n.length&&this.wn(n[s]);++s)i=i.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.mn.size>0){const c=this.mn.getIterator().getNext();if(!i.has(c.field.canonicalString())){const l=n[s];if(!this.Sn(c,l)||!this.bn(this.fn[o++],l))return!1}++s}for(;s<n.length;++s){const c=n[s];if(o>=this.fn.length||!this.bn(this.fn[o++],c))return!1}return!0}Dn(){if(this.pn)return null;let e=new Pe(Be.comparator);const t=[];for(const n of this.gn)if(!n.field.isKeyField())if(n.op==="array-contains"||n.op==="array-contains-any")t.push(new Ba(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new Ba(n.field,0))}for(const n of this.fn)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new Ba(n.field,n.dir==="asc"?0:1)));return new sc(sc.UNKNOWN_ID,this.collectionId,t,ko.empty())}wn(e){for(const t of this.gn)if(this.Sn(t,e))return!0;return!1}Sn(e,t){if(e===void 0||!e.field.isEqual(t.fieldPath))return!1;const n=e.op==="array-contains"||e.op==="array-contains-any";return t.kind===2===n}bn(e,t){return!!e.field.isEqual(t.fieldPath)&&(t.kind===0&&e.dir==="asc"||t.kind===1&&e.dir==="desc")}}/**
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
 */function a_(r){var t,n;if(Z(r instanceof ve||r instanceof Re,20012),r instanceof ve){if(r instanceof Sy){const i=((n=(t=r.value.arrayValue)==null?void 0:t.values)==null?void 0:n.map(s=>ve.create(r.field,"==",s)))||[];return Re.create(i,"or")}return r}const e=r.filters.map(i=>a_(i));return Re.create(e,r.op)}function NR(r){if(r.getFilters().length===0)return[];const e=Eu(a_(r));return Z(c_(e),7391),wu(e)||Iu(e)?[e]:e.getFilters()}function wu(r){return r instanceof ve}function Iu(r){return r instanceof Re&&vh(r)}function c_(r){return wu(r)||Iu(r)||function(t){if(t instanceof Re&&hu(t)){for(const n of t.getFilters())if(!wu(n)&&!Iu(n))return!1;return!0}return!1}(r)}function Eu(r){if(Z(r instanceof ve||r instanceof Re,34018),r instanceof ve)return r;if(r.filters.length===1)return Eu(r.filters[0]);const e=r.filters.map(n=>Eu(n));let t=Re.create(e,r.op);return t=fc(t),c_(t)?t:(Z(t instanceof Re,64498),Z(is(t),40251),Z(t.filters.length>1,57927),t.filters.reduce((n,i)=>Nh(n,i)))}function Nh(r,e){let t;return Z(r instanceof ve||r instanceof Re,38388),Z(e instanceof ve||e instanceof Re,25473),t=r instanceof ve?e instanceof ve?function(i,s){return Re.create([i,s],"and")}(r,e):Rp(r,e):e instanceof ve?Rp(e,r):function(i,s){if(Z(i.filters.length>0&&s.filters.length>0,48005),is(i)&&is(s))return Ty(i,s.getFilters());const o=hu(i)?i:s,c=hu(i)?s:i,l=o.filters.map(u=>Nh(u,c));return Re.create(l,"or")}(r,e),fc(t)}function Rp(r,e){if(is(e))return Ty(e,r.getFilters());{const t=e.filters.map(n=>Nh(r,n));return Re.create(t,"or")}}function fc(r){if(Z(r instanceof ve||r instanceof Re,11850),r instanceof ve)return r;const e=r.getFilters();if(e.length===1)return fc(e[0]);if(Ey(r))return r;const t=e.map(i=>fc(i)),n=[];return t.forEach(i=>{i instanceof ve?n.push(i):i instanceof Re&&(i.op===r.op?n.push(...i.filters):n.push(i))}),n.length===1?n[0]:Re.create(n,r.op)}/**
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
 */class VR{constructor(){this.Cn=new Vh}addToCollectionParentIndex(e,t){return this.Cn.add(t),b.resolve()}getCollectionParents(e,t){return b.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return b.resolve()}deleteFieldIndex(e,t){return b.resolve()}deleteAllFieldIndexes(e){return b.resolve()}createTargetIndexes(e,t){return b.resolve()}getDocumentsMatchingTarget(e,t){return b.resolve(null)}getIndexType(e,t){return b.resolve(0)}getFieldIndexes(e,t){return b.resolve([])}getNextCollectionGroupToUpdate(e){return b.resolve(null)}getMinOffset(e,t){return b.resolve(jt.min())}getMinOffsetFromCollectionGroup(e,t){return b.resolve(jt.min())}updateCollectionGroup(e,t,n){return b.resolve()}updateIndexEntries(e,t){return b.resolve()}}class Vh{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t]||new Pe(Ie.comparator),s=!i.has(n);return this.index[t]=i.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),i=this.index[t];return i&&i.has(n)}getEntries(e){return(this.index[e]||new Pe(Ie.comparator)).toArray()}}/**
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
 */const Pp="IndexedDbIndexManager",xa=new Uint8Array(0);class OR{constructor(e,t){this.databaseId=t,this.vn=new Vh,this.Fn=new Un(n=>ci(n),(n,i)=>na(n,i)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.vn.has(t)){const n=t.lastSegment(),i=t.popLast();e.addOnCommittedListener(()=>{this.vn.add(t)});const s={collectionId:n,parent:At(i)};return Cp(e).put(s)}return b.resolve()}getCollectionParents(e,t){const n=[],i=IDBKeyRange.bound([t,""],[Kg(t),""],!1,!0);return Cp(e).J(i).next(s=>{for(const o of s){if(o.collectionId!==t)break;n.push(yn(o.parent))}return n})}addFieldIndex(e,t){const n=Hs(e),i=function(c){return{indexId:c.indexId,collectionGroup:c.collectionGroup,fields:c.fields.map(l=>[l.fieldPath.canonicalString(),l.kind])}}(t);delete i.indexId;const s=n.add(i);if(t.indexState){const o=Di(e);return s.next(c=>{o.put(Ip(c,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=Hs(e),i=Di(e),s=xi(e);return n.delete(t.indexId).next(()=>i.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Hs(e),n=xi(e),i=Di(e);return t.Z().next(()=>n.Z()).next(()=>i.Z())}createTargetIndexes(e,t){return b.forEach(this.Mn(t),n=>this.getIndexType(e,n).next(i=>{if(i===0||i===1){const s=new Sp(n).Dn();if(s!=null)return this.addFieldIndex(e,s)}}))}getDocumentsMatchingTarget(e,t){const n=xi(e);let i=!0;const s=new Map;return b.forEach(this.Mn(t),o=>this.xn(e,o).next(c=>{i&&(i=!!c),s.set(o,c)})).next(()=>{if(i){let o=ge();const c=[];return b.forEach(s,(l,u)=>{$(Pp,`Using index ${function(re){return`id=${re.indexId}|cg=${re.collectionGroup}|f=${re.fields.map(_e=>`${_e.fieldPath}:${_e.kind}`).join(",")}`}(l)} to execute ${ci(t)}`);const d=function(re,_e){const Te=ru(_e);if(Te===void 0)return null;for(const de of uc(re,Te.fieldPath))switch(de.op){case"array-contains-any":return de.value.arrayValue.values||[];case"array-contains":return[de.value]}return null}(u,l),p=function(re,_e){const Te=new Map;for(const de of zr(_e))for(const E of uc(re,de.fieldPath))switch(E.op){case"==":case"in":Te.set(de.fieldPath.canonicalString(),E.value);break;case"not-in":case"!=":return Te.set(de.fieldPath.canonicalString(),E.value),Array.from(Te.values())}return null}(u,l),m=function(re,_e){const Te=[];let de=!0;for(const E of zr(_e)){const y=E.kind===0?op(re,E.fieldPath,re.startAt):ap(re,E.fieldPath,re.startAt);Te.push(y.value),de&&(de=y.inclusive)}return new Ir(Te,de)}(u,l),v=function(re,_e){const Te=[];let de=!0;for(const E of zr(_e)){const y=E.kind===0?ap(re,E.fieldPath,re.endAt):op(re,E.fieldPath,re.endAt);Te.push(y.value),de&&(de=y.inclusive)}return new Ir(Te,de)}(u,l),M=this.On(l,u,m),F=this.On(l,u,v),U=this.Nn(l,u,p),X=this.Bn(l.indexId,d,M,m.inclusive,F,v.inclusive,U);return b.forEach(X,ie=>n.Y(ie,t.limit).next(re=>{re.forEach(_e=>{const Te=G.fromSegments(_e.documentKey);o.has(Te)||(o=o.add(Te),c.push(Te))})}))}).next(()=>c)}return b.resolve(null)})}Mn(e){let t=this.Fn.get(e);return t||(e.filters.length===0?t=[e]:t=NR(Re.create(e.filters,"and")).map(n=>fu(e.path,e.collectionGroup,e.orderBy,n.getFilters(),e.limit,e.startAt,e.endAt)),this.Fn.set(e,t),t)}Bn(e,t,n,i,s,o,c){const l=(t!=null?t.length:1)*Math.max(n.length,s.length),u=l/(t!=null?t.length:1),d=[];for(let p=0;p<l;++p){const m=t?this.Ln(t[p/u]):xa,v=this.kn(e,m,n[p%u],i),M=this.qn(e,m,s[p%u],o),F=c.map(U=>this.kn(e,m,U,!0));d.push(...this.createRange(v,M,F))}return d}kn(e,t,n,i){const s=new Hr(e,G.empty(),t,n);return i?s:s.An()}qn(e,t,n,i){const s=new Hr(e,G.empty(),t,n);return i?s.An():s}xn(e,t){const n=new Sp(t),i=t.collectionGroup!=null?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,i).next(s=>{let o=null;for(const c of s)n.yn(c)&&(!o||c.fields.length>o.fields.length)&&(o=c);return o})}getIndexType(e,t){let n=2;const i=this.Mn(t);return b.forEach(i,s=>this.xn(e,s).next(o=>{o?n!==0&&o.fields.length<function(l){let u=new Pe(Be.comparator),d=!1;for(const p of l.filters)for(const m of p.getFlattenedFilters())m.field.isKeyField()||(m.op==="array-contains"||m.op==="array-contains-any"?d=!0:u=u.add(m.field));for(const p of l.orderBy)p.field.isKeyField()||(u=u.add(p.field));return u.size+(d?1:0)}(s)&&(n=1):n=0})).next(()=>function(o){return o.limit!==null}(t)&&i.length>1&&n===2?1:n)}Qn(e,t){const n=new Ws;for(const i of zr(e)){const s=t.data.field(i.fieldPath);if(s==null)return null;const o=n.Pn(i.kind);Wr.Kt.Dt(s,o)}return n.un()}Ln(e){const t=new Ws;return Wr.Kt.Dt(e,t.Pn(0)),t.un()}$n(e,t){const n=new Ws;return Wr.Kt.Dt(ai(this.databaseId,t),n.Pn(function(s){const o=zr(s);return o.length===0?0:o[o.length-1].kind}(e))),n.un()}Nn(e,t,n){if(n===null)return[];let i=[];i.push(new Ws);let s=0;for(const o of zr(e)){const c=n[s++];for(const l of i)if(this.Un(t,o.fieldPath)&&Lo(c))i=this.Kn(i,o,c);else{const u=l.Pn(o.kind);Wr.Kt.Dt(c,u)}}return this.Wn(i)}On(e,t,n){return this.Nn(e,t,n.position)}Wn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].un();return t}Kn(e,t,n){const i=[...e],s=[];for(const o of n.arrayValue.values||[])for(const c of i){const l=new Ws;l.seed(c.un()),Wr.Kt.Dt(o,l.Pn(t.kind)),s.push(l)}return s}Un(e,t){return!!e.filters.find(n=>n instanceof ve&&n.field.isEqual(t)&&(n.op==="in"||n.op==="not-in"))}getFieldIndexes(e,t){const n=Hs(e),i=Di(e);return(t?n.J(su,IDBKeyRange.bound(t,t)):n.J()).next(s=>{const o=[];return b.forEach(s,c=>i.get([c.indexId,this.uid]).next(l=>{o.push(function(d,p){const m=p?new ko(p.sequenceNumber,new jt(di(p.readTime),new G(yn(p.documentKey)),p.largestBatchId)):ko.empty(),v=d.fields.map(([M,F])=>new Ba(Be.fromServerFormat(M),F));return new sc(d.indexId,d.collectionGroup,v,m)}(c,l))})).next(()=>o)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(t=>t.length===0?null:(t.sort((n,i)=>{const s=n.indexState.sequenceNumber-i.indexState.sequenceNumber;return s!==0?s:me(n.collectionGroup,i.collectionGroup)}),t[0].collectionGroup))}updateCollectionGroup(e,t,n){const i=Hs(e),s=Di(e);return this.Gn(e).next(o=>i.J(su,IDBKeyRange.bound(t,t)).next(c=>b.forEach(c,l=>s.put(Ip(l.indexId,this.uid,o,n)))))}updateIndexEntries(e,t){const n=new Map;return b.forEach(t,(i,s)=>{const o=n.get(i.collectionGroup);return(o?b.resolve(o):this.getFieldIndexes(e,i.collectionGroup)).next(c=>(n.set(i.collectionGroup,c),b.forEach(c,l=>this.zn(e,i,l).next(u=>{const d=this.jn(s,l);return u.isEqual(d)?b.resolve():this.Jn(e,s,l,u,d)}))))})}Hn(e,t,n,i){return xi(e).put(i.Rn(this.uid,this.$n(n,t.key),t.key))}Yn(e,t,n,i){return xi(e).delete(i.Vn(this.uid,this.$n(n,t.key),t.key))}zn(e,t,n){const i=xi(e);let s=new Pe(Zn);return i.ee({index:iy,range:IDBKeyRange.only([n.indexId,this.uid,Ha(this.$n(n,t))])},(o,c)=>{s=s.add(new Hr(n.indexId,t,Ap(c.arrayValue),Ap(c.directionalValue)))}).next(()=>s)}jn(e,t){let n=new Pe(Zn);const i=this.Qn(t,e);if(i==null)return n;const s=ru(t);if(s!=null){const o=e.data.field(s.fieldPath);if(Lo(o))for(const c of o.arrayValue.values||[])n=n.add(new Hr(t.indexId,e.key,this.Ln(c),i))}else n=n.add(new Hr(t.indexId,e.key,xa,i));return n}Jn(e,t,n,i,s){$(Pp,"Updating index entries for document '%s'",t.key);const o=[];return function(l,u,d,p,m){const v=l.getIterator(),M=u.getIterator();let F=Ci(v),U=Ci(M);for(;F||U;){let X=!1,ie=!1;if(F&&U){const re=d(F,U);re<0?ie=!0:re>0&&(X=!0)}else F!=null?ie=!0:X=!0;X?(p(U),U=Ci(M)):ie?(m(F),F=Ci(v)):(F=Ci(v),U=Ci(M))}}(i,s,Zn,c=>{o.push(this.Hn(e,t,n,c))},c=>{o.push(this.Yn(e,t,n,c))}),b.waitFor(o)}Gn(e){let t=1;return Di(e).ee({index:ry,reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(n,i,s)=>{s.done(),t=i.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((o,c)=>Zn(o,c)).filter((o,c,l)=>!c||Zn(o,l[c-1])!==0);const i=[];i.push(e);for(const o of n){const c=Zn(o,e),l=Zn(o,t);if(c===0)i[0]=e.An();else if(c>0&&l<0)i.push(o),i.push(o.An());else if(l>0)break}i.push(t);const s=[];for(let o=0;o<i.length;o+=2){if(this.Zn(i[o],i[o+1]))return[];const c=i[o].Vn(this.uid,xa,G.empty()),l=i[o+1].Vn(this.uid,xa,G.empty());s.push(IDBKeyRange.bound(c,l))}return s}Zn(e,t){return Zn(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(kp)}getMinOffset(e,t){return b.mapArray(this.Mn(t),n=>this.xn(e,n).next(i=>i||Y(44426))).next(kp)}}function Cp(r){return at(r,Vo)}function xi(r){return at(r,mo)}function Hs(r){return at(r,yh)}function Di(r){return at(r,po)}function kp(r){Z(r.length!==0,28825);let e=r[0].indexState.offset,t=e.largestBatchId;for(let n=1;n<r.length;n++){const i=r[n].indexState.offset;ph(i,e)<0&&(e=i),t<i.largestBatchId&&(t=i.largestBatchId)}return new jt(e.readTime,e.documentKey,t)}/**
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
 */const xp={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},l_=41943040;class Tt{static withCacheSize(e){return new Tt(e,Tt.DEFAULT_COLLECTION_PERCENTILE,Tt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function u_(r,e,t){const n=r.store(Xt),i=r.store(Xi),s=[],o=IDBKeyRange.only(t.batchId);let c=0;const l=n.ee({range:o},(d,p,m)=>(c++,m.delete()));s.push(l.next(()=>{Z(c===1,47070,{batchId:t.batchId})}));const u=[];for(const d of t.mutations){const p=ey(e,d.key.path,t.batchId);s.push(i.delete(p)),u.push(d.key)}return b.waitFor(s).next(()=>u)}function pc(r){if(!r)return 0;let e;if(r.document)e=r.document;else if(r.unknownDocument)e=r.unknownDocument;else{if(!r.noDocument)throw Y(14731);e=r.noDocument}return JSON.stringify(e).length}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Tt.DEFAULT_COLLECTION_PERCENTILE=10,Tt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Tt.DEFAULT=new Tt(l_,Tt.DEFAULT_COLLECTION_PERCENTILE,Tt.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Tt.DISABLED=new Tt(-1,0,0);class Gc{constructor(e,t,n,i){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=i,this.Xn={}}static wt(e,t,n,i){Z(e.uid!=="",64387);const s=e.isAuthenticated()?e.uid:"";return new Gc(s,t,n,i)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return er(e).ee({index:Jr,range:n},(i,s,o)=>{t=!1,o.done()}).next(()=>t)}addMutationBatch(e,t,n,i){const s=Fi(e),o=er(e);return o.add({}).next(c=>{Z(typeof c=="number",49019);const l=new Rh(c,t,n,i),u=function(v,M,F){const U=F.baseMutations.map(ie=>Bo(v.yt,ie)),X=F.mutations.map(ie=>Bo(v.yt,ie));return{userId:M,batchId:F.batchId,localWriteTimeMs:F.localWriteTime.toMillis(),baseMutations:U,mutations:X}}(this.serializer,this.userId,l),d=[];let p=new Pe((m,v)=>me(m.canonicalString(),v.canonicalString()));for(const m of i){const v=ey(this.userId,m.key.path,c);p=p.add(m.key.path.popLast()),d.push(o.put(u)),d.push(s.put(v,mS))}return p.forEach(m=>{d.push(this.indexManager.addToCollectionParentIndex(e,m))}),e.addOnCommittedListener(()=>{this.Xn[c]=l.keys()}),b.waitFor(d).next(()=>l)})}lookupMutationBatch(e,t){return er(e).get(t).next(n=>n?(Z(n.userId===this.userId,48,"Unexpected user for mutation batch",{userId:n.userId,batchId:t}),Gr(this.serializer,n)):null)}er(e,t){return this.Xn[t]?b.resolve(this.Xn[t]):this.lookupMutationBatch(e,t).next(n=>{if(n){const i=n.keys();return this.Xn[t]=i,i}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return er(e).ee({index:Jr,range:i},(o,c,l)=>{c.userId===this.userId&&(Z(c.batchId>=n,47524,{tr:n}),s=Gr(this.serializer,c)),l.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=ur;return er(e).ee({index:Jr,range:t,reverse:!0},(i,s,o)=>{n=s.batchId,o.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,ur],[this.userId,Number.POSITIVE_INFINITY]);return er(e).J(Jr,t).next(n=>n.map(i=>Gr(this.serializer,i)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=qa(this.userId,t.path),i=IDBKeyRange.lowerBound(n),s=[];return Fi(e).ee({range:i},(o,c,l)=>{const[u,d,p]=o,m=yn(d);if(u===this.userId&&t.path.isEqual(m))return er(e).get(p).next(v=>{if(!v)throw Y(61480,{nr:o,batchId:p});Z(v.userId===this.userId,10503,"Unexpected user for mutation batch",{userId:v.userId,batchId:p}),s.push(Gr(this.serializer,v))});l.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new Pe(me);const i=[];return t.forEach(s=>{const o=qa(this.userId,s.path),c=IDBKeyRange.lowerBound(o),l=Fi(e).ee({range:c},(u,d,p)=>{const[m,v,M]=u,F=yn(v);m===this.userId&&s.path.isEqual(F)?n=n.add(M):p.done()});i.push(l)}),b.waitFor(i).next(()=>this.rr(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1,s=qa(this.userId,n),o=IDBKeyRange.lowerBound(s);let c=new Pe(me);return Fi(e).ee({range:o},(l,u,d)=>{const[p,m,v]=l,M=yn(m);p===this.userId&&n.isPrefixOf(M)?M.length===i&&(c=c.add(v)):d.done()}).next(()=>this.rr(e,c))}rr(e,t){const n=[],i=[];return t.forEach(s=>{i.push(er(e).get(s).next(o=>{if(o===null)throw Y(35274,{batchId:s});Z(o.userId===this.userId,9748,"Unexpected user for mutation batch",{userId:o.userId,batchId:s}),n.push(Gr(this.serializer,o))}))}),b.waitFor(i).next(()=>n)}removeMutationBatch(e,t){return u_(e.le,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.ir(t.batchId)}),b.forEach(n,i=>this.referenceDelegate.markPotentiallyOrphaned(e,i))))}ir(e){delete this.Xn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return b.resolve();const n=IDBKeyRange.lowerBound(function(o){return[o]}(this.userId)),i=[];return Fi(e).ee({range:n},(s,o,c)=>{if(s[0]===this.userId){const l=yn(s[1]);i.push(l)}else c.done()}).next(()=>{Z(i.length===0,56720,{sr:i.map(s=>s.canonicalString())})})})}containsKey(e,t){return h_(e,this.userId,t)}_r(e){return d_(e).get(this.userId).next(t=>t||{userId:this.userId,lastAcknowledgedBatchId:ur,lastStreamToken:""})}}function h_(r,e,t){const n=qa(e,t.path),i=n[1],s=IDBKeyRange.lowerBound(n);let o=!1;return Fi(r).ee({range:s,X:!0},(c,l,u)=>{const[d,p,m]=c;d===e&&p===i&&(o=!0),u.done()}).next(()=>o)}function er(r){return at(r,Xt)}function Fi(r){return at(r,Xi)}function d_(r){return at(r,Do)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fi{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new fi(0)}static cr(){return new fi(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class MR{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.lr(e).next(t=>{const n=new fi(t.highestTargetId);return t.highestTargetId=n.next(),this.hr(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.lr(e).next(t=>te.fromTimestamp(new Se(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.lr(e).next(t=>t.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.lr(e).next(i=>(i.highestListenSequenceNumber=t,n&&(i.lastRemoteSnapshotVersion=n.toTimestamp()),t>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=t),this.hr(e,i)))}addTargetData(e,t){return this.Pr(e,t).next(()=>this.lr(e).next(n=>(n.targetCount+=1,this.Tr(t,n),this.hr(e,n))))}updateTargetData(e,t){return this.Pr(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>Ni(e).delete(t.targetId)).next(()=>this.lr(e)).next(n=>(Z(n.targetCount>0,8065),n.targetCount-=1,this.hr(e,n)))}removeTargets(e,t,n){let i=0;const s=[];return Ni(e).ee((o,c)=>{const l=ro(c);l.sequenceNumber<=t&&n.get(l.targetId)===null&&(i++,s.push(this.removeTargetData(e,l)))}).next(()=>b.waitFor(s)).next(()=>i)}forEachTarget(e,t){return Ni(e).ee((n,i)=>{const s=ro(i);t(s)})}lr(e){return Dp(e).get(cc).next(t=>(Z(t!==null,2888),t))}hr(e,t){return Dp(e).put(cc,t)}Pr(e,t){return Ni(e).put(o_(this.serializer,t))}Tr(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.lr(e).next(t=>t.targetCount)}getTargetData(e,t){const n=ci(t),i=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return Ni(e).ee({range:i,index:ny},(o,c,l)=>{const u=ro(c);na(t,u.target)&&(s=u,l.done())}).next(()=>s)}addMatchingKeys(e,t,n){const i=[],s=rr(e);return t.forEach(o=>{const c=At(o.path);i.push(s.put({targetId:n,path:c})),i.push(this.referenceDelegate.addReference(e,n,o))}),b.waitFor(i)}removeMatchingKeys(e,t,n){const i=rr(e);return b.forEach(t,s=>{const o=At(s.path);return b.waitFor([i.delete([n,o]),this.referenceDelegate.removeReference(e,n,s)])})}removeMatchingKeysForTargetId(e,t){const n=rr(e),i=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(i)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),i=rr(e);let s=ge();return i.ee({range:n,X:!0},(o,c,l)=>{const u=yn(o[1]),d=new G(u);s=s.add(d)}).next(()=>s)}containsKey(e,t){const n=At(t.path),i=IDBKeyRange.bound([n],[Kg(n)],!1,!0);let s=0;return rr(e).ee({index:gh,X:!0,range:i},([o,c],l,u)=>{o!==0&&(s++,u.done())}).next(()=>s>0)}At(e,t){return Ni(e).get(t).next(n=>n?ro(n):null)}}function Ni(r){return at(r,Zi)}function Dp(r){return at(r,ri)}function rr(r){return at(r,es)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Np="LruGarbageCollector",LR=1048576;function Vp([r,e],[t,n]){const i=me(r,t);return i===0?me(e,n):i}class FR{constructor(e){this.Ir=e,this.buffer=new Pe(Vp),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const n=this.buffer.last();Vp(t,n)<0&&(this.buffer=this.buffer.delete(n).add(t))}}get maxValue(){return this.buffer.last()[0]}}class f_{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){$(Np,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Rr(t)?$(Np,"Ignoring IndexedDB error during garbage collection: ",t):await Sr(t)}await this.Vr(3e5)})}}class UR{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next(n=>Math.floor(t/100*n))}nthSequenceNumber(e,t){if(t===0)return b.resolve(Ot.ce);const n=new FR(t);return this.mr.forEachTarget(e,i=>n.Ar(i.sequenceNumber)).next(()=>this.mr.pr(e,i=>n.Ar(i))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.mr.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?($("LruGarbageCollector","Garbage collection skipped; disabled"),b.resolve(xp)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?($("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),xp):this.yr(e,t))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let n,i,s,o,c,l,u;const d=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(p=>(p>this.params.maximumSequenceNumbersToCollect?($("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),i=this.params.maximumSequenceNumbersToCollect):i=p,o=Date.now(),this.nthSequenceNumber(e,i))).next(p=>(n=p,c=Date.now(),this.removeTargets(e,n,t))).next(p=>(s=p,l=Date.now(),this.removeOrphanedDocuments(e,n))).next(p=>(u=Date.now(),Vi()<=we.DEBUG&&$("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${o-d}ms
	Determined least recently used ${i} in `+(c-o)+`ms
	Removed ${s} targets in `+(l-c)+`ms
	Removed ${p} documents in `+(u-l)+`ms
Total Duration: ${u-d}ms`),b.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:s,documentsRemoved:p})))}}function p_(r,e){return new UR(r,e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class BR{constructor(e,t){this.db=e,this.garbageCollector=p_(this,t)}gr(e){const t=this.wr(e);return this.db.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}pr(e,t){return this.Sr(e,(n,i)=>t(i))}addReference(e,t,n){return Da(e,n)}removeReference(e,t,n){return Da(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return Da(e,t)}br(e,t){return function(i,s){let o=!1;return d_(i).te(c=>h_(i,c,s).next(l=>(l&&(o=!0),b.resolve(!l)))).next(()=>o)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),i=[];let s=0;return this.Sr(e,(o,c)=>{if(c<=t){const l=this.br(e,o).next(u=>{if(!u)return s++,n.getEntry(e,o).next(()=>(n.removeEntry(o,te.min()),rr(e).delete(function(p){return[0,At(p.path)]}(o))))});i.push(l)}}).next(()=>b.waitFor(i)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return Da(e,t)}Sr(e,t){const n=rr(e);let i,s=Ot.ce;return n.ee({index:gh},([o,c],{path:l,sequenceNumber:u})=>{o===0?(s!==Ot.ce&&t(new G(yn(i)),s),s=u,i=l):s=Ot.ce}).next(()=>{s!==Ot.ce&&t(new G(yn(i)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Da(r,e){return rr(r).put(function(n,i){return{targetId:0,path:At(n.path),sequenceNumber:i}}(e,r.currentSequenceNumber))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class m_{constructor(){this.changes=new Un(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,Le.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return n!==void 0?b.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qR{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return qr(e).put(n)}removeEntry(e,t,n){return qr(e).delete(function(s,o){const c=s.path.toArray();return[c.slice(0,c.length-2),c[c.length-2],dc(o),c[c.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.Dr(e,n)))}getEntry(e,t){let n=Le.newInvalidDocument(t);return qr(e).ee({index:$a,range:IDBKeyRange.only(Qs(t))},(i,s)=>{n=this.Cr(t,s)}).next(()=>n)}vr(e,t){let n={size:0,document:Le.newInvalidDocument(t)};return qr(e).ee({index:$a,range:IDBKeyRange.only(Qs(t))},(i,s)=>{n={document:this.Cr(t,s),size:pc(s)}}).next(()=>n)}getEntries(e,t){let n=Lt();return this.Fr(e,t,(i,s)=>{const o=this.Cr(i,s);n=n.insert(i,o)}).next(()=>n)}Mr(e,t){let n=Lt(),i=new Ve(G.comparator);return this.Fr(e,t,(s,o)=>{const c=this.Cr(s,o);n=n.insert(s,c),i=i.insert(s,pc(o))}).next(()=>({documents:n,Or:i}))}Fr(e,t,n){if(t.isEmpty())return b.resolve();let i=new Pe(Lp);t.forEach(l=>i=i.add(l));const s=IDBKeyRange.bound(Qs(i.first()),Qs(i.last())),o=i.getIterator();let c=o.getNext();return qr(e).ee({index:$a,range:s},(l,u,d)=>{const p=G.fromSegments([...u.prefixPath,u.collectionGroup,u.documentId]);for(;c&&Lp(c,p)<0;)n(c,null),c=o.getNext();c&&c.isEqual(p)&&(n(c,u),c=o.hasNext()?o.getNext():null),c?d.j(Qs(c)):d.done()}).next(()=>{for(;c;)n(c,null),c=o.hasNext()?o.getNext():null})}getDocumentsMatchingQuery(e,t,n,i,s){const o=t.path,c=[o.popLast().toArray(),o.lastSegment(),dc(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],l=[o.popLast().toArray(),o.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return qr(e).J(IDBKeyRange.bound(c,l,!0)).next(u=>{s==null||s.incrementDocumentReadCount(u.length);let d=Lt();for(const p of u){const m=this.Cr(G.fromSegments(p.prefixPath.concat(p.collectionGroup,p.documentId)),p);m.isFoundDocument()&&(ia(t,m)||i.has(m.key))&&(d=d.insert(m.key,m))}return d})}getAllFromCollectionGroup(e,t,n,i){let s=Lt();const o=Mp(t,n),c=Mp(t,jt.max());return qr(e).ee({index:ty,range:IDBKeyRange.bound(o,c,!0)},(l,u,d)=>{const p=this.Cr(G.fromSegments(u.prefixPath.concat(u.collectionGroup,u.documentId)),u);s=s.insert(p.key,p),s.size===i&&d.done()}).next(()=>s)}newChangeBuffer(e){return new $R(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(t=>t.byteSize)}getMetadata(e){return Op(e).get(iu).next(t=>(Z(!!t,20021),t))}Dr(e,t){return Op(e).put(iu,t)}Cr(e,t){if(t){const n=SR(this.serializer,t);if(!(n.isNoDocument()&&n.version.isEqual(te.min())))return n}return Le.newInvalidDocument(e)}}function g_(r){return new qR(r)}class $R extends m_{constructor(e,t){super(),this.Nr=e,this.trackRemovals=t,this.Br=new Un(n=>n.toString(),(n,i)=>n.isEqual(i))}applyChanges(e){const t=[];let n=0,i=new Pe((s,o)=>me(s.canonicalString(),o.canonicalString()));return this.changes.forEach((s,o)=>{const c=this.Br.get(s);if(t.push(this.Nr.removeEntry(e,s,c.readTime)),o.isValidDocument()){const l=_p(this.Nr.serializer,o);i=i.add(s.path.popLast());const u=pc(l);n+=u-c.size,t.push(this.Nr.addEntry(e,s,l))}else if(n-=c.size,this.trackRemovals){const l=_p(this.Nr.serializer,o.convertToNoDocument(te.min()));t.push(this.Nr.addEntry(e,s,l))}}),i.forEach(s=>{t.push(this.Nr.indexManager.addToCollectionParentIndex(e,s))}),t.push(this.Nr.updateMetadata(e,n)),b.waitFor(t)}getFromCache(e,t){return this.Nr.vr(e,t).next(n=>(this.Br.set(t,{size:n.size,readTime:n.document.readTime}),n.document))}getAllFromCache(e,t){return this.Nr.Mr(e,t).next(({documents:n,Or:i})=>(i.forEach((s,o)=>{this.Br.set(s,{size:o,readTime:n.get(s).readTime})}),n))}}function Op(r){return at(r,No)}function qr(r){return at(r,ac)}function Qs(r){const e=r.path.toArray();return[e.slice(0,e.length-2),e[e.length-2],e[e.length-1]]}function Mp(r,e){const t=e.documentKey.path.toArray();return[r,dc(e.readTime),t.slice(0,t.length-2),t.length>0?t[t.length-1]:""]}function Lp(r,e){const t=r.path.toArray(),n=e.path.toArray();let i=0;for(let s=0;s<t.length-2&&s<n.length-2;++s)if(i=me(t[s],n[s]),i)return i;return i=me(t.length,n.length),i||(i=me(t[t.length-2],n[n.length-2]),i||me(t[t.length-1],n[n.length-1]))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class zR{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class y_{constructor(e,t,n,i){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=i}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(i=>(n=i,this.remoteDocumentCache.getEntry(e,t))).next(i=>(n!==null&&_o(n.mutation,i,Mt.empty(),Se.now()),i))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.getLocalViewOfDocuments(e,n,ge()).next(()=>n))}getLocalViewOfDocuments(e,t,n=ge()){const i=_n();return this.populateOverlays(e,i,t).next(()=>this.computeViews(e,t,i,n).next(s=>{let o=to();return s.forEach((c,l)=>{o=o.insert(c,l.overlayedDocument)}),o}))}getOverlayedDocuments(e,t){const n=_n();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,ge()))}populateOverlays(e,t,n){const i=[];return n.forEach(s=>{t.has(s)||i.push(s)}),this.documentOverlayCache.getOverlays(e,i).next(s=>{s.forEach((o,c)=>{t.set(o,c)})})}computeViews(e,t,n,i){let s=Lt();const o=yo(),c=function(){return yo()}();return t.forEach((l,u)=>{const d=n.get(u.key);i.has(u.key)&&(d===void 0||d.mutation instanceof Bn)?s=s.insert(u.key,u):d!==void 0?(o.set(u.key,d.mutation.getFieldMask()),_o(d.mutation,u,d.mutation.getFieldMask(),Se.now())):o.set(u.key,Mt.empty())}),this.recalculateAndSaveOverlays(e,s).next(l=>(l.forEach((u,d)=>o.set(u,d)),t.forEach((u,d)=>c.set(u,new zR(d,o.get(u)??null))),c))}recalculateAndSaveOverlays(e,t){const n=yo();let i=new Ve((o,c)=>o-c),s=ge();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(o=>{for(const c of o)c.keys().forEach(l=>{const u=t.get(l);if(u===null)return;let d=n.get(l)||Mt.empty();d=c.applyToLocalView(u,d),n.set(l,d);const p=(i.get(c.batchId)||ge()).add(l);i=i.insert(c.batchId,p)})}).next(()=>{const o=[],c=i.getReverseIterator();for(;c.hasNext();){const l=c.getNext(),u=l.key,d=l.value,p=Ny();d.forEach(m=>{if(!s.has(m)){const v=By(t.get(m),n.get(m));v!==null&&p.set(m,v),s=s.add(m)}}),o.push(this.documentOverlayCache.saveOverlays(e,u,p))}return b.waitFor(o)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(n=>this.recalculateAndSaveOverlays(e,n))}getDocumentsMatchingQuery(e,t,n,i){return function(o){return G.isDocumentKey(o.path)&&o.collectionGroup===null&&o.filters.length===0}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):Th(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,i):this.getDocumentsMatchingCollectionQuery(e,t,n,i)}getNextDocuments(e,t,n,i){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,i).next(s=>{const o=i-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,i-s.size):b.resolve(_n());let c=Ji,l=s;return o.next(u=>b.forEach(u,(d,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),s.get(d)?b.resolve():this.remoteDocumentCache.getEntry(e,d).next(m=>{l=l.insert(d,m)}))).next(()=>this.populateOverlays(e,u,s)).next(()=>this.computeViews(e,l,u,ge())).next(d=>({batchId:c,changes:Dy(d)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new G(t)).next(n=>{let i=to();return n.isFoundDocument()&&(i=i.insert(n.key,n)),i})}getDocumentsMatchingCollectionGroupQuery(e,t,n,i){const s=t.collectionGroup;let o=to();return this.indexManager.getCollectionParents(e,s).next(c=>b.forEach(c,l=>{const u=function(p,m){return new Fn(m,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)}(t,l.child(s));return this.getDocumentsMatchingCollectionQuery(e,u,n,i).next(d=>{d.forEach((p,m)=>{o=o.insert(p,m)})})}).next(()=>o))}getDocumentsMatchingCollectionQuery(e,t,n,i){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(o=>(s=o,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,i))).next(o=>{s.forEach((l,u)=>{const d=u.getKey();o.get(d)===null&&(o=o.insert(d,Le.newInvalidDocument(d)))});let c=to();return o.forEach((l,u)=>{const d=s.get(l);d!==void 0&&_o(d.mutation,u,Mt.empty(),Se.now()),ia(t,u)&&(c=c.insert(l,u))}),c})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class KR{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return b.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,function(i){return{id:i.id,version:i.version,createTime:et(i.createTime)}}(t)),b.resolve()}getNamedQuery(e,t){return b.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,function(i){return{name:i.name,query:Dh(i.bundledQuery),readTime:et(i.readTime)}}(t)),b.resolve()}}/**
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
 */class jR{constructor(){this.overlays=new Ve(G.comparator),this.qr=new Map}getOverlay(e,t){return b.resolve(this.overlays.get(t))}getOverlays(e,t){const n=_n();return b.forEach(t,i=>this.getOverlay(e,i).next(s=>{s!==null&&n.set(i,s)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((i,s)=>{this.St(e,t,s)}),b.resolve()}removeOverlaysForBatchId(e,t,n){const i=this.qr.get(n);return i!==void 0&&(i.forEach(s=>this.overlays=this.overlays.remove(s)),this.qr.delete(n)),b.resolve()}getOverlaysForCollection(e,t,n){const i=_n(),s=t.length+1,o=new G(t.child("")),c=this.overlays.getIteratorFrom(o);for(;c.hasNext();){const l=c.getNext().value,u=l.getKey();if(!t.isPrefixOf(u.path))break;u.path.length===s&&l.largestBatchId>n&&i.set(l.getKey(),l)}return b.resolve(i)}getOverlaysForCollectionGroup(e,t,n,i){let s=new Ve((u,d)=>u-d);const o=this.overlays.getIterator();for(;o.hasNext();){const u=o.getNext().value;if(u.getKey().getCollectionGroup()===t&&u.largestBatchId>n){let d=s.get(u.largestBatchId);d===null&&(d=_n(),s=s.insert(u.largestBatchId,d)),d.set(u.getKey(),u)}}const c=_n(),l=s.getIterator();for(;l.hasNext()&&(l.getNext().value.forEach((u,d)=>c.set(u,d)),!(c.size()>=i)););return b.resolve(c)}St(e,t,n){const i=this.overlays.get(n.key);if(i!==null){const o=this.qr.get(i.largestBatchId).delete(n.key);this.qr.set(i.largestBatchId,o)}this.overlays=this.overlays.insert(n.key,new Ch(t,n));let s=this.qr.get(t);s===void 0&&(s=ge(),this.qr.set(t,s)),this.qr.set(t,s.add(n.key))}}/**
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
 */class GR{constructor(){this.sessionToken=He.EMPTY_BYTE_STRING}getSessionToken(e){return b.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,b.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oh{constructor(){this.Qr=new Pe(ut.$r),this.Ur=new Pe(ut.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const n=new ut(e,t);this.Qr=this.Qr.add(n),this.Ur=this.Ur.add(n)}Wr(e,t){e.forEach(n=>this.addReference(n,t))}removeReference(e,t){this.Gr(new ut(e,t))}zr(e,t){e.forEach(n=>this.removeReference(n,t))}jr(e){const t=new G(new Ie([])),n=new ut(t,e),i=new ut(t,e+1),s=[];return this.Ur.forEachInRange([n,i],o=>{this.Gr(o),s.push(o.key)}),s}Jr(){this.Qr.forEach(e=>this.Gr(e))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new G(new Ie([])),n=new ut(t,e),i=new ut(t,e+1);let s=ge();return this.Ur.forEachInRange([n,i],o=>{s=s.add(o.key)}),s}containsKey(e){const t=new ut(e,0),n=this.Qr.firstAfterOrEqual(t);return n!==null&&e.isEqual(n.key)}}class ut{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return G.comparator(e.key,t.key)||me(e.Yr,t.Yr)}static Kr(e,t){return me(e.Yr,t.Yr)||G.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class WR{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new Pe(ut.$r)}checkEmpty(e){return b.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,n,i){const s=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const o=new Rh(s,t,n,i);this.mutationQueue.push(o);for(const c of i)this.Zr=this.Zr.add(new ut(c.key,s)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return b.resolve(o)}lookupMutationBatch(e,t){return b.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,i=this.ei(n),s=i<0?0:i;return b.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return b.resolve(this.mutationQueue.length===0?ur:this.tr-1)}getAllMutationBatches(e){return b.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new ut(t,0),i=new ut(t,Number.POSITIVE_INFINITY),s=[];return this.Zr.forEachInRange([n,i],o=>{const c=this.Xr(o.Yr);s.push(c)}),b.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new Pe(me);return t.forEach(i=>{const s=new ut(i,0),o=new ut(i,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([s,o],c=>{n=n.add(c.Yr)})}),b.resolve(this.ti(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,i=n.length+1;let s=n;G.isDocumentKey(s)||(s=s.child(""));const o=new ut(new G(s),0);let c=new Pe(me);return this.Zr.forEachWhile(l=>{const u=l.key.path;return!!n.isPrefixOf(u)&&(u.length===i&&(c=c.add(l.Yr)),!0)},o),b.resolve(this.ti(c))}ti(e){const t=[];return e.forEach(n=>{const i=this.Xr(n);i!==null&&t.push(i)}),t}removeMutationBatch(e,t){Z(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let n=this.Zr;return b.forEach(t.mutations,i=>{const s=new ut(i.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,i.key)}).next(()=>{this.Zr=n})}ir(e){}containsKey(e,t){const n=new ut(t,0),i=this.Zr.firstAfterOrEqual(n);return b.resolve(t.isEqual(i&&i.key))}performConsistencyCheck(e){return this.mutationQueue.length,b.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class HR{constructor(e){this.ri=e,this.docs=function(){return new Ve(G.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,i=this.docs.get(n),s=i?i.size:0,o=this.ri(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:o}),this.size+=o-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return b.resolve(n?n.document.mutableCopy():Le.newInvalidDocument(t))}getEntries(e,t){let n=Lt();return t.forEach(i=>{const s=this.docs.get(i);n=n.insert(i,s?s.document.mutableCopy():Le.newInvalidDocument(i))}),b.resolve(n)}getDocumentsMatchingQuery(e,t,n,i){let s=Lt();const o=t.path,c=new G(o.child("__id-9223372036854775808__")),l=this.docs.getIteratorFrom(c);for(;l.hasNext();){const{key:u,value:{document:d}}=l.getNext();if(!o.isPrefixOf(u.path))break;u.path.length>o.length+1||ph(Qg(d),n)<=0||(i.has(d.key)||ia(t,d))&&(s=s.insert(d.key,d.mutableCopy()))}return b.resolve(s)}getAllFromCollectionGroup(e,t,n,i){Y(9500)}ii(e,t){return b.forEach(this.docs,n=>t(n))}newChangeBuffer(e){return new QR(this)}getSize(e){return b.resolve(this.size)}}class QR extends m_{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach((n,i)=>{i.isValidDocument()?t.push(this.Nr.addEntry(e,i)):this.Nr.removeEntry(n)}),b.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YR{constructor(e){this.persistence=e,this.si=new Un(t=>ci(t),na),this.lastRemoteSnapshotVersion=te.min(),this.highestTargetId=0,this.oi=0,this._i=new Oh,this.targetCount=0,this.ai=fi.ur()}forEachTarget(e,t){return this.si.forEach((n,i)=>t(i)),b.resolve()}getLastRemoteSnapshotVersion(e){return b.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return b.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),b.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.oi&&(this.oi=t),b.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new fi(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,b.resolve()}updateTargetData(e,t){return this.Pr(t),b.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,b.resolve()}removeTargets(e,t,n){let i=0;const s=[];return this.si.forEach((o,c)=>{c.sequenceNumber<=t&&n.get(c.targetId)===null&&(this.si.delete(o),s.push(this.removeMatchingKeysForTargetId(e,c.targetId)),i++)}),b.waitFor(s).next(()=>i)}getTargetCount(e){return b.resolve(this.targetCount)}getTargetData(e,t){const n=this.si.get(t)||null;return b.resolve(n)}addMatchingKeys(e,t,n){return this._i.Wr(t,n),b.resolve()}removeMatchingKeys(e,t,n){this._i.zr(t,n);const i=this.persistence.referenceDelegate,s=[];return i&&t.forEach(o=>{s.push(i.markPotentiallyOrphaned(e,o))}),b.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),b.resolve()}getMatchingKeysForTargetId(e,t){const n=this._i.Hr(t);return b.resolve(n)}containsKey(e,t){return b.resolve(this._i.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mh{constructor(e,t){this.ui={},this.overlays={},this.ci=new Ot(0),this.li=!1,this.li=!0,this.hi=new GR,this.referenceDelegate=e(this),this.Pi=new YR(this),this.indexManager=new VR,this.remoteDocumentCache=function(i){return new HR(i)}(n=>this.referenceDelegate.Ti(n)),this.serializer=new s_(t),this.Ii=new KR(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new jR,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.ui[e.toKey()];return n||(n=new WR(t,this.referenceDelegate),this.ui[e.toKey()]=n),n}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,n){$("MemoryPersistence","Starting transaction:",e);const i=new JR(this.ci.next());return this.referenceDelegate.Ei(),n(i).next(s=>this.referenceDelegate.di(i).next(()=>s)).toPromise().then(s=>(i.raiseOnCommittedEvent(),s))}Ai(e,t){return b.or(Object.values(this.ui).map(n=>()=>n.containsKey(e,t)))}}class JR extends Jg{constructor(e){super(),this.currentSequenceNumber=e}}class Wc{constructor(e){this.persistence=e,this.Ri=new Oh,this.Vi=null}static mi(e){return new Wc(e)}get fi(){if(this.Vi)return this.Vi;throw Y(60996)}addReference(e,t,n){return this.Ri.addReference(n,t),this.fi.delete(n.toString()),b.resolve()}removeReference(e,t,n){return this.Ri.removeReference(n,t),this.fi.add(n.toString()),b.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),b.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach(i=>this.fi.add(i.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(i=>{i.forEach(s=>this.fi.add(s.toString()))}).next(()=>n.removeTargetData(e,t))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return b.forEach(this.fi,n=>{const i=G.fromPath(n);return this.gi(e,i).next(s=>{s||t.removeEntry(i,te.min())})}).next(()=>(this.Vi=null,t.apply(e)))}updateLimboDocument(e,t){return this.gi(e,t).next(n=>{n?this.fi.delete(t.toString()):this.fi.add(t.toString())})}Ti(e){return 0}gi(e,t){return b.or([()=>b.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class mc{constructor(e,t){this.persistence=e,this.pi=new Un(n=>At(n.path),(n,i)=>n.isEqual(i)),this.garbageCollector=p_(this,t)}static mi(e,t){return new mc(e,t)}Ei(){}di(e){return b.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next(n=>t.next(i=>n+i))}wr(e){let t=0;return this.pr(e,n=>{t++}).next(()=>t)}pr(e,t){return b.forEach(this.pi,(n,i)=>this.br(e,n,i).next(s=>s?b.resolve():t(i)))}removeTargets(e,t,n){return this.persistence.getTargetCache().removeTargets(e,t,n)}removeOrphanedDocuments(e,t){let n=0;const i=this.persistence.getRemoteDocumentCache(),s=i.newChangeBuffer();return i.ii(e,o=>this.br(e,o,t).next(c=>{c||(n++,s.removeEntry(o,te.min()))})).next(()=>s.apply(e)).next(()=>n)}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),b.resolve()}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,n)}addReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),b.resolve()}removeReference(e,t,n){return this.pi.set(n,e.currentSequenceNumber),b.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),b.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=Ka(e.data.value)),t}br(e,t,n){return b.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const i=this.pi.get(t);return b.resolve(i!==void 0&&i>n)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class XR{constructor(e){this.serializer=e}k(e,t,n,i){const s=new Mc("createOrUpgrade",t);n<1&&i>=1&&(function(l){l.createObjectStore(ta)}(e),function(l){l.createObjectStore(Do,{keyPath:pS}),l.createObjectStore(Xt,{keyPath:Hf,autoIncrement:!0}).createIndex(Jr,Qf,{unique:!0}),l.createObjectStore(Xi)}(e),Fp(e),function(l){l.createObjectStore(Kr)}(e));let o=b.resolve();return n<3&&i>=3&&(n!==0&&(function(l){l.deleteObjectStore(es),l.deleteObjectStore(Zi),l.deleteObjectStore(ri)}(e),Fp(e)),o=o.next(()=>function(l){const u=l.store(ri),d={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:te.min().toTimestamp(),targetCount:0};return u.put(cc,d)}(s))),n<4&&i>=4&&(n!==0&&(o=o.next(()=>function(l,u){return u.store(Xt).J().next(p=>{l.deleteObjectStore(Xt),l.createObjectStore(Xt,{keyPath:Hf,autoIncrement:!0}).createIndex(Jr,Qf,{unique:!0});const m=u.store(Xt),v=p.map(M=>m.put(M));return b.waitFor(v)})}(e,s))),o=o.next(()=>{(function(l){l.createObjectStore(ts,{keyPath:TS})})(e)})),n<5&&i>=5&&(o=o.next(()=>this.yi(s))),n<6&&i>=6&&(o=o.next(()=>(function(l){l.createObjectStore(No)}(e),this.wi(s)))),n<7&&i>=7&&(o=o.next(()=>this.Si(s))),n<8&&i>=8&&(o=o.next(()=>this.bi(e,s))),n<9&&i>=9&&(o=o.next(()=>{(function(l){l.objectStoreNames.contains("remoteDocumentChanges")&&l.deleteObjectStore("remoteDocumentChanges")})(e)})),n<10&&i>=10&&(o=o.next(()=>this.Di(s))),n<11&&i>=11&&(o=o.next(()=>{(function(l){l.createObjectStore(Lc,{keyPath:bS})})(e),function(l){l.createObjectStore(Fc,{keyPath:AS})}(e)})),n<12&&i>=12&&(o=o.next(()=>{(function(l){const u=l.createObjectStore(Uc,{keyPath:DS});u.createIndex(ou,NS,{unique:!1}),u.createIndex(sy,VS,{unique:!1})})(e)})),n<13&&i>=13&&(o=o.next(()=>function(l){const u=l.createObjectStore(ac,{keyPath:gS});u.createIndex($a,yS),u.createIndex(ty,_S)}(e)).next(()=>this.Ci(e,s)).next(()=>e.deleteObjectStore(Kr))),n<14&&i>=14&&(o=o.next(()=>this.Fi(e,s))),n<15&&i>=15&&(o=o.next(()=>function(l){l.createObjectStore(yh,{keyPath:SS,autoIncrement:!0}).createIndex(su,RS,{unique:!1}),l.createObjectStore(po,{keyPath:PS}).createIndex(ry,CS,{unique:!1}),l.createObjectStore(mo,{keyPath:kS}).createIndex(iy,xS,{unique:!1})}(e))),n<16&&i>=16&&(o=o.next(()=>{t.objectStore(po).clear()}).next(()=>{t.objectStore(mo).clear()})),n<17&&i>=17&&(o=o.next(()=>{(function(l){l.createObjectStore(_h,{keyPath:OS})})(e)})),n<18&&i>=18&&Im()&&(o=o.next(()=>{t.objectStore(po).clear()}).next(()=>{t.objectStore(mo).clear()})),o}wi(e){let t=0;return e.store(Kr).ee((n,i)=>{t+=pc(i)}).next(()=>{const n={byteSize:t};return e.store(No).put(iu,n)})}yi(e){const t=e.store(Do),n=e.store(Xt);return t.J().next(i=>b.forEach(i,s=>{const o=IDBKeyRange.bound([s.userId,ur],[s.userId,s.lastAcknowledgedBatchId]);return n.J(Jr,o).next(c=>b.forEach(c,l=>{Z(l.userId===s.userId,18650,"Cannot process batch from unexpected user",{batchId:l.batchId});const u=Gr(this.serializer,l);return u_(e,s.userId,u).next(()=>{})}))}))}Si(e){const t=e.store(es),n=e.store(Kr);return e.store(ri).get(cc).next(i=>{const s=[];return n.ee((o,c)=>{const l=new Ie(o),u=function(p){return[0,At(p)]}(l);s.push(t.get(u).next(d=>d?b.resolve():(p=>t.put({targetId:0,path:At(p),sequenceNumber:i.highestListenSequenceNumber}))(l)))}).next(()=>b.waitFor(s))})}bi(e,t){e.createObjectStore(Vo,{keyPath:vS});const n=t.store(Vo),i=new Vh,s=o=>{if(i.add(o)){const c=o.lastSegment(),l=o.popLast();return n.put({collectionId:c,parent:At(l)})}};return t.store(Kr).ee({X:!0},(o,c)=>{const l=new Ie(o);return s(l.popLast())}).next(()=>t.store(Xi).ee({X:!0},([o,c,l],u)=>{const d=yn(c);return s(d.popLast())}))}Di(e){const t=e.store(Zi);return t.ee((n,i)=>{const s=ro(i),o=o_(this.serializer,s);return t.put(o)})}Ci(e,t){const n=t.store(Kr),i=[];return n.ee((s,o)=>{const c=t.store(ac),l=function(p){return p.document?new G(Ie.fromString(p.document.name).popFirst(5)):p.noDocument?G.fromSegments(p.noDocument.path):p.unknownDocument?G.fromSegments(p.unknownDocument.path):Y(36783)}(o).path.toArray(),u={prefixPath:l.slice(0,l.length-2),collectionGroup:l[l.length-2],documentId:l[l.length-1],readTime:o.readTime||[0,0],unknownDocument:o.unknownDocument,noDocument:o.noDocument,document:o.document,hasCommittedMutations:!!o.hasCommittedMutations};i.push(c.put(u))}).next(()=>b.waitFor(i))}Fi(e,t){const n=t.store(Xt),i=g_(this.serializer),s=new Mh(Wc.mi,this.serializer.yt);return n.J().next(o=>{const c=new Map;return o.forEach(l=>{let u=c.get(l.userId)??ge();Gr(this.serializer,l).keys().forEach(d=>u=u.add(d)),c.set(l.userId,u)}),b.forEach(c,(l,u)=>{const d=new ht(u),p=jc.wt(this.serializer,d),m=s.getIndexManager(d),v=Gc.wt(d,this.serializer,m,s.referenceDelegate);return new y_(i,v,p,m).recalculateAndSaveOverlaysForDocumentKeys(new au(t,Ot.ce),l).next()})})}}function Fp(r){r.createObjectStore(es,{keyPath:IS}).createIndex(gh,ES,{unique:!0}),r.createObjectStore(Zi,{keyPath:"targetId"}).createIndex(ny,wS,{unique:!0}),r.createObjectStore(ri)}const tr="IndexedDbPersistence",Ml=18e5,Ll=5e3,Fl="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",__="main";class Lh{constructor(e,t,n,i,s,o,c,l,u,d,p=18){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.Mi=s,this.window=o,this.document=c,this.xi=u,this.Oi=d,this.Ni=p,this.ci=null,this.li=!1,this.isPrimary=!1,this.networkEnabled=!0,this.Bi=null,this.inForeground=!1,this.Li=null,this.ki=null,this.qi=Number.NEGATIVE_INFINITY,this.Qi=m=>Promise.resolve(),!Lh.v())throw new B(P.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new BR(this,i),this.$i=t+__,this.serializer=new s_(l),this.Ui=new wn(this.$i,this.Ni,new XR(this.serializer)),this.hi=new PR,this.Pi=new MR(this.referenceDelegate,this.serializer),this.remoteDocumentCache=g_(this.serializer),this.Ii=new RR,this.window&&this.window.localStorage?this.Ki=this.window.localStorage:(this.Ki=null,d===!1&&Ze(tr,"LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Wi().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new B(P.FAILED_PRECONDITION,Fl);return this.Gi(),this.zi(),this.ji(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Pi.getHighestSequenceNumber(e))}).then(e=>{this.ci=new Ot(e,this.xi)}).then(()=>{this.li=!0}).catch(e=>(this.Ui&&this.Ui.close(),Promise.reject(e)))}Ji(e){return this.Qi=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ui.$(async t=>{t.newVersion===null&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.Mi.enqueueAndForget(async()=>{this.started&&await this.Wi()}))}Wi(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>Na(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.Hi(e).next(t=>{t||(this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)))})}).next(()=>this.Yi(e)).next(t=>this.isPrimary&&!t?this.Zi(e).next(()=>!1):!!t&&this.Xi(e).next(()=>!0))).catch(e=>{if(Rr(e))return $(tr,"Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return $(tr,"Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.Mi.enqueueRetryable(()=>this.Qi(e)),this.isPrimary=e})}Hi(e){return Ys(e).get(Pi).next(t=>b.resolve(this.es(t)))}ts(e){return Na(e).delete(this.clientId)}async ns(){if(this.isPrimary&&!this.rs(this.qi,Ml)){this.qi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",t=>{const n=at(t,ts);return n.J().next(i=>{const s=this.ss(i,Ml),o=i.filter(c=>s.indexOf(c)===-1);return b.forEach(o,c=>n.delete(c.clientId)).next(()=>o)})}).catch(()=>[]);if(this.Ki)for(const t of e)this.Ki.removeItem(this._s(t.clientId))}}ji(){this.ki=this.Mi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Wi().then(()=>this.ns()).then(()=>this.ji()))}es(e){return!!e&&e.ownerId===this.clientId}Yi(e){return this.Oi?b.resolve(!0):Ys(e).get(Pi).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Ll)&&!this.us(t.ownerId)){if(this.es(t)&&this.networkEnabled)return!0;if(!this.es(t)){if(!t.allowTabSynchronization)throw new B(P.FAILED_PRECONDITION,Fl);return!1}}return!(!this.networkEnabled||!this.inForeground)||Na(e).J().next(n=>this.ss(n,Ll).find(i=>{if(this.clientId!==i.clientId){const s=!this.networkEnabled&&i.networkEnabled,o=!this.inForeground&&i.inForeground,c=this.networkEnabled===i.networkEnabled;if(s||o&&c)return!0}return!1})===void 0)}).next(t=>(this.isPrimary!==t&&$(tr,`Client ${t?"is":"is not"} eligible for a primary lease.`),t))}async shutdown(){this.li=!1,this.cs(),this.ki&&(this.ki.cancel(),this.ki=null),this.ls(),this.hs(),await this.Ui.runTransaction("shutdown","readwrite",[ta,ts],e=>{const t=new au(e,Ot.ce);return this.Zi(t).next(()=>this.ts(t))}),this.Ui.close(),this.Ps()}ss(e,t){return e.filter(n=>this.rs(n.updateTimeMs,t)&&!this.us(n.clientId))}Ts(){return this.runTransaction("getActiveClients","readonly",e=>Na(e).J().next(t=>this.ss(t,Ml).map(n=>n.clientId)))}get started(){return this.li}getGlobalsCache(){return this.hi}getMutationQueue(e,t){return Gc.wt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new OR(e,this.serializer.yt.databaseId)}getDocumentOverlayCache(e){return jc.wt(this.serializer,e)}getBundleCache(){return this.Ii}runTransaction(e,t,n){$(tr,"Starting transaction:",e);const i=t==="readonly"?"readonly":"readwrite",s=function(l){return l===18?FS:l===17?ly:l===16?LS:l===15?wh:l===14?cy:l===13?ay:l===12?MS:l===11?oy:void Y(60245)}(this.Ni);let o;return this.Ui.runTransaction(e,i,s,c=>(o=new au(c,this.ci?this.ci.next():Ot.ce),t==="readwrite-primary"?this.Hi(o).next(l=>!!l||this.Yi(o)).next(l=>{if(!l)throw Ze(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.Mi.enqueueRetryable(()=>this.Qi(!1)),new B(P.FAILED_PRECONDITION,Yg);return n(o)}).next(l=>this.Xi(o).next(()=>l)):this.Is(o).next(()=>n(o)))).then(c=>(o.raiseOnCommittedEvent(),c))}Is(e){return Ys(e).get(Pi).next(t=>{if(t!==null&&this.rs(t.leaseTimestampMs,Ll)&&!this.us(t.ownerId)&&!this.es(t)&&!(this.Oi||this.allowTabSynchronization&&t.allowTabSynchronization))throw new B(P.FAILED_PRECONDITION,Fl)})}Xi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return Ys(e).put(Pi,t)}static v(){return wn.v()}Zi(e){const t=Ys(e);return t.get(Pi).next(n=>this.es(n)?($(tr,"Releasing primary lease."),t.delete(Pi)):b.resolve())}rs(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(Ze(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Gi(){this.document!==null&&typeof this.document.addEventListener=="function"&&(this.Li=()=>{this.Mi.enqueueAndForget(()=>(this.inForeground=this.document.visibilityState==="visible",this.Wi()))},this.document.addEventListener("visibilitychange",this.Li),this.inForeground=this.document.visibilityState==="visible")}ls(){this.Li&&(this.document.removeEventListener("visibilitychange",this.Li),this.Li=null)}zi(){var e;typeof((e=this.window)==null?void 0:e.addEventListener)=="function"&&(this.Bi=()=>{this.cs();const t=/(?:Version|Mobile)\/1[456]/;wm()&&(navigator.appVersion.match(t)||navigator.userAgent.match(t))&&this.Mi.enterRestrictedMode(!0),this.Mi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.Bi))}hs(){this.Bi&&(this.window.removeEventListener("pagehide",this.Bi),this.Bi=null)}us(e){var t;try{const n=((t=this.Ki)==null?void 0:t.getItem(this._s(e)))!==null;return $(tr,`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(n){return Ze(tr,"Failed to get zombied client id.",n),!1}}cs(){if(this.Ki)try{this.Ki.setItem(this._s(this.clientId),String(Date.now()))}catch(e){Ze("Failed to set zombie client id.",e)}}Ps(){if(this.Ki)try{this.Ki.removeItem(this._s(this.clientId))}catch{}}_s(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function Ys(r){return at(r,ta)}function Na(r){return at(r,ts)}function Fh(r,e){let t=r.projectId;return r.isDefaultDatabase||(t+="."+r.database),"firestore/"+e+"/"+t+"/"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uh{constructor(e,t,n,i){this.targetId=e,this.fromCache=t,this.Es=n,this.ds=i}static As(e,t){let n=ge(),i=ge();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:i=i.add(s.doc.key)}return new Uh(e,t.fromCache,n,i)}}/**
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
 */class ZR{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
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
 */class w_{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=function(){return wm()?8:Xg(Ke())>0?6:4}()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,n,i){const s={result:null};return this.ys(e,t).next(o=>{s.result=o}).next(()=>{if(!s.result)return this.ws(e,t,i,n).next(o=>{s.result=o})}).next(()=>{if(s.result)return;const o=new ZR;return this.Ss(e,t,o).next(c=>{if(s.result=c,this.Vs)return this.bs(e,t,o,c.size)})}).next(()=>s.result)}bs(e,t,n,i){return n.documentReadCount<this.fs?(Vi()<=we.DEBUG&&$("QueryEngine","SDK will not create cache indexes for query:",Oi(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),b.resolve()):(Vi()<=we.DEBUG&&$("QueryEngine","Query:",Oi(t),"scans",n.documentReadCount,"local documents and returns",i,"documents as results."),n.documentReadCount>this.gs*i?(Vi()<=we.DEBUG&&$("QueryEngine","The SDK decides to create cache indexes for query:",Oi(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Dt(t))):b.resolve())}ys(e,t){if(cp(t))return b.resolve(null);let n=Dt(t);return this.indexManager.getIndexType(e,n).next(i=>i===0?null:(t.limit!==null&&i===1&&(t=hc(t,null,"F"),n=Dt(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(s=>{const o=ge(...s);return this.ps.getDocuments(e,o).next(c=>this.indexManager.getMinOffset(e,n).next(l=>{const u=this.Ds(t,c);return this.Cs(t,u,o,l.readTime)?this.ys(e,hc(t,null,"F")):this.vs(e,u,t,l)}))})))}ws(e,t,n,i){return cp(t)||i.isEqual(te.min())?b.resolve(null):this.ps.getDocuments(e,n).next(s=>{const o=this.Ds(t,s);return this.Cs(t,o,n,i)?b.resolve(null):(Vi()<=we.DEBUG&&$("QueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),Oi(t)),this.vs(e,o,t,Hg(i,Ji)).next(c=>c))})}Ds(e,t){let n=new Pe(ky(e));return t.forEach((i,s)=>{ia(e,s)&&(n=n.add(s))}),n}Cs(e,t,n,i){if(e.limit===null)return!1;if(n.size!==t.size)return!0;const s=e.limitType==="F"?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(i)>0)}Ss(e,t,n){return Vi()<=we.DEBUG&&$("QueryEngine","Using full collection scan to execute query:",Oi(t)),this.ps.getDocumentsMatchingQuery(e,t,jt.min(),n)}vs(e,t,n,i){return this.ps.getDocumentsMatchingQuery(e,n,i).next(s=>(t.forEach(o=>{s=s.insert(o.key,o)}),s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bh="LocalStore",eP=3e8;class tP{constructor(e,t,n,i){this.persistence=e,this.Fs=t,this.serializer=i,this.Ms=new Ve(me),this.xs=new Un(s=>ci(s),na),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(n)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new y_(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.Ms))}}function I_(r,e,t,n){return new tP(r,e,t,n)}async function E_(r,e){const t=H(r);return await t.persistence.runTransaction("Handle user change","readonly",n=>{let i;return t.mutationQueue.getAllMutationBatches(n).next(s=>(i=s,t.Bs(e),t.mutationQueue.getAllMutationBatches(n))).next(s=>{const o=[],c=[];let l=ge();for(const u of i){o.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}for(const u of s){c.push(u.batchId);for(const d of u.mutations)l=l.add(d.key)}return t.localDocuments.getDocuments(n,l).next(u=>({Ls:u,removedBatchIds:o,addedBatchIds:c}))})})}function nP(r,e){const t=H(r);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",n=>{const i=e.batch.keys(),s=t.Ns.newChangeBuffer({trackRemovals:!0});return function(c,l,u,d){const p=u.batch,m=p.keys();let v=b.resolve();return m.forEach(M=>{v=v.next(()=>d.getEntry(l,M)).next(F=>{const U=u.docVersions.get(M);Z(U!==null,48541),F.version.compareTo(U)<0&&(p.applyToRemoteDocument(F,u),F.isValidDocument()&&(F.setReadTime(u.commitVersion),d.addEntry(F)))})}),v.next(()=>c.mutationQueue.removeMutationBatch(l,p))}(t,n,e,s).next(()=>s.apply(n)).next(()=>t.mutationQueue.performConsistencyCheck(n)).next(()=>t.documentOverlayCache.removeOverlaysForBatchId(n,i,e.batch.batchId)).next(()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(n,function(c){let l=ge();for(let u=0;u<c.mutationResults.length;++u)c.mutationResults[u].transformResults.length>0&&(l=l.add(c.batch.mutations[u].key));return l}(e))).next(()=>t.localDocuments.getDocuments(n,i))})}function v_(r){const e=H(r);return e.persistence.runTransaction("Get last remote snapshot version","readonly",t=>e.Pi.getLastRemoteSnapshotVersion(t))}function rP(r,e){const t=H(r),n=e.snapshotVersion;let i=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",s=>{const o=t.Ns.newChangeBuffer({trackRemovals:!0});i=t.Ms;const c=[];e.targetChanges.forEach((d,p)=>{const m=i.get(p);if(!m)return;c.push(t.Pi.removeMatchingKeys(s,d.removedDocuments,p).next(()=>t.Pi.addMatchingKeys(s,d.addedDocuments,p)));let v=m.withSequenceNumber(s.currentSequenceNumber);e.targetMismatches.get(p)!==null?v=v.withResumeToken(He.EMPTY_BYTE_STRING,te.min()).withLastLimboFreeSnapshotVersion(te.min()):d.resumeToken.approximateByteSize()>0&&(v=v.withResumeToken(d.resumeToken,n)),i=i.insert(p,v),function(F,U,X){return F.resumeToken.approximateByteSize()===0||U.snapshotVersion.toMicroseconds()-F.snapshotVersion.toMicroseconds()>=eP?!0:X.addedDocuments.size+X.modifiedDocuments.size+X.removedDocuments.size>0}(m,v,d)&&c.push(t.Pi.updateTargetData(s,v))});let l=Lt(),u=ge();if(e.documentUpdates.forEach(d=>{e.resolvedLimboDocuments.has(d)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(s,d))}),c.push(T_(s,o,e.documentUpdates).next(d=>{l=d.ks,u=d.qs})),!n.isEqual(te.min())){const d=t.Pi.getLastRemoteSnapshotVersion(s).next(p=>t.Pi.setTargetsMetadata(s,s.currentSequenceNumber,n));c.push(d)}return b.waitFor(c).next(()=>o.apply(s)).next(()=>t.localDocuments.getLocalViewOfDocuments(s,l,u)).next(()=>l)}).then(s=>(t.Ms=i,s))}function T_(r,e,t){let n=ge(),i=ge();return t.forEach(s=>n=n.add(s)),e.getEntries(r,n).next(s=>{let o=Lt();return t.forEach((c,l)=>{const u=s.get(c);l.isFoundDocument()!==u.isFoundDocument()&&(i=i.add(c)),l.isNoDocument()&&l.version.isEqual(te.min())?(e.removeEntry(c,l.readTime),o=o.insert(c,l)):!u.isValidDocument()||l.version.compareTo(u.version)>0||l.version.compareTo(u.version)===0&&u.hasPendingWrites?(e.addEntry(l),o=o.insert(c,l)):$(Bh,"Ignoring outdated watch update for ",c,". Current version:",u.version," Watch version:",l.version)}),{ks:o,qs:i}})}function iP(r,e){const t=H(r);return t.persistence.runTransaction("Get next mutation batch","readonly",n=>(e===void 0&&(e=ur),t.mutationQueue.getNextMutationBatchAfterBatchId(n,e)))}function cs(r,e){const t=H(r);return t.persistence.runTransaction("Allocate target","readwrite",n=>{let i;return t.Pi.getTargetData(n,e).next(s=>s?(i=s,b.resolve(i)):t.Pi.allocateTargetId(n).next(o=>(i=new kn(e,o,"TargetPurposeListen",n.currentSequenceNumber),t.Pi.addTargetData(n,i).next(()=>i))))}).then(n=>{const i=t.Ms.get(n.targetId);return(i===null||n.snapshotVersion.compareTo(i.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(n.targetId,n),t.xs.set(e,n.targetId)),n})}async function ls(r,e,t){const n=H(r),i=n.Ms.get(e),s=t?"readwrite":"readwrite-primary";try{t||await n.persistence.runTransaction("Release target",s,o=>n.persistence.referenceDelegate.removeTarget(o,i))}catch(o){if(!Rr(o))throw o;$(Bh,`Failed to update sequence numbers for target ${e}: ${o}`)}n.Ms=n.Ms.remove(e),n.xs.delete(i.target)}function gc(r,e,t){const n=H(r);let i=te.min(),s=ge();return n.persistence.runTransaction("Execute query","readwrite",o=>function(l,u,d){const p=H(l),m=p.xs.get(d);return m!==void 0?b.resolve(p.Ms.get(m)):p.Pi.getTargetData(u,d)}(n,o,Dt(e)).next(c=>{if(c)return i=c.lastLimboFreeSnapshotVersion,n.Pi.getMatchingKeysForTargetId(o,c.targetId).next(l=>{s=l})}).next(()=>n.Fs.getDocumentsMatchingQuery(o,e,t?i:te.min(),t?s:ge())).next(c=>(S_(n,Cy(e),c),{documents:c,Qs:s})))}function b_(r,e){const t=H(r),n=H(t.Pi),i=t.Ms.get(e);return i?Promise.resolve(i.target):t.persistence.runTransaction("Get target data","readonly",s=>n.At(s,e).next(o=>o?o.target:null))}function A_(r,e){const t=H(r),n=t.Os.get(e)||te.min();return t.persistence.runTransaction("Get new document changes","readonly",i=>t.Ns.getAllFromCollectionGroup(i,e,Hg(n,Ji),Number.MAX_SAFE_INTEGER)).then(i=>(S_(t,e,i),i))}function S_(r,e,t){let n=r.Os.get(e)||te.min();t.forEach((i,s)=>{s.readTime.compareTo(n)>0&&(n=s.readTime)}),r.Os.set(e,n)}async function sP(r,e,t,n){const i=H(r);let s=ge(),o=Lt();for(const u of t){const d=e.$s(u.metadata.name);u.document&&(s=s.add(d));const p=e.Us(u);p.setReadTime(e.Ks(u.metadata.readTime)),o=o.insert(d,p)}const c=i.Ns.newChangeBuffer({trackRemovals:!0}),l=await cs(i,function(d){return Dt(Es(Ie.fromString(`__bundle__/docs/${d}`)))}(n));return i.persistence.runTransaction("Apply bundle documents","readwrite",u=>T_(u,c,o).next(d=>(c.apply(u),d)).next(d=>i.Pi.removeMatchingKeysForTargetId(u,l.targetId).next(()=>i.Pi.addMatchingKeys(u,s,l.targetId)).next(()=>i.localDocuments.getLocalViewOfDocuments(u,d.ks,d.qs)).next(()=>d.ks)))}async function oP(r,e,t=ge()){const n=await cs(r,Dt(Dh(e.bundledQuery))),i=H(r);return i.persistence.runTransaction("Save named query","readwrite",s=>{const o=et(e.readTime);if(n.snapshotVersion.compareTo(o)>=0)return i.Ii.saveNamedQuery(s,e);const c=n.withResumeToken(He.EMPTY_BYTE_STRING,o);return i.Ms=i.Ms.insert(c.targetId,c),i.Pi.updateTargetData(s,c).next(()=>i.Pi.removeMatchingKeysForTargetId(s,n.targetId)).next(()=>i.Pi.addMatchingKeys(s,t,n.targetId)).next(()=>i.Ii.saveNamedQuery(s,e))})}/**
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
 */const R_="firestore_clients";function Up(r,e){return`${R_}_${r}_${e}`}const P_="firestore_mutations";function Bp(r,e,t){let n=`${P_}_${r}_${t}`;return e.isAuthenticated()&&(n+=`_${e.uid}`),n}const C_="firestore_targets";function Ul(r,e){return`${C_}_${r}_${e}`}/**
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
 */const hn="SharedClientState";class yc{constructor(e,t,n,i){this.user=e,this.batchId=t,this.state=n,this.error=i}static Ws(e,t,n){const i=JSON.parse(n);let s,o=typeof i=="object"&&["pending","acknowledged","rejected"].indexOf(i.state)!==-1&&(i.error===void 0||typeof i.error=="object");return o&&i.error&&(o=typeof i.error.message=="string"&&typeof i.error.code=="string",o&&(s=new B(i.error.code,i.error.message))),o?new yc(e,t,i.state,s):(Ze(hn,`Failed to parse mutation state for ID '${t}': ${n}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class wo{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Ws(e,t){const n=JSON.parse(t);let i,s=typeof n=="object"&&["not-current","current","rejected"].indexOf(n.state)!==-1&&(n.error===void 0||typeof n.error=="object");return s&&n.error&&(s=typeof n.error.message=="string"&&typeof n.error.code=="string",s&&(i=new B(n.error.code,n.error.message))),s?new wo(e,n.state,i):(Ze(hn,`Failed to parse target state for ID '${e}': ${t}`),null)}Gs(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class _c{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Ws(e,t){const n=JSON.parse(t);let i=typeof n=="object"&&n.activeTargetIds instanceof Array,s=bh();for(let o=0;i&&o<n.activeTargetIds.length;++o)i=Zg(n.activeTargetIds[o]),s=s.add(n.activeTargetIds[o]);return i?new _c(e,s):(Ze(hn,`Failed to parse client data for instance '${e}': ${t}`),null)}}class qh{constructor(e,t){this.clientId=e,this.onlineState=t}static Ws(e){const t=JSON.parse(e);return typeof t=="object"&&["Unknown","Online","Offline"].indexOf(t.onlineState)!==-1&&typeof t.clientId=="string"?new qh(t.clientId,t.onlineState):(Ze(hn,`Failed to parse online state: ${e}`),null)}}class vu{constructor(){this.activeTargetIds=bh()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Bl{constructor(e,t,n,i,s){this.window=e,this.Mi=t,this.persistenceKey=n,this.Js=i,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.Hs=this.Ys.bind(this),this.Zs=new Ve(me),this.started=!1,this.Xs=[];const o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.eo=Up(this.persistenceKey,this.Js),this.no=function(l){return`firestore_sequence_number_${l}`}(this.persistenceKey),this.Zs=this.Zs.insert(this.Js,new vu),this.ro=new RegExp(`^${R_}_${o}_([^_]*)$`),this.io=new RegExp(`^${P_}_${o}_(\\d+)(?:_(.*))?$`),this.so=new RegExp(`^${C_}_${o}_(\\d+)$`),this.oo=function(l){return`firestore_online_state_${l}`}(this.persistenceKey),this._o=function(l){return`firestore_bundle_loaded_v2_${l}`}(this.persistenceKey),this.window.addEventListener("storage",this.Hs)}static v(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Ts();for(const n of e){if(n===this.Js)continue;const i=this.getItem(Up(this.persistenceKey,n));if(i){const s=_c.Ws(n,i);s&&(this.Zs=this.Zs.insert(s.clientId,s))}}this.ao();const t=this.storage.getItem(this.oo);if(t){const n=this.uo(t);n&&this.co(n)}for(const n of this.Xs)this.Ys(n);this.Xs=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.no,JSON.stringify(e))}getAllActiveQueryTargets(){return this.lo(this.Zs)}isActiveQueryTarget(e){let t=!1;return this.Zs.forEach((n,i)=>{i.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.ho(e,"pending")}updateMutationState(e,t,n){this.ho(e,t,n),this.Po(e)}addLocalQueryTarget(e,t=!0){let n="not-current";if(this.isActiveQueryTarget(e)){const i=this.storage.getItem(Ul(this.persistenceKey,e));if(i){const s=wo.Ws(e,i);s&&(n=s.state)}}return t&&this.To.zs(e),this.ao(),n}removeLocalQueryTarget(e){this.To.js(e),this.ao()}isLocalQueryTarget(e){return this.To.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Ul(this.persistenceKey,e))}updateQueryState(e,t,n){this.Io(e,t,n)}handleUserChange(e,t,n){t.forEach(i=>{this.Po(i)}),this.currentUser=e,n.forEach(i=>{this.addPendingMutation(i)})}setOnlineState(e){this.Eo(e)}notifyBundleLoaded(e){this.Ao(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.Hs),this.removeItem(this.eo),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return $(hn,"READ",e,t),t}setItem(e,t){$(hn,"SET",e,t),this.storage.setItem(e,t)}removeItem(e){$(hn,"REMOVE",e),this.storage.removeItem(e)}Ys(e){const t=e;if(t.storageArea===this.storage){if($(hn,"EVENT",t.key,t.newValue),t.key===this.eo)return void Ze("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Mi.enqueueRetryable(async()=>{if(this.started){if(t.key!==null){if(this.ro.test(t.key)){if(t.newValue==null){const n=this.Ro(t.key);return this.Vo(n,null)}{const n=this.mo(t.key,t.newValue);if(n)return this.Vo(n.clientId,n)}}else if(this.io.test(t.key)){if(t.newValue!==null){const n=this.fo(t.key,t.newValue);if(n)return this.po(n)}}else if(this.so.test(t.key)){if(t.newValue!==null){const n=this.yo(t.key,t.newValue);if(n)return this.wo(n)}}else if(t.key===this.oo){if(t.newValue!==null){const n=this.uo(t.newValue);if(n)return this.co(n)}}else if(t.key===this.no){const n=function(s){let o=Ot.ce;if(s!=null)try{const c=JSON.parse(s);Z(typeof c=="number",30636,{So:s}),o=c}catch(c){Ze(hn,"Failed to read sequence number from WebStorage",c)}return o}(t.newValue);n!==Ot.ce&&this.sequenceNumberHandler(n)}else if(t.key===this._o){const n=this.bo(t.newValue);await Promise.all(n.map(i=>this.syncEngine.Do(i)))}}}else this.Xs.push(t)})}}get To(){return this.Zs.get(this.Js)}ao(){this.setItem(this.eo,this.To.Gs())}ho(e,t,n){const i=new yc(this.currentUser,e,t,n),s=Bp(this.persistenceKey,this.currentUser,e);this.setItem(s,i.Gs())}Po(e){const t=Bp(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Eo(e){const t={clientId:this.Js,onlineState:e};this.storage.setItem(this.oo,JSON.stringify(t))}Io(e,t,n){const i=Ul(this.persistenceKey,e),s=new wo(e,t,n);this.setItem(i,s.Gs())}Ao(e){const t=JSON.stringify(Array.from(e));this.setItem(this._o,t)}Ro(e){const t=this.ro.exec(e);return t?t[1]:null}mo(e,t){const n=this.Ro(e);return _c.Ws(n,t)}fo(e,t){const n=this.io.exec(e),i=Number(n[1]),s=n[2]!==void 0?n[2]:null;return yc.Ws(new ht(s),i,t)}yo(e,t){const n=this.so.exec(e),i=Number(n[1]);return wo.Ws(i,t)}uo(e){return qh.Ws(e)}bo(e){return JSON.parse(e)}async po(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Co(e.batchId,e.state,e.error);$(hn,`Ignoring mutation for non-active user ${e.user.uid}`)}wo(e){return this.syncEngine.vo(e.targetId,e.state,e.error)}Vo(e,t){const n=t?this.Zs.insert(e,t):this.Zs.remove(e),i=this.lo(this.Zs),s=this.lo(n),o=[],c=[];return s.forEach(l=>{i.has(l)||o.push(l)}),i.forEach(l=>{s.has(l)||c.push(l)}),this.syncEngine.Fo(o,c).then(()=>{this.Zs=n})}co(e){this.Zs.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}lo(e){let t=bh();return e.forEach((n,i)=>{t=t.unionWith(i.activeTargetIds)}),t}}class k_{constructor(){this.Mo=new vu,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,n){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new vu,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
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
 */class aP{Oo(e){}shutdown(){}}/**
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
 */const qp="ConnectivityMonitor";class $p{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){$(qp,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){$(qp,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
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
 */let Va=null;function Tu(){return Va===null?Va=function(){return 268435456+Math.round(2147483648*Math.random())}():Va++,"0x"+Va.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ql="RestConnection",cP={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class lP{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),i=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${n}/databases/${i}`,this.Wo=this.databaseId.database===cu?`project_id=${n}`:`project_id=${n}&database_id=${i}`}Go(e,t,n,i,s){const o=Tu(),c=this.zo(e,t.toUriEncodedString());$(ql,`Sending RPC '${e}' ${o}:`,c,n);const l={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(l,i,s);const{host:u}=new URL(c),d=ms(u);return this.Jo(e,c,l,n,d).then(p=>($(ql,`Received RPC '${e}' ${o}: `,p),p),p=>{throw bn(ql,`RPC '${e}' ${o} failed with error: `,p,"url: ",c,"request:",n),p})}Ho(e,t,n,i,s,o){return this.Go(e,t,n,i,s)}jo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+Is}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((i,s)=>e[s]=i),n&&n.headers.forEach((i,s)=>e[s]=i)}zo(e,t){const n=cP[e];return`${this.Uo}/v1/${t}:${n}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uP{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vt="WebChannelConnection";class hP extends lP{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,n,i,s){const o=Tu();return new Promise((c,l)=>{const u=new Lg;u.setWithCredentials(!0),u.listenOnce(Fg.COMPLETE,()=>{try{switch(u.getLastErrorCode()){case Ua.NO_ERROR:const p=u.getResponseJson();$(vt,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(p)),c(p);break;case Ua.TIMEOUT:$(vt,`RPC '${e}' ${o} timed out`),l(new B(P.DEADLINE_EXCEEDED,"Request time out"));break;case Ua.HTTP_ERROR:const m=u.getStatus();if($(vt,`RPC '${e}' ${o} failed with status:`,m,"response text:",u.getResponseText()),m>0){let v=u.getResponseJson();Array.isArray(v)&&(v=v[0]);const M=v==null?void 0:v.error;if(M&&M.status&&M.message){const F=function(X){const ie=X.toLowerCase().replace(/_/g,"-");return Object.values(P).indexOf(ie)>=0?ie:P.UNKNOWN}(M.status);l(new B(F,M.message))}else l(new B(P.UNKNOWN,"Server responded with status "+u.getStatus()))}else l(new B(P.UNAVAILABLE,"Connection failed."));break;default:Y(9055,{l_:e,streamId:o,h_:u.getLastErrorCode(),P_:u.getLastError()})}}finally{$(vt,`RPC '${e}' ${o} completed.`)}});const d=JSON.stringify(i);$(vt,`RPC '${e}' ${o} sending request:`,i),u.send(t,"POST",d,n,15)})}T_(e,t,n){const i=Tu(),s=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],o=qg(),c=Bg(),l={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;u!==void 0&&(l.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(l.useFetchStreams=!0),this.jo(l.initMessageHeaders,t,n),l.encodeInitMessageHeaders=!0;const d=s.join("");$(vt,`Creating RPC '${e}' stream ${i}: ${d}`,l);const p=o.createWebChannel(d,l);this.I_(p);let m=!1,v=!1;const M=new uP({Yo:U=>{v?$(vt,`Not sending because RPC '${e}' stream ${i} is closed:`,U):(m||($(vt,`Opening RPC '${e}' stream ${i} transport.`),p.open(),m=!0),$(vt,`RPC '${e}' stream ${i} sending:`,U),p.send(U))},Zo:()=>p.close()}),F=(U,X,ie)=>{U.listen(X,re=>{try{ie(re)}catch(_e){setTimeout(()=>{throw _e},0)}})};return F(p,eo.EventType.OPEN,()=>{v||($(vt,`RPC '${e}' stream ${i} transport opened.`),M.o_())}),F(p,eo.EventType.CLOSE,()=>{v||(v=!0,$(vt,`RPC '${e}' stream ${i} transport closed`),M.a_(),this.E_(p))}),F(p,eo.EventType.ERROR,U=>{v||(v=!0,bn(vt,`RPC '${e}' stream ${i} transport errored. Name:`,U.name,"Message:",U.message),M.a_(new B(P.UNAVAILABLE,"The operation could not be completed")))}),F(p,eo.EventType.MESSAGE,U=>{var X;if(!v){const ie=U.data[0];Z(!!ie,16349);const re=ie,_e=(re==null?void 0:re.error)||((X=re[0])==null?void 0:X.error);if(_e){$(vt,`RPC '${e}' stream ${i} received error:`,_e);const Te=_e.status;let de=function(w){const T=nt[w];if(T!==void 0)return zy(T)}(Te),E=_e.message;de===void 0&&(de=P.INTERNAL,E="Unknown error status: "+Te+" with message "+_e.message),v=!0,M.a_(new B(de,E)),p.close()}else $(vt,`RPC '${e}' stream ${i} received:`,ie),M.u_(ie)}}),F(c,Ug.STAT_EVENT,U=>{U.stat===tu.PROXY?$(vt,`RPC '${e}' stream ${i} detected buffering proxy`):U.stat===tu.NOPROXY&&$(vt,`RPC '${e}' stream ${i} detected no buffering proxy`)}),setTimeout(()=>{M.__()},0),M}terminate(){this.c_.forEach(e=>e.close()),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter(t=>t===e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */function x_(){return typeof window<"u"?window:null}function Qa(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ca(r){return new gR(r,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $h{constructor(e,t,n=1e3,i=1.5,s=6e4){this.Mi=e,this.timerId=t,this.d_=n,this.A_=i,this.R_=s,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),n=Math.max(0,Date.now()-this.f_),i=Math.max(0,t-n);i>0&&$("ExponentialBackoff",`Backing off for ${i} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,i,()=>(this.f_=Date.now(),e())),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zp="PersistentStream";class D_{constructor(e,t,n,i,s,o,c,l){this.Mi=e,this.S_=n,this.b_=i,this.connection=s,this.authCredentialsProvider=o,this.appCheckCredentialsProvider=c,this.listener=l,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new $h(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,()=>this.k_()))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===P.RESOURCE_EXHAUSTED?(Ze(t.toString()),Ze("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===P.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([n,i])=>{this.D_===t&&this.G_(n,i)},n=>{e(()=>{const i=new B(P.UNKNOWN,"Fetching auth token failed: "+n.message);return this.z_(i)})})}G_(e,t){const n=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo(()=>{n(()=>this.listener.Xo())}),this.stream.t_(()=>{n(()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,()=>(this.O_()&&(this.state=3),Promise.resolve())),this.listener.t_()))}),this.stream.r_(i=>{n(()=>this.z_(i))}),this.stream.onMessage(i=>{n(()=>++this.F_==1?this.J_(i):this.onNext(i))})}N_(){this.state=5,this.M_.p_(async()=>{this.state=0,this.start()})}z_(e){return $(zp,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget(()=>this.D_===e?t():($(zp,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class dP extends D_{constructor(e,t,n,i,s,o){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=wR(this.serializer,e),n=function(s){if(!("targetChange"in s))return te.min();const o=s.targetChange;return o.targetIds&&o.targetIds.length?te.min():o.readTime?et(o.readTime):te.min()}(e);return this.listener.H_(t,n)}Y_(e){const t={};t.database=yu(this.serializer),t.addTarget=function(s,o){let c;const l=o.target;if(c=lc(l)?{documents:Zy(s,l)}:{query:e_(s,l).ft},c.targetId=o.targetId,o.resumeToken.approximateByteSize()>0){c.resumeToken=Wy(s,o.resumeToken);const u=mu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}else if(o.snapshotVersion.compareTo(te.min())>0){c.readTime=as(s,o.snapshotVersion.toTimestamp());const u=mu(s,o.expectedCount);u!==null&&(c.expectedCount=u)}return c}(this.serializer,e);const n=ER(this.serializer,e);n&&(t.labels=n),this.q_(t)}Z_(e){const t={};t.database=yu(this.serializer),t.removeTarget=e,this.q_(t)}}class fP extends D_{constructor(e,t,n,i,s,o){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,i,o),this.serializer=s}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return Z(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,Z(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){Z(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=IR(e.writeResults,e.commitTime),n=et(e.commitTime);return this.listener.na(n,t)}ra(){const e={};e.database=yu(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map(n=>Bo(this.serializer,n))};this.q_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pP{}class mP extends pP{constructor(e,t,n,i){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=i,this.ia=!1}sa(){if(this.ia)throw new B(P.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,n,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,o])=>this.connection.Go(e,gu(t,n),i,s,o)).catch(s=>{throw s.name==="FirebaseError"?(s.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),s):new B(P.UNKNOWN,s.toString())})}Ho(e,t,n,i,s){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([o,c])=>this.connection.Ho(e,gu(t,n),i,o,c,s)).catch(o=>{throw o.name==="FirebaseError"?(o.code===P.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(P.UNKNOWN,o.toString())})}terminate(){this.ia=!0,this.connection.terminate()}}class gP{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve())))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(Ze(t),this.aa=!1):$("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pi="RemoteStore";class yP{constructor(e,t,n,i,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=s,this.Aa.Oo(o=>{n.enqueueAndForget(async()=>{Cr(this)&&($(pi,"Restarting streams for network reachability change."),await async function(l){const u=H(l);u.Ea.add(4),await bs(u),u.Ra.set("Unknown"),u.Ea.delete(4),await la(u)}(this))})}),this.Ra=new gP(n,i)}}async function la(r){if(Cr(r))for(const e of r.da)await e(!0)}async function bs(r){for(const e of r.da)await e(!1)}function Hc(r,e){const t=H(r);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),jh(t)?Kh(t):Ss(t).O_()&&zh(t,e))}function us(r,e){const t=H(r),n=Ss(t);t.Ia.delete(e),n.O_()&&N_(t,e),t.Ia.size===0&&(n.O_()?n.L_():Cr(t)&&t.Ra.set("Unknown"))}function zh(r,e){if(r.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(te.min())>0){const t=r.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}Ss(r).Y_(e)}function N_(r,e){r.Va.Ue(e),Ss(r).Z_(e)}function Kh(r){r.Va=new dR({getRemoteKeysForTarget:e=>r.remoteSyncer.getRemoteKeysForTarget(e),At:e=>r.Ia.get(e)||null,ht:()=>r.datastore.serializer.databaseId}),Ss(r).start(),r.Ra.ua()}function jh(r){return Cr(r)&&!Ss(r).x_()&&r.Ia.size>0}function Cr(r){return H(r).Ea.size===0}function V_(r){r.Va=void 0}async function _P(r){r.Ra.set("Online")}async function wP(r){r.Ia.forEach((e,t)=>{zh(r,e)})}async function IP(r,e){V_(r),jh(r)?(r.Ra.ha(e),Kh(r)):r.Ra.set("Unknown")}async function EP(r,e,t){if(r.Ra.set("Online"),e instanceof Gy&&e.state===2&&e.cause)try{await async function(i,s){const o=s.cause;for(const c of s.targetIds)i.Ia.has(c)&&(await i.remoteSyncer.rejectListen(c,o),i.Ia.delete(c),i.Va.removeTarget(c))}(r,e)}catch(n){$(pi,"Failed to remove targets %s: %s ",e.targetIds.join(","),n),await wc(r,n)}else if(e instanceof Wa?r.Va.Ze(e):e instanceof jy?r.Va.st(e):r.Va.tt(e),!t.isEqual(te.min()))try{const n=await v_(r.localStore);t.compareTo(n)>=0&&await function(s,o){const c=s.Va.Tt(o);return c.targetChanges.forEach((l,u)=>{if(l.resumeToken.approximateByteSize()>0){const d=s.Ia.get(u);d&&s.Ia.set(u,d.withResumeToken(l.resumeToken,o))}}),c.targetMismatches.forEach((l,u)=>{const d=s.Ia.get(l);if(!d)return;s.Ia.set(l,d.withResumeToken(He.EMPTY_BYTE_STRING,d.snapshotVersion)),N_(s,l);const p=new kn(d.target,l,u,d.sequenceNumber);zh(s,p)}),s.remoteSyncer.applyRemoteEvent(c)}(r,t)}catch(n){$(pi,"Failed to raise snapshot:",n),await wc(r,n)}}async function wc(r,e,t){if(!Rr(e))throw e;r.Ea.add(1),await bs(r),r.Ra.set("Offline"),t||(t=()=>v_(r.localStore)),r.asyncQueue.enqueueRetryable(async()=>{$(pi,"Retrying IndexedDB access"),await t(),r.Ea.delete(1),await la(r)})}function O_(r,e){return e().catch(t=>wc(r,t,e))}async function As(r){const e=H(r),t=Er(e);let n=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:ur;for(;vP(e);)try{const i=await iP(e.localStore,n);if(i===null){e.Ta.length===0&&t.L_();break}n=i.batchId,TP(e,i)}catch(i){await wc(e,i)}M_(e)&&L_(e)}function vP(r){return Cr(r)&&r.Ta.length<10}function TP(r,e){r.Ta.push(e);const t=Er(r);t.O_()&&t.X_&&t.ea(e.mutations)}function M_(r){return Cr(r)&&!Er(r).x_()&&r.Ta.length>0}function L_(r){Er(r).start()}async function bP(r){Er(r).ra()}async function AP(r){const e=Er(r);for(const t of r.Ta)e.ea(t.mutations)}async function SP(r,e,t){const n=r.Ta.shift(),i=Ph.from(n,e,t);await O_(r,()=>r.remoteSyncer.applySuccessfulWrite(i)),await As(r)}async function RP(r,e){e&&Er(r).X_&&await async function(n,i){if(function(o){return $y(o)&&o!==P.ABORTED}(i.code)){const s=n.Ta.shift();Er(n).B_(),await O_(n,()=>n.remoteSyncer.rejectFailedWrite(s.batchId,i)),await As(n)}}(r,e),M_(r)&&L_(r)}async function Kp(r,e){const t=H(r);t.asyncQueue.verifyOperationInProgress(),$(pi,"RemoteStore received new credentials");const n=Cr(t);t.Ea.add(3),await bs(t),n&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await la(t)}async function bu(r,e){const t=H(r);e?(t.Ea.delete(2),await la(t)):e||(t.Ea.add(2),await bs(t),t.Ra.set("Unknown"))}function Ss(r){return r.ma||(r.ma=function(t,n,i){const s=H(t);return s.sa(),new dP(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:_P.bind(null,r),t_:wP.bind(null,r),r_:IP.bind(null,r),H_:EP.bind(null,r)}),r.da.push(async e=>{e?(r.ma.B_(),jh(r)?Kh(r):r.Ra.set("Unknown")):(await r.ma.stop(),V_(r))})),r.ma}function Er(r){return r.fa||(r.fa=function(t,n,i){const s=H(t);return s.sa(),new fP(n,s.connection,s.authCredentials,s.appCheckCredentials,s.serializer,i)}(r.datastore,r.asyncQueue,{Xo:()=>Promise.resolve(),t_:bP.bind(null,r),r_:RP.bind(null,r),ta:AP.bind(null,r),na:SP.bind(null,r)}),r.da.push(async e=>{e?(r.fa.B_(),await As(r)):(await r.fa.stop(),r.Ta.length>0&&($(pi,`Stopping write stream with ${r.Ta.length} pending writes`),r.Ta=[]))})),r.fa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh{constructor(e,t,n,i,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=i,this.removalCallback=s,this.deferred=new yt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(o=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,i,s){const o=Date.now()+n,c=new Gh(e,t,o,i,s);return c.start(n),c}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(P.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Rs(r,e){if(Ze("AsyncQueue",`${e}: ${r}`),Rr(r))return new B(P.UNAVAILABLE,`${e}: ${r}`);throw r}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ji{static emptySet(e){return new ji(e.comparator)}constructor(e){this.comparator=e?(t,n)=>e(t,n)||G.comparator(t.key,n.key):(t,n)=>G.comparator(t.key,n.key),this.keyedMap=to(),this.sortedSet=new Ve(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof ji)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const i=t.getNext().key,s=n.getNext().key;if(!i.isEqual(s))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),e.length===0?"DocumentSet ()":`DocumentSet (
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
 */class jp{constructor(){this.ga=new Ve(G.comparator)}track(e){const t=e.doc.key,n=this.ga.get(t);n?e.type!==0&&n.type===3?this.ga=this.ga.insert(t,e):e.type===3&&n.type!==1?this.ga=this.ga.insert(t,{type:n.type,doc:e.doc}):e.type===2&&n.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&n.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&n.type===0?this.ga=this.ga.remove(t):e.type===1&&n.type===2?this.ga=this.ga.insert(t,{type:1,doc:n.doc}):e.type===0&&n.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):Y(63341,{Rt:e,pa:n}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal((t,n)=>{e.push(n)}),e}}class hs{constructor(e,t,n,i,s,o,c,l,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=i,this.mutatedKeys=s,this.fromCache=o,this.syncStateChanged=c,this.excludesMetadataChanges=l,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,i,s){const o=[];return t.forEach(c=>{o.push({type:0,doc:c})}),new hs(e,t,ji.emptySet(t),o,n,i,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&ra(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let i=0;i<t.length;i++)if(t[i].type!==n[i].type||!t[i].doc.isEqual(n[i].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class PP{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some(e=>e.Da())}}class CP{constructor(){this.queries=Gp(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,n){const i=H(t),s=i.queries;i.queries=Gp(),s.forEach((o,c)=>{for(const l of c.Sa)l.onError(n)})})(this,new B(P.ABORTED,"Firestore shutting down"))}}function Gp(){return new Un(r=>Py(r),ra)}async function Wh(r,e){const t=H(r);let n=3;const i=e.query;let s=t.queries.get(i);s?!s.ba()&&e.Da()&&(n=2):(s=new PP,n=e.Da()?0:1);try{switch(n){case 0:s.wa=await t.onListen(i,!0);break;case 1:s.wa=await t.onListen(i,!1);break;case 2:await t.onFirstRemoteStoreListen(i)}}catch(o){const c=Rs(o,`Initialization of query '${Oi(e.query)}' failed`);return void e.onError(c)}t.queries.set(i,s),s.Sa.push(e),e.va(t.onlineState),s.wa&&e.Fa(s.wa)&&Qh(t)}async function Hh(r,e){const t=H(r),n=e.query;let i=3;const s=t.queries.get(n);if(s){const o=s.Sa.indexOf(e);o>=0&&(s.Sa.splice(o,1),s.Sa.length===0?i=e.Da()?0:1:!s.ba()&&e.Da()&&(i=2))}switch(i){case 0:return t.queries.delete(n),t.onUnlisten(n,!0);case 1:return t.queries.delete(n),t.onUnlisten(n,!1);case 2:return t.onLastRemoteStoreUnlisten(n);default:return}}function kP(r,e){const t=H(r);let n=!1;for(const i of e){const s=i.query,o=t.queries.get(s);if(o){for(const c of o.Sa)c.Fa(i)&&(n=!0);o.wa=i}}n&&Qh(t)}function xP(r,e,t){const n=H(r),i=n.queries.get(e);if(i)for(const s of i.Sa)s.onError(t);n.queries.delete(e)}function Qh(r){r.Ca.forEach(e=>{e.next()})}var Au,Wp;(Wp=Au||(Au={})).Ma="default",Wp.Cache="cache";class Yh{constructor(e,t,n){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=n||{}}Fa(e){if(!this.options.includeMetadataChanges){const n=[];for(const i of e.docChanges)i.type!==3&&n.push(i);e=new hs(e.query,e.docs,e.oldDocs,n,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const n=t!=="Offline";return(!this.options.qa||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=hs.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==Au.Cache}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class DP{constructor(e,t){this.Qa=e,this.byteLength=t}$a(){return"metadata"in this.Qa}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hp{constructor(e){this.serializer=e}$s(e){return In(this.serializer,e)}Us(e){return e.metadata.exists?Xy(this.serializer,e.document,!1):Le.newNoDocument(this.$s(e.metadata.name),this.Ks(e.metadata.readTime))}Ks(e){return et(e)}}class NP{constructor(e,t){this.Ua=e,this.serializer=t,this.Ka=[],this.Wa=[],this.collectionGroups=new Set,this.progress=F_(e)}get queries(){return this.Ka}get documents(){return this.Wa}Ga(e){this.progress.bytesLoaded+=e.byteLength;let t=this.progress.documentsLoaded;if(e.Qa.namedQuery)this.Ka.push(e.Qa.namedQuery);else if(e.Qa.documentMetadata){this.Wa.push({metadata:e.Qa.documentMetadata}),e.Qa.documentMetadata.exists||++t;const n=Ie.fromString(e.Qa.documentMetadata.name);this.collectionGroups.add(n.get(n.length-2))}else e.Qa.document&&(this.Wa[this.Wa.length-1].document=e.Qa.document,++t);return t!==this.progress.documentsLoaded?(this.progress.documentsLoaded=t,{...this.progress}):null}za(e){const t=new Map,n=new Hp(this.serializer);for(const i of e)if(i.metadata.queries){const s=n.$s(i.metadata.name);for(const o of i.metadata.queries){const c=(t.get(o)||ge()).add(s);t.set(o,c)}}return t}async ja(e){const t=await sP(e,new Hp(this.serializer),this.Wa,this.Ua.id),n=this.za(this.documents);for(const i of this.Ka)await oP(e,i,n.get(i.name));return this.progress.taskState="Success",{progress:this.progress,Ja:this.collectionGroups,Ha:t}}}function F_(r){return{taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:r.totalDocuments,totalBytes:r.totalBytes}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U_{constructor(e){this.key=e}}class B_{constructor(e){this.key=e}}class q_{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=ge(),this.mutatedKeys=ge(),this.eu=ky(e),this.tu=new ji(this.eu)}get nu(){return this.Ya}ru(e,t){const n=t?t.iu:new jp,i=t?t.tu:this.tu;let s=t?t.mutatedKeys:this.mutatedKeys,o=i,c=!1;const l=this.query.limitType==="F"&&i.size===this.query.limit?i.last():null,u=this.query.limitType==="L"&&i.size===this.query.limit?i.first():null;if(e.inorderTraversal((d,p)=>{const m=i.get(d),v=ia(this.query,p)?p:null,M=!!m&&this.mutatedKeys.has(m.key),F=!!v&&(v.hasLocalMutations||this.mutatedKeys.has(v.key)&&v.hasCommittedMutations);let U=!1;m&&v?m.data.isEqual(v.data)?M!==F&&(n.track({type:3,doc:v}),U=!0):this.su(m,v)||(n.track({type:2,doc:v}),U=!0,(l&&this.eu(v,l)>0||u&&this.eu(v,u)<0)&&(c=!0)):!m&&v?(n.track({type:0,doc:v}),U=!0):m&&!v&&(n.track({type:1,doc:m}),U=!0,(l||u)&&(c=!0)),U&&(v?(o=o.add(v),s=F?s.add(d):s.delete(d)):(o=o.delete(d),s=s.delete(d)))}),this.query.limit!==null)for(;o.size>this.query.limit;){const d=this.query.limitType==="F"?o.last():o.first();o=o.delete(d.key),s=s.delete(d.key),n.track({type:1,doc:d})}return{tu:o,iu:n,Cs:c,mutatedKeys:s}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,i){const s=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const o=e.iu.ya();o.sort((d,p)=>function(v,M){const F=U=>{switch(U){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return Y(20277,{Rt:U})}};return F(v)-F(M)}(d.type,p.type)||this.eu(d.doc,p.doc)),this.ou(n),i=i??!1;const c=t&&!i?this._u():[],l=this.Xa.size===0&&this.current&&!i?1:0,u=l!==this.Za;return this.Za=l,o.length!==0||u?{snapshot:new hs(this.query,e.tu,s,o,e.mutatedKeys,l===0,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new jp,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach(t=>this.Ya=this.Ya.add(t)),e.modifiedDocuments.forEach(t=>{}),e.removedDocuments.forEach(t=>this.Ya=this.Ya.delete(t)),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=ge(),this.tu.forEach(n=>{this.uu(n.key)&&(this.Xa=this.Xa.add(n.key))});const t=[];return e.forEach(n=>{this.Xa.has(n)||t.push(new B_(n))}),this.Xa.forEach(n=>{e.has(n)||t.push(new U_(n))}),t}cu(e){this.Ya=e.Qs,this.Xa=ge();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return hs.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const kr="SyncEngine";class VP{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class OP{constructor(e){this.key=e,this.hu=!1}}class MP{constructor(e,t,n,i,s,o){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=i,this.currentUser=s,this.maxConcurrentLimboResolutions=o,this.Pu={},this.Tu=new Un(c=>Py(c),ra),this.Iu=new Map,this.Eu=new Set,this.du=new Ve(G.comparator),this.Au=new Map,this.Ru=new Oh,this.Vu={},this.mu=new Map,this.fu=fi.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function LP(r,e,t=!0){const n=Qc(r);let i;const s=n.Tu.get(e);return s?(n.sharedClientState.addLocalQueryTarget(s.targetId),i=s.view.lu()):i=await $_(n,e,t,!0),i}async function FP(r,e){const t=Qc(r);await $_(t,e,!0,!1)}async function $_(r,e,t,n){const i=await cs(r.localStore,Dt(e)),s=i.targetId,o=r.sharedClientState.addLocalQueryTarget(s,t);let c;return n&&(c=await Jh(r,e,s,o==="current",i.resumeToken)),r.isPrimaryClient&&t&&Hc(r.remoteStore,i),c}async function Jh(r,e,t,n,i){r.pu=(p,m,v)=>async function(F,U,X,ie){let re=U.view.ru(X);re.Cs&&(re=await gc(F.localStore,U.query,!1).then(({documents:E})=>U.view.ru(E,re)));const _e=ie&&ie.targetChanges.get(U.targetId),Te=ie&&ie.targetMismatches.get(U.targetId)!=null,de=U.view.applyChanges(re,F.isPrimaryClient,_e,Te);return Su(F,U.targetId,de.au),de.snapshot}(r,p,m,v);const s=await gc(r.localStore,e,!0),o=new q_(e,s.Qs),c=o.ru(s.documents),l=aa.createSynthesizedTargetChangeForCurrentChange(t,n&&r.onlineState!=="Offline",i),u=o.applyChanges(c,r.isPrimaryClient,l);Su(r,t,u.au);const d=new VP(e,t,o);return r.Tu.set(e,d),r.Iu.has(t)?r.Iu.get(t).push(e):r.Iu.set(t,[e]),u.snapshot}async function UP(r,e,t){const n=H(r),i=n.Tu.get(e),s=n.Iu.get(i.targetId);if(s.length>1)return n.Iu.set(i.targetId,s.filter(o=>!ra(o,e))),void n.Tu.delete(e);n.isPrimaryClient?(n.sharedClientState.removeLocalQueryTarget(i.targetId),n.sharedClientState.isActiveQueryTarget(i.targetId)||await ls(n.localStore,i.targetId,!1).then(()=>{n.sharedClientState.clearQueryState(i.targetId),t&&us(n.remoteStore,i.targetId),ds(n,i.targetId)}).catch(Sr)):(ds(n,i.targetId),await ls(n.localStore,i.targetId,!0))}async function BP(r,e){const t=H(r),n=t.Tu.get(e),i=t.Iu.get(n.targetId);t.isPrimaryClient&&i.length===1&&(t.sharedClientState.removeLocalQueryTarget(n.targetId),us(t.remoteStore,n.targetId))}async function qP(r,e,t){const n=td(r);try{const i=await function(o,c){const l=H(o),u=Se.now(),d=c.reduce((v,M)=>v.add(M.key),ge());let p,m;return l.persistence.runTransaction("Locally write mutations","readwrite",v=>{let M=Lt(),F=ge();return l.Ns.getEntries(v,d).next(U=>{M=U,M.forEach((X,ie)=>{ie.isValidDocument()||(F=F.add(X))})}).next(()=>l.localDocuments.getOverlayedDocuments(v,M)).next(U=>{p=U;const X=[];for(const ie of c){const re=lR(ie,p.get(ie.key).overlayedDocument);re!=null&&X.push(new Bn(ie.key,re,wy(re.value.mapValue),qe.exists(!0)))}return l.mutationQueue.addMutationBatch(v,u,X,c)}).next(U=>{m=U;const X=U.applyToLocalDocumentSet(p,F);return l.documentOverlayCache.saveOverlays(v,U.batchId,X)})}).then(()=>({batchId:m.batchId,changes:Dy(p)}))}(n.localStore,e);n.sharedClientState.addPendingMutation(i.batchId),function(o,c,l){let u=o.Vu[o.currentUser.toKey()];u||(u=new Ve(me)),u=u.insert(c,l),o.Vu[o.currentUser.toKey()]=u}(n,i.batchId,t),await qn(n,i.changes),await As(n.remoteStore)}catch(i){const s=Rs(i,"Failed to persist write");t.reject(s)}}async function z_(r,e){const t=H(r);try{const n=await rP(t.localStore,e);e.targetChanges.forEach((i,s)=>{const o=t.Au.get(s);o&&(Z(i.addedDocuments.size+i.modifiedDocuments.size+i.removedDocuments.size<=1,22616),i.addedDocuments.size>0?o.hu=!0:i.modifiedDocuments.size>0?Z(o.hu,14607):i.removedDocuments.size>0&&(Z(o.hu,42227),o.hu=!1))}),await qn(t,n,e)}catch(n){await Sr(n)}}function Qp(r,e,t){const n=H(r);if(n.isPrimaryClient&&t===0||!n.isPrimaryClient&&t===1){const i=[];n.Tu.forEach((s,o)=>{const c=o.view.va(e);c.snapshot&&i.push(c.snapshot)}),function(o,c){const l=H(o);l.onlineState=c;let u=!1;l.queries.forEach((d,p)=>{for(const m of p.Sa)m.va(c)&&(u=!0)}),u&&Qh(l)}(n.eventManager,e),i.length&&n.Pu.H_(i),n.onlineState=e,n.isPrimaryClient&&n.sharedClientState.setOnlineState(e)}}async function $P(r,e,t){const n=H(r);n.sharedClientState.updateQueryState(e,"rejected",t);const i=n.Au.get(e),s=i&&i.key;if(s){let o=new Ve(G.comparator);o=o.insert(s,Le.newNoDocument(s,te.min()));const c=ge().add(s),l=new oa(te.min(),new Map,new Ve(me),o,c);await z_(n,l),n.du=n.du.remove(s),n.Au.delete(e),ed(n)}else await ls(n.localStore,e,!1).then(()=>ds(n,e,t)).catch(Sr)}async function zP(r,e){const t=H(r),n=e.batch.batchId;try{const i=await nP(t.localStore,e);Zh(t,n,null),Xh(t,n),t.sharedClientState.updateMutationState(n,"acknowledged"),await qn(t,i)}catch(i){await Sr(i)}}async function KP(r,e,t){const n=H(r);try{const i=await function(o,c){const l=H(o);return l.persistence.runTransaction("Reject batch","readwrite-primary",u=>{let d;return l.mutationQueue.lookupMutationBatch(u,c).next(p=>(Z(p!==null,37113),d=p.keys(),l.mutationQueue.removeMutationBatch(u,p))).next(()=>l.mutationQueue.performConsistencyCheck(u)).next(()=>l.documentOverlayCache.removeOverlaysForBatchId(u,d,c)).next(()=>l.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(u,d)).next(()=>l.localDocuments.getDocuments(u,d))})}(n.localStore,e);Zh(n,e,t),Xh(n,e),n.sharedClientState.updateMutationState(e,"rejected",t),await qn(n,i)}catch(i){await Sr(i)}}async function jP(r,e){const t=H(r);Cr(t.remoteStore)||$(kr,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");try{const n=await function(o){const c=H(o);return c.persistence.runTransaction("Get highest unacknowledged batch id","readonly",l=>c.mutationQueue.getHighestUnacknowledgedBatchId(l))}(t.localStore);if(n===ur)return void e.resolve();const i=t.mu.get(n)||[];i.push(e),t.mu.set(n,i)}catch(n){const i=Rs(n,"Initialization of waitForPendingWrites() operation failed");e.reject(i)}}function Xh(r,e){(r.mu.get(e)||[]).forEach(t=>{t.resolve()}),r.mu.delete(e)}function Zh(r,e,t){const n=H(r);let i=n.Vu[n.currentUser.toKey()];if(i){const s=i.get(e);s&&(t?s.reject(t):s.resolve(),i=i.remove(e)),n.Vu[n.currentUser.toKey()]=i}}function ds(r,e,t=null){r.sharedClientState.removeLocalQueryTarget(e);for(const n of r.Iu.get(e))r.Tu.delete(n),t&&r.Pu.yu(n,t);r.Iu.delete(e),r.isPrimaryClient&&r.Ru.jr(e).forEach(n=>{r.Ru.containsKey(n)||K_(r,n)})}function K_(r,e){r.Eu.delete(e.path.canonicalString());const t=r.du.get(e);t!==null&&(us(r.remoteStore,t),r.du=r.du.remove(e),r.Au.delete(t),ed(r))}function Su(r,e,t){for(const n of t)n instanceof U_?(r.Ru.addReference(n.key,e),GP(r,n)):n instanceof B_?($(kr,"Document no longer in limbo: "+n.key),r.Ru.removeReference(n.key,e),r.Ru.containsKey(n.key)||K_(r,n.key)):Y(19791,{wu:n})}function GP(r,e){const t=e.key,n=t.path.canonicalString();r.du.get(t)||r.Eu.has(n)||($(kr,"New document in limbo: "+t),r.Eu.add(n),ed(r))}function ed(r){for(;r.Eu.size>0&&r.du.size<r.maxConcurrentLimboResolutions;){const e=r.Eu.values().next().value;r.Eu.delete(e);const t=new G(Ie.fromString(e)),n=r.fu.next();r.Au.set(n,new OP(t)),r.du=r.du.insert(t,n),Hc(r.remoteStore,new kn(Dt(Es(t.path)),n,"TargetPurposeLimboResolution",Ot.ce))}}async function qn(r,e,t){const n=H(r),i=[],s=[],o=[];n.Tu.isEmpty()||(n.Tu.forEach((c,l)=>{o.push(n.pu(l,e,t).then(u=>{var d;if((u||t)&&n.isPrimaryClient){const p=u?!u.fromCache:(d=t==null?void 0:t.targetChanges.get(l.targetId))==null?void 0:d.current;n.sharedClientState.updateQueryState(l.targetId,p?"current":"not-current")}if(u){i.push(u);const p=Uh.As(l.targetId,u);s.push(p)}}))}),await Promise.all(o),n.Pu.H_(i),await async function(l,u){const d=H(l);try{await d.persistence.runTransaction("notifyLocalViewChanges","readwrite",p=>b.forEach(u,m=>b.forEach(m.Es,v=>d.persistence.referenceDelegate.addReference(p,m.targetId,v)).next(()=>b.forEach(m.ds,v=>d.persistence.referenceDelegate.removeReference(p,m.targetId,v)))))}catch(p){if(!Rr(p))throw p;$(Bh,"Failed to update sequence numbers: "+p)}for(const p of u){const m=p.targetId;if(!p.fromCache){const v=d.Ms.get(m),M=v.snapshotVersion,F=v.withLastLimboFreeSnapshotVersion(M);d.Ms=d.Ms.insert(m,F)}}}(n.localStore,s))}async function WP(r,e){const t=H(r);if(!t.currentUser.isEqual(e)){$(kr,"User change. New user:",e.toKey());const n=await E_(t.localStore,e);t.currentUser=e,function(s,o){s.mu.forEach(c=>{c.forEach(l=>{l.reject(new B(P.CANCELLED,o))})}),s.mu.clear()}(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,n.removedBatchIds,n.addedBatchIds),await qn(t,n.Ls)}}function HP(r,e){const t=H(r),n=t.Au.get(e);if(n&&n.hu)return ge().add(n.key);{let i=ge();const s=t.Iu.get(e);if(!s)return i;for(const o of s){const c=t.Tu.get(o);i=i.unionWith(c.view.nu)}return i}}async function QP(r,e){const t=H(r),n=await gc(t.localStore,e.query,!0),i=e.view.cu(n);return t.isPrimaryClient&&Su(t,e.targetId,i.au),i}async function YP(r,e){const t=H(r);return A_(t.localStore,e).then(n=>qn(t,n))}async function JP(r,e,t,n){const i=H(r),s=await function(c,l){const u=H(c),d=H(u.mutationQueue);return u.persistence.runTransaction("Lookup mutation documents","readonly",p=>d.er(p,l).next(m=>m?u.localDocuments.getDocuments(p,m):b.resolve(null)))}(i.localStore,e);s!==null?(t==="pending"?await As(i.remoteStore):t==="acknowledged"||t==="rejected"?(Zh(i,e,n||null),Xh(i,e),function(c,l){H(H(c).mutationQueue).ir(l)}(i.localStore,e)):Y(6720,"Unknown batchState",{Su:t}),await qn(i,s)):$(kr,"Cannot apply mutation batch with id: "+e)}async function XP(r,e){const t=H(r);if(Qc(t),td(t),e===!0&&t.gu!==!0){const n=t.sharedClientState.getAllActiveQueryTargets(),i=await Yp(t,n.toArray());t.gu=!0,await bu(t.remoteStore,!0);for(const s of i)Hc(t.remoteStore,s)}else if(e===!1&&t.gu!==!1){const n=[];let i=Promise.resolve();t.Iu.forEach((s,o)=>{t.sharedClientState.isLocalQueryTarget(o)?n.push(o):i=i.then(()=>(ds(t,o),ls(t.localStore,o,!0))),us(t.remoteStore,o)}),await i,await Yp(t,n),function(o){const c=H(o);c.Au.forEach((l,u)=>{us(c.remoteStore,u)}),c.Ru.Jr(),c.Au=new Map,c.du=new Ve(G.comparator)}(t),t.gu=!1,await bu(t.remoteStore,!1)}}async function Yp(r,e,t){const n=H(r),i=[],s=[];for(const o of e){let c;const l=n.Iu.get(o);if(l&&l.length!==0){c=await cs(n.localStore,Dt(l[0]));for(const u of l){const d=n.Tu.get(u),p=await QP(n,d);p.snapshot&&s.push(p.snapshot)}}else{const u=await b_(n.localStore,o);c=await cs(n.localStore,u),await Jh(n,j_(u),o,!1,c.resumeToken)}i.push(c)}return n.Pu.H_(s),i}function j_(r){return Ry(r.path,r.collectionGroup,r.orderBy,r.filters,r.limit,"F",r.startAt,r.endAt)}function ZP(r){return function(t){return H(H(t).persistence).Ts()}(H(r).localStore)}async function e0(r,e,t,n){const i=H(r);if(i.gu)return void $(kr,"Ignoring unexpected query state notification.");const s=i.Iu.get(e);if(s&&s.length>0)switch(t){case"current":case"not-current":{const o=await A_(i.localStore,Cy(s[0])),c=oa.createSynthesizedRemoteEventForCurrentChange(e,t==="current",He.EMPTY_BYTE_STRING);await qn(i,o,c);break}case"rejected":await ls(i.localStore,e,!0),ds(i,e,n);break;default:Y(64155,t)}}async function t0(r,e,t){const n=Qc(r);if(n.gu){for(const i of e){if(n.Iu.has(i)&&n.sharedClientState.isActiveQueryTarget(i)){$(kr,"Adding an already active target "+i);continue}const s=await b_(n.localStore,i),o=await cs(n.localStore,s);await Jh(n,j_(s),o.targetId,!1,o.resumeToken),Hc(n.remoteStore,o)}for(const i of t)n.Iu.has(i)&&await ls(n.localStore,i,!1).then(()=>{us(n.remoteStore,i),ds(n,i)}).catch(Sr)}}function Qc(r){const e=H(r);return e.remoteStore.remoteSyncer.applyRemoteEvent=z_.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=HP.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=$P.bind(null,e),e.Pu.H_=kP.bind(null,e.eventManager),e.Pu.yu=xP.bind(null,e.eventManager),e}function td(r){const e=H(r);return e.remoteStore.remoteSyncer.applySuccessfulWrite=zP.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=KP.bind(null,e),e}function n0(r,e,t){const n=H(r);(async function(s,o,c){try{const l=await o.getMetadata();if(await function(v,M){const F=H(v),U=et(M.createTime);return F.persistence.runTransaction("hasNewerBundle","readonly",X=>F.Ii.getBundleMetadata(X,M.id)).then(X=>!!X&&X.createTime.compareTo(U)>=0)}(s.localStore,l))return await o.close(),c._completeWith(function(v){return{taskState:"Success",documentsLoaded:v.totalDocuments,bytesLoaded:v.totalBytes,totalDocuments:v.totalDocuments,totalBytes:v.totalBytes}}(l)),Promise.resolve(new Set);c._updateProgress(F_(l));const u=new NP(l,o.serializer);let d=await o.bu();for(;d;){const m=await u.Ga(d);m&&c._updateProgress(m),d=await o.bu()}const p=await u.ja(s.localStore);return await qn(s,p.Ha,void 0),await function(v,M){const F=H(v);return F.persistence.runTransaction("Save bundle","readwrite",U=>F.Ii.saveBundleMetadata(U,M))}(s.localStore,l),c._completeWith(p.progress),Promise.resolve(p.Ja)}catch(l){return bn(kr,`Loading bundle failed with ${l}`),c._failWith(l),Promise.resolve(new Set)}})(n,e,t).then(i=>{n.sharedClientState.notifyBundleLoaded(i)})}class qo{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=ca(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return I_(this.persistence,new w_,e.initialUser,this.serializer)}Cu(e){return new Mh(Wc.mi,this.serializer)}Du(e){return new k_}async terminate(){var e,t;(e=this.gcScheduler)==null||e.stop(),(t=this.indexBackfillerScheduler)==null||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}qo.provider={build:()=>new qo};class r0 extends qo{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){Z(this.persistence.referenceDelegate instanceof mc,46915);const n=this.persistence.referenceDelegate.garbageCollector;return new f_(n,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?Tt.withCacheSize(this.cacheSizeBytes):Tt.DEFAULT;return new Mh(n=>mc.mi(n,t),this.serializer)}}class G_ extends qo{constructor(e,t,n){super(),this.xu=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.kind="persistent",this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.xu.initialize(this,e),await td(this.xu.syncEngine),await As(this.xu.remoteStore),await this.persistence.Ji(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}vu(e){return I_(this.persistence,new w_,e.initialUser,this.serializer)}Fu(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new f_(n,e.asyncQueue,t)}Mu(e,t){const n=new dS(t,this.persistence);return new hS(e.asyncQueue,n)}Cu(e){const t=Fh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=this.cacheSizeBytes!==void 0?Tt.withCacheSize(this.cacheSizeBytes):Tt.DEFAULT;return new Lh(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,x_(),Qa(),this.serializer,this.sharedClientState,!!this.forceOwnership)}Du(e){return new k_}}class i0 extends G_{constructor(e,t){super(e,t,!1),this.xu=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.xu.syncEngine;this.sharedClientState instanceof Bl&&(this.sharedClientState.syncEngine={Co:JP.bind(null,t),vo:e0.bind(null,t),Fo:t0.bind(null,t),Ts:ZP.bind(null,t),Do:YP.bind(null,t)},await this.sharedClientState.start()),await this.persistence.Ji(async n=>{await XP(this.xu.syncEngine,n),this.gcScheduler&&(n&&!this.gcScheduler.started?this.gcScheduler.start():n||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(n&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():n||this.indexBackfillerScheduler.stop())})}Du(e){const t=x_();if(!Bl.v(t))throw new B(P.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Fh(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Bl(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class $o{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=n=>Qp(this.syncEngine,n,1),this.remoteStore.remoteSyncer.handleCredentialChange=WP.bind(null,this.syncEngine),await bu(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new CP}()}createDatastore(e){const t=ca(e.databaseInfo.databaseId),n=function(s){return new hP(s)}(e.databaseInfo);return function(s,o,c,l){return new mP(s,o,c,l)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(n,i,s,o,c){return new yP(n,i,s,o,c)}(this.localStore,this.datastore,e.asyncQueue,t=>Qp(this.syncEngine,t,0),function(){return $p.v()?new $p:new aP}())}createSyncEngine(e,t){return function(i,s,o,c,l,u,d){const p=new MP(i,s,o,c,l,u);return d&&(p.gu=!0),p}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await async function(i){const s=H(i);$(pi,"RemoteStore shutting down."),s.Ea.add(5),await bs(s),s.Aa.shutdown(),s.Ra.set("Unknown")}(this.remoteStore),(e=this.datastore)==null||e.terminate(),(t=this.eventManager)==null||t.terminate()}}$o.provider={build:()=>new $o};function Jp(r,e=10240){let t=0;return{async read(){if(t<r.byteLength){const n={value:r.slice(t,t+e),done:!1};return t+=e,n}return{done:!0}},async cancel(){},releaseLock(){},closed:Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */class Yc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):Ze("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout(()=>{this.muted||e(t)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class s0{constructor(e,t){this.Bu=e,this.serializer=t,this.metadata=new yt,this.buffer=new Uint8Array,this.Lu=function(){return new TextDecoder("utf-8")}(),this.ku().then(n=>{n&&n.$a()?this.metadata.resolve(n.Qa.metadata):this.metadata.reject(new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(n==null?void 0:n.Qa)}`))},n=>this.metadata.reject(n))}close(){return this.Bu.cancel()}async getMetadata(){return this.metadata.promise}async bu(){return await this.getMetadata(),this.ku()}async ku(){const e=await this.qu();if(e===null)return null;const t=this.Lu.decode(e),n=Number(t);isNaN(n)&&this.Qu(`length string (${t}) is not valid number`);const i=await this.$u(n);return new DP(JSON.parse(i),e.length+n)}Uu(){return this.buffer.findIndex(e=>e===123)}async qu(){for(;this.Uu()<0&&!await this.Ku(););if(this.buffer.length===0)return null;const e=this.Uu();e<0&&this.Qu("Reached the end of bundle when a length string is expected.");const t=this.buffer.slice(0,e);return this.buffer=this.buffer.slice(e),t}async $u(e){for(;this.buffer.length<e;)await this.Ku()&&this.Qu("Reached the end of bundle when more is expected.");const t=this.Lu.decode(this.buffer.slice(0,e));return this.buffer=this.buffer.slice(e),t}Qu(e){throw this.Bu.cancel(),new Error(`Invalid bundle format: ${e}`)}async Ku(){const e=await this.Bu.read();if(!e.done){const t=new Uint8Array(this.buffer.length+e.value.length);t.set(this.buffer),t.set(e.value,this.buffer.length),this.buffer=t}return e.done}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class o0{constructor(e){this.datastore=e,this.readVersions=new Map,this.mutations=[],this.committed=!1,this.lastTransactionError=null,this.writtenDocs=new Set}async lookup(e){if(this.ensureCommitNotCalled(),this.mutations.length>0)throw this.lastTransactionError=new B(P.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes."),this.lastTransactionError;const t=await async function(i,s){const o=H(i),c={documents:s.map(p=>Uo(o.serializer,p))},l=await o.Ho("BatchGetDocuments",o.serializer.databaseId,Ie.emptyPath(),c,s.length),u=new Map;l.forEach(p=>{const m=_R(o.serializer,p);u.set(m.key.toString(),m)});const d=[];return s.forEach(p=>{const m=u.get(p.toString());Z(!!m,55234,{key:p}),d.push(m)}),d}(this.datastore,e);return t.forEach(n=>this.recordVersion(n)),t}set(e,t){this.write(t.toMutation(e,this.precondition(e))),this.writtenDocs.add(e.toString())}update(e,t){try{this.write(t.toMutation(e,this.preconditionForUpdate(e)))}catch(n){this.lastTransactionError=n}this.writtenDocs.add(e.toString())}delete(e){this.write(new Ts(e,this.precondition(e))),this.writtenDocs.add(e.toString())}async commit(){if(this.ensureCommitNotCalled(),this.lastTransactionError)throw this.lastTransactionError;const e=this.readVersions;this.mutations.forEach(t=>{e.delete(t.key.toString())}),e.forEach((t,n)=>{const i=G.fromPath(n);this.mutations.push(new Sh(i,this.precondition(i)))}),await async function(n,i){const s=H(n),o={writes:i.map(c=>Bo(s.serializer,c))};await s.Go("Commit",s.serializer.databaseId,Ie.emptyPath(),o)}(this.datastore,this.mutations),this.committed=!0}recordVersion(e){let t;if(e.isFoundDocument())t=e.version;else{if(!e.isNoDocument())throw Y(50498,{Gu:e.constructor.name});t=te.min()}const n=this.readVersions.get(e.key.toString());if(n){if(!t.isEqual(n))throw new B(P.ABORTED,"Document version changed between two reads.")}else this.readVersions.set(e.key.toString(),t)}precondition(e){const t=this.readVersions.get(e.toString());return!this.writtenDocs.has(e.toString())&&t?t.isEqual(te.min())?qe.exists(!1):qe.updateTime(t):qe.none()}preconditionForUpdate(e){const t=this.readVersions.get(e.toString());if(!this.writtenDocs.has(e.toString())&&t){if(t.isEqual(te.min()))throw new B(P.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return qe.updateTime(t)}return qe.exists(!0)}write(e){this.ensureCommitNotCalled(),this.mutations.push(e)}ensureCommitNotCalled(){}}/**
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
 */class a0{constructor(e,t,n,i,s){this.asyncQueue=e,this.datastore=t,this.options=n,this.updateFunction=i,this.deferred=s,this.zu=n.maxAttempts,this.M_=new $h(this.asyncQueue,"transaction_retry")}ju(){this.zu-=1,this.Ju()}Ju(){this.M_.p_(async()=>{const e=new o0(this.datastore),t=this.Hu(e);t&&t.then(n=>{this.asyncQueue.enqueueAndForget(()=>e.commit().then(()=>{this.deferred.resolve(n)}).catch(i=>{this.Yu(i)}))}).catch(n=>{this.Yu(n)})})}Hu(e){try{const t=this.updateFunction(e);return!ea(t)&&t.catch&&t.then?t:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}}Yu(e){this.zu>0&&this.Zu(e)?(this.zu-=1,this.asyncQueue.enqueueAndForget(()=>(this.Ju(),Promise.resolve()))):this.deferred.reject(e)}Zu(e){if((e==null?void 0:e.name)==="FirebaseError"){const t=e.code;return t==="aborted"||t==="failed-precondition"||t==="already-exists"||!$y(t)}return!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vr="FirestoreClient";class c0{constructor(e,t,n,i,s){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=i,this.user=ht.UNAUTHENTICATED,this.clientId=dh.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=s,this.authCredentials.start(n,async o=>{$(vr,"Received user=",o.uid),await this.authCredentialListener(o),this.user=o}),this.appCheckCredentials.start(n,o=>($(vr,"Received new app check token=",o),this.appCheckCredentialListener(o,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new yt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Rs(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function $l(r,e){r.asyncQueue.verifyOperationInProgress(),$(vr,"Initializing OfflineComponentProvider");const t=r.configuration;await e.initialize(t);let n=t.initialUser;r.setCredentialChangeListener(async i=>{n.isEqual(i)||(await E_(e.localStore,i),n=i)}),e.persistence.setDatabaseDeletedListener(()=>r.terminate()),r._offlineComponents=e}async function Xp(r,e){r.asyncQueue.verifyOperationInProgress();const t=await nd(r);$(vr,"Initializing OnlineComponentProvider"),await e.initialize(t,r.configuration),r.setCredentialChangeListener(n=>Kp(e.remoteStore,n)),r.setAppCheckTokenChangeListener((n,i)=>Kp(e.remoteStore,i)),r._onlineComponents=e}async function nd(r){if(!r._offlineComponents)if(r._uninitializedComponentsProvider){$(vr,"Using user provided OfflineComponentProvider");try{await $l(r,r._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!function(i){return i.name==="FirebaseError"?i.code===P.FAILED_PRECONDITION||i.code===P.UNIMPLEMENTED:!(typeof DOMException<"u"&&i instanceof DOMException)||i.code===22||i.code===20||i.code===11}(t))throw t;bn("Error using user provided cache. Falling back to memory cache: "+t),await $l(r,new qo)}}else $(vr,"Using default OfflineComponentProvider"),await $l(r,new r0(void 0));return r._offlineComponents}async function Jc(r){return r._onlineComponents||(r._uninitializedComponentsProvider?($(vr,"Using user provided OnlineComponentProvider"),await Xp(r,r._uninitializedComponentsProvider._online)):($(vr,"Using default OnlineComponentProvider"),await Xp(r,new $o))),r._onlineComponents}function W_(r){return nd(r).then(e=>e.persistence)}function rd(r){return nd(r).then(e=>e.localStore)}function H_(r){return Jc(r).then(e=>e.remoteStore)}function id(r){return Jc(r).then(e=>e.syncEngine)}function l0(r){return Jc(r).then(e=>e.datastore)}async function fs(r){const e=await Jc(r),t=e.eventManager;return t.onListen=LP.bind(null,e.syncEngine),t.onUnlisten=UP.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=FP.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=BP.bind(null,e.syncEngine),t}function u0(r){return r.asyncQueue.enqueue(async()=>{const e=await W_(r),t=await H_(r);return e.setNetworkEnabled(!0),function(i){const s=H(i);return s.Ea.delete(0),la(s)}(t)})}function h0(r){return r.asyncQueue.enqueue(async()=>{const e=await W_(r),t=await H_(r);return e.setNetworkEnabled(!1),async function(i){const s=H(i);s.Ea.add(0),await bs(s),s.Ra.set("Offline")}(t)})}function d0(r,e){const t=new yt;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await function(u,d){const p=H(u);return p.persistence.runTransaction("read document","readonly",m=>p.localDocuments.getDocument(m,d))}(i,s);c.isFoundDocument()?o.resolve(c):c.isNoDocument()?o.resolve(null):o.reject(new B(P.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"))}catch(c){const l=Rs(c,`Failed to get document '${s} from cache`);o.reject(l)}}(await rd(r),e,t)),t.promise}function Q_(r,e,t={}){const n=new yt;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new Yc({next:m=>{d.Nu(),o.enqueueAndForget(()=>Hh(s,p));const v=m.docs.has(c);!v&&m.fromCache?u.reject(new B(P.UNAVAILABLE,"Failed to get document because the client is offline.")):v&&m.fromCache&&l&&l.source==="server"?u.reject(new B(P.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):u.resolve(m)},error:m=>u.reject(m)}),p=new Yh(Es(c.path),d,{includeMetadataChanges:!0,qa:!0});return Wh(s,p)}(await fs(r),r.asyncQueue,e,t,n)),n.promise}function f0(r,e){const t=new yt;return r.asyncQueue.enqueueAndForget(async()=>async function(i,s,o){try{const c=await gc(i,s,!0),l=new q_(s,c.Qs),u=l.ru(c.documents),d=l.applyChanges(u,!1);o.resolve(d.snapshot)}catch(c){const l=Rs(c,`Failed to execute query '${s} against cache`);o.reject(l)}}(await rd(r),e,t)),t.promise}function Y_(r,e,t={}){const n=new yt;return r.asyncQueue.enqueueAndForget(async()=>function(s,o,c,l,u){const d=new Yc({next:m=>{d.Nu(),o.enqueueAndForget(()=>Hh(s,p)),m.fromCache&&l.source==="server"?u.reject(new B(P.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):u.resolve(m)},error:m=>u.reject(m)}),p=new Yh(c,d,{includeMetadataChanges:!0,qa:!0});return Wh(s,p)}(await fs(r),r.asyncQueue,e,t,n)),n.promise}function p0(r,e){const t=new Yc(e);return r.asyncQueue.enqueueAndForget(async()=>function(i,s){H(i).Ca.add(s),s.next()}(await fs(r),t)),()=>{t.Nu(),r.asyncQueue.enqueueAndForget(async()=>function(i,s){H(i).Ca.delete(s)}(await fs(r),t))}}function m0(r,e,t,n){const i=function(o,c){let l;return l=typeof o=="string"?Ky().encode(o):o,function(d,p){return new s0(d,p)}(function(d,p){if(d instanceof Uint8Array)return Jp(d,p);if(d instanceof ArrayBuffer)return Jp(new Uint8Array(d),p);if(d instanceof ReadableStream)return d.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream")}(l),c)}(t,ca(e));r.asyncQueue.enqueueAndForget(async()=>{n0(await id(r),i,n)})}function g0(r,e){return r.asyncQueue.enqueue(async()=>function(n,i){const s=H(n);return s.persistence.runTransaction("Get named query","readonly",o=>s.Ii.getNamedQuery(o,i))}(await rd(r),e))}/**
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
 */function J_(r){const e={};return r.timeoutSeconds!==void 0&&(e.timeoutSeconds=r.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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
 */const X_="firestore.googleapis.com",em=!0;class tm{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new B(P.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=X_,this.ssl=em}else this.host=e.host,this.ssl=e.ssl??em;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=l_;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<LR)throw new B(P.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}jg("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=J_(e.experimentalLongPollingOptions??{}),function(n){if(n.timeoutSeconds!==void 0){if(isNaN(n.timeoutSeconds))throw new B(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (must not be NaN)`);if(n.timeoutSeconds<5)throw new B(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (minimum allowed value is 5)`);if(n.timeoutSeconds>30)throw new B(P.INVALID_ARGUMENT,`invalid long polling timeout: ${n.timeoutSeconds} (maximum allowed value is 30)`)}}(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(n,i){return n.timeoutSeconds===i.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class ua{constructor(e,t,n,i){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=i,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new tm({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new B(P.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new B(P.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new tm(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=function(n){if(!n)return new ZA;switch(n.type){case"firstParty":return new rS(n.sessionIndex||"0",n.iamToken||null,n.authTokenFactory||null);case"provider":return n.client;default:throw new B(P.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(t){const n=Zp.get(t);n&&($("ComponentProvider","Removing Datastore"),Zp.delete(t),n.terminate())}(this),Promise.resolve()}}function y0(r,e,t,n={}){var u;r=Ae(r,ua);const i=ms(e),s=r._getSettings(),o={...s,emulatorOptions:r._getEmulatorOptions()},c=`${e}:${t}`;i&&(pm(`https://${c}`),mm("Firestore",!0)),s.host!==X_&&s.host!==c&&bn("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const l={...s,host:c,ssl:i,emulatorOptions:n};if(!dr(l,o)&&(r._setSettings(l),n.mockUserToken)){let d,p;if(typeof n.mockUserToken=="string")d=n.mockUserToken,p=ht.MOCK_USER;else{d=nI(n.mockUserToken,(u=r._app)==null?void 0:u.options.projectId);const m=n.mockUserToken.sub||n.mockUserToken.user_id;if(!m)throw new B(P.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");p=new ht(m)}r._authCredentials=new eS(new zg(d,p))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Nt=class Z_{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new Z_(this.firestore,e,this._query)}},Ne=class io{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new hr(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new io(this.firestore,e,this._key)}toJSON(){return{type:io._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,n){if(Zo(t,io._jsonSchema))return new io(e,n||null,new G(Ie.fromString(t.referencePath)))}};Ne._jsonSchemaVersion="firestore/documentReference/1.0",Ne._jsonSchema={type:it("string",Ne._jsonSchemaVersion),referencePath:it("string")};let hr=class ew extends Nt{constructor(e,t,n){super(e,t,Es(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Ne(this.firestore,null,new G(e))}withConverter(e){return new ew(this.firestore,e,this._path)}};function tw(r,e,...t){if(r=le(r),fh("collection","path",e),r instanceof ua){const n=Ie.fromString(e,...t);return zf(n),new hr(r,null,n)}{if(!(r instanceof Ne||r instanceof hr))throw new B(P.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Ie.fromString(e,...t));return zf(n),new hr(r.firestore,null,n)}}function _0(r,e){if(r=Ae(r,ua),fh("collectionGroup","collection id",e),e.indexOf("/")>=0)throw new B(P.INVALID_ARGUMENT,`Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);return new Nt(r,null,function(n){return new Fn(Ie.emptyPath(),n)}(e))}function Ic(r,e,...t){if(r=le(r),arguments.length===1&&(e=dh.newId()),fh("doc","path",e),r instanceof ua){const n=Ie.fromString(e,...t);return $f(n),new Ne(r,null,new G(n))}{if(!(r instanceof Ne||r instanceof hr))throw new B(P.INVALID_ARGUMENT,"Expected first argument to doc() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const n=r._path.child(Ie.fromString(e,...t));return $f(n),new Ne(r.firestore,r instanceof hr?r.converter:null,new G(n))}}function nw(r,e){return r=le(r),e=le(e),(r instanceof Ne||r instanceof hr)&&(e instanceof Ne||e instanceof hr)&&r.firestore===e.firestore&&r.path===e.path&&r.converter===e.converter}function rw(r,e){return r=le(r),e=le(e),r instanceof Nt&&e instanceof Nt&&r.firestore===e.firestore&&ra(r._query,e._query)&&r.converter===e.converter}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nm="AsyncQueue";class rm{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new $h(this,"async_queue_retry"),this._c=()=>{const n=Qa();n&&$(nm,"Visibility state changed to "+n.visibilityState),this.M_.w_()},this.ac=e;const t=Qa();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=Qa();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise(()=>{});const t=new yt;return this.cc(()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.Xu.push(e),this.lc()))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Rr(e))throw e;$(nm,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_(()=>this.lc())}}cc(e){const t=this.ac.then(()=>(this.rc=!0,e().catch(n=>{throw this.nc=n,this.rc=!1,Ze("INTERNAL UNHANDLED ERROR: ",im(n)),n}).then(n=>(this.rc=!1,n))));return this.ac=t,t}enqueueAfterDelay(e,t,n){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const i=Gh.createAndSchedule(this,e,t,n,s=>this.hc(s));return this.tc.push(i),i}uc(){this.nc&&Y(47125,{Pc:im(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then(()=>{this.tc.sort((t,n)=>t.targetTimeMs-n.targetTimeMs);for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()})}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function im(r){let e=r.message||"";return r.stack&&(e=r.stack.includes(r.message)?r.stack:r.message+`
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
 */function Ru(r){return function(t,n){if(typeof t!="object"||t===null)return!1;const i=t;for(const s of n)if(s in i&&typeof i[s]=="function")return!0;return!1}(r,["next","error","complete"])}class w0{constructor(){this._progressObserver={},this._taskCompletionResolver=new yt,this._lastProgress={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0}}onProgress(e,t,n){this._progressObserver={next:e,error:t,complete:n}}catch(e){return this._taskCompletionResolver.promise.catch(e)}then(e,t){return this._taskCompletionResolver.promise.then(e,t)}_completeWith(e){this._updateProgress(e),this._progressObserver.complete&&this._progressObserver.complete(),this._taskCompletionResolver.resolve(e)}_failWith(e){this._lastProgress.taskState="Error",this._progressObserver.next&&this._progressObserver.next(this._lastProgress),this._progressObserver.error&&this._progressObserver.error(e),this._taskCompletionResolver.reject(e)}_updateProgress(e){this._lastProgress=e,this._progressObserver.next&&this._progressObserver.next(e)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const I0=-1;let tt=class extends ua{constructor(e,t,n,i){super(e,t,n,i),this.type="firestore",this._queue=new rm,this._persistenceKey=(i==null?void 0:i.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new rm(e),this._firestoreClient=void 0,await e}}};function St(r){if(r._terminated)throw new B(P.FAILED_PRECONDITION,"The client has already been terminated.");return r._firestoreClient||iw(r),r._firestoreClient}function iw(r){var n,i,s;const e=r._freezeSettings(),t=function(c,l,u,d){return new qS(c,l,u,d.host,d.ssl,d.experimentalForceLongPolling,d.experimentalAutoDetectLongPolling,J_(d.experimentalLongPollingOptions),d.useFetchStreams,d.isUsingEmulator)}(r._databaseId,((n=r._app)==null?void 0:n.options.appId)||"",r._persistenceKey,e);r._componentsProvider||(i=e.localCache)!=null&&i._offlineComponentProvider&&((s=e.localCache)!=null&&s._onlineComponentProvider)&&(r._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),r._firestoreClient=new c0(r._authCredentials,r._appCheckCredentials,r._queue,t,r._componentsProvider&&function(c){const l=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(l),_online:l}}(r._componentsProvider))}function E0(r,e){bn("enableIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const t=r._freezeSettings();return sw(r,$o.provider,{build:n=>new G_(n,t.cacheSizeBytes,e==null?void 0:e.forceOwnership)}),Promise.resolve()}async function v0(r){bn("enableMultiTabIndexedDbPersistence() will be deprecated in the future, you can use `FirestoreSettings.cache` instead.");const e=r._freezeSettings();sw(r,$o.provider,{build:t=>new i0(t,e.cacheSizeBytes)})}function sw(r,e,t){if((r=Ae(r,tt))._firestoreClient||r._terminated)throw new B(P.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");if(r._componentsProvider||r._getSettings().localCache)throw new B(P.FAILED_PRECONDITION,"SDK cache is already specified.");r._componentsProvider={_online:e,_offline:t},iw(r)}function T0(r){if(r._initialized&&!r._terminated)throw new B(P.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");const e=new yt;return r._queue.enqueueAndForgetEvenWhileRestricted(async()=>{try{await async function(n){if(!wn.v())return Promise.resolve();const i=n+__;await wn.delete(i)}(Fh(r._databaseId,r._persistenceKey)),e.resolve()}catch(t){e.reject(t)}}),e.promise}function b0(r){return function(t){const n=new yt;return t.asyncQueue.enqueueAndForget(async()=>jP(await id(t),n)),n.promise}(St(r=Ae(r,tt)))}function A0(r){return u0(St(r=Ae(r,tt)))}function S0(r){return h0(St(r=Ae(r,tt)))}function R0(r,e){const t=St(r=Ae(r,tt)),n=new w0;return m0(t,r._databaseId,e,n),n}function P0(r,e){return g0(St(r=Ae(r,tt)),e).then(t=>t?new Nt(r,null,t.query):null)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bt{constructor(e){this._byteString=e}static fromBase64String(e){try{return new bt(He.fromBase64String(e))}catch(t){throw new B(P.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new bt(He.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:bt._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Zo(e,bt._jsonSchema))return bt.fromBase64String(e.bytes)}}bt._jsonSchemaVersion="firestore/bytes/1.0",bt._jsonSchema={type:it("string",bt._jsonSchemaVersion),bytes:it("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Tr=class{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new B(P.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Be(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let _i=class{constructor(e){this._methodName=e}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tn{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new B(P.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new B(P.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return me(this._lat,e._lat)||me(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:tn._jsonSchemaVersion}}static fromJSON(e){if(Zo(e,tn._jsonSchema))return new tn(e.latitude,e.longitude)}}tn._jsonSchemaVersion="firestore/geoPoint/1.0",tn._jsonSchema={type:it("string",tn._jsonSchemaVersion),latitude:it("number"),longitude:it("number")};/**
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
 */class En{constructor(e){this._values=(e||[]).map(t=>t)}toArray(){return this._values.map(e=>e)}isEqual(e){return function(n,i){if(n.length!==i.length)return!1;for(let s=0;s<n.length;++s)if(n[s]!==i[s])return!1;return!0}(this._values,e._values)}toJSON(){return{type:En._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Zo(e,En._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every(t=>typeof t=="number"))return new En(e.vectorValues);throw new B(P.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}En._jsonSchemaVersion="firestore/vectorValue/1.0",En._jsonSchema={type:it("string",En._jsonSchemaVersion),vectorValues:it("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const C0=/^__.*__$/;class k0{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return this.fieldMask!==null?new Bn(e,this.data,this.fieldMask,t,this.fieldTransforms):new vs(e,this.data,t,this.fieldTransforms)}}class ow{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new Bn(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function aw(r){switch(r){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw Y(40011,{Ac:r})}}class Xc{constructor(e,t,n,i,s,o){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=i,s===void 0&&this.Rc(),this.fieldTransforms=s||[],this.fieldMask=o||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new Xc({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.gc(e),n}yc(e){var i;const t=(i=this.path)==null?void 0:i.child(e),n=this.Vc({path:t,fc:!1});return n.Rc(),n}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Ec(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find(t=>e.isPrefixOf(t))!==void 0||this.fieldTransforms.find(t=>e.isPrefixOf(t.field))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(aw(this.Ac)&&C0.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class x0{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||ca(e)}Cc(e,t,n,i=!1){return new Xc({Ac:e,methodName:t,Dc:n,path:Be.emptyPath(),fc:!1,bc:i},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function wi(r){const e=r._freezeSettings(),t=ca(r._databaseId);return new x0(r._databaseId,!!e.ignoreUndefinedProperties,t)}function Zc(r,e,t,n,i,s={}){const o=r.Cc(s.merge||s.mergeFields?2:0,e,t,i);hd("Data must be an object, but it was:",o,n);const c=uw(n,o);let l,u;if(s.merge)l=new Mt(o.fieldMask),u=o.fieldTransforms;else if(s.mergeFields){const d=[];for(const p of s.mergeFields){const m=Pu(e,p,t);if(!o.contains(m))throw new B(P.INVALID_ARGUMENT,`Field '${m}' is specified in your field mask but missing from your input data.`);dw(d,m)||d.push(m)}l=new Mt(d),u=o.fieldTransforms.filter(p=>l.covers(p.field))}else l=null,u=o.fieldTransforms;return new k0(new gt(c),l,u)}class ha extends _i{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof ha}}function cw(r,e,t){return new Xc({Ac:3,Dc:e.settings.Dc,methodName:r._methodName,fc:t},e.databaseId,e.serializer,e.ignoreUndefinedProperties)}class sd extends _i{_toFieldTransform(e){return new sa(e.path,new ss)}isEqual(e){return e instanceof sd}}class od extends _i{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=cw(this,e,!0),n=this.vc.map(s=>Ii(s,t)),i=new li(n);return new sa(e.path,i)}isEqual(e){return e instanceof od&&dr(this.vc,e.vc)}}class ad extends _i{constructor(e,t){super(e),this.vc=t}_toFieldTransform(e){const t=cw(this,e,!0),n=this.vc.map(s=>Ii(s,t)),i=new ui(n);return new sa(e.path,i)}isEqual(e){return e instanceof ad&&dr(this.vc,e.vc)}}class cd extends _i{constructor(e,t){super(e),this.Fc=t}_toFieldTransform(e){const t=new os(e.serializer,Oy(e.serializer,this.Fc));return new sa(e.path,t)}isEqual(e){return e instanceof cd&&this.Fc===e.Fc}}function ld(r,e,t,n){const i=r.Cc(1,e,t);hd("Data must be an object, but it was:",i,n);const s=[],o=gt.empty();Pr(n,(l,u)=>{const d=dd(e,l,t);u=le(u);const p=i.yc(d);if(u instanceof ha)s.push(d);else{const m=Ii(u,p);m!=null&&(s.push(d),o.set(d,m))}});const c=new Mt(s);return new ow(o,c,i.fieldTransforms)}function ud(r,e,t,n,i,s){const o=r.Cc(1,e,t),c=[Pu(e,n,t)],l=[i];if(s.length%2!=0)throw new B(P.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let m=0;m<s.length;m+=2)c.push(Pu(e,s[m])),l.push(s[m+1]);const u=[],d=gt.empty();for(let m=c.length-1;m>=0;--m)if(!dw(u,c[m])){const v=c[m];let M=l[m];M=le(M);const F=o.yc(v);if(M instanceof ha)u.push(v);else{const U=Ii(M,F);U!=null&&(u.push(v),d.set(v,U))}}const p=new Mt(u);return new ow(d,p,o.fieldTransforms)}function lw(r,e,t,n=!1){return Ii(t,r.Cc(n?4:3,e))}function Ii(r,e){if(hw(r=le(r)))return hd("Unsupported field value:",e,r),uw(r,e);if(r instanceof _i)return function(n,i){if(!aw(i.Ac))throw i.Sc(`${n._methodName}() can only be used with update() and set()`);if(!i.path)throw i.Sc(`${n._methodName}() is not currently supported inside arrays`);const s=n._toFieldTransform(i);s&&i.fieldTransforms.push(s)}(r,e),null;if(r===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),r instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return function(n,i){const s=[];let o=0;for(const c of n){let l=Ii(c,i.wc(o));l==null&&(l={nullValue:"NULL_VALUE"}),s.push(l),o++}return{arrayValue:{values:s}}}(r,e)}return function(n,i){if((n=le(n))===null)return{nullValue:"NULL_VALUE"};if(typeof n=="number")return Oy(i.serializer,n);if(typeof n=="boolean")return{booleanValue:n};if(typeof n=="string")return{stringValue:n};if(n instanceof Date){const s=Se.fromDate(n);return{timestampValue:as(i.serializer,s)}}if(n instanceof Se){const s=new Se(n.seconds,1e3*Math.floor(n.nanoseconds/1e3));return{timestampValue:as(i.serializer,s)}}if(n instanceof tn)return{geoPointValue:{latitude:n.latitude,longitude:n.longitude}};if(n instanceof bt)return{bytesValue:Wy(i.serializer,n._byteString)};if(n instanceof Ne){const s=i.databaseId,o=n.firestore._databaseId;if(!o.isEqual(s))throw i.Sc(`Document reference is for database ${o.projectId}/${o.database} but should be for database ${s.projectId}/${s.database}`);return{referenceValue:xh(n.firestore._databaseId||i.databaseId,n._key.path)}}if(n instanceof En)return function(o,c){return{mapValue:{fields:{[Ih]:{stringValue:Eh},[ns]:{arrayValue:{values:o.toArray().map(u=>{if(typeof u!="number")throw c.Sc("VectorValues must only contain numeric values.");return Ah(c.serializer,u)})}}}}}}(n,i);throw i.Sc(`Unsupported field value: ${Oc(n)}`)}(r,e)}function uw(r,e){const t={};return uy(r)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Pr(r,(n,i)=>{const s=Ii(i,e.mc(n));s!=null&&(t[n]=s)}),{mapValue:{fields:t}}}function hw(r){return!(typeof r!="object"||r===null||r instanceof Array||r instanceof Date||r instanceof Se||r instanceof tn||r instanceof bt||r instanceof Ne||r instanceof _i||r instanceof En)}function hd(r,e,t){if(!hw(t)||!Gg(t)){const n=Oc(t);throw n==="an object"?e.Sc(r+" a custom object"):e.Sc(r+" "+n)}}function Pu(r,e,t){if((e=le(e))instanceof Tr)return e._internalPath;if(typeof e=="string")return dd(r,e);throw Ec("Field path arguments must be of type string or ",r,!1,void 0,t)}const D0=new RegExp("[~\\*/\\[\\]]");function dd(r,e,t){if(e.search(D0)>=0)throw Ec(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,r,!1,void 0,t);try{return new Tr(...e.split("."))._internalPath}catch{throw Ec(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,r,!1,void 0,t)}}function Ec(r,e,t,n,i){const s=n&&!n.isEmpty(),o=i!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let l="";return(s||o)&&(l+=" (found",s&&(l+=` in field ${n}`),o&&(l+=` in document ${i}`),l+=")"),new B(P.INVALID_ARGUMENT,c+r+l)}function dw(r,e){return r.some(t=>t.isEqual(e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zo{constructor(e,t,n,i,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=i,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new Ne(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new N0(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(el("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class N0 extends zo{data(){return super.data()}}function el(r,e){return typeof e=="string"?dd(r,e):e instanceof Tr?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fw(r){if(r.limitType==="L"&&r.explicitOrderBy.length===0)throw new B(P.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class fd{}class da extends fd{}function nr(r,e,...t){let n=[];e instanceof fd&&n.push(e),n=n.concat(t),function(s){const o=s.filter(l=>l instanceof pd).length,c=s.filter(l=>l instanceof tl).length;if(o>1||o>0&&c>0)throw new B(P.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}(n);for(const i of n)r=i._apply(r);return r}class tl extends da{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new tl(e,t,n)}_apply(e){const t=this._parse(e);return mw(e._query,t),new Nt(e.firestore,e.converter,pu(e._query,t))}_parse(e){const t=wi(e.firestore);return function(s,o,c,l,u,d,p){let m;if(u.isKeyField()){if(d==="array-contains"||d==="array-contains-any")throw new B(P.INVALID_ARGUMENT,`Invalid Query. You can't perform '${d}' queries on documentId().`);if(d==="in"||d==="not-in"){om(p,d);const M=[];for(const F of p)M.push(sm(l,s,F));m={arrayValue:{values:M}}}else m=sm(l,s,p)}else d!=="in"&&d!=="not-in"&&d!=="array-contains-any"||om(p,d),m=lw(c,o,p,d==="in"||d==="not-in");return ve.create(u,d,m)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function V0(r,e,t){const n=e,i=el("where",r);return tl._create(i,n,t)}class pd extends fd{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new pd(e,t)}_parse(e){const t=this._queryConstraints.map(n=>n._parse(e)).filter(n=>n.getFilters().length>0);return t.length===1?t[0]:Re.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:(function(i,s){let o=i;const c=s.getFlattenedFilters();for(const l of c)mw(o,l),o=pu(o,l)}(e._query,t),new Nt(e.firestore,e.converter,pu(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}class md extends da{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new md(e,t)}_apply(e){const t=function(i,s,o){if(i.startAt!==null)throw new B(P.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(i.endAt!==null)throw new B(P.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Fo(s,o)}(e._query,this._field,this._direction);return new Nt(e.firestore,e.converter,function(i,s){const o=i.explicitOrderBy.concat([s]);return new Fn(i.path,i.collectionGroup,o,i.filters.slice(),i.limit,i.limitType,i.startAt,i.endAt)}(e._query,t))}}function O0(r,e="asc"){const t=e,n=el("orderBy",r);return md._create(n,t)}class nl extends da{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new nl(e,t,n)}_apply(e){return new Nt(e.firestore,e.converter,hc(e._query,this._limit,this._limitType))}}function M0(r){return Wg("limit",r),nl._create("limit",r,"F")}function L0(r){return Wg("limitToLast",r),nl._create("limitToLast",r,"L")}class rl extends da{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new rl(e,t,n)}_apply(e){const t=pw(e,this.type,this._docOrFields,this._inclusive);return new Nt(e.firestore,e.converter,function(i,s){return new Fn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,s,i.endAt)}(e._query,t))}}function F0(...r){return rl._create("startAt",r,!0)}function U0(...r){return rl._create("startAfter",r,!1)}class il extends da{constructor(e,t,n){super(),this.type=e,this._docOrFields=t,this._inclusive=n}static _create(e,t,n){return new il(e,t,n)}_apply(e){const t=pw(e,this.type,this._docOrFields,this._inclusive);return new Nt(e.firestore,e.converter,function(i,s){return new Fn(i.path,i.collectionGroup,i.explicitOrderBy.slice(),i.filters.slice(),i.limit,i.limitType,i.startAt,s)}(e._query,t))}}function B0(...r){return il._create("endBefore",r,!1)}function q0(...r){return il._create("endAt",r,!0)}function pw(r,e,t,n){if(t[0]=le(t[0]),t[0]instanceof zo)return function(s,o,c,l,u){if(!l)throw new B(P.NOT_FOUND,`Can't use a DocumentSnapshot that doesn't exist for ${c}().`);const d=[];for(const p of Ki(s))if(p.field.isKeyField())d.push(ai(o,l.key));else{const m=l.data.field(p.field);if(Bc(m))throw new B(P.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+p.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(m===null){const v=p.field.canonicalString();throw new B(P.INVALID_ARGUMENT,`Invalid query. You are trying to start or end a query using a document for which the field '${v}' (used as the orderBy) does not exist.`)}d.push(m)}return new Ir(d,u)}(r._query,r.firestore._databaseId,e,t[0]._document,n);{const i=wi(r.firestore);return function(o,c,l,u,d,p){const m=o.explicitOrderBy;if(d.length>m.length)throw new B(P.INVALID_ARGUMENT,`Too many arguments provided to ${u}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);const v=[];for(let M=0;M<d.length;M++){const F=d[M];if(m[M].field.isKeyField()){if(typeof F!="string")throw new B(P.INVALID_ARGUMENT,`Invalid query. Expected a string for document ID in ${u}(), but got a ${typeof F}`);if(!Th(o)&&F.indexOf("/")!==-1)throw new B(P.INVALID_ARGUMENT,`Invalid query. When querying a collection and ordering by documentId(), the value passed to ${u}() must be a plain document ID, but '${F}' contains a slash.`);const U=o.path.child(Ie.fromString(F));if(!G.isDocumentKey(U))throw new B(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group and ordering by documentId(), the value passed to ${u}() must result in a valid document path, but '${U}' is not because it contains an odd number of segments.`);const X=new G(U);v.push(ai(c,X))}else{const U=lw(l,u,F);v.push(U)}}return new Ir(v,p)}(r._query,r.firestore._databaseId,i,e,t,n)}}function sm(r,e,t){if(typeof(t=le(t))=="string"){if(t==="")throw new B(P.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!Th(e)&&t.indexOf("/")!==-1)throw new B(P.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const n=e.path.child(Ie.fromString(t));if(!G.isDocumentKey(n))throw new B(P.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${n}' is not because it has an odd number of segments (${n.length}).`);return ai(r,new G(n))}if(t instanceof Ne)return ai(r,t._key);throw new B(P.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Oc(t)}.`)}function om(r,e){if(!Array.isArray(r)||r.length===0)throw new B(P.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function mw(r,e){const t=function(i,s){for(const o of i)for(const c of o.getFlattenedFilters())if(s.indexOf(c.op)>=0)return c.op;return null}(r.filters,function(i){switch(i){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(e.op));if(t!==null)throw t===e.op?new B(P.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new B(P.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class gd{convertValue(e,t="none"){switch(_r(e)){case 0:return null;case 1:return e.booleanValue;case 2:return Fe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(On(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw Y(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Pr(e,(i,s)=>{n[i]=this.convertValue(s,t)}),n}convertVectorValue(e){var n,i,s;const t=(s=(i=(n=e.fields)==null?void 0:n[ns].arrayValue)==null?void 0:i.values)==null?void 0:s.map(o=>Fe(o.doubleValue));return new En(t)}convertGeoPoint(e){return new tn(Fe(e.latitude),Fe(e.longitude))}convertArray(e,t){return(e.values||[]).map(n=>this.convertValue(n,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=qc(e);return n==null?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(Oo(e));default:return null}}convertTimestamp(e){const t=Vn(e);return new Se(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=Ie.fromString(e);Z(i_(n),9688,{name:e});const i=new yr(n.get(1),n.get(3)),s=new G(n.popFirst(5));return i.isEqual(t)||Ze(`Document ${s} contains a document reference within a different database (${i.projectId}/${i.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sl(r,e,t){let n;return n=r?t&&(t.merge||t.mergeFields)?r.toFirestore(e,t):r.toFirestore(e):e,n}class $0 extends gd{constructor(e){super(),this.firestore=e}convertBytes(e){return new bt(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Ne(this.firestore,null,t)}}class Xr{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}let Qt=class gw extends zo{constructor(e,t,n,i,s,o){super(e,t,n,i,o),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new Io(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(el("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new B(P.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=gw._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}};Qt._jsonSchemaVersion="firestore/documentSnapshot/1.0",Qt._jsonSchema={type:it("string",Qt._jsonSchemaVersion),bundleSource:it("string","DocumentSnapshot"),bundleName:it("string"),bundle:it("string")};let Io=class extends Qt{data(e={}){return super.data(e)}},nn=class yw{constructor(e,t,n,i){this._firestore=e,this._userDataWriter=t,this._snapshot=i,this.metadata=new Xr(i.hasPendingWrites,i.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new Io(this._firestore,this._userDataWriter,n.key,n,new Xr(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new B(P.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(i,s){if(i._snapshot.oldDocs.isEmpty()){let o=0;return i._snapshot.docChanges.map(c=>{const l=new Io(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Xr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);return c.doc,{type:"added",doc:l,oldIndex:-1,newIndex:o++}})}{let o=i._snapshot.oldDocs;return i._snapshot.docChanges.filter(c=>s||c.type!==3).map(c=>{const l=new Io(i._firestore,i._userDataWriter,c.doc.key,c.doc,new Xr(i._snapshot.mutatedKeys.has(c.doc.key),i._snapshot.fromCache),i.query.converter);let u=-1,d=-1;return c.type!==0&&(u=o.indexOf(c.doc.key),o=o.delete(c.doc.key)),c.type!==1&&(o=o.add(c.doc),d=o.indexOf(c.doc.key)),{type:z0(c.type),doc:l,oldIndex:u,newIndex:d}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new B(P.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=yw._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=dh.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],n=[],i=[];return this.docs.forEach(s=>{s._document!==null&&(t.push(s._document),n.push(this._userDataWriter.convertObjectMap(s._document.data.value.mapValue.fields,"previous")),i.push(s.ref.path))}),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}};function z0(r){switch(r){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return Y(61501,{type:r})}}function _w(r,e){return r instanceof Qt&&e instanceof Qt?r._firestore===e._firestore&&r._key.isEqual(e._key)&&(r._document===null?e._document===null:r._document.isEqual(e._document))&&r._converter===e._converter:r instanceof nn&&e instanceof nn&&r._firestore===e._firestore&&rw(r.query,e.query)&&r.metadata.isEqual(e.metadata)&&r._snapshot.isEqual(e._snapshot)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function K0(r){r=Ae(r,Ne);const e=Ae(r.firestore,tt);return Q_(St(e),r._key).then(t=>yd(e,r,t))}nn._jsonSchemaVersion="firestore/querySnapshot/1.0",nn._jsonSchema={type:it("string",nn._jsonSchemaVersion),bundleSource:it("string","QuerySnapshot"),bundleName:it("string"),bundle:it("string")};class Ei extends gd{constructor(e){super(),this.firestore=e}convertBytes(e){return new bt(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Ne(this.firestore,null,t)}}function j0(r){r=Ae(r,Ne);const e=Ae(r.firestore,tt),t=St(e),n=new Ei(e);return d0(t,r._key).then(i=>new Qt(e,n,r._key,i,new Xr(i!==null&&i.hasLocalMutations,!0),r.converter))}function G0(r){r=Ae(r,Ne);const e=Ae(r.firestore,tt);return Q_(St(e),r._key,{source:"server"}).then(t=>yd(e,r,t))}function W0(r){r=Ae(r,Nt);const e=Ae(r.firestore,tt),t=St(e),n=new Ei(e);return fw(r._query),Y_(t,r._query).then(i=>new nn(e,n,r,i))}function H0(r){r=Ae(r,Nt);const e=Ae(r.firestore,tt),t=St(e),n=new Ei(e);return f0(t,r._query).then(i=>new nn(e,n,r,i))}function Q0(r){r=Ae(r,Nt);const e=Ae(r.firestore,tt),t=St(e),n=new Ei(e);return Y_(t,r._query,{source:"server"}).then(i=>new nn(e,n,r,i))}function am(r,e,t){r=Ae(r,Ne);const n=Ae(r.firestore,tt),i=sl(r.converter,e,t);return fa(n,[Zc(wi(n),"setDoc",r._key,i,r.converter!==null,t).toMutation(r._key,qe.none())])}function cm(r,e,t,...n){r=Ae(r,Ne);const i=Ae(r.firestore,tt),s=wi(i);let o;return o=typeof(e=le(e))=="string"||e instanceof Tr?ud(s,"updateDoc",r._key,e,t,n):ld(s,"updateDoc",r._key,e),fa(i,[o.toMutation(r._key,qe.exists(!0))])}function Y0(r){return fa(Ae(r.firestore,tt),[new Ts(r._key,qe.none())])}function J0(r,e){const t=Ae(r.firestore,tt),n=Ic(r),i=sl(r.converter,e);return fa(t,[Zc(wi(r.firestore),"addDoc",n._key,i,r.converter!==null,{}).toMutation(n._key,qe.exists(!1))]).then(()=>n)}function ww(r,...e){var l,u,d;r=le(r);let t={includeMetadataChanges:!1,source:"default"},n=0;typeof e[n]!="object"||Ru(e[n])||(t=e[n++]);const i={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(Ru(e[n])){const p=e[n];e[n]=(l=p.next)==null?void 0:l.bind(p),e[n+1]=(u=p.error)==null?void 0:u.bind(p),e[n+2]=(d=p.complete)==null?void 0:d.bind(p)}let s,o,c;if(r instanceof Ne)o=Ae(r.firestore,tt),c=Es(r._key.path),s={next:p=>{e[n]&&e[n](yd(o,r,p))},error:e[n+1],complete:e[n+2]};else{const p=Ae(r,Nt);o=Ae(p.firestore,tt),c=p._query;const m=new Ei(o);s={next:v=>{e[n]&&e[n](new nn(o,m,p,v))},error:e[n+1],complete:e[n+2]},fw(r._query)}return function(m,v,M,F){const U=new Yc(F),X=new Yh(v,U,M);return m.asyncQueue.enqueueAndForget(async()=>Wh(await fs(m),X)),()=>{U.Nu(),m.asyncQueue.enqueueAndForget(async()=>Hh(await fs(m),X))}}(St(o),c,i,s)}function X0(r,e){return p0(St(r=Ae(r,tt)),Ru(e)?e:{next:e})}function fa(r,e){return function(n,i){const s=new yt;return n.asyncQueue.enqueueAndForget(async()=>qP(await id(n),i,s)),s.promise}(St(r),e)}function yd(r,e,t){const n=t.docs.get(e._key),i=new Ei(r);return new Qt(r,i,e._key,n,new Xr(t.hasPendingWrites,t.fromCache),e.converter)}/**
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
 */const Z0={maxAttempts:5};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let eC=class{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=wi(e)}set(e,t,n){this._verifyNotCommitted();const i=or(e,this._firestore),s=sl(i.converter,t,n),o=Zc(this._dataReader,"WriteBatch.set",i._key,s,i.converter!==null,n);return this._mutations.push(o.toMutation(i._key,qe.none())),this}update(e,t,n,...i){this._verifyNotCommitted();const s=or(e,this._firestore);let o;return o=typeof(t=le(t))=="string"||t instanceof Tr?ud(this._dataReader,"WriteBatch.update",s._key,t,n,i):ld(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(o.toMutation(s._key,qe.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=or(e,this._firestore);return this._mutations=this._mutations.concat(new Ts(t._key,qe.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new B(P.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}};function or(r,e){if((r=le(r)).firestore!==e)throw new B(P.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tC{constructor(e,t){this._firestore=e,this._transaction=t,this._dataReader=wi(e)}get(e){const t=or(e,this._firestore),n=new $0(this._firestore);return this._transaction.lookup([t._key]).then(i=>{if(!i||i.length!==1)return Y(24041);const s=i[0];if(s.isFoundDocument())return new zo(this._firestore,n,s.key,s,t.converter);if(s.isNoDocument())return new zo(this._firestore,n,t._key,null,t.converter);throw Y(18433,{doc:s})})}set(e,t,n){const i=or(e,this._firestore),s=sl(i.converter,t,n),o=Zc(this._dataReader,"Transaction.set",i._key,s,i.converter!==null,n);return this._transaction.set(i._key,o),this}update(e,t,n,...i){const s=or(e,this._firestore);let o;return o=typeof(t=le(t))=="string"||t instanceof Tr?ud(this._dataReader,"Transaction.update",s._key,t,n,i):ld(this._dataReader,"Transaction.update",s._key,t),this._transaction.update(s._key,o),this}delete(e){const t=or(e,this._firestore);return this._transaction.delete(t._key),this}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let nC=class extends tC{constructor(e,t){super(e,t),this._firestore=e}get(e){const t=or(e,this._firestore),n=new Ei(this._firestore);return super.get(e).then(i=>new Qt(this._firestore,n,t._key,i._document,new Xr(!1,!1),t.converter))}};function rC(r,e,t){r=Ae(r,tt);const n={...Z0,...t};return function(s){if(s.maxAttempts<1)throw new B(P.INVALID_ARGUMENT,"Max attempts must be at least 1")}(n),function(s,o,c){const l=new yt;return s.asyncQueue.enqueueAndForget(async()=>{const u=await l0(s);new a0(s.asyncQueue,u,c,o,l).ju()}),l.promise}(St(r),i=>e(new nC(r,i)),n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iC(){return new ha("deleteField")}function sC(){return new sd("serverTimestamp")}function oC(...r){return new od("arrayUnion",r)}function aC(...r){return new ad("arrayRemove",r)}function cC(r){return new cd("increment",r)}(function(e,t=!0){(function(i){Is=i})(br),mr(new vn("firestore",(n,{instanceIdentifier:i,options:s})=>{const o=n.getProvider("app").getImmediate(),c=new tt(new tS(n.getProvider("auth-internal")),new iS(o,n.getProvider("app-check-internal")),function(u,d){if(!Object.prototype.hasOwnProperty.apply(u.options,["projectId"]))throw new B(P.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new yr(u.options.projectId,d)}(o,i),o);return s={useFetchStreams:t,...s},c._setSettings(s),c},"PUBLIC").setMultipleInstances(!0)),en(Ff,Uf,e),en(Ff,Uf,"esm2020")})();const lC="@firebase/firestore-compat",uC="0.4.3";/**
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
 */function _d(r,e){if(e===void 0)return{merge:!1};if(e.mergeFields!==void 0&&e.merge!==void 0)throw new B("invalid-argument",`Invalid options passed to function ${r}(): You cannot specify both "merge" and "mergeFields".`);return e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lm(){if(typeof Uint8Array>"u")throw new B("unimplemented","Uint8Arrays are not available in this environment.")}function um(){if(!US())throw new B("unimplemented","Blobs are unavailable in Firestore in this environment.")}let Iw=class Cu{constructor(e){this._delegate=e}static fromBase64String(e){return um(),new Cu(bt.fromBase64String(e))}static fromUint8Array(e){return lm(),new Cu(bt.fromUint8Array(e))}toBase64(){return um(),this._delegate.toBase64()}toUint8Array(){return lm(),this._delegate.toUint8Array()}isEqual(e){return this._delegate.isEqual(e._delegate)}toString(){return"Blob(base64: "+this.toBase64()+")"}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ku(r){return hC(r,["next","error","complete"])}function hC(r,e){if(typeof r!="object"||r===null)return!1;const t=r;for(const n of e)if(n in t&&typeof t[n]=="function")return!0;return!1}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dC{enableIndexedDbPersistence(e,t){return E0(e._delegate,{forceOwnership:t})}enableMultiTabIndexedDbPersistence(e){return v0(e._delegate)}clearIndexedDbPersistence(e){return T0(e._delegate)}}class Ew{constructor(e,t,n){this._delegate=t,this._persistenceProvider=n,this.INTERNAL={delete:()=>this.terminate()},e instanceof yr||(this._appCompat=e)}get _databaseId(){return this._delegate._databaseId}settings(e){const t=this._delegate._getSettings();!e.merge&&t.host!==e.host&&bn("You are overriding the original host. If you did not intend to override your settings, use {merge: true}."),e.merge&&(e={...t,...e},delete e.merge),this._delegate._setSettings(e)}useEmulator(e,t,n={}){y0(this._delegate,e,t,n)}enableNetwork(){return A0(this._delegate)}disableNetwork(){return S0(this._delegate)}enablePersistence(e){let t=!1,n=!1;return e&&(t=!!e.synchronizeTabs,n=!!e.experimentalForceOwningTab,jg("synchronizeTabs",t,"experimentalForceOwningTab",n)),t?this._persistenceProvider.enableMultiTabIndexedDbPersistence(this):this._persistenceProvider.enableIndexedDbPersistence(this,n)}clearPersistence(){return this._persistenceProvider.clearIndexedDbPersistence(this)}terminate(){return this._appCompat&&(this._appCompat._removeServiceInstance("firestore-compat"),this._appCompat._removeServiceInstance("firestore")),this._delegate._delete()}waitForPendingWrites(){return b0(this._delegate)}onSnapshotsInSync(e){return X0(this._delegate,e)}get app(){if(!this._appCompat)throw new B("failed-precondition","Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._appCompat}collection(e){try{return new ps(this,tw(this._delegate,e))}catch(t){throw Ct(t,"collection()","Firestore.collection()")}}doc(e){try{return new Ht(this,Ic(this._delegate,e))}catch(t){throw Ct(t,"doc()","Firestore.doc()")}}collectionGroup(e){try{return new Pt(this,_0(this._delegate,e))}catch(t){throw Ct(t,"collectionGroup()","Firestore.collectionGroup()")}}runTransaction(e){return rC(this._delegate,t=>e(new vw(this,t)))}batch(){return St(this._delegate),new Tw(new eC(this._delegate,e=>fa(this._delegate,e)))}loadBundle(e){return R0(this._delegate,e)}namedQuery(e){return P0(this._delegate,e).then(t=>t?new Pt(this,t):null)}}class ol extends gd{constructor(e){super(),this.firestore=e}convertBytes(e){return new Iw(new bt(e))}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return Ht.forKey(t,this.firestore,null)}}function fC(r){JA(r)}class vw{constructor(e,t){this._firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}get(e){const t=Zr(e);return this._delegate.get(t).then(n=>new Ko(this._firestore,new Qt(this._firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,t.converter)))}set(e,t,n){const i=Zr(e);return n?(_d("Transaction.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=Zr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=Zr(e);return this._delegate.delete(t),this}}class Tw{constructor(e){this._delegate=e}set(e,t,n){const i=Zr(e);return n?(_d("WriteBatch.set",n),this._delegate.set(i,t,n)):this._delegate.set(i,t),this}update(e,t,n,...i){const s=Zr(e);return arguments.length===2?this._delegate.update(s,t):this._delegate.update(s,t,n,...i),this}delete(e){const t=Zr(e);return this._delegate.delete(t),this}commit(){return this._delegate.commit()}}class mi{constructor(e,t,n){this._firestore=e,this._userDataWriter=t,this._delegate=n}fromFirestore(e,t){const n=new Io(this._firestore._delegate,this._userDataWriter,e._key,e._document,e.metadata,null);return this._delegate.fromFirestore(new jo(this._firestore,n),t??{})}toFirestore(e,t){return t?this._delegate.toFirestore(e,t):this._delegate.toFirestore(e)}static getInstance(e,t){const n=mi.INSTANCES;let i=n.get(e);i||(i=new WeakMap,n.set(e,i));let s=i.get(t);return s||(s=new mi(e,new ol(e),t),i.set(t,s)),s}}mi.INSTANCES=new WeakMap;class Ht{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}static forPath(e,t,n){if(e.length%2!==0)throw new B("invalid-argument",`Invalid document reference. Document references must have an even number of segments, but ${e.canonicalString()} has ${e.length}`);return new Ht(t,new Ne(t._delegate,n,new G(e)))}static forKey(e,t,n){return new Ht(t,new Ne(t._delegate,n,e))}get id(){return this._delegate.id}get parent(){return new ps(this.firestore,this._delegate.parent)}get path(){return this._delegate.path}collection(e){try{return new ps(this.firestore,tw(this._delegate,e))}catch(t){throw Ct(t,"collection()","DocumentReference.collection()")}}isEqual(e){return e=le(e),e instanceof Ne?nw(this._delegate,e):!1}set(e,t){t=_d("DocumentReference.set",t);try{return t?am(this._delegate,e,t):am(this._delegate,e)}catch(n){throw Ct(n,"setDoc()","DocumentReference.set()")}}update(e,t,...n){try{return arguments.length===1?cm(this._delegate,e):cm(this._delegate,e,t,...n)}catch(i){throw Ct(i,"updateDoc()","DocumentReference.update()")}}delete(){return Y0(this._delegate)}onSnapshot(...e){const t=bw(e),n=Aw(e,i=>new Ko(this.firestore,new Qt(this.firestore._delegate,this._userDataWriter,i._key,i._document,i.metadata,this._delegate.converter)));return ww(this._delegate,t,n)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=j0(this._delegate):(e==null?void 0:e.source)==="server"?t=G0(this._delegate):t=K0(this._delegate),t.then(n=>new Ko(this.firestore,new Qt(this.firestore._delegate,this._userDataWriter,n._key,n._document,n.metadata,this._delegate.converter)))}withConverter(e){return new Ht(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function Ct(r,e,t){return r.message=r.message.replace(e,t),r}function bw(r){for(const e of r)if(typeof e=="object"&&!ku(e))return e;return{}}function Aw(r,e){var n,i;let t;return ku(r[0])?t=r[0]:ku(r[1])?t=r[1]:typeof r[0]=="function"?t={next:r[0],error:r[1],complete:r[2]}:t={next:r[1],error:r[2],complete:r[3]},{next:s=>{t.next&&t.next(e(s))},error:(n=t.error)==null?void 0:n.bind(t),complete:(i=t.complete)==null?void 0:i.bind(t)}}class Ko{constructor(e,t){this._firestore=e,this._delegate=t}get ref(){return new Ht(this._firestore,this._delegate.ref)}get id(){return this._delegate.id}get metadata(){return this._delegate.metadata}get exists(){return this._delegate.exists()}data(e){return this._delegate.data(e)}get(e,t){return this._delegate.get(e,t)}isEqual(e){return _w(this._delegate,e._delegate)}}class jo extends Ko{data(e){const t=this._delegate.data(e);return this._delegate._converter||XA(t!==void 0,"Document in a QueryDocumentSnapshot should exist"),t}}class Pt{constructor(e,t){this.firestore=e,this._delegate=t,this._userDataWriter=new ol(e)}where(e,t,n){try{return new Pt(this.firestore,nr(this._delegate,V0(e,t,n)))}catch(i){throw Ct(i,/(orderBy|where)\(\)/,"Query.$1()")}}orderBy(e,t){try{return new Pt(this.firestore,nr(this._delegate,O0(e,t)))}catch(n){throw Ct(n,/(orderBy|where)\(\)/,"Query.$1()")}}limit(e){try{return new Pt(this.firestore,nr(this._delegate,M0(e)))}catch(t){throw Ct(t,"limit()","Query.limit()")}}limitToLast(e){try{return new Pt(this.firestore,nr(this._delegate,L0(e)))}catch(t){throw Ct(t,"limitToLast()","Query.limitToLast()")}}startAt(...e){try{return new Pt(this.firestore,nr(this._delegate,F0(...e)))}catch(t){throw Ct(t,"startAt()","Query.startAt()")}}startAfter(...e){try{return new Pt(this.firestore,nr(this._delegate,U0(...e)))}catch(t){throw Ct(t,"startAfter()","Query.startAfter()")}}endBefore(...e){try{return new Pt(this.firestore,nr(this._delegate,B0(...e)))}catch(t){throw Ct(t,"endBefore()","Query.endBefore()")}}endAt(...e){try{return new Pt(this.firestore,nr(this._delegate,q0(...e)))}catch(t){throw Ct(t,"endAt()","Query.endAt()")}}isEqual(e){return rw(this._delegate,e._delegate)}get(e){let t;return(e==null?void 0:e.source)==="cache"?t=H0(this._delegate):(e==null?void 0:e.source)==="server"?t=Q0(this._delegate):t=W0(this._delegate),t.then(n=>new xu(this.firestore,new nn(this.firestore._delegate,this._userDataWriter,this._delegate,n._snapshot)))}onSnapshot(...e){const t=bw(e),n=Aw(e,i=>new xu(this.firestore,new nn(this.firestore._delegate,this._userDataWriter,this._delegate,i._snapshot)));return ww(this._delegate,t,n)}withConverter(e){return new Pt(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}class pC{constructor(e,t){this._firestore=e,this._delegate=t}get type(){return this._delegate.type}get doc(){return new jo(this._firestore,this._delegate.doc)}get oldIndex(){return this._delegate.oldIndex}get newIndex(){return this._delegate.newIndex}}class xu{constructor(e,t){this._firestore=e,this._delegate=t}get query(){return new Pt(this._firestore,this._delegate.query)}get metadata(){return this._delegate.metadata}get size(){return this._delegate.size}get empty(){return this._delegate.empty}get docs(){return this._delegate.docs.map(e=>new jo(this._firestore,e))}docChanges(e){return this._delegate.docChanges(e).map(t=>new pC(this._firestore,t))}forEach(e,t){this._delegate.forEach(n=>{e.call(t,new jo(this._firestore,n))})}isEqual(e){return _w(this._delegate,e._delegate)}}class ps extends Pt{constructor(e,t){super(e,t),this.firestore=e,this._delegate=t}get id(){return this._delegate.id}get path(){return this._delegate.path}get parent(){const e=this._delegate.parent;return e?new Ht(this.firestore,e):null}doc(e){try{return e===void 0?new Ht(this.firestore,Ic(this._delegate)):new Ht(this.firestore,Ic(this._delegate,e))}catch(t){throw Ct(t,"doc()","CollectionReference.doc()")}}add(e){return J0(this._delegate,e).then(t=>new Ht(this.firestore,t))}isEqual(e){return nw(this._delegate,e._delegate)}withConverter(e){return new ps(this.firestore,e?this._delegate.withConverter(mi.getInstance(this.firestore,e)):this._delegate.withConverter(null))}}function Zr(r){return Ae(r,Ne)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wd{constructor(...e){this._delegate=new Tr(...e)}static documentId(){return new wd(Be.keyField().canonicalString())}isEqual(e){return e=le(e),e instanceof Tr?this._delegate._internalPath.isEqual(e._internalPath):!1}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qr{static serverTimestamp(){const e=sC();return e._methodName="FieldValue.serverTimestamp",new Qr(e)}static delete(){const e=iC();return e._methodName="FieldValue.delete",new Qr(e)}static arrayUnion(...e){const t=oC(...e);return t._methodName="FieldValue.arrayUnion",new Qr(t)}static arrayRemove(...e){const t=aC(...e);return t._methodName="FieldValue.arrayRemove",new Qr(t)}static increment(e){const t=cC(e);return t._methodName="FieldValue.increment",new Qr(t)}constructor(e){this._delegate=e}isEqual(e){return this._delegate.isEqual(e._delegate)}}/**
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
 */const mC={Firestore:Ew,GeoPoint:tn,Timestamp:Se,Blob:Iw,Transaction:vw,WriteBatch:Tw,DocumentReference:Ht,DocumentSnapshot:Ko,Query:Pt,QueryDocumentSnapshot:jo,QuerySnapshot:xu,CollectionReference:ps,FieldPath:wd,FieldValue:Qr,setLogLevel:fC,CACHE_SIZE_UNLIMITED:I0};function gC(r,e){r.INTERNAL.registerComponent(new vn("firestore-compat",t=>{const n=t.getProvider("app-compat").getImmediate(),i=t.getProvider("firestore").getImmediate();return e(n,i)},"PUBLIC").setServiceProps({...mC}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yC(r){gC(r,(e,t)=>new Ew(e,t,new dC)),r.registerVersion(lC,uC)}yC(dt);var _C={};const wC=(()=>{var r;if(typeof process<"u"&&_C)return(r=process.argv)==null?void 0:r.includes("--dev");try{return localStorage.getItem("DEBUG_MODE")==="true"}catch{return!1}})(),Yt=(...r)=>wC&&console.log("[Firestore]",...r),IC="test_",EC={soil:"soilSamples",water:"waterSamples",compost:"compostSamples",heavyMetal:"heavyMetalSamples","heavy-metal":"heavyMetalSamples",pesticide:"pesticideSamples"};function vi(r,e){const t=EC[r]||r;return`${IC}${t}_${e}`}function Sw(r){return r==null?"":String(r)}function vC(r){return Array.isArray(r)?r.map(e=>({...e,id:Sw(e.id)})):r}async function TC(r,e,t,n){var i,s;if(!((i=window.firebaseConfig)!=null&&i.isEnabled()))return!1;try{const o=window.firebaseConfig.getDb();if(!o)return!1;const c=vi(r,e);return await o.collection(c).doc(t).set({...n,updatedAt:dt.firestore.FieldValue.serverTimestamp(),syncedAt:dt.firestore.FieldValue.serverTimestamp()},{merge:!0}),Yt(`저장 완료: ${c}/${t}`),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("Firestore 저장 실패:",o),!1}}async function bC(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=vi(r,e),c=await s.collection(o).doc(t).get();return c.exists?{id:c.id,...c.data()}:null}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("Firestore 조회 실패:",s),null}}async function AC(r,e,t={}){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return[];try{const s=window.firebaseConfig.getDb();if(!s)return[];const o=vi(r,e),l=await s.collection(o).get(),u=[];return l.forEach(d=>{u.push({id:d.id,...d.data()})}),u.length>0&&u.sort((d,p)=>{var M,F,U,X;const m=((M=d.createdAt)==null?void 0:M.seconds)||((F=d.updatedAt)==null?void 0:F.seconds)||0,v=((U=p.createdAt)==null?void 0:U.seconds)||((X=p.updatedAt)==null?void 0:X.seconds)||0;return m-v}),Yt(`조회 완료: ${o} (${u.length}건)`),vC(u)}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("Firestore 전체 조회 실패:",s),[]}}async function SC(r,e,t){var n;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return!1;try{const i=window.firebaseConfig.getDb();if(!i)return!1;const s=vi(r,e),o=String(typeof t=="number"?t:t||""),c=parseInt(o,10);if(!o)return!1;const l=i.collection(s).doc(o);if((await l.get()).exists)return await l.delete(),Yt(`삭제 완료: ${s}/${o}`),!0;let d=await i.collection(s).where("id","==",o).get();if(d.empty&&!isNaN(c)&&(d=await i.collection(s).where("id","==",c).get()),d.empty)return Yt(`삭제 대상 없음: ${s}/${o}`),!1;const p=[];return d.forEach(m=>{p.push(m.ref.delete())}),await Promise.all(p),Yt(`삭제 완료 (쿼리): ${s}/${o} (${d.size}건)`),!0}catch(i){return console.error("Firestore 삭제 실패:",i),!1}}async function Rw(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled())||!t.length)return!1;try{const s=window.firebaseConfig.getDb();if(!s)return!1;const o=vi(r,e),c=450,l=[];for(let u=0;u<t.length;u+=c)l.push(t.slice(u,u+c));Yt(`배치 저장 시작: ${o} (${t.length}건, ${l.length}개 청크)`);for(let u=0;u<l.length;u++){const d=l[u],p=s.batch();d.forEach(m=>{let v=Sw(m.id).trim();v||(v=Pw());const M=s.collection(o).doc(v),F={...m,id:v,updatedAt:dt.firestore.FieldValue.serverTimestamp(),syncedAt:dt.firestore.FieldValue.serverTimestamp()};m.createdAt||(F.createdAt=dt.firestore.FieldValue.serverTimestamp()),p.set(M,F,{merge:!0})}),await p.commit(),Yt(`청크 ${u+1}/${l.length} 완료 (${d.length}건)`)}return Yt(`배치 저장 완료: ${o} (${t.length}건)`),!0}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("Firestore 배치 저장 실패:",s),!1}}async function RC(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return{success:!1,count:0};try{const s=localStorage.getItem(t);if(!s)return Yt("마이그레이션할 데이터가 없습니다."),{success:!0,count:0};const o=JSON.parse(s);if(!Array.isArray(o)||o.length===0)return{success:!0,count:0};const c=o.map(l=>({...l,id:l.id||PC()}));return await Rw(r,e,c),Yt(`마이그레이션 완료: ${t} → Firestore (${c.length}건)`),{success:!0,count:c.length}}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("마이그레이션 실패:",s),{success:!1,count:0}}}function Pw(){return typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),r=>r.toString(36)).join("").substring(0,9)}function PC(){return Pw()}function CC(r,e,t){var n,i;if(!((n=window.firebaseConfig)!=null&&n.isEnabled()))return null;try{const s=window.firebaseConfig.getDb();if(!s)return null;const o=vi(r,e),c=s.collection(o).onSnapshot(l=>{const u=[];l.forEach(d=>{u.push({id:d.id,...d.data()})}),t(u,l.metadata.fromCache)},l=>{var u;(((u=window.logger)==null?void 0:u.error)||console.error)("실시간 동기화 에러:",l)});return Yt(`실시간 동기화 시작: ${o}`),c}catch(s){return(((i=window.logger)==null?void 0:i.error)||console.error)("실시간 동기화 설정 실패:",s),null}}function kC(){var r;return((r=window.firebaseConfig)==null?void 0:r.isEnabled())===!0}function xC(){var r;return((r=window.firebaseConfig)==null?void 0:r.isOfflineSupported())===!0}window.firestoreDb={init:async function(){return Yt("firestoreDb.init() 호출됨 (no-op)"),!0},save:TC,get:bC,getAll:AC,delete:SC,batchSave:Rw,migrate:RC,subscribe:CC,isEnabled:kC,isOfflineEnabled:xC,getCollectionName:vi};const We={LOCAL_ONLY:"local",CLOUD_SYNC:"cloud",CLOUD_ONLY:"cloudOnly"};let kt=We.LOCAL_ONLY;const DC=!1,NC=(...r)=>DC;let $n={lastSyncTime:null,pendingChanges:0,isOnline:navigator.onLine};window.addEventListener("online",()=>{$n.isOnline=!0,Cw()});window.addEventListener("offline",()=>{$n.isOnline=!1});async function VC(){var n,i,s;const r=localStorage.getItem("storageMode"),e=Object.values(We);let t=!1;if((n=window.firebaseConfig)!=null&&n.initialize)try{await window.firebaseConfig.initialize()&&(await((i=window.firestoreDb)==null?void 0:i.init()),t=!0)}catch(o){(((s=window.logger)==null?void 0:s.warn)||console.warn)("[Storage] Firebase 초기화 실패:",o)}return r&&e.includes(r)?(r===We.CLOUD_SYNC||r===We.CLOUD_ONLY)&&!t?kt=We.LOCAL_ONLY:kt=r:kt=t?We.CLOUD_SYNC:We.LOCAL_ONLY,kt}function OC(r){var t;return Object.values(We).includes(r)?(r===We.CLOUD_SYNC||r===We.CLOUD_ONLY)&&!((t=window.firestoreDb)!=null&&t.isEnabled())?{success:!1,message:"Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다."}:(kt=r,localStorage.setItem("storageMode",r),window.dispatchEvent(new CustomEvent("storage-mode-changed",{detail:{mode:r}})),{success:!0,message:`저장 모드가 변경되었습니다: ${r}`}):{success:!1,message:`유효하지 않은 모드: ${r}`}}function MC(){var e;const r=((e=window.firestoreDb)==null?void 0:e.isEnabled())||!1;return[{value:We.LOCAL_ONLY,label:"로컬 저장소만",description:"이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.",available:!0},{value:We.CLOUD_SYNC,label:"클라우드 동기화",description:"로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.",available:r},{value:We.CLOUD_ONLY,label:"클라우드 전용",description:"Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.",available:r}]}async function LC(r,e,t,n){var i,s;try{if(localStorage.setItem(t,JSON.stringify(n)),NC(`localStorage 저장: ${t}`),kt===We.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())){const o=n.map(c=>({...c,id:c.id||Id()}));await window.firestoreDb.batchSave(r,e,o),$n.lastSyncTime=new Date}return!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("데이터 저장 실패:",o),!1}}async function FC(r,e,t,n){var i,s;try{const o=JSON.parse(localStorage.getItem(t)||"[]"),c={...n,id:n.id||Id()},l=o.findIndex(u=>u.id===c.id);return l>=0?o[l]=c:o.push(c),localStorage.setItem(t,JSON.stringify(o)),kt===We.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.save(r,e,c.id,c),$n.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 저장 실패:",o),!1}}async function UC(r,e,t){var n,i;try{if(kt===We.CLOUD_SYNC&&((n=window.firestoreDb)!=null&&n.isEnabled())){const o=await window.firestoreDb.getAll(r,e);if(o.length>0)return localStorage.setItem(t,JSON.stringify(o)),$n.lastSyncTime=new Date,o}const s=localStorage.getItem(t);return s?JSON.parse(s):[]}catch(s){(((i=window.logger)==null?void 0:i.error)||console.error)("데이터 로드 실패:",s);const o=localStorage.getItem(t);return o?JSON.parse(o):[]}}async function BC(r,e,t,n){var i,s;try{const c=JSON.parse(localStorage.getItem(t)||"[]").filter(l=>l.id!==n);return localStorage.setItem(t,JSON.stringify(c)),kt===We.CLOUD_SYNC&&((i=window.firestoreDb)!=null&&i.isEnabled())&&(await window.firestoreDb.delete(r,e,n),$n.lastSyncTime=new Date),!0}catch(o){return(((s=window.logger)==null?void 0:s.error)||console.error)("항목 삭제 실패:",o),!1}}function qC(r,e,t,n){var i;return kt!==We.CLOUD_SYNC||!((i=window.firestoreDb)!=null&&i.isEnabled())?null:window.firestoreDb.subscribe(r,e,(s,o)=>{localStorage.setItem(t,JSON.stringify(s)),n(s,o),o||($n.lastSyncTime=new Date)})}async function $C(r,e,t){return kt!==We.CLOUD_SYNC?{success:!1,count:0,message:"클라우드 동기화 모드가 아닙니다."}:await window.firestoreDb.migrate(r,e,t)}async function Cw(){kt!==We.CLOUD_SYNC||!$n.isOnline||window.dispatchEvent(new CustomEvent("storage-sync-requested"))}function Id(){var r;return typeof window<"u"&&((r=window.SampleUtils)!=null&&r.generateUUID)?window.SampleUtils.generateUUID():typeof crypto<"u"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(6)),e=>e.toString(36)).join("").substring(0,9)}function zC(){return kt}function KC(){var r,e;return{...$n,mode:kt,isCloudEnabled:((r=window.firestoreDb)==null?void 0:r.isEnabled())||!1,isOfflineSupported:((e=window.firestoreDb)==null?void 0:e.isOfflineEnabled())||!1}}function jC(){return kt===We.CLOUD_SYNC}window.storageManager={init:VC,save:LC,saveItem:FC,load:UC,delete:BC,subscribe:qC,migrate:$C,sync:Cw,getMode:zC,setMode:OC,getAvailableModes:MC,getStatus:KC,isCloudEnabled:jC,generateId:Id,MODES:We};
