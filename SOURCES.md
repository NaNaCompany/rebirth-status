# 신분 환생: 근거 및 편집 범위

확인일: 2026-10-28. 데이터: `rebirth-status-data.json`, schemaVersion 1.

## 구성

- 가상 가구 시나리오 18개, 언어 8개(ko, en, es, zh, ja, de, fr, pt), 결과 본문 144개.
- 각 결과: 이름, 짧은 설명, 시기·지역·사회적 신분·가구의 살림·가구의 생업 5개 필드, 독립적으로 작성한 2문장 생활 장면.
- 배경 시기는 15~19세기 전반. 지역은 한양, 경기도 광주, 충청도, 전라도 전주와 농촌, 경상도 안동·농촌·해안, 강원도 산촌, 개성, 함경도 북방.
- 신분과 재산을 별도 필드로 표시한다. 부유한 평민 상인과 가난한 양반 가구를 모두 포함한다.
- 세부 가구·장면·살림·게임 가중치는 창작이다. 역사 자료에 등장하는 특정 가구나 인물의 생애를 복원한 결과가 아니다.
- 인물 그림은 부모 구현 담당자가 계약의 enum·색상으로 생성할 원본 코드 그림이다. 외부 이미지·지도·문서·전시 사진을 제공하거나 재사용하지 않았다.

## 확률

가중치 합은 200이다. 왕실 1, 한양 관료 2 등은 **게임에서 정한 선택 빈도**이며 조선 전체의 실제 인구 통계가 아니다. 예를 들어 왕실 결과의 기본 확률 1/200은 이 데이터에서만 성립한다. 실제 양반·평민·노비 인구 비율로 인용할 수 없다. 지역별 호적을 조선 전체로 일반화하거나, 수백 년 동안 신분제가 고정되어 있었다고 가정하지 않는다.

다시 뽑기는 현재 결과를 제외하는 런타임 계약을 따른다. 카드의 기본 확률과 다시 뽑기의 조건부 확률은 다르다는 문장을 8개 언어로 제공한다.

## 역사 용어와 존중 원칙

양천의 법적 구분, 양반·중인 등의 사회적 구분, 직역과 재산은 완전히 겹치는 단일 분류가 아니다. 중인의 범위 및 용어 사용 시기에도 차이가 있다. 16세기 향리 결과는 '지방 관아의 향리 가문'으로 표시하여 모든 시대의 실무자를 고정된 중인 계층으로 처리하지 않았다.

노비 결과는 법적 예속과 노동·거처의 제약을 분명하게 설명한다. 외거하며 별도 살림을 꾸리는 사례와 주가에 거주하는 사례를 나누되, 외거를 법적 자유로 오인하게 하지 않는다. 가구의 능력·관계·일상도 서술하여 제도상의 지위를 사람의 가치로 취급하지 않는다. 노비 생활의 두 설정은 모든 공·사노비의 경험을 대표하지 않는다. '낮은 등급', '꽝', 능력 열등, 고통의 보상과 같은 묘사는 사용하지 않았다.

농민·어민·장인·상인이라는 생업만으로 모든 실제 종사자의 신분을 판정하지 않는다. 해당 결과는 그 생업을 하는 가상의 양인 가구를 선택한 설정이다. 군역 가구도 무반 양반 가구와 구별한다. 왕실의 아이는 즉위나 왕위 계승을 보장하는 결과가 아니다.

## 확인한 공식 기관 자료

아래 링크는 사실 배경의 확인 및 독자의 추가 열람을 위한 인용이다. 출처 문장, 번역, 이미지, 데이터베이스 화면을 복제하지 않았다. 결과의 창작 문장 및 8개 언어 번역은 새로 작성하였다. 자료 이용허락을 외부 이미지 재사용 허락으로 확대 해석하지 않는다.

