import { Paper, Text, SimpleGrid } from '@mantine/core';
import { DonutChart, BarChart } from '@mantine/charts';

interface CategoryDistribution {
    category: string;
    count: number;
    value: number;
}

interface StatusCount {
    status: string;
    count: number;
}

interface DashboardChartsProps {
    categoryDistribution?: CategoryDistribution[];
    statusDistribution?: StatusCount[];
}

export function DashboardCharts({ categoryDistribution, statusDistribution }: DashboardChartsProps) {
    const categoryData = categoryDistribution?.map((item) => ({
        name: item.category,
        value: parseFloat(item.value.toString()), // Decimal to number
        color: getRandomColor(item.category),
    })) || [];

    const statusData = statusDistribution?.map((item) => ({
        status: item.status,
        count: item.count,
    })) || [];

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
            <Paper withBorder p="md" radius="md">
                <Text size="lg" fw={600} mb="xl">Assets by Category (Value)</Text>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <DonutChart
                        data={categoryData}
                        withLabelsLine
                        withLabels
                        tooltipDataSource="segment"
                        w="100%"
                    />
                </div>
            </Paper>

            <Paper withBorder p="md" radius="md">
                <Text size="lg" fw={600} mb="xl">Assets by Status</Text>
                <BarChart
                    h={300}
                    w="100%"
                    data={statusData}
                    dataKey="status"
                    series={[{ name: 'count', color: 'blue.6' }]}
                    tickLine="y"
                />
            </Paper>
        </SimpleGrid>
    );
}

// Helper for consistent colors (simple hash)
function getRandomColor(str: string) {
    const colors = ['indigo.6', 'yellow.6', 'teal.6', 'grape.6', 'red.6', 'cyan.6', 'lime.6', 'pink.6'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
