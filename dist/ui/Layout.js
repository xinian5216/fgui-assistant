"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAYOUT = void 0;
exports.tabLayout = tabLayout;
exports.contentViewportHeight = contentViewportHeight;
exports.contentWidth = contentWidth;
exports.computeMinWindow = computeMinWindow;
exports.computeDefaultWindow = computeDefaultWindow;
exports.clamp = clamp;
exports.scrollMax = scrollMax;
exports.clampScroll = clampScroll;
exports.thumbMetrics = thumbMetrics;
exports.visibleIndexRange = visibleIndexRange;
exports.measureChildrenBottom = measureChildrenBottom;
exports.LAYOUT = {
    HEADER_H: 28,
    TAB_ROW_H: 24,
    MIN_TAB_W: 48,
    PAD_X: 8,
    PAD_Y: 6,
    FOOTER_H: 34,
    SCROLLBAR_W: 7,
    SCROLL_STEP: 48,
    PAGE_STEP_RATIO: 0.9,
    ISSUE_ITEM_H: 84,
    HOME_MAX_ISSUES: 5,
    GAP: 6,
    BTN_H: 24,
    CLOSE_W: 26,
    GRIP: 14,
    MIN_THUMB: 22
};
function tabLayout(pageCount, width) {
    const inner = Math.max(1, width);
    const perRow = Math.max(1, Math.floor(inner / exports.LAYOUT.MIN_TAB_W));
    const rows = Math.max(1, Math.ceil(pageCount / perRow));
    return {
        perRow: perRow,
        rows: rows,
        tabW: Math.floor(inner / perRow),
        tabAreaH: rows * exports.LAYOUT.TAB_ROW_H
    };
}
function contentViewportHeight(panelH, tabAreaH) {
    return Math.max(10, panelH - tabAreaH);
}
function contentWidth(panelW) {
    return Math.max(10, panelW - exports.LAYOUT.PAD_X * 2);
}
function computeMinWindow(tabCount) {
    const issueActions = 46 + exports.LAYOUT.GAP + 90 + exports.LAYOUT.GAP + 46;
    const footer3 = 84 * 3 + exports.LAYOUT.GAP * 2;
    const threeCol = 92 * 3 + exports.LAYOUT.GAP * 2;
    const minW = Math.max(issueActions, footer3, threeCol) + exports.LAYOUT.PAD_X * 2 + exports.LAYOUT.SCROLLBAR_W;
    const tabsTwoRow = exports.LAYOUT.MIN_TAB_W * Math.ceil(tabCount / 2);
    const width = Math.max(400, Math.ceil(minW), Math.min(tabsTwoRow + exports.LAYOUT.PAD_X * 2, 480));
    const height = exports.LAYOUT.HEADER_H + exports.LAYOUT.TAB_ROW_H * 2 + exports.LAYOUT.PAD_Y * 2 + 190 + exports.LAYOUT.ISSUE_ITEM_H * 2;
    return { width: width, height: Math.max(460, Math.ceil(height)) };
}
function computeDefaultWindow(tabCount) {
    const min = computeMinWindow(tabCount);
    const tabOneRow = tabCount * 56 + exports.LAYOUT.PAD_X * 2;
    return {
        width: Math.max(min.width, Math.min(560, tabOneRow)),
        height: Math.max(min.height, 640)
    };
}
function clamp(v, lo, hi) {
    if (v < lo)
        return lo;
    if (v > hi)
        return hi;
    return v;
}
function scrollMax(contentH, viewH) {
    return Math.max(0, contentH - viewH);
}
function clampScroll(pos, contentH, viewH) {
    return clamp(pos, 0, scrollMax(contentH, viewH));
}
function thumbMetrics(viewH, contentH, pos, minThumb) {
    const minT = minThumb == null ? exports.LAYOUT.MIN_THUMB : minThumb;
    if (!(contentH > viewH + 0.5) || viewH <= 0)
        return { show: false, thumbH: 0, thumbY: 0 };
    const thumbH = Math.max(minT, Math.min(viewH, viewH * viewH / contentH));
    const max = scrollMax(contentH, viewH);
    const track = Math.max(0, viewH - thumbH);
    const y = max <= 0 ? 0 : (clampScroll(pos, contentH, viewH) / max) * track;
    return { show: true, thumbH: thumbH, thumbY: y };
}
function visibleIndexRange(scrollY, viewH, itemH, count, overscan) {
    const extra = overscan == null ? 2 : overscan;
    if (count <= 0 || itemH <= 0 || viewH <= 0)
        return { start: 0, end: 0 };
    const start = Math.max(0, Math.floor(scrollY / itemH) - extra);
    const end = Math.min(count, Math.ceil((scrollY + viewH) / itemH) + extra);
    return { start: start, end: end };
}
function measureChildrenBottom(numChildren, childBottom) {
    let maxH = 0;
    for (let i = 0; i < numChildren; i++) {
        const b = childBottom(i);
        if (b > maxH)
            maxH = b;
    }
    return maxH;
}
