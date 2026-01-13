import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    NumberInput,
    Select,
    Button,
    Group,
    Title,
    Paper,
    Textarea,
    Stack,
    Grid,
    LoadingOverlay,
    Divider
} from '@mantine/core';
import { DateInput, type DateValue } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconCalendar, IconCurrencyDollar } from '@tabler/icons-react';
import { rentalApi, type CreateRentalRequest, type RentalRate } from '../../api/rental';
import { clientApi } from '../../api/client-management';
import { assetApi } from '../../api/assets';

export function RentalForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch Clients (Active only)
    const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients-list'],
        queryFn: () => clientApi.list({ limit: 100 }).then(res => res.data)
    });
    // clientsResponse IS the PaginatedResponse object. detailed list is in .data
    const clients = clientsResponse?.data || [];

    // Fetch Available Assets
    const { data: assetsResponse, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets-available'],
        queryFn: () => assetApi.list({ page: 1, per_page: 100, status: 'available' })
    });
    const assets = assetsResponse?.data || [];

    // Fetch Rate Templates
    const { data: rateTemplates, isLoading: ratesLoading } = useQuery({
        queryKey: ['rental-rates'],
        queryFn: () => rentalApi.listRentalRates()
    });

    const form = useForm<CreateRentalRequest>({
        initialValues: {
            client_id: '',
            asset_id: '',
            rental_rate_id: '', // Optional template
            start_date: new Date().toISOString().split('T')[0],
            end_date: undefined, // Optional
            daily_rate: 0,
            deposit_amount: 0,
            notes: ''
        },
        validate: {
            client_id: (val) => (!val ? 'Client is required' : null),
            asset_id: (val) => (!val ? 'Asset is required' : null),
            start_date: (val) => (!val ? 'Start date is required' : null),
        }
    });

    // Auto-populate rate details on template selection
    const handleTemplateChange = (rateId: string | null) => {
        form.setFieldValue('rental_rate_id', rateId || undefined);

        if (rateId && rateTemplates) {
            const template = rateTemplates.find((r: RentalRate) => r.id === rateId);
            if (template) {
                form.setFieldValue('daily_rate', template.rate_amount || 0);
            }
        }
    };

    const createMutation = useMutation({
        mutationFn: (values: CreateRentalRequest) => rentalApi.createRental(values),
        onSuccess: () => {
            notifications.show({ title: 'Success', message: 'Rental request created', color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['rentals'] });
            navigate('/rentals');
        },
        onError: (err: any) => {
            notifications.show({
                title: 'Error',
                message: err.response?.data?.message || 'Failed to create rental',
                color: 'red'
            });
        }
    });

    const handleSubmit = (values: typeof form.values) => {
        // Ensure values are correct types for API
        const payload = { ...values };
        if (!payload.end_date) delete payload.end_date;
        createMutation.mutate(payload);
    };

    const isLoading = clientsLoading || assetsLoading || ratesLoading;

    return (
        <Stack gap="md" maw={800} mx="auto">
            <Group>
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/rentals')}>
                    Back
                </Button>
                <Title order={3}>New Rental Request</Title>
            </Group>

            <Paper p="xl" withBorder shadow="sm" pos="relative">
                <LoadingOverlay visible={isLoading} />

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="lg">
                        <Grid>
                            <Grid.Col span={6}>
                                <Select
                                    label="Client"
                                    placeholder="Select Client"
                                    data={clients.map((c) => ({ value: c.id, label: c.name + (c.company_name ? ` (${c.company_name})` : '') }))}
                                    required
                                    searchable
                                    {...form.getInputProps('client_id')}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Select
                                    label="Asset to Rent"
                                    placeholder="Select Available Asset"
                                    data={assets.map((a) => ({ value: a.id, label: `${a.name} (${a.asset_code})` }))}
                                    required
                                    searchable
                                    {...form.getInputProps('asset_id')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Divider label="Schedule & Pricing" labelPosition="center" />

                        <Grid>
                            <Grid.Col span={6}>
                                <DateInput
                                    label="Start Date"
                                    placeholder="Pick date"
                                    leftSection={<IconCalendar size={16} />}
                                    required
                                    // Handle Date <-> String mapping
                                    value={form.values.start_date ? new Date(form.values.start_date) : null}
                                    onChange={(date: DateValue) => {
                                        if (date instanceof Date) form.setFieldValue('start_date', date.toISOString().split('T')[0]);
                                    }}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <DateInput
                                    label="Expected End Date"
                                    placeholder="Open-ended if empty"
                                    leftSection={<IconCalendar size={16} />}
                                    clearable
                                    value={form.values.end_date ? new Date(form.values.end_date) : null}
                                    onChange={(date: DateValue) => {
                                        form.setFieldValue('end_date', (date instanceof Date) ? date.toISOString().split('T')[0] : undefined);
                                    }}
                                />
                            </Grid.Col>
                        </Grid>

                        <Grid>
                            <Grid.Col span={12}>
                                <Select
                                    label="Apply Price Template (Optional)"
                                    placeholder="Select a standard rate..."
                                    description="Selecting a template will auto-fill pricing fields"
                                    data={rateTemplates?.map((r: RentalRate) => ({
                                        value: r.id,
                                        label: `${r.name} - ${r.rate_amount.toLocaleString()} ${r.currency} / ${r.rate_basis || 'Day'}`
                                    })) || []}
                                    clearable
                                    searchable
                                    value={form.values.rental_rate_id}
                                    onChange={handleTemplateChange}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <NumberInput
                                    label="Base Rate Amount"
                                    prefix="Rp "
                                    thousandSeparator=","
                                    required
                                    leftSection={<IconCurrencyDollar size={16} />}
                                    {...form.getInputProps('daily_rate')}
                                />
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <NumberInput
                                    label="Deposit Amount"
                                    prefix="Rp "
                                    thousandSeparator=","
                                    {...form.getInputProps('deposit_amount')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Textarea
                            label="Notes"
                            placeholder="Special conditions, delivery instructions, etc."
                            minRows={3}
                            {...form.getInputProps('notes')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => navigate('/rentals')}>Cancel</Button>
                            <Button type="submit" loading={createMutation.isPending}>Create Request</Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Stack>
    );
}
