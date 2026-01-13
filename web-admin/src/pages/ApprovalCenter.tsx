import { useState } from 'react';
import {
    Title,
    Container,
    Table,
    Badge,
    Button,
    Group,
    Text,
    Card,
    Tabs,
    Textarea,
    Modal,
    Select,
    Stack,
    SimpleGrid,
    Paper,
    ThemeIcon,
    Loader,
    Center,
    Alert,
    Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    IconClock,
    IconCheck,
    IconX,
    IconRefresh,
    IconTool,
    IconClipboardList,
    IconArrowRight,
    IconUser,
    IconCalendar,
    IconInfoCircle,
    IconTruck, // Added IconTruck
    IconClockCheck, // Added IconClockCheck
} from '@tabler/icons-react';
import { approvalApi } from '../api/approval';
import type { ApprovalRequest } from '../api/approval';

// Resource type labels and icons
const resourceTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    lifecycle_transition: { label: 'Lifecycle', icon: <IconRefresh size={16} />, color: 'violet' },
    work_order: { label: 'Work Order', icon: <IconTool size={16} />, color: 'blue' },
    asset: { label: 'Asset', icon: <IconClipboardList size={16} />, color: 'green' },
    rental_request: { label: 'Rental Request', icon: <IconTruck size={16} />, color: 'orange' },
    timesheet_verification: { label: 'Timesheet', icon: <IconClockCheck size={16} />, color: 'teal' },
    loan: { label: 'Loan Request', icon: <IconArrowRight size={16} />, color: 'cyan' },
};

// State colors for lifecycle
const stateColors: Record<string, string> = {
    planning: 'gray',
    procurement: 'blue',
    received: 'cyan',
    in_inventory: 'green',
    deployed: 'teal',
    under_maintenance: 'yellow',
    under_repair: 'orange',
    under_conversion: 'violet',
    retired: 'gray',
    disposed: 'dark',
    lost_stolen: 'red',
    archived: 'gray',
};

// Component to render module-specific details
function RequestDetails({ request }: { request: ApprovalRequest }) {
    const data = request.data_snapshot;

    if (request.resource_type === 'lifecycle_transition') {
        return (
            <Stack gap={4}>
                <Group gap="xs">
                    <Badge size="sm" color={stateColors[data?.from_state] || 'gray'}>
                        {data?.from_state?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                    <IconArrowRight size={14} />
                    <Badge size="sm" color={stateColors[data?.to_state] || 'gray'}>
                        {data?.to_state?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                </Group>
                {data?.reason && (
                    <Text size="xs" c="dimmed">Reason: {data.reason}</Text>
                )}
            </Stack>
        );
    }

    if (request.resource_type === 'work_order') {
        return (
            <Stack gap={4}>
                <Text size="sm" fw={500}>{data?.title || 'Work Order'}</Text>
                {data?.priority && (
                    <Badge size="sm" color={data.priority === 'high' ? 'red' : data.priority === 'medium' ? 'yellow' : 'green'}>
                        {data.priority}
                    </Badge>
                )}
                {data?.estimated_cost && (
                    <Text size="xs" c="dimmed">Est: Rp {Number(data.estimated_cost).toLocaleString()}</Text>
                )}
            </Stack>
        );
    }

    if (request.resource_type === 'rental_request') {
        return (
            <Stack gap={4}>
                <Text size="sm" fw={500}>{data?.client_name || 'Unknown Client'}</Text>
                <Group gap="xs">
                    <IconTruck size={14} color="gray" />
                    <Text size="xs" c="dimmed">{data?.asset_name || 'Unknown Asset'}</Text>
                </Group>
                <Text size="xs" c="dimmed">
                    {data?.start_date} - {data?.expected_end_date || 'N/A'}
                </Text>
            </Stack>
        );
    }

    if (request.resource_type === 'timesheet_verification') {
        return (
            <Stack gap={4}>
                <Text size="sm" fw={500}>{data?.rental_number || 'Unknown Rental'}</Text>
                <Group gap="xs">
                    <IconCalendar size={14} color="gray" />
                    <Text size="xs" c="dimmed">Date: {data?.work_date}</Text>
                </Group>
                <Text size="xs" c="dimmed">
                    Hours: {data?.operating_hours} hrs
                </Text>
            </Stack>
        );
    }

    if (request.resource_type === 'asset') {
        return (
            <Stack gap={4}>
                <Text size="sm" fw={500}>{data?.name || data?.asset_name || 'Asset'}</Text>
                <Group gap="xs">
                    <IconClipboardList size={14} color="gray" />
                    <Text size="xs" c="dimmed">SN: {data?.serial_number || 'N/A'}</Text>
                </Group>
                <Badge size="xs" color="gray" variant="outline">{data?.category || 'Unknown Category'}</Badge>
            </Stack>
        );
    }

    if (request.resource_type === 'loan') {
        return (
            <Stack gap={4}>
                <Group gap="xs">
                    <IconArrowRight size={14} color="gray" />
                    <Text size="xs" c="dimmed">Date: {data?.loan_date}</Text>
                </Group>
                <Text size="xs" c="dimmed">
                    Return: {data?.return_date || 'N/A'}
                </Text>
            </Stack>
        );
    }

    // Default: show truncated JSON
    return (
        <Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>
            {JSON.stringify(data)}
        </Text>
    );
}

// Statistics card
function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group>
                <ThemeIcon color={color} size="lg" radius="md">
                    {icon}
                </ThemeIcon>
                <div>
                    <Text size="xs" c="dimmed">{title}</Text>
                    <Text size="xl" fw={700}>{value}</Text>
                </div>
            </Group>
        </Paper>
    );
}

