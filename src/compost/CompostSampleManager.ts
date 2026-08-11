// ========================================
// Compost Sample Manager
// 퇴·액비 시료 관리 클래스
// ========================================

import type { CompostSample } from '../types/sample-types';
import { BaseSampleManager } from '../shared/BaseSampleManager';

/**
 * 퇴·액비 시료 관리 매니저
 * BaseSampleManager를 확장하여 퇴·액비 특화 기능 구현
 */
class CompostSampleManager extends BaseSampleManager<CompostSample> {
    constructor() {
        super({
            moduleKey: 'compost',
            moduleName: '퇴·액비',
            storageKey: 'compostSampleLogs',
            debug: window.DEBUG || false
        });
    }

    /**
     * 초기화 - 부모 클래스 초기화 + 퇴·액비 특화 초기화
     */
    async init(): Promise<void> {
        this.log('CompostSampleManager 초기화 시작');
        await super.init();
        this.log('부모 클래스 초기화 완료');

        // 퇴·액비 전용 초기화
        this.initCompostSpecificElements();

        this.log('초기화 완료, sampleLogs:', this.sampleLogs?.length || 0, '건');
    }

    /**
     * DOM 요소 캐싱 오버라이드 - Compost 모듈용 ID 사용
     */
    override cacheElements(): void {
        this.form = document.getElementById('sampleForm') as HTMLFormElement;
        this.tableBody = document.getElementById('logTableBody') as HTMLTableSectionElement;
        this.emptyState = document.querySelector('.empty-state') as HTMLElement;
        this.recordCountEl = document.getElementById('recordCount') as HTMLElement;

        this.log('cacheElements - tableBody:', !!this.tableBody);
    }

    /**
     * 퇴·액비 전용 요소 초기화
     */
    initCompostSpecificElements(): void {
        // 법인/개인 선택 처리
        const applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
        if (applicantTypeSelect) {
            this.setupApplicantTypeToggle(applicantTypeSelect);
        }

        // 법인번호 포맷팅
        const corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement | null;
        if (corpNumberInput) {
            this.setupCorpNumberFormatting(corpNumberInput);
        }

        // 주소 자동완성
        if ((window as Window & { setupAddressAutocomplete?: () => void }).setupAddressAutocomplete) {
            (window as Window & { setupAddressAutocomplete?: () => void }).setupAddressAutocomplete!();
        }
    }

    /**
     * 법인/개인 선택 토글 설정
     */
    setupApplicantTypeToggle(select: HTMLSelectElement): void {
        const birthDateField = document.getElementById('birthDateField') as HTMLElement | null;
        const corpNumberField = document.getElementById('corpNumberField') as HTMLElement | null;
        const birthDateInput = document.getElementById('birthDate') as HTMLInputElement | null;
        const corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement | null;

        select.addEventListener('change', () => {
            const isCorpSelected = select.value === '법인';
            if (isCorpSelected) {
                birthDateField?.classList.add('hidden');
                corpNumberField?.classList.remove('hidden');
                if (birthDateInput) birthDateInput.value = '';
            } else {
                birthDateField?.classList.remove('hidden');
                corpNumberField?.classList.add('hidden');
                if (corpNumberInput) corpNumberInput.value = '';
            }
        });
    }

