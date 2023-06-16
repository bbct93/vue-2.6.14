/* global Vue */


/**
 * Actual demo
 */

// const App = {
//   render(createElement) {
//     return createElement(
//       'div',
//       {class: 'parent'},
//       [createElement('p', {class: 'child'}, 'I am children from App comp')])
//   },
//   data: {message: 'message from App comp'}
// }

new Vue({
  el: '#demo',
  render(createElement) {
    return createElement('div', {
      id: 'app2'
    }, ['111', '222'])
  },
  data() {
    return {
      message: 'Hello, '
    }
  },



  // render: h => h(App)

})
