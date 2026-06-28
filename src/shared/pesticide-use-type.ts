// ========================================
// 농약 용도(작용군) 정적 분류 테이블 (TS 이식)
// ========================================
// pesticide-name-map 의 영문 농약명(키, 552종)을 대상으로,
// IRAC(살충)/FRAC(살균)/HRAC(제초) 등 공인 작용군 분류 체계를 참고하여
// "확실히 분류 가능한 성분"만 수동 정적 매핑한 테이블.
//
// 분류 체계(용도 문자열):
//   '살충제' / '살균제' / '제초제' / '살응애제' / '생장조정제' / '살선충제' / '기타'
//
// 매칭 규칙: mrl-search 의 normalize 와 동일(괄호 안 제거 → 공백 제거 → 소문자화).
//
// 공개 API (window.PesticideUseType / window.PESTICIDE_USE_TYPE):
//   - get(engName)      : 영문명 → 용도 문자열 또는 null
//   - getByKor(korName) : 한글명 → 용도 문자열 또는 null (window.PESTICIDE_NAME_MAP 역매핑 lazy)
//   - meta              : 출처/카운트 메타
//
// 의존성: 조회 시점에 window.PESTICIDE_NAME_MAP(선택) 참조. 로드 순서 무관.
// ========================================

// mrl-search normalize 와 동일 규칙 (테스트/조회 일관성 위해 재구현).
function normalize(str: unknown): string {
  if (!str) return '';
  return String(str)
    .replace(/\([^)]*\)/g, '') // 괄호 안 부가표기 제거
    .replace(/\s+/g, '') // 공백 제거
    .toLowerCase();
}

const USE_TYPES: string[] = ['살충제', '살균제', '제초제', '살응애제', '생장조정제', '살선충제', '기타'];

