// ==================================================
// ◆ dom.js
// DOM操作ユーティリティ集
// --------------------------------------------------
// 目的
// ・DOM取得処理の簡略化
// ・class操作の統一
// ・可読性向上
// ・再利用性UP
//
// 使用例：
// import { qs, addClass } from "./dom.js";
// ==================================================



// ==================================================
// ◆ DOM取得ユーティリティ（安全強化版）
// ==================================================

/**
 * 単一要素取得
 * 存在しなければ警告ログを出す
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element|null}
 */
export function qs(selector, parent = document) {
    const el = parent.querySelector(selector);

    if (!el) {
        console.warn(`⚠️ 要素が見つかりません → ${selector}`);
    }

    return el;
}


/**
 * 複数要素取得
 * 0件でもエラーにしない
 * @param {string} selector
 * @param {ParentNode} [parent=document]
 * @returns {Element[]}
 */
export function qsa(selector, parent = document) {
    const els = [...parent.querySelectorAll(selector)];

    if (els.length === 0) {
        console.warn(`⚠️ 要素が0件です → ${selector}`);
    }

    return els;
}


// --------------------------------------------------
// ◆ classトグル
// --------------------------------------------------
/**
 * classをON/OFF切替
 * @param {Element} element 対象要素
 * @param {string} className クラス名
 * @returns {void}
 */
export function toggleClass(element, className, force) {
    if (!element) return;
    element.classList.toggle(className, force);
}



// --------------------------------------------------
// ◆ class追加
// --------------------------------------------------
/**
 * classを追加
 * @param {Element} element
 * @param {string} className
 * @returns {void}
 */
export function addClass(element, className) {
    if (!element) return;
    element.classList.add(className);
}



// --------------------------------------------------
// ◆ class削除
// --------------------------------------------------
/**
 * classを削除
 * @param {Element} element
 * @param {string} className
 * @returns {void}
 */
export function removeClass(element, className) {
    if (!element) return;
    element.classList.remove(className);
}



// --------------------------------------------------
// ◆ class存在判定
// --------------------------------------------------
/**
 * 指定classが付いているか判定
 * @param {Element} element
 * @param {string} className
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element.classList.contains(className);
}



// --------------------------------------------------
// ◆ 要素生成
// --------------------------------------------------
/**
 * 新しいDOM要素を生成
 * @param {string} tagName 作成するタグ名
 * @param {string} [className] 付与するclass
 * @param {string} [text] textContent
 * @returns {HTMLElement}
 *
 * @example
 * const li = createElement('li','item','テキスト');
 */
export function createElement(tagName, className = '', text = '') {
    const el = document.createElement(tagName);

    if (className) el.className = className;
    if (text) el.textContent = text;

    return el;
}


