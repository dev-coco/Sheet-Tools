chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
})

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setOptions({
    path: '/sidepanel.html'
  })
})

// 接收从 content 发送的数据，转发到 sidepanel
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'sheetInfo') {
    chrome.runtime.sendMessage(msg)
  }
})
