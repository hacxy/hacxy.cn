---
description: 无证书的App在macos上安装会提示已损坏, 本文提供解决方案
tags:
  - macos
---

# MacOS 安装 App 提示已损坏解决方案

信任开发者, 要求输入密码:

```sh
sudo spctl --master-disable
```

放行:

```sh
xattr -cr /Applications/XXX.app
```

之后可以正常打开.
