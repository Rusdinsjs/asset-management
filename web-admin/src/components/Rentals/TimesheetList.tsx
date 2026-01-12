import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Select, Badge, Group, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconCheck, IconX, IconEye } from '@tabler/icons-react';
import { timesheetApi } from '../../api/timesheet';
import { rentalApi } from '../../api/rental';

export function TimesheetList() {
    const [selectedRental, setSelectedRental] = useState<string | null>(null);

    // Fetch Active Rentals for Dropdown
    const { data: rentals } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    const rentalOptions = rentals?.map(r => ({ value: r.id, label: `${r.rental_number} - ${r.asset_name}` })) || [];

    // Fetch Timesheets
    const { data: timesheets, isLoading } = useQuery({
        queryKey: ['timesheets', selectedRental],
        queryFn: () => selectedRental ? timesheetApi.listByRental(selectedRental) : Promise.resolve([]),
        enabled: !!selectedRental
    });

    return (
        <Paper p="md" shadow="sm" withBorder pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Group mb="md">
                <Select
                    placeholder="Select Rental Asset"
                    data={rentalOptions}
                    value={selectedRental}
                    onChange={setSelectedRental}
                    searchable
                    w={300}
                />
            </Group>

            {selectedRental && (
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
                                    <Badge
                                        color={
                                            ts.status === 'approved' ? 'green' :
                                                ts.status === 'verified' ? 'blue' :
                                                    ts.status === 'rejected' ? 'red' : 'gray'
                                        }
                                    >
                                        {ts.status}
                                    </Badge>
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
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Paper>
    );
}
