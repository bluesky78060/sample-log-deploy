// ========================================
// Heavy Metal Sample Manager
// 토양중금속 시료 관리 클래스
// ========================================

/**
 * 토양중금속 시료 관리 매니저
 * BaseSampleManager를 확장하여 토양중금속 특화 기능 구현
 */
class HeavyMetalSampleManager extends BaseSampleManager {
    constructor() {
        super({
            moduleKey: 'heavy-metal',
            moduleName: '토양중금속',
            storageKey: 'heavyMetalSampleLogs',
            debug: window.DEBUG || false
        });

        // 분석항목 목록
        this.ANALYSIS_ITEMS = ['구리', '납', '비소', '수은', '카드뮴', '크롬', '아연', '니켈'];

        // 토양중금속 전용 상태
        this.isAllSelected = false;
    }

    /**
     * 초기화 - 부모 클래스 초기화 + 토양중금속 특화 초기화
     */
    async init() {
        this.log('🔬 HeavyMetalSampleManager 초기화 시작');
        await super.init();
        this.log('✅ 부모 클래스 초기화 완료');

        // 토양중금속 전용 초기화
        this.initAnalysisItems();
        this.initPurposeHandling();
        this.initAddressModal();
        this.initSamplingLocationAutocomplete();
        this.initCropModal();

        this.log('✅ 토양중금속 초기화 완료, sampleLogs:', this.sampleLogs?.length || 0, '건');
    }

    /**
     * DOM 요소 캐싱 오버라이드
     */
    cacheElements() {
        this.form = document.getElementById('sampleForm');
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');
        this.recordCountEl = document.getElementById('recordCount');

        this.log('📦 cacheElements - tableBody:', !!this.tableBody);
    }

    /**
     * 분석항목 체크박스 초기화
     */
    initAnalysisItems() {
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]');
        const selectAllItemsBtn = document.getElementById('selectAllItemsBtn');
        const selectedItemsCount = document.getElementById('selectedItemsCount');

        if (selectAllItemsBtn) {
            selectAllItemsBtn.addEventListener('click', () => {
                this.isAllSelected = !this.isAllSelected;
                analysisCheckboxes.forEach(cb => cb.checked = this.isAllSelected);
                selectAllItemsBtn.textContent = this.isAllSelected ? '전체 해제' : '전체 선택';
                this.updateSelectedItemsCount();
            });
        }

        analysisCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.updateSelectedItemsCount());
        });

        this.updateSelectedItemsCount();
    }

    /**
     * 선택된 분석항목 개수 업데이트
     */
    updateSelectedItemsCount() {
        const selectedItemsCount = document.getElementById('selectedItemsCount');
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]:checked');

        if (selectedItemsCount) {
            selectedItemsCount.textContent = `${analysisCheckboxes.length}개 선택됨`;
        }
    }

    /**
     * 목적 라디오 버튼 처리 (인증용 안내)
     */
    initPurposeHandling() {
        const purposeRadios = document.querySelectorAll('input[name="purpose"]');
        const certificationNotice = document.getElementById('certificationNotice');

        purposeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (certificationNotice) {
                    if (radio.value === '인증용') {
                        certificationNotice.classList.remove('hidden');
                    } else {
                        certificationNotice.classList.add('hidden');
                    }
                }
            });
        });
    }

    /**
     * 주소 검색 모달 초기화
     */
    initAddressModal() {
        const searchAddressBtn = document.getElementById('searchAddressBtn');
        const addressModal = document.getElementById('addressModal');
        const closeAddressModalBtn = document.getElementById('closeAddressModal');

        if (searchAddressBtn && addressModal) {
            searchAddressBtn.addEventListener('click', () => {
                this.openAddressModal();
            });
        }

        if (closeAddressModalBtn && addressModal) {
            closeAddressModalBtn.addEventListener('click', () => {
                addressModal.style.display = 'none';
            });
        }
    }

    /**
     * 주소 검색 모달 열기
     */
    openAddressModal() {
        const addressModal = document.getElementById('addressModal');
        const daumPostcodeContainer = document.getElementById('daumPostcodeContainer');

        if (!addressModal || !daumPostcodeContainer) return;

        addressModal.style.display = 'block';

        // Daum 우편번호 API 초기화
        if (window.kakao && window.kakao.Postcode) {
            new window.kakao.Postcode({
                oncomplete: (data) => {
                    document.getElementById('addressPostcode').value = data.zonecode;
                    document.getElementById('addressRoad').value = data.roadAddress;
                    document.getElementById('address').value = data.roadAddress;
                    addressModal.style.display = 'none';
                    document.getElementById('addressDetail').focus();
                }
            }).embed(daumPostcodeContainer);
        }
    }

    /**
     * 채취장소 자동완성 초기화
     */
    initSamplingLocationAutocomplete() {
        const samplingLocationInput = document.getElementById('samplingLocation');
        const samplingLocationAutocomplete = document.getElementById('samplingLocationAutocomplete');

        if (samplingLocationInput && samplingLocationAutocomplete && window.bonghwaData) {
            samplingLocationInput.addEventListener('input', () => {
                const query = samplingLocationInput.value.trim();
                if (!query) {
                    samplingLocationAutocomplete.innerHTML = '';
                    samplingLocationAutocomplete.style.display = 'none';
                    return;
                }

                const matches = window.bonghwaData.filter(item =>
                    item.includes(query)
                ).slice(0, 10);

                if (matches.length > 0) {
                    samplingLocationAutocomplete.innerHTML = matches
                        .map(item => `<div class="autocomplete-item">${item}</div>`)
                        .join('');
                    samplingLocationAutocomplete.style.display = 'block';

                    // 자동완성 항목 클릭 이벤트
                    samplingLocationAutocomplete.querySelectorAll('.autocomplete-item').forEach(el => {
                        el.addEventListener('click', () => {
                            samplingLocationInput.value = el.textContent;
                            samplingLocationAutocomplete.style.display = 'none';
                        });
                    });
                } else {
                    samplingLocationAutocomplete.style.display = 'none';
                }
            });

            // 외부 클릭 시 자동완성 닫기
            document.addEventListener('click', (e) => {
                if (!samplingLocationInput.contains(e.target)) {
                    samplingLocationAutocomplete.style.display = 'none';
                }
            });
        }
    }

    /**
     * 작물 검색 모달 초기화
     */
    initCropModal() {
        const searchCropBtn = document.getElementById('searchCropBtn');
        const cropModal = document.getElementById('cropModal');

        if (searchCropBtn && cropModal && window.initCropModal) {
            window.initCropModal();
        }
    }

    /**
     * 폼 데이터 가져오기
     */
    getFormData() {
        const formData = new FormData(this.form);
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]:checked');
        const analysisItems = Array.from(analysisCheckboxes).map(cb => cb.value);

        return {
            receptionNumber: formData.get('receptionNumber'),
            date: formData.get('date'),
            applicantType: formData.get('applicantType') || '개인',
            birthDate: formData.get('birthDate'),
            corpNumber: formData.get('corpNumber'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            addressPostcode: formData.get('addressPostcode'),
            addressRoad: formData.get('addressRoad'),
            addressDetail: formData.get('addressDetail'),
            samplingLocation: formData.get('samplingLocation'),
            samplingDate: formData.get('samplingDate'),
            cropName: formData.get('cropName'),
            analysisItems: analysisItems,
            purpose: formData.get('purpose'),
            receptionMethod: formData.get('receptionMethod'),
            note: formData.get('note')
        };
    }

    /**
     * 폼에 데이터 채우기
     */
    populateForm(log) {
        // 신청인 유형 설정
        const applicantType = log.applicantType || '개인';
        const typeRadios = document.querySelectorAll('input[name="applicantType"]');
        typeRadios.forEach(radio => {
            radio.checked = radio.value === applicantType;
        });

        // 기본 필드
        document.getElementById('receptionNumber').value = log.receptionNumber || '';
        document.getElementById('date').value = log.date || '';

        if (applicantType === '개인' && document.getElementById('birthDate')) {
            document.getElementById('birthDate').value = log.birthDate || '';
        }
        if (applicantType === '법인' && document.getElementById('corpNumber')) {
            document.getElementById('corpNumber').value = log.corpNumber || '';
        }

        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        document.getElementById('addressPostcode').value = log.addressPostcode || '';
        document.getElementById('addressRoad').value = log.addressRoad || '';
        document.getElementById('addressDetail').value = log.addressDetail || '';
        document.getElementById('address').value = log.address || '';
        document.getElementById('samplingLocation').value = log.samplingLocation || '';
        document.getElementById('samplingDate').value = log.samplingDate || '';
        document.getElementById('cropName').value = log.cropName || '';

        // 분석항목 체크박스
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]');
        analysisCheckboxes.forEach(cb => {
            cb.checked = log.analysisItems && log.analysisItems.includes(cb.value);
        });
        this.updateSelectedItemsCount();

        // 목적
        if (log.purpose) {
            const purposeRadio = document.querySelector(`input[name="purpose"][value="${log.purpose}"]`);
            if (purposeRadio) {
                purposeRadio.checked = true;
                // 인증용 안내 표시
                const certificationNotice = document.getElementById('certificationNotice');
                if (certificationNotice) {
                    certificationNotice.classList.toggle('hidden', log.purpose !== '인증용');
                }
            }
        }

        // 수령방법
        document.getElementById('receptionMethod').value = log.receptionMethod || '직접수령';

        // 비고
        if (document.getElementById('note')) {
            document.getElementById('note').value = log.note || '';
        }

        // 수령방법 버튼 활성화
        const methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === log.receptionMethod);
        });
    }

    /**
     * 폼 초기화
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }

        // 분석항목 초기화
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]');
        analysisCheckboxes.forEach(cb => cb.checked = false);
        this.isAllSelected = false;

        const selectAllItemsBtn = document.getElementById('selectAllItemsBtn');
        if (selectAllItemsBtn) {
            selectAllItemsBtn.textContent = '전체 선택';
        }
        this.updateSelectedItemsCount();

        // 인증용 안내 숨기기
        const certificationNotice = document.getElementById('certificationNotice');
        if (certificationNotice) {
            certificationNotice.classList.add('hidden');
        }

        // 수령방법 초기화
        const methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach((btn, index) => {
            btn.classList.toggle('active', index === 0);
        });
        document.getElementById('receptionMethod').value = '직접수령';

        // 다음 접수번호 설정
        const nextNumber = this.generateNextReceptionNumber();
        const receptionNumberInput = document.getElementById('receptionNumber');
        if (receptionNumberInput && nextNumber) {
            receptionNumberInput.value = nextNumber;
        }

        this.editingId = null;
    }

    /**
     * 테이블 행 생성
     */
    createTableRow(log) {
        const row = document.createElement('tr');

        // 완료 여부에 따른 스타일
        if (log.isCompleted) {
            row.classList.add('row-completed');
        }

        // 법인 여부 확인
        const applicantType = log.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

        // 분석항목 표시
        const isAllItems = log.analysisItems && log.analysisItems.length === this.ANALYSIS_ITEMS.length;
        const analysisItemsDisplay = !log.analysisItems || log.analysisItems.length === 0
            ? '-'
            : isAllItems
                ? '전체 항목'
                : log.analysisItems.join(', ');

        // XSS 방지를 위해 textContent 사용
        const createCell = (content, className = '') => {
            const td = document.createElement('td');
            if (className) td.className = className;
            td.textContent = content || '-';
            return td;
        };

        // 1. Checkbox
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
        btnComplete.className = `btn-complete ${log.isCompleted ? 'completed' : ''}`;
        btnComplete.dataset.id = log.id;
        btnComplete.title = log.isCompleted ? '완료됨' : '미완료';
        btnComplete.textContent = log.isCompleted ? '✓' : '○';
        btnComplete.onclick = () => window.toggleComplete && window.toggleComplete(log.id);
        tdComplete.appendChild(btnComplete);
        row.appendChild(tdComplete);

        // 3. 판정 (검사 결과)
        const tdResult = document.createElement('td');
        tdResult.className = 'col-result';
        const btnResult = document.createElement('button');
        btnResult.className = `btn-result ${log.testResult === 'pass' ? 'pass' : log.testResult === 'fail' ? 'fail' : ''}`;
        btnResult.dataset.id = log.id;
        btnResult.title = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
        btnResult.textContent = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '-';
        btnResult.onclick = () => window.toggleResult && window.toggleResult(log.id);
        tdResult.appendChild(btnResult);
        row.appendChild(tdResult);

        // 4. 접수번호
        const tdReceptionNumber = document.createElement('td');
        tdReceptionNumber.textContent = log.receptionNumber || '-';
        row.appendChild(tdReceptionNumber);

        // 5. 접수일자
        row.appendChild(createCell(log.date));

        // 6. 성명
        row.appendChild(createCell(log.name));

        // 7. 법인여부 (hidden)
        row.appendChild(createCell(applicantType, 'col-applicant-type col-hidden'));

        // 8. 생년월일/법인번호 (hidden)
        row.appendChild(createCell(birthOrCorp, 'col-birth-corp col-hidden'));

        // 9. 주소
        const tdAddress = document.createElement('td');
        tdAddress.className = 'text-truncate';
        const fullAddress = log.address || log.addressRoad || '-';
        tdAddress.dataset.tooltip = fullAddress;
        tdAddress.textContent = fullAddress;
        row.appendChild(tdAddress);

        // 10. 채취장소
        const tdSamplingLocation = document.createElement('td');
        tdSamplingLocation.className = 'text-truncate';
        const samplingLocation = log.samplingLocation || '-';
        tdSamplingLocation.dataset.tooltip = samplingLocation;
        tdSamplingLocation.textContent = samplingLocation;
        row.appendChild(tdSamplingLocation);

        // 11. 채취일자
        row.appendChild(createCell(log.samplingDate));

        // 12. 작물명
        row.appendChild(createCell(log.cropName));

        // 13. 분석항목
        row.appendChild(createCell(analysisItemsDisplay));

        // 14. 목적
        row.appendChild(createCell(log.purpose));

        // 15. 연락처
        row.appendChild(createCell(log.phoneNumber));

        // 16. 통보방법
        row.appendChild(createCell(log.receptionMethod));

        // 17. 비고
        row.appendChild(createCell(log.note, 'col-note'));

        // 18. 관리
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
     * 로그 렌더링
     */
    renderLogs(logs) {
        this.log('📋 renderLogs 호출, logs:', logs ? logs.length : 0, '건');

        if (!this.tableBody) {
            console.error(`[${this.moduleName}] tableBody가 없음!`);
            return;
        }

        // PaginationManager 초기화
        if (!this.paginationManager && window.PaginationManager) {
            this.paginationManager = new window.PaginationManager({
                storageKey: 'heavyMetalItemsPerPage',
                defaultItemsPerPage: 100,
                onPageChange: () => {
                    this.updateRecordCount();
                },
                renderRow: (log) => this.createTableRow(log)
            });

            this.paginationManager.setTableElements(this.tableBody, this.emptyState);
        }

        if (this.paginationManager) {
            this.log('📄 paginationManager.setData 호출');
            this.paginationManager.setData(logs || []);
            this.paginationManager.render();
        } else {
            // 폴백: 직접 렌더링
            this.log('⚠️ paginationManager 없음, 직접 렌더링');
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

        this.updateRecordCount();
    }

    /**
     * 폼 제출
     */
    async submitForm() {
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

        if (formData.analysisItems.length === 0) {
            this.showToast('분석항목을 선택하세요.', 'error');
            return;
        }

        const applicantType = formData.applicantType || '개인';

        const baseData = {
            date: formData.date,
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? formData.birthDate : '',
            corpNumber: applicantType === '법인' ? formData.corpNumber : '',
            name: formData.name,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            addressPostcode: formData.addressPostcode,
            addressRoad: formData.addressRoad,
            addressDetail: formData.addressDetail,
            samplingLocation: formData.samplingLocation,
            samplingDate: formData.samplingDate,
            cropName: formData.cropName,
            analysisItems: formData.analysisItems,
            purpose: formData.purpose,
            receptionMethod: formData.receptionMethod,
            note: formData.note,
            isCompleted: false,
            testResult: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 편집 모드
        if (this.editingId) {
            const existingLog = this.sampleLogs.find(l => String(l.id) === this.editingId);
            if (existingLog) {
                Object.assign(existingLog, baseData, {
                    receptionNumber: formData.receptionNumber,
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
        const newLog = {
            ...baseData,
            receptionNumber: formData.receptionNumber,
            id: this.generateId()
        };

        this.sampleLogs.push(newLog);
        await this.saveLogs();

        this.showToast('등록되었습니다.', 'success');
        this.resetForm();

        // 연속 입력 모드
        const continuousInput = document.getElementById('continuousInput');
        if (!continuousInput || !continuousInput.checked) {
            this.switchView('list');
        } else {
            // 다음 접수번호 설정
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
        this.switchView('register');
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
}

// 전역 인스턴스 생성
let heavyMetalManager = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    heavyMetalManager = new HeavyMetalSampleManager();
    await heavyMetalManager.init();

    // 전역으로 노출 (기존 호환성)
    window.heavyMetalManager = heavyMetalManager;
});
