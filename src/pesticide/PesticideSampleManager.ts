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
    // 잔류농약 특화 이벤트는 별도 설정 필요 없음
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

    // 주소 파싱
    const addressFull = log.address || '';
    const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
    const zipcode = log.addressPostcode || (zipMatch ? zipMatch[1] : '');
    const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

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
      console.error(`[${this.moduleName}] tableBody가 없음!`);
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
