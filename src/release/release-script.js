// 릴리즈 노트 페이지 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // 다크 모드 토글
    const html = document.documentElement;
    const toggleBtn = document.getElementById('themeToggleBtn');

    if (!toggleBtn) {
        return;
    }

    // 저장된 테마 로드
    const savedTheme = localStorage.getItem('theme-preference') || 'light';
    html.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
        toggleBtn.classList.add('dark');
    }

    toggleBtn.addEventListener('click', function() {
        const isDark = html.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme-preference', newTheme);
        toggleBtn.classList.toggle('dark', !isDark);
    });

    // 접기/펼치기 토글
    document.querySelectorAll('.toggle-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var card = btn.closest('.version-card');
            if (card.classList.contains('collapsed')) {
                card.classList.remove('collapsed');
                btn.textContent = '▲ 접기';
            } else {
                card.classList.add('collapsed');
                btn.textContent = '▼ 펼치기';
            }
        });
    });
});
