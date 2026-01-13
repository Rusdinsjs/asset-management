import { useEffect, useState } from 'react';
import {
    Title, Container, Table, Badge, Button, Group, Card, ActionIcon,
    Modal, Select, TextInput, LoadingOverlay, Text, Paper, Stack
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash, IconSearch, IconUserPlus, IconUserCheck } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { employeeApi, type Employee, type EmploymentStatus } from '../api/employee';
import { api } from '../api/client';
import { PasswordInput } from '@mantine/core';

interface Department {
    id: string;
    name: string;
}

const initialFormState = {
    nik: '',
    name: '',
    email: '',
    phone: '',
    department_id: '',
    position: '',
    employment_status: 'pkwt' as EmploymentStatus,
    user_id: '',
};

const initialUserFormState = {
    email: '',
    password: '',
    name: '',
    role: 'staff',
    employee_id: '',
};

export function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Create/Edit State
    const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);

    const [userOpened, { open: openUser, close: closeUser }] = useDisclosure(false);
    const [userFormData, setUserFormData] = useState(initialUserFormState);

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        loadData();
        fetchDepartments();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await employeeApi.list();
            setEmployees(data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load employees', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await api.get<Department[]>('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            await employeeApi.create(formData);
            notifications.show({ title: 'Success', message: 'Employee created', color: 'green' });
            closeCreate();
            setFormData(initialFormState);
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to create employee',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingEmployee) return;
        setSubmitting(true);
        try {
            await employeeApi.update(editingEmployee.id, formData);
            notifications.show({ title: 'Success', message: 'Employee updated', color: 'green' });
            closeEdit();
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to update employee',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (employee: Employee) => {
        if (!window.confirm(`Are you sure you want to delete ${employee.name}?`)) return;
        try {
            await employeeApi.delete(employee.id);
            notifications.show({ title: 'Success', message: 'Employee deleted', color: 'green' });
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: 'Failed to delete employee', color: 'red' });
        }
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setFormData({
            nik: employee.nik,
            name: employee.name,
            email: employee.email,
            phone: employee.phone || '',
            department_id: employee.department_id || '',
            position: employee.position || '',
            employment_status: employee.employment_status,
            user_id: employee.user_id || '',
        });
        openEdit();
    };

    const openUserModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setUserFormData({
            ...initialUserFormState,
            name: employee.name,
            email: employee.email,
            employee_id: employee.id,
        });
        openUser();
    };

    const handleCreateUser = async () => {
        setSubmitting(true);
        try {
            await employeeApi.createUser(userFormData);
            notifications.show({ title: 'Success', message: 'User account created', color: 'green' });
            closeUser();
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to create user',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusParams = (status: EmploymentStatus) => {
        switch (status) {
            case 'pkwt': return { color: 'blue', label: 'PKWT' };
            case 'pkwtt': return { color: 'green', label: 'PKWTT' };
            case 'magang': return { color: 'orange', label: 'Magang' };
            default: return { color: 'gray', label: 'Lainnya' };
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.nik.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
    );

    const rows = filteredEmployees.map((employee) => {
        const statusParams = getStatusParams(employee.employment_status);
        return (
            <Table.Tr key={employee.id}>
                <Table.Td>
                    <Stack gap={0}>
                        <Text fw={500}>{employee.name}</Text>
                        <Text size="xs" c="dimmed">{employee.nik}</Text>
                    </Stack>
                </Table.Td>
                <Table.Td>{employee.email}</Table.Td>
                <Table.Td>{employee.department_name || '-'}</Table.Td>
                <Table.Td>{employee.position || '-'}</Table.Td>
                <Table.Td>
                    <Badge color={statusParams.color} variant="light">
                        {statusParams.label}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    {employee.user_id ? (
                        <Badge leftSection={<IconUserCheck size={12} />} color="teal" variant="light">Linked</Badge>
                    ) : (
                        <Button leftSection={<IconUserPlus size={14} />} size="xs" variant="light" onClick={() => openUserModal(employee)}>
                            Buat Akun
                        </Button>
                    )}
                </Table.Td>
                <Table.Td>
                    <Badge color={employee.is_active ? 'green' : 'red'}>
                        {employee.is_active ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(employee)}>
                            <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(employee)}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    const deptOptions = departments.map(d => ({ value: d.id, label: d.name }));
    const statusOptions = [
        { value: 'pkwt', label: 'PKWT' },
        { value: 'pkwtt', label: 'PKWTT' },
        { value: 'magang', label: 'Magang' },
        { value: 'lainnya', label: 'Lainnya' },
    ];

    return (
        <Container size="xl">
            <Stack>
                <Group justify="space-between">
                    <Title order={2}>Data Pegawai</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => {
                        setFormData(initialFormState);
                        openCreate();
                    }}>Tambah Pegawai</Button>
                </Group>

                <Paper p="md" withBorder>
                    <Group mb="md">
                        <TextInput
                            placeholder="Cari nama, NIK, atau email..."
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
                                    <Table.Th>Nama / NIK</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Departemen</Table.Th>
                                    <Table.Th>Jabatan</Table.Th>
                                    <Table.Th>Status Kerja</Table.Th>
                                    <Table.Th>User Akun</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Aksi</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {employees.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={7} style={{ textAlign: 'center' }}>Tidak ada data pegawai</Table.Td>
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
                title={createOpened ? "Tambah Pegawai" : "Edit Pegawai"}
            >
                <Stack>
                    <TextInput
                        label="NIK"
                        placeholder="Contoh: 123456"
                        value={formData.nik}
                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Nama"
                        placeholder="Nama Lengkap"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Email"
                        placeholder="email@perusahaan.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Telepon"
                        placeholder="0812..."
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Select
                        label="Departemen"
                        placeholder="Pilih Departemen"
                        data={deptOptions}
                        value={formData.department_id}
                        onChange={(val) => setFormData({ ...formData, department_id: val || '' })}
                        searchable
                    />
                    <TextInput
                        label="Jabatan"
                        placeholder="Contoh: Manager Operasional"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                    <Select
                        label="Status Kerja"
                        data={statusOptions}
                        value={formData.employment_status}
                        onChange={(val) => setFormData({ ...formData, employment_status: (val as EmploymentStatus) || 'pkwt' })}
                    />
                    <Button fullWidth onClick={createOpened ? handleCreate : handleUpdate} loading={submitting}>
                        {createOpened ? "Simpan" : "Update"}
                    </Button>
                </Stack>
            </Modal>
            {/* User Account Modal */}
            <Modal
                opened={userOpened}
                onClose={closeUser}
                title="Buat Akun User"
            >
                <Stack>
                    <Text size="sm" c="dimmed">
                        Membuat akun untuk pegawai: <b>{editingEmployee?.name}</b>
                    </Text>
                    <TextInput
                        label="Email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        required
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Password login"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        required
                    />
                    <Select
                        label="Role"
                        data={[
                            { value: 'staff', label: 'Staff' },
                            { value: 'technician', label: 'Technician' },
                            { value: 'manager', label: 'Manager' },
                            { value: 'admin', label: 'Admin' },
                        ]}
                        value={userFormData.role}
                        onChange={(val) => setUserFormData({ ...userFormData, role: val || 'staff' })}
                    />
                    <Button fullWidth onClick={handleCreateUser} loading={submitting}>
                        Buat Akun
                    </Button>
                </Stack>
            </Modal>
        </Container>
    );
}
