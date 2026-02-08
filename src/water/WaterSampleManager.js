// ========================================
// Water Sample Manager
// 수질분석 시료 관리 클래스
// ========================================

/**
 * 수질분석 시료 관리 매니저
 * BaseSampleManager를 확장하여 수질분석 특화 기능 구현
 */
class WaterSampleManager extends BaseSampleManager {
    constructor() {
        super({
            moduleKey: 'water',
            moduleName: '수질분석',
            storageKey: 'waterSampleLogs',
            debug: window.DEBUG || false  // 환경 상수 사용
        });

        // 수질분석 전용 상태
        this.samplingLocationCount = 1;
        this.cropItemCount = 1;
    }

    /**
     * 초기화 - 부모 클래스 초기화 + 수질분석 특화 초기화
     */
    async init() {
        this.log(' WaterSampleManager 초기화 시작');
        await super.init();
        this.log(' 부모 클래스 초기화 완료');

        // 수질분석 전용 초기화
        this.initSamplingLocations();
        this.initSamplingCrops();
        this.initWaterSpecificElements();

        this.log(' 초기화 완료, sampleLogs:', this.sampleLogs?.length || 0, '건');
    }

    /**
     * DOM 요소 캐싱 오버라이드 - Water 모듈용 ID 사용
     */
    cacheElements() {
        this.form = document.getElementById('sampleForm');
        this.tableBody = document.getElementById('logTableBody'); // Water 모듈용 ID
        this.emptyState = document.querySelector('.empty-state');
        this.recordCountEl = document.getElementById('recordCount');

        this.log(` cacheElements - tableBody:`, !!this.tableBody);
    }

    /**
     * 채취장소 초기화
     */
    initSamplingLocations() {
        const locationsWrapper = document.getElementById('samplingLocationsWrapper');
        const addLocationBtn = document.getElementById('addSamplingLocation');

        if (addLocationBtn) {
            addLocationBtn.addEventListener('click', () => this.addSamplingLocation());
        }

        // 초기 채취장소 필드가 없으면 추가
        if (locationsWrapper && locationsWrapper.children.length === 0) {
            this.addSamplingLocation();
        }
    }

    /**
     * 채취작물 초기화
     */
    initSamplingCrops() {
        const cropsWrapper = document.getElementById('samplingCropsWrapper');
        const addCropBtn = document.getElementById('addSamplingCrop');

        if (addCropBtn) {
            addCropBtn.addEventListener('click', () => this.addSamplingCrop());
        }

        // 초기 채취작물 필드가 없으면 추가
        if (cropsWrapper && cropsWrapper.children.length === 0) {
            this.addSamplingCrop();
        }
    }

    /**
     * 수질분석 전용 요소 초기화
     */
    initWaterSpecificElements() {
        // 주소 입력 필드 처리
        if (window.setupAddressAutocomplete) {
            window.setupAddressAutocomplete();
        }
    }

    /**
     * 채취장소 추가 (XSS 방지를 위해 DOM API 사용)
     */
    addSamplingLocation() {
        const wrapper = document.getElementById('samplingLocationsWrapper');
        if (!wrapper) return;

        const div = document.createElement('div');
        div.className = 'sampling-location-item';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'samplingLocation[]';
        input.placeholder = `채취장소 ${this.samplingLocationCount}`;
        input.className = 'form-control';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-danger btn-sm';
        button.textContent = '삭제';
        button.addEventListener('click', () => this.removeSamplingLocation(button));

        div.appendChild(input);
        div.appendChild(button);
        wrapper.appendChild(div);

        this.samplingLocationCount++;
    }

    /**
     * 채취장소 삭제
     */
    removeSamplingLocation(button) {
        const wrapper = document.getElementById('samplingLocationsWrapper');
        const items = wrapper.querySelectorAll('.sampling-location-item');

        // 최소 1개는 유지
        if (items.length > 1) {
            button.parentElement.remove();
        }
    }

