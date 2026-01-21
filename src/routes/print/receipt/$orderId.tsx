import { useTRPC } from '@/integrations/trpc/react'
import { handlePrintReceipt, formatCurrency } from '@/lib/utils'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { RoleGuard } from '@/components/RoleGuard'

export const Route = createFileRoute('/print/receipt/$orderId')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'server', 'counter']}>
      <PrintReceiptPage />
    </RoleGuard>
  ),
  beforeLoad: async ({ params }) => {
    const { orderId } = params
    if (!orderId) {
      throw new Error('Order ID is required to print receipt.')
    }
  },
})


function PrintReceiptPage() {
  const { orderId } = Route.useParams()
  const trpc = useTRPC()
  const printRef = useRef<HTMLDivElement>(null)

  // Fetch order data
  const { data: order, isLoading: orderLoading } = useQuery(
    trpc.orders.getById.queryOptions({ id: Number(orderId) })
  )
  // Fetch settings
  const { data: settingsData = [] } = useQuery(trpc.settings.list.queryOptions())

  // Helper to get setting value
  const getSetting = (key: string, fallback: string) => {
    const found = settingsData.find((s: any) => s.key === key)
    return typeof found?.value === 'string' ? found.value : fallback
  }

  // Print on mount
  useEffect(() => {
    if (order && printRef.current) {
      setTimeout(() => {
        window.print()
      }, 300)
    }
  }, [order])

  if (orderLoading) {
    return <div className="p-8 text-center text-gray-400">Loading receipt...</div>
  }
  if (!order) {
    return <div className="p-8 text-center text-red-500">Order not found.</div>
  }

  // Receipt settings
  const showLogo = getSetting('show_logo', 'true') === 'true'
  const header = getSetting('receipt_header', 'Thank you for dining with us!')
  const footer = getSetting('receipt_footer', 'Please visit us again!')
  const restaurantName = getSetting('restaurant_name', 'TanStack Restaurant')
  const address = getSetting('address', '')
  const phone = getSetting('phone', '')
  const currency = getSetting('currency', 'USD') || 'USD'
  const taxRate = parseFloat(getSetting('tax_rate', '10') || '10')
  const serviceCharge = parseFloat(getSetting('service_charge', '0') || '0')

  // Format currency
  const format = (amount: number) => {
    return formatCurrency(amount)
  }

  // Calculate totals
  const subtotal = order?.items?.reduce((sum: number, item: any) => sum + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0) || 0
  const discountAmount = parseFloat(order?.discountAmount || '0')
  // Tax and service charge are typically calculated *after* discount if it's a pre-tax discount,
  // but here we are using the stored amounts from the backend which handles the logic.
  const tax = parseFloat(order?.taxAmount) || ((subtotal - discountAmount) * (taxRate / 100))
  const service = parseFloat(order?.serviceChargeAmount) || ((subtotal - discountAmount) * (serviceCharge / 100))
  const total = parseFloat(order?.total) || (subtotal - discountAmount + tax + service)

  return (
    <div ref={printRef} className="max-w-sm mx-auto bg-white text-black p-4 rounded shadow print:shadow-none print:bg-white print:p-0">
      {showLogo && (
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" style={{ maxHeight: 48 }} />
        </div>
      )}
      <div className="text-center">
        <h2 className="font-bold text-lg">{restaurantName}</h2>
        {address && <div className="text-xs">{address}</div>}
        {phone && <div className="text-xs">{phone}</div>}
      </div>
      <div className="my-2 text-center text-xs text-gray-600">{header}</div>
      <hr className="my-2 border-gray-300" />
      <div className="flex justify-between text-xs mb-1">
        <span>Order #:</span>
        <span>{order.orderNumber}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span>Date:</span>
        <span>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span>Table:</span>
        <span>{order.tableNumber || '-'}</span>
      </div>
      <hr className="my-2 border-gray-300" />
      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">{formatCurrency(item.unitPrice ?? 0)}</td>
              <td className="text-right">{formatCurrency((item.unitPrice ?? 0) * (item.quantity ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2 border-gray-300" />
      <div className="flex justify-between text-xs">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Tax ({taxRate}%)</span>
        <span>{formatCurrency(tax)}</span>
      </div>
      {serviceCharge > 0 && (
        <div className="flex justify-between text-xs">
          <span>Service Charge ({serviceCharge}%)</span>
          <span>{formatCurrency(service)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs font-bold mt-2">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <hr className="my-2 border-gray-300" />
      <div className="text-center text-xs my-2">{footer}</div>
    </div>
  )
}
