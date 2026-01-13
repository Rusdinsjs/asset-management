import {
    Paper, Stack, Group, Title, Text, Table, Badge,
    Divider, Grid, Button, LoadingOverlay, ScrollArea, Center
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../api/timesheet';
import { IconClock, IconAlertCircle, IconCheck, IconFileInvoice } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Props {
    billingId: string;
    onClose: () => void;
}

export function BillingReviewDetail({ billingId, onClose }: Props) {
    const queryClient = useQueryClient();
    const { data: summary, isLoading } = useQuery({
        queryKey: ['billing', 'summary', billingId],
        queryFn: () => billingApi.getSummary(billingId)
    });

    const calculateMutation = useMutation({
        mutationFn: () => billingApi.calculate(billingId, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            notifications.show({ title: 'Success', message: 'Billing recalculated based on latest timesheets', color: 'green' });
        }
    });

    const approveMutation = useMutation({
        mutationFn: () => billingApi.approve(billingId, 'Approved via dashboard'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            notifications.show({ title: 'Success', message: 'Billing approved', color: 'green' });
        }
    });

    const invoiceMutation = useMutation({
        mutationFn: () => billingApi.generateInvoice(billingId),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['billing', 'summary', billingId] });
            notifications.show({
                title: 'Success',
                message: `Invoice ${data.invoice_number || ''} generated successfully`,
                color: 'green'
            });
        }
    });

    if (isLoading) return <Paper p="xl" pos="relative"><LoadingOverlay visible /></Paper>;
    if (!summary) return <Center h={200}><Text>No data found</Text></Center>;

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Stack gap={0}>
                    <Title order={4}>Billing Period: {summary.period}</Title>
                    <Text size="sm" c="dimmed">{summary.client_name} - {summary.asset_name} ({summary.rental_number})</Text>
                </Stack>
                <Badge size="xl" variant="dot">{summary.status}</Badge>
            </Group>

            <Grid gutter="md">
                <Grid.Col span={4}>
                    <Paper p="md" withBorder>
                        <Title order={6} mb="xs">Hours Breakdown</Title>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm">Operating Hours</Text>
                                <Text fw={500}>{summary.total_operating_hours}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Overtime Hours</Text>
                                <Text fw={500}>{summary.total_overtime_hours}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Standby Hours</Text>
                                <Text fw={500}>{summary.total_standby_hours}</Text>
                            </Group>
                            <Group justify="space-between">
                                <Text size="sm">Breakdown Hours</Text>
                                <Text fw={500} c="red">{summary.total_breakdown_hours}</Text>
                            </Group>
                            <Divider />
                            <Group justify="space-between" bg="blue.0" p="xs" style={{ borderRadius: 4 }}>
                                <Group gap="xs">
                                    <Text size="sm" fw={700}>Billable Hours</Text>
                                    {summary.shortfall_hours > 0 && (
                                        <Badge size="xs" color="orange">Min {summary.minimum_hours}</Badge>
                                    )}
                                </Group>
                                <Text fw={700} color="blue">{summary.billable_hours}</Text>
                            </Group>
                        </Stack>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={8}>
                    <Paper p="md" withBorder>
                        <Title order={6} mb="xs">Financial Breakdown</Title>
                        <Grid>
                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm">Base Amount ({summary.rate_basis})</Text>
                                        <Text size="sm">{summary.base_amount.toLocaleString()}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm">Standby Amount</Text>
                                        <Text size="sm">{summary.standby_amount.toLocaleString()}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm">Overtime Amount</Text>
                                        <Text size="sm">{summary.overtime_amount.toLocaleString()}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm">Breakdown Penalty</Text>
                                        <Text size="sm" c="red">{summary.breakdown_penalty_amount.toLocaleString()}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm">Subtotal</Text>
                                        <Text size="sm" fw={600}>{summary.subtotal.toLocaleString()}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm">Tax ({summary.tax_percentage}%)</Text>
                                        <Text size="sm">{summary.tax_amount.toLocaleString()}</Text>
                                    </Group>
                                    <Divider />
                                    <Group justify="space-between">
                                        <Text fw={700} size="lg">Total Amount</Text>
                                        <Text fw={700} size="lg" color="blue">Rp {summary.total_amount.toLocaleString()}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>
            </Grid>

            <Paper p="md" withBorder>
                <Group mb="sm">
                    <IconClock size={18} />
                    <Title order={6}>Timesheet Audit Log (Historical Accuracy)</Title>
                </Group>
                <ScrollArea h={300}>
                    <Table verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>HM/KM Usage</Table.Th>
                                <Table.Th>Op Hours</Table.Th>
                                <Table.Th>Standby</Table.Th>
                                <Table.Th>Overtime</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Work Desc</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {summary.timesheets?.map((ts: any) => (
                                <Table.Tr key={ts.id}>
                                    <Table.Td>{ts.work_date}</Table.Td>
                                    <Table.Td>{ts.hm_km_usage || '-'}</Table.Td>
                                    <Table.Td>{ts.operating_hours}</Table.Td>
                                    <Table.Td>{ts.standby_hours}</Table.Td>
                                    <Table.Td>{ts.overtime_hours}</Table.Td>
                                    <Table.Td>
                                        <Badge size="xs" color="green">Approved</Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" truncate maw={200}>{ts.work_description}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {(!summary.timesheets || summary.timesheets.length === 0) && (
                                <Table.Tr>
                                    <Table.Td colSpan={7} align="center">
                                        <Group gap="xs" justify="center" c="orange">
                                            <IconAlertCircle size={16} />
                                            <Text size="sm">No approved timesheets found for this period.</Text>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>

            <Group justify="flex-end" mt="md">
                <Button variant="outline" onClick={onClose}>Close</Button>
                {summary.status === 'draft' && (
                    <Button
                        color="blue"
                        onClick={() => calculateMutation.mutate()}
                        loading={calculateMutation.isPending}
                    >
                        Calculate Final Billing
                    </Button>
                )}
                {summary.status === 'calculated' && (
                    <Button
                        color="green"
                        leftSection={<IconCheck size={16} />}
                        onClick={() => approveMutation.mutate()}
                        loading={approveMutation.isPending}
                    >
                        Approve & Confirm
                    </Button>
                )}
                {summary.status === 'approved' && (
                    <Button
                        color="teal"
                        leftSection={<IconFileInvoice size={16} />}
                        onClick={() => invoiceMutation.mutate()}
                        loading={invoiceMutation.isPending}
                    >
                        Generate Invoice
                    </Button>
                )}
            </Group>
        </Stack>
    );
}
