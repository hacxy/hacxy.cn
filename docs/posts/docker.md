---
date: 2025-08-06
tags:
  - linux
---

# Ubuntu 安装 docker

- 检查卸载老版本Docker

```sh
sudo apt remove docker docker-engine docker.io containerd runc
```

```sh
sudo apt update
sudo apt upgrade
```

- 安装docker依赖

```sh
sudo apt install ca-certificates curl gnupg lsb-release
```

- 添加docker密钥

```sh
curl -fsSL http://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -
```

- 添加阿里云docker软件源

```sh
sudo add-apt-repository "deb [arch=amd64] http://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable"
```

- 安装docker

```sh
sudo apt install docker-ce docker-ce-cli containerd.io
```
