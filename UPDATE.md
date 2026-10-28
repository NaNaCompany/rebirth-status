# 업데이트 기록

## 2026-10-28

- 신분 환생 최초 구현. 결과 18개, 한국어 포함 8개 언어.
- 원본 SVG 결과 카드와 PNG 다운로드, 결과별 공유 링크, 저장 복원, 재추첨·공유 보상 구현.
- 결과별 정적 HTML 및 OG 이미지, 대응 언어 alternate, canonical, sitemap.xml, robots.txt 생성.
- Google Analytics·Google Tag Manager·AdSense·Cloudflare 태그 4종에 프로덕션 HTTPS 실행 가드 적용.
- More Apps → https://nanalab.kr/apps/.
- 자체 창작 글·삽화. 사실 출처는 SOURCES.md.
- 엔진·컨트롤러·SVG·태그·정적 검증기 테스트 65개 통과, 실패 0.
- 전체 출력 2회 빌드 SHA-256 일치. 8개 언어·결과·출처·개인정보 경로, sitemap/canonical/reciprocal hreflang 및 로컬 에셋 검사 통과.
- CUA 브라우저에서 8개 언어 추첨 화면 확인. 모바일 CSS 폭 360px에서 가로 넘침 없음. 데스크톱에서도 추첨·복사 +2·중복 보상 차단·현재 결과 제외·새로고침 복원·친구 링크 미리보기 후 내 결과 복원을 확인.
- 로컬 브라우저에서 외부 추적 스크립트 0개. HTTPS 프로덕션 4종 로딩·단일 페이지뷰는 실제 부트스트랩 VM 테스트로 확인.
- 물리 스마트폰, 네이티브 공유의 실제 수신, SNS 실제 게시, 광고 채움과 분석 서버 수신 여부는 검증 범위에 포함하지 않음.
- 배포 대상: GitHub Pages main:/docs. 정확한 배포 커밋·공개 응답 대조 결과는 워크스페이스 릴리스 기록과 UpdateQue.md에 연결.
