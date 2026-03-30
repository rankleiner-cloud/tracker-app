import React, { useState } from 'react';

const LABEL_WIDTH   = 260;
const ROW_HEIGHT    = 44;
const HEADER_HEIGHT = 32;
const BAR_HEIGHT    = 18;
const BAR_TOP       = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const EXPORT_WIDTH  = 1400;
const CHART_WIDTH   = EXPORT_WIDTH - LABEL_WIDTH;
const EXPORT_TITLE_H  = 48;
const EXPORT_LEGEND_H = 44;

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

function formatDateShort(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildExportSVG(withDates, months, toPct, todayPct, isRTL) {
  const totalH = EXPORT_TITLE_H + HEADER_HEIGHT + withDates.length * ROW_HEIGHT + EXPORT_LEGEND_H;

  // In RTL: chart on left (0..CHART_WIDTH), labels on right (CHART_WIDTH..EXPORT_WIDTH)
  // In LTR: labels on left (0..LABEL_WIDTH), chart on right (LABEL_WIDTH..EXPORT_WIDTH)
  const chartX0  = isRTL ? 0 : LABEL_WIDTH;          // chart area left edge
  const labelX0  = isRTL ? CHART_WIDTH : 0;           // label area left edge
  const dividerX = isRTL ? CHART_WIDTH : LABEL_WIDTH; // vertical divider

  const xPos = (pct) => chartX0 + ((100 - pct) / 100) * CHART_WIDTH;

  // Label text: LTR → anchor left near labelX0; RTL → anchor end near right edge of label area
  const labelTextX      = isRTL ? EXPORT_WIDTH - 12 : labelX0 + 12;
  const labelTextAnchor = isRTL ? 'end' : 'start';

  // Future badge: LTR → near right of label area; RTL → near left of label area
  const badgeX = isRTL ? labelX0 + 4 : dividerX - 52;

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_WIDTH}" height="${totalH}">`;
  s += `<rect width="${EXPORT_WIDTH}" height="${totalH}" fill="white"/>`;

  // ── Title bar ─────────────────────────────────────────────────────────────
  s += `<rect x="0" y="0" width="${EXPORT_WIDTH}" height="${EXPORT_TITLE_H}" fill="#1e1b4b"/>`;
  const titleX      = isRTL ? EXPORT_WIDTH - 20 : 20;
  const titleAnchor = isRTL ? 'end' : 'start';
  s += `<text x="${titleX}" y="${EXPORT_TITLE_H / 2 + 6}" font-family="sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="${titleAnchor}">Requirements Gantt</text>`;
  const dateX      = isRTL ? 20 : EXPORT_WIDTH - 16;
  const dateAnchor = isRTL ? 'start' : 'end';
  s += `<text x="${dateX}" y="${EXPORT_TITLE_H / 2 + 6}" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.55)" text-anchor="${dateAnchor}">${today}</text>`;

  const baseY = EXPORT_TITLE_H;
  const rowsY = baseY + HEADER_HEIGHT;

  // ── Timeline header ───────────────────────────────────────────────────────
  s += `<rect x="0" y="${baseY}" width="${EXPORT_WIDTH}" height="${HEADER_HEIGHT}" fill="#f9fafb"/>`;
  s += `<line x1="${dividerX}" y1="${baseY}" x2="${dividerX}" y2="${baseY + HEADER_HEIGHT}" stroke="#e5e7eb"/>`;

  for (const mo of months) {
    const mx = xPos(mo.pct);
    s += `<line x1="${mx}" y1="${baseY}" x2="${mx}" y2="${baseY + HEADER_HEIGHT}" stroke="#e5e7eb"/>`;
    s += `<text x="${mx + 4}" y="${baseY + HEADER_HEIGHT / 2 + 4}" font-family="sans-serif" font-size="10" fill="#9ca3af">${esc(mo.label)}</text>`;
  }
  if (todayPct >= 0 && todayPct <= 100) {
    const tx = xPos(todayPct);
    s += `<line x1="${tx}" y1="${baseY}" x2="${tx}" y2="${baseY + HEADER_HEIGHT}" stroke="#ef4444" stroke-width="2" opacity="0.85"/>`;
  }
  s += `<line x1="0" y1="${baseY + HEADER_HEIGHT}" x2="${EXPORT_WIDTH}" y2="${baseY + HEADER_HEIGHT}" stroke="#e5e7eb"/>`;

  // ── Rows ──────────────────────────────────────────────────────────────────
  for (let idx = 0; idx < withDates.length; idx++) {
    const item     = withDates[idx];
    const ry       = rowsY + idx * ROW_HEIGHT;
    const barColor = PRIORITY_COLOR[item.priority] || '#94a3b8';

    s += `<rect x="0" y="${ry}" width="${EXPORT_WIDTH}" height="${ROW_HEIGHT}" fill="${idx % 2 === 0 ? 'white' : '#fafafa'}"/>`;
    s += `<line x1="${dividerX}" y1="${ry}" x2="${dividerX}" y2="${ry + ROW_HEIGHT}" stroke="#e5e7eb"/>`;

    const rawTitle = `#${item.id}  ${item.title.length > 32 ? item.title.slice(0, 29) + '\u2026' : item.title}`;
    s += `<text x="${labelTextX}" y="${ry + ROW_HEIGHT / 2 + 5}" font-family="sans-serif" font-size="12" fill="${item.isFuture ? '#6366f1' : '#1a1a2e'}" text-anchor="${labelTextAnchor}">${esc(rawTitle)}</text>`;

    if (item.isFuture) {
      s += `<rect x="${badgeX}" y="${ry + ROW_HEIGHT / 2 - 8}" width="44" height="15" rx="3" fill="#e0e7ff"/>`;
      s += `<text x="${badgeX + 2}" y="${ry + ROW_HEIGHT / 2 + 4}" font-family="sans-serif" font-size="9" fill="#4f46e5">Future</text>`;
    }

    for (const mo of months) {
      const mx = xPos(mo.pct);
      s += `<line x1="${mx}" y1="${ry}" x2="${mx}" y2="${ry + ROW_HEIGHT}" stroke="#f3f4f6"/>`;
    }
    if (todayPct >= 0 && todayPct <= 100) {
      const tx = xPos(todayPct);
      s += `<line x1="${tx}" y1="${ry}" x2="${tx}" y2="${ry + ROW_HEIGHT}" stroke="#ef4444" stroke-width="1.5" opacity="0.22"/>`;
    }

    const startPct = Math.max(0, Math.min(100, toPct(item.startDate)));
    const endPct   = item.endDate ? Math.max(0, Math.min(100, toPct(item.endDate))) : Math.min(100, startPct + 3);
    const wPct     = Math.max(endPct - startPct, 0.4);
    const bx       = xPos(endPct);
    const bw       = Math.max((wPct / 100) * CHART_WIDTH, 6);
    const by       = ry + BAR_TOP;

    if (item.isFuture) {
      s += `<rect x="${bx}" y="${by}" width="${bw}" height="${BAR_HEIGHT}" rx="4" fill="${barColor}44" stroke="${barColor}" stroke-width="1.5" stroke-dasharray="5,3"/>`;
    } else {
      s += `<rect x="${bx}" y="${by}" width="${bw}" height="${BAR_HEIGHT}" rx="4" fill="${barColor}"/>`;
    }
    s += `<line x1="0" y1="${ry + ROW_HEIGHT}" x2="${EXPORT_WIDTH}" y2="${ry + ROW_HEIGHT}" stroke="#f3f4f6"/>`;
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  const legendY = rowsY + withDates.length * ROW_HEIGHT;
  s += `<rect x="0" y="${legendY}" width="${EXPORT_WIDTH}" height="${EXPORT_LEGEND_H}" fill="white"/>`;
  s += `<line x1="0" y1="${legendY}" x2="${EXPORT_WIDTH}" y2="${legendY}" stroke="#e5e7eb"/>`;

  let lx = isRTL ? EXPORT_WIDTH - 20 : 20;
  const legendStep = isRTL ? -90 : 90;
  for (const [color, label] of [['#ef4444', 'High'], ['#f59e0b', 'Medium'], ['#22c55e', 'Low']]) {
    const bx = isRTL ? lx - 18 : lx;
    s += `<rect x="${bx}" y="${legendY + 16}" width="18" height="10" rx="2" fill="${color}"/>`;
    const tx = isRTL ? lx - 22 : lx + 24;
    s += `<text x="${tx}" y="${legendY + 25}" font-family="sans-serif" font-size="11" fill="#6b7280" text-anchor="${isRTL ? 'end' : 'start'}">${label}</text>`;
    lx += legendStep;
  }
  const todayLx = isRTL ? lx - 4 : lx + 4;
  s += `<line x1="${todayLx}" y1="${legendY + 12}" x2="${todayLx}" y2="${legendY + 28}" stroke="#ef4444" stroke-width="2"/>`;
  const todayTx = isRTL ? lx - 12 : lx + 12;
  s += `<text x="${todayTx}" y="${legendY + 25}" font-family="sans-serif" font-size="11" fill="#6b7280" text-anchor="${isRTL ? 'end' : 'start'}">Today</text>`;
  lx += legendStep;
  const futureBx = isRTL ? lx - 18 : lx;
  s += `<rect x="${futureBx}" y="${legendY + 16}" width="18" height="10" rx="2" fill="#94a3b844" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>`;
  const futureTx = isRTL ? lx - 22 : lx + 24;
  s += `<text x="${futureTx}" y="${legendY + 25}" font-family="sans-serif" font-size="11" fill="#6b7280" text-anchor="${isRTL ? 'end' : 'start'}">Future</text>`;

  s += `</svg>`;
  return s;
}

export default function GanttView({ items, t, isRTL, onEdit }) {
  const [downloading, setDownloading] = useState(false);

  const reqs = items.filter(i => i.type === 'requirement' && i.status !== 'closed');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (reqs.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 48, textAlign: 'center', color: '#9ca3af' }}>
        {t('ganttNoReqs')}
      </div>
    );
  }

  const withDates = reqs.map(item => {
    const start = new Date(item.start_date || item.created_at);
    start.setHours(0, 0, 0, 0);
    const end = item.due_date ? (() => { const d = new Date(item.due_date); d.setHours(0, 0, 0, 0); return d; })() : null;
    return { ...item, startDate: start, endDate: end, isFuture: start > today };
  }).sort((a, b) => a.startDate - b.startDate);

  const allStarts = withDates.map(i => i.startDate.getTime());
  const allEnds   = withDates.filter(i => i.endDate).map(i => i.endDate.getTime());

  let rangeStart = new Date(Math.min(...allStarts, today.getTime()));
  rangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);

  let rangeEnd = new Date(Math.max(...(allEnds.length ? allEnds : allStarts), today.getTime()));
  rangeEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 2, 0);

  const totalMs  = rangeEnd.getTime() - rangeStart.getTime();
  const toPct    = (date) => ((date.getTime() - rangeStart.getTime()) / totalMs) * 100;
  const todayPct = toPct(today);

  const months = [];
  let m = new Date(rangeStart);
  while (m <= rangeEnd) {
    months.push({ label: m.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), pct: toPct(m) });
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }

  async function downloadAsPNG() {
    setDownloading(true);
    try {
      const totalH   = EXPORT_TITLE_H + HEADER_HEIGHT + withDates.length * ROW_HEIGHT + EXPORT_LEGEND_H;
      const svgStr   = buildExportSVG(withDates, months, toPct, todayPct, isRTL);
      const blob     = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url      = URL.createObjectURL(blob);
      const img      = new Image();

      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

      const canvas   = document.createElement('canvas');
      canvas.width   = EXPORT_WIDTH * 2;   // 2× for crisp display on retina
      canvas.height  = totalH * 2;
      const ctx      = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle  = 'white';
      ctx.fillRect(0, 0, EXPORT_WIDTH, totalH);
      ctx.drawImage(img, 0, 0, EXPORT_WIDTH, totalH);
      URL.revokeObjectURL(url);

      const link     = document.createElement('a');
      link.download  = `gantt-${new Date().toISOString().slice(0, 10)}.png`;
      link.href      = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>{t('ganttTitle')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{t('typeRequirement')} — {withDates.length}</span>
          <button
            onClick={downloadAsPNG}
            disabled={downloading}
            style={{
              background: downloading ? '#e5e7eb' : '#1e1b4b',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {downloading ? '⏳ Exporting…' : '⬇ Download PNG'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 800 }}>
          {/* Timeline header */}
          <div style={{ display: 'flex', height: HEADER_HEIGHT, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid #e5e7eb' }} />
            <div style={{ flex: 1, position: 'relative' }}>
              {months.map((mo, i) => (
                <div key={i} style={{
                  position: 'absolute', left: `${100 - mo.pct}%`, top: 0, bottom: 0,
                  borderLeft: '1px solid #e5e7eb', paddingLeft: 5,
                  fontSize: '0.7rem', color: '#9ca3af',
                  display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
                }}>
                  {mo.label}
                </div>
              ))}
              {todayPct >= 0 && todayPct <= 100 && (
                <div style={{ position: 'absolute', left: `${100 - todayPct}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', opacity: 0.8 }} />
              )}
            </div>
          </div>

          {/* Rows */}
          {withDates.map((item, idx) => {
            const barColor = PRIORITY_COLOR[item.priority] || '#94a3b8';
            const startPct = Math.max(0, Math.min(100, toPct(item.startDate)));
            const endPct   = item.endDate ? Math.max(0, Math.min(100, toPct(item.endDate))) : Math.min(100, startPct + 3);
            const widthPct = Math.max(endPct - startPct, 0.4);

            return (
              <div key={item.id} onClick={() => onEdit && onEdit(item)} style={{
                display: 'flex', height: ROW_HEIGHT,
                borderBottom: '1px solid #f3f4f6',
                background: idx % 2 === 0 ? '#fff' : '#fafafa',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid #e5e7eb',
                  padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden',
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0 }}>#{item.id}</span>
                  <span style={{ fontSize: '0.82rem', color: item.isFuture ? '#6366f1' : '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {item.title}
                  </span>
                  {item.isFuture && (
                    <span style={{ fontSize: '0.62rem', background: '#e0e7ff', color: '#4f46e5', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                      {t('futureBadge')}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {months.map((mo, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${100 - mo.pct}%`, top: 0, bottom: 0, width: 1, background: '#f3f4f6' }} />
                  ))}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div style={{ position: 'absolute', left: `${100 - todayPct}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', opacity: 0.25, zIndex: 1 }} />
                  )}
                  <div
                    title={`${item.title}\n${t('formStartDate')}: ${formatDateShort(item.startDate)}${item.endDate ? `\n${t('formDueDate')}: ${formatDateShort(item.endDate)}` : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${100 - endPct}%`,
                      width: `${widthPct}%`,
                      top: BAR_TOP,
                      height: BAR_HEIGHT,
                      background: item.isFuture
                        ? `repeating-linear-gradient(45deg,${barColor}55,${barColor}55 4px,${barColor}22 4px,${barColor}22 8px)`
                        : barColor,
                      border: item.isFuture ? `1.5px dashed ${barColor}` : 'none',
                      borderRadius: 4,
                      zIndex: 2,
                      cursor: 'default',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['high','#ef4444'],['medium','#f59e0b'],['low','#22c55e']].map(([p, c]) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 18, height: 10, background: c, borderRadius: 2 }} />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t(`priority${p[0].toUpperCase()}${p.slice(1)}`)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 2, height: 14, background: '#ef4444' }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('ganttToday')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 18, height: 10, background: 'repeating-linear-gradient(45deg,#94a3b855,#94a3b855 4px,#94a3b822 4px,#94a3b822 8px)', border: '1.5px dashed #94a3b8', borderRadius: 2 }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('navFutureItems')}</span>
        </div>
      </div>
    </div>
  );
}