| ID | 기관·자료 | 확인한 배경 | 원문 |
| --- | --- | --- | --- |
| nikh-early | 국사편찬위원회, 우리역사넷, 조선 전기의 정치·경제·사회 | 왕조의 제도, 신분과 조세·역의 기본 맥락 | [원문](https://contents.history.go.kr/front/ta/view.do?levelId=ta_m61_0080_0020) |
| nikh-change | 국사편찬위원회, 우리역사넷, 신분제의 변화 | 후기 신분 질서의 변화와 경제적으로 어려워진 양반 | [원문](https://contents.history.go.kr/front/ta/view.do?levelId=ta_m62_0040_0010) |
| nikh-jungin | 국사편찬위원회, 신편 한국사, 중인의 개념 | 역관·의관 등 기술직과 중인 범주의 시기·범위 문제 | [원문](https://db.history.go.kr/diachronic/level.do?levelId=nh_025_0020_0040_0010) |
| nikh-song | 국사편찬위원회, 우리역사넷, 송상 | 개성 상인의 유통과 인삼 거래 | [원문](https://contents.history.go.kr/front/tg/print.do?levelId=tg_003_1710&treeId=&whereStr=) |
| nikh-sin | 국사편찬위원회, 우리역사넷, 신공 | 직접 입역과 구별되는 노비의 공물 납부 | [원문](https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_003_0390&pageUnit=10&treeId=0209) |
| semoca-craft | 서울공예박물관, 상설전시 공예 역사 | 국가와 왕실 물품을 제작한 장인의 노동 | [원문](https://craftmuseum.seoul.go.kr/exhibit/permanent/list) |
| nikh-artisans | 국사편찬위원회, 신편 한국사, 수공업·상업 종사자의 신분 | 생업 집단의 다양한 신분적 배경 | [원문](https://db.history.go.kr/diachronic/level.do?levelId=nh_025_0020_0050_0030_0030_0010) |
| aks-nobi | 한국학중앙연구원, 한국민족문화대백과사전, 노비; 집필 권내현, 수정 2024-07-30 | 노비의 법적 예속과 다양한 거주·생활 양상 | [원문](https://encykorea.aks.ac.kr/Article/E0012757) |
| nrich-gwangju | 국립문화유산연구원, 국가유산 지식이음, 광주 조선백자 요지 | 15세기 후반 이후 경기도 광주의 관요 | [원문](https://portal.nrich.go.kr/kor/archeologyUsrView.do?idx=22091&menuIdx=1074&sk=%EA%B4%91%EC%A3%BC&st_char=) |
| nikh-frontier | 국사편찬위원회, 한국사 연대기, 4군 6진 개척 | 15세기 북방 군사 지역의 배경 | [원문](https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_i300200) |
| nikh-trade | 국사편찬위원회, 국사전자교과서, 조선 후기 상업 | 장시와 상품 유통의 성장 | [원문](https://contents.history.go.kr/eh_kk/teach/tong/iv/iv34.html) |

학술 기관이 제공하는 개설·연구·박물관 설명을 공식 기관 근거로 사용하였다. 모든 링크를 동시대 원사료라고 부르지는 않는다. 역사적 명명·분류에 관한 연구상의 차이는 게임의 단일 필드로 모두 표현할 수 없다.

## 시나리오별 연결

| 결과 ID | 시기·지역 | 가중치 | 근거 ID |
| --- | --- | ---: | --- |
| royal-household | 16세기 조선 전기, 한양 | 1 | nikh-early |
| capital-official-family | 17세기 조선, 한양 | 2 | nikh-early |
| andong-landed-yangban | 17세기 조선, 경상도 안동 | 4 | nikh-early, nikh-change |
| poor-yangban-household | 19세기 전반 조선, 충청도 농촌 | 6 | nikh-change |
| interpreter-family | 18세기 조선 후기, 한양 | 6 | nikh-jungin |
| physician-family | 18세기 조선 후기, 한양 | 7 | nikh-jungin |
| jeonju-clerk-family | 16세기 조선 전기, 전라도 전주 | 8 | nikh-jungin |
| chungcheong-smallholder | 15세기 조선 전기, 충청도 농촌 | 18 | nikh-early |
| jeolla-tenant-household | 18세기 조선 후기, 전라도 농촌 | 22 | nikh-change, nikh-early |
| gangwon-mountain-farm | 17세기 조선, 강원도 산촌 | 18 | nikh-early |
| gyeongsang-fishing-household | 18세기 조선 후기, 경상도 해안 | 16 | nikh-early, nikh-artisans |
| jeolla-weaving-household | 16세기 조선 전기, 전라도 농촌 | 16 | nikh-early, nikh-artisans |
| gwangju-potter-family | 16세기 조선 전기, 경기도 광주 | 12 | semoca-craft, nikh-artisans, nrich-gwangju |
| jeonju-market-household | 19세기 전반 조선, 전라도 전주 | 15 | nikh-artisans, nikh-trade |
| kaesong-merchant-household | 18세기 조선 후기, 개성 | 7 | nikh-song |
| hamgyong-garrison-household | 15세기 조선 전기, 함경도 북방 | 14 | nikh-frontier, nikh-early |
| external-nobi-household | 17세기 조선, 경상도 농촌 | 14 | nikh-sin, aks-nobi |
| resident-nobi-household | 16세기 조선 전기, 한양 | 14 | aks-nobi |

## 인계 및 검증 경계

내용 담당 파일은 이 JSON과 본 출처 문서 두 개다. Git·배포·실제 웹 화면·공유 및 이미지 저장 동작은 부모 작업의 검증 범위다. 본 데이터 검증은 필수 키, 언어 완결성, 필드 일치, 유일 ID, 양의 정수 가중치, 출처 참조와 허용된 그림 매개변수를 대상으로 한다.
