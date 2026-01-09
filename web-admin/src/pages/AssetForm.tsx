import { useMemo } from 'react';
import {
    TextInput,
    NumberInput,
    Select,
    Button,
    Group,
    Stack,
    Tabs,
    Textarea,
    Grid,
    Title,
    Text,
    Box
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconCar, IconCoin, IconFileDescription, IconInfoCircle, IconDeviceFloppy, IconBuilding } from '@tabler/icons-react';
import type { Asset, CreateAssetRequest } from '../api/assets';

interface Category {
    id: string;
    name: string;
    code: string;
    full_path?: string;
    main_category?: string;
}

interface AssetFormProps {
    initialValues?: Asset | null;
    categories: Category[];
    locations: { id: string; name: string }[];
    onSubmit: (values: CreateAssetRequest) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function AssetForm({ initialValues, categories, locations, onSubmit, onCancel, isLoading }: AssetFormProps) {
    const form = useForm({
        initialValues: {
            asset_code: initialValues?.asset_code || '',
            name: initialValues?.name || '',
            category_id: initialValues?.category_id || '',
            location_id: initialValues?.location_id || '',
            department_id: initialValues?.department_id || '',
            status: initialValues?.status || 'planning',
            condition_id: initialValues?.condition_id,

            serial_number: initialValues?.serial_number || '',
            brand: initialValues?.brand || '',
            model: initialValues?.model || '',
            year_manufacture: initialValues?.year_manufacture,

            // Financial
            purchase_date: initialValues?.purchase_date ? new Date(initialValues.purchase_date) : null,
            purchase_price: initialValues?.purchase_price,
            residual_value: initialValues?.residual_value,
            useful_life_months: initialValues?.useful_life_months,

            notes: initialValues?.notes || '',

            // Vehicle Details (Nested)
            vehicle_details: {
                license_plate: initialValues?.vehicle_details?.license_plate || '',
                brand: initialValues?.vehicle_details?.brand || '',
                model: initialValues?.vehicle_details?.model || '',
                color: initialValues?.vehicle_details?.color || '',
                vin: initialValues?.vehicle_details?.vin || '',
                engine_number: initialValues?.vehicle_details?.engine_number || '',
                bpkb_number: initialValues?.vehicle_details?.bpkb_number || '',
                stnk_expiry: initialValues?.vehicle_details?.stnk_expiry ? new Date(initialValues.vehicle_details.stnk_expiry) : null,
                kir_expiry: initialValues?.vehicle_details?.kir_expiry ? new Date(initialValues.vehicle_details.kir_expiry) : null,
                tax_expiry: initialValues?.vehicle_details?.tax_expiry ? new Date(initialValues.vehicle_details.tax_expiry) : null,
                fuel_type: initialValues?.vehicle_details?.fuel_type || '',
                transmission: initialValues?.vehicle_details?.transmission || '',
                capacity: initialValues?.vehicle_details?.capacity || '',
                odometer_last: initialValues?.vehicle_details?.odometer_last,
            },

            // Building/Land Details (Mapped to specifications)
            building_details: {
                address: initialValues?.specifications?.address || '',
                city: initialValues?.specifications?.city || '',
                land_area: initialValues?.specifications?.land_area,
                building_area: initialValues?.specifications?.building_area,
                certificate_number: initialValues?.specifications?.certificate_number || '',
                pbb_number: initialValues?.specifications?.pbb_number || '', // NOP
                certificate_expiry: initialValues?.specifications?.certificate_expiry ? new Date(initialValues.specifications.certificate_expiry) : null,
            }
        },
        validate: {
            asset_code: (value) => (value ? null : 'Code is required'),
            name: (value) => (value ? null : 'Name is required'),
            category_id: (value) => (value ? null : 'Category is required'),
        }
    });

    const categoryOptions = useMemo(() => {
        return categories.map(c => ({
            value: c.id,
            label: c.full_path || c.name,
            code: c.code,
            main: c.main_category
        }));
    }, [categories]);

    // Check classification
    const selectedCategory = categoryOptions.find(c => c.value === form.values.category_id);

    const isVehicle = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        const main = selectedCategory.main || '';
        return code.includes('ALAT-BERAT') || code.includes('TRUK') || code.includes('KENDARAAN') || code.includes('RINGAN') || main.includes('RENTAL') || main.includes('OPERASIONAL');
    }, [selectedCategory]);

    const isBuilding = useMemo(() => {
        if (!selectedCategory) return false;
        const code = selectedCategory.code || '';
        return code.includes('BANGUNAN') || code.includes('TANAH') || code.includes('INFRA');
    }, [selectedCategory]);

    const handleSubmit = (values: typeof form.values) => {
        const payload: any = {
            ...values,
            purchase_date: values.purchase_date?.toISOString().split('T')[0],
        };

        // Handle Vehicle Logic
        if (isVehicle) {
            payload.vehicle_details = {
                ...values.vehicle_details,
                stnk_expiry: values.vehicle_details.stnk_expiry?.toISOString().split('T')[0],
                kir_expiry: values.vehicle_details.kir_expiry?.toISOString().split('T')[0],
                tax_expiry: values.vehicle_details.tax_expiry?.toISOString().split('T')[0]
            };
        } else {
            delete payload.vehicle_details;
        }

        // Handle Building Logic (Pack into specifications)
        if (isBuilding) {
            payload.specifications = {
                ...initialValues?.specifications,
                address: values.building_details.address,
                city: values.building_details.city,
                land_area: values.building_details.land_area,
                building_area: values.building_details.building_area,
                certificate_number: values.building_details.certificate_number,
                pbb_number: values.building_details.pbb_number,
                certificate_expiry: values.building_details.certificate_expiry?.toISOString().split('T')[0]
            };
        }

        delete payload.building_details; // Clean up aux field
        if (!payload.location_id) delete payload.location_id;

        onSubmit(payload);
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Tabs defaultValue="general">
                <Tabs.List>
                    <Tabs.Tab value="general" leftSection={<IconInfoCircle size={14} />}>General</Tabs.Tab>
                    <Tabs.Tab
                        value="details"
                        leftSection={isVehicle ? <IconCar size={14} /> : isBuilding ? <IconBuilding size={14} /> : <IconFileDescription size={14} />}
                    >
                        {isVehicle ? 'Vehicle Details' : isBuilding ? 'Property Details' : 'Specifications'}
                    </Tabs.Tab>
                    <Tabs.Tab value="financial" leftSection={<IconCoin size={14} />}>Financial</Tabs.Tab>
                    <Tabs.Tab value="docs" leftSection={<IconFileDescription size={14} />}>Docs</Tabs.Tab>
                </Tabs.List>

                <Box mt="md">
                    {/* GENERAL TAB */}
                    <Tabs.Panel value="general">
                        <Stack gap="md">
                            <Grid>
                                <Grid.Col span={6}>
                                    <TextInput label="Asset Code" {...form.getInputProps('asset_code')} withAsterisk />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Status"
                                        data={['planning', 'active', 'maintenance', 'disposed', 'sold']}
                                        {...form.getInputProps('status')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <TextInput label="Asset Name" {...form.getInputProps('name')} withAsterisk />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Category"
                                        data={categoryOptions}
                                        searchable
                                        {...form.getInputProps('category_id')}
                                        withAsterisk
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Select
                                        label="Location"
                                        data={locations.map(l => ({ value: l.id, label: l.name }))}
                                        searchable
                                        {...form.getInputProps('location_id')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <TextInput label="Brand" {...form.getInputProps('brand')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <TextInput label="Model" {...form.getInputProps('model')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <TextInput label="Serial Number" {...form.getInputProps('serial_number')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput label="Year Manufacture" {...form.getInputProps('year_manufacture')} />
                                </Grid.Col>
                            </Grid>
                            <Textarea label="Notes" {...form.getInputProps('notes')} minRows={2} />
                        </Stack>
                    </Tabs.Panel>

                    {/* DETAILS TAB */}
                    <Tabs.Panel value="details">
                        <Stack gap="md">
                            {isVehicle && (
                                <>
                                    <Title order={5}>Vehicle Information</Title>
                                    <Grid>
                                        <Grid.Col span={6}>
                                            <TextInput label="License Plate (No Polisi)" {...form.getInputProps('vehicle_details.license_plate')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="VIN (Chassis No)" {...form.getInputProps('vehicle_details.vin')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="Engine Number" {...form.getInputProps('vehicle_details.engine_number')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="Color" {...form.getInputProps('vehicle_details.color')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="BPKB Number" {...form.getInputProps('vehicle_details.bpkb_number')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <NumberInput label="Odometer" {...form.getInputProps('vehicle_details.odometer_last')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <DateInput label="STNK Expiry" {...form.getInputProps('vehicle_details.stnk_expiry')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <DateInput label="KIR Expiry" {...form.getInputProps('vehicle_details.kir_expiry')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <DateInput label="Tax Expiry" {...form.getInputProps('vehicle_details.tax_expiry')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <Select label="Fuel Type" data={['Petrol', 'Diesel', 'Electric', 'Hybrid']} {...form.getInputProps('vehicle_details.fuel_type')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <Select label="Transmission" data={['Manual', 'Automatic']} {...form.getInputProps('vehicle_details.transmission')} />
                                        </Grid.Col>
                                        <Grid.Col span={4}>
                                            <TextInput label="Capacity (CC/Ton)" {...form.getInputProps('vehicle_details.capacity')} />
                                        </Grid.Col>
                                    </Grid>
                                </>
                            )}

                            {isBuilding && (
                                <>
                                    <Title order={5}>Property / Land Information</Title>
                                    <Grid>
                                        <Grid.Col span={12}>
                                            <TextInput label="Address" {...form.getInputProps('building_details.address')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="City / Region" {...form.getInputProps('building_details.city')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="Certificate Number (SHM/HGB)" {...form.getInputProps('building_details.certificate_number')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <NumberInput label="Land Area (m²)" {...form.getInputProps('building_details.land_area')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <NumberInput label="Building Area (m²)" {...form.getInputProps('building_details.building_area')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <TextInput label="PBB Number (NOP)" {...form.getInputProps('building_details.pbb_number')} />
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                            <DateInput label="Certificate Expiry" {...form.getInputProps('building_details.certificate_expiry')} />
                                        </Grid.Col>
                                    </Grid>
                                </>
                            )}

                            {!isVehicle && !isBuilding && (
                                <Text c="dimmed" ta="center" py="xl">
                                    No specific details configuration for this category.
                                    (Generic specifications support coming soon)
                                </Text>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    {/* FINANCIAL TAB */}
                    <Tabs.Panel value="financial">
                        <Stack gap="md">
                            <Grid>
                                <Grid.Col span={6}>
                                    <DateInput label="Purchase Date" {...form.getInputProps('purchase_date')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput label="Purchase Price" prefix="Rp " thousandSeparator {...form.getInputProps('purchase_price')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput label="Residual Value" prefix="Rp " thousandSeparator {...form.getInputProps('residual_value')} />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <NumberInput label="Useful Life (Months)" {...form.getInputProps('useful_life_months')} />
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Tabs.Panel>

                    {/* DOCS TAB */}
                    <Tabs.Panel value="docs">
                        <Text c="dimmed" ta="center" py="xl">Document Management (Insurance, etc.) will be available after saving.</Text>
                    </Tabs.Panel>
                </Box>
            </Tabs>

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isLoading} leftSection={<IconDeviceFloppy size={16} />}>
                    Save Asset
                </Button>
            </Group>
        </form>
    );
}
