// ========================================
// Soil Sample Manager
// 토양 시료 관리 클래스
// ========================================

/**
 * 토양 시료 관리 매니저
 * BaseSampleManager를 확장하여 토양 특화 기능 구현
 */
class SoilSampleManager extends BaseSampleManager {
    constructor() {
        super({
            moduleKey: 'soil',
            moduleName: '토양',
            storageKey: 'soilSampleLogs',
            debug: window.DEBUG || false
        });

        // 토양 전용 상태
        this.parcels = [];
        this.parcelIdCounter = 0;
        this.editingLogId = null;
    }

    /**
     * 초기화 - 부모 클래스 초기화 + 토양 특화 초기화
     */
    async init() {
        this.log(' SoilSampleManager 초기화 시작');
        await super.init();
        this.log(' 부모 클래스 초기화 완료');

        // 토양 전용 초기화
        this.initSoilSpecificElements();
        this.initParcels();

        this.log(' 초기화 완료, sampleLogs:', this.sampleLogs?.length || 0, '건');
    }

    /**
     * DOM 요소 캐싱 오버라이드
     */
    cacheElements() {
        this.form = document.getElementById('sampleForm');
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');
        this.recordCountEl = document.getElementById('recordCount');

        // 토양 전용 요소
        this.parcelsContainer = document.getElementById('parcelsContainer');
        this.addParcelBtn = document.getElementById('addParcelBtn');
        this.emptyParcels = document.getElementById('emptyParcels');

        this.log(` cacheElements - tableBody:`, !!this.tableBody);
    }

    /**
     * 토양 전용 요소 초기화
     */
    initSoilSpecificElements() {
        // 주소 검색
        if (window.AddressManager) {
            this.addressManager = new window.AddressManager({
                searchBtn: document.getElementById('searchAddressBtn'),
                postcodeInput: document.getElementById('addressPostcode'),
                roadInput: document.getElementById('addressRoad'),
                detailInput: document.getElementById('addressDetail'),
                hiddenInput: document.getElementById('address'),
                modal: document.getElementById('addressModal'),
                closeBtn: document.getElementById('closeAddressModal'),
                container: document.getElementById('daumPostcodeContainer')
            });
        }

        // 빈 필지 상태 버튼
        const btnAddParcelEmpty = document.querySelector('.btn-add-parcel-empty');
        if (btnAddParcelEmpty) {
            btnAddParcelEmpty.addEventListener('click', () => this.addParcel());
        }
    }

    /**
     * 필지 시스템 초기화
     */
    initParcels() {
        if (!this.parcelsContainer) {
            this.log('❌ parcelsContainer를 찾을 수 없습니다');
            return;
        }

        // 필지 추가 버튼
        if (this.addParcelBtn) {
            this.addParcelBtn.addEventListener('click', () => this.addParcel());
        }

        // 초기 필지 1개 추가
        this.addParcel();

        // 접수번호 변경 시 필지 번호 업데이트
        const receptionNumberInput = document.getElementById('receptionNumber');
        if (receptionNumberInput) {
            receptionNumberInput.addEventListener('input', () => {
                this.updateAllParcelNumbers();
            });
        }

        this.updateEmptyParcelsState();
    }

    /**
     * 필지 추가
     */
    addParcel() {
        const parcelId = `parcel-${this.parcelIdCounter++}`;
        const parcel = {
            id: parcelId,
            lotAddress: '',
            isMountain: false,
            subLots: [],
            crops: [],
            category: '',
            note: ''
        };
        this.parcels.push(parcel);

        this.renderParcelCard(parcel, this.parcels.length);
        this.updateParcelsData();
        this.updateEmptyParcelsState();
    }

    /**
     * 필지 카드 렌더링
     */
    renderParcelCard(parcel, index) {
        // 기존 soil-script.js의 renderParcelCard 로직을 이곳으로 이동 예정
        // 현재는 최소 구조만 제공
        const card = document.createElement('div');
        card.className = 'parcel-card';
        card.id = parcel.id;
        card.innerHTML = `
            <div class="parcel-card-header">
                <h4>필지 ${index}</h4>
                <button type="button" class="btn-remove-parcel" data-id="${parcel.id}">삭제</button>
            </div>
            <p>필지 렌더링 구현 필요</p>
        `;
        this.parcelsContainer.appendChild(card);
    }

    /**
     * 모든 필지 번호 업데이트
     */
    updateAllParcelNumbers() {
        // 추후 구현
    }

