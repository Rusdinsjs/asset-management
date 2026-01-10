import React, { useEffect, useState } from 'react';
import { Table, Badge, Text, LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { conversionApi, type AssetConversion } from '../../api/conversion';

interface ConversionHistoryProps {
    assetId: string;
}

export const ConversionHistory: React.FC<ConversionHistoryProps> = ({ assetId }) => {
    const [loading, setLoading] = useState(false);
    const [conversions, setConversions] = useState<AssetConversion[]>([]);

    useEffect(() => {
        fetchHistory();
    }, [assetId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await conversionApi.getAssetConversions(assetId);
            setConversions(data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to fetch conversion history',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'blue';
            case 'executed': return 'green';
            case 'rejected': return 'red';
            case 'pending': return 'yellow';
            default: return 'gray';
        }
    };

    if (conversions.length === 0 && !loading) {
        return <Text c="dimmed" ta="center" py="md">No conversion history found.</Text>;
    }

    return (
        <div style={{ position: 'relative', minHeight: '100px' }}>
            <LoadingOverlay visible={loading} />
            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Request #</Table.Th>
                        <Table.Th>Title</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Cost</Table.Th>
                        <Table.Th>Requested By</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {conversions.map((item) => (
                        <Table.Tr key={item.id}>
                            <Table.Td>{new Date(item.created_at || '').toLocaleDateString()}</Table.Td>
                            <Table.Td>{item.request_number}</Table.Td>
                            <Table.Td>{item.title}</Table.Td>
                            <Table.Td>
                                <Badge color={getStatusColor(item.status)}>{item.status}</Badge>
                            </Table.Td>
                            <Table.Td>
                                {item.conversion_cost > 0 ?
                                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.conversion_cost)
                                    : '-'}
                            </Table.Td>
                            <Table.Td>{item.requested_by}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </div>
    );
};
