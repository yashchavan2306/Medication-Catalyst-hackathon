import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { getAdherenceReportApi } from '../api/commonApi.js';
import type { AdherenceReportResponse } from '../types/common.js';
import {
  Eye,
  EyeOff,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [days, setDays] = useState<number>(7);
  const [report, setReport] = useState<AdherenceReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdherenceReportApi(days);
      setReport(data);
    } catch {
      showToast('Could not load adherence report', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [days, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: 'var(--font-size-2xl)',
        }}
      >
        Calculating adherence reports...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Report Data Unavailable</h2>
      </div>
    );
  }

  const { summary, dailyBreakdown, medicationBreakdown } = report;

  // Compute SVG Bar Chart dimensions
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingX = 50;
  const paddingBottom = 40;
  const paddingTop = 20;

  const maxDoses = Math.max(
    1,
    ...dailyBreakdown.map((d) => Math.max(d.total, d.taken, 4))
  );

  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const colWidth = dailyBreakdown.length > 0 ? (chartWidth - paddingX * 2) / dailyBreakdown.length : 60;
  const barWidth = Math.min(36, colWidth * 0.55);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Adherence Reports</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Compliance tracking and trend analysis over the past {days} days
          </p>
        </div>

        {/* Time period selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`btn ${days === d ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minHeight: '38px', padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
            >
              {d} Days
            </button>
          ))}
        </div>
      </header>

      {/* Summary Stat Cards */}
      <section aria-labelledby="report-summary-heading" style={{ marginBottom: '32px' }}>
        <h2 id="report-summary-heading" className="sr-only">
          Adherence Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Rate */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-success)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Overall Adherence Rate
            </span>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {summary.adherenceRate}%
            </div>
          </div>

          {/* Taken */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-primary)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Doses Taken
            </span>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {summary.taken} <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {summary.total}</span>
            </div>
          </div>

          {/* Skipped */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-warning)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Skipped
            </span>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {summary.skipped}
            </div>
          </div>

          {/* Missed */}
          <div className="card" style={{ borderLeft: '6px solid var(--color-danger)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Missed
            </span>
            <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginTop: '8px' }}>
              {summary.missed}
            </div>
          </div>
        </div>
      </section>

      {/* SVG Bar Chart Section */}
      <section className="card" aria-labelledby="chart-section-heading" style={{ marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h2 id="chart-section-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
              Daily Doses Adherence
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Green bar: Doses Taken &bull; Grey background: Total Scheduled
            </p>
          </div>

          {/* Toggle for Accessible Data Table */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDataTable((prev) => !prev)}
            aria-expanded={showDataTable}
            aria-controls="accessible-data-table"
            style={{ minHeight: '38px', padding: '6px 14px', fontSize: 'var(--font-size-sm)' }}
          >
            {showDataTable ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            <span>{showDataTable ? 'Hide Data Table' : 'Show Data Table'}</span>
          </button>
        </div>

        {dailyBreakdown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No log history recorded for this time range.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              role="img"
              aria-labelledby="chart-title chart-desc"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block' }}
            >
              <title id="chart-title">Daily Adherence Bar Chart</title>
              <desc id="chart-desc">
                Bar chart showing doses taken versus total scheduled across the past {days} days.
              </desc>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = paddingTop + plotHeight * (1 - pct);
                const val = Math.round(maxDoses * pct);
                return (
                  <g key={pct}>
                    <line
                      x1={paddingX - 10}
                      y1={y}
                      x2={chartWidth - paddingX + 10}
                      y2={y}
                      stroke="var(--color-border)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 16}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="var(--color-text-muted)"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line
                x1={paddingX - 10}
                y1={chartHeight - paddingBottom}
                x2={chartWidth - paddingX + 10}
                y2={chartHeight - paddingBottom}
                stroke="var(--color-border-strong)"
                strokeWidth="2"
              />

              {/* Day Bars */}
              {dailyBreakdown.map((day, idx) => {
                const centerX = paddingX + idx * colWidth + colWidth / 2;
                const totalH = (day.total / maxDoses) * plotHeight;
                const takenH = (day.taken / maxDoses) * plotHeight;
                const baselineY = chartHeight - paddingBottom;

                // Format date label (e.g. 11/15)
                const dateParts = day.date.split('-');
                const label = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[2]}` : day.date;

                return (
                  <g key={day.date}>
                    {/* Background Bar: Total Scheduled */}
                    <rect
                      x={centerX - barWidth / 2}
                      y={baselineY - totalH}
                      width={barWidth}
                      height={Math.max(2, totalH)}
                      fill="#e2e8f0"
                      rx="4"
                      aria-label={`${day.date}: ${day.total} scheduled`}
                    />

                    {/* Foreground Bar: Taken Doses */}
                    <rect
                      x={centerX - barWidth / 2}
                      y={baselineY - takenH}
                      width={barWidth}
                      height={Math.max(2, takenH)}
                      fill="var(--color-success)"
                      rx="4"
                      aria-label={`${day.date}: ${day.taken} taken`}
                    />

                    {/* Value on top of bar */}
                    {day.total > 0 && (
                      <text
                        x={centerX}
                        y={baselineY - Math.max(totalH, takenH) - 6}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill="var(--color-text-main)"
                      >
                        {day.taken}/{day.total}
                      </text>
                    )}

                    {/* X-axis date label */}
                    <text
                      x={centerX}
                      y={baselineY + 20}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="600"
                      fill="var(--color-text-main)"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Hidden or Toggleable Accessible Data Table (WCAG AA) */}
        <div
          id="accessible-data-table"
          className={showDataTable ? '' : 'sr-only'}
          style={{ marginTop: '24px' }}
        >
          <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '12px' }}>
            Tabular Adherence Breakdown ({days} Days)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--font-size-base)',
              }}
            >
              <caption className="sr-only">
                Daily medication adherence log data table showing dates, doses scheduled, taken, skipped, and missed.
              </caption>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Total Scheduled</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Taken</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Skipped</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Missed</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Adherence</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((row) => {
                  const rate = row.total > 0 ? Math.round((row.taken / row.total) * 100) : 100;
                  return (
                    <tr key={row.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px' }}>{row.date}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.total}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                        {row.taken}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-warning)' }}>
                        {row.skipped}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-danger)' }}>
                        {row.missed}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Per-Medication Breakdown Table */}
      <section className="card" aria-labelledby="med-breakdown-heading">
        <h2 id="med-breakdown-heading" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '16px' }}>
          Per-Medication Compliance
        </h2>

        {medicationBreakdown.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            No medication-specific log history available for this period.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-base)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Medication</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'left' }}>Dosage</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Taken / Scheduled</th>
                  <th scope="col" style={{ padding: '12px', textAlign: 'right' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {medicationBreakdown.map((med) => (
                  <tr key={med.medicationId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{med.medicationName}</td>
                    <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{med.dosage}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {med.taken} / {med.total}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span
                        className={`badge ${med.adherenceRate >= 80 ? 'badge-success' : med.adherenceRate >= 50 ? 'badge-warning' : 'badge-danger'}`}
                      >
                        {med.adherenceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
