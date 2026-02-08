// ========================================
// 주소 파싱 공통 모듈
// 시도, 시군구, 읍면동, 나머지주소 분리
// ========================================

/**
 * 주소를 시도, 시군구, 읍면동, 나머지주소로 분리
 * @param {string} address - 전체 주소 (도로명주소 또는 지번주소)
 * @returns {object} { sido, sigungu, eupmyeondong, rest }
 */
function parseAddressParts(address) {
    if (!address || address === '-') {
        return { sido: '', sigungu: '', eupmyeondong: '', rest: '' };
    }

    // 우편번호 제거 (예: "(12345) " 형식)
    address = address.replace(/^\(\d{5}\)\s*/, '').trim();

    // 시도 목록 (전체 이름)
    const sidoList = [
        '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
        '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
        '강원도', '충청북도', '충청남도', '전라북도', '전북특별자치도',
        '전라남도', '경상북도', '경상남도', '제주특별자치도'
    ];

    // 시도 약어 → 전체 이름 매핑
    const sidoShortMap = {
        '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시',
        '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시',
        '울산': '울산광역시', '세종': '세종특별자치시', '경기': '경기도',
        '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도',
        '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도',
        '경남': '경상남도', '제주': '제주특별자치도'
    };

    let sido = '';
    let sigungu = '';
    let eupmyeondong = '';
    let rest = '';

    // 공백으로 분리
    const parts = address.split(/\s+/);

    // 1. 시도 찾기
    if (parts.length > 0) {
        const firstPart = parts[0];
        // 전체 이름 매칭
        if (sidoList.includes(firstPart)) {
            sido = firstPart;
            parts.shift();
        }
        // 약어 매칭
        else if (sidoShortMap[firstPart]) {
            sido = sidoShortMap[firstPart];
            parts.shift();
        }
    }

    // 2. 시군구 찾기 (시, 군, 구로 끝나는 부분)
    if (parts.length > 0) {
        // 첫 번째 파트가 시/군/구인지 확인
        const sigunguPattern = /(시|군|구)$/;
        if (sigunguPattern.test(parts[0])) {
            sigungu = parts.shift();
            // 두 번째 파트도 구인지 확인 (예: "성남시 분당구")
            if (parts.length > 0 && /구$/.test(parts[0])) {
                sigungu += ' ' + parts.shift();
            }
        }
    }

    // 3. 읍면동 찾기 (읍, 면, 동, 리, 가로 끝나는 부분)
    if (parts.length > 0) {
        const eupmyeondongPattern = /(읍|면|동|리|가)$/;
        if (eupmyeondongPattern.test(parts[0])) {
            eupmyeondong = parts.shift();
        }
    }

    // 4. 나머지 주소
    rest = parts.join(' ');

    return { sido, sigungu, eupmyeondong, rest };
}

// 전역으로 내보내기
window.parseAddressParts = parseAddressParts;
