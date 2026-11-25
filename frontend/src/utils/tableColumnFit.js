import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

const DEFAULT_STICKY_RIGHT_WIDTH = 404; // 209px status right offset + 195px status width

function getMinWidth(col) {
  return col.minWidth ?? Math.max(60, Math.round(col.width * 0.78));
}

function getMaxWidth(col) {
  return col.maxWidth ?? Math.round(col.width * 1.45);
}

/**
 * Computes integer pixel column widths so the leading visible columns before the
 * sticky STATUS column fill the available viewport width cleanly without slicing
 * a column in half at the STATUS boundary.
 *
 * Expects the trailing two entries of `columnSpecs` to be STATUS and ACTIONS.
 */
export function computeFittedTableColumns(
  columnSpecs,
  containerWidth,
  stickyRightWidth = DEFAULT_STICKY_RIGHT_WIDTH
) {
  const leftCols = columnSpecs.slice(0, -2);
  const rightCols = columnSpecs.slice(-2);

  const baseWidthsByKey = {};
  let baseLeftSum = 0;
  for (const col of leftCols) {
    baseWidthsByKey[col.key] = col.width;
    baseLeftSum += col.width;
  }

  let rightColSum = 0;
  for (const col of rightCols) {
    baseWidthsByKey[col.key] = col.width;
    rightColSum += col.width;
  }

  const totalBaseWidth = baseLeftSum + rightColSum;
  const stickyVisualWidth = stickyRightWidth > 0 ? stickyRightWidth : DEFAULT_STICKY_RIGHT_WIDTH;

  if (!containerWidth || containerWidth <= stickyVisualWidth + 180) {
    return {
      widthsByKey: baseWidthsByKey,
      totalWidth: totalBaseWidth,
      fittedPrefixCount: 0,
    };
  }

  // When the whole table fits within the viewport without horizontal scrolling,
  // expand the flexible column(s) so the table cleanly fills 100% of the container.
  if (containerWidth >= totalBaseWidth) {
    const widthsByKey = { ...baseWidthsByKey };
    const extra = Math.floor(containerWidth - totalBaseWidth);
    if (extra > 0) {
      const flexCol = leftCols.find((c) => c.isFlexible) || leftCols[leftCols.length - 1];
      if (flexCol) {
        widthsByKey[flexCol.key] = flexCol.width + extra;
      }
    }
    const totalWidth = Object.values(widthsByKey).reduce((sum, w) => sum + w, 0);
    return {
      widthsByKey,
      totalWidth,
      fittedPrefixCount: leftCols.length,
    };
  }

  const visibleBudget = Math.floor(containerWidth - stickyVisualWidth);

  let bestCount = 1;
  let bestScore = Infinity;
  let foundWithinBounds = false;

  let prefixBase = 0;
  let prefixMin = 0;
  let prefixMax = 0;

  for (let i = 0; i < leftCols.length; i += 1) {
    const col = leftCols[i];
    prefixBase += col.width;
    prefixMin += getMinWidth(col);
    prefixMax += getMaxWidth(col);

    const withinBounds = visibleBudget >= prefixMin && visibleBudget <= prefixMax;
    const relativeDelta = Math.abs(visibleBudget - prefixBase) / Math.max(1, prefixBase);

    if (withinBounds) {
      if (!foundWithinBounds || relativeDelta < bestScore - 1e-6 || (Math.abs(relativeDelta - bestScore) <= 1e-6 && i + 1 > bestCount)) {
        foundWithinBounds = true;
        bestScore = relativeDelta;
        bestCount = i + 1;
      }
    } else if (!foundWithinBounds && relativeDelta < bestScore) {
      bestScore = relativeDelta;
      bestCount = i + 1;
    }
  }

  const prefix = leftCols.slice(0, bestCount);
  const adjusted = prefix.map((c) => c.width);
  const chosenBaseSum = adjusted.reduce((sum, w) => sum + w, 0);
  let remaining = visibleBudget - chosenBaseSum;

  if (remaining !== 0) {
    const isGrowing = remaining > 0;
    const weights = prefix.map((col, idx) => {
      const current = adjusted[idx];
      const limit = isGrowing ? getMaxWidth(col) : getMinWidth(col);
      const room = Math.max(0, isGrowing ? limit - current : current - limit);
      return room * Math.max(0.2, col.flex ?? 1);
    });

    let totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Fallback if target is outside strict min/max bounds
    if (totalWeight <= 0) {
      for (let idx = 0; idx < prefix.length; idx += 1) {
        weights[idx] = Math.max(1, adjusted[idx]);
      }
      totalWeight = weights.reduce((sum, w) => sum + w, 0);
    }

    const deltas = prefix.map((_, idx) => Math.trunc((remaining * weights[idx]) / totalWeight));
    for (let idx = 0; idx < prefix.length; idx += 1) {
      const next = adjusted[idx] + deltas[idx];
      if (isGrowing) {
        adjusted[idx] = Math.min(getMaxWidth(prefix[idx]), next);
      } else {
        adjusted[idx] = Math.max(60, Math.min(adjusted[idx], Math.max(getMinWidth(prefix[idx]), next)));
      }
    }

    // Reconcile rounding or clamping remainder so the prefix sums to exact visibleBudget
    let currentSum = adjusted.reduce((sum, w) => sum + w, 0);
    let diff = visibleBudget - currentSum;

    // First try distributing any remaining diff across columns with headroom
    if (diff !== 0) {
      const indices = prefix
        .map((col, idx) => ({ idx, flex: col.flex ?? 1 }))
        .sort((a, b) => b.flex - a.flex)
        .map((item) => item.idx);

      for (const idx of indices) {
        if (diff === 0) break;
        const col = prefix[idx];
        const limit = diff > 0 ? getMaxWidth(col) : getMinWidth(col);
        const maxStep = diff > 0 ? Math.max(0, limit - adjusted[idx]) : Math.max(0, adjusted[idx] - limit);
        if (maxStep > 0) {
          const step = diff > 0 ? Math.min(diff, maxStep) : -Math.min(-diff, maxStep);
          adjusted[idx] += step;
          diff -= step;
        }
      }
    }

    // Final exactness guarantee on the highest-flex column in the prefix
    if (diff !== 0 && adjusted.length > 0) {
      let bestIdx = adjusted.length - 1;
      let bestFlex = -1;
      for (let idx = 0; idx < prefix.length; idx += 1) {
        const flex = prefix[idx].flex ?? 1;
        if (flex >= bestFlex) {
          bestFlex = flex;
          bestIdx = idx;
        }
      }
      adjusted[bestIdx] = Math.max(60, adjusted[bestIdx] + diff);
    }
  }

  const widthsByKey = { ...baseWidthsByKey };
  prefix.forEach((col, idx) => {
    widthsByKey[col.key] = adjusted[idx];
  });

  const totalWidth = Object.values(widthsByKey).reduce((sum, w) => sum + w, 0);

  return {
    widthsByKey,
    totalWidth,
    fittedPrefixCount: bestCount,
  };
}

