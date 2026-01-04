import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('Frontend Smoke Test', () => {
    it('should render a component successfully', () => {
        const { getByText } = render(<div>Hello Vitest</div>);
        expect(getByText('Hello Vitest')).toBeInTheDocument();
    });
});