    /**
     * 채취작물 추가 (XSS 방지를 위해 DOM API 사용)
     */
    addSamplingCrop() {
        const wrapper = document.getElementById('samplingCropsWrapper');
        if (!wrapper) return;

        const div = document.createElement('div');
        div.className = 'crop-item';

        const select = document.createElement('select');
        select.name = 'samplingCrop[]';
        select.className = 'form-control';

        // 기본 옵션
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '작물 선택';
        select.appendChild(defaultOption);

        // 작물 목록 옵션 추가
        const cropList = window.cropData ? Object.keys(window.cropData).sort() : [];
        cropList.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop;
            select.appendChild(option);
        });

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-danger btn-sm';
        button.textContent = '삭제';
        button.addEventListener('click', () => this.removeSamplingCrop(button));

        div.appendChild(select);
        div.appendChild(button);
        wrapper.appendChild(div);

        this.cropItemCount++;
    }

    /**
     * 채취작물 삭제
     */
    removeSamplingCrop(button) {
        const wrapper = document.getElementById('samplingCropsWrapper');
        const items = wrapper.querySelectorAll('.crop-item');

        // 최소 1개는 유지
        if (items.length > 1) {
            button.parentElement.remove();
        }
    }

    /**
     * 모든 채취장소 가져오기
     */
    getAllSamplingLocations() {
        const inputs = document.querySelectorAll('input[name="samplingLocation[]"]');
        return Array.from(inputs)
            .map(input => input.value.trim())
            .filter(value => value);
    }

    /**
     * 모든 채취작물 가져오기
     */
    getAllSamplingCrops() {
        const selects = document.querySelectorAll('select[name="samplingCrop[]"]');
        return Array.from(selects)
            .map(select => select.value.trim())
            .filter(value => value);
    }

    /**
     * 로그 렌더링 (수질분석 테이블)
     */
    renderLogs(logs) {
        this.log(` renderLogs 호출, logs:`, logs ? logs.length : 0, '건');

        if (!this.tableBody) {
            console.error(`[${this.moduleName}] tableBody가 없음!`);
            return;
        }

        // PaginationManager 초기화 (아직 없으면)
        if (!this.paginationManager && window.PaginationManager) {
            this.paginationManager = new window.PaginationManager({
                storageKey: 'waterItemsPerPage',
                defaultItemsPerPage: 100,
                onPageChange: () => {
                    // 페이지 변경 시 updateRecordCount만 호출
                    this.updateRecordCount();
                },
                renderRow: (log) => this.createTableRow(log)
            });

            // 테이블 요소 설정
            this.paginationManager.setTableElements(this.tableBody, this.emptyState);
        }

        // 기존 pagination.js 사용
        if (this.paginationManager) {
            this.log(` paginationManager.setData 호출`);
            this.paginationManager.setData(logs || []);
            this.paginationManager.render();
        } else {
            this.log(` paginationManager 없음, 직접 렌더링`);
            // 폴백: 직접 렌더링
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
     * 테이블 행 생성
     */
    createTableRow(log) {
        const row = document.createElement('tr');

        // 완료 여부에 따른 스타일
        if (log.isComplete) {
            row.classList.add('row-completed');
        }

        // 법인 여부 확인
        const applicantType = log.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

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
        btnComplete.className = `btn-complete ${log.isComplete ? 'completed' : ''}`;
        btnComplete.dataset.id = log.id;
        btnComplete.title = log.isComplete ? '완료됨' : '완료 표시';
        btnComplete.textContent = log.isComplete ? '✅' : '⬜';
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
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-link edit-btn';
        editBtn.onclick = () => this.editSample(log.id);
        editBtn.textContent = log.receptionNumber || '-';
        tdReceptionNumber.appendChild(editBtn);
        row.appendChild(tdReceptionNumber);

        // 5. 접수일자
        const tdDate = document.createElement('td');
        tdDate.textContent = log.date || '-';
        row.appendChild(tdDate);

        // 6. 법인여부 (hidden)
        const tdApplicantType = document.createElement('td');
        tdApplicantType.className = 'col-applicant-type hidden';
        tdApplicantType.textContent = applicantType;
        row.appendChild(tdApplicantType);

        // 7. 생년월일/법인번호 (hidden)
        const tdBirthCorp = document.createElement('td');
        tdBirthCorp.className = 'col-birth-corp hidden';
        tdBirthCorp.textContent = birthOrCorp;
        row.appendChild(tdBirthCorp);

        // 8. 성명
        const tdName = document.createElement('td');
        tdName.textContent = log.name || log.applicantName || '-';
        row.appendChild(tdName);

        // 9. 우편번호 (hidden)
        const tdZipcode = document.createElement('td');
        tdZipcode.className = 'col-zipcode hidden';
        tdZipcode.textContent = log.addressPostcode || '-';
        row.appendChild(tdZipcode);

        // 10. 주소
        const tdAddress = document.createElement('td');
        tdAddress.className = 'text-truncate';
        const fullAddress = log.address || '-';
        tdAddress.dataset.tooltip = fullAddress;
        tdAddress.textContent = fullAddress;
        row.appendChild(tdAddress);

        // 11. 채취장소
        const tdSamplingLocation = document.createElement('td');
        tdSamplingLocation.className = 'text-truncate';
        const samplingLocation = log.samplingLocation || '-';
        tdSamplingLocation.dataset.tooltip = samplingLocation;
        tdSamplingLocation.textContent = samplingLocation;
        row.appendChild(tdSamplingLocation);

        // 12. 시료명
        const tdSampleName = document.createElement('td');
        tdSampleName.textContent = log.sampleName || '-';
        row.appendChild(tdSampleName);

        // 13. 시료수
        const tdSampleCount = document.createElement('td');
        tdSampleCount.textContent = `${log.sampleCount || 1}점`;
        row.appendChild(tdSampleCount);

        // 14. 주작목
        const tdMainCrop = document.createElement('td');
        tdMainCrop.className = 'text-truncate';
        const mainCrop = log.mainCrop || '-';
        tdMainCrop.dataset.tooltip = mainCrop;
        tdMainCrop.textContent = mainCrop;
        row.appendChild(tdMainCrop);

        // 15. 목적
        const tdPurpose = document.createElement('td');
        tdPurpose.textContent = log.purpose || '-';
        row.appendChild(tdPurpose);

        // 16. 검사항목
        const tdTestItems = document.createElement('td');
        tdTestItems.textContent = log.testItems || '-';
        row.appendChild(tdTestItems);

        // 17. 연락처
        const tdPhoneNumber = document.createElement('td');
        tdPhoneNumber.textContent = log.phoneNumber || '-';
        row.appendChild(tdPhoneNumber);

        // 18. 통보방법
        const tdReceptionMethod = document.createElement('td');
        tdReceptionMethod.textContent = log.receptionMethod || '-';
        row.appendChild(tdReceptionMethod);

        // 19. 비고
        const tdNote = document.createElement('td');
        tdNote.className = 'col-note';
        tdNote.textContent = log.note || '-';
        row.appendChild(tdNote);

        // 20. 발송일자
        const tdMailDate = document.createElement('td');
        tdMailDate.className = 'col-mail-date';
        tdMailDate.textContent = log.mailDate || '-';
        row.appendChild(tdMailDate);

        // 21. 관리
        const tdAction = document.createElement('td');
        tdAction.className = 'col-action';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'table-actions';

        // 수정 버튼
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.dataset.id = log.id;
        editBtn.textContent = '수정';
        // water-script.js의 전역 함수와 호환
        if (window.editSample) {
            editBtn.onclick = () => window.editSample(log.id);
        } else {
            editBtn.onclick = () => this.editSample(log.id);
        }

        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.dataset.id = log.id;
        deleteBtn.textContent = '삭제';
        // water-script.js의 전역 함수와 호환
        if (window.deleteSample) {
            deleteBtn.onclick = () => {
                if (confirm('이 항목을 삭제하시겠습니까?')) {
                    window.deleteSample(log.id);
                }
            };
        } else {
            deleteBtn.onclick = () => this.confirmDelete(log.id);
        }

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        tdAction.appendChild(actionsDiv);
        row.appendChild(tdAction);

        return row;
    }

    /**
     * 폼 제출
     */
    async submitForm() {
        const formData = new FormData(this.form);
        const samplingLocations = this.getAllSamplingLocations();
        const samplingCrops = this.getAllSamplingCrops();

        // 접수번호 파싱
        const receptionNumbers = this.parseReceptionNumbers(formData.get('receptionNumber'));

        // 유효성 검사
        if (receptionNumbers.length === 0) {
            this.showToast('접수번호를 입력하세요.', 'error');
            return;
        }

        // 폼 데이터에서 신청인 유형 확인
        const applicantType = formData.get('applicantType') || '개인';

        const baseData = {
            date: formData.get('date'),
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
            corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            addressPostcode: formData.get('addressPostcode'),
            addressRoad: formData.get('addressRoad'),
            addressDetail: formData.get('addressDetail'),
            sampleName: formData.get('sampleName'),
            sampleCount: formData.get('sampleCount') || '1',
            samplingLocation: samplingLocations.join(', '),  // water-script.js는 문자열로 저장
            samplingLocations: samplingLocations,  // 배열로도 저장
            mainCrop: samplingCrops.join(', '),  // water-script.js는 mainCrop 사용
            samplingCrops: samplingCrops,  // 호환성을 위해 배열로도 저장
            purpose: formData.get('purpose'),
            testItems: formData.get('testItems'),
            receptionMethod: formData.get('receptionMethod'),
            note: formData.get('note'),
            isComplete: false,  // water-script.js는 isComplete 사용
            testResult: null,  // 초기값은 null
            mailDate: '',  // 발송일자는 나중에 입력
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 편집 모드
        if (this.editingId) {
            const existingLog = this.sampleLogs.find(l => String(l.id) === this.editingId);
            if (existingLog) {
                Object.assign(existingLog, baseData, {
                    receptionNumber: receptionNumbers[0],
                    id: existingLog.id
                });
                await this.saveLogs();
                this.showToast('수정되었습니다.', 'success');
                this.resetForm();
                this.switchView('list');
            }
            return;
        }

        // 새로 추가
        const newLogs = receptionNumbers.map(num => ({
            ...baseData,
            receptionNumber: num,
            id: this.generateId()
        }));

        this.sampleLogs.push(...newLogs);
        await this.saveLogs();

        this.showToast(`${newLogs.length}건이 등록되었습니다.`, 'success');
        this.resetForm();

        // 연속 입력 모드
        const continuousInput = document.getElementById('continuousInput');
        if (!continuousInput || !continuousInput.checked) {
            this.switchView('list');
        } else {
            // 연속 입력 모드에서는 다음 접수번호 설정
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

        // 신청인 유형 설정
        const applicantType = log.applicantType || '개인';
        const typeRadios = document.querySelectorAll('input[name="applicantType"]');
        typeRadios.forEach(radio => {
            radio.checked = radio.value === applicantType;
        });

        // 폼 필드에 데이터 채우기
        document.getElementById('receptionNumber').value = log.receptionNumber || '';
        document.getElementById('date').value = log.date || '';

        if (applicantType === '개인' && document.getElementById('birthDate')) {
            document.getElementById('birthDate').value = log.birthDate || '';
        }
        if (applicantType === '법인' && document.getElementById('corpNumber')) {
            document.getElementById('corpNumber').value = log.corpNumber || '';
        }

        document.getElementById('name').value = log.name || log.applicantName || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        document.getElementById('address').value = log.address || '';
        document.getElementById('addressPostcode').value = log.addressPostcode || '';
        document.getElementById('addressRoad').value = log.addressRoad || '';
        document.getElementById('addressDetail').value = log.addressDetail || log.detailAddress || '';
        document.getElementById('sampleName').value = log.sampleName || '';
        document.getElementById('sampleCount').value = log.sampleCount || '1';
        document.getElementById('purpose').value = log.purpose || '';
        document.getElementById('testItems').value = log.testItems || '';
        document.getElementById('receptionMethod').value = log.receptionMethod || '직접수령';

        if (document.getElementById('note')) {
            document.getElementById('note').value = log.note || '';
        }

        // 채취장소 설정 (문자열을 배열로 변환)
        const samplingLocations = log.samplingLocations ||
                                (log.samplingLocation ? log.samplingLocation.split(',').map(s => s.trim()) : []);
        this.setSamplingLocations(samplingLocations);

        // 채취작물 설정 (문자열을 배열로 변환)
        const samplingCrops = log.samplingCrops ||
                            (log.mainCrop ? log.mainCrop.split(',').map(s => s.trim()) : []);
        this.setSamplingCrops(samplingCrops);

        // 수령방법 버튼 활성화
        const methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === log.receptionMethod);
        });

        this.editingId = String(id);
        this.switchView('register');
    }

    /**
     * 채취장소 설정 (편집 시)
     */
    setSamplingLocations(locations) {
        const wrapper = document.getElementById('samplingLocationsWrapper');
        if (!wrapper) return;

        // 기존 필드 모두 제거
        wrapper.innerHTML = '';
        this.samplingLocationCount = 1;

        // 배열 처리
        const locationArray = Array.isArray(locations) ? locations : [locations || ''];

        locationArray.forEach(location => {
            this.addSamplingLocation();
            const inputs = wrapper.querySelectorAll('input[name="samplingLocation[]"]');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput) {
                lastInput.value = location;
            }
        });
    }

    /**
     * 채취작물 설정 (편집 시)
     */
    setSamplingCrops(crops) {
        const wrapper = document.getElementById('samplingCropsWrapper');
        if (!wrapper) return;

        // 기존 필드 모두 제거
        wrapper.innerHTML = '';
        this.cropItemCount = 1;

        // 배열 처리
        const cropArray = Array.isArray(crops) ? crops : [crops || ''];

        cropArray.forEach(crop => {
            this.addSamplingCrop();
            const selects = wrapper.querySelectorAll('select[name="samplingCrop[]"]');
            const lastSelect = selects[selects.length - 1];
            if (lastSelect) {
                lastSelect.value = crop;
            }
        });
    }

    /**
     * 폼 초기화
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }

        // 채취장소 초기화
        const locWrapper = document.getElementById('samplingLocationsWrapper');
        if (locWrapper) {
            locWrapper.innerHTML = '';
            this.samplingLocationCount = 1;
            this.addSamplingLocation();
        }

        // 채취작물 초기화
        const cropWrapper = document.getElementById('samplingCropsWrapper');
        if (cropWrapper) {
            cropWrapper.innerHTML = '';
            this.cropItemCount = 1;
            this.addSamplingCrop();
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
     * 삭제 확인
     */
    confirmDelete(id) {
        if (confirm('정말 삭제하시겠습니까?')) {
            this.deleteSample(id);
        }
    }

    /**
     * 접수번호 파싱
     */
    parseReceptionNumbers(input) {
        if (!input) return [];

        return input.split(',')
            .map(num => num.trim())
            .filter(num => num)
            .map(num => parseInt(num))
            .filter(num => !isNaN(num));
    }

    /**
     * 다음 접수번호 생성
     */
    generateNextReceptionNumber() {
        let maxNumber = 0;

        this.sampleLogs.forEach(log => {
            if (log.receptionNumber) {
                // 수질은 쉼표로 구분된 개별 번호 형식 (예: "5, 6, 7")
                // 마지막 번호를 찾아서 그 다음 번호를 반환
                const numbers = log.receptionNumber.split(',')
                    .map(n => parseInt(n.trim(), 10))
                    .filter(n => !isNaN(n));

                if (numbers.length > 0) {
                    const lastNum = Math.max(...numbers);
                    if (lastNum > maxNumber) {
                        maxNumber = lastNum;
                    }
                }
            }
        });

        return String(maxNumber + 1);
    }

    /**
     * 페이지네이션 초기화 오버라이드 - 삭제
     * BaseSampleManager의 기본 구현 사용
     */
    // initPagination() 메서드를 완전히 제거하여 부모 클래스의 구현을 사용
}

// 전역 인스턴스 생성
let waterManager = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    waterManager = new WaterSampleManager();
    await waterManager.init();

    // 전역으로 노출 (기존 호환성)
    window.waterManager = waterManager;
});