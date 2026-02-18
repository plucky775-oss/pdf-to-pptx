# kePCO_overhead_cartoon (초심플 만화풍)

- 배전가공 시공관리책임자 판단 시뮬레이션(만화풍)
- 글 최소 / 스테이터스바 없음 / 선택 2~3개
- 안전 선택은 항상 1번이 아니며, 읽고 판단해야 함
- 안전을 잘 지키면 해피엔딩

## 포함
- 4개 공사 유형: 지장전주 이설 / 신규 / 변압기 교체 / 개폐기 교체
- 각 유형 5장면(2~3분)
- 결과(해피/아슬아슬/일반재해/사고) 만화 이미지 + 칭찬/분발 문구

## 앱에 붙이기
### 1) 폴더 통째로 업로드
리포지토리에 `kePCO_overhead_cartoon/` 폴더를 그대로 넣고 GitHub Pages 활성화.

접속:
- `.../kePCO_overhead_cartoon/`

### 2) 특정 유형 바로 시작
- `.../kePCO_overhead_cartoon/index.html?type=relocate`
- `.../kePCO_overhead_cartoon/index.html?type=new`
- `.../kePCO_overhead_cartoon/index.html?type=transformer`
- `.../kePCO_overhead_cartoon/index.html?type=switch`

### 3) iframe 임베드
```html
<iframe src="kePCO_overhead_cartoon/index.html" style="width:100%;height:100vh;border:0;"></iframe>
```
