/**
 * Confirmation Dialog Hook
 * Easy-to-use hook for confirmation dialogs
 */

import { type FC, useState, useCallback } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from '../components/ConfirmDialog.tsx';

interface UseConfirmReturn {
  confirm: (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => Promise<boolean>;
  ConfirmDialogComponent: FC;
}

export const useConfirm = (): UseConfirmReturn => {
  const [state, setState] = useState<{
    isOpen: boolean;
    resolve: ((value: boolean) => void) | null;
    props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>;
  }>({
    isOpen: false,
    resolve: null,
    props: {
      onConfirm: () => {},
      title: '',
      message: '',
    },
  });

  const confirm = useCallback(
    (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({ isOpen: true, resolve, props });
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false }));
  }, [state.resolve]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false }));
  }, [state.resolve]);

  const ConfirmDialogComponent: FC = () => (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...state.props}
    />
  );

  return { confirm, ConfirmDialogComponent };
};
