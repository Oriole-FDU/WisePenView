我们要确定一个边界和协议：Chat的Component侧应该看到怎样的chat抽象，应该如何操作chat domain暴露的能力。

这个边界现在极其模糊，原因是简单的component / service结构并不能解决这个复杂任务，复杂度进入了component / _controller，这件事带来了很糟糕的事情：层与模块的边界失控了。

我给出一个初步的方向，我们或许要一边思考产品形态，一边划分职责，自顶向上逐步细化的解决这个问题，过程中我希望你积累一些文档。放在runtime/docs。

我希望这次重构的一些原则可以沿用到将来的重构上，思想会有：

- 组件职责变薄，不持有状态
- runtime持有状态
- runtime控制与数据解耦
- service保持无状态

对于复杂业务，我们的解法是引入新层runtime

component(view = f(state))
|
runtime(hold state, cache, coordinate, control flow | data flow)
|
services(no state, atomic services by BE)

runtime和service的形态和职责应当有明显区别：两个层不应该都作为controller + model + capability的层，层堆层不是解决问题的方法--毕竟后端也有一个层。

更多的兼容层不会解决我们的问题，我们要做的是合理的业务建模和模块边界划分。

上述描述作为runtime层的准则，希望你能牢记。
