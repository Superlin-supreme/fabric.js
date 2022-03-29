/**
 * 主要是和键盘相关的交互操作处理
 */
fabric.util.object.extend(fabric.IText.prototype, /** @lends fabric.IText.prototype */ {

  /**
   * Initializes hidden textarea (needed to bring up keyboard in iOS)
   * 初始化隐藏的 textarea 元素
   * 用来唤起键盘，而且输入法会跟着文本
   * 这就能解释为啥要跟着文本了
   */
  initHiddenTextarea: function() {
    // 创建元素
    this.hiddenTextarea = fabric.document.createElement('textarea');
    // 设置标签属性
    this.hiddenTextarea.setAttribute('autocapitalize', 'off');
    this.hiddenTextarea.setAttribute('autocorrect', 'off');
    this.hiddenTextarea.setAttribute('autocomplete', 'off');
    this.hiddenTextarea.setAttribute('spellcheck', 'false');
    this.hiddenTextarea.setAttribute('data-fabric-hiddentextarea', '');
    this.hiddenTextarea.setAttribute('wrap', 'off');
    var style = this._calcTextareaPosition();
    // line-height: 1px; was removed from the style to fix this:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=870966
    // 设置样式
    // this.hiddenTextarea.style.cssText = 'position: absolute; top: ' + style.top +
    // '; left: ' + style.left + '; z-index: -999; opacity: 0; width: 1px; height: 1px; font-size: 1px;' +
    // ' paddingｰtop: ' + style.fontSize + ';';
    // 搞大一点看看
    this.hiddenTextarea.style.cssText = 'position: absolute; top: ' + style.top +
    '; left: ' + style.left + '; z-index: 999; opacity: 1; width: 85px; height: 55px; font-size: 12px;' +
    ' paddingｰtop: ' + style.fontSize + ';';

    if (this.hiddenTextareaContainer) {
      this.hiddenTextareaContainer.appendChild(this.hiddenTextarea);
    }
    else {
      fabric.document.body.appendChild(this.hiddenTextarea);
    }

    // 注册 textarea 事件监听
    fabric.util.addListener(this.hiddenTextarea, 'keydown', this.onKeyDown.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'keyup', this.onKeyUp.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'input', this.onInput.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'copy', this.copy.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'cut', this.copy.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'paste', this.paste.bind(this));
    // 处理输入法的输入合成，参考 mdn：https://developer.mozilla.org/zh-CN/docs/Web/API/CompositionEvent
    fabric.util.addListener(this.hiddenTextarea, 'compositionstart', this.onCompositionStart.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'compositionupdate', this.onCompositionUpdate.bind(this));
    fabric.util.addListener(this.hiddenTextarea, 'compositionend', this.onCompositionEnd.bind(this));

    // 交互层画布点击事件绑定
    if (!this._clickHandlerInitialized && this.canvas) {
      fabric.util.addListener(this.canvas.upperCanvasEl, 'click', this.onClick.bind(this));
      this._clickHandlerInitialized = true;
    }
  },

  /**
   * For functionalities on keyDown
   * Map a special key to a function of the instance/prototype
   * If you need different behaviour for ESC or TAB or arrows, you have to change
   * this map setting the name of a function that you build on the fabric.Itext or
   * your prototype.
   * the map change will affect all Instances unless you need for only some text Instances
   * in that case you have to clone this object and assign your Instance.
   * this.keysMap = fabric.util.object.clone(this.keysMap);
   * The function must be in fabric.Itext.prototype.myFunction And will receive event as args[0]
   * 9 -> Tab key
   * 27 -> Escape key
   * 33 -> Page Up key
   * 34 -> Page Down key
   * 35 -> End key
   * 36 -> Home key
   * 37 -> Left arrow
   * 38 -> Up arrow
   * 39 -> Right arrow
   * 40 -> Down arrow
   */
  keysMap: {
    9:  'exitEditing',
    27: 'exitEditing',
    33: 'moveCursorUp',
    34: 'moveCursorDown',
    35: 'moveCursorRight',
    36: 'moveCursorLeft',
    37: 'moveCursorLeft',
    38: 'moveCursorUp',
    39: 'moveCursorRight',
    40: 'moveCursorDown',
  },

  keysMapRtl: {
    9:  'exitEditing',
    27: 'exitEditing',
    33: 'moveCursorUp',
    34: 'moveCursorDown',
    35: 'moveCursorLeft',
    36: 'moveCursorRight',
    37: 'moveCursorRight',
    38: 'moveCursorUp',
    39: 'moveCursorLeft',
    40: 'moveCursorDown',
  },

  /**
   * For functionalities on keyUp + ctrl || cmd
   */
  ctrlKeysMapUp: {
    67: 'copy',
    88: 'cut'
  },

  /**
   * For functionalities on keyDown + ctrl || cmd
   */
  ctrlKeysMapDown: {
    65: 'selectAll' // 按键 A
  },

  onClick: function() {
    // No need to trigger click event here, focus is enough to have the keyboard appear on Android
    this.hiddenTextarea && this.hiddenTextarea.focus();
  },

  /**
   * Handles keydown event
   * only used for arrows and combination of modifier keys.
   * @param {Event} e Event object
   */
  onKeyDown: function(e) {
    console.log('[onKeyDown] emit');
    if (!this.isEditing) {
      return;
    }
    // 文本方向会影响光标移动
    var keyMap = this.direction === 'rtl' ? this.keysMapRtl : this.keysMap;
    // keyCode 是已移除的标准，可以考虑改写，参考 mdn: https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/keyCode
    if (e.keyCode in keyMap) {
      // 触发对应功能键的事件
      this[keyMap[e.keyCode]](e);
    }
    // 快捷键：选中全部 crtl + A / command + A
    else if ((e.keyCode in this.ctrlKeysMapDown) && (e.ctrlKey || e.metaKey)) {
      this[this.ctrlKeysMapDown[e.keyCode]](e);
    }
    else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    // 功能键：上下左右
    if (e.keyCode >= 33 && e.keyCode <= 40) {
      // if i press an arrow key just update selection
      this.inCompositionMode = false;
      this.clearContextTop();
      this.renderCursorOrSelection();
    }
    else {
      // 重绘画布
      this.canvas && this.canvas.requestRenderAll();
    }
  },

  /**
   * Handles keyup event
   * We handle KeyUp because ie11 and edge have difficulties copy/pasting
   * if a copy/cut event fired, keyup is dismissed
   * 因为 ie11 和 edge 在复制和剪切上有问题
   * 如果复制和剪切事件触发了，keyup 处理取消
   * @param {Event} e Event object
   */
  onKeyUp: function(e) {
    // 非编辑装填
    // 正在编辑
    // inCompositionMode
    if (!this.isEditing || this._copyDone || this.inCompositionMode) {
      this._copyDone = false;
      return;
    }
    // 复制键 / 剪切键
    if ((e.keyCode in this.ctrlKeysMapUp) && (e.ctrlKey || e.metaKey)) {
      this[this.ctrlKeysMapUp[e.keyCode]](e);
    }
    else {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();
    this.canvas && this.canvas.requestRenderAll();
  },

  /**
   * Handles onInput event
   * 处理输入事件
   * @param {Event} e Event object
   */
  onInput: function(e) {
    console.log('[onInput] emit');
    // 新插入的文本是否来自粘贴
    var fromPaste = this.fromPaste;
    // console.log('[onInput] this.fromPaste: ', this.fromPaste);
    this.fromPaste = false;
    e && e.stopPropagation();
    if (!this.isEditing) {
      return;
    }
    // decisions about style changes.
    var nextText = this._splitTextIntoLines(this.hiddenTextarea.value).graphemeText,
        charCount = this._text.length, // 当前文本长度
        nextCharCount = nextText.length, // 新文本长度
        removedText, insertedText, // 要移除的文本，插入的文本
        charDiff = nextCharCount - charCount, // 新旧文本长度差
        selectionStart = this.selectionStart, selectionEnd = this.selectionEnd,
        selection = selectionStart !== selectionEnd, // 判断是否是选区，决定输入操作结果
        copiedStyle, removeFrom, removeTo;

    // console.log('[onInput] this.hiddenTextarea.value', this.hiddenTextarea.value);
    // console.log('[onInput] this._text: ', this._text);
    // console.log('[onInput] nextText', nextText);
    // console.log('[onInput] charDiff', charDiff);
    // console.log('[onInput] this.selectionStart', this.selectionStart);
    // console.log('[onInput] this.selectionEnd', this.selectionEnd);

    // 空文本
    if (this.hiddenTextarea.value === '') {
      this.styles = { };
      // @ToRead
      this.updateFromTextArea();
      this.fire('changed');
      if (this.canvas) {
        this.canvas.fire('text:changed', { target: this });
        this.canvas.requestRenderAll();
      }
      return;
    }

    // 获取文本选区
    var textareaSelection = this.fromStringToGraphemeSelection(
      this.hiddenTextarea.selectionStart,
      this.hiddenTextarea.selectionEnd,
      this.hiddenTextarea.value
    );
    // console.log('[onInput] this.hiddenTextarea.selectionStart: ', this.hiddenTextarea.selectionStart);
    // console.log('[onInput] this.hiddenTextarea.selectionEnd: ', this.hiddenTextarea.selectionEnd);
    // console.log('[onInput] textareaSelection: ', textareaSelection);

    // 判断是 backDelete 退格还是 forwardDelete 反退格
    var backDelete = selectionStart > textareaSelection.selectionStart;

    console.log('[onInput] selection: ', selection);
    if (selection) {
      // 取出选区里移除的文本
      removedText = this._text.slice(selectionStart, selectionEnd);
      // 更新新旧文本长度差
      charDiff += selectionEnd - selectionStart;
      console.log('[onInput] removedText: ', removedText);
      console.log('[onInput] charDiff: ', charDiff);
    }
    // 文本变少
    else if (nextCharCount < charCount) {
      // 退格、撤销都会走这里
      if (backDelete) {
        // console.log('[onInput] backDelete selectionEnd + charDiff: ', selectionEnd + charDiff);
        // console.log('[onInput] backDelete selectionEnd: ', selectionEnd);
        removedText = this._text.slice(selectionEnd + charDiff, selectionEnd);
      }
      else {
        /**
         * 这是哪种情况
         * 猜测是 insert 键，可以向后删除文字，但是待验证，mac 没得 insert 键
         * insert 键的意义: https://www.zhihu.com/question/27241054
         * macOS 没有intert键？: https://www.zhihu.com/question/43150799
         * 读完后面那条注释可以理解，是 forwardDelete，mac 上是 fn + delete
         */
        // console.log('[onInput] forwardDelete');
        removedText = this._text.slice(selectionStart, selectionStart - charDiff);
      }
    }
    // 获取插入的文本
    insertedText = nextText.slice(textareaSelection.selectionEnd - charDiff, textareaSelection.selectionEnd);
    // console.log('[onInput] insertedText: ', insertedText);
    if (removedText && removedText.length) {
      if (insertedText.length) {
        // let's copy some style before deleting.
        // we want to copy the style before the cursor OR the style at the cursor if selection
        // is bigger than 0.
        // 在删除前，处理下样式
        copiedStyle = this.getSelectionStyles(selectionStart, selectionStart + 1, false);
        // console.log('[onInput] copiedStyle: ', copiedStyle);
        // now duplicate the style one for each inserted text.
        // 复制插入文本的样式
        copiedStyle = insertedText.map(function() {
          // this return an array of references, but that is fine since we are
          // copying the style later.
          return copiedStyle[0];
        });
      }
      if (selection) {
        removeFrom = selectionStart;
        removeTo = selectionEnd;
      }
      else if (backDelete) {
        // detect differences between forwardDelete and backDelete
        removeFrom = selectionEnd - removedText.length;
        removeTo = selectionEnd;
      }
      else {
        removeFrom = selectionEnd;
        removeTo = selectionEnd + removedText.length;
      }
      // console.log('[onInput] removeFrom, removeTo: ', removeFrom, removeTo);
      /**
       * @ToRead
       * 猜测是和删除后光标位置输入文本的样式有关
       */
      this.removeStyleFromTo(removeFrom, removeTo);
    }
    if (insertedText.length) {
      /**
       * 判断
       * 1.是否来自粘贴
       * 2.插入的文本等于复制的文本
       * 3.有无全局禁用样式复制，配置为 fabric.disableStyleCopyPaste
       */
      if (fromPaste && insertedText.join('') === fabric.copiedText && !fabric.disableStyleCopyPaste) {
        // 把样式也复制了
        copiedStyle = fabric.copiedTextStyle;
      }
      /**
       * @ToRead
       * 猜测是需要插入样式
       */
      this.insertNewStyleBlock(insertedText, selectionStart, copiedStyle);
    }
    this.updateFromTextArea();

    // 触发事件和重绘
    this.fire('changed');
    if (this.canvas) {
      this.canvas.fire('text:changed', { target: this });
      this.canvas.requestRenderAll();
    }
  },
  /**
   * Composition start
   * this.inCompositionMode 输入合成是否在进行的标记
   */
  onCompositionStart: function() {
    this.inCompositionMode = true;
  },

  /**
   * Composition end
   */
  onCompositionEnd: function() {
    console.log('onCompositionEnd emit');
    this.inCompositionMode = false;
  },

  // /**
  //  * Composition update
  //  */
  onCompositionUpdate: function(e) {
    console.log('[onCompositionUpdate] e: ', e);
    this.compositionStart = e.target.selectionStart;
    this.compositionEnd = e.target.selectionEnd;
    // console.log('[onCompositionUpdate] this.compositionStart: ', this.compositionStart);
    // console.log('[onCompositionUpdate] this.compositionEnd: ', this.compositionEnd);
    this.updateTextareaPosition();
  },

  /**
   * Copies selected text
   * @param {Event} e Event object
   */
  copy: function() {
    // 当前没有选区的话不进行复制操作
    if (this.selectionStart === this.selectionEnd) {
      //do not cut-copy if no selection
      return;
    }

    // 获取选区中的文字
    fabric.copiedText = this.getSelectedText();
    if (!fabric.disableStyleCopyPaste) {
      // 获取复制的字体样式，存下来
      fabric.copiedTextStyle = this.getSelectionStyles(this.selectionStart, this.selectionEnd, true);
    }
    else {
      fabric.copiedTextStyle = null;
    }

    // 复制完成标记
    this._copyDone = true;
  },

  /**
   * Pastes text
   * 粘贴文本
   * @param {Event} e Event object
   */
  paste: function() {
    // 设置粘贴标记
    this.fromPaste = true;
    console.log('[paste] this.fromPaste: ', this.fromPaste);
  },

  /**
   * @private
   * @param {Event} e Event object
   * @return {Object} Clipboard data object
   */
  _getClipboardData: function(e) {
    return (e && e.clipboardData) || fabric.window.clipboardData;
  },

  /**
   * Finds the width in pixels before the cursor on the same line
   * 计算光标距离图层左侧的距离
   * @private
   * @param {Number} lineIndex
   * @param {Number} charIndex
   * @return {Number} widthBeforeCursor width before cursor
   */
  _getWidthBeforeCursor: function(lineIndex, charIndex) {
    var widthBeforeCursor = this._getLineLeftOffset(lineIndex), bound;
    // console.log('[_getWidthBeforeCursor] widthBeforeCursor: ', widthBeforeCursor);

    if (charIndex > 0) {
      // 只要获取光标前的一个字符的位置信息，加上 LineLeftOffset 即可得到结果
      bound = this.__charBounds[lineIndex][charIndex - 1];
      // console.log(`[_getWidthBeforeCursor] bound[${lineIndex}][${charIndex - 1}]: `, bound);
      widthBeforeCursor += bound.left + bound.width;
    }
    return widthBeforeCursor;
  },

  /**
   * Gets start offset of a selection
   * 计算 下移后的光标 与 当前光标 位置下标偏差
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  getDownCursorOffset: function(e, isRight) {
    var selectionProp = this._getSelectionForOffset(e, isRight),
        cursorLocation = this.get2DCursorLocation(selectionProp),
        lineIndex = cursorLocation.lineIndex;
    // console.log('[getDownCursorOffset] this.selectionStart: ', this.selectionStart);
    // console.log('[getDownCursorOffset] this.selectionEnd: ', this.selectionEnd);
    console.log('[getDownCursorOffset] selectionProp: ', selectionProp);
    console.log('[getDownCursorOffset] this._text.length: ', this._text.length);
    // if on last line, down cursor goes to end of line
    if (lineIndex === this._textLines.length - 1 || e.metaKey || e.keyCode === 34) {
      // move to the end of a text
      // 当前是选区的情况计算错了
      return this._text.length - selectionProp;
    }
    var charIndex = cursorLocation.charIndex,
        widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
        indexOnOtherLine = this._getIndexOnLine(lineIndex + 1, widthBeforeCursor),
        textAfterCursor = this._textLines[lineIndex].slice(charIndex);
    /**
     * 当前光标所在位置后面有多少字符 + 下移后光标所在字符的下标 + (1 + 1)
     */
    return textAfterCursor.length + indexOnOtherLine + 1 + this.missingNewlineOffset(lineIndex);
  },

  /**
   * private
   * Helps finding if the offset should be counted from Start or End
   * 判断光标偏移位置计算的 参考点
   * 如果只是移动光标，就是下标位置
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  _getSelectionForOffset: function(e, isRight) {
    if (e.shiftKey && this.selectionStart !== this.selectionEnd && isRight) {
      return this.selectionEnd;
    }
    else {
      return this.selectionStart;
    }
  },

  /**
   * 计算 上移后的光标 与 当前光标 位置下标偏差
   * @param {Event} e Event object
   * @param {Boolean} isRight
   * @return {Number}
   */
  getUpCursorOffset: function(e, isRight) {
    // console.log('[getUpCursorOffset] isRight: ', isRight);
    var selectionProp = this._getSelectionForOffset(e, isRight),
        cursorLocation = this.get2DCursorLocation(selectionProp),
        lineIndex = cursorLocation.lineIndex;
    // console.log('[getUpCursorOffset] this.selectionStart: ', this.selectionStart);
    // console.log('[getUpCursorOffset] this.selectionEnd: ', this.selectionEnd);
    // console.log('[getUpCursorOffset] cursorLocation: ', cursorLocation);
    /**
     * 有几种种情况光标会回到开头
     * 1.当前在第一行 + up
     * 2.command + up
     * 3.pgUp
     * 
     * metaKey 在 windows 系统中为 Windows 键
     * 而 Windows + up / down 是将窗口最大化和最小化的快捷键
     */
    if (lineIndex === 0 || e.metaKey || e.keyCode === 33) {
      // if on first line, up cursor goes to start of line
      return -selectionProp;
    }
    var charIndex = cursorLocation.charIndex,
        widthBeforeCursor = this._getWidthBeforeCursor(lineIndex, charIndex),
        indexOnOtherLine = this._getIndexOnLine(lineIndex - 1, widthBeforeCursor),
        textBeforeCursor = this._textLines[lineIndex].slice(0, charIndex),
        missingNewlineOffset = this.missingNewlineOffset(lineIndex - 1);
    // console.log('[getUpCursorOffset] this._textLines[' + (lineIndex - 1) + '].length', this._textLines[lineIndex - 1].length)
    // console.log('[getUpCursorOffset] indexOnOtherLine', indexOnOtherLine)
    // console.log('[getUpCursorOffset] textBeforeCursor', textBeforeCursor)
    // console.log('[getUpCursorOffset] missingNewlineOffset', missingNewlineOffset)
    /**
     * @ToRead missingNewlineOffset 是啥作用
     * - 上一行的字符数 + 上移后光标所在字符的下标 - 当前光标所在位置前面有多少字符 + (1 - 1)
     */
    // return a negative offset 返回偏移量为负数
    return -this._textLines[lineIndex - 1].length
     + indexOnOtherLine - textBeforeCursor.length + (1 - missingNewlineOffset);
  },

  /**
   * for a given width it founds the matching character.
   * 用于光标上移/下移后，出现在上一行/下一行的位置
   * 根据宽度在给定的一行里匹配字符，返回字符下标
   * @private
   */
  _getIndexOnLine: function(lineIndex, width) {

    var line = this._textLines[lineIndex],
        lineLeftOffset = this._getLineLeftOffset(lineIndex),
        widthOfCharsOnLine = lineLeftOffset,
        indexOnLine = 0, charWidth, foundMatch;

    // 复杂度 O(n)
    for (var j = 0, jlen = line.length; j < jlen; j++) {
      charWidth = this.__charBounds[lineIndex][j].width;
      widthOfCharsOnLine += charWidth;
      if (widthOfCharsOnLine > width) {
        foundMatch = true;
        // Edge 边缘、临界点，字符边界吧
        var leftEdge = widthOfCharsOnLine - charWidth,
            rightEdge = widthOfCharsOnLine,
            offsetFromLeftEdge = Math.abs(leftEdge - width),
            offsetFromRightEdge = Math.abs(rightEdge - width);
        // console.log('[_getIndexOnLine] leftEdge: ', leftEdge);
        // console.log('[_getIndexOnLine] rightEdge: ', rightEdge);

        // 判断 给定的位置 与 匹配到的字符 左侧还是右侧比较近
        indexOnLine = offsetFromRightEdge < offsetFromLeftEdge ? j : (j - 1);
        break;
      }
    }

    // reached end
    // 没匹配到，说明该行的宽度小于给定的宽度
    if (!foundMatch) {
      indexOnLine = line.length - 1;
    }

    return indexOnLine;
  },


  /**
   * Moves cursor down
   * 光标下移
   * @param {Event} e Event object
   */
  moveCursorDown: function(e) {
    // 边界判断：光标位于文本末尾
    if (this.selectionStart >= this._text.length && this.selectionEnd >= this._text.length) {
      return;
    }
    this._moveCursorUpOrDown('Down', e);
  },

  /**
   * Moves cursor up
   * 光标上移
   * @param {Event} e Event object
   */
  moveCursorUp: function(e) {
    // 边界判断：光标位于文本开头
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorUpOrDown('Up', e);
  },

  /**
   * Moves cursor up or down, fires the events
   * 光标上/下移
   * @param {String} direction 'Up' or 'Down'
   * @param {Event} e Event object
   */
  _moveCursorUpOrDown: function(direction, e) {
    // getUpCursorOffset
    // getDownCursorOffset
    /**
     * 影响 this._selectionDirection 的场景：
     * left / right，移动光标
     * left / right + shift，触发选区
     * click + shift，触发选区
     */
    var action = 'get' + direction + 'CursorOffset',
        offset = this[action](e, this._selectionDirection === 'right');
    // console.log('[_moveCursorUpOrDown] this._selectionDirection: ', this._selectionDirection);
    // console.log('[_moveCursorUpOrDown] action: ', action);
    console.log('[_moveCursorUpOrDown] offset: ', offset);
    if (e.shiftKey) {
      this.moveCursorWithShift(offset);
    }
    else {
      // 纯粹的光标上移和下移
      this.moveCursorWithoutShift(offset);
    }
    /**
     * @ToRead 会有等于 0 的情况吗
     */
    if (offset !== 0) {
      this.setSelectionInBoundaries();
      /**
       * 这两行的操作实际上在 _initDelayedCursor 都会执行
       * @ToRead 可以删掉这两行吗
       */
      // this.abortCursorAnimation();
      // 将光标渐变置为初始值 1，释掉也不会影响
      // this._currentCursorOpacity = 1;
      this.initDelayedCursor();
      // 更新选区和 hiddenTextarea
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  },

  /**
   * Moves cursor with shift
   * 按住 shift 移动光标
   * @param {Number} offset
   */
  moveCursorWithShift: function(offset) {
    var newSelection = this._selectionDirection === 'left'
      ? this.selectionStart + offset
      : this.selectionEnd + offset;
    this.setSelectionStartEndWithShift(this.selectionStart, this.selectionEnd, newSelection);
    return offset !== 0;
  },

  /**
   * Moves cursor up without shift
   * 用计算好的偏移量，设置新光标的位置
   * @param {Number} offset
   */
  moveCursorWithoutShift: function(offset) {
    console.log('[moveCursorWithoutShift]  current selection', this.selectionStart, this.selectionEnd);
    // fix down arrow not go to the right position
    // 在别的使用 down 键没有走到正确的位置
    // 当前在最后一行选中文本时，使用 down 键没有走到正确的位置，且 right 键失效
    this.selectionStart += offset;
    this.selectionEnd = this.selectionStart;
    // 根据 offset 正负决定向哪个方向移动
    // if (offset < 0) {
    //   this.selectionStart += offset;
    //   this.selectionEnd = this.selectionStart;
    // }
    // else {
    //   this.selectionEnd += offset;
    //   this.selectionStart = this.selectionEnd;
    // }
    console.log('[moveCursorWithoutShift] after set current selection', this.selectionStart, this.selectionEnd);
    return offset !== 0;
  },

  /**
   * Moves cursor left
   * @param {Event} e Event object
   */
  moveCursorLeft: function(e) {
    if (this.selectionStart === 0 && this.selectionEnd === 0) {
      return;
    }
    this._moveCursorLeftOrRight('Left', e);
  },

  /**
   * @private
   * @return {Boolean} true if a change happened
   */
  _move: function(e, prop, direction) {
    var newValue;
    if (e.altKey) {
      newValue = this['findWordBoundary' + direction](this[prop]);
    }
    else if (e.metaKey || e.keyCode === 35 ||  e.keyCode === 36 ) {
      newValue = this['findLineBoundary' + direction](this[prop]);
    }
    else {
      this[prop] += direction === 'Left' ? -1 : 1;
      return true;
    }
    if (typeof newValue !== undefined && this[prop] !== newValue) {
      this[prop] = newValue;
      return true;
    }
  },

  /**
   * @private
   */
  _moveLeft: function(e, prop) {
    return this._move(e, prop, 'Left');
  },

  /**
   * @private
   */
  _moveRight: function(e, prop) {
    return this._move(e, prop, 'Right');
  },

  /**
   * Moves cursor left without keeping selection
   * 纯粹地移动左移光标，不需要考虑选区
   * @param {Event} e
   */
  moveCursorLeftWithoutShift: function(e) {
    var change = true;
    // 记录移动方向
    this._selectionDirection = 'left';

    // only move cursor when there is no selection,
    // otherwise we discard it, and leave cursor on same place
    if (this.selectionEnd === this.selectionStart && this.selectionStart !== 0) {
      change = this._moveLeft(e, 'selectionStart');

    }
    this.selectionEnd = this.selectionStart;
    return change;
  },

  /**
   * Moves cursor left while keeping selection
   * @param {Event} e
   */
  moveCursorLeftWithShift: function(e) {
    // console.log('[moveCursorLeftWithShift] e: ', e);
    if (this._selectionDirection === 'right' && this.selectionStart !== this.selectionEnd) {
      return this._moveLeft(e, 'selectionEnd');
    }
    else if (this.selectionStart !== 0){
      this._selectionDirection = 'left';
      return this._moveLeft(e, 'selectionStart');
    }
  },

  /**
   * Moves cursor right
   * 光标右移
   * @param {Event} e Event object
   */
  moveCursorRight: function(e) {
    // 判断光标是否在文本末尾
    if (this.selectionStart >= this._text.length && this.selectionEnd >= this._text.length) {
      return;
    }
    this._moveCursorLeftOrRight('Right', e);
  },

  /**
   * Moves cursor right or Left, fires event
   * @param {String} direction 'Left', 'Right'
   * @param {Event} e Event object
   */
  _moveCursorLeftOrRight: function(direction, e) {
    var actionName = 'moveCursor' + direction + 'With';
    // 
    this._currentCursorOpacity = 1;

    if (e.shiftKey) {
      // shift + left / right 触发
      // moveCursorLeftWithShift
      actionName += 'Shift';
    }
    else {
      // left / right 触发
      // moveCursorLeftWithoutShift
      actionName += 'outShift';
    }
    if (this[actionName](e)) {
      this.abortCursorAnimation();
      this.initDelayedCursor();
      this._fireSelectionChanged();
      this._updateTextarea();
    }
  },

  /**
   * Moves cursor right while keeping selection
   * @param {Event} e
   */
  moveCursorRightWithShift: function(e) {
    // console.log('[moveCursorRightWithShift] e: ', e);
    if (this._selectionDirection === 'left' && this.selectionStart !== this.selectionEnd) {
      return this._moveRight(e, 'selectionStart');
    }
    else if (this.selectionEnd !== this._text.length) {
      this._selectionDirection = 'right';
      return this._moveRight(e, 'selectionEnd');
    }
  },

  /**
   * Moves cursor right without keeping selection
   * @param {Event} e Event object
   */
  moveCursorRightWithoutShift: function(e) {
    // console.log('[moveCursorRightWithoutShift] e: ', e);
    var changed = true;
    this._selectionDirection = 'right';

    if (this.selectionStart === this.selectionEnd) {
      changed = this._moveRight(e, 'selectionStart');
      this.selectionEnd = this.selectionStart;
    }
    else {
      this.selectionStart = this.selectionEnd;
    }
    return changed;
  },

  /**
   * Removes characters from start/end
   * start/end ar per grapheme position in _text array.
   *
   * @param {Number} start
   * @param {Number} end default to start + 1
   */
  removeChars: function(start, end) {
    if (typeof end === 'undefined') {
      end = start + 1;
    }
    this.removeStyleFromTo(start, end);
    this._text.splice(start, end - start);
    this.text = this._text.join('');
    this.set('dirty', true);
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this._removeExtraneousStyles();
  },

  /**
   * insert characters at start position, before start position.
   * start  equal 1 it means the text get inserted between actual grapheme 0 and 1
   * if style array is provided, it must be as the same length of text in graphemes
   * if end is provided and is bigger than start, old text is replaced.
   * start/end ar per grapheme position in _text array.
   *
   * @param {String} text text to insert
   * @param {Array} style array of style objects
   * @param {Number} start
   * @param {Number} end default to start + 1
   */
  insertChars: function(text, style, start, end) {
    if (typeof end === 'undefined') {
      end = start;
    }
    if (end > start) {
      this.removeStyleFromTo(start, end);
    }
    var graphemes = fabric.util.string.graphemeSplit(text);
    this.insertNewStyleBlock(graphemes, start, style);
    this._text = [].concat(this._text.slice(0, start), graphemes, this._text.slice(end));
    this.text = this._text.join('');
    this.set('dirty', true);
    if (this._shouldClearDimensionCache()) {
      this.initDimensions();
      this.setCoords();
    }
    this._removeExtraneousStyles();
  },

});
