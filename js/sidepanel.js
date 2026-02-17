// 获取剪切板内容
const getClipboard = async () => await navigator.clipboard.readText()

/**
 * @description 通知
 * @param {string} text - 文本
 */
const notify = text => {
  Toastify({
    text,
    duration: 2000,
    close: true,
    gravity: 'bottom',
    position: 'left',
    style: {
      background: '#2c5f2d', // 深绿色背景
      color: '#ffffff', // 白色字体
      fontWeight: '700',
      fontSize: '18px',
      boxShadow: '0 4px 16px rgba(44, 95, 45, 0.5)' // 适量阴影增加层次感
    }
  }).showToast()
}

/**
 * @description 复制文本
 * @param {string} text - 需要复制的文本
 * @param {string} showStr - 复制成功后的提示
 */
const copy = (text, showStr = '已复制') => navigator.clipboard.writeText(text).then(() => notify(showStr))

const accordionBtn = document.getElementById('sheet-accordion-btn')
const accordionContent = document.getElementById('sheet-accordion-content')
const searchInput = document.getElementById('sheet-search')
const listContainer = document.getElementById('sheet-list-container')

let sheets
// 监听后台传来的 sheet 信息
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'sheetInfo') {
    sheets = msg.sheets
    // 初始化渲染
    renderList(searchInput.value)
  }
})

// 折叠菜单展开/收起
accordionBtn.addEventListener('click', () => {
  accordionBtn.classList.toggle('active')
  if (accordionContent.style.maxHeight) {
    accordionContent.style.maxHeight = null
  } else {
    renderList()
    requestAnimationFrame(() => {
      accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px'
    })
  }
})

const filterHiddenSwitch = document.getElementById('filter-hidden-switch')

// 渲染 sheet 列表
function renderList (filterText = '') {
  // 清空旧列表
  listContainer.innerHTML = ''

  // 获取开关状态
  const onlyShowVisible = filterHiddenSwitch.checked

  // 替换引用语法，获取表格名称
  filterText = filterText.replace(/^'|'![A-z].+/g, '')

  // 遍历所有表格名称
  Object.keys(sheets).forEach(name => {
    const info = sheets[name]

    const matchesSearch = name.toLowerCase().includes(filterText.toLowerCase())
    const isVisible = onlyShowVisible ? !info.sheetHide : true

    if (matchesSearch && isVisible) {
      // 创建单项元素
      const li = document.createElement('li')
      li.className = 'sheet-item'
      li.dataset.sheetId = info.sheetId
      li.dataset.sheetName = name

      // 小圆点（颜色）
      const dot = document.createElement('span')
      dot.className = 'color-dot'
      dot.style.backgroundColor = info.sheetColor === 'transparent' ? 'transparent' : info.sheetColor

      // 表格名称
      const text = document.createElement('span')
      text.className = 'sheet-name'
      text.textContent = name

      // 加载 HTML 元素
      li.appendChild(dot)
      li.appendChild(text)
      listContainer.appendChild(li)
    }
  })

  // 如果折叠面板处于展开状态，更新高度
  if (accordionBtn.classList.contains('active')) {
    requestAnimationFrame(() => {
      accordionContent.style.maxHeight = accordionContent.scrollHeight + 'px'
    })
  }
}

// 添加 switch 变化监听
filterHiddenSwitch.addEventListener('change', () => {
  renderList(searchInput.value)
})

// 点击列表项，切换表格分页
listContainer.addEventListener('click', e => {
  const li = e.target.closest('.sheet-item')
  if (!li) return

  const sheetId = li.dataset.sheetId
  const sheetName = li.dataset.sheetName
  handleSheetClick(sheetId, sheetName)
})

// 发送切换表格分页的信息
function handleSheetClick (sheetId, sheetName) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'switchSheet',
      sheetId,
      sheetName
    })
  })
}

// 关键词搜索
searchInput.addEventListener('input', e => {
  renderList(e.target.value)
})

