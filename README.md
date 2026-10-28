# 신분 환생

조선의 가상 가구에 태어나 신분과 살림을 따로 확인합니다. 결과는 특정 인물의 생애를 재현하지 않습니다.

- 공개 주소: https://nanalab.kr/rebirth-status/
- 언어: ko · en · es · zh · ja · de · fr · pt
- 결과 18개. 추첨 확률은 검증된 인구 통계가 아닌 게임용 가중치입니다.
- 첫 추첨 무료, 재추첨 1회. 현재 결과의 공유 준비 후 +2회, 결과당 한 번. 실제 전송은 확인하지 않습니다.
- 진행은 브라우저 로컬 저장소에 보관합니다. 공유 결과 미리보기는 내 저장 결과를 바꾸지 않습니다.
- 글·세계관·SVG 삽화는 자체 제작. 사실 배경과 원출처는 SOURCES.md에 기록했습니다.

## 개발 및 검증

Node.js 22 이상. `npm ci`, `npm test`, `npm run build`, `npm run validate`. 배포 원본은 src/와 data/, 산출물은 docs/. GitHub Pages는 main:/docs를 사용합니다.

Korean root와 /ko/ 경로를 제공하며, 다른 언어는 언어 코드 경로를 사용합니다. 결과별 정적 HTML·OG 이미지·canonical·reciprocal hreflang·sitemap을 빌드합니다. /ko/는 한국어 root로 canonical을 지정한 호환 경로입니다.

공개 HTTPS의 nanalab.kr 또는 nanacompany.github.io에서 Google Tag Manager, Google Analytics, AdSense, Cloudflare Web Analytics를 불러옵니다. HTTP·로컬 호스트·다른 호스트에서는 실행하지 않습니다. 정적 noscript iframe은 로컬 요청을 막을 수 없어 사용하지 않습니다.

실제 계정으로 메시지 전송하거나 게시하는 테스트는 포함하지 않습니다. 공유 취소·실패·차단은 컨트롤러 테스트로 검증합니다.
