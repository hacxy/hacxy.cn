import { defineDirConfig } from '../../../../src/content/dirConfig.ts'

/** 目录配置 fixture：空配置（无 showSubdirs 字段）→ 缺省 true、不入配置表。 */
export default defineDirConfig(() => ({}))