    /**
     * 법인번호 포맷팅 설정 (######-#######)
     */
    setupCorpNumberFormatting(input: HTMLInputElement): void {
        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            let value = target.value.replace(/[^0-9]/g, '');
            if (value.length > 13) value = value.slice(0, 13);
            if (value.length > 6) {
                value = value.slice(0, 6) + '-' + value.slice(6);
            }
            target.value = value;
        });
    }

    /**
     * 타입별 추가 이벤트 설정 (퇴·액비 전용)
     */
    protected override setupTypeSpecificEvents(): void {
        // 추가 이벤트 설정은 initCompostSpecificElements에서 처리
    }

    /**
     * 로그 렌더링 (퇴·액비 테이블)
     */
    override renderLogs(logs: CompostSample[]): void {
        this.log('renderLogs 호출, logs:', logs ? logs.length : 0, '건');

        if (!this.tableBody) {
            (window.logger?.error || console.error)(`[${this.moduleName}] tableBody가 없음!`);
            return;
        }

        // PaginationManager 초기화 (아직 없으면)
        if (!this.pagination && window.PaginationManager) {
            this.pagination = new window.PaginationManager({
                storageKey: 'compostItemsPerPage',
                defaultItemsPerPage: 100,
                onPageChange: () => {
                    this.updateRecordCount();
                },
                renderRow: (item: unknown, _index: number) => this.createTableRow(item as CompostSample)
            });

            this.pagination.setTableElements(this.tableBody, this.emptyState);
        }

        // PaginationManager 사용
        if (this.pagination) {
            this.log('pagination.setData 호출');
            this.pagination.setData(logs || []);
            if (this.pagination.render) {
                this.pagination.render();
            }
        } else {
            this.log('pagination 없음, 직접 렌더링');
            this.directRender(logs);
        }

        this.updateRecordCount();
    }

    /**
     * 직접 렌더링 (폴백)
     */
    directRender(logs: CompostSample[]): void {
        this.tableBody!.innerHTML = '';

        const safeLog = logs || [];

        if (safeLog.length === 0) {
            if (this.emptyState) {
                this.emptyState.style.display = 'flex';
            }
            return;
        }

        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }

        safeLog.forEach(log => {
            const row = this.createTableRow(log);
            this.tableBody!.appendChild(row);
        });
    }

    /**
     * 테이블 행 생성 - 퇴·액비 전용
     */
    createTableRow(log: CompostSample): HTMLTableRowElement {
        const row = document.createElement('tr');
        row.dataset.id = log.id;

        // 완료 여부 스타일
        if (log.isComplete) {
            row.classList.add('row-completed');
        }

        // 법인 여부 확인
        const applicantType = log.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

        // 주소 조합
        const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

        // XSS 방지 함수
        const escapeHTML = (str: string): string => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // 안전한 값 생성
        const safeFarmName = escapeHTML(log.farmName || log.companyName || '-');
        const safeName = escapeHTML(log.name || '-');
        const safeFullAddress = escapeHTML(fullAddress);
        const safeFarmAddress = escapeHTML(log.farmAddress || '-');
        const safePhone = escapeHTML(log.phoneNumber || '-');
        const safeNote = escapeHTML(log.note || '-');

        // 1. Checkbox
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'col-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.dataset.id = log.id;
        tdCheckbox.appendChild(checkbox);
        row.appendChild(tdCheckbox);

        // 2. 완료 버튼
        const tdComplete = document.createElement('td');
        tdComplete.className = 'col-complete';
        const btnComplete = document.createElement('button');
        btnComplete.className = `btn-complete ${log.isComplete ? 'completed' : ''}`;
        btnComplete.dataset.id = log.id;
        btnComplete.title = log.isComplete ? '완료됨' : '완료 표시';
        btnComplete.textContent = log.isComplete ? '✅' : '⬜';
        tdComplete.appendChild(btnComplete);
        row.appendChild(tdComplete);

        // 3. 판정 버튼
        const tdResult = document.createElement('td');
        tdResult.className = 'col-result';
        const btnResult = document.createElement('button');
        btnResult.className = `btn-result ${log.testResult === 'pass' ? 'pass' : log.testResult === 'fail' ? 'fail' : ''}`;
        btnResult.dataset.id = log.id;
        btnResult.title = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
        btnResult.textContent = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '-';
        tdResult.appendChild(btnResult);
        row.appendChild(tdResult);

        // 4. 접수번호
        const tdReceptionNumber = document.createElement('td');
        tdReceptionNumber.textContent = log.receptionNumber || '-';
        row.appendChild(tdReceptionNumber);

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

        // 8. 농장명
        const tdFarmName = document.createElement('td');
        tdFarmName.textContent = safeFarmName;
        row.appendChild(tdFarmName);

        // 9. 성명
        const tdName = document.createElement('td');
        tdName.textContent = safeName;
        row.appendChild(tdName);

        // 10. 우편번호 (hidden)
        const tdPostcode = document.createElement('td');
        tdPostcode.className = 'col-postcode col-hidden';
        tdPostcode.textContent = log.addressPostcode || '-';
        row.appendChild(tdPostcode);

        // 11. 주소
        const tdAddress = document.createElement('td');
        tdAddress.className = 'col-address text-truncate';
        tdAddress.dataset.tooltip = safeFullAddress;
        tdAddress.textContent = safeFullAddress;
        row.appendChild(tdAddress);

        // 12. 농장주소 (전체 표시)
        const tdFarmAddress = document.createElement('td');
        tdFarmAddress.className = 'col-farm-address';
        tdFarmAddress.textContent = safeFarmAddress;
        row.appendChild(tdFarmAddress);

        // 13. 농장면적
        const tdFarmArea = document.createElement('td');
        const farmAreaValue = log.farmArea ? parseInt(String(log.farmArea), 10).toLocaleString('ko-KR') : '-';
        const farmAreaUnit = this.getUnitLabel(log.farmAreaUnit);
        tdFarmArea.textContent = log.farmArea ? `${farmAreaValue} ${farmAreaUnit}` : '-';
        row.appendChild(tdFarmArea);

        // 14. 시료종류 배지
        const tdSampleType = document.createElement('td');
        tdSampleType.innerHTML = this.getSampleTypeBadge(log.sampleType);
        row.appendChild(tdSampleType);

        // 15. 축종 배지
        const tdAnimalType = document.createElement('td');
        tdAnimalType.innerHTML = this.getAnimalTypeBadge(log.animalType);
        row.appendChild(tdAnimalType);

        // 16. 연락처
        const tdPhoneNumber = document.createElement('td');
        tdPhoneNumber.textContent = safePhone;
        row.appendChild(tdPhoneNumber);

        // 17. 통보방법
        const tdReceptionMethod = document.createElement('td');
        tdReceptionMethod.textContent = log.receptionMethod || '-';
        row.appendChild(tdReceptionMethod);

        // 18. 비고
        const tdNote = document.createElement('td');
        tdNote.className = 'col-note';
        tdNote.textContent = safeNote;
        row.appendChild(tdNote);

        // 19. 관리 (수정/삭제 버튼)
        const tdAction = document.createElement('td');
        tdAction.className = 'col-action';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'table-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.dataset.id = log.id;
        editBtn.textContent = '수정';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.dataset.id = log.id;
        deleteBtn.textContent = '삭제';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        tdAction.appendChild(actionsDiv);
        row.appendChild(tdAction);

        return row;
    }

    /**
     * 시료 종류 배지 생성
     */
    getSampleTypeBadge(type?: string): string {
        const typeMap: Record<string, { class: string; icon: string }> = {
            '가축분퇴비': { class: 'compost', icon: '🌿' },
            '가축분뇨발효액': { class: 'liquid', icon: '💧' }
        };
        const config = type ? (typeMap[type] || { class: 'other', icon: '📦' }) : { class: 'other', icon: '📦' };
        return `<span class="sample-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    /**
     * 축종 배지 생성
     */
    getAnimalTypeBadge(type?: string): string {
        const typeMap: Record<string, { class: string; icon: string }> = {
            '소': { class: 'cow', icon: '🐄' },
            '돼지': { class: 'pig', icon: '🐷' },
            '닭·오리 등': { class: 'chicken', icon: '🐔' }
        };
        const config = type ? (typeMap[type] || { class: 'other', icon: '🐾' }) : { class: 'other', icon: '🐾' };
        return `<span class="animal-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    /**
     * 단위 레이블 가져오기
     */
    getUnitLabel(unit?: string): string {
        const unitMap: Record<string, string> = {
            'pyeong': '평',
            'm2': '㎡',
            'ha': 'ha'
        };
        return unit ? (unitMap[unit] || '평') : '평';
    }

    /**
     * 폼 데이터 가져오기
     */
    getFormData(): Partial<CompostSample> {
        const formData = new FormData(this.form!);

        const applicantType = (formData.get('applicantType') as string) || '개인';

        return {
            receptionNumber: formData.get('receptionNumber') as string,
            date: formData.get('date') as string,
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? (formData.get('birthDate') as string) : '',
            corpNumber: applicantType === '법인' ? (formData.get('corpNumber') as string) : '',
            farmName: formData.get('farmName') as string,
            name: formData.get('name') as string,
            phoneNumber: formData.get('phoneNumber') as string,
            addressPostcode: formData.get('addressPostcode') as string,
            addressRoad: formData.get('addressRoad') as string,
            addressDetail: formData.get('addressDetail') as string,
            address: formData.get('address') as string,
            farmAddress: formData.get('farmAddress') as string,
            farmArea: formData.get('farmArea') as string,
            farmAreaUnit: (formData.get('farmAreaUnit') as 'pyeong' | 'm2' | 'ha') || 'pyeong',
            sampleType: formData.get('sampleType') as string,
            animalType: formData.get('animalType') as string,
            receptionMethod: formData.get('receptionMethod') as string,
            note: formData.get('note') as string,
            isComplete: false,
            testResult: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * 폼에 데이터 채우기
     */
    populateForm(log: CompostSample): void {
        // 법인/개인 선택
        const applicantType = log.applicantType || '개인';
        const applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
        if (applicantTypeSelect) {
            applicantTypeSelect.value = applicantType;
            applicantTypeSelect.dispatchEvent(new Event('change'));
        }

        // 기본 필드
        (document.getElementById('receptionNumber') as HTMLInputElement).value = log.receptionNumber || '';
        (document.getElementById('date') as HTMLInputElement).value = log.date || '';

        if (applicantType === '개인') {
            const birthDateInput = document.getElementById('birthDate') as HTMLInputElement | null;
            if (birthDateInput) birthDateInput.value = log.birthDate || '';
        }
        if (applicantType === '법인') {
            const corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement | null;
            if (corpNumberInput) corpNumberInput.value = log.corpNumber || '';
        }

        (document.getElementById('farmName') as HTMLInputElement).value = log.farmName || log.companyName || '';
        (document.getElementById('name') as HTMLInputElement).value = log.name || '';
        (document.getElementById('phoneNumber') as HTMLInputElement).value = log.phoneNumber || '';
        (document.getElementById('addressPostcode') as HTMLInputElement).value = log.addressPostcode || '';
        (document.getElementById('addressRoad') as HTMLInputElement).value = log.addressRoad || '';
        (document.getElementById('addressDetail') as HTMLInputElement).value = log.addressDetail || '';
        (document.getElementById('address') as HTMLInputElement).value = log.address || '';
        // 레거시 데이터 폴백: addressRoad가 없으면 address 파싱
        if (!log.addressRoad && log.address) {
            const m = log.address.match(/^\((\d{5})\)\s*(.+)$/);
            const postcodeEl = document.getElementById('addressPostcode') as HTMLInputElement | null;
            const roadEl = document.getElementById('addressRoad') as HTMLInputElement | null;
            if (m) {
                if (postcodeEl) postcodeEl.value = postcodeEl.value || m[1];
                if (roadEl) roadEl.value = m[2];
            } else {
                if (roadEl) roadEl.value = log.address;
            }
        }
        (document.getElementById('farmAddress') as HTMLInputElement).value = log.farmAddress || '';
        (document.getElementById('farmArea') as HTMLInputElement).value = String(log.farmArea || '');

        const farmAreaUnitSelect = document.getElementById('farmAreaUnit') as HTMLSelectElement | null;
        if (farmAreaUnitSelect) {
            farmAreaUnitSelect.value = log.farmAreaUnit || 'pyeong';
        }

        const sampleTypeSelect = document.getElementById('sampleType') as HTMLSelectElement | null;
        if (sampleTypeSelect) {
            sampleTypeSelect.value = log.sampleType || '가축분퇴비';
        }

        const animalTypeSelect = document.getElementById('animalType') as HTMLSelectElement | null;
        if (animalTypeSelect) {
            animalTypeSelect.value = log.animalType || '';
        }

        const receptionMethodInput = document.getElementById('receptionMethod') as HTMLInputElement | null;
        if (receptionMethodInput) {
            receptionMethodInput.value = log.receptionMethod || '직접수령';
        }

        // 통보방법 버튼 활성화
        const methodBtns = document.querySelectorAll('.reception-method-btn');
        methodBtns.forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.method === log.receptionMethod);
        });

        const noteInput = document.getElementById('note') as HTMLTextAreaElement | null;
        if (noteInput) {
            noteInput.value = log.note || '';
        }
    }

    /**
     * 폼 초기화
     */
    override resetForm(): void {
        if (this.form) {
            this.form.reset();
        }

        // 법인/개인 기본값 설정
        const applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
        if (applicantTypeSelect) {
            applicantTypeSelect.value = '개인';
            applicantTypeSelect.dispatchEvent(new Event('change'));
        }

        // 통보방법 기본값 설정
        const methodBtns = document.querySelectorAll('.reception-method-btn');
        methodBtns.forEach((btn, index) => {
            (btn as HTMLElement).classList.toggle('active', index === 0);
        });

        const receptionMethodInput = document.getElementById('receptionMethod') as HTMLInputElement | null;
        if (receptionMethodInput) {
            receptionMethodInput.value = '직접수령';
        }

        // 다음 접수번호 설정
        const nextNumber = this.generateNextReceptionNumber();
        const receptionNumberInput = document.getElementById('receptionNumber') as HTMLInputElement | null;
        if (receptionNumberInput && nextNumber) {
            receptionNumberInput.value = nextNumber;
        }

        this.editingId = null;
    }

    /**
     * 폼 제출
     */
    async submitForm(): Promise<void> {
        const baseData = this.getFormData();

        // 유효성 검사
        if (!baseData.receptionNumber) {
            this.showToast('접수번호를 입력하세요.', 'error');
            return;
        }

        // 편집 모드
        if (this.editingId) {
            const existingLog = this.sampleLogs.find(l => String(l.id) === this.editingId);
            if (existingLog) {
                Object.assign(existingLog, baseData, {
                    id: existingLog.id,
                    createdAt: existingLog.createdAt
                });
                await this.saveLogs();
                this.showToast('수정되었습니다.', 'success');
                this.resetForm();
                this.switchView('list');
            }
            return;
        }

        // 새로 추가
        const newLog: CompostSample = {
            ...baseData,
            id: this.generateId()
        } as CompostSample;

        this.sampleLogs.push(newLog);
        await this.saveLogs();

        this.showToast('등록되었습니다.', 'success');
        this.resetForm();

        // 연속 입력 모드 확인
        const continuousInput = document.getElementById('continuousInput') as HTMLInputElement | null;
        if (!continuousInput || !continuousInput.checked) {
            this.switchView('list');
        } else {
            const nextNumber = this.generateNextReceptionNumber();
            const receptionNumberInput = document.getElementById('receptionNumber') as HTMLInputElement | null;
            if (receptionNumberInput && nextNumber) {
                receptionNumberInput.value = nextNumber;
            }
        }
    }

    /**
     * 샘플 편집
     */
    editSample(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        this.populateForm(log);
        this.editingId = String(id);
        this.switchView('form');
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

    /**
     * 완료 토글 (compost-script.js 호환)
     */
    toggleComplete(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            log.isComplete = !log.isComplete;
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.filterAndRenderLogs();
        }
    }

    /**
     * 판정 결과 토글 (미판정 → 적합 → 부적합 → 미판정)
     */
    toggleResult(id: string): void {
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
}

// 전역 인스턴스 생성
let compostManager: CompostSampleManager | null = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    compostManager = new CompostSampleManager();
    await compostManager.init();

    // 전역으로 노출 (기존 호환성)
    window.compostManager = compostManager;

    // compost-script.js 호환 함수들
    window.toggleComplete = (id: string) => compostManager!.toggleComplete(id);
    window.toggleResult = (id: string) => compostManager!.toggleResult(id);
    window.editSample = (id: string) => compostManager!.editSample(id);
    window.deleteSample = (id: string) => {
        if (confirm('이 항목을 삭제하시겠습니까?')) {
            compostManager!.deleteSample(id);
        }
    };
});

export { CompostSampleManager };
