export const LAYOUT = {
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

export interface Size {
    width: number;
    height: number;
}

export function tabLayout(pageCount: number, width: number): { perRow: number; rows: number; tabW: number; tabAreaH: number } {
    const inner = Math.max(1, width);
    const perRow = Math.max(1, Math.floor(inner / LAYOUT.MIN_TAB_W));
    const rows = Math.max(1, Math.ceil(pageCount / perRow));
    return {
        perRow: perRow,
        rows: rows,
        tabW: Math.floor(inner / perRow),
        tabAreaH: rows * LAYOUT.TAB_ROW_H
    };
}

export function contentViewportHeight(panelH: number, tabAreaH: number): number {
    return Math.max(10, panelH - tabAreaH);
}

export function contentWidth(panelW: number): number {
    return Math.max(10, panelW - LAYOUT.PAD_X * 2);
}

export function computeMinWindow(tabCount: number): Size {
    const issueActions = 46 + LAYOUT.GAP + 90 + LAYOUT.GAP + 46;
    const footer3 = 84 * 3 + LAYOUT.GAP * 2;
    const threeCol = 92 * 3 + LAYOUT.GAP * 2;
    const minW = Math.max(issueActions, footer3, threeCol) + LAYOUT.PAD_X * 2 + LAYOUT.SCROLLBAR_W;
    const tabsTwoRow = LAYOUT.MIN_TAB_W * Math.ceil(tabCount / 2);
    const width = Math.max(400, Math.ceil(minW), Math.min(tabsTwoRow + LAYOUT.PAD_X * 2, 480));
    const height = LAYOUT.HEADER_H + LAYOUT.TAB_ROW_H * 2 + LAYOUT.PAD_Y * 2 + 190 + LAYOUT.ISSUE_ITEM_H * 2;
    return { width: width, height: Math.max(460, Math.ceil(height)) };
}

export function computeDefaultWindow(tabCount: number): Size {
    const min = computeMinWindow(tabCount);
    const tabOneRow = tabCount * 56 + LAYOUT.PAD_X * 2;
    return {
        width: Math.max(min.width, Math.min(560, tabOneRow)),
        height: Math.max(min.height, 640)
    };
}

export function clamp(v: number, lo: number, hi: number): number {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

export function scrollMax(contentH: number, viewH: number): number {
    return Math.max(0, contentH - viewH);
}

export function clampScroll(pos: number, contentH: number, viewH: number): number {
    return clamp(pos, 0, scrollMax(contentH, viewH));
}

export function wheelToScrollDelta(mouseWheelDelta: number, step?: number): number {
    const s = step == null ? LAYOUT.SCROLL_STEP : step;
    return mouseWheelDelta * s;
}

export function thumbMetrics(viewH: number, contentH: number, pos: number, minThumb?: number): { show: boolean; thumbH: number; thumbY: number } {
    const minT = minThumb == null ? LAYOUT.MIN_THUMB : minThumb;
    if (!(contentH > viewH + 0.5) || viewH <= 0) return { show: false, thumbH: 0, thumbY: 0 };
    const thumbH = Math.max(minT, Math.min(viewH, viewH * viewH / contentH));
    const max = scrollMax(contentH, viewH);
    const track = Math.max(0, viewH - thumbH);
    const y = max <= 0 ? 0 : (clampScroll(pos, contentH, viewH) / max) * track;
    return { show: true, thumbH: thumbH, thumbY: y };
}

export function visibleIndexRange(scrollY: number, viewH: number, itemH: number, count: number, overscan?: number): { start: number; end: number } {
    const extra = overscan == null ? 2 : overscan;
    if (count <= 0 || itemH <= 0 || viewH <= 0) return { start: 0, end: 0 };
    const start = Math.max(0, Math.floor(scrollY / itemH) - extra);
    const end = Math.min(count, Math.ceil((scrollY + viewH) / itemH) + extra);
    return { start: start, end: end };
}

export function measureChildrenBottom(numChildren: number, childBottom: (i: number) => number): number {
    let maxH = 0;
    for (let i = 0; i < numChildren; i++) {
        const b = childBottom(i);
        if (b > maxH) maxH = b;
    }
    return maxH;
}
