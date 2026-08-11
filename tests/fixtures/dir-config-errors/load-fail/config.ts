// fixture：模块顶层抛错（导入即失败）→ 加载器应报「目录配置加载失败」
throw new Error('boom-at-load')
