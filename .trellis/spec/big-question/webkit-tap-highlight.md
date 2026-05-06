# WebKit 点击高亮与移动端圆角问题

## 问题

在移动设备（iOS Safari、iOS 上的 Chrome）上点击按钮或交互元素时，`border-radius` 样式会短暂丢失，元素显示为矩形高亮而非圆角效果。

**症状：**
- 按钮在点击/触摸时出现直角
- 触摸时闪现蓝色或灰色矩形遮罩
- 该视觉异常仅出现在基于 WebKit 的移动浏览器上
- 桌面浏览器和 Android Chrome 不受影响

## 根本原因

WebKit 浏览器会对交互元素应用默认的点击高亮效果。该高亮：

1. **忽略 `border-radius`**——高亮以简单矩形遮罩的形式覆盖
2. **使用系统默认颜色**——通常为半透明蓝色或灰色
3. **覆盖自定义样式**——高亮显示在自定义样式之上

### 技术细节

在 iOS Safari 上点击元素时：

```css
/* WebKit 的默认行为（示意性写法） */
element:active {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  /* 此处创建的是矩形遮罩，忽略 border-radius */
}
```

点击高亮作为独立图层渲染，不遵守元素的 `border-radius`、`clip-path` 或其他定义形状的属性。

## 解决方案

### 方案一：禁用点击高亮 + overflow-hidden 包裹层

最可靠的方案是结合两种技术：

```tsx
// 正确处理移动端触摸的按钮组件
function Button({ children, className, ...props }: ButtonProps) {
  return (
    <div className="rounded-lg overflow-hidden inline-block">
      <button
        className={cn("rounded-lg px-4 py-2 bg-blue-500 text-white", className)}
        style={{ WebkitTapHighlightColor: "transparent" }}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
```

**原理：**
1. `WebkitTapHighlightColor: "transparent"` 移除默认高亮
2. 外层 `div` 的 `overflow-hidden` 裁剪任何残留的视觉异常
3. 两个元素使用相同的 `border-radius`，保证外观一致

### 方案二：纯 CSS 方案

如果无法修改组件结构：

```css
/* 在全局 CSS 中 */
.tap-safe {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* 自定义激活状态，替代默认高亮 */
.tap-safe:active {
  opacity: 0.8;
  transform: scale(0.98);
}
```

```tsx
<button className="tap-safe rounded-lg px-4 py-2 bg-blue-500">
  点击我
</button>
```

### 方案三：Tailwind CSS 工具类

在 Tailwind 配置中添加可复用的工具类：

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {},
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
      });
    },
  ],
};
```

然后在组件中使用：

```tsx
<button className="tap-highlight-none rounded-lg px-4 py-2">
  点击我
</button>
```

### 方案四：可复用包裹组件

为所有圆角交互元素创建统一的包裹组件：

```tsx
// components/ui/touch-safe-wrapper.tsx
interface TouchSafeWrapperProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: string;
}

export function TouchSafeWrapper({
  children,
  className,
  borderRadius = "rounded-lg"
}: TouchSafeWrapperProps) {
  return (
    <div className={cn(borderRadius, "overflow-hidden inline-flex", className)}>
      {children}
    </div>
  );
}

// 使用示例
<TouchSafeWrapper>
  <button
    className="rounded-lg px-4 py-2 bg-blue-500"
    style={{ WebkitTapHighlightColor: "transparent" }}
  >
    点击我
  </button>
</TouchSafeWrapper>
```

### 完整示例：含可点击区域的卡片

```tsx
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="rounded-xl border p-4">
      <h3>{product.name}</h3>
      <p>{product.description}</p>

      {/* 带触摸安全处理的操作按钮 */}
      <div className="flex gap-2 mt-4">
        <div className="rounded-lg overflow-hidden">
          <button
            className="rounded-lg px-4 py-2 bg-blue-500 text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onClick={() => addToCart(product)}
          >
            加入购物车
          </button>
        </div>

        <div className="rounded-lg overflow-hidden">
          <button
            className="rounded-lg px-4 py-2 border border-gray-300"
            style={{ WebkitTapHighlightColor: "transparent" }}
            onClick={() => viewDetails(product)}
          >
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 关键结论

1. **WebKit 点击高亮忽略 border-radius**——这是浏览器行为，不是 CSS bug

2. **在带圆角的交互元素上始终设置 `WebkitTapHighlightColor: "transparent"`**

3. **使用带 `overflow-hidden` 的包裹层**以获得最可靠的视觉裁剪效果

4. **在真实 iOS 设备上测试**——模拟器和浏览器开发工具可能无法复现该问题

5. **考虑添加自定义激活状态**，替代被移除的点击反馈，提升用户体验

6. **创建可复用组件**，统一处理移动端触摸行为

## 浏览器支持说明

| 浏览器 | 是否需要修复 |
|--------|------------|
| iOS Safari | 是 |
| iOS 上的 Chrome | 是（使用 WebKit） |
| iOS 上的 Firefox | 是（使用 WebKit） |
| Android Chrome | 通常不需要 |
| 桌面浏览器 | 不需要 |

## 相关资源

- [MDN：-webkit-tap-highlight-color](https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color)
- [WebKit Bug 追踪器](https://bugs.webkit.org/)
- [CSS Tricks：处理触摸事件](https://css-tricks.com/snippets/css/remove-gray-highlight-when-tapping-links-in-mobile-safari/)
