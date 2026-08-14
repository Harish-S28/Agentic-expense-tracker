/**
 * Interactive SVG Chart Component
 * Renders smooth bezier curves with linear gradients, tooltips, and responsive layout.
 * Shows clean empty state when no dataset is loaded.
 */

const observerMap = new WeakMap();

export function renderAreaChart(containerEl, points = [], options = {}) {
  if (!containerEl) return;

  if (!points || points.length === 0 || points.every(p => !p.expense && !p.income)) {
    containerEl.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:160px; color:var(--text-muted); text-align:center;">
        <span style="font-size:1.8rem; margin-bottom:8px; opacity:0.6;">📈</span>
        <div style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">No data available</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Import a CSV dataset to view analytics.</div>
      </div>
    `;
    return;
  }

  // Draw chart logic
  function draw() {
    const width = containerEl.clientWidth || 320;
    const height = containerEl.clientHeight || 160;
    const padding = { top: 20, right: 20, bottom: 25, left: 20 };

    const usableWidth = Math.max(10, width - padding.left - padding.right);
    const usableHeight = Math.max(10, height - padding.top - padding.bottom);

    // Extract values
    const maxVal = Math.max(...points.map(p => Math.max(p.expense || 0, p.income || 0)), 1000);
    const stepX = points.length > 1 ? usableWidth / (points.length - 1) : usableWidth;

    const getExpenseY = (val) => height - padding.bottom - (((val || 0) / maxVal) * usableHeight);
    const getIncomeY = (val) => height - padding.bottom - (((val || 0) / maxVal) * usableHeight);

    // Compute smooth bezier paths
    function createSplinePath(dataPoints, getY) {
      if (dataPoints.length === 1) {
        return `M ${padding.left} ${getY(dataPoints[0])} L ${width - padding.right} ${getY(dataPoints[0])}`;
      }
      let d = `M ${padding.left} ${getY(dataPoints[0])}`;
      for (let i = 0; i < dataPoints.length - 1; i++) {
        const x0 = padding.left + i * stepX;
        const y0 = getY(dataPoints[i]);
        const x1 = padding.left + (i + 1) * stepX;
        const y1 = getY(dataPoints[i + 1]);

        const cx = (x0 + x1) / 2;
        d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
      }
      return d;
    }

    const expensePoints = points.map(p => p.expense || 0);
    const incomePoints = points.map(p => p.income || 0);

    const expenseLine = createSplinePath(expensePoints, getExpenseY);
    const expenseArea = `${expenseLine} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

    const incomeLine = createSplinePath(incomePoints, getIncomeY);
    const incomeArea = `${incomeLine} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

    // Focus marker on highest point or middle point
    let focusIndex = Math.floor(points.length / 2);
    let highestExpense = -1;
    points.forEach((p, idx) => {
      if ((p.expense || 0) > highestExpense) {
        highestExpense = p.expense || 0;
        focusIndex = idx;
      }
    });

    const focusX = padding.left + focusIndex * stepX;
    const focusY = getExpenseY(points[focusIndex]?.expense || 0);
    const focusVal = points[focusIndex]?.expense || 0;
    const currencySymbol = options.currencySymbol || '₹';

    const svgHtml = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible; display:block; width:100%; height:100%;">
        <defs>
          <!-- Gradients -->
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0" />
          </linearGradient>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0ef" stop-opacity="0.25" />
            <stop offset="100%" stop-color="#0ef" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Gridlines -->
        <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
        <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.04)" stroke-dasharray="3 3" />

        <!-- Income Wave -->
        <path d="${incomeArea}" fill="url(#incomeGrad)" />
        <path d="${incomeLine}" fill="none" stroke="#0ef" stroke-width="2" stroke-linecap="round" />

        <!-- Expense Wave -->
        <path d="${expenseArea}" fill="url(#expenseGrad)" />
        <path d="${expenseLine}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" />

        <!-- X-Axis Labels -->
        ${points.map((p, i) => {
          const x = padding.left + i * stepX;
          return `<text x="${x}" y="${height - 6}" font-size="10" fill="#64748b" text-anchor="middle" font-weight="500">${p.label || ''}</text>`;
        }).join('')}

        <!-- Focus Marker & Tooltip -->
        ${focusVal > 0 ? `
          <circle cx="${focusX}" cy="${focusY}" r="4.5" fill="#ffffff" stroke="#8b5cf6" stroke-width="2" />
          <g transform="translate(${Math.max(0, Math.min(width - 80, focusX - 40))}, ${Math.max(0, focusY - 30)})">
            <rect width="80" height="22" rx="6" fill="#181a27" stroke="rgba(255,255,255,0.15)" />
            <text x="40" y="15" font-size="10" fill="#ffffff" font-weight="700" text-anchor="middle">${currencySymbol}${focusVal.toLocaleString()}</text>
          </g>
        ` : ''}
      </svg>
    `;

    containerEl.innerHTML = svgHtml;
  }

  // Initial draw
  draw();

  // Set up ResizeObserver if available
  if (typeof ResizeObserver !== 'undefined' && !observerMap.has(containerEl)) {
    let resizeTimer = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 100);
    });
    ro.observe(containerEl);
    observerMap.set(containerEl, ro);
  }
}

export function renderSparkline(points, strokeColor = '#0ef', width = 64, height = 24) {
  if (!points || points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points) || 1;
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const pts = points.map((val, i) => {
    const x = i * step;
    const y = height - (((val - min) / range) * (height - 6)) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="stat-sparkline">
      <polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
    </svg>
  `;
}
