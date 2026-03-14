import { toast, type ToastOptions } from 'react-toastify'

const baseOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
}

export const notify = {
  success: (message: string, options?: ToastOptions) => toast.success(message, { ...baseOptions, ...options }),
  error: (message: string, options?: ToastOptions) => toast.error(message, { ...baseOptions, ...options }),
  info: (message: string, options?: ToastOptions) => toast.info(message, { ...baseOptions, ...options }),
  warning: (message: string, options?: ToastOptions) => toast.warning(message, { ...baseOptions, ...options }),
}

export const extractApiError = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    return response?.data?.error || fallback
  }

  return fallback
}
