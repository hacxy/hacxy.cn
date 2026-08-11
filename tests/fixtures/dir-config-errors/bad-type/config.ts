// fixture：showSubdirs 非布尔（字符串）→ 加载器应报「showSubdirs 必须为布尔值」
// （故意绕过类型检查：单测验证运行时校验，配置作者在编辑器内会先被类型系统拦下）
export default () => ({ showSubdirs: 'yes' as unknown as boolean })
