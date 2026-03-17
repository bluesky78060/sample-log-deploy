/**
 * @fileoverview 네트워크 접근 제어 설정
 * @description 이 파일은 .gitignore에 추가되어 공개 저장소에 커밋되지 않습니다.
 *              배포 시 별도로 설정 파일을 생성해야 합니다.
 */

interface NetworkConfigType {
    ALLOWED_GATEWAY: string;
    VWORLD_API_KEY?: string;
}

// 허용된 게이트웨이 IP 주소 (이 서브넷에서만 웹 접근 허용)
// 예: '192.168.1.1' → 192.168.1.x 서브넷 전체 허용
(window as any).NETWORK_CONFIG = {
    ALLOWED_GATEWAY: '111.21.101.254',
    VWORLD_API_KEY: '5390BC39-A15B-3BA2-8025-28867877615A'
} as NetworkConfigType;
