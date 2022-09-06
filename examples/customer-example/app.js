/* global Vue */


/**
 * Actual demo
 */

new Vue({

  el: '#demo',
  data: {
    message: 'message from data'
  },
  render(createElement) {
    return createElement(
      'div',
      {class: 'parent'},
      [createElement('p', {class: 'child'}, 'I am children')]) // 【标记1】
  }
})
