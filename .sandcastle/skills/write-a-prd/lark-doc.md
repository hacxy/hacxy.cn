# 飞书文档创建步骤

## 获取当前项目名称

使用 `gh` 工具获取当前GitHub仓库名称, 如果当前项目不是GitHub仓库则直接将当前项目的目录作为项目名称

## 选择文件夹

先查找当前项目同名文件夹是否已存在于目标根文件夹中，并从结果中获取同名文件夹的token:

```bash
lark-cli drive +search --query "<项目名>" --doc-types folder --folder-tokens "KoVnf8XE9lHHFed7OL0cV8rGnBd" --format table
```

如果查找不到则创建一个文件夹，并记住创建出来的文件夹的token:

```bash
lark-cli drive +create-folder --name "<项目名>" --folder-token "KoVnf8XE9lHHFed7OL0cV8rGnBd" --as bot
```

## 创建文档

注意 `--content` 的 `@path` 只接受**当前工作目录下的相对路径**（如 `@./doc.md`），绝对路径会报错。内容较多时在`/tmp`目录下创建，创建完成后删除。

```bash
# 只建标题(空文档)
lark-cli docs +create --title "title" --parent-token "<文件夹token>" --as bot

# 带内容(Markdown格式)
lark-cli docs +create --title "title" --content "# 标题\n\n正文内容" --doc-format markdown --parent-token "<文件夹token>" --as bot

# 内容较多时用仓库内相对路径文件传入（创建后记得清理）
lark-cli docs +create --title "title" --content "@/path/to/doc.md" --doc-format markdown --parent-token "<文件夹token>" --as bot
# 注意：@path 必须是相对路径（如 @./prd.tmp.md），不能是 /tmp 绝对路径
```
