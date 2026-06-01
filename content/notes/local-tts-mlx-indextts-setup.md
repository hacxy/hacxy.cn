---
title: "在 Mac Mini M4 上本地部署 IndexTTS 2.0：零样本声音克隆 + 情感控制完整教程"
date: 2026-05-31
tags:
  - TTS
  - AI语音
  - Apple Silicon
  - IndexTTS
summary: 从零开始在 Mac Mini M4 32G 上部署 IndexTTS 2.0，实现本地中英文语音合成 + 零样本声音克隆 + 8种情感控制，全程使用 MLX 框架原生优化，8bit 量化后快于实时。
---

# 在 Mac Mini M4 上本地部署 IndexTTS 2.0

想在本地跑一个高质量的 TTS（文字转语音）模型，不依赖任何在线 API，不需要付费，还能克隆自己的声音？

这篇文章带你从零开始，在 Mac Mini M4 上部署 [IndexTTS 2.0](https://github.com/index-tts/index-tts)，用苹果的 MLX 框架做原生优化，实现：

- 中英文语音合成（支持混合）
- 零样本声音克隆（给一段参考音频就行）
- 8 种情感控制（高兴、悲伤、愤怒等）
- 8bit 量化后快于实时生成

最终效果：你录一段自己的声音，以后输入文字就能用"你的声音"说话。

## 环境要求

### 硬件

- Mac Mini M4 32G（M1/M2/M3 也行，M4 最佳）
- 统一内存 32GB 足够跑 v2.0 模型

### 软件

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Python 3.10+ | 运行环境 | uv 自动管理 |
| uv | 包管理器 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| git | 克隆代码 | macOS 自带 |
| ffmpeg | 音频格式转换 | `brew install ffmpeg` |

### 网络

- 需要访问 [ModelScope](https://modelscope.cn) 下载模型（国内镜像，速度快）

## 第一步：克隆并安装 mlx-indextts

mlx-indextts 是 IndexTTS 的 MLX 原生实现，专为 Apple Silicon 优化。

```bash
# 克隆仓库
cd ~/Projects
git clone https://github.com/solar2ain/mlx-indextts.git
cd mlx-indextts

# 安装依赖（含模型转换能力）
uv sync --extra convert --extra v2
```

安装完成后，还需要补一个依赖（转换 v2.0 模型时会用到）：

```bash
uv add einops
```

到这里，mlx-indextts 就装好了。

## 第二步：下载 IndexTTS 2.0 模型

推荐用 ModelScope 下载，国内速度快很多。

先装 modelscope SDK：

```bash
uv add modelscope
```

然后下载模型（约 5GB，需要几分钟）：

```bash
uv run python -c "
from modelscope import snapshot_download
snapshot_download('IndexTeam/IndexTTS-2', local_dir='models/raw-indexTTS-2')
print('Download complete!')
"
```

下载完成后，模型文件在 `models/raw-indexTTS-2/` 目录下：

```
models/raw-indexTTS-2/
├── gpt.pth              # GPT 模型（3.25GB）
├── s2mel.pth            # S2Mel 模型（1.12GB）
├── bpe.model            # 分词器
├── config.yaml          # 配置文件
├── qwen0.6bemo4-merge/  # 情感控制模型
└── ...
```

## 第三步：转换为 MLX 格式

下载的模型是 PyTorch 格式，需要转换成 MLX 格式才能在 Apple Silicon 上高效运行：

```bash
uv run mlx-indextts convert \
    --model-dir models/raw-indexTTS-2 \
    -o models/mlx-indexTTS-2.0 \
    --quantize fp32
```

转换完成后，输出在 `models/mlx-indexTTS-2.0/` 目录下：

```
models/mlx-indexTTS-2.0/
├── gpt.safetensors      # 3.3GB
├── s2mel.safetensors    # 395MB
├── bigvgan.safetensors  # 428MB
├── tokenizer.model      # 分词器
├── config.json          # 配置
└── ...
```

到这里，模型就准备好了。

## 第四步：录制参考音频

IndexTTS 是零样本声音克隆——给一段参考音频，它就能模仿那个声音来说话。

### 录制要求

- 时长：3-10 秒（15 秒左右最佳）
- 音质：干净，无背景噪音
- 内容：说一段自然的话就行

### 推荐录制文案

> 你好，我是 hacxy，很高兴认识你。今天阳光特别好，让我想起了小时候在海边散步的日子。那时候海风轻轻地吹着，浪花拍打着沙滩，一切都是那么美好。

### 录制方式

iPhone 语音备忘录或 Mac 自带的语音备忘录 app 都行，录完传到电脑上。

### 格式转换

把录音转成 WAV 格式（24kHz 采样率）：

```bash
# 假设录音文件是 test2.m4a
ffmpeg -i test2.m4a -ar 24000 -ac 1 reference_voice.wav
```

## 第五步：预计算 Speaker

Speaker 是对参考音频的特征提取，计算一次后可以反复使用，加速后续生成。

```bash
uv run mlx-indextts speaker \
    -m models/mlx-indexTTS-2.0 \
    -r reference_voice.wav \
    -o my_voice.npz
```

**注意：** v2.0 的 speaker 计算比较慢，大约需要 4 分钟（234 秒）。要加载 Semantic Codec、W2V-BERT、CAMPPlus 等额外模型，不要以为卡住了，耐心等待即可。

计算完成后会生成一个 `.npz` 文件（约 9MB），这就是你的"声音文件"，以后生成语音都用它。

## 第六步：生成语音

### 基础生成

```bash
uv run mlx-indextts generate \
    -m models/mlx-indexTTS-2.0 \
    -r my_voice.npz \
    -t "你好，这是语音合成测试。" \
    -o output_raw.wav \
    --quantize 8
```

### 音量标准化（必须做）

生成的音频音量偏小，需要用 ffmpeg 做音量标准化：

```bash
ffmpeg -i output_raw.wav \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
    output.wav -y
```

### 中英文混合

直接在文本里混写中英文就行：

```bash
uv run mlx-indextts generate \
    -m models/mlx-indexTTS-2.0 \
    -r my_voice.npz \
    -t "大家好，我是 hacxy。I'm a content creator. 今天分享一下 AI 的最新进展，this is amazing!" \
    -o output_raw.wav \
    --quantize 8
```

### 播放

```bash
open output.wav
```

## 第七步：情感控制

IndexTTS 2.0 支持 8 种情感控制，这是 v1.5 没有的功能。

| 情感 | 命令参数 | 说明 |
|------|----------|------|
| 高兴 | `--emotion happy` | 开心愉悦 |
| 悲伤 | `--emotion sad` | 低沉忧郁 |
| 愤怒 | `--emotion angry` | 生气激动 |
| 恐惧 | `--emotion afraid` | 害怕紧张 |
| 反感 | `--emotion disgusted` | 厌恶排斥 |
| 低落 | `--emotion melancholic` | 怅然若失 |
| 惊讶 | `--emotion surprised` | 出乎意料 |
| 自然 | `--emotion calm` | 平静从容 |

### 使用方法

```bash
uv run mlx-indextts generate \
    -m models/mlx-indexTTS-2.0 \
    -r my_voice.npz \
    -t "哇，太棒了！我的新视频终于发布啦！" \
    -o output_raw.wav \
    --quantize 8 \
    --emotion happy --emo-alpha 0.6
```

`--emo-alpha` 控制情感强度，范围 0.0-1.0，默认 0.6，建议不超过 0.8。

### 混合情感

可以混合两种情感，用冒号指定比例：

```bash
--emotion "happy:0.6,sad:0.4"
```

## 性能数据

在 Mac Mini M4 32G 上的实测数据：

| 模式 | RTF | 说明 |
|------|-----|------|
| fp32 | ~2.5+ | 质量最好，较慢 |
| 8bit 量化 | ~1.5 | 推荐日常使用 |

RTF（Real-Time Factor）< 1 表示快于实时，> 1 表示慢于实时。8bit 量化后虽然 RTF 约 1.5，但因为模型加载时间很短（~1秒），实际使用体验是秒级响应。

## 常见问题

### 1. 转换时报错 `No module named 'einops'`

```bash
uv add einops
```

### 2. speaker 计算要等很久

v2.0 的 speaker 计算需要约 4 分钟，这是正常的。要加载多个额外模型（Semantic Codec、W2V-BERT、CAMPPlus），耐心等待就好。

### 3. 模型下载很慢

用 ModelScope 而不是 HuggingFace。ModelScope 是国内镜像，速度快很多。如果 ModelScope 也慢，可以设置代理：

```bash
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```

### 4. 生成的音频音量太小

这是正常的，必须用 ffmpeg 做音量标准化：

```bash
ffmpeg -i output_raw.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.wav -y
```

### 5. speaker 命令报错

`speaker` 命令不支持 `-v` 参数，会报 `unrecognized arguments`。去掉 `-v` 就行。

## 完整命令速查

```bash
# 1. 安装
cd ~/Projects && git clone https://github.com/solar2ain/mlx-indextts.git && cd mlx-indextts
uv sync --extra convert --extra v2 && uv add einops modelscope

# 2. 下载模型
uv run python -c "from modelscope import snapshot_download; snapshot_download('IndexTeam/IndexTTS-2', local_dir='models/raw-indexTTS-2')"

# 3. 转换模型
uv run mlx-indextts convert --model-dir models/raw-indexTTS-2 -o models/mlx-indexTTS-2.0 --quantize fp32

# 4. 录制参考音频（手动完成），然后转格式
ffmpeg -i test2.m4a -ar 24000 -ac 1 reference_voice.wav

# 5. 预计算 speaker
uv run mlx-indextts speaker -m models/mlx-indexTTS-2.0 -r reference_voice.wav -o my_voice.npz

# 6. 生成语音
uv run mlx-indextts generate -m models/mlx-indexTTS-2.0 -r my_voice.npz -t "要说的文字" -o output_raw.wav --quantize 8

# 7. 音量标准化
ffmpeg -i output_raw.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.wav -y

# 8. 播放
open output.wav
```

## 总结

本地部署 IndexTTS 2.0 的优势：

- **完全免费**：不像 ElevenLabs 每月 $99，本地跑零成本
- **隐私安全**：声音数据不上传任何服务器
- **零样本克隆**：给一段参考音频就能克隆任何声音
- **情感控制**：8 种情感随心切换
- **中英文混合**：无缝切换，不用分开生成

适合的场景：

- 视频口播配音
- 有声书制作
- 多语言内容创作
- 需要定制化声音的项目

整个过程大约需要 20-30 分钟（下载模型最耗时），之后就是一键生成，非常方便。
