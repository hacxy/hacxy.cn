// fixture：工厂执行时抛错 → 加载器应包装为「目录配置求值失败」并带路径与原因
export default () => {
  throw new Error('boom')
}