// 원본 키(영문명) → 용도. 키는 pesticide-name-map 의 표기를 그대로 사용
// (조회 시 normalize 로 매칭되므로 철자/대소문자/괄호 변형 흡수).
const RAW_MAP: Record<string, string> =
{
        // ===== 살충제 (insecticide) =====
        'Acephate': '살충제',
        'Acetamiprid': '살충제',
        'Aldicarb': '살충제',
        'Aldrin': '살충제',
        'Allethrin': '살충제',
        'Azamethiphos': '살충제',
        'Azinphos-ethyl': '살충제',
        'Azinphos-methyl': '살충제',
        'Bendiocarb': '살충제',
        'Bifenthrin': '살충제',
        'BioResmethrin': '살충제',
        'Bistrifluron': '살충제',
        'Broflanilide': '살충제',
        'Bromophos-ethyl': '살충제',
        'Bromophos-methyl': '살충제',
        'Buprofezin': '살충제',
        'Butocarboxim': '살충제',
        'Cadusafos': '살충제',
        'Carbaryl': '살충제',
        'Carbofuran': '살충제',
        '3-hydroxycarbofuran': '살충제', // 카보퓨란 대사물
        'Chlorantraniliprole': '살충제',
        'Chlorethoxyfos': '살충제',
        'Chlorfenapyr': '살충제',
        'Chlorfluazuron': '살충제',
        'Chlorfenvinphos E': '살충제',
        'Chlorfenvinphos Z': '살충제',
        'Chlorpyrifos(-ethyl)': '살충제',
        'Chlorpyrifos-methyl': '살충제',
        'Chromafenozide': '살충제',
        'Clothianidin': '살충제',
        'Coumaphos': '살충제',
        'Crotoxyphos': '살충제',
        'Cyanophos': '살충제',
        'Cyantraniliprole': '살충제',
        'Cyclaniliprole': '살충제',
        'Cycloprothrin': '살충제',
        'Cyfluthrin': '살충제',
        'Cyhalothrin-γ': '살충제',
        'Cyhalothrin-λ': '살충제',
        'Cypermethrin': '살충제',
        'Deltamethrin': '살충제',
        'Demeton-S': '살충제',
        'Demeton-S-methyl': '살충제',
        'Demeton-S-methyl-sulfone': '살충제', // 데메톤 계열 대사물
        'Demeton-S-sulfone': '살충제',
        'Demeton-S-sulfoxide': '살충제',
        'Diazinon': '살충제',
        'Dichlorvos': '살충제',
        'Dicrotophos': '살충제',
        'Dieldrin': '살충제',
        'Diflubenzuron': '살충제',
        'Dimethoate': '살충제',
        'Dinotefuran': '살충제',
        'Disulfoton': '살충제',
        'Disulfoton sulfone': '살충제',
        'Disulfoton sulfoxide': '살충제',
        'Emamectin B1a': '살충제',
        'Endosulfan-α': '살충제',
        'Endosulfan-β': '살충제',
        'Endosulfan sulfate': '살충제', // 엔도설판 대사물
        'Endrin': '살충제',
        'δ-keto-Endrin': '살충제', // 엔드린 대사물
        'Ethion': '살충제',
        'Ethoprophos': '살충제', // 살충+살선충 (이프로포스); 주 IRAC 살충
        'Etofenprox': '살충제',
        'Etrimfos': '살충제',
        'Fenitrothion': '살충제',
        'Fenobucarb': '살충제',
        'Fenpropathrin': '살충제',
        'Fenthion': '살충제',
        'Fensulfothion': '살충제',
        'Fenvalerate': '살충제',
        'Fipronil': '살충제',
        'Flonicamid': '살충제',
        'Flubendiamide': '살충제',
        'Flufenoxuron': '살충제',
        'Flupyradifurone': '살충제',
        'Fluxametamide': '살충제',
        'Fonofos': '살충제',
        'Formothion': '살충제',
        'Furathiocarb': '살충제',
        'Benfuracarb': '살충제',
        'Heptachlor': '살충제',
        'Heptachlor epoxide': '살충제', // 헵타클로르 대사물
        'Heptenophos': '살충제',
        'Imidacloprid': '살충제',
        'Indoxacarb': '살충제',
        'Isofenphos': '살충제',
        'Isofenphos-methyl': '살충제',
        'Isoprocarb': '살충제',
        'Isoxathion': '살충제',
        'Lindane(y-BHC)': '살충제',
        'BHC-α': '살충제',
        'BHC-β': '살충제',
        'BHC-δ': '살충제',
        'Lufenuron': '살충제',
        'Malathion': '살충제',
        'Malaoxon': '살충제', // 말라티온 산화 대사물
        'Methamidophos': '살충제',
        'Methidathion': '살충제',
        'Methiocarb': '살충제',
        'Methomyl': '살충제',
        'Methoxychlor': '살충제',
        'Methoxyfenozide': '살충제',
        'Metaflumizone E': '살충제',
        'Metaflumizone Z': '살충제',
        'Mevinphos': '살충제',
        'Monocrotophos': '살충제',
        'Nitenpyram': '살충제',
        'Novaluron': '살충제',
        'Omethoate': '살충제', // 디메토에이트 대사물(자체도 살충제)
        'Oxamyl': '살충제', // 살충+살선충 (옥사밀)
        'Oxamyl oxime': '살충제', // 옥사밀 대사물
        'Oxademeton-methyl': '살충제',
        'Parathion': '살충제',
        'Parathion-methyl': '살충제',
        'Permethrin-cis': '살충제',
        'Permethrin-trans': '살충제',
        'Phenothrin-cis': '살충제',
        'Phenothrin-trans': '살충제',
        'Phenthoate': '살충제',
        'Phorate': '살충제',
        'Phorate oxon': '살충제',
        'Phorate oxon sulfone': '살충제',
        'Phorate oxon sulfoxide': '살충제',
        'Phorate sulfone': '살충제',
        'Phorate sulfoxide': '살충제',
        'Phosalone': '살충제',
        'Phosmet': '살충제',
        'Phosphamidon E': '살충제',
        'Phosphamidon Z': '살충제',
        'Phoxim': '살충제',
        'Pirimicarb': '살충제',
        'Pirimiphos-ethyl': '살충제',
        'Pirimiphos-methyl': '살충제',
        'Pyflubumide': '살응애제', // 피플루부미드 — 살응애제
        'Pyflubumide-NH': '살응애제',
        'Profenofos': '살충제',
        'Propetamphos': '살충제',
        'Prothiofos': '살충제',
        'Pyraclofos': '살충제',
        'Pyridaben': '살충제',
        'Pyridalyl': '살충제',
        'Pyridaphenthion': '살충제',
        'Pymetrozine': '살충제',
        'Pyriproxyfen': '살충제',
        'Quinalphos': '살충제',
        'Silafluofen': '살충제',
        'Spinetoram': '살충제',
        'Spinosyn A': '살충제',
        'Spinosyn D': '살충제',
        'Spirotetramat': '살충제',
        'Spirotetramat-enol': '살충제', // 스피로테트라매트 대사물
        'Sulfoxaflor': '살충제',
        'Sulprofos': '살충제',
        'Tebufenozide': '살충제',
        'Teflubenzuron': '살충제',
        'Tefluthrin': '살충제',
        'Terbufos': '살충제',
        'Terbufos oxon': '살충제',
        'Terbufos oxon sulfone': '살충제',
        'Terbufos oxon sulfoxide': '살충제',
        'Terbufos sulfone': '살충제',
        'Terbufos sulfoxide': '살충제',
        'Tetrachlorvinphos': '살충제',
        'Tetramethrin': '살충제',
        'Tetraniliprole': '살충제',
        'Thiacloprid': '살충제',
        'Thiamethoxam': '살충제',
        'Thiodicarb': '살충제',
        'Thiometon': '살충제',
        'Tolfenpyrad': '살충제',
        'Tralomethrin': '살충제',
        'Triazamate': '살충제',
        'Trichlorfon': '살충제',
        'Triflumuron': '살충제',
        'Ethiofencarb': '살충제',
        'Aspon': '살충제',
        'Dialifor': '살충제',
        'Dioxathion': '살충제',
        'Crufomate': '살충제',
        'Mephosfolan': '살충제',
        'Phosfolan': '살충제',
        'Thionazin': '살충제', // 살선충/살충 — 살선충제로 분류
        'Cyflumetofen': '살응애제',
        'Cyenopyrafen': '살응애제',
        'Sulfotep': '살충제',
        'Leptophos': '살충제',
        'Chlordane-cis': '살충제',
        'Chlordane-trans': '살충제',
        'Nonachlor-cis': '살충제',
        'Nonachlor-trans': '살충제',
        'DDT-op': '살충제',
        'DDT-pp': '살충제',
        'DDD-pp': '살충제', // DDT 대사물
        'DDE-pp': '살충제', // DDT 대사물
        'XMC': '살충제', // 카바메이트 살충제
        '2,3,5-Trimethacarb': '살충제',
        '3,4,5-Trimethacarb': '살충제',
        'Perhane': '살충제', // Perthane — DDT 유사 살충제
        'Lemiectin A3': '살충제', // Lepimectin 계열 — 살충제
        'Lemiectin A4': '살충제',
        'Fenchlorphos': '살충제',
        'Chlorthion': '살충제',
        'Chlorthiophos': '살충제',
        'Dichlofenthion': '살충제',
        'Methyl trithion': '살충제',
        'Cyromazine': '살충제',
        'Pyrifluquinazon': '살충제',
        'Pyridate': '제초제', // 피리데이트 — 제초제

        // ===== 살응애제 (acaricide) =====
        'Acequinocyl': '살응애제',
        'Acrinathrin': '살응애제', // 살응애+살충 — 주로 살응애제
        'Amitraz': '살응애제', // 살응애/살충
        'Bifenazate': '살응애제',
        'Bromopropylate': '살응애제',
        'Chlorbenside': '살응애제',
        'Chlorfenson': '살응애제',
        'Chlorobenzilate': '살응애제',
        'Clofentezine': '살응애제',
        'Dicofol': '살응애제',
        'Fenazaquin': '살응애제',
        'Fenbutatin oxide': '살응애제',
        'Fenpyroximate': '살응애제',
        'Fenson': '살응애제',
        'Hexythiazox': '살응애제',
        'Ethoxazole': '살응애제', // Etoxazole (철자 변형)
        'Propargite': '살응애제',
        'Spirodiclofen': '살응애제',
        'Spiromesifen': '살응애제',
        'Tebufenpyrad': '살응애제',
        'Tetradifon': '살응애제',
        'Milbemectin A3': '살응애제',
        'Milbemectin A4': '살응애제',
        'Aramite': '살응애제',
        'Chloropropylate': '살응애제',
        'Fluvalinate': '살충제', // 피레스로이드 (살충/살응애)
        'Abamectin B1a': '살충제', // 아바멕틴 (살충/살응애)

        // ===== 살선충제 (nematicide) =====
        'Fluensulfone': '살선충제',
        'Fosthiazte': '살선충제', // Fosthiazate (철자 변형)
        'Imicyafos': '살선충제',
        'Tebupirimfos': '살선충제', // 살선충/살충

        // ===== 살균제 (fungicide) =====
        '2-phenyl phenol': '살균제',
        '2,4,6-trichlorophenol': '살균제',
        'Ametoctradin': '살균제',
        'Amisulbrom': '살균제',
        'Azoxystrobin': '살균제',
        'Benalaxyl': '살균제',
        'Benodanil': '살균제',
        'Benomyl': '살균제',
        'Benthiavalicarb-isopropyl R': '살균제',
        'Benthiavalicarb-isopropyl S': '살균제',
        'Benzobicyclon': '제초제', // (살균 아님 — 제초제. 살균 섹션 오기재 방지) — 제초제로 분류
        'Bitertanol': '살균제',
        'Bixafen': '살균제',
        'Boscalid': '살균제',
        'Bupirimate': '살균제',
        'Captan': '살균제',
        'Hexachlorobenzene': '살균제', // HCB — 종자소독 살균제
        'Carbendazim': '살균제',
        'Carboxin': '살균제',
        'Oxacarboxin': '살균제', // Oxycarboxin 계열
        'Carpropamide': '살균제',
        'Chinomethionat': '살균제',
        'Chlorothalonil': '살균제',
        'Chlozolinate': '살균제',
        'Chloraneb': '살균제', // Chloroneb
        'Chlornitrofen': '제초제', // CNP — 제초제
        'Cyazofamid': '살균제',
        'Cyflufenamid': '살균제',
        'Cymoxanil': '살균제',
        'Cyprodinil': '살균제',
        'Cyprononazole': '살균제',
        'Dichlofluanid': '살균제',
        'Diclobutrazol': '살균제',
        'Diethofencarb': '살균제',
        'Difenoconazole': '살균제',
        'Dimethomorph E': '살균제',
        'Dimethomorph Z': '살균제',
        'Diniconazole': '살균제',
        'Diphenylamine': '기타', // 수확후 처리(저장 화상 방지) — 명확하므로 기타
        'Dodine': '살균제',
        'Edifenphos': '살균제',
        'Epoxiconazole': '살균제',
        'Etaconazole': '살균제',
        'Ethaboxam': '살균제',
        'Ethychlozate': '생장조정제', // 에칠클로제이트 — PGR
        'Famoxadone': '살균제',
        'Fenamidone': '살균제',
        'Fenarimol': '살균제',
        'Fenbuconazole': '살균제',
        'Fenfuram': '살균제',
        'Fenhexamid': '살균제',
        'Fenpropimorph': '살균제',
        'Fenpyrazamine': '살균제',
        'Ferbam': '살균제',
        'Ferimzone E': '살균제',
        'Ferimzone Z': '살균제',
        'Fluazinam': '살균제',
        'Fludioxonil': '살균제',
        'Fluopicolide': '살균제',
        'Fluopyram': '살균제',
        'Fluquinconazole': '살균제',
        'Flusilazole': '살균제',
        'Flusulfamide': '살균제',
        'Flutianil': '살균제',
        'Flutolanil': '살균제',
        'Flutriafol': '살균제',
        'Fluxapyroxad': '살균제',
        'Folpet': '살균제',
        'Phthalide, Fthalide': '살균제',
        'Hexaconazole': '살균제',
        'Imazalil': '살균제',
        'Imibenconazole': '살균제',
        'Ipconazole': '살균제',
        'Iprobenfos': '살균제',
        'Iprodione': '살균제',
        'Iprovalicarb': '살균제',
        'Isoprothiolane': '살균제',
        'Isopyrazam': '살균제',
        'Isotianil': '살균제',
        'Kasugamycin': '살균제',
        'Kresoxim-methyl': '살균제',
        'Mancozeb': '살균제',
        'Mandestrobin': '살균제',
        'Mandipropamid': '살균제',
        'Maneb': '살균제',
        'Metalaxyl': '살균제',
        'Mefentrifluconazole': '살균제',
        'Metconazole': '살균제',
        'Metiram': '살균제',
        'Metominostrobin': '살균제',
        'Metrafenone': '살균제',
        'Myclobutanil': '살균제',
        'Nabam': '살균제',
        'Nuarimol': '살균제',
        'Orysastrobin': '살균제',
        'Oxadixyl': '살균제',
        'Oxathiapiprolin': '살균제',
        'Penflufen': '살균제',
        'Pencycuron': '살균제',
        'Penthiopyrad': '살균제',
        'Picarbutrazox': '살균제',
        'Picoxystrobin': '살균제',
        'Prochloraz': '살균제',
        'Procymidone': '살균제',
        'Propamocarb': '살균제',
        'Propiconazole': '살균제',
        'Propineb': '살균제',
        'Proquinazid': '살균제',
        'Pydiflumetofen': '살균제',
        'Pyraclostrobin': '살균제',
        'Pyaziflumid': '살균제', // Pyraziflumid (철자 변형)
        'Pyribencarb': '살균제',
        'Pyrifenox': '살균제',
        'Pyriofenone': '살균제',
        'Pyrimethanil': '살균제',
        'Quinoxyfen': '살균제',
        'Quintozene': '살균제',
        'Sedaxane-cis': '살균제',
        'Sedaxane-trans': '살균제',
        'Simeconazole': '살균제',
        'Spiroxamine': '살균제',
        'Streptomycin': '살균제', // 세균성 병해 방제
        'Tebuconazole': '살균제',
        'Tebufloquin': '살균제',
        'Tebufloquin M1': '살균제', // 테부플로퀸 대사물
        'Tecnazene': '살균제',
        'Tetraconazole': '살균제',
        'Thiabendazole': '살균제',
        'Thifluzamide': '살균제',
        'Thiophanate-methyl': '살균제',
        'Thiram': '살균제',
        'Tiadinil': '살균제',
        'Tolclofos-methyl': '살균제',
        'Triadimefon': '살균제',
        'Triadimenol': '살균제', // 트리아디메폰 대사물(자체도 살균제)
        'Triazophos': '살충제', // 트리아조포스는 살충/살선충 유기인 — 살충제 (살균 섹션 오정렬 방지)
        'Tricyclazole': '살균제',
        'Trifloxystrobin': '살균제',
        'Triflumizole': '살균제',
        'Triforine': '살균제',
        'Triticonazole': '살균제',
        'Valifenalate': '살균제',
        'Vinclozolin': '살균제',
        'Zineb': '살균제',
        'Ziram': '살균제',
        'Zoxamide': '살균제',
        'Iminoctadine': '살균제',
        'Acibenzolar-S-methyl': '살균제', // 식물 활성제(SAR) — 살균제로 분류
        'Acibenzolar acid': '살균제', // 아시벤졸라 대사물
        'Etridiazole': '살균제',
        'Fnoxanil': '살균제', // Fenoxanil (철자 변형) — 도열병 살균제
        'Pyracarbolid': '살균제',
        'Nitrothal-siopropyl': '살균제', // Nitrothal-isopropyl (철자 변형) — 살균제

        // ===== 제초제 (herbicide) =====
        '2,4-D': '제초제',
        'Acetochlor': '제초제',
        'Alachlor': '제초제',
        'Allidochlor': '제초제',
        'Ametryn': '제초제',
        'Asulam': '제초제',
        'Atrazine': '제초제',
        'Benfluralin': '제초제',
        'Bensulide': '제초제',
        'Bentazone': '제초제',
        'Bispyribac-sodium': '제초제',
        'Bromacil': '제초제',
        'Bromobutide': '제초제',
        'Butachlor': '제초제',
        'Butralin': '제초제',
        'Butylate': '제초제',
        'Carbetamide': '제초제',
        'Chlorbufam': '제초제',
        'Chloridazone': '제초제', // Chloridazon
        'Chlorotoluron': '제초제',
        'Chloroxuron': '제초제',
        'Chlorpropham': '제초제',
        'Chlorthal-dimethyl': '제초제', // DCPA
        'Cinmethylin': '제초제',
        'Clethodim': '제초제',
        'Clethoim sulfoxide': '제초제', // 클레토딤 대사물
        'Celthodim sulfone': '제초제', // 클레토딤 대사물(철자변형)
        'Clomeprop': '제초제',
        'Cyanazine': '제초제',
        'Cyclosulfamuron': '제초제',
        'Cycloate': '제초제',
        'Cyprazine': '제초제',
        'Desmetryn': '제초제',
        'Diallate': '제초제',
        'Dichlobenil': '제초제',
        'Diclosulam': '제초제',
        'Diethatyl-ethyl': '제초제',
        'Diflufenican': '제초제',
        'Dimethachlor': '제초제',
        'Dimethenamid': '제초제',
        'Dinitramine': '제초제',
        'Dithiopyr': '제초제',
        'Diuron': '제초제',
        'EPTC': '제초제',
        'Ethalfluralin': '제초제',
        'Ethofurnesate': '제초제', // Ethofumesate (철자변형)
        'Flamprop-isopropyl': '제초제',
        'Flazasulfuron': '제초제',
        'Fluazifop-butyl': '제초제',
        'Fluchloralin': '제초제',
        'Flufenpyr-ethyl': '제초제',
        'Fluometuron': '제초제',
        'Fluorochloridone': '제초제', // Flurochloridone
        'Flupoxam': '제초제',
        'Fluridone': '제초제',
        'Fluthiacet-methyl': '제초제',
        'Fomesafen': '제초제',
        'Foramsulfuron': '제초제',
        'Glyphosate': '제초제',
        'Glufosinate': '제초제',
        'Halosulfuron-methyl': '제초제',
        'Haloxyfop': '제초제',
        'Hexazinone': '제초제',
        'Indaziflam': '제초제',
        'Ipfencarbazone': '제초제',
        'Isopropalin': '제초제',
        'Isoproturon': '제초제',
        'Isoxaben': '제초제',
        'Lenacil': '제초제',
        'Linuron': '제초제',
        'MCPA': '제초제',
        'Mecoprop-P': '제초제',
        'Mefenacet': '제초제',
        'Mesotrione': '제초제',
        'Metamitron': '제초제',
        'Methabenzthiazuron': '제초제',
        'Methoprotryn': '제초제',
        'Metolachlor': '제초제',
        'Metribuzin': '제초제',
        'Monolinuron': '제초제',
        'Napropamide': '제초제',
        'Neburon': '제초제',
        'Nicosulfuron': '제초제',
        'Norflurazon': '제초제',
        'Norea Noruron': '제초제', // Noruron
        'Oxadiargyl': '제초제',
        'Oxadiazon': '제초제',
        'Oxafluorfen': '제초제', // Oxyfluorfen
        'Oryzalin': '제초제',
        'Pebulate': '제초제',
        'Pendimethalin': '제초제',
        'Pentoxazone': '제초제',
        'Phenmedipham': '제초제',
        'Picolinafen': '제초제',
        'Prodiamine': '제초제',
        'Profluralin': '제초제',
        'Prometon': '제초제',
        'Propachlor': '제초제',
        'Propanil': '제초제',
        'Propham': '제초제',
        'Propisochlor': '제초제',
        'Propyrisulfuron': '제초제',
        'Prosulfocarb': '제초제',
        'Pyraclonil': '제초제',
        'Pyrazolate': '제초제',
        'Pyrazosulfuron-ethyl': '제초제',
        'Pyrazoxyfen': '제초제',
        'Saflufenacil': '제초제',
        'Secbumeton': '제초제',
        'Sethoxydim': '제초제',
        'Simazine': '제초제',
        'Simetryn': '제초제',
        'Sulfentrazone': '제초제',
        'Terbacil': '제초제',
        'Terbumeton': '제초제',
        'Tebuthiuron': '제초제',
        'Tepraloxydim': '제초제',
        'Thiobencarb': '제초제',
        'Tiafenacil': '제초제',
        'Triafamone': '제초제',
        'Tribufos': '제초제', // 면화 낙엽제(제초/생장조정 경계) — HRAC 외이나 낙엽제; 제초제로 분류
        'Triclopyr': '제초제',
        'Trifloxysulfuron': '제초제',
        'Trifluralin': '제초제',
        'Vernolate': '제초제',
        'Orthosulfamuron': '제초제',
        'Benzoylprop-ethyl': '제초제',
        'Pyraflufen-ethyl': '제초제',
        'Tridiphane': '제초제',

        // ===== 생장조정제 (PGR) =====
        'Paclobutrazol': '생장조정제',
        'Uniconazole': '생장조정제',
        'Daminozide': '생장조정제',
        'Ethephon': '생장조정제',
        'Gibberellic acid': '생장조정제',
        '6-Benzyl amiopurine': '생장조정제', // 6-Benzylaminopurine
        'Trinexapac': '생장조정제',
        'Trinexapac-ethyl': '생장조정제',
        'Prohydrojasmon': '생장조정제',
        'Thidiazuron': '생장조정제', // 낙엽/PGR (면화) — 생장조정제
        'Chlorflurenol-methyl': '생장조정제',
        'Flumetralin': '생장조정제', // 담배 액아억제 PGR
        'Dimethipin': '생장조정제', // 낙엽/건조 촉진 PGR

        // ===== 기타 (공력증진제·명확한 비방제 성분) =====
        'Piperonyl butoxide': '기타', // 공력증진제(synergist)
        'MGK-264': '기타', // 공력증진제(synergist)
        'Metaldehyde': '기타', // 연체동물(달팽이)약 — 방제 대상이 곤충 아님
        'Mefenpyr-diethyl': '기타', // 약해완화제(safener)
        'Isoxadifen-ethyl': '기타', // 약해완화제(safener)
        'Nitrapyrin': '기타', // 질화억제제(nitrification inhibitor)
        'Dichlormid': '기타', // 약해완화제(safener)
        '2.6-DIPN': '생장조정제' // 2,6-디이소프로필나프탈렌 — 발아억제 PGR
    }
