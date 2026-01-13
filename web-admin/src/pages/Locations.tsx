import { useEffect, useState } from 'react';
import {
    Title, Container, Table, Badge, Button, Group, Card, ActionIcon,
    Modal, Select, TextInput, LoadingOverlay, Text, Paper, Stack,
    NumberInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash, IconSearch } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks'; // Fixed import
import { locationApi, type Location } from '../api/locations'; // Fixed import

const initialFormState = {
    code: '',
    name: '',
    location_type: 'other',
    address: '',
    parent_id: null as string | null,
    capacity: undefined as number | undefined,
};

export function Locations() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Create/Edit State
    const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await locationApi.list();
            setLocations(data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load locations', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await locationApi.create(formData);
            notifications.show({ title: 'Success', message: 'Location created', color: 'green' });
            closeCreate();
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to create location',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingLocation) return;
        setSubmitting(true);
        try {
            await locationApi.update(editingLocation.id, formData);
            notifications.show({ title: 'Success', message: 'Location updated', color: 'green' });
            closeEdit();
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to update location',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (location: Location) => {
        if (!window.confirm(`Are you sure you want to delete ${location.name}?`)) return;
        try {
            await locationApi.delete(location.id);
            notifications.show({ title: 'Success', message: 'Location deleted', color: 'green' });
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: 'Failed to delete location', color: 'red' });
        }
    };

    const openEditModal = (location: Location) => {
        setEditingLocation(location);
        setFormData({
            code: location.code,
            name: location.name,
            location_type: location.location_type || 'other',
            address: location.address || '',
            parent_id: location.parent_id || null,
            capacity: location.capacity || undefined,
        });
        openEdit();
    };

    const getTypeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'country': return 'blue';
            case 'city': return 'cyan';
            case 'building': return 'teal';
            case 'floor': return 'indigo';
            case 'room': return 'violet';
            case 'rack': return 'orange';
            default: return 'gray';
        }
    };

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.code.toLowerCase().includes(search.toLowerCase())
    );

    // Build parent options excluding self (if editing)
    const parentOptions = locations
        .filter(l => !editingLocation || l.id !== editingLocation.id)
        .map(l => ({ value: l.id, label: `${l.name} (${l.code})` }));

    // Helper to get parent name
    const getParentName = (parentId?: string | null) => {
        if (!parentId) return '-';
        return locations.find(l => l.id === parentId)?.name || 'Unknown';
    };

    const rows = filteredLocations.map((location) => (
        <Table.Tr key={location.id}>
            <Table.Td>
                <Stack gap={0}>
                    <Text fw={500}>{location.name}</Text>
                    <Text size="xs" c="dimmed">{location.code}</Text>
                </Stack>
            </Table.Td>
            <Table.Td>
                <Badge color={getTypeColor(location.location_type)} variant="light">
                    {location.location_type}
                </Badge>
            </Table.Td>
            <Table.Td>{getParentName(location.parent_id)}</Table.Td>
            <Table.Td>{location.address || '-'}</Table.Td>
            <Table.Td>{location.capacity ? location.capacity : 'Unlimited'}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(location)}>
                        <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(location)}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    const typeOptions = [
        { value: 'building', label: 'Building' },
        { value: 'floor', label: 'Floor' },
        { value: 'room', label: 'Room' },
        { value: 'rack', label: 'Rack' },
        { value: 'zone', label: 'Zone' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <Container size="xl">
            <Stack>
                <Group justify="space-between">
                    <Title order={2}>Locations</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => {
                        setFormData(initialFormState);
                        setEditingLocation(null);
                        openCreate();
                    }}>Add Location</Button>
                </Group>

                <Paper p="md" withBorder>
                    <Group mb="md">
                        <TextInput
                            placeholder="Search by name or code..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </Group>

                    <Card withBorder padding={0}>
                        <LoadingOverlay visible={loading} />
                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Name / Code</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Parent Location</Table.Th>
                                    <Table.Th>Address</Table.Th>
                                    <Table.Th>Capacity</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {locations.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6} style={{ textAlign: 'center' }}>No locations found</Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Paper>
            </Stack>

            {/* Form Modal (shared for create/edit) */}
            <Modal
                opened={createOpened || editOpened}
                onClose={createOpened ? closeCreate : closeEdit}
                title={createOpened ? "Add Location" : "Edit Location"}
            >
                <Stack>
                    <TextInput
                        label="Code"
                        placeholder="e.g. BLD-01"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Name"
                        placeholder="e.g. Main Building"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Type"
                        data={typeOptions}
                        value={formData.location_type}
                        onChange={(val) => setFormData({ ...formData, location_type: val || 'other' })}
                        required
                    />
                    <Select
                        label="Parent Location"
                        placeholder="Select parent (optional)"
                        data={parentOptions}
                        value={formData.parent_id}
                        onChange={(val) => setFormData({ ...formData, parent_id: val })} // val is string | null
                        searchable
                        clearable
                    />
                    <TextInput
                        label="Address"
                        placeholder="Optional address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <NumberInput
                        label="Capacity"
                        placeholder="Max items (optional)"
                        value={formData.capacity}
                        onChange={(val) => setFormData({ ...formData, capacity: val === '' ? undefined : Number(val) })}
                    />
                    <Button fullWidth onClick={createOpened ? handleCreate : handleUpdate} loading={submitting}>
                        {createOpened ? "Save" : "Update"}
                    </Button>
                </Stack>
            </Modal>
        </Container>
    );
}
