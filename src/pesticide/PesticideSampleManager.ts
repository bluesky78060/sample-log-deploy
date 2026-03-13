// ========================================
// Pesticide Sample Manager
// 잔류농약 시료 관리 클래스
// ========================================

import type { PesticideSample } from '../types/sample-types';
import { BaseSampleManager } from '../shared/BaseSampleManager';

/**
 * Pesticide test result type
 */
type PesticideResult = 'pass' | 'fail' | null;

/**
 * Pesticide sample data with internal fields
 */
interface PesticideSampleData {
  // PesticideSample base fields
  접수일?: string;
  접수번호?: string;
  성명?: string;
  전화번호?: string;
  수령방법?: string;
  비고?: string;
  시료명?: string;
  생산자?: string;
  생산자주소?: string;
  생산지?: string;
  농산물명?: string;
  채취일?: string;
  검사일?: string;
  검사항목?: any;
  검사항목수?: number;
  결과?: string;
  성적서번호?: string;
  증명서발급일?: string;

  // Internal fields
  id: string;
  date?: string;
  receptionNumber?: string;
  name?: string;
  applicantType?: '개인' | '법인';
  birthDate?: string;
  corpNumber?: string;
  phoneNumber?: string;
  address?: string;
  addressPostcode?: string;
  addressRoad?: string;
  addressDetail?: string;
  subCategory?: string;
  purpose?: string;
  receptionMethod?: string;
  note?: string;
  producerName?: string;
  producerAddress?: string;
  requestContent?: string;
  completed?: boolean;
  testResult?: PesticideResult;
  createdAt?: string;
  updatedAt?: string;
}

// BaseSampleManager is already declared in globals.d.ts
// No need to redeclare

/**
 * BaseSampleManager instance interface
 */
interface BaseSampleManagerInstance {
  moduleKey: string;
  moduleName: string;
  storageKey: string;
  debug: boolean;
  sampleLogs: PesticideSampleData[];
  editingId: string | null;
  form: HTMLFormElement | null;
  tableBody: HTMLElement | null;
  emptyState: HTMLElement | null;
  recordCountEl: HTMLElement | null;

  // Methods
  log(...args: unknown[]): void;
  saveLogs(): Promise<void>;
  generateId(): string;
  switchView(view: string): void;
  showToast(message: string, type: string): void;
  updateRecordCount(): void;
}

/**
 * 잔류농약 시료 관리 매니저
 * BaseSampleManager를 확장하여 잔류농약 특화 기능 구현
 */
class PesticideSampleManager extends BaseSampleManager<PesticideSampleData> {
  declare sampleLogs: PesticideSampleData[];
  declare editingId: string | null;
  declare form: HTMLFormElement | null;
  declare tableBody: HTMLElement | null;
  declare emptyState: HTMLElement | null;
  declare recordCountEl: HTMLElement | null;

  /**
   * 타입별 추가 이벤트 설정 (잔류농약 전용)
   */
  protected override setupTypeSpecificEvents(): void {
    this.setupExcelExport();
    this.setupExcelImport();
    this.setupLabelPrint();
  }

