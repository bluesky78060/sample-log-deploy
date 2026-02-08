const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('/Users/leechanhee/Dropbox/Mac/Downloads/농약접수대장.xlsx');

// 날짜 변환 함수 (1.02 -> 2025-01-02)
function convertDate(dateStr, year) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // 1.02 또는 01.02 형식
  const match = str.match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // 2025.01.02 형식
  const match2 = str.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (match2) {
    return match2[1] + '-' + match2[2].padStart(2, '0') + '-' + match2[3].padStart(2, '0');
  }

  return str;
}

// 생년월일 변환 (58.06.23 -> 580623)
function convertBirthDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // 58.06.23 형식
  const match = str.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) {
    return match[1] + match[2] + match[3];
  }

  // 이미 6자리인 경우
  if (/^\d{6}$/.test(str)) return str;

  return str;
}

// 비고에서 목적 추출
function extractPurpose(note) {
  if (!note) return '참고용';
  const str = String(note);

  if (str.includes('급식')) return '제출(급식)';
  if (str.includes('제출') && str.includes('기타')) return '제출(기타)';
  if (str.includes('제출')) return '제출(급식)';
  if (str.includes('무농약')) return '인증(무농약)';
  if (str.includes('유기')) return '인증(유기농)';
  if (str.includes('GAP') || str.includes('gap')) return '인증(GAP)';
  if (str.includes('글로벌')) return '인증(글로벌GAP)';

  return '참고용';
}

// 2025년, 2026년 데이터 변환
['2025', '2026'].forEach(year => {
  const sheetName = year + '년';
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const headers = jsonData[0];
  const rows = jsonData.slice(1);

  // 컬럼 인덱스 찾기
  const colIdx = {
    receptionNumber: headers.indexOf('접수번호'),
    date: headers.indexOf('접수일자'),
    name: headers.indexOf('의뢰인'),
    address: headers.indexOf('집주소'),
    producerName: headers.indexOf('생산자명'),
    cropName: headers.indexOf('작물명'),
    producerAddress: headers.findIndex(h => h && h.includes('생산지')),
    birthDate: headers.indexOf('생년월일'),
    note: headers.lastIndexOf('비고')
  };

  console.log(year + '년 컬럼 인덱스:', colIdx);

  const converted = rows
    .filter(row => row[colIdx.receptionNumber]) // 접수번호가 있는 행만
    .map(row => ({
      id: 'excel_' + year + '_' + row[colIdx.receptionNumber],
      receptionNumber: String(row[colIdx.receptionNumber] || ''),
      date: convertDate(row[colIdx.date], year),
      applicantType: '개인',
      birthDate: convertBirthDate(row[colIdx.birthDate]),
      corpNumber: '',
      name: String(row[colIdx.name] || '').trim(),
      phoneNumber: '',
      address: String(row[colIdx.address] || '').trim(),
      addressPostcode: '',
      addressRoad: '',
      addressDetail: '',
      subCategory: '-',
      purpose: extractPurpose(row[colIdx.note]),
      receptionMethod: '-',
      note: String(row[colIdx.note] || ''),
      producerName: String(row[colIdx.producerName] || '').trim(),
      producerAddress: String(row[colIdx.producerAddress] || '').trim(),
      requestContent: String(row[colIdx.cropName] || '').trim(),
      completed: false,
      createdAt: new Date().toISOString()
    }));

  console.log(year + '년 변환 완료:', converted.length, '건');
  console.log('샘플:', JSON.stringify(converted[0], null, 2));
  console.log('');

  // JSON 파일로 저장
  const outputPath = '/Users/leechanhee/sample-log-electron/scripts/pesticide_' + year + '.json';
  fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
  console.log('저장 완료:', outputPath);
});
