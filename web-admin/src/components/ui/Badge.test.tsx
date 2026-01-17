import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge, StatusBadge } from './Badge';

describe('Badge Component', () => {
    it('renders children correctly', () => {
        render(<Badge>Test Badge</Badge>);
        expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('applies standard variant classes', () => {
        const { container } = render(<Badge variant="success">Success</Badge>);
        const span = container.querySelector('span');
        expect(span?.className).toContain('bg-emerald-500/20');
    });
});

describe('StatusBadge Component', () => {
    it('formats status text correctly', () => {
        render(<StatusBadge status="in_progress" />);
        expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('assigns correct variant for status', () => {
        const { container } = render(<StatusBadge status="completed" />);
        const span = container.querySelector('span');
        expect(span?.className).toContain('bg-emerald-500/20'); // success variant
    });

    it('uses default variant for unknown status', () => {
        const { container } = render(<StatusBadge status="unknown_status" />);
        const span = container.querySelector('span');
        expect(span?.className).toContain('bg-slate-700'); // default variant
    });
});
