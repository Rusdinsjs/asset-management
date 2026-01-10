import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Container,
    Title,
    Paper,
    Text,
    Grid,
    Badge,
    Group,
    Tabs,
    Table,
    Button,
    ActionIcon,
    Modal,
    TextInput,
    NumberInput,
    Stack,
    LoadingOverlay,
    Card,
    ThemeIcon,
    Alert,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconChecklist,
    IconTools,
    IconInfoCircle,
    IconPlus,
    IconTrash,
    IconCurrencyDollar,
    IconPlayerPlay,
    IconCheck,
} from '@tabler/icons-react';
import { workOrderApi } from '../api/work-order';
import { notifications } from '@mantine/notifications';

export function WorkOrderDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<string | null>('overview');

    // Modals
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [partModalOpen, setPartModalOpen] = useState(false);
    const [completeModalOpen, setCompleteModalOpen] = useState(false);

    // Form inputs
    const [newTask, setNewTask] = useState({ task_number: 1, description: '' });
    const [newPart, setNewPart] = useState({ part_name: '', quantity: 1, unit_cost: 0 });
    const [completeData, setCompleteData] = useState({ work_performed: '', actual_cost: 0 });

    // Queries
    const { data: wo, isLoading: woLoading } = useQuery({
        queryKey: ['work-order', id],
        queryFn: () => workOrderApi.get(id!),
        enabled: !!id,
    });

    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ['work-order-tasks', id],
        queryFn: () => workOrderApi.getTasks(id!),
        enabled: !!id,
    });

    const { data: parts, isLoading: partsLoading } = useQuery({
        queryKey: ['work-order-parts', id],
        queryFn: () => workOrderApi.getParts(id!),
        enabled: !!id,
    });

    // Mutations
    const addTaskMutation = useMutation({
        mutationFn: (data: typeof newTask) => workOrderApi.addTask(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            setTaskModalOpen(false);
            setNewTask({ task_number: (tasks?.length || 0) + 2, description: '' });
            notifications.show({ title: 'Success', message: 'Task added', color: 'green' });
        },
    });

    const removeTaskMutation = useMutation({
        mutationFn: (taskId: string) => workOrderApi.removeTask(id!, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-tasks', id] });
            notifications.show({ title: 'Success', message: 'Task removed', color: 'green' });
        },
    });

    const addPartMutation = useMutation({
        mutationFn: (data: typeof newPart) => workOrderApi.addPart(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] }); // Update total cost
            setPartModalOpen(false);
            setNewPart({ part_name: '', quantity: 1, unit_cost: 0 });
            notifications.show({ title: 'Success', message: 'Part added', color: 'green' });
        },
    });

    const removePartMutation = useMutation({
        mutationFn: (partId: string) => workOrderApi.removePart(id!, partId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order-parts', id] });
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            notifications.show({ title: 'Success', message: 'Part removed', color: 'green' });
        },
    });

    const startMutation = useMutation({
        mutationFn: () => workOrderApi.start(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            notifications.show({ title: 'Started', message: 'Work Order started', color: 'blue' });
        },
    });

    const completeMutation = useMutation({
        mutationFn: (data: typeof completeData) => workOrderApi.complete(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-order', id] });
            setCompleteModalOpen(false);
            notifications.show({ title: 'Completed', message: 'Work Order completed', color: 'green' });
        },
    });

    if (woLoading) return <LoadingOverlay visible />;
    if (!wo) return <Text>Work Order not found</Text>;

    const statusColors: Record<string, string> = {
        pending: 'gray',
        assigned: 'blue',
        in_progress: 'orange',
        completed: 'green',
        cancelled: 'red',
    };

    return (
        <Container size="xl">
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/work-orders')} mb="md">
                Back to List
            </Button>

            <Group justify="space-between" mb="lg">
                <div>
                    <Group mb={5}>
                        <Title>{wo.wo_number}</Title>
                        <Badge size="lg" color={statusColors[wo.status]}>{wo.status}</Badge>
                        <Badge variant="outline">{wo.priority}</Badge>
                    </Group>
                    <Text c="dimmed">{wo.wo_type}</Text>
                </div>
                <Group>
                    {wo.status === 'assigned' && (
                        <Button leftSection={<IconPlayerPlay size={16} />} onClick={() => startMutation.mutate()} loading={startMutation.isPending}>
                            Start Work
                        </Button>
                    )}
                    {wo.status === 'in_progress' && (
                        <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => setCompleteModalOpen(true)}>
                            Complete
                        </Button>
                    )}
                </Group>
            </Group>

            {/* Cost Summary Card */}
            <Grid mb="lg">
                <Grid.Col span={4}>
                    <Card withBorder padding="sm">
                        <Group>
                            <ThemeIcon size="lg" variant="light" color="blue"><IconCurrencyDollar /></ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed">Parts Cost</Text>
                                <Text fw={700}>Rp {Number(wo.parts_cost || 0).toLocaleString('id-ID')}</Text>
                            </div>
                        </Group>
                    </Card>
                </Grid.Col>
                <Grid.Col span={4}>
                    <Card withBorder padding="sm">
                        <Group>
                            <ThemeIcon size="lg" variant="light" color="orange"><IconCurrencyDollar /></ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed">Labor Cost</Text>
                                <Text fw={700}>Rp {Number(wo.labor_cost || 0).toLocaleString('id-ID')}</Text>
                            </div>
                        </Group>
                    </Card>
                </Grid.Col>
                <Grid.Col span={4}>
                    <Card withBorder padding="sm" bg="blue.0">
                        <Group>
                            <ThemeIcon size="lg" variant="filled" color="blue"><IconCurrencyDollar /></ThemeIcon>
                            <div>
                                <Text size="xs" c="dimmed">Total Cost</Text>
                                <Text fw={700} size="lg">
                                    Rp {(Number(wo.parts_cost || 0) + Number(wo.labor_cost || 0)).toLocaleString('id-ID')}
                                </Text>
                            </div>
                        </Group>
                    </Card>
                </Grid.Col>
            </Grid>

            <Paper withBorder>
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={14} />}>Overview</Tabs.Tab>
                        <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>Tasks ({tasks?.length || 0})</Tabs.Tab>
                        <Tabs.Tab value="parts" leftSection={<IconTools size={14} />}>Parts ({parts?.length || 0})</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="overview" p="md">
                        <Grid>
                            <Grid.Col span={6}>
                                <Stack>
                                    <div><Text fw={500}>Problem Description</Text><Text>{wo.problem_description || '-'}</Text></div>
                                    <div><Text fw={500}>Safety Requirements</Text><Text>{Array.isArray(wo.safety_requirements) ? wo.safety_requirements.join(', ') : '-'}</Text></div>
                                    <div><Text fw={500}>Dates</Text>
                                        <Text size="sm">Scheduled: {wo.scheduled_date || '-'}</Text>
                                        <Text size="sm">Actual Start: {wo.actual_start_date ? new Date(wo.actual_start_date).toLocaleString() : '-'}</Text>
                                        <Text size="sm">Completed: {wo.actual_end_date ? new Date(wo.actual_end_date).toLocaleString() : '-'}</Text>
                                    </div>
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Stack>
                                    <div><Text fw={500}>Work Performed</Text><Text>{wo.work_performed || '-'}</Text></div>
                                    <div><Text fw={500}>Assigned Technician</Text><Text>{wo.assigned_technician || 'Unassigned'}</Text></div>
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Tabs.Panel>

                    <Tabs.Panel value="tasks" p="md">
                        <Group justify="flex-end" mb="md">
                            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setTaskModalOpen(true)}>Add Task</Button>
                        </Group>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>#</Table.Th>
                                    <Table.Th>Description</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ width: 80 }}></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {tasksLoading ? <Table.Tr><Table.Td colSpan={4}>Loading...</Table.Td></Table.Tr> : tasks?.length === 0 ? (
                                    <Table.Tr><Table.Td colSpan={4} align="center">No tasks defined</Table.Td></Table.Tr>
                                ) : (
                                    tasks?.map(task => (
                                        <Table.Tr key={task.id}>
                                            <Table.Td>{task.task_number}</Table.Td>
                                            <Table.Td>{task.description}</Table.Td>
                                            <Table.Td><Badge color={task.status === 'completed' ? 'green' : 'gray'}>{task.status}</Badge></Table.Td>
                                            <Table.Td>
                                                <ActionIcon color="red" variant="subtle" onClick={() => removeTaskMutation.mutate(task.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                )}
                            </Table.Tbody>
                        </Table>
                    </Tabs.Panel>

                    <Tabs.Panel value="parts" p="md">
                        <Group justify="flex-end" mb="md">
                            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setPartModalOpen(true)}>Add Part</Button>
                        </Group>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Part Name</Table.Th>
                                    <Table.Th>Qty</Table.Th>
                                    <Table.Th>Unit Cost</Table.Th>
                                    <Table.Th>Total</Table.Th>
                                    <Table.Th style={{ width: 80 }}></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {partsLoading ? <Table.Tr><Table.Td colSpan={5}>Loading...</Table.Td></Table.Tr> : parts?.length === 0 ? (
                                    <Table.Tr><Table.Td colSpan={5} align="center">No parts used</Table.Td></Table.Tr>
                                ) : (
                                    parts?.map(part => (
                                        <Table.Tr key={part.id}>
                                            <Table.Td>{part.part_name}</Table.Td>
                                            <Table.Td>{Number(part.quantity)}</Table.Td>
                                            <Table.Td>Rp {Number(part.unit_cost).toLocaleString('id-ID')}</Table.Td>
                                            <Table.Td fw={700}>Rp {Number(part.total_cost).toLocaleString('id-ID')}</Table.Td>
                                            <Table.Td>
                                                <ActionIcon color="red" variant="subtle" onClick={() => removePartMutation.mutate(part.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                )}
                            </Table.Tbody>
                        </Table>
                    </Tabs.Panel>
                </Tabs>
            </Paper>

            {/* Modals */}
            <Modal opened={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Task">
                <Stack>
                    <NumberInput label="Task Number" value={newTask.task_number} onChange={(v) => setNewTask({ ...newTask, task_number: Number(v) })} />
                    <TextInput label="Description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
                    <Group justify="flex-end">
                        <Button onClick={() => addTaskMutation.mutate(newTask)} loading={addTaskMutation.isPending}>Add</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={partModalOpen} onClose={() => setPartModalOpen(false)} title="Add Spare Part">
                <Stack>
                    <TextInput label="Part Name" value={newPart.part_name} onChange={(e) => setNewPart({ ...newPart, part_name: e.target.value })} />
                    <NumberInput label="Quantity" value={newPart.quantity} onChange={(v) => setNewPart({ ...newPart, quantity: Number(v) })} />
                    <NumberInput label="Unit Cost" value={newPart.unit_cost} onChange={(v) => setNewPart({ ...newPart, unit_cost: Number(v) })}
                        leftSection={<span style={{ fontSize: 12 }}>Rp</span>} thousandSeparator="." />
                    <Group justify="flex-end">
                        <Button onClick={() => addPartMutation.mutate(newPart)} loading={addPartMutation.isPending}>Add</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Work Order">
                <Stack>
                    <TextInput label="Work Performed" value={completeData.work_performed} onChange={(e) => setCompleteData({ ...completeData, work_performed: e.target.value })} />
                    <NumberInput label="Actual Labor Cost" description="Parts cost is automated" value={completeData.actual_cost} onChange={(v) => setCompleteData({ ...completeData, actual_cost: Number(v) })}
                        leftSection={<span style={{ fontSize: 12 }}>Rp</span>} thousandSeparator="." />
                    <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                        Completing this WO will change asset status to DEPLOYED.
                    </Alert>
                    <Group justify="flex-end">
                        <Button color="green" onClick={() => completeMutation.mutate(completeData)} loading={completeMutation.isPending}>Complete</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