/**
 * Observes a horizontally scrollable table wrapper and keeps the columns before
 * sticky STATUS aligned to complete column boundaries.
 */
export function useFitColumnsToStatus(
  wrapperRef,
  columnSpecs,
  deps = [],
  defaultStickyRightWidth = DEFAULT_STICKY_RIGHT_WIDTH
) {
  const [metrics, setMetrics] = useState({ containerWidth: 0, stickyRightWidth: defaultStickyRightWidth });

  const measure = () => {
    const el = wrapperRef.current;
    if (!el) return;

    const containerWidth = el.clientWidth || 0;
    let stickyRightWidth = defaultStickyRightWidth;
    const statusTh = el.querySelector('th.mc-th-status, th[data-status-col="true"]');
    if (statusTh && typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const rightPx = parseFloat(window.getComputedStyle(statusTh).right);
      const statusW = statusTh.getBoundingClientRect().width;
      if (Number.isFinite(rightPx) && statusW > 0) {
        stickyRightWidth = Math.round(rightPx + statusW);
      }
    }

    setMetrics((prev) => {
      if (prev.containerWidth === containerWidth && prev.stickyRightWidth === stickyRightWidth) {
        return prev;
      }
      return { containerWidth, stickyRightWidth };
    });
  };

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;

    measure();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener('resize', measure);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useMemo(
    () => computeFittedTableColumns(columnSpecs, metrics.containerWidth, metrics.stickyRightWidth),
    [columnSpecs, metrics.containerWidth, metrics.stickyRightWidth]
  );
}
