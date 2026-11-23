chat的业务是这样的：

用户的心智模型中，多个session其实是并发的，所有session都是存在的，会有这样几种状态：
foreground（在前台） && streaming
foreground && canceling
foreground && sending
foreground && hanged (approval)
forground && idle (ready for new query)
foreground && error (can not recover)

background && hanged (wait for approval)
background( && streaming) (dont know is streaming)
background && idle
background && error (can not recover)

我们可以发生这样的transition

create: f->b, new f(idle)
f->b: h->h, s->s, c->c, e->e, i->i
b->f: the same
f c: c -> i / e
f h: h -approve-> s
f s: s -cancel-> canceling
f s: s -approve task(BE)-> hanged
f i: i -query-> s

我们会发现，用户 / 组件视角看，所有的session只要能通过session history list访问到，在用户的心智模型中，他们都是存在且等价的，并没有后端业务的waiting for respond / killed / need recover。redis是否有缓存，会话是否需要从mongo db拉取，这些事情和用户都是无关的。流怎么转移，有几个流在前台 / 后台发生，这些事也和用户无关。

---

我们有router作为chat view和chat业务的唯一交互点

router维护多个runtime，view问router“索取”一个session的runtime，从而完成b -> f, f -> b的切换。同时router需要维护一组session router，session runtime有自己的生命周期，router是维护runtime的调度器。rounter这个词这样看不太好了，你或许要拆分router 和 coordinator。

同时，session create，cancel，delete这些职责如何拆分干净，create后注入给session runtime？这我们还需要讨论。

---

最后我们来看runtime
runtime解决的是，将后端的那套生命周期变为我们前端的生命周期话语：

check active / respond ｜ recover / streaming，这些事情其实和我们的业务无关，对外应该完全抽象，我们设计这样几个阶段：

bootstrap：
load history message
|
check active
| \
streaming / respond recover

bootstrap得结合后端业务看，总之，bootstrap结束后，session进入这样的状态：
idle(ready for query) | streaming | hanged | error

streaming会进入hanged或者error或者idle，随着后端的数据流自然发生

cancel会在streaming时被消费，让streaming进入canceling，随后进入idle / error

idle时，通过发一个query，可以让会话重新进入streaming

runtime内部看逻辑是这样，外部的coordinator是可以从外部选取并evict对话的，采取LFU的方式淘汰。

evicted的对话会进入clean up阶段，clean up不代表cancel，并不处理后端，只把前端这个session runtime instance清理干净。
