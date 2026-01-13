import { useState } from 'react';
import {
    Title,
    Paper,
    Table,
    Button,
    Group,
    TextInput,
    ActionIcon,
    Badge,
    Modal,
    Stack,
    Text,
    LoadingOverlay,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch, IconEdit, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientApi } from '../api/client-management';
import type { Client } from '../api/client-management';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';

export const Clients = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [opened, { open, close }] = useDisclosure(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const { data: clients, isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: () => clientApi.list().then(res => res.data),
    });

    const form = useForm({
        initialValues: {
            name: '',
            client_code: '',
            company_name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            contact_person: '',
            tax_id: '',
            is_active: true,
            notes: '',
        },
        validate: {
            name: (value) => (value.length < 2 ? 'Name must have at least 2 characters' : null),
            client_code: (value) => (value.length < 2 ? 'Code must have at least 2 characters' : null),
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Client>) => clientApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            notifications.show({ title: 'Success', message: 'Client created', color: 'green' });
            close();
            form.reset();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Client>) => clientApi.update(selectedClient!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            notifications.show({ title: 'Success', message: 'Client updated', color: 'green' });
            close();
            setSelectedClient(null);
            form.reset();
        },
    });

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        form.setValues({
            name: client.name,
            client_code: client.client_code,
            company_name: client.company_name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            city: client.city || '',
            contact_person: client.contact_person || '',
            tax_id: client.tax_id || '',
            is_active: client.is_active ?? true,
            notes: client.notes || '',
        });
        open();
    };

    const handleSubmit = (values: typeof form.values) => {
        if (selectedClient) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    const filteredClients = clients?.data?.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.client_code.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Stack>
            <Group justify="space-between">
                <Title order={2}>Client Management</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => { setSelectedClient(null); form.reset(); open(); }}>
                    Add Client
                </Button>
            </Group>

            <Paper p="md" withBorder>
                <TextInput
                    placeholder="Search by name, code or company..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />

                <div style={{ position: 'relative' }}>
                    <LoadingOverlay visible={isLoading} />
                    <Table verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Code</Table.Th>
                                <Table.Th>Name / Company</Table.Th>
                                <Table.Th>Contact</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredClients?.map((client) => (
                                <Table.Tr key={client.id}>
                                    <Table.Td>
                                        <Badge variant="outline">{client.client_code}</Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap={0}>
                                            <Text fw={500}>{client.name}</Text>
                                            <Text size="xs" c="dimmed">{client.company_name}</Text>
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap={0}>
                                            <Text size="sm">{client.email}</Text>
                                            <Text size="xs" c="dimmed">{client.phone}</Text>
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={client.is_active ? 'green' : 'gray'}>
                                            {client.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            <ActionIcon variant="subtle" onClick={() => handleEdit(client)}>
                                                <IconEdit size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="subtle" color="red">
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            </Paper>

            <Modal
                opened={opened}
                onClose={close}
                title={selectedClient ? 'Edit Client' : 'Add New Client'}
                size="lg"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <Group grow>
                            <TextInput label="Client Name" required {...form.getInputProps('name')} />
                            <TextInput label="Client Code" required {...form.getInputProps('client_code')} />
                        </Group>
                        <TextInput label="Company Name" {...form.getInputProps('company_name')} />
                        <Group grow>
                            <TextInput label="Email" {...form.getInputProps('email')} />
                            <TextInput label="Phone" {...form.getInputProps('phone')} />
                        </Group>
                        <TextInput label="Contact Person" {...form.getInputProps('contact_person')} />
                        <TextInput label="Tax ID (NPWP)" {...form.getInputProps('tax_id')} />
                        <TextInput label="Address" {...form.getInputProps('address')} />
                        <TextInput label="City" {...form.getInputProps('city')} />
                        <TextInput label="Notes" {...form.getInputProps('notes')} />

                        <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                            {selectedClient ? 'Update Client' : 'Create Client'}
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
};
