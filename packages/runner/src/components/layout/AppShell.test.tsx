// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  afterEach(cleanup);

  it('renders the title', () => {
    render(<AppShell title="My Title">content</AppShell>);
    expect(screen.getByText('My Title')).toBeTruthy();
  });

  it('renders children', () => {
    render(<AppShell title="T">Hello World</AppShell>);
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders headerRight when provided', () => {
    render(
      <AppShell title="T" headerRight={<button>Action</button>}>
        body
      </AppShell>,
    );
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('does not render headerRight when not provided', () => {
    const { container } = render(<AppShell title="T">body</AppShell>);
    expect(container.querySelector('button')).toBeNull();
  });
});
