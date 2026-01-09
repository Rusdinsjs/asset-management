import { useState, useMemo } from 'react';
import {
    Title,
    Paper,
    Group,
    Button,
    Stack,
    TextInput,
    Textarea,
    NumberInput,
    Select,
    LoadingOverlay,
    ActionIcon,
    Text,
    Box,
    ScrollArea,
    NavLink,
    Grid,
    Tabs,
    TagsInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconPlus, IconTrash, IconFolder, IconFolderOpen, IconDeviceFloppy } from '@tabler/icons-react';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

interface Category {
    id: string;
    parent_id: string | null;
    code: string;
    name: string;
    description: string | null;
    main_category: string | null;
    sub_category_letter: string | null;
    function_description: string | null;
    display_order: number;
    depreciation_method: string | null;
    depreciation_period_months: number | null;
    example_assets: string[] | null;
    full_path?: string;
    children?: Category[];
}

interface CategoryFormData {
    parent_id: string | null;
    code: string;
    name: string;
    description: string;
    main_category: string;
    sub_category_letter: string;
    function_description: string;
    display_order: number;
    depreciation_method: string;
    depreciation_period_months: number | '';
    example_assets: string[];
}

interface CategoryRequest {
    parent_id: string | null;
    code: string;
    name: string;
    description: string;
    main_category: string;
    sub_category_letter: string;
    function_description: string;
    display_order: number;
    depreciation_method: string;
    depreciation_period_months: number | null;
    example_assets: string[];
}

const MAIN_CATEGORIES = [
    'ASET INTI (RENTAL)',
    'ASET OPERASIONAL',
    'ASET TETAP INFRASTRUKTUR'
];

