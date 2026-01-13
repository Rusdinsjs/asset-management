import { AppShell, Burger, Group, Title, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconDashboard,
    IconBox,
    IconTool,
    IconUsers,
    IconLogout,
    IconChartBar,
    IconCategory2,
    IconUser,
    IconScan,
    IconCheckbox,
    IconExchange,
    IconTruck,
    IconHandGrab,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarRightCollapse,
} from '@tabler/icons-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { NotificationBell } from '../Header/NotificationBell';

export function MainLayout() {
    const [opened, { toggle }] = useDisclosure();
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: IconDashboard, path: '/' },
        { label: 'Assets', icon: IconBox, path: '/assets' },
        { label: 'Categories', icon: IconCategory2, path: '/categories' },
        { label: 'Work Orders', icon: IconTool, path: '/work-orders' },
        { label: 'Rentals', icon: IconTruck, path: '/rentals' },
        { label: 'Clients', icon: IconUsers, path: '/clients' },
        { label: 'Loans', icon: IconHandGrab, path: '/loans' },
        { label: 'Conversions', icon: IconExchange, path: '/conversions' },
        { label: 'Approvals', icon: IconCheckbox, path: '/approvals' },
        { label: 'Reports', icon: IconChartBar, path: '/reports' },
        { label: 'Users', icon: IconUsers, path: '/users' },
        { label: 'Audit', icon: IconScan, path: '/audit' },
        { label: 'Profile', icon: IconUser, path: '/profile' },
    ];

    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: desktopOpened ? 300 : 80,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Title order={3}>Asset Manager</Title>
                    <Group ml="auto">
                        <NotificationBell />
                        <Text size="sm">{user?.name}</Text>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                {navItems.map((item) => {
                    // Hide Users menu for non-admins (Level > 2)
                    if (item.path === '/users' && (user?.role_level ?? 5) > 2) {
                        return null;
                    }

                    return (
                        <NavLink
                            key={item.path}
                            label={desktopOpened ? item.label : null}
                            leftSection={<item.icon size="1.2rem" stroke={1.5} />}
                            active={location.pathname === item.path}
                            onClick={() => {
                                navigate(item.path);
                                if (window.innerWidth < 768) toggle();
                            }}
                            styles={{
                                root: {
                                    justifyContent: desktopOpened ? 'flex-start' : 'center',
                                    borderRadius: 8,
                                    marginBottom: 4,
                                },
                                section: {
                                    marginRight: desktopOpened ? 12 : 0,
                                }
                            }}
                        />
                    );
                })}

                <NavLink
                    label={desktopOpened ? "Collapse" : null}
                    leftSection={desktopOpened ? <IconLayoutSidebarLeftCollapse size="1.2rem" /> : <IconLayoutSidebarRightCollapse size="1.2rem" />}
                    onClick={toggleDesktop}
                    mt="auto"
                    variant="subtle"
                    styles={{
                        root: { justifyContent: desktopOpened ? 'flex-start' : 'center' },
                        section: { marginRight: desktopOpened ? 12 : 0 }
                    }}
                />

                <NavLink
                    label={desktopOpened ? "Logout" : null}
                    leftSection={<IconLogout size="1.2rem" stroke={1.5} />}
                    color="red"
                    variant="subtle"
                    onClick={handleLogout}
                    styles={{
                        root: { justifyContent: desktopOpened ? 'flex-start' : 'center' },
                        section: { marginRight: desktopOpened ? 12 : 0 }
                    }}
                />
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
