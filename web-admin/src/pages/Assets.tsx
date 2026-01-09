import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Title,
    Group,
    Button,
    Stack,
    TextInput,
    Paper,
    Table,
    ActionIcon,
    Drawer,
    LoadingOverlay,
    Badge,
    Pagination,
    Text,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { assetApi } from '../api/assets';
import type { Asset, CreateAssetRequest } from '../api/assets';
import { api } from '../api/client';
import { AssetForm } from './AssetForm';

// Helper to flatten category tree
const flattenCategories = (nodes: any[], prefix = ''): any[] => {
    let result: any[] = [];
    nodes.forEach(node => {
        const fullPath = prefix ? `${prefix} > ${node.name}` : node.name;
        result.push({ ...node, full_path: fullPath });
        if (node.children && node.children.length > 0) {
            result = result.concat(flattenCategories(node.children, fullPath));
        }
    });
    return result;
};

export function Assets() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 500);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Fetch Assets
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets', page, debouncedSearch],
        queryFn: () => assetApi.list({
            page,
            per_page: 15,
            query: debouncedSearch,
            status: undefined
        })
    });

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories-flat'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return flattenCategories(res.data);
        },
        staleTime: 5 * 60 * 1000
    });

    // Fetch Locations (Mock)
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            try {
                const res = await api.get('/locations');
                return res.data;
            } catch {
                return [];
            }
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: assetApi.create,
        onSuccess: (data: any) => {
            const message = data.message || 'Asset created successfully';
            const isApproval = message.toLowerCase().includes('approval');

            notifications.show({
                title: isApproval ? 'Request Submitted' : 'Success',
                message: message,
                color: isApproval ? 'blue' : 'green',
                autoClose: 5000
            });

            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setDrawerOpen(false);
        },
        onError: (err: any) => {
            notifications.show({ title: 'Error', message: err.message || 'Failed to create asset', color: 'red' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => assetApi.update(editingAsset!.id, data),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Asset updated successfully', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setDrawerOpen(false);
            setEditingAsset(null);
        },
        onError: (err: any) => {
            notifications.show({ title: 'Error', message: err.message || 'Failed to update asset', color: 'red' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: assetApi.delete,
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Asset deleted', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        }
    });

    // Handlers
    const handleAddNew = () => {
        setEditingAsset(null);
        setDrawerOpen(true);
    };

    const handleEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setDrawerOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFormSubmit = (values: CreateAssetRequest) => {
        if (editingAsset) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    return (
        <Stack gap="lg" h="100%">
            <Paper p="md" shadow="sm">
                <Group justify="space-between" mb="md">
                    <Stack gap={0}>
                        <Title order={3}>Asset Management</Title>
                        <Text c="dimmed" size="sm">Manage company assets, vehicles, and equipment</Text>
                    </Stack>
                    <Group>
                        <TextInput
                            placeholder="Search assets..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                        />
                        <Button leftSection={<IconPlus size={16} />} onClick={handleAddNew}>
                            Add Asset
                        </Button>
                    </Group>
                </Group>

                <Paper withBorder>
                    <LoadingOverlay visible={assetsLoading} />
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Asset Code</Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Category</Table.Th>
                                <Table.Th>Brand/Model</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {assetsData?.data?.map((asset: any) => (
                                <Table.Tr key={asset.id}>
                                    <Table.Td>
                                        <Text fw={500} size="sm">{asset.asset_code}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{asset.name}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{asset.category_name || asset.category_id}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{asset.brand} {asset.model}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={asset.status === 'active' || asset.status === 'available' ? 'green' : 'gray'}
                                            variant="light"
                                        >
                                            {asset.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(asset)}>
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(asset.id)}>
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {(!assetsData?.data || assetsData.data.length === 0) && !assetsLoading && (
                                <Table.Tr>
                                    <Table.Td colSpan={6} align="center">
                                        <Text c="dimmed" py="xl">No assets found</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Paper>

                {assetsData && (
                    <Group justify="flex-end" mt="md">
                        <Pagination
                            total={assetsData.total_pages || 1}
                            value={page}
                            onChange={setPage}
                        />
                    </Group>
                )}
            </Paper>

            <Drawer
                opened={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editingAsset ? `Edit Asset: ${editingAsset.asset_code}` : 'New Asset'}
                position="right"
                size="xl"
                padding="md"
            >
                <AssetForm
                    initialValues={editingAsset}
                    categories={categories}
                    locations={locations}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setDrawerOpen(false)}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            </Drawer>
        </Stack>
    );
}
