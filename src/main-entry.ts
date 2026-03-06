// Shared modules (메인 페이지에서 필요한 것만)
import './shared/logger.ts';
import './shared/error-handler.ts';
import './shared/network-status.ts';
import './shared/loading-manager.ts';
import './shared/network-config.ts';
import './shared/network-access.ts';
import './shared/firebase-config.ts';
import './shared/firebase-diagnostics.ts';
// 암호화 모듈 (테스트 전용 - firestore-db 이전에 로드)
import './shared/crypto-utils.ts';
import './shared/encryption-manager.ts';
import './shared/firestore-db.ts';
import './shared/storage-manager.ts';
import './shared/sanitize.ts';
import './shared/theme.ts';
import './shared/cache-manager.ts';
import './shared/main-init.ts';
