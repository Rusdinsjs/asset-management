import { useEffect, useState } from 'react';
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
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { loanApi, type Loan } from '../api/loan';
import { assetApi } from '../api/assets';
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
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string | null>('all');

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

    // Create form
    const [newLoan, setNewLoan] = useState({
        asset_id: '',
        loan_date: new Date(),
        expected_return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [loansRes, assetsRes] = await Promise.all([
                activeTab === 'overdue' ? loanApi.listOverdue() : loanApi.list(),
                assetApi.list({ page: 1, per_page: 200 }),
            ]);
            setLoans(Array.isArray(loansRes) ? loansRes : []);
            setAssets(Array.isArray(assetsRes) ? assetsRes : (assetsRes as any).data?.data || (assetsRes as any).data || []);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to load data', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newLoan.asset_id) {
            notifications.show({ title: 'Error', message: 'Please select an asset', color: 'red' });
            return;
        }
        setSubmitting(true);
        try {
            await loanApi.create({
                asset_id: newLoan.asset_id,
                borrower_id: user?.id || '',
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
        openAction();
    };

    const openDetailModal = (loan: Loan) => {
        setSelectedLoan(loan);
        openDetail();
    };

    const getAssetName = (assetId: string) => {
        const asset = assets.find((a) => a.id === assetId);
        return asset ? `${asset.asset_code} - ${asset.name}` : assetId;
    };

    const availableAssets = assets.filter((a) => ['in_inventory', 'deployed'].includes(a.status));

    const rows = loans.map((loan) => (
        <Table.Tr key={loan.id}>
            <Table.Td>{getAssetName(loan.asset_id)}</Table.Td>
            <Table.Td>{loan.loan_date}</Table.Td>
            <Table.Td>{loan.expected_return_date}</Table.Td>
            <Table.Td>
                <Badge color={statusColors[loan.status] || 'gray'} variant="filled">
                    {loan.status.replace('_', ' ').toUpperCase()}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openDetailModal(loan)}>
                        <IconEye size={16} />
                    </ActionIcon>
                    {loan.status === 'requested' && (
                        <>
                            <ActionIcon variant="subtle" color="green" onClick={() => handleApprove(loan.id)}>
                                <IconCheck size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => openActionModal(loan, 'reject')}>
                                <IconX size={16} />
                            </ActionIcon>
                        </>
                    )}
                    {loan.status === 'approved' && (
                        <ActionIcon variant="subtle" color="cyan" onClick={() => openActionModal(loan, 'checkout')}>
                            <IconHandGrab size={16} />
                        </ActionIcon>
                    )}
                    {['checked_out', 'in_use', 'overdue'].includes(loan.status) && (
                        <ActionIcon variant="subtle" color="teal" onClick={() => openActionModal(loan, 'return')}>
                            <IconHandStop size={16} />
                        </ActionIcon>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl">
            <Group justify="space-between" mb="md">
                <Title order={2}>Peminjaman Aset (Internal Loan)</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
                    Request Loan
                </Button>
            </Group>

            <Card withBorder>
                <LoadingOverlay visible={loading} />
                <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                    <Tabs.List>
                        <Tabs.Tab value="all">All Loans</Tabs.Tab>
                        <Tabs.Tab value="overdue" color="red">
                            Overdue
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Asset</Table.Th>
                            <Table.Th>Loan Date</Table.Th>
                            <Table.Th>Expected Return</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {loans.length > 0 ? (
                            rows
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                                    No loans found
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>

            {/* Create Modal */}
            <Modal opened={createOpened} onClose={closeCreate} title="Request Asset Loan" size="md">
                <Stack>
                    <Select
                        label="Select Asset"
                        placeholder="Choose an asset to borrow"
                        data={availableAssets.map((a) => ({ value: a.id, label: `${a.asset_code} - ${a.name}` }))}
                        value={newLoan.asset_id}
                        onChange={(val) => setNewLoan({ ...newLoan, asset_id: val || '' })}
                        searchable
                        required
                    />
                    <DatePickerInput
                        label="Loan Date"
                        value={newLoan.loan_date}
                        onChange={(val) => val && setNewLoan({ ...newLoan, loan_date: typeof val === 'string' ? new Date(val) : val })}
                        required
                    />
                    <DatePickerInput
                        label="Expected Return Date"
                        value={newLoan.expected_return_date}
                        onChange={(val) => val && setNewLoan({ ...newLoan, expected_return_date: typeof val === 'string' ? new Date(val) : val })}
                        required
                    />
                    <Button fullWidth onClick={handleCreate} loading={submitting}>
                        Submit Request
                    </Button>
                </Stack>
            </Modal>

            {/* Detail Modal */}
            <Modal opened={detailOpened} onClose={closeDetail} title="Loan Details" size="lg">
                {selectedLoan && (
                    <Stack>
                        <Group>
                            <Text fw={500}>Asset:</Text>
                            <Text>{getAssetName(selectedLoan.asset_id)}</Text>
                        </Group>
                        <Group>
                            <Text fw={500}>Status:</Text>
                            <Badge color={statusColors[selectedLoan.status] || 'gray'}>
                                {selectedLoan.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </Group>
                        <Group>
                            <Text fw={500}>Loan Date:</Text>
                            <Text>{selectedLoan.loan_date}</Text>
                        </Group>
                        <Group>
                            <Text fw={500}>Expected Return:</Text>
                            <Text>{selectedLoan.expected_return_date}</Text>
                        </Group>
                        {selectedLoan.actual_return_date && (
                            <Group>
                                <Text fw={500}>Actual Return:</Text>
                                <Text>{selectedLoan.actual_return_date}</Text>
                            </Group>
                        )}
                        {selectedLoan.condition_on_out && (
                            <Group>
                                <Text fw={500}>Condition (Out):</Text>
                                <Text>{selectedLoan.condition_on_out}</Text>
                            </Group>
                        )}
                        {selectedLoan.condition_on_return && (
                            <Group>
                                <Text fw={500}>Condition (Return):</Text>
                                <Text>{selectedLoan.condition_on_return}</Text>
                            </Group>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* Action Modal (Checkout/Return/Reject) */}
            <Modal
                opened={actionOpened}
                onClose={closeAction}
                title={
                    actionType === 'checkout'
                        ? 'Checkout Asset'
                        : actionType === 'return'
                            ? 'Return Asset'
                            : 'Reject Loan'
                }
            >
                <Stack>
                    {actionType === 'reject' ? (
                        <Textarea
                            label="Rejection Reason"
                            placeholder="Enter reason for rejection"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                        />
                    ) : (
                        <Textarea
                            label="Asset Condition"
                            placeholder={
                                actionType === 'checkout'
                                    ? 'Describe asset condition before handover'
                                    : 'Describe asset condition on return'
                            }
                            value={conditionNote}
                            onChange={(e) => setConditionNote(e.target.value)}
                            required
                        />
                    )}
                    <Button
                        fullWidth
                        onClick={handleAction}
                        loading={submitting}
                        color={actionType === 'reject' ? 'red' : actionType === 'checkout' ? 'cyan' : 'teal'}
                    >
                        {actionType === 'checkout' ? 'Confirm Checkout' : actionType === 'return' ? 'Confirm Return' : 'Reject'}
                    </Button>
                </Stack>
            </Modal>
        </Container>
    );
}
