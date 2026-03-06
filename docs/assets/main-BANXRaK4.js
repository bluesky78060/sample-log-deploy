import"./theme-M_jpg7T1.js";import"./storage-manager-CFddbxoU.js";import"./cache-manager-3wYBxwGe.js";window.CacheManager&&window.CacheManager.checkAndAutoClean();(function(){const t=localStorage.getItem("app_org_name");if(t){const n=document.getElementById("orgNameDisplay");n&&(n.textContent=t)}})();(async function(){var n,s;const t=document.getElementById("appVersion");if((n=window.electronAPI)!=null&&n.getVersion)try{const e=await window.electronAPI.getVersion();e&&t&&(t.textContent="v"+e)}catch(e){(((s=window.logger)==null?void 0:s.info)||console.info)("버전 정보 가져오기 실패:",e)}})();(async function(){var t,n,s,e;try{(t=window.firebaseConfig)!=null&&t.initialize&&await window.firebaseConfig.initialize()&&(n=window.firestoreDb)!=null&&n.init&&await window.firestoreDb.init(),(s=window.encryptionManager)!=null&&s.init&&await window.encryptionManager.init(),window.firebaseDiagnostics&&setTimeout(async()=>{(await window.firebaseDiagnostics.diagnose()).overallStatus!=="healthy"&&(console.warn("[App] Firebase 연결 문제 감지, 자동 복구 시도..."),await window.firebaseDiagnostics.attemptAutoRecovery()),window.firebaseDiagnostics.startHealthCheck(6e4)},3e3)}catch(i){(((e=window.logger)==null?void 0:e.warn)||console.warn)("Firebase/암호화 초기화:",i)}})();(async function(){const t=document.getElementById("syncStatus");window.storageManager&&t&&await window.storageManager.init()==="cloud"&&(t.style.display="block",v())})();function v(){const t=document.getElementById("syncStatus");if(!t||!window.storageManager)return;const n=window.storageManager.getStatus(),s=t.querySelector(".sync-icon"),e=t.querySelector(".sync-text");n.isOnline?(s&&(s.textContent="☁️"),e&&(e.textContent="클라우드 동기화"),t.style.color="#22c55e"):(s&&(s.textContent="📴"),e&&(e.textContent="오프라인 모드"),t.style.color="#f59e0b")}window.addEventListener("online",v);window.addEventListener("offline",v);const f=[{type:"soil",name:"토양",icon:"🌱",storagePrefix:"soilSampleLogs"},{type:"water",name:"수질분석",icon:"💧",storagePrefix:"waterSampleLogs"},{type:"compost",name:"퇴·액비",icon:"🐄",storagePrefix:"compostSampleLogs"},{type:"heavyMetal",name:"토양 중금속",icon:"⚗️",storagePrefix:"heavyMetalSampleLogs"},{type:"pesticide",name:"잔류농약",icon:"🧪",storagePrefix:"pesticideSampleLogs"}],I=2020,c=document.getElementById("syncBtn"),o=document.getElementById("syncModal"),m=document.getElementById("syncModalBody"),u=document.getElementById("syncModalClose"),p=document.getElementById("syncModalOk");function h(){o==null||o.classList.remove("show")}u==null||u.addEventListener("click",h);p==null||p.addEventListener("click",h);o==null||o.addEventListener("click",t=>{t.target===o&&h()});async function D(){var i,r,w,E,S,b,L;if(!((i=window.firestoreDb)!=null&&i.isEnabled())&&(r=window.firebaseConfig)!=null&&r.initialize)try{await window.firebaseConfig.initialize()&&await((w=window.firestoreDb)==null?void 0:w.init())}catch(a){(((E=window.logger)==null?void 0:E.warn)||console.warn)("Firebase 초기화 실패:",a)}if(!((S=window.firestoreDb)!=null&&S.isEnabled())){alert(`Firebase가 설정되지 않았습니다.
설정 페이지에서 인증 파일을 등록해주세요.`);return}c==null||c.classList.add("syncing");const t=new Date().getFullYear(),n=[],s=f.length*(t-I+1);let e=0;M(f);try{for(let a=0;a<f.length;a++){const l=f[a];let y=0;const $=[];C(a,"syncing","동기화 중...");for(let d=I;d<=t;d++){try{const g=await window.firestoreDb.getAll(l.type,d),x=`${l.storagePrefix}_${d}`;g&&g.length>0&&(localStorage.setItem(x,JSON.stringify(g)),y+=g.length,$.push({year:d,count:g.length}))}catch(g){(((b=window.logger)==null?void 0:b.error)||console.error)(`${l.name} ${d}년 동기화 오류:`,g)}e++,B(e,s,`${l.name} ${d}년...`)}const P=y>0?`${y}건 완료`:"데이터 없음";C(a,y>0?"success":"",P),n.push({type:l.type,name:l.name,icon:l.icon,totalCount:y,yearsWithData:$})}A(n)}catch(a){(((L=window.logger)==null?void 0:L.error)||console.error)("동기화 오류:",a),alert("동기화 중 오류가 발생했습니다: "+a.message)}finally{c==null||c.classList.remove("syncing")}}function M(t){if(!m)return;let n=`
        <div class="sync-progress">
            <div class="sync-progress-text">
                <span id="syncProgressLabel">준비 중...</span>
                <span id="syncProgressPercent">0%</span>
            </div>
            <div class="sync-progress-bar">
                <div class="sync-progress-fill" id="syncProgressFill"></div>
            </div>
        </div>
    `;t.forEach((s,e)=>{n+=`
            <div class="sync-result-item" id="syncItem${e}">
                <div class="sync-result-type">
                    <span>${window.escapeHTML(s.icon)}</span>
                    <span>${window.escapeHTML(s.name)}</span>
                </div>
                <div class="sync-result-count" id="syncStatus${e}">대기 중</div>
            </div>
        `}),m.innerHTML=n,o==null||o.classList.add("show")}function B(t,n,s){const e=Math.round(t/n*100),i=document.getElementById("syncProgressFill"),r=document.getElementById("syncProgressLabel"),w=document.getElementById("syncProgressPercent");i&&(i.style.width=`${e}%`),r&&(r.textContent=s),w&&(w.textContent=`${e}%`)}function C(t,n,s){const e=document.getElementById(`syncItem${t}`),i=document.getElementById(`syncStatus${t}`);e&&(e.className=`sync-result-item ${n}`),i&&(i.className=`sync-result-count ${n}`,i.textContent=s)}function A(t){if(!m)return;let n=0,s="";t.forEach(e=>{n+=e.totalCount;const i=e.totalCount>0?"success":"";e.yearsWithData.length>0&&e.yearsWithData.map(r=>`${r.year}년: ${r.count}건`).join(", "),s+=`
            <div class="sync-result-item">
                <div class="sync-result-type">
                    <span>${window.escapeHTML(e.icon)}</span>
                    <span>${window.escapeHTML(e.name)}</span>
                </div>
                <div class="sync-result-count ${i}">
                    ${e.totalCount>0?`${e.totalCount}건 동기화`:"데이터 없음"}
                </div>
            </div>
        `}),s+=`
        <div class="sync-result-item" style="margin-top: 1rem; background: linear-gradient(135deg, #22c55e20, #3b82f620);">
            <div class="sync-result-type">
                <span>📊</span>
                <span><strong>총 동기화</strong></span>
            </div>
            <div class="sync-result-count success">
                <strong>${n}건</strong>
            </div>
        </div>
    `,m.innerHTML=s,o==null||o.classList.add("show")}c==null||c.addEventListener("click",D);
