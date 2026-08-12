---
title: "예시 포스트: 이렇게 글을 올리면 됩니다"
description: "Tech Blog에 마크다운으로 글을 올리는 방법을 보여주는 예시 포스트입니다."
publishDate: 2026-08-12
author: "4n5rud"
tags: ["Guide"]
draft: true
---

이 포스트는 예시입니다. `src/content/blog/` 안에 `.md` 파일을 새로 만들고 프런트매터를 채우면 `/blog`에 자동으로 목록이 뜨고, `/blog/[slug]`로 상세 페이지가 생성됩니다.

이미지는 이 파일과 같은 폴더에 넣고 상대 경로로 참조하면 됩니다.

```md
![설명](./example-image.png)
```

실제 글을 쓸 준비가 되면 `draft: true`를 지우거나 `false`로 바꿔주세요.