  /**
   * 엑셀 내보내기
   */
  setupExcelExport(): void {
    const exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
      if (this.sampleLogs.length === 0) {
        this.showToast('내보낼 데이터가 없습니다.', 'warning');
        return;
      }

      const selectedIds = Array.from(
        document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')
      ).map(cb => cb.dataset.id);

      const logsToExport = selectedIds.length > 0
        ? this.sampleLogs.filter(log => selectedIds.includes(log.id))
        : this.sampleLogs;

      if (selectedIds.length > 0) {
        this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
      }

      const sortedLogs = [...logsToExport].sort((a, b) => {
        const aNum = parseInt(String(a.receptionNumber).replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(String(b.receptionNumber).replace(/\D/g, ''), 10) || 0;
        return aNum - bNum;
      });

      const parseAddressParts = (window as any).parseAddressParts || (() => ({ sido: '', sigungu: '', eupmyeondong: '', rest: '' }));
      const sanitizeCell = (window as any).SampleUtils?.sanitizeExcelCell ?? ((v: string) => v);

      const exportData = sortedLogs.map(log => {
        const applicantType = log.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');
        const addressParts = parseAddressParts(log.addressRoad || log.address || '');
        const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

        return {
          '접수번호': log.receptionNumber || '-',
          '접수일자': log.date || '-',
          '법인여부': applicantType,
          '생년월일/법인번호': birthOrCorp,
          '성명': sanitizeCell(log.name || '-'),
          '연락처': log.phoneNumber || '-',
          '우편번호': log.addressPostcode || '-',
          '시도': addressParts.sido || '-',
          '시군구': addressParts.sigungu || '-',
          '읍면동': addressParts.eupmyeondong || '-',
          '나머지주소': sanitizeCell((addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-'),
          '전체주소': sanitizeCell(fullAddress),
          '구분': log.subCategory || '-',
          '목적': log.purpose || '-',
          '생산자 성명': sanitizeCell(log.producerName || '-'),
          '생산지 주소': sanitizeCell(log.producerAddress || '-'),
          '의뢰물품명': sanitizeCell(log.requestContent || '-'),
          '수령방법': log.receptionMethod || '-',
          '비고': sanitizeCell(log.note || '-'),
          '완료여부': log.completed ? '완료' : '미완료',
          '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-',
        };
      });

      const XLSX = (window as any).XLSX;
      if (!XLSX) { this.showToast('XLSX 라이브러리가 로드되지 않았습니다.', 'error'); return; }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 15 },
        { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
        { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 40 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 30 },
        { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, '잔류농약 접수목록');

      const fileName = `잔류농약_접수목록_${new Date().toISOString().split('T')[0]}.xlsx`;

      if ((window as any).isElectron && (this as any).FileAPI?.saveExcel) {
        const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        (this as any).FileAPI.saveExcel(xlsxData, fileName).then((saved: boolean) => {
          if (saved) this.showToast('엑셀 파일로 내보내기 완료', 'success');
        });
      } else {
        XLSX.writeFile(wb, fileName);
        this.showToast('엑셀 파일이 저장되었습니다.', 'success');
      }
    });
  }

  /**
   * 엑셀 가져오기
   */
  setupExcelImport(): void {
    const ExcelImportManager = (window as any).ExcelImportManager;
    if (!ExcelImportManager) return;

    const excelImporter = new ExcelImportManager({
      appFields: [
        { key: 'receptionNumber', label: '접수번호' },
        { key: 'date', label: '접수일자' },
        { key: 'name', label: '성명' },
        { key: 'phoneNumber', label: '전화번호' },
        { key: 'address', label: '주소' },
        { key: 'subCategory', label: '구분' },
        { key: 'purpose', label: '목적' },
        { key: 'producerName', label: '생산자 성명' },
        { key: 'producerAddress', label: '생산지 주소' },
        { key: 'requestContent', label: '의뢰물품명' },
        { key: 'receptionMethod', label: '수령방법' },
        { key: 'note', label: '비고' },
      ],
      autoMapRules: {
        '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
        '접수일자': 'date', '날짜': 'date', '일자': 'date',
        '성명': 'name', '이름': 'name', '신청인': 'name',
        '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber', '휴대폰': 'phoneNumber',
        '주소': 'address', '신청인주소': 'address',
        '구분': 'subCategory', '구분명': 'subCategory',
        '목적': 'purpose', '용도': 'purpose', '검사목적': 'purpose',
        '생산자': 'producerName', '생산자성명': 'producerName', '생산자 성명': 'producerName',
        '생산지주소': 'producerAddress', '생산지': 'producerAddress', '생산지 주소': 'producerAddress',
        '의뢰물품명': 'requestContent', '작물명': 'requestContent', '물품명': 'requestContent',
        '수령방법': 'receptionMethod', '통보방법': 'receptionMethod', '수령 방법': 'receptionMethod',
        '비고': 'note', '메모': 'note', '참고': 'note',
      },
      templateConfig: {
        headers: ['접수번호', '구분', '목적', '성명', '생산자 성명', '생산지 주소', '의뢰물품명', '비고'],
        sampleRow: ['1', '농산물', '자가검정', '홍길동', '홍길동', '봉화읍 내성리 123', '사과', ''],
        colWidths: [
          { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
        ],
        sheetName: '잔류농약시료',
        fileName: '잔류농약_가져오기_서식',
      },
      previewColumns: [
        { key: 'receptionNumber', label: '접수번호' },
        { key: 'date', label: '접수일자' },
        { key: 'name', label: '성명' },
        { key: 'subCategory', label: '구분' },
        { key: 'producerName', label: '생산자 성명' },
        { key: 'producerAddress', label: '생산지 주소' },
        { key: 'requestContent', label: '의뢰물품명' },
        { key: 'note', label: '비고' },
      ],
      getCommonData: () => ({
        date: (document.getElementById('importDate') as HTMLInputElement | null)?.value || new Date().toISOString().slice(0, 10),
        name: (document.getElementById('importName') as HTMLInputElement | null)?.value.trim() || '',
        phone: (document.getElementById('importPhone') as HTMLInputElement | null)?.value.trim() || '',
        address: (document.getElementById('importAddress') as HTMLInputElement | null)?.value.trim() || '',
        method: (document.getElementById('importMethod') as HTMLSelectElement | null)?.value || '',
        purpose: (document.getElementById('importPurpose') as HTMLSelectElement | null)?.value || '',
        now: new Date().toISOString(),
      }),
      buildRecord: (getVal: (key: string) => string, parseExcelDate: (val: string) => string, common: Record<string, string>): PesticideSampleData => {
        const receptionNumber = getVal('receptionNumber') || '';
        const date = parseExcelDate(getVal('date')) || common.date;
        const name = getVal('name') || common.name;
        const phoneNumber = getVal('phoneNumber') || common.phone;
        const address = getVal('address') || common.address;
        const subCategory = getVal('subCategory') || '';
        const purpose = getVal('purpose') || common.purpose;
        const producerName = getVal('producerName') || '';
        const producerAddress = getVal('producerAddress') || '';
        const requestContent = getVal('requestContent') || '';
        const receptionMethod = getVal('receptionMethod') || common.method;
        const note = getVal('note') || '';

        return {
          id: crypto.randomUUID(),
          receptionNumber, date,
          applicantType: '개인',
          birthDate: '', corpNumber: '',
          name, phoneNumber, address,
          addressPostcode: '', addressRoad: address, addressDetail: '',
          subCategory, purpose,
          producerName, producerAddress, requestContent,
          receptionMethod, note,
          completed: false,
          createdAt: common.now, updatedAt: common.now,
        };
      },
      skipRowCheck: (record: PesticideSampleData, rowIdx: number) => {
        if (!record.name && !record.producerName && !record.requestContent) {
          return `행 ${rowIdx + 2}: 성명, 생산자, 의뢰물품명이 모두 비어 있어 건너뜁니다.`;
        }
        return null;
      },
      onImportComplete: (records: PesticideSampleData[]) => {
        records.forEach(r => this.sampleLogs.push(r));
        this.sampleLogs.sort((a, b) => {
          const numA = parseInt(String(a.receptionNumber).replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.receptionNumber).replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
        this.saveLogs();
        this.filterAndRenderLogs();
      },
    });
    excelImporter.init();
  }

  /**
   * 라벨 인쇄
   */
  openLabelPrintWithData(logs: PesticideSampleData[]): void {
    const labelData = logs.map(log => {
      const address = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ')
        || (log.address?.replace(/^\(\d{5}\)\s*/, '') || '');
      const postalCode = log.addressPostcode || (log.address?.match(/^\((\d{5})\)/)?.[1] ?? '');
      return { name: log.name || '', address, postalCode };
    });

    const uniqueMap = new Map<string, { name: string; address: string; postalCode: string }>();
    labelData.forEach(item => {
      const key = `${item.address}|${item.postalCode}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });
    const uniqueLabelData = Array.from(uniqueMap.values());

    const duplicateCount = labelData.length - uniqueLabelData.length;
    if (duplicateCount > 0) {
      this.showToast(`주소 중복 ${duplicateCount}건 제거됨 (총 ${uniqueLabelData.length}건)`, 'info');
    }

    localStorage.setItem('labelPrintData', JSON.stringify(uniqueLabelData));
    window.location.href = '../label-print/index.html';
  }

  /**
   * 라벨 인쇄 버튼 이벤트 설정
   */
  setupLabelPrint(): void {
    const btnLabelPrint = document.getElementById('btnLabelPrint');
    if (!btnLabelPrint) return;

    btnLabelPrint.addEventListener('click', () => {
      const selectedIds = Array.from(
        document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')
      ).map(cb => cb.dataset.id).filter(Boolean) as string[];

      if (selectedIds.length === 0) {
        if (this.sampleLogs.length === 0) {
          this.showToast('인쇄할 데이터가 없습니다.', 'warning');
          return;
        }
        if (!confirm(`선택된 항목이 없습니다.\n전체 ${this.sampleLogs.length}건을 라벨 인쇄하시겠습니까?`)) return;
        this.openLabelPrintWithData(this.sampleLogs);
      } else {
        const selectedLogs = this.sampleLogs.filter(log => selectedIds.includes(log.id));
        this.openLabelPrintWithData(selectedLogs);
      }
    });
  }

  constructor() {
    super({
      moduleKey: 'pesticide',
      moduleName: '잔류농약',
      storageKey: 'pesticideSampleLogs',
      debug: window.DEBUG || false
    });
  }

  /**
   * DOM 요소 캐싱 오버라이드 - Pesticide 모듈용 ID 사용
   */
  cacheElements(): void {
    this.form = document.getElementById('sampleForm') as HTMLFormElement | null;
    this.tableBody = document.getElementById('logTableBody');
    this.emptyState = document.getElementById('emptyState');
    this.recordCountEl = document.getElementById('recordCount');

    this.log('✅ cacheElements - tableBody:', !!this.tableBody);
  }

  /**
   * 테이블 행 생성 (잔류농약 전용)
   * @param log - 시료 데이터
   * @returns 테이블 행
   */
  createTableRow(log: PesticideSampleData): HTMLElement {
    const row = document.createElement('tr');

    // 완료 여부에 따른 스타일
    if (log.completed) {
      row.classList.add('row-completed');
    }

    row.dataset.id = log.id;

    // 법인 여부 확인
    const applicantType = log.applicantType || '개인';
    const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

    // 주소: addressRoad 우선, 없으면 address 폴백 + addressDetail 추가
    const zipcode = log.addressPostcode || (log.address?.match(/^\((\d{5})\)/)?.[1] ?? '');
    const addressOnly = log.addressRoad
        ? [log.addressRoad, log.addressDetail].filter(Boolean).join(' ')
        : (log.address?.replace(/^\(\d{5}\)\s*/, '') || '');

    // XSS 방지: 사용자 입력 데이터 이스케이프
    const escapeHTML = (window as any).escapeHTML || ((str: string | undefined | null) => String(str || '').replace(/[&<>"']/g, (m: string) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    } as Record<string, string>)[m] || m));

    const safeName = escapeHTML(log.name || '-');
    const safeAddress = escapeHTML(addressOnly || '-');
    const safeProducerName = escapeHTML(log.producerName || '-');
    // 생산지 주소: 경상북도 제거 후 표시
    const producerAddrWithoutSido = (log.producerAddress || '-').replace(/^경상북도\s*/, '');
    const safeProducerAddress = escapeHTML(producerAddrWithoutSido);
    const safeRequestContent = escapeHTML(log.requestContent || '-');
    const safePhone = escapeHTML(log.phoneNumber || '-');
    const safeNote = escapeHTML(log.note || '-');

    // 1. Checkbox column
    const tdCheckbox = document.createElement('td');
    tdCheckbox.className = 'col-checkbox';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'row-checkbox';
    checkbox.dataset.id = log.id;
    tdCheckbox.appendChild(checkbox);
    row.appendChild(tdCheckbox);

    // 2. 완료 표시
    const tdComplete = document.createElement('td');
    tdComplete.className = 'col-complete';
    const btnComplete = document.createElement('button');
    btnComplete.className = `btn-complete ${log.completed ? 'completed' : ''}`;
    btnComplete.dataset.id = log.id;
    btnComplete.title = log.completed ? '완료 취소' : '완료';
    btnComplete.textContent = log.completed ? '✔' : '';
    tdComplete.appendChild(btnComplete);
    row.appendChild(tdComplete);

    // 3. 판정 (검사 결과)
    const tdResult = document.createElement('td');
    tdResult.className = 'col-result';
    const btnResult = document.createElement('button');
    btnResult.className = 'btn-result';
    if (log.testResult === 'pass') {
      btnResult.classList.add('pass');
      btnResult.textContent = '불검출';
      btnResult.title = '불검출';
    } else if (log.testResult === 'fail') {
      btnResult.classList.add('fail');
      btnResult.textContent = '검출';
      btnResult.title = '검출';
    } else {
      btnResult.textContent = '-';
      btnResult.title = '미판정 (클릭하여 변경)';
    }
    btnResult.dataset.id = log.id;
    tdResult.appendChild(btnResult);
    row.appendChild(tdResult);

    // 4. 접수번호
    const tdNumber = document.createElement('td');
    tdNumber.textContent = log.receptionNumber || '-';
    row.appendChild(tdNumber);

    // 5. 접수일자
    const tdDate = document.createElement('td');
    tdDate.textContent = log.date || '-';
    row.appendChild(tdDate);

    // 6. 법인여부 (hidden)
    const tdApplicantType = document.createElement('td');
    tdApplicantType.className = 'col-applicant-type col-hidden';
    tdApplicantType.textContent = applicantType;
    row.appendChild(tdApplicantType);

    // 7. 생년월일/법인번호 (hidden)
    const tdBirthCorp = document.createElement('td');
    tdBirthCorp.className = 'col-birth-corp col-hidden';
    tdBirthCorp.textContent = birthOrCorp;
    row.appendChild(tdBirthCorp);

    // 8. 세부카테고리
    const tdSubCategory = document.createElement('td');
    tdSubCategory.textContent = log.subCategory || '-';
    row.appendChild(tdSubCategory);

    // 9. 목적
    const tdPurpose = document.createElement('td');
    tdPurpose.textContent = log.purpose || '-';
    row.appendChild(tdPurpose);

    // 10. 성명 (가운데 정렬)
    const tdName = document.createElement('td');
    tdName.className = 'col-name';
    tdName.textContent = safeName;
    tdName.style.textAlign = 'center';  // 가운데 정렬
    row.appendChild(tdName);

    // 11. 우편번호 (hidden)
    const tdZipcode = document.createElement('td');
    tdZipcode.className = 'col-zipcode col-hidden';
    tdZipcode.textContent = zipcode || '-';
    row.appendChild(tdZipcode);

    // 12. 주소
    const tdAddress = document.createElement('td');
    tdAddress.className = 'text-truncate';
    tdAddress.dataset.tooltip = safeAddress;
    tdAddress.textContent = safeAddress;
    row.appendChild(tdAddress);

    // 13. 생산자명
    const tdProducerName = document.createElement('td');
    tdProducerName.textContent = safeProducerName;
    row.appendChild(tdProducerName);

    // 14. 생산지주소
    const tdProducerAddress = document.createElement('td');
    tdProducerAddress.textContent = safeProducerAddress;
    row.appendChild(tdProducerAddress);

    // 15. 의뢰물품명
    const tdRequestContent = document.createElement('td');
    tdRequestContent.className = 'text-truncate';
    tdRequestContent.dataset.tooltip = safeRequestContent;
    tdRequestContent.textContent = safeRequestContent;
    row.appendChild(tdRequestContent);

    // 16. 연락처
    const tdPhone = document.createElement('td');
    tdPhone.textContent = safePhone;
    row.appendChild(tdPhone);

    // 17. 통보방법
    const tdMethod = document.createElement('td');
    tdMethod.textContent = log.receptionMethod || '-';
    row.appendChild(tdMethod);

    // 18. 비고
    const tdNote = document.createElement('td');
    tdNote.className = 'col-note text-truncate';
    tdNote.dataset.tooltip = safeNote;
    tdNote.textContent = safeNote;
    row.appendChild(tdNote);

    // 19. 관리 (수정/삭제 버튼)
    const tdAction = document.createElement('td');
    tdAction.className = 'col-action';

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'table-actions';

    // 수정 버튼
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.dataset.id = log.id;
    editBtn.textContent = '수정';
    editBtn.onclick = () => this.editSample(log.id);

    // 삭제 버튼
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.dataset.id = log.id;
    deleteBtn.textContent = '삭제';
    deleteBtn.onclick = () => {
      if (confirm('이 항목을 삭제하시겠습니까?')) {
        this.deleteSample(log.id);
      }
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    tdAction.appendChild(actionsDiv);
    row.appendChild(tdAction);

    return row;
  }

  /**
   * 폼 데이터 가져오기
   * @returns 폼 데이터
   */
  getFormData(): Partial<PesticideSampleData> {
    if (!this.form) {
      return {};
    }

    const formData = new FormData(this.form);
    const applicantType = (formData.get('applicantType') as string) || '개인';

    return {
      date: formData.get('date') as string,
      applicantType: applicantType as '개인' | '법인',
      birthDate: applicantType === '개인' ? (formData.get('birthDate') as string) : '',
      corpNumber: applicantType === '법인' ? (formData.get('corpNumber') as string) : '',
      name: formData.get('name') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      address: formData.get('address') as string,
      addressPostcode: (formData.get('addressPostcode') as string) || '',
      addressRoad: (formData.get('addressRoad') as string) || '',
      addressDetail: (formData.get('addressDetail') as string) || '',
      subCategory: (formData.get('subCategory') as string) || '-',
      purpose: formData.get('purpose') as string,
      receptionMethod: (formData.get('receptionMethod') as string) || '-',
      note: (formData.get('note') as string) || '',
      producerName: (formData.get('producerName') as string) || '',
      producerAddress: (formData.get('producerAddress') as string) || '',
      requestContent: (formData.get('requestContent') as string) || '',
      receptionNumber: formData.get('receptionNumber') as string,
      completed: false,
      testResult: null
    };
  }

  /**
   * 폼에 데이터 채우기 (편집용)
   * @param log - 시료 데이터
   */
  populateForm(log: PesticideSampleData): void {
    // 신청인 유형 설정
    const applicantType = log.applicantType || '개인';
    const applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
    if (applicantTypeSelect) {
      applicantTypeSelect.value = applicantType;
      // 법인/개인 필드 표시/숨김 처리
      const birthDateField = document.getElementById('birthDateField');
      const corpNumberField = document.getElementById('corpNumberField');
      if (applicantType === '법인') {
        if (birthDateField) birthDateField.classList.add('hidden');
        if (corpNumberField) corpNumberField.classList.remove('hidden');
      } else {
        if (birthDateField) birthDateField.classList.remove('hidden');
        if (corpNumberField) corpNumberField.classList.add('hidden');
      }
    }

    // 기본 필드
    this.setInputValue('receptionNumber', log.receptionNumber);
    this.setInputValue('date', log.date);
    this.setInputValue('birthDate', log.birthDate);
    this.setInputValue('corpNumber', log.corpNumber);
    this.setInputValue('name', log.name);
    this.setInputValue('phoneNumber', log.phoneNumber);
    this.setInputValue('address', log.address);
    this.setInputValue('addressPostcode', log.addressPostcode);
    this.setInputValue('addressRoad', log.addressRoad);
    this.setInputValue('addressDetail', log.addressDetail);
    // 레거시 데이터 폴백: addressRoad가 없으면 address 파싱
    if (!log.addressRoad && log.address) {
      const m = log.address.match(/^\((\d{5})\)\s*(.+)$/);
      if (m) {
        const pcEl = document.getElementById('addressPostcode') as HTMLInputElement | null;
        const rdEl = document.getElementById('addressRoad') as HTMLInputElement | null;
        if (pcEl && !pcEl.value) pcEl.value = m[1];
        if (rdEl) rdEl.value = m[2];
      } else {
        const rdEl = document.getElementById('addressRoad') as HTMLInputElement | null;
        if (rdEl) rdEl.value = log.address;
      }
    }
    this.setInputValue('subCategory', log.subCategory);
    this.setInputValue('purpose', log.purpose);
    this.setInputValue('receptionMethod', log.receptionMethod);
    this.setInputValue('note', log.note);
    this.setInputValue('producerName', log.producerName);
    this.setInputValue('producerAddress', log.producerAddress);
    this.setInputValue('requestContent', log.requestContent);
  }

  /**
   * 입력 필드 값 설정 헬퍼
   */
  setInputValue(id: string, value: string | undefined | null): void {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (element) {
      element.value = value || '';
    }
  }

  /**
   * 폼 초기화
   */
  resetForm(): void {
    if (this.form) {
      this.form.reset();
    }

    // 날짜를 오늘로 설정
    const dateInput = document.getElementById('date') as HTMLInputElement | null;
    if (dateInput) {
      dateInput.valueAsDate = new Date();
    }

    // 주소 필드 초기화
    this.setInputValue('addressPostcode', '');
    this.setInputValue('addressRoad', '');
    this.setInputValue('addressDetail', '');

    // 법인/개인 필드 초기화
    const birthDateField = document.getElementById('birthDateField');
    const corpNumberField = document.getElementById('corpNumberField');
    if (birthDateField) birthDateField.classList.remove('hidden');
    if (corpNumberField) corpNumberField.classList.add('hidden');

    // 다음 접수번호 설정
    const nextNumber = this.generateNextReceptionNumber();
    this.setInputValue('receptionNumber', nextNumber);

    this.editingId = null;
  }

  /**
   * 폼 제출
   */
  async submitForm(): Promise<void> {
    const formData = this.getFormData();

    // 유효성 검사
    if (!formData.receptionNumber) {
      this.showToast('접수번호를 입력하세요.', 'error');
      return;
    }

    if (!formData.name) {
      this.showToast('성명을 입력하세요.', 'error');
      return;
    }

    // 편집 모드
    if (this.editingId) {
      const existingLog = this.sampleLogs.find(l => String(l.id) === this.editingId);
      if (existingLog) {
        Object.assign(existingLog, formData, {
          id: existingLog.id,
          updatedAt: new Date().toISOString()
        });
        await this.saveLogs();
        this.showToast('수정되었습니다.', 'success');
        this.resetForm();
        this.switchView('list');
      }
      return;
    }

    // 새로 추가
    const newLog: PesticideSampleData = {
      ...(formData as PesticideSampleData),
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sampleLogs.push(newLog);
    await this.saveLogs();

    this.showToast('등록되었습니다.', 'success');
    this.resetForm();
    this.switchView('list');
  }

  /**
   * 샘플 편집
   */
  editSample(id: string): void {
    const log = this.sampleLogs.find(l => String(l.id) === id);
    if (!log) return;

    this.populateForm(log);
    this.editingId = String(id);
    this.switchView('register');
  }

  /**
   * 샘플 삭제 (base class override)
   */
  override async deleteSample(id: string): Promise<void> {
    // Call parent class implementation
    await super.deleteSample(id);
  }

  /**
   * 로그 렌더링 (잔류농약 테이블)
   */
  renderLogs(logs: PesticideSampleData[]): void {
    this.log('✅ renderLogs 호출, logs:', logs ? logs.length : 0, '건');

    if (!this.tableBody) {
      (window.logger?.error || console.error)(`[${this.moduleName}] tableBody가 없음!`);
      return;
    }

    // 빈 상태 처리
    if (!logs || logs.length === 0) {
      this.tableBody.innerHTML = '';
      if (this.emptyState) {
        this.emptyState.classList.remove('hidden');
      }
      this.updateRecordCount();
      return;
    }

    if (this.emptyState) {
      this.emptyState.classList.add('hidden');
    }

    // 접수번호 기준 오름차순 정렬
    const sortedLogs = [...logs].sort((a, b) => {
      const numA = parseInt(a.receptionNumber || '0', 10) || 0;
      const numB = parseInt(b.receptionNumber || '0', 10) || 0;
      return numA - numB;
    });

    // 테이블 렌더링
    this.tableBody.innerHTML = '';
    sortedLogs.forEach(log => {
      const row = this.createTableRow(log);
      this.tableBody!.appendChild(row);
    });

    this.updateRecordCount();
  }

  /**
   * 다음 접수번호 생성
   */
  generateNextReceptionNumber(): string {
    let maxNumber = 0;

    this.sampleLogs.forEach(log => {
      if (log.receptionNumber) {
        const num = parseInt(log.receptionNumber, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    return String(maxNumber + 1);
  }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && (module as any).exports) {
  (module as any).exports = PesticideSampleManager;
} else {
  (window as any).PesticideSampleManager = PesticideSampleManager;
}

export default PesticideSampleManager;
