// npm packages
import DOMPurify from 'dompurify';
window.DOMPurify = DOMPurify;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/logger.js';
import '../shared/network-config.js';
import '../shared/network-access.js';
import '../shared/firebase-config.js';
// 암호화 모듈 (테스트 전용 - firestore-db 이전에 로드)
import '../shared/crypto-utils.js';
import '../shared/encryption-manager.js';
import '../shared/firestore-db.js';
import '../shared/storage-manager.js';
import '../shared/sanitize.js';
import '../shared/toast.js';
import '../shared/theme.js';
import '../shared/cache-manager.js';

// Main script
import './settings-script.js';
