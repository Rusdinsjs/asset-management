import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Badge, Group, ActionIcon, Button, Text, LoadingOverlay, Title } from '@mantine/core';
import { IconEye, IconPlus } from '@tabler/icons-react';
import { rentalApi } from '../../api/rental';
import { useNavigate } from 'react-router-dom';

export function RentalList() {
    const navigate = useNavigate();
    const { data: rentals, isLoading } = useQuery({
        queryKey: ['rentals', 'active'],
        queryFn: () => rentalApi.listRentals('active')
    });

    return (
        <Paper p="md" shadow="sm" withBorder>
            <Group justify="space-between" mb="md">
                <Title order={4}>Active Rentals</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/rentals/new')}>
                    New Rental
                </Button>
            </Group>

            <LoadingOverlay visible={isLoading} />

            <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Rental No.</Table.Th>
                        <Table.Th>Asset</Table.Th>
                        <Table.Th>Client</Table.Th>
                        <Table.Th>Period</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Rate</Table.Th>
                        <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rentals?.map((rental) => (
                        <Table.Tr key={rental.id}>
                            <Table.Td>{rental.rental_number}</Table.Td>
                            <Table.Td>{rental.asset_name}</Table.Td>
                            <Table.Td>{rental.client_name}</Table.Td>
                            <Table.Td>
                                <Text size="sm">{rental.start_date}</Text>
                                <Text size="xs" c="dimmed">{rental.end_date || 'Open'}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Badge color="blue">{rental.status}</Badge>
                            </Table.Td>
                            <Table.Td>
                                {rental.daily_rate?.toLocaleString()} / day
                            </Table.Td>
                            <Table.Td>
                                <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => navigate(`/rentals/${rental.id}`)}
                                >
                                    <IconEye size={16} />
                                </ActionIcon>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                    {!rentals?.length && !isLoading && (
                        <Table.Tr>
                            <Table.Td colSpan={7} align="center">No active rentals found</Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Paper>
    );
}
