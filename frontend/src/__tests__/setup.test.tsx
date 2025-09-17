import { render, screen } from '@testing-library/react';
import Home from '../app/page';

// Basic setup test to verify Jest is working
describe('Setup verification', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByText(/Get started by editing/)).toBeTruthy();
  });
});