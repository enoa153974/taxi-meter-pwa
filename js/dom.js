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



// --------------------------------------------------
// ◆ 単一要素取得
// --------------------------------------------------
/**
 * selectorに一致する最初の要素を取得
 * @param {string} selector CSSセレクタ
 * @param {ParentNode} [parent=document] 検索対象の親要素
 * @returns {Element|null} 見つからなければnull
 */
export function qs(selector, parent = document) {
    return parent.querySelector(selector);
}



// --------------------------------------------------
// ◆ 複数要素取得
// --------------------------------------------------
/**
 * selectorに一致する全要素を配列で取得
 * @param {string} selector CSSセレクタ
 * @param {ParentNode} [parent=document]
 * @returns {Element[]} 要素配列
 */
export function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
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
export function toggleClass(element, className) {
    element.classList.toggle(className);
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


