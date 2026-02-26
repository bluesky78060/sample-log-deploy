/**
 * @fileoverview 수질분석 시료 전용 스크립트 (BaseSampleManager 기반)
 * @description 수질 분석용 시료 접수/관리 기능
 */

// ========================================
// 경상북도 전체 시/군 목록 (자동완성용)
// ========================================
const GYEONGBUK_REGIONS = [
    'pohang', 'gyeongju', 'gimcheon', 'andong', 'gumi',
    'yeongcheon', 'sangju', 'mungyeong', 'gyeongsan',
    'gunwi', 'uiseong', 'cheongsong', 'yeongyang', 'yeongdeok',
    'cheongdo', 'goryeong', 'seongju', 'chilgok', 'yecheon',
    'bonghwa', 'ulleung', 'yeongju', 'uljin'
];

const GYEONGBUK_REGION_NAMES = [
    '포항시', '경주시', '김천시', '안동시', '구미시',
    '영천시', '상주시', '문경시', '경산시',
    '군위군', '의성군', '청송군', '영양군', '영덕군',
    '청도군', '고령군', '성주군', '칠곡군', '예천군',
    '봉화군', '울릉군', '영주시', '울진군'
];

class WaterSampleManager extends window.BaseSampleManager {
    constructor() {
        super({
            moduleKey: 'water',
            moduleName: '수질분석',
            storageKey: 'test_waterSampleLogs',
            sampleType: '물',
            autoSaveFile: 'water-autosave.json',
            debug: !!window.DEBUG
        });

        // 수질 전용 상태
        this.currentRegistrationData = null;
        this.pendingMailDateIds = [];
        this.isFullView = false;
        this.currentSearchFilter = {
            dateFrom: '',
            dateTo: '',
            name: '',
            receptionFrom: '',
            receptionTo: '',
            completed: ''
        };

        // DOM 참조 (init 후 설정)
        this.dateInput = null;
        this.receptionNumberInput = null;
        this.sampleCountInput = null;
        this.samplingLocationsList = null;
        this.locationCountBadge = null;
        this.applicantTypeSelect = null;
        this.birthDateField = null;
        this.corpNumberField = null;
        this.birthDateInput = null;
        this.corpNumberInput = null;
        this.livingWaterItems = null;
        this.agriculturalWaterItems = null;
        this.receptionMethodBtns = null;
        this.receptionMethodInput = null;
        this.navSubmitBtn = null;
        this.addressPostcode = null;
        this.addressRoad = null;
        this.addressDetail = null;
        this.addressHidden = null;
    }

    // ========================================
    // 오버라이드: DOM 요소 캐싱
    // ========================================
    cacheElements() {
        super.cacheElements();
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');

        this.dateInput = document.getElementById('date');
        this.receptionNumberInput = document.getElementById('receptionNumber');
        this.sampleCountInput = document.getElementById('sampleCount');
        this.samplingLocationsList = document.getElementById('samplingLocationsList');
        this.locationCountBadge = document.getElementById('locationCountBadge');
        this.applicantTypeSelect = document.getElementById('applicantType');
        this.birthDateField = document.getElementById('birthDateField');
        this.corpNumberField = document.getElementById('corpNumberField');
        this.birthDateInput = document.getElementById('birthDate');
        this.corpNumberInput = document.getElementById('corpNumber');
        this.livingWaterItems = document.getElementById('livingWaterItems');
        this.agriculturalWaterItems = document.getElementById('agriculturalWaterItems');
        this.receptionMethodInput = document.getElementById('receptionMethod');
        this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        this.navSubmitBtn = document.getElementById('navSubmitBtn');
        this.addressPostcode = document.getElementById('addressPostcode');
        this.addressRoad = document.getElementById('addressRoad');
        this.addressDetail = document.getElementById('addressDetail');
        this.addressHidden = document.getElementById('address');

        // 오늘 날짜 설정
        if (this.dateInput) {
            this.dateInput.valueAsDate = new Date();
        }
    }

    // ========================================
    // 오버라이드: 완료 필드 마이그레이션 (isComplete 사용)
    // ========================================
    migrateCompletedField(logs) {
        if (!Array.isArray(logs)) return logs;
        return logs.map(log => {
            if (log.completed !== undefined || log.isCompleted !== undefined) {
                log.isComplete = log.isComplete || log.isCompleted || log.completed || false;
                delete log.completed;
                delete log.isCompleted;
            }
            return log;
        });
    }

