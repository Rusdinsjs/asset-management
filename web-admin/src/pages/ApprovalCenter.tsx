import { useEffect, useState } from 'react';
import { Title, Container, Table, Badge, Button, Group, Text, Card, Tabs, Textarea, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { approvalsApi } from '../api/approvals';
import type { ApprovalRequest } from '../api/approvals';
import { useDisclosure } from '@mantine/hooks';

export function ApprovalCenter() {
    const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
    const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>('pending');

    // Action Modal
    const [opened, { open, close }] = useDisclosure(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            if (activeTab === 'pending') {
                // Mock role level or get from store. Backend endpoint uses token context.
                // We pass generic 0 or let backend handle it? 
                // The API listPending implementation calls /approvals/pending without params
                const data = await approvalsApi.listPending(0);
                setPendingRequests(data);
            } else {
                const data = await approvalsApi.listMyRequests();
                setMyRequests(data);
            }
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load requests', color: 'red' });
        }
    };

    const handleAction = (request: ApprovalRequest, type: 'approve' | 'reject') => {
        setSelectedRequest(request);
        setActionType(type);
        setActionNotes('');
        open();
    };

    const submitAction = async () => {
        if (!selectedRequest) return;
        try {
            if (actionType === 'approve') {
                await approvalsApi.approve(selectedRequest.id, actionNotes);
                notifications.show({ title: 'Success', message: 'Request approved', color: 'green' });
            } else {
                await approvalsApi.reject(selectedRequest.id, actionNotes);
                notifications.show({ title: 'Success', message: 'Request rejected', color: 'green' });
            }
            close();
            loadData();
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to process request', color: 'red' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED_L1': return 'blue';
            case 'APPROVED_L2': return 'green';
            case 'REJECTED': return 'red';
            case 'PENDING': return 'yellow';
            default: return 'gray';
        }
    };

    const rows = (activeTab === 'pending' ? pendingRequests : myRequests).map((req) => (
        <Table.Tr key={req.id}>
            <Table.Td>{new Date(req.requested_at).toLocaleDateString()}</Table.Td>
            <Table.Td>{req.resource_type}</Table.Td>
            <Table.Td>{req.action_type}</Table.Td>
            <Table.Td>
                <Badge color={getStatusColor(req.status)}>{req.status}</Badge>
            </Table.Td>
            <Table.Td>
                {/* Simplified Data View */}
                <Text size="xs" truncate w={200}>{JSON.stringify(req.data_snapshot)}</Text>
            </Table.Td>
            <Table.Td>
                {activeTab === 'pending' && (
                    <Group gap="xs">
                        <Button size="xs" color="green" onClick={() => handleAction(req, 'approve')}>Approve</Button>
                        <Button size="xs" color="red" variant="outline" onClick={() => handleAction(req, 'reject')}>Reject</Button>
                    </Group>
                )}
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl">
            <Title order={2} mb="md">Approval Center</Title>

            <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                <Tabs.List>
                    <Tabs.Tab value="pending">Pending Approvals</Tabs.Tab>
                    <Tabs.Tab value="my_requests">My Requests</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            <Card withBorder>
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Resource</Table.Th>
                            <Table.Th>Action</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Data</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
            </Card>

            <Modal opened={opened} onClose={close} title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Request`}>
                <Text size="sm" mb="md">
                    Are you sure you want to {actionType} this request?
                </Text>
                <Textarea
                    label="Notes"
                    placeholder="Optional notes..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.currentTarget.value)}
                    mb="md"
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={close}>Cancel</Button>
                    <Button color={actionType === 'approve' ? 'green' : 'red'} onClick={submitAction}>
                        Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </Group>
            </Modal>
        </Container>
    );
}
