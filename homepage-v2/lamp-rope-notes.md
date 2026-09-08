# 台灯自由拉绳：实现成本评估

2026-09-08。以下工时是结合当前静态首页、已有 GSAP 和单根短绳给出的工程估算，并非文档提供的报价；包含接入、响应式与鼠标/触摸验证，不包含多轮视觉方向调整。

| 方案 | 用户能做什么 | 预计新增工时 | 代价 |
| --- | --- | --- | --- |
| 当前固定 SVG 动画 | 拖动热点，释放后开灯；再次拉动关闭 | 已接入 | 绳子本身不跟手变形 |
| SVG 曲线 + 弹性回位（推荐） | 绳端跟随鼠标向任意方向移动，可限制最大拉长量；松手回弹，越过阈值开关灯 | 0.5–1.5 个工作日 | 需要把绳子与拉环从灯体分离；弯曲是受控视觉模拟 |
| 分段绳索物理模拟 | 多节点自然垂落、摆动、受拉伸约束，必要时碰撞灯罩 | 2–4 个工作日 | 要调稳定性、阻尼、最大长度与不同帧率；更多验证和维护 |

推荐第二档：保留你的灯体、拉环和灯泡亮起美术，只让绳端位置实时跟手，动态更新 SVG 曲线，松手后用已有 GSAP 回位。这样能满足“拉长、不同方向拖拽”，无需给一条短绳引入完整物理引擎。若要明显的甩动、缠绕或碰撞，再考虑第三档。

固定 SVG 不能直接承担任意方向的实时变形；升级时需要替换其中绳子轨道，灯泡/灯罩状态仍可复用。当前接入保持提供的开灯 SVG，未提前改成物理绳。

技术依据：

- [MDN Pointer Capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)：拖动期间把后续指针事件保留给拉绳控件，即使鼠标离开热点也能结束拖动。配合 pointercancel 和 lostpointercapture 复位。
- [MDN SVG pointer-events](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/pointer-events)：可以把拖拽命中与 SVG 图形分离，给细绳更宽的透明触控区。
- [Matter.js Constraint](https://brm.io/matter-js/docs/classes/Constraint.html)：长度约束、刚度和阻尼可组合成弹性绳，但需要迭代和稳定性调节。
- [Matter.js MouseConstraint](https://brm.io/matter-js/docs/classes/MouseConstraint.html)：提供物理物体的鼠标拖拽约束，适合第三档。
