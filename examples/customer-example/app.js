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
    return createElement('div', {}, [
      createElement('span', 'Parent Component'),
      createElement('input')
    ]);
  },
  data() {
    return {
      message: 'Hello, '
    }
  },



  // render: h => h(App)

})
