import { useState } from 'react';
import Layout from '../components/Layout';
import '../styles/analytics.css';

const AnalyticsPage = () => {
    const [timeRange, setTimeRange] = useState('7days');

    // Sample data for the chart
    const chartData = [
        { day: 'Mon', hours: 2.5 },
        { day: 'Tue', hours: 4 },
        { day: 'Wed', hours: 1.5 },
        { day: 'Thu', hours: 4.5 },
        { day: 'Fri', hours: 3.2 },
        { day: 'Sat', hours: 5.5 },
        { day: 'Sun', hours: 2 },
    ];

    const maxHours = 8;
    const chartHeight = 200;
    const chartWidth = 700;
    const padding = 40;

    // Calculate points for the line chart
    const points = chartData.map((d, i) => {
        const x = padding + (i * (chartWidth - padding * 2)) / (chartData.length - 1);
        const y = chartHeight - padding - (d.hours / maxHours) * (chartHeight - padding * 2);
        return { x, y, ...d };
    });

    // Create path for smooth curve
    const createSmoothPath = (pts) => {
        if (pts.length < 2) return '';

        let path = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const current = pts[i];
            const next = pts[i + 1];
            const controlX = (current.x + next.x) / 2;

            path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
        }

        return path;
    };

    const linePath = createSmoothPath(points);

    return (
        <Layout>
            <div className="analytics">
                {/* Header */}
                <div className="analytics-header">
                    <div className="header-text">
                        <h1>Performance Analytics</h1>
                        <p>Track your progress and weekly engagement trends.</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className={`filter-btn ${timeRange === '7days' ? 'active' : ''}`}
                            onClick={() => setTimeRange('7days')}
                        >
                            <svg viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Last 7 Days
                        </button>
                        <button className="generate-btn">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Generate Report
                        </button>
                    </div>
                </div>

                {/* Weekly Engagement Chart */}
                <div className="chart-card">
                    <h3>Weekly Engagement</h3>
                    <div className="chart-container">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="engagement-chart">
                            {/* Grid lines */}
                            {[0, 2, 4, 6, 8].map((val) => {
                                const y = chartHeight - padding - (val / maxHours) * (chartHeight - padding * 2);
                                return (
                                    <g key={val}>
                                        <line
                                            x1={padding}
                                            y1={y}
                                            x2={chartWidth - padding}
                                            y2={y}
                                            stroke="#e5e7eb"
                                            strokeDasharray="4 4"
                                        />
                                        <text x={padding - 10} y={y + 4} textAnchor="end" className="axis-label">
                                            {val}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Line path */}
                            <path
                                d={linePath}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Data points */}
                            {points.map((point, i) => (
                                <g key={i}>
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r="6"
                                        fill="#3b82f6"
                                        stroke="white"
                                        strokeWidth="3"
                                    />
                                    <text
                                        x={point.x}
                                        y={chartHeight - 10}
                                        textAnchor="middle"
                                        className="day-label"
                                    >
                                        {point.day}
                                    </text>
                                </g>
                            ))}

                            {/* Y-axis line */}
                            <line
                                x1={padding}
                                y1={padding}
                                x2={padding}
                                y2={chartHeight - padding}
                                stroke="#e5e7eb"
                                strokeWidth="1"
                            />
                        </svg>
                    </div>

                    {/* Legend */}
                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot"></span>
                            Hours Spent
                        </span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-item">
                        <span className="stat-label">AVERAGE DAILY</span>
                        <span className="stat-value">3.1h</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">WEEKLY TOTAL</span>
                        <span className="stat-value highlight">22.2h</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">PEAK DAY</span>
                        <span className="stat-value">Saturday</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AnalyticsPage;
