import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Subscribes to real-time entity changes and invalidates React Query cache globally
export default function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = (key) => () => queryClient.invalidateQueries({ queryKey: [key] });

    const unsubs = [
      base44.entities.RepairOrder.subscribe(invalidate('repairs')),
      base44.entities.SaleOrder.subscribe(invalidate('sales')),
      base44.entities.Product.subscribe(invalidate('products')),
      base44.entities.Customer.subscribe(invalidate('customers')),
      base44.entities.Machine.subscribe(invalidate('machines')),
      base44.entities.Quote.subscribe(invalidate('quotes')),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [queryClient]);
}