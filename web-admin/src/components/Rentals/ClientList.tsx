import { useQuery } from '@tanstack/react-query';
import { Table, Paper, Button, Group, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { rentalApi } from '../../api/rental';

export function ClientList() {
    const { data: clients } = useQuery({
        queryKey: ['rental-clients'],
        queryFn: rentalApi.listClients
    });

    return (
        <Paper p="md" shadow="sm" withBorder>
            <Group justify="space-between" mb="md">
                <Title order={4}>Clients</Title>
                <Button leftSection={<IconPlus size={16} />}>
                    Add Client
                </Button>
            </Group>

            <Table verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Phone</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {Array.isArray(clients) && clients.map((client) => (
                        <Table.Tr key={client.id}>
                            <Table.Td>{client.name}</Table.Td>
                            <Table.Td>{client.code}</Table.Td>
                            <Table.Td>{client.email}</Table.Td>
                            <Table.Td>{client.phone}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Paper>
    );
}
