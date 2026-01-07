import { Paper, Text, Group, LoadingOverlay, SimpleGrid } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconBox, IconTool, IconAlertTriangle, IconCurrencyDollar } from '@tabler/icons-react';
import { api } from '../api/client';

export function Dashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
    });

    if (isLoading) return <LoadingOverlay visible />;

    const statItems = [
        {
            label: 'Total Assets', // stats.total_assets ?
            value: stats?.total_assets || 0,
            icon: IconBox,
            color: 'blue'
        },
        {
            label: 'Total Value',
            value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats?.total_value || 0),
            icon: IconCurrencyDollar,
            color: 'green'
        },
        {
            label: 'Active Work Orders',
            value: stats?.maintenance_stats?.active || 0,
            icon: IconTool,
            color: 'orange'
        },
        {
            label: 'Low Stock Alerts',
            value: stats?.alert_stats?.low_stock || 0,
            icon: IconAlertTriangle,
            color: 'red'
        },
    ];

    return (
        <div>
            <Text size="xl" fw={700} mb="lg">Dashboard Overview</Text>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                {statItems.map((item) => (
                    <Paper withBorder p="md" radius="md" key={item.label}>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" tt="uppercase" fw={700} fz="xs">
                                    {item.label}
                                </Text>
                                <Text fw={700} fz="xl">
                                    {item.value}
                                </Text>
                            </div>
                            <item.icon size="1.4rem" stroke={1.5} color={item.color} />
                        </Group>
                    </Paper>
                ))}
            </SimpleGrid>

            {/* Add Recent Activity and charts here later */}
        </div>
    );
}
