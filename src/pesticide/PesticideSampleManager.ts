// ========================================
// Pesticide Sample Manager
// 잔류농약 시료 관리 클래스
// ========================================

import type { PesticideSample } from '../types/sample-types';
import { BaseSampleManager } from '../shared/BaseSampleManager';

// Global declarations for runtime globals
declare var SIDO_PATTERN: RegExp;
declare var SampleUtils: any;
declare var XLSX: any;
declare function escapeHTML(str: string): string;
declare function sanitizeHTML(str: string): string;
declare function parseAddressParts(address: string): { sido: string; sigungu: string; eupmyeondong: string; rest: string };
declare function sanitizeExcelData(data: Record<string, unknown>[]): Record<string, unknown>[];

/**
 * Pesticide test result type
 */
type PesticideResult = 'pass' | 'fail' | null;

/**
 * Pesticide detection data (single detected pesticide)
 */
interface PesticideDetectionData {
  equipment: string;
  name: string;
  engName: string;
  origRaw: string;
  origDil: string;
  origVal: string;
  acidRaw: string;
  acidDil: string;
  acidVal: string;
  value: string;
  // Legacy fields for backward compatibility
  method?: string;
  rawValue?: string;
  dilution?: string;
}

/**
 * Pesticide test result data for a single sample
 */
interface PesticideTestResultData {
  id: string;
  testDate: string;
  judgment: string;
  allNd: boolean;
  detections: PesticideDetectionData[];
  updatedAt: string;
}

/**
 * Pesticide sample data with internal fields
 */
interface PesticideSampleData {
  id: string;
  groupId?: string;
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
  testItems?: string[];
  completed?: boolean;
  isComplete?: boolean;
  testResult?: PesticideResult;
  createdAt?: string;
  updatedAt?: string;
  mailDate?: string;
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

  // Pesticide-specific DOM refs
  private addressPostcodeEl: HTMLInputElement | null = null;
  private addressRoadEl: HTMLInputElement | null = null;
  private addressDetailEl: HTMLInputElement | null = null;
  private addressHiddenEl: HTMLInputElement | null = null;
  private addressManager: unknown = null;
  private applicantTypeSelect: HTMLSelectElement | null = null;
  private birthDateField: HTMLElement | null = null;
  private corpNumberField: HTMLElement | null = null;
  private birthDateInput: HTMLInputElement | null = null;
  private corpNumberInput: HTMLInputElement | null = null;
  private requestItemsList: HTMLElement | null = null;
  private selectAllCheckbox: HTMLInputElement | null = null;
  private isFullView: boolean = false;
  private itemsPerPageSelect: HTMLSelectElement | null = null;
  private firstPageBtn: HTMLElement | null = null;
  private prevPageBtn: HTMLElement | null = null;
  private nextPageBtn: HTMLElement | null = null;
  private lastPageBtn: HTMLElement | null = null;
  private navResetBtn: HTMLElement | null = null;
  private navSubmitBtn: HTMLElement | null = null;
  private registrationResultModal: HTMLElement | null = null;
  private autoSaveFileHandle: FileSystemFileHandle | null = null;
  private pendingMailDateIds: string[] = [];
  private currentRegistrationData: PesticideSampleData | null = null;
  private requestItemCounter: number = 1;
  private currentFlatRows: PesticideSampleData[] = [];

  // 그룹 묶음 수정용 (같은 접수로 만든 N개 행 추적)
  private editingGroupIds: string[] = [];

  // Additional DOM refs for pagination/rendering/form
  private dateInput: HTMLInputElement | null = null;
  private receptionNumberInput: HTMLInputElement | null = null;
  private receptionMethodBtns: NodeListOf<HTMLElement> | null = null;
  private receptionMethodInput: HTMLInputElement | null = null;
  private paginationContainer: HTMLElement | null = null;
  private paginationInfo: HTMLElement | null = null;
  private pageNumbersContainer: HTMLElement | null = null;
  private resultTableBody: HTMLElement | null = null;
  private parcelsContainer: HTMLElement | null = null;
  private parcels: unknown[] = [];
  private parcelIdCounter: number = 0;

  // Pesticide analysis modal state
  private _paLogId: string | null = null;
  private _paAllNd: boolean = false;
  private _cachedPesticideResults: Record<string, PesticideTestResultData> | null = null;

  private currentRegionSelection: {
    result: { villageName: string; locations: { fullAddress: string; region: string; district: string }[]; lotNumber?: string };
    parcelId: string;
    inputElement: HTMLInputElement;
  } | null = null;
  private producerAddressInput: HTMLInputElement | null = null;
  private producerAddressAutocomplete: HTMLElement | null = null;

