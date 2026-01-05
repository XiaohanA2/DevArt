/**
 * Simple Toast Notification Utility
 *
 * Provides a lightweight toast notification system without external dependencies
 */

export interface ToastOptions {
  message: string
  duration?: number // Auto-dismiss after ms (default: 3000)
  type?: 'success' | 'error' | 'info'
}

let toastContainer: HTMLDivElement | null = null

/**
 * Initialize toast container if it doesn't exist
 */
function ensureContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'devart-toast-container'
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

/**
 * Show a toast notification
 *
 * @param options - Toast options
 * @returns Function to dismiss the toast
 */
export function showToast(options: ToastOptions): () => void {
  const { message, duration = 3000, type = 'info' } = options

  const container = ensureContainer()

  // Create toast element
  const toast = document.createElement('div')
  const bgColor = type === 'success' ? 'bg-emerald-500/90' : type === 'error' ? 'bg-red-500/90' : 'bg-violet-500/90'

  toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto transform transition-all duration-300 translate-x-full opacity-0`
  toast.style.minWidth = '200px'
  toast.style.maxWidth = '400px'

  // Icon
  let icon = ''
  if (type === 'success') {
    icon = `<svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
  } else if (type === 'error') {
    icon = `<svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`
  } else {
    icon = `<svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
  }

  toast.innerHTML = `
    <div class="flex items-start">
      ${icon}
      <span class="text-sm font-medium">${message}</span>
    </div>
  `

  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0')
  })

  // Dismiss function
  let timeoutId: NodeJS.Timeout | null = null
  const dismiss = () => {
    toast.classList.add('translate-x-full', 'opacity-0')
    setTimeout(() => {
      toast.remove()
      // Remove container if empty
      if (container.children.length === 0) {
        container.remove()
        toastContainer = null
      }
    }, 300)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  // Auto-dismiss after duration
  if (duration > 0) {
    timeoutId = setTimeout(dismiss, duration)
  }

  // Click to dismiss
  toast.addEventListener('click', dismiss)

  return dismiss
}

/**
 * Show a success toast
 */
export function showSuccessToast(message: string, duration?: number): () => void {
  return showToast({ message, duration, type: 'success' })
}

/**
 * Show an error toast
 */
export function showErrorToast(message: string, duration?: number): () => void {
  return showToast({ message, duration, type: 'error' })
}

/**
 * Show an info toast
 */
export function showInfoToast(message: string, duration?: number): () => void {
  return showToast({ message, duration, type: 'info' })
}
