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
  data() {
    return {
      message: 'Hello, vue2'
    }
  },



  // render: h => h(App)

})
