# ssh 免密登录

## 生成 SSH 密钥对

```sh
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

```

## 添加公钥到远程服务器

```sh
ssh-copy-id user@remote_host

```
