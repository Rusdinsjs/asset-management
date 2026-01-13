
import { useEffect, useState } from 'react';
import { Title, Container, Table, Badge, Button, Group, Card, ActionIcon, Modal, Select, TextInput, PasswordInput, Switch, LoadingOverlay, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { usersApi, type UserSummary, type CreateUserRequest, type UpdateUserRequest } from '../api/users';

interface Role {
    id: string;
    code: string;
    name: string;
    role_level: number;
}

const initialFormState: CreateUserRequest = {
    email: '',
    password: '',
    name: '',
    role_code: 'user',
};

export function Users() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);

    // Create/Edit State
    const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
    const [formData, setFormData] = useState<CreateUserRequest>(initialFormState);
    const [editFormData, setEditFormData] = useState<UpdateUserRequest>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                usersApi.list(1, 50),
                usersApi.listRoles()
            ]);

            if (usersRes && Array.isArray(usersRes.data)) {
                setUsers(usersRes.data);
            } else if (Array.isArray(usersRes)) {
                setUsers(usersRes);
            }

            if (Array.isArray(rolesRes)) {
                setRoles(rolesRes);
            }
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load data', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await usersApi.create(formData);
            notifications.show({ title: 'Success', message: 'User created', color: 'green' });
            closeCreate();
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed to create user', color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingUser) return;
        setSubmitting(true);
        try {
            await usersApi.update(editingUser.id, editFormData);
            notifications.show({ title: 'Success', message: 'User updated', color: 'green' });
            closeEdit();
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed to update user', color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (user: UserSummary) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) return;
        try {
            await usersApi.delete(user.id);
            notifications.show({ title: 'Success', message: 'User deleted', color: 'green' });
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: 'Failed to delete user', color: 'red' });
        }
    };

    const openEditModal = (user: UserSummary) => {
        setEditingUser(user);
        setEditFormData({
            name: user.name,
            role_code: user.role_code,
            is_active: user.is_active,
            // password left undefined (optional)
        });
        openEdit();
    };

    const getRoleParams = (level: number) => {
        if (level === 1) return { color: 'red', label: 'Super Admin' };
        if (level === 2) return { color: 'orange', label: 'Manager' };
        if (level === 3) return { color: 'yellow', label: 'Supervisor' };
        if (level === 4) return { color: 'blue', label: 'Admin/Specialist' };
        return { color: 'gray', label: 'User/Viewer' };
    };

    const getAccessScope = (roleCode: string) => {
        switch (roleCode) {
            case 'super_admin': return 'Full System Access';
            case 'admin': return 'Organization Management';
            case 'manager': return 'Approval L2, Asset Management';
            case 'supervisor': return 'Approval L1, Operational View';
            case 'admin_heavy_eq': return 'Heavy Equipment Specialist';
            case 'admin_vehicle': return 'Vehicle Specialist';
            case 'admin_infra': return 'Infrastructure Specialist';
            case 'technician': return 'Maintenance Execution';
            case 'staff': return 'General Staff View';
            case 'user': return 'Basic View Access';
            default: return 'Limited Access';
        }
    };

    const rows = users.map((user) => {
        const badgeParams = getRoleParams(user.role_level);
        return (
            <Table.Tr key={user.id}>
                <Table.Td>{user.name}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <Badge color={badgeParams.color} variant="light">
                            {user.role_code}
                        </Badge>
                        {/* Show level as a small detail or separate badge if needed, strictly asking for 'Access' now */}
                    </Group>
                </Table.Td>
                <Table.Td>
                    <span style={{ fontSize: '0.9em', color: '#666' }}>
                        {getAccessScope(user.role_code)}
                    </span>
                </Table.Td>
                <Table.Td>
                    <Badge color={user.is_active ? 'green' : 'red'} variant="filled">
                        {user.is_active ? 'Allowed' : 'Denied'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <span style={{ fontSize: '0.9em', color: user.employee_name ? '#333' : '#999' }}>
                        {user.employee_name ? (
                            <>
                                {user.employee_name}
                                <br />
                                <Text span c="dimmed" size="xs">{user.employee_nik && `(NIK: ${user.employee_nik})`}</Text>
                            </>
                        ) : (
                            <Text fs="italic" size="xs" c="dimmed">Not Linked</Text>
                        )}
                    </span>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(user)}>
                            <IconEdit size={16} />
                        </ActionIcon>
                        {user.role_level > 1 && ( // Prevent deleting Super Admins easily (simple check)
                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(user)}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    const roleOptions = roles.map(r => ({ value: r.code, label: `${r.name} (L${r.role_level})` }));

    return (
        <Container size="xl">
            <Group justify="space-between" mb="md">
                <Title order={2}>User Management</Title>
                {/* User creation is now handled in Employees page */}
            </Group>

            <Card withBorder>
                <LoadingOverlay visible={loading} />
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Role</Table.Th>
                            <Table.Th>Access Scope</Table.Th>
                            <Table.Th>Login Status</Table.Th>
                            <Table.Th>Linked Employee</Table.Th>
                            <Table.Th>Action</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {users.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={6} style={{ textAlign: 'center' }}>No users found</Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>

            {/* Create Modal */}
            <Modal opened={createOpened} onClose={closeCreate} title="Create New User">
                <TextInput
                    label="Name"
                    placeholder="Full Name"
                    mb="sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <TextInput
                    label="Email"
                    placeholder="email@example.com"
                    mb="sm"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <PasswordInput
                    label="Password"
                    placeholder="WeakPassword123"
                    mb="sm"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />
                <Select
                    label="Role"
                    placeholder="Select Role"
                    data={roleOptions}
                    value={formData.role_code}
                    onChange={(val) => setFormData({ ...formData, role_code: val || 'user' })}
                    mb="md"
                    searchable
                />
                <Button fullWidth onClick={handleCreate} loading={submitting}>Create User</Button>
            </Modal>

            {/* Edit Modal */}
            <Modal opened={editOpened} onClose={closeEdit} title="Edit User">
                <TextInput
                    label="Name"
                    mb="sm"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
                <Select
                    label="Role"
                    data={roleOptions}
                    value={editFormData.role_code || ''}
                    onChange={(val) => setEditFormData({ ...editFormData, role_code: val || undefined })}
                    mb="sm"
                    searchable
                />
                <PasswordInput
                    label="New Password (Optional)"
                    placeholder="Leave blank to keep current"
                    mb="sm"
                    value={editFormData.password || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value || undefined })}
                />
                <Switch
                    label="Active Account"
                    checked={editFormData.is_active ?? true}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.currentTarget.checked })}
                    mb="md"
                />
                <Button fullWidth onClick={handleUpdate} loading={submitting}>Save Changes</Button>
            </Modal>
        </Container>
    );
}
