import React, { useState } from 'react';
import { Title, Card, Button, Group, Text, Grid } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { reportsApi } from '../api/reports';
import { notifications } from '@mantine/notifications';

const Reports: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        null,
        null,
    ]);
    const [loadingAssets, setLoadingAssets] = useState(false);
    const [loadingMaintenance, setLoadingMaintenance] = useState(false);

    const downloadFile = (data: Blob, filename: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    const handleExportAssets = async () => {
        try {
            setLoadingAssets(true);
            const data = await reportsApi.exportAssets();
            downloadFile(data, `asset_inventory_${new Date().toISOString().split('T')[0]}.csv`);
            notifications.show({
                title: 'Success',
                message: 'Asset inventory exported successfully',
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to export asset inventory',
                color: 'red',
            });
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleExportMaintenance = async () => {
        if (!dateRange[0] || !dateRange[1]) {
            notifications.show({
                title: 'Error',
                message: 'Please select a date range',
                color: 'red',
            });
            return;
        }

        try {
            setLoadingMaintenance(true);
            const start = dateRange[0].toISOString().split('T')[0];
            const end = dateRange[1].toISOString().split('T')[0];
            const data = await reportsApi.exportMaintenance(start, end);
            downloadFile(data, `maintenance_logs_${start}_to_${end}.csv`);
            notifications.show({
                title: 'Success',
                message: 'Maintenance logs exported successfully',
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to export maintenance logs',
                color: 'red',
            });
        } finally {
            setLoadingMaintenance(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <Title order={2} mb="xl">
                Reports & Exports
            </Title>

            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="xs">
                            <Text fw={500}>Asset Inventory</Text>
                            <IconFileSpreadsheet size={24} color="gray" />
                        </Group>
                        <Text size="sm" c="dimmed" mb="md">
                            Export the full list of assets including their current status, location, and financial details.
                        </Text>
                        <Button
                            leftSection={<IconDownload size={14} />}
                            onClick={handleExportAssets}
                            loading={loadingAssets}
                        >
                            Export CSV
                        </Button>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" mb="xs">
                            <Text fw={500}>Maintenance Logs</Text>
                            <IconFileSpreadsheet size={24} color="gray" />
                        </Group>
                        <Text size="sm" c="dimmed" mb="md">
                            Export maintenance history within a specific date range.
                        </Text>

                        <DatePickerInput
                            type="range"
                            label="Select Date Range"
                            placeholder="Pick dates range"
                            value={dateRange}
                            onChange={(value) => setDateRange(value as [Date | null, Date | null])}
                            mb="md"
                        />

                        <Button
                            leftSection={<IconDownload size={14} />}
                            onClick={handleExportMaintenance}
                            loading={loadingMaintenance}
                            disabled={!dateRange[0] || !dateRange[1]}
                        >
                            Export CSV
                        </Button>
                    </Card>
                </Grid.Col>
            </Grid>
        </div>
    );
};

export default Reports;