// 打开表格
document.getElementById('open-sheet').addEventListener('click', async () => {
  let text = await getClipboard()
  text = text.replace(/"|\?.*/g, '')
  if (text.includes('https')) {
    window.open(text)
  } else {
    window.open(`https://docs.google.com/spreadsheets/d/${text}/edit#gid=0`)
  }
})

// 提取表格 ID
document.getElementById('parse-sheetId').addEventListener('click', async () => {
  let text = await getClipboard()
  if (/IMPORTRANGE.+\)/.test(text)) {
    text = text.replace(/IMPORTRANGE\("|",.+/g, '').replace(/.+\/d\/|\/.+|\?.+|=/g, '')
  } else {
    text = text
      .split('\n')
      .map(url => {
        return url.replace(/.+\/d\/|\/.+|\?.+|"/g, '')
      })
      .join('\n')
  }
  copy(text)
})

// 行重复按钮
const rowRepeatBtn = document.getElementById('row-repeat')

rowRepeatBtn.addEventListener('click', () => {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    rowRepeat(false)
    clickTimer = null
  }, 250)
})

rowRepeatBtn.addEventListener('dblclick', () => {
  clearTimeout(clickTimer)
  clickTimer = null
  rowRepeat(true)
})

/**
 * @description 行重复
 * @param {boolean} isDouble - 是否双击
 * @example
 *   双击 - 每行之间加入指定数量间隔
 *   单击 - 内容重复指定数量行
 */
async function rowRepeat (isDouble) {
  const repeatIndex = prompt('需要重复的次数')
  const text = await getClipboard()
  const content = text.split('\n')

  let result = []
  if (isDouble) {
    for (let i = 0; i < content.length; i++) {
      result.push(content[i])
      if (i !== content.length - 1) {
        for (let k = 0; k < repeatIndex; k++) result.push('')
      }
    }
  } else {
    for (const line of content) {
      for (let k = 0; k < repeatIndex; k++) result.push(line)
    }
  }

  const output = result.join('\n')
  copy(output)
}

// 列重复按钮
const columnRepeatBtn = document.getElementById('column-repeat')

columnRepeatBtn.addEventListener('click', () => {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    columnRepeat(false)
    clickTimer = null
  }, 250)
})

columnRepeatBtn.addEventListener('dblclick', () => {
  clearTimeout(clickTimer)
  clickTimer = null
  columnRepeat(true)
})

/**
 * @description 列重复
 * @param {boolean} isDouble - 是否双击
 * @example
 *   双击- 每列之间加入指定数量间隔
 *   单击 - 内容重复指定数量列
 */
async function columnRepeat (isDouble) {
  const repeatIndex = prompt('需要重复的次数')
  const text = await getClipboard()
  const content = text.split('\t')
  let result = []

  if (isDouble) {
    for (let i = 0; i < content.length; i++) {
      result.push(content[i])
      if (i !== content.length - 1) {
        for (let k = 0; k < repeatIndex; k++) result.push('')
      }
    }
  } else {
    for (const col of content) {
      for (let k = 0; k < repeatIndex; k++) result.push(col)
    }
  }

  const output = result.join('\t')
  copy(output)
}

// 排重按钮
const removeDuplicatesBtn = document.getElementById('remove-duplicates')

removeDuplicatesBtn.addEventListener('click', () => {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    removeDuplicates(false)
    clickTimer = null
  }, 250)
})

removeDuplicatesBtn.addEventListener('dblclick', () => {
  clearTimeout(clickTimer)
  clickTimer = null
  removeDuplicates(true)
})

/**
 * @description 排除重复
 * @param {boolean} isDouble - 是否双击
 * @example
 *   双击 - 列排重
 *   单击 - 行排重
 */
async function removeDuplicates (isDouble) {
  const text = await getClipboard()
  const sep = isDouble ? '\t' : '\n'
  const uniq = [...new Set(text.split(sep))].filter(Boolean).join(sep)
  copy(uniq)
}

