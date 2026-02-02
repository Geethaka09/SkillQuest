import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { analyticsService } from '../services/api';
import '../styles/analytics.css';

const AnalyticsPage = () => {
    const [timeRange, setTimeRange] = useState('7days');
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([
        { day: 'Mon', hours: 0 },
        { day: 'Tue', hours: 0 },
        { day: 'Wed', hours: 0 },
        { day: 'Thu', hours: 0 },
        { day: 'Fri', hours: 0 },
        { day: 'Sat', hours: 0 },
        { day: 'Sun', hours: 0 },
    ]);
    const [summary, setSummary] = useState({
        weeklyTotal: 0,
        averageDaily: 0,
        peakDay: 'None'
    });

    // Fetch data on mount and when timeRange changes
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await analyticsService.getWeeklyEngagement(timeRange);
                if (response.success) {
                    setChartData(response.data.chartData);
                    setSummary(response.data.summary);
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange]);

    // Calculate max hours for chart scaling (minimum 8, or highest value)
    const maxHours = Math.max(8, ...chartData.map(d => d.hours));
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

    // Generate grid values based on maxHours
    const gridValues = [];
    const step = Math.ceil(maxHours / 4);
    for (let i = 0; i <= maxHours; i += step) {
        gridValues.push(i);
    }

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
                    {loading ? (
                        <div className="chart-loading">Loading chart data...</div>
                    ) : (
                        <div className="chart-container">
                            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="engagement-chart">
                                {/* Grid lines */}
                                {gridValues.map((val) => {
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
                    )}

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
                        <span className="stat-value">{summary.averageDaily}h</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">WEEKLY TOTAL</span>
                        <span className="stat-value highlight">{summary.weeklyTotal}h</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">PEAK DAY</span>
                        <span className="stat-value">{summary.peakDay}</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AnalyticsPage;
