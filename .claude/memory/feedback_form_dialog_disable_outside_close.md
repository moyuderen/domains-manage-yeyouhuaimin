---
name: form dialogs should not close on outside click
description: In this project, add/edit dialogs must not close when users click blank overlay areas.
type: feedback
---
当前项目中，所有进行新增和编辑的弹窗，都不允许通过点击空白区域或遮罩关闭。

**Why:** 用户明确指出，点击空白区域关闭会导致误操作，进而丢失刚才填写或修改中的信息。
**How to apply:** 之后只要新增或调整输入型的新增/编辑弹窗，默认都应禁止 outside click 关闭；删除确认、导航侧栏等非此类弹窗则按具体交互目的单独判断。