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
  // render(createElement) {
  //   return createElement('div', {
  //     id: 'app1'
  //   }, [
  //     createElement('span', 'Parent Component1'),
  //     createElement('span', 'parent component2')
  //   ]);
  // },
  render: function (createElement) {
    return createElement('div', {
      attrs: {
        id: 'demo'
      }
    }, this.message)
  },
  data() {
    return {
      message: 'Hello'
    }
  },



  // render: h => h(App)

})
