/**
 * @fileoverview 라벨 인쇄 모듈
 * @description 시료 라벨 출력 및 엑셀 변환 기능
 */

(() => {
  // ========================================
  // 상태 변수
  // ========================================

  /** @type {boolean} 디버그 모드 (프로덕션에서는 false) */
  const DEBUG_LABEL = false;

  /** 조건부 로깅 */
  const log = (...args) => DEBUG_LABEL && console.log('[Label]', ...args);

  /** @type {Object[]|null} */
  let labelData = null;

  /** @type {Object.<string, string>} */
  let fieldMappings = {};

  /** @type {string|null} */
  let currentLabelJobId = null;

  /** @type {Object|null} */
  let lastLabelStatus = null;

  // 모달 포커스 관리
  /** @type {HTMLElement|null} */
  let lastFocusedElement = null;

  /** @type {Function|null} */
  let modalKeydownHandler = null;

  // 샘플 데이터 생성
  function generateSampleData() {
    return [
      { name: '홍길동', address: '서울특별시 강남구 테헤란로 123', postalCode: '06158' },
      { name: '김영희', address: '서울특별시 서초구 반포대로 45', postalCode: '06543' },
      { name: '이철수', address: '경기도 성남시 분당구 정자로 67', postalCode: '13561' },
      { name: '박민수', address: '인천광역시 연수구 송도과학로 89', postalCode: '21984' },
      { name: '정수진', address: '부산광역시 해운대구 우동 123-45', postalCode: '48058' },
      { name: '최지혜', address: '대구광역시 수성구 달구벌대로 678', postalCode: '42192' },
      { name: '한상호', address: '대전광역시 유성구 대학로 234', postalCode: '34141' },
      { name: '윤미경', address: '광주광역시 서구 상무대로 567', postalCode: '61949' },
      { name: '장동건', address: '울산광역시 남구 삼산로 890', postalCode: '44776' },
      { name: '송혜교', address: '세종특별자치시 한누리대로 123', postalCode: '30103' },
      { name: '강호동', address: '강원도 춘천시 중앙로 456', postalCode: '24341' },
      { name: '유재석', address: '충청북도 청주시 상당구 대성로 789', postalCode: '28644' },
      { name: '신동엽', address: '충청남도 천안시 동남구 병천면 123', postalCode: '31225' },
      { name: '김용만', address: '전라북도 전주시 완산구 효자동 456-78', postalCode: '54896' },
      { name: '조세호', address: '전라남도 목포시 용당로 234', postalCode: '58746' },
      { name: '김구라', address: '경상북도 대구시 중구 국채보상로 567', postalCode: '41911' },
      { name: '허경환', address: '경상남도 창원시 마산합포구 3·15대로 890', postalCode: '51329' },
      { name: '김영철', address: '제주특별자치도 제주시 연동 123-45', postalCode: '63212' }
    ];
  }

  // 진행 상황 표시
  const PROGRESS_STEP_TEMPLATE = [
    { key: 'upload', label: '파일 업로드' },
    { key: 'dedupe', label: '중복 제거' },
    { key: 'lookup', label: '우편번호 조회' },
    { key: 'export', label: '엑셀 생성' }
  ];

  const cloneProgressSteps = (activeKey = null) => PROGRESS_STEP_TEMPLATE.map(step => {
    let status = 'pending';
    if (step.key === activeKey) {
      status = 'in-progress';
    } else if (step.key === 'upload' && activeKey !== 'upload') {
      status = 'done';
    }
    return { ...step, status };
  });

  function renderProgressSteps(containerId, steps) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = sanitizeHTML(steps.map(step => `
      <li data-key="${step.key}" class="${step.status || 'pending'}">
        <span class="step-box"></span>
        <span class="step-label">${step.label}</span>
      </li>
    `).join(''));
  }

  function updateProgressSteps(containerId, steps) {
    const container = document.getElementById(containerId);
    if (!container) return;
    steps.forEach(step => {
      const li = container.querySelector(`li[data-key="${step.key}"]`);
      if (!li) return;
      li.classList.remove('pending', 'in-progress', 'done', 'error');
      li.classList.add(step.status || 'pending');
      const box = li.querySelector('.step-box');
      if (!box) return;
      if (step.status === 'done') {
        box.textContent = '✓';
      } else if (step.status === 'in-progress') {
        box.textContent = '…';
      } else if (step.status === 'error') {
        box.textContent = '⚠';
      } else {
        box.textContent = '';
      }
    });
  }

  function updateProgressCard(status = {}, fallbackText = '') {
    const fill = document.getElementById('labelProgressFill');
    const textEl = document.getElementById('labelProgressText');
    const stepsContainer = 'labelProgressSteps';

    const percent = Math.max(0, Math.min(100, status.progress ?? 0));
    if (fill) fill.style.width = percent + '%';

    let message = fallbackText || '처리 중...';
    if (textEl) textEl.textContent = message;

    const steps = Array.isArray(status.steps) && status.steps.length
      ? status.steps
      : cloneProgressSteps(status.status === 'processing' ? 'dedupe' : null);
    renderProgressSteps(stepsContainer, steps);
    updateProgressSteps(stepsContainer, steps);
  }

  // 라벨 파일 선택 핸들러
  function handleLabelFileSelect(event) {
    const file = event.target.files[0];
    if (file) processLabelFile(file);
  }

  // 라벨 파일 처리 (클라이언트 전용)
  async function processLabelFile(file) {
    if (!file.name.match(/\.(xls|xlsx)$/i)) {
      alert('엑셀 파일(.xls, .xlsx)만 업로드 가능합니다.');
      return;
    }
    lastLabelStatus = null;

    log('파일 처리 시작:', file.name);

    // 진행 상황 표시
    document.getElementById('labelUploadProgress').classList.remove('hidden');
    updateProgressCard({ progress: 10, steps: cloneProgressSteps('upload') }, '파일 읽는 중...');

    try {
      // XLSX 라이브러리 확인
      if (!window.XLSX) {
        throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
      }

      // 파일을 ArrayBuffer로 읽기
      updateProgressCard({ progress: 30, steps: cloneProgressSteps('upload') }, '엑셀 파일 파싱 중...');
      const arrayBuffer = await file.arrayBuffer();

      // XLSX로 파싱
      updateProgressCard({ progress: 50, steps: cloneProgressSteps('dedupe') }, '데이터 추출 중...');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        throw new Error('엑셀 파일이 비어있습니다.');
      }

      // 헤더와 데이터 분리
      updateProgressCard({ progress: 80, steps: cloneProgressSteps('export') }, '라벨 데이터 생성 중...');
      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      // 라벨 데이터 설정
      labelData = { headers, rows };
      currentLabelJobId = 'client_' + Date.now();

      log('데이터 생성 완료:', { headers, rowCount: rows.length });

      // 완료
      updateProgressCard({ progress: 100, steps: cloneProgressSteps('export') }, '처리 완료!');

      setTimeout(() => {
        document.getElementById('labelUploadProgress').classList.add('hidden');
        showLabelDataPreview();
      }, 300);

    } catch (error) {
      window.logger.error('파일 처리 오류:', error);
      document.getElementById('labelUploadProgress').classList.add('hidden');
      alert('파일 처리 중 오류가 발생했습니다: ' + error.message);

      // 오류 발생 시 샘플 데이터로 대체
      log('샘플 데이터로 대체');
      lastLabelStatus = null;
      labelData = generateSampleData();
      showLabelDataPreview();
    }
  }

  // 미리보기 전용: 동의어/중복 값 컬럼 제거
  function dedupePreviewColumns(columns, data) {
    if (!Array.isArray(columns) || columns.length === 0) return columns || [];

    const lower = (s) => String(s || '').toLowerCase();
    const norm = (s) => lower(s).replace(/[\s_\/]/g, '');

    const groups = {
      postal: ['우편번호', 'postalcode', 'postal_code', 'postcode', 'zip', 'zipcode'],
      address: ['도로명주소', 'address', 'fulladdress', '전체주소', '주소'],
      name: ['성명', '이름', 'name']
    };

    const inGroup = (col, keys) => keys.includes(norm(col));

    // 중복 값 판정
    const sameValues = (a, b) => {
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        const va = (typeof row === 'object' && !Array.isArray(row)) ? row[a] : row[columns.indexOf(a)];
        const vb = (typeof row === 'object' && !Array.isArray(row)) ? row[b] : row[columns.indexOf(b)];
        if ((va || '') !== (vb || '')) return false;
      }
      return true;
    };

    const preferOrder = {
      name: ['성명', '이름', 'name'],
      address: ['도로명주소', 'address', 'fullAddress', '전체주소', '주소'],
      postal: ['우편번호', 'postalCode', 'postal_code', 'postcode', 'zip', 'zipcode']
    };

    const chosen = new Set();
    let keptName = null;
    let keptAddress = null;
    let keptPostal = null;

    // 이름 우선 선택
    {
      const candidates = columns.filter(c => inGroup(c, groups.name));
      if (candidates.length) {
        const ordered = preferOrder.name
          .map(k => candidates.find(c => norm(c) === norm(k)))
          .filter(Boolean)
          .concat(candidates.filter(c => !preferOrder.name.some(k => norm(k) === norm(c))));
        keptName = ordered[0] || candidates[0];
        if (keptName) chosen.add(keptName);
      }
    }

    ['address', 'postal'].forEach((g) => {
      const candidates = columns.filter(c => inGroup(c, groups[g]));
      if (candidates.length === 0) return;
      let kept = null;
      const ordered = preferOrder[g]
        .map(k => candidates.find(c => norm(c) === norm(k)))
        .filter(Boolean)
        .concat(candidates.filter(c => !preferOrder[g].some(k => norm(k) === norm(c))));
      for (const col of ordered) {
        if (!kept) { kept = col; continue; }
        if (!sameValues(kept, col)) continue;
      }
      if (kept) {
        if (g === 'address') keptAddress = kept; else keptPostal = kept;
        chosen.add(kept);
      }
    });

    const orderedOut = [];
    if (keptName) orderedOut.push(keptName);
    if (keptAddress) orderedOut.push(keptAddress);
    if (keptPostal) orderedOut.push(keptPostal);

    columns.forEach((c) => {
      if (orderedOut.includes(c)) return;
      const normalizedColumn = norm(c);
      const previewHide = ['시도', '시도명', 'sido', '시군구', '시군구명', 'sigungu'];
      if (previewHide.some(pattern => normalizedColumn.includes(norm(pattern)))) return;
      if (inGroup(c, groups.address)) return;
      if (inGroup(c, groups.postal)) return;
      orderedOut.push(c);
    });

    return orderedOut.length ? orderedOut : columns;
  }

  // 데이터 테이블 생성
  function createDataTable(data, columns) {
    if (!data || data.length === 0) return '<p>데이터가 없습니다.</p>';

    if (!columns && data[0]) {
      columns = Object.keys(data[0]);
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';

    // 헤더
    html += '<thead><tr>';
    columns.forEach(col => {
      html += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${col}</th>`;
    });
    html += '</tr></thead>';

    // 데이터 (최대 5행만 표시)
    html += '<tbody>';
    data.slice(0, 5).forEach(row => {
      html += '<tr>';
      columns.forEach((col, index) => {
        const value = typeof row === 'object' && !Array.isArray(row) ? row[col] : row[index];
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${value || ''}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (data.length > 5) {
      html += `<p style="margin-top: 10px; color: #666;">총 ${data.length}개 행 (5개만 표시)</p>`;
    }

    return html;
  }

  // 필드 매핑 UI 생성
  function createFieldMappings(columns) {
    const container = document.getElementById('labelFieldMapping');
    const fields = [
      { key: 'name', label: '이름' },
      { key: 'address', label: '주소' },
      { key: 'postalCode', label: '우편번호' }
    ];

    const synonyms = {
      name: ['성명', '이름', 'name'],
      address: ['도로명주소', '전체주소', 'address', 'fulladdress', '주소'],
      postalCode: ['우편번호', 'postalcode', 'postal_code', 'postcode', 'zip', 'zipcode']
    };
    const norm = (s) => String(s || '').toLowerCase();
    const isMatch = (col, key) => synonyms[key].some(k => norm(col).includes(norm(k)));

    let html = '';
    fields.forEach(field => {
      const selectId = `labelField-${field.key}`;
      html += `
        <div class="field-mapping">
          <label for="${selectId}">${field.label}:</label>
          <select id="${selectId}" data-field="${field.key}">
            <option value="">선택 안함</option>
            ${columns.map(col => `<option value="${col}" ${isMatch(col, field.key) ? 'selected' : ''}>${col}</option>`).join('')}
          </select>
        </div>
      `;
    });

    container.innerHTML = sanitizeHTML(html);

    // 이벤트 리스너 추가
    container.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', (e) => {
        const field = e.target.getAttribute('data-field');
        const column = e.target.value;
        fieldMappings[field] = column;
      });
    });

    // 초기 매핑 설정
    fields.forEach(field => {
      const select = container.querySelector(`select[data-field="${field.key}"]`);
      if (select && select.value) {
        fieldMappings[field.key] = select.value;
      }
    });
  }

  // 라벨 데이터 미리보기 표시
  function showLabelDataPreview() {
    if (!labelData) {
      alert('데이터가 없습니다.');
      return;
    }

    let displayData;
    let columns;

    if (Array.isArray(labelData)) {
      if (labelData.length === 0) {
        alert('데이터가 없습니다.');
        return;
      }
      displayData = labelData;
      columns = Object.keys(labelData[0]);
    } else if (labelData.headers && labelData.rows) {
      if (labelData.rows.length === 0) {
        alert('데이터가 없습니다.');
        return;
      }
      displayData = labelData.rows;
      columns = labelData.headers;
    } else {
      alert('잘못된 데이터 형식입니다.');
      return;
    }

    const previewColumns = dedupePreviewColumns(columns, displayData);
    const tableHtml = createDataTable(displayData, previewColumns);
    document.getElementById('labelDataTable').innerHTML = sanitizeHTML(tableHtml);

    const mappingColumns = Array.isArray(previewColumns) && previewColumns.length
      ? previewColumns
      : (Array.isArray(columns) ? columns : []);
    createFieldMappings(mappingColumns);

    const noteEl = document.getElementById('labelPreviewNote');
    if (noteEl) {
      if (lastLabelStatus?.truncatedCount) {
        noteEl.innerHTML = sanitizeHTML(`⚠️ 최대 ${lastLabelStatus.maxRows || 0}건까지만 처리되어 ${lastLabelStatus.truncatedCount}건은 제외되었습니다.`);
        noteEl.classList.remove('hidden');
      } else {
        noteEl.textContent = '';
        noteEl.classList.add('hidden');
      }
    }

    document.getElementById('labelDataPreview').classList.remove('hidden');
  }

  // 라벨 생성
  function generateLabels() {
    if (!labelData || Object.keys(fieldMappings).length === 0) {
      alert('데이터와 필드 매핑을 확인해주세요.');
      return;
    }

    let dataRows;
    let headers;

    if (Array.isArray(labelData)) {
      dataRows = labelData;
      headers = labelData.length > 0 ? Object.keys(labelData[0]) : [];
    } else if (labelData.headers && labelData.rows) {
      dataRows = labelData.rows;
      headers = labelData.headers;
    } else {
      alert('잘못된 데이터 형식입니다.');
      return;
    }

    if (dataRows.length === 0) {
      alert('생성할 데이터가 없습니다.');
      return;
    }

    const template = document.getElementById('labelTemplate')?.value || '2x9';
    const templateMap = {
      '2x9': { perSheet: 18, sheetClass: 'label-sheet-2x9' },
      '3x7': { perSheet: 21, sheetClass: 'label-sheet-3x7' },
      '4x6': { perSheet: 24, sheetClass: 'label-sheet-4x6' },
    };
    const { perSheet, sheetClass } = templateMap[template] || templateMap['2x9'];

    // 시작 위치 가져오기 (1-18)
    const startPosition = parseInt(document.getElementById('labelStartPosition')?.value || '1', 10);
    const skipCount = Math.max(0, startPosition - 1); // 건너뛸 빈 칸 수

    const labelSheetContainer = document.getElementById('labelModalSheet');
    if (!labelSheetContainer) {
      alert('라벨 모달 컨테이너를 찾을 수 없습니다.');
      return;
    }
    labelSheetContainer.innerHTML = '';

    const total = dataRows.length;
    // 첫 번째 페이지에서 사용 가능한 칸 수 계산
    const firstPageSlots = perSheet - skipCount;
    // 전체 필요한 페이지 수 계산
    const sheetCount = total <= firstPageSlots
      ? 1
      : 1 + Math.ceil((total - firstPageSlots) / perSheet);

    let dataIndex = 0;
    const nameSuffix = document.getElementById('nameSuffix')?.value || '';

    for (let s = 0; s < sheetCount; s++) {
      let sheetHtml = '';
      for (let i = 0; i < perSheet; i++) {
        // 첫 번째 시트에서 시작 위치 전까지는 빈 칸으로 채움
        if (s === 0 && i < skipCount) {
          sheetHtml += `<div class="label-item empty"></div>`;
          continue;
        }

        if (dataIndex < total) {
          const rowData = dataRows[dataIndex];
          let name = '', address = '', postalCode = '';

          if (typeof rowData === 'object' && !Array.isArray(rowData)) {
            name = fieldMappings.name ? (rowData[fieldMappings.name] ?? '') : '';
            address = fieldMappings.address ? (rowData[fieldMappings.address] ?? '') : '';
            postalCode = fieldMappings.postalCode ? (rowData[fieldMappings.postalCode] ?? '') : '';
          } else if (Array.isArray(rowData)) {
            const nameIndex = headers.indexOf(fieldMappings.name);
            const addressIndex = headers.indexOf(fieldMappings.address);
            const postalCodeIndex = headers.indexOf(fieldMappings.postalCode);
            name = nameIndex >= 0 ? (rowData[nameIndex] ?? '') : '';
            address = addressIndex >= 0 ? (rowData[addressIndex] ?? '') : '';
            postalCode = postalCodeIndex >= 0 ? (rowData[postalCodeIndex] ?? '') : '';
          }

          const combinedAddress = address;

          const displayNameParts = [];
          if (name) displayNameParts.push(name);
          if (nameSuffix) displayNameParts.push(nameSuffix);
          const displayName = displayNameParts.join(' ');
          const isLong = combinedAddress.length > 36 || displayName.length > 20 || `${postalCode}`.length > 8;

          const addressBlock = combinedAddress
            ? `<div class="label-address-line">${combinedAddress}</div>`
            : '<div class="label-address-line"></div>';

          sheetHtml += `
            <div class="label-item${isLong ? ' long-content' : ''}">
              <div class="label-address-block">
                ${addressBlock}
              </div>
              <div class="label-name-line">${displayName}</div>
              <div class="label-postal-line">${postalCode ?? ''}</div>
            </div>
          `;
          dataIndex++;
        } else {
          sheetHtml += `<div class="label-item empty"></div>`;
        }
      }

      const sheet = document.createElement('div');
      sheet.className = `${sheetClass} label-preview`;
      sheet.innerHTML = sanitizeHTML(sheetHtml);
      labelSheetContainer.appendChild(sheet);
    }

    // 모달 표시
    const modal = document.getElementById('labelModal');
    const appContainer = document.querySelector('.container');
    if (appContainer) appContainer.setAttribute('inert', '');
    if (modal) {
      lastFocusedElement = (document.activeElement && document.activeElement.focus) ? document.activeElement : null;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      requestAnimationFrame(() => {
        const first = document.getElementById('btnModalClose') || modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (first && first.focus) first.focus();
      });
      // 탭 포커스 트랩
      modalKeydownHandler = (e) => {
        if (e.key !== 'Tab') return;
        const focusables = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusables.length === 0) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };
      modal.addEventListener('keydown', modalKeydownHandler);
    }
    document.getElementById('labelPreview').classList.remove('hidden');
  }

  // 라벨 인쇄
  function printLabels() {
    const originalTitle = document.title;
    const template = document.getElementById('labelTemplate')?.value || '2x9';
    const id = (typeof currentLabelJobId === 'string' && currentLabelJobId)
      ? currentLabelJobId
      : new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const nameSuffix = document.getElementById('nameSuffix')?.value || '';
    const suffix = nameSuffix ? `_${nameSuffix}` : '';
    const rawTitle = `labels_${template}_${id}${suffix}`;
    const safeTitle = rawTitle
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/-$/g, '')
      .slice(0, 100);

    document.title = safeTitle || 'labels';

    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
      if (mql) mql.removeListener(beforeAfterHandler);
    };

    window.addEventListener('afterprint', restore);
    const mql = window.matchMedia && window.matchMedia('print');
    const beforeAfterHandler = (e) => { if (!e.matches) restore(); };
    if (mql && mql.addListener) mql.addListener(beforeAfterHandler);

    window.print();
    setTimeout(restore, 2000);
  }

  // 모달 닫기
  function closeLabelModal() {
    const modal = document.getElementById('labelModal');
    const appContainer = document.querySelector('.container');

    if (modal && modalKeydownHandler) {
      modal.removeEventListener('keydown', modalKeydownHandler);
      modalKeydownHandler = null;
    }

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      try { lastFocusedElement.focus(); } catch (_) {}
    } else {
      try { document.body.focus(); } catch (_) {}
    }

    requestAnimationFrame(() => {
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
      if (appContainer) appContainer.removeAttribute('inert');
    });
  }

  // UI 초기화
  function resetLabelUI() {
    labelData = null;
    fieldMappings = {};

    const fileInput = document.getElementById('labelFile');
    if (fileInput) fileInput.value = '';

    document.getElementById('labelUploadProgress').classList.add('hidden');
    document.getElementById('labelDataPreview').classList.add('hidden');
    document.getElementById('labelPreview').classList.add('hidden');

    const tbl = document.getElementById('labelDataTable');
    const fmap = document.getElementById('labelFieldMapping');
    const sheet = document.getElementById('labelSheet');
    const modalSheet = document.getElementById('labelModalSheet');
    if (tbl) tbl.innerHTML = '';
    if (fmap) fmap.innerHTML = '';
    if (sheet) sheet.innerHTML = '';
    if (modalSheet) modalSheet.innerHTML = '';

    const noteEl = document.getElementById('labelPreviewNote');
    if (noteEl) {
      noteEl.textContent = '';
      noteEl.classList.add('hidden');
    }

    const modal = document.getElementById('labelModal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    const appContainer = document.querySelector('.container');
    if (appContainer) appContainer.removeAttribute('inert');

    updateProgressCard({ progress: 0, steps: cloneProgressSteps() }, '처리 중...');
    lastLabelStatus = null;
  }

  // 라벨 위치 그리드 초기화 및 이벤트 바인딩
  function initLabelGridPreview() {
    const grid = document.getElementById('labelGridPreview');
    if (!grid) return;

    const cells = grid.querySelectorAll('.label-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const pos = parseInt(cell.dataset.pos, 10);
        const hiddenInput = document.getElementById('labelStartPosition');
        if (hiddenInput) {
          hiddenInput.value = pos;
        }
        updateLabelGridPreview(pos);
      });
    });

    // 초기 상태 (1번 시작)
    updateLabelGridPreview(1);
  }

  // 라벨 그리드 프리뷰 업데이트
  function updateLabelGridPreview(startPos) {
    const grid = document.getElementById('labelGridPreview');
    if (!grid) return;

    const cells = grid.querySelectorAll('.label-cell');
    cells.forEach(cell => {
      const pos = parseInt(cell.dataset.pos, 10);
      cell.classList.remove('used', 'start', 'available');

      if (pos < startPos) {
        cell.classList.add('used');
      } else if (pos === startPos) {
        cell.classList.add('start');
      } else {
        cell.classList.add('available');
      }
    });
  }

  // 이벤트 바인딩
  document.addEventListener('DOMContentLoaded', () => {
    // 라벨 파일 드롭 영역
    const labelDropArea = document.getElementById('labelFileDropArea');
    if (labelDropArea) {
      labelDropArea.addEventListener('click', () => document.getElementById('labelFile').click());
      labelDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        labelDropArea.classList.add('dragover');
      });
      labelDropArea.addEventListener('dragleave', () => labelDropArea.classList.remove('dragover'));
      labelDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        labelDropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) processLabelFile(files[0]);
      });
    }

    // 라벨 파일 입력
    const labelFileInput = document.getElementById('labelFile');
    if (labelFileInput) {
      labelFileInput.addEventListener('change', handleLabelFileSelect);
    }

    // 라벨 생성 버튼
    const btnGenerate = document.getElementById('btnGenerateLabels');
    if (btnGenerate) btnGenerate.addEventListener('click', generateLabels);

    // 라벨 인쇄 버튼
    const btnPrint = document.getElementById('btnPrintLabels');
    if (btnPrint) btnPrint.addEventListener('click', printLabels);

    // 모달 버튼들
    const btnModalPrint = document.getElementById('btnModalPrint');
    if (btnModalPrint) btnModalPrint.addEventListener('click', printLabels);

    const btnModalClose = document.getElementById('btnModalClose');
    if (btnModalClose) btnModalClose.addEventListener('click', closeLabelModal);

    const btnModalReset = document.getElementById('btnModalReset');
    if (btnModalReset) btnModalReset.addEventListener('click', resetLabelUI);

    const modalEl = document.getElementById('labelModal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'labelModal') closeLabelModal();
      });
    }

    // 라벨 초기화 버튼
    const btnReset = document.getElementById('btnLabelReset');
    if (btnReset) btnReset.addEventListener('click', resetLabelUI);

    // 라벨 위치 그리드 클릭 이벤트
    initLabelGridPreview();

    // 샘플 데이터 로드 버튼
    const btnSample = document.getElementById('btnLoadSampleData');
    if (btnSample) {
      btnSample.addEventListener('click', () => {
        lastLabelStatus = null;
        labelData = generateSampleData();
        showLabelDataPreview();
      });
    }

    // 메인 앱에서 전달된 데이터 확인
    checkForPassedData();
  });

  // 메인 앱에서 전달된 데이터 확인 및 로드
  function checkForPassedData() {
    try {
      const passedData = localStorage.getItem('labelPrintData');
      if (passedData) {
        const data = JSON.parse(passedData);
        if (Array.isArray(data) && data.length > 0) {
          log('메인 앱에서 전달된 데이터:', data.length, '건');

          // 데이터 저장 후 localStorage 클리어
          labelData = data;
          localStorage.removeItem('labelPrintData');

          // 미리보기 표시
          showLabelDataPreview();

          // 알림 표시
          setTimeout(() => {
            alert(`${data.length}건의 데이터가 로드되었습니다.\n라벨 생성 버튼을 클릭하여 라벨을 생성하세요.`);
          }, 300);
        }
      }
    } catch (error) {
      window.logger.error('전달된 데이터 로드 오류:', error);
    }
  }
})();