export function Categories() {
    const queryClient = useQueryClient();
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const form = useForm<CategoryFormData>({
        initialValues: {
            parent_id: null,
            code: '',
            name: '',
            description: '',
            main_category: '',
            sub_category_letter: '',
            function_description: '',
            display_order: 0,
            depreciation_method: 'straight_line',
            depreciation_period_months: '',
            example_assets: [],
        },
        validate: {
            code: (value) => (value ? null : 'Code is required'),
            name: (value) => (value ? null : 'Name is required'),
        },
    });

    const { data: treeData, isLoading } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return res.data.data as Category[];
        },
    });

    // Flatten tree for parent selection
    const flatCategories = useMemo(() => {
        const flatten = (nodes: Category[], depth = 0): { value: string; label: string }[] => {
            return nodes.reduce((acc, node) => {
                const prefix = '\u00A0'.repeat(depth * 4);
                const current = { value: node.id, label: `${prefix}${node.name} (${node.code})` };
                const children = node.children ? flatten(node.children, depth + 1) : [];
                return [...acc, current, ...children];
            }, [] as { value: string; label: string }[]);
        };
        return treeData ? flatten(treeData) : [];
    }, [treeData]);

    const createMutation = useMutation({
        mutationFn: (values: CategoryRequest) => api.post('/categories', values),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Category created', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            handleReset();
        },
        onError: (error: any) => {
            notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to create category', color: 'red' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: CategoryRequest }) => api.put(`/categories/${id}`, values),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Category updated', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            setIsEditing(false);
        },
        onError: (error: any) => {
            notifications.show({ title: 'Error', message: error.response?.data?.error || 'Failed to update category', color: 'red' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/categories/${id}`),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Category deleted', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] });
            if (selectedCategory?.id === deleteMutation.variables) {
                handleReset();
            }
        },
    });

    const handleReset = () => {
        setSelectedCategory(null);
        setIsEditing(false);
        form.reset();
    };

    const handleSelectCategory = (category: Category) => {
        setSelectedCategory(category);
        setIsEditing(true);
        form.setValues({
            parent_id: category.parent_id,
            code: category.code,
            name: category.name,
            description: category.description || '',
            main_category: category.main_category || '',
            sub_category_letter: category.sub_category_letter || '',
            function_description: category.function_description || '',
            display_order: category.display_order || 0,
            depreciation_method: category.depreciation_method || 'straight_line',
            depreciation_period_months: category.depreciation_period_months === null ? '' : category.depreciation_period_months,
            example_assets: category.example_assets || [],
        });
    };

    const handleStartCreate = () => {
        handleReset();
        setIsEditing(false);
    };

    const handleAddChild = (parentId: string) => {
        handleReset();
        form.setFieldValue('parent_id', parentId);
        setIsEditing(false);
    }

    const handleSubmit = (values: CategoryFormData) => {
        const payload: CategoryRequest = {
            ...values,
            depreciation_period_months: values.depreciation_period_months === '' ? null : Number(values.depreciation_period_months),
        };

        if (selectedCategory && isEditing) {
            updateMutation.mutate({ id: selectedCategory.id, values: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this category?')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTree = (nodes: Category[]) => {
        return nodes.map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expanded[node.id];

            return (
                <Box key={node.id} mb={4}>
                    <NavLink
                        label={
                            <Group justify="space-between">
                                <Text size="sm" fw={500}>{node.name} <Text span c="dimmed" size="xs">({node.code})</Text></Text>
                            </Group>
                        }
                        leftSection={
                            hasChildren ? (
                                <ActionIcon size="xs" variant="transparent" onClick={(e) => toggleExpand(node.id, e)}>
                                    {isExpanded ? <IconFolderOpen size={16} /> : <IconFolder size={16} />}
                                </ActionIcon>
                            ) : <IconFolder size={16} color="gray" />
                        }
                        rightSection={
                            <Group gap="xs">
                                <ActionIcon size="xs" color="blue" onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}>
                                    <IconPlus size={14} />
                                </ActionIcon>
                                <ActionIcon size="xs" color="red" onClick={(e) => handleDelete(node.id, e)}>
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </Group>
                        }
                        active={selectedCategory?.id === node.id}
                        onClick={() => handleSelectCategory(node)}
                        variant="light"
                        childrenOffset={28}
                    >
                        {hasChildren && isExpanded && renderTree(node.children!)}
                    </NavLink>
                </Box>
            );
        });
    };

    if (isLoading) return <LoadingOverlay visible />;

    return (
        <Stack gap="lg" h="calc(100vh - 100px)">
            <Grid gutter="xl" h="100%">
                <Grid.Col span={4} h="100%">
                    <Paper withBorder p="md" h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Categories</Title>
                            <Button size="xs" leftSection={<IconPlus size={16} />} onClick={handleStartCreate}>
                                New Root
                            </Button>
                        </Group>
                        <ScrollArea style={{ flex: 1 }} mx="-xs" px="xs">
                            {treeData && renderTree(treeData)}
                            {!treeData?.length && <Text c="dimmed" ta="center" mt="xl">No categories found</Text>}
                        </ScrollArea>
                    </Paper>

                </Grid.Col>

                <Grid.Col span={8} h="100%">
                    <Paper withBorder p="xl" h="100%">
                        <Title order={3} mb="lg">
                            {selectedCategory && isEditing ? `Edit Category: ${selectedCategory.name}` : 'Create New Category'}
                        </Title>

                        <form onSubmit={form.onSubmit(handleSubmit)}>
                            <Stack gap="md">
                                <Tabs defaultValue="general">
                                    <Tabs.List>
                                        <Tabs.Tab value="general">General</Tabs.Tab>
                                        <Tabs.Tab value="classification">Classification</Tabs.Tab>
                                        <Tabs.Tab value="depreciation">Depreciation</Tabs.Tab>
                                    </Tabs.List>

                                    <Tabs.Panel value="general" pt="xs">
                                        <Stack gap="md">
                                            <Group grow>
                                                <TextInput
                                                    required
                                                    label="Code"
                                                    placeholder="e.g. A01"
                                                    {...form.getInputProps('code')}
                                                />
                                                <TextInput
                                                    required
                                                    label="Name"
                                                    placeholder="Category Name"
                                                    {...form.getInputProps('name')}
                                                />
                                            </Group>

                                            <Select
                                                label="Parent Category"
                                                placeholder="Select parent (optional)"
                                                data={flatCategories}
                                                searchable
                                                clearable
                                                {...form.getInputProps('parent_id')}
                                            />

                                            <Textarea
                                                label="Description"
                                                placeholder="Additional details..."
                                                minRows={3}
                                                {...form.getInputProps('description')}
                                            />
                                        </Stack>
                                    </Tabs.Panel>

                                    <Tabs.Panel value="classification" pt="xs">
                                        <Stack gap="md">
                                            <Select
                                                label="Main Category"
                                                placeholder="Select Main Category Class"
                                                data={MAIN_CATEGORIES}
                                                {...form.getInputProps('main_category')}
                                            />
                                            <Group grow>
                                                <TextInput
                                                    label="Sub-Category Letter"
                                                    placeholder="e.g. A, B, C"
                                                    maxLength={5}
                                                    {...form.getInputProps('sub_category_letter')}
                                                />
                                                <NumberInput
                                                    label="Display Order"
                                                    {...form.getInputProps('display_order')}
                                                />
                                            </Group>
                                            <Textarea
                                                label="Function/Role Description"
                                                placeholder="Role in asset management..."
                                                minRows={2}
                                                {...form.getInputProps('function_description')}
                                            />
                                            <TagsInput
                                                label="Example Assets"
                                                placeholder="Enter representative assets and press Enter"
                                                {...form.getInputProps('example_assets')}
                                            />
                                        </Stack>
                                    </Tabs.Panel>

                                    <Tabs.Panel value="depreciation" pt="xs">
                                        <Stack gap="md">
                                            <Select
                                                label="Depreciation Method"
                                                data={[
                                                    { value: 'straight_line', label: 'Straight Line' },
                                                    { value: 'declining_balance', label: 'Declining Balance' },
                                                    { value: 'none', label: 'No Depreciation' },
                                                ]}
                                                {...form.getInputProps('depreciation_method')}
                                            />
                                            <NumberInput
                                                label="Useful Life (Months)"
                                                description="Standard useful life for assets in this category"
                                                min={0}
                                                {...form.getInputProps('depreciation_period_months')}
                                            />
                                        </Stack>
                                    </Tabs.Panel>
                                </Tabs>

                                <Group justify="flex-end" mt="xl">
                                    <Button variant="light" color="gray" onClick={handleReset}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={createMutation.isPending || updateMutation.isPending}>
                                        {selectedCategory && isEditing ? 'Update Category' : 'Create Category'}
                                    </Button>
                                </Group>
                            </Stack>
                        </form>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}

