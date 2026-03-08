/**
 * Loading Component Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  Spinner,
  SpinnerOverlay,
  SpinnerButton,
} from './index';

const meta: Meta = {
  title: 'Components/Loading',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

// ============ Skeleton Stories ============

export const SkeletonTextStory: StoryObj<{ count: number; animation: 'pulse' | 'wave' | 'none' }> = {
  name: 'Skeleton - Text',
  args: {
    count: 3,
    animation: 'pulse',
  },
  render: (args) => <SkeletonText count={args.count} animation={args.animation} />,
};

export const SkeletonAvatarStory: StoryObj<{ size: number; animation: 'pulse' | 'wave' | 'none' }> = {
  name: 'Skeleton - Avatar',
  args: {
    size: 60,
    animation: 'pulse',
  },
  render: (args) => <SkeletonAvatar width={args.size} height={args.size} animation={args.animation} />,
};

export const SkeletonCardStory: StoryObj = {
  name: 'Skeleton - Card',
  render: () => <SkeletonCard />,
};

export const SkeletonListStory: StoryObj<{ count: number }> = {
  name: 'Skeleton - List',
  args: {
    count: 5,
  },
  render: (args) => <SkeletonList count={args.count} />,
};

export const SkeletonTableStory: StoryObj<{ rows: number; columns: number }> = {
  name: 'Skeleton - Table',
  args: {
    rows: 5,
    columns: 4,
  },
  render: (args) => <SkeletonTable rows={args.rows} columns={args.columns} />,
};

export const SkeletonVariants: StoryObj = {
  name: 'Skeleton - All Variants',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px' }}>
      <div>
        <h3>Text Variants</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonText width="60%" />
          <SkeletonText width="100%" />
          <SkeletonText width="80%" />
          <SkeletonText width="40%" />
        </div>
      </div>

      <div>
        <h3>Circular Variant</h3>
        <Skeleton variant="circular" width={80} height={80} />
      </div>

      <div>
        <h3>Rectangular Variant</h3>
        <Skeleton variant="rectangular" width={200} height={120} />
      </div>

      <div>
        <h3>Rounded Variant</h3>
        <Skeleton variant="rounded" width={200} height={60} />
      </div>

      <div>
        <h3>Animations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <span>Pulse:</span>
            <Skeleton width={200} animation="pulse" />
          </div>
          <div>
            <span>Wave:</span>
            <Skeleton width={200} animation="wave" />
          </div>
          <div>
            <span>None:</span>
            <Skeleton width={200} animation="none" />
          </div>
        </div>
      </div>
    </div>
  ),
};

// ============ Spinner Stories ============

export const SpinnerDefault: StoryObj<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error'; speed: 'slow' | 'normal' | 'fast' }> = {
  name: 'Spinner - Default',
  args: {
    size: 'md',
    color: 'primary',
    speed: 'normal',
  },
  render: (args) => <Spinner size={args.size} color={args.color} speed={args.speed} />,
};

export const SpinnerDots: StoryObj<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' }> = {
  name: 'Spinner - Dots',
  args: {
    size: 'md',
    color: 'primary',
  },
  render: (args) => <Spinner variant="dots" size={args.size} color={args.color} />,
};

export const SpinnerBars: StoryObj<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' }> = {
  name: 'Spinner - Bars',
  args: {
    size: 'md',
    color: 'primary',
  },
  render: (args) => <Spinner variant="bars" size={args.size} color={args.color} />,
};

export const SpinnerRipple: StoryObj<{ size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' }> = {
  name: 'Spinner - Ripple',
  args: {
    size: 'md',
    color: 'primary',
  },
  render: (args) => <Spinner variant="ripple" size={args.size} color={args.color} />,
};

export const SpinnerSizes: StoryObj = {
  name: 'Spinner - All Sizes',
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
};

export const SpinnerColors: StoryObj = {
  name: 'Spinner - All Colors',
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Spinner color="primary" />
      <Spinner color="secondary" />
      <Spinner color="success" />
      <Spinner color="warning" />
      <Spinner color="error" />
    </div>
  ),
};

export const SpinnerAllVariants: StoryObj = {
  name: 'Spinner - All Variants',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
      <div>
        <h3>Default</h3>
        <Spinner size="lg" />
      </div>
      <div>
        <h3>Dots</h3>
        <Spinner variant="dots" size="lg" />
      </div>
      <div>
        <h3>Bars</h3>
        <Spinner variant="bars" size="lg" />
      </div>
      <div>
        <h3>Ripple</h3>
        <Spinner variant="ripple" size="lg" />
      </div>
    </div>
  ),
};

export const SpinnerButtonStory: StoryObj = {
  name: 'Spinner - Button',
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <SpinnerButton label="Loading..." />
      <SpinnerButton label="Saving..." color="success" />
      <SpinnerButton label="Deleting..." color="error" />
    </div>
  ),
};

export const SpinnerOverlayStory: StoryObj<{ visible: boolean; message: string }> = {
  name: 'Spinner - Overlay',
  args: {
    visible: true,
    message: 'Loading, please wait...',
  },
  render: (args) => (
    <div>
      <div style={{ padding: '2rem', border: '1px dashed #ccc', minHeight: '200px' }}>
        <p>Content behind overlay</p>
      </div>
      <SpinnerOverlay visible={args.visible} message={args.message} />
    </div>
  ),
};

// ============ Combined Examples ============

export const LoadingExamples: StoryObj = {
  name: 'Loading - Real-world Examples',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
      {/* Loading Card with Spinner */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Loading User Profile</h3>
          <Spinner size="sm" />
        </div>
        <SkeletonList count={3} />
      </div>

      {/* Form Loading State */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h3>Loading Form</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <SkeletonText width="30%" />
            <Skeleton variant="rectangular" height={40} style={{ marginTop: '0.5rem' }} />
          </div>
          <div>
            <SkeletonText width="25%" />
            <Skeleton variant="rectangular" height={40} style={{ marginTop: '0.5rem' }} />
          </div>
          <div>
            <SkeletonText width="20%" />
            <Skeleton variant="rectangular" height={100} style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
      </div>

      {/* Table Loading State */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Loading Data Table</h3>
          <Spinner variant="dots" size="sm" />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>

      {/* Dashboard Loading */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
          <h4>Stats Card</h4>
          <div style={{ marginTop: '1rem' }}>
            <SkeletonText width="50%" height={32} />
            <SkeletonText width="30%" style={{ marginTop: '0.5rem' }} />
          </div>
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
          <h4>Activity Feed</h4>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonText width="80%" />
            <SkeletonText width="70%" />
            <SkeletonText width="90%" />
          </div>
        </div>
      </div>
    </div>
  ),
};
