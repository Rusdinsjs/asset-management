import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Title,
    Button,
    Group,
    Paper,
    Table,
    ActionIcon,
    Pagination,
    Drawer,
    Tabs,
    Stack,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../api/work-order';
import type { WorkOrder } from '../api/work-order';
import { WorkOrderForm } from './WorkOrderForm';
import { notifications } from '@mantine/notifications';
import { PermissionGate } from '../components/PermissionGate';
import { StatusBadge } from '../components/common/StatusBadge';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useEffect } from 'react';

export function WorkOrders() {
    const [page, setPage] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>('active');

    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        if (lastMessage && (lastMessage.event_type === 'WORK_ORDER_CREATED' || lastMessage.event_type === 'WORK_ORDER_COMPLETED')) {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        }
    }, [lastMessage, queryClient]);

    // Fetch Maintenance
    const { data: workOrdersData, isLoading } = useQuery({
        queryKey: ['work-orders', page, activeTab],
        queryFn: async () => {
            // Basic filtering based on tab

            if (activeTab === 'overdue') {
                const response = await workOrderApi.listOverdue();
                // Normalize to a common structure or return as is and handle in component
                return response;
            }

            const response = await workOrderApi.list({
                page,
                per_page: 20,
                // status: activeTab === 'history' ? 'completed' : undefined
            });
            return response;
        },
    });

    // Correctly handle the API response structure difference
    // Note: workOrderApi returns WorkOrder[] directly for list endpoints for now, check pagination wrap
    // The previous implementation assumed pagination wrapper. Let's check workOrderApi implementation.
    // list -> response.data which is Vec<WorkOrder>. No pagination meta? Backend list_work_orders returns Json<Vec<WorkOrder>> directly.
    // Pagination params are accepted but backend doesn't seem to wrap result in PaginatedResponse yet based on handler code visible?
    // Handler: `Result<Json<Vec<WorkOrder>>, AppError>`
    // So we don't have total pages.

    const records: WorkOrder[] = (workOrdersData as any) || [];

    const totalPages = 1; // (maintenanceData as any)?.data?.pagination?.total_pages || 1; // TODO: Backend support for pagination meta

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: workOrderApi.delete, // This calls cancel internally for now
        onSuccess: () => {
            notifications.show({ title: 'Deleted', message: 'Work Order deleted (cancelled)', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        },
    });

    const handleEdit = (id: string) => {
        setSelectedId(id);
        setDrawerOpen(true);
    };

    const handleCreate = () => {
        setSelectedId(null);
        setDrawerOpen(true);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this Work Order?')) {
            deleteMutation.mutate(id);
        }
    };



    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>Work Orders</Title>
                <PermissionGate requiredLevel={3}>
                    <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
                        New Work Order
                    </Button>
                </PermissionGate>
            </Group>

            <Paper p="md" withBorder>
                <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                    <Tabs.List>
                        <Tabs.Tab value="active">Active & Planned</Tabs.Tab>
                        <Tabs.Tab value="overdue" leftSection={<IconAlertTriangle size={14} color="red" />}>
                            Overdue
                        </Tabs.Tab>
                        <Tabs.Tab value="history">History</Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Asset</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Approval</Table.Th>
                            <Table.Th>Scheduled</Table.Th>
                            <Table.Th>Cost</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {isLoading ? (
                            <Table.Tr><Table.Td colSpan={6} align="center">Loading...</Table.Td></Table.Tr>
                        ) : records.length === 0 ? (
                            <Table.Tr><Table.Td colSpan={6} align="center">No records found</Table.Td></Table.Tr>
                        ) : (
                            records.map((record: any) => (
                                <Table.Tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/work-orders/${record.id}`)}>
                                    <Table.Td>{(record as any).asset?.name || record.asset_id}</Table.Td>
                                    <Table.Td>{record.wo_type}</Table.Td>
                                    <Table.Td>
                                        <StatusBadge status={record.status} />
                                    </Table.Td>
                                    <Table.Td>
                                        <StatusBadge status="-" />
                                        {/* Approval status check logic needs update based on new WO schema */}
                                    </Table.Td>
                                    <Table.Td>{record.scheduled_date}</Table.Td>
                                    <Table.Td>
                                        {record.estimated_cost ? `Rp ${Number(record.estimated_cost).toLocaleString('id-ID')}` : '-'}
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <PermissionGate requiredLevel={3}>
                                                <ActionIcon variant="subtle" color="blue" onClick={(e) => { e.stopPropagation(); handleEdit(record.id); }}>
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </PermissionGate>
                                            <PermissionGate requiredLevel={2}>
                                                <ActionIcon variant="subtle" color="red" onClick={(e) => handleDelete(record.id, e)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </PermissionGate>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>

                {activeTab !== 'overdue' && (
                    <Group justify="center" mt="md">
                        <Pagination total={totalPages} value={page} onChange={setPage} />
                    </Group>
                )}
            </Paper>

            <Drawer
                opened={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={selectedId ? "Edit Work Order" : "New Work Order"}
                position="right"
                size="md"
            >
                {drawerOpen && (
                    <WorkOrderForm
                        maintenanceId={selectedId}
                        onClose={() => setDrawerOpen(false)}
                        onSuccess={() => {
                            setDrawerOpen(false);
                            // Refresh
                            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
                        }}
                    />
                )}
            </Drawer>
        </Stack>
    );
}
