// 메인 페이지 Tailwind CSS 설정
tailwind.config = {
    darkMode: ['selector', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                primary: "#3B82F6",
                "background-light": "#F8FAFC",
                "background-dark": "#18181B",
            },
            fontFamily: {
                display: ["Noto Sans KR", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "12px",
            },
        },
    },
};