export function ApprovalCenter() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string | null>('pending');
    const [filterType, setFilterType] = useState<string | null>('all');

    // Action Modal
    const [opened, { open, close }] = useDisclosure(false);
    const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

    // Queries
    const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
        queryKey: ['approvals', 'pending'],
        queryFn: approvalApi.listPending,
        enabled: activeTab === 'pending',
    });

    const { data: myRequests = [], isLoading: loadingMy } = useQuery({
        queryKey: ['approvals', 'my-requests'],
        queryFn: approvalApi.listMyRequests,
        enabled: activeTab === 'my_requests',
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes?: string }) => approvalApi.approve(id, notes),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Request approved', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            close();
        },
        onError: () => {
            notifications.show({ title: 'Error', message: 'Failed to approve request', color: 'red' });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, notes }: { id: string; notes: string }) => approvalApi.reject(id, notes),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Request rejected', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            close();
        },
        onError: () => {
            notifications.show({ title: 'Error', message: 'Failed to reject request', color: 'red' });
        },
    });

    const handleAction = (request: ApprovalRequest, type: 'approve' | 'reject') => {
        setSelectedRequest(request);
        setActionType(type);
        setActionNotes('');
        open();
    };

    const handleViewDetail = (request: ApprovalRequest) => {
        setSelectedRequest(request);
        openDetail();
    };

    const submitAction = () => {
        if (!selectedRequest) return;
        if (actionType === 'approve') {
            approveMutation.mutate({ id: selectedRequest.id, notes: actionNotes || undefined });
        } else {
            rejectMutation.mutate({ id: selectedRequest.id, notes: actionNotes || 'Rejected' });
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

    const currentData = activeTab === 'pending' ? pendingRequests : myRequests;
    const isLoading = activeTab === 'pending' ? loadingPending : loadingMy;

    // Filter data
    const filteredData = filterType === 'all'
        ? currentData
        : currentData.filter(r => r.resource_type === filterType);

    // Stats
    const lifecycleCount = pendingRequests.filter(r => r.resource_type === 'lifecycle_transition').length;
    const workOrderCount = pendingRequests.filter(r => r.resource_type === 'work_order').length;
    const rentalCount = pendingRequests.filter(r => r.resource_type === 'rental_request').length;
    const timesheetCount = pendingRequests.filter(r => r.resource_type === 'timesheet_verification').length;
    const assetCount = pendingRequests.filter(r => r.resource_type === 'asset').length;
    const otherCount = pendingRequests.filter(r => !['lifecycle_transition', 'work_order', 'rental_request', 'timesheet_verification', 'asset'].includes(r.resource_type)).length;

    return (
        <Container size="xl">
            <Group justify="space-between" mb="md">
                <Title order={2}>Approval Center</Title>
                <Badge size="lg" color="yellow" variant="light">
                    {pendingRequests.length} Pending
                </Badge>
            </Group>

            {/* Stats Cards */}
            {activeTab === 'pending' && (
                <SimpleGrid cols={{ base: 1, sm: 6 }} mb="lg">
                    <StatCard
                        title="Lifecycle Transitions"
                        value={lifecycleCount}
                        color="violet"
                        icon={<IconRefresh size={20} />}
                    />
                    <StatCard
                        title="Work Orders"
                        value={workOrderCount}
                        color="blue"
                        icon={<IconTool size={20} />}
                    />
                    <StatCard
                        title="Rental Requests"
                        value={rentalCount}
                        color="orange"
                        icon={<IconTruck size={20} />}
                    />
                    <StatCard
                        title="Timesheets"
                        value={timesheetCount}
                        color="teal"
                        icon={<IconClockCheck size={20} />}
                    />
                    <StatCard
                        title="Assets"
                        value={assetCount}
                        color="green"
                        icon={<IconClipboardList size={20} />}
                    />
                    <StatCard
                        title="Other"
                        value={otherCount}
                        color="gray"
                        icon={<IconClipboardList size={20} />}
                    />
                </SimpleGrid>
            )}

            <Group mb="md" justify="space-between">
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
                            Pending Approvals
                        </Tabs.Tab>
                        <Tabs.Tab value="my_requests" leftSection={<IconUser size={16} />}>
                            My Requests
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                <Select
                    placeholder="Filter by type"
                    value={filterType}
                    onChange={setFilterType}
                    data={[
                        { value: 'all', label: 'All Types' },
                        { value: 'lifecycle_transition', label: 'Lifecycle' },
                        { value: 'work_order', label: 'Work Order' },
                        { value: 'rental_request', label: 'Rental Request' },
                        { value: 'timesheet_verification', label: 'Timesheet' },
                        { value: 'asset', label: 'Asset' },
                        { value: 'loan', label: 'Loan' },
                    ]}
                    w={180}
                    size="sm"
                />
            </Group>

            <Card withBorder>
                {isLoading ? (
                    <Center py="xl">
                        <Loader />
                    </Center>
                ) : filteredData.length === 0 ? (
                    <Alert icon={<IconInfoCircle size={16} />} color="gray">
                        No {activeTab === 'pending' ? 'pending approvals' : 'requests'} found.
                    </Alert>
                ) : (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Action</Table.Th>
                                <Table.Th>Details</Table.Th>
                                <Table.Th>Level</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Requester</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredData.map((req) => {
                                const config = resourceTypeConfig[req.resource_type] || {
                                    label: req.resource_type,
                                    icon: <IconClipboardList size={16} />,
                                    color: 'gray'
                                };

                                return (
                                    <Table.Tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(req)}>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <IconCalendar size={14} />
                                                <Text size="sm">{new Date(req.created_at).toLocaleDateString()}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={config.color} variant="light" leftSection={config.icon}>
                                                {config.label}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{req.action_type.replace(/_/g, ' ')}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <RequestDetails request={req} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge size="sm" color={req.current_approval_level === 1 ? 'blue' : 'green'}>
                                                L{req.current_approval_level}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={getStatusColor(req.status)}>{req.status}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{req.requester_name || 'Unknown'}</Text>
                                        </Table.Td>
                                        <Table.Td onClick={(e) => e.stopPropagation()}>
                                            {activeTab === 'pending' && (
                                                <Group gap="xs">
                                                    <Button
                                                        size="xs"
                                                        color="green"
                                                        leftSection={<IconCheck size={14} />}
                                                        onClick={() => handleAction(req, 'approve')}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        color="red"
                                                        variant="outline"
                                                        leftSection={<IconX size={14} />}
                                                        onClick={() => handleAction(req, 'reject')}
                                                    >
                                                        Reject
                                                    </Button>
                                                </Group>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                )}
            </Card>

            {/* Action Modal */}
            <Modal opened={opened} onClose={close} title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Request`}>
                {selectedRequest && (
                    <Stack>
                        <Card withBorder p="sm">
                            <Group gap="xs" mb="xs">
                                <Text size="sm" fw={500}>Type:</Text>
                                <Badge>{resourceTypeConfig[selectedRequest.resource_type]?.label || selectedRequest.resource_type}</Badge>
                            </Group>
                            <Group gap="xs" mb="xs">
                                <Text size="sm" fw={500}>Action:</Text>
                                <Text size="sm">{selectedRequest.action_type.replace(/_/g, ' ')}</Text>
                            </Group>
                            <RequestDetails request={selectedRequest} />
                        </Card>

                        <Textarea
                            label="Notes"
                            placeholder={actionType === 'reject' ? 'Reason for rejection (required)' : 'Optional notes...'}
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.currentTarget.value)}
                            required={actionType === 'reject'}
                        />

                        <Group justify="flex-end">
                            <Button variant="default" onClick={close}>Cancel</Button>
                            <Button
                                color={actionType === 'approve' ? 'green' : 'red'}
                                onClick={submitAction}
                                loading={approveMutation.isPending || rejectMutation.isPending}
                                disabled={actionType === 'reject' && !actionNotes}
                            >
                                Confirm {actionType === 'approve' ? 'Approve' : 'Reject'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Detail Modal */}
            <Modal opened={detailOpened} onClose={closeDetail} title="Request Details" size="lg">
                {selectedRequest && (
                    <Stack>
                        <SimpleGrid cols={2}>
                            <div>
                                <Text size="sm" c="dimmed">Request ID</Text>
                                <Text size="sm" ff="monospace">{selectedRequest.id}</Text>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Created At</Text>
                                <Text size="sm">{new Date(selectedRequest.created_at).toLocaleString()}</Text>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Resource Type</Text>
                                <Badge>{resourceTypeConfig[selectedRequest.resource_type]?.label || selectedRequest.resource_type}</Badge>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Status</Text>
                                <Badge color={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Approval Level</Text>
                                <Badge color={selectedRequest.current_approval_level === 1 ? 'blue' : 'green'}>
                                    Level {selectedRequest.current_approval_level}
                                </Badge>
                            </div>
                            <div>
                                <Text size="sm" c="dimmed">Requester</Text>
                                <Text size="sm">{selectedRequest.requester_name || selectedRequest.requested_by}</Text>
                            </div>
                        </SimpleGrid>

                        <Divider my="sm" label="Details" />

                        <RequestDetails request={selectedRequest} />

                        <Divider my="sm" label="Data Snapshot" />

                        <Card withBorder p="sm" bg="gray.0">
                            <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(selectedRequest.data_snapshot, null, 2)}
                            </Text>
                        </Card>

                        {(selectedRequest.notes_l1 || selectedRequest.notes_l2) && (
                            <>
                                <Divider my="sm" label="Approval Notes" />
                                {selectedRequest.notes_l1 && (
                                    <Card withBorder p="sm">
                                        <Text size="xs" c="dimmed">L1 Notes:</Text>
                                        <Text size="sm">{selectedRequest.notes_l1}</Text>
                                    </Card>
                                )}
                                {selectedRequest.notes_l2 && (
                                    <Card withBorder p="sm">
                                        <Text size="xs" c="dimmed">L2 Notes:</Text>
                                        <Text size="sm">{selectedRequest.notes_l2}</Text>
                                    </Card>
                                )}
                            </>
                        )}
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}
