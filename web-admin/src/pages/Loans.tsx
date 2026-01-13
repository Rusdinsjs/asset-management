import { useEffect, useState, useMemo } from 'react';
import {
    Title,
    Container,
    Table,
    Badge,
    Button,
    Group,
    Card,
    ActionIcon,
    Modal,
    Textarea,
    Select,
    LoadingOverlay,
    Tabs,
    Text,
    Stack,
    SimpleGrid,
    Paper,
    TextInput,
    Tooltip,
    Checkbox,
    Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
    IconCheck,
    IconX,
    IconHandGrab,
    IconHandStop,
    IconPlus,
    IconEye,
    IconSearch,
    IconAlertTriangle,
    IconBriefcase,
    IconClock,
    IconFilter,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { loanApi, type Loan } from '../api/loan';
import { assetApi } from '../api/assets';
import { employeeApi, type Employee } from '../api/employee';
import { useAuthStore } from '../store/useAuthStore';

interface Asset {
    id: string;
    name: string;
    asset_code: string;
    status: string;
}

const statusColors: Record<string, string> = {
    requested: 'yellow',
    approved: 'blue',
    checked_out: 'cyan',
    in_use: 'teal',
    overdue: 'red',
    returned: 'green',
    rejected: 'gray',
    lost: 'dark',
    damaged: 'orange',
};

export function Loans() {
    const user = useAuthStore((state) => state.user);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('all');
    const [search, setSearch] = useState('');
    const [borrowerType, setBorrowerType] = useState<'self' | 'employee'>('self');

    // Modals
    const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
    const [actionOpened, { open: openAction, close: closeAction }] = useDisclosure(false);

    // Form state
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [actionType, setActionType] = useState<'checkout' | 'return' | 'reject' | null>(null);
    const [conditionNote, setConditionNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Create form
    const [newLoan, setNewLoan] = useState({
        asset_id: '',
        employee_id: '',
        loan_date: new Date(),
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [loansRes, assetsRes, employeesRes] = await Promise.all([
                activeTab === 'overdue' ? loanApi.listOverdue() : loanApi.list(),
                assetApi.list({ page: 1, per_page: 200 }),
                employeeApi.list(),
            ]);
            setLoans(Array.isArray(loansRes) ? loansRes : []);
            setAssets(Array.isArray(assetsRes) ? assetsRes : (assetsRes as any).data?.data || (assetsRes as any).data || []);
            setEmployees(employeesRes);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load data', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        return {
            total: loans.length,
            pending: loans.filter(l => l.status === 'requested').length,
            active: loans.filter(l => ['checked_out', 'in_use'].includes(l.status)).length,
            overdue: loans.filter(l => l.status === 'overdue').length,
        };
    }, [loans]);

    const filteredLoans = useMemo(() => {
        return loans.filter(loan => {
            const assetName = (loan.asset_name || getAssetName(loan.asset_id)).toLowerCase();
            const borrowerName = (loan.employee_name || loan.borrower_name || '').toLowerCase();
            const query = search.toLowerCase();
            return assetName.includes(query) || borrowerName.includes(query);
        });
    }, [loans, search]);

    const handleCreate = async () => {
        if (!newLoan.asset_id) {
            notifications.show({ title: 'Error', message: 'Please select an asset', color: 'red' });
            return;
        }
        setSubmitting(true);
        try {
            await loanApi.create({
                asset_id: newLoan.asset_id,
                borrower_id: borrowerType === 'self' ? (user?.id || '') : undefined,
                employee_id: borrowerType === 'employee' ? newLoan.employee_id : undefined,
                loan_date: newLoan.loan_date.toISOString().split('T')[0],
                expected_return_date: newLoan.expected_return_date.toISOString().split('T')[0],
            });
            notifications.show({ title: 'Success', message: 'Loan request created', color: 'green' });
            closeCreate();
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Failed to create loan',
                color: 'red',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await loanApi.approve(id);
            notifications.show({ title: 'Success', message: 'Loan approved', color: 'green' });
            loadData();
        } catch (e: any) {
            notifications.show({ title: 'Error', message: 'Failed to approve', color: 'red' });
        }
    };

    const handleAction = async () => {
        if (!selectedLoan || !actionType) return;

        if (actionType === 'checkout' && !termsAccepted) {
            notifications.show({ title: 'Warning', message: 'Please accept terms and confirm asset condition', color: 'yellow' });
            return;
        }

        setSubmitting(true);
        try {
            if (actionType === 'checkout') {
                await loanApi.checkout(selectedLoan.id, conditionNote);
                notifications.show({ title: 'Success', message: 'Asset checked out', color: 'green' });
            } else if (actionType === 'return') {
                await loanApi.returnLoan(selectedLoan.id, conditionNote);
                notifications.show({ title: 'Success', message: 'Asset returned', color: 'green' });
            } else if (actionType === 'reject') {
                await loanApi.reject(selectedLoan.id, rejectReason);
                notifications.show({ title: 'Success', message: 'Loan rejected', color: 'green' });
            }
            closeAction();
            loadData();
        } catch (e: any) {
            notifications.show({
                title: 'Error',
                message: e.response?.data?.message || 'Action failed',
                color: 'red',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const openActionModal = (loan: Loan, type: 'checkout' | 'return' | 'reject') => {
        setSelectedLoan(loan);
        setActionType(type);
        setConditionNote('');
        setRejectReason('');
        setTermsAccepted(false);
        openAction();
    };

    const openDetailModal = (loan: Loan) => {
        setSelectedLoan(loan);
        openDetail();
    };

    function getAssetName(assetId: string) {
        const asset = assets.find((a) => a.id === assetId);
        return asset ? `${asset.asset_code} - ${asset.name}` : assetId;
    }

    const availableAssets = assets.filter((a) => ['in_inventory', 'available'].includes(a.status));

    const rows = filteredLoans.map((loan) => (
        <Table.Tr key={loan.id}>
            <Table.Td>
                <Text fw={500}>{loan.asset_name || getAssetName(loan.asset_id)}</Text>
                <Text size="xs" c="dimmed">{loan.employee_name || loan.borrower_name || 'Anonymous'}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{loan.loan_date}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c={loan.status === 'overdue' ? 'red' : undefined}>
                    {loan.expected_return_date}
                </Text>
            </Table.Td>
            <Table.Td>
                <Badge color={statusColors[loan.status] || 'gray'} variant="light" size="sm">
                    {loan.status.replace('_', ' ').toUpperCase()}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <Tooltip label="View Details">
                        <ActionIcon variant="light" color="blue" onClick={() => openDetailModal(loan)}>
                            <IconEye size={16} />
                        </ActionIcon>
                    </Tooltip>
                    {loan.status === 'requested' && (
                        <>
                            <Tooltip label="Approve Request">
                                <ActionIcon variant="light" color="green" onClick={() => handleApprove(loan.id)}>
                                    <IconCheck size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Reject Request">
                                <ActionIcon variant="light" color="red" onClick={() => openActionModal(loan, 'reject')}>
                                    <IconX size={16} />
                                </ActionIcon>
                            </Tooltip>
                        </>
                    )}
                    {loan.status === 'approved' && (
                        <Tooltip label="Confirm Checkout">
                            <ActionIcon variant="filled" color="cyan" onClick={() => openActionModal(loan, 'checkout')}>
                                <IconHandGrab size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {['checked_out', 'in_use', 'overdue'].includes(loan.status) && (
                        <Tooltip label="Mark as Returned">
                            <ActionIcon variant="filled" color="teal" onClick={() => openActionModal(loan, 'return')}>
                                <IconHandStop size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between" align="center">
                    <div>
                        <Title order={2}>Manajemen Peminjaman (Internal Loan)</Title>
                        <Text c="dimmed" size="sm">Kelola peminjaman aset kantor oleh karyawan</Text>
                    </div>
                    <Button variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} leftSection={<IconPlus size={16} />} onClick={openCreate}>
                        Request Pinjaman Baru
                    </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Loans</Text>
                            <IconBriefcase size={20} color="gray" />
                        </Group>
                        <Text fw={700} size="xl">{stats.total}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Pending Approval</Text>
                            <IconClock size={20} color="orange" />
                        </Group>
                        <Text fw={700} size="xl" c="orange">{stats.pending}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Active / In-Use</Text>
                            <IconHandGrab size={20} color="blue" />
                        </Group>
                        <Text fw={700} size="xl" c="blue">{stats.active}</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Overdue</Text>
                            <IconAlertTriangle size={20} color="red" />
                        </Group>
                        <Text fw={700} size="xl" c="red">{stats.overdue}</Text>
                    </Paper>
                </SimpleGrid>

                <Card withBorder radius="md">
                    <LoadingOverlay visible={loading} />

                    <Tabs value={activeTab} onChange={setActiveTab} variant="pills" mb="md">
                        <Group justify="space-between" mb="md" w="100%">
                            <Tabs.List>
                                <Tabs.Tab value="all">Semua Data</Tabs.Tab>
                                <Tabs.Tab value="requested">Requests</Tabs.Tab>
                                <Tabs.Tab value="overdue" color="red">Terlambat</Tabs.Tab>
                            </Tabs.List>
                            <TextInput
                                placeholder="Cari aset atau peminjam..."
                                leftSection={<IconSearch size={14} />}
                                value={search}
                                onChange={(e) => setSearch(e.currentTarget.value)}
                                w={300}
                                radius="md"
                            />
                        </Group>

                        <Divider mb="lg" />

                        <Table verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Aset / Peminjam</Table.Th>
                                    <Table.Th>Tanggal Pinjam</Table.Th>
                                    <Table.Th>Est. Kembali</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Tindakan</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                                            <Stack align="center" gap="xs">
                                                <IconFilter size={32} color="gray" opacity={0.5} />
                                                <Text c="dimmed">Tidak ada data peminjaman ditemukan</Text>
                                            </Stack>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Tabs>
                </Card>
            </Stack>

            {/* Create Modal */}
            <Modal opened={createOpened} onClose={closeCreate} title="Request Peminjaman Aset" size="md">
                <Stack>
                    <Select
                        label="Pilih Aset"
                        placeholder="Cari aset..."
                        data={availableAssets.map((a) => ({ value: a.id, label: `${a.asset_code} - ${a.name}` }))}
                        value={newLoan.asset_id}
                        onChange={(val) => setNewLoan({ ...newLoan, asset_id: val || '' })}
                        searchable
                        required
                    />
                    <Select
                        label="Siapa yang meminjam?"
                        data={[
                            { value: 'self', label: 'Diri Sendiri' },
                            { value: 'employee', label: 'Pegawai Lain' },
                        ]}
                        value={borrowerType}
                        onChange={(val) => setBorrowerType(val as any)}
                    />
                    {borrowerType === 'employee' && (
                        <Select
                            label="Pilih Pegawai"
                            placeholder="Cari pegawai..."
                            data={employees.map((e) => ({ value: e.id, label: `${e.nik} - ${e.name}` }))}
                            value={newLoan.employee_id}
                            onChange={(val) => setNewLoan({ ...newLoan, employee_id: val || '' })}
                            searchable
                            required
                        />
                    )}
                    <DatePickerInput
                        label="Tanggal Mulai Pinjam"
                        value={newLoan.loan_date}
                        onChange={(val) => val && setNewLoan({ ...newLoan, loan_date: typeof val === 'string' ? new Date(val) : val })}
                        required
                    />
                    <DatePickerInput
                        label="Estimasi Tanggal Kembali"
                        value={newLoan.expected_return_date}
                        placeholder="Biasanya 7 hari"
                        onChange={(val) => val && setNewLoan({ ...newLoan, expected_return_date: typeof val === 'string' ? new Date(val) : val })}
                        required
                    />
                    <Textarea label="Keperluan Pinjam" placeholder="Contoh: Untuk operasional lapangan site A" />
                    <Button fullWidth onClick={handleCreate} loading={submitting} radius="md" mt="md">
                        Kirim Permintaan
                    </Button>
                </Stack>
            </Modal>

            {/* Action Modal (Checkout/Return/Reject) */}
            <Modal
                opened={actionOpened}
                onClose={closeAction}
                title={
                    actionType === 'checkout'
                        ? 'Konfirmasi Serah Terima Aset'
                        : actionType === 'return'
                            ? 'Konfirmasi Pengembalian Aset'
                            : 'Tolak Permintaan'
                }
                radius="md"
            >
                <Stack>
                    {actionType === 'reject' ? (
                        <Textarea
                            label="Alasan Penolakan"
                            placeholder="Tuliskan alasan permintaan ditolak..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                        />
                    ) : (
                        <>
                            <Text size="sm" c="dimmed" mb="xs">
                                Silakan periksa kondisi fisik aset sebelum melakukan konfirmasi.
                            </Text>
                            <Textarea
                                label="Catatan Kondisi Aset"
                                placeholder={
                                    actionType === 'checkout'
                                        ? 'Catat kondisi fisik (misal: ada goresan, baterai 80%)'
                                        : 'Catat kondisi saat dikembalikan'
                                }
                                value={conditionNote}
                                onChange={(e) => setConditionNote(e.target.value)}
                                required
                            />
                            {actionType === 'checkout' && (
                                <Checkbox
                                    label="Saya mengkonfirmasi bahwa aset telah diserahkan dalam kondisi baik dan peminjam menyetujui syarat & ketentuan."
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.currentTarget.checked)}
                                    color="cyan"
                                    mt="xs"
                                />
                            )}
                        </>
                    )}
                    <Button
                        fullWidth
                        onClick={handleAction}
                        loading={submitting}
                        radius="md"
                        mt="md"
                        color={actionType === 'reject' ? 'red' : actionType === 'checkout' ? 'cyan' : 'teal'}
                    >
                        {actionType === 'checkout' ? 'Konfirmasi Serah Terima' : actionType === 'return' ? 'Selesaikan Peminjaman' : 'Tolak'}
                    </Button>
                </Stack>
            </Modal>

            {/* Detail Modal */}
            <Modal opened={detailOpened} onClose={closeDetail} title="Detail Peminjaman" size="lg" radius="md">
                {selectedLoan && (
                    <Stack gap="md">
                        <Paper withBorder p="md" radius="md" bg="gray.0">
                            <SimpleGrid cols={2}>
                                <div>
                                    <Text size="xs" c="dimmed" fw={700}>Aset</Text>
                                    <Text fw={500}>{getAssetName(selectedLoan.asset_id)}</Text>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed" fw={700}>Peminjam</Text>
                                    <Text fw={500}>{selectedLoan.borrower_name || 'Anonymous'}</Text>
                                </div>
                            </SimpleGrid>
                        </Paper>

                        <SimpleGrid cols={2}>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed" fw={700}>Status</Text>
                                <Badge color={statusColors[selectedLoan.status] || 'gray'}>
                                    {selectedLoan.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                            </Stack>
                            <Stack gap={4}>
                                <Text size="xs" c="dimmed" fw={700}>No. Referensi</Text>
                                <Text size="sm">{selectedLoan.loan_number || 'N/A'}</Text>
                            </Stack>
                        </SimpleGrid>

                        <Divider />

                        <SimpleGrid cols={2}>
                            <div>
                                <Text size="xs" c="dimmed" fw={700}>Tanggal Pinjam</Text>
                                <Text size="sm">{selectedLoan.loan_date}</Text>
                            </div>
                            <div>
                                <Text size="xs" c="dimmed" fw={700}>Estimasi Kembali</Text>
                                <Text size="sm">{selectedLoan.expected_return_date}</Text>
                            </div>
                        </SimpleGrid>

                        {selectedLoan.condition_on_out && (
                            <div>
                                <Text size="xs" c="dimmed" fw={700}>Kondisi Saat Keluar</Text>
                                <Paper withBorder p="xs" mt={4} radius="xs">
                                    <Text size="sm">{selectedLoan.condition_on_out}</Text>
                                </Paper>
                            </div>
                        )}

                        {selectedLoan.condition_on_return && (
                            <div>
                                <Text size="xs" c="dimmed" fw={700}>Kondisi Saat Kembali</Text>
                                <Paper withBorder p="xs" mt={4} radius="xs">
                                    <Text size="sm">{selectedLoan.condition_on_return}</Text>
                                </Paper>
                            </div>
                        )}

                        <Group justify="flex-end" mt="xl">
                            <Button variant="light" onClick={closeDetail}>Tutup</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}