// 设置通配符按钮
const setWildcardBtn = document.getElementById('set-wildcard')

setWildcardBtn.addEventListener('click', () => {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    setWildcard(false)
    clickTimer = null
  }, 250)
})

setWildcardBtn.addEventListener('dblclick', () => {
  clearTimeout(clickTimer)
  clickTimer = null
  setWildcard(true)
})

/**
 * @description 设置通配符
 * @param {boolean} isDouble - 是否双击
 * @example
 *   双击 - 去掉通配符
 *   单击 - 添加通配符
 */
async function setWildcard (isDouble) {
  const text = await getClipboard()
  const lines = text.split('\n')
  const out = []

  for (const line of lines) {
    const cells = line.split('\t')
    const row = []

    for (let str of cells) {
      const raw = str.trim()

      // 空白保持原样
      if (!raw) {
        row.push(str)
        continue
      }

      // 去掉首尾星号
      const clean = raw.replace(/^\*|\*$/g, '')

      const finalStr = isDouble
        ? clean // 不加星号
        : `*${clean}*` // 加星号

      // 保持原始单元格左右空格结构
      row.push(finalStr)
    }

    out.push(row.join('\t'))
  }

  copy(out.join('\n'))
}

// 拆分函数为单行
document.getElementById('split-func-oneline').addEventListener('click', async () => {
  let text = await getClipboard()
  text = text.replace(/^=\{|\}$/g, '')
  const list = text.match(/.+/g)
  const splitText = list
    .map(str => {
      str = str.trim().replace(/;$/g, '')
      return `=${str}`
    })
    .join('\n')
  copy(splitText)
})

// 替换内容
const btn = document.getElementById('replace-content')
let clickTimer = null

btn.addEventListener('click', () => {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    handleReplace(false)
    clickTimer = null
  }, 250)
})

btn.addEventListener('dblclick', () => {
  clearTimeout(clickTimer)
  clickTimer = null
  handleReplace(true)
})

/**
 * @description 替换内容
 * @param {boolean} isDouble - 是否双击
 * @example
 *   双击 - 逐行替换
 *   单击 - 整行替换
 */
function handleReplace (isDouble) {
  const textarea = document.querySelector('.main-textarea')
  const inputEl = document.getElementsByClassName('input-field')
  const origWord = new RegExp(inputEl[0].value, 'g')
  const replaceWord = inputEl[1].value
  if (!textarea.value || !inputEl[0].value) return

  const newContent = isDouble
    ? textarea.value
        .split('\n')
        .map(x => x.replace(origWord, replaceWord))
        .join('\n')
    : textarea.value.replace(origWord, replaceWord)
  const state = isDouble ? '逐行替换' : '整体替换'
  copy(newContent, state)
}

// 格式化公式
document.getElementById('formula-format').addEventListener('click', () => {
  const textarea = document.querySelector('.main-textarea')
  const formatted = formulaFormatter(textarea.value)
  copy(formatted)
})

// 复制表格名字
const copySheetNameBtn = document.getElementById('copy-sheet-name')

copySheetNameBtn.addEventListener('click', () => {
  const sheetNames = Object.keys(sheets).join('\n')
  copy(sheetNames)
})

// 引用转换
const referenceConvertBtn = document.getElementById('reference-convert')

referenceConvertBtn.addEventListener('click', async () => {
  const text = await getClipboard()

  if (/INDIRECT\(/gi.test(text)) {
    const removeFunc = text.replace(/^INDIRECT\("|"\)/g, '')
    copy(removeFunc)
  } else {
    const splistText = text.split('!')
    const sheetName = splistText[0].replace(/^'|'$/g, '').replace(/''/g, `'`)
    const range = splistText[1].replace(/\$/g, '')
    copy(`INDIRECT("${sheetName}!${range}")`)
  }
})
