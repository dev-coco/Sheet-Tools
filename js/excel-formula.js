/**
 * @description 格式化表格公式字符串
 * @param {string} formula - 表格公式
 * @returns {string} 格式化后带缩进和换行的字符串
 */
function formulaFormatter (formula) {
  // 去掉公式内所有换行
  formula = formula.replace(/\n/g, '')
  // 可能出现的错误值
  const errorValues = ',#NULL!,#DIV/0!,#VALUE!,#REF!,#NAME?,#NUM!,#N/A,'

  // 科学计数法前缀匹配，如 "1.23E"
  const regexPreExponent = /^[1-9]{1}(\.[0-9]+)?E{1}$/

  // 创建 Token 集合对象
  function createTokenCollection () {
    const tokens = {
      items: [],
      index: -1
    }

    /**
     * @description 创建一个新的 Token 对象并加入集合
     * @param {string} value - Token 的文本值
     * @param {string} type - Token 的类型（operand/operator/function 等）
     * @param {string} [subtype=''] - Token 子类型
     * @returns {object} 新创建的 Token 对象
     */
    tokens.add = function (value, type, subtype = '') {
      const token = { value, type, subtype }
      this.addRef(token)
      return token
    }

    /**
     * @description 将已有的 Token 对象添加到集合末尾
     * @param {object} token - 已存在的 Token 对象
     */
    tokens.addRef = function (token) {
      this.items.push(token)
    }

    // 重置集合的遍历指针到起始位置
    tokens.reset = function () {
      this.index = -1
    }

    /**
     * @description 判断当前指针是否指向集合开头
     * @returns {boolean} 若在开头则返回 true，否则为 false
     */
    tokens.BOF = function () {
      return this.index <= 0
    }

    /**
     * @description 判断当前指针是否指向集合末尾
     * @returns {boolean} 若在末尾则返回 true，否则为 false
     */
    tokens.EOF = function () {
      return this.index >= this.items.length - 1
    }

    /**
     * @description 迭代指针向后移动一位，指向下一个 Token
     * @returns {boolean} 若成功移动则返回 true，否则为 false
     */
    tokens.moveNext = function () {
      if (this.EOF()) return false

      this.index += 1
      return true
    }

    /**
     * @description 获取当前指针指向的 Token 对象
     * @returns {object|null} 当前 Token 或 null（未初始化时）
     */
    tokens.current = function () {
      return this.index === -1 ? null : this.items[this.index]
    }

    /**
     * @description 预览下一个 Token 对象（不移动指针）
     * @returns {object|null} 下一个 Token 或 null（若已在末尾）
     */
    tokens.next = function () {
      return this.EOF() ? null : this.items[this.index + 1]
    }

    /**
     * @description 预览上一个 Token 对象（不移动指针）
     * @returns {object|null} 上一个 Token 或 null（若已在开头）
     */
    tokens.previous = function () {
      return this.index < 1 ? null : this.items[this.index - 1]
    }

    return tokens
  }

  /**
   * @description 创建一个 Token 堆栈对象，支持嵌套结构的跟踪（如括号、函数）
   * @returns {object} Token 堆栈实例
   */
  function createTokenCollectionStack () {
    const stack = {
      items: []
    }

    /**
     * @description 将 Token 对象压入栈顶
     * @param {object} token - Token 对象
     */
    stack.push = function (token) {
      this.items.push(token)
    }

    /**
     * @description 弹出栈顶 Token，同时使用同类型但 subtype 为 'stop' 创建新 Token，并返回它
     * @param {string} [name=''] - 指定返回 Token 的文本值（默认空）
     * @returns {object} 子类型为 'stop' 的新 Token
     */
    stack.pop = function (name = '') {
      const token = this.items.pop()
      return { value: name, type: token.type, subtype: 'stop' }
    }

    /**
     * @description 查看栈顶 Token 对象，但不弹出
     * @returns {object|null} 顶部 Token 或 null（空栈）
     */
    stack.token = function () {
      return this.items.length > 0 ? this.items[this.items.length - 1] : null
    }

    /**
     * @description 获取栈顶 Token 的文本值
     * @returns {string}
     */
    stack.value = function () {
      const currentToken = this.token()
      return currentToken ? currentToken.value.toString() : ''
    }

    /**
     * @description 获取栈顶 Token 的类型
     * @returns {string}
     */
    stack.type = function () {
      const currentToken = this.token()
      return currentToken ? currentToken.type.toString() : ''
    }

    /**
     * @description 获取栈顶 Token 的子类型
     * @returns {string}
     */
    stack.subtype = function () {
      const currentToken = this.token()
      return currentToken ? currentToken.subtype.toString() : ''
    }

    return stack
  }

  /**
   * @description 词法分析器：将原始公式字符串分解为 Token 集合
   * @param {string} innerFormula - 需分词处理的公式字符串
   * @returns {object} 完整处理后二次过滤后的 Token 集合
   */

  const getTokens = innerFormula => {
    const tokens = createTokenCollection()
    const tokenStack = createTokenCollectionStack()

    let offset = 0
    let token = ''
    let inString = false
    let inPath = false
    let inRange = false
    let inError = false

    let formulaStr = innerFormula

    // 判断是否结束
    const EOF = () => offset >= formulaStr.length
    // 当前字符
    const currentChar = () => formulaStr.substring(offset, offset + 1)
    // 当前位置的双字符
    const doubleChar = () => formulaStr.substring(offset, offset + 2)
    // 下一个字符
    const nextChar = () => formulaStr.substring(offset + 1, offset + 2)

    // 初步分词，按符号语法切分
    while (!EOF()) {
      if (inString) {
        if (currentChar() === '"') {
          if (nextChar() === '"') {
            // 引号转义
            token += '"'
            offset += 1
          } else {
            inString = false
            tokens.add(token, 'operand', 'text')
            token = ''
          }
        } else {
          token += currentChar()
        }
        offset += 1
        continue
      }

      // 处理工作表路径（单引号引用）
      if (inPath) {
        if (currentChar() === "'") {
          if (nextChar() === "'") {
            token += "'"
            offset += 1
          } else {
            inPath = false
            token += "'"
          }
        } else {
          token += currentChar()
        }
        offset += 1
        continue
      }

      // 处理数组引用（方括号）
      if (inRange) {
        if (currentChar() === ']') {
          inRange = false
        }
        token += currentChar()
        offset += 1
        continue
      }

      // 处理错误值
      if (inError) {
        token += currentChar()
        offset += 1
        if (errorValues.indexOf(',' + token + ',') !== -1) {
          inError = false
          tokens.add(token, 'operand', 'error')
          token = ''
        }
        continue
      }

      // 科学计数法连写处理
      if ('+-'.indexOf(currentChar()) !== -1) {
        if (token.length > 1 && token.match(regexPreExponent)) {
          token += currentChar()
          offset += 1
          continue
        }
      }

      // 字符串开始
      if (currentChar() === '"') {
        if (token.length > 0) {
          tokens.add(token, 'unknown')
          token = ''
        }
        inString = true
        offset += 1
        continue
      }

      // 路径（单引号引用）开始
      if (currentChar() === "'") {
        if (token.length > 0) {
          tokens.add(token, 'unknown')
          token = ''
        }
        token = "'"
        inPath = true
        offset += 1
        continue
      }

      // 区域（左方括号）
      if (currentChar() === '[') {
        inRange = true
        token += currentChar()
        offset += 1
        continue
      }

      // 错误值开始（#）
      if (currentChar() === '#') {
        if (token.length > 0) {
          tokens.add(token, 'unknown')
          token = ''
        }
        inError = true
        token += currentChar()
        offset += 1
        continue
      }

      // 数组常量（左花括号）
      if (currentChar() === '{') {
        if (token.length > 0) {
          tokens.add(token, 'unknown')
          token = ''
        }
        tokenStack.push(tokens.add('ARRAY', 'function', 'start'))
        tokenStack.push(tokens.add('ARRAYROW', 'function', 'start'))
        offset += 1
        continue
      }

      // 数组行分隔符（;）
      if (currentChar() === ';') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.add(';', 'argument')
        offset += 1
        continue
      }

      // 数组常量结束（右花括号）
      if (currentChar() === '}') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.addRef(tokenStack.pop('ARRAYROWSTOP'))
        tokens.addRef(tokenStack.pop('ARRAYSTOP'))
        offset += 1
        continue
      }

      // 空格作为 Token
      if (currentChar() === ' ') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.add('', 'white-space')
        offset += 1
        while (currentChar() === ' ' && !EOF()) {
          offset += 1
        }
        continue
      }

      // 两字符运算符（如 >= <= <>）
      if (',>=,<=,<>,'.indexOf(',' + doubleChar() + ',') !== -1) {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.add(doubleChar(), 'operator-infix', 'logical')
        offset += 2
        continue
      }

      // 一字符中缀运算符
      if ('+-*/^&=><'.indexOf(currentChar()) !== -1) {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.add(currentChar(), 'operator-infix')
        offset += 1
        continue
      }

      // 百分号（后缀运算符）
      if (currentChar() === '%') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.add(currentChar(), 'operator-postfix')
        offset += 1
        continue
      }

      // 函数/子表达式起始（左括号）
      if (currentChar() === '(') {
        if (token.length > 0) {
          tokenStack.push(tokens.add(token, 'function', 'start'))
          token = ''
        } else {
          tokenStack.push(tokens.add('', 'subexpression', 'start'))
        }
        offset += 1
        continue
      }

      // 参数分隔（逗号）
      if (currentChar() === ',') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        if (tokenStack.type() !== 'function') {
          tokens.add(currentChar(), 'operator-infix', 'union')
        } else {
          tokens.add(currentChar(), 'argument')
        }
        offset += 1
        continue
      }

      // 子表达式/函数结束（右括号）
      if (currentChar() === ')') {
        if (token.length > 0) {
          tokens.add(token, 'operand')
          token = ''
        }
        tokens.addRef(tokenStack.pop())
        offset += 1
        continue
      }

      // 默认拼接字符
      token += currentChar()
      offset += 1
    }

    // 输入末尾残余处理
    if (token.length > 0 || inString || inPath || inRange || inError) {
      if (inString || inPath || inRange || inError) {
        if (inString) token = '"' + token
        if (inPath) token = "'" + token
        if (inRange) token = '[' + token
        if (inError) token = '#' + token
        tokens.add(token, 'unknown')
      } else {
        tokens.add(token, 'operand')
      }
    }

    // 处理空格/交集
    const tokens2 = createTokenCollection()
    tokens.reset()

    while (tokens.moveNext()) {
      let currentToken = tokens.current()

      if (currentToken.type === 'white-space') {
        let doAddToken = false
        if (!tokens.BOF() && !tokens.EOF()) {
          const prev = tokens.previous()
          const next = tokens.next()
          if (((prev.type === 'function' && prev.subtype === 'stop') || (prev.type === 'subexpression' && prev.subtype === 'stop') || prev.type === 'operand') && ((next.type === 'function' && next.subtype === 'start') || (next.type === 'subexpression' && next.subtype === 'start') || next.type === 'operand')) {
            doAddToken = true
          }
        }
        if (doAddToken) {
          tokens2.add(currentToken.value, 'operator-infix', 'intersect')
        }
        continue
      }

      tokens2.addRef(currentToken)
    }

    // 一元运算修正、无效 Token 清理、类型调整
    const finalTokens = createTokenCollection()
    tokens2.reset()

    while (tokens2.moveNext()) {
      let token = tokens2.current()

      // 处理 - 作为一元前缀
      if (token.type === 'operator-infix' && token.value === '-') {
        if (tokens2.BOF()) {
          token.type = 'operator-prefix'
        } else {
          const prev = tokens2.previous()
          if ((prev.type === 'function' && prev.subtype === 'stop') || (prev.type === 'subexpression' && prev.subtype === 'stop') || prev.type === 'operator-postfix' || prev.type === 'operand') {
            token.subtype = 'math'
          } else {
            token.type = 'operator-prefix'
          }
        }
      } else if (token.type === 'operator-infix' && token.value === '+') {
        if (tokens2.BOF()) {
          token.type = 'noop'
        } else {
          const prev = tokens2.previous()
          if ((prev.type === 'function' && prev.subtype === 'stop') || (prev.type === 'subexpression' && prev.subtype === 'stop') || prev.type === 'operator-postfix' || prev.type === 'operand') {
            token.subtype = 'math'
          } else {
            token.type = 'noop'
          }
        }
      } else if (token.type === 'operator-infix' && token.subtype.length === 0) {
        if ('<>='.indexOf(token.value.substring(0, 1)) !== -1) {
          token.subtype = 'logical'
        } else if (token.value === '&') {
          token.subtype = 'concatenate'
        } else {
          token.subtype = 'math'
        }
      } else if (token.type === 'operand' && token.subtype.length === 0) {
        if (isNaN(parseFloat(token.value))) {
          if (token.value === 'TRUE' || token.value === 'FALSE') {
            token.subtype = 'logical'
          } else {
            token.subtype = 'range'
          }
        } else {
          token.subtype = 'number'
        }
      } else if (token.type === 'function' && token.value.startsWith('@')) {
        token.value = token.value.substring(1)
      }

      if (token.type !== 'noop') {
        finalTokens.addRef(token)
      }
    }

    finalTokens.reset()
    return finalTokens
  }

  /**
   * @description 将某个 Token 按缩进规则格式化为字符串
   * @param {object} token - 当前要处理的 Token 对象
   * @param {string} indent - 当前应应用的缩进字符串
   * @param {string} lineBreak - 当前应应用的换行符
   * @param {object} lastToken - 上一个 Token 对象
   * @param {boolean} inArray - 是否处于数组（花括号）内部
   * @returns {string} 格式化后该 Token 的字符串
   */
  const applyTokenTemplate = (token, indent, lineBreak, lastToken, inArray) => {
    const indt = indent

    // 根据类型和子类型决定实际内容格式
    let tokenString
    if (token.subtype === 'text' || token.type === 'text') {
      tokenString = token.value
    } else if (token.type === 'operand' && token.subtype === 'range') {
      tokenString = token.value
    } else {
      tokenString = (token.value.length === 0 ? ' ' : token.value).split(' ').join('')
    }

    // 如果在数组内部，处理逗号/分号
    if (inArray) {
      if (token.value === ',') {
        return ', '
      }
      if (token.value === ';') {
        return ';\n'
      }
    }
    switch (token.type) {
      case 'function':
        switch (token.value) {
          case 'ARRAY':
            return ''
          case 'ARRAYROW':
            return indt + '{\n'
          case 'ARRAYROWSTOP':
            return '\n' + indt + '}'
          case 'ARRAYSTOP':
            return ''
          default:
            if (token.subtype === 'start') {
              return indt + tokenString + '(\n'
            } else {
              return '\n' + indt + tokenString + ')'
            }
        }

      case 'operand':
        switch (token.subtype) {
          case 'error':
            return ' ' + tokenString
          case 'range':
            return indt + tokenString
          case 'logical':
            return indt + tokenString
          case 'number':
            return indt + tokenString
          case 'text':
            return indt + '"' + tokenString + '"'
          case 'argument':
            return tokenString + '\n'
        }
        break

      case 'operator-infix':
        return ' ' + tokenString + lineBreak

      case 'logical':
        return tokenString + lineBreak

      case 'argument':
        if (lastToken && lastToken.type !== 'argument') {
          return tokenString + '\n'
        } else {
          return indt + tokenString + '\n'
        }

      case 'subexpression':
        if (token.subtype === 'start') {
          return indt + '(\n'
        } else {
          return '\n' + indt + ')'
        }
    }

    return ''
  }

  // 检查输入有效性
  if (typeof formula !== 'string' || formula.length === 0) {
    return ''
  }

  // 去除公式开头等号及多余空格
  let formulaStr = formula.replace(/^\s*=\s+/, '=')
  if (formulaStr.startsWith('=')) {
    formulaStr = formulaStr.substring(1).trim()
  }

  // 初始化缩进层级
  let indentCount = 0

  /**
   * @description 生成当前层级的缩进字符串
   * @returns {string} 例如: ''、'    '、'        ' 等
   */
  const indent = () => {
    let s = ''
    for (let i = 0; i < indentCount; i += 1) {
      s += '    '
    }
    return s
  }

  // 分析公式得到 Token 列表
  const tokens = getTokens(formulaStr)
  let outputFormula = ''
  let isNewLine = true
  let lastToken = null

  // 需要换行的 Token 类型集合
  const autoBreakSet = new Set(['function', 'argument', 'logical', 'operator-infix'])

  /**
   * @description 判断下一个 Token 是否需要自动换行
   * @param {object} nextToken - 下一个 Token
   * @returns {boolean}
   */
  const testAutoBreak = nextToken => {
    if (!nextToken) return false
    return autoBreakSet.has(nextToken.type) || autoBreakSet.has(nextToken.subtype)
  }

  // 匹配结尾换行的正则
  const matchEndNewLine = /\n$/
  // 标记当前是否处于数组花括号 {} 内部
  let inArray = false

  // 遍历所有 Token 并组装格式化字符串
  // 遍历所有 Token 并组装格式化字符串
  while (tokens.moveNext()) {
    const token = tokens.current()
    const nextToken = tokens.next()

    // --- 新增：判断当前是否是“空括号”结构的起始 ---
    const isEmptyPair = token.subtype === 'start' && nextToken && nextToken.subtype === 'stop'

    // 如果当前 Token 是结束（stop），且它不是空括号的一部分，则缩进层级减少
    // 如果是空括号的结束，由于开始时没加缩进，这里也不减
    if (token.subtype === 'stop' && !(tokens.previous() && tokens.previous().subtype === 'start')) {
      indentCount -= indentCount > 0 ? 1 : 0
    }

    // 数组状态标记
    if (token.type === 'function' && token.value === 'ARRAYROW' && token.subtype === 'start') {
      inArray = true
    }
    if (token.type === 'function' && token.value === 'ARRAYROWSTOP') {
      inArray = false
    }

    // --- 修正：判断是否需要自动换行 ---
    // 如果是空括号对的起始，或者当前是空括号对的结束，则不触发换行
    const autoBreak = isEmptyPair ? false : testAutoBreak(nextToken)

    // 如果是空括号对的结束，不需要新行缩进
    const indt = isNewLine ? indent() : token.subtype === 'stop' && tokens.previous().subtype === 'start' ? '' : ' '

    // --- 修正：处理空括号的显示格式 ---
    let tokenStringOutput = ''
    if (isEmptyPair) {
      // 如果是空括号起始，直接输出 "ROW(" 这种形式，且不换行
      tokenStringOutput = token.type === 'function' ? indent() + token.value + '(' : indent() + '('
    } else if (token.subtype === 'stop' && tokens.previous() && tokens.previous().subtype === 'start') {
      // 如果是紧跟在 start 后的 stop，直接输出 ")"
      tokenStringOutput = ')'
    } else {
      // 正常逻辑
      const lineBreak = autoBreak ? '\n' : ''
      tokenStringOutput = applyTokenTemplate(token, indt, lineBreak, lastToken, inArray)
    }

    outputFormula += tokenStringOutput

    // 如果当前 Token 是某结构开始，且不是空括号，缩进层级加一
    if (token.subtype === 'start' && !isEmptyPair) {
      indentCount += 1
    }

    // 更新下一行的状态
    isNewLine = autoBreak || matchEndNewLine.test(outputFormula)
    lastToken = token
  }

  // 去除首尾多余空白
  outputFormula = outputFormula.trim()
  // 格式化 & 运算符，两端去除多余空格
  outputFormula = outputFormula.replace(/\s*&\s*/g, '&')

  // 返回最终格式化结果
  return `=${outputFormula}`
}
