// ========================================
// Compost Sample Manager
// 퇴·액비 시료 관리 클래스
// ========================================

/**
 * 퇴·액비 시료 관리 매니저
 * BaseSampleManager를 확장하여 퇴·액비 특화 기능 구현
 */
class CompostSampleManager extends BaseSampleManager {
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
    async init() {
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
    cacheElements() {
        this.form = document.getElementById('sampleForm');
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.querySelector('.empty-state');
        this.recordCountEl = document.getElementById('recordCount');

        this.log('cacheElements - tableBody:', !!this.tableBody);
    }

    /**
     * 퇴·액비 전용 요소 초기화
     */
    initCompostSpecificElements() {
        // 법인/개인 선택 처리
        const applicantTypeSelect = document.getElementById('applicantType');
        if (applicantTypeSelect) {
            this.setupApplicantTypeToggle(applicantTypeSelect);
        }

        // 법인번호 포맷팅
        const corpNumberInput = document.getElementById('corpNumber');
        if (corpNumberInput) {
            this.setupCorpNumberFormatting(corpNumberInput);
        }

        // 주소 자동완성
        if (window.setupAddressAutocomplete) {
            window.setupAddressAutocomplete();
        }
    }

    /**
     * 법인/개인 선택 토글 설정
     */
    setupApplicantTypeToggle(select) {
        const birthDateField = document.getElementById('birthDateField');
        const corpNumberField = document.getElementById('corpNumberField');
        const birthDateInput = document.getElementById('birthDate');
        const corpNumberInput = document.getElementById('corpNumber');

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
    setupCorpNumberFormatting(input) {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length > 13) value = value.slice(0, 13);
            if (value.length > 6) {
                value = value.slice(0, 6) + '-' + value.slice(6);
            }
            e.target.value = value;
        });
    }

    /**
     * 로그 렌더링 (퇴·액비 테이블)
     */
    renderLogs(logs) {
        this.log('renderLogs 호출, logs:', logs ? logs.length : 0, '건');

        if (!this.tableBody) {
            console.error(`[${this.moduleName}] tableBody가 없음!`);
            return;
        }

        // PaginationManager 초기화 (아직 없으면)
        if (!this.paginationManager && window.PaginationManager) {
            this.paginationManager = new window.PaginationManager({
                storageKey: 'compostItemsPerPage',
                defaultItemsPerPage: 100,
                onPageChange: () => {
                    this.updateRecordCount();
                },
                renderRow: (log) => this.createTableRow(log)
            });

            this.paginationManager.setTableElements(this.tableBody, this.emptyState);
        }

        // PaginationManager 사용
        if (this.paginationManager) {
            this.log('paginationManager.setData 호출');
            this.paginationManager.setData(logs || []);
            this.paginationManager.render();
        } else {
            this.log('paginationManager 없음, 직접 렌더링');
            this.directRender(logs);
        }

        this.updateRecordCount();
    }

    /**
     * 직접 렌더링 (폴백)
     */
    directRender(logs) {
        this.tableBody.innerHTML = '';

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
            this.tableBody.appendChild(row);
        });
    }

    /**
     * 테이블 행 생성 - 퇴·액비 전용
     */
    createTableRow(log) {
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
        const escapeHTML = (str) => {
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
        const farmAreaValue = log.farmArea ? parseInt(log.farmArea, 10).toLocaleString('ko-KR') : '-';
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
    getSampleTypeBadge(type) {
        const typeMap = {
            '가축분퇴비': { class: 'compost', icon: '🌿' },
            '가축분뇨발효액': { class: 'liquid', icon: '💧' }
        };
        const config = typeMap[type] || { class: 'other', icon: '📦' };
        return `<span class="sample-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    /**
     * 축종 배지 생성
     */
    getAnimalTypeBadge(type) {
        const typeMap = {
            '소': { class: 'cow', icon: '🐄' },
            '돼지': { class: 'pig', icon: '🐷' },
            '닭·오리 등': { class: 'chicken', icon: '🐔' }
        };
        const config = typeMap[type] || { class: 'other', icon: '🐾' };
        return `<span class="animal-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    /**
     * 단위 레이블 가져오기
     */
    getUnitLabel(unit) {
        const unitMap = {
            'pyeong': '평',
            'm2': '㎡',
            'ha': 'ha'
        };
        return unitMap[unit] || '평';
    }

    /**
     * 폼 데이터 가져오기
     */
    getFormData() {
        const formData = new FormData(this.form);

        const applicantType = formData.get('applicantType') || '개인';

        return {
            receptionNumber: formData.get('receptionNumber'),
            date: formData.get('date'),
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
            corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
            farmName: formData.get('farmName'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            addressPostcode: formData.get('addressPostcode'),
            addressRoad: formData.get('addressRoad'),
            addressDetail: formData.get('addressDetail'),
            address: formData.get('address'),
            farmAddress: formData.get('farmAddress'),
            farmArea: formData.get('farmArea'),
            farmAreaUnit: formData.get('farmAreaUnit') || 'pyeong',
            sampleType: formData.get('sampleType'),
            animalType: formData.get('animalType'),
            receptionMethod: formData.get('receptionMethod'),
            note: formData.get('note'),
            isComplete: false,
            testResult: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * 폼에 데이터 채우기
     */
    populateForm(log) {
        // 법인/개인 선택
        const applicantType = log.applicantType || '개인';
        const applicantTypeSelect = document.getElementById('applicantType');
        if (applicantTypeSelect) {
            applicantTypeSelect.value = applicantType;
            applicantTypeSelect.dispatchEvent(new Event('change'));
        }

        // 기본 필드
        document.getElementById('receptionNumber').value = log.receptionNumber || '';
        document.getElementById('date').value = log.date || '';

        if (applicantType === '개인' && document.getElementById('birthDate')) {
            document.getElementById('birthDate').value = log.birthDate || '';
        }
        if (applicantType === '법인' && document.getElementById('corpNumber')) {
            document.getElementById('corpNumber').value = log.corpNumber || '';
        }

        document.getElementById('farmName').value = log.farmName || log.companyName || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        document.getElementById('addressPostcode').value = log.addressPostcode || '';
        document.getElementById('addressRoad').value = log.addressRoad || '';
        document.getElementById('addressDetail').value = log.addressDetail || '';
        document.getElementById('address').value = log.address || '';
        document.getElementById('farmAddress').value = log.farmAddress || '';
        document.getElementById('farmArea').value = log.farmArea || '';

        const farmAreaUnitSelect = document.getElementById('farmAreaUnit');
        if (farmAreaUnitSelect) {
            farmAreaUnitSelect.value = log.farmAreaUnit || 'pyeong';
        }

        const sampleTypeSelect = document.getElementById('sampleType');
        if (sampleTypeSelect) {
            sampleTypeSelect.value = log.sampleType || '가축분퇴비';
        }

        const animalTypeSelect = document.getElementById('animalType');
        if (animalTypeSelect) {
            animalTypeSelect.value = log.animalType || '';
        }

        const receptionMethodInput = document.getElementById('receptionMethod');
        if (receptionMethodInput) {
            receptionMethodInput.value = log.receptionMethod || '직접수령';
        }

        // 통보방법 버튼 활성화
        const methodBtns = document.querySelectorAll('.reception-method-btn');
        methodBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.method === log.receptionMethod);
        });

        const noteInput = document.getElementById('note');
        if (noteInput) {
            noteInput.value = log.note || '';
        }
    }

    /**
     * 폼 초기화
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }

        // 법인/개인 기본값 설정
        const applicantTypeSelect = document.getElementById('applicantType');
        if (applicantTypeSelect) {
            applicantTypeSelect.value = '개인';
            applicantTypeSelect.dispatchEvent(new Event('change'));
        }

        // 통보방법 기본값 설정
        const methodBtns = document.querySelectorAll('.reception-method-btn');
        methodBtns.forEach((btn, index) => {
            btn.classList.toggle('active', index === 0);
        });

        const receptionMethodInput = document.getElementById('receptionMethod');
        if (receptionMethodInput) {
            receptionMethodInput.value = '직접수령';
        }

        // 다음 접수번호 설정
        const nextNumber = this.generateNextReceptionNumber();
        const receptionNumberInput = document.getElementById('receptionNumber');
        if (receptionNumberInput && nextNumber) {
            receptionNumberInput.value = nextNumber;
        }

        this.editingId = null;
    }

    /**
     * 폼 제출
     */
    async submitForm() {
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
        const newLog = {
            ...baseData,
            id: this.generateId()
        };

        this.sampleLogs.push(newLog);
        await this.saveLogs();

        this.showToast('등록되었습니다.', 'success');
        this.resetForm();

        // 연속 입력 모드 확인
        const continuousInput = document.getElementById('continuousInput');
        if (!continuousInput || !continuousInput.checked) {
            this.switchView('list');
        } else {
            const nextNumber = this.generateNextReceptionNumber();
            const receptionNumberInput = document.getElementById('receptionNumber');
            if (receptionNumberInput && nextNumber) {
                receptionNumberInput.value = nextNumber;
            }
        }
    }

    /**
     * 샘플 편집
     */
    editSample(id) {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        this.populateForm(log);
        this.editingId = String(id);
        this.switchView('form');
    }

    /**
     * 다음 접수번호 생성
     */
    generateNextReceptionNumber() {
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
    toggleComplete(id) {
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
    toggleResult(id) {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            if (!log.testResult || log.testResult === '') {
                log.testResult = 'pass';
            } else if (log.testResult === 'pass') {
                log.testResult = 'fail';
            } else {
                log.testResult = '';
            }
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.filterAndRenderLogs();
        }
    }
}

// 전역 인스턴스 생성
let compostManager = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    compostManager = new CompostSampleManager();
    await compostManager.init();

    // 전역으로 노출 (기존 호환성)
    window.compostManager = compostManager;

    // compost-script.js 호환 함수들
    window.toggleComplete = (id) => compostManager.toggleComplete(id);
    window.toggleResult = (id) => compostManager.toggleResult(id);
    window.editSample = (id) => compostManager.editSample(id);
    window.deleteSample = (id) => {
        if (confirm('이 항목을 삭제하시겠습니까?')) {
            compostManager.deleteSample(id);
        }
    };
});
