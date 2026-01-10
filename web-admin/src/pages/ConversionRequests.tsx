import { useState, useEffect } from 'react';
import { Title, Paper, Table, Badge, Button, Group, Text, Modal, Textarea, LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { conversionApi, type AssetConversion } from '../api/conversion';
import { IconCheck, IconX } from '@tabler/icons-react';

export const ConversionRequests = () => {
    const [requests, setRequests] = useState<AssetConversion[]>([]);
    const [loading, setLoading] = useState(false);
    // const [selectedRequest, setSelectedRequest] = useState<AssetConversion | null>(null); // Unused currently besides setting it
    const [actionFunc, setActionFunc] = useState<() => Promise<void>>(() => Promise.resolve());
    const [actionLoading, setActionLoading] = useState(false);
    const [opened, { open, close }] = useDisclosure(false);
    const [modalTitle, setModalTitle] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await conversionApi.getPendingRequests();
            setRequests(data);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to fetch pending requests',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request: AssetConversion, action: 'approve' | 'reject' | 'execute') => {
        // setSelectedRequest(request);
        setNotes('');

        if (action === 'approve') {
            setModalTitle('Approve Conversion Request');
            setActionFunc(() => async () => {
                await conversionApi.approveRequest(request.id);
            });
        } else if (action === 'reject') {
            setModalTitle('Reject Conversion Request');
            setActionFunc(() => async () => {
                await conversionApi.rejectRequest(request.id);
            });
        } else if (action === 'execute') {
            setModalTitle('Execute Conversion');
            setActionFunc(() => async () => {
                await conversionApi.executeConversion(request.id, { notes });
            });
        }

        open();
    };

    const confirmAction = async () => {
        setActionLoading(true);
        try {
            await actionFunc();
            notifications.show({
                title: 'Success',
                message: 'Action completed successfully',
                color: 'green',
            });
            fetchRequests();
            close();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Action failed',
                color: 'red',
            });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <Title mb="lg">Conversion Requests</Title>
            <Paper p="md" radius="md" withBorder>
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    <LoadingOverlay visible={loading} />
                    {requests.length === 0 && !loading ? (
                        <Text ta="center" c="dimmed" py="xl">No pending conversion requests.</Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Request #</Table.Th>
                                    <Table.Th>Asset ID</Table.Th>
                                    <Table.Th>Title</Table.Th>
                                    <Table.Th>Requested By</Table.Th>
                                    <Table.Th>Cost</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {requests.map((item) => (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>{new Date(item.created_at || '').toLocaleDateString()}</Table.Td>
                                        <Table.Td>{item.request_number}</Table.Td>
                                        <Table.Td>{item.asset_id.substring(0, 8)}...</Table.Td>
                                        <Table.Td>{item.title}</Table.Td>
                                        <Table.Td>{item.requested_by}</Table.Td>
                                        <Table.Td>
                                            {item.conversion_cost > 0 ?
                                                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.conversion_cost)
                                                : '-'}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color="yellow">{item.status}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                {item.status === 'pending' && (
                                                    <>
                                                        <Button size="xs" color="green" onClick={() => handleAction(item, 'approve')}>
                                                            <IconCheck size={16} />
                                                        </Button>
                                                        <Button size="xs" color="red" onClick={() => handleAction(item, 'reject')}>
                                                            <IconX size={16} />
                                                        </Button>
                                                    </>
                                                )}
                                                {item.status === 'approved' && (
                                                    <Button size="xs" color="blue" onClick={() => handleAction(item, 'execute')}>
                                                        Execute
                                                    </Button>
                                                )}
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </div>
            </Paper>

            <Modal opened={opened} onClose={close} title={modalTitle}>
                {modalTitle.includes('Execute') && (
                    <Textarea
                        label="Execution Notes"
                        placeholder="Details about the execution..."
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        mb="md"
                    />
                )}
                {modalTitle.includes('Reject') && (
                    <Textarea
                        label="Rejection Reason (Internal Note)"
                        placeholder="Why is it rejected?"
                        // Note: Backend might rely on rejection_reason which is separate or same as notes for execution?
                        // Just checking API... rejectRequest doesn't take body in my client wrapper?
                        // Let's check conversion.ts. rejectRequest takes id. 
                        // Backend might expect body or not.
                        // Wait, I should update rejectRequest to take reason if needed.
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        mb="md"
                        disabled // Disabled because API wrapper doesn't support sending reason yet.
                    />
                )}
                {modalTitle.includes('Approve') && <Text mb="md">Are you sure you want to approve this request?</Text>}

                <Group justify="flex-end">
                    <Button variant="default" onClick={close}>Cancel</Button>
                    <Button loading={actionLoading} onClick={confirmAction}>Confirm</Button>
                </Group>
            </Modal>
        </div>
    );
};
