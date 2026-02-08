// Tailwind CSS 설정
// 모든 페이지에서 공통으로 사용되는 Tailwind 설정을 외부 파일로 분리
tailwind.config = {
    darkMode: ['selector', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                primary: "#3B82F6",
                "primary-dark": "#2563EB",
                secondary: "#10B981",
                "secondary-dark": "#059669",
                danger: "#EF4444",
                warning: "#F59E0B",
                info: "#3B82F6",
                success: "#10B981",
                // Light mode colors
                "background-light": "#F8FAFC",
                "card-light": "#FFFFFF",
                "text-light": "#1F2937",
                "text-secondary-light": "#6B7280",
                "border-light": "#E5E7EB",
                // Dark mode colors
                "background-dark": "#18181B",
                "card-dark": "#27272A",
                "text-dark": "#F3F4F6",
                "text-secondary-dark": "#A1A1AA",
                "border-dark": "#3F3F46",
            },
            fontFamily: {
                display: ["Noto Sans KR", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "12px",
            },
            boxShadow: {
                card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                "card-hover": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-in-out',
                'slide-in': 'slideIn 0.2s ease-out',
            },
        },
    },
    plugins: [],
};