  /**
   * 타입별 추가 이벤트 설정 (잔류농약 전용)
   * Original JS: lines 2167-2955
   */
  protected override setupTypeSpecificEvents(): void {
    // Cache pesticide-specific DOM elements
    this.addressPostcodeEl = document.getElementById('addressPostcode') as HTMLInputElement | null;
    this.addressRoadEl = document.getElementById('addressRoad') as HTMLInputElement | null;
    this.addressDetailEl = document.getElementById('addressDetail') as HTMLInputElement | null;
    this.addressHiddenEl = document.getElementById('address') as HTMLInputElement | null;
    this.applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
    this.birthDateField = document.getElementById('birthDateField');
    this.corpNumberField = document.getElementById('corpNumberField');
    this.birthDateInput = document.getElementById('birthDate') as HTMLInputElement | null;
    this.corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement | null;
    this.requestItemsList = document.getElementById('requestItemsList');
    this.producerAddressInput = document.getElementById('producerAddress') as HTMLInputElement | null;
    this.producerAddressAutocomplete = document.getElementById('producerAddressAutocomplete');
    this.selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement | null;
    this.itemsPerPageSelect = document.getElementById('itemsPerPage') as HTMLSelectElement | null;
    this.firstPageBtn = document.getElementById('firstPage');
    this.prevPageBtn = document.getElementById('prevPage');
    this.nextPageBtn = document.getElementById('nextPage');
    this.lastPageBtn = document.getElementById('lastPage');
    this.navResetBtn = document.getElementById('navResetBtn');
    this.navSubmitBtn = document.getElementById('navSubmitBtn');
    this.registrationResultModal = document.getElementById('registrationResultModal');

    // -- 1. 주소 검색 (AddressManager) --
    const AddressManagerCtor = (window as any).AddressManager;
    if (AddressManagerCtor) {
      this.addressManager = new AddressManagerCtor({
        searchBtn: document.getElementById('searchAddressBtn'),
        postcodeInput: this.addressPostcodeEl,
        roadInput: this.addressRoadEl,
        detailInput: this.addressDetailEl,
        hiddenInput: this.addressHiddenEl,
        modal: document.getElementById('addressModal'),
        closeBtn: document.getElementById('closeAddressModal'),
        container: document.getElementById('daumPostcodeContainer')
      });
    }

    // -- 2. 전화번호 자동 하이픈 --
    const phoneNumberInput = document.getElementById('phoneNumber') as HTMLInputElement | null;
    if (phoneNumberInput && (window as any).SampleUtils?.setupPhoneNumberInput) {
      (window as any).SampleUtils.setupPhoneNumberInput(phoneNumberInput);
    }

    // -- 3. 법인여부 선택 --
    if (this.applicantTypeSelect) {
      this.applicantTypeSelect.addEventListener('change', () => {
        const isCorpSelected = this.applicantTypeSelect!.value === '법인';
        if (isCorpSelected) {
          this.birthDateField?.classList.add('hidden');
          this.corpNumberField?.classList.remove('hidden');
          if (this.birthDateInput) this.birthDateInput.value = '';
        } else {
          this.birthDateField?.classList.remove('hidden');
          this.corpNumberField?.classList.add('hidden');
          if (this.corpNumberInput) this.corpNumberInput.value = '';
        }
      });
    }

    // -- 4. 시료 타입 네비게이션 --
    const sampleTypeBtns = document.querySelectorAll('.type-btn');
    sampleTypeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sampleTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchView('form');
      });
    });

    // -- 5. 빈 상태 "새 시료 접수하기" 버튼 --
    const btnGoForm = document.querySelector('.btn-go-form');
    if (btnGoForm) {
      btnGoForm.addEventListener('click', () => this.switchView('form'));
    }

    // -- 6. 생산지 주소 자동완성 --
    if (typeof (this as any).setupProducerAddressAutocomplete === 'function') {
      (this as any).setupProducerAddressAutocomplete();
    }

    // -- 7. 의뢰 항목 관리 --
    const btnAddRequestItem = document.getElementById('btnAddRequestItem');
    if (btnAddRequestItem) {
      btnAddRequestItem.addEventListener('click', () => {
        if (typeof (this as any).addRequestItem === 'function') {
          (this as any).addRequestItem();
        }
      });
    }

    // 첫 번째 항목 자동완성 초기화
    const firstRequestItem = this.requestItemsList?.querySelector('.request-item') as HTMLElement | null;
    if (firstRequestItem) {
      if (typeof (this as any).initRequestItemAutocomplete === 'function') {
        (this as any).initRequestItemAutocomplete(firstRequestItem);
      }
      const firstRemoveBtn = firstRequestItem.querySelector('.btn-remove-item');
      if (firstRemoveBtn) {
        firstRemoveBtn.addEventListener('click', () => {
          if (this.requestItemsList && this.requestItemsList.querySelectorAll('.request-item').length > 1) {
            firstRequestItem.remove();
            if (typeof (this as any).updateRequestItemNumbers === 'function') {
              (this as any).updateRequestItemNumbers();
            }
            if (typeof (this as any).updateRemoveButtonsVisibility === 'function') {
              (this as any).updateRemoveButtonsVisibility();
            }
          }
        });
      }
    }

    // -- 8. 테이블 이벤트 위임 (완료/판정/삭제/수정) --
    this.tableBody?.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;

      // 완료 버튼
      const completeBtn = target.closest('.btn-complete') as HTMLElement | null;
      if (completeBtn) {
        const id = completeBtn.dataset.id;
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
          const newCompletedStatus = !logItem.isComplete;
          const receptionNumber = logItem.receptionNumber || '';
          const baseNumber = receptionNumber.split('-').slice(0, 2).join('-');

          const relatedLogs = this.sampleLogs.filter(l => {
            const logBaseNumber = (l.receptionNumber || '').split('-').slice(0, 2).join('-');
            return logBaseNumber === baseNumber && baseNumber !== '';
          });

          relatedLogs.forEach(relatedLog => {
            relatedLog.isComplete = newCompletedStatus;
            relatedLog.updatedAt = new Date().toISOString();

            const relatedRows = this.tableBody!.querySelectorAll(`tr[data-id="${relatedLog.id}"]`);
            relatedRows.forEach(relatedRow => {
              const relatedButton = relatedRow.querySelector('.btn-complete') as HTMLElement | null;
              if (relatedButton) {
                if (newCompletedStatus) {
                  relatedRow.classList.add('row-completed');
                  relatedButton.classList.add('completed');
                  relatedButton.textContent = '✔';
                  relatedButton.title = '완료 취소';
                } else {
                  relatedRow.classList.remove('row-completed');
                  relatedButton.classList.remove('completed');
                  relatedButton.textContent = '';
                  relatedButton.title = '완료';
                }
              }
            });
          });

          this.saveLogs();

          const count = relatedLogs.length;
          if (newCompletedStatus) {
            this.showToast(count > 1 ? `${count}개 시료가 완료 처리되었습니다` : '완료 처리되었습니다', 'success');
          } else {
            this.showToast(count > 1 ? `${count}개 시료가 완료 취소되었습니다` : '완료 취소되었습니다', 'success');
          }
        }
      }

      // 판정 버튼
      const resultBtn = target.closest('.btn-result') as HTMLElement | null;
      if (resultBtn) {
        const id = resultBtn.dataset.id;
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
          if (!log.testResult) {
            log.testResult = 'pass';
          } else if (log.testResult === 'pass') {
            log.testResult = 'fail';
          } else {
            log.testResult = null;
          }
          log.updatedAt = new Date().toISOString();
          this.saveLogs();
          this.filterAndRenderLogs();
        }
      }

      // 삭제 버튼 (그룹 일괄 삭제는 deleteSample override에서 처리)
      const deleteBtn = target.closest('.btn-delete') as HTMLElement | null;
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (id) {
          void this.deleteSample(id);
        }
      }

      // 분석결과 입력 버튼
      const analysisBtn = target.closest('.btn-analysis') as HTMLElement | null;
      if (analysisBtn) {
        const id = analysisBtn.dataset.id;
        if (id) {
          this.openPesticideAnalysisModal(id);
        }
      }

      // 수정 버튼
      const editBtn = target.closest('.btn-edit') as HTMLElement | null;
      if (editBtn) {
        const id = editBtn.dataset.id;
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
          if (typeof (this as any).populateFormForEdit === 'function') {
            (this as any).populateFormForEdit(logItem);
          } else {
            this.populateForm(logItem);
            this.editingId = logItem.id;
            this.switchView('form');
          }
        }
      }
    });

    // -- 9. 체크박스 전체 선택 --
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', (e: Event) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const rowCheckboxes = this.tableBody?.querySelectorAll<HTMLInputElement>('.row-checkbox');
        rowCheckboxes?.forEach(checkbox => {
          checkbox.checked = isChecked;
        });
        this.updateSelectedCount();
      });
    }

    this.tableBody?.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('row-checkbox')) {
        this.updateSelectAllState();
        this.updateSelectedCount();
      }
    });

    // -- 10. 성명 클릭 시 같은 이름 일괄 선택 --
    if (this.tableBody) {
      this.tableBody.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const nameCell = target.closest('.col-name') as HTMLElement | null;
        if (nameCell && nameCell.dataset.name) {
          const targetName = nameCell.dataset.name;
          const rowCheckboxes = this.tableBody!.querySelectorAll<HTMLInputElement>('.row-checkbox');
          const targetCheckboxes: HTMLInputElement[] = [];

          rowCheckboxes.forEach(cb => {
            const tr = cb.closest('tr');
            const nc = tr?.querySelector('.col-name') as HTMLElement | null;
            if (nc && nc.dataset.name === targetName) {
              targetCheckboxes.push(cb);
            }
          });

          if (targetCheckboxes.length === 0) return;
          const allChecked = targetCheckboxes.every(cb => cb.checked);
          targetCheckboxes.forEach(cb => { cb.checked = !allChecked; });

          this.updateSelectAllState();
          this.updateSelectedCount();
        }
      });
    }

    (window as any).getSelectedIds = () => this.getSelectedIds();

    // -- 11. 전체 보기/기본 보기 토글 --
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    const logTable = document.getElementById('logTable');
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener('click', () => {
        this.isFullView = !this.isFullView;
        const toggleText = viewToggleBtn.querySelector('.toggle-text');
        const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');

        if (this.isFullView) {
          logTable?.classList.add('full-view');
          if (toggleText) toggleText.textContent = '기본 보기';
          if (toggleIcon) toggleIcon.textContent = '\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F';
          viewToggleBtn.classList.add('active');
        } else {
          logTable?.classList.remove('full-view');
          if (toggleText) toggleText.textContent = '전체 보기';
          if (toggleIcon) toggleIcon.textContent = '\uD83D\uDC41\uFE0F';
          viewToggleBtn.classList.remove('active');
        }
      });
    }

    // -- 12. 검색 모달 --
    const listSearchModal = document.getElementById('listSearchModal');
    const openSearchModalBtn = document.getElementById('openSearchModalBtn');
    const closeSearchModalBtn = document.getElementById('closeSearchModal');
    const searchDateFromInput = document.getElementById('searchDateFromInput') as HTMLInputElement | null;
    const searchDateToInput = document.getElementById('searchDateToInput') as HTMLInputElement | null;
    const searchNameInput = document.getElementById('searchNameInput') as HTMLInputElement | null;
    const searchReceptionFromInput = document.getElementById('searchReceptionFromInput') as HTMLInputElement | null;
    const searchReceptionToInput = document.getElementById('searchReceptionToInput') as HTMLInputElement | null;
    const clearSearchDateBtn = document.getElementById('clearSearchDate');
    const clearSearchReceptionBtn = document.getElementById('clearSearchReception');
    const resetSearchBtn = document.getElementById('resetSearchBtn');
    const applySearchBtn = document.getElementById('applySearchBtn');
    const completedFilter = document.getElementById('completedFilter') as HTMLSelectElement | null;

    if (completedFilter) {
      completedFilter.addEventListener('change', () => {
        this.currentSearchFilter.completed = completedFilter.value as 'all' | 'completed' | 'incomplete';
        this.filterAndRenderLogs();
      });
    }

    if (openSearchModalBtn) {
      openSearchModalBtn.addEventListener('click', () => {
        if (searchDateFromInput) searchDateFromInput.value = this.currentSearchFilter.dateFrom;
        if (searchDateToInput) searchDateToInput.value = this.currentSearchFilter.dateTo;
        if (searchNameInput) searchNameInput.value = this.currentSearchFilter.name;
        if (searchReceptionFromInput) searchReceptionFromInput.value = this.currentSearchFilter.receptionFrom;
        if (searchReceptionToInput) searchReceptionToInput.value = this.currentSearchFilter.receptionTo;
        listSearchModal?.classList.remove('hidden');
        searchNameInput?.focus();
      });
    }

    const closeSearchModal = () => { listSearchModal?.classList.add('hidden'); };

    if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', closeSearchModal);
    if (listSearchModal) listSearchModal.querySelector('.modal-overlay')?.addEventListener('click', closeSearchModal);

    if (clearSearchDateBtn) {
      clearSearchDateBtn.addEventListener('click', () => {
        if (searchDateFromInput) searchDateFromInput.value = '';
        if (searchDateToInput) searchDateToInput.value = '';
      });
    }

    if (clearSearchReceptionBtn) {
      clearSearchReceptionBtn.addEventListener('click', () => {
        if (searchReceptionFromInput) searchReceptionFromInput.value = '';
        if (searchReceptionToInput) searchReceptionToInput.value = '';
      });
    }

    if (resetSearchBtn) {
      resetSearchBtn.addEventListener('click', () => {
        if (searchDateFromInput) searchDateFromInput.value = '';
        if (searchDateToInput) searchDateToInput.value = '';
        if (searchNameInput) searchNameInput.value = '';
        if (searchReceptionFromInput) searchReceptionFromInput.value = '';
        if (searchReceptionToInput) searchReceptionToInput.value = '';
        if (completedFilter) completedFilter.value = 'incomplete';
        this.currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', completed: 'incomplete' };
        this.filterAndRenderLogs();
        closeSearchModal();
      });
    }

    if (applySearchBtn) {
      applySearchBtn.addEventListener('click', () => {
        if (searchDateFromInput) this.currentSearchFilter.dateFrom = searchDateFromInput.value;
        if (searchDateToInput) this.currentSearchFilter.dateTo = searchDateToInput.value;
        if (searchNameInput) this.currentSearchFilter.name = searchNameInput.value.toLowerCase();
        if (searchReceptionFromInput) this.currentSearchFilter.receptionFrom = searchReceptionFromInput.value;
        if (searchReceptionToInput) this.currentSearchFilter.receptionTo = searchReceptionToInput.value;
        this.filterAndRenderLogs();
        closeSearchModal();
      });
    }

    [searchNameInput, searchReceptionFromInput, searchReceptionToInput].forEach(input => {
      if (input) {
        input.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter') applySearchBtn?.click();
        });
      }
    });

    // -- 13. 라벨 인쇄 --
    this.setupLabelPrint();

    // -- 14. 선택 삭제 --
    const btnBulkDelete = document.getElementById('btnBulkDelete');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', () => {
        const selectedIds = this.getSelectedIds();
        if (selectedIds.length === 0) {
          alert('삭제할 항목을 선택해주세요.');
          return;
        }
        if (!confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) {
          return;
        }

        this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
        this.saveLogs();
        this.filterAndRenderLogs();

        if (window.firestoreDb?.isEnabled()) {
          Promise.all(selectedIds.map(id =>
            window.firestoreDb!.delete('pesticide', parseInt(this.selectedYear), id)
          ))
            .then(() => this.log('Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
            .catch((err: unknown) => (window.logger?.error || console.error)('Firebase 일괄 삭제 실패:', err));
        }

        if (this.selectAllCheckbox) {
          this.selectAllCheckbox.checked = false;
          this.selectAllCheckbox.indeterminate = false;
        }

        if (selectedIds.includes(this.editingId || '')) {
          if (typeof (this as any).cancelEditMode === 'function') {
            (this as any).cancelEditMode();
          } else {
            this.editingId = null;
          }
        }

        this.showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
      });
    }

    // -- 15. 우편발송일자 일괄 입력 --
    const btnBulkMailDate = document.getElementById('btnBulkMailDate');
    const mailDateModal = document.getElementById('mailDateModal');
    const closeMailDateModalBtn = document.getElementById('closeMailDateModal');
    const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
    const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');

    const closeMailDateModalFn = () => this.closeMailDateModal();
    if (closeMailDateModalBtn) closeMailDateModalBtn.addEventListener('click', closeMailDateModalFn);
    if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', closeMailDateModalFn);
    if (mailDateModal) {
      mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', closeMailDateModalFn);
    }

    if (confirmMailDateBtn) {
      confirmMailDateBtn.addEventListener('click', () => {
        const mailDateInput = document.getElementById('mailDateInput') as HTMLInputElement | null;
        const inputDate = mailDateInput?.value;
        if (!inputDate) {
          this.showToast('날짜를 선택해주세요.', 'warning');
          return;
        }

        let updatedCount = 0;
        this.sampleLogs = this.sampleLogs.map(log => {
          if (this.pendingMailDateIds.includes(String(log.id))) {
            updatedCount++;
            return { ...log, mailDate: inputDate, updatedAt: new Date().toISOString() };
          }
          return log;
        });

        this.saveLogs();
        this.filterAndRenderLogs();

        if (this.selectAllCheckbox) {
          this.selectAllCheckbox.checked = false;
          this.selectAllCheckbox.indeterminate = false;
        }

        this.closeMailDateModal();
        this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
      });
    }

    if (btnBulkMailDate) {
      btnBulkMailDate.addEventListener('click', () => {
        const selectedIds = this.getSelectedIds();
        if (selectedIds.length === 0) {
          this.showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
          return;
        }
        this.openMailDateModal(selectedIds);
      });
    }

    // -- 16. 통계 모달 --
    const btnStatistics = document.getElementById('btnStatistics');
    const statisticsModal = document.getElementById('statisticsModal');
    const closeStatisticsModalBtn = document.getElementById('closeStatisticsModal');
    const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

    if (btnStatistics) {
      btnStatistics.addEventListener('click', () => {
        if (typeof (this as any).openStatisticsModal === 'function') {
          (this as any).openStatisticsModal();
        }
      });
    }
    if (closeStatisticsModalBtn) {
      closeStatisticsModalBtn.addEventListener('click', () => statisticsModal?.classList.add('hidden'));
    }
    if (closeStatisticsBtn) {
      closeStatisticsBtn.addEventListener('click', () => statisticsModal?.classList.add('hidden'));
    }
    if (statisticsModal) {
      statisticsModal.addEventListener('click', (e: Event) => {
        if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
          statisticsModal.classList.add('hidden');
        }
      });
    }

    // -- 17. 엑셀 내보내기 --
    this.setupExcelExport();

    // -- 18. JSON 저장/불러오기 --
    const SampleUtils = (window as any).SampleUtils;
    const saveJsonBtn = document.getElementById('saveJsonBtn');
    const loadJsonInput = document.getElementById('loadJsonInput') as HTMLInputElement | null;

    if (SampleUtils?.setupJSONSaveHandler) {
      SampleUtils.setupJSONSaveHandler({
        buttonElement: saveJsonBtn,
        sampleType: '잔류농약',
        getData: () => this.sampleLogs,
        FileAPI: (this as any).FileAPI,
        filePrefix: '잔류농약접수대장',
        showToast: (window as any).showToast
      });
    }

    if (SampleUtils?.setupJSONLoadHandler) {
      SampleUtils.setupJSONLoadHandler({
        inputElement: loadJsonInput,
        getData: () => this.sampleLogs,
        setData: (data: PesticideSampleData[]) => { this.sampleLogs = data; },
        saveData: () => this.saveLogs(),
        renderData: () => this.filterAndRenderLogs(),
        showToast: (window as any).showToast,
        deduplicateById: true
      });
    }

    // -- 19. 전체화면 뷰어 --
    const openViewerBtn = document.getElementById('openViewerBtn');
    if (openViewerBtn) {
      openViewerBtn.addEventListener('click', () => {
        const viewerWindow = window.open('viewer.html', 'DataViewer',
          'width=1400,height=800,scrollbars=yes,resizable=yes');
        if (!viewerWindow) {
          alert('팝업이 차단되었습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
        }
      });
    }

    // -- 20. 자동 저장 토글 --
    if (SampleUtils?.setupAutoSaveToggle) {
      SampleUtils.setupAutoSaveToggle({
        moduleKey: 'pesticide',
        FileAPI: (this as any).FileAPI,
        getWebFileHandle: () => this.autoSaveFileHandle,
        setWebFileHandle: (handle: FileSystemFileHandle | null) => { this.autoSaveFileHandle = handle; },
        autoSaveCallback: () => {
          if (typeof (this as any).autoSaveToFile === 'function') {
            (this as any).autoSaveToFile();
          }
        },
        showToast: (window as any).showToast,
        log: (...args: unknown[]) => this.log(...args)
      });
    }

    // 자동 저장 폴더/파일 선택 버튼 설정
    if (SampleUtils?.setupAutoSaveFolderButton) {
      SampleUtils.setupAutoSaveFolderButton({
        moduleKey: 'pesticide',
        FileAPI: (this as any).FileAPI,
        selectedYear: this.selectedYear,
        getWebFileHandle: () => this.autoSaveFileHandle,
        setWebFileHandle: (handle: FileSystemFileHandle | null) => { this.autoSaveFileHandle = handle; },
        autoSaveCallback: () => {
          if (typeof (this as any).autoSaveToFile === 'function') {
            (this as any).autoSaveToFile();
          }
        },
        showToast: (window as any).showToast
      });
    }

    // 페이지 로드 시 자동 저장 상태 복원
    const autoSaveEnabled = localStorage.getItem('pesticideAutoSaveEnabled') === 'true';
    this.log('자동저장 상태 확인:', { autoSaveEnabled, isElectron: (window as any).isElectron, autoSavePath: (this as any).FileAPI?.autoSavePath });
    if (autoSaveEnabled && (window as any).isElectron && (this as any).FileAPI?.autoSavePath) {
      this.log('Electron 환경에서 자동저장 활성화');
      if (SampleUtils?.updateAutoSaveStatus) {
        SampleUtils.updateAutoSaveStatus('active');
      }
      if (typeof (this as any).autoSaveToFile === 'function') {
        (this as any).autoSaveToFile();
      }
    }

    // -- 21. 페이지네이션 이벤트 --
    if (this.itemsPerPageSelect) {
      this.itemsPerPageSelect.addEventListener('change', (e: Event) => {
        this.itemsPerPage = parseInt((e.target as HTMLSelectElement).value, 10);
        localStorage.setItem('pesticideItemsPerPage', String(this.itemsPerPage));
        this.currentPage = 1;
        if (typeof (this as any).renderCurrentPage === 'function') {
          (this as any).renderCurrentPage();
        }
      });
    }

    if (this.firstPageBtn) this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
    if (this.prevPageBtn) this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    if (this.nextPageBtn) this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    if (this.lastPageBtn) this.lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));

    // -- 22. 폼 리셋 핸들러 --
    if (this.form) {
      this.form.addEventListener('reset', () => {
        setTimeout(() => {
          if (this.addressPostcodeEl) this.addressPostcodeEl.value = '';
          if (this.addressRoadEl) this.addressRoadEl.value = '';
          if (this.addressDetailEl) this.addressDetailEl.value = '';
          if (this.addressHiddenEl) this.addressHiddenEl.value = '';
        }, 0);
      });
    }

    // -- 23. 네비게이션 바 초기화/접수등록 버튼 --
    if (this.navResetBtn) {
      this.navResetBtn.addEventListener('click', () => {
        const receptionNumberEl = document.getElementById('receptionNumber') as HTMLInputElement | null;
        const dateEl = document.getElementById('date') as HTMLInputElement | null;
        const receptionNumber = receptionNumberEl?.value;
        const date = dateEl?.value;

        this.form?.reset();

        setTimeout(() => {
          if (receptionNumber && receptionNumberEl) {
            receptionNumberEl.value = receptionNumber;
          }
          if (date && dateEl) {
            dateEl.value = date;
          }
        }, 10);
      });
    }

    if (this.navSubmitBtn) {
      this.navSubmitBtn.addEventListener('click', () => {
        this.form?.requestSubmit();
      });
    }

    // -- 24. 등록 결과 모달 이벤트 --
    const closeRegistrationModal = document.getElementById('closeRegistrationModal');
    const closeResultBtn = document.getElementById('closeResultBtn');
    const exportResultBtn = document.getElementById('exportResultBtn');
    const editResultBtn = document.getElementById('editResultBtn');

    if (closeRegistrationModal) {
      closeRegistrationModal.addEventListener('click', () => this.closeRegistrationResultModal());
    }
    if (closeResultBtn) {
      closeResultBtn.addEventListener('click', () => this.closeRegistrationResultModal());
    }
    if (this.registrationResultModal) {
      this.registrationResultModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeRegistrationResultModal());
    }

    if (editResultBtn) {
      editResultBtn.addEventListener('click', () => {
        if (this.currentRegistrationData) {
          const dataToEdit = this.currentRegistrationData;
          this.closeRegistrationResultModal();
          if (typeof (this as any).populateFormForEdit === 'function') {
            (this as any).populateFormForEdit(dataToEdit);
          } else {
            this.populateForm(dataToEdit);
            this.editingId = dataToEdit.id;
            this.switchView('form');
          }
        }
      });
    }

    if (exportResultBtn) {
      exportResultBtn.addEventListener('click', () => {
        if (typeof (this as any).exportRegistrationResult === 'function') {
          (this as any).exportRegistrationResult();
        }
      });
    }

    // -- 25. 지역 선택 모달 이벤트 --
    const regionSelectionModal = document.getElementById('regionSelectionModal');
    const closeRegionModal = document.getElementById('closeRegionModal');
    const cancelRegionSelection = document.getElementById('cancelRegionSelection');

    if (closeRegionModal) {
      closeRegionModal.addEventListener('click', () => this.closeRegionSelectionModal());
    }
    if (cancelRegionSelection) {
      cancelRegionSelection.addEventListener('click', () => this.closeRegionSelectionModal());
    }
    if (regionSelectionModal) {
      const overlay = regionSelectionModal.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeRegionSelectionModal());
      }
    }

    // -- 26. 기존 작물 검색 모달 (기존 코드 호환, 숨김) --
    const cropModal = document.getElementById('cropModal');
    const openCropModalBtn = document.getElementById('openCropModalBtn') as HTMLElement | null;
    const closeCropModalBtn = document.getElementById('closeCropModal');
    const cancelCropBtn = document.getElementById('cancelCropSelection');

    if (typeof CROP_CATEGORIES !== 'undefined') {
      const cropCategoryFilter = document.getElementById('cropCategoryFilter') as HTMLSelectElement | null;
      if (cropCategoryFilter) {
        CROP_CATEGORIES.forEach((cat: string) => {
          if (cat !== '전체') {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            cropCategoryFilter.appendChild(option);
          }
        });
      }
    }

    if (openCropModalBtn) openCropModalBtn.style.display = 'none';

    const closeCropModal = () => { if (cropModal) cropModal.classList.add('hidden'); };
    if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', closeCropModal);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeCropModal);
    if (cropModal) cropModal.querySelector('.modal-overlay')?.addEventListener('click', closeCropModal);

    // -- 27. 엑셀 가져오기 (ExcelImportManager) --
    this.setupExcelImport();

    // -- 28. 분석결과 입력 모달 --
    this.initPesticideAnalysisModal();

    // -- 29. 분석결과 조회 페이지 열기 버튼 --
    const pesticideAnalysisBtn = document.getElementById('pesticideAnalysisBtn');
    if (pesticideAnalysisBtn) {
      pesticideAnalysisBtn.addEventListener('click', () => {
        localStorage.setItem('pesticideAnalysis_year', this.selectedYear);
        const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked'))
          .map(cb => cb.dataset.id).filter(Boolean) as string[];
        localStorage.setItem('pesticideAnalysis_selected_ids', JSON.stringify(selectedIds));

        const isElectron = (window as any).electronAPI?.isElectron === true;
        if (isElectron) {
          (window as any).electronAPI.openPesticideAnalysis();
        } else {
          const popup = window.open('../pesticide-analysis/index.html', '_blank');
          if (!popup) window.location.href = '../pesticide-analysis/index.html';
        }
      });
    }

    // -- 30. Firestore에서 분석 결과 동기화 --
    this.syncPesticideTestResultsFromFirestore();
  }

  // ========================================
  // Helper methods for setupTypeSpecificEvents
  // ========================================

  /**
   * 선택된 행 ID 목록 반환
   */
  private getSelectedIds(): string[] {
    if (!this.tableBody) return [];
    const checkedBoxes = this.tableBody.querySelectorAll<HTMLInputElement>('.row-checkbox:checked');
    return Array.from(checkedBoxes).map(cb => cb.dataset.id).filter(Boolean) as string[];
  }

  /**
   * 전체선택 체크박스 상태 업데이트
   */
  private updateSelectAllState(): void {
    if (!this.selectAllCheckbox || !this.tableBody) return;
    const rowCheckboxes = this.tableBody.querySelectorAll<HTMLInputElement>('.row-checkbox');
    if (rowCheckboxes.length === 0) {
      this.selectAllCheckbox.checked = false;
      this.selectAllCheckbox.indeterminate = false;
      return;
    }
    const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
    const someChecked = Array.from(rowCheckboxes).some(cb => cb.checked);
    this.selectAllCheckbox.checked = allChecked;
    this.selectAllCheckbox.indeterminate = someChecked && !allChecked;
  }

  /**
   * 선택된 개수 업데이트
   */
  private updateSelectedCount(): void {
    const selectedIds = this.getSelectedIds();
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
      countEl.textContent = selectedIds.length > 0 ? `${selectedIds.length}건 선택` : '';
    }
  }

  /**
   * 우편발송일자 모달 열기
   */
  private openMailDateModal(ids: string[]): void {
    this.pendingMailDateIds = ids;
    const mailDateModal = document.getElementById('mailDateModal');
    const mailDateInput = document.getElementById('mailDateInput') as HTMLInputElement | null;
    if (mailDateModal) {
      mailDateModal.classList.remove('hidden');
      if (mailDateInput) {
        mailDateInput.value = new Date().toISOString().slice(0, 10);
        mailDateInput.focus();
      }
    }
  }

  /**
   * 우편발송일자 모달 닫기
   */
  private closeMailDateModal(): void {
    const mailDateModal = document.getElementById('mailDateModal');
    if (mailDateModal) {
      mailDateModal.classList.add('hidden');
    }
    this.pendingMailDateIds = [];
  }

  /**
   * 등록 결과 모달 닫기
   */
  private closeRegistrationResultModal(): void {
    if (this.registrationResultModal) {
      this.registrationResultModal.classList.add('hidden');
    }
    this.currentRegistrationData = null;
  }

  /**
   * 지역 선택 모달 닫기
   */
  private closeRegionSelectionModal(): void {
    const regionSelectionModal = document.getElementById('regionSelectionModal');
    if (regionSelectionModal) {
      regionSelectionModal.classList.add('hidden');
    }
  }

  // ========================================
  // 의뢰 항목 관리
  // ========================================

  /**
   * 의뢰 항목 추가
   */
  addRequestItem(): void {
    this.requestItemCounter++;
    const index = this.requestItemCounter - 1;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'request-item';
    itemDiv.dataset.index = String(index);

    itemDiv.innerHTML = sanitizeHTML(`
        <div class="request-item-header">
            <span class="item-number">의뢰 ${this.requestItemCounter}</span>
            <button type="button" class="btn-remove-item" title="항목 삭제">✕</button>
        </div>
        <div class="form-row">
            <div class="form-field full-width">
                <label>생산지 주소 <span class="label-hint">* 리+지번 입력 후 Enter</span></label>
                <div class="producer-address-autocomplete-wrapper">
                    <input type="text" class="request-producer-address" name="producerAddress[]" placeholder="예: 문단리 123, 문단리 산 45">
                    <ul class="producer-address-autocomplete-list"></ul>
                </div>
            </div>
        </div>
        <div class="form-row">
            <div class="form-field full-width">
                <label>의뢰물품명(작물명)</label>
                <input type="text" class="request-crop-name" name="requestContent[]" placeholder="예: 사과, 배, 포도 등">
            </div>
        </div>
    `);

    this.requestItemsList?.appendChild(itemDiv);

    const removeBtn = itemDiv.querySelector('.btn-remove-item');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        itemDiv.remove();
        this.updateRequestItemNumbers();
        this.updateRemoveButtonsVisibility();
      });
    }

    this.initRequestItemAutocomplete(itemDiv);
    this.updateRemoveButtonsVisibility();

    itemDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * 의뢰 항목 번호 재정렬
   */
  updateRequestItemNumbers(): void {
    const items = this.requestItemsList?.querySelectorAll('.request-item') || [];
    items.forEach((item, idx) => {
      const numberSpan = item.querySelector('.item-number');
      if (numberSpan) {
        numberSpan.textContent = `의뢰 ${idx + 1}`;
      }
      (item as HTMLElement).dataset.index = String(idx);
    });
    this.requestItemCounter = items.length;
  }

  /**
   * 삭제 버튼 표시/숨김
   */
  updateRemoveButtonsVisibility(): void {
    const items = this.requestItemsList?.querySelectorAll('.request-item') || [];
    items.forEach((item) => {
      const removeBtn = item.querySelector('.btn-remove-item') as HTMLElement | null;
      if (removeBtn) {
        removeBtn.style.display = items.length > 1 ? 'flex' : 'none';
      }
    });
  }

  /**
   * 의뢰 항목별 생산지 주소 자동완성 초기화
   */
  initRequestItemAutocomplete(itemDiv: HTMLElement): void {
    const addressInput = itemDiv.querySelector('.request-producer-address') as HTMLInputElement | null;
    const autocompleteList = itemDiv.querySelector('.producer-address-autocomplete-list') as HTMLElement | null;

    if (!addressInput || !autocompleteList) return;

    addressInput.addEventListener('input', () => {
      const value = addressInput.value.trim();

      if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
        autocompleteList.classList.remove('show');
        return;
      }

      if (value.length > 0 && typeof suggestRegionVillages === 'function') {
        const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin'], true);
        if (suggestions.length > 0) {
          autocompleteList.innerHTML = sanitizeHTML(suggestions.map((item: any) => `
              <li data-village="${item.village}" data-district="${item.district}" data-region-key="${item.regionKey}" data-region="${item.region || ''}" data-is-mountain="${item.isMountain}">
                  ${item.displayText}
              </li>
          `).join(''));
          autocompleteList.classList.add('show');
        } else {
          autocompleteList.classList.remove('show');
        }
      } else {
        autocompleteList.classList.remove('show');
      }
    });

    addressInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = addressInput.value.trim();

        if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
          autocompleteList.classList.remove('show');
          return;
        }

        if (typeof parseParcelAddress === 'function') {
          const result = parseParcelAddress(value);
          if (result) {
            if (result.isDuplicate) {
              this.showProducerRegionSelectionModal(result, addressInput);
            } else {
              addressInput.value = result.fullAddress || '';
              autocompleteList.classList.remove('show');
            }
          }
        }
      }
    });

    autocompleteList.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'LI') {
        const village = target.dataset.village || '';
        const district = target.dataset.district || '';
        const regionKey = target.dataset.regionKey || '';
        const isMountain = target.dataset.isMountain === 'true';

        const LOCAL_REGIONS: Record<string, string> = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
        const villageWithMountain = isMountain ? `${village} 산` : village;
        const region = target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
        const fullAddress = `${region} ${district} ${villageWithMountain}`;
        const currentValue = addressInput.value.trim();
        const match = currentValue.match(/\d+(-\d+)?$/);
        const number = match ? ' ' + match[0] : '';

        addressInput.value = fullAddress + number;
        autocompleteList.classList.remove('show');
      }
    });

    document.addEventListener('click', (e: Event) => {
      const target = e.target as Node;
      if (!addressInput.contains(target) && !autocompleteList.contains(target)) {
        autocompleteList.classList.remove('show');
      }
    });
  }

  // ========================================
  // 생산지 주소 자동완성
  // ========================================

  /**
   * 메인 생산지 주소 자동완성 설정
   */
  setupProducerAddressAutocomplete(): void {
    if (!this.producerAddressInput || !this.producerAddressAutocomplete) return;
    this.log('📍 생산지 주소 자동완성 초기화');

    this.producerAddressInput.addEventListener('input', () => {
      const value = this.producerAddressInput!.value.trim();

      if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
        this.producerAddressAutocomplete!.classList.remove('show');
        return;
      }

      if (value.length > 0 && typeof suggestRegionVillages === 'function') {
        const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin'], true);
        if (suggestions.length > 0) {
          this.producerAddressAutocomplete!.innerHTML = sanitizeHTML(suggestions.map((item: any) => `
              <li data-village="${item.village}" data-district="${item.district}" data-region-key="${item.regionKey}" data-region="${item.region || ''}" data-is-mountain="${item.isMountain}">
                  ${item.displayText}
              </li>
          `).join(''));
          this.producerAddressAutocomplete!.classList.add('show');
        } else {
          this.producerAddressAutocomplete!.classList.remove('show');
        }
      } else {
        this.producerAddressAutocomplete!.classList.remove('show');
      }
    });

    this.producerAddressInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = this.producerAddressInput!.value.trim();

        if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
          this.producerAddressAutocomplete!.classList.remove('show');
          return;
        }

        if (typeof parseParcelAddress === 'function') {
          const result = parseParcelAddress(value);
          if (result) {
            if (result.isDuplicate) {
              this.showProducerRegionSelectionModal(result, this.producerAddressInput!);
            } else if (result.alternatives && result.alternatives.length > 1) {
              this.producerAddressInput!.value = result.fullAddress || '';
              this.producerAddressAutocomplete!.classList.remove('show');
            } else {
              this.producerAddressInput!.value = result.fullAddress || '';
              this.producerAddressAutocomplete!.classList.remove('show');
            }
          }
        }
      }
    });

    this.producerAddressAutocomplete.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'LI') {
        const village = target.dataset.village || '';
        const district = target.dataset.district || '';
        const regionKey = target.dataset.regionKey || '';
        const isMountain = target.dataset.isMountain === 'true';

        const LOCAL_REGIONS: Record<string, string> = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
        const villageWithMountain = isMountain ? `${village} 산` : village;
        const region = target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
        const fullAddress = `${region} ${district} ${villageWithMountain}`;
        const currentValue = this.producerAddressInput!.value.trim();
        const numberMatch = currentValue.match(/\d+(-\d+)?$/);
        const number = numberMatch ? ' ' + numberMatch[0] : '';

        this.producerAddressInput!.value = fullAddress + number;
        this.producerAddressAutocomplete!.classList.remove('show');
      }
    });

    document.addEventListener('click', (e: Event) => {
      const target = e.target as Node;
      if (!this.producerAddressInput!.contains(target) && !this.producerAddressAutocomplete!.contains(target)) {
        this.producerAddressAutocomplete!.classList.remove('show');
      }
    });
  }

  /**
   * 생산지 주소 중복 지역 선택 모달
   */
  showProducerRegionSelectionModal(result: any, inputElement: HTMLInputElement): void {
    const modal = document.getElementById('regionSelectionModal');
    const duplicateVillageName = document.getElementById('duplicateVillageName');
    const regionOptions = document.getElementById('regionOptions');

    if (!modal || !regionOptions) return;

    if (duplicateVillageName) {
      duplicateVillageName.textContent = result.villageName;
    }

    regionOptions.innerHTML = sanitizeHTML(result.locations.map((loc: any) => `
        <button type="button" class="region-option-btn" data-address="${loc.fullAddress}">
            ${loc.region} ${loc.district}
        </button>
    `).join(''));

    regionOptions.querySelectorAll('.region-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const number = result.lotNumber ? ' ' + result.lotNumber : '';
        inputElement.value = (btn as HTMLElement).dataset.address + number;
        modal.classList.add('hidden');
      });
    });

    modal.classList.remove('hidden');
  }

  /**
   * 지역 선택 모달 (필지 주소용)
   */
  showRegionSelectionModal(parseResult: any, parcelId: string, inputElement: HTMLInputElement): void {
    const regionSelectionModal = document.getElementById('regionSelectionModal');
    if (!regionSelectionModal) return;

    this.currentRegionSelection = {
      result: parseResult,
      parcelId,
      inputElement
    };

    const duplicateVillageName = document.getElementById('duplicateVillageName');
    if (duplicateVillageName) {
      duplicateVillageName.textContent = parseResult.villageName;
    }

    const regionOptions = document.getElementById('regionOptions');
    if (regionOptions) {
      regionOptions.innerHTML = sanitizeHTML(parseResult.locations.map((location: any, index: number) => `
          <div class="region-option" data-index="${index}">
              <div class="region-option-content">
                  <div class="region-option-title">${location.fullAddress}</div>
                  <div class="region-option-subtitle">${location.region} ${location.district}</div>
              </div>
              <div class="region-option-icon">→</div>
          </div>
      `).join(''));

      regionOptions.querySelectorAll('.region-option').forEach(option => {
        option.addEventListener('click', () => {
          const index = parseInt((option as HTMLElement).dataset.index || '0', 10);
          this.selectRegion(index);
        });
      });
    }

    regionSelectionModal.classList.remove('hidden');
  }

  /**
   * 지역 선택 처리
   */
  selectRegion(index: number): void {
    if (!this.currentRegionSelection) return;

    const location = this.currentRegionSelection.result.locations[index];
    const lotNumber = this.currentRegionSelection.result.lotNumber;
    const fullAddress = lotNumber ? `${location.fullAddress} ${lotNumber}` : location.fullAddress;

    this.currentRegionSelection.inputElement.value = fullAddress;
    this.closeRegionSelectionModal();
    this.showToast('지역이 선택되었습니다', 'success');
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
          isComplete: false,
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
    super.cacheElements();

    // Override different IDs (pesticide uses logTableBody / emptyState getElementById)
    this.tableBody = document.getElementById('logTableBody');
    this.emptyState = document.getElementById('emptyState');

    // Date input
    this.dateInput = document.getElementById('date') as HTMLInputElement | null;

    // Reception
    this.receptionNumberInput = document.getElementById('receptionNumber') as HTMLInputElement | null;
    this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
    this.receptionMethodInput = document.getElementById('receptionMethod') as HTMLInputElement | null;

    // Pagination elements
    this.paginationContainer = document.getElementById('pagination');
    this.paginationInfo = document.getElementById('paginationInfo');
    this.pageNumbersContainer = document.getElementById('pageNumbers');

    // Producer address
    this.producerAddressInput = document.getElementById('producerAddress') as HTMLInputElement | null;
    this.producerAddressAutocomplete = document.getElementById('producerAddressAutocomplete');

    // Registration result modal
    this.resultTableBody = document.getElementById('resultTableBody');

    // Parcels
    this.parcelsContainer = document.getElementById('parcelsContainer');

    // Items per page init
    this.itemsPerPage = parseInt(localStorage.getItem('pesticideItemsPerPage') || '', 10) || 100;
    if (this.itemsPerPageSelect) {
      this.itemsPerPageSelect.value = String(this.itemsPerPage);
    }

    this.log('cacheElements - tableBody:', !!this.tableBody);
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
      isComplete: false,
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
    if (this.applicantTypeSelect) {
      this.applicantTypeSelect.value = applicantType;
      if (applicantType === '법인') {
        this.birthDateField?.classList.add('hidden');
        this.corpNumberField?.classList.remove('hidden');
      } else {
        this.birthDateField?.classList.remove('hidden');
        this.corpNumberField?.classList.add('hidden');
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
        if (this.addressPostcodeEl && !this.addressPostcodeEl.value) this.addressPostcodeEl.value = m[1];
        if (this.addressRoadEl) this.addressRoadEl.value = m[2];
      } else {
        if (this.addressRoadEl) this.addressRoadEl.value = log.address;
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
   * 폼 편집 모드용 채우기 (JS 917-1019)
   */
  populateFormForEdit(log: PesticideSampleData): void {
    const groupMembers = this.getGroupMembers(log);
    this.editingId = log.id;
    this.editingGroupIds = groupMembers.map(m => String(m.id));

    if (this.receptionNumberInput) {
      const receptionNumbersStr = groupMembers
        .map(m => m.receptionNumber || '')
        .filter(v => v)
        .join(', ');
      this.receptionNumberInput.value = receptionNumbersStr || (log.receptionNumber || '');
    }
    if (this.dateInput) this.dateInput.value = log.date || '';
    this.setInputValue('name', log.name);
    this.setInputValue('phoneNumber', log.phoneNumber);

    // 법인여부/생년월일/법인번호 설정
    const applicantType = log.applicantType || '개인';
    if (this.applicantTypeSelect) {
      this.applicantTypeSelect.value = applicantType;
      if (applicantType === '법인') {
        this.birthDateField?.classList.add('hidden');
        this.corpNumberField?.classList.remove('hidden');
        if (this.corpNumberInput) this.corpNumberInput.value = log.corpNumber || '';
        if (this.birthDateInput) this.birthDateInput.value = '';
      } else {
        this.birthDateField?.classList.remove('hidden');
        this.corpNumberField?.classList.add('hidden');
        if (this.birthDateInput) this.birthDateInput.value = log.birthDate || '';
        if (this.corpNumberInput) this.corpNumberInput.value = '';
      }
    }

    // 주소 필드 처리
    if (this.addressPostcodeEl) this.addressPostcodeEl.value = log.addressPostcode || '';
    if (this.addressRoadEl) this.addressRoadEl.value = log.addressRoad || '';
    if (this.addressDetailEl) this.addressDetailEl.value = log.addressDetail || '';
    if (this.addressHiddenEl) this.addressHiddenEl.value = log.address || '';

    // addressRoad가 없으면 address에서 파싱 (레거시 데이터 호환)
    if (!log.addressRoad && log.address) {
      const addressMatch = log.address.match(/^\((\d{5})\)\s*(.+)$/);
      if (addressMatch) {
        if (this.addressPostcodeEl) this.addressPostcodeEl.value = this.addressPostcodeEl.value || addressMatch[1];
        if (this.addressRoadEl) this.addressRoadEl.value = addressMatch[2];
      } else {
        if (this.addressRoadEl) this.addressRoadEl.value = log.address;
      }
    }

    this.setInputValue('subCategory', log.subCategory);
    this.setInputValue('purpose', log.purpose);

    // 수령 방법 선택
    if (this.receptionMethodBtns) {
      this.receptionMethodBtns.forEach(btn => {
        btn.classList.remove('active');
        if ((btn as HTMLElement).dataset.method === log.receptionMethod) {
          btn.classList.add('active');
        }
      });
    }
    if (this.receptionMethodInput) {
      this.receptionMethodInput.value = log.receptionMethod || '';
    }

    this.setInputValue('note', log.note);
    this.setInputValue('producerName', log.producerName);

    // 의뢰 항목 초기화 후 그룹 멤버 모두 채우기
    this.resetRequestItems();
    const groupMembersForForm: PesticideSampleData[] = (this.editingGroupIds && this.editingGroupIds.length > 1)
      ? this.sampleLogs
          .filter(l => this.editingGroupIds.includes(String(l.id)))
          .sort((a, b) => {
            const na = parseInt(a.receptionNumber || '', 10) || 0;
            const nb = parseInt(b.receptionNumber || '', 10) || 0;
            return na - nb;
          })
      : [log];
    for (let i = 1; i < groupMembersForForm.length; i++) {
      this.addRequestItem();
    }
    const requestItemEls = this.requestItemsList?.querySelectorAll('.request-item') || [];
    groupMembersForForm.forEach((member, idx) => {
      const itemEl = requestItemEls[idx];
      if (!itemEl) return;
      const addressInput = itemEl.querySelector('.request-producer-address') as HTMLInputElement | null;
      const cropInput = itemEl.querySelector('.request-crop-name') as HTMLInputElement | null;
      if (addressInput) addressInput.value = member.producerAddress || '';
      if (cropInput) cropInput.value = member.requestContent || '';
    });

    // 네비게이션 바 버튼 변경
    if (this.navSubmitBtn) {
      this.navSubmitBtn.title = '수정 완료';
      this.navSubmitBtn.classList.add('btn-edit-mode');
    }

    // 시료 접수 화면으로 전환
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('formView')?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.nav-btn[data-view="form"]')?.classList.add('active');

    setTimeout(() => {
      this.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
   * 폼 초기화 (JS 1025-1041)
   */
  resetForm(): void {
    this.editingId = null;
    this.editingGroupIds = [];
    if (this.form) this.form.reset();
    if (this.dateInput) this.dateInput.valueAsDate = new Date();

    // 주소 필드 초기화
    if (this.addressPostcodeEl) this.addressPostcodeEl.value = '';
    if (this.addressRoadEl) this.addressRoadEl.value = '';
    if (this.addressDetailEl) this.addressDetailEl.value = '';
    if (this.addressHiddenEl) this.addressHiddenEl.value = '';

    // 의뢰 항목 초기화
    this.resetRequestItems();

    // 다음 접수번호 자동 생성
    if (this.receptionNumberInput) {
      this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }
  }

  /**
   * 수정 모드 취소 (JS 1043-1077)
   */
  cancelEditMode(): void {
    this.editingId = null;
    this.editingGroupIds = [];

    if (this.navSubmitBtn) {
      this.navSubmitBtn.title = '접수 등록';
      this.navSubmitBtn.classList.remove('btn-edit-mode');
    }

    if (this.form) this.form.reset();
    const subCatSelect = document.getElementById('subCategory') as HTMLSelectElement | null;
    if (subCatSelect) {
      subCatSelect.disabled = false;
      subCatSelect.value = '';
    }
    if (this.dateInput) this.dateInput.valueAsDate = new Date();

    if (this.addressPostcodeEl) this.addressPostcodeEl.value = '';
    if (this.addressRoadEl) this.addressRoadEl.value = '';
    if (this.addressDetailEl) this.addressDetailEl.value = '';
    if (this.addressHiddenEl) this.addressHiddenEl.value = '';

    this.parcels = [];
    this.parcelIdCounter = 0;
    if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';

    this.resetRequestItems();

    if (this.receptionNumberInput) {
      this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }
  }

  /**
   * 폼 제출 (JS 785-904) - multi-item request items 지원
   */
  submitForm(): void {
    if (!this.form) return;
    const formData = new FormData(this.form);

    // 수정 모드 (그룹 멤버 전체 삭제+재생성)
    if (this.editingId) {
      const editingLog = this.sampleLogs.find(l => String(l.id) === String(this.editingId));
      if (!editingLog) {
        this.showToast('수정할 데이터를 찾을 수 없습니다.', 'error');
        return;
      }

      const requestItems = this.getRequestItems();
      if (requestItems.length === 0) {
        this.showToast('최소 하나의 의뢰 항목을 입력해주세요.', 'error');
        return;
      }

      const applicantType = (formData.get('applicantType') as string) || '개인';
      const oldMembers: PesticideSampleData[] = (this.editingGroupIds && this.editingGroupIds.length > 0)
        ? this.sampleLogs.filter(l => this.editingGroupIds.includes(String(l.id)))
        : [editingLog];

      // 의뢰 항목을 줄인 경우 확인
      if (requestItems.length < oldMembers.length) {
        const removeCount = oldMembers.length - requestItems.length;
        if (!confirm(`기존 ${oldMembers.length}건 중 ${removeCount}건이 삭제됩니다. 계속하시겠습니까?`)) {
          return;
        }
      }

      const oldById = new Map(oldMembers.map(m => [String(m.id), m]));
      const groupId = editingLog.groupId || oldMembers[0]?.groupId || crypto.randomUUID();

      // 접수번호 파싱
      const receptionRaw = String(formData.get('receptionNumber') || '').trim();
      const receptionNumbers = receptionRaw.split(',').map(n => n.trim()).filter(n => n);
      const safeBaseParsed = parseInt(receptionNumbers[0], 10);
      const safeBase = !isNaN(safeBaseParsed)
        ? safeBaseParsed
        : (parseInt(this.generateNextReceptionNumber(), 10) || 1);

      // 정렬 (Firestore 삭제와 재생성 양쪽에서 재사용)
      const oldOrdered = oldMembers.slice().sort((a, b) => {
        const na = parseInt(a.receptionNumber || '', 10) || 0;
        const nb = parseInt(b.receptionNumber || '', 10) || 0;
        return na - nb;
      });

      // 로컬에서 기존 멤버 제거
      this.sampleLogs = this.sampleLogs.filter(l => !oldById.has(String(l.id)));
      const newSlotCount = requestItems.length;
      const fdb = (window as unknown as { firestoreDb?: { isEnabled?: () => boolean; delete?: (mk: string, year: number, id: string) => Promise<unknown> } }).firestoreDb;
      if (fdb?.isEnabled?.() && oldOrdered.length > newSlotCount) {
        const year = parseInt(String(this.selectedYear), 10);
        for (let i = newSlotCount; i < oldOrdered.length; i++) {
          const rid = String(oldOrdered[i].id);
          fdb.delete?.(this.moduleKey, year, rid)?.catch((err: unknown) => {
            (window.logger?.error || console.error)('Firestore 그룹 멤버 삭제 실패:', err);
          });
        }
      }

      const commonData = {
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
        producerName: (formData.get('producerName') as string) || ''
      };

      const nowIso = new Date().toISOString();
      requestItems.forEach((item, idx) => {
        const prev = oldOrdered[item.index] || oldOrdered[idx];
        const newLog: PesticideSampleData = {
          ...commonData,
          id: prev?.id || crypto.randomUUID(),
          groupId,
          receptionNumber: receptionNumbers[idx] || String(safeBase + idx),
          producerAddress: item.producerAddress,
          requestContent: item.cropName,
          isComplete: prev?.isComplete || false,
          testResult: prev?.testResult ?? null,
          createdAt: prev?.createdAt || nowIso,
          updatedAt: nowIso
        };
        this.sampleLogs.push(newLog);
      });

      this.saveLogs();
      this.filterAndRenderLogs();
      this.cancelEditMode();
      this.showToast('수정이 완료되었습니다.', 'success');
      this.switchView('list');
      return;
    }

    // 신규 등록 모드
    const requestItems = this.getRequestItems();
    if (requestItems.length === 0) {
      this.showToast('최소 하나의 의뢰 항목을 입력해주세요.', 'error');
      return;
    }

    const baseReceptionNumber = parseInt(formData.get('receptionNumber') as string, 10);
    const createdLogs: PesticideSampleData[] = [];
    const applicantType = (formData.get('applicantType') as string) || '개인';
    // 동일 폼 제출로 생성된 N개 행을 그룹으로 묶기 위한 식별자
    const groupId = crypto.randomUUID();

    requestItems.forEach((item, idx) => {
      const itemReceptionNumber = String(baseReceptionNumber + idx);
      const newLog: PesticideSampleData = {
        id: crypto.randomUUID(),
        groupId,
        receptionNumber: itemReceptionNumber,
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
        producerAddress: item.producerAddress,
        requestContent: item.cropName,
        isComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.sampleLogs.push(newLog);
      createdLogs.push(newLog);
    });

    this.saveLogs();
    this.filterAndRenderLogs();
    if (this.form) this.form.reset();
    if (this.dateInput) this.dateInput.valueAsDate = new Date();

    if (this.addressPostcodeEl) this.addressPostcodeEl.value = '';
    if (this.addressRoadEl) this.addressRoadEl.value = '';
    if (this.addressDetailEl) this.addressDetailEl.value = '';
    if (this.addressHiddenEl) this.addressHiddenEl.value = '';

    this.resetRequestItems();

    if (this.receptionNumberInput) {
      this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }

    this.showToast(`${createdLogs.length}건의 시료가 접수되었습니다.`, 'success');

    if (createdLogs.length === 1) {
      this.showRegistrationResult(createdLogs[0]);
    } else {
      this.showMultipleRegistrationResult(createdLogs);
    }

    this.switchView('list');
  }

  /**
   * 동일 접수 그룹 멤버 조회
   *  - 신규: groupId 일치
   *  - 레거시: createdAt + name + phoneNumber + date 휴리스틱 매칭
   *  반환: receptionNumber 오름차순
   */
  getGroupMembers(log: PesticideSampleData | undefined): PesticideSampleData[] {
    if (!log) return [];
    const matchByGroupId: PesticideSampleData[] = log.groupId
      ? this.sampleLogs.filter(l => l.groupId && l.groupId === log.groupId)
      : [];
    let members: PesticideSampleData[] = matchByGroupId;
    if (members.length === 0) {
      members = this.sampleLogs.filter(l =>
        l.createdAt && l.createdAt === log.createdAt &&
        (l.name || '') === (log.name || '') &&
        (l.phoneNumber || '') === (log.phoneNumber || '') &&
        (l.date || '') === (log.date || '')
      );
    }
    if (members.length === 0) members = [log];
    members.sort((a, b) => {
      const na = parseInt(a.receptionNumber || '', 10) || 0;
      const nb = parseInt(b.receptionNumber || '', 10) || 0;
      return na - nb;
    });
    return members;
  }

  /**
   * 샘플 편집
   */
  editSample(id: string): void {
    const log = this.sampleLogs.find(l => String(l.id) === id);
    if (log) {
      this.populateFormForEdit(log);
    }
  }

  /**
   * 샘플 삭제 (base class override) — 같은 접수 그룹 전체 일괄 삭제
   */
  override async deleteSample(id: string): Promise<void> {
    const target = this.sampleLogs.find(l => String(l.id) === String(id));
    if (!target) {
      await super.deleteSample(id);
      return;
    }
    const members = this.getGroupMembers(target);
    const confirmMsg = members.length > 1
      ? `같은 접수로 등록된 ${members.length}건이 함께 삭제됩니다. 정말 삭제하시겠습니까?`
      : '정말 삭제하시겠습니까?';
    if (!confirm(confirmMsg)) return;

    const memberIds = new Set(members.map(m => String(m.id)));
    this.sampleLogs = this.sampleLogs.filter(l => !memberIds.has(String(l.id)));
    this.saveLogs();
    if (typeof this.filterAndRenderLogs === 'function') {
      this.filterAndRenderLogs();
    }
    this.showToast(members.length > 1 ? `${members.length}건 삭제되었습니다.` : '삭제되었습니다.', 'success');

    const fdb = (window as unknown as { firestoreDb?: { isEnabled?: () => boolean; delete?: (mk: string, year: number, id: string) => Promise<unknown> } }).firestoreDb;
    if (fdb?.isEnabled?.()) {
      const year = parseInt(String(this.selectedYear), 10);
      memberIds.forEach(mid => {
        fdb.delete?.(this.moduleKey, year, mid)?.catch((err: unknown) => {
          (window.logger?.error || console.error)('Firestore 그룹 멤버 삭제 실패:', err);
        });
      });
    }
    if (this.editingId && memberIds.has(String(this.editingId))) {
      this.cancelEditMode();
    }
  }

  // ========================================
  // Override: 뷰 초기화 (JS 228-246)
  // ========================================

  protected override initViews(): void {
    if (this.dateInput) {
      this.dateInput.valueAsDate = new Date();
    }
    const oldData = SampleUtils.safeParseJSON(this.storageKey, []);
    if (oldData.length > 0) {
      const yearKey = this.getStorageKey(this.selectedYear);
      if (!localStorage.getItem(yearKey)) {
        localStorage.setItem(yearKey, JSON.stringify(oldData));
        this.log('기존 데이터를 년도별 저장소로 마이그레이션:', oldData.length, '건');
      }
    }
    this.updateListViewTitle();
  }

  // Override: 페이지네이션 초기화 (PaginationManager 사용 안 함)
  protected override initPagination(): void {
    // pesticide는 자체 페이지네이션 사용
  }

  // Override: 테이블 이벤트 위임 (자체 이벤트 핸들러 사용)
  protected override setupTableEventDelegation(): void {
    // pesticide는 setupTypeSpecificEvents에서 자체 이벤트 위임 설정
  }

  // Override: 연도 변경 시 hook (JS 372-374)
  protected override onYearChange(_newYear: string): void {
    this.updateListViewTitle();
    // 연도 변경 시 분석결과 캐시 무효화 + Firestore 재동기화
    this._cachedPesticideResults = null;
    // 빠른 연도 변경 시 race condition 방지 — 토큰 기반 검증
    const reqYear = this.selectedYear;
    void this.syncPesticideTestResultsFromFirestore(reqYear);
  }

  // Override: 저장 후 hook (자동 저장) (JS 382-388)
  protected override onAfterSave(_data: PesticideSampleData[]): void {
    const autoSaveEnabled = localStorage.getItem('pesticideAutoSaveEnabled') === 'true';
    if (autoSaveEnabled && ((window as any).isElectron ? (this as any).FileAPI?.autoSavePath : this.autoSaveFileHandle)) {
      this.autoSaveToFile();
    }
    sessionStorage.setItem('lastSaveTime', new Date().toISOString());
  }

  // Override: 수령 방법 버튼 설정 (JS 394-407)
  protected override setupReceptionMethod(): void {
    if (this.receptionMethodBtns) {
      this.receptionMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.receptionMethodBtns!.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.receptionMethodInput) {
            this.receptionMethodInput.value = (btn as HTMLElement).dataset.method || '';
          }
        });
      });
    }
  }

  // Override: 레코드 수 업데이트 ("총" 접두사 없음) (JS 362-366)
  protected override updateRecordCount(): void {
    if (this.recordCountEl) {
      this.recordCountEl.textContent = `${this.sampleLogs.length}건`;
    }
  }

  // Override: 추가 마이그레이션 (JS 289-296)
  protected override getAdditionalMigrations(): Array<(logs: PesticideSampleData[]) => PesticideSampleData[] | void> {
    return [
      (logs: PesticideSampleData[]) => {
        this.migrateProducerAddress(logs);
        return logs;
      }
    ];
  }

  // 생산지 주소 마이그레이션 (JS 299-320)
  migrateProducerAddress(logs: PesticideSampleData[]): number {
    const bonghwaDistricts = ['봉화읍', '물야면', '봉성면', '법전면', '춘양면', '소천면', '재산면', '명호면', '상운면', '석포면'];
    const districtPattern = new RegExp(`^(${bonghwaDistricts.join('|')})\\s+`);
    let migrated = 0;
    logs.forEach(log => {
      if (log.producerAddress) {
        const addr = log.producerAddress.trim();
        if (addr.startsWith('봉화군') || addr.startsWith('영주시') || addr.startsWith('울진군') || addr.startsWith('경상북도')) return;
        if (districtPattern.test(addr)) {
          log.producerAddress = '봉화군 ' + addr;
          migrated++;
        }
      }
    });
    if (migrated > 0) this.log('생산지 주소 마이그레이션:', migrated, '건');
    return migrated;
  }

  // Override: 렌더링 전 데이터 정렬 + 평탄화 (JS 326-333)
  protected override prepareDataForRender(logs: PesticideSampleData[]): PesticideSampleData[] {
    const sorted = [...logs].sort((a, b) => {
      const numA = parseInt(a.receptionNumber || '0', 10) || 0;
      const numB = parseInt(b.receptionNumber || '0', 10) || 0;
      return numA - numB;
    });
    return this.flattenLogsForTable(sorted);
  }

  // 리스트 뷰 제목 업데이트 (JS 433-438)
  updateListViewTitle(): void {
    const listViewTitle = document.getElementById('listViewTitle');
    if (listViewTitle) listViewTitle.textContent = '잔류농약 접수 목록';
  }

  // 뷰 전환 (listViewStale 지원)
  override switchView(viewName: string): void {
    const views = document.querySelectorAll('.view');
    const navItems = document.querySelectorAll('.nav-btn');
    views.forEach(view => view.classList.remove('active'));
    navItems.forEach(nav => nav.classList.remove('active'));
    const targetView = document.getElementById(`${viewName}View`);
    const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');
    if (viewName === 'list' && this.listViewStale) {
      this.filterAndRenderLogs();
      this.listViewStale = false;
    }
  }

  // Override: renderLogs (자체 페이지네이션) (JS 1083-1103)
  override renderLogs(logs: PesticideSampleData[]): void {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';
    this.updateRecordCount();
    if (!logs || logs.length === 0) {
      if (this.emptyState) this.emptyState.classList.remove('hidden');
      if (this.paginationContainer) this.paginationContainer.style.display = 'none';
      this.currentFlatRows = [];
      this.updatePaginationUI();
    } else {
      if (this.emptyState) this.emptyState.classList.add('hidden');
      if (this.paginationContainer) this.paginationContainer.style.display = 'flex';
      this.currentFlatRows = this.prepareDataForRender(logs);
      this.totalPages = Math.ceil(this.currentFlatRows.length / this.itemsPerPage) || 1;
      if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
      this.renderCurrentPage();
    }
  }

  // 데이터 평탄화 (하위 지번별로 행 분리) (JS 1109-1203)
  flattenLogsForTable(logs: PesticideSampleData[]): PesticideSampleData[] {
    const rows: PesticideSampleData[] = [];
    logs.forEach(log => {
      const logAny = log as any;
      if (logAny.parcels && logAny.parcels.length > 0) {
        let subLotIndex = 1;
        logAny.parcels.forEach((parcel: any) => {
          const cropsDisplay = parcel.crops && parcel.crops.length > 0
            ? parcel.crops.map((c: any) => c.name).join(', ') : '-';
          let m2Total = 0; let pyeongTotal = 0;
          if (parcel.crops) {
            parcel.crops.forEach((c: any) => {
              const area = parseFloat(c.area) || 0;
              if (c.unit === 'pyeong') pyeongTotal += area; else m2Total += area;
            });
          }
          const areaParts: string[] = [];
          if (m2Total > 0) areaParts.push(`${m2Total.toLocaleString()}\u33A1`);
          if (pyeongTotal > 0) areaParts.push(`${pyeongTotal.toLocaleString()}\uD3C9`);
          rows.push({ ...log, _isFirstRow: subLotIndex === 1, _subLotIndex: subLotIndex, _displayNumber: log.receptionNumber, _lotAddress: parcel.lotAddress || '-', _cropsDisplay: cropsDisplay, _areaDisplay: areaParts.length > 0 ? areaParts.join(' / ') : '-' } as any);
          subLotIndex++;
          if (parcel.subLots && parcel.subLots.length > 0) {
            parcel.subLots.forEach((subLot: any, idx: number) => {
              const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
              const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);
              const subLotCropsDisplay = subLotCrops.length > 0 ? subLotCrops.map((c: any) => c.name).join(', ') : '-';
              let subM2Total = 0; let subPyeongTotal = 0;
              subLotCrops.forEach((c: any) => { const area = parseFloat(c.area) || 0; if (c.unit === 'pyeong') subPyeongTotal += area; else subM2Total += area; });
              const subAreaParts: string[] = [];
              if (subM2Total > 0) subAreaParts.push(`${subM2Total.toLocaleString()}\u33A1`);
              if (subPyeongTotal > 0) subAreaParts.push(`${subPyeongTotal.toLocaleString()}\uD3C9`);
              rows.push({ ...log, _isFirstRow: false, _subLotIndex: subLotIndex, _displayNumber: `${log.receptionNumber}-${idx + 1}`, _lotAddress: lotAddress, _cropsDisplay: subLotCropsDisplay, _areaDisplay: subAreaParts.length > 0 ? subAreaParts.join(' / ') : '-' } as any);
              subLotIndex++;
            });
          }
        });
      } else {
        rows.push({ ...log, _isFirstRow: true, _subLotIndex: 1, _displayNumber: log.receptionNumber, _lotAddress: logAny.lotAddress || '-', _subLot: '-', _cropsDisplay: logAny.cropsDisplay || '-', _areaDisplay: logAny.area ? parseFloat(logAny.area).toLocaleString() : '-' } as any);
      }
    });
    return rows;
  }

  // 페이지 이동 (JS 1209-1215)
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderCurrentPage();
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.scrollTop = 0;
  }

  // 현재 페이지 렌더링 (JS 1217-1409)
  renderCurrentPage(): void {
    if (!this.tableBody) return;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageRows = this.currentFlatRows.slice(startIndex, endIndex);

    this.tableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    pageRows.forEach((row) => {
      const rowAny = row as any;
      const isComplete = rowAny.isComplete || false;
      const tr = document.createElement('tr');
      tr.className = isComplete ? 'row-completed' : '';
      const methodText = row.receptionMethod || '-';

      const addressFull = [row.addressRoad || row.address, row.addressDetail].filter(Boolean).join(' ') || '';
      const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
      const zipcode = row.addressPostcode || (zipMatch ? zipMatch[1] : '');
      const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;
      const applicantType = row.applicantType || '개인';
      const birthOrCorp = applicantType === '법인' ? (row.corpNumber || '-') : (row.birthDate || '-');
      const displayAddress = addressOnly && addressOnly !== '-' && typeof SIDO_PATTERN !== 'undefined' && SIDO_PATTERN.test(addressOnly)
        ? addressOnly.replace(SIDO_PATTERN, '') : (addressOnly || '-');

      const safeName = escapeHTML(row.name || '');
      const safeDisplayAddress = escapeHTML(displayAddress);
      const safeProducerName = escapeHTML(row.producerName || '-');
      const producerAddrWithoutSido = (row.producerAddress || '-').replace(/^경상북도\s*/, '');
      const safeProducerAddress = escapeHTML(producerAddrWithoutSido);
      const safeRequestContent = escapeHTML(row.requestContent || '-');
      const safePhone = escapeHTML(row.phoneNumber || '-');
      const safeNote = escapeHTML(row.note || '-');

      tr.dataset.id = row.id;

      // Checkbox
      const tdCheckbox = document.createElement('td'); tdCheckbox.className = 'sticky-col col-checkbox';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'row-checkbox'; checkbox.dataset.id = row.id;
      tdCheckbox.appendChild(checkbox); tr.appendChild(tdCheckbox);

      // Complete
      const tdComplete = document.createElement('td'); tdComplete.className = 'sticky-col col-complete';
      const btnComplete = document.createElement('button');
      btnComplete.className = 'btn-complete' + (isComplete ? ' completed' : '');
      btnComplete.dataset.id = row.id; btnComplete.title = isComplete ? '완료 취소' : '완료';
      btnComplete.textContent = isComplete ? '\u2714' : '';
      tdComplete.appendChild(btnComplete); tr.appendChild(tdComplete);

      // Result
      const tdResult = document.createElement('td'); tdResult.className = 'sticky-col col-result';
      const btnResult = document.createElement('button'); btnResult.className = 'btn-result';
      if (row.testResult === 'pass') { btnResult.classList.add('pass'); btnResult.textContent = '불검출'; btnResult.title = '불검출'; }
      else if (row.testResult === 'fail') { btnResult.classList.add('fail'); btnResult.textContent = '검출'; btnResult.title = '검출'; }
      else { btnResult.textContent = '-'; btnResult.title = '미판정 (클릭하여 변경)'; }
      btnResult.dataset.id = row.id; tdResult.appendChild(btnResult); tr.appendChild(tdResult);

      // Number
      const tdNumber = document.createElement('td');
      tdNumber.className = 'sticky-col col-num';
      tdNumber.textContent = rowAny._displayNumber || row.receptionNumber || ''; tr.appendChild(tdNumber);

      // Date
      const tdDate = document.createElement('td'); tdDate.className = 'sticky-col col-date'; tdDate.textContent = row.date || ''; tr.appendChild(tdDate);

      // Applicant type (hidden)
      const tdApplicantType = document.createElement('td'); tdApplicantType.className = 'col-applicant-type col-hidden';
      tdApplicantType.textContent = applicantType; tr.appendChild(tdApplicantType);

      // Birth/Corp (hidden)
      const tdBirthCorp = document.createElement('td'); tdBirthCorp.className = 'col-birth-corp col-hidden';
      tdBirthCorp.textContent = birthOrCorp; tr.appendChild(tdBirthCorp);

      // Sub category
      const tdSubCategory = document.createElement('td'); tdSubCategory.className = 'sticky-col col-category'; tdSubCategory.textContent = row.subCategory || '-'; tr.appendChild(tdSubCategory);

      // Purpose
      const tdPurpose = document.createElement('td'); tdPurpose.className = 'sticky-col col-purpose'; tdPurpose.textContent = row.purpose || '-'; tr.appendChild(tdPurpose);

      // Name
      const tdName = document.createElement('td'); tdName.className = 'sticky-col col-name'; tdName.dataset.name = row.name || '';
      tdName.textContent = safeName; tdName.title = `"${safeName}" 클릭하면 같은 이름 일괄 선택`; tr.appendChild(tdName);

      // Zipcode (hidden)
      const tdZipcode = document.createElement('td'); tdZipcode.className = 'col-zipcode col-hidden';
      tdZipcode.textContent = zipcode || '-'; tr.appendChild(tdZipcode);

      // Address
      const tdAddress = document.createElement('td'); tdAddress.className = 'col-address';
      tdAddress.textContent = safeDisplayAddress; tr.appendChild(tdAddress);

      // Producer name
      const tdProducerName = document.createElement('td'); tdProducerName.textContent = safeProducerName; tr.appendChild(tdProducerName);

      // Producer address
      const tdProducerAddress = document.createElement('td'); tdProducerAddress.className = 'col-producer-address';
      tdProducerAddress.textContent = safeProducerAddress; tr.appendChild(tdProducerAddress);

      // Request content
      const tdRequestContent = document.createElement('td'); tdRequestContent.className = 'text-truncate';
      tdRequestContent.dataset.tooltip = safeRequestContent; tdRequestContent.textContent = safeRequestContent; tr.appendChild(tdRequestContent);

      // Phone
      const tdPhone = document.createElement('td'); tdPhone.textContent = safePhone; tr.appendChild(tdPhone);

      // Method
      const tdMethod = document.createElement('td'); tdMethod.textContent = methodText; tr.appendChild(tdMethod);

      // Note
      const tdNote = document.createElement('td'); tdNote.className = 'col-note text-truncate';
      tdNote.dataset.tooltip = safeNote; tdNote.textContent = safeNote; tr.appendChild(tdNote);

      // Mail date
      const tdMailDate = document.createElement('td'); tdMailDate.className = 'col-mail-date';
      tdMailDate.textContent = row.mailDate || '-'; tr.appendChild(tdMailDate);

      // Analysis result
      const tdAnalysis = document.createElement('td'); tdAnalysis.className = 'col-analysis';
      const btnAnalysis = document.createElement('button');
      btnAnalysis.className = 'btn-analysis';
      btnAnalysis.dataset.id = row.id;
      btnAnalysis.title = '분석결과 입력';
      const testResultData = this.loadTestResultForLog(row.id);
      if (testResultData) {
        if (testResultData.allNd) {
          btnAnalysis.textContent = '불검출';
          btnAnalysis.classList.add('has-result', 'nd');
        } else if (testResultData.detections && testResultData.detections.length > 0) {
          btnAnalysis.textContent = `${testResultData.detections.length}건 검출`;
          btnAnalysis.classList.add('has-result', 'detected');
        } else {
          btnAnalysis.textContent = '입력';
        }
      } else {
        btnAnalysis.textContent = '입력';
      }
      tdAnalysis.appendChild(btnAnalysis); tr.appendChild(tdAnalysis);

      // Actions
      const tdActions = document.createElement('td');
      const divActions = document.createElement('div'); divActions.className = 'table-actions';
      const btnEdit = document.createElement('button'); btnEdit.className = 'btn-edit'; btnEdit.dataset.id = row.id; btnEdit.textContent = '수정';
      const btnDelete = document.createElement('button'); btnDelete.className = 'btn-delete'; btnDelete.dataset.id = row.id; btnDelete.textContent = '삭제';
      divActions.appendChild(btnEdit); divActions.appendChild(btnDelete);
      tdActions.appendChild(divActions); tr.appendChild(tdActions);

      fragment.appendChild(tr);
    });
    this.tableBody.appendChild(fragment);
    this.updatePaginationUI();
  }

  // 페이지네이션 UI 업데이트 (JS 1411-1430)
  updatePaginationUI(): void {
    const totalItems = this.currentFlatRows.length;
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
    if (this.paginationInfo) this.paginationInfo.textContent = `${totalItems}건 중 ${startItem}-${endItem}`;
    if (this.firstPageBtn) (this.firstPageBtn as any).disabled = this.currentPage === 1;
    if (this.prevPageBtn) (this.prevPageBtn as any).disabled = this.currentPage === 1;
    if (this.nextPageBtn) (this.nextPageBtn as any).disabled = this.currentPage === this.totalPages;
    if (this.lastPageBtn) (this.lastPageBtn as any).disabled = this.currentPage === this.totalPages;
    this.renderPageNumbers();
  }

  // 페이지 번호 렌더링 (JS 1432-1475)
  renderPageNumbers(): void {
    if (!this.pageNumbersContainer) return;
    if (this.totalPages <= 1) { this.pageNumbersContainer.innerHTML = ''; return; }
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) startPage = Math.max(1, endPage - maxVisiblePages + 1);
    const fragment = document.createDocumentFragment();
    if (startPage > 1) {
      fragment.appendChild(this.createPageButton(1));
      if (startPage > 2) { const el = document.createElement('span'); el.className = 'page-ellipsis'; el.textContent = '...'; fragment.appendChild(el); }
    }
    for (let i = startPage; i <= endPage; i++) fragment.appendChild(this.createPageButton(i));
    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) { const el = document.createElement('span'); el.className = 'page-ellipsis'; el.textContent = '...'; fragment.appendChild(el); }
      fragment.appendChild(this.createPageButton(this.totalPages));
    }
    this.pageNumbersContainer.innerHTML = '';
    this.pageNumbersContainer.appendChild(fragment);
  }

  // 페이지 버튼 생성 (JS 1477-1483)
  createPageButton(pageNum: number): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `page-btn ${pageNum === this.currentPage ? 'active' : ''}`;
    btn.textContent = String(pageNum);
    btn.addEventListener('click', () => this.goToPage(pageNum));
    return btn;
  }

  // 자동 저장 (JS 1489-1497)
  async autoSaveToFile(): Promise<any> {
    return await SampleUtils.performAutoSave({
      FileAPI: (this as any).FileAPI,
      moduleKey: 'pesticide',
      data: this.sampleLogs,
      webFileHandle: this.autoSaveFileHandle,
      log: (...args: unknown[]) => this.log(...args)
    });
  }

  // 등록 결과 모달 (JS 1599-1619)
  showRegistrationResult(logData: PesticideSampleData): void {
    this.currentRegistrationData = logData;
    const rows = [
      { label: '접수번호', value: logData.receptionNumber || '' },
      { label: '접수일자', value: logData.date || '' },
      { label: '성명', value: logData.name || '' },
      { label: '전화번호', value: logData.phoneNumber || '' },
      { label: '주소', value: [logData.addressRoad || logData.address, logData.addressDetail].filter(Boolean).join(' ') || '-' },
      { label: '구분', value: logData.subCategory || '-' },
      { label: '목적 (용도)', value: logData.purpose || '-' },
      { label: '수령 방법', value: logData.receptionMethod || '-' },
      { label: '생산자 성명', value: logData.producerName || '-' },
      { label: '생산지 주소', value: logData.producerAddress || '-' },
      { label: '의뢰물품명', value: logData.requestContent || '-', isMultiline: true },
      { label: '비고', value: logData.note || '-' }
    ];
    BaseSampleManager.buildResultTable(this.resultTableBody, rows);
    if (this.registrationResultModal) this.registrationResultModal.classList.remove('hidden');
  }

  // 복수 등록 결과 모달 (JS 1621-1662)
  showMultipleRegistrationResult(logs: PesticideSampleData[]): void {
    const modal = document.getElementById('registrationResultModal');
    const tableBody = document.getElementById('registrationResultTable');
    if (!modal || !tableBody) return;

    const esc = (window as any).escapeHTML || escapeHTML;
    const rowsHtml = logs.map(log => {
      const addrWithoutSido = (log.producerAddress || '-').replace(/^경상북도\s*/, '');
      return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${esc(log.receptionNumber || '')}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${esc(addrWithoutSido)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${esc(log.requestContent || '-')}</td></tr>`;
    }).join('');
    tableBody.innerHTML = sanitizeHTML(`<div style="margin-bottom:16px;text-align:center;"><span style="font-size:2rem;">&#x2705;</span><p style="font-size:1.1rem;font-weight:600;color:#22C55E;margin:8px 0;">${logs.length}건 접수 완료</p></div><table style="width:100%;border-collapse:collapse;font-size:0.9rem;"><thead><tr style="background:#F3E8FF;"><th style="padding:8px;text-align:left;border-bottom:2px solid #DDD6FE;">접수번호</th><th style="padding:8px;text-align:left;border-bottom:2px solid #DDD6FE;">생산지 주소</th><th style="padding:8px;text-align:left;border-bottom:2px solid #DDD6FE;">의뢰물품명</th></tr></thead><tbody>${rowsHtml}</tbody></table><div style="margin-top:12px;padding:8px;background:#F0FDF4;border-radius:6px;font-size:0.85rem;color:#15803D;"><strong>접수일:</strong> ${esc(logs[0].date || '')} | <strong>의뢰인:</strong> ${esc(logs[0].name || '')} | <strong>생산자:</strong> ${esc(logs[0].producerName || '-')}</div>`);
    modal.classList.remove('hidden');
  }

  // 등록 결과 엑셀 내보내기 (JS 2073-2099)
  exportRegistrationResult(): void {
    if (!this.currentRegistrationData) return;
    const _XLSX = (window as any).XLSX || XLSX;
    if (!_XLSX) { this.showToast('XLSX 라이브러리가 로드되지 않았습니다.', 'error'); return; }
    const excelData = [
      { '\uD56D\uBAA9': '접수번호', '\uB0B4\uC6A9': this.currentRegistrationData.receptionNumber || '' },
      { '\uD56D\uBAA9': '접수일자', '\uB0B4\uC6A9': this.currentRegistrationData.date || '' },
      { '\uD56D\uBAA9': '구분', '\uB0B4\uC6A9': this.currentRegistrationData.subCategory || '-' },
      { '\uD56D\uBAA9': '목적 (용도)', '\uB0B4\uC6A9': this.currentRegistrationData.purpose || '-' },
      { '\uD56D\uBAA9': '성명', '\uB0B4\uC6A9': this.currentRegistrationData.name || '' },
      { '\uD56D\uBAA9': '전화번호', '\uB0B4\uC6A9': this.currentRegistrationData.phoneNumber || '' },
      { '\uD56D\uBAA9': '주소', '\uB0B4\uC6A9': this.currentRegistrationData.address || '-' },
      { '\uD56D\uBAA9': '수령 방법', '\uB0B4\uC6A9': this.currentRegistrationData.receptionMethod || '-' },
      { '\uD56D\uBAA9': '생산자 성명', '\uB0B4\uC6A9': this.currentRegistrationData.producerName || '-' },
      { '\uD56D\uBAA9': '생산지 주소', '\uB0B4\uC6A9': this.currentRegistrationData.producerAddress || '-' },
      { '\uD56D\uBAA9': '의뢰물품명', '\uB0B4\uC6A9': this.currentRegistrationData.requestContent || '-' },
      { '\uD56D\uBAA9': '비고', '\uB0B4\uC6A9': this.currentRegistrationData.note || '-' }
    ];
    const wb = _XLSX.utils.book_new();
    const sanitize = typeof sanitizeExcelData === 'function' ? sanitizeExcelData : ((d: any) => d);
    const ws = _XLSX.utils.json_to_sheet(sanitize(excelData));
    ws['!cols'] = [{ wch: 20 }, { wch: 50 }];
    _XLSX.utils.book_append_sheet(wb, ws, '등록결과');
    const fileName = `등록결과_${this.currentRegistrationData.receptionNumber}_${this.currentRegistrationData.name}.xlsx`;
    _XLSX.writeFile(wb, fileName);
    this.showToast('엑셀 파일로 내보내기 완료', 'success');
  }

  // 통계 계산 (JS 1730-1811)
  calculateStatistics(): { total: number; completed: number; pending: number; bySubCategory: Record<string, any>; byPurpose: Record<string, any>; byMonth: Record<string, any>; byQuarter: Record<string, any>; byReceptionMethod: Record<string, any> } {
    const total = this.sampleLogs.length;
    const completed = this.sampleLogs.filter(log => (log as any).isComplete).length;
    const pending = total - completed;

    const categoryMapping: Record<string, { label: string; class: string }> = {
      '생산물': { label: '🌾 생산물', class: 'category-product' },
      '작물체': { label: '🌿 작물체', class: 'category-plant' },
      '토양': { label: '🪱 토양', class: 'category-soil' }
    };
    const bySubCategory: Record<string, any> = {};
    Object.entries(categoryMapping).forEach(([key, val]) => { bySubCategory[key] = { count: 0, ...val }; });
    this.sampleLogs.forEach(log => {
      const cat = (log as any).subCategory || '기타';
      if (!bySubCategory[cat]) bySubCategory[cat] = { count: 0, ...(categoryMapping[cat] || { label: cat, class: 'category-other' }) };
      bySubCategory[cat].count++;
    });

    const purposeMapping: Record<string, { label: string; class: string }> = {
      '참고용': { label: '참고용', class: 'purpose-reference' }, '제출(급식)': { label: '제출(급식)', class: 'purpose-meal' },
      '인증(무농약)': { label: '인증(무농약)', class: 'purpose-nopesticide' }, '인증(유기농)': { label: '인증(유기농)', class: 'purpose-organic' },
      '인증(GAP)': { label: '인증(GAP)', class: 'purpose-gap' }, '인증(글로벌GAP)': { label: '인증(글로벌GAP)', class: 'purpose-globalgap' }
    };
    const byPurpose: Record<string, any> = {};
    Object.entries(purposeMapping).forEach(([key, val]) => { byPurpose[key] = { count: 0, ...val }; });
    this.sampleLogs.forEach(log => {
      const purpose = log.purpose || '기타';
      if (!byPurpose[purpose]) byPurpose[purpose] = { count: 0, ...(purposeMapping[purpose] || { label: purpose, class: 'purpose-other' }) };
      byPurpose[purpose].count++;
    });

    const byMonth: Record<string, any> = {};
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    for (let i = 1; i <= 12; i++) { const mk = String(i).padStart(2, '0'); byMonth[mk] = { count: 0, completed: 0, pending: 0, label: monthNames[i - 1], class: 'month' }; }
    this.sampleLogs.forEach(log => {
      if (log.date) { const mn = log.date.substring(5, 7); if (byMonth[mn]) { byMonth[mn].count++; if ((log as any).isComplete) byMonth[mn].completed++; else byMonth[mn].pending++; } }
    });

    const byQuarter: Record<string, any> = { Q1: { count: 0, completed: 0, pending: 0, label: '1분기 (1~3월)' }, Q2: { count: 0, completed: 0, pending: 0, label: '2분기 (4~6월)' }, Q3: { count: 0, completed: 0, pending: 0, label: '3분기 (7~9월)' }, Q4: { count: 0, completed: 0, pending: 0, label: '4분기 (10~12월)' } };
    Object.entries(byMonth).forEach(([mk, data]) => {
      const mn = parseInt(mk, 10); let q: string;
      if (mn <= 3) q = 'Q1'; else if (mn <= 6) q = 'Q2'; else if (mn <= 9) q = 'Q3'; else q = 'Q4';
      byQuarter[q].count += data.count; byQuarter[q].completed += data.completed; byQuarter[q].pending += data.pending;
    });

    const methodMapping: Record<string, { label: string; class: string }> = { '우편': { label: '📮 우편', class: 'method-mail' }, '이메일': { label: '📧 이메일', class: 'method-email' }, '팩스': { label: '📠 팩스', class: 'method-fax' }, '직접방문': { label: '🚶 직접방문', class: 'method-visit' } };
    const byReceptionMethod: Record<string, any> = {};
    Object.entries(methodMapping).forEach(([key, val]) => { byReceptionMethod[key] = { count: 0, ...val }; });
    this.sampleLogs.forEach(log => {
      const raw = log.receptionMethod;
      const method = (raw && raw.trim() && raw !== '-') ? raw : '기타';
      if (method === '기타') return;
      if (!byReceptionMethod[method]) byReceptionMethod[method] = { count: 0, ...(methodMapping[method] || { label: method, class: 'method-other' }) };
      byReceptionMethod[method].count++;
    });

    return { total, completed, pending, bySubCategory, byPurpose, byMonth, byQuarter, byReceptionMethod };
  }

  // 통계 모달 열기 (JS 1814-1830)
  openStatisticsModal(): void {
    const statisticsModal = document.getElementById('statisticsModal');
    if (!statisticsModal) return;
    const stats = this.calculateStatistics();
    const el = (id: string) => document.getElementById(id);
    const setTC = (id: string, v: number) => { const e = el(id); if (e) e.textContent = String(v); };
    setTC('statTotalCount', stats.total); setTC('statCompletedCount', stats.completed); setTC('statPendingCount', stats.pending);
    this.renderBarChart('statsByCategory', stats.bySubCategory, 'category');
    this.renderBarChart('statsByPurpose', stats.byPurpose, 'purpose');
    this.renderMonthlyChart('statsByMonth', stats.byMonth);
    this.renderQuarterlySummary('statsQuarterly', stats.byQuarter);
    this.renderBarChart('statsByReceptionMethod', stats.byReceptionMethod, 'method');
    statisticsModal.classList.remove('hidden');
  }

  // 수평 바 차트 렌더링 (JS 1832-1860)
  renderBarChart(containerId: string, data: Record<string, any>, _prefix: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const entries = Object.entries(data).sort((a, b) => (b[1] as any).count - (a[1] as any).count);
    if (entries.length === 0) { container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>'); return; }
    const maxCount = Math.max(...entries.map(([, v]) => (v as any).count));
    container.innerHTML = sanitizeHTML(entries.map(([, value]) => {
      const v = value as any; const percent = maxCount > 0 ? (v.count / maxCount) * 100 : 0; const showInside = percent > 20;
      return `<div class="stat-bar-item"><span class="stat-bar-label">${v.label}</span><div class="stat-bar-wrapper"><div class="stat-bar ${v.class}" style="width: ${percent}%"></div>${showInside ? `<span class="stat-bar-count">${v.count}건</span>` : ''}</div>${!showInside ? `<span style="font-size: 0.75rem; color: #6b7280; min-width: 40px;">${v.count}건</span>` : ''}</div>`;
    }).join(''));
  }

  // 월별 차트 렌더링 (JS 1862-1901)
  renderMonthlyChart(containerId: string, data: Record<string, any>): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...entries.map(([, v]) => (v as any).count), 1);
    container.innerHTML = sanitizeHTML(`<div class="monthly-chart"><div class="monthly-bars">${entries.map(([, value]) => {
      const v = value as any; const hp = maxCount > 0 ? (v.count / maxCount) * 100 : 0; const cp = v.count > 0 ? (v.completed / v.count) * 100 : 0;
      return `<div class="monthly-bar-group"><div class="monthly-bar-container"><div class="monthly-bar-stack" data-h="${hp.toFixed(1)}"><div class="monthly-bar-completed" data-h="${cp.toFixed(1)}" title="완료: ${v.completed}건"></div><div class="monthly-bar-pending" data-h="${(100 - cp).toFixed(1)}" title="미완료: ${v.pending}건"></div></div>${v.count > 0 ? `<span class="monthly-bar-value">${v.count}</span>` : ''}</div><span class="monthly-bar-label">${v.label}</span></div>`;
    }).join('')}</div><div class="monthly-legend"><span class="legend-item"><span class="legend-color completed"></span> 완료</span><span class="legend-item"><span class="legend-color pending"></span> 미완료</span></div></div>`);
    container.querySelectorAll('.monthly-bar-stack[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
    container.querySelectorAll('.monthly-bar-completed[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
    container.querySelectorAll('.monthly-bar-pending[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
  }

  // 분기별 요약 렌더링 (JS 1903-1932)
  renderQuarterlySummary(containerId: string, data: Record<string, any>): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const totalCount = Object.values(data).reduce((sum, q: any) => sum + q.count, 0);
    container.innerHTML = sanitizeHTML(`<div class="quarterly-summary">${Object.entries(data).map(([, value]) => {
      const v = value as any; const percent = totalCount > 0 ? ((v.count / totalCount) * 100).toFixed(1) : '0'; const cr = v.count > 0 ? ((v.completed / v.count) * 100).toFixed(0) : '0';
      return `<div class="quarterly-item"><div class="quarterly-label">${v.label}</div><div class="quarterly-stats"><span class="quarterly-count">${v.count}건</span><span class="quarterly-percent">(${percent}%)</span></div><div class="quarterly-completion"><div class="completion-bar"><div class="completion-fill" data-w="${cr}"></div></div><span class="completion-text">완료율 ${cr}%</span></div></div>`;
    }).join('')}</div>`);
    container.querySelectorAll('.completion-fill[data-w]').forEach(el => { (el as HTMLElement).style.width = el.getAttribute('data-w') + '%'; });
  }

  /**
   * 다음 접수번호 생성
   */
  generateNextReceptionNumber(): string {
    let maxNumber = 0;
    this.sampleLogs.forEach(log => {
      if (log.receptionNumber) {
        const baseNumber = log.receptionNumber.split('-')[0];
        const num = parseInt(baseNumber, 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return String(maxNumber + 1);
  }

  /**
   * 의뢰 항목 가져오기
   */
  // ========================================
  // 잔류농약 분석결과 모달
  // ========================================

  /**
   * 분석결과 모달 초기화
   */
  private initPesticideAnalysisModal(): void {
    const modal = document.getElementById('pesticideAnalysisModal');
    if (!modal) return;

    const closeModal = () => { modal.classList.add('hidden'); this._paLogId = null; };
    document.getElementById('closePesticideAnalysisModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelPesticideAnalysisBtn')?.addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
    modal.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); });

    document.getElementById('paAddRowBtn')?.addEventListener('click', () => this.addDetectionRow());
    document.getElementById('paAllNdBtn')?.addEventListener('click', () => this.setAllNd(true));
    document.getElementById('paCancelNdBtn')?.addEventListener('click', () => this.setAllNd(false));
    document.getElementById('savePesticideAnalysisBtn')?.addEventListener('click', () => this.savePesticideAnalysis());
  }

  /**
   * 분석결과 모달 열기
   */
  private openPesticideAnalysisModal(logId: string): void {
    const log = this.sampleLogs.find(l => String(l.id) === String(logId));
    if (!log) return;

    const modal = document.getElementById('pesticideAnalysisModal');
    if (!modal) return;

    this._paLogId = logId;

    // 시료 정보 채우기
    const paReceptionNumber = document.getElementById('paReceptionNumber');
    const paDate = document.getElementById('paDate');
    const paCategory = document.getElementById('paCategory');
    const paName = document.getElementById('paName');
    const paCrop = document.getElementById('paCrop');
    const paPurpose = document.getElementById('paPurpose');

    if (paReceptionNumber) paReceptionNumber.textContent = log.receptionNumber || '-';
    if (paDate) paDate.textContent = log.date || '-';
    if (paCategory) paCategory.textContent = log.subCategory || '-';
    if (paName) paName.textContent = log.name || '-';
    if (paCrop) paCrop.textContent = log.requestContent || '-';
    if (paPurpose) paPurpose.textContent = log.purpose || '-';

    // 기존 결과 로드
    const existing = this.loadTestResultForLog(logId);
    const paTestDate = document.getElementById('paTestDate') as HTMLInputElement | null;
    if (paTestDate) paTestDate.value = existing?.testDate || '';

    // 판정
    const judgment = existing?.judgment || '';
    if (['', 'pass', 'fail'].includes(judgment)) {
      const radio = document.querySelector(`input[name="paJudgment"][value="${judgment}"]`) as HTMLInputElement | null;
      if (radio) radio.checked = true;
    }

    // 검출 농약 행 렌더
    const tbody = document.getElementById('paDetectionsBody');
    if (tbody) tbody.innerHTML = '';

    // 전체 불검출 상태 복원
    this._paAllNd = existing?.allNd || false;
    this.updateNdStatusUI();

    if (existing?.detections && existing.detections.length > 0) {
      for (const det of existing.detections) {
        this.addDetectionRow(det);
      }
    }

    this.updateDetectionCount();
    this.toggleEmptyMsg();
    modal.classList.remove('hidden');
  }

  /**
   * 검출 농약 행 추가
   */
  private addDetectionRow(data: PesticideDetectionData | null = null): void {
    const tbody = document.getElementById('paDetectionsBody');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = 'pa-detection-row pa-detection-orig-row';
    // Original 행만 카운트 (명시적 클래스 사용)
    const rowIdx = tbody.querySelectorAll('.pa-detection-orig-row').length;

    // 자동 계산 헬퍼
    const createCalcInput = (prefix: string, fieldData: { raw?: string; dil?: string; val?: string }) => {
      const rawIn = document.createElement('input');
      rawIn.type = 'text';
      rawIn.className = `pa-raw-input pa-${prefix}-raw`;
      rawIn.placeholder = '-';
      rawIn.autocomplete = 'off';
      if (fieldData?.raw) rawIn.value = fieldData.raw;

      const dilIn = document.createElement('input');
      dilIn.type = 'text';
      dilIn.className = `pa-dilution-input pa-${prefix}-dil`;
      dilIn.placeholder = '1';
      dilIn.autocomplete = 'off';
      dilIn.value = fieldData?.dil || '1';

      const valIn = document.createElement('input');
      valIn.type = 'text';
      valIn.className = `pa-value-input pa-${prefix}-val`;
      valIn.placeholder = '0.00';
      valIn.autocomplete = 'off';
      if (fieldData?.val) valIn.value = fieldData.val;

      // 희석배수 입력 검증 (음수/0은 시각적 경고)
      const validateDilution = () => {
        const dilNum = parseFloat(dilIn.value);
        if (!isNaN(dilNum) && dilNum < 1) {
          dilIn.classList.add('pa-input-invalid');
        } else {
          dilIn.classList.remove('pa-input-invalid');
        }
      };

      const calc = () => {
        const ppb = parseFloat(rawIn.value);
        const dilRaw = parseFloat(dilIn.value);
        const dil = !isNaN(dilRaw) && dilRaw >= 1 ? dilRaw : 1;
        if (isNaN(ppb)) {
          valIn.value = '';
          return;
        }
        const ppm = (ppb * dil) / 1000;
        if (ppm === 0) {
          valIn.value = '0';
          return;
        }
        const formatted = ppm.toFixed(3).replace(/\.?0+$/, '');
        valIn.value = formatted || '0';
      };
      rawIn.addEventListener('input', calc);
      dilIn.addEventListener('input', () => { validateDilution(); calc(); });

      return { rawIn, dilIn, valIn };
    };

    // === 1행: Original ===

    // No (rowSpan=2)
    const tdNo2 = document.createElement('td');
    tdNo2.className = 'pa-col-no';
    tdNo2.rowSpan = 2;
    tdNo2.textContent = String(rowIdx + 1);
    tr.appendChild(tdNo2);

    // 장비 (rowSpan=2)
    const tdEquip = document.createElement('td');
    tdEquip.className = 'pa-col-equip';
    tdEquip.rowSpan = 2;
    const selEquip = document.createElement('select');
    selEquip.className = 'pa-equip-select';
    ['GC', 'LC'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      selEquip.appendChild(opt);
    });
    if (data?.equipment) selEquip.value = data.equipment;
    tdEquip.appendChild(selEquip);
    tr.appendChild(tdEquip);

    // 농약명 (rowSpan=2)
    const tdName = document.createElement('td');
    tdName.className = 'pa-col-name';
    tdName.rowSpan = 2;
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'pa-autocomplete-wrapper';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'pa-name-input';
    nameInput.placeholder = '농약명 검색...';
    nameInput.autocomplete = 'off';
    if (data?.name) {
      nameInput.value = data.name;
      const lookupName = data.engName || data.name;
      nameInput.dataset.engName = data.engName || '';
      nameInput.classList.toggle('pa-name-qualitative', !!window.isQualitativePesticide?.(lookupName));
    }

    const sugList = document.createElement('ul');
    sugList.className = 'pa-suggestions hidden';

    // 자동완성 이벤트
    nameInput.addEventListener('input', () => {
      const q = nameInput.value.trim();
      if (q.length < 1) { sugList.classList.add('hidden'); return; }

      const equip = selEquip.value || 'all';
      const results: { engName: string }[] = window.searchPesticides
        ? window.searchPesticides(q, equip, 10)
        : [];
      sugList.innerHTML = '';
      if (results.length === 0) { sugList.classList.add('hidden'); return; }

      const isQualFn = window.isQualitativePesticide;
      results.forEach((p: { engName: string }) => {
        const li = document.createElement('li');
        li.className = 'pa-suggestion-item';
        const isQual = !!(isQualFn && isQualFn(p.engName));
        // XSS 방지: createElement + textContent
        const span = document.createElement('span');
        span.className = 'pa-sug-name' + (isQual ? ' pa-sug-qualitative' : '');
        span.textContent = p.engName;
        li.appendChild(span);
        li.addEventListener('mousedown', (e: Event) => {
          e.preventDefault();
          nameInput.value = p.engName;
          nameInput.dataset.engName = p.engName;
          nameInput.classList.toggle('pa-name-qualitative', !!(isQualFn && isQualFn(p.engName)));
          sugList.classList.add('hidden');
        });
        sugList.appendChild(li);
      });

      // position: fixed 기준으로 입력 필드 아래에 위치
      const rect = nameInput.getBoundingClientRect();
      sugList.style.top = `${rect.bottom + 2}px`;
      sugList.style.left = `${rect.left}px`;
      sugList.style.width = `${rect.width}px`;
      sugList.classList.remove('hidden');
    });

    nameInput.addEventListener('blur', () => {
      setTimeout(() => sugList.classList.add('hidden'), 200);
    });

    nameWrapper.appendChild(nameInput);
    nameWrapper.appendChild(sugList);
    tdName.appendChild(nameWrapper);
    tr.appendChild(tdName);

    // Original 구분 라벨
    const tdOrigLabel = document.createElement('td');
    tdOrigLabel.className = 'pa-col-type pa-type-orig';
    tdOrigLabel.textContent = 'Original';
    tr.appendChild(tdOrigLabel);

    // Original 입력 필드
    const orig = createCalcInput('orig', {
      raw: data?.origRaw || '', dil: data?.origDil || '1', val: data?.origVal || ''
    });
    const tdOrigRaw = document.createElement('td'); tdOrigRaw.appendChild(orig.rawIn); tr.appendChild(tdOrigRaw);
    const tdOrigDil = document.createElement('td'); tdOrigDil.appendChild(orig.dilIn); tr.appendChild(tdOrigDil);
    const tdOrigVal = document.createElement('td'); tdOrigVal.appendChild(orig.valIn); tr.appendChild(tdOrigVal);

    // 삭제 (rowSpan=2)
    const tdDel = document.createElement('td');
    tdDel.className = 'pa-col-del';
    tdDel.rowSpan = 2;
    const btnDel = document.createElement('button');
    btnDel.className = 'pa-del-btn';
    btnDel.title = '삭제';
    btnDel.textContent = '\u2715';
    btnDel.addEventListener('click', () => {
      tr.remove();
      tr2.remove();
      this.renumberDetectionRows();
      this.updateDetectionCount();
      this.toggleEmptyMsg();
    });
    tdDel.appendChild(btnDel);
    tr.appendChild(tdDel);

    // === 2행: Acid ===
    const tr2 = document.createElement('tr');
    tr2.className = 'pa-detection-row pa-detection-acid-row pa-acid-row';

    const tdAcidLabel = document.createElement('td');
    tdAcidLabel.className = 'pa-col-type pa-type-acid';
    tdAcidLabel.textContent = 'Acid';
    tr2.appendChild(tdAcidLabel);

    const acid = createCalcInput('acid', {
      raw: data?.acidRaw || '', dil: data?.acidDil || '1', val: data?.acidVal || ''
    });
    const tdAcidRaw = document.createElement('td'); tdAcidRaw.appendChild(acid.rawIn); tr2.appendChild(tdAcidRaw);
    const tdAcidDil = document.createElement('td'); tdAcidDil.appendChild(acid.dilIn); tr2.appendChild(tdAcidDil);
    const tdAcidVal = document.createElement('td'); tdAcidVal.appendChild(acid.valIn); tr2.appendChild(tdAcidVal);

    tbody.appendChild(tr);
    tbody.appendChild(tr2);
    this.updateDetectionCount();
    this.toggleEmptyMsg();

    if (!data) nameInput.focus();
  }

  /**
   * HTML 이스케이프 (suggestion 표시용)
   */
  private escapeHTMLForSuggestion(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 검출 행 번호 재정렬
   */
  private renumberDetectionRows(): void {
    // No 셀은 Original 행(rowSpan=2)에만 있음 — acid-row 제외
    const origRows = document.querySelectorAll('#paDetectionsBody .pa-detection-orig-row');
    origRows.forEach((tr, idx) => {
      const noCell = tr.querySelector('.pa-col-no');
      if (noCell) noCell.textContent = String(idx + 1);
    });
  }

  /**
   * 검출 건수 업데이트
   */
  private updateDetectionCount(): void {
    const count = document.querySelectorAll('#paDetectionsBody .pa-detection-orig-row').length;
    const el = document.getElementById('paDetectionCount');
    if (el) el.textContent = `${count}건`;
  }

  /**
   * 전체 불검출 설정/해제
   */
  private setAllNd(isNd: boolean): void {
    this._paAllNd = isNd;
    if (isNd) {
      // 전체 불검출 시 기존 검출 행 모두 제거 + 판정 자동 선택
      const tbody = document.getElementById('paDetectionsBody');
      if (tbody) tbody.innerHTML = '';
      this.updateDetectionCount();
      const radio = document.querySelector('input[name="paJudgment"][value="pass"]') as HTMLInputElement | null;
      if (radio) radio.checked = true;
    } else {
      // 해제 시 판정 초기화
      const radio = document.querySelector('input[name="paJudgment"][value=""]') as HTMLInputElement | null;
      if (radio) radio.checked = true;
    }
    this.updateNdStatusUI();
    this.toggleEmptyMsg();
  }

  /**
   * 불검출 상태 UI 업데이트
   */
  private updateNdStatusUI(): void {
    const ndStatus = document.getElementById('paNdStatus');
    const emptyMsg = document.getElementById('paEmptyMsg');
    const addBtn = document.getElementById('paAddRowBtn') as HTMLButtonElement | null;

    if (this._paAllNd) {
      if (ndStatus) ndStatus.classList.remove('hidden');
      if (emptyMsg) emptyMsg.style.display = 'none';
      if (addBtn) addBtn.disabled = true;
    } else {
      if (ndStatus) ndStatus.classList.add('hidden');
      if (addBtn) addBtn.disabled = false;
    }
  }

  /**
   * 빈 메시지 토글
   */
  private toggleEmptyMsg(): void {
    const count = document.querySelectorAll('#paDetectionsBody .pa-detection-orig-row').length;
    const msg = document.getElementById('paEmptyMsg');
    if (msg) msg.style.display = (count > 0 || this._paAllNd) ? 'none' : 'block';
  }

  /**
   * 분석결과 저장
   */
  private savePesticideAnalysis(): void {
    const logId = this._paLogId;
    if (!logId) return;

    const log = this.sampleLogs.find(l => String(l.id) === String(logId));
    if (!log) return;

    const allResults = this.loadAllPesticideTestResults();

    // 검출 농약 수집
    const detections: PesticideDetectionData[] = [];
    // Original 행만 순회 (Acid 행은 바로 다음 형제)
    const origRows = document.querySelectorAll('#paDetectionsBody .pa-detection-orig-row');
    origRows.forEach(tr => {
      const equipment = (tr.querySelector('.pa-equip-select') as HTMLSelectElement | null)?.value || 'GC';
      const name = (tr.querySelector('.pa-name-input') as HTMLInputElement | null)?.value?.trim() || '';
      const engName = (tr.querySelector('.pa-name-input') as HTMLInputElement | null)?.dataset?.engName || '';

      // Original (현재 행)
      const origRaw = (tr.querySelector('.pa-orig-raw') as HTMLInputElement | null)?.value?.trim() || '';
      const origDil = (tr.querySelector('.pa-orig-dil') as HTMLInputElement | null)?.value?.trim() || '1';
      const origVal = (tr.querySelector('.pa-orig-val') as HTMLInputElement | null)?.value?.trim() || '';

      // Acid (다음 형제 행)
      const acidRow = tr.nextElementSibling;
      const acidRaw = (acidRow?.querySelector('.pa-acid-raw') as HTMLInputElement | null)?.value?.trim() || '';
      const acidDil = (acidRow?.querySelector('.pa-acid-dil') as HTMLInputElement | null)?.value?.trim() || '1';
      const acidVal = (acidRow?.querySelector('.pa-acid-val') as HTMLInputElement | null)?.value?.trim() || '';

      // 최종 검출량: Original 우선, 없으면 Acid
      const value = origVal || acidVal || '';

      if (name) {
        detections.push({ equipment, name, engName, origRaw, origDil, origVal, acidRaw, acidDil, acidVal, value });
      }
    });

    allResults[logId] = {
      id: logId,
      testDate: (document.getElementById('paTestDate') as HTMLInputElement | null)?.value || '',
      judgment: (document.querySelector('input[name="paJudgment"]:checked') as HTMLInputElement | null)?.value || '',
      allNd: this._paAllNd || false,
      detections: detections,
      updatedAt: new Date().toISOString()
    };

    // 판정: 라디오 버튼 값 사용 (전체 불검출/검출 추가 시 자동 선택됨)
    const selectedJudgment = (document.querySelector('input[name="paJudgment"]:checked') as HTMLInputElement | null)?.value || '';
    if (selectedJudgment) {
      allResults[logId].judgment = selectedJudgment;
    } else if (this._paAllNd && detections.length === 0) {
      allResults[logId].judgment = 'pass';
    } else if (detections.length > 0) {
      allResults[logId].judgment = 'fail';
    }

    this.saveAllPesticideTestResults(allResults);

    // 접수 데이터 판정 동기화 (항상 반영)
    log.testResult = (allResults[logId].judgment || null) as PesticideResult;
    this.saveLogs();

    document.getElementById('pesticideAnalysisModal')?.classList.add('hidden');
    this._paLogId = null;
    this.filterAndRenderLogs();
    this.showToast('분석결과가 저장되었습니다.', 'success');
  }

  // === 분석결과 데이터 저장/로드 ===

  /**
   * 특정 시료의 분석결과 로드
   */
  private loadTestResultForLog(logId: string): PesticideTestResultData | null {
    if (!this._cachedPesticideResults) {
      this._cachedPesticideResults = this.loadAllPesticideTestResults();
    }
    return this._cachedPesticideResults[logId] || null;
  }

  /**
   * 전체 분석결과 로드
   */
  private loadAllPesticideTestResults(): Record<string, PesticideTestResultData> {
    const key = `pesticideTestResults_${this.selectedYear}`;
    try {
      const data = localStorage.getItem(key);
      if (!data) return {};
      return JSON.parse(data) || {};
    } catch (e) {
      (window.logger?.error || console.error)('잔류농약 검사 결과 로드 실패:', e);
      return {};
    }
  }

  /**
   * 전체 분석결과 저장
   */
  private saveAllPesticideTestResults(results: Record<string, PesticideTestResultData>): void {
    const key = `pesticideTestResults_${this.selectedYear}`;
    try {
      localStorage.setItem(key, JSON.stringify(results));
      this._cachedPesticideResults = results;
      this.syncPesticideTestResultsToFirestore(results);
    } catch (e) {
      (window.logger?.error || console.error)('잔류농약 검사 결과 저장 실패:', e);
    }
  }

  /**
   * Firestore로 분석결과 동기화 (업로드)
   */
  private async syncPesticideTestResultsToFirestore(results: Record<string, PesticideTestResultData>): Promise<void> {
    if (!window.firestoreDb?.isEnabled()) return;
    try {
      const year = parseInt(this.selectedYear);
      const entries = Object.entries(results);
      if (entries.length === 0) return;
      const documents = entries.map(([docKey, data]) => ({
        ...data,
        id: docKey,
        _resultKey: docKey,
      }));
      await window.firestoreDb.batchSave('pesticideTestResults', year, documents);
    } catch (e) {
      (window.logger?.error || console.error)('잔류농약 Firestore 동기화 실패:', e);
    }
  }

  /**
   * Firestore에서 분석결과 동기화 (다운로드)
   * @param requestYear - 요청 시점의 연도 (race condition 방지). 미지정 시 검증 생략.
   */
  private async syncPesticideTestResultsFromFirestore(requestYear?: string): Promise<void> {
    if (!window.firestoreDb?.isEnabled()) return;
    try {
      const year = parseInt(this.selectedYear);
      const cloudData = await window.firestoreDb.getAll('pesticideTestResults', year);

      // Race condition 방지: 요청 시점의 연도와 현재 연도가 다르면 결과 폐기
      if (requestYear && requestYear !== this.selectedYear) {
        (window.logger?.info ?? console.log)(`[잔류농약] 연도 변경 감지, 동기화 결과 폐기 (${requestYear} → ${this.selectedYear})`);
        return;
      }

      if (!cloudData || cloudData.length === 0) return;

      const cloudMap: Record<string, PesticideTestResultData> = {};
      for (const doc of cloudData) {
        const docRecord = doc as Record<string, unknown>;
        const key = (docRecord._resultKey as string) || (docRecord.id as string);
        if (key) {
          const { _resultKey: _rk, syncedAt: _sa, ...rest } = docRecord;
          void _rk; void _sa;
          cloudMap[key] = rest as PesticideTestResultData;
        }
      }

      const localResults = this.loadAllPesticideTestResults();
      // updatedAt 기준 병합 (최신 데이터 우선)
      const merged: Record<string, PesticideTestResultData> = { ...localResults };
      for (const [key, cloudVal] of Object.entries(cloudMap)) {
        const localVal = merged[key];
        if (!localVal || !localVal.updatedAt || new Date(cloudVal.updatedAt) >= new Date(localVal.updatedAt)) {
          merged[key] = cloudVal;
        }
      }
      const lsKey = `pesticideTestResults_${this.selectedYear}`;
      localStorage.setItem(lsKey, JSON.stringify(merged));
      this._cachedPesticideResults = merged;

      // 접수 데이터의 판정도 동기화 (Firestore → 접수 대장)
      // 로컬 testResult가 비어있거나 cloud의 updatedAt이 최신일 때만 덮어씀
      let syncCount = 0;
      for (const [resultId, resultData] of Object.entries(merged)) {
        const log = this.sampleLogs.find(l => String(l.id) === String(resultId));
        const judgment = (resultData as Record<string, unknown>).judgment as string | undefined;
        if (!log || !judgment) continue;

        const logRec = log as Record<string, unknown>;
        const localTestResult = logRec.testResult as string | undefined;
        const localUpdatedAt = logRec.updatedAt as string | undefined;
        const cloudUpdatedAt = (resultData as Record<string, unknown>).updatedAt as string | undefined;

        // 로컬 판정 없음 → 무조건 동기화
        // 로컬 판정 있음 → cloud가 더 최신일 때만 덮어씀
        const shouldSync = !localTestResult ||
          (cloudUpdatedAt && localUpdatedAt && new Date(cloudUpdatedAt) > new Date(localUpdatedAt));

        if (shouldSync) {
          logRec.testResult = judgment;
          syncCount++;
        }
      }
      if (syncCount > 0) {
        this.saveLogs();
        (window.logger?.info ?? console.log)(`[잔류농약] Firestore → 접수 대장 판정 동기화: ${syncCount}건`);
      }

      this.filterAndRenderLogs();
      (window.logger?.info ?? console.log)(`[잔류농약] Firestore → localStorage 동기화 완료: ${Object.keys(merged).length}건`);
    } catch (e) {
      (window.logger?.error || console.error)('잔류농약 Firestore 로드 실패:', e);
    }
  }

  private getRequestItems(): { index: number; producerAddress: string; cropName: string }[] {
    const items: { index: number; producerAddress: string; cropName: string }[] = [];
    const requestItems = this.requestItemsList?.querySelectorAll('.request-item') || [];
    requestItems.forEach((item, idx) => {
      const addressInput = item.querySelector('.request-producer-address') as HTMLInputElement | null;
      const cropInput = item.querySelector('.request-crop-name') as HTMLInputElement | null;
      const address = addressInput?.value.trim() || '';
      const crop = cropInput?.value.trim() || '';
      if (address || crop) items.push({ index: idx, producerAddress: address, cropName: crop });
    });
    return items;
  }

  /**
   * 의뢰 항목 초기화
   */
  private resetRequestItems(): void {
    const items = this.requestItemsList?.querySelectorAll('.request-item') || [];
    items.forEach((item, idx) => {
      if (idx === 0) {
        const addressInput = item.querySelector('.request-producer-address') as HTMLInputElement | null;
        const cropInput = item.querySelector('.request-crop-name') as HTMLInputElement | null;
        if (addressInput) addressInput.value = '';
        if (cropInput) cropInput.value = '';
      } else {
        item.remove();
      }
    });
    this.requestItemCounter = 1;
    if (typeof (this as any).updateRemoveButtonsVisibility === 'function') {
      (this as any).updateRemoveButtonsVisibility();
    }
  }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && (module as any).exports) {
  (module as any).exports = PesticideSampleManager;
} else {
  (window as any).PesticideSampleManager = PesticideSampleManager;
}

export default PesticideSampleManager;
