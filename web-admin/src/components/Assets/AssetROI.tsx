import { useQuery } from '@tanstack/react-query';
import {
    Stack, Group, Text, Title, Paper, Grid, RingProgress,
    ThemeIcon, List, Divider, LoadingOverlay, Badge
} from '@mantine/core';
import {
    IconCurrencyDollar, IconTool, IconClock,
    IconChartLine, IconArrowUpRight, IconArrowDownRight,
    IconCalendarStats, IconWallet
} from '@tabler/icons-react';
import { analyticsApi } from '../../api/analytics';

interface AssetROIProps {
    assetId: string;
}

export function AssetROI({ assetId }: AssetROIProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['asset-roi', assetId],
        queryFn: () => analyticsApi.getAssetROI(assetId)
    });

    if (isLoading) return <LoadingOverlay visible />;
    if (error || !data) return <Text c="red">Failed to load ROI data</Text>;

    const isProfitable = data.net_profit > 0;

    return (
        <Stack gap="xl">
            <Group justify="space-between">
                <div>
                    <Text size="sm" c="dimmed" fw={500}>Total Return Analysis</Text>
                    <Title order={3}>{data.asset_name} ({data.asset_code})</Title>
                </div>
                <Badge size="xl" variant="dot" color={isProfitable ? 'green' : 'orange'}>
                    {isProfitable ? 'Profitable' : 'Payback phase'}
                </Badge>
            </Group>

            <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper shadow="sm" p="lg" withBorder h="100%">
                        <Stack gap="xs" align="center">
                            <RingProgress
                                size={140}
                                roundCaps
                                thickness={10}
                                sections={[{ value: Math.min(Math.max(data.roi_percentage, 0), 100), color: isProfitable ? 'teal' : 'blue' }]}
                                label={
                                    <Text fw={700} ta="center" size="xl">
                                        {data.roi_percentage.toFixed(1)}%
                                    </Text>
                                }
                            />
                            <Text size="sm" c="dimmed">Asset ROI</Text>
                            <Group gap={5}>
                                <Text fw={700} size="xl">Rp {data.net_profit.toLocaleString()}</Text>
                                {isProfitable ? <IconArrowUpRight color="green" size={20} /> : <IconArrowDownRight color="orange" size={20} />}
                            </Group>
                            <Text size="xs" c="dimmed">Net Profit</Text>
                        </Stack>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Grid gutter="md">
                        <Grid.Col span={6}>
                            <Paper withBorder p="md">
                                <Group>
                                    <ThemeIcon variant="light" color="green" size="lg">
                                        <IconCurrencyDollar size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed">Total Revenue</Text>
                                        <Text fw={700}>Rp {data.total_rental_revenue.toLocaleString()}</Text>
                                        <Text size="xs" c="dimmed">{data.billing_count} Invoices</Text>
                                    </div>
                                </Group>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Paper withBorder p="md">
                                <Group>
                                    <ThemeIcon variant="light" color="red" size="lg">
                                        <IconTool size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed">Maintenance Cost</Text>
                                        <Text fw={700}>Rp {(data.maintenance_cost + data.parts_cost).toLocaleString()}</Text>
                                        <Text size="xs" c="dimmed">{data.work_order_count} Work Orders</Text>
                                    </div>
                                </Group>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Paper withBorder p="md">
                                <Group>
                                    <ThemeIcon variant="light" color="blue" size="lg">
                                        <IconClock size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed">Utilization</Text>
                                        <Text fw={700}>{data.utilization_days} Days</Text>
                                        <Text size="xs" c="dimmed">Physical time rented</Text>
                                    </div>
                                </Group>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Paper withBorder p="md">
                                <Group>
                                    <ThemeIcon variant="light" color="orange" size="lg">
                                        <IconChartLine size={20} />
                                    </ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed">Acc. Depreciation</Text>
                                        <Text fw={700}>Rp {data.accumulated_depreciation.toLocaleString()}</Text>
                                        <Text size="xs" c="dimmed">Book Value: Rp {data.book_value.toLocaleString()}</Text>
                                    </div>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    </Grid>
                </Grid.Col>
            </Grid>

            <Divider label="Cost Breakdown" labelPosition="center" />

            <Grid>
                <Grid.Col span={6}>
                    <Paper withBorder p="md" bg="var(--mantine-color-gray-0)">
                        <Title order={5} mb="md" display="flex" style={{ alignItems: 'center', gap: '8px' }}>
                            <IconWallet size={18} /> Initial Investment
                        </Title>
                        <List spacing="xs" size="sm" center>
                            <List.Item>Purchase Price: <Text span fw={500}>Rp {data.purchase_price.toLocaleString()}</Text></List.Item>
                            <List.Item>Purchase Date: <Text span fw={500}>{data.purchase_date}</Text></List.Item>
                            <List.Item>Current Book Value: <Text span fw={500}>Rp {data.book_value.toLocaleString()}</Text></List.Item>
                        </List>
                    </Paper>
                </Grid.Col>
                <Grid.Col span={6}>
                    <Paper withBorder p="md" bg="var(--mantine-color-gray-0)">
                        <Title order={5} mb="md" display="flex" style={{ alignItems: 'center', gap: '8px' }}>
                            <IconCalendarStats size={18} /> Performance Stats
                        </Title>
                        <List spacing="xs" size="sm" center>
                            <List.Item>Avg Revenue / Bill: <Text span fw={500}>Rp {(data.billing_count > 0 ? data.total_rental_revenue / data.billing_count : 0).toLocaleString()}</Text></List.Item>
                            <List.Item>Avg Maint / Work Order: <Text span fw={500}>Rp {(data.work_order_count > 0 ? (data.maintenance_cost + data.parts_cost) / data.work_order_count : 0).toLocaleString()}</Text></List.Item>
                            <List.Item>Maint-to-Revenue Ratio: <Text span fw={500}>{data.total_rental_revenue > 0 ? ((data.maintenance_cost + data.parts_cost) / data.total_rental_revenue * 100).toFixed(1) : 0}%</Text></List.Item>
                        </List>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
