/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
// 是对 _createElement的一层封装，可以更加灵活的传入参数
// 正常传参（有data参数）
// render(createElement) {
//   return createElement('h1', { class: 'title'}, ['内容1', '内容2'])
// }
export function createElement (
  context: Component, // VNode的上下文环境
  tag: any,  // 标签tag 如h1 div span等tag
  data: any,
  children: any, // 子节点,可以构建出vnode-tree
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  debugger
  // 对传参不一致进行处理，如果data不是对象，那么把参数后移一位
  if (Array.isArray(data) || isPrimitive(data)) {
    // data参数不传
    // render(createElement) {
    //   return createElement('h1', ['内容1', '内容2'])
    // }
    // 下面这块代码就是对传参不同做降级处理(如果第二个参数 data 不是对象的话，参数整体后移，data 设置为 undefined)
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}


export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  console.log('elementParams--->', context, tag, data, children)
  // vnodeData不能传入响应式对象
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  // <component :is="name"></component> 组件会含有 .is
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  // 不能传入非基础数据类型的key，基础数据类型：number，string。。。
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  // 对插槽的处理
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  // 对children的处理，每一个VNode会包含若干子节点，这些子节点也应该是VNode类型
  // 用户手写render会走进normalizeChildren
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
  /*
    simpleNormalizeChildren 方法调用场景是 render 函数是编译生成的，
    即用户手写template在$mount阶段编译转化为render。
    理论上编译生成的 children 都已经是 VNode 类型的
    */
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  // 不是string类型走createComponent逻辑
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
  /*
    这里先对 tag 做判断，如果是 string 类型，则再判断如果是为 HTML 内置标签类型，就直接创建一个普通 VNode 节点，
    如果是已注册的组件名，则通过 createComponent 创建一个组件 VNode，
    否则创建一个未知标签的VNode。createComponent 方法本质是返回一个 VNode
  */
  /*
    isReservedTag = function (tag) {
      return isHTMLTag(tag) || isSVG(tag)
    };
    */
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn) && data.tag !== 'component') {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    console.log('tag from createElement', tag)
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
