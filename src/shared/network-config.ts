/**
 * @fileoverview 네트워크 접근 제어 설정
 * @description ALLOWED_GATEWAY 등 비밀이 아닌 배포 설정을 담는다.
 *              CI(.github/workflows/build.yml)가 빌드 시 secrets로 이 파일을 덮어쓴다.
 *              ⚠️ VWORLD API 키는 더 이상 여기(렌더러)에 두지 않는다(SAMPL-2-19).
 *                 키는 메인 프로세스에서만 보유한다 — scripts/gen-vworld-key.mjs +
 *                 src/index.ts 의 getVworldKey() 참고. 렌더러는 주소만 IPC로 전달한다.
 */

interface NetworkConfigType {
    ALLOWED_GATEWAY: string;
}

// 허용된 게이트웨이 IP 주소 (이 서브넷에서만 웹 접근 허용)
// 예: '192.168.1.1' → 192.168.1.x 서브넷 전체 허용
(window as any).NETWORK_CONFIG = {
    ALLOWED_GATEWAY: '111.21.101.254'
} as NetworkConfigType;
