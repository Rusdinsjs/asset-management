import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Select, Badge, Button, Group, ActionIcon, Modal } from '@mantine/core';
import { IconReceipt, IconEye } from '@tabler/icons-react';
import { billingApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';
import { BillingReviewDetail } from './BillingReviewDetail';

export function BillingList() {
    const [selectedRental, setSelectedRental] = useState<string | null>(null);
    const [viewingBillingId, setViewingBillingId] = useState<string | null>(null);

    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.asset_name}` })) || [];

    const { data: billingPeriods } = useQuery({
        queryKey: ['billing', selectedRental],
        queryFn: () => selectedRental ? billingApi.listByRental(selectedRental) : Promise.resolve([]),
        enabled: !!selectedRental
    });

    return (
        <>
            <Paper p="md" shadow="sm" withBorder>
                <Group mb="md" justify="space-between">
                    <Select
                        placeholder="Select Rental Asset"
                        data={rentalOptions}
                        value={selectedRental}
                        onChange={setSelectedRental}
                        searchable
                        w={300}
                    />
                    <Button leftSection={<IconReceipt size={16} />} disabled={!selectedRental}>
                        Generate New Billing Period
                    </Button>
                </Group>

                {selectedRental && (
                    <Table verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Period</Table.Th>
                                <Table.Th>Total Amount</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Invoice No.</Table.Th>
                                <Table.Th>Action</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {billingPeriods?.map((bP) => (
                                <Table.Tr key={bP.id}>
                                    <Table.Td>{bP.period_start} - {bP.period_end}</Table.Td>
                                    <Table.Td>{bP.total_amount?.toLocaleString()}</Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={
                                                bP.status === 'invoiced' ? 'green' :
                                                    bP.status === 'approved' ? 'blue' :
                                                        bP.status === 'calculated' ? 'orange' : 'gray'
                                            }
                                        >
                                            {bP.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>{bP.invoice_number || '-'}</Table.Td>
                                    <Table.Td>
                                        <ActionIcon
                                            variant="light"
                                            title="Verify Details"
                                            onClick={() => setViewingBillingId(bP.id)}
                                        >
                                            <IconEye size={16} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Paper>

            <Modal
                opened={!!viewingBillingId}
                onClose={() => setViewingBillingId(null)}
                size="70%"
                title="Automated Billing Verification Detail"
            >
                {viewingBillingId && (
                    <BillingReviewDetail
                        billingId={viewingBillingId}
                        onClose={() => setViewingBillingId(null)}
                    />
                )}
            </Modal>
        </>
    );
}
