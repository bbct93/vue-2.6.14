/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * Dep实际上是对Watcher的一种管理。Dep脱离watcher单独存在是没有意义的。
 */
export default class Dep {
  /**
   * target是全局唯一Watcher，在同一时间只能有一个全局的 Watcher 被计算，
   * 另外它的自身属性 subs 也是 Watcher 的数组
   */
  static target: ?Watcher;
  id: number;
  // 存放watcher的数组
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }
  // subs中添加watcher
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }
  // subs中删除watcher
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }
  // watcher实例中添加dep
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