    // ========================================
    // 오버라이드: 렌더링 전 데이터 정렬 (접수번호 오름차순)
    // ========================================
    prepareDataForRender(logs) {
        return [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });
    }

    // ========================================
    // 오버라이드: 테이블 행 빌드
    // ========================================
    buildTableRow(item, index) {
        const log = item;
        const row = document.createElement('tr');
        row.dataset.id = log.id;

        // 주소에서 우편번호 분리
        const addressFull = log.address || '';
        const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
        const zipcode = zipMatch ? zipMatch[1] : (log.addressPostcode || '');
        const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

        // 뷰용 주소: 시도 패턴이 있을 때만 제거
        const displayAddress = addressOnly && addressOnly !== '-' && SIDO_PATTERN.test(addressOnly)
            ? addressOnly.replace(SIDO_PATTERN, '')
            : (addressOnly || '-');

        // XSS 방지
        const safeName = escapeHTML(log.name || '-');
        const safeSamplingLocation = escapeHTML(log.samplingLocation || '-');
        const safeSampleName = escapeHTML(log.sampleName || '-');
        const safeMainCrop = escapeHTML(log.mainCrop || '-');
        const safePhone = escapeHTML(log.phoneNumber || '-');
        const safeNote = escapeHTML(log.note || '-');
        const safeDisplayAddress = escapeHTML(displayAddress);

        const applicantType = log.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

        // 1. Checkbox
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'col-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.dataset.id = log.id;
        tdCheckbox.appendChild(checkbox);
        row.appendChild(tdCheckbox);

        // 2. Complete button
        const tdComplete = document.createElement('td');
        tdComplete.className = 'col-complete';
        const btnComplete = document.createElement('button');
        btnComplete.className = `btn-complete ${log.isComplete ? 'completed' : ''}`;
        btnComplete.dataset.id = log.id;
        btnComplete.title = log.isComplete ? '완료됨' : '완료 표시';
        btnComplete.textContent = log.isComplete ? '\u2705' : '\u2B1C';
        tdComplete.appendChild(btnComplete);
        row.appendChild(tdComplete);

        // 3. Result button
        const tdResult = document.createElement('td');
        tdResult.className = 'col-result';
        const btnResult = document.createElement('button');
        btnResult.className = `btn-result ${log.testResult === 'pass' ? 'pass' : log.testResult === 'fail' ? 'fail' : ''}`;
        btnResult.dataset.id = log.id;
        btnResult.title = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
        btnResult.textContent = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '-';
        tdResult.appendChild(btnResult);
        row.appendChild(tdResult);

        // 4. Reception number
        const tdReceptionNumber = document.createElement('td');
        tdReceptionNumber.textContent = log.receptionNumber || '-';
        row.appendChild(tdReceptionNumber);

        // 5. Date
        const tdDate = document.createElement('td');
        tdDate.textContent = log.date || '-';
        row.appendChild(tdDate);

        // 6. Applicant type (hidden)
        const tdApplicantType = document.createElement('td');
        tdApplicantType.className = 'col-applicant-type hidden';
        tdApplicantType.textContent = applicantType;
        row.appendChild(tdApplicantType);

        // 7. Birth/Corp number (hidden)
        const tdBirthCorp = document.createElement('td');
        tdBirthCorp.className = 'col-birth-corp hidden';
        tdBirthCorp.textContent = birthOrCorp;
        row.appendChild(tdBirthCorp);

        // 8. Name (클릭 시 같은 이름 일괄 선택)
        const tdName = document.createElement('td');
        tdName.className = 'col-name';
        tdName.dataset.name = log.name || '';
        tdName.textContent = safeName;
        tdName.title = `"${safeName}" 클릭하면 같은 이름 일괄 선택`;
        row.appendChild(tdName);

        // 9. Zipcode (hidden)
        const tdZipcode = document.createElement('td');
        tdZipcode.className = 'col-zipcode hidden';
        tdZipcode.textContent = zipcode || '-';
        row.appendChild(tdZipcode);

        // 10. Address
        const tdAddress = document.createElement('td');
        tdAddress.className = 'col-address';
        tdAddress.textContent = safeDisplayAddress;
        row.appendChild(tdAddress);

        // 11. Sampling location (with tooltip)
        const tdSamplingLocation = document.createElement('td');
        tdSamplingLocation.className = 'text-truncate';
        tdSamplingLocation.dataset.tooltip = safeSamplingLocation;
        tdSamplingLocation.textContent = safeSamplingLocation;
        row.appendChild(tdSamplingLocation);

        // 12. Sample name
        const tdSampleName = document.createElement('td');
        tdSampleName.textContent = safeSampleName;
        row.appendChild(tdSampleName);

        // 13. Sample count
        const tdSampleCount = document.createElement('td');
        tdSampleCount.textContent = `${String(log.sampleCount || 1)}점`;
        row.appendChild(tdSampleCount);

        // 14. Main crop (with tooltip)
        const tdMainCrop = document.createElement('td');
        tdMainCrop.className = 'text-truncate';
        tdMainCrop.dataset.tooltip = safeMainCrop;
        tdMainCrop.textContent = safeMainCrop;
        row.appendChild(tdMainCrop);

        // 15. Purpose
        const tdPurpose = document.createElement('td');
        tdPurpose.textContent = log.purpose || '-';
        row.appendChild(tdPurpose);

        // 16. Test items
        const tdTestItems = document.createElement('td');
        tdTestItems.textContent = log.testItems || '-';
        row.appendChild(tdTestItems);

        // 17. Phone
        const tdPhone = document.createElement('td');
        tdPhone.textContent = safePhone;
        row.appendChild(tdPhone);

        // 18. Reception method
        const tdReceptionMethod = document.createElement('td');
        tdReceptionMethod.textContent = log.receptionMethod || '-';
        row.appendChild(tdReceptionMethod);

        // 19. Note (with tooltip)
        const tdNote = document.createElement('td');
        tdNote.className = 'col-note text-truncate';
        tdNote.dataset.tooltip = safeNote;
        tdNote.textContent = safeNote;
        row.appendChild(tdNote);

        // 20. Mail date
        const tdMailDate = document.createElement('td');
        tdMailDate.className = 'col-mail-date';
        tdMailDate.textContent = log.mailDate || '-';
        row.appendChild(tdMailDate);

        // 21. Action buttons
        const tdAction = document.createElement('td');
        tdAction.className = 'col-action';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.dataset.id = log.id;
        btnEdit.title = '수정';
        btnEdit.textContent = '\u270F\uFE0F';
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.dataset.id = log.id;
        btnDelete.title = '삭제';
        btnDelete.textContent = '\uD83D\uDDD1\uFE0F';
        tdAction.appendChild(btnEdit);
        tdAction.appendChild(btnDelete);
        row.appendChild(tdAction);

        if (log.isComplete) {
            row.classList.add('row-completed');
        }

        return row;
    }

    // ========================================
    // 오버라이드: 폼 제출
    // ========================================
    submitForm() {
        if (this.editingId) {
            this.updateSample();
            return;
        }

        const formData = new FormData(this.form);
        const samplingLocations = this.getAllSamplingLocations();
        const samplingCrops = this.getAllSamplingCrops();

        // 접수번호 파싱 (예: "1, 2, 3" -> [1, 2, 3])
        const receptionNumberStr = formData.get('receptionNumber') || this.generateNextReceptionNumber();
        const receptionNumbers = receptionNumberStr.split(',').map(n => n.trim()).filter(n => n);

        // 공통 데이터 (신청자 정보)
        const applicantType = formData.get('applicantType') || '개인';
        const commonData = {
            sampleType: '물',
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
            receptionMethod: formData.get('receptionMethod'),
            sampleName: formData.get('sampleName'),
            purpose: formData.get('purpose'),
            testItems: formData.get('testItems'),
            note: formData.get('note'),
            isComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 채취장소별로 개별 행 생성
        const newLogs = [];
        for (let i = 0; i < samplingLocations.length; i++) {
            const data = {
                ...commonData,
                id: SampleUtils.generateUUID(),
                receptionNumber: receptionNumbers[i] || String(parseInt(receptionNumbers[0], 10) + i),
                sampleCount: '1',
                samplingLocation: samplingLocations[i] || '',
                mainCrop: samplingCrops[i] || ''
            };
            newLogs.push(data);
            this.sampleLogs.push(data);
        }

        this.saveLogs();

        const totalCount = samplingLocations.length;
        this.showToast(`시료 ${totalCount}건이 등록되었습니다.`, 'success');

        // 결과 모달 표시
        const resultData = {
            ...newLogs[0],
            receptionNumber: receptionNumbers.join(', '),
            sampleCount: String(totalCount),
            samplingLocation: samplingLocations.join(', '),
            mainCrop: samplingCrops.filter(c => c).join(', ')
        };
        this.showRegistrationResult(resultData);

        this.resetForm();
        this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }

    // ========================================
    // 오버라이드: 샘플 수정
    // ========================================
    editSample(id) {
        const log = this.sampleLogs.find(l => String(l.id) === String(id));
        if (!log) return;

        this.editingId = id;

        try {
            if (this.receptionNumberInput) this.receptionNumberInput.value = log.receptionNumber || '';
            if (this.dateInput) this.dateInput.value = log.date || '';

            const nameEl = document.getElementById('name');
            const phoneEl = document.getElementById('phoneNumber');
            const sampleNameEl = document.getElementById('sampleName');
            const sampleCountEl = document.getElementById('sampleCount');
            const noteEl = document.getElementById('note');

            if (nameEl) nameEl.value = log.name || '';
            if (phoneEl) phoneEl.value = log.phoneNumber || '';
            if (this.addressPostcode) this.addressPostcode.value = log.addressPostcode || '';
            if (this.addressRoad) this.addressRoad.value = log.addressRoad || '';
            if (this.addressDetail) this.addressDetail.value = log.addressDetail || '';
            if (this.addressHidden) this.addressHidden.value = log.address || '';
            if (sampleNameEl) sampleNameEl.value = log.sampleName || '';
            if (sampleCountEl) sampleCountEl.value = log.sampleCount || 1;
            if (noteEl) noteEl.value = log.note || '';

            // 법인여부/생년월일/법인번호 설정
            const applicantType = log.applicantType || '개인';
            if (this.applicantTypeSelect) {
                this.applicantTypeSelect.value = applicantType;
                if (applicantType === '법인') {
                    this.birthDateField.classList.add('hidden');
                    this.corpNumberField.classList.remove('hidden');
                    if (this.corpNumberInput) this.corpNumberInput.value = log.corpNumber || '';
                    if (this.birthDateInput) this.birthDateInput.value = '';
                } else {
                    this.birthDateField.classList.remove('hidden');
                    this.corpNumberField.classList.add('hidden');
                    if (this.birthDateInput) this.birthDateInput.value = log.birthDate || '';
                    if (this.corpNumberInput) this.corpNumberInput.value = '';
                }
            }

            // 채취장소 및 주작목 설정
            const crops = log.samplingCrops || [];
            if (log.samplingLocations && Array.isArray(log.samplingLocations)) {
                this.setSamplingLocations(log.samplingLocations, crops);
            } else if (log.samplingLocation) {
                const locations = log.samplingLocation.split(',').map(s => s.trim());
                this.setSamplingLocations(locations, crops);
            }

            // 통보방법 선택
            if (this.receptionMethodBtns) {
                this.receptionMethodBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.method === log.receptionMethod);
                });
            }
            if (this.receptionMethodInput) this.receptionMethodInput.value = log.receptionMethod || '';

            // 목적 선택
            const purposeRadio = document.querySelector(`input[name="purpose"][value="${log.purpose}"]`);
            if (purposeRadio) purposeRadio.checked = true;

            // 검사항목 선택
            const testItemsRadio = document.querySelector(`input[name="testItems"][value="${log.testItems}"]`);
            if (testItemsRadio) {
                testItemsRadio.checked = true;
                if (log.testItems === '생활용수') {
                    if (this.livingWaterItems) this.livingWaterItems.classList.add('active');
                    if (this.agriculturalWaterItems) this.agriculturalWaterItems.classList.remove('active');
                } else {
                    if (this.livingWaterItems) this.livingWaterItems.classList.remove('active');
                    if (this.agriculturalWaterItems) this.agriculturalWaterItems.classList.add('active');
                }
            }

            this.switchView('form');
            this.showToast('수정 모드입니다. 변경 후 등록 버튼을 클릭하세요.', 'warning');

            if (this.navSubmitBtn) {
                this.navSubmitBtn.title = '수정 완료';
                this.navSubmitBtn.classList.add('btn-edit-mode');
            }
        } catch (error) {
            (window.logger?.error || console.error)('editSample 에러:', error);
            this.showToast('수정 모드 전환 중 오류가 발생했습니다.', 'error');
        }
    }

    // ========================================
    // 오버라이드: 폼 초기화
    // ========================================
    resetForm() {
        const receptionNumber = this.receptionNumberInput?.value;
        const date = this.dateInput?.value;

        this.form.reset();

        if (receptionNumber) {
            this.receptionNumberInput.value = receptionNumber;
        }
        if (date) {
            this.dateInput.value = date;
        } else {
            this.dateInput.valueAsDate = new Date();
        }

        this.receptionMethodBtns.forEach(b => b.classList.remove('active'));
        this.receptionMethodInput.value = '';

        // 개인/법인 초기화
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.value = '개인';
            this.birthDateField.classList.remove('hidden');
            this.corpNumberField.classList.add('hidden');
        }
        if (this.birthDateInput) this.birthDateInput.value = '';
        if (this.corpNumberInput) this.corpNumberInput.value = '';

        // 검사항목 초기화
        const livingWaterRadio = document.querySelector('input[name="testItems"][value="생활용수"]');
        if (livingWaterRadio) {
            livingWaterRadio.checked = true;
            this.livingWaterItems.classList.add('active');
            this.agriculturalWaterItems.classList.remove('active');
        }

        // 채취장소 및 주작목 초기화
        this.updateSamplingLocations(1);
        const firstLocationInput = this.samplingLocationsList.querySelector('.sampling-location-input');
        const firstCropInput = this.samplingLocationsList.querySelector('.sampling-crop-input');
        if (firstLocationInput) firstLocationInput.value = '';
        if (firstCropInput) firstCropInput.value = '';

        // 접수번호 갱신
        const nextNumber = this.generateNextReceptionNumber();
        this.receptionNumberInput.value = nextNumber;
        this.receptionNumberInput.dataset.baseNumber = nextNumber;

        // 수정 모드 해제
        this.editingId = null;

        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '접수 등록';
            this.navSubmitBtn.classList.remove('btn-edit-mode');
        }
    }

    // ========================================
    // 오버라이드: 수령 방법 설정 (water는 .reception-method-btn 사용)
    // ========================================
    setupReceptionMethod() {
        // water는 setupTypeSpecificEvents에서 직접 처리
        // base class의 .method-btn 대신 .reception-method-btn 사용
    }

    // ========================================
    // 오버라이드: 데이터 로드 후 처리
    // ========================================
    onAfterLoad(data, year) {
        // base class의 loadYearData가 Firebase-first 로딩을 처리함
        // water의 smartMerge는 base class에서 이미 처리되므로 추가 작업 불필요
        return data;
    }

    // ========================================
    // 접수번호 자동 생성 (쉼표 구분 형식)
    // ========================================
    generateNextReceptionNumber() {
        let maxNumber = 0;
        this.sampleLogs.forEach(log => {
            if (log.receptionNumber) {
                const numbers = log.receptionNumber.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
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

    // ========================================
    // 동적 채취장소 관리
    // ========================================
    createSamplingLocationItem(index) {
        const item = document.createElement('div');
        item.className = 'sampling-location-item';
        item.dataset.index = index;
        item.innerHTML = sanitizeHTML(`
            <span class="location-number">${index + 1}</span>
            <div class="location-autocomplete-wrapper">
                <input type="text" class="sampling-location-input" name="samplingLocations[]" required placeholder="리+지번 입력 (예: 내성리 123, 내성리 산 45)">
                <ul class="location-autocomplete-list"></ul>
            </div>
            <input type="text" class="sampling-crop-input" name="samplingCrops[]" placeholder="주작목">
        `);
        return item;
    }

    updateSamplingLocations(count) {
        const currentCount = this.samplingLocationsList.children.length;
        count = Math.max(1, parseInt(count, 10) || 1);

        if (count > currentCount) {
            for (let i = currentCount; i < count; i++) {
                const item = this.createSamplingLocationItem(i);
                this.samplingLocationsList.appendChild(item);
                this.bindLocationAutocomplete(
                    item.querySelector('.sampling-location-input'),
                    item.querySelector('.location-autocomplete-list')
                );
            }
        } else if (count < currentCount) {
            for (let i = currentCount - 1; i >= count; i--) {
                this.samplingLocationsList.children[i].remove();
            }
        }

        if (this.locationCountBadge) {
            this.locationCountBadge.textContent = `${count}개`;
        }
    }

    updateReceptionNumberRange(count) {
        count = Math.max(1, parseInt(count, 10) || 1);
        const baseNumber = parseInt(
            this.receptionNumberInput.dataset.baseNumber || this.receptionNumberInput.value.split(',')[0].trim(),
            10
        );

        if (count === 1) {
            this.receptionNumberInput.value = String(baseNumber);
        } else {
            const numbers = [];
            for (let i = 0; i < count; i++) {
                numbers.push(baseNumber + i);
            }
            this.receptionNumberInput.value = numbers.join(', ');
        }
    }

    getAllSamplingLocations() {
        const inputs = this.samplingLocationsList.querySelectorAll('.sampling-location-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
    }

    getAllSamplingCrops() {
        const inputs = this.samplingLocationsList.querySelectorAll('.sampling-crop-input');
        return Array.from(inputs).map(input => input.value.trim());
    }

    setSamplingLocations(locations, crops = []) {
        if (!Array.isArray(locations)) locations = [locations];
        if (!Array.isArray(crops)) crops = [crops];
        locations = locations.filter(l => l);

        const count = Math.max(1, locations.length);
        this.updateSamplingLocations(count);

        const locationInputs = this.samplingLocationsList.querySelectorAll('.sampling-location-input');
        const cropInputs = this.samplingLocationsList.querySelectorAll('.sampling-crop-input');

        locations.forEach((loc, i) => {
            if (locationInputs[i]) locationInputs[i].value = loc;
            if (cropInputs[i] && crops[i]) cropInputs[i].value = crops[i];
        });
    }

    // ========================================
    // 채취장소 자동완성
    // ========================================
    bindLocationAutocomplete(input, autocompleteList) {
        if (!input || !autocompleteList) return;
        if (typeof suggestRegionVillages !== 'function') return;

        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            if (GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length >= 1) {
                const suggestions = suggestRegionVillages(value, null, true);
                if (suggestions.length > 0) {
                    autocompleteList.innerHTML = sanitizeHTML(suggestions.map(item => `
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

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = input.value.trim();

                if (GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate && result.locations) {
                            autocompleteList.innerHTML = sanitizeHTML(result.locations.map(loc => `
                                <li data-village="${result.villageName}" data-district="${loc.district}" data-region-key="${loc.regionKey}" data-lot="${result.lotNumber || ''}">
                                    ${loc.fullAddress} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            input.value = result.fullAddress;
                            autocompleteList.classList.remove('show');
                        }
                    }
                }
            }
        });

        autocompleteList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const village = e.target.dataset.village;
                const district = e.target.dataset.district;
                const regionKey = e.target.dataset.regionKey;
                const isMountain = e.target.dataset.isMountain === 'true';
                const lot = e.target.dataset.lot;

                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
                const villageWithMountain = isMountain ? `${village} 산` : village;

                const currentValue = input.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLot = lot || (match ? match[0] : '');

                const fullAddress = extractedLot
                    ? `${region} ${district} ${villageWithMountain} ${extractedLot}`
                    : `${region} ${district} ${villageWithMountain}`;

                input.value = fullAddress;
                autocompleteList.classList.remove('show');
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteList.classList.remove('show');
            }, 200);
        });
    }

    // ========================================
    // 샘플 수정 (updateSample)
    // ========================================
    updateSample() {
        const formData = new FormData(this.form);
        const log = this.sampleLogs.find(l => l.id === this.editingId);
        const samplingLocations = this.getAllSamplingLocations();
        const samplingCrops = this.getAllSamplingCrops();

        if (log) {
            log.receptionNumber = formData.get('receptionNumber');
            log.date = formData.get('date');
            const applicantType = formData.get('applicantType') || '개인';
            log.applicantType = applicantType;
            log.birthDate = applicantType === '개인' ? formData.get('birthDate') : '';
            log.corpNumber = applicantType === '법인' ? formData.get('corpNumber') : '';
            log.name = formData.get('name');
            log.phoneNumber = formData.get('phoneNumber');
            log.address = formData.get('address');
            log.addressPostcode = formData.get('addressPostcode');
            log.addressRoad = formData.get('addressRoad');
            log.addressDetail = formData.get('addressDetail');
            log.receptionMethod = formData.get('receptionMethod');
            log.sampleName = formData.get('sampleName');
            log.sampleCount = formData.get('sampleCount');
            log.samplingLocations = samplingLocations;
            log.samplingLocation = samplingLocations.join(', ');
            log.samplingCrops = samplingCrops;
            log.mainCrop = samplingCrops.filter(c => c).join(', ');
            log.purpose = formData.get('purpose');
            log.testItems = formData.get('testItems');
            log.note = formData.get('note');
            log.updatedAt = new Date().toISOString();

            this.saveLogs();
            this.showToast('수정이 완료되었습니다.', 'success');
            this.resetForm();
            this.receptionNumberInput.value = this.generateNextReceptionNumber();
            this.editingId = null;

            if (this.navSubmitBtn) {
                this.navSubmitBtn.title = '접수 등록';
                this.navSubmitBtn.classList.remove('btn-edit-mode');
            }

            this.switchView('list');
        }
    }

    // ========================================
    // 완료/판정 토글
    // ========================================
    toggleComplete(id) {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            log.isComplete = !log.isComplete;
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.renderLogs(this.sampleLogs);
        }
    }

    toggleTestResult(id) {
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
            this.renderLogs(this.sampleLogs);
        }
    }

    // ========================================
    // 등록 결과 모달
    // ========================================
    showRegistrationResult(data) {
        const modal = document.getElementById('registrationResultModal');
        const resultTableBody = document.getElementById('resultTableBody');
        if (!modal || !resultTableBody) return;

        this.currentRegistrationData = data;

        const rows = [
            { label: '접수번호', value: data.receptionNumber },
            { label: '접수일자', value: data.date },
            { label: '성명', value: data.name },
            { label: '연락처', value: data.phoneNumber },
            { label: '시료명', value: data.sampleName },
            { label: '시료수', value: `${data.sampleCount}점` },
            { label: '채취장소', value: data.samplingLocation },
            { label: '목적', value: data.purpose },
            { label: '검사항목', value: data.testItems },
            { label: '통보방법', value: data.receptionMethod },
            { label: '비고', value: data.note }
        ];

        BaseSampleManager.buildResultTable(resultTableBody, rows);
        modal.classList.remove('hidden');
    }

    closeRegistrationResultModal() {
        const modal = document.getElementById('registrationResultModal');
        if (modal) modal.classList.add('hidden');
        this.currentRegistrationData = null;
    }

    // ========================================
    // 통계
    // ========================================
    showStatistics() {
        const total = this.sampleLogs.length;
        const completed = this.sampleLogs.filter(l => l.isComplete).length;
        const pending = total - completed;

        document.getElementById('statTotalCount').textContent = total;
        document.getElementById('statCompletedCount').textContent = completed;
        document.getElementById('statPendingCount').textContent = pending;

        // 시료명별
        const byWaterType = {};
        this.sampleLogs.forEach(l => {
            const type = l.sampleName || '미지정';
            byWaterType[type] = (byWaterType[type] || 0) + 1;
        });
        this.renderStatsChart('statsByWaterType', byWaterType, total);

        // 목적별
        const byPurpose = {};
        this.sampleLogs.forEach(l => {
            const purpose = l.purpose || '미지정';
            byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
        });
        this.renderStatsChart('statsByPurpose', byPurpose, total);

        // 검사항목별
        const byTestItems = {};
        this.sampleLogs.forEach(l => {
            const items = l.testItems || '미지정';
            byTestItems[items] = (byTestItems[items] || 0) + 1;
        });
        this.renderStatsChart('statsByTestItems', byTestItems, total);

        // 월별 집계
        const byMonth = {};
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        for (let i = 1; i <= 12; i++) {
            const monthKey = String(i).padStart(2, '0');
            byMonth[monthKey] = { count: 0, completed: 0, pending: 0, label: monthNames[i - 1] };
        }
        this.sampleLogs.forEach(l => {
            if (l.date) {
                const monthNum = l.date.substring(5, 7);
                if (byMonth[monthNum]) {
                    byMonth[monthNum].count++;
                    if (l.isComplete) {
                        byMonth[monthNum].completed++;
                    } else {
                        byMonth[monthNum].pending++;
                    }
                }
            }
        });

        // 분기별 집계
        const byQuarter = {
            Q1: { count: 0, completed: 0, pending: 0, label: '1분기 (1~3월)' },
            Q2: { count: 0, completed: 0, pending: 0, label: '2분기 (4~6월)' },
            Q3: { count: 0, completed: 0, pending: 0, label: '3분기 (7~9월)' },
            Q4: { count: 0, completed: 0, pending: 0, label: '4분기 (10~12월)' }
        };
        Object.entries(byMonth).forEach(([monthKey, data]) => {
            const monthNum = parseInt(monthKey, 10);
            let quarter;
            if (monthNum <= 3) quarter = 'Q1';
            else if (monthNum <= 6) quarter = 'Q2';
            else if (monthNum <= 9) quarter = 'Q3';
            else quarter = 'Q4';
            byQuarter[quarter].count += data.count;
            byQuarter[quarter].completed += data.completed;
            byQuarter[quarter].pending += data.pending;
        });

        this.renderMonthlyChart('statsByMonth', byMonth);
        this.renderQuarterlySummary('statsQuarterly', byQuarter);

        const statisticsModal = document.getElementById('statisticsModal');
        if (statisticsModal) statisticsModal.classList.remove('hidden');
    }

    renderStatsChart(containerId, data, total) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        const testItemsClassMap = { '생활용수': 'test-living', '농업용수': 'test-agricultural' };
        const waterTypeClassMap = { '지하수': 'water-underground', '하천수': 'water-river', '저수지': 'water-reservoir', '수돗물': 'water-tap' };

        container.innerHTML = sanitizeHTML(entries.map(([label, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            const barClass = testItemsClassMap[label] || waterTypeClassMap[label] || 'water-other';
            return `
                <div class="stat-bar-item">
                    <div class="stat-bar-label">${label}</div>
                    <div class="stat-bar-wrapper">
                        <div class="stat-bar-fill ${barClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="stat-bar-value">${count}건 (${percentage}%)</div>
                </div>
            `;
        }).join(''));
    }

    renderMonthlyChart(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
        const maxCount = Math.max(...entries.map(([, v]) => v.count), 1);
        const totalCount = entries.reduce((sum, [, v]) => sum + v.count, 0);

        if (totalCount === 0) {
            container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>');
            return;
        }

        container.innerHTML = sanitizeHTML(`
            <div class="monthly-chart">
                <div class="monthly-bars">
                    ${entries.map(([key, value]) => {
                        const heightPercent = maxCount > 0 ? (value.count / maxCount) * 100 : 0;
                        const completedPercent = value.count > 0 ? (value.completed / value.count) * 100 : 0;
                        return `
                            <div class="monthly-bar-group">
                                <div class="monthly-bar-container">
                                    <div class="monthly-bar-stack" style="height: ${heightPercent}%">
                                        <div class="monthly-bar-completed" style="height: ${completedPercent}%" title="완료: ${value.completed}건"></div>
                                        <div class="monthly-bar-pending" style="height: ${100 - completedPercent}%" title="미완료: ${value.pending}건"></div>
                                    </div>
                    ${value.count > 0 ? `<span class="monthly-bar-value">${value.count}</span>` : ''}
                                </div>
                                <span class="monthly-bar-label">${value.label}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="monthly-legend">
                    <span class="legend-item"><span class="legend-color completed"></span> 완료</span>
                    <span class="legend-item"><span class="legend-color pending"></span> 미완료</span>
                </div>
            </div>
        `);
    }

    renderQuarterlySummary(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalCount = Object.values(data).reduce((sum, q) => sum + q.count, 0);

        container.innerHTML = sanitizeHTML(`
            <div class="quarterly-summary">
                ${Object.entries(data).map(([key, value]) => {
                    const percent = totalCount > 0 ? ((value.count / totalCount) * 100).toFixed(1) : 0;
                    const completionRate = value.count > 0 ? ((value.completed / value.count) * 100).toFixed(0) : 0;
                    return `
                        <div class="quarterly-item">
                            <div class="quarterly-label">${value.label}</div>
                            <div class="quarterly-stats">
                                <span class="quarterly-count">${value.count}건</span>
                                <span class="quarterly-percent">(${percent}%)</span>
                            </div>
                            <div class="quarterly-completion">
                                <div class="completion-bar">
                                    <div class="completion-fill" style="width: ${completionRate}%"></div>
                                </div>
                                <span class="completion-text">완료율 ${completionRate}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `);
    }

    // ========================================
    // 검색/필터
    // ========================================
    extractReceptionNumber(receptionNumber) {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    filterAndRenderLogs() {
        const filtered = this.sampleLogs.filter(log => {
            const matchesName = !this.currentSearchFilter.name ||
                log.name.toLowerCase().includes(this.currentSearchFilter.name);

            let matchesReception = true;
            if (this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo) {
                const logNum = this.extractReceptionNumber(log.receptionNumber);
                const fromNum = this.currentSearchFilter.receptionFrom ? parseInt(this.currentSearchFilter.receptionFrom, 10) : 0;
                const toNum = this.currentSearchFilter.receptionTo ? parseInt(this.currentSearchFilter.receptionTo, 10) : Infinity;
                if (fromNum && logNum < fromNum) matchesReception = false;
                if (toNum !== Infinity && logNum > toNum) matchesReception = false;
            }

            let matchesDate = true;
            if (this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo) {
                const logDate = log.date;
                if (this.currentSearchFilter.dateFrom && logDate < this.currentSearchFilter.dateFrom) matchesDate = false;
                if (this.currentSearchFilter.dateTo && logDate > this.currentSearchFilter.dateTo) matchesDate = false;
            }

            let matchesCompleted = true;
            if (this.currentSearchFilter.completed === 'completed') {
                matchesCompleted = log.isComplete === true;
            } else if (this.currentSearchFilter.completed === 'incomplete') {
                matchesCompleted = !log.isComplete;
            }

            return matchesName && matchesReception && matchesDate && matchesCompleted;
        });

        this.renderLogs(filtered);
        this.updateSearchButtonState();
    }

    updateSearchButtonState() {
        const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
            this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom ||
            this.currentSearchFilter.receptionTo || this.currentSearchFilter.completed;
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        if (openSearchModalBtn) {
            if (hasFilter) {
                openSearchModalBtn.classList.add('has-filter');
                openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색 중');
            } else {
                openSearchModalBtn.classList.remove('has-filter');
                openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색');
            }
        }
    }

    // ========================================
    // 라벨 인쇄
    // ========================================
    openLabelPrintWithData(logs) {
        const labelData = logs.map(log => {
            const addressParts = [];
            if (log.addressRoad) addressParts.push(log.addressRoad);
            if (log.addressDetail) addressParts.push(log.addressDetail);
            const address = addressParts.join(' ');
            return { name: log.name || '', address: address, postalCode: log.addressPostcode || '' };
        });

        // 중복 제거 (주소 기준)
        const uniqueMap = new Map();
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

    // ========================================
    // 우편발송일자 모달
    // ========================================
    openMailDateModal(selectedIds) {
        this.pendingMailDateIds = selectedIds;
        const mailDateInput = document.getElementById('mailDateInput');
        const mailDateInfo = document.getElementById('mailDateInfo');
        const mailDateModal = document.getElementById('mailDateModal');
        const today = new Date().toISOString().split('T')[0];
        if (mailDateInput) mailDateInput.value = today;
        if (mailDateInfo) mailDateInfo.textContent = `선택한 ${selectedIds.length}건의 우편발송일자를 입력하세요.`;
        if (mailDateModal) mailDateModal.classList.remove('hidden');
    }

    closeMailDateModalFn() {
        const mailDateModal = document.getElementById('mailDateModal');
        if (mailDateModal) mailDateModal.classList.add('hidden');
        this.pendingMailDateIds = [];
    }

    // ========================================
    // 타입별 추가 이벤트
    // ========================================
    setupTypeSpecificEvents() {
        const self = this;

        // 주소 검색
        if (window.AddressManager) {
            new window.AddressManager({
                searchBtn: document.getElementById('searchAddressBtn'),
                postcodeInput: this.addressPostcode,
                roadInput: this.addressRoad,
                detailInput: this.addressDetail,
                hiddenInput: this.addressHidden,
                modal: document.getElementById('addressModal'),
                closeBtn: document.getElementById('closeAddressModal'),
                container: document.getElementById('daumPostcodeContainer')
            });
        }

        // 개인/법인 선택 전환
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.addEventListener('change', () => {
                const isCorpSelected = this.applicantTypeSelect.value === '법인';
                if (isCorpSelected) {
                    this.birthDateField.classList.add('hidden');
                    this.corpNumberField.classList.remove('hidden');
                    this.birthDateInput.value = '';
                } else {
                    this.birthDateField.classList.remove('hidden');
                    this.corpNumberField.classList.add('hidden');
                    this.corpNumberInput.value = '';
                }
            });
        }

        // 법인번호 자동 하이픈
        if (this.corpNumberInput) {
            this.corpNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length > 13) value = value.slice(0, 13);
                if (value.length > 6) value = value.slice(0, 6) + '-' + value.slice(6);
                e.target.value = value;
            });
        }

        // 검사항목 라디오 토글
        const testItemRadios = document.querySelectorAll('input[name="testItems"]');
        testItemRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === '생활용수') {
                    this.livingWaterItems.classList.add('active');
                    this.agriculturalWaterItems.classList.remove('active');
                } else {
                    this.livingWaterItems.classList.remove('active');
                    this.agriculturalWaterItems.classList.add('active');
                }
            });
        });

        // 통보방법 버튼
        this.receptionMethodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.receptionMethodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.receptionMethodInput.value = btn.dataset.method;
            });
        });

        // 전체 보기 토글
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                this.isFullView = !this.isFullView;
                const hiddenCols = document.querySelectorAll('.col-zipcode, .col-applicant-type, .col-birth-corp');
                hiddenCols.forEach(col => {
                    if (this.isFullView) {
                        col.classList.remove('hidden');
                    } else {
                        col.classList.add('hidden');
                    }
                });
                const toggleText = viewToggleBtn.querySelector('.toggle-text');
                if (toggleText) {
                    toggleText.textContent = this.isFullView ? '기본 보기' : '전체 보기';
                }
            });
        }

        // 시료수 변경 시 채취장소 필드 및 접수번호 업데이트
        if (this.sampleCountInput) {
            this.sampleCountInput.addEventListener('change', (e) => {
                this.updateSamplingLocations(e.target.value);
                this.updateReceptionNumberRange(e.target.value);
            });
            this.sampleCountInput.addEventListener('input', (e) => {
                this.updateSamplingLocations(e.target.value);
                this.updateReceptionNumberRange(e.target.value);
            });
        }

        // 채취장소 추가/삭제 버튼
        const btnAddLocation = document.getElementById('btnAddLocation');
        const btnRemoveLocation = document.getElementById('btnRemoveLocation');

        if (btnAddLocation) {
            btnAddLocation.addEventListener('click', () => {
                const currentCount = this.samplingLocationsList.children.length;
                const newCount = currentCount + 1;
                this.updateSamplingLocations(newCount);
                if (this.sampleCountInput) this.sampleCountInput.value = newCount;
                this.updateReceptionNumberRange(newCount);
            });
        }

        if (btnRemoveLocation) {
            btnRemoveLocation.addEventListener('click', () => {
                const currentCount = this.samplingLocationsList.children.length;
                if (currentCount > 1) {
                    const newCount = currentCount - 1;
                    this.updateSamplingLocations(newCount);
                    if (this.sampleCountInput) this.sampleCountInput.value = newCount;
                    this.updateReceptionNumberRange(newCount);
                }
            });
        }

        // 초기 채취장소 자동완성 바인딩
        const initialLocationItems = this.samplingLocationsList.querySelectorAll('.sampling-location-item');
        initialLocationItems.forEach((item) => {
            const input = item.querySelector('.sampling-location-input');
            const list = item.querySelector('.location-autocomplete-list');
            this.bindLocationAutocomplete(input, list);
        });

        // 접수번호 초기 기본 번호 저장
        if (this.receptionNumberInput) {
            this.receptionNumberInput.dataset.baseNumber = this.receptionNumberInput.value;
        }

        // 네비게이션 제출/초기화 버튼
        const navResetBtn = document.getElementById('navResetBtn');
        if (this.navSubmitBtn) {
            this.navSubmitBtn.addEventListener('click', () => {
                if (this.form.checkValidity()) {
                    this.submitForm();
                } else {
                    this.form.reportValidity();
                }
            });
        }
        if (navResetBtn) {
            navResetBtn.addEventListener('click', () => {
                if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
                    this.resetForm();
                }
            });
        }

        // 빈 상태에서 "새 시료 접수하기" 버튼
        const btnGoForm = document.querySelector('.btn-go-form');
        if (btnGoForm) {
            btnGoForm.addEventListener('click', () => this.switchView('form'));
        }

        // 테이블 이벤트 위임
        this.tableBody?.addEventListener('click', (e) => {
            const completeBtn = e.target.closest('.btn-complete');
            if (completeBtn) {
                this.toggleComplete(completeBtn.dataset.id);
                return;
            }
            const resultBtn = e.target.closest('.btn-result');
            if (resultBtn) {
                this.toggleTestResult(resultBtn.dataset.id);
                return;
            }
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                if (confirm('이 항목을 삭제하시겠습니까?')) {
                    this.deleteSample(deleteBtn.dataset.id);
                }
                return;
            }
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                this.editSample(editBtn.dataset.id);
                return;
            }
        });

        // 전체 선택 / 선택 삭제
        const selectAllCheckbox = document.getElementById('selectAll');
        const btnBulkDelete = document.getElementById('btnBulkDelete');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.row-checkbox');
                checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        const tableBody = document.getElementById('tableBody') || document.querySelector('tbody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const nameCell = e.target.closest('.col-name');
                if (nameCell && nameCell.dataset.name) {
                    const targetName = nameCell.dataset.name;
                    const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
                    const targetCheckboxes = [];

                    rowCheckboxes.forEach(cb => {
                        const tr = cb.closest('tr');
                        const nc = tr?.querySelector('.col-name');
                        if (nc && nc.dataset.name === targetName) {
                            targetCheckboxes.push(cb);
                        }
                    });

                    if (targetCheckboxes.length === 0) return;
                    const allChecked = targetCheckboxes.every(cb => cb.checked);
                    targetCheckboxes.forEach(cb => { cb.checked = !allChecked; });

                    // selectAll 상태 업데이트
                    if (selectAllCheckbox) {
                        const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                        selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });

            // 개별 체크박스 변경 시 전체 선택 상태 갱신
            tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('row-checkbox')) {
                    const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                    const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });
        }

        // 라벨 인쇄
        const btnLabelPrint = document.getElementById('btnLabelPrint');
        if (btnLabelPrint) {
            btnLabelPrint.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

                if (selectedIds.length === 0) {
                    if (this.sampleLogs.length === 0) {
                        alert('인쇄할 데이터가 없습니다.');
                        return;
                    }
                    if (!confirm(`선택된 항목이 없습니다.\n전체 ${this.sampleLogs.length}건을 라벨 인쇄하시겠습니까?`)) return;
                    this.openLabelPrintWithData(this.sampleLogs);
                } else {
                    const selectedLogs = this.sampleLogs.filter(log => selectedIds.includes(String(log.id)));
                    this.openLabelPrintWithData(selectedLogs);
                }
            });
        }

        if (btnBulkDelete) {
            btnBulkDelete.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
                if (selectedIds.length === 0) {
                    alert('삭제할 항목을 선택해주세요.');
                    return;
                }
                if (confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?`)) {
                    this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                    this.saveLogs();
                    this.renderLogs(this.sampleLogs);
                    if (selectAllCheckbox) selectAllCheckbox.checked = false;

                    if (window.firestoreDb?.isEnabled()) {
                        Promise.all(selectedIds.map(id =>
                            window.firestoreDb.delete('water', parseInt(this.selectedYear), id)
                        ))
                            .then(() => this.log('Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
                            .catch(err => (window.logger?.error || console.error)('Firebase 일괄 삭제 실패:', err));
                    }

                    this.showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
                }
            });
        }

        // 우편발송일자 모달
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const closeMailDateModal = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');
        const mailDateModal = document.getElementById('mailDateModal');

        if (closeMailDateModal) closeMailDateModal.addEventListener('click', () => this.closeMailDateModalFn());
        if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', () => this.closeMailDateModalFn());
        if (mailDateModal) {
            mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeMailDateModalFn());
        }

        if (confirmMailDateBtn) {
            confirmMailDateBtn.addEventListener('click', () => {
                const mailDateInput = document.getElementById('mailDateInput');
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
                this.renderLogs(this.sampleLogs);
                if (selectAllCheckbox) selectAllCheckbox.checked = false;

                this.closeMailDateModalFn();
                this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
                if (selectedIds.length === 0) {
                    this.showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                    return;
                }
                this.openMailDateModal(selectedIds);
            });
        }

        // 통계 모달
        const btnStatistics = document.getElementById('btnStatistics');
        const statisticsModal = document.getElementById('statisticsModal');
        const closeStatisticsModal = document.getElementById('closeStatisticsModal');
        const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

        if (btnStatistics) btnStatistics.addEventListener('click', () => this.showStatistics());
        if (closeStatisticsModal) closeStatisticsModal.addEventListener('click', () => statisticsModal.classList.add('hidden'));
        if (closeStatisticsBtn) closeStatisticsBtn.addEventListener('click', () => statisticsModal.classList.add('hidden'));
        if (statisticsModal) {
            statisticsModal.querySelector('.modal-overlay').addEventListener('click', () => statisticsModal.classList.add('hidden'));
        }

        // 등록 결과 모달
        const closeRegistrationModal = document.getElementById('closeRegistrationModal');
        const closeResultBtn = document.getElementById('closeResultBtn');
        const editResultBtn = document.getElementById('editResultBtn');
        const registrationResultModal = document.getElementById('registrationResultModal');

        if (closeRegistrationModal) closeRegistrationModal.addEventListener('click', () => this.closeRegistrationResultModal());
        if (closeResultBtn) closeResultBtn.addEventListener('click', () => this.closeRegistrationResultModal());
        if (editResultBtn) {
            editResultBtn.addEventListener('click', () => {
                if (this.currentRegistrationData) {
                    const dataToEdit = this.currentRegistrationData;
                    this.closeRegistrationResultModal();
                    this.editSample(String(dataToEdit.id));
                }
            });
        }
        if (registrationResultModal) {
            registrationResultModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeRegistrationResultModal());
        }

        // 검색 모달
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const listSearchModal = document.getElementById('listSearchModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const applySearchBtn = document.getElementById('applySearchBtn');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const searchDateFromInput = document.getElementById('searchDateFromInput');
        const searchDateToInput = document.getElementById('searchDateToInput');
        const searchNameInput = document.getElementById('searchNameInput');
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput');
        const searchReceptionToInput = document.getElementById('searchReceptionToInput');
        const clearSearchDate = document.getElementById('clearSearchDate');
        const clearSearchReception = document.getElementById('clearSearchReception');
        const completedFilter = document.getElementById('completedFilter');

        if (completedFilter) {
            completedFilter.addEventListener('change', (e) => {
                this.currentSearchFilter.completed = e.target.value;
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
                listSearchModal.classList.remove('hidden');
                if (searchNameInput) searchNameInput.focus();
            });
        }
        if (closeSearchModal) closeSearchModal.addEventListener('click', () => listSearchModal.classList.add('hidden'));
        if (listSearchModal) {
            listSearchModal.querySelector('.modal-overlay').addEventListener('click', () => listSearchModal.classList.add('hidden'));
        }
        if (clearSearchDate) {
            clearSearchDate.addEventListener('click', () => {
                if (searchDateFromInput) searchDateFromInput.value = '';
                if (searchDateToInput) searchDateToInput.value = '';
            });
        }
        if (clearSearchReception) {
            clearSearchReception.addEventListener('click', () => {
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
                if (completedFilter) completedFilter.value = '';
                this.currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', completed: '' };
                this.filterAndRenderLogs();
                listSearchModal.classList.add('hidden');
            });
        }
        if (applySearchBtn) {
            applySearchBtn.addEventListener('click', () => {
                this.currentSearchFilter.dateFrom = searchDateFromInput ? searchDateFromInput.value : '';
                this.currentSearchFilter.dateTo = searchDateToInput ? searchDateToInput.value : '';
                this.currentSearchFilter.name = searchNameInput ? searchNameInput.value.toLowerCase() : '';
                this.currentSearchFilter.receptionFrom = searchReceptionFromInput ? searchReceptionFromInput.value : '';
                this.currentSearchFilter.receptionTo = searchReceptionToInput ? searchReceptionToInput.value : '';
                this.filterAndRenderLogs();
                listSearchModal.classList.add('hidden');
            });
        }

        // Enter 키로 검색
        [searchNameInput, searchReceptionFromInput, searchReceptionToInput].forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && applySearchBtn) applySearchBtn.click();
                });
            }
        });

        // JSON 저장/불러오기
        SampleUtils.setupJSONSaveHandler({
            buttonElement: document.getElementById('saveJsonBtn'),
            sampleType: '물',
            getData: () => this.sampleLogs,
            FileAPI: this.FileAPI,
            filePrefix: 'water-samples',
            showToast: (msg, type) => this.showToast(msg, type)
        });

        SampleUtils.setupJSONLoadHandler({
            inputElement: document.getElementById('loadJsonInput'),
            getData: () => this.sampleLogs,
            setData: (data) => { this.sampleLogs = data; },
            saveData: () => this.saveLogs(),
            renderData: () => this.renderLogs(this.sampleLogs),
            showToast: (msg, type) => this.showToast(msg, type)
        });

        // 엑셀 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                if (window.encryptionManager?.isReady()) {
                    const verified = await window.encryptionManager.verifyPasswordForExport();
                    if (!verified) return;
                }
                if (this.sampleLogs.length === 0) {
                    alert('내보낼 데이터가 없습니다.');
                    return;
                }

                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
                const logsToExport = selectedIds.length > 0
                    ? this.sampleLogs.filter(log => selectedIds.includes(log.id))
                    : this.sampleLogs;

                if (selectedIds.length > 0) {
                    this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
                }

                const exportData = logsToExport.map(log => {
                    const addressParts = parseAddressParts(log.addressRoad || log.address || '');
                    const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';
                    const applicantType = log.applicantType || '개인';
                    const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

                    return {
                        '접수번호': log.receptionNumber || '-',
                        '접수일자': log.date || '-',
                        '법인여부': applicantType,
                        '생년월일/법인번호': birthOrCorp,
                        '성명': log.name || '-',
                        '연락처': log.phoneNumber || '-',
                        '시도': addressParts.sido || '-',
                        '시군구': addressParts.sigungu || '-',
                        '읍면동': addressParts.eupmyeondong || '-',
                        '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                        '전체주소': fullAddress,
                        '우편번호': log.addressPostcode || '-',
                        '채취장소': log.samplingLocation || '-',
                        '시료명': log.sampleName || '-',
                        '시료수': log.sampleCount || '-',
                        '주작목': log.mainCrop || '-',
                        '목적': log.purpose || '-',
                        '검사항목': log.testItems || '-',
                        '통보방법': log.receptionMethod || '-',
                        '비고': log.note || '-',
                        '완료여부': log.isComplete ? '완료' : '미완료',
                        '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                    };
                });

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(exportData);
                ws['!cols'] = [
                    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 15 },
                    { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
                    { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 25 },
                    { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
                    { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, '수질분석 접수');
                XLSX.writeFile(wb, `수질분석_접수대장_${new Date().toISOString().split('T')[0]}.xlsx`);
                this.showToast('엑셀 파일이 저장되었습니다.', 'success');
            });
        }

        // 자동 저장 설정
        let autoSaveFileHandle = null;

        const autoSaveToFile = async () => {
            return await SampleUtils.performAutoSave({
                FileAPI: this.FileAPI,
                moduleKey: 'water',
                data: this.sampleLogs,
                webFileHandle: autoSaveFileHandle,
                log: (...args) => this.log(...args)
            });
        };

        window.triggerWaterAutoSave = autoSaveToFile;

        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'water',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => autoSaveFileHandle,
            setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: (msg, type) => this.showToast(msg, type)
        });

        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'water',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => autoSaveFileHandle,
            setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: (msg, type) => this.showToast(msg, type),
            log: (...args) => this.log(...args)
        });

        // 엑셀 가져오기
        const excelImporter = new ExcelImportManager({
            appFields: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'name', label: '성명' },
                { key: 'phoneNumber', label: '전화번호' },
                { key: 'address', label: '주소' },
                { key: 'sampleName', label: '시료명' },
                { key: 'samplingLocation', label: '채취장소' },
                { key: 'mainCrop', label: '주작목' },
                { key: 'purpose', label: '목적' },
                { key: 'testItems', label: '검사항목' },
                { key: 'receptionMethod', label: '통보방법' },
                { key: 'note', label: '비고' }
            ],
            autoMapRules: {
                '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
                '접수일자': 'date', '날짜': 'date', '일자': 'date',
                '성명': 'name', '이름': 'name', '의뢰인': 'name', '의뢰자': 'name',
                '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber', '휴대폰': 'phoneNumber',
                '주소': 'address', '의뢰인주소': 'address',
                '시료명': 'sampleName', '시료': 'sampleName', '수질': 'sampleName',
                '채취장소': 'samplingLocation', '채취지': 'samplingLocation', '소재지': 'samplingLocation',
                '주작목': 'mainCrop', '작물': 'mainCrop', '작물명': 'mainCrop',
                '목적': 'purpose', '용도': 'purpose',
                '검사항목': 'testItems', '분석항목': 'testItems',
                '통보방법': 'receptionMethod', '수령방법': 'receptionMethod', '수령 방법': 'receptionMethod',
                '비고': 'note', '메모': 'note', '참고': 'note'
            },
            templateConfig: {
                headers: ['접수번호', '시료명', '채취장소', '주작목', '목적', '검사항목', '비고'],
                sampleRow: ['1', '지하수', '봉화읍 내성리 123', '벼', '참고용', '농업용수', ''],
                colWidths: [
                    { wch: 10 }, { wch: 10 }, { wch: 30 },
                    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
                ],
                sheetName: '수질시료',
                fileName: '수질분석_가져오기_서식'
            },
            previewColumns: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'sampleName', label: '시료명' },
                { key: 'name', label: '성명' },
                { key: 'samplingLocation', label: '채취장소' },
                { key: 'mainCrop', label: '주작목' },
                { key: 'testItems', label: '검사항목' },
                { key: 'note', label: '비고' }
            ],
            getCommonData: () => ({
                date: document.getElementById('importDate').value || new Date().toISOString().slice(0, 10),
                name: document.getElementById('importName').value.trim(),
                phone: document.getElementById('importPhone').value.trim(),
                address: document.getElementById('importAddress').value.trim(),
                method: document.getElementById('importMethod').value,
                purpose: document.getElementById('importPurpose').value,
                now: new Date().toISOString()
            }),
            buildRecord: (getVal, parseExcelDate, common) => {
                const receptionNumber = getVal('receptionNumber') || '';
                const dateVal = getVal('date');
                const date = parseExcelDate(dateVal) || common.date;
                const name = getVal('name') || common.name;
                const phoneNumber = getVal('phoneNumber') || common.phone;
                const address = getVal('address') || common.address;
                const sampleName = getVal('sampleName') || '지하수';
                const samplingLocation = getVal('samplingLocation') || '';
                const mainCrop = getVal('mainCrop') || '';
                const purpose = getVal('purpose') || common.purpose;
                const testItems = getVal('testItems') || '농업용수';
                const receptionMethod = getVal('receptionMethod') || common.method;
                const note = getVal('note') || '';

                return {
                    id: SampleUtils.generateUUID(),
                    receptionNumber, date,
                    applicantType: '개인',
                    birthDate: '', corpNumber: '',
                    name, phoneNumber, address,
                    addressPostcode: '', addressRoad: address, addressDetail: '',
                    receptionMethod, sampleName, sampleCount: '1',
                    samplingLocation, mainCrop, purpose, testItems, note,
                    isComplete: false,
                    createdAt: common.now, updatedAt: common.now
                };
            },
            skipRowCheck: (record, rowIdx) => {
                if (!record.samplingLocation && !record.name && !record.sampleName) {
                    return `행 ${rowIdx + 2}: 채취장소, 성명, 시료명이 모두 비어 있어 건너뜁니다.`;
                }
                return null;
            },
            getExistingLogs: () => this.sampleLogs,
            onImportComplete: (records) => {
                records.forEach(logEntry => this.sampleLogs.push(logEntry));
                this.sampleLogs.sort((a, b) => {
                    const numA = parseInt(a.receptionNumber) || 0;
                    const numB = parseInt(b.receptionNumber) || 0;
                    if (numA !== numB) return numA - numB;
                    return (a.receptionNumber || '').localeCompare(b.receptionNumber || '');
                });
                this.saveLogs();
                this.renderLogs(this.sampleLogs);
            }
        });
        excelImporter.init();
    }
}

// ========================================
// 인스턴스 생성 및 초기화
// ========================================
const waterManager = new WaterSampleManager();
window.waterManager = waterManager;

document.addEventListener('DOMContentLoaded', () => {
    waterManager.init();
});
