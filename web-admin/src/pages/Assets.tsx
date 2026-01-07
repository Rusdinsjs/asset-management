import { Table, Badge, Title, Group, Button, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { api } from '../api/client';
import { useState } from 'react';

export function Assets() {
    const [search, setSearch] = useState('');

    const { data } = useQuery({
        queryKey: ['assets', search],
        queryFn: async () => {
            const params = search ? { search } : {};
            const res = await api.get('/assets', { params });
            return res.data;
        },
    });

    const assets = data?.data || [];

    const rows = assets.map((asset: any) => (
        <Table.Tr key={asset.id}>
            <Table.Td>{asset.asset_code}</Table.Td>
            <Table.Td>{asset.name}</Table.Td>
            <Table.Td>{asset.brand} {asset.model}</Table.Td>
            <Table.Td>
                <Badge
                    color={
                        asset.status === 'in_inventory' ? 'blue' :
                            asset.status === 'deployed' ? 'green' :
                                asset.status === 'in_maintenance' ? 'orange' : 'gray'
                    }
                >
                    {asset.status.replace('_', ' ')}
                </Badge>
            </Table.Td>
            <Table.Td>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(asset.purchase_price)}
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <div>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Assets</Title>
                <Button leftSection={<IconPlus size={16} />}>Add Asset</Button>
            </Group>

            <TextInput
                placeholder="Search assets..."
                mb="md"
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Brand/Model</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Value</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
            </Table>
        </div>
    );
}
