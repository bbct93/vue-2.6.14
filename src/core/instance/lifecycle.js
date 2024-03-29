/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import {mark, measure} from '../util/perf'
import {createEmptyVNode} from '../vdom/vnode'
import {updateComponentListeners} from './events'
import {resolveSlots} from './render-helpers/resolve-slots'
import {toggleObserving} from '../observer/index'
import {pushTarget, popTarget} from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}

export function initLifecycle(vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  /**
   *   vm.$parent 就是用来保留当前 vm 的父实例，
   *   并且通过 parent.$children.push(vm) 来把当前的 vm 存储到父实例的 $children 中。
    */
  let parent = options.parent
  // 注意这里如果是抽象组件，就不会进行父子级关系构建
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    // 即把当前vm放到vm.$options.parent.$children数组中
    parent.$children.push(vm)
  }

  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

export function lifecycleMixin(Vue: Class<Component>) {
  // _update核心是调用__patch__函数 它的定义在 src/platforms/web/runtime/patch.js中
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    // 这里的$el是真实dom,在Vue.prototype.$mount函数中定义在vm上，即为根节点的真实dom
    const prevEl = vm.$el
    // 用于判断走initPatch还是updatePatch
    const prevVnode = vm._vnode
    /** setActiveInstance方法用来保存当前上下文Vue实例，是lifecycle模块的全局变量
     *  在之前调用 createComponentInstanceForVnode 方法构建组件实例时传入的options中的parent的时候从 lifecycle 模块获取，并且作为参数传入的
     */
      // 把vm设置为activeInstance，并保留住上一次的vm(prevActiveInstance),父子关系
    const restoreActiveInstance = setActiveInstance(vm)
    // 注意：在渲染子组件时，vm._vnode和vm.$vnode的是父子关系，即vm._vnode.parent === vm.$vnode
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used. 初始化
    if (!prevVnode) {
      // initial render
      /**
       * 传入的vm.$el是在mountComponent时定义在vm上
       * __patch在src/platforms/web/runtime/index.js上定义的
       */
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates 更新
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    // 难怪$0.__vue__能访问到组件实例,原来是在这里挂载上去了
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

export function mountComponent(
  vm: Component,
  el: ?Element,  // 传入的el是经过query(el)返回的dom
  hydrating?: boolean
): Component {
  /***
   * vm代表的是Vue实例，它是通过构造函数Vue创建的一个对象。vm是view-model简写，表示视图模型
   * 组件实例被称为"vm"，是因为它们在框架内部充当了视图和模型之间的桥梁。
   * 在mountComponent方法中，vm是当前组件实例，它是通过new Vue(options)创建的。
   */
  // vm上定义$el，即将el挂载到vm.$el上
  vm.$el = el
  // 判断是否存在转化的render函数，在前面的$mount时将template转化为render函数并挂在在vm.$options上
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 在执行 vm._render() 函数渲染 VNode 之前，执行了 beforeMount 钩子函数
  callHook(vm, 'beforeMount')
  // 定义updateComponent方法
  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      // 重点： _render定义在src/core/instance/render.js，返回VNode(虚拟dom)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      // 调用vm实例上的_update方法,入参是_render()返回的虚拟dom和是否服务端渲染
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      // render方法在/core/instance/render下定义,_update在lifecycle下的lifecycleMixin里定义
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  /**
   * 实例化一个渲染watcher，在它的构造函数中会调用这个updateComponent方法，这个方法做两件事情
   *   1、这个方法中会调用vm._render生成虚拟Node，
   *   2、最终会调用vm._update方法更新dom
   *   Watcher在这里起到两个作用：
   *   1、初始化执行回调函数
   *   2、当vm实例中检测的数据发生改变时执行回调，重新渲染组件
   */
  new Watcher(vm, updateComponent, noop, {
    before() {
      // 注意这里有个判断，也就是在组件已经 mounted 之后，才会去调用beforeUpdate这个钩子函
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true)
  hydrating = false
  // mounted is called for render-created child components in its inserted hook
  /**
   * 注意，这里对 mounted 钩子函数执行有一个判断逻辑，
   * vm.$vnode 如果为 null，则表明这不是一次组件的初始化过程，而是我们通过外部 new Vue 初始化过程
   * 因为只有外部new Vue时才不会存在父组件$vnode，所以只有根组件才会走进这里
    */
  if (vm.$vnode == null) {
    // _isMounted判断是否已经挂载了，同时执行mounted钩子函数
    vm._isMounted = true
    // 在执行完 vm._update() 把 VNode patch 到真实 DOM 后，执行 mounted 钩子
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent(
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

export function callHook(vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  // 在合并options时，已经把各组件实例的钩子函数合并到options上
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
