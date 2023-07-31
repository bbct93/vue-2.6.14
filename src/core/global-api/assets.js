/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // 这里this.options._base.extend相当于Vue.extend,把这个对象转换成一个继承于 Vue 的构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        /**
         * 挂载到Vue.options.components上,然后在Vue.extend函数中将全局组件合并到Sub.options上
         * 也就是组件的 options 上，然后在组件的实例化阶段，会执行 merge options 逻辑，把 Sub.options.components 合并到 vm.$options.components 上。
         * 而局部组件components 合并到 vm.$options.components 上，该类型的组件才可以访问局部注册的子组件(其子类继承可以访问)
         * 而全局注册是扩展到 Vue.options 下
          */
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
