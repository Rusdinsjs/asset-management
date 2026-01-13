import { Tabs, Title, Stack } from '@mantine/core';
import { IconTruck, IconClock, IconReceipt, IconUsers, IconCheckbox, IconTags } from '@tabler/icons-react';
import { RentalList } from '../../components/Rentals/RentalList';
import { TimesheetList } from '../../components/Rentals/TimesheetList';
import { TimesheetReviewer } from '../../components/Rentals/TimesheetReviewer';
import { PriceList } from '../../components/Rentals/PriceList';
import { BillingList } from '../../components/Rentals/BillingList';
import { ClientList } from '../../components/Rentals/ClientList';

export function Rentals() {
    return (
        <Stack h="100%">
            <Title order={2} mb="md">Rental Management</Title>

            <Tabs defaultValue="active" variant="outline" radius="md">
                <Tabs.List>
                    <Tabs.Tab value="active" leftSection={<IconTruck size={16} />}>Active Rentals</Tabs.Tab>
                    <Tabs.Tab value="timesheets" leftSection={<IconClock size={16} />}>Timesheets</Tabs.Tab>
                    <Tabs.Tab value="reviewer" leftSection={<IconCheckbox size={16} />} color="orange">Reviewer</Tabs.Tab>
                    <Tabs.Tab value="pricelist" leftSection={<IconTags size={16} />}>Price List</Tabs.Tab>
                    <Tabs.Tab value="billing" leftSection={<IconReceipt size={16} />}>Billing</Tabs.Tab>
                    <Tabs.Tab value="clients" leftSection={<IconUsers size={16} />}>Clients</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="active" pt="xs">
                    <RentalList />
                </Tabs.Panel>

                <Tabs.Panel value="timesheets" pt="xs">
                    <TimesheetList />
                </Tabs.Panel>

                <Tabs.Panel value="reviewer" pt="xs">
                    <TimesheetReviewer />
                </Tabs.Panel>

                <Tabs.Panel value="pricelist" pt="xs">
                    <PriceList />
                </Tabs.Panel>

                <Tabs.Panel value="billing" pt="xs">
                    <BillingList />
                </Tabs.Panel>

                <Tabs.Panel value="clients" pt="xs">
                    <ClientList />
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
