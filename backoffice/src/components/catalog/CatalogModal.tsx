import type { ComponentProps } from 'react';
import { Modal } from '@/components/ui/Modal';
import './catalog.css';

export function CatalogModal(props: ComponentProps<typeof Modal>) {
  return <Modal {...props} className={`catalog-modal ${props.className || ''}`} />;
}