    /**
     * 필지 데이터 업데이트
     */
    updateParcelsData() {
        const parcelsDataInput = document.getElementById('parcelsData');
        if (parcelsDataInput) {
            parcelsDataInput.value = JSON.stringify(this.parcels);
        }
    }

    /**
     * 빈 필지 상태 표시/숨김
     */
    updateEmptyParcelsState() {
        if (this.emptyParcels) {
            if (this.parcels.length === 0) {
                this.emptyParcels.style.display = 'block';
            } else {
                this.emptyParcels.style.display = 'none';
            }
        }
    }

    /**
     * 로그 렌더링 (토양 테이블)
     */
    renderLogs(logs) {
        this.log(` renderLogs 호출, logs:`, logs ? logs.length : 0, '건');

        if (!this.tableBody) {
            console.error(`[${this.moduleName}] tableBody가 없음!`);
            return;
        }

        // PaginationManager 초기화
        if (!this.paginationManager && window.PaginationManager) {
            this.paginationManager = new window.PaginationManager({
                storageKey: 'soilItemsPerPage',
                defaultItemsPerPage: 100,
                onPageChange: () => {
                    this.updateRecordCount();
                },
                renderRow: (log) => this.createTableRow(log)
            });

            this.paginationManager.setTableElements(this.tableBody, this.emptyState);
        }

        if (this.paginationManager) {
            this.paginationManager.setData(logs || []);
            this.paginationManager.render();
        } else {
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
            row.classList.add('completed');
        }

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
        btnComplete.className = `btn-complete ${log.isComplete ? 'completed' : ''}`;
        btnComplete.dataset.id = log.id;
        btnComplete.title = log.isComplete ? '완료됨' : '완료 표시';
        btnComplete.textContent = log.isComplete ? '✅' : '⬜';
        btnComplete.onclick = () => window.toggleComplete && window.toggleComplete(log.id);
        tdComplete.appendChild(btnComplete);
        row.appendChild(tdComplete);

        // 3. 접수번호
        const tdReceptionNumber = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-link edit-btn';
        editBtn.onclick = () => this.editSample(log.id);
        editBtn.textContent = log.receptionNumber || '-';
        tdReceptionNumber.appendChild(editBtn);
        row.appendChild(tdReceptionNumber);

        // 4. 접수일자
        const tdDate = document.createElement('td');
        tdDate.textContent = log.date || '-';
        row.appendChild(tdDate);

        // 5. 성명
        const tdName = document.createElement('td');
        tdName.textContent = log.name || '-';
        row.appendChild(tdName);

        // 6. 주소
        const tdAddress = document.createElement('td');
        tdAddress.className = 'text-truncate';
        const fullAddress = log.address || '-';
        tdAddress.dataset.tooltip = fullAddress;
        tdAddress.textContent = fullAddress;
        row.appendChild(tdAddress);

        // 7. 필지주소
        const tdParcelNumber = document.createElement('td');
        tdParcelNumber.className = 'text-truncate';
        const parcelNumber = log.lotAddress || '-';
        tdParcelNumber.dataset.tooltip = parcelNumber;
        tdParcelNumber.textContent = parcelNumber;
        row.appendChild(tdParcelNumber);

        // 8. 지목
        const tdLandType = document.createElement('td');
        tdLandType.textContent = log.subCategory || '-';
        row.appendChild(tdLandType);

        // 9. 목적
        const tdPurpose = document.createElement('td');
        tdPurpose.textContent = log.purpose || '-';
        row.appendChild(tdPurpose);

        // 10. 비고
        const tdNote = document.createElement('td');
        tdNote.className = 'col-note';
        tdNote.textContent = log.note || '-';
        row.appendChild(tdNote);

        // 11. 관리
        const tdAction = document.createElement('td');
        tdAction.className = 'col-action';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'table-actions';

        const editActionBtn = document.createElement('button');
        editActionBtn.className = 'btn-edit';
        editActionBtn.dataset.id = log.id;
        editActionBtn.textContent = '수정';
        editActionBtn.onclick = () => this.editSample(log.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.dataset.id = log.id;
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = () => {
            if (confirm('이 항목을 삭제하시겠습니까?')) {
                this.deleteSample(log.id);
            }
        };

        actionsDiv.appendChild(editActionBtn);
        actionsDiv.appendChild(deleteBtn);
        tdAction.appendChild(actionsDiv);
        row.appendChild(tdAction);

        return row;
    }

    /**
     * 폼 제출
     */
    async submitForm() {
        // 필지 데이터 검증
        const validParcels = this.parcels.filter(p => p.lotAddress.trim());
        if (validParcels.length === 0) {
            this.showToast('최소 1개의 필지 주소를 입력해주세요.', 'warning');
            return;
        }

        const formData = new FormData(this.form);

        const baseData = {
            receptionNumber: formData.get('receptionNumber'),
            date: formData.get('date'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            subCategory: validParcels[0]?.category || formData.get('subCategory') || '-',
            purpose: formData.get('purpose'),
            receptionMethod: formData.get('receptionMethod') || '-',
            note: formData.get('note') || '',
            parcels: validParcels.map(p => ({
                id: p.id || this.generateId(),
                lotAddress: p.lotAddress,
                isMountain: p.isMountain || false,
                subLots: [...p.subLots],
                crops: p.crops.map(c => ({ ...c })),
                category: p.category || '',
                note: p.note || ''
            })),
            isComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 호환성을 위한 기존 필드 (첫 번째 필지 기준)
        if (validParcels.length > 0) {
            const firstParcel = validParcels[0];
            baseData.lotAddress = firstParcel.lotAddress;
            baseData.area = firstParcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString();
            baseData.cropsDisplay = firstParcel.crops.map(c => c.name).join(', ') || '-';
        }

        // 편집 모드
        if (this.editingLogId) {
            const logIndex = this.sampleLogs.findIndex(l => l.id === this.editingLogId);
            if (logIndex === -1) {
                this.showToast('수정할 데이터를 찾을 수 없습니다.', 'error');
                return;
            }

            const existingLog = this.sampleLogs[logIndex];
            this.sampleLogs[logIndex] = {
                ...existingLog,
                ...baseData,
                id: existingLog.id
            };

            await this.saveLogs();
            this.showToast('수정되었습니다.', 'success');
            this.resetForm();
            this.switchView('list');
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

        // 연속 입력 모드
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
        const log = this.sampleLogs.find(l => String(l.id) === String(id));
        if (!log) return;

        // 폼 필드에 데이터 채우기
        document.getElementById('receptionNumber').value = log.receptionNumber || '';
        document.getElementById('date').value = log.date || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        document.getElementById('address').value = log.address || '';
        document.getElementById('purpose').value = log.purpose || '';
        document.getElementById('receptionMethod').value = log.receptionMethod || '직접수령';

        if (document.getElementById('note')) {
            document.getElementById('note').value = log.note || '';
        }

        // 필지 데이터 복원
        if (log.parcels && log.parcels.length > 0) {
            this.parcels = log.parcels.map(p => ({ ...p }));
            this.renderAllParcels();
        }

        this.editingLogId = String(id);
        this.switchView('form');
    }

    /**
     * 모든 필지 재렌더링
     */
    renderAllParcels() {
        if (!this.parcelsContainer) return;

        this.parcelsContainer.innerHTML = '';
        this.parcels.forEach((parcel, index) => {
            this.renderParcelCard(parcel, index + 1);
        });
        this.updateParcelsData();
    }

    /**
     * 폼 초기화
     */
    resetForm() {
        if (this.form) {
            this.form.reset();
        }

        // 필지 초기화
        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) {
            this.parcelsContainer.innerHTML = '';
        }
        this.addParcel();

        // 수령방법 초기화
        const methodBtns = document.querySelectorAll('.reception-method-btn');
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

        this.editingLogId = null;
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
     * 폼 데이터 추출 (abstract 메서드 구현)
     */
    getFormData() {
        const formData = new FormData(this.form);
        return {
            receptionNumber: formData.get('receptionNumber'),
            date: formData.get('date'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            purpose: formData.get('purpose'),
            note: formData.get('note')
        };
    }

    /**
     * 폼에 데이터 채우기 (abstract 메서드 구현)
     */
    populateForm(log) {
        document.getElementById('receptionNumber').value = log.receptionNumber || '';
        document.getElementById('date').value = log.date || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        document.getElementById('address').value = log.address || '';
        document.getElementById('purpose').value = log.purpose || '';
        if (document.getElementById('note')) {
            document.getElementById('note').value = log.note || '';
        }
    }
}

// 전역 인스턴스 생성
let soilManager = null;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    soilManager = new SoilSampleManager();
    await soilManager.init();

    // 전역으로 노출 (기존 호환성)
    window.soilManager = soilManager;
});
