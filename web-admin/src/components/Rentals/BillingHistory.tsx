import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Group, ActionIcon, LoadingOverlay, Text, Button } from '@mantine/core';
import { IconEye, IconDownload } from '@tabler/icons-react';
import { StatusBadge } from '../common/StatusBadge';
import { billingApi } from '../../api/timesheet';

interface BillingHistoryProps {
    rentalId: string;
}

export function BillingHistory({ rentalId }: BillingHistoryProps) {
    const { data: billingPeriods, isLoading } = useQuery({
        queryKey: ['billing-history', rentalId],
        queryFn: () => billingApi.listByRental(rentalId),
        enabled: !!rentalId
    });

    return (
        <Paper p="md" shadow="sm" withBorder pos="relative">
            <LoadingOverlay visible={isLoading} />

            <Group justify="flex-end" mb="md">
                <Button
                    leftSection={<IconDownload size={16} />}
                >
                    Create Bill / Calculate
                </Button>
            </Group>

            <Table verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Period</Table.Th>
                        <Table.Th>Operating Hours</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {billingPeriods?.map((bp) => (
                        <Table.Tr key={bp.id}>
                            <Table.Td>
                                <Text size="sm" fw={500}>{bp.period_start} - {bp.period_end}</Text>
                            </Table.Td>
                            <Table.Td>{bp.total_operating_hours || 0} hrs</Table.Td>
                            <Table.Td>Rp {(bp.total_amount || 0).toLocaleString()}</Table.Td>
                            <Table.Td>
                                <StatusBadge status={bp.status} />
                                {bp.invoice_number && (
                                    <Text size="xs" c="dimmed">Inv: {bp.invoice_number}</Text>
                                )}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon variant="subtle" title="View Details">
                                        <IconEye size={16} />
                                    </ActionIcon>
                                    {bp.status === 'invoiced' || bp.status === 'paid' ? (
                                        <ActionIcon variant="light" color="blue" title="Download Invoice">
                                            <IconDownload size={16} />
                                        </ActionIcon>
                                    ) : null}
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                    {!billingPeriods?.length && (
                        <Table.Tr>
                            <Table.Td colSpan={5} align="center">
                                <Text c="dimmed">No billing history found.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Paper>
    );
}
