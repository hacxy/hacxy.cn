# MacMini 抹掉所有内容后不开机

## 背景

macmini 抹掉所有内容, 也就是恢复出厂设置后, 重启等待了很久不开机, 最后主机指示灯闪烁橙色灯光

## 解决方案

### 方案一

- 使用typec协议连接的显示器 (待验证)

### 方案二

- 由于我的显示器是HDMI协议, 并不支持typec, 所以无法验证第一条解决方案, 只能使用方案二
- 首先准备第二台具备macos可以正常进入系统的设备, 如: macbook, 以下简称主设备
- 使用 typec 数据线分别插入 主设备的USB-C 口和macmini 的USB-C口, 一般在macmini的背后而不是前面的两个typec口
- 确保主设备可以连接网络, 并下载安装 [Apple Configurator](https://apps.apple.com/us/app/apple-configurator/id1037126344?mt=12), 安装完成后打开此app
- 拔掉macmini的电源, 按住macmini 的电源键, 按住的同时插进电源, 如果操作正确, macmini将进入 DFU 模式, DFU 的全称是 Device Firmware Upgrade，即 iOS 固件的强制升降级模式。
- 此时主设备应该会检测到设备, 并显示DFU大图标
- 接着点击设备, 选择继续抹除或者恢复系统
- 恢复过程需要主设备全程联网, 恢复完成后macmini会自动开机进入系统, 此时显示器也可以正常显示系统界面
