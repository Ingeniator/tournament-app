// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

afterEach(cleanup);

describe('CollapsibleSection', () => {
  it('renders children when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Settings" defaultOpen={true}>
        <p>Content here</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Content here')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('hides children when defaultOpen is false', () => {
    render(
      <CollapsibleSection title="Settings" defaultOpen={false}>
        <p>Content here</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('Content here')).toBeNull();
  });

  it('toggles visibility when header is clicked', () => {
    render(
      <CollapsibleSection title="Settings" defaultOpen={false}>
        <p>Content here</p>
      </CollapsibleSection>,
    );

    expect(screen.queryByText('Content here')).toBeNull();

    // Click to open
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Content here')).toBeDefined();

    // Click to close
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.queryByText('Content here')).toBeNull();
  });

  it('shows summary when collapsed and summary is provided', () => {
    render(
      <CollapsibleSection title="Settings" summary="3 items" defaultOpen={false}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('3 items')).toBeDefined();
  });

  it('hides summary when expanded', () => {
    render(
      <CollapsibleSection title="Settings" summary="3 items" defaultOpen={true}>
        <p>Content</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('3 items')).toBeNull();
  });
});
