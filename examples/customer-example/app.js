/* global Vue */

Vue.component('button-counter', {
  data: function () {
    return {
      count: 0
    }
  },
  template: '<button v-on:click="count++">You clicked me {{ count }} times.</button>'
})

// new Vue({
//   el: '#demo',
//
//   // render(createElement) {
//   //   return createElement('div', {
//   //     id: 'app1'
//   //   }, [
//   //     createElement('span', 'Parent Component1'),
//   //     createElement('span', 'parent component2')
//   //   ]);
//   // },
//   render: function (createElement) {
//     return createElement('div', {
//       attrs: {
//         id: 'demo'
//       }
//     }, 'button-counter', {})
//   },
//   data() {
//     return {
//       message: 'Hello'
//     }
//   },
// })

new Vue({ el: '#demo' })

