import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import {
    NumberInput,
    Select,
    Button,
    Group,
    Stack,
    Textarea,
    LoadingOverlay,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrderApi } from '../api/work-order';
// import type { CreateWorkOrderRequest } from '../api/work-order'; // TODO: Define create types in work-order.ts
import { assetApi } from '../api/assets';
import { api } from '../api/client';

interface WorkOrderFormProps {
    maintenanceId?: string | null; // If null, create mode
    onClose: () => void;
    onSuccess: () => void;
}

export function WorkOrderForm({ maintenanceId, onClose, onSuccess }: WorkOrderFormProps) {
    const queryClient = useQueryClient();
    const isEdit = !!maintenanceId;

    const form = useForm({
        initialValues: {
            asset_id: '',
            maintenance_type_id: '', // TODO: Fetch types
            scheduled_date: new Date(),
            description: '',
            cost: undefined as number | undefined,
            vendor_id: '',
            status: 'planned',
            findings: '',
            actions_taken: '',
            odometer_reading: undefined as number | undefined,
            location_id: '',
        },
        validate: {
            asset_id: (value) => (value ? null : 'Asset is required'),
            description: (value) => (value ? null : 'Description is required'),
        },
    });

    // Fetch Assets for Select
    const { data: assetsData, isLoading: assetsLoading } = useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const res = await assetApi.list({ page: 1, per_page: 100 }); // TODO: proper search/infinite scroll
            return res.data;
        },
    });

    // Fetch Locations
    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.get('/locations');
            return res.data.map((l: any) => ({ value: l.id, label: l.name }));
        }
    });

    // Fetch Maintenance Record if Edit
    const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
        queryKey: ['work-order', maintenanceId],
        queryFn: () => workOrderApi.get(maintenanceId!),
        enabled: isEdit,
    });

    useEffect(() => {
        if (maintenanceData) {
            const r = maintenanceData; // WorkOrder object
            form.setValues({
                asset_id: r.asset_id,
                maintenance_type_id: r.wo_type, // Work Order uses string 'maintenance' etc, or mapped ID. Backend wo_type is String. Select expects string.
                scheduled_date: r.scheduled_date ? new Date(r.scheduled_date) : new Date(),
                description: r.problem_description || '',
                cost: r.estimated_cost, // work order uses estimated cost initially
                vendor_id: '', // Work Order in new schema might not have vendor_id directly on root or it's different. Check entity.
                status: r.status,
                findings: r.work_performed || '', // Mapping 'work_performed' to findings/actions roughly
                actions_taken: '',
                odometer_reading: undefined, // specific to vehicle, might need custom handling
                location_id: '',
            });
        }
    }, [maintenanceData]);

    const mutation = useMutation({
        mutationFn: (values: typeof form.values) => {
            const payload: any = {
                asset_id: values.asset_id,
                wo_type: values.maintenance_type_id, // Mapping back
                priority: 'medium', // Default priority as form doesn't have it yet
                problem_description: values.description,
                scheduled_date: values.scheduled_date ? values.scheduled_date.toISOString().split('T')[0] : undefined,
                // ... other fields mapping for CreateWorkOrderRequest
            };

            if (isEdit) {
                // return workOrderApi.update(maintenanceId!, payload); // Schema might differ
                // Work Order update usually specific endpoints. For now, warn or try generic.
                throw new Error("Generic update not implemented for Work Order yet");
            } else {
                return workOrderApi.create(payload);
            }
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: `Work Order ${isEdit ? 'updated' : 'created'} successfully`,
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            onSuccess();
        },
        onError: (error: any) => {
            notifications.show({
                title: 'Error',
                message: error.message || 'Failed to save Work Order',
                color: 'red',
            });
        },
    });

    const assetOptions = assetsData?.map(a => ({ value: a.id, label: a.name })) || [];

    // Check if selected asset is a Vehicle to show Odometer field
    // TODO: Verify if category_id maps to Vehicles correctly. Assuming 'Vehicles' has checked ID or logic.
    // For now, always show Odometer if completed to allow update regardless of type if needed, or check category name if available.
    // Since we don't have category object populated in select list (only list), we'd need to lookup.
    // const selectedAsset = assetsData?.find(a => a.id === form.values.asset_id);
    // const isVehicle = selectedAsset?.category?.name === 'Vehicles'; 

    return (
        <Stack pos="relative">
            <LoadingOverlay visible={mutation.isPending || maintenanceLoading || assetsLoading} />

            <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
                <Stack>
                    <Select
                        label="Asset"
                        placeholder="Select asset"
                        data={assetOptions}
                        searchable
                        {...form.getInputProps('asset_id')}
                        disabled={isEdit}
                    />

                    <DateInput
                        label="Scheduled Date"
                        placeholder="Select date"
                        valueFormat="YYYY-MM-DD"
                        {...form.getInputProps('scheduled_date')}
                    />

                    {/* TODO: Maintenance Type Select */}

                    <Textarea
                        label="Description"
                        placeholder="Work to be done"
                        minRows={3}
                        {...form.getInputProps('description')}
                    />

                    <Select
                        label="Location"
                        placeholder="Select location (if different from asset location)"
                        data={locations}
                        searchable
                        clearable
                        {...form.getInputProps('location_id')}
                    />

                    <Select
                        label="Status"
                        data={[
                            { value: 'planned', label: 'Planned' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        {...form.getInputProps('status')}
                    />

                    {/* Fields visible only when status is In Progress or Completed (or Edit mode generally) */}
                    {(isEdit || form.values.status !== 'planned') && (
                        <>
                            <Textarea
                                label="Findings"
                                placeholder="What was found?"
                                minRows={2}
                                {...form.getInputProps('findings')}
                            />
                            <Textarea
                                label="Actions Taken"
                                placeholder="What was done?"
                                minRows={2}
                                {...form.getInputProps('actions_taken')}
                            />
                            <NumberInput
                                label="Cost"
                                placeholder="0.00"
                                prefix="$"
                                decimalScale={2}
                                {...form.getInputProps('cost')}
                            />
                        </>
                    )}

                    {/* Odometer only if Completed */}
                    {form.values.status === 'completed' && (
                        <NumberInput
                            label="New Odometer Reading"
                            placeholder="Current reading"
                            description="Updates asset odometer"
                            {...form.getInputProps('odometer_reading')}
                        />
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={mutation.isPending}>Save</Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}
