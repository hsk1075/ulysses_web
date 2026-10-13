#!/bin/bash
# 율리시스 사진 가볍게 만들기 (Mac 전용 — 맥에 기본으로 있는 sips 사용)
#
# 사용법 (VS Code 터미널, ulysses 폴더에서):
#   bash make-thumbs.sh            → 미리보기용 작은 사진(thumbs/)만 만들기. 원본은 그대로
#   bash make-thumbs.sh --shrink   → 위 + 원본 사진도 긴 변 2000px로 줄이기
#                                    (처음 한 번은 원본을 ../photos_원본백업 에 복사해 둠)
#
# 사진을 새로 넣을 때마다 다시 실행하면 새 사진만 처리합니다.

cd "$(dirname "$0")" || exit 1

if [ "$1" = "--shrink" ] && [ ! -d "../photos_원본백업" ]; then
  echo "원본을 ../photos_원본백업 에 복사해 두는 중…"
  cp -R photos "../photos_원본백업"
fi

count=0
while IFS= read -r -d '' f; do
  # 1) 원본 줄이기 (--shrink 일 때만, 긴 변이 2000px 보다 클 때만)
  if [ "$1" = "--shrink" ]; then
    w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
    h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
    if [ "${w:-0}" -gt 2000 ] || [ "${h:-0}" -gt 2000 ]; then
      sips -Z 2000 -s formatOptions 82 "$f" >/dev/null
    fi
  fi
  # 2) 미리보기 사진 만들기 (긴 변 640px) — 없거나 원본이 더 새로우면
  t="thumbs/${f#photos/}"
  if [ ! -f "$t" ] || [ "$f" -nt "$t" ]; then
    mkdir -p "$(dirname "$t")"
    sips -Z 640 -s format jpeg -s formatOptions 70 "$f" --out "$t" >/dev/null
    count=$((count + 1))
  fi
done < <(find photos -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -print0)

echo "완료: 미리보기 사진 ${count}장 새로 만듦 (thumbs 폴더)"
du -sh photos thumbs 2>/dev/null
