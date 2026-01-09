import { useState } from 'react';
import {
    Title,
    Button,
    Group,
    Paper,
    Table,
    Badge,
    ActionIcon,
    Pagination,
    Drawer,
    Tabs,
    Stack,
    Tooltip,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconAlertTriangle, IconClock } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../api/maintenance';
import { WorkOrderForm } from './WorkOrderForm';
import { notifications } from '@mantine/notifications';
import { PermissionGate } from '../components/PermissionGate';

export function WorkOrders() {
    const [page, setPage] = useState(1);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>('active');

    const queryClient = useQueryClient();

    // Fetch Maintenance
    const { data: maintenanceData, isLoading } = useQuery({
        queryKey: ['maintenance', page, activeTab],
        queryFn: () => {
            // Basic filtering based on tab
            // Since API is simple list, we filter client side or backend should support status filter?
            // Backend has `status` in params.
            // Backend has `status` in params.
            // Actually let's just list all and maybe filter in UI or backend.
            // Actually let's just list all and maybe filter in UI or backend.
            // Handler only checks `params.status`.
            // If tab is 'overdue', we use specific endpoint.
            if (activeTab === 'overdue') return maintenanceApi.listOverdue();

            return maintenanceApi.list({
                page,
                per_page: 20,
                // status: activeTab === 'history' ? 'completed' : undefined
            });
        },
    });

    // TODO: The API response structure for `listOverdue` matches `list`?
    // Handler `list_overdue_maintenance` returns `Vec<MaintenanceSummary>`.
    // Handler `list` returns `PaginatedResponse`.
    // We need to handle this diff.
    const records = activeTab === 'overdue'
        ? (maintenanceData as any) // Overdue returns array directly from handler (ApiResponse<Vec>)
        : (maintenanceData as any)?.data || []; // List returns PaginatedResponse inside ApiResponse

    const totalPages = (maintenanceData as any)?.pagination?.total_pages || 1;

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: maintenanceApi.delete,
        onSuccess: () => {
            notifications.show({ title: 'Deleted', message: 'Work Order deleted', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
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

    const statusColors: Record<string, string> = {
        planned: 'blue',
        in_progress: 'orange',
        completed: 'green',
        cancelled: 'gray',
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
                                <Table.Tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => handleEdit(record.id)}>
                                    <Table.Td>{record.asset_name}</Table.Td>
                                    <Table.Td>{record.type_name || '-'}</Table.Td>
                                    <Table.Td>
                                        <Badge color={statusColors[record.status] || 'gray'}>
                                            {record.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        {record.approval_status === 'pending_approval' ? (
                                            <Tooltip label="Menunggu Persetujuan Biaya">
                                                <Badge color="yellow" leftSection={<IconClock size={12} />}>
                                                    Pending
                                                </Badge>
                                            </Tooltip>
                                        ) : record.approval_status === 'approved' ? (
                                            <Badge color="green">Approved</Badge>
                                        ) : record.approval_status === 'rejected' ? (
                                            <Badge color="red">Rejected</Badge>
                                        ) : (
                                            <Badge color="gray" variant="light">-</Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>{record.scheduled_date}</Table.Td>
                                    <Table.Td>
                                        {record.cost ? `Rp ${Number(record.cost).toLocaleString('id-ID')}` : '-'}
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
                            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
                        }}
                    />
                )}
            </Drawer>
        </Stack>
    );
}