;

// normalize 키 → 용도. 충돌 시 마지막 정의 우선(설계상 동일 용도여야 함).
const NORM_MAP: Record<string, string> = Object.create(null);
let classifiedCount = 0;
for (const k in RAW_MAP) {
  if (!Object.prototype.hasOwnProperty.call(RAW_MAP, k)) continue;
  const nk = normalize(k);
  if (!nk) continue;
  if (!(nk in NORM_MAP)) classifiedCount++;
  NORM_MAP[nk] = RAW_MAP[k];
}

/** 영문 농약명 → 용도 문자열 또는 null. */
function get(engName: unknown): string | null {
  const nk = normalize(engName);
  if (!nk) return null;
  const v = NORM_MAP[nk];
  return v || null;
}

/**
 * 한글 농약명 → 용도 문자열 또는 null.
 * window.PESTICIDE_NAME_MAP 의 한글→영문 역매핑을 호출 시점 lazy 로 사용.
 */
function getByKor(korName: unknown): string | null {
  const nk = normalize(korName);
  if (!nk) return null;

  const w =
    typeof window !== 'undefined'
      ? (window as unknown as { PESTICIDE_NAME_MAP?: { map?: Record<string, { kor?: string }> } })
      : null;
  const nameMap = w && w.PESTICIDE_NAME_MAP ? w.PESTICIDE_NAME_MAP.map : null;
  if (!nameMap || typeof nameMap !== 'object') return null;

  for (const eng in nameMap) {
    if (!Object.prototype.hasOwnProperty.call(nameMap, eng)) continue;
    const entry = nameMap[eng];
    const kor = entry && entry.kor;
    if (!kor) continue;
    if (normalize(kor) === nk) {
      const use = get(eng);
      if (use) return use;
    }
  }
  return null;
}

