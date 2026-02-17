/**
 * @description 在指定的 DOM 节点上触发鼠标事件
 * @param {HTMLElement} node - 要触发事件的 DOM 节点
 * @param {string} eventType - 鼠标事件类型
 */
function triggerMouseEvent (node, eventType) {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window
  })
  node.dispatchEvent(event)
}

// 根据 sheetName 查找元素并点击
function clickSheetByName (sheetName) {
  const sheets = document.querySelectorAll('.docs-sheet-container-bar > div')
  for (const sheet of sheets) {
    const nameEl = sheet.querySelector('.docs-sheet-tab-name')
    if (!nameEl) continue
    if (nameEl.innerText === sheetName) {
      // 找到对应的 sheet 容器
      triggerMouseEvent(sheet, 'mousedown')
      triggerMouseEvent(sheet, 'mouseup')
      return true
    }
  }
  console.warn(`未找到 Sheet: ${sheetName}`)
  return false
}

// 获取并发送 Sheet 数据
function sendSheetsInfo () {
  const sheets = document.querySelectorAll('.docs-sheet-container-bar > div')
  const result = {}

  sheets.forEach(sheet => {
    const sheetName = sheet.querySelector('.docs-sheet-tab-name').outerText
    const sheetColorEl = sheet.querySelector('.docs-sheet-tab-color')
    const sheetColor = sheetColorEl ? sheetColorEl.style.backgroundColor : ''
    const sheetHide = sheet.style.display === 'none'
    result[sheetName] = { sheetName, sheetColor, sheetHide } // 不再使用 ID
  })

  chrome.runtime.sendMessage({
    action: 'sheetInfo',
    sheets: result
  })
}

// 监听 Sidepanel 请求
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'switchSheet') {
    console.log('切换 Sheet:', msg.sheetName)
    clickSheetByName(msg.sheetName)
  }
})

// 页面加载完成时发送一次
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendSheetsInfo)
} else {
  sendSheetsInfo()
}

// 标签页切换回前台时发送一次
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    sendSheetsInfo()
  }
})
