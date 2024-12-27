---
description: npm版本号说明
---

# 版本号说明

规则: `{major}.{minor}.{patch}-{pre-release}`

翻译: `{主版本号}.{次版本号}.{修补版本号}-{非正式版版本号}`

## 示例:

```json
  "devDependencies": {
    "vitepress-theme-mild": "0.1.0-beta.1"
  }
```

## 说明:

- 上面这个例子:

  - 主版本号: 0
  - 此版本号: 1
  - 修订版本号: 0
  - 非正式版本号: beta.1

- 规则:

  - `version`: 表示必须匹配某个版本
    - 示例: `1.1.1` 表示安装依赖时只会安装 `1.1.1`
  - `>version`: 表示必须大于某个版本
    - 示例: `>1.1.2`，表示安装依赖时会安装大于 `1.1.2` 的版本, `<` 和 `<=` 以及 `>=`同理
  - `~version` 大概匹配某个版本

    - 如果 minor 版本号指定了，那么 minor 版本号不变，而 patch 版本号任意
    - 如果 minor 和 patch 版本号未指定，那么 minor 和 patch 版本号任意

  - `^version` 兼容某个版本
    - 只会修改 patch
