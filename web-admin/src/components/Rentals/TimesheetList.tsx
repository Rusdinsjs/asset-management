import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Select, Group, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { StatusBadge } from '../common/StatusBadge';
import { timesheetApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';

interface TimesheetListProps {
    rentalId?: string;
}

export function TimesheetList({ rentalId }: TimesheetListProps) {
    const [selectedRentalInternal, setSelectedRentalInternal] = useState<string | null>(null);
    const activeRentalId = rentalId || selectedRentalInternal;

    // Fetch Active Rentals for Dropdown (only if no prop provided)
    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active'),
        enabled: !rentalId
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.asset_name}` })) || [];

    // Fetch Timesheets
    const { data: timesheets, isLoading } = useQuery({
        queryKey: ['timesheets', activeRentalId],
        queryFn: () => activeRentalId ? timesheetApi.listByRental(activeRentalId) : Promise.resolve([]),
        enabled: !!activeRentalId
    });

    return (
        <Paper p="md" shadow="sm" withBorder pos="relative">
            <LoadingOverlay visible={isLoading} />

            {!rentalId && (
                <Group mb="md">
                    <Select
                        placeholder="Select Rental Asset"
                        data={rentalOptions}
                        value={selectedRentalInternal}
                        onChange={setSelectedRentalInternal}
                        searchable
                        w={300}
                    />
                </Group>
            )}

            {activeRentalId && (
                <Table verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Operating Hours</Table.Th>
                            <Table.Th>Standby</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {timesheets?.map((ts) => (
                            <Table.Tr key={ts.id}>
                                <Table.Td>{ts.work_date}</Table.Td>
                                <Table.Td>{ts.operating_hours}</Table.Td>
                                <Table.Td>{ts.standby_hours}</Table.Td>
                                <Table.Td>
                                    <StatusBadge status={ts.status} />
                                </Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <ActionIcon variant="subtle" title="View Details">
                                            <IconEye size={16} />
                                        </ActionIcon>
                                        {ts.status === 'submitted' && (
                                            <>
                                                <ActionIcon color="teal" variant="light" title="Verify">
                                                    <IconCheck size={16} />
                                                </ActionIcon>
                                                <ActionIcon color="red" variant="light" title="Reject">
                                                    <IconX size={16} />
                                                </ActionIcon>
                                            </>
                                        )}
                                        {ts.status === 'verified' && (
                                            <ActionIcon color="blue" variant="filled" title="Supervisor Approve" onClick={() => {
                                                // TODO: Implement actual approval modal/call
                                            }}>
                                                <IconCheck size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!timesheets?.length && (
                            <Table.Tr>
                                <Table.Td colSpan={5} align="center">No timesheets found</Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            )}
        </Paper>
    );
}
