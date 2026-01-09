import { SimpleGrid, LoadingOverlay, Grid, Paper, Text, Group, RingProgress, Center, ThemeIcon } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconBox, IconTool, IconAlertTriangle, IconCurrencyDollar, IconClock, IconChecklist } from '@tabler/icons-react';
import { api } from '../api/client';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentActivity, type ActivityItem } from '../components/dashboard/RecentActivity';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';

export function Dashboard() {
    // 1. Fetch Main Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await api.get('/dashboard');
            return res.data;
        },
    });

    // 2. Fetch Recent Activity
    const { data: activities, isLoading: activityLoading } = useQuery({
        queryKey: ['dashboard-activity'],
        queryFn: async () => {
            const res = await api.get('/dashboard/activity');
            return res.data as ActivityItem[];
        },
    });

    // 3. Fetch Depreciation/Financials
    const { data: financials, isLoading: financialsLoading } = useQuery({
        queryKey: ['dashboard-depreciation'],
        queryFn: async () => {
            const res = await api.get('/dashboard/depreciation');
            return res.data;
        },
    });

    const isLoading = statsLoading || activityLoading || financialsLoading;

    if (isLoading) return <LoadingOverlay visible />;

    // Prepare Stat Cards
    const statItems = [
        {
            label: 'Total Assets',
            value: stats?.assets?.total || 0,
            icon: IconBox,
            color: 'blue',
            description: `${stats?.assets?.by_status?.find((s: any) => s.status === 'available')?.count || 0} Available`
        },
        {
            label: 'Total Value',
            value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats?.assets?.total_value || 0),
            icon: IconCurrencyDollar,
            color: 'green',
            description: 'Asset Purchase Value'
        },
        {
            label: 'Active Work Orders',
            value: stats?.maintenance?.pending || 0,
            icon: IconTool,
            color: 'orange',
            description: `${stats?.maintenance?.overdue || 0} Overdue`
        },
        {
            label: 'Critical Alerts',
            value: stats?.alerts?.critical || 0,
            icon: IconAlertTriangle,
            color: 'red',
            description: `${stats?.alerts?.active || 0} Active Alerts`
        },
    ];

    // Calculate Asset Availability for Chart
    const totalAssets = stats?.assets?.total || 1; // avoid division by zero
    const availableAssets = stats?.assets?.by_status?.find((s: any) => s.status === 'available')?.count || 0;
    const availablePercentage = Math.round((availableAssets / totalAssets) * 100);

    return (
        <div>
            <Text size="xl" fw={700} mb="lg">Dashboard Overview</Text>

            {/* Top Stats Row */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="lg">
                {statItems.map((item) => (
                    <StatCard key={item.label} {...item} />
                ))}
            </SimpleGrid>

            {/* Charts Section */}
            <DashboardCharts
                categoryDistribution={stats?.category_distribution}
                statusDistribution={stats?.assets?.by_status}
            />

            <Grid gutter="lg">
                {/* Main Content Area - Left Column */}
                <Grid.Col span={{ base: 12, md: 8 }}>

                    {/* Financial Snapshot */}
                    <Paper withBorder p="md" radius="md" mb="lg">
                        <Text size="lg" fw={600} mb="md">Financial Snapshot</Text>
                        <SimpleGrid cols={{ base: 1, sm: 3 }}>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Original Cost</Text>
                                <Text fw={700} size="lg">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(financials?.total_original_cost || 0)}
                                </Text>
                            </div>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Est. Depreciation</Text>
                                <Text fw={700} size="lg" c="red">
                                    -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(financials?.total_accumulated_depreciation || 0)}
                                </Text>
                            </div>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Book Value</Text>
                                <Text fw={700} size="lg" c="blue">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(financials?.total_book_value || 0)}
                                </Text>
                            </div>
                        </SimpleGrid>
                    </Paper>

                    {/* Recent Activity */}
                    <RecentActivity activities={activities || []} />
                </Grid.Col>

                {/* Sidebar - Right Column */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md" mb="lg">
                        <Text size="lg" fw={600} mb="xl">Asset Availability</Text>
                        <Center>
                            <RingProgress
                                size={220}
                                thickness={24}
                                roundCaps
                                sections={[
                                    { value: availablePercentage, color: 'teal' },
                                    { value: 100 - availablePercentage, color: 'gray.3' },
                                ]}
                                label={
                                    <Center>
                                        <div>
                                            <Text ta="center" fz="xl" fw={700}>
                                                {availablePercentage}%
                                            </Text>
                                            <Text ta="center" c="dimmed" size="xs">
                                                Available
                                            </Text>
                                        </div>
                                    </Center>
                                }
                            />
                        </Center>
                        <Group justify="center" mt="md">
                            <Group gap={5}>
                                <ThemeIcon color="teal" size={10} radius="xl"> </ThemeIcon>
                                <Text size="sm" c="dimmed">Available</Text>
                            </Group>
                            <Group gap={5}>
                                <ThemeIcon color="gray.3" size={10} radius="xl"> </ThemeIcon>
                                <Text size="sm" c="dimmed">In Use / Others</Text>
                            </Group>
                        </Group>
                    </Paper>

                    {/* Operational Stats */}
                    <Paper withBorder p="md" radius="md">
                        <Text size="lg" fw={600} mb="md">Operational Needs</Text>
                        <Group mb="sm">
                            <ThemeIcon color="grape" variant="light"><IconChecklist size={18} /></ThemeIcon>
                            <Text flex={1} size="sm">Pending Loan Approvals</Text>
                            <Text fw={700}>{stats?.loans?.pending_approval || 0}</Text>
                        </Group>
                        <Group mb="sm">
                            <ThemeIcon color="orange" variant="light"><IconClock size={18} /></ThemeIcon>
                            <Text flex={1} size="sm">Overdue Loans</Text>
                            <Text fw={700} c="orange">{stats?.loans?.overdue || 0}</Text>
                        </Group>
                        <Group>
                            <ThemeIcon color="red" variant="light"><IconTool size={18} /></ThemeIcon>
                            <Text flex={1} size="sm">Overdue Maintenance</Text>
                            <Text fw={700} c="red">{stats?.maintenance?.overdue || 0}</Text>
                        </Group>
                    </Paper>

                </Grid.Col>
            </Grid>
        </div>
    );
}

