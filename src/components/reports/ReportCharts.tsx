
import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { toBengaliNumerals } from '@/lib/i18n-utils';

interface ChartProps {
    title: string;
    data: any[];
    dataKey?: string;
    categoryKey?: string;
    valueKey?: string;
    color?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// Component for formatting tooltips and axis ticks based on locale
const useChartFormatter = () => {
    const { i18n } = useTranslation();

    const formatCurrency = (value: number) => {
        if (typeof value !== 'number' || isNaN(value)) return '৳0';
        const formatted = value.toLocaleString('en-BD', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
        return i18n.language === 'bn' ? `৳${toBengaliNumerals(formatted)}` : `৳${formatted}`;
    };

    const formatNumber = (value: number) => {
        if (typeof value !== 'number' || isNaN(value)) return '0';
        return i18n.language === 'bn' ? toBengaliNumerals(value) : value.toString();
    };

    return { formatCurrency, formatNumber, language: i18n.language };
};

export function SalesTrendChart({ title, data }: ChartProps) {
    const { formatCurrency } = useChartFormatter();

    // Show fewer bars on mobile
    const mobileData = data.length > 7 ? data.slice(-7) : data;

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
                <div className="h-[200px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={mobileData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <XAxis
                                dataKey="name"
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                                width={35}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', fontSize: 12 }}
                                formatter={(value: number) => [formatCurrency(value), 'Sales']}
                                labelStyle={{ color: '#9ca3af' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function CategoryPieChart({ title, data }: ChartProps) {
    const { formatCurrency } = useChartFormatter();

    // Limit to top 5 categories on mobile for readability
    const chartData = data.slice(0, 5);

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
                <div className="h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                outerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', fontSize: 12 }}
                                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                wrapperStyle={{ fontSize: 10 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function HourlySalesChart({ title, data }: ChartProps) {
    // Group hours into 4-hour buckets for mobile
    const groupedData = useMemo(() => {
        const buckets: { hour: string, value: number }[] = [];
        for (let i = 0; i < 24; i += 4) {
            const sum = data.slice(i, i + 4).reduce((acc, d) => acc + (d.value || 0), 0);
            buckets.push({ hour: `${i}-${i + 3}h`, value: sum });
        }
        return buckets;
    }, [data]);

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
                <div className="h-[200px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={groupedData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <XAxis
                                dataKey="hour"
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                width={25}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', fontSize: 12 }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Orders" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function TopProductsTable({ title, data }: ChartProps) {
    const { formatCurrency, formatNumber } = useChartFormatter();

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2 md:px-6 md:py-3">Product</th>
                                <th className="px-3 py-2 md:px-6 md:py-3 text-right">Qty</th>
                                <th className="px-3 py-2 md:px-6 md:py-3 text-right">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(0, 5).map((item, index) => (
                                <tr key={index} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3 py-2 md:px-6 md:py-4 font-medium truncate max-w-[120px] md:max-w-none">{item.name}</td>
                                    <td className="px-3 py-2 md:px-6 md:py-4 text-right">{formatNumber(item.quantity)}</td>
                                    <td className="px-3 py-2 md:px-6 md:py-4 text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(item.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