// pesticide-name-map 의 영문키 552종 중 실제 분류된 종수(검증값).
const NAME_MAP_TOTAL = 552;
const NAME_MAP_CLASSIFIED = 543; // 552종 중 분류 완료
const byType: Record<string, number> = {
  살충제: 208,
  살균제: 148,
  제초제: 131,
  살응애제: 29,
  생장조정제: 15,
  살선충제: 4,
  기타: 8,
};

const meta = {
  source: 'IRAC/FRAC/HRAC 공인 분류 기반 참고용 (수동 검증 전)',
  generated_at: '2026-06-10',
  eng_total: NAME_MAP_TOTAL,
  classified: NAME_MAP_CLASSIFIED,
  unclassified: NAME_MAP_TOTAL - NAME_MAP_CLASSIFIED,
  raw_entry_count: classifiedCount, // RAW_MAP normalize 후 고유 키 수(보조 키 포함)
  by_type: byType,
  use_types: USE_TYPES.slice(),
};

export interface PesticideUseTypeApi {
  get: (engName: unknown) => string | null;
  getByKor: (korName: unknown) => string | null;
  normalize: (str: unknown) => string;
  USE_TYPES: string[];
  meta: typeof meta;
}

export const PesticideUseType: PesticideUseTypeApi = {
  get,
  getByKor,
  normalize,
  USE_TYPES: USE_TYPES.slice(),
  meta,
};

if (typeof window !== 'undefined') {
  const w = window as unknown as {
    PesticideUseType?: PesticideUseTypeApi;
    PESTICIDE_USE_TYPE?: PesticideUseTypeApi;
  };
  // 메인과 동일한 전역명 + 스펙이 요구한 대문자 별칭 둘 다 노출
  w.PesticideUseType = PesticideUseType;
  w.PESTICIDE_USE_TYPE = PesticideUseType;
}

export { get, getByKor, normalize, USE_TYPES, meta };
export default PesticideUseType;
