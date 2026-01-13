import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Stack, Title, Group, Button, Badge, Paper,
    Text, Grid, Divider, Tabs, LoadingOverlay,
    Modal, Textarea, NumberInput, Checkbox, Select
} from '@mantine/core';
import {
    IconArrowLeft, IconTruck, IconCalendar, IconUser,
    IconCheck, IconX, IconReceipt,
    IconClock, IconClipboardList, IconTags
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { rentalApi } from '../../api/rental';
import { TimesheetList } from '../../components/Rentals/TimesheetList';
import { BillingHistory } from '../../components/Rentals/BillingHistory';
import { api } from '../../api/client';

// Status Badge Helper
const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
        draft: 'gray',
        requested: 'blue',
        pending_approval: 'yellow',
        approved: 'cyan',
        rented_out: 'green',
        returned: 'indigo',
        completed: 'teal',
        cancelled: 'red',
        rejected: 'red',
    };
    return <Badge color={colors[status] || 'gray'} size="lg" tt="capitalize">{status.replace('_', ' ')}</Badge>;
};

export function RentalDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Modal controls
    const [approveOpened, { open: openApprove, close: closeApprove }] = useDisclosure(false);
    const [rejectOpened, { open: openReject, close: closeReject }] = useDisclosure(false);
    const [dispatchOpened, { open: openDispatch, close: closeDispatch }] = useDisclosure(false);
    const [returnOpened, { open: openReturn, close: closeReturn }] = useDisclosure(false);

    // Form states
    const [notes, setNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    // Dispatch/Return form states (simplified for now)
    const [meterReading, setMeterReading] = useState<number | undefined>(undefined);
    const [hasDamage, setHasDamage] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get('/locations');
            return res.data.map((l: any) => ({ value: l.id, label: l.name }));
        }
    });

    // Fetch Rental Data
    const { data: rental, isLoading, error } = useQuery({
        queryKey: ['rental', id],
        queryFn: () => rentalApi.getRental(id!),
        enabled: !!id
    });

    // Mutations
    const approveMutation = useMutation({
        mutationFn: () => rentalApi.approveRental(id!, notes),
        onSuccess: () => {
            notifications.show({ title: 'Approved', message: 'Rental approved successfully', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            closeApprove();
        }
    });

    const rejectMutation = useMutation({
        mutationFn: () => rentalApi.rejectRental(id!, rejectReason),
        onSuccess: () => {
            notifications.show({ title: 'Rejected', message: 'Rental rejected', color: 'red' });
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            closeReject();
        }
    });

    const dispatchMutation = useMutation({
        mutationFn: () => rentalApi.dispatchRental(id!, {
            driver_name: '', // Expand form later
            truck_plate: '',
            notes: notes,
            location_id: selectedLocation
        }),
        onSuccess: () => {
            notifications.show({ title: 'Dispatched', message: 'Asset marked as dispatched', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            closeDispatch();
        }
    });

    const returnMutation = useMutation({
        mutationFn: () => rentalApi.returnRental(id!, {
            return_date: new Date().toISOString().split('T')[0],
            meter_reading: meterReading || 0,
            notes: notes,
            location_id: selectedLocation
        }),
        onSuccess: () => {
            notifications.show({ title: 'Returned', message: 'Asset marked as returned', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['rental', id] });
            closeReturn();
        }
    });

    if (isLoading) return <LoadingOverlay visible />;
    if (error || !rental) return <Text c="red">Failed to load rental details</Text>;

    return (
        <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between">
                <Group>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/rentals')}>
                        Back
                    </Button>
                    <Title order={2}>Rental #{rental.rental_number}</Title>
                    {getStatusBadge(rental.status)}
                </Group>

                <Group>
                    {/* Workflow Actions */}
                    {['requested', 'pending_approval'].includes(rental.status) && (
                        <>
                            <Button color="red" variant="outline" leftSection={<IconX size={16} />} onClick={openReject}>Reject</Button>
                            <Button color="green" leftSection={<IconCheck size={16} />} onClick={openApprove}>Approve</Button>
                        </>
                    )}
                    {rental.status === 'approved' && (
                        <Button color="blue" leftSection={<IconTruck size={16} />} onClick={openDispatch}>Dispatch Asset</Button>
                    )}
                    {rental.status === 'rented_out' && (
                        <Button color="orange" leftSection={<IconArrowLeft size={16} />} onClick={openReturn}>Register Return</Button>
                    )}
                </Group>
            </Group>

            {/* Info Cards */}
            <Grid>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper withBorder p="md">
                        <Title order={4} mb="md">Details</Title>
                        <Grid>
                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">Client</Text>
                                    <Group gap="xs">
                                        <IconUser size={18} color="gray" />
                                        <Text fw={500}>{rental.client_name}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">Asset</Text>
                                    <Group gap="xs">
                                        <IconTruck size={18} color="gray" />
                                        <Text fw={500}>{rental.asset_name}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>

                            <Grid.Col span={12}><Divider my="xs" /></Grid.Col>

                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">Start Date</Text>
                                    <Group gap="xs">
                                        <IconCalendar size={18} color="gray" />
                                        <Text>{rental.start_date}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Stack gap="xs">
                                    <Text size="sm" c="dimmed">Expected End</Text>
                                    <Group gap="xs">
                                        <IconCalendar size={18} color="gray" />
                                        <Text>{rental.expected_end_date || 'N/A'}</Text>
                                    </Group>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" h="100%">
                        <Title order={4} mb="md">Financials</Title>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Text size="sm">Standard Rate</Text>
                                <Text fw={600}>Rp {rental.daily_rate?.toLocaleString()}</Text>
                            </Group>
                            {rental.rate_name && (
                                <Text size="xs" c="dimmed">Template: {rental.rate_name}</Text>
                            )}
                            <Divider />
                            {/* Placeholder for accumulated billing stats */}
                            <Text size="sm" c="dimmed">Total Billed to Date</Text>
                            <Text fw={700} size="xl">Rp 0</Text>
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Tabs for Sub-modules */}
            <Tabs defaultValue="overview">
                <Tabs.List>
                    <Tabs.Tab value="overview" leftSection={<IconClipboardList size={14} />}>Overview</Tabs.Tab>
                    <Tabs.Tab value="timesheets" leftSection={<IconClock size={14} />}>Timesheets</Tabs.Tab>
                    <Tabs.Tab value="billing" leftSection={<IconReceipt size={14} />}>Billing History</Tabs.Tab>
                    <Tabs.Tab value="handovers" leftSection={<IconTags size={14} />}>Handovers</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="overview" pt="md">
                    <Stack>
                        <Text>Notes: {rental.notes || 'No notes'}</Text>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="timesheets" pt="md">
                    <TimesheetList rentalId={id} />
                </Tabs.Panel>

                <Tabs.Panel value="billing" pt="md">
                    {id && <BillingHistory rentalId={id} />}
                </Tabs.Panel>

                <Tabs.Panel value="handovers" pt="md">
                    <Stack>
                        <Text c="dimmed" fs="italic">Handover logs (Dispatch/Return) are not yet available via API.</Text>
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* MODALS */}

            <Modal opened={approveOpened} onClose={closeApprove} title="Approve Rental Request">
                <Stack>
                    <Text size="sm">Are you sure you want to approve this rental request?</Text>
                    <Textarea
                        label="Approval Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                    <Button color="green" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>
                        Confirm Approval
                    </Button>
                </Stack>
            </Modal>

            <Modal opened={rejectOpened} onClose={closeReject} title="Reject Rental Request">
                <Stack>
                    <Textarea
                        label="Reason for Rejection"
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                    />
                    <Button color="red" onClick={() => rejectMutation.mutate()} loading={rejectMutation.isPending}>
                        Reject Request
                    </Button>
                </Stack>
            </Modal>

            <Modal opened={dispatchOpened} onClose={closeDispatch} title="Dispatch Asset">
                <Stack>
                    <Text size="sm">Confirm dispatch of asset to client.</Text>
                    <Select
                        label="Destination Location"
                        placeholder="Select client site..."
                        data={locations}
                        value={selectedLocation}
                        onChange={setSelectedLocation}
                        searchable
                        clearable
                    />
                    <Textarea
                        label="Dispatch Notes"
                        placeholder="Condition notes, accessories included..."
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                    <Button onClick={() => dispatchMutation.mutate()} loading={dispatchMutation.isPending}>
                        Confirm Dispatch
                    </Button>
                </Stack>
            </Modal>

            <Modal opened={returnOpened} onClose={closeReturn} title="Register Asset Return">
                <Stack>
                    <NumberInput
                        label="Final Meter Reading"
                        placeholder="HM / KM"
                        value={meterReading}
                        onChange={(v) => setMeterReading(Number(v))}
                    />
                    <Checkbox
                        label="Has Damage?"
                        checked={hasDamage}
                        onChange={(e) => setHasDamage(e.currentTarget.checked)}
                    />
                    <Textarea
                        label="Return Notes / Damage Description"
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                    <Select
                        label="Return Location"
                        placeholder="Select warehouse/yard..."
                        data={locations}
                        value={selectedLocation}
                        onChange={setSelectedLocation}
                        searchable
                        clearable
                    />
                    <Button color="orange" onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>
                        Confirm Return
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
