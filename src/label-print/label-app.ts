/**
 * @fileoverview 라벨 인쇄 모듈
 * @description 시료 라벨 출력 및 엑셀 변환 기능
 */

// ========================================
// Types
// ========================================

interface LabelDataRow {
  [key: string]: string | number | undefined;
}

interface LabelDataStructured {
  headers: string[];
  rows: (string | number)[][];
}

type LabelData = LabelDataRow[] | LabelDataStructured;

interface ProgressStep {
  key: string;
  label: string;
  status?: 'pending' | 'in-progress' | 'done' | 'error';
}

interface StatusInfo {
  progress?: number;
  status?: string;
  steps?: ProgressStep[];
  maxRows?: number;
  truncatedCount?: number;
}

interface FieldMappings {
  name?: string;
  address?: string;
  postalCode?: string;
}

interface LabelTemplate {
  perSheet: number;
  sheetClass: string;
}

// ========================================
// State Variables
// ========================================

(() => {
  /** @type {boolean} 디버그 모드 (프로덕션에서는 false) */
  const DEBUG_LABEL = false;

  /** 조건부 로깅 */
  const log = (...args: unknown[]): void => {
    if (DEBUG_LABEL) console.log('[Label]', ...args);
  };

  let labelData: LabelData | null = null;
  let fieldMappings: FieldMappings = {};
  let currentLabelJobId: string | null = null;
  let lastLabelStatus: StatusInfo | null = null;

  // 모달 포커스 관리
  let lastFocusedElement: HTMLElement | null = null;
  let modalKeydownHandler: ((e: KeyboardEvent) => void) | null = null;

  // ========================================
  // Sample Data
  // ========================================

  function generateSampleData(): LabelDataRow[] {
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

  // ========================================
  // Progress Steps
  // ========================================

  const PROGRESS_STEP_TEMPLATE: ProgressStep[] = [
    { key: 'upload', label: '파일 업로드' },
    { key: 'dedupe', label: '중복 제거' },
    { key: 'lookup', label: '우편번호 조회' },
    { key: 'export', label: '엑셀 생성' }
  ];

  const cloneProgressSteps = (activeKey: string | null = null): ProgressStep[] => {
    return PROGRESS_STEP_TEMPLATE.map(step => {
      let status: 'pending' | 'in-progress' | 'done' | 'error' = 'pending';
      if (step.key === activeKey) {
        status = 'in-progress';
      } else if (step.key === 'upload' && activeKey !== 'upload') {
        status = 'done';
      }
      return { ...step, status };
    });
  };

  function renderProgressSteps(containerId: string, steps: ProgressStep[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = steps.map(step => `
      <li data-key="${step.key}" class="${step.status || 'pending'}">
        <span class="step-box"></span>
        <span class="step-label">${step.label}</span>
      </li>
    `).join('');

    container.innerHTML = window.sanitizeHTML ? window.sanitizeHTML(html) : html;
  }

  function updateProgressSteps(containerId: string, steps: ProgressStep[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    steps.forEach(step => {
      const li = container.querySelector<HTMLLIElement>(`li[data-key="${step.key}"]`);
      if (!li) return;

      li.classList.remove('pending', 'in-progress', 'done', 'error');
      li.classList.add(step.status || 'pending');

      const box = li.querySelector<HTMLSpanElement>('.step-box');
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

  function updateProgressCard(status: StatusInfo = {}, fallbackText = ''): void {
    const fill = document.getElementById('labelProgressFill');
    const textEl = document.getElementById('labelProgressText');
    const stepsContainer = 'labelProgressSteps';

    const percent = Math.max(0, Math.min(100, status.progress ?? 0));
    if (fill) (fill as HTMLElement).style.width = percent + '%';

    const message = fallbackText || '처리 중...';
    if (textEl) textEl.textContent = message;

    const steps = Array.isArray(status.steps) && status.steps.length
      ? status.steps
      : cloneProgressSteps(status.status === 'processing' ? 'dedupe' : null);
    renderProgressSteps(stepsContainer, steps);
    updateProgressSteps(stepsContainer, steps);
  }

  // ========================================
  // File Processing
  // ========================================

  function handleLabelFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) processLabelFile(file);
  }

  async function processLabelFile(file: File): Promise<void> {
    if (!file.name.match(/\.(xls|xlsx)$/i)) {
      if (window.showToast) window.showToast('엑셀 파일(.xls, .xlsx)만 업로드 가능합니다.');
      return;
    }
    lastLabelStatus = null;

    log('파일 처리 시작:', file.name);

    const progressEl = document.getElementById('labelUploadProgress');
    if (progressEl) progressEl.classList.remove('hidden');
    updateProgressCard({ progress: 10, steps: cloneProgressSteps('upload') }, '파일 읽는 중...');

    try {
      if (!window.XLSX) {
        throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
      }

      updateProgressCard({ progress: 30, steps: cloneProgressSteps('upload') }, '엑셀 파일 파싱 중...');
      const arrayBuffer = await file.arrayBuffer();

      updateProgressCard({ progress: 50, steps: cloneProgressSteps('dedupe') }, '데이터 추출 중...');
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      if (jsonData.length === 0) {
        throw new Error('엑셀 파일이 비어있습니다.');
      }

      updateProgressCard({ progress: 80, steps: cloneProgressSteps('export') }, '라벨 데이터 생성 중...');
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1);

      labelData = { headers, rows };
      currentLabelJobId = 'client_' + Date.now();

      log('데이터 생성 완료:', { headers, rowCount: rows.length });

      updateProgressCard({ progress: 100, steps: cloneProgressSteps('export') }, '처리 완료!');

      setTimeout(() => {
        if (progressEl) progressEl.classList.add('hidden');
        showLabelDataPreview();
      }, 300);

    } catch (error) {
      (window.logger?.error || console.error)('파일 처리 오류:', error);
      if (progressEl) progressEl.classList.add('hidden');
      if (window.showToast) {
        window.showToast('파일 처리 중 오류가 발생했습니다: ' + (error as Error).message);
      }

      log('샘플 데이터로 대체');
      lastLabelStatus = null;
      labelData = generateSampleData();
      showLabelDataPreview();
    }
  }

  // ========================================
  // Column Deduplication
  // ========================================

  function dedupePreviewColumns(columns: string[], data: unknown[]): string[] {
    if (!Array.isArray(columns) || columns.length === 0) return columns || [];

    const lower = (s: string | number): string => String(s || '').toLowerCase();
    const norm = (s: string | number): string => lower(s).replace(/[\s_/]/g, '');

    const groups = {
      postal: ['우편번호', 'postalcode', 'postal_code', 'postcode', 'zip', 'zipcode'],
      address: ['도로명주소', 'address', 'fulladdress', '전체주소', '주소'],
      name: ['성명', '이름', 'name']
    };

    const inGroup = (col: string, keys: string[]): boolean => keys.includes(norm(col));

    const sameValues = (a: string, b: string): boolean => {
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        const va = (typeof row === 'object' && !Array.isArray(row))
          ? (row as Record<string, unknown>)[a]
          : (row as unknown[])[columns.indexOf(a)];
        const vb = (typeof row === 'object' && !Array.isArray(row))
          ? (row as Record<string, unknown>)[b]
          : (row as unknown[])[columns.indexOf(b)];
        if ((va || '') !== (vb || '')) return false;
      }
      return true;
    };

    const preferOrder = {
      name: ['성명', '이름', 'name'],
      address: ['도로명주소', 'address', 'fullAddress', '전체주소', '주소'],
      postal: ['우편번호', 'postalCode', 'postal_code', 'postcode', 'zip', 'zipcode']
    };

    const chosen = new Set<string>();
    let keptName: string | null = null;
    let keptAddress: string | null = null;
    let keptPostal: string | null = null;

    // 이름 우선 선택
    {
      const candidates = columns.filter(c => inGroup(c, groups.name));
      if (candidates.length) {
        const ordered = preferOrder.name
          .map(k => candidates.find(c => norm(c) === norm(k)))
          .filter((x): x is string => Boolean(x))
          .concat(candidates.filter(c => !preferOrder.name.some(k => norm(k) === norm(c))));
        keptName = ordered[0] || candidates[0];
        if (keptName) chosen.add(keptName);
      }
    }

    (['address', 'postal'] as const).forEach((g) => {
      const candidates = columns.filter(c => inGroup(c, groups[g]));
      if (candidates.length === 0) return;
      let kept: string | null = null;
      const ordered = preferOrder[g]
        .map(k => candidates.find(c => norm(c) === norm(k)))
        .filter((x): x is string => Boolean(x))
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

    const orderedOut: string[] = [];
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

  // ========================================
  // Table Creation
  // ========================================

  function createDataTable(data: unknown[], columns: string[]): string {
    if (!data || data.length === 0) return '<p>데이터가 없습니다.</p>';

    let html = '<table style="width: 100%; border-collapse: collapse;">';

    html += '<thead><tr>';
    columns.forEach(col => {
      html += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${col}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';
    data.slice(0, 5).forEach(row => {
      html += '<tr>';
      columns.forEach((col, index) => {
        const value = typeof row === 'object' && !Array.isArray(row)
          ? (row as Record<string, unknown>)[col]
          : (row as unknown[])[index];
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

  // ========================================
  // Field Mapping
  // ========================================

  function createFieldMappings(columns: string[]): void {
    const container = document.getElementById('labelFieldMapping');
    if (!container) return;

    const fields = [
      { key: 'name' as const, label: '이름' },
      { key: 'address' as const, label: '주소' },
      { key: 'postalCode' as const, label: '우편번호' }
    ];

    const synonyms: Record<string, string[]> = {
      name: ['성명', '이름', 'name'],
      address: ['도로명주소', '전체주소', 'address', 'fulladdress', '주소'],
      postalCode: ['우편번호', 'postalcode', 'postal_code', 'postcode', 'zip', 'zipcode']
    };
    const norm = (s: string | number): string => String(s || '').toLowerCase();
    const isMatch = (col: string, key: string): boolean =>
      synonyms[key].some(k => norm(col).includes(norm(k)));

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

    container.innerHTML = window.sanitizeHTML ? window.sanitizeHTML(html) : html;

    container.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const field = target.getAttribute('data-field') as keyof FieldMappings;
        const column = target.value;
        fieldMappings[field] = column;
      });
    });

    fields.forEach(field => {
      const select = container.querySelector<HTMLSelectElement>(`select[data-field="${field.key}"]`);
      if (select && select.value) {
        fieldMappings[field.key] = select.value;
      }
    });
  }

  // ========================================
  // Preview
  // ========================================

  function showLabelDataPreview(): void {
    if (!labelData) {
      if (window.showToast) window.showToast('데이터가 없습니다.');
      return;
    }

    let displayData: unknown[];
    let columns: string[];

    if (Array.isArray(labelData)) {
      if (labelData.length === 0) {
        if (window.showToast) window.showToast('데이터가 없습니다.');
        return;
      }
      displayData = labelData;
      columns = Object.keys(labelData[0]);
    } else if ('headers' in labelData && 'rows' in labelData) {
      if (labelData.rows.length === 0) {
        if (window.showToast) window.showToast('데이터가 없습니다.');
        return;
      }
      displayData = labelData.rows;
      columns = labelData.headers;
    } else {
      if (window.showToast) window.showToast('잘못된 데이터 형식입니다.');
      return;
    }

    const previewColumns = dedupePreviewColumns(columns, displayData);
    const tableHtml = createDataTable(displayData, previewColumns);
    const tableEl = document.getElementById('labelDataTable');
    if (tableEl) {
      tableEl.innerHTML = window.sanitizeHTML ? window.sanitizeHTML(tableHtml) : tableHtml;
    }

    const mappingColumns = Array.isArray(previewColumns) && previewColumns.length
      ? previewColumns
      : (Array.isArray(columns) ? columns : []);
    createFieldMappings(mappingColumns);

    const noteEl = document.getElementById('labelPreviewNote');
    if (noteEl) {
      if (lastLabelStatus?.truncatedCount) {
        const noteHtml = `⚠️ 최대 ${lastLabelStatus.maxRows || 0}건까지만 처리되어 ${lastLabelStatus.truncatedCount}건은 제외되었습니다.`;
        noteEl.innerHTML = window.sanitizeHTML ? window.sanitizeHTML(noteHtml) : noteHtml;
        noteEl.classList.remove('hidden');
      } else {
        noteEl.textContent = '';
        noteEl.classList.add('hidden');
      }
    }

    const previewEl = document.getElementById('labelDataPreview');
    if (previewEl) previewEl.classList.remove('hidden');
  }

  // ========================================
  // Label Generation
  // ========================================

  function generateLabels(): void {
    if (!labelData || Object.keys(fieldMappings).length === 0) {
      if (window.showToast) window.showToast('데이터와 필드 매핑을 확인해주세요.');
      return;
    }

    let dataRows: unknown[];
    let headers: string[];

    if (Array.isArray(labelData)) {
      dataRows = labelData;
      headers = labelData.length > 0 ? Object.keys(labelData[0]) : [];
    } else if ('headers' in labelData && 'rows' in labelData) {
      dataRows = labelData.rows;
      headers = labelData.headers;
    } else {
      if (window.showToast) window.showToast('잘못된 데이터 형식입니다.');
      return;
    }

    if (dataRows.length === 0) {
      if (window.showToast) window.showToast('생성할 데이터가 없습니다.');
      return;
    }

    const template = (document.getElementById('labelTemplate') as HTMLSelectElement)?.value || '2x9';
    const templateMap: Record<string, LabelTemplate> = {
      '2x9': { perSheet: 18, sheetClass: 'label-sheet-2x9' },
      '3x7': { perSheet: 21, sheetClass: 'label-sheet-3x7' },
      '4x6': { perSheet: 24, sheetClass: 'label-sheet-4x6' },
    };
    const { perSheet, sheetClass } = templateMap[template] || templateMap['2x9'];

    const startPosition = parseInt((document.getElementById('labelStartPosition') as HTMLInputElement)?.value || '1', 10);
    const skipCount = Math.max(0, startPosition - 1);

    const labelSheetContainer = document.getElementById('labelModalSheet');
    if (!labelSheetContainer) {
      if (window.showToast) window.showToast('라벨 모달 컨테이너를 찾을 수 없습니다.');
      return;
    }
    labelSheetContainer.innerHTML = '';

    const total = dataRows.length;
    const firstPageSlots = perSheet - skipCount;
    const sheetCount = total <= firstPageSlots
      ? 1
      : 1 + Math.ceil((total - firstPageSlots) / perSheet);

    let dataIndex = 0;
    const nameSuffix = (document.getElementById('nameSuffix') as HTMLInputElement)?.value || '';

    for (let s = 0; s < sheetCount; s++) {
      let sheetHtml = '';
      for (let i = 0; i < perSheet; i++) {
        if (s === 0 && i < skipCount) {
          sheetHtml += `<div class="label-item empty"></div>`;
          continue;
        }

        if (dataIndex < total) {
          const rowData = dataRows[dataIndex];
          let name = '', address = '', postalCode = '';

          if (typeof rowData === 'object' && !Array.isArray(rowData)) {
            const objData = rowData as Record<string, unknown>;
            name = fieldMappings.name ? String(objData[fieldMappings.name] ?? '') : '';
            address = fieldMappings.address ? String(objData[fieldMappings.address] ?? '') : '';
            postalCode = fieldMappings.postalCode ? String(objData[fieldMappings.postalCode] ?? '') : '';
          } else if (Array.isArray(rowData)) {
            const nameIndex = headers.indexOf(fieldMappings.name || '');
            const addressIndex = headers.indexOf(fieldMappings.address || '');
            const postalCodeIndex = headers.indexOf(fieldMappings.postalCode || '');
            name = nameIndex >= 0 ? String(rowData[nameIndex] ?? '') : '';
            address = addressIndex >= 0 ? String(rowData[addressIndex] ?? '') : '';
            postalCode = postalCodeIndex >= 0 ? String(rowData[postalCodeIndex] ?? '') : '';
          }

          const combinedAddress = address;

          const displayNameParts: string[] = [];
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
      sheet.innerHTML = window.sanitizeHTML ? window.sanitizeHTML(sheetHtml) : sheetHtml;
      labelSheetContainer.appendChild(sheet);
    }

    const modal = document.getElementById('labelModal');
    const appContainer = document.querySelector('.container');
    if (appContainer) appContainer.setAttribute('inert', '');
    if (modal) {
      lastFocusedElement = (document.activeElement && (document.activeElement as HTMLElement).focus)
        ? (document.activeElement as HTMLElement)
        : null;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      requestAnimationFrame(() => {
        const first = document.getElementById('btnModalClose') ||
          modal.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (first && first.focus) first.focus();
      });

      modalKeydownHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const focusables = Array.from(modal.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
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
    const previewEl = document.getElementById('labelPreview');
    if (previewEl) previewEl.classList.remove('hidden');
  }

  // ========================================
  // Print
  // ========================================

  function printLabels(): void {
    const originalTitle = document.title;
    const template = (document.getElementById('labelTemplate') as HTMLSelectElement)?.value || '2x9';
    const id = (typeof currentLabelJobId === 'string' && currentLabelJobId)
      ? currentLabelJobId
      : new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const nameSuffix = (document.getElementById('nameSuffix') as HTMLInputElement)?.value || '';
    const suffix = nameSuffix ? `_${nameSuffix}` : '';
    const rawTitle = `labels_${template}_${id}${suffix}`;
    const safeTitle = rawTitle
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/-$/g, '')
      .slice(0, 100);

    document.title = safeTitle || 'labels';

    const restore = (): void => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
      if (mql) mql.removeListener(beforeAfterHandler);
    };

    window.addEventListener('afterprint', restore);
    const mql = window.matchMedia && window.matchMedia('print');
    const beforeAfterHandler = (e: MediaQueryListEvent): void => {
      if (!e.matches) restore();
    };
    if (mql && mql.addListener) mql.addListener(beforeAfterHandler);

    window.print();
    setTimeout(restore, 2000);
  }

  // ========================================
  // Modal
  // ========================================

  function closeLabelModal(): void {
    const modal = document.getElementById('labelModal');
    const appContainer = document.querySelector('.container');

    if (modal && modalKeydownHandler) {
      modal.removeEventListener('keydown', modalKeydownHandler);
      modalKeydownHandler = null;
    }

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      try { lastFocusedElement.focus(); } catch (_) { /* ignore */ }
    } else {
      try { document.body.focus(); } catch (_) { /* ignore */ }
    }

    requestAnimationFrame(() => {
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
      if (appContainer) appContainer.removeAttribute('inert');
    });
  }

  // ========================================
  // Reset
  // ========================================

  function resetLabelUI(): void {
    labelData = null;
    fieldMappings = {};

    const fileInput = document.getElementById('labelFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    const progressEl = document.getElementById('labelUploadProgress');
    const previewEl = document.getElementById('labelDataPreview');
    const labelPreviewEl = document.getElementById('labelPreview');

    if (progressEl) progressEl.classList.add('hidden');
    if (previewEl) previewEl.classList.add('hidden');
    if (labelPreviewEl) labelPreviewEl.classList.add('hidden');

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

  // ========================================
  // Grid Preview
  // ========================================

  function initLabelGridPreview(): void {
    const grid = document.getElementById('labelGridPreview');
    if (!grid) return;

    const cells = grid.querySelectorAll<HTMLElement>('.label-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const pos = parseInt(cell.dataset.pos || '1', 10);
        const hiddenInput = document.getElementById('labelStartPosition') as HTMLInputElement;
        if (hiddenInput) {
          hiddenInput.value = String(pos);
        }
        updateLabelGridPreview(pos);
      });
    });

    updateLabelGridPreview(1);
  }

  function updateLabelGridPreview(startPos: number): void {
    const grid = document.getElementById('labelGridPreview');
    if (!grid) return;

    const cells = grid.querySelectorAll<HTMLElement>('.label-cell');
    cells.forEach(cell => {
      const pos = parseInt(cell.dataset.pos || '0', 10);
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

  // ========================================
  // Passed Data
  // ========================================

  function checkForPassedData(): void {
    try {
      const passedData = localStorage.getItem('labelPrintData');
      if (passedData) {
        const data = JSON.parse(passedData) as LabelDataRow[];
        if (Array.isArray(data) && data.length > 0) {
          log('메인 앱에서 전달된 데이터:', data.length, '건');

          labelData = data;
          localStorage.removeItem('labelPrintData');

          showLabelDataPreview();

          setTimeout(() => {
            alert(`${data.length}건의 데이터가 로드되었습니다.\n라벨 생성 버튼을 클릭하여 라벨을 생성하세요.`);
          }, 300);
        }
      }
    } catch (error) {
      (window.logger?.error || console.error)('전달된 데이터 로드 오류:', error);
    }
  }

  // ========================================
  // Event Binding
  // ========================================

  document.addEventListener('DOMContentLoaded', () => {
    const labelDropArea = document.getElementById('labelFileDropArea');
    if (labelDropArea) {
      labelDropArea.addEventListener('click', () => {
        const fileInput = document.getElementById('labelFile') as HTMLInputElement;
        if (fileInput) fileInput.click();
      });
      labelDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        labelDropArea.classList.add('dragover');
      });
      labelDropArea.addEventListener('dragleave', () => labelDropArea.classList.remove('dragover'));
      labelDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        labelDropArea.classList.remove('dragover');
        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files.length > 0) processLabelFile(files[0]);
      });
    }

    const labelFileInput = document.getElementById('labelFile');
    if (labelFileInput) {
      labelFileInput.addEventListener('change', handleLabelFileSelect);
    }

    const btnGenerate = document.getElementById('btnGenerateLabels');
    if (btnGenerate) btnGenerate.addEventListener('click', generateLabels);

    const btnPrint = document.getElementById('btnPrintLabels');
    if (btnPrint) btnPrint.addEventListener('click', printLabels);

    const btnModalPrint = document.getElementById('btnModalPrint');
    if (btnModalPrint) btnModalPrint.addEventListener('click', printLabels);

    const btnModalClose = document.getElementById('btnModalClose');
    if (btnModalClose) btnModalClose.addEventListener('click', closeLabelModal);

    const btnModalReset = document.getElementById('btnModalReset');
    if (btnModalReset) btnModalReset.addEventListener('click', resetLabelUI);

    const modalEl = document.getElementById('labelModal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target && (e.target as HTMLElement).id === 'labelModal') closeLabelModal();
      });
    }

    const btnReset = document.getElementById('btnLabelReset');
    if (btnReset) btnReset.addEventListener('click', resetLabelUI);

    initLabelGridPreview();

    const btnSample = document.getElementById('btnLoadSampleData');
    if (btnSample) {
      btnSample.addEventListener('click', () => {
        lastLabelStatus = null;
        labelData = generateSampleData();
        showLabelDataPreview();
      });
    }

    checkForPassedData();
  });
})();
