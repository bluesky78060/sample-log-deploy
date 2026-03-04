// Shared modules (메인 페이지에서 필요한 것만)
import './shared/logger.js';
import './shared/error-handler.js';
import './shared/network-status.js';
import './shared/loading-manager.js';
import './shared/network-config.js';
import './shared/network-access.js';
import './shared/firebase-config.ts';
import './shared/firebase-diagnostics.js';
// 암호화 모듈 (테스트 전용 - firestore-db 이전에 로드)
import './shared/crypto-utils.js';
import './shared/encryption-manager.ts';
import './shared/firestore-db.ts';
import './shared/storage-manager.js';
import './shared/sanitize.js';
import './shared/theme.ts';
import './shared/cache-manager.js';
import './shared/main-init.ts';
