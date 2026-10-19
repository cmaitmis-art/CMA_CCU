import React, { useRef, useState } from 'react';

/**
 * RichTextToolbar
 * A comprehensive, professional rich text editing toolbar designed for
 * ContentEditable letters & documents (WYSIWYG styling matching Word / CKEditor).
 * Crucial: all buttons & dropdowns use onMouseDown={(e) => e.preventDefault()}
 * so clicking tools never deselects the user's highlighted text in the document.
 */
export default function RichTextToolbar({ style, onCommandExecuted }) {
  const textColorInputRef = useRef(null);
  const bgColorInputRef = useRef(null);

  const [activeFontFamily, setActiveFontFamily] = useState('Times New Roman');
  const [activeFontSize, setActiveFontSize] = useState('15px');
  const [activeBlock, setActiveBlock] = useState('p');

  const exec = (cmd, val = null) => {
    try {
      document.execCommand(cmd, false, val);
      if (onCommandExecuted) onCommandExecuted(cmd, val);
    } catch (err) {
      console.warn('execCommand error:', err);
    }
  };

  const handleBlockChange = (e) => {
    const tag = e.target.value;
    setActiveBlock(tag);
    exec('formatBlock', tag);
  };

  const handleFontFamilyChange = (e) => {
    const family = e.target.value;
    setActiveFontFamily(family);
    exec('fontName', family);
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    setActiveFontSize(size);

    // Apply exact CSS font-size to selection
    exec('fontSize', '7');
    const fontEls = document.querySelectorAll('font[size="7"]');
    fontEls.forEach((el) => {
      el.removeAttribute('size');
      el.style.fontSize = size;
    });
    if (onCommandExecuted) onCommandExecuted('fontSize', size);
  };

  const handleTextColorChange = (e) => {
    const color = e.target.value;
    exec('foreColor', color);
  };

  const handleBgColorChange = (e) => {
    const color = e.target.value;
    exec('hiliteColor', color);
  };

  const btnStyle = {
    padding: '4px 7px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    color: '#334155',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    height: 26,
    transition: 'all 0.15s ease',
  };

  const selectStyle = {
    padding: '2px 6px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    fontSize: 12,
    color: '#334155',
    height: 26,
    outline: 'none',
    cursor: 'pointer',
  };

  const dividerStyle = {
    width: 1,
    height: 18,
    background: '#cbd5e1',
    margin: '0 3px',
  };

  return (
    <div
      className="cma-richtext-toolbar"
      style={{
        background: '#f1f5f9',
        border: '1px solid #cbd5e1',
        borderRadius: '6px 6px 0 0',
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Row 1: Headings/Block, Basic inline styles, Alignments, Lists, Indent */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {/* Paragraph / Heading block */}
        <select
          value={activeBlock}
          onChange={handleBlockChange}
          style={{ ...selectStyle, minWidth: 95 }}
          title="Format Block / Paragraph Style"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote Block</option>
        </select>

        <div style={dividerStyle} />

        {/* Bold */}
        <button
          type="button"
          style={{ ...btnStyle, fontWeight: 700 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('bold')}
          title="Bold (Ctrl+B)"
        >
          <i className="fas fa-bold" />
        </button>

        {/* Italic */}
        <button
          type="button"
          style={{ ...btnStyle, fontStyle: 'italic' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('italic')}
          title="Italic (Ctrl+I)"
        >
          <i className="fas fa-italic" />
        </button>

        {/* Underline */}
        <button
          type="button"
          style={{ ...btnStyle, textDecoration: 'underline' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('underline')}
          title="Underline (Ctrl+U)"
        >
          <i className="fas fa-underline" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('strikeThrough')}
          title="Strikethrough"
        >
          <i className="fas fa-strikethrough" />
        </button>

        {/* Subscript */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('subscript')}
          title="Subscript (X₂)"
        >
          <i className="fas fa-subscript" />
        </button>

        {/* Superscript */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('superscript')}
          title="Superscript (X²)"
        >
          <i className="fas fa-superscript" />
        </button>

        <div style={dividerStyle} />

        {/* Align Left */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyLeft')}
          title="Align Left"
        >
          <i className="fas fa-align-left" />
        </button>

        {/* Align Center */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyCenter')}
          title="Align Center"
        >
          <i className="fas fa-align-center" />
        </button>

        {/* Align Right */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyRight')}
          title="Align Right"
        >
          <i className="fas fa-align-right" />
        </button>

        {/* Align Justify */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('justifyFull')}
          title="Justify (Align both sides)"
        >
          <i className="fas fa-align-justify" />
        </button>

        <div style={dividerStyle} />

        {/* Bullet List */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertUnorderedList')}
          title="Bullet List"
        >
          <i className="fas fa-list-ul" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertOrderedList')}
          title="Numbered List"
        >
          <i className="fas fa-list-ol" />
        </button>

        {/* Outdent */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('outdent')}
          title="Decrease Indent"
        >
          <i className="fas fa-outdent" />
        </button>

        {/* Indent */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('indent')}
          title="Increase Indent"
        >
          <i className="fas fa-indent" />
        </button>
      </div>

      {/* Row 2: Font family, Font size, Colors, Clear format, Undo/Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {/* Font Family */}
        <select
          value={activeFontFamily}
          onChange={handleFontFamilyChange}
          style={{ ...selectStyle, minWidth: 140 }}
          title="Font Family"
        >
          <option value="Times New Roman">Times New Roman</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Garamond">Garamond</option>
          <option value="Calibri">Calibri</option>
          <option value="Segoe UI">Segoe UI</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Verdana">Verdana</option>
          <option value="Courier New">Courier New</option>
        </select>

        {/* Font Size */}
        <select
          value={activeFontSize}
          onChange={handleFontSizeChange}
          style={{ ...selectStyle, minWidth: 90 }}
          title="Font Size"
        >
          <option value="11px">11px (Tiny)</option>
          <option value="12px">12px (Small)</option>
          <option value="13px">13px (10pt)</option>
          <option value="14px">14px (10.5pt)</option>
          <option value="15px">15px (Standard)</option>
          <option value="16px">16px (12pt)</option>
          <option value="18px">18px (14pt)</option>
          <option value="20px">20px (15pt)</option>
          <option value="22px">22px (Large)</option>
          <option value="24px">24px (Title)</option>
        </select>

        <div style={dividerStyle} />

        {/* Text Color Picker */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            style={{ ...btnStyle, gap: 3 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => textColorInputRef.current && textColorInputRef.current.click()}
            title="Text Color"
          >
            <span style={{ fontWeight: 700, fontSize: 13, borderBottom: '3px solid #ef4444', lineHeight: 1 }}>A</span>
            <i className="fas fa-caret-down" style={{ fontSize: 9, opacity: 0.7 }} />
          </button>
          <input
            ref={textColorInputRef}
            type="color"
            defaultValue="#111827"
            onChange={handleTextColorChange}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          />
        </div>

        {/* Background / Highlight Color Picker */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            type="button"
            style={{ ...btnStyle, gap: 3 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => bgColorInputRef.current && bgColorInputRef.current.click()}
            title="Highlight / Background Color"
          >
            <i className="fas fa-highlighter" style={{ color: '#d97706' }} />
            <i className="fas fa-caret-down" style={{ fontSize: 9, opacity: 0.7 }} />
          </button>
          <input
            ref={bgColorInputRef}
            type="color"
            defaultValue="#fef08a"
            onChange={handleBgColorChange}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          />
        </div>

        {/* Clear Formatting */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
          title="Clear / Remove Formatting"
        >
          <i className="fas fa-eraser" />
        </button>

        {/* Horizontal Line */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('insertHorizontalRule')}
          title="Insert Horizontal Divider Line"
        >
          <i className="fas fa-minus" />
        </button>

        <div style={dividerStyle} />

        {/* Undo */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('undo')}
          title="Undo Typing (Ctrl+Z)"
        >
          <i className="fas fa-undo" />
        </button>

        {/* Redo */}
        <button
          type="button"
          style={btnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('redo')}
          title="Redo Typing (Ctrl+Y)"
        >
          <i className="fas fa-redo" />
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-pencil-alt" style={{ fontSize: 10, color: '#3b82f6' }} />
          Highlight text to format or click anywhere to type
        </span>
      </div>
    </div>
  );
